/* ------------------------------------------------------------------
   Spojeni s Home Assistantem pres WebSocket.

   Proc WebSocket a ne REST: stranka bezi z file:// adresy uvnitr
   aplikace, takze kazdy REST dotaz by narazil na kontrolu puvodu (CORS).
   WebSocket zadnou takovou kontrolu nema a navic chodi zmeny stavu samy
   od sebe - panel tak neptá server kazdou vterinu, ale dozvi se o zmene
   ve chvili, kdy nastane.

   Prihlaseni: dlouhodoby pristupovy token z profilu uzivatele.
   ------------------------------------------------------------------ */
'use strict';

function HaConn(opts) {
  this.baseUrl = String(opts.baseUrl || '').replace(/\/+$/, '');
  this.token = String(opts.token || '');
  this.onStatus = opts.onStatus || function () {};
  this.onStates = opts.onStates || function () {};
  this.onChange = opts.onChange || function () {};

  this.states = {};
  this.ws = null;
  this.seq = 1;
  this.pending = {};
  this.status = 'idle';
  this.tries = 0;
  this.timer = null;
  this.pingTimer = null;
  this.pongDue = 0;
  this.closed = false;
}

/** ws:// pro http, wss:// pro https - jinak to prohlizec odmitne. */
HaConn.prototype.wsUrl = function () {
  var u = this.baseUrl;
  if (u.indexOf('https://') === 0) return 'wss://' + u.slice(8) + '/api/websocket';
  if (u.indexOf('http://') === 0) return 'ws://' + u.slice(7) + '/api/websocket';
  return 'ws://' + u + '/api/websocket';
};

HaConn.prototype.setStatus = function (s, detail) {
  if (this.status === s && !detail) return;
  this.status = s;
  try { this.onStatus(s, detail || ''); } catch (e) {}
};

HaConn.prototype.connect = function () {
  if (this.closed) return;
  if (!this.baseUrl || !this.token) { this.setStatus('unconfigured'); return; }
  this.cleanup();
  this.setStatus(this.tries ? 'reconnecting' : 'connecting');

  var self = this;
  var ws;
  try {
    ws = new WebSocket(this.wsUrl());
  } catch (e) {
    this.retry('adresa nejde otevřít');
    return;
  }
  this.ws = ws;

  ws.onopen = function () { self.tries = 0; };
  ws.onmessage = function (ev) { self.onMessage(ev); };
  ws.onerror = function () { /* zpracuje onclose */ };
  ws.onclose = function (ev) {
    if (self.ws !== ws) return;
    self.retry(ev && ev.code === 1006 ? 'spojení spadlo' : 'spojení uzavřeno');
  };
};

HaConn.prototype.close = function () {
  this.closed = true;
  this.cleanup();
  this.setStatus('closed');
};

HaConn.prototype.cleanup = function () {
  if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  if (this.ws) {
    var w = this.ws;
    this.ws = null;
    try { w.onclose = null; w.onmessage = null; w.onerror = null; w.close(); } catch (e) {}
  }
  this.pending = {};
};

/** Po vypadku se zkousi znovu - zpocatku rychle, pak uz v klidu. */
HaConn.prototype.retry = function (why) {
  if (this.closed) return;
  this.cleanup();
  this.tries++;
  this.setStatus('down', why);
  var delay = Math.min(30000, 1000 * Math.pow(1.6, Math.min(this.tries, 8)));
  var self = this;
  this.timer = setTimeout(function () { self.connect(); }, delay);
};

HaConn.prototype.send = function (msg) {
  if (!this.ws || this.ws.readyState !== 1) return -1;
  var id = this.seq++;
  msg.id = id;
  try { this.ws.send(JSON.stringify(msg)); } catch (e) { return -1; }
  return id;
};

/** Zavola sluzbu (rozsviti svetlo, prepne zasuvku...). */
HaConn.prototype.callService = function (domain, service, data) {
  if (this.status !== 'ready') return false;
  return this.send({
    type: 'call_service',
    domain: domain,
    service: service,
    service_data: data || {},
    target: (data && data.entity_id) ? { entity_id: data.entity_id } : undefined
  }) > 0;
};

HaConn.prototype.onMessage = function (ev) {
  var msg;
  try { msg = JSON.parse(ev.data); } catch (e) { return; }
  var self = this;

  if (msg.type === 'auth_required') {
    try { this.ws.send(JSON.stringify({ type: 'auth', access_token: this.token })); } catch (e) {}
    return;
  }
  if (msg.type === 'auth_invalid') {
    // Spatny token se opakovanim nespravi - ma to rict uzivateli.
    this.setStatus('badtoken', msg.message || 'token neplatí');
    this.cleanup();
    return;
  }
  if (msg.type === 'auth_ok') {
    this.setStatus('loading');
    this.subId = this.send({ type: 'subscribe_events', event_type: 'state_changed' });
    this.statesId = this.send({ type: 'get_states' });
    this.startPing();
    return;
  }
  if (msg.type === 'result') {
    if (msg.id === this.statesId) {
      if (msg.success && Array.isArray(msg.result)) {
        this.states = {};
        for (var i = 0; i < msg.result.length; i++) {
          this.states[msg.result[i].entity_id] = msg.result[i];
        }
        this.setStatus('ready');
        try { this.onStates(this.states); } catch (e) {}
      } else {
        this.retry('server odmítl seznam stavů');
      }
    }
    return;
  }
  if (msg.type === 'event' && msg.event && msg.event.event_type === 'state_changed') {
    var d = msg.event.data || {};
    if (!d.entity_id) return;
    if (d.new_state) this.states[d.entity_id] = d.new_state;
    else delete this.states[d.entity_id];
    try { this.onChange(d.entity_id, d.new_state, this.states); } catch (e) {}
    return;
  }
  if (msg.type === 'pong') {
    this.pongDue = 0;
    return;
  }
};

/**
 * Wi-Fi umi spojeni "zamrznout" tak, ze onclose nikdy neprijde a panel by
 * tise ukazoval stare hodnoty. Proto se kazdych 30 s posle ping a kdyz do
 * 10 s neprijde odpoved, spojeni se povazuje za mrtve.
 */
HaConn.prototype.startPing = function () {
  var self = this;
  if (this.pingTimer) clearInterval(this.pingTimer);
  this.pongDue = 0;
  this.pingTimer = setInterval(function () {
    if (!self.ws || self.ws.readyState !== 1) return;
    if (self.pongDue && Date.now() > self.pongDue) { self.retry('server neodpovídá'); return; }
    self.pongDue = Date.now() + 10000;
    self.send({ type: 'ping' });
  }, 30000);
};

if (typeof module !== 'undefined' && module.exports) module.exports = HaConn;

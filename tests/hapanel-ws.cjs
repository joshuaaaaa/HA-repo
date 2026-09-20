/* Spojeni s Home Assistantem. Testuje se proti nahradnimu WebSocketu:
   jde o to, ze panel zvladne prihlaseni, vypadek site i zamrzle spojeni,
   protoze presne to se na tabletu na zdi deje kazdy den. */
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.join(__dirname, '../android/app/src/main/assets/js');

/* nahradni WebSocket: nic neposila po siti, jen si pamatuje zpravy */
const sockets = [];
global.WebSocket = class {
  constructor(url) {
    this.url = url; this.readyState = 1; this.sent = [];
    sockets.push(this);
  }
  send(s) { this.sent.push(JSON.parse(s)); }
  close() { this.readyState = 3; }
  recv(obj) { if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) }); }
  drop(code) { if (this.onclose) this.onclose({ code: code || 1006 }); }
  last(type) { return this.sent.filter(m => m.type === type).pop(); }
};

const HaConn = require(path.join(base, 'ha.js'));

/* --- adresa --- */
assert.equal(new HaConn({ baseUrl: 'http://ha.local:8123/' }).wsUrl(), 'ws://ha.local:8123/api/websocket');
assert.equal(new HaConn({ baseUrl: 'https://dum.example.com' }).wsUrl(), 'wss://dum.example.com/api/websocket',
  'https musi prejit na wss, jinak to prohlizec odmitne');

/* --- prihlaseni a prvni nacteni --- */
const seen = { status: [], states: null, changes: [] };
const c = new HaConn({
  baseUrl: 'http://ha.local:8123', token: 'TOKEN',
  onStatus: s => seen.status.push(s),
  onStates: s => { seen.states = s; },
  onChange: (id, st) => seen.changes.push([id, st && st.state])
});
c.connect();
const ws = sockets[sockets.length - 1];
ws.recv({ type: 'auth_required' });
assert.equal(ws.last('auth').access_token, 'TOKEN', 'token se posila hned po vyzve');

ws.recv({ type: 'auth_ok' });
assert.ok(ws.last('subscribe_events'), 'panel se prihlasi k odberu zmen');
const statesId = ws.last('get_states').id;

ws.recv({ id: statesId, type: 'result', success: true, result: [
  { entity_id: 'sensor.t', state: '21.5', attributes: {} },
  { entity_id: 'light.l', state: 'off', attributes: {} }
] });
assert.equal(c.status, 'ready');
assert.equal(Object.keys(seen.states).length, 2);

/* --- zmena stavu --- */
ws.recv({ type: 'event', event: { event_type: 'state_changed', data: {
  entity_id: 'light.l', new_state: { entity_id: 'light.l', state: 'on', attributes: {} } } } });
assert.equal(c.states['light.l'].state, 'on');
assert.deepEqual(seen.changes.pop(), ['light.l', 'on']);

/* --- smazana entita --- */
ws.recv({ type: 'event', event: { event_type: 'state_changed', data: {
  entity_id: 'light.l', new_state: null } } });
assert.ok(!c.states['light.l'], 'smazana entita zmizi i z panelu');

/* --- volani sluzby --- */
assert.ok(c.callService('light', 'toggle', { entity_id: 'light.l' }));
const call = ws.last('call_service');
assert.equal(call.domain, 'light');
assert.deepEqual(call.target, { entity_id: 'light.l' });

/* --- spadle spojeni se zkousi znovu --- */
const before = sockets.length;
ws.drop(1006);
assert.equal(c.status, 'down', 'vypadek se pozna');
assert.ok(c.tries >= 1);
assert.ok(sockets.length === before, 'dalsi pokus az po case, ne hned v cyklu');
c.close();

/* --- spatny token se neopakuje donekonecna --- */
const bad = new HaConn({ baseUrl: 'http://ha.local:8123', token: 'x', onStatus: () => {} });
bad.connect();
const ws2 = sockets[sockets.length - 1];
ws2.recv({ type: 'auth_required' });
ws2.recv({ type: 'auth_invalid', message: 'wrong' });
assert.equal(bad.status, 'badtoken');
assert.equal(bad.timer, null, 'pri spatnem tokenu nema smysl zkouset znovu');

/* --- bez adresy nebo tokenu --- */
const prazdny = new HaConn({ baseUrl: '', token: '', onStatus: () => {} });
prazdny.connect();
assert.equal(prazdny.status, 'unconfigured');

console.log('ok  hapanel-ws');

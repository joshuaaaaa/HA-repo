/* ------------------------------------------------------------------
   Historie hodnot pro krivky.

   Home Assistant umi poslat prubeh entity za posledni hodiny jednim
   dotazem (history/history_during_period). Panel si ho vyzada jen pro
   entity, ktere maji nastaveny graf, a pak uz krivku doplnuje ze
   stejnych zmen stavu, ktere stejne chodi kvuli cislum - server se tedy
   nepta porad dokola.

   Store dostava funkci send(zprava) -> Promise, takze je jedno, jestli
   bezi v aplikaci (WebSocket) nebo v karte pro Lovelace (hass.callWS).
   ------------------------------------------------------------------ */
'use strict';

var History = (function () {

  var REFRESH_MS = 5 * 60 * 1000;   // cely prubeh znovu jednou za pet minut
  var RETRY_MS = 15 * 1000;         // po neuspechu (jeste nebylo spojeni) brzy znovu
  var MAX_POINTS = 300;             // vic bodu displej stejne nerozliseni

  function Store(send) {
    this.send = send;
    this.series = {};      // entity -> [{t, v}]
    this.want = [];        // [{entity, hours}]
    this.onData = null;    // (entity, body) -> void
    this.timer = null;
    this.retry = null;
    this.busy = false;
    this.again = false;
  }

  /** Ktere entity a jak dlouhou historii panel potrebuje. */
  Store.prototype.set = function (want) {
    this.want = (want || []).slice(0, 12);
    var keep = {};
    this.want.forEach(function (w) { keep[w.entity] = true; });
    for (var e in this.series) if (!keep[e]) delete this.series[e];
    if (this.want.length) this.refresh();
  };

  Store.prototype.start = function () {
    var self = this;
    this.stop();
    this.timer = setInterval(function () { self.refresh(); }, REFRESH_MS);
    this.refresh();
  };

  Store.prototype.stop = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.retry) { clearTimeout(this.retry); this.retry = null; }
  };

  Store.prototype.get = function (entity) {
    return this.series[entity] || null;
  };

  /**
   * Ziva zmena stavu. Bod se pripoji na konec, takze krivka roste hned,
   * ne az pri dalsim dotazu na server.
   */
  Store.prototype.push = function (entity, state, whenMs) {
    var s = this.series[entity];
    if (!s) return false;
    var v = U.num(state);
    if (isNaN(v)) return false;
    var t = whenMs || Date.now();
    var last = s[s.length - 1];
    if (last && t - last.t < 1000) { last.v = v; }
    else s.push({ t: t, v: v });
    this.trim(entity);
    return true;
  };

  /** Zahodi, co uz vypadlo z okna, a zridi pocet bodu. */
  Store.prototype.trim = function (entity) {
    var w = null;
    for (var i = 0; i < this.want.length; i++) {
      if (this.want[i].entity === entity) { w = this.want[i]; break; }
    }
    var hours = w ? w.hours : 6;
    var from = Date.now() - hours * 3600 * 1000;
    var s = this.series[entity].filter(function (p) { return p.t >= from; });
    if (s.length > MAX_POINTS * 2) {
      var step = Math.ceil(s.length / MAX_POINTS);
      var out = [];
      for (var j = 0; j < s.length; j += step) out.push(s[j]);
      if (out[out.length - 1] !== s[s.length - 1]) out.push(s[s.length - 1]);
      s = out;
    }
    this.series[entity] = s;
  };

  Store.prototype.refresh = function () {
    if (!this.send || !this.want.length) return;
    // Dotaz uz bezi: zapamatovat si, ze mezitim prisel dalsi duvod se
    // zeptat (treba zmena rozvrzeni), a zeptat se hned po dobehnuti.
    if (this.busy) { this.again = true; return; }
    var self = this;
    this.busy = true;

    // Jeden dotaz na vsechno: entity se lisi jen delkou okna, takze se
    // vezme to nejdelsi a kratsi krivky se pak jen orezou.
    var hours = this.want.reduce(function (m, w) { return Math.max(m, w.hours); }, 1);
    var ids = this.want.map(function (w) { return w.entity; });
    var start = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    function take(result) {
      if (!result) return;
      ids.forEach(function (id) {
        var raw = result[id];
        if (!raw || !raw.length) return;
        self.series[id] = parse(raw);
        self.trim(id);
        if (self.onData) { try { self.onData(id, self.series[id]); } catch (e) {} }
      });
    }

    // Dokud neni spojeni, dotaz skonci chybou - pak se zkusi za chvili
    // znovu, ne az za pet minut s prazdnymi krivkami na obrazovce.
    function settle(ok) {
      self.busy = false;
      if (self.again) {
        self.again = false;
        setTimeout(function () { self.refresh(); }, 0);
        return;
      }
      if (!ok) self.retryLater();
    }

    try {
      var p = this.send({
        type: 'history/history_during_period',
        start_time: start,
        end_time: new Date().toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false
      });
      if (p && p.then) {
        p.then(function (r) { take(r); settle(true); }, function () { settle(false); });
      } else {
        settle(false);
      }
    } catch (e) {
      settle(false);
    }
  };

  Store.prototype.retryLater = function () {
    if (this.retry || !this.want.length) return;
    var self = this;
    this.retry = setTimeout(function () {
      self.retry = null;
      self.refresh();
    }, RETRY_MS);
  };

  /**
   * Home Assistant posila zhustenou podobu: s = stav, lu = cas v
   * sekundach. Starsi verze posilaji plne nazvy - umime obojí.
   */
  function parse(raw) {
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i];
      var state = r.s !== undefined ? r.s : r.state;
      var when = r.lu !== undefined ? r.lu : (r.last_updated || r.last_changed);
      var v = U.num(state);
      if (isNaN(v)) continue;
      var t = typeof when === 'number' ? when * 1000 : Date.parse(when);
      if (isNaN(t)) continue;
      out.push({ t: t, v: v });
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  return { Store: Store, parse: parse, MAX_POINTS: MAX_POINTS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = History;

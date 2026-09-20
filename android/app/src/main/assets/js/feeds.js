/* ------------------------------------------------------------------
   Data, ktera nejsou "stav entity": predpoved pocasi, ukoly na seznamu
   a udalosti v kalendari.

   Home Assistant je podava tremi ruznymi zpusoby a tady jsou schovane
   za jedno rozhrani:

     predpoved  weather/subscribe_forecast   - trvaly odber, chodi sama
     ukoly      todo/item/subscribe          - trvaly odber, chodi samy
     kalendar   calendar.get_events          - sluzba s odpovedi, ta se
                                               musi vyzadat (kazdych 10 min)

   Store dostava sadu funkci (send, subscribe), takze je jedno, jestli
   bezi v aplikaci (WebSocket) nebo v karte pro Lovelace (hass).
   ------------------------------------------------------------------ */
'use strict';

var Feeds = (function () {

  var CALENDAR_MS = 10 * 60 * 1000;   // kalendar se za deset minut nezmeni
  var RETRY_MS = 20 * 1000;

  function Store(api) {
    this.api = api || {};       // { subscribe(msg, cb) -> id, unsubscribe(id), events(entity, days) -> Promise }
    this.want = [];             // [{kind, entity, count, days}]
    this.data = {};             // "kind|entity" -> data
    this.subs = [];             // cisla odberu
    this.onData = null;
    this.timer = null;
  }

  function key(kind, entity) { return kind + '|' + entity; }

  Store.prototype.get = function (kind, entity) {
    return this.data[key(kind, entity)] || null;
  };

  Store.prototype.set = function (want) {
    this.want = (want || []).slice(0, 8);
    this.restart();
  };

  /** Po spojeni (a po kazdem vypadku) se odbery zridi znovu. */
  Store.prototype.restart = function () {
    this.stopSubs();
    var self = this;
    this.want.forEach(function (w) {
      if (w.kind === 'forecast') self.subForecast(w);
      else if (w.kind === 'todo') self.subTodo(w);
    });
    this.pollCalendars();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(function () { self.pollCalendars(); }, CALENDAR_MS);
  };

  Store.prototype.stop = function () {
    this.stopSubs();
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  };

  Store.prototype.stopSubs = function () {
    var self = this;
    this.subs.forEach(function (id) {
      try { if (self.api.unsubscribe) self.api.unsubscribe(id); } catch (e) {}
    });
    this.subs = [];
  };

  Store.prototype.push = function (kind, entity, value) {
    this.data[key(kind, entity)] = value;
    if (this.onData) {
      try { this.onData(kind, entity, value); } catch (e) {}
    }
  };

  /* ---------- predpoved pocasi ---------- */

  Store.prototype.subForecast = function (w) {
    if (!this.api.subscribe) return;
    var self = this;
    var id = this.api.subscribe({
      type: 'weather/subscribe_forecast',
      entity_id: w.entity,
      forecast_type: 'daily'
    }, function (ev) {
      if (!ev || !ev.forecast) return;
      self.push('forecast', w.entity, ev.forecast.slice(0, 10));
    });
    if (id > 0) this.subs.push(id);
  };

  /* ---------- ukoly ---------- */

  Store.prototype.subTodo = function (w) {
    if (!this.api.subscribe) return;
    var self = this;
    var id = this.api.subscribe({
      type: 'todo/item/subscribe',
      entity_id: w.entity
    }, function (ev) {
      if (!ev || !ev.items) return;
      self.push('todo', w.entity, ev.items);
    });
    if (id > 0) this.subs.push(id);
  };

  /* ---------- kalendar ---------- */

  Store.prototype.pollCalendars = function () {
    var self = this;
    this.want.forEach(function (w) {
      if (w.kind !== 'calendar' || !self.api.events) return;
      var days = Math.max(1, Math.min(14, w.days || 7));
      var p = self.api.events(w.entity, days);
      if (!p || !p.then) return;
      p.then(function (res) {
        var box = res && res[w.entity];
        var list = box && box.events ? box.events : [];
        self.push('calendar', w.entity, list.slice(0, 12));
      }, function () {
        // Jeste nebylo spojeni - za chvili znovu.
        setTimeout(function () { self.pollCalendars(); }, RETRY_MS);
      });
    });
  };

  /* ---------- prevody pro vykresleni ---------- */

  var DAY_SHORT = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];

  /** Predpoved -> radky {den, stav, max, min} */
  function forecastRows(forecast, count) {
    var out = [];
    (forecast || []).slice(0, count || 5).forEach(function (f) {
      var t = Date.parse(f.datetime);
      var d = isNaN(t) ? null : new Date(t);
      out.push({
        day: d ? DAY_SHORT[d.getDay()] : '—',
        date: d ? d.getDate() + '.' + (d.getMonth() + 1) + '.' : '',
        word: U.WEATHER[f.condition] || U.word(f.condition),
        hi: U.num(f.temperature),
        lo: U.num(f.templow),
        rain: U.num(f.precipitation_probability)
      });
    });
    return out;
  }

  /** Udalosti -> radky {kdy, nazev, cely den} serazene od nejblizsi */
  function eventRows(events, count) {
    var now = Date.now();
    var out = [];
    (events || []).forEach(function (e) {
      var start = e.start || '';
      var allDay = start.length === 10;            // "2026-09-20" bez casu
      var t = Date.parse(allDay ? start + 'T00:00:00' : start);
      if (isNaN(t)) return;
      var endT = Date.parse(e.end && e.end.length === 10 ? e.end + 'T23:59:59' : e.end);
      if (!isNaN(endT) && endT < now) return;      // co skoncilo, uz nezajima
      out.push({ t: t, when: whenLabel(t, allDay, now), name: e.summary || '(bez názvu)',
                 allDay: allDay, location: e.location || '' });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out.slice(0, count || 5);
  }

  /** "dnes 18:30", "zítra", "pá 14:00" */
  function whenLabel(t, allDay, now) {
    var d = new Date(t), n = new Date(now || Date.now());
    var sameDay = function (a, b) {
      return a.getDate() === b.getDate() && a.getMonth() === b.getMonth()
          && a.getFullYear() === b.getFullYear();
    };
    var time = allDay ? '' : U.clockTime(d, false);
    if (sameDay(d, n)) return allDay ? 'dnes' : 'dnes ' + time;
    if (sameDay(d, new Date(n.getTime() + 86400000))) return allDay ? 'zítra' : 'zítra ' + time;
    var day = DAY_SHORT[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
    return allDay ? day : day + ' ' + time;
  }

  /** Ukoly -> jen nesplnene, serazene tak, jak prisly */
  function todoRows(items, count) {
    return (items || []).filter(function (i) {
      return i.status !== 'completed';
    }).slice(0, count || 6).map(function (i) {
      return { uid: i.uid, name: i.summary || '(bez názvu)', due: i.due || '' };
    });
  }

  return {
    Store: Store, forecastRows: forecastRows, eventRows: eventRows,
    todoRows: todoRows, whenLabel: whenLabel, DAY_SHORT: DAY_SHORT
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Feeds;

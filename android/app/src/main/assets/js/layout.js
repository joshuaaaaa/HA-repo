/* ------------------------------------------------------------------
   Rozvrzeni panelu: co se kde ukazuje.

   Tvar dat je zamerne plochy a citelny - uzivatel ho muze zkopirovat,
   poslat na druhy tablet a tam vlozit. Vsechno, co editor uklada, projde
   pres Layout.normalize(), takze panel nikdy nedostane rozbity vstup.
   ------------------------------------------------------------------ */
'use strict';

var Layout = (function () {

  var VERSION = 1;
  var TONES = ['cyan', 'amber', 'green', 'violet', 'red'];

  function id(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 8);
  }

  function str(v, def) {
    return (typeof v === 'string' && v.trim() !== '') ? v : (def === undefined ? '' : def);
  }

  function nOr(v, def) {
    var x = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(x) ? x : def;
  }

  function tone(v, def) {
    return TONES.indexOf(v) >= 0 ? v : (def || 'cyan');
  }

  /** Prazdny panel - to, co uzivatel uvidi pred prvni upravou. */
  function empty() {
    return { v: VERSION, title: '', subtitle: '', cards: [], panels: [],
             ambient: emptyAmbient(), alert: null, control: { screen: '', brightness: '' } };
  }

  function emptyAmbient() {
    return { left: null, right: null, line: [] };
  }

  function newCard() {
    return {
      id: id('card'), name: 'Nová sekce', code: '', tone: 'cyan',
      dial: { entity: '', caption: '', unit: '', min: 0, max: 100, decimals: null, levels: [] },
      meters: [], tiles: []
    };
  }

  function newPanel() {
    return { id: id('panel'), name: 'Nový panel', tone: 'green', items: [] };
  }

  function newItem(entity) {
    return { entity: entity || '', name: '', unit: '', attribute: '', decimals: null,
             tap: 'auto', bar: false, min: 0, max: 100, levels: [] };
  }

  /* ---------- kontrola a doplneni ---------- */

  function normLevels(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && i < 6; i++) {
      var l = raw[i] || {};
      var to = (l.to === null || l.to === undefined || l.to === '') ? null : nOr(l.to, null);
      out.push({
        to: to,
        tone: ['good', 'warning', 'serious', 'critical', 'info', 'idle'].indexOf(l.tone) >= 0 ? l.tone : 'good',
        label: str(l.label, '')
      });
    }
    // Prahy musi jit vzestupne, jinak by se stupne prekryvaly. Posledni
    // (otevreny) zustava na konci.
    var open = out.filter(function (l) { return l.to === null; });
    var closed = out.filter(function (l) { return l.to !== null; })
                    .sort(function (a, b) { return a.to - b.to; });
    return closed.concat(open.slice(0, 1));
  }

  function normItem(raw) {
    var r = raw || {};
    var min = nOr(r.min, 0), max = nOr(r.max, 100);
    if (max <= min) max = min + 1;
    return {
      entity: str(r.entity, ''),
      name: str(r.name, ''),
      unit: str(r.unit, ''),
      attribute: str(r.attribute, ''),
      decimals: (r.decimals === null || r.decimals === undefined || r.decimals === '') ? null : Math.max(0, Math.min(3, nOr(r.decimals, 0))),
      tap: ['auto', 'none', 'toggle'].indexOf(r.tap) >= 0 ? r.tap : 'auto',
      bar: !!r.bar,
      min: min, max: max,
      levels: normLevels(r.levels)
    };
  }

  function normCard(raw) {
    var r = raw || {};
    var d = r.dial || {};
    var min = nOr(d.min, 0), max = nOr(d.max, 100);
    if (max <= min) max = min + 1;
    return {
      id: str(r.id, id('card')),
      name: str(r.name, 'Sekce'),
      code: str(r.code, '').slice(0, 4),
      tone: tone(r.tone),
      dial: {
        entity: str(d.entity, ''),
        caption: str(d.caption, ''),
        unit: str(d.unit, ''),
        attribute: str(d.attribute, ''),
        decimals: (d.decimals === null || d.decimals === undefined || d.decimals === '') ? null : Math.max(0, Math.min(3, nOr(d.decimals, 0))),
        min: min, max: max,
        levels: normLevels(d.levels)
      },
      meters: (Array.isArray(r.meters) ? r.meters : []).slice(0, 4).map(function (m) {
        var it = normItem(m); it.bar = true; return it;
      }),
      tiles: (Array.isArray(r.tiles) ? r.tiles : []).slice(0, 6).map(normItem)
    };
  }

  function normPanel(raw) {
    var r = raw || {};
    return {
      id: str(r.id, id('panel')),
      name: str(r.name, 'Panel'),
      tone: tone(r.tone, 'green'),
      items: (Array.isArray(r.items) ? r.items : []).slice(0, 8).map(normItem)
    };
  }

  /** Jediny vstupni bod: cokoli prijde, odejde platne rozvrzeni. */
  function normalize(raw) {
    var r = raw || {};
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch (e) { r = {}; }
    }
    var out = {
      v: VERSION,
      title: str(r.title, ''),
      subtitle: str(r.subtitle, ''),
      cards: (Array.isArray(r.cards) ? r.cards : []).slice(0, 2).map(normCard),
      panels: (Array.isArray(r.panels) ? r.panels : []).slice(0, 2).map(normPanel),
      ambient: emptyAmbient(),
      alert: null,
      // Ovladani tabletu z Home Assistantu: prepinac pro displej a
      // cislo pro jas. Panel je jen posloucha, sam je nemeni.
      control: {
        screen: str((r.control || {}).screen, ''),
        brightness: str((r.control || {}).brightness, '')
      }
    };
    var a = r.ambient || {};
    out.ambient.left = a.left && a.left.entity ? normItem(a.left) : null;
    out.ambient.right = a.right && a.right.entity ? normItem(a.right) : null;
    out.ambient.line = (Array.isArray(a.line) ? a.line : []).slice(0, 3)
      .map(normItem).filter(function (i) { return i.entity; });

    if (r.alert && r.alert.entity) {
      out.alert = {
        entity: str(r.alert.entity, ''),
        name: str(r.alert.name, 'Upozornění'),
        on: str(r.alert.on, 'on'),
        attribute: str(r.alert.attribute, ''),
        note: str(r.alert.note, '')
      };
    }
    return out;
  }

  /** Vsechny entity, na kterych rozvrzeni stoji - pro kontrolu dostupnosti. */
  function entities(l) {
    var out = [];
    function add(e) { if (e && out.indexOf(e) < 0) out.push(e); }
    (l.cards || []).forEach(function (c) {
      add(c.dial.entity);
      (c.meters || []).forEach(function (m) { add(m.entity); });
      (c.tiles || []).forEach(function (t) { add(t.entity); });
    });
    (l.panels || []).forEach(function (p) {
      (p.items || []).forEach(function (i) { add(i.entity); });
    });
    if (l.ambient) {
      if (l.ambient.left) add(l.ambient.left.entity);
      if (l.ambient.right) add(l.ambient.right.entity);
      (l.ambient.line || []).forEach(function (i) { add(i.entity); });
    }
    if (l.alert) add(l.alert.entity);
    if (l.control) { add(l.control.screen); add(l.control.brightness); }
    return out;
  }

  function isEmpty(l) {
    return !l || ((l.cards || []).length === 0 && (l.panels || []).length === 0);
  }

  /**
   * Prvni rozvrzeni sestavene z toho, co v Home Assistantu opravdu je.
   * Lepsi nez prazdna obrazovka: uzivatel hned vidi sve hodnoty a jen je
   * prejmenuje nebo vymeni.
   */
  function fromStates(states) {
    var list = [];
    for (var k in states) if (Object.prototype.hasOwnProperty.call(states, k)) list.push(states[k]);

    function pick(deviceClass, limit) {
      return list.filter(function (s) {
        return (s.attributes || {}).device_class === deviceClass
            && !isNaN(parseFloat(s.state));
      }).slice(0, limit || 4);
    }

    var l = empty();
    var temps = pick('temperature', 2);
    var hums = pick('humidity', 2);
    var bats = pick('battery', 4);

    temps.forEach(function (t, i) {
      var c = newCard();
      var sug = U.suggest(t);
      c.name = (U.name(t) || 'Teplota').toUpperCase().slice(0, 18);
      c.code = 'T' + (i + 1);
      c.tone = i === 0 ? 'cyan' : 'amber';
      c.dial.entity = t.entity_id;
      c.dial.caption = sug.caption || 'Teplota';
      c.dial.min = sug.min; c.dial.max = sug.max;
      c.dial.decimals = sug.decimals;
      c.dial.levels = sug.levels;
      if (hums[i]) {
        var m = newItem(hums[i].entity_id);
        m.name = 'Vlhkost'; m.bar = true; m.min = 0; m.max = 100;
        c.meters.push(m);
      }
      l.cards.push(c);
    });

    if (bats.length) {
      var p = newPanel();
      p.name = 'Baterie';
      p.tone = 'green';
      p.items = bats.map(function (b) {
        var it = newItem(b.entity_id);
        it.name = U.name(b);
        it.bar = true; it.min = 0; it.max = 100;
        it.levels = U.suggest(b).levels;
        return it;
      });
      l.panels.push(p);
    }

    var lights = list.filter(function (s) { return U.domain(s.entity_id) === 'light'; }).slice(0, 4);
    if (lights.length) {
      var lp = newPanel();
      lp.name = 'Světla';
      lp.tone = 'amber';
      lp.items = lights.map(function (s) {
        var it = newItem(s.entity_id);
        it.name = U.name(s);
        return it;
      });
      l.panels.push(lp);
    }

    // I v klidovem rezimu plati "barva a slovo" - stupne tedy jedou s sebou.
    function ambItem(st) {
      var sug = U.suggest(st);
      return normItem({ entity: st.entity_id, name: U.name(st), levels: sug.levels,
                        decimals: sug.decimals });
    }
    if (temps[0]) l.ambient.left = ambItem(temps[0]);
    if (temps[1] || hums[0]) l.ambient.right = ambItem(temps[1] || hums[0]);
    return normalize(l);
  }

  return {
    VERSION: VERSION, TONES: TONES,
    empty: empty, newCard: newCard, newPanel: newPanel, newItem: newItem,
    normalize: normalize, entities: entities, isEmpty: isEmpty, fromStates: fromStates,
    id: id
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Layout;

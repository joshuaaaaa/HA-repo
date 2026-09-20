/* ------------------------------------------------------------------
   Prevody a slova. Nic z toho nesaha na DOM, aby to sly testy spustit
   samostatne v Node.
   ------------------------------------------------------------------ */
'use strict';

var U = (function () {

  var DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

  /* Stupne stavu: barva a SLOVO. Slovo je povinne - barva sama o sobe
     je pro cast lidi neviditelna a pres pokoj se stejne splyva. */
  var TONES = {
    good:     { color: '#8af5bc', word: 'V normě' },
    warning:  { color: '#ffd064', word: 'Zvýšená' },
    serious:  { color: '#ff9863', word: 'Vysoká' },
    critical: { color: '#ff5369', word: 'Kritická' },
    info:     { color: '#36d8ff', word: 'Aktivní' },
    idle:     { color: '#7f8b99', word: '—' }
  };

  /* Bezne stavy entit cesky. Co tu neni, ukaze se tak, jak prislo. */
  var WORDS = {
    on: 'Zapnuto', off: 'Vypnuto', home: 'Doma', not_home: 'Pryč',
    open: 'Otevřeno', opening: 'Otevírá se', closed: 'Zavřeno', closing: 'Zavírá se',
    locked: 'Zamčeno', unlocked: 'Odemčeno', unavailable: 'Nedostupné', unknown: 'Neznámé',
    idle: 'Klid', playing: 'Hraje', paused: 'Pauza', standby: 'Pohotovost', buffering: 'Načítá',
    heat: 'Topí', cool: 'Chladí', heat_cool: 'Topí/chladí', auto: 'Automaticky',
    dry: 'Vysouší', fan_only: 'Ventilace', cleaning: 'Uklízí', docked: 'V doku',
    returning: 'Vrací se', charging: 'Nabíjí', discharging: 'Vybíjí', full: 'Nabito',
    armed_home: 'Zajištěno doma', armed_away: 'Zajištěno', disarmed: 'Odjištěno',
    triggered: 'Poplach', pending: 'Odpočet', above_horizon: 'Nad obzorem',
    below_horizon: 'Pod obzorem'
  };

  /* Binarni cidla mluvi podle toho, co hlidaji. */
  var BINARY = {
    motion: ['Pohyb', 'Klid'], occupancy: ['Obsazeno', 'Volno'],
    door: ['Otevřeno', 'Zavřeno'], window: ['Otevřeno', 'Zavřeno'],
    garage_door: ['Otevřeno', 'Zavřeno'], opening: ['Otevřeno', 'Zavřeno'],
    moisture: ['Vlhko', 'Sucho'], smoke: ['Kouř', 'Klid'], gas: ['Plyn', 'Klid'],
    problem: ['Závada', 'V pořádku'], safety: ['Nebezpečí', 'Bezpečno'],
    battery: ['Slabá', 'V pořádku'], presence: ['Doma', 'Pryč'],
    connectivity: ['Připojeno', 'Odpojeno'], running: ['Běží', 'Stojí'],
    power: ['Odběr', 'Klid'], sound: ['Zvuk', 'Ticho'], vibration: ['Otřesy', 'Klid'],
    lock: ['Odemčeno', 'Zamčeno'], plug: ['Zapojeno', 'Odpojeno'],
    light: ['Světlo', 'Tma'], update: ['Aktualizace', 'Aktuální']
  };

  /* Navrh rozsahu a stupnu podle druhu cidla - aby uzivatel po vybrani
     entity nemusel nic dopisovat. */
  var SUGGEST = {
    temperature: { min: 0, max: 35, caption: 'Teplota', decimals: 1,
      levels: [{ to: 18, tone: 'info', label: 'Chladno' }, { to: 24, tone: 'good', label: 'Příjemno' },
               { to: 28, tone: 'warning', label: 'Teplo' }, { to: null, tone: 'critical', label: 'Horko' }] },
    humidity: { min: 0, max: 100, caption: 'Vlhkost', decimals: 0,
      levels: [{ to: 30, tone: 'warning', label: 'Sucho' }, { to: 60, tone: 'good', label: 'V normě' },
               { to: 70, tone: 'warning', label: 'Vlhko' }, { to: null, tone: 'critical', label: 'Mokro' }] },
    battery: { min: 0, max: 100, caption: 'Baterie', decimals: 0,
      levels: [{ to: 15, tone: 'critical', label: 'Vybitá' }, { to: 30, tone: 'warning', label: 'Dochází' },
               { to: null, tone: 'good', label: 'V pořádku' }] },
    carbon_dioxide: { min: 400, max: 2000, caption: 'CO₂', decimals: 0,
      levels: [{ to: 800, tone: 'good', label: 'Čerstvo' }, { to: 1200, tone: 'warning', label: 'Vydýcháno' },
               { to: 1800, tone: 'serious', label: 'Těžký vzduch' }, { to: null, tone: 'critical', label: 'Vyvětrat' }] },
    pm25: { min: 0, max: 100, caption: 'Prach PM2,5', decimals: 0,
      levels: [{ to: 15, tone: 'good', label: 'Čisto' }, { to: 35, tone: 'warning', label: 'Zhoršeno' },
               { to: null, tone: 'critical', label: 'Špatné' }] },
    illuminance: { min: 0, max: 1000, caption: 'Osvětlení', decimals: 0, levels: [] },
    power: { min: 0, max: 3000, caption: 'Příkon', decimals: 0, levels: [] },
    energy: { min: 0, max: 100, caption: 'Spotřeba', decimals: 2, levels: [] },
    pressure: { min: 970, max: 1040, caption: 'Tlak', decimals: 0, levels: [] },
    signal_strength: { min: -100, max: -30, caption: 'Signál', decimals: 0, levels: [] }
  };

  /** Cislo z hodnoty, ktera muze byt text ("21,5 °C"). NaN, kdyz to cislo neni. */
  function num(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var m = String(v).replace(/ /g, ' ').match(/-?[\d\s.,]+/);
    if (!m) return NaN;
    var t = m[0].replace(/\s/g, '');
    if (t.indexOf('.') >= 0 && t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(',', '.');
    var x = parseFloat(t);
    return isNaN(x) ? NaN : x;
  }

  /* Cesky se pise desetinna carka - na panelu to musi sedet, jinak to
     pusobi jako chyba prekladu. */
  function fmt(v, d) {
    if (isNaN(v)) return '--';
    return v.toFixed(d === undefined || d === null ? 0 : d).replace('.', ',');
  }

  function pct(v, min, max) {
    if (isNaN(v) || max === min) return 0;
    return Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
  }

  /** Stupen podle prahu: prvni, do ktereho se hodnota vejde. */
  function level(value, levels) {
    if (isNaN(value) || !levels || !levels.length) return TONES.idle;
    for (var i = 0; i < levels.length; i++) {
      var l = levels[i];
      if (l.to === null || l.to === undefined || value <= l.to) {
        var t = TONES[l.tone] || TONES.idle;
        return { color: t.color, word: l.label || t.word, tone: l.tone || 'idle' };
      }
    }
    var last = levels[levels.length - 1];
    var lt = TONES[last.tone] || TONES.idle;
    return { color: lt.color, word: last.label || lt.word, tone: last.tone || 'idle' };
  }

  /** Slovo pro nenumericky stav. */
  function word(state, attrs) {
    var s = String(state === undefined || state === null ? '' : state);
    var dc = attrs && attrs.device_class;
    if (dc && BINARY[dc] && (s === 'on' || s === 'off')) return BINARY[dc][s === 'on' ? 0 : 1];
    if (WORDS[s]) return WORDS[s];
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  /**
   * Jak entitu ukazat. Vraci cislo i hotovy text, aby si dlazdice vybrala.
   * opt: {unit, decimals, attribute}
   */
  function display(st, opt) {
    opt = opt || {};
    if (!st) return { has: false, n: NaN, text: '—', unit: '', word: 'Nedostupné', live: false };
    var raw = opt.attribute ? (st.attributes || {})[opt.attribute] : st.state;
    var n = num(raw);
    var unit = opt.unit !== undefined && opt.unit !== null && opt.unit !== ''
      ? opt.unit
      : ((st.attributes || {}).unit_of_measurement || '');
    var dead = st.state === 'unavailable' || st.state === 'unknown' || raw === undefined;
    if (dead) return { has: false, n: NaN, text: '—', unit: '', word: word(st.state, st.attributes), live: false };
    if (!isNaN(n)) {
      var d = opt.decimals;
      if (d === undefined || d === null || d === '') d = Math.abs(n) >= 100 ? 0 : (Number.isInteger(n) ? 0 : 1);
      return { has: true, n: n, text: fmt(n, d), unit: unit, word: '', live: true };
    }
    return { has: true, n: NaN, text: word(raw, st.attributes), unit: '', word: word(raw, st.attributes), live: true };
  }

  /** Navrh nastaveni pro cerstve vybranou entitu. */
  function suggest(st) {
    var a = (st && st.attributes) || {};
    var base = SUGGEST[a.device_class];
    var out = {
      caption: '', unit: a.unit_of_measurement || '', min: 0, max: 100,
      decimals: null, levels: []
    };
    if (base) {
      out.caption = base.caption;
      out.min = base.min; out.max = base.max;
      out.decimals = base.decimals;
      out.levels = JSON.parse(JSON.stringify(base.levels));
    } else if (out.unit === '%') {
      out.min = 0; out.max = 100;
    } else if (!isNaN(num(st && st.state))) {
      var v = num(st.state);
      out.min = Math.min(0, Math.floor(v - Math.abs(v) - 10));
      out.max = Math.max(10, Math.ceil(v * 2));
    }
    return out;
  }

  function name(st, fallback) {
    if (fallback) return fallback;
    if (!st) return '—';
    if (st.attributes && st.attributes.friendly_name) return st.attributes.friendly_name;
    var id = st.entity_id || '';
    var dot = id.indexOf('.');
    return dot > 0 ? id.slice(dot + 1).replace(/_/g, ' ') : id;
  }

  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function clockTime(d, seconds) {
    return two(d.getHours()) + ':' + two(d.getMinutes()) + (seconds ? ':' + two(d.getSeconds()) : '');
  }
  function clockDate(d) {
    return DAYS[d.getDay()] + ' · ' + d.getDate() + '. ' + MONTHS[d.getMonth()];
  }

  /** "před 4 min" - jak cerstva je hodnota. */
  function ago(iso, now) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var s = Math.max(0, Math.round(((now || Date.now()) - t) / 1000));
    if (s < 60) return 'právě teď';
    var m = Math.round(s / 60);
    if (m < 60) return 'před ' + m + ' min';
    var h = Math.floor(m / 60);
    if (h < 24) return 'před ' + h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    var dd = Math.floor(h / 24);
    return 'před ' + dd + ' d' + (h % 24 ? ' ' + (h % 24) + ' h' : '');
  }

  /** Domena entity: "light.kuchyne" -> "light" */
  function domain(entityId) {
    var id = String(entityId || '');
    var i = id.indexOf('.');
    return i > 0 ? id.slice(0, i) : '';
  }

  /** Da se entita prepnout klepnutim? */
  var SWITCHABLE = ['light', 'switch', 'fan', 'input_boolean', 'script', 'scene',
                    'automation', 'cover', 'lock', 'media_player', 'siren', 'button'];
  function switchable(entityId) {
    return SWITCHABLE.indexOf(domain(entityId)) >= 0;
  }

  /** Sluzba pro klepnuti na dlazdici. */
  function tapService(entityId, state) {
    var d = domain(entityId);
    if (d === 'scene') return { domain: 'scene', service: 'turn_on' };
    if (d === 'script') return { domain: 'script', service: 'turn_on' };
    if (d === 'button') return { domain: 'button', service: 'press' };
    if (d === 'cover') return { domain: 'cover', service: state === 'open' ? 'close_cover' : 'open_cover' };
    if (d === 'lock') return { domain: 'lock', service: state === 'locked' ? 'unlock' : 'lock' };
    if (d === 'media_player') return { domain: 'media_player', service: 'media_play_pause' };
    if (SWITCHABLE.indexOf(d) >= 0) return { domain: d === 'input_boolean' ? 'input_boolean' : d, service: 'toggle' };
    return null;
  }

  return {
    DAYS: DAYS, MONTHS: MONTHS, TONES: TONES, WORDS: WORDS, BINARY: BINARY, SUGGEST: SUGGEST,
    num: num, fmt: fmt, pct: pct, level: level, word: word, display: display,
    suggest: suggest, name: name, clockTime: clockTime, clockDate: clockDate, ago: ago,
    domain: domain, switchable: switchable, tapService: tapService
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = U;

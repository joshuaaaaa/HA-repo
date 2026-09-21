/* ------------------------------------------------------------------
   Vizuální editor karty: totéž, co se dá napsat v YAML, ale naklikat.
   Home Assistant ho otevře sám, když se karta upravuje v dashboardu
   (tlačítko UPRAVIT na kartě) - YAML zůstává pro ty, kdo ho chtějí.

   Editor si vystačí s obyčejnými prvky prohlížeče a prvky Home
   Assistanta použije jen tehdy, když opravdu existují (ha-entity-picker,
   ha-textfield...). Karta tak jde upravovat i ve starším Home
   Assistantovi, kde některý z nich chybí.

   Pravidlo pro překreslování: dokud se mění jen text v poli, editor se
   NEPŘEKRESLUJE - jinak by pod rukama utekl kurzor. Přestaví se až
   tehdy, když se změní stavba (přibude sekce, změní se zobrazení).
   ------------------------------------------------------------------ */

var EDITOR_TYPE = CARD_TYPE + '-editor';

var TONES = [
  { value: 'cyan', label: 'Modrá' }, { value: 'amber', label: 'Oranžová' },
  { value: 'green', label: 'Zelená' }, { value: 'violet', label: 'Fialová' },
  { value: 'red', label: 'Červená' }
];

var VIEWS = [
  { value: 'gauge', label: 'Budík' }, { value: 'bar', label: 'Sloupec' },
  { value: 'graph', label: 'Křivka (graf)' }, { value: 'number', label: 'Jen číslo' },
  { value: 'camera', label: 'Kamera' }, { value: 'forecast', label: 'Předpověď počasí' },
  { value: 'calendar', label: 'Kalendář' }, { value: 'todo', label: 'Seznam úkolů' }
];

var ITEM_VIEWS = [
  { value: 'value', label: 'Jen hodnota' }, { value: 'bar', label: 'Pruh' },
  { value: 'graph', label: 'Křivka' }, { value: 'camera', label: 'Náhled kamery' }
];

var TAPS = [
  { value: 'auto', label: 'Podle druhu entity' }, { value: 'none', label: 'Nic' },
  { value: 'toggle', label: 'Přepnout' }, { value: 'detail', label: 'Okno s podrobnostmi' }
];

var LEVEL_TONES = [
  { value: 'good', label: 'V pořádku' }, { value: 'info', label: 'Informace' },
  { value: 'warning', label: 'Pozor' }, { value: 'serious', label: 'Vážné' },
  { value: 'critical', label: 'Kritické' }, { value: 'idle', label: 'Klid' }
];

/** Která pole má které zobrazení - zbytek se schová, ať editor nestraší. */
function viewNeeds(view) {
  if (view === 'camera') return { entity: 'camera', refresh: true };
  if (view === 'forecast') return { entity: 'weather', count: true };
  if (view === 'calendar') return { entity: 'calendar', count: true, days: true };
  if (view === 'todo') return { entity: 'todo', count: true };
  if (view === 'graph') return { hours: true, number: true };
  return { number: true, range: view !== 'number' };
}

var EDITOR_CSS = `
:host{display:block}
.wrap{display:flex;flex-direction:column;gap:12px;color:var(--primary-text-color,#212121);
 font-family:var(--paper-font-body1_-_font-family,inherit);font-size:14px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--divider-color,#e0e0e0);flex-wrap:wrap}
.tab{padding:10px 16px;cursor:pointer;border-bottom:2px solid transparent;
 color:var(--secondary-text-color,#727272);user-select:none}
.tab.on{color:var(--primary-color,#03a9f4);border-bottom-color:var(--primary-color,#03a9f4)}
.hint{color:var(--secondary-text-color,#727272);font-size:13px;line-height:1.5;margin:0}
.block{border:1px solid var(--divider-color,#e0e0e0);border-radius:10px;overflow:hidden;
 background:var(--card-background-color,#fff)}
.bhead{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;
 background:var(--secondary-background-color,#f5f5f5)}
.bhead b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.bhead .sub{color:var(--secondary-text-color,#727272);font-size:12px;white-space:nowrap}
.body{padding:12px;display:flex;flex-direction:column;gap:10px}
.block.zavreno .body{display:none}
.row{display:flex;flex-wrap:wrap;gap:10px}
.f{flex:1 1 170px;display:flex;flex-direction:column;gap:4px;min-width:0}
.f.wide{flex:1 1 100%}
.f > label{font-size:12px;color:var(--secondary-text-color,#727272)}
input,select,textarea{width:100%;box-sizing:border-box;min-height:40px;padding:8px 10px;font:inherit;
 color:var(--primary-text-color,#212121);background:var(--secondary-background-color,#fafafa);
 border:1px solid var(--divider-color,#e0e0e0);border-radius:6px}
input:focus,select:focus{outline:none;border-color:var(--primary-color,#03a9f4)}
button{min-height:40px;padding:0 14px;font:inherit;cursor:pointer;border-radius:6px;
 border:1px solid var(--divider-color,#e0e0e0);background:var(--secondary-background-color,#fafafa);
 color:var(--primary-text-color,#212121)}
button.hlavni{background:var(--primary-color,#03a9f4);border-color:var(--primary-color,#03a9f4);color:#fff}
button.ikona{min-width:36px;min-height:36px;padding:0;line-height:1}
button.smazat{color:var(--error-color,#db4437)}
button:hover{filter:brightness(.97)}
.nastroje{display:flex;gap:6px;align-items:center}
.pruh{display:flex;gap:8px;flex-wrap:wrap}
.polozka{border:1px solid var(--divider-color,#e0e0e0);border-radius:8px;padding:10px;
 display:flex;flex-direction:column;gap:8px}
.prazdno{color:var(--secondary-text-color,#727272);font-size:13px;padding:6px 0}
.prep{display:flex;align-items:center;gap:8px}
.prep input{width:auto;min-height:0}
/* Vlastní výběr entity - použije se jen tam, kde Home Assistant svůj
   nenabídne. Seznam se filtruje podle toho, co člověk píše. */
.pick{position:relative}
.pick .nabidka{position:absolute;z-index:9;left:0;right:0;top:calc(100% + 2px);max-height:260px;
 overflow-y:auto;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#e0e0e0);
 border-radius:6px;box-shadow:0 8px 24px #0003;display:none}
.pick.otevreno .nabidka{display:block}
.pick .radek{padding:8px 10px;cursor:pointer;display:flex;flex-direction:column;gap:2px}
.pick .radek:hover,.pick .radek.vybrany{background:var(--secondary-background-color,#f1f1f1)}
.pick .radek b{font-weight:500}
.pick .radek i{font-style:normal;font-size:12px;color:var(--secondary-text-color,#727272)}
.varovani{border-left:3px solid var(--warning-color,#ffa600);padding:8px 12px;
 background:var(--secondary-background-color,#fafafa);border-radius:6px}
`;

class HaPanelCardEditor extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = { type: 'custom:' + CARD_TYPE, sections: [], panels: [] };
    this._hass = null;
    this._tab = 'sekce';
    this._open = {};            // které sekce jsou rozbalené
    this._klic = '';            // otisk stavby - podle něj se překresluje
  }

  setConfig(config) {
    // Home Assistant vrací po každé změně konfiguraci zpátky. Když je to
    // přesně to, co jsme před chvílí poslali, nesmí se tu nic vyměnit:
    // obsluhy tlačítek drží odkazy na živé pole sekcí a výměnou by
    // začaly upravovat něco, co už nikam nevede (a klikání by přestalo
    // cokoli dělat). Cizí změna (úprava v YAML) se naopak přebírá celá.
    var novy = JSON.stringify(uklid(JSON.parse(JSON.stringify(config || {}))));
    if (this._config && novy === JSON.stringify(uklid(JSON.parse(JSON.stringify(this._config))))) {
      return;
    }
    this._config = JSON.parse(JSON.stringify(config || {}));
    if (!this._config.sections && !this._config.layout) this._config.sections = [];
    if (!this._config.panels) this._config.panels = [];
    this._render();
  }

  set hass(hass) {
    var prvni = !this._hass;
    this._hass = hass;
    if (prvni) this._render();
    else this._pickers().forEach(function (p) { p.hass = hass; });
  }

  get hass() { return this._hass; }

  connectedCallback() { this._render(); }

  /* ---------- pomocníci ---------- */

  _pickers() {
    return [].slice.call(this.shadowRoot.querySelectorAll('ha-entity-picker'));
  }

  /** Otisk stavby. Změní-li se, musí se editor přestavět. */
  _stavba() {
    var c = this._config;
    var s = [this._tab, !!c.layout, (c.sections || []).length, (c.panels || []).length];
    (c.sections || []).forEach(function (x) {
      s.push(x.view || 'gauge', (x.levels || []).length, (x.meters || []).length, (x.tiles || []).length);
    });
    (c.panels || []).forEach(function (p) { s.push((p.items || []).length); });
    Object.keys(this._open).forEach(function (k) { if (this._open[k]) s.push('o' + k); }, this);
    return s.join('|');
  }

  /** Pošle změnu Lovelace. Prázdné hodnoty se do YAML nepíšou. */
  _emit(prestavet) {
    // Ven jde uklizena kopie (v YAML at neni nic prazdneho), uvnitr si
    // editor nechava svuj zivy strom - na nem visi vsechny obsluhy.
    var cfg = uklid(JSON.parse(JSON.stringify(this._config)));
    if (prestavet) this._render();
    else this._klic = this._stavba();
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: cfg }, bubbles: true, composed: true
    }));
  }

  /* ---------- stavba obrazovky ---------- */

  _render() {
    var self = this;
    var sr = this.shadowRoot;
    sr.innerHTML = '<style>' + EDITOR_CSS + '</style>';
    var wrap = e('div', 'wrap');
    sr.appendChild(wrap);
    this._klic = this._stavba();

    var tabs = e('div', 'tabs');
    [['sekce', 'Sekce'], ['panely', 'Panely'], ['celek', 'Celek']].forEach(function (t) {
      var b = e('div', 'tab' + (self._tab === t[0] ? ' on' : ''), t[1]);
      b.addEventListener('click', function () { self._tab = t[0]; self._render(); });
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);

    // Rozvržení vyexportované z aplikace se naklikat nedá - je to jeden
    // velký JSON. Nabídne se převod na sekce, ať se o to editor může
    // starat dál.
    if (this._config.layout) {
      var v = e('div', 'varovani');
      v.appendChild(e('p', 'hint', 'Karta má vložené rozvržení z aplikace (layout). '
        + 'Vizuální editor s ním neumí pracovat — převeď ho na sekce, nebo kartu uprav v YAML.'));
      var pb = btn('Převést na sekce', 'hlavni', function () {
        var l = Layout.normalize(self._config.layout);
        var prvni = l.pages[0] || { cards: [], panels: [] };
        self._config.sections = prvni.cards.map(sekceZKarty);
        self._config.panels = prvni.panels.map(panelZPanelu);
        if (prvni.grid && prvni.grid.cols) self._config.columns = prvni.grid.cols;
        if (prvni.grid && prvni.grid.rows) self._config.rows = prvni.grid.rows;
        if (l.title) self._config.title = l.title;
        if (l.weather) self._config.weather = l.weather;
        delete self._config.layout;
        self._emit(true);
      });
      v.appendChild(pb);
      wrap.appendChild(v);
      return;
    }

    if (this._tab === 'sekce') this._tabSekce(wrap);
    else if (this._tab === 'panely') this._tabPanely(wrap);
    else this._tabCelek(wrap);
  }

  /* ---------- záložka Sekce ---------- */

  _tabSekce(wrap) {
    var self = this;
    var secs = this._config.sections || (this._config.sections = []);
    wrap.appendChild(e('p', 'hint', 'Sekce je hlavní hodnota s ukazateli vedle. '
      + 'Čím víc jich je, tím menší okna — o tom rozhoduješ ty. '
      + 'Co nevyplníš (rozsah, stupně, popisek), doplní karta podle druhu čidla.'));

    secs.forEach(function (s, i) {
      wrap.appendChild(self._blokSekce(s, i, secs));
    });

    if (!secs.length) wrap.appendChild(e('div', 'prazdno', 'Zatím tu není žádná sekce.'));

    var pruh = e('div', 'pruh');
    pruh.appendChild(btn('+ Sekce', 'hlavni', function () {
      secs.push({ name: 'SEKCE ' + (secs.length + 1), tone: TONES[secs.length % TONES.length].value, entity: '' });
      self._open[secs.length - 1] = true;
      self._emit(true);
    }));
    pruh.appendChild(btn('Navrhnout z mých entit', '', function () {
      if (!self._hass) return;
      var l = Layout.fromStates(self._hass.states);
      var prvni = l.pages[0] || { cards: [], panels: [] };
      self._config.sections = prvni.cards.map(sekceZKarty);
      if (!self._config.panels || !self._config.panels.length) {
        self._config.panels = prvni.panels.map(panelZPanelu);
      }
      self._emit(true);
    }));
    wrap.appendChild(pruh);
  }

  _blokSekce(s, i, secs) {
    var self = this;
    var potreba = viewNeeds(s.view || 'gauge');
    var blok = e('div', 'block' + (this._open[i] ? '' : ' zavreno'));

    var head = e('div', 'bhead');
    var hb = e('b', '', s.name || s.entity || ('Sekce ' + (i + 1)));
    head.appendChild(hb);
    head.appendChild(e('span', 'sub', popisZobrazeni(s.view)));
    head.addEventListener('click', function (ev) {
      if (ev.target.closest('button')) return;
      self._open[i] = !self._open[i];
      blok.classList.toggle('zavreno');
    });
    var n = e('div', 'nastroje');
    n.appendChild(ikona('▲', function () { presun(secs, i, -1); self._emit(true); }));
    n.appendChild(ikona('▼', function () { presun(secs, i, 1); self._emit(true); }));
    n.appendChild(ikona('✕', function () { secs.splice(i, 1); self._open = {}; self._emit(true); }, 'smazat'));
    head.appendChild(n);
    blok.appendChild(head);

    var b = e('div', 'body');
    blok.appendChild(b);

    b.appendChild(radek([
      pole('Název', text(s.name || '', function (v) { s.name = v; hb.textContent = v || 'Sekce'; self._emit(); })),
      pole('Zkratka v rámečku', text(s.code || '', function (v) { s.code = v; self._emit(); })),
      pole('Barva', vyber(TONES, s.tone || 'cyan', function (v) { s.tone = v; self._emit(); })),
      pole('Zobrazení', vyber(VIEWS, s.view || 'gauge', function (v) {
        s.view = v === 'gauge' ? undefined : v;
        self._emit(true);
      }))
    ]));

    b.appendChild(radek([
      poleSiroke('Entita', this._entita(s.entity, function (v) { s.entity = v; self._emit(); }, potreba.entity))
    ]));

    var r2 = [];
    if (potreba.number) {
      r2.push(pole('Popisek', text(s.caption || '', function (v) { s.caption = v; self._emit(); })));
      r2.push(pole('Jednotka', text(s.unit || '', function (v) { s.unit = v; self._emit(); })));
      r2.push(pole('Desetinná místa', cislo(s.decimals, function (v) { s.decimals = v; self._emit(); })));
    }
    if (potreba.range) {
      r2.push(pole('Budík od', cislo(s.min, function (v) { s.min = v; self._emit(); })));
      r2.push(pole('Budík do', cislo(s.max, function (v) { s.max = v; self._emit(); })));
    }
    if (potreba.hours) r2.push(pole('Křivka za (h)', cislo(s.hours, function (v) { s.hours = v; self._emit(); })));
    if (potreba.refresh) r2.push(pole('Obnovovat po (s)', cislo(s.refresh, function (v) { s.refresh = v; self._emit(); })));
    if (potreba.count) r2.push(pole('Kolik řádků', cislo(s.count, function (v) { s.count = v; self._emit(); })));
    if (potreba.days) r2.push(pole('Dní dopředu', cislo(s.days, function (v) { s.days = v; self._emit(); })));
    if (r2.length) b.appendChild(radek(r2));

    if (potreba.number) {
      b.appendChild(this._stupne(s));
      b.appendChild(this._seznam('Ukazatele vedle hodnoty', s, 'meters', 4));
      b.appendChild(this._seznam('Dlaždice pod ukazateli', s, 'tiles', 6));
    }
    return blok;
  }

  /* ---------- stupně (hodnota → slovo a barva) ---------- */

  _stupne(s) {
    var self = this;
    var lvl = s.levels || (s.levels = []);
    var blok = e('div', 'polozka');
    blok.appendChild(e('p', 'hint', 'Stupně: do jaké hodnoty platí které slovo a barva. '
      + 'Poslední řádek bez čísla platí pro všechno nad. Slovo je důležitější než barva — '
      + 'přes pokoj se barvy pletou. Prázdné = karta si je doplní podle druhu čidla.'));

    lvl.forEach(function (l, i) {
      blok.appendChild(radek([
        pole('Do hodnoty', cislo(l.to, function (v) { l.to = v; self._emit(); })),
        pole('Slovo', text(l.label || '', function (v) { l.label = v; self._emit(); })),
        pole('Stupeň', vyber(LEVEL_TONES, l.tone || 'good', function (v) { l.tone = v; self._emit(); })),
        poleTlacitko(ikona('✕', function () { lvl.splice(i, 1); self._emit(true); }, 'smazat'))
      ]));
    });
    blok.appendChild(btn('+ Stupeň', '', function () {
      lvl.push({ to: undefined, label: '', tone: 'good' });
      self._emit(true);
    }));
    return blok;
  }

  /* ---------- ukazatele, dlaždice, položky panelu ---------- */

  _seznam(nadpis, drzak, klic, max, sTap) {
    var self = this;
    var pole_ = drzak[klic] || (drzak[klic] = []);
    var blok = e('div', 'polozka');
    var h = e('div', 'bhead');
    h.appendChild(e('b', '', nadpis));
    h.appendChild(e('span', 'sub', pole_.length + ' / ' + max));
    blok.appendChild(h);

    pole_.forEach(function (it, i) {
      var vnitrek = e('div', 'polozka');
      vnitrek.appendChild(radek([
        poleSiroke('Entita', self._entita(it.entity, function (v) { it.entity = v; self._emit(); },
          it.view === 'camera' ? 'camera' : ''))
      ]));
      var r = [
        pole('Název', text(it.name || '', function (v) { it.name = v; self._emit(); })),
        pole('Zobrazení', vyber(ITEM_VIEWS, it.view || 'value', function (v) {
          it.view = v === 'value' ? undefined : v; self._emit(true);
        }))
      ];
      if (sTap) {
        r.push(pole('Klepnutí', vyber(TAPS, it.tap || 'auto', function (v) {
          it.tap = v === 'auto' ? undefined : v; self._emit();
        })));
      }
      if (it.view === 'bar') {
        r.push(pole('Od', cislo(it.min, function (v) { it.min = v; self._emit(); })));
        r.push(pole('Do', cislo(it.max, function (v) { it.max = v; self._emit(); })));
      }
      if (it.view === 'graph') {
        r.push(pole('Křivka za (h)', cislo(it.hours, function (v) { it.hours = v; self._emit(); })));
      }
      if (it.view === 'camera') {
        r.push(pole('Obnovovat po (s)', cislo(it.refresh, function (v) { it.refresh = v; self._emit(); })));
      }
      r.push(poleTlacitko(ikona('▲', function () { presun(pole_, i, -1); self._emit(true); })));
      r.push(poleTlacitko(ikona('▼', function () { presun(pole_, i, 1); self._emit(true); })));
      r.push(poleTlacitko(ikona('✕', function () { pole_.splice(i, 1); self._emit(true); }, 'smazat')));
      vnitrek.appendChild(radek(r));
      blok.appendChild(vnitrek);
    });

    if (pole_.length < max) {
      blok.appendChild(btn('+ ' + (sTap ? 'Dlaždice' : 'Řádek'), '', function () {
        pole_.push({ entity: '', name: '' });
        self._emit(true);
      }));
    }
    return blok;
  }

  /* ---------- záložka Panely ---------- */

  _tabPanely(wrap) {
    var self = this;
    var pans = this._config.panels || (this._config.panels = []);
    wrap.appendChild(e('p', 'hint', 'Panel je řada dlaždic dole — světla, zásuvky, dveře. '
      + 'Klepnutí přepne světlo nebo zásuvku, dlouhý stisk otevře okno Home Assistanta.'));

    pans.forEach(function (p, i) {
      var blok = e('div', 'block');
      var head = e('div', 'bhead');
      head.appendChild(e('b', '', p.name || ('Panel ' + (i + 1))));
      head.appendChild(e('span', 'sub', (p.items || []).length + ' dlaždic'));
      var n = e('div', 'nastroje');
      n.appendChild(ikona('▲', function () { presun(pans, i, -1); self._emit(true); }));
      n.appendChild(ikona('▼', function () { presun(pans, i, 1); self._emit(true); }));
      n.appendChild(ikona('✕', function () { pans.splice(i, 1); self._emit(true); }, 'smazat'));
      head.appendChild(n);
      blok.appendChild(head);

      var b = e('div', 'body');
      b.appendChild(radek([
        pole('Název', text(p.name || '', function (v) { p.name = v; self._emit(); })),
        pole('Barva', vyber(TONES, p.tone || 'cyan', function (v) { p.tone = v; self._emit(); }))
      ]));
      b.appendChild(self._seznam('Dlaždice', p, 'items', 8, true));
      blok.appendChild(b);
      wrap.appendChild(blok);
    });

    if (!pans.length) wrap.appendChild(e('div', 'prazdno', 'Zatím tu není žádný panel.'));
    if (pans.length < 4) {
      wrap.appendChild(btn('+ Panel', 'hlavni', function () {
        pans.push({ name: 'Panel ' + (pans.length + 1), tone: 'amber', items: [] });
        self._emit(true);
      }));
    }
  }

  /* ---------- záložka Celek ---------- */

  _tabCelek(wrap) {
    var self = this;
    var c = this._config;
    wrap.appendChild(e('p', 'hint', 'Prázdný název = v záhlaví zůstanou jen hodiny a stav. '
      + 'Rozložení nech na automatiku, dokud nechceš něco jiného.'));

    wrap.appendChild(radek([
      pole('Název', text(c.title || '', function (v) { c.title = v; self._emit(); })),
      pole('Podtitulek', text(c.subtitle || '', function (v) { c.subtitle = v; self._emit(); }))
    ]));
    wrap.appendChild(radek([
      poleSiroke('Počasí vedle hodin', this._entita(c.weather || '', function (v) {
        c.weather = v; self._emit();
      }, 'weather'))
    ]));

    var prep = e('label', 'prep');
    var ch = document.createElement('input');
    ch.type = 'checkbox';
    ch.checked = c.clock !== false;
    ch.addEventListener('change', function () { c.clock = ch.checked ? undefined : false; self._emit(); });
    prep.appendChild(ch);
    prep.appendChild(e('span', '', 'Ukazovat hodiny'));
    wrap.appendChild(prep);

    var auto = [{ value: '', label: 'Automaticky' }];
    wrap.appendChild(radek([
      pole('Sekcí na řádek', vyber(auto.concat(cisla(1, 4)), c.columns || '', function (v) {
        c.columns = v ? parseInt(v, 10) : undefined; self._emit();
      })),
      pole('Počet řad', vyber(auto.concat(cisla(1, 3)), c.rows || '', function (v) {
        c.rows = v ? parseInt(v, 10) : undefined; self._emit();
      })),
      pole('Panelů na řádek', vyber(auto.concat(cisla(1, 4)), c.panel_columns || '', function (v) {
        c.panel_columns = v ? parseInt(v, 10) : undefined; self._emit();
      }))
    ]));
  }

  /* ---------- výběr entity ---------- */

  /**
   * Home Assistant má vlastní výběr entit s hledáním - když je po ruce,
   * použije se on. Když ne (starší verze, jiný dashboard), postaví se
   * vlastní: pole s našeptávačem nad seznamem entit z `hass`.
   */
  _entita(hodnota, zmena, domena) {
    var self = this;
    if (customElements.get('ha-entity-picker')) {
      var p = document.createElement('ha-entity-picker');
      p.hass = this._hass;
      p.value = hodnota || '';
      p.allowCustomEntity = true;
      if (domena) p.includeDomains = [domena];
      p.addEventListener('value-changed', function (ev) {
        zmena((ev.detail && ev.detail.value) || '');
      });
      return p;
    }

    var box = e('div', 'pick');
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = hodnota || '';
    inp.placeholder = domena ? domena + '.…' : 'sensor.…';
    var menu = e('div', 'nabidka');
    box.appendChild(inp);
    box.appendChild(menu);

    function seznam(filtr) {
      menu.innerHTML = '';
      var states = (self._hass && self._hass.states) || {};
      var f = String(filtr || '').toLowerCase();
      var n = 0;
      for (var id in states) {
        if (domena && id.indexOf(domena + '.') !== 0) continue;
        var jm = ((states[id].attributes || {}).friendly_name || '').toLowerCase();
        if (f && id.toLowerCase().indexOf(f) < 0 && jm.indexOf(f) < 0) continue;
        var r = e('div', 'radek' + (id === inp.value ? ' vybrany' : ''));
        r.appendChild(e('b', '', (states[id].attributes || {}).friendly_name || id));
        r.appendChild(e('i', '', id));
        (function (eid) {
          r.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            inp.value = eid;
            box.classList.remove('otevreno');
            zmena(eid);
          });
        })(id);
        menu.appendChild(r);
        if (++n >= 60) break;
      }
      if (!n) menu.appendChild(e('div', 'prazdno', 'Nic takového v Home Assistantu není.'));
    }

    inp.addEventListener('focus', function () { seznam(''); box.classList.add('otevreno'); });
    inp.addEventListener('input', function () { seznam(inp.value); box.classList.add('otevreno'); zmena(inp.value); });
    inp.addEventListener('blur', function () {
      setTimeout(function () { box.classList.remove('otevreno'); }, 120);
    });
    return box;
  }
}

/* ================= drobní pomocníci ================= */

function e(tag, cls, text) {
  var x = document.createElement(tag);
  if (cls) x.className = cls;
  if (text !== undefined && text !== null) x.textContent = text;
  return x;
}

function btn(label, cls, fn) {
  var b = e('button', cls || '', label);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}

function ikona(znak, fn, cls) {
  return btn(znak, 'ikona ' + (cls || ''), fn);
}

function radek(prvky) {
  var r = e('div', 'row');
  prvky.forEach(function (p) { if (p) r.appendChild(p); });
  return r;
}

function pole(label, prvek, siroke) {
  var f = e('div', 'f' + (siroke ? ' wide' : ''));
  f.appendChild(e('label', '', label));
  f.appendChild(prvek);
  return f;
}

function poleSiroke(label, prvek) { return pole(label, prvek, true); }

function poleTlacitko(b) {
  var f = e('div', 'f');
  f.style.flex = '0 0 auto';
  f.appendChild(e('label', '', ' '));
  f.appendChild(b);
  return f;
}

function text(hodnota, zmena) {
  var i = document.createElement('input');
  i.type = 'text';
  i.value = hodnota;
  i.addEventListener('input', function () { zmena(i.value); });
  return i;
}

function cislo(hodnota, zmena) {
  var i = document.createElement('input');
  i.type = 'number';
  i.value = (hodnota === undefined || hodnota === null || hodnota === '') ? '' : hodnota;
  i.addEventListener('input', function () {
    zmena(i.value === '' ? undefined : parseFloat(i.value));
  });
  return i;
}

function vyber(moznosti, hodnota, zmena) {
  var s = document.createElement('select');
  moznosti.forEach(function (o) {
    var op = document.createElement('option');
    op.value = o.value;
    op.textContent = o.label;
    if (String(o.value) === String(hodnota)) op.selected = true;
    s.appendChild(op);
  });
  s.addEventListener('change', function () { zmena(s.value); });
  return s;
}

function cisla(od, do_) {
  var out = [];
  for (var i = od; i <= do_; i++) out.push({ value: i, label: String(i) });
  return out;
}

function presun(pole_, i, smer) {
  var j = i + smer;
  if (j < 0 || j >= pole_.length) return;
  var t = pole_[i];
  pole_[i] = pole_[j];
  pole_[j] = t;
}

function popisZobrazeni(view) {
  for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].value === (view || 'gauge')) return VIEWS[i].label;
  return view;
}

/**
 * Karta z rozvržení -> řádek konfigurace karty (YAML). Do YAML jde jen
 * to, co se doopravdy nastavilo: co si karta stejně doplní podle druhu
 * čidla (rozsah 0-100, hodina křivky, obnovování kamery), se vynechá -
 * jinak by po jednom kliknutí vznikla stránka zbytečných řádků.
 */
function sekceZKarty(c) {
  var d = c.dial || {};
  var view = c.view && c.view !== 'gauge' ? c.view : undefined;
  var s = { name: c.name, code: c.code, tone: c.tone, entity: d.entity };
  if (view) s.view = view;
  if (view === 'graph' && c.hours && c.hours !== 6) s.hours = c.hours;
  if (view === 'camera' && c.refresh && c.refresh !== 10) s.refresh = c.refresh;
  if (d.caption) s.caption = d.caption;
  if (d.unit) s.unit = d.unit;
  if (d.attribute) s.attribute = d.attribute;
  if (d.decimals) s.decimals = d.decimals;
  if (d.min !== 0 || d.max !== 100) { s.min = d.min; s.max = d.max; }
  if (d.levels && d.levels.length) s.levels = d.levels;
  if (c.meters && c.meters.length) s.meters = c.meters.map(polozkaZPolozky);
  if (c.tiles && c.tiles.length) s.tiles = c.tiles.map(polozkaZPolozky);
  return s;
}

function polozkaZPolozky(it) {
  var o = { entity: it.entity, name: it.name };
  if (it.view && it.view !== 'value') o.view = it.view;
  if (it.tap && it.tap !== 'auto') o.tap = it.tap;
  if (it.view === 'bar' && (it.min !== 0 || it.max !== 100)) { o.min = it.min; o.max = it.max; }
  if (it.view === 'graph' && it.hours && it.hours !== 6) o.hours = it.hours;
  if (it.view === 'camera' && it.refresh && it.refresh !== 10) o.refresh = it.refresh;
  if (it.unit) o.unit = it.unit;
  if (it.attribute) o.attribute = it.attribute;
  if (it.decimals) o.decimals = it.decimals;
  if (it.levels && it.levels.length) o.levels = it.levels;
  return o;
}

function panelZPanelu(p) {
  return { name: p.name, tone: p.tone, items: (p.items || []).map(polozkaZPolozky) };
}

/**
 * Do YAML se nepíše nic prázdného - jinak by konfigurace po pár kliknutích
 * vypadala jako smetiště. Nuly a `false` ale význam mají, ty zůstávají.
 */
function uklid(o) {
  if (Array.isArray(o)) return o.map(uklid);
  if (!o || typeof o !== 'object') return o;
  var out = {};
  Object.keys(o).forEach(function (k) {
    var v = uklid(o[k]);
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && !v.length && k !== 'sections' && k !== 'panels' && k !== 'items') return;
    out[k] = v;
  });
  return out;
}

if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, HaPanelCardEditor);
}

/**
 * Prvky Home Assistanta (ha-entity-picker...) se do stránky načtou až
 * s první kartou, která je potřebuje. Tímhle se o to řekne dřív, aby
 * editor nabídl rovnou hezký výběr entit a ne vlastní náhradu.
 */
function nactiPrvkyHA() {
  if (!window.loadCardHelpers) return Promise.resolve();
  return window.loadCardHelpers().then(function (h) {
    if (!h || !h.createCardElement) return null;
    var c = h.createCardElement({ type: 'entities', entities: [] });
    return c && c.constructor && c.constructor.getConfigElement
      ? c.constructor.getConfigElement() : null;
  }).catch(function () { return null; });
}

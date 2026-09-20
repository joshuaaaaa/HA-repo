/* ------------------------------------------------------------------
   Karta pro Lovelace: stejné budíky jako v aplikaci, ale uvnitř
   dashboardu Home Assistantu.

   Karta nic nestahuje - hodnoty bere z objektu `hass`, který jí Lovelace
   podává, takže funguje i v prohlížeči na počítači a v mobilní aplikaci
   Home Assistanta.

   Celý panel má pevný návrhový prostor (2400 px na šířku, 1400 px v úzkém
   sloupci) a jen se zmenší na šířku karty. Proto vypadá stejně na tabletu
   i na telefonu a čísla si drží poměry.
   ------------------------------------------------------------------ */

var CARD_TYPE = 'ha-panel-card';

/** Konfigurace karty (YAML) -> vnitřní rozvržení panelu. */
function cardLayout(config) {
  if (config && config.layout) {
    // Rozvržení vyexportované z aplikace se dá vložit rovnou.
    return Layout.normalize(config.layout);
  }
  var page = {
    name: config.title || 'Panel',
    // columns/rows: kolik sekci na radek a kolik rad. Bez nich se
    // rozvrzeni poradi samo podle poctu sekci.
    grid: { cols: config.columns || 0, rows: config.rows || 0 },
    panelGrid: { cols: config.panel_columns || 0 },
    cards: [], panels: []
  };
  var out = {
    title: config.title || '',
    subtitle: config.subtitle || '',
    weather: config.weather || '',
    pages: [page], ambient: {}, alert: config.alert || null
  };
  (config.sections || config.cards || []).forEach(function (s) {
    page.cards.push({
      id: s.id, name: s.name, code: s.code, tone: s.tone,
      // view: gauge (vychozi) | bar | graph | number | camera
      view: s.view, hours: s.hours, refresh: s.refresh,
      dial: {
        entity: s.entity, caption: s.caption, unit: s.unit, attribute: s.attribute,
        decimals: s.decimals, min: s.min, max: s.max, levels: s.levels
      },
      meters: s.meters, tiles: s.tiles
    });
  });
  (config.panels || []).forEach(function (p) { page.panels.push(p); });
  return Layout.normalize(out);
}

/**
 * Co uživatel v konfiguraci nevyplnil, doplní se podle druhu čidla -
 * rozsah budíku, stupně i popisek. Bez toho by karta s jedinou řádkou
 * `entity:` ukazovala budík od 0 do 100 a bez jediného slova.
 */
function fillFromHass(layout, states) {
  Layout.allCards(layout).forEach(function (c) {
    if (!c.dial.entity) return;
    if (c.view === 'camera') return;
    var st = states[c.dial.entity];
    if (!st) return;
    // Rozsah budíku nikdo nezadal - vezmi rozumný podle druhu čidla.
    if (c.dial.min === 0 && c.dial.max === 100) {
      var s = U.suggest(st);
      if (s.min !== 0 || s.max !== 100) { c.dial.min = s.min; c.dial.max = s.max; }
      if (!c.dial.levels.length) c.dial.levels = s.levels;
      if (!c.dial.caption) c.dial.caption = s.caption;
    }
    (c.meters || []).forEach(function (m) {
      if (!m.entity || m.levels.length) return;
      var mst = states[m.entity];
      if (!mst) return;
      var ms = U.suggest(mst);
      if (m.min === 0 && m.max === 100 && (ms.min !== 0 || ms.max !== 100)) {
        m.min = ms.min; m.max = ms.max;
      }
      m.levels = ms.levels;
    });
  });
  return layout;
}

class HaPanelCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._view = null;
    this._hass = null;
    this._timer = null;
    this._ro = null;
    this._history = null;
    this._feeds = null;
    this._unsub = {};
    this._subSeq = 0;
  }

  /* ---------- Lovelace rozhraní ---------- */

  setConfig(config) {
    if (!config) throw new Error('Karta nemá konfiguraci.');
    if (!config.sections && !config.panels && !config.cards && !config.layout) {
      throw new Error('Doplň aspoň jednu sekci (sections) nebo panel (panels).');
    }
    this._config = config;
    this._layout = cardLayout(config);
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._view) return;
    if (!this._filled) {
      fillFromHass(this._layout, hass.states);
      this._filled = true;
      this._build();
      return;
    }
    this._view.refresh(hass.states);
    this._pushHistory();
    this._fit();
  }

  getCardSize() {
    var rows = 1;
    if (!this._layout) return rows;
    Layout.allCards(this._layout).forEach(function () { rows += 6; });
    Layout.allPanels(this._layout).forEach(function () { rows += 3; });
    return rows;
  }

  static getStubConfig(hass) {
    var pick = function (dc) {
      for (var id in hass.states) {
        var a = hass.states[id].attributes || {};
        if (a.device_class === dc && !isNaN(parseFloat(hass.states[id].state))) return id;
      }
      return '';
    };
    var teplota = pick('temperature');
    var stub = { type: 'custom:' + CARD_TYPE, title: '', sections: [], panels: [] };
    if (teplota) {
      stub.sections.push({ name: 'TEPLOTA', code: 'T1', tone: 'cyan', entity: teplota });
    }
    return stub;
  }

  /* ---------- stavba ---------- */

  _build() {
    var self = this;
    if (this._view && this._view.destroy) this._view.destroy();
    var sr = this.shadowRoot;
    sr.innerHTML = '<style>' + CARD_CSS + '</style>'
      + '<div class="panel-root mode-live">'
      + '<div class="bg"></div><div class="scan"></div>'
      + '<div id="stage"></div></div>';

    this._root = sr.querySelector('.panel-root');
    this._stage = sr.querySelector('#stage');

    this._view = Render.build(this._layout, this._stage, {
      root: this._root,
      noCog: true,
      noAmbient: true,
      tapAll: true,
      onTap: function (entityId, item) { self._tap(entityId, item); },
      // Dlouhy stisk (a dlazdice nastavena na "Okno s ovladanim") otevre
      // vlastni okno Home Assistanta - v dashboardu je doma a umi vic
      // nez cokoli, co by karta nakreslila sama.
      onDetail: function (entityId) { self._moreInfo(entityId); },
      onTodo: function (entity, row) {
        if (!self._hass) return;
        self._hass.callService('todo', 'update_item',
          { entity_id: entity, item: row.uid || row.name, status: 'completed' });
      },
      // Kamera: obrazek z Home Assistanta je na stejnem puvodu jako
      // dashboard, takze staci adresa z entity_picture.
      states: function (id) { return self._hass ? self._hass.states[id] : null; }
    });

    // Odznak spojení v aplikaci hlásí WebSocket; v Lovelace je spojení
    // věcí Home Assistanta, takže tu odznak jen říká, odkud data jsou.
    if (this._view.badge) {
      this._view.badge.className = 'badge';
      this._view.badge.lastChild.textContent = 'Home Assistant';
    }
    if (this._config.clock === false && this._view.clock.t) {
      this._view.clock.t.parentNode.style.display = 'none';
    }

    this._tick();
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(function () { self._tick(); }, 1000);

    if (this._hass) this._view.refresh(this._hass.states);
    this._startHistory();
    this._startFeeds();
    this._fit();

    if (!this._ro && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self._fit(); });
      this._ro.observe(this);
    }
  }

  _tick() {
    if (!this._view || !this._view.clock.t) return;
    var d = new Date();
    this._view.clock.t.textContent = U.clockTime(d, true);
    this._view.clock.d.textContent = U.clockDate(d);
  }

  /**
   * Panel se vykreslí v pevném prostoru a celý se zmenší na šířku karty.
   * V úzkém sloupci se přepne na svislé rozvržení, stejně jako aplikace
   * na tabletu otočeném na výšku.
   */
  _fit() {
    if (!this._stage) return;
    var width = this.clientWidth || this.offsetWidth;
    if (!width) return;
    var narrow = width < 700;
    this._root.classList.toggle('is-portrait', narrow);
    var design = narrow ? 1400 : 2400;
    this._stage.style.width = design + 'px';
    var scale = width / design;
    this._stage.style.transform = 'scale(' + scale + ')';
    // Písma uvnitř oken se řídí tím, jak velká okna doopravdy jsou.
    if (this._view && this._view.scale) this._view.scale();
    // Výška se měří až po vykreslení - panel je tak vysoký, kolik potřebuje.
    var h = this._stage.scrollHeight || (narrow ? 2000 : 1080);
    this._root.style.height = Math.round(h * scale) + 'px';
  }

  /* ---------- krivky ----------
     Prubeh hodnot si karta vyzada pres hass.callWS - stejnym prikazem,
     jakym ho cte historie v Home Assistantu. */
  /* Predpoved, kalendar a ukoly - v karte pres spojeni, ktere uz
     Home Assistant ma otevrene. */
  _startFeeds() {
    var self = this;
    var want = Layout.feeds(this._layout);
    if (!want.length) {
      if (this._feeds) { this._feeds.stop(); this._feeds = null; }
      return;
    }
    if (!this._feeds) {
      this._feeds = new Feeds.Store({
        subscribe: function (msg, cb) {
          if (!self._hass || !self._hass.connection) return -1;
          var key = ++self._subSeq;
          self._hass.connection.subscribeMessage(cb, msg).then(function (off) {
            self._unsub[key] = off;
          }, function () {});
          return key;
        },
        unsubscribe: function (key) {
          var off = self._unsub[key];
          if (off) { try { off(); } catch (e) {} delete self._unsub[key]; }
        },
        events: function (entity, days) {
          if (!self._hass) return Promise.reject(new Error('bez hass'));
          var d = new Date();
          function p(n) { return n < 10 ? '0' + n : '' + n; }
          var start = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
            + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00';
          return self._hass.callWS({
            type: 'call_service', domain: 'calendar', service: 'get_events',
            service_data: { start_date_time: start, duration: { days: days } },
            target: { entity_id: entity }, return_response: true
          }).then(function (r) { return r && r.response ? r.response : null; });
        }
      });
      this._feeds.onData = function (kind, entity, data) {
        if (self._view) self._view.setFeed(kind, entity, data);
      };
    }
    this._feeds.set(want);
  }

  _startHistory() {
    var self = this;
    var want = Layout.graphed(this._layout);
    if (!want.length) {
      if (this._history) { this._history.stop(); this._history = null; }
      return;
    }
    if (!this._history) {
      this._history = new History.Store(function (msg) {
        return self._hass ? self._hass.callWS(msg) : Promise.reject(new Error('bez hass'));
      });
      this._history.onData = function (entity, series) {
        if (self._view) self._view.setHistory(entity, series);
      };
    }
    this._history.set(want);
    this._history.start();
  }

  /** Kazda nova hodnota posune krivku, nez prijde dalsi cele nacteni. */
  _pushHistory() {
    if (!this._history || !this._hass) return;
    var self = this;
    Layout.graphed(this._layout).forEach(function (w) {
      var st = self._hass.states[w.entity];
      if (!st) return;
      if (self._history.push(w.entity, st.state, Date.parse(st.last_updated || st.last_changed))) {
        self._view.setHistory(w.entity, self._history.get(w.entity));
      }
    });
  }

  _tap(entityId, item) {
    if (!this._hass || !entityId) return;
    if (item && item.tap === 'detail') { this._moreInfo(entityId); return; }
    var st = this._hass.states[entityId];
    var svc = U.tapService(entityId, st ? st.state : '');
    if (!svc) { this._moreInfo(entityId); return; }
    this._hass.callService(svc.domain, svc.service, { entity_id: entityId });
  }

  /** Podrobnosti o entitě - stejné okno, jaké otevírají ostatní karty. */
  _moreInfo(entityId) {
    var ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId: entityId };
    this.dispatchEvent(ev);
  }

  disconnectedCallback() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._history) this._history.stop();
    if (this._feeds) this._feeds.stop();
    if (this._view && this._view.destroy) this._view.destroy();
  }

  connectedCallback() {
    var self = this;
    if (this._view && !this._timer) {
      this._timer = setInterval(function () { self._tick(); }, 1000);
    }
    if (this._view && !this._ro && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self._fit(); });
      this._ro.observe(this);
    }
    if (this._history) this._history.start();
    this._fit();
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, HaPanelCard);
}

/* Aby se karta nabídla i ve vizuálním výběru karet. */
window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: 'HA Panel',
  description: 'Velké budíky a dlaždice pro tablet na zdi - stejný vzhled jako aplikace HA Panel.',
  preview: false,
  documentationURL: 'https://github.com/joshuaaaaa/HA-repo'
});

console.info('%c HA-PANEL-CARD %c ' + CARD_VERSION + ' ', 'background:#36d8ff;color:#04121a', 'background:#08131d;color:#cfe4f2');

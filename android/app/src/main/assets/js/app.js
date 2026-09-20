/* ------------------------------------------------------------------
   Slepeni celku: nacte nastaveni, spoji se s Home Assistantem, postavi
   panel a hlida, jestli pred tabletem nekdo je.

   Rezimy obrazovky (trida na <body>):
     mode-live     - normalni panel
     mode-ambient  - klidovy rezim (hodiny a dve hodnoty)
     mode-down     - spojeni s Home Assistantem je pryc
     mode-setup    - jeste neni co ukazovat
     oled-off      - uplna tma, nez displej zhasne uplne
   ------------------------------------------------------------------ */
'use strict';

(function () {

  var cfg = { baseUrl: '', token: '', source: 'ha', layout: '', native: false };
  var layout = Layout.empty();
  var view = null;          // vysledek Render.build
  var conn = null;
  var history = null;       // prubeh hodnot pro krivky
  var feeds = null;         // predpoved, kalendar, ukoly
  var demo = false;

  /* ================= nastaveni ================= */

  function loadConfig() {
    // V tabletu prijde nastaveni z aplikace, v prohlizeci (pri ladeni)
    // z localStorage - jinak by se panel nedal vyzkouset na pocitaci.
    if (window.Panel && Panel.config) {
      try { cfg = JSON.parse(Panel.config()); } catch (e) {}
    } else {
      try {
        cfg = JSON.parse(localStorage.getItem('panelCfg') || '{}');
      } catch (e) { cfg = {}; }
    }
    cfg.baseUrl = cfg.baseUrl || '';
    cfg.token = cfg.token || '';
    try {
      layout = Layout.normalize(cfg.layout ? JSON.parse(cfg.layout) : {});
    } catch (e) {
      layout = Layout.empty();
    }
  }

  function saveLayout(next) {
    layout = Layout.normalize(next);
    var json = JSON.stringify(layout);
    if (window.Panel && Panel.saveLayout) Panel.saveLayout(json);
    else {
      cfg.layout = json;
      try { localStorage.setItem('panelCfg', JSON.stringify(cfg)); } catch (e) {}
    }
    rebuild();
    toast('Panel uložen.');
  }

  /* ================= plocha ================= */

  var driftX = 0, driftY = 0;

  /**
   * Plocha panelu se prizpusobi tvaru displeje.
   *
   * Drive mela pevny pomer 2400 x 1080, takze na tabletu 16:10 zbyl
   * nahore i dole cerny pruh. Ted se dopocita druhy rozmer z pomeru
   * stran displeje, takze panel vyplni celou plochu a sekce dostanou
   * vsechno misto, ktere tablet ma.
   */
  function fit() {
    var vv = window.visualViewport;
    var probe = document.getElementById('vhProbe');
    var measured = probe ? probe.getBoundingClientRect().height : 0;
    var vh = measured > 40 ? measured : (vv ? vv.height : innerHeight);
    var vw = vv ? vv.width : innerWidth;
    if (!vw || !vh) return;

    var size = stageSize(vw, vh);
    document.body.classList.toggle('is-portrait', size.portrait);

    var st = document.getElementById('stage');
    st.style.width = size.w + 'px';
    st.style.height = size.h + 'px';
    var s = Math.min(vw / size.w, vh / size.h);
    st.style.transform = 'scale(' + s + ')';
    st.style.left = ((vw - size.w * s) / 2 + driftX) + 'px';
    st.style.top = ((vh - size.h * s) / 2 + driftY) + 'px';

    // Okna maji jinou velikost - srovnat pisma uvnitr nich.
    if (view && view.scale) view.scale();
  }

  /** Navrhovy prostor: sirka je dana, druhy rozmer kopiruje displej. */
  function stageSize(vw, vh) {
    var portrait = vh > vw * 1.05;
    if (portrait) {
      var h = 2000;
      return { w: clamp(Math.round(h * vw / vh), 1000, 1700), h: h, portrait: true };
    }
    var w = 2400;
    return { w: w, h: clamp(Math.round(w * vh / vw), 1000, 2100), h2: 0, portrait: false };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* Displej sviti cele dny se statickym obrazem, takze se cely panel
     kazdou minutu nenapadne posune o par pixelu - jinak by se do OLED
     vypalila cisla. Posun je plynuly pres osm vterin, oko ho nechyti. */
  function startDrift() {
    setInterval(function () {
      var st = document.getElementById('stage');
      st.style.transition = 'left 8s linear, top 8s linear';
      driftX = Math.round((Math.random() * 2 - 1) * 5);
      driftY = Math.round((Math.random() * 2 - 1) * 5);
      fit();
      setTimeout(function () { st.style.transition = ''; }, 8300);
    }, 60000);
  }

  /* ================= start ================= */

  var BOOT = ['Načítám nastavení…', 'Spojuji se s Home Assistantem…', 'Čtu stavy entit…', 'Panel připraven'];

  function playBoot() {
    var box = document.getElementById('boot');
    var fill = box.querySelector('.bl i');
    var marks = box.querySelectorAll('.boot-steps i');
    var txt = document.getElementById('bootTxt');
    var i = 0;
    function step() {
      txt.textContent = BOOT[i];
      fill.style.width = ((i + 1) / BOOT.length * 100) + '%';
      for (var m = 0; m < marks.length; m++) marks[m].classList.toggle('active', m <= i);
      if (++i >= BOOT.length) clearInterval(t);
    }
    step();
    var t = setInterval(step, 430);
    setTimeout(function () { box.classList.add('done'); }, 2050);
  }

  /* ================= rezimy ================= */

  function setMode(m) {
    var b = document.body;
    if (b.classList.contains('mode-' + m)) return;
    b.classList.remove('mode-live', 'mode-ambient', 'mode-down', 'mode-setup');
    b.classList.add('mode-' + m);
    if (m === 'ambient') startOrganism();
  }

  function shockwave() {
    var el = document.getElementById('pulse');
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }

  var toastTimer = null;
  window.panelToast = function (msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };
  function toast(m) { window.panelToast(m); }

  /* ================= pritomnost =================
     V tabletu rozhoduje aplikace (dotyk, cidlo priblizeni, kamera) a
     zavola window.panelPresence(). V prohlizeci si stranka hlida cas
     sama, aby sel klidovy rezim vyzkouset i na pocitaci. */

  var lastTouch = Date.now();

  window.panelPresence = function (phase) {
    if (Editor.isOpen()) return;            // pri uprave panelu se nic neprepina
    if (phase !== 'active') { closeZoom(); if (Dialog.isOpen()) Dialog.close(); }
    if (phase === 'dim') {
      document.body.classList.add('oled-off');
      stopOrganism();
      return;
    }
    document.body.classList.remove('oled-off');
    if (phase === 'idle') {
      goPage(0);                            // po odchodu zpatky na prvni stranku
      setMode('ambient');
    } else {
      var wasAmbient = document.body.classList.contains('mode-ambient');
      setMode(conn && conn.status === 'ready' ? 'live' : (demo ? 'live' : currentFallbackMode()));
      if (wasAmbient) {
        shockwave();
        var nodes = document.querySelectorAll('.anim');
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].style.animation = 'none';
          void nodes[i].offsetWidth;
          nodes[i].style.animation = '';
        }
      }
    }
  };

  function currentFallbackMode() {
    if (!cfg.baseUrl || !cfg.token) return 'setup';
    if (conn && (conn.status === 'down' || conn.status === 'badtoken')) return 'down';
    return 'live';
  }

  function browserPresence() {
    if (window.Panel && Panel.isNativeApp) return;   // v tabletu to resi aplikace
    ['touchstart', 'mousedown', 'mousemove', 'keydown'].forEach(function (ev) {
      addEventListener(ev, function () {
        lastTouch = Date.now();
        if (document.body.classList.contains('mode-ambient')) window.panelPresence('active');
      }, { passive: true });
    });
    setInterval(function () {
      if (Date.now() - lastTouch > 120000) window.panelPresence('idle');
    }, 5000);
  }

  /* ================= klidova kresba =================
     Dve pomalu se otacejici pole. Nic to nemeri, jen to dava klidove
     obrazovce hloubku - a hlavne se to porad hybe, takze na displeji
     nestoji zadny staticky tvar. */

  var cvs, ctx, rafId = null, bornAt = 0, spin = [0, 0];

  function sizeCanvas() {
    if (!cvs) return;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var w = innerWidth, h = innerHeight;
    if (cvs.width !== Math.round(w * dpr)) cvs.width = Math.round(w * dpr);
    if (cvs.height !== Math.round(h * dpr)) cvs.height = Math.round(h * dpr);
    cvs.style.width = w + 'px';
    cvs.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startOrganism() {
    if (rafId || !cvs) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sizeCanvas();
    bornAt = performance.now();
    rafId = requestAnimationFrame(draw);
  }

  function stopOrganism() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (ctx) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  function draw(ts) {
    if (!document.body.classList.contains('mode-ambient')
        || document.body.classList.contains('oled-off')) { rafId = null; return; }
    rafId = requestAnimationFrame(draw);

    var W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    var age = Math.min(1, (ts - bornAt) / 1800), t = ts / 1000;
    spin[0] += 0.0022; spin[1] -= 0.0017;

    var fields = [{ x: cx - W * 0.19, c: '54,216,255', s: spin[0] },
                  { x: cx + W * 0.19, c: '255,139,62', s: spin[1] }];
    for (var f = 0; f < fields.length; f++) {
      var fl = fields[f];
      var radius = Math.min(W * 0.26, H * 0.64) * (1 + Math.sin(t * 0.65 + f * 1.4) * 0.012);
      var glow = ctx.createRadialGradient(fl.x, cy, 0, fl.x, cy, radius);
      glow.addColorStop(0, 'rgba(' + fl.c + ',' + (0.10 * age) + ')');
      glow.addColorStop(1, 'rgba(' + fl.c + ',0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 4; i++) {
        var r = radius * (0.6 + i * 0.16);
        var phase = fl.s * (i % 2 ? -1 : 1) + i * 1.7;
        ctx.beginPath();
        ctx.ellipse(fl.x, cy, r, r * 0.82, -0.28, phase, phase + Math.PI * 1.2);
        ctx.strokeStyle = 'rgba(' + fl.c + ',' + ((0.12 + i * 0.025) * age) + ')';
        ctx.lineWidth = i === 0 ? 2 : 1;
        ctx.stroke();
      }
    }
  }

  /* ================= hodiny ================= */

  function tick() {
    var d = new Date();
    if (!view) return;
    view.clock.t.textContent = U.clockTime(d, true);
    view.clock.d.textContent = U.clockDate(d);
    if (view.clock.aTime) view.clock.aTime.textContent = U.clockTime(d, false);
    if (view.clock.aDate) view.clock.aDate.textContent = U.clockDate(d);
  }

  /* ================= spojeni ================= */

  function badge(text, cls) {
    if (!view) return;
    view.badge.className = 'badge' + (cls ? ' ' + cls : '');
    view.badge.lastChild.textContent = text;
  }

  /* Po prestavbe panelu je odznak novy - musi hned rict, jak na tom
     spojeni je, jinak by hlasil "Spojuji" i pri behu. */
  var BADGE = {
    ready: ['Živě', ''], loading: ['Načítám', 'warn'], connecting: ['Spojuji', 'warn'],
    reconnecting: ['Spojuji znovu', 'warn'], down: ['Bez spojení', 'bad'],
    badtoken: ['Token neplatí', 'bad'], unconfigured: ['Nenastaveno', 'warn'],
    closed: ['Odpojeno', 'warn'], idle: ['Spojuji', 'warn']
  };
  function syncBadge() {
    if (demo) { badge('Ukázka', 'warn'); return; }
    var b = BADGE[conn ? conn.status : 'unconfigured'] || BADGE.idle;
    badge(b[0], b[1]);
  }

  function connect() {
    if (conn) conn.close();
    if (!cfg.baseUrl || !cfg.token) { setMode('setup'); return; }

    conn = new HaConn({
      baseUrl: cfg.baseUrl,
      token: cfg.token,
      onStatus: function (status, detail) {
        if (status === 'ready') {
          badge('Živě', '');
          if (!document.body.classList.contains('mode-ambient')) setMode('live');
        } else if (status === 'badtoken') {
          badge('Token neplatí', 'bad');
          downOverlay('Token neplatí', 'Home Assistant odmítl přístupový token. '
            + 'Vytvoř nový v profilu a vlož ho v nastavení aplikace.', detail);
          setMode('down');
        } else if (status === 'down') {
          badge('Bez spojení', 'bad');
          downOverlay('Home Assistant neodpovídá',
            'Panel se zkouší spojit znovu. Data na obrazovce jsou poslední známá.', detail);
          if (!document.body.classList.contains('mode-ambient')) setMode('down');
        } else {
          badge(status === 'loading' ? 'Načítám' : 'Spojuji', 'warn');
        }
      },
      onStates: function (states) {
        applyControl(states, true);
        checkDoorbell(states, true);
        setupHistory();
        setupFeeds();
        if (Layout.isEmpty(layout)) {
          // Prvni spusteni: rovnou neco ukazat, at panel nezustane prazdny.
          layout = Layout.fromStates(states);
          if (!Layout.isEmpty(layout)) {
            var json = JSON.stringify(layout);
            if (window.Panel && Panel.saveLayout) Panel.saveLayout(json);
            rebuild();
          }
        }
        if (view) view.refresh(states);
      },
      onChange: function (entityId, st, states) {
        if (view) view.refreshOne(entityId, states);
        if (zoomView) zoomView.refreshOne(entityId, states);
        Dialog.update(entityId);
        // Krivka roste ze stejnych zmen, ktere uz stejne chodi -
        // server se kvuli ni nemusi ptat casteji.
        if (history && st && history.push(entityId, st.state)) {
          view.setHistory(entityId, history.get(entityId));
        }
        if (layout.control && (entityId === layout.control.screen
            || entityId === layout.control.brightness)) {
          applyControl(states, false);
        }
        if (layout.doorbell && entityId === layout.doorbell.trigger) {
          checkDoorbell(states, false);
        }
      }
    });
    conn.connect();
  }

  /* ---- prikazy z Home Assistantu ----
     Panel se chova jako zarizeni: prepinac rozhoduje o displeji, cislo o
     jasu. Prvni cteni po spojeni jas nastavi, ale displej nezhasina -
     jinak by tablet po restartu zhasnul drive, nez by ho kdo videl. */
  var lastScreen = null, lastBright = null;

  function applyControl(states, first) {
    if (!layout.control || !window.Panel) return;
    var sc = layout.control.screen && states[layout.control.screen];
    if (sc) {
      var on = sc.state === 'on';
      if (on !== lastScreen) {
        lastScreen = on;
        if (!(first && !on) && Panel.screen) Panel.screen(on ? 'on' : 'off');
      }
    }
    var br = layout.control.brightness && states[layout.control.brightness];
    if (br) {
      var v = Math.round(U.num(br.state));
      if (!isNaN(v) && v !== lastBright) {
        lastBright = v;
        if (Panel.setBrightness) Panel.setBrightness(Math.max(1, Math.min(100, v)));
      }
    }
  }

  /* ---- krivky ----
     Historii si rekne jen to, co ji opravdu kresli; zbytek panelu bezi
     dal ze zivych stavu. */
  /* ---- predpoved, kalendar, ukoly ---- */

  function setupFeeds() {
    if (!conn) return;
    if (!feeds) {
      feeds = new Feeds.Store({
        subscribe: function (msg, cb) { return conn.subscribe(msg, cb); },
        unsubscribe: function (id) { conn.unsubscribe(id); },
        events: function (entity, days) {
          var start = new Date();
          return conn.callWithResponse('calendar', 'get_events',
            { start_date_time: local(start), duration: { days: days } },
            { entity_id: entity });
        }
      });
      feeds.onData = function (kind, entity, data) {
        if (view) view.setFeed(kind, entity, data);
        if (zoomView) zoomView.setFeed(kind, entity, data);
      };
    }
    var want = Layout.feeds(layout);
    feeds.set(want);
    if (!want.length) feeds.stop();
  }

  /** Home Assistant chce mistni cas bez pasma: "2026-09-20 15:04:00". */
  function local(d) {
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /** Odskrtnuti ukolu ze seznamu. */
  function completeTodo(entity, row) {
    if (window.Panel && Panel.tap) Panel.tap();
    if (demo) { toast('Ukázka — nic se doopravdy neodškrtává.'); return; }
    if (!conn || conn.status !== 'ready') { toast('Bez spojení s Home Assistantem.'); return; }
    conn.callService('todo', 'update_item',
      { entity_id: entity, item: row.uid || row.name, status: 'completed' });
  }

  function setupHistory() {
    if (!conn) return;
    if (!history) {
      history = new History.Store(function (msg) { return conn.request(msg); });
      history.onData = function (entity, series) {
        if (view) view.setHistory(entity, series);
        if (zoomView) zoomView.setHistory(entity, series);
      };
    }
    var want = Layout.graphed(layout);
    history.set(want);
    if (want.length) history.start();
    else history.stop();
  }

  function downOverlay(title, text, note) {
    document.getElementById('downTitle').textContent = title;
    document.getElementById('downText').textContent = text;
    document.getElementById('downNote').textContent = note ? ('Důvod: ' + note) : '';
  }

  /* ================= panel ================= */

  var pageIndex = 0;

  function rebuild() {
    if (view && view.destroy) view.destroy();
    // Klidovy rezim bez vlastniho vyberu prevezme hodnoty ze sekci -
    // doplni se az pri kresleni, aby to editor neukazoval jako
    // nastavene entity.
    var shown = Layout.ambientFallback(JSON.parse(JSON.stringify(layout)));
    view = Render.build(shown, document.getElementById('stage'), {
      onTap: onTap,
      onDetail: openDetail,
      onZoom: openZoom,
      onCog: openEditor,
      onPage: goPage,
      onTodo: completeTodo,
      baseUrl: cfg.baseUrl,
      states: function (id) { return demo ? demoStates[id] : (conn ? conn.states[id] : null); }
    });
    goPage(pageIndex);
    tick();
    syncBadge();
    if (view.scale) view.scale();
    if (conn && conn.states) view.refresh(conn.states);
    if (demo) { view.refresh(demoStates); demoHistory(); }
    if (history) { setupHistory(); view.redraw(history); }
    if (feeds) {
      setupFeeds();
      // Co uz mame, hned vykreslit - odber prijde az pri dalsi zmene.
      Layout.feeds(layout).forEach(function (w) {
        var data = feeds.get(w.kind, w.entity);
        if (data) view.setFeed(w.kind, w.entity, data);
      });
    }
  }

  function onTap(entityId, item) {
    if (window.Panel && Panel.tap) Panel.tap();
    if (window.Panel && Panel.activity) Panel.activity();
    // Dlazdice nastavena na "Podrobnosti" otevre okno misto prepnuti.
    if (item && item.tap === 'detail') { openDetail(entityId); return; }
    if (demo) { toast('Ukázka — nic se doopravdy nepřepíná.'); return; }
    if (!conn || conn.status !== 'ready') { toast('Bez spojení s Home Assistantem.'); return; }
    var st = conn.states[entityId];
    var svc = U.tapService(entityId, st ? st.state : '');
    if (!svc) { openDetail(entityId); return; }
    conn.callService(svc.domain, svc.service, { entity_id: entityId });
  }

  /* ---- okno s ovladanim ---- */

  function openDetail(entityId) {
    if (window.Panel && Panel.tap) Panel.tap();
    if (window.Panel && Panel.activity) Panel.activity();
    Dialog.open(entityId, {
      baseUrl: cfg.baseUrl,
      states: function (id) { return demo ? demoStates[id] : (conn ? conn.states[id] : null); },
      history: function (id) { return history ? history.get(id) : null; },
      call: function (domain, service, data) {
        if (demo) { toast('Ukázka — nic se doopravdy nepřepíná.'); return; }
        if (!conn || conn.status !== 'ready') { toast('Bez spojení s Home Assistantem.'); return; }
        conn.callService(domain, service, data);
      }
    });
  }

  /* ---- stranky ----
     Prejeti prstem prepne stranku. Kratke tahnuti se ignoruje, aby se
     nepletlo s klepnutim na dlazdici, a svisly pohyb take - ten patri
     rolovani v editoru. */

  function goPage(i) {
    if (!view || !view.showPage) return;
    pageIndex = view.showPage(i);
  }

  function initSwipe() {
    var stage = document.getElementById('stage');
    var sx = 0, sy = 0, active = false, swiped = false;

    // Prejeti konci klepnutim na tom, pres co prst prejel. Bez tohoto
    // by prejeti pres sekci zaroven otevrelo jeji zvetseni.
    stage.addEventListener('click', function (e) {
      if (!swiped) return;
      swiped = false;
      e.stopPropagation();
      e.preventDefault();
    }, true);

    function begin(x, y) { sx = x; sy = y; active = true; }
    function finish(x, y) {
      if (!active) return;
      active = false;
      if (!view || view.pages < 2) return;
      if (Dialog.isOpen() || Editor.isOpen() || document.body.classList.contains('zooming')) return;
      var dx = x - sx, dy = y - sy;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      swiped = true;
      setTimeout(function () { swiped = false; }, 400);
      goPage(pageIndex + (dx < 0 ? 1 : -1));
      if (window.Panel && Panel.tap) Panel.tap();
    }

    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { active = false; return; }
      begin(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      if (t) finish(t.clientX, t.clientY);
    }, { passive: true });
    stage.addEventListener('touchcancel', function () { active = false; }, { passive: true });
    // Mysi jen kvuli zkouseni na pocitaci.
    stage.addEventListener('mousedown', function (e) { begin(e.clientX, e.clientY); });
    stage.addEventListener('mouseup', function (e) { finish(e.clientX, e.clientY); });
  }

  /* ---- zvonek u dveri ----
     Kdyz cidlo naskoci, panel se probudi a ukaze kameru pres celou
     obrazovku. Po nastavene dobe se sam vrati. */

  var doorbellOn = false, doorbellTimer = null;

  function checkDoorbell(states, first) {
    if (!layout.doorbell || !states) return;
    var st = states[layout.doorbell.trigger];
    var on = st && (st.state === 'on' || st.state === 'ringing' || st.state === 'pressed');
    if (on && !doorbellOn) {
      doorbellOn = true;
      if (!first) showDoorbell();
    } else if (!on) {
      doorbellOn = false;
    }
  }

  function showDoorbell() {
    var db = layout.doorbell;
    if (!db) return;
    if (window.Panel && Panel.screen) Panel.screen('on');   // probudit displej
    window.panelPresence('active');
    var card = Layout.normalize({ pages: [{ cards: [{
      name: db.name || 'Zvonek', code: '', tone: 'red', view: 'camera', refresh: 3,
      dial: { entity: db.camera }
    }] }] }).pages[0].cards[0];
    openZoom(card, null);
    toast(db.name || 'Zvonek u dveří');
    clearTimeout(doorbellTimer);
    doorbellTimer = setTimeout(function () { closeZoom(); }, (db.seconds || 30) * 1000);
  }

  /* ---- zvetsena sekce ----
     Okno se "rozbali" z mista, kde sekce stoji: nejdriv se posadi
     presne na ni, pak se pusti prechod na celou plochu. Diky tomu je
     videt, co se odkud zvetsilo. */

  var zoomView = null;

  function openZoom(card, sourceEl) {
    if (Dialog.isOpen() || Editor.isOpen()) return;
    if (window.Panel && Panel.activity) Panel.activity();
    var host = document.getElementById('zoomBody');
    var box = document.getElementById('zoom');
    if (!host || !box) return;

    closeZoom(true);
    var only = Layout.normalize({ pages: [{ cards: [card], panels: [] }] });
    zoomView = Render.build(only, host, {
      onTap: onTap,
      onDetail: openDetail,
      zoomed: true,
      noAmbient: true,
      baseUrl: cfg.baseUrl,
      states: function (id) { return demo ? demoStates[id] : (conn ? conn.states[id] : null); }
    });
    if (conn && conn.states) zoomView.refresh(conn.states);
    if (demo) zoomView.refresh(demoStates);
    if (history) zoomView.redraw(history);
    if (feeds) {
      zoomView.feeds.forEach(function (f) {
        var data = feeds.get(f.kind, f.entity);
        if (data) zoomView.setFeed(f.kind, f.entity, data);
      });
    }

    var to = box.getBoundingClientRect();
    // Bez zdrojoveho prvku (napr. zvonek) se okno jen vynori ze stredu.
    var from = sourceEl ? sourceEl.getBoundingClientRect()
      : { left: to.left + to.width * 0.1, top: to.top + to.height * 0.1,
          width: to.width * 0.8, height: to.height * 0.8 };
    var sx = from.width / to.width, sy = from.height / to.height;
    var dx = from.left + from.width / 2 - (to.left + to.width / 2);
    var dy = from.top + from.height / 2 - (to.top + to.height / 2);

    document.body.classList.add('zooming');
    box.style.transition = 'none';
    box.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
    box.style.opacity = '0.4';
    void box.offsetWidth;                       // vynutit prekresleni
    box.style.transition = '';
    box.style.transform = '';
    box.style.opacity = '';
    if (zoomView.scale) setTimeout(function () { zoomView.scale(); }, 60);
  }

  function closeZoom(silent) {
    clearTimeout(doorbellTimer);
    if (!silent) document.body.classList.remove('zooming');
    if (zoomView && zoomView.destroy) zoomView.destroy();
    zoomView = null;
    var host = document.getElementById('zoomBody');
    if (host && !silent) setTimeout(function () { if (!document.body.classList.contains('zooming')) host.innerHTML = ''; }, 400);
  }

  function openEditor() {
    if (window.Panel && Panel.activity) Panel.activity();
    Editor.open(layout, demo ? demoStates : (conn ? conn.states : {}), saveLayout);
  }

  /* ================= ukazka bez Home Assistantu ================= */

  var demoStates = {};

  function startDemo() {
    demo = true;
    var now = new Date().toISOString();
    function s(id, state, attrs) {
      demoStates[id] = { entity_id: id, state: String(state), attributes: attrs || {}, last_changed: now };
    }
    s('sensor.obyvak_teplota', 22.4, { friendly_name: 'Obývák', device_class: 'temperature', unit_of_measurement: '°C' });
    s('sensor.obyvak_vlhkost', 47, { friendly_name: 'Vlhkost obývák', device_class: 'humidity', unit_of_measurement: '%' });
    s('sensor.venku_teplota', 8.6, { friendly_name: 'Venku', device_class: 'temperature', unit_of_measurement: '°C' });
    s('sensor.venku_vlhkost', 81, { friendly_name: 'Vlhkost venku', device_class: 'humidity', unit_of_measurement: '%' });
    s('sensor.co2', 870, { friendly_name: 'CO₂ ložnice', device_class: 'carbon_dioxide', unit_of_measurement: 'ppm' });
    s('sensor.spotreba', 412, { friendly_name: 'Odběr domu', device_class: 'power', unit_of_measurement: 'W' });
    s('light.kuchyne', 'on', { friendly_name: 'Kuchyně' });
    s('light.loznice', 'off', { friendly_name: 'Ložnice' });
    s('switch.kotel', 'on', { friendly_name: 'Kotel' });
    s('binary_sensor.dvere', 'off', { friendly_name: 'Vchodové dveře', device_class: 'door' });
    s('sensor.tablet_baterie', 72, { friendly_name: 'Tablet', device_class: 'battery', unit_of_measurement: '%' });

    layout = Layout.fromStates(demoStates);
    layout.title = '';
    // Ukazka ma predvest vsechny zpusoby zobrazeni, ne jen budiky.
    var demoPage = layout.pages[0];
    if (demoPage.cards[1]) {
      demoPage.cards[1].view = 'graph';
      demoPage.cards[1].hours = 12;
    }
    demoPage.cards.push({
      name: 'ODBĚR', code: 'W', tone: 'violet', view: 'bar',
      dial: { entity: 'sensor.spotreba', caption: 'Příkon', min: 0, max: 3000 },
      tiles: [{ entity: 'sensor.co2', name: 'CO₂', view: 'graph' }]
    });
    // Druha stranka ukaze prejizdeni prstem.
    layout.pages.push({
      name: 'Dům', cards: [{
        name: 'VLHKOST', code: 'H', tone: 'green', view: 'graph', hours: 12,
        dial: { entity: 'sensor.obyvak_vlhkost', caption: 'Vlhkost' }
      }],
      panels: [{ name: 'Dveře a okna', tone: 'cyan',
                 items: [{ entity: 'binary_sensor.dvere', name: 'Vchod' }] }]
    });
    layout = Layout.normalize(layout);
    rebuild();
    setMode('live');
    badge('Ukázka', 'warn');
    toast('Ukázka bez Home Assistanta. Nastavení najdeš pod ozubeným kolem.');
  }

  /** Ukazka nema odkud vzit historii, tak si ji vymysli. */
  function demoHistory() {
    if (!view) return;
    Layout.graphed(layout).forEach(function (w) {
      var st = demoStates[w.entity];
      var base = st ? U.num(st.state) : 20;
      if (isNaN(base)) base = 20;
      var now = Date.now(), series = [];
      for (var i = 120; i >= 0; i--) {
        var t = now - i * (w.hours * 3600000 / 120);
        var wave = Math.sin(i / 11) * base * 0.12 + Math.sin(i / 3.3) * base * 0.03;
        series.push({ t: t, v: Math.round((base + wave) * 10) / 10 });
      }
      view.setHistory(w.entity, series);
    });
  }

  /* ================= spusteni ================= */

  function boot() {
    cvs = document.getElementById('organism');
    if (cvs && cvs.getContext) ctx = cvs.getContext('2d');

    loadConfig();
    rebuild();
    playBoot();
    fit();
    startDrift();
    setInterval(tick, 1000);
    tick();

    addEventListener('resize', function () { fit(); sizeCanvas(); });
    addEventListener('orientationchange', function () { setTimeout(fit, 150); });
    if (window.visualViewport) {
      visualViewport.addEventListener('resize', fit);
    }
    addEventListener('load', function () { fit(); setTimeout(fit, 400); setTimeout(fit, 1200); });

    document.getElementById('setupBtn').addEventListener('click', function () {
      if (window.Panel && Panel.openSettings) Panel.openSettings();
      else toast('Nastavení aplikace je dostupné jen v tabletu.');
    });
    document.getElementById('demoBtn').addEventListener('click', startDemo);
    document.getElementById('zoomClose').addEventListener('click', function () { closeZoom(); });
    // Stejne jako u okna s ovladanim: zavrit jen pri klepnuti, ktere
    // zacalo i skoncilo na tmavem pozadi.
    var zoomDownOutside = false;
    var zoomEl = document.getElementById('zoom');
    zoomEl.addEventListener('pointerdown', function (e) { zoomDownOutside = (e.target === zoomEl); });
    zoomEl.addEventListener('click', function (e) {
      if (e.target === zoomEl && zoomDownOutside) closeZoom();
      zoomDownOutside = false;
    });
    document.getElementById('downSettings').addEventListener('click', function () {
      if (window.Panel && Panel.openSettings) Panel.openSettings();
    });

    // Kazdy dotyk odklada klidovy rezim i v aplikaci.
    addEventListener('touchstart', function () {
      if (window.Panel && Panel.activity) Panel.activity();
    }, { passive: true });

    browserPresence();
    initSwipe();
    connect();
    setMode(cfg.baseUrl && cfg.token ? 'live' : 'setup');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

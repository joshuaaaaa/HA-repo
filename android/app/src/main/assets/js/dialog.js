/* ------------------------------------------------------------------
   Okno s podrobnostmi entity - to, co v Home Assistantu otevre klepnuti
   na dlazdici: zapnout, ztlumit, zmenit barvu, vyjet roletu.

   Panel zamerne nema vsechno, co umi Home Assistant. Ma to, co clovek
   u panelu na zdi opravdu udela: rozsviti, ztlumi, zmeni barvu svetla,
   pustí roletu, prepne zasuvku, upravi teplotu. Na zbytek je telefon.

   Vola se pres Dialog.open(entityId, ctx), kde ctx ma:
     states(id)      -> stav entity
     call(domain, service, data)
     history(id)     -> [{t,v}] pro krivku (nepovinne)
     onClose()
   ------------------------------------------------------------------ */
'use strict';

var Dialog = (function () {

  var root = null, current = null, ctx = null, chart = null;

  /* Predvolene barvy: teple bile az studene, pak barevne. Pres pokoj se
     vybira rychleji z hotovych barev nez z kolecka. */
  var SWATCHES = [
    [255, 180, 90], [255, 214, 170], [255, 241, 224], [212, 235, 255],
    [255, 70, 70], [255, 145, 40], [255, 225, 60], [120, 240, 120],
    [70, 200, 255], [90, 120, 255], [200, 90, 255], [255, 110, 200]
  ];

  var HVAC = { off: 'Vypnuto', heat: 'Topit', cool: 'Chladit', heat_cool: 'Auto',
               auto: 'Auto', dry: 'Vysoušet', fan_only: 'Ventilace' };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function btn(label, cls, fn) {
    var b = el('button', 'dbtn ' + (cls || ''), label);
    b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
    return b;
  }

  /**
   * Posuvnik. Hodnota se posila az po puštění prstu - jinak by kazde
   * skubnuti poslalo prikaz a svetlo by blikalo.
   */
  function slider(label, value, min, max, unit, onDone) {
    var box = el('div', 'dslide');
    var head = el('div', 'dsl');
    head.appendChild(el('span', '', label));
    var out = el('b', '', fmtNum(value) + (unit || ''));
    head.appendChild(out);
    box.appendChild(head);

    var input = el('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = 1;
    input.value = isNaN(value) ? min : value;
    input.addEventListener('input', function () {
      out.textContent = fmtNum(input.value) + (unit || '');
    });
    var send = function () { onDone(parseFloat(input.value)); };
    input.addEventListener('change', send);
    box.appendChild(input);
    return box;
  }

  function fmtNum(v) {
    var n = parseFloat(v);
    return isNaN(n) ? '--' : String(Math.round(n));
  }

  function attr(st, name, def) {
    var a = (st && st.attributes) || {};
    return a[name] === undefined || a[name] === null ? def : a[name];
  }

  function supports(st, mode) {
    var modes = attr(st, 'supported_color_modes', []) || [];
    return modes.indexOf(mode) >= 0;
  }

  /* ---------- ovladani podle druhu entity ---------- */

  function bodyFor(st, id, body, cx) {
    // Ovladaci prvky se kresli i mimo okno (do zvetsene sekce), proto si
    // bodyFor nese vlastni kontext a nesaha na ten, ktery patri oknu.
    var call = function (domain, service, data) {
      var c = cx || ctx;
      if (c && c.call) c.call(domain, service, data);
    };
    var domain = U.domain(id);
    var on = st && (st.state === 'on' || st.state === 'open' || st.state === 'playing'
                 || st.state === 'unlocked' || st.state === 'cleaning' || st.state === 'heat'
                 || st.state === 'cool' || st.state === 'auto' || st.state === 'heat_cool');

    /* velky vypinac - u vseho, co jde zapnout */
    if (['light', 'switch', 'input_boolean', 'fan', 'siren', 'humidifier', 'media_player']
        .indexOf(domain) >= 0) {
      var row = el('div', 'drow');
      row.appendChild(btn('Zapnout', 'big' + (on ? ' on' : ''), function () {
        call(domain === 'media_player' ? 'media_player' : domain,
             domain === 'media_player' ? 'media_play' : 'turn_on', { entity_id: id });
      }));
      row.appendChild(btn(domain === 'media_player' ? 'Pauza' : 'Vypnout', 'big' + (!on ? ' off' : ''), function () {
        call(domain === 'media_player' ? 'media_player' : domain,
             domain === 'media_player' ? 'media_pause' : 'turn_off', { entity_id: id });
      }));
      body.appendChild(row);
    }

    if (domain === 'light') {
      var bri = Math.round((attr(st, 'brightness', 0) / 255) * 100);
      body.appendChild(slider('Jas', on ? bri : 0, 1, 100, ' %', function (v) {
        call('light', 'turn_on', { entity_id: id, brightness_pct: v });
      }));

      if (supports(st, 'color_temp')) {
        var kMin = attr(st, 'min_color_temp_kelvin', 2000);
        var kMax = attr(st, 'max_color_temp_kelvin', 6500);
        var k = attr(st, 'color_temp_kelvin', Math.round((kMin + kMax) / 2));
        var warm = slider('Teplota bílé', k, kMin, kMax, ' K', function (v) {
          call('light', 'turn_on', { entity_id: id, color_temp_kelvin: Math.round(v) });
        });
        warm.classList.add('warm');
        body.appendChild(warm);
      }

      if (supports(st, 'hs') || supports(st, 'rgb') || supports(st, 'xy') || supports(st, 'rgbw')) {
        body.appendChild(el('div', 'dlbl', 'Barva'));
        var sw = el('div', 'dsw');
        SWATCHES.forEach(function (c) {
          var b = el('i', '');
          b.style.background = 'rgb(' + c.join(',') + ')';
          b.addEventListener('click', function (ev) {
            ev.stopPropagation();
            call('light', 'turn_on', { entity_id: id, rgb_color: c });
          });
          sw.appendChild(b);
        });
        body.appendChild(sw);
      }
    }

    if (domain === 'fan') {
      body.appendChild(slider('Otáčky', attr(st, 'percentage', 0), 0, 100, ' %', function (v) {
        call('fan', 'set_percentage', { entity_id: id, percentage: v });
      }));
    }

    if (domain === 'cover') {
      var r2 = el('div', 'drow');
      r2.appendChild(btn('▲ Otevřít', '', function () { call('cover', 'open_cover', { entity_id: id }); }));
      r2.appendChild(btn('■ Stop', '', function () { call('cover', 'stop_cover', { entity_id: id }); }));
      r2.appendChild(btn('▼ Zavřít', '', function () { call('cover', 'close_cover', { entity_id: id }); }));
      body.appendChild(r2);
      if (attr(st, 'current_position', null) !== null) {
        body.appendChild(slider('Poloha', attr(st, 'current_position', 0), 0, 100, ' %', function (v) {
          call('cover', 'set_cover_position', { entity_id: id, position: v });
        }));
      }
    }

    if (domain === 'lock') {
      var r3 = el('div', 'drow');
      r3.appendChild(btn('Zamknout', 'big', function () { call('lock', 'lock', { entity_id: id }); }));
      r3.appendChild(btn('Odemknout', 'big', function () { call('lock', 'unlock', { entity_id: id }); }));
      body.appendChild(r3);
    }

    if (domain === 'media_player') {
      // Obal a nazev skladby - podle nej clovek pozna, co hraje.
      var pic = attr(st, 'entity_picture', '');
      var title = attr(st, 'media_title', '');
      if (pic || title) {
        var mp = el('div', 'dmedia');
        if (pic && ctx.baseUrl !== undefined) {
          var art = el('img', '');
          art.alt = '';
          art.src = /^https?:/.test(pic) ? pic : (ctx.baseUrl || '') + pic;
          mp.appendChild(art);
        }
        var mt = el('div', 'dmtxt');
        mt.appendChild(el('b', '', title || U.name(st, '')));
        var artist = attr(st, 'media_artist', '') || attr(st, 'app_name', '');
        if (artist) mt.appendChild(el('span', '', artist));
        mp.appendChild(mt);
        body.appendChild(mp);
      }
      var vol = Math.round(attr(st, 'volume_level', 0) * 100);
      body.appendChild(slider('Hlasitost', vol, 0, 100, ' %', function (v) {
        call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 });
      }));
      var r4 = el('div', 'drow');
      r4.appendChild(btn('⏮', '', function () { call('media_player', 'media_previous_track', { entity_id: id }); }));
      r4.appendChild(btn('⏭', '', function () { call('media_player', 'media_next_track', { entity_id: id }); }));
      body.appendChild(r4);
    }

    if (domain === 'climate') {
      var target = attr(st, 'temperature', null);
      if (target !== null) {
        var t = el('div', 'dtemp');
        t.appendChild(btn('−', 'rnd', function () { setTemp(id, st, -0.5, call); }));
        var tv = el('b', '', U.fmt(target, 1) + ' °C');
        t.appendChild(tv);
        t.appendChild(btn('+', 'rnd', function () { setTemp(id, st, 0.5, call); }));
        body.appendChild(t);
      }
      var modes = attr(st, 'hvac_modes', []) || [];
      if (modes.length) {
        var mr = el('div', 'drow wrap');
        modes.forEach(function (m) {
          mr.appendChild(btn(HVAC[m] || m, st.state === m ? 'on' : '', function () {
            call('climate', 'set_hvac_mode', { entity_id: id, hvac_mode: m });
          }));
        });
        body.appendChild(mr);
      }
    }

    /* Vyber z moznosti - vstup, rezim praöky, zdroj prehravace. */
    if (domain === 'select' || domain === 'input_select') {
      var opts = attr(st, 'options', []) || [];
      if (opts.length) {
        var or = el('div', 'drow wrap');
        opts.slice(0, 12).forEach(function (o) {
          or.appendChild(btn(o, st && st.state === o ? 'on' : '', function () {
            call(domain, 'select_option', { entity_id: id, option: o });
          }));
        });
        body.appendChild(or);
      }
    }

    /* Cislo - napr. cilova teplota bojleru nebo hlasitost zvonku. */
    if (domain === 'number' || domain === 'input_number') {
      var min = attr(st, 'min', 0), max = attr(st, 'max', 100);
      var cur = U.num(st && st.state);
      body.appendChild(slider(U.name(st, '') || 'Hodnota', isNaN(cur) ? min : cur, min, max,
        ' ' + attr(st, 'unit_of_measurement', ''), function (v) {
          call(domain, 'set_value', { entity_id: id, value: v });
        }));
    }

    /* Alarm: zajistit doma, zajistit pri odchodu, odjistit. Kod se tu
       zamerne nezadava - panel na zdi neni misto na tajemstvi. */
    if (domain === 'alarm_control_panel') {
      var ar = el('div', 'drow wrap');
      var modes = [['alarm_arm_home', 'Zajistit doma'], ['alarm_arm_away', 'Zajistit'],
                   ['alarm_disarm', 'Odjistit']];
      modes.forEach(function (m) {
        ar.appendChild(btn(m[1], '', function () {
          call('alarm_control_panel', m[0], { entity_id: id });
        }));
      });
      body.appendChild(ar);
      if (attr(st, 'code_format', null)) {
        body.appendChild(el('div', 'dnote',
          'Alarm chce kód — ten se zadává v Home Assistantu, ne na panelu.'));
      }
    }

    if (domain === 'scene' || domain === 'script') {
      body.appendChild(el('div', 'drow')).appendChild(
        btn(domain === 'scene' ? 'Spustit scénu' : 'Spustit skript', 'big on', function () {
          call(domain, 'turn_on', { entity_id: id });
        }));
    }

    if (domain === 'vacuum') {
      var r5 = el('div', 'drow');
      r5.appendChild(btn('Uklidit', 'big', function () { call('vacuum', 'start', { entity_id: id }); }));
      r5.appendChild(btn('Do doku', 'big', function () { call('vacuum', 'return_to_base', { entity_id: id }); }));
      body.appendChild(r5);
    }
  }

  function setTemp(id, st, delta, call) {
    var cur = attr(st, 'temperature', 20);
    var step = attr(st, 'target_temp_step', 0.5) || 0.5;
    var min = attr(st, 'min_temp', 5), max = attr(st, 'max_temp', 35);
    var next = Math.max(min, Math.min(max, cur + (delta < 0 ? -step : step)));
    call('climate', 'set_temperature', { entity_id: id, temperature: next });
  }

  function call(domain, service, data) {
    if (ctx && ctx.call) ctx.call(domain, service, data);
  }

  /* ---------- okno ---------- */

  function open(entityId, context) {
    ctx = context || {};
    current = entityId;
    if (!root) {
      root = el('div', '');
      root.id = 'detail';
      // Zavirat jen tehdy, kdyz klepnuti ZACALO i SKONCILO mimo okno.
      // Jinak by se okno otevrene dlouhym stiskem zavrelo hned, jak
      // uzivatel pusti prst - pusteni dopadne na tmave pozadi.
      var downOutside = false;
      root.addEventListener('pointerdown', function (e) { downOutside = (e.target === root); });
      root.addEventListener('click', function (e) {
        if (e.target === root && downOutside) close();
        downOutside = false;
      });
      document.body.appendChild(root);
    }
    render();
    document.body.classList.add('detailing');
  }

  function render() {
    if (!root || !current) return;
    var st = ctx.states ? ctx.states(current) : null;
    root.innerHTML = '';

    var win = el('div', 'dwin');
    win.addEventListener('click', function (e) { e.stopPropagation(); });

    var head = el('div', 'dhead');
    var names = el('div', 'dnames');
    names.appendChild(el('b', '', U.name(st, '') || current));
    names.appendChild(el('i', '', current));
    head.appendChild(names);

    var d = U.display(st, {});
    var val = el('div', 'dval', d.text + (d.unit ? ' ' + d.unit : ''));
    head.appendChild(val);
    head.appendChild(btn('✕', 'x', close));
    win.appendChild(head);

    var body = el('div', 'dbody');
    bodyFor(st, current, body, ctx);

    // Krivka u vseho, co ma cislo - i u svetla (jas) je videt, kdy se
    // naposledy svitilo.
    var series = ctx.history ? ctx.history(current) : null;
    if (series && series.length > 1) {
      var gb = el('div', 'dgraph');
      chart = Render.makeChart ? Render.makeChart({ scales: true }) : null;
      if (chart) {
        gb.appendChild(chart.el);
        body.appendChild(gb);
        chart.draw(series, 6, null);
      }
    }

    if (st && st.last_changed) {
      body.appendChild(el('div', 'dnote', 'změna ' + U.ago(st.last_changed)));
    }
    win.appendChild(body);
    root.appendChild(win);
  }

  /** Prijde novy stav - okno se prekresli, at posuvniky ukazuji pravdu. */
  function update(entityId) {
    if (!isOpen() || entityId !== current) return;
    // Behem taháni posuvníku se nepřekresluje, jinak by prst "utekl".
    if (root.querySelector('input[type=range]:active')) return;
    render();
  }

  function close() {
    document.body.classList.remove('detailing');
    current = null;
    if (ctx && ctx.onClose) ctx.onClose();
  }

  function isOpen() { return document.body.classList.contains('detailing'); }

  /**
   * Vykresli ovladaci prvky entity do libovolneho mista - pouziva to
   * zvetsena sekce, aby se svetlo dalo rozsvitit rovnou ve velkem.
   * Vraci true, kdyz se neco vykreslilo (cidlo nema co ovladat).
   */
  function controls(entityId, host, context) {
    if (!entityId || !host) return false;
    host.innerHTML = '';
    var st = context && context.states ? context.states(entityId) : null;
    bodyFor(st, entityId, host, context);
    return host.childNodes.length > 0;
  }

  /** Ma tahle entita vubec co ovladat? Cidlo se jen ukazuje. */
  function hasControls(entityId) {
    return CONTROLLABLE.indexOf(U.domain(entityId || '')) >= 0;
  }

  var CONTROLLABLE = ['light', 'switch', 'input_boolean', 'fan', 'siren', 'humidifier',
    'media_player', 'cover', 'lock', 'climate', 'scene', 'script', 'vacuum',
    'select', 'input_select', 'number', 'input_number', 'alarm_control_panel'];

  return { open: open, close: close, isOpen: isOpen, update: update,
           controls: controls, hasControls: hasControls, SWATCHES: SWATCHES };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Dialog;

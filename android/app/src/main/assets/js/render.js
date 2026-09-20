/* ------------------------------------------------------------------
   Z rozvrzeni udela obrazovku a pak uz jen prepisuje hodnoty.

   Postup: build() jednou postavi prvky a ke kazdemu si poznamena, ktera
   entita ho plni (vazba). Kazda zmena stavu pak prepise jen text v tech
   nekolika prvcich - nic se neprekresluje znovu, takze panel neblika a
   na levnem tabletu nezere proud.
   ------------------------------------------------------------------ */
'use strict';

var Render = (function () {

  /* ---------- budik ---------- */
  var SEG = 56, GAP = 1.4, SPAN = 264, START = 138, R_OUT = 148, R_IN = 128;

  function dialPaths() {
    var s = '', cx = 159, cy = 159, w = SPAN / SEG;
    for (var i = 0; i < SEG; i++) {
      var a0 = (START + i * w + GAP / 2) * Math.PI / 180;
      var a1 = (START + (i + 1) * w - GAP / 2) * Math.PI / 180;
      s += '<path d="M ' + (cx + R_IN * Math.cos(a0)).toFixed(2) + ' ' + (cy + R_IN * Math.sin(a0)).toFixed(2)
        + ' L ' + (cx + R_OUT * Math.cos(a0)).toFixed(2) + ' ' + (cy + R_OUT * Math.sin(a0)).toFixed(2)
        + ' A ' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + (cx + R_OUT * Math.cos(a1)).toFixed(2) + ' ' + (cy + R_OUT * Math.sin(a1)).toFixed(2)
        + ' L ' + (cx + R_IN * Math.cos(a1)).toFixed(2) + ' ' + (cy + R_IN * Math.sin(a1)).toFixed(2)
        + ' A ' + R_IN + ' ' + R_IN + ' 0 0 0 ' + (cx + R_IN * Math.cos(a0)).toFixed(2) + ' ' + (cy + R_IN * Math.sin(a0)).toFixed(2)
        + ' Z" fill="#141d28"/>';
    }
    return s;
  }

  function setSeg(group, ratio, color) {
    var paths = group.children;
    var p = isNaN(ratio) ? 0 : Math.max(0, Math.min(1, ratio));
    var lit = Math.round(p * SEG);
    for (var i = 0; i < paths.length; i++) {
      var on = i < lit;
      paths[i].setAttribute('fill', on ? color : '#141d28');
      paths[i].style.opacity = on ? (0.65 + 0.35 * (i / Math.max(1, lit))) : 1;
    }
  }

  /* ---------- krivka ----------
     Kresli se do SVG s pevnou soustavou 0-100 v obou smerech, ktera se
     roztahne na plochu. Cary proto maji non-scaling-stroke (v CSS) a
     popisky jsou HTML vedle SVG - roztazene pismo by bylo necitelne. */
  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function makeChart() {
    var svg = svgEl('svg', { 'class': 'chart', viewBox: '0 0 100 100',
                             preserveAspectRatio: 'none' });
    [25, 50, 75].forEach(function (y) {
      svg.appendChild(svgEl('line', { 'class': 'grid', x1: 0, x2: 100, y1: y, y2: y }));
    });
    var area = svgEl('path', { 'class': 'area', d: '' });
    var line = svgEl('path', { 'class': 'line', d: '' });
    var dot = svgEl('circle', { 'class': 'dot', cx: -10, cy: -10, r: 2.2 });
    svg.appendChild(area); svg.appendChild(line); svg.appendChild(dot);

    /** series = [{t,v}], vraci {lo,hi} skutecneho rozsahu (pro popisky) */
    function draw(series, hours) {
      if (!series || series.length < 2) {
        area.setAttribute('d', ''); line.setAttribute('d', '');
        dot.setAttribute('cx', -10);
        return null;
      }
      var t1 = Date.now(), t0 = t1 - (hours || 6) * 3600000;
      var lo = Infinity, hi = -Infinity;
      series.forEach(function (p) { if (p.v < lo) lo = p.v; if (p.v > hi) hi = p.v; });
      if (hi - lo < 1e-6) { hi = lo + 1; lo = lo - 1; }
      var pad = (hi - lo) * 0.08;
      var LO = lo - pad, HI = hi + pad;

      var d = '', px = 0, py = 0;
      for (var i = 0; i < series.length; i++) {
        var x = (series[i].t - t0) / (t1 - t0) * 100;
        var y = 100 - (series[i].v - LO) / (HI - LO) * 100;
        x = Math.max(0, Math.min(100, x));
        d += (i ? ' L ' : 'M ') + x.toFixed(2) + ' ' + y.toFixed(2);
        px = x; py = y;
      }
      line.setAttribute('d', d);
      area.setAttribute('d', d + ' L ' + px.toFixed(2) + ' 100 L 0 100 Z');
      dot.setAttribute('cx', px.toFixed(2));
      dot.setAttribute('cy', py.toFixed(2));
      return { lo: lo, hi: hi };
    }

    return { el: svg, draw: draw };
  }

  /** "6 h zpět" -> text pod krivkou */
  function spanLabel(hours) {
    if (hours >= 48) return Math.round(hours / 24) + ' dny zpět';
    if (hours >= 24) return '24 h zpět';
    return hours + ' h zpět';
  }

  /* ---------- pomocnici ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function svg(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<svg viewBox="0 0 318 318" aria-hidden="true">' + html + '</svg>';
    return wrap.firstChild;
  }

  function toneClass(t) { return t && t !== 'cyan' ? ' t-' + t : ''; }

  /* Barvy odstinu musi byt i v JS: budik se kresli do SVG, kam se CSS
     promenna nedostane, a v okamziku stavby jeste prvek neni v dokumentu. */
  var ACCENT = { cyan: '#36d8ff', amber: '#ff8b3e', green: '#8af5bc', violet: '#c48aff', red: '#ff5369' };

  /* ------------------------------------------------------------------
     build(layout, host, ctx)
       host = #stage,  ctx = { onTap(entity), onCog() }
     Vraci { refresh(states), bindings }
     ------------------------------------------------------------------ */
  function build(layout, host, ctx) {
    ctx = ctx || {};
    var bindings = [];
    // Krivky se neplni ze stavu, ale z historie - drzi se tedy zvlast.
    var graphs = [];
    // Prvek, na kterem se prepinaji stavove tridy. V aplikaci je to <body>,
    // v karte pro Lovelace obal karty - jinam se karta sahat nesmi.
    var rootEl = ctx.root || document.body;

    function bind(entity, update) {
      if (!entity) return;
      bindings.push({ entity: entity, update: update });
    }

    host.innerHTML = '';

    /* ---------- zahlavi ---------- */
    var header = el('header', 'anim');
    var plate = el('div', 'plate' + (layout.title || layout.subtitle ? '' : ' empty'));
    plate.appendChild(el('div', 'bar'));
    var names = el('div');
    names.appendChild(el('div', 'wordmark', layout.title || ''));
    if (layout.subtitle) names.appendChild(el('div', 'subline', layout.subtitle));
    plate.appendChild(names);
    header.appendChild(plate);

    var badge = el('div', 'badge');
    badge.appendChild(el('span', 'led'));
    badge.appendChild(el('span', '', 'Spojuji'));
    header.appendChild(badge);
    header.appendChild(el('div', 'grow'));

    var clock = el('div', 'clock');
    var clockT = el('div', 't', '--:--:--');
    var clockD = el('div', 'd', '—');
    clock.appendChild(clockT); clock.appendChild(clockD);
    header.appendChild(clock);

    // Ozubene kolo jen tam, kde je editor - v karte pro Lovelace se panel
    // upravuje v konfiguraci karty.
    var cog = ctx.onCog ? el('div', 'cog') : null;
    if (cog) {
      cog.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>'
        + '<path d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L14.9 3h-3.8l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.4-1-2 3.4L6.6 11a7.7 7.7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1l.4 2.6h3.8l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6z"/></svg>';
      cog.addEventListener('click', function () { ctx.onCog(); });
      header.appendChild(cog);
    }
    host.appendChild(header);

    /* ---------- pruh upozorneni ---------- */
    var alertBar = el('div', '');
    alertBar.id = 'alert';
    alertBar.innerHTML = '<div class="al"><i></i><span class="alx">Upozornění</span></div>'
      + '<div class="at"><div class="af"></div></div>'
      + '<div class="ap"><span class="apv">0</span><small>%</small></div>'
      + '<div class="am">—</div>';
    host.appendChild(alertBar);

    if (layout.alert && layout.alert.entity) {
      var aName = alertBar.querySelector('.alx');
      var aFill = alertBar.querySelector('.af');
      var aVal = alertBar.querySelector('.apv');
      var aMeta = alertBar.querySelector('.am');
      aName.textContent = layout.alert.name || 'Upozornění';
      bind(layout.alert.entity, function (st) {
        var on = false, d = U.display(st, { attribute: layout.alert.attribute });
        if (st) {
          var raw = layout.alert.attribute ? (st.attributes || {})[layout.alert.attribute] : st.state;
          on = String(raw) === String(layout.alert.on) || (!isNaN(d.n) && d.n > 0);
        }
        rootEl.classList.toggle('alert', on);
        if (!on) return;
        if (!isNaN(d.n) && d.n <= 100 && d.n >= 0) {
          alertBar.classList.remove('text');
          aFill.style.width = d.n + '%';
          aVal.textContent = U.fmt(d.n, 0);
        } else {
          alertBar.classList.add('text');
        }
        aMeta.textContent = layout.alert.note || (st ? U.name(st, '') : '');
      });
    }

    /* ---------- sekce ----------
       Trida n1..n6 rika CSS, kolik sekci se deli o plochu - podle toho
       se srovna mrizka i meritko uvnitr sekci. */
    var mid = el('div', 'mid n' + Math.min(6, layout.cards.length));
    layout.cards.forEach(function (card, idx) {
      mid.appendChild(buildCard(card, idx, bind, ctx, graphs));
    });
    if (layout.cards.length) host.appendChild(mid);

    /* ---------- spodni panely ---------- */
    var bot = el('div', 'bot n' + Math.min(4, layout.panels.length));
    layout.panels.forEach(function (p, idx) {
      bot.appendChild(buildPanel(p, idx, bind, ctx, graphs));
    });
    if (layout.panels.length) host.appendChild(bot);

    /* ---------- klidova obrazovka ---------- */
    // V karte pro Lovelace klidovy rezim nema smysl - dashboard nikdy
    // nezhasina - a tak se ani nestavi.
    var aClock = null, aDate = null;
    if (!ctx.noAmbient) {
      var amb = el('div', '');
      amb.id = 'ambient';
      aClock = el('div', 'aclock', '--:--');
      aDate = el('div', 'adate', '—');
      amb.appendChild(aClock);
      amb.appendChild(aDate);

      var arow = el('div', 'arow');
      [layout.ambient.left, layout.ambient.right].forEach(function (item) {
        if (!item) return;
        var cell = el('div', 'acell');
        var lab = el('div', 'alabel', item.name || '');
        var val = el('div', 'aval', '--');
        var unit = el('div', 'aunit', '');
        var state = el('div', 'astate', '—');
        cell.appendChild(lab);
        cell.appendChild(val);
        cell.appendChild(unit);
        cell.appendChild(state);
        arow.appendChild(cell);
        bind(item.entity, function (st) {
          var d = U.display(st, item);
          if (!lab.textContent) lab.textContent = U.name(st, item.name);
          val.textContent = d.text;
          val.classList.toggle('txt', isNaN(d.n));
          unit.textContent = d.unit;
          var lv = U.level(d.n, item.levels);
          state.textContent = d.has ? (item.levels.length ? lv.word : (d.word || '')) : 'Nedostupné';
          state.style.color = item.levels.length ? lv.color : '#7f9db1';
        });
      });
      if (arow.children.length) amb.appendChild(arow);

      (layout.ambient.line || []).forEach(function (item) {
        var line = el('div', 'aline');
        var k = el('b', '', '');
        line.appendChild(document.createTextNode(''));
        line.appendChild(k);
        amb.appendChild(line);
        bind(item.entity, function (st) {
          var d = U.display(st, item);
          line.firstChild.nodeValue = (U.name(st, item.name) || '') + ': ';
          k.textContent = d.text + (d.unit ? ' ' + d.unit : '');
        });
      });

      var tag = el('div', 'atag');
      tag.appendChild(el('i'));
      tag.appendChild(document.createTextNode('Klidový režim'));
      amb.appendChild(tag);
      host.appendChild(amb);
    }


    /* ---------- prazdny panel ---------- */
    if (!layout.cards.length && !layout.panels.length) {
      var hint = el('div', 'pane panel anim');
      hint.style.gridColumn = '1 / -1';
      var inner = el('div', 'pempty');
      inner.innerHTML = 'Panel zatím nic neukazuje.<br>Klepni na ozubené kolo vpravo nahoře a vyber entity.';
      hint.appendChild(inner);
      var wrap = el('div', 'mid n1');
      wrap.appendChild(hint);
      host.insertBefore(wrap, alertBar.nextSibling);
    }

    /* ---------- obnova ---------- */
    function refresh(states) {
      for (var i = 0; i < bindings.length; i++) {
        var b = bindings[i];
        try { b.update(states ? states[b.entity] : null); } catch (e) {}
      }
    }

    function refreshOne(entityId, states) {
      for (var i = 0; i < bindings.length; i++) {
        if (bindings[i].entity === entityId) {
          try { bindings[i].update(states ? states[entityId] : null); } catch (e) {}
        }
      }
    }

    /** Nova historie jedne entity - prekresli vsechny jeji krivky. */
    function setHistory(entityId, series) {
      for (var i = 0; i < graphs.length; i++) {
        if (graphs[i].entity !== entityId) continue;
        try { graphs[i].draw(series); } catch (e) {}
      }
    }

    /** Prekresleni vseho (napr. po zmene velikosti nebo pri navratu z klidu). */
    function redraw(store) {
      for (var i = 0; i < graphs.length; i++) {
        try { graphs[i].draw(store ? store.get(graphs[i].entity) : null); } catch (e) {}
      }
    }

    return {
      bindings: bindings,
      graphs: graphs,
      refresh: refresh,
      refreshOne: refreshOne,
      setHistory: setHistory,
      redraw: redraw,
      badge: badge,
      clock: { t: clockT, d: clockD, aTime: aClock, aDate: aDate }
    };
  }

  /* ---------- jedna sekce ----------
     Sekce ukazuje jednu hlavni hodnotu - a uzivatel si vybira, jak:
     budikem, sloupcem, krivkou nebo holym cislem. Vsechny ctyri mluvi
     stejne: velke cislo, jednotka a slovo o stavu. */
  function buildCard(card, idx, bind, ctx, graphs) {
    var sec = el('section', 'pane card anim' + toneClass(card.tone));
    sec.style.animationDelay = (0.06 + idx * 0.08) + 's';

    var head = el('div', 'chead');
    if (card.code) head.appendChild(el('div', 'id', card.code));
    head.appendChild(el('div', 'nm', card.name || ''));
    var part = el('span', 'part', '');
    head.appendChild(part);
    sec.appendChild(head);
    bind(card.dial.entity, function (st) {
      // Jmeno entity vedle nadpisu jen tehdy, kdyz rika neco noveho -
      // dvakrat totez vedle sebe je jen sum.
      var ent = U.name(st, '') || '';
      part.textContent = ent.toLowerCase() === String(card.name || '').toLowerCase() ? '' : ent;
    });

    var accent = ACCENT[card.tone] || ACCENT.cyan;
    var body = el('div', 'cbody');
    body.appendChild(buildVisual(card, bind, accent, graphs));

    var right = el('div', 'cright');
    (card.meters || []).forEach(function (m) {
      right.appendChild(buildMeter(m, bind, accent, graphs));
    });
    if (card.tiles && card.tiles.length) {
      var tiles = el('div', 'tiles' + (card.tiles.length % 3 === 0 && card.tiles.length > 2 ? ' t3' : ''));
      card.tiles.forEach(function (t) { tiles.appendChild(buildTile(t, bind, graphs)); });
      right.appendChild(tiles);
    }
    body.appendChild(right);
    sec.appendChild(body);
    return sec;
  }

  /* ---------- hlavni hodnota sekce ---------- */
  function buildVisual(card, bind, accent, graphs) {
    var d = card.dial;
    var view = card.view || 'gauge';
    var nEl = el('div', 'n', '--');
    var uEl = el('div', 'u', '');
    var stEl = el('div', 'st', '—');
    var capEl = el('div', 'cap', d.caption || '');
    var wrap, setVisual = function () {};

    if (view === 'bar') {
      wrap = el('div', 'barw');
      var col = el('div', 'bcol');
      var segs = [];
      for (var i = 0; i < 24; i++) {
        var seg = el('i', 'bseg');
        col.appendChild(seg);
        segs.push(seg);
      }
      var side = el('div', 'bside');
      side.appendChild(capEl); side.appendChild(nEl); side.appendChild(uEl); side.appendChild(stEl);
      wrap.appendChild(col); wrap.appendChild(side);
      setVisual = function (ratio, color) {
        var lit = Math.round(Math.max(0, Math.min(1, ratio)) * segs.length);
        for (var j = 0; j < segs.length; j++) {
          segs[j].style.background = j < lit ? color : '#141d28';
          segs[j].style.opacity = j < lit ? (0.6 + 0.4 * (j / Math.max(1, lit))) : 1;
        }
      };

    } else if (view === 'graph') {
      wrap = el('div', 'graphw');
      var ghead = el('div', 'ghead');
      ghead.appendChild(capEl); ghead.appendChild(nEl); ghead.appendChild(uEl); ghead.appendChild(stEl);
      var gbox = el('div', 'gbox');
      var chart = makeChart();
      var gmax = el('div', 'gmax', '');
      var gmin = el('div', 'gmin', '');
      var gempty = el('div', 'gempty', 'zatím bez historie');
      gbox.appendChild(chart.el); gbox.appendChild(gmax); gbox.appendChild(gmin); gbox.appendChild(gempty);
      var span = el('div', 'span');
      span.appendChild(el('span', '', spanLabel(card.hours || 6)));
      span.appendChild(el('span', '', 'teď'));
      wrap.appendChild(ghead); wrap.appendChild(gbox); wrap.appendChild(span);

      graphs.push({
        entity: d.entity,
        hours: card.hours || 6,
        draw: function (series) {
          var r = chart.draw(series, card.hours || 6);
          gempty.style.display = r ? 'none' : '';
          gmax.textContent = r ? U.fmt(r.hi, d.decimals === null ? 1 : d.decimals) : '';
          gmin.textContent = r ? U.fmt(r.lo, d.decimals === null ? 1 : d.decimals) : '';
        }
      });

    } else if (view === 'number') {
      wrap = el('div', 'numw');
      wrap.appendChild(capEl); wrap.appendChild(nEl); wrap.appendChild(uEl); wrap.appendChild(stEl);

    } else {
      wrap = el('div', 'gw');
      var g = svg('<circle class="dial-frame" cx="159" cy="159" r="156"/>'
        + '<circle class="dial-ticks" cx="159" cy="159" r="153"/>'
        + '<circle class="dial-core" cx="159" cy="159" r="120"/>'
        + '<g class="seg">' + dialPaths() + '</g>'
        + '<text class="dial-caption" x="159" y="300" text-anchor="middle">'
        + d.min + ' — ' + d.max + '</text>');
      wrap.appendChild(g);
      var gv = el('div', 'gv');
      gv.appendChild(capEl); gv.appendChild(nEl); gv.appendChild(uEl); gv.appendChild(stEl);
      wrap.appendChild(gv);
      var segGroup = g.querySelector('.seg');
      setVisual = function (ratio, color) { setSeg(segGroup, ratio, color); };
    }

    bind(d.entity, function (st) {
      var disp = U.display(st, d);
      nEl.textContent = disp.text;
      nEl.classList.toggle('txt', isNaN(disp.n));
      uEl.textContent = disp.unit;
      var lv = U.level(disp.n, d.levels);
      var hasLevels = d.levels && d.levels.length;
      stEl.textContent = disp.has ? (hasLevels ? lv.word : (disp.word || '')) : 'Nedostupné';
      stEl.style.color = hasLevels ? lv.color : '#7f8b99';
      stEl.style.display = stEl.textContent && stEl.textContent !== '—' ? '' : 'none';
      var ratio = isNaN(disp.n) ? (disp.has && String(st.state) === 'on' ? 1 : 0)
                                : (disp.n - d.min) / (d.max - d.min);
      setVisual(ratio, hasLevels ? lv.color : accent);
    });

    // Cerstve pridana sekce jeste entitu nema - at je videt proc, misto
    // aby budik nekonecne ukazoval dve pomlcky.
    if (!d.entity) {
      nEl.textContent = '—';
      nEl.classList.add('txt');
      stEl.textContent = 'Vyber entitu';
      stEl.style.color = '#7f8b99';
    }
    return wrap;
  }

  /* ---------- ukazatel vedle hlavni hodnoty ---------- */
  function buildMeter(item, bind, accent, graphs) {
    var m = el('div', 'meter');
    var lbl = el('div', 'lbl');
    var k = el('span', 'k');
    var kText = document.createTextNode(item.name || '');
    var kState = el('b', '', '');
    k.appendChild(kText);
    k.appendChild(kState);
    var v = el('span', 'v', '--');
    lbl.appendChild(k); lbl.appendChild(v);
    m.appendChild(lbl);

    var fill = null, spark = null;
    if (item.view === 'bar') {
      var track = el('div', 'track');
      fill = el('div', 'fill');
      track.appendChild(fill);
      m.appendChild(track);
    } else if (item.view === 'graph') {
      spark = addSpark(m, item, graphs);
    }

    bind(item.entity, function (st) {
      var d = U.display(st, item);
      if (!item.name) kText.nodeValue = U.name(st, '');
      v.textContent = d.text + (d.unit ? ' ' + d.unit : '');
      var lv = U.level(d.n, item.levels);
      var has = item.levels && item.levels.length;
      kState.textContent = has && d.has ? lv.word : '';
      kState.style.color = lv.color;
      if (fill) {
        fill.style.width = U.pct(d.n, item.min, item.max) + '%';
        fill.style.background = has ? lv.color : accent;
      }
      v.style.color = has && d.has ? lv.color : '';
    });
    return m;
  }

  /** Mala krivka bez popisku - do dlazdice i do ukazatele. */
  function addSpark(host, item, graphs) {
    var box = el('div', 'spark');
    var chart = makeChart();
    box.appendChild(chart.el);
    host.appendChild(box);
    if (graphs) {
      graphs.push({
        entity: item.entity,
        hours: item.hours || 6,
        draw: function (series) { chart.draw(series, item.hours || 6); }
      });
    }
    return chart;
  }

  /* ---------- mala dlazdice v sekci ---------- */
  function buildTile(item, bind, graphs) {
    var t = el('div', 'tile');
    var k = el('div', 'k', item.name || '');
    var v = el('div', 'v', '--');
    t.appendChild(k); t.appendChild(v);
    if (item.view === 'graph') addSpark(t, item, graphs);
    bind(item.entity, function (st) {
      var d = U.display(st, item);
      if (!item.name) k.textContent = U.name(st, '');
      v.textContent = '';
      v.classList.toggle('txt', isNaN(d.n));
      v.appendChild(document.createTextNode(d.text));
      if (d.unit) {
        var s = el('small', '', d.unit);
        v.appendChild(s);
      }
      var lv = U.level(d.n, item.levels);
      v.style.color = (item.levels && item.levels.length && d.has) ? lv.color : '';
    });
    return t;
  }

  /* ---------- spodni panel ---------- */
  function buildPanel(panel, idx, bind, ctx, graphs) {
    var accent = ACCENT[panel.tone] || ACCENT.green;
    var sec = el('section', 'pane panel anim' + toneClass(panel.tone));
    sec.style.animationDelay = (0.2 + idx * 0.08) + 's';

    var head = el('div', 'chead2');
    head.appendChild(el('div', 'ptitle', panel.name || ''));
    var src = el('div', 'psrc', '');
    head.appendChild(src);
    sec.appendChild(head);

    // Pri jedne nebo dvou dlazdicich by se roztahly pres cely panel a
    // cisla by plavala v prazdnu - drzime tedy aspon tri sloupce.
    var row = el('div', 'prow' + (panel.items.length > 4 ? ' wrap'
      : (panel.items.length <= 3 ? ' c3' : '')));
    if (!panel.items.length) {
      row.appendChild(el('div', 'pempty', 'zatím prázdné'));
    }
    panel.items.forEach(function (item) {
      row.appendChild(buildPanelItem(item, bind, ctx, accent, graphs));
    });
    sec.appendChild(row);
    return sec;
  }

  function buildPanelItem(item, bind, ctx, accent, graphs) {
    // Znacka "tohle jde prepnout" patri jen tomu, co se opravdu prepina.
    // Karta v Lovelace navic necha klepnout na cokoli - u cidla se otevre
    // podrobnost, jak je v Home Assistantu zvykem.
    var tappable = item.tap === 'toggle' || (item.tap === 'auto' && U.switchable(item.entity));
    var clickable = tappable || (ctx.tapAll && item.entity && item.tap !== 'none');
    var t = el('div', 'lt' + (tappable ? ' act' : ''));
    var lk = el('div', 'lk');
    var name = el('span', '', item.name || '');
    var stWord = el('span', 'lst', '');
    lk.appendChild(name); lk.appendChild(stWord);
    var lv = el('div', 'lv', '--');
    t.appendChild(lk); t.appendChild(lv);

    var fill = null;
    if (item.view === 'bar') {
      var track = el('div', 'track');
      fill = el('div', 'fill');
      track.appendChild(fill);
      t.appendChild(track);
    } else if (item.view === 'graph') {
      addSpark(t, item, graphs);
    }
    var note = el('div', 'lr', item.entity ? '' : 'bez entity');
    t.appendChild(note);

    if (clickable) {
      t.addEventListener('click', function () {
        if (ctx.onTap) ctx.onTap(item.entity);
      });
    }

    bind(item.entity, function (st) {
      var d = U.display(st, item);
      if (!item.name) name.textContent = U.name(st, '');
      lv.textContent = '';
      lv.classList.toggle('txt', isNaN(d.n));
      lv.appendChild(document.createTextNode(d.text));
      if (d.unit) lv.appendChild(el('small', '', d.unit));

      var level = U.level(d.n, item.levels);
      var has = item.levels && item.levels.length;
      stWord.textContent = has && d.has ? level.word : '';
      stWord.style.color = level.color;
      lv.style.color = has && d.has ? level.color : '';

      if (fill) {
        fill.style.width = U.pct(d.n, item.min, item.max) + '%';
        fill.style.background = has ? level.color : (accent || ACCENT.green);
      }
      var on = st && (st.state === 'on' || st.state === 'open' || st.state === 'playing'
                   || st.state === 'unlocked' || st.state === 'cleaning');
      t.classList.toggle('on', !!on);
      note.textContent = st ? U.ago(st.last_changed) : (item.entity ? 'entita v Home Assistantu není' : 'bez entity');
    });
    return t;
  }


  return { build: build, setSeg: setSeg, dialPaths: dialPaths };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Render;

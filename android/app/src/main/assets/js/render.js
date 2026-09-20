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

  /**
   * Krivka. Cary se kresli do SVG s pevnou soustavou 0-100, ktera se
   * roztahne na plochu (proto non-scaling-stroke v CSS), ale bod
   * posledni hodnoty a popisky stupnice jsou HTML - v roztazenem SVG by
   * se z kolecka stal ovál a z pisma paskvil.
   */
  function makeChart(opts) {
    opts = opts || {};
    var box = el('div', 'chartbox' + (opts.scales ? ' scaled' : ''));
    var svg = svgEl('svg', { 'class': 'chart', viewBox: '0 0 100 100',
                             preserveAspectRatio: 'none' });
    var grid = svgEl('g', { 'class': 'gridlines' });
    var area = svgEl('path', { 'class': 'area', d: '' });
    var line = svgEl('path', { 'class': 'line', d: '' });
    svg.appendChild(grid); svg.appendChild(area); svg.appendChild(line);
    box.appendChild(svg);

    var dot = el('i', 'cdot');
    box.appendChild(dot);

    var ylab = null, xlab = null;
    if (opts.scales) {
      ylab = el('div', 'cy');
      xlab = el('div', 'cx');
      box.appendChild(ylab);
      box.appendChild(xlab);
    }

    /** series = [{t,v}]; vraci skutecny rozsah hodnot, nebo null */
    function draw(series, hours, decimals) {
      hours = hours || 6;
      if (!series || series.length < 2) {
        area.setAttribute('d', '');
        line.setAttribute('d', '');
        grid.innerHTML = '';
        dot.style.display = 'none';
        if (ylab) ylab.innerHTML = '';
        if (xlab) xlab.innerHTML = '';
        return null;
      }
      var t1 = Date.now(), t0 = t1 - hours * 3600000;
      var lo = Infinity, hi = -Infinity;
      series.forEach(function (p) { if (p.v < lo) lo = p.v; if (p.v > hi) hi = p.v; });
      if (hi - lo < 1e-9) { hi = lo + 1; lo = lo - 1; }

      // Stupnice na kulatych cislech - "0, 20, 40" se cte lip nez
      // "3,7 az 9,94" a cary mrizky pak neco znamenaji.
      var step = niceStep((hi - lo) / 3);
      var LO = Math.floor(lo / step) * step;
      var HI = Math.ceil(hi / step) * step;
      if (HI - LO < step) HI = LO + step;

      var y = function (v) { return 100 - (v - LO) / (HI - LO) * 100; };
      var x = function (t) { return Math.max(0, Math.min(100, (t - t0) / (t1 - t0) * 100)); };

      var lines = '', ticks = [];
      for (var g = LO; g <= HI + step / 2; g += step) {
        var gy = y(g);
        if (gy < -0.1 || gy > 100.1) continue;
        lines += '<line class="grid" x1="0" x2="100" y1="' + gy.toFixed(2) + '" y2="' + gy.toFixed(2) + '"/>';
        ticks.push({ v: g, y: gy });
      }
      grid.innerHTML = lines;

      var d = '', px = 0, py = 0;
      for (var i = 0; i < series.length; i++) {
        var cx = x(series[i].t), cy = y(series[i].v);
        d += (i ? ' L ' : 'M ') + cx.toFixed(2) + ' ' + cy.toFixed(2);
        px = cx; py = cy;
      }
      line.setAttribute('d', d);
      area.setAttribute('d', d + ' L ' + px.toFixed(2) + ' 100 L ' + x(series[0].t).toFixed(2) + ' 100 Z');

      dot.style.display = '';
      dot.style.left = px + '%';
      dot.style.top = py + '%';

      if (ylab) {
        var yh = '';
        ticks.forEach(function (t) {
          yh += '<span style="top:' + t.y.toFixed(2) + '%">' + U.fmt(t.v, tickDecimals(step, decimals)) + '</span>';
        });
        ylab.innerHTML = yh;
      }
      if (xlab) {
        var mid = new Date((t0 + t1) / 2);
        xlab.innerHTML = '<span>' + U.clockTime(new Date(t0), false) + '</span>'
          + '<span>' + U.clockTime(mid, false) + '</span>'
          + '<span>teď</span>';
      }
      return { lo: lo, hi: hi, min: LO, max: HI };
    }

    return { el: box, draw: draw };
  }

  /**
   * Nazvy entit z Home Assistanta byvaji "fire_monitored_sensors".
   * Na klidove obrazovce je z toho pres celou sirku necitelna sipa,
   * tak se podtrzitka prevedou na mezery a delsi nazev se zkrati.
   */
  function cleanLabel(name) {
    var t = String(name || '').replace(/_/g, ' ').trim();
    if (t.length > 22) t = t.slice(0, 21).trim() + '\u2026';
    return t;
  }

  /**
   * Cim vic znaku, tim mensi pismo - jinak by se "4727" do kruhu
   * neveslo a skoncilo by jako "4...".
   */
  function fitClass(text) {
    var n = String(text || '').length;
    if (n >= 7) return ' l7';
    if (n >= 6) return ' l6';
    if (n >= 5) return ' l5';
    if (n >= 4) return ' l4';
    return '';
  }

  /** Krok stupnice na kulate cislo: 1, 2, 2,5, 5 nebo 10 krat mocnina deseti. */
  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    var exp = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var f = raw / exp;
    var mult = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return mult * exp;
  }

  /** Kolik desetinnych mist ma popisek stupnice, at neni "0,00". */
  function tickDecimals(step, decimals) {
    if (step >= 10) return 0;
    if (step >= 1) return decimals === null || decimals === undefined ? 0 : Math.min(1, decimals);
    if (step >= 0.1) return 1;
    return 2;
  }

  /**
   * Vlastni mrizka: kolik oken na radek (a volitelne kolik rad).
   * Bez nastaveni zustava vychozi rozvrzeni z CSS podle poctu oken.
   */
  function applyGrid(host, grid, count, defCols) {
    grid = grid || {};
    var cols = grid.cols || 0, rows = grid.rows || 0;
    if (!cols && !rows) return;
    if (!cols) cols = Math.min(defCols, Math.ceil(count / rows) || 1);
    host.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    if (rows) {
      host.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
      host.style.gridAutoRows = '1fr';
    }
    // Pet sekci ma v CSS zvlastni rozvrzeni (3 + 2 pres pul sirky);
    // pri rucnim nastaveni by prekazelo.
    host.classList.add('fixed');
    host.dataset.cols = cols;
  }

  /**
   * Dlouhy stisk (600 ms). Musi se pustit i pri posunu prstu, jinak by
   * okno vyskocilo pri kazdem sjeti po obrazovce.
   */
  function longPress(node, fn) {
    var timer = null, sx = 0, sy = 0;
    function start(x, y) {
      sx = x; sy = y;
      clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        node.classList.remove('held');
        fn();
      }, 600);
      node.classList.add('held');
    }
    function stop() {
      clearTimeout(timer);
      timer = null;
      node.classList.remove('held');
    }
    node.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: true });
    node.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) stop();
    }, { passive: true });
    node.addEventListener('touchend', stop, { passive: true });
    node.addEventListener('touchcancel', stop, { passive: true });
    node.addEventListener('mousedown', function (e) { start(e.clientX, e.clientY); });
    node.addEventListener('mouseup', stop);
    node.addEventListener('mouseleave', stop);
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
    // Opakovane obnovovani snimku z kamer; pri prestavbe se rusi.
    var timers = [];
    // Sekce, ktere plni data mimo stavy entit (predpoved, kalendar, ukoly).
    var feeds = [];
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

    if (layout.weather) {
      var wx = el('div', 'wx');
      var wxT = el('b', '', '--');
      var wxW = el('span', '', '');
      wx.appendChild(wxT);
      wx.appendChild(wxW);
      header.appendChild(wx);
      bind(layout.weather, function (st) {
        var w = U.weather(st);
        if (!w) { wxT.textContent = '--'; wxW.textContent = 'nedostupné'; return; }
        wxT.textContent = isNaN(w.temp) ? '--' : U.fmt(w.temp, 1) + ' ' + w.unit;
        wxW.textContent = w.word;
      });
    }

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
    // Ve zvetsene sekci zahlavi nepatri: hodiny, odznak spojeni i ozubene
    // kolo uz jsou vidleti na panelu pod nim a odznak by tu navic zamrzl
    // na "Spojuji" (zvetsena sekce se prekresluje jen jednou).
    if (!ctx.zoomed) host.appendChild(header);

    /* ---------- pruh upozorneni ---------- */
    var alertBar = el('div', '');
    alertBar.id = 'alert';
    alertBar.innerHTML = '<div class="al"><i></i><span class="alx">Upozornění</span></div>'
      + '<div class="at"><div class="af"></div></div>'
      + '<div class="ap"><span class="apv">0</span><small>%</small></div>'
      + '<div class="am">—</div>';
    if (!ctx.zoomed) host.appendChild(alertBar);

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

    /* ---------- stranky ----------
       Kazda stranka je jedna obrazovka panelu; prejizdi se mezi nimi
       prstem. Vsechny se postavi rovnou, takze prechod je jen posun -
       nic se pri prejeti nedopocitava. */
    var pages = layout.pages || [];
    var pagesEl = el('div', 'pages');
    var pageEls = [];
    pages.forEach(function (page, pi) {
      var pe = el('div', 'page');
      var mid = el('div', 'mid n' + Math.min(6, page.cards.length));
      applyGrid(mid, page.grid, page.cards.length, 3);
      page.cards.forEach(function (card, idx) {
        mid.appendChild(buildCard(card, idx, bind, ctx, graphs, timers, feeds));
      });
      if (page.cards.length) pe.appendChild(mid);

      var bot = el('div', 'bot n' + Math.min(4, page.panels.length));
      applyGrid(bot, page.panelGrid, page.panels.length, 4);
      page.panels.forEach(function (p, idx) {
        bot.appendChild(buildPanel(p, idx, bind, ctx, graphs, timers));
      });
      if (page.panels.length) pe.appendChild(bot);

      pageEls.push({ el: pe, mid: mid, bot: bot, page: page });
      pagesEl.appendChild(pe);
    });
    host.appendChild(pagesEl);

    /* Tecky stranek - jen kdyz je stranek vic. Zaroven slouzi jako
       tlacitka, at se da prepnout i bez prejeti prstem. */
    var dotsEl = null;
    if (pages.length > 1) {
      dotsEl = el('div', 'pdots');
      pages.forEach(function (page, i) {
        var d = el('i', '');
        d.title = page.name;
        d.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.onPage) ctx.onPage(i);
        });
        dotsEl.appendChild(d);
      });
      host.appendChild(dotsEl);
    }

    /** Prepne na stranku: posune pas a rozsviti spravnou tecku. */
    function showPage(index) {
      var n = pageEls.length;
      if (!n) return 0;
      var i = Math.max(0, Math.min(n - 1, index));
      pagesEl.style.transform = 'translateX(' + (-i * 100) + '%)';
      for (var j = 0; j < pageEls.length; j++) {
        pageEls[j].el.classList.toggle('on', j === i);
      }
      if (dotsEl) {
        for (var k = 0; k < dotsEl.children.length; k++) {
          dotsEl.children[k].classList.toggle('on', k === i);
        }
      }
      return i;
    }
    showPage(0);

    /* ---------- klidova obrazovka ----------
       Az ctyri hodnoty ve velkych kruzich. Popisek je uvnitr kruhu nad
       cislem, ne nad nim - dlouhy nazev entity jinak prelezl pres budik
       vedle. V karte pro Lovelace klidovy rezim nema smysl a nestavi se. */
    var aClock = null, aDate = null;
    if (!ctx.noAmbient) {
      var cells = (layout.ambient.cells || []).slice(0, 4);
      var amb = el('div', '');
      amb.id = 'ambient';
      aClock = el('div', 'aclock', '--:--');
      aDate = el('div', 'adate', '\u2014');
      amb.appendChild(aClock);
      amb.appendChild(aDate);

      if (cells.length) {
        var arow = el('div', 'arow c' + cells.length);
        cells.forEach(function (item) {
          var cell = el('div', 'acell');
          var lab = el('div', 'alabel', cleanLabel(item.name));
          var val = el('div', 'aval', '--');
          var unit = el('div', 'aunit', '');
          var state = el('div', 'astate', '\u2014');
          cell.appendChild(lab);
          cell.appendChild(val);
          cell.appendChild(unit);
          cell.appendChild(state);
          arow.appendChild(cell);
          bind(item.entity, function (st) {
            var d = U.display(st, item);
            if (!item.name) lab.textContent = cleanLabel(U.name(st, ''));
            val.textContent = d.text;
            val.className = 'aval' + (isNaN(d.n) ? ' txt' : fitClass(d.text));
            unit.textContent = d.unit;
            var lv = U.level(d.n, item.levels);
            state.textContent = d.has ? (item.levels.length ? lv.word : (d.word || '')) : 'Nedostupn\u00e9';
            state.style.color = item.levels.length ? lv.color : '#7f9db1';
          });
        });
        amb.appendChild(arow);
      }

      (layout.ambient.line || []).forEach(function (item) {
        var line = el('div', 'aline');
        var k = el('b', '', '');
        line.appendChild(document.createTextNode(''));
        line.appendChild(k);
        amb.appendChild(line);
        bind(item.entity, function (st) {
          var d = U.display(st, item);
          line.firstChild.nodeValue = (cleanLabel(U.name(st, item.name)) || '') + ': ';
          k.textContent = d.text + (d.unit ? ' ' + d.unit : '');
        });
      });

      var tag = el('div', 'atag');
      tag.appendChild(el('i'));
      tag.appendChild(document.createTextNode('Klidov\u00fd re\u017eim'));
      amb.appendChild(tag);
      host.appendChild(amb);
    }

    /* ---------- prazdny panel ---------- */
    if (!Layout.allCards(layout).length && !Layout.allPanels(layout).length) {
      var hint = el('div', 'pane panel anim');
      hint.style.gridColumn = '1 / -1';
      var inner = el('div', 'pempty');
      inner.innerHTML = 'Panel zatím nic neukazuje.<br>Klepni na ozubené kolo vpravo nahoře a vyber entity.';
      hint.appendChild(inner);
      var wrap = el('div', 'mid n1');
      wrap.appendChild(hint);
      if (pageEls.length) pageEls[0].el.appendChild(wrap);
      else host.insertBefore(wrap, alertBar.nextSibling);
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

    /**
     * Meritko uvnitr oken se odvodi od toho, jak velke okno doopravdy
     * je. Diky tomu sedne i pri rucne nastavene mrizce a na kazdem
     * pomeru stran - CSS trida n1..n6 uz jen urcuje vychozi rozlozeni.
     */
    function scale() {
      pageEls.forEach(function (pg) {
        fitScale(pg.mid, { cols: columnsOf(pg.mid, pg.page.cards.length, 3),
                           rows: rowsOf(pg.mid, pg.page.cards.length, pg.page.grid),
                           refW: 1150, refH: 840, min: 0.34, max: 1.12 });
        fitScale(pg.bot, { cols: columnsOf(pg.bot, pg.page.panels.length, 4),
                           rows: 1, refW: 1150, refH: 0, min: 0.5, max: 1 });
      });
    }

    /** Nova data odberu (predpoved, kalendar, ukoly). */
    function setFeed(kind, entity, data) {
      for (var i = 0; i < feeds.length; i++) {
        if (feeds[i].kind !== kind || feeds[i].entity !== entity) continue;
        try { feeds[i].draw(data); } catch (e) {}
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
      setFeed: setFeed,
      feeds: feeds,
      redraw: redraw,
      scale: scale,
      badge: badge,
      /** Zastavi obnovovani kamer - vola se pred prestavbou panelu. */
      destroy: function () {
        timers.forEach(function (t) { clearInterval(t); });
        timers.length = 0;
      },
      pages: pageEls.length,
      showPage: showPage,
      clock: { t: clockT, d: clockD, aTime: aClock, aDate: aDate }
    };
  }

  /* ---------- jedna sekce ----------
     Sekce ukazuje jednu hlavni hodnotu - a uzivatel si vybira, jak:
     budikem, sloupcem, krivkou nebo holym cislem. Vsechny ctyri mluvi
     stejne: velke cislo, jednotka a slovo o stavu. */
  function buildCard(card, idx, bind, ctx, graphs, timers, feeds) {
    var sec = el('section', 'pane card anim' + toneClass(card.tone));
    sec.style.animationDelay = (0.06 + idx * 0.08) + 's';

    var head = el('div', 'chead');
    if (card.code) head.appendChild(el('div', 'id', card.code));
    head.appendChild(el('div', 'nm', card.name || ''));
    var part = el('span', 'part', '');
    head.appendChild(part);
    sec.appendChild(head);

    // Klepnuti na sekci ji zvetsi pres celou obrazovku (v karte pro
    // Lovelace se nic takoveho nedeje - tam je mistem dashboard).
    if (ctx.onZoom && !ctx.zoomed) {
      sec.classList.add('zoomable');
      sec.addEventListener('click', function () { ctx.onZoom(card, sec); });
    }
    if (card.dial.entity && ctx.onDetail) {
      longPress(sec, function () { ctx.onDetail(card.dial.entity); });
    }
    bind(card.dial.entity, function (st) {
      // Jmeno entity vedle nadpisu jen tehdy, kdyz rika neco noveho -
      // dvakrat totez vedle sebe je jen sum.
      var ent = U.name(st, '') || '';
      part.textContent = ent.toLowerCase() === String(card.name || '').toLowerCase() ? '' : ent;
    });

    var accent = ACCENT[card.tone] || ACCENT.cyan;
    // Sekce bez ukazatelu a dlazdic ma jen hlavni hodnotu - at stoji
    // uprostred, ne nalepena vlevo s prazdnem vedle sebe.
    var solo = !(card.meters && card.meters.length) && !(card.tiles && card.tiles.length);
    var body = el('div', 'cbody' + (solo ? ' solo' : ''));
    body.appendChild(buildVisual(card, bind, accent, graphs, ctx, timers, feeds));

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
  function buildVisual(card, bind, accent, graphs, ctx, timers, feeds) {
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
      var chart = makeChart({ scales: true });
      var gempty = el('div', 'gempty', 'zatím bez historie');
      gbox.appendChild(chart.el);
      gbox.appendChild(gempty);
      wrap.appendChild(ghead);
      wrap.appendChild(gbox);

      graphs.push({
        entity: d.entity,
        hours: card.hours || 6,
        draw: function (series) {
          var r = chart.draw(series, card.hours || 6, d.decimals);
          gempty.style.display = r ? 'none' : '';
        }
      });

    } else if (view === 'camera') {
      // Snimek z kamery. Home Assistant posila adresu i s pristupovym
      // tokenem v atributu entity_picture, takze staci obrazek nacist -
      // proud videa by na levnem tabletu jen zral proud a pamet.
      wrap = el('div', 'camw');
      var img = el('img', 'cam');
      img.alt = card.name || 'kamera';
      var camNote = el('div', 'camnote', 'čekám na snímek');
      wrap.appendChild(img);
      wrap.appendChild(camNote);
      var lastSrc = '';
      var camTimer = null;

      var refreshCam = function (st) {
        var pic = st && st.attributes ? st.attributes.entity_picture : '';
        if (!pic) { camNote.style.display = ''; img.style.display = 'none'; return; }
        var base = (ctx.baseUrl || '').replace(/\/+$/, '');
        var url = /^https?:/.test(pic) ? pic : base + pic;
        // Cache-buster: bez nej by prohlizec ukazoval porad tyz snimek.
        img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
        lastSrc = url;
      };
      img.addEventListener('load', function () {
        camNote.style.display = 'none';
        img.style.display = '';
      });
      img.addEventListener('error', function () {
        camNote.textContent = 'snímek se nenačetl';
        camNote.style.display = '';
        img.style.display = 'none';
      });

      setVisual = function () {};
      bind(d.entity, function (st) {
        if (!st) { camNote.textContent = 'entita není'; camNote.style.display = ''; return; }
        if (!lastSrc) refreshCam(st);
        if (!camTimer) {
          camTimer = setInterval(function () {
            // Prekreslovat jen kdyz je stranka videt - zhasnuty nebo
            // schovany panel nemusi tahat obrazky.
            if (document.hidden || document.body.classList.contains('oled-off')) return;
            var cur = ctx.states ? ctx.states(d.entity) : st;
            refreshCam(cur || st);
          }, Math.max(2, card.refresh || 10) * 1000);
          timers.push(camTimer);
        }
      });

    } else if (view === 'forecast' || view === 'calendar' || view === 'todo') {
      // Tri seznamy, ktere se lisi jen radkem: predpoved, kalendar, ukoly.
      wrap = el('div', 'listw v-' + view);
      var lhead = el('div', 'lhead');
      lhead.appendChild(capEl);
      lhead.appendChild(el('span', 'grow'));
      var lsum = el('span', 'lsum', '');
      lhead.appendChild(lsum);
      var rows = el('div', 'lrows');
      var lempty = el('div', 'lwait', 'čekám na data');
      wrap.appendChild(lhead);
      wrap.appendChild(rows);
      wrap.appendChild(lempty);
      if (!capEl.textContent) {
        capEl.textContent = view === 'forecast' ? 'Předpověď'
          : (view === 'calendar' ? 'Kalendář' : 'Seznam');
      }

      feeds.push({
        kind: view, entity: d.entity,
        draw: function (data) {
          rows.innerHTML = '';
          var list = view === 'forecast' ? Feeds.forecastRows(data, card.count)
            : (view === 'calendar' ? Feeds.eventRows(data, card.count)
                                   : Feeds.todoRows(data, card.count));
          lempty.style.display = list.length ? 'none' : '';
          if (!list.length && data) lempty.textContent = view === 'todo' ? 'nic nezbývá' : 'nic dalšího';
          lsum.textContent = view === 'todo' && data ? list.length + ' položek' : '';

          list.forEach(function (r) {
            var row = el('div', 'lrow');
            if (view === 'forecast') {
              row.appendChild(el('b', 'lday', r.day));
              row.appendChild(el('span', 'lname', r.word));
              var t = el('span', 'ltemp');
              t.appendChild(el('b', '', isNaN(r.hi) ? '--' : U.fmt(r.hi, 0) + '°'));
              t.appendChild(el('i', '', isNaN(r.lo) ? '' : U.fmt(r.lo, 0) + '°'));
              row.appendChild(t);
              if (!isNaN(r.rain) && r.rain > 0) {
                row.appendChild(el('span', 'lrain', U.fmt(r.rain, 0) + ' %'));
              }
            } else if (view === 'calendar') {
              row.appendChild(el('b', 'lwhen', r.when));
              row.appendChild(el('span', 'lname', r.name));
            } else {
              var box = el('i', 'lbox');
              row.appendChild(box);
              row.appendChild(el('span', 'lname', r.name));
              // Klepnuti odskrtne polozku - to je to jedine, co u seznamu
              // na zdi clovek dela.
              row.classList.add('tapable');
              row.addEventListener('click', function (e) {
                e.stopPropagation();
                if (ctx.onTodo) ctx.onTodo(d.entity, r);
                row.classList.add('done');
              });
            }
            rows.appendChild(row);
          });
        }
      });

      // Stav entity doplni cislo do zahlavi (teplota, pocet ukolu).
      bind(d.entity, function (st) {
        if (view !== 'forecast') return;
        var w = U.weather(st);
        nEl.textContent = w && !isNaN(w.temp) ? U.fmt(w.temp, 1) : '--';
        uEl.textContent = w ? w.unit : '';
        stEl.textContent = w ? w.word : '';
        stEl.style.color = '#9fb6c4';
      });
      if (view === 'forecast') {
        lhead.insertBefore(stEl, lsum);
        lhead.insertBefore(uEl, stEl);
        lhead.insertBefore(nEl, uEl);
      }

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

    // Seznamy si cislo v zahlavi plni samy (teplota, pocet polozek) -
    // spolecna vazba by jim ho prepsala stavem entity ("Partlycloudy").
    var listView = ['forecast', 'calendar', 'todo'].indexOf(view) >= 0;
    if (!listView) bind(d.entity, function (st) {
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

  /** Mala krivka bez stupnic - do dlazdice i do ukazatele. */
  function addSpark(host, item, graphs) {
    var box = el('div', 'spark');
    var chart = makeChart();
    box.appendChild(chart.el);
    host.appendChild(box);
    if (graphs) {
      graphs.push({
        entity: item.entity,
        hours: item.hours || 6,
        draw: function (series) { chart.draw(series, item.hours || 6, item.decimals); }
      });
    }
    return chart;
  }

  /**
   * Nahled kamery v dlazdici. Stejne jako u sekce jen snimek, ktery se
   * sam obnovuje - klepnutim se zvetsi.
   */
  function addCamTile(host, item, ctx, timers) {
    var box = el('div', 'camthumb');
    var img = el('img', '');
    img.alt = item.name || 'kamera';
    box.appendChild(img);
    host.appendChild(box);

    function refresh() {
      if (document.hidden || document.body.classList.contains('oled-off')) return;
      var st = ctx.states ? ctx.states(item.entity) : null;
      var pic = st && st.attributes ? st.attributes.entity_picture : '';
      if (!pic) return;
      var base = (ctx.baseUrl || '').replace(/\/+$/, '');
      var url = /^https?:/.test(pic) ? pic : base + pic;
      img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
    }
    refresh();
    var timer = setInterval(refresh, Math.max(5, item.hours || 10) * 1000);
    if (timers) timers.push(timer);
    img.refresh = refresh;
    return img;
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
  function buildPanel(panel, idx, bind, ctx, graphs, timers) {
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
      row.appendChild(buildPanelItem(item, bind, ctx, accent, graphs, timers));
    });
    sec.appendChild(row);
    return sec;
  }

  function buildPanelItem(item, bind, ctx, accent, graphs, timers) {
    // Znacka "tohle jde prepnout" patri jen tomu, co se opravdu prepina.
    // Karta v Lovelace navic necha klepnout na cokoli - u cidla se otevre
    // podrobnost, jak je v Home Assistantu zvykem.
    var tappable = item.tap === 'toggle' || item.tap === 'detail'
                || (item.tap === 'auto' && U.switchable(item.entity));
    var clickable = tappable || (ctx.tapAll && item.entity && item.tap !== 'none');
    var t = el('div', 'lt' + (tappable ? ' act' : ''));
    var lk = el('div', 'lk');
    var name = el('span', '', item.name || '');
    var stWord = el('span', 'lst', '');
    lk.appendChild(name); lk.appendChild(stWord);
    var lv = el('div', 'lv', '--');
    t.appendChild(lk); t.appendChild(lv);

    var fill = null, camImg = null;
    if (item.view === 'bar') {
      var track = el('div', 'track');
      fill = el('div', 'fill');
      track.appendChild(fill);
      t.appendChild(track);
    } else if (item.view === 'graph') {
      addSpark(t, item, graphs);
    } else if (item.view === 'camera') {
      t.classList.add('camtile');
      camImg = addCamTile(t, item, ctx, timers);
    }
    var note = el('div', 'lr', item.entity ? '' : 'bez entity');
    t.appendChild(note);

    if (clickable) {
      t.addEventListener('click', function () {
        if (ctx.onTap) ctx.onTap(item.entity, item);
      });
    }
    // Dlouhy stisk otevre okno s ovladanim - stejny zvyk jako v Home
    // Assistantu, takze u nej clovek nemusi nic hledat.
    if (item.entity && ctx.onDetail) longPress(t, function () { ctx.onDetail(item.entity); });

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
      // Prvni snimek az ve chvili, kdy je znamy stav kamery - adresa
      // se bere z jeho atributu.
      if (camImg && st && !camImg.src) camImg.refresh();
      var on = st && (st.state === 'on' || st.state === 'open' || st.state === 'playing'
                   || st.state === 'unlocked' || st.state === 'cleaning');
      t.classList.toggle('on', !!on);
      note.textContent = st ? U.ago(st.last_changed) : (item.entity ? 'entita v Home Assistantu není' : 'bez entity');
    });
    return t;
  }


  /* Kolik sloupcu mrizka opravdu ma - bud rucne nastavenych, nebo tolik,
     kolik jich CSS poskladalo. */
  function columnsOf(host, count, max) {
    if (!host) return 1;
    if (host.dataset && host.dataset.cols) return parseInt(host.dataset.cols, 10) || 1;
    try {
      var tpl = getComputedStyle(host).gridTemplateColumns;
      var n = tpl ? tpl.split(' ').filter(function (x) { return x && x !== 'none'; }).length : 0;
      if (n) return n;
    } catch (e) {}
    return Math.min(max, count || 1);
  }

  function rowsOf(host, count, grid) {
    if (grid && grid.rows) return grid.rows;
    var cols = columnsOf(host, count, 3);
    return Math.max(1, Math.ceil((count || 1) / cols));
  }

  function fitScale(host, o) {
    if (!host || !host.clientWidth) return;
    var gap = 16;
    var w = (host.clientWidth - gap * (o.cols - 1)) / o.cols;
    var k = w / o.refW;
    if (o.refH) {
      var h = (host.clientHeight - gap * (o.rows - 1)) / o.rows;
      k = Math.min(k, h / o.refH);
    }
    if (!isFinite(k) || k <= 0) return;
    host.style.setProperty('--k', Math.max(o.min, Math.min(o.max, k)).toFixed(3));
  }

  return { build: build, setSeg: setSeg, dialPaths: dialPaths, fitScale: fitScale,
           makeChart: makeChart };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Render;

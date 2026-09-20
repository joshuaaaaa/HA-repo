/* ------------------------------------------------------------------
   Editor panelu primo v panelu.

   Co umi: pridat a odebrat sekci nebo panel, prejmenovat je, vybrat
   entity ze seznamu, ktery prisel z Home Assistantu, nastavit rozsah
   budiku a stupne (slovo + barva) a ulozit rozvrzeni do aplikace.

   Zamerne nema zadne ukladani "za pochodu": dokud uzivatel neklepne na
   Uložit, hraje si s kopii a puvodni panel bezi dal.
   ------------------------------------------------------------------ */
'use strict';

var Editor = (function () {

  var root, body, tabsBar;
  var draft = null;        // kopie rozvrzeni, na ktere se pracuje
  var states = {};         // aktualni stavy z Home Assistantu
  var saveCb = null;
  var tab = 'cards';

  var TONE_NAMES = { cyan: 'Modrá', amber: 'Oranžová', green: 'Zelená', violet: 'Fialová', red: 'Červená' };
  var LEVEL_NAMES = { good: 'V pořádku', warning: 'Zvýšené', serious: 'Vysoké', critical: 'Kritické', info: 'Informace', idle: 'Neutrální' };
  var TAP_NAMES = { auto: 'Podle druhu entity', none: 'Nic (jen ukazuje)', toggle: 'Přepnout' };
  var CARD_VIEW_NAMES = { gauge: 'Budík', bar: 'Sloupec', graph: 'Graf (křivka)', number: 'Jen číslo' };
  var ITEM_VIEW_NAMES = { value: 'Jen hodnota', bar: 'Pruh', graph: 'Křivka' };
  var HOURS = { 1: '1 hodina', 3: '3 hodiny', 6: '6 hodin', 12: '12 hodin',
                24: '24 hodin', 48: '2 dny', 72: '3 dny' };

  /* ---------- drobne stavebni dily ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function btn(label, cls, fn) {
    var b = el('button', 'ebtn ' + (cls || ''), label);
    b.addEventListener('click', fn);
    return b;
  }

  function field(label, value, onInput, type, extraClass) {
    var f = el('div', 'efield' + (extraClass ? ' ' + extraClass : ''));
    f.appendChild(el('label', '', label));
    var i = el('input');
    i.type = type || 'text';
    i.value = (value === null || value === undefined) ? '' : value;
    i.addEventListener('input', function () { onInput(i.value); });
    f.appendChild(i);
    return f;
  }

  function select(label, value, options, onChange) {
    var f = el('div', 'efield');
    f.appendChild(el('label', '', label));
    var s = el('select');
    Object.keys(options).forEach(function (k) {
      var o = el('option', '', options[k]);
      o.value = k;
      if (k === value) o.selected = true;
      s.appendChild(o);
    });
    s.addEventListener('change', function () { onChange(s.value); });
    f.appendChild(s);
    return f;
  }

  /** Radek s vyberem entity - klepnutim se otevre seznam z Home Assistantu. */
  function entityField(label, entityId, onPick) {
    var f = el('div', 'efield wide');
    f.appendChild(el('label', '', label));
    var wrap = el('div', 'epick');
    var name = el('div', 'name' + (entityId ? '' : ' empty'));
    var b = el('b', '', entityId ? U.name(states[entityId], '') || entityId : 'vybrat entitu…');
    var i = el('i', '', entityId || '');
    name.appendChild(b); name.appendChild(i);
    name.addEventListener('click', function () {
      pick(entityId, function (picked) {
        onPick(picked);
        render();
      });
    });
    wrap.appendChild(name);
    if (entityId) {
      wrap.appendChild(btn('×', 'bad sm', function () { onPick(''); render(); }));
    }
    f.appendChild(wrap);
    return f;
  }

  function moveBtns(list, index, after) {
    var box = el('div', 'ord');
    var up = el('button', '', '▲');
    up.addEventListener('click', function () {
      if (index <= 0) return;
      var t = list[index - 1]; list[index - 1] = list[index]; list[index] = t;
      (after || render)();
    });
    var down = el('button', '', '▼');
    down.addEventListener('click', function () {
      if (index >= list.length - 1) return;
      var t = list[index + 1]; list[index + 1] = list[index]; list[index] = t;
      (after || render)();
    });
    box.appendChild(up); box.appendChild(down);
    return box;
  }

  function row() {
    var r = el('div', 'erow');
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) r.appendChild(arguments[i]);
    return r;
  }

  /* ---------- stranky editoru ---------- */

  function pageCards() {
    var page = el('div', 'epage' + (tab === 'cards' ? ' on' : ''));
    page.appendChild(el('div', 'ehint',
      'Sekce je hlavní hodnota s ukazateli vedle. Zobrazit ji jde budíkem, '
      + 'sloupcem, křivkou nebo jen velkým číslem. Panel unese šest sekcí — '
      + 'čím víc jich je, tím menší okna, o tom rozhoduješ ty.'));

    draft.cards.forEach(function (card, idx) {
      var block = el('div', 'eblock');
      var h = el('h3');
      h.appendChild(document.createTextNode(card.name || 'Sekce'));
      h.appendChild(el('span', 'grow'));
      h.appendChild(moveBtns(draft.cards, idx));
      h.appendChild(btn('Smazat', 'bad sm', function () {
        draft.cards.splice(idx, 1); render();
      }));
      block.appendChild(h);

      var inner = el('div', 'inner');
      inner.appendChild(row(
        field('Název sekce', card.name, function (v) { card.name = v; }),
        field('Zkratka (2 znaky)', card.code, function (v) { card.code = v.slice(0, 4); }),
        select('Barva', card.tone, TONE_NAMES, function (v) { card.tone = v; render(); })
      ));
      var viewRow = [select('Zobrazení', card.view, CARD_VIEW_NAMES, function (v) {
        card.view = v; render();
      })];
      if (card.view === 'graph') {
        viewRow.push(select('Křivka za', String(card.hours), HOURS, function (v) {
          card.hours = parseInt(v, 10);
        }));
      }
      inner.appendChild(row.apply(null, viewRow));

      inner.appendChild(el('div', 'ehint', 'Hlavní hodnota na budíku:'));
      inner.appendChild(row(entityField('Entita budíku', card.dial.entity, function (e) {
        card.dial.entity = e;
        if (e && states[e]) {
          var s = U.suggest(states[e]);
          if (!card.dial.caption) card.dial.caption = s.caption;
          if (!card.name || card.name === 'Nová sekce') card.name = (U.name(states[e], '') || '').toUpperCase();
          card.dial.min = s.min; card.dial.max = s.max;
          card.dial.decimals = s.decimals;
          if (!card.dial.levels.length) card.dial.levels = s.levels;
        }
      })));
      inner.appendChild(row(
        field('Popisek nad číslem', card.dial.caption, function (v) { card.dial.caption = v; }),
        field('Jednotka (prázdné = z HA)', card.dial.unit, function (v) { card.dial.unit = v; }),
        field('Desetinná místa', card.dial.decimals, function (v) {
          card.dial.decimals = v === '' ? null : parseInt(v, 10);
        }, 'number')
      ));
      if (card.view === 'gauge' || card.view === 'bar') {
        inner.appendChild(row(
          field(card.view === 'bar' ? 'Sloupec od' : 'Budík od', card.dial.min,
                function (v) { card.dial.min = parseFloat(v); }, 'number'),
          field(card.view === 'bar' ? 'Sloupec do' : 'Budík do', card.dial.max,
                function (v) { card.dial.max = parseFloat(v); }, 'number')
        ));
      } else if (card.view === 'graph') {
        inner.appendChild(el('div', 'ehint',
          'Svislý rozsah křivky se řídí naměřenými hodnotami — krajní hodnoty '
          + 'jsou napsané u okraje grafu.'));
      }
      inner.appendChild(levelsEditor(card.dial, states[card.dial.entity]));

      inner.appendChild(el('div', 'ehint', 'Ukazatele vedle hlavní hodnoty (nejvýš čtyři):'));
      inner.appendChild(itemList(card.meters, { bar: true, max: 4 }));

      inner.appendChild(el('div', 'ehint', 'Malé dlaždice pod ukazateli (nejvýš šest):'));
      inner.appendChild(itemList(card.tiles, { max: 6 }));

      block.appendChild(inner);
      page.appendChild(block);
    });

    if (draft.cards.length < Layout.MAX_CARDS) {
      page.appendChild(btn('+ Přidat sekci', 'ghost', function () {
        draft.cards.push(Layout.newCard()); render();
      }));
    }
    return page;
  }

  function pagePanels() {
    var page = el('div', 'epage' + (tab === 'panels' ? ' on' : ''));
    page.appendChild(el('div', 'ehint',
      'Panel je řada dlaždic dole; vejdou se čtyři panely vedle sebe. '
      + 'Světla a zásuvky jdou klepnutím rovnou přepnout.'));

    draft.panels.forEach(function (p, idx) {
      var block = el('div', 'eblock');
      var h = el('h3');
      h.appendChild(document.createTextNode(p.name || 'Panel'));
      h.appendChild(el('span', 'grow'));
      h.appendChild(moveBtns(draft.panels, idx));
      h.appendChild(btn('Smazat', 'bad sm', function () { draft.panels.splice(idx, 1); render(); }));
      block.appendChild(h);

      var inner = el('div', 'inner');
      inner.appendChild(row(
        field('Název panelu', p.name, function (v) { p.name = v; }),
        select('Barva', p.tone, TONE_NAMES, function (v) { p.tone = v; render(); })
      ));
      inner.appendChild(itemList(p.items, { max: 8, tap: true }));
      block.appendChild(inner);
      page.appendChild(block);
    });

    if (draft.panels.length < Layout.MAX_PANELS) {
      page.appendChild(btn('+ Přidat panel', 'ghost', function () {
        draft.panels.push(Layout.newPanel()); render();
      }));
    }
    return page;
  }

  function pageAmbient() {
    var page = el('div', 'epage' + (tab === 'ambient' ? ' on' : ''));
    page.appendChild(el('div', 'ehint',
      'Klidový režim naskočí, když před tabletem nikdo není: velké hodiny a nejvýš dvě hodnoty. '
      + 'Obraz se pomalu posouvá, aby se displej nevypálil.'));

    var block = el('div', 'eblock');
    block.appendChild(el('h3', '', 'Klidová obrazovka'));
    var inner = el('div', 'inner');

    ['left', 'right'].forEach(function (side) {
      var label = side === 'left' ? 'Levý kruh' : 'Pravý kruh';
      var item = draft.ambient[side];
      inner.appendChild(row(entityField(label, item ? item.entity : '', function (e) {
        if (!e) { draft.ambient[side] = null; return; }
        var it = Layout.newItem(e);
        it.name = (U.name(states[e], '') || '').toUpperCase();
        var s = U.suggest(states[e]);
        it.levels = s.levels;
        draft.ambient[side] = it;
      })));
      if (item) {
        inner.appendChild(row(field('Popisek ' + label.toLowerCase(), item.name, function (v) { item.name = v; })));
      }
    });

    inner.appendChild(el('div', 'ehint', 'Řádky pod kruhy (nejvýš tři):'));
    inner.appendChild(itemList(draft.ambient.line, { max: 3 }));
    block.appendChild(inner);
    page.appendChild(block);

    /* pruh upozorneni */
    var ab = el('div', 'eblock');
    ab.appendChild(el('h3', '', 'Pruh upozornění'));
    var ai = el('div', 'inner');
    ai.appendChild(el('div', 'ehint',
      'Když vybraná entita naskočí do zvoleného stavu, přes záhlaví přejede pruh. '
      + 'Hodí se na pračku, poplach nebo otevřená vrata.'));
    ai.appendChild(row(entityField('Entita upozornění', draft.alert ? draft.alert.entity : '', function (e) {
      draft.alert = e ? { entity: e, name: (U.name(states[e], '') || 'Upozornění'), on: 'on', note: '' } : null;
    })));
    if (draft.alert) {
      ai.appendChild(row(
        field('Nadpis pruhu', draft.alert.name, function (v) { draft.alert.name = v; }),
        field('Spustit při stavu', draft.alert.on, function (v) { draft.alert.on = v; }),
        field('Poznámka vpravo', draft.alert.note, function (v) { draft.alert.note = v; })
      ));
    }
    ab.appendChild(ai);
    page.appendChild(ab);
    return page;
  }

  function pageWhole() {
    var page = el('div', 'epage' + (tab === 'whole' ? ' on' : ''));

    var block = el('div', 'eblock');
    block.appendChild(el('h3', '', 'Záhlaví'));
    var inner = el('div', 'inner');
    inner.appendChild(el('div', 'ehint',
      'Prázdný název = v záhlaví zůstanou jen hodiny a stav spojení. '
      + 'Panel tak nenese žádnou značku.'));
    inner.appendChild(row(
      field('Název panelu', draft.title, function (v) { draft.title = v; }),
      field('Podtitulek', draft.subtitle, function (v) { draft.subtitle = v; })
    ));
    block.appendChild(inner);
    page.appendChild(block);

    var tools = el('div', 'eblock');
    tools.appendChild(el('h3', '', 'Rozvržení'));
    var ti = el('div', 'inner');
    ti.appendChild(el('div', 'ehint',
      'Sestavit z mých entit projde Home Assistant a připraví teploty, vlhkosti, '
      + 'baterie a světla. Pak už stačí dolaďovat.'));
    ti.appendChild(row(
      btn('Sestavit z mých entit', 'ghost', function () {
        draft = Layout.fromStates(states);
        render();
      }),
      btn('Vyprázdnit', 'warn', function () {
        draft = Layout.empty();
        render();
      })
    ));

    ti.appendChild(el('div', 'ehint', 'Záloha rozvržení (jde zkopírovat na druhý tablet):'));
    var ta = el('textarea', 'ejson');
    ta.value = JSON.stringify(Layout.normalize(draft), null, 1);
    ti.appendChild(ta);
    ti.appendChild(row(
      btn('Načíst z textu', 'ghost', function () {
        try {
          draft = Layout.normalize(JSON.parse(ta.value));
          render();
          toast('Rozvržení načteno.');
        } catch (e) {
          toast('Text není platné rozvržení.');
        }
      })
    ));
    tools.appendChild(ti);
    page.appendChild(tools);

    var ctrl = el('div', 'eblock');
    ctrl.appendChild(el('h3', '', 'Ovládání z Home Assistantu'));
    var ci = el('div', 'inner');
    ci.appendChild(el('div', 'ehint',
      'Nepovinné. Když v Home Assistantu vytvoříš přepínač (input_boolean) a číslo '
      + '(input_number 1–100), můžeš jimi z automatizací zhasínat panel a měnit jas — '
      + 'třeba zhasnout v noci nebo rozsvítit, když se otevřou dveře.'));
    ci.appendChild(row(entityField('Přepínač displeje', draft.control.screen, function (e) {
      draft.control.screen = e;
    })));
    ci.appendChild(row(entityField('Číslo pro jas (1–100)', draft.control.brightness, function (e) {
      draft.control.brightness = e;
    })));
    ctrl.appendChild(ci);
    page.appendChild(ctrl);

    var about = el('div', 'eblock');
    about.appendChild(el('h3', '', 'Aplikace'));
    var ai = el('div', 'inner');
    ai.appendChild(el('div', 'ehint',
      'Připojení k Home Assistantu, chování displeje, kamera a kiosek se nastavují '
      + 'v aplikaci — tlačítkem níž.'));
    ai.appendChild(row(btn('Otevřít nastavení aplikace', 'ghost', function () {
      if (window.Panel && Panel.openSettings) Panel.openSettings();
      else toast('Nastavení aplikace je jen v tabletu.');
    })));
    about.appendChild(ai);
    page.appendChild(about);
    return page;
  }

  /* ---------- seznam polozek (ukazatele, dlazdice, radky) ---------- */

  function itemList(list, opts) {
    opts = opts || {};
    var box = el('div', 'elist');

    list.forEach(function (item, idx) {
      var it = el('div', 'eitem');
      it.appendChild(moveBtns(list, idx));

      var grow = el('div', 'grow');
      grow.appendChild(row(
        entityField('Entita', item.entity, function (e) {
          item.entity = e;
          if (e && states[e]) {
            var s = U.suggest(states[e]);
            if (!item.name) item.name = U.name(states[e], '');
            if (item.view === 'bar') { item.min = s.min; item.max = s.max; }
            if (!item.levels.length) item.levels = s.levels;
          }
        })
      ));
      var f = [field('Popisek', item.name, function (v) { item.name = v; }),
               field('Jednotka', item.unit, function (v) { item.unit = v; }),
               field('Des. místa', item.decimals, function (v) {
                 item.decimals = v === '' ? null : parseInt(v, 10);
               }, 'number')];
      if (opts.tap) {
        f.push(select('Klepnutí', item.tap, TAP_NAMES, function (v) { item.tap = v; }));
      }
      grow.appendChild(row.apply(null, f));

      var viewSel = [select('Zobrazení', item.view, ITEM_VIEW_NAMES, function (v) {
        item.view = v; render();
      })];
      if (item.view === 'bar') {
        viewSel.push(field('Pruh od', item.min, function (v) { item.min = parseFloat(v); }, 'number'));
        viewSel.push(field('Pruh do', item.max, function (v) { item.max = parseFloat(v); }, 'number'));
      } else if (item.view === 'graph') {
        viewSel.push(select('Křivka za', String(item.hours), HOURS, function (v) {
          item.hours = parseInt(v, 10);
        }));
      }
      grow.appendChild(row.apply(null, viewSel));
      grow.appendChild(levelsEditor(item, states[item.entity]));
      it.appendChild(grow);

      it.appendChild(btn('×', 'bad sm', function () { list.splice(idx, 1); render(); }));
      box.appendChild(it);
    });

    if (!opts.max || list.length < opts.max) {
      box.appendChild(btn('+ Přidat', 'ghost sm', function () {
        var item = Layout.newItem('');
        if (opts.bar) item.view = 'bar';
        list.push(item);
        render();
      }));
    }
    return box;
  }

  /* ---------- stupne (slovo + barva) ---------- */

  function levelsEditor(target, st) {
    var box = el('div', '');
    var head = el('div', 'ehint', target.levels.length
      ? 'Stupně: hodnota do které platí, slovo a barva. Poslední řádek bez čísla platí pro zbytek.'
      : 'Bez stupňů se ukáže jen hodnota. Stupeň přidá slovo (V pořádku, Vysoké…) a barvu.');
    box.appendChild(head);

    target.levels.forEach(function (lv, i) {
      var r = el('div', 'erow');
      r.appendChild(field('Do hodnoty', lv.to === null ? '' : lv.to, function (v) {
        lv.to = v === '' ? null : parseFloat(v);
      }, 'number'));
      r.appendChild(select('Stupeň', lv.tone, LEVEL_NAMES, function (v) { lv.tone = v; }));
      r.appendChild(field('Slovo', lv.label, function (v) { lv.label = v; }));
      var x = btn('×', 'bad sm', function () { target.levels.splice(i, 1); render(); });
      var wrap = el('div', 'efield');
      wrap.appendChild(el('label', '', ' '));
      wrap.appendChild(x);
      r.appendChild(wrap);
      box.appendChild(r);
    });

    var tools = el('div', 'erow');
    if (target.levels.length < 5) {
      tools.appendChild(btn('+ Stupeň', 'ghost sm', function () {
        target.levels.push({ to: null, tone: 'good', label: '' });
        render();
      }));
    }
    if (st) {
      tools.appendChild(btn('Navrhnout podle čidla', 'ghost sm', function () {
        var s = U.suggest(st);
        target.levels = s.levels;
        if (target.min !== undefined) { target.min = s.min; target.max = s.max; }
        render();
      }));
    }
    if (target.levels.length) {
      tools.appendChild(btn('Zrušit stupně', 'warn sm', function () {
        target.levels = [];
        render();
      }));
    }
    box.appendChild(tools);
    return box;
  }

  /* ---------- vyber entity ---------- */

  var pickerEl, pickCb, pickDomain = '', pickQuery = '';

  function pick(current, cb) {
    pickCb = cb;
    pickQuery = '';
    // Zadna domena predem: kdyz uzivatel hleda "kuchyne", ma najit
    // svetlo i cidlo. Filtr domen si zapne sam, kdyz chce.
    pickDomain = '';
    buildPicker();
    pickerEl.classList.add('on');
  }

  function buildPicker() {
    if (!pickerEl) {
      pickerEl = el('div', '');
      pickerEl.id = 'picker';
      document.body.appendChild(pickerEl);
    }
    pickerEl.innerHTML = '';

    var bar = el('div', 'pbar');
    var input = el('input');
    input.type = 'search';
    input.placeholder = 'hledat entitu…';
    input.value = pickQuery;
    input.addEventListener('input', function () { pickQuery = input.value; fillList(); });
    bar.appendChild(input);
    bar.appendChild(btn('Zavřít', 'ghost sm', function () { pickerEl.classList.remove('on'); }));
    pickerEl.appendChild(bar);

    var doms = el('div', 'pdomains');
    var counts = {};
    Object.keys(states).forEach(function (id) {
      var d = U.domain(id);
      counts[d] = (counts[d] || 0) + 1;
    });
    var list = Object.keys(counts).sort();
    var all = el('div', 'pdom' + (pickDomain ? '' : ' on'), 'vše');
    all.addEventListener('click', function () { pickDomain = ''; buildPicker(); });
    doms.appendChild(all);
    list.forEach(function (d) {
      var c = el('div', 'pdom' + (pickDomain === d ? ' on' : ''), d + ' (' + counts[d] + ')');
      c.addEventListener('click', function () { pickDomain = d; buildPicker(); });
      doms.appendChild(c);
    });
    pickerEl.appendChild(doms);

    var listEl = el('div', 'plist');
    pickerEl.appendChild(listEl);

    function fillList() {
      listEl.innerHTML = '';
      var q = pickQuery.trim().toLowerCase();
      var ids = Object.keys(states).filter(function (id) {
        if (pickDomain && U.domain(id) !== pickDomain) return false;
        if (!q) return true;
        var st = states[id];
        return id.toLowerCase().indexOf(q) >= 0
            || String(U.name(st, '')).toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) {
        return String(U.name(states[a], '')).localeCompare(String(U.name(states[b], '')), 'cs');
      });

      if (!ids.length) {
        listEl.appendChild(el('div', 'pempty2', Object.keys(states).length
          ? 'Nic takového tu není.'
          : 'Zatím nemám seznam entit — panel ještě není spojený s Home Assistantem.'));
        return;
      }
      ids.slice(0, 400).forEach(function (id) {
        var st = states[id];
        var r = el('div', 'prow');
        var g = el('div', 'grow');
        g.appendChild(el('b', '', U.name(st, '')));
        g.appendChild(el('i', '', id));
        r.appendChild(g);
        var d = U.display(st, {});
        r.appendChild(el('div', 'val', d.text + (d.unit ? ' ' + d.unit : '')));
        r.addEventListener('click', function () {
          pickerEl.classList.remove('on');
          if (pickCb) pickCb(id);
        });
        listEl.appendChild(r);
      });
      if (ids.length > 400) {
        listEl.appendChild(el('div', 'pempty2', 'Zobrazeno prvních 400 — zpřesni hledání.'));
      }
    }
    fillList();
  }

  /* ---------- kostra ---------- */

  function buildShell() {
    root = document.getElementById('editor');
    root.innerHTML = '';

    var bar = el('div', 'ebar');
    bar.appendChild(el('h1', '', 'Úprava panelu'));
    bar.appendChild(el('div', 'grow'));
    bar.appendChild(btn('Zrušit', 'ghost', function () { close(); }));
    bar.appendChild(btn('Uložit', '', function () {
      var clean = Layout.normalize(draft);
      close();
      if (saveCb) saveCb(clean);
    }));
    root.appendChild(bar);

    tabsBar = el('div', 'etabs');
    [['cards', 'Sekce'], ['panels', 'Panely'], ['ambient', 'Klid'], ['whole', 'Celek']]
      .forEach(function (t) {
        var e = el('div', 'etab' + (tab === t[0] ? ' on' : ''), t[1]);
        e.addEventListener('click', function () { tab = t[0]; render(); });
        tabsBar.appendChild(e);
      });
    root.appendChild(tabsBar);

    body = el('div', 'ebody');
    root.appendChild(body);
  }

  function render() {
    var scroll = body ? body.scrollTop : 0;
    buildShell();
    body.appendChild(pageCards());
    body.appendChild(pagePanels());
    body.appendChild(pageAmbient());
    body.appendChild(pageWhole());
    body.scrollTop = scroll;
  }

  function toast(m) {
    if (window.panelToast) window.panelToast(m);
  }

  function open(layout, haStates, onSave) {
    draft = Layout.normalize(JSON.parse(JSON.stringify(layout || {})));
    states = haStates || {};
    saveCb = onSave;
    document.body.classList.add('editing');
    render();
  }

  function close() {
    document.body.classList.remove('editing');
    if (pickerEl) pickerEl.classList.remove('on');
  }

  function isOpen() { return document.body.classList.contains('editing'); }

  return { open: open, close: close, isOpen: isOpen };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Editor;

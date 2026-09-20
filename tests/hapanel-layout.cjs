/* Rozvrzeni panelu: cokoli prijde (i z ciziho tabletu nebo z rucne
   upraveneho JSONu), musi z normalize() vyjit tak, aby panel nespadl. */
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.join(__dirname, '../android/app/src/main/assets/js');
global.U = require(path.join(base, 'util.js'));
const Layout = require(path.join(base, 'layout.js'));

/* --- nesmysly na vstupu --- */
let l = Layout.normalize(null);
assert.equal(l.pages.length, 1, 'panel ma vzdy aspon jednu stranku');
assert.equal(l.pages[0].cards.length, 0);
assert.ok(l.ambient && l.control, 'prazdne rozvrzeni ma vsechny casti');

l = Layout.normalize('{"title":"Dům"}');
assert.equal(l.title, 'Dům', 'normalize bere i text');
assert.equal(Layout.normalize('tohle neni json').title, '', 'rozbity text nezpusobi vyjimku');

l = Layout.normalize({ cards: new Array(9).fill({}), panels: new Array(9).fill({}) });
assert.equal(l.pages[0].cards.length, Layout.MAX_CARDS, 'sekci je nejvys sest');
assert.equal(l.pages[0].panels.length, Layout.MAX_PANELS, 'panelu nejvys ctyri');

/* --- stranky --- */
l = Layout.normalize({ cards: [{ dial: { entity: 'sensor.a' } }], grid: { cols: 2 } });
assert.equal(l.pages.length, 1, 'starsi rozvrzeni bez stranek se prevede na jednu');
assert.equal(l.pages[0].grid.cols, 2, 'i s jejim rozlozenim');
assert.deepEqual(Layout.normalize({ pages: new Array(9).fill({}) }).pages.length, Layout.MAX_PAGES,
  'stranek je nejvys pet');
l = Layout.normalize({ pages: [
  { name: 'Domov', cards: [{ dial: { entity: 'sensor.a' } }] },
  { name: 'Kamery', cards: [{ view: 'camera', dial: { entity: 'camera.dvere' } }] }
] });
assert.deepEqual(l.pages.map(p => p.name), ['Domov', 'Kamery']);
assert.equal(l.pages[1].cards[0].view, 'camera', 'kamera je platny zpusob zobrazeni');
assert.equal(Layout.allCards(l).length, 2, 'allCards vidi sekce napric strankami');
assert.deepEqual(Layout.entities(l).sort(), ['camera.dvere', 'sensor.a'],
  'entity se sbiraji ze vsech stranek');

/* --- zvonek u dveri --- */
l = Layout.normalize({ doorbell: { camera: 'camera.dvere', trigger: 'binary_sensor.zvonek', seconds: 999 } });
assert.equal(l.doorbell.seconds, 300, 'doba zobrazeni ma strop');
assert.ok(Layout.entities(l).indexOf('binary_sensor.zvonek') >= 0);
assert.equal(Layout.normalize({ doorbell: { camera: 'camera.a' } }).doorbell, null,
  'zvonek bez cidla se neuklada');

/* --- zpusob zobrazeni --- */
l = Layout.normalize({ cards: [
  { view: 'graph', hours: 500, dial: { entity: 'sensor.a' } },
  { view: 'vymysl', dial: { entity: 'sensor.b' } }
] });
assert.equal(l.pages[0].cards[0].view, 'graph');
assert.equal(l.pages[0].cards[0].hours, 72, 'delka krivky ma strop');
assert.equal(l.pages[0].cards[1].view, 'gauge', 'neznamy zpusob zobrazeni = budik');

l = Layout.normalize({ panels: [{ items: [
  { entity: 'sensor.a', bar: true },        // starsi zapis
  { entity: 'sensor.b', view: 'graph' },
  { entity: 'sensor.c' }
] }] });
assert.deepEqual(l.pages[0].panels[0].items.map(i => i.view), ['bar', 'graph', 'value'],
  '"bar: true" znamena totez co view: bar');
assert.equal(Layout.normalize({ cards: [{ meters: [{ entity: 'sensor.a' }] }] })
  .pages[0].cards[0].meters[0].view, 'bar', 'ukazatel vedle hlavni hodnoty ma pruh');

/* --- ktere entity chteji historii --- */
l = Layout.normalize({
  cards: [{ view: 'graph', hours: 12, dial: { entity: 'sensor.a' } },
           { dial: { entity: 'sensor.b' }, tiles: [{ entity: 'sensor.a', view: 'graph', hours: 24 }] }],
  panels: [{ items: [{ entity: 'sensor.c', view: 'graph', hours: 3 },
                     { entity: 'sensor.d' }] }]
});
const g = Layout.graphed(l);
assert.deepEqual(g.map(x => x.entity).sort(), ['sensor.a', 'sensor.c']);
assert.equal(g.find(x => x.entity === 'sensor.a').hours, 24,
  'jedna entita na dvou mistech si rekne o delsi okno');
assert.equal(Layout.graphed(Layout.empty()).length, 0, 'bez krivek se server neptá');

/* --- rozsah budiku --- */
l = Layout.normalize({ cards: [{ dial: { entity: 'sensor.t', min: 30, max: 10 } }] });
assert.ok(l.pages[0].cards[0].dial.max > l.pages[0].cards[0].dial.min, 'prohozeny rozsah se narovna');

/* --- stupne --- */
l = Layout.normalize({ cards: [{ dial: { entity: 'sensor.t', levels: [
  { to: null, tone: 'critical', label: 'Horko' },
  { to: 24, tone: 'good', label: 'Fajn' },
  { to: 18, tone: 'info', label: 'Chladno' }] } }] });
const lv = l.pages[0].cards[0].dial.levels;
assert.deepEqual(lv.map(x => x.to), [18, 24, null], 'prahy jdou vzestupne, otevreny konec je posledni');
assert.equal(Layout.normalize({ cards: [{ dial: { levels: [{ to: 5, tone: 'nesmysl' }] } }] })
  .pages[0].cards[0].dial.levels[0].tone, 'good', 'neznamy stupen se nahradi');

/* --- polozky --- */
const item = Layout.newItem('sensor.x');
assert.ok(Array.isArray(item.levels), 'nova polozka ma stupne (editor na nich stoji)');
assert.equal(Layout.normalize({ panels: [{ items: [{ entity: 'light.a', tap: 'vymysl' }] }] })
  .pages[0].panels[0].items[0].tap, 'auto', 'neznama akce klepnuti se nahradi');

/* --- seznam entit --- */
l = Layout.normalize({
  cards: [{ dial: { entity: 'sensor.a' }, meters: [{ entity: 'sensor.b' }], tiles: [{ entity: 'sensor.a' }] }],
  panels: [{ items: [{ entity: 'light.c' }] }],
  ambient: { left: { entity: 'sensor.d' }, line: [{ entity: 'sensor.e' }] },
  alert: { entity: 'binary_sensor.f' },
  control: { screen: 'input_boolean.g' }
});
assert.deepEqual(Layout.entities(l).sort(),
  ['binary_sensor.f', 'input_boolean.g', 'light.c', 'sensor.a', 'sensor.b', 'sensor.d', 'sensor.e'],
  'kazda entita jen jednou, ze vsech casti');

/* --- prvni rozvrzeni z toho, co v HA opravdu je --- */
const states = {
  'sensor.t1': { entity_id: 'sensor.t1', state: '21.5', attributes: { device_class: 'temperature', friendly_name: 'Obývák', unit_of_measurement: '°C' } },
  'sensor.t2': { entity_id: 'sensor.t2', state: '7.2', attributes: { device_class: 'temperature', friendly_name: 'Venku', unit_of_measurement: '°C' } },
  'sensor.h1': { entity_id: 'sensor.h1', state: '48', attributes: { device_class: 'humidity', friendly_name: 'Vlhkost' } },
  'sensor.b1': { entity_id: 'sensor.b1', state: '88', attributes: { device_class: 'battery', friendly_name: 'Čidlo' } },
  'light.k': { entity_id: 'light.k', state: 'on', attributes: { friendly_name: 'Kuchyně' } },
  'sensor.divny': { entity_id: 'sensor.divny', state: 'unavailable', attributes: {} }
};
const auto = Layout.fromStates(states);
assert.equal(auto.pages[0].cards.length, 2, 'dve teploty = dve sekce');
assert.equal(auto.pages[0].cards[0].dial.entity, 'sensor.t1');
assert.ok(auto.pages[0].cards[0].dial.levels.length, 'sekce dostane stupne, aby mela slovo');
assert.ok(auto.pages[0].panels.some(p => p.name === 'Baterie')
       && auto.pages[0].panels.some(p => p.name === 'Světla'));
assert.ok(auto.ambient.cells.length >= 2 && auto.ambient.cells[0].levels.length,
  'i klidovy rezim rika slovo, nejen cislo');
assert.equal(auto.title, '', 'panel nenese zadnou znacku');
assert.ok(!Layout.isEmpty(auto));
assert.ok(Layout.isEmpty(Layout.empty()));

/* --- klidovy rezim --- */
l = Layout.normalize({ ambient: { left: { entity: 'sensor.a', name: 'A' },
                                  right: { entity: 'sensor.b' } } });
assert.deepEqual(l.ambient.cells.map(c => c.entity), ['sensor.a', 'sensor.b'],
  'starsi zapis se dvema hodnotami se prevede na seznam');
l = Layout.normalize({ ambient: { cells: new Array(9).fill({ entity: 'sensor.a' }) } });
assert.equal(l.ambient.cells.length, Layout.MAX_AMBIENT, 'kruhu je nejvys ctyri');

l = Layout.ambientFallback(Layout.normalize({
  cards: [{ name: 'OBÝVÁK', dial: { entity: 'sensor.t', levels: [{ to: 20, tone: 'good', label: 'Fajn' }] } },
          { name: 'VENKU', dial: { entity: 'sensor.v' } }]
}));
assert.deepEqual(l.ambient.cells.map(c => c.name), ['OBÝVÁK', 'VENKU'],
  'bez vlastniho vyberu prevezme klidovy rezim hodnoty sekci');
assert.ok(l.ambient.cells[0].levels.length, 'i se stupni, aby rekl slovo');

l = Layout.ambientFallback(Layout.normalize({
  cards: [{ dial: { entity: 'sensor.t' } }], ambient: { auto: false }
}));
assert.equal(l.ambient.cells.length, 0, 'vypnute prebirani nic nedoplni');

l = Layout.ambientFallback(Layout.normalize({
  cards: [{ dial: { entity: 'sensor.t' } }], ambient: { cells: [{ entity: 'sensor.x' }] }
}));
assert.deepEqual(l.ambient.cells.map(c => c.entity), ['sensor.x'],
  'vlastni vyber ma prednost pred sekcemi');

/* --- mrizka --- */
l = Layout.normalize({ grid: { cols: 3, rows: 2 }, panelGrid: { cols: 4 } });
assert.deepEqual(l.pages[0].grid, { cols: 3, rows: 2 });
assert.equal(l.pages[0].panelGrid.cols, 4);
l = Layout.normalize({ grid: { cols: 9, rows: -1 }, panelGrid: { cols: 'x' } });
assert.deepEqual(l.pages[0].grid, { cols: 0, rows: 0 }, 'nesmyslny pocet = automaticky');
assert.equal(l.pages[0].panelGrid.cols, 0);

/* --- prazdny Home Assistant --- */
const nic = Layout.fromStates({});
assert.ok(Layout.isEmpty(nic), 'bez entit nevznikne prazdna sekce bez obsahu');

console.log('ok  hapanel-layout');

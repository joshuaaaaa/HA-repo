/* Rozvrzeni panelu: cokoli prijde (i z ciziho tabletu nebo z rucne
   upraveneho JSONu), musi z normalize() vyjit tak, aby panel nespadl. */
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.join(__dirname, '../android/app/src/main/assets/js');
global.U = require(path.join(base, 'util.js'));
const Layout = require(path.join(base, 'layout.js'));

/* --- nesmysly na vstupu --- */
let l = Layout.normalize(null);
assert.equal(l.cards.length, 0);
assert.ok(l.ambient && l.control, 'prazdne rozvrzeni ma vsechny casti');

l = Layout.normalize('{"title":"Dům"}');
assert.equal(l.title, 'Dům', 'normalize bere i text');
assert.equal(Layout.normalize('tohle neni json').title, '', 'rozbity text nezpusobi vyjimku');

l = Layout.normalize({ cards: new Array(9).fill({}), panels: new Array(9).fill({}) });
assert.equal(l.cards.length, Layout.MAX_CARDS, 'sekci je nejvys sest');
assert.equal(l.panels.length, Layout.MAX_PANELS, 'panelu nejvys ctyri');

/* --- zpusob zobrazeni --- */
l = Layout.normalize({ cards: [
  { view: 'graph', hours: 500, dial: { entity: 'sensor.a' } },
  { view: 'vymysl', dial: { entity: 'sensor.b' } }
] });
assert.equal(l.cards[0].view, 'graph');
assert.equal(l.cards[0].hours, 72, 'delka krivky ma strop');
assert.equal(l.cards[1].view, 'gauge', 'neznamy zpusob zobrazeni = budik');

l = Layout.normalize({ panels: [{ items: [
  { entity: 'sensor.a', bar: true },        // starsi zapis
  { entity: 'sensor.b', view: 'graph' },
  { entity: 'sensor.c' }
] }] });
assert.deepEqual(l.panels[0].items.map(i => i.view), ['bar', 'graph', 'value'],
  '"bar: true" znamena totez co view: bar');
assert.equal(Layout.normalize({ cards: [{ meters: [{ entity: 'sensor.a' }] }] })
  .cards[0].meters[0].view, 'bar', 'ukazatel vedle hlavni hodnoty ma pruh');

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
assert.ok(l.cards[0].dial.max > l.cards[0].dial.min, 'prohozeny rozsah se narovna');

/* --- stupne --- */
l = Layout.normalize({ cards: [{ dial: { entity: 'sensor.t', levels: [
  { to: null, tone: 'critical', label: 'Horko' },
  { to: 24, tone: 'good', label: 'Fajn' },
  { to: 18, tone: 'info', label: 'Chladno' }] } }] });
const lv = l.cards[0].dial.levels;
assert.deepEqual(lv.map(x => x.to), [18, 24, null], 'prahy jdou vzestupne, otevreny konec je posledni');
assert.equal(Layout.normalize({ cards: [{ dial: { levels: [{ to: 5, tone: 'nesmysl' }] } }] })
  .cards[0].dial.levels[0].tone, 'good', 'neznamy stupen se nahradi');

/* --- polozky --- */
const item = Layout.newItem('sensor.x');
assert.ok(Array.isArray(item.levels), 'nova polozka ma stupne (editor na nich stoji)');
assert.equal(Layout.normalize({ panels: [{ items: [{ entity: 'light.a', tap: 'vymysl' }] }] })
  .panels[0].items[0].tap, 'auto', 'neznama akce klepnuti se nahradi');

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
assert.equal(auto.cards.length, 2, 'dve teploty = dve sekce');
assert.equal(auto.cards[0].dial.entity, 'sensor.t1');
assert.ok(auto.cards[0].dial.levels.length, 'sekce dostane stupne, aby mela slovo');
assert.ok(auto.panels.some(p => p.name === 'Baterie') && auto.panels.some(p => p.name === 'Světla'));
assert.ok(auto.ambient.left && auto.ambient.left.levels.length,
  'i klidovy rezim rika slovo, nejen cislo');
assert.equal(auto.title, '', 'panel nenese zadnou znacku');
assert.ok(!Layout.isEmpty(auto));
assert.ok(Layout.isEmpty(Layout.empty()));

/* --- prazdny Home Assistant --- */
const nic = Layout.fromStates({});
assert.ok(Layout.isEmpty(nic), 'bez entit nevznikne prazdna sekce bez obsahu');

console.log('ok  hapanel-layout');

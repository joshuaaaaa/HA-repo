/* Hodnoty a slova panelu pro Home Assistant.
   Pravidlo, ktere tyhle testy hlidaji: stav nese barvu I SLOVO. */
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.join(__dirname, '../android/app/src/main/assets/js');
const U = require(path.join(base, 'util.js'));

/* --- cisla --- */
assert.equal(U.num('21,5 °C'), 21.5, 'desetinna carka je bezny zapis cidel');
assert.equal(U.num('1 234.5'), 1234.5, 'mezera oddeluje tisice');
assert.ok(isNaN(U.num('unavailable')), 'text neni cislo');
assert.equal(U.fmt(21.46, 1), '21,5', 'na panelu se pise cesky, s carkou');

/* --- stupne --- */
const L = U.SUGGEST.temperature.levels;
assert.equal(U.level(15, L).word, 'Chladno');
assert.equal(U.level(22, L).word, 'Příjemno');
assert.equal(U.level(40, L).word, 'Horko', 'posledni stupen je otevreny nahoru');
assert.equal(U.level(NaN, L).word, '—', 'bez hodnoty se nic netvrdi');
Object.keys(U.TONES).forEach(k => {
  assert.ok(U.TONES[k].color && U.TONES[k].word, 'kazdy stupen ma barvu i slovo: ' + k);
});

/* --- slova stavu --- */
assert.equal(U.word('on', { device_class: 'motion' }), 'Pohyb');
assert.equal(U.word('off', { device_class: 'door' }), 'Zavřeno');
assert.equal(U.word('on'), 'Zapnuto');
assert.equal(U.word('not_home'), 'Pryč');
assert.equal(U.word('nejaky_novy_stav'), 'Nejaky novy stav', 'neznamy stav se aspon slusne prepise');

/* --- zobrazeni entity --- */
const teplota = { entity_id: 'sensor.t', state: '21.53',
  attributes: { unit_of_measurement: '°C', device_class: 'temperature', friendly_name: 'Obývák' } };
let d = U.display(teplota, { decimals: 1 });
assert.equal(d.text, '21,5');
assert.equal(d.unit, '°C');
assert.equal(U.display(teplota, { unit: 'stupňů' }).unit, 'stupňů', 'jednotka z nastaveni ma prednost');

const mrtva = { entity_id: 'sensor.x', state: 'unavailable', attributes: {} };
d = U.display(mrtva, {});
assert.equal(d.has, false);
assert.equal(d.text, '—', 'nedostupna entita neukazuje stare cislo');

d = U.display({ entity_id: 'light.l', state: 'on', attributes: {} }, {});
assert.equal(d.text, 'Zapnuto');
assert.ok(isNaN(d.n), 'zapnuto neni cislo');

assert.equal(U.display(null, {}).has, false, 'chybejici entita nesmi spadnout');

/* --- navrh podle cidla --- */
const s = U.suggest(teplota);
assert.equal(s.min, 0); assert.equal(s.max, 35);
assert.ok(s.levels.length >= 3, 'teplota dostane stupne');
assert.equal(U.suggest({ attributes: { unit_of_measurement: '%' }, state: '40' }).max, 100,
  'procenta maji rozsah 0-100');

/* --- klepnuti --- */
assert.deepEqual(U.tapService('light.a', 'off'), { domain: 'light', service: 'toggle' });
assert.deepEqual(U.tapService('cover.a', 'open'), { domain: 'cover', service: 'close_cover' });
assert.deepEqual(U.tapService('lock.a', 'locked'), { domain: 'lock', service: 'unlock' });
assert.equal(U.tapService('sensor.a', '21'), null, 'cidlo se prepnout neda');
assert.ok(!U.switchable('sensor.a') && U.switchable('switch.a'));

/* --- pocasi --- */
const pocasi = U.weather({ state: 'partlycloudy', attributes: { temperature: 12.4 } });
assert.equal(pocasi.word, 'Polojasno', 'stav pocasi se rekne cesky');
assert.equal(pocasi.temp, 12.4);
assert.equal(U.weather({ state: 'neco_noveho', attributes: {} }).word, 'Neco noveho',
  'neznamy stav se aspon slusne prepise');
assert.equal(U.weather(null), null, 'chybejici entita nespadne');

/* --- pruh --- */
assert.equal(U.pct(50, 0, 100), 50);
assert.equal(U.pct(-10, 0, 100), 0, 'pruh nepretece do zaporu');
assert.equal(U.pct(500, 0, 100), 100, 'ani nahoru');

console.log('ok  hapanel-util');

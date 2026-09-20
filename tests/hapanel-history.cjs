/* Prubeh hodnot pro krivky. Testuje se hlavne to, co panel na zdi potka
   kazdy den: zatim neni spojeni, odpoved prijde pozdeji, entita mezitim
   zmizi z rozvrzeni. */
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.join(__dirname, '../android/app/src/main/assets/js');
global.U = require(path.join(base, 'util.js'));
const History = require(path.join(base, 'history.js'));

/* --- prevod odpovedi --- */
const now = Date.now() / 1000;
let s = History.parse([
  { s: '21.5', lu: now - 300 },
  { s: 'unavailable', lu: now - 200 },   // nenumericke se zahodi
  { s: '22.1', lu: now - 100 }
]);
assert.deepEqual(s.map(p => p.v), [21.5, 22.1], 'necislo do krivky nepatri');
assert.ok(s[0].t < s[1].t, 'body jdou v case');

s = History.parse([
  { state: '5', last_updated: new Date(Date.now() - 60000).toISOString() },
  { state: '6', last_changed: new Date().toISOString() }
]);
assert.equal(s.length, 2, 'rozumi i plnym nazvum, ktere posilaji starsi verze');
assert.deepEqual(History.parse([]), [], 'prazdna odpoved nespadne');

/* --- orez okna --- */
const store = new History.Store(null);
store.want = [{ entity: 'sensor.a', hours: 1 }];
store.series['sensor.a'] = [
  { t: Date.now() - 3 * 3600e3, v: 1 },
  { t: Date.now() - 30 * 60e3, v: 2 },
  { t: Date.now(), v: 3 }
];
store.trim('sensor.a');
assert.equal(store.series['sensor.a'].length, 2, 'co vypadlo z okna, se zahodi');

/* --- ziva zmena --- */
store.series['sensor.a'] = [{ t: Date.now() - 60000, v: 1 }];
assert.equal(store.push('sensor.a', '2'), true, 'nova hodnota se pripoji');
assert.equal(store.series['sensor.a'].length, 2);
assert.equal(store.push('sensor.a', 'zapnuto'), false, 'nenumericky stav krivku nerusi');
assert.equal(store.push('sensor.neznama', '5'), false, 'entita bez krivky se ignoruje');

/* --- opakovani po neuspechu ---
   Prvni dotaz selze (panel jeste nema spojeni), druhy uspeje. Krivka
   tedy nesmi cekat na dalsi pravidelne nacteni. */
(async function () {
  let calls = 0;
  const st = new History.Store(function () {
    calls++;
    if (calls === 1) return Promise.reject(new Error('bez spojení'));
    const t = Date.now() / 1000;
    return Promise.resolve({ 'sensor.a': [{ s: '1', lu: t - 60 }, { s: '2', lu: t }] });
  });
  let got = null;
  st.onData = function (entity, series) { got = { entity: entity, n: series.length }; };

  st.set([{ entity: 'sensor.a', hours: 6 }]);   // 1. pokus - selze
  st.set([{ entity: 'sensor.a', hours: 6 }]);   // prijde behem beziciho dotazu

  await new Promise(r => setTimeout(r, 120));
  assert.equal(calls, 2, 'dotaz behem beziciho se zopakuje hned po nem');
  assert.deepEqual(got, { entity: 'sensor.a', n: 2 }, 'data doputuji do panelu');
  st.stop();

  /* --- zmena rozvrzeni --- */
  const st2 = new History.Store(function () { return Promise.resolve({}); });
  st2.series = { 'sensor.a': [{ t: Date.now(), v: 1 }], 'sensor.b': [{ t: Date.now(), v: 2 }] };
  st2.set([{ entity: 'sensor.a', hours: 6 }]);
  assert.ok(st2.get('sensor.a') && !st2.get('sensor.b'),
    'entita vyhozena z rozvrzeni si nedrzi historii v pameti');
  st2.stop();

  console.log('ok  hapanel-history');
})();

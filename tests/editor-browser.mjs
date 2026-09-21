/* ------------------------------------------------------------------
   Vizuální editor karty v opravdovém prohlížeči: co se naklikne, to
   musí vylézt z konfigurace - a karta to musí umět rovnou vykreslit.

   Potrebuje Playwright (v CI nebezi):
       npm i -g playwright && node tests/editor-browser.mjs
   ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = `<!doctype html><meta charset="utf-8"><title>editor</title>
<body style="margin:0;padding:16px;font-family:system-ui">
<script src="/ha-panel-card.js"></script>`;

const srv = http.createServer((q, r) => {
  if (q.url.startsWith('/ha-panel-card.js')) {
    r.writeHead(200, { 'Content-Type': 'text/javascript' });
    r.end(fs.readFileSync(path.join(ROOT, 'dist/ha-panel-card.js')));
  } else { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(PAGE); }
});
await new Promise(r => srv.listen(8801, r));

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1100, height: 900 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:8801/');

/* Falešný hass: pár entit, ze kterých se dá vybírat. */
await page.evaluate(() => {
  const st = (id, state, attrs = {}) => [id, { entity_id: id, state: String(state), attributes: attrs,
    last_changed: new Date().toISOString() }];
  window.hassMock = { states: Object.fromEntries([
    st('sensor.obyvak_teplota', 22.4, { friendly_name: 'Obývák teplota', device_class: 'temperature', unit_of_measurement: '°C' }),
    st('sensor.obyvak_vlhkost', 47, { friendly_name: 'Obývák vlhkost', device_class: 'humidity', unit_of_measurement: '%' }),
    st('sensor.fve', 1240, { friendly_name: 'FVE výroba', device_class: 'power', unit_of_measurement: 'W' }),
    st('light.kuchyne', 'on', { friendly_name: 'Kuchyně' }),
    st('camera.dvere', 'idle', { friendly_name: 'Dveře', entity_picture: '/api/camera_proxy/camera.dvere' }),
    st('weather.dum', 'partlycloudy', { friendly_name: 'Dům', temperature: 12.4 })
  ]), callService: () => {}, callWS: async () => ({}) };

  const ed = document.createElement('ha-panel-card-editor');
  window.ed = ed;
  window.posledni = null;
  ed.addEventListener('config-changed', (e) => { window.posledni = e.detail.config; });
  document.body.appendChild(ed);
  ed.hass = window.hassMock;
  ed.setConfig({ type: 'custom:ha-panel-card', sections: [], panels: [] });
});

const sr = 'ha-panel-card-editor';

/* --- přidání sekce --- */
await page.locator(`${sr} button:text-is("+ Sekce")`).click();
await page.waitForTimeout(150);
let cfg = await page.evaluate(() => window.posledni);
console.log('po pridani sekce:', JSON.stringify(cfg));
assert.equal(cfg.sections.length, 1, 'tlacitko prida sekci');

/* --- výběr entity vlastním našeptávačem --- */
const pick = page.locator(`${sr} .pick input`).first();
await pick.click();
await pick.fill('teplota');
await page.waitForTimeout(120);
const nabidka = await page.locator(`${sr} .pick.otevreno .radek`).allTextContents();
console.log('nabidka entit:', nabidka.slice(0, 3));
assert.ok(nabidka.length >= 1, 'naseptavac nabidne entity z hass');
await page.locator(`${sr} .pick.otevreno .radek`).first().click();
await page.waitForTimeout(150);
cfg = await page.evaluate(() => window.posledni);
assert.equal(cfg.sections[0].entity, 'sensor.obyvak_teplota', 'vybrana entita se zapise do konfigurace');

/* --- název a zobrazení --- */
await page.locator(`${sr} .block input[type=text]`).first().fill('OBÝVÁK');
await page.waitForTimeout(150);
await page.locator(`${sr} .block select`).nth(1).selectOption('graph');
await page.waitForTimeout(200);
cfg = await page.evaluate(() => window.posledni);
console.log('sekce po upravach:', JSON.stringify(cfg.sections[0]));
assert.equal(cfg.sections[0].name, 'OBÝVÁK');
assert.equal(cfg.sections[0].view, 'graph');
assert.ok(await page.locator(`${sr} .f:has(label:text-is("Křivka za (h)"))`).count(),
  'u krivky se objevi pole Krivka za (h)');

/* --- kamera mění nabídku polí --- */
await page.locator(`${sr} .block select`).nth(1).selectOption('camera');
await page.waitForTimeout(200);
assert.ok(await page.locator(`${sr} .f:has(label:text-is("Obnovovat po (s)"))`).count(),
  'u kamery se objevi Obnovovat po (s)');
assert.equal(await page.locator(`${sr} .f:has(label:text-is("Budík od"))`).count(), 0,
  'a rozsah budiku zmizi');
await page.locator(`${sr} .block select`).nth(1).selectOption('gauge');
await page.waitForTimeout(200);

/* --- stupně --- */
await page.locator(`${sr} button:text-is("+ Stupeň")`).click();
await page.waitForTimeout(200);
const stupen = page.locator(`${sr} .polozka .row`).first();
await stupen.locator('input[type=number]').first().fill('18');
await stupen.locator('input[type=text]').first().fill('Chladno');
await stupen.locator('select').selectOption('info');
await page.waitForTimeout(200);
cfg = await page.evaluate(() => window.posledni);
console.log('stupen:', JSON.stringify(cfg.sections[0].levels));
assert.deepEqual(cfg.sections[0].levels[0], { to: 18, label: 'Chladno', tone: 'info' });

/* --- ukazatel --- */
await page.locator(`${sr} button:text-is("+ Řádek")`).first().click();
await page.waitForTimeout(200);
cfg = await page.evaluate(() => window.posledni);
assert.equal(cfg.sections[0].meters.length, 1, 'prida se ukazatel');

/* --- panel s dlaždicí --- */
await page.locator(`${sr} .tab:text-is("Panely")`).click();
await page.waitForTimeout(150);
await page.locator(`${sr} button:text-is("+ Panel")`).click();
await page.waitForTimeout(200);
await page.locator(`${sr} button:text-is("+ Dlaždice")`).click();
await page.waitForTimeout(200);
const dl = page.locator(`${sr} .polozka .polozka`).first();
await dl.locator('.pick input').click();
await dl.locator('.pick input').fill('kuchyne');
await page.waitForTimeout(120);
await page.locator(`${sr} .pick.otevreno .radek`).first().click();
await page.waitForTimeout(150);
await page.locator(`${sr} .f:has(label:text-is("Klepnutí")) select`).first().selectOption('detail');
await page.waitForTimeout(200);
cfg = await page.evaluate(() => window.posledni);
console.log('panel:', JSON.stringify(cfg.panels[0]));
assert.equal(cfg.panels[0].items[0].entity, 'light.kuchyne');
assert.equal(cfg.panels[0].items[0].tap, 'detail');

/* --- celek --- */
await page.locator(`${sr} .tab:text-is("Celek")`).click();
await page.waitForTimeout(150);
await page.locator(`${sr} .f:has(label:text-is("Název")) input`).first().fill('DŮM');
await page.locator(`${sr} .f:has(label:text-is("Sekcí na řádek")) select`).selectOption('3');
await page.locator(`${sr} .prep input[type=checkbox]`).uncheck();
await page.waitForTimeout(250);
cfg = await page.evaluate(() => window.posledni);
console.log('celek:', JSON.stringify({ title: cfg.title, columns: cfg.columns, clock: cfg.clock }));
assert.equal(cfg.title, 'DŮM');
assert.equal(cfg.columns, 3);
assert.equal(cfg.clock, false, 'vypnute hodiny se do konfigurace zapisou');

/* --- v YAML nezustane nic prazdneho --- */
const prazdne = JSON.stringify(cfg).match(/:""/g);
assert.equal(prazdne, null, 'konfigurace neobsahuje prazdne retezce');

/* --- co editor slozil, musi karta rovnou vykreslit --- */
const vysledek = await page.evaluate((c) => {
  const card = document.createElement('ha-panel-card');
  document.body.appendChild(card);
  card.setConfig(c);
  card.hass = window.hassMock;
  const sr2 = card.shadowRoot;
  return { sekci: sr2.querySelectorAll('.card').length,
           dlazdic: sr2.querySelectorAll('.lt').length,
           hodnota: sr2.querySelector('.card .n')?.textContent,
           nazev: sr2.querySelector('.chead .nm')?.textContent };
}, cfg);
console.log('karta z naklikane konfigurace:', vysledek);
assert.equal(vysledek.sekci, 1, 'karta ukaze naklikanou sekci');
assert.equal(vysledek.nazev, 'OBÝVÁK');
assert.equal(vysledek.hodnota, '22,4', 'a zivou hodnotu z hass');
assert.ok(vysledek.dlazdic >= 1, 'i dlazdici v panelu');

/* --- prázdná karta je rada, ne chyba --- */
const prazdna = await page.evaluate(() => {
  const card = document.createElement('ha-panel-card');
  document.body.appendChild(card);
  let chyba = null;
  try { card.setConfig({ type: 'custom:ha-panel-card' }); } catch (e) { chyba = String(e); }
  return { chyba, text: card.shadowRoot.querySelector('.prazdna-karta b')?.textContent };
});
console.log('prazdna karta:', prazdna);
assert.equal(prazdna.chyba, null, 'prazdna konfigurace neshodi kartu');
assert.ok(prazdna.text, 'misto chyby se ukaze, co s tim');

/* --- návrh z entit a převod rozvržení z aplikace --- */
const navrh = await page.evaluate(async () => {
  const ed = document.createElement('ha-panel-card-editor');
  document.body.appendChild(ed);
  let out = null;
  ed.addEventListener('config-changed', (e) => { out = e.detail.config; });
  ed.hass = window.hassMock;
  ed.setConfig({ type: 'custom:ha-panel-card', sections: [] });
  [...ed.shadowRoot.querySelectorAll('button')]
    .find(b => b.textContent.includes('Navrhnout')).click();
  await new Promise(r => setTimeout(r, 100));
  return { sekci: out.sections.length, prvni: out.sections[0] };
});
console.log('navrh z entit:', navrh.sekci, JSON.stringify(navrh.prvni));
assert.ok(navrh.sekci >= 1, 'navrh postavi sekce z entit v Home Assistantovi');

const prevod = await page.evaluate(async () => {
  const ed = document.createElement('ha-panel-card-editor');
  document.body.appendChild(ed);
  let out = null;
  ed.addEventListener('config-changed', (e) => { out = e.detail.config; });
  ed.hass = window.hassMock;
  ed.setConfig({ type: 'custom:ha-panel-card', layout: { title: 'DŮM', pages: [{ name: 'D',
    cards: [{ name: 'FVE', tone: 'green', view: 'graph', hours: 12, dial: { entity: 'sensor.fve' } }],
    panels: [] }] } });
  const b = [...ed.shadowRoot.querySelectorAll('button')].find(x => x.textContent.includes('Převést'));
  const bylo = !!b;
  if (b) b.click();
  await new Promise(r => setTimeout(r, 100));
  return { bylo, layout: out ? !!out.layout : null, sekce: out ? out.sections[0] : null, title: out?.title };
});
console.log('prevod rozvrzeni:', JSON.stringify(prevod));
assert.ok(prevod.bylo, 'u vlozeneho rozvrzeni editor nabidne prevod');
assert.equal(prevod.layout, false, 'po prevodu uz layout v konfiguraci neni');
assert.equal(prevod.sekce.entity, 'sensor.fve');
assert.equal(prevod.sekce.view, 'graph');
assert.equal(prevod.title, 'DŮM');

if (process.env.SCRATCH) {
  await page.evaluate(() => { document.body.scrollTop = 0; });
  await page.screenshot({ path: process.env.SCRATCH + '/editor-karty.png', fullPage: false });
}

assert.equal(errs.length, 0, 'zadna chyba v konzoli:\n' + errs.join('\n'));
console.log('ok  editor-browser');
await b.close(); srv.close();

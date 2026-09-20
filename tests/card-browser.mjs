/* ------------------------------------------------------------------
   Zkouška karty v opravdovém prohlížeči.

   Home Assistant se nesimuluje celý - karta od něj dostává jen objekt
   `hass` se stavy a funkcí callService, takže přesně ten jí podstrčíme.

   Potřebuje Playwright (v CI neběží):
       npm i -g playwright && node tests/card-browser.mjs
   ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#111;font-family:sans-serif}
  #wrap{width:1400px;margin:20px auto}
</style></head><body><div id="wrap"></div>
<script src="/dist/ha-panel-card.js"></script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/' ) { res.writeHead(200, {'Content-Type':'text/html'}); res.end(PAGE); return; }
  try {
    res.writeHead(200, {'Content-Type':'text/javascript'});
    res.end(fs.readFileSync(path.join(ROOT, req.url.slice(1))));
  } catch { res.writeHead(404); res.end('ne'); }
});
await new Promise(r => server.listen(8790, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
await page.goto('http://localhost:8790/');

await page.evaluate(() => {
  const now = new Date().toISOString();
  const st = (id, state, attributes = {}) => [id, { entity_id: id, state: String(state), attributes, last_changed: now }];
  window.__calls = [];
  window.__more = [];
  window.hass = {
    states: Object.fromEntries([
      st('sensor.obyvak', 22.4, { friendly_name: 'Obývák', device_class: 'temperature', unit_of_measurement: '°C' }),
      st('sensor.vlhkost', 47, { friendly_name: 'Vlhkost', device_class: 'humidity', unit_of_measurement: '%' }),
      st('sensor.co2', 1340, { friendly_name: 'CO₂', device_class: 'carbon_dioxide', unit_of_measurement: 'ppm' }),
      st('light.kuchyne', 'off', { friendly_name: 'Kuchyně' }),
      st('binary_sensor.dvere', 'on', { friendly_name: 'Dveře', device_class: 'door' })
    ]),
    callService: (domain, service, data) => window.__calls.push([domain, service, data.entity_id])
  };
  const card = document.createElement('ha-panel-card');
  card.addEventListener('hass-more-info', e => window.__more.push(e.detail.entityId));
  card.setConfig({
    type: 'custom:ha-panel-card',
    title: 'DŮM',
    sections: [{
      name: 'OBÝVÁK', code: 'T1', tone: 'cyan', entity: 'sensor.obyvak',
      meters: [{ entity: 'sensor.vlhkost', name: 'Vlhkost' }],
      tiles: [{ entity: 'sensor.co2', name: 'CO₂' }]
    }],
    panels: [{ name: 'Dům', tone: 'amber', items: [
      { entity: 'light.kuchyne', name: 'Kuchyně' },
      { entity: 'binary_sensor.dvere', name: 'Dveře' }
    ] }]
  });
  card.hass = window.hass;
  document.getElementById('wrap').appendChild(card);
  window.card = card;
});
await page.waitForTimeout(400);

const sr = () => page.locator('ha-panel-card');
const text = (sel) => page.evaluate((s) => document.querySelector('ha-panel-card').shadowRoot.querySelector(s)?.textContent.trim(), sel);

assert.equal(await text('.wordmark'), 'DŮM', 'název z konfigurace patří do záhlaví');
assert.equal(await text('.gv .n'), '22,4', 'budík ukazuje hodnotu z hass');
assert.equal(await text('.gv .st'), 'Příjemno', 'stupeň se doplnil podle druhu čidla');
assert.equal(await text('.gv .cap'), 'Teplota');
assert.equal(await text('.meter .v'), '47 %', 'ukazatel vedle budíku');
assert.equal(await text('.tile .v'), '1340ppm', 'dlaždice: hodnota a jednotka z Home Assistanta');
assert.ok((await text('.lt .lv')).startsWith('Vypnuto'), 'světlo mluví slovem, ne stavem "off"');

// klepnutí na světlo přepíná, klepnutí na čidlo otevře podrobnosti
await page.evaluate(() => {
  const root = document.querySelector('ha-panel-card').shadowRoot;
  root.querySelectorAll('.lt')[0].click();
  root.querySelectorAll('.lt')[1].click();
});
await page.waitForTimeout(200);
assert.deepEqual(await page.evaluate(() => window.__calls), [['light', 'toggle', 'light.kuchyne']],
  'světlo se přepíná službou light.toggle');
assert.deepEqual(await page.evaluate(() => window.__more), ['binary_sensor.dvere'],
  'u čidla se otevře okno s podrobnostmi');

// živá změna stavu
await page.evaluate(() => {
  window.hass = { ...window.hass, states: { ...window.hass.states,
    'sensor.obyvak': { ...window.hass.states['sensor.obyvak'], state: '29.1' } } };
  window.card.hass = window.hass;
});
await page.waitForTimeout(200);
assert.equal(await text('.gv .n'), '29,1', 'nová hodnota se propíše');
assert.equal(await text('.gv .st'), 'Horko', 'a s ní i slovo');

// karta se vejde do šířky, kterou dostane
const wide = await page.evaluate(() => {
  const c = document.querySelector('ha-panel-card');
  return { w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height,
           portrait: c.shadowRoot.querySelector('.panel-root').classList.contains('is-portrait') };
});
assert.ok(wide.w > 1000 && wide.h > 100, 'karta má rozměr');
assert.equal(wide.portrait, false, 'v široké kartě vodorovné rozvržení');
await page.screenshot({ path: process.env.SCRATCH ? process.env.SCRATCH + '/card-wide.png' : '/tmp/card-wide.png' });

await page.evaluate(() => { document.getElementById('wrap').style.width = '500px'; });
await page.waitForTimeout(400);
const narrow = await page.evaluate(() => {
  const c = document.querySelector('ha-panel-card');
  return { w: c.getBoundingClientRect().width,
           portrait: c.shadowRoot.querySelector('.panel-root').classList.contains('is-portrait') };
});
assert.ok(narrow.w < 520, 'karta se zmenšila se sloupcem');
assert.equal(narrow.portrait, true, 'v úzkém sloupci svislé rozvržení');
await page.screenshot({ path: process.env.SCRATCH ? process.env.SCRATCH + '/card-narrow.png' : '/tmp/card-narrow.png' });

assert.equal(errors.length, 0, 'žádná chyba v konzoli:\n' + errors.join('\n'));
console.log('ok  card-browser');
await browser.close();
server.close();

/* ------------------------------------------------------------------
   Sestaví dist/ha-panel-card.js z týchž zdrojů, ze kterých žije
   aplikace pro tablet. Karta a aplikace se tak nemůžou rozejít ve
   vzhledu ani ve způsobu, jakým počítají stupně.

   Spuštění:  node tools/build-card.mjs
   Kontrola:  node tools/build-card.mjs --check   (nezapisuje, jen hlásí,
              jestli je dist/ aktuální - používá to CI)
   ------------------------------------------------------------------ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'android/app/src/main/assets');
const OUT = path.join(ROOT, 'dist/ha-panel-card.js');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'hacs.json'), 'utf8')).version || '0.0.0';

const read = (p) => fs.readFileSync(p, 'utf8');

/* Vzhled je společný s aplikací. Pár pravidel se ale musí přepsat:
   karta žije ve stínovém stromu, kde není <body>, a nic v ní nesmí být
   position:fixed - to by vylezlo přes celý dashboard. */
function cardCss() {
  let css = read(path.join(ASSETS, 'css/panel.css'));
  css = css
    .replace(/:root\{/g, ':host{')
    .replace(/^html,body\{[^}]*\}$/m, '')
    .replace(/(^|\})body\{/g, '$1.panel-root{')
    .replace(/body\./g, '.panel-root.')
    .replace(/position:fixed/g, 'position:absolute');

  // Doplňky jen pro kartu: rámec, měřítko a vypnutí částí, které v
  // dashboardu nemají smysl (start aplikace, klidový režim, editor).
  css += `
:host{display:block;position:relative;contain:content}
.panel-root{position:relative;width:100%;overflow:hidden;border-radius:12px;background:#020507;color:#f2f8ff}
#stage{position:absolute;top:0;left:0;transform-origin:top left;height:auto;min-height:0}
#boot,#organism,#pulse,#toast,#editor,#picker,.overlay,#vhProbe{display:none!important}
.bg,.scan{position:absolute;inset:0}
`;
  return css;
}

const banner = `/*! HA Panel Card ${VERSION} - https://github.com/joshuaaaaa/HA-repo
    Soubor je SESTAVENÝ. Needituj ho - uprav src/card/card.js nebo
    android/app/src/main/assets/js/*.js a spusť: node tools/build-card.mjs */`;

const bundle = [
  banner,
  '(function () {',
  "'use strict';",
  `var CARD_VERSION = ${JSON.stringify(VERSION)};`,
  'var CARD_CSS = ' + JSON.stringify(cardCss()) + ';',
  read(path.join(ASSETS, 'js/util.js')),
  read(path.join(ASSETS, 'js/layout.js')),
  read(path.join(ASSETS, 'js/history.js')),
  read(path.join(ASSETS, 'js/feeds.js')),
  read(path.join(ASSETS, 'js/render.js')),
  read(path.join(ROOT, 'src/card/card.js')),
  '})();',
  ''
].join('\n\n');

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? read(OUT) : '';
  if (current !== bundle) {
    console.error('dist/ha-panel-card.js není aktuální - spusť: node tools/build-card.mjs');
    process.exit(1);
  }
  console.log('ok  dist/ha-panel-card.js je aktuální');
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, bundle);
  console.log('hotovo  ' + path.relative(ROOT, OUT) + '  (' + Math.round(bundle.length / 1024) + ' kB)');
}

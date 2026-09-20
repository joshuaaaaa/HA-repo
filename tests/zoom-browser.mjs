/* ------------------------------------------------------------------
   Zvetsena sekce: rozbaleni s prechodem (ne skok), ovladani svetla
   rovnou ve velkem a zadny zamrzly odznak spojeni v zahlavi.
   Navic kontrola, ze editor na uzkem displeji zmensi pismo.

   Potrebuje Playwright (v CI nebezi):
       npm i -g playwright && node tests/zoom-browser.mjs
   ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'../android/app/src/main/assets');
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
const srv=http.createServer((q,r)=>{const u=q.url.split('?')[0];const p=path.join(ROOT,u==='/'?'index.html':u);
 try{r.writeHead(200,{'Content-Type':T[path.extname(p)]||'text/plain'});r.end(fs.readFileSync(p));}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(8797,r));
const b=await chromium.launch();
const page=await b.newPage({viewport:{width:1600,height:1000}});
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});

const layout={v:1,title:'',pages:[{name:'Domov',cards:[
  {name:'SVĚTLO',code:'L',tone:'amber',view:'gauge',
   dial:{entity:'light.sklep',caption:'Žárovka sklep',min:0,max:100}},
  {name:'TEPLOTA',code:'T',tone:'cyan',view:'gauge',dial:{entity:'sensor.t',caption:'Teplota',decimals:1}}
],panels:[]}]};

await page.addInitScript((l)=>{localStorage.setItem('panelCfg',JSON.stringify({baseUrl:'http://localhost:8797',token:'G',layout:JSON.stringify(l)}));},layout);
await page.routeWebSocket(/\/api\/websocket/, ws=>{
  const now=new Date().toISOString();
  globalThis.calls=[];
  const states=[
    {entity_id:'light.sklep',state:'off',attributes:{friendly_name:'Žárovka sklep Zigbee',
      supported_color_modes:['color_temp','hs'],min_color_temp_kelvin:2200,max_color_temp_kelvin:6500},last_changed:now},
    {entity_id:'sensor.t',state:'22.4',attributes:{friendly_name:'Teplota',unit_of_measurement:'°C',device_class:'temperature'},last_changed:now}
  ];
  ws.onMessage(raw=>{const m=JSON.parse(raw);
    if(m.type==='auth')ws.send(JSON.stringify({type:'auth_ok'}));
    else if(m.type==='get_states')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:states}));
    else if(m.type==='subscribe_events')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));
    else if(m.type==='call_service'){
      globalThis.calls.push([m.domain,m.service,m.service_data]);
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));}
    else if(m.type==='history/history_during_period')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:{}}));
    else if(m.type==='ping')ws.send(JSON.stringify({id:m.id,type:'pong'}));});
  ws.send(JSON.stringify({type:'auth_required'}));
});
await page.goto('http://localhost:8797/index.html');
await page.waitForTimeout(2000);

console.log('odznak na panelu:', await page.evaluate(()=>document.querySelector('header .badge').textContent));
assert.equal(await page.evaluate(()=>document.querySelector('header .badge').textContent),'Živě',
  'panel hlasi zive spojeni, ne porad "Spojuji"');

/* --- rozbaleni: hned po klepnuti je okno jeste male, pak dojede --- */
await page.locator('.card').first().click();
await page.waitForTimeout(90);
const mid = await page.evaluate(()=>getComputedStyle(document.querySelector('#zoom .zwin')).transform);
await page.waitForTimeout(800);
const end = await page.evaluate(()=>getComputedStyle(document.querySelector('#zoom .zwin')).transform);
console.log('prechod:', {behem:mid, po:end});
assert.notEqual(mid,'none','okno se rozbaluje, neskoci rovnou na plnou velikost');
assert.ok(/matrix\(0\.[0-9]/.test(mid),'behem rozbaleni je okno zmensene');
assert.equal(end,'none','po dobehnuti okno sedi na sve velikosti');

/* --- v zvetsene sekci neni zahlavi s odznakem --- */
const zh = await page.evaluate(()=>({
  zahlavi:document.querySelectorAll('#zoomBody header').length,
  odznak:document.querySelectorAll('#zoomBody .badge').length,
  karet:document.querySelectorAll('#zoomBody .card').length}));
console.log('zvetsena sekce:', zh);
assert.equal(zh.odznak,0,'zvetsena sekce nema zamrzly odznak spojeni');
assert.equal(zh.zahlavi,0,'ani hodiny a ozubene kolo');
assert.equal(zh.karet,1,'zvetsena je prave jedna sekce');

/* --- ovladani svetla rovnou ve zvetsene sekci --- */
const ctrl = await page.evaluate(()=>({
  tlacitka:[...document.querySelectorAll('#zoomCtrl .dbtn')].map(x=>x.textContent),
  posuvniky:[...document.querySelectorAll('#zoomCtrl .dslide .dsl span')].map(x=>x.textContent),
  barvy:document.querySelectorAll('#zoomCtrl .dsw i').length}));
console.log('ovladani ve zvetsene sekci:', ctrl);
assert.ok(ctrl.tlacitka.includes('Zapnout'),'svetlo jde zapnout primo ze zvetsene sekce');
assert.ok(ctrl.posuvniky.includes('Jas'),'a ztlumit');
assert.equal(ctrl.barvy,12,'a vybrat barvu');

await page.locator('#zoomCtrl .dbtn', {hasText:'Zapnout'}).first().click();
await page.waitForTimeout(300);
console.log('sluzba:', JSON.stringify(globalThis.calls.at(-1)));
assert.deepEqual(globalThis.calls.at(-1),['light','turn_on',{entity_id:'light.sklep'}],
  'klepnuti na Zapnout posle light.turn_on');

await page.evaluate(()=>{const inp=document.querySelector('#zoomCtrl .dslide input[type=range]');
  inp.value=35; inp.dispatchEvent(new Event('change',{bubbles:true}));});
await page.waitForTimeout(300);
assert.equal(globalThis.calls.at(-1)[2].brightness_pct,35,'posuvnik jasu posle brightness_pct');
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/zoom-light.png'});

await page.click('#zoomClose');
await page.waitForTimeout(600);
assert.ok(await page.evaluate(()=>!document.body.classList.contains('zooming')),'okno se zavre');

/* --- cidlo zadne ovladani nema --- */
await page.locator('.card').nth(1).click();
await page.waitForTimeout(700);
console.log('cidlo ma ovladani:', await page.evaluate(()=>document.getElementById('zoomCtrl').childNodes.length));
assert.equal(await page.evaluate(()=>document.getElementById('zoomCtrl').childNodes.length),0,
  'u cidla zustane pruh ovladani prazdny');
await page.click('#zoomClose');
await page.waitForTimeout(600);

/* --- na malem tabletu se ovladani vejde cele, okno nezabira cely displej --- */
await page.setViewportSize({width:800,height:500});
await page.waitForTimeout(400);
await page.locator('.card').first().click();
await page.waitForTimeout(800);
const fit = await page.evaluate(()=>{
  const w=document.querySelector('#zoom .zwin').getBoundingClientRect();
  const s=document.getElementById('zoomCtrl');
  const r=s.getBoundingClientRect();
  const prvky=[...s.children].map(c=>c.getBoundingClientRect());
  return {okno:{w:Math.round(w.width),h:Math.round(w.height)},
          displej:{w:window.innerWidth,h:window.innerHeight},
          preteka:s.scrollHeight - s.clientHeight,
          posledni:Math.round(prvky[prvky.length-1].bottom),
          spodek:Math.round(r.bottom)};
});
// Nic z ovladani nesmi lezet pod krizkem ani prerust okraj okna.
const kolize = await page.evaluate(()=>{
  const w=document.querySelector('#zoom .zwin').getBoundingClientRect();
  const x=document.querySelector('#zoom .zclose').getBoundingClientRect();
  const prvky=[...document.querySelectorAll('#zoomCtrl .dbtn, #zoomCtrl input, #zoomCtrl .dsw i')];
  const kryje=r=>r.right>x.left+2&&r.left<x.right-2&&r.bottom>x.top+2&&r.top<x.bottom-2;
  return {podKrizkem:prvky.filter(e=>kryje(e.getBoundingClientRect())).map(e=>e.textContent||e.type),
          pres:prvky.filter(e=>e.getBoundingClientRect().right>w.right+1).length};
});
console.log('maly tablet:', fit, '| kolize:', kolize);
assert.equal(kolize.podKrizkem.length,0,'zadny ovladaci prvek nelezi pod krizkem');
assert.equal(kolize.pres,0,'a nic neprerusta okraj okna');
assert.ok(fit.okno.w < fit.displej.w && fit.okno.h < fit.displej.h,
  'okno nezabira uplne cely displej - kolem je videt panel');
assert.ok(fit.preteka <= 2, 'vsechno ovladani se vejde bez rolovani');
assert.ok(fit.posledni <= fit.displej.h, 'a nic nelezi pod spodnim okrajem displeje');
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/zoom-maly.png'});
await page.click('#zoomClose');
await page.waitForTimeout(600);
await page.setViewportSize({width:1600,height:1000});
await page.waitForTimeout(400);

/* --- pismo v editoru: na uzkem displeji mensi nez na sirokem --- */
async function editorFont(){
  await page.evaluate(()=>document.querySelector('.cog').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  await page.waitForTimeout(400);
  const f = await page.evaluate(()=>{
    const s=n=>parseFloat(getComputedStyle(document.querySelector(n)).fontSize);
    return {nadpis:s('#editor .ebar h1'), pole:s('#editor .efield input, #editor .efield select'),
            vyska:parseFloat(getComputedStyle(document.querySelector('#editor .efield select')).minHeight)};
  });
  await page.evaluate(()=>Editor.close());
  await page.waitForTimeout(200);
  return f;
}
const siroky = await editorFont();
await page.setViewportSize({width:800,height:500});
await page.waitForTimeout(400);
const uzky = await editorFont();
console.log('editor - siroky displej:', siroky, '| uzky displej:', uzky);
assert.ok(uzky.nadpis < siroky.nadpis * 0.85, 'na uzkem displeji je pismo editoru vyrazne mensi');
assert.ok(uzky.vyska >= 38, 'ale do poli se porad da trefit prstem');

assert.equal(errs.length, 0, 'zadna chyba v konzoli:\n' + errs.join('\n'));
console.log('ok  zoom-browser');
await b.close(); srv.close();

/* ------------------------------------------------------------------
   Stranky panelu, prejizdeni prstem, kamera a zvonek u dveri
   v opravdovem prohlizeci proti falesnemu Home Assistantovi.

   Potrebuje Playwright (v CI nebezi):
       npm i -g playwright && node tests/pages-browser.mjs
   ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'../android/app/src/main/assets');
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
// jednobarevny PNG jako "snimek z kamery"
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
let snimku=0;
const srv=http.createServer((q,r)=>{
  const u=q.url.split('?')[0];
  if(u.startsWith('/api/camera_proxy')){ snimku++; r.writeHead(200,{'Content-Type':'image/png'}); r.end(PNG); return; }
  const p=path.join(ROOT,u==='/'?'index.html':u);
  try{r.writeHead(200,{'Content-Type':T[path.extname(p)]||'text/plain'});r.end(fs.readFileSync(p));}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(8797,r));
const b=await chromium.launch();
const page=await b.newPage({viewport:{width:1600,height:1000}});
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});

const layout={v:1,title:'DŮM',weather:'weather.dum',
  doorbell:{camera:'camera.dvere',trigger:'binary_sensor.zvonek',name:'Zvonek',seconds:30},
  pages:[
  {name:'Domov',grid:{cols:2},cards:[
    {name:'OBÝVÁK',code:'T1',tone:'cyan',dial:{entity:'sensor.t',caption:'Teplota',min:0,max:35}},
    {name:'ODBĚR',code:'W',tone:'violet',view:'bar',dial:{entity:'sensor.p',caption:'Příkon',min:0,max:9000}}],
   panels:[{name:'Světla',tone:'amber',items:[{entity:'light.a',name:'Kuchyně'}]}]},
  {name:'Kamery',cards:[
    {name:'DVEŘE',code:'CAM',tone:'green',view:'camera',refresh:3,dial:{entity:'camera.dvere'}}]},
  {name:'Energie',cards:[
    {name:'SPOTŘEBA',code:'E',tone:'amber',view:'graph',hours:12,dial:{entity:'sensor.p',caption:'Příkon'}}]}
]};

await page.addInitScript((l)=>{localStorage.setItem('panelCfg',JSON.stringify({baseUrl:'http://localhost:8797',token:'G',layout:JSON.stringify(l)}));},layout);
let bellOn=false, sendEvent=null;
await page.routeWebSocket(/\/api\/websocket/, ws=>{
  const now=new Date().toISOString();
  const mk=(id,state,attrs={})=>({entity_id:id,state:String(state),attributes:attrs,last_changed:now});
  const states=[
    mk('sensor.t',22.4,{friendly_name:'Teplota',unit_of_measurement:'°C',device_class:'temperature'}),
    mk('sensor.p',4727,{friendly_name:'Příkon',unit_of_measurement:'W',device_class:'power'}),
    mk('light.a','on',{friendly_name:'Kuchyně'}),
    mk('weather.dum','partlycloudy',{friendly_name:'Dům',temperature:12.4}),
    mk('camera.dvere','idle',{friendly_name:'Dveře',entity_picture:'/api/camera_proxy/camera.dvere?token=abc'}),
    mk('binary_sensor.zvonek','off',{friendly_name:'Zvonek',device_class:'occupancy'})
  ];
  sendEvent=(id,state)=>ws.send(JSON.stringify({type:'event',event:{event_type:'state_changed',data:{entity_id:id,
    new_state:{entity_id:id,state,attributes:states.find(s=>s.entity_id===id).attributes,last_changed:new Date().toISOString()}}}}));
  ws.onMessage(raw=>{const m=JSON.parse(raw);
    if(m.type==='auth')ws.send(JSON.stringify({type:'auth_ok'}));
    else if(m.type==='get_states')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:states}));
    else if(m.type==='subscribe_events')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));
    else if(m.type==='history/history_during_period'){const res={};const t1=Date.now()/1000;
      for(const id of m.entity_ids){const pts=[];for(let i=60;i>=0;i--)pts.push({s:String(4000+Math.round(Math.sin(i/6)*900)),lu:t1-i*400});res[id]=pts;}
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:res}));}
    else if(m.type==='ping')ws.send(JSON.stringify({id:m.id,type:'pong'}));});
  ws.send(JSON.stringify({type:'auth_required'}));
});
await page.goto('http://localhost:8797/index.html');
// Bootovaci obrazovka bezi ~2,7 s; do te doby prekryva panel.
await page.waitForTimeout(3300);

const p0=await page.evaluate(()=>({stranek:document.querySelectorAll('.page').length,
  tecek:document.querySelectorAll('.pdots i').length,
  aktivni:[...document.querySelectorAll('.pdots i')].findIndex(d=>d.classList.contains('on')),
  posun:document.querySelector('.pstrip').style.transform}));
console.log('stranky:', p0.stranek, '| tecky:', p0.tecek);
assert.equal(p0.stranek,3); assert.equal(p0.tecek,3); assert.equal(p0.aktivni,0);

// prejeti prstem doleva -> druha stranka
const st=await page.locator('#stage').boundingBox();
await page.mouse.move(st.x+st.width*0.7, st.y+st.height*0.5);
await page.mouse.down();
await page.mouse.move(st.x+st.width*0.2, st.y+st.height*0.5, {steps:10});
await page.mouse.up();
await page.waitForTimeout(600);
const p1=await page.evaluate(()=>({aktivni:[...document.querySelectorAll('.pdots i')].findIndex(d=>d.classList.contains('on')),
  posun:document.querySelector('.pstrip').style.transform,
  kamera:!!document.querySelector('.camw .cam')?.src,
  src:(document.querySelector('.camw .cam')?.src||'').slice(0,60)}));
assert.ok(await page.evaluate(()=>!document.body.classList.contains('zooming')),
  'prejeti pres sekci neotevre jeji zvetseni');
console.log('po prejeti prstem: stranka', p1.aktivni + 1, '| kamera nactena:', p1.kamera);
assert.equal(p1.aktivni,1,'prejeti prepne na dalsi stranku');
assert.ok(p1.kamera,'kamera ma nacteny snimek');

// Druha stranka musi byt doopravdy videt - posouva se pas uvnitr okenka,
// ne okenko samo, jinak by stranka odjela i s obsahem mimo obrazovku.
const vidim=await page.evaluate(()=>{
  const karta=document.querySelectorAll('.page')[1].querySelector('.card');
  const r=karta.getBoundingClientRect();
  const x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);
  // Pouhy rozmer nestaci: orezany obsah ma porad svou velikost i misto.
  // Co je opravdu videt, rekne az to, co je pod prstem uprostred karty.
  const pod=document.elementFromPoint(x,y);
  return {sirka:Math.round(r.width),vyska:Math.round(r.height),
          videt:!!pod&&karta.contains(pod),pod:pod?pod.className||pod.tagName:'nic'};
});
console.log('karta na druhe strance:', vidim);
assert.ok(vidim.sirka>200 && vidim.vyska>200,'karta na druhe strance ma velikost');
assert.ok(vidim.videt,'a je doopravdy videt, ne orezana mimo okenko stranek');
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/pages-kamera.png'});

// obnovovani snimku
const prvni=snimku;
await page.waitForTimeout(3500);
console.log('snimku z kamery stazeno:', snimku);
assert.ok(snimku>prvni,'snimek se sam obnovuje');

// klepnuti na tecku -> treti stranka
await page.locator('.pdots i').nth(2).click();
await page.waitForTimeout(600);
assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.pdots i')].findIndex(d=>d.classList.contains('on'))), 2,
  'klepnuti na tecku prepne stranku');

// prejeti zpet doprava
await page.mouse.move(st.x+st.width*0.2, st.y+st.height*0.5);
await page.mouse.down();
await page.mouse.move(st.x+st.width*0.8, st.y+st.height*0.5, {steps:10});
await page.mouse.up();
await page.waitForTimeout(600);
assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.pdots i')].findIndex(d=>d.classList.contains('on'))), 1,
  'prejeti opacnym smerem se vrati o stranku zpet');

// zvonek
sendEvent('binary_sensor.zvonek','on');
await page.waitForTimeout(900);
const bell=await page.evaluate(()=>({zoom:document.body.classList.contains('zooming'),
  nadpis:document.querySelector('#zoomBody .chead .nm')?.textContent,
  kamera:!!document.querySelector('#zoomBody .camw .cam')}));
console.log('zvonek ukazal kameru:', bell.nadpis);
assert.ok(bell.zoom && bell.kamera,'zvonek ukaze kameru pres celou obrazovku');
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/pages-zvonek.png'});
await page.click('#zoomClose'); await page.waitForTimeout(400);

// klidovy rezim se vraci na prvni stranku
await page.evaluate(()=>window.panelPresence('idle'));
await page.waitForTimeout(700);
await page.evaluate(()=>window.panelPresence('active'));
await page.waitForTimeout(400);
assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.pdots i')].findIndex(d=>d.classList.contains('on'))), 0,
  'po klidovem rezimu je panel zpatky na prvni strance');

assert.equal(errs.length,0,'zadne chyby:\n'+errs.join('\n'));
console.log('ok  pages-browser');
await b.close(); srv.close();

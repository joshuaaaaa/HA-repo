/* ------------------------------------------------------------------
   Predpoved pocasi, kalendar, seznam ukolu a kamery proti falesnemu
   Home Assistantovi - vcetne okna s ovladanim prehravace a vyberu.

   Potrebuje Playwright (v CI nebezi):
       npm i -g playwright && node tests/feeds-browser.mjs
   ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'../android/app/src/main/assets');
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const srv=http.createServer((q,r)=>{const u=q.url.split('?')[0];
 if(u.startsWith('/api/camera_proxy')){r.writeHead(200,{'Content-Type':'image/png'});r.end(PNG);return;}
 const p=path.join(ROOT,u==='/'?'index.html':u);
 try{r.writeHead(200,{'Content-Type':T[path.extname(p)]||'text/plain'});r.end(fs.readFileSync(p));}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(8798,r));
const b=await chromium.launch();
const page=await b.newPage({viewport:{width:1600,height:1000}});
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});

const layout={v:1,title:'DŮM',weather:'weather.dum',pages:[
 {name:'Domov',grid:{cols:2,rows:2},cards:[
   {name:'PŘEDPOVĚĎ',code:'W',tone:'cyan',view:'forecast',count:4,dial:{entity:'weather.dum'}},
   {name:'KALENDÁŘ',code:'K',tone:'violet',view:'calendar',count:4,days:7,dial:{entity:'calendar.rodina'}},
   {name:'NÁKUP',code:'N',tone:'green',view:'todo',count:4,dial:{entity:'todo.nakup'}},
   {name:'DVEŘE',code:'CAM',tone:'amber',view:'camera',refresh:5,dial:{entity:'camera.dvere'}}],
  panels:[{name:'Kamery',tone:'cyan',items:[
    {entity:'camera.dvere',name:'Vchod',view:'camera'},
    {entity:'camera.garaz',name:'Garáž',view:'camera'},
    {entity:'media_player.obyvak',name:'Přehrávač',tap:'detail'},
    {entity:'input_select.rezim',name:'Režim',tap:'detail'}]}]}
]};
await page.addInitScript((l)=>{localStorage.setItem('panelCfg',JSON.stringify({baseUrl:'http://localhost:8798',token:'G',layout:JSON.stringify(l)}));},layout);
const calls=[];
await page.routeWebSocket(/\/api\/websocket/, ws=>{
  const now=new Date().toISOString();
  const mk=(id,state,attrs={})=>({entity_id:id,state:String(state),attributes:attrs,last_changed:now});
  const states=[
    mk('weather.dum','partlycloudy',{friendly_name:'Dům',temperature:12.4,temperature_unit:'°C'}),
    mk('calendar.rodina','on',{friendly_name:'Rodina'}),
    mk('todo.nakup','3',{friendly_name:'Nákup'}),
    mk('camera.dvere','idle',{friendly_name:'Dveře',entity_picture:'/api/camera_proxy/camera.dvere?token=a'}),
    mk('camera.garaz','idle',{friendly_name:'Garáž',entity_picture:'/api/camera_proxy/camera.garaz?token=b'}),
    mk('media_player.obyvak','playing',{friendly_name:'Obývák',media_title:'Zkouška',media_artist:'Kapela',volume_level:0.4,entity_picture:'/api/camera_proxy/art.png'}),
    mk('input_select.rezim','Doma',{friendly_name:'Režim',options:['Doma','Pryč','Spánek']})
  ];
  const den=(d)=>{const x=new Date(Date.now()+d*86400000);return x.toISOString();};
  ws.onMessage(raw=>{const m=JSON.parse(raw);
    if(m.type==='auth')ws.send(JSON.stringify({type:'auth_ok'}));
    else if(m.type==='get_states')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:states}));
    else if(m.type==='subscribe_events')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));
    else if(m.type==='weather/subscribe_forecast'){
      calls.push('forecast');
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));
      ws.send(JSON.stringify({id:m.id,type:'event',event:{type:'daily',forecast:[
        {datetime:den(0),condition:'sunny',temperature:22,templow:11,precipitation_probability:0},
        {datetime:den(1),condition:'rainy',temperature:18,templow:9,precipitation_probability:80},
        {datetime:den(2),condition:'cloudy',temperature:16,templow:8,precipitation_probability:20},
        {datetime:den(3),condition:'snowy',temperature:2,templow:-3,precipitation_probability:60}]}}));
    }
    else if(m.type==='todo/item/subscribe'){
      calls.push('todo');
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));
      ws.send(JSON.stringify({id:m.id,type:'event',event:{items:[
        {uid:'1',summary:'Mléko',status:'needs_action'},
        {uid:'2',summary:'Chléb',status:'needs_action'},
        {uid:'3',summary:'Káva',status:'completed'},
        {uid:'4',summary:'Máslo',status:'needs_action'}]}}));
    }
    else if(m.type==='call_service' && m.return_response){
      calls.push('calendar:'+JSON.stringify(m.service_data));
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:{context:{},response:{
        'calendar.rodina':{events:[
          {start:new Date(Date.now()+3600e3).toISOString(),end:new Date(Date.now()+7200e3).toISOString(),summary:'Večeře'},
          {start:new Date(Date.now()-7200e3).toISOString(),end:new Date(Date.now()-3600e3).toISOString(),summary:'Už bylo'},
          {start:new Date(Date.now()+86400e3).toISOString().slice(0,10),end:new Date(Date.now()+2*86400e3).toISOString().slice(0,10),summary:'Svoz plastů'}]}}}}));
    }
    else if(m.type==='call_service'){ calls.push(m.domain+'.'+m.service+' '+JSON.stringify(m.service_data));
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null})); }
    else if(m.type==='history/history_during_period'){ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:{}}));}
    else if(m.type==='ping')ws.send(JSON.stringify({id:m.id,type:'pong'}));});
  ws.send(JSON.stringify({type:'auth_required'}));
});
await page.goto('http://localhost:8798/index.html');
await page.waitForTimeout(3300);

const out=await page.evaluate(()=>{
  const txt=(s)=>[...document.querySelectorAll(s)].map(e=>e.textContent.trim());
  return {
    predpoved:txt('.v-forecast .lrow').slice(0,4),
    kalendar:txt('.v-calendar .lrow'),
    ukoly:txt('.v-todo .lrow'),
    kamer:document.querySelectorAll('.camw .cam').length,
    nahledu:document.querySelectorAll('.camthumb img').length,
    teplota:document.querySelector('.v-forecast .n')?.textContent
  };
});
console.log('predpoved:',out.predpoved);
console.log('kalendar:',out.kalendar);
console.log('ukoly:',out.ukoly);
console.log('kamera v sekci:',out.kamer,'| nahledy v panelu:',out.nahledu,'| teplota:',out.teplota);
assert.equal(out.predpoved.length,4,'ctyri dny predpovedi');
assert.ok(out.kalendar.length===2,'ukazuji se jen nadchazejici udalosti');
assert.equal(out.ukoly.length,3,'hotove ukoly se neukazuji');
assert.equal(out.nahledu,2,'dva nahledy kamer v panelu');
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/feeds-panel.png'});

// odskrtnuti ukolu
await page.locator('.v-todo .lrow').first().click();
await page.waitForTimeout(400);
console.log('po odskrtnuti:',calls.filter(c=>c.startsWith('todo.')));
assert.ok(calls.some(c=>c.startsWith('todo.update_item')),'klepnuti odskrtne ukol');

// okno prehravace a vyber rezimu
await page.locator('.lt').nth(2).click();
await page.waitForTimeout(500);
console.log('prehravac:',await page.evaluate(()=>{
  const w=document.querySelector('#detail .dwin');
  return {obal:!!w.querySelector('.dmedia img'),titul:w.querySelector('.dmtxt b')?.textContent,
          posuvniky:[...w.querySelectorAll('.dsl span')].map(s=>s.textContent)};}));
await page.evaluate(()=>Dialog.close()); await page.waitForTimeout(300);
await page.locator('.lt').nth(3).click();
await page.waitForTimeout(500);
const sel=await page.evaluate(()=>{
  const w=document.querySelector('#detail .dwin');
  return [...w.querySelectorAll('.dbtn')].map(b=>b.textContent);});
console.log('vyber rezimu:',sel);
assert.ok(sel.includes('Pryč'),'moznosti vyberu jsou tlacitka');
await page.locator('#detail .dbtn', {hasText:'Pryč'}).click();
await page.waitForTimeout(300);
console.log('po vyberu:',calls.filter(c=>c.startsWith('input_select')));
assert.ok(calls.some(c=>c.startsWith('input_select.select_option')));
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/feeds-dialog.png'});

assert.equal(errs.length,0,'bez chyb:\n'+errs.join('\n'));
console.log('odbery:',calls.filter(c=>c==='forecast'||c==='todo').length,'| kalendar dotaz:',calls.filter(c=>c.startsWith('calendar:')).length);
console.log('ok  feeds-browser');
await b.close(); srv.close();

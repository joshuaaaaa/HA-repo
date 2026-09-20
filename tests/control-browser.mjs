/* ------------------------------------------------------------------
   Ovladani z panelu v opravdovem prohlizeci: okno s jasem a barvou,
   dlouhy stisk, zvetsena sekce, stupnice u krivky.

   Potrebuje Playwright (v CI nebezi):
       npm i -g playwright && node tests/control-browser.mjs
   ------------------------------------------------------------------ */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'../android/app/src/main/assets');
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
const srv=http.createServer((q,r)=>{const u=q.url.split('?')[0];const p=path.join(ROOT,u==='/'?'index.html':u);
 try{r.writeHead(200,{'Content-Type':T[path.extname(p)]||'text/plain'});r.end(fs.readFileSync(p));}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(8795,r));
const b=await chromium.launch();
const page=await b.newPage({viewport:{width:1600,height:1000}});
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});

const layout={v:1,title:'',weather:'weather.dum',cards:[
  {name:'OBÝVÁK',code:'T1',tone:'cyan',view:'graph',hours:6,dial:{entity:'sensor.t',caption:'Teplota',decimals:1}},
  {name:'ODBĚR',code:'W',tone:'violet',view:'gauge',dial:{entity:'sensor.p',caption:'Příkon',min:0,max:9000}}
],panels:[{name:'Světla',tone:'amber',items:[
  {entity:'light.obyvak',name:'Obývák',tap:'detail'},
  {entity:'light.kuchyne',name:'Kuchyně'},
  {entity:'cover.roleta',name:'Roleta',tap:'detail'}
]}]};

await page.addInitScript((l)=>{localStorage.setItem('panelCfg',JSON.stringify({baseUrl:'http://localhost:8795',token:'G',layout:JSON.stringify(l)}));},layout);
await page.routeWebSocket(/\/api\/websocket/, ws=>{
  const now=new Date().toISOString();
  globalThis.calls=[];
  const states=[
    {entity_id:'sensor.t',state:'22.4',attributes:{friendly_name:'Teplota',unit_of_measurement:'°C',device_class:'temperature'},last_changed:now},
    {entity_id:'sensor.p',state:'4727',attributes:{friendly_name:'Příkon',unit_of_measurement:'W',device_class:'power'},last_changed:now},
    {entity_id:'light.obyvak',state:'on',attributes:{friendly_name:'Obývák',brightness:128,
      supported_color_modes:['color_temp','hs'],color_temp_kelvin:3000,min_color_temp_kelvin:2200,max_color_temp_kelvin:6500},last_changed:now},
    {entity_id:'light.kuchyne',state:'off',attributes:{friendly_name:'Kuchyně',supported_color_modes:['onoff']},last_changed:now},
    {entity_id:'cover.roleta',state:'open',attributes:{friendly_name:'Roleta',current_position:70},last_changed:now},
    {entity_id:'weather.dum',state:'partlycloudy',attributes:{friendly_name:'Dům',temperature:12.4,temperature_unit:'°C'},last_changed:now}
  ];
  ws.onMessage(raw=>{const m=JSON.parse(raw);
    if(m.type==='auth')ws.send(JSON.stringify({type:'auth_ok'}));
    else if(m.type==='get_states')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:states}));
    else if(m.type==='subscribe_events')ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));
    else if(m.type==='call_service'){
      globalThis.calls.push([m.domain,m.service,m.service_data]);
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:null}));
      ws.send(JSON.stringify({type:'event',event:{event_type:'state_changed',data:{entity_id:'__call',
        new_state:{entity_id:'__call',state:JSON.stringify([m.domain,m.service,m.service_data]),attributes:{},last_changed:new Date().toISOString()}}}}));
    }
    else if(m.type==='history/history_during_period'){const res={};const t1=Date.now()/1000;
      for(const id of m.entity_ids){const pts=[];for(let i=60;i>=0;i--)pts.push({s:String((22+Math.sin(i/6)*2.5).toFixed(1)),lu:t1-i*350});res[id]=pts;}
      ws.send(JSON.stringify({id:m.id,type:'result',success:true,result:res}));}
    else if(m.type==='ping')ws.send(JSON.stringify({id:m.id,type:'pong'}));});
  ws.send(JSON.stringify({type:'auth_required'}));
});
// zaznamenavani volanych sluzeb pres falesnou entitu __call
await page.goto('http://localhost:8795/index.html');
await page.waitForTimeout(2600);

/* --- graf: stupnice a kulaty bod --- */
const g = await page.evaluate(()=>{
  const dot=document.querySelector('.graphw .cdot');
  const r=dot?dot.getBoundingClientRect():null;
  return {ylabels:[...document.querySelectorAll('.graphw .cy span')].map(s=>s.textContent),
          xlabels:[...document.querySelectorAll('.graphw .cx span')].map(s=>s.textContent),
          dot:r?{w:Math.round(r.width),h:Math.round(r.height)}:null};
});
console.log('graf:',JSON.stringify(g));
console.log('pocasi v zahlavi:', await page.evaluate(()=>{
  const w=document.querySelector('.wx'); return w? w.textContent : 'NENI';}));
assert.ok(g.ylabels.length>=3,'svisla stupnice ma popisky');
assert.equal(g.dot.w,g.dot.h,'bod na konci krivky je kulaty, ne oval');
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/ctrl-panel.png'});

/* --- klepnuti na dlazdici s "detail" otevre okno --- */
await page.locator('.lt').first().click();
await page.waitForTimeout(400);
const dlg = await page.evaluate(()=>{
  const w=document.querySelector('#detail .dwin');
  if(!w) return null;
  return {open:document.body.classList.contains('detailing'),
          nazev:w.querySelector('.dnames b').textContent,
          posuvniky:[...w.querySelectorAll('.dslide .dsl span')].map(s=>s.textContent),
          barvy:w.querySelectorAll('.dsw i').length,
          tlacitka:[...w.querySelectorAll('.dbtn')].map(b=>b.textContent).slice(0,4)};
});
console.log('okno svetla:',JSON.stringify(dlg));
assert.ok(dlg.open && dlg.posuvniky.includes('Jas'),'okno ukazuje jas');
assert.ok(dlg.barvy>0,'a barvy');
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/ctrl-dialog.png'});

/* --- posuvnik jasu posle sluzbu --- */
await page.evaluate(()=>{
  const inp=document.querySelector('#detail .dslide input[type=range]');
  inp.value=42; inp.dispatchEvent(new Event('change',{bubbles:true}));
});
await page.waitForTimeout(400);
console.log('sluzba po posunu jasu:', JSON.stringify(globalThis.calls.at(-1)));
assert.deepEqual(globalThis.calls.at(-1), ['light','turn_on',{entity_id:'light.obyvak',brightness_pct:42}],
  'posuvnik jasu posle light.turn_on s brightness_pct');

// barva
await page.locator('#detail .dsw i').nth(8).click();
await page.waitForTimeout(300);
console.log('sluzba po vyberu barvy:', JSON.stringify(globalThis.calls.at(-1)));
assert.equal(globalThis.calls.at(-1)[1],'turn_on');
assert.ok(globalThis.calls.at(-1)[2].rgb_color,'barva se posila jako rgb_color');

// teplota bile
await page.evaluate(()=>{
  const inp=document.querySelectorAll('#detail .dslide input[type=range]')[1];
  inp.value=4000; inp.dispatchEvent(new Event('change',{bubbles:true}));
});
await page.waitForTimeout(300);
console.log('sluzba po zmene bile:', JSON.stringify(globalThis.calls.at(-1)));
assert.equal(globalThis.calls.at(-1)[2].color_temp_kelvin,4000);

/* --- zavreni a dlouhy stisk na jine dlazdici --- */
await page.click('#detail .dbtn.x');
await page.waitForTimeout(300);
console.log('okno zavreno:', await page.evaluate(()=>!document.body.classList.contains('detailing')));

const tile = page.locator('.lt').nth(1);
await page.waitForTimeout(300);
const tb = await tile.boundingBox();
await page.mouse.move(tb.x+tb.width/2, tb.y+tb.height/2);
await page.mouse.down();
await page.waitForTimeout(400);
await page.waitForTimeout(500);
await page.mouse.up();
await page.waitForTimeout(400);
console.log('dlouhy stisk otevrel okno:', await page.evaluate(()=>document.body.classList.contains('detailing')),
            await page.evaluate(()=>document.querySelector('#detail .dnames b')?.textContent));
assert.ok(await page.evaluate(()=>document.body.classList.contains('detailing')),
  'dlouhy stisk otevre okno s ovladanim');
await page.evaluate(()=>Dialog.close());
await page.waitForTimeout(300);
// roleta: tlacitka a poloha
await page.evaluate(()=>Dialog.close());
await page.waitForTimeout(200);
await page.locator('.lt').nth(2).click();
await page.waitForTimeout(400);
console.log('okno rolety:', await page.evaluate(()=>{
  const w=document.querySelector('#detail .dwin');
  return {tlacitka:[...w.querySelectorAll('.dbtn')].map(b=>b.textContent),
          posuvnik:w.querySelector('.dsl span')?.textContent};}));
await page.locator('#detail .dbtn', {hasText:'Zavřít'}).click();
await page.waitForTimeout(300);
console.log('sluzba rolety:', JSON.stringify(globalThis.calls.at(-1)));
assert.deepEqual(globalThis.calls.at(-1).slice(0,2), ['cover','close_cover']);
await page.evaluate(()=>Dialog.close());
await page.waitForTimeout(300);

await page.evaluate(()=>Dialog.close());
await page.waitForTimeout(300);

/* --- zoom sekce --- */
await page.locator('.card').first().click();
await page.waitForTimeout(700);
const z = await page.evaluate(()=>{
  const w=document.querySelector('#zoom .zwin');
  const r=w.getBoundingClientRect();
  return {zooming:document.body.classList.contains('zooming'),
          w:Math.round(r.width),h:Math.round(r.height),
          karet:document.querySelectorAll('#zoomBody .card').length,
          hodnota:document.querySelector('#zoomBody .graphw .n')?.textContent};
});
console.log('zoom:',JSON.stringify(z));
assert.ok(z.zooming && z.karet===1,'zvetsena je prave jedna sekce');
await page.waitForTimeout(600);
console.log('zoom po dobehnuti:', await page.evaluate(()=>{
  const w=document.querySelector('#zoom .zwin'); const r=w.getBoundingClientRect();
  return {left:Math.round(r.left),top:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
          transform:getComputedStyle(w).transform};}));
if (process.env.SCRATCH) await page.screenshot({path:process.env.SCRATCH+'/ctrl-zoom.png'});
await page.click('#zoomClose');
await page.waitForTimeout(500);
console.log('zoom zavren:', await page.evaluate(()=>!document.body.classList.contains('zooming')));

assert.equal(errs.length, 0, 'zadna chyba v konzoli:\n' + errs.join('\n'));
console.log('ok  control-browser');
await b.close(); srv.close();

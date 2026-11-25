import {createRequire} from 'module';const require=createRequire(import.meta.url);const {chromium,devices}=require('playwright');
const U='file:///home/claude/construmart-pagina/index.html';const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],deviceScaleFactor:2});await ctx.route(/^https?:/,r=>r.abort());const p=await ctx.newPage();
await p.goto(U);await p.waitForTimeout(1500);await p.screenshot({path:'s_home.jpg',quality:92,type:'jpeg'});
await p.evaluate(()=>location.hash='construccion');await p.waitForTimeout(800);await p.evaluate(()=>scrollTo(0,330));await p.waitForTimeout(300);await p.screenshot({path:'s_cat.jpg',quality:92,type:'jpeg'});
// agrega cosas
await p.evaluate(()=>{const cs=[...document.querySelectorAll('#view .card')].slice(0,4);for(const c of cs){const s=c.querySelector('select');if(s){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))}c.querySelector('[data-addfull]').click()}});
await p.waitForTimeout(500);await p.screenshot({path:'s_cat2.jpg',quality:92,type:'jpeg'});
await p.evaluate(()=>location.hash='cotizacion');await p.waitForTimeout(900);
const y=await p.evaluate(()=>{const t=document.querySelector('#qbody').closest('table')||document.querySelector('#qbody');return t.getBoundingClientRect().top+scrollY-260});await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(300);await p.screenshot({path:'s_lista.jpg',quality:92,type:'jpeg'});
await p.fill('#fname','Juan');await p.fill('#fphone','311 123 4567');
await p.evaluate(()=>{const w=document.querySelector('#waBtn');w.scrollIntoView({block:'center'})});await p.waitForTimeout(300);await p.screenshot({path:'s_enviar.jpg',quality:92,type:'jpeg'});
const r=await p.evaluate(()=>{const q=document.querySelector('#waBtn').getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]});console.log('btn',r);
await b.close();

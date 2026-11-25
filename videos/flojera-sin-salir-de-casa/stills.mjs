import {createRequire} from 'module';const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/vid8/v.html');await p.waitForTimeout(800);
const ts=process.argv.slice(2).map(Number);
for(const t of ts){await p.evaluate(t=>R(t),t);await p.waitForTimeout(60);await p.screenshot({path:`st_${t}.jpg`,type:'jpeg',quality:85})}
console.log(errs);await b.close();

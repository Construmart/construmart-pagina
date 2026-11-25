import {createRequire} from 'module';import {spawn} from 'child_process';import fs from 'fs';const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const FPS=30,S=[["s2",2.0,3.0]];
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file:///home/claude/vid9/v.html');await p.waitForTimeout(800);
const list=[];
for(const [id,a,z] of S){
  const n=Math.round((z-a)*FPS),tmp=`${id}.tmp.mp4`;
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r',String(FPS),tmp]);
  for(let i=0;i<n;i++){const t=a+i/FPS;await p.evaluate(t=>R(t),t);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
  ff.stdin.end();await new Promise((res,rej)=>ff.on('close',c=>c===0?res():rej(new Error(id))));fs.renameSync(tmp,`${id}.mp4`);list.push(`file '${id}.mp4'`);console.log(id,n);
}
await b.close();

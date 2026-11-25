import {createRequire} from 'module';import {spawn} from 'child_process';import fs from 'fs';const require=createRequire('/home/claude/vid9/render.mjs');const {chromium}=require('playwright');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});await p.goto('file:///home/claude/vid9/v6.html');await p.waitForTimeout(800);
const N=206,L=N/30,f=8.2/(L-0.6);
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r','30','s6n.tmp.mp4']);
for(let i=0;i<N;i++){const n=i/30;const t=8.0+(n<0.6?n:0.6+(n-0.6)*f);await p.evaluate(t=>R(t),Math.min(t,16.79));const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
ff.stdin.end();await new Promise(r=>ff.on('close',r));fs.renameSync('s6n.tmp.mp4','s6n.mp4');await b.close();

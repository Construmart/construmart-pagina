import {createRequire} from 'module';import {spawn} from 'child_process';import fs from 'fs';const require=createRequire('/home/claude/vid9/render.mjs');const {chromium}=require('playwright');
const [,,out,T0,T1]=process.argv;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});await p.goto('file:///home/claude/vid10/v.html');
await p.evaluate(async()=>{await document.fonts.load('900 80px I');await document.fonts.load('800 54px I')});await p.waitForTimeout(900);
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r','30',out+'.tmp.mp4']);
const N=Math.round((T1-T0)*30);for(let i=0;i<N;i++){await p.evaluate(t=>R(t),+T0+i/30);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
ff.stdin.end();await new Promise(r=>ff.on('close',r));fs.renameSync(out+'.tmp.mp4',out);await b.close();

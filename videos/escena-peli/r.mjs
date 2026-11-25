import {createRequire} from 'module';import {spawn} from 'child_process';const require=createRequire('/home/claude/vid9/render.mjs');const {chromium}=require('playwright');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});await p.goto('file:///home/claude/peli/p.html');await p.waitForTimeout(600);
await p.evaluate(()=>R(1.6));await p.screenshot({path:'still.jpg',type:'jpeg',quality:90});
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-r','30','-pix_fmt','yuv420p','borrador_peli.mp4']);
for(let i=0;i<90;i++){await p.evaluate(t=>R(t),i/30);ff.stdin.write(await p.screenshot({type:'jpeg',quality:90}))}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();

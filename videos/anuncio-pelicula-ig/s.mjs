import {createRequire} from 'module';const require=createRequire('/home/claude/vid9/render.mjs');const {chromium}=require('playwright');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1350}});await p.goto('file:///home/claude/anuncio_peli/a.html');await p.waitForTimeout(700);
await p.screenshot({path:'Construmart_Anuncio_Pelicula.png'});await b.close();

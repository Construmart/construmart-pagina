
// ===== Ruleta: se acelera al inicio y se va frenando hasta caer en el tema =====
const TIMES=[];{let t=0.45,d=0.075;while(t<2.75){TIMES.push(+t.toFixed(3));t+=d;d*=1.12}TIMES.push(+t.toFixed(3))}
const TL=TIMES[TIMES.length-1];          // momento en que cae
const SEQ=['foco','zombie','gota','parrilla','huracan','sol','temblor','copo'];
const TEMA='bloque',TEMA_TXT='UN MUNDO DE BLOQUES';
const ZG='#7BC043',ZD='#3E7A1F';

const END=5.2;

function ricon(n,S){x.save();x.scale(S/100,S/100);x.lineJoin='round';x.lineCap='round';x.strokeStyle='#1d1f24';x.lineWidth=8;
 if(n==='foco'){x.fillStyle='#C9CDD2';x.beginPath();x.arc(0,-22,46,Math.PI*.8,Math.PI*2.2);x.lineTo(18,30);x.lineTo(-18,30);x.closePath();x.fill();x.stroke();
  x.fillStyle='#7d8288';rr(-22,30,44,30,6);x.fill();x.stroke();x.beginPath();x.moveTo(-22,44);x.lineTo(22,44);x.stroke();
  x.strokeStyle='#7d8288';x.lineWidth=6;x.beginPath();x.moveTo(-12,-10);x.lineTo(-4,-30);x.lineTo(4,-10);x.lineTo(12,-30);x.stroke();
  x.strokeStyle=RD0;x.lineWidth=12;x.beginPath();x.moveTo(-62,-70);x.lineTo(62,60);x.stroke()}
 if(n==='gota'){x.fillStyle='#3BA3F0';x.beginPath();x.moveTo(0,-70);x.bezierCurveTo(30,-30,52,0,52,22);x.arc(0,22,52,0,Math.PI);x.bezierCurveTo(-52,0,-30,-30,0,-70);x.fill();x.stroke();
  x.fillStyle='#fff';x.beginPath();x.ellipse(-20,18,9,16,.3,0,7);x.fill();
  x.strokeStyle='#3BA3F0';x.lineWidth=9;for(const yy of [70,88]){x.beginPath();for(let i=-70;i<=70;i+=5)x.lineTo(i,yy+Math.sin(i/9)*5);x.stroke()}}
 if(n==='parrilla'){x.fillStyle=OR;x.beginPath();x.moveTo(-40,-6);x.bezierCurveTo(-46,-50,-10,-30,0,-70);x.bezierCurveTo(10,-40,30,-55,40,-6);x.fill();x.stroke();
  x.fillStyle='#8B3A1A';x.beginPath();x.ellipse(0,-10,46,22,0,0,7);x.fill();x.stroke();
  x.fillStyle=DK;x.beginPath();x.arc(0,10,60,0,Math.PI);x.closePath();x.fill();x.stroke();
  x.beginPath();x.moveTo(-30,60);x.lineTo(-44,96);x.moveTo(30,60);x.lineTo(44,96);x.moveTo(0,70);x.lineTo(0,96);x.stroke()}
 if(n==='huracan'){x.strokeStyle='#5B6B7C';x.lineWidth=16;x.beginPath();for(let a=0;a<Math.PI*5;a+=.1){const r=6+a*5;x.lineTo(Math.cos(a)*r,Math.sin(a)*r*.9)}x.stroke();
  x.strokeStyle='#1d1f24';x.lineWidth=6;x.beginPath();for(let a=0;a<Math.PI*5;a+=.1){const r=6+a*5;x.lineTo(Math.cos(a)*r,Math.sin(a)*r*.9)}x.stroke()}
 if(n==='sol'){x.fillStyle=YE;for(let i=0;i<10;i++){x.save();x.rotate(i*Math.PI/5);x.beginPath();x.moveTo(-12,-50);x.lineTo(0,-82);x.lineTo(12,-50);x.closePath();x.fill();x.stroke();x.restore()}
  x.beginPath();x.arc(0,0,46,0,7);x.fill();x.stroke();x.fillStyle='#1d1f24';x.beginPath();x.arc(-16,-6,6,0,7);x.arc(16,-6,6,0,7);x.fill();
  x.beginPath();x.arc(0,18,14,Math.PI*1.15,Math.PI*1.85);x.stroke();x.fillStyle='#3BA3F0';x.beginPath();x.ellipse(36,-26,7,11,0,0,7);x.fill()}
 if(n==='temblor'){x.fillStyle='#B07A4A';rr(-70,-10,140,70,10);x.fill();x.stroke();x.fillStyle='#fff';x.strokeStyle='#1d1f24';
  x.beginPath();x.moveTo(-6,-10);x.lineTo(10,14);x.lineTo(-8,30);x.lineTo(8,60);x.stroke();
  x.fillStyle='#E8E2D8';x.beginPath();x.moveTo(-40,-10);x.lineTo(-40,-62);x.lineTo(-10,-82);x.lineTo(20,-62);x.lineTo(20,-10);x.closePath();x.fill();x.stroke();
  x.lineWidth=6;for(const s of [-1,1]){x.beginPath();x.moveTo(s*56,-70);x.lineTo(s*70,-60);x.lineTo(s*56,-48);x.lineTo(s*70,-38);x.stroke()}}
 if(n==='copo'){x.strokeStyle='#8FD3FF';x.lineWidth=14;for(let i=0;i<3;i++){x.save();x.rotate(i*Math.PI/3);x.beginPath();x.moveTo(0,-72);x.lineTo(0,72);
   for(const s of [-1,1]){x.moveTo(0,s*44);x.lineTo(-18,s*62);x.moveTo(0,s*44);x.lineTo(18,s*62)}x.stroke();x.restore()}}
 if(n==='bloque'){const c=(a,b2,cc)=>{x.fillStyle=a;x.beginPath();b2.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();x.stroke()};
  c('#C9CDD2',[[0,-80],[70,-45],[0,-10],[-70,-45]]);c('#9AA0A6',[[-70,-45],[0,-10],[0,75],[-70,40]]);c('#7D8389',[[70,-45],[0,-10],[0,75],[70,40]]);
  x.fillStyle='#4A4F55';for(const [a,b2] of [[-55,-12],[-30,0]]){x.beginPath();x.moveTo(a,b2);x.lineTo(a+20,b2+10);x.lineTo(a+20,b2+42);x.lineTo(a,b2+32);x.closePath();x.fill()}
  for(const [a,b2] of [[15,0],[40,-12]]){x.beginPath();x.moveTo(a,b2);x.lineTo(a+20,b2-10);x.lineTo(a+20,b2+22);x.lineTo(a,b2+32);x.closePath();x.fill()}}
 if(n==='zombie'){ // zombie caricatura, sin nada feo
  x.fillStyle=ZG;x.beginPath();x.ellipse(-62,4,14,20,0,0,7);x.ellipse(62,4,14,20,0,0,7);x.fill();x.stroke();
  x.beginPath();x.ellipse(0,6,62,70,0,0,7);x.fill();x.stroke();
  x.fillStyle='#2d2f33';x.beginPath();x.moveTo(-58,-24);x.quadraticCurveTo(-60,-70,-10,-70);x.lineTo(-4,-54);x.lineTo(8,-74);x.quadraticCurveTo(56,-70,58,-26);x.quadraticCurveTo(30,-50,10,-40);x.lineTo(0,-52);x.lineTo(-14,-38);x.quadraticCurveTo(-40,-48,-58,-24);x.fill();x.stroke();
  x.fillStyle='#fff';x.beginPath();x.arc(-24,0,20,0,7);x.fill();x.stroke();x.beginPath();x.arc(24,4,13,0,7);x.fill();x.stroke();
  x.fillStyle='#1d1f24';x.beginPath();x.arc(-20,4,6,0,7);x.arc(26,7,4,0,7);x.fill();
  x.fillStyle='#5a2a2a';x.beginPath();x.moveTo(-26,38);x.quadraticCurveTo(0,56,28,34);x.quadraticCurveTo(4,46,-26,38);x.fill();x.stroke();
  x.fillStyle='#fff';x.fillRect(-8,40,10,9);x.strokeRect(-8,40,10,9);
  x.strokeStyle=ZD;x.lineWidth=5;x.beginPath();x.moveTo(30,-30);x.lineTo(48,-14);for(const k of [0,.5,1]){const px=30+18*k,py=-30+16*k;x.moveTo(px-6,py+6);x.lineTo(px+6,py-6)}x.stroke()}
 x.restore()}
const RD0='#D93025';

function star(X,Y,r,a){x.save();x.translate(X,Y);x.globalAlpha=a;x.fillStyle=YE;x.beginPath();for(let i=0;i<8;i++){const rr2=i%2?r*.35:r;x.lineTo(Math.cos(i*Math.PI/4)*rr2,Math.sin(i*Math.PI/4)*rr2)}x.fill();x.restore()}

function bgd(t,z){ // fondo oscuro con rayos que giran; al caer en zombie se pinta verde
 const g=x.createRadialGradient(540,1000,80,540,1000,1300);g.addColorStop(0,lerpC('#3a2a1c','#22351a',z));g.addColorStop(1,'#111214');x.fillStyle=g;x.fillRect(0,0,1080,1920);
 x.save();x.translate(540,1050);x.rotate(t*.25);x.fillStyle=z>0?`rgba(123,192,67,${.10*z})`:'rgba(0,0,0,0)';
 const col=lerpC('#FF6A00','#7BC043',z);x.fillStyle=col;x.globalAlpha=.10;for(let i=0;i<16;i++){x.beginPath();x.moveTo(0,0);x.arc(0,0,1500,i*Math.PI/8,i*Math.PI/8+Math.PI/16);x.fill()}x.restore();
 // luna
 x.save();x.globalAlpha=.9;x.fillStyle='#F4EBD0';x.beginPath();x.arc(900,250,80,0,7);x.fill();x.fillStyle='rgba(0,0,0,.08)';x.beginPath();x.arc(875,235,16,0,7);x.arc(925,275,11,0,7);x.fill();x.restore();
 // estrellitas
 const ST=[[120,180],[300,90],[480,230],[640,120],[1000,520],[80,620],[980,820],[160,980],[60,1300],[1010,1250],[420,60],[760,300]];
 ST.forEach(([X,Y],i)=>star(X,Y,12+(i%3)*5,.35+.35*Math.abs(Math.sin(t*3+i))));
 // ciudad
 x.fillStyle='#0b0c0e';const B=[[0,1640,130],[120,1580,110],[220,1680,90],[300,1560,120],[690,1600,110],[790,1540,100],[880,1660,90],[960,1590,130]];
 for(const [X,Y,W] of B){x.fillRect(X,Y,W,1920-Y)}
 x.fillStyle=lerpC('#FFD23F','#B7E07A',z);x.globalAlpha=.7;for(const [X,Y,W] of B)for(let yy=Y+30;yy<1880;yy+=60)for(let xx=X+18;xx<X+W-20;xx+=34)if(((xx*7+yy*3)>>4)%3===0)x.fillRect(xx,yy,14,22);x.globalAlpha=1;
 // la ferretería (nuestro refugio)
 x.fillStyle='#16171a';x.fillRect(420,1700,240,220);x.fillStyle=OR;rr(404,1660,272,62,10);x.fill();x.fillStyle='#fff';x.font='900 34px I';x.textAlign='center';x.textBaseline='middle';x.fillText('FERRETERÍA',540,1693);
 x.fillStyle=lerpC('#FFD23F','#B7E07A',z);x.globalAlpha=.85;x.fillRect(450,1760,70,90);x.fillRect(560,1760,70,90);x.globalAlpha=1;
 x.fillStyle='#111214';x.fillRect(0,1880,1080,40)}
function lerpC(a,b,k){k=cl(k);const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const A=p(a),Bc=p(b);return 'rgb('+A.map((v,i)=>Math.round(v+(Bc[i]-v)*k)).join(',')+')'}

function t3d(txt,X,Y,size,k,rot,fill){if(k<=0)return;x.save();x.translate(X,Y);x.rotate(rot);const s=back(k);x.scale(s,s);x.font=`900 ${size}px I`;x.textAlign='center';x.textBaseline='middle';
 const w=x.measureText(txt).width;if(w>980){const f=980/w;x.scale(f,f)}
 x.lineJoin='round';const D=Math.round(size*.11);for(let i=D;i>0;i--){x.fillStyle=i===D?'#1d1f24':'#B34700';x.lineWidth=14;x.strokeStyle='#1d1f24';if(i===D)x.strokeText(txt,i*.8,i);x.fillText(txt,i*.8,i)}
 x.lineWidth=12;x.strokeStyle='#1d1f24';x.strokeText(txt,0,0);const g=x.createLinearGradient(0,-size/2,0,size/2);g.addColorStop(0,'#FFE07A');g.addColorStop(1,fill||YE);x.fillStyle=g;x.fillText(txt,0,0);
 x.lineWidth=3;x.strokeStyle='rgba(255,255,255,.6)';x.strokeText(txt,-2,-3);x.restore()}

function introR(t){
 const land=t>=TL?1:0,z=cl((t-TL)/.35);
 let shx=0,shy=0;if(t>=TL&&t<TL+.35){const a=(1-(t-TL)/.35)*22;shx=Math.sin(t*90)*a;shy=Math.cos(t*77)*a}
 // salida: zoom hacia el círculo
 const out=cl((t-(END-.75))/.75);
 x.setTransform(1,0,0,1,0,0);x.save();
 const zs=1+Math.pow(out,2.2)*5;x.translate(540,1050);x.scale(zs,zs);x.translate(-540+shx,-1050+shy);
 bgd(t,z);
 // título
 const wob=Math.sin(t*4)*.015;
 t3d('¿SOBREVIVIRÍAS',540,440,128,cl(t/.35),-.05+wob,OR);
 t3d('A…?',540,640,230,cl((t-.12)/.35),-.04-wob,OR);
 // círculo / ruleta
 const CX=540,CY=1050,RAD=270;let idx=-1;for(let i=0;i<TIMES.length;i++)if(t>=TIMES[i])idx=i;
 const kc=cl((t-.2)/.35);const pop=land?1+.16*Math.max(0,1-(t-TL)/.25)*Math.sin((t-TL)*30):1+(idx>=0&&t-TIMES[idx]<.06?.04:0);
 x.save();x.translate(CX,CY);const sc=back(kc)*pop;x.scale(sc,sc);
 x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(10,18,RAD+30,0,7);x.fill();
 x.fillStyle=land?ZG:OR;x.beginPath();x.arc(0,0,RAD+30,0,7);x.fill();x.lineWidth=12;x.strokeStyle='#1d1f24';x.stroke();
 // marcas de ruleta
 x.fillStyle='#1d1f24';for(let i=0;i<24;i++){x.save();x.rotate(i*Math.PI/12);x.fillRect(-3,-RAD-24,6,14);x.restore()}
 x.fillStyle='#FBF6EE';x.beginPath();x.arc(0,0,RAD,0,7);x.fill();x.lineWidth=10;x.stroke();
 x.save();x.beginPath();x.arc(0,0,RAD-6,0,7);x.clip();
 if(kc>0){let n,dy=0;if(land)n=TEMA;else{n=SEQ[(idx<0?0:idx)%SEQ.length];const since=idx<0?1:t-TIMES[idx];const nxt=idx+1<TIMES.length?TIMES[idx+1]-TIMES[idx]:.3;dy=(1-ease(since/Math.min(.08,nxt*.7)))*-120}
  x.globalAlpha=land?1:cl(1-Math.abs(dy)/160);x.translate(0,dy);const isz=land?230+20*Math.sin(t*5):200;ricon(n,isz);x.globalAlpha=1}
 x.restore();
 // flecha indicadora arriba
 x.fillStyle=YE;x.strokeStyle='#1d1f24';x.lineWidth=8;const bob=(!land&&idx>=0&&t-TIMES[idx]<.05)?8:0;x.beginPath();x.moveTo(-34,-RAD-70+bob);x.lineTo(34,-RAD-70+bob);x.lineTo(0,-RAD-14+bob);x.closePath();x.fill();x.stroke();
 x.restore();
 // estallido al caer
 if(land&&t<TL+.5){const k=(t-TL)/.5;x.save();x.translate(CX,CY);x.strokeStyle=YE;x.lineWidth=16*(1-k);for(let i=0;i<14;i++){const a=i*Math.PI/7,r1=RAD+40+k*120,r2=r1+90*(1-k);x.beginPath();x.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);x.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);x.stroke()}x.restore()}
 // Mart asomándose detrás del círculo
 const km=cl((t-TL-.12)/.3);if(km>0){const i=IM['mart-sorpresa'];if(i.complete){x.save();const X=lerp(1000,840,back(km)),Y=1210+Math.sin(t*30)*(t<TL+.6?4:0);x.translate(X,Y);x.rotate(.18);x.drawImage(i,-150,-150,300,300);x.restore()}}
 // letrero del tema
 const kt=cl((t-TL-.05)/.3);if(kt>0){x.save();x.translate(540,1440);const s=lerp(1.8,1,ease(kt));x.scale(s,s);x.rotate(-.04);x.globalAlpha=cl(kt*3);x.font='900 76px I';const w=x.measureText(TEMA_TXT).width;const f=Math.min(1,940/(w+80));x.scale(f,f);
  x.fillStyle='#1d1f24';rr(-w/2-40+8,-62+10,w+80,124,24);x.fill();x.fillStyle=ZG;rr(-w/2-40,-62,w+80,124,24);x.fill();x.lineWidth=8;x.strokeStyle='#1d1f24';x.stroke();
  x.fillStyle='#1d1f24';x.textAlign='center';x.textBaseline='middle';x.fillText(TEMA_TXT,0,4);x.restore()}

 // "con productos TRUPER"
 const kp=cl((t-.5)/.35);if(kp>0){x.save();x.translate(540,1575);const s=back(kp)*(1+.03*Math.sin(t*6));x.scale(s,s);x.rotate(.03);
  x.font='800 50px I';const a='con productos ',wa=x.measureText(a).width;x.font='900 62px I';const b='TRUPER',wb=x.measureText(b).width;const W=wa+wb;
  x.fillStyle='rgba(0,0,0,.5)';rr(-W/2-34+6,-48+8,W+68,96,48);x.fill();x.fillStyle='#FBF6EE';rr(-W/2-34,-48,W+68,96,48);x.fill();x.lineWidth=7;x.strokeStyle='#1d1f24';x.stroke();
  x.textBaseline='middle';x.textAlign='left';x.fillStyle='#1d1f24';x.font='800 50px I';x.fillText(a,-W/2,3);x.fillStyle=OR;x.font='900 62px I';x.lineWidth=6;x.strokeStyle='#1d1f24';x.strokeText(b,-W/2+wa,3);x.fillText(b,-W/2+wa,3);x.restore()}
 // flash al caer
 if(t>=TL&&t<TL+.12){x.fillStyle=`rgba(255,255,255,${.7*(1-(t-TL)/.12)})`;x.fillRect(0,0,1080,1920)}
 x.restore();
 if(out>0){x.fillStyle=`rgba(0,0,0,${cl((out-.35)/.65)})`;x.fillRect(0,0,1080,1920)}
}

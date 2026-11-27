// Entrada de la sección "¿Cuál es la diferencia?": dos ruletas que caen en cada producto
const VS_TI=5.0;
const PR=['pala','martillo','cinta','candado','escalera','linterna','brocha','pintura','parrilla','azadon','desplantador','cadena'];
const PIM={};for(const n of PR){const i=new Image();i.src='productos/'+n+'.png';PIM[n]=i}
function tickTimes(start,end,d0){const T=[];let t=start,d=d0;while(t<end){T.push(t);t+=d;d*=1.13}T.push(t);return T}
const TL_=tickTimes(.4,2.3,.07),TR_=tickTimes(.5,2.7,.07);
window.VS_TICKS=[TL_,TR_];
function lerpC2(a,b,k){k=cl(k);const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const A=p(a),B=p(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')+')'}
function wheel(t,CX,CY,R,T,kind,off){const last=T[T.length-1],land=t>=last;let idx=-1;for(let i=0;i<T.length;i++)if(t>=T[i])idx=i;
 const kc=cl((t-.15)/.35);if(kc<=0)return;const pop=land?1+.14*Math.max(0,1-(t-last)/.25)*Math.sin((t-last)*30):1+(idx>=0&&t-T[idx]<.06?.04:0);
 x.save();x.translate(CX,CY);const sc=back(kc)*pop;x.scale(sc,sc);
 x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.arc(8,14,R+26,0,7);x.fill();
 x.fillStyle=land?(kind==='c'?OR:RD):DK;x.beginPath();x.arc(0,0,R+26,0,7);x.fill();x.lineWidth=10;x.strokeStyle='#1d1f24';x.stroke();
 x.fillStyle='#1d1f24';for(let i=0;i<20;i++){x.save();x.rotate(i*Math.PI/10);x.fillRect(-3,-R-21,6,12);x.restore()}
 x.fillStyle='#FBF6EE';x.beginPath();x.arc(0,0,R,0,7);x.fill();x.lineWidth=8;x.stroke();
 x.save();x.beginPath();x.arc(0,0,R-5,0,7);x.clip();
 if(land){const s=.62+.03*Math.sin(t*5);bag({x:0,y:R*.62,s,kind,mood:'feliz',blink:false})}
 else{const n=PR[((idx<0?0:idx)+off)%PR.length],i=PIM[n];const since=idx<0?1:t-T[idx];const dy=(1-ease(since/.07))*-110;
  if(i&&i.complete){const f=Math.min(R*1.25/i.width,R*1.25/i.height);x.globalAlpha=cl(1-Math.abs(dy)/150);x.drawImage(i,-i.width*f/2,-i.height*f/2+dy,i.width*f,i.height*f);x.globalAlpha=1}}
 x.restore();
 x.fillStyle=YE;x.lineWidth=7;const bob=(!land&&idx>=0&&t-T[idx]<.05)?7:0;x.beginPath();x.moveTo(-28,-R-62+bob);x.lineTo(28,-R-62+bob);x.lineTo(0,-R-14+bob);x.closePath();x.fill();x.stroke();
 x.restore();
 if(land&&t<last+.45){const k=(t-last)/.45;x.save();x.translate(CX,CY);x.strokeStyle=YE;x.lineWidth=14*(1-k);x.lineCap='round';for(let i=0;i<12;i++){const a=i*Math.PI/6,r1=R+34+k*90,r2=r1+70*(1-k);x.beginPath();x.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);x.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);x.stroke()}x.restore()}
 return land}
function vsIntro(t){x.setTransform(1,0,0,1,0,0);
 const vl=TR_[TR_.length-1]+.25;let shx=0,shy=0;if(t>vl&&t<vl+.35){const a=(1-(t-vl)/.35)*20;shx=Math.sin(t*90)*a;shy=Math.cos(t*77)*a}
 const out=cl((t-(VS_TI-.35))/.35);x.save();x.translate(shx,shy);
 // fondo partido en diagonal
 x.fillStyle='#2b2e33';x.fillRect(-100,-100,1300,2200);
 x.fillStyle=lerpC2('#3a3e44','#7a7f87',cl((t-TL_[TL_.length-1])/.4));x.beginPath();x.moveTo(-100,-100);x.lineTo(640,-100);x.lineTo(440,2100);x.lineTo(-100,2100);x.closePath();x.fill();
 x.fillStyle=lerpC2('#3a3e44','#E9DCC6',cl((t-TR_[TR_.length-1])/.4));x.beginPath();x.moveTo(640,-100);x.lineTo(1300,-100);x.lineTo(1300,2100);x.lineTo(440,2100);x.closePath();x.fill();
 x.save();x.translate(540,960);x.rotate(t*.2);x.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<16;i++){x.beginPath();x.moveTo(0,0);x.arc(0,0,1500,i*Math.PI/8,i*Math.PI/8+Math.PI/16);x.fill()}x.restore();
 // título
 title([["¿CUÁL ES LA",'#fff'],["DIFERENCIA?",OR]],300,t/.35,'#1d1f24',110);
 // ruletas
 wheel(t,290,960,200,TL_,'c',0);wheel(t,790,1010,200,TR_,'m',5);
 // etiquetas
 const lk=cl((t-TL_[TL_.length-1]-.1)/.3),rk=cl((t-TR_[TR_.length-1]-.1)/.3);
 if(lk>0)chipAt('CEMENTO',290,1270,lk,OR);if(rk>0)chipAt('MORTERO',790,1320,rk,RD);
 // VS
 if(t>vl){x.save();x.translate(540,980);const s=lerp(2.4,1,ease(cl((t-vl)/.25)));x.scale(s,s);x.rotate(-.08);x.globalAlpha=cl((t-vl)*5);x.font='900 190px I';x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=22;x.strokeStyle='#1d1f24';x.strokeText('VS',0,0);x.fillStyle=YE;x.fillText('VS',0,0);x.restore();
  if(t<vl+.1){x.fillStyle=`rgba(255,255,255,${.6*(1-(t-vl)/.1)})`;x.fillRect(-100,-100,1300,2200)}}
 x.restore();
 if(out>0){x.fillStyle=`rgba(251,246,238,${out})`;x.fillRect(0,0,1080,1920)}}
function chipAt(txt,X,Y,k,bg){x.save();x.translate(X,Y);const s=back(k);x.scale(s,s);x.rotate(-.03);x.font='900 62px I';const w=x.measureText(txt).width;x.fillStyle='#1d1f24';rr(-w/2-30+6,-46+8,w+60,92,18);x.fill();x.fillStyle=bg;rr(-w/2-30,-46,w+60,92,18);x.fill();x.lineWidth=6;x.strokeStyle='#1d1f24';x.stroke();x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,0,3);x.restore()}

const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return 1-Math.pow(1-v,3)},back=v=>{v=cl(v);const k=1.9;return 1+(k+1)*Math.pow(v-1,3)+k*Math.pow(v-1,2)};
const lerp=(a,b,k)=>a+(b-a)*k;
const OR='#FF6A00',DK='#343639',CR='#FBF6EE',YE='#FFD23F',CON='#B9B4AC',RUST='#9A4A1C';

const GROUPS=[];for(const [a,b,t] of CAPS){const w=t.split(' ');const n=Math.ceil(w.length/5),per=Math.ceil(w.length/n);const tot=t.length;let acc=0;
 for(let g=0;g<n;g++){const ws=w.slice(g*per,(g+1)*per);const st=[];for(const ww of ws){st.push(a+(b-a)*acc/tot);acc+=ww.length+1}GROUPS.push({ws,st,end:g<n-1?a+(b-a)*acc/tot:b+0.15})}}
function caption(t){let g=null;for(const G of GROUPS)if(t>=G.st[0]-0.02&&t<G.end)g=G;if(!g)return;
 x.font='800 54px I';const sp=x.measureText(' ').width;const ws=g.ws.map(w=>x.measureText(w).width);const W=ws.reduce((a,b)=>a+b,0)+sp*(ws.length-1);
 const y=(typeof CAPY!=="undefined"?CAPY:1560),X0=540-W/2;x.fillStyle='rgba(52,54,57,.94)';rr(X0-26,y-50,W+52,86,22);x.fill();let X=X0;let cur=0;for(let i=0;i<g.ws.length;i++)if(t>=g.st[i])cur=i;
 for(let i=0;i<g.ws.length;i++){x.fillStyle=i===cur?YE:'#fff';x.textBaseline='middle';x.textAlign='left';x.fillText(g.ws[i],X,y-6);X+=ws[i]+sp}}
function rr(X,Y,W,H,r){x.beginPath();x.roundRect(X,Y,W,H,r)}
function chip(txt,y,k,bg=DK,fg='#fff',size=74){if(k<=0)return;x.save();x.translate(540,y);const s=back(k);x.scale(s,s);x.rotate(-0.03);x.font=`900 ${size}px I`;const w=x.measureText(txt).width;x.fillStyle=bg;rr(-w/2-34,-size*.78,w+68,size*1.5,22);x.fill();x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.fillText(txt,0,2);x.restore()}
function title(lines,y,k,stroke='#fff',fs=80){if(k<=0)return;x.save();x.textAlign='center';x.textBaseline='middle';lines.forEach((l,i)=>{const kk=back(k*1.4-i*.25);x.save();x.translate(540,y+i*fs*1.12);x.scale(kk,kk);x.font=`900 ${fs}px I`;x.lineJoin='round';x.lineWidth=16;x.strokeStyle=stroke;x.strokeText(l[0],0,0);x.fillStyle=l[1]||DK;x.fillText(l[0],0,0);x.restore()});x.restore()}
function bg(t){x.fillStyle=CR;x.fillRect(0,0,1080,1920);x.fillStyle='#FFF1E4';x.beginPath();x.arc(140+Math.sin(t*.6)*20,380,260,0,7);x.fill();x.beginPath();x.arc(980,1380+Math.cos(t*.5)*20,300,0,7);x.fill()}

function img(n,X,Y,W,k=1,rot=0){const i=IM[n];if(!i.complete||k<=0)return;const H=W*i.height/i.width;x.save();x.translate(X,Y);x.rotate(rot);const s=back(k);x.scale(s,s);x.drawImage(i,-W/2,-H,W,H);x.restore()}

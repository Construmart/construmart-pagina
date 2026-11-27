import numpy as np,subprocess,json
SR=44100;D=83.5
def load(f,ss=0,to=None,af=None):
    cmd=['ffmpeg','-v','error','-ss',str(ss)]+(['-to',str(to)] if to else [])+['-i',f]+(['-af',af] if af else [])+['-ac','1','-ar',str(SR),'-f','f32le','-']
    return np.frombuffer(subprocess.run(cmd,capture_output=True).stdout,np.float32).copy()
voz=np.zeros(int(SR*D));fx=np.zeros(int(SR*D))
def put(buf,a,t,v=1.0,fade=0.02):
    i=int(t*SR);n=min(len(a),len(buf)-i)
    if n<=0:return
    a=a[:n]*v;f=int(fade*SR)
    if f>0 and n>2*f:a[:f]*=np.linspace(0,1,f);a[-f:]*=np.linspace(1,0,f)
    buf[i:i+n]+=a
# narración
for s,e,t in [(0,37.0,5.2),(37.0,39.6,43.8),(39.6,58.2,47.2),(58.2,None,76.7)]:
    put(voz,load('narr.mp3',s,e),t)
# diálogos
put(voz,load('mart.mp3',0,1.9),8.3,1.0)
put(voz,load('mart.mp3',2.35,3.6),42.2,1.0)
put(voz,load('corran.mp3',af='aecho=0.8:0.6:350|700:0.45|0.25,volume=0.8'),43.0,1.0)
put(voz,load('zombie.mp3',0,1.5),67.2,1.3)
f2=load('fina2.mp3');fa=f2[:int(0.95*SR)];fb=f2[int(2.25*SR):];put(voz,np.concatenate([fa,np.zeros(int(.35*SR),np.float32),fb]),68.7)
put(voz,load('zombie.mp3',3.0,None),71.8,1.2)
put(voz,load('vigo.mp3'),75.5,1.1)
# efectos
S='sfx/'
intro=np.fromfile('/home/claude/work/intro2.raw',np.int16).astype(np.float32)/32768
put(fx,np.interp(np.arange(int(len(intro)*SR/44100)),np.arange(len(intro)),intro),0,0.9,0)
drone=load(S+'drone.mp3');dl=np.tile(drone,4)
d=dl[:int(SR*(65.9-9.1))].copy();ff=int(2*SR);d[:ff]*=np.linspace(0,1,ff);d[-ff:]*=np.linspace(1,0,ff);put(fx,d,9.1,0.3,0)
z=load(S+'zombies.mp3')
for t,a,b in [(5.2,0,3.9),(15.7,4,7.6),(24.0,8,13.5)]:put(fx,z[int(a*SR):int(b*SR)],t,0.35,0.3)
put(fx,load(S+'scratch.mp3'),9.1,0.7)
put(fx,load(S+'zas.mp3'),12.9,0.6);put(fx,load(S+'zas.mp3'),15.6,0.5);put(fx,load(S+'zas.mp3'),48.5,0.6)
pop=load(S+'pop.mp3')
for t in [24.0,29.5,36.2,47.0,51.9,26.5,33.7,76.5]:put(fx,pop,t,0.5)
for i in range(10):put(fx,pop,76.5+0.5+i*0.06,0.25)
put(fx,load(S+'cadena.mp3',0.5,3.5),26.0,0.7)
put(fx,load(S+'aerosol.mp3',1.6,3.4),26.1,0.6)
hit=load(S+'martillo.mp3',0.36,0.9)
for t in [30.6,31.2,31.8]:put(fx,hit,t,0.8)
put(fx,load(S+'parrilla.mp3',0,3.4),37.4,0.55,0.3)
put(fx,load(S+'zap.mp3'),40.8,0.8)
put(fx,load(S+'click.mp3'),45.4,0.9)
k=load(S+'toc.mp3',1.22,1.8)
for t in [61.4,62.3,63.2,66.1,66.5]:put(fx,k,t,0.9)
put(fx,load(S+'portazo.mp3'),76.35,0.9)
out=voz+fx*0.9
out=out/max(1,np.abs(out).max()/0.95)
out.astype(np.float32).tofile('mix.f32')
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','mix.f32','-af','loudnorm=I=-14:TP=-1.5:LRA=11','-ar','44100','-c:a','aac','-b:a','192k','mix.m4a'],check=True)
print('ok')

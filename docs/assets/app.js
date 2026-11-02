(()=>{
'use strict';
const DATA={};
/* ================= CORE ================= */
const PHOTOS = ["assets/img/ahroon.webp", "assets/img/michael.webp", "assets/img/abraham.webp"];
const T = window.THREE;
/* without three.js or WebGL there is no universe: show the plain page and stop */
function noGL(){ document.documentElement.classList.add('nogl'); throw new Error('Heloria: WebGL unavailable, showing the plain page'); }
if(!T) noGL();
{ const c=document.createElement('canvas'); let ok=false; try{ ok=!!(c.getContext('webgl2')||c.getContext('webgl')); }catch(e){} if(!ok) noGL(); }
/* runtime services that only exist inside a claude.ai artifact (shared db, user id); null on a normal website */
const RT={db:null,me:null,signals:0};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const E={io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, o:t=>1-Math.pow(1-t,3), i:t=>t*t*t, o5:t=>1-Math.pow(1-t,5), io5:t=>t<.5?16*t**5:1-Math.pow(-2*t+2,5)/2};
const TAU=Math.PI*2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(pointer: fine)').matches;
const SMALL=Math.min(innerWidth,innerHeight)<700;
const Q=(SMALL||!FINE)?.5:1;
const NARROW=()=>innerWidth<820||innerWidth/innerHeight<.9;
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v)};
const store={get(k,d){try{const v=localStorage.getItem('heloria.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('heloria.'+k,JSON.stringify(v))}catch(e){}}};
const fmt=n=>Math.round(n).toLocaleString('en-IE');
const fmtT=s=>{const m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+(s%60).toFixed(1).padStart(4,'0')};
const show=(sel,on)=>$(sel).classList.toggle('off',!on);
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const angDiff=(a,b)=>{let d=(a-b)%TAU; if(d>Math.PI)d-=TAU; if(d<-Math.PI)d+=TAU; return d;};
const seeded=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};

/* ---------- sound: a generative score, not beeps ---------- */
const A=(()=>{
  let ctx=null,out,comp,rev,revIn,on=false,muted=false; const n={};
  const CH=[[73.42,146.83,220,329.63,440],[65.41,130.81,196,293.66,392],[58.27,116.54,174.61,261.63,349.23],[55,110,164.81,246.94,329.63]];
  function init(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    out=ctx.createGain(); out.gain.value=0; out.connect(ctx.destination);
    comp=ctx.createDynamicsCompressor(); comp.threshold.value=-20; comp.ratio.value=3; comp.connect(out);
    rev=ctx.createConvolver(); const L=ctx.sampleRate*3.2, ir=ctx.createBuffer(2,L,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c); for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.6);}
    rev.buffer=ir; const rg=ctx.createGain(); rg.gain.value=.65; rev.connect(rg); rg.connect(comp); revIn=ctx.createGain(); revIn.connect(rev);
    // pad: five detuned voices per chord tone through a breathing low-pass
    n.padF=ctx.createBiquadFilter(); n.padF.type='lowpass'; n.padF.frequency.value=520; n.padF.Q.value=.7;
    n.padG=ctx.createGain(); n.padG.gain.value=.05; n.padF.connect(n.padG); n.padG.connect(comp); n.padG.connect(revIn);
    n.voices=CH[0].map((f,i)=>{ const os=[-6,5].map(dt=>{ const o=ctx.createOscillator(); o.type=i<1?'sine':'sawtooth'; o.frequency.value=f; o.detune.value=dt; const g=ctx.createGain(); g.gain.value=i<1?.9:.22/(1+i*.3); o.connect(g); g.connect(n.padF); o.start(); return o; }); return os; });
    const lfo=ctx.createOscillator(); lfo.frequency.value=.07; const lg=ctx.createGain(); lg.gain.value=220; lfo.connect(lg); lg.connect(n.padF.frequency); lfo.start();
    n.chord=0; n.nextChord=ctx.currentTime+9;
    // sub: the hole itself
    n.sub=ctx.createOscillator(); n.sub.type='sine'; n.sub.frequency.value=34; n.subG=ctx.createGain(); n.subG.gain.value=0; n.sub.connect(n.subG); n.subG.connect(comp); n.sub.start();
    const buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; n.buf=buf;
    const ns=ctx.createBufferSource(); ns.buffer=buf; ns.loop=true; ns.start();
    const mk=(type,f,q)=>{const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q||.7; const g=ctx.createGain(); g.gain.value=0; ns.connect(b); b.connect(g); g.connect(comp); return {b,g};};
    n.wind=mk('bandpass',700,.8); n.thrust=mk('bandpass',240,1.1); n.roar=mk('lowpass',380,.9); n.hiss=mk('highpass',3000,.5);
    n.ten=ctx.createOscillator(); n.ten.type='sawtooth'; n.ten.frequency.value=40; const tf=ctx.createBiquadFilter(); tf.type='lowpass'; tf.frequency.value=700; n.teng=ctx.createGain(); n.teng.gain.value=0; n.ten.connect(tf); tf.connect(n.teng); n.teng.connect(comp); n.ten.start();
  }
  const last=new WeakMap();
  const set=(p,v,tc=.08)=>{ if(!ctx) return; const l=last.get(p); if(l!==undefined&&Math.abs(l-v)<=Math.max(1e-4,Math.abs(v)*.004)) return; last.set(p,v); p.setTargetAtTime(v,ctx.currentTime,tc); };
  function tone(f,dur,g=.08,type='sine',f2=0,delay=0,send=0,atk=.008){
    if(!on) return; const t0=ctx.currentTime+delay, o=ctx.createOscillator(), a=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(comp);
    if(send){const s=ctx.createGain(); s.gain.value=send; a.connect(s); s.connect(revIn);} o.start(t0); o.stop(t0+dur+.05);
  }
  function noise(dur,g,f0,f1,type='lowpass',q=.8,delay=0,send=0){
    if(!on) return; const t0=ctx.currentTime+delay, s=ctx.createBufferSource(); s.buffer=n.buf; const b=ctx.createBiquadFilter(); b.type=type; b.Q.value=q;
    b.frequency.setValueAtTime(f0,t0); b.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+Math.min(.05,dur*.3)); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(b); b.connect(a); a.connect(comp); if(send){const x=ctx.createGain(); x.gain.value=send; a.connect(x); x.connect(revIn);} s.start(t0,Math.random()); s.stop(t0+dur+.05);
  }
  const PEN=[0,2,3,7,9]; // D dorian-ish pentatonic
  const note=i=>146.83*Math.pow(2,(PEN[((i%5)+5)%5]+12*Math.floor(i/5))/12);
  return {
    get on(){return on&&!muted}, get ctx(){return ctx},
    async start(){ try{ init(); on=true; await ctx.resume(); set(out.gain,muted?0:.7,.6); }catch(e){ on=false; } sndUI(); },
    toggle(){ muted=!muted; if(ctx) set(out.gain,muted?0:.7,.3); sndUI(); },
    get muted(){return muted},
    update(t,p){ // p: {sub, wind, pad}
      if(!ctx) return;
      if(ctx.currentTime>n.nextChord){ n.chord=(n.chord+1)%CH.length; n.nextChord=ctx.currentTime+10+Math.random()*4; CH[n.chord].forEach((f,i)=>n.voices[i].forEach(o=>o.frequency.setTargetAtTime(f,ctx.currentTime,2.2))); }
      if(p){ if(p.sub!=null) set(n.subG.gain,p.sub*.32,.4); if(p.pad!=null) set(n.padG.gain,p.pad*.06,.8); if(p.bright!=null) set(n.padF.frequency,380+p.bright*900,.6); }
    },
    tick(){ tone(2600,.02,.01,'square'); },
    click(){ tone(1200,.06,.03,'triangle',600); },
    whoosh(up=true,dur=1,g=.2){ noise(dur,g,up?220:2400,up?2400:220,'bandpass',1.1,0,.3); },
    stinger(i=0){ tone(note(8+i),2.4,.045,'sine',0,0,.8,.02); tone(note(10+i)*2,1.6,.015,'sine',0,.08,.8,.02); noise(1.4,.06,500,4000,'bandpass',2,0,.5); },
    swell(){ noise(2,.24,160,3400,'bandpass',1.4,0,.5); tone(146.83,2.6,.05,'sine',293.66,0,.6,.3); tone(220,2.4,.035,'sine',440,.15,.6,.3); },
    boom(){ tone(98,3.6,.5,'sine',22); noise(3,.5,3200,40,'lowpass',.8,0,.4); tone(587,2,.04,'sine',146,0,.9); },
    wind(v){ if(!ctx) return; set(n.wind.g.gain,Math.min(.26,v)); set(n.wind.b.frequency,400+v*2200); },
    thrust(v){ if(!ctx) return; set(n.thrust.g.gain,v*.18,.05); },
    roar(v){ if(!ctx) return; set(n.roar.g.gain,v*.7,.04); },
    hiss(v){ if(!ctx) return; set(n.hiss.g.gain,v*.08,.1); },
    whine(v){ if(!ctx) return; set(n.teng.gain,v*.07); set(n.ten.frequency,50+v*800); },
    chime(i,delay=0,g=.055){ const f=note(i); tone(f,1.2,g,'sine',0,delay,.6); tone(f*2,.5,g*.3,'sine',0,delay,.6); },
    chord(){ [0,2,4,7].forEach((k,j)=>this.chime(10+k,j*.07)); },
    buzz(){ tone(92,.3,.11,'sawtooth',60); noise(.22,.12,900,200); },
    pop(){ noise(.45,.3,2400,80); tone(170,.4,.09,'triangle',50); },
    alarm(){ tone(330,.3,.06,'square'); tone(262,.3,.06,'square',0,.17); },
    ping(f=1318,g=.045){ tone(f,1.4,g,'sine',0,0,.6); },
    blip(){ tone(1760,.08,.035,'square'); },
    launch(){ noise(1.1,.32,200,2600,'bandpass',.9,0,.2); },
    jam(){ tone(90,1.4,.18,'sine',38); tone(180,1.1,.04,'square',60); noise(.9,.14,600,90); },
    beep(f=880){ tone(f,.07,.035,'square'); },
    dock(){ tone(587,.7,.06,'sine',0,0,.5); tone(880,1,.05,'sine',0,.12,.5); },
    key(){ tone(1800+Math.random()*900,.025,.01,'triangle'); },
    /* formant voice: syllables shaped by three resonances. who: 0 buyer, 1 you */
    voice(who){ if(!ctx) return null; const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=who?118:182;
      const g=ctx.createGain(); g.gain.value=0; const bs=[0,1,2].map(k=>{const b=ctx.createBiquadFilter(); b.type='bandpass'; b.Q.value=who?7:9; b.frequency.value=[700,1200,2600][k]; o.connect(b); const bg=ctx.createGain(); bg.gain.value=[1,.7,.32][k]; b.connect(bg); bg.connect(g); return b;});
      g.connect(comp); const sg=ctx.createGain(); sg.gain.value=.25; g.connect(sg); sg.connect(revIn); o.start();
      return {o,g,bs, syl(dur,pitch,vowel){ const t0=ctx.currentTime; const F=[[730,1090,2440],[530,1840,2480],[270,2290,3010],[570,840,2410],[440,1020,2240],[660,1720,2410]][vowel%6];
          bs.forEach((b,k)=>b.frequency.setTargetAtTime(F[k]*(who?.92:1.08),t0,.02)); o.frequency.setTargetAtTime(pitch,t0,.03);
          g.gain.cancelScheduledValues(t0); g.gain.setTargetAtTime(on&&!muted?.16:0,t0,.012); g.gain.setTargetAtTime(0,t0+dur*.8,.03); },
        hold(v,pitch){ const t0=ctx.currentTime; g.gain.setTargetAtTime(v*(on&&!muted?.13:0),t0,.03); if(pitch) o.frequency.setTargetAtTime(pitch,t0,.05); },
        stop(){ try{ g.gain.setTargetAtTime(0,ctx.currentTime,.02); o.stop(ctx.currentTime+.2); }catch(e){} } }; }
  };
})();
function sndUI(){ const b=$('#snd'); b.classList.toggle('live',A.on); b.setAttribute('aria-pressed',A.on); $('.t',b).textContent=A.on?'Sound':'Muted'; }
$('#snd').addEventListener('click',()=>A.toggle());

/* ---------- renderer ---------- */
const canvas=$('#gl');
let renderer; try{ renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'}); }catch(e){ noGL(); }
const DPRMAX=Math.min(devicePixelRatio||1, Q<1?1.5:1.6);
let DPR=window.__TEST?1:DPRMAX;
renderer.setPixelRatio(DPR); renderer.setClearColor(0,1);
const hubCam=new T.PerspectiveCamera(36,1,.1,900), stCam=new T.PerspectiveCamera(36,1,.1,900);
const ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
const G={uTime:{value:0},uPx:{value:800},uMouse:{value:new T.Vector2(9,9)},uAspect:{value:1}};
const mkRT=()=>new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter,samples:Q<1?0:2});
const rtA=mkRT(), rtB=mkRT();
const post=new T.ShaderMaterial({
  uniforms:{tA:{value:rtA.texture},tB:{value:rtB.texture},uIris:{value:0},uIC:{value:new T.Vector2(.5,.5)},uIrisCol:{value:new T.Color('#FFC392')},
    uAspect:G.uAspect,uTime:G.uTime,uWarp:{value:0},uFlash:{value:0},uStretch:{value:0},uSC:{value:new T.Vector2(.5,.5)},
    uTint:{value:new T.Color(0,0,0)},uCA:{value:0},uGrade:{value:new T.Color(1,1,1)},uVig:{value:1},uExpo:{value:1},uBloom:{value:1}},
  vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`uniform sampler2D tA,tB; uniform float uIris,uAspect,uTime,uWarp,uFlash,uStretch,uCA,uVig,uExpo,uBloom; uniform vec2 uIC,uSC; uniform vec3 uIrisCol,uTint,uGrade; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  vec3 bl(sampler2D t,vec2 uv){ vec2 px=vec2(1./uAspect,1.)*.0045; vec2 qx=vec2(px.x,-px.y);
    vec3 g=texture2D(t,uv,3.).rgb*.45;
    g+=(texture2D(t,uv+px,5.).rgb+texture2D(t,uv-px,5.).rgb+texture2D(t,uv+qx,5.).rgb+texture2D(t,uv-qx,5.).rgb)*.15;
    g+=(texture2D(t,uv+px*2.6,6.5).rgb+texture2D(t,uv-px*2.6,6.5).rgb+texture2D(t,uv+qx*2.6,6.5).rgb+texture2D(t,uv-qx*2.6,6.5).rgb)*.11; return g*uBloom; }
  vec3 lookA(vec2 uv,float ca){ vec2 o=(uv-.5)*ca; return vec3(texture2D(tA,uv+o).r,texture2D(tA,uv).g,texture2D(tA,uv-o).b)+bl(tA,uv); }
  vec3 lookB(vec2 uv,float ca){ vec2 o=(uv-.5)*ca; return vec3(texture2D(tB,uv+o).r,texture2D(tB,uv).g,texture2D(tB,uv-o).b)+bl(tB,uv); }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  void main(){
    vec2 uv=vUv;
    if(uStretch>0.){ vec2 d=uv-uSC; d.x*=uAspect; float r=length(d); vec2 dn=d/max(r,1e-4); d=dn*pow(r,1.+uStretch*1.6)*(1.+uStretch*2.); d.x/=uAspect; uv=uSC+d; }
    float ca=.0012+uCA*.009+uStretch*.03;
    float m=0., rim=0.;
    if(uIris>2.5) m=1.;
    else if(uIris>0.){ vec2 q=(vUv-uIC)*vec2(uAspect,1.); float d=length(q); vec2 dir=q/max(d,1e-4);
      float n=vn(dir*2.2+vec2(uTime*.5,uTime*.3))*.6+vn(vUv*7.+uTime*.7)*.4; float R=uIris*(1.+.2*(n-.5));
      m=smoothstep(R+.01,R-.05,d); rim=smoothstep(.03,0.,abs(d-R))*(1.-smoothstep(1.2,2.,uIris)); }
    vec3 a=vec3(0.), b=vec3(0.);
    if(m<1.){ if(uWarp>.001){ vec3 s=vec3(0.); for(int i=0;i<6;i++){ float f=float(i)/5.; s+=lookA(mix(uv,uIC,f*uWarp*.3),ca); } a=s/6.; } else a=lookA(uv,ca); }
    if(m>0.) b=lookB(uv,ca);
    vec3 c=mix(a,b,m)*uExpo+uIrisCol*rim*.9;
    c=aces(c*1.05);
    c=pow(c,vec3(.96));
    c=mix(c,c*vec3(1.35,.5,.42),uStretch);
    c*=uGrade;
    float v=smoothstep(1.3,.3,length((vUv-.5)*vec2(uAspect,1.))*uVig); c*=mix(.5,1.,v);
    c+=uTint;
    c+=(hash(vUv*vec2(1920.,1080.)+fract(uTime))-.5)*.03;
    c=mix(c,vec3(1.,.98,.95),clamp(uFlash,0.,1.));
    gl_FragColor=vec4(max(c,0.),1.);
  }`, depthTest:false, depthWrite:false});
const postScene=new T.Scene(); const pq=new T.Mesh(new T.PlaneGeometry(2,2),post); pq.frustumCulled=false; postScene.add(pq);
function setPx(cam){ G.uPx.value=innerHeight*DPR/(2*Math.tan(cam.fov*Math.PI/360)); }
function resize(){ const w=innerWidth,h=innerHeight; renderer.setPixelRatio(DPR); renderer.setSize(w,h,false);
  [hubCam,stCam].forEach(c=>{c.aspect=w/h;c.updateProjectionMatrix();});
  rtA.setSize(Math.floor(w*DPR),Math.floor(h*DPR)); rtB.setSize(Math.floor(w*DPR),Math.floor(h*DPR)); G.uAspect.value=w/h; BH.resize(); }
addEventListener('resize',()=>{ resize(); if(window.__onResize) window.__onResize(); });

/* adaptive quality: watch frame times, trade pixel density and trace resolution for smoothness */
const QM={buf:[],cool:0,
  tick(ms,now){ if(window.__TEST) return; this.buf.push(ms); if(this.buf.length>60) this.buf.shift(); if(now<this.cool||this.buf.length<60) return;
    const avg=this.buf.reduce((a,b)=>a+b,0)/this.buf.length;
    if(avg>23){ if(rtA.samples>0){ rtA.samples=rtB.samples=0; rtA.dispose(); rtB.dispose(); } else if(BH.scale>.32){ BH.scale-=.1; BH.resize(); } else if(DPR>.75){ DPR=Math.max(.75,DPR-.25); resize(); } this.cool=now+2500; this.buf=[]; }
    else if(avg<13){ if(DPR<DPRMAX){ DPR=Math.min(DPRMAX,DPR+.25); resize(); } else if(BH.scale<(Q<1?.5:.9)){ BH.scale+=.1; BH.resize(); } this.cool=now+4000; this.buf=[]; } }};

/* ---------- particle + material toolkit ---------- */
const GLH=`vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 rotZ(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
float gs(float x){return exp(-x*x);}`;
function PM(o){
  const u=Object.assign({uTime:G.uTime,uPx:G.uPx,uMouse:G.uMouse,uAspect:G.uAspect,uSize:{value:o.size||.04},uMouseOn:{value:o.mouse||0},uCol:{value:new T.Color(o.color||'#FFC392')},uOp:{value:1}},o.uniforms||{});
  return new T.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,depthTest:o.depthTest!==false,blending:T.AdditiveBlending,
    vertexShader:`uniform float uTime,uPx,uSize,uMouseOn,uAspect,uOp; uniform vec2 uMouse; uniform vec3 uCol; ${o.decl||''}
    attribute vec4 aR; varying vec3 vC; varying float vA; ${GLH} ${o.fns||''}
    void main(){ vec3 p=position; vec3 col=uCol; float b=1.; float sz=1.; ${o.body||''}
      vec4 mv=modelViewMatrix*vec4(p,1.);
      if(uMouseOn>0.){ vec4 cl=projectionMatrix*mv; vec2 nd=cl.xy/cl.w; vec2 dd=nd-uMouse; dd.x*=uAspect; float ml=length(dd);
        float f=smoothstep(.24,0.,ml); mv.xy+=normalize(dd+.0001)*f*f*(-mv.z)*.11*uMouseOn; b*=1.+f*.5*uMouseOn; }
      gl_Position=projectionMatrix*mv; gl_PointSize=max(1.,uSize*sz*(.55+aR.z*.9)*uPx/-mv.z);
      vC=col; vA=b*uOp*smoothstep(.15,1.2,-mv.z); }`,
    fragmentShader:`varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.05,d); gl_FragColor=vec4(vC*vA*a,a); }`});
}
function cloud(N,fill,extra){
  const pos=new Float32Array(N*3), r=new Float32Array(N*4), ex={};
  if(extra) for(const k in extra) ex[k]=new Float32Array(N*extra[k]);
  const o=[0,0,0];
  for(let i=0;i<N;i++){ for(let k=0;k<4;k++) r[i*4+k]=Math.random(); fill(i,r.subarray(i*4,i*4+4),o,ex); pos[i*3]=o[0];pos[i*3+1]=o[1];pos[i*3+2]=o[2]; }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('aR',new T.BufferAttribute(r,4));
  for(const k in ex) g.setAttribute(k,new T.BufferAttribute(ex[k],extra[k]));
  g.boundingSphere=new T.Sphere(new T.Vector3(),1e4); return g;
}
function pts(g,m){const p=new T.Points(g,m); p.frustumCulled=false; return p;}
/* lit solid: warm key light from the hole at the origin, cool rim, optional emissive tint */
function LM(color,o={}){
  return new T.ShaderMaterial({uniforms:{uC:{value:new T.Color(color)},uE:{value:o.emit??0},uRim:{value:o.rim??.9},uKey:{value:new T.Vector3(0,0,0)},uKeyCol:{value:new T.Color(o.key||'#FFC392')},uAmb:{value:o.amb??.06},uOp:{value:o.op??1}},
    vertexShader:`varying vec3 vN; varying vec3 vW; varying vec3 vIC; void main(){ vec4 p=vec4(position,1.); vec3 nn=normal; vIC=vec3(1.);
      #ifdef USE_INSTANCING
        p=instanceMatrix*p; nn=mat3(instanceMatrix)*nn;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vIC=instanceColor;
      #endif
      vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(mat3(modelMatrix)*nn); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uC,uKey,uKeyCol; uniform float uE,uRim,uAmb,uOp; varying vec3 vN; varying vec3 vW; varying vec3 vIC; void main(){
      vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW); vec3 L=normalize(uKey-vW); float d=max(dot(n,L),0.);
      float r=pow(1.-max(dot(n,V),0.),2.6);
      vec3 base=uC*vIC; vec3 c=base*(uAmb+uKeyCol*d*1.1)+base*uE+mix(base,vec3(1.),.3)*r*uRim;
      gl_FragColor=vec4(c,uOp); }`, transparent:(o.op??1)<1, depthWrite:(o.op??1)>=1});
}
/* pooled particle bursts */
function Burst(scene,N,color,size){
  const P=new Float32Array(N*3).fill(9999), V=new Float32Array(N*3), L=new Float32Array(N), C=new Float32Array(N*3).fill(1); let I=0;
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); const R=new Float32Array(N*4); for(let i=0;i<R.length;i++) R[i]=Math.random();
  g.setAttribute('aR',new T.BufferAttribute(R,4)); g.setAttribute('aL',new T.BufferAttribute(L,1)); g.setAttribute('aC',new T.BufferAttribute(C,3)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e5);
  const m=PM({size,color,decl:'attribute float aL; attribute vec3 aC;',body:'b=aL*1.6; col=uCol*aC; sz=.6+aL*.6;'});
  const obj=pts(g,m); scene.add(obj);
  return { obj,
    emit(p,n,spd=2,col=null,up=0,life=1){ for(let k=0;k<n;k++){ const i=I++%N; P[i*3]=p.x;P[i*3+1]=p.y;P[i*3+2]=p.z; const s=spd*(.4+Math.random()*.6);
      V[i*3]=gauss()*s;V[i*3+1]=gauss()*s+up;V[i*3+2]=gauss()*s; L[i]=life; if(col){C[i*3]=col.r;C[i*3+1]=col.g;C[i*3+2]=col.b;}else{C[i*3]=C[i*3+1]=C[i*3+2]=1;} } },
    update(dt,grav=0,drag=1.6){ const k=Math.exp(-drag*dt); for(let i=0;i<N;i++){ if(L[i]<=0) continue; V[i*3]*=k;V[i*3+1]=V[i*3+1]*k-grav*dt;V[i*3+2]*=k; P[i*3]+=V[i*3]*dt;P[i*3+1]+=V[i*3+1]*dt;P[i*3+2]+=V[i*3+2]*dt; L[i]-=dt; if(L[i]<=0) P[i*3+1]=9999; }
      g.attributes.position.needsUpdate=true; g.attributes.aL.needsUpdate=true; g.attributes.aC.needsUpdate=true; },
    clear(){ L.fill(0); P.fill(9999); }
  };
}
function ringGeo(R,N,y=0){ const p=new Float32Array(N*3), a=new Float32Array(N); for(let k=0;k<N;k++){const t=k/N*TAU; p[k*3]=Math.cos(t)*R; p[k*3+1]=y; p[k*3+2]=Math.sin(t)*R; a[k]=t;} const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(p,3)); g.setAttribute('aAng',new T.BufferAttribute(a,1)); return g; }
const dashMat=(color,extra='')=>new T.ShaderMaterial({uniforms:{uC:{value:new T.Color(color)},uAng:{value:0},uR:{value:1},uOp:{value:0},uNear:{value:0},uTime:G.uTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`attribute float aAng; varying float vAng; void main(){ vAng=aAng; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform vec3 uC; uniform float uAng,uR,uOp,uNear,uTime; varying float vAng; void main(){ ${extra||`float df=mod(uAng-vAng,6.28318); float a=(.05+.7*exp(-df*2.))*step(.45,fract(vAng*uR*1.4)); `} gl_FragColor=vec4(uC*a*uOp,1.); }`});

/* ---------- kinetic type ---------- */
/* .pw: split into glyphs; each lights up in a scattered order, like an LED panel powering on */
function prepPW(el){
  if(!el||el.dataset.sp) return; el.dataset.sp=1; const txt=el.textContent.trim(); el.setAttribute('aria-label',txt); el.textContent='';
  const n=txt.replace(/ /g,'').length; const order=[...Array(n).keys()].sort(()=>Math.random()-.5); let i=0;
  txt.split(' ').forEach((w,wi,arr)=>{ const wd=document.createElement('span'); wd.className='wd'; wd.setAttribute('aria-hidden','true');
    for(const ch of w){ const c=document.createElement('span'); c.className='c'; c.style.setProperty('--d',(order[i++]/n*520+Math.random()*80|0)+'ms');
      const lo=document.createElement('span'); lo.className='lo'; lo.textContent=ch; const hi=document.createElement('span'); hi.className='hi'; hi.textContent=ch;
      c.appendChild(lo); c.appendChild(hi); wd.appendChild(c); }
    el.appendChild(wd); if(wi<arr.length-1) el.appendChild(document.createTextNode(' ')); });
}
$$('.pw').forEach(prepPW);
const GLY='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>#_';
function scramble(el,text,dur=600){
  if(!el) return; text=text??el.dataset.txt??el.textContent; el.dataset.txt=text; if(RM){el.textContent=text;return;}
  const t0=performance.now(); clearInterval(el._sc);
  el._sc=setInterval(()=>{ const k=(performance.now()-t0)/dur; let s='';
    for(let i=0;i<text.length;i++){ const ch=text[i]; s+=(ch===' '||i/text.length<k*1.4-.4)?ch:GLY[(Math.random()*GLY.length)|0]; }
    el.textContent=s; if(k>=1){ clearInterval(el._sc); el.textContent=text; } },40);
}
/* reveal: power on every .pw and fade-in inside el; unreveal reverses it */
function reveal(el){ if(!el) return; el.classList.remove('off'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); $$('.pw',el).forEach(p=>{ p.classList.remove('off'); p.classList.add('on'); }); if(el.classList.contains('pw')) el.classList.add('on'); $$('.idx span:first-child',el).forEach(s=>scramble(s)); }
function unreveal(el){ if(!el) return; el.classList.add('off'); el.classList.remove('on'); $$('.pw',el).forEach(p=>{ p.classList.add('off'); p.classList.remove('on'); }); }

/* ---------- hold-to-act controls ---------- */
function holdControl(btn,dur,onDone,opts={}){
  let down=false, p=0, kd=false; const key=opts.key;
  const start=e=>{ if(opts.enabled&&!opts.enabled()) return; down=true; btn.classList.add('down'); if(e&&e.preventDefault) e.preventDefault(); };
  const stop=()=>{ down=false; btn.classList.remove('down'); };
  btn.addEventListener('pointerdown',start); addEventListener('pointerup',stop); addEventListener('pointercancel',stop);
  if(key){ addEventListener('keydown',e=>{ if(e.code===key&&!e.repeat&&(!opts.enabled||opts.enabled())&&!(e.target.closest&&e.target.closest('input'))){ kd=true; start(e); } }); addEventListener('keyup',e=>{ if(e.code===key&&kd){ kd=false; stop(); } }); }
  return { tick(dt){ p=down?Math.min(1,p+dt/dur):Math.max(0,p-dt*3); btn.style.setProperty('--p',p); if(opts.onProgress) opts.onProgress(p); if(p>=1){ p=0; stop(); btn.style.setProperty('--p',0); onDone(); } }, reset(){ p=0; stop(); btn.style.setProperty('--p',0); }, get p(){return p} };
}

/* ---------- cursor + ui sounds ---------- */
const mouse={x:innerWidth/2,y:innerHeight/2,nx:0,ny:0,on:false};
const curEl=$('#cur'), curD=$('#curd'), curT=$('#curT'); let crx=mouse.x, cry=mouse.y;
if(FINE) document.documentElement.classList.add('cur');
addEventListener('pointermove',e=>{ mouse.x=e.clientX; mouse.y=e.clientY; mouse.nx=e.clientX/innerWidth*2-1; mouse.ny=-(e.clientY/innerHeight*2-1); mouse.on=e.pointerType==='mouse'; G.uMouse.value.set(mouse.nx,mouse.ny); },{passive:true});
document.addEventListener('mouseleave',()=>{ mouse.on=false; G.uMouse.value.set(9,9); });
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,[data-cur],canvas#radar'); if(!t||t.matches('input')) return; curT.textContent=t.dataset.cur||(t.id==='radar'?'Fly':'Open'); curEl.classList.add('big'); if(!t._tk){ A.tick(); t._tk=1; setTimeout(()=>t._tk=0,120);} });
document.addEventListener('pointerout',e=>{ const t=e.target.closest&&e.target.closest('a,button,[data-cur],canvas#radar'); if(t&&!t.contains(e.relatedTarget)) curEl.classList.remove('big'); });
document.addEventListener('click',e=>{ const b=e.target.closest('button,a'); if(!b) return; A.click();
  /* a mouse click must not leave focus behind: otherwise Space or Enter, used as game keys, would press this button again */
  if(e.detail>0) setTimeout(()=>b.blur(),0); },true);
/* game keys never activate whatever button happens to have focus */
addEventListener('keydown',e=>{ if((e.code==='Space'||e.code==='Enter')&&document.activeElement&&document.activeElement.matches&&document.activeElement.matches('button')&&document.activeElement.dataset.key!=='ok'&&(S.mode==='station'||S.mode==='hub')){ document.activeElement.blur(); } },true);
function cursorTick(){ if(!FINE) return; crx=lerp(crx,mouse.x,.22); cry=lerp(cry,mouse.y,.22); curEl.style.transform=`translate(${crx}px,${cry}px)`; curD.style.transform=`translate(${mouse.x}px,${mouse.y}px)`; }
function cursorAim(on){ curEl.classList.toggle('aim',!!on); }
function cine(on){ document.body.classList.toggle('cine',on); }
let toastT=0; function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.remove('off'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.add('off'),2800); }
function where(t){ scramble($('#where'),t,500); }

/* ================= RAY-TRACED BLACK HOLE =================
   Null geodesics in Schwarzschild spacetime, units of the Schwarzschild radius (rs = 1).
   A thin Novikov-Thorne disk, Doppler beaming and gravitational redshift, and a lensed sky.
   Rendered at reduced resolution into its own target, then used as the backdrop of the 3D scene. */
const GLSL_BB=`
vec3 blackbody(float t){ t=clamp(t,1000.,40000.)/100.;
  float r=t<=66.?1.:clamp(1.29293618606*pow(t-60.,-.1332047592),0.,1.);
  float g=t<=66.?clamp(.39008157876*log(t)-.63184144378,0.,1.):clamp(1.12989086089*pow(t-60.,-.0755148492),0.,1.);
  float b=t>=66.?1.:(t<=19.?0.:clamp(.54320678911*log(t-10.)-1.19625408914,0.,1.));
  return vec3(r,g,b); }`;
function blackbodyJS(k){ const t=clamp(k,1000,40000)/100; const c=v=>clamp(v,0,1);
  const r=t<=66?1:c(1.29293618606*Math.pow(t-60,-.1332047592));
  const g=t<=66?c(.39008157876*Math.log(t)-.63184144378):c(1.12989086089*Math.pow(t-60,-.0755148492));
  const b=t>=66?1:(t<=19?0:c(.54320678911*Math.log(t-10)-1.19625408914));
  return new T.Color(r,g,b); }
const BH={RS:.55, scale:Q<1?.5:.9, cap:Q<1?.7:1, steps:Q<1?120:180};   // trace resolution: scale x device pixels, never above cap x CSS pixels
if(window.__TEST) { BH.scale=.22; BH.steps=90; }
BH.rt=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false});
BH.u={uCam:{value:new T.Vector3(0,2,30)},uEsc:{value:60},uBasis:{value:new T.Matrix3()},uTan:{value:.4},uAsp:{value:1},uTime:G.uTime,
  uRin:{value:3.},uRout:{value:12.},uTmax:{value:5600},uBeam:{value:.9},uDisk:{value:1},uSky:{value:1},uExpo:{value:1},uHold:{value:0},uStar:{value:0},uSpin:{value:1}};
BH.mat=new T.ShaderMaterial({uniforms:BH.u,depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`precision highp float;
  uniform vec3 uCam; uniform mat3 uBasis; uniform float uEsc,uTan,uAsp,uTime,uRin,uRout,uTmax,uBeam,uDisk,uSky,uExpo,uHold,uStar,uSpin; varying vec2 vUv;
  ${GLSL_BB}
  float h1(float n){return fract(sin(n)*43758.5453);}
  float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p*=2.07;a*=.5;}return s;}
  vec3 sky(vec3 d){
    vec3 c=vec3(0.);
    // stars: hashed cells on the direction sphere
    for(int k=0;k<2;k++){ float sc=k==0?90.:220.; vec3 q=d*sc; vec3 id=floor(q); vec3 f=fract(q)-.5;
      float h=h3(id+float(k)*13.); if(h>.965-float(k)*.012){ vec3 o=vec3(h3(id+1.7),h3(id+3.1),h3(id+5.3))-.5; float dd=length(f-o*.7);
        float t=mix(3200.,14000.,pow(h3(id+9.),2.)); c+=blackbody(t)*smoothstep(.12,0.,dd)*(k==0?1.6:.7)*(.6+.4*sin(uTime*(1.+h*4.)+h*40.)); } }
    float band=exp(-pow(dot(d,normalize(vec3(.32,1.,.18))),2.)*7.);
    float n=fbm(d*2.4+3.); float m=fbm(d*5.5-7.);
    c+=vec3(.05,.045,.06)*n*n*1.4+vec3(.16,.12,.1)*band*pow(m,2.6)*.9+vec3(.04,.07,.11)*pow(fbm(d*1.6+11.),3.)*.8;
    return c*uSky; }
  void main(){
    vec2 uv=(vUv*2.-1.)*vec2(uAsp,1.)*uTan;
    vec3 rd=normalize(uBasis*vec3(uv,-1.));
    vec3 p=uCam, v=rd; vec3 hv=cross(p,v); float h2=dot(hv,hv);
    vec3 col=vec3(0.); float a=0.;
    float rin=uRin, rout=uRout;
    for(int i=0;i<${BH.steps};i++){
      float r=length(p);
      float dt=clamp(.07*r*r/(r+2.),.012,max(3.,r*.08));
      vec3 pp=p;
      vec3 acc=-1.5*h2*p/pow(r,5.);
      v+=acc*dt; p+=v*dt;
      // thin disk crossing
      if(uDisk>0. && pp.y*p.y<0.){
        vec3 hit=mix(pp,p,pp.y/(pp.y-p.y)); float rr=length(hit.xz);
        if(rr>rin && rr<rout){
          float x=rin/rr; float prof=pow(x,.75)*pow(max(1.-sqrt(x),0.),.25)*2.05; float T0=uTmax*pow(prof,1.35);
          vec3 vd=normalize(vec3(-hit.z,0.,hit.x)); float beta=min(sqrt(.5/max(rr-1.,.2)),.62)*uSpin;
          vec3 n=-normalize(v); float gam=inversesqrt(1.-beta*beta);
          float D=1./(gam*(1.-beta*dot(vd,n))); float g=D*sqrt(1.-1./rr);
          float gb=mix(1.,g,uBeam);
          float ph=atan(hit.z,hit.x); float om=uTime*.9/pow(rr,1.5)*uSpin;
          vec3 q=vec3(rr*1.5,cos(ph-om)*2.,sin(ph-om)*2.);
          float tex=fbm(q)*.7+.55*fbm(vec3(rr*9.,cos(ph-om*1.2)*9.,sin(ph-om*1.2)*9.));
          float rings=.72+.28*sin(rr*11.+fbm(q*.7)*6.)*sin(rr*3.1+1.);
          float edge=smoothstep(rin,rin*1.08,rr)*smoothstep(rout,rout*.5,rr);
          float dens=clamp((tex*rings-.12)*edge*1.5,0.,1.);
          vec3 e=blackbody(T0*gb)*pow(gb,3.4)*prof*prof*2.1*dens;
          float al=clamp(dens*1.1,0.,1.);
          col+=(1.-a)*e*al; a+=(1.-a)*al;
          if(a>.995) break;
        }
      }
      if(r<1.){ a=1.; break; }
      if(r>uEsc&&dot(p,v)>0.) break;   // heading out past the disk and the camera: the rest of the bend is negligible
    }
    vec3 d=normalize(v);
    col+=(1.-a)*sky(d);
    // collapse glow: a star before it falls in (used by the entrance)
    col+=uStar*vec3(1.,.86,.7)*.0;
    gl_FragColor=vec4(col*uExpo,1.);
  }`});
BH.quad=new T.Mesh(new T.PlaneGeometry(2,2),BH.mat); BH.quad.frustumCulled=false; BH.scene=new T.Scene(); BH.scene.add(BH.quad);
BH.resize=function(){ const k=Math.min(DPR*BH.scale,BH.cap); BH.rt.setSize(Math.max(2,Math.floor(innerWidth*k)),Math.max(2,Math.floor(innerHeight*k))); };
BH.render=function(cam){
  cam.updateMatrixWorld(); const e=cam.matrixWorld.elements;
  BH.u.uBasis.value.set(e[0],e[4],e[8], e[1],e[5],e[9], e[2],e[6],e[10]);
  BH.u.uCam.value.copy(cam.position).multiplyScalar(1/BH.RS); BH.u.uEsc.value=Math.max(26,BH.u.uCam.value.length()*1.08);
  BH.u.uTan.value=Math.tan(cam.fov*Math.PI/360); BH.u.uAsp.value=cam.aspect;
  renderer.setRenderTarget(BH.rt); renderer.render(BH.scene,ortho);
};
/* backdrop quad that samples the traced image, drawn first in the hub scene */
BH.backMat=new T.ShaderMaterial({uniforms:{tBH:{value:BH.rt.texture}},depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,.9999,1.); }`,
  fragmentShader:`uniform sampler2D tBH; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tBH,vUv).rgb,1.); }`});
BH.back=new T.Mesh(new T.PlaneGeometry(2,2),BH.backMat); BH.back.frustumCulled=false; BH.back.renderOrder=-10;
/* depth-only occluder so raster objects behind the shadow disappear */
BH.occ=new T.Mesh(new T.SphereGeometry(2.55*BH.RS,32,20),new T.MeshBasicMaterial({colorWrite:false}));
BH.occ.renderOrder=-5;

/* ================= UNIVERSE (hub scene) ================= */
const U={scene:new T.Scene()};
const GM=60, RB=31;
U.scene.add(BH.back); U.scene.add(BH.occ);

/* spacetime grid: a polar mesh outside the disk, dented by every mass */
{
  const v=[];
  for(let r=7.5;r<=31;r+=1.25){ const N=Math.max(80,Math.floor(r*9)); for(let k=0;k<N;k++){ const a0=k/N*TAU,a1=(k+1)/N*TAU; v.push(Math.cos(a0)*r,0,Math.sin(a0)*r,Math.cos(a1)*r,0,Math.sin(a1)*r); } }
  for(let s=0;s<56;s++){ const a=s/56*TAU; for(let k=0;k<60;k++){ const r0=7.5+k*.4, r1=7.5+(k+1)*.4; v.push(Math.cos(a)*r0,0,Math.sin(a)*r0,Math.cos(a)*r1,0,Math.sin(a)*r1); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  U.gridU={uTime:G.uTime,uProbe:{value:new T.Vector3(99,0,99)},uSt:{value:[...Array(7)].map(()=>new T.Vector3(99,0,99))},uOp:{value:0},uC:{value:new T.Color('#B9A58E')}};
  U.grid=new T.LineSegments(g,new T.ShaderMaterial({uniforms:U.gridU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform vec3 uProbe; uniform vec3 uSt[7]; uniform float uTime,uOp; varying float vA;
    void main(){ vec3 p=position; float r=length(p.xz); float y=-1.4-14./(r+1.5);
      float d=length(p.xz-uProbe.xz); y-=.9*exp(-d*d*.5);
      for(int i=0;i<7;i++){ float ds=length(p.xz-uSt[i].xz); y-=.8*exp(-ds*ds*.3); }
      p.y=y; float wv=pow(.5+.5*sin(r*.7-uTime*1.1),12.);
      vA=uOp*((.05+.16*wv)*smoothstep(31.,20.,r)*smoothstep(7.5,10.5,r)+.28*exp(-d*d*.1));
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader:`uniform vec3 uC; varying float vA; void main(){ gl_FragColor=vec4(uC*vA,1.); }`}));
  U.grid.frustumCulled=false; U.scene.add(U.grid);
}

/* stations, coloured by temperature on the same blackbody scale as the disk */
const STA=[
  {id:'kr',name:'Kríos',game:'Dead Air',R:9.5,ph:.4,K:24000,color:'#A5C3FF'},
  {id:'bs',name:'Bowshock',game:'Shock Line',R:12.5,ph:2.2,K:11000,color:'#C4D6FF'},
  {id:'ae',name:'Aetos',game:'Hold the Sky',R:15.5,ph:4.3,K:6600,color:'#F2EEE6'},
  {id:'ph',name:'Pharos',game:'Lost Signal',R:18.5,ph:1.1,K:4300,color:'#FFD5B3'},
  {id:'og',name:'Ogive',game:'Apogee',R:21.5,ph:3.3,K:3100,color:'#FFB475'},
  {id:'cr',name:'Crew',game:'Three builders',R:24.5,ph:5.4,K:2400,color:'#FF9B3D'},
  {id:'be',name:'Beacon',game:'Join · contact',R:27.5,ph:.2,K:1850,color:'#FF8100'}
];
STA.forEach((s,si)=>{
  s.idx=si; s.w=Math.sqrt(GM/(s.R**3))*.28; s.pos=new T.Vector3(); s.vel=new T.Vector3(); s.a=s.ph; s.c=new T.Color(s.color);
  const g=new T.Group(); s.grp=g; g.visible=false; U.scene.add(g); s.anim=[];
  const C=s.color, add=m=>{ g.add(m); return m; };
  if(s.id==='kr'){ // glass sphere with a speaking waveform inside
    add(new T.Mesh(new T.SphereGeometry(.62,40,24),LM(C,{emit:.02,rim:1.4,amb:.02,op:.55})));
    const w=add(pts(cloud(1400,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*.42;o[1]=0;o[2]=Math.sin(a)*.42;}),PM({size:.05,color:C,body:'float a=atan(p.z,p.x); float k=1.+.45*sin(a*9.+uTime*6.)*sin(uTime*2.3)*sin(a*2.+uTime); p.xz*=k; p.y=.18*sin(a*14.-uTime*5.)*sin(uTime*1.7); b=1.3;'})));
    w.rotation.x=.3;
  }
  if(s.id==='bs'){ // a finned rocket at Mach 3, wearing its own shock cone
    const rk=new T.Group(); add(rk);
    const prof=[new T.Vector2(0,0)]; const Ln=.62, R=.13; for(let k=1;k<=10;k++){ const u=k/10; prof.push(new T.Vector2(R*u,Ln*u)); } prof.push(new T.Vector2(R,1.7)); prof.push(new T.Vector2(R*.8,1.76)); prof.push(new T.Vector2(0,1.76));
    const body=new T.Mesh(new T.LatheGeometry(prof,28),LM(C,{emit:.05,rim:1.1})); body.rotation.z=Math.PI/2; body.position.x=.9; rk.add(body);
    const fs=new T.Shape(); fs.moveTo(0,0); fs.lineTo(.42,0); fs.lineTo(.2,.26); fs.lineTo(0,.26); fs.closePath();
    const fg=new T.ExtrudeGeometry(fs,{depth:.02,bevelEnabled:false}); fg.translate(0,R*.95,-.01);
    for(let k=0;k<4;k++){ const f=new T.Mesh(fg,LM(C,{emit:.04,rim:.9})); f.position.x=-.86; f.rotation.x=k*Math.PI/2; rk.add(f); }
    add(pts(cloud(2000,(i,r,o)=>{const u=r[0],a=r[1]*TAU;const rr=u*1.5*.55;o[0]=.9-u*1.5;o[1]=Math.cos(a)*rr;o[2]=Math.sin(a)*rr;}),PM({size:.04,color:C,body:'b=.42*(1.-aR.x)+.1;'})));
    add(pts(cloud(900,(i,r,o)=>{o[0]=0;o[1]=(r[1]-.5)*2.4;o[2]=(r[2]-.5)*2.4;}),PM({size:.035,color:'#FFFFFF',body:'float t=fract(aR.x+uTime*.7); p.x=2.-t*4.; float rr=length(p.yz); float sh=(.9-p.x)*.55; if(p.x<.9&&rr<sh) p.yz*=1.+.3*(1.-rr/max(sh,.01)); b=.3*sin(t*3.14);'})));
    add(pts(cloud(500,(i,r,o)=>{o[0]=-.95-r[0]*1.2;o[1]=gauss()*.03;o[2]=gauss()*.03;}),PM({size:.07,color:'#FFD9B0',body:'float t=fract(aR.y-uTime*1.4); p.x=-.92-t*1.3; p.yz*=1.+t*3.; b=(1.-t)*.9;'})));
    s.anim.push(t=>{ rk.rotation.x=t*.6; });
  }
  if(s.id==='ae'){ // radar dish on a mast, sweeping
    add(new T.Mesh(new T.CylinderGeometry(.05,.09,.9,10),LM('#9a948a',{rim:.6}))).position.y=-.35;
    const dish=add(new T.Mesh(new T.SphereGeometry(.55,32,16,0,TAU,0,Math.PI*.32),LM(C,{emit:.03,rim:1,amb:.05}))); dish.material.side=T.DoubleSide; dish.position.y=.25; s.anim.push(t=>{ dish.rotation.set(-.7,t*.9,0); });
    add(pts(cloud(1600,(i,r,o)=>{const a=r[0]*TAU,rr=(Math.floor(r[1]*4)+1)/4*1.6;o[0]=Math.cos(a)*rr;o[1]=-.8;o[2]=Math.sin(a)*rr;}),PM({size:.045,color:C,body:'float a=atan(p.z,p.x); float d=mod(uTime*2.6-a,6.2832); b=.15+1.3*exp(-d*2.5);'})));
  }
  if(s.id==='ph'){ // lighthouse: pharos, the first one
    const tw=add(new T.Mesh(new T.CylinderGeometry(.16,.3,1.5,20,6),LM('#d9cfc2',{rim:.7}))); tw.position.y=-.2;
    for(let k=0;k<3;k++){ const band=add(new T.Mesh(new T.CylinderGeometry(.3-.045*(k*.5+.25)*1.0,.3-.045*(k*.5+.25),.12,20),LM('#5b2a1e',{rim:.4}))); band.position.y=-.75+k*.45; band.scale.setScalar(1.02-k*.1); }
    const lamp=add(new T.Mesh(new T.SphereGeometry(.17,20,14),LM(C,{emit:1.8,rim:.6}))); lamp.position.y=.66;
    const beam=add(pts(cloud(2600,(i,r,o)=>{const u=Math.pow(r[0],.7);const sp=u*.55;o[0]=u*5.5;o[1]=(r[1]-.5)*sp*.6;o[2]=(r[2]-.5)*sp;if(i%2){o[0]*=-1;}}),PM({size:.07,color:C,body:'b=.55*(1.-abs(p.x)/5.5);'})));
    beam.position.y=.66; s.anim.push(t=>{ beam.rotation.y=t*1.1; });
  }
  if(s.id==='og'){ // the rocket itself, standing on its exhaust
    const prof=[new T.Vector2(0,1.25)]; for(let k=1;k<=18;k++){ const u=k/18, L=.75, R=.16, rho=(R*R+L*L)/(2*R); const x=u*L; prof.push(new T.Vector2(Math.sqrt(Math.max(rho*rho-Math.pow(L-x,2),0))+R-rho,1.25-x)); }
    prof.push(new T.Vector2(.16,-.55)); prof.push(new T.Vector2(.11,-.62)); prof.push(new T.Vector2(0,-.62));
    add(new T.Mesh(new T.LatheGeometry(prof.reverse(),28),LM(C,{emit:.03,rim:1})));
    for(let k=0;k<4;k++){ const f=add(new T.Mesh(new T.BoxGeometry(.32,.38,.02),LM(C,{rim:.8}))); const a=k*Math.PI/2; f.position.set(Math.cos(a)*.3,-.42,Math.sin(a)*.3); f.rotation.y=-a; }
    add(pts(cloud(700,(i,r,o)=>{o[0]=gauss()*.04;o[1]=-.7-r[0]*1.6;o[2]=gauss()*.04;}),PM({size:.08,color:'#FFD39A',body:'float t=fract(aR.x-uTime*1.2); p.y=-.66-t*1.4; p.xz*=1.+t*4.; b=(1.-t)*1.1;'})));
  }
  if(s.id==='cr'){ // three bodies in a shared orbit
    s.orbs=[0,1,2].map(k=>add(new T.Mesh(new T.SphereGeometry(.26,28,18),LM(C,{emit:.12,rim:1.2}))));
    add(new T.LineLoop(ringGeo(.78,96),dashMat(C,'float a=.5*step(.5,fract(vAng*5.+uTime*.2));'))).material.uniforms.uOp.value=1;
  }
  if(s.id==='be'){ // a mast that keeps calling out
    add(new T.Mesh(new T.CylinderGeometry(.03,.12,2,10),LM('#b9ad9e',{rim:.6}))).position.y=0;
    const tip=add(new T.Mesh(new T.SphereGeometry(.09,16,10),LM(C,{emit:2.2}))); tip.position.y=1.05;
    add(pts(cloud(1800,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=1.05;o[2]=Math.sin(a);}),PM({size:.05,color:C,body:'float t=fract(aR.y*.999+uTime*.35+floor(aR.y*3.)/3.); p.xz*=t*2.4; b=(1.-t)*.9;'})));
  }
  // soft halo, dock zone and tether to the grid
  g.add(pts(cloud(300,(i,r,o)=>{const v=[gauss(),gauss(),gauss()],l=Math.hypot(...v)||1,R=1.9+r[0]*.6;o[0]=v[0]/l*R;o[1]=v[1]/l*R;o[2]=v[2]/l*R;}),PM({size:.05,color:C,body:'b=.08;'})));
  s.orbit=new T.LineLoop(ringGeo(s.R,480),dashMat(C)); s.orbit.material.uniforms.uR.value=s.R; U.scene.add(s.orbit);
  s.zone=new T.LineLoop(ringGeo(2.4,120),dashMat(C,`float a=(.14+.86*uNear)*step(.5,fract(vAng*6.+uTime*(.3+uNear)));`)); g.add(s.zone);
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(new Float32Array([0,-.95,0,0,-3.2,0]),3)); tg.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  s.tether=new T.Line(tg,dashMat(C,'float a=.3*(1.-vAng)*step(.5,fract(vAng*14.-uTime*1.5));')); g.add(s.tether);
});

/* asteroid belt between Bowshock and Aetos, lit only by the disk */
{
  const N=Math.floor(380*Q+120);
  U.belt=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),LM('#8c8070',{rim:.25,amb:.03,key:'#FFC392'}),N);
  const M=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), sc=new T.Vector3(), p=new T.Vector3();
  for(let i=0;i<N;i++){ const a=Math.random()*TAU, r=14+gauss()*.38; p.set(Math.cos(a)*r,gauss()*.12,Math.sin(a)*r); e.set(Math.random()*6,Math.random()*6,Math.random()*6); q.setFromEuler(e);
    const s=.025+Math.pow(Math.random(),3)*.09; sc.set(s,s*(.6+Math.random()*.6),s*(.7+Math.random()*.5)); M.compose(p,q,sc); U.belt.setMatrixAt(i,M); }
  U.belt.frustumCulled=false; U.belt.visible=false; U.scene.add(U.belt);
}
/* boundary curtain */
U.fenceU={uPA:{value:0},uNear:{value:0}};
U.fence=pts(cloud(Math.floor(3000*Q+800),(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*RB;o[1]=gauss()*.5;o[2]=Math.sin(a)*RB;}),PM({size:.06,color:'#FFC392',uniforms:U.fenceU,decl:'uniform float uPA,uNear;',
  body:`float a=atan(p.z,p.x); float da=abs(mod(a-uPA+3.1416,6.2832)-3.1416); float hx=step(.82,fract((a*24.)+floor(p.y*3.)*.5)); b=uOp*(.04+.03*sin(uTime+a*9.)+uNear*(.6+.9*hx)*exp(-da*da*18.));`}));
U.fence.material.uniforms.uOp.value=0; U.scene.add(U.fence);

/* probe */
U.probe=new T.Group();
{ const hull=new T.Mesh(new T.ConeGeometry(.11,.42,16),LM('#EEE9DF',{emit:.1,rim:1.2})); hull.rotation.x=-Math.PI/2; U.probe.add(hull);
  const fin=new T.Mesh(new T.BoxGeometry(.34,.014,.1),LM('#FFC392',{emit:.3})); fin.position.z=.13; U.probe.add(fin);
  U.engU={uThr:{value:0}};
  U.probe.add(pts(cloud(40,(i,r,o)=>{o[0]=gauss()*.02;o[1]=gauss()*.02;o[2]=.23+r[0]*.05;}),PM({size:.12,color:'#FFD8B0',uniforms:U.engU,decl:'uniform float uThr;',body:'b=.4+uThr*1.6; sz=1.+uThr;'}))); }
U.probe.visible=false; U.scene.add(U.probe);
U.exhaust=Burst(U.scene,Math.floor(500*Q+120),'#FFC392',.08);
const TRL=170; U.trailPos=new Float32Array(TRL*3); U.trailCol=new Float32Array(TRL*3);
U.trailG=new T.BufferGeometry(); U.trailG.setAttribute('position',new T.BufferAttribute(U.trailPos,3)); U.trailG.setAttribute('color',new T.BufferAttribute(U.trailCol,3));
U.trail=new T.Line(U.trailG,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false})); U.trail.frustumCulled=false; U.trail.visible=false; U.scene.add(U.trail);
U.dustU={uC:{value:new T.Vector3()}};
U.dust=pts(cloud(Math.floor(1600*Q),(i,r,o)=>{o[0]=(r[0]-.5)*44;o[1]=(r[1]-.5)*16;o[2]=(r[2]-.5)*44;}),PM({size:.05,color:'#CFC3B1',uniforms:U.dustU,decl:'uniform vec3 uC;',body:`p=uC+mod(position-uC+vec3(22.,8.,22.),vec3(44.,16.,44.))-vec3(22.,8.,22.); b=.22;`}));
U.dust.visible=false; U.scene.add(U.dust);
{ const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3)); g.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  U.apLine=new T.Line(g,dashMat('#EEE9DF','float a=.5*step(.5,fract(vAng*uR-uTime*2.));')); U.apLine.frustumCulled=false; U.apLine.visible=false; U.scene.add(U.apLine); }
const MAXP=24; U.peerPos=new Float32Array(MAXP*3).fill(9999);
U.peerG=new T.BufferGeometry(); U.peerG.setAttribute('position',new T.BufferAttribute(U.peerPos,3)); U.peerG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXP*4).fill(.7),4)); U.peerG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
U.peers=pts(U.peerG,PM({size:.2,color:'#FFC392',body:'b=1.1+.5*sin(uTime*4.);'})); U.scene.add(U.peers);
U.sigU={uCount:{value:0},uBe:{value:new T.Vector3()}};
U.sig=pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.12,color:'#FFFFFF',uniforms:U.sigU,decl:'uniform float uCount; uniform vec3 uBe;',body:`
  float i=position.x; b=step(i,uCount-.5)*.9; float a=uTime*(.2+aR.x*.3)+aR.y*6.28; float rr=2.4+aR.z*1.2; p=uBe+vec3(cos(a)*rr,(aR.w-.5)*1.4,sin(a)*rr);`}));
U.scene.add(U.sig);

function updateStations(t){
  STA.forEach(s=>{ s.a=s.ph+t*s.w; s.pos.set(Math.cos(s.a)*s.R,Math.sin(t*.3+s.ph)*.25,Math.sin(s.a)*s.R); s.vel.set(-Math.sin(s.a)*s.R*s.w,0,Math.cos(s.a)*s.R*s.w);
    s.grp.position.copy(s.pos); s.orbit.material.uniforms.uAng.value=s.a; U.gridU.uSt.value[s.idx].copy(s.pos);
    s.anim.forEach(f=>f(t));
    if(s.orbs) s.orbs.forEach((m,k)=>{const a=t*.8+k*TAU/3; m.position.set(Math.cos(a)*.78,Math.sin(t*1.2+k)*.15,Math.sin(a)*.78);}); });
  U.sigU.uBe.value.copy(STA[6].pos);
}
function universeVisible(k){
  STA.forEach(s=>{ s.grp.visible=k>.01; s.orbit.material.uniforms.uOp.value=k; s.zone.material.uniforms.uOp.value=k; s.tether.material.uniforms.uOp.value=k; });
  U.gridU.uOp.value=k; U.fence.material.uniforms.uOp.value=k; U.belt.visible=k>.05;
}

/* ================= HUB: FLIGHT, MAP, DOCKING ================= */
const S={mode:'load',ch:0,chT:0,t:0,tau:0,hold:0,form:0,formT:null,flash:0,intro:0,introT:0,yaw:.5,zoom:1,iris:0,arrive:0,shake:0,ca:0,rdt:0,games:0,
  probe:{p:new T.Vector3(10,0,0),v:new T.Vector3(),thr:0,head:0}, ap:null, docked:new Set(), near:null, st:null, stId:null, firstThrust:false, hubT:0, edgeT:0};
const keys=new Set();
const tv=[...Array(10)].map(()=>new T.Vector3());
const _m=new T.Matrix4(), UPV=new T.Vector3(0,1,0);
function lookQ(pos,target,out){ _m.lookAt(pos,target,UPV); return out.setFromRotationMatrix(_m); }
const mkPose=()=>({p:new T.Vector3(),q:new T.Quaternion(),fov:36});
const chase=mkPose(), fromP=mkPose(), closeP=mkPose();
const hubBase={p:new T.Vector3(0,1.2,70),q:new T.Quaternion()};

function chasePose(out){
  const P=S.probe, D=12.5*S.zoom, H=5.4*S.zoom;
  out.p.set(P.p.x+Math.sin(S.yaw)*D,H,P.p.z+Math.cos(S.yaw)*D);
  tv[0].copy(P.p).addScaledVector(P.v,.25); tv[0].y=-.9; lookQ(out.p,tv[0],out.q); out.fov=36; return out;
}

/* ---------- input ---------- */
addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input')) return;
  keys.add(e.code);
  if(e.code==='KeyE'&&S.mode==='hub'&&S.near) dock(S.near);
  if(e.code==='Escape'&&S.mode==='station') undock();
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&S.mode==='hub'){ S.ap=null; e.preventDefault(); }
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
let drag=null;
canvas.addEventListener('pointerdown',e=>{
  if(S.mode==='station'&&S.st&&S.st.onPointer) return S.st.onPointer(e);
  if(S.mode!=='hub') return;
  drag={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,touch:e.pointerType!=='mouse',id:e.pointerId};
  if(drag.touch){ const s=$('#stick'); s.hidden=false; s.style.left=e.clientX+'px'; s.style.top=e.clientY+'px'; S.ap=null; }
});
addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id) return;
  if(!drag.touch){ S.yaw-=(e.clientX-drag.x)*.005; drag.x=e.clientX; }
  else { drag.x=e.clientX; drag.y=e.clientY; const dx=clamp(drag.x-drag.ox,-50,50),dy=clamp(drag.y-drag.oy,-50,50); $('#stick i').style.transform=`translate(${dx}px,${dy}px)`; }
});
const endDrag=e=>{ if(drag&&(!e||e.pointerId===drag.id)){ drag=null; $('#stick').hidden=true; $('#stick i').style.transform=''; } };
addEventListener('pointerup',endDrag); addEventListener('pointercancel',endDrag);
addEventListener('wheel',e=>{ if(S.mode==='hub'){ S.zoom=clamp(S.zoom*Math.exp(e.deltaY*.0008),.72,1.35); e.preventDefault(); } },{passive:false});

function autopilot(s){ if(S.mode!=='hub') return; if(S.near===s) return dock(s); S.ap=s; toast('Autopilot · '+s.name); A.blip(); }
$('#dockp').addEventListener('click',()=>S.near&&dock(S.near));

/* ---------- physics ---------- */
function hubPhysics(dt){
  const P=S.probe;
  const fwd=tv[1].set(-Math.sin(S.yaw),0,-Math.cos(S.yaw)), rgt=tv[2].set(Math.cos(S.yaw),0,-Math.sin(S.yaw));
  let ix=0,iz=0;
  if(keys.has('KeyW')||keys.has('ArrowUp')) iz+=1; if(keys.has('KeyS')||keys.has('ArrowDown')) iz-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight')) ix+=1; if(keys.has('KeyA')||keys.has('ArrowLeft')) ix-=1;
  if(drag&&drag.touch){ ix=clamp((drag.x-drag.ox)/50,-1,1); iz=clamp(-(drag.y-drag.oy)/50,-1,1); }
  const thrust=tv[3].copy(fwd).multiplyScalar(iz).addScaledVector(rgt,ix);
  if(thrust.lengthSq()>.01&&!S.firstThrust){ S.firstThrust=true; $('#hint').classList.add('gone'); }
  const r=Math.max(.5,Math.hypot(P.p.x,P.p.z));
  if(S.ap){ const s=S.ap; const to=tv[4].copy(s.pos).sub(P.p); to.y=0; const dist=to.length();
    const dl=tv[5].copy(to).normalize(); const along=clamp(-P.p.dot(dl),0,dist); const cl=tv[6].copy(P.p).addScaledVector(dl,along); cl.y=0;
    let aim=to, aimLen=dist;
    if(cl.length()<8.5&&dist>4){ const side=cl.length()>.1?cl.normalize():tv[6].set(-P.p.z,0,P.p.x).normalize(); aim=side.multiplyScalar(Math.max(9.5,Math.min(r,s.R))).sub(P.p); aim.y=0; aimLen=aim.length()+6; }
    const want=tv[7].copy(aim).normalize().multiplyScalar(Math.min(11,aimLen*1.1)).add(s.vel);
    thrust.copy(want.sub(P.v)).multiplyScalar(.6); if(thrust.length()>1.5) thrust.setLength(1.5);
    if(dist<2.2){ S.ap=null; dock(s); return; }
    U.apLine.visible=true; const ap=U.apLine.geometry.attributes.position.array; ap[0]=P.p.x;ap[1]=0;ap[2]=P.p.z;ap[3]=s.pos.x;ap[4]=s.pos.y;ap[5]=s.pos.z; U.apLine.geometry.attributes.position.needsUpdate=true; U.apLine.material.uniforms.uR.value=dist*1.2; U.apLine.material.uniforms.uOp.value=1;
  } else U.apLine.visible=false;
  const tl=Math.min(1.5,thrust.length()); P.thr=damp(P.thr,tl,10,dt);
  const acc=tv[8].set(-P.p.x,0,-P.p.z).multiplyScalar(GM/(r*r*r)).addScaledVector(thrust,9);
  if(tl<.05&&r>3.5){ const vc=Math.sqrt(GM/r); const tang=tv[9].set(-P.p.z/r,0,P.p.x/r); const sg=Math.sign(tang.dot(P.v))||1; tang.multiplyScalar(vc*sg).sub(P.v); acc.addScaledVector(tang,.4); }
  if(r>RB-2.5){ acc.addScaledVector(tv[4].set(-P.p.x/r,0,-P.p.z/r),(r-(RB-2.5))*9); if(S.t>S.edgeT){ S.edgeT=S.t+6; toast('Edge of the Heloria system'); A.beep(440); } }
  if(S.ap&&r<7) acc.addScaledVector(tv[4].set(P.p.x/r,0,P.p.z/r),30);
  P.v.addScaledVector(acc,dt); if(P.v.length()>12) P.v.setLength(12);
  P.p.addScaledVector(P.v,dt); P.p.y=0;
  if(S.ap){ const rr=Math.hypot(P.p.x,P.p.z); if(rr<4){ P.p.multiplyScalar(4/rr); const vr=(P.v.x*P.p.x+P.v.z*P.p.z)/4; if(vr<0){ P.v.x-=vr*P.p.x/4; P.v.z-=vr*P.p.z/4; } } } // autopilot never falls in
  if(r<1.35){ crossHorizon(); return; }
  if(P.v.lengthSq()>.04) P.head=P.head+angDiff(Math.atan2(-P.v.x,-P.v.z),P.head)*Math.min(1,dt*6);
  U.probe.position.copy(P.p); U.probe.rotation.set(0,P.head,0); U.engU.uThr.value=P.thr; A.thrust(P.thr);
  if(P.thr>.1){ tv[4].set(Math.sin(P.head),0,Math.cos(P.head)).multiplyScalar(.3).add(P.p); for(let k=0;k<Math.ceil(P.thr*4*Q);k++) U.exhaust.emit(tv[4],1,.5,null,0,.6); }
  U.trailPos.copyWithin(3,0,(TRL-1)*3); U.trailPos[0]=P.p.x;U.trailPos[1]=0;U.trailPos[2]=P.p.z;
  for(let i=0;i<TRL;i++){const f=Math.pow(1-i/TRL,2)*.8; U.trailCol[i*3]=f*.85;U.trailCol[i*3+1]=f*.78;U.trailCol[i*3+2]=f;}
  U.trailG.attributes.position.needsUpdate=true; U.trailG.attributes.color.needsUpdate=true;
  U.dustU.uC.value.copy(P.p); U.gridU.uProbe.value.copy(P.p);
  U.fenceU.uPA.value=Math.atan2(P.p.z,P.p.x); U.fenceU.uNear.value=sstep(RB-6,RB-1,r);
  // proximity
  let near=null, nd=1e9; STA.forEach(s=>{ const d=s.pos.distanceTo(P.p); if(d<nd){nd=d;near=s;} s.zone.material.uniforms.uNear.value=damp(s.zone.material.uniforms.uNear.value,d<2.6?1:0,6,dt); });
  S.near=nd<2.6?near:null;
  const dp=$('#dockp'); dp.hidden=!S.near||FINE; if(S.near){ dp.textContent='Dock at '+S.near.name; dp.style.setProperty('--acc',S.near.color); }
  // telemetry + warnings
  const g=1/Math.sqrt(Math.max(1e-4,1-BH.RS/r)); S.tau+=dt/g;
  $('#tR').textContent=(r/BH.RS).toFixed(1); $('#tV').textContent=(P.v.length()/12).toFixed(2); $('#tG').textContent='×'+g.toFixed(3); $('#tT').textContent=fmtT(S.tau);
  const rs=r/BH.RS, danger=r<6.2; $('#warn').classList.toggle('on',danger); if(danger){ $('#warnR').textContent='r = '+rs.toFixed(2)+' rs'; post.uniforms.uTint.value.r=Math.max(post.uniforms.uTint.value.r,(6.2-r)*.012); }
  A.wind(P.v.length()/34+Math.max(0,(7-r))*.05); A.update(S.t,{sub:sstep(12,2,r),pad:1,bright:.4});
}

/* ---------- labels, edge markers, radar ---------- */
STA.forEach(s=>{
  const el=document.createElement('button'); el.type='button'; el.className='slab'; el.style.setProperty('--acc',s.color); el.dataset.cur='Fly';
  el.innerHTML=`<span class="rt"></span><span class="tx"><b>${s.name}</b><span class="sub">${s.game} · ${s.K.toLocaleString('en-IE')} K</span><span class="dist"></span><span class="act">${FINE?'<kbd>E</kbd> Dock':'Tap to dock'}</span></span>`;
  el.addEventListener('click',()=>autopilot(s)); $('#labels').appendChild(el); s.el=el; s.distEl=$('.dist',el);
  const ed=document.createElement('button'); ed.type='button'; ed.className='edge'; ed.style.setProperty('--acc',s.color); ed.dataset.cur='Fly';
  ed.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><span>${s.name}</span>`;
  ed.addEventListener('click',()=>autopilot(s)); $('#edges').appendChild(ed); s.edge=ed;
});
function labelsUpdate(){
  const W=innerWidth,H=innerHeight;
  STA.forEach(s=>{
    const p=tv[1].copy(s.pos).project(hubCam), behind=p.z>1;
    const sx=(p.x*.5+.5)*W, sy=(-p.y*.5+.5)*H;
    const on=!behind&&sx>40&&sx<W-40&&sy>70&&sy<H-60;
    if(on){ tv[2].setFromMatrixColumn(hubCam.matrixWorld,0).multiplyScalar(1.7).add(s.pos).project(hubCam); const rad=Math.abs((tv[2].x-p.x)*.5*W);
      s.el.style.display=''; s.el.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; s.el.style.setProperty('--s',clamp(rad*2,32,150).toFixed(0)+'px');
      s.distEl.textContent=(s.pos.distanceTo(S.probe.p)/BH.RS).toFixed(1)+' rs'; s.el.classList.toggle('near',S.near===s); s.el.classList.toggle('flip',sx>W-200); s.el.classList.toggle('done',S.docked.has(s.id)); s.edge.style.display='none'; }
    else { s.el.style.display='none';
      let dx=sx-W/2, dy=sy-H/2; if(behind){dx=-dx;dy=-dy;} const a=Math.atan2(dy,dx), m=46;
      const k=Math.min((W/2-m)/Math.max(1e-6,Math.abs(Math.cos(a))),(H/2-m-40)/Math.max(1e-6,Math.abs(Math.sin(a))));
      s.edge.style.display=''; s.edge.style.transform=`translate(${(W/2+Math.cos(a)*k).toFixed(1)}px,${(H/2+Math.sin(a)*k).toFixed(1)}px) translate(-50%,-50%)`; $('svg',s.edge).style.transform=`rotate(${a}rad)`; }
  });
}
const rc=$('#radar'), rx=rc.getContext('2d');
function radarDraw(){
  const w=rc.width, cx=w/2, R=w/2-16, k=R/RB;
  rx.clearRect(0,0,w,w); rx.save(); rx.translate(cx,cx);
  // sweep
  const sa=S.t*1.4; const gr=rx.createConicGradient?rx.createConicGradient(sa,0,0):null;
  if(gr){ gr.addColorStop(0,'rgba(255,195,146,.16)'); gr.addColorStop(.08,'rgba(255,195,146,0)'); gr.addColorStop(1,'rgba(255,195,146,0)'); rx.fillStyle=gr; rx.beginPath(); rx.arc(0,0,R+8,0,TAU); rx.fill(); }
  rx.rotate(S.yaw);
  rx.lineWidth=1.5;
  STA.forEach(s=>{ rx.strokeStyle=s.color+'38'; rx.beginPath(); rx.arc(0,0,s.R*k,0,TAU); rx.stroke(); });
  rx.setLineDash([2,6]); rx.strokeStyle='rgba(238,233,223,.2)'; rx.beginPath(); rx.arc(0,0,14*k,0,TAU); rx.stroke(); rx.setLineDash([]);
  rx.strokeStyle='rgba(255,195,146,.5)'; rx.beginPath(); rx.arc(0,0,RB*k,0,TAU); rx.stroke(); rx.fillStyle='rgba(255,195,146,.18)'; rx.beginPath(); rx.arc(0,0,6.6*k,0,TAU); rx.arc(0,0,1.65*k,0,TAU,true); rx.fill();
  rx.fillStyle='#000'; rx.strokeStyle='#FFC392'; rx.beginPath(); rx.arc(0,0,1.43*k,0,TAU); rx.fill(); rx.stroke();
  peerList.forEach(p=>{ const pr=p.presence||{}; if(p.sameTab||typeof pr.x!=='number') return; rx.fillStyle='rgba(255,195,146,.8)'; rx.fillRect(pr.x*k-2,pr.z*k-2,4,4); });
  STA.forEach(s=>{ const x=s.pos.x*k, y=s.pos.z*k; rx.fillStyle=s.color; rx.beginPath(); rx.arc(x,y,S.ap===s?9:7,0,TAU); rx.fill();
    if(S.docked.has(s.id)){ rx.strokeStyle=s.color; rx.beginPath(); rx.arc(x,y,12,0,TAU); rx.stroke(); }
    if(S.ap===s){ rx.strokeStyle='#fff'; rx.setLineDash([4,4]); rx.beginPath(); rx.moveTo(S.probe.p.x*k,S.probe.p.z*k); rx.lineTo(x,y); rx.stroke(); rx.setLineDash([]); } });
  const P=S.probe; rx.save(); rx.translate(P.p.x*k,P.p.z*k); rx.rotate(-P.head+Math.PI); rx.fillStyle='#fff'; rx.beginPath(); rx.moveTo(0,10); rx.lineTo(6,-6); rx.lineTo(0,-2); rx.lineTo(-6,-6); rx.closePath(); rx.fill(); rx.restore();
  rx.restore();
  rx.fillStyle='rgba(238,233,223,.5)'; rx.font='18px "Departure Mono", monospace'; rx.textAlign='center'; rx.fillText('▲',cx,16);
}
rc.addEventListener('click',e=>{
  const b=rc.getBoundingClientRect(), sc=rc.width/b.width; let x=(e.clientX-b.left)*sc-rc.width/2, y=(e.clientY-b.top)*sc-rc.width/2;
  const c=Math.cos(-S.yaw), s=Math.sin(-S.yaw); const wx=x*c-y*s, wy=x*s+y*c; const k=(rc.width/2-16)/RB;
  let best=null, bd=40; STA.forEach(st=>{ const d=Math.hypot(st.pos.x*k-wx,st.pos.z*k-wy); if(d<bd){bd=d;best=st;} }); if(best) autopilot(best);
});
function updateQuest(){ $('#qtxt').textContent=`${S.docked.size} / 7 docked`; [...$('#dots').children].forEach((d,i)=>{ d.classList.toggle('on',S.docked.has(STA[i].id)); d.style.setProperty('--c',STA[i].color); }); }

/* ---------- docking: fly in, iris open into the station world ---------- */
let TR=null;
function dock(s){
  if(S.mode!=='hub') return;
  const st=ST[s.id]; if(!st) return;
  S.mode='docking'; S.ap=null; U.apLine.visible=false; S.near=null; A.thrust(0); A.swell(); cine(true);
  TR={t:0,s,st,dir:tv[0].copy(hubCam.position).sub(s.pos).setY(0).normalize().clone()};
  fromP.p.copy(hubCam.position); fromP.q.copy(hubCam.quaternion); fromP.fov=hubCam.fov;
  S.stId=s.id; S.st=st; st.enter(); S.stSnap=true; S.arrive=1;
  post.uniforms.uIrisCol.value.set(s.color);
  show('#hub',false); $('#dockp').hidden=true; $('#warn').classList.remove('on');
  S.docked.add(s.id); updateQuest(); where(s.name);
}
function dockUpdate(rdt){
  const tr=TR; tr.t+=rdt; const t=tr.t, s=tr.s;
  const k=E.io(clamp(t/1.15,0,1));
  closeP.p.copy(s.pos).addScaledVector(tr.dir,3.2); closeP.p.y=s.pos.y+1.05; lookQ(closeP.p,s.pos,closeP.q);
  hubCam.position.lerpVectors(fromP.p,closeP.p,k); hubCam.quaternion.slerpQuaternions(fromP.q,closeP.q,k);
  hubCam.fov=lerp(fromP.fov,28,k); hubCam.updateProjectionMatrix();
  post.uniforms.uWarp.value=RM?0:sstep(.45,1.05,t)*(1-sstep(1.2,1.6,t));
  const p=tv[1].copy(s.pos).project(hubCam); post.uniforms.uIC.value.set(p.x*.5+.5,p.y*.5+.5);
  const ki=clamp((t-.8)/.9,0,1); S.iris=ki<=0?0:ki>=1?3:E.i(ki)*2.1;
  S.arrive=1-E.o5(clamp((t-.85)/1.6,0,1));
  if(t>1.3&&!tr.ui){ tr.ui=true; show('#station',true); tr.st.showUI(); }
  if(t>1.8&&!tr.cin){ tr.cin=true; cine(false); }
  if(t>=2.5){ S.mode='station'; TR=null; S.iris=3; post.uniforms.uWarp.value=0; hubCam.fov=36; hubCam.updateProjectionMatrix(); }
}
function undock(){
  if(S.mode!=='station') return;
  const s=STA.find(x=>x.id===S.stId), st=S.st;
  st.abort(); st.hideUI(); cine(true); A.whoosh(false,1.3); S.mode='undocking';
  const out=tv[0].copy(s.pos).setY(0).normalize();
  TR={t:0,s,st,dir:out.clone()};
  S.probe.p.copy(s.pos).addScaledVector(out,3.2); S.probe.p.y=0; S.probe.v.copy(s.vel); S.probe.head=Math.atan2(-s.vel.x,-s.vel.z);
  S.yaw=Math.atan2(out.x,out.z); for(let i=0;i<TRL;i++){ U.trailPos[i*3]=S.probe.p.x;U.trailPos[i*3+1]=0;U.trailPos[i*3+2]=S.probe.p.z; } U.trailG.attributes.position.needsUpdate=true;
  closeP.p.copy(s.pos).addScaledVector(out,3.2); closeP.p.y=s.pos.y+1.05; lookQ(closeP.p,s.pos,closeP.q);
  hubCam.position.copy(closeP.p); hubCam.quaternion.copy(closeP.q); hubCam.fov=28; hubCam.updateProjectionMatrix();
  post.uniforms.uIrisCol.value.set(s.color);
}
function undockUpdate(rdt,dt){
  const tr=TR; tr.t+=rdt; const t=tr.t, s=tr.s;
  S.arrive=E.i(clamp(t/1.,0,1))*.8;
  const ki=clamp((t-.3)/.8,0,1); S.iris=ki>=1?0:(1-E.o(ki))*2.1;
  // probe rides with the station until the iris closes
  if(t<1.1){ S.probe.p.copy(s.pos).addScaledVector(tr.dir,3.2); S.probe.p.y=0; S.probe.v.copy(s.vel); closeP.p.copy(s.pos).addScaledVector(tr.dir,3.2); closeP.p.y=s.pos.y+1.05; lookQ(closeP.p,s.pos,closeP.q); hubCam.position.copy(closeP.p); hubCam.quaternion.copy(closeP.q);
    const p=tv[1].copy(s.pos).project(hubCam); post.uniforms.uIC.value.set(p.x*.5+.5,p.y*.5+.5); fromP.p.copy(closeP.p); fromP.q.copy(closeP.q); U.probe.position.copy(S.probe.p); }
  else { hubPhysics(dt); chasePose(chase); const k=E.io(clamp((t-1.1)/1.3,0,1)); hubCam.position.lerpVectors(fromP.p,chase.p,k); hubCam.quaternion.slerpQuaternions(fromP.q,chase.q,k); hubCam.fov=lerp(28,36,k); hubCam.updateProjectionMatrix(); }
  if(t>1.1&&!tr.off){ tr.off=true; show('#station',false); tr.st.el.classList.remove('on'); tr.st.exit(); S.st=null; S.stId=null; }
  if(t>1.5&&!tr.hud){ tr.hud=true; show('#hub',true); cine(false); where('Orbit'); }
  if(t>=2.4){ S.mode='hub'; TR=null; hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion);
    if(S.docked.size===7&&!S.allDone){ S.allDone=true; setTimeout(()=>toast('Every station visited. The middle is calling.'),700); } }
}

/* ================= STORY: four chapters, one gesture each ================= */
const CH=[ // camera shots of the hole: position, look-at, field of view, drift
  {p:[4.95,1.0,14.3],l:[-2.5,-.55,0],f:30,dr:.5,sys:0,narP:[0,2.2,22],narL:[0,-2.2,0]},
  {p:[3.4,2.6,6.9],l:[-2.4,-.9,0],f:38,dr:.35,sys:0,narP:[0,3.4,12.5],narL:[0,-2,0]},
  {p:[12,64,62],l:[-12,-6,6],f:34,dr:.15,sys:1,narP:[0,96,52],narL:[0,-3,-2]},
  {p:[1.05,.24,1.95],l:[-.25,.08,0],f:64,dr:.12,sys:0,narP:[.3,.42,3.3],narL:[-.05,.3,0]}
];
const story={busy:0,acc:0,from:mkPose(),to:mkPose(),k:1,blocks:$$('#story .ch'),rail:$$('#rail button'),creep:0,px:0,py:0};
function chPose(i,out,t){ const c=CH[i], nar=NARROW(); const P=nar?c.narP:c.p, L=nar?c.narL:c.l;
  const a=Math.sin(t*.07)*c.dr*.12; out.p.set(P[0]*Math.cos(a)-P[2]*Math.sin(a),P[1]+Math.sin(t*.11)*c.dr*.25,P[0]*Math.sin(a)+P[2]*Math.cos(a));
  if(i===3) out.p.multiplyScalar(1-story.creep*.18);
  tv[0].set(L[0],L[1],L[2]);
  // the camera leans with the pointer; the traced lensing shifts with it, which is what makes the hole feel real
  if(story.px||story.py){ const d=out.p.distanceTo(tv[0]), k=d*(i===2?.04:.065); tv[1].subVectors(tv[0],out.p).normalize(); tv[2].crossVectors(tv[1],UPV).normalize(); tv[3].crossVectors(tv[2],tv[1]);
    out.p.addScaledVector(tv[2],story.px*k).addScaledVector(tv[3],story.py*k*.6); }
  lookQ(out.p,tv[0],out.q); out.fov=c.f; return out; }
function goChapter(i){
  if(S.mode!=='story') return; if(i>3){ escape(); return; } i=clamp(i,0,3); if(i===S.ch||story.busy>0) return;
  const prev=S.ch; S.ch=i; story.busy=1.15; story.k=0; story.from.p.copy(hubCam.position); story.from.q.copy(hubCam.quaternion); story.from.fov=hubCam.fov;
  unreveal(story.blocks[prev]); setTimeout(()=>{ if(S.ch===i&&S.mode==='story') reveal(story.blocks[i]); },430);
  story.rail.forEach((b,k)=>b.classList.toggle('on',k===i)); $('#cue').style.opacity=i===0?1:0; $('#prox').classList.toggle('on',i===3);
  $('#cue').innerHTML='<i></i>'+(FINE?'Scroll':'Swipe up'); $('#cue').style.opacity=i===3?0:1;
  A.stinger(i); A.whoosh(i>prev,1.2,.12); if(i===3){ A.alarm(); story.creep=0; }
  where(['Approach','Builders','System','Too close'][i]);
}
function escape(){
  if(S.mode!=='story') return; unreveal(story.blocks[S.ch]); $('#prox').classList.remove('on'); $('#cue').style.opacity=0;
  A.boom(); A.launch(); S.flash=.9; feedback(1.2,1.6); setTimeout(()=>{ show('#story',false); },300); toHub();
}
/* One chapter per gesture. Trackpads keep sending decaying "momentum" wheel events after the fingers lift, so a new
   gesture is either a quiet gap or a clear rise in strength; everything else after a chapter change is ignored. */
const wh={last:0,peak:0,armed:true};
addEventListener('wheel',e=>{
  if(S.mode!=='story') return; e.preventDefault();
  const now=performance.now(), d=e.deltaMode===1?e.deltaY*18:e.deltaMode===2?e.deltaY*innerHeight:e.deltaY, ad=Math.abs(d), gap=now-wh.last; wh.last=now;
  if(gap>200||ad>wh.peak*1.7+6){ wh.armed=true; story.acc=0; }
  wh.peak=gap>200?ad:Math.max(ad,wh.peak*.92);
  if(!wh.armed||story.busy>0) return;
  story.acc+=d; if(Math.abs(story.acc)>40){ goChapter(S.ch+(story.acc>0?1:-1)); story.acc=0; wh.armed=false; }
},{passive:false});
let tY0=null;
addEventListener('touchstart',e=>{ tY0=e.touches[0].clientY; },{passive:true});
addEventListener('touchend',e=>{ if(S.mode!=='story'||tY0===null) return; const dy=tY0-(e.changedTouches[0]?.clientY??tY0); if(Math.abs(dy)>40&&story.busy<=0) goChapter(S.ch+(dy>0?1:-1)); tY0=null; },{passive:true});
addEventListener('keydown',e=>{ if(S.mode!=='story') return; if(['ArrowDown','PageDown','Space','Enter'].includes(e.code)){ e.preventDefault(); goChapter(S.ch+1); } if(['ArrowUp','PageUp'].includes(e.code)){ e.preventDefault(); goChapter(S.ch-1); } });
story.rail.forEach((b,k)=>b.addEventListener('click',()=>goChapter(k)));
$('#skip').addEventListener('click',()=>{ if(S.mode==='story') escape(); });
const _sp=mkPose();
function storyUpdate(rdt,t){
  if(!RM){ story.px=damp(story.px,mouse.on?mouse.nx:0,1.6,rdt); story.py=damp(story.py,mouse.on?mouse.ny:0,1.6,rdt); }
  story.busy-=rdt; story.k=Math.min(1,story.k+rdt/1.6);
  if(S.ch===3) story.creep=Math.min(1,story.creep+rdt/14);
  chPose(S.ch,_sp,t); const k=E.io(story.k);
  hubCam.position.lerpVectors(story.from.p,_sp.p,k); hubCam.quaternion.slerpQuaternions(story.from.q,_sp.q,k); hubCam.fov=lerp(story.from.fov,_sp.fov,k); hubCam.updateProjectionMatrix();
  const sys=CH[S.ch].sys; S.sysVis=damp(S.sysVis||0,sys,2.5,rdt); universeVisible(S.sysVis); STA.forEach(s=>{ s.el.style.display='none'; s.edge.style.display='none'; });
  if(S.ch===3){ const r=hubCam.position.length()/BH.RS; $('#proxR').textContent=r.toFixed(2); A.update(t,{sub:.6+story.creep*.4,pad:.6,bright:.1}); A.whine(.15+story.creep*.35); post.uniforms.uTint.value.r=Math.max(post.uniforms.uTint.value.r,.02+story.creep*.05); S.shake=Math.max(S.shake,.05+story.creep*.12); }
  else { A.update(t,{sub:[.15,.3,.1][S.ch],pad:1,bright:[.5,.35,.6][S.ch]}); A.whine(0); }
}

/* touch screens swipe rather than scroll */
if(!FINE){ $('#cue').innerHTML='<i></i>Swipe up to fall in'; $$('#story .tease').forEach(el=>{ el.textContent=el.textContent.replace(/^Scroll/,'Swipe up'); });
  $('#hint').innerHTML='<span>Drag anywhere to fly</span><span>Tap a station to autopilot</span>'; }

/* ================= STATION FRAMEWORK ================= */
const ST={};
const _pv=new T.Vector3();
function proj(v,cam){ _pv.copy(v).project(cam); return {x:(_pv.x*.5+.5)*innerWidth,y:(-_pv.y*.5+.5)*innerHeight,z:_pv.z}; }
function mkStation(id,impl){
  const el=$(`.st[data-st=${id}]`);
  const st=Object.assign({id,el,scene:new T.Scene(),camP:new T.Vector3(0,3,12),camL:new T.Vector3(0,0,0),arrive:new T.Vector3(0,2.5,8),state:'menu',anchors:[],gameT:0,
    setState(s){ this.state=s; el.classList.remove('is-menu','is-play','is-res'); el.classList.add('is-'+s);
      if(s==='menu'&&el.classList.contains('on')) reveal($('.card',el)); if(s!=='play') cursorAim(false); },
    showUI(){ el.classList.add('on'); this.setState('menu'); },
    hideUI(){ unreveal($('.card',el)); el.classList.remove('is-play','is-res'); setTimeout(()=>{ if(S.stId!==id||S.mode!=='station') el.classList.remove('on'); },700); },
    result(o){ // o: {grade, score, key, stats, text, assisted}
      const best=store.get(id,0), isNew=!o.assisted&&o.score>best; if(isNew) store.set(id,o.score);
      const B=Math.max(best,o.assisted?0:o.score); const bEl=$('#'+id+'Best'); if(bEl) bEl.textContent='Best '+fmt(B);
      const gEl=$('#'+id+'G'); gEl.removeAttribute('data-sp'); gEl.classList.add('pw'); gEl.textContent=o.grade; $('#'+id+'Final').textContent=fmt(o.score);
      const nw=$('#'+id+'New'); if(nw) nw.textContent=o.assisted?'Assisted':isNew?'New best':'Best '+fmt(best);
      $('#'+id+'Stats').innerHTML=statsHTML(o.stats); $('#'+id+'P').textContent=o.text||'';
      prepPW(gEl); this.setState('res'); reveal($('.res',el)); S.games++;
    },
    build(){}, enter(){}, exit(){}, update(){}, play(){}, abort(){}
  },impl);
  st.start=()=>{ if(S.mode!=='station'||S.stId!==id) return; A.stinger(2); A.whoosh(true,.8,.14); st.play(); };
  $$('[data-play]',el).forEach(b=>b.addEventListener('click',st.start));
  $$('[data-back]',el).forEach(b=>b.addEventListener('click',()=>undock()));
  // every station sits in the same sky: a sparse starfield with a faint warm haze toward the hole
  st.scene.add(pts(cloud(Math.floor(1800*Q+400),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),R=90+r[2]*40;o[0]=Math.sin(b)*Math.cos(a)*R;o[1]=Math.cos(b)*R;o[2]=Math.sin(b)*Math.sin(a)*R;}),
    PM({size:.75,color:'#E8DECF',body:'b=.14+.7*pow(aR.x,7.); col=mix(uCol,vec3(.75,.84,1.),aR.y*.6);'})));
  // annotation leader lines
  st.notes=$$('.note',el); const nl=$('.notes',el);
  st.leads=st.notes.map(()=>{ const h=document.createElement('i'); h.className='ld h'; const d=document.createElement('i'); d.className='ld d'; const p=document.createElement('i'); p.className='ld p'; nl.appendChild(h); nl.appendChild(d); nl.appendChild(p); return {h,d,p}; });
  ST[id]=st; return st;
}
function notesUpdate(st){
  if(!st.notes||!st.notes.length||NARROW()) return;
  const W=innerWidth, H=innerHeight, nw=Math.min(250,W*.22), x0=W-nw-54;
  let y=H*.2; const gap=Math.max(26,H*.05);
  st.notes.forEach((n,i)=>{ if(!n._h) n._h=n.offsetHeight||70; n.style.transform=`translate(${x0}px,${y}px)`; const a=st.anchors[i], L=st.leads[i];
    if(a&&L){ const p=proj(a,stCam); const ny=y+12, ex=x0-28; const ok=p.z<1&&isFinite(p.x)&&isFinite(p.y);
      L.h.style.transform=`translate(${ex}px,${ny}px)`; L.h.style.width='24px';
      const dx=p.x-ex, dy=p.y-ny, len=Math.hypot(dx,dy); L.d.style.width=len+'px'; L.d.style.transform=`translate(${ex}px,${ny}px) rotate(${Math.atan2(dy,dx)}rad)`;
      L.p.style.transform=`translate(${p.x-2.5}px,${p.y-2.5}px)`; L.d.style.opacity=L.p.style.opacity=ok?'':'0'; }
    y+=n._h+gap; });
}
function popAt(container,v3,text,cls){
  const p=proj(v3,stCam); const el=document.createElement('span'); el.className='pop '+(cls||''); el.textContent=text;
  el.style.left=p.x+'px'; el.style.top=p.y+'px'; el.style.transform='translate(-50%,-50%)';
  container.appendChild(el); setTimeout(()=>el.remove(),1050);
}
function statsHTML(rows){ return rows.map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join(''); }
function feedback(shake,ca,tint){ S.shake=Math.max(S.shake,shake||0); S.ca=Math.max(S.ca,ca||0); if(tint) post.uniforms.uTint.value.add(tint); }
function showBanner(el,h,sub){ el.innerHTML=`<span class="ui acc fade">${sub||''}</span><h3 class="disp pw">${h}</h3>`; prepPW($('h3',el)); reveal(el); clearTimeout(el._t); el._t=setTimeout(()=>unreveal(el),1500); }

/* Enter starts the game from a station's title screen */
addEventListener('keydown',e=>{ if(e.code!=='Enter'||e.repeat||S.mode!=='station'||!S.st||S.st.state!=='menu') return; if(e.target.closest&&e.target.closest('input,textarea,a,button')) return; e.preventDefault(); S.st.start(); });

/* ===== station kr ===== */
/* ================= KRÍOS: DEAD AIR =================
   A sales call as a timeline. The buyer talks (top lane). Wait for them to finish, then hold to answer (bottom lane).
   Start inside the window, stop inside the bracket. A pause mid-sentence is not your turn. */
(()=>{
const st=mkStation('kr',{arrive:new T.Vector3(1.5,2.4,6)});
const sc=st.scene, RATE=40, N=512, SPD=1.15, XP=-9.5, XF=4.2;
const LINES=[
  {t:"Hi, this is Dana. I've got five minutes. What's this about?",ans:[1.6,3.6]},
  {t:"We already use something for call coaching... | it's fine, honestly.",ans:[1.4,3.2]},
  {t:"How long does it take to set up?",ans:[.9,2.4]},
  {t:"Okay. And what does it cost per seat?",ans:[1.2,3]},
  {t:"I'd need to run that past... | my head of sales.",ans:[1.2,3]},
  {t:"Can you send me something I can share with her?",ans:[.8,2.2]},
  {t:"Alright. What's the next step?",ans:[1.6,3.4]}
];
let tex,buf,u,game=null,vB=null,vY=null,talkCtl,talking=false,talkStart=0,keyTalk=false,attract=0,lastWrite=-1,demoT=0;
const cap=$('#krLine'), hint=$('#krHint'), gradeEl=$('#krGrade');
function syl(w){ const m=w.toLowerCase().replace(/[^a-z']/g,'').match(/[aeiouy]+/g); return Math.max(1,m?m.length:1); }
function idx(time){ return ((Math.floor(time*RATE)%N)+N)%N; }
function wr(time,ch,v,mode){ const i=idx(time)*4+ch; buf[i]=mode==='max'?Math.max(buf[i],v*255):v*255; }

st.build=function(){
  buf=new Uint8Array(N*4); tex=new T.DataTexture(buf,N,1,T.RGBAFormat); tex.magFilter=T.LinearFilter; tex.minFilter=T.LinearFilter; tex.needsUpdate=true;
  u={uH:{value:tex},uNow:{value:0},uN:{value:N},uRate:{value:RATE},uSpd:{value:SPD},uLive:{value:0},uFlash:{value:0},uFlashC:{value:new T.Color('#A5C3FF')}};
  const cols=Math.floor(380*Math.sqrt(Q)), rows=Math.floor(46*Math.sqrt(Q));
  const g=cloud(cols*rows*2,(i,r,o)=>{ const lane=i<cols*rows?0:1; const j=i%(cols*rows); const gx=j%cols, gz=Math.floor(j/cols);
    o[0]=XP+gx/(cols-1)*(XF-XP)+(r[0]-.5)*.02; o[1]=lane; o[2]=(gz/(rows-1)-.5)*1.5+(lane?1.15:-1.15); });
  sc.add(pts(g,PM({size:.032,color:'#A5C3FF',uniforms:u,decl:'uniform sampler2D uH; uniform float uNow,uN,uRate,uSpd,uLive,uFlash; uniform vec3 uFlashC;',body:`
    float lane=position.y; float tm=uNow+p.x/uSpd; float ix=mod(floor(tm*uRate),uN); vec4 h=texture2D(uH,vec2((ix+.5)/uN,.5));
    float zl=(p.z-(lane>.5?1.15:-1.15))/0.75; float prof=gs(zl*1.5);
    float amp=lane>.5?h.g:h.r; float fut=step(0.,p.x);
    float shimmer=.5+.5*sin(p.x*9.+uTime*3.+zl*3.);
    float hgt=amp*prof*(1.25+.25*shimmer)*(1.-fut*(lane>.5?1.:0.));
    p.y=hgt*1.15-.9+ (lane>.5?0.:.05);
    float zone=lane>.5?h.b*smoothstep(1.,.2,abs(zl)):0.;
    float edge=smoothstep(${XP.toFixed(1)},${(XP+3).toFixed(1)},p.x)*smoothstep(${XF.toFixed(1)},${(XF-1.6).toFixed(1)},p.x);
    vec3 cb=uCol, cy=vec3(.93,.91,.87);
    col=lane>.5?cy:cb; col=mix(col,vec3(1.,.76,.5),zone*.9);
    b=(.07+hgt*1.6+zone*.55*(.6+.4*sin(uTime*6.)))*edge*(1.-fut*.55);
    float nowl=gs(p.x*7.); b+=nowl*.35*edge; col=mix(col,uFlashC,nowl*uFlash);
    b*=1.+nowl*uFlash*2.;`})));
  // the now-line: a thin standing plane of light
  sc.add(pts(cloud(900,(i,r,o)=>{o[0]=gauss()*.01;o[1]=-.9+r[0]*2.4;o[2]=(r[1]-.5)*4.6;}),PM({size:.03,color:'#EEE9DF',body:'b=.18*(1.-position.y*.2-.2);'})));
  sc.add(pts(cloud(Math.floor(2000*Q+400),(i,r,o)=>{o[0]=(r[0]-.5)*30;o[1]=-1-r[1]*.1;o[2]=(r[2]-.5)*16;}),PM({size:.03,color:'#A5C3FF',body:'b=.05;'})));
  st.anchors=[new T.Vector3(-2.2,.6,-1.15),new T.Vector3(0,.3,0),new T.Vector3(-3.5,-.2,1.15)];
};
/* ---------- the buyer's line, scheduled on the game clock ---------- */
function schedule(L,t0){
  const parts=L.t.split(' '); const ev=[]; let t=t0; let base=186; const isQ=/\?$/.test(L.t);
  const words=[]; parts.forEach((w,wi)=>{ if(w==='|'){ ev.push({t,type:'pause'}); t+=1.15; return; }
    const n=syl(w); const last=wi===parts.length-1, nearEnd=wi>=parts.length-2;
    const wd={w,t0:t,t1:0,i:words.length}; words.push(wd);
    for(let k=0;k<n;k++){ let p=base*(1-.12*(wi/parts.length)); if(isQ&&nearEnd) p*=1+.22*((k+1)/n)*(last?1.3:.6); else if(last) p*=.86-.06*k; if(/\.\.\.$/.test(w)&&k===n-1) p*=1.04;
      ev.push({t,type:'syl',d:.15,p:p*(1+(Math.random()-.5)*.06),v:(wi*3+k)%6,wd}); t+=.15; }
    wd.t1=t; t+=.07; if(/[,.]$/.test(w)&&!last) t+=/\.\.\.$/.test(w)?.05:.22; });
  return {ev,words,end:t};
}
function setCaption(words){ cap.innerHTML=words.map(w=>`<span class="w">${w.w.replace(/\.\.\.$/,'')}${/\.\.\.$/.test(w.w)?'<span class="pause">…</span>':''}</span>`).join(' '); }
function grade(txt,good){ gradeEl.textContent=txt; gradeEl.style.color=good===1?'var(--acc)':good===0?'var(--ink)':'var(--alarm)'; gradeEl.animate([{opacity:0,transform:'translate(-50%,-30%)'},{opacity:1,transform:'translate(-50%,-50%)',offset:.15},{opacity:1,offset:.7},{opacity:0,transform:'translate(-50%,-70%)'}],{duration:1100,easing:'cubic-bezier(.16,1,.3,1)'}); }
function flash(c){ u.uFlashC.value.set(c); u.uFlash.value=1; }

function nextLine(){
  const g=game; if(g.li>=LINES.length) return end();
  const L=LINES[g.li]; const s=schedule(L,g.t+.5); g.cur={L,...s,ei:0,state:'buyer',open:0,startGrade:null,interrupted:false};
  setCaption(s.words); $('#krTurn').textContent=`Line ${g.li+1} / ${LINES.length}`; hint.textContent=g.li===0?'Listen. Wait until she has finished.':'';
}
function startTalk(){ if(!game||st.state!=='play') return; if(talking) return; talking=true; talkStart=game.t; const c=game.cur; if(!c) return;
  if(c.state==='buyer'){ c.interrupted=true; game.cut++; game.mom-=14; game.combo=0; grade('Cut off',-1); A.buzz(); flash('#FF5636'); feedback(.25,.8,new T.Color(.12,0,0)); hint.textContent="That wasn't your turn. Let her finish."; }
  else if(c.state==='open'){ const d=game.t-c.open; c.startD=d; let pts=0, gtx='';
    if(d<.15){ gtx='Quick'; pts=180; } else if(d<.9){ gtx='Right on time'; pts=300; } else if(d<1.8){ gtx='A bit slow'; pts=90; } else { gtx='Dead air'; pts=0; game.dead++; }
    c.startPts=pts; c.startG=gtx; c.state='you'; hint.textContent=`Answer between ${c.L.ans[0]}s and ${c.L.ans[1]}s. Release to stop.`;
    // the bracket for a good answer length
    for(let tt=game.t+c.L.ans[0]; tt<game.t+c.L.ans[1]; tt+=1/RATE) wr(tt,2,.55);
    A.chime(5,0,.03); }
}
function stopTalk(){ if(!talking) return; talking=false; if(!game) return; const c=game.cur; if(!c||c.state!=='you') return;
  const L=game.t-talkStart; let lp=0, lt='';
  if(L<c.L.ans[0]){ lp=90; lt='Too short'; } else if(L<=c.L.ans[1]){ lp=300; lt='Clean answer'; } else { lp=Math.max(0,220-(L-c.L.ans[1])*120); lt='Rambling'; game.ramble++; }
  finishTurn(c,lp,lt);
}
function finishTurn(c,lp,lt){
  const good=(c.startPts>=180&&lp>=300&&!c.interrupted);
  if(good){ game.combo++; game.best=Math.max(game.best,game.combo); } else game.combo=0;
  const mult=1+Math.min(game.combo,6)*.25; const pts=Math.round((c.startPts+lp)*(c.interrupted?.5:1)*mult); game.score+=pts;
  game.mom+=good?11:(c.startPts>=90&&lp>=90?3:-9); if(c.startG==='Dead air') game.mom-=6;
  grade(good?(c.startG==='Right on time'?'Perfect':'Clean'):lt==='Clean answer'?c.startG:lt,good?1:lt==='Clean answer'?0:-1);
  if(good){ A.chime(7+game.combo); flash('#A5C3FF'); } else if(lt!=='Clean answer') A.buzz();
  popAt($('.pops',st.el)||st.el,new T.Vector3(0,.4,1.15),'+'+pts);
  c.state='done'; game.li++; game.gap=game.t+.7; hint.textContent='';
  game.turns.push({start:c.startD||0,len:lt,interrupted:c.interrupted});
}
function hud(){ $('#krScore').textContent=fmt(game.score); $('#krCombo').textContent=game.combo>1?`Streak ×${(1+Math.min(game.combo,6)*.25).toFixed(2)}`:'';
  const m=$('#krMom'); game.mom=clamp(game.mom,0,100); m.style.setProperty('--v',game.mom/100); m.classList.toggle('low',game.mom<35); }
st.play=function(){
  if(!vB) vB=A.voice(0); if(!vY) vY=A.voice(1);
  buf.fill(0); tex.needsUpdate=true; game={t:0,li:0,score:0,mom:50,combo:0,best:0,cut:0,dead:0,ramble:0,turns:[],gap:.4,cur:null}; lastWrite=-1;
  st.setState('play'); u.uLive.value=1; hud(); cap.innerHTML=''; A.update(0,{pad:.45});
};
st.abort=function(){ game=null; talking=false; u.uLive.value=0; if(vB) vB.hold(0); if(vY) vY.hold(0); A.update(0,{pad:1}); };
function end(){
  const g=game; game=null; talking=false; if(vY) vY.hold(0);
  const grade_=g.mom>=80?'Demo booked':g.mom>=60?'Follow-up set':g.mom>=40?'Send an email':'She hung up';
  const avgStart=g.turns.filter(x=>!x.interrupted).reduce((a,x)=>a+x.start,0)/Math.max(1,g.turns.filter(x=>!x.interrupted).length);
  st.result({grade:grade_,score:g.score,stats:[['Momentum',Math.round(g.mom)+'%'],['Best streak',g.best+' lines'],['Times you cut in',g.cut],['Dead air',g.dead],['Ran long',g.ramble],['Avg reply gap',avgStart.toFixed(2)+' s']],
    text:(g.cut?'Every cut-in cost her trust. ':'')+(g.dead?'Silence reads as doubt. ':'')+'Kríos puts reps through calls like this against a voice that answers back, so the timing is automatic before it matters.'});
  A.update(0,{pad:1}); A.dock();
}
st.enter=function(){ st.abort(); st.setState('menu'); $('#krBest').textContent='Best '+fmt(store.get('kr',0)); buf.fill(0); tex.needsUpdate=true; demoT=0; };
st.exit=function(){ st.abort(); };
talkCtl={};
const tb=$('#krTalk');
tb.addEventListener('pointerdown',e=>{ e.preventDefault(); tb.classList.add('down'); startTalk(); });
addEventListener('pointerup',()=>{ tb.classList.remove('down'); if(!keyTalk) stopTalk(); });
st.onPointer=e=>{ if(st.state==='play'){ startTalk(); } };
addEventListener('keydown',e=>{ if(e.code==='Space'&&S.stId==='kr'&&S.mode==='station'&&st.state==='play'){ e.preventDefault(); if(!e.repeat){ keyTalk=true; tb.classList.add('down'); startTalk(); } } });
addEventListener('keyup',e=>{ if(e.code==='Space'&&keyTalk){ keyTalk=false; tb.classList.remove('down'); stopTalk(); } });

st.update=function(dt,t){
  const now=game?game.t:t;
  // clear the slot that is about to scroll into the future window
  const cur=Math.floor((now+(XF/SPD)+.2)*RATE); if(lastWrite<0) lastWrite=cur-1; for(let k=lastWrite+1;k<=cur;k++){ const i=((k%N)+N)%N*4; buf[i]=buf[i+1]=buf[i+2]=buf[i+3]=0; } lastWrite=cur;
  if(game){
    game.t+=dt; const c=game.cur;
    if(!c&&game.t>game.gap) nextLine();
    else if(c&&c.state==='done'&&game.t>game.gap) nextLine();
    if(c&&c.state==='buyer'){
      while(c.ei<c.ev.length&&c.ev[c.ei].t<=game.t){ const e=c.ev[c.ei++]; if(e.type==='syl'){ vB.syl(e.d,e.p,e.v); $$('.w',cap)[e.wd.i]?.classList.add('on'); } }
      // write the buyer's envelope for the just-spoken slice
      const live=c.ev.some(e=>e.type==='syl'&&game.t>=e.t&&game.t<e.t+e.d); wr(game.t,0,live?.55+.45*Math.abs(Math.sin(game.t*31)):.0,'max');
      if(game.t>c.end+.02&&c.ei>=c.ev.length){ c.state='open'; c.open=game.t; for(let tt=game.t+.15;tt<game.t+.9;tt+=1/RATE) wr(tt,2,1); if(game.li===0) hint.textContent='Now. Hold to answer.'; }
    }
    if(c&&c.state==='open'&&!talking&&game.t-c.open>3.2){ game.dead++; game.mom-=12; c.startPts=0; c.startG='Dead air'; grade('Dead air',-1); A.buzz(); hint.textContent='"Hello? Are you still there?"'; finishTurn(c,0,'No answer'); }
    if(c&&c.state==='you'){ const L=game.t-talkStart; if(L>c.L.ans[1]+2.2){ talking=false; finishTurn(c,0,'Monologue'); game.ramble++; hint.textContent='She tuned out.'; } }
    if(talking){ wr(game.t,1,.5+.5*Math.abs(Math.sin(game.t*23+Math.sin(game.t*7)*2)),'max'); vY.hold(1,110+Math.sin(game.t*3)*12); if(Math.random()<dt*9) vY.syl(.13,108+Math.random()*24,(Math.random()*6)|0); }
    else if(vY) vY.hold(0);
    hud();
  } else {
    // attract loop: a quiet call already in progress
    demoT+=dt; const a=Math.max(0,Math.sin(demoT*1.3))*Math.abs(Math.sin(demoT*17)); wr(t,0,(demoT%9)<4?a*.6:0,'max'); wr(t,1,(demoT%9)>4.8&&(demoT%9)<7.5?Math.abs(Math.sin(t*19))*.45:0,'max');
  }
  tex.needsUpdate=true; u.uNow.value=now; u.uFlash.value=damp(u.uFlash.value,0,4,dt);
  const nar=NARROW(); st.camP.set(nar?1.2:3.6,nar?4.2:2.9,nar?11:7.6); st.camL.set(nar?-.8:-1.6,nar?.2:.55,0);
  if(st.state!=='play') notesUpdate(st);
};
})();

/* ===== station bs ===== */
/* ================= BOWSHOCK: SHOCK LINE =================
   A finned rocket in a supersonic tunnel. Shape the nose cone so its shock just grazes the fin tips.
   The cone's shock comes from the Taylor-Maccoll equation (checked: 20 deg cone at Mach 2 gives a 37.8 deg shock, as in NACA 1135). */
(()=>{
const st=mkStation('bs',{arrive:new T.Vector3(0,1.5,6)});
const sc=st.scene, GAM=1.4, DEG=Math.PI/180, RB=.42, LEN=6.2, XF=5.15, NP=Math.floor(5200*Q+1800);
/* ---- gas dynamics ---- */
const wedge=(b,M)=>Math.atan(2/Math.tan(b)*(M*M*Math.sin(b)**2-1)/(M*M*(GAM+Math.cos(2*b))+2));
function behind(b,M){ const d=wedge(b,M); const Mn1=M*Math.sin(b); const Mn2=Math.sqrt((1+.2*Mn1*Mn1)/(1.4*Mn1*Mn1-.2)); const p=1+2*GAM/(GAM+1)*(Mn1*Mn1-1); return {d,M2:Mn2/Math.sin(b-d),p,Tr:p*(2+(GAM-1)*Mn1*Mn1)/((GAM+1)*Mn1*Mn1)}; }
function coneFromBeta(b,M){ const B=behind(b,M); if(!(B.d>0)) return {tc:0}; const V=1/Math.sqrt(2/((GAM-1)*B.M2*B.M2)+1); let v=V*Math.cos(b-B.d), w=-V*Math.sin(b-B.d), th=b; const h=-.0012;
  const f=(t,v,dv)=>{ const A=(GAM-1)/2*(1-v*v-dv*dv); return (dv*dv*v-A*(2*v+dv/Math.tan(t)))/(A-dv*dv); };
  for(let i=0;i<2000;i++){ const a1=w,b1=f(th,v,w), a2=w+h/2*b1,b2=f(th+h/2,v+h/2*a1,a2), a3=w+h/2*b2,b3=f(th+h/2,v+h/2*a2,a3), a4=w+h*b3,b4=f(th+h,v+h*a3,a4);
    const n0=v+h/6*(a1+2*a2+2*a3+a4), n1=w+h/6*(b1+2*b2+2*b3+b4);
    if(n1>=0){ const fr=w/(w-n1); return {tc:th+h*fr,Vc:v+(n0-v)*fr,B}; } v=n0; w=n1; th+=h; if(th<=.002) return {tc:0}; }
  return {tc:0}; }
const maxCache=new Map();
function coneMax(M){ const k=M.toFixed(3); if(maxCache.has(k)) return maxCache.get(k); let best=0,bb=0; for(let b=Math.asin(1/M)+.002;b<Math.PI/2-.01;b+=.012){ const c=coneFromBeta(b,M).tc; if(c>best){best=c;bb=b;} } const r={tc:best,b:bb}; maxCache.set(k,r); return r; }
const solCache=new Map();
function solve(tc,M){ const k=M.toFixed(3)+'|'+(tc/DEG).toFixed(2); if(solCache.has(k)) return solCache.get(k); const mx=coneMax(M); let r=null;
  if(tc<=mx.tc){ let lo=Math.asin(1/M)+1e-4, hi=mx.b; for(let i=0;i<26;i++){ const mid=(lo+hi)/2; if(coneFromBeta(mid,M).tc<tc) lo=mid; else hi=mid; } const b=(lo+hi)/2, c=coneFromBeta(b,M);
    const Vc=c.Vc||.5, Mc=Math.sqrt(2/(GAM-1)*Vc*Vc/Math.max(1e-6,1-Vc*Vc)); const pc=c.B.p*Math.pow((1+.2*c.B.M2*c.B.M2)/(1+.2*Mc*Mc),3.5);
    r={b,Mc,pc,Tr:c.B.Tr,M2:c.B.M2,d:c.B.d,cd:(pc-1)*2/(GAM*M*M)}; }
  if(solCache.size>4000) solCache.clear(); solCache.set(k,r); return r; }

let tc=14*DEG, M=3.2, finY=2, game=null, run=null, keysHeld=0, rocket, shockCone, shockL, flowG, fP, fC, tipM, roll=0;
const read=$('#bsRead'), conv=$('#bsConv'), cx=conv.getContext('2d');
const mat=LM('#8FA3CC',{emit:.02,rim:.75,amb:.07,key:'#FFFFFF'}), edgeM=new T.LineBasicMaterial({color:0xC4D6FF,transparent:true,opacity:.3});
const KEY=new T.Vector3(-6,5,8);
function buildRocket(){
  if(rocket){ sc.remove(rocket); rocket.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
  rocket=new T.Group(); const Ln=RB/Math.tan(tc);
  const prof=[new T.Vector2(0,0),new T.Vector2(RB,Ln),new T.Vector2(RB,LEN),new T.Vector2(RB*.82,LEN+.1),new T.Vector2(0,LEN+.1)];
  const lg=new T.LatheGeometry(prof,64); const body=new T.Mesh(lg,mat); body.add(new T.LineSegments(new T.EdgesGeometry(lg,25),edgeM)); body.rotation.z=-Math.PI/2; rocket.add(body);
  const span=Math.max(.2,finY-RB), sh=new T.Shape(); sh.moveTo(4.55,0); sh.lineTo(XF,span); sh.lineTo(5.85,span); sh.lineTo(LEN,0); sh.closePath();
  const fg=new T.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false}); fg.translate(0,RB*.97,-.0175);
  for(let k=0;k<4;k++){ const f=new T.Mesh(fg,mat); f.rotation.x=k*Math.PI/2; rocket.add(f); const e=new T.LineSegments(new T.EdgesGeometry(fg),edgeM); e.rotation.x=f.rotation.x; rocket.add(e); }
  rocket.rotation.x=roll; sc.add(rocket);
}
st.build=function(){
  mat.uniforms.uKey.value.copy(KEY);
  buildRocket();
  // the shock cone itself: faint glass, brightest at its silhouette
  const cg=new T.ConeGeometry(1,1,96,1,true); cg.translate(0,-.5,0); cg.rotateZ(Math.PI/2);
  shockCone=new T.Mesh(cg,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{uC:{value:new T.Color('#E8EEFF')}},
    vertexShader:`varying vec3 vN; varying vec3 vV; varying float vX; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); vX=w.x; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying float vX; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.); gl_FragColor=vec4(uC*(.004+f*.11)*smoothstep(8.8,5.5,vX),1.); }`}));
  sc.add(shockCone);
  const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.BufferAttribute(new Float32Array(12),3)); shockL=new T.LineSegments(sg,new T.LineBasicMaterial({color:0xFFFFFF,transparent:true,opacity:.6,blending:T.AdditiveBlending})); shockL.frustumCulled=false; sc.add(shockL);
  // the target: the upper fin tip
  tipM=pts(cloud(500,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*.16;o[1]=Math.sin(a)*.16;o[2]=0;}),PM({size:.07,color:'#FFC392',body:'float k=fract(uTime*.8); p*=1.+k*1.5; b=(1.-k)*1.5;'})); sc.add(tipM);
  // flow streaks in the meridian plane, a little depth either side
  fP=new Float32Array(NP*2); fC=new Float32Array(NP).fill(1);
  for(let i=0;i<NP;i++){ fP[i*2]=-4+Math.random()*13; fP[i*2+1]=(Math.random()*2-1)*3.6; }
  flowG=new T.BufferGeometry(); flowG.setAttribute('position',new T.BufferAttribute(new Float32Array(NP*6),3)); flowG.setAttribute('color',new T.BufferAttribute(new Float32Array(NP*6),3)); flowG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  const fl=new T.LineSegments(flowG,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false})); fl.frustumCulled=false; sc.add(fl);
  sc.add(pts(cloud(3600,(i,r,o)=>{o[0]=-4+r[0]*13;o[1]=(r[1]<.5?-1:1)*3.95;o[2]=(r[2]-.5)*2.4;}),PM({size:.03,color:'#C4D6FF',body:'b=.1;'})));
  sc.add(pts(cloud(3000,(i,r,o)=>{o[0]=-4+r[0]*13;o[1]=(r[1]*2-1)*3.95;o[2]=-2.2;}),PM({size:.025,color:'#C4D6FF',body:'b=.05*step(.5,fract(p.x*2.))*step(.5,fract(p.y*2.));'})));
  st.anchors=[new T.Vector3(.5,.12,0),new T.Vector3(3.2,1.25,0),new T.Vector3(XF,1.4,0)];
};
const LUT=[...Array(96)].map((_,i)=>blackbodyJS(clamp(2300*Math.pow(1+i/24,1.5),1800,24000)));
function shockUpdate(){ const s=solve(tc,M); const a=shockL.geometry.attributes.position.array; a.fill(0);
  if(s){ const L=8.6, R=L*Math.tan(s.b); a.set([0,0,0,L,R,0,0,0,0,L,-R,0]); shockCone.visible=true; shockCone.scale.set(L,R,R); }
  else shockCone.visible=false;
  shockL.geometry.attributes.position.needsUpdate=true; return s; }
function flow(dt,s){
  const V1=2.4, Ln=RB/Math.tan(tc), pos=flowG.attributes.position.array, cl=flowG.attributes.color.array;
  const tb=s?Math.tan(s.b):0, V2=s?V1*s.M2/M*Math.sqrt(s.Tr):V1*.3;
  for(let i=0;i<NP;i++){ let x=fP[i*2], y=fP[i*2+1]; const sg=y<0?-1:1, ay=Math.abs(y); let vx=V1, vy=0, Tr=1;
    if(s&&x>0&&ay<x*tb){ const phi=Math.atan2(ay,x); const k=clamp((phi-tc)/Math.max(1e-3,s.b-tc),0,1); const dir=lerp(tc,s.d,k);
      if(x<Ln){ vx=V2*Math.cos(dir); vy=V2*Math.sin(dir)*sg; Tr=lerp(s.Tr*1.08,s.Tr,k); } else { const f=clamp((x-Ln)/1.2,0,1); vx=lerp(V2*Math.cos(dir),V1*.92,f); vy=lerp(V2*Math.sin(dir),0,f)*sg; Tr=lerp(s.Tr,1+(s.Tr-1)*.55,f); } }
    const surf=x<0?-1:x<Ln?x*Math.tan(tc):x<LEN?RB:-1; if(surf>0&&ay<surf+.03){ y=sg*(surf+.03); vy=Math.abs(vy)*sg; }
    x+=vx*dt; y+=vy*dt; if(x>9||Math.abs(y)>3.9){ x=-4-Math.random()*.6; y=(Math.random()*2-1)*3.6; Tr=1; }
    fP[i*2]=x; fP[i*2+1]=y; fC[i]=lerp(fC[i],Tr,.25);
    const bb=LUT[clamp(Math.round((fC[i]-1)*24),0,95)], br=.12+.45*clamp(fC[i]-1,0,2.5);
    const k6=i*6, len=.06, z=((i%9)/9-.5)*1.8; pos[k6]=x; pos[k6+1]=y; pos[k6+2]=z; pos[k6+3]=x-vx*len; pos[k6+4]=y-vy*len; pos[k6+5]=z;
    cl[k6]=bb.r*br;cl[k6+1]=bb.g*br;cl[k6+2]=bb.b*br; cl[k6+3]=cl[k6+4]=cl[k6+5]=0; }
  flowG.attributes.position.needsUpdate=true; flowG.attributes.color.needsUpdate=true;
}
function readout(s){ const mx=coneMax(M);
  read.innerHTML=[['Mach',M.toFixed(2)],['Nose half-angle',(tc/DEG).toFixed(2)+'°'],['Shock angle',s?(s.b/DEG).toFixed(2)+'°':'detached'],['Max cone',(mx.tc/DEG).toFixed(1)+'°'],['Mach at surface',s?s.Mc.toFixed(2):'< 1'],['p surface / p∞',s?s.pc.toFixed(2):'-'],['T2 / T1',s?s.Tr.toFixed(2):'-'],['Cd wave',s?s.cd.toFixed(3):'-']].map(([k,v])=>`<span>${k}</span><span>${v}</span>`).join(''); }
function setTc(v){ const n=clamp(v,4*DEG,42*DEG); if(Math.abs(n-tc)>.02*DEG){ tc=n; buildRocket(); A.key(); } }
function newRun(){
  const g=game; g.r++; if(g.r>5) return end();
  M=[2.6,3.1,3.6,4.2,4.9][g.r-1]+(Math.random()-.5)*.2;
  let tStar=14*DEG, s=null; for(let k=0;k<40;k++){ tStar=(7+Math.random()*16)*DEG; s=solve(tStar,M); if(s){ const span=XF*Math.tan(s.b)-RB; if(span>.55&&span<2.6) break; } }
  finY=XF*Math.tan(s.b); g.tStar=tStar; tc=clamp(tStar+(Math.random()<.5?-1:1)*(5+Math.random()*5)*DEG,4*DEG,40*DEG); roll=0; buildRocket(); tipM.position.set(XF,finY,.05);
  g.left=12; g.state='set'; $('#bsRound').textContent=`Run ${g.r} / 5`; $('#bsMach').textContent='M '+M.toFixed(2); $('#bsRun').disabled=false;
  showBanner($('#bsBanner'),'Mach '+M.toFixed(1),`Run ${g.r}`); A.ping(1175,.04); cx.clearRect(0,0,conv.width,conv.height);
}
function lockRun(){ if(!game||game.state!=='set') return; game.state='run'; run={t:0}; $('#bsRun').disabled=true; A.launch(); A.roar(.22); }
function scoreRun(){
  const g=game, s=solve(tc,M); let pts_=0, g_='', err=99;
  if(!s){ g_='Detached'; g.det++; A.buzz(); feedback(.3,.8,new T.Color(.1,0,0)); }
  else { const ys=XF*Math.tan(s.b); err=Math.abs(ys-finY)/XF*100; const tb=1+g.left/12*.3; pts_=Math.round(Math.max(0,1000-err*90)*tb);
    g_=err<1.5?'Grazing':err<5?'Close':ys<finY?'Fins pierce the shock':'Shock clears the fins'; if(err<1.5){ g.hits++; A.chord(); S.flash=Math.max(S.flash,.12); } else A.chime(5); }
  g.score+=pts_; g.errs.push(err); $('#bsScore').textContent=fmt(g.score);
  popAt($('#bsPops'),new T.Vector3(XF,finY+.45,0),s?`${g_} · ${err.toFixed(1)}%`:g_,err<1.5?'big':s?'':'bad');
  g.state='done'; setTimeout(()=>{ if(game===g) newRun(); },1700); A.roar(0);
}
function drawConv(k,s){ const w=conv.width,h=conv.height; cx.clearRect(0,0,w,h); cx.strokeStyle='rgba(196,214,255,.25)'; cx.lineWidth=1; cx.beginPath(); cx.moveTo(0,h-1); cx.lineTo(w,h-1); cx.stroke();
  cx.strokeStyle='#C4D6FF'; cx.lineWidth=2; cx.beginPath(); const n=Math.floor(k*120);
  for(let i=0;i<=n;i++){ const x=i/120*w; const lvl=Math.floor(i/40); const yy=h*(.3+.55*(1-Math.exp(-(i%40)/10))*.7+lvl*.04)+Math.sin(i*1.7)*2; i?cx.lineTo(x,yy):cx.moveTo(x,yy); } cx.stroke();
  const lvl=Math.min(2,Math.floor(k*3)), band=[.024,.009,.003][lvl];
  cx.fillStyle='rgba(196,214,255,.85)'; cx.font='20px "Departure Mono", monospace'; cx.fillText(`GRID ${[40,80,160][lvl]}   CD ${s?s.cd.toFixed(3):'-'} ± ${band.toFixed(3)}`,6,22); }
st.onPointer=function(e){ if(!game||game.state!=='set') return; const y0=e.clientY, t0=tc; const mv=ev=>setTc(t0+(y0-ev.clientY)*.0016); const up=()=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); }; addEventListener('pointermove',mv); addEventListener('pointerup',up); };
addEventListener('keydown',e=>{ if(S.stId!=='bs'||S.mode!=='station'||!game) return; if(e.code==='ArrowUp'||e.code==='ArrowDown'){ e.preventDefault(); keysHeld=e.code==='ArrowUp'?1:-1; } if(e.code==='Space'&&!e.repeat){ e.preventDefault(); lockRun(); } });
addEventListener('keyup',e=>{ if(e.code==='ArrowUp'||e.code==='ArrowDown') keysHeld=0; });
addEventListener('wheel',e=>{ if(S.stId==='bs'&&game&&game.state==='set') setTc(tc-e.deltaY*.00025); },{passive:true});
$('#bsRun').addEventListener('click',lockRun);
st.play=function(){ game={r:0,score:0,hits:0,det:0,errs:[]}; $('#bsScore').textContent='0'; st.setState('play'); newRun(); };
st.abort=function(){ game=null; run=null; A.roar(0); };
function end(){ const g=game; game=null; const ok=g.errs.filter(e=>e<99); const avg=ok.length?ok.reduce((a,b)=>a+b,0)/ok.length:0;
  const grade=g.hits>=4?'Grazing':g.hits>=2?'Clean flow':'Shock-bitten';
  st.result({grade,score:g.score,stats:[['Grazing runs',g.hits+' / 5'],['Average miss',avg.toFixed(1)+'%'],['Top Mach','4.9'],['Detached',g.det],['Gas','Air, γ 1.4'],['Model','Taylor-Maccoll cone']],
    text:'Every shock here comes from the exact conical-flow solution. Bowshock goes much further: it solves the full flow around your rocket on your own GPU, and gives drag only with a checked uncertainty band.'}); A.dock(); }
st.enter=function(){ st.abort(); st.setState('menu'); M=3.2; tc=14*DEG; finY=XF*Math.tan(solve(tc,M).b); buildRocket(); tipM.position.set(XF,finY,.05); $('#bsBest').textContent='Best '+fmt(store.get('bs',0)); };
st.exit=function(){ st.abort(); };
let lastRead=-1;
st.update=function(dt,t){
  if(game&&game.state==='set'){ game.left-=dt; if(keysHeld) setTc(tc+keysHeld*dt*5*DEG); $('#bsTime').textContent=Math.max(0,game.left).toFixed(1)+' s'; if(game.left<=0) lockRun(); }
  const s=shockUpdate();
  if(run&&game&&game.state==='run'){ run.t+=dt; drawConv(Math.min(1,run.t/1.6),s); if(run.t>1.6){ run=null; scoreRun(); } }
  if(!game&&st.state==='menu'){ const nt=(14+Math.sin(t*.5)*4)*DEG; if(Math.abs(nt-tc)>.4*DEG){ tc=nt; buildRocket(); } }
  // the rocket rolls slowly while you read; it holds still while you play
  roll=st.state==='menu'?t*.2:damp(roll,Math.round(roll/(Math.PI/2))*(Math.PI/2),4,dt); rocket.rotation.x=roll;
  flow(Math.min(dt,.033),s); if(t-lastRead>.1||t<lastRead){ lastRead=t; readout(s); }
  const nar=NARROW(); st.camP.set(nar?3:2.2,nar?2.4:1.9,nar?20:13.4); st.camL.set(nar?3:3.3,nar?.6:.1,0);
  if(st.state==='menu') notesUpdate(st);
};
})();

/* ===== station ae ===== */
/* ================= AETOS: HOLD THE SKY ================= */
(()=>{
const STA_AE_A=[new T.Vector3(0,.3,0),new T.Vector3(1.9,.2,1.1),new T.Vector3(-2.1,.2,.55)];
const st=mkStation('ae',{arrive:new T.Vector3(0,6,8)});
const sc=st.scene, el=st.el, MAXD=48, MAXM=10, AMMO=6;
const COL={unk:new T.Color('#C9C2B4'),hos:new T.Color('#FF5636'),fri:new T.Color('#A5C3FF')};
const TYPES={scout:{spd:1.25,hp:1,sc:1,pts:100,label:'SCOUT'},swarm:{spd:.55,hp:1,sc:.62,pts:60,label:'SWARM'},heavy:{spd:.45,hp:2,sc:1.55,pts:250,label:'HEAVY'},friend:{spd:.95,hp:1,sc:1.1,pts:-400,label:'FRIENDLY'}};
const WAVES=[{dur:20,every:1.55,mix:[['scout',.72],['friend',.28]],name:'Scouts inbound'},{dur:22,every:1.35,mix:[['scout',.42],['friend',.22],['swarm',.36]],name:'Swarms inbound'},{dur:25,every:1.15,mix:[['scout',.34],['friend',.2],['swarm',.24],['heavy',.22]],name:'Heavies inbound'}];
const SITES=[{name:'Substation',p:new T.Vector3(1.9,0,1.1)},{name:'Airfield',p:new T.Vector3(-2.1,0,.55)},{name:'Water works',p:new T.Vector3(.25,0,-2.25)}];
let sweepU,inst,navG,navP,navB,missP,missG,boom,smoke,jamU,game=null,drones=[],miss=[],nextId=1,sw=0,lastSw=0,tableT=0;
const M4=new T.Matrix4(), Qn=new T.Quaternion(), V=new T.Vector3(), V2=new T.Vector3(), SCL=new T.Vector3(), YAX=new T.Vector3(0,1,0);
const marks=$('#aeMarks'), table=$('#aeTable'), banner=$('#aeBanner'), pips=$('#aePips');
for(let i=0;i<AMMO;i++) pips.appendChild(document.createElement('i'));
const trk=[...Array(24)].map(()=>{const d=document.createElement('div'); d.className='trk'; d.innerHTML='<span></span>'; d.style.display='none'; marks.appendChild(d); return d;});
const siteEls=SITES.map(s=>{const d=document.createElement('div'); d.className='asset'; d.innerHTML=`<span>${s.name}</span><span class="hp"><i></i><i></i><i></i></span>`; marks.appendChild(d); return d;});

function droneGeo(){
  const pos=[],nor=[]; const add=(bg)=>{ const b=bg.toNonIndexed(); pos.push(...b.attributes.position.array); nor.push(...b.attributes.normal.array); };
  add(new T.BoxGeometry(.2,.07,.2));
  const a1=new T.BoxGeometry(.62,.025,.04); a1.rotateY(Math.PI/4); add(a1); const a2=new T.BoxGeometry(.62,.025,.04); a2.rotateY(-Math.PI/4); add(a2);
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([x,z])=>{ const r=new T.CylinderGeometry(.1,.1,.012,14); r.translate(x*.22,.03,z*.22); add(r); });
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new T.Float32BufferAttribute(nor,3)); return g;
}
st.build=function(){
  sweepU={uSw:{value:0}};
  sc.add(pts(cloud(Math.floor(24000*Q+5000),(i,r,o)=>{ const R=6.6, w=r[3];
    if(w>.62){ const lines=r[2]<.5, az=lines?Math.floor(r[0]*16)/16*TAU:r[0]*TAU, e=lines?r[1]*Math.PI/2:Math.floor(r[1]*5)/5*Math.PI/2+.02; o[0]=Math.cos(az)*Math.cos(e)*R;o[1]=Math.sin(e)*R*.55;o[2]=Math.sin(az)*Math.cos(e)*R; }
    else if(w>.48){ const az=Math.floor(r[0]*12)/12*TAU,rr=r[1]*R; o[0]=Math.cos(az)*rr;o[1]=0;o[2]=Math.sin(az)*rr; }
    else { const ring=r[2]<.7,az=r[0]*TAU,rr=ring?(Math.floor(r[1]*6)+1)/6*R+gauss()*.012:Math.sqrt(r[1])*R; o[0]=Math.cos(az)*rr;o[1]=0;o[2]=Math.sin(az)*rr; } }),
    PM({size:.032,color:'#D8D0C2',uniforms:sweepU,decl:'uniform float uSw;',body:`float a=atan(p.z,p.x); float d=mod(uSw-a,6.28318); float ph=exp(-d*2.4);
      b=aR.w>.62?.06+.24*ph:.07+1.1*ph; col=mix(uCol,vec3(1.,.97,.93),ph*.7);`})));
  // sweep beam wedge
  sc.add(pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{o[0]=r[0];o[1]=r[1];o[2]=0;}),PM({size:.04,color:'#F2EEE6',uniforms:sweepU,decl:'uniform float uSw;',
    body:`float a=uSw-position.y*.35; float rr=sqrt(position.x)*6.6; p=vec3(cos(a)*rr,.02,sin(a)*rr); b=.5*(1.-position.y);`})));
  // command post + sites
  const cp=new T.Mesh(new T.OctahedronGeometry(.22,0),LM('#F2EEE6',{emit:.4,rim:1.2})); cp.position.y=.25; sc.add(cp); st.cp=cp;
  SITES.forEach(s=>{ const m=new T.Mesh(new T.CylinderGeometry(.3,.36,.24,6),LM('#D8D0C2',{emit:.08,rim:1.1,amb:.15,key:'#FFFFFF'})); m.position.copy(s.p).setY(.12); sc.add(m); s.mesh=m;
    const ring=new T.LineLoop(ringGeo(.62,64),dashMat('#D8D0C2','float a=.5*step(.5,fract(vAng*4.+uTime*.2));')); ring.material.uniforms.uOp.value=1; ring.position.copy(s.p).setY(.02); sc.add(ring); s.ring=ring; });
  inst=new T.InstancedMesh(droneGeo(),LM('#FFFFFF',{emit:.55,rim:1.1,amb:.2,key:'#FFFFFF'}),MAXD); inst.frustumCulled=false;
  for(let i=0;i<MAXD;i++){ M4.makeScale(0,0,0); inst.setMatrixAt(i,M4); inst.setColorAt(i,COL.unk); } sc.add(inst);
  navP=new Float32Array(MAXD*3).fill(999); navB=new Float32Array(MAXD); navG=new T.BufferGeometry(); navG.setAttribute('position',new T.BufferAttribute(navP,3)); navG.setAttribute('aB',new T.BufferAttribute(navB,1));
  navG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXD*4).fill(.6),4)); navG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  sc.add(pts(navG,PM({size:.3,color:'#ffd6cf',decl:'attribute float aB;',body:'b=aB;'})));
  missP=new Float32Array(MAXM*3).fill(999); missG=new T.BufferGeometry(); missG.setAttribute('position',new T.BufferAttribute(missP,3)); missG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXM*4).fill(.8),4)); missG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  sc.add(pts(missG,PM({size:.28,color:'#ffffff',body:'b=1.6;'})));
  boom=Burst(sc,Math.floor(1400*Q+400),'#ffd2c2',.12); smoke=Burst(sc,Math.floor(1600*Q+400),'#c8c0dc',.07);
  jamU={uR:{value:0},uO:{value:0}};
  sc.add(pts(cloud(1600,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=.1+gauss()*.1;o[2]=Math.sin(a);}),PM({size:.07,color:'#8fc2ff',uniforms:jamU,decl:'uniform float uR,uO;',body:'p.xz*=uR; b=uO*(.5+aR.z);'})));
};
function spawn(type,at,center){
  if(drones.length>=MAXD-1) return;
  const a=at??Math.random()*TAU, R=7.3; let p=new T.Vector3(Math.cos(a)*R,1.2+Math.random()*1.1,Math.sin(a)*R); if(center) p=center.clone().add(new T.Vector3(gauss()*.35,gauss()*.15,gauss()*.35));
  const T_=TYPES[type]; const alive=SITES.map((s,i)=>i).filter(i=>SITES[i].hp>0);
  const d={id:nextId++,type,cls:'unk',p,hp:T_.hp,ph:Math.random()*6,jam:0,dead:false,fall:false,vy:0,lock:false,seen:0};
  if(type==='friend'){ const b=a+Math.PI+(Math.random()-.5)*1.1; d.goal=new T.Vector3(Math.cos(b)*R,2.4,Math.sin(b)*R); d.p.y=2.4; }
  else { d.site=alive.length?alive[(Math.random()*alive.length)|0]:0; }
  drones.push(d); return d;
}
function kill(d,byJam){
  d.dead=true; const T_=TYPES[d.type]; boom.emit(d.p,d.type==='heavy'?80:46,2.6,d.type==='friend'?COL.fri:COL.hos,.4,.9); A.pop();
  if(!game) return;
  if(d.type==='friend'){ game.score-=400; game.blue++; feedback(.35,1,new T.Color(0,.03,.14)); showBanner(banner,'Friendly hit','−400'); A.buzz(); }
  else { game.score+=T_.pts; game.kills++; feedback(.12,.25); }
}
function fire(d){
  if(!game||game.ammo<=0){ if(game){ A.beep(220); } return; }
  const m=miss.find(x=>!x.on)||(miss.length<MAXM?(miss.push({}),miss[miss.length-1]):null); if(!m) return;
  Object.assign(m,{on:true,p:new T.Vector3(0,.3,0),v:new T.Vector3(0,4,0),tgt:d,life:3.2}); d.lock=true; game.ammo--; game.shots++; A.launch(); A.blip();
}
function jam(){
  if(!game||game.jamCD>0) return; game.jamCD=10; game.jamT=0; A.jam(); feedback(.18,.5,new T.Color(0,.02,.08));
  drones.forEach(d=>d.jamHit=false);
}
st.onPointer=function(e){
  if(st.state!=='play'||!game||game.inter>0&&game.wave===0) return;
  let best=null,bd=e.pointerType==='mouse'?70:95;
  drones.forEach(d=>{ if(d.dead||d.fall) return; V.copy(d.p).project(stCam); const sx=(V.x*.5+.5)*innerWidth, sy=(-V.y*.5+.5)*innerHeight; const dd=Math.hypot(sx-e.clientX,sy-e.clientY); if(dd<bd){bd=dd;best=d;} });
  if(best) fire(best); else A.beep(330);
};
$('#aeJam').addEventListener('click',jam);
addEventListener('keydown',e=>{ if(S.stId==='ae'&&S.mode==='station'&&e.code==='Space'&&!e.repeat){ e.preventDefault(); jam(); } });
st.play=function(){
  drones=[]; miss.forEach(m=>m.on=false); boom.clear(); smoke.clear();
  SITES.forEach(s=>{ s.hp=3; s.mesh.material.uniforms.uC.value.set('#D8D0C2'); });
  game={wave:0,wt:0,inter:2.2,spawnT:0,score:0,kills:0,shots:0,blue:0,siteHits:0,ammo:AMMO,reload:0,jamCD:0,jamT:-1,ending:-1};
  st.setState('play'); showBanner(banner,'Wave 1',WAVES[0].name);
};
st.abort=function(){ game=null; drones=[]; miss.forEach(m=>m.on=false); trk.forEach(t=>t.style.display='none'); };
function end(){
  const g=game; game=null;
  const hp=SITES.reduce((a,s)=>a+Math.max(0,s.hp),0); const total=Math.max(0,g.score+hp*100);
  const grade=hp===0?'Airspace lost':g.blue>0?'Held, with a blue-on-blue':hp===9?'Flawless':hp>=6?'Airspace held':'Damaged, standing';
  st.result({grade,score:total,stats:[['Intercepted',g.kills],['Accuracy',g.shots?Math.round(g.kills/g.shots*100)+'%':'-'],['Friendlies hit',g.blue],['Site damage',g.siteHits],['Sites standing',SITES.filter(s=>s.hp>0).length+' / 3'],['Waves',Math.min(3,g.wave+1)+' / 3']],
    text:(g.blue?'Identification matters as much as speed. Let the sweep classify a contact before you fire. ':'')+'Aetos is built around this loop: detect, identify, decide, act, with every track accounted for.'});
  A.dock(); trk.forEach(t=>t.style.display='none');
}
st.enter=function(){ st.abort(); st.setState('menu'); SITES.forEach(s=>s.hp=3); $('#aeBest').textContent='Best '+fmt(store.get('ae',0));
  for(let i=0;i<6;i++){ const d=spawn(Math.random()<.3?'friend':'scout'); if(d){ d.p.setLength(2+Math.random()*4); d.p.y=1.2+Math.random(); d.demo=true; } } };
st.exit=function(){ st.abort(); };
st.update=function(dt,t){
  const playing=st.state==='play'&&game;
  sw=(sw+dt*TAU/2.4)%TAU; sweepU.uSw.value=sw; if(sw<lastSw) A.ping(1318,playing?.04:.025); lastSw=sw;
  // game flow
  if(playing){ const g=game, W=WAVES[g.wave];
    if(g.inter>0){ g.inter-=dt; } else {
      g.wt+=dt; $('#aeWaveM').style.setProperty('--v',clamp(g.wt/W.dur,0,1));
      if(g.wt<W.dur){ g.spawnT-=dt; if(g.spawnT<=0){ g.spawnT=W.every*(.7+Math.random()*.6); let r=Math.random(),type='scout'; for(const [k,p] of W.mix){ if(r<p){type=k;break;} r-=p; }
          if(type==='swarm'){ const a=Math.random()*TAU; const c=new T.Vector3(Math.cos(a)*7.3,1.4,Math.sin(a)*7.3); const s0=spawn('swarm',a); for(let k=0;k<4;k++){ const s=spawn('swarm',a,c); if(s&&s0) s.site=s0.site; } } else spawn(type); } }
      else if(!drones.some(d=>!d.dead&&d.type!=='friend')||g.wt>W.dur+6){ if(g.wave<2){ g.wave++; g.wt=0; g.inter=2.4; showBanner(banner,'Wave '+(g.wave+1),WAVES[g.wave].name); A.alarm(); } else return end(); }
    }
    $('#aeWave').textContent=`Wave ${g.wave+1} / 3`; $('#aeScore').textContent=fmt(g.score);
    if(g.ammo<AMMO){ g.reload+=dt; if(g.reload>=1.25){ g.reload=0; g.ammo++; } }
    [...pips.children].forEach((p,i)=>p.classList.toggle('e',i>=g.ammo));
    if(g.jamCD>0) g.jamCD=Math.max(0,g.jamCD-dt); $('#aeJam').style.setProperty('--p',1-g.jamCD/10);
    if(g.jamT>=0){ g.jamT+=dt; const R=E.o(clamp(g.jamT/.75,0,1))*5; jamU.uR.value=R; jamU.uO.value=1-clamp((g.jamT-.5)/.6,0,1);
      drones.forEach(d=>{ if(d.dead||d.jamHit) return; const r=Math.hypot(d.p.x,d.p.z); if(r<R){ d.jamHit=true; if(d.type==='swarm'){ d.fall=true; d.cls='hos'; } else if(d.type!=='friend'){ d.jam=3.5; } } });
      if(g.jamT>1.3) g.jamT=-1; }
    if(SITES.every(s=>s.hp<=0)) return end();
  } else { jamU.uO.value=0; }
  // drones
  drones.forEach(d=>{
    if(d.dead) return;
    const T_=TYPES[d.type]; const spd=T_.spd*(d.jam>0?.3:1)*(playing?1+game.wave*.08:.35); d.jam=Math.max(0,d.jam-dt);
    if(d.fall){ d.vy-=6*dt; d.p.y+=d.vy*dt; if(d.p.y<=.05) kill(d,true); return; }
    if(d.type==='friend'){ V.copy(d.goal).sub(d.p); V.y=0; if(V.length()<.4||Math.hypot(d.p.x,d.p.z)>7.6&&d.seen>3){ d.dead=true; return; } V.normalize().multiplyScalar(spd*dt); d.p.add(V); d.seen+=dt; }
    else { const s=SITES[d.site]; V.copy(s.p).sub(d.p); V.y=0; const dist=V.length(); V.normalize();
      V2.set(-V.z,0,V.x).multiplyScalar(Math.sin(t*1.7+d.ph)*.45*clamp(dist/3,0,1)); d.p.addScaledVector(V,spd*dt).addScaledVector(V2,dt);
      d.p.y=damp(d.p.y,dist<2?.32:1.4,1.2,dt);
      if(d.demo&&Math.hypot(d.p.x,d.p.z)<1){ d.p.setLength(6.5); }
      if(!d.demo&&dist<.42&&d.p.y<.7&&s.hp>0){ d.dead=true; s.hp--; boom.emit(s.p.clone().setY(.3),90,3,COL.hos,1,1); smoke.emit(s.p.clone().setY(.3),40,.6,null,1.2,2.2); A.alarm(); A.pop(); feedback(.5,1,new T.Color(.18,0,0));
        if(game){ game.score-=150; game.siteHits++; } if(s.hp<=0) s.mesh.material.uniforms.uC.value.set('#FF5636'); } }
    // the sweep identifies contacts
    if(d.cls==='unk'){ const a=Math.atan2(d.p.z,d.p.x); const df=((sw-a)%TAU+TAU)%TAU; if(df<TAU/2.4*dt*1.6+.02){ d.cls=d.type==='friend'?'fri':'hos'; if(playing) A.beep(d.cls==='fri'?520:1040); } }
  });
  // missiles
  miss.forEach((m,i)=>{ if(!m.on){ missP[i*3+1]=999; return; }
    m.life-=dt; let tg=m.tgt; if(!tg||tg.dead||tg.fall){ tg=null; let bd=3; drones.forEach(d=>{ if(d.dead||d.fall||d.cls==='fri') return; const dd=d.p.distanceTo(m.p); if(dd<bd){bd=dd;tg=d;} }); m.tgt=tg; }
    if(tg){ V.copy(tg.p).sub(m.p); const dist=V.length(); V.normalize().multiplyScalar(10); m.v.lerp(V,1-Math.exp(-7*dt)); if(dist<.3){ m.on=false; tg.hp--; tg.lock=false; if(tg.hp<=0) kill(tg); else { boom.emit(tg.p,20,1.5,COL.hos,0,.5); A.blip(); } } }
    m.p.addScaledVector(m.v,dt); smoke.emit(m.p,2,.15,null,.2,.7); if(m.life<=0){ m.on=false; boom.emit(m.p,12,1,null,0,.4); }
    missP[i*3]=m.p.x; missP[i*3+1]=m.p.y; missP[i*3+2]=m.p.z; });
  for(let i=miss.length;i<MAXM;i++) missP[i*3+1]=999;
  missG.attributes.position.needsUpdate=true;
  drones=drones.filter(d=>!d.dead);
  // write instances, nav lights, brackets
  let tk=0; const live=playing||st.state==='menu';
  for(let i=0;i<MAXD;i++){ const d=drones[i];
    if(!d||!live){ M4.makeScale(0,0,0); inst.setMatrixAt(i,M4); navP[i*3+1]=999; continue; }
    const s=TYPES[d.type].sc; Qn.setFromAxisAngle(YAX,t*.4+d.ph); SCL.set(s,s,s); M4.compose(d.p,Qn,SCL); inst.setMatrixAt(i,M4); inst.setColorAt(i,COL[d.cls]);
    navP[i*3]=d.p.x; navP[i*3+1]=d.p.y+.06; navP[i*3+2]=d.p.z; navB[i]=(Math.sin(t*8+d.ph*3)>.3?1.3:.25)*(d.cls==='hos'?1.4:1);
    if(playing&&tk<trk.length){ const e=trk[tk++]; V.copy(d.p).project(stCam); e.style.display=''; e.className='trk '+d.cls+(d.lock?' lock':''); e.style.transform=`translate(${(V.x*.5+.5)*innerWidth}px,${(-V.y*.5+.5)*innerHeight}px)`;
      e.firstChild.textContent=`TRK-${String(d.id).padStart(3,'0')} ${d.cls==='unk'?'UNK':d.cls==='fri'?'FRD':TYPES[d.type].label}`; }
  }
  for(;tk<trk.length;tk++) trk[tk].style.display='none';
  inst.instanceMatrix.needsUpdate=true; if(inst.instanceColor) inst.instanceColor.needsUpdate=true; navG.attributes.position.needsUpdate=true; navG.attributes.aB.needsUpdate=true;
  // track table at 8 Hz
  tableT-=dt; if(playing&&tableT<=0){ tableT=.12; const rows=drones.filter(d=>!d.fall).sort((a,b)=>Math.hypot(a.p.x,a.p.z)-Math.hypot(b.p.x,b.p.z)).slice(0,8);
    table.innerHTML=rows.map(d=>`<tr class="${d.cls}"><td>TRK-${String(d.id).padStart(3,'0')}</td><td>${d.cls==='unk'?'UNKNOWN':d.cls==='fri'?'FRIEND':'HOSTILE'}</td><td>${(Math.hypot(d.p.x,d.p.z)*180).toFixed(0)} m</td><td>${d.jam>0?'JAMMED':d.lock?'ENGAGED':d.type==='friend'?'TRANSIT':d.cls==='hos'?SITES[d.site].name.split(' ')[0].toUpperCase():'TRACKING'}</td></tr>`).join('');
    $('#aeCount').textContent=drones.length+' active'; }
  // sites
  SITES.forEach((s,i)=>{ V.copy(s.p).project(stCam); const e=siteEls[i]; e.style.transform=`translate(${(V.x*.5+.5)*innerWidth}px,${(-V.y*.5+.5)*innerHeight}px) translate(-50%,30px)`; e.classList.toggle('dead',s.hp<=0);
    [...e.querySelectorAll('.hp i')].forEach((p,k)=>p.classList.toggle('x',k>=s.hp)); e.style.opacity=st.state==='res'?0:1;
    s.mesh.position.y=.12+(s.hp>0?0:-.08); if(s.hp<=0&&Math.random()<dt*8) smoke.emit(s.p.clone().setY(.25),1,.2,null,.8,2); });
  st.cp.rotation.y=t;
  boom.update(dt,1.5,1.8); smoke.update(dt,-.4,.8);
  const nar=NARROW(); st.camP.set(0,nar?13.5:9.4,nar?10.5:8.6); st.camL.set(nar?0:-.6,-.2,.5);
  cursorAim(playing&&FINE); if(!playing&&st.state==='menu'){ st.anchors=[STA_AE_A[0],STA_AE_A[1],STA_AE_A[2]]; notesUpdate(st); }
};
})();

/* ===== station ph ===== */
/* ================= PHAROS: LOST SIGNAL =================
   GPS is jammed. The drone's downward camera goes through Pharos's pipeline (raw, rectify, describe) and you do the match:
   find the view on the map. Trusted within 25 m. A confident GNSS fix may be spoofed. */
(()=>{
const st=mkStation('ph',{arrive:new T.Vector3(0,3,5)});
const sc=st.scene, MAP=1024, MPX=2000/MAP, FEED=150, PW=12;   // 2 km map, plane 12 world units wide
let mapC,edgeC,mapTex,edgeTex,u,plane,drone,game=null,rand=Math.random,feedCtx,stageT=0,stage=0,reveal_=null;
const feed=$('#phFeed'); feedCtx=feed.getContext('2d');
const marks=document.createElement('div'); $('.ghud',st.el).appendChild(marks);
const mk=(cls,html)=>{ const d=document.createElement('div'); d.className='ui s'; d.style.cssText='position:absolute;left:0;top:0;white-space:nowrap;pointer-events:none;'+cls; d.innerHTML=html; marks.appendChild(d); return d; };
const mClick=mk('color:var(--ink)','<span style="display:block;width:14px;height:14px;margin:-7px 0 0 -7px;border:1px solid currentColor;transform:rotate(45deg)"></span>');
const mTrue=mk('color:var(--acc)','<span style="display:block;width:18px;height:18px;margin:-9px 0 0 -9px;border:1px solid currentColor;border-radius:50%"></span><span style="position:absolute;left:14px;top:-6px">Truth</span>');
const mSpoof=mk('color:var(--alarm)','<span style="display:block;width:10px;height:10px;margin:-5px 0 0 -5px;background:currentColor"></span><span style="position:absolute;left:12px;top:-6px">GNSS · ±3 m</span>');
[mClick,mTrue,mSpoof].forEach(m=>m.style.display='none');
const svgNS='http://www.w3.org/2000/svg'; const errSvg=document.createElementNS(svgNS,'svg'); errSvg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible'; const errLine=document.createElementNS(svgNS,'line'); errLine.setAttribute('stroke','#FFD5B3'); errLine.setAttribute('stroke-dasharray','4 4'); errSvg.appendChild(errLine); marks.appendChild(errSvg); errSvg.style.display='none';

/* ---------- an Irish landscape, generated ---------- */
function genMap(seed){
  rand=seeded(seed); const R=rand;
  mapC=mapC||document.createElement('canvas'); mapC.width=mapC.height=MAP; const x=mapC.getContext('2d');
  x.fillStyle='#4b5a3c'; x.fillRect(0,0,MAP,MAP);
  // fields: a warped grid of irregular quads
  const NG=9, V=[]; for(let j=0;j<=NG;j++){ V[j]=[]; for(let i=0;i<=NG;i++){ const e=i===0||i===NG||j===0||j===NG; V[j][i]=[i/NG*MAP+(e?0:(R()-.5)*70),j/NG*MAP+(e?0:(R()-.5)*70)]; } }
  const tones=['#5d6b43','#6e7a4a','#7a7650','#56623f','#8a8358','#66704a','#4f5e3d','#77754e','#6c6340','#83804f'];
  for(let j=0;j<NG;j++) for(let i=0;i<NG;i++){
    const q=[V[j][i],V[j][i+1],V[j+1][i+1],V[j+1][i]]; // split some cells in two
    const polys=R()<.45?(R()<.5?[[q[0],q[1],q[2]],[q[0],q[2],q[3]]]:[[q[0],q[1],q[3]],[q[1],q[2],q[3]]]):[q];
    polys.forEach(pp=>{ x.beginPath(); pp.forEach((p,k)=>k?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.closePath(); x.fillStyle=tones[(R()*tones.length)|0]; x.fill();
      if(R()<.4){ x.save(); x.clip(); const a=R()*Math.PI; x.strokeStyle='rgba(30,35,20,.22)'; x.lineWidth=2; const cx=pp[0][0],cy=pp[0][1]; for(let k=-30;k<30;k++){ x.beginPath(); x.moveTo(cx+Math.cos(a)*-400-Math.sin(a)*k*7,cy+Math.sin(a)*-400+Math.cos(a)*k*7); x.lineTo(cx+Math.cos(a)*400-Math.sin(a)*k*7,cy+Math.sin(a)*400+Math.cos(a)*k*7); x.stroke(); } x.restore(); }
      if(R()<.12){ x.save(); x.clip(); x.fillStyle='#6b5536'; for(let k=0;k<40;k++){ x.beginPath(); x.arc(pp[0][0]+(R()-.3)*120,pp[0][1]+(R()-.3)*120,6+R()*22,0,TAU); x.fill(); } x.restore(); } });
    // hedgerows
    x.strokeStyle='#2c3a24'; x.lineWidth=4; x.beginPath(); q.forEach((p,k)=>k?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.closePath(); x.stroke();
    x.fillStyle='#22301c'; for(let k=0;k<4;k++){ const a=q[k], b=q[(k+1)%4]; for(let m=0;m<8;m++){ if(R()<.5) continue; const t=R(); x.beginPath(); x.arc(lerp(a[0],b[0],t),lerp(a[1],b[1],t),3+R()*5,0,TAU); x.fill(); } }
  }
  // woodland
  for(let w=0;w<5;w++){ const cx=R()*MAP, cy=R()*MAP; x.fillStyle='#24331f'; for(let k=0;k<160;k++){ x.beginPath(); x.arc(cx+gauss()*38,cy+gauss()*30,4+R()*7,0,TAU); x.fill(); } }
  // river
  const river=[]; let ry=R()*MAP*.6+MAP*.2, rx=-20; while(rx<MAP+20){ river.push([rx,ry]); rx+=34; ry+=(R()-.5)*60+Math.sin(rx*.01)*12; }
  const smooth=(pts_,w,c)=>{ x.strokeStyle=c; x.lineWidth=w; x.lineCap='round'; x.lineJoin='round'; x.beginPath(); x.moveTo(pts_[0][0],pts_[0][1]); for(let k=1;k<pts_.length-1;k++){ const mx=(pts_[k][0]+pts_[k+1][0])/2, my=(pts_[k][1]+pts_[k+1][1])/2; x.quadraticCurveTo(pts_[k][0],pts_[k][1],mx,my); } x.stroke(); };
  smooth(river,18,'#2a3328'); smooth(river,11,'#3f5560');
  // roads: two through-roads and a track
  const road=(a,b,wob)=>{ const p=[]; for(let k=0;k<=14;k++){ const t=k/14; p.push([lerp(a[0],b[0],t)+(k&&k<14?(R()-.5)*wob:0),lerp(a[1],b[1],t)+(k&&k<14?(R()-.5)*wob:0)]); } return p; };
  const r1=road([0,R()*MAP],[MAP,R()*MAP],70), r2=road([R()*MAP,0],[R()*MAP,MAP],70), r3=road([R()*MAP*.5,MAP],[MAP,R()*MAP*.5],50);
  [r1,r2].forEach(r=>{ smooth(r,11,'#2b2a26'); smooth(r,8,'#9a968a'); }); smooth(r3,5,'#8a7d62');
  // buildings: a village at the junction-ish, farmsteads along the roads
  const along=(r,t)=>{ const k=Math.min(13,Math.floor(t*14)); return r[k]; };
  const house=(cx,cy,a,w,h)=>{ x.save(); x.translate(cx,cy); x.rotate(a); x.fillStyle='#1c1b19'; x.fillRect(-w/2+2,-h/2+2,w,h); x.fillStyle=R()<.5?'#b9b2a5':'#8d4b3a'; x.fillRect(-w/2,-h/2,w,h); x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(-w/2,0,w,h/2); x.restore(); };
  const v=along(r1,.3+R()*.4); for(let k=0;k<26;k++) house(v[0]+gauss()*40,v[1]+gauss()*26,R()<.7?0:Math.PI/2+R()*.2,10+R()*12,8+R()*9);
  for(let f=0;f<10;f++){ const rr=[r1,r2,r3][f%3], p=along(rr,R()); const a=R()*Math.PI; for(let k=0;k<3;k++) house(p[0]+20+gauss()*10,p[1]+gauss()*10,a,9+R()*14,7+R()*8); }
  // speckle
  const id=x.getImageData(0,0,MAP,MAP), dd=id.data; for(let i=0;i<dd.length;i+=4){ const n=(R()-.5)*18; dd[i]+=n; dd[i+1]+=n; dd[i+2]+=n; } x.putImageData(id,0,0);
  // describe: edge map (Sobel on luminance), the same representation Pharos matches on
  edgeC=edgeC||document.createElement('canvas'); edgeC.width=edgeC.height=MAP; const ex=edgeC.getContext('2d'); const out=ex.createImageData(MAP,MAP), od=out.data;
  const L=new Float32Array(MAP*MAP); for(let i=0;i<MAP*MAP;i++) L[i]=dd[i*4]*.3+dd[i*4+1]*.59+dd[i*4+2]*.11;
  for(let y=1;y<MAP-1;y++) for(let xx=1;xx<MAP-1;xx++){ const i=y*MAP+xx; const gx=-L[i-MAP-1]-2*L[i-1]-L[i+MAP-1]+L[i-MAP+1]+2*L[i+1]+L[i+MAP+1]; const gy=-L[i-MAP-1]-2*L[i-MAP]-L[i-MAP+1]+L[i+MAP-1]+2*L[i+MAP]+L[i+MAP+1];
    const m=clamp((Math.hypot(gx,gy)-40)*1.4,0,255); od[i*4]=m; od[i*4+1]=m*.86; od[i*4+2]=m*.72; od[i*4+3]=255; }
  ex.putImageData(out,0,0);
  if(mapTex){ mapTex.needsUpdate=true; edgeTex.needsUpdate=true; }
}
function edgeDensity(cx,cy){ const d=edgeC.getContext('2d').getImageData(cx-FEED/2,cy-FEED/2,FEED,FEED).data; let s=0; for(let i=0;i<d.length;i+=16) s+=d[i]; return s/(d.length/16)/255; }

st.build=function(){
  genMap(7);
  mapTex=new T.CanvasTexture(mapC); edgeTex=new T.CanvasTexture(edgeC); [mapTex,edgeTex].forEach(t=>{ t.anisotropy=4; t.colorSpace=T.SRGBColorSpace; });
  u={tMap:{value:mapTex},tEdge:{value:edgeTex},uC:{value:new T.Vector2(.5,.5)},uR:{value:0},uTime:G.uTime,uOn:{value:0},uDesc:{value:.65},uFoot:{value:new T.Vector3(0,0,0)}};
  plane=new T.Mesh(new T.PlaneGeometry(PW,PW),new T.ShaderMaterial({uniforms:u,
    vertexShader:`varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D tMap,tEdge; uniform vec2 uC; uniform float uR,uTime,uOn,uDesc; uniform vec3 uFoot; varying vec2 vUv; varying vec3 vW;
      void main(){ vec3 m=texture2D(tMap,vUv).rgb; float l=dot(m,vec3(.3,.59,.11)); vec3 photo=mix(vec3(l),m,.55)*.42;
        vec3 e=texture2D(tEdge,vUv).rgb; vec3 c=photo*(1.-uDesc*.55)+e*vec3(1.,.84,.7)*uDesc*.72;
        // lighthouse sweep
        vec2 q=vUv-vec2(-.1,1.1); float a=atan(q.y,q.x); float bm=pow(max(cos(a-(-.8+.45*sin(uTime*.35))),0.),160.); c+=vec3(1.,.84,.7)*bm*.07;
        // uncertainty circle
        float d=length((vUv-uC)); float ring=smoothstep(.0035,0.,abs(d-uR)); float dash=step(.5,fract(atan(vUv.y-uC.y,vUv.x-uC.x)*12.+uTime*.3));
        c+=vec3(1.,.84,.7)*ring*(.4+.6*dash)*uOn; c*=1.+.12*step(d,uR)*uOn;
        // camera footprint after reveal
        if(uFoot.z>0.){ vec2 fq=abs(vUv-uFoot.xy); float fe=max(fq.x,fq.y); c+=vec3(1.,.84,.7)*smoothstep(.003,0.,abs(fe-uFoot.z))*.9; }
        float v=smoothstep(.75,.35,length(vUv-.5)); c*=mix(.35,1.,v);
        gl_FragColor=vec4(c,1.); }`}));
  plane.rotation.x=-Math.PI/2; sc.add(plane);
  drone=new T.Group(); const body=new T.Mesh(new T.BoxGeometry(.22,.06,.22),LM('#FFD5B3',{emit:.3,rim:1})); drone.add(body);
  for(let k=0;k<4;k++){ const a=k*Math.PI/2+Math.PI/4; const r=new T.Mesh(new T.TorusGeometry(.09,.008,6,24),LM('#FFD5B3',{emit:.6})); r.rotation.x=Math.PI/2; r.position.set(Math.cos(a)*.2,.03,Math.sin(a)*.2); drone.add(r); }
  const cone=new T.Mesh(new T.ConeGeometry(.5,1.6,4,1,true),new T.MeshBasicMaterial({color:0xFFD5B3,transparent:true,opacity:.07,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false})); cone.position.y=-.8; cone.rotation.y=Math.PI/4; drone.add(cone);
  drone.position.set(0,1.7,0); sc.add(drone);
  sc.add(pts(cloud(Math.floor(2400*Q+400),(i,r,o)=>{o[0]=(r[0]-.5)*22;o[1]=.3+r[1]*4;o[2]=(r[2]-.5)*22;}),PM({size:.04,color:'#FFD5B3',body:'p.y+=sin(uTime*.3+aR.x*9.)*.2; b=.08;'})));
  st.anchors=[new T.Vector3(0,1.7,0),new T.Vector3(2.5,0,-1.5),new T.Vector3(-3,0,2)];
};
const px2w=(px,py)=>new T.Vector3((px/MAP-.5)*PW,0,(py/MAP-.5)*PW);
function drawFeed(){
  if(!game||!game.cur) return; const c=game.cur, w=feed.width, x=feedCtx;
  x.save(); x.fillStyle='#000'; x.fillRect(0,0,w,w); x.translate(w/2,w/2);
  const k=stage===0?0:clamp(stageT/.7,0,1), rot=c.head*(1-E.io(k)), sk=.35*(1-E.io(k));
  x.transform(1,0,sk*.2,1-sk*.3,0,0); x.rotate(rot); const s=w/FEED;
  const src=stage>=2?edgeC:mapC; const F2=FEED*1.5; x.drawImage(src,c.x-F2/2,c.y-F2/2,F2,F2,-w*.75,-w*.75,w*1.5,w*1.5);
  if(stage<2){ x.fillStyle='rgba(255,213,179,.06)'; x.fillRect(-w/2,-w/2,w,w); }
  x.restore();
  // lens vignette and noise on the raw feed
  if(stage<1){ const g=x.createRadialGradient(w/2,w/2,w*.2,w/2,w/2,w*.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.75)'); x.fillStyle=g; x.fillRect(0,0,w,w); }
  $$('.feed .stage span').forEach((s_,i)=>s_.classList.toggle('on',i===stage));
}
function pickSpot(){ let best=null; for(let k=0;k<26;k++){ const x=140+rand()*(MAP-280), y=140+rand()*(MAP-280); const e=edgeDensity(x,y); if(!best||e>best.e) best={x,y,e}; } return best; }
function newFix(){
  const g=game; g.r++; if(g.r>5) return end();
  const spot=pickSpot(); const ang=rand()*TAU, off=rand()*95+30; const R0=170+g.r*10;
  g.cur={x:spot.x,y:spot.y,head:(rand()-.5)*2.6,cx:clamp(spot.x+Math.cos(ang)*off,R0*.5,MAP-R0*.5),cy:clamp(spot.y+Math.sin(ang)*off,R0*.5,MAP-R0*.5),R:R0,t:0,clicked:false};
  g.spoof=g.r>=2?{x:clamp(g.cur.cx+(rand()-.5)*R0*1.1,40,MAP-40),y:clamp(g.cur.cy+(rand()-.5)*R0*1.1,40,MAP-40)}:null;
  if(g.spoof&&Math.hypot(g.spoof.x-spot.x,g.spoof.y-spot.y)<90){ g.spoof.x=clamp(spot.x+(spot.x<MAP/2?1:-1)*160,40,MAP-40); }
  stage=0; stageT=0; reveal_=null; u.uFoot.value.set(0,0,0); [mClick,mTrue].forEach(m=>m.style.display='none'); errSvg.style.display='none';
  mSpoof.style.display=g.spoof?'':'none';
  $('#phRound').textContent=`Fix ${g.r} / 5`; $('#phHelp').textContent=g.r===1?'Watch the pipeline, then click where the camera is looking':'GNSS says it knows where you are. Does it?';
  showBanner($('#phBanner'),`Fix ${g.r}`,g.r===1?'GPS jammed':'Dead reckoning');
  A.ping(988,.04);
}
st.onPointer=function(e){
  if(st.state!=='play'||!game||!game.cur||game.cur.clicked||stage<3) return;
  const ray=new T.Raycaster(); ray.setFromCamera({x:e.clientX/innerWidth*2-1,y:-(e.clientY/innerHeight*2-1)},stCam); const hit=ray.intersectObject(plane)[0]; if(!hit) return;
  const px=(hit.point.x/PW+.5)*MAP, py=(hit.point.z/PW+.5)*MAP; const c=game.cur; c.clicked=true; c.px=px; c.py=py;
  const err=Math.hypot(px-c.x,py-c.y)*MPX, spoofed=game.spoof&&Math.hypot(px-game.spoof.x,py-game.spoof.y)*MPX<60;
  const tf=Math.max(.3,1-c.t/25); let pts_=0, g_='';
  if(spoofed){ g_='Spoofed'; game.spoofed++; pts_=-300; A.buzz(); feedback(.3,.8,new T.Color(.14,0,0)); }
  else if(err<25){ g_='Trusted'; pts_=Math.round(1000*tf); game.trusted++; A.chord(); S.flash=Math.max(S.flash,.12); }
  else if(err<70){ g_='Close'; pts_=Math.round(420*tf); game.close++; A.chime(6); }
  else { g_='Wrong'; game.wrong++; A.buzz(); }
  game.score=Math.max(0,game.score+pts_); game.errs.push(err); $('#phScore').textContent=fmt(game.score);
  reveal_={t:0,err,g:g_}; u.uFoot.value.set(c.x/MAP,1-c.y/MAP,FEED/MAP*.5);
  popAt($('#phPops'),px2w(c.x,c.y),`${g_} · ${Math.round(err)} m`,g_==='Trusted'?'big':g_==='Close'?'':'bad');
  $('#phHelp').textContent=g_==='Spoofed'?'That fix was spoofed. A confident receiver is not the same as a correct one.':g_==='Trusted'?'Within 25 m. Pharos would trust that.':`${Math.round(err)} m off.`;
};
st.play=function(){ genMap((Math.random()*1e9)|0); rand=seeded((Math.random()*1e9)|0); game={r:0,score:0,trusted:0,close:0,wrong:0,spoofed:0,errs:[]}; $('#phScore').textContent='0'; st.setState('play'); u.uOn.value=1; newFix(); };
st.abort=function(){ game=null; u&&(u.uOn.value=0); [mClick,mTrue,mSpoof].forEach(m=>m.style.display='none'); errSvg.style.display='none'; };
function end(){
  const g=game; game=null; u.uOn.value=0; [mClick,mTrue,mSpoof].forEach(m=>m.style.display='none'); errSvg.style.display='none';
  const med=g.errs.slice().sort((a,b)=>a-b)[2]||0;
  const grade=g.spoofed?'Fooled by a spoof':g.trusted>=4?'Trusted':g.trusted+g.close>=3?'Holding position':'Lost';
  st.result({grade,score:g.score,stats:[['Trusted fixes',g.trusted+' / 5'],['Close',g.close],['Wrong',g.wrong],['Spoofs believed',g.spoofed],['Median error',Math.round(med)+' m'],['Map','2 km, edge matched']],
    text:'Pharos does this match on every frame with FFT cross-correlation, on a laptop CPU. On a real 13 minute flight it was trusted within 25 m 92% of the time, and never trusted a wrong position.'});
  A.dock();
}
st.enter=function(){ st.abort(); st.setState('menu'); $('#phBest').textContent='Best '+fmt(store.get('ph',0)); };
st.exit=function(){ st.abort(); };
st.update=function(dt,t){
  const nar=NARROW();
  if(game&&game.cur){ const c=game.cur;
    if(stage<3){ stageT+=dt; const dur=[.9,.9,.6][stage]; if(stageT>dur){ stage++; stageT=0; A.blip(); if(stage===3) $('#phHelp').textContent='Click where the camera is looking'; } }
    if(!c.clicked&&stage>=3){ c.t+=dt; c.R+=dt*7; }
    u.uC.value.set(c.cx/MAP,1-c.cy/MAP); u.uR.value=c.R/MAP; $('#phUnc').textContent='± '+Math.round(c.R*MPX)+' m';
    drawFeed();
    const est=px2w(c.cx,c.cy); if(!reveal_) drone.position.lerp(new T.Vector3(est.x,1.7,est.z),1-Math.exp(-3*dt));
    if(reveal_){ reveal_.t+=dt; const tw=px2w(c.x,c.y); drone.position.lerp(new T.Vector3(tw.x,1.5,tw.z),1-Math.exp(-5*dt));
      const pc=proj(px2w(c.px,c.py),stCam), pt=proj(tw,stCam); mClick.style.display=mTrue.style.display=''; errSvg.style.display='';
      mClick.style.transform=`translate(${pc.x}px,${pc.y}px)`; mTrue.style.transform=`translate(${pt.x}px,${pt.y}px)`;
      errLine.setAttribute('x1',pc.x); errLine.setAttribute('y1',pc.y); errLine.setAttribute('x2',pt.x); errLine.setAttribute('y2',pt.y);
      if(reveal_.t>2.3){ newFix(); } }
    if(game&&game.spoof){ const ps=proj(px2w(game.spoof.x,game.spoof.y),stCam); mSpoof.style.transform=`translate(${ps.x}px,${ps.y}px)`; }
  } else { drone.position.set(Math.sin(t*.3)*2,1.7+Math.sin(t*1.3)*.05,Math.cos(t*.4)*1.5); }
  drone.rotation.y=t*.4; u.uDesc.value=damp(u.uDesc.value,game?.75:.55,2,dt);
  st.camP.set(nar?0:1.4,nar?11.5:7.6,nar?9:6.6); st.camL.set(nar?0:-1.1,0,nar?.6:.3);
  if(st.state==='menu') notesUpdate(st);
};
})();

/* ===== station og ===== */
/* ================= OGIVE: APOGEE =================
   Design on an OpenRocket-style side view: drag the nose and fins, trim with ballast, watch CG and CP.
   Then fly it. Hit the target altitude in three flights and open the chute at the top. */
(()=>{
const st=mkStation('og',{arrive:new T.Vector3(-1.5,1.5,7)});
const sc=st.scene, el=st.el, S6=6, SC=.035, WIND=3.5, Dm=.066, R0=Dm/2, LB=.62, TAIL=-3.1;
const MOT={F:{I:40,tb:1.4,mp:.055,mm:.095},G:{I:58,tb:1.7,mp:.09,mm:.15},H:{I:80,tb:2.0,mp:.13,mm:.21}};
let d={motor:'G',LD:2.5,fin:1,bal:0}, target=280, tries=0, F=null, assisted=false, busy=false, phase='design', tw=0, landT=0, last=null;
let rocket,body,fins=[],chute,ex,trailG,tP,tI=0,ringU,ladder,launchCtl;
function geom(dd){ const Ln=dd.LD*Dm, fs=dd.fin; return {Ln,fs,Cr:.09*fs,Ct:.045*fs,s:.075*fs,Xr:.045*fs,L:Ln+LB}; }
function design(dd){ const M=MOT[dd.motor], g=geom(dd);
  const ms=[[.03+.16*g.Ln,.62*g.Ln],[.24,g.Ln+LB/2],[.03*g.fs*g.fs,g.Ln+LB-g.Cr*.55],[.05,g.Ln+.12],[M.mm,g.Ln+LB-.06],[dd.bal,.45*g.Ln]];
  const m=ms.reduce((a,x)=>a+x[0],0), cg=ms.reduce((a,x)=>a+x[0]*x[1],0)/m;
  const Lf=Math.sqrt(g.s*g.s+Math.pow(g.Xr+g.Ct/2-g.Cr/2,2));
  const CNf=(1+R0/(g.s+R0))*(16*Math.pow(g.s/Dm,2))/(1+Math.sqrt(1+Math.pow(2*Lf/(g.Cr+g.Ct),2)));
  const Xb=g.Ln+LB-g.Cr, Xf=Xb+(g.Xr/3)*(g.Cr+2*g.Ct)/(g.Cr+g.Ct)+(1/6)*((g.Cr+g.Ct)-g.Cr*g.Ct/(g.Cr+g.Ct));
  const cp=(2*.466*g.Ln+CNf*Xf)/(2+CNf);
  return {M,g,dry:m-M.mm,mass:m,cg,cp,stab:(cp-cg)/Dm,Cd:.32+.13*(4-dd.LD)/2.5+.16*(g.fs-.6)}; }
function thrustAt(m,t){ const M=MOT[m], avg=M.I/M.tb; if(t<0||t>M.tb) return 0; const x=t/M.tb; if(x<.08) return avg*1.7*x/.08; if(x<.25) return lerp(avg*1.7,avg*.95,(x-.08)/.17); if(x<.88) return avg*.95; return lerp(avg*.95,0,(x-.88)/.12); }
function newF(dd,sign){ const D=design(dd); return {t:0,x:0,h:0,vx:0,vy:0,th:0,om:0,m:D.mass,D,d:{...dd},apo:0,tApo:0,maxV:0,maxA:0,tumble:false,chute:false,torn:false,landed:false,lifted:false,sign:sign||1,deployT:-1,auto:false}; }
function stepF(f,h){
  const D=f.D, Th=thrustAt(f.d.motor,f.t); f.m=D.mass-D.M.mp*clamp(f.t/D.M.tb,0,1);
  const rvx=f.vx-WIND, rvy=f.vy, rv=Math.hypot(rvx,rvy)||1e-6, v=Math.hypot(f.vx,f.vy);
  if(!f.chute&&f.lifted&&f.h>1.5){ if(D.stab<1){ f.om+=(1-D.stab)*4*h*f.sign; f.th+=f.om*h; if(Math.abs(f.th)>1.3) f.tumble=true; }
    else { const aoa=Math.atan2(rvx,Math.max(rvy,.5)); const k=Math.min(8,D.stab*1.3)*clamp(rv/30,0,1); f.th+=(aoa-f.th)*Math.min(1,k*h); f.th=clamp(f.th,-1.2,1.2); } }
  let Cd=D.Cd, Ar=Math.PI*R0*R0; if(f.tumble) Cd=1.1; if(f.chute){ Cd=1.5; Ar=f.torn?.05:.5; }
  const rho=1.225*Math.exp(-f.h/8500), Fd=.5*rho*Cd*Ar*rv*rv, dir=f.tumble?f.t*9:f.th;
  let ax=(-Fd*rvx/rv+Th*Math.sin(dir))/f.m, ay=(-Fd*rvy/rv+Th*Math.cos(dir))/f.m-9.81;
  if(!f.lifted){ if(ay<=0){ f.t+=h; return; } ax=0; } if(f.h<1.5&&!f.chute) ax=0;
  f.vx+=ax*h; f.vy+=ay*h; f.x+=f.vx*h; f.h+=f.vy*h; f.t+=h; f.acc=Math.hypot(ax,ay+9.81);
  if(f.h>.3) f.lifted=true; f.maxV=Math.max(f.maxV,v); f.maxA=Math.max(f.maxA,f.acc);
  if(f.lifted&&f.apo===0&&f.vy<=0){ f.apo=f.h; f.tApo=f.t; }
  if(f.lifted&&f.h<=0){ f.h=0; f.landed=true; } }
function simApo(dd){ const f=newF(dd,1); for(let i=0;i<8000;i++){ stepF(f,.01); if(f.apo>0||f.landed) break; } return f.apo; }

/* ---------- the rocket, rebuilt from the design ---------- */
const matB=LM('#FFB475',{emit:.05,rim:1.1,amb:.12,key:'#FFE6CC'}), matF=LM('#FFB475',{emit:.03,rim:.9,amb:.1,key:'#FFE6CC'});
const wire=new T.LineBasicMaterial({color:0xFFB475,transparent:true,opacity:.35,blending:T.AdditiveBlending});
function rebuild(){
  const g=geom(d); if(body){ rocket.remove(body); body.geometry.dispose(); } fins.forEach(f=>{ rocket.remove(f); f.geometry.dispose(); }); fins=[];
  const prof=[], L=g.Ln, rho=(R0*R0+L*L)/(2*R0);
  prof.push(new T.Vector2(0,0)); prof.push(new T.Vector2(R0*S6*.92,0)); prof.push(new T.Vector2(R0*S6,.02*S6));
  prof.push(new T.Vector2(R0*S6,LB*S6));
  for(let k=1;k<=28;k++){ const x=L*(1-k/28); const r=Math.sqrt(Math.max(rho*rho-Math.pow(L-x,2),0))+R0-rho; prof.push(new T.Vector2(Math.max(r,0)*S6,(LB+(L-x))*S6)); }
  body=new T.Mesh(new T.LatheGeometry(prof,48),matB); rocket.add(body);
  const shp=new T.Shape(); shp.moveTo(0,g.Cr*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr)*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr-g.Ct)*S6); shp.lineTo(0,0); shp.closePath();
  const fg=new T.ExtrudeGeometry(shp,{depth:.025,bevelEnabled:false}); fg.translate(R0*S6*.96,0,-.0125);
  for(let k=0;k<4;k++){ const m=new T.Mesh(fg,matF); m.rotation.y=k*Math.PI/2+Math.PI; rocket.add(m); fins.push(m); }
  const edges=new T.LineSegments(new T.EdgesGeometry(body.geometry,30),wire); body.add(edges);
  chute.position.y=(g.L+.25)*S6;
}
st.build=function(){
  // blueprint plane behind the design view, a dotted ground for the flight
  sc.add(pts(cloud(Math.floor(9000*Q+3000),(i,r,o)=>{ const gx=Math.round((r[0]-.5)*40/.5)*.5, gy=Math.round((r[1]-.5)*20/.5)*.5; o[0]=gx; o[1]=gy; o[2]=-2.5; }),PM({size:.03,color:'#FFB475',body:'b=.12*smoothstep(14.,4.,length(p.xy));'})));
  sc.add(pts(cloud(Math.floor(26000*Q+6000),(i,r,o)=>{const gx=(r[0]-.5)*160,gz=(r[1]-.5)*160;o[0]=Math.round(gx/2)*2+(r[2]<.5?(r[3]-.5)*2:0);o[2]=Math.round(gz/2)*2+(r[2]>=.5?(r[3]-.5)*2:0);o[1]=-.02;}),
    PM({size:.05,color:'#FFB475',uniforms:{uOn:{value:0}},decl:'uniform float uOn;',body:'b=.14*smoothstep(80.,8.,length(p.xz))*uOn;'})));
  st.groundU=sc.children[sc.children.length-1].material.uniforms;
  sc.add(pts(cloud(2400,(i,r,o)=>{o[0]=.32+gauss()*.008;o[1]=r[0]*2.8;o[2]=gauss()*.008;}),PM({size:.03,color:'#FFFFFF',uniforms:{uOn:st.groundU.uOn},decl:'uniform float uOn;',body:'b=.3*uOn;'})));
  // altitude ladder with labels every 50 m
  ladder=new T.Group(); sc.add(ladder);
  ladder.add(pts(cloud(Math.floor(8000*Q+2000),(i,r,o)=>{const m=r[0]*520; const tick=Math.abs(m/50-Math.round(m/50))<.02; o[0]=-4.2+(tick?(r[1]-.5)*.8:gauss()*.01); o[1]=m*SC; o[2]=-1.5;}),PM({size:.035,color:'#FFE0C8',body:'b=.22;'})));
  for(let m=50;m<=500;m+=50){ const c=document.createElement('canvas'); c.width=160; c.height=48; const x=c.getContext('2d'); x.font='34px "Departure Mono", monospace'; x.fillStyle='#FFE0C8'; x.fillText(m+' m',4,36);
    const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,opacity:.55,depthWrite:false})); sp.position.set(-5.4,m*SC,-1.5); sp.scale.set(1.1,.33,1); ladder.add(sp); }
  ladder.visible=false;
  rocket=new T.Group(); sc.add(rocket);
  chute=pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{const a=r[0]*TAU,e=r[1]*Math.PI*.45,R=2.2;o[0]=Math.cos(a)*Math.sin(e)*R;o[1]=Math.cos(e)*R*.75;o[2]=Math.sin(a)*Math.sin(e)*R;if(r[2]<.2){const k=r[3];o[0]*=k;o[1]=lerp(-1.6,o[1],k);o[2]*=k;}}),PM({size:.035,color:'#FFE0CF',body:'b=.6;'}));
  chute.visible=false; rocket.add(chute);
  rebuild();
  ex=Burst(sc,Math.floor(5000*Q+800),'#FFCF9E',.12);
  tP=new Float32Array(900*3); trailG=new T.BufferGeometry(); trailG.setAttribute('position',new T.BufferAttribute(tP,3)); trailG.setDrawRange(0,0);
  const tl=new T.Line(trailG,new T.LineBasicMaterial({color:0xFFB475,transparent:true,opacity:.5,blending:T.AdditiveBlending})); tl.frustumCulled=false; sc.add(tl);
  ringU={uY:{value:target*SC},uHit:{value:0},uOn:{value:0}};
  sc.add(pts(cloud(2400,(i,r,o)=>{const a=r[0]*TAU,R=2.6+gauss()*.03;o[0]=Math.cos(a)*R;o[1]=0;o[2]=Math.sin(a)*R;}),PM({size:.05,color:'#FFB475',uniforms:ringU,decl:'uniform float uY,uHit,uOn;',
    body:'p.y=uY; p.xz*=1.+uHit*.4; float a=atan(p.z,p.x); b=(.55+.45*step(.5,fract(a*6.+uTime*.6))+uHit*2.)*uOn;'})));
  st.anchors=[new T.Vector3(0,0,0),new T.Vector3(0,0,0),new T.Vector3(0,0,0)];
};
const hN=$('#ogHN'), hF=$('#ogHF'), cgEl=$('#ogCG'), cpEl=$('#ogCP'), dim=$('#ogDim'), stabL=$('#ogStabL');
function axisWorld(fromTip){ const g=geom(d); return rocket.localToWorld(new T.Vector3(0,(g.L-fromTip)*S6,0)); }
function syncUI(){
  const D=design(d); $('#ogStab').textContent=D.stab.toFixed(2)+' cal';
  const w=D.stab<1?['Unstable','var(--alarm)']:D.stab>2.6?['Overstable','var(--acc)']:['Stable','var(--ink)']; $('#ogStabW').textContent=w[0]; $('#ogStab').style.color=w[1];
  $('#ogMass').textContent=`Mass ${D.mass.toFixed(2)} kg · Cd ${D.Cd.toFixed(2)}`; $('#ogBal').textContent=Math.round(d.bal*1000)+' g';
  $$('#ogMotor button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===d.motor));
  $('#ogNoseNote').innerHTML=`<b>Tangent ogive</b>L/D ${d.LD.toFixed(2)} · fins ${Math.round(d.fin*100)}% · ${D.stab.toFixed(2)} cal`;
}
function placeMarkers(){
  if(phase!=='design') return; rocket.updateMatrixWorld(); const D=design(d), g=D.g;
  const pcg=proj(axisWorld(D.cg),stCam), pcp=proj(axisWorld(D.cp),stCam);
  const off=Math.max(40,Math.abs(proj(rocket.localToWorld(new T.Vector3(0,0,(R0+g.s)*S6)),stCam).y-pcg.y)*0+64);
  cgEl.style.transform=`translate(${pcg.x}px,${pcg.y+off}px) translate(-50%,-50%)`; cpEl.style.transform=`translate(${pcp.x}px,${pcp.y+off}px) translate(-50%,-50%)`;
  const x0=Math.min(pcg.x,pcp.x), x1=Math.max(pcg.x,pcp.x); dim.style.transform=`translate(${x0}px,${pcg.y+off-22}px)`; dim.style.width=(x1-x0)+'px';
  stabL.style.transform=`translate(${(pcg.x+pcp.x)/2}px,${pcg.y+off+14}px) translate(-50%,0)`;
  const tip=proj(rocket.localToWorld(new T.Vector3(0,g.L*S6,0)),stCam); hN.style.transform=`translate(${tip.x}px,${tip.y}px)`;
  const ft=proj(rocket.localToWorld(new T.Vector3(-(R0*.96+g.s)*S6,(g.Cr-g.Xr)*S6,0)),stCam); hF.style.transform=`translate(${ft.x}px,${ft.y}px)`;
  st.anchors[0].copy(axisWorld(g.Ln*.3)); st.anchors[1].copy(axisWorld(D.cp)); st.anchors[2].copy(axisWorld(g.L-.05));
}
function wpp(){ const dist=stCam.position.distanceTo(st.camL); return 2*dist*Math.tan(stCam.fov*Math.PI/360)/innerHeight; }
function dragHandle(h,apply){ let drag=null;
  h.addEventListener('pointerdown',e=>{ if(phase!=='design'||busy||st.state!=='play') return; drag={x:e.clientX,y:e.clientY,d:{...d}}; h.classList.add('drag'); h.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
  h.addEventListener('pointermove',e=>{ if(!drag) return; apply(drag,(e.clientX-drag.x)*wpp(),-(e.clientY-drag.y)*wpp()); assisted=false; $('#ogAI').textContent=''; rebuild(); syncUI(); A.key(); });
  const up=()=>{ drag=null; h.classList.remove('drag'); }; h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up); }
dragHandle(hN,(g,dx)=>{ d.LD=clamp(g.d.LD+dx/S6/Dm,1.5,4); });
dragHandle(hF,(g,dx,dy)=>{ d.fin=clamp(g.d.fin+dy/(.075*S6),.6,1.5); });
$('#ogBm').addEventListener('click',()=>{ d.bal=Math.max(0,+(d.bal-.01).toFixed(3)); assisted=false; syncUI(); });
$('#ogBp').addEventListener('click',()=>{ d.bal=Math.min(.15,+(d.bal+.01).toFixed(3)); assisted=false; syncUI(); });
$$('#ogMotor button').forEach(b=>b.addEventListener('click',()=>{ d.motor=b.dataset.m; assisted=false; syncUI(); }));
$('#ogAsk').addEventListener('click',async()=>{
  if(busy||phase!=='design') return; busy=true; $('#ogAsk').disabled=true; const ai=$('#ogAI'); let best=null, n=0;
  const tryD=dd=>{ const s=design(dd).stab; if(s<1.3||s>2.6) return; n++; const apo=simApo(dd); const err=Math.abs(apo-target)+.5*Math.abs(dd.LD-d.LD)+2*Math.abs(dd.fin-d.fin); if(!best||err<best.err) best={dd:{...dd},apo,err}; };
  for(const m of ['F','G','H']){ for(let LD=1.5;LD<=4.001;LD+=.25) for(let fin=.6;fin<=1.501;fin+=.1) for(let bal=0;bal<=.1501;bal+=.01) tryD({motor:m,LD,fin,bal}); ai.textContent=`Ogive · evaluating ${fmt(n)} designs`; A.beep(660+n%5*80); await nextFrame(); }
  if(best){ const b0=best.dd; for(let LD=Math.max(1.5,b0.LD-.25);LD<=Math.min(4,b0.LD+.25)+.001;LD+=.05) for(let bal=Math.max(0,b0.bal-.02);bal<=Math.min(.15,b0.bal+.02)+.0001;bal+=.002) tryD({motor:b0.motor,LD,fin:b0.fin,bal}); }
  if(!best){ ai.textContent='No stable design reaches that altitude.'; busy=false; $('#ogAsk').disabled=false; return; }
  const from={...d}, to=best.dd, t0=performance.now(); d.motor=to.motor;
  await new Promise(res=>{ (function step(){ const k=E.io(clamp((performance.now()-t0)/900,0,1)); d.LD=lerp(from.LD,to.LD,k); d.fin=lerp(from.fin,to.fin,k); d.bal=lerp(from.bal,to.bal,k); rebuild(); syncUI(); if(k<1) requestAnimationFrame(step); else res(); })(); });
  assisted=true; A.chime(9);
  ai.textContent=`Ogive · ${fmt(n)} designs · ${to.motor} motor, L/D ${to.LD.toFixed(2)}, fins ${Math.round(to.fin*100)}%, ${Math.round(to.bal*1000)} g ballast · predicts ${Math.round(best.apo)} m · this flight counts as assisted`;
  busy=false; $('#ogAsk').disabled=false;
});
launchCtl=holdControl($('#ogHold'),1.1,()=>startLaunch(),{key:'Space',enabled:()=>S.stId==='og'&&S.mode==='station'&&st.state==='play'&&phase==='design'&&!busy,onProgress:p=>A.roar(p*.25)});
addEventListener('keydown',e=>{ if(S.stId!=='og'||S.mode!=='station'||e.code!=='Space'||e.repeat) return; if(F&&!F.chute&&F.lifted){ e.preventDefault(); deploy(); } });
st.onPointer=()=>{ if(F&&!F.chute&&F.lifted) deploy(); };
function deploy(auto){ if(!F||F.chute) return; F.chute=true; F.deployT=F.t; F.auto=!!auto; if(!auto&&F.vy>12){ F.torn=true; A.buzz(); feedback(.3,.8,new T.Color(.12,0,0)); } else A.pop(); chute.visible=true; chute.scale.setScalar(.01); }
function startLaunch(){ phase='tilt'; tw=0; el.classList.add('flying'); $('#ogAI').textContent=''; A.whoosh(true,1.2,.15); }
function launch(){ phase='flight'; F=newF(d,Math.random()<.5?-1:1); tI=0; trailG.setDrawRange(0,0); chute.visible=false; A.launch(); A.boom(); feedback(.45,.6); S.flash=Math.max(S.flash,.18); landT=0; ringU.uHit.value=0; }
function newTarget(){ target=Math.round((160+Math.random()*280)/10)*10; tries=0; last=null; ringU.uY.value=target*SC; $('#ogTarget').textContent=target+' m'; $('#ogLast').textContent=''; }
function toDesign(){ F=null; phase='untilt'; tw=0; chute.visible=false; A.roar(0); el.classList.remove('flying'); }
function finish(){
  const f=F; tries++; const err=Math.abs(f.apo-target), pct=err/target*100;
  const apoS=Math.max(0,Math.round(1000-pct*45)), dep=f.torn?0:f.auto?60:Math.max(0,Math.round(300-Math.abs(f.deployT-f.tApo)*260)); const total=apoS+dep;
  const grade=f.tumble?'It cartwheeled':f.torn?'Chute shredded':pct<2?'Bullseye':pct<5?'On target':pct<12?'Close':'Off target';
  const dt=f.deployT<0?0:f.deployT-f.tApo; last={apo:f.apo};
  $('#ogLast').textContent=`Last flight ${Math.round(f.apo)} m (${f.apo>=target?'+':'−'}${Math.round(err)})`;
  $('#ogResEb').textContent=`Flight ${tries} / 3 · target ${target} m`;
  const tip=f.tumble?"Under 1 calibre the rocket can't keep its nose into the wind. Bigger fins or nose ballast.":f.D.stab>2.6?'Overstable rockets weathercock into the wind and lose height.':f.apo<target?'Undershot. More motor, a longer nose, or less mass.':'Overshot. Add ballast, shorten the nose, or step the motor down.';
  st.result({grade,score:total,assisted,stats:[['Apogee',Math.round(f.apo)+' m'],['Off target',Math.round(err)===0?'0 m':(f.apo>=target?'+':'−')+Math.round(err)+' m'],['Chute',f.torn?'Too fast':f.auto?'Auto, late':(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s'],['Max speed',Math.round(f.maxV)+' m/s'],['Peak accel',(f.maxA/9.81).toFixed(1)+' g'],['Stability',f.D.stab.toFixed(2)+' cal']],
    text:pct<2&&!f.tumble?'Within 2% of the target. Landing a design on a number is exactly what Ogive is for.':tip});
  $('#ogAgain').disabled=tries>=3; $('#ogAgain').textContent=tries>=3?'No flights left':`Adjust and fly again · ${3-tries} left`;
  if(pct<2) A.chord(); else A.dock();
}
$('#ogAgain').addEventListener('click',()=>{ toDesign(); $('#ogTries').textContent=`Flight ${tries+1} / 3`; st.setState('play'); });
$('#ogNewT').addEventListener('click',()=>{ toDesign(); newTarget(); assisted=false; $('#ogAI').textContent=''; $('#ogTries').textContent='Flight 1 / 3'; st.setState('play'); });
st.play=function(){ F=null; phase='design'; newTarget(); assisted=false; $('#ogTries').textContent='Flight 1 / 3'; $('#ogAI').textContent=''; syncUI(); rebuild(); el.classList.remove('flying'); st.setState('play'); launchCtl.reset(); };
st.abort=function(){ F=null; phase='design'; el.classList.remove('flying'); chute.visible=false; A.roar(0); launchCtl&&launchCtl.reset(); };
st.enter=function(){ st.abort(); st.setState('menu'); syncUI(); $('#ogBest').textContent='Best '+fmt(store.get('og',0)); };
st.exit=function(){ st.abort(); };
const camT=new T.Vector3(), designPos=new T.Vector3(TAIL,.2,0), padPos=new T.Vector3(0,0,0);
st.update=function(dt,t){
  const nar=NARROW(); const rd=S.rdt||dt;
  if(st.state==='play'&&phase==='design') launchCtl.tick(rd);
  // pose: horizontal for design, vertical on the pad, tweened between
  if(phase==='design'||st.state==='menu'){ rocket.rotation.set(0,0,-Math.PI/2); rocket.position.copy(designPos); if(st.state==='menu'){ rocket.rotation.x=Math.sin(t*.3)*.15; } rocket.scale.setScalar(1); }
  if(phase==='tilt'||phase==='untilt'){ tw+=rd; const k=E.io(clamp(tw/1.3,0,1)), kk=phase==='tilt'?k:1-k;
    rocket.rotation.set(0,0,-Math.PI/2*(1-kk)); rocket.position.lerpVectors(designPos,padPos,kk); rocket.scale.setScalar(lerp(1,.42,kk));
    st.groundU.uOn.value=kk; ringU.uOn.value=kk; ladder.visible=kk>.05;
    if(tw>=1.3){ if(phase==='tilt') launch(); else { phase='design'; st.groundU.uOn.value=0; ringU.uOn.value=0; ladder.visible=false; } } }
  if(phase==='flight'&&F){
    const sub=Math.max(1,Math.round(dt/.01)); for(let k=0;k<sub;k++) stepF(F,.01);
    if(!F.chute&&F.apo>0&&F.t>F.tApo+2.5) deploy(true);
    const th=thrustAt(F.d.motor,F.t); A.roar(th/60);
    rocket.position.set(F.x*SC*3,F.h*SC,0); rocket.rotation.set(0,0,F.tumble?F.t*9:F.chute?damp(rocket.rotation.z,.2,2,dt):-F.th);
    if(chute.visible) chute.scale.setScalar(damp(chute.scale.x,F.torn?.35:1,6,dt));
    if(th>0){ const n=Math.floor(110*Q*th/60)+3; for(let k=0;k<n;k++) ex.emit({x:rocket.position.x,y:rocket.position.y,z:0},1,1.2,null,-7,.9); }
    if(tI<900&&F.t*30>tI){ tP[tI*3]=rocket.position.x; tP[tI*3+1]=rocket.position.y+.15; tP[tI*3+2]=0; tI++; trailG.setDrawRange(0,tI); trailG.attributes.position.needsUpdate=true; }
    if(Math.abs(F.h-target)<8&&F.vy>0) ringU.uHit.value=1;
    $('#ogA').textContent=Math.round(F.h); $('#ogV').textContent=(F.vy>=0?'+':'−')+Math.abs(F.vy).toFixed(1)+' m/s'; $('#ogT').textContent='T+ '+F.t.toFixed(1)+' s';
    if(F.landed){ landT+=dt; if(landT<dt*1.5){ ex.emit({x:rocket.position.x,y:.1,z:0},60,2.5,new T.Color('#FFD9C4'),1,1); A.pop(); } if(landT>1.3){ finish(); phase='landed'; } } else if(F.t>70) F.landed=true;
  }
  ringU.uHit.value=damp(ringU.uHit.value,0,1.5,dt); ex.update(dt,-2,1.2);
  // cameras
  if(phase==='flight'||phase==='landed'){ const ry=rocket.position.y, rx=rocket.position.x; st.camP.set(rx-4.4,Math.max(2.4,ry*.9+2),(nar?17:12)+Math.min(14,ry*.12)); camT.set(rx+(nar?0:1),lerp(ry+1.2,ringU.uY.value,.25),0); st.camL.copy(camT); }
  else if(phase==='tilt'||phase==='untilt'){ const k=phase==='tilt'?E.io(clamp(tw/1.3,0,1)):1-E.io(clamp(tw/1.3,0,1)); st.camP.set(lerp(0,-4,k),lerp(.8,2.6,k),lerp(nar?15:9.2,nar?17:12,k)); st.camL.set(lerp(0,.6,k),lerp(.1,2.2,k),0); }
  else { st.camP.set(nar?0:.4+Math.sin(t*.15)*.3,nar?.5:.9,nar?15:9.2); st.camL.set(nar?0:.4,nar?-.6:.05,0); }
  placeMarkers();
  if(st.state==='menu') notesUpdate(st);
};
})();

/* ===== station cr ===== */
/* ================= CREW ================= */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,1,6)});
const sc=st.scene, tags=$$('#tags .tag'), people=[];
let focus=-1, on=0;
const vert=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const frag=`uniform sampler2D tP; uniform float uOn,uF,uTime,uSeed,uCells; uniform vec2 uM; uniform vec3 uInk; varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uSeed)*43758.5453);}
  void main(){
    vec2 g=vec2(uCells,uCells*1.3); vec2 id=floor(vUv*g); vec2 cu=(id+.5)/g; vec2 f=fract(vUv*g)-.5;
    vec4 cs=texture2D(tP,cu); float l=dot(cs.rgb,vec3(.3,.59,.11));
    float lit=step(h(id),uOn*1.15-.1);                                   // dots power on in a scattered order
    float md=length((cu-uM)*vec2(1.,1.3)); float grow=smoothstep(.22,0.,md)*.18;
    float r=(.12+.42*pow(l,.8)+grow)*cs.a*lit;
    float dot_=smoothstep(r,r-.08,length(f));
    vec3 dotc=uInk*(.35+.9*l);
    vec4 ph=texture2D(tP,vUv); vec3 photo=mix(vec3(dot(ph.rgb,vec3(.3,.59,.11))),ph.rgb,.78)*vec3(1.04,.99,.92);
    vec3 c=mix(dotc*dot_,photo,uF*ph.a); float a=mix(dot_*cs.a,ph.a,uF);
    gl_FragColor=vec4(c*a,a); }`;
st.build=async function(){
  const loader=new T.TextureLoader();
  const texs=await Promise.all(PHOTOS.map(src=>new Promise(res=>loader.load(src,t=>{ t.colorSpace=T.SRGBColorSpace; t.minFilter=T.LinearFilter; t.generateMipmaps=false; res(t); },undefined,()=>res(null)))));
  texs.forEach((tx,k)=>{ const u={tP:{value:tx},uOn:{value:0},uF:{value:0},uTime:G.uTime,uSeed:{value:k*7.3},uCells:{value:58},uM:{value:new T.Vector2(9,9)},uInk:{value:new T.Color('#FFB27A')}};
    const m=new T.Mesh(new T.PlaneGeometry(2.6,2.6/.769),new T.ShaderMaterial({uniforms:u,vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:false,premultipliedAlpha:true,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor}));
    sc.add(m); people.push({m,u,f:0}); });
  // a warm floor of light beneath them
  sc.add(pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{o[0]=(r[0]-.5)*22;o[1]=-2.3;o[2]=(r[1]-.5)*8-1;}),PM({size:.04,color:'#FF9B3D',body:'b=.1*smoothstep(11.,2.,abs(p.x))*(.6+.4*sin(uTime+p.x*2.));'})));
  layout();
};
function layout(){ const nar=NARROW(); people.forEach((p,k)=>{ if(nar){ p.m.position.set(-.9,(1-k)*3.75,-k*.05); p.m.scale.setScalar(.95); } else { p.m.position.set((k-1)*3.1,-.3,[-.4,0,-.25][k]); p.m.scale.setScalar(.92); } }); }
window.__crLayout=layout;
st.enter=function(){ on=0; people.forEach(p=>{ p.u.uOn.value=0; p.u.uF.value=0; }); layout(); st.setState('menu'); };
const ray=new T.Raycaster();
st.onPointer=function(e){ if(focus>=0) tags[focus].click(); };
st.update=function(dt,t){
  const nar=NARROW(); on=Math.min(1,on+(S.rdt||dt)/1.6);
  focus=-1; if(mouse.on){ ray.setFromCamera(G.uMouse.value,stCam); const hit=ray.intersectObjects(people.map(p=>p.m))[0]; if(hit){ focus=people.findIndex(p=>p.m===hit.object); people[focus].u.uM.value.copy(hit.uv); } }
  people.forEach((p,k)=>{ p.u.uOn.value=clamp(on*1.4-k*.15,0,1); p.f=damp(p.f,focus===k?1:0,5,dt); p.u.uF.value=p.f; if(focus!==k) p.u.uM.value.set(9,9); p.m.rotation.y=(mouse.on?G.uMouse.value.x:0)*.08; });
  if(focus>=0&&focus!==st._lf){ A.tick(); } st._lf=focus;
  st.camP.set(nar?.6:(mouse.on?G.uMouse.value.x*.6:0),nar?0:(mouse.on?G.uMouse.value.y*.3:0)+.2,nar?18:10.2); st.camL.set(nar?.6:0,nar?0:-.1,0);
  tags.forEach((el,k)=>{ const p=people[k]; if(!p) return; const v=p.m.position.clone(); if(nar){ v.x+=1.55; v.y+=.2; } else v.y-=2.6/.769/2*.92+.15;
    const q=proj(v,stCam); el.style.transform=nar?`translate(${q.x}px,${q.y}px) translate(0,-50%)`:`translate(${q.x}px,${q.y}px) translate(-50%,0)`; el.style.justifyItems=nar?'start':'center'; el.style.textAlign=nar?'left':'center';
    el.style.opacity=clamp(on*2-k*.3,0,1); el.classList.toggle('f',focus===k); el.classList.toggle('dim',focus>=0&&focus!==k); });
};
})();

/* ===== station be ===== */
/* ================= BEACON ================= */
(()=>{
const st=mkStation('be',{arrive:new T.Vector3(1.5,2,7)});
const sc=st.scene; let u;
st.build=function(){
  u={uM3:{value:new T.Vector3()},uPulse:{value:0},uFire:{value:0},uCount:{value:0}};
  sc.add(pts(cloud(Math.floor(24000*Q+5000),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),rr=3+Math.cbrt(r[2])*7;o[0]=Math.sin(b)*Math.cos(a)*rr*1.5+3;o[1]=Math.cos(b)*rr*.8;o[2]=Math.sin(b)*Math.sin(a)*rr*.7-2;}),
    PM({size:.03,color:'#FF8100',uniforms:u,decl:'uniform vec3 uM3; uniform float uPulse,uFire;',body:`
      p+=vec3(sin(uTime*.31+p.y*.5+aR.x*6.),cos(uTime*.27+p.x*.4+aR.y*6.),sin(uTime*.22+p.z*.6+aR.z*6.))*.7;
      vec3 d=uM3-p; float l=length(d)+.001; float pull=exp(-l*.2);
      vec3 tg=normalize(cross(d,vec3(0.,0.,1.))+.0001); p+=d*pull*.82+tg*pull*2.2*(.6+aR.z);
      vec3 bc=vec3(4.,0.,-1.); float rb=length(p.xz-bc.xz); p+=normalize(vec3(p.x-bc.x,0.,p.z-bc.z)+.001)*uPulse*.8*exp(-rb*.3);
      b=.26+pull*1.2+uFire*.6*exp(-rb*.4); col=mix(uCol,vec3(1.,.86,.66),pull*.5);`})));
  const tw=new T.Mesh(new T.CylinderGeometry(.05,.2,4.4,16),LM('#FF8100',{emit:.15,rim:1.2,key:'#FFD9B0'})); tw.position.set(4,-3.6,-1); sc.add(tw);
  sc.add(pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{o[0]=gauss()*.05;o[2]=gauss()*.05;o[1]=r[0];}),PM({size:.06,color:'#FFD9B0',uniforms:u,decl:'uniform float uFire,uPulse;',
    body:'float t=fract(position.y-uTime*(.3+uFire*1.6)); p=vec3(position.x*(1.+uFire*3.)+4.,-1.4+t*(16.+uFire*20.),position.z-1.); b=(.25+.8*(1.-t))*(1.+uFire*2.+uPulse);'})));
  sc.add(pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.14,color:'#FFFFFF',uniforms:u,decl:'uniform float uCount;',body:`
    float i=position.x; b=step(i,uCount-.5)*1.1; float a=uTime*(.15+aR.x*.25)+aR.y*6.28; float rr=1.4+aR.z*2.2; p=vec3(4.+cos(a)*rr,-.4+(aR.w-.5)*3.,-1.+sin(a)*rr);`})));
};
st.enter=function(){ st.setState('menu'); };
st.setCount=n=>{ if(u) u.uCount.value=n; };
st.pulse=()=>{ if(u) u.uPulse.value=1; };
st.fire=()=>{ if(u) u.uFire.value=1; };
const ray=new T.Raycaster(), plane=new T.Plane(new T.Vector3(0,0,1),0), hit=new T.Vector3();
const wc=$('#sgWave'), wx=wc.getContext('2d');
st.update=function(dt,t){
  if(mouse.on){ ray.setFromCamera(G.uMouse.value,stCam); if(ray.ray.intersectPlane(plane,hit)) u.uM3.value.lerp(hit,.12); } else u.uM3.value.lerp(new T.Vector3(3+Math.sin(t*.5)*4,Math.cos(t*.37)*2.4,0),.05);
  u.uPulse.value=damp(u.uPulse.value,0,4,dt); u.uFire.value=damp(u.uFire.value,0,.8,dt);
  const nar=NARROW(); st.camP.set(nar?3:1.6,nar?1:.3,nar?18:13.5); st.camL.set(nar?3:1.1,nar?2:.4,0);
  const w=wc.width,h=wc.height; wx.clearRect(0,0,w,h); wx.strokeStyle='rgba(255,129,0,.9)'; wx.lineWidth=2; wx.beginPath();
  const amp=u.uPulse.value*.8+.06+u.uFire.value;
  for(let x=0;x<=w;x+=4){ const k=x/w; const y=h/2+Math.sin(k*40+t*8)*Math.sin(k*7-t*2)*h*.42*amp*Math.sin(k*Math.PI); x?wx.lineTo(x,y):wx.moveTo(x,y); } wx.stroke();
};
$('#sgName').addEventListener('input',()=>{ st.pulse(); A.key(); });
$('#sgLink').addEventListener('input',()=>{ st.pulse(); A.key(); });
})();

/* ---------- beacon: mail + signals ---------- */
(()=>{
const EMAIL='contact@helorialabs.com';
$('#mail').addEventListener('click',async()=>{ const out=$('#copied');
  try{ await navigator.clipboard.writeText(EMAIL); out.textContent='Copied to clipboard'; }
  catch(e){ const r=document.createRange(); r.selectNodeContents($('#mail')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); out.textContent='Selected. Press Ctrl+C or ⌘C'; }
  setTimeout(()=>out.textContent='Click the address to copy it',2600); });
$('#sig').addEventListener('submit',async e=>{
  e.preventDefault(); const out=$('#sgOut'); const name=$('#sgName').value.trim().slice(0,40), link=$('#sgLink').value.trim().slice(0,200);
  if(!name||!/^https?:\/\/\S+\.\S+/.test(link)){ out.textContent='Add your name and a full link starting with https://'; A.beep(220); return; }
  ST.be&&ST.be.fire&&ST.be.fire(); A.launch();
  if(!RT.db||!RT.me){ // on the public website the signal goes out by email
    const body=`Name: ${name}\nSomething I built: ${link}\n`;
    location.href=`mailto:${EMAIL}?subject=${encodeURIComponent('Signal from '+name)}&body=${encodeURIComponent(body)}`;
    out.textContent='Your email app should open with the signal ready to send.'; return; }
  $('#sgBtn').disabled=true; out.textContent='Transmitting';
  try{ await RT.db.collection('signals').doc(RT.me).set({name,link,t:Date.now()}); out.textContent='Signal received. It is orbiting the beacon.'; A.chord(); S.flash=Math.max(S.flash,.25); }
  catch(err){ out.textContent='That did not send. Email us instead.'; }
  $('#sgBtn').disabled=false;
});
})();

/* ================= FLOW + LOOP ================= */
let peerList=[], room=null, lastPres=0;
const WHITE=new T.Color(1,1,1);

/* ---------- boot: build every world and compile every shader behind the loader ---------- */
async function boot(){
  const mark=$('#mark'), pct=$('#ldPct'), txt=$('#ldTxt');
  mark.textContent=''; [...'Heloria'].forEach(ch=>{ const c=document.createElement('span'); c.className='c'; c.textContent=ch; mark.appendChild(c); });
  const setP=v=>{ $('#ldBar').style.setProperty('--p',v); pct.textContent=String(Math.round(v*100)).padStart(3,'0'); mark.style.fontWeight=Math.round(100+700*v); };
  setP(0); try{ await Promise.race([document.fonts.ready,wait(2500)]); }catch(e){}
  resize();
  txt.textContent='Tracing geodesics'; await nextFrame();
  BH.render(hubCam); renderer.setRenderTarget(null); setP(.1);
  const steps=[['Kríos','kr'],['Bowshock','bs'],['Aetos','ae'],['Pharos','ph'],['Ogive','og'],['Crew','cr'],['Beacon','be']].filter(x=>ST[x[1]]);
  for(let i=0;i<steps.length;i++){ txt.textContent='Building '+steps[i][0]; await nextFrame(); try{ await ST[steps[i][1]].build(); }catch(err){ console.error('build '+steps[i][1],err); delete ST[steps[i][1]]; } setP(.1+.5*(i+1)/steps.length); }
  txt.textContent='Compiling shaders'; await nextFrame();
  universeVisible(1); U.belt.visible=true; U.probe.visible=U.trail.visible=U.dust.visible=true;
  try{ renderer.compile(U.scene,hubCam); }catch(e){} renderer.setRenderTarget(rtA); renderer.render(U.scene,hubCam);
  universeVisible(0); U.probe.visible=U.trail.visible=U.dust.visible=false; setP(.7);
  for(const [nm,id] of steps){ const st=ST[id]; if(!st) continue; txt.textContent='Warming '+nm; await nextFrame(); st.enter(); st.update(.016,0); stCam.position.copy(st.camP); stCam.lookAt(st.camL); setPx(stCam);
    try{ renderer.compile(st.scene,stCam); }catch(e){} renderer.setRenderTarget(rtB); renderer.render(st.scene,stCam); st.exit(); setP(.7+.3*(steps.findIndex(s=>s[1]===id)+1)/steps.length); }
  renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  setP(1); txt.textContent='Ready'; $('#load').classList.add('ready'); $('#enter').focus({preventScroll:true}); S.ready=true;
}

/* ---------- enter: the word falls into the hole ---------- */
const entry={t:-1,from:mkPose()};
function enter(){
  if(!S.ready||S.mode!=='load') return; A.start(); A.swell();
  const mark=$('#mark'), mr=mark.getBoundingClientRect(), cx=innerWidth/2, cy=innerHeight/2;
  $$('.c',mark).forEach(c=>{ const r=c.getBoundingClientRect(); c.style.setProperty('--tx',(cx-(r.left+r.width/2))+'px'); c.style.setProperty('--ty',(cy-(r.top+r.height/2))+'px'); c.style.transitionDelay=(Math.random()*.25).toFixed(2)+'s'; });
  $('#load').classList.add('go'); S.mode='entering'; entry.t=0; hubCam.position.set(0,.4,90); hubCam.lookAt(0,0,0); hubCam.fov=30; hubCam.updateProjectionMatrix();
  entry.from.p.copy(hubCam.position); entry.from.q.copy(hubCam.quaternion); entry.from.fov=30;
  setTimeout(()=>{ A.boom(); S.flash=.6; feedback(.6,1.2); },1150);
  setTimeout(()=>{ show('#load',false); show('#chrome',true); $('#frame').classList.add('on'); },900);
}
$('#enter').addEventListener('click',enter);
addEventListener('keydown',e=>{ if(S.mode==='load'&&S.ready&&(e.code==='Enter'||e.code==='Space')){ e.preventDefault(); enter(); } });

/* ---------- into orbit ---------- */
function spawnProbe(r=10.5,a=2.6){ const P=S.probe; P.p.set(Math.cos(a)*r,0,Math.sin(a)*r); const vc=Math.sqrt(GM/r); P.v.set(-Math.sin(a)*vc,0,Math.cos(a)*vc); P.head=Math.atan2(-P.v.x,-P.v.z); S.yaw=Math.atan2(P.p.x,P.p.z);
  for(let i=0;i<TRL;i++){ U.trailPos[i*3]=P.p.x;U.trailPos[i*3+1]=0;U.trailPos[i*3+2]=P.p.z; } U.trailG.attributes.position.needsUpdate=true; U.probe.position.copy(P.p); }
function toHub(){
  if(S.mode!=='story'&&S.mode!=='beyond') return;
  S.mode='tohub'; S.hubT=0; spawnProbe(); A.whoosh(true,1.8,.2); cine(true);
  fromP.p.copy(hubCam.position); fromP.q.copy(hubCam.quaternion); fromP.fov=hubCam.fov;
  U.probe.visible=U.trail.visible=U.dust.visible=true; A.whine(0);
}

/* ---------- horizon ---------- */
function crossHorizon(){ if(S.mode!=='hub') return; S.mode='falling'; S.fallT=0; S.ap=null; show('#hub',false); cine(true); $('#warn').classList.remove('on'); }
function hzLeave(){ unreveal($('#horizon .h')); show('#horizon',false); post.uniforms.uStretch.value=0; U.probe.visible=U.trail.visible=true; }
$('#hzBack').addEventListener('click',()=>{ hzLeave(); S.mode='story'; toHub(); toast('Respawned at 19 rs'); });
$('#hzBeacon').addEventListener('click',()=>{ hzLeave(); const b=STA[6]; S.mode='hub'; spawnProbe(b.R+2.4,b.a); chasePose(chase); hubBase.p.copy(chase.p); hubBase.q.copy(chase.q); hubCam.position.copy(chase.p); hubCam.quaternion.copy(chase.q); show('#hub',true); cine(false); dock(b); });

function presenceTick(){ if(!room||S.t-lastPres<.25) return; lastPres=S.t; room.presence({x:+S.probe.p.x.toFixed(2),z:+S.probe.p.z.toFixed(2),mode:S.mode==='hub'?'hub':'away'}).catch(()=>{}); }
function drawPeers(){
  let k=0; peerList.forEach(p=>{ if(p.sameTab||k>=MAXP) return; const pr=p.presence||{}; if(typeof pr.x!=='number'||typeof pr.z!=='number'||pr.mode!=='hub') return; U.peerPos.set([pr.x,0,pr.z],k*3); k++; });
  for(let i=k;i<MAXP;i++) U.peerPos.set([9999,9999,9999],i*3); U.peerG.attributes.position.needsUpdate=true;
  const others=peerList.filter(p=>!p.sameTab).length; $('#peers').textContent=others?`${others} other ${others===1?'probe':'probes'} in orbit`:'';
}
(async()=>{
  if(!window.claude||!window.claude.use) return;
  try{ room=await window.claude.use('room'); if(room) room.onPeers(c=>{ peerList=c.peers; drawPeers(); },()=>{ room=null; }); }catch(e){ room=null; }
  try{ RT.db=await window.claude.use('db'); const user=await window.claude.use('user'); RT.me=user?await user.id():null;
    if(RT.db) RT.db.collection('signals').orderBy('t','desc').limit(200).onSnapshot(s=>{ U.sigU.uCount.value=s.size; RT.signals=s.size; ST.be&&ST.be.setCount&&ST.be.setCount(s.size); },()=>{});
  }catch(e){ RT.db=null; }
})();
window.__onResize=()=>{ window.__crLayout&&window.__crLayout(); };

/* ---------- main loop ---------- */
const stPos=new T.Vector3(), stLook=new T.Vector3();
let last=performance.now(), radarK=0;
function frame(now){
  const raw=(now-last)/1000; last=now; const rdt=Math.min(window.__TEST?.5:.1,raw), dt=Math.min(.05,raw); S.rdt=rdt; S.t+=dt; const t=S.t;
  G.uTime.value=RM?t*.35:t; QM.tick(raw*1000,now); cursorTick();
  updateStations(t);
  if(S.mode==='load'){ hubCam.position.set(Math.sin(t*.05)*2,.4,90); hubCam.lookAt(0,0,0); }
  else if(S.mode==='entering'){
    entry.t+=rdt; chPose(0,_sp,t); const k=E.io5(clamp(entry.t/3.4,0,1));
    hubCam.position.lerpVectors(entry.from.p,_sp.p,k); hubCam.quaternion.slerpQuaternions(entry.from.q,_sp.q,k); hubCam.fov=lerp(30,_sp.fov,k); hubCam.updateProjectionMatrix();
    A.update(t,{sub:.3*(1-k)+.15,pad:k,bright:.5});
    if(entry.t>2.3&&!entry.rev){ entry.rev=true; show('#story',true); reveal(story.blocks[0]); story.rail[0].classList.add('on'); where('Approach'); }
    if(entry.t>=3.4){ S.mode='story'; S.ch=0; story.k=1; story.from.p.copy(hubCam.position); story.from.q.copy(hubCam.quaternion); story.from.fov=hubCam.fov; }
  }
  else if(S.mode==='story'){ storyUpdate(rdt,t); }
  else if(S.mode==='tohub'){
    S.hubT+=rdt; const k=E.io(clamp(S.hubT/2.6,0,1)); hubPhysics(dt); chasePose(chase);
    hubCam.position.lerpVectors(fromP.p,chase.p,k); hubCam.quaternion.slerpQuaternions(fromP.q,chase.q,k); hubCam.fov=lerp(fromP.fov,36,k); hubCam.updateProjectionMatrix();
    hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion); S.sysVis=damp(S.sysVis||0,1,3,rdt); universeVisible(S.sysVis);
    post.uniforms.uWarp.value=RM?0:(1-sstep(0,.9,S.hubT))*.7; post.uniforms.uIC.value.set(.5,.5);
    if(S.hubT>1.3&&!S.hudOn){ S.hudOn=true; show('#hub',true); cine(false); updateQuest(); where('Orbit'); setTimeout(()=>{ if(!S.firstThrust) $('#hint').classList.add('gone'); },15000); }
    if(S.hubT>=2.6&&S.mode==='tohub'){ S.mode='hub'; S.hudOn=false; post.uniforms.uWarp.value=0; toast('Gravity is on. Thrust gently.'); }
    labelsUpdate();
  }
  else if(S.mode==='hub'){
    hubPhysics(dt);
    if(S.mode==='hub'){ chasePose(chase); hubBase.p.lerp(chase.p,1-Math.exp(-5*dt)); hubBase.q.slerp(chase.q,1-Math.exp(-6*dt));
      hubCam.position.copy(hubBase.p); hubCam.quaternion.copy(hubBase.q); labelsUpdate(); if((radarK++&1)===0) radarDraw(); presenceTick(); }
    universeVisible(1);
  }
  else if(S.mode==='docking'){ dockUpdate(rdt); }
  else if(S.mode==='undocking'){ undockUpdate(rdt,dt); if(S.mode==='hub'||(TR&&TR.t>1.1)){ labelsUpdate(); radarDraw(); } }
  else if(S.mode==='falling'){
    S.fallT+=rdt; const k=Math.min(1,S.fallT/2.6); post.uniforms.uStretch.value=k*(RM?.2:1); A.whine(k); A.thrust(0);
    const P=S.probe; P.p.multiplyScalar(1-dt*1.1); U.probe.position.copy(P.p);
    hubCam.position.lerp(tv[2].set(P.p.x*1.4,.8,P.p.z*1.4+.01),dt*2); hubCam.lookAt(0,0,0); hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion);
    const c=tv[3].set(0,0,0).project(hubCam); post.uniforms.uSC.value.set(c.x*.5+.5,c.y*.5+.5);
    S.flash=Math.max(S.flash,sstep(.75,1,k));
    if(k>=1){ S.mode='beyond'; A.whine(0); U.probe.visible=U.trail.visible=false; cine(false);
      $('#hzStats').innerHTML=statsHTML([['Proper time',fmtT(S.tau)],['Stations docked',S.docked.size+' / 7'],['Games played',S.games]]); show('#horizon',true); reveal($('#horizon .h')); }
  }
  // camera shake, flashes, grade
  if(S.shake>0&&!RM){ const a=S.shake*S.shake*.25; if(S.iris<2.5&&S.mode!=='station'){ hubCam.position.add(tv[4].set((Math.random()-.5)*a,(Math.random()-.5)*a,(Math.random()-.5)*a)); } }
  S.shake=Math.max(0,S.shake-rdt*1.8); S.ca=damp(S.ca,0,5,rdt);
  post.uniforms.uTint.value.multiplyScalar(Math.exp(-4*rdt));
  S.flash=Math.max(0,S.flash-rdt*1.2); post.uniforms.uFlash.value=S.flash;
  post.uniforms.uCA.value=S.ca+(S.mode==='hub'?S.probe.thr*.2:0);
  if(S.mode!=='falling'&&S.mode!=='beyond') post.uniforms.uStretch.value=damp(post.uniforms.uStretch.value,0,4,rdt);
  post.uniforms.uGrade.value.lerp(WHITE,1-Math.exp(-6*rdt));
  // station update + its smoothed camera
  const needB=S.st&&S.iris>0, needA=S.iris<2.5;
  if(S.st&&(needB||S.mode==='docking')){
    S.st.update(dt,t);
    const target=tv[5].copy(S.st.camP).addScaledVector(S.st.arrive,S.arrive);
    if(S.stSnap){ stPos.copy(target); stLook.copy(S.st.camL); S.stSnap=false; }
    else { const k=S.mode==='docking'||S.mode==='undocking'?1-Math.exp(-14*dt):1-Math.exp(-4*dt); stPos.lerp(target,k); stLook.lerp(S.st.camL,1-Math.exp(-5*dt)); }
    stCam.position.copy(stPos); if(S.shake>0&&!RM){ const a=S.shake*S.shake*.22; stCam.position.add(tv[6].set((Math.random()-.5)*a,(Math.random()-.5)*a,0)); } stCam.lookAt(stLook);
    if(S.mode==='station') A.update(t,{sub:.05,pad:S.st.state==='play'?.5:1,bright:.45});
  }
  // render: trace the hole, draw the system over it, then the station world, then composite
  if(needA&&S.mode!=='load'){ BH.render(hubCam); setPx(hubCam); renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(U.scene,hubCam); }
  if(needB){ setPx(stCam); renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(S.st.scene,stCam); }
  post.uniforms.uIris.value=S.st?S.iris:0;
  renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  requestAnimationFrame(frame);
}
hubCam.position.set(0,.4,90); hubCam.lookAt(0,0,0);
requestAnimationFrame(frame);
boot();
/* test helper: straight into a station with no transitions */
function jump(id){
  const s=STA.find(x=>x.id===id), st=ST[id]; if(!s||!st||!S.ready) return false;
  ['#load','#story','#hub','#horizon'].forEach(q=>show(q,false)); show('#chrome',true); $('#frame').classList.add('on'); A.start();
  if(S.st&&S.st!==st){ S.st.abort(); S.st.exit(); S.st.el.classList.remove('on'); }
  S.mode='station'; S.stId=id; S.st=st; S.iris=3; S.arrive=0; S.stSnap=true; S.docked.add(id);
  post.uniforms.uIrisCol.value.set(s.color); st.enter(); show('#station',true); st.showUI(); where(s.name); return true;
}
window.__heloria={jump,storyUnlock:()=>{ story.busy=0; },S,ST,U,STA,post,BH,renderer,stCam,hubCam,rtA,rtB,postScene,ortho,dock:id=>dock(STA.find(x=>x.id===id)),toHub,undock,goChapter,escape};

})();

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
const show=(sel,on)=>{ $(sel).classList.toggle('off',!on); if(typeof curReset==='function') curReset(); };
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
    _lv(){ if(!ctx) return null; const r=x=>+x.value.toFixed(4); return {pad:r(n.padG.gain),sub:r(n.subG.gain),wind:r(n.wind.g.gain),thrust:r(n.thrust.g.gain),roar:r(n.roar.g.gain),hiss:r(n.hiss.g.gain),whine:r(n.teng.gain)}; }, // test hook: current levels
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
    /* every continuous layer to silence: used when crossing between orbit and a station so neither spills into the other */
    hush(){ if(!ctx) return; set(n.wind.g.gain,0,.15); set(n.thrust.g.gain,0,.1); set(n.roar.g.gain,0,.1); set(n.hiss.g.gain,0,.1); set(n.teng.gain,0,.2); },
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
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,[data-cur],canvas#radar'); if(!t||t.matches('input')) return; curT.textContent=t.dataset.cur||(t.id==='radar'?'Fly':'Open'); curEl.classList.add('big'); curEl.classList.toggle('map',t.id==='radar'); if(!t._tk){ A.tick(); t._tk=1; setTimeout(()=>t._tk=0,120);} });
document.addEventListener('pointerout',e=>{ const t=e.target.closest&&e.target.closest('a,button,[data-cur],canvas#radar'); if(t&&!t.contains(e.relatedTarget)) curEl.classList.remove('big','map'); });
document.addEventListener('click',e=>{ const b=e.target.closest('button,a'); if(!b) return; A.click();
  /* a mouse click must not leave focus behind: otherwise Space or Enter, used as game keys, would press this button again */
  if(e.detail>0) setTimeout(()=>b.blur(),0); },true);
/* Space and Enter are game keys. They only press a control the visitor reached with Tab; focus left behind by a tap,
   a click or a script is dropped first, so a game key can never press a hidden button or follow a link */
let kbNav=false;
addEventListener('keydown',e=>{ if(e.key==='Tab') kbNav=true; },true);
addEventListener('pointerdown',()=>{ kbNav=false; },true);
addEventListener('keydown',e=>{ if(e.code!=='Space'&&e.code!=='Enter') return; const f=document.activeElement;
  if(!f||f===document.body||!f.matches||f.matches('input,textarea,select')||!(S.mode==='station'||S.mode==='hub')) return;
  if(f.matches('button,a,[role=button]')&&!kbNav){ f.blur(); if(e.code==='Enter'||f.matches('a')) e.preventDefault(); } },true);
function curReset(){ const c=document.getElementById('cur'); if(c) c.classList.remove('big','map'); }
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

/* stations, coloured by temperature on the same blackbody scale as the disk, evenly spaced from 9.5 to 27.5 */
const STA=[
  {id:'kr',name:'Kríos',game:'Read the Room',R:9.5,ph:.4,K:24000,color:'#A5C3FF'},
  {id:'ae',name:'Aetos',game:'Hold the Sky',R:13.1,ph:4.3,K:6600,color:'#F2EEE6'},
  {id:'ph',name:'Pharos',game:'Lost Signal',R:16.7,ph:1.1,K:4300,color:'#FFD5B3'},
  {id:'og',name:'Ogive',game:'Apogee',R:20.3,ph:3.3,K:3100,color:'#FFB475'},
  {id:'cr',name:'Crew',game:'Three builders',R:23.9,ph:5.4,K:2400,color:'#FF9B3D'},
  {id:'be',name:'Beacon',game:'Join · contact',R:27.5,ph:.2,K:1850,color:'#FF8100'}
];
const NST=STA.length, BEACON=STA.find(s=>s.id==='be');

/* spacetime grid: a polar mesh outside the disk, dented by every mass */
{
  const v=[];
  for(let r=7.5;r<=31;r+=1.25){ const N=Math.max(80,Math.floor(r*9)); for(let k=0;k<N;k++){ const a0=k/N*TAU,a1=(k+1)/N*TAU; v.push(Math.cos(a0)*r,0,Math.sin(a0)*r,Math.cos(a1)*r,0,Math.sin(a1)*r); } }
  for(let s=0;s<56;s++){ const a=s/56*TAU; for(let k=0;k<60;k++){ const r0=7.5+k*.4, r1=7.5+(k+1)*.4; v.push(Math.cos(a)*r0,0,Math.sin(a)*r0,Math.cos(a)*r1,0,Math.sin(a)*r1); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  U.gridU={uTime:G.uTime,uProbe:{value:new T.Vector3(99,0,99)},uSt:{value:[...Array(NST)].map(()=>new T.Vector3(99,0,99))},uOp:{value:0},uC:{value:new T.Color('#B9A58E')}};
  U.grid=new T.LineSegments(g,new T.ShaderMaterial({uniforms:U.gridU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform vec3 uProbe; uniform vec3 uSt[${NST}]; uniform float uTime,uOp; varying float vA;
    void main(){ vec3 p=position; float r=length(p.xz); float y=-1.4-14./(r+1.5);
      float d=length(p.xz-uProbe.xz); y-=.9*exp(-d*d*.5);
      for(int i=0;i<${NST};i++){ float ds=length(p.xz-uSt[i].xz); y-=.8*exp(-ds*ds*.3); }
      p.y=y; float wv=pow(.5+.5*sin(r*.7-uTime*1.1),12.);
      vA=uOp*((.05+.16*wv)*smoothstep(31.,20.,r)*smoothstep(7.5,10.5,r)+.28*exp(-d*d*.1));
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader:`uniform vec3 uC; varying float vA; void main(){ gl_FragColor=vec4(uC*vA,1.); }`}));
  U.grid.frustumCulled=false; U.scene.add(U.grid);
}

STA.forEach((s,si)=>{
  s.idx=si; s.w=Math.sqrt(GM/(s.R**3))*.28; s.pos=new T.Vector3(); s.vel=new T.Vector3(); s.a=s.ph; s.c=new T.Color(s.color);
  const g=new T.Group(); s.grp=g; g.visible=false; U.scene.add(g); s.anim=[];
  const C=s.color, add=m=>{ g.add(m); return m; };
  if(s.id==='kr'){ // glass sphere with a speaking waveform inside
    add(new T.Mesh(new T.SphereGeometry(.62,40,24),LM(C,{emit:.02,rim:1.4,amb:.02,op:.55})));
    const w=add(pts(cloud(1400,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*.42;o[1]=0;o[2]=Math.sin(a)*.42;}),PM({size:.05,color:C,body:'float a=atan(p.z,p.x); float k=1.+.45*sin(a*9.+uTime*6.)*sin(uTime*2.3)*sin(a*2.+uTime); p.xz*=k; p.y=.18*sin(a*14.-uTime*5.)*sin(uTime*1.7); b=1.3;'})));
    w.rotation.x=.3;
  }
  if(s.id==='ae'){ // a surveillance radar: a curved antenna turning on a pedestal, its beam sweeping a scope below
    const steel=LM('#a9a196',{rim:.7,amb:.06});
    add(new T.Mesh(new T.CylinderGeometry(.06,.15,.72,8),steel)).position.y=-.44;                      // pedestal
    add(new T.Mesh(new T.BoxGeometry(.3,.16,.22),steel)).position.set(0,-.74,.05);                   // equipment shelter
    add(new T.Mesh(new T.CylinderGeometry(.13,.13,.06,20),steel)).position.y=-.05;                   // turntable
    const head=new T.Group(); add(head);
    head.add(new T.Mesh(new T.BoxGeometry(.05,.2,.05),steel)).position.set(0,.08,-.02);              // yoke
    // the reflector: a slice of a cylinder, concave toward the feed, tilted up a little like an airport radar
    const RR=.72, SPAN=1.6, refl=new T.Mesh(new T.CylinderGeometry(RR,RR,.3,32,1,true,Math.PI-SPAN/2,SPAN),LM(C,{emit:.015,rim:.85,amb:.06}));
    refl.material.side=T.DoubleSide; refl.position.set(0,.2,RR-.12); refl.rotation.x=-.18; head.add(refl);
    const ribs=new T.LineSegments(new T.EdgesGeometry(refl.geometry,20),new T.LineBasicMaterial({color:C,transparent:true,opacity:.5})); ribs.position.copy(refl.position); ribs.rotation.copy(refl.rotation); head.add(ribs);
    head.add(new T.Mesh(new T.BoxGeometry(.012,.012,.36),steel)).position.set(0,.13,.08);             // feed strut
    head.add(new T.Mesh(new T.BoxGeometry(.07,.06,.06),LM(C,{emit:.4,rim:.8}))).position.set(0,.14,.27); // feed horn
    // the scope below: range rings, the sweep with its afterglow, and returns that flash as the beam crosses them
    const sweepU={uA:{value:0}}, SR=1.7;
    const scope=add(pts(cloud(Math.floor(1700*Q+500),(i,r,o)=>{ let rr, a=r[0]*TAU;
        if(i%5===0){ rr=(Math.floor(r[1]*3)+1)/3*SR; } else if(i%41===1){ rr=(.35+.6*r[2])*SR; } else rr=Math.sqrt(r[1])*SR;
        o[0]=Math.sin(a)*rr; o[1]=-.86; o[2]=Math.cos(a)*rr; }),
      PM({size:.05,color:C,uniforms:sweepU,decl:'uniform float uA;',body:`
        float a=atan(p.x,p.z); float d=mod(uA-a,6.2832); float rr=length(p.xz)/${SR.toFixed(2)};
        float sw=exp(-d*3.2), lead=exp(-d*28.), fr=fract(rr*3.+.5)-.5;
        b=.04+sw*(.25+.6*rr)+lead*.9;
        if(aR.z>.985){ b=.06+2.2*exp(-d*1.4); sz=1.6; col=mix(uCol,vec3(1.,.85,.6),.5); }
        else if(abs(fr)<.012){ b=.22+.6*sw; }`})));
    scope.renderOrder=1;
    // a fine rim so the scope reads as an instrument from any angle
    const rim=new T.LineLoop(ringGeo(SR,160,-.86),dashMat(C,'float a=.55;')); rim.material.uniforms.uOp.value=1; add(rim);
    s.anim.push(t=>{ const a=t*1.25; head.rotation.y=a; sweepU.uA.value=a; });
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

/* asteroid belt between Aetos and Pharos, lit only by the disk */
{
  const N=Math.floor(380*Q+120);
  U.belt=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),LM('#8c8070',{rim:.25,amb:.03,key:'#FFC392'}),N);
  const M=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), sc=new T.Vector3(), p=new T.Vector3();
  for(let i=0;i<N;i++){ const a=Math.random()*TAU, r=14.9+gauss()*.38; p.set(Math.cos(a)*r,gauss()*.12,Math.sin(a)*r); e.set(Math.random()*6,Math.random()*6,Math.random()*6); q.setFromEuler(e);
    const s=.025+Math.pow(Math.random(),3)*.09; sc.set(s,s*(.6+Math.random()*.6),s*(.7+Math.random()*.5)); M.compose(p,q,sc); U.belt.setMatrixAt(i,M); }
  U.belt.frustumCulled=false; U.belt.visible=false; U.scene.add(U.belt);
}
/* the seal: a dashed ring just outside the horizon that stops the probe until the four projects have been visited */
U.seal=new T.LineLoop(ringGeo(2.4,260),dashMat('#FF5636','float a=(.07+.75*uNear)*step(.5,fract(vAng*15.9+uTime*.12));')); U.seal.material.uniforms.uOp.value=0; U.scene.add(U.seal); U.sealU=U.seal.material.uniforms;
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
  U.sigU.uBe.value.copy(BEACON.pos);
}
function universeVisible(k){
  STA.forEach(s=>{ s.grp.visible=k>.01; s.orbit.material.uniforms.uOp.value=k; s.zone.material.uniforms.uOp.value=k; s.tether.material.uniforms.uOp.value=k; });
  U.gridU.uOp.value=k; U.fence.material.uniforms.uOp.value=k; U.belt.visible=k>.05; U.sealU.uOp.value=k*(holeOpen()?0:1);
}

/* ================= HUB: FLIGHT, MAP, DOCKING ================= */
const S={mode:'load',ch:0,chT:0,t:0,tau:0,hold:0,form:0,formT:null,flash:0,intro:0,introT:0,yaw:.5,zoom:1,iris:0,arrive:0,shake:0,ca:0,rdt:0,games:0,
  probe:{p:new T.Vector3(10,0,0),v:new T.Vector3(),thr:0,head:0}, ap:null, docked:new Set(), near:null, st:null, stId:null, firstThrust:false, hubT:0, edgeT:0, sealT:0};
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

/* the hole as a destination: sealed until the four projects have been visited (Crew and Beacon are optional) */
const SEAL=2.4, HOLE={id:'hole',name:'The horizon',pos:new T.Vector3(),vel:new T.Vector3(),R:0,color:'#FFC392'};
const PROJ=['kr','ae','ph','og'], projDone=()=>PROJ.filter(id=>S.docked.has(id)).length, holeOpen=()=>projDone()>=PROJ.length, SEALTINT=new T.Color(.06,.015,0);
function autopilot(s){ if(S.mode!=='hub') return; if(s===HOLE&&!holeOpen()) return; if(S.near===s) return dock(s); S.ap=s; toast(s===HOLE?'Autopilot · into the horizon':'Autopilot · '+s.name); A.blip(); }
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
    if(s!==HOLE&&cl.length()<8.5&&dist>4){ const side=cl.length()>.1?cl.normalize():tv[6].set(-P.p.z,0,P.p.x).normalize(); aim=side.multiplyScalar(Math.max(9.5,Math.min(r,s.R))).sub(P.p); aim.y=0; aimLen=aim.length()+6; }
    const want=tv[7].copy(aim).normalize().multiplyScalar(Math.min(11,aimLen*1.1)).add(s.vel);
    thrust.copy(want.sub(P.v)).multiplyScalar(.6); if(thrust.length()>1.5) thrust.setLength(1.5);
    if(dist<2.2&&s!==HOLE){ S.ap=null; dock(s); return; }
    U.apLine.visible=true; const ap=U.apLine.geometry.attributes.position.array; ap[0]=P.p.x;ap[1]=0;ap[2]=P.p.z;ap[3]=s.pos.x;ap[4]=s.pos.y;ap[5]=s.pos.z; U.apLine.geometry.attributes.position.needsUpdate=true; U.apLine.material.uniforms.uR.value=dist*1.2; U.apLine.material.uniforms.uOp.value=1;
  } else U.apLine.visible=false;
  const tl=Math.min(1.5,thrust.length()); P.thr=damp(P.thr,tl,10,dt);
  const acc=tv[8].set(-P.p.x,0,-P.p.z).multiplyScalar(GM/(r*r*r)).addScaledVector(thrust,9);
  if(tl<.05&&r>3.5){ const vc=Math.sqrt(GM/r); const tang=tv[9].set(-P.p.z/r,0,P.p.x/r); const sg=Math.sign(tang.dot(P.v))||1; tang.multiplyScalar(vc*sg).sub(P.v); acc.addScaledVector(tang,.4); }
  if(r>RB-2.5){ acc.addScaledVector(tv[4].set(-P.p.x/r,0,-P.p.z/r),(r-(RB-2.5))*9); if(S.t>S.edgeT){ S.edgeT=S.t+6; toast('Edge of the Heloria system'); A.beep(440); } }
  if(S.ap&&S.ap!==HOLE&&r<7) acc.addScaledVector(tv[4].set(P.p.x/r,0,P.p.z/r),30);
  P.v.addScaledVector(acc,dt); if(P.v.length()>12) P.v.setLength(12);
  P.p.addScaledVector(P.v,dt); P.p.y=0;
  if(S.ap&&S.ap!==HOLE){ const rr=Math.hypot(P.p.x,P.p.z); if(rr<4){ P.p.multiplyScalar(4/rr); const vr=(P.v.x*P.p.x+P.v.z*P.p.z)/4; if(vr<0){ P.v.x-=vr*P.p.x/4; P.v.z-=vr*P.p.z/4; } } } // autopilot never falls in by accident
  // the horizon stays sealed until every project has been visited: the probe bounces off it
  if(!holeOpen()){ const rr=Math.hypot(P.p.x,P.p.z);
    if(rr<SEAL){ const nx=P.p.x/rr, nz=P.p.z/rr; P.p.x=nx*SEAL; P.p.z=nz*SEAL; const vr=P.v.x*nx+P.v.z*nz; if(vr<0){ P.v.x-=1.7*vr*nx; P.v.z-=1.7*vr*nz; }
      U.sealU.uNear.value=1; if(S.t>S.sealT){ S.sealT=S.t+3.5; toast(`The horizon is sealed · visit all four projects first · ${projDone()} / ${PROJ.length}`); A.beep(330); A.beep(262); feedback(.35,1.2,SEALTINT); } } }
  else if(r<1.35){ crossHorizon(); return; }
  if(P.v.lengthSq()>.04) P.head=P.head+angDiff(Math.atan2(-P.v.x,-P.v.z),P.head)*Math.min(1,dt*6);
  U.probe.position.copy(P.p); U.probe.rotation.set(0,P.head,0); U.engU.uThr.value=P.thr; A.thrust(P.thr);
  if(P.thr>.1){ tv[4].set(Math.sin(P.head),0,Math.cos(P.head)).multiplyScalar(.3).add(P.p); for(let k=0;k<Math.ceil(P.thr*4*Q);k++) U.exhaust.emit(tv[4],1,.5,null,0,.6); }
  U.trailPos.copyWithin(3,0,(TRL-1)*3); U.trailPos[0]=P.p.x;U.trailPos[1]=0;U.trailPos[2]=P.p.z;
  for(let i=0;i<TRL;i++){const f=Math.pow(1-i/TRL,2)*.8; U.trailCol[i*3]=f*.85;U.trailCol[i*3+1]=f*.78;U.trailCol[i*3+2]=f;}
  U.trailG.attributes.position.needsUpdate=true; U.trailG.attributes.color.needsUpdate=true;
  U.dustU.uC.value.copy(P.p); U.gridU.uProbe.value.copy(P.p); U.sealU.uNear.value=damp(U.sealU.uNear.value,0,2.5,dt);
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
/* the horizon gets a label of its own once it is open */
{ const el=document.createElement('button'); el.type='button'; el.className='slab hole'; el.style.setProperty('--acc',HOLE.color); el.dataset.cur='Fall';
  el.innerHTML=`<span class="rt"></span><span class="tx"><b>The horizon</b><span class="sub">Every project visited · fall in</span><span class="dist"></span><span class="act">${FINE?'Click':'Tap'} to fall in</span></span>`;
  el.style.display='none'; el.addEventListener('click',()=>autopilot(HOLE)); $('#labels').appendChild(el); HOLE.el=el; HOLE.distEl=$('.dist',el); }
const _edges=[]; let _rb=null, _rbK='';
function radarBox(){ const key=innerWidth+'x'+innerHeight; if(_rbK!==key){ const r=$('#radar').getBoundingClientRect(); if(r.width<1) return null; _rb={l:r.left-30,t:r.top-30,r:r.right+10,b:r.bottom+10}; _rbK=key; } return _rb; }
function labelsUpdate(){
  const W=innerWidth,H=innerHeight, m=46, hw=W/2-m, hh=H/2-m-40; _edges.length=0;
  STA.forEach(s=>{
    const p=tv[1].copy(s.pos).project(hubCam), behind=p.z>1;
    const sx=(p.x*.5+.5)*W, sy=(-p.y*.5+.5)*H;
    const on=!behind&&sx>40&&sx<W-40&&sy>70&&sy<H-60;
    if(on){ tv[2].setFromMatrixColumn(hubCam.matrixWorld,0).multiplyScalar(1.7).add(s.pos).project(hubCam); const rad=Math.abs((tv[2].x-p.x)*.5*W);
      const sz=clamp(rad*2,32,150); s.el.style.display=''; s.el.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; s.el.style.setProperty('--s',sz.toFixed(0)+'px'); s.el.classList.toggle('low',sy-sz/2<74);
      s.distEl.textContent=(s.pos.distanceTo(S.probe.p)/BH.RS).toFixed(1)+' rs'; s.el.classList.toggle('near',S.near===s); s.el.classList.toggle('flip',sx>W-200); s.el.classList.toggle('done',S.docked.has(s.id)); s.edge.style.display='none';
      const rb=radarBox(); s.el.classList.toggle('under',!!rb&&sx>rb.l&&sx<rb.r&&sy>rb.t&&sy<rb.b); }
    else { s.el.style.display='none';
      let dx=sx-W/2, dy=sy-H/2; if(behind){dx=-dx;dy=-dy;} const a=Math.atan2(dy,dx);
      const k=Math.min(hw/Math.max(1e-6,Math.abs(Math.cos(a))),hh/Math.max(1e-6,Math.abs(Math.sin(a))));
      if(s.edge.style.display==='none'||!s.ew){ s.edge.style.display=''; s.ew=s.edge.offsetWidth||90; }
      _edges.push({s,a,x:W/2+Math.cos(a)*k,y:H/2+Math.sin(a)*k}); }
  });
  { const H_=HOLE.el; if(holeOpen()&&(S.mode==='hub'||S.mode==='tohub')){ const p=tv[1].set(0,0,0).project(hubCam), sx=(p.x*.5+.5)*W, sy=(-p.y*.5+.5)*H;
      if(p.z<1&&sx>40&&sx<W-40&&sy>70&&sy<H-60){ tv[2].setFromMatrixColumn(hubCam.matrixWorld,0).multiplyScalar(SEAL).project(hubCam); const sz=clamp(Math.abs((tv[2].x-p.x)*.5*W)*2,40,170);
        H_.style.display=''; H_.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; H_.style.setProperty('--s',sz.toFixed(0)+'px'); H_.classList.add('near'); H_.classList.toggle('flip',sx>W-200); H_.classList.toggle('low',sy-sz/2<74);
        HOLE.distEl.textContent=(S.probe.p.length()/BH.RS).toFixed(1)+' rs'; } else H_.style.display='none'; } else if(H_.style.display!=='none') H_.style.display='none'; }
  // markers that point the same way share an edge of the screen: slide them apart along it so names never overlap
  const n=_edges.length;
  for(let it=0;it<6;it++) for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const a=_edges[i], b=_edges[j];
    const side=Math.abs(a.x-W/2)>=hw-1&&Math.abs(b.x-W/2)>=hw-1, ow=(a.s.ew+b.s.ew)/2+14, oh=24, dx=b.x-a.x, dy=b.y-a.y;
    if(Math.abs(dx)>=ow||Math.abs(dy)>=oh) continue;
    if(side){ const push=(oh-Math.abs(dy))/2*(dy>=0?1:-1); a.y-=push; b.y+=push; }
    else { const push=(ow-Math.abs(dx))/2*(dx>=0?1:-1); a.x-=push; b.x+=push; }
  }
  for(const e of _edges){ const x=clamp(e.x,m*.5+e.s.ew/2,W-m*.5-e.s.ew/2), y=clamp(e.y,m+20,H-m-20);
    e.s.edge.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; $('svg',e.s.edge).style.transform=`rotate(${e.a}rad)`; }
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
  if(holeOpen()){ rx.strokeStyle='rgba(255,195,146,'+(.5+.5*Math.sin(S.t*4)).toFixed(2)+')'; rx.lineWidth=2; rx.beginPath(); rx.arc(0,0,1.43*k+8+3*Math.sin(S.t*4),0,TAU); rx.stroke(); rx.lineWidth=1.5; }
  else { rx.strokeStyle='rgba(255,86,54,.55)'; rx.setLineDash([3,4]); rx.beginPath(); rx.arc(0,0,SEAL*k,0,TAU); rx.stroke(); rx.setLineDash([]); }
  peerList.forEach(p=>{ const pr=p.presence||{}; if(p.sameTab||typeof pr.x!=='number') return; rx.fillStyle='rgba(255,195,146,.8)'; rx.fillRect(pr.x*k-2,pr.z*k-2,4,4); });
  STA.forEach(s=>{ const x=s.pos.x*k, y=s.pos.z*k; rx.fillStyle=s.color; rx.beginPath(); rx.arc(x,y,S.ap===s?9:7,0,TAU); rx.fill();
    if(S.docked.has(s.id)){ rx.strokeStyle=s.color; rx.beginPath(); rx.arc(x,y,12,0,TAU); rx.stroke(); }
    if(S.ap===s){ rx.strokeStyle='#fff'; rx.setLineDash([4,4]); rx.beginPath(); rx.moveTo(S.probe.p.x*k,S.probe.p.z*k); rx.lineTo(x,y); rx.stroke(); rx.setLineDash([]); } });
  const P=S.probe; rx.save(); rx.translate(P.p.x*k,P.p.z*k); rx.rotate(-P.head+Math.PI); rx.fillStyle='#fff'; rx.beginPath(); rx.moveTo(0,10); rx.lineTo(6,-6); rx.lineTo(0,-2); rx.lineTo(-6,-6); rx.closePath(); rx.fill(); rx.restore();
  rx.restore();
  rx.fillStyle='rgba(238,233,223,.5)'; rx.font='16px "Michroma", sans-serif'; rx.textAlign='center'; rx.fillText('▲',cx,16);
}
rc.addEventListener('click',e=>{
  const b=rc.getBoundingClientRect(), sc=rc.width/b.width; let x=(e.clientX-b.left)*sc-rc.width/2, y=(e.clientY-b.top)*sc-rc.width/2;
  const c=Math.cos(-S.yaw), s=Math.sin(-S.yaw); const wx=x*c-y*s, wy=x*s+y*c; const k=(rc.width/2-16)/RB;
  let best=null, bd=40; STA.forEach(st=>{ const d=Math.hypot(st.pos.x*k-wx,st.pos.z*k-wy); if(d<bd){bd=d;best=st;} });
  if(holeOpen()&&Math.hypot(wx,wy)<Math.min(bd,34)) best=HOLE; if(best) autopilot(best);
});
$('#dots').innerHTML=STA.map(()=>'<i></i>').join('');
function updateQuest(){ $('#qtxt').textContent=holeOpen()?'Projects visited · the horizon is open':`${projDone()} / ${PROJ.length} projects visited`; [...$('#dots').children].forEach((d,i)=>{ d.classList.toggle('on',S.docked.has(STA[i].id)); d.style.setProperty('--c',STA[i].color); }); }

/* ---------- docking: fly in, iris open into the station world ---------- */
let TR=null;
function dock(s){
  if(S.mode!=='hub') return;
  const st=ST[s.id]; if(!st) return;
  S.mode='docking'; S.ap=null; U.apLine.visible=false; S.near=null; A.hush(); A.update(S.t,{sub:0,pad:0}); A.swell(); cine(true);
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
$('#back').addEventListener('click',()=>undock());
function undock(){
  if(S.mode!=='station') return;
  const s=STA.find(x=>x.id===S.stId), st=S.st;
  st.abort(); st.hideUI(); cine(true); A.hush(); A.whoosh(false,1.3); S.mode='undocking';
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
    if(holeOpen()&&!S.allDone){ S.allDone=true; setTimeout(()=>{ toast('Every project visited. The horizon is open: fall in.'); A.chord(); },700); } }
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
      if(s==='menu'&&el.classList.contains('on')) reveal($('.card',el)); if(s!=='play') cursorAim(false);
      // the panel under the pointer changed: drop the hover cursor and any focus left on a control that just hid
      curReset(); const f=document.activeElement; if(f&&f!==document.body&&el.contains(f)&&!f.matches('input,textarea,select')) f.blur(); },
    showUI(){ el.classList.add('on'); this.setState('menu'); },
    hideUI(){ unreveal($('.card',el)); el.classList.remove('is-play','is-res'); setTimeout(()=>{ if(S.stId!==id||S.mode!=='station') el.classList.remove('on'); },700); },
    result(o){ // o: {grade, score, key, stats, text, assisted}
      const best=store.get(id,0), isNew=!o.assisted&&o.score>best; if(isNew) store.set(id,o.score);
      const B=Math.max(best,o.assisted?0:o.score); const bEl=$('#'+id+'Best'); if(bEl) bEl.textContent='Best '+fmt(B);
      const gEl=$('#'+id+'G'); gEl.removeAttribute('data-sp'); gEl.classList.add('pw'); gEl.textContent=o.grade; $('#'+id+'Final').textContent=fmt(o.score);
      const nw=$('#'+id+'New'); if(nw) nw.textContent=o.assisted?'Assisted':isNew?'New best':'Best '+fmt(best);
      $('#'+id+'Stats').innerHTML=statsHTML(o.stats); $('#'+id+'P').textContent=o.text||'';
      prepPW(gEl); this.setState('res'); reveal($('.res',el)); S.games++;
      // a finger still tapping the game must not land on the panel that just appeared under it
      el.classList.add('rguard'); clearTimeout(this._rg); this._rg=setTimeout(()=>el.classList.remove('rguard'),750);
    },
    build(){}, enter(){}, exit(){}, update(){}, play(){}, abort(){}
  },impl);
  // the index on the title card follows the order of the stations in orbit
  { const si=STA.findIndex(s=>s.id===id), ix=$('.idx span:first-child',el); if(ix&&si>=0) ix.textContent=String(si+1).padStart(2,'0')+' / '+String(NST).padStart(2,'0'); }
  st.start=()=>{ if(S.mode!=='station'||S.stId!==id) return; const f=document.activeElement; if(f&&f!==document.body&&!f.matches('input,textarea,select')) f.blur(); A.stinger(2); A.whoosh(true,.8,.14); st.play(); };
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
const _tint=new T.Color();
function feedback(shake,ca,tint){ S.shake=Math.max(S.shake,shake||0); S.ca=Math.max(S.ca,ca||0);
  if(tint){ const c=tint.isColor?tint:_tint.setRGB(+tint.x||+tint.r||0,+tint.y||+tint.g||0,+tint.z||+tint.b||0); if(isFinite(c.r+c.g+c.b)) post.uniforms.uTint.value.add(c); } }
function showBanner(el,h,sub){ el.innerHTML=`<span class="ui acc fade">${sub||''}</span><h3 class="disp pw">${h}</h3>`; prepPW($('h3',el)); reveal(el); clearTimeout(el._t); el._t=setTimeout(()=>unreveal(el),1500); }

/* Enter starts the game from a station's title screen */
addEventListener('keydown',e=>{ if(e.code!=='Enter'||e.repeat||S.mode!=='station'||!S.st||S.st.state!=='menu') return; const f=document.activeElement; if(f&&f!==document.body&&f.closest&&f.closest('input,textarea,select,a,button,[role=button]')) return; e.preventDefault(); S.st.start(); });

/* ===== station kr ===== */
/* ================= KRÍOS: READ THE ROOM =================
   A cold call in six turns. The buyer says something; you pick one of three replies before the line goes quiet.
   Each reply moves her trust and interest. The room, a sphere of dots, warms with interest and frays as trust drops.
   The right reply depends on what was just said and on how warm the room is, which is the skill Kríos trains. */
(()=>{
const st=mkStation('kr',{arrive:new T.Vector3(0,1.2,6)});
const el=st.el, q$=s=>$(s,el);

/* ---------- the calls ----------
   R(text, quality, trust change, interest change, coach note): the same in a warm or a cool room.
   RW(text, warm, cool): [quality, trust, interest, note] for each kind of room. Quality 2 good, 1 fair, 0 misread. */
const R=(t,q,a,b,n)=>({t,q:[q,q],d:[[a,b],[a,b]],n:[n,n]});
const RW=(t,w,c)=>({t,q:[w[0],c[0]],d:[[w[1],w[2]],[c[1],c[2]]],n:[w[3],c[3]]});
const CALLS=[
 {name:'Dana Walsh',role:'VP Sales · fintech, 40 reps',pr:'She',
  hang:"I'm going to stop you there. Send me an email.",
  end:["Tuesday works. Send the invite.","Okay. Email me and we'll find a time.","Send me something. I'll have a look."],
  beats:[
  {w:"Dana speaking. I've got about two minutes. Who's this?",r:[
    R("Hi Dana, it's Sam from Kríos. It's a cold call, so I'll be quick. Can I ask you one question?",2,12,8,"Honest about the call and quick to hand her a question. She stays on."),
    R("Hi Dana, Sam from Kríos. We help sales teams practise their calls. Is now a bad time?",1,2,0,"Polite, but 'is now a bad time' invites a yes."),
    R("Kríos is an AI platform where reps rehearse calls against realistic buyers, with scoring and...",0,-6,-10,"A pitch before a single question. She hasn't told you anything yet.")]},
  {w:"Go on. One question.",c:"One question. Quickly.",r:[
    R("How long does a new rep take before they're closing on their own?",2,6,12,"Open, specific, and about her world. The best kind of first question."),
    R("Are you happy with your current sales training?",1,0,3,"A yes or no question. She can end the call with one word."),
    R("Do you actually train your reps at all?",0,-10,-4,"It sounds like an accusation. She bristles.")]},
  {w:"Honestly? Five months. Their first twenty calls are a write-off.",c:"Five months, maybe. That's normal for us.",r:[
    R("What does a written-off call cost you, roughly?",2,6,10,"You had her put a number on the pain. Now it matters to her."),
    R("Kríos can cut that ramp time in half.",1,-4,6,"A claim with no proof. Interesting, but she doesn't believe it yet."),
    R("Five months is pretty good, to be fair.",0,-6,-10,"You just told her she has no problem.")]},
  {w:"We tried role-play. The reps hated it and the managers never had the time.",c:"We tried role-play. It didn't work. Why would this?",r:[
    R("That's what we hear most. What did the reps hate about it?",2,10,6,"You acknowledged it and asked. Objections are questions in disguise."),
    R("With Kríos nobody needs a free manager: reps practise against a buyer any time they like.",1,2,8,"A fair answer, but you skipped finding out why it failed."),
    R("This is different. It's AI.",0,-8,-4,"'It's AI' is not an answer to 'it didn't work'.")]},
  {w:"Being watched, mostly. Nobody wants to fail in front of their manager.",c:"They felt watched. Nobody wants to fail in front of their manager.",r:[
    R("So they'd practise alone, fail in private, and show the manager the run they're proud of?",2,8,12,"You played her words back and tied them to the product. She hears herself in it."),
    R("Our customers ramp about thirty percent faster. I can send you the case study.",1,2,4,"Proof helps, but it isn't about her problem yet."),
    R("Totally. Anyway, pricing starts at forty euro a seat.",0,-10,-8,"Pricing before she's interested. The room goes cold.")]},
  {w:"That's actually our problem. What would trying it look like?",c:"Okay. I need to jump in a minute.",r:[
    RW("Twenty minutes next Tuesday, you and one manager? I'll set it up with your own scripts.",[2,8,10,"She asked what trying it looks like. You gave her a time, a who and a what."],[0,-8,-6,"She was leaving. Asking for her calendar now feels like a grab."]),
    RW("What would need to be true for you to try it with one team?",[1,2,2,"A good question, but she just asked to try it. Say yes and book it."],[2,6,8,"She was on her way out. You found the one thing that would keep the door open."]),
    R("I'll send over a deck and you can have a look in your own time.",1,0,-4,"Safe. Decks get forwarded to the bin.")]}
 ]},
 {name:'Ciarán Byrne',role:'Founder · 12-person startup',pr:'He',
  hang:"Yeah, I'm going to leave it there. Thanks.",
  end:["Thursday at ten. Don't be late.","Fine. Email me and I'll look at a time.","Send me a link. If I'm bored I'll look."],
  beats:[
  {w:"Ciarán here. If this is a sales call, it's a quick no.",r:[
    R("It is a sales call. Give me thirty seconds, then you can say no?",2,14,6,"Honesty disarms him. He gives you the thirty seconds."),
    R("Hi Ciarán, I'm calling from Kríos about AI sales coaching.",1,0,0,"Clear, but you handed him the easy no."),
    R("Oh no, not at all! Just a quick chat about your sales process.",0,-14,-2,"It is a sales call. He knows, and now he doesn't trust you.")]},
  {w:"Ha. Fair. Thirty seconds.",c:"Go on then. Quickly.",r:[
    R("Who closes your deals today: you, or the team?",2,6,10,"The question every founder has an opinion on."),
    R("How big is your sales team at the moment?",1,2,2,"You could have found that on LinkedIn."),
    R("Founders like you love Kríos because it saves so much time.",0,-8,-6,"He hasn't said a word yet. Don't tell him what he loves.")]},
  {w:"Me. Every one. My two reps can't close without me on the call.",c:"Me, mostly. That's how startups work.",r:[
    R("What happens to the pipeline when you're on holiday?",2,6,12,"Now he's picturing the cost of being the only closer."),
    R("So you'd like your reps to close the way you do?",1,4,6,"Right direction, but leading. Let him say it."),
    R("That's not very scalable, though.",0,-8,-6,"True, and he hates hearing it from a stranger.")]},
  {w:"Nothing closes. And I'm not convinced AI can teach anyone to sell like me.",c:"I don't buy that AI can teach selling.",r:[
    R("Fair. It doesn't teach. It lets them rehearse your hardest calls until they stop freezing.",2,10,8,"You agreed with the true part and corrected the rest."),
    R("What would convince you?",1,4,2,"Not bad, but he'll say 'nothing'. Give him something first."),
    R("Our AI is trained on millions of sales calls.",0,-6,-4,"Scale isn't his worry. His way of selling is.")]},
  {w:"Rehearse my calls? With my actual objections?",c:"And I suppose it knows my actual objections, does it?",r:[
    R("Yours. You record the five objections that cost you deals, and they practise against them.",2,8,12,"Concrete, about his calls, in his words."),
    R("It comes with a library of two hundred standard objections.",1,0,2,"Generic. He just told you he isn't generic."),
    R("Definitely! It's super flexible and really powerful.",0,-6,-6,"Adjectives, no answer.")]},
  {w:"Right. Show me. But I want to see it on one of my calls.",c:"I'll think about it.",r:[
    RW("Send me one objection you lost a deal on. I'll have it running for Thursday at ten.",[2,8,10,"He asked to see it. You made it about his call and gave him a date."],[0,-8,-6,"He said he'd think. A date this fast pushes him away."]),
    RW("What would you need to see to stop thinking and try it?",[1,2,2,"He already asked to see it. Book it."],[2,6,8,"You turned 'I'll think about it' into a reason to talk again."]),
    R("No problem, I'll follow up in a few weeks.",1,0,-4,"Polite. A few weeks is a long time to be forgotten.")]}
 ]},
 {name:'Priya Nair',role:'Head of Enablement · SaaS, 120 reps',pr:'She',
  hang:"I'll have to leave it there, sorry. Send something over.",
  end:["Let's do it. I'll bring her in.","Sounds good. Email me some times.","Send something over and I'll see."],
  beats:[
  {w:"Hi, Priya here. Is this about the webinar?",r:[
    R("No, it's a cold call, I'm afraid. It's about coaching at your scale. Have you a minute?",2,12,6,"Honest, and about her job. She gives you the minute."),
    R("Hi Priya, I'm with Kríos. We do practice calls for sales teams.",1,2,2,"Clear enough, but nothing about her yet."),
    R("Yes! Well, sort of. Did you enjoy it?",0,-14,-4,"A small lie. She'll find out in a sentence.")]},
  {w:"Sure, I've a minute. What's on your mind?",c:"A minute. Go on.",r:[
    R("With 120 reps, how many calls do your managers actually get to hear?",2,6,12,"A sharp question, built on what you know about her team."),
    R("What tools are you using for enablement at the moment?",1,2,2,"Fair, but it invites a list, not a problem."),
    R("I'd say your managers are overworked, are they?",0,-6,-2,"Putting words in her mouth. She doesn't like it.")]},
  {w:"Maybe one in fifty. Past that, coaching is guesswork.",c:"Not many. Same as everyone.",r:[
    R("So for forty-nine calls in fifty, nobody knows what the rep did. What does that cost you?",2,6,12,"You did the maths out loud. She's nodding."),
    R("Kríos scores every practice call automatically.",1,0,6,"Relevant, but you jumped to the answer before the pain landed."),
    R("That's a bit worrying, to be honest.",0,-4,-4,"Judging her team won't win her over.")]},
  {w:"I like it, genuinely. But budgets are frozen until the autumn.",c:"Look, budgets are frozen until the autumn anyway.",r:[
    R("Understood. Could a free pilot with one team build the case for the autumn?",2,10,10,"You worked with the freeze instead of against it."),
    R("No problem, I'll call you back in the autumn.",1,2,-6,"Respectful, but you let the momentum go."),
    R("We could do twenty percent off if you sign this month.",0,-8,-4,"A discount doesn't unfreeze a budget. It sounds desperate.")]},
  {w:"A pilot... who would need to sign off on that?",c:"A pilot would still need sign-off.",r:[
    R("Who usually signs off, and what would they want to see from a pilot?",2,8,10,"You mapped the decision with her instead of around her."),
    R("I can send you a one-page pilot plan you can forward on.",1,4,4,"Helpful, but you still don't know who decides."),
    R("Could you not just sign it yourself?",0,-8,-4,"Pushy. She'll protect her boss from you.")]},
  {w:"Our CRO. She'd want numbers after thirty days. I could bring her to a call.",c:"Probably the CRO. Send me something and I'll see.",r:[
    RW("Let's book thirty minutes with you and the CRO next week. I'll bring the pilot plan.",[2,8,10,"She offered the meeting with her boss. You took it, with a plan in hand."],[0,-8,-6,"She said 'send me something'. A meeting with her boss is too big a leap."]),
    RW("What would the CRO need to see to say yes to a free pilot?",[1,2,2,"Good, but she offered you the CRO. Take the meeting."],[2,6,8,"You gave her a reason to go back to the CRO for you."]),
    R("Great, I'll email you a deck.",1,0,-4,"A deck on its own rarely gets forwarded upwards.")]}
 ]}
];
const NB=6, WIN=12, T0={tr:40,in:35};
const warmOf=(tr,i)=>i*.6+tr*.4>=46;

/* ---------- the room: a sphere of dots ---------- */
const RO=1.0, RING=1.42;
const U2={uWarm:{value:.3},uCalm:{value:.5},uSpeak:{value:0},uHit:{value:0},uIn:{value:1},uLo:{value:new T.Color('#A5C3FF')},uHi:{value:new T.Color('#FFB475')}};
const DECL='uniform float uWarm,uCalm,uSpeak,uHit,uIn; uniform vec3 uLo,uHi;';
const orb=new T.Group(); st.scene.add(orb);
{ const N=Math.floor(2600*Q+900);
  orb.add(pts(cloud(N,(i,r,o)=>{ const y=1-2*(i+.5)/N, rr=Math.sqrt(1-y*y), a=i*2.399963; o[0]=Math.cos(a)*rr; o[1]=y; o[2]=Math.sin(a)*rr; }),
    PM({size:.05,color:'#A5C3FF',uniforms:U2,decl:DECL,body:`
      vec3 d=normalize(position);
      float n=sin(d.x*4.1+uTime*1.1)*sin(d.y*5.3-uTime*.9)*sin(d.z*3.7+uTime*.7);
      float fray=1.-uCalm;
      float r=${RO.toFixed(2)}*uIn*(1.+n*(.03+.17*fray)+uSpeak*.045*sin(uTime*19.+aR.x*6.283));
      float loose=step(.8,aR.w)*fray*(.3+.4*(.5+.5*sin(uTime*.7+aR.x*12.)));
      p=d*r*(1.+loose);
      col=mix(uLo,uHi,smoothstep(.2,.95,uWarm));
      col=mix(col,vec3(1.,.34,.21),clamp(-uHit,0.,1.)*.85);
      b=(.26+.5*aR.y)*(.75+.6*uWarm)+clamp(uHit,0.,1.)*.8+uSpeak*.2; b*=1.-loose*.55;
      sz=1.+.5*clamp(abs(uHit),0.,1.);`})));
  // a warm heart that grows with interest
  orb.add(pts(cloud(Math.floor(500*Q+200),(i,r,o)=>{ const v=[gauss(),gauss(),gauss()], l=Math.hypot(...v)||1, R=.1+Math.pow(r[0],1.8)*.6; o[0]=v[0]/l*R; o[1]=v[1]/l*R; o[2]=v[2]/l*R; }),
    PM({size:.06,color:'#A5C3FF',uniforms:U2,decl:DECL,body:'p*=uIn*(.55+.6*uWarm); col=mix(uLo,uHi,uWarm); b=(.12+.45*uWarm)*(.5+.5*aR.y)+uSpeak*.25;'})));
}
/* the call as a dial around the room: six marks, one per turn, lit by how each reply landed */
const dial=new T.Group(); st.scene.add(dial);
const MK=new Float32Array(NB).fill(-1), MKU={uCur:{value:0}};
const mkGeo=cloud(NB,(i,r,o,ex)=>{ const a=Math.PI/2-i*TAU/NB; o[0]=Math.cos(a)*RING; o[1]=Math.sin(a)*RING; o[2]=0; ex.aI[i]=i; ex.aK[i]=-1; },{aI:1,aK:1});
dial.add(pts(mkGeo,PM({size:.2,color:'#A5C3FF',uniforms:MKU,decl:'attribute float aI,aK; uniform float uCur;',body:`
  float cur=1.-step(.5,abs(aI-uCur));
  col=aK<-.5?vec3(.42,.4,.37):(aK<.5?vec3(1.,.34,.21):(aK<1.5?vec3(1.,.76,.57):vec3(.65,.76,1.)));
  b=aK<-.5?(.3+cur*(.55+.45*sin(uTime*5.))):1.25; sz=aK<-.5?(.8+cur*.5):1.25;`})));
{ const rg=new T.LineLoop(ringGeo(RING,240),dashMat('#A5C3FF','float a=.13*step(.5,fract(vAng*9.55));')); rg.rotation.x=Math.PI/2; rg.material.uniforms.uOp.value=1; dial.add(rg); }
const burst=Burst(st.scene,Math.floor(360*Q+120),'#A5C3FF',.06);
st.anchors=[new T.Vector3(0,RING,0),new T.Vector3(RO*.98,-.1,0),new T.Vector3(Math.cos(Math.PI/2-TAU/NB)*RING,Math.sin(Math.PI/2-TAU/NB)*RING,0)];

/* ---------- DOM ---------- */
const E={score:q$('#krScore'),combo:q$('#krCombo'),tr:q$('#krTr'),in:q$('#krIn'),trV:q$('#krTrV'),inV:q$('#krInV'),turn:q$('#krTurn'),who:q$('#krWho'),line:q$('#krLine'),note:q$('#krNote'),
  ops:q$('#krOps'),btns:$$('.krop',el),bar:q$('#krBar'),time:q$('.krtime',el),hint:q$('#krHint')};
const setPh=p=>{ el.dataset.ph=p; };
function meters(g){ E.tr.style.width=g.tr+'%'; E.in.style.width=g.in+'%'; E.tr.classList.toggle('lo',g.tr<25); E.in.classList.toggle('lo',g.in<20);
  E.trV.textContent=Math.round(g.tr); E.inV.textContent=Math.round(g.in); }
function setLine(text){ E.line.classList.remove('out'); E.line.textContent=''; const ws=text.split(' ');
  ws.forEach((w,i)=>{ const s=document.createElement('span'); s.className='kw'; s.textContent=w; E.line.appendChild(s); if(i<ws.length-1) E.line.appendChild(document.createTextNode(' ')); });
  E.line.setAttribute('aria-label',text); return $$('.kw',E.line); }
function noteShow(q,label,text,pts){ E.note.dataset.q=q; E.note.innerHTML=`<b>${label}</b>${text}${pts?`<em>+${fmt(pts)}</em>`:''}`; E.note.classList.add('on'); }
function noteHide(){ E.note.classList.remove('on'); }

/* ---------- the game ---------- */
let game=null, lastCall=-1;
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function newGame(){
  let ci=Math.floor(Math.random()*CALLS.length); if(ci===lastCall) ci=(ci+1)%CALLS.length; lastCall=ci;
  return {c:CALLS[ci],bi:-1,tr:T0.tr,in:T0.in,ph:'ring',t:0,words:[],wi:0,wt:0,order:[0,1,2],warm:false,score:0,shown:0,streak:0,good:0,qs:0,dead:0,rts:[],worst:null,hung:false,outcome:-1,pick:-1};
}
function startBeat(g,i){
  g.bi=i; g.ph='line'; g.t=0; g.wi=0; g.wt=0; g.pick=-1; const b=g.c.beats[i];
  g.warm=warmOf(g.tr,g.in); g.words=setLine(g.warm||!b.c?b.w:b.c); // the last coach note stays up while this line types in
  E.ops.classList.remove('in'); E.btns.forEach(x=>{ x.classList.remove('pick','dim','best'); x.removeAttribute('data-q'); });
  E.turn.textContent=`Turn ${i+1} / ${NB}`; MKU.uCur.value=i; setPh('line'); E.hint.textContent='';
}
function showOptions(g){
  const b=g.c.beats[g.bi]; g.order=shuffle([0,1,2]);
  E.btns.forEach((x,k)=>{ const r=b.r[g.order[k]]; $('span',x).textContent=r.t; x.setAttribute('aria-label',`Reply ${k+1}: ${r.t}`); });
  noteHide(); void E.ops.offsetWidth; E.ops.classList.add('in'); g.ph='pick'; g.t=0; setPh('pick'); A.tick();
  E.hint.textContent=FINE?'Pick a reply · keys 1, 2, 3':''; E.time.classList.remove('low'); E.bar.style.transform='scaleX(1)';
}
function choose(g,k){
  if(!g||g.ph!=='pick') return;
  const b=g.c.beats[g.bi], wi=g.warm?0:1, rt=g.t; let q, dt_, din, note, label;
  if(k<0){ q=0; dt_=-10; din=-6; note='On a cold call, silence reads as doubt.'; label='Dead air'; g.dead++; A.buzz(); }
  else { const r=b.r[g.order[k]]; q=r.q[wi]; [dt_,din]=r.d[wi]; note=r.n[wi]; label=['Misread','Fair','Good read'][q]; g.pick=k; if(/\?\s*$/.test(r.t)) g.qs++; g.rts.push(rt); }
  g.tr=clamp(g.tr+dt_,0,100); g.in=clamp(g.in+din,0,100);
  // points: the read, a little for speed, more for a run of good reads
  let pts=0; if(q===2){ g.streak++; g.good++; } else g.streak=0;
  if(q>0){ const spd=Math.round(100*clamp(1-(rt-1.2)/7,0,1)); pts=Math.round(([0,120,300][q]+spd)*(q===2?1+.25*Math.min(g.streak-1,4):1)); g.score+=pts; }
  if(q===0&&!g.worst) g.worst={i:g.bi,n:note};
  // what the room does
  MK[g.bi]=k<0?0:q; mkGeo.attributes.aK.array[g.bi]=MK[g.bi]; mkGeo.attributes.aK.needsUpdate=true;
  U2.uHit.value=q===2?1:q===0?-1:.35;
  if(q===2){ A.chime(10+Math.min(g.streak,5)); A.chime(14+Math.min(g.streak,5),.08,.03); burst.emit(tv0.set(0,0,0),Math.floor(40*Q+14),1.6,COL.warm.clone().lerp(COL.ice,1-g.in/100),.2,1.1); feedback(.04,.3); }
  else if(q===1){ A.blip(); }
  else { A.buzz(); feedback(.18,.9,COL.red); }
  // the cards
  E.btns.forEach((x,i)=>{ if(i===k){ x.classList.add('pick'); x.dataset.q=q; } else x.classList.add('dim'); });
  if(q<2){ const bi=[0,1,2].find(i=>b.r[g.order[i]].q[wi]===2); if(bi!==undefined) E.btns[bi].classList.add('best'),E.btns[bi].classList.remove('dim'); }
  noteShow(q,label,note,pts); meters(g); E.combo.textContent=g.streak>1?`${g.streak} good reads in a row`:'';
  E.time.classList.remove('low'); g.ph='show'; g.t=0; setPh('show'); E.hint.textContent=FINE?'Space to skip ahead':'';
  if(g.bi>=1&&g.tr<=8) g.hung=true;
}
function next(g){
  if(!g||g.ph!=='show'||g.t<.25) return;
  if(g.hung||g.bi>=NB-1){ finish(g); return; }
  startBeat(g,g.bi+1);
}
function finish(g){
  const R=(g.tr+g.in)/2, last=MK[NB-1];
  g.outcome=g.hung?3:(R>=72&&last===2)?0:R>=54?1:R>=34?2:3;
  g.ph='end'; g.t=0; setPh('end'); noteHide(); E.ops.classList.remove('in'); E.hint.textContent='';
  g.words=setLine(g.outcome===3?g.c.hang:g.c.end[g.outcome]); g.wi=0; g.wt=0;
  if(g.outcome===3){ A.beep(330); setTimeout(()=>A.beep(250),260); } else if(g.outcome===0) A.chord(); else A.pop();
}
function results(g){
  const bonus=[600,300,100,0][g.outcome]; const total=g.score+bonus;
  const grade=['Demo booked','Follow-up set','Send an email',g.c.pr+' hung up'][g.outcome];
  const avg=g.rts.length?g.rts.reduce((a,b)=>a+b,0)/g.rts.length:0, turns=g.bi+1;
  const lines=[];
  if(g.outcome===0) lines.push(`${g.c.name.split(' ')[0]} booked the demo.`);
  if(g.worst) lines.push(`Turn ${g.worst.i+1}: ${g.worst.n}`);
  else if(g.dead) lines.push(`You went quiet ${g.dead===1?'once':g.dead+' times'}. On a call, silence reads as doubt.`);
  else if(g.outcome!==0) lines.push('No misreads, but the room never got warm enough to ask for the meeting.');
  lines.push('Kríos lets reps rehearse calls like this against a buyer who answers back, before a real one hears them.');
  st.result({grade,score:total,stats:[['Good reads',`${g.good} / ${turns}`],['Avg reply time',avg?avg.toFixed(1)+' s':'None'],['Questions asked',g.qs],
    ['Trust at the end',Math.round(g.tr)+'%'],['Interest at the end',Math.round(g.in)+'%'],['Dead air',g.dead]],text:lines.join(' ')});
}
const COL={ice:new T.Color('#A5C3FF'),warm:new T.Color('#FFB475'),red:new T.Color(.06,.01,0)}, tv0=new T.Vector3();

/* ---------- input ---------- */
E.btns.forEach((x,k)=>x.addEventListener('click',()=>{ if(game&&game.ph==='pick'&&S.stId==='kr'&&st.state==='play') choose(game,k); }));
addEventListener('keydown',e=>{
  if(S.stId!=='kr'||S.mode!=='station'||st.state!=='play'||!game||e.repeat) return;
  const n={Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2}[e.code];
  if(n!==undefined&&game.ph==='pick'){ e.preventDefault(); choose(game,n); return; }
  if((e.code==='Space'||e.code==='Enter')){ e.preventDefault(); if(game.ph==='show') next(game); else if(game.ph==='line') skipLine(game); }
});
st.onPointer=e=>{ if(st.state!=='play'||!game) return; if(game.ph==='show') next(game); else if(game.ph==='line') skipLine(game); };
// a tap anywhere outside the cards lands on the canvas (the HUD lets it through), so phones never need to aim
function skipLine(g){ if(g.wi<g.words.length){ g.words.forEach(w=>w.classList.add('on')); g.wi=g.words.length; g.wt=-.15; } }

/* ---------- lifecycle ---------- */
function resetDial(){ MK.fill(-1); mkGeo.attributes.aK.array.fill(-1); mkGeo.attributes.aK.needsUpdate=true; MKU.uCur.value=-9; }
st.play=function(){
  game=newGame(); resetDial(); MKU.uCur.value=0; shownScore=0; st.setState('play'); setPh('ring');
  E.score.textContent='0'; E.combo.textContent=''; E.turn.textContent=`Turn 1 / ${NB}`; meters(game); noteHide(); E.ops.classList.remove('in');
  E.who.textContent=`${game.c.name} · ${game.c.role}`; setLine('Calling '+game.c.name.split(' ')[0]+'...'); game.words.forEach(w=>w.classList.add('on'));
  E.hint.textContent=''; A.beep(440); setTimeout(()=>{ if(game&&game.ph==='ring') A.beep(440); },420);
};
st.abort=function(){ game=null; setPh('idle'); E.ops.classList.remove('in'); noteHide(); resetDial(); };
st.enter=function(){ U2.uIn.value=0; resetDial(); setPh('idle'); layout(true); };
st.exit=function(){ game=null; };
let lay=null;
function layout(force){ const n=NARROW(), key=n+'|'+st.state; if(!force&&key===lay) return; lay=key; const play=st.state!=='menu';
  // in a call the room sits in the gap between the buyer's line and the replies
  if(n){ if(play){ st.camP.set(0,.85,16.5); st.camL.set(0,.8,0); } else { st.camP.set(0,.35,12.5); st.camL.set(0,-.15,0); } }
  else { if(play){ st.camP.set(0,.6,11.6); st.camL.set(0,.56,0); } else { st.camP.set(0,.35,7.6); st.camL.set(0,-.5,0); } } }

let shownScore=0;
st.update=function(dt,t){
  layout(false);
  const g=game, play=st.state==='play'&&g;
  // the room breathes on the title screen; in a call it follows trust and interest
  const wT=play?g.in/100:.32+.18*Math.sin(t*.35), cT=play?g.tr/100:.62+.12*Math.sin(t*.27);
  U2.uWarm.value=damp(U2.uWarm.value,wT,1.8,dt); U2.uCalm.value=damp(U2.uCalm.value,cT,1.8,dt);
  U2.uIn.value=damp(U2.uIn.value,1,2.2,dt); U2.uSpeak.value=Math.max(0,U2.uSpeak.value-dt*3.2); U2.uHit.value=damp(U2.uHit.value,0,2.4,dt);
  orb.rotation.y=t*.07; orb.rotation.x=Math.sin(t*.13)*.12; dial.rotation.z=play?0:Math.sin(t*.2)*.04;
  if(!play&&st.state==='menu'&&Math.sin(t*1.7)>.985) U2.uSpeak.value=Math.max(U2.uSpeak.value,.5);
  burst.update(dt,0,1.6);
  if(play){
    g.t+=dt;
    if(g.ph==='ring'&&g.t>1.2){ A.blip(); startBeat(g,0); }
    else if(g.ph==='line'||g.ph==='end'){
      g.wt+=dt; const step=g.ph==='end'?.09:.055;
      while(g.wi<g.words.length&&g.wt>=step){ g.wt-=step; g.words[g.wi++].classList.add('on'); U2.uSpeak.value=1; if(g.wi%2) A.key(); }
      if(g.wi>=g.words.length){ if(g.ph==='line'&&g.wt>.15) showOptions(g); if(g.ph==='end'&&g.wt>1.5){ const gg=g; game=null; setPh('idle'); results(gg); } }
    }
    else if(g.ph==='pick'){
      const left=WIN-g.t; E.bar.style.transform=`scaleX(${Math.max(0,left/WIN).toFixed(4)})`;
      if(left<4&&!E.time.classList.contains('low')){ E.time.classList.add('low'); }
      if(left<3.5&&Math.floor(left)!==Math.floor(left+dt)) A.tick();
      if(left<=0) choose(g,-1);
    }
    else if(g.ph==='show'&&g.t>1.3) next(g);
    if(game){ shownScore=Math.abs(game.score-shownScore)<1?game.score:lerp(shownScore,game.score,1-Math.exp(-8*dt)); E.score.textContent=fmt(shownScore); }
  }
  if(st.state==='menu') notesUpdate(st);
};
st.build=function(){ resetDial(); };
/* test hook: the current call, and which card is the good read */
st._dbg={get game(){ return game; }, best(){ const g=game; if(!g||g.ph!=='pick') return -1; const wi=g.warm?0:1, b=g.c.beats[g.bi]; return [0,1,2].find(k=>b.r[g.order[k]].q[wi]===2); }};
})();

/* ===== station ae ===== */
/* ================= AETOS: HOLD THE SKY =================
   Counter-drone command. One picture of the airspace: a radar scope drawn in a shader over a contour map,
   quadcopter contacts with screen-space track symbology, interceptors on proportional navigation, a jammer.
   The loop is the game: detect, identify, decide, act. */
(()=>{
const st=mkStation('ae',{arrive:new T.Vector3(0,5,7)});
const sc=st.scene, el=st.el;
const KM=1.2, RS=5*KM, SPAWN=RS-.12, GR=11.5, LR=7.6;          // 1 km in world units, scope radius, ground radius, label map half size
const MAXD=48, MAXG=8, MAXM=12, AMMO=6, RELOAD=1.25, JAMCD=10, JAMR=5.4, SWEEP=2.6, NB=36, NR=10, TL=26;
const COL={ink:new T.Color('#F2EEE6'),unk:new T.Color('#B5AFA3'),hos:new T.Color('#FF5636'),fri:new T.Color('#A5C3FF')};
const CLN={unk:0,hos:1,fri:2};
const TYPES={
  scout:{spd:.92,hp:1,sc:.82,pts:100,dmg:.34,name:'Scout',alt:.95},
  swarm:{spd:.58,hp:1,sc:.56,pts:60,dmg:.14,name:'Swarm',alt:.72},
  heavy:{spd:.5,hp:2,sc:1.4,pts:250,dmg:.5,name:'Heavy',alt:1.15},
  friend:{spd:.72,hp:1,sc:.9,pts:-400,dmg:0,name:'Friend',alt:1.65}};
const WAVES=[
  {name:'Scouts inbound',dur:22,bag:{scout:9,friend:4}},
  {name:'Swarms inbound',dur:24,bag:{scout:6,friend:3,swarm:5}},
  {name:'Heavies inbound',dur:26,bag:{scout:6,friend:3,swarm:4,heavy:5}}];
const SITES=[
  {name:'Substation',p:new T.Vector3(2.35,0,1.15),hp:1,hitT:-99,thr:0},
  {name:'Airfield',p:new T.Vector3(-2.45,0,.75),hp:1,hitT:-99,thr:0},
  {name:'Water works',p:new T.Vector3(.35,0,-2.55),hp:1,hitT:-99,thr:0}];
const brg=(x,z)=>{ const b=Math.atan2(x,-z); return b<0?b+TAU:b; };   // compass bearing, clockwise from north (-z)
const id3=n=>'T-'+String(n%1000).padStart(3,'0');

let clk=0, sw=0, game=null, nextId=1, tblT=0, attractT=2, lastIdS=0, layoutKey='', menuDemo=null, aimOn=false, hintT=0;
const V=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3(), V4=new T.Vector3(), V5=new T.Vector3();
const M4=new T.Matrix4(), M5=new T.Matrix4(), Qn=new T.Quaternion(), EU=new T.Euler(), SCL=new T.Vector3(), ZF=new T.Vector3(0,0,1), TC=new T.Color();

/* pools: contacts, swarm groups, interceptors, scope paints, ground events */
const D=[...Array(MAXD)].map((_,i)=>({i,on:false,p:new T.Vector3(),v:new T.Vector3(),q:new T.Quaternion(),goal:new T.Vector3(),off:new T.Vector3(),
  type:'scout',cls:'unk',hp:1,id:0,site:0,grp:null,ph:0,yaw:0,yawR:0,roll:0,pitch:0,jam:0,jamHit:false,fall:false,vy:0,spin:0,eng:0,idT:-1,reacted:false,
  demo:false,loiter:false,tk:null,sx:0,sy:0,vis:false,hov:false,rowHov:false,tti:99,flash:0,dmgT:-9,age:0}));
const GP=[...Array(MAXG)].map(()=>({on:false,c:new T.Vector3(),v:new T.Vector3(),site:0,id:0,n:0,ph:0,tk:null,cls:'unk',alt:.72,sx:0,sy:0,vis:false,lead:null,tti:99}));
const MS=[...Array(MAXM)].map(()=>({on:false,live:false,demo:false,p:new T.Vector3(),v:new T.Vector3(),tgt:null,t:0,lost:0,fade:1,tr:new Float32Array(TL*3),trN:0,d0:1,k:0}));
const PB=[...Array(NB)].map(()=>new T.Vector4(0,0,-99,0)); let pbI=0;
const RG=[...Array(NR)].map(()=>new T.Vector4(0,0,-99,0)); let rgI=0;
function paintAt(x,z,c){ PB[pbI].set(x,z,clk,c); pbI=(pbI+1)%NB; }
function ringAt(x,z,type){ RG[rgI].set(x,z,clk,type); rgI=(rgI+1)%NR; }

/* ---------- DOM: track symbols, site labels, table rows, pips ---------- */
const marks=$('#aeMarks'), pops=$('#aePops'), rowsEl=$('#aeRows'), banner=$('#aeBanner'), pipsEl=$('#aePips'), jamB=$('#aeJam'), jamP=$('#aeJamP'), jamTx=$('#aeJamT'),
  warnEl=$('#aeWarn'), warnT=$('#aeWarnT'), scoreEl=$('#aeScore'), waveEl=$('#aeWave'), waveN=$('#aeWaveN'), waveM=$('#aeWaveM'), cntEl=$('#aeCount'), hintEl=$('#aeHint');
const SYM='<svg class="sym" viewBox="-12 -12 24 24" aria-hidden="true"><path class="u" d="M-8-8H8V8H-8Z"/><path class="h" d="M0-10.5 10.5 0 0 10.5-10.5 0Z"/><circle class="f" r="9"/><path class="g" d="M-11-5V-11H-5M5-11H11V-5M11 5V11H5M-5 11H-11V5"/></svg>';
const TK=[...Array(44)].map(()=>{ const e=document.createElement('div'); e.className='ae-trk';
  e.innerHTML=SYM+'<i class="ldr"></i><i class="ret"></i><span class="lb"><b></b><span></span></span>'; marks.appendChild(e);
  return {e,ldr:e.querySelector('.ldr'),ret:e.querySelector('.ret'),b:e.querySelector('.lb b'),s:e.querySelector('.lb span'),free:true,cls:'',txt:'',id:'',shown:false}; });
function takeTK(mini,grp){ for(const t of TK) if(t.free){ t.free=false; t.cls=''; t.txt=''; t.id=''; t.mini=!!mini; t.grp=!!grp; t.shown=false; return t; } return null; }
function dropTK(t){ if(!t) return; t.free=true; t.e.style.display='none'; t.shown=false; t.e.className='ae-trk'; t.cls=''; }
const SL=SITES.map(s=>{ const e=document.createElement('div'); e.className='ae-site'; e.innerHTML=`<span class="n">${s.name}</span><span class="bar"><i></i></span>`; marks.appendChild(e); return {e,bar:$('.bar i',e),k:'',hp:-1}; });
const PIPS=[...Array(AMMO)].map(()=>{ const i=document.createElement('i'), b=document.createElement('b'); i.appendChild(b); pipsEl.appendChild(i); return {i,b,k:''}; });
const ROWS=[...Array(8)].map(()=>{ const b=document.createElement('button'); b.type='button'; b.className='ae-row'; b.hidden=true; b.dataset.key='ok'; b.dataset.cur='Engage';
  b.innerHTML='<span class="t"></span><span class="c"></span><span class="r"></span><span class="x"></span>'; rowsEl.appendChild(b);
  const r={b,t:b.children[0],c:b.children[1],r:b.children[2],x:b.children[3],d:null,g:null,k:'',cls:'',hov:false};
  b.addEventListener('click',()=>rowEngage(r));
  b.addEventListener('pointerenter',()=>{ r.hov=true; }); b.addEventListener('pointerleave',()=>{ r.hov=false; });
  return r; });
const HUD={score:'',wave:'',waveN:'',cnt:'',jam:'',jamCls:'',jamOff:-1,warn:'',warnOn:false,pipOut:false};

/* ---------- ground: contour map + radar scope, one shader ----------
   Lines are antialiased in pixel space: a world distance is divided by how far one pixel reaches along the line's normal. */
const GROUND_F=`
uniform float uNow,uSw,uLab,uBoot;
uniform vec4 uB[${NB}]; uniform vec4 uR[${NR}]; uniform vec4 uSite[3]; uniform vec3 uThr; uniform vec2 uJam;
uniform vec3 uInk,uHos,uFri,uUnk; uniform sampler2D tLab,tH;
varying vec2 vP;
#define KM ${KM.toFixed(4)}
#define RS ${RS.toFixed(4)}
#define GR ${GR.toFixed(4)}
#define LR ${LR.toFixed(4)}
#define TAU 6.2831853
float h21(vec2 p){ p=fract(p*vec2(233.34,851.73)); p+=dot(p,p+23.45); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
float pxw(vec2 n,vec2 jx,vec2 jy){ return max(length(vec2(dot(jx,n),dot(jy,n))),1e-5); }
float ln(float dpx,float w){ return clamp(w+.5-dpx,0.,1.); }
float band(float x,float a,float b,float g){ return clamp((x-a)/g+.5,0.,1.)*clamp((b-x)/g+.5,0.,1.); }
void main(){
  vec2 p=vP; float r=length(p);
  float fade=smoothstep(GR,RS+1.4,r);
  if(fade<=0.) discard;
  vec2 jx=dFdx(p), jy=dFdy(p);
  vec2 rn=p/max(r,1e-4), tn=vec2(-rn.y,rn.x);
  float gR=pxw(rn,jx,jy), gT=pxw(tn,jx,jy);
  float br=atan(p.x,-p.y); if(br<0.) br+=TAU;
  float dA=mod(uSw-br,TAU);
  float inS=band(r,0.,RS,gR);
  float glow=exp(-dA*2.3)*inS;
  // terrain: a noise heightfield (baked once into tH) drawn as contour lines, index contour every fifth
  float h=texture2D(tH,p/(2.*GR)+.5).r;
  float c=h*17., fc=max(fwidth(c),1e-4);
  float cl=ln(abs(fract(c-.5)-.5)/fc,.05), ci=ln(abs(fract(c/5.-.5)-.5)*5./fc,.3);
  float cfade=1.-smoothstep(.35,1.1,fc);
  vec3 col=vec3(.016,.015,.013)+vec3(.010,.009,.008)*smoothstep(.35,.8,h);
  float boot=smoothstep(r-.8,r,uBoot*(GR+1.));            // the scope draws itself outward when you arrive
  col+=uInk*(cl*.03+ci*.045)*cfade*(1.+glow*3.5)*boot;
  // scope: range rings, ticks, spokes, sweep with phosphor afterglow
  if(r<RS+.8){
    float rk=r/KM;
    float ring=ln(abs(fract(rk+.5)-.5)*KM/gR,.2)*step(.5,rk)*step(rk,4.5);
    float outer=ln(abs(r-RS)/gR,.45);
    float a5=abs(fract(br/(TAU/72.)+.5)-.5)*(TAU/72.)*r, a10=abs(fract(br/(TAU/36.)+.5)-.5)*(TAU/36.)*r, a30=abs(fract(br/(TAU/12.)+.5)-.5)*(TAU/12.)*r;
    float tk=ln(a5/gT,.1)*band(r,RS,RS+.07,gR)*.55+ln(a10/gT,.2)*band(r,RS,RS+.17,gR)+ln(a30/gT,.3)*band(r,RS-.14,RS+.3,gR);
    float spoke=ln(a30/gT,.08)*band(r,.5*KM,RS,gR);
    float cross=ln(abs(p.x)/pxw(vec2(1.,0.),jx,jy),.1)*band(r,.1,.32,gR)+ln(abs(p.y)/pxw(vec2(0.,1.),jx,jy),.1)*band(r,.1,.32,gR);
    float sA=dA>3.14159?dA-TAU:dA;
    float sl=ln(abs(r*sin(sA))/gT,.45)*step(abs(sA),1.)*inS;
    float clut=glow>.02?smoothstep(.78,.97,vn(p*15.+floor(uNow*7.)*7.3))*glow:0.;
    float edge=exp(-abs(r-uBoot*(GR+1.))*6.)*(1.-uBoot);
    col+=uInk*(ring*.17+outer*.42+tk*.34+spoke*.055+cross*.25+sl*1.05)*boot+uInk*(glow*.045*smoothstep(0.,RS,r)+clut*.1+edge*.5);
    vec2 luv=vec2(p.x,-p.y)/(2.*LR)+.5;
    col+=uInk*texture2D(tLab,luv).r*uLab*boot;
    // blips: each paint flares when the sweep passes, then decays with phosphor persistence
    for(int i=0;i<${NB};i++){
      vec4 b=uB[i]; vec2 d=p-b.xy;
      if(abs(d.x)>.55||abs(d.y)>.55) continue;
      float age=uNow-b.z; if(age<0.||age>14.) continue;
      vec2 bn=normalize(b.xy+vec2(1e-4)); float dr=dot(d,bn), dt=dot(d,vec2(-bn.y,bn.x));
      float core=exp(-dr*dr/.0022-dt*dt/.011), halo=exp(-dot(d,d)/.07);
      float k=exp(-age*1.9)+.26*exp(-age*.36);
      vec3 cc=b.w<.5?uUnk:(b.w<1.5?uHos:uFri);
      col+=mix(cc,vec3(1.,.97,.93),exp(-age*4.)*.55)*(core*1.5+halo*.14)*k;
    }
  }
  // the three defended sites: dashed keep-out ring, threat and hit pulses
  for(int i=0;i<3;i++){
    vec4 s=uSite[i]; vec2 d=p-s.xy; float rr=length(d); float ha=uNow-s.w; bool hit=ha>0.&&ha<1.8;
    if(rr>.75&&!hit) continue;
    vec2 en=d/max(rr,1e-4); float g=pxw(en,jx,jy);
    float thr=uThr[i], alive=step(.001,s.z);
    vec3 rc=mix(uInk,uHos,max(thr,1.-alive));
    float ring=0.;
    if(abs(rr-.64)<.1) ring=ln(abs(rr-.64)/g,.3)*step(.45,fract(atan(d.y,d.x)/TAU*30.+uNow*.05))*(.3+thr*(.5+.4*sin(uNow*14.)));
    float inner=ln(abs(rr-.5)/g,.12)*.07*alive;
    float fill=smoothstep(.64,.2,rr)*(.02+thr*.05);
    float pulse=hit?ln(abs(rr-(.64+ha*1.15))/g,.7)*exp(-ha*2.)+smoothstep(.7,0.,rr)*exp(-ha*3.)*.25:0.;
    col+=rc*(ring+inner+fill)+uHos*pulse;
  }
  // ground events: intercept, site hit, impact, launch
  for(int i=0;i<${NR};i++){
    vec4 e=uR[i]; float age=uNow-e.z; if(age<0.||age>2.6) continue;
    vec2 d=p-e.xy; float rr=length(d); if(rr>3.6&&e.w<3.5) continue;
    float R, a; vec3 cc;
    if(e.w<.5){ R=.06+age*1.9; a=exp(-age*2.4); cc=uInk; }
    else if(e.w<1.5){ R=.3+age*1.3; a=exp(-age*1.5); cc=uHos; }
    else if(e.w<2.5){ R=.04+age*.8; a=exp(-age*2.8); cc=uUnk; }
    else if(e.w<3.5){ R=.1+age*1.4; a=exp(-age*3.2); cc=uInk; }
    else { R=age*8.; a=.7*exp(-age*1.2)*step(rr,RS+.2); cc=uInk; }
    float g=pxw(d/max(rr,1e-4),jx,jy);
    col+=cc*a*(ln(abs(rr-R)/g,.45)*.95+exp(-abs(rr-R)*12.)*.14);
  }
  // jammer front
  if(uJam.y>0.){ float d=abs(r-uJam.x); col+=uFri*uJam.y*(ln(d/gR,.7)+exp(-d*4.)*.3+step(r,uJam.x)*.035); }
  gl_FragColor=vec4(col*fade,1.);
}`;
const GROUND_V=`varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }`;

/* ---------- materials ---------- */
const INST_V=`
#ifdef USE_INSTANCING
  p=instanceMatrix*p; n=mat3(instanceMatrix)*n;
#endif
#ifdef USE_INSTANCING_COLOR
  vC=instanceColor;
#endif
`;
// contacts: dark airframe, class colour on the rim, a soft top light
const droneMat=new T.ShaderMaterial({uniforms:{uBase:{value:new T.Color('#4a453e')}},
  vertexShader:`varying vec3 vN,vW,vC; void main(){ vec4 p=vec4(position,1.); vec3 n=normal; vC=vec3(1.); ${INST_V}
    vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(mat3(modelMatrix)*n); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform vec3 uBase; varying vec3 vN,vW,vC; void main(){ vec3 n=normalize(vN), V=normalize(cameraPosition-vW);
    float up=n.y*.5+.5, fr=pow(1.-abs(dot(n,V)),2.);
    gl_FragColor=vec4(uBase*(.18+.82*up*up)+vC*(.12+fr*1.25),1.); }`});
// rotor discs: two blurred blades turning, per-instance phase and direction
const RRAD=.085;
const rotorMat=new T.ShaderMaterial({uniforms:{uT:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`attribute float aSp; varying vec2 vL; varying float vSp; varying vec3 vC; void main(){ vec4 p=vec4(position,1.); vec3 n=vec3(0.,1.,0.); vC=vec3(1.); vL=position.xz/${RRAD}; vSp=aSp; ${INST_V}
    gl_Position=projectionMatrix*viewMatrix*modelMatrix*p; }`,
  fragmentShader:`uniform float uT; varying vec2 vL; varying float vSp; varying vec3 vC; void main(){ float r=length(vL); if(r>1.) discard;
    float a=atan(vL.y,vL.x), dir=vSp>.5?1.:-1.;
    float bl=pow(abs(cos(a-uT*41.*dir-vSp*9.)),22.);
    float disc=smoothstep(1.,.78,r)*smoothstep(.1,.28,r), rim=smoothstep(.08,0.,abs(r-.93));
    gl_FragColor=vec4(mix(vec3(.95,.92,.88),vC,.5)*(bl*disc*.5+disc*.06+rim*.2),1.); }`});
// point lights (nav lights, ground feet, exhaust): size in world units
const ptMat=new T.ShaderMaterial({uniforms:{uPx:G.uPx},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`uniform float uPx; attribute vec3 aC; attribute float aS; varying vec3 vC; void main(){ vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS>0.?clamp(aS*uPx/-mv.z,1.5,64.):0.; }`,
  fragmentShader:`varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vC*(exp(-d*d*30.)*1.3+exp(-d*d*7.)*.22),1.); }`});
// soft puffs: smoke, flashes, muzzle blasts. aP = (progress, start size, end size, opacity)
const puffMat=new T.ShaderMaterial({uniforms:{uPx:G.uPx},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`uniform float uPx; attribute vec4 aP; attribute vec3 aC; varying vec3 vC; varying float vA; void main(){ vC=aC;
    if(aP.x>=1.){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=0.; vA=0.; return; }
    vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(mix(aP.y,aP.z,sqrt(aP.x))*uPx/-mv.z,1.,180.); vA=aP.w*(1.-aP.x)*(1.-aP.x)*smoothstep(0.,.05,aP.x); }`,
  fragmentShader:`varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(vC*vA*a*a,1.); }`});
// lit edges for the structures: brighter toward the top, red when hit
const edgeMat=()=>new T.ShaderMaterial({uniforms:{uC:{value:new T.Color('#F2EEE6')},uHit:{value:0},uDead:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`varying float vY; void main(){ vec4 w=modelMatrix*vec4(position,1.); vY=w.y; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform vec3 uC; uniform float uHit,uDead; varying float vY; void main(){ vec3 red=vec3(1.,.34,.21);
    vec3 c=mix(uC,red,clamp(max(uHit,uDead*.85),0.,1.)); float b=(.38+.75*clamp(vY/.32,0.,1.))*(1.+uHit*1.6)*(1.-uDead*.45);
    gl_FragColor=vec4(c*b,1.); }`});
const faceMat=new T.MeshBasicMaterial({color:0x0b0a09,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
// jammer wall: a thin curtain that rides the expanding front
const jamWallMat=new T.ShaderMaterial({uniforms:{uA:{value:0},uT:G.uTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform float uA,uT; varying vec2 vU; void main(){ float y=vU.y; float s=.55+.45*sin(vU.x*6.2831*90.+uT*6.)*sin(y*40.-uT*9.);
    gl_FragColor=vec4(vec3(.65,.76,1.)*uA*pow(1.-y,3.)*s*.32,1.); }`});
const lineMat=new T.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending});

/* ---------- geometry helpers ---------- */
function merge(list){ // non-indexed merge of position + normal
  let n=0; const parts=list.map(g=>{ const b=g.index?g.toNonIndexed():g; n+=b.attributes.position.count; return b; });
  const P=new Float32Array(n*3), N=new Float32Array(n*3); let o=0;
  parts.forEach(b=>{ P.set(b.attributes.position.array,o*3); N.set(b.attributes.normal.array,o*3); o+=b.attributes.position.count; });
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); g.setAttribute('normal',new T.BufferAttribute(N,3)); return g;
}
function at(g,x,y,z,ry,rx,rz){ if(rx) g.rotateX(rx); if(rz) g.rotateZ(rz); if(ry) g.rotateY(ry); g.translate(x,y,z); return g; }
// a structure: dark faces with lit edges. parts: geometries already placed
function structure(parts,mat){ const grp=new T.Group(); parts.forEach(g=>{ grp.add(new T.Mesh(g,faceMat)); grp.add(new T.LineSegments(new T.EdgesGeometry(g,30),mat)); }); return grp; }
// quadcopter: body, canopy, four arms, motor pods, a camera gimbal at the front (+z)
function quadGeo(){
  const L=[]; const arm=.2;
  L.push(at(new T.CylinderGeometry(.07,.085,.045,8),0,0,0,Math.PI/8));
  L.push(at(new T.CylinderGeometry(.045,.06,.03,8),0,.035,0,Math.PI/8));
  [Math.PI/4,-Math.PI/4].forEach(a=>L.push(at(new T.BoxGeometry(arm*2.15,.018,.022),0,.004,0,a)));
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([x,z])=>L.push(at(new T.CylinderGeometry(.022,.02,.04,8),x*arm*.72,.012,z*arm*.72)));
  L.push(at(new T.SphereGeometry(.024,8,6),0,-.03,.06));
  [-1,1].forEach(x=>L.push(at(new T.BoxGeometry(.008,.05,.008),x*.05,-.04,0)));
  L.push(at(new T.BoxGeometry(.13,.006,.008),0,-.065,0));
  return merge(L);
}
const ARM=.2*.72, ROTY=.04;
const ROT_LOCAL=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,z])=>new T.Matrix4().makeTranslation(x*ARM,ROTY,z*ARM));
function missileGeo(){
  const L=[]; L.push(at(new T.CylinderGeometry(.016,.016,.15,8),0,0,0,0,Math.PI/2));
  L.push(at(new T.ConeGeometry(.016,.05,8),0,0,.1,0,Math.PI/2));
  L.push(at(new T.BoxGeometry(.07,.003,.03),0,0,-.06)); L.push(at(new T.BoxGeometry(.003,.07,.03),0,0,-.06));
  return merge(L);
}

/* ---------- build: ground, command post, sites, contacts, interceptors, effects ---------- */
let GU, labCv, labCx, labTex, labMode=-1, cpAnt, cpMat, inst, rot, rotSp, lights, lP, lC, lS, drops, dP, dC, msl, trails, tP, tC, puffs, pP, pA, pC, pV, pL, pI=0, debris, jamWall;
const NL=MAXD*3+MAXM+1;
function drawLabels(mob){
  if(!labCx||labMode===+mob) return; labMode=+mob;
  const N=labCv.width, k=N/(2*LR), x=labCx; x.fillStyle='#000'; x.fillRect(0,0,N,N); x.fillStyle='#fff'; x.textBaseline='middle';
  const fs=mob?33:19, sy=mob?1.1:1.3; x.font=`${fs}px "Michroma", sans-serif`;
  // labels near the camera (south, +z) are drawn smaller so that perspective leaves them all about the same size
  const put=(t,wx,wz,al)=>{ const f=clamp(1-wz*(mob?.022:.045),.68,1.32); x.save(); x.translate(N/2+wx*k,N/2+wz*k); x.scale(f,sy*f); x.textAlign=al; x.fillText(t,0,0); x.restore(); };
  for(let a=0;a<360;a+=mob?90:30){ const b=a*Math.PI/180, rr=mob?RS-.46:RS+.5+.08*Math.max(0,-Math.cos(b)); put(String(a).padStart(3,'0'),Math.sin(b)*rr,-Math.cos(b)*rr,'center'); }
  for(let km=1;km<=5;km++){ if(mob&&km%2===0) continue; const rr=km*KM-(mob?.24:.14), b=42*Math.PI/180; put(km+' km',Math.sin(b)*rr+.06,-Math.cos(b)*rr,'left'); }
  labTex.needsUpdate=true;
}
// terrain heightfield, baked once: value noise fbm, 4 octaves, over the whole ground disc
function heightTex(){
  const N=512, L=256, R=seeded(11), lat=new Float32Array(L*L); for(let i=0;i<L*L;i++) lat[i]=R();
  const vn=(x,y)=>{ const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy), x0=xi&255, x1=(xi+1)&255, y0=(yi&255)*L, y1=((yi+1)&255)*L;
    const a=lat[y0+x0], b=lat[y0+x1], c=lat[y1+x0], d=lat[y1+x1]; return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; };
  const data=new Uint8Array(N*N);
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){ let x=(i/(N-1)*2-1)*GR*.2+7.3, y=(j/(N-1)*2-1)*GR*.2+2.1, s=0, a=.5;
    for(let o=0;o<4;o++){ s+=a*vn(x,y); const nx=1.6*x-1.2*y+3.1, ny=1.2*x+1.6*y+1.7; x=nx; y=ny; a*=.5; }
    data[j*N+i]=Math.round(clamp(s,0,1)*255); }
  const t=new T.DataTexture(data,N,N,T.RedFormat,T.UnsignedByteType); t.magFilter=t.minFilter=T.LinearFilter; t.generateMipmaps=false; t.needsUpdate=true; return t;
}
st.build=async function(){
  try{ await Promise.race([document.fonts.load('20px "Michroma"'),wait(1500)]); }catch(e){}
  labCv=document.createElement('canvas'); labCv.width=labCv.height=2048; labCx=labCv.getContext('2d');
  labTex=new T.CanvasTexture(labCv); labTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); drawLabels(false);
  GU={uNow:{value:0},uSw:{value:0},uLab:{value:.5},uBoot:{value:1},uB:{value:PB},uR:{value:RG},uSite:{value:SITES.map(s=>new T.Vector4(s.p.x,s.p.z,1,-99))},uThr:{value:new T.Vector3()},
    uJam:{value:new T.Vector2()},uInk:{value:COL.ink},uHos:{value:COL.hos},uFri:{value:COL.fri},uUnk:{value:COL.unk},tLab:{value:labTex},tH:{value:heightTex()}};
  const ground=new T.Mesh(new T.PlaneGeometry(GR*2,GR*2).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:GU,vertexShader:GROUND_V,fragmentShader:GROUND_F,extensions:{derivatives:true}}));
  ground.renderOrder=-2; ground.frustumCulled=false; sc.add(ground);
  // command post: a low octagonal base, an operations block, a launcher, a mast with an array that turns with the sweep
  cpMat=edgeMat();
  sc.add(structure([at(new T.CylinderGeometry(.27,.31,.07,8),0,.035,0,Math.PI/8),at(new T.BoxGeometry(.24,.1,.17),.02,.12,.03),
    at(new T.BoxGeometry(.11,.06,.11),-.15,.1,-.08),at(new T.BoxGeometry(.022,.34,.022),.06,.34,-.04)],cpMat));
  cpAnt=structure([at(new T.BoxGeometry(.34,.075,.016),0,0,0),at(new T.BoxGeometry(.02,.02,.08),0,0,.04)],cpMat); cpAnt.position.set(.06,.53,-.04); sc.add(cpAnt);
  // the three sites, each a small clean structure
  const SG=[
    ()=>[at(new T.BoxGeometry(.8,.024,.52),0,.012,0),...[-.24,0,.24].map(x=>at(new T.BoxGeometry(.13,.13,.12),x,.09,-.1)),
      at(new T.BoxGeometry(.018,.3,.018),-.34,.15,.15),at(new T.BoxGeometry(.018,.3,.018),.34,.15,.15),at(new T.BoxGeometry(.7,.018,.018),0,.3,.15),at(new T.BoxGeometry(.16,.08,.11),-.12,.06,.15)],
    ()=>[at(new T.BoxGeometry(1.15,.012,.15),0,.006,-.06,.32),at(new T.BoxGeometry(.5,.01,.05),.06,.005,.15,.32),at(new T.BoxGeometry(.22,.1,.16),.2,.05,.3,.32),
      at(new T.BoxGeometry(.04,.22,.04),-.3,.11,.22),at(new T.BoxGeometry(.1,.05,.1),-.3,.245,.22)],
    ()=>[at(new T.CylinderGeometry(.13,.13,.13,20),-.17,.065,-.06),at(new T.CylinderGeometry(.13,.13,.13,20),.17,.065,-.06),
      at(new T.CylinderGeometry(.19,.19,.035,24),0,.018,.24),at(new T.BoxGeometry(.14,.08,.1),0,.04,-.31)]];
  SITES.forEach((s,i)=>{ s.mat=edgeMat(); const g=structure(SG[i](),s.mat); g.position.copy(s.p); sc.add(g); s.grp=g; });
  // contacts: instanced airframes, instanced rotor discs
  inst=new T.InstancedMesh(quadGeo(),droneMat,MAXD); inst.frustumCulled=false;
  rot=new T.InstancedMesh(new T.CircleGeometry(RRAD,20).rotateX(-Math.PI/2),rotorMat,MAXD*4); rot.frustumCulled=false;
  rotSp=new Float32Array(MAXD*4); for(let i=0;i<MAXD*4;i++){ const k=i%4; rotSp[i]=(k===0||k===3)?.72+Math.random()*.28:Math.random()*.28; }
  rot.geometry.setAttribute('aSp',new T.InstancedBufferAttribute(rotSp,1));
  for(let i=0;i<MAXD;i++){ inst.setColorAt(i,COL.unk); for(let k=0;k<4;k++) rot.setColorAt(i*4+k,COL.unk); }
  inst.count=0; rot.count=0; sc.add(inst); sc.add(rot);
  // point lights: two nav lights and a ground foot per contact, one exhaust per interceptor
  lP=new Float32Array(NL*3); lC=new Float32Array(NL*3); lS=new Float32Array(NL);
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.BufferAttribute(lP,3)); lg.setAttribute('aC',new T.BufferAttribute(lC,3)); lg.setAttribute('aS',new T.BufferAttribute(lS,1));
  lg.boundingSphere=new T.Sphere(new T.Vector3(),1e4); lights=new T.Points(lg,ptMat); lights.frustumCulled=false; sc.add(lights);
  // altitude stalks from each contact down to the ground
  dP=new Float32Array(MAXD*6); dC=new Float32Array(MAXD*6);
  const dg=new T.BufferGeometry(); dg.setAttribute('position',new T.BufferAttribute(dP,3)); dg.setAttribute('color',new T.BufferAttribute(dC,3)); dg.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  drops=new T.LineSegments(dg,lineMat); drops.frustumCulled=false; sc.add(drops);
  // interceptors and their trails
  msl=new T.InstancedMesh(missileGeo(),new T.MeshBasicMaterial({color:0xFFF4E6}),MAXM); msl.frustumCulled=false; msl.count=0; sc.add(msl);
  tP=new Float32Array(MAXM*(TL-1)*6); tC=new Float32Array(MAXM*(TL-1)*6);
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(tP,3)); tg.setAttribute('color',new T.BufferAttribute(tC,3)); tg.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  trails=new T.LineSegments(tg,lineMat); trails.frustumCulled=false; sc.add(trails);
  // puffs
  const NP=Math.floor(1500*Q+300); pP=new Float32Array(NP*3); pA=new Float32Array(NP*4); pC=new Float32Array(NP*3); pV=new Float32Array(NP*3); pL=new Float32Array(NP);
  for(let i=0;i<NP;i++) pA[i*4]=1;
  const pg=new T.BufferGeometry(); pg.setAttribute('position',new T.BufferAttribute(pP,3)); pg.setAttribute('aP',new T.BufferAttribute(pA,4)); pg.setAttribute('aC',new T.BufferAttribute(pC,3)); pg.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  puffs=new T.Points(pg,puffMat); puffs.frustumCulled=false; sc.add(puffs);
  debris=Burst(sc,Math.floor(900*Q+200),'#FFE4D6',.055);
  jamWall=new T.Mesh(new T.CylinderGeometry(1,1,1,96,1,true).translate(0,.5,0),jamWallMat); jamWall.visible=false; jamWall.frustumCulled=false; sc.add(jamWall);
};
function puff(x,y,z,vx,vy,vz,life,s0,s1,a,c){
  const N=pL.length, i=pI; pI=(pI+1)%N;
  pP[i*3]=x; pP[i*3+1]=y; pP[i*3+2]=z; pV[i*3]=vx; pV[i*3+1]=vy; pV[i*3+2]=vz; pL[i]=life; pA[i*4]=0; pA[i*4+1]=s0; pA[i*4+2]=s1; pA[i*4+3]=a;
  pC[i*3]=c.r; pC[i*3+1]=c.g; pC[i*3+2]=c.b;
}
const SMOKE=new T.Color(.62,.6,.57), HOT=new T.Color(1,.86,.7), WHITE3=new T.Color(1,.97,.93), RED3=new T.Color(1,.42,.28);

/* ---------- contacts ---------- */
const TINT_B=new T.Color(0,.02,.08), TINT_R=new T.Color(.1,0,0), TINT_J=new T.Color(0,.01,.045);
let hovD=null;
function freeD(){ for(const d of D) if(!d.on) return d; return null; }
function resetD(d,type){ Object.assign(d,{on:true,type,cls:'unk',hp:TYPES[type].hp,id:nextId++,grp:null,ph:Math.random()*TAU,jam:0,jamHit:false,fall:false,vy:0,spin:0,eng:0,idT:-1,reacted:false,
  demo:!game,loiter:false,tk:null,hov:false,rowHov:false,tti:99,flash:0,dmgT:-9,age:0,roll:0,pitch:0,yawR:0,cruise:1,dive:false}); d.v.set(0,0,0); }
function pickSite(){ let n=0; for(const s of SITES) if(s.hp>0) n++; if(!n) return -1; let k=(Math.random()*n)|0; for(let i=0;i<3;i++) if(SITES[i].hp>0&&k--===0) return i; return 0; }
function spawnBearing(si){ const s=SITES[si].p, sb=brg(s.x,s.z); let b=0; for(let k=0;k<12;k++){ b=Math.random()*TAU; if(Math.abs(angDiff(b,sb))>.8) break; } return b; }
function spawnHostile(type){ const si=pickSite(); if(si<0) return null; const d=freeD(); if(!d) return null; resetD(d,type); d.site=si;
  const b=spawnBearing(si); d.p.set(Math.sin(b)*SPAWN,TYPES[type].alt*(.9+Math.random()*.2),-Math.cos(b)*SPAWN); d.cruise=d.p.y; d.yaw=Math.atan2(-d.p.x,-d.p.z);
  d.tk=takeTK(false,false); if(game&&!d.demo) game.hostiles++; return d; }
function spawnFriend(){ const d=freeD(); if(!d) return null; resetD(d,'friend'); const b=Math.random()*TAU, e=b+Math.PI+(Math.random()-.5)*1.1;
  d.p.set(Math.sin(b)*SPAWN,1.5+Math.random()*.3,-Math.cos(b)*SPAWN); d.cruise=d.p.y; d.goal.set(Math.sin(e)*(SPAWN+.9),d.p.y,-Math.cos(e)*(SPAWN+.9));
  d.yaw=Math.atan2(d.goal.x-d.p.x,d.goal.z-d.p.z); d.tk=takeTK(false,false); return d; }
function spawnSwarm(){ let g=null; for(const x of GP) if(!x.on){ g=x; break; } if(!g) return null; const si=pickSite(); if(si<0) return null; const b=spawnBearing(si);
  Object.assign(g,{on:true,site:si,id:nextId++,cls:'unk',ph:Math.random()*TAU,n:0,alt:.66+Math.random()*.12,tti:99,dive:false,lead:null}); g.c.set(Math.sin(b)*SPAWN,g.alt,-Math.cos(b)*SPAWN); g.v.set(0,0,0);
  g.tk=takeTK(false,true);
  for(let k=0;k<5;k++){ const d=freeD(); if(!d) break; resetD(d,'swarm'); d.grp=g; d.site=si; d.id=g.id; const a=k/4*TAU+.4, rr=k===0?0:.25;
    d.off.set(Math.cos(a)*rr,k%2?.05:-.04,Math.sin(a)*rr); d.p.copy(g.c).add(d.off); d.cruise=g.alt+d.off.y; d.yaw=Math.atan2(-g.c.x,-g.c.z); d.tk=takeTK(true,false); g.n++; if(game&&!d.demo) game.hostiles++; }
  return g; }
function release(d){ if(!d.on) return; d.on=false; if(d.tk){ dropTK(d.tk); d.tk=null; } const g=d.grp; d.grp=null;
  if(g&&g.on){ g.n--; if(g.n<=0){ g.on=false; dropTK(g.tk); g.tk=null; } } if(hovD===d) hovD=null; }
function identify(d,silent){
  if(d.cls!=='unk') return; const c=d.type==='friend'?'fri':'hos';
  if(d.grp){ const g=d.grp; g.cls=c; for(const x of D) if(x.on&&x.grp===g&&x.cls==='unk'){ x.cls=c; x.idT=clk; } } else { d.cls=c; d.idT=clk; }
  if(!silent&&game&&!d.demo&&clk-lastIdS>.09){ lastIdS=clk; if(c==='hos') A.chime(13,0,.034); else A.chime(9,0,.03); }
}
function kill(d,how){
  const s=TYPES[d.type].sc, c=d.type==='friend'?COL.fri:COL.hos;
  debris.emit(d.p,Math.floor((d.type==='heavy'?70:d.type==='swarm'?22:40)*(Q*.5+.5)),2.2*s+.6,c,.6,1.1);
  for(let k=0;k<5;k++) puff(d.p.x,d.p.y,d.p.z,(Math.random()-.5)*.4,.12+Math.random()*.2,(Math.random()-.5)*.4,1.5+Math.random(),.1,.5*s+.2,.14,SMOKE);
  if(game&&!d.demo){
    if(d.type==='friend'){ game.score-=400; game.blue++; showBanner(banner,'Friendly down','Minus 400'); A.buzz(); feedback(.35,1,TINT_B); popAt(pops,d.p,'−400','bad'); }
    else { game.score+=TYPES[d.type].pts; game.kills++; if(how==='jam') game.jammed++; popAt(pops,d.p,'+'+TYPES[d.type].pts,d.type==='heavy'?'big':''); }
  }
  release(d);
}
function siteHit(d){
  const s=SITES[d.site], T_=TYPES[d.type], live=game&&!d.demo;
  if(live){ s.hp=Math.max(0,s.hp-T_.dmg); if(s.hp<.03) s.hp=0; }
  s.hitT=clk; s.smk=Math.max(s.smk||0,live?5:1.5); ringAt(s.p.x,s.p.z,1);
  puff(s.p.x,.25,s.p.z,0,0,0,.3,.3,1.6,live?1.8:.6,RED3); debris.emit(V.copy(s.p).setY(.25),live?60:16,2.4,COL.hos,1.2,1.1);
  if(live){ game.leak++; A.alarm(); A.pop(); feedback(.5,1,TINT_R); popAt(pops,V.copy(s.p).setY(.4),'Site hit','bad');
    if(s.hp<=0){ showBanner(banner,s.name+' down','Site lost'); A.boom(); } }
  release(d);
}

/* ---------- interceptors: boost, then proportional navigation ---------- */
function freeM(){ for(const m of MS) if(!m.on) return m; return null; }
function launch(m,d,demo){
  Object.assign(m,{on:true,live:true,demo,tgt:d,t:0,lost:0,fade:1,trN:0,k:0,puffT:0});
  m.p.set(-.15+(Math.random()-.5)*.05,.17,-.08+(Math.random()-.5)*.05);
  V.copy(d.p).sub(m.p).setY(0).normalize(); m.v.set(V.x*.7,3,V.z*.7);
  m.d0=Math.max(.5,d.p.distanceTo(m.p)); d.eng++;
  ringAt(m.p.x,m.p.z,3);
  for(let k=0;k<6;k++) puff(m.p.x,m.p.y,m.p.z,(Math.random()-.5)*.7,Math.random()*.25,(Math.random()-.5)*.7,.9+Math.random()*.5,.08,.42,.18,SMOKE);
  puff(m.p.x,m.p.y+.05,m.p.z,0,0,0,.16,.12,.55,1.6,HOT);
  if(!demo){ A.launch(); A.blip(); }
}
function retarget(m){ let best=null, bd=2.6; for(const d of D){ if(!d.on||d.fall||d.cls!=='hos') continue; const dd=d.p.distanceTo(m.p); if(dd<bd){ bd=dd; best=d; } } if(best) best.eng++; return best; }
function fizzle(m){ m.live=false; if(m.tgt){ m.tgt.eng=Math.max(0,m.tgt.eng-1); m.tgt=null; } puff(m.p.x,m.p.y,m.p.z,0,0,0,.25,.1,.5,.8,HOT); debris.emit(m.p,10,1,null,0,.5); }
function detonate(m,tg){
  m.live=false; m.tgt=null; tg.eng=Math.max(0,tg.eng-1);
  const s=TYPES[tg.type].sc, P=tg.p;
  puff(P.x,P.y,P.z,0,0,0,.2,.2,1.5*s+.5,2.4,WHITE3); puff(P.x,P.y,P.z,0,0,0,.55,.2,.9*s+.35,.8,HOT);
  ringAt(P.x,P.z,0); if(!m.demo) feedback(.16,.35);
  if(game&&!m.demo&&tg.type!=='friend') game.mhit++;
  tg.hp--;
  if(tg.hp<=0){ if(!m.demo){ A.pop(); A.ping(2349,.026); } kill(tg,'msl'); }
  else { tg.dmgT=clk; debris.emit(P,14,1.4,COL.hos,.3,.6); if(!m.demo) A.ping(1760,.03); }
}
function stepMissile(m,dt){
  m.t+=dt; let tg=m.tgt;
  if(tg&&(!tg.on||tg.fall)){ tg=m.tgt=retarget(m); }
  const spd=Math.min(9.5,3+m.t*15);
  if(!tg){ m.lost+=dt; m.v.y-=dt*2; m.v.setLength(spd); }
  else if(m.t<.15){ m.v.y+=dt*8; m.v.setLength(spd); }
  else {
    V.copy(tg.p).sub(m.p); const R2=Math.max(V.lengthSq(),1e-4), R=Math.sqrt(R2);
    V2.copy(tg.v).sub(m.v); const vc=Math.max(1.5,-V.dot(V2)/R);
    V3.crossVectors(V,V2).multiplyScalar(1/R2); V4.copy(V).multiplyScalar(1/R);
    V5.crossVectors(V3,V4).multiplyScalar(4*vc).addScaledVector(V4,spd*2.6).addScaledVector(m.v,-2.6);
    if(V5.length()>80) V5.setLength(80);
    m.v.addScaledVector(V5,dt).setLength(spd);
    // closest approach over this step, in the target's frame
    V.copy(m.p).sub(tg.p); V2.copy(m.v).sub(tg.v).multiplyScalar(dt); const L2=V2.lengthSq(); const u=L2>1e-9?clamp(-V.dot(V2)/L2,0,1):0;
    V.addScaledVector(V2,u);
    if(V.length()<.11+.1*TYPES[tg.type].sc){ m.p.addScaledVector(m.v,dt*u); detonate(m,tg); return; }
  }
  m.p.addScaledVector(m.v,dt);
  if(m.p.y<.03){ m.p.y=.03; fizzle(m); return; }
  if(m.t>4||m.lost>.5) fizzle(m);
}

/* ---------- jammer ---------- */
function nudge(e){ e.classList.remove('no'); void e.offsetWidth; e.classList.add('no'); }
function jam(){
  if(!game||st.state!=='play') return;
  if(game.jamCD>0){ A.beep(220); nudge(jamB); return; }
  game.jamCD=JAMCD; game.jamT=0; game.jams++; for(const d of D) d.jamHit=false;
  A.jam(); feedback(.16,.6,TINT_J); jamB.classList.add('fire'); setTimeout(()=>jamB.classList.remove('fire'),180); hideHint();
}
function jamStep(dt){
  const g=game; g.jamT+=dt; const R=JAMR*E.o(clamp(g.jamT/.85,0,1)), a=1-clamp((g.jamT-.55)/.75,0,1);
  GU.uJam.value.set(R,a); jamWall.visible=a>0; jamWall.scale.set(Math.max(.01,R),.7+.6*(1-a),Math.max(.01,R)); jamWallMat.uniforms.uA.value=a;
  for(const d of D){ if(!d.on||d.jamHit||d.fall) continue; if(Math.hypot(d.p.x,d.p.z)<R){ d.jamHit=true;
    if(d.type==='swarm'){ d.fall=true; d.vy=.2; d.spin=(Math.random()-.5)*12; identify(d,true); } else if(d.type!=='friend'){ d.jam=3.5; } } }
  if(g.jamT>1.45){ g.jamT=-1; GU.uJam.value.set(0,0); jamWall.visible=false; }
}

/* ---------- movement ---------- */
function steer(d,tx,tz,spd,dt,weave){
  const dist=Math.max(Math.hypot(tx,tz),1e-3); let dx=tx/dist, dz=tz/dist;
  if(weave){ const w=Math.sin(clk*1.25+d.ph)*.42*clamp((dist-1)/3,0,1), px=-dz, pz=dx; dx+=px*w; dz+=pz*w; const n=Math.hypot(dx,dz); dx/=n; dz/=n; }
  const k=1-Math.exp(-2.6*dt); d.v.x+=(dx*spd-d.v.x)*k; d.v.z+=(dz*spd-d.v.z)*k; d.v.y=0;
  return dist;
}
function stepGroup(g,dt){
  if(SITES[g.site].hp<=0){ const n=pickSite(); if(n>=0){ g.site=n; for(const d of D) if(d.on&&d.grp===g) d.site=n; } }
  const s=SITES[g.site].p, spd=TYPES.swarm.spd*(game?1+game.wave*.08:.75);
  const tx=s.x-g.c.x, tz=s.z-g.c.z, dist=Math.max(Math.hypot(tx,tz),1e-3);
  const w=Math.sin(clk*.9+g.ph)*.35*clamp((dist-1)/3,0,1); let dx=tx/dist-tz/dist*w, dz=tz/dist+tx/dist*w; const n=Math.hypot(dx,dz);
  const k=1-Math.exp(-2*dt); g.v.x+=(dx/n*spd-g.v.x)*k; g.v.z+=(dz/n*spd-g.v.z)*k;
  g.c.x+=g.v.x*dt; g.c.z+=g.v.z*dt; g.tti=dist/spd; g.dive=dist<1.2;
}
function stepDrone(d,dt){
  d.age+=dt; const T_=TYPES[d.type];
  if(d.jam>0) d.jam=Math.max(0,d.jam-dt);
  const spd=T_.spd*(game?1+game.wave*.08:.75)*(d.jam>0?.3:1);
  const yaw0=d.yaw;
  if(d.fall){ d.vy-=5.5*dt; d.p.y+=d.vy*dt; d.p.addScaledVector(d.v,dt); d.v.multiplyScalar(Math.exp(-1.2*dt)); d.yaw+=d.spin*dt; d.roll+=d.spin*.5*dt; d.pitch+=d.spin*.3*dt;
    if(Math.random()<dt*25) puff(d.p.x,d.p.y,d.p.z,0,.05,0,.9,.05,.22,.12,SMOKE);
    if(d.p.y<=.04){ ringAt(d.p.x,d.p.z,2); debris.emit(d.p,10,1,COL.hos,.5,.5); kill(d,'jam'); }
    d.q.setFromEuler(EU.set(d.pitch,d.yaw,d.roll,'YXZ')); return; }
  let dist=9;
  if(d.loiter){ const a=clk*.3+d.ph, R=.42; d.p.set(d.goal.x+Math.cos(a)*R,d.cruise+Math.sin(clk*.7)*.05,d.goal.z+Math.sin(a)*R); d.v.set(-Math.sin(a)*R*.3,0,Math.cos(a)*R*.3); }
  else if(d.type==='friend'){ dist=steer(d,d.goal.x-d.p.x,d.goal.z-d.p.z,spd,dt,false); d.p.addScaledVector(d.v,dt); d.p.y=damp(d.p.y,d.cruise,1.5,dt);
    if(dist<.35||(Math.hypot(d.p.x,d.p.z)>SPAWN+.6&&d.age>3)){ release(d); return; } }
  else {
    const g=d.grp;
    if(g&&!g.dive){ const tx=g.c.x+d.off.x-d.p.x, tz=g.c.z+d.off.z-d.p.z; const k=Math.min(1,dt*3.2);
      d.v.x+=(g.v.x+tx*2.6-d.v.x)*k; d.v.z+=(g.v.z+tz*2.6-d.v.z)*k; d.v.y=0; d.p.addScaledVector(d.v,dt); d.p.y=damp(d.p.y,d.cruise+Math.sin(clk*2+d.ph)*.03,2.5,dt);
      d.tti=g.tti; }
    else {
      if(SITES[d.site].hp<=0){ const n=pickSite(); if(n>=0) d.site=n; }
      const s=SITES[d.site].p; dist=steer(d,s.x-d.p.x,s.z-d.p.z,spd,dt,!g); d.p.addScaledVector(d.v,dt);
      const alt=dist<1.5?lerp(.3,d.cruise,clamp((dist-.35)/1.15,0,1)):d.cruise; d.p.y=damp(d.p.y,alt,2.4,dt);
      d.tti=dist/Math.max(spd,.05);
      if(dist<.36&&d.p.y<.66){ siteHit(d); return; }
    }
    if(d.jam>0){ d.p.x+=Math.sin(clk*7+d.ph)*dt*.18; d.p.z+=Math.cos(clk*6+d.ph)*dt*.18; }
  }
  const sp=Math.hypot(d.v.x,d.v.z);
  if(sp>.02){ d.yaw+=angDiff(Math.atan2(d.v.x,d.v.z),d.yaw)*Math.min(1,dt*4.5); }
  const rate=angDiff(d.yaw,yaw0)/Math.max(dt,1e-3);
  d.roll=damp(d.roll,clamp(-rate*sp*.55,-.5,.5)+(d.jam>0?Math.sin(clk*11+d.ph)*.25:0),5,dt);
  d.pitch=damp(d.pitch,clamp(sp*.38,0,.36),4,dt);
  d.q.setFromEuler(EU.set(d.pitch,d.yaw,d.roll,'YXZ'));
}

/* ---------- engagement: forgiving picking, never on an identified friendly ---------- */
function pick(x,y,R){
  let best=null, bs=R;
  for(const d of D){ if(!d.on||d.fall||!d.vis) continue; let s=Math.hypot(d.sx-x,d.sy-y); if(s>R) continue;
    s+=d.cls==='hos'?-10:d.cls==='fri'?28:0; if(d.eng>=d.hp) s+=14; if(s<bs){ bs=s; best=d; } }
  for(const g of GP){ if(!g.on||!g.vis) continue; const s=Math.hypot(g.sx-x,g.sy-y)+6; if(s<bs){ const l=groupLead(g); if(l){ bs=s; best=l; } } }
  return best;
}
function groupLead(g){ let best=null, bt=1e9; for(const d of D){ if(!d.on||d.grp!==g||d.fall) continue; const t=Math.hypot(SITES[d.site].p.x-d.p.x,SITES[d.site].p.z-d.p.z)+(d.eng>0?5:0); if(t<bt){ bt=t; best=d; } } return best; }
function refuse(d,msg){ A.beep(220); if(d) popAt(pops,V.copy(d.p).setY(d.p.y+.25),msg,'bad'); }
function engage(d){
  if(!game||st.state!=='play'||!d||!d.on||d.fall) return false;
  if(d.cls==='fri'){ refuse(d,'Friendly'); return false; }
  const m=game.ammo>=1?freeM():null; if(!m){ refuse(d,'Reloading'); nudge(pipsEl); return false; }
  launch(m,d,false); game.ammo--; game.shots++;
  if(d.cls==='hos'&&!d.reacted&&d.idT>=0){ d.reacted=true; game.rs+=clk-d.idT; game.rc++; }
  hideHint(); return true;
}
function rowEngage(r){ if(!game||st.state!=='play') return; const d=r.g?(r.g.on?groupLead(r.g):null):r.d; if(d&&d.on) engage(d); else A.beep(220); }
st.onPointer=function(e){
  if(st.state!=='play'||!game) return;
  const d=pick(e.clientX,e.clientY,e.pointerType==='mouse'?64:92);
  if(d) engage(d); else { A.tick(); missPing(e.clientX,e.clientY); }
};
const MP=document.createElement('i'); MP.className='ae-ping'; marks.appendChild(MP);
function missPing(x,y){ MP.style.transform=`translate3d(${x}px,${y}px,0)`; MP.classList.remove('go'); void MP.offsetWidth; MP.classList.add('go'); }
jamB.addEventListener('click',jam);
addEventListener('keydown',e=>{
  if(S.mode!=='station'||S.stId!=='ae') return;
  if(e.code==='Space'){ e.preventDefault(); if(!e.repeat) jam(); return; }
  const k=/^Digit([1-8])$/.exec(e.code); if(k&&st.state==='play'){ const r=ROWS[+k[1]-1]; if(r&&!r.b.hidden){ e.preventDefault(); rowEngage(r); } }
});
function hideHint(){ if(game&&game.hint){ game.hint=0; hintEl.classList.add('gone'); } }

/* ---------- game flow ---------- */
function bagOf(W){ const b=[]; for(const k in W.bag) for(let i=0;i<W.bag[k];i++) b.push(k); for(let i=b.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]]; }
  const L=b.length-1; if(b[L]!=='scout'){ const j=b.lastIndexOf('scout'); if(j>=0) [b[L],b[j]]=[b[j],b[L]]; } return b; }   // popped from the end: each wave opens with a scout
function nextWave(){ const g=game; g.wave++; const W=WAVES[g.wave]; g.phase='brief'; g.pt=2.4; g.wt=0; g.bag=bagOf(W); g.every=W.dur/g.bag.length; g.nextAt=.3;
  showBanner(banner,'Wave '+(g.wave+1),W.name); ringAt(0,0,4); if(g.wave>0) A.alarm(); }
function hostilesLeft(){ for(const d of D) if(d.on&&!d.demo&&d.type!=='friend') return true; return false; }
function flow(dt){
  const g=game, W=WAVES[g.wave]; g.total+=dt;
  if(g.ammo<AMMO){ g.reload+=dt; if(g.reload>=RELOAD){ g.reload=0; g.ammo++; } } else g.reload=0;
  if(g.jamCD>0) g.jamCD=Math.max(0,g.jamCD-dt);
  if(g.jamT>=0) jamStep(dt);
  let alive=0; for(const s of SITES) if(s.hp>0) alive++;
  if(!alive){ g.lostT=g.lostT<0?2:g.lostT-dt; if(g.lostT<=0) return end(); return; }
  if(g.phase==='brief'){ g.pt-=dt; if(g.pt<=0){ g.phase='fight'; g.wt=0; } return; }
  g.wt+=dt;
  while(g.bag.length&&g.wt>=g.nextAt){ const t=g.bag.pop(); if(t==='swarm') spawnSwarm(); else if(t==='friend') spawnFriend(); else spawnHostile(t); g.nextAt+=g.every*(.7+Math.random()*.6); }
  if(!g.bag.length&&(!hostilesLeft()||g.wt>W.dur+14)){ if(g.wave<2) nextWave(); else return end(); }
  if(g.total>160) end();
}
function end(){
  const g=game; if(!g) return; game=null;
  const standing=SITES.filter(s=>s.hp>0).length, integ=SITES.reduce((a,s)=>a+s.hp,0)/3;
  const total=Math.max(0,Math.round(g.score+integ*900));
  const clean=g.leak===0, allDown=g.kills>=g.hostiles;
  const grade=!standing?'Sky lost':g.blue?'Blue on blue':clean&&allDown?'Flawless':standing===3?'Sky held':'Held, with losses';
  const lines=[];
  if(!standing) lines.push('All three sites went down. Jam swarms early and save interceptors for scouts and heavies.');
  else if(g.blue) lines.push(`${g.blue===1?'One friendly was':g.blue+' friendlies were'} hit. Wait for the sweep to identify a contact before you fire.`);
  else if(g.leak) lines.push(`${g.leak} hostile${g.leak>1?'s':''} reached a site. The table is sorted by time to impact, so work from the top.`);
  else lines.push('Nothing reached a site and no friendly was touched.');
  lines.push('Aetos is built around this loop: detect, identify, decide, act.');
  st.result({grade,score:total,text:lines.join(' '),stats:[['Hostiles down',g.kills+' / '+g.hostiles],['Reached a site',g.leak],['Friendlies hit',g.blue],
    ['Downed by jammer',g.jammed],['Sites standing',standing+' / 3'],['Time to engage',g.rc?(g.rs/g.rc).toFixed(1)+' s':'None']]});
  A.chord(); for(const d of D) if(d.on) d.demo=true; for(const m of MS) m.demo=true;
  GU.uJam.value.set(0,0); jamWall.visible=false; warnEl.classList.remove('on'); topEl.classList.remove('thr'); HUD.warnOn=false;
}

/* ---------- attract mode: the loop running on its own ---------- */
function attract(dt){
  let n=0, loi=null; for(const d of D) if(d.on){ n++; if(d.loiter) loi=d; }
  if(!loi&&st.state==='menu'){ const d=freeD(); if(d){ resetD(d,'scout'); d.loiter=true; d.demo=true; d.goal.set(2.55,0,.3); d.cruise=1.05; d.p.set(3,1.05,.3); d.tk=takeTK(false,false); identify(d,true); loi=d; } }
  menuDemo=loi;
  attractT-=dt; demoT-=dt;
  if(attractT<=0){ attractT=2.8+Math.random()*1.6;
    if(n<7){ const r=Math.random(); if(r<.5) spawnHostile('scout'); else if(r<.75) spawnFriend(); else spawnHostile('heavy'); } }
  // demo engagements: the identified hostile closest to impact, a little before it gets there
  if(demoT<=0){ demoT=.9+Math.random()*.8;
    let best=null, bt=1e9; for(const d of D){ if(!d.on||!d.demo||d.loiter||d.cls!=='hos'||d.fall||d.eng>=d.hp) continue; if(d.tti<bt){ bt=d.tti; best=d; } }
    if(best&&bt<4.6){ const m=freeM(); if(m) launch(m,best,true); } }
}
let demoT=1;
function clearAll(){
  for(const d of D) if(d.on) release(d); for(const g of GP){ if(g.on){ g.on=false; dropTK(g.tk); g.tk=null; } }
  for(const m of MS){ m.on=false; m.live=false; m.tgt=null; }
  for(let i=0;i<pL.length;i++) pA[i*4]=1; debris.clear(); for(const v of PB) v.z=-99; for(const v of RG) v.z=-99;
  GU.uJam.value.set(0,0); jamWall.visible=false; menuDemo=null; hovD=null;
}
function resetSites(){ SITES.forEach(s=>{ s.hp=1; s.hitT=-99; s.smk=0; s.thr=0; }); }
st.play=function(){
  clearAll(); resetSites(); nextId=1;
  game={wave:-1,phase:'brief',pt:0,wt:0,bag:[],every:2,nextAt:0,score:0,kills:0,jammed:0,mhit:0,shots:0,blue:0,leak:0,hostiles:0,ammo:AMMO,reload:0,jamCD:0,jamT:-1,jams:0,rs:0,rc:0,total:0,lostT:-1,alarmT:0,hint:1};
  for(const r of ROWS){ r.d=null; r.g=null; r.k=''; r.b.hidden=true; }
  hintEl.classList.remove('gone'); hintEl.textContent=FINE?'Click a track or a row to engage. Keys 1 to 8 engage rows':'Tap a track or a row to engage';
  st.setState('play'); nextWave(); tblT=0;
};
st.abort=function(){ game=null; if(pL) clearAll(); warnEl.classList.remove('on'); topEl.classList.remove('thr'); HUD.warnOn=false; };
let bootT=1;
st.enter=function(){ st.abort(); st.setState('menu');
  // a hidden button elsewhere (the loader's Enter keeps focus after a keyboard entry) must not swallow Enter on this title
  const ae=document.activeElement; if(ae&&ae!==document.body&&!el.contains(ae)&&ae.blur) ae.blur();
  resetSites(); nextId=1; bootT=0; $('#aeBest').textContent='Best '+fmt(store.get('ae',0)); attractT=.4; layoutKey='';
  for(let k=0;k<3;k++){ const d=k===1?spawnFriend():spawnHostile('scout'); if(d){ const a=Math.random()*TAU, r=3.4+Math.random()*1.6; d.p.x=Math.sin(a)*r; d.p.z=-Math.cos(a)*r; } } };
st.exit=function(){ st.abort(); };

/* ---------- per frame: sweep, missiles, effects ---------- */
function sweepPaint(s0,s1){
  const wrap=s1<s0;
  for(const d of D){ if(!d.on) continue; const b=brg(d.p.x,d.p.z); if(wrap?(b<=s0&&b>s1):(b<=s0||b>s1)) continue; if(Math.hypot(d.p.x,d.p.z)>RS+.25) continue;
    identify(d,false); paintAt(d.p.x,d.p.z,CLN[d.cls]); d.flash=1; }
}
function stepM(m,dt){
  if(m.live){ stepMissile(m,dt);
    const tr=m.tr; if(!m.trN||Math.hypot(tr[0]-m.p.x,tr[1]-m.p.y,tr[2]-m.p.z)>.085){ tr.copyWithin(3,0,(TL-1)*3); tr[0]=m.p.x; tr[1]=m.p.y; tr[2]=m.p.z; m.trN=Math.min(TL,m.trN+1); }
    m.puffT-=dt; if(m.puffT<=0){ m.puffT=.028; puff(m.p.x,m.p.y,m.p.z,(Math.random()-.5)*.08,.02+Math.random()*.05,(Math.random()-.5)*.08,1.3+Math.random()*.6,.07,.42,.11,SMOKE); } }
  else { m.fade-=dt*1.5; if(m.fade<=0){ m.on=false; m.trN=0; } }
}
function stepPuffs(dt){
  const N=pL.length, dr=Math.exp(-.7*dt);
  for(let i=0;i<N;i++){ const a=i*4; if(pA[a]>=1) continue; const k=pA[a]+dt/pL[i]; if(k>=1){ pA[a]=1; continue; } pA[a]=k;
    const j=i*3; pV[j]*=dr; pV[j+1]*=dr; pV[j+2]*=dr; pP[j]+=pV[j]*dt; pP[j+1]+=pV[j+1]*dt; pP[j+2]+=pV[j+2]*dt; }
  const g=puffs.geometry; g.attributes.position.needsUpdate=true; g.attributes.aP.needsUpdate=true; g.attributes.aC.needsUpdate=true;
}
const SMOKE_D=new T.Color(.5,.36,.3);
function sitesStep(dt){
  for(let i=0;i<3;i++){ const s=SITES[i]; const h=clk-s.hitT; s.mat.uniforms.uHit.value=h<2?Math.exp(-h*2.5):0; s.mat.uniforms.uDead.value=s.hp<=0?1:0;
    GU.uSite.value[i].set(s.p.x,s.p.z,s.hp,s.hitT);
    if(s.smk>0||s.hp<=0){ s.smk=Math.max(0,(s.smk||0)-dt); const rate=s.hp<=0?9:16*clamp(s.smk/4,0,1);
      if(Math.random()<rate*dt) puff(s.p.x+(Math.random()-.5)*.3,.12,s.p.z+(Math.random()-.5)*.3,(Math.random()-.5)*.05+.03,.42+Math.random()*.25,(Math.random()-.5)*.05,3.2+Math.random()*1.4,.14,.95,.1,s.hp<=0?SMOKE_D:SMOKE); } }
  GU.uThr.value.set(SITES[0].thr,SITES[1].thr,SITES[2].thr);
}

/* ---------- write instances, lights, stalks, interceptors, trails ---------- */
function writeScene(){
  let n=0; const big=innerWidth<=820?1.35:1.12;
  for(const d of D){ if(!d.on) continue; const i=n++;
    const s=TYPES[d.type].sc*big; SCL.set(s,s,s); M4.compose(d.p,d.q,SCL); inst.setMatrixAt(i,M4);
    const c=d.cls==='hos'?COL.hos:d.cls==='fri'?COL.fri:COL.unk; d.flash=Math.max(0,d.flash-.04);
    TC.copy(c).multiplyScalar(1+(clk-d.dmgT<.3?2:0)+d.flash*.8); inst.setColorAt(i,TC);
    for(let k=0;k<4;k++){ M5.multiplyMatrices(M4,ROT_LOCAL[k]); rot.setMatrixAt(i*4+k,M5); rot.setColorAt(i*4+k,c); }
    const bl=Math.sin(clk*6.5+d.ph*3), j=i*3;
    for(let k=0;k<2;k++){ V.set(k?-ARM:ARM,ROTY-.012,ARM).multiplyScalar(s).applyQuaternion(d.q).add(d.p); const o=(j+k)*3; lP[o]=V.x; lP[o+1]=V.y; lP[o+2]=V.z;
      const on=(k?bl:-bl)>.35?1:.12; lC[o]=c.r*on; lC[o+1]=c.g*on; lC[o+2]=c.b*on; lS[j+k]=.075*s+.03; }
    const o=(j+2)*3; lP[o]=d.p.x; lP[o+1]=.012; lP[o+2]=d.p.z; lC[o]=c.r*.3; lC[o+1]=c.g*.3; lC[o+2]=c.b*.3; lS[j+2]=.07;
    const q=i*6; dP[q]=d.p.x; dP[q+1]=d.p.y-.04*s; dP[q+2]=d.p.z; dP[q+3]=d.p.x; dP[q+4]=0; dP[q+5]=d.p.z;
    dC[q]=c.r*.26; dC[q+1]=c.g*.26; dC[q+2]=c.b*.26; dC[q+3]=c.r*.04; dC[q+4]=c.g*.04; dC[q+5]=c.b*.04; }
  for(let i=n*3;i<MAXD*3;i++) lS[i]=0;
  inst.count=n; rot.count=n*4; inst.instanceMatrix.needsUpdate=true; inst.instanceColor.needsUpdate=true; rot.instanceMatrix.needsUpdate=true; rot.instanceColor.needsUpdate=true;
  drops.geometry.setDrawRange(0,n*2); drops.geometry.attributes.position.needsUpdate=true; drops.geometry.attributes.color.needsUpdate=true;
  let mn=0, sgi=0;
  for(let k=0;k<MAXM;k++){ const m=MS[k], li=MAXD*3+k; lS[li]=0; if(!m.on) continue;
    if(m.live){ V.copy(m.v).normalize(); Qn.setFromUnitVectors(ZF,V); SCL.set(1.35,1.35,1.35); M4.compose(m.p,Qn,SCL); msl.setMatrixAt(mn++,M4);
      const o=li*3; lP[o]=m.p.x-V.x*.1; lP[o+1]=m.p.y-V.y*.1; lP[o+2]=m.p.z-V.z*.1; const f=.8+Math.random()*.4; lC[o]=1.6*f; lC[o+1]=1.25*f; lC[o+2]=.9*f; lS[li]=.3; }
    // trail: newest sample first, the live head joins it
    const tr=m.tr, N=m.trN; let hx=m.live?m.p.x:tr[0], hy=m.live?m.p.y:tr[1], hz=m.live?m.p.z:tr[2];
    for(let s=0;s<N&&sgi<MAXM*(TL-1);s++){ const ax=s===0?hx:tr[(s-1)*3], ay=s===0?hy:tr[(s-1)*3+1], az=s===0?hz:tr[(s-1)*3+2];
      if(s===0&&!m.live) continue;
      const fa=Math.pow(1-s/TL,1.5)*m.fade*1.25, fb=Math.pow(1-(s+1)/TL,1.5)*m.fade*1.25, o=sgi*6; sgi++;
      tP[o]=ax; tP[o+1]=ay; tP[o+2]=az; tP[o+3]=tr[s*3]; tP[o+4]=tr[s*3+1]; tP[o+5]=tr[s*3+2];
      tC[o]=fa; tC[o+1]=fa*.94; tC[o+2]=fa*.86; tC[o+3]=fb; tC[o+4]=fb*.94; tC[o+5]=fb*.86; } }
  { const li=MAXD*3+MAXM, o=li*3, on=(clk%1.6)<.14?1:.08; lP[o]=.06; lP[o+1]=.62; lP[o+2]=-.04; lC[o]=1.3*on; lC[o+1]=1.2*on; lC[o+2]=1.05*on; lS[li]=.16; }   // mast beacon
  msl.count=mn; msl.instanceMatrix.needsUpdate=true;
  trails.geometry.setDrawRange(0,sgi*2); trails.geometry.attributes.position.needsUpdate=true; trails.geometry.attributes.color.needsUpdate=true;
  const lg=lights.geometry; lg.attributes.position.needsUpdate=true; lg.attributes.aC.needsUpdate=true; lg.attributes.aS.needsUpdate=true;
}

/* ---------- HUD: track symbology, sites, arm, table ---------- */
const topEl=$('.ae-top',el);
function retK(d){ let k=1; for(const m of MS) if(m.live&&m.tgt===d) k=Math.min(k,clamp(m.p.distanceTo(d.p)/m.d0,0,1)); return k; }
function writeTrack(t,x,y,vis,cls,lab,sub,lock,hov,jm,p,v,rk){
  if(!vis){ if(t.shown){ t.e.style.display='none'; t.shown=false; } return; }
  if(!t.shown){ t.e.style.display='block'; t.shown=true; }
  const c='ae-trk '+cls+(t.mini?' mini':'')+(t.grp?' grp':'')+(lock?' lock':'')+(hov?' hov':'')+(jm?' jam':'');
  if(c!==t.cls){ t.e.className=c; t.cls=c; }
  t.e.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  if(t.mini) return;
  if(lab!==t.id){ t.b.textContent=lab; t.id=lab; } if(sub!==t.txt){ t.s.textContent=sub; t.txt=sub; }
  // velocity leader: where the track will be in 1.2 s, drawn from the symbol's edge
  V2.copy(p).addScaledVector(v,1.2).project(stCam); const ex=(V2.x*.5+.5)*innerWidth-x, ey=(-V2.y*.5+.5)*innerHeight-y, len=Math.min(42,Math.hypot(ex,ey));
  const off=t.grp?22:12; t.ldr.style.transform=len>3?`rotate(${Math.atan2(ey,ex).toFixed(3)}rad) translateX(${off}px) scaleX(${len.toFixed(1)})`:'scaleX(0)';
  if(lock) t.ret.style.transform=`scale(${(.85+rk*1.7).toFixed(3)}) rotate(${(45+rk*90).toFixed(1)}deg)`;
}
function courseTTI(d){ // time to the closest approach to a site, if the present course passes within 0.9
  const vx=d.v.x, vz=d.v.z, v2=vx*vx+vz*vz; if(v2<1e-4) return 99; let best=99;
  for(const s of SITES){ if(s.hp<=0) continue; const rx=s.p.x-d.p.x, rz=s.p.z-d.p.z, t=(rx*vx+rz*vz)/v2; if(t<=0) continue; const mx=rx-vx*t, mz=rz-vz*t; if(Math.hypot(mx,mz)<.9) best=Math.min(best,t); }
  return best;
}
const ENT=[...Array(MAXD+MAXG)].map(()=>({d:null,g:null,key:0,tti:99,r:0})); const ENTS=[];
function buildTable(){
  ENTS.length=0; let n=0;
  for(const d of D){ if(!d.on||d.fall||d.grp) continue; const e=ENT[n++]; e.d=d; e.g=null; e.r=Math.hypot(d.p.x,d.p.z);
    e.tti=d.cls==='hos'?d.tti:d.cls==='unk'?courseTTI(d):99; e.key=d.cls==='fri'?200+e.r:e.tti<99?e.tti:100+e.r; ENTS.push(e); }
  for(const g of GP){ if(!g.on) continue; const e=ENT[n++]; e.d=null; e.g=g; e.r=Math.hypot(g.c.x,g.c.z); e.tti=g.tti; e.key=g.tti; ENTS.push(e); }
  ENTS.sort((a,b)=>a.key-b.key);
  ROWS.forEach((r,k)=>{ const e=ENTS[k]; if(!e){ if(!r.b.hidden){ r.b.hidden=true; r.d=r.g=null; r.k=''; } return; }
    r.d=e.d; r.g=e.g; const d=e.d||groupLead(e.g)||null, cls=e.g?e.g.cls:e.d.cls, eng=d&&d.eng>0, jm=d&&d.jam>0;
    const id=id3(e.g?e.g.id:e.d.id), cl=cls==='unk'?'Unknown':cls==='fri'?'Friend':e.g?'Swarm '+e.g.n:TYPES[e.d.type].name;
    const x=eng?'Engaged':jm?'Jammed':cls==='fri'?'Transit':e.tti<99?Math.max(1,Math.ceil(e.tti))+' s':'Tracking';
    const key=id+cl+x+(e.r/KM).toFixed(1), rc='ae-row '+cls+(eng?' eng':'')+(e.tti<4&&cls!=='fri'&&!eng?' urg':'');
    if(r.b.hidden) r.b.hidden=false;
    if(key!==r.k){ r.k=key; r.t.textContent=id; r.c.textContent=cl; r.r.textContent=(e.r/KM).toFixed(1)+' km'; r.x.textContent=x; r.b.setAttribute('aria-label','Engage '+id+', '+cl+', '+(e.r/KM).toFixed(1)+' kilometres, '+x); }
    if(rc!==r.cls){ r.cls=rc; r.b.className=rc; } });
  const c=String(n); if(c!==HUD.cnt){ HUD.cnt=c; cntEl.textContent=c; }
}
function writeHUD(dt,playing){
  const W=innerWidth, H=innerHeight;
  for(const d of D){ if(!d.on) continue; V.copy(d.p).project(stCam); d.vis=V.z<1&&V.z>-1; d.sx=(V.x*.5+.5)*W; d.sy=(-V.y*.5+.5)*H; d.rowHov=false; }
  for(const g of GP){ if(!g.on) continue; V.copy(g.c).setY(g.alt).project(stCam); g.vis=V.z<1; g.sx=(V.x*.5+.5)*W; g.sy=(-V.y*.5+.5)*H; g.rowHov=false; }
  for(const r of ROWS) if(r.hov&&!r.b.hidden){ if(r.d) r.d.rowHov=true; if(r.g) r.g.rowHov=true; }
  hovD=playing&&mouse.on?pick(mouse.x,mouse.y,64):null;
  // track symbols
  for(const d of D){ if(!d.on||!d.tk) continue; const t=d.tk, show=playing&&d.vis&&!d.demo;
    if(!show){ writeTrack(t,0,0,false); continue; }
    const sub=d.cls==='unk'?'Unknown':d.cls==='fri'?'Friend':TYPES[d.type].name+(d.jam>0?' · Jammed':d.eng>0?' · Lock':'');
    writeTrack(t,d.sx,d.sy,true,d.cls,id3(d.id),sub,d.eng>0,hovD===d||d.rowHov||(d.grp&&d.grp.rowHov),d.jam>0||d.fall,d.p,d.v,d.eng>0?retK(d):1); }
  for(const g of GP){ if(!g.on||!g.tk) continue; const show=playing&&g.vis; if(!show){ writeTrack(g.tk,0,0,false); continue; }
    V3.copy(g.c).setY(g.alt); writeTrack(g.tk,g.sx,g.sy,true,g.cls,id3(g.id),(g.cls==='unk'?'Unknown ':'Swarm ')+g.n,false,g.rowHov||(hovD&&hovD.grp===g),false,V3,g.v,1); }
  // sites: labels, integrity, threat
  let worst=99, ws=-1;
  for(let i=0;i<3;i++){ const s=SITES[i]; let tt=99; if(playing) for(const d of D){ if(!d.on||d.fall||d.demo||d.type==='friend'||d.site!==i) continue; const x=d.grp&&!d.grp.dive?d.grp.tti:d.tti; if(x<tt) tt=x; }
    s.thr=s.hp>0?clamp((5-tt)/4,0,1):0; if(s.hp>0&&tt<worst){ worst=tt; ws=i; }
    const L=SL[i]; V.set(s.p.x,0,s.p.z+.78).project(stCam); L.e.style.transform=`translate3d(${((V.x*.5+.5)*W).toFixed(1)}px,${((-V.y*.5+.5)*H).toFixed(1)}px,0) translate(-50%,0)`;
    const k=(s.hp<=0?'dead':s.thr>.25?'thr':'')+(st.state==='play'?'':' off'); if(k!==L.k){ L.k=k; L.e.className='ae-site '+k; L.e.style.opacity=st.state==='play'?'':'0'; }
    if(L.hp!==s.hp){ L.hp=s.hp; L.bar.style.transform=`scaleX(${s.hp.toFixed(3)})`; } }
  if(!playing) return;
  const g=game, Wv=WAVES[g.wave];
  const warnOn=worst<4.5; if(warnOn!==HUD.warnOn){ HUD.warnOn=warnOn; warnEl.classList.toggle('on',warnOn); topEl.classList.toggle('thr',warnOn); }
  if(warnOn){ const w=SITES[ws].name+' '+Math.max(1,Math.ceil(worst))+' s'; if(w!==HUD.warn){ HUD.warn=w; warnT.textContent=w; } if(worst<3&&clk-g.alarmT>2.4){ g.alarmT=clk; A.alarm(); } }
  const sc=fmt(g.score); if(sc!==HUD.score){ HUD.score=sc; scoreEl.textContent=sc; }
  const wv='Wave '+(g.wave+1)+' / 3'; if(wv!==HUD.wave){ HUD.wave=wv; waveEl.textContent=wv; }
  const wn=g.phase==='brief'?Wv.name:g.bag.length?Wv.name:'Clearing'; if(wn!==HUD.waveN){ HUD.waveN=wn; waveN.textContent=wn; }
  waveM.style.transform=`scaleX(${(g.phase==='brief'?0:clamp(g.wt/Wv.dur,0,1)).toFixed(3)})`;
  for(let i=0;i<AMMO;i++){ const P=PIPS[i], q=Math.floor(g.reload/RELOAD*12), k=i<g.ammo?'f':i===g.ammo?'r'+q:'e';
    if(k!==P.k){ P.k=k; P.i.className=k==='f'?'f':k==='e'?'':'r'; P.b.style.transform=k==='f'?'none':k==='e'?'scaleY(0)':`scaleY(${(q/12).toFixed(3)})`; } }
  const out=g.ammo<1; if(out!==HUD.pipOut){ HUD.pipOut=out; pipsEl.classList.toggle('out',out); }
  const q=Math.round(g.jamCD/JAMCD*80); if(q!==HUD.jamOff){ HUD.jamOff=q; jamP.style.strokeDashoffset=(238.8*q/80).toFixed(1); }
  const jt=g.jamCD>0?Math.ceil(g.jamCD)+' s':'Jam'; if(jt!==HUD.jam){ HUD.jam=jt; jamTx.textContent=jt; jamB.classList.toggle('cd',g.jamCD>0); }
  tblT-=dt; if(tblT<=0){ tblT=.125; buildTable(); }
}

/* ---------- camera: solve a framing for the scope in a screen rectangle, then drift ---------- */
const FC=new T.PerspectiveCamera(36,1,.1,900), FV=new T.Vector3(), FR={play:{D:18,tx:0,tz:0,el:.8},menu:{D:12,tx:0,tz:0,el:.5}};
function solveFrame(o,el,R,rect){
  const W=innerWidth, H=innerHeight; FC.fov=stCam.fov; FC.aspect=W/H; FC.updateProjectionMatrix();
  let Dd=18, tx=0, tz=0;
  for(let it=0;it<60;it++){
    FC.position.set(tx,Math.sin(el)*Dd,tz+Math.cos(el)*Dd); FC.lookAt(tx,0,tz); FC.updateMatrixWorld();
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(let k=0;k<40;k++){ const a=k/40*TAU; FV.set(Math.cos(a)*R,0,Math.sin(a)*R).project(FC); const sx=(FV.x*.5+.5)*W, sy=(-FV.y*.5+.5)*H; x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy); }
    const bw=x1-x0, bh=y1-y0; Dd*=Math.pow(Math.max(bw/(rect[2]-rect[0]),bh/(rect[3]-rect[1])),.6);
    tx+=((x0+x1)/2-(rect[0]+rect[2])/2)/(bw/(2*R))*.6; tz+=((y0+y1)/2-(rect[1]+rect[3])/2)/(bh/(2*R))*.6;
  }
  o.D=Dd; o.tx=tx; o.tz=tz; o.el=el;
}
function layout(){
  const W=innerWidth, H=innerHeight, mob=W<=820, key=W+'x'+H; if(key===layoutKey) return; layoutKey=key;
  drawLabels(mob); GU.uLab.value=mob?.62:.5;
  if(mob){ solveFrame(FR.play,1.22,RS+.3,[8,H*.2,W-8,H-292]); solveFrame(FR.menu,.74,3.9,[0,H*.46,W,H-110]); }
  else { solveFrame(FR.play,.8,RS+.62,[40,112,W-372,H-30]); solveFrame(FR.menu,.5,3.6,[W*.25,90,W-370,H-120]); }
}
function cam(t){
  const f=st.state==='menu'?FR.menu:FR.play, k=RM?0:1, az=k*(Math.sin(t*.07)*.05+(st.state==='menu'?Math.sin(t*.043)*.06:0)), el=f.el+k*Math.sin(t*.05)*.012;
  st.camL.set(f.tx,0,f.tz); st.camP.set(f.tx+Math.sin(az)*Math.cos(el)*f.D,Math.sin(el)*f.D,f.tz+Math.cos(az)*Math.cos(el)*f.D);
}
const AN=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
let paused=false;   // test hook: freeze the simulation while frames keep rendering
st.update=function(dt,t){
  if(!GU) return;
  if(paused) dt=0;
  clk+=dt; GU.uNow.value=clk; rotorMat.uniforms.uT.value=clk; layout();
  if(bootT<1){ bootT=Math.min(1,bootT+dt/1.8); GU.uBoot.value=E.o(bootT); }
  const s0=sw; sw=(sw+dt*TAU/SWEEP)%TAU; GU.uSw.value=sw; if(sw<s0) A.ping(880,st.state==='play'?.02:.011);
  cpAnt.rotation.y=-sw;
  if(st.state==='play'&&game) flow(dt); else attract(dt);
  const playing=st.state==='play'&&!!game;
  for(const g of GP) if(g.on) stepGroup(g,dt);
  for(const d of D) if(d.on) stepDrone(d,dt);
  sweepPaint(s0,sw);
  for(const m of MS) if(m.on) stepM(m,dt);
  stepPuffs(dt); debris.update(dt,1.6,1.3); sitesStep(dt);
  writeScene(); writeHUD(dt,playing); cam(t);
  if(playing&&FINE) cursorAim(true);   // setState clears it on leaving play; toggling an existing class is a no-op
  if(st.state==='menu'){ AN[0].set(.06,.6,-.04); if(menuDemo) AN[1].copy(menuDemo.p); else AN[1].set(2.55,1.05,.3); AN[2].copy(SITES[0].p).setY(.3); st.anchors=AN; notesUpdate(st); }
};
st._dbg={get game(){return game}, D, GP, MS, SITES, engage, jam, end, pick, rowEngage, ROWS, flow, get clk(){return clk}, pause(v){ paused=!!v; }};
})();

/* ===== station ph ===== */
/* ================= PHAROS: LOST SIGNAL =================
   GPS is jammed. The drone's downward camera runs through Pharos's pipeline (raw, rectify, describe) and you make the
   match: put the camera's view on the map. Then Pharos shows its own answer: a normalised cross-correlation of the
   camera's edge image against the map's edge image, computed here over the search area and drawn as a surface of light.
   The camera frame is painted from the same world as the map but in another season, light and noise, so only the edges
   agree, which is the point of the describe step.
   One mapping everywhere. Map space: px, py in [0, MAP), py grows to the south. World: x=(px/MAP-.5)*PW,
   z=(py/MAP-.5)*PW, y=relief. The map shader derives map space from world position, clicks are ray cast onto the
   relief and converted back, so the circle, footprints, heat map, markers and clicks cannot disagree. */
(()=>{
const st=mkStation('ph',{arrive:new T.Vector3(0,3,5)});
const sc=st.scene, el=st.el, q=s=>$(s,el);
const MAP=1024, MPX=2, PW=12, FEED=160, DS=4, LO=MAP/DS, PS=FEED/DS, GN=96, GSTEP=4, MS=2, MG=GN/MS, HG=65, RELIEF=.3;
const CR=448, CS=2, CSZ=CR*CS, EN=FEED*CS, SEG=Q<1?96:128, RMAX=186, ROUNDS=5, MARG=150, CM=RMAX*.92;
const m2w=v=>(v/MAP-.5)*PW, TOUCH=!FINE;
const ACC=new T.Color('#FFD5B3');

/* ---------- buffers: two map sets so a new map can be built in the background and scanned in ---------- */
function mkSet(k){
  const c=new Uint8ClampedArray(MAP*MAP*4), t=new T.DataTexture(new Uint8Array(c.buffer),MAP,MAP,T.RGBAFormat,T.UnsignedByteType);
  t.minFilter=T.LinearMipmapLinearFilter; t.magFilter=T.LinearFilter; t.generateMipmaps=true; t.colorSpace=T.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); t.flipY=false;
  return {k,w:null,tex:c,t,hgt:new Float32Array(HG*HG),elo:new Float32Array(LO*LO),s1:new Float64Array((LO+1)*(LO+1)),s2:new Float64Array((LO+1)*(LO+1))};
}
const SETS=[mkSet(0),mkSet(1)]; let cur=0;
const LUM=new Float32Array(MAP*MAP), LOW=new Float32Array(LO*LO), TMP=new Float32Array(LO*LO), SH=new Float32Array(HG*HG);
const cv2=(n,rf)=>{ const c=document.createElement('canvas'); c.width=c.height=n; return [c,c.getContext('2d',rf?{willReadFrequently:true}:undefined)]; };
const [mapCv,mapX]=cv2(MAP,true);
// paint and read back on a CPU canvas; the feed draws every frame from a GPU copy made once per fix
const CAM=[0,1].map(()=>{ const [c,x]=cv2(CSZ,true), [g,gx]=cv2(CSZ), [e,ex]=cv2(EN); return {c,x,g,gx,e,ex,img:ex.createImageData(EN,EN)}; });
const [rotCv,rotX]=cv2(CSZ);
const CLUM=new Float32Array(EN*EN), PT=new Float32Array(PS*PS), PT2=new Float32Array(PS*PS);
const HEAT=[new Float32Array(GN*GN),new Float32Array(GN*GN)];

/* ---------- an Irish landscape, generated: Atlantic to the west, drumlins, small hedged fields ---------- */
function genWorld(seed){
  const R=seeded(seed), rn=(a,b)=>a+(b-a)*R(), gs=()=>{let u=0,v=0;while(!u)u=R();while(!v)v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);};
  const w={seed,fields:[],hedges:[],trees:[],woods:[],bogs:[],roads:[],houses:[],yards:[],farms:[],coast:[]};
  const c0=rn(66,118), ca=R()*TAU, cb=R()*TAU, cc=R()*TAU;
  for(let y=-32;y<=MAP+32;y+=8) w.coast.push([c0+Math.sin(y*.0047+ca)*40+Math.sin(y*.016+cb)*15+Math.sin(y*.05+cc)*5,y]);
  w.shore=y=>{ const k=clamp((y+32)/8,0,w.coast.length-1.001), i=k|0; return lerp(w.coast[i][0],w.coast[i+1][0],k-i); };
  let hi=-1; w.coast.forEach((p,i)=>{ if(p[1]>150&&p[1]<MAP-150&&(hi<0||p[0]<w.coast[hi][0])) hi=i; });
  w.lh=[w.coast[hi][0]+10,w.coast[hi][1]];
  // fields: a jittered grid, some cells split, hedges on almost every boundary
  const NG=11, cell=MAP/NG, V=[], mix2=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
  for(let j=0;j<=NG;j++){ V[j]=[]; for(let i=0;i<=NG;i++){ const e=i===0||i===NG||j===0||j===NG; V[j][i]=[i*cell+(e?0:gs()*cell*.15),j*cell+(e?0:gs()*cell*.15)]; } }
  const field=p=>{ const r=R(); w.fields.push({p,kind:r<.6?0:r<.8?1:r<.93?2:3,t:R(),alt:R(),ang:R()*Math.PI}); };
  for(let j=0;j<NG;j++) for(let i=0;i<NG;i++){
    const qd=[V[j][i],V[j][i+1],V[j+1][i+1],V[j+1][i]], r=R();
    if(r<.16){ field([qd[0],qd[1],qd[2]]); field([qd[0],qd[2],qd[3]]); w.hedges.push([qd[0],qd[2]]); }
    else if(r<.5){ const t1=rn(.3,.7), t2=rn(.3,.7);
      if(R()<.5){ const a=mix2(qd[0],qd[1],t1), b=mix2(qd[3],qd[2],t2); field([qd[0],a,b,qd[3]]); field([a,qd[1],qd[2],b]); w.hedges.push([a,b]); }
      else { const a=mix2(qd[0],qd[3],t1), b=mix2(qd[1],qd[2],t2); field([qd[0],qd[1],b,a]); field([a,b,qd[2],qd[3]]); w.hedges.push([a,b]); } }
    else field(qd);
  }
  for(let j=0;j<=NG;j++) for(let i=0;i<NG;i++) if(R()<.92) w.hedges.push([V[j][i],V[j][i+1]]);
  for(let j=0;j<NG;j++) for(let i=0;i<=NG;i++) if(R()<.92) w.hedges.push([V[j][i],V[j+1][i]]);
  w.hedges.forEach(([a,b])=>{ const L=Math.hypot(b[0]-a[0],b[1]-a[1]); for(let s=rn(4,12);s<L-4;s+=rn(10,26)) if(R()<.5){ const t=s/L; w.trees.push([lerp(a[0],b[0],t)+gs()*1.4,lerp(a[1],b[1],t)+gs()*1.4,rn(2.6,5)]); } });
  // woods and a cutaway bog
  for(let k=0;k<4;k++){ const cx=rn(220,MAP-60), cy=rn(60,MAP-60), r0=rn(28,58), pts=[], ph=R()*TAU, cr=[];
    for(let a=0;a<26;a++){ const t=a/26*TAU, rr=r0*(1+.26*Math.sin(t*3+ph)+.1*gs()); pts.push([cx+Math.cos(t)*rr*1.25,cy+Math.sin(t)*rr*.85]); }
    for(let c=0;c<Math.round(r0*r0*.1);c++){ const t=R()*TAU, rr=Math.sqrt(R())*r0; cr.push([cx+Math.cos(t)*rr*1.22,cy+Math.sin(t)*rr*.82,rn(2.6,5.6)]); }
    w.woods.push({pts,cr}); }
  { const cx=rn(300,MAP-160), cy=rn(160,MAP-160), r0=rn(46,74), pts=[], ph=R()*TAU;
    for(let a=0;a<22;a++){ const t=a/22*TAU, rr=r0*(1+.22*Math.sin(t*2+ph)+.08*gs()); pts.push([cx+Math.cos(t)*rr,cy+Math.sin(t)*rr*.78]); }
    w.bogs.push({pts,ang:R()*Math.PI,cx,cy,r:r0}); }
  // a river from the east that finds the sea
  { let x=MAP+26, y=rn(MAP*.28,MAP*.72), a=Math.PI+gs()*.2; const p=[];
    for(let g=0;g<420;g++){ p.push([x,y]); a+=gs()*.2+(Math.PI-a)*.07+Math.sin(g*.31)*.06; x+=Math.cos(a)*11; y=clamp(y+Math.sin(a)*11,50,MAP-50); if(x<w.shore(y)-30){ p.push([x,y]); break; } }
    w.river=p; }
  // a lough, away from the river
  { let best=null; for(let k=0;k<24;k++){ const cx=rn(MAP*.45,MAP-110), cy=rn(110,MAP-110); let d=1e9; for(const p of w.river) d=Math.min(d,Math.hypot(p[0]-cx,p[1]-cy)); if(!best||d>best.d) best={cx,cy,d}; }
    const r0=rn(40,62), pts=[], ph=R()*TAU; for(let a=0;a<30;a++){ const t=a/30*TAU, rr=r0*(1+.24*Math.sin(t*2+ph)+.12*Math.sin(t*5+ph*2)+.04*gs()); pts.push([best.cx+Math.cos(t)*rr*1.2,best.cy+Math.sin(t)*rr*.85]); }
    w.lough={pts,cx:best.cx,cy:best.cy,r:r0}; }
  // roads: a national road north to south, a road west to the shore, one east, and boreens to farms
  const roadPts=(a,b,amp,n)=>{ const p=[], p1=R()*TAU, p2=R()*TAU, dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L;
    for(let k=0;k<=n;k++){ const t=k/n, s=Math.sin(t*Math.PI)*(Math.sin(t*5.1+p1)*.7+Math.sin(t*11.3+p2)*.3)*amp; p.push([a[0]+dx*t+nx*s,a[1]+dy*t+ny*s]); } return p; };
  const at=(p,t)=>p[Math.round(t*(p.length-1))];
  const main=roadPts([rn(MAP*.38,MAP*.68),-24],[rn(MAP*.32,MAP*.72),MAP+24],58,30); w.roads.push({p:main,k:0});
  const j1=at(main,rn(.28,.44)), j2=at(main,rn(.58,.78));
  const west=roadPts(j1,[w.shore(j1[1])+14,j1[1]+rn(-90,90)],30,20); w.roads.push({p:west,k:1});
  const east=roadPts(j2,[MAP+24,j2[1]+rn(-150,150)],38,20); w.roads.push({p:east,k:1});
  for(let k=0;k<4;k++){ const base=[main,west,east,main][k], s=at(base,rn(.18,.82)), an=R()*TAU, L=rn(60,130), e=[clamp(s[0]+Math.cos(an)*L,40,MAP-40),clamp(s[1]+Math.sin(an)*L,40,MAP-40)];
    w.roads.push({p:roadPts(s,e,10,10),k:2}); w.farms.push(e); }
  // a village strung along the road around the junction, a GAA pitch beside it, farms at the end of the boreens
  const ribbon=(p,c,rad,dens)=>{ for(let k=1;k<p.length;k++){ const a=p[k-1], b=p[k], L=Math.hypot(b[0]-a[0],b[1]-a[1]), an=Math.atan2(b[1]-a[1],b[0]-a[0]);
    for(let s=0;s<L;s+=rn(10,16)) for(const sd of [-1,1]){ const t=s/L, x=lerp(a[0],b[0],t), y=lerp(a[1],b[1],t); if(Math.hypot(x-c[0],y-c[1])>rad||R()>dens) continue; const off=sd*rn(10,14);
      w.houses.push({x:x-Math.sin(an)*off,y:y+Math.cos(an)*off,a:an,w:rn(7,11),h:rn(5,7.5),roof:(R()*4)|0}); } } };
  ribbon(main,j1,120,.8); ribbon(west,j1,90,.7); ribbon(east,[MAP*2,0],0,0);
  for(const r of [west,east]) for(let k=2;k<r.length-1;k+=3) if(R()<.4){ const a=r[k], b=r[k+1], an=Math.atan2(b[1]-a[1],b[0]-a[0]), sd=R()<.5?-1:1;
    w.houses.push({x:a[0]-Math.sin(an)*13*sd,y:a[1]+Math.cos(an)*13*sd,a:an,w:rn(8,11),h:rn(5,7),roof:(R()*4)|0}); }
  { const k=Math.round(main.length*.38), a=main[Math.max(0,k-1)], b=main[k], an=Math.atan2(b[1]-a[1],b[0]-a[0]), sd=R()<.5?-1:1;
    w.pitch={x:j1[0]-Math.sin(an)*56*sd,y:j1[1]+Math.cos(an)*56*sd+rn(-30,30),a:an,w:72,h:45}; }
  w.farms.forEach(f=>{ const a=R()*Math.PI; w.yards.push({x:f[0],y:f[1],a,w:rn(26,34),h:rn(18,24)}); const n=2+((R()*3)|0);
    for(let k=0;k<n;k++) w.houses.push({x:f[0]+gs()*8,y:f[1]+gs()*6,a:a+(R()<.5?0:Math.PI/2),w:rn(9,16),h:rn(5,8),roof:(R()*4)|0}); });
  // nothing built in the sea, the lough or on the pitch
  const pc=w.pitch; w.houses=w.houses.filter(h=>h.x>w.shore(h.y)+8&&Math.hypot(h.x-w.lough.cx,h.y-w.lough.cy)>w.lough.r*1.35&&Math.hypot(h.x-pc.x,h.y-pc.y)>48);
  const bb=p=>{ let a=1e9,b=1e9,c=-1e9,d=-1e9; for(const q of p){ a=Math.min(a,q[0]); b=Math.min(b,q[1]); c=Math.max(c,q[0]); d=Math.max(d,q[1]); } return [a,b,c,d]; };
  w.fields.forEach(f=>f.bb=bb(f.p)); w.woods.forEach(f=>f.bb=bb(f.pts)); w.bogs.forEach(f=>f.bb=bb(f.pts));
  return w;
}

/* two palettes over the same world: the map (a summer orthophoto) and the camera (late autumn, low sun, cloud) */
const PAL={
  map:{base:'#56623f',past:['#5d6c40','#647341','#6c7845','#566640','#5f6f3e','#6a7746','#526238'],hay:['#80804c','#8a8653','#77804a'],till:['#6a5a41','#5f533c','#735f45'],rough:['#5a5d42','#615f45'],stub:['#80804c'],
    hedge:'#24301c',tree:'#1d2817',wood:'#223019',crown:'#1a2414',crownHi:'#2c3b21',bog:'#57493a',cut:'#3a2f25',bank:'#2b3227',water:'#2b3c46',reed:'#4a5238',
    sea:'#1b2a33',sand:'#9a9273',surf:'rgba(226,232,228,.3)',edge:'#2a2a25',road:['#8e8b82','#85827a','#7b705a'],roadW:[[11,8],[8,5.4],[0,3.6]],
    roofs:['#5b5f66','#c8c3b7','#7b4535','#8b8e90'],shadow:'rgba(8,10,6,.5)',sx:-2.2,sy:-1.8,yard:'#76736a',pitch:'#5f8c45',line:'rgba(240,240,230,.75)'},
  cam:{base:'#646640',past:['#6f7a43','#7a8247','#66713f','#5e6a3c'],hay:['#a8955c','#9e8b55','#b39f66'],till:['#5e4a33','#6b553a','#54432f'],rough:['#6e6446','#786c4b'],stub:['#b6a46b','#a9965f'],
    hedge:'#2b2b19',tree:'#232514',wood:'#2b3019',crown:'#25291a',crownHi:'#3f4227',bog:'#664f38',cut:'#3d2e22',bank:'#33352a',water:'#4a5761',reed:'#6a6440',
    sea:'#2a3a45',sand:'#b0a37e',surf:'rgba(240,244,240,.45)',edge:'#30302a',road:['#a39f93','#9a968b','#8c7d61'],roadW:[[11,8],[8,5.4],[0,3.6]],
    roofs:['#4f5359','#d8d2c4','#8a4a35','#9a9c9b'],shadow:'rgba(6,6,2,.62)',sx:4.2,sy:3,yard:'#86837a',pitch:'#6d8f4a',line:'rgba(245,245,236,.8)'}
};
function polyPath(x,p){ x.moveTo(p[0][0],p[0][1]); for(let k=1;k<p.length;k++) x.lineTo(p[k][0],p[k][1]); x.closePath(); }
function smoothPath(x,p){ x.moveTo(p[0][0],p[0][1]); for(let k=1;k<p.length-1;k++) x.quadraticCurveTo(p[k][0],p[k][1],(p[k][0]+p[k+1][0])/2,(p[k][1]+p[k+1][1])/2); x.lineTo(p[p.length-1][0],p[p.length-1][1]); }
function smoothLoop(x,p){ const n=p.length; x.moveTo((p[n-1][0]+p[0][0])/2,(p[n-1][1]+p[0][1])/2); for(let k=0;k<n;k++){ const a=p[k], b=p[(k+1)%n]; x.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2); } x.closePath(); }
function stripes(x,cx,cy,ang,sp,ext){ const ca=Math.cos(ang), sa=Math.sin(ang); x.beginPath(); for(let k=-ext/sp;k<=ext/sp;k++){ const ox=-sa*k*sp, oy=ca*k*sp; x.moveTo(cx+ox-ca*ext,cy+oy-sa*ext); x.lineTo(cx+ox+ca*ext,cy+oy+sa*ext); } x.stroke(); }
function paint(x,w,mode,clouds,rg,part){ // part 0: ground cover, part 1: everything on top, undefined: both
  const P=PAL[mode], cam=mode==='cam', R0=rg||[-1e9,-1e9,1e9,1e9];
  const vis=b=>b[2]>=R0[0]&&b[0]<=R0[2]&&b[3]>=R0[1]&&b[1]<=R0[3], near=(x_,y_,r)=>x_+r>=R0[0]&&x_-r<=R0[2]&&y_+r>=R0[1]&&y_-r<=R0[3];
  x.lineCap='round'; x.lineJoin='round';
  if(part!==1){ x.fillStyle=P.base; x.fillRect(-80,-80,MAP+160,MAP+160);
  for(const f of w.fields){ if(!vis(f.bb)) continue;
    let kind=f.kind; if(cam&&kind===0&&f.alt<.2) kind=4; if(cam&&kind===1&&f.alt>.45) kind=4; if(cam&&kind===2&&f.alt>.6) kind=0;
    const pal=[P.past,P.hay,P.till,P.rough,P.stub][kind]; x.fillStyle=pal[Math.floor((cam?f.alt:f.t)*pal.length)%pal.length];
    x.beginPath(); polyPath(x,f.p); x.fill();
    if(kind===1||kind===2||kind===4){ let cx=0,cy=0; for(const p of f.p){ cx+=p[0]; cy+=p[1]; } cx/=f.p.length; cy/=f.p.length;
      x.save(); x.clip(); x.lineWidth=kind===2?1.3:1; x.strokeStyle=kind===2?'rgba(22,16,10,.3)':'rgba(40,36,16,.17)'; stripes(x,cx,cy,f.ang,kind===2?3.4:kind===4?4.4:6,90);
      if(kind===4&&cam){ x.fillStyle='rgba(236,226,190,.85)'; x.beginPath(); for(let k=0;k<9;k++){ const bx=cx+Math.cos(f.ang)*(k-4)*9, by=cy+Math.sin(f.ang)*(k-4)*9; x.moveTo(bx+1.7,by); x.arc(bx,by,1.7,0,TAU); } x.fill(); }
      x.restore(); }
  }
  for(const b of w.bogs){ if(!vis(b.bb)) continue; x.fillStyle=P.bog; x.beginPath(); smoothLoop(x,b.pts); x.fill(); x.save(); x.clip(); x.strokeStyle=P.cut; x.lineWidth=2.4; stripes(x,b.cx,b.cy,b.ang,8,100); x.restore(); }
  for(const wd of w.woods){ if(!vis(wd.bb)) continue; x.fillStyle=P.wood; x.beginPath(); smoothLoop(x,wd.pts); x.fill(); x.save(); x.clip();
    x.fillStyle=P.crown; x.beginPath(); for(const c of wd.cr){ x.moveTo(c[0]+c[2],c[1]); x.arc(c[0],c[1],c[2],0,TAU); } x.fill();
    x.fillStyle=P.crownHi; x.beginPath(); for(const c of wd.cr){ x.moveTo(c[0]-1+c[2]*.45,c[1]-1); x.arc(c[0]-1,c[1]-1,c[2]*.45,0,TAU); } x.fill(); x.restore(); }
  }
  if(part===0) return;
  const hv=h=>near((h[0][0]+h[1][0])/2,(h[0][1]+h[1][1])/2,Math.abs(h[0][0]-h[1][0])/2+Math.abs(h[0][1]-h[1][1])/2+8);
  x.strokeStyle=P.shadow; x.lineWidth=5; x.beginPath(); for(const h of w.hedges){ if(!hv(h)) continue; x.moveTo(h[0][0]+P.sx,h[0][1]+P.sy); x.lineTo(h[1][0]+P.sx,h[1][1]+P.sy); } x.stroke();
  x.strokeStyle=P.hedge; x.lineWidth=3.6; x.beginPath(); for(const h of w.hedges){ if(!hv(h)) continue; x.moveTo(h[0][0],h[0][1]); x.lineTo(h[1][0],h[1][1]); } x.stroke();
  x.fillStyle=P.shadow; x.beginPath(); for(const t of w.trees){ if(!near(t[0],t[1],12)) continue; const sx=t[0]+P.sx*1.3, sy=t[1]+P.sy*1.3; x.moveTo(sx+t[2],sy); x.arc(sx,sy,t[2],0,TAU); } x.fill();
  x.fillStyle=P.tree; x.beginPath(); for(const t of w.trees){ if(!near(t[0],t[1],8)) continue; x.moveTo(t[0]+t[2],t[1]); x.arc(t[0],t[1],t[2],0,TAU); } x.fill();
  x.strokeStyle=P.bank; x.lineWidth=15; x.beginPath(); smoothPath(x,w.river); x.stroke();
  x.strokeStyle=P.water; x.lineWidth=9; x.beginPath(); smoothPath(x,w.river); x.stroke();
  x.beginPath(); smoothLoop(x,w.lough.pts); x.strokeStyle=P.reed; x.lineWidth=9; x.stroke(); x.fillStyle=P.water; x.fill();
  for(const k of [2,1,0]) for(const r of w.roads) if(r.k===k){ const ew=P.roadW[k][0], sw=P.roadW[k][1];
    if(ew){ x.strokeStyle=P.edge; x.lineWidth=ew; x.beginPath(); smoothPath(x,r.p); x.stroke(); }
    x.strokeStyle=P.road[k]; x.lineWidth=sw; x.beginPath(); smoothPath(x,r.p); x.stroke(); }
  const pc=w.pitch; x.save(); x.translate(pc.x,pc.y); x.rotate(pc.a); x.fillStyle=P.pitch; x.fillRect(-pc.w/2,-pc.h/2,pc.w,pc.h); x.strokeStyle=P.line; x.lineWidth=1;
  x.strokeRect(-pc.w/2+2.5,-pc.h/2+2.5,pc.w-5,pc.h-5); x.beginPath(); x.moveTo(0,-pc.h/2+2.5); x.lineTo(0,pc.h/2-2.5); x.moveTo(-pc.w/2+13,-pc.h/2+2.5); x.lineTo(-pc.w/2+13,pc.h/2-2.5); x.moveTo(pc.w/2-13,-pc.h/2+2.5); x.lineTo(pc.w/2-13,pc.h/2-2.5); x.stroke(); x.restore();
  for(const y of w.yards){ if(!near(y.x,y.y,30)) continue; x.save(); x.translate(y.x,y.y); x.rotate(y.a); x.fillStyle=P.yard; x.fillRect(-y.w/2,-y.h/2,y.w,y.h); x.restore(); }
  for(const h of w.houses){ if(!near(h.x,h.y,16)) continue; x.fillStyle=P.shadow; x.save(); x.translate(h.x+P.sx*.9,h.y+P.sy*.9); x.rotate(h.a); x.fillRect(-h.w/2,-h.h/2,h.w,h.h); x.restore();
    x.save(); x.translate(h.x,h.y); x.rotate(h.a); x.fillStyle=P.roofs[h.roof]; x.fillRect(-h.w/2,-h.h/2,h.w,h.h); x.fillStyle='rgba(0,0,0,.24)'; x.fillRect(-h.w/2,0,h.w,h.h/2); x.restore(); }
  x.fillStyle=P.sea; x.beginPath(); x.moveTo(-80,-80); for(const c of w.coast) x.lineTo(c[0],c[1]); x.lineTo(-80,MAP+80); x.closePath(); x.fill();
  x.strokeStyle=P.sand; x.lineWidth=5; x.beginPath(); w.coast.forEach((c,i)=>i?x.lineTo(c[0],c[1]):x.moveTo(c[0],c[1])); x.stroke();
  x.strokeStyle=P.surf; x.lineWidth=1.6; x.beginPath(); w.coast.forEach((c,i)=>i?x.lineTo(c[0]-7,c[1]):x.moveTo(c[0]-7,c[1])); x.stroke();
  x.fillStyle='#e9e5da'; x.beginPath(); x.arc(w.lh[0],w.lh[1],3.4,0,TAU); x.fill(); x.strokeStyle='#2a2a26'; x.lineWidth=1.2; x.stroke();
  if(clouds) for(const c of clouds){ const g=x.createRadialGradient(c[0],c[1],0,c[0],c[1],c[2]); g.addColorStop(0,'rgba(10,12,20,.34)'); g.addColorStop(.6,'rgba(10,12,20,.18)'); g.addColorStop(1,'rgba(10,12,20,0)'); x.fillStyle=g; x.fillRect(c[0]-c[2],c[1]-c[2],c[2]*2,c[2]*2); }
}

/* ---------- relief: drumlins aligned NE to SW, a river valley, land falling to the sea ---------- */
function vnoise(R){ const N=64, v=new Float32Array(N*N); for(let i=0;i<N*N;i++) v[i]=R();
  return (x,y)=>{ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), s=yf*yf*(3-2*yf);
    return lerp(lerp(v[(yi&63)*N+(xi&63)],v[(yi&63)*N+((xi+1)&63)],u),lerp(v[((yi+1)&63)*N+(xi&63)],v[((yi+1)&63)*N+((xi+1)&63)],u),s); }; }
function genHeights(S){
  const w=S.w, R=seeded(w.seed^0x5bd1e9), n1=vnoise(R), n2=vnoise(R), h=S.hgt, ca=Math.cos(.62), sa=Math.sin(.62);
  for(let j=0;j<HG;j++) for(let i=0;i<HG;i++){ const px=i/(HG-1)*MAP, py=j/(HG-1)*MAP, u=(px*ca+py*sa)/MAP, v=(-px*sa+py*ca)/MAP;
    let z=n1(u*4.2+11,v*1.9+5)*.62+n1(u*8.5+3,v*3.8+9)*.26+n2(u*16,v*16)*.12; z=sstep(.18,.92,z);
    let dr=1e9; for(let k=0;k<w.river.length;k+=2){ const p=w.river[k], d=(p[0]-px)**2+(p[1]-py)**2; if(d<dr) dr=d; }
    z*=1-.75*Math.exp(-dr/(80*80)); const sx=w.shore(py); z*=sstep(sx-4,sx+120,px);
    z*=sstep(w.lough.r*.6,w.lough.r*2.4,Math.hypot(px-w.lough.cx,py-w.lough.cy)); h[j*HG+i]=clamp(z,0,1); }
  const cw=MAP/(HG-1), ex=RELIEF/PW*MAP*5;
  for(let j=0;j<HG;j++) for(let i=0;i<HG;i++){ const i0=Math.max(0,i-1), i1=Math.min(HG-1,i+1), j0=Math.max(0,j-1), j1=Math.min(HG-1,j+1);
    const dx=(h[j*HG+i1]-h[j*HG+i0])*ex/((i1-i0)*cw), dy=(h[j1*HG+i]-h[j0*HG+i])*ex/((j1-j0)*cw), nl=1/Math.sqrt(dx*dx+dy*dy+1);
    SH[j*HG+i]=clamp(.38+.78*(dx*.55+.68+dy*.48)*nl,.5,1.3); }
}
function hAt(S,px,py){ const gx=clamp(px/MAP,0,1)*(HG-1), gy=clamp(py/MAP,0,1)*(HG-1), i=Math.min(HG-2,gx|0), j=Math.min(HG-2,gy|0), fx=gx-i, fy=gy-j, h=S.hgt;
  return lerp(lerp(h[j*HG+i],h[j*HG+i+1],fx),lerp(h[(j+1)*HG+i],h[(j+1)*HG+i+1],fx),fy)*RELIEF; }

/* ---------- describe: Sobel edges, soft threshold; the same function for the map and the camera ---------- */
const edgeK=m=>{ const e=(m-26)/150; return e<=0?0:e>=1?1:e; };
function blur3(src,dst){ // binomial 3x3 on the LO grid
  for(let y=0;y<LO;y++) for(let x=0;x<LO;x++){ const i=y*LO+x; TMP[i]=(src[x>0?i-1:i]+2*src[i]+src[x<LO-1?i+1:i])*.25; }
  for(let y=0;y<LO;y++) for(let x=0;x<LO;x++){ const i=y*LO+x; dst[i]=(TMP[y>0?i-LO:i]+2*TMP[i]+TMP[y<LO-1?i+LO:i])*.25; }
}
function integ(E,s1,s2){ const W=LO+1; s1.fill(0); s2.fill(0);
  for(let y=0;y<LO;y++){ let r1=0,r2=0; for(let x=0;x<LO;x++){ const v=E[y*LO+x]; r1+=v; r2+=v*v; s1[(y+1)*W+x+1]=s1[y*W+x+1]+r1; s2[(y+1)*W+x+1]=s2[y*W+x+1]+r2; } } }
function* buildSet(S,seed){
  S.w=genWorld(seed); yield;
  genHeights(S); yield;
  mapX.setTransform(1,0,0,1,0,0); paint(mapX,S.w,'map'); yield;
  const d=mapX.getImageData(0,0,MAP,MAP).data; yield;
  for(let i=0,n=MAP*MAP;i<n;i++){ const o=i*4; LUM[i]=d[o]*.299+d[o+1]*.587+d[o+2]*.114; } yield;
  LOW.fill(0); const tex=S.tex, L=LUM; let sd=seed|0;
  for(let y0=0;y0<MAP;y0+=64){
    for(let y=y0;y<y0+64;y++){ const gy=y/MAP*(HG-1), j=Math.min(HG-2,gy|0), fy=gy-j, lr=(y>>2)*LO;
      for(let x=0;x<MAP;x++){ const i=y*MAP+x; let e=0;
        if(x>0&&y>0&&x<MAP-1&&y<MAP-1){ const a=L[i-MAP-1],b=L[i-MAP],c=L[i-MAP+1],dl=L[i-1],f=L[i+1],g=L[i+MAP-1],h=L[i+MAP],k=L[i+MAP+1];
          const sx=(c+2*f+k)-(a+2*dl+g), sy=(g+2*h+k)-(a+2*b+c); e=edgeK(Math.sqrt(sx*sx+sy*sy)); }
        LOW[lr+(x>>2)]+=e;
        const gx=x/MAP*(HG-1), ii=Math.min(HG-2,gx|0), fx=gx-ii, s=lerp(lerp(SH[j*HG+ii],SH[j*HG+ii+1],fx),lerp(SH[(j+1)*HG+ii],SH[(j+1)*HG+ii+1],fx),fy);
        sd=(sd*1664525+1013904223)|0; const nz=((sd>>>24)-128)*.045, o=i*4;
        tex[o]=d[o]*s+nz; tex[o+1]=d[o+1]*s+nz; tex[o+2]=d[o+2]*s+nz; tex[o+3]=e*255; } }
    yield; }
  for(let i=0;i<LO*LO;i++) LOW[i]/=16;
  blur3(LOW,S.elo); integ(S.elo,S.s1,S.s2); yield;
  const a=plane.geometry.attributes['aH'+S.k], n=SEG+1; for(let j=0;j<n;j++) for(let i=0;i<n;i++) a.array[j*n+i]=hAt(S,i/SEG*MAP,j/SEG*MAP); a.needsUpdate=true;
  S.t.needsUpdate=true; S.ready=true;
}

/* ---------- the camera: a frame of the same ground in another season, then its edges ---------- */
function camPaint(F,part){ const C=CAM[F.slot], x=C.x; x.setTransform(CS,0,0,CS,-(F.x-CR/2)*CS,-(F.y-CR/2)*CS); paint(x,SETS[F.set].w,'cam',F.clouds,[F.x-CR/2-6,F.y-CR/2-6,F.x+CR/2+6,F.y+CR/2+6],part); x.setTransform(1,0,0,1,0,0); }
function camDescribe(F){
  const C=CAM[F.slot], o=(CR/2-FEED/2)*CS, n=EN, d=C.x.getImageData(o,o,n,n).data, E=C.img.data, L=CLUM; let sd=(F.x*7919+F.y*104729)|0;
  for(let i=0;i<n*n;i++){ sd=(sd*1664525+1013904223)|0; const k=i*4; L[i]=d[k]*.299+d[k+1]*.587+d[k+2]*.114+((sd>>>24)-128)*.035; }
  PT.fill(0);
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){ const i=y*n+x; let e=0;
    if(x>0&&y>0&&x<n-1&&y<n-1){ const a=L[i-n-1],b=L[i-n],c=L[i-n+1],dl=L[i-1],f=L[i+1],g=L[i+n-1],h=L[i+n],k=L[i+n+1];
      const sx=(c+2*f+k)-(a+2*dl+g), sy=(g+2*h+k)-(a+2*b+c); e=edgeK(Math.sqrt(sx*sx+sy*sy)); }
    PT[(y>>3)*PS+(x>>3)]+=e;
    const v=Math.pow(e,.75), o4=i*4; E[o4]=255*v; E[o4+1]=213*v*(.82+.18*v); E[o4+2]=179*v*(.66+.34*v); E[o4+3]=255; }
  C.ex.putImageData(C.img,0,0);
  for(let i=0;i<PS*PS;i++) PT[i]/=64;
  // the same blur as the map, then zero mean and unit norm
  for(let y=0;y<PS;y++) for(let x=0;x<PS;x++){ const i=y*PS+x; PT2[i]=(PT[x>0?i-1:i]+2*PT[i]+PT[x<PS-1?i+1:i])*.25; }
  let m=0; for(let y=0;y<PS;y++) for(let x=0;x<PS;x++){ const i=y*PS+x; PT[i]=(PT2[y>0?i-PS:i]+2*PT2[i]+PT2[y<PS-1?i+PS:i])*.25; m+=PT[i]; }
  m/=PS*PS; let nn=0; for(let i=0;i<PS*PS;i++){ PT[i]-=m; nn+=PT[i]*PT[i]; } F.pn=Math.sqrt(nn)||1;
}
/* normalised cross-correlation of the camera patch against every map window on the grid: integral images give each
   window's mean and variance in O(1), so the cost is one dot product per position */
function correlate(F,j0,j1){
  const S=SETS[F.set], E=S.elo, s1=S.s1, s2=S.s2, W=LO+1, n=PS*PS, P=PT, out=HEAT[F.slot];
  for(let j=j0;j<j1;j++) for(let i=0;i<GN;i++){
    const lx=((F.gx0+i*GSTEP)>>2)-PS/2, ly=((F.gy0+j*GSTEP)>>2)-PS/2, k=j*GN+i;
    if(lx<0||ly<0||lx+PS>LO||ly+PS>LO){ out[k]=0; continue; }
    const a=ly*W+lx, b=a+PS, c=(ly+PS)*W+lx, d=c+PS, m1=s1[d]-s1[b]-s1[c]+s1[a], vr=(s2[d]-s2[b]-s2[c]+s2[a])-m1*m1/n;
    if(vr<1e-7){ out[k]=0; continue; }
    let num=0; for(let y=0;y<PS;y++){ const r=(ly+y)*LO+lx, pr=y*PS; for(let x=0;x<PS;x++) num+=P[pr+x]*E[r+x]; }
    out[k]=num/(F.pn*Math.sqrt(vr));
  }
}
const SORT=new Float32Array(GN*GN);
function corrStats(F){ // peak, runner-up beyond 32 m, and a high percentile inside the circle as the display floor
  const H=HEAT[F.slot]; let pk=-9,pi=0,m=0; for(let k=0;k<GN*GN;k++) if(H[k]>pk){ pk=H[k]; pi=k; }
  let s2b=-9; for(let j=0;j<GN;j++) for(let i=0;i<GN;i++){ const mx=F.gx0+i*GSTEP-F.cx, my=F.gy0+j*GSTEP-F.cy; if(mx*mx+my*my>RMAX*RMAX) continue;
    const v=H[j*GN+i]; SORT[m++]=v; if(Math.max(Math.abs(i-F.ti),Math.abs(j-F.tj))<8) continue; if(v>s2b) s2b=v; }
  const arr=SORT.subarray(0,m).sort(), tv=H[F.tj*GN+F.ti], atT=Math.abs(pi%GN-F.ti)<=2&&Math.abs(((pi/GN)|0)-F.tj)<=2;
  F.peak=Math.max(pk,1e-3); F.base=arr[Math.floor(m*.5)]||0; F.tv=tv; F.second=s2b; F.ok=atT&&tv>.2&&s2b<tv*.9; F.score=(atT?1:0)+tv-Math.max(0,s2b);
}

/* ---------- a fix: where the camera really is, what dead reckoning believes, and the grid Pharos searches ---------- */
function candidates(S,avoid,sep){
  const out=[]; sep=sep==null?230:sep;
  for(let k=0;k<90;k++){ const x=(MARG+Math.random()*(MAP-2*MARG))&~3, y=(MARG+Math.random()*(MAP-2*MARG))&~3;
    if(x<S.w.shore(y)+26) continue; if(avoid.some(a=>Math.hypot(a[0]-x,a[1]-y)<sep)) continue;
    const lx=(x>>2)-PS/2, ly=(y>>2)-PS/2, W=LO+1, a=ly*W+lx, b=a+PS, c=(ly+PS)*W+lx, d=c+PS, e=S.s1[d]-S.s1[b]-S.s1[c]+S.s1[a];
    out.push({x,y,e}); }
  if(out.length<3&&sep>0) return candidates(S,avoid,sep>150?120:0); // later fixes: let spots sit closer rather than run out
  return out.sort((a,b)=>b.e-a.e).slice(0,6);
}
function mkFix(c,r){
  const R0=116+r*9; let cx=0, cy=0;
  for(let k=0;k<12;k++){ const a=Math.random()*TAU, off=R0*(.22+Math.random()*.46); cx=Math.round(clamp(c.x+Math.cos(a)*off,CM,MAP-CM)); cy=Math.round(clamp(c.y+Math.sin(a)*off,CM,MAP-CM)); if(Math.hypot(cx-c.x,cy-c.y)<R0*.74) break; }
  if(Math.hypot(cx-c.x,cy-c.y)>=R0*.74){ cx=Math.round(clamp(c.x,CM,MAP-CM)); cy=Math.round(clamp(c.y,CM,MAP-CM)); } // the truth is always inside the circle
  let gx0=c.x-Math.round((c.x-(cx-GN/2*GSTEP))/GSTEP)*GSTEP, gy0=c.y-Math.round((c.y-(cy-GN/2*GSTEP))/GSTEP)*GSTEP;
  if(((c.x-gx0)/GSTEP)%MS) gx0-=GSTEP; if(((c.y-gy0)/GSTEP)%MS) gy0-=GSTEP; // the truth sits on a node of the coarse mesh too
  const F={r,x:c.x,y:c.y,cx,cy,R:R0,R0,gx0,gy0,ti:(c.x-gx0)/GSTEP,tj:(c.y-gy0)/GSTEP,set:cur,slot:r%2,
    head:.5+Math.random()*5.28,tilt:.36+Math.random()*.07,frame:1000+((Math.random()*8000)|0),
    clouds:[...Array(3+((Math.random()*3)|0))].map(()=>[c.x+gauss()*130,c.y+gauss()*130,60+Math.random()*90]),spoof:null};
  if(r>=2){ // a confident GNSS fix that is quietly drifting away: what a spoofed receiver looks like
    for(let k=0;k<20;k++){ const b=Math.random()*TAU, dd=72+Math.random()*48, sx=c.x+Math.cos(b)*dd, sy=c.y+Math.sin(b)*dd;
      if(Math.hypot(sx-cx,sy-cy)<R0*.85&&sx>MARG*.6&&sy>MARG*.6&&sx<MAP-MARG*.6&&sy<MAP-MARG*.6){ F.spoof={x0:sx,y0:sy,dx:Math.cos(b),dy:Math.sin(b),v:2.6+Math.random()*1.4}; break; } } }
  return F;
}
function* prepFix(r,avoid){
  const cs=candidates(SETS[cur],avoid); let best=null, last=null;
  const shoot=function*(F){ camPaint(F,0); yield; camPaint(F,1); yield; camDescribe(F); yield; CAM[F.slot].gx.drawImage(CAM[F.slot].c,0,0); yield; for(let j=0;j<GN;j+=12){ correlate(F,j,j+12); yield; } corrStats(F); };
  for(let k=0;k<cs.length;k++){ const F=mkFix(cs[k],r); yield* shoot(F); last=F; if(!best||F.score>best.score) best=F; if(F.ok) break; }
  if(best&&best!==last) yield* shoot(best); // the canvases and heat must hold the chosen fix
  pend=best;
}

/* ---------- jobs: heavy work spread across frames ---------- */
let mapJob=null, prepJob=null, pend=null, scan=null;
const STEPS=[];
function pump(budget){ const t0=performance.now(); let n=0;
  while(performance.now()-t0<budget||n===0){ const j=mapJob||prepJob; if(!j) break; n++; const s0=performance.now(), dn=j.next().done; if(STEPS.length<400) STEPS.push([j===mapJob?'map':'prep',+(performance.now()-s0).toFixed(1)]); if(dn){ if(j===mapJob){ mapJob=null; startScan(); } else prepJob=null; } if(n>40) break; } }
function finishJobs(){ while(mapJob&&!mapJob.next().done){} if(mapJob){ mapJob=null; startScan(); } if(scan) endScan(); }
function startScan(){ scan={t:0,to:1-cur}; U.uSel.value=scan.to; U.uScan.value=-.05; pend=null; prepJob=null; }
function endScan(){ cur=scan.to; scan=null; U.uSel.value=cur; U.uScan.value=2; pend=null; prepJob=null; landmarks(); }
function landmarks(){ const w=SETS[cur].w, vil=w.roads[0].p[Math.round(w.roads[0].p.length*.36)]; U.uLH.value.set(w.lh[0]/MAP,w.lh[1]/MAP,0);
  if(st.anchors.length===3){ st.anchors[1].set(m2w(vil[0]),hAt(SETS[cur],vil[0],vil[1]),m2w(vil[1])); st.anchors[2].set(m2w(w.lh[0]),.02,m2w(w.lh[1])); } }

/* ---------- scene ---------- */
const CMAP=`vec3 cmap(float v){ vec3 a=vec3(.42,.07,.01), b=vec3(1.,.45,.08), c=vec3(1.,.8,.55), d=vec3(1.,.98,.94);
  return v<.45?mix(a,b,v/.45):v<.8?mix(b,c,(v-.45)/.35):mix(c,d,(v-.8)/.2); }`;
const heatD=new Uint8Array(GN*GN*4), heatTex=new T.DataTexture(heatD,GN,GN), NV=new Float32Array(MG*MG), NH=new Float32Array(MG*MG); heatTex.minFilter=heatTex.magFilter=T.LinearFilter; heatTex.needsUpdate=true;
const U={tA:{value:SETS[0].t},tB:{value:SETS[1].t},tHeat:{value:heatTex},uSel:{value:0},uScan:{value:2},uTime:G.uTime,uOn:{value:0},uDesc:{value:.5},uMenu:{value:1},
  uCirc:{value:new T.Vector3(.5,.5,0)},uHover:{value:new T.Vector4()},uFoot:{value:new T.Vector4()},uHeat:{value:new T.Vector4()},uWave:{value:new T.Vector4()},
  uShadow:{value:new T.Vector4()},uLock:{value:new T.Vector4()},uLH:{value:new T.Vector3()}};
let plane, drone, fr, beam, lat, mesh, burst, latU;
function gridGeo(){ const n=SEG+1, pos=new Float32Array(n*n*3), idx=new Uint16Array(SEG*SEG*6);
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const k=j*n+i; pos[k*3]=(i/SEG-.5)*PW; pos[k*3+2]=(j/SEG-.5)*PW; }
  let o=0; for(let j=0;j<SEG;j++) for(let i=0;i<SEG;i++){ const a=j*n+i, b=a+1, c=a+n, d=c+1; idx[o++]=a; idx[o++]=c; idx[o++]=b; idx[o++]=b; idx[o++]=c; idx[o++]=d; }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('aH0',new T.BufferAttribute(new Float32Array(n*n),1)); g.setAttribute('aH1',new T.BufferAttribute(new Float32Array(n*n),1));
  g.setIndex(new T.BufferAttribute(idx,1)); g.boundingSphere=new T.Sphere(new T.Vector3(),PW); return g; }
function buildPlane(){
  plane=new T.Mesh(gridGeo(),new T.ShaderMaterial({uniforms:U,extensions:{derivatives:true},
    vertexShader:`attribute float aH0,aH1; uniform float uSel,uScan; varying vec3 vW;
      void main(){ vec3 p=position; float nw=1.-smoothstep(uScan-.02,uScan,p.z/${PW}.+.5); p.y=mix(uSel<.5?aH1:aH0,uSel<.5?aH0:aH1,nw);
        vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D tA,tB,tHeat; uniform float uSel,uScan,uTime,uOn,uDesc,uMenu; uniform vec3 uCirc,uLH; uniform vec4 uHover,uFoot,uHeat,uWave,uShadow,uLock; varying vec3 vW;
      ${CMAP}
      float sq(vec2 p,vec2 c,float h){ vec2 d=abs(p-c); return max(d.x,d.y)-h; }
      void main(){
        vec2 mp=vW.xz/${PW}.+.5; float nw=1.-smoothstep(uScan-.012,uScan,mp.y);
        vec4 ta=texture2D(tA,mp), tb=texture2D(tB,mp); vec4 tx=mix(uSel<.5?tb:ta,uSel<.5?ta:tb,nw);
        vec3 AC=vec3(1.,.835,.70); float l=dot(tx.rgb,vec3(.3,.59,.11)); vec3 ph=mix(vec3(l),tx.rgb,.62); float e=tx.a;
        vec3 c=ph*(.6-uDesc*.2)+AC*e*uDesc*.78;
        float pw=fwidth(mp.x)+fwidth(mp.y);
        float dc=length(mp-uCirc.xy), ins=1.-smoothstep(uCirc.z-pw,uCirc.z+pw,dc);
        c*=mix(1.,mix(.38,1.1,ins),uOn);
        float ring=1.-smoothstep(pw*.5,pw*1.7,abs(dc-uCirc.z)); float an=atan(mp.y-uCirc.y,mp.x-uCirc.x);
        c+=AC*ring*(.22+.78*step(.4,fract(an*9.5493+uTime*.05)))*uOn;
        c*=1.-uShadow.w*(1.-smoothstep(0.,uShadow.z,length(mp-uShadow.xy)));
        if(uHover.w>.001){ float d=sq(mp,uHover.xy,uHover.z), iq=1.-smoothstep(-pw,0.,d);
          c=mix(c,ph*.16+AC*e*1.3,iq*uHover.w*.9); c+=AC*(1.-smoothstep(pw*.4,pw*1.5,abs(d)))*uHover.w*.95; }
        float fd=sq(mp,uFoot.xy,uFoot.z);
        if(uFoot.w>.001) c=mix(c,ph*.22+AC*e*1.35,(1.-smoothstep(-pw,0.,fd))*uFoot.w*.5);
        if(uHeat.w>.001){ vec2 g=(mp-uHeat.xy)/uHeat.z, tc=(g+.5)/${GN}.;
          float inG=step(0.,tc.x)*step(tc.x,1.)*step(0.,tc.y)*step(tc.y,1.), v=texture2D(tHeat,tc).r*inG, dw=length(mp-uWave.xy);
          float rv=1.-smoothstep(uWave.z-.035,uWave.z,dw);
          c=mix(c,c*.5,rv*ins*uHeat.w*.7); c+=cmap(v)*pow(v,2.2)*rv*ins*uHeat.w*1.15;
          c+=AC*(1.-smoothstep(0.,.005,abs(dw-uWave.z)))*uWave.w*ins*.7; }
        if(uFoot.w>.001) c+=vec3(1.,.95,.88)*(1.-smoothstep(pw*.5,pw*2.,abs(fd)))*uFoot.w*1.2;
        if(uLock.w>.001) c+=AC*(1.-smoothstep(0.,.0045,abs(length(mp-uLock.xy)-uLock.z)))*uLock.w;
        vec2 lq=mp-uLH.xy; float lr=length(lq), la=atan(lq.y,lq.x);
        c+=AC*pow(max(cos(la-uTime*.7),0.),70.)*smoothstep(.004,.03,lr)*exp(-lr*4.5)*.5*uMenu;
        c+=AC*(1.-smoothstep(0.,.004,lr))*(.55+.45*sin(uTime*3.))*uMenu;
        c+=AC*(1.-smoothstep(0.,.0035,abs(mp.y-uScan)))*step(uScan,1.02)*1.3;
        float bd=min(min(mp.x,1.-mp.x),min(mp.y,1.-mp.y)); c*=smoothstep(0.,.06,bd);
        c*=mix(.3,1.,smoothstep(.82,.3,length(mp-.5)));
        gl_FragColor=vec4(c,1.); }`}));
  sc.add(plane);
}
function buildDrone(){
  drone={g:new T.Group(),p:new T.Vector3(1,2,1),yaw:0,bank:0,spd:1,C:new T.Vector3(),r:2.2,alt:2,cw:1,prop:null};
  const M=(c,o)=>{ const m=LM(c,o); m.uniforms.uKey.value.set(-6,10,-4); return m; };
  const body=M('#EFE6D8',{emit:.14,rim:.9,amb:.16}), wing=M('#FFD5B3',{emit:.2,rim:1.1,amb:.14}), dark=M('#2c2620',{emit:0,rim:.5,amb:.3}), g=drone.g;
  const fus=new T.Mesh(new T.CapsuleGeometry(.024,.25,4,10),body); fus.rotation.x=Math.PI/2; g.add(fus);
  const ws=new T.Shape(); ws.moveTo(0,.05); ws.lineTo(.31,.024); ws.lineTo(.31,-.012); ws.lineTo(0,-.036); ws.lineTo(-.31,-.012); ws.lineTo(-.31,.024); ws.closePath();
  const wg=new T.Mesh(new T.ExtrudeGeometry(ws,{depth:.007,bevelEnabled:false}),wing); wg.rotation.x=-Math.PI/2; wg.position.set(0,.012,-.03); g.add(wg);
  const ts=new T.Shape(); ts.moveTo(0,.028); ts.lineTo(.085,.012); ts.lineTo(.085,-.008); ts.lineTo(0,-.02); ts.closePath();
  for(const sd of [-1,1]){ const t=new T.Mesh(new T.ExtrudeGeometry(ts,{depth:.005,bevelEnabled:false}),wing); t.rotation.set(-Math.PI/2,0,0); const pv=new T.Group(); pv.add(t); pv.rotation.z=sd*.62; pv.scale.x=sd; pv.position.set(0,.016,.135); g.add(pv); }
  const pod=new T.Mesh(new T.SphereGeometry(.017,12,8),dark); pod.position.set(0,-.022,-.07); g.add(pod);
  drone.prop=new T.Mesh(new T.CircleGeometry(.05,24),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying vec2 vU; void main(){ vU=uv-.5; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`varying vec2 vU; void main(){ float r=length(vU)*2.; gl_FragColor=vec4(vec3(1.,.86,.72)*.22*smoothstep(1.,.3,r)*(.4+.6*r),1.); }`}));
  drone.prop.position.set(0,0,.16); g.add(drone.prop);
  const lights=new Float32Array([-.31,.016,0, .31,.016,0, 0,.03,.15, 0,-.032,-.07]);
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.BufferAttribute(lights,3)); lg.setAttribute('aR',new T.BufferAttribute(new Float32Array([.1,.1,.6,.3, .1,.1,.6,.3, .55,.5,.9,.3, .9,.9,.5,.3]),4));
  g.add(pts(lg,PM({size:.07,color:'#FFE9D6',body:'b=aR.x>.8?1.4:aR.x>.5?.25+1.6*step(.9,fract(uTime*.9)):.9+.25*sin(uTime*2.);'})));
  g.scale.setScalar(1.12); sc.add(g);
  // camera frustum: four hairlines from the lens to the footprint, faint faces between them
  fr={pos:new Float32Array(24),fpos:new Float32Array(36),op:0};
  const lgeo=new T.BufferGeometry(); lgeo.setAttribute('position',new T.BufferAttribute(fr.pos,3)); lgeo.boundingSphere=new T.Sphere(new T.Vector3(),40);
  fr.lines=new T.LineSegments(lgeo,new T.LineBasicMaterial({color:0xFFD5B3,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false})); fr.lines.frustumCulled=false; sc.add(fr.lines);
  const fgeo=new T.BufferGeometry(); fgeo.setAttribute('position',new T.BufferAttribute(fr.fpos,3)); const ft=new Float32Array(12); for(let k=0;k<4;k++){ ft[k*3]=0; ft[k*3+1]=1; ft[k*3+2]=1; } fgeo.setAttribute('aT',new T.BufferAttribute(ft,1)); fgeo.boundingSphere=new T.Sphere(new T.Vector3(),40);
  fr.mat=new T.ShaderMaterial({uniforms:{uOp:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`attribute float aT; varying float vT; void main(){ vT=aT; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOp; varying float vT; void main(){ gl_FragColor=vec4(vec3(1.,.835,.7)*(.008+.04*vT*vT)*uOp,1.); }`});
  fr.faces=new T.Mesh(fgeo,fr.mat); fr.faces.frustumCulled=false; sc.add(fr.faces);
}
function buildFX(){
  // the fix: a lighthouse shaft standing on the true position
  beam=new T.Mesh(new T.CylinderGeometry(.018,.07,1,14,1,true).translate(0,.5,0),new T.ShaderMaterial({uniforms:{uOp:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying float vY; void main(){ vY=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOp; varying float vY; void main(){ gl_FragColor=vec4(vec3(1.,.9,.8)*pow(1.-vY,2.2)*uOp*.9,1.); }`}));
  beam.visible=false; sc.add(beam);
  // the correlation surface as a lattice of points that rises where the camera's edges agree with the map's
  latU={uHeat:U.uHeat,uWave:U.uWave,uCirc:U.uCirc,uLift:{value:0},uMs:{value:MS}};
  const SURF=`vec2 mp=uHeat.xy+aIdx*uMs*uHeat.z; float k=clamp((uWave.z-length(mp-uWave.xy))/.07,0.,1.); float ins=1.-smoothstep(uCirc.z-.004,uCirc.z+.004,length(mp-uCirc.xy));
      float v=clamp(aV,0.,1.), e=1.-pow(1.-k,3.); vec3 q=vec3((mp.x-.5)*${PW}.,aH+.012+uLift*pow(v,1.9)*e,(mp.y-.5)*${PW}.);`;
  lat=pts(cloud(MG*MG,(i,r,o,ex)=>{ o[0]=o[1]=o[2]=0; ex.aIdx[i*2]=i%MG; ex.aIdx[i*2+1]=(i/MG)|0; },{aIdx:2,aV:1,aH:1}),
    PM({size:.045,color:'#FFD5B3',uniforms:latU,decl:'attribute vec2 aIdx; attribute float aV,aH; uniform vec4 uHeat,uWave; uniform vec3 uCirc; uniform float uLift,uMs;',fns:CMAP,body:SURF+`
      p=q; col=cmap(v); b=ins*k*uHeat.w*(.16+1.9*pow(v,2.4)); sz=.55+1.6*v*v;`}));
  sc.add(lat);
  { const segs=MG*(MG-1)*2, idx=new Float32Array(segs*4); let o=0;
    for(let j=0;j<MG;j++) for(let i=0;i<MG-1;i++){ idx[o++]=i; idx[o++]=j; idx[o++]=i+1; idx[o++]=j; }
    for(let i=0;i<MG;i++) for(let j=0;j<MG-1;j++){ idx[o++]=i; idx[o++]=j; idx[o++]=i; idx[o++]=j+1; }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(segs*6),3)); g.setAttribute('aIdx',new T.BufferAttribute(idx,2));
    g.setAttribute('aV',new T.BufferAttribute(new Float32Array(segs*2),1)); g.setAttribute('aH',new T.BufferAttribute(new Float32Array(segs*2),1)); g.boundingSphere=new T.Sphere(new T.Vector3(),40);
    mesh=new T.LineSegments(g,new T.ShaderMaterial({uniforms:latU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`attribute vec2 aIdx; attribute float aV,aH; uniform vec4 uHeat,uWave; uniform vec3 uCirc; uniform float uLift,uMs; varying vec3 vC; ${CMAP}
        void main(){ ${SURF} vC=mix(vec3(.5,.26,.12)*.22,cmap(v)*(.1+.9*pow(v,1.6)),smoothstep(0.,.35,v))*ins*k*uHeat.w; gl_Position=projectionMatrix*viewMatrix*vec4(q,1.); }`,
      fragmentShader:`varying vec3 vC; void main(){ gl_FragColor=vec4(vC,1.); }`})); mesh.frustumCulled=false; sc.add(mesh); }
  burst=Burst(sc,Math.floor(240*Q+60),'#FFD5B3',.045);
  sc.add(pts(cloud(Math.floor(1100*Q+300),(i,r,o)=>{o[0]=(r[0]-.5)*16;o[1]=.4+r[1]*3.4;o[2]=(r[2]-.5)*16;}),PM({size:.035,color:'#FFD5B3',body:'p.y+=sin(uTime*.3+aR.x*9.)*.15; p.x+=sin(uTime*.1+aR.y*7.)*.2; b=.06+.05*aR.w;'})));
}

/* ---------- mapping helpers ---------- */
const ray=new T.Raycaster(), ndc=new T.Vector2(), _v=new T.Vector3(), _tw=new T.Vector3(), SP={x:0,y:0,z:0}, SP2={x:0,y:0,z:0}, PK={px:0,py:0,ok:false};
function pick(cx,cy){ // screen to map px, ray cast onto the relief
  ndc.set(cx/innerWidth*2-1,-(cy/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); const o=ray.ray.origin, d=ray.ray.direction; PK.ok=false;
  if(d.y>-1e-4) return PK; let h=RELIEF*.4, x=0, z=0;
  for(let it=0;it<7;it++){ const t=(h-o.y)/d.y; x=o.x+d.x*t; z=o.z+d.z*t; h=hAt(SETS[cur],(x/PW+.5)*MAP,(z/PW+.5)*MAP); }
  PK.px=(x/PW+.5)*MAP; PK.py=(z/PW+.5)*MAP; PK.ok=PK.px>=0&&PK.py>=0&&PK.px<=MAP&&PK.py<=MAP; return PK; }
function m2s(px,py,lift,out){ lift*=.25; _v.set(m2w(px),hAt(SETS[cur],px,py)+lift,m2w(py)).project(stCam); out.x=(_v.x*.5+.5)*innerWidth; out.y=(-_v.y*.5+.5)*innerHeight; out.z=_v.z; return out; }
const at=(e,x,y,extra)=>{ e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${extra||''}`; };

/* ---------- DOM ---------- */
const feedCv=$('#phFeed'), fx=feedCv.getContext('2d'), stg=$$('.stg li',el), D={round:$('#phRound'),unc:$('#phUnc'),uncL:$('#phUncL'),score:$('#phScore'),help:$('#phHelp'),keys:$('#phKeys'),
  next:$('#phNext'),cap:$('#phCap'),tele:$('#phTele'),tele2:$('#phTele2'),frm:$('#phFrm'),box:$('#phBox'),ring:$('#phRing'),gnss:$('#phGnss'),gnssL:$('#phGnssL'),
  ff:$('#phF'),clk:$('#phClk'),tru:$('#phTru'),ln:$('#phLn'),dist:$('#phDist'),banner:$('#phBanner'),pops:$('#phPops'),fxl:$('#phFx')};
let FN=300, vig=null, noiseC=null;
function feedSize(){ const r=D.box.getBoundingClientRect(); const n=Math.max(96,Math.round((r.width||300)*Math.min(2,devicePixelRatio||1)));
  if(n!==FN||!vig){ FN=feedCv.width=feedCv.height=n; const [c,x]=cv2(n); const g=x.createRadialGradient(n/2,n/2,n*.18,n/2,n/2,n*.74); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.78)'); x.fillStyle=g; x.fillRect(0,0,n,n); vig=c; } }
{ const [c,x]=cv2(128), im=x.createImageData(128,128); for(let i=0;i<im.data.length;i+=4){ const v=Math.random()*255; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; } x.putImageData(im,0,0); noiseC=c; }
const lay={cx:0,cy:0,d:400,stack:false};
function measure(){ const W=innerWidth, H=innerHeight, f=$('#phF').getBoundingClientRect(), hb=q('.gbc').getBoundingClientRect(), top=Math.min(H*.2,140);
  const helpTop=Math.min(H-70,hb.top||H-80);
  if(f.bottom<H*.5){ lay.stack=true; const y0=f.bottom+14, y1=helpTop-10; lay.cx=W/2; lay.cy=(y0+y1)/2; lay.d=Math.min(W*.94,(y1-y0)); }
  else { lay.stack=false; const x1=f.left-28; lay.cx=x1/2+8; lay.cy=(top+helpTop)/2+6; lay.d=Math.min(x1*.92,(helpTop-top)*.98); }
  feedSize(); }

/* ---------- the feed: raw, rectify, describe, match ---------- */
const ST_NAMES=['Raw','Rectify','Describe','Match'];
const CAPS=['The frame as it lands: tilted, rotated, this season’s colours and shadows.','Projected onto the ground with the drone’s attitude. North up, true scale.','Edges only: hedges, roads, buildings, water. Colour, season and shadow drop out.','These edges are somewhere inside the circle. Find them on the map.'];
const GP=[0,0];
function drawRaw(F,tilt,head,grid){
  const C=CAM[F.slot], x=fx, n=FN, c=CSZ/2;
  rotX.setTransform(1,0,0,1,0,0); rotX.fillStyle='#000'; rotX.fillRect(0,0,CSZ,CSZ); rotX.translate(c,c); rotX.rotate(-head); rotX.drawImage(C.g,-c,-c); rotX.setTransform(1,0,0,1,0,0);
  x.fillStyle='#000'; x.fillRect(0,0,n,n);
  const ct=Math.cos(tilt), sn=Math.sin(tilt), Hh=FEED/2, off=Hh*Math.tan(tilt), NS=Math.min(64,Math.round(n/5));
  const gy=v=>Hh*(v*ct+sn)/(ct-v*sn)-off;
  for(let k=0;k<NS;k++){ const v0=1-2*k/NS, v1=1-2*(k+1)/NS, s=Hh/(ct-(v0+v1)/2*sn), g0=gy(v0), g1=gy(v1);
    x.drawImage(rotCv,c-s*CS,c-g0*CS,2*s*CS,(g0-g1)*CS,0,k*n/NS,n,n/NS+.8); }
  if(grid>0){ // the ground grid this projection lands on
    x.strokeStyle=`rgba(255,213,179,${(.55*grid).toFixed(3)})`; x.lineWidth=Math.max(1,n/300);
    const ch=Math.cos(head), shd=Math.sin(head), tt=Math.tan(tilt), P=GP, at_=(dx,dy)=>{ const rx=dx*ch+dy*shd, ry=-dx*shd+dy*ch, G=-ry/Hh+tt, v=(G*ct-sn)/(ct+G*sn), s=Hh/(ct-v*sn); P[0]=n/2+rx/s*n/2; P[1]=n/2-v*n/2; };
    x.beginPath(); for(let k=-2;k<=2;k++){ for(let m=0;m<=8;m++){ at_(k*40,(m/8-.5)*FEED*1.5); m?x.lineTo(P[0],P[1]):x.moveTo(P[0],P[1]); } for(let m=0;m<=8;m++){ at_((m/8-.5)*FEED*1.5,k*40); m?x.lineTo(P[0],P[1]):x.moveTo(P[0],P[1]); } } x.stroke(); }
}
function drawFeed(F){
  const x=fx, n=FN, k=F.st/F.dur[Math.min(2,F.stage)], C=CAM[F.slot];
  if(F.stage===0){ drawRaw(F,F.tilt,F.head,0); x.globalAlpha=1; x.drawImage(vig,0,0); x.globalCompositeOperation='overlay'; x.globalAlpha=.32; x.drawImage(noiseC,(Math.random()*-64)|0,(Math.random()*-64)|0,n+64,n+64); x.globalCompositeOperation='source-over'; x.globalAlpha=1; }
  else if(F.stage===1){ const e=E.io(clamp(k,0,1)); drawRaw(F,F.tilt*(1-e),F.head*(1-e),Math.sin(clamp(k,0,1)*Math.PI)); x.globalAlpha=1-e; x.drawImage(vig,0,0); x.globalAlpha=1; }
  else { const o=CSZ/2-FEED*CS/2; x.drawImage(C.g,o,o,FEED*CS,FEED*CS,0,0,n,n);
    const wy=F.stage>=3?n+2:E.io(clamp(k,0,1))*n;
    if(F.stage===2){ x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(0,0,n,n); }
    x.save(); x.beginPath(); x.rect(0,0,n,wy); x.clip(); x.fillStyle='#000'; x.fillRect(0,0,n,n); x.drawImage(C.e,0,0,n,n); x.restore();
    if(F.stage===2){ const g=x.createLinearGradient(0,wy-n*.12,0,wy); g.addColorStop(0,'rgba(255,213,179,0)'); g.addColorStop(1,'rgba(255,213,179,.42)'); x.fillStyle=g; x.fillRect(0,wy-n*.12,n,n*.12); x.fillStyle='#FFE6D2'; x.fillRect(0,wy-1,n,Math.max(1.5,n/200)); } }
}
let teleT=0;
function teleText(F,force){ if(!force&&(teleT+=1)%4) return; const s=F.stage, k=s===1?E.io(clamp(F.st/F.dur[1],0,1)):s>1?1:0;
  const hd=Math.round(((F.head*(1-k))*180/Math.PI+360)%360), tl=Math.round(F.tilt*(1-k)*180/Math.PI);
  D.tele.textContent=s<2?`Hdg ${String(hd).padStart(3,'0')}° · Tilt ${tl}°`:'North up · nadir'; D.tele2.textContent=s<2?'Alt 120 m':'Edges'; }
const SHORT=['Raw frame: tilted, rotated, autumn light','Rectify: onto the ground, north up','Describe: edges only, colour and shadow gone'];
function stageUI(s){ stg.forEach((li,i)=>{ li.classList.toggle('on',i===s); li.classList.toggle('done',i<s); }); D.cap.textContent=CAPS[s]; if(s<3&&lay.stack&&F&&F.phase==='feed') setHelp(SHORT[s],F.r===1?'':TOUCH?'Tap the camera to skip':'Click the camera or press Space to skip'); }

/* ---------- drone flight: loiter around a centre, bank into turns ---------- */
const _f=new T.Vector3(), _c=[new T.Vector3(),new T.Vector3(),new T.Vector3(),new T.Vector3()], _ap=new T.Vector3(), _q=new T.Euler(0,0,0,'YXZ');
function droneUpdate(dt,t){
  const Dr=drone, p=Dr.p, dx=p.x-Dr.C.x, dz=p.z-Dr.C.z, dist=Math.hypot(dx,dz)||1e-3, rx=dx/dist, rz=dz/dist;
  const tx=-rz*Dr.cw, tz=rx*Dr.cw, e=clamp((dist-Dr.r)/Math.max(.3,Dr.r)*1.7,-1.6,1.6);
  let wx=tx-rx*e, wz=tz-rz*e; if(dist>Dr.r*2.6+.6){ wx=-rx; wz=-rz; }
  const want=Math.atan2(-wx,-wz), rate=clamp(angDiff(want,Dr.yaw)*2.4,-2.2,2.2);
  Dr.yaw+=rate*dt; Dr.bank=damp(Dr.bank,clamp(rate*.42,-.7,.7),3,dt);
  const spd=Dr.spd*(1+clamp((dist-Dr.r*1.6)*.35,0,1.4));
  p.x+=-Math.sin(Dr.yaw)*spd*dt; p.z+=-Math.cos(Dr.yaw)*spd*dt; p.y=damp(p.y,Dr.alt+Math.sin(t*.8)*.03,1.6,dt);
  Dr.g.position.copy(p); _q.set(Math.sin(t*1.1)*.02,Dr.yaw,Dr.bank); Dr.g.rotation.copy(_q); Dr.prop.rotation.z=t*40;
  // shadow on the ground
  U.uShadow.value.set((p.x+p.y*.22)/PW+.5,(p.z+p.y*.18)/PW+.5,.016,.34);
}
const CRN=[-1,-1,1,-1,1,1,-1,1];
function frustum(on,px,py,dt){ // px, py: footprint centre in map px
  fr.op=damp(fr.op,on?1:0,4,dt); fr.lines.material.opacity=.3*fr.op; fr.mat.uniforms.uOp.value=fr.op; fr.lines.visible=fr.faces.visible=fr.op>.01; if(!fr.lines.visible) return;
  _ap.set(0,-.03,-.07).applyEuler(drone.g.rotation).multiplyScalar(1.12).add(drone.p);
  for(let k=0;k<4;k++){ const X=px+CRN[k*2]*FEED/2, Y=py+CRN[k*2+1]*FEED/2; _c[k].set(m2w(X),hAt(SETS[cur],X,Y)+.01,m2w(Y)); }
  const P=fr.pos; for(let k=0;k<4;k++){ P[k*6]=_ap.x; P[k*6+1]=_ap.y; P[k*6+2]=_ap.z; P[k*6+3]=_c[k].x; P[k*6+4]=_c[k].y; P[k*6+5]=_c[k].z; }
  const FP=fr.fpos; for(let k=0;k<4;k++){ const a=_c[k], b=_c[(k+1)%4], o=k*9; FP[o]=_ap.x; FP[o+1]=_ap.y; FP[o+2]=_ap.z; FP[o+3]=a.x; FP[o+4]=a.y; FP[o+5]=a.z; FP[o+6]=b.x; FP[o+7]=b.y; FP[o+8]=b.z; }
  fr.lines.geometry.attributes.position.needsUpdate=true; fr.faces.geometry.attributes.position.needsUpdate=true;
}

/* ---------- game ---------- */
let game=null, F=null;
const aim={x:MAP/2,y:MAP/2,on:0,want:0,drag:false,id:-1,kb:false};
function blurInside(){ const a=document.activeElement; if(a&&el.contains(a)&&a.blur) a.blur(); }
function vis(e,on){ e.classList.toggle('on',!!on); }
function hideMarks(){ [D.ring,D.gnss,D.clk,D.tru,D.ln,D.dist].forEach(e=>vis(e,false)); }
function setHelp(t,keys){ D.help.textContent=t; D.keys.textContent=keys||''; }
function startFix(Fx){
  F=Fx; game.r=F.r; F.phase='feed'; F.stage=0; F.st=0; F.t=0; F.ft=0; F.rt=0; F.dur=F.r===1?[1.3,1.3,1.15]:[.8,.85,.75]; F.lock=false; F.shownR=0;
  game.avoid.push([F.x,F.y]); game.gnss+=F.spoof?1:0;
  // heat data for this fix (only drawn after the click)
  const H=HEAT[F.slot], sp=Math.max(1e-3,F.peak-F.base);
  for(let k=0;k<GN*GN;k++){ const v=clamp((H[k]-F.base)/sp,0,1); heatD[k*4]=v*255; heatD[k*4+1]=heatD[k*4+2]=0; heatD[k*4+3]=255; }
  for(let j=0;j<MG;j++) for(let i=0;i<MG;i++){ const k=j*MG+i; NV[k]=heatD[((j*MS)*GN+i*MS)*4]/255; NH[k]=hAt(SETS[cur],F.gx0+i*MS*GSTEP,F.gy0+j*MS*GSTEP); }
  const la=lat.geometry.attributes.aV, lh=lat.geometry.attributes.aH; la.array.set(NV); lh.array.set(NH); la.needsUpdate=lh.needsUpdate=true;
  const ma=mesh.geometry.attributes.aV, mh=mesh.geometry.attributes.aH, mi=mesh.geometry.attributes.aIdx.array;
  for(let k=0;k<ma.count;k++){ const n=mi[k*2+1]*MG+mi[k*2]; ma.array[k]=NV[n]; mh.array[k]=NH[n]; } ma.needsUpdate=mh.needsUpdate=true;
  heatTex.needsUpdate=true;
  U.uHeat.value.set(F.gx0/MAP,F.gy0/MAP,GSTEP/MAP,0); U.uWave.value.set(0,0,0,0); U.uFoot.value.w=0; U.uLock.value.w=0; latU.uLift.value=0;
  hideMarks(); vis(D.next,false); aim.on=0; aim.want=0; aim.drag=false; beam.visible=false;
  D.round.textContent=`Fix ${F.r} / ${ROUNDS}`; D.frm.textContent='Frame '+F.frame; D.box.dataset.cur='Skip'; stageUI(0); teleText(F,true);
  D.uncL.textContent=F.spoof?'GNSS reports a fix · check it':'GPS jammed · dead reckoning';
  setHelp(F.r===1?'Pharos is reading the camera':'Reading the next frame',F.r===1?'':TOUCH?'Tap the camera to skip':'Click the camera or press Space to skip'); stageUI(0);
  showBanner(D.banner,`Fix ${F.r}`,F.r===1?'GPS jammed':F.spoof?'GNSS is back. Is it honest?':'Still no GPS');
  if(F.spoof) vis(D.gnss,true), D.gnssL.textContent='GNSS fix · ± 3 m', D.gnss.classList.remove('bad');
  drone.C.set(m2w(F.cx),0,m2w(F.cy)); drone.r=F.R0*PW/MAP+.55; drone.alt=2.15; drone.cw=Math.random()<.5?1:-1;
  A.ping(988,.04); A.whoosh(true,.7,.08);
  drawFeed(F);
}
function toMatch(){ if(!F||F.phase!=='feed') return; F.stage=3; F.st=0; F.phase='aim'; D.ff.classList.add('aim'); if(game&&F.r<ROUNDS&&!prepJob) prepJob=prepFix(F.r+1,game.avoid); stageUI(3); drawFeed(F); teleText(F,true); D.box.removeAttribute('data-cur'); A.chime(4);
  vis(D.ring,true); cursorAim(true); if(!aim.want){ aim.x=F.cx; aim.y=F.cy; aim.want=1; aim.kb=false; } // the tool is visible before you move
  setHelp(TOUCH?'Drag the square over the map until it matches the camera, then let go':'Move the square over the map until it matches the camera, then click',
    TOUCH?'':(F.r===1?'Or arrow keys and Enter':'')); }
function spoofAt(Fx,out){ const s=Fx.spoof, d=s.v*(Fx.ft+Fx.t); out[0]=s.x0+s.dx*d; out[1]=s.y0+s.dy*d; return out; }
const _sp=[0,0];
function commit(px,py){
  if(!F||F.phase!=='aim') return; F.phase='reveal'; F.rt=0; D.ff.classList.remove('aim'); F.px=clamp(px,0,MAP); F.py=clamp(py,0,MAP); aim.on=0; aim.want=0; aim.drag=false; cursorAim(false);
  const err=Math.hypot(F.px-F.x,F.py-F.y)*MPX; let spoofed=false;
  if(F.spoof){ spoofAt(F,_sp); const ds=Math.hypot(F.px-_sp[0],F.py-_sp[1])*MPX; spoofed=err>25&&ds<55&&ds<err; F.sx=_sp[0]; F.sy=_sp[1]; }
  const tf=Math.max(.35,1-F.t/30); let pts_=0, v='';
  if(spoofed){ v='Spoofed'; pts_=-250; game.spoofed++; }
  else if(err<=25){ v='Trusted'; pts_=Math.round(1000*tf); game.trusted++; }
  else if(err<=60){ v='Close'; pts_=Math.round(400*tf); game.close++; }
  else { v='Wrong'; game.wrong++; }
  F.err=err; F.v=v; F.pts=pts_; game.list.push({err,v,t:F.t,R:F.R}); game.from=game.score; game.score=Math.max(0,game.score+pts_); game.cnt=0;
  U.uWave.value.set(F.px/MAP,F.py/MAP,0,1); U.uHeat.value.w=1;
  vis(D.clk,true); D.ring.classList.remove('on');
  setHelp('Pharos correlates the camera’s edges with every point in the circle','');
  D.cap.textContent='The surface is Pharos’s answer: how well the camera’s edges agree with the map at each point. The peak is the fix.';
  A.click(); A.beep(1318); A.whoosh(true,1.1,.13);
}
function lock(){
  F.lock=true; const v=F.v, tw=_tw.set(m2w(F.x),hAt(SETS[cur],F.x,F.y),m2w(F.y));
  beam.visible=true; beam.position.set(tw.x,tw.y,tw.z); beam.scale.set(1,.6,1);
  burst.emit(tw,Math.floor(70*Q+30),1.4,null,1.6,1.1); U.uLock.value.set(F.x/MAP,F.y/MAP,0,1);
  drone.C.set(tw.x,0,tw.z); drone.r=.62; drone.alt=1.55;
  if(v==='Trusted'){ A.chord(); S.flash=Math.max(S.flash,.14); }
  else if(v==='Close') A.chime(6);
  else if(v==='Spoofed'){ A.alarm(); feedback(.2,.7,new T.Color(.07,.005,0)); }
  else A.buzz();
  vis(D.tru,true); D.dist.textContent=Math.round(F.err)+' m';
  if(F.spoof){ D.gnssL.textContent=`Spoofed · ${Math.round(Math.hypot(F.sx-F.x,F.sy-F.y)*MPX)} m off`; D.gnss.classList.add('bad'); }
  popAt(D.pops,tw,v==='Trusted'?`Trusted · ${Math.round(F.err)} m`:v==='Spoofed'?'Spoofed':`${v} · ${Math.round(F.err)} m`,v==='Trusted'?'big':v==='Close'?'':'bad');
  const ratio=F.second>0?(F.tv/F.second):9;
  setHelp(v==='Spoofed'?'That fix was the spoofed GNSS. A confident receiver is not the same as a correct one.':v==='Trusted'?`Within 25 m. Pharos would trust that. Its peak stood ${ratio.toFixed(1)}× above the next best.`:
    v==='Close'?`${Math.round(F.err)} m off. Close, but Pharos only trusts a fix within 25 m.`:`${Math.round(F.err)} m off. The bright peak is where the edges really agree.`,'');
}
function nextFix(){
  if(!F||F.phase!=='reveal'||!F.lock) return; blurInside(); vis(D.next,false); A.whoosh(false,.6,.08);
  if(F.r>=ROUNDS) return end();
  if(prepJob){ while(prepJob&&!prepJob.next().done){} prepJob=null; }
  const n=pend; pend=null; if(!n) return end();
  F.phase='out'; F.ot=0; F.nx=n; hideMarks(); // let the answer fade before the next frame arrives
}
function end(){
  const g=game; F.phase='done'; cursorAim(false); hideMarks(); U.uOn.value=0;
  const errs=g.list.map(x=>x.err).sort((a,b)=>a-b), med=errs[2]||0, best=errs[0]||0, avgT=g.list.reduce((a,x)=>a+x.t,0)/Math.max(1,g.list.length), avgR=g.list.reduce((a,x)=>a+x.R,0)/Math.max(1,g.list.length)*MPX;
  const grade=g.spoofed?'Fooled by a spoof':g.trusted>=4?'Trusted':g.trusted>=2||g.trusted+g.close>=3?'Holding position':'Lost';
  const text=g.spoofed?'A confident GNSS fix is not the same as a correct one. Pharos checks the receiver against the camera and flags one that looks sure but is drifting, which is what a spoofed receiver does.':
    'Pharos makes this match on every frame with FFT cross-correlation, across headings and scales, on a laptop CPU. On a real 13 minute flight it was trusted within 25 m 92% of the time and never trusted a wrong position.';
  D.fxl.innerHTML=g.list.map((x,i)=>`<li class="${x.v.toLowerCase()}"><b>0${i+1}</b><span>${x.v}</span><i style="--w:${Math.min(1,x.err/200).toFixed(3)}"></i><em>${Math.round(x.err)} m</em></li>`).join('');
  st.result({grade,score:g.score,stats:[['Trusted within 25 m',g.trusted+' / '+ROUNDS],['Median error',Math.round(med)+' m'],['Best fix',Math.round(best)+' m'],
    ['Spoofs believed',g.gnss?`${g.spoofed} / ${g.gnss}`:'0'],['Average time to fix',avgT.toFixed(1)+' s'],['Average search radius',Math.round(avgR)+' m']],text});
  game=null; A.dock(); blurInside();
  // build a fresh map in the background, then scan it in behind the results
  mapJob=buildSet(SETS[1-cur],(Math.random()*1e9)|0);
}
st.play=function(){
  blurInside(); if(game) st.abort();
  finishJobs(); if(!pend||pend.set!==cur||pend.r!==1){ prepJob=prepFix(1,[]); } while(prepJob&&!prepJob.next().done){} prepJob=null;
  if(!pend) return;
  game={r:0,score:0,list:[],trusted:0,close:0,wrong:0,spoofed:0,gnss:0,avoid:[],from:0,cnt:1}; D.score.textContent='0';
  measure(); st.setState('play'); U.uMenu.value=0;
  A.jam(); feedback(0,1.1);
  const n=pend; pend=null; startFix(n);
};
st.abort=function(){ game=null; F=null; cursorAim(false); D.ff.classList.remove('aim'); hideMarks(); vis(D.next,false); if(U){ U.uOn.value=0; U.uHeat.value.w=0; U.uFoot.value.w=0; U.uLock.value.w=0; U.uHover.value.w=0; } if(beam) beam.visible=false; prepJob=null; aim.drag=false; };
function menuLoiter(){ const nar=NARROW(); drone.C.set(nar?.2:-.9,0,nar?2.6:-1.6); drone.r=nar?1.25:1.75; drone.alt=nar?1.6:2.05; }
st.enter=function(){ st.abort(); st.setState('menu'); U.uMenu.value=1; menuLoiter(); drone.cw=1; drone.p.set(drone.C.x+drone.r,drone.alt,drone.C.z); drone.yaw=Math.PI; $('#phBest').textContent='Best '+fmt(store.get('ph',0)); measure(); if(!pend&&!prepJob&&!mapJob) prepJob=prepFix(1,[]); };
st.exit=function(){ st.abort(); };
st.build=function(){
  buildPlane(); buildDrone(); buildFX();
  const j=buildSet(SETS[0],(Math.random()*1e9)|0); while(!j.next().done){}
  cur=0; U.uSel.value=0; U.uScan.value=2;
  st.anchors=[new T.Vector3(0,2,0),new T.Vector3(),new T.Vector3()]; landmarks();
  drone.C.set(-.9,0,-1.6); drone.r=1.75; drone.alt=2.05; drone.p.set(.85,2.05,-1.6);
};

/* ---------- input: mouse aims and clicks, touch drags and lets go, keys move and press Enter ---------- */
st.onPointer=function(e){
  if(st.state!=='play'||!F) return;
  if(F.phase==='feed'){ if(e.pointerType==='mouse') return; }
  if(F.phase!=='aim') return; const p=pick(e.clientX,e.clientY); if(!p.ok) return;
  if(e.pointerType==='mouse'){ if(e.button===0) commit(p.px,p.py); }
  else { aim.drag=true; aim.id=e.pointerId; aim.x=p.px; aim.y=p.py; aim.want=1; aim.kb=false; A.tick(); }
};
addEventListener('pointermove',e=>{ if(S.st!==st||st.state!=='play'||!F||F.phase!=='aim') return;
  if(e.pointerType==='mouse'){ if(e.target!==canvas){ if(!aim.kb) aim.want=0; return; } const p=pick(e.clientX,e.clientY); if(p.ok){ aim.x=p.px; aim.y=p.py; aim.want=1; aim.kb=false; } else aim.want=0; }
  else if(aim.drag&&e.pointerId===aim.id){ const p=pick(e.clientX,e.clientY); if(p.ok){ aim.x=p.px; aim.y=p.py; } } },{passive:true});
addEventListener('pointerup',e=>{ if(!aim.drag||e.pointerId!==aim.id) return; aim.drag=false; if(S.st===st&&F&&F.phase==='aim') commit(aim.x,aim.y); });
addEventListener('pointercancel',e=>{ if(aim.drag&&e.pointerId===aim.id){ aim.drag=false; aim.want=0; } });
addEventListener('keydown',e=>{ if(S.mode!=='station'||S.st!==st||st.state!=='play'||!F) return; if(e.target.closest&&e.target.closest('input,textarea,a')) return;
  if(e.code==='Enter'||e.code==='Space'){ e.preventDefault(); if(e.repeat) return;
    if(F.phase==='aim'){ if(aim.want&&aim.kb) commit(aim.x,aim.y); else { if(!aim.want){ aim.x=F.cx; aim.y=F.cy; } aim.want=1; aim.kb=true; A.tick(); } }
    else if(F.phase==='feed') toMatch(); else if(F.phase==='reveal'&&D.next.classList.contains('on')) nextFix(); }
  else if(F.phase==='aim'&&/^(Arrow|Key[WASD]$)/.test(e.code)){ e.preventDefault(); if(!aim.want){ aim.x=F.cx; aim.y=F.cy; } aim.want=1; aim.kb=true; } });
D.next.addEventListener('click',nextFix);
D.box.addEventListener('click',()=>{ if(F&&F.phase==='feed') toMatch(); });
addEventListener('resize',()=>{ if(S.st===st) measure(); });

/* ---------- per frame ---------- */
const STEP={x:0,y:0};
st.update=function(dt,t){
  pump(game?3:6);
  const nar=NARROW(), f=F&&game?F:null;
  if(scan){ scan.t+=dt; U.uScan.value=-.05+scan.t/1.7*1.15; if(scan.t>=1.7){ endScan(); if(!game&&!pend&&!prepJob) prepJob=prepFix(1,[]); } }
  U.uDesc.value=damp(U.uDesc.value,f?.74:.52,2,dt); U.uOn.value=damp(U.uOn.value,f&&F.phase!=='done'?1:0,3,dt);
  if(f){
    if(F.phase==='feed'){ F.st+=dt; F.ft+=dt; if(F.st>=F.dur[F.stage]){ F.st=0; F.stage++; A.blip(); if(F.stage>=3) toMatch(); else { stageUI(F.stage); teleText(F,true); } } if(F.phase==='feed'){ drawFeed(F); teleText(F); } }
    if(F.phase==='aim'){ F.t+=dt; F.R=Math.min(RMAX,F.R+dt*3.2);
      if(aim.kb){ STEP.x=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0); STEP.y=(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);
        const sp=(keys.has('ShiftLeft')||keys.has('ShiftRight')?260:110)*dt; aim.x=clamp(aim.x+STEP.x*sp,0,MAP); aim.y=clamp(aim.y+STEP.y*sp,0,MAP); } }
    if(F.phase==='reveal'){ F.rt+=dt; const rt=F.rt;
      U.uWave.value.z=E.o(clamp(rt/1.05,0,1))*(F.R*2.3/MAP); U.uWave.value.w=1-sstep(.8,1.1,rt); latU.uLift.value=1.25*E.o(clamp(rt/1.2,0,1));
      if(rt>=.95&&!F.lock) lock();
      if(F.lock){ const k=clamp((rt-.95)/.5,0,1), ov=1+1.25*Math.pow(1-k,3)-.06*Math.sin(k*Math.PI); U.uFoot.value.set(F.x/MAP,F.y/MAP,FEED/2/MAP*ov,Math.min(1,k*3));
        U.uLock.value.z=E.o(clamp((rt-.95)/.9,0,1))*.09; U.uLock.value.w=1-clamp((rt-.95)/.9,0,1);
        const bk=clamp((rt-.95)/1.1,0,1); beam.material.uniforms.uOp.value=(1-bk)*(1-bk)*1.5; beam.scale.y=.6+2.8*E.o(clamp((rt-.95)/.35,0,1)); beam.visible=bk<1;
        if(rt>1.15&&!D.ln.classList.contains('on')){ vis(D.ln,true); }
        if(rt>1.55&&!D.next.classList.contains('on')){ vis(D.dist,true); vis(D.next,true); D.next.firstChild.textContent=F.r>=ROUNDS?'See results ':'Next fix '; }
        if(rt>1.55+5.5) nextFix(); } }
    if(F.phase==='out'){ F.ot+=dt; const k=1-E.io(clamp(F.ot/.45,0,1)); U.uHeat.value.w=k; U.uFoot.value.w=Math.min(U.uFoot.value.w,k); U.uLock.value.w=0; latU.uLift.value=1.25*k;
      if(F.ot>=.45) startFix(F.nx); }
    // score count-up
    if(game&&game.cnt<1){ game.cnt=Math.min(1,game.cnt+dt/.7); D.score.textContent=fmt(lerp(game.from,game.score,E.o(game.cnt))); }
    // search circle, its label, the uncertainty readout
    F.shownR=damp(F.shownR,F.phase==='out'?0:F.R,F.phase==='out'?9:6,dt); U.uCirc.value.set(F.cx/MAP,F.cy/MAP,F.shownR/MAP);
    const um=Math.round(F.R*MPX/2)*2; if(um!==F.um){ F.um=um; const s='± '+um+' m'; D.unc.textContent=s; D.ring.textContent=s; }
    if(F.phase==='aim'){ m2s(F.cx,F.cy-F.shownR,.02,SP); at(D.ring,SP.x,SP.y); }
    if(F.spoof&&F.phase!=='done'){ if(F.phase!=='reveal') spoofAt(F,_sp); else { _sp[0]=F.sx; _sp[1]=F.sy; } m2s(_sp[0],_sp[1],.02,SP); at(D.gnss,SP.x,SP.y); }
    // aim square
    aim.on=damp(aim.on,aim.want&&F.phase==='aim'?1:0,10,dt); U.uHover.value.set(aim.x/MAP,aim.y/MAP,FEED/2/MAP,aim.on);
    if(F.phase==='reveal'){ m2s(F.px,F.py,.02,SP); at(D.clk,SP.x,SP.y);
      if(F.lock){ m2s(F.x,F.y,.02,SP2); at(D.tru,SP2.x,SP2.y); const k=E.io(clamp((F.rt-1.15)/.4,0,1)), dx=SP2.x-SP.x, dy=SP2.y-SP.y, L=Math.hypot(dx,dy);
        at(D.ln,SP.x,SP.y,` rotate(${Math.atan2(dy,dx).toFixed(4)}rad) scaleX(${(L*k).toFixed(1)})`);
        const ux=L>6?dx/L:1, uy=L>6?dy/L:0, lf=ux<0; if(lf!==F.lf){ F.lf=lf; D.tru.classList.toggle('l',lf); }
        at(D.dist,clamp(SP.x-ux*26,ux>0?110:16,innerWidth-(ux>0?16:110)),clamp(SP.y-uy*26,80,innerHeight-120),ux>0?' translate(-100%,-50%)':' translate(0,-50%)'); } }
    // camera: frame the search circle, north up, then lean toward the answer
    const el_=lay.stack?1.2:1.08, th=Math.tan(stCam.fov*Math.PI/360), rw=RMAX*PW/MAP*1.04, d=2*rw*innerHeight/(2*th*lay.d), wpp=2*d*th/innerHeight;
    let lx=m2w(F.cx)-(lay.cx-innerWidth/2)*wpp, lz=m2w(F.cy)-(lay.cy-innerHeight/2)*wpp/Math.sin(el_);
    if(F.lock){ const k=E.io(clamp((F.rt-.95)/1.4,0,1))*.22; lx+=(m2w(F.x)-m2w(F.cx))*k; lz+=(m2w(F.y)-m2w(F.cy))*k; }
    const dd=F.lock?d*(1-.06*E.io(clamp((F.rt-.95)/1.4,0,1))):d;
    st.camL.set(lx,0,lz); st.camP.set(lx,dd*Math.sin(el_),lz+dd*Math.cos(el_));
    // drone and its camera
    if(F.phase==='reveal'&&F.lock) frustum(true,F.x,F.y,dt); else frustum(false,0,0,dt);
  } else {
    // title: a slow cinematic orbit over the map, the drone surveying with its camera
    U.uOn.value=damp(U.uOn.value,0,3,dt); U.uHover.value.w=0; U.uHeat.value.w=damp(U.uHeat.value.w,0,3,dt); U.uFoot.value.w=damp(U.uFoot.value.w,0,3,dt);
    if(beam.visible){ beam.material.uniforms.uOp.value=damp(beam.material.uniforms.uOp.value,0,3,dt); if(beam.material.uniforms.uOp.value<.01) beam.visible=false; }
    if(st.state==='menu') menuLoiter();
    const a=t*.045;
    if(nar){ st.camP.set(Math.sin(a)*1.2,12.5,9.5); st.camL.set(0,0,.9); }
    else { st.camP.set(1.4+Math.sin(a)*.9,7.4,6.8+Math.cos(a)*.4); st.camL.set(-1.2,0,.25); }
    const nx=(drone.p.x/PW+.5)*MAP, nz=(drone.p.z/PW+.5)*MAP; frustum(st.state==='menu',nx,nz,dt);
    if(st.state==='menu'){ st.anchors[0].copy(drone.p); notesUpdate(st); }
  }
  droneUpdate(dt,t); burst.update(dt,1.2,1.4); lat.visible=mesh.visible=U.uHeat.value.w>.002;
  if(!f) U.uWave.value.w=0;
};
st._dbg={steps:STEPS,end:()=>{ if(F&&game){ F.phase='reveal'; F.lock=true; F.r=ROUNDS; nextFix(); } },spoof:()=>F&&F.spoof?spoofAt(F,[0,0]):null,get F(){return F;},get game(){return game;},get pend(){return pend;},get jobs(){return {map:!!mapJob,prep:!!prepJob,scan:!!scan};},pick,m2s:(x,y)=>{ m2s(x,y,.02,SP); return {x:SP.x,y:SP.y}; },commit,toMatch,nextFix,lay,
  heat:()=>{ const H=HEAT[F.slot]; let pk=-9,pi=0; for(let k=0;k<GN*GN;k++) if(H[k]>pk){pk=H[k];pi=k;} return {peakNode:[pi%GN,(pi/GN)|0],truthNode:[F.ti,F.tj],tv:F.tv,second:F.second,ok:F.ok}; }};
})();

/* ===== station og ===== */
/* ================= OGIVE: APOGEE =================
   Design on an OpenRocket-style side view: drag the nose and the fins, pick a motor, trim with nose ballast, watch CG and CP.
   Then fly it at night: count down, burn up through the cloud deck, open the chute right at the top, drift down, land.
   Three flights to put the apogee on the target. */
(()=>{
const st=mkStation('og',{arrive:new T.Vector3(-1.5,1.5,7)});
const sc=st.scene, el=st.el, sky0=sc.children[0];
const S6=6, WIND=3.5, Dm=.066, R0=Dm/2, LB=.62;     // design view: S6 units per metre. A 66 mm tube, 620 mm long. Wind blows toward +x
const SCF=.1, FS=.3, PADY=.06, DY=1.7, HP=Math.PI/2; // flight world: SCF units per metre, rocket drawn at FS of its design size. The design view floats DY above the pad
/* F was 40 N·s, which left 225 to 236 m out of reach for any design Ogive calls stable. 42 N·s closes the gap: F, G and H now cover 126 to 462 m */
const MOT={F:{I:42,tb:1.4,mp:.055,mm:.095},G:{I:58,tb:1.7,mp:.09,mm:.15},H:{I:80,tb:2.0,mp:.13,mm:.21}};

/* ---------- physics: Barrowman CP, a thrust curve, drag, wind, weathercocking ---------- */
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
function newF(dd,sign){ const D=design(dd); return {t:0,x:0,h:0,vx:0,vy:0,th:0,om:0,m:D.mass,D,d:{...dd},apo:0,tApo:0,xApo:0,maxV:0,maxA:0,acc:0,tumble:false,chute:false,torn:false,landed:false,lifted:false,sign:sign||1,deployT:-1,deployV:0,auto:false}; }
function stepF(f,h){
  if(f.landed) return;
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
  if(f.lifted&&f.apo===0&&f.vy<=0){ f.apo=f.h; f.tApo=f.t; f.xApo=f.x; }
  if(f.lifted&&f.h<=0){ f.h=0; f.landed=true; } }
function simApo(dd,sign){ const f=newF(dd,sign||1); for(let i=0;i<9000;i++){ stepF(f,.01); if(f.apo>0||f.landed) break; } return f; }

/* ---------- state ---------- */
let d={motor:'G',LD:2.5,fin:1,bal:0}, DC=design(d), target=280, hist=[], ai=null;
let phase='design', F=null, NAT=null, busy=false, searchId=0, tw=null, cdT=0, cdN=0, simClock=0, tScale=1, ffMax=1, landT=0, ign=0, done=false;
let vT=0, emitAcc=0, pathAcc=0, pathN=0, chuteK=0, slowOn=false, cineOn=false, ev={}, ladX=-2.3, maxH=0, snap=true, keyT=0;
const V1=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3(), V4=new T.Vector3(), V5=new T.Vector3(), NZ=new T.Vector3(), RC=new T.Vector3();
const CP=new T.Vector3(), CL=new T.Vector3(), CA=new T.Vector3(), CB=new T.Vector3(), CC=new T.Vector3(), CD=new T.Vector3();
const P0={x:0,y:0,z:0}, P1={x:0,y:0,z:0}, P2={x:0,y:0,z:0}, P3={x:0,y:0,z:0}, P4={x:0,y:0,z:0}, P5={x:0,y:0,z:0};
function pj(v,o){ V5.copy(v).project(stCam); o.x=(V5.x*.5+.5)*innerWidth; o.y=(-V5.y*.5+.5)*innerHeight; o.z=V5.z; return o; }
const setT=(e,s)=>{ if(e._t!==s){ e._t=s; e.textContent=s; } };
const PORT=()=>innerHeight>innerWidth*1.05;
function curReset(){ const c=$('#cur'); if(c) c.classList.remove('big'); }
function setPhase(p){ el.classList.remove('ph-'+phase); phase=p; el.classList.add('ph-'+p); }

/* ---------- the rocket: rebuilt from the design whenever the design changes ---------- */
const matB=LM('#FFB475',{emit:.05,rim:1.1,amb:.14,key:'#FFE6CC'}), matF=LM('#FFB475',{emit:.03,rim:.9,amb:.12,key:'#FFE6CC'}), matN=LM('#5a4a3b',{rim:.7,amb:.28,key:'#FFE6CC'});
matN.side=T.DoubleSide;
const RKMAT=[matB,matF,matN]; let rkK=.62;
const wire=new T.LineBasicMaterial({color:0xFFB475,transparent:true,opacity:.32,blending:T.AdditiveBlending,depthWrite:false});
const rocket=new T.Group(), rk=new T.Group(); rocket.rotation.order='ZYX'; rocket.add(rk); sc.add(rocket);
let body=null, edges=null, finG=null, fins=[], Lh=2.35, pivotL=2.3;
function rebuild(){
  const g=DC.g;
  if(body){ rk.remove(body); body.geometry.dispose(); edges.geometry.dispose(); }
  if(finG){ fins.forEach(f=>rk.remove(f)); finG.dispose(); }
  const prof=[], L=g.Ln, rho=(R0*R0+L*L)/(2*R0);
  prof.push(new T.Vector2(0,0),new T.Vector2(R0*S6*.92,0),new T.Vector2(R0*S6,.02*S6),new T.Vector2(R0*S6,LB*S6));
  for(let k=1;k<=28;k++){ const x=L*(1-k/28); const r=Math.sqrt(Math.max(rho*rho-Math.pow(L-x,2),0))+R0-rho; prof.push(new T.Vector2(Math.max(r,0)*S6,(LB+(L-x))*S6)); }
  body=new T.Mesh(new T.LatheGeometry(prof,48),matB); rk.add(body);
  edges=new T.LineSegments(new T.EdgesGeometry(body.geometry,30),wire); body.add(edges);
  const shp=new T.Shape(); shp.moveTo(0,g.Cr*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr)*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr-g.Ct)*S6); shp.lineTo(0,0); shp.closePath();
  finG=new T.ExtrudeGeometry(shp,{depth:.025,bevelEnabled:false}); finG.translate(R0*S6*.96,0,-.0125);
  fins=[0,1,2,3].map(k=>{ const m=new T.Mesh(finG,matF); m.rotation.y=k*HP+Math.PI; rk.add(m); return m; });
  Lh=g.L*S6/2; pivotL=(g.L-DC.cg)*S6; rk.position.y=-pivotL;
}
{ // fixed parts: nozzle, the joint between nose cone and body tube, the motor flame and its glow
  const nz=new T.Mesh(new T.CylinderGeometry(R0*S6*.46,R0*S6*.6,.16,20,1,true),matN); nz.position.y=-.05; rk.add(nz);
  const seam=new T.Mesh(new T.TorusGeometry(R0*S6*1.004,.007,6,56),matN); seam.rotation.x=HP; seam.position.y=LB*S6; rk.add(seam);
}
const flameU={uI:{value:0},uLen:{value:4},uTime:G.uTime};
const fp=[]; for(let k=0;k<=24;k++){ const u=k/24; fp.push(new T.Vector2(R0*S6*.5*(1+1.5*u)*Math.pow(1-u,.7)+.002,-u)); }
const flame=new T.Mesh(new T.LatheGeometry(fp,20),new T.ShaderMaterial({uniforms:flameU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`uniform float uI,uLen,uTime; varying float vU; varying vec3 vN,vV;
    void main(){ vec3 p=position; vU=-p.y; float fl=1.+.2*sin(uTime*47.+vU*19.)+.13*sin(uTime*31.-vU*11.); p.xz*=fl*(.55+.45*uI); p.y*=uLen*(.92+.08*sin(uTime*23.));
      vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform float uI; varying float vU; varying vec3 vN,vV;
    void main(){ float c=pow(abs(dot(normalize(vN),normalize(vV))),1.3); vec3 col=mix(vec3(1.,.95,.86),vec3(1.,.48,.16),smoothstep(0.,.55,vU));
      float a=(1.-smoothstep(.05,1.,vU))*(.42+.58*c)*uI; gl_FragColor=vec4(col*a*2.8,1.); }`}));
flame.position.y=-.1; flame.frustumCulled=false; flame.visible=false; rk.add(flame);
const glowU={uI:{value:0},uS:{value:1.6}};
const glow=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({uniforms:glowU,transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,
  vertexShader:`uniform float uS; varying vec2 vQ; void main(){ vQ=position.xy; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*uS; gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`uniform float uI; varying vec2 vQ; void main(){ float r=length(vQ)*2.; float a=exp(-r*r*6.)*1.3+.08*exp(-r*r*1.5); gl_FragColor=vec4(vec3(1.,.64,.34)*a*uI,1.); }`}));
glow.frustumCulled=false; glow.position.y=-.35; glow.visible=false; glow.renderOrder=5; rk.add(glow);

/* ---------- shared GLSL: hashes, value noise, and the night sky colour along a view direction ---------- */
const GLN=`float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n=h21(p); return vec2(n,h21(p+n+19.19)); }
float vn2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
vec3 skyCol(vec3 d){ float e=max(d.y,0.), az=atan(d.x,-d.z+1e-5), a2=az-2.4;
  float town=.4+exp(-az*az*1.3)*.95+exp(-a2*a2*3.)*.3;
  float g=exp(-e*34.)*.9+exp(-e*7.)*.16;
  vec3 c=vec3(.008,.009,.013)+vec3(1.,.58,.32)*.062*town*g;
  return c*mix(1.,.85,smoothstep(0.,-.12,d.y)); }`;

/* ---------- the night launch site ---------- */
const W=new T.Group(); W.visible=false; sc.add(W);
const WU={value:0}, FL={value:new T.Vector4(0,-50,0,0)}, BP={value:1};
// sky dome and stars ride with the camera
const dome=new T.Mesh(new T.SphereGeometry(1,48,24),new T.ShaderMaterial({uniforms:{uOn:WU},side:T.BackSide,depthWrite:false,depthTest:false,
  vertexShader:`varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*viewMatrix*vec4(position*620.+cameraPosition,1.); }`,
  fragmentShader:GLN+`uniform float uOn; varying vec3 vD; void main(){ gl_FragColor=vec4(skyCol(normalize(vD))*uOn,1.); }`}));
dome.renderOrder=-10; dome.frustumCulled=false; W.add(dome);
W.add(pts(cloud(Math.floor(1500*Q+500),(i,r,o)=>{ const a=r[0]*TAU, e=Math.asin(Math.pow(r[1],.85)); o[0]=Math.cos(a)*Math.cos(e); o[1]=Math.sin(e); o[2]=Math.sin(a)*Math.cos(e); }),
  PM({size:3.6,color:'#E8DECF',uniforms:{uOn:WU},decl:'uniform float uOn;',body:'float e=position.y; p=position*600.+cameraPosition; b=uOn*(.08+.8*pow(aR.x,6.))*smoothstep(.02,.22,e)*(.78+.22*sin(uTime*(1.+aR.w*3.)+aR.y*40.)); col=mix(uCol,vec3(.75,.84,1.),aR.y*.6);'})));
{ // a ring of low hills, a dark line against the glow of the towns behind them
  const N=256, R=470, P=[], I=[], ph=[...Array(4)].map(()=>Math.random()*9);
  for(let k=0;k<=N;k++){ const a=k/N*TAU, h=2.2+3.4*Math.pow(.5+.5*Math.sin(a*3+ph[0]),2)+2.4*(.5+.5*Math.sin(a*7+ph[1]))+1.1*Math.sin(a*17+ph[2])+.5*Math.sin(a*43+ph[3]);
    P.push(Math.cos(a)*R,-8,Math.sin(a)*R,Math.cos(a)*R,h,Math.sin(a)*R); if(k<N){ const b=k*2; I.push(b,b+1,b+2,b+1,b+3,b+2); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setIndex(I);
  const m=new T.Mesh(g,new T.ShaderMaterial({uniforms:{uOn:WU},side:T.DoubleSide,vertexShader:`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:GLN+`uniform float uOn; varying vec3 vW; void main(){ vec3 d=normalize(vW-cameraPosition); gl_FragColor=vec4(skyCol(normalize(vec3(d.x,0.,d.z)))*.34*uOn,1.); }`}));
  m.frustumCulled=false; W.add(m);
}
// fields: irregular plots with hedgerows and crop rows, lit by the moon, the towns, and the motor
const groundU={uOn:WU,uFl:FL,uScorch:{value:0}};
const ground=new T.Mesh(new T.PlaneGeometry(1000,1000),new T.ShaderMaterial({uniforms:groundU,extensions:{derivatives:true},
  vertexShader:`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:GLN+`uniform float uOn,uScorch; uniform vec4 uFl; varying vec3 vW;
  void main(){
    vec2 p=vW.xz; float dist=length(vW-cameraPosition);
    vec2 q=p/14.+vec2(.37,.61)+.35*vec2(vn2(p*.045)-.5,vn2(p*.045+7.3)-.5), n=floor(q), f=fract(q); float d1=9., d2=9.; vec2 id=vec2(0.);
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 gg=vec2(float(i),float(j)); vec2 o=gg+.5+.47*(h22(n+gg)*2.-1.)-f; float dd=dot(o,o); if(dd<d1){ d2=d1; d1=dd; id=n+gg; } else if(dd<d2) d2=dd; }
    float edge=sqrt(d2)-sqrt(d1);
    float r1=h21(id*1.7+3.1), r2=h21(id*2.3+11.7), r3=h21(id*.7+5.3);
    float ph=dot(p,vec2(cos(r2*3.1416),sin(r2*3.1416)))/(.16+.22*r3);
    float aa=clamp(1.-fwidth(ph)*1.3,0.,1.);
    float rows=r3>.42?mix(.5,.5+.5*sin(ph*6.2832),aa):.5;
    float gr=vn2(p*2.7)*.55+vn2(p*.61)*.45; gr=mix(.5,gr,clamp(1.-fwidth(p.x*2.7)*.7,0.,1.));
    float hedge=1.-smoothstep(.014,.05,edge), hn=vn2(p*1.3+id*7.);
    vec3 alb=r1<.3?vec3(.075,.065,.055)*(.75+.5*rows):r1<.68?vec3(.105,.112,.1)*(.9+.2*rows):vec3(.15,.135,.105)*(.85+.3*rows);
    alb*=(.8+.4*gr)*(.85+.3*r2);
    alb=mix(alb,vec3(.03,.034,.028)*(.5+.9*hn),hedge);
    float rp=length(p);
    alb=mix(alb,vec3(.17,.16,.14)*(.85+.3*gr),smoothstep(5.6,4.9,rp)*.5);
    alb=mix(alb,vec3(.02,.018,.016),smoothstep(1.5,.35,rp)*uScorch);
    vec3 L=uFl.xyz-vW; float fl=uFl.w/(1.+dot(L,L)*.08);
    vec3 col=alb*(vec3(.2,.22,.3)*.36+vec3(1.,.66,.4)*.1+vec3(1.,.58,.3)*fl*1.2);
    vec3 vd=normalize(vW-cameraPosition);
    col=mix(col,skyCol(normalize(vec3(vd.x,-.0005,vd.z)))*.8,1.-exp(-dist*.0019));
    gl_FragColor=vec4(col*uOn,1.);
  }`}));
ground.rotation.x=-HP; W.add(ground);
// farm lights far out in the fields
W.add(pts(cloud(Math.floor(36*Q+18),(i,r,o)=>{ const a=r[0]*TAU, R=55+Math.pow(r[1],.7)*390; o[0]=Math.cos(a)*R; o[1]=.25; o[2]=Math.sin(a)*R; }),
  PM({size:.55,color:'#FFC48A',uniforms:{uOn:WU},decl:'uniform float uOn;',body:'b=uOn*(.45+.9*aR.z)*(.8+.2*sin(uTime*(.4+aR.w)+aR.x*30.));'})));
// the pad: a slab, a blast plate, a launch rail, a windsock
const matPad=LM('#8c8274',{rim:.3,amb:.16,key:'#FFB87A'}), matRail=LM('#c2b6a4',{rim:.55,amb:.22,key:'#FFB87A'}), matSock=LM('#FFB475',{emit:.12,rim:.7,amb:.2,key:'#FFB87A'});
matSock.side=T.DoubleSide;
const PADMAT=[matPad,matRail,matSock];
function mesh(geo,mat,x,y,z,par){ const m=new T.Mesh(geo,mat); m.position.set(x,y,z); (par||W).add(m); return m; }
mesh(new T.BoxGeometry(1.1,PADY,1.1),matPad,0,PADY/2,0);
mesh(new T.BoxGeometry(.42,.012,.42),matN,0,PADY+.006,0);
mesh(new T.BoxGeometry(.024,2.25,.024),matRail,.074,PADY+1.125,-.074);
mesh(new T.BoxGeometry(.05,.05,.05),matRail,.074,PADY+2.25,-.074);
const sockP=new T.Group(); sockP.position.set(-3.6,0,-1.6); W.add(sockP);
mesh(new T.CylinderGeometry(.012,.016,1.25,8),matRail,0,.625,0,sockP);
const sock=new T.Group(); sock.position.y=1.2; sockP.add(sock);
const sockM=mesh(new T.CylinderGeometry(.075,.035,.55,14,4,true),matSock,.3,0,0,sock); sockM.rotation.z=-HP;
// clouds: a broken deck between 110 and 150 m, lit from below by the motor as it passes
const NC=Math.floor(110*Q+60), cPos=new Float32Array(NC*3), cRnd=new Float32Array(NC*4);
{ const cl=[[-1.6,.6,2.6],[-5,-4,3.5],[4,-7,4]]; for(let i=0;i<11;i++) cl.push([(Math.random()-.5)*140,(Math.random()-.5)*90-12,3+Math.random()*7]);
  for(let i=0;i<NC;i++){ const c=cl[i%cl.length]; cPos[i*3]=c[0]+gauss()*c[2]; cPos[i*3+1]=5.6+gauss()*.5; cPos[i*3+2]=c[1]+gauss()*c[2]*.7; for(let k=0;k<4;k++) cRnd[i*4+k]=Math.random(); } }
function bbGeo(n,attrs){ const q=new T.PlaneGeometry(1,1), g=new T.InstancedBufferGeometry(); g.index=q.index; g.setAttribute('position',q.attributes.position);
  for(const k in attrs) g.setAttribute(k,new T.InstancedBufferAttribute(attrs[k][0],attrs[k][1])); g.instanceCount=n; return g; }
const cloudU={uOn:WU,uDrift:{value:0},uFl:FL};
const clouds=new T.Mesh(bbGeo(NC,{aP:[cPos,3],aR:[cRnd,4]}),new T.ShaderMaterial({uniforms:cloudU,transparent:true,depthWrite:false,
  vertexShader:`attribute vec3 aP; attribute vec4 aR; uniform float uDrift,uOn; uniform vec4 uFl; varying vec2 vQ; varying vec3 vC; varying float vA; varying float vS;
    void main(){ vS=aR.y*40.; vec3 c=aP; c.x=mod(c.x+uDrift+100.,200.)-100.; float s=2.4+aR.x*3.6;
      vec4 mv=modelViewMatrix*vec4(c,1.); float dz=-mv.z; mv.xy+=position.xy*s; vQ=position.xy;
      vec3 L=c-uFl.xyz; float fl=uFl.w*.42/(1.+dot(L,L)*.14);
      vC=vec3(.05,.047,.045)*(.6+.8*aR.z)+vec3(1.,.56,.28)*fl;
      vA=uOn*smoothstep(s*.2,s*1.1,dz)*(1.-smoothstep(140.,300.,dz))*(.2+.22*aR.w);
      gl_Position=projectionMatrix*mv; }`,
  fragmentShader:GLN+`varying vec2 vQ; varying vec3 vC; varying float vA; varying float vS; void main(){ float r=length(vQ)*2.; float n=vn2(vQ*4.+vS)*.6+vn2(vQ*9.+vS*1.7)*.4; float a=smoothstep(1.,.15,r+(n-.5)*.7)*vA; if(a<.002) discard; gl_FragColor=vec4(vC*(.75+.5*n),a); }`}));
clouds.frustumCulled=false; W.add(clouds);
// smoke: a ring buffer of soft puffs. kind 0 exhaust trail, 1 pad billow, 2 thin delay smoke, 3 landing dust
const NS=Math.floor(1100*Q+300), sP=new Float32Array(NS*3), sV=new Float32Array(NS*3), sD=new Float32Array(NS*4);
const smokeU={uNow:{value:0},uOn:WU,uWind:{value:new T.Vector3(WIND*SCF,0,0)},uFl:FL};
const smokeG=bbGeo(NS,{aP:[sP,3],aV:[sV,3],aD:[sD,4]}); ['aP','aV','aD'].forEach(k=>smokeG.attributes[k].setUsage(T.DynamicDrawUsage));
const smoke=new T.Mesh(smokeG,new T.ShaderMaterial({uniforms:smokeU,transparent:true,depthWrite:false,
  vertexShader:`attribute vec3 aP,aV; attribute vec4 aD; uniform float uNow,uOn; uniform vec3 uWind; uniform vec4 uFl; varying vec2 vQ; varying vec3 vC; varying float vA;
    void main(){ float age=uNow-aD.x, kind=aD.y, sd=aD.z;
      float life=kind<.5?15.:kind<1.5?20.:kind<2.5?9.:5.;
      if(age<0.||age>life||uOn<.01){ gl_Position=vec4(0.,0.,2.,1.); vA=0.; return; }
      float k=age/life, dr=(1.-exp(-age*1.6))/1.6;
      vec3 c=aP+aV*dr+uWind*(age-dr)*(kind>2.5?.4:1.)+vec3(0.,(kind>2.5?.03:.09)*age,0.);
      c+=vec3(sin(age*.8+sd*40.),.5*sin(age*.6+sd*27.),cos(age*.7+sd*33.))*.15*sqrt(age);
      float grow=kind<.5?1.3:kind<1.5?1.05:kind<2.5?.9:1.7;
      float s=aD.w*(1.+grow*sqrt(age));
      vec4 mv=modelViewMatrix*vec4(c,1.); float dz=-mv.z; mv.xy+=position.xy*s; vQ=position.xy;
      vec3 L=c-uFl.xyz; float fl=min(1.6,uFl.w*.42/(1.+dot(L,L)*.6));
      float hot=kind<1.5?exp(-age*5.):0.;
      vec3 base=kind>2.5?vec3(.08,.07,.06):vec3(.095,.097,.104);
      vC=base+vec3(1.,.55,.24)*(fl+hot*.55);
      vA=uOn*smoothstep(0.,.08,age)*pow(1.-k,1.4)*(kind<.5?.6:kind<1.5?.45:kind<2.5?.5:.45)*smoothstep(.05,s*.9,dz);
      gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`varying vec2 vQ; varying vec3 vC; varying float vA; void main(){ float r=length(vQ)*2.; float a=exp(-r*r*3.)*vA; if(a<.003) discard; gl_FragColor=vec4(vC,a); }`}));
smoke.frustumCulled=false; W.add(smoke);
let sI=0, sDirty=false;
function puff(x,y,z,vx,vy,vz,kind,size){ const i=sI++%NS; sP[i*3]=x; sP[i*3+1]=y; sP[i*3+2]=z; sV[i*3]=vx; sV[i*3+1]=vy; sV[i*3+2]=vz; sD[i*4]=simClock; sD[i*4+1]=kind; sD[i*4+2]=Math.random(); sD[i*4+3]=size; sDirty=true; }
function smokeClear(){ for(let i=0;i<NS;i++) sD[i*4]=-1e5; sDirty=true; }
smokeClear();
const sparks=Burst(W,Math.floor(700*Q+250),'#FFCF9E',.045);
// altitude ladder: a tick every 10 m, a label every 50 m, brightest around the rocket
const lad=new T.Group(); lad.position.z=-4; W.add(lad);
const ladU={uFocus:{value:0},uOn:WU,uLad:{value:0}};
function labelSprite(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; const tex=new T.CanvasTexture(c); tex.minFilter=T.LinearFilter; tex.generateMipmaps=false;
  const sp=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:0})); sp.userData={c,x:c.getContext('2d'),tex}; return sp; }
function drawLabel(sp,text,color,px,align){ const {c,x,tex}=sp.userData; x.clearRect(0,0,c.width,c.height); x.font=Math.round(px*.82)+'px "Michroma", sans-serif'; x.fillStyle=color; x.textBaseline='middle';
  x.textAlign=align||'left'; x.fillText(text,align==='right'?c.width-6:6,c.height/2+2); tex.needsUpdate=true; }
const ladLabels=[];
{ const P=[], K=[]; P.push(0,0,0,0,52,0); K.push(.6,.6);
  for(let m=10;m<=520;m+=10){ const y=m*SCF, maj=m%50===0; P.push(0,y,0,maj?.6:.22,y,0); K.push(maj?1:0,maj?1:0); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aK',new T.Float32BufferAttribute(K,1));
  const m=new T.LineSegments(g,new T.ShaderMaterial({uniforms:ladU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform float uFocus; attribute float aK; varying float vA; void main(){ float y=position.y; vA=(.1+.5*exp(-pow((y-uFocus)/6.5,2.)))*(.45+.55*aK); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOn,uLad; varying float vA; void main(){ gl_FragColor=vec4(vec3(1.,.86,.72)*vA*uOn*uLad,1.); }`}));
  m.frustumCulled=false; lad.add(m);
  for(let mm=50;mm<=500;mm+=50){ const sp=labelSprite(256,64); drawLabel(sp,mm+' m','#FFE6D2',38,'right'); sp.position.set(-.18,mm*SCF,0); sp.scale.set(1.12,.28,1); sp.center.set(1,.5); sp.userData.y=mm*SCF; lad.add(sp); ladLabels.push(sp); }
}
const tgtLab=labelSprite(512,64); tgtLab.center.set(0,.5); tgtLab.scale.set(2.24,.28,1); lad.add(tgtLab);
const tgtTick=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-.3,0,0),new T.Vector3(.68,0,0)]),new T.LineBasicMaterial({color:0xFFB475,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
lad.add(tgtTick);
const lastG=new T.BufferGeometry(); lastG.setAttribute('position',new T.BufferAttribute(new Float32Array(18),3)); lastG.setDrawRange(0,0);
lad.add(new T.LineSegments(lastG,new T.LineBasicMaterial({color:0xEEE9DF,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false})));
// the target: a glowing plane of rings and spokes at the target altitude
const tgtU={uOn:WU,uHit:{value:0},uNear:{value:0}};
const tgt=new T.Group(); W.add(tgt);
{ const pos=[]; [2.5,5,7.5,10].forEach((R,ri)=>{ const n=Math.floor(R*TAU/.26); for(let k=0;k<n;k++){ const a=k/n*TAU; pos.push(Math.cos(a)*R,ri===3?1:0,Math.sin(a)*R); } });
  for(let s=0;s<12;s++){ const a=s/12*TAU; for(let r=1.2;r<10;r+=.32) pos.push(Math.cos(a)*r,0,Math.sin(a)*r); }
  const N=pos.length/3; tgt.add(pts(cloud(N,(i,r,o)=>{ o[0]=pos[i*3]; o[1]=0; o[2]=pos[i*3+2]; r[3]=pos[i*3+1]; }),PM({size:.1,color:'#FFB475',uniforms:tgtU,decl:'uniform float uOn,uHit,uNear;',
    body:'float rr=length(p.xz); float a=atan(p.z,p.x); p.xz*=1.+uHit*.12; float dz=-(modelViewMatrix*vec4(p,1.)).z; b=uOn*(.22+.45*aR.w+uNear*.35+uHit*1.2)*(1.-smoothstep(7.,10.5,rr)*(1.-aR.w)*.7)*(.6+.4*step(.5,fract(a*3.-uTime*.08))); sz=(2.+aR.w*1.2+uHit*1.5)*dz/(uSize*uPx);'})));
  const disc=new T.Mesh(new T.CircleGeometry(10.4,72),new T.ShaderMaterial({uniforms:tgtU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOn,uHit,uNear; varying vec2 vP; void main(){ float r=length(vP); float a=(.01+.02*uNear+.07*uHit)*(1.-smoothstep(2.,10.4,r))+(.13+.3*uHit)*exp(-pow((r-10.)/.12,2.)); gl_FragColor=vec4(vec3(1.,.7,.46)*a*uOn,1.); }`}));
  disc.rotation.x=-HP; tgt.add(disc);
}
// flight path: a dot every 80 ms of flight, kept for the results
const NPATH=900, pathP=new Float32Array(NPATH*3).fill(9999), pathU={uOn:WU,uRes:{value:0}};
const pathG=new T.BufferGeometry(); pathG.setAttribute('position',new T.BufferAttribute(pathP,3)); pathG.setAttribute('aR',new T.BufferAttribute(new Float32Array(NPATH*4).fill(.5),4)); pathG.setDrawRange(0,0); pathG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
pathG.attributes.position.setUsage(T.DynamicDrawUsage);
W.add(pts(pathG,PM({size:1,color:'#FFB475',uniforms:pathU,decl:'uniform float uOn,uRes;',body:'float dz=-(modelViewMatrix*vec4(p,1.)).z; sz=(2.2+uRes*1.6)*dz/uPx; b=uOn*(.35+.4*uRes);'})));
const apoLab=labelSprite(512,64); apoLab.center.set(0,.5); apoLab.scale.set(2.24,.28,1); W.add(apoLab);
// parachute: eight gores in amber and cream, eight shroud lines, a shock cord to the rocket
const chute=new T.Group(), canopy=new T.Group(); chute.add(canopy); chute.visible=false; W.add(chute);
const canU={uOn:{value:1},uA:{value:new T.Color('#FFB475')},uB:{value:new T.Color('#E9E2D4')}};
{ const pr=[]; for(let k=0;k<=16;k++){ const a=k/16*HP; pr.push(new T.Vector2(Math.sin(a)+.0001,1.5+Math.cos(a)*.58)); } pr.push(new T.Vector2(.985,1.45));
  canopy.add(new T.Mesh(new T.LatheGeometry(pr,64),new T.ShaderMaterial({uniforms:canU,side:T.DoubleSide,
    vertexShader:`varying vec3 vP,vN,vV; void main(){ vec3 p=position; float a=atan(p.z,p.x), r=length(p.xz), rim=smoothstep(.55,1.,r), ln=.5+.5*cos(a*8.);
      p.xz*=1.-.08*ln*rim; p.y+=.06*ln*rim; vP=position; vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uA,uB; uniform float uOn; varying vec3 vP,vN,vV; void main(){ float a=atan(vP.z,vP.x)/6.28318*8.; vec3 base=mix(uA,uB,step(.5,fract(a)));
      float f=abs(dot(normalize(vN),normalize(vV))), top=smoothstep(1.4,2.05,vP.y), seam=1.-smoothstep(0.,.04,abs(fract(a+.5)-.5));
      vec3 c=base*(.1+.17*f+.14*top)+base*pow(1.-f,2.)*.34; c*=1.-.3*seam; gl_FragColor=vec4(c*uOn,1.); }`})));
  const lp=[]; for(let k=0;k<8;k++){ const a=k/8*TAU; lp.push(Math.cos(a)*.906,1.51,Math.sin(a)*.906,0,0,0); }
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.Float32BufferAttribute(lp,3));
  canopy.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:0xE9E2D4,transparent:true,opacity:.6,depthWrite:false})));
}
const cordP=new Float32Array(6), cordG=new T.BufferGeometry(); cordG.setAttribute('position',new T.BufferAttribute(cordP,3));
const cord=new T.Line(cordG,new T.LineBasicMaterial({color:0xE9E2D4,transparent:true,opacity:.5,depthWrite:false})); cord.frustumCulled=false; cord.visible=false; W.add(cord);
const chP=new T.Vector3();

/* ---------- the blueprint behind the design view ---------- */
const bp=pts(cloud(Math.floor(9000*Q+3000),(i,r,o)=>{ o[0]=Math.round((r[0]-.5)*40/.5)*.5; o[1]=DY+Math.round((r[1]-.5)*20/.5)*.5; o[2]=-2.5; }),PM({size:.03,color:'#FFB475',body:`b=.12*smoothstep(14.,4.,length(p.xy-vec2(0.,${DY.toFixed(2)})));`}));
sc.add(bp);

/* ---------- HUD ---------- */
const $o=id=>$('#og'+id);
const hN=$o('HN'), hF=$o('HF'), rail=$o('Rail'), drCG=$o('DrCG'), drCP=$o('DrCP'), dim=$o('Dim'), mCG=$o('CG'), mCP=$o('CP'), lCG=$o('CGl'), lCP=$o('CPl'), stabL=$o('StabL');
const altEl=$o('A'), vEl=$o('V'), tEl=$o('T'), xEl=$o('X'), ring=$o('Ring'), ringO=$o('RingO'), cdK=$o('CDk'), cdNum=$o('CDn'), capK=$o('CapK'), capV=$o('CapV'), capEl=$o('Cap');
const sayEl=$o('AI'), askBtn=$o('Ask'), askT=$o('AskT'), launchBtn=$o('Launch'), launchT=$o('LaunchT'), gauge=$o('Gauge'), plot=$o('Plot'), px=plot.getContext('2d');
gauge.innerHTML='<i class="ax"></i>'+[0,100,200,300,400,500].map(m=>`<span class="tk" data-m="${m}">${m}</span>`).join('')+'<i class="tg" id="ogGT"></i><span class="tgl ui s" id="ogGTl">Target</span>'
  +[0,1,2].map(i=>`<i class="fm" id="ogGF${i}"></i>`).join('')+'<span class="fml ui s" id="ogGFl"></span><i class="pr" id="ogGP"></i><i class="mx" id="ogGM"></i><i class="lv" id="ogGL"></i>';
const gT=$o('GT'), gTl=$o('GTl'), gF=[0,1,2].map(i=>$o('GF'+i)), gFl=$o('GFl'), gP=$o('GP'), gM=$o('GM'), gL=$o('GL');
let GH=132;
const gy=m=>GH*(1-clamp(m,0,500)/500);
function layoutGauge(){
  GH=gauge.clientHeight||GH; $$('.tk',gauge).forEach(s=>s.style.top=gy(+s.dataset.m)+'px');
  gT.style.transform=`translateY(${gy(target)}px)`; gTl.style.transform=`translateY(${gy(target)}px)`;
  gF.forEach((e,i)=>{ const h=hist[i]; e.classList.toggle('on',!!h); e.classList.toggle('old',!!h&&i<hist.length-1); if(h) e.style.transform=`translateY(${gy(h.apo)}px)`; });
  const L=hist[hist.length-1]; gFl.classList.toggle('on',!!L); if(L){ gFl.textContent=`${hist.length} · ${Math.round(L.apo)}`; gFl.style.transform=`translateY(${gy(L.apo)}px)`; }
  if(ai) gP.style.transform=`translateY(${gy(ai.apo)}px)`;
}
addEventListener('resize',()=>{ if(S.stId==='og') layoutGauge(); });
function cap(k,v){ capK.textContent=k; capV.textContent=v||''; capEl.classList.remove('on'); void capEl.offsetWidth; capEl.classList.add('on'); }
function aiMatch(){ return !!ai&&ai.motor===d.motor&&Math.abs(ai.LD-d.LD)<.12&&Math.abs(ai.fin-d.fin)<.05&&Math.abs(ai.bal-d.bal)<.006; }
function syncUI(){
  const D=DC, s=D.stab, M=MOT[d.motor];
  setT($o('Stab'),s.toFixed(2)+' cal'); setT($o('StabW'),s<1?'Unstable':s>2.6?'Overstable':'Stable');
  el.classList.toggle('unstable',s<1); el.classList.toggle('overstable',s>2.6);
  $$('#ogMotor button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===d.motor));
  setT($o('MotS'),`${M.I} N·s · ${M.tb.toFixed(1)} s burn`); setT($o('Bal'),Math.round(d.bal*1000)+' g'); setT($o('Mass'),`${D.mass.toFixed(2)} kg · Cd ${D.Cd.toFixed(2)}`);
  $o('StabNote').innerHTML=`<b>${s.toFixed(2)} cal</b>The centre of pressure sits behind the centre of gravity, by Barrowman's equations.`;
  setT($o('HNv'),'L/D '+d.LD.toFixed(2)); setT($o('HFv'),Math.round(D.g.s*1000)+' mm');
  hN.setAttribute('aria-valuenow',d.LD.toFixed(2)); hF.setAttribute('aria-valuenow',Math.round(D.g.s*1000));
  const m=aiMatch(); el.classList.toggle('assisted',m); el.classList.toggle('predicted',m);
}
function designChanged(){ DC=design(d); rebuild(); syncUI(); const n=performance.now(); if(n-keyT>45){ keyT=n; A.key(); } }

/* ---------- design input: drag handles (mouse, touch, keys), motor, ballast ---------- */
const AX={x:1,y:0}, FO={x:0,y:-1};
function wpp(){ centreOf(V3); return 2*stCam.position.distanceTo(V3)*Math.tan(stCam.fov*Math.PI/360)/innerHeight; }
function dragHandle(h,kind){
  let drag=null;
  h.addEventListener('pointerdown',e=>{ if(phase!=='design'||busy||st.state!=='play') return; drag={x:e.clientX,y:e.clientY,d:{...d},id:e.pointerId,w:wpp(),ax:{...AX},fo:{...FO}};
    h.classList.add('drag','used'); try{ h.setPointerCapture(e.pointerId); }catch(_){} e.preventDefault(); e.stopPropagation(); A.tick(); });
  h.addEventListener('pointermove',e=>{ if(!drag||e.pointerId!==drag.id) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(kind==='nose') d.LD=clamp(drag.d.LD+(dx*drag.ax.x+dy*drag.ax.y)*drag.w/S6/Dm,1.5,4);
    else d.fin=clamp(drag.d.fin+(dx*drag.fo.x+dy*drag.fo.y)*drag.w/(.075*S6),.6,1.5);
    designChanged(); });
  const up=()=>{ if(!drag) return; drag=null; h.classList.remove('drag'); };
  h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up); h.addEventListener('lostpointercapture',up);
  h.addEventListener('keydown',e=>{ if(phase!=='design'||busy||st.state!=='play') return; let s=0;
    if(e.code==='ArrowRight'||e.code==='ArrowUp') s=1; else if(e.code==='ArrowLeft'||e.code==='ArrowDown') s=-1; else return; e.preventDefault();
    if(kind==='nose') d.LD=clamp(+(d.LD+s*.05).toFixed(2),1.5,4); else d.fin=clamp(+(d.fin+s*.02).toFixed(2),.6,1.5); h.classList.add('used'); designChanged(); });
}
dragHandle(hN,'nose'); dragHandle(hF,'fin');
if(!FINE) $o('PromptT').textContent='Tap anywhere, right at the top';
const canEdit=()=>phase==='design'&&!busy&&st.state==='play';
$o('Bm').addEventListener('click',()=>{ if(!canEdit()) return; d.bal=Math.max(0,+(d.bal-.01).toFixed(3)); designChanged(); });
$o('Bp').addEventListener('click',()=>{ if(!canEdit()) return; d.bal=Math.min(.15,+(d.bal+.01).toFixed(3)); designChanged(); });
$$('#ogMotor button').forEach(b=>b.addEventListener('click',()=>{ if(!canEdit()||d.motor===b.dataset.m) return; d.motor=b.dataset.m; designChanged(); A.blip(); }));

/* ---------- Ask Ogive: search the design space, plot every stable design, morph to the best ---------- */
let GRID=null;
const PCOL={F:'rgba(200,193,179,.55)',G:'rgba(255,180,117,.6)',H:'rgba(255,224,200,.7)'};
const plx=s=>6+(s-1.3)/1.3*220, ply=a=>82-(a-100)/380*76;
function plotReset(){ px.clearRect(0,0,232,88); px.fillStyle='rgba(238,233,223,.16)'; px.fillRect(6,82,220,1); px.fillRect(6,6,1,76);
  px.fillStyle='rgba(255,180,117,.75)'; for(let x=6;x<226;x+=6) px.fillRect(x,Math.round(ply(target)),3,1); }
function plotBest(b){ const x=plx(b.stab), y=ply(b.apo); px.strokeStyle='#EEE9DF'; px.lineWidth=1.5; px.beginPath(); px.moveTo(x-7,y); px.lineTo(x+7,y); px.moveTo(x,y-7); px.lineTo(x,y+7); px.stroke(); px.strokeRect(x-3.5,y-3.5,7,7); }
async function askOgive(){
  if(!canEdit()) return;
  busy=true; const my=++searchId, cur={...d}; let best=null, n=0, i=0, lastBeep=0;
  el.classList.add('searching'); el.classList.remove('answered'); askBtn.setAttribute('aria-busy','true'); setT(askT,'Searching'); launchBtn.disabled=true;
  if(!GRID){ GRID=[]; for(const m of ['F','G','H']) for(let LD=1.5;LD<=4.001;LD+=.25) for(let fin=.6;fin<=1.501;fin+=.1) for(let bal=0;bal<=.1501;bal+=.01) GRID.push({motor:m,LD:+LD.toFixed(2),fin:+fin.toFixed(2),bal:+bal.toFixed(3)}); }
  plotReset();
  const tryD=dd=>{ const D=design(dd); if(D.stab<1.3||D.stab>2.6) return; n++; const apo=simApo(dd,1).apo; const err=Math.abs(apo-target)+.5*Math.abs(dd.LD-cur.LD)+2*Math.abs(dd.fin-cur.fin);
    px.fillStyle=PCOL[dd.motor]; px.fillRect(plx(D.stab),ply(apo),2,2); if(!best||err<best.err) best={dd:{...dd},apo,err,stab:D.stab}; };
  const run=async list=>{ i=0; while(i<list.length){ const t0=performance.now(), bud=clamp((S.rdt||.016)*400,6,60);
      while(i<list.length&&performance.now()-t0<bud) tryD(list[i++]);
      sayEl.innerHTML=`<span class="mute">Ogive is flying</span> ${fmt(n)} <span class="mute">simulated designs</span>`;
      if(performance.now()-lastBeep>110){ lastBeep=performance.now(); A.key(); }
      await nextFrame(); if(my!==searchId) return false; } return true; };
  if(!await run(GRID)) return;
  if(best){ const b0=best.dd, ref=[]; for(let LD=Math.max(1.5,b0.LD-.25);LD<=Math.min(4,b0.LD+.25)+.001;LD+=.05) for(let bal=Math.max(0,b0.bal-.02);bal<=Math.min(.15,b0.bal+.02)+.0001;bal+=.002) ref.push({motor:b0.motor,LD:+LD.toFixed(2),fin:b0.fin,bal:+bal.toFixed(3)}); if(!await run(ref)) return; }
  if(!best){ sayEl.textContent='No stable design reaches that altitude.'; finishAsk(); return; }
  plotBest(best);
  const from={...d}, to=best.dd, t0=performance.now(); d.motor=to.motor;
  await new Promise(res=>{ (function step(){ if(my!==searchId) return res(); const k=E.io(clamp((performance.now()-t0)/900,0,1)); d.LD=lerp(from.LD,to.LD,k); d.fin=lerp(from.fin,to.fin,k); d.bal=lerp(from.bal,to.bal,k); designChanged(); if(k<1) requestAnimationFrame(step); else res(); })(); });
  if(my!==searchId) return;
  d={...to}; ai={...to,apo:best.apo}; designChanged(); A.chime(9); A.chime(12,.1);
  sayEl.innerHTML=`<span class="mute">Flew ${fmt(n)} designs.</span> ${to.motor} motor, L/D ${to.LD.toFixed(2)}, fins ${Math.round(to.fin*100)}%, ${Math.round(to.bal*1000)} g ballast. <span class="mute">Predicts</span> ${Math.round(best.apo)} m`;
  el.classList.remove('searching'); el.classList.add('answered'); layoutGauge(); finishAsk();
}
function finishAsk(){ busy=false; el.classList.remove('searching'); askBtn.removeAttribute('aria-busy'); setT(askT,'Ask Ogive'); launchBtn.disabled=false; }
askBtn.addEventListener('click',askOgive);

/* ---------- poses ---------- */
const pose={tail:new T.Vector3(-2.45,DY,0),pitch:-HP,roll:0};
const twA={c:new T.Vector3(),pitch:0,roll:0,scale:1}, twB={c:new T.Vector3(),pitch:0,roll:0,scale:1};
function axisOf(pitch,o){ return o.set(-Math.sin(pitch),Math.cos(pitch),0); }
function placeByTail(tail,pitch,roll,scale){ rocket.rotation.set(0,roll,pitch); rocket.scale.setScalar(scale); axisOf(pitch,V1); rocket.position.copy(tail).addScaledVector(V1,pivotL*scale); }
function placeByCentre(c,pitch,roll,scale){ rocket.rotation.set(0,roll,pitch); rocket.scale.setScalar(scale); axisOf(pitch,V1); rocket.position.copy(c).addScaledVector(V1,(pivotL-Lh)*scale); }
function centreOf(o){ axisOf(rocket.rotation.z,V1); return o.copy(rocket.position).addScaledVector(V1,(Lh-pivotL)*rocket.scale.x); }
const rkW=(x,y,z,o)=>rk.localToWorld(o.set(x,y,z));
function designTarget(t,port,menu,o){ // tail position (into o) and pitch, for the title screen and the design view
  if(menu){ if(port){ o.set(.3,DY-3.15+.06*Math.sin(t*.7),0); return -.24+.02*Math.sin(t*.5); }
    o.set(.22,DY-2.62+.05*Math.sin(t*.7),0); return -.05+.02*Math.sin(t*.5); }
  if(port){ o.set(.62,DY-2.55,0); return 0; }
  o.set(-2.45,DY,0); return -HP;
}

/* ---------- launch flow: arm (to the pad), count down, fly, land ---------- */
function startArm(){
  if(phase!=='design'||busy||st.state!=='play') return;
  centreOf(twA.c); twA.pitch=pose.pitch; twA.roll=pose.roll; twA.scale=1;
  twB.c.set(0,PADY+Lh*FS,0); twB.pitch=0; twB.roll=Math.round(pose.roll/HP)*HP; twB.scale=FS;
  tw={t:0,dur:1.6,arm:true}; setPhase('arm'); W.visible=true; el.classList.remove('chute-ready','chute-now');
  launchBtn.classList.add('cancel'); setT(launchT,'Cancel'); launchBtn.dataset.cur='Cancel';
  setT(cdK,'To the pad'); setT(cdNum,''); placePad(); lastFlights(); A.whoosh(true,1.4,.14); A.chime(5);
}
function cancelLaunch(){
  if(phase!=='arm'&&phase!=='count') return;
  A.whoosh(false,.9,.12); A.beep(330); cap('Countdown cancelled','Back to the design'); toDesign();
}
function toDesign(){ // tween from wherever the rocket is back to the design view
  F=null; centreOf(twA.c); twA.pitch=rocket.rotation.z; twA.roll=rocket.rotation.y; twA.scale=rocket.scale.x;
  tw={t:0,dur:1.3,arm:false,from:stCam.position.clone(),fromL:st.camL.clone()}; setPhase('disarm'); chute.visible=cord.visible=false; flame.visible=glow.visible=false; FL.value.w=0;
  stopSound(); slow(false); launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); launchBtn.dataset.cur='Launch';
  el.classList.remove('chute-ready','chute-now');
}
function placePad(){ // the target label faces the rocket, the scale labels the other way; a scale label next to the target steps aside
  // portrait mirrors the ladder: it stands right of the rocket there, so the ticks and the target label turn toward it
  const port=PORT(); lad.scale.x=port?-1:1; tgt.position.y=target*SCF; tgtTick.position.y=target*SCF;
  tgtLab.center.set(port?1:0,.5); tgtLab.position.set(port?.3:.75,target*SCF,0); drawLabel(tgtLab,'Target '+target+' m','#FFB475',38,port?'right':'left');
  for(let i=0;i<ladLabels.length;i++){ const sp=ladLabels[i]; sp.center.set(port?0:1,.5); sp.position.x=port?-.12:-.18; sp.userData.hide=Math.abs(sp.userData.y/SCF-target)<16; drawLabel(sp,Math.round(sp.userData.y/SCF)+' m','#FFE6D2',38,port?'left':'right'); } }
function lastFlights(){ const a=lastG.attributes.position.array; hist.forEach((h,i)=>{ const y=h.apo*SCF; a.set([-.1,y,0,.45,y,0],i*6); }); lastG.attributes.position.needsUpdate=true; lastG.setDrawRange(0,hist.length*2); }
function startCount(){ setPhase('count'); cdT=3; cdN=4; tScale=1; }
function ignite(){
  const sign=Math.random()<.5?-1:1; F=newF(d,sign); NAT=simApo(d,sign); setPhase('flight'); simClock=0; smokeClear(); tScale=1; ev={}; maxH=0; done=false;
  pathN=0; pathAcc=0; emitAcc=0; ffMax=1; pathG.setDrawRange(0,0); pathU.uRes.value=0; apoLab.material.opacity=0; groundU.uScorch.value=0; cloudU.uDrift.value=0;
  flame.visible=glow.visible=true; ign=1; chute.visible=cord.visible=false; curReset(); ring.classList.remove('pop','late'); ringLate=false;
  launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); el.classList.remove('chute-ready','chute-now');
  A.launch(); A.boom(); A.beep(1320); feedback(.5,.7); S.flash=Math.max(S.flash,.16);
  for(let k=0;k<Math.floor(26*Q+10);k++){ const a=Math.random()*TAU, s=1.2+Math.random()*2; puff(Math.cos(a)*.2,.1,Math.sin(a)*.2,Math.cos(a)*s,.15+Math.random()*.35,Math.sin(a)*s,1,.28+Math.random()*.22); }
  cap('Ignition',MOT[d.motor].I+' N·s '+d.motor+' motor');
}
function deploy(auto){
  if(!F||F.chute||F.landed||phase!=='flight') return;
  if(!auto&&F.t<F.D.M.tb){ centreOf(RC); popAt($o('Pops'),RC,'Still burning','bad'); A.beep(260); return; }
  F.chute=true; F.deployT=F.t; F.auto=!!auto; F.deployV=Math.hypot(F.vx,F.vy); chuteK=0; chute.visible=cord.visible=true; curReset();
  el.classList.remove('chute-ready','chute-now'); centreOf(RC); canU.uOn.value=1;
  if(ev.win||ringLate){ ring.classList.add('pop'); ringO.style.transform='scale(2.6)'; }
  if(!auto&&F.vy>12){ F.torn=true; A.buzz(); A.pop(); feedback(.35,.9,new T.Color(.14,0,0)); cap('Chute shredded',Math.round(F.vy)+' m/s is too fast to open'); popAt($o('Pops'),RC,'Too fast','bad'); return; }
  A.pop(); A.whoosh(true,.7,.13); feedback(.14,.35);
  if(auto){ cap('Ejection charge','Opened late, by the motor'); popAt($o('Pops'),RC,'Late','bad'); return; }
  const dt=F.t-NAT.tApo, ok=Math.abs(dt)<.12; A.ping(ok?1568:1175,.05);
  cap(ok?'Right at the top':dt<0?'A touch early':'A touch late',(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s from apogee');
  popAt($o('Pops'),RC,(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s',Math.abs(dt)<.25?'big':'');
}
function slow(on){ if(on===slowOn) return; slowOn=on; if(on&&!cineOn){ cine(true); cineOn=true; } if(!on&&cineOn){ cine(false); cineOn=false; } if(on) A.whoosh(false,1.1,.07); }
function stopSound(){ A.roar(0); A.wind(0); A.thrust(0); A.hiss(0); }
const L0={cy:0,cx:0,sx:1,sy:1,rz:0,py:0};
function landing(){
  setPhase('landed'); landT=0; stopSound(); A.pop(); feedback(.2,.25); slow(false); curReset();
  L0.cy=chP.y; L0.cx=chP.x; L0.sx=canopy.scale.x; L0.sy=canopy.scale.y; L0.rz=rocket.rotation.z; L0.py=rocket.position.y;
  const x=rocket.position.x; for(let k=0;k<Math.floor(22*Q+10);k++){ const a=Math.random()*TAU, s=.5+Math.random()*.9; puff(x+Math.cos(a)*.15,.05,Math.sin(a)*.15,Math.cos(a)*s,.08+Math.random()*.14,Math.sin(a)*s,3,.12+Math.random()*.12); }
  V2.set(x,.05,0); sparks.emit(V2,Math.floor(30*Q+10),1.2,new T.Color('#C8B49A'),.8,.7);
  cap('Touchdown',Math.round(Math.abs(F.x))+' m '+(F.x>=0?'downwind':'upwind')+' of the pad');
}
function finish(){
  if(done) return; done=true; const f=F; hist.push({apo:f.apo}); const tries=hist.length;
  const err=Math.abs(f.apo-target), pct=err/target*100, dt=f.deployT<0?0:f.deployT-NAT.tApo;
  const apoS=Math.max(0,Math.round(1000-pct*45)), dep=f.torn?0:f.auto?60:Math.max(0,Math.round(300-Math.abs(dt)*260)), total=apoS+dep;
  const grade=f.tumble?'Cartwheeled':f.torn?'Chute shredded':pct<2?'Bullseye':pct<5?'On target':pct<12?'Close':'Off target';
  const sgn=f.apo>=target?'+':'−';
  const tip=f.tumble?'Under 1 calibre the fins cannot hold the nose into the wind. Bigger fins or nose ballast will fix it.'
    :f.torn?`The chute opened at ${Math.round(f.deployV)} m/s and tore. Wait until the rocket stops climbing.`
    :pct<2?'Within 2% of the target. Landing a design on a number is what Ogive is for.'
    :f.D.stab>2.6&&f.apo<target?'Overstable rockets turn into the wind and lose height. Trim the fins or the ballast.'
    :f.apo<target?`${Math.round(err)} m short. More motor, less ballast, or a longer nose.`
    :`${Math.round(err)} m over. Add ballast, shorten the nose, or step the motor down.`;
  const chuteTxt=f.torn?' The chute timing scored nothing.':f.auto?' The motor opened the chute late.':Math.abs(dt)<.12?' The chute timing was spot on.':'';
  $o('ResEb').textContent=`Flight ${tries} / 3 · target ${target} m`;
  const left=3-tries, again=$o('Again'), nt=$o('NewT');
  again.disabled=left<=0; again.textContent=left>0?`Adjust and fly again · ${left} left`:'No flights left';
  again.classList.toggle('pri',left>0); nt.classList.toggle('pri',left<=0);
  st.result({grade,score:total,assisted:aiMatchF(f),stats:[['Apogee',Math.round(f.apo)+' m'],['Off target',Math.round(err)===0?'0 m':sgn+Math.round(err)+' m'],
    ['Chute',f.torn?'Torn':f.auto?'Auto, late':(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s'],['Max speed',Math.round(f.maxV)+' m/s'],['Peak accel',(f.maxA/9.81).toFixed(1)+' g'],['Stability',f.D.stab.toFixed(2)+' cal']],
    text:tip+(pct<2||f.torn||f.tumble?'':chuteTxt)});
  if(pct<2&&!f.tumble) A.chord(); else if(f.tumble||f.torn) A.buzz(); else A.dock();
  layoutGauge();
}
function aiMatchF(f){ return !!ai&&ai.motor===f.d.motor&&Math.abs(ai.LD-f.d.LD)<.12&&Math.abs(ai.fin-f.d.fin)<.05&&Math.abs(ai.bal-f.d.bal)<.006; }
function newTarget(){ let t; do{ t=Math.round((160+Math.random()*280)/10)*10; }while(t===target); target=t; hist=[]; ai=null; setT($o('Target'),target+' m'); sayEl.textContent=''; el.classList.remove('answered'); syncUI(); layoutGauge(); }
function triesUI(){ setT($o('Tries'),`Flight ${Math.min(3,hist.length+1)} / 3`); }
launchBtn.addEventListener('click',()=>{ if(phase==='design') startArm(); else cancelLaunch(); });
$o('Chute').addEventListener('click',()=>deploy(false));
$o('Again').addEventListener('click',()=>{ if(hist.length>=3) return; curReset(); triesUI(); st.setState('play'); toDesign(); });
$o('NewT').addEventListener('click',()=>{ curReset(); newTarget(); triesUI(); st.setState('play'); toDesign(); });
st.onPointer=()=>{ if(phase==='flight'&&st.state==='play') deploy(false); };
addEventListener('keydown',e=>{
  if(S.stId!=='og'||S.mode!=='station') return;
  if(e.code==='Escape'&&(phase==='arm'||phase==='count')&&st.state==='play'){ e.preventDefault(); e.stopImmediatePropagation(); cancelLaunch(); return; }
  if(e.code!=='Space'||(e.target.closest&&e.target.closest('input,textarea'))) return;
  e.preventDefault(); const a=document.activeElement; if(a&&a!==document.body&&a.blur) a.blur();
  if(e.repeat||st.state!=='play') return;
  if(phase==='design') startArm(); else if(phase==='arm'||phase==='count') cancelLaunch(); else if(phase==='flight') deploy(false);
},true);

/* ---------- lifecycle ---------- */
st.play=function(){ searchId++; busy=false; finishAsk(); F=null; tw=null; d={motor:'G',LD:2.5,fin:1,bal:0}; DC=design(d); rebuild(); newTarget(); triesUI();
  setPhase('design'); W.visible=false; WU.value=0; BP.value=1; stopSound(); slow(false); st.setState('play');
  launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); hN.classList.remove('used'); hF.classList.remove('used'); curReset(); requestAnimationFrame(layoutGauge); };
st.abort=function(){ searchId++; if(busy) finishAsk(); F=null; tw=null; setPhase('design'); W.visible=false; WU.value=0; BP.value=1; chute.visible=cord.visible=false; flame.visible=glow.visible=false; FL.value.w=0;
  stopSound(); slow(false); el.classList.remove('chute-ready','chute-now'); launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); };
st.enter=function(){ st.abort(); st.setState('menu'); syncUI(); snap=true; $o('Best').textContent='Best '+fmt(store.get('og',0)); };
st.exit=function(){ st.abort(); };
st.build=function(){
  rebuild(); syncUI(); st.anchors=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  // compile the night scene now, so the first launch does not stall on shader compiles
  W.visible=true; chute.visible=cord.visible=flame.visible=glow.visible=true; WU.value=1;
  try{ renderer.compile(sc,stCam); }catch(e){}
  W.visible=false; chute.visible=cord.visible=flame.visible=glow.visible=false; WU.value=0;
};

/* ---------- frame ---------- */
st.update=function(dt,t){
  const rd=S.rdt||dt, port=PORT(), menu=st.state==='menu';
  if(menu||phase==='design'){ // title screen and design view: ease toward the pose, the tail anchors the rocket
    const tp=designTarget(t,port,menu,V2);
    if(snap){ pose.tail.copy(V2); pose.pitch=tp; snap=false; } else { pose.tail.lerp(V2,1-Math.exp(-5*rd)); pose.pitch=damp(pose.pitch,tp,5,rd); }
    if(menu) pose.roll+=rd*.32; else pose.roll=damp(pose.roll,Math.round(pose.roll/HP)*HP,6,rd);
    placeByTail(pose.tail,pose.pitch,pose.roll,1);
    rocket.updateMatrixWorld(true);
    if(menu){ const g=DC.g; rkW(0,(g.L-g.Ln*.38)*S6,0,st.anchors[0]); rkW(0,(g.L-DC.cp)*S6,0,st.anchors[1]); rkW(0,g.Cr*.5*S6,0,st.anchors[2]); }
    BP.value=damp(BP.value,1,3,rd); WU.value=0; W.visible=false;
  }
  if(tw){ // arm: design to pad, disarm: back
    tw.t+=rd; const k=E.io(clamp(tw.t/tw.dur,0,1)), kk=tw.arm?k:1-k;
    if(tw.arm){ V2.lerpVectors(twA.c,twB.c,k); V2.y+=Math.sin(k*Math.PI)*.45; placeByCentre(V2,lerp(twA.pitch,twB.pitch,k),lerp(twA.roll,twB.roll,k),lerp(twA.scale,twB.scale,k)); }
    else { const tp=designTarget(t,port,false,V3); pose.tail.copy(V3); pose.pitch=tp; pose.roll=Math.round(twA.roll/HP)*HP;
      axisOf(tp,V1); V2.copy(V3).addScaledVector(V1,Lh); V4.lerpVectors(twA.c,V2,k); V4.y+=Math.sin(k*Math.PI)*.35;
      placeByCentre(V4,lerp(twA.pitch,tp,k),lerp(twA.roll,pose.roll,k),lerp(twA.scale,1,k)); }
    WU.value=sstep(.25,.85,kk); BP.value=1-sstep(0,.45,kk); W.visible=WU.value>.002;
    if(tw.t>=tw.dur){ const arm=tw.arm; tw=null; if(arm) startCount(); else { setPhase('design'); W.visible=false; WU.value=0; } }
  }
  if(phase==='count'){
    cdT-=rd; const n=Math.ceil(cdT);
    if(n!==cdN&&n>0){ cdN=n; setT(cdK,'T minus'); setT(cdNum,String(n)); cdNum.classList.remove('ogtk'); void cdNum.offsetWidth; cdNum.classList.add('ogtk'); A.beep(n===1?990:740); A.tick(); }
    if(cdT<1){ glowU.uI.value=.08+.08*Math.random(); glow.visible=true; rkW(0,-.2,0,NZ); FL.value.set(NZ.x,NZ.y,NZ.z,.12+.1*Math.random()); if(Math.random()<rd*14) sparks.emit(NZ,2,.8,null,-1,.4); }
    if(cdT<=0) ignite();
  }
  if(phase==='flight'&&F) flightStep(dt,rd,t);
  if(phase==='landed'&&F) landedStep(dt,rd,t);
  if(phase!=='flight'&&phase!=='landed') simClock+=rd;
  // shared world state
  smokeU.uNow.value=simClock; if(sDirty){ smokeG.attributes.aP.needsUpdate=smokeG.attributes.aV.needsUpdate=smokeG.attributes.aD.needsUpdate=true; sDirty=false; }
  sparks.update(phase==='flight'?dt*tScale:rd,3.5,1.4);
  bp.material.uniforms.uOp.value=BP.value; bp.visible=BP.value>.01; sky0.material.uniforms.uOp.value=1-WU.value; sky0.visible=WU.value<.99;
  if(W.visible){ const ry=phase==='landed'&&F?F.apo*SCF*.5:rocket.position.y; ladX=damp(ladX,(phase==='flight'||phase==='landed'?rocket.position.x:0)+(PORT()?.65:-2.3),2,rd); lad.position.x=ladX; ladU.uFocus.value=damp(ladU.uFocus.value,ry,4,rd);
    ladU.uLad.value=damp(ladU.uLad.value,(phase==='flight'&&F&&F.t>.5)||(phase==='landed'&&st.state==='res')?1:0,3,rd); const lk=WU.value*ladU.uLad.value;
    for(let i=0;i<ladLabels.length;i++){ const sp=ladLabels[i]; sp.material.opacity=sp.userData.hide?0:lk*(.22+.7*Math.exp(-Math.pow((sp.userData.y-ladU.uFocus.value)/6.5,2))); } tgtLab.material.opacity=lk*.95; tgtTick.material.opacity=lk*.9; lad.visible=lk>.005;
    sock.rotation.y=.12*Math.sin(t*2.3)+.05*Math.sin(t*5.1); sock.rotation.z=-.08+.05*Math.sin(t*3.7);
    for(let i=0;i<PADMAT.length;i++){ const u=PADMAT[i].uniforms; u.uKey.value.set(FL.value.x,Math.max(FL.value.y,.3),FL.value.z+.4); u.uKeyCol.value.setRGB(1,.62,.34).multiplyScalar(.25+Math.min(2.5,FL.value.w*1.4)); } }
  // close up (title and design) the key light is softer so the body shows its shape instead of blooming flat
  rkK=damp(rkK,(menu||phase==='design')?.62:1,3,rd);
  centreOf(RC); for(let i=0;i<RKMAT.length;i++){ const u=RKMAT[i].uniforms; u.uKey.value.set(RC.x+5,RC.y+14,RC.z+20); u.uKeyCol.value.setRGB(1,.902,.8).multiplyScalar(rkK); }
  camStep(t,rd,port,menu);
  if(!domQ){ domQ=true; queueMicrotask(placeDOM); }
};
function flightStep(dt,rd,t){
  const D=F.D;
  // time: slow motion around apogee, a gentle hold on the chute pop, fast forward under the canopy
  let want=1;
  if(!F.chute&&F.t>NAT.tApo-1.15&&F.t<NAT.tApo+1.0) want=.26;
  if(F.chute&&F.t<F.deployT+.4) want=.3;
  if(F.chute&&F.t>F.deployT+2&&!F.landed){ if(ffMax===1) ffMax=clamp((F.h-25)/(Math.max(2.5,-F.vy)*4.5),1,9); want=1+(ffMax-1)*sstep(5,32,F.h); }
  tScale=damp(tScale,want,want<tScale?6:3,rd);
  const sdt=dt*tScale; simClock+=sdt; vT+=rd; // vT: real time, for motion that must not speed up with the fast-forward
  const ph=F.h, px0=F.x; let rem=sdt; while(rem>1e-7){ const h=Math.min(.01,rem); stepF(F,h); rem-=h; }
  if(F.t>240&&!F.landed){ F.h=0; F.landed=true; }
  const th=thrustAt(F.d.motor,F.t), thN=th/(D.M.I/D.M.tb);
  // rocket pose
  let pitch, roll=F.t*1.4;
  if(F.chute){ chuteK=Math.min(1,chuteK+sdt/.55); const sw=.11*Math.sin(vT*1.25)+.035*Math.sin(vT*2.1); pitch=lerp(F.tumble?-F.t*9:-F.th,1.25+sw,E.o(chuteK)); roll=F.deployT*1.4; }
  else pitch=F.tumble?-F.t*9:-F.th;
  rocket.rotation.set(0,roll,pitch); rocket.scale.setScalar(FS); rocket.position.set(F.x*SCF,F.h*SCF+PADY+pivotL*FS,0);
  rocket.updateMatrixWorld(true); rkW(0,-.25,0,NZ);
  // motor: flame, glow, light on the ground and the smoke, sparks
  ign=Math.max(0,ign-sdt*2.2);
  flameU.uI.value=th>0?Math.min(1.25,.35+thN*.7):0; flameU.uLen.value=2.4+thN*2.6; glowU.uI.value=th>0?.3+thN*.45+ign*.6:0; glowU.uS.value=.55+thN*.3+ign*.7;
  flame.visible=th>0; glow.visible=th>0;
  FL.value.set(NZ.x,NZ.y,NZ.z,th>0?thN*1.25+ign*2.6:0);
  groundU.uScorch.value=Math.min(1,groundU.uScorch.value+sdt*2);
  if(th>0){ emitAcc+=sdt*(95*Q+30); const n=Math.floor(emitAcc); emitAcc-=n; axisOf(rocket.rotation.z,V1);
    for(let k=0;k<n;k++){ const f=(k+1)/n; V2.set(lerp(px0,F.x,f)*SCF,lerp(ph,F.h,f)*SCF+PADY+pivotL*FS,0).addScaledVector(V1,-pivotL*FS-.06);
      const bl=F.h<4?1:0; puff(V2.x+gauss()*.03,V2.y,V2.z+gauss()*.03,-V1.x*1.4+gauss()*.3,-V1.y*1.4+gauss()*.2,gauss()*.3,bl,.13+Math.random()*.1+bl*.12); }
    if(F.h<3&&Math.random()<sdt*18){ const a=Math.random()*TAU, s=1.4+Math.random()*1.6; puff(Math.cos(a)*.3,.08,Math.sin(a)*.3,Math.cos(a)*s,.12,Math.sin(a)*s,1,.3+Math.random()*.2); }
    sparks.emit(NZ,Math.ceil(5*Q*thN+1),1.1,null,-5,.5); }
  else if(!F.chute&&F.lifted){ emitAcc+=sdt*(22*Q+8); const n=Math.floor(emitAcc); emitAcc-=n; for(let k=0;k<n;k++) puff(NZ.x,NZ.y,NZ.z,gauss()*.05,gauss()*.05,gauss()*.05,2,.09+Math.random()*.06); }
  cloudU.uDrift.value+=sdt*.45;
  // path dots
  pathAcc+=sdt; if(pathAcc>=.08&&pathN<NPATH&&F.lifted){ pathAcc=0; centreOf(V2); pathP[pathN*3]=V2.x; pathP[pathN*3+1]=V2.y; pathP[pathN*3+2]=V2.z; pathN++; pathG.setDrawRange(0,pathN); pathG.attributes.position.needsUpdate=true; }
  // events
  if(F.lifted&&!ev.lift){ ev.lift=true; }
  if(F.h>50&&!ev.deck){ ev.deck=true; A.whoosh(true,.9,.09); }
  if(F.t>=D.M.tb&&!ev.burn){ ev.burn=true; cap('Burnout','Coasting up. Open the chute at the top'); A.thrust(0); }
  const win=!F.chute&&F.t>NAT.tApo-1.15&&F.t<NAT.tApo+1.05;
  if(win!==!!ev.win){ ev.win=win; el.classList.toggle('chute-now',win); if(win){ el.classList.add('chute-ready'); A.ping(880,.03); } }
  slow(tScale<.7&&!F.landed);
  if(F.apo>0&&!ev.apo){ ev.apo=true; const pc=Math.abs(F.apo-target)/target; tgtU.uHit.value=pc<.05?1:0;
    apoLab.position.set(F.xApo*SCF+.45,F.apo*SCF+.1,0); const er=Math.round(Math.abs(F.apo-target)); drawLabel(apoLab,Math.round(F.apo)+' m  '+(er===0?'on target':(F.apo>=target?'+':'−')+er),pc<.05?'#FFB475':'#EEE9DF',36); apoLab.material.opacity=.95;
    if(pc<.02){ A.chime(14); A.chime(17,.1); } }
  if(!F.chute&&F.apo>0&&F.t>F.tApo+2.2) deploy(true);
  maxH=Math.max(maxH,F.h);
  tgtU.uNear.value=damp(tgtU.uNear.value,Math.abs(F.h-target)<target*.08?1:0,4,rd); tgtU.uHit.value=damp(tgtU.uHit.value,0,.9,rd);
  // canopy: inflate with a little overshoot, breathe, sway with the wind
  if(F.chute){ centreOf(RC); axisOf(rocket.rotation.z,V1); V2.copy(RC).addScaledVector(V1,(Lh*.25)*FS);
    V3.set(V2.x+.25,V2.y+1.0,0); if(chuteK<.05) chP.copy(V2); chP.lerp(V3,1-Math.exp(-7*sdt));
    const k=chuteK, o=k<1?1-Math.pow(1-k,3)*Math.cos(k*7):1, br=Math.sin(vT*2.4)*(F.torn?.16:.025);
    canopy.scale.set(lerp(.1,F.torn?.45:1,o)*(1+br),lerp(1.7,F.torn?.8:1,o)*(1-br*.8),lerp(.1,F.torn?.3:1,o)*(1+br));
    chute.position.copy(chP); chute.rotation.set(.04*Math.sin(vT*.9),vT*.14,-.1-.05*Math.sin(vT*1.25+.6)); chute.scale.setScalar(.95);
    cordP[0]=chP.x; cordP[1]=chP.y; cordP[2]=chP.z; cordP[3]=V2.x; cordP[4]=V2.y; cordP[5]=V2.z; cordG.attributes.position.needsUpdate=true; }
  // sound
  const air=Math.hypot(F.vx-WIND,F.vy);
  A.roar(th>0?Math.min(1.1,thN*.8+ign*.3):0); A.thrust(th>0?thN*.8:0); A.wind(Math.min(.24,air/420)*(tScale<.5?.4:1)); A.hiss(!F.chute&&F.lifted&&th<=0?.25:0);
  // read-outs
  setT(altEl,String(Math.round(F.h))); setT(vEl,(F.vy>=0?'+':'−')+Math.abs(F.vy).toFixed(1)+' m/s'); setT(tEl,'T+ '+F.t.toFixed(1)+' s');
  setT(xEl,tScale<.7?'Slow motion':tScale>1.6?'Descent ×'+Math.round(tScale):'');
  gL.style.transform=`translateY(${gy(F.h).toFixed(1)}px)`; gM.style.transform=`translateY(${gy(maxH).toFixed(1)}px)`;
  if(F.landed) landing();
}
function landedStep(dt,rd,t){
  landT+=rd; simClock+=rd;
  // the rocket tips over onto its fins, the canopy settles downwind
  const k=E.io(clamp(landT/.7,0,1)), side=L0.rz>=0?1:-1;
  rocket.rotation.z=lerp(L0.rz,side*HP*.97,k); rocket.position.y=lerp(L0.py,.17,k);
  if(chute.visible){ const c=E.io(clamp(landT/1.5,0,1)); chP.x=L0.cx+c*.9; chP.y=lerp(L0.cy,.05,c); chute.position.copy(chP);
    canopy.scale.set(lerp(L0.sx,1.12,c),lerp(L0.sy,.1,c),lerp(L0.sx,1.12,c)); chute.rotation.set(0,chute.rotation.y,lerp(-.12,0,c));
    centreOf(RC); cordP[0]=chP.x; cordP[1]=chP.y; cordP[2]=chP.z; cordP[3]=RC.x; cordP[4]=RC.y; cordP[5]=RC.z; cordG.attributes.position.needsUpdate=true; }
  FL.value.w=0; flame.visible=glow.visible=false; canU.uOn.value=damp(canU.uOn.value,.55,1.5,rd);
  tgtU.uHit.value=damp(tgtU.uHit.value,0,.9,rd);
  if(st.state==='res') pathU.uRes.value=damp(pathU.uRes.value,1,2,rd);
  if(landT>1.7&&!done) finish();
}

/* ---------- camera ---------- */
function camDesign(o,l,port,menu,t){
  if(menu){ if(port){ o.set(.35,DY+1.0,17.6); l.set(.35,DY+.22,0); } else { o.set(.62+Math.sin(t*.15)*.25,DY+.2,13.2); l.set(.62,DY-.22,0); } }
  else { if(port){ o.set(.06,DY-.2,18.6); l.set(.06,DY-.62,0); } else if(innerHeight<520){ o.set(.1,DY+.2,8.6); l.set(.1,DY-.62,0); } else { o.set(-.05,DY+.4,9.1); l.set(-.05,DY-.32,0); } } }
function camPad(o,l,port){ if(port){ o.set(1.5,.85,8.6); l.set(.05,1.45,0); } else { o.set(2.5,.68,6.6); l.set(.1,1.18,0); } }
function camStep(t,rd,port,menu){
  if(menu||phase==='design'){ camDesign(CP,CL,port,menu,t); }
  else if(tw){ const k=E.io(clamp(tw.t/tw.dur,0,1)), kk=tw.arm?k:1-k; camDesign(CA,CB,port,false,t); camPad(CC,CD,port);
    if(!tw.arm&&tw.from){ CC.copy(tw.from); CD.copy(tw.fromL); }
    CP.lerpVectors(CA,CC,kk); CL.lerpVectors(CB,CD,kk); }
  else if(phase==='count'){ camPad(CP,CL,port); const k=1-clamp(cdT/3,0,1); CP.z-=k*.35; CP.x-=k*.12; }
  else if(phase==='flight'&&F){
    const rp=rocket.position, spd=Math.hypot(F.vx,F.vy), ts=tScale;
    CA.set(rp.x+1.75,rp.y-1.25,(port?9.6:7.4)+Math.min(4,spd*.03)); CB.set(rp.x+.1,rp.y+.95,0);
    const hold=1-sstep(.55,1.5,F.t); camPad(CC,CD,port); CA.lerp(CC,hold); CB.x=lerp(CB.x,CD.x,hold); CB.y=lerp(CB.y,Math.max(CD.y,rp.y+.4),hold);
    const ka=NAT?sstep(NAT.tApo-2.8,NAT.tApo-1.3,F.t):0, out=F.chute?sstep(F.deployT+.9,F.deployT+3,F.t):0;
    const ty=target*SCF, dy=clamp(ty-rp.y,-3,3);
    CC.set(rp.x+1.3,rp.y-.35+dy*.25,port?13.6:10.6); CD.set(rp.x+.15,rp.y+.25+dy*.4,0); CA.lerp(CC,ka*(1-out)); CB.lerp(CD,ka*(1-out));
    if(F.chute){ // frame the canopy and the rocket together; in portrait, keep them clear of the HUD column on the left
      const my=(rp.y+chP.y+1.5)*.5, mx=(rp.x+chP.x)*.5-(port?.55:0), kc=E.o(chuteK); CA.x=lerp(CA.x,mx+1.4,kc); CB.x=lerp(CB.x,mx,kc); CA.y=lerp(CA.y,my-.6,kc); CB.y=lerp(CB.y,my,kc); CA.z=lerp(CA.z,port?14.5:11.5,kc);
      CC.set(mx+2.5,Math.max(my-1.6,.7),port?15:12); CD.set(mx,my,0); CA.lerp(CC,out); CB.lerp(CD,out); }
    const vx=F.vx*SCF*ts, vy=F.vy*SCF*ts; CA.x+=vx/4; CA.y+=vy/4; CB.x+=vx/5; CB.y+=vy/5; CA.y=Math.max(CA.y,.45);
    CP.copy(CA); CL.copy(CB);
  }
  else if(phase==='landed'&&F){
    if(st.state==='res'){ const xa=F.xApo*SCF, xl=F.x*SCF, x0=Math.min(0,xa,xl)-2, x1=Math.max(0,xa,xl)+2, top=Math.max(F.apo,target)*SCF+2.5, tn=Math.tan(18*Math.PI/180);
      const dist=Math.max(top*1.2/(2*tn),(x1-x0)*1.1/(2*tn*innerWidth/innerHeight))+2; CP.set((x0+x1)/2+dist*.14+Math.sin(t*.08)*2,top*.42,dist); CL.set((x0+x1)/2,top*.5,0); }
    else { const lx=rocket.position.x, a=.55+Math.sin(t*.2)*.12, R=port?9:7.4; CP.set(lx+Math.sin(a)*R,port?1.9:1.55,Math.cos(a)*R); CL.set(lx,.55,0); }
  }
  st.camP.copy(CP); st.camL.copy(CL);
}

/* ---------- DOM overlays, placed after the frame renders so they match the camera exactly ---------- */
let domQ=false, orient='', ringLate=false;
function tf(e,x,y){ e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
function tfc(e,x,y){ e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; }
function seg(e,x0,y0,x1,y1){ const dx=x1-x0, dy=y1-y0; e.style.transform=`translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) rotate(${Math.atan2(dy,dx).toFixed(4)}rad) scaleX(${(Math.hypot(dx,dy)/100).toFixed(4)})`; }
function placeDOM(){
  domQ=false;
  if(st.state==='menu'){ notesUpdate(st); return; }
  if(st.state!=='play') return;
  if(phase==='design') placeDesign();
  if(phase==='flight'&&ev.win&&F){ centreOf(RC); pj(RC,P0); tf(ring,P0.x,P0.y); const dtA=NAT.tApo-F.t, late=dtA<0;
    ringO.style.transform=`scale(${late?Math.max(.15,1+dtA*.9).toFixed(3):(1+dtA*2.4).toFixed(3)})`; if(late!==ringLate){ ringLate=late; ring.classList.toggle('late',late); } }
}
function placeDesign(){
  rocket.updateMatrixWorld(true); const g=DC.g, Ls=g.L*S6;
  const tl=pj(rkW(0,0,0,V2),P0), no=pj(rkW(0,Ls,0,V2),P1);
  let ax=no.x-tl.x, ay=no.y-tl.y; const al=Math.hypot(ax,ay)||1; ax/=al; ay/=al; AX.x=ax; AX.y=ay;
  const vert=Math.abs(ay)>Math.abs(ax); let nx=-ay, ny=ax; if(vert?nx>0:ny<0){ nx=-nx; ny=-ny; }
  // the four fin tips: the deepest one on the rail side sets the rail offset, the furthest on the other side carries the handle
  const r=(R0*.96+g.s)*S6, ty=(g.Cr-g.Xr)*S6; let ext=0, best=1e9;
  for(let k=0;k<4;k++){ const a=k*HP; pj(rkW(Math.cos(a)*r,ty,Math.sin(a)*r,V2),P2); const s=(P2.x-tl.x)*nx+(P2.y-tl.y)*ny; ext=Math.max(ext,s); if(s<best){ best=s; P3.x=P2.x; P3.y=P2.y; } }
  FO.x=-nx; FO.y=-ny;
  const off=ext+30, cg=pj(rkW(0,(g.L-DC.cg)*S6,0,V2),P4), cp=pj(rkW(0,(g.L-DC.cp)*S6,0,V2),P5);
  const re=vert?.55:1; seg(rail,tl.x+nx*off,tl.y+ny*off,lerp(tl.x,no.x,re)+nx*off,lerp(tl.y,no.y,re)+ny*off);
  const gx=cg.x+nx*off, gyy=cg.y+ny*off, cx=cp.x+nx*off, cy=cp.y+ny*off;
  seg(drCG,cg.x,cg.y,gx,gyy); seg(drCP,cp.x,cp.y,cx,cy); seg(dim,gx,gyy,cx,cy);
  tf(mCG,gx,gyy); tf(mCP,cx,cy);
  const sep=(gx-cx)*ax+(gyy-cy)*ay, sp=Math.abs(sep)<34?(sep>=0?1:-1)*(17-Math.abs(sep)/2):0; // when the markers crowd, each label steps away from the other
  tfc(lCG,gx+nx*22+ax*sp,gyy+ny*22+ay*sp); tfc(lCP,cx+nx*22-ax*sp,cy+ny*22-ay*sp);
  tfc(stabL,(gx+cx)/2+nx*(vert?70:52),(gyy+cy)/2+ny*(vert?70:52));
  tf(hN,no.x+ax*14,no.y+ay*14); tf(hF,P3.x,P3.y);
  const o=vert?'v':'h'; if(o!==orient){ orient=o; hN.classList.toggle('vert',vert); hF.classList.toggle('vert',!vert); hF.classList.toggle('lbl-u',!vert); }
}

/* test hooks for the playtest harness */
st.dbg={ get phase(){return phase}, get F(){return F}, get NAT(){return NAT}, get tScale(){return tScale}, get d(){return d}, get target(){return target}, set target(v){ target=v; setT($o('Target'),v+' m'); layoutGauge(); },
  set(dd){ Object.assign(d,dd); designChanged(); return DC.stab; },
  snap(){ snap=true; S.stSnap=true; },
  ff(sec){ const r=S.rdt; S.rdt=.05; for(let i=0,n=Math.round(sec/.05);i<n;i++){ S.t+=.05; st.update(.05,S.t); } S.rdt=r; S.stSnap=true; },
  until(fn,max=4000){ const r=S.rdt; S.rdt=.05; let i=0; for(;i<max&&!fn(st.dbg);i++){ S.t+=.05; st.update(.05,S.t); } S.rdt=r; S.stSnap=true; return i; } };
})();

/* ===== station cr ===== */
/* ================= CREW =================
   Three portraits drawn as a dot matrix that resolves into the photograph in focus. The page opens on Ahroon (01),
   resolved and named; then focus follows the pointer, a tap, Tab or the arrow keys. Clicking the focused portrait, a
   second tap on touch, or a name tag opens that person's LinkedIn in a new tab. */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,1,6)});
const sc=st.scene, el=st.el, tagWrap=$('#tags'), tags=$$('#tags .tag'), people=[], meshes=[], hits=[], N=3, PH=1.3;
let lmx=-1, lmy=-1, focus=0, armed=false, moved=false, enterT=performance.now(), nar=false, cardB=240, glow=null, mx0=0, my0=0, hov=-1;
const L={D:10.2,wpp:.01}, FACE=new T.Vector2(.5,.8), hitUv=new T.Vector2(), _p=new T.Vector3(), ray=new T.Raycaster(), ndc=new T.Vector2();
const vert=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
/* a printed halftone that becomes the photograph. Fine round dots on a rotated grid, sized by brightness and
   antialiased. In focus the dots swell from where you pointed until they merge, carrying the photograph itself, so
   the hand-over is seamless. A thin warm rim light finds the silhouette; the base fades out instead of cutting off. */
const frag=`uniform sampler2D tP; uniform float uOn,uF,uSeed,uCells,uLo,uHi,uDim; uniform vec2 uM,uO; uniform vec3 uInk,uHot; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uSeed)*43758.5453); }
  float lum(vec3 c){ return dot(c,vec3(.3,.59,.11)); }
  void main(){
    const float ANG=.2618; mat2 R=mat2(cos(ANG),-sin(ANG),sin(ANG),cos(ANG)), Ri=mat2(cos(ANG),sin(ANG),-sin(ANG),cos(ANG));
    vec2 asp=vec2(1.,1.3), q=R*(vUv*asp)*uCells, id=floor(q), f=fract(q)-.5, cu=(Ri*((id+.5)/uCells))/asp;
    vec4 cs=texture2D(tP,clamp(cu,0.,1.)); float l=pow(clamp((lum(cs.rgb)-uLo)/max(.02,uHi-uLo),0.,1.),.8), n=h(id);
    float lit=step(n,uOn*1.15-.1);
    // reveal: spreads from the pointed spot, a little ragged so it reads as dots arriving, not a wipe
    float d=length((cu-uO)*asp), rv=clamp((uF*2.1-d*1.3-n*.22)*2.2,0.,1.);
    float near=smoothstep(.22,0.,length((cu-uM)*asp))*(1.-rv);
    float r=sqrt(l)*.5*(.35+.65*lit)+near*.08;      // area follows brightness, like ink on paper
    r=mix(r,.76,smoothstep(0.,1.,rv));               // in focus the dots swell until they overlap
    float dist=length(f), aa=max(fwidth(dist),.02);
    float dotm=(1.-smoothstep(r-aa,r+aa,dist))*step(.002,cs.a)*lit;
    vec4 ph=texture2D(tP,vUv); float pa=ph.a;
    vec3 photo=mix(vec3(lum(ph.rgb)),ph.rgb,.82); photo=pow(photo,vec3(1.05))*vec3(1.02,1.,.97);
    float pr=smoothstep(.55,1.,rv);
    vec3 ink=uInk*(.32+.6*l)*uDim;
    vec3 c=mix(ink,photo,smoothstep(.15,.9,rv));      // the dots carry the photograph as they grow
    float a=mix(dotm*cs.a,pa,pr);
    // a hairline of warm light from the upper right on the person in focus
    float a2=texture2D(tP,vUv+vec2(.0045,.003)).a; float rim=clamp(pa-a2,0.,1.)*pr;
    c+=uHot*rim*.85;
    // the base dissolves instead of ending in a hard cut
    float base=smoothstep(.0,.2,vUv.y); a*=base;
    gl_FragColor=vec4(c*a,a); }`;
/* per photo levels in linear light, so a dark jumper and a white one both draw a full dot pattern */
function levels(img){
  try{ const w=60, h=78, c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,w,h);
    const d=x.getImageData(0,0,w,h).data, v=[], lin=u=>Math.pow((u/255+.055)/1.055,2.4);
    for(let i=0;i<d.length;i+=4) if(d[i+3]>140) v.push(lin(d[i])*.3+lin(d[i+1])*.59+lin(d[i+2])*.11);
    if(v.length<50) return [0,1]; v.sort((a,b)=>a-b); return [v[Math.floor(v.length*.04)],Math.max(v[Math.floor(v.length*.97)],v[Math.floor(v.length*.04)]+.08)];
  }catch(e){ return [0,1]; }
}
st.build=async function(){
  const loader=new T.TextureLoader(), PG=new T.PlaneGeometry(1,PH);
  const texs=await Promise.all(PHOTOS.map(src=>new Promise(res=>loader.load(src,t=>{ t.colorSpace=T.SRGBColorSpace; t.minFilter=T.LinearFilter; t.generateMipmaps=false; res(t); },undefined,()=>res(null)))));
  texs.forEach((tx,k)=>{ const lv=tx?levels(tx.image):[0,1];
    const u={tP:{value:tx},uOn:{value:0},uF:{value:0},uSeed:{value:k*7.3},uCells:{value:44},uLo:{value:lv[0]},uHi:{value:lv[1]},uDim:{value:1},
      uM:{value:new T.Vector2(9,9)},uO:{value:FACE.clone()},uInk:{value:new T.Color('#EEE9DF')},uHot:{value:new T.Color('#FFB477')}};
    const m=new T.Mesh(PG,new T.ShaderMaterial({uniforms:u,vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:false,premultipliedAlpha:true,
      blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor}));
    m.visible=!!tx; sc.add(m); meshes.push(m); people.push({m,u,f:0,fz:0,on:0,x:0,y:0,z:0,s:1,tx:0,ty:0,ts:1,cells:44}); });
  // a faint warm light behind whoever is in focus, kept low so the photograph does the work
  glow=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({uniforms:{uOp:{value:0},uC:{value:new T.Color('#FFE2C4')}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:vert,fragmentShader:`uniform float uOp; uniform vec3 uC; varying vec2 vUv; void main(){ float r=length((vUv-.5)*vec2(1.,1.12))*2.; gl_FragColor=vec4(uC*pow(max(0.,1.-r),2.4)*uOp,1.); }`}));
  glow.position.z=-1.4; glow.renderOrder=-1; sc.add(glow);
  $('#crLede').textContent=FINE?'Point at someone to see them properly.':'Tap someone to see them. Tap again for LinkedIn.';
  measure(); layout(); people.forEach(p=>{ p.x=p.tx; p.y=p.ty; p.s=p.ts; });
};

/* ---------- layout from the viewport: a row on wide screens, a column with the focused person larger on phones ---------- */
function measure(){ const r=$('.card',el).getBoundingClientRect(); cardB=r.bottom>0?r.bottom:(NARROW()?230:250); const n=NARROW(); if(n!==nar){ nar=n; tagWrap.classList.toggle('nar',nar); } }
function layout(){
  const W=innerWidth, H=innerHeight, D=nar?16:10.2, wpp=2*D*Math.tan(18*Math.PI/180)/H; L.D=D; L.wpp=wpp;
  if(!nar){ const top=cardB+30, bot=H-(H<720?140:172), hgt=clamp(bot-top,200,480), w=hgt/PH, gap=Math.max(w*1.1,Math.min(W*.28,w*1.26));
    people.forEach((p,k)=>{ const cx=W/2+(k-1)*gap, cy=top+hgt/2; p.tx=(cx-W/2)*wpp; p.ty=-(cy-H/2)*wpp; p.ts=w*wpp; p.cells=clamp(Math.round(w/4.1),40,96); }); }
  else { const top=cardB+14, bot=H-24, av=bot-top, fh=av*.44, oh=(av-fh)/2; let y=top;
    people.forEach((p,k)=>{ const rh=k===focus?fh:oh, ph=rh-12, w=ph/PH, cx=22+w/2, cy=y+rh/2; y+=rh; p.tx=(cx-W/2)*wpp; p.ty=-(cy-H/2)*wpp; p.ts=w*wpp; p.cells=clamp(Math.round((oh-12)/PH/3.6),26,60); }); }
}
window.__crLayout=()=>{ measure(); layout(); };

/* ---------- focus ---------- */
function setFocus(k,uv){
  if(k<0||k>=people.length||k===focus) return;
  focus=k; people[k].u.uO.value.copy(uv||FACE); A.tick(); A.chime(5+k*2,0,.028);
  tags.forEach((t,i)=>{ t.classList.toggle('f',i===k); t.classList.toggle('dim',i!==k); });
}
function hitAt(cx,cy){ ndc.set(cx/innerWidth*2-1,-(cy/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); hits.length=0; ray.intersectObjects(meshes,false,hits);
  for(const h of hits){ if(!h.uv) continue; const k=meshes.indexOf(h.object); const tx=people[k].u.tP.value; if(tx&&alphaAt(k,h.uv)<.2) continue; hitUv.copy(h.uv); return k; } return -1; }
// only the person counts, not the empty corners of the frame
const ALPHA=[];
function alphaAt(k,uv){ const a=ALPHA[k]; if(!a){ try{ const img=people[k].u.tP.value.image, c=document.createElement('canvas'); c.width=36; c.height=47; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,36,47); ALPHA[k]=x.getImageData(0,0,36,47).data; }catch(e){ ALPHA[k]=new Uint8ClampedArray(36*47*4).fill(255); } return alphaAt(k,uv); }
  const i=Math.min(35,Math.max(0,(uv.x*36)|0)), j=Math.min(46,Math.max(0,((1-uv.y)*47)|0)); let m=0; for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ const ii=clamp(i+dx,0,35), jj=clamp(j+dy,0,46); m=Math.max(m,a[(jj*36+ii)*4+3]); } return m/255; }
// over a portrait the site cursor grows and says what a click does; only touch the cursor when this state changes
let curOn=false; const curEl=$('#cur'), curTx=$('#curT');
function cursorBig(on){ if(!curEl) return; if(on){ if(!curEl.classList.contains('big')){ curTx.textContent='Profile'; curEl.classList.add('big'); } } else if(curOn) curEl.classList.remove('big'); curOn=on; }
function open(k){ const t=tags[k]; if(!t) return; A.ping(1318,.04); try{ window.open(t.href,'_blank','noopener'); }catch(e){} }
st.onPointer=function(e){ const k=hitAt(e.clientX,e.clientY); armed=k>=0&&k===focus; if(k>=0&&k!==focus){ moved=true; setFocus(k,hitUv); } };
canvas.addEventListener('click',e=>{ if(S.mode!=='station'||S.st!==st) return; const k=hitAt(e.clientX,e.clientY); if(k>=0&&armed&&k===focus) open(k); armed=false; });
addEventListener('pointermove',e=>{ if(S.st!==st||e.pointerType!=='mouse'||moved) return; if(Math.hypot(e.clientX-mx0,e.clientY-my0)>8) moved=true; },{passive:true});
tags.forEach((t,k)=>{ t.addEventListener('pointerenter',e=>{ // a tag that slides under a still pointer as the page opens does not count: Ahroon stays first
  if(e.pointerType==='mouse'&&(moved||Math.hypot(e.clientX-mx0,e.clientY-my0)>8)){ moved=true; setFocus(k); } }); t.addEventListener('focus',()=>setFocus(k));
  t.addEventListener('click',()=>{ moved=true; setFocus(k); A.ping(1318,.04); }); });
addEventListener('keydown',e=>{ if(S.mode!=='station'||S.st!==st||e.target.closest&&e.target.closest('input,textarea')) return;
  const d=e.code==='ArrowRight'||e.code==='ArrowDown'?1:e.code==='ArrowLeft'||e.code==='ArrowUp'?-1:0; if(!d) return; e.preventDefault(); moved=true;
  const k=(focus+d+N)%N; setFocus(k); tags[k].focus({preventScroll:true}); });
st.start=()=>{ if(tags[focus]) tags[focus].focus({preventScroll:true}); };

st.enter=function(){
  focus=0; armed=false; moved=false; mx0=mouse.x; my0=mouse.y; enterT=performance.now(); hov=-1;
  tags.forEach((t,i)=>{ t.classList.toggle('f',i===0); t.classList.toggle('dim',i!==0); });
  people.forEach(p=>{ p.f=0; p.fz=0; p.on=0; p.u.uOn.value=0; p.u.uF.value=0; p.u.uO.value.copy(FACE); });
  measure(); layout(); people.forEach(p=>{ p.x=p.tx; p.y=p.ty; p.s=p.ts; });
  st.setState('menu'); tagWrap.classList.remove('in'); void tagWrap.offsetWidth; tagWrap.classList.add('in');
  $$('#tags .pw').forEach(p=>{ p.classList.remove('off'); p.classList.add('on'); });
};
st.exit=function(){ cursorBig(false); tagWrap.classList.remove('in'); $$('#tags .pw').forEach(p=>{ p.classList.remove('on'); p.classList.add('off'); }); };
addEventListener('resize',()=>{ if(S.st===st){ measure(); layout(); } });

/* ---------- per frame ---------- */
st.update=function(dt,t){
  if(!people.length) return;
  const age=(performance.now()-enterT)/1000, fine=FINE&&mouse.on&&moved;
  if(fine){ if(mouse.x!==lmx||mouse.y!==lmy){ lmx=mouse.x; lmy=mouse.y; const k=hitAt(mouse.x,mouse.y); hov=k; if(k>=0){ setFocus(k,hitUv); people[k].u.uM.value.copy(hitUv); } } } else hov=-1;
  cursorBig(hov>=0&&FINE);
  if(nar) layout();
  for(let k=0;k<people.length;k++){ const p=people[k], isF=k===focus, u=p.u;
    p.x=damp(p.x,p.tx,7,dt); p.y=damp(p.y,p.ty,7,dt); p.s=damp(p.s,p.ts,7,dt); p.fz=damp(p.fz,isF?1:0,5,dt);
    p.f=damp(p.f,isF?1:0,isF?2.6:4.2,dt); if(k===0&&focus===0&&!moved&&age<2.6) p.f=Math.max(p.f,E.io(clamp((age-.5)/.85,0,1)));
    p.on=E.o(clamp((age-.08-k*.14)/1.1,0,1));
    const m=p.m, s=p.s*(1+.05*p.fz); m.position.set(p.x,p.y,(nar?.3:.45)*p.fz-(isF?0:.15)); m.scale.set(s,s,1);
    m.rotation.y=(fine?mouse.nx:Math.sin(t*.25+k*2.1)*.35)*.09; m.rotation.x=(fine?-mouse.ny:Math.sin(t*.2+k)*.2)*.05;
    u.uOn.value=p.on; u.uF.value=p.f; u.uDim.value=damp(u.uDim.value,isF?1:.62,4,dt); u.uCells.value=p.cells; if(hov!==k) u.uM.value.set(9,9); }
  const fp=people[focus]; glow.position.x=damp(glow.position.x,fp.x,5,dt); glow.position.y=damp(glow.position.y,fp.y,5,dt);
  const gs=fp.s*2.2; glow.scale.set(gs,gs*1.3,1); glow.material.uniforms.uOp.value=.05*Math.min(1,age/1.2);
  // parallax: the camera leans with the pointer; on touch it breathes
  const px=fine?mouse.nx*.34:Math.sin(t*.13)*.07, py=fine?mouse.ny*.18:Math.cos(t*.11)*.05;
  st.camP.set(px,py,L.D); st.camL.set(px*.25,py*.25,0);
  // name tags follow their portraits
  for(let k=0;k<people.length;k++){ const m=people[k].m, hs=m.scale.x;
    if(!nar) _p.set(m.position.x,m.position.y-hs*PH/2-.1,m.position.z); else _p.set(m.position.x+hs*.5+.12,m.position.y,m.position.z);
    _p.project(stCam); const x=(_p.x*.5+.5)*innerWidth, y=(-_p.y*.5+.5)*innerHeight;
    tags[k].style.transform=nar?`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(0,-50%)`:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,0)`; }
};
st._dbg={get focus(){return focus;},get moved(){return moved;},people:()=>people.map(p=>({f:+p.f.toFixed(3),on:+p.on.toFixed(3),x:+p.m.position.x.toFixed(2),y:+p.m.position.y.toFixed(2),s:+p.m.scale.x.toFixed(2),cells:p.cells})),
  screen:k=>{ const m=people[k].m; _p.set(m.position.x,m.position.y+m.scale.y*.15,m.position.z).project(stCam); return {x:(_p.x*.5+.5)*innerWidth,y:(-_p.y*.5+.5)*innerHeight}; }};
})();

/* ===== station be ===== */
/* ================= BEACON =================
   A radio mast drawn in hairlines with a lamp on top. Typing charges the signal: pulses climb the mast, rings leave the
   lamp and the waveform wakes up. Transmit fires the beam. On the public site the signal goes out as a prefilled email;
   inside a claude.ai artifact it is written to a shared database and joins the orbit around the beacon. */
(()=>{
const st=mkStation('be',{arrive:new T.Vector3(1.5,2,7)});
const sc=st.scene, el=st.el, NR=8, LAMP=new T.Vector3(), _m=new T.Vector3(), _h=new T.Vector3(), pl=new T.Plane(new T.Vector3(0,0,1),0), ray=new T.Raycaster();
let E=0, ready=false, deny=0, u, tower, burst, pulses=new T.Vector4(-1,-1,-1,-1), pi=0, ri=0, idleT=0, pct=-1, lvl='';
const lay={D:14,wpp:.01,x:3.6,y:-4,h:6,nar:false};

/* ---------- the mast: a triangular lattice, X-braced, guyed, with a spire ---------- */
function mastGeo(){
  const P=[], Yv=[], K=[], seg=18, rb=.1, rt=.02, top=.9;
  const cn=(y,i)=>{ const r=lerp(rb,rt,Math.pow(y/top,.75)), a=i/3*TAU+Math.PI/2; return [Math.cos(a)*r,y,Math.sin(a)*r]; };
  const Ln=(a,b,k)=>{ P.push(a[0],a[1],a[2],b[0],b[1],b[2]); Yv.push(a[1],b[1]); K.push(k,k); };
  for(let s=0;s<seg;s++){ const y0=s/seg*top, y1=(s+1)/seg*top;
    for(let i=0;i<3;i++){ const a0=cn(y0,i), a1=cn(y1,i), b0=cn(y0,(i+1)%3), b1=cn(y1,(i+1)%3); Ln(a0,a1,1); Ln(a0,b0,.8); Ln(a0,b1,.55); Ln(b0,a1,.55); } }
  for(let i=0;i<3;i++) Ln(cn(top,i),cn(top,(i+1)%3),1);
  Ln([0,top,0],[0,1,0],1);
  for(const y of [.62,.78]) for(let i=0;i<3;i++){ const c=cn(y,i); Ln(c,[c[0]*2.6,y,c[2]*2.6],.7); }
  for(const h of [.3,.56,.8]) for(let i=0;i<3;i++){ const a=i/3*TAU+Math.PI/2+.25, R=h*.3+.09; Ln(cn(h,i),[Math.cos(a)*R,0,Math.sin(a)*R],.22); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aY',new T.Float32BufferAttribute(Yv,1)); g.setAttribute('aK',new T.Float32BufferAttribute(K,1));
  g.boundingSphere=new T.Sphere(new T.Vector3(0,.5,0),2); return g;
}
st.build=function(){
  u={uM3:{value:new T.Vector3(0,0,0)},uE:{value:0},uFire:{value:0},uFireT:{value:-99},uCount:{value:RT.signals||0},uLamp:{value:LAMP},uH:{value:6},uPulse:{value:pulses},
    uRg:{value:[...Array(NR)].map(()=>new T.Vector4(-99,0,0,1))}};
  // a slow warm field of particles around the mast, drawn toward the pointer
  sc.add(pts(cloud(Math.floor(9000*Q+2600),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),rr=.15+Math.cbrt(r[2])*.85;o[0]=Math.sin(b)*Math.cos(a)*rr*1.6;o[1]=Math.cos(b)*rr*1.1;o[2]=Math.sin(b)*Math.sin(a)*rr*.7;}),
    PM({size:.03,color:'#FF8100',uniforms:u,decl:'uniform vec3 uM3,uLamp; uniform float uE,uFire,uH;',body:`
      p=uLamp+vec3(position.x,position.y-.15,position.z)*uH*1.15;
      p+=vec3(sin(uTime*.31+p.y*.5+aR.x*6.),cos(uTime*.27+p.x*.4+aR.y*6.),sin(uTime*.22+p.z*.6+aR.z*6.))*.35*uH/6.;
      vec3 d=uM3-p; float l=length(d)+.001, pull=exp(-l*.35); vec3 tg=normalize(cross(d,vec3(0.,0.,1.))+.0001); p+=d*pull*.6+tg*pull*1.2*(.6+aR.z);
      float rl=length(p-uLamp); p+=normalize(p-uLamp+.001)*uFire*1.4*exp(-rl*.25);
      b=(.1+.12*uE+pull*.9+uFire*.5*exp(-rl*.3))*smoothstep(uH*1.4,uH*.2,rl); col=mix(uCol,vec3(1.,.82,.6),pull*.5+uFire*.3);`})));
  // the mast
  tower=new T.LineSegments(mastGeo(),new T.ShaderMaterial({uniforms:{uTime:G.uTime,uE:u.uE,uFire:u.uFire,uPulse:u.uPulse,uC:{value:new T.Color('#FF9A3A')},uOp:{value:1}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute float aY,aK; uniform float uTime,uE,uFire; uniform vec4 uPulse; varying float vB;
      float pk(float c,float y){ return c<0.?0.:exp(-pow((y-c)*11.,2.)); }
      void main(){ float y=aY; float b=.2+.26*y+.14*exp(-pow((y-fract(uTime*.2))*7.,2.));
        b+=(pk(uPulse.x,y)+pk(uPulse.y,y)+pk(uPulse.z,y)+pk(uPulse.w,y))*1.3;
        b=b*(.75+.6*uE)+uFire*(.6+1.6*exp(-pow((y-fract(uTime*1.6))*5.,2.)));
        vB=b*aK*smoothstep(-.02,.08,y); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uC; uniform float uOp; varying float vB; void main(){ gl_FragColor=vec4(uC*vB*uOp,1.); }`}));
  tower.frustumCulled=false; sc.add(tower);
  // the lamp
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0],3)); lg.setAttribute('aR',new T.Float32BufferAttribute([0,.5,.5,0, 1,.5,.5,0],4));
  sc.add(pts(lg,PM({size:.5,color:'#FF8100',uniforms:u,decl:'uniform vec3 uLamp; uniform float uE,uFire,uH;',body:`p=uLamp; float bl=.55+.45*pow(.5+.5*sin(uTime*2.2),3.);
    if(aR.x<.5){ sz=.42*uH/6.; b=(.9+bl*.9+uE*1.4+uFire*3.)*.9; col=vec3(1.,.93,.82); } else { sz=(2.2+uE*1.2+uFire*3.)*uH/6.; b=.12+.18*bl+.25*uE+.7*uFire; }`})));
  // radio rings leaving the lamp
  sc.add(pts(cloud(NR*180,(i,r,o,ex)=>{ o[0]=o[1]=o[2]=0; ex.aRg[i]=Math.floor(i/180); },{aRg:1}),PM({size:.05,color:'#FFB066',uniforms:u,decl:'attribute float aRg; uniform vec3 uLamp; uniform float uH; uniform vec4 uRg[8];',body:`
    vec4 R=uRg[int(aRg)]; float age=uTime-R.x, k=age/R.w;
    if(k<0.||k>1.){ b=0.; p=uLamp+vec3(0.,-999.,0.); }
    else { float a=aR.x*6.2832, rad=R.z*age*uH/6.; p=uLamp+vec3(cos(a)*rad,sin(a)*rad,(aR.y-.5)*.12*rad); b=R.y*pow(1.-k,1.7)*(.45+.55*aR.z)*smoothstep(0.,.06,k)*(.55+.45*smoothstep(-.2,.6,sin(a))); sz=.8+R.y*.4; }`})));
  // the beam: light climbing from the lamp into the sky, faster and wider when charged or fired
  sc.add(pts(cloud(Math.floor(4200*Q+900),(i,r,o)=>{o[0]=gauss()*.05;o[2]=gauss()*.05;o[1]=r[0];}),PM({size:.05,color:'#FFD9B0',uniforms:u,decl:'uniform vec3 uLamp; uniform float uE,uFire,uFireT,uH;',
    body:`float sp=.12+uE*.25+uFire*1.4, t=fract(position.y-uTime*sp); float w=1.+uE*.8+uFire*3.;
      p=uLamp+vec3(position.x*w*uH/6.,t*uH*(1.8+uFire*1.2),position.z*w*uH/6.);
      float pk=exp(-pow((t-(uTime-uFireT)*.9),2.)*260.)*step(0.,uTime-uFireT)*step(uTime-uFireT,1.4);
      b=(.16+.5*uE+1.4*uFire+3.*pk)*(1.-t)*smoothstep(0.,.05,t); sz=1.+pk*1.5;`})));
  // signals already received, orbiting the lamp
  sc.add(pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.12,color:'#FFFFFF',uniforms:u,decl:'uniform float uCount,uH; uniform vec3 uLamp;',body:`
    float i=position.x; b=step(i,uCount-.5)*1.1; float a=uTime*(.15+aR.x*.25)+aR.y*6.28, rr=(.25+aR.z*.45)*uH; p=uLamp+vec3(cos(a)*rr,(aR.w-.5)*uH*.35,sin(a)*rr*.6);`})));
  // a horizon of embers at the foot of the mast
  sc.add(pts(cloud(Math.floor(1600*Q+500),(i,r,o)=>{o[0]=(r[0]-.5)*2;o[1]=gauss()*.006;o[2]=(r[1]-.5);}),PM({size:.035,color:'#FF8100',uniforms:u,decl:'uniform vec3 uLamp; uniform float uH,uE;',
    body:`p=vec3(uLamp.x+position.x*uH*4.,uLamp.y-uH+position.y*uH,position.z*uH*.6); b=(.1+.08*uE)*smoothstep(1.,.05,abs(position.x))*(.6+.4*sin(uTime+aR.x*30.));`})));
  burst=Burst(sc,Math.floor(320*Q+80),'#FFB066',.06);
  layout();
};

/* ---------- placement: to the right of the form on wide screens, beside the title on phones ---------- */
function layout(){
  const W=innerWidth, H=innerHeight, nar=NARROW(), D=nar?15:14, wpp=2*D*Math.tan(18*Math.PI/180)/H; let sx, by, ty;
  if(!nar){ const c=$('.card',el).getBoundingClientRect(), left=Math.max((c.right||W*.5)+40,W*.5); sx=(left+W)/2; ty=H*.25; by=H*.98; }
  else { const hb=$('.card h2',el).getBoundingClientRect(); sx=W*.79; by=hb.bottom>0?hb.bottom+4:H*.33; ty=Math.max(92,by-H*.21); }
  lay.nar=nar; lay.D=D; lay.wpp=wpp; lay.x=(sx-W/2)*wpp; lay.y=-(by-H/2)*wpp; lay.h=(by-ty)*wpp;
  if(tower){ tower.position.set(lay.x,lay.y,0); tower.scale.setScalar(lay.h); }
  LAMP.set(lay.x,lay.y+lay.h,0); if(u) u.uH.value=lay.h;
  const wc=$('#sgWave'), r=wc.getBoundingClientRect(), d=Math.min(2,devicePixelRatio||1); if(r.width){ const w=Math.round(r.width*d), h=Math.round(r.height*d); if(wc.width!==w||wc.height!==h){ wc.width=w; wc.height=h; } }
}
addEventListener('resize',()=>{ if(S.st===st) layout(); });

/* ---------- signal state ---------- */
function ring(s,v,life){ if(!u) return; u.uRg.value[ri].set(G.uTime.value,s,v,life); ri=(ri+1)%NR; }
const XYZW=['x','y','z','w'];
function pulse(){ pulses[XYZW[pi]]=0; pi=(pi+1)%4; }
const nameEl=$('#sgName'), linkEl=$('#sgLink'), lvlEl=$('#sgLvl'), pctEl=$('#sgPct'), btn=$('#sgBtn'), wc=$('#sgWave'), wx=wc.getContext('2d');
const okLink=v=>/^https?:\/\/\S+\.\S+/.test(v)||/^[^\s/:]+\.[^\s]{2,}/.test(v);
function check(){ const n=!!nameEl.value.trim(), l=okLink(linkEl.value.trim()); ready=n&&l;
  const t=ready?'Ready to transmit':!n&&!linkEl.value.trim()?'Type to charge the signal':!n?'Add your name':'Add a link to something you built';
  if(t!==lvl){ lvl=t; lvlEl.textContent=t; lvlEl.classList.toggle('acc',ready); btn.classList.toggle('armed',ready); } }
const outEl=$('#sgOut');
[nameEl,linkEl].forEach(f=>f.addEventListener('input',()=>{ E=Math.min(1,E+.11); pulse(); ring(.45+E*.6,.9,1.7); A.key(); f.closest('label').classList.remove('err'); if(outEl.classList.contains('bad')){ outEl.textContent=''; outEl.classList.remove('bad'); } check(); }));
st.setCount=n=>{ if(u) u.uCount.value=n; };
st.pulse=()=>{ E=Math.min(1,E+.1); pulse(); };
st.fire=()=>st.transmit();
st.transmit=()=>{ if(!u) return; E=1; u.uFire.value=1; u.uFireT.value=G.uTime.value; ring(1.8,1.6,2.2); setTimeout(()=>ring(1.3,1.25,2.3),150); setTimeout(()=>ring(.9,.95,2.5),320);
  burst.emit(LAMP,Math.floor(120*Q+40),2.2*lay.h/6,null,1.4*lay.h/6,1.5); S.flash=Math.max(S.flash,.2); feedback(.18,.6);
  A.launch(); A.whoosh(true,1.6,.2); A.stinger(3); setTimeout(()=>A.chord(),450);
  btn.classList.remove('tx'); void btn.offsetWidth; btn.classList.add('tx'); clearTimeout(btn._t); btn._t=setTimeout(()=>btn.classList.remove('tx'),1600); };
st.deny=()=>{ deny=1; btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); };
st.start=()=>{ (nameEl.value.trim()?linkEl:nameEl).focus({preventScroll:true}); };
st.enter=function(){ st.setState('menu'); layout(); check(); $('#copied').textContent=FINE?'Click the address to copy it':'Tap the address to copy it'; };

/* ---------- per frame ---------- */
st.update=function(dt,t){
  if(!u) return;
  if(mouse.on&&FINE){ ray.setFromCamera(G.uMouse.value,stCam); if(ray.ray.intersectPlane(pl,_h)) u.uM3.value.lerp(_h,.12); }
  else u.uM3.value.lerp(_m.set(LAMP.x+Math.sin(t*.5)*lay.h*.5,LAMP.y-lay.h*.4+Math.cos(t*.37)*lay.h*.3,0),.04);
  E=Math.max(ready?.3:0,E-dt*.16); u.uE.value=damp(u.uE.value,E,6,dt); u.uFire.value=damp(u.uFire.value,0,.9,dt); deny=Math.max(0,deny-dt*2);
  for(let i=0;i<4;i++){ const k=XYZW[i]; if(pulses[k]>=0){ pulses[k]+=dt*1.5; if(pulses[k]>1.3) pulses[k]=-1; } }
  idleT-=dt; if(idleT<=0){ idleT=ready?1.1:2.4; ring(ready?.6:.3,.75,2.4); }
  // camera: a slow drift and a little parallax
  const px=(FINE&&mouse.on?mouse.nx*.3:0)+Math.sin(t*.09)*.15, py=(FINE&&mouse.on?mouse.ny*.16:0)+Math.cos(t*.07)*.08;
  st.camP.set(px,py,lay.D); st.camL.set(px*.3,py*.3,0);
  // the waveform under the form
  const w=wc.width, h=wc.height; if(w){ wx.clearRect(0,0,w,h); const amp=(.06+u.uE.value*.7+u.uFire.value*.9+deny*.5)*h*.44, cl=ready?1:0, N=Math.min(240,w>>2);
    for(let pass=0;pass<2;pass++){ wx.lineWidth=pass?Math.max(1.2,h/40):Math.max(4,h/9); wx.strokeStyle=deny>.05?`rgba(255,86,54,${pass?.95:.18})`:pass?'rgba(255,150,60,.95)':'rgba(255,129,0,.16)'; wx.beginPath();
      for(let i=0;i<=N;i++){ const k=i/N, env=Math.sin(k*Math.PI), y=h/2+((Math.sin(k*46+t*7)*.75)*cl+(Math.sin(k*37+t*9)*Math.sin(k*11-t*3)+Math.sin(k*93+t*17)*.3)*(1-cl*.75))*amp*env;
        i?wx.lineTo(k*w,y):wx.moveTo(0,y); } wx.stroke(); } }
  const pc=Math.round(Math.min(1,u.uE.value+u.uFire.value)*100); if(pc!==pct){ pct=pc; pctEl.textContent=String(pc).padStart(3,'0'); }
  burst.update(dt,.6,1.2);
};
st._dbg={get E(){return E;},get ready(){return ready;},lay,lamp:()=>{ _m.copy(LAMP).project(stCam); return {x:(_m.x*.5+.5)*innerWidth,y:(-_m.y*.5+.5)*innerHeight}; }};
})();

/* ---------- beacon: mail + signals ---------- */
(()=>{
const EMAIL='contact@helorialabs.com';
$('#mail').addEventListener('click',async()=>{ const out=$('#copied'), m=$('#mail');
  try{ await navigator.clipboard.writeText(EMAIL); out.textContent='Copied to clipboard'; }
  catch(e){ const r=document.createRange(); r.selectNodeContents(m); const s=getSelection(); s.removeAllRanges(); s.addRange(r); out.textContent='Selected. Press Ctrl+C or ⌘C'; }
  A.ping(1568,.035); m.classList.remove('ok'); void m.offsetWidth; m.classList.add('ok'); out.classList.add('acc');
  clearTimeout(m._t); m._t=setTimeout(()=>{ out.textContent=FINE?'Click the address to copy it':'Tap the address to copy it'; out.classList.remove('acc'); m.classList.remove('ok'); },2600); });
$('#sig').addEventListener('submit',async e=>{
  e.preventDefault(); const out=$('#sgOut'), nEl=$('#sgName'), lEl=$('#sgLink');
  let name=nEl.value.trim().slice(0,40), link=lEl.value.trim().slice(0,200);
  if(link&&!/^https?:\/\//i.test(link)&&/^[^\s/:]+\.[^\s]{2,}/.test(link)){ link='https://'+link; lEl.value=link; }
  const badN=!name, badL=!/^https?:\/\/\S+\.\S+/.test(link);
  nEl.closest('label').classList.toggle('err',badN); lEl.closest('label').classList.toggle('err',badL); out.classList.toggle('bad',badN||badL);
  if(badN||badL){ out.textContent=badN&&badL?'Add your name and a link to something you built.':badN?'Add your name.':'Add a full link, starting with https://'; A.beep(220); ST.be&&ST.be.deny&&ST.be.deny(); (badN?nEl:lEl).focus({preventScroll:true}); return; }
  ST.be&&ST.be.fire&&ST.be.fire();
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
  const steps=STA.map(s=>[s.name,s.id]).filter(x=>ST[x[1]]);
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
  if(!S.ready||S.mode!=='load') return; A.start(); A.swell(); $('#enter').blur();
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
function crossHorizon(){ if(S.mode!=='hub') return; S.mode='falling'; S.fallT=0; S.ap=null; show('#hub',false); cine(true); $('#warn').classList.remove('on'); A.hush(); }
function hzLeave(){ unreveal($('#horizon .h')); show('#horizon',false); post.uniforms.uStretch.value=0; U.probe.visible=U.trail.visible=true; }
$('#hzBack').addEventListener('click',()=>{ hzLeave(); S.mode='story'; toHub(); toast('Respawned at 19 rs'); });
$('#hzBeacon').addEventListener('click',()=>{ hzLeave(); const b=BEACON; S.mode='hub'; spawnProbe(b.R+2.4,b.a); chasePose(chase); hubBase.p.copy(chase.p); hubBase.q.copy(chase.q); hubCam.position.copy(chase.p); hubCam.quaternion.copy(chase.q); show('#hub',true); cine(false); dock(b); });

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
    if(S.hubT>=2.6&&S.mode==='tohub'){ S.mode='hub'; S.hudOn=false; post.uniforms.uWarp.value=0; toast('Gravity is on. Thrust gently.'); setTimeout(()=>{ if(S.mode==='hub'&&!S.docked.size) toast('Visit all four projects. Then the horizon opens.'); },3400); }
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
    S.fallT+=rdt; const k=Math.min(1,S.fallT/2.6); post.uniforms.uStretch.value=k*(RM?.2:1); A.whine(k*(1-sstep(.8,1,k))); A.update(t,{pad:0,sub:.7*(1-k)}); // the orbit's score does not follow you in
    const P=S.probe; P.p.multiplyScalar(1-dt*1.1); U.probe.position.copy(P.p);
    hubCam.position.lerp(tv[2].set(P.p.x*1.4,.8,P.p.z*1.4+.01),dt*2); hubCam.lookAt(0,0,0); hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion);
    const c=tv[3].set(0,0,0).project(hubCam); post.uniforms.uSC.value.set(c.x*.5+.5,c.y*.5+.5);
    S.flash=Math.max(S.flash,sstep(.75,1,k));
    if(k>=1){ S.mode='beyond'; A.hush(); A.update(t,{pad:0,sub:0}); setTimeout(()=>{ if(S.mode==='beyond') A.chord(); },500); U.probe.visible=U.trail.visible=false; cine(false);
      $('#hzStats').innerHTML=statsHTML([['Proper time',fmtT(S.tau)],['Stations docked',S.docked.size+' / '+NST],['Games played',S.games]]); show('#horizon',true); reveal($('#horizon .h')); }
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
    if(S.mode==='station'||S.mode==='docking') A.update(t,{sub:0,pad:0}); // a station has only its own sounds; the orbit's score waits outside
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
window.__heloria={A,jump,storyUnlock:()=>{ story.busy=0; },S,ST,U,STA,post,BH,renderer,stCam,hubCam,rtA,rtB,postScene,ortho,dock:id=>dock(STA.find(x=>x.id===id)),toHub,undock,goChapter,escape};

})();

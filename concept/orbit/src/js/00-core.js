/* ================= CORE ================= */
const PHOTOS = __PHOTOS__;
const T = window.THREE;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const E={io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, o:t=>1-Math.pow(1-t,3), i:t=>t*t*t, o5:t=>1-Math.pow(1-t,5)};
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

/* ---------- sound ---------- */
const A=(()=>{
  let ctx=null,out,comp,rev,on=false; const n={};
  function init(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    out=ctx.createGain(); out.gain.value=0; out.connect(ctx.destination);
    comp=ctx.createDynamicsCompressor(); comp.threshold.value=-18; comp.connect(out);
    // reverb from generated impulse
    rev=ctx.createConvolver(); const L=ctx.sampleRate*2.4, ir=ctx.createBuffer(2,L,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c); for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/L,3.2);}
    rev.buffer=ir; const rg=ctx.createGain(); rg.gain.value=.5; rev.connect(rg); rg.connect(comp);
    // drone bed
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=200; lp.Q.value=5; lp.connect(comp);
    const dg=ctx.createGain(); dg.gain.value=.13; dg.connect(lp);
    [[55,'sawtooth'],[55.4,'sawtooth'],[82.5,'sine'],[27.5,'sine']].forEach(([f,t])=>{const o=ctx.createOscillator();o.type=t;o.frequency.value=f;o.connect(dg);o.start();});
    const buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const ns=ctx.createBufferSource(); ns.buffer=buf; ns.loop=true; ns.start();
    const mk=(type,f,q)=>{const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q||.7; const g=ctx.createGain(); g.gain.value=0; ns.connect(b); b.connect(g); g.connect(comp); return {b,g};};
    n.wind=mk('bandpass',700,.8); n.rumble=mk('lowpass',90,1); n.thrust=mk('bandpass',260,1.2); n.roar=mk('lowpass',380,.9);
    n.ten=ctx.createOscillator(); n.ten.type='sawtooth'; n.ten.frequency.value=40; const tf=ctx.createBiquadFilter(); tf.type='lowpass'; tf.frequency.value=600; n.teng=ctx.createGain(); n.teng.gain.value=0; n.ten.connect(tf); tf.connect(n.teng); n.teng.connect(comp); n.ten.start();
    n.lp=lp; n.buf=buf;
  }
  const set=(p,v,tc=.08)=>{ if(ctx) p.setTargetAtTime(v,ctx.currentTime,tc); };
  function tone(f,dur,g=.08,type='sine',f2=0,delay=0,send=0){
    if(!on) return; const t0=ctx.currentTime+delay, o=ctx.createOscillator(), a=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.008); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(comp);
    if(send){const s=ctx.createGain(); s.gain.value=send; a.connect(s); s.connect(rev);} o.start(t0); o.stop(t0+dur+.05);
  }
  function noise(dur,g,f0,f1,type='lowpass',q=.8,delay=0){
    if(!on) return; const t0=ctx.currentTime+delay, s=ctx.createBufferSource(); s.buffer=n.buf; const b=ctx.createBiquadFilter(); b.type=type; b.Q.value=q;
    b.frequency.setValueAtTime(f0,t0); b.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+Math.min(.05,dur*.3)); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(b); b.connect(a); a.connect(comp); s.start(t0,Math.random()); s.stop(t0+dur+.05);
  }
  const PEN=[0,2,4,7,9];
  const note=i=>261.63*Math.pow(2,(PEN[((i%5)+5)%5]+12*Math.floor(i/5))/12);
  return {
    get on(){return on},
    async enable(v){ try{ init(); on=v; if(v) await ctx.resume(); set(out.gain,v?.6:0,.5); }catch(e){ on=false; } sndUI(); },
    tick(){ tone(3200,.025,.012,'square'); },
    click(){ tone(1400,.07,.035,'triangle',700); },
    whoosh(up=true,dur=1,g=.22){ noise(dur,g,up?240:2600,up?2600:240,'bandpass',1.1); },
    swell(){ noise(1.8,.28,180,3200,'bandpass',1.4); tone(220,2,.05,'sine',440,0,.5); tone(330,2,.035,'sine',660,.15,.5); },
    boom(){ tone(110,3.2,.5,'sine',24); noise(2.6,.6,3600,60); tone(880,1.2,.05,'sine',220,0,.4); },
    hold(h){ if(!ctx) return; set(n.rumble.g.gain,h*.9); set(n.teng.gain,h*.06); set(n.ten.frequency,40+h*140); set(n.lp.frequency,200+h*500); },
    wind(v){ if(!ctx) return; set(n.wind.g.gain,Math.min(.3,v)); set(n.wind.b.frequency,400+v*2200); },
    thrust(v){ if(!ctx) return; set(n.thrust.g.gain,v*.2,.05); },
    roar(v){ if(!ctx) return; set(n.roar.g.gain,v*.7,.04); },
    whine(v){ if(!ctx) return; set(n.teng.gain,v*.08); set(n.ten.frequency,60+v*900); },
    drone(f){ if(n.lp) set(n.lp.frequency,f,.4); },
    chime(i,delay=0){ const f=note(i); tone(f,1.1,.06,'sine',0,delay,.6); tone(f*2,.5,.018,'sine',0,delay,.6); },
    chord(){ [0,2,4,7].forEach((k,j)=>this.chime(10+k,j*.07)); },
    buzz(){ tone(98,.28,.12,'sawtooth',62); noise(.22,.14,900,200); },
    pop(){ noise(.45,.32,2400,80); tone(180,.4,.1,'triangle',50); },
    alarm(){ tone(330,.35,.07,'square'); tone(262,.35,.07,'square',0,.18); },
    ping(f=1318,g=.05){ tone(f,1.3,g,'sine',0,0,.5); },
    blip(){ tone(1760,.1,.04,'square'); },
    launch(){ noise(1.1,.35,200,2600,'bandpass',.9); },
    jam(){ tone(90,1.4,.2,'sine',38); tone(180,1.1,.05,'square',60); noise(.9,.15,600,90); },
    beep(f=880){ tone(f,.08,.04,'square'); },
    dock(){ tone(660,.6,.07,'sine',0,0,.4); tone(990,.9,.06,'sine',0,.12,.4); },
    key(){ tone(1800+Math.random()*900,.03,.012,'triangle'); }
  };
})();
function sndUI(){ const b=$('#snd'); b.classList.toggle('live',A.on); b.setAttribute('aria-pressed',A.on); $('.t',b).textContent=A.on?'Sound on':'Sound off'; }
$('#snd').addEventListener('click',()=>A.enable(!A.on));

/* ---------- renderer ---------- */
const canvas=$('#gl');
const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
const DPRMAX=Math.min(devicePixelRatio||1, Q<1?1.5:1.75);
let DPR=DPRMAX;
renderer.setPixelRatio(DPR); renderer.setClearColor(0,1);
const hubCam=new T.PerspectiveCamera(42,1,.1,900), stCam=new T.PerspectiveCamera(42,1,.1,900);
const G={uTime:{value:0},uPx:{value:800},uMouse:{value:new T.Vector2(9,9)},uAspect:{value:1}};
const mkRT=()=>new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter,samples:Q<1?0:4});
const rtA=mkRT(), rtB=mkRT();
const post=new T.ShaderMaterial({
  uniforms:{tA:{value:rtA.texture},tB:{value:rtB.texture},uIris:{value:0},uIC:{value:new T.Vector2(.5,.5)},uIrisCol:{value:new T.Color('#c9b6ff')},
    uCen:{value:new T.Vector2(.5,.5)},uLens:{value:0},uRs:{value:.05},uAspect:G.uAspect,uTime:G.uTime,uWarp:{value:0},uFlash:{value:0},uStretch:{value:0},
    uTint:{value:new T.Color(0,0,0)},uCA:{value:0},uGrade:{value:new T.Color(1,1,1)},uScan:{value:.05},uVig:{value:1}},
  vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`uniform sampler2D tA,tB; uniform float uIris,uLens,uRs,uAspect,uTime,uWarp,uFlash,uStretch,uCA,uScan,uVig; uniform vec2 uIC,uCen; uniform vec3 uIrisCol,uTint,uGrade; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  vec3 bloomA(vec2 uv){ vec2 px=vec2(1./uAspect,1.)*.004; vec2 qx=vec2(px.x,-px.y);
    vec3 g=texture2D(tA,uv,3.).rgb*.5;
    g+=(texture2D(tA,uv+px,5.).rgb+texture2D(tA,uv-px,5.).rgb+texture2D(tA,uv+qx,5.).rgb+texture2D(tA,uv-qx,5.).rgb)*.17;
    g+=(texture2D(tA,uv+px*2.5,6.5).rgb+texture2D(tA,uv-px*2.5,6.5).rgb+texture2D(tA,uv+qx*2.5,6.5).rgb+texture2D(tA,uv-qx*2.5,6.5).rgb)*.12; return g; }
  vec3 bloomB(vec2 uv){ vec2 px=vec2(1./uAspect,1.)*.004; vec2 qx=vec2(px.x,-px.y);
    vec3 g=texture2D(tB,uv,3.).rgb*.5;
    g+=(texture2D(tB,uv+px,5.).rgb+texture2D(tB,uv-px,5.).rgb+texture2D(tB,uv+qx,5.).rgb+texture2D(tB,uv-qx,5.).rgb)*.17;
    g+=(texture2D(tB,uv+px*2.5,6.5).rgb+texture2D(tB,uv-px*2.5,6.5).rgb+texture2D(tB,uv+qx*2.5,6.5).rgb+texture2D(tB,uv-qx*2.5,6.5).rgb)*.12; return g; }
  vec3 lookA(vec2 uv,float ca){ vec2 o=(uv-.5)*ca; return vec3(texture2D(tA,uv+o).r,texture2D(tA,uv).g,texture2D(tA,uv-o).b)+bloomA(uv); }
  vec3 lookB(vec2 uv,float ca){ vec2 o=(uv-.5)*ca; return vec3(texture2D(tB,uv+o).r,texture2D(tB,uv).g,texture2D(tB,uv-o).b)+bloomB(uv); }
  vec2 lensUV(vec2 uv){ vec2 d=uv-uCen; d.x*=uAspect; float r=length(d); vec2 dn=normalize(d+1e-5); float st=uStretch;
    d=dn*pow(r,1.+st*1.6)*(1.+st*2.); r=length(d);
    float k=min(uLens*uRs*uRs/max(r,uRs)*smoothstep(0.,uRs,r), r*.5); vec2 dd=d-dn*k; dd.x/=uAspect; return uCen+dd; }
  void main(){
    float ca=.0015+uCA*.01+uStretch*.03;
    float m=0., rim=0.;
    if(uIris>2.5) m=1.;
    else if(uIris>0.){ vec2 q=(vUv-uIC)*vec2(uAspect,1.); float d=length(q); vec2 dir=q/max(d,1e-4);
      float n=vn(dir*2.2+vec2(uTime*.5,uTime*.3))*.6+vn(vUv*7.+uTime*.7)*.4; float R=uIris*(1.+.22*(n-.5));
      m=smoothstep(R+.01,R-.05,d); rim=smoothstep(.035,0.,abs(d-R))*(1.-smoothstep(1.2,2.,uIris)); }
    vec3 a=vec3(0.), b=vec3(0.);
    if(m<1.){ vec2 uv=lensUV(vUv);
      if(uWarp>.001){ vec3 s=vec3(0.); for(int i=0;i<6;i++){ float f=float(i)/5.; s+=lookA(mix(uv,uIC,f*uWarp*.3),ca); } a=s/6.; } else a=lookA(uv,ca); }
    if(m>0.) b=lookB(vUv,ca);
    vec3 c=mix(a,b,m)+uIrisCol*rim*1.1;
    c=c/(1.+c*.35);
    c=mix(c,c*vec3(1.4,.55,.45),uStretch);
    c*=uGrade;
    float v=smoothstep(1.25,.35,length((vUv-.5)*vec2(uAspect,1.))*uVig); c*=mix(.48,1.,v);
    c+=uTint;
    c*=1.-uScan*(.5+.5*sin(gl_FragCoord.y*1.5708));
    c+=(hash(vUv*vec2(1920.,1080.)+fract(uTime))-.5)*.035;
    c=mix(c,vec3(1.,.98,1.),clamp(uFlash,0.,1.));
    gl_FragColor=vec4(max(c,0.),1.);
  }`, depthTest:false, depthWrite:false});
const postScene=new T.Scene(); const pq=new T.Mesh(new T.PlaneGeometry(2,2),post); pq.frustumCulled=false; postScene.add(pq);
const ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
function setPx(cam){ G.uPx.value=innerHeight*DPR/(2*Math.tan(cam.fov*Math.PI/360)); }
function resize(){ const w=innerWidth,h=innerHeight; renderer.setPixelRatio(DPR); renderer.setSize(w,h,false);
  [hubCam,stCam].forEach(c=>{c.aspect=w/h;c.updateProjectionMatrix();});
  rtA.setSize(Math.floor(w*DPR),Math.floor(h*DPR)); rtB.setSize(Math.floor(w*DPR),Math.floor(h*DPR)); G.uAspect.value=w/h; }
addEventListener('resize',()=>{ resize(); if(window.__onResize) window.__onResize(); }); resize();

/* adaptive quality: watch frame times, trade pixel density for smoothness */
const QM={buf:[],cool:0,
  tick(ms,now){ this.buf.push(ms); if(this.buf.length>50) this.buf.shift(); if(now<this.cool||this.buf.length<50) return;
    const avg=this.buf.reduce((a,b)=>a+b,0)/this.buf.length;
    if(avg>24&&DPR>.75){ DPR=Math.max(.75,DPR-.25); resize(); this.cool=now+2500; this.buf=[]; }
    else if(avg<13&&DPR<DPRMAX){ DPR=Math.min(DPRMAX,DPR+.25); resize(); this.cool=now+4000; this.buf=[]; } }};

/* ---------- particle + material toolkit ---------- */
const GLH=`vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 rotZ(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
float gs(float x){return exp(-x*x);}`;
function PM(o){
  const u=Object.assign({uTime:G.uTime,uPx:G.uPx,uMouse:G.uMouse,uAspect:G.uAspect,uSize:{value:o.size||.04},uMouseOn:{value:o.mouse||0},uCol:{value:new T.Color(o.color||'#c9b6ff')},uOp:{value:1}},o.uniforms||{});
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
/* fresnel glass: dark core, glowing rim (instancing + instance colour aware) */
function FM(color,o={}){
  return new T.ShaderMaterial({uniforms:{uC:{value:new T.Color(color)},uCore:{value:o.core??.05},uPow:{value:o.pow??2.2},uInt:{value:o.int??1.4},uOp:{value:o.op??1}},
    vertexShader:`varying vec3 vN; varying vec3 vV; varying vec3 vIC; void main(){ vec4 p=vec4(position,1.); vec3 nn=normal; vIC=vec3(1.);
      #ifdef USE_INSTANCING
        p=instanceMatrix*p; nn=mat3(instanceMatrix)*nn;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vIC=instanceColor;
      #endif
      vec4 mv=modelViewMatrix*p; vN=normalize(normalMatrix*nn); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uC; uniform float uCore,uPow,uInt,uOp; varying vec3 vN; varying vec3 vV; varying vec3 vIC; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),uPow); gl_FragColor=vec4(uC*vIC*(uCore+f*uInt),uOp); }`,
    transparent:(o.op??1)<1, depthWrite:(o.op??1)>=1});
}
/* pooled particle bursts (CPU), additive */
function Burst(scene,N,color,size){
  const P=new Float32Array(N*3).fill(9999), V=new Float32Array(N*3), L=new Float32Array(N), C=new Float32Array(N*3).fill(1); let I=0;
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); const R=new Float32Array(N*4); for(let i=0;i<R.length;i++) R[i]=Math.random();
  g.setAttribute('aR',new T.BufferAttribute(R,4)); g.setAttribute('aL',new T.BufferAttribute(L,1)); g.setAttribute('aC',new T.BufferAttribute(C,3)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e5);
  const m=PM({size,color,decl:'attribute float aL; attribute vec3 aC;',body:'b=aL*1.6; col=uCol*aC; sz=.6+aL*.6;'});
  scene.add(pts(g,m));
  return {
    emit(p,n,spd=2,col=null,up=0,life=1){ for(let k=0;k<n;k++){ const i=I++%N; P[i*3]=p.x;P[i*3+1]=p.y;P[i*3+2]=p.z; const s=spd*(.4+Math.random()*.6);
      V[i*3]=gauss()*s;V[i*3+1]=gauss()*s+up;V[i*3+2]=gauss()*s; L[i]=life; if(col){C[i*3]=col.r;C[i*3+1]=col.g;C[i*3+2]=col.b;}else{C[i*3]=C[i*3+1]=C[i*3+2]=1;} } },
    update(dt,grav=0,drag=1.6){ const k=Math.exp(-drag*dt); for(let i=0;i<N;i++){ if(L[i]<=0) continue; V[i*3]*=k;V[i*3+1]=V[i*3+1]*k-grav*dt;V[i*3+2]*=k; P[i*3]+=V[i*3]*dt;P[i*3+1]+=V[i*3+1]*dt;P[i*3+2]+=V[i*3+2]*dt; L[i]-=dt; if(L[i]<=0) P[i*3+1]=9999; }
      g.attributes.position.needsUpdate=true; g.attributes.aL.needsUpdate=true; g.attributes.aC.needsUpdate=true; },
    clear(){ L.fill(0); P.fill(9999); }
  };
}
/* text sprites for in-world words */
const texCache=new Map();
function textSprite(txt,kind){
  const key=kind+'|'+txt; let e=texCache.get(key);
  if(!e){ const c=document.createElement('canvas'), x=c.getContext('2d'); const bad=kind==='bad', gold=kind==='gold';
    const font=bad?'500 76px "Geist Mono", ui-monospace, monospace':'600 112px "Funnel Display", system-ui, sans-serif';
    const label=bad?('['+txt.toUpperCase()+']'):txt;
    x.font=font; const w=Math.ceil(x.measureText(label).width)+(gold?120:40), h=gold?170:150; c.width=w; c.height=h;
    x.font=font; x.textAlign='center'; x.textBaseline='middle';
    if(gold){ x.fillStyle='rgba(255,180,140,.9)'; const r=h*.42; x.beginPath(); if(x.roundRect) x.roundRect(8,h/2-r,w-16,r*2,r); else x.rect(8,h/2-r,w-16,r*2); x.fill(); x.fillStyle='#120b06'; }
    else x.fillStyle=bad?'#ff8a7a':'#ffffff';
    x.fillText(label,w/2,h/2+4);
    const tex=new T.CanvasTexture(c); tex.minFilter=T.LinearFilter; tex.generateMipmaps=false; e={tex,aspect:w/h}; texCache.set(key,e); }
  const m=new T.SpriteMaterial({map:e.tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffffff});
  const s=new T.Sprite(m); s.userData.aspect=e.aspect; return s;
}

/* ---------- kinetic type ---------- */
function split(el){
  if(!el||el.dataset.sp) return; el.dataset.sp=1; const txt=el.textContent.trim(); el.setAttribute('aria-label',txt); el.textContent='';
  let i=0; txt.split(' ').forEach((w,wi)=>{ const m=document.createElement('span'); m.className='m'; m.setAttribute('aria-hidden','true');
    for(const ch of w){ const c=document.createElement('span'); c.className='c'; c.style.setProperty('--i',i++); c.textContent=ch; m.appendChild(c); }
    el.appendChild(m); if(wi<txt.split(' ').length-1) el.appendChild(document.createTextNode(' ')); });
}
$$('.split').forEach(split);
const GLY='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>#_';
function scramble(el,text,dur=700){
  if(!el) return; text=text??el.dataset.txt??el.textContent; el.dataset.txt=text; if(RM){el.textContent=text;return;}
  const t0=performance.now(); clearInterval(el._sc);
  el._sc=setInterval(()=>{ const k=(performance.now()-t0)/dur; let s='';
    for(let i=0;i<text.length;i++){ const ch=text[i]; s+= (ch===' '||i/text.length<k*1.4-.4) ? ch : GLY[(Math.random()*GLY.length)|0]; }
    el.textContent=s; if(k>=1){ clearInterval(el._sc); el.textContent=text; } },40);
}
function reveal(el,on=true){ if(!el) return; el.classList.remove('out'); if(on){ el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); $$('[data-scr]',el).forEach((s,i)=>setTimeout(()=>scramble(s),120+i*80)); } else el.classList.remove('in'); }
function unreveal(el){ if(!el) return; el.classList.add('out'); el.classList.remove('in'); }

/* ---------- cursor + ui sounds ---------- */
const mouse={x:innerWidth/2,y:innerHeight/2,nx:0,ny:0,on:false,down:false};
const curEl=$('#cur'), curD=$('#curd'), curT=$('#curT'); let crx=mouse.x, cry=mouse.y;
if(FINE) document.documentElement.classList.add('cur');
addEventListener('pointermove',e=>{ mouse.x=e.clientX; mouse.y=e.clientY; mouse.nx=e.clientX/innerWidth*2-1; mouse.ny=-(e.clientY/innerHeight*2-1); mouse.on=e.pointerType==='mouse'; G.uMouse.value.set(mouse.nx,mouse.ny); },{passive:true});
document.addEventListener('mouseleave',()=>{ mouse.on=false; G.uMouse.value.set(9,9); });
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,[data-cur],input,canvas#radar'); if(!t) return; if(t.matches('input')) return; curT.textContent=t.dataset.cur||(t.id==='radar'?'Fly':'Open'); curEl.classList.add('big'); if(!t._tk){ A.tick(); t._tk=1; setTimeout(()=>t._tk=0,120);} });
document.addEventListener('pointerout',e=>{ const t=e.target.closest&&e.target.closest('a,button,[data-cur],canvas#radar'); if(t&&!t.contains(e.relatedTarget)) curEl.classList.remove('big'); });
document.addEventListener('click',e=>{ if(e.target.closest('button,a')) A.click(); },true);
function cursorTick(){ if(!FINE) return; crx=lerp(crx,mouse.x,.2); cry=lerp(cry,mouse.y,.2); curEl.style.transform=`translate(${crx}px,${cry}px)`; curD.style.transform=`translate(${mouse.x}px,${mouse.y}px)`; }
function cursorAim(on){ curEl.classList.toggle('aim',!!on); }

/* ---------- misc ui ---------- */
function cine(on){ document.body.classList.toggle('cine',on); }
let toastT=0; function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.remove('off'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.add('off'),2800); }

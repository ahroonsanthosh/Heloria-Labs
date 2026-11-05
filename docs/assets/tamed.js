(()=>{
'use strict';
/* ---- 00-base.js ---- */
/* ================= HELORIA TAMED =================
   A pavilion of pale stone standing in still water at golden hour. One evening, one walk:
   scroll moves you through the place and moves the sun down the sky with you. */
/* the ways out of the walk, set by the build: on the site untamed/ (Fly), untamed/#land (Land) and untamed/#aetos (the
   rocket at the end of the walk, into orbit at Aetos); as an artifact, the other artifacts' links */
const UNTAMED_URL='untamed/', LAND_URL='untamed/#land', ROCKET_URL='untamed/#aetos';
/* on the site the address follows you: /walk while you walk. It is not a page of its own: reloading it, or going back,
   brings you to the front door again */
const SITE_ROOT=location.pathname.replace(/[^/]*$/,''), PRETTY='1'==='1'&&SITE_ROOT==='/';   // only where the site is the whole domain
const walkAddress=()=>{ if(!PRETTY) return; try{ history.pushState({walk:1},'',SITE_ROOT+'walk'); }catch(e){} };
addEventListener('popstate',()=>{ if(PRETTY&&S.mode!=='gate') location.replace(SITE_ROOT); });
const sameSite=u=>!/^https?:/.test(u);
/* the same tab when it is part of this site, a new one when it lives somewhere else */
const outLinks=d=>[['[data-untamed]',UNTAMED_URL],['[data-land]',LAND_URL],['[data-rocket]',ROCKET_URL]].forEach(([q,u])=>
  d.querySelectorAll(q).forEach(a=>{ a.href=u; if(sameSite(u)){ a.removeAttribute('target'); a.removeAttribute('rel'); } }));
const PHOTOS=["assets/img/ahroon.webp?v=f12e410264", "assets/img/michael.webp?v=f21826f8f3", "assets/img/abraham.webp?v=2dece95d7a"];
const T=window.THREE;
/* without three.js there is no place to walk through: keep the words, as a plain page */
if(!T){ const d=document; d.documentElement.classList.add('nogl'); const g=d.getElementById('gate'), b=d.getElementById('tamed');
  outLinks(d); g.classList.remove('loading'); g.classList.add('ready'); [...d.querySelectorAll('#word span')].forEach(l=>l.classList.add('in'));
  b.disabled=false; b.onclick=()=>{ g.style.display='none'; const u=d.getElementById('ui'); u.classList.add('on'); u.removeAttribute('aria-hidden'); d.getElementById('logo').classList.add('on'); };
  throw new Error('Heloria Tamed: three.js did not load, showing the plain page'); }
const TEST=!!window.__TEST, HQ=!!window.__HQ;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const inv=(a,b,v)=>clamp((v-a)/(b-a),0,1);
const sstep=(a,b,x)=>{const t=inv(a,b,x);return t*t*(3-2*t)};
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const E={io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, o:t=>1-Math.pow(1-t,3), o4:t=>1-Math.pow(1-t,4), i:t=>t*t*t, io2:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
const TAU=Math.PI*2, DEG=Math.PI/180;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(pointer: fine)').matches;
const TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0;
const SMALL=Math.min(screen.width||innerWidth,screen.height||innerHeight)<720;
const MOBILE=SMALL||(TOUCH&&!FINE);
const portrait=()=>innerWidth/innerHeight<.82;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
const col=h=>new T.Color(h);
const v3=(x,y,z)=>new T.Vector3(x,y,z);

/* every place on the walk, in order. s is the place's position on the one continuous path */
const PLACES=[
  {id:'home',   name:'Home',    s:0, tint:'#FFF1DE', proj:-1},
  {id:'aetos',  name:'Aetos',   s:1, tint:'#F2EEE6', proj:0},
  {id:'pharos', name:'Pharos',  s:2, tint:'#FFD5B3', proj:1},
  {id:'ogive',  name:'Ogive',   s:3, tint:'#FFB475', proj:2},
  {id:'krios',  name:'Kríos',   s:4, tint:'#A5C3FF', proj:3},
  {id:'team',   name:'Team',    s:5, tint:'#FFC9A0', proj:-1},
  {id:'contact',name:'Contact', s:6, tint:'#C7CCEA', proj:-1},
];
/* the four rooms, in the order you walk through them: each room's place in the line (its slot) is read from here, so its
   architecture, light, camera and sound all follow it */
const PROJ=[
  {id:'aetos', name:'Aetos', col:'#F2EEE6', kind:'Counter-drone command software'},
  {id:'pharos',name:'Pharos',col:'#FFD5B3', kind:'GPS-free drone navigation'},
  {id:'ogive', name:'Ogive', col:'#FFB475', kind:'AI tools for OpenRocket'},
  {id:'krios', name:'Kríos', col:'#A5C3FF', kind:'Voice practice for sales teams'},
];
const SLOT={}; PROJ.forEach((p,k)=>{ SLOT[p.id]=k; });
const placeById=id=>PLACES.find(p=>p.id===id);
/* the walk changes scene twice: through the front door into the gallery, and out of it into the courtyard */
const DOOR_IN=.5, DOOR_OUT=4.5, BLEND=.085;

/* the whole app's live state */
const S={ready:false, mode:'gate', s:0, t:0, dt:0, frame:0, hover:null, timeScale:1, proj:-1, entered:false};

/* ---- 05-audio.js ---- */
/* ================= SOUND =================
   Everything is synthesized. A slow warm score in D (pads, a soft bass, a distant glass piano),
   water that is close by the lake and muffled inside the rooms, one droplet when the cursor breaks
   the surface, a tonal colour for each room, and quiet sounds for the hand. Never harsh, never loud.
   What sounds all the time is worked out once, as the page loads, and played back as recordings (see LOOPS below); what
   happens in a moment (each note of the glass piano, a drop, a bird, the hand) is made live as it happens. */
const A=(()=>{
  let ctx=null, on=false; const n={};
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  /* the progression, already voice-led: Dmaj9, Bm9, Gmaj7(#11), A6sus2, then a second pass that turns to Em9 */
  const CH=[[50,57,61,64,66],[47,54,57,61,62],[43,50,54,59,61],[45,52,59,61,66],[50,57,61,64,69],[52,55,59,62,66],[43,50,54,57,61],[45,52,57,59,64]];
  const ROOT=[38,35,31,33,38,40,31,33];
  const PENTA=[62,64,66,69,71,74,76,78,81,83];
  /* the phrase that keeps coming back: up a sixth, a turn, a fall to rest; and three ways of answering it */
  const MOTIF=[[[74,0],[78,.62],[81,1.24],[79,1.9],[76,2.5]],[[74,0],[76,.6],[78,1.2],[74,2.1]],[[81,0],[78,.55],[76,1.15],[71,1.9],[74,2.7]],[[69,0],[74,.7],[76,1.3],[78,2.2]]];
  function ir(sec,decay){
    const L=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(2,L,ctx.sampleRate);
    for(let c=0;c<2;c++){ const d=b.getChannelData(c); let lp=0; for(let i=0;i<L;i++){ const t=i/L; const k=.35+.6*(1-t); lp=lp+(Math.random()*2-1-lp)*k; d[i]=lp*Math.pow(1-t,decay)*(i<ctx.sampleRate*.012?.3:1); } }
    return b; }
  const LITE=matchMedia('(pointer: coarse)').matches||Math.min(screen.width,screen.height)<700;
  const LEVEL=.5;   /* the whole walk's level: a little under full, so phones and laptops have room */
  /* phones: the sound and a heavy 3D scene share a small processor. When the audio can no longer keep up, some phones stop
     sending it to the speaker while the page carries on as if it were playing, and iOS can hand the speaker to something
     else. So: lighter work on a phone (LITE), the playback audio session on iOS, and a watchdog once a second that wakes
     the context if it was put to sleep and restarts it if its clock has stopped moving */
  let wdT=-1, wdC=-1;
  let away=false;   // you have left the page: see leave() below
  function watch(){ if(!ctx||!on||document.hidden||away) return;
    if(ctx.state!=='running'){ ctx.resume().catch(()=>{}); wdT=-1; return; }
    const now=performance.now(), c=ctx.currentTime;
    if(wdT>0&&now-wdT>900&&c===wdC){ ctx.suspend().then(()=>ctx.resume()).catch(()=>{}); }
    wdT=now; wdC=c; }
  setInterval(watch,1000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&ctx&&on&&ctx.state!=='running') ctx.resume().catch(()=>{}); });
  ['touchend','pointerup','keydown'].forEach(ev=>addEventListener(ev,()=>{ if(ctx&&on&&ctx.state!=='running') ctx.resume().catch(()=>{}); },{capture:true,passive:true}));
  /* the live part: only the sounds of a moment pass through it now, so it has little to do between them */
  function init(){
    if(ctx) return;
    { const AC=window.AudioContext||window.webkitAudioContext; try{ ctx=new AC({latencyHint:'playback'}); }catch(e){ ctx=new AC(); } }   // a deeper buffer on every device: a busy frame can never starve the speaker
    try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}   // iOS: play like media, through the silent switch and other apps
    n.master=ctx.createGain(); n.master.gain.value=0;
    n.comp=ctx.createDynamicsCompressor(); n.comp.threshold.value=-20; n.comp.knee.value=14; n.comp.ratio.value=3; n.comp.attack.value=.02; n.comp.release.value=.5;
    /* what leaves for the speakers: nothing below 40 Hz (a phone or laptop cannot play it, only strain at it), and never a
       hard clip, so sounds piling up never reach the point where small speakers distort */
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=40; hp.Q.value=.6;
    /* a soft clip in place of a limiter: below 0.7 it lets the sound through untouched, above it rounds the peaks off
         smoothly towards full scale. (The browser's compressor would add its own make-up gain to everything) */
      const cv=new Float32Array(2049); for(let i=0;i<cv.length;i++){ const x=i/1024-1, a=Math.abs(x); cv[i]=a<=.7?x:Math.sign(x)*(.7+.28*Math.tanh((a-.7)/.28)); }
      const lim=ctx.createWaveShaper(); lim.curve=cv; lim.oversample='none';
    n.comp.connect(n.master); n.master.connect(hp); hp.connect(lim); lim.connect(ctx.destination);
    n.meter=ctx.createAnalyser(); n.meter.fftSize=4096; lim.connect(n.meter);
    n.rev=ctx.createConvolver(); n.rev.buffer=ir(Math.min(.25,12000/ctx.sampleRate),1.4);   /* a short room, worked out on the sound's own thread: a long one is worked out on an ordinary thread that a busy page starves, and the sound crackles and cuts out while the page is in front */ n.revG=ctx.createGain(); n.revG.gain.value=.62; n.rev.connect(n.revG); n.revG.connect(n.comp);
    n.revIn=ctx.createGain(); n.revIn.connect(n.rev);
    /* nine seconds of noise, for the sounds of a moment */
    const nb=ctx.createBuffer(1,ctx.sampleRate*9,ctx.sampleRate), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1; n.noise=nb;
    /* music bus: the glass piano passes one low-pass that closes when you are inside. (The score under it needs none: all of
       it lies below the lowest that low-pass ever goes) */
    n.mus=ctx.createGain(); n.mus.gain.value=0; n.musLP=ctx.createBiquadFilter(); n.musLP.type='lowpass'; n.musLP.frequency.value=9000; n.musLP.Q.value=.5;
    n.mus.connect(n.musLP); n.musLP.connect(n.comp); const ms=ctx.createGain(); ms.gain.value=.55; n.musLP.connect(ms); ms.connect(n.revIn);
    n.ci=0; n.nextChord=ctx.currentTime+9; n.nextNote=ctx.currentTime+2.5;
    /* water bus: the small plips on the lake, close by outside and muffled inside like the water under them */
    n.water=ctx.createGain(); n.water.gain.value=0; n.waterLP=ctx.createBiquadFilter(); n.waterLP.type='lowpass'; n.waterLP.frequency.value=2400; n.waterLP.Q.value=.4;
    n.water.connect(n.waterLP); n.waterLP.connect(n.comp); const ws=ctx.createGain(); ws.gain.value=.25; n.waterLP.connect(ws); ws.connect(n.revIn);
    n.nextPlip=ctx.currentTime+1; n.nextBird=ctx.currentTime+6; n.nextPing=0; n.nextGateBird=0;
  }
  const last=new WeakMap();
  const set=(p,v,tc=.15)=>{ if(!ctx) return; const l=last.get(p); if(l!==undefined&&Math.abs(l-v)<=Math.max(1e-4,Math.abs(v)*.004)) return; last.set(p,v); p.setTargetAtTime(v,ctx.currentTime,tc); };

  /* ---------- what sounds all the time, as recordings ----------
     Sound made live has only a few hundredths of a second in hand, and a page busy drawing a 3D world in front of you
     leaves holes in it: on real laptops and phones the walk jittered, turned to static and cut out while its tab was in
     front, and played clean in a background tab. A browser plays a recording through its media path, which keeps a long
     reserve ahead of the speaker. So each layer that sounds all the time (the score's pads and bass, the water, the air in
     the grass, the four rooms, the gate's warm light and its dark, the rocket's rumble) is worked out once, out of sight, a
     moment after the page loads, from the same nodes as before, and played as an audio file; where you are sets each
     file's volume.
     A browser does not loop a file without a break (Chromium leaves a hole of a hundredth of a second or more at the wrap),
     so each recording is a clip of P seconds and H more, faded in over its first H and out over its last H, and two
     players take turns: as one reaches P the other starts from the top, and for H seconds they overlap. What overlaps is
     never a copy of itself, or the two could cancel: the noise is fresh noise, the score changes chord there, and a held
     tone drifts up by half a hertz over the clip, so that at the overlap it only beats softly against itself.
     A filter cannot move on a recording. The water is worked out twice, open (as outside) and through the low-pass of the
     inside, and the two are crossed by volume; the rocket the same, far and close. The score needs no second version (see
     the music bus above), and the Pharos air is worked out at its brightest and follows the beam by volume. */
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const LOOPS=[], LP={};
  /* the walk's own room, as long as it was before the live one had to be cut to a quarter of a second: a long tail costs
     nothing worked out ahead of time */
  const ROOM=5.2;
  function loop(build,seconds,o){ const L=Object.assign({build,P:seconds,H:2.5,sr:22050,tc:.5,tc2:.2,room:false,pre:0,full:1,a:0,b:1,va:0,vb:1,els:null,cur:0,run:false,sched:0,rate:1},o);
    if(!L.pre) L.pre=L.room?6:.6; LOOPS.push(L); LP[L.name]=L; return L; }
  /* the room, made as the live one was, at the clip's own sample rate */
  const IRS={};
  function room(oc,sec,decay){ const sr=oc.sampleRate, q=48000/sr, key=sec+'@'+sr;
    const d=IRS[key]||(IRS[key]=[0,1].map(()=>{ const N=Math.floor(sr*sec), a=new Float32Array(N); let lp=0;
      for(let i=0;i<N;i++){ const t=i/N; lp+=(Math.random()*2-1-lp)*(1-Math.pow(.05+.6*t,q)); a[i]=lp*Math.pow(1-t,decay)*(i<sr*.012?.3:1); } return a; }));
    const b=oc.createBuffer(2,d[0].length,sr); b.getChannelData(0).set(d[0]); b.getChannelData(1).set(d[1]); return b; }
  /* what a layer is built from, inside its own offline context */
  function kit(oc,L,len){ const sr=oc.sampleRate, t0=L.pre, P=L.P;
    const g=(v,to)=>{ const x=oc.createGain(); x.gain.value=v; if(to) x.connect(to); return x; };
    const bq=(type,f,q,to)=>{ const x=oc.createBiquadFilter(); x.type=type; x.frequency.value=f; if(q!=null) x.Q.value=q; if(to) x.connect(to); return x; };
    const osc=(type,f,to)=>{ const x=oc.createOscillator(); x.type=type; x.frequency.value=f; if(to) x.connect(to); x.start(0); return x; };
    return {t0,P,end:len/sr,g,bq,osc,
      /* a slow swing, made to go round a whole number of times in the clip, so the clip is as loud on average as the layer */
      lfo:(f,depth,param)=>{ const d=g(depth); osc('sine',Math.max(1,Math.round(f*P))/P,d); d.connect(param); },
      /* a held tone, drifting up by half a hertz between the start of the clip and its seam */
      drone:(type,f,to)=>{ const x=osc(type,f-.25,to); x.frequency.setValueAtTime(f-.25,t0); x.frequency.linearRampToValueAtTime(f+.25,t0+P); return x; },
      /* fresh noise for the whole clip, as the walk made it and read it (at the speed rate): brown, a leaky sum of white; or
         white, as dense in each band as it was at 48 kHz (at a lower sample rate the same noise crowds into fewer hertz) */
      noise:(kind,rate,to)=>{ const b=oc.createBuffer(1,len,sr), d=b.getChannelData(0);
        if(kind==='brown'){ const c=Math.exp(-2*Math.PI*151*rate/sr); let y=0, sq=0; for(let i=0;i<len;i++){ y=c*y+(1-c)*(Math.random()*2-1); d[i]=y; sq+=y*y; } const s=.2/Math.sqrt(sq/len||1); for(let i=0;i<len;i++) d[i]*=s; }
        else { const w=Math.sqrt(sr/(48000*rate)); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*w; }
        const s=oc.createBufferSource(); s.buffer=b; s.connect(to); s.start(0); }};
  }
  function render(L,next){
    const sr=L.sr, len=Math.ceil((L.pre+L.P+L.H)*sr)+256; let oc;
    try{ oc=new OAC(2,len,sr); }catch(e){ return next(); }
    /* two channels: the first is the recording; the second only measures by, the layer as the live chain heard it (at its
       full level, or at the level it mostly plays at, with the live quarter-second room, into the same compressor), and the
       recording is set as loud as that. Under 40 Hz goes from both */
    const hp=oc.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=40; hp.Q.value=.6; hp.connect(oc.destination);
    const mg=oc.createChannelMerger(2); mg.connect(hp);
    const out=oc.createGain(), ref=oc.createGain(), cp=oc.createDynamicsCompressor(), k=kit(oc,L,len);
    cp.threshold.value=-20; cp.knee.value=14; cp.ratio.value=3; cp.attack.value=.02; cp.release.value=.5;
    ref.gain.value=L.at||L.full; ref.connect(cp); cp.connect(mg,0,1); out.connect(ref); out.connect(mg,0,0);
    if(L.room){ k.wet=oc.createGain();
      /* the long room into the recording, the live one into the measure. (A room is scaled by its length in samples, so at
         this sample rate it would come out louder than at a speaker's 48 kHz; the square root of the ratio puts that right) */
      [[ROOM,2.6,mg],[.25,1.4,ref]].forEach(([s,dk,to])=>{ const cv=oc.createConvolver(); cv.buffer=room(oc,s,dk); const r=oc.createGain(); r.gain.value=.62*Math.sqrt(sr/48000);
        k.wet.connect(cv); cv.connect(r); if(to===mg) r.connect(mg,0,0); else r.connect(to); }); }
    try{ L.build(oc,out,sr,k); }catch(e){ return next(); }
    const done=b=>finish(L,b,next);
    try{ const p=oc.startRendering(); if(p&&p.then) p.then(done,()=>next()); else oc.oncomplete=e=>done(e.renderedBuffer); }catch(e){ next(); }
  }
  /* the work on the page's own thread is done a slice at a time, so no frame waits on it */
  const slices=(N,fn,done)=>{ let i=0; const go=()=>{ const e=Math.min(N,i+65536); fn(i,e); i=e; if(i<N) setTimeout(go,0); else done(); }; go(); };
  const LE=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
  function finish(L,buf,next){
    const sr=L.sr, NP=Math.round(L.P*sr), NH=Math.round(L.H*sr), N=NP+NH, i0=Math.round(L.pre*sr), a=buf.getChannelData(0), b=buf.getChannelData(1);
    let s0=0, s1=0, sq=0;
    slices(N,(p,q)=>{ for(let i=p;i<q;i++){ const x=a[i0+i], y=b[i0+i]; s0+=x*x; s1+=y*y; } },()=>{
      const k=(s0>0?Math.sqrt(s1/s0):0)*LEVEL*L.full/(L.at||L.full), ab=new ArrayBuffer(44+N*2), v=new DataView(ab), pcm=LE?new Int16Array(ab,44,N):null;
      const str=(o,x)=>{ for(let i=0;i<x.length;i++) v.setUint8(o+i,x.charCodeAt(i)); };
      str(0,'RIFF'); v.setUint32(4,36+N*2,true); str(8,'WAVE'); str(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
      v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); str(36,'data'); v.setUint32(40,N*2,true);
      /* faded in over the first H and out over the last, equal power: what overlaps there is never the same sound twice */
      slices(N,(p,q)=>{ for(let i=p;i<q;i++){ let x=a[i0+i]*k; if(i<NH) x*=Math.sin(i/NH*Math.PI/2); else if(i>=NP) x*=Math.cos((i-NP)/NH*Math.PI/2); else sq+=x*x;
          const m=x<0?-x:x; if(m>.7) x=(x<0?-1:1)*(.7+.28*Math.tanh((m-.7)/.28)); const s=Math.round(x*32767); if(pcm) pcm[i]=s; else v.setInt16(44+i*2,s,true); } },()=>{
        L.rms=Math.sqrt(sq/Math.max(1,NP-NH)); L.bytes=ab.byteLength;
        const url=URL.createObjectURL(new Blob([ab],{type:'audio/wav'}));
        L.els=[0,1].map(()=>{ const e=new Audio(); e.preload='auto'; e.src=url; e.loop=false; e.volume=0; e._end=L.P+L.H-.03;
          if(L.tape){ e.preservesPitch=e.mozPreservesPitch=e.webkitPreservesPitch=false; L.canRate=('preservesPitch' in e)||('webkitPreservesPitch' in e)||('mozPreservesPitch' in e); }
          e.addEventListener('ended',()=>{ e.currentTime=0; }); return e; });
        next(); }); });
  }
  /* worked out one after another, a moment after the page loads: first what the gate needs, then the walk in order */
  let qi=0; const REN={t0:0,ms:0};
  let QU=null;
  function renderNext(){ if(!QU) QU=[LP.music,...LOOPS.filter(L=>L!==LP.music)];
    if(qi>=QU.length){ for(const k in IRS) delete IRS[k]; REN.ms=Math.round(performance.now()-REN.t0); return; }
    const L=QU[qi++], t=performance.now(); render(L,()=>{ L.ms=Math.round(performance.now()-t); setTimeout(renderNext,30); }); }
  if(OAC) setTimeout(()=>{ REN.t0=performance.now(); renderNext(); },60);

  /* the mixer: every 40 ms each recording's volume is eased towards where you are (as the live gains were), a recording
     starts when it is wanted and stops once it has faded out, and the two players of each hand over at the seam. An iPhone
     will not let a page set a recording's volume: there each plays at the level it was made at, or not at all */
  const MX={v:0,tc:.5,t:0,ios:false};
  try{ const e=new Audio(); e.volume=.5; MX.ios=Math.abs(e.volume-.5)>.01; }catch(e){}
  const endOf=L=>L.P+L.H-.03;
  function play(L,e){ try{ const p=e.play(); if(p&&p.catch) p.catch(()=>{ L.blocked=true; }); }catch(err){ L.blocked=true; } }
  /* on again: whatever was part way through goes on; from silence, a recording starts at H, at full strength */
  function go(L){ if(L.priming) return; L.run=true; let any=false;
    for(const e of L.els) if(e.currentTime>0&&e.currentTime<endOf(L)&&!e.ended){ play(L,e); any=true; }
    if(!any){ const e=L.els[L.cur]; e.currentTime=L.H; play(L,e); } }
  function halt(L){ L.run=false; clearTimeout(L.sched); L.sched=0; for(const e of L.els) if(!e.paused) e.pause(); if(L.tails){ for(const e of L.tails) if(!e.paused) e.pause(); L.tails=null; } }
  /* the other player takes over at the seam: from the top, or as far in as the first is already past it, so that a late
     timer never puts the two out of step */
  function hand(L){ let c=L.els[L.cur]; const o0=L.els[1-L.cur];
    if(c.paused&&!o0.paused){ L.cur=1-L.cur; c=o0; }
    if(c.paused||L.sched) return; const r=c.playbackRate||1, left=(L.P-c.currentTime)/r;
    if(left>.3) return;
    if(left>.03){ L.sched=setTimeout(()=>{ L.sched=0; if(L.run) hand(L); },(left-.02)*1000); return; }
    const nx=L.next, o=nx?nx.els[0]:L.els[1-L.cur]; if(!o.paused) return;
    const at=Math.max(0,-left*r); if(Math.abs(o.currentTime-at)>.005) o.currentTime=at;
    o.volume=c.volume; o.playbackRate=c.playbackRate; play(L,o);
    if(nx){ L.tails=(L.tails||[]).concat(c); L.els=nx.els; L.P=nx.P; L.H=nx.H; L.rms=nx.rms; L.next=null; L.cur=0; }   // the last of the short one rings out under the whole round's start
    else L.cur=1-L.cur; }
  function mix(){ const now=performance.now(), dt=Math.min(.25,(now-(MX.t||now))/1000); MX.t=now;
    const up=on&&!document.hidden&&!away; MX.v+=((up?1:0)-MX.v)*(1-Math.exp(-dt/MX.tc));
    for(const L of LOOPS){ L.va+=(L.a-L.va)*(1-Math.exp(-dt/L.tc)); L.vb+=(L.b-L.vb)*(1-Math.exp(-dt/L.tc2));
      if(!L.els||L.stage) continue;
      /* the whole round of the score is ready: it takes over at the next seam, or at once if the score is not playing */
      const S2=L.name==='music'&&LP.musicAll.els; if(S2&&!L.next){ const A2=LP.musicAll; L.next={els:A2.els,P:A2.P,H:A2.H,rms:A2.rms}; A2.els=null; A2.primed=true; A2.moved=true; }
      if(L.next&&!L.run){ for(const e of L.els) if(!e.paused) e.pause(); L.els=L.next.els; L.P=L.next.P; L.H=L.next.H; L.rms=L.next.rms; L.next=null; L.cur=0; }
      for(const e of L.els) if(!e.paused&&e.currentTime>=(e._end||endOf(L))){ e.pause(); e.currentTime=0; }   // played out: never play() an ended one, it starts again from 0
      if(L.tails) L.tails=L.tails.filter(e=>{ if(e.paused||e.ended||e.currentTime>=e._end){ if(!e.paused) e.pause(); return false; } return true; });
      const want=L.a*L.b/L.full, v=Math.min(1,L.va*L.vb/L.full)*MX.v;
      if(MX.ios){ if(up&&(want>=.4||L.run&&want>=.3)){ if(!L.run) go(L); } else if(L.run) halt(L); }
      else if(up&&want>.003||v>.003){ if(!L.run) go(L); for(const e of L.tails?L.els.concat(L.tails):L.els) if(Math.abs(e.volume-v)>.0005) e.volume=v; }   // (under -50 dB is silence: it stops)
      else if(L.run) halt(L);
      if(L.run&&!L.blocked&&L.els[0].paused&&L.els[1].paused){ L.run=false; go(L); }   // a handover that never came: start it again
      if(L.run) hand(L);
      /* the score as tape, slowing to half speed and an octave down under the rocket you caught, and back */
      if(L.tape){ const r=n.tape&&now>n.tapeAt?.5:1; L.rate+=(r-L.rate)*(1-Math.exp(-dt/(r<1?.75:.8)));
        if(L.canRate) for(const e of L.els) if(Math.abs(e.playbackRate-L.rate)>.002) e.playbackRate=L.rate; }
    } }
  setInterval(mix,40);
  /* leaving the page: another tab or app, the phone locked, or on a computer another window in front. The sound goes with
     you: at once when the page is hidden (a phone may freeze the page next, and would play its recordings on in the
     background), faded out by the mixer when it is only behind another window; and it comes back when you do */
  function leave(){ const hid=document.hidden; away=true; if(!ctx) return;
    set(n.master.gain,0,hid?.01:.15); MX.tc=.25;
    if(hid){ for(const L of LOOPS) if(L.run) halt(L); MX.v=0; ctx.suspend().catch(()=>{}); } }
  function back(){ if(!away||document.hidden) return; away=false; if(!ctx||!on) return; MX.tc=.6; ctx.resume().then(()=>set(n.master.gain,LEVEL,.6)).catch(()=>{}); }
  document.addEventListener('visibilitychange',()=>document.hidden?leave():back());
  addEventListener('pagehide',leave); addEventListener('blur',leave); addEventListener('focus',back);
  ['pointerdown','touchstart','keydown'].forEach(ev=>addEventListener(ev,back,{capture:true,passive:true}));
  /* inside a click, a tap or a key a browser lets a recording start: each one is started there for a moment, silently, and
     stopped, so that a phone which only lets a page start sound inside a gesture lets it start later by itself */
  function kick(){ for(const L of LOOPS){ if(!L.els) continue;
      if(L.run&&L.blocked){ L.blocked=false; halt(L); go(L); continue; }
      if(L.run||L.primed) continue; L.primed=true; L.priming=L.els.length;
      for(const e of L.els){ e.muted=true; const fin=()=>{ if(!e.paused) e.pause(); e.currentTime=0; e.muted=false; L.priming--; };
        try{ const p=e.play(); if(p&&p.then) p.then(fin,()=>{ e.muted=false; L.priming--; L.primed=false; }); else fin(); }catch(err){ e.muted=false; L.priming--; L.primed=false; } } } }
  ['pointerdown','pointerup','touchend','click','keydown'].forEach(ev=>addEventListener(ev,kick,{capture:true,passive:true}));
  const lv=(k,a,b=1)=>{ const L=LP[k]; L.a=a; L.b=b; };

  /* the water: lapping close by and a trickle above it, through the lake's low-pass, closed (as inside) and open (as outside) */
  const water=f=>(oc,out,sr,k)=>{ const lp=k.bq('lowpass',f,.4,out); lp.connect(k.g(.25,k.wet));
    /* the lapping, without the rumble under it no small speaker can play, and well down: a steady band of it read as static,
       or a rocket going over, and buried the score. It comes and goes in soft swells, some 9 dB under the music, and there
       is no bright trickle over it any more (a band of white noise: the hiss in it was the static still heard) */
    const lapG=k.g(.07,lp); k.noise('brown',.83,k.bq('highpass',120,.6,k.bq('lowpass',420,null,lapG)));
    [[.11,.0385],[.27,.021],[.53,.0105]].forEach(([f,d])=>k.lfo(f,d,lapG.gain)); };
  loop(water(320),19,{name:'waterClosed',full:.62*.36,tc:.7,tc2:.5,room:true});
  loop(water(2400),19,{name:'waterOpen',full:.62,tc:.7,tc2:.5,room:true});
  /* the gate: warm light on one side, the dark on the other */
  loop((oc,out,sr,k)=>{ const bus=k.g(1,out); bus.connect(k.g(.7,k.wet));
    [62,69,74,78].forEach((m,i)=>k.drone('sine',mtof(m)*Math.pow(2,(i-1.5)*3/1200),k.g(.25/(1+i*.4),bus))); },12,{name:'warm',full:.09,tc:.35,room:true,H:3});
  /* the dark under Fly at the gate: a deep, soft open fifth swelling slowly, and no noise (a low rumble of noise here was the
     loudest sound on the walk, and sounded like a rocket going over) */
  loop((oc,out,sr,k)=>{ const dg=k.g(.12,out); k.drone('sine',mtof(38),dg); k.lfo(.2,.04,dg.gain); k.drone('sine',mtof(45),k.g(.07,out)); k.drone('sine',mtof(50),k.g(.03,out)); },10,{name:'dark',full:.3,tc:.25});
  /* air in the grass */
  /* the air in the grass: a soft breath of it, well under the water and the score (it was far too loud, and too bright) */
  loop((oc,out,sr,k)=>{ const f=k.bq('bandpass',750,.6,k.g(.16,out)); k.noise('white',.94,f); k.lfo(.06,330,f.frequency); },16,{name:'wind',full:.06,tc:.8});
  /* the score: for each of five voices two detuned saws and a sine an octave down, through a slowly breathing low-pass,
     and a soft bass. The eight chords come at the pace they always had (nine to twelve seconds each) and glide into each
     other; at the seam the last is let ring out under the first coming in. The low end is kept light: the root sits under
     the lowest voice already, and a phone or laptop speaker only strains at more */
  const CT=[0,10.4,20,31.2,41.2,52.8,62.2,73];   // when each chord comes in; the whole round is 84 s
  const chordAt=x=>{ let j=CT.length-1; while(j>0&&CT[j]>x) j--; return j; };
  const score=nc=>(oc,out,sr,k)=>{ const {g,bq,osc,lfo,t0}=k;
    const lp=bq('lowpass',9000,.5,out); lp.connect(g(.55,k.wet)); const bus=g(1,lp);
    const padF=bq('lowpass',700,.6), padG=g(.085,bus); padF.connect(padG); lfo(.045,260,padF.frequency);
    const at=(p,f,tc)=>{ p.setValueAtTime(f(0),0); for(let j=1;j<nc;j++) p.setTargetAtTime(f(j),t0+CT[j],tc); };
    CH[0].forEach((_,i)=>{ const vg=g(i===0?.5:.32/(1+i*.15),padF); lfo(.07+i*.031,.12,vg.gain);
      [-7,6].forEach(dt=>{ const o=osc('sawtooth',0,g(.16,vg)); o.detune.value=dt; at(o.frequency,j=>mtof(CH[j][i]),1.6); });
      at(osc('sine',0,g(i<2?.22:.14,vg)).frequency,j=>mtof(CH[j][i])/2,1.6); });
    at(osc('sine',0,g(.022,bus)).frequency,j=>mtof(ROOT[j]),1.2); };
  /* the score is long to work out, so its first two chords are made first, a moment after the page opens, and play as the
     score until the whole round is ready: that takes over at the next seam, where the first two would have come round
     again (the last chord ringing out under the first, as at every seam) */
  loop(score(2),CT[2],{name:'music',full:.9,tc:.9,room:true,H:3,tape:true});
  loop(score(CT.length),84,{name:'musicAll',full:.9,tc:.9,room:true,H:3,tape:true,stage:true});
  /* Aetos: high and still. A held open fifth that breathes slowly, an octave over it, and a thin high tone far above; no noise
     at all (a band of noise up here read as static, and a low one as a rocket going over) */
  loop((oc,out,sr,k)=>{ const {g,lfo}=k; const dg=g(.05,out); k.drone('sine',mtof(50),dg); lfo(.05,.016,dg.gain);
    const fg=g(.034,out); k.drone('sine',mtof(57),fg); lfo(.07,.01,fg.gain); k.drone('sine',mtof(62),g(.014,out));
    k.drone('sine',mtof(86),g(.006,out)); },25,{name:'ae',full:.75});
  /* Pharos: a deep slow tone that swells as the beam comes round; while the drone is unsure where it is, a little air */
  /* (at the level of the other rooms: it was 16 dB over them, and that much low tone only buzzes in a phone's speaker) */
  loop((oc,out,sr,k)=>{ const bus=k.g(.2,out); bus.connect(k.g(.5,k.wet));
    [[38,.32,'sine'],[45,.3,'sine'],[50,.15,'triangle'],[57,.07,'sine']].forEach(([m,v,t])=>k.drone(t,mtof(m),k.g(v,bus))); },20,{name:'phTone',full:.36,at:.36*.6,tc2:.2,room:true,H:3});
  loop((oc,out,sr,k)=>{ const bus=k.g(1,out); bus.connect(k.g(.5,k.wet)); k.noise('white',.88,k.bq('bandpass',1200,1.2,bus)); },12,{name:'phAir',full:.36*.1,tc2:.15,room:true});
  /* Ogive: a shimmer that keeps rising and never arrives (six tones, each sweeping up two and a half octaves in eleven
     seconds and fading as it goes, a sixth of a sweep apart), and a hiss that grows as you go on. The clip is 15.6 s, so at
     its seam the sweeps stand half a step apart from where they started, never on the same notes. Each tone was panned a
     little left or right, which leaves it at the level a mono recording gives it with 0.7 */
  loop((oc,out,sr,k)=>{ const hp=k.bq('highpass',300,null,out); hp.connect(k.g(.9,k.wet)); const bus=k.g(.7,hp);
    const c=new Float32Array(64); for(let j=0;j<64;j++) c[j]=Math.sin(Math.PI*j/63)*.05;
    for(let i=0;i<6;i++) for(let m=-2;;m++){ const s=k.t0+(m-i/6)*11; if(s<0) continue; if(s>=k.end) break;
      const a=k.g(0,bus), o=oc.createOscillator(); o.connect(a); o.frequency.setValueAtTime(520,s); o.frequency.exponentialRampToValueAtTime(520*Math.pow(2,2.5),s+11);
      a.gain.setValueCurveAtTime(c,s,11); o.start(s); o.stop(s+11); } },15.6,{name:'og',full:.45,room:true,H:3,pre:17});
  loop((oc,out,sr,k)=>{ const hp=k.bq('highpass',300,null,out); hp.connect(k.g(.9,k.wet)); k.noise('white',1.23,k.bq('bandpass',6500,.7,k.g(.5,hp))); },10,{name:'ogHiss',full:.45*.065,tc2:.3,room:true,sr:32000});
  /* Kríos: no voices. A quiet room with a lamp on: a little air, and a low D under the conversation */
  loop((oc,out,sr,k)=>{ const {g,bq,lfo}=k; k.noise('white',1.29,bq('lowpass',520,.5,g(.05,out))); const og=g(.045,out); k.drone('sine',mtof(38),og); lfo(.07,.015,og.gain); },15,{name:'kr',full:.55});
  /* a rocket going up from the far shore: a low, uneven rumble that comes in late and far; it opens up and comes close when
     you catch it */
  const rocket=f=>(oc,out,sr,k)=>{ const {g,bq,osc}=k; const bus=g(1,out); bus.connect(g(.8,k.wet)); const a=g(.75,bus); k.noise('brown',1.12,bq('lowpass',f,.7,a));
    const cr=g(.28); osc('sawtooth',7.3,cr); cr.connect(a.gain); };
  loop(rocket(150),10,{name:'rkFar',full:.16,tc:.45,tc2:.5,room:true});
  loop(rocket(1250),10,{name:'rkNear',full:.78,tc:.45,tc2:.5,room:true});

  function pan(p,dest){ if(ctx.createStereoPanner){ const s=ctx.createStereoPanner(); s.pan.value=clamp(p,-1,1); s.connect(dest); return s; } return dest; }
  /* a glass piano note: a sine with a few soft partials and a long fading tail */
  function glass(m,t0,g,p=0,dest){ const f=mtof(m), out=pan(p,dest||n.mus);
    [[1,1,3.2],[2.005,.22,1.4],[3.01,.07,.7],[4.2,.025,.35]].forEach(([r,k,d])=>{ const o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine'; o.frequency.value=f*r;
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g*k,t0+.006); a.gain.exponentialRampToValueAtTime(.0001,t0+d*(1.2-r*.05)); o.connect(a); a.connect(out); o.start(t0); o.stop(t0+d*1.3+.1); }); }
  /* a short sound only once the sound is running: before the browser lets it, it would wait and come all at once */
  const live=()=>on&&ctx&&ctx.state==='running';
  function tone(f,dur,g,type='sine',f2=0,delay=0,send=.2,atk=.008,dest){ if(!live()) return; const t0=ctx.currentTime+delay, o=ctx.createOscillator(), a=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur*.8);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(dest||n.comp);
    if(send){ const s=ctx.createGain(); s.gain.value=send; a.connect(s); s.connect(n.revIn); } o.start(t0); o.stop(t0+dur+.05); }
  function noise(dur,g,f0,f1,type='bandpass',q=.8,delay=0,send=.3,dest){ if(!live()) return; const t0=ctx.currentTime+delay, s=ctx.createBufferSource(); s.buffer=n.noise; s.loop=true; s.playbackRate.value=.86+Math.random()*.3;
    const b=ctx.createBiquadFilter(); b.type=type; b.Q.value=q; b.frequency.setValueAtTime(f0,t0); b.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t0+dur);
    const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+Math.min(.25,dur*.35)); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(b); b.connect(a); a.connect(dest||n.comp); if(send){ const x=ctx.createGain(); x.gain.value=send; a.connect(x); x.connect(n.revIn); } s.start(t0,Math.random()*2); s.stop(t0+dur+.1); }
  function chirp(p,g=.012,dest){ if(!live()) return; const k=2+Math.floor(Math.random()*3), base=2600+Math.random()*1800, out=pan(p,dest||n.comp);
    for(let i=0;i<k;i++){ const t0=ctx.currentTime+i*(.07+Math.random()*.06), o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(base*(1+i*.06),t0); o.frequency.exponentialRampToValueAtTime(base*(1.3+Math.random()*.25),t0+.05);
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.006); a.gain.exponentialRampToValueAtTime(.0001,t0+.085); o.connect(a); a.connect(out);
      const s=ctx.createGain(); s.gain.value=.6; a.connect(s); s.connect(n.revIn); o.start(t0); o.stop(t0+.12); } }
  function plip(g,delay=0){ const t0=ctx.currentTime+delay, f=1100+Math.random()*1400, o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
    o.frequency.setValueAtTime(f,t0); o.frequency.exponentialRampToValueAtTime(f*1.9,t0+.035);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.003); a.gain.exponentialRampToValueAtTime(.0001,t0+.07); o.connect(a); a.connect(pan(Math.random()*1.4-.7,n.water)); o.start(t0); o.stop(t0+.1); }
  /* a soft mallet, for the rep's side of the call: a round note and a short bright partial */
  function mallet(m,t0,g,p){ const f=mtof(m), out=pan(p,n.comp);
    const o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(f,t0);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.006); a.gain.exponentialRampToValueAtTime(.0001,t0+.95); o.connect(a); a.connect(out);
    const o2=ctx.createOscillator(), a2=ctx.createGain(); o2.type='sine'; o2.frequency.setValueAtTime(f*3.98,t0);
    a2.gain.setValueAtTime(0,t0); a2.gain.linearRampToValueAtTime(g*.2,t0+.003); a2.gain.exponentialRampToValueAtTime(.0001,t0+.16); o2.connect(a2); a2.connect(out);
    const sd=ctx.createGain(); sd.gain.value=.32; a.connect(sd); sd.connect(n.revIn); o.start(t0); o.stop(t0+1); o2.start(t0); o2.stop(t0+.2); }
  /* the call, as two instruments in the walk's key: the rep in low mallet phrases, the buyer answering in glass. The early
     answers end up in the air; as the exchanges go on they settle, and the last one comes home to D */
  const KR_YOU=[[[62,0],[66,.18],[69,.36],[71,.64]],[[69,0],[66,.2],[64,.4],[66,.62]],[[62,0],[64,.16],[66,.32],[69,.5],[66,.76]],
    [[71,0],[69,.22],[66,.42],[69,.66]],[[64,0],[66,.18],[69,.4],[74,.68]],[[69,0],[71,.2],[74,.42],[69,.68]]];
  const KR_THEM=[[[83,0],[81,.24],[76,.52]],[[76,0],[78,.22],[83,.5]],[[78,0],[76,.24],[78,.52]],
    [[81,0],[78,.22],[76,.46],[78,.72]],[[83,0],[81,.2],[78,.44],[81,.7]],[[81,0],[78,.22],[76,.44],[74,.74]]];

  /* what just happened in a room: the radar coming round, a threat picked out, locked and taken; the drone finding itself;
     each design the rocket tries, the one that gets there, the flight, the chute and the landing */
  function roomSound(nm,p,v,st,t){
    const ae=st.ae, ph=st.ph, og=st.og, kr=st.kr;
    if(nm==='kr-you'){ if(kr>.05) KR_YOU[v%6].forEach(([m,d])=>mallet(m,t+.02+d,.034*kr,p+(Math.random()-.5)*.1)); return; }
    if(nm==='kr-them'){ if(kr>.05) KR_THEM[v%6].forEach(([m,d])=>glass(m,t+.02+d,.026*kr,p,n.comp)); return; }
    if(nm==='kr-deal'){ if(kr>.05) [74,78,81,86].forEach((m,i)=>glass(m,t+1.25+i*.1,.02*kr,(i-1.5)*.18,n.comp)); return; }
    if(nm==='ae-sweep'){ if(ae>.05) tone(1320,.09,.006*ae,'sine',1180,0,.5,.002); }
    else if(nm==='ae-hov'){ if(ae>.05) tone(1760,.07,.0045*ae,'sine',1640,0,.45,.002); }
    else if(nm==='ae-id'){ if(ae>.05){ glass(76,t+.02,.03*ae,p,n.comp); glass(81,t+.2,.022*ae,p,n.comp); } }
    else if(nm==='ae-lock'){ if(ae>.05){ glass(83,t+.02,.024*ae,p,n.comp); glass(83,t+.17,.018*ae,p,n.comp); } }
    else if(nm==='ae-hit'){ if(ae>.05){ tone(150,.9,.05*ae,'sine',70,0,.6,.004); noise(.7,.03*ae,2400,500,'lowpass',.7,0,.5); glass(69,t+.3,.02*ae,p,n.comp); } }
    else if(nm==='ph-lock'){ if(ph>.05){ glass(57,t+.05,.034*ph,p,n.mus); glass(64,t+.42,.016*ph,p+.15,n.mus); } }
    else if(nm==='og-tick'){ if(og>.05) tone(1900,.05,.008*og,'triangle',1500,0,.3,.002); }
    else if(nm==='og-pred'){ if(og>.05){ if(Math.abs(v)<.05){ [74,78,81].forEach((m,i)=>glass(m,t+.02+i*.11,.026*og,(i-1)*.2,n.comp)); } else glass(v<0?69:83,t+.01,.026*og,0,n.comp); } }
    else if(nm==='og-launch'){ if(og>.05){ noise(2.2,.05*og,300,2600,'bandpass',.8,0,.5); tone(90,1.6,.04*og,'sine',140,0,.4,.05); } }
    else if(nm==='og-chute'){ if(og>.05) noise(.35,.04*og,900,300,'bandpass',1.2,0,.4); }
    else if(nm==='og-land'){ if(og>.05) tone(220,.25,.02*og,'sine',160,0,.3,.004); }
  }
  /* a new chord in the score: every second one, the phrase on the glass piano over it */
  function chord(st,t){ n.cc=(n.cc||0)+1;
    if(n.cc%2===0&&st.music>.3&&!n.tape){ const M=MOTIF[n.cc%8===0?0:Math.floor(Math.random()*MOTIF.length)], g=.034*st.music, t0=t+1.2; M.forEach(([m,dt],i)=>glass(m,t0+dt+(Math.random()-.5)*.06,g*(1-i*.08),(i%2?.18:-.18))); n.nextNote=Math.max(n.nextNote,t0+4.5); } }

  return {
    get on(){ return on; }, get ctx(){ return ctx; },
    async start(){ try{ init(); on=true; MX.tc=.5; if(away) return; await ctx.resume(); set(n.master.gain,LEVEL,1.2); }catch(e){ on=false; } },
    suspend(v){ if(v) leave(); else back(); },
    /* what the live part sends to the speakers; and, worked out, what the recordings add to it (the meter cannot hear them) */
    meter(){ if(!ctx) return null; const b=new Float32Array(n.meter.fftSize); n.meter.getFloatTimeDomainData(b); let pk=0,sq=0; for(const v of b){ pk=Math.max(pk,Math.abs(v)); sq+=v*v; }
      const rms=Math.sqrt(sq/b.length); let lp=0; for(const L of LOOPS) if(L.els&&L.els.some(e=>!e.paused)){ const x=L.rms*(MX.ios?1:L.els[L.cur].volume); lp+=x*x; }
      const db=x=>+(10*Math.log10(x+1e-18)).toFixed(1);
      return {peak:+pk.toFixed(3),rmsDb:+(20*Math.log10(rms+1e-9)).toFixed(1),loopsDb:db(lp),allDb:db(rms*rms+lp)}; },
    levels(){ return ctx?{master:+n.master.gain.value.toFixed(3),mus:+n.mus.gain.value.toFixed(3),water:+n.water.gain.value.toFixed(3),waterF:Math.round(n.waterLP.frequency.value),kr:+LP.kr.va.toFixed(3),ae:+LP.ae.va.toFixed(3),ph:+LP.phTone.va.toFixed(3),og:+LP.og.va.toFixed(3),state:ctx.state}:null; },
    /* test hooks: each recording (made yet, playing, its volume, the volume it is heading for, its level at full volume, its
       size, how long it took); and a jump to just before a recording's seam, which hands back its two players */
    loops(){ return LOOPS.map(L=>{ const e=L.els&&L.els[L.cur]; return {name:L.name,ready:!!L.els||!!L.moved,playing:!!L.els&&L.els.some(x=>!x.paused),vol:e?+(MX.ios?(e.paused?0:1):e.volume).toFixed(3):0,want:+Math.min(1,L.a*L.b/L.full).toFixed(3),
      rms:+(L.rms||0).toFixed(5),bytes:L.bytes||0,ms:L.ms||0,P:L.P,H:L.H,t:e?+e.currentTime.toFixed(3):0,rate:e?e.playbackRate:1}; }); },
    get rendered(){ return REN.ms; }, get ios(){ return MX.ios; },
    /* the recordings are being made (the page's frames are slower then for a reason of their own); never past half a minute */
    get busy(){ return !!OAC&&!REN.ms&&performance.now()<30000; },
    _seam(name,before){ const L=LP[name], e=L&&L.els&&L.els[L.cur]; if(e) e.currentTime=Math.max(0,L.P-before); return L&&L.els; },
    /* every frame: where you are decides what you hear */
    update(dt,st){
      if(!ctx||!on) return;
      const t=ctx.currentTime;
      /* the score's chords are in its recording: the glass piano follows them by where the recording has got to */
      const ml=LP.music, me=ml.els&&ml.run?ml.els[ml.cur]:null;
      if(me){ const ci=chordAt(me.currentTime); if(ci!==n.ci){ n.ci=ci; chord(st,t); } }
      else if(t>n.nextChord&&!n.tape){ n.ci=(n.ci+1)%CH.length; n.nextChord=t+9+Math.random()*3; chord(st,t); }
      if(t>n.nextNote){ const C=CH[n.ci]; const pick=()=>{ let m=PENTA[Math.floor(Math.random()*PENTA.length)]; return m; };
        const g=.03+Math.random()*.025*st.music, m=pick(); glass(m,t+.02,g,Math.random()*.8-.4);
        if(Math.random()<.35) glass(pick(),t+.32+Math.random()*.3,g*.7,Math.random()*.8-.4);
        if(Math.random()<.15) glass(C[3]+12,t+.05,g*.5,0);
        n.nextNote=t+3.4+Math.random()*5; }
      set(n.mus.gain,st.music*.9,.9); set(n.musLP.frequency,st.musF,.6);
      set(n.water.gain,st.water*.62,.7); set(n.waterLP.frequency,st.waterF,.5);
      if(st.water>.3&&t>n.nextPlip){ plip(.018*st.water*(st.waterF>1500?1:.4)); n.nextPlip=t+.35+Math.random()*2.4; }
      if(st.birds>.2&&t>n.nextBird){ chirp(Math.random()*1.6-.8,.006*st.birds); n.nextBird=t+7+Math.random()*14; }
      for(const [nm,p,v] of RSND) roomSound(nm,p,v,st,t);
      /* the gate's ways: open air and birds for Land; for Fly, far off in the dark, the ping of something not yet known */
      if(st.land>.5&&t>n.nextGateBird){ chirp(Math.random()*1.4-.7,.011); n.nextGateBird=t+1.1+Math.random()*2.2; }
      if(st.dark>.5&&t>n.nextPing){ const p=Math.random()*.6-.3; tone(1320,.12,.012,'sine',1180,0,.9,.002,pan(p,n.comp)); tone(1320,.1,.004,'sine',1180,.42,.9,.002,pan(-p,n.comp)); n.nextPing=t+2.4; }
      if(n.tape&&(st.rocketNear||0)<.05) n.tape=false;
      /* and each recording's level, as the live gains were set. The water's two are crossed by where its low-pass is: all
         closed at 320 Hz (inside), all open from 1500 Hz up */
      const W=st.water*.62, wo=Math.pow(clamp(Math.log(st.waterF/320)/Math.log(1500/320),0,1),1.5);
      lv('waterOpen',W,Math.sqrt(wo)); lv('waterClosed',W,Math.sqrt(1-wo));
      lv('music',st.music*.9); lv('wind',st.wind*.06);
      lv('kr',st.kr*.55); lv('ae',st.ae*.75);
      /* Pharos: the tone settles as the drone becomes sure where it is; doubt is a little air, brighter the less sure */
      const f=st.beam||0; lv('phTone',st.ph*.36,.35+.65*f); lv('phAir',st.ph*.36,(1-f)*.1*Math.sqrt((300+(1-f)*900)/1200));
      lv('og',st.og*.45); lv('ogHiss',st.og*.45,.025+(st.rise||0)*.04);
      lv('warm',st.warm*.09); lv('dark',st.dark*.3);
      const G=(st.rocket||0)*.16+(st.rocketNear||0)*.62, nr=st.rocketNear||0; lv('rkFar',G,Math.sqrt(1-nr)); lv('rkNear',G,Math.sqrt(nr));
    },
    /* the gate: a way being shown, and a way being taken */
    preview(v){ if(!live()) return; const t=ctx.currentTime;
      if(v==='walk'){ plip(.016,.05); glass(74,t+.08,.016,-.2,n.comp); }
      else if(v==='land'){ noise(1.2,.06,700,2600,'bandpass',.5,0,.25); noise(3.3,.045,560,150,'bandpass',.9,0,.5);   /* the clouds parting, then the air you fall through */ tone(mtof(43),3.2,.012,'sine',mtof(40),0,.4,.6);
        setTimeout(()=>{ if(S.gateHover!=='land'||!on) return;
          glass(79,ctx.currentTime+.12,.02,.25,n.comp); glass(86,ctx.currentTime+.3,.014,.3,n.comp); },3400); }
      else if(v==='fly'){ tone(mtof(26),2.6,.028,'sine',mtof(24),0,.5,.5); noise(2.4,.024,90,600,'lowpass',.7,0,.6); n.nextPing=t+.9; } },
    leave(v){ if(!live()) return; const t=ctx.currentTime;
      if(v==='land'){ noise(.9,.05,300,3200,'bandpass',.8,0,.5); [74,79,83].forEach((m,i)=>glass(m,t+.05+i*.09,.022,(i-1)*.25,n.comp)); }
      else { tone(54,1.2,.07,'sine',30,0,.6,.01); noise(1,.05,2400,120,'lowpass',.7,0,.6); } },
    /* the rocket at the end of the walk, caught: it roars in close, a long rise, and the walk falls quiet under it */
    rocketGo(){ if(!live()) return; noise(2.6,.06,180,2600,'bandpass',.9,0,.6); tone(mtof(38),2.8,.05,'sine',mtof(50),0,.7,.9); tone(mtof(45),2.6,.03,'sine',mtof(57),.2,.7,.9);
      n.tape=true; n.tapeAt=performance.now()+300; },
    /* the hand */
    hover(){ if(!live()) return; const m=PENTA[3+Math.floor(Math.random()*5)]; tone(mtof(m),.32,.016,'sine',0,0,.35,.004); tone(mtof(m)*2,.12,.004,'sine',0,0,0,.002); },
    click(){ if(!live()) return; tone(560,.09,.05,'triangle',260,0,.15,.003); noise(.03,.03,2400,1800,'bandpass',2,0,.05); },
    drop(g=1){ if(!live()) return; const t0=ctx.currentTime, f=620+Math.random()*180, o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(f,t0); o.frequency.exponentialRampToValueAtTime(f*2.3,t0+.05);
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.075*g,t0+.004); a.gain.exponentialRampToValueAtTime(.0001,t0+.16);
      o.connect(a); a.connect(n.comp); const s=ctx.createGain(); s.gain.value=.65; a.connect(s); s.connect(n.revIn); o.start(t0); o.stop(t0+.2);
      tone(f*3.1,.06,.008*g,'sine',f*4,.012,.4,.002); },
    /* a hand moving through the water: a soft swish, longer and darker when slow, quicker and brighter when fast, from the
       side of the screen the hand is on, and now and then a drop flicked off */
    swish(k=.5,p=0){ if(!live()) return; const out=pan(p*.7,n.comp), d=.5+.3*(1-k);
      noise(d,.06+.09*k,700+1500*k,260+200*k,'bandpass',1.3,0,.35,out);
      noise(d*.6,.012+.02*k,3400+900*k,1800,'bandpass',1.6,.03,.25,out);
      if(k>.45&&Math.random()<.5) plip(.008+.01*k,.12+Math.random()*.2); },
    whoosh(up=true,dur=1.4,g=.07){ noise(dur,g,up?260:2600,up?2600:260,'bandpass',1,0,.5); },
    swell(){ if(!live()) return; [62,66,69,74].forEach((m,i)=>tone(mtof(m),3.2,.03,'sine',0,i*.06,.8,.6)); noise(2.2,.05,200,2600,'lowpass',.7,0,.6); },
    open(){ if(!live()) return; [57,62,66,69].forEach((m,i)=>tone(mtof(m),2.6,.028,'sine',mtof(m)*1.003,i*.05,.8,.35)); noise(1.4,.06,300,4200,'lowpass',.6,0,.6); },
    close(){ if(!live()) return; noise(1.1,.05,3000,300,'lowpass',.6,0,.5); tone(mtof(62),1.6,.025,'sine',0,0,.7,.2); },
    index(){ if(!live()) return; noise(.7,.04,600,2400,'bandpass',1.2,0,.4); tone(mtof(74),1.2,.02,'sine',0,.05,.7,.02); },
    tick(i){ if(!live()) return; tone(mtof(PENTA[(i||0)%PENTA.length]),.25,.014,'sine',0,0,.4,.003); },
    pick(){ if(!live()) return; glass(74,ctx.currentTime,.05,0,n.comp); glass(81,ctx.currentTime+.09,.03,0,n.comp); },
    rise(){ if(!live()) return; noise(1.6,.05,180,1500,'bandpass',1.4,0,.6); for(let i=0;i<9;i++) plip(.012+Math.random()*.012,.5+i*.22+Math.random()*.35); glass(69,ctx.currentTime+.1,.03,-.2,n.comp); },
  };
})();

/* ---- 10-gl.js ---- */
/* ================= RENDERER, QUALITY, SHARED SHADER CODE ================= */
const canvas=$('#gl');
let renderer=null;
/* every shader compiled on this page takes pow() of a number never below zero. pow() of a negative number is not a number on
   Windows (where the browser draws through Direct3D) and on many phones' graphics chips, and there the checks that would
   catch it are compiled away: one such pixel spreads through the glow into black squares across the screen */
{ const DEF='#define pow(a,b) pow(max(a,0.),b)\n';
  for(const C of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){ const P=C&&C.prototype; if(!P||P.__safePow) continue;
    const ss=P.shaderSource; P.shaderSource=function(sh,src){ if(typeof src==='string'&&src.indexOf('#define pow(')<0){ const m=src.match(/^\s*#version[^\n]*\n/); src=m?m[0]+DEF+src.slice(m[0].length):DEF+src; } return ss.call(this,sh,src); };
    P.__safePow=true; } }
const GL_OK=(()=>{
  if(!T) return false;
  try{ renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,stencil:false,depth:true,powerPreference:'high-performance'}); }catch(e){ return false; }
  return !!(renderer&&renderer.capabilities.isWebGL2);
})();

/* quality: what this device can afford. The frame timer below moves dpr up and down at run time */
const QL={
  dprMax:HQ?1:Math.min(devicePixelRatio||1, MOBILE?1.5:1.6),
  dpr:1, refl:HQ?.75:(MOBILE?.4:.5), sim:MOBILE?256:512, grass:MOBILE?.5:1, samples:HQ?4:((TEST||MOBILE)?0:2),
  ao:MOBILE?3:5, shadow:HQ?4096:(MOBILE?1024:2048), seeds:MOBILE?500:1100, bloomLv:MOBILE?4:5,
};
QL.dpr=TEST?1:Math.min(QL.dprMax,MOBILE?1.25:1.3);
/* functional tests can ask for cheap pixels: the page, the walk and the timing are the same */
if(window.__LOWQ){ QL.dpr=QL.dprMax=.5; QL.ao=2; QL.refl=.3; QL.grass=.3; QL.sim=256; QL.shadow=512; QL.seeds=300; QL.bloomLv=4; }

const GU={uTime:{value:0}, uRefl:{value:0}, uRes:{value:new T.Vector2(1,1)}};

function RT(w,h,o={}){
  return new T.WebGLRenderTarget(w,h,Object.assign({type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,
    depthBuffer:true,stencilBuffer:false,generateMipmaps:false,colorSpace:T.NoColorSpace},o));
}

if(GL_OK){
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFShadowMap; renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=T.NoToneMapping;
  renderer.info.autoReset=true;
}

/* ---------- GLSL ---------- */
const GLSL={};
GLSL.noise=`
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),f.x),mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),f.x),f.y);}
float vnoise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=hash13(i),b=hash13(i+vec3(1.,0.,0.)),c=hash13(i+vec3(0.,1.,0.)),d=hash13(i+vec3(1.,1.,0.));
  float e=hash13(i+vec3(0.,0.,1.)),g=hash13(i+vec3(1.,0.,1.)),h=hash13(i+vec3(0.,1.,1.)),k=hash13(i+vec3(1.,1.,1.));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,k,f.x),f.y),f.z);}
float fbm2(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+3.1;a*=.5;}return s;}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*vnoise3(p);p=p*2.03+1.7;a*=.5;}return s;}
`;
GLSL.sdf=`
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float archO(float x,float y,float r){ return y>0.?length(vec2(x,y))-r:abs(x)-r; }
float sdBox2(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,q.y),0.);}
`;
/* sunlight thrown back off moving water: thin bright braided lines, for stone near the waterline */
GLSL.caustic=`
float caustic(vec2 uv,float t){
  vec2 p=mod(uv*6.2831,6.2831)-250.; vec2 i=p; float c=1.,inten=.005;
  for(int n=0;n<3;n++){ float tt=t*(1.-(3.5/float(n+1))); i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten))); }
  c/=3.; c=1.17-pow(c,1.4); return pow(abs(c),7.);
}
`;
/* height haze: denser near the water, brighter toward the sun */
GLSL.haze=`
uniform vec3 uSunDir; uniform vec3 uHazeCol; uniform vec3 uHazeSun; uniform vec4 uFog;
vec3 haze(vec3 c,vec3 wp){
  vec3 v=wp-cameraPosition; float d=length(v); vec3 dir=v/max(d,1e-4);
  float k=max(uFog.y,1e-3), h0=max(cameraPosition.y,0.), h1=max(wp.y,0.), dh=h1-h0;
  float m=abs(dh*k)>1e-3?(exp(-k*h0)-exp(-k*h1))/(k*dh):exp(-k*h0);
  float f=min(1.-exp(-uFog.x*d*m),uFog.w);
  float s=pow(max(dot(dir,uSunDir),0.),uFog.z);
  return mix(c,mix(uHazeCol,uHazeSun,s),f);
}
`;
GLSL.ao=`
uniform float uAOk;
float sceneAO(vec3 p,vec3 n){
  float o=0.,ws=0.;
  for(int i=0;i<AO_N;i++){ float fi=(float(i)+1.)/float(AO_N); float h=.05+1.05*fi*fi; float d=mapAO(p+n*h); float w=1.-.45*fi; o+=w*clamp((h-d)/h,0.,1.); ws+=w; }
  return clamp(1.-uAOk*o/ws,0.,1.);
}
`;
/* pale stone: soft clouding, fine grain, travertine streaks, ashlar coursing on the flat faces */
GLSL.stone=`
uniform float uJoint; uniform vec3 uWarm;
vec3 stoneTex(vec3 p,vec3 n){
  vec3 an=abs(n);
  float b=fbm3(p*.21);
  float g=vnoise3(p*3.7)*.55+vnoise3(p*13.)*.45;
  float st=vnoise3(vec3(p.x*.55,p.y*8.,p.z*.55));
  float k=.9+.17*b+.06*g-.07*smoothstep(.62,.92,st);
  /* travertine: small pores drawn out along the bedding, gone before they are small enough to shimmer */
  { vec3 q=p*vec3(6.5,21.,6.5); float pn=vnoise3(q)*.7+vnoise3(q*2.3)*.3; float ps=length(fwidth(q));
    k*=1.-.15*smoothstep(.74,.8,pn)*(1.-smoothstep(.35,.9,ps))*(1.-step(.92,an.y)*.5); }
  if(uJoint>0.){
    float e=1.,id=0.;
    if(an.y>.92){ vec2 q=p.xz/1.24; vec2 f=abs(fract(q)-.5)*1.24; e=min(.62-f.x,.62-f.y); id=hash12(floor(q)); }
    else if(an.x>.92||an.z>.92){ float u=an.x>.92?p.z:p.x; float row=floor(p.y/.62); u+=mod(row,2.)*.62+row*.17;
      float fu=abs(fract(u/1.24)-.5)*1.24, fv=abs(fract(p.y/.62)-.5)*.62; e=min(.62-fu,.31-fv); id=hash12(vec2(floor(u/1.24),row)); }
    float fw=fwidth(e)*1.4+1e-4;
    float j=smoothstep(.0035,.0035+fw,e);
    float fade=1.-smoothstep(.008,.05,fw);
    k*=mix(1.,mix(.8,1.,j),fade*uJoint);
    k*=mix(1.,.945+.11*id,uJoint);
  }
  return vec3(k)*mix(vec3(.985,1.,1.02),uWarm,b);
}
`;

/* a scene's lighting atmosphere: its own sun, haze and ambient occlusion strength */
function sceneU(){
  return {uSunDir:{value:v3(0,1,0)}, uHazeCol:{value:col('#E9DFD2')}, uHazeSun:{value:col('#FFD9A8')}, uFog:{value:new T.Vector4(.0009,.04,7,.9)}, uAOk:{value:1.35}};
}

/* stone: MeshStandardMaterial with our grain, signed-distance ambient occlusion and haze stitched in.
   o.sdf is GLSL defining float mapAO(vec3 p) for this scene */
function stoneMat(o){
  const m=new T.MeshStandardMaterial({color:o.color||'#EDE3D3', roughness:o.rough??.92, metalness:0});
  m.userData.u={uJoint:{value:o.joint??1}, uWarm:{value:col(o.warm||'#FFF2DF')}, uMirror:{value:null}, uMirrorK:{value:o.mirrorK||0}, uTexMat:{value:new T.Matrix4()}, uEmis:{value:col(o.emis||'#000000')}};
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,o.U,m.userData.u,GU);
    const mir=!!o.mirror;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP; varying vec3 vWN;'+(mir?'\nuniform mat4 uTexMat; varying vec4 vMC;':''))
      .replace('#include <fog_vertex>','#include <fog_vertex>\n{ vec4 w4=modelMatrix*vec4(transformed,1.); vWP=w4.xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);'+(mir?' vMC=uTexMat*w4;':'')+' }');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n#define AO_N '+QL.ao+'\nvarying vec3 vWP; varying vec3 vWN;\nuniform vec3 uEmis; uniform float uRefl;'+(mir?'\nuniform sampler2D uMirror; uniform float uMirrorK; varying vec4 vMC;':'')
        +GLSL.noise+GLSL.sdf+(o.sdf||'float mapAO(vec3 p){return 1e5;}')+GLSL.ao+GLSL.haze+GLSL.stone+(o.caustic?GLSL.caustic:'')+(o.cav||'')+(o.glsl||''))
      .replace('#include <map_fragment>','#include <map_fragment>\n vec3 wN=normalize(vWN); diffuseColor.rgb*=stoneTex(vWP,wN);'+(o.albedo||''))
      .replace('#include <aomap_fragment>','#include <aomap_fragment>\n{ float ao=sceneAO(vWP,wN);'+(o.cav?' ao*=cavity(vWP,wN);':'')+' reflectedLight.indirectDiffuse*=ao; reflectedLight.indirectSpecular*=ao; reflectedLight.directDiffuse*=mix(1.,ao,.3); }')
      .replace('#include <opaque_fragment>',(mir?`{ vec2 ruv=vMC.xy/vMC.w; vec3 V=normalize(cameraPosition-vWP); float fr=.04+.96*((1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.)));
          vec3 rc=textureLod(uMirror,ruv,2.2).rgb*.55+textureLod(uMirror,ruv,4.).rgb*.45; outgoingLight+=rc*uMirrorK*mix(.25,1.,fr)*(1.-uRefl); }`:'')
        +'outgoingLight+=uEmis;'+(o.emisGLSL||'')+'\n#include <opaque_fragment>')
      .replace('#include <fog_fragment>','gl_FragColor.rgb=haze(gl_FragColor.rgb,vWP);');
  };
  m.customProgramCacheKey=()=>'stone:'+(o.key||'x')+(o.mirror?':m':'');
  return m;
}

/* ---------- planar mirror: the scene seen from under the water line ---------- */
const _mv={n:v3(0,1,0),p:v3(),c:v3(),v:v3(),l:v3(),t:v3(),rot:new T.Matrix4(),pl:new T.Plane(),cp:new T.Vector4(),q:new T.Vector4()};
class Mirror{
  constructor(scale,o={}){ this.scale=scale; this.y=o.y||0; this.bias=o.bias??.002;
    this.rt=RT(4,4,o.mips?{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter}:{}); this.cam=new T.PerspectiveCamera(); this.texMat=new T.Matrix4(); }
  setSize(w,h){ this.rt.setSize(Math.max(4,Math.floor(w*this.scale)),Math.max(4,Math.floor(h*this.scale))); }
  render(scene,cam,hide){
    const M=_mv, N=M.n, P=M.p.set(0,this.y,0); cam.updateMatrixWorld();
    const cp=M.c.setFromMatrixPosition(cam.matrixWorld);
    const view=M.v.subVectors(P,cp); if(view.dot(N)>0) return false;
    view.reflect(N).negate().add(P);
    M.rot.extractRotation(cam.matrixWorld);
    const look=M.l.set(0,0,-1).applyMatrix4(M.rot).add(cp);
    const tgt=M.t.subVectors(P,look); tgt.reflect(N).negate().add(P);
    const mc=this.cam; mc.position.copy(view); mc.up.set(0,1,0).applyMatrix4(M.rot).reflect(N); mc.lookAt(tgt);
    mc.near=cam.near; mc.far=cam.far; mc.fov=cam.fov; mc.aspect=cam.aspect; mc.updateMatrixWorld(); mc.projectionMatrix.copy(cam.projectionMatrix);
    this.texMat.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1).multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse);
    M.pl.setFromNormalAndCoplanarPoint(N,P).applyMatrix4(mc.matrixWorldInverse);
    const c=M.cp.set(M.pl.normal.x,M.pl.normal.y,M.pl.normal.z,M.pl.constant), pm=mc.projectionMatrix.elements, q=M.q;
    q.x=(Math.sign(c.x)+pm[8])/pm[0]; q.y=(Math.sign(c.y)+pm[9])/pm[5]; q.z=-1; q.w=(1+pm[10])/pm[14];
    c.multiplyScalar(2/c.dot(q)); pm[2]=c.x; pm[6]=c.y; pm[10]=c.z+1-this.bias; pm[14]=c.w;
    mc.projectionMatrixInverse.copy(mc.projectionMatrix).invert();
    for(const o of hide) o.visible=false;
    GU.uRefl.value=1; renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(scene,mc); GU.uRefl.value=0;
    for(const o of hide) o.visible=true;
    return true;
  }
}

/* geometry helpers */
function boxGeo(x0,x1,y0,y1,z0,z1){ const g=new T.BoxGeometry(x1-x0,y1-y0,z1-z0); g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); return g; }
function mergeGeos(list){
  /* a minimal merge: non-indexed position + normal only */
  let n=0; const gs=list.map(g=>g.index?g.toNonIndexed():g); gs.forEach(g=>n+=g.attributes.position.count);
  const P=new Float32Array(n*3), Nn=new Float32Array(n*3); let o=0;
  for(const g of gs){ P.set(g.attributes.position.array,o*3); Nn.set(g.attributes.normal.array,o*3); o+=g.attributes.position.count; }
  const m=new T.BufferGeometry(); m.setAttribute('position',new T.BufferAttribute(P,3)); m.setAttribute('normal',new T.BufferAttribute(Nn,3)); m.computeBoundingSphere(); m.computeBoundingBox(); return m;
}
const f3=a=>a.map(x=>(+x).toFixed(3)).join(',');

/* ---- 15-sky.js ---- */
/* ================= ONE EVENING: THE SUN, THE SKY, THE LIGHT =================
   Scroll is the time of day. Golden hour at Home, warmer through the gallery, sunset at Team, the sun
   touching the water at Contact with blue hour coming in overhead. The sundial reads the same sun. */
const SUN={el:14, az:40, dir:v3(0,1,0)};
/* walk position s to sun elevation and azimuth (degrees; azimuth measured from west toward south) */
const SUN_KEYS=[[0,13.5,40],[.5,13,44],[1,12,40],[2,10,18],[3,8.4,15],[4,6.8,10],[5,4.2,1],[5.5,1.8,-1],[6,.15,-4]];
function sunAt(s){
  const K=SUN_KEYS; if(s<=K[0][0]) return [K[0][1],K[0][2]];
  for(let i=0;i<K.length-1;i++){ const a=K[i],b=K[i+1]; if(s<=b[0]){ const t=(s-a[0])/(b[0]-a[0]), u=t*t*(3-2*t)*.35+t*.65; return [lerp(a[1],b[1],u),lerp(a[2],b[2],u)]; } }
  const l=K[K.length-1]; return [l[1]+(s-l[0])*-6,l[2]];
}
const sunDir=(el,az,out)=>out.set(-Math.cos(el*DEG)*Math.cos(az*DEG),Math.sin(el*DEG),Math.cos(el*DEG)*Math.sin(az*DEG)).normalize();

/* the palette of the evening, keyed by sun elevation */
const TOD_KEYS=[
  {e:16,  mid:'#B7C9E6', zen:'#7096CE', hor:'#F4DCCB', horS:'#FBCB9A', glow:'#FFC48A', sun:'#FFEDD2', belt:'#F3C8BE', beltK:.5, cl:'#FFEEDD', cs:'#C9BCC4',
          L:'#FFD09C', Li:5, sky:'#9DB2DE', gnd:'#CBAE96', hi:.44, haze:'#F2D6C0', hazeS:'#FFCB94'},
  {e:9,   mid:'#B4C2E2', zen:'#6B8CC7', hor:'#F5D3BE', horS:'#FDBE86', glow:'#FFB878', sun:'#FFE6C2', belt:'#F0C0BA', beltK:.6, cl:'#FFE2CA', cs:'#C4B4BC',
          L:'#FFC48C', Li:4.4, sky:'#9CADDB', gnd:'#C8A48E', hi:.46, haze:'#F1CEB6', hazeS:'#FFC084'},
  {e:4,   mid:'#AFBAE2', zen:'#5E7DBF', hor:'#F3C6A0', horS:'#FFA866', glow:'#FF9E58', sun:'#FFDAA4', belt:'#EBB4B8', beltK:.62, cl:'#FFC49C', cs:'#B3A2B4',
          L:'#FFB06E', Li:2.7, sky:'#9DAADA', gnd:'#BC9A8C', hi:.6, haze:'#EBC6AC', hazeS:'#FFA870'},
  {e:1,   mid:'#B1B6D8', zen:'#5E76B0', hor:'#F0B293', horS:'#FF8E55', glow:'#FF8648', sun:'#FFBE7E', belt:'#E6A6B0', beltK:.78, cl:'#FFA888', cs:'#A390A8',
          L:'#FF9A5C', Li:1.6, sky:'#9DA9D6', gnd:'#C4846E', hi:.78, haze:'#E0B2A2', hazeS:'#FF9864'},
  {e:-1.5,mid:'#9DA0C8', zen:'#4C62A0', hor:'#E0A294', horS:'#FA8858', glow:'#F57E4C', sun:'#FFA868', belt:'#D79CB0', beltK:.8, cl:'#F3988C', cs:'#8C80A2',
          L:'#FF9460', Li:.35, sky:'#93A0D0', gnd:'#9A7880', hi:.95, haze:'#C8A5AA', hazeS:'#F2986E'},
  {e:-4,  mid:'#8088BA', zen:'#384C8C', hor:'#B89AB0', horS:'#E88C6C', glow:'#DE785C', sun:'#E08A62', belt:'#B892AE', beltK:.55, cl:'#D28A92', cs:'#6E6A92',
          L:'#E08A62', Li:0, sky:'#8292C6', gnd:'#6C6884', hi:1.05, haze:'#9EA2C4', hazeS:'#DC9884'},
];
const TODC={}; ['mid','zen','hor','horS','glow','sun','belt','cl','cs','L','sky','gnd','haze','hazeS'].forEach(k=>TODC[k]=new T.Color());
const TOD={beltK:0,Li:0,hi:1};
const _ca=new T.Color(), _cb=new T.Color();
function todAt(el){
  const K=TOD_KEYS; let a=K[0],b=K[0],t=0;
  if(el>=K[0].e){ a=b=K[0]; } else if(el<=K[K.length-1].e){ a=b=K[K.length-1]; }
  else for(let i=0;i<K.length-1;i++){ if(el<=K[i].e&&el>=K[i+1].e){ a=K[i]; b=K[i+1]; t=(K[i].e-el)/(K[i].e-K[i+1].e); break; } }
  for(const k in TODC){ _ca.set(a[k]); _cb.set(b[k]); TODC[k].copy(_ca).lerp(_cb,t); }
  TOD.beltK=lerp(a.beltK,b.beltK,t); TOD.Li=lerp(a.Li,b.Li,t); TOD.hi=lerp(a.hi,b.hi,t);
  return TOD;
}

/* the sky dome: gradient, warm horizon toward the sun, the pink belt opposite it, glow, disc and thin cloud */
function skyMat(){
  const u={uSunDir:{value:v3(0,1,0)}, uMid:{value:new T.Color()}, uZen:{value:new T.Color()}, uHor:{value:new T.Color()}, uHorS:{value:new T.Color()}, uGlow:{value:new T.Color()},
    uSun:{value:new T.Color()}, uBelt:{value:new T.Color()}, uBeltK:{value:0}, uCl:{value:new T.Color()}, uCs:{value:new T.Color()}, uCloudK:{value:1}, uSunK:{value:1},
    uTime:GU.uTime, uRefl:GU.uRefl};
  return new T.ShaderMaterial({uniforms:u, side:T.BackSide, depthWrite:false, depthTest:true, fog:false,
    vertexShader:`varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=vec4(p.xy,p.w*.99999,p.w); }`,
    fragmentShader:`uniform vec3 uSunDir,uMid,uZen,uHor,uHorS,uGlow,uSun,uBelt,uCl,uCs; uniform float uBeltK,uCloudK,uSunK,uTime,uRefl; varying vec3 vD;
    ${GLSL.noise}
    vec3 skyCol(vec3 d){
      float y=d.y, hy=max(y,0.);
      vec3 c=mix(uHor,uMid,smoothstep(0.,.13,hy)); c=mix(c,uZen,smoothstep(.02,.34,hy));
      vec2 dh=normalize(d.xz+1e-5), sh=normalize(uSunDir.xz+1e-5); float az=dot(dh,sh)*.5+.5;
      c=mix(c,uHorS,pow(az,2.6)*exp(-hy*5.5));
      float anti=pow(1.-az,1.6);
      c=mix(c,uBelt,anti*uBeltK*exp(-(((hy-.085)/.075)*((hy-.085)/.075))));
      c=mix(c,uZen*vec3(.86,.9,1.05),anti*uBeltK*.5*exp(-((hy/.035)*(hy/.035)))*smoothstep(.07,-.02,uSunDir.y));
      float mu=dot(d,uSunDir);
      c+=uGlow*(((max(mu,0.))*(max(mu,0.))*(max(mu,0.))*(max(mu,0.))*(max(mu,0.)))*.28+pow(max(mu,0.),48.)*.75+pow(max(mu,0.),700.)*2.2)*uSunK;
      /* thin evening cloud, streaked along the horizon */
      vec2 cp=d.xz/(hy+.09);
      float n=fbm2(cp*vec2(.32,1.25)+vec2(uTime*.0025,0.)+vec2(7.,3.));
      float cl=smoothstep(.56,.86,n)*smoothstep(.0,.07,hy)*(1.-smoothstep(.22,.55,hy));
      vec3 cc=mix(uCs,uCl,pow(max(mu,0.)*.5+.5,2.2)+.25*smoothstep(.02,.15,hy));
      c=mix(c,cc,cl*uCloudK);
      float disc=smoothstep(.99982,.99991,mu)*uSunK;
      c+=uSun*disc*36.*(1.-cl*.7);
      if(y<0.) c=mix(c,uHor*.96,smoothstep(0.,-.06,y));
      return c;
    }
    void main(){ vec3 d=normalize(vD); gl_FragColor=vec4(skyCol(d),0.); }`});
}

/* ---- 20-water.js ---- */
/* ================= STILL WATER =================
   A wave equation on a ping-pong pair of targets: the cursor, a tap, a person rising from the pool
   all drop energy in and it spreads in rings. The water samples it for its normals.
   The simulated patch goes where you look: it follows the camera in whole texels, carrying its rings with it, so the
   water answers anywhere you can see it and a ring never slides */
const SIM={rect:new T.Vector4(-72,-60,128,128)}; // xz origin and size of the simulated patch, in metres
function makeSim(){
  const N=QL.sim, o={type:T.HalfFloatType,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,wrapS:T.ClampToEdgeWrapping,wrapT:T.ClampToEdgeWrapping};
  const a=RT(N,N,o), b=RT(N,N,o);
  const drops=[]; for(let i=0;i<4;i++) drops.push(new T.Vector4(0,0,0,0));
  const mat=new T.ShaderMaterial({uniforms:{tPrev:{value:null},uTx:{value:new T.Vector2(1/N,1/N)},uD:{value:drops},uSeg:{value:new T.Vector4()},uSegK:{value:0},uSize:{value:SIM.rect.z},uK:{value:.16},uDamp:{value:.986},uShift:{value:new T.Vector2()}},
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader:`uniform sampler2D tPrev; uniform vec2 uTx,uShift; uniform vec4 uD[4]; uniform vec4 uSeg; uniform float uSegK,uSize,uK,uDamp; varying vec2 vUv;
    float seg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.); return length(pa-ba*h); }
    vec4 at(vec2 u){ return (u.x<0.||u.y<0.||u.x>1.||u.y>1.)?vec4(0.):texture2D(tPrev,u); }
    void main(){
      vec2 u=vUv+uShift; vec4 c=at(u); float h=c.r, hp=c.g;
      float s=at(u+vec2(uTx.x,0.)).r+at(u-vec2(uTx.x,0.)).r+at(u+vec2(0.,uTx.y)).r+at(u-vec2(0.,uTx.y)).r;
      float nh=(2.*h-hp+uK*(s-4.*h))*uDamp;
      vec2 wp=vUv*uSize;
      for(int i=0;i<4;i++){ vec4 d=uD[i]; if(d.w!=0.){ float r=length(wp-d.xy)/d.z; nh+=d.w*exp(-r*r*2.); } }
      if(uSegK!=0.){ float r=seg(wp,uSeg.xy,uSeg.zw)/.55; nh+=uSegK*exp(-r*r*2.); }
      vec2 e=min(vUv,1.-vUv); nh*=smoothstep(0.,.02,min(e.x,e.y));
      gl_FragColor=vec4(clamp(nh,-4.,4.),h,0.,1.);
    }`, depthTest:false, depthWrite:false});
  const sc=new T.Scene(), q=new T.Mesh(new T.PlaneGeometry(2,2),mat); q.frustumCulled=false; sc.add(q);
  const cam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  let cur=a, prev=b, acc=0, nd=0, segW=null;
  const W=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], want={x:SIM.rect.x,y:SIM.rect.y}, TX=SIM.rect.z/N, _f=v3();
  const sim={ get tex(){ return cur.texture; },
    clear(){ [a,b].forEach(t=>{ renderer.setRenderTarget(t); renderer.setClearColor(0,0); renderer.clear(); }); renderer.setClearColor(0,0); },
    /* x,z world position, radius metres, strength: kept in the world until the next step places it in the patch */
    drop(x,z,r,k){ if(nd>=4) return; const w=W[nd++]; w[0]=x; w[1]=z; w[2]=r; w[3]=k; },
    stroke(x0,z0,x1,z1,k){ segW=[x0,z0,x1,z1,k]; },
    /* where the patch should be: centred a little ahead of the camera, over the water it is looking at */
    follow(c){ c.getWorldDirection(_f); _f.y=0; if(_f.lengthSq()<1e-6) _f.set(0,0,-1); _f.normalize();
      const sz=SIM.rect.z; want.x=c.position.x+_f.x*sz*.3-sz/2; want.y=c.position.z+_f.z*sz*.3-sz/2; },
    step(dt){
      acc+=dt; let n=0; const H=1/40, U=mat.uniforms;
      while(acc>=H&&n<3){ acc-=H; n++;
        if(n===1){
          /* move the patch in whole texels, and the rings with it */
          const dx=Math.round((want.x-SIM.rect.x)/TX), dz=Math.round((want.y-SIM.rect.y)/TX);
          U.uShift.value.set(dx/N,dz/N); SIM.rect.x+=dx*TX; SIM.rect.y+=dz*TX;
          for(let i=0;i<4;i++){ const w=W[i]; if(i<nd){ const u=w[0]-SIM.rect.x, v=w[1]-SIM.rect.y; drops[i].set(u,v,w[2],(u<0||v<0||u>SIM.rect.z||v>SIM.rect.w)?0:w[3]); } else drops[i].w=0; }
          if(segW){ U.uSeg.value.set(segW[0]-SIM.rect.x,segW[1]-SIM.rect.y,segW[2]-SIM.rect.x,segW[3]-SIM.rect.y); U.uSegK.value=segW[4]; }
        }
        U.tPrev.value=cur.texture; renderer.setRenderTarget(prev); renderer.render(sc,cam); const t=cur; cur=prev; prev=t;
        U.uShift.value.set(0,0); for(const d of drops) d.w=0; nd=0; segW=null; U.uSegK.value=0; }
      if(acc>H*3) acc=0;
    }};
  return sim;
}

/* the reflected headline: words drawn where the page shows them, mirrored about the horizon in the water */
const TXT={cv:document.createElement('canvas'), tex:null, dirty:true, scale:1};
TXT.ctx=TXT.cv.getContext('2d');
function drawReflectText(){
  const c=TXT.cv, k=TXT.scale, w=Math.max(2,Math.floor(innerWidth*k)), h=Math.max(2,Math.floor(innerHeight*k));
  if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
  const x=TXT.ctx; x.clearRect(0,0,w,h);
  $$('[data-reflect]').forEach(el=>{
    const ch=+el.dataset.reflect; x.fillStyle=ch?'#00ff00':'#ff0000'; x.globalCompositeOperation='lighter';
    const cs=getComputedStyle(el); x.font=`${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize)*k}px ${cs.fontFamily}`; x.textBaseline='alphabetic';
    /* measure the words where the layout puts them, ignoring the reveal animation's transforms */
    const sec=el.closest('.sec')||el, sr=sec.getBoundingClientRect(), words=$$('.w',el), list=words.length?words:[el];
    const m=x.measureText('Hg'), asc=m.fontBoundingBoxAscent||parseFloat(cs.fontSize)*k*.8, des=m.fontBoundingBoxDescent||parseFloat(cs.fontSize)*k*.22;
    for(const wd of list){ let L=0,Tp=0,n=wd; while(n&&n!==sec){ L+=n.offsetLeft; Tp+=n.offsetTop; n=n.offsetParent; } const h=wd.offsetHeight*k; if(!wd.offsetWidth) continue;
      const base=(sr.top+Tp)*k+(h-(asc+des))/2+asc;
      x.fillText(wd.textContent,(sr.left+L)*k,base); }
  });
  x.globalCompositeOperation='source-over';
  if(!TXT.tex){ TXT.tex=new T.CanvasTexture(c); TXT.tex.minFilter=T.LinearFilter; TXT.tex.generateMipmaps=false; }
  TXT.tex.needsUpdate=true; TXT.dirty=false;
}

function waterMat(U,mirror,sim,o={}){
  const u=Object.assign({tRefl:{value:mirror.rt.texture}, uTexMat:{value:mirror.texMat}, tSim:{value:null}, uSim:{value:SIM.rect}, uSimTx:{value:1/QL.sim},
    tText:{value:null}, uTextK:{value:new T.Vector2(0,0)}, uTextCol:{value:new T.Color('#2A2520')}, uHorizon:{value:.5},
    uDeep:{value:col(o.deep||'#122022')}, uSunCol:{value:new T.Color()}, uSky:{value:new T.Color()}, uRippleK:{value:1}, uWaveK:{value:1}, uSpec:{value:1}},GU,U);
  return new T.ShaderMaterial({uniforms:u,
    vertexShader:`uniform mat4 uTexMat; varying vec3 vWP; varying vec4 vMC; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vMC=uTexMat*w; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D tRefl,tSim,tText; uniform vec4 uSim; uniform float uSimTx,uTime,uHorizon,uRippleK,uWaveK,uSpec; uniform vec2 uRes,uTextK;
    uniform vec3 uDeep,uSunCol,uSky,uTextCol; varying vec3 vWP; varying vec4 vMC;
    ${GLSL.noise}${GLSL.haze}
    vec2 waves(vec2 p,float t){
      vec2 g=vec2(0.);
      g+=vec2(cos(p.x*.9+t*.7+p.y*.3),cos(p.y*1.1-t*.6))*.010;
      g+=vec2(cos(p.x*2.3-p.y*1.7+t*1.3),cos(p.y*2.1+p.x*1.3+t*1.1))*.0055;
      float n1=vnoise(p*1.6+t*.25), n2=vnoise(p*1.6+vec2(5.2,1.3)-t*.22);
      g+=(vec2(n1,n2)-.5)*.028;
      return g;
    }
    void main(){
      vec3 toC=cameraPosition-vWP; float dist=length(toC); vec3 V=toC/dist;
      vec2 suv=(vWP.xz-uSim.xy)/uSim.zw; vec2 rg=vec2(0.);
      if(suv.x>0.&&suv.y>0.&&suv.x<1.&&suv.y<1.){
        float hl=texture2D(tSim,suv-vec2(uSimTx,0.)).r, hr=texture2D(tSim,suv+vec2(uSimTx,0.)).r;
        float hd=texture2D(tSim,suv-vec2(0.,uSimTx)).r, hu=texture2D(tSim,suv+vec2(0.,uSimTx)).r;
        rg=vec2(hr-hl,hu-hd)*.9*uRippleK;
      }
      float far=1./(1.+dist*.035);
      float paw=smoothstep(.42,.78,vnoise(vWP.xz*.045+vec2(uTime*.018,-uTime*.011))+vnoise(vWP.xz*.11-uTime*.03)*.35);
      vec2 wg=waves(vWP.xz,uTime)*uWaveK*(.22+.78*far)*(.28+.95*paw);
      vec3 N=normalize(vec3(-(rg.x+wg.x),1.,-(rg.y+wg.y)));
      vec2 off=N.xz*(1.1/max(vMC.w,1.));
      vec2 ruv=vMC.xy/vMC.w+off;
      vec4 rf=texture2D(tRefl,ruv);
      float cs=max(dot(N,V),0.);
      float fr=.02+.98*((1.-cs)*(1.-cs)*(1.-cs)*(1.-cs)*(1.-cs));
      vec3 body=uDeep*(.55+.45*uSky);
      vec3 c=mix(body,rf.rgb,clamp(fr*1.04,0.,1.));
      vec3 Hh=normalize(uSunDir+V); float sp=pow(max(dot(N,Hh),0.),900.)*60.+pow(max(dot(N,Hh),0.),90.)*1.2;
      c+=uSunCol*sp*uSpec*fr*smoothstep(-.02,.06,uSunDir.y);
      /* the headline, mirrored about the horizon and broken by the same ripples */
      vec2 sp2=gl_FragCoord.xy/uRes; vec2 tuv=vec2(sp2.x,2.*uHorizon-sp2.y)+off*2.+vec2(rg.x,rg.y)*.006;
      vec4 tx=texture2D(tText,tuv);
      float ta=clamp(tx.r*uTextK.x+tx.g*uTextK.y,0.,1.)*(1.-rf.a)*smoothstep(.0,.08,uHorizon-sp2.y)*smoothstep(.0,.2,sp2.y)*.34;
      c=mix(c,uTextCol*(.6+.4*fr),ta*mix(.55,1.,fr));
      c=haze(c,vWP);
      gl_FragColor=vec4(c,1.);
    }`});
}

/* ---- 25-outside.js ---- */
/* ================= OUTSIDE: THE PAVILION IN STILL WATER =================
   One list of stone parts builds both the meshes and a signed distance function (GLSL) of the same shapes,
   so ambient occlusion is computed per pixel against the real architecture: arch reveals, corners, steps.
   Parts are gathered in groups inside a bounding box, so a pixel far from a group never pays for it. */
function Builder(){
  const B={geos:[], sdf:[]};
  const fx=x=>{ const v=(+x).toFixed(3); return v.indexOf('.')<0?v+'.':v; };
  const cen=(a,b)=>(a+b)/2, hal=(a,b)=>Math.abs(b-a)/2;
  B.box=(x0,x1,y0,y1,z0,z1,o={})=>{ B.geos.push(boxGeo(x0,x1,y0,y1,z0,z1));
    if(!o.nosdf) B.sdf.push(`d=min(d,sdBox(p-vec3(${f3([cen(x0,x1),cen(y0,y1),cen(z0,z1)])}),vec3(${f3([hal(x0,x1),hal(y0,y1),hal(z0,z1)])})));`); };
  /* a slab with openings. axis 'x' runs along x (its faces look along z), axis 'z' runs along z.
     openings: {c,w,hs} an arch rising from the slab's base; {c,w,hs,y} an arched window, sill at y;
     {c,w,y,h,rect:1} a rectangle; {c,y,r} a round window */
  B.wall=(axis,a0,a1,y0,y1,t0,t1,ops=[],o2={})=>{
    const isBase=o=>!o.r&&!o.rect&&(o.y===undefined||o.y<=y0+1e-4);
    const base=ops.filter(isBase).sort((p,q)=>p.c-q.c);
    const s=new T.Shape(); s.moveTo(a0,y0);
    for(const a of base){ const r=a.w/2; s.lineTo(a.c-r,y0); s.lineTo(a.c-r,y0+a.hs); s.absarc(a.c,y0+a.hs,r,Math.PI,0,true); s.lineTo(a.c+r,y0); }
    s.lineTo(a1,y0); s.lineTo(a1,y1); s.lineTo(a0,y1); s.lineTo(a0,y0);
    for(const h of ops){ if(isBase(h)) continue; const p=new T.Path();
      if(h.r){ p.absarc(h.c,h.y,h.r,0,TAU,false); }
      else if(h.rect){ const r=h.w/2; p.moveTo(h.c-r,h.y); p.lineTo(h.c+r,h.y); p.lineTo(h.c+r,h.y+h.h); p.lineTo(h.c-r,h.y+h.h); p.lineTo(h.c-r,h.y); }
      else { const r=h.w/2; p.moveTo(h.c-r,h.y); p.lineTo(h.c+r,h.y); p.lineTo(h.c+r,h.y+h.hs); p.absarc(h.c,h.y+h.hs,r,0,Math.PI,false); p.lineTo(h.c-r,h.y); }
      s.holes.push(p); }
    const g=new T.ExtrudeGeometry(s,{depth:t1-t0,bevelEnabled:false,curveSegments:o2.seg||28});
    if(axis==='x') g.translate(0,0,t0); else { g.rotateY(-Math.PI/2); g.translate(t1,0,0); }
    B.geos.push(g);
    const c=axis==='x'?[cen(a0,a1),cen(y0,y1),cen(t0,t1)]:[cen(t0,t1),cen(y0,y1),cen(a0,a1)], h=axis==='x'?[hal(a0,a1),hal(y0,y1),hal(t0,t1)]:[hal(t0,t1),hal(y0,y1),hal(a0,a1)];
    const along=axis==='x'?'p.x':'p.z';
    let code=`{ float w=sdBox(p-vec3(${f3(c)}),vec3(${f3(h)})); if(w<d&&w<1.25){ float o=1e5;`;
    for(const a of ops){
      if(a.r) code+=` o=min(o,length(vec2(${along},p.y)-vec2(${fx(a.c)},${fx(a.y)}))-${fx(a.r)});`;
      else if(a.rect) code+=` o=min(o,sdBox2(vec2(${along}-(${fx(a.c)}),p.y-(${fx(a.y+a.h/2)})),vec2(${fx(a.w/2)},${fx(a.h/2)})));`;
      else if(isBase(a)) code+=` o=min(o,archO(${along}-(${fx(a.c)}),p.y-(${fx(y0+a.hs)}),${fx(a.w/2)}));`;
      else code+=` o=min(o,max(archO(${along}-(${fx(a.c)}),p.y-(${fx(a.y+a.hs)}),${fx(a.w/2)}),${fx(a.y)}-p.y));`;
    }
    code+=` d=min(d,max(w,-o)); } }`; B.sdf.push(code);
  };
  /* a moulded band around an arch, standing proud of a face (legs carry it down the jambs) */
  B.ring=(axis,c,ys,r0,r1,t0,t1,legs=0)=>{
    const s=new T.Shape();
    s.moveTo(c+r1,ys-legs); if(legs) s.lineTo(c+r1,ys); s.absarc(c,ys,r1,0,Math.PI,false); if(legs) s.lineTo(c-r1,ys-legs);
    s.lineTo(c-r0,ys-legs); if(legs) s.lineTo(c-r0,ys); s.absarc(c,ys,r0,Math.PI,0,true); if(legs) s.lineTo(c+r0,ys-legs); s.lineTo(c+r1,ys-legs);
    const g=new T.ExtrudeGeometry(s,{depth:t1-t0,bevelEnabled:false,curveSegments:28});
    if(axis==='x') g.translate(0,0,t0); else { g.rotateY(-Math.PI/2); g.translate(t1,0,0); }
    B.geos.push(g);
    const along=axis==='x'?'p.x':'p.z', across=axis==='x'?'p.z':'p.x', rm=fx((r0+r1)/2), rh=fx((r1-r0)/2);
    B.sdf.push(`{ vec2 q=vec2(${along}-(${fx(c)}),p.y-(${fx(ys)})); float r=q.y>0.?abs(length(q)-${rm})-${rh}:max(abs(abs(q.x)-${rm})-${rh},-q.y-${fx(legs)}); d=min(d,max(r,abs(${across}-(${fx(cen(t0,t1))}))-${fx(hal(t0,t1))})); }`);
  };
  /* a moulded ring round a round window */
  B.disc=(axis,c,yc,r0,r1,t0,t1)=>{
    const s=new T.Shape(); s.absarc(c,yc,r1,0,TAU,false); const h=new T.Path(); h.absarc(c,yc,r0,0,TAU,true); s.holes.push(h);
    const g=new T.ExtrudeGeometry(s,{depth:t1-t0,bevelEnabled:false,curveSegments:40});
    if(axis==='x') g.translate(0,0,t0); else { g.rotateY(-Math.PI/2); g.translate(t1,0,0); }
    B.geos.push(g);
    const along=axis==='x'?'p.x':'p.z', across=axis==='x'?'p.z':'p.x';
    B.sdf.push(`d=min(d,max(abs(length(vec2(${along}-(${fx(c)}),p.y-(${fx(yc)})))-${fx((r0+r1)/2)})-${fx((r1-r0)/2)},abs(${across}-(${fx(cen(t0,t1))}))-${fx(hal(t0,t1))}));`);
  };
  /* everything added inside fn only costs a pixel that is within reach of this box */
  B.group=(x0,x1,y0,y1,z0,z1,fn)=>{ const i=B.sdf.length; fn(); const inner=B.sdf.splice(i);
    B.sdf.push(`if(sdBox(p-vec3(${f3([cen(x0,x1),cen(y0,y1),cen(z0,z1)])}),vec3(${f3([hal(x0,x1),hal(y0,y1),hal(z0,z1)])}))<1.2){\n${inner.join('\n')}\n}`); };
  B.raw=code=>B.sdf.push(code);
  B.glsl=()=>'float mapAO(vec3 p){ float d=p.y+1.2;\n'+B.sdf.join('\n')+'\nreturn d; }';
  return B;
}

const Y0=.32;            // the courtyard floor, a hand's width above the water
const YP=1.12;           // the pavilion's floor, seven steps up out of the water
/* the pavilion: wings with deep arcades either side of a tall portal, on a podium whose steps go down into the lake */
const PV={wing:8.6, face:9.9, portal:10.3, edge:10.9, half:13.2, rise:.155, tread:.42, n:7, arches:[5.85,8.15,10.45]};
PV.foot=PV.edge+PV.n*PV.tread;
const POOL={x0:-7.6,x1:8.6,z0:-16.5,z1:-3.9};
const PEOPLE_AT=[[7.6,-14.4],[7.6,-10.2],[7.6,-6]];   // in the water at the east end of the pool, each in the light of its own arch
const FAR_ARCH={z:-10.2,x:-11.5};                            // on the pool's axis: the last light comes straight down it

function buildPavilion(B){
  const P=PV, F=P.face, Z=P.portal, E=P.edge, H=YP;
  /* the podium, and its steps: the whole front goes down into the water */
  B.group(-P.half-.2,P.half+.2,-1.2,H+.1,.5,P.foot+.1,()=>{
    B.box(-P.half,P.half,-1.2,H-.12,.6,E-.05);
    B.box(-P.half-.05,P.half+.05,H-.12,H,.6,E+.04);
    for(let i=1;i<=P.n;i++){ const y=H-i*P.rise, z0=E+(i-1)*P.tread; B.box(-P.half,P.half,-1.2,y,z0-.03,z0+P.tread); }
  });
  /* the facade */
  B.group(-P.half,P.half,H,H+11.6,.5,Z+.6,()=>{
    for(const sg of [-1,1]){
      const L=(a,b)=>sg>0?[a,b]:[-b,-a];
      const [w0,w1]=L(4.1,12.6);
      /* an arcade 1.3 m thick: three slender arches, a square window over each */
      B.wall('x',w0,w1,H,H+8.2,P.wing,F,[...P.arches.map(c=>({c:sg*c,w:1.7,hs:4})),...P.arches.map(c=>({c:sg*c,w:.62,y:H+6.2,h:.62,rect:1}))]);
      /* the loggia behind it: a back wall, an end wall, a ceiling, and the mass of the building above */
      B.box(w0,w1,H,H+8.2,.6,5.6);
      { const [a,b]=L(12.0,12.6); B.box(a,b,H,H+8.2,5.6,P.wing); }
      { const [a,b]=L(4.1,12.0); B.box(a,b,H+5.6,H+8.2,5.6,P.wing-.9); B.box(a,b,H+5.6,H+5.9,P.wing-.9,P.wing); }
      /* relief: a corner pilaster, a plinth course and an impost on every pier, the frieze line */
      { const [a,b]=L(11.7,12.6); B.box(a,b,H,H+7.45,F,F+.16); B.box(a,b,H,H+.52,F+.16,F+.24); B.box(a,b,H+3.98,H+4.16,F+.16,F+.22); }
      for(const [p0,p1] of [[4.1,5.0],[6.7,7.3],[9.0,9.6],[11.3,11.7]]){ const [a,b]=L(p0,p1); B.box(a,b,H,H+.5,F,F+.1); B.box(a,b,H+4,H+4.16,F,F+.08); }
      B.box(w0,w1,H+7.45,H+7.6,F,F+.05);
      /* the cornice, returned round the corner, and a parapet set back above it */
      { const [a,b]=L(4.1,12.6+.14); B.box(a,b,H+8.2,H+8.34,F-.1,F+.14); }
      { const [a,b]=L(4.1,12.6+.46); B.box(a,b,H+8.34,H+8.68,F-.1,F+.46); }
      { const [a,b]=L(4.1,12.6+.34); B.box(a,b,H+8.68,H+8.78,F-.1,F+.34); }
      { const [a,b]=L(12.6,12.6+.14); B.box(a,b,H+8.2,H+8.34,.6,F); }
      { const [a,b]=L(12.6,12.6+.46); B.box(a,b,H+8.34,H+8.68,.6,F); }
      { const [a,b]=L(12.6,12.6+.34); B.box(a,b,H+8.68,H+8.78,.6,F); }
      { const [a,b]=L(4.1,12.6); B.box(a,b,H+8.78,H+9.32,.6,F-.05); }
      /* the portal block's piers, pilasters and cornice */
      { const [a,b]=L(2.0,4.1); B.box(a,b,H,H+11,8.0,Z-.3); B.box(a,b,H,H+11,Z-.3,Z); }
      { const [a,b]=L(3.38,4.1); B.box(a,b,H,H+7.45,Z,Z+.16); B.box(a,b,H,H+.52,Z+.16,Z+.24); B.box(a,b,H+5.2,H+5.38,Z+.16,Z+.22); }
      { const [a,b]=L(2.28,3.38); B.box(a,b,H,H+.5,Z,Z+.1); B.box(a,b,H+5.2,H+5.38,Z,Z+.08); }
    }
    /* the portal: a tall arch through 2.3 m of stone, a second order around it, a moulded frame, an oculus above */
    B.wall('x',-2.0,2.0,H,H+11,8.0,Z-.3,[{c:0,w:3.2,hs:5.2},{c:0,y:H+9.85,r:.72}]);
    B.wall('x',-2.0,2.0,H,H+11,Z-.3,Z,[{c:0,w:4.0,hs:5.2},{c:0,y:H+9.85,r:.72}]);
    B.ring('x',0,H+5.2,2.0,2.26,Z,Z+.07,4.7);
    B.disc('x',0,H+9.85,.72,.94,Z,Z+.07);
    B.box(-4.1,-2.0,H+7.45,H+7.6,Z,Z+.05); B.box(2.0,4.1,H+7.45,H+7.6,Z,Z+.05);
    B.box(-4.1-.14,4.1+.14,H+8.2,H+8.34,8.0,Z+.14); B.box(-4.1-.46,4.1+.46,H+8.34,H+8.68,8.0,Z+.46); B.box(-4.1-.34,4.1+.34,H+8.68,H+8.78,8.0,Z+.34);
    B.box(-4.1-.1,4.1+.1,H+11,H+11.12,7.9,Z+.1); B.box(-4.1-.3,4.1+.3,H+11.12,H+11.42,7.7,Z+.3);
    /* inside: a vestibule, then a smaller arch, and warm light beyond it */
    for(const sg of [-1,1]){ const L=(a,b)=>sg>0?[a,b]:[-b,-a];
      { const [a,b]=L(3.0,4.1); B.box(a,b,H,H+11,2.0,8.0); }
      { const [a,b]=L(1.2,3.0); B.box(a,b,H,H+11,.6,2.0); }
      { const [a,b]=L(1.2,4.1); B.box(a,b,H,H+11,.6,2.0); } }
    B.box(-3.0,3.0,H+7.6,H+11,2.0,8.0);
    B.wall('x',-3.0,3.0,H,H+7.6,2.0,3.0,[{c:0,w:2.4,hs:3.6}]);
    B.box(-1.2,1.2,H+4.85,H+11,.6,2.0);
  });
}
function buildOutside(){
  const W={name:'out', scene:new T.Scene(), U:sceneU(), t:0};
  const sc=W.scene;
  Object.assign(W.U,{uCaustK:{value:1}, uCaustCol:{value:new T.Color('#FFD7A0')}, uLampCol:{value:new T.Color('#FFB36A')}});
  const B=Builder();
  /* the courtyard terrace with the pool cut into it; the pavilion's podium in front of it */
  B.box(-14,14,-1.2,Y0,POOL.z1,.6,{nosdf:1}); B.box(-14,14,-1.2,Y0,-21.4,POOL.z0,{nosdf:1});
  B.box(-14,POOL.x0,-1.2,Y0,POOL.z0,POOL.z1,{nosdf:1}); B.box(POOL.x1,14,-1.2,Y0,POOL.z0,POOL.z1,{nosdf:1});
  B.raw(`d=min(d,max(sdBox(p-vec3(0.,-.44,-10.4),vec3(14.,.76,11.)),-sdBox(p-vec3(${((POOL.x0+POOL.x1)/2).toFixed(2)},0.,${((POOL.z0+POOL.z1)/2).toFixed(2)}),vec3(${((POOL.x1-POOL.x0)/2).toFixed(2)},1.,${((POOL.z1-POOL.z0)/2).toFixed(2)}))));`);
  /* steps down into the water from the far arch */
  B.box(-15.1,-14,-1.2,.2,FAR_ARCH.z-2,FAR_ARCH.z+2); B.box(-16.2,-15.1,-1.2,.08,FAR_ARCH.z-2,FAR_ARCH.z+2);
  buildPavilion(B);
  /* the courtyard: an open arcade to the west lets the sunset in; a lower east wall of niches catches it; benches by the pool */
  const CA=[{c:-2.2,w:2.6,hs:3.4},{c:-6,w:2.6,hs:3.4},{c:FAR_ARCH.z,w:3.4,hs:4.3},{c:-14.4,w:2.6,hs:3.4},{c:-18.2,w:2.6,hs:3.4}];
  const CE=[{c:-2.2,w:2.4,hs:2.3},{c:-6,w:2.4,hs:2.3},{c:FAR_ARCH.z,w:2.8,hs:2.5},{c:-14.4,w:2.4,hs:2.3},{c:-18.2,w:2.4,hs:2.3}];
  B.group(-14,14,Y0-.2,7.4,-21.8,1,()=>{
    B.wall('z',-21.4,.6,Y0,6.9,-12,-11,CA); B.box(-12.2,-10.8,6.9,7.22,-21.6,.8);
    B.wall('z',-21.4,.6,Y0,4.8,11,11.55,CE); B.box(11.55,12,Y0,4.8,-21.4,.6); B.box(10.84,12.2,4.8,5.1,-21.6,.8);
    B.wall('x',-11,11,Y0,4.8,-21.4,-20.4); B.box(-11,11,4.8,5.1,-21.6,-20.2);
    B.box(-5.2,5.2,Y0,.76,-17.7,-17.1); B.box(-5.2,5.2,Y0,.76,-3.3,-2.7);
  });
  W.sdfGLSL=B.glsl();

  /* how far a point is from open water (the lake round the platform, or the pool inside it) */
  const WATER=`float waterDist(vec2 q){
    float pl=min(sdBox2(q-vec2(0.,-10.4),vec2(14.,11.)),sdBox2(q-vec2(0.,${((.6+PV.foot)/2).toFixed(3)}),vec2(${PV.half.toFixed(2)},${((PV.foot-.6)/2).toFixed(3)})));
    float po=sdBox2(q-vec2(${((POOL.x0+POOL.x1)/2).toFixed(2)},${((POOL.z0+POOL.z1)/2).toFixed(2)}),vec2(${((POOL.x1-POOL.x0)/2).toFixed(2)},${((POOL.z1-POOL.z0)/2).toFixed(2)}));
    return min(-pl,po); }
  uniform float uCaustK,uTime; uniform vec3 uCaustCol,uLampCol;`;
  /* light the sky cannot reach: deep in the loggias, the vestibule, the oculus, the small square windows */
  const CAV=`float cavity(vec3 p,vec3 n){
    float c=1., ax=abs(p.x);
    float lg=step(4.1,ax)*(1.-step(12.,ax))*smoothstep(5.5,5.7,p.z)*(1.-smoothstep(${(PV.wing-.05).toFixed(2)},${(PV.wing+.15).toFixed(2)},p.z))*(1.-step(${(YP+5.62).toFixed(2)},p.y))*step(${(YP-.02).toFixed(2)},p.y);
    c*=mix(1.,.34+.36*smoothstep(5.6,${PV.wing.toFixed(2)},p.z),lg);
    float vs=(1.-smoothstep(2.9,3.05,ax))*step(.6,p.z)*(1.-smoothstep(7.8,8.2,p.z))*step(${(YP-.02).toFixed(2)},p.y);
    c*=mix(1.,.15+.25*smoothstep(1.,8.,p.z),vs);
    float pt=(1.-smoothstep(1.55,1.62,ax))*smoothstep(7.95,8.05,p.z)*(1.-smoothstep(${(PV.portal-.6).toFixed(2)},${(PV.portal).toFixed(2)},p.z))*(1.-step(${(YP+6.82).toFixed(2)},p.y));
    c*=mix(1.,.62,pt);
    float oc=(1.-smoothstep(.6,.74,length(vec2(p.x,p.y-${(YP+9.85).toFixed(2)}))))*(1.-smoothstep(${(PV.portal-.4).toFixed(2)},${(PV.portal-.1).toFixed(2)},p.z));
    c*=mix(1.,.18,oc);
    float wn=step(4.1,ax)*(1.-step(12.,ax))*step(${(YP+6.19).toFixed(2)},p.y)*(1.-step(${(YP+6.83).toFixed(2)},p.y))*step(${PV.wing.toFixed(2)},p.z)*(1.-smoothstep(${(PV.face-.5).toFixed(2)},${(PV.face-.1).toFixed(2)},p.z));
    c*=mix(1.,.3,wn);
    return c; }`;
  /* sunlight thrown back off the water, braided across the stone near it; the warm lamp deep in the vestibule; wet stone holding the sky */
  const EMIS=`
    { float wd=waterDist(vWP.xz); float kk=exp(-max(wd,0.)*.6)*exp(-max(vWP.y,0.)*.5)*(1.-step(.6,wN.y))*uCaustK;
      if(kk>.004){ vec3 sd=normalize(vec3(uSunDir.x,0.,uSunDir.z)); float face=max(dot(wN,sd),0.)*.85+max(-wN.y,0.)*.9;
        vec2 cu=abs(wN.x)>.5?vec2(vWP.z,vWP.y*2.2):vec2(vWP.x,vWP.y*2.2); if(wN.y<-.5) cu=vWP.xz;
        float c=caustic(cu*.33+vec2(0.,uTime*.02),uTime*.5)*.85+caustic(cu*.21+3.7,uTime*.37)*.55;
        outgoingLight+=diffuseColor.rgb*uCaustCol*c*kk*face; } }
    { vec3 lp=vec3(0.,${(YP+2.4).toFixed(2)},1.7); vec3 Lv=lp-vWP; float dl=length(Lv); Lv/=dl;
      float inV=(1.-smoothstep(2.95,3.1,abs(vWP.x)))*smoothstep(.6,1.2,vWP.z)*(1.-smoothstep(${(PV.portal-.1).toFixed(2)},${(PV.portal+.25).toFixed(2)},vWP.z))*(1.-smoothstep(${(YP+7.5).toFixed(2)},${(YP+7.8).toFixed(2)},vWP.y))*step(${(YP-.05).toFixed(2)},vWP.y);
      outgoingLight+=diffuseColor.rgb*uLampCol*inV*(max(dot(wN,Lv),0.)*.8+.2)*(2.4/(1.+dl*dl*.16)); }
    { float wet=1.-smoothstep(.0,.42,vWP.y);
      if(wet>.01){ vec3 V=normalize(cameraPosition-vWP); vec3 R=reflect(-V,wN); float fr=.04+.96*((1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.)));
        float sk=((max(dot(R,uSunDir),0.))*(max(dot(R,uSunDir),0.))*(max(dot(R,uSunDir),0.))*(max(dot(R,uSunDir),0.))*(max(dot(R,uSunDir),0.))); vec3 env=mix(uHazeCol,uHazeSun,sk)*(.7+.5*smoothstep(-.1,.4,R.y));
        outgoingLight+=env*fr*wet*.85; } }`;
  const stone=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'out', color:'#F2EADF', rough:.9, joint:1, caustic:1, cav:CAV, glsl:WATER, emisGLSL:EMIS,
    albedo:`{ float wet=1.-smoothstep(.02,.5,vWP.y); diffuseColor.rgb*=mix(1.,.7,wet*(wN.y>.9?.5:1.));
      if(abs(wN.y)<.5){ float u=abs(wN.x)>.5?vWP.z:vWP.x; float st=vnoise(vec2(u*2.3,vWP.y*.16))*vnoise(vec2(u*7.,vWP.y*.5)); diffuseColor.rgb*=1.-.1*smoothstep(.25,.6,st);
        /* years of rain run down from the cornice and the imposts; a little soiling at the foot of the walls */
        float s1=smoothstep(${(YP+5.4).toFixed(2)},${(YP+8.1).toFixed(2)},vWP.y)*(1.-step(${(YP+8.2).toFixed(2)},vWP.y));
        float s2=smoothstep(${(YP+2.7).toFixed(2)},${(YP+3.95).toFixed(2)},vWP.y)*(1.-step(${(YP+4.0).toFixed(2)},vWP.y))*.6;
        float sn=vnoise(vec2(u*5.3,vWP.y*.32))*vnoise(vec2(u*17.,vWP.y*1.05));
        diffuseColor.rgb*=1.-(s1+s2)*.16*smoothstep(.1,.45,sn);
        diffuseColor.rgb*=mix(.92,1.,smoothstep(${YP.toFixed(2)},${(YP+2.4).toFixed(2)},vWP.y)); } }`});
  const arch=new T.Mesh(mergeGeos(B.geos),stone); arch.castShadow=arch.receiveShadow=true; sc.add(arch);

  /* deep in the portal: a warm room glowing beyond the inner arch */
  const glowM=new T.ShaderMaterial({uniforms:{uC:{value:col('#FFB066')},uK:{value:4.2}},vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uC; uniform float uK; varying vec2 vUv; void main(){ float x=vUv.x-.5; float g=.5+.5*exp(-x*x*7.)*(1.15-vUv.y*.6)+.35*exp(-(((vUv.y-.08)*6.)*((vUv.y-.08)*6.)))*exp(-x*x*4.); gl_FragColor=vec4(uC*g*uK,1.); }`});
  const glow=new T.Mesh(new T.PlaneGeometry(2.4,4.9),glowM); glow.position.set(0,YP+2.45,1.0); sc.add(glow); W.glowM=glowM;

  /* stepping stones of the same pale stone: across the water to the steps, and out from the far arch toward the sunset */
  const stones=[];
  const slab=(w,d,top,th=.5)=>{ const sh=new T.Shape(), r=Math.min(w,d)*.26; sh.moveTo(-w/2+r,-d/2); sh.lineTo(w/2-r,-d/2); sh.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r); sh.lineTo(w/2,d/2-r); sh.quadraticCurveTo(w/2,d/2,w/2-r,d/2);
    sh.lineTo(-w/2+r,d/2); sh.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r); sh.lineTo(-w/2,-d/2+r); sh.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
    const g=new T.ExtrudeGeometry(sh,{depth:th,bevelEnabled:true,bevelThickness:.014,bevelSize:.02,bevelSegments:2,curveSegments:6}); g.rotateX(-Math.PI/2); g.translate(0,top-th-.014,0); return g; };
  const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  /* the path curves in from the right, where the walk begins, and straightens onto the axis at the steps */
  const homePath=[]; for(let i=0;i<30;i++){ const u=i/29, z=PV.foot+.75+u*76, t=clamp((z-14)/80,0,1); homePath.push([21*Math.pow(t,1.32)+.8*Math.sin(t*Math.PI*2.2)*t*(1-t)*4+(rnd()-.5)*.24,z]); }
  homePath.forEach(([x,z],i)=>{ const w=.9+rnd()*.5, d=.62+rnd()*.22; const g=slab(w,d,.03+rnd()*.02); g.rotateY((rnd()-.5)*.36); g.translate(x,0,z); stones.push(g); });
  for(let i=0;i<16;i++){ const x=-17.6-i*3.0-i*i*.07, z=FAR_ARCH.z+Math.sin(i*.6)*.45-i*.08; const w=1.0+rnd()*.25, d=.78+rnd()*.2;
    const g=slab(w,d,.03+rnd()*.02); g.rotateY((rnd()-.5)*.36); g.translate(x,0,z); stones.push(g); }
  const stoneM=stoneMat({U:W.U, sdf:'float mapAO(vec3 p){return p.y+.02;}', key:'stones', color:'#EEE5D8', rough:.75, joint:0, glsl:WATER,
    albedo:'{ float top=smoothstep(.55,.9,wN.y); diffuseColor.rgb*=mix(.66,1.,top)*mix(.8,1.,smoothstep(-.02,.06,vWP.y)); }',
    emisGLSL:`{ vec3 V=normalize(cameraPosition-vWP); vec3 R=reflect(-V,wN); float fr=.05+.95*((1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.)));
      float sk=((max(dot(R,uSunDir),0.))*(max(dot(R,uSunDir),0.))*(max(dot(R,uSunDir),0.))*(max(dot(R,uSunDir),0.))); vec3 env=mix(uHazeCol,uHazeSun,sk)*(.75+.45*smoothstep(-.1,.4,R.y));
      outgoingLight+=env*fr*.8; }`});
  const st=new T.Mesh(mergeGeos(stones),stoneM); st.receiveShadow=true; st.castShadow=true; sc.add(st);

  /* far shore: low hills deep in the haze */
  {
    const N=220, P=[], I=[];
    for(let i=0;i<=N;i++){ const a=i/N*TAU, r=760; const h=10+14*Math.pow(Math.sin(a*3.1+1.2)*.5+.5,2)+9*Math.sin(a*7.3+.4)*Math.sin(a*2.1)+5*Math.sin(a*17.)*.5;
      P.push(Math.cos(a)*r,-2,Math.sin(a)*r, Math.cos(a)*r,Math.max(2,h),Math.sin(a)*r); if(i<N){ const k=i*2; I.push(k,k+1,k+2, k+1,k+3,k+2); } }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setIndex(I);
    W.shoreMat=new T.ShaderMaterial({uniforms:Object.assign({uShore:{value:new T.Color('#9A9386')}},W.U),side:T.DoubleSide,
      vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform vec3 uShore; varying vec3 vWP; ${GLSL.haze} void main(){ gl_FragColor=vec4(haze(uShore,vWP),1.); }`});
    const m=new T.Mesh(g,W.shoreMat); m.frustumCulled=false; sc.add(m);
  }

  /* sky */
  W.sky=new T.Mesh(new T.SphereGeometry(900,48,24),skyMat()); W.sky.frustumCulled=false; W.sky.renderOrder=900; sc.add(W.sky);

  /* light: the low sun with soft shadows, the sky's own light, and the warm water bouncing it back */
  W.sun=new T.DirectionalLight('#FFE7C6',3); W.sun.castShadow=true;
  const sh=W.sun.shadow; sh.mapSize.set(QL.shadow,QL.shadow); sh.bias=-.0004; sh.normalBias=.045; sh.radius=3;
  const oc=sh.camera; oc.left=-30; oc.right=30; oc.top=30; oc.bottom=-30; oc.near=1; oc.far=180;
  W.sunT=new T.Object3D(); W.sunT.position.set(0,0,-4); sc.add(W.sunT); W.sun.target=W.sunT; sc.add(W.sun);
  W.hemi=new T.HemisphereLight('#C9DAF0','#DDBB95',.9); sc.add(W.hemi);

  /* water */
  W.mirror=new Mirror(QL.refl);
  W.sim=makeSim();
  W.waterMat=waterMat(W.U,W.mirror,W.sim);
  W.water=new T.Mesh(new T.PlaneGeometry(1800,1800,1,1),W.waterMat); W.water.rotation.x=-Math.PI/2; W.water.frustumCulled=false; sc.add(W.water);

  /* tall grass at the edges */
  W.grass=makeGrass(W.U,[
    {x:-11.5,z:84,rx:4.6,rz:5.4,n:1050,h:2.1},{x:-21,z:66,rx:6,rz:6,n:1300,h:1.5},{x:23,z:72,rx:5,rz:6,n:1100,h:1.6},{x:8.5,z:73,rx:4,rz:5,n:900,h:1.8},{x:-1.5,z:56,rx:2.6,rz:3,n:420,h:1.3},{x:4.5,z:90,rx:1.4,rz:1.6,n:220,h:1.2},{x:-26,z:46,rx:5,rz:6,n:700},{x:19,z:42,rx:5,rz:6,n:700},{x:-21,z:26,rx:4,rz:5,n:500},{x:17,z:22,rx:4,rz:5,n:500},{x:-16.5,z:9,rx:2.8,rz:4.5,n:420},{x:16.2,z:7,rx:2.6,rz:5,n:420},
    {x:-35,z:2,rx:6,rz:4.5,n:900},{x:-36,z:-19,rx:6.5,rz:4.5,n:900},{x:-58,z:-2,rx:3.5,rz:2.5,n:300},{x:-62,z:-15,rx:4,rz:2.5,n:320},
    {x:-10.2,z:-19.6,rx:.8,rz:.7,n:70,h:.7},{x:10.3,z:-19.7,rx:.7,rz:.7,n:60,h:.6},{x:-10.2,z:-.4,rx:.8,rz:.6,n:60,h:.7},{x:10.3,z:-.3,rx:.7,rz:.6,n:60,h:.6},
    {x:24,z:-6,rx:4,rz:7,n:500},{x:-25,z:-30,rx:5,rz:4,n:400}]);
  sc.add(W.grass.mesh);

  /* a few birds crossing the evening: high, slow, mostly gliding, now and then a few wingbeats */
  {
    const N=MOBILE?4:6, shape=[[0,.38,0],[-.12,-.1,0],[.12,-.1,0], [-.05,.06,0],[-1,.02,1],[-.06,-.12,0], [.05,.06,0],[1,.02,1],[.06,-.12,0], [-1,.02,1],[-.6,-.1,1],[-.06,-.12,0],[1,.02,1],[.6,-.1,1],[.06,-.12,0]];
    const P=[], Wt=[]; for(const v of shape){ P.push(v[0],v[1],0); Wt.push(v[2]); }
    const ig=new T.InstancedBufferGeometry(); ig.setAttribute('position',new T.Float32BufferAttribute(P,3)); ig.setAttribute('aW',new T.Float32BufferAttribute(Wt,1));
    const R=(()=>{let s=29;return()=>(s=(s*16807)%2147483647)/2147483647;})(), ia=new Float32Array(N*4);
    for(let i=0;i<N;i++){ ia[i*4]=R(); ia[i*4+1]=R(); ia[i*4+2]=R(); ia[i*4+3]=R(); }
    ig.setAttribute('aB',new T.InstancedBufferAttribute(ia,4)); ig.instanceCount=N; ig.boundingSphere=new T.Sphere(v3(),1e5);
    W.birdMat=new T.ShaderMaterial({uniforms:Object.assign({uTime:{value:0},uCol:{value:col('#4A4044')}},W.U),side:T.DoubleSide,
      vertexShader:`attribute float aW; attribute vec4 aB; uniform float uTime; varying vec3 vWP;
      void main(){
        float sp=5.5+aB.y*3.5, ph=fract(uTime*sp/340.+aB.x);
        vec3 c=vec3(170.-ph*340.,19.+aB.z*20.+sin(uTime*.21+aB.w*9.)*1.6,-58.+aB.w*70.+sin(ph*6.283+aB.x*5.)*7.);
        float beat=smoothstep(.55,.95,sin(uTime*.37+aB.x*31.)), flap=sin(uTime*(6.+aB.y*2.)+aB.z*20.)*beat;
        vec3 p=position; float s=.85+aB.y*.5; p.z=aW*abs(p.x)*mix(.1,flap*.65,beat);
        vec3 w=vec3(p.y*s,p.z*s,p.x*s);
        vec3 wp=c+vec3(-w.x,w.y,w.z); vWP=wp; gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);
      }`,
      fragmentShader:`uniform vec3 uCol; varying vec3 vWP; ${GLSL.haze} void main(){ gl_FragColor=vec4(haze(uCol,vWP),1.); }`});
    const birds=new T.Mesh(ig,W.birdMat); birds.frustumCulled=false; birds.renderOrder=905; sc.add(birds);
  }

  /* drifting seeds in the light */
  W.seeds=makeSeeds(W.U,QL.seeds); sc.add(W.seeds.mesh);

  /* the three of us: framed portraits on stone plinths at the east end of the pool. The water shows them first,
     though nothing stands there yet; then each one rises out of it, wet, and its reflection has something to reflect */
  const FP={ph:1.62, mat:.09, fr:.075, fd:.08, pw:1.96, pd:.54, phh:.58};
  FP.pw2=FP.ph*3/4; FP.iw=FP.pw2+FP.mat*2; FP.ih=FP.ph+FP.mat*2; FP.ow=FP.iw+FP.fr*2; FP.oh=FP.ih+FP.fr*2; FP.top=FP.phh+FP.oh;
  const frameGeo=(()=>{ const s=new T.Shape(), w=FP.ow/2, h=FP.oh; s.moveTo(-w,0); s.lineTo(w,0); s.lineTo(w,h); s.lineTo(-w,h); s.lineTo(-w,0);
    const p=new T.Path(), iw=FP.iw/2; p.moveTo(-iw,FP.fr); p.lineTo(-iw,FP.fr+FP.ih); p.lineTo(iw,FP.fr+FP.ih); p.lineTo(iw,FP.fr); p.lineTo(-iw,FP.fr); s.holes.push(p);
    const g=new T.ExtrudeGeometry(s,{depth:FP.fd-.02,bevelEnabled:true,bevelThickness:.01,bevelSize:.012,bevelSegments:2}); g.translate(0,FP.phh,-FP.fd/2+.01); return g; })();
  /* each plinth has the name cut into it like an inscription: upright roman capitals, spaced, the first name large and the
     rest on a line beneath, so even a long name is cut big enough to read across the pool. Red is the cut letters, blue the
     lit lower lip of each cut. Pointing at the portrait deepens the letters */
  const PLQ={w:2048,h:Math.round(2048*FP.phh/FP.pw)};
  const plaque=(el)=>{
    const cv=document.createElement('canvas'); cv.width=PLQ.w; cv.height=PLQ.h; const x=cv.getContext('2d');
    const tex=new T.CanvasTexture(cv); tex.anisotropy=16; tex.colorSpace=T.NoColorSpace;
    const nm=el.querySelector('.nm').textContent.trim(), parts=nm.split(' '), L1=parts[0].toUpperCase(), L2=parts.slice(1).join(' ').toUpperCase();
    const font=(z,ls=.16)=>{ x.font='400 '+z+'px "Libre Caslon Display", Georgia, serif'; if('letterSpacing' in x) x.letterSpacing=Math.round(z*ls)+'px'; };
    const fit=(t,max,z,ls)=>{ for(;z>18;z--){ font(z,ls); if(x.measureText(t).width<=max) break; } return z; };
    const cut=(t,cx,y,z,ls)=>{ font(z,ls); x.lineJoin='round'; x.lineWidth=Math.max(2,z*.03);
      x.fillStyle=x.strokeStyle='#00f'; x.fillText(t,cx,y+z*.05); x.strokeText(t,cx,y+z*.05);
      x.fillStyle=x.strokeStyle='#f00'; x.fillText(t,cx,y); x.strokeText(t,cx,y); };
    const draw=()=>{
      const W2=cv.width, H2=cv.height; x.clearRect(0,0,W2,H2); x.textAlign='center'; x.textBaseline='alphabetic'; x.globalCompositeOperation='lighter';
      const z1=fit(L1,W2*.78,Math.round(H2*.44)), z2=L2?fit(L2,W2*.88,Math.round(z1*.62),.1):0;
      const gap=z2?z2*.55:0, top=(H2-(z1*.72+gap+z2*.72))/2;   // capitals are about .72 of the size; centre the block
      cut(L1,W2/2,top+z1*.72,z1); if(L2) cut(L2,W2/2,top+z1*.72+gap+z2*.72,z2,.1);
      x.globalCompositeOperation='source-over'; if('letterSpacing' in x) x.letterSpacing='0px'; tex.needsUpdate=true; };
    draw();
    /* the inscription waits for its font */
    if(document.fonts&&document.fonts.load) document.fonts.load('400 160px "Libre Caslon Display"').then(draw,()=>{});
    return tex;
  };
  const PEO_EL=$$('#people .person');
  const bronze=new T.MeshStandardMaterial({color:'#86644A',roughness:.38,metalness:.62});
  const paper=new T.MeshStandardMaterial({color:'#EEE6D9',roughness:.92});
  W.people=PHOTOS.map((src,i)=>{
    const tex=new T.TextureLoader().load(src); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=8;
    const grp=new T.Group(); grp.position.set(PEOPLE_AT[i][0],0,PEOPLE_AT[i][1]); grp.rotation.y=-Math.PI/2; sc.add(grp);
    const plinthM=stoneMat({U:W.U, key:'plinth', color:'#EDE3D4', rough:.8, joint:0, glsl:'uniform float uWetP,uPlqHot; uniform sampler2D tPlq; uniform vec4 uPlq;',
      albedo:`diffuseColor.rgb*=1.-.3*uWetP;
        vec2 pq=vec2((vWP.z-uPlq.y)/${FP.pw.toFixed(3)}+.5,(vWP.y-uPlq.z)/${FP.phh.toFixed(3)});
        vec4 plq=texture2D(tPlq,clamp(pq,0.,1.))*step(0.,pq.x)*step(pq.x,1.)*step(0.,pq.y)*step(pq.y,1.)*step(wN.x,-.5);
        diffuseColor.rgb*=mix(vec3(1.),vec3(.12,.09,.07)*(1.-.35*uPlqHot),plq.r)*(1.+.42*plq.b*(1.-plq.r));`,
      emisGLSL:'{ vec3 V=normalize(cameraPosition-vWP); float fr=.04+.96*((1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))*(1.-max(dot(wN,V),0.))); outgoingLight+=uHazeSun*fr*uWetP*.5; }'}); 
    plinthM.userData.u.uWetP={value:0}; plinthM.userData.u.uPlqHot={value:0};
    plinthM.userData.u.tPlq={value:plaque(PEO_EL[i])}; plinthM.userData.u.uPlq={value:new T.Vector4(PEOPLE_AT[i][0]-FP.pd/2,PEOPLE_AT[i][1],0,0)};
    const plinth=new T.Mesh(boxGeo(-FP.pw/2,FP.pw/2,-.4,FP.phh,-FP.pd/2,FP.pd/2),plinthM); plinth.castShadow=plinth.receiveShadow=true; grp.add(plinth);
    const frame=new T.Mesh(frameGeo,bronze); frame.castShadow=frame.receiveShadow=true; grp.add(frame);
    const back=new T.Mesh(boxGeo(-FP.ow/2,FP.ow/2,FP.phh,FP.phh+FP.oh,-FP.fd/2,-FP.fd/2+.02),bronze); back.castShadow=true; grp.add(back);
    const mat=new T.Mesh(new T.PlaneGeometry(FP.iw,FP.ih),paper); mat.position.set(0,FP.phh+FP.fr+FP.ih/2,-FP.fd/2+.03); mat.receiveShadow=true; grp.add(mat);
    /* the photograph keeps its own light, warmed by the evening, a little glass sheen on it while it is wet */
    const pm=new T.ShaderMaterial({uniforms:Object.assign({tPhoto:{value:tex},uTintP:{value:new T.Color(1,1,1)},uWet:{value:0},uRefl:GU.uRefl},W.U),
      vertexShader:`varying vec2 vUv; varying vec3 vWP; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform sampler2D tPhoto; uniform float uWet,uRefl; uniform vec3 uTintP; varying vec2 vUv; varying vec3 vWP; ${GLSL.haze}
      void main(){ vec3 c=texture2D(tPhoto,vUv).rgb*uTintP;   /* the whole photograph, its own room behind each of us */
        float sh=smoothstep(.35,1.,vUv.y+vUv.x*.35)*.06+uWet*.1*smoothstep(.2,1.,vUv.y); c+=vec3(1.,.93,.85)*sh;
        if(uRefl>.5) c*=vec3(.86,.88,.9);
        gl_FragColor=vec4(haze(c,vWP),1.); }`});
    const photo=new T.Mesh(new T.PlaneGeometry(FP.pw2,FP.ph),pm); photo.position.set(0,FP.phh+FP.fr+FP.mat+FP.ph/2,-FP.fd/2+.05); grp.add(photo);
    return {grp,mat:pm,plinthM,reveal:0,target:0,wet:0,i,lift:0,x:PEOPLE_AT[i][0],z:PEOPLE_AT[i][1],h:FP.top,w:FP.pw};
  });
  W.FP=FP; W.PLQ=PLQ;
  const DEEP=-(FP.top+.25);

  /* sunbeams: the last light streaming through each arch of the west arcade, dust turning in it */
  W.beamMat=new T.ShaderMaterial({uniforms:Object.assign({uK:{value:0},uTime:GU.uTime,uCol:{value:new T.Color('#FFC890')}},W.U),transparent:true,depthWrite:false,side:T.DoubleSide,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`attribute float aL; varying float vL; varying vec3 vWP; varying vec3 vN; void main(){ vL=aL; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uK,uTime; uniform vec3 uCol; varying float vL; varying vec3 vWP; varying vec3 vN; ${GLSL.noise}${GLSL.haze.split('vec3 haze')[0]}
    void main(){ vec3 V=normalize(vWP-cameraPosition); float face=abs(dot(normalize(vN),V)); float look=((max(dot(V,uSunDir),0.))*(max(dot(V,uSunDir),0.))*(max(dot(V,uSunDir),0.)));
      float n=.55+.45*vnoise(vec2(vWP.z*1.3+uTime*.12,vWP.y*1.6-uTime*.08)+vWP.x*.07);
      float a=pow(1.-vL,1.6)*smoothstep(0.,.04,vL)*(.25+.75*face)*(.16+1.6*look)*n;
      gl_FragColor=vec4(uCol*a*.055*uK,1.); }`});
  const beams=[];
  for(const a of CA){ const r=a.w/2-.05, sp=a.hs, sh=new T.Shape(); sh.moveTo(-r,0); sh.lineTo(-r,sp); sh.absarc(0,sp,r,Math.PI,0,true); sh.lineTo(r,0); sh.lineTo(-r,0);
    const L=24, g=new T.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false,curveSegments:16,steps:1});
    const pos=g.attributes.position, al=new Float32Array(pos.count); for(let i=0;i<pos.count;i++) al[i]=pos.getZ(i)/L; g.setAttribute('aL',new T.BufferAttribute(al,1));
    g.rotateY(Math.PI/2); const m=new T.Mesh(g,W.beamMat); m.position.set(-11.6,Y0,a.c); m.frustumCulled=false; m.renderOrder=960; sc.add(m); beams.push(m); }
  W.beams=beams;
  W.hideInMirror=[W.water,W.seeds.mesh,...beams];
  /* the last thing on the walk: a rocket from the far shore, now and then */
  W.launch=makeLaunch(W);
  W.update=(dt,st)=>{
    W.launch.update(dt,S.s);
    { const gu=W.grass.mat.uniforms; gu.uMouseK.value=damp(gu.uMouseK.value,M.on&&S.mode==='world'?1:0,4,dt); gu.uMouseN.value.set(M.x/innerWidth*2-1,-(M.y/innerHeight*2-1)); gu.uAsp.value=innerWidth/innerHeight; const c=CAM.out; c.updateMatrixWorld(); gu.uVP.value.multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse); gu.uRight.value.setFromMatrixColumn(c.matrixWorld,0); }
    W.grass.mat.uniforms.uTime.value+=dt*S.timeScale; W.seeds.mat.uniforms.uTime.value+=dt*S.timeScale; W.birdMat.uniforms.uTime.value+=dt*S.timeScale;
    for(const p of W.people){
      const prev=p.reveal; p.reveal=damp(p.reveal,p.target,p.target>p.reveal?1.55:1.25,dt); if(Math.abs(p.reveal-p.target)<1e-4) p.reveal=p.target;
      p.hov=damp(p.hov||0,p.hot&&p.reveal>.9?1:0,4,dt);
      const y=lerp(DEEP,0,E.io2(clamp(p.reveal,0,1)))+p.hov*.07, dy=y-p.lift; p.lift=y; p.grp.position.y=y;
      const pu=p.plinthM.userData.u; pu.uPlq.value.z=y; pu.uPlqHot.value=p.hov;
      /* wet as it comes up, drying slowly once it stands */
      p.wet=p.target>0&&p.reveal<.98?Math.min(1,p.wet+dt*2):Math.max(0,p.wet-dt*.16);
      p.plinthM.userData.u.uWetP.value=p.wet; p.mat.uniforms.uWet.value=p.wet;
      /* the water parts where it rises: rings along the plinth's foot while it moves, and one when it breaks the surface */
      if(Math.abs(dy)>1e-4&&Math.abs(dy)<.6&&y>-FP.top){ const k=clamp(Math.abs(dy)/Math.max(dt,1e-3)*.12,0,.26)*(dy>0?-1:1), o=(S.frame%2?.45:-.45); W.sim.drop(p.x-FP.pd/2-.06,p.z+o,.42,k); W.sim.drop(p.x+FP.pd/2+.06,p.z-o,.42,k*.6); }
      if(prev<.04&&p.reveal>=.04&&p.reveal<.5) W.sim.drop(p.x,p.z,1.1,-.75);
    }
  };
  W.applyLight=(tod,tint)=>{ applyOutsideLight(W,tod,tint); W.launch.light();
    const k=sstep(4.45,4.8,S.s)*(1-sstep(5.85,6.1,S.s))*sstep(-.5,1.5,SUN.el); W.beamMat.uniforms.uK.value=k;
    const yaw=Math.atan2(SUN.dir.z,-SUN.dir.x), pitch=Math.asin(clamp(SUN.dir.y,-1,1));
    for(const b of W.beams){ b.visible=k>.001; b.rotation.set(0,yaw,-pitch,'YZX'); } };
  W.render=(cam,target)=>{
    W.sky.position.copy(cam.position);
    /* the water already knows us: in the reflection the portraits always stand, risen or not.
       The mirror uses last frame's shadows, so nothing that has not risen casts one */
    for(const p of W.people){ p.grp.position.y=0; p.plinthM.userData.u.uPlq.value.z=0; }
    renderer.shadowMap.needsUpdate=false;
    W.mirror.render(sc,cam,W.hideInMirror);
    for(const p of W.people){ p.grp.position.y=p.lift; p.plinthM.userData.u.uPlq.value.z=p.lift; }
    renderer.shadowMap.needsUpdate=true;
    W.waterMat.uniforms.tSim.value=W.sim.tex;
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(sc,cam);
  };
  W.setSize=(w,h)=>W.mirror.setSize(w,h);
  return W;
}

function applyOutsideLight(W,tod,tint){
  const U=W.U, sky=W.sky.material.uniforms;
  U.uSunDir.value.copy(SUN.dir); sky.uSunDir.value.copy(SUN.dir);
  sky.uMid.value.copy(TODC.mid); sky.uZen.value.copy(TODC.zen); sky.uHor.value.copy(TODC.hor); sky.uHorS.value.copy(TODC.horS); sky.uGlow.value.copy(TODC.glow);
  sky.uSun.value.copy(TODC.sun); sky.uBelt.value.copy(TODC.belt); sky.uBeltK.value=tod.beltK; sky.uCl.value.copy(TODC.cl); sky.uCs.value.copy(TODC.cs);
  sky.uSunK.value=sstep(-2.2,-.2,SUN.el);
  W.sun.color.copy(TODC.L); W.sun.intensity=tod.Li*sstep(-1.2,1.2,SUN.el);
  W.sun.position.copy(W.sunT.position).addScaledVector(SUN.dir,90);
  W.hemi.color.copy(TODC.sky); W.hemi.groundColor.copy(TODC.gnd); W.hemi.intensity=tod.hi;
  U.uHazeCol.value.copy(TODC.haze); U.uHazeSun.value.copy(TODC.hazeS);
  U.uCaustK.value=sstep(-1,3,SUN.el); U.uCaustCol.value.copy(TODC.L).multiplyScalar(tod.Li*.15);
  const wm=W.waterMat.uniforms; wm.uSunCol.value.copy(TODC.sun).multiplyScalar(sstep(-1.5,1,SUN.el)); wm.uSky.value.copy(TODC.zen);
  W.shoreMat.uniforms.uShore.value.copy(TODC.haze).lerp(TODC.zen,.35).multiplyScalar(.8);
  const gm=W.grass.mat.uniforms; gm.uSunCol.value.copy(TODC.L).multiplyScalar(tod.Li/3*sstep(-1.5,1.5,SUN.el)); gm.uAmb.value.copy(TODC.sky).multiplyScalar(.36*tod.hi).lerp(TODC.gnd,.25);
  W.seeds.mat.uniforms.uCol.value.copy(TODC.sun).lerp(TODC.glow,.4);
  for(const p of W.people) p.mat.uniforms.uTintP.value.set(1,1,1).lerp(TODC.L,.3).multiplyScalar(1.02);
}

/* ---------- grass: instanced blades bending in a slow travelling wind ---------- */
function makeGrass(U,clumps){
  const SEG=5, P=[], I=[];
  for(let i=0;i<=SEG;i++){ const t=i/SEG; P.push(-.5,t,0, .5,t,0); if(i<SEG){ const k=i*2; I.push(k,k+1,k+2, k+1,k+3,k+2); } }
  const base=new T.BufferGeometry(); base.setAttribute('position',new T.Float32BufferAttribute(P,3)); base.setIndex(I);
  const g=new T.InstancedBufferGeometry(); g.index=base.index; g.attributes.position=base.attributes.position;
  let n=0; clumps.forEach(c=>n+=Math.round(c.n*QL.grass));
  const off=new Float32Array(n*4), rnd=new Float32Array(n*4); let k=0;
  const R=(()=>{let s=11;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(const c of clumps){ const m=Math.round(c.n*QL.grass);
    for(let i=0;i<m;i++){ let x,z,r; do{ x=(R()*2-1); z=(R()*2-1); r=x*x+z*z; }while(r>1);
      const edge=1-Math.sqrt(r);
      off[k*4]=c.x+x*c.rx; off[k*4+1]=c.z+z*c.rz; off[k*4+2]=(c.h||1.25)*(.3+.9*Math.pow(edge,.6)*(.45+R()*.75)); off[k*4+3]=R()*TAU;
      rnd[k*4]=R(); rnd[k*4+1]=(R()-.5)*.7; rnd[k*4+2]=.024+R()*.034; rnd[k*4+3]=R(); k++; } }
  g.setAttribute('aOff',new T.InstancedBufferAttribute(off,4)); g.setAttribute('aRnd',new T.InstancedBufferAttribute(rnd,4)); g.instanceCount=n;
  g.boundingSphere=new T.Sphere(v3(0,0,0),1e4);
  const mat=new T.ShaderMaterial({uniforms:Object.assign({uTime:{value:0},uWind:{value:1},uSunCol:{value:new T.Color('#FFE0B0')},uAmb:{value:new T.Color('#8090A0')},
      uBase:{value:col('#4F4A2E')},uMid:{value:col('#9A8752')},uTip:{value:col('#E8D29E')},uMouseN:{value:new T.Vector2(9,9)},uMouseK:{value:0},uAsp:{value:1},uVP:{value:new T.Matrix4()},uRight:{value:v3(1,0,0)}},U),
    side:T.DoubleSide,
    vertexShader:`attribute vec4 aOff; attribute vec4 aRnd; uniform float uTime,uWind,uMouseK,uAsp; uniform vec2 uMouseN; uniform mat4 uVP; uniform vec3 uRight; varying float vT; varying vec3 vWP; varying float vH; varying vec3 vN;
    ${GLSL.noise}
    void main(){
      float t=position.y; float H=aOff.z; float ang=aOff.w;
      vec2 dir=vec2(cos(ang),sin(ang));
      vec2 wd=normalize(vec2(.8,.35));
      float gust=vnoise(aOff.xy*.09-wd*uTime*.55)*.9+vnoise(aOff.xy*.3-wd*uTime*1.3)*.4;
      float sway=sin(uTime*1.6+aRnd.x*6.283+aOff.x*.4)*.12+(gust-.55)*.9;
      float bend=(aRnd.y*2.1+.32+sway*uWind)*pow(t,1.6);
      vec2 bd=normalize(wd+vec2(cos(aRnd.x*9.),sin(aRnd.x*9.))*.5);
      float w=aRnd.z*(1.-t*.9)*clamp(length(vec3(aOff.x,0.,aOff.y)-cameraPosition)/14.,1.,3.2);
      vec3 p=vec3(aOff.x,-.12,aOff.y)+vec3(dir.x*position.x*w,t*H*(1.-.18*bend*bend),dir.y*position.x*w)+vec3(bd.x,0.,bd.y)*bend*H*.55;
      /* the hand brushes the reeds: blades near the cursor lean away from it */
      if(uMouseK>0.){ vec4 cl=uVP*vec4(p,1.); vec2 nd=cl.xy/cl.w-uMouseN; nd.x*=uAsp; float r=length(nd);
        float f=smoothstep(.2,0.,r)*t*t*uMouseK*step(0.,cl.w);
        p+=uRight*(nd.x/max(r,1e-3))*f*H*.45; p.y-=f*H*.12; }
      vT=t; vH=aRnd.w; vWP=p; vN=normalize(vec3(-dir.y,.35,dir.x));
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
    }`,
    fragmentShader:`uniform vec3 uSunCol,uAmb,uBase,uMid,uTip; varying float vT; varying vec3 vWP; varying float vH; varying vec3 vN;
    ${GLSL.haze}
    void main(){
      vec3 c=mix(uBase,uMid,smoothstep(0.,.5,vT)); c=mix(c,uTip,smoothstep(.5,1.,vT)); c=mix(c,c*vec3(1.08,1.,.82),step(.7,vH)); c=mix(c,vec3(dot(c,vec3(.33))),.18*step(vH,.25)); c*=.86+.26*vH;
      vec3 V=normalize(vWP-cameraPosition);
      float dif=.45+.55*abs(dot(normalize(vN),uSunDir));
      float back=((max(dot(V,uSunDir),0.))*(max(dot(V,uSunDir),0.))*(max(dot(V,uSunDir),0.)))*smoothstep(.3,1.,vT);
      vec3 l=c*(uAmb+uSunCol*dif*.85)+uSunCol*uTip*back*1.3;
      l*=mix(.55,1.,smoothstep(0.,.35,vT));
      gl_FragColor=vec4(haze(l,vWP),1.);
    }`});
  const mesh=new T.Mesh(g,mat); mesh.frustumCulled=false;
  return {mesh,mat};
}

/* ---------- seeds and dust: drifting points that catch the sun ---------- */
function makeSeeds(U,N){
  const g=new T.BufferGeometry(), r=new Float32Array(N*4), p=new Float32Array(N*3);
  for(let i=0;i<N*4;i++) r[i]=Math.random();
  g.setAttribute('position',new T.BufferAttribute(p,3)); g.setAttribute('aR',new T.BufferAttribute(r,4)); g.boundingSphere=new T.Sphere(v3(),1e5);
  const mat=new T.ShaderMaterial({uniforms:Object.assign({uTime:{value:0},uPx:{value:600},uBox:{value:v3(56,11,56)},uSize:{value:.055},uCol:{value:new T.Color('#FFEED6')},uK:{value:1}},U),
    transparent:true, depthWrite:false, blending:T.CustomBlending, blendEquation:T.AddEquation, blendSrc:T.OneFactor, blendDst:T.OneFactor, blendSrcAlpha:T.ZeroFactor, blendDstAlpha:T.OneFactor,
    vertexShader:`attribute vec4 aR; uniform float uTime,uPx,uSize; uniform vec3 uBox; varying float vA; ${GLSL.haze.split('vec3 haze')[0]}
    void main(){
      vec3 p=aR.xyz*uBox;
      float t=uTime;
      p+=vec3(t*.42,t*.05,t*.16)+vec3(sin(t*.45+aR.y*20.),sin(t*.37+aR.x*17.)*.6,sin(t*.41+aR.z*13.))*.7;
      vec3 c=cameraPosition;
      p.xz=mod(p.xz-c.xz+uBox.xz*.5,uBox.xz)-uBox.xz*.5+c.xz;
      p.y=mod(p.y,uBox.y)+.25;
      vec4 mv=viewMatrix*vec4(p,1.); float d=-mv.z;
      gl_PointSize=clamp(uSize*(.45+aR.w*1.1)*uPx/max(d,.1),1.,38.);
      vec3 dir=normalize(p-c); float fs=((max(dot(dir,uSunDir),0.))*(max(dot(dir,uSunDir),0.))*(max(dot(dir,uSunDir),0.))*(max(dot(dir,uSunDir),0.))*(max(dot(dir,uSunDir),0.)));
      vA=smoothstep(.6,2.2,d)*(1.-smoothstep(21.,27.,length(p.xz-c.xz)))*(.75+2.4*fs+.5*aR.z)*smoothstep(.1,.5,p.y);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying float vA; void main(){ vec2 q=gl_PointCoord-.5; float d=length(q); float a=smoothstep(.5,.0,d); a=a*a*.7+smoothstep(.18,.0,d)*.6; gl_FragColor=vec4(uCol*a*vA*uK*.8,1.); }`});
  const mesh=new T.Points(g,mat); mesh.frustumCulled=false; mesh.renderOrder=950;
  return {mesh,mat};
}

/* ---- 27-launch.js ---- */
/* ================= THE LAST LIGHT: A ROCKET FROM THE FAR SHORE =================
   At the last stop, now and then a rocket goes up from behind the far hills into the evening, the same cream and
   peach rocket as the one in the wild universe. Its sound comes a couple of seconds after its light, because it is far.
   Catch it and the camera follows it up out of the sky into the night: that is the way into orbit, at Aetos. */
const LAUNCH={vis:false, ph:-1, wait:1.6, turn:.16, heard:0, near:0, go:false, gt:0, back:false, left:false, href:'', camK:0, fov:16, dark:0,
  p:v3(), dir:v3(0,1,0), mid:v3(), sc:new T.Vector3(), scr:{x:-1,y:-1,on:false}};
const L_T=21, L_GAP=5, L_LIFT=1.3;   // a flight, the quiet between flights, the engines lit behind the hills before it rises
function makeLaunch(W){
  const sc=W.scene, g=new T.Group(); g.visible=false; sc.add(g);
  /* where it goes up: behind the far hills, right of the sun as you look out from the last stop, then turning away to the
     right so it climbs clear of the words. A narrow screen sees less of the sky, so there it goes up nearer the middle */
  const CAMC=v3(-24.5,0,-9.7), FWD=v3(-.9989,0,-.0102), RIGHT=v3(.0102,0,-.9989), D=785, H=60, HILL=24, L0=v3();
  const base=()=>{ const port=portrait(), a=(port?5.5:12.5)*DEG; L0.copy(CAMC).addScaledVector(FWD,D*Math.cos(a)).addScaledVector(RIGHT,D*Math.sin(a)).setY(-14); LAUNCH.turn=port?.05:.16; pre.mesh.position.set(L0.x,6,L0.z); };
  /* where it is t seconds after it rises, and gt seconds after you caught it, when it really goes */
  const pos=(t,gt,o)=>{ const up=.5*2.3*t*t+(gt>0?11*gt*gt:0); return o.copy(L0).addScaledVector(RIGHT,LAUNCH.turn*up+LAUNCH.turn*.0018*up*up).setY(L0.y+up); };
  /* its own light: the low sun on one side, the sky on the other, the evening haze over it, eased so it still reads */
  const RV=`varying vec3 vN,vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
  const lit=[];
  const mat=c=>{ const m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:col(c)},uSunCol:{value:new T.Color('#FFD2A6')},uSkyCol:{value:new T.Color('#B9B4CE')}},W.U),
    vertexShader:RV, fragmentShader:`uniform vec3 uC,uSunCol,uSkyCol; varying vec3 vN,vWP; ${GLSL.haze}
      void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vWP);
        float key=max(dot(N,normalize(uSunDir+vec3(0.,.25,0.))),0.), rim=((1.-abs(dot(N,V)))*(1.-abs(dot(N,V)))*(1.-abs(dot(N,V))));
        /* the low sun is behind it from where you stand, so the evening sky and the lake light the side you see */
        float fill=.55+.45*max(dot(N,V),0.);
        vec3 c=uC*(uSkyCol*.45+uSunCol*key*.8+vec3(1.,.86,.76)*fill*.62)+uSunCol*rim*.4;
        gl_FragColor=vec4(mix(c,haze(c,vWP),.38),1.); }`}); lit.push(m); return m; };
  const body=new T.Group(); g.add(body);
  const part=(geo,c,y)=>{ const m=new T.Mesh(geo,mat(c)); m.position.y=y; m.frustumCulled=false; body.add(m); return m; };
  part(new T.CylinderGeometry(2.2,2.9,4,20),'#3B3633',2);
  part(new T.CylinderGeometry(3.2,3.2,44,28),'#F4EFE6',26);
  part(new T.CylinderGeometry(3.26,3.26,3,28),'#EF8A3C',37.5);
  part(new T.ConeGeometry(3.2,12,28),'#F4EFE6',54);
  for(let i=0;i<4;i++){ const f=new T.Mesh(new T.BoxGeometry(.5,9,6.5),mat('#F2B98D')), a=i*Math.PI/2+.4;
    f.position.set(Math.cos(a)*5.6,7.5,Math.sin(a)*5.6); f.rotation.y=-a; f.frustumCulled=false; body.add(f); }
  /* the flame and its glow, which is all you can make out of it while it is far */
  const flU={uTime:GU.uTime,uK:{value:0}};
  const flG=new T.CylinderGeometry(2.6,.2,24,20,6,true); flG.translate(0,-12,0);
  const flame=new T.Mesh(flG,new T.ShaderMaterial({uniforms:flU,...ADD,side:T.DoubleSide,
    vertexShader:`uniform float uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 p=position; vY=clamp(-p.y/24.,0.,1.); p.xz*=1.+.18*sin(uTime*29.+p.y*.9)*vY; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uK,uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),V));
      vec3 c=mix(vec3(1.,.95,.8),vec3(1.,.55,.22),vY); float a=pow(f,1.3)*(1.-vY*.85)*(.86+.14*sin(uTime*41.)); gl_FragColor=vec4(c*a*uK*2.2,1.); }`}));
  flame.frustumCulled=false; body.add(flame);
  const glow=glowSprite('#FFD3A0',16); glow.mesh.position.y=-3; glow.mesh.renderOrder=962; body.add(glow.mesh);
  /* behind the hills before it rises: the light of the engines on the haze */
  const pre=glowSprite('#FFC48E',70); pre.mesh.renderOrder=961; pre.U.uK.value=0; sc.add(pre.mesh); base();
  /* the smoke it leaves, lit by the low sun: puffs that spread and fade */
  const NP=MOBILE?180:300, pp=new Float32Array(NP*3), pb=new Float32Array(NP).fill(-99);
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(pp,3)); tg.setAttribute('aB',new T.BufferAttribute(pb,1)); tg.boundingSphere=new T.Sphere(v3(),1e5);
  const TU={uNow:{value:0},uPx:{value:600},uCol:{value:new T.Color('#FFC7A8')},uK:{value:1}};
  const trail=new T.Points(tg,new T.ShaderMaterial({uniforms:TU,...ADD,
    vertexShader:`attribute float aB; uniform float uNow,uPx; varying float vA; void main(){ float age=uNow-aB; vec4 mv=viewMatrix*vec4(position+vec3(age*.9,age*.5,0.),1.);
      vA=(age<0.||aB<-90.)?0.:exp(-age/5.5)*smoothstep(0.,.35,age); gl_PointSize=clamp((7.5+age*2.6)*uPx/max(-mv.z,1.),1.5,64.); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.08,d); gl_FragColor=vec4(uCol*a*vA*.11*uK,1.); }`}));
  trail.frustumCulled=false; trail.renderOrder=958; sc.add(trail);
  let ip=0, gone=0; const lastP=v3();
  const _b=v3(), _q=new T.Quaternion(), Y=v3(0,1,0);
  return {
    update(dt,s){
      const here=s>5.9&&(S.mode==='world'||S.mode==='launch');
      /* the first one goes up soon after you arrive; then one now and then while you stay */
      if(!here&&!LAUNCH.go){ if(LAUNCH.ph>=0&&s<5.6){ LAUNCH.ph=-1; LAUNCH.wait=1.6; } }
      else if(LAUNCH.ph<0){ LAUNCH.wait-=dt; if(LAUNCH.wait<=0){ LAUNCH.ph=0; base(); } }
      if(LAUNCH.ph<0){ g.visible=false; LAUNCH.vis=false; LAUNCH.heard=0; pre.U.uK.value=0; return; }
      LAUNCH.ph+=dt; const ph=LAUNCH.ph, t=Math.max(0,ph-L_LIFT), gt=LAUNCH.go?LAUNCH.gt:0;
      const p=pos(t,gt,LAUNCH.p); pos(t+.2,gt+(LAUNCH.go?.2:0),_b);
      LAUNCH.dir.subVectors(_b,p); if(LAUNCH.dir.lengthSq()<1e-6) LAUNCH.dir.set(0,1,0); LAUNCH.dir.normalize();
      g.position.copy(p); _q.setFromUnitVectors(Y,LAUNCH.dir); g.quaternion.copy(_q);
      const ign=sstep(0,L_LIFT,ph), fly=ph>=L_LIFT;
      pre.U.uK.value=ign*(1-sstep(L_LIFT,L_LIFT+2.5,ph))*1.1; pre.U.uS.value=.8+.4*ign;
      flU.uK.value=fly?1:0; glow.U.uK.value=fly?1.6:0; glow.U.uS.value=1+.08*Math.sin(GU.uTime.value*37.);
      g.visible=fly&&(ph<L_T||LAUNCH.go);
      LAUNCH.vis=g.visible&&p.y>HILL-6;
      LAUNCH.mid.copy(p).addScaledVector(LAUNCH.dir,H*.45);
      /* smoke from the nozzle, a puff every couple of metres it climbs, so the column stays whole however fast it goes */
      if(g.visible){ if(gone<0) lastP.copy(p); const step=p.distanceTo(lastP); gone+=step; let n=0;
        while(gone>=2.4&&n<12){ gone-=2.4; n++; const f=gone/Math.max(step,1e-3), k=ip%NP;
          pp[k*3]=p.x+(lastP.x-p.x)*f+(Math.random()-.5)*2.5; pp[k*3+1]=p.y+(lastP.y-p.y)*f-2; pp[k*3+2]=p.z+(lastP.z-p.z)*f+(Math.random()-.5)*2.5; pb[k]=GU.uTime.value; ip++; }
        if(n) tg.attributes.position.needsUpdate=tg.attributes.aB.needsUpdate=true; lastP.copy(p); } else gone=-1;
      TU.uNow.value=GU.uTime.value; TU.uPx.value=G.px;
      /* the sound of it, which comes from that far away about two seconds late */
      const late=ph-2.3; LAUNCH.heard=late<0?0:(late<L_LIFT?sstep(0,L_LIFT,late)*.6:1-sstep(L_T-5,L_T+1,late))*(here?1:0);
      if(!LAUNCH.go&&ph>=L_T+L_GAP){ LAUNCH.ph=0; base(); }
    },
    /* the evening's light on it */
    light(){ for(const m of lit){ m.uniforms.uSunCol.value.copy(TODC.sun).multiplyScalar(.9); m.uniforms.uSkyCol.value.copy(TODC.zen).lerp(TODC.hor,.5); }
      TU.uCol.value.copy(TODC.sun).lerp(TODC.hor,.35); TU.uK.value=.6+.6*sstep(-2,4,SUN.el); },
  };
}

/* the round hit area that follows it: Fly on the cursor, and a tap target big enough for a thumb */
const RK=$('#rocket');
function launchHit(){
  const on=!!(OUT&&OUT.launch)&&LAUNCH.vis&&!LAUNCH.go&&S.mode==='world'&&!HOLD.open;
  if(on){ const v=LAUNCH.sc.copy(LAUNCH.mid).project(CAM.out); const x=(v.x*.5+.5)*innerWidth, y=(-v.y*.5+.5)*innerHeight;
    LAUNCH.scr.x=x; LAUNCH.scr.y=y; LAUNCH.scr.on=v.z<1&&x>-30&&x<innerWidth+30&&y>-30&&y<innerHeight+30;
    if(LAUNCH.scr.on){ RK.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; RK.style.setProperty('--rs',(FINE?112:136)+'px'); } }
  else LAUNCH.scr.on=false;
  const show=on&&LAUNCH.scr.on; if(show!==RK.classList.contains('on')){ RK.classList.toggle('on',show); RK.tabIndex=show?0:-1; }
}
/* caught: on this site the camera follows it up into the night and then the page changes; when the way into orbit lives
   somewhere else, the link opens in its own tab and the evening comes back here */
RK.addEventListener('click',e=>{
  if(!LAUNCH.vis||LAUNCH.go||S.mode!=='world'){ e.preventDefault(); return; }
  const local=sameSite(RK.getAttribute('href')||'');
  if(local) e.preventDefault();
  LAUNCH.go=true; LAUNCH.gt=0; LAUNCH.back=!local; LAUNCH.left=false; LAUNCH.href=RK.href; S.mode='launch';
  ui.classList.add('leaving'); RK.classList.remove('on'); A.rocketGo();
});
function launchTick(dt){
  if(!LAUNCH.go){ LAUNCH.camK=damp(LAUNCH.camK,0,2.4,dt); LAUNCH.dark=damp(LAUNCH.dark,0,2.2,dt); LAUNCH.near=damp(LAUNCH.near,0,2,dt); return; }
  if(!LAUNCH.hold) LAUNCH.gt+=dt; const t=LAUNCH.gt;   // (hold: only the stills tests stop its clock)
  LAUNCH.camK=RM?0:E.io(clamp(t/1.15,0,1)); LAUNCH.fov=lerp(16,11,sstep(1,2.6,t));
  LAUNCH.dark=sstep(RM?0:.85,RM?1:2.3,t); LAUNCH.near=sstep(0,1.6,t);
  if(!LAUNCH.back&&t>=2.75&&!LAUNCH.left){ LAUNCH.left=true; location.assign(LAUNCH.href); }
  if(LAUNCH.back&&t>=3.4){ LAUNCH.go=false; LAUNCH.ph=L_T+L_GAP-6; S.mode='world'; ui.classList.remove('leaving'); }
}

/* ---- 30-gallery.js ---- */
/* ================= THE GALLERY: FOUR ROOMS OF LIGHT =================
   Bigger inside than out. Rooms in a line, doorways aligned, so each room shows the next one's light. */
const ROOM={L:16, W:12, H:7.2, T:1.2, z0:-6};
const roomZ=k=>ROOM.z0-ROOM.T-ROOM.L/2-k*(ROOM.L+ROOM.T);
const wallZ=k=>ROOM.z0-k*(ROOM.L+ROOM.T);
const EXIT_Z=wallZ(4)-ROOM.T;

function buildGallery(){
  const W={name:'gal', scene:new T.Scene(), U:sceneU(), t:0};
  const sc=W.scene, H=ROOM.H, B=Builder();
  const zA=1, zB=EXIT_Z-8;
  B.raw(`d=min(d,p.y);`);
  /* side walls, the vestibule and the exit corridor */
  B.box(-7,-6,0,H+.6,wallZ(4)-ROOM.T,wallZ(0)); B.box(6,7,0,H+.6,wallZ(4)-ROOM.T,wallZ(0));
  /* each group only costs a pixel within reach of it: a room never pays for the rooms beyond it */
  B.group(-6,6,0,H+.6,wallZ(0),zA,()=>{ B.box(-6,-2.2,0,H+.6,wallZ(0),zA); B.box(2.2,6,0,H+.6,wallZ(0),zA); B.box(-2.2,2.2,5.6,H+.6,wallZ(0),zA); });
  B.group(-6,6,0,H+.6,zB,EXIT_Z,()=>{ B.box(-6,-2.2,0,H+.6,zB,EXIT_Z); B.box(2.2,6,0,H+.6,zB,EXIT_Z); B.box(-2.2,2.2,5.6,H+.6,zB,EXIT_Z); });
  for(let k=0;k<=4;k++) B.wall('x',-7,7,0,H+.6,wallZ(k)-ROOM.T,wallZ(k),[{c:0,w:2.8,hs:3.45}]);
  /* ceilings: plain over Kríos and Pharos, a square opening over Aetos, a round shaft over Ogive, wherever each room is */
  const z0=k=>wallZ(k)-ROOM.T, z1=k=>wallZ(k+1), sA=SLOT.aetos, sP=SLOT.pharos, sO=SLOT.ogive, sK=SLOT.krios;
  B.box(-6,6,H,H+.6,z1(sK),z0(sK)); B.box(-6,6,H,H+.6,z1(sP),z0(sP));
  const AP=2.1, ac=roomZ(sA);
  B.box(-6,6,H,H+.06,ac+AP,z0(sA),{nosdf:1}); B.box(-6,6,H,H+.06,z1(sA),ac-AP,{nosdf:1}); B.box(-6,-AP,H,H+.06,ac-AP,ac+AP,{nosdf:1}); B.box(AP,6,H,H+.06,ac-AP,ac+AP,{nosdf:1});
  B.box(-6,6,H+.06,H+.8,ac+AP+.9,z0(sA),{nosdf:1}); B.box(-6,6,H+.06,H+.8,z1(sA),ac-AP-.9,{nosdf:1}); B.box(-6,-AP-.9,H+.06,H+.8,ac-AP-.9,ac+AP+.9,{nosdf:1}); B.box(AP+.9,6,H+.06,H+.8,ac-AP-.9,ac+AP+.9,{nosdf:1});
  /* the skyspace's ceiling, and the stone bench round the room */
  const bz0=z1(sA)+.15, bz1=z0(sA)-.15;
  B.group(-6,6,0,H+.8,z1(sA),z0(sA),()=>{
    B.raw(`d=min(d,max(sdBox(p-vec3(0.,${H+.03},${ac.toFixed(3)}),vec3(6.,.03,8.)),-sdBox(p-vec3(0.,${H},${ac.toFixed(3)}),vec3(${AP},1.,${AP}))));`);
    B.box(-6,-5.45,0,.46,bz0,bz1); B.box(5.45,6,0,.46,bz0,bz1); B.box(-5.45,-1.7,0,.46,bz0,bz0+.55); B.box(1.7,5.45,0,.46,bz0,bz0+.55);
  });
  const oc=roomZ(sO), OR=1.8;
  {
    const s=new T.Shape(); s.moveTo(-6,-z0(sO)); s.lineTo(6,-z0(sO)); s.lineTo(6,-z1(sO)); s.lineTo(-6,-z1(sO)); s.lineTo(-6,-z0(sO));
    const hp=new T.Path(); hp.absarc(0,-oc,OR,0,TAU,false); s.holes.push(hp);
    const g=new T.ExtrudeGeometry(s,{depth:.6,bevelEnabled:false,curveSegments:48}); g.rotateX(-Math.PI/2); g.translate(0,H,0); B.geos.push(g);
    B.raw(`d=min(d,max(sdBox(p-vec3(0.,${H+.3},${oc.toFixed(3)}),vec3(6.,.3,8.)),-(length(p.xz-vec2(0.,${oc.toFixed(3)}))-${OR})));`);
    const sh=new T.CylinderGeometry(OR,OR,40,64,1,true); sh.translate(0,H+.6+20,oc);
    const idx=sh.index.array; for(let i=0;i<idx.length;i+=3){ const t=idx[i]; idx[i]=idx[i+2]; idx[i+2]=t; } // face inward
    sh.computeVertexNormals(); const nn=sh.attributes.normal.array; for(let i=0;i<nn.length;i++) nn[i]*=-1;
    W.shaftGeo=sh;
  }
  W.sdfGLSL=B.glsl();
  /* Pharos: the room is dark stone. The floor is a map, drawn in light only where the drone's camera is looking,
     with the square it thinks it is in and its circle of doubt */
  Object.assign(W.U,{uPhD:{value:new T.Vector4(0,roomZ(sP),0,1.2)}, uPhM:{value:new T.Vector4(0,roomZ(sP),.6,0)}, uPhC:{value:new T.Vector4(0,roomZ(sP),0,.95)}, uPhCol:{value:col('#FFD5B3')}, uPhK:{value:1}});
  const PHM=`${(z0(sP)+.3).toFixed(2)},${(z0(sP)-.4).toFixed(2)},vWP.z)*smoothstep(${(z1(sP)-.3).toFixed(2)},${(z1(sP)+.4).toFixed(2)},vWP.z)`;
  const stone=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'gal', color:'#ECE5DA', rough:.88, joint:.55, warm:'#FFF4E6',
    albedo:`{ float ph=smoothstep(${PHM}; diffuseColor.rgb*=mix(1.,.27,ph); }`});
  const PHG=`uniform vec4 uPhD,uPhM,uPhC; uniform vec3 uPhCol; uniform float uPhK,uTime;
    float mapLines(vec2 q){ float h=(vnoise(q*.11+3.)*.66+vnoise(q*.24+5.3)*.34)*14.+vnoise(q*.4+7.)*1.2; float dd=abs(fract(h+.5)-.5); float fw=fwidth(h)*1.2+.002;
      float line=1.-smoothstep(0.,.022+fw,dd); float major=1.-smoothstep(0.,.03+fw*.2,abs(fract(h*.2+.5)-.5)*5.);
      vec2 gq=abs(fract(q/1.24+.5)-.5)*1.24; float gw=fwidth(q.x)+fwidth(q.y); float grid=1.-smoothstep(0.,.005+gw,min(gq.x,gq.y));
      vec2 cq=abs(fract(q/4.96+.5)-.5)*4.96; float cross=(1.-smoothstep(.0,.012+gw,min(cq.x,cq.y)))*step(max(cq.x,cq.y),.16);
      return clamp(line*.42+major*.6+grid*.2+cross*.9,0.,1.); }
    float lakeK(vec2 q){ vec2 d=(q-vec2(${PH_LAKE[0].toFixed(3)},${PH_LAKE[1].toFixed(3)}))/vec2(${PH_LAKE[2].toFixed(3)},${PH_LAKE[3].toFixed(3)});
      return 1.-smoothstep(.92,1.04,length(d)+.05*(vnoise(q*2.3)-.5)); }`;
  const PHE=`{ float ph=smoothstep(${PHM};
    if(ph>.01&&uPhK>0.){ vec2 q=vWP.xz, d=q-uPhD.xy; float c=cos(uPhD.z), s=sin(uPhD.z);
      vec2 l=vec2(d.x*c-d.y*s,d.x*s+d.y*c); float e=max(abs(l.x),abs(l.y))/uPhD.w, fe=fwidth(e)*1.5+.002;
      float seen=1.-smoothstep(.94,1.,e), lk=lakeK(q), ml=mapLines(q)*(1.-lk);
      float water=lk*(.15+.07*sin(q.x*7.+uTime*.5)*sin(q.y*5.-uTime*.35));
      float frame=1.-smoothstep(0.,fe+.012,abs(e-1.));
      vec2 dm=q-uPhM.xy, lm=vec2(dm.x*c-dm.y*s,dm.x*s+dm.y*c); float em=max(abs(lm.x),abs(lm.y))/uPhD.w, fm=fwidth(em)*1.5+.002;
      float along=abs(lm.x)>abs(lm.y)?lm.y:lm.x, dash=mix(step(.45,fract(along*4.2)),1.,uPhM.w);
      float match=(1.-smoothstep(0.,fm+.016,abs(em-1.)))*dash;
      float rd=length(dm), rr=abs(rd-uPhM.z), fr=fwidth(rd)*1.5+.002; float ring=(1.-smoothstep(0.,fr+.01,rr))*(.3+.7*(1.-uPhM.w));
      float cr=(1.-smoothstep(0.,fm*.5+.01,min(abs(lm.x),abs(lm.y))))*step(max(abs(lm.x),abs(lm.y)),.12*uPhD.w)*uPhM.w;
      vec3 add=uPhCol*(seen*(ml*.9+water+.045)+frame*.35*seen)+uPhCol*(match*(.5+.9*uPhM.w)+ring*.55+cr*1.1)+uPhCol*ml*.022;
      /* your hand is a small torch: the map shows faintly under it, wherever the drone is not looking */
      vec2 dc=q-uPhC.xy; add+=uPhCol*uPhC.z*exp(-dot(dc,dc)/(uPhC.w*uPhC.w))*(ml*.62+water*1.1+.03)*(1.-seen*.8);
      outgoingLight+=add*ph*uPhK; } }`;
  const arch=new T.Mesh(mergeGeos(B.geos),stone); arch.castShadow=arch.receiveShadow=true; sc.add(arch);
  const shaftM=stoneMat({U:W.U, sdf:'float mapAO(vec3 p){return 1e5;}', key:'shaft', color:'#ECE3D6', rough:.9, joint:.6,
    emisGLSL:`outgoingLight+=diffuseColor.rgb*vec3(1.,.74,.48)*(pow(smoothstep(7.6,30.,vWP.y),.7)*2.6+smoothstep(7.6,9.5,vWP.y)*.25);`});
  W.shaft=new T.Mesh(mergeGeos([W.shaftGeo]),shaftM); W.shaft.receiveShadow=true; sc.add(W.shaft);
  const capM=new T.MeshBasicMaterial({color:new T.Color('#FFE2BC').multiplyScalar(6)}); const cap=new T.Mesh(new T.CircleGeometry(1.8,48),capM); cap.rotation.x=Math.PI/2; cap.position.set(0,47.5,roomZ(sO)); sc.add(cap); W.shaftCap=cap;
  /* the floor: polished stone that holds a soft reflection of the light */
  W.mirror=new Mirror(MOBILE?.25:.35,{mips:true,bias:.001});
  const floorM=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'galfloor', color:'#DCD3C6', rough:.55, joint:1, mirror:true, mirrorK:.55, glsl:PHG, emisGLSL:PHE,
    albedo:`{ float ph=smoothstep(${PHM}; diffuseColor.rgb*=mix(1.,.32,ph); }`});
  floorM.userData.u.uMirror.value=W.mirror.rt.texture; floorM.userData.u.uTexMat.value=W.mirror.texMat;
  const floor=new T.Mesh(boxGeo(-6,6,-.5,0,zB,zA),floorM); floor.receiveShadow=true; sc.add(floor);
  W.floor=floor;

  /* the way out at the end: the courtyard's sunset light */
  const exitM=new T.MeshBasicMaterial({color:new T.Color('#FFC690').multiplyScalar(2.4)});
  const exitP=new T.Mesh(new T.PlaneGeometry(4.4,5.6),exitM); exitP.position.set(0,2.8,zB+.3); sc.add(exitP); W.exitM=exitM;
  const inP=new T.Mesh(new T.PlaneGeometry(4.4,5.6),new T.MeshBasicMaterial({color:new T.Color('#FFE2B8').multiplyScalar(2)})); inP.position.set(0,2.8,zA-.05); inP.rotation.y=Math.PI; sc.add(inP);

  /* gallery sky, seen through the skyspace and up the shaft */
  W.sky=new T.Mesh(new T.SphereGeometry(900,32,16),skyMat()); W.sky.frustumCulled=false; W.sky.renderOrder=900; sc.add(W.sky);

  /* soft room light: a low warm ambient, and a glow of each room's own colour */
  W.hemi=new T.HemisphereLight('#FFF4E8','#BFAF9C',.045); sc.add(W.hemi);
  const RL={aetos:7,pharos:.12,ogive:5,krios:2.2};   // Pharos keeps its dark; Kríos is lit by its own lamp
  W.roomLights=PROJ.map((p,k)=>{ const l=new T.PointLight(p.col,RL[p.id],20,1.4); l.position.set(0,H-.6,roomZ(k)); sc.add(l); return l; });
  const exitL=new T.PointLight('#FFB980',40,16,1.6); exitL.position.set(0,3.5,zB+2); sc.add(exitL);
  const inL=new T.PointLight('#FFE3BC',26,12,1.6); inL.position.set(0,3.2,zA-1.5); sc.add(inL);

  const BUILD={aetos:k=>buildAetos(W,roomZ(k),AP,k), pharos:k=>buildPharos(W,roomZ(k),k), ogive:k=>buildOgive(W,roomZ(k),OR,k), krios:k=>buildKrios(W,roomZ(k),k)};
  W.rooms=PROJ.map((p,k)=>BUILD[p.id](k)); W.room=id=>W.rooms[SLOT[id]];
  W.hideInMirror=[floor];
  W.update=(dt,st)=>{ W.t+=dt*S.timeScale; handUpdate(dt); for(const r of W.rooms) r.update(dt*S.timeScale,W.t,st); W.shaft.visible=W.shaftCap.visible=W.ogColumn.visible=CAM.gal.position.z<wallZ(Math.max(0,sO-1))+2.4; };   // only once the shaft can be seen
  W.applyLight=(tod,tint,s)=>{
    const sk=W.sky.material.uniforms;
    sk.uSunDir.value.copy(SUN.dir); sk.uZen.value.copy(TODC.zen); sk.uHor.value.copy(TODC.hor); sk.uHorS.value.copy(TODC.horS); sk.uGlow.value.copy(TODC.glow);
    sk.uSun.value.copy(TODC.sun); sk.uBelt.value.copy(TODC.belt); sk.uBeltK.value=tod.beltK; sk.uCl.value.copy(TODC.cl); sk.uCs.value.copy(TODC.cs); sk.uSunK.value=sstep(-2.2,-.2,SUN.el);
    W.U.uSunDir.value.set(0,1,0);
    W.U.uHazeCol.value.copy(tint).multiplyScalar(.075); W.U.uHazeSun.value.copy(W.U.uHazeCol.value);
    W.exitM.color.copy(TODC.L).lerp(TODC.hazeS,.4).multiplyScalar(2.6);
    if(W.aetosPour) W.aetosPour.uSky.value.copy(TODC.mid).lerp(TODC.zen,.4);
  };
  W.render=(cam,target)=>{
    W.sky.position.copy(cam.position);
    renderer.shadowMap.needsUpdate=true;
    W.mirror.render(sc,cam,W.hideInMirror);
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(sc,cam);
  };
  W.setSize=(w,h)=>W.mirror.setSize(w,h);
  W.U.uFog.value.set(.022,0,1,.85);
  W.U.uAOk.value=1.05;
  return W;
}

/* ---------- shared by the rooms ---------- */
const ADD={transparent:true,depthWrite:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor};
/* what the rooms just did, for the sound to answer: [name, pan, value] */
const RSND=[]; const rsnd=(n,p=0,v=1)=>{ if(RSND.length<24) RSND.push([n,p,v]); };
const QUAD=[-1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0];
/* a line of light from uA to uB, drawn up to uDraw of the way, always turned to face you; uDash breaks it into dashes */
function lightLine(c,w=3){
  const U={uA:{value:v3()},uB:{value:v3()},uDraw:{value:1},uK:{value:0},uPx:{value:600},uW:{value:w},uDash:{value:0},uCol:{value:col(c)}};
  const m=new T.ShaderMaterial({uniforms:U,...ADD,side:T.DoubleSide,
    vertexShader:`uniform vec3 uA,uB; uniform float uPx,uW; varying float vU,vV,vL;
      void main(){ float u=position.x+.5; vec3 P=mix(uA,uB,u); vec3 d=normalize(uB-uA+vec3(0.,1e-5,0.)); vec3 toC=normalize(cameraPosition-P);
        vec3 side=normalize(cross(d,toC)+vec3(1e-5,0.,0.)); P+=side*position.y*length(cameraPosition-P)*uW/uPx;
        vU=u; vV=position.y*2.; vL=length(uB-uA); gl_Position=projectionMatrix*viewMatrix*vec4(P,1.); }`,
    fragmentShader:`uniform float uDraw,uK,uDash; uniform vec3 uCol; varying float vU,vV,vL;
      void main(){ float on=1.-smoothstep(uDraw-.004,uDraw,vU); float head=exp(-(((vU-uDraw)*vL*3.)*((vU-uDraw)*vL*3.)))*1.6*step(uDraw,.999);
        float dash=uDash>0.?smoothstep(.35,.5,abs(fract(vU*vL/uDash)-.5)*2.):1.;
        float core=exp(-vV*vV*3.); gl_FragColor=vec4(uCol*core*(on*.6*dash+head)*uK,1.); }`});
  const mesh=new T.Mesh(new T.PlaneGeometry(1,1,48,1),m); mesh.frustumCulled=false; return {mesh,U};
}
/* the hand: where the pointer is (on a touch screen, where you last tapped, for a moment), as a ray from the gallery
   camera and the point of the floor under it. Each room answers it a little, in its own way */
const HAND={k:0,x:0,y:0,tapT:-9,ray:new T.Raycaster(),nd:new T.Vector2(),floor:v3(),onFloor:false};
function handUpdate(dt){
  const tap=now()-HAND.tapT, live=S.mode==='world'&&!HOLD.open&&(M.on||tap<2.4);
  HAND.k=damp(HAND.k,live?(M.on?1:1-sstep(1.4,2.4,tap)):0,live?7:4,dt);
  if(live){ HAND.x=M.x; HAND.y=M.y; }
  CAM.gal.updateMatrixWorld(); HAND.nd.set(HAND.x/innerWidth*2-1,-(HAND.y/innerHeight)*2+1); HAND.ray.setFromCamera(HAND.nd,CAM.gal);
  const r=HAND.ray.ray; HAND.onFloor=r.direction.y<-1e-3;
  if(HAND.onFloor) HAND.floor.copy(r.origin).addScaledVector(r.direction,-r.origin.y/r.direction.y);
}
/* how much a room is in front of you, from the walk */
const roomNear=k=>1-sstep(.3,.55,Math.abs(S.s-(k+1)));
const handIn=(zc,k)=>HAND.onFloor&&Math.abs(HAND.floor.x)<5.9&&Math.abs(HAND.floor.z-zc)<7.9?HAND.k*roomNear(k):0;
/* a soft round glow that always faces you */
function glowSprite(c,size){
  const U={uCol:{value:col(c)},uK:{value:1},uS:{value:1}};
  const m=new T.ShaderMaterial({uniforms:U,...ADD,
    vertexShader:`uniform float uS; varying vec2 vQ; void main(){ vQ=position.xy; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*${size.toFixed(3)}*uS; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying vec2 vQ; void main(){ float r=length(vQ); float a=(exp(-r*r*16.)+exp(-r*r*3.5)*.32)*(1.-smoothstep(.8,1.,r)); gl_FragColor=vec4(uCol*a*uK,1.); }`});
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(QUAD,3));
  const mesh=new T.Mesh(g,m); mesh.frustumCulled=false; return {mesh,U};
}

/* ---------- Kríos: a rehearsal. Two chairs face each other across a small stone table under one lamp: the rep's, and the
   buyer's. The call plays out in light. Every turn leaves a line rising over the table, warm from the rep's side and blue
   from the buyer's, like a conversation stacking up into the air, and a thread of light runs across the table to whoever
   is listening. Six exchanges and it comes together; then the lines drift up and go, and the next call begins ---------- */
const KR={turn:-1,who:0,ex:0,type:0};   // shared with the sound and the tests: the turn, who is talking, the exchange, how far typed
const KR_LEN=[[1.04,1.3,.82,1.15,.74,.99],[1.22,.69,1.09,.9,1.18,.64]];   // each line's length in metres: the rep's, the buyer's
function buildKrios(W,zc,k){
  const g=new T.Group(); W.scene.add(g);
  const TX=1.9, TZ=zc-.6, SEAT=1.12, TOPY=.74, LAMP=2.46;
  const REP=col('#FFCE96'), BUY=col('#A5C3FF');
  /* the furniture: a round stone table on one column, and two oak chairs turned to it */
  const stone=new T.MeshStandardMaterial({color:'#E8E0D3',roughness:.48,metalness:0});
  const oak=new T.MeshStandardMaterial({color:'#B38658',roughness:.6,metalness:0});
  const metal=new T.MeshStandardMaterial({color:'#3E3A36',roughness:.42,metalness:.6});
  const add=(m,x,y,z)=>{ m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; g.add(m); return m; };
  add(new T.Mesh(new T.CylinderGeometry(.56,.56,.045,56),stone),TX,TOPY,TZ);
  add(new T.Mesh(new T.CylinderGeometry(.055,.075,TOPY-.04,20),stone),TX,(TOPY-.04)/2+.02,TZ);
  add(new T.Mesh(new T.CylinderGeometry(.27,.3,.035,40),stone),TX,.018,TZ);
  const chair=(x,face)=>{ const c=new T.Group(); c.position.set(x,0,TZ); c.rotation.y=face; g.add(c);
    const part=(geo,px,py,pz,rx=0)=>{ const m=new T.Mesh(geo,oak); m.position.set(px,py,pz); m.rotation.x=rx; m.castShadow=m.receiveShadow=true; c.add(m); };
    part(new T.BoxGeometry(.46,.045,.44),0,.45,0);
    part(new T.BoxGeometry(.44,.36,.035),0,.73,.205,-.09);
    for(const sx of [-1,1]) for(const sz of [-1,1]) part(new T.BoxGeometry(.035,.45,.035),sx*.2,.225,sz*.19);
    for(const sx of [-1,1]) part(new T.BoxGeometry(.035,.34,.035),sx*.2,.62,.2,-.09);   // the back's two uprights
    return c; };
  chair(TX-SEAT,-Math.PI/2); chair(TX+SEAT,Math.PI/2);   // the rep on the left, facing right; the buyer on the right, facing left
  /* the lamp: a cord from the ceiling, a dark shade, a warm bulb, and a pool of light on the table */
  add(new T.Mesh(new T.CylinderGeometry(.006,.006,ROOM.H-LAMP-.1,6),metal),TX,(ROOM.H+LAMP+.1)/2,TZ);
  const shade=new T.Mesh(new T.CylinderGeometry(.055,.23,.2,40,1,true),new T.MeshStandardMaterial({color:'#2F2B28',roughness:.5,metalness:.55,side:T.DoubleSide}));
  add(shade,TX,LAMP+.1,TZ);
  const bulb=glowSprite('#FFE2B8',.5); bulb.mesh.position.set(TX,LAMP,TZ); bulb.mesh.renderOrder=958; g.add(bulb.mesh);
  const lampL=new T.PointLight('#FFD8AA',3.2,6.5,1.6); lampL.position.set(TX,LAMP-.05,TZ); g.add(lampL);
  const spot=new T.SpotLight('#FFE0B8',150,0,.62,.6,2); spot.position.set(TX,LAMP,TZ); spot.target.position.set(TX,0,TZ);
  spot.castShadow=true; spot.shadow.mapSize.set(1024,1024); spot.shadow.bias=-.0006; spot.shadow.radius=4; spot.shadow.camera.near=.5; spot.shadow.camera.far=4;
  g.add(spot); g.add(spot.target);
  /* a soft pool of colour on the floor under each chair, brighter while that one speaks */
  const poolM=c=>new T.ShaderMaterial({uniforms:{uCol:{value:c.clone()},uK:{value:.3}},...ADD,
    vertexShader:`varying vec2 vQ; void main(){ vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying vec2 vQ; void main(){ float r=length(vQ)/.9; gl_FragColor=vec4(uCol*exp(-r*r*3.)*(1.-smoothstep(.85,1.,r))*.32*uK,1.); }`});
  const pool=(x,c)=>{ const m=new T.Mesh(new T.PlaneGeometry(1.8,1.8),poolM(c)); m.rotation.x=-Math.PI/2; m.position.set(x,.008,TZ); m.renderOrder=8; g.add(m); return m.material.uniforms; };
  const POOL=[pool(TX-SEAT,REP),pool(TX+SEAT,BUY)];
  /* the conversation: a column of lines over the table, turned to the room's best view. The rep's lines start at the left,
     the buyer's at the right; each is typed out as it is said, with small gaps between its words, and the column moves up
     a step for every new line */
  const col_=new T.Group(); col_.position.set(TX,0,TZ); col_.rotation.y=Math.atan2(-1.2-TX,5.4+.6); g.add(col_);
  const CW=3.3, STEP=.27, Y0=1.32;   // wide enough that the lamp hangs in the gap between the two sides
  /* the lines are drawn solid with a glow round them (premultiplied: the body covers what is behind it, the glow adds), so
     they still read against the bright doorway beyond */
  const PRE={transparent:true,depthWrite:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor};
  const lineM=(c,side,len,seed)=>new T.ShaderMaterial({uniforms:{uCol:{value:c.clone()},uK:{value:0},uType:{value:0},uLen:{value:len},uSide:{value:side},uSeed:{value:seed}},...PRE,side:T.DoubleSide,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK,uType,uLen,uSide,uSeed; varying vec2 vUv;
      void main(){ float x=uSide>0.?1.-vUv.x:vUv.x; float px=x*uLen, py=(vUv.y-.5)*.24, r=.05;
        float dx=max(r-px,0.)+max(px-(uLen-r),0.); float d=length(vec2(dx,py))-r;
        float body=1.-smoothstep(-.01,.004,d), halo=exp(-max(d,0.)*36.)*.3;
        float w=fract(px/.27+uSeed), gap=smoothstep(.8,.86,w)*(1.-smoothstep(.97,1.,w));
        float on=step(x,uType), caret=exp(-(((x-uType)*uLen*30.)*((x-uType)*uLen*30.)))*(1.-step(.999,uType))*1.4;
        float a=body*(1.-gap*.8)*on; gl_FragColor=vec4(uCol*(a*.85+halo*on+caret*body)*uK,a*clamp(uK*1.1,0.,1.)*.92); }`});
  const LINES=[];
  for(let i=0;i<12;i++){ const who=i%2, ex=i>>1, len=KR_LEN[who][ex], side=who?1:-1;
    const geo=new T.PlaneGeometry(len,.24); geo.translate(side*(CW/2-len/2),0,0);
    const m=new T.Mesh(geo,lineM(who?BUY:REP,side,len,(i*.37)%1)); m.renderOrder=959; m.frustumCulled=false; col_.add(m);
    LINES.push({m,U:m.material.uniforms,who,y:Y0}); }
  /* the thread across the table, from whoever is speaking to whoever is listening */
  const thread=lightLine('#FFE2BE',1.4); thread.mesh.renderOrder=957; g.add(thread.mesh);
  const SPK=[v3(TX-SEAT+.12,1.08,TZ),v3(TX+SEAT-.12,1.08,TZ)];
  const TURN=3.2, TYPE=2.3, END=6, LOOP=12*TURN+END;
  let t0=0, hK=0, last=-1;
  return {g, spot, dbg:()=>({turn:KR.turn,who:KR.who,ex:KR.ex,type:+KR.type.toFixed(2),hand:+hK.toFixed(2)}), update(dt,t,st){
    const hk=handIn(zc,k); hK=damp(hK,hk,hk>hK?6:2.5,dt);
    t0=(t0+dt)%LOOP; const turn=Math.min(11,Math.floor(t0/TURN)), u=t0-turn*TURN, ending=t0>=12*TURN, ek=ending?(t0-12*TURN)/END:0;
    const who=turn%2, ex=turn>>1, type=ending?1:clamp(u/TYPE,0,1);
    if(!ending&&turn!==last){ last=turn; rsnd(who?'kr-them':'kr-you',who?.3:-.3,ex); if(turn===11) rsnd('kr-deal',.1,0); }
    if(ending&&last!==12){ last=12; }
    KR.turn=ending?-1:turn; KR.who=who; KR.ex=ex; KR.type=type;
    const speaking=ending?0:(1-sstep(.85,1,type))*(type>0?1:0);
    /* the column: every line already said sits a step above the next; at the end they all drift up and fade */
    LINES.forEach((L,i)=>{ const said=ending?12:turn; const shown=i<=said;
      const yT=Y0+(said-i)*STEP+ek*ek*2.2; L.y=shown?(L.y<Y0-.01?Y0:damp(L.y,yT,4,dt)):Y0; L.m.position.y=L.y; L.m.visible=shown;
      L.U.uType.value=i<said||ending?1:type; L.U.uK.value=shown?(i===said&&!ending?1.25:.42+.5*(1-(said-i)/12))*(1-ek)*(1+.25*hK):0; });
    /* the thread runs across with the words; the speaker's pool brightens */
    const a=SPK[who], b=SPK[1-who]; thread.U.uA.value.copy(a); thread.U.uB.value.copy(b); thread.U.uDraw.value=type;
    thread.U.uK.value=.55*speaking; thread.U.uCol.value.copy(who?BUY:REP); thread.U.uPx.value=G.px;
    POOL[0].uK.value=damp(POOL[0].uK.value,.3+(who===0?1.4*speaking:0)+.8*hK,6,dt); POOL[1].uK.value=damp(POOL[1].uK.value,.3+(who===1?1.4*speaking:0),6,dt);
    lampL.intensity=3.2*(1+.25*hK); bulb.U.uK.value=1+.4*hK;
  }};
}

/* ---------- Aetos: a skyspace full of drones. A radar sweeps the square of sky: friends are marked as it passes them, and
   one drone is picked out as the threat, locked, and taken out by the intercept. Then the sky is quiet for a while ---------- */
function buildAetos(W,zc,AP,k){
  const g=new T.Group(); W.scene.add(g);
  /* light hidden along the top of the walls washes the ceiling, so the sky reads as a flat colour (the Turrell trick) */
  [[-5.3,zc],[5.3,zc],[0,zc-7.2],[0,zc+7.2]].forEach(([x,z])=>{ const l=new T.PointLight('#FFF3E4',26,9,1.5); l.position.set(x,ROOM.H-.5,z); g.add(l); });
  const skyL=new T.SpotLight('#DCE6FA',120,0,.5,.9,2); skyL.position.set(0,ROOM.H+3,zc); skyL.target.position.set(0,0,zc); g.add(skyL); g.add(skyL.target);
  /* the sky's light pours down through the opening: a soft falling volume, and a pale square of it on the floor */
  const pourU={uCol:{value:col('#F4F0EA')},uSky:{value:new T.Color('#A9C3EC')},uTime:GU.uTime,uK:{value:1},uC:{value:v3(0,0,zc)},uA:{value:AP},uH:{value:ROOM.H}};
  const pourM=new T.ShaderMaterial({uniforms:pourU,...ADD,side:T.BackSide,
    vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol,uSky,uC; uniform float uTime,uK,uA,uH; varying vec3 vWP; ${GLSL.noise}
    float dens(vec3 p){ float spread=1.+(uH-p.y)*.055; vec2 q=abs(p.xz-uC.xz)/(uA*spread); float e=max(q.x,q.y);
      return (1.-smoothstep(.72,1.02,e))*smoothstep(0.,1.2,p.y)*(.35+.65*smoothstep(0.,uH,p.y))*step(p.y,uH); }
    void main(){ vec3 C=cameraPosition, rd=vWP-C; float tE=length(rd); rd/=tE; float seg=min(tE,9.), t0=tE-seg, dt=seg/6., acc=0.;
      for(int i=0;i<6;i++){ vec3 p=C+rd*(t0+(float(i)+.5)*dt); float d=dens(p); if(d>.001){ float n=vnoise(p.xz*.8+vec2(p.y*.35-uTime*.05,uTime*.03)); acc+=d*(.5+.8*n)*dt; } }
      gl_FragColor=vec4(mix(uSky,uCol,.55)*acc*.075*uK,1.); }`});
  /* (its top sits just inside the ceiling's slab, not on the ceiling's face: two surfaces at one depth flicker on a real graphics card) */
  const pour=new T.Mesh(boxGeo(-AP*1.45,AP*1.45,0,ROOM.H+.03,zc-AP*1.45,zc+AP*1.45),pourM); pour.renderOrder=950; g.add(pour);
  const poolM=new T.ShaderMaterial({uniforms:pourU,...ADD,
    vertexShader:`varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol,uSky; uniform float uK,uA; varying vec2 vP; void main(){ vec2 q=abs(vP)/(uA*1.4); float e=max(q.x,q.y);
      float a=(1.-smoothstep(.62,1.,e))*(.7+.3*(1.-length(vP)/(uA*1.9))); gl_FragColor=vec4(mix(uSky,uCol,.6)*a*.36*uK,1.); }`});
  const poolL=new T.Mesh(new T.PlaneGeometry(AP*3.2,AP*3.2),poolM); poolL.rotation.x=-Math.PI/2; poolL.position.set(0,.012,zc); poolL.renderOrder=6; g.add(poolL);
  W.aetosPour=pourU;
  /* the patch of sky the opening shows: about 34 m up, some 21 m beyond the room's middle */
  const BZ=zc-21, CAM0=v3(0,1.38,-27.9), RC=CAM0.clone().addScaledVector(v3(0,ROOM.H,zc).sub(CAM0).normalize(),36);
  /* drones: six loiter in slow circles over the opening, six cross from one side of the sky to the other */
  const N=12, D=[]; const R=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(let i=0;i<N;i++){ const lo=i<6;
    D.push(Object.assign(lo?{kind:'loit',r:2.5+i*1.15+R()*.8,a0:R()*TAU,w:(.045+R()*.05)*(i%2?-1:1),y:27+R()*12,cx:(R()-.5)*3,cz:BZ+(R()-.5)*3}
      :{kind:'cross',ang:R()*TAU,sp:.016+R()*.018,ph:R(),off:(R()-.5)*14,y:25+R()*18},
      {p:v3(),yaw:0,a:1,fade:1,mk:0,ang:0,inR:9,role:'friend',drop:0,bl:R()*6,seen:0,hov:0})); }
  const posOf=(d,t)=>{ if(d.kind==='loit'){ const a=d.a0+t*d.w; d.p.set(d.cx+Math.cos(a)*d.r,d.y+Math.sin(t*.3+d.a0)*.5,d.cz+Math.sin(a)*d.r); d.yaw=a*.6; }
    else { const dx=Math.cos(d.ang), dz=Math.sin(d.ang), u=((t*d.sp+d.ph)%1+1)%1; d.p.set(dx*(u-.5)*150-dz*d.off,d.y,BZ+dz*(u-.5)*150+dx*d.off); d.yaw=d.ang+.785; } };
  /* seen from below: a body, four arms in an X, four motors, and the blur of four rotors */
  const P=[], Q=[];
  const disc=(A,cx,cz,r,n)=>{ for(let i=0;i<n;i++){ const a0=i/n*TAU, a1=(i+1)/n*TAU; A.push(cx,0,cz, cx+Math.cos(a0)*r,0,cz+Math.sin(a0)*r, cx+Math.cos(a1)*r,0,cz+Math.sin(a1)*r); } };
  const bar=(A,ax,az,bx,bz,w)=>{ const dx=bx-ax, dz=bz-az, l=Math.hypot(dx,dz), nx=-dz/l*w, nz=dx/l*w; A.push(ax+nx,0,az+nz, bx+nx,0,bz+nz, bx-nx,0,bz-nz, ax+nx,0,az+nz, bx-nx,0,bz-nz, ax-nx,0,az-nz); };
  disc(P,0,0,.13,10); for(const [x,z] of [[.27,.27],[-.27,.27],[-.27,-.27],[.27,-.27]]){ bar(P,0,0,x,z,.026); disc(P,x,z,.05,10); disc(Q,x,z,.18,20); }
  const iP=new Float32Array(N*3), iY=new Float32Array(N), iA=new Float32Array(N);
  const aP=new T.InstancedBufferAttribute(iP,3), aY=new T.InstancedBufferAttribute(iY,1), aA=new T.InstancedBufferAttribute(iA,1);
  [aP,aY,aA].forEach(a=>a.setUsage(T.DynamicDrawUsage));
  const mkG=A=>{ const ig=new T.InstancedBufferGeometry(); ig.setAttribute('position',new T.Float32BufferAttribute(A,3)); ig.setAttribute('aP',aP); ig.setAttribute('aY',aY); ig.setAttribute('aA',aA);
    ig.instanceCount=N; ig.boundingSphere=new T.Sphere(v3(0,30,BZ),1e4); return ig; };
  const DV=`attribute vec3 aP; attribute float aY,aA; varying float vA;
    void main(){ vec3 p=position*1.25; float c=cos(aY), s=sin(aY); p=vec3(p.x*c-p.z*s,0.,p.x*s+p.z*c); vA=aA; gl_Position=projectionMatrix*viewMatrix*vec4(aP+p,1.); }`;
  const silM=k=>new T.ShaderMaterial({uniforms:{uCol:{value:col('#2E2A28')}},transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:DV,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ gl_FragColor=vec4(uCol,vA*${k}); }`});
  const rotors=new T.Mesh(mkG(Q),silM('.24')), frames=new T.Mesh(mkG(P),silM('1.')); [rotors,frames].forEach((m,i)=>{ m.frustumCulled=false; m.renderOrder=910+i; g.add(m); });
  /* their lights: a slow white blink on each friend, steady amber on the threat */
  const LP=new Float32Array(N*3), LC=new Float32Array(N*4);
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.BufferAttribute(LP,3)); lg.setAttribute('aC',new T.BufferAttribute(LC,4)); lg.boundingSphere=new T.Sphere(v3(0,30,BZ),1e4);
  const LUu={uPx:{value:600}};
  const lights=new T.Points(lg,new T.ShaderMaterial({uniforms:LUu,...ADD,
    vertexShader:`attribute vec4 aC; uniform float uPx; varying vec4 vC; void main(){ vC=aC; vec4 mv=viewMatrix*vec4(position,1.); gl_PointSize=aC.a>.01?clamp(.3*uPx/-mv.z,2.,9.):0.; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`varying vec4 vC; void main(){ float d=length(gl_PointCoord-.5); float k=smoothstep(.5,0.,d); gl_FragColor=vec4(vC.rgb*k*k*vC.a*2.4,1.); }`}));
  lights.frustumCulled=false; lights.renderOrder=913; g.add(lights);
  /* the radar: rings, a cross and a turning sweep, a faint drawing of light across the square of sky */
  const RU={uA:{value:0},uK:{value:1},uCol:{value:col('#F8F2E8')}};
  const radar=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:RU,...ADD,side:T.DoubleSide,
    vertexShader:`varying vec2 vQ; void main(){ vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uA,uK; uniform vec3 uCol; varying vec2 vQ;
      void main(){ float r=length(vQ), a=atan(vQ.y,vQ.x), da=mod(uA-a,6.2831853), fw=fwidth(r)*1.5;
        float trail=exp(-da*1.7)*smoothstep(0.,.02,da)*.13*smoothstep(.04,.2,r);
        float dl=abs(sin(a-uA))*r; float lead=(1.-smoothstep(0.,fw*1.6,dl))*step(0.,cos(a-uA))*.42*smoothstep(.02,.1,r);
        float rings=0.; for(int i=1;i<=4;i++){ rings+=1.-smoothstep(0.,fw,abs(r-float(i)*.25)); }
        float cr=(1.-smoothstep(0.,fw,abs(vQ.x)))+(1.-smoothstep(0.,fw,abs(vQ.y)));
        float k=(trail+lead+rings*.05+cr*.022)*(1.-smoothstep(.96,1.,r));
        gl_FragColor=vec4(uCol*k*uK,1.); }`}));
  radar.position.copy(RC); radar.scale.setScalar(12.5); radar.renderOrder=905; g.add(radar);
  /* the marks: four corners on a friend as the sweep finds it, a turning broken ring on the threat, a closed ring when locked */
  const MP=new Float32Array(N*3), MM=new Float32Array(N*4), aMP=new T.InstancedBufferAttribute(MP,3), aMM=new T.InstancedBufferAttribute(MM,4);
  [aMP,aMM].forEach(a=>a.setUsage(T.DynamicDrawUsage));
  const mg=new T.InstancedBufferGeometry(); mg.setAttribute('position',new T.Float32BufferAttribute(QUAD,3)); mg.setAttribute('aP',aMP); mg.setAttribute('aM',aMM); mg.instanceCount=N; mg.boundingSphere=new T.Sphere(v3(0,30,BZ),1e4);
  const MU={uPx:{value:600},uFr:{value:col('#FFFCF4')},uTh:{value:col('#FFB06A')}};
  const marks=new T.Mesh(mg,new T.ShaderMaterial({uniforms:MU,...ADD,
    vertexShader:`attribute vec3 aP; attribute vec4 aM; uniform float uPx; varying vec2 vQ; varying vec4 vM;
      void main(){ vec4 mv=viewMatrix*vec4(aP,1.); float s=aM.z*(-mv.z)*24./uPx; mv.xy+=position.xy*s; vQ=position.xy; vM=aM; gl_Position=aM.y>.002?projectionMatrix*mv:vec4(2.,2.,2.,1.); }`,
    fragmentShader:`uniform vec3 uFr,uTh; varying vec2 vQ; varying vec4 vM;
      float band(float x,float a,float b,float fw){ return smoothstep(a-fw,a,x)*(1.-smoothstep(b,b+fw,x)); }
      void main(){ float r=length(vQ), fw=fwidth(r)*1.2; vec2 b=abs(vQ); float m=max(b.x,b.y), fm=fwidth(m)*1.2; float a=0.; vec3 c=uFr;
        if(vM.x<.5){ a=band(m,.84,.9,fm)*smoothstep(.5,.56,min(b.x,b.y))*.8; }
        else if(vM.x<1.5){ float an=atan(vQ.y,vQ.x)+vM.w; a=band(r,.8,.87,fw)*smoothstep(.2,.32,abs(sin(an*2.))); a+=band(b.x,.58,.76,fw)*step(b.y,.022)+band(b.y,.58,.76,fw)*step(b.x,.022); c=uTh; }
        else { a=band(r,.46,.53,fw)*1.2+smoothstep(.1,.05,r); a+=band(b.x,.6,.92,fw)*step(b.y,.026)+band(b.y,.6,.92,fw)*step(b.x,.026); c=uTh*1.25; }
        gl_FragColor=vec4(c*a*vM.y,1.); }`}));
  marks.frustumCulled=false; marks.renderOrder=999; g.add(marks);
  /* the intercept, drawn from the edge of the opening up to the threat, and the flash where it meets it */
  const shot=lightLine('#FFD3A4',2.4); shot.mesh.renderOrder=998; g.add(shot.mesh); shot.U.uA.value.set(AP*.55,ROOM.H+.05,zc+AP*.98);
  const flash=glowSprite('#FFE2C0',1); flash.mesh.renderOrder=997; flash.U.uK.value=0; g.add(flash.mesh);
  const TH={i:-1,st:'pick',t:0,hits:0}, _l=v3(), _s=v3();
  let tb=0, sweep=0, hovI=-1;
  const pickThreat=()=>{ let best=-1, bd=9; D.forEach((d,i)=>{ if(d.kind==='loit'&&d.role==='friend'&&d.fade>.99&&d.inR<bd&&d.inR<.62){ bd=d.inR; best=i; } }); return best; };
  return {g, dbg:()=>({st:TH.st,t:+TH.t.toFixed(2),hov:hovI}), update(dt,t,st){
    tb+=dt; const px=G.px; LUu.uPx.value=MU.uPx.value=shot.U.uPx.value=px;
    /* the drone nearest your hand, if it is close to it on the screen */
    let hv=-1, hd=HAND.k>.5&&roomNear(k)>.5?Math.max(46,innerWidth*.045):0;
    const cp=CAM.gal.position;
    if(hd) for(let i=0;i<N;i++){ const d=D[i]; if(d.fade<.6||d.role==='down'||(d.role==='threat'&&TH.st!=='search')) continue;
      /* only one you can see: the line from you to it has to pass through the opening */
      const k=(ROOM.H-cp.y)/(d.p.y-cp.y), ox=cp.x+(d.p.x-cp.x)*k, oz=cp.z+(d.p.z-cp.z)*k; if(!(k>0&&k<1&&Math.abs(ox)<AP-.05&&Math.abs(oz-zc)<AP-.05)) continue;
      _s.copy(d.p).project(CAM.gal); if(_s.z>1) continue;
      const e=Math.hypot((_s.x*.5+.5)*innerWidth-HAND.x,(-_s.y*.5+.5)*innerHeight-HAND.y); if(e<hd){ hd=e; hv=i; } }
    if(hv!==hovI){ hovI=hv; if(hv>=0) rsnd('ae-hov',clamp(D[hv].p.x*.04,-.8,.8)); }
    radar.lookAt(CAM.gal.position); radar.updateMatrixWorld();
    const sp=TAU/3.2, s0=sweep; sweep=(sweep+dt*sp)%TAU; RU.uA.value=sweep;
    const passed=a=>{ const d0=((a-s0)%TAU+TAU)%TAU, d1=((sweep-s0)%TAU+TAU)%TAU; return d0<=d1&&d1<Math.PI; };
    if(sweep<s0) rsnd('ae-sweep',0,.6);
    for(let i=0;i<N;i++){ const d=D[i]; posOf(d,tb);
      if(d.role==='down'){ d.drop+=dt; d.p.y-=3.2*d.drop*d.drop; d.fade=Math.max(0,1-d.drop/2.2); }
      else if(d.fade<1) d.fade=Math.min(1,d.fade+dt*.7);
      _l.copy(d.p); radar.worldToLocal(_l); d.inR=Math.hypot(_l.x,_l.y); d.ang=Math.atan2(_l.y,_l.x);
      if(d.fade>.5&&d.inR<.98&&passed(d.ang)){ d.seen=1; if(i===TH.i&&TH.st==='search'){ TH.hits++; } }
      d.seen=Math.max(0,d.seen-dt*.42);
      iP.set([d.p.x,d.p.y,d.p.z],i*3); iY[i]=d.yaw; iA[i]=d.fade;
      LP.set([d.p.x,d.p.y-.02,d.p.z],i*3);
      d.hov=damp(d.hov,i===hovI?1:0,i===hovI?12:2.5,dt);
      const blink=Math.max(Math.pow(Math.max(0,Math.sin(tb*2.1+d.bl)),24),d.hov);
      if(d.role==='threat'&&TH.st!=='search') LC.set([1,.62,.3,.85*d.fade],i*4); else if(d.role==='down') LC.set([1,.62,.3,0],i*4); else LC.set([1,.98,.92,(.25+.75*blink)*d.fade],i*4);
      MP.set([d.p.x,d.p.y,d.p.z],i*3);
      if(i===TH.i&&TH.st!=='search'&&TH.st!=='clear') MM.set([TH.st==='id'?1:2,d.fade*(TH.st==='down'?Math.max(0,1-TH.t*1.6):1),TH.st==='id'?1.15:lerp(1.15,.85,Math.min(1,TH.t*2.5)),tb*.9],i*4);
      else MM.set([0,Math.max(d.seen,d.hov)*(1+.7*d.hov)*d.fade,.82+.16*d.hov,0],i*4); }
    /* the threat: found by the sweep, picked out, locked, then the intercept goes up to it */
    TH.t+=dt; const th=D[TH.i];
    if(TH.st==='pick'){ const k=pickThreat(); if(k>=0){ TH.i=k; D[k].role='threat'; TH.st='search'; TH.t=0; TH.hits=0; } }
    else if(TH.st==='search'){ if(TH.hits>=2&&TH.t>2){ TH.st='id'; TH.t=0; rsnd('ae-id',th.p.x*.04); } }
    else if(TH.st==='id'){ if(TH.t>1.7){ TH.st='lock'; TH.t=0; rsnd('ae-lock',th.p.x*.04); } }
    else if(TH.st==='lock'){ shot.U.uB.value.copy(th.p); shot.U.uDraw.value=E.o(Math.min(1,TH.t/.95)); shot.U.uK.value=1;
      if(TH.t>1){ TH.st='down'; TH.t=0; th.role='down'; th.drop=0; flash.mesh.position.copy(th.p); flash.U.uK.value=2.2; rsnd('ae-hit',th.p.x*.04); } }
    else if(TH.st==='down'){ shot.U.uK.value=Math.max(0,1-TH.t*1.4); shot.U.uB.value.copy(th.p); if(TH.t>2.4){ TH.st='clear'; TH.t=0; } }
    else if(TH.st==='clear'){ if(TH.t>3){ th.role='friend'; th.drop=0; th.fade=0; th.a0+=Math.PI*.7; TH.st='pick'; TH.t=0; TH.i=-1; } }
    if(TH.st!=='lock'&&TH.st!=='down') shot.U.uK.value=0;
    flash.U.uK.value=Math.max(0,flash.U.uK.value-dt*2.6); flash.U.uS.value=(1+(2.2-flash.U.uK.value)*1.4)*flash.mesh.position.distanceTo(CAM.gal.position)*.012;
    aP.needsUpdate=aY.needsUpdate=aA.needsUpdate=aMP.needsUpdate=aMM.needsUpdate=true; lg.attributes.position.needsUpdate=lg.attributes.aC.needsUpdate=true;
  }};
}

/* ---------- Pharos: a drone in a dark room with nothing to go by. Its camera lights a square of the floor, and the floor is a
   map; a second square, where it thinks it is, slides over to match what it sees and locks on. Over open water there is
   nothing to match, and it says so: the square loosens and its circle of doubt opens up ---------- */
const PH_LAKE=[1.35,roomZ(SLOT.pharos)-2.15,1.05,.95];   // the open water on the map: x, z and its two radii (the floor's shader draws it too)
function droneModel(){
  const g=new T.Group(), parts=[];
  const shell=new T.MeshStandardMaterial({color:'#ECE6DC',roughness:.38,metalness:.04});
  const dark=new T.MeshStandardMaterial({color:'#3B3633',roughness:.5,metalness:.25});
  const body=new T.Mesh(new T.SphereGeometry(.15,32,18),shell); body.scale.set(1.1,.42,1.45);
  const top=new T.Mesh(new T.SphereGeometry(.09,24,14),shell); top.scale.set(1,.5,1.3); top.position.set(0,.04,-.03);
  g.add(body,top); parts.push(body,top);
  const RA=.33, armG=new T.CylinderGeometry(.014,.019,RA,10); armG.rotateZ(Math.PI/2); armG.translate(RA/2,0,0);
  const rotM=new T.ShaderMaterial({uniforms:{uTime:GU.uTime},transparent:true,depthWrite:false,side:T.DoubleSide,
    vertexShader:`varying vec2 vQ; void main(){ vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uTime; varying vec2 vQ; void main(){ float r=length(vQ)/.17, a=atan(vQ.y,vQ.x);
      float bl=pow(.5+.5*cos(a*2.-uTime*23.),6.)*.5+.5; float d=smoothstep(1.,.93,r)*smoothstep(.16,.24,r);
      gl_FragColor=vec4(vec3(.84,.79,.73),d*(.07+.17*bl*(1.-r*.5))); }`});
  for(let i=0;i<4;i++){ const a=Math.PI/4+i*Math.PI/2, x=Math.cos(a)*RA, z=Math.sin(a)*RA;
    const arm=new T.Mesh(armG,shell); arm.rotation.y=-a;
    const pod=new T.Mesh(new T.CylinderGeometry(.026,.03,.05,16),dark); pod.position.set(x,.01,z);
    const rot=new T.Mesh(new T.CircleGeometry(.17,40),rotM); rot.rotation.x=-Math.PI/2; rot.position.set(x,.045,z); rot.renderOrder=961;
    g.add(arm,pod,rot); parts.push(arm,pod); }
  const gim=new T.Mesh(new T.SphereGeometry(.042,20,14),dark); gim.position.set(0,-.075,.11);
  const lensM=new T.MeshBasicMaterial({color:new T.Color('#FFD5B3').multiplyScalar(3)});
  const lens=new T.Mesh(new T.CircleGeometry(.019,20),lensM); lens.rotation.x=Math.PI/2; lens.position.set(0,-.118,.11);
  g.add(gim,lens); parts.push(gim);
  for(const sx of [-1,1]){ const leg=new T.Mesh(new T.CylinderGeometry(.006,.006,.12,6),shell); leg.position.set(sx*.09,-.1,0); leg.rotation.z=sx*.25;
    const skid=new T.Mesh(new T.CylinderGeometry(.006,.006,.26,6),shell); skid.rotation.x=Math.PI/2; skid.position.set(sx*.115,-.155,0); g.add(leg,skid); parts.push(leg,skid); }
  parts.forEach(m=>{ m.castShadow=true; m.receiveShadow=true; });
  g.rotation.order='YXZ';
  return {g,lensM};
}
function buildPharos(W,zc,k){
  const g=new T.Group(); W.scene.add(g);
  const C=col('#FFD5B3'), CAMY=2.55, TANF=.46, HF=CAMY*TANF;   // the drone camera's height over the floor, and the half-width of the square it sees
  const dr=droneModel(); dr.g.scale.setScalar(1.05); g.add(dr.g);
  /* a little light of its own, so it can be seen in the dark, and the glow of what it sees thrown back up */
  const fill=new T.PointLight('#FFE6D2',2.4,4.5,1.6); g.add(fill);
  const under=new T.PointLight(C,3.4,5,1.4); g.add(under);
  /* what its camera sees: a square cone of light from the lens down to the floor, marched through drifting haze */
  const VU={uS:{value:v3()},uYaw:{value:0},uTan:{value:TANF},uBC:{value:v3()},uBH:{value:v3(HF+.35,CAMY/2+.06,HF+.35)},uCol:{value:C},uTime:GU.uTime,uK:{value:.38},uPx:{value:600}};
  const DENS=`uniform vec3 uS,uBC,uBH,uCol; uniform float uYaw,uTan,uTime,uK;
    float dens(vec3 p){ vec3 q=p-uS; float a=-q.y, c=cos(uYaw), s=sin(uYaw); vec2 l=vec2(q.x*c-q.z*s,q.x*s+q.z*c);
      float e=max(abs(l.x),abs(l.y))/(max(a,0.)*uTan+.012); return (1.-smoothstep(.8,1.,e))*smoothstep(0.,.3,a)*smoothstep(-.02,.25,p.y)/(1.+a*.22); }`;
  const volM=new T.ShaderMaterial({uniforms:VU,...ADD,side:T.BackSide,
    vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 vWP; ${GLSL.noise}${DENS}
      void main(){ vec3 ro=cameraPosition, rd=normalize(vWP-ro); float c=cos(uYaw), s=sin(uYaw);
        vec3 o=ro-uBC, lo=vec3(o.x*c-o.z*s,o.y,o.x*s+o.z*c), ld=vec3(rd.x*c-rd.z*s,rd.y,rd.x*s+rd.z*c);
        ld=sign(ld)*max(abs(ld),vec3(1e-5)); vec3 m=1./ld, n=m*lo, k=abs(m)*uBH, t1=-n-k, t2=-n+k;
        float tN=max(max(max(t1.x,t1.y),t1.z),0.), tF=min(min(t2.x,t2.y),t2.z);
        if(tF<=tN){ gl_FragColor=vec4(0.,0.,0.,1.); return; }
        float dt=(tF-tN)/10., acc=0.;
        for(int i=0;i<10;i++){ vec3 p=ro+rd*(tN+(float(i)+.5)*dt); float d=dens(p);
          if(d>.001){ float nz=vnoise3(p*vec3(1.6,2.2,1.6)+vec3(uTime*.05,uTime*.02,-uTime*.04)); acc+=d*(.35+1.2*nz*nz)*dt; } }
        gl_FragColor=vec4(uCol*acc*uK,1.); }`});
  const vol=new T.Mesh(new T.BoxGeometry(2,2,2),volM); vol.renderOrder=950; vol.frustumCulled=false; g.add(vol);
  /* dust that only shows where it is looking */
  const DN=MOBILE?360:720, dg=new T.BufferGeometry(), drr=new Float32Array(DN*4); for(let i=0;i<drr.length;i++) drr[i]=Math.random();
  dg.setAttribute('position',new T.BufferAttribute(new Float32Array(DN*3),3)); dg.setAttribute('aR',new T.BufferAttribute(drr,4)); dg.boundingSphere=new T.Sphere(v3(),1e5);
  const dust=new T.Points(dg,new T.ShaderMaterial({uniforms:VU,...ADD,
    vertexShader:`attribute vec4 aR; uniform float uPx; varying float vA; ${DENS}
      void main(){ vec3 p=vec3((aR.x-.5)*7.4,.08+aR.y*2.5,${zc.toFixed(2)}+(aR.z-.5)*8.4);
        p+=vec3(sin(uTime*.071+aR.w*31.),sin(uTime*.049+aR.x*23.)*.5,cos(uTime*.063+aR.y*27.))*.5;
        vA=dens(p)*(.35+.65*aR.w); vec4 mv=viewMatrix*vec4(p,1.); gl_PointSize=clamp(.03*uPx/max(-mv.z,.2),1.,6.); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uCol*a*a*vA*2.,1.); }`}));
  dust.frustumCulled=false; dust.renderOrder=955; g.add(dust);
  const U=W.U, p=v3(), pv=v3(), M2={x:0,z:zc}, wob={x:0,z:0};
  const lakeAt=(x,z)=>Math.hypot((x-PH_LAKE[0])/PH_LAKE[2],(z-PH_LAKE[1])/PH_LAKE[3])<1?1:0;
  /* one slow loop round the room every 24 s, a little uneven, and over the open water once each time round */
  const pos=(tt,o)=>{ const a=tt*TAU/24+.9; return o.set(.35+1.7*Math.cos(a)+.22*Math.sin(a*2.3),CAMY+.12+.05*Math.sin(tt*.9),zc-.4+1.95*Math.sin(a)+.18*Math.cos(a*1.7)); };
  let yaw=0, doubt=.6, lock=0, locked=false, tp=0, first=true;
  let wetK=0, tK=0;
  return {g, get lock(){ return lock; }, dbg:()=>({lock:+lock.toFixed(2),wet:+wetK.toFixed(2),doubt:+doubt.toFixed(2),torch:+tK.toFixed(2)}), update(dt,t,st){
    tp+=dt; pos(tp,p); pos(tp+.4,pv);
    { const hk=handIn(zc,k), C4=U.uPhC.value; if(hk>0){ const f=tK<.02; C4.x=f?HAND.floor.x:damp(C4.x,HAND.floor.x,10,dt); C4.y=f?HAND.floor.z:damp(C4.y,HAND.floor.z,10,dt); }
      tK=damp(tK,hk,hk>tK?5:2.2,dt); C4.z=tK; }
    const vx=(pv.x-p.x)/.4, vz=(pv.z-p.z)/.4, sp=Math.hypot(vx,vz), want=Math.atan2(vx,vz);
    let dy=((want-yaw+Math.PI)%TAU+TAU)%TAU-Math.PI; yaw+=first?dy:dy*(1-Math.exp(-dt*.9)); first=false;
    const fw=vx*Math.sin(yaw)+vz*Math.cos(yaw), side=vx*Math.cos(yaw)-vz*Math.sin(yaw);
    dr.g.position.copy(p); dr.g.rotation.set(fw*.32,yaw,-side*.32);
    fill.position.set(p.x+.5,p.y+.6,p.z+.6); under.position.set(p.x,.9,p.z);
    const S0=VU.uS.value.set(p.x,p.y-.12,p.z); VU.uYaw.value=yaw; VU.uBC.value.set(p.x,(S0.y)/2,p.z); VU.uBH.value.y=S0.y/2+.04; VU.uPx.value=G.px;
    vol.position.copy(VU.uBC.value); vol.rotation.y=yaw; vol.scale.copy(VU.uBH.value);
    /* how much of what it sees is open water: nine points across the square */
    const hf=S0.y*TANF; let wet=0; for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) wet+=lakeAt(p.x+i*hf*.66,p.z+j*hf*.66); wet/=9;
    const conf=1-sstep(.12,.55,wet); wetK=wet;
    /* where it thinks it is: pulled to the truth while there is map to match, wandering off while there is only water */
    wob.x=damp(wob.x,Math.sin(tp*.7)*.9+Math.sin(tp*1.9)*.3,1.5,dt); wob.z=damp(wob.z,Math.cos(tp*.6)*.8,1.5,dt);
    /* (it keeps moving with the drone, as its own motion says, so a confident fix does not trail behind) */
    M2.x=damp(M2.x+vx*dt,p.x+wob.x*(1-conf)*1.3,.6+3*conf,dt); M2.z=damp(M2.z+vz*dt,p.z+wob.z*(1-conf)*1.3,.6+3*conf,dt);
    const off=Math.hypot(M2.x-p.x,M2.z-p.z);
    doubt=damp(doubt,.16+1.45*(1-conf)+off*.9,2.2,dt);
    const tight=conf>.85&&off<.09; lock=damp(lock,tight?1:0,tight?2.6:5,dt);
    if(lock>.8&&!locked){ locked=true; rsnd('ph-lock',p.x*.08); } if(lock<.25) locked=false;
    U.uPhD.value.set(p.x,p.z,yaw,hf); U.uPhM.value.set(M2.x,M2.z,doubt,lock);
    dr.lensM.color.copy(C).multiplyScalar(2.4+1.6*lock);
  }};
}

/* ---------- Ogive: say how high, and the design is worked until the rocket gets there. A hoop of light hangs in the shaft at
   the height asked for. The rocket on the pad changes shape, one design at a time, and a bead of light shows how high each
   would go: short, over, closer, there. Then it flies: up to the hoop and no higher, and back down on its chute ---------- */
function buildOgive(W,zc,OR,k){
  const g=new T.Group(); W.scene.add(g);
  const shaftL=new T.SpotLight('#FFB475',9000,0,.052,.55,2); shaftL.position.set(0,44,zc); shaftL.target.position.set(0,0,zc); g.add(shaftL); g.add(shaftL.target);
  shaftL.castShadow=true; shaftL.shadow.mapSize.set(512,512); shaftL.shadow.camera.near=30; shaftL.shadow.camera.far=48; shaftL.shadow.bias=-.0008;
  const glowL=new T.PointLight('#FFB475',20,10,1.4); glowL.position.set(0,.6,zc); g.add(glowL);
  const colM=new T.ShaderMaterial({uniforms:{uCol:{value:col('#FFC48C')},uTime:GU.uTime,uK:{value:1}},...ADD,side:T.DoubleSide,
    vertexShader:`varying vec3 vWP; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uTime,uK; varying vec3 vWP; varying vec3 vN; ${GLSL.noise}
    void main(){ vec3 V=normalize(cameraPosition-vWP); float e=abs(dot(normalize(vN),V));
      float n=.55+.45*vnoise(vec2(atan(vWP.x,vWP.z-(${zc.toFixed(2)}))*3.,vWP.y*.6-uTime*.5));
      float a=(e*e)*n*(.55+.45*smoothstep(0.,6.,vWP.y))*smoothstep(0.,.4,vWP.y);
      gl_FragColor=vec4(uCol*a*.1*uK,1.); }`});
  const column=new T.Mesh(new T.CylinderGeometry(OR*.97,OR*.97,44,64,1,true),colM); column.position.set(0,22,zc); g.add(column); W.ogColumn=column;
  /* the rocket, in parts made at unit size and stretched to each design: a boat tail, the body, a tangent ogive nose, four fins */
  const Rr=.12;
  const tail=new T.LatheGeometry([[0,0],[.07,0],[.085,.07],[.1,.14],[Rr,.26]].map(q=>new T.Vector2(q[0],q[1])),48);
  const tube=new T.CylinderGeometry(Rr,Rr,1,48,1,true); tube.translate(0,.5,0);
  /* the nose, measured from its base: full radius where it meets the body, tangent to it, closing to a point at the tip */
  const rho=(Rr*Rr+1)/(2*Rr), noseP=[]; for(let i=0;i<=32;i++){ const x=i/32; noseP.push(new T.Vector2(Math.max(0,Math.sqrt(rho*rho-x*x)+Rr-rho),x)); }
  const nose=new T.LatheGeometry(noseP,48);
  const rkM=new T.MeshStandardMaterial({color:'#F4EFE7',roughness:.4,metalness:0,emissive:new T.Color('#FFB475'),emissiveIntensity:.05});
  const finM=new T.MeshStandardMaterial({color:'#E9E2D8',roughness:.4});
  const bandM=new T.MeshStandardMaterial({color:'#FFB475',roughness:.5,emissive:new T.Color('#FFB475'),emissiveIntensity:.15});
  const rocket=new T.Group(); rocket.position.set(0,.02,zc); g.add(rocket);
  const mTail=new T.Mesh(tail,rkM), mTube=new T.Mesh(tube,rkM), mNose=new T.Mesh(nose,rkM); mTube.position.y=.26;
  const finS=new T.Shape(); finS.moveTo(0,0); finS.lineTo(1,-.1); finS.lineTo(1,.26); finS.lineTo(0,1); finS.lineTo(0,0);
  const finG=new T.ExtrudeGeometry(finS,{depth:.012,bevelEnabled:false}); finG.translate(0,0,-.006);
  const fins=[]; for(let i=0;i<4;i++){ const pv=new T.Group(); pv.rotation.y=i*Math.PI/2+.4; pv.position.y=.2; const f=new T.Mesh(finG,finM); f.position.x=Rr-.01; f.castShadow=true; pv.add(f); rocket.add(pv); fins.push(f); }
  const band=new T.Mesh(new T.CylinderGeometry(Rr+.002,Rr+.002,.06,48,1,true),bandM);
  rocket.add(mTail,mTube,mNose,band); [mTail,mTube,mNose].forEach(m=>{ m.castShadow=true; });
  const cur={Lb:2.05,Ln:.78,Fs:.3,Fc:.62};
  const shape=d=>{ mTube.scale.y=d.Lb; mNose.position.y=.26+d.Lb; mNose.scale.y=d.Ln; band.position.y=.26+d.Lb*.72; fins.forEach(f=>f.scale.set(d.Fs,d.Fc,1)); return .26+d.Lb+d.Ln; };
  /* the flame: a short bright cone under the nozzle, and its glow */
  const flG=new T.CylinderGeometry(.078,.006,.62,24,8,true); flG.translate(0,-.31,0);
  const flU={uTime:GU.uTime,uK:{value:0}};
  const flame=new T.Mesh(flG,new T.ShaderMaterial({uniforms:flU,...ADD,side:T.DoubleSide,
    vertexShader:`uniform float uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 p=position; vY=clamp(-p.y/.62,0.,1.); p.xz*=1.+.16*sin(uTime*31.+p.y*20.)*vY; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uK,uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),V));
      vec3 c=mix(vec3(1.,.96,.84),vec3(1.,.56,.24),vY); float a=pow(f,1.4)*(1.-vY*.85)*(.85+.15*sin(uTime*47.)); gl_FragColor=vec4(c*a*uK*2.4,1.); }`}));
  rocket.add(flame);
  const nz=glowSprite('#FFD2A0',.42); nz.mesh.position.y=-.04; nz.U.uK.value=0; nz.mesh.renderOrder=962; rocket.add(nz.mesh);
  const rkL=new T.PointLight('#FFC892',7,6,1.6); rkL.position.set(.9,1.6,1.6); rocket.add(rkL);
  /* the chute: a pale canopy on eight lines, folded away until the top */
  const chute=new T.Group(); rocket.add(chute); chute.visible=false;
  const canopy=new T.Mesh(new T.SphereGeometry(.36,32,10,0,TAU,0,Math.PI*.42),new T.MeshStandardMaterial({color:'#FBF0E4',roughness:.85,side:T.DoubleSide,emissive:new T.Color('#FFB475'),emissiveIntensity:.08}));
  canopy.position.y=.62; chute.add(canopy);
  const lp=[]; for(let i=0;i<8;i++){ const a=i/8*TAU; lp.push(0,0,0, Math.cos(a)*.35,.62+.36*Math.cos(Math.PI*.42),Math.sin(a)*.35); }
  const lgeo=new T.BufferGeometry(); lgeo.setAttribute('position',new T.Float32BufferAttribute(lp,3));
  chute.add(new T.LineSegments(lgeo,new T.LineBasicMaterial({color:'#D9C9B6',transparent:true,opacity:.7})));
  /* the height asked for: a hoop of light in the shaft. Point into the shaft and you name it: the hoop goes where your
     hand is, and the next designs are worked to that height */
  const HY=5.7, hoopU={uK:{value:.5},uCol:{value:col('#FFC690')}};
  const hoop=new T.Mesh(new T.TorusGeometry(.42,.013,10,120),new T.ShaderMaterial({uniforms:hoopU,...ADD,
    vertexShader:`void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; void main(){ gl_FragColor=vec4(uCol*uK*1.7,1.); }`}));
  hoop.rotation.x=Math.PI/2; hoop.position.set(0,HY,zc); hoop.renderOrder=963; g.add(hoop);
  const hoopG=glowSprite('#FFC690',.9); hoopG.mesh.position.set(0,HY,zc); hoopG.mesh.renderOrder=962; g.add(hoopG.mesh);
  /* how high this design would go: a bead of light thrown up from the nose, and the line it leaves */
  const bead=glowSprite('#FFE6C6',.16); bead.U.uK.value=0; bead.mesh.renderOrder=964; g.add(bead.mesh);
  const trace=lightLine('#FFD7AE',1.6); trace.U.uDash.value=.12; trace.mesh.renderOrder=963; g.add(trace.mesh);
  /* dust rising in the column */
  const DN=MOBILE?160:320, dg=new T.BufferGeometry(), dr=new Float32Array(DN*4); for(let i=0;i<dr.length;i++) dr[i]=Math.random();
  dg.setAttribute('position',new T.BufferAttribute(new Float32Array(DN*3),3)); dg.setAttribute('aR',new T.BufferAttribute(dr,4)); dg.boundingSphere=new T.Sphere(v3(),1e5);
  const dm=new T.ShaderMaterial({uniforms:{uTime:GU.uTime,uC:{value:v3(0,0,zc)},uPx:{value:600},uCol:{value:col('#FFD2A4')}},...ADD,
    vertexShader:`attribute vec4 aR; uniform float uTime,uPx; uniform vec3 uC; varying float vA; void main(){
      float r=sqrt(aR.x)*${(OR*.95).toFixed(2)}, a=aR.y*6.283+uTime*.05*(aR.z-.5); float y=mod(aR.z*16.+uTime*(.12+aR.w*.18),16.);
      vec3 p=uC+vec3(cos(a)*r,y,sin(a)*r); vec4 mv=viewMatrix*vec4(p,1.); gl_PointSize=clamp(.05*uPx/-mv.z*(.5+aR.w),1.,12.);
      vA=smoothstep(0.,1.5,y)*smoothstep(16.,11.,y)*(.4+.6*aR.w); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uCol*a*a*vA*.9,1.); }`});
  const dust=new T.Points(dg,dm); dust.frustumCulled=false; g.add(dust);
  W.ogiveDust=dm;
  /* the designs it tries, and how high each would go */
  const DES=[{Lb:1.6,Ln:.5,Fs:.2,Fc:.46},{Lb:2.32,Ln:1.04,Fs:.4,Fc:.74},{Lb:1.88,Ln:.68,Fs:.26,Fc:.56},{Lb:2.05,Ln:.8,Fs:.3,Fc:.62}];
  const PRED=[-1.35,1.05,-.5,0];   // how far from the height asked for each design would get: short, over, closer, there
  const IT=2.1, T_FLY=IT*4+.7, T_TOP=T_FLY+2.2, T_LAND=T_TOP+3.6, LOOP=T_LAND+1.8;
  let lt=0, from={...DES[3]}, top=shape(cur), alt=0, beat=-1, said=-1, leave=0, hy=HY, hyT=HY, grab=0;
  const setFrom=()=>{ Object.assign(from,cur); };
  const _n=v3(), _h=v3();
  return {g, rocket, get hy(){ return hy; }, dbg:()=>({lt:+lt.toFixed(2),hy:+hy.toFixed(2),grab:+grab.toFixed(2)}), update(dt,t,st){
    const s=S.s;
    /* your hand on the shaft: where the pointer meets the upright plane through its middle, facing you */
    let over=false;
    if(HAND.k>.5&&roomNear(k)>.5){ const r=HAND.ray.ray, cp=CAM.gal.position; _n.set(cp.x,0,cp.z-zc); const L=_n.length();
      if(L>.1){ _n.divideScalar(L); const den=r.direction.dot(_n);
        if(Math.abs(den)>1e-3){ const tt=(-r.origin.x*_n.x+(zc-r.origin.z)*_n.z)/den; _h.copy(r.origin).addScaledVector(r.direction,tt);
          if(tt>0&&Math.hypot(_h.x,_h.z-zc)<1.5&&_h.y>top+.4&&_h.y<9){ over=true; hyT=clamp(_h.y,4.7,6); } } } }
    grab=damp(grab,over?1:0,over?8:3,dt);
    /* the height stays put while the chosen design flies */
    if(lt<T_FLY-.7) hy=damp(hy,hyT,4.5,dt);
    hoop.position.y=hoopG.mesh.position.y=hy;
    /* the next room brightens as you come to it, so Pharos keeps its dark */
    const lk=lerp(.45,1,sstep(k+.3,k+.85,s)); shaftL.intensity=9000*lk; glowL.intensity=20*lk; W.roomLights[k].intensity=5*lk;
    dm.uniforms.uPx.value=G.px; trace.U.uPx.value=G.px;
    lt+=dt; if(lt>=LOOP){ lt-=LOOP; beat=-1; said=-1; setFrom(); }
    let flameK=0, chuteK=0, beadK=0, beadY=0, hoopK=.42;
    if(lt<T_FLY-.7){
      /* one design at a time: the rocket changes shape, then the bead goes up to where that design would get */
      const i=Math.min(3,Math.floor(lt/IT)), u=(lt-i*IT)/IT;
      if(i!==beat){ beat=i; setFrom(); rsnd('og-tick',.1); }
      const m=E.io(clamp(u/.26,0,1)), d=DES[i]; for(const k in cur) cur[k]=lerp(from[k],d[k],m);
      top=shape(cur); alt=0;
      const r=clamp((u-.3)/.38,0,1), y=lerp(top+.05,Math.max(top+.3,hy+PRED[i]),E.o(r));
      beadK=r>0?(u<.86?1:1-(u-.86)/.14):0; beadY=y;
      if(r>=1&&said!==i){ said=i; rsnd('og-pred',0,PRED[i]/2); }
      if(r>=1) hoopK=i===3?1.4:.42+.25*Math.max(0,Math.sin((u-.68)*40.))*(1-(u-.68)/.32);
      if(i===3&&u>.66) hoopK=1.4;
    } else if(lt<T_FLY){ hoopK=1.4; beadK=Math.max(0,1-(lt-(T_FLY-.7))/.5); beadY=hy; }
    else if(lt<T_TOP){
      /* the flight: hard off the pad, burning out, coasting up to the hoop and stopping there */
      const u=(lt-T_FLY)/(T_TOP-T_FLY); if(beat<9){ beat=9; rsnd('og-launch'); }
      alt=(hy-top)*(1-Math.pow(1-u,2.2)); flameK=1-sstep(.38,.62,u); hoopK=1.4+.6*sstep(.9,1,u);
    } else if(lt<T_LAND){
      /* the chute opens at the top, and it comes back down to the pad */
      const u=(lt-T_TOP)/(T_LAND-T_TOP); if(beat<10){ beat=10; rsnd('og-chute'); }
      alt=(hy-top)*(1-sstep(.08,1,u)); chuteK=Math.min(1,u*9)*(1-sstep(.93,1,u)); hoopK=lerp(2,.42,sstep(0,.4,u));
      if(u>.985&&beat===10){ beat=11; rsnd('og-land'); }
    } else { alt=0; hoopK=.42; }
    /* walking on, out of the room: it goes, straight up the shaft and away */
    leave=damp(leave,s>4.02?1:0,s>4.02?.9:6,dt);
    const lv=Math.pow(Math.max(0,s-4)/.5,2.2)*30*leave;
    rocket.position.y=.02+alt+lv+Math.sin(t*.8)*.012*(alt>.05?1:0);
    if(lv>.05) flameK=Math.max(flameK,sstep(.05,.6,lv));
    rocket.rotation.y+=dt*.05;
    flU.uK.value=flameK*.95; nz.U.uK.value=flameK*1.4;
    chute.visible=chuteK>.01; canopy.scale.set(.2+.8*chuteK,.15+.85*chuteK,.2+.8*chuteK); chute.position.y=top-.02; chute.rotation.z=Math.sin(t*.9)*.05*chuteK;
    hoopU.uK.value=damp(hoopU.uK.value,hoopK+.45*grab,6,dt); hoopG.U.uK.value=hoopU.uK.value*.55;
    bead.U.uK.value=beadK*1.6; bead.mesh.position.set(0,beadY,zc);
    trace.U.uA.value.set(0,rocket.position.y+top+.04,zc); trace.U.uB.value.set(0,Math.max(beadY,rocket.position.y+top+.06),zc); trace.U.uK.value=beadK*.5;
  }};
}

/* ---- 40-post.js ---- */
/* ================= POST: BLOOM, TRANSITIONS, THE DROP, THE FILM ================= */
const POST={};
(()=>{
  if(!GL_OK) return;
  const vs=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
  const quad=new T.Mesh(new T.PlaneGeometry(2,2)); quad.frustumCulled=false;
  const scene=new T.Scene(); scene.add(quad); const cam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  POST.pass=(mat,target)=>{ quad.material=mat; renderer.setRenderTarget(target); renderer.render(scene,cam); };
  const o={depthBuffer:false};
  POST.mix=RT(4,4,o);
  POST.down=[]; POST.up=[];
  for(let i=0;i<QL.bloomLv;i++){ POST.down.push(RT(4,4,o)); POST.up.push(RT(4,4,o)); }
  POST.downM=new T.ShaderMaterial({uniforms:{t:{value:null},uHp:{value:new T.Vector2()}},vertexShader:vs,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D t; uniform vec2 uHp; varying vec2 vUv; void main(){ vec3 s=texture2D(t,vUv).rgb*4.;
      s+=texture2D(t,vUv-uHp).rgb; s+=texture2D(t,vUv+uHp).rgb; s+=texture2D(t,vUv+vec2(uHp.x,-uHp.y)).rgb; s+=texture2D(t,vUv-vec2(uHp.x,-uHp.y)).rgb;
      gl_FragColor=vec4(min(s/8.,vec3(60.)),1.); }`});
  POST.upM=new T.ShaderMaterial({uniforms:{t:{value:null},tAdd:{value:null},uHp:{value:new T.Vector2()}},vertexShader:vs,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D t,tAdd; uniform vec2 uHp; varying vec2 vUv; void main(){ vec2 h=uHp;
      vec3 s=texture2D(t,vUv+vec2(-h.x*2.,0.)).rgb+texture2D(t,vUv+vec2(-h.x,h.y)).rgb*2.+texture2D(t,vUv+vec2(0.,h.y*2.)).rgb+texture2D(t,vUv+vec2(h.x,h.y)).rgb*2.
        +texture2D(t,vUv+vec2(h.x*2.,0.)).rgb+texture2D(t,vUv+vec2(h.x,-h.y)).rgb*2.+texture2D(t,vUv+vec2(0.,-h.y*2.)).rgb+texture2D(t,vUv+vec2(-h.x,-h.y)).rgb*2.;
      gl_FragColor=vec4(s/12.+texture2D(tAdd,vUv).rgb,1.); }`});
  /* walking through a doorway: the place you leave dissolves from the middle outward into the one you enter */
  POST.mixM=new T.ShaderMaterial({uniforms:{tA:{value:null},tB:{value:null},uK:{value:0},uTime:GU.uTime,uAsp:{value:1},uLift:{value:new T.Color('#FFE6C4')}},vertexShader:vs,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tA,tB; uniform float uK,uTime,uAsp; uniform vec3 uLift; varying vec2 vUv; ${GLSL.noise}
    void main(){ vec2 uv=vUv; float w=sin(uK*3.14159); vec2 p=(uv-.5)*vec2(uAsp,1.);
      float n=fbm2(p*2.3+vec2(uTime*.06,uTime*.02));
      float r=length(p)*.62+(n-.45)*.6;
      float front=uK*1.65-.3;
      float m=smoothstep(front,front+.14,r);
      vec2 g=(vec2(fbm2(p*3.1+4.),fbm2(p*3.1+9.))-.47)*w*.032;
      vec2 ua=.5+(uv-.5)*(1.-.07*w)+g, ub=.5+(uv-.5)*(1.+.06*(1.-uK)*w)-g;
      vec3 c=mix(texture2D(tB,ub).rgb,texture2D(tA,ua).rgb,m);
      float seam=smoothstep(.16,0.,abs(r-front-.07))*w;
      c+=uLift*seam*.5; c*=1.+w*.3;
      gl_FragColor=vec4(c,1.); }`});
  POST.comp=new T.ShaderMaterial({uniforms:{tScene:{value:null},tBloom:{value:null},uRes:GU.uRes,uTime:GU.uTime,uAsp:{value:1},
      uExpo:{value:1},uBloom:{value:.12},uGrade:{value:new T.Color(1,1,1)},uLift:{value:new T.Vector3(.034,.028,.026)},uSat:{value:1.05},
      uVeil:{value:1},uVeilCol:{value:new T.Color('#F3DDBF')},uDark:{value:0},uLand:{value:0},uLandT:{value:0},tLand:{value:null},uDarkC:{value:new T.Vector2(.5,.5)},uHole:{value:new T.Vector3(.5,.55,0)},uKeep:{value:0},uDim:{value:0},uDimCol:{value:new T.Color(1,1,1)},
      uFlood:{value:0},uFloodCol:{value:new T.Color(1,1,1)},uFloodC:{value:new T.Vector2(.5,.5)},
      uMouse:{value:new T.Vector2(-999,-999)},uVel:{value:new T.Vector2()},uDropR:{value:15},uDropK:{value:0},
      uCA:{value:.0035},uVig:{value:1},uGrain:{value:.045},uFade:{value:0},uBlN:{value:1/QL.bloomLv}},
    vertexShader:vs, depthTest:false, depthWrite:false,
    fragmentShader:`uniform sampler2D tScene,tBloom,tLand; uniform vec2 uRes,uMouse,uVel,uFloodC,uDarkC; uniform float uTime,uAsp,uExpo,uBloom,uSat,uVeil,uDark,uLand,uLandT,uDim,uFlood,uDropR,uDropK,uCA,uVig,uGrain,uFade,uBlN,uKeep;
    uniform vec3 uGrade,uLift,uVeilCol,uDimCol,uFloodCol,uHole; varying vec2 vUv; ${GLSL.noise}
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
    /* most of the curve applied to luminance only, so warm light stays peach instead of turning yellow; the brightest channel rolls to white */
    vec3 tmap(vec3 x){ float L=dot(x,vec3(.2126,.7152,.0722)); float la=aces(vec3(L)).x; vec3 h=x*(la/max(L,1e-5));
      float m=max(h.r,max(h.g,h.b)); if(m>1.) h=mix(h/m,vec3(1.),clamp((m-1.)/(m+.6),0.,1.)); return mix(aces(x),clamp(h,0.,1.),.62); }
    vec3 toS(vec3 c){ c=max(c,vec3(0.)); return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c)); }
    /* the Land way, before you choose it: Land itself, its town on its small world seen from high above (a still rendered by
       Land's own engine, so it is exactly that world, its own clouds in its sky), and you falling slowly towards it. Its
       clouds are flat white with a pale blue rim on the shaded side; the opening's edge is drawn the same way. t is how long
       it has been shown */
    vec3 landCloud(vec3 col,float cn,float a){ float body=smoothstep(.6,.615,cn), rim=smoothstep(.565,.58,cn)-body;
      col=mix(col,vec3(.8,.88,.93),clamp(rim,0.,1.)*a); return mix(col,vec3(.97,.975,.965),body*a); }
    vec3 landView(vec2 uv,float t){
      float ia=1.6; vec2 s=uAsp>ia?vec2(1.,ia/uAsp):vec2(uAsp/ia,1.), an=vec2(.5,0.);
      float k=1.-exp(-t*.3), z=mix(1.,1.05,k);
      vec2 iu=an+(.5+(uv-.5)*s-an)/z; iu.x+=sin(t*.4)*.002*k;
      return texture2D(tLand,iu).rgb; }
    void main(){
      vec2 uv=vUv, fc=uv*uRes;
      if(uDark>0.){ float tr=uDark*uDark; uv+=(vec2(vnoise(vec2(uTime*23.,3.)),vnoise(vec2(7.,uTime*19.)))-.5)*.007*tr; }
      /* the cursor is a drop of water on the glass: it magnifies, catches a highlight, casts a little shadow */
      vec2 dp=fc-uMouse; float vl=length(uVel); vec2 vd=vl>.01?uVel/vl:vec2(1.,0.); float st=clamp(vl*.0012,0.,.5);
      vec2 q=vec2(dot(dp,vd)/(1.+st),dot(dp,vec2(-vd.y,vd.x))*(1.+st*.35));
      float r=length(q)/max(uDropR,1.); float lens=0.,rim=0.,spec=0.,shade=0.;
      if(uDropK>0.){
        float h=sqrt(max(1.-r*r,0.));
        if(r<1.){ uv-=dp/uRes*(.5*h)*uDropK; lens=uDropK; }
        vec2 lq=q/uDropR-vec2(-.34,.36); spec=exp(-dot(lq,lq)*26.)*step(r,1.)*uDropK;
        rim=smoothstep(.72,.98,r)*smoothstep(1.06,.98,r)*uDropK;
        vec2 sq=(dp-vec2(2.,-4.))/uDropR; shade=exp(-((max(length(sq)-.7,0.)*3.)*(max(length(sq)-.7,0.)*3.)))*(1.-step(r,1.))*.16*uDropK;
      }
      vec2 cd=uv-.5; float ca=uCA*(dot(cd,cd)*2.2+.12)+lens*.006;
      vec3 c=vec3(texture2D(tScene,uv+cd*ca).r,texture2D(tScene,uv).g,texture2D(tScene,uv-cd*ca).b);
      vec3 bl=texture2D(tBloom,uv).rgb*uBlN;
      c+=bl*uBloom;
      /* the gate: the place is there behind a sunlit mist, which burns off from the middle when you go in */
      if(uVeil>0.){ vec2 vq=(vUv-vec2(.5,.56))*vec2(uAsp,1.); float vr=length(vq);
        float n=fbm2(vq*2.4+vec2(uTime*.035,uTime*.02));
        float f=clamp(.62*(1.-vr*.9)+.42*n,0.,1.);
        float vm=uVeil>=.999?1.:smoothstep(f*.78,f*.78+.26,uVeil);
        float bl1=dot(bl,vec3(.3,.5,.2));
        vec3 mist=uVeilCol*(.78+.3*bl1)*(1.12-vr*.32)+vec3(1.,.86,.62)*exp(-vr*vr*3.)*.22;
        c=mix(c,mist*.92+bl*.1,vm*.84); }
      c*=uExpo;
      c=tmap(c*.92);
      float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,uSat);
      c=toS(c);
      c=c*(1.-uLift)+uLift;
      c*=uGrade;
      /* a project open: the room softens and dims under the page */
      if(uDim>0.){ vec3 b=toS(aces(bl*uExpo*.92)); b=b*(1.-uLift)+uLift; float gy=mix(.74,.5,smoothstep(.9,.1,vUv.y)); c=mix(c,b*uDimCol*gy,uDim); }
      /* light flooding out of a room */
      if(uFlood>0.){ vec2 fq=(vUv-uFloodC)*vec2(uAsp,1.); float fr=length(fq); float n=fbm2(fq*3.+uTime*.2);
        float R=uFlood*2.1; float m=smoothstep(R,R-.35,fr+(n-.5)*.35); c=mix(c,uFloodCol,m*clamp(uFlood*1.3,0.,1.)); }
      /* Land opens like Fly's dark, from the middle out, but onto open sky, through a bank of Land's own cloud at its edge */
      if(uLand>0.){ vec2 lq=(vUv-vec2(.5,.56))*vec2(uAsp,1.); float lr=length(lq), n=fbm2(lq*2.2+vec2(uTime*.11,-uTime*.07));
        float R=uLand*1.35, e=lr+(n-.5)*.5, m=1.-smoothstep(R-.3,R+.02,e);
        vec3 lv=landView(vUv,uLandT); float eb=1.-smoothstep(R-.34,R-.06,e); lv=landCloud(lv,.5+.1*(1.-eb)+.02*(fbm2(lq*6.)-.5),1.);
        c=mix(c,lv,m*smoothstep(0.,.1,uLand)); }
      /* the dark: what waits on the other side. It spreads from uDarkC; when there is a hole in it (uHole.z, its radius in
         heights of the screen), the starlight behind is bent out round it, its shadow is black, and the thin hot disk round it
         shows its near side across the front and its far side lensed over the top: the Fly way, before you choose it */
      if(uDark>0.){ vec2 dq=(vUv-uDarkC)*vec2(uAsp,1.); float dr=length(dq); float n=fbm2(dq*2.6+vec2(uTime*.18,-uTime*.11));
        float R=uDark*1.3; float edge=(1.-smoothstep(R-.42-uKeep*.3,R+.02,dr+(n-.5)*.5*(1.-uKeep*.8)))*smoothstep(0.,.12,uDark);
        vec3 ink=mix(vec3(.012,.012,.02),vec3(.035,.04,.11),uKeep), keep=bl*uKeep;
        vec2 hq=(vUv-uHole.xy)*vec2(uAsp,1.); float hr=length(hq), rh=uHole.z;
        vec2 lq=rh>0.?hq*(1.+rh*rh*1.7/max(hr*hr,1e-5)):hq; vec2 sf=(lq/vec2(uAsp,1.)+uHole.xy)*uRes;
        float stars=step(.9965,hash12(floor(sf/2.)))*hash12(floor(sf/2.)+3.)*edge;
        c=mix(c,ink,edge*.97)+stars*.55*uDark; c*=1.-uDark*.18;
        if(rh>0.){ float tl=-.13, cs=cos(tl), sn=sin(tl); vec2 dk=vec2(hq.x*cs-hq.y*sn,hq.x*sn+hq.y*cs);
          float sh=1.-smoothstep(rh*.96,rh*1.01,hr);
          float ring=exp(-(((hr-rh*1.045)/(rh*.028))*((hr-rh*1.045)/(rh*.028))));
          float band=exp(-((dk.y/(rh*.055))*(dk.y/(rh*.055))))*(1.-smoothstep(rh*1.7,rh*3.1,abs(dk.x)))*smoothstep(rh*.2,rh*.75,abs(dk.x)+abs(dk.y)*3.);
          float over=exp(-(((hr-rh*1.2)/(rh*.075))*((hr-rh*1.2)/(rh*.075))))*smoothstep(-.05*rh,rh*.5,dk.y);
          float under=exp(-(((hr-rh*1.1)/(rh*.045))*((hr-rh*1.1)/(rh*.045))))*smoothstep(.05*rh,-rh*.45,dk.y)*.4;
          float dop=1.+.7*clamp(-dk.x/(rh*2.4),-1.,1.);
          float flick=.92+.08*fbm2(vec2(atan(dk.y,dk.x)*3.,hr*30.-uTime*.6));
          c=mix(c,vec3(0.),sh*edge);
          c+=(vec3(1.,.74,.46)*(band*1.15+over+under)*dop*flick+vec3(1.,.92,.8)*ring*.85)*edge*smoothstep(.25,1.,uDark); }
        c+=keep*edge; }
      c=c*(1.-lens*.03)+spec*.85-shade+rim*.06;
      c=mix(c,c*vec3(.94,.97,1.03),rim*.6);
      float v=length((vUv-.5)*vec2(uAsp,1.)*uVig); c*=mix(1.,smoothstep(1.25,.25,v),.42);
      c+=(hash12(fc+fract(uTime*7.3)*91.)-.5)*uGrain;
      c=mix(c,vec3(.96,.93,.88),uFade);
      gl_FragColor=vec4(clamp(c,0.,1.),1.);
    }`});
  new T.TextureLoader().load('assets/img/land.webp?v=7079e7612c',t=>{ t.colorSpace=T.NoColorSpace; t.anisotropy=4; POST.comp.uniforms.tLand.value=t; });
  POST.setSize=(w,h)=>{ POST.mix.setSize(w,h); let ww=Math.max(2,w>>1), hh=Math.max(2,h>>1);
    for(let i=0;i<QL.bloomLv;i++){ POST.down[i].setSize(ww,hh); POST.up[i].setSize(ww,hh); ww=Math.max(2,ww>>1); hh=Math.max(2,hh>>1); } };
  POST.bloom=(src)=>{
    let s=src, sw=src.width, sh=src.height;
    for(let i=0;i<QL.bloomLv;i++){ POST.downM.uniforms.t.value=s.texture; POST.downM.uniforms.uHp.value.set(.5/sw,.5/sh); POST.pass(POST.downM,POST.down[i]); s=POST.down[i]; sw=s.width; sh=s.height; }
    let u=POST.down[QL.bloomLv-1];
    for(let i=QL.bloomLv-2;i>=0;i--){ POST.upM.uniforms.t.value=u.texture; POST.upM.uniforms.tAdd.value=POST.down[i].texture; POST.upM.uniforms.uHp.value.set(.5/u.width,.5/u.height); POST.pass(POST.upM,POST.up[i]); u=POST.up[i]; }
    return u.texture;
  };
})();

/* ---- 50-path.js ---- */
/* ================= THE WALK =================
   One path through one place. s runs from 0 (Home) to 6 (Contact); the scroll moves along it.
   Each scene has its own camera track; through a doorway both play at once and the composite blends them. */
const K=(s,p,t,f)=>({s,p,t,f});
const TRACK={
  out:[ /* across the water on the stepping stones, up the steps, into the portal */
    K(0,   [21,1.5,94],[1.6,5.2,3],29),
    K(.12, [14.6,1.52,71],[1.2,4.5,2],32),
    K(.26, [7.6,1.58,47],[.6,3.5,2],36),
    K(.38, [2.2,1.66,27],[0,3,4],40),
    K(.46, [.2,1.76,15.4],[0,2.9,0],44),
    K(.5,  [0,2.3,12.2],[0,2.9,-4],46),
    K(.54, [0,2.8,9.4],[0,2.85,-6],47),
    K(.6,  [0,2.85,5.6],[0,2.7,-8],50)],
  out2:[ /* out of the gallery through the far arch and along the pool to the three of us, who rise out of the water as you
           come. Then you turn, past Abraham, and walk on out through the arch you came in by, the sunset over the lake framed
           in it: every scroll forward a step forward (walking backwards away from us felt like being pulled back) */
    K(4.4, [-9.4,1.72,-10.1],[8,1.5,-10.2],50),
    K(4.5, [-8.2,1.7,-10.15],[8,1.45,-10.2],46),
    K(4.75,[-5.8,1.6,-10.2],[8,1.32,-10.2],42),
    K(5,   [-4.4,1.5,-10.2],[8,1.0,-10.2],41),
    K(5.1, [-4.6,1.55,-10.1],[-4.0,1.4,2.2],44),
    K(5.2, [-5.2,1.6,-10.2],[-17.2,1.7,-10.3],46),
    K(5.32,[-8.8,1.66,-10.2],[-30,2.2,-10.4],47),
    K(5.44,[-14.4,1.68,-10.25],[-50,2.6,-10.6],47),
    K(5.56,[-16.2,1.6,-10.4],[-70,3,-10.6],47),
    K(5.7, [-17.8,1.53,-10.15],[-80,3.6,-10.6],45),
    K(5.84,[-20.4,1.48,-9.95],[-110,6.2,-11],43),
    K(6,   [-24.5,1.42,-9.7],[-200,9.2,-11.5],42),
    K(6.5, [-30,1.42,-9.7],[-200,10,-11.5],42)],
};
/* in portrait the camera stands further back with a wider lens, and walks past the three of us one by one */
const TRACK_P={
  out:{0:K(0,[3.4,1.5,80],[.6,4.1,2],52), .12:K(.12,[2.8,1.55,61],[.5,3.6,1],52), .26:K(.26,[2.2,1.6,43],[.3,3.1,2],52)},
  out2:{5:K(5,[1.2,1.45,-10.2],[7.6,1.2,-10.2],46), 5.1:K(5.22,[.6,1.5,-6.2],[.9,1.4,5.8],50), 5.2:K(5.3,[-.6,1.56,-8.6],[-12.6,1.7,-9.8],52), 5.32:K(5.38,[-6,1.64,-10],[-30,2.2,-10.4],52), 6:K(6,[-24.5,1.42,-9.7],[-200,12,-11.5],56), 6.5:K(6.5,[-30,1.42,-9.7],[-200,12,-11.5],56)},
  outAdd:[K(4.86,[1.2,1.45,-14.4],[7.6,1.2,-14.4],46), K(5.14,[1.2,1.45,-6],[7.6,1.2,-6],46)],
};
/* the gallery's track is made from the rooms, in the order you walk through them: in through the middle of each doorway,
   up to the room, then to where it is best seen. Each room's two poses are given from its own centre (x, y, z from zc;
   the target likewise; the lens), and a phone held upright stands further back with a wider lens */
const VIEW={
  aetos: {a:[[0,1.68,8.5],[0,3.8,1.4],46], v:[[0,1.38,4.5],[0,7.5,-.7],56], vp:[[0,1.36,5],[0,7.5,-.8],70], d:3.8},
  pharos:{a:[[-.4,1.65,7.3],[.15,1.6,.3],45], v:[[-1.75,1.62,6.4],[.25,1.55,0],44], vp:[[-1.65,1.62,6.5],[.25,1.55,0],62], d:2},
  ogive: {a:[[.35,1.6,7.3],[0,3,0],48], v:[[1.25,1.5,6.7],[0,3.1,0],50], vp:[[1.1,1.5,6.7],[0,3.25,0],64], d:2.7},
  krios: {a:[[-.3,1.66,7.8],[1.6,1.95,-.5],48], v:[[-1.2,1.62,5.4],[.9,2.05,-.6],46], vp:[[-.8,1.62,6.8],[1.78,.85,-.6],62], d:1.9},
};
function galTrack(port){
  const L=[K(.4,[0,1.72,3.6],[0,1.8,-8],48), K(.5,[0,1.72,.8],[0,1.76,-10],46), K(.72,[0,1.7,-5],[0,1.9,-14],42)];
  PROJ.forEach((p,k)=>{ const zc=roomZ(k), V=VIEW[p.id], at=(o,z)=>[o[0],o[1],z+o[2]], vw=port?V.vp:V.v;
    if(k>0) L.push(K(k+.45,[0,1.68,wallZ(k)-.6],[0,V.d,zc+1.5],46));   // through the middle of the doorway
    L.push(K(k===0?.86:k+.64,at(V.a[0],zc),at(V.a[1],zc),V.a[2]));
    L.push(K(k+1,at(vw[0],zc),at(vw[1],zc),vw[2])); });
  /* and out: past the last room to the far arch, and into the courtyard's light */
  L.push(K(4.3,[.2,1.7,-72.2],[0,2.2,-82],46), K(4.5,[0,1.72,-76.6],[0,1.9,-84],46), K(4.6,[0,1.72,-78.8],[0,1.9,-86],48));
  return L;
}
function tracksFor(port){
  const out={gal:galTrack(port)};
  for(const k of ['out','out2']){
    let L=TRACK[k].map(x=>({...x}));
    if(port){ const o=TRACK_P[k]; L=L.map(x=>o[x.s]?{...o[x.s]}:x); if(k==='out2') L=L.concat(TRACK_P.outAdd.map(x=>({...x}))).sort((a,b)=>a.s-b.s); }
    out[k]=L;
  }
  return out;
}
let TR=tracksFor(false);
/* the stops the scroll settles on */
let STOPS=[0,1,2,3,4,5,6];
function setLayout(){ const p=portrait(); TR=tracksFor(p); STOPS=p?[0,1,2,3,4,4.86,5,5.14,6]:[0,1,2,3,4,5,6]; }

/* C1 interpolation through unevenly spaced keys (Catmull-Rom tangents, Hermite basis) */
function trackEval(keys,s,outP,outT){
  let i=0; const n=keys.length;
  if(s<=keys[0].s) i=0; else if(s>=keys[n-1].s) i=n-2; else { while(i<n-2&&s>keys[i+1].s) i++; }
  const a=keys[i], b=keys[i+1], h=b.s-a.s, u=clamp((s-a.s)/h,0,1);
  const pa=keys[Math.max(0,i-1)], pb=keys[Math.min(n-1,i+2)];
  const h00=2*u*u*u-3*u*u+1, h10=u*u*u-2*u*u+u, h01=-2*u*u*u+3*u*u, h11=u*u*u-u*u;
  const tan=(k0,k1,get,j)=>(get(k1)[j]-get(k0)[j])/Math.max(1e-4,k1.s-k0.s);
  const go=(get,out)=>{ for(let j=0;j<3;j++){ const m0=tan(pa===a?a:pa,pa===a?b:b,get,j), m1=tan(a,pb===b?b:pb,get,j);
      out.setComponent(j,h00*get(a)[j]+h10*h*m0+h01*get(b)[j]+h11*h*m1); } };
  go(k=>k.p,outP); go(k=>k.t,outT);
  return lerp(a.f,b.f,u*u*(3-2*u));
}
/* virtual scroll position v (in stops) to path position s. Between two stops the walk is paced by how much the picture
   changes, not by how far along the path it is: a long turn takes more scroll, a straight stretch less, so a steady scroll
   gives a steady walk. It still eases out of one stop and into the next, and a doorway, where one place gives way to the
   next, takes its own unhurried share of the scroll so you cross a threshold at a walk and see the room open up */
const PACE={tr:null, stops:null, seg:[], N:240, DOOR:.28, FLOOR:.3, EVEN:.22, EASE:.4};
function paceBuild(){
  PACE.tr=TR; PACE.stops=STOPS; PACE.seg=[];
  const p0=v3(),t0=v3(),p1=v3(),t1=v3(), a0=v3(), a1=v3();
  const look=(s,p,t)=>{ const m=sceneMix(s), name=m.b&&m.k>.5?m.b:m.a; return trackEval(name==='gal'?TR.gal:(s<2.5?TR.out:TR.out2),s,p,t); };
  for(let i=0;i<STOPS.length-1;i++){
    const a=STOPS[i], b=STOPS[i+1], N=PACE.N, ds=(b-a)/N, d=new Float64Array(N), door=new Uint8Array(N);
    let sum=0, n=0;
    for(let j=0;j<N;j++){ const s=a+(j+.5)*ds;
      if([DOOR_IN,DOOR_OUT].some(x=>Math.abs(s-x)<BLEND)){ door[j]=1; continue; }
      /* how much the picture changes over this step: how far the view turns, how far the camera travels against how far
         off it is looking, and how much the lens zooms */
      const f0=look(s-ds/2,p0,t0), f1=look(s+ds/2,p1,t1);
      a0.subVectors(t0,p0); a1.subVectors(t1,p1); const l0=a0.length(), l1=a1.length();
      const turn=Math.acos(clamp(a0.dot(a1)/(l0*l1),-1,1)), go=p0.distanceTo(p1)/Math.max(2,(l0+l1)/2), zoom=Math.abs(f1-f0)/Math.max(1,f0);
      d[j]=(turn+.75*go+zoom)/ds; sum+=d[j]; n++; }
    const mean=n?sum/n:1;
    let rest=0, nd=0;
    for(let j=0;j<N;j++){ if(door[j]){ nd++; continue; } d[j]=lerp(Math.max(d[j],PACE.FLOOR*mean),mean,PACE.EVEN); rest+=d[j]; }
    if(nd){ const dd=PACE.DOOR/(1-PACE.DOOR)*rest/nd; for(let j=0;j<N;j++) if(door[j]) d[j]=dd; }
    /* soften the edges, so the pace never changes from one step to the next */
    for(let pass=0;pass<3;pass++){ const c=d.slice(); for(let j=0;j<N;j++){ let t=0,w=0; for(let k=-4;k<=4;k++){ const q=j+k; if(q>=0&&q<N){ t+=c[q]; w++; } } d[j]=t/w; } }
    const C=new Float64Array(N+1); for(let j=0;j<N;j++) C[j+1]=C[j]+d[j]; for(let j=0;j<=N;j++) C[j]/=C[N];
    PACE.seg.push({a,b,C}); }
}
function warp(v){
  if(PACE.tr!==TR||PACE.stops!==STOPS) paceBuild();
  const n=STOPS.length; v=clamp(v,0,n-1); const i=Math.min(n-2,Math.floor(v)), f=v-i, g=PACE.seg[i], C=g.C, N=C.length-1;
  const e=clamp(f-PACE.EASE*Math.sin(TAU*f)/TAU,0,1);
  let lo=0, hi=N; while(hi-lo>1){ const m=(lo+hi)>>1; if(C[m]<=e) lo=m; else hi=m; }
  const u=(lo+(e-C[lo])/Math.max(1e-9,C[hi]-C[lo]))/N;
  return lerp(g.a,g.b,clamp(u,0,1));
}
function stopOf(s){ let best=0,d=1e9; STOPS.forEach((x,i)=>{ const dd=Math.abs(x-s); if(dd<d){ d=dd; best=i; } }); return best; }
/* which scene is on screen, and how far through a doorway blend */
function sceneMix(s){
  if(s<DOOR_IN-BLEND) return {a:'out',b:null,k:0};
  if(s<=DOOR_IN+BLEND) return {a:'out',b:'gal',k:sstep(DOOR_IN-BLEND,DOOR_IN+BLEND,s)};
  if(s<DOOR_OUT-BLEND) return {a:'gal',b:null,k:0};
  if(s<=DOOR_OUT+BLEND) return {a:'gal',b:'out',k:sstep(DOOR_OUT-BLEND,DOOR_OUT+BLEND,s)};
  return {a:'out',b:null,k:0};
}
/* the world's colour: each room tints everything with its project's light as you arrive */
const TINT=new T.Color(1,1,1), _tc=PROJ.map(p=>col(p.col)), _warm=col('#FFF6EA');
function tintAt(s,out){
  if(s<.55||s>4.45){ out.copy(_warm); return out; }
  const f=clamp(s-1,0,3), k=Math.min(2,Math.floor(f)), t=sstep(.3,.7,f-k);
  out.copy(_tc[k]).lerp(_tc[k+1],f>=3?1:t);
  if(s<1) out.copy(_warm).lerp(_tc[0],sstep(.55,.9,s));
  if(s>4) out.lerp(_warm,sstep(4.1,4.45,s));
  return out;
}
/* where the place says you are */
function placeAt(s){ let best=PLACES[0],d=1e9; for(const p of PLACES){ const dd=Math.abs(p.s-s); if(dd<d){ d=dd; best=p; } } return best; }

/* ---- 60-input.js ---- */
/* ================= THE HAND: SCROLL, TOUCH, KEYS, HOLD =================
   A damped virtual scroll. Input moves a target; the walk follows it with weight. One gesture takes you one place on: once
   the hand has moved the walk off a place it is on its way to the next one that way, and when the hand goes still it walks
   on there, never back. A fling never carries you past that next place, however long a trackpad's tail goes on; a new
   gesture (the next notch of a wheel, another swipe, even one that starts while the last one's tail is still fading) takes
   you one place further. The walk only goes back when the hand does, or by a hair when the hand only grazed the wheel. */
const SC={v:0, target:0, lastIn:-9, dir:1, turn:0, glide:null, touch:null, inertia:0, base:0, k:2.6, fresh:true, src:'wheel', wt:-9, g0:-9, fast:0, slow:0, fell:false, sign:0, gmin:9};
/* how far the hand travels for one place: generous, so the walk keeps its pace however hard you scroll */
const PXSTOP=()=>FINE?1250:Math.max(560,innerHeight*.85);
/* less than DEAD and the hand only grazed the wheel or the glass, and the walk stays on its place; the hand has turned back
   once it has come back TURN, never on a tremor */
const DEAD=.035, TURN=.025;
const now=()=>performance.now()/1000;
function scrollMax(){ return STOPS.length-1; }
/* a wheel turned notch by notch (a tenth of a second or more apart), not a trackpad's stream of sixty a second: every
   notch is meant, however small (a Mac gives a slow notch of a mouse wheel as 4 pixels), and it turns the way it goes at
   once */
const ticks=()=>SC.src==='wheel'&&SC.gmin>=.1;
/* where the walk is going: the place the target stands on, or the next one the way the hand is going */
function aim(){ const x=SC.target, r=Math.round(x), tick=ticks()&&Math.abs(x-SC.base)>=.002;
  return clamp(Math.abs(x-r)<DEAD&&!tick?r:(SC.dir>0?Math.ceil(x):Math.floor(x)),0,scrollMax()); }
/* a gesture starts from where the walk is going and reaches at most one place on from there */
function gesture(){ SC.base=aim(); SC.turn=SC.target; SC.g0=now(); SC.fresh=false; SC.fell=false; SC.gmin=9; }
const reach=x=>clamp(x,Math.max(0,SC.base-1),Math.min(scrollMax(),SC.base+1));
/* when the hand turns back, the walk turns at once from where it is, not from where it was heading (the target runs ahead
   of the walk, and would carry it on the old way a moment longer) */
function steer(){ const d=SC.target-SC.turn; if(d*SC.dir>=0){ SC.turn=SC.target; return; } if(Math.abs(d)<=(ticks()?0:TURN)) return;
  SC.dir=-SC.dir; const c=reach(SC.dir>0?Math.max(SC.target,SC.v):Math.min(SC.target,SC.v))-SC.target;
  SC.target+=c; if(SC.touch) SC.touch.v0+=c; SC.turn=SC.target; }
function moveBy(dv){ SC.target=reach(SC.target+dv); steer(); }
/* keys, the menu and a jump set the walk going somewhere of their own: the next input starts afresh from there */
function goTo(i,d){ SC.glide=i; SC.target=i; SC.dir=d; SC.turn=i; SC.inertia=0; SC.fresh=true; }
function nudge(dv,fresh){
  if(S.mode!=='world') return;
  if(fresh||SC.fresh||SC.glide!==null) gesture();
  SC.glide=null; SC.pin=false; SC.inertia=0; SC.src='wheel'; moveBy(dv); SC.lastIn=now(); SC.lastF=S.frame;
  UI.firstScroll();
}
/* a new gesture on the wheel: the hand still for a moment, a turn the other way, or a clear rise in a stream that had been
   fading (a trackpad goes on sending its fading tail after the fingers lift; the fingers coming down again for another
   swipe, or the next notch of a wheel, rise out of it). fast and slow are the stream's strength over the last two frames or
   so and over the last fifth of a second */
function wheelFresh(d){
  const t=now(), gap=t-SC.wt, ad=Math.abs(d), sg=Math.sign(d); SC.wt=t;
  const f=SC.fast*Math.exp(-gap/.03), s=SC.slow*Math.exp(-gap/.2);
  if(f/.03<s/.2*.8) SC.fell=true;
  SC.fast=f+ad; SC.slow=s+ad;
  const turned=sg&&sg!==SC.sign&&ad>=4; if(sg&&(ad>=4||!SC.sign)) SC.sign=sg;
  const fresh=gap>.18||turned||(SC.fell&&ad>=6&&SC.fast/.03>1.6*SC.slow/.2&&t-SC.g0>.12);
  if(!fresh) SC.gmin=Math.min(SC.gmin,gap);
  return fresh;
}
function scrollTick(dt){
  const t=now();
  if(S.mode==='world'||S.mode==='veil'){
    const touching=!!SC.touch;
    if(SC.glide!==null||touching) SC.pin=false;
    if(SC.inertia&&!touching){ moveBy(SC.inertia*dt); SC.inertia*=Math.exp(-4.2*dt); if(Math.abs(SC.inertia)<.02) SC.inertia=0; }
    /* settle once the hand lets go: on the place the walk is going to. A finger off the glass is plainly done; a wheel
       could still be turning, so it waits a moment, unless what is coming is only fading (the tail a trackpad sends after
       the fingers lift, or the gap after a notch), when the walk carries on the way it was going at once; and a graze waits
       longest before the walk steps back to its place. (The test browser draws a frame only now and then, so there it
       waits for some frames as well as for the time) */
    const slow=TEST&&!SC.live, quiet=t-SC.lastIn, goal=aim(), back=(goal-SC.target)*SC.dir<0;
    const Q=slow?1.6:(back?1:(SC.src==='touch'?.12:.3)), still=!slow||S.frame-(SC.lastF||0)>6;
    const wg=t-SC.wt, fading=!slow&&!back&&SC.src==='wheel'&&SC.fast*Math.exp(-wg/.03)/.03<.8*SC.slow*Math.exp(-wg/.2)/.2;
    if(!touching&&(quiet>Q||fading)&&still&&SC.glide===null&&!SC.pin){
      SC.target=damp(SC.target,goal,clamp(.9+(quiet-Q)*4,.9,2.6),dt);
      if(Math.abs(SC.target-goal)<1e-4) SC.target=goal;
    }
    /* the walk follows the hand with weight, unhurried; closer under a finger. The weight changes gently, so the walk never
       lurches as a finger lifts */
    SC.k=damp(SC.k,SC.glide!==null?1.8:(touching?6:2.6),5,dt);
    SC.v=damp(SC.v,SC.target,SC.k,dt);
    if(SC.glide!==null&&Math.abs(SC.v-SC.glide)<.004){ SC.v=SC.target=SC.glide; SC.glide=null; }
  }
}
/* travel: a short walk glides; a long one passes through a wash of light */
function travel(id){
  const p=placeById(id); if(!p) return;
  let idx=STOPS.indexOf(p.s); if(idx<0) idx=stopOf(p.s);
  if(S.mode!=='world') return;
  const d=Math.abs(idx-SC.v);
  if(d<.02) return;
  if(d<=1.25){ const up=idx>SC.v; goTo(idx,up?1:-1); A.whoosh(up,1.6,.04); }
  else VEIL.go(idx,p);
}
const VEIL={t:0,phase:0,to:0,col:new T.Color(),k:0,
  go(idx,p){ this.to=idx; this.t=0; this.phase=1; S.mode='veil'; this.col.set(p.proj>=0?PROJ[p.proj].col:(p.id==='contact'?'#E9B9A0':p.id==='team'?'#FFD2A8':'#FFF0DC')); A.whoosh(true,1.4,.05); },
  tick(dt){
    if(!this.phase) return;
    this.t+=dt;
    if(this.phase===1){ this.k=E.io2(clamp(this.t/.55,0,1)); if(this.t>=.6){ this.phase=2; this.t=0; SC.v=SC.target=SC.turn=this.to; SC.glide=null; SC.inertia=0; SC.fresh=true; UI.jumped(); } }
    else if(this.phase===2){ this.k=1; if(this.t>.12){ this.phase=3; this.t=0; } }
    else { this.k=1-E.o(clamp(this.t/.9,0,1)); if(this.t>=.9){ this.phase=0; this.k=0; if(S.mode==='veil') S.mode='world'; } }
  }};

/* ---------- pointer ---------- */
const M={x:innerWidth/2,y:innerHeight/2,px:innerWidth/2,py:innerHeight/2,vx:0,vy:0,on:false,type:'mouse',t:0};
const HOLD={down:false,open:false,t0:0,x:0,y:0,moved:false,id:-1,pointer:null};
const isUI=el=>!!(el&&el.closest&&el.closest('a,button,input,[data-noh]'));
addEventListener('pointermove',e=>{
  const t=now(), dt=Math.max(.008,t-M.t); M.t=t;
  M.vx=lerp(M.vx,(e.clientX-M.x)/dt,.35); M.vy=lerp(M.vy,(e.clientY-M.y)/dt,.35);
  M.x=e.clientX; M.y=e.clientY; M.type=e.pointerType; M.on=e.pointerType==='mouse'||e.pointerType==='pen';
  if(HOLD.down&&!HOLD.open){ const d=Math.hypot(e.clientX-HOLD.x,e.clientY-HOLD.y); if(d>(e.pointerType==='touch'?10:14)){ HOLD.moved=true; HOLD.down=false; UI.ring(0); } }
  if(HOLD.open) UI.indexHover(e.clientX,e.clientY);
  if(SC.touch&&e.pointerId===SC.touch.id){ const dy=SC.touch.y-e.clientY;
    if(S.mode==='world'){ SC.target=reach(SC.touch.v0+dy/PXSTOP()); steer(); SC.lastIn=t; SC.lastF=S.frame; UI.firstScroll(); }
    const vt=(dy-SC.touch.py)/Math.max(.008,t-SC.touch.pt); SC.touch.vel=lerp(SC.touch.vel,vt,.4); SC.touch.py=dy; SC.touch.pt=t; SC.touch.far=Math.max(SC.touch.far,Math.abs(dy)); }
},{passive:true});
addEventListener('pointerdown',e=>{
  if(e.button>0) return;
  M.x=e.clientX; M.y=e.clientY; M.type=e.pointerType;
  /* a swipe walks wherever it starts, on a link too (a finger that moves never makes a click); only a still tap is the link's */
  if(e.pointerType==='touch'&&S.mode==='world'&&!HOLD.open&&!(e.target&&e.target.closest&&e.target.closest('input,textarea'))){
    SC.inertia=0; SC.glide=null; SC.src='touch'; gesture(); SC.touch={id:e.pointerId,y:e.clientY,v0:SC.target,vel:0,py:0,pt:now(),far:0,ui:isUI(e.target)}; }
  if(S.mode==='world'&&!isUI(e.target)&&!HOLD.open){ HOLD.down=true; HOLD.moved=false; HOLD.t0=now(); HOLD.f0=S.frame; HOLD.x=e.clientX; HOLD.y=e.clientY; HOLD.id=e.pointerId; }
  if(S.mode==='world'&&!isUI(e.target)&&e.pointerType!=='touch') WORLD.tap(e.clientX,e.clientY);
},{passive:true});
const endPointer=e=>{
  /* a flick carries on after the finger lifts, so the walk keeps its speed; a finger that stopped before it lifted, or that
     only wobbled on a tap, throws nothing */
  if(SC.touch&&e.pointerId===SC.touch.id){ const far=SC.touch.far, v=now()-SC.touch.pt<.08&&far>16?SC.touch.vel:0, moved=far>8;
    if(S.mode==='world'&&moved){ SC.inertia=clamp(v/PXSTOP(),-2.5,2.5)*.6; }
    else if(S.mode==='world'&&!moved&&!HOLD.open&&e.type==='pointerup'&&!SC.touch.ui) WORLD.tap(e.clientX,e.clientY);
    SC.touch=null; SC.lastIn=now(); SC.lastF=S.frame; }
  if(HOLD.open){ UI.indexRelease(e.clientX,e.clientY,now()-HOLD.t0); }
  HOLD.down=false; UI.ring(0);
};
addEventListener('pointerup',endPointer,{passive:true});
addEventListener('pointercancel',endPointer,{passive:true});
document.addEventListener('mouseleave',()=>{ M.on=false; });
/* (a press only counts as held once a few frames have gone by as well: on a slow frame the finger's first move can be
   waiting behind it, and a swipe must never open the index) */
function holdTick(){
  if(HOLD.down&&!HOLD.open&&!HOLD.moved){ const k=(now()-HOLD.t0-.12)/.48; UI.ring(clamp(k,0,1),HOLD.x,HOLD.y);
    if(k>=1&&S.frame-HOLD.f0>=6){ /* a held finger, not one slow frame: the start of a swipe never opens it */ HOLD.open=true; HOLD.down=false; UI.ring(0); UI.indexOpen(true); if(SC.touch){ SC.touch=null; } } }
}
addEventListener('wheel',e=>{
  if(S.mode==='gate'||S.mode==='entering'||S.mode==='plain'){ return; }
  e.preventDefault();
  let d=Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.2?e.deltaX:e.deltaY;
  if(e.deltaMode===1) d*=32; else if(e.deltaMode===2) d*=innerHeight;
  d=clamp(d,-260,260); S.wheelLog=(S.wheelLog||[]).slice(-9).concat([[Math.round(e.deltaY),e.deltaMode,Math.round(d),+SC.target.toFixed(3)]]);
  if(HOLD.open) return;
  nudge(d/PXSTOP(),wheelFresh(d));
},{passive:false});
addEventListener('keydown',e=>{
  if(e.target&&e.target.closest&&e.target.closest('input,textarea')) return;
  if(e.key==='Escape'){ if(HOLD.open){ UI.indexOpen(false); return; } }
  if(S.mode==='gate'||S.mode==='plain') return;
  if(S.mode!=='world') return;
  const f=document.activeElement; const onCtl=f&&f!==document.body&&f.matches&&f.matches('a,button');
  if(['ArrowDown','PageDown','ArrowRight'].includes(e.key)||(e.key===' '&&!onCtl)){ e.preventDefault(); goTo(Math.min(scrollMax(),Math.round(SC.target)+1),1); UI.firstScroll(); }
  else if(['ArrowUp','PageUp','ArrowLeft'].includes(e.key)){ e.preventDefault(); goTo(Math.max(0,Math.round(SC.target)-1),-1); }
  else if(e.key==='Home'){ e.preventDefault(); travel('home'); }
  else if(e.key==='End'){ e.preventDefault(); travel('contact'); }
  else if(e.key==='i'||e.key==='I'){ UI.indexOpen(!HOLD.open); }
});
/* a long press on a touch screen is ours (the index), not the browser's menu */
addEventListener('contextmenu',e=>{ if(M.type==='touch'||HOLD.down||HOLD.open) e.preventDefault(); });

/* ---- 70-ui.js ---- */
/* ================= THE PAGE OVER THE PLACE ================= */
const UI={};
const INK=col('#2B2520'), LIGHT=col('#FFF8EE'), _fg=new T.Color();
outLinks(document);
/* headlines are split into words: they rise in one by one, and the water reflects each word where it stands */
$$('.split').forEach(el=>{ const txt=el.textContent.trim(); el.setAttribute('aria-label',txt); el.textContent='';
  txt.split(' ').forEach((w,i,a)=>{ const s=document.createElement('span'); s.className='w'; s.setAttribute('aria-hidden','true'); s.style.setProperty('--i',i); s.textContent=w; el.appendChild(s); if(i<a.length-1) el.appendChild(document.createTextNode(' ')); }); });

/* ---------- gate ---------- */
const gate=$('#gate'), ui=$('#ui');
UI.loadStep=(k)=>{ const ls=$$('#word span'); const n=Math.round(clamp(k,0,1)*ls.length); ls.forEach((l,i)=>l.classList.toggle('in',i<n)); };
UI.gateReady=()=>{ holeK=null; gate.classList.remove('loading'); gate.classList.add('ready'); $('#tamed').disabled=false; gateFoot(); };
/* the three ways in. Pointing at one (or focusing it) shows its world behind the letters, with its sound: Walk, the
   walk's own evening through a thinning mist; Land, a bright drawn sky over a small town with a rocket coming down; Fly,
   the dark coming in round a black hole. On a touch screen, with nothing to point with, the gate shows them in turn */
S.gateHover=null;
const WAYS=$$('#gate .way[data-way]'), OLD={tamed:'walk',untamed:'fly'};
const setHover=(v,quiet)=>{ v=OLD[v]||v||null; if(S.gateHover===v) return; S.gateHover=v;
  ['walk','land','fly'].forEach(w=>gate.classList.toggle(w,v===w)); WAYS.forEach(w=>w.classList.toggle('on',w.dataset.way===v));
  if(v){ if(!quiet) A.hover(); A.preview(v); if(A.on) S.prevAt=performance.now(); } };
/* the line at the foot: how to look and how to go */
function gateFoot(){ $('#gateState').textContent=FINE?'Point or scroll to look, click to go':'Swipe to look, tap to go'; }
WAYS.forEach(w=>{ const v=w.dataset.way;
  w.addEventListener('pointerenter',e=>{ if(e.pointerType==='mouse'||e.pointerType==='pen'){ CYC.off=true; setHover(v); } });
  w.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse'||e.pointerType==='pen') setHover(null); });
  w.addEventListener('focus',()=>{ CYC.off=true; setHover(v); }); w.addEventListener('blur',()=>{ if(!S.leaving) setHover(null); }); });
$('#tamed').addEventListener('click',()=>enter());
/* a browser lets sound start only from a click, a tap or a key; pointing and a mouse wheel are not enough. So the sound
   wakes on the first of those it allows (on a phone the first swipe between the ways, on a desktop the arrow keys or any
   click), and the way being shown is heard at once */
S.prevAt=0;
const gateWake=()=>{ if(S.mode!=='gate'||(A.on&&A.ctx&&A.ctx.state==='running')) return;
  (A.on?A.ctx.resume():A.start()).then(()=>{ if(S.mode==='gate'&&!S.leaving&&S.gateHover&&performance.now()-S.prevAt>400){ A.preview(S.gateHover); S.prevAt=performance.now(); } }).catch(()=>{}); };
['pointerdown','pointerup','touchend','keydown'].forEach(ev=>addEventListener(ev,gateWake,{capture:true,passive:true}));
/* Land and Fly leave the walk. On this site the gate goes over to that world's light first, so the change of page is not a
   cut; when they live somewhere else they open in a tab of their own */
const leaveTo=(a,v)=>a.addEventListener('click',e=>{ if(S.mode!=='gate'||S.leaving){ e.preventDefault(); return; } A.click();
  if(!sameSite(a.getAttribute('href')||'')) return;
  e.preventDefault(); S.leaving=true; CYC.off=true; setHover(v,true); gate.style.setProperty('--out',v==='land'?'#EAF4F4':'#030305');
  gate.classList.add('leaving'); A.leave(v); setTimeout(()=>location.assign(a.href),RM?120:820); });
leaveTo($('#land'),'land'); leaveTo($('#untamed'),'fly');
/* where the Fly way's black hole sits: behind the middle of the word, about as big as the letters are tall */
let holeK=null; addEventListener('resize',()=>{ holeK=null; });
UI.holeAt=()=>{ if(!holeK){ const r=$('#word').getBoundingClientRect(); holeK=[(r.left+r.width/2)/innerWidth,1-(r.top+r.height/2)/innerHeight,clamp(r.height*.62/innerHeight,.05,.11)]; } return holeK; };
/* on a touch screen: Walk, Land and Fly in turn, slowly, each with its name lit, then a breath of the plain gate */
const CYC={off:FINE,i:-1,t:1.2};
UI.gateTick=dt=>{ if(CYC.off||S.mode!=='gate'||S.leaving||!gate.classList.contains('ready')) return; CYC.t-=dt;
  if(CYC.t<=0){ CYC.i=(CYC.i+1)%4; CYC.t=CYC.i===3?2.2:(CYC.i===1?4.6:3.8); setHover(['walk','land','fly',null][CYC.i],true); } };

/* scroll moves between the three ways, one way per gesture, showing each one's world as it comes; so do a swipe on a
   phone and the arrow keys. A click, a tap or Enter goes. (A trackpad goes on sending fading wheel events after the
   fingers lift, so a new gesture is a quiet gap or a clear rise in strength; the rest is ignored) */
const GW={last:0,peak:0,armed:true,acc:0}, ORDER=['walk','land','fly'];
const gateStep=d=>{ if(S.mode!=='gate'||S.leaving||!gate.classList.contains('ready')) return; CYC.off=true;
  const i=ORDER.indexOf(S.gateHover); setHover(ORDER[i<0?0:clamp(i+d,0,2)]); };
addEventListener('wheel',e=>{ if(S.mode!=='gate') return; e.preventDefault();
  const t=performance.now(), d=(Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.2?e.deltaX:e.deltaY)*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1), ad=Math.abs(d), gap=t-GW.last; GW.last=t;
  if(gap>220||ad>GW.peak*1.7+6){ GW.armed=true; GW.acc=0; }
  GW.peak=gap>220?ad:Math.max(ad,GW.peak*.92);
  if(!GW.armed) return; GW.acc+=d; if(Math.abs(GW.acc)>36){ gateStep(Math.sign(GW.acc)); GW.acc=0; GW.armed=false; } },{passive:false});
{ let t0=null; addEventListener('touchstart',e=>{ t0=S.mode==='gate'?[e.touches[0].clientX,e.touches[0].clientY]:null; },{passive:true});
  addEventListener('touchend',e=>{ if(S.mode!=='gate'||!t0) return; const c=e.changedTouches[0], dx=t0[0]-c.clientX, dy=t0[1]-c.clientY, d=Math.abs(dy)>Math.abs(dx)?dy:dx; t0=null;
    if(Math.abs(d)>34) gateStep(Math.sign(d)); },{passive:true}); }
addEventListener('keydown',e=>{ if(S.mode!=='gate'||S.leaving||!gate.classList.contains('ready')) return;
  if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){ e.preventDefault(); gateStep(1); }
  else if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){ e.preventDefault(); gateStep(-1); }
  else if(e.key==='Enter'&&S.gateHover&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#gate .way'))){ e.preventDefault(); $('#gate .way[data-way="'+S.gateHover+'"]').click(); } });

if(!FINE){ $('#cue span').textContent='Swipe up to begin'; $('#tamed .m').textContent='2 min · swipe'; }
/* ---------- menu and anything that names a place ---------- */
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-go]'); if(!a) return;
  if(a.closest('#index')) return;
  e.preventDefault(); if(S.mode==='gate') return; travel(a.dataset.go); A.click();
});
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,#index li'); if(!t||t._h) return; t._h=1; setTimeout(()=>t._h=0,160); if(S.mode!=='gate') A.hover(); });
/* a project's link goes straight to the project */
$$('.view').forEach(a=>a.addEventListener('click',e=>{ e.stopPropagation(); A.click(); }));

/* ---------- sections follow the walk ---------- */
const SECS=$$('.sec').map(el=>({el,p:placeById(el.dataset.place),on:false,vis:-1}));
/* standing at the start without scrolling: every few seconds the cue calls again and the walk leans a step forward and
   back, so you see that scrolling walks you in */
function cueCall(s,dt){
  if(S.mode!=='world'||UI._fs||RM||(TEST&&!window.__NUDGE)){ UI._idle=0; return; }
  if(SC.touch||SC.inertia||s>.02||now()-SC.lastIn<1){ UI._idle=Math.min(UI._idle||0,0); return; }
  UI._idle=(UI._idle||0)+dt;
  if(UI._idle>4.5){ UI._idle=-3.5; const c=$('#cue'); c.classList.remove('call'); void c.offsetWidth; c.classList.add('call');
    SC.glide=null; SC.pin=false; SC.target=SC.turn=.045; SC.dir=-1; SC.lastIn=now(); SC.lastF=S.frame; }   // (and back: it leans the way home)
}
UI.firstScroll=()=>{ if(!UI._fs){ UI._fs=1; $('#cue').classList.add('gone'); } };
UI.jumped=()=>{ TXT.dirty=true; };
let fgKey='';
UI.update=(s,dt)=>{
  for(const x of SECS){
    /* the team's words come early as you walk into the courtyard and go as you turn away from us */
    const d=Math.abs(s-x.p.s), w=x.p.id==='team'?(s<x.p.s?.24:.1):0;
    let vis=x.p.id==='home'?1-sstep(.035,.15,d):1-sstep(.09+w,.32+w,d); if(S.mode==='gate'||S.mode==='entering') vis=x.p.id==='home'&&S.mode==='entering'?S.enterK:0;
    if(Math.abs(vis-x.vis)>.002){ x.vis=vis; x.el.style.opacity=vis.toFixed(3); x.el.style.visibility=vis>.002?'visible':'hidden'; }
    const on=vis>.5; if(on!==x.on){ x.on=on; x.el.classList.toggle('in',on); if(on&&x.el.querySelector('[data-reflect]')){ TXT.dirty=true; setTimeout(()=>TXT.dirty=true,1800); } }
  }
  /* the ink of the page changes with the light: dark on the bright evening, pale indoors and after sunset */
  const k=sstep(.47,.6,s); _fg.copy(INK).lerp(LIGHT,k);
  const key=_fg.getHexString(); if(key!==fgKey){ fgKey=key; document.documentElement.style.setProperty('--fg','#'+key); document.documentElement.classList.toggle('lite',k>.5); }
  const pl=placeAt(s); if(pl!==UI._pl){ UI._pl=pl; $('#dialT').textContent=pl.name; $$('#menu a').forEach(a=>a.classList.toggle('on',(a.dataset.nav==='projects'&&pl.proj>=0)||a.dataset.nav===pl.id)); document.documentElement.style.setProperty('--accent',pl.tint); }
  $('#cue').classList.toggle('away',s>.12);
  cueCall(s,dt);
  dialUpdate(s);
  peopleUpdate(s,dt);
};

/* ---------- the sundial: its shadow is the progress, and it agrees with the sun ---------- */
const dsvg=$('#dial svg'), _sd=v3();
(()=>{ const tk=$('.ticks',dsvg); let h=''; for(let i=0;i<24;i++){ const a=i/24*TAU, r0=i%6===0?35:38.5, r1=41.5; h+=`<line x1="${(Math.cos(a)*r0).toFixed(2)}" y1="${(Math.sin(a)*r0).toFixed(2)}" x2="${(Math.cos(a)*r1).toFixed(2)}" y2="${(Math.sin(a)*r1).toFixed(2)}"/>`; } tk.innerHTML=h;
  const mk=$('.marks',dsvg); mk.innerHTML=PLACES.map((p,i)=>{ const a=dialAng(p.s); return `<circle data-i="${i}" cx="${(Math.cos(a)*29).toFixed(2)}" cy="${(Math.sin(a)*29).toFixed(2)}" r="1.9"/>`; }).join(''); })();
function dialAng(s){ const [el,az]=sunAt(s); sunDir(el,az,_sd); return Math.atan2(-_sd.z,-_sd.x); }
let dialLast=-1;
function dialUpdate(s){
  if(Math.abs(s-dialLast)<.0015) return; dialLast=s;
  const [el]=sunAt(s), a=dialAng(s), L=clamp(4.6/Math.tan(Math.max(el,.4)*DEG),13,40), op=sstep(-.6,2.6,el);
  const cx=Math.cos(a), sy=Math.sin(a), px=-sy, py=cx, w=3.4;
  $('.shadow',dsvg).setAttribute('d',`M${(px*w).toFixed(2)} ${(py*w).toFixed(2)} L${(cx*L).toFixed(2)} ${(sy*L).toFixed(2)} L${(-px*w).toFixed(2)} ${(-py*w).toFixed(2)} Z`);
  $('.shadow',dsvg).style.opacity=(.62*op).toFixed(3);
  const ga=a+Math.PI; $('.gnomon',dsvg).setAttribute('d',`M${(-Math.sin(ga)*2).toFixed(2)} ${(Math.cos(ga)*2).toFixed(2)} L${(Math.cos(ga)*11).toFixed(2)} ${(Math.sin(ga)*11).toFixed(2)} L${(Math.sin(ga)*2).toFixed(2)} ${(-Math.cos(ga)*2).toFixed(2)} Z`);
  const cur=PLACES.indexOf(placeAt(s)); $$('.marks circle',dsvg).forEach((c,i)=>c.classList.toggle('on',i===cur));
  $('#dial').style.setProperty('--dusk',(1-sstep(-1,4,el)).toFixed(3));
}
$('#dial').addEventListener('click',()=>{ A.click(); UI.indexOpen(true); });

/* ---------- press and hold: every place ---------- */
const IDX=$('#index'), ILI=$$('#index li'); let hot=-1;
UI.ring=(k,x,y)=>{ const r=$('#ring'); if(k<=0){ r.classList.remove('on'); return; } r.classList.add('on'); r.style.transform=`translate(${x}px,${y}px)`; r.style.setProperty('--k',k.toFixed(3)); };
UI.indexOpen=(on)=>{
  if(on&&S.mode!=='world') return;
  HOLD.open=on; IDX.classList.toggle('on',on); IDX.setAttribute('aria-hidden',on?'false':'true'); document.documentElement.classList.toggle('indexed',on);
  if(on){ A.index(); const cur=PLACES.indexOf(placeAt(S.s)); ILI.forEach((l,i)=>l.classList.toggle('cur',i===cur)); hot=-1; ILI.forEach(l=>l.classList.remove('hot')); }
};
UI.indexHover=(x,y)=>{ let h=-1; ILI.forEach((l,i)=>{ const r=l.querySelector('.t').getBoundingClientRect(); if(y>=r.top-8&&y<=r.bottom+8&&x>=r.left-60&&x<=r.right+60) h=i; });
  if(h!==hot){ hot=h; ILI.forEach((l,i)=>l.classList.toggle('hot',i===h)); IDX.classList.toggle('has',h>=0); if(h>=0) A.tick(h); } };
UI.indexRelease=(x,y,held)=>{ UI.indexHover(x,y); if(hot>=0){ const id=ILI[hot].dataset.go; UI.indexOpen(false); A.pick(); travel(id); } };
ILI.forEach((l,i)=>{ l.addEventListener('click',e=>{ e.stopPropagation(); if(!HOLD.open) return; UI.indexOpen(false); A.pick(); travel(l.dataset.go); });
  l.addEventListener('pointerenter',()=>{ if(HOLD.open&&M.type!=='touch'){ hot=i; ILI.forEach((q,j)=>q.classList.toggle('hot',j===i)); IDX.classList.add('has'); A.tick(i); } }); });
IDX.addEventListener('click',e=>{ if(!e.target.closest('li')&&HOLD.open&&now()-HOLD.t0>.9) UI.indexOpen(false); });

/* ---------- the three of us: we rise as you walk up; point at one of us and the portrait lifts, and opens LinkedIn ---------- */
const PEO=$$('#people .person'); const _pp=v3(), _pq=v3();
PEO.forEach((el,i)=>{ const a=el.querySelector('a');
  a.addEventListener('pointerenter',()=>{ el._h=1; }); a.addEventListener('pointerleave',()=>{ el._h=0; });
  a.addEventListener('focus',()=>{ el._h=1; }); a.addEventListener('blur',()=>{ el._h=0; });
  a.addEventListener('click',e=>{ e.stopPropagation(); A.click(); }); });
/* where a point of the portrait falls on the screen, in pixels */
const scr=(x,y,z,cam)=>{ _pq.set(x,y,z).project(cam); return [(_pq.x*.5+.5)*innerWidth,(-_pq.y*.5+.5)*innerHeight,_pq.z]; };
function peopleUpdate(s,dt){
  /* we are there from the moment you come into the courtyard until you have turned away from us at the arch */
  const near=s<5?1-sstep(.22,.42,5-s):1-sstep(.46,.6,s-5); const box=$('#people');
  box.style.opacity=near.toFixed(3); box.style.visibility=near>.01?'visible':'hidden';
  if(!OUT||near<=.01){ if(OUT) OUT.people.forEach(p=>{ p.target=0; p.seen=false; }); UI._teamT=0; return; }
  /* how long you have stood here: a breath with only the reflections, then we rise one after another */
  UI._teamT=near>.85&&S.mode==='world'?(UI._teamT||0)+dt:Math.max(0,(UI._teamT||0)-dt*2);
  const cam=CAM.out, FP=OUT.FP, port=portrait();
  OUT.people.forEach((p,i)=>{
    const el=PEO[i], fx=p.x-FP.pd/2-.01;
    /* the portrait and its plinth as the screen sees them; on a touch screen the box is only where the caption hangs, under
       the plinth */
    const a=scr(fx,p.lift+FP.top,p.z-FP.pw/2,cam), b=scr(fx,p.lift,p.z+FP.pw/2,cam), pw=Math.abs(b[0]-a[0]);
    let L=Math.min(a[0],b[0]), Tp=Math.min(a[1],b[1]), Wd=pw, Hd=Math.abs(b[1]-a[1]);
    if(!FINE){ Tp=Math.max(a[1],b[1])+14; Hd=0; }
    el.style.transform=`translate(${L.toFixed(1)}px,${Tp.toFixed(1)}px)`;
    el.style.setProperty('--pw',Wd.toFixed(0)+'px'); el.style.setProperty('--ph',Hd.toFixed(0)+'px');
    /* only a portrait that stands in front of you, big enough to point at, takes a click */
    const cx=(a[0]+b[0])/2, cy=(a[1]+b[1])/2;
    el.classList.toggle('off',!(a[2]<1&&b[2]<1&&cx>-pw*.3&&cx<innerWidth+pw*.3&&cy>0&&cy<innerHeight&&pw>70));
    /* we rise as you come, one after another, so you never have to wait for us; on a narrow screen you walk past us one
       at a time, and whoever you are coming up to rises and stays */
    if(port&&s>[4.86,5,5.14][i]-.06) p.seen=true;
    const auto=S.peopleHold?false:(port?p.seen:(s>4.7+i*.07||UI._teamT>.5+i*.45));
    const want=((auto||S.peopleAll)&&near>.6)?1:0;
    p.target=want; p.hot=!!el._h&&!el.classList.contains('off'); el.classList.toggle('up',p.reveal>.8); el.classList.toggle('hot',p.hot);
    /* on a touch screen the caption shows under whoever you are standing in front of, once they have risen */
    const front=!FINE&&p.reveal>.9&&!el.classList.contains('off')&&(port?Math.abs(s-[4.86,5,5.14][i])<.07:pw>150&&Math.abs(s-5)<.06);
    el.classList.toggle('front',front);
    if(want&&!p._was){ setTimeout(()=>A.rise(),i*40); } p._was=want;
  });
}

/* ---------- cursor: a drop of water ---------- */
const cur=$('#cur'), curT=$('#curT'); let cx=M.x, cy=M.y, curBig=0;
document.documentElement.classList.add(FINE?'fine':'coarse');
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,#index li,.person'); curBig=t?1:0; curT.textContent=t?(t.dataset.cur||''):''; cur.classList.toggle('big',!!t); });
UI.cursor=(dt)=>{ if(!FINE) return; cx=damp(cx,M.x,22,dt); cy=damp(cy,M.y,22,dt); cur.style.transform=`translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px)`; cur.classList.toggle('off',!M.on); };
UI.isBig=()=>curBig;

/* ---- 90-main.js ---- */
/* ================= BOOT, LOOP ================= */
const CAM={out:new T.PerspectiveCamera(40,1,.1,3000), gal:new T.PerspectiveCamera(40,1,.1,3000)};
const G={px:600};
let OUT=null, GAL=null, rtA=null, rtB=null;
const WORLD={onWater:false,offT:0,tap(x,y){ if(!OUT||!(S.mode==='world')) return; HAND.tapT=now(); const mx=sceneMix(S.s); if(mx.a!=='out'&&mx.b!=='out') return;
  if(waterAt(x,y,CAM.out,_hit)){ OUT.sim.drop(_hit.x,_hit.z,.8,2.4); A.drop(1.1); } }};
const _ray=new T.Raycaster(), _nd=new T.Vector2(), _hit=v3(), _lastHit=v3(), _plane=new T.Plane(v3(0,1,0),0), _hd=v3(), _hp=v3(), _cp=v3(), _ct=v3();
function waterAt(x,y,cam,out){
  _nd.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); _ray.setFromCamera(_nd,cam);
  if(!_ray.ray.intersectPlane(_plane,out)) return false; if(out.distanceTo(cam.position)>150) return false;
  const inPool=out.x>POOL.x0&&out.x<POOL.x1&&out.z>POOL.z0&&out.z<POOL.z1;
  if(Math.abs(out.x)<14&&out.z>-21.4&&out.z<.6&&!inPool) return false;
  if(Math.abs(out.x)<PV.half&&out.z>=.6&&out.z<PV.foot) return false;
  return true;
}
function waterInteract(){
  if(!M.on||S.mode!=='world'||HOLD.open) { if(WORLD.onWater){ WORLD.onWater=false; WORLD.offT=now(); } return; }
  if(waterAt(M.x,M.y,CAM.out,_hit)){ const sp=Math.hypot(M.vx,M.vy);
    if(!WORLD.onWater){ WORLD.onWater=true; if(now()-WORLD.offT>.55){ A.drop(.75); OUT.sim.drop(_hit.x,_hit.z,.55,1.4); } }
    else if(sp>25){ OUT.sim.stroke(_lastHit.x,_lastHit.z,_hit.x,_hit.z,clamp(sp/1500,0,1)*.6);
      const k=clamp(sp/1400,0,1); if(now()-(WORLD.swT||0)>.34-.14*k){ WORLD.swT=now(); A.swish(k,M.x/innerWidth*2-1); } }   // and you hear it move
    _lastHit.copy(_hit);
  } else if(WORLD.onWater){ WORLD.onWater=false; WORLD.offT=now(); }
}
function horizonY(cam){ cam.getWorldDirection(_hd); _hd.y=0; if(_hd.lengthSq()<1e-6) return .5; _hd.normalize(); _hp.copy(cam.position).addScaledVector(_hd,5000); _hp.y=0; _hp.project(cam); return _hp.y*.5+.5; }
const PAR={x:0,y:0};
function camAt(name,s,cam){
  const keys=name==='gal'?TR.gal:(s<2.5?TR.out:TR.out2);
  let f=trackEval(keys,s,_cp,_ct);
  if(S.camOv&&S.camOv[0]===name){ const o=S.camOv; _cp.fromArray(o[1]); _ct.fromArray(o[2]); f=o[3]; }
  if(name==='out'&&LAUNCH.camK>.001){ const k=LAUNCH.camK; _ct.lerp(LAUNCH.mid,k); f=lerp(f,LAUNCH.fov,k); }
  cam.position.copy(_cp); cam.lookAt(_ct);
  if(!RM){ cam.rotateY(-PAR.x*.03); cam.rotateX(PAR.y*.018); }
  if(Math.abs(cam.fov-f)>1e-3){ cam.fov=f; cam.updateProjectionMatrix(); }
}
function resize(){
  if(!GL_OK) return;
  const w=innerWidth, h=innerHeight, d=QL.dpr; renderer.setPixelRatio(d); renderer.setSize(w,h,false);
  const W=Math.max(2,Math.floor(w*d)), H=Math.max(2,Math.floor(h*d));
  rtA.setSize(W,H); if(rtB.width>1) rtB.setSize(W,H); POST.setSize(W,H); OUT.setSize(W,H); GAL.setSize(W,H);
  for(const c of Object.values(CAM)){ c.aspect=w/h; c.updateProjectionMatrix(); }
  GU.uRes.value.set(W,H); POST.comp.uniforms.uAsp.value=w/h; POST.mixM.uniforms.uAsp.value=w/h;
  const was=STOPS.length; setLayout(); if(STOPS.length!==was){ const s=S.s; SC.v=SC.target=SC.turn=clamp(STOPS.indexOf(placeAt(s).s),0,STOPS.length-1); SC.glide=null; SC.inertia=0; SC.fresh=true; }
  TXT.dirty=true;
}
let rsT=0; addEventListener('resize',()=>{ clearTimeout(rsT); rsT=setTimeout(resize,60); });
/* the frame timer: pixel density down a step when frames are steadily slow, and back up when they are steadily quick.
   It reads the middle of the last second and a half, so one slow frame, a hitch, or the long gap after the tab was away
   counts for nothing; while the sound is being made at the start only a really slow device steps down; it comes back up on an ordinary
   60 Hz screen (above the density it starts at only on a quicker one); and a density it has had to leave twice soon
   after reaching it is not tried again */
const QM={buf:[],cool:0,lv:null,i:0,up:0,bad:{},
  tick(ms){ if(TEST||HQ||!S.ready) return; const t=performance.now();
    if(!this.lv){ const d0=QL.dpr, L=[d0]; for(let d=d0-.2;d>.61;d-=.2) L.unshift(+d.toFixed(3)); if(d0>.6) L.unshift(.6); for(let d=d0+.15;d<QL.dprMax-.01;d+=.15) L.push(+d.toFixed(3)); if(QL.dprMax>d0) L.push(QL.dprMax); this.lv=L; this.i=this.d0i=L.indexOf(d0); }
    if(ms>250||document.hidden){ this.buf.length=0; this.cool=Math.max(this.cool,t+1500); return; }
    const busy=A.busy;   // while the sound is being made only a really slow device steps down, and nothing steps up
    this.buf.push(ms); if(this.buf.length>90) this.buf.shift(); if(this.buf.length<90||t<this.cool) return;
    const s=this.buf.slice().sort((a,b)=>a-b), mid=s[45], p75=s[67];
    const go=i=>{ this.i=i; QL.dpr=this.lv[i]; resize(); this.buf=[]; };
    if(mid>(busy?40:22)&&this.i>0){ if(t-this.up<12000) this.bad[this.i]=(this.bad[this.i]||0)+1; go(this.i-1); this.cool=t+3000; }
    else if(!busy&&this.i<this.lv.length-1&&(this.bad[this.i+1]||0)<2&&p75<(this.i<this.d0i?18.5:12.5)){ go(this.i+1); this.up=t; this.cool=t+6000; } }};

/* ---------- entering ---------- */
S.enterT=0; S.enterK=0; S.veil=1;
function enter(){
  if(S.nogl){ gate.classList.add('go','gone'); ui.classList.add('on'); ui.setAttribute('aria-hidden','false'); $('#logo').classList.add('on'); S.mode='plain'; return; }
  if(S.mode!=='gate'||!S.ready) return;
  S.mode='entering'; S.enterT=0; S.entered=true; walkAddress();
  A.start().then(()=>{ A.swell(); });
  const word=$('#word'), logo=$('#logo'), a=word.getBoundingClientRect(), b=logo.getBoundingClientRect();
  const k=b.height/a.height*1.02;
  word.style.transform=`translate(${(b.left+b.width/2-(a.left+a.width/2)).toFixed(1)}px,${(b.top+b.height/2-(a.top+a.height/2)).toFixed(1)}px) scale(${k.toFixed(4)})`;
  gate.classList.add('go'); ui.classList.add('on'); ui.setAttribute('aria-hidden','false');
  gate.setAttribute('aria-hidden','true');
  setTimeout(()=>{ logo.classList.add('on'); },1250);
  setTimeout(()=>{ gate.classList.add('gone'); },1900);
}

/* ---------- the loop ---------- */
let last=performance.now();
function frame(tn){
  requestAnimationFrame(frame);
  const raw=Math.max(0,(tn-last)/1000); last=tn;
  const dt=Math.min(TEST?.25:.05,raw); S.dt=dt; S.t+=dt; S.frame++;
  const way=S.mode==='gate'?S.gateHover:null, tsT=way==='walk'?.25:way==='fly'?2.2:1;
  S.timeScale=damp(S.timeScale,tsT,2.4,dt); S.ut=(S.ut||0)+dt*S.timeScale; GU.uTime.value=RM?S.ut*.4:S.ut;
  QM.tick(raw*1000); UI.cursor(dt);
  if(!S.ready||!GL_OK) return;
  scrollTick(dt); VEIL.tick(dt); holdTick(); launchTick(dt); UI.gateTick(dt);
  if(S.mode==='entering'){ S.enterT+=dt; S.veil=1-E.io(clamp(S.enterT/2.6,0,1)); S.enterK=sstep(1.3,2.5,S.enterT); if(S.enterT>2.7){ S.mode='world'; S.veil=0; S.enterK=1; } }
  let s=warp(SC.v); if(S.mode==='gate'||S.mode==='entering') s=0; S.s=s;
  const [el,az]=S.sunOv||sunAt(s); SUN.el=el; SUN.az=az; sunDir(el,az,SUN.dir); const tod=todAt(el); tintAt(s,TINT);
  const mx=sceneMix(s);
  const px=M.on?M.x/innerWidth*2-1:0, py=M.on?-(M.y/innerHeight*2-1):0; PAR.x=damp(PAR.x,px,2,dt); PAR.y=damp(PAR.y,py,2,dt);
  const needOut=mx.a==='out'||mx.b==='out', needGal=mx.a==='gal'||mx.b==='gal';
  if(needOut){ camAt('out',s,CAM.out); OUT.update(dt); OUT.applyLight(tod,TINT); waterInteract(); OUT.sim.follow(CAM.out); OUT.sim.step(dt);
    G.px=GU.uRes.value.y/(2*Math.tan(CAM.out.fov*DEG/2)); OUT.seeds.mat.uniforms.uPx.value=G.px;
    if(TXT.dirty){ drawReflectText(); OUT.waterMat.uniforms.tText.value=TXT.tex; }
    const wu=OUT.waterMat.uniforms; wu.uTextK.value.set(SECS[0].vis>0?SECS[0].vis:0,SECS[SECS.length-1].vis>0?SECS[SECS.length-1].vis:0); wu.uTextCol.value.copy(_fg); wu.uHorizon.value=horizonY(CAM.out); }
  launchHit();
  if(needGal){ camAt('gal',s,CAM.gal); G.px=GU.uRes.value.y/(2*Math.tan(CAM.gal.fov*DEG/2)); GAL.update(dt); GAL.applyLight(tod,TINT,s); }
  const Wd={out:OUT,gal:GAL};
  /* the second full-screen target is only for a doorway, where two places are drawn at once: it is made as you come near
     one, well before the blend begins, and given back a few seconds after you have walked on */
  { const tn=now(), nearDoor=Math.min(Math.abs(s-DOOR_IN),Math.abs(s-DOOR_OUT))<BLEND+.35||!!mx.b;
    if(nearDoor){ rtB.lastUse=tn; if(rtB.width!==rtA.width||rtB.height!==rtA.height) rtB.setSize(rtA.width,rtA.height); }
    else if(rtB.width>1&&tn-(rtB.lastUse||-1e9)>3) rtB.setSize(1,1); }
  let src;
  if(mx.b){ Wd[mx.a].render(CAM[mx.a],rtA); Wd[mx.b].render(CAM[mx.b],rtB); const m=POST.mixM.uniforms; m.tA.value=rtA.texture; m.tB.value=rtB.texture; m.uK.value=mx.k; POST.pass(POST.mixM,POST.mix); src=POST.mix; }
  else { Wd[mx.a].render(CAM[mx.a],rtA); src=rtA; }
  const bt=POST.bloom(src);
  const cu=POST.comp.uniforms, inside=sstep(.42,.6,s)*(1-sstep(4.4,4.58,s)), dusk=sstep(5.3,6,s);
  cu.tScene.value=src.texture; cu.tBloom.value=bt;
  cu.uExpo.value=lerp(1.06,1.22,inside)*(1+dusk*.12);
  cu.uBloom.value=lerp(.038,.18,inside);
  cu.uGrade.value.set(1,1,1).lerp(TINT,inside*.26+dusk*.1);
  /* the gate: Walk thins the mist so the walk shows through; Land opens onto the sky over a small world; Fly brings the dark
     in round a black hole. Then the rocket at
     the end of the walk: the night comes in from it as you follow it up */
  cu.uVeil.value=S.mode==='gate'?damp(cu.uVeil.value,way==='walk'?.6:1,2.5,dt):S.veil;
  const dk=LAUNCH.dark>.001?LAUNCH.dark*1.15:(way==='fly'?1:0);
  cu.uDark.value=LAUNCH.dark>.001?dk:damp(cu.uDark.value,dk,way==='fly'?1.1:3.2,dt); if(cu.uDark.value<.002) cu.uDark.value=0;
  if(LAUNCH.dark>.001){ const v=LAUNCH.sc.copy(LAUNCH.mid).project(CAM.out); cu.uDarkC.value.set(v.x*.5+.5,v.y*.5+.5); cu.uHole.value.z=0; cu.uKeep.value=1; }
  else { const H=UI.holeAt(); cu.uDarkC.value.set(.5,.5); cu.uKeep.value=0; cu.uHole.value.set(H[0],H[1],damp(cu.uHole.value.z,way==='fly'?H[2]:0,way==='fly'?1.6:4,dt)); }
  cu.uLand.value=damp(cu.uLand.value,way==='land'&&cu.tLand.value?1:0,way==='land'?1.1:3.2,dt); if(cu.uLand.value<.002) cu.uLand.value=0;
  cu.uLandT.value=cu.uLand.value>0?(way==='land'||cu.uLandT.value>0?cu.uLandT.value+dt:0):0;
  cu.uDim.value=damp(S.idim||0,HOLD.open?.7:0,6,dt); S.idim=HOLD.open?Math.min(.7,(S.idim||0)+dt*3):Math.max(0,(S.idim||0)-dt*3);
  cu.uDimCol.value.set(1,1,1).lerp(TINT,.5);
  const fk=VEIL.k; cu.uFlood.value=fk; if(VEIL.k>0){ cu.uFloodCol.value.copy(VEIL.col).lerp(LIGHT,.3); cu.uFloodC.value.set(.5,.5); }
  const d=QL.dpr; cu.uMouse.value.set(M.x*d,(innerHeight-M.y)*d); cu.uVel.value.set(M.vx*d,-M.vy*d); M.vx*=Math.exp(-6*dt); M.vy*=Math.exp(-6*dt);
  cu.uDropR.value=damp(cu.uDropR.value,(UI.isBig()?24:12)*d*(HOLD.open?1.4:1),9,dt);
  cu.uDropK.value=damp(cu.uDropK.value,FINE&&M.on?1:0,8,dt);
  cu.uGrain.value=way==='walk'?.016:.032;
  POST.pass(POST.comp,null);
  UI.update(s,dt);
  A.update(dt,audioState(s,inside)); RSND.length=0;
}
function audioState(s,inside){
  const contact=sstep(5.45,6,s), court=sstep(4.55,4.85,s)*(1-contact), prox=k=>(1-sstep(.24,.62,Math.abs(s-k)))*inside;
  const R=id=>SLOT[id]+1, beam=GAL&&prox(R('pharos'))>.01?GAL.room('pharos').lock:0;   // how sure the drone is of where it is
  const gate=S.mode==='gate', way=gate?S.gateHover:null, go=LAUNCH.near;
  // the gate is not silent: the walk's score from the first moment, a little muffled, and the lake under it; a way, shown,
  // takes over and the score steps back under it
  const rest=gate&&!way?1:0;
  return {music:gate?.15+.5*rest:(1-inside*.3)*(1-go*.6), musF:gate?1600:lerp(9000,2600,inside)*(1-go*.93), water:gate?(way==='walk'?.34:.2*rest):lerp(1,.36,inside)*(1-court*.3)*(1-go*.5), waterF:gate?(way==='walk'?1500:850):lerp(2400,320,inside)+contact*1800,
    wind:gate?(way==='land'?.85:0):(1-inside)*(1-court*.7), birds:gate?(way==='land'?1:0):(1-inside)*(1-contact)*(1-court), kr:prox(R('krios')), ae:prox(R('aetos')), ph:prox(R('pharos')), og:prox(R('ogive')), beam, rise:sstep(R('ogive')-.3,R('ogive')+.4,s),
    warm:way==='walk'?1:0, land:way==='land'?1:0, dark:way==='fly'?1:0, rocket:LAUNCH.heard, rocketNear:go};
}
/* the sound is tried the moment the page opens: a browser that allows it (one that knows you have played sound here before)
   plays the score at once; any other wakes it on the first click, tap or key (see gateWake) */
A.start().catch(()=>{});

/* compile a scene's shaders without freezing the page, where the browser can do it in the background; never wait forever */
async function compileQuiet(sc,cam){ try{ if(renderer.compileAsync) await Promise.race([renderer.compileAsync(sc,cam),wait(8000)]); else renderer.compile(sc,cam); }catch(e){} }
async function boot(){
  if(!GL_OK){ document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.loadStep(1); UI.gateReady(); $('#gateState').textContent='This browser shows the plain page'; return; }
  UI.loadStep(.08);
  try{ await Promise.race([document.fonts.ready,wait(2600)]); }catch(e){}
  await nextFrame();
  rtA=RT(4,4,{samples:QL.samples}); rtB=RT(4,4,{samples:QL.samples});
  OUT=buildOutside(); UI.loadStep(.3); await nextFrame();
  GAL=buildGallery(); UI.loadStep(.45); await nextFrame();
  OUT.sim.clear();
  resize();
  setLayout();
  /* compile and draw every shader once behind the loader, so the walk never stalls */
  const steps=[[0,'out'],[1,'gal'],[2,'gal'],[3,'gal'],[4,'gal'],[5,'out']];
  for(let i=0;i<steps.length;i++){ const [s,w]=steps[i]; const W=w==='out'?OUT:GAL, cam=CAM[w];
    S.s=s; const [el,az]=sunAt(s); SUN.el=el; SUN.az=az; sunDir(el,az,SUN.dir); const tod=todAt(el); tintAt(s,TINT);
    camAt(w,s,cam); W.update(.016); W.applyLight(tod,TINT,s);
    await compileQuiet(W.scene,cam);
    W.render(cam,rtA); UI.loadStep(.45+.5*(i+1)/steps.length); await nextFrame(); }
  S.s=0; drawReflectText(); OUT.waterMat.uniforms.tText.value=TXT.tex;
  const bt=POST.bloom(rtA); POST.comp.uniforms.tScene.value=rtA.texture; POST.comp.uniforms.tBloom.value=bt; POST.pass(POST.comp,null);
  UI.loadStep(1);
  S.ready=true; setTimeout(()=>UI.gateReady(),TEST?0:500);
}
requestAnimationFrame(frame);
boot().catch(e=>{ console.error(e); document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.gateReady(); });

/* ---------- test hooks: jump along the walk, step time, open things ---------- */
window.__tamed={S,SC,A,QL,UI,PLACES,LAUNCH,get OUT(){return OUT;},get GAL(){return GAL;},CAM,POST,renderer,get rtA(){return rtA;},SUN,TODC,
  probe(pts){ const h2f=h=>{ const s=(h&0x8000)>>15,e=(h&0x7C00)>>10,f=h&0x03FF; if(e===0) return (s?-1:1)*Math.pow(2,-14)*(f/1024); if(e===0x1F) return f?NaN:(s?-1:1)*Infinity; return (s?-1:1)*Math.pow(2,e-15)*(1+f/1024); };
    const b=new Uint16Array(4); return pts.map(([x,y])=>{ renderer.readRenderTargetPixels(rtA,Math.floor(x*rtA.width),Math.floor((1-y)*rtA.height),1,1,b); return [...b].map(h=>+h2f(h).toFixed(3)); }); },
  enter,travel,
  jump(s){ S.mode='world'; S.veil=0; S.enterK=1; gate.classList.add('go','gone'); ui.classList.add('on'); $('#logo').classList.add('on'); const i=STOPS.indexOf(s); SC.v=SC.target=SC.turn=i>=0?i:s; SC.glide=null; SC.inertia=0; SC.lastIn=-9; SC.pin=false; SC.fresh=true; },
  setV(v){ SC.v=SC.target=SC.turn=v; SC.glide=null; SC.pin=true; SC.fresh=true; },
  openIndex(){ UI.indexOpen(true); }, closeIndex(){ UI.indexOpen(false); },
  people(on){ S.peopleAll=!!on; if(OUT) OUT.people.forEach(p=>{ p.target=on?1:0; p.reveal=on?1:0; }); },
  holdPeople(v){ S.peopleHold=!!v; },
  state(){ return {mode:S.mode,s:+S.s.toFixed(4),v:+SC.v.toFixed(4),target:+SC.target.toFixed(4),stops:STOPS.slice(),place:placeAt(S.s).id,proj:S.proj,index:HOLD.open,dpr:QL.dpr,frame:S.frame,audio:A.levels()}; },
  hover(v){ setHover(v); },
  sun(el,az){ S.sunOv=el==null?null:[el,az]; },
  cam(name,p,t,f){ S.camOv=name?[name,p,t,f]:null; },
  /* for the scroll tests: where the camera is for a scroll position v, without moving the walk */
  walkAt(v){ const s=warp(v), m=sceneMix(s), name=m.b&&m.k>.5?m.b:m.a, keys=name==='gal'?TR.gal:(s<2.5?TR.out:TR.out2), p=new T.Vector3(), t=new T.Vector3(), f=trackEval(keys,s,p,t);
    return {s,scene:name,p:p.toArray(),t:t.toArray(),f}; },
  /* and for driving the scroll on a clock of the test's own: one frame of the hand and the walk */
  tick(dt){ S.frame++; scrollTick(dt); VEIL.tick(dt); holdTick(); return warp(SC.v); },
};

})();

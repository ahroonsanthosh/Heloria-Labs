/* ================= CORE ================= */
const PHOTOS = __PHOTOS__;
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
  let ctx=null,out,comp,rev,revIn,on=false,muted=false,muf=false,away=false; const n={};   // away: you have left the page (see leave())
  const LITE=matchMedia('(pointer: coarse)').matches||Math.min(screen.width,screen.height)<700;
  /* phones: the sound and a heavy 3D scene share a small processor. When the audio can no longer keep up, some phones stop
     sending it to the speaker while the page carries on as if it were playing, and iOS can hand the speaker to something
     else. So: lighter work on a phone (LITE), the playback audio session on iOS, and a watchdog once a second that wakes
     the context if it was put to sleep and restarts it if its clock has stopped moving */
  /* and if waking it does not work (a clock still stopped after a restart, or a context that will not come back even on a
     tap) the whole sound is built again on a fresh context: everything in it is made from n, so nothing is lost */
  let wdT=-1, wdC=-1, wdBad=0, downAt=0;
  function rebuild(){ const old=ctx; if(!old) return; for(const k in n) delete n[k];
    ctx=null; init(); try{ old.close(); }catch(e){} set(out.gain,muted||away?0:LOUD,.4); ctx.resume().catch(()=>{}); wdT=-1; wdBad=0; downAt=0; }
  function watch(){ if(!ctx||!on||document.hidden||away){ wdT=-1; return; }
    const now=performance.now();
    if(ctx.state!=='running'){ if(!downAt) downAt=now; ctx.resume().catch(()=>{}); wdT=-1; return; }
    downAt=0; const c=ctx.currentTime;
    if(wdT>0&&now-wdT>900&&c===wdC){ wdBad++; ctx.suspend().then(()=>ctx.resume()).catch(()=>{}); }   // (a stalled clock is rebuilt on the next tap)
    else if(c!==wdC) wdBad=0;
    wdT=now; wdC=c;
    /* and it listens: what leaves for the speakers is never a value that is not a number (one such value poisons every node
       after it, and the sound is gone for good). Twice running, and the whole sound is built again */
    if(n.mon&&!muted){ n.mon.getFloatTimeDomainData(n.monBuf); let pk=0, bad=false; for(const v of n.monBuf){ if(v!==v||v===Infinity||v===-Infinity){ bad=true; break; } const a=v<0?-v:v; if(a>pk) pk=a; }
      n.dead=bad?(n.dead||0)+1:0; if(n.dead>=2) rebuild(); } }
  setInterval(watch,1000);
  document.addEventListener('visibilitychange',()=>{ wdT=-1; if(!document.hidden&&ctx&&on&&ctx.state!=='running') ctx.resume().catch(()=>{}); });
  ['touchend','pointerup','click','keydown'].forEach(ev=>addEventListener(ev,()=>{ if(!ctx||!on||ctx.state==='running') return;
    if(downAt&&performance.now()-downAt>2500) rebuild(); else ctx.resume().catch(()=>{}); },{capture:true,passive:true}));
  /* a clock that stopped and would not restart is built again on the next click or tap: inside a gesture a browser always
     lets a new context sound, where a rebuild from a timer could leave it waiting in silence */
  ['touchend','pointerup','click','keydown'].forEach(ev=>addEventListener(ev,()=>{ if(ctx&&on&&wdBad>=2) rebuild(); },{capture:true,passive:true}));
  const CH=[[73.42,146.83,220,329.63,440],[65.41,130.81,196,293.66,392],[58.27,116.54,174.61,261.63,349.23],[55,110,164.81,246.94,329.63]];
  function init(){
    if(ctx) return;
    try{ if(IOS&&navigator.audioSession&&navigator.audioSession.type!=='playback') navigator.audioSession.type='playback'; }catch(e){}   // an iPhone: play like media, set before the sound starts (changing it mid-play interrupts it); not on a Mac
    { const AC=window.AudioContext||window.webkitAudioContext; try{ ctx=new AC({latencyHint:'playback'}); }catch(e){ ctx=new AC(); } }   // a deeper buffer on every device: a busy frame can never starve the speaker
    /* what leaves for the speakers: nothing below 40 Hz (a phone or laptop cannot play it, only strain at it), and never a
       hard clip, so sounds piling up never reach the point where small speakers distort */
    out=ctx.createGain(); out.gain.value=0;
    { const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=40; hp.Q.value=.6;
      /* a soft clip in place of a limiter: below 0.7 it lets the sound through untouched, above it rounds the peaks off
         smoothly towards full scale. (The browser's compressor would add its own make-up gain to everything) */
      const cv=new Float32Array(2049); for(let i=0;i<cv.length;i++){ const x=i/1024-1, a=Math.abs(x); cv[i]=a<=.7?x:Math.sign(x)*(.7+.28*Math.tanh((a-.7)/.28)); }
      const lim=ctx.createWaveShaper(); lim.curve=cv; lim.oversample='none';
      out.connect(hp); hp.connect(lim); lim.connect(ctx.destination);
      n.mon=ctx.createAnalyser(); n.mon.fftSize=2048; n.monBuf=new Float32Array(2048); lim.connect(n.mon); }   // the watchdog listens here
    comp=ctx.createDynamicsCompressor(); comp.threshold.value=-20; comp.ratio.value=3; comp.connect(out);
    /* the room: kept short enough (a quarter of a second) that the browser works it out on the sound's own thread. A longer
       room is worked out on an ordinary thread, which a busy page starves, and the sound turns to crackle and static and
       cuts out the moment the page is in front, while it plays clean in a background tab */
    rev=ctx.createConvolver(); const L=Math.min(12000,Math.floor(ctx.sampleRate*.25)), ir=ctx.createBuffer(2,L,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c); for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/L,1.4);}
    rev.buffer=ir; const rg=ctx.createGain(); rg.gain.value=.65; rev.connect(rg); rg.connect(comp); revIn=ctx.createGain(); revIn.connect(rev);
    /* the noise the short sounds are made of: one long stretch, nine seconds, each sound reading it at its own speed and
       from its own place, so no two are ever copies of each other */
    const buf=ctx.createBuffer(1,ctx.sampleRate*9,ctx.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; n.buf=buf; n.bedT=0;
  }
  const last=new WeakMap();
  const set=(p,v,tc=.08)=>{ if(!ctx) return; const l=last.get(p); if(l!==undefined&&Math.abs(l-v)<=Math.max(1e-4,Math.abs(v)*.004)) return; last.set(p,v); p.setTargetAtTime(v,ctx.currentTime,tc); };
  function tone(f,dur,g=.08,type='sine',f2=0,delay=0,send=0,atk=.008){
    if(!on) return; const t0=ctx.currentTime+delay, o=ctx.createOscillator(), a=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(comp);
    if(send){const s=ctx.createGain(); s.gain.value=send; a.connect(s); s.connect(revIn);} o.start(t0); o.stop(t0+dur+.05);
  }
  /* a one-off sound's noise: the same long stretch, read at a speed of its own, so it never lines up with the layers under it */
  function shot(){ const s=ctx.createBufferSource(); s.buffer=n.buf; s.loop=true; s.playbackRate.value=.86+Math.random()*.3; return s; }
  function noise(dur,g,f0,f1,type='lowpass',q=.8,delay=0,send=0){
    if(!on) return; const t0=ctx.currentTime+delay, s=shot(); const b=ctx.createBiquadFilter(); b.type=type; b.Q.value=q;
    b.frequency.setValueAtTime(f0,t0); b.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+Math.min(.05,dur*.3)); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(b); b.connect(a); a.connect(comp); if(send){const x=ctx.createGain(); x.gain.value=send; a.connect(x); x.connect(revIn);} s.start(t0,Math.random()*8); s.stop(t0+dur+.05);
  }
  /* each station's air: f/q the noise band, g its level, hz/h the hum, wob a slow drift of the band, sea a slow swell, ping a
     soft return every so many seconds at pf */
  /* (the noise in each is some 8 dB under where it was: at that level it stood over the station's music and read as static) */
  const BEDS={kr:{f:700,q:.7,g:.085,hz:98,h:.012,wob:.22},ae:{f:340,q:.6,g:.09,hz:49,h:.03,ping:2.6,pf:1568},ph:{f:420,q:.45,g:.12,hz:55,h:0,sea:1},
    og:{f:1900,q:.9,g:.03,hz:41,h:.045},be:{f:3400,q:.5,g:.016,hz:880,h:.02,wob:.06},
    cr:{f:560,q:.6,g:0,hz:55,h:0,type:'lowpass',send:0}};   /* Earth has no air of its own: the town's music, the birds, footsteps and voices carry it,
       and nothing there is noise, so nothing can hiss, crackle or phase */
  /* the town's key on Earth: C major pentatonic. inKey snaps a pitch to its nearest note there */
  const PENT_C=[0,2,4,7,9], inKey=f=>{ const m=69+12*Math.log2(f/440), o=Math.floor(m/12)*12; let best=m, bd=99;
    for(const k of [-12,0,12]) for(const pc of PENT_C){ const c=o+k+pc; if(Math.abs(c-m)<bd){ bd=Math.abs(c-m); best=c; } } return 440*Math.pow(2,(best-69)/12); };
  const PEN=[0,2,3,7,9]; // D dorian-ish pentatonic
  /* the untamed plays at the walk's level, and a sound you hear again and again is never quite the same twice */
  const LOUD=.5, vr=(k=.04)=>1+(Math.random()*2-1)*k;
  const note=i=>146.83*Math.pow(2,(PEN[((i%5)+5)%5]+12*Math.floor(i/5))/12);
  /* ---------- the long sounds, as recordings ----------
     Everything that sounds for more than a moment (the orbit's score, the hole's rumble, the wind, the engine and its roar,
     each station's air, the contact's pulse, Earth's music) is worked out once, out of sight, a moment after the page
     loads, and played as an audio file. A browser plays a recording through its media path, which keeps a long reserve of
     sound ahead of the speaker; sound made live has only a few hundredths of a second in hand, and a page busy drawing a
     3D world in front of you leaves holes in it (the jitter, the static, the cutting out). Only the short sounds on top
     (clicks, bells, steps, voices) are still made live.
     A browser's own looping stops for a moment at the seam (about a seventh of a second), so each recording is played by
     two players in turn: as one reaches the end of its period the other starts from the top, and for a moment both play,
     one fading out while the other fades in (the fades are in the recording) or, for the music, while the last notes ring
     on. Every overlap is of sounds that are not copies of each other (fresh noise, another chord), so nothing phases */
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const IOS=(()=>{ try{ const a=new Audio(); a.volume=.5; return Math.abs(a.volume-.5)>.01; }catch(e){ return false; } })();   // an iPhone will not let a page set a recording's volume: there each one plays or pauses
  const wav=(d,o,N,sr)=>{ const ab=new ArrayBuffer(44+N*2), v=new DataView(ab), str=(p,x)=>{ for(let i=0;i<x.length;i++) v.setUint8(p+i,x.charCodeAt(i)); };
    str(0,'RIFF'); v.setUint32(4,36+N*2,true); str(8,'WAVE'); str(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
    v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); str(36,'data'); v.setUint32(40,N*2,true);
    let sq=0; for(let i=0;i<N;i++){ let x=d[o+i]; if(!(x>-1)) x=x!==x?0:-1; else if(x>1) x=1; sq+=x*x; v.setInt16(44+i*2,x*32767,true); }
    return {url:URL.createObjectURL(new Blob([ab],{type:'audio/wav'})),rms:Math.sqrt(sq/Math.max(1,N))}; };
  /* a recording: P its period in seconds, H the overlap, R a second of run-in that is thrown away (so every filter and
     the room have settled where the recording begins), ref the level the recording is made at (a player's volume is the
     level asked for over ref), tc how quickly it follows (tcOut going down). On an iPhone, where a player is only on or
     off, it is made at ios, its usual level, and plays while the level asked for is above gate times that */
  const LOOPS=[];
  const loop=o=>{ const r=Object.assign({els:[],cur:0,url:null,rms:0,want:0,vol:0,ref:1,tc:.3,tcOut:0,gate:.04,rate:1,busy:false,blocked:false,R:1,H:2,fade:true,sr:22050},o); if(IOS&&r.ios) r.ref=r.ios; LOOPS.push(r); return r; };
  /* desktop Safari (and any page opened with ?webaudio): the recordings play from buffers through the page's own sound
     engine, not as a few dozen media players. Safari on a Mac can give up on the page when that many media players start
     at once inside a click, and their sound then goes on after the tab is closed. A buffer player does what the mixer asks
     of a media player and no more: play, pause, where it is, its volume and its speed, and that it has ended */
  const BUFP=/[?&]webaudio(=|&|$)/.test(location.search)||(()=>{ const u=navigator.userAgent; return /Safari\//.test(u)&&!/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR|Android/.test(u)&&!/iPhone|iPad|iPod/.test(u)&&!(navigator.maxTouchPoints>1); })();
  function BufPlayer(get){ this._get=get; this._src=null; this._g=null; this._p=true; this._e=false; this._off=0; this._t0=0; this._r=1; this._v=1; this._m=false; this._ls=[]; this.preload='auto'; this.loop=false; this.preservesPitch=false; this.src=''; }
  BufPlayer.prototype={
    get paused(){ return this._p; }, get ended(){ return this._e; },
    get currentTime(){ if(this._p||!ctx) return this._off; return Math.min(this._get().duration,this._off+Math.max(0,ctx.currentTime-this._t0)*this._r); },
    set currentTime(t){ const on=!this._p; if(on) this._halt(); this._off=Math.max(0,+t||0); this._e=false; if(on) this._go(); },
    get playbackRate(){ return this._r; },
    set playbackRate(r){ if(!this._p&&ctx){ this._off=this.currentTime; this._t0=ctx.currentTime; if(this._src) this._src.playbackRate.value=r; } this._r=r; },
    get volume(){ return this._v; }, set volume(v){ this._v=v; this._lvl(); },
    get muted(){ return this._m; }, set muted(m){ this._m=!!m; this._lvl(); },
    _lvl(){ if(this._g&&ctx&&this._g.context===ctx) this._g.gain.setTargetAtTime(this._m?0:this._v,ctx.currentTime,.012); },
    addEventListener(t,f){ if(t==='ended') this._ls.push(f); }, removeEventListener(){},
    _go(){ const b=this._get(); if(!this._g||this._g.context!==ctx){ this._g=ctx.createGain(); this._g.gain.value=this._m?0:this._v; this._g.connect(ctx.destination); }
      const s=ctx.createBufferSource(); s.buffer=b; s.playbackRate.value=this._r; s.connect(this._g);
      s.onended=()=>{ if(this._src!==s) return; this._src=null; this._off=b.duration; this._p=true; this._e=true; for(const f of this._ls){ try{ f(); }catch(e){} } };
      this._t0=ctx.currentTime; s.start(0,Math.min(this._off,Math.max(0,b.duration-.001))); this._src=s; },
    _halt(){ const s=this._src; this._src=null; if(s){ try{ s.stop(); }catch(e){} try{ s.disconnect(); }catch(e){} } },
    play(){ if(!ctx) return Promise.reject(new Error('the sound has not started yet')); if(this._p){ if(this._e){ this._off=0; this._e=false; } this._p=false; try{ this._go(); }catch(e){ this._p=true; return Promise.reject(e); } } return Promise.resolve(); },
    pause(){ if(this._p) return; this._off=this.currentTime; this._p=true; this._halt(); } };
  const player=r=>{ const el=BUFP?new BufPlayer(()=>{ if(r.bb) return r.bb; const q=r.pcm, b=ctx.createBuffer(1,q.length,r.sr), ch=b.getChannelData(0); for(let i=0;i<q.length;i++){ const x=q[i]; ch[i]=x>1?1:x<-1?-1:(x===x?x:0); } r.bb=b; return b; }):new Audio(); el.preload='auto'; if(!BUFP) el.src=r.url; el._on=false; el._primed=false;
    try{ el.preservesPitch=false; el.mozPreservesPitch=false; el.webkitPreservesPitch=false; }catch(e){}   // so a slower rate is a lower pitch, as on tape
    el.addEventListener('ended',()=>{ el._on=false; }); return el; };
  function render(r,next){ const fin=()=>{ r.busy=false; if(next) setTimeout(next,120); };
    if(!OAC||r.url||r.busy) return fin(); r.busy=true;
    const sr=r.sr, R=Math.round(sr*r.R), P=Math.round(sr*r.P), H=Math.round(sr*r.H), N=P+H; let oc;
    try{ oc=new OAC(1,R+N,sr); r.make(oc,r.R); }catch(e){ console.warn('sound',r.name,e); return fin(); }
    const done=b=>{ const d=b.getChannelData(0);
      if(r.fade) for(let i=0;i<H;i++){ const k=i/H*Math.PI/2; d[R+i]*=Math.sin(k); d[R+P+i]*=Math.cos(k); }   // in at the top, out over the overlap
      const w=wav(d,R,N,sr); r.url=w.url; r.rms=w.rms; if(BUFP){ r.pcm=d.slice(R,R+N); r.sr=sr; } r.els=[player(r),player(r)]; fin(); };
    try{ const pr=oc.startRendering(); if(pr&&pr.then) pr.then(done,fin); else oc.oncomplete=e=>done(e.renderedBuffer); }catch(e){ fin(); } }
  /* the mixer: every recording follows the level asked of it, and the two players hand over */
  let mixT=0;
  function mix(){ const now=performance.now(), dt=mixT?Math.min(.25,(now-mixT)/1000):0; mixT=now;
    for(const r of LOOPS){ if(!r.url) continue; const w=on&&!muted&&!away?r.want:0;
      r.vol+=(w-r.vol)*(1-Math.exp(-dt/(w<r.vol&&r.tcOut?r.tcOut:r.tc))); if(w===0&&r.vol<r.ref*.002) r.vol=0;
      if(!(IOS?w>r.ref*r.gate:r.vol>0)){ for(const el of r.els) if(!el.paused) el.pause(); continue; }
      for(const el of r.els) if(el._on&&(el.ended||el.currentTime>=r.P+r.H-.03)){ el._on=false; if(!el.paused) el.pause(); }   // a player whose part is over stops there
      let a=r.els[r.cur]; const b=r.els[1-r.cur];
      if(!a._on){ a._on=true; try{ a.currentTime=r.fade&&!b._on?r.H:0; }catch(e){} }   // from silence a sound starts at full strength, past its fade in
      if(!a.paused&&a.currentTime>=r.P-.04&&!b._on){ b._on=true; try{ b.currentTime=0; }catch(e){} r.cur=1-r.cur; }
      const v=clamp(r.vol/r.ref,0,1);
      for(const el of r.els){ if(!el._on) continue; if(el.playbackRate!==r.rate) el.playbackRate=r.rate; if(!IOS&&Math.abs(el.volume-v)>1e-4) el.volume=v;
        if(el.paused&&!el.ended&&!r.blocked) el.play().catch(()=>{ r.blocked=true; }); } } }
  setInterval(mix,20);
  /* leaving the page: another tab or app, the phone locked, or on a computer another window in front. The sound goes with
     you: at once when the page is hidden (a phone may freeze the page next, and would play its recordings on in the
     background), faded out by the mixer when it is only behind another window; and it comes back when you do */
  function leave(e){ const hid=document.hidden||!!(e&&e.type==='pagehide'); away=true;   // (the page closing is as final as hidden: everything stops at once)
    if(hid) for(const r of LOOPS){ r.vol=0; for(const el of r.els){ el._on=false; if(!el.paused) el.pause(); } }
    if(SC.el&&!SC.el.paused) SC.el.pause();   // (a cutscene's recording: it starts again from where the scene is when you come back)
    if(ctx){ set(out.gain,0,hid?.01:.15); if(hid) ctx.suspend().catch(()=>{}); } }
  function back(){ if(!away||document.hidden) return; away=false; wdT=-1; for(const r of LOOPS) r.blocked=false;   // (a start cut short by the pause on leaving is not a browser saying no)
    if(ctx&&on){ ctx.resume().catch(()=>{}); set(out.gain,muted?0:LOUD,.5); } }
  document.addEventListener('visibilitychange',()=>document.hidden?leave():back());
  addEventListener('pagehide',leave); addEventListener('blur',leave); addEventListener('focus',back);
  ['pointerdown','touchstart','keydown'].forEach(ev=>addEventListener(ev,back,{capture:true,passive:true}));
  /* inside a click, a tap or a key a browser always lets a recording start: each player is started there once, silently,
     and stopped again, so a phone that only lets a page start sound inside a gesture lets it start later by itself */
  function prime(){ /* the cutscene's recording too */ if(SC.el&&!SC.el._primed&&SC.el.paused){ const el=SC.el; el._primed=true; el.muted=true; const p=el.play(); const b=()=>{ if(!(on&&!muted&&!away&&el._want)) el.pause(); el.muted=false; }; if(p&&p.then) p.then(b,()=>{ el.muted=false; el._primed=false; }); else b(); }
    for(const r of LOOPS){ r.blocked=false;
      for(const el of r.els){ if(el._primed||!el.paused) continue; el._primed=true; el.muted=true; const p=el.play();
        const back=()=>{ if(!(el._on&&on&&!muted&&r.want>0)) el.pause(); el.muted=false; };
        if(p&&p.then) p.then(back,()=>{ el.muted=false; el._primed=false; }); else back(); } } }
  ['touchend','pointerup','click','keydown'].forEach(ev=>addEventListener(ev,prime,{capture:true,passive:true}));
  /* what every recording goes through, as the live sound does: the same compressor, the master level, nothing below 40 Hz;
     and a room for those that are sent to one */
  function bus(oc,wet=0,room=.45){ const comp=oc.createDynamicsCompressor(); comp.threshold.value=-20; comp.ratio.value=3;
    const m=oc.createGain(); m.gain.value=LOUD; const hp=oc.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=40; hp.Q.value=.6;
    comp.connect(m); m.connect(hp); hp.connect(oc.destination);
    let rv=null; if(wet){ rv=oc.createConvolver(); const L=Math.floor(oc.sampleRate*room), ir=oc.createBuffer(1,L,oc.sampleRate), d=ir.getChannelData(0);
      for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/L,1.4); rv.buffer=ir; const rg=oc.createGain(); rg.gain.value=.65*wet; rv.connect(rg); rg.connect(comp); }
    return {in:comp,rv}; };
  /* fresh noise for each recording, so no two are alike; nb is how loud a band of it is, so a band of noise can stand in
     at the same strength for a steady tone (a tone made twice and overlapped could cancel itself; noise never does) */
  const noiseSrc=oc=>{ const b=oc.createBuffer(1,oc.length,oc.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; const s=oc.createBufferSource(); s.buffer=b; s.start(0); return s; };
  const nb=(oc,f,q,lp)=>Math.sqrt(.5/((1/3)*(Math.PI*f*(lp?q:1/q)/2)/(oc.sampleRate/2)));
  const curve=(oc,fn)=>{ const n=Math.ceil(oc.length/oc.sampleRate*20)+1, c=new Float32Array(n); for(let i=0;i<n;i++) c[i]=fn(i/20); return c; };

  /* the orbit's score: five tones per chord, each two voices a few cents apart, through a breathing low-pass; four chords
     a period, gliding from one to the next, the last handing over to the first in the overlap */
  const PAD=loop({name:'pad',sr:22050,P:48,H:3,ref:.045*1.3,ios:.045,gate:.3,tc:.8,tcOut:.5,make(oc,t0){ const b=bus(oc,1), f=oc.createBiquadFilter(); f.type='lowpass'; f.frequency.value=740; f.Q.value=.7;
    const lfo=oc.createOscillator(); lfo.frequency.value=1/16; const lg=oc.createGain(); lg.gain.value=220; lfo.connect(lg); lg.connect(f.frequency); lfo.start(0);   // three slow breaths a period
    const g=oc.createGain(); g.gain.value=this.ref; f.connect(g); g.connect(b.in); g.connect(b.rv);
    CH[0].forEach((_,i)=>[-6,5].forEach(dt=>{ const o=oc.createOscillator(); o.type=i<1?'sine':'sawtooth'; o.detune.value=dt; o.frequency.setValueAtTime(CH[0][i],0);
      for(let k=1;k<4;k++) o.frequency.setTargetAtTime(CH[k][i],t0+k*12,2.2);
      const vg=oc.createGain(); vg.gain.value=i<1?.9:.22/(1+i*.3); o.connect(vg); vg.connect(f); o.start(0); })); }});
  /* the hole itself: a deep rumble */
  const SUB=loop({name:'sub',sr:8000,P:14,H:2,ref:.26,ios:.13,gate:.3,tc:.4,make(oc){ const b=bus(oc), s=noiseSrc(oc), f=oc.createBiquadFilter(); f.type='lowpass'; f.frequency.value=46; f.Q.value=1.2;
    const g=oc.createGain(); g.gain.value=this.ref*nb(oc,46,1.2,true); s.connect(f); f.connect(g); g.connect(b.in); }});
  /* wind, the thruster, the roar and the hiss: bands of noise. The wind and the roar each come as two, a duller and a
     brighter, and the mix between them stands in for a filter that opens */
  const nz=(name,sr,P,type,f,q,ref,tc,ios)=>loop({name,sr,P,ref,tc,ios,gate:.3,make(oc){ const b=bus(oc), s=noiseSrc(oc), fl=oc.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q;
    const g=oc.createGain(); g.gain.value=this.ref; s.connect(fl); fl.connect(g); g.connect(b.in); }});
  const WL=nz('wind-low',22050,11,'bandpass',650,.8,.26,.08,.09), WH=nz('wind-high',32000,13,'bandpass',1700,.8,.26,.08,.09), TH=nz('thrust',16000,9,'bandpass',240,1.1,.2,.05,.14),
    RD=nz('roar-dull',16000,10,'lowpass',300,.9,.8,.04,.3), RO=nz('roar-open',22050,12,'lowpass',900,.9,.8,.04,.3), HS=nz('hiss',32000,9,'highpass',3000,.5,.08,.1,.02);
  const RR={lvl:0,x:.13}, roarMix=()=>{ RD.want=RR.lvl*Math.cos(RR.x*Math.PI/2); RO.want=RR.lvl*Math.sin(RR.x*Math.PI/2); };
  /* the unidentified contact inside the horizon: a low, slow pulse you feel as much as hear; nearer, it drops and quickens */
  const cb=(name,f1,f2,lr,ref,ios)=>loop({name,sr:8000,P:20,H:2,ref,ios,gate:.3,tc:.5,make(oc){ const b=bus(oc,.45), trem=oc.createGain(); trem.gain.value=.7;
    const lfo=oc.createOscillator(); lfo.frequency.value=lr; const lg=oc.createGain(); lg.gain.value=.3; lfo.connect(lg); lg.connect(trem.gain); lfo.start(0);
    [[f1,1],[f2,.22]].forEach(([f,a])=>{ const s=noiseSrc(oc), fl=oc.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=f; fl.Q.value=8; const g=oc.createGain(); g.gain.value=a*nb(oc,f,8); s.connect(fl); fl.connect(g); g.connect(trem); });
    const lv=oc.createGain(); lv.gain.value=this.ref; trem.connect(lv); lv.connect(b.in); lv.connect(b.rv); }});
  const CF=cb('contact-far',62,93,.2,.05,.02), CN=cb('contact-near',41,61.5,.7,.09,.06);
  /* each station's air: a band of noise drifting (wob) or swelling like the sea (sea), and a low hum, at its own pitch */
  const BEDL={};
  for(const id in BEDS){ const B=BEDS[id]; if(!B.g) continue;
    BEDL[id]=loop({name:'air-'+id,sr:22050,P:24,H:2,ref:B.g,tc:.9,tcOut:.5,make(oc,t0){ const b=bus(oc,B.send??.35), s=noiseSrc(oc), fl=oc.createBiquadFilter(); fl.type=B.type||'bandpass'; fl.Q.value=B.q; fl.frequency.value=B.f;
      if(B.wob) fl.frequency.setValueCurveAtTime(curve(oc,t=>B.f*(1+B.wob*Math.sin(TAU*(t-t0)/24))),0,oc.length/oc.sampleRate);
      const g=oc.createGain(); g.gain.value=B.g; if(B.sea) g.gain.setValueCurveAtTime(curve(oc,t=>B.g*(.55+.45*Math.sin(TAU*(t-t0)/12)*Math.sin(TAU*(t-t0)/24+1))),0,oc.length/oc.sampleRate);
      s.connect(fl); fl.connect(g); g.connect(b.in); g.connect(b.rv);
      if(B.h){ const hs=noiseSrc(oc), hf=oc.createBiquadFilter(); hf.type='bandpass'; hf.frequency.value=B.hz; hf.Q.value=12; const hg=oc.createGain();
        hg.gain.value=B.h*.8*Math.min(1,(420/B.hz)**2)*nb(oc,B.hz,12); hs.connect(hf); hf.connect(hg); hg.connect(b.in); } }}); }
  /* Earth's music: a slow, warm loop of chords, a soft bass, a held chord under them and a plucked melody: every note one
     tone with its harmonics in exact tune (nothing detuned, so nothing beats against anything), voiced where a phone or a
     laptop speaker can play it, no kick and no noise in it. Eight bars, and the notes still ringing after the last one
     ring on under the next time round */
  const MUS=loop({name:'music',sr:32000,P:8*4*60/72,H:3,R:0,fade:false,ref:1,tc:.35,tcOut:.15,gate:.02,make(oc){
      const beat=60/72, L=8*4*beat;
      const ep=oc.createPeriodicWave(new Float32Array([0,0,0,0,0,0]),new Float32Array([0,1,.34,.14,.06,.03]));
      const bus=oc.createGain(); bus.gain.value=.55*3.4*LOUD; const lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=4200; lp.Q.value=.5; bus.connect(lp); lp.connect(oc.destination);
      const mf=m=>440*Math.pow(2,(m-69)/12), osc=(f,t0)=>{ const o=oc.createOscillator(); o.setPeriodicWave(ep); o.frequency.setValueAtTime(f,t0); return o; };
      const play=(f,t0,dur,g,atk)=>{ const o=osc(f,t0), a=oc.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(bus); o.start(t0); o.stop(t0+dur+.05); };
      /* the held chord: three tones per bar that come in, hold, and hand over to the next bar's, so the town is never silent
         between phrases; a short handover, so neighbouring chords a semitone apart never sound long together */
      const hold=(f,t0,len,g)=>{ const o=osc(f,t0), a=oc.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.6); a.gain.setValueAtTime(g,t0+len); a.gain.linearRampToValueAtTime(0,t0+len+.6); o.connect(a); a.connect(bus); o.start(t0); o.stop(t0+len+.7); };
      const PROG=[[65,69,72,76,79],[64,67,71,74,78],[62,65,69,72,76],[60,64,67,71,74]], BASS=[53,52,50,48], SCALE=[72,74,76,79,81,84,86,88,91];
      let seed=20231, mel=7, t=0, k=0; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
      while(t<L-1e-6){ const pos=k%8, bar=Math.floor(k/8), ch=PROG[bar%4];
        if(pos===0){ [ch[0],ch[2],ch[4]].forEach((m,i)=>hold(mf(m),t,beat*4,i?.009:.012)); ch.forEach((m,i)=>play(mf(m),t+i*.012,beat*3.2,.017,.03)); play(mf(BASS[bar%4]),t,beat*1.8,.05,.02); }
        if(pos===5){ ch.slice(2).forEach((m,i)=>play(mf(m),t+i*.01,beat*1.3,.011,.02)); play(mf(BASS[bar%4]+7),t,beat*.9,.035,.02); }
        if([0,3,4,6].includes(pos)&&rnd()<.62){ mel=clamp(mel+Math.floor(rnd()*5)-2,0,SCALE.length-1); play(mf(SCALE[mel]),t,beat*1.5,.02,.006); }
        t+=beat*(k%2?.44:.56); k++; } }});
  /* rain on Earth: not a hiss (on a phone that is static) and not a scatter of little tones (those are bleeps), but rain:
     a few hundred small soft hits a second, each a short burst rung through a band in the middle of the range, so you hear
     a patter and not a wash; duller taps on wood and roofs nearby; now and then a drop into a puddle; and under it, dark
     and quiet, the rain further off, rising and falling with the gusts. Nothing above about 4 kHz, where hiss lives. It is
     worked out sample by sample here and only played through the bus */
  const RAINL=loop({name:'rain',sr:22050,P:12,H:2,ref:1,ios:.6,gate:.1,tc:1.4,tcOut:1.8,make(oc){ const b=bus(oc,.25), sr=oc.sampleRate, n=oc.length, buf=oc.createBuffer(1,n,sr), d=buf.getChannelData(0), L=n/sr;
      let seed=97; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
      /* one hit: a short burst of decaying noise rung through a band-pass at f (Q q), about tau seconds long, at level g */
      const hit=(t,f,q,tau,g)=>{ const i0=Math.floor(t*sr); if(i0>=n) return; const w=2*Math.PI*Math.min(f,sr*.45)/sr, al=Math.sin(w)/(2*q), a0=1+al, b0=al/a0, a1=-2*Math.cos(w)/a0, a2=(1-al)/a0;
        const N=Math.min(n-i0,Math.floor(sr*(tau*7+.004))), at=Math.max(1,Math.floor(sr*.0007)); let x1=0,x2=0,y1=0,y2=0;
        for(let k=0;k<N;k++){ const e=(k<at?k/at:1)*Math.exp(-k/(tau*sr)), x=(rnd()*2-1)*e, y=b0*x-b0*x2-a1*y1-a2*y2; x2=x1; x1=x; y2=y1; y1=y; d[i0+k]+=y*g; } };
      /* a drop into a puddle: a little bubble that rings and rises in pitch as it closes */
      const plip=(t,f0,g)=>{ const i0=Math.floor(t*sr), N=Math.min(n-i0,Math.floor(sr*.06)); let ph=0;
        for(let k=0;k<N;k++){ const u=k/sr, f=f0*(1+u*38), e=(u<.0015?u/.0015:1)*Math.exp(-u/.012); ph+=2*Math.PI*f/sr; d[i0+k]+=Math.sin(ph)*e*g; } };
      for(let t=.005;t<L;t+=.0012+rnd()*.0055){ const r=rnd(); hit(t,900+2600*Math.pow(rnd(),1.3),.8+rnd()*.9,.0016+rnd()*.004,.07+.7*Math.pow(r,5)); }   // the patter, mostly very soft, a few nearer
      for(let t=.05;t<L;t+=.09+rnd()*.32) hit(t,380+rnd()*520,2.4+rnd()*1.5,.005+rnd()*.007,.16+rnd()*.2);   // on wood and roofs
      for(let t=.1;t<L;t+=.22+rnd()*.7) plip(t,520+rnd()*620,.045+rnd()*.05);   // into puddles
      { let l1=0,l2=0,h1=0,g=.7,gt=.7; const c=Math.exp(-2*Math.PI*1300/sr), ch=Math.exp(-2*Math.PI*380/sr);   // further off: a dark band, in gusts
        for(let i=0;i<n;i++){ if(i%2048===0) gt=.45+.55*rnd(); g+=(gt-g)*.00004; const x=rnd()*2-1; l1=l1*c+x*(1-c); l2=l2*c+l1*(1-c); h1=h1*ch+l2*(1-ch); d[i]+=(l2-h1)*g*.5; } }
      for(let i=0;i<n;i++) d[i]*=.235;   // (soft: a little under where it was first set)
      const s=oc.createBufferSource(); s.buffer=buf; const hp=oc.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=180; hp.Q.value=.6;
      const lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3800; lp.Q.value=.6; s.connect(hp); hp.connect(lp); lp.connect(b.in); s.start(0); }});
  /* ---------- Diarmuid's guitar, outside the café on Earth ----------
     An electric guitar made here, string by string. Each note is a plucked string (Karplus-Strong): a short burst of soft
     noise, one period long, goes round a delay line one period long and loses a little of its top each time round, so it
     rings and fades the way a string does. A string sounds one note at a time, and its next note stops the last. The
     strings go through a small amp: a soft, slightly lopsided overdrive that is never fed anything high (so it has nothing
     to fizz with), a little more middle, then a small cabinet that rolls the top off steeply above 3 kHz, so it stays warm
     on a phone's speaker. His piece is in the town's key and at its tempo: the same four chords (Fmaj9, Em9, Dm9, Cmaj9),
     at 72 and swung. Sixteen bars that go round, eight picked with a tune on top and eight strummed under the same tune.
     The song he plays you once you have talked is a second recording: his own blues-rock number around a riff in E, the amp
     pushed harder, with his foot on a stomp box, ending on a big E chord left to ring */
  const GTR=[40,45,50,55,59,64], BK={duck:1,on:false,s:false,done:false};   // the open strings, low E to high e; how far the town's music is let through while he plays
  const BKS=(()=>{ const beat=60/72, bar=4*beat, sl=k=>beat*(Math.floor(k/2)+(k%2?.56:0)), len=(k,n)=>sl(k+n)-sl(k);   // where the k-th swung eighth of a bar falls, and how long n of them last
    let seed=4111; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647, hum=()=>(rnd()-.5)*.012;
    /* the chords as he holds them, one shape walking down the neck: the notes on the A, D, G and B strings */
    const SH=[[53,57,64,67],[52,55,62,66],[50,53,60,64],[48,52,59,62]];
    /* the tune, on the high string: [eighth, note, how many eighths] in each of eight bars */
    const TUNE=[[[0,72,3],[3,69,1],[4,72,2],[6,76,2]],[[0,74,3],[3,71,1],[4,74,2],[6,71,2]],[[0,72,3],[3,69,1],[4,72,2],[6,74,1],[7,76,1]],[[0,74,2],[2,72,2],[4,67,4]],
      [[0,76,2],[2,74,1],[3,72,1],[4,69,2],[6,72,2]],[[0,71,3],[3,67,1],[4,71,2],[6,74,2]],[[0,72,2],[2,74,1],[3,76,3],[6,74,1],[7,72,1]],[[0,74,2],[2,76,2],[4,72,4]]];
    const mk=()=>{ const N=[]; return {N,note:(t,s,m,d,v,o)=>N.push(Object.assign({t:Math.max(0,t+hum()),s,m,d,v:v*(.93+rnd()*.14)},o))}; };
    const A=mk(), note=A.note;
    for(let b=0;b<16;b++){ const t0=b*bar, sh=SH[b%4];
      if(b<8){ /* picked: the bass and the top of the chord together, then the middle strings in turn, each left to ring */
        [[1,4],[3],[2],[4],[1],[3],[4],[2]].forEach((ss,k)=>ss.forEach(s=>note(t0+sl(k),s,sh[s-1],len(k,8-k)+.2,[.8,.5,.48,.58,.62,.48,.55,.46][k]*(s===1?1:.9)))); }
      else /* strummed: down on the beat, up on the off-beat, and a muted chop on three */
        [[0,'D',.75],[2,'D',.48],[3,'U',.38],[4,'X',.34],[5,'U',.36],[6,'D',.46],[7,'U',.34]].forEach(([k,dir,v])=>{ const t=t0+sl(k);
          if(dir==='X') return [1,2,3,4].forEach((s,i)=>note(t+i*.009,s,sh[s-1],.035,v,{br:.35}));
          (dir==='U'?[4,3,2]:k?[2,3,4]:[1,2,3,4]).forEach((s,i)=>note(t+i*(dir==='U'?.009:.012),s,sh[s-1],len(k,2)+.04,v*(dir==='U'?.85:1))); });   // each rings on until the next stroke
      TUNE[b%8].forEach(([k,m,n])=>note(t0+sl(k)+(b<8?0:.03),5,m,len(k,n)+.05,b<8?.85:.8,{br:.62})); }
    /* his song, played when you have heard him out: his own, written the way the heavy blues-rock bands of the seventies
       wrote, around a riff, and played the way they played it: a slow, heavy shuffle at 84, sitting just behind the beat.
       The riff is the blues in E: the open low string hit hard, a curl on the minor third, a pull-off back to the open
       string, up the A string through the flat fifth to the fifth and held, a hammer-on to the octave. It is answered by
       power chords falling E, D, A and a walk back down. Then the same with his foot on the stomp box and a tambourine
       strapped to the other, a turn through G and A, a chorus of big chords, a wailing lead in E with long bends and wide
       vibrato over a low E, the riff again, and a last open E chord, rolled and left to ring. (It is his song, in that
       manner: no one else's riff or tune) */
    const B=mk(), t1=.5, sb=60/84, sbar=4*sb, at=(b,u)=>t1+b*sbar+u*sb/3+(rnd()-.5)*.006+.008, tu=sb/3, nb=(b,u,s,m,n,v,o)=>B.note(at(b,u),s,m,n*tu,v,o);   // u: triplets (a shuffle), 12 to a bar
    const pc=(b,u,s,m,n,v,o)=>{ const t=at(b,u); [0,7,12].forEach((iv,i)=>B.note(t+i*.012,s+i,m+iv,n*tu,v*(i?.9:1),Object.assign({br:.5},o))); };   // a power chord: root, fifth, octave
    const riff=b=>{ nb(b,0,0,40,2,1); nb(b,2,0,40,.7,.66,{br:.3}); nb(b,3,0,43,1,.86,{bd:[[0,0],[.07,.5]]}); nb(b,4,0,40,1,.74); nb(b,5,0,43,1,.8);
      nb(b,6,1,45,1,.84); nb(b,7,1,46,1,.78); nb(b,8,1,47,2,.95,{vb:.16}); nb(b,10,2,50,1,.78); nb(b,11,2,52,1,.84); };
    const answer=(b,turn)=>{ if(turn){ pc(b,0,0,43,3,.95); pc(b,3,0,45,3,1); pc(b,6,0,40,4,1,{vb:.08}); nb(b,10,0,43,1,.78); nb(b,11,0,45,1,.8); return; }
      pc(b,0,0,40,2,1); pc(b,2,0,40,.7,.62,{br:.3}); pc(b,3,1,50,2,.92); pc(b,5,1,45,3,.96); nb(b,8,0,43,1,.8); nb(b,9,0,40,1,.74); nb(b,10,0,43,1,.8); nb(b,11,1,45,1,.82); };
    riff(0); answer(1); riff(2); answer(3); riff(4); answer(5,true);
    pc(6,0,0,45,6,1); pc(6,3,0,45,1,.7); pc(6,6,0,43,3,.95); pc(6,9,1,50,3,.95);   // the chorus: A, G, D, strummed hard
    pc(7,0,0,40,6,1,{vb:.1}); nb(7,6,2,50,1,.78); nb(7,7,2,52,1,.8); nb(7,8,3,55,1,.82); nb(7,9,3,57,1,.86,{bd:[[0,0],[.08,1]]}); nb(7,10,3,55,1,.8); nb(7,11,2,52,1,.8);
    /* the lead, on the top two strings, over a low E: a long bend that wails, the notes tumbling down, then up to the top E
       sung with a wide vibrato, and down the scale in triplets back to the riff */
    const ld={br:.72,pp:.13};
    nb(8,0,4,69,3,.9,Object.assign({bd:[[0,0],[.14,2]],vb:.28},ld)); nb(8,3,4,69,1,.8,ld); nb(8,4,4,67,1,.8,ld); nb(8,5,4,64,1,.78,ld); nb(8,6,4,67,2,.84,Object.assign({vb:.2},ld));
    nb(8,8,4,69,1,.82,ld); nb(8,9,5,71,1,.84,ld); nb(8,10,5,74,2,.88,Object.assign({bd:[[0,0],[.1,1]]},ld));
    nb(9,0,5,76,4,.92,Object.assign({vb:.38},ld)); nb(9,4,5,74,1,.82,ld); nb(9,5,5,71,1,.82,ld); nb(9,6,4,69,1,.8,ld); nb(9,7,4,67,1,.8,ld); nb(9,8,4,64,1,.8,ld); nb(9,9,4,62,1,.78,ld); nb(9,10,4,59,1,.78,ld); nb(9,11,2,52,1,.8);
    [8,9].forEach(b=>{ nb(b,0,0,40,5.6,.55,{br:.35}); nb(b,6,0,40,5.6,.5,{br:.35}); });
    riff(10);
    pc(11,0,0,40,2,1); pc(11,3,1,50,2,.92); pc(11,5,1,45,1,.9);
    [40,47,52,56,59,64].forEach((m,i)=>B.note(at(11,6)+i*.034,i,m,7,.84,{vb:i>3?.14:0,br:.55}));   // the last open E, rolled and rung out
    /* his feet: the stomp box on one and three (and the push before three), the tambourine on two and four, from the second
       time round to the end */
    const kick=[], tamb=[]; for(let b=2;b<=11;b++){ if(b===11){ kick.push(at(b,0),at(b,6)); continue; } kick.push(at(b,0),at(b,6)); if(b<8||b===10) kick.push(at(b,5)); tamb.push(at(b,3),at(b,9)); }
    return {beat,bar,P:16*bar,notes:A.N,solo:{P:Math.ceil(t1+11*sbar+2*sb+6),notes:B.N,t1,beat:sb,kick,tamb},open:GTR}; })();
  /* one note into out: its string rings from its start until it is let go (d), then is damped quickly; stopped outright at
     end. sl slides into it from another note, bd bends it ([seconds, semitones] points), vb sings it with vibrato */
  function pluck(out,sr,t0s,n,end,rnd){ const f0=440*Math.pow(2,(n.m-69)/12), lo=440*Math.pow(2,(Math.min(n.m,n.sl||n.m)-69)/12), M=Math.ceil(sr/lo*1.03)+4, ring=new Float32Array(M);
    const t0=Math.round((t0s+n.t)*sr), E=Math.round(sr/f0), x=new Float32Array(E), br=n.br??.5; let lx=0, mx=0;
    for(let i=0;i<E;i++){ lx+=br*((rnd()*2-1)-lx); x[i]=lx; }   // the pick: soft noise, softer still for a dark note
    const pk=Math.max(2,Math.round(E*(n.pp??.17))); for(let i=E-1;i>=pk;i--) x[i]-=x[i-pk];   // plucked a little way from the bridge
    for(let i=0;i<E;i++) mx=Math.max(mx,Math.abs(x[i])); for(let i=0;i<E;i++) x[i]*=n.v/(mx||1);
    const T60=4.5-2.7*clamp((n.m-40)/45,0,1), rho=Math.pow(10,-3/(f0*T60)), rOff=Math.pow(10,-3/(f0*.09)), S0=.5-.22*clamp((n.m-48)/30,0,1);
    const hold=Math.round(n.d*sr), stop=Math.round((t0s+end)*sr), bd=n.bd, vb=n.vb||0;
    let w=0, prev=0, pkA=0, quiet=0;
    for(let i=0;;i++){ const o=t0+i; if(o>=out.length) break; const t=i/sr; let st=0;
      if(n.sl) st+=(n.sl-n.m)*(1-sstep(0,.07,t));
      if(bd){ let j=0; while(j<bd.length-1&&bd[j+1][0]<t) j++; const a=bd[j], b=bd[Math.min(j+1,bd.length-1)]; st+=b[0]>a[0]?lerp(a[1],b[1],clamp((t-a[0])/(b[0]-a[0]),0,1)):a[1]; }
      if(vb) st+=vb*Math.sin(TAU*5.4*t)*sstep(.15,.45,t);
      const damp=i>hold, S=damp?.5:S0, D=sr/(f0*Math.pow(2,st/12))-S; let rd=w-D; if(rd<0) rd+=M;
      const i0=rd|0, fr=rd-i0, y=ring[i0]*(1-fr)+ring[i0+1<M?i0+1:0]*fr, lp=(1-S)*y+S*prev; prev=y;
      ring[w]=(i<E?x[i]:0)+(damp?rOff:rho)*lp; if(++w===M) w=0;
      let g=1; if(o>=stop){ g=1-(o-stop)/(sr*.012); if(g<=0) break; }   // the next note on this string, or the end of the piece, stops it
      out[o]+=y*g;
      const a=y<0?-y:y; if(a>pkA) pkA=a; if((i&255)===255){ if(pkA<6e-5*n.v){ if(++quiet>3) break; } else quiet=0; pkA=0; } } }
  /* the strings into the amp: the whole score into one stretch of sound, then the overdrive, the cabinet and the room */
  function amp(oc,t0,sc,o){ const sr=oc.sampleRate, g=new Float32Array(oc.length); let seed=271; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const by=GTR.map(()=>[]); for(const n of sc) by[n.s].push(n);
    for(const q of by){ q.sort((a,b)=>a.t-b.t); q.forEach((n,i)=>pluck(g,sr,t0,n,Math.min(q[i+1]?q[i+1].t:1e9,o.cut||1e9),rnd)); }
    let pk=0; for(const v of g) pk=Math.max(pk,Math.abs(v)); const b=oc.createBuffer(1,oc.length,sr), d=b.getChannelData(0), k=.9/(pk||1); for(let i=0;i<g.length;i++) d[i]=g[i]*k;
    const src=oc.createBufferSource(); src.buffer=b; src.start(0);
    const f=(type,fr,q,gn=0)=>{ const x=oc.createBiquadFilter(); x.type=type; x.frequency.value=fr; x.Q.value=q; x.gain.value=gn; return x; };
    const ws=oc.createWaveShaper(), K=o.drive, a=.18, n0=Math.tanh(K+a)-Math.tanh(a), n1=Math.tanh(a)-Math.tanh(a-K), cv=new Float32Array(1025);
    for(let i=0;i<cv.length;i++){ const x=i/512-1, y=Math.tanh(K*x+a)-Math.tanh(a); cv[i]=.9*y/(x>=0?n0:n1); }   // lopsided, so what it adds is the warm even harmonics
    ws.curve=cv; ws.oversample='4x';
    const ch=[f('highpass',110,.7),f('lowpass',3400,.6),ws,f('peaking',720,.8,2.5),f('lowpass',o.cab,.7),f('lowpass',o.cab*1.3,.55),f('highpass',90,.6)], lv=oc.createGain(), B=bus(oc,o.wet,o.room||.3);
    src.connect(ch[0]); for(let i=0;i<ch.length-1;i++) ch[i].connect(ch[i+1]); lv.gain.value=o.level; ch[ch.length-1].connect(lv); lv.connect(B.in); lv.connect(B.rv);
    /* a stomp box under it: a soft low thump on each time given, the pitch falling as it fades, with no click above it */
    if(o.kick&&o.kick.length){ const kb=oc.createBuffer(1,oc.length,sr), kd=kb.getChannelData(0);
      for(const kt of o.kick){ const i0=Math.round((t0+kt)*sr); let ph=0; for(let i=0;i<sr*.32&&i0+i<kd.length;i++){ const u=i/sr, f=46+64*Math.exp(-u/.028); ph+=TAU*f/sr; kd[i0+i]+=Math.sin(ph)*Math.exp(-u/.11)*(u<.002?u/.002:1); } }
      const ks=oc.createBufferSource(); ks.buffer=kb; ks.start(0); const kl=f('lowpass',420,.6), kg=oc.createGain(); kg.gain.value=o.kickLevel||.3; ks.connect(kl); kl.connect(kg); kg.connect(B.in); }
    /* and a tambourine on the other foot: a short shake of jingles, each a few ringing partials over a little noise, soft
       and kept under 6 kHz */
    if(o.tamb&&o.tamb.length){ const tb=oc.createBuffer(1,oc.length,sr), td=tb.getChannelData(0), P=[3150,4170,5030,5660];
      for(const tt of o.tamb){ const i0=Math.round((t0+tt)*sr); let lp=0; for(let i=0;i<sr*.16&&i0+i<td.length;i++){ const u=i/sr, en=Math.exp(-u/.045)*(u<.003?u/.003:1)*(1+.6*Math.exp(-(((u-.03)/.012)**2)));
          lp+=.35*((rnd()*2-1)-lp); let v=lp*.5; for(let j=0;j<P.length;j++) v+=Math.sin(TAU*P[j]*(1+.003*j)*u+j)*.22; td[i0+i]+=v*en; } }
      const ts=oc.createBufferSource(); ts.buffer=tb; ts.start(0); const thp=f('highpass',1800,.6), tlp=f('lowpass',5800,.6), tg=oc.createGain(); tg.gain.value=o.tambLevel||.04; ts.connect(thp); thp.connect(tlp); tlp.connect(tg); tg.connect(B.in); tg.connect(B.rv); }
    if(o.echo){ const dl=oc.createDelay(1), fb=oc.createGain(), el=f('lowpass',2000,.5), ew=oc.createGain(); dl.delayTime.value=o.echo; fb.gain.value=.26; ew.gain.value=.22;
      lv.connect(dl); dl.connect(el); el.connect(fb); fb.connect(dl); el.connect(ew); ew.connect(B.in); } }
  const BUSK=loop({name:'busk',sr:22050,P:BKS.P,H:.9,R:.2,fade:false,ref:1,tc:.45,tcOut:.3,gate:.3,make(oc,t0){ amp(oc,t0,BKS.notes,{drive:1.6,cab:2500,level:.22,wet:.3,cut:BKS.P}); }});
  /* the solo is played once: near its end (where only the last chord is still ringing) it is let go, even if the page has
     stalled, so it never goes round again */
  const soloEnd=()=>{ const a=SOLO.els[SOLO.cur]; if(a&&a._on&&a.currentTime>SOLO.P-2){ BK.done=true; SOLO.want=0; } };
  const SOLO=loop({name:'busk-solo',sr:22050,P:BKS.solo.P,H:.5,R:.2,fade:false,ref:1,tc:.12,tcOut:.25,gate:.3,make(oc,t0){ amp(oc,t0,BKS.solo.notes,{drive:3.4,cab:2800,level:.1,wet:.42,room:.6,kick:BKS.solo.kick,kickLevel:.16,tamb:BKS.solo.tamb,tambLevel:.035}); }});
  /* worked out one at a time, out of the way of the page starting: the music and the orbit first, the stations' air last */
  setInterval(soloEnd,100);
  let making=!!OAC;
  { const Q=[MUS,PAD,SUB,WL,WH,TH,RD,RO,HS,CF,CN,...Object.values(BEDL),RAINL,BUSK,SOLO]; let qi=0; const go=()=>{ if(qi<Q.length) render(Q[qi++],go); else making=false; }; setTimeout(go,60); }
  /* ---------- a cutscene's own sound: Earth's launch scene, before the last flight ----------
     Made once, out of sight, as a recording (as the long sounds are), from a list of cues with their times, and played in
     step with the scene's clock: it is not a loop, it is played once from wherever the scene is. Each thing that moves has
     its own sound: the warning horn, the latches, the doors dropping and rolling away, the relays and the hum of the
     shaft's lamps, the lift's motor, the air pushed up as the nose comes out, the clamps, the hatch, the board's lamps and
     the switch. What happens down the shaft rings in it: a hard round shaft throws a sound back and forth, a quick flutter
     of echoes over a long tail, and less of it as the rocket comes up. Every noise in it is short or kept low and dark (a
     rumble, a breath), never a bed of hiss: on a phone that is static. env is how loud it is, a tenth of a second at a time */
  const SC={url:null,el:null,busy:false,len:0,rms:0,env:null};
  function scoreMake(Q){ if(!OAC||SC.url||SC.busy) return; SC.busy=true;
    const sr=32000, len=Math.ceil((Q.end+1.5)*sr); SC.len=len/sr; let oc;
    try{ oc=new OAC(1,len,sr); }catch(e){ SC.busy=false; return; }
    const b=bus(oc,1,.45), IN=b.in, room=b.rv;
    const nz=oc.createBuffer(1,len,sr), nd=nz.getChannelData(0); for(let i=0;i<len;i++) nd[i]=Math.random()*2-1;
    /* the shaft: echoes every 23 ms (down and back up a concrete tube), darker each time, over a two-second tail */
    const sh=oc.createConvolver(), L=Math.floor(sr*2.2), ir=oc.createBuffer(1,L,sr), d=ir.getChannelData(0);
    for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*.35*Math.pow(1-i/L,2.2);
    for(let k=1;k<60;k++){ const i=Math.floor(k*.023*sr+(Math.random()-.5)*.002*sr); if(i<L) d[i]+=.9*Math.pow(.86,k); }
    { let e=0; for(let i=0;i<L;i++) e+=d[i]*d[i]; const k=.42/Math.sqrt(e); for(let i=0;i<L;i++) d[i]*=k; }   // as loud as what goes in, not many times over
    sh.buffer=ir; const shLP=oc.createBiquadFilter(); shLP.type='lowpass'; shLP.frequency.value=2400; const shG=oc.createGain(); shG.gain.value=.55; sh.connect(shLP); shLP.connect(shG); shG.connect(IN);
    const SEND=oc.createGain(); SEND.connect(sh); const sv=SEND.gain;   // how much of the shaft you hear: none while it is shut, most while it is open and deep
    sv.setValueAtTime(0,0); sv.setValueAtTime(0,Q.slide[0]); sv.linearRampToValueAtTime(.9,Q.slide[0]+.6); sv.setValueAtTime(.9,Q.surface-.6); sv.linearRampToValueAtTime(.25,Q.rise[1]); sv.linearRampToValueAtTime(0,Q.rise[1]+.25);
    const src=(t0,off)=>{ const s=oc.createBufferSource(); s.buffer=nz; s.loop=true; s.start(Math.max(0,t0),off??Math.random()*(len/sr-1)); return s; };
    const gainAt=(t0,peak,atk,dec,to)=>{ const g=oc.createGain(); g.gain.setValueAtTime(0,0); g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(peak,t0+atk); g.gain.exponentialRampToValueAtTime(.0001,t0+atk+dec); g.connect(to); return g; };
    const filt=(type,f,q)=>{ const x=oc.createBiquadFilter(); x.type=type; x.frequency.value=f; x.Q.value=q??.7; return x; };
    const osc=(type,f,t0,t1)=>{ const o=oc.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,0); o.start(t0); o.stop(t1); return o; };
    const sendTo=(node,to,k)=>{ const g=oc.createGain(); g.gain.value=k; node.connect(g); g.connect(to); };
    /* a struck steel part: a few bar-like partials over a click and a thump */
    const clank=(t,g,f=380,deep=1,shaft=0)=>{ const out=oc.createGain(); out.connect(IN); if(shaft) sendTo(out,SEND,shaft); if(room) sendTo(out,room,.4);
      [[1,1,.22],[2.76,.55,.14],[5.4,.3,.09],[8.93,.16,.05]].forEach(([m,a,dk])=>{ const o=osc('sine',f*m*(.98+Math.random()*.04),t,t+dk*8); o.connect(gainAt(t,g*a,.002,dk*5,out)); });
      const n=src(t); const bp=filt('bandpass',2600,1.1); n.connect(bp); bp.connect(gainAt(t,g*.7,.001,.05,out)); n.stop(t+.2);
      if(deep){ const o=oc.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(48,t+.22); o.start(t); o.stop(t+.5); o.connect(gainAt(t,g*1.3*deep,.004,.3,out)); } };
    /* a heavy thing landing: low, with enough just above it for a phone to carry */
    const thud=(t,g,shaft=0)=>{ const out=oc.createGain(); out.connect(IN); if(shaft) sendTo(out,SEND,shaft);
      const o=oc.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(82,t); o.frequency.exponentialRampToValueAtTime(42,t+.35); o.start(t); o.stop(t+.7); o.connect(gainAt(t,g,.004,.45,out));
      const o2=oc.createOscillator(); o2.type='triangle'; o2.frequency.setValueAtTime(165,t); o2.frequency.exponentialRampToValueAtTime(90,t+.25); o2.start(t); o2.stop(t+.5); o2.connect(gainAt(t,g*.35,.003,.25,out));
      const n=src(t); const lp=filt('lowpass',420,.8); n.connect(lp); lp.connect(gainAt(t,g*.8,.002,.12,out)); n.stop(t+.4); };
    /* air let out: short, and kept well down, so it never reads as static on a phone */
    const hiss=(t,dur,g)=>{ const n=src(t), hp=filt('highpass',2200,.6), lp=filt('lowpass',6500,.6); n.connect(hp); hp.connect(lp); const e=gainAt(t,g,.02,dur,IN); lp.connect(e); if(room) sendTo(e,room,.3); n.stop(t+dur+.3); };
    /* the warning horn: a rising two-step buzz, softened */
    const horn=(t,g)=>{ const o=oc.createOscillator(); o.type='square'; o.frequency.setValueAtTime(392,t); o.frequency.setValueAtTime(523,t+.13); o.start(t); o.stop(t+.34);
      const lp=filt('lowpass',1500,.9), a=oc.createGain(); a.gain.setValueAtTime(0,0); a.gain.setValueAtTime(0,t); a.gain.linearRampToValueAtTime(g,t+.012); a.gain.setValueAtTime(g,t+.24); a.gain.exponentialRampToValueAtTime(.0001,t+.33);
      o.connect(lp); lp.connect(a); a.connect(IN); if(room) sendTo(a,room,.7); };
    /* a relay closing, the click of a lamp coming on */
    const relay=(t,g)=>{ const n=src(t), bp=filt('bandpass',3400,2.2); n.connect(bp); const e=gainAt(t,g,.001,.018,IN); bp.connect(e); sendTo(e,SEND,.8); n.stop(t+.1);
      const o=oc.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(190,t); o.frequency.exponentialRampToValueAtTime(95,t+.05); o.start(t); o.stop(t+.12); const a=gainAt(t,g*.9,.002,.06,IN); o.connect(a); sendTo(a,SEND,.8); };
    /* the lamps' hum, one more ring of it each time a ring comes on, gone when the deck closes the shaft */
    { const hum=oc.createGain(); hum.gain.setValueAtTime(0,0); Q.rings.forEach((t,i)=>hum.gain.setTargetAtTime(.008*(i+1),t,.05));
      hum.gain.setTargetAtTime(0,Q.rise[1]+.1,.12); hum.connect(IN); sendTo(hum,SEND,.6);
      [[100,1],[200,.6],[300,.35],[400,.18]].forEach(([f,a])=>{ const o=osc('sine',f*(1+(Math.random()-.5)*.002),Q.rings[0],Q.rise[1]+1); const g=oc.createGain(); g.gain.value=a; o.connect(g); g.connect(hum); });
      const bz=osc('sawtooth',100,Q.rings[0],Q.rise[1]+1), bl=filt('bandpass',900,2), bg=oc.createGain(); bg.gain.value=.25; bz.connect(bl); bl.connect(bg); bg.connect(hum); }
    /* the doors rolling away under the rim: a grinding rumble on rollers, the drive's tone rising and settling */
    { const [t0,t1]=Q.slide, out=oc.createGain(); out.gain.setValueAtTime(0,0); out.gain.setValueAtTime(0,t0); out.gain.linearRampToValueAtTime(1,t0+.3); out.gain.setValueAtTime(1,t1-.35); out.gain.linearRampToValueAtTime(0,t1+.05); out.connect(IN); sendTo(out,SEND,.5);
      const n=src(t0), lp=filt('lowpass',320,.9), bp=filt('bandpass',140,1.4), g1=oc.createGain(); g1.gain.value=.24; n.connect(lp); lp.connect(g1); g1.connect(out); n.connect(bp); const g2=oc.createGain(); g2.gain.value=.12; bp.connect(g2); g2.connect(out); n.stop(t1+.3);
      const m=oc.createOscillator(); m.type='sawtooth'; m.frequency.setValueAtTime(52,t0); m.frequency.linearRampToValueAtTime(68,t0+.5); m.frequency.setValueAtTime(68,t1-.5); m.frequency.linearRampToValueAtTime(50,t1); m.start(t0); m.stop(t1+.2);
      const ml=filt('lowpass',520,1.2), mg=oc.createGain(); mg.gain.value=.05; m.connect(ml); ml.connect(mg); mg.connect(out);
      for(let t=t0+.12;t<t1-.1;t+=.11+Math.random()*.07) clank(t,.022+Math.random()*.012,620+Math.random()*260,0,.4);   // the rollers over their joints
      clank(t1,.24,300,1,.5); thud(t1+.02,.3,.4); }
    /* the lift: its motor comes up with the speed and eases off as it slows; the valve opens with a knock before it moves */
    { const [t0,t1]=Q.rise, T=t1-t0, vel=x=>x<.5?2*x:2*(1-x);   // as the scene's ease in and out: fastest halfway
      thud(t0-.08,.26,.6); clank(t0-.06,.1,240,0,.6);
      const N=60, fc=new Float32Array(N+1), ac=new Float32Array(N+1), lc=new Float32Array(N+1);
      for(let i=0;i<=N;i++){ const v=vel(i/N); fc[i]=64+58*v; ac[i]=.25+.75*v; lc[i]=380+1500*v; }
      const out=oc.createGain(); out.gain.setValueAtTime(0,0); out.gain.setValueAtTime(0,t0); out.gain.linearRampToValueAtTime(.9,t0+.35); out.gain.setValueAtTime(.9,t1-.15); out.gain.linearRampToValueAtTime(0,t1+.08); out.connect(IN); sendTo(out,SEND,.9);
      const amp=oc.createGain(); amp.gain.setValueAtTime(ac[0],t0); amp.gain.setValueCurveAtTime(ac,t0,T); amp.connect(out);
      const lp=filt('lowpass',380,1.6); lp.frequency.setValueAtTime(lc[0],t0); lp.frequency.setValueCurveAtTime(lc,t0,T); lp.connect(amp);
      [[1,.1,'sawtooth'],[1.006,.08,'sawtooth'],[2,.05,'square']].forEach(([m,a,ty])=>{ const o=oc.createOscillator(); o.type=ty; o.frequency.setValueAtTime(fc[0]*m,t0); o.frequency.setValueCurveAtTime(fc.map(f=>f*m),t0,T); o.start(t0); o.stop(t1+.2); const g=oc.createGain(); g.gain.value=a; o.connect(g); g.connect(lp); });
      const n=src(t0), rl=filt('lowpass',240,.8), rg=oc.createGain(); rg.gain.value=.24; n.connect(rl); rl.connect(rg); rg.connect(amp); n.stop(t1+.3);   // the rumble of it
      /* the nose coming out of the shaft pushes the air in front of it up and out */
      { const s=Q.surface, n2=src(s-.5), bp=filt('bandpass',260,.9); bp.frequency.setValueAtTime(220,s-.5); bp.frequency.exponentialRampToValueAtTime(900,s+.5); n2.connect(bp); bp.connect(gainAt(s-.5,.13,.45,.7,IN)); n2.stop(s+1.6); }
      /* the clamps: two of them, then the pressure let go */
      clank(t1,.3,260,1.2,.3); clank(t1+.13,.25,300,1,.2); thud(t1+.02,.42,.3); hiss(t1+.2,.9,.04); }
    /* the hatch: a ram eases it down and it lands on the pad */
    { const [t0,t1]=Q.hatch, o=oc.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(210,t0); o.frequency.linearRampToValueAtTime(300,t1); o.start(t0); o.stop(t1+.1);
      const lp=filt('lowpass',900,.8), a=oc.createGain(); a.gain.setValueAtTime(0,0); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.032,t0+.12); a.gain.setValueAtTime(.032,t1-.1); a.gain.linearRampToValueAtTime(0,t1); o.connect(lp); lp.connect(a); a.connect(IN);
      clank(t0,.06,520,0); thud(t1,.28); clank(t1,.1,340,.4); }
    /* the warning horn while the doors open */
    Q.horns.forEach(t=>horn(t,.065));
    /* the latches let go, a breath of air, and the doors drop into their slots */
    clank(Q.unlatch,.26,410,1); clank(Q.unlatch+.09,.21,450,.8); hiss(Q.unlatch+.04,.6,.03); thud(Q.drop,.3);
    Q.rings.forEach(t=>relay(t,.07));
    /* the board: each lamp a note higher as it goes green; the switch, and the board answering */
    const PEN=[72,74,76,79,81,84,86,88,91,93], mf=m=>440*Math.pow(2,(m-69)/12);
    Q.greens.forEach((t,i)=>{ const f=mf(PEN[i%PEN.length]); const o=osc('sine',f,t,t+.25); o.connect(gainAt(t,.055,.004,.12,IN)); const o2=osc('sine',f*2,t,t+.15); o2.connect(gainAt(t,.014,.003,.06,IN)); });
    { const t=Q.lever; clank(t,.18,700,.5); thud(t+.01,.14); [[79,.08],[84,.2]].forEach(([m,dt])=>{ const o=osc('sine',mf(m),t+dt,t+dt+.6); o.connect(gainAt(t+dt,.036,.005,.35,IN)); });
      const o=oc.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(110,t+.1); o.frequency.exponentialRampToValueAtTime(220,t+1.3); o.start(t+.1); o.stop(t+1.8); o.connect(gainAt(t+.1,.05,.5,1,IN)); }
    /* kept at half what it is worked out at, so the machinery stands some 5 dB over the town's music (itself let down under
       it) and a little under the last flight's roar, which it leads into */
    const done=bf=>{ const dd=bf.getChannelData(0); for(let i=0;i<dd.length;i++) dd[i]*=.5; const w=wav(dd,0,dd.length,sr), E=new Float32Array(Math.ceil(dd.length/(sr/10)));
      for(let k=0;k<E.length;k++){ let q=0, n=0; for(let i=k*sr/10;i<Math.min(dd.length,(k+1)*sr/10);i++,n++) q+=dd[i]*dd[i]; E[k]=Math.sqrt(q/Math.max(1,n)); }
      SC.url=w.url; SC.rms=w.rms; SC.env=E; SC.busy=false;
      SC.el=BUFP?new BufPlayer(()=>{ if(SC.bb) return SC.bb; const b=ctx.createBuffer(1,dd.length,sr), ch=b.getChannelData(0); for(let i=0;i<dd.length;i++){ const x=dd[i]; ch[i]=x>1?1:x<-1?-1:(x===x?x:0); } SC.bb=b; return b; }):new Audio(); SC.el.preload='auto'; if(!BUFP) SC.el.src=SC.url; SC.el._want=false; try{ SC.el.preservesPitch=false; }catch(e){} };
    try{ const pr=oc.startRendering(); if(pr&&pr.then) pr.then(done,()=>{ SC.busy=false; }); else oc.oncomplete=e=>done(e.renderedBuffer); }catch(e){ SC.busy=false; } }
  const scoreStop=()=>{ if(SC.el){ SC.el._want=false; if(!SC.el.paused) SC.el.pause(); } };
  /* the workshop's test fire: all of its sounds go through one gain of their own (and a little of it into the room), so
     walking out mid-fire can silence every one of them at once, the ones already sounding as well. A fresh one is made
     for the next fire */
  const tfBus=()=>{ if(!n.tf){ n.tf=ctx.createGain(); n.tf.connect(comp); const s=ctx.createGain(); s.gain.value=.22; n.tf.connect(s); s.connect(revIn); } return n.tf; };
  function tfT(f,dur,g,type='sine',f2=0,delay=0,atk=.004){ const t0=ctx.currentTime+delay, o=ctx.createOscillator(), a=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(tfBus()); o.start(t0); o.stop(t0+dur+.05); }
  function tfN(dur,g,f0,f1,type='lowpass',q=.7,delay=0,atk=.004){ const t0=ctx.currentTime+delay, s=shot(), b=ctx.createBiquadFilter(); b.type=type; b.Q.value=q; b.frequency.setValueAtTime(f0,t0); b.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); s.connect(b); b.connect(a); a.connect(tfBus()); s.start(t0,Math.random()*8); s.stop(t0+dur+.05); }
  return {
    get on(){return on&&!muted}, get ctx(){return ctx}, _rebuild:rebuild,
    /* the recordings are being made (the page's frames are slower then for a reason of their own); never past half a minute */
    get busy(){ return making&&performance.now()<30000; },
    _poison(){ if(!ctx) return; const b=ctx.createBuffer(1,256,ctx.sampleRate); b.getChannelData(0).fill(NaN); const s=ctx.createBufferSource(); s.buffer=b; s.connect(comp); s.start(); },   // test hook: one bad value into the mix
    async start(){ try{ init(); on=true; await ctx.resume(); set(out.gain,muted||away?0:LOUD,.6); }catch(e){ on=false; } sndUI(); },
    toggle(){ muted=!muted; if(ctx) set(out.gain,muted||away?0:LOUD,.3); sndUI(); },
    get muted(){return muted},
    _lv(){ const r=x=>+x.toFixed(4); return {pad:r(PAD.vol),sub:r(SUB.vol),wind:r(WL.vol+WH.vol),thrust:r(TH.vol),roar:r(RD.vol+RO.vol),hiss:r(HS.vol),whine:n.ten?r(n.teng.gain.value):0,
      mus:r(MUS.vol),musPlaying:MUS.els.some(e=>!e.paused&&!e.muted),bed:r(Object.values(BEDL).reduce((a,b)=>a+b.vol,0)),cb:r(CF.vol+CN.vol)}; }, // test hook: current levels
    /* test hooks: every recording (ready, its player's volume, how loud it is at full volume, playing), and how loud the
       recordings playing now are together */
    _loops(){ return LOOPS.map(r=>({name:r.name,ready:!!r.url,url:r.url,vol:+clamp(r.vol/r.ref,0,1).toFixed(4),rms:+r.rms.toFixed(4),playing:r.els.some(e=>!e.paused&&!e.muted),players:r.els.filter(e=>!e.paused).length})); },
    _players:name=>(LOOPS.find(r=>r.name===name)||{els:[]}).els,
    _loopRms(){ let q=0; if(BUFP&&window.__meter) return 0; /* (where a meter listens to the page, buffer players, the score's too, are heard by it already) */ for(const r of LOOPS) if(r.els.some(e=>!e.paused&&!e.muted)){ const v=IOS?1:clamp(r.vol/r.ref,0,1); q+=(r.rms*v)**2; }
      if(SC.el&&!SC.el.paused&&!SC.el.muted&&SC.env){ const k=Math.floor(SC.el.currentTime*10); q+=(SC.env[clamp(k,0,SC.env.length-1)]||0)**2; }   // and the cutscene's, where it has got to
      return Math.sqrt(q); },
    /* the orbit's score: p {sub, pad} its levels (bright is the old filter's opening, not needed by a recording) */
    update(t,p){ if(!p) return; if(p.sub!=null) SUB.want=Math.max(0,p.sub)*.26; if(p.pad!=null) PAD.want=Math.max(0,p.pad)*.045*(muf?.5:1); },
    tick(){ tone(2600*vr(),.02,.01,'square'); },
    click(){ const v=vr(); tone(1200*v,.06,.03,'triangle',600*v); },
    whoosh(up=true,dur=1,g=.2){ noise(dur,g,up?220:2400,up?2400:220,'bandpass',1.1,0,.3); },
    stinger(i=0){ tone(note(8+i),2.4,.045,'sine',0,0,.8,.02); tone(note(10+i)*2,1.6,.015,'sine',0,.08,.8,.02); noise(1.4,.06,500,4000,'bandpass',2,0,.5); },
    swell(){ noise(2,.24,160,3400,'bandpass',1.4,0,.5); tone(146.83,2.6,.05,'sine',293.66,0,.6,.3); tone(220,2.4,.035,'sine',440,.15,.6,.3); },
    boom(){ tone(98,3.6,.5,'sine',22); noise(3,.5,3200,40,'lowpass',.8,0,.4); tone(587,2,.04,'sine',146,0,.9); },
    /* no wind: a phone's speaker plays little of the score's low notes and all of a band of noise, so the wind, always there
       in orbit, was the static heard over everything */
    wind(){ WL.want=WH.want=0; },
    thrust(v){ TH.want=Math.max(0,v||0)*.09; },
    /* the roar eases off as it grows: the live sound went through one compressor with everything else, which held its
       loudest moments down; a recording is made on its own, so that holding back is done here */
    roar(v){ const L=Math.max(0,v||0)*.7; RR.lvl=L/(1+1.2*L); roarMix(); },
    hiss(v){ HS.want=Math.max(0,v||0)*.03; },
    /* the engine's whine: a rising saw, made live (it follows the spool from moment to moment), and only while it sounds */
    whine(v){ if(!ctx) return;
      if(v>.001&&on&&!muted){ if(!n.ten){ n.ten=ctx.createOscillator(); n.ten.type='sawtooth'; n.ten.frequency.value=50+v*800; const tf=ctx.createBiquadFilter(); tf.type='lowpass'; tf.frequency.value=700;
          n.teng=ctx.createGain(); n.teng.gain.value=0; n.ten.connect(tf); tf.connect(n.teng); n.teng.connect(comp); n.ten.start(); }
        set(n.teng.gain,v*.05); set(n.ten.frequency,50+v*800); }
      else if(n.ten){ const t0=ctx.currentTime; n.teng.gain.cancelScheduledValues(t0); n.teng.gain.setTargetAtTime(0,t0,.08); try{ n.ten.stop(t0+.7); }catch(e){} n.ten=null; } },
    /* a station's own air under its screen, so docking never drops you into silence: Kríos a low murmur of voices in a
       room, Aetos the hum of its radar and a slow sweep, Pharos the sea against the rocks, Ogive a hangar's hum and the hiss
       of a vent, Beacon the static and the carrier of a radio mast. id null: the air goes */
    bed(id,t){ const B=BEDS[id], L=B&&BEDL[id];
      for(const k in BEDL) if(BEDL[k]!==L) BEDL[k].want=0;
      if(L){ if(!L.url&&!L.busy) render(L); L.want=L.ref; }
      if(B&&B.ping&&ctx&&on&&!muted&&t>n.bedT){ n.bedT=t+B.ping; tone(B.pf,.5,.01,'sine',B.pf*.92,0,.6); } },
    muffle(v){ muf=!!v; },
    /* every continuous layer to silence: used when crossing between orbit and a station so neither spills into the other */
    hush(){ WL.want=WH.want=TH.want=HS.want=CF.want=CN.want=MUS.want=RAINL.want=BUSK.want=SOLO.want=0; BK.duck=1; RR.lvl=0; roarMix(); this.whine(0); for(const k in BEDL) BEDL[k].want=0; scoreStop(); },
    /* a grain of rock against the hull: a short bright click, placed left or right */
    pebble(p){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, s=shot(); const b=ctx.createBiquadFilter(); b.type='bandpass'; b.frequency.value=2200+Math.random()*3800; b.Q.value=7;
      const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.05+Math.random()*.05,t0+.003); a.gain.exponentialRampToValueAtTime(.0001,t0+.05+Math.random()*.05);
      s.connect(b); b.connect(a); if(ctx.createStereoPanner){ const pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); a.connect(pn); pn.connect(comp); } else a.connect(comp); s.start(t0,Math.random()*8); s.stop(t0+.12); },
    /* a small bird: two or three quick rising notes, placed left or right */
    chirp(p){ if(!on||muted||!ctx) return; const n0=2+Math.floor(Math.random()*2), base=2200+Math.random()*1600; let pn=null;
      if(ctx.createStereoPanner){ pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); pn.connect(comp); const sg=ctx.createGain(); sg.gain.value=.5; pn.connect(sg); sg.connect(revIn); }
      for(let k=0;k<n0;k++){ const t0=ctx.currentTime+k*(.08+Math.random()*.05), o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
        o.frequency.setValueAtTime(base*(1+k*.08),t0); o.frequency.exponentialRampToValueAtTime(base*(1.35+k*.1),t0+.06);
        a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.022,t0+.008); a.gain.exponentialRampToValueAtTime(.0001,t0+.09);
        o.connect(a); a.connect(pn||comp); o.start(t0); o.stop(t0+.12); } },
    /* Earth's weather and nights: rain(v) its level, call it every frame; a cricket now and then in place of a bird; the foghorn */
    rain(v){ RAINL.want=clamp(v||0,0,1); },
    cricket(p){ if(!on||muted||!ctx) return; const f=4300+Math.random()*600, n0=3+Math.floor(Math.random()*3); let pn=null;
      if(ctx.createStereoPanner){ pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); pn.connect(comp); }
      for(let k=0;k<n0;k++){ const t0=ctx.currentTime+k*.052, o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine'; o.frequency.value=f*vr(.01);
        a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.014,t0+.006); a.gain.exponentialRampToValueAtTime(.0001,t0+.035); o.connect(a); a.connect(pn||comp); o.start(t0); o.stop(t0+.05); } },
    foghorn(g=.05){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, a=ctx.createGain(), lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=700; lp.Q.value=.8;
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.3); a.gain.setValueAtTime(g,t0+1.5); a.gain.exponentialRampToValueAtTime(.0001,t0+2.4);
      [[98,1],[147,.55],[196,.3]].forEach(([f,k])=>{ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(f*.96,t0); o.frequency.linearRampToValueAtTime(f,t0+.25); const kg=ctx.createGain(); kg.gain.value=k; o.connect(kg); kg.connect(lp); o.start(t0); o.stop(t0+2.5); });
      lp.connect(a); a.connect(comp); const sg=ctx.createGain(); sg.gain.value=.7; a.connect(sg); sg.connect(revIn); },
    /* ---------- the café on Earth: its door and the bell over it, the barista's voice, the grinder, the tamp, the shot, the
       steam wand, a cup on its saucer. Every one is short and made live; the grinder and the steam are narrow bands of noise that last
       a second or so, never a bed under anything ---------- */
    /* the little shop bell over the door: a few bright strikes as it swings, each fainter */
    cafeBell(g=.026){ if(!on||!ctx) return; const f0=1760*vr(.02);
      [0,.085,.2,.34].forEach((dl,j)=>{ const k=[1,.66,.44,.24][j]; [[1,1,1.1],[2.41,.32,.5],[4.13,.14,.26]].forEach(([m,a,d])=>tone(f0*m*(j%2?1.006:1),d,g*k*a,'sine',0,dl,.35,.003)); }); },
    /* the door: its latch, then a soft creak as it swings open, or a knock against the frame as it shuts; and the bell */
    cafeDoor(open=true){ if(!on||!ctx) return; const v=vr(.05);
      noise(.035,.045,3800*v,2400,'bandpass',2.5); tone(1250*v,.03,.012,'triangle');
      if(open){ const t0=ctx.currentTime+.05, o=ctx.createOscillator(), b=ctx.createBiquadFilter(), a=ctx.createGain(), l=ctx.createOscillator(), lg=ctx.createGain();
        o.type='sawtooth'; o.frequency.setValueAtTime(118*v,t0); o.frequency.linearRampToValueAtTime(92*v,t0+.42); l.frequency.value=23; lg.gain.value=9; l.connect(lg); lg.connect(o.frequency);
        b.type='bandpass'; b.frequency.value=1150; b.Q.value=5; a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.014,t0+.06); a.gain.exponentialRampToValueAtTime(.0001,t0+.46);
        o.connect(b); b.connect(a); a.connect(comp); o.start(t0); l.start(t0); o.stop(t0+.5); l.stop(t0+.5); }
      else { tone(96*v,.22,.07,'sine',58*v); noise(.14,.05,520,120,'lowpass',.9); }
      this.cafeBell(open?.026:.017); },
    /* the barista talking: a few soft syllables on the town's notes (the sense of it is on the screen) */
    murmur(f=540,n=5){ if(!on||!ctx) return; for(let k=0;k<n;k++) tone(inKey(f*(.86+Math.random()*.3)),.075,.014,'triangle',0,k*.088+Math.random()*.02,.15,.006); },
    /* the coffee tamped into the basket and the handle knocked home: two firm, short knocks */
    tamp(){ const v=vr(.05); tone(150*v,.08,.045,'sine',95*v); noise(.04,.03,1600*v,500,'bandpass',1.4); tone(210*v,.06,.03,'triangle',120*v,.28); noise(.03,.025,2200*v,800,'bandpass',1.6,.28); },
    /* the grinder: burrs (a band of noise, chattering with the motor) over the motor spinning up and down */
    grind(dur=1){ if(!on||!ctx) return; const t0=ctx.currentTime, s=shot(), b=ctx.createBiquadFilter(), hp=ctx.createBiquadFilter(), am=ctx.createGain(), a=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain();
      b.type='bandpass'; b.frequency.setValueAtTime(1100,t0); b.frequency.linearRampToValueAtTime(1500,t0+dur*.3); b.Q.value=1.8; hp.type='highpass'; hp.frequency.value=380;
      lfo.frequency.value=31; lg.gain.value=.45; am.gain.value=.55; lfo.connect(lg); lg.connect(am.gain);
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.04,t0+.08); a.gain.setValueAtTime(.04,t0+dur-.15); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      s.connect(b); b.connect(hp); hp.connect(am); am.connect(a); a.connect(comp); s.start(t0,Math.random()*8); s.stop(t0+dur+.05); lfo.start(t0); lfo.stop(t0+dur+.05);
      const o=ctx.createOscillator(), lp=ctx.createBiquadFilter(), og=ctx.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(70,t0); o.frequency.linearRampToValueAtTime(124,t0+.18); o.frequency.setValueAtTime(124,t0+dur-.2); o.frequency.linearRampToValueAtTime(80,t0+dur);
      lp.type='lowpass'; lp.frequency.value=520; og.gain.setValueAtTime(0,t0); og.gain.linearRampToValueAtTime(.022,t0+.1); og.gain.setValueAtTime(.022,t0+dur-.15); og.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      o.connect(lp); lp.connect(og); og.connect(comp); o.start(t0); o.stop(t0+dur+.05); },
    /* the shot running into the cup: small rising bubbles over a quiet trickle */
    pour(dur=1){ if(!on||!ctx) return; for(let t=.04;t<dur;t+=.045+Math.random()*.07){ const f=260+Math.random()*320; tone(f,.05+Math.random()*.04,.011+Math.random()*.009,'sine',f*1.5,t,.15,.004); }
      noise(dur,.011,700,380,'lowpass',.7); },
    /* the steam wand stretching the milk: a filtered hiss, the milk's thin whistle, and a little gurgle at the end */
    steam(dur=.8){ if(!on||!ctx) return; const t0=ctx.currentTime, s=shot(), b=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter(), a=ctx.createGain();
      b.type='bandpass'; b.frequency.setValueAtTime(2600,t0); b.frequency.linearRampToValueAtTime(3600,t0+dur); b.Q.value=1.3; lp.type='lowpass'; lp.frequency.value=6000;
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.026,t0+.07); a.gain.setValueAtTime(.022,t0+dur-.2); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      s.connect(b); b.connect(lp); lp.connect(a); a.connect(comp); s.start(t0,Math.random()*8); s.stop(t0+dur+.05);
      tone(1480,dur*.8,.004,'sine',1320,.1,.2,.1);
      for(let k=0;k<5;k++) tone(170+Math.random()*120,.05,.009,'sine',260,dur*.45+k*.08+Math.random()*.04,0,.004); },
    /* porcelain: a cup touching its saucer or the counter, bright and short */
    clink(g=.026){ const v=vr(.04); tone(2350*v,.22,g,'sine',0,0,.3,.002); tone(3710*v,.14,g*.55,'sine',0,0,.3,.002); tone(5480*v,.07,g*.3,'sine',0,0,0,.001); noise(.02,g*.8,6000,3000,'highpass',.7); },
    /* the cup set down in front of you: the clink and a soft knock of the saucer on the wood */
    cupDown(){ this.clink(.024); tone(150*vr(.05),.09,.028,'sine',95); },
    /* a footstep: 0 a soft brush on grass, 1 a tap on the pavement, 2 a hollow knock on wooden boards */
    step(kind=0){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, s=shot(); const b=ctx.createBiquadFilter();
      if(kind===1){ b.type='bandpass'; b.frequency.value=1500+Math.random()*700; b.Q.value=1.3; } else if(kind===2){ b.type='bandpass'; b.frequency.value=420+Math.random()*120; b.Q.value=2.2; tone(150+Math.random()*30,.09,.03,'sine',90); }
      else { b.type='lowpass'; b.frequency.value=520+Math.random()*380; b.Q.value=.6; }
      const a=ctx.createGain(), g=kind===1?.045:kind===2?.07:.07; a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g+Math.random()*.03,t0+(kind?.004:.012)); a.gain.exponentialRampToValueAtTime(.0001,t0+(kind===1?.07:.16));
      s.connect(b); b.connect(a); a.connect(comp); s.start(t0,Math.random()*8); s.stop(t0+.2); },
    /* a voice while someone talks: a soft blip a little above or below their own pitch */
    voice(f){ if(!on||muted||!ctx) return; tone(inKey(f*(.94+Math.random()*.14)),.06,.016,'triangle',0,0,.15,.004); },
    /* Kríos on Earth, the two sides of a call: a short rising phrase for the rep, a falling one for the buyer, on the town's
       own notes; one phrase each turn, so it is a conversation you can follow, not a murmur */
    phrase(who,g=.012){ if(!on||muted||!ctx) return; const M=who?[67,64,62]:[72,76,79];
      M.forEach((m,i)=>{ const f=440*Math.pow(2,(m-69)/12); tone(f,.5,g*(1-i*.15),'sine',0,i*.13,.45,.01); tone(f*2,.18,g*.18,'sine',0,i*.13,.3,.004); }); },
    /* Earth's music (see MUS above): music(v) sets its level; call it every frame while it should play */
    music(v){ MUS.want=clamp((v||0)/.55,0,1)*BK.duck; },
    /* a cutscene's sound (see SC above): score(cues) makes it (once; a moment's work, out of sight), scoreAt(t) keeps it
       playing in step with the scene's clock (call it every frame of the scene), scoreStop() ends it */
    score(Q){ scoreMake(Q); }, get scoreReady(){ return !!SC.url; },
    scoreAt(t){ const el=SC.el; if(!el) return; el._want=true; if(!on||muted||away){ if(!el.paused) el.pause(); return; }
      if(el.paused){ if(t<SC.len-.2){ try{ el.currentTime=t; }catch(e){} el.play().catch(()=>{}); } }
      else if(Math.abs(el.currentTime-t)>.4){ try{ el.currentTime=t; }catch(e){} } },
    /* where the cutscene's recording has got to, while it is playing; the scene follows it, so a slow frame never parts them */
    scoreClock(){ const el=SC.el; return el&&!el.paused&&!el.seeking&&el.readyState>=3?el.currentTime:null; },
    scoreStop(){ scoreStop(); },
    _score(full){ if(full) return SC.env?Array.from(SC.env,v=>+v.toFixed(4)):null; return SC.el?{t:+SC.el.currentTime.toFixed(2),paused:SC.el.paused,want:!!SC.el._want,rms:+SC.rms.toFixed(4),len:SC.len,ready:!!SC.url,
      lv:+(SC.env[clamp(Math.floor(SC.el.currentTime*10),0,SC.env.length-1)]||0).toFixed(4),peak:+Math.max(...SC.env).toFixed(4)}:{ready:false,busy:SC.busy}; },   // test hook: where it is, how loud there and at its loudest
    /* Diarmuid outside the café (see BUSK above): v his piece's level, s the solo's, k how close you are to him (0 to 1);
       call it every frame on Earth. While he is close the town's music dips under him. On an iPhone, where a recording
       only plays or stops, he plays and the music stops once you are close, and the other way round as you walk off.
       Each new solo starts from its beginning */
    busk(v,s=0,k){ v=clamp(v||0,0,1); s=clamp(s||0,0,1); k=clamp(k??Math.max(v,s),0,1);
      if(s>0&&!BK.s){ for(const el of SOLO.els){ el._on=false; if(!el.paused) el.pause(); } SOLO.cur=0; SOLO.vol=0; BK.done=false; } BK.s=s>0; soloEnd(); if(BK.done) s=0;
      if(IOS){ BK.on=BK.on?k>.25:k>.4; BUSK.want=BK.on&&v>.05?1:0; SOLO.want=BK.on&&s>.05?1:0; BK.duck=BK.on?0:1; return; }
      BUSK.want=v; SOLO.want=s; BK.duck=1-.9*sstep(.25,.85,k); },
    /* how far into his piece and into the solo the recordings are now (seconds, -1 when not sounding), and what he plays,
       so his hands can keep time with what you hear */
    buskAt(){ const p=r=>{ const a=r.els[r.cur]; return a&&a._on&&!a.paused?a.currentTime:-1; }; return {loop:p(BUSK),solo:p(SOLO),score:BKS,done:BK.done}; },
    /* ---------- the cliff on Earth: a bench and a kite. Each sound is short and soft, a tone or a narrow band, never a bed of noise ---------- */
    /* the bench taking your weight: a dry creak of old wood, a slow buzz through the hollow ring of a plank (soft: getting up) */
    creak(soft=false){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, v=vr(.08), d=soft?.24:.4, g=soft?.13:.22;
      const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(46*v,t0); o.frequency.linearRampToValueAtTime(72*v,t0+d*.4); o.frequency.linearRampToValueAtTime(54*v,t0+d);
      const b=ctx.createBiquadFilter(); b.type='bandpass'; b.frequency.value=860*v; b.Q.value=4.5; const a=ctx.createGain();
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.025); a.gain.setValueAtTime(g*.85,t0+d*.55); a.gain.exponentialRampToValueAtTime(.0001,t0+d);
      o.connect(b); b.connect(a); a.connect(comp); o.start(t0); o.stop(t0+d+.05); },
    /* the kite's cloth in the wind: a few quick flaps, low and muffled, quicker and louder the harder it flies (k from 0 to 1);
       p places it left or right */
    flutter(k=.5,p=0){ if(!on||muted||!ctx) return; k=clamp(k,0,1); const t0=ctx.currentTime, n0=2+Math.round(k*3+Math.random()*.8), sp=.062-.024*k, g=(.08+.2*k)*vr(.15);
      const s=shot(), b=ctx.createBiquadFilter(); b.type='bandpass'; b.frequency.value=(380+300*k)*vr(.1); b.Q.value=1.3;
      const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1200; const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); let ti=t0;
      for(let i=0;i<n0;i++){ const gi=g*(1-i/(n0+1)); a.gain.setValueAtTime(0,ti); a.gain.linearRampToValueAtTime(gi,ti+.005); a.gain.exponentialRampToValueAtTime(gi*.03+1e-5,ti+sp*.7); ti+=sp*(.85+Math.random()*.3); }
      let dst=comp; if(ctx.createStereoPanner){ const pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); pn.connect(comp); dst=pn; }
      s.connect(b); b.connect(lp); lp.connect(a); a.connect(dst); s.start(t0,Math.random()*8); s.stop(ti+.05); },
    /* the string pulled taut: a short plucked note in the town's key, higher the harder the pull (k from 0 to 1), over a soft
       low thump; p places it left or right */
    tug(k=.5,p=0){ if(!on||muted||!ctx) return; k=clamp(k,0,1); const t0=ctx.currentTime, f=inKey(220*Math.pow(2,k*1.2)*vr(.03)), g=.014+.022*k; let dst=comp;
      if(ctx.createStereoPanner){ const pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); pn.connect(comp); const sg=ctx.createGain(); sg.gain.value=.2; pn.connect(sg); sg.connect(revIn); dst=pn; }
      [[f,'triangle',.34,g,.004,1],[f*2,'sine',.14,g*.35,.003,1],[105,'sine',.11,g*.9,.006,.65]].forEach(([fr,ty,d,gg,at,dn])=>{ const o=ctx.createOscillator(), a=ctx.createGain(); o.type=ty;
        o.frequency.setValueAtTime(dn<1?fr:fr*1.01,t0); o.frequency.exponentialRampToValueAtTime(fr*dn,t0+(dn<1?d:.04));
        a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(gg,t0+at); a.gain.exponentialRampToValueAtTime(.0001,t0+d); o.connect(a); a.connect(dst); o.start(t0); o.stop(t0+d+.05); }); },
    /* the kite taking the wind: a soft breath rising under three notes climbing in the town's key */
    lift(){ if(!on||muted||!ctx) return; noise(1,.06,240,760,'bandpass',.9,0,.25);
      [392,523.25,659.25].forEach((f,i)=>{ tone(f,1.1,.018,'sine',0,.08+i*.15,.5,.02); tone(f*2,.4,.005,'sine',0,.08+i*.15,.3,.01); }); },
    /* ---------- the workshop on Earth: its roller shutter and its strip lights. Every sound here is a ringing click, a knock
       or a low hum, never a band of noise (on a phone that is static) ---------- */
    /* the shutter's motor: two low saws a fifth apart and an octave, under a soft low pass, coming up to speed; the handle's
       stop() lets it run down (it lets go by itself after six seconds, whatever happens) */
    shutterMotor(open=true,k=1){ if(!on||muted||!ctx) return {stop(){}}; const t0=ctx.currentTime, v=vr(.04), f0=(open?58:52)*v, lp=ctx.createBiquadFilter(), a=ctx.createGain(), os=[], g=.033*k;
      lp.type='lowpass'; lp.frequency.value=400; lp.Q.value=1.1; a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.2); a.gain.setValueAtTime(g,t0+5.5); a.gain.linearRampToValueAtTime(0,t0+6);
      lp.connect(a); a.connect(comp);
      [[1,1],[1.5,.4],[2,.22]].forEach(([m,k])=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(f0*m*.8,t0); o.frequency.linearRampToValueAtTime(f0*m,t0+.35); g.gain.value=k; o.connect(g); g.connect(lp); o.start(t0); o.stop(t0+6.1); os.push(o); });
      let done=false; return {stop(){ if(done) return; done=true; const t=ctx.currentTime; a.gain.cancelScheduledValues(t); a.gain.setValueAtTime(a.gain.value,t); a.gain.linearRampToValueAtTime(0,t+.18);
        os.forEach(o=>{ o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(o.frequency.value,t); o.frequency.linearRampToValueAtTime(o.frequency.value*.75,t+.18); try{ o.stop(t+.25); }catch(e){} }); }}; },
    /* a slat going over the drum: a short ringing click and a little knock, then the pawl's two lighter ticks before the next
       one (gap: seconds to the next slat) */
    ratchet(gap=.18,k=1){ if(!on||muted||!ctx) return; const f=1850*vr(.09); tone(f,.035,.03*k,'sine',0,0,0,.001); tone(f*2.76,.02,.012*k,'sine',0,0,0,.001); tone(210*vr(.1),.05,.026*k,'triangle',120,0,0,.002);
      const g=clamp(gap,.04,.4); [1/3,2/3].forEach(q=>tone(3300*vr(.06),.012,.008*k,'sine',0,g*q,0,.001)); },
    /* the shutter at the end of its run: a clank up in the drum, or the bottom rail landing on the floor and a last rattle */
    shutterEnd(open=true,k=1){ if(!on||muted||!ctx) return; const v=vr(.04);
      if(open){ tone(620*v,.18,.026*k,'sine',0,0,.15,.002); tone(1490*v,.1,.01*k,'sine',0,0,0,.001); tone(95,.16,.034*k,'sine',60); }
      else { tone(110*v,.22,.05*k,'sine',55); tone(240*v,.08,.024*k,'triangle',140); [.06,.11,.15].forEach((d,i)=>tone(1500*vr(.1),.03,.012*k*(1-i*.25),'sine',0,d,0,.001)); } },
    /* a strip light catching: the starter's bright tink and the tube's short buzz (k: how strongly) */
    tube(k=1){ if(!on||muted||!ctx) return; const v=vr(.08); tone(3150*v,.02,.016*k,'sine',0,0,0,.001); tone(4700*v,.012,.006*k,'sine',0,0,0,.001);
      const t0=ctx.currentTime, o=ctx.createOscillator(), b=ctx.createBiquadFilter(), a=ctx.createGain(); o.type='sawtooth'; o.frequency.value=100; b.type='bandpass'; b.frequency.value=720; b.Q.value=2.2;
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.02*k,t0+.008); a.gain.exponentialRampToValueAtTime(.0001,t0+.09); o.connect(b); b.connect(a); a.connect(comp); o.start(t0); o.stop(t0+.12); },
    /* ---------- the workshop's test fire: the button, the warning, the coughs, the roar, and after it the smoke alarm.
       As with the shutter, kept to clicks, knocks and tones; the coughs and the roar are noise, but low and dark (a phone
       plays a bright band of noise as static), and the roar is no more than twice as loud as the shutter's motor ---------- */
    /* the big red button going down: a chunky click and the knock of its plunger */
    tfClick(){ if(!on||muted||!ctx) return; const v=vr(.05); tfT(1400*v,.025,.016,'sine',0,0,.001); tfT(190*v,.08,.03,'triangle',95*v,0,.002); tfN(.03,.012,2600,1800,'bandpass',2); },
    /* the warning: a soft two-tone beep, the second one higher */
    tfBeep(hi=false){ if(!on||muted||!ctx) return; const f=hi?1175:880; tfT(f,.2,.02,'triangle',0,0,.006); tfT(f*2,.14,.005,'sine',0,0,.006); },
    /* a cough as it tries to light: a dull pop, a thump under it (k: how big) */
    tfPop(k=1){ if(!on||muted||!ctx) return; const v=vr(.08); tfN(.24,.06*k,1500*v,130,'lowpass',.8); tfT(88*v,.22,.06*k,'sine',40); tfN(.08,.02*k,700*v,450,'bandpass',1.2); },
    /* the roar: two bands of low noise and a deep growl a fifth apart under a low pass that opens with the thrust, fluttering
       a little. set(v) is how hard it burns (0 to 1); stop() lets it die away in a third of a second (it lets go by itself
       after nine seconds, whatever happens) */
    tfRoar(k=1){ if(!on||muted||!ctx) return {set(){},stop(){}}; const t0=ctx.currentTime, env=ctx.createGain(), body=ctx.createGain(), lp=ctx.createBiquadFilter(), lp2=ctx.createBiquadFilter(), src=[], g=.2*k;
      env.gain.setValueAtTime(0,t0); env.gain.setValueAtTime(0,t0+8.6); env.gain.linearRampToValueAtTime(0,t0+9); env.connect(tfBus());
      lp.type='lowpass'; lp.frequency.value=420; lp.Q.value=.6; lp2.type='lowpass'; lp2.frequency.value=1100; lp2.Q.value=.5; lp.connect(lp2); lp2.connect(body); body.gain.value=.84; body.connect(env);
      { const s=shot(); s.connect(lp); src.push(s); }
      { const s=shot(), b=ctx.createBiquadFilter(), a=ctx.createGain(); b.type='bandpass'; b.frequency.value=120; b.Q.value=1.1; a.gain.value=1.4; s.connect(b); b.connect(a); a.connect(body); src.push(s); }
      { const l=ctx.createBiquadFilter(), a=ctx.createGain(); l.type='lowpass'; l.frequency.value=240; a.gain.value=.16; l.connect(a); a.connect(body);
        [[47,1],[70.5,.6]].forEach(([f,m])=>{ const o=ctx.createOscillator(), q=ctx.createGain(); o.type='sawtooth'; o.frequency.value=f*vr(.02); q.gain.value=m; o.connect(q); q.connect(l); src.push(o); }); }
      [[7.3,.07],[11.9,.05]].forEach(([f,m])=>{ const o=ctx.createOscillator(), q=ctx.createGain(); o.frequency.value=f; q.gain.value=m; o.connect(q); q.connect(body.gain); src.push(o); });   // the flutter
      src.forEach(s=>{ if(s.buffer) s.start(t0,Math.random()*8); else s.start(t0); s.stop(t0+9.1); });
      /* (where it is now is held where the browser can (an automated gain's value can read as where it started), else
         taken as where it was last sent) */
      let done=false, cur=0; const hold=(p,t,v)=>{ if(p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(v,t); } };
      return {set(x){ if(done) return; const t=ctx.currentTime, c=clamp(x,0,1); hold(env.gain,t,cur); cur=g*c; env.gain.setTargetAtTime(cur,t,.06); env.gain.setValueAtTime(cur,t+8.4); env.gain.linearRampToValueAtTime(0,t+8.6);
          lp.frequency.setTargetAtTime(240+560*c,t,.08); },
        stop(){ if(done) return; done=true; const t=ctx.currentTime; hold(env.gain,t,cur); env.gain.linearRampToValueAtTime(0,t+.32);
          lp.frequency.setTargetAtTime(160,t,.1); src.forEach(s=>{ try{ s.stop(t+.4); }catch(e){} }); }}; },
    /* the smoke alarm's chirp: its piezo, short and high */
    tfChirp(){ if(!on||muted||!ctx) return; tfT(3250,.075,.014,'triangle',0,0,.003); tfT(3250,.07,.012,'sine',0,0,.003); },
    /* a book landing on the concrete: a slap, a low knock and a smaller one as it settles */
    tfThud(){ if(!on||muted||!ctx) return; const v=vr(.06); tfN(.06,.022,1500*v,350,'lowpass',.8); tfT(132*v,.14,.032,'sine',64); tfT(150*v,.08,.012,'sine',80,.085); tfN(.04,.008,1200*v,300,'lowpass',.8,.085); },
    /* the bell ticking as it cools */
    tfTink(){ if(!on||muted||!ctx) return; const f=2900*vr(.12); tfT(f,.06,.007,'sine',0,0,.001); tfT(f*2.71,.03,.0025,'sine',0,0,.001); },
    /* walking out mid-fire: everything of it fades out in a few hundredths of a second */
    tfHush(){ if(!ctx||!n.tf) return; const b=n.tf, t=ctx.currentTime; n.tf=null; b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value,t); b.gain.linearRampToValueAtTime(0,t+.06); setTimeout(()=>{ try{ b.disconnect(); }catch(e){} },300); },
    /* a station going past at speed, on the side it passes */
    passby(p,g){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, s=shot(); const b=ctx.createBiquadFilter(); b.type='bandpass'; b.Q.value=1.4;
      b.frequency.setValueAtTime(1900,t0); b.frequency.exponentialRampToValueAtTime(320,t0+.9); const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.18); a.gain.exponentialRampToValueAtTime(.0001,t0+1.1);
      s.connect(b); b.connect(a); if(ctx.createStereoPanner){ const pn=ctx.createStereoPanner(); pn.pan.setValueAtTime(clamp(p,-1,1),t0); pn.pan.linearRampToValueAtTime(clamp(-p*.6,-1,1),t0+1.); a.connect(pn); pn.connect(comp); const sg=ctx.createGain(); sg.gain.value=.4; pn.connect(sg); sg.connect(revIn); } else a.connect(comp); s.start(t0,Math.random()*8); s.stop(t0+1.2); },
    /* a station calling you: a bell at its own beacon note, placed on the side where it is */
    call(i,p,g=.05){ if(!on||muted||!ctx) return; const f=note(i), t0=ctx.currentTime; let pn=null;
      if(ctx.createStereoPanner){ pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); pn.connect(comp); const sg=ctx.createGain(); sg.gain.value=.9; pn.connect(sg); sg.connect(revIn); }
      [[1,1,1.8],[2.003,.32,1],[3.01,.1,.55]].forEach(([m,k,d])=>{ const o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine'; o.frequency.value=f*m;
        a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g*k,t0+.01); a.gain.exponentialRampToValueAtTime(.0001,t0+d); o.connect(a); a.connect(pn||comp); o.start(t0); o.stop(t0+d+.05); }); },
    /* the unidentified contact inside the horizon: a low, slow pulse you feel as much as hear, and a moment after it
       the thin return of a radar finding it. Placed on the side where the hole is; the only call in the system */
    contactBed(g,near=0){ const k=clamp(near,0,1); g=Math.max(0,g||0); CF.want=g*Math.cos(k*Math.PI/2); CN.want=g*Math.sin(k*Math.PI/2); },
    contact(p,g=.05,pf=1){ if(!on||muted||!ctx) return; const t0=ctx.currentTime; let pn=null;
      if(ctx.createStereoPanner){ pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); pn.connect(comp); const sg=ctx.createGain(); sg.gain.value=.85; pn.connect(sg); sg.connect(revIn); }
      const dst=pn||comp;
      { const o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(note(0)/2*pf,t0); o.frequency.exponentialRampToValueAtTime(note(-3)/2*pf,t0+.55);
        a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g*1.9,t0+.035); a.gain.exponentialRampToValueAtTime(.0001,t0+.8); o.connect(a); a.connect(dst); o.start(t0); o.stop(t0+.85); }
      { const s=shot(); const b=ctx.createBiquadFilter(); b.type='lowpass'; b.frequency.setValueAtTime(420,t0); b.frequency.exponentialRampToValueAtTime(90,t0+.5);
        const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g*.7,t0+.02); a.gain.exponentialRampToValueAtTime(.0001,t0+.5); s.connect(b); b.connect(a); a.connect(dst); s.start(t0,Math.random()*8); s.stop(t0+.55); }
      const t1=t0+.16, f=note(15)*pf;
      [[1,1,1.3],[2.003,.22,.6]].forEach(([m,k,d])=>{ const o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(f*m,t1); o.frequency.exponentialRampToValueAtTime(f*m*.985,t1+d);
        a.gain.setValueAtTime(0,t1); a.gain.linearRampToValueAtTime(g*.3*k,t1+.006); a.gain.exponentialRampToValueAtTime(.0001,t1+d); o.connect(a); a.connect(dst); o.start(t1); o.stop(t1+d+.05); }); },
    /* a radar locking on: two quick returns and a falling sweep, from the side the radar is on */
    lock(p=0,g=.05){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, pf=.95+Math.random()*.1; let pn=null;
      if(ctx.createStereoPanner){ pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); pn.connect(comp); const sg=ctx.createGain(); sg.gain.value=.7; pn.connect(sg); sg.connect(revIn); }
      [0,.15].forEach((dl,j)=>{ const o=ctx.createOscillator(), a=ctx.createGain(), t=t0+dl, f=note(16+j*2)*pf; o.type='sine'; o.frequency.setValueAtTime(f,t);
        a.gain.setValueAtTime(0,t); a.gain.linearRampToValueAtTime(g*(j?.8:1),t+.006); a.gain.exponentialRampToValueAtTime(.0001,t+.5); o.connect(a); a.connect(pn||comp); o.start(t); o.stop(t+.55); });
      const s=shot(); const b=ctx.createBiquadFilter(); b.type='bandpass'; b.Q.value=6; b.frequency.setValueAtTime(3600,t0+.3); b.frequency.exponentialRampToValueAtTime(700,t0+1.1);
      const a=ctx.createGain(); a.gain.setValueAtTime(0,t0+.3); a.gain.linearRampToValueAtTime(g*.5,t0+.36); a.gain.exponentialRampToValueAtTime(.0001,t0+1.15); s.connect(b); b.connect(a); a.connect(pn||comp); s.start(t0+.3,Math.random()); s.stop(t0+1.2); },
    /* the orbit's bed running down like a tape stopping, while it fades: the way out of one world into the next */
    tapeStop(d=2){ const t0=performance.now(), rs=[PAD,CF,CN]; const iv=setInterval(()=>{ const k=(performance.now()-t0)/1000;
      if(k>d+1.5){ rs.forEach(r=>r.rate=1); clearInterval(iv); return; } const rt=k<d?1-.5*k/d:.5; rs.forEach(r=>r.rate=rt); },40); },
    /* the seal breaking: a glassy snap, then the pieces falling away */
    crack(){ noise(.35,.32,7000,1400,'highpass',.7,0,.5); noise(1.8,.28,1600,50,'lowpass',.9,.03,.6); tone(1760,1.1,.03,'triangle',820,0,.8); tone(2637,.8,.018,'sine',1240,.05,.8); },
    /* the last flight. The hatch: a heavy seal shutting */
    clunk(){ const v=vr(.06); tone(62*v,.5,.22,'sine',38*v); noise(.18,.2,900*v,120,'lowpass',1.2); tone(180*v,.12,.05,'triangle',90*v,.02); },
    /* a clock in the wait: dry, a little louder and brighter each time */
    tock(k=0){ const g=.05+.012*k; noise(.05,g,4200+k*160,2600,'bandpass',5,0,.35); tone(k%2?1180:1420,.05,g*.35,'triangle',0,0,.25); },
    /* a heartbeat: two soft low knocks */
    beat(v=1){ tone(54,.2,.2*v,'sine',38); tone(50,.22,.14*v,'sine',36,.17); },
    /* ignition: a deep hit, a tearing roar, crackle */
    ignite(){ tone(46,4.2,.3,'sine',24); noise(3.6,.27,2600,60,'lowpass',.7,0,.35); noise(1.4,.13,7000,1800,'highpass',.6,.05,.3); tone(92,2.4,.09,'sawtooth',40,0,.2); },
    /* steam venting from the base before launch: a soft hiss, from the side it comes out of */
    vent(p=0){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, s=shot(); const b=ctx.createBiquadFilter(); b.type='highpass'; b.frequency.setValueAtTime(5200,t0); b.frequency.exponentialRampToValueAtTime(2600,t0+.6);
      const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.032,t0+.06); a.gain.exponentialRampToValueAtTime(.0001,t0+.7);
      s.connect(b); b.connect(a); if(ctx.createStereoPanner){ const pn=ctx.createStereoPanner(); pn.pan.value=clamp(p,-1,1); a.connect(pn); pn.connect(comp); } else a.connect(comp); s.start(t0,Math.random()*8); s.stop(t0+.8); },
    /* the engine's crackle: one short rough burst; called many times a second while it burns in thick air */
    crackle(g=.04){ if(!on||muted||!ctx) return; const t0=ctx.currentTime, s=shot(); const b=ctx.createBiquadFilter(); b.type='bandpass'; b.frequency.value=900+Math.random()*2400; b.Q.value=1.6;
      const a=ctx.createGain(), d=.02+Math.random()*.05; a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.003); a.gain.exponentialRampToValueAtTime(.0001,t0+d);
      s.connect(b); b.connect(a); if(ctx.createStereoPanner){ const pn=ctx.createStereoPanner(); pn.pan.value=Math.random()*.8-.4; a.connect(pn); pn.connect(comp); } else a.connect(comp); s.start(t0,Math.random()*8); s.stop(t0+d+.02); },
    /* the roar's colour: open and rough at full thrust in thick air, dull and far as the air thins */
    roarTone(f=380){ RR.x=clamp((f-300)/600,0,1); roarMix(); },
    /* leaving the pad: a long low push under everything */
    liftoff(){ tone(36,3,.22,'sine',24); noise(2.4,.16,1100,140,'lowpass',.8,0,.3); },
    /* the bottom of the well: a long falling tone, as if time were slowing */
    stretch(){ tone(220,7,.05,'sine',55,0,.8,.8); tone(330,7,.025,'sine',82,.2,.8,.8); },
    /* paper burning away: a soft long crackle */
    burn(){ for(let k=0;k<14;k++) noise(.12+Math.random()*.2,.03+Math.random()*.04,2400+Math.random()*3000,900,'bandpass',3,k*.22+Math.random()*.15,.3); noise(3.2,.05,600,2200,'bandpass',.8,0,.4); },
    /* the light taking over at the end of the last flight: a rush of air rising, and under it a bright, open chord in the
       score's key that swells as the screen whitens and holds on into the white page */
    dawn(){ if(!on||muted||!ctx) return; noise(3.2,.1,300,5200,'bandpass',.7,0,.7);
      [[note(5),.034],[note(10),.03],[note(13),.022],[note(11),.016],[note(15),.012]].forEach(([f,g],i)=>tone(f,5.8,g,'sine',0,.15+i*.12,.8,1.9)); },
    /* the credits: a few slow notes over the pad, in the score's own key */
    credits(){ [[0,0],[2,1.6],[4,3.2],[7,4.8],[5,6.4],[4,8.6],[2,10.2],[4,11.8],[0,14.4],[7,16.8],[9,18.4],[7,20.6]].forEach(([n,d])=>{ this.chime(10+n,d,.05); }); },
    /* the seal straining before it goes: a low groan that rises */
    strain(){ tone(55,1,.16,'sawtooth',110,0,.4,.6); noise(1,.12,120,900,'bandpass',2,0,.4); },
    chime(i,delay=0,g=.055){ const f=note(i); tone(f,1.2,g,'sine',0,delay,.6); tone(f*2,.5,g*.3,'sine',0,delay,.6); },
    chord(){ [0,2,4,7].forEach((k,j)=>this.chime(10+k,j*.07)); },
    buzz(){ const v=vr(.05); tone(92*v,.3,.11,'sawtooth',60*v); noise(.22,.12,900*v,200); },
    pop(){ const v=vr(.07); noise(.45,.3,2400*v,80); tone(170*v,.4,.09,'triangle',50*v); },
    alarm(){ tone(330,.3,.06,'square'); tone(262,.3,.06,'square',0,.17); },
    ping(f=1318,g=.045){ tone(f,1.4,g,'sine',0,0,.6); },
    blip(){ tone(1760*vr(.03),.08,.035,'square'); },
    launch(){ noise(1.1,.32,200,2600,'bandpass',.9,0,.2); },
    jam(){ tone(90,1.4,.18,'sine',38); tone(180,1.1,.04,'square',60); noise(.9,.14,600,90); },
    beep(f=880){ tone(f*vr(.015),.07,.035,'square'); },
    dock(){ const v=vr(.03); tone(587*v,.7,.06,'sine',0,0,.5); tone(880*v,1,.05,'sine',0,.12,.5); },
    key(){ tone(1800+Math.random()*900,.025,.01,'triangle'); },
  };
})();
function sndUI(){}
/* browsers only let audio start from a click, tap or key. A scroll can begin the experience silently; the first
   gesture after that brings the sound in */
['pointerdown','keydown','touchend'].forEach(ev=>addEventListener(ev,()=>{ if(A.on&&A.ctx&&A.ctx.state!=='running') A.start(); },{capture:true,passive:true}));

/* ---------- renderer ---------- */
const canvas=$('#gl');
/* every shader compiled on this page takes pow() of a number never below zero. pow() of a negative number is not a number on
   Windows (where the browser draws through Direct3D) and on many phones' graphics chips, and there the checks that would
   catch it are compiled away: one such pixel spreads through the glow into black squares across the screen */
{ const DEF='#define pow(a,b) pow(max(a,0.),b)\n';
  for(const C of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){ const P=C&&C.prototype; if(!P||P.__safePow) continue;
    const ss=P.shaderSource; P.shaderSource=function(sh,src){ if(typeof src==='string'&&src.indexOf('#define pow(')<0){ const m=src.match(/^\s*#version[^\n]*\n/); src=m?m[0]+DEF+src.slice(m[0].length):DEF+src; } return ss.call(this,sh,src); };
    P.__safePow=true; } }
let renderer; try{ renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'}); }catch(e){ noGL(); }
const DPRMAX=Math.min(devicePixelRatio||1, Q<1?1.5:1.6);
let DPR=window.__TEST?1:DPRMAX;
renderer.setPixelRatio(DPR); renderer.setClearColor(0,1);
const hubCam=new T.PerspectiveCamera(36,1,.1,900), stCam=new T.PerspectiveCamera(36,1,.1,900);
const ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
const G={uTime:{value:0},uPx:{value:800},uMouse:{value:new T.Vector2(9,9)},uAspect:{value:1}};
/* whether this browser really draws into the kind of picture the page is made in: half-float, its edges smoothed by a few
   samples. Checked once at the start by drawing red into a small one and reading it back through a plain one. Where the
   smoothing fails (Safari on a Mac can draw such a picture black) the page is made without it; where half-float fails
   too, the page shows its plain version rather than a black screen */
function rtWorks(samples){ let a,b,m1,m2,g; try{ const gl=renderer.getContext(); for(let k=0;k<8&&gl.getError()!==gl.NO_ERROR;k++){}
    a=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,samples}); b=new T.WebGLRenderTarget(4,4,{type:T.UnsignedByteType});
    const cc=new T.Color(), ca=renderer.getClearAlpha(); renderer.getClearColor(cc); renderer.setClearColor(0x000000,1);
    const cam=new T.OrthographicCamera(-1,1,1,-1,0,1); g=new T.PlaneGeometry(2,2);
    m1=new T.MeshBasicMaterial({color:0xff0000,depthTest:false,depthWrite:false}); m2=new T.MeshBasicMaterial({map:a.texture,depthTest:false,depthWrite:false});
    const s1=new T.Scene(), s2=new T.Scene(); s1.add(new T.Mesh(g,m1)); s2.add(new T.Mesh(g,m2));
    renderer.setRenderTarget(a); renderer.render(s1,cam); renderer.setRenderTarget(b); renderer.render(s2,cam);
    const px=new Uint8Array(4); renderer.readRenderTargetPixels(b,1,1,1,1,px); renderer.setRenderTarget(null); renderer.setClearColor(cc,ca);
    return px[0]>180&&px[1]<80&&px[2]<80&&gl.getError()===gl.NO_ERROR; }
  catch(e){ return false; } finally{ try{ renderer.setRenderTarget(null); a&&a.dispose(); b&&b.dispose(); m1&&m1.dispose(); m2&&m2.dispose(); g&&g.dispose(); }catch(e){} } }
let RTS=Q<1?0:2;   // how many samples a full-screen target smooths its edges with (the frame timer can take it to none)
if(RTS>0&&!rtWorks(RTS)) RTS=0;
if(!rtWorks(0)) noGL();
const mkRT=()=>new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter,samples:RTS});
const rtA=mkRT(), rtB=mkRT();
/* the full-screen targets are the biggest things on the graphics card. Orbit draws into one, a station into the other,
   and only a doorway between them needs both; so each is held only while it is being drawn and given back the moment it
   is not, and a phone or a laptop never carries one it is not using. One that is needed again is made full size before
   anything is drawn into it, so the picture never knows (the trace of the hole likewise, while a station has the screen).
   A station that draws itself (Earth inks its own lines, smoothing its edges as it goes) hands over a finished picture
   that covers the screen; its target needs no smoothing of its own, which on a laptop is a large saving */
const RTL=new Map();
function rtLive(rt,on,t,smp){ if(on){ RTL.set(rt,t); if(smp!==undefined&&rt.samples!==smp){ rt.samples=smp; rt.dispose(); }
    const W=Math.max(1,Math.floor(innerWidth*DPR)), H=Math.max(1,Math.floor(innerHeight*DPR)); if(rt.width!==W||rt.height!==H) rt.setSize(W,H); }
  else if(rt.width>1) rt.setSize(1,1); }   // (what is needed only ever changes one way through a doorway, so there is nothing to wait for)
function bhLive(on,t){ if(on){ RTL.set(BH,t); if(BH.rt.width<=2) BH.resize(); } else if(BH.rt.width>2) BH.rt.setSize(1,1); }
const post=new T.ShaderMaterial({
  uniforms:{tA:{value:rtA.texture},tB:{value:rtB.texture},uIris:{value:0},uIC:{value:new T.Vector2(.5,.5)},uIrisCol:{value:new T.Color('#FFC392')},
    uAspect:G.uAspect,uTime:G.uTime,uWarp:{value:0},uFlash:{value:0},uStretch:{value:0},uSC:{value:new T.Vector2(.5,.5)},
    uTint:{value:new T.Color(0,0,0)},uCA:{value:0},uGrade:{value:new T.Color(1,1,1)},uVig:{value:1},uExpo:{value:1},uBloom:{value:1},uFlat:{value:0},uBurn:{value:0},uLight:{value:new T.Vector3(.5,.5,0)}},
  vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`uniform sampler2D tA,tB; uniform float uIris,uAspect,uTime,uWarp,uFlash,uStretch,uCA,uVig,uExpo,uBloom,uFlat,uBurn; uniform vec2 uIC,uSC; uniform vec3 uIrisCol,uTint,uGrade,uLight; varying vec2 vUv;
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
    if(uBurn>0.){ // the drawn world burning away like paper, from glowing edges, onto the real space behind it
      vec2 bq=vUv*vec2(uAspect,1.); float n=vn(bq*2.6+3.1)*.55+vn(bq*7.3)*.28+vn(bq*23.)*.17; n=mix(n,length((vUv-.5)*vec2(uAspect,1.))*.9+.05,.35);
      m=smoothstep(uBurn-.035,uBurn+.01,n); rim=smoothstep(.05,0.,abs(n-uBurn))*step(.001,uBurn)*(1.-step(1.,uBurn))*1.6; }
    else if(uIris>2.5) m=1.;
    else if(uIris>0.){ vec2 q=(vUv-uIC)*vec2(uAspect,1.); float d=length(q); vec2 dir=q/max(d,1e-4);
      float n=vn(dir*2.2+vec2(uTime*.5,uTime*.3))*.6+vn(vUv*7.+uTime*.7)*.4; float R=uIris*(1.+.2*(n-.5));
      m=smoothstep(R+.01,R-.05,d); rim=smoothstep(.03,0.,abs(d-R))*(1.-smoothstep(1.2,2.,uIris)); }
    vec3 a=vec3(0.), b=vec3(0.);
    if(m<1.){ if(uWarp>.001){ vec3 s=vec3(0.); for(int i=0;i<6;i++){ float f=float(i)/5.; s+=lookA(mix(uv,uIC,f*uWarp*.3),ca); } a=s/6.; } else a=lookA(uv,ca); }
    if(m>0.) b=lookB(uv,ca);
    vec3 c=mix(a,b,m)*uExpo+uIrisCol*rim*.9;
    float fl=uBurn>0.?uFlat*m:uFlat;
    c=mix(pow(aces(c*1.05),vec3(.96)),clamp(c,0.,1.),fl); // uFlat: a daylit scene authored in display colour skips the film curve
    c=mix(c,c*vec3(1.35,.5,.42),uStretch);
    c*=uGrade;
    float v=smoothstep(1.3,.3,length((vUv-.5)*vec2(uAspect,1.))*uVig); c*=mix(.5+.38*fl,1.,v);
    c+=uTint;
    c+=(hash(vUv*vec2(1920.,1080.)+fract(uTime))-.5)*.03;
    c=mix(c,vec3(1.,.98,.95),clamp(uFlash,0.,1.));
    if(uLight.z>0.){ /* the end of the last flight: the light takes over from the rocket outward. The brightest things burn
                        out first, a glow opens round the rocket and spreads until the picture is the white of the page */
      float k=clamp(uLight.z,0.,1.), d=length((vUv-uLight.xy)*vec2(uAspect,1.));
      c=min(c*(1.+3.2*k*k),vec3(1.)); c=mix(c,vec3(1.),k*k*k*.55);
      c+=vec3(1.)*k*exp(-d*d/(.006+.35*k*k));
      float R=k*k*2.5-.15; c=mix(c,vec3(1.),smoothstep(R+.06,R-.5,d));
      c=mix(c,vec3(1.),smoothstep(.88,1.,k)); }
    gl_FragColor=vec4(max(c,0.),1.);
  }`, depthTest:false, depthWrite:false});
const postScene=new T.Scene(); const pq=new T.Mesh(new T.PlaneGeometry(2,2),post); pq.frustumCulled=false; postScene.add(pq);
function setPx(cam){ G.uPx.value=innerHeight*DPR/(2*Math.tan(cam.fov*Math.PI/360)); }
function resize(){ const w=innerWidth,h=innerHeight; renderer.setPixelRatio(DPR); renderer.setSize(w,h,false);
  [hubCam,stCam].forEach(c=>{c.aspect=w/h;c.updateProjectionMatrix();});
  for(const rt of [rtA,rtB]) if(rt.width>1) rt.setSize(Math.floor(w*DPR),Math.floor(h*DPR)); G.uAspect.value=w/h; if(BH.rt.width>2) BH.resize(); }   // (one given back stays so)
addEventListener('resize',()=>{ resize(); if(window.__onResize) window.__onResize(); });

/* adaptive quality: when frames are steadily slow, one step down a ladder (smoothing off, then the black hole's trace
   coarser, then fewer pixels); when they are steadily quick, one step back up. It reads the middle of the last second, so
   one slow frame, a hitch, or the long gap after the tab was away counts for nothing; while the sound is being made at
   the start only a really slow device steps down; it comes back up on an ordinary 60 Hz screen; and a step it has had to leave twice soon
   after reaching it is not tried again */
const QM={buf:[],cool:0,lv:null,i:0,up:0,bad:{},
  tick(ms,now){ if(window.__TEST) return;
    if(!this.lv){ const L=[], bh0=BH.scale; let r=RTS, b=bh0, d=DPR; L.push([r,b,d]); if(r>0){ r=0; L.push([r,b,d]); }
      while(b>.321){ b=+(b-.1).toFixed(2); L.push([r,b,d]); } while(d>.751){ d=Math.max(.75,+(d-.25).toFixed(2)); L.push([r,b,d]); } this.lv=L; this.i=0; this.r0=RTS; }
    if(ms>250||document.hidden){ this.buf.length=0; this.cool=Math.max(this.cool,now+1500); return; }
    const busy=A.busy;   // while the sound is being made only a really slow device steps down, and nothing steps up
    this.buf.push(ms); if(this.buf.length>60) this.buf.shift(); if(now<this.cool||this.buf.length<60) return;
    const s=this.buf.slice().sort((a,b)=>a-b), mid=s[30], p75=s[45];
    const go=i=>{ const [r,b,d]=this.lv[i]; this.i=i; this.buf=[];
      if(r!==RTS){ RTS=r; rtA.samples=rtB.samples=r; rtA.dispose(); rtB.dispose(); }
      if(Math.abs(b-BH.scale)>.001){ BH.scale=b; BH.resize(); } if(Math.abs(d-DPR)>.001){ DPR=d; resize(); } };
    if(mid>(busy?40:22)&&this.i<this.lv.length-1){ if(now-this.up<12000) this.bad[this.i]=(this.bad[this.i]||0)+1; go(this.i+1); this.cool=now+2500; }
    else if(!busy&&this.i>0&&p75<18.5&&(this.bad[this.i-1]||0)<2){ go(this.i-1); this.up=now; this.cool=now+5000; } }};

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
  return new T.ShaderMaterial({uniforms:{uC:{value:new T.Color(color)},uE:{value:o.emit??0},uRim:{value:o.rim??.9},uKey:{value:new T.Vector3(0,0,0)},uKeyCol:{value:new T.Color(o.key||'#FFC392')},uFall:{value:o.fall??0},uAmb:{value:o.amb??.06},uOp:{value:o.op??1}},
    vertexShader:`varying vec3 vN; varying vec3 vW; varying vec3 vIC; void main(){ vec4 p=vec4(position,1.); vec3 nn=normal; vIC=vec3(1.);
      #ifdef USE_INSTANCING
        p=instanceMatrix*p; nn=mat3(instanceMatrix)*nn;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vIC=instanceColor;
      #endif
      vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(mat3(modelMatrix)*nn); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uC,uKey,uKeyCol; uniform float uE,uRim,uAmb,uOp,uFall; varying vec3 vN; varying vec3 vW; varying vec3 vIC; void main(){
      vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW); vec3 L=normalize(uKey-vW); float d=max(dot(n,L),0.)*mix(1.,pow(12./(distance(uKey,vW)+3.),.7),uFall);
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
function where(t){} // the screen says where you are; no label needed

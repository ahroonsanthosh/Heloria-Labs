(()=>{
'use strict';
const DATA={};
/* ================= CORE ================= */
const PHOTOS = ["../assets/img/ahroon.webp?v=f12e410264", "../assets/img/michael.webp?v=f21826f8f3", "../assets/img/abraham.webp?v=2dece95d7a"];
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
    try{ if(navigator.audioSession&&navigator.audioSession.type!=='playback') navigator.audioSession.type='playback'; }catch(e){}   // Safari: play like media, set before the sound starts (changing it mid-play interrupts it)
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
  const player=r=>{ const el=new Audio(); el.preload='auto'; el.src=r.url; el._on=false; el._primed=false;
    try{ el.preservesPitch=false; el.mozPreservesPitch=false; el.webkitPreservesPitch=false; }catch(e){}   // so a slower rate is a lower pitch, as on tape
    el.addEventListener('ended',()=>{ el._on=false; }); return el; };
  function render(r,next){ const fin=()=>{ r.busy=false; if(next) setTimeout(next,120); };
    if(!OAC||r.url||r.busy) return fin(); r.busy=true;
    const sr=r.sr, R=Math.round(sr*r.R), P=Math.round(sr*r.P), H=Math.round(sr*r.H), N=P+H; let oc;
    try{ oc=new OAC(1,R+N,sr); r.make(oc,r.R); }catch(e){ console.warn('sound',r.name,e); return fin(); }
    const done=b=>{ const d=b.getChannelData(0);
      if(r.fade) for(let i=0;i<H;i++){ const k=i/H*Math.PI/2; d[R+i]*=Math.sin(k); d[R+P+i]*=Math.cos(k); }   // in at the top, out over the overlap
      const w=wav(d,R,N,sr); r.url=w.url; r.rms=w.rms; r.els=[player(r),player(r)]; fin(); };
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
  function leave(){ const hid=document.hidden; away=true;
    if(hid) for(const r of LOOPS){ r.vol=0; for(const el of r.els){ el._on=false; if(!el.paused) el.pause(); } }
    if(ctx){ set(out.gain,0,hid?.01:.15); if(hid) ctx.suspend().catch(()=>{}); } }
  function back(){ if(!away||document.hidden) return; away=false; wdT=-1; for(const r of LOOPS) r.blocked=false;   // (a start cut short by the pause on leaving is not a browser saying no)
    if(ctx&&on){ ctx.resume().catch(()=>{}); set(out.gain,muted?0:LOUD,.5); } }
  document.addEventListener('visibilitychange',()=>document.hidden?leave():back());
  addEventListener('pagehide',leave); addEventListener('blur',leave); addEventListener('focus',back);
  ['pointerdown','touchstart','keydown'].forEach(ev=>addEventListener(ev,back,{capture:true,passive:true}));
  /* inside a click, a tap or a key a browser always lets a recording start: each player is started there once, silently,
     and stopped again, so a phone that only lets a page start sound inside a gesture lets it start later by itself */
  function prime(){ for(const r of LOOPS){ r.blocked=false;
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
  /* light rain on Earth: not a hiss (on a phone that is static) but a recording of separate drops, small bright plinks
     and soft taps on roofs and leaves, spread out so you hear each one */
  const RAINL=loop({name:'rain',sr:22050,P:12,H:2,ref:1,ios:.6,gate:.1,tc:1.4,tcOut:1.8,make(oc){ const b=bus(oc,.3), L=oc.length/oc.sampleRate;
      const lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=5600; lp.Q.value=.5; lp.connect(b.in);
      let seed=97; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
      const nb0=oc.createBuffer(1,Math.floor(oc.sampleRate*.05),oc.sampleRate), nd=nb0.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=(rnd()*2-1)*Math.pow(1-i/nd.length,3);
      for(let t=.02;t<L;t+=.01+rnd()*.032){ if(rnd()<.7){ const o=oc.createOscillator(), a=oc.createGain(), f=1700+rnd()*3600;
          o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*(.68+rnd()*.2),t+.03);
          a.gain.setValueAtTime(0,t); a.gain.linearRampToValueAtTime(.034+rnd()*.06,t+.002); a.gain.exponentialRampToValueAtTime(.0001,t+.018+rnd()*.024); o.connect(a); a.connect(lp); o.start(t); o.stop(t+.06); }
        else { const s=oc.createBufferSource(); s.buffer=nb0; const bp=oc.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=480+rnd()*900; bp.Q.value=1.8; const a=oc.createGain(); a.gain.value=.22+rnd()*.26;
          s.connect(bp); bp.connect(a); a.connect(lp); s.start(t); } } }});
  /* worked out one at a time, out of the way of the page starting: the music and the orbit first, the stations' air last */
  let making=!!OAC;
  { const Q=[MUS,PAD,SUB,WL,WH,TH,RD,RO,HS,CF,CN,...Object.values(BEDL),RAINL]; let qi=0; const go=()=>{ if(qi<Q.length) render(Q[qi++],go); else making=false; }; setTimeout(go,60); }
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
    _loops(){ return LOOPS.map(r=>({name:r.name,ready:!!r.url,vol:+clamp(r.vol/r.ref,0,1).toFixed(4),rms:+r.rms.toFixed(4),playing:r.els.some(e=>!e.paused&&!e.muted),players:r.els.filter(e=>!e.paused).length})); },
    _players:name=>(LOOPS.find(r=>r.name===name)||{els:[]}).els,
    _loopRms(){ let q=0; for(const r of LOOPS) if(r.els.some(e=>!e.paused&&!e.muted)){ const v=IOS?1:clamp(r.vol/r.ref,0,1); q+=(r.rms*v)**2; } return Math.sqrt(q); },
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
    hush(){ WL.want=WH.want=TH.want=HS.want=CF.want=CN.want=MUS.want=RAINL.want=0; RR.lvl=0; roarMix(); this.whine(0); for(const k in BEDL) BEDL[k].want=0; },
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
    music(v){ MUS.want=clamp((v||0)/.55,0,1); },
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
let RTS=Q<1?0:2;   // how many samples a full-screen target smooths its edges with (the frame timer can take it to none)
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
if(window.__TEST&&!window.__HQ) { BH.scale=.22; BH.steps=90; }   // __HQ: a test that wants real-resolution stills
BH.rt=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false});
BH.u={uCam:{value:new T.Vector3(0,2,30)},uEsc:{value:60},uBasis:{value:new T.Matrix3()},uTan:{value:.4},uAsp:{value:1},uTime:G.uTime,
  uRin:{value:3.},uRout:{value:12.},uTmax:{value:5600},uBeam:{value:.9},uDisk:{value:1},uSky:{value:1},uExpo:{value:1},uHold:{value:0},uStar:{value:0},uSpin:{value:1},tSky:{value:null}};
BH.mat=new T.ShaderMaterial({uniforms:BH.u,depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`precision highp float;
  uniform samplerCube tSky; uniform vec3 uCam; uniform mat3 uBasis; uniform float uEsc,uTan,uAsp,uTime,uRin,uRout,uTmax,uBeam,uDisk,uSky,uExpo,uHold,uStar,uSpin; varying vec2 vUv;
  ${GLSL_BB}
  const vec3 GN=vec3(.42,.86,-.29);   // the galactic band's pole: tilted against the disk so the band crosses the sky diagonally
  float h1(float n){return fract(sin(n)*43758.5453);}
  float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p*=2.07;a*=.5;}return s;}
  // stars: three magnitudes on hashed cells of the direction sphere, colour from temperature, denser along the galactic band
  vec3 stars(vec3 d){
    vec3 c=vec3(0.); float band=exp(-((dot(d,GN))*(dot(d,GN)))*9.);
    for(int k=0;k<3;k++){ float sc=k==0?60.:(k==1?140.:300.); vec3 q=d*sc; vec3 id=floor(q); vec3 f=fract(q)-.5;
      float h=h3(id+float(k)*13.); float th=k==0?.975:(k==1?.955-band*.05:.93-band*.12);
      if(h>th){ vec3 o=vec3(h3(id+1.7),h3(id+3.1),h3(id+5.3))-.5; float dd=length(f-o*.7);
        float tt=h3(id+9.); float temp=k==0?mix(3800.,16000.,tt*tt):mix(2800.,9000.,tt);
        float sz=k==0?.11:(k==1?.085:.07), br=k==0?2.2:(k==1?.85:.38);
        c+=blackbody(temp)*smoothstep(sz,0.,dd)*br*(.55+.45*h3(id+4.4)); } }
    return c; }
  vec3 sky(vec3 d){ return (textureCube(tSky,d).rgb+stars(d))*uSky; }
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
      vec3 acc=-1.5*h2*p/(r*r*r*r*r);
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
    if(a<1.) col+=(1.-a)*sky(d);   // (a ray that fell in sees no sky: never even look, its direction can be anything)
    // collapse glow: a star before it falls in (used by the entrance)
    col+=uStar*vec3(1.,.86,.7)*.0;
    col=max(col*uExpo,vec3(0.));
    #if __VERSION__ >= 300
    if(any(isnan(col))||any(isinf(col))) col=vec3(0.);   // one bad pixel would spread through the glow into black squares
    #endif
    gl_FragColor=vec4(col,1.);
  }`});

/* ================= THE SKY, DRAWN ONCE =================
   A faint galactic band with dust lanes and star clouds, a few distant galaxies (one large spiral), and two faint
   nebulae. Rendered into a cube at boot; the tracer samples it for every ray that escapes, so all of it is lensed. */
BH.makeSky=function(){
  const N=window.__TEST&&!window.__HQ?256:(Q<1?512:768);
  const rt=new T.WebGLCubeRenderTarget(N,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter});
  const cam=new T.CubeCamera(.1,10,rt), sc=new T.Scene();
  const G_=[ // galaxies: direction, angular radius (rad), inclination, position angle, kind (0 spiral, 1 elliptical, 2 edge-on), arms seed
    // the orbit camera looks down past the plane, so most of them sit below it, where you will actually see them
    [[.61,-.43,.66],.11,1.0,.6,0,1.3],[[-.78,-.3,.4],.034,.5,2.1,0,4.2],[[.1,-.5,-.83],.027,.9,1.2,0,2.7],
    [[-.45,-.35,.82],.042,1.48,.4,2,0],[[.88,-.2,-.46],.015,.4,0,1,0],[[-.6,.35,-.7],.019,.7,1.9,1,0],[[.05,-.72,-.6],.023,1.15,2.6,0,6.1]];
  const glsl=G_.map(g=>{ const d=new T.Vector3(...g[0]).normalize(); return `galaxy(d,vec3(${d.x.toFixed(4)},${d.y.toFixed(4)},${d.z.toFixed(4)}),${g[1].toFixed(4)},${g[2].toFixed(3)},${g[3].toFixed(3)},${g[4].toFixed(1)},${g[5].toFixed(2)})`; }).join('+');
  const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    vertexShader:`varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`precision highp float; varying vec3 vD;
    ${GLSL_BB}
    const vec3 GN=vec3(.42,.86,-.29);
    float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}
    float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    vec3 galaxy(vec3 d,vec3 c,float R,float inc,float pa,float kind,float seed){
      float cd=dot(d,c); if(cd<cos(R*2.6)) return vec3(0.);
      vec3 e1=normalize(cross(c,abs(c.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.))), e2=cross(c,e1);
      vec2 q=vec2(dot(d,e1),dot(d,e2))/max(cd,.2)/R;
      float cp=cos(pa), sp=sin(pa); q=vec2(cp*q.x-sp*q.y,sp*q.x+cp*q.y);
      if(kind>1.5){ // edge-on: a thin luminous disk split by a dark dust lane
        float rr=abs(q.x), z=q.y;
        float disk=exp(-rr*2.6)*exp(-abs(z)*26.)*1.3+exp(-dot(q,q)*14.)*.9;
        float lane=1.-.85*exp(-((z*40.+.25)*(z*40.+.25)))*smoothstep(1.,.15,rr);
        return mix(vec3(1.,.82,.62),vec3(.78,.86,1.),smoothstep(.1,.7,rr))*disk*lane*.22; }
      q.y/=max(cos(inc),.12);
      float r=length(q), th=atan(q.y,q.x);
      if(kind>.5){ // elliptical: a smooth warm glow
        return vec3(1.,.8,.6)*exp(-pow(r,.62)*4.2)*.35; }
      float arms=pow(.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)),2.6);
      float knots=smoothstep(.986,1.,h2(floor(q*46.)+seed))*arms*smoothstep(.95,.25,r);
      float dust=1.-.55*((.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)+.55))*(.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)+.55))*(.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)+.55))*(.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)+.55))*(.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)+.55)))*smoothstep(.12,.4,r);
      float disk=exp(-r*3.1)*(.35+.9*arms)*dust;
      float bulge=exp(-r*r*55.);
      vec3 col=vec3(.75,.84,1.)*disk*.8+vec3(1.,.83,.6)*bulge*.9+vec3(1.,.55,.5)*knots*.45;
      return col*.22*smoothstep(1.4,.6,r); }
    vec3 nebula(vec3 d,vec3 c,float R,vec3 tint){
      float cd=dot(d,c); if(cd<cos(R*1.6)) return vec3(0.);
      float a=acos(clamp(cd,-1.,1.))/R; float f=fbm(d*9.+c*3.), g=fbm(d*23.-c*5.);
      float m=smoothstep(1.2,.2,a)*smoothstep(.45,.85,f)*(.6+.8*g);
      return tint*m; }
    void main(){
      vec3 d=normalize(vD);
      // the galactic band: diffuse light, clumped star clouds, dark dust lanes along its middle
      float bz=dot(d,GN), band=exp(-bz*bz*9.), core=exp(-bz*bz*40.);
      float clouds=fbm(d*7.+2.), fine=fbm(d*31.-4.);
      float lanes=smoothstep(.42,.7,fbm(d*5.5+vec3(9.,3.,1.)))*core;
      vec3 c=vec3(.005,.0055,.007)*(.5+fbm(d*1.7+11.));
      c+=mix(vec3(.9,.82,.7),vec3(.72,.78,.95),clouds)*band*(.008+.03*pow(clouds,2.4)+.03*(fine*fine*fine))*(1.-.85*lanes);
      // two faint nebulae in deep amber, a hint of hydrogen glow, no more
      c+=nebula(d,normalize(vec3(-.55,.18,-.81)),.32,vec3(.035,.011,.006))+nebula(d,normalize(vec3(.62,-.5,-.55)),.22,vec3(.026,.012,.006));
      c+=${glsl};
      c=max(c,vec3(0.));
      #if __VERSION__ >= 300
      if(any(isnan(c))||any(isinf(c))) c=vec3(0.);
      #endif
      gl_FragColor=vec4(c,1.); }`});
  sc.add(new T.Mesh(new T.BoxGeometry(2,2,2),mat));
  cam.update(renderer,sc); mat.dispose(); sc.children[0].geometry.dispose();
  BH.u.tSky.value=rt.texture; BH.skyRT=rt;
};
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
const GM=60, RB=23.5, BELT=13.25;   // the edge of the system, and the asteroid belt between Aetos and Pharos
U.scene.add(BH.back); U.scene.add(BH.occ);

/* stations, coloured by temperature on the same blackbody scale as the disk, evenly spaced from 9.5 to 20 */
const STA=[
  {id:'kr',name:'Kríos',game:'Read the Room',R:9.5,ph:.4,K:24000,color:'#A5C3FF'},
  {id:'ae',name:'Aetos',game:'Hold the Sky',R:12,ph:4.3,K:6600,color:'#F2EEE6'},
  {id:'ph',name:'Pharos',game:'Lost Signal',R:14.5,ph:1.1,K:4300,color:'#FFD5B3'},
  {id:'og',name:'Ogive',game:'Apogee',R:17,ph:3.3,K:3100,color:'#FFB475'},
  {id:'be',name:'Beacon',game:'Join · contact',R:20,ph:.2,K:1850,color:'#FF8100'}
];
const NST=STA.length, BEACON=STA.find(s=>s.id==='be');
/* noise for Earth, the world past the horizon */
const EARTH_GLSL=`
float eh(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float en(vec3 x){ vec3 i=floor(x),f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(eh(i),eh(i+vec3(1,0,0)),f.x),mix(eh(i+vec3(0,1,0)),eh(i+vec3(1,1,0)),f.x),f.y),mix(mix(eh(i+vec3(0,0,1)),eh(i+vec3(1,0,1)),f.x),mix(eh(i+vec3(0,1,1)),eh(i+vec3(1,1,1)),f.x),f.y),f.z); }
float efbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*en(p); p*=2.1; a*=.5; } return s; }
float eland(vec3 d){ return efbm(d*2.3+vec3(3.1,1.7,.4))+.5*smoothstep(.8,.93,d.y)-.53; }`;

/* spacetime grid: a polar mesh outside the disk, dented by every mass */
{
  const v=[];
  for(let r=7.5;r<=RB;r+=1.25){ const N=Math.max(80,Math.floor(r*9)); for(let k=0;k<N;k++){ const a0=k/N*TAU,a1=(k+1)/N*TAU; v.push(Math.cos(a0)*r,0,Math.sin(a0)*r,Math.cos(a1)*r,0,Math.sin(a1)*r); } }
  for(let s=0;s<56;s++){ const a=s/56*TAU; for(let k=0;k<60;k++){ const r0=7.5+k*.4, r1=7.5+(k+1)*.4; v.push(Math.cos(a)*r0,0,Math.sin(a)*r0,Math.cos(a)*r1,0,Math.sin(a)*r1); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  U.gridU={uTime:G.uTime,uProbe:{value:new T.Vector3(99,0,99)},uSt:{value:[...Array(NST)].map(()=>new T.Vector3(99,0,99))},uOp:{value:0},uShock:{value:-9},uC:{value:new T.Color('#B9A58E')}};
  U.grid=new T.LineSegments(g,new T.ShaderMaterial({uniforms:U.gridU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform vec3 uProbe; uniform vec3 uSt[${NST}]; uniform float uTime,uOp,uShock; varying float vA;
    void main(){ vec3 p=position; float r=length(p.xz); float y=-1.4-14./(r+1.5);
      float d=length(p.xz-uProbe.xz); y-=.9*exp(-d*d*.5);
      for(int i=0;i<${NST};i++){ float ds=length(p.xz-uSt[i].xz); y-=.8*exp(-ds*ds*.3); }
      // the seal breaking sends one wave out across the whole system
      float sk=uShock>0.?exp(-((r-uShock)*(r-uShock))*.7)*smoothstep(${RB.toFixed(1)},${(RB-11).toFixed(1)},uShock):0.; y-=.7*sk;
      p.y=y; float wv=pow(.5+.5*sin(r*.7-uTime*1.1),12.);
      float dc=distance((modelMatrix*vec4(p,1.)).xyz,cameraPosition);
      vA=uOp*((.045+.14*wv)*smoothstep(${RB.toFixed(1)},${(RB-11).toFixed(1)},r)*smoothstep(7.5,10.5,r)+.24*exp(-d*d*.1)+.7*sk*smoothstep(7.,9.,r))*smoothstep(3.,9.,dc)*smoothstep(46.,20.,dc);
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
  if(s.id==='be'){ // a mast that keeps calling out
    add(new T.Mesh(new T.CylinderGeometry(.03,.12,2,10),LM('#b9ad9e',{rim:.6}))).position.y=0;
    const tip=add(new T.Mesh(new T.SphereGeometry(.09,16,10),LM(C,{emit:2.2}))); tip.position.y=1.05;
    add(pts(cloud(1800,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=1.05;o[2]=Math.sin(a);}),PM({size:.05,color:C,body:'float t=fract(aR.y*.999+uTime*.35+floor(aR.y*3.)/3.); p.xz*=t*2.4; b=(1.-t)*.9;'})));
  }
  // soft halo, and a dock ring that only shows when you are close enough to dock
  g.add(pts(cloud(300,(i,r,o)=>{const v=[gauss(),gauss(),gauss()],l=Math.hypot(...v)||1,R=1.9+r[0]*.6;o[0]=v[0]/l*R;o[1]=v[1]/l*R;o[2]=v[2]/l*R;}),PM({size:.05,color:C,body:'b=.08;'})));
  s.orbit=new T.LineLoop(ringGeo(s.R,480),dashMat(C,`float df=mod(uAng-vAng,6.28318); float a=(.025+.45*exp(-df*2.))*step(.45,fract(vAng*uR*1.4));`)); s.orbit.material.uniforms.uR.value=s.R; U.scene.add(s.orbit);
  s.zone=new T.LineLoop(ringGeo(2.4,120),dashMat(C,`float a=.86*uNear*step(.5,fract(vAng*6.+uTime*(.3+uNear)));`)); g.add(s.zone);
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(new Float32Array([0,-.95,0,0,-3.2,0]),3)); tg.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  s.tether=new T.Line(tg,dashMat(C,'float a=0.;')); s.tether.visible=false; g.add(s.tether);
  /* a station can sleep: dark and silent. On the way in only Aetos is awake; the rest wake as the seal's wave passes them */
  s.wake=s.wakeT=1; s._wk=1; s.wk=[];
  g.traverse(o=>{ const m=o.material; if(!m||o===s.zone||o===s.tether) return; const u=m.uniforms;
    if(u&&u.uC&&u.uE) s.wk.push({u,c:u.uC.value.clone(),e:u.uE.value,r:u.uRim?u.uRim.value:0});
    else if(u&&u.uOp&&!u.uNear) s.wk.push({u,op:u.uOp.value});
    else if(!u&&m.transparent&&'opacity' in m) s.wk.push({m,o:m.opacity}); });
});
function stationWake(s,k){ if(Math.abs(k-s._wk)<.002) return; s._wk=k; const d=.08+.92*k;
  for(const w of s.wk){ if(w.c){ w.u.uC.value.copy(w.c).multiplyScalar(d); w.u.uE.value=w.e*k; if(w.u.uRim) w.u.uRim.value=w.r*d; } else if(w.u) w.u.uOp.value=w.op*k; else w.m.opacity=w.o*k; } }
function wakeUpdate(dt){ STA.forEach(s=>{ s.wake=s.wakeT>s.wake?Math.min(s.wakeT,s.wake+dt*1.4):s.wakeT; stationWake(s,s.wake); }); }

/* asteroid belt between Aetos and Pharos, lit only by the disk */
{
  const N=Math.floor(380*Q+120);
  U.belt=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),LM('#8c8070',{rim:.25,amb:.03,key:'#FFC392'}),N);
  const M=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), sc=new T.Vector3(), p=new T.Vector3();
  for(let i=0;i<N;i++){ const a=Math.random()*TAU, r=BELT+gauss()*.34; p.set(Math.cos(a)*r,gauss()*.12,Math.sin(a)*r); e.set(Math.random()*6,Math.random()*6,Math.random()*6); q.setFromEuler(e);
    const s=.025+Math.pow(Math.random(),3)*.09; sc.set(s,s*(.6+Math.random()*.6),s*(.7+Math.random()*.5)); M.compose(p,q,sc); U.belt.setMatrixAt(i,M); }
  U.belt.frustumCulled=false; U.belt.visible=false; U.scene.add(U.belt);
}
/* the seal's pieces, flung out when it breaks */
U.shardU={uT:{value:-1}};
U.shard=pts(cloud(Math.floor(520*Q+220),(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=0;o[2]=Math.sin(a);}),PM({size:.1,color:'#FF6A3D',uniforms:U.shardU,decl:'uniform float uT;',
  body:`float t=max(uT,0.), sp=1.2+aR.y*aR.y*10.; p.xz*=2.4+sp*t*(1.-.14*t); p.y=(aR.z-.5)*t*(.6+aR.w*2.); col=mix(vec3(1.,.93,.8),uCol,smoothstep(.05,.6,t)); b=step(0.,uT)*exp(-t*(1.1+aR.x))*(1.1+aR.w); sz=.8+aR.w;`}));
U.scene.add(U.shard);
/* the seal: a dashed ring just outside the horizon that holds the probe off until it has docked at one station */
U.seal=new T.LineLoop(ringGeo(2.4,260),dashMat('#FF5636','float a=(.07+.75*uNear)*step(.5,fract(vAng*15.9+uTime*.12));')); U.seal.material.uniforms.uOp.value=0; U.scene.add(U.seal); U.sealU=U.seal.material.uniforms;
/* boundary curtain */
U.fenceU={uPA:{value:0},uNear:{value:0}};
U.fence=pts(cloud(Math.floor(3000*Q+800),(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*RB;o[1]=gauss()*.5;o[2]=Math.sin(a)*RB;}),PM({size:.06,color:'#FFC392',uniforms:U.fenceU,decl:'uniform float uPA,uNear;',
  body:`float a=atan(p.z,p.x); float da=abs(mod(a-uPA+3.1416,6.2832)-3.1416); float hx=step(.82,fract((a*24.)+floor(p.y*3.)*.5)); b=uOp*(.012+uNear*(.6+.9*hx)*exp(-da*da*18.));`}));
U.fence.material.uniforms.uOp.value=0; U.scene.add(U.fence);

/* probe */
U.probe=new T.Group();
{ const hull=new T.Mesh(new T.ConeGeometry(.11,.42,16),LM('#EEE9DF',{emit:.1,rim:1.2})); hull.rotation.x=-Math.PI/2; U.probe.add(hull);
  const fin=new T.Mesh(new T.BoxGeometry(.34,.014,.1),LM('#FFC392',{emit:.3})); fin.position.z=.13; U.probe.add(fin);
  U.engU={uThr:{value:0}};
  U.probe.add(pts(cloud(40,(i,r,o)=>{o[0]=gauss()*.02;o[1]=gauss()*.02;o[2]=.23+r[0]*.05;}),PM({size:.09,color:'#FFD8B0',uniforms:U.engU,decl:'uniform float uThr;',body:'b=.18+uThr*.22; sz=1.+uThr*.35;'})));   // a small glow in the nozzle
  /* the flame: a jet out of the nozzle, as long as you push. Two shells, a hot blue-white core inside an orange plume,
     soft at the edges, flickering, with bright shock diamonds when you burn hard; at rest only a small blue pilot light */
  U.engU.uTime=G.uTime;
  const jet=(len,rad,core)=>{ const g=new T.CylinderGeometry(1,1,1,28,24,true).translate(0,.5,0).rotateX(Math.PI/2);   // a unit tube from the nozzle (z 0) to the tip (z 1), shaped in the shader
    const m=new T.ShaderMaterial({uniforms:U.engU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
      vertexShader:`uniform float uThr,uTime; varying float vU; varying vec3 vN,vV;
        float h(float n){ return fract(sin(n)*43758.5453); }
        float nz(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(h(i),h(i+1.),f); }
        void main(){ vec3 p=position; float u=p.z; vU=u; float k=clamp(uThr/1.5,0.,1.);
          float L=${len.toFixed(3)}*(.18+.82*k)*(1.+.12*(nz(uTime*23.+u*3.)-.5)), R=${rad.toFixed(3)}*(.55+.45*k);
          float prof=pow(max(1.-u,0.),.75)*(1.+.5*u)*(1.+.22*(nz(uTime*31.+u*9.+${core?'7.':'0.'})-.5)*u);   // full at the nozzle, licking to a point
          p.xy*=R*prof; p.z=.21+u*L;
          p.x+=sin(uTime*17.+u*6.)*.012*u*k; p.y+=cos(uTime*13.+u*5.)*.01*u*k;
          vec4 mv=modelViewMatrix*vec4(p,1.); vV=normalize(-mv.xyz); vN=normalize(normalMatrix*normal);
          gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform float uThr,uTime; varying float vU; varying vec3 vN,vV;
        void main(){ float k=clamp(uThr/1.5,0.,1.), u=clamp(vU,0.,1.); float edge=pow(abs(dot(normalize(vN),normalize(vV))),${core?'1.6':'1.1'});
          ${core?`vec3 c=mix(vec3(.85,.93,1.),vec3(1.,.86,.55),smoothstep(.05,.7,u)); float a=edge*(1.-smoothstep(.25,1.,u))*(.22+.85*k);
            a*=1.+.9*k*pow(max(.5+.5*cos(u*34.-uTime*3.),0.),6.)*max(1.-u,0.);`
          :`vec3 c=mix(vec3(1.,.72,.38),vec3(.95,.3,.08),smoothstep(.15,.85,u)); float a=edge*pow(max(1.-u,0.),1.25)*(.07+.95*k);
            a*=.75+.25*sin(uTime*40.+u*12.);`}
          gl_FragColor=vec4(c*a,1.); }`});
    const ms=new T.Mesh(g,m); ms.frustumCulled=false; ms.renderOrder=3; U.probe.add(ms); return ms; };
  jet(1.35,.1,false); jet(.62,.045,true); }
U.probe.visible=false; U.scene.add(U.probe);
U.exhaust=Burst(U.scene,Math.floor(500*Q+120),'#FFC392',.08);
const TRL=170; U.trailPos=new Float32Array(TRL*3); U.trailCol=new Float32Array(TRL*3);
U.trailG=new T.BufferGeometry(); U.trailG.setAttribute('position',new T.BufferAttribute(U.trailPos,3)); U.trailG.setAttribute('color',new T.BufferAttribute(U.trailCol,3));
U.trail=new T.Line(U.trailG,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false})); U.trail.frustumCulled=false; U.trail.visible=false; U.scene.add(U.trail);
U.dustU={uC:{value:new T.Vector3()},uV:{value:new T.Vector3()}};
U.dust=pts(cloud(Math.floor(1600*Q),(i,r,o)=>{o[0]=(r[0]-.5)*44;o[1]=(r[1]-.5)*16;o[2]=(r[2]-.5)*44;}),PM({size:.05,color:'#CFC3B1',uniforms:U.dustU,decl:'uniform vec3 uC;',body:`p=uC+mod(position-uC+vec3(22.,8.,22.),vec3(44.,16.,44.))-vec3(22.,8.,22.); b=.22;`}));
U.dust.visible=false; U.scene.add(U.dust);
/* speed streaks: the same dust drawn as short lines along the probe's velocity, visible only when you are moving fast */
{ const N=Math.floor(900*Q+200), P=new Float32Array(N*6), E=new Float32Array(N*2), R=new Float32Array(N*2);
  for(let i=0;i<N;i++){ const x=(Math.random()-.5)*44, y=(Math.random()-.5)*16, z=(Math.random()-.5)*44, r=Math.random();
    P.set([x,y,z,x,y,z],i*6); E[i*2]=0; E[i*2+1]=1; R[i*2]=R[i*2+1]=r; }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); g.setAttribute('aE',new T.BufferAttribute(E,1)); g.setAttribute('aR',new T.BufferAttribute(R,1)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  U.streak=new T.LineSegments(g,new T.ShaderMaterial({uniforms:U.dustU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform vec3 uC,uV; attribute float aE,aR; varying float vA;
      void main(){ vec3 p=uC+mod(position-uC+vec3(22.,8.,22.),vec3(44.,16.,44.))-vec3(22.,8.,22.);
        float sp=length(uV); p-=uV*aE*(.05+.07*aR);
        vec4 mv=modelViewMatrix*vec4(p,1.); float dc=-mv.z;
        vA=smoothstep(3.,8.,sp)*(1.-aE*.85)*.22*smoothstep(1.,4.,dc)*smoothstep(26.,8.,dc);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`varying float vA; void main(){ gl_FragColor=vec4(vec3(.85,.8,.74)*vA,1.); }`}));
  U.streak.frustumCulled=false; U.streak.visible=false; U.scene.add(U.streak); }
{ const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3)); g.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  U.apLine=new T.Line(g,dashMat('#EEE9DF','float a=.5*step(.5,fract(vAng*uR-uTime*2.));')); U.apLine.frustumCulled=false; U.apLine.visible=false; U.scene.add(U.apLine); }
const MAXP=24; U.peerPos=new Float32Array(MAXP*3).fill(9999);
U.peerG=new T.BufferGeometry(); U.peerG.setAttribute('position',new T.BufferAttribute(U.peerPos,3)); U.peerG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXP*4).fill(.7),4)); U.peerG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
U.peers=pts(U.peerG,PM({size:.2,color:'#FFC392',body:'b=1.1+.5*sin(uTime*4.);'})); U.scene.add(U.peers);
U.sigU={uCount:{value:0},uBe:{value:new T.Vector3()}};
U.sig=pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.12,color:'#FFFFFF',uniforms:U.sigU,decl:'uniform float uCount; uniform vec3 uBe;',body:`
  float i=position.x; b=step(i,uCount-.5)*.9; float a=uTime*(.2+aR.x*.3)+aR.y*6.28; float rr=2.4+aR.z*1.2; p=uBe+vec3(cos(a)*rr,(aR.w-.5)*1.4,sin(a)*rr);`}));
U.scene.add(U.sig);

/* everything in orbit is lit by the disk, and dimmer the farther it is from the hole */
U.scene.traverse(o=>{ const m=o.material; if(m&&m.uniforms&&m.uniforms.uFall) m.uniforms.uFall.value=1; });
function updateStations(t){
  STA.forEach(s=>{ s.a=s.ph+t*s.w; s.pos.set(Math.cos(s.a)*s.R,Math.sin(t*.3+s.ph)*.25,Math.sin(s.a)*s.R); s.vel.set(-Math.sin(s.a)*s.R*s.w,0,Math.cos(s.a)*s.R*s.w);
    s.grp.position.copy(s.pos); s.orbit.material.uniforms.uAng.value=s.a; U.gridU.uSt.value[s.idx].copy(s.pos);
    s.anim.forEach(f=>f(t));
    if(s.orbs) s.orbs.forEach((m,k)=>{const a=t*.8+k*TAU/3; m.position.set(Math.cos(a)*.78,Math.sin(t*1.2+k)*.15,Math.sin(a)*.78);}); });
  U.sigU.uBe.value.copy(BEACON.pos);
}
function universeVisible(k){
  STA.forEach(s=>{ s.grp.visible=k>.01; const w=k*(.12+.88*s.wake); s.orbit.material.uniforms.uOp.value=w; s.zone.material.uniforms.uOp.value=k*s.wake; s.tether.material.uniforms.uOp.value=w; });
  U.gridU.uOp.value=k; U.fence.material.uniforms.uOp.value=k; U.belt.visible=k>.05; U.sealU.uOp.value=k*S.sealK; U.shard.material.uniforms.uOp.value=k;
}

/* ================= HUB: FLIGHT, MAP, DOCKING ================= */
const S={mode:'load',ch:0,chT:0,t:0,tau:0,hold:0,form:0,formT:null,flash:0,intro:0,introT:0,yaw:.5,zoom:1,iris:0,arrive:0,shake:0,ca:0,rdt:0,games:0,
  probe:{p:new T.Vector3(10,0,0),v:new T.Vector3(),thr:0,head:0}, ap:null, docked:new Set(), played:new Set(), near:null, st:null, stId:null, firstThrust:false, hubT:0, edgeT:0, sealT:0, sealK:1,
  lead:null, leadDock:false, push:false, been:false, guide:'off', guideT:0, pulseT:1.2, pulses:0};
const keys=new Set();
const tv=[...Array(10)].map(()=>new T.Vector3());
const _m=new T.Matrix4(), UPV=new T.Vector3(0,1,0);
function lookQ(pos,target,out){ _m.lookAt(pos,target,UPV); return out.setFromRotationMatrix(_m); }
const mkPose=()=>({p:new T.Vector3(),q:new T.Quaternion(),fov:36});
const chase=mkPose(), fromP=mkPose(), closeP=mkPose();
const hubBase={p:new T.Vector3(0,1.2,70),q:new T.Quaternion()};

function chasePose(out){
  const P=S.probe, L=S.lead?1.12:1, D=12.5*S.zoom*L, H=5.4*S.zoom*L;
  out.p.set(P.p.x+Math.sin(S.yaw)*D,H,P.p.z+Math.cos(S.yaw)*D);
  tv[0].copy(P.p).addScaledVector(P.v,.25); tv[0].y=-.9;
  if(S.lead){ const a=S.lead.s.pos; tv[0].x=lerp(tv[0].x,a.x,.46); tv[0].z=lerp(tv[0].z,a.z,.46); }   // on the way in, Aetos is ahead in the frame, below the words
  if(SB.look>0) tv[0].multiplyScalar(1-SB.look*.5);   // while the seal breaks, the camera turns a little toward the hole
  lookQ(out.p,tv[0],out.q); out.fov=36; return out;
}

/* ---------- input ---------- */
addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input')) return;
  keys.add(e.code);
  if(e.code==='KeyE'&&S.mode==='hub'&&S.near&&!S.lead) dock(S.near);
  if(e.code==='Escape'&&S.mode==='station') undock();
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&(S.mode==='hub'||S.mode==='tohub')){ if(!S.lead) S.ap=null; e.preventDefault(); }
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
  if(!drag.touch){ S.yaw-=(e.clientX-drag.x)*.005; drag.x=e.clientX; S.lookT=S.t; }
  else { drag.x=e.clientX; drag.y=e.clientY; const dx=clamp(drag.x-drag.ox,-50,50),dy=clamp(drag.y-drag.oy,-50,50); $('#stick i').style.transform=`translate(${dx}px,${dy}px)`; }
});
const endDrag=e=>{ if(drag&&(!e||e.pointerId===drag.id)){ drag=null; $('#stick').hidden=true; $('#stick i').style.transform=''; } };
addEventListener('pointerup',endDrag); addEventListener('pointercancel',endDrag);
addEventListener('wheel',e=>{ if(S.mode==='hub'&&!S.wheelSettle){ S.zoom=clamp(S.zoom*Math.exp(e.deltaY*.0008),.72,1.35); e.preventDefault(); } },{passive:false});

/* the hole as a destination: sealed until you have docked at one station; what is on the other side is Earth.
   Nothing flies you into it: the stations take autopilot, the horizon you fly into by hand */
const SEAL=2.4, HOLE={id:'hole',name:'The horizon',pos:new T.Vector3(),vel:new T.Vector3(),R:0,color:'#FFC392'};
const holeOpen=()=>S.docked.size>=1, SEALTINT=new T.Color(.06,.015,0);
/* where the fall begins: where the hole looks as if it begins. The tracer puts the horizon at rs (BH.RS), but what you see is
   its shadow, the black disc of every ray that comes closer than 2.6 rs and falls in, so 1.43 units out from the centre.
   The camera rides up and behind the probe, though, and seen from there a probe that has gone past the hole, a few units
   behind it, is already hidden in that disc. So the probe is in once it is within the shadow's radius, or once the camera sees
   it inside the black disc: behind the hole, or in front of it inside the disk's inner edge (further out in front it is still
   over the bright disk, which crosses in front of the lower half of the black) */
const SHADOW=2.598*BH.RS, _hc=new T.Vector3();
function inHole(p,r){
  if(r<SHADOW) return true; if(r>4.2) return false;
  const C=hubCam.position, dH=C.length(), d=_hc.copy(p).sub(C), dP=d.length(), u=dH/BH.RS;
  const disc=Math.asin(Math.min(1,2.598/u*Math.sqrt(Math.max(0,1-1/u))));   // the shadow's angular radius from where the camera is
  const off=Math.acos(clamp(-C.dot(d)/(dH*dP),-1,1));                       // and the probe's angle from the hole's centre
  return off<disc*.9&&(dP>dH||r<BH.u.uRin.value*BH.RS);
}
/* on the way to Aetos nothing flies you: a click on it says how to fly */
function leadNudge(){ toast(FINE?'Hold W to fire the thruster':'Drag up to fire the thruster'); A.beep(660); }
function autopilot(s){ if(S.lead){ if(S.mode==='hub') leadNudge(); return; } if(S.mode!=='hub'||!s||s===HOLE) return; if(S.near===s) return dock(s); S.ap=s; toast('Autopilot · '+s.name); A.blip(); }
$('#dockp').addEventListener('click',()=>S.near&&dock(S.near));

/* ---------- physics ---------- */
/* flying by hand, made forgiving for a first flight. Hold the thruster without steering and the view turns toward where you
   are meant to go, briskly but never in a whip: Aetos on the way in, the hole while its contact calls (the hole only once it
   is roughly ahead: you still point yourself at it). Under thrust the probe goes where it points instead of skidding sideways,
   and never faster than you can follow. Closing on a station it slows to a speed you can dock at, and the catch is generous.
   Let go beside a station and you hold station by it; let go anywhere else and you settle into an orbit */
const DOCKR=3.2, FLYCAP=8.5, TURN=1.6, _fa=new T.Vector3(), _fb=new T.Vector3();
function flightGoal(){ return S.lead?S.lead.s:(S.push&&!S.been&&holeOpen()&&S.sealK<1)?HOLE:null; }
function hubPhysics(dt){
  const P=S.probe;
  let ix=0,iz=0;
  if(keys.has('KeyW')||keys.has('ArrowUp')) iz+=1; if(keys.has('KeyS')||keys.has('ArrowDown')) iz-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight')) ix+=1; if(keys.has('KeyA')||keys.has('ArrowLeft')) ix-=1;
  if(drag&&drag.touch){ ix=clamp((drag.x-drag.ox)/50,-1,1); iz=clamp(-(drag.y-drag.oy)/50,-1,1);
    if(iz>.3&&Math.abs(ix)<.4*iz) ix=0; }   // a thumb pushing up is never quite straight: a little to the side is not steering
  const goal=S.ap?null:flightGoal(), looking=drag&&!drag.touch, looked=S.t-(S.lookT??-9);
  let gl=1e9;
  if(goal){ const dx=goal.pos.x-P.p.x, dz=goal.pos.z-P.p.z; gl=Math.hypot(dx,dz)||1e-3; const err=angDiff(Math.atan2(-dx/gl,-dz/gl),S.yaw);
    // the thruster held, no steering, and no look round in the last moment: the view turns toward the goal
    if(iz>0&&!ix&&!looking&&looked>1.2&&(goal!==HOLE||Math.abs(err)<1.6)) S.yaw+=clamp(err*3,-TURN,TURN)*dt;
    // on the way in the camera keeps Aetos ahead as you coast too, except for a while after you have dragged to look round
    else if(S.lead&&!looking&&looked>2.5) S.yaw+=clamp(err*1.2,-TURN,TURN)*dt; }
  // you fly in to Aetos yourself, and flying into it docks you
  if(S.lead){ S.lead.t+=dt; if(gl<DOCKR&&S.mode==='hub'){ dock(S.lead.s); return; } }
  const fwd=tv[1].set(-Math.sin(S.yaw),0,-Math.cos(S.yaw)), rgt=tv[2].set(Math.cos(S.yaw),0,-Math.sin(S.yaw));
  const thrust=tv[3].copy(fwd).multiplyScalar(iz).addScaledVector(rgt,ix);
  if(thrust.lengthSq()>.01){ S.firstThrust=true; if(S.guide==='big'||S.guide==='lead') S.guideGo=true; }
  if((S.guide==='big'||S.guide==='lead')&&S.guideGo&&S.t-S.guideT>1.4) guide('small');   // once you are moving, and it has been read
  const r=Math.max(.5,Math.hypot(P.p.x,P.p.z));
  if(S.ap){ const s=S.ap; const to=tv[4].copy(s.pos).sub(P.p); to.y=0; const dist=to.length();
    const dl=tv[5].copy(to).normalize(); const along=clamp(-P.p.dot(dl),0,dist); const cl=tv[6].copy(P.p).addScaledVector(dl,along); cl.y=0;
    let aim=to, aimLen=dist;
    if(s!==HOLE&&cl.length()<8.5&&dist>4){ const side=cl.length()>.1?cl.normalize():tv[6].set(-P.p.z,0,P.p.x).normalize(); aim=side.multiplyScalar(Math.max(9.5,Math.min(r,s.R))).sub(P.p); aim.y=0; aimLen=aim.length()+6; }
    const want=tv[7].copy(aim).normalize().multiplyScalar(Math.min(S.lead?6.5:11,aimLen*1.1)).add(s.vel);
    thrust.copy(want.sub(P.v)).multiplyScalar(.6); if(thrust.length()>1.5) thrust.setLength(1.5);
    if(dist<2.2&&s!==HOLE&&S.mode==='hub'){ S.ap=null; dock(s); return; }
    U.apLine.visible=true; const ap=U.apLine.geometry.attributes.position.array; ap[0]=P.p.x;ap[1]=0;ap[2]=P.p.z;ap[3]=s.pos.x;ap[4]=s.pos.y;ap[5]=s.pos.z; U.apLine.geometry.attributes.position.needsUpdate=true; U.apLine.material.uniforms.uR.value=dist*1.2; U.apLine.material.uniforms.uOp.value=1;
  } else U.apLine.visible=false;
  const tl=Math.min(1.5,thrust.length()); P.thr=damp(P.thr,tl,10,dt);
  const acc=tv[8].set(-P.p.x,0,-P.p.z).multiplyScalar(GM/(r*r*r)).addScaledVector(thrust,9);
  if(!S.ap&&tl>.05){ const tn=_fa.copy(thrust).normalize(), al=P.v.dot(tn); acc.x-=(P.v.x-tn.x*al)*2.4; acc.z-=(P.v.z-tn.z*al)*2.4; }   // the skid across the thrust dies away
  else if(tl<.05){
    if(goal&&goal!==HOLE&&gl<7) acc.addScaledVector(_fa.copy(goal.vel).sub(P.v),1.1);   // let go beside a station: you hold station by it
    else if(r>3.5){ const vc=Math.sqrt(GM/r); const tang=tv[9].set(-P.p.z/r,0,P.p.x/r); const sg=Math.sign(tang.dot(P.v))||1; tang.multiplyScalar(vc*sg).sub(P.v); acc.addScaledVector(tang,.9); } }
  if(r>RB-2.5){ acc.addScaledVector(tv[4].set(-P.p.x/r,0,-P.p.z/r),(r-(RB-2.5))*9); if(S.t>S.edgeT){ S.edgeT=S.t+6; A.beep(440); } }
  if(S.ap&&S.ap!==HOLE&&r<7) acc.addScaledVector(tv[4].set(P.p.x/r,0,P.p.z/r),30);
  P.v.addScaledVector(acc,dt);
  // closing on a station, the speed toward it is held to one you can stop from by the time you get there
  if(goal&&goal!==HOLE){ const u=_fa.set(goal.pos.x-P.p.x,0,goal.pos.z-P.p.z).multiplyScalar(1/gl), c=_fb.copy(P.v).sub(goal.vel).dot(u), cm=2.4+.85*Math.max(0,gl-DOCKR);
    if(c>cm) P.v.addScaledVector(u,-(c-cm)*Math.min(1,dt*6)); }
  { const sp=P.v.length(); if(!S.ap&&sp>FLYCAP) P.v.multiplyScalar(Math.max(FLYCAP/sp,1-dt*4)); if(P.v.length()>12) P.v.setLength(12); }   // by hand, never faster than you can follow
  P.p.addScaledVector(P.v,dt); P.p.y=0;
  if(S.ap&&S.ap!==HOLE){ const rr=Math.hypot(P.p.x,P.p.z); if(rr<4){ P.p.multiplyScalar(4/rr); const vr=(P.v.x*P.p.x+P.v.z*P.p.z)/4; if(vr<0){ P.v.x-=vr*P.p.x/4; P.v.z-=vr*P.p.z/4; } } } // autopilot never falls in by accident
  // until you have docked somewhere and the seal has broken, the horizon is sealed: the probe bounces off it. Once it is open,
  // the fall is judged where the probe is now, after this frame's move, the place this frame draws it
  { const rr=Math.hypot(P.p.x,P.p.z);
    if(!holeOpen()||S.sealK>=1){
      if(rr<SEAL){ const nx=P.p.x/rr, nz=P.p.z/rr; P.p.x=nx*SEAL; P.p.z=nz*SEAL; const vr=P.v.x*nx+P.v.z*nz; if(vr<0){ P.v.x-=1.7*vr*nx; P.v.z-=1.7*vr*nz; }
        U.sealU.uNear.value=1; if(!holeOpen()&&S.t>S.sealT){ S.sealT=S.t+3.5; toast('The horizon is sealed · dock at any station first'); A.beep(330); A.beep(262); feedback(.35,1.2,SEALTINT); } } }
    else if(inHole(P.p,rr)){ crossHorizon(); return; } }
  if(P.v.lengthSq()>.04) P.head=P.head+angDiff(Math.atan2(-P.v.x,-P.v.z),P.head)*Math.min(1,dt*6);
  U.probe.position.copy(P.p); U.probe.rotation.set(0,P.head,0); U.engU.uThr.value=P.thr; A.thrust(P.thr);
  if(P.thr>.1){ tv[4].set(Math.sin(P.head),0,Math.cos(P.head)).multiplyScalar(.3+P.thr*.35).add(P.p); for(let k=0;k<Math.ceil(P.thr*3*Q);k++) U.exhaust.emit(tv[4],1,.35,null,0,.45+Math.random()*.3); }
  U.exhaust.update(dt,0,2.2);   // the sparks drift, cool and go out behind you
  U.trailPos.copyWithin(3,0,(TRL-1)*3); U.trailPos[0]=P.p.x;U.trailPos[1]=0;U.trailPos[2]=P.p.z;
  for(let i=0;i<TRL;i++){const f=Math.pow(1-i/TRL,2)*.8; U.trailCol[i*3]=f*.85;U.trailCol[i*3+1]=f*.78;U.trailCol[i*3+2]=f;}
  U.trailG.attributes.position.needsUpdate=true; U.trailG.attributes.color.needsUpdate=true;
  U.dustU.uC.value.copy(P.p); U.dustU.uV.value.copy(P.v); U.gridU.uProbe.value.copy(P.p); U.sealU.uNear.value=damp(U.sealU.uNear.value,0,2.5,dt);
  U.fenceU.uPA.value=Math.atan2(P.p.z,P.p.x); U.fenceU.uNear.value=sstep(RB-6,RB-1,r);
  // proximity
  let near=null, nd=1e9; STA.forEach(s=>{ const d=s.pos.distanceTo(P.p); if(d<nd){nd=d;near=s;} s.zone.material.uniforms.uNear.value=damp(s.zone.material.uniforms.uNear.value,d<DOCKR?1:0,6,dt); });
  S.near=nd<DOCKR?near:null;
  const dp=$('#dockp'); dp.hidden=!S.near||FINE||!!S.lead; if(S.near){ dp.textContent='Dock at '+S.near.name; dp.style.setProperty('--acc',S.near.color); }
  // telemetry + warnings
  const g=1/Math.sqrt(Math.max(1e-4,1-BH.RS/r)); S.tau+=dt/g;
  // proper time still accrues for the horizon page; the readouts are gone
  const rs=r/BH.RS, danger=r<6.2;
  if(S.guide==='small'){ const v=rs.toFixed(1); if(v!==S.guideRv){ S.guideRv=v; $('#guideR').textContent=v; } } $('#warn').classList.toggle('on',danger); if(danger){ $('#warnR').textContent='r = '+rs.toFixed(2)+' rs'; post.uniforms.uTint.value.r=Math.max(post.uniforms.uTint.value.r,(6.2-r)*.012); }
  A.wind(P.v.length()/34+Math.max(0,(7-r))*.05); A.update(S.t,{sub:sstep(12,2,r),pad:S.guide==='lead'?1.3:1,bright:S.guide==='lead'?.62:.4});
  orbitSound(P,r,dt);
}

/* ---------- the sound of the system: where things are, how fast you go, how close the hole is ---------- */
const BEACON_NOTES=[12,10,13,11,14];   // Kríos F, Aetos D, Pharos A, Ogive E, Beacon B: all in the score's mode
const _cr=new T.Vector3(), _to=new T.Vector3();
function orbitSound(P,r,dt){
  if(!A.ctx) return;
  _cr.setFromMatrixColumn(hubCam.matrixWorld,0);
  const sp=P.v.length();
  // the stations make no sound of their own: no beacons and no bells. Only their air, if you go past one at speed
  STA.forEach((s,i)=>{ _to.copy(s.pos).sub(P.p); const d=_to.length(); _to.y=0;
    const pan=clamp(_to.dot(_cr)/Math.max(d,.5)*1.3,-1,1);
    // a fly-by: the closest approach to a station, taken at speed
    const pd=s._pd??d; if(d>pd&&pd<3.2&&sp>4&&S.t>(s._pbT||0)){ s._pbT=S.t+2; A.passby(pan,.06+.05*sstep(4,12,sp)); }
    s._pd=d; });
  // the asteroid belt: faint grains on the hull while you cross it
  const near=1-Math.min(1,Math.abs(r-BELT)/1.6); if(near>0&&Math.random()<dt*near*(2+sp*1.6)) A.pebble((Math.random()-.5)*1.6);
  // the hole: a low growl that builds inside a few radii
  A.roar(sstep(7.5,2.6,r)*.2);
}

/* ---------- labels, edge markers, radar ---------- */
STA.forEach(s=>{
  const el=document.createElement('button'); el.type='button'; el.className='slab'; el.style.setProperty('--acc',s.color); el.dataset.cur='Fly';
  el.innerHTML=`<span class="rt"></span><span class="tx"><b>${s.name}</b><span class="sub">${s.game}</span><span class="act">${FINE?'<kbd>E</kbd> Dock':'Tap to dock'}</span></span>`;
  el.addEventListener('click',()=>autopilot(s)); $('#labels').appendChild(el); s.el=el;
  const ed=document.createElement('button'); ed.type='button'; ed.className='edge'; ed.style.setProperty('--acc',s.color); ed.dataset.cur='Fly';
  ed.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><span>${s.name}</span>`;
  ed.addEventListener('click',()=>autopilot(s)); $('#edges').appendChild(ed); s.edge=ed;
});
/* the horizon gets a label of its own once it is open, and, while it is off the screen, the one marker at the edge.
   Neither takes a click: you fly in yourself */
{ const el=document.createElement('div'); el.className='slab hole'; el.style.setProperty('--acc',HOLE.color);
  el.innerHTML=`<span class="rt"></span><span class="tx"><b>The horizon</b><span class="sub">Unidentified contact</span><span class="act">Fly in</span></span>`;
  el.style.display='none'; $('#labels').appendChild(el); HOLE.el=el;
  const ed=document.createElement('div'); ed.className='edge hole'; ed.style.setProperty('--acc',HOLE.color);
  ed.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><span>The horizon</span>`;
  ed.style.display='none'; $('#edges').appendChild(ed); HOLE.edge=ed; }
const _edges=[]; let _rb=null, _rbK='';
function radarBox(){ const key=innerWidth+'x'+innerHeight; if(_rbK!==key){ const r=$('#radar').getBoundingClientRect(); if(r.width<1) return null; _rb={l:r.left-30,t:r.top-30,r:r.right+10,b:r.bottom+10}; _rbK=key; } return _rb; }
function labelsUpdate(){
  const W=innerWidth,H=innerHeight, m=46, hw=W/2-m, hh=H/2-m-40; _edges.length=0;
  const onlyHole=S.push&&!S.been; $('#hub').classList.toggle('lead',!!S.lead);
  STA.forEach(s=>{
    if(s.wake<.5){ s.el.style.display='none'; s.edge.style.display='none'; return; }   // asleep: no mark at all
    const p=tv[1].copy(s.pos).project(hubCam), behind=p.z>1;
    const sx=(p.x*.5+.5)*W, sy=(-p.y*.5+.5)*H;
    const on=!behind&&sx>40&&sx<W-40&&sy>70&&sy<H-60;
    if(on){ tv[2].setFromMatrixColumn(hubCam.matrixWorld,0).multiplyScalar(1.7).add(s.pos).project(hubCam); const rad=Math.abs((tv[2].x-p.x)*.5*W);
      const sz=clamp(rad*2,32,150); s.el.style.display=''; s.el.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; s.el.style.setProperty('--s',sz.toFixed(0)+'px'); s.el.classList.toggle('low',sy-sz/2<74);
      s.el.classList.toggle('near',S.near===s); s.el.classList.toggle('flip',sx>W-200); s.el.classList.toggle('done',S.docked.has(s.id)); s.edge.style.display='none';
      const rb=radarBox(); s.el.classList.toggle('under',!!rb&&sx>rb.l&&sx<rb.r&&sy>rb.t&&sy<rb.b); }
    else { s.el.style.display='none';
      if(onlyHole){ s.edge.style.display='none'; return; }   // while the contact is calling, its marker is the only one
      let dx=sx-W/2, dy=sy-H/2; if(behind){dx=-dx;dy=-dy;} const a=Math.atan2(dy,dx);
      const k=Math.min(hw/Math.max(1e-6,Math.abs(Math.cos(a))),hh/Math.max(1e-6,Math.abs(Math.sin(a))));
      if(s.edge.style.display==='none'||!s.ew){ s.edge.style.display=''; s.ew=s.edge.offsetWidth||90; }
      _edges.push({s,a,x:W/2+Math.cos(a)*k,y:H/2+Math.sin(a)*k}); }
  });
  { const H_=HOLE.el, HE=HOLE.edge; if(holeOpen()&&S.sealK<1&&(S.mode==='hub'||S.mode==='tohub')){ const p=tv[1].set(0,0,0).project(hubCam), behind=p.z>1, sx=(p.x*.5+.5)*W, sy=(-p.y*.5+.5)*H;
      if(!behind&&sx>40&&sx<W-40&&sy>70&&sy<H-60){ tv[2].setFromMatrixColumn(hubCam.matrixWorld,0).multiplyScalar(SEAL).project(hubCam); const sz=clamp(Math.abs((tv[2].x-p.x)*.5*W)*2,40,170);
        H_.style.display=''; H_.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; H_.style.setProperty('--s',sz.toFixed(0)+'px'); H_.classList.add('near'); H_.classList.toggle('flip',sx>W-200); H_.classList.toggle('low',sy-sz/2<74);
        HE.style.display='none'; }
      else { H_.style.display='none';
        let dx=sx-W/2, dy=sy-H/2; if(behind){dx=-dx;dy=-dy;} const a=Math.atan2(dy,dx), k=Math.min(hw/Math.max(1e-6,Math.abs(Math.cos(a))),hh/Math.max(1e-6,Math.abs(Math.sin(a))));
        if(HE.style.display==='none'||!HOLE.ew){ HE.style.display=''; HOLE.ew=HE.offsetWidth||110; }
        _edges.push({s:HOLE,a,x:W/2+Math.cos(a)*k,y:H/2+Math.sin(a)*k}); } }
    else { if(H_.style.display!=='none') H_.style.display='none'; if(HE.style.display!=='none') HE.style.display='none'; } }
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
  if(S.sealK<1){ rx.strokeStyle='rgba(255,195,146,'+(.5+.5*Math.sin(S.t*4)).toFixed(2)+')'; rx.lineWidth=2; rx.beginPath(); rx.arc(0,0,1.43*k+8+3*Math.sin(S.t*4),0,TAU); rx.stroke(); rx.lineWidth=1.5; }
  else { rx.strokeStyle='rgba(255,86,54,.55)'; rx.setLineDash([3,4]); rx.beginPath(); rx.arc(0,0,SEAL*k,0,TAU); rx.stroke(); rx.setLineDash([]); }
  peerList.forEach(p=>{ const pr=p.presence||{}; if(p.sameTab||typeof pr.x!=='number') return; rx.fillStyle='rgba(255,195,146,.8)'; rx.fillRect(pr.x*k-2,pr.z*k-2,4,4); });
  STA.forEach(s=>{ const x=s.pos.x*k, y=s.pos.z*k; rx.globalAlpha=.2+.8*s.wake; rx.fillStyle=s.color; rx.beginPath(); rx.arc(x,y,S.ap===s?9:7,0,TAU); rx.fill();
    if(S.docked.has(s.id)){ rx.strokeStyle=s.color; rx.beginPath(); rx.arc(x,y,12,0,TAU); rx.stroke(); }
    if(S.ap===s){ rx.strokeStyle='#fff'; rx.setLineDash([4,4]); rx.beginPath(); rx.moveTo(S.probe.p.x*k,S.probe.p.z*k); rx.lineTo(x,y); rx.stroke(); rx.setLineDash([]); } rx.globalAlpha=1; });
  const P=S.probe; rx.save(); rx.translate(P.p.x*k,P.p.z*k); rx.rotate(-P.head+Math.PI); rx.fillStyle='#fff'; rx.beginPath(); rx.moveTo(0,10); rx.lineTo(6,-6); rx.lineTo(0,-2); rx.lineTo(-6,-6); rx.closePath(); rx.fill(); rx.restore();
  rx.restore();
  rx.fillStyle='rgba(238,233,223,.5)'; rx.font='900 16px "Doto", monospace'; rx.textAlign='center'; rx.fillText('▲',cx,16);
}
rc.addEventListener('click',e=>{
  const b=rc.getBoundingClientRect(), sc=rc.width/b.width; let x=(e.clientX-b.left)*sc-rc.width/2, y=(e.clientY-b.top)*sc-rc.width/2;
  const c=Math.cos(-S.yaw), s=Math.sin(-S.yaw); const wx=x*c-y*s, wy=x*s+y*c; const k=(rc.width/2-16)/RB;
  let best=null, bd=40; STA.forEach(st=>{ if(st.wake<.5) return; const d=Math.hypot(st.pos.x*k-wx,st.pos.z*k-wy); if(d<bd){bd=d;best=st;} });
  if(holeOpen()&&Math.hypot(wx,wy)<Math.min(bd,34)) best=null;   // the hole on the map is a place to fly to, not a button
  if(best) autopilot(best);
});
function updateQuest(){}

/* ---------- docking: fly in, iris open into the station world ---------- */
let TR=null;
function dock(s){
  if(S.mode!=='hub') return;
  const st=ST[s.id]; if(!st) return;
  S.mode='docking'; S.ap=null; U.apLine.visible=false; S.near=null; callOff(); A.hush(); A.update(S.t,{sub:0,pad:0}); A.swell(); cine(true); guide('off');
  if(S.lead){ S.lead=null; if(s.id==='ae'){ S.leadDock=true; st.el.classList.add('first','fguard'); document.documentElement.classList.add('firstdock');
    setTimeout(()=>st.el.classList.remove('fguard'),3400); } }   // the card comes up where the story's Skip was: a second click must not land on it
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
  if(S.mode!=='station'||S.fin) return;
  if(S.stId==='cr') return leaveEarth(); // Earth is past the horizon, not a station in orbit
  const s=STA.find(x=>x.id===S.stId), st=S.st;
  // leaving Aetos the first time, played or not: from here on the contact inside the horizon is what you are after
  if(S.leadDock){ S.leadDock=false; S.push=true; document.documentElement.classList.remove('firstdock'); setTimeout(()=>{ if(!(S.mode==='station'&&S.stId==='ae')) st.el.classList.remove('first'); },800); }
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
  if(t>=2.4){ S.mode='hub'; TR=null; hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion); S.pulseT=Math.max(S.pulseT,1.4);
    if(holeOpen()&&S.sealK>=1) sealBreak(); else if(S.push&&!S.been) guide('big'); }
}

/* ---------- the stations are silent. Once the horizon is open, the one thing in the system that calls is the unidentified
   contact inside it: a low pulse and a radar's thin return, from the side where the hole is, quicker and louder as you
   close in. You steer by it ---------- */
const _cp=new T.Vector3();
function callOff(){ S.pulseT=Math.max(S.pulseT,1.2); }
function holeCall(dt){
  if(S.sealK>=1||SB.t>=0||S.mode!=='hub'){ A.contactBed(0); return; }
  const P=S.probe, r=Math.hypot(P.p.x,P.p.z), near=1-sstep(2.6,RB-3,r), quiet=S.been?.55:1;
  _cr.setFromMatrixColumn(hubCam.matrixWorld,0); _cp.set(-P.p.x,0,-P.p.z); const pan=clamp(_cp.dot(_cr)/Math.max(r,.5)*1.3,-1,1);
  A.contactBed((.016+.07*near*near)*quiet,near,pan);
  S.pulseT-=dt; if(S.pulseT>0) return;
  S.pulseT=lerp(2.5,1.05,near);
  A.contact(pan,(.03+.05*near)*quiet,(1-.2*near)*(.92+Math.random()*.16)); S.pulses++;
}

/* ---------- the one thing to do, on the screen: big in the middle when it is new, one line at the foot once you are on
   your way, gone once you are through. Out of the story it is Aetos: its radar has you, fly to it ---------- */
const GD=$('#guide'), GDe=$('#guideE'), GDh=$('#guideH'), GDk=$('#guideK');
const CTRL=FINE?'W A S D to fly · drag to look':'Drag anywhere to fly', LEADK=FINE?'Hold W to fire the thruster · drag to look':'Drag up to fire the thruster';
function setGuide(e,h,k){ GDe.textContent=e; GDh.removeAttribute('data-sp'); GDh.textContent=h; prepPW(GDh); GDk.textContent=k; GDk.hidden=!k; }
function guide(st){ if(S.guide===st) return; const was=S.guide; S.guide=st; S.guideT=S.t; S.guideGo=false; S.guideRv=''; $('#hub').classList.toggle('guided',st==='big'); A.muffle(st==='big');
  if(st==='off'){ GD.classList.remove('on','small'); unreveal(GD); return; }
  GD.classList.toggle('to-ae',!!S.lead); $('#guideL').textContent=S.lead?'Fly to Aetos':'Fly into the black hole';
  if(st==='lead') setGuide('Aetos · radar · unidentified contact','Fly to Aetos',LEADK);
  else if(st==='big') setGuide('Unidentified contact · inside the horizon','Fly into the black hole',S.been||S.flown?'':CTRL);
  GD.classList.remove('lead','big','small'); GD.classList.add(st,'on');
  if(st==='small'){ if(!S.lead) S.flown=true; GD.classList.remove('off'); }   /* flying to Aetos does not count: the hole still shows its controls once */
  else { reveal(GD); if(was==='small') GD.classList.remove('small'); }
}

/* ---------- the seal breaking: the first time you come back from a station, the ring round the horizon strains, cracks and lets go.
   One wave runs out across the whole system. ---------- */
const SB={t:-1,look:0}, OPENTINT=new T.Color(0,.025,.06);
function sealBreak(){ if(SB.t>=0||S.sealK<1) return; SB.t=0; SB.crack=SB.chord=SB.said=false; A.strain(); }
function sealUpdate(dt){
  if(SB.t<0){ SB.look=damp(SB.look,0,3,dt); return; }
  SB.t+=dt; const t=SB.t;
  SB.look=sstep(0,.8,t)*(1-sstep(3.4,4.6,t));
  if(t<1){ U.sealU.uNear.value=Math.max(U.sealU.uNear.value,sstep(0,.95,t)); S.shake=Math.max(S.shake,.16*sstep(.2,1,t)); A.roar(.22*sstep(0,1,t)); }
  else if(!SB.crack){ SB.crack=true; S.sealK=0; U.shardU.uT.value=0; U.gridU.uShock.value=SEAL; A.roar(0); A.crack(); A.boom(); S.flash=Math.max(S.flash,.3); feedback(.6,1.6,OPENTINT); }
  if(SB.crack){ const k=t-1; U.shardU.uT.value=k; U.gridU.uShock.value=k<2.8?SEAL+k*11:-9;
    const wr=SEAL+k*11; STA.forEach(s=>{ if(s.wakeT<1&&wr>=s.R) s.wakeT=1; });   // the system wakes as the wave goes through it
    if(k>1.2&&!SB.chord){ SB.chord=true; A.chord(); }
    if(k>1.45&&!SB.said){ SB.said=true; if(S.push&&!S.been) guide('big'); }
    if(k>3.6){ U.shardU.uT.value=-1; SB.t=-1; STA.forEach(s=>s.wakeT=1); } }
}

/* ================= STORY: four chapters, one gesture each ================= */
const CH=[ // camera shots of the hole: position, look-at, field of view, drift
  {p:[4.95,1.0,14.3],l:[-2.5,-.55,0],f:30,dr:.5,sys:0,narP:[0,2.2,22],narL:[0,-2.2,0]},
  {p:[3.4,2.6,6.9],l:[-2.4,-.9,0],f:38,dr:.35,sys:0,narP:[0,3.4,12.5],narL:[0,-2,0]},
  {p:[10.1,54,52],l:[-10.1,-5,5],f:34,dr:.15,sys:1,narP:[0,81,44],narL:[0,-2.5,-1.7]},   // the whole system, now a little smaller
  {p:[1.05,.24,1.95],l:[-.25,.08,0],f:64,dr:.12,sys:0,narP:[.3,.42,3.3],narL:[-.05,.3,0]}
];
const story={busy:0,acc:0,from:mkPose(),to:mkPose(),k:1,blocks:$$('#story .ch'),rail:[],creep:0,px:0,py:0};
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
  $('#cue').style.opacity=i===0?1:0; // later chapters carry their own line
  A.stinger(i); A.whoosh(i>prev,1.2,.12); if(i===3){ A.alarm(); story.creep=0; }
  where(['Approach','Builders','System','Too close'][i]);
}
function escape(){
  if(S.mode!=='story') return; unreveal(story.blocks[S.ch]); $('#prox').classList.remove('on'); $('#cue').style.opacity=0;
  A.boom(); A.launch(); S.flash=.9; feedback(1.2,1.6); setTimeout(()=>{ show('#story',false); },300); toHub(!S.docked.has('ae'));
}
/* One chapter per gesture. Trackpads keep sending decaying "momentum" wheel events after the fingers lift, so a new
   gesture is either a quiet gap or a clear rise in strength; everything else after a chapter change is ignored. */
const wh={last:0,peak:0,armed:true};
addEventListener('wheel',e=>{
  if(S.mode!=='story') return; e.preventDefault(); if(S.wheelSettle) return;
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
if(!FINE){ $('#cue').innerHTML='<i></i>Swipe up to fall in'; $$('#story .tease').forEach(el=>{ el.textContent=el.textContent.replace(/^Scroll/,'Swipe up'); }); }

/* ================= THE END OF THE LAST FLIGHT =================
   The last flight ends over Earth. You hold to launch, the rocket climbs through the clouds until the sky goes black, and
   the camera rises above it to look back down at the town; then the light takes over, and a white page: who made this,
   and why. (Earth runs all of that itself and calls finaleWhite at the end.) */
const holdEl=$('#holdp'), finEl=$('#fin');
/* Earth hands over here, already white: it puts itself back as it was behind the page */
function finaleWhite(){ if(S.mode==='credits') return; const st=ST.cr;
  if(st){ st.finaleEnd&&st.finaleEnd(); st.abort(); st.hideUI(); show('#station',false); st.el.classList.remove('on'); st.exit(); }
  S.st=null; S.stId=null; S.iris=0; credits(); }

/* the white page */
function credits(){ if(S.mode==='credits') return; S.mode='credits'; S.flashMin=1; post.uniforms.uFlash.value=1; post.uniforms.uLight.value.z=1;   /* the white of the page itself */
  A.hush(); A.update(S.t,{sub:0,pad:.45,bright:.18}); A.credits(); holdEl.classList.remove('on','go');
  $('#finAgain').textContent=S.entry==='fly'?'Fly again':'Fly the whole thing';
  finEl.hidden=false; requestAnimationFrame(()=>finEl.classList.add('on')); }
/* again, from the very beginning: the whole flight, whichever way you came in */
/* Fly again, or the whole thing from the start: the same page with no way in on its address. A preview built to open on
   Land or Aetos has the whole thing somewhere else, so it opens that */
const FLY_URL="";
$('#finAgain').addEventListener('click',()=>{ if(FLY_URL){ window.open(FLY_URL,'_blank','noopener'); return; }
  if(PRETTY){ location.assign(PAGE_URL); return; }   /* on the site, back to the page's own address: /fly would go home */
  if(location.hash) history.replaceState(null,'',location.pathname+location.search); location.reload(); });
$('#finWalk').addEventListener('click',()=>{ A.hush&&A.hush(); });

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
      const B=Math.max(best,o.assisted?0:o.score); const bEl=$('#'+id+'Best'); if(bEl) bEl.textContent=B>0?'Best '+fmt(B):'';
      const gEl=$('#'+id+'G'); gEl.removeAttribute('data-sp'); gEl.classList.add('pw'); gEl.textContent=o.grade; $('#'+id+'Final').textContent=fmt(o.score);
      const nw=$('#'+id+'New'); if(nw) nw.textContent=o.assisted?'Assisted':isNew?'New best':'Best '+fmt(best);
      $('#'+id+'Stats').innerHTML=statsHTML(o.stats); $('#'+id+'P').textContent=o.text||'';
      prepPW(gEl); this.setState('res'); reveal($('.res',el)); S.games++; S.played.add(id);
      // a finger still tapping the game must not land on the panel that just appeared under it
      el.classList.add('rguard'); clearTimeout(this._rg); this._rg=setTimeout(()=>el.classList.remove('rguard'),750);
    },
    build(){}, enter(){}, exit(){}, update(){}, play(){}, abort(){}
  },impl);
  { const bEl=$('#'+id+'Best'), b=store.get(id,0); if(bEl) bEl.textContent=b>0?'Best '+fmt(b):''; } // no 'Best 0' before a first game
  // the index on the title card follows the order of the stations in orbit
  { const si=STA.findIndex(s=>s.id===id), ix=$('.idx span:first-child',el); if(ix&&si>=0) ix.textContent=String(si+1).padStart(2,'0')+' / '+String(NST).padStart(2,'0'); }
  st.start=()=>{ if(S.mode!=='station'||S.stId!==id) return; const f=document.activeElement; if(f&&f!==document.body&&!f.matches('input,textarea,select')) f.blur(); A.stinger(2); A.whoosh(true,.8,.14); st.play(); };
  $$('[data-play]',el).forEach(b=>b.addEventListener('click',st.start));
  $$('[data-back]',el).forEach(b=>b.addEventListener('click',()=>undock()));
  // every station sits in the same sky: a sparse starfield with a faint warm haze toward the hole
  st.scene.add(pts(cloud(Math.floor(1800*Q+400),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),R=90+r[2]*40;o[0]=Math.sin(b)*Math.cos(a)*R;o[1]=Math.cos(b)*R;o[2]=Math.sin(b)*Math.sin(a)*R;}),
    PM({size:.75,color:'#E8DECF',body:'b=.14+.7*pow(aR.x,7.); col=mix(uCol,vec3(.75,.84,1.),aR.y*.6);'})));
  // annotation leader lines
  st.notes=$$('.note',el); const nl=$('.notes',el); st.noteOff=st.notes.length===2?1:0; // two notes: they describe anchors 1 and 2
  st.leads=st.notes.map(()=>{ const h=document.createElement('i'); h.className='ld h'; const d=document.createElement('i'); d.className='ld d'; const p=document.createElement('i'); p.className='ld p'; nl.appendChild(h); nl.appendChild(d); nl.appendChild(p); return {h,d,p}; });
  ST[id]=st; return st;
}
function notesUpdate(st){
  if(!st.notes||!st.notes.length||NARROW()) return;
  const W=innerWidth, H=innerHeight, nw=Math.min(250,W*.22), x0=W-nw-54;
  let y=H*.2; const gap=Math.max(26,H*.05);
  st.notes.forEach((n,i)=>{ if(!n._h) n._h=n.offsetHeight||70; n.style.transform=`translate(${x0}px,${y}px)`; const a=st.anchors[i+st.noteOff], L=st.leads[i];
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
    R("No, it's a cold call, I'm afraid. It's about coaching at your scale. Have you a minute?",2,12,8,"Honest, and about her job. She gives you the minute."),
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
st.anchors=[new T.Vector3(0,RING,0),new T.Vector3(Math.cos(Math.PI/2-TAU/NB)*RING,Math.sin(Math.PI/2-TAU/NB)*RING,0),new T.Vector3(RO*.98,-.1,0)];

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
  E.hint.textContent=FINE&&g.bi===0?'Pick a reply · keys 1, 2, 3':''; // shown on the first turn only
  E.time.classList.remove('low'); E.bar.style.transform='scaleX(1)';   // the clock starts full, not where the last turn's ran out
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
  if(q===0&&k>=0&&!g.worst) g.worst={i:g.bi,n:note};   // a misread you said; going quiet has its own line in the results
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
  E.time.classList.remove('low'); g.ph='show'; g.t=0; setPh('show'); E.hint.textContent=FINE&&g.bi===0?'Space to skip ahead':'';
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
function layout(force){ const n=NARROW(), side=innerHeight<=520&&innerWidth/innerHeight>=.9, low=innerWidth/innerHeight<.9&&innerHeight<=760, key=n+'|'+side+'|'+low+'|'+st.state; if(!force&&key===lay) return; lay=key; const play=st.state!=='menu';
  // in a call the room sits in the gap between the buyer's line and the replies (held sideways, the stylesheet's short shape: a strip)
  if(side&&play){ st.camP.set(0,.2,13); st.camL.set(0,.17,0); }
  else if(low&&play){ st.camP.set(0,-.05,18.5); st.camL.set(0,-.1,0); }   // a shorter phone held upright: a smaller room, higher, clear of the replies
  else if(n){ if(play){ st.camP.set(0,.85,16.5); st.camL.set(0,.8,0); } else { st.camP.set(0,.35,12.5); st.camL.set(0,-.15,0); } }
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

let clk=0, sw=0, game=null, nextId=1, tblT=0, attractT=2, lastIdS=0, layoutKey='', menuDemo=null, aimOn=false, hintT=0, bigK=1.12;
const V=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3(), V4=new T.Vector3(), V5=new T.Vector3();
const M4=new T.Matrix4(), M5=new T.Matrix4(), Qn=new T.Quaternion(), EU=new T.Euler(), SCL=new T.Vector3(), ZF=new T.Vector3(0,0,1), TC=new T.Color();

/* pools: contacts, swarm groups, interceptors, scope paints, ground events */
const D=[...Array(MAXD)].map((_,i)=>({i,on:false,p:new T.Vector3(),v:new T.Vector3(),q:new T.Quaternion(),goal:new T.Vector3(),off:new T.Vector3(),
  type:'scout',cls:'unk',hp:1,id:0,site:0,grp:null,ph:0,yaw:0,yawR:0,roll:0,pitch:0,jam:0,jamHit:false,fall:false,vy:0,spin:0,eng:0,idT:-1,reacted:false,
  demo:false,loiter:false,tk:null,sx:0,sy:0,vis:false,hov:false,rowHov:false,tti:99,flash:0,dmgT:-9,age:0,rel:-1}));
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
    float up=n.y*.5+.5, fr=((1.-abs(dot(n,V)))*(1.-abs(dot(n,V))));
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
    gl_FragColor=vec4(vec3(.65,.76,1.)*uA*((1.-y)*(1.-y)*(1.-y))*s*.32,1.); }`});
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
let GU, labTex, labMode=-1, cpAnt, cpMat, inst, rot, rotSp, lights, lP, lC, lS, drops, dP, dC, msl, trails, tP, tC, puffs, pP, pA, pC, pV, pL, pI=0, debris, jamWall;
const NL=MAXD*3+MAXM+1;
function drawLabels(mob){
  if(!labTex||labMode===+mob) return; labMode=+mob;
  const N=2048, cv=document.createElement('canvas'); cv.width=cv.height=N; const x=cv.getContext('2d',{willReadFrequently:true}), k=N/(2*LR); x.fillStyle='#000'; x.fillRect(0,0,N,N); x.fillStyle='#fff'; x.textBaseline='middle';
  const fs=mob?38:22, sy=mob?1.1:1.3; x.font=`900 ${fs}px "Doto", monospace`; x.strokeStyle='#fff'; x.lineWidth=Math.max(1,fs*.06); x.lineJoin='round';
  // labels near the camera (south, +z) are drawn smaller so that perspective leaves them all about the same size
  const put=(t,wx,wz,al)=>{ const f=clamp(1-wz*(mob?.022:.045),.68,1.32); x.save(); x.translate(N/2+wx*k,N/2+wz*k); x.scale(f,sy*f); x.textAlign=al; x.strokeText(t,0,0); x.fillText(t,0,0); x.restore(); };
  for(let a=0;a<360;a+=mob?90:30){ const b=a*Math.PI/180, rr=mob?RS-.46:RS+.5+.08*Math.max(0,-Math.cos(b)); put(String(a).padStart(3,'0'),Math.sin(b)*rr,-Math.cos(b)*rr,'center'); }
  for(let km=1;km<=5;km++){ if(mob&&km%2===0) continue; const rr=km*KM-(mob?.24:.14), b=42*Math.PI/180; put(km+' km',Math.sin(b)*rr+.06,-Math.cos(b)*rr,'left'); }
  /* the ground reads only the red of the labels, so the card keeps just that channel: the same labels in a quarter of the
     memory. Rows go bottom up, as the canvas would have been turned for the card, and the canvas itself is let go */
  const px=x.getImageData(0,0,N,N).data, r=labTex.image.data;
  for(let j=0;j<N;j++){ const src=(N-1-j)*N*4, dst=j*N; for(let i=0;i<N;i++) r[dst+i]=px[src+i*4]; }
  cv.width=cv.height=0;
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
  try{ await Promise.race([document.fonts.load('900 20px "Doto"'),wait(1500)]); }catch(e){}
  labTex=new T.DataTexture(new Uint8Array(2048*2048),2048,2048,T.RedFormat,T.UnsignedByteType); labTex.generateMipmaps=true; labTex.minFilter=T.LinearMipmapLinearFilter; labTex.magFilter=T.LinearFilter;
  labTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); drawLabels(false);
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
  demo:!game,loiter:false,tk:null,hov:false,rowHov:false,tti:99,flash:0,dmgT:-9,age:0,roll:0,pitch:0,yawR:0,cruise:1,dive:false,rel:-1}); d.v.set(0,0,0); }
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
  if(!g.n){ g.on=false; dropTK(g.tk); g.tk=null; return null; }   // no airframe was free: no empty swarm left on the table
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
// the pools are reused: a row fires only at the track it shows, never at whatever took its slot since the table was drawn
function rowEngage(r){ if(!game||st.state!=='play') return; const d=r.g?(r.g.on&&r.g.id===r.id?groupLead(r.g):null):(r.d&&r.d.id===r.id?r.d:null); if(d&&d.on) engage(d); else A.beep(220); }
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
  { const g0=game; setTimeout(()=>{ if(game===g0) hideHint(); },9000); } // the instruction fades after the first engagement or a few seconds
  st.setState('play'); nextWave(); tblT=0;
};
st.abort=function(){ game=null; if(pL) clearAll(); warnEl.classList.remove('on'); topEl.classList.remove('thr'); HUD.warnOn=false; };
let bootT=1;
st.enter=function(){ st.abort(); st.setState('menu');
  // a hidden button elsewhere (the loader's Enter keeps focus after a keyboard entry) must not swallow Enter on this title
  const ae=document.activeElement; if(ae&&ae!==document.body&&!el.contains(ae)&&ae.blur) ae.blur();
  resetSites(); nextId=1; bootT=0; { const b=store.get('ae',0); $('#aeBest').textContent=b>0?'Best '+fmt(b):''; } attractT=.4; layoutKey='';
  for(let k=0;k<3;k++){ const d=k===1?spawnFriend():spawnHostile('scout'); if(d){ const a=Math.random()*TAU, r=3.4+Math.random()*1.6; d.p.x=Math.sin(a)*r; d.p.z=-Math.cos(a)*r; } } };
st.exit=function(){ st.abort(); };

/* ---------- per frame: sweep, missiles, effects ---------- */
// d.rel is how far the sweep still has to turn to reach a contact; when it jumps by more than half a turn the line has
// passed it, even if the contact slipped back across the line inside one frame and so never sat in the swept slice
function sweepPaint(s0,s1){
  const wrap=s1<s0;
  for(const d of D){ if(!d.on) continue; const b=brg(d.p.x,d.p.z), rel=(b-s1+TAU)%TAU, was=d.rel; d.rel=rel;
    const out=Math.hypot(d.p.x,d.p.z)>RS+.25;
    if(wrap?(b<=s0&&b>s1):(b<=s0||b>s1)){ if(!out&&d.cls==='unk'&&was>=0&&rel>was+Math.PI) identify(d,false); continue; }
    if(out) continue;
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
  let n=0; const big=bigK;
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
    r.d=e.d; r.g=e.g; r.id=e.g?e.g.id:e.d.id; const d=e.d||groupLead(e.g)||null, cls=e.g?e.g.cls:e.d.cls, eng=d&&d.eng>0, jm=d&&d.jam>0;
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
  const W=innerWidth, H=innerHeight, rw=Math.max(60,rect[2]-rect[0]), rh=Math.max(60,rect[3]-rect[1]); FC.fov=stCam.fov; FC.aspect=W/H; FC.updateProjectionMatrix();
  let Dd=18, tx=0, tz=0;
  for(let it=0;it<60;it++){
    FC.position.set(tx,Math.sin(el)*Dd,tz+Math.cos(el)*Dd); FC.lookAt(tx,0,tz); FC.updateMatrixWorld();
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(let k=0;k<40;k++){ const a=k/40*TAU; FV.set(Math.cos(a)*R,0,Math.sin(a)*R).project(FC); const sx=(FV.x*.5+.5)*W, sy=(-FV.y*.5+.5)*H; x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy); }
    const bw=x1-x0, bh=y1-y0; Dd*=Math.pow(Math.max(bw/rw,bh/rh),.6);
    tx+=((x0+x1)/2-(rect[0]+rect[2])/2)/(bw/(2*R))*.6; tz+=((y0+y1)/2-(rect[1]+rect[3])/2)/(bh/(2*R))*.6;
  }
  o.D=Dd; o.tx=tx; o.tz=tz; o.el=el;
}
function layout(){
  const W=innerWidth, H=innerHeight, key=W+'x'+H; if(key===layoutKey) return; layoutKey=key;
  /* the stylesheet's three shapes: a short screen held sideways, a narrow or upright one, and the rest. Sideways the table
     and the arm stand in a column on the right and the scope takes what is left, below the Orbit button */
  const side=H<=520&&W/H>=.9, mob=!side&&(W<=820||W/H<.9);
  drawLabels(mob||side); GU.uLab.value=mob||side?.62:.5; bigK=mob||side?1.35:1.12;
  if(side){ const r=[30,112,W-350,H-10]; solveFrame(FR.play,clamp(Math.asin(Math.min(1,(r[3]-r[1])/(r[2]-r[0]))),.8,1.22),RS+.3,r); solveFrame(FR.menu,.5,3.6,[W*.3,50,W-24,H-70]); }
  else if(mob){ solveFrame(FR.play,1.22,RS+.3,[8,H*.2,W-8,H-292]); solveFrame(FR.menu,.74,3.9,[0,H*.46,W,H-110]); }
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
st._dbg={get game(){return game}, D, GP, MS, SITES, engage, jam, end, pick, rowEngage, ROWS, flow, get clk(){return clk}, pause(v){ paused=!!v; },
  K:{JAMR,JAMCD,AMMO,RELOAD,RS,SPAWN,SWEEP,WAVES,TYPES}};
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
      float v=clamp(aV,0.,1.), e=1.-((1.-k)*(1.-k)*(1.-k)); vec3 q=vec3((mp.x-.5)*${PW}.,aH+.012+uLift*pow(v,1.9)*e,(mp.y-.5)*${PW}.);`;
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
  if(n!==FN||!vig){ FN=feedCv.width=feedCv.height=n; const [c,x]=cv2(n); const g=x.createRadialGradient(n/2,n/2,n*.18,n/2,n/2,n*.74); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.78)'); x.fillStyle=g; x.fillRect(0,0,n,n); vig=c;
    if(F&&game) drawFeed(F); } } // a new size clears the canvas: put the frame back, or a phone turned while matching shows nothing to match
{ const [c,x]=cv2(128), im=x.createImageData(128,128); for(let i=0;i<im.data.length;i+=4){ const v=Math.random()*255; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; } x.putImageData(im,0,0); noiseC=c; }
const lay={cx:0,cy:0,d:400,stack:false,side:false};
const AIM_T='Drag the square over the map until it matches the camera, then let go', AIM_M='Move the square over the map until it matches the camera, then click', AIM_K='Or arrow keys and Enter';
function measure(){ const W=innerWidth, H=innerHeight, f=$('#phF').getBoundingClientRect(), top=Math.min(H*.2,140);
  /* the words under the map change through a fix: the map is framed for them as they stand while you aim (the first fix's,
     with its line of keys), not as they happened to read when this ran, which left the circle under them in some games */
  const h0=D.help.textContent, k0=D.keys.textContent; D.help.textContent=TOUCH?AIM_T:AIM_M; D.keys.textContent=TOUCH?'':AIM_K;
  const hb=q('.gbc').getBoundingClientRect(), gl=q('.gtl').getBoundingClientRect(); D.help.textContent=h0; D.keys.textContent=k0;
  const helpTop=Math.min(H-70,hb.top||H-80);
  lay.side=H<=520&&W/H>=.9;
  if(lay.side){ lay.stack=false; const x0=Math.max(gl.right,hb.right)+18, x1=f.left-22, y0=40, y1=H-14;   // a phone held sideways: a column of HUD each side, the map between (station.css)
    lay.cx=(x0+x1)/2; lay.cy=(y0+y1)/2; lay.d=Math.min((x1-x0)*.94,(y1-y0)*.9); }
  /* the phone's layout (station.css) puts the map under the camera, with room above the circle for its label; a tall desktop
     window keeps the map beside the camera, as its HUD is laid out */
  else if(NARROW()&&f.bottom<H*.5){ lay.stack=true; const y0=f.bottom+28, y1=helpTop-10; lay.cx=W/2; lay.cy=(y0+y1)/2; lay.d=Math.min(W*.94,(y1-y0)); }
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
function stageUI(s){ stg.forEach((li,i)=>{ li.classList.toggle('on',i===s); li.classList.toggle('done',i<s); }); D.cap.textContent=CAPS[s]; if(s<3&&(lay.stack||lay.side)&&F&&F.phase==='feed') setHelp(SHORT[s],F.r===1?'':TOUCH?'Tap the camera to skip':'Click the camera or press Space to skip'); }

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
function toMatch(){ if(!F||F.phase!=='feed') return; F.stage=3; F.st=0; F.phase='aim'; D.ff.classList.add('aim'); if(game&&F.r<ROUNDS&&!prepJob) prepJob=prepFix(F.r+1,game.avoid); stageUI(3); drawFeed(F); teleText(F,true); D.box.removeAttribute('data-cur'); curReset(); A.chime(4); // (the cursor would keep the camera's Skip label out over the map)
  vis(D.ring,true); cursorAim(true); if(!aim.want){ aim.x=F.cx; aim.y=F.cy; aim.want=1; aim.kb=false; } // the tool is visible before you move
  setHelp(TOUCH?AIM_T:AIM_M,TOUCH?'':(F.r===1?AIM_K:'')); }
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
  game={r:0,score:0,list:[],trusted:0,close:0,wrong:0,spoofed:0,gnss:0,avoid:[],from:0,cnt:1,k0:performance.now()}; D.score.textContent='0';
  st.setState('play'); U.uMenu.value=0;
  A.jam(); feedback(0,1.1);
  const n=pend; pend=null; startFix(n);
  measure(); // once the fix is on the screen: the camera's stage line is lit, and the panel is as tall as it will be
};
st.abort=function(){ game=null; F=null; cursorAim(false); D.ff.classList.remove('aim'); hideMarks(); vis(D.next,false); if(U){ U.uOn.value=0; U.uHeat.value.w=0; U.uFoot.value.w=0; U.uLock.value.w=0; U.uHover.value.w=0; } if(beam) beam.visible=false; prepJob=null; aim.drag=false; };
function menuLoiter(){ const nar=NARROW(); drone.C.set(nar?.2:-.9,0,nar?2.6:-1.6); drone.r=nar?1.25:1.75; drone.alt=nar?1.6:2.05; }
st.enter=function(){ st.abort(); st.setState('menu'); U.uMenu.value=1; menuLoiter(); drone.cw=1; drone.p.set(drone.C.x+drone.r,drone.alt,drone.C.z); drone.yaw=Math.PI; { const b=store.get('ph',0); $('#phBest').textContent=b>0?'Best '+fmt(b):''; } measure(); if(!pend&&!prepJob&&!mapJob) prepJob=prepFix(1,[]); };
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
// (a key pressed before the game began, the Enter that started it from the title, is not also a press inside it)
addEventListener('keydown',e=>{ if(S.mode!=='station'||S.st!==st||st.state!=='play'||!F||(game&&e.timeStamp<game.k0)) return; if(e.target.closest&&e.target.closest('input,textarea,a')) return;
  if(e.code==='Enter'||e.code==='Space'){ e.preventDefault(); if(e.repeat) return;
    if(F.phase==='aim'){ if(aim.want&&aim.kb) commit(aim.x,aim.y); else { if(!aim.want){ aim.x=F.cx; aim.y=F.cy; } aim.want=1; aim.kb=true; A.tick(); } }
    else if(F.phase==='feed') toMatch(); else if(F.phase==='reveal'&&D.next.classList.contains('on')) nextFix(); }
  else if(F.phase==='aim'&&/^(Arrow|Key[WASD]$)/.test(e.code)){ e.preventDefault(); if(!aim.want){ aim.x=F.cx; aim.y=F.cy; } aim.want=1; aim.kb=true; } });
D.next.addEventListener('click',nextFix);
D.box.addEventListener('click',()=>{ if(F&&F.phase==='feed') toMatch(); });
/* the title's side notes are stacked by the height they had when first laid out (station framework): on a new size, or once
   shown again after the sideways layout hid them, they are measured afresh, or they run into each other */
addEventListener('resize',()=>{ st.notes.forEach(n=>{ n._h=0; }); if(S.st===st) measure(); });

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
      // the wave runs out from the guess until it has crossed the whole circle, however far outside it the guess was
      U.uWave.value.z=E.o(clamp(rt/1.05,0,1))*(Math.max(F.R*2.3,Math.hypot(F.px-F.cx,F.py-F.cy)+F.R+72)/MAP); U.uWave.value.w=1-sstep(.8,1.1,rt); latU.uLift.value=1.25*E.o(clamp(rt/1.2,0,1));
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
    U.uOn.value=damp(U.uOn.value,0,3,dt); U.uHover.value.w=0; U.uHeat.value.w=damp(U.uHeat.value.w,0,3,dt); U.uFoot.value.w=damp(U.uFoot.value.w,0,3,dt); U.uLock.value.w=damp(U.uLock.value.w,0,3,dt);
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
function drawLabel(sp,text,color,px,align){ const {c,x,tex}=sp.userData; x.clearRect(0,0,c.width,c.height); x.font='900 '+Math.round(px*.92)+'px "Doto", monospace'; x.fillStyle=x.strokeStyle=color; x.lineWidth=Math.max(1,px*.05); x.lineJoin='round'; x.textBaseline='middle';
  x.textAlign=align||'left'; const tx=align==='right'?c.width-6:6; x.strokeText(text,tx,c.height/2+2); x.fillText(text,tx,c.height/2+2); tex.needsUpdate=true; } // the stroke fills the dots in, as in the page's text
const ladLabels=[];
{ const P=[], K=[]; P.push(0,0,0,0,52,0); K.push(.6,.6);
  for(let m=10;m<=520;m+=10){ const y=m*SCF, maj=m%50===0; P.push(0,y,0,maj?.6:.22,y,0); K.push(maj?1:0,maj?1:0); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aK',new T.Float32BufferAttribute(K,1));
  const m=new T.LineSegments(g,new T.ShaderMaterial({uniforms:ladU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform float uFocus; attribute float aK; varying float vA; void main(){ float y=position.y; vA=(.1+.5*exp(-(((y-uFocus)/6.5)*((y-uFocus)/6.5))))*(.45+.55*aK); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
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
    fragmentShader:`uniform float uOn,uHit,uNear; varying vec2 vP; void main(){ float r=length(vP); float a=(.01+.02*uNear+.07*uHit)*(1.-smoothstep(2.,10.4,r))+(.13+.3*uHit)*exp(-(((r-10.)/.12)*((r-10.)/.12))); gl_FragColor=vec4(vec3(1.,.7,.46)*a*uOn,1.); }`}));
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
      vec3 c=base*(.1+.17*f+.14*top)+base*((1.-f)*(1.-f))*.34; c*=1.-.3*seam; gl_FragColor=vec4(c*uOn,1.); }`})));
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
  const span=Math.round(D.g.s*1000+1e-6);   // 75 mm x 1.5 is 112.4999... in floating point; the biggest fins are 113 mm, as the slider says
  setT($o('HNv'),'L/D '+d.LD.toFixed(2)); setT($o('HFv'),span+' mm');
  hN.setAttribute('aria-valuenow',d.LD.toFixed(2)); hF.setAttribute('aria-valuenow',span);
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
  h.addEventListener('pointermove',e=>{ if(!drag||e.pointerId!==drag.id) return;
    if(phase!=='design'||busy||st.state!=='play'){ drag=null; h.classList.remove('drag'); return; }   // launched (or asked Ogive) mid-drag: the design is fixed from here
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
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
  launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); launchBtn.dataset.cur='Launch'; el.classList.remove('chute-ready','chute-now');
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
  launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); launchBtn.dataset.cur='Launch'; hN.classList.remove('used'); hF.classList.remove('used'); curReset(); requestAnimationFrame(layoutGauge); };
st.abort=function(){ searchId++; if(busy) finishAsk(); F=null; tw=null; setPhase('design'); W.visible=false; WU.value=0; BP.value=1; chute.visible=cord.visible=false; flame.visible=glow.visible=false; FL.value.w=0;
  stopSound(); slow(false); el.classList.remove('chute-ready','chute-now'); launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); launchBtn.dataset.cur='Launch'; };
st.enter=function(){ st.abort(); st.setState('menu'); syncUI(); snap=true; { const b=store.get('og',0); $o('Best').textContent=b>0?'Best '+fmt(b):''; } };
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
/* the design view: each layout has its own camera, and keeps it wherever the rocket at its biggest (the longest nose, the
   biggest fins) fits with its handles, its labels and the CG and CP rail clear of the HUD round it. Where it would not (a
   smaller phone, an iPad or a phone held sideways, a small window), the camera steps across just enough, or stands back
   until it all fits, at the same angle */
const FT={k:''};
const nudge=(s0,s1,lo,hi)=>s0<lo?Math.min(lo-s0,hi-s1):s1>hi?Math.max(hi-s1,lo-s0):0;   // the least move that brings [s0,s1] inside [lo,hi]
function designFrame(port){
  const W=innerWidth, H=innerHeight, side=!port&&H<520, key=W+'x'+H+(port?'p':side?'s':'l');
  const [cx0,ly0,dy0,D0]=port?[.06,DY-.62,.42,18.6]:side?[.1,DY-.62,.82,8.6]:[-.05,DY-.32,.72,9.1];
  if(FT.k===key) return FT;
  const r=e=>e.getBoundingClientRect(), L=r($('.ogtl',el)), B=r($('#back')), bar=r($('.ogbar',el)), foot=Math.min(bar.top,r(launchBtn).top)-8;
  if(!(L.width>0&&B.width>0&&bar.width>0)) return {cx:cx0,ly:ly0,cy:ly0+dy0,D:D0};   // not laid out yet: the usual camera, and look again next frame
  const t=Math.tan(stCam.fov*Math.PI/360), p0=H/(2*D0*t);
  let ppu=p0, cx=cx0, ly=ly0;   // ppu: pixels to a unit at the rocket; on the screen x=W/2+(X-cx)*ppu, y=H/2-(Y-ly)*ppu
  if(port){ // standing up, from the tail to the tip of the longest nose: under the target's lines (its handle sits 27 px above the tip) and above the design bar
    const y0=DY-2.55, y1=DY+2.76, top=r($('#ogTries').parentElement).bottom+27, bot=foot-14;
    ppu=Math.min(p0,(bot-top)/(y1-y0)); ly+=nudge(H/2-(y1-ly)*ppu,H/2-(y0-ly)*ppu,top,bot)/ppu;
  } else { // lying down: the tail clear of the target's column (held sideways, of the Orbit button), the nose's label clear of the
    // right edge (held sideways, of the target, top right), the fin handle's label above and the CG and CP rail below clear of the bar
    const x0=-2.6, x1=2.9, e=.87, xl=(side?B.right:L.right)+16, xr=side?Math.min(W-130,L.left-114):W-130, top=62, bot=foot-97;
    ppu=Math.min(p0,(xr-xl)/(x1-x0),(bot-top)/(2*e));
    cx-=nudge(W/2+(x0-cx)*ppu,W/2+(x1-cx)*ppu,xl,xr)/ppu; ly+=nudge(H/2-(DY+e-ly)*ppu,H/2-(DY-e-ly)*ppu,top,bot)/ppu;
  }
  FT.k=key; FT.cx=cx; FT.ly=ly; FT.D=H/(2*t*ppu); FT.cy=ly+dy0*FT.D/D0; return FT;
}
function camDesign(o,l,port,menu,t){
  if(menu){ if(port){ o.set(.35,DY+1.0,17.6); l.set(.35,DY+.22,0); } else { o.set(.62+Math.sin(t*.15)*.25,DY+.2,13.2); l.set(.62,DY-.22,0); } }
  else { const f=designFrame(port); o.set(f.cx,f.cy,f.D); l.set(f.cx,f.ly,0); } }
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
/* ================= EARTH =================
   What is on the other side of the hole: a small town on a small planet, where the three of us live. You come down
   through the sky in the rocket you flew in orbit, land on the pad and step out. You walk the way you fly: WASD or the
   arrows, or the stick on a touch screen; drag to look around. Ahroon is waiting by Aetos, Abraham is in the square by
   Kríos, Michael is up by Ogive. Walk up to one of us and we talk; click one of us for the photograph and LinkedIn.
   It is drawn rather than rendered: three tones of sunlight with real cast shadows, then a second pass finds the edges
   of things from depth and normals and inks them with a line that wanders a little, like a pen. */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,12,-10)});
st.land=false;   // Land: straight down to Earth without the flight, so we say hello without mentioning it
const sc=st.scene, el=st.el, hint=$('#crHint',el), labels=$$('#crLabels .crl',el);
sc.children.filter(o=>o.isPoints).forEach(o=>sc.remove(o)); // no night stars by day
const R=24, LO=Q<1, UPY=new T.Vector3(0,1,0), V=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3(), V4=new T.Vector3();
const C3=c=>c&&c.isColor?c:new T.Color().setStyle(c,T.LinearSRGBColorSpace); // display colours: this world skips the film curve
const SUN=new T.Vector3(.38,.8,.46).normalize();
const rnd=seeded(11);
const UPU={value:new T.Vector3(0,1,0)};

/* ---------- a map of the town on the sphere: x and z in metres from the square ---------- */
function at(x,z,o=new T.Vector3()){ const r=Math.hypot(x,z); if(r<1e-6) return o.set(0,1,0); const a=r/R, s=Math.sin(a)/r; return o.set(x*s,Math.cos(a),z*s); }
function loc(d){ const a=Math.acos(clamp(d.y,-1,1)), s=Math.sin(a); if(s<1e-6) return [0,0]; const k=a*R/s; return [d.x*k,d.z*k]; }
const _up=new T.Vector3(), _n=new T.Vector3(), _e=new T.Vector3(), _Ry=new T.Matrix4(), _S=new T.Vector3();
function frameAt(x,z,yaw=0,lift=0,s=1){ at(x,z,_up); at(x,z+.05,_n).sub(_up); _n.addScaledVector(_up,-_n.dot(_up)).normalize(); _e.crossVectors(_up,_n);
  const M=new T.Matrix4().makeBasis(_e,_up,_n); M.setPosition(_up.x*(R+lift),_up.y*(R+lift),_up.z*(R+lift)); if(yaw) M.multiply(_Ry.makeRotationY(yaw)); if(s!==1) M.scale(_S.set(s,s,s)); return M; }
const yawTo=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z); // turns a thing's front toward a point
/* where the rocket lands, which way its hatch opens, where you stand when you step off, and which way you then look */
const PAD=[-3.2,-15.6], DOOR=[0,1], START=[-3.2,-12.0];
const AHR=(()=>{ const l=Math.hypot(-.91,.42), fx=-.91/l, fz=.42/l, c=Math.cos(.55), sn=Math.sin(.55); return [START[0]+(fx*c-fz*sn)*4.6,START[1]+(fx*sn+fz*c)*4.6]; })();
// you step off looking just past Ahroon, so he stands beside you in the picture (on a phone too), not behind you
const FACE=(()=>{ let x=AHR[0]-START[0], z=AHR[1]-START[1]; const l=Math.hypot(x,z), c=Math.cos(.14), sn=Math.sin(.14); x/=l; z/=l; return [x*c-z*sn,x*sn+z*c]; })();
const SKYBH={value:new T.Vector3(-.35,.75,.55).normalize()}, SPACEU={value:0};
const SKYU={uSunD:{value:new T.Vector3(.38,.8,.46).normalize()},uMoonD:{value:new T.Vector3(-.3,.8,-.5).normalize()},uDusk:{value:0},uOver:{value:0},uBow:{value:0}};   // where the sun and the moon are, sunset, overcast, a rainbow   // SPACEU: how far into the black the sky has gone, climbing out // where the hole hangs in the sky: set so the rocket comes down out of it

/* ---------- the island: the same noise in JavaScript (to build and to walk) and in the shaders ---------- */
const fr=x=>x-Math.floor(x);
function eh(x,y,z){ x=fr(x*.3183099+.1)*17; y=fr(y*.3183099+.1)*17; z=fr(z*.3183099+.1)*17; return fr(x*y*z*(x+y+z)); }
function en(x,y,z){ const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z); let fx=x-ix,fy=y-iy,fz=z-iz; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); fz=fz*fz*(3-2*fz);
  const L=(a,b,t)=>a+(b-a)*t, h=(a,b,c)=>eh(ix+a,iy+b,iz+c);
  return L(L(L(h(0,0,0),h(1,0,0),fx),L(h(0,1,0),h(1,1,0),fx),fy),L(L(h(0,0,1),h(1,0,1),fx),L(h(0,1,1),h(1,1,1),fx),fy),fz); }
function efbm(x,y,z){ let a=.5,s=0; for(let i=0;i<5;i++){ s+=a*en(x,y,z); x*=2.1; y*=2.1; z*=2.1; a*=.5; } return s; }
const ISLETS=[[23,-7.5,.07],[-8.5,22.5,.06],[17.5,17,.045]].map(([x,z,r])=>({d:at(x,z),r}));
const JETTY=[[10.5,-14.3],[12.9,-18.1]], JB=at(11.4,-15.6);
function isle(d){ const a=Math.acos(clamp(d.y,-1,1)); let l=1.35*(.78-a)+.32*(efbm(d.x*3.3+1.3,d.y*3.3+2.1,d.z*3.3+.7)-.5);
  for(const s of ISLETS) l=Math.max(l,1.6*(s.r-Math.acos(clamp(d.dot(s.d),-1,1)))+.1*(en(d.x*20,d.y*20,d.z*20)-.5)); return l; }
function beachK(d){ return clamp((efbm(d.x*5+7,d.y*5+7,d.z*5+7)-.5)*6+.5+Math.max(0,.16-Math.acos(clamp(d.dot(JB),-1,1)))*14,0,1); }
const WATER=-.9;
function hOf(l,b){ const w0=.014+.2*b, t=clamp((l+w0)/(w0+.004),0,1); return -1.6*(1-t*t*(3-2*t)); }
const CAPR=25, CS=LO?.22:.17, CN=Math.ceil(2*CAPR/CS)+1, GL=new Float32Array(CN*CN), GH=new Float32Array(CN*CN), GB=new Float32Array(CN*CN);
function grid(A,x,z){ const fx=(x+CAPR)/CS, fz=(z+CAPR)/CS, i=clamp(Math.floor(fx),0,CN-2), j=clamp(Math.floor(fz),0,CN-2), tx=clamp(fx-i,0,1), tz=clamp(fz-j,0,1);
  const k=j*CN+i; return lerp(lerp(A[k],A[k+1],tx),lerp(A[k+CN],A[k+CN+1],tx),tz); }

/* ---------- light: three tones of sun with cast shadows, a little sky from above, haze far away ---------- */
const N2=`float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y); }`;
const NEAR=`uniform vec3 uPly; uniform float uCut;
  void nearFade(vec3 w){ float k=smoothstep(.7,1.25,distance(cameraPosition,w));
    if(uCut>.5){ vec3 ab=uPly-cameraPosition; float L2=dot(ab,ab); if(L2>.25){ float t=dot(w-cameraPosition,ab)/L2;
      /* the inside of a thing (its back faces) is cut away wider than its skin, so the gap shows the world beyond, not the dark inside */
      if(t>0.&&t<.95){ float r0=gl_FrontFacing?.5:1.1; k=min(k,smoothstep(r0,r0+.16,length(w-cameraPosition-ab*t))); } } }
    if(k<fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))) discard; }`;
const SHN=LO?1536:2048;
const LU={uPly:{value:new T.Vector3()},uShDbg:{value:0},uSun:{value:SUN},uSky:{value:C3('#9fd0d8')},uFog:{value:C3('#d3e6e2')},uShM:{value:null},uShP:{value:new T.Matrix4()},uShOn:{value:0},uFogK:{value:1},
  /* the time of day (see the sky's block): the light's two tones and the shade's, night, the street lamps, fog's reach, rain and snow, the season */
  uLitA:{value:new T.Vector3(.93,.92,.89)},uLitB:{value:new T.Vector3(1.05,1.02,.95)},uShdC:{value:new T.Vector3(.6,.66,.83)},uNight:{value:0},
  uLmp:{value:Array.from({length:8},()=>new T.Vector4(0,-99,0,0))},uFogR:{value:new T.Vector2(16,52)},uFogA:{value:.55},uWet:{value:0},uSnow:{value:0},uSeason:{value:0},
  uBmO:{value:new T.Vector4(0,0,0,0)},uBmD:{value:new T.Vector4(1,0,0,.985)}};   // the lighthouse's beam: where it starts (and how strong), which way it points
const LIGHT=`uniform vec3 uSun,uSky,uFog,uLitA,uLitB,uShdC; uniform sampler2D uShM; uniform mat4 uShP; uniform float uShOn,uShDbg,uFogK,uNight,uFogA,uWet,uSnow,uSeason; uniform vec2 uFogR; uniform vec4 uLmp[8],uBmO,uBmD;
  float shadowAt(vec3 w,float b){ if(uShOn<.5) return 1.; vec3 q=(uShP*vec4(w,1.)).xyz*.5+.5; if(q.x<.001||q.x>.999||q.y<.001||q.y>.999||q.z>.999) return 1.;
    float t=.6/${SHN}.; return .25*(step(q.z-b,texture2D(uShM,q.xy+vec2(-t,-t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(t,-t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(-t,t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(t,t)).r)); }
  vec3 toon(vec3 base,vec3 n,vec3 w){ float d=dot(n,uSun), sh=shadowAt(w,.0006+.0024*(1.-clamp(d,0.,1.)));
    float k=min(smoothstep(-.03,.03,d),smoothstep(.35,.65,sh)), hi=smoothstep(.5,.56,d)*k;
    vec3 c=mix(base*uShdC,mix(base*uLitA,base*uLitB,hi),k);
    c+=base*uSky*.07*(.5+.5*dot(n,normalize(w))); c=mix(c,vec3(1.,0.,0.),(1.-sh)*uShDbg);
    /* at night, the street lamps: a warm pool round each, on whatever faces it */
    if(uNight>.01){ vec3 L=vec3(0.); for(int i=0;i<8;i++){ vec3 tl=uLmp[i].xyz-w; float dd=length(tl), f=max(0.,1.-dd/5.5); L+=uLmp[i].w*f*f*(.3+.7*max(dot(n,tl/max(dd,.001)),0.)); } c+=base*vec3(1.,.74,.42)*L*1.7*uNight; }
    /* the lighthouse's beam lights whatever lies in its sweep below the lamp, and the fog thins along it */
    float bm=0.; if(uBmO.w>.01){ vec3 U=normalize(uBmO.xyz), v=w-uBmO.xyz, vh=v-U*dot(v,U); float L=length(vh);
      if(L>2.&&dot(v,U)<.5) bm=smoothstep(uBmD.w,uBmD.w+.012,dot(vh/L,uBmD.xyz))*smoothstep(26.,9.,L)*smoothstep(2.5,6.5,L)*uBmO.w; }
    c+=base*vec3(1.,.93,.74)*bm*(.12+.85*uNight);
    return mix(c,uFog,smoothstep(uFogR.x,uFogR.y,distance(cameraPosition,w))*uFogA*uFogK*(1.-.7*bm)); }`;
const TOON_V=uv=>`varying vec3 vN; varying vec3 vW; varying vec3 vC; ${uv?'varying vec2 vUv;':''}
  void main(){ vec4 p=vec4(position,1.); vec3 nn=normal; vC=vec3(1.); ${uv?'vUv=uv;':''}
    #ifdef USE_INSTANCING
      p=instanceMatrix*p; nn=mat3(instanceMatrix)*nn;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vC=instanceColor;
    #endif
    #ifdef USE_COLOR
      vC*=color;
    #endif
    vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(mat3(modelMatrix)*nn); gl_Position=projectionMatrix*viewMatrix*w; }`;
const TOON_F=`uniform vec3 uC; uniform float uOp,uKit; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
  void main(){ nearFade(vW); vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 b=uC*vC, E=vec3(0.);
    if(uKit>.5){ float upn=dot(n,normalize(vW));
      /* leaves turn with the season, tree by tree: reds and golds in autumn (uSeason up to 1), blossom in spring (down to -1) */
      float lb=-1.; if(abs(vC.r-.31)<.006&&abs(vC.g-.498)<.006) lb=.29; else if(abs(vC.r-.373)<.006&&abs(vC.g-.573)<.006) lb=.337; else if(abs(vC.r-.435)<.006&&abs(vC.g-.635)<.006) lb=.373; else if(abs(vC.r-.498)<.006&&abs(vC.g-.682)<.006) lb=.4;
      if(abs(uSeason)>.01&&lb>0.){ float hs=clamp((vC.b-lb)/.012,0.,1.);
        vec3 au=mix(vec3(.86,.45,.2),mix(vec3(.9,.7,.3),vec3(.74,.3,.18),step(.7,hs)),step(.42,hs))*(.82+.4*vC.g);
        b=uSeason>0.?mix(b,au,uSeason*.85*step(.2,hs)):mix(b,mix(vec3(.97,.78,.85),vec3(.99,.93,.94),hs),-uSeason*step(.55,hs)*.85); }
      b=mix(b,vec3(.93,.95,.97),uSnow*smoothstep(.55,.8,upn));   // snow on whatever faces the sky
      b*=1.-.2*uWet*smoothstep(.5,.9,upn);   // rain darkens it
      if(uNight>.01&&distance(vC,vec3(.498,.639,.706))<.02){ float hw=fract(sin(dot(floor(vW*1.7),vec3(7.13,157.1,113.7)))*43758.5453); E+=vec3(1.,.76,.44)*step(.3,hw)*(.7+.4*hw)*uNight; }   // windows lit inside, not every one
      if(distance(vC,vec3(1.,.949,.769))<.02){ float m=0.; for(int i=0;i<8;i++) m=max(m,uLmp[i].w*step(distance(vW,uLmp[i].xyz),.7)); E+=vec3(1.,.86,.55)*m*1.6*uNight; } }   // a lamp's glass, as bright as its lamp
    gl_FragColor=vec4(toon(b,n,vW)+E,uOp); }`;
const mcache=new Map();
function toonMat(color,o={}){ const op=o.op??1, key=op+'|'+(o.side||0)+'|'+(o.vc?1:0)+'|'+(o.fig?1:0)+'|'+C3(color).getHexString(); if(!o.fresh&&mcache.has(key)) return mcache.get(key);
  const m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3(color).clone()},uOp:{value:op},uCut:{value:o.fig?0:1}},LU),vertexShader:TOON_V(),fragmentShader:TOON_F,transparent:op<1,depthWrite:op>=1,side:o.side||T.FrontSide,vertexColors:!!o.vc});
  if(!o.fresh) mcache.set(key,m); return m; }
/* what the ink pass sees: the normal and the distance of every surface; what the sun sees: only depth */
const INK_F=`varying vec3 vN; varying vec3 vW; ${NEAR} void main(){ nearFade(vW); vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(n*.5+.5,1./(1.+distance(cameraPosition,vW))); }`;
const SHD_F=`void main(){ gl_FragColor=vec4(1.); }`;
const FLAT_F=`uniform vec3 uC; varying vec3 vN; varying vec3 vW; ${NEAR} void main(){ nearFade(vW); gl_FragColor=vec4(uC,1.); }`;
const flatMat=c=>new T.ShaderMaterial({uniforms:{uC:{value:C3(c)}},vertexShader:TOON_V(),fragmentShader:FLAT_F});

/* ---------- one big mesh for everything that never moves: houses, roads, trees, fences, the lighthouse ---------- */
const KITS={main:{P:[],N:[],C:[]}}; let KP=KITS.main.P, KN=KITS.main.N, KC=KITS.main.C; const kT=new T.Vector3(), kV=new T.Vector3(), kNM=new T.Matrix3();
/* what goes into the static mesh can be sent to a landmark's own mesh instead, so it can be shown, hidden and grown on its own */
function kitTo(id='main'){ const k=KITS[id]||(KITS[id]={P:[],N:[],C:[]}); KP=k.P; KN=k.N; KC=k.C; }
function kadd(g,c,M){ const p=g.attributes.position, q=g.attributes.normal; kNM.getNormalMatrix(M); const col=C3(c);
  for(let i=0;i<p.count;i++){ kT.fromBufferAttribute(p,i).applyMatrix4(M); kV.fromBufferAttribute(q,i).applyMatrix3(kNM).normalize(); KP.push(kT.x,kT.y,kT.z); KN.push(kV.x,kV.y,kV.z); KC.push(col.r,col.g,col.b); } }
function ktri(a,b,c,n,col){ const C=C3(col); for(const p of [a,b,c]){ KP.push(p.x,p.y,p.z); KN.push(n.x,n.y,n.z); KC.push(C.r,C.g,C.b); } }
const qA=new T.Vector3(), qB=new T.Vector3();
function kquad(a,b,c,d,n,col){ qA.subVectors(b,a); qB.subVectors(c,a); if(qA.cross(qB).dot(n)>=0){ ktri(a,b,c,n,col); ktri(a,c,d,n,col); } else { ktri(a,c,b,n,col); ktri(a,d,c,n,col); } }
const prismG=(()=>{ const A=[-.5,0,-.5],B=[.5,0,-.5],Cc=[0,1,-.5],A2=[-.5,0,.5],B2=[.5,0,.5],C2=[0,1,.5];
  const v=[A,Cc,B, A2,B2,C2, A,A2,C2, A,C2,Cc, B,Cc,C2, B,C2,B2, A,B,B2, A,B2,A2].flat(); const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(v,3)); g.computeVertexNormals(); return g; })();
const GEO={box:new T.BoxGeometry(1,1,1).toNonIndexed(), cyl:new T.CylinderGeometry(1,1,1,18).toNonIndexed(), cyl8:new T.CylinderGeometry(1,1,1,8).toNonIndexed(), tcyl:new T.CylinderGeometry(.9,1,1,18).toNonIndexed(),
  cone:new T.ConeGeometry(1,1,18).toNonIndexed(), cone8:new T.ConeGeometry(1,1,9).toNonIndexed(), blob:new T.IcosahedronGeometry(1,1).toNonIndexed(), rock:new T.DodecahedronGeometry(1,0).toNonIndexed(),
  sph:new T.SphereGeometry(1,12,8).toNonIndexed(), prism:prismG};
const pL=new T.Matrix4(), pM=new T.Matrix4(), pQ=new T.Quaternion(), pE=new T.Euler(), pS=new T.Vector3(), pP=new T.Vector3();
function put(M,geo,c,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){ pE.set(rx,ry,rz,'YXZ'); pQ.setFromEuler(pE); pL.compose(pP.set(x,y,z),pQ,pS.set(sx,sy,sz)); kadd(GEO[geo],c,pM.multiplyMatrices(M,pL)); }
const box=(M,c,x,y,z,w,h,d,ry=0,rx=0,rz=0)=>put(M,'box',c,x,y+h/2,z,w,h,d,ry,rx,rz); // y is the bottom
const cyl=(M,c,x,y,z,r,h,g='cyl')=>put(M,g,c,x,y+h/2,z,r,h,r);
const sub=(M,x,y,z,ry=0)=>new T.Matrix4().multiplyMatrices(M,new T.Matrix4().makeRotationY(ry).setPosition(x,y,z));
const OBS=[]; const obs=(x,z,r,h=3)=>OBS.push({x,z,r,h});
/* an obstacle at a point in a thing's own frame */
const _oa=new T.Vector3(); function obsAt(M,lx,lz,r,h=1.2){ const [x,z]=loc(_oa.set(lx,0,lz).applyMatrix4(M).normalize()); obs(x,z,r,h); }
function obsRect(x,z,yaw,w,d,h=3){ const ax=w>=d, L=ax?w:d, Wd=ax?d:w, n=Math.max(1,Math.ceil(L/Wd)), ux=ax?Math.cos(yaw):Math.sin(yaw), uz=ax?-Math.sin(yaw):Math.cos(yaw);
  for(let k=0;k<n;k++){ const t=(n===1?0:(k/(n-1)-.5))*(L-Wd); obs(x+ux*t,z+uz*t,Wd/2+.12,h); } }

/* ---------- roads and paths ---------- */
const LOOP=[[-3,-8.7],[2.5,-8.9],[7.4,-6.4],[9.3,-.8],[8.6,4.8],[5,8.6],[-.5,9.6],[-5.8,8],[-8.8,3.4],[-9,-2.4],[-7,-7.1]];
const SPUR=[[-3,-10.9],[-3,-13.3]];
const RW=1.2, SW=1, CURB=.09, ROADH=.015;
const ROADS=[]; // dense samples [x,z] of every road centre line, for distances
function roadDist(x,z){ let m=1e9; for(const r of ROADS) for(let i=0;i<r.length-1;i++){ const a=r[i],b=r[i+1], ex=b[0]-a[0], ez=b[1]-a[1], t=clamp(((x-a[0])*ex+(z-a[1])*ez)/(ex*ex+ez*ez||1),0,1); m=Math.min(m,Math.hypot(x-a[0]-ex*t,z-a[1]-ez*t)); } return m; }
let SEGS=[]; // dirt paths [x1,z1,x2,z2,halfwidth]
function pathDist(x,z){ let m=1e9; for(const s of SEGS){ const ex=s[2]-s[0], ez=s[3]-s[1], t=clamp(((x-s[0])*ex+(z-s[1])*ez)/(ex*ex+ez*ez),0,1); m=Math.min(m,Math.hypot(x-s[0]-ex*t,z-s[1]-ez*t)-s[4]); } return m; }
function onJetty(x,z){ const [a,b]=JETTY, ex=b[0]-a[0], ez=b[1]-a[1], L=Math.hypot(ex,ez), t=((x-a[0])*ex+(z-a[1])*ez)/(L*L); if(t<-.02||t>1) return false; return Math.abs(((x-a[0])*ez-(z-a[1])*ex)/L)<.62; }
let DECK=-.5;
/* where your feet are: on the ground, up on the pavement, or on the boards of the jetty */
function standH(x,z){ if(onJetty(x,z)) return DECK+.12; if(Math.hypot(x-PAD[0],z-PAD[1])<2.35) return .1; const g=grid(GH,x,z), rd=roadDist(x,z); return g+(rd<RW?ROADH:rd<RW+SW?CURB:0); }

/* ---------- signs: painted boards with the dot-matrix type, drawn on a canvas ---------- */
const SIGN_F=`uniform sampler2D uMap; varying vec3 vN; varying vec3 vW; varying vec3 vC; varying vec2 vUv; ${LIGHT} ${NEAR}
  void main(){ nearFade(vW); vec3 n=normalize(vN); gl_FragColor=vec4(toon(texture2D(uMap,vUv).rgb,n,vW),1.); }`;
function signTex(txt,sub,w,h,bg,fg){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const tx=new T.CanvasTexture(cv); tx.anisotropy=4;
  const draw=()=>{ const c=cv.getContext('2d'); c.fillStyle=bg; c.fillRect(0,0,w,h); c.strokeStyle=fg; c.lineWidth=h*.05; c.strokeRect(h*.06,h*.06,w-h*.12,h-h*.12);
    c.fillStyle=fg; c.strokeStyle=fg; c.textAlign='center'; c.textBaseline='middle'; const fs=h*(sub?.36:.46); c.font=`900 ${fs}px Doto, monospace`; c.lineWidth=fs*.07;
    const y=sub?h*.4:h*.53, fit=(t,f)=>{ c.font=`900 ${f}px Doto, monospace`; const m=c.measureText(t).width; return m>w*.86?f*w*.86/m:f; };
    let f1=fit(txt,fs); c.font=`900 ${f1}px Doto, monospace`; c.lineWidth=f1*.07; c.strokeText(txt,w/2,y); c.fillText(txt,w/2,y);
    if(sub){ const f2=fit(sub,h*.15); c.font=`900 ${f2}px Doto, monospace`; c.lineWidth=f2*.06; c.strokeText(sub,w/2,h*.74); c.fillText(sub,w/2,h*.74); } tx.needsUpdate=true; };
  draw(); if(document.fonts&&document.fonts.load) document.fonts.load('900 40px Doto').then(draw).catch(()=>{}); return tx; }
function sign(M,txt,o={}){ const w=o.w||1.5, h=o.h||.5, y=o.y??1.25, post=o.post!==false;
  const px=o.legs?w/2+.04:w*.38;   // legs: posts at the board's ends, clear of words that run its whole width
  if(post){ box(M,'#6d5544',-px,0,-.04,.08,y+h/2,.08); box(M,'#6d5544',px,0,-.04,.08,y+h/2,.08); [-px,0,px].forEach(k=>obsAt(M,k,-.04,.15,y+h/2)); }
  const ox=o.x||0; box(M,o.board||'#5b4636',ox,y-h/2-.03,-.06,w+.1,h+.06,.06);
  const mat=new T.ShaderMaterial({uniforms:Object.assign({uCut:{value:1},uMap:{value:signTex(txt,o.sub,512,Math.round(512*h/w),o.bg||'#f3ead8',o.fg||'#2a241d')}},LU),vertexShader:TOON_V(true),fragmentShader:SIGN_F});
  const m=new T.Mesh(new T.PlaneGeometry(w,h),mat); m.matrixAutoUpdate=false; m.matrix.copy(sub(M,ox,y,-.025)); m.userData.cast=true; sc.add(m); return m; }

/* ---------- prefabs ---------- */
function windowAt(M,x,y,z,ry,o={}){ const W=sub(M,x,y,z,ry), tr=o.trim||'#f6f1e7';
  box(W,tr,0,-.36,.02,.76,.72,.06); box(W,'#7fa3b4',0,-.29,.04,.58,.56,.05); box(W,tr,0,-.29,.05,.04,.56,.04); box(W,tr,0,-.03,.05,.58,.04,.04); box(W,tr,0,-.42,.06,.88,.06,.16);
  if(o.flowers){ box(W,'#8a5a3c',0,-.56,.12,.72,.14,.18); for(let k=0;k<4;k++) put(W,'sph',['#f19bb0','#f6d26b','#fbf6ec','#e9744f'][k],-.24+k*.16,-.38,.14,.07,.07,.07); } }
function door(M,x,z,ry,c,tr){ const D=sub(M,x,0,z,ry); box(D,tr,0,.2,.02,.78,1.26,.06); box(D,c,0,.2,.05,.6,1.12,.05); box(D,'#e7c36a',.2,.75,.09,.05,.05,.04); box(D,'#bdb6aa',0,0,.32,.96,.16,.56); }
const HOUSES=[];
function house(x,z,yaw,o){ const M=frameAt(x,z,yaw), w=o.w||3.4, d=o.d||2.8, h=o.h||2.4, tr=o.trim||'#f6f1e7'; HOUSES.push({M,w,d,h,dx:o.doorX||0,flat:!!o.flat});
  box(M,'#a49b8f',0,0,0,w+.18,.22,d+.18); box(M,o.wall,0,.2,0,w,h-.2,d);
  if(o.flat){ box(M,o.roof,0,h,0,w+.3,.2,d+.3); box(M,tr,0,h+.2,0,w+.3,.06,d+.3); }
  else { const rh=o.rh||1.3; put(M,'prism',o.roof,0,h,0,d+.62,rh,w+.5,Math.PI/2); box(M,tr,0,h-.12,d/2+.04,w+.1,.12,.05); box(M,tr,0,h-.12,-d/2-.04,w+.1,.12,.05);
    if(o.chim!==false) box(M,'#b07a5e',w*.28,h+.25,-d*.16,.34,rh*.95,.34); }
  door(M,o.doorX||0,d/2,0,o.door||'#6e4a3a',tr);
  (o.win||[-w*.3,w*.3]).forEach((wx,i)=>windowAt(M,wx,1.42,d/2,0,{flowers:o.flowers&&i===0,trim:tr}));
  if(o.up) (o.win||[-w*.3,w*.3]).concat([o.doorX||0]).forEach(wx=>windowAt(M,wx,h-.85,d/2,0,{trim:tr}));
  windowAt(M,w/2,1.42,0,Math.PI/2,{trim:tr}); windowAt(M,-w/2,1.42,0,-Math.PI/2,{trim:tr});
  if(o.extra) o.extra(M,w,d,h); obsRect(x,z,yaw,w+.25,d+.25,h+(o.flat?.35:(o.rh||1.3)+.3)); return M; }  // as tall as the ridge
const LAMPS=[];
function lamp(x,z){ const M=frameAt(x,z,0); LAMPS.push({x,z,p:new T.Vector3(0,2.44,.38).applyMatrix4(M),k:0,hot:0}); cyl(M,'#43504f',0,0,0,.09,.26,'cyl8'); cyl(M,'#536160',0,.24,0,.05,2.5,'cyl8'); box(M,'#536160',0,2.66,.16,.06,.06,.4);
  box(M,'#3c4746',0,2.5,.38,.28,.14,.26); box(M,'#fff2c4',0,2.44,.38,.2,.06,.18); obs(x,z,.2,1.2); }
function bench(x,z,yaw){ const M=frameAt(x,z,yaw); [-.6,.6].forEach(s=>{ box(M,'#4e4a45',s,0,0,.07,.42,.42); box(M,'#4e4a45',s,.42,-.2,.07,.36,.06); });
  for(let k=0;k<3;k++) box(M,'#b8834f',0,.42,-.14+k*.14,1.46,.05,.12); for(let k=0;k<2;k++) box(M,'#b8834f',0,.56+k*.15,-.22,1.46,.1,.04,0,-.12); obs(x,z,.6,1); }
const LEAF=['#4f7f4a','#5f9256','#6fa25f','#7fae66'];
const TREES=[];
function tree(x,z,s=1){ const M=frameAt(x,z,rnd()*TAU), th=1.25*s; TREES.push([x,z,s]);
  put(M,'cyl8','#7a5a42',0,th/2,0,.12*s,th,.12*s); put(M,'cyl8','#7a5a42',.2*s,th*.82,0,.05*s,.62*s,.05*s,0,0,-.75);
  const tk=fract(Math.sin(x*12.9898+z*78.233)*43758.5453), lc=LEAF.map(c=>{ const q=C3(c).clone(); q.b+=tk*.012; return q; });   // which colour this tree turns in autumn, hidden in its leaves' blue
  const n=5+Math.floor(rnd()*3); for(let k=0;k<n;k++){ const a=rnd()*TAU, rr=k?(.42+rnd()*.25)*s:0, bs=(k?.48+rnd()*.3:.82)*s; put(M,'blob',lc[Math.min(3,Math.floor(rnd()*3)+(k>2?1:0))],Math.cos(a)*rr,th+.45*s+(k?rnd()*.55*s-.1:.2*s),Math.sin(a)*rr,bs,bs*.86,bs); }
  obs(x,z,.26*s,3.5); }
function pine(x,z,s=1){ const M=frameAt(x,z,rnd()*TAU); put(M,'cyl8','#6b4e3e',0,.35*s,0,.1*s,.7*s,.1*s);
  for(let k=0;k<3;k++){ const r=(1-k*.25)*.82*s, hh=1.2*s; put(M,'cone8',k%2?'#3f6c4f':'#4a7b57',0,.55*s+k*.62*s+hh/2,0,r,hh,r); } obs(x,z,.3*s,3.5); }
function bush(x,z,s=1){ const M=frameAt(x,z,rnd()*TAU); for(let k=0;k<3;k++) put(M,'blob',LEAF[1+(k%2)],(k-1)*.32*s,.26*s,(rnd()-.5)*.2*s,.36*s,.3*s,.34*s); obs(x,z,.42*s,.6); }
function rock(x,z,s=1,y=0){ const M=frameAt(x,z,rnd()*TAU); put(M,'rock',rnd()<.5?'#a49e94':'#928c83',0,y+.25*s,0,.62*s,.45*s,.55*s,0,rnd(),rnd()); obs(x,z,.5*s,.5*s); }
function fence(pts,c='#f3ede2'){ for(let i=0;i<pts.length-1;i++){ const [x0,z0]=pts[i],[x1,z1]=pts[i+1], L=Math.hypot(x1-x0,z1-z0), n=Math.max(1,Math.round(L/.5)), yaw=Math.atan2(-(z1-z0),x1-x0);
    for(let k=0;k<=n;k++){ if(k===n&&i<pts.length-2) continue; const t=k/n, fx=x0+(x1-x0)*t, fz=z0+(z1-z0)*t, M=frameAt(fx,fz,yaw); obs(fx,fz,.14,.9); box(M,c,0,0,0,.07,.78,.07); box(M,c,0,.78,0,.05,.06,.05,0,0,.785); }
    const Mm=frameAt((x0+x1)/2,(z0+z1)/2,yaw); box(Mm,c,0,.32,0,L,.06,.04); box(Mm,c,0,.6,0,L,.06,.04); } }
const POLES=[];
function pole(x,z,yaw){ const M=frameAt(x,z,yaw); cyl(M,'#7a6352',0,0,0,.1,4.4,'cyl8'); box(M,'#6a5446',0,4.0,0,1.3,.09,.09);
  [-.55,.55].forEach(s=>cyl(M,'#e7e2d8',s,4.09,0,.03,.1,'cyl8')); POLES.push([-.55,.55].map(s=>new T.Vector3(s,4.18,0).applyMatrix4(M))); obs(x,z,.16,4); }
function wires(){ for(let i=0;i<POLES.length-1;i++){ const A=POLES[i], B=POLES[i+1]; if(A[0].distanceTo(B[0])>9) continue;
  for(let s=0;s<2;s++){ const a=A[s], b=B[s], pts=[]; for(let k=0;k<=10;k++){ const t=k/10; const p=a.clone().lerp(b,t); p.addScaledVector(V.copy(p).normalize(),-.38*4*t*(1-t)); pts.push(p); }
    kadd(new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,.014,4,false).toNonIndexed(),'#3a383b',new T.Matrix4()); } } }

/* ---------- the town ---------- */
function coastR(bx,bz,margin){ const L=Math.hypot(bx,bz), ux=bx/L, uz=bz/L; for(let r=6;r<24;r+=.1){ if(isle(at(ux*r,uz*r))<.03) return [ux*(r-margin),uz*(r-margin)]; } return [ux*14,uz*14]; }
/* ---------- the landmarks: every project stands here, however you came; never an empty plot to wonder about ---------- */
const MK={}, seen=new Set();
function mark(id,x,z,y=0){ const g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g); const base=at(x,z).multiplyScalar(R+y); return MK[id]={id,g,base,obs:[],k:1,st:'off',t:0}; }
function markObs(id,h0){ const o=OBS[OBS.length-1]; MK[id].obs.push({o,h:o.h,h0}); }   // the obstacle just added: full height when built, h0 when not
function markScale(m,k){ m.k=k; const b=m.base; m.g.matrix.makeScale(k,k,k).setPosition(b.x*(1-k),b.y*(1-k),b.z*(1-k)); m.g.matrixWorldNeedsUpdate=true; }
let PH, AE, KR, BE, OG;
/* where each landmark stands, how tall it is, and what it says when you walk up to it */
const INST={}, CARD={kr:['Kríos','Voice practice for sales teams','Rehearse the call out loud, and a buyer answers back.','https://krios.ie','View project'],
  ae:['Aetos','Counter-drone command software','It reads a sky full of drones and marks the one that matters.','https://github.com/ahroonsanthosh/Aetos','View project'],
  ph:['Pharos','GPS-free drone navigation','No GPS, so the drone finds itself by matching what it sees to the map.','https://github.com/ahroonsanthosh/pharos','View project'],
  og:['Ogive','AI tools for OpenRocket','Name the height, and it reworks the rocket until it gets there.','https://github.com/michaelsheffernan/ogive','View project'],
  be:['Heloria Labs','The workshop','Where the three of us build. Talk to us: contact@helorialabs.com','mailto:contact@helorialabs.com','Email us'],
  cafe:['Café','Book a chat with us','Pull up a chair. Tell us what you are working on and we will find a time to talk.',
    'mailto:contact@helorialabs.com?subject='+encodeURIComponent('Booking a chat with Heloria Labs')+'&body='+encodeURIComponent('Hi Ahroon, Michael and Abraham,\n\nI would like to book a chat about:\n\nA few times that suit me:\n'),'Book a chat']};
const CAFE_ON=true;   // the board and its card: set by the build (untamed/build.py CAFE_LIVE for the site)
const CAFE_B=[-2.5,2.35,.4];   // where the café's board stands: its front corner on the side you come from the landing, turned to the street
/* a small quadcopter for the landmarks: a body, four arms, four rotors, and a light underneath */
function drone(light){ const g=new T.Group(); g.matrixAutoUpdate=false; const dk=toonMat('#4a5058'), lt=toonMat('#e9ecef');
  g.add(new T.Mesh(new T.BoxGeometry(.22,.07,.22),dk));
  for(let k=0;k<4;k++){ const a=k*Math.PI/2+Math.PI/4, ax=Math.cos(a)*.2, az=Math.sin(a)*.2;
    const arm=new T.Mesh(new T.BoxGeometry(.2,.025,.03),dk); arm.position.set(ax*.5,0,az*.5); arm.rotation.y=-a; g.add(arm);
    const r=new T.Mesh(new T.CylinderGeometry(.085,.085,.012,14),lt); r.position.set(ax,.04,az); g.add(r); }
  const L=new T.Mesh(new T.SphereGeometry(.036,8,6),flatMat(light)); L.position.y=-.055; g.add(L); g.userData.light=L; return g; }
const Mf2=new T.Matrix4(), Mr=new T.Matrix4(), KRY=C3('#3f6fd0'), KRT=C3('#e9873a'), KRC=new T.Color();
function buildTown(){
  /* the square: Kríos, as a glass sculpture with a voice turning inside it */
  { const M=frameAt(0,0,0); cyl(M,'#c9c1b3',0,0,0,1.55,.16); cyl(M,'#ddd6c8',0,.16,0,1.28,.14); const mk=mark('kr',0,0,.3);
    kitTo('kr'); put(M,'cyl','#e9e3d7',0,.3+.55,0,.34,1.1,.34); cyl(M,'#bba987',0,1.38,0,.42,.08); kitTo();
    const g=new T.Group(); g.matrixAutoUpdate=false; g.matrix.copy(sub(M,0,2.05,0)); mk.g.add(g);
    const orb=new T.Mesh(new T.SphereGeometry(.64,32,20),toonMat('#bcd8e6',{op:.42,fresh:true})); g.add(orb);
    const bars=new T.InstancedMesh(new T.BoxGeometry(.05,1,.05),toonMat('#ffffff',{fresh:true}),28); for(let k=0;k<28;k++) bars.setColorAt(k,KRY); bars.userData.dyn=true; g.add(bars); KR={g,bars,M,mt:0};
    INST.kr={x:0,z:0,h:3.1,r:4.8};
    sign(sub(M,0,0,-1.95,Math.PI),'KRÍOS',{sub:'rehearse the calls that matter',w:1.7,h:.62,y:.95}); obs(0,0,1.6,2.6); markObs('kr',.4); }
  [[1.9,1.9],[-1.9,1.9],[1.9,-1.9],[-1.9,-1.9]].forEach(([x,z])=>bench(x*1.45,z*1.45,yawTo(x,z,0,0)));
  for(let k=0;k<26;k++){ const a=k/26*TAU, r=1.85+rnd()*.25; if(Math.abs(Math.sin(a))<.16||Math.abs(Math.cos(a))<.16) continue; const M=frameAt(Math.cos(a)*r,Math.sin(a)*r,0); put(M,'sph',['#f19bb0','#f6d26b','#fbf6ec','#e9744f','#b9a2e0'][k%5],0,.12,0,.13,.11,.13); put(M,'blob',LEAF[2],0,.04,0,.16,.08,.16); }
  [[-4,4,1.3],[4.1,-3.7,1.15],[4.6,4.3,1],[-4.6,-3.9,1.05]].forEach(([x,z,s])=>tree(x,z,s));
  [[-2.4,-5.4],[2.6,5.6],[5.6,-1.8],[-5.6,2.2]].forEach(([x,z])=>bush(x,z,1.1));
  /* houses round the loop, each facing the road */
  const H=(x,z,o)=>house(x,z,yawTo(x,z,0,0),o);
  H(-13.3,-3.2,{wall:'#f1e2c6',roof:'#c8664b',flowers:true});
  H(-13,3.8,{wall:'#cfe0e6',roof:'#4f6f8f',w:3.8,h:2.6});
  H(-5.8,13.6,{wall:'#f3d9c4',roof:'#9a5340',w:3.2,d:2.6});
  H(13.3,-3.4,{wall:'#e8ecd9',roof:'#c8664b',up:true,h:3.6,rh:1.1});
  H(12.9,7.2,{wall:'#f6eedf',roof:'#5d7f6a',w:3,d:2.6,flowers:true});
  H(-10.6,10.4,{wall:'#e9d3b0',roof:'#7d5a8f',w:3,d:2.6});
  H(6.4,-12.6,{wall:'#dfe6ef',roof:'#c8664b',w:3.2,flowers:true});
  // the workshop: Heloria Labs
  { const x=-.8,z=13.8, yaw=yawTo(x,z,-.5,9.6); house(x,z,yaw,{wall:'#c9d5d1',roof:'#59646a',trim:'#eef0ea',flat:true,w:4.8,d:3.2,h:3,doorX:1.65,win:[-1.9],
      extra:(M,w,d,h)=>{ box(M,'#8c9599',-.35,.2,d/2+.02,2.1,2.1,.05); for(let k=0;k<11;k++) box(M,'#a9b2b5',-.35,.3+k*.18,d/2+.05,2,.04,.03); box(M,'#59646a',-.35,2.3,d/2+.04,2.3,.12,.08);
        sign(sub(M,-.35,0,d/2+.09),'HELORIA LABS',{w:2.3,h:.5,y:2.68,post:false,bg:'#2a241d',fg:'#f3ead8',board:'#2a241d'});
        [[2.9,.7],[3.3,.2],[2.95,-.4]].forEach(([cx,cz],i)=>{ box(M,i===1?'#b88a5a':'#a77a4c',cx,.2,cz,.6,.55,.6,i*.4); obsAt(M,cx,cz,.42,.8); }); cyl(M,'#5a7d9a',-3,.2,.9,.28,.9); cyl(M,'#c8664b',-3.05,.2,.25,.28,.9); obsAt(M,-3,.9,.32,1); obsAt(M,-3.05,.25,.32,1);
        /* Beacon: a mast on the roof that keeps calling out */
        const B=sub(M,1.4,h+.26,-.7), bw=new T.Vector3(1.4,h+.26,-.7).applyMatrix4(M); const mk=MK.be=mark('be',0,0); mk.base.copy(bw); kitTo('be');
        box(B,'#59646a',0,0,0,.7,.08,.7); for(const [lx,lz] of [[-.2,-.2],[.2,-.2],[0,.22]]) put(B,'cyl8','#8c9599',lx*.5,1.5,lz*.5,.035,3,.035,0,lz*.06,-lx*.06);
        for(let k=0;k<6;k++) cyl(B,'#8c9599',0,.4+k*.45,0,.16-k*.018,.03,'cyl8'); kitTo();
        const lt=new T.Mesh(new T.SphereGeometry(.1,12,8),flatMat('#ff8a2a')); lt.matrixAutoUpdate=false; lt.matrix.copy(sub(B,0,3.08,0)); mk.g.add(lt); BE={lt}; } }); INST.be={x,z,h:4.6,r:5.6}; }
  // the café
  { const x=3,z=-13.4, yaw=yawTo(x,z,3,-8.9); house(x,z,yaw,{wall:'#f2dcb8',roof:'#b65a3e',w:4,d:2.8,h:2.95,win:[-1.25,1.25],
      extra:(M,w,d,h)=>{ for(let k=0;k<9;k++) put(M,'box',k%2?'#fbf6ec':'#e9744f',-1.8+k*.45,1.98,d/2+.48,.45,.04,1,0,.42); sign(sub(M,0,0,d/2+.06),'CAFÉ',{w:1.3,h:.38,y:2.55,post:false});
        [[-1.15,1.85],[1.25,1.85]].forEach(([tx,tz])=>{ cyl(M,'#4e4a45',tx,0,tz,.05,.7,'cyl8'); cyl(M,'#f3ede2',tx,.7,tz,.38,.05); [-1,1].forEach(s=>{ cyl(M,'#b8834f',tx+s*.55,0,tz,.17,.45,'cyl8'); }); });
        /* a board out on the pavement: this is where you book a chat with the three of us */
        if(CAFE_ON) sign(sub(M,CAFE_B[0],0,CAFE_B[1],CAFE_B[2]),'BOOK A CHAT',{sub:'with the three of us',w:1.4,h:.62,y:.8,legs:true,bg:'#34423b',fg:'#f3ead8',board:'#6d5544'}); } });
    obs(3-1.15,-13.4+1.85,.5,1); obs(3+1.25,-13.4+1.85,.5,1); if(CAFE_ON) INST.cafe={x,z,h:3.4,r:4.4}; }
  fence([[-15.2,-5.2],[-15.6,-1.2],[-15.2,1.8]]); fence([[11.2,-6],[15,-6.4]]); fence([[4.2,-14.6],[8.6,-14.6]]);
  /* the landing pad; the rocket that stands on it is built on its own, because it moves */
  { const M=frameAt(PAD[0],PAD[1],0); cyl(M,'#c9c3b8',0,0,0,2.35,.1); for(let k=0;k<24;k++){ const a=k/24*TAU; box(M,'#ef8a3c',Math.cos(a)*2.05,.1,Math.sin(a)*2.05,.2,.012,.07,-a); } obs(PAD[0],PAD[1],1.3,4.5); }
  /* Pharos: a lighthouse on the cliff */
  { const [x,z]=coastR(15,4.2,2.3); const M=frameAt(x,z,yawTo(x,z,0,0)); cyl(M,'#bdb5a8',0,0,0,1.15,.5); const mk=mark('ph',x,z,.5); kitTo('ph');
    for(let k=0;k<6;k++) put(M,'tcyl',k%2?'#cf4a36':'#f4efe6',0,.5+k*.72+.36,0,.84-k*.06,.72,.84-k*.06);
    cyl(M,'#3e4448',0,4.82,0,.92,.1); for(let k=0;k<14;k++){ const a=k/14*TAU; box(M,'#3e4448',Math.cos(a)*.86,4.92,Math.sin(a)*.86,.03,.36,.03); } cyl(M,'#3e4448',0,5.26,0,.88,.03);
    cyl(M,'#e7f1ef',0,4.92,0,.5,.62); put(M,'cone','#cf4a36',0,5.54+.3,0,.66,.6,.66); put(M,'sph','#3e4448',0,6.2,0,.08,.08,.08);
    const beam=new T.Mesh(new T.CylinderGeometry(.03,.36,6,12,1,true).rotateZ(Math.PI/2).translate(3,0,0),toonMat('#fff4c8',{op:.18,fresh:true})); beam.material.depthWrite=false; beam.layers.set(1);
    const bg=new T.Group(); bg.matrixAutoUpdate=false; bg.matrix.copy(sub(M,0,5.2,0)); bg.add(beam); mk.g.add(bg); PH={beam,M,x,z,a:0,over:false,dr:drone('#f5f3ea')}; mk.g.add(PH.dr); kitTo();
    INST.ph={x,z,h:6.7,r:7};
    const yy=yawTo(x,z,0,0), rr=Math.hypot(x,z), ix=-x/rr, iz=-z/rr; house(x+ix*.6+iz*2.7,z+iz*.6-ix*2.7,yy,{wall:'#f4efe6',roof:'#cf4a36',w:2.2,d:2,h:2,win:[-.6],doorX:.5,chim:false});
    sign(sub(M,-1.6,0,1.6,.3),'PHAROS',{sub:'finds its way without GPS',w:1.7,h:.62,y:.95}); obs(x,z,1.25,6); markObs('ph',.6); SEGS.push([10.6,1.7,x-1.2,z-.3,.55]); }
  /* Ogive: a rocket on its pad, with the tower beside it */
  { const [x,z]=coastR(8.8,13.4,3.2); const yaw=yawTo(x,z,5,8.6), M=frameAt(x,z,yaw); box(M,'#c3bdb2',0,0,0,3.2,.22,3.2); box(M,'#6f6a64',0,.22,0,1,.02,1);
    const mk=mark('og',x,z,.22); kitTo('og'); const r=sub(M,0,.22,0); cyl(r,'#f4f0e8',0,.3,0,.3,2.5); cyl(r,'#2f3336',0,1.9,0,.305,.12); put(r,'cone','#ef8a3c',0,2.8+.42,0,.3,.84,.3);
    for(let k=0;k<4;k++){ const a=k*Math.PI/2+.785; box(r,'#ef8a3c',Math.cos(a)*.38,0,Math.sin(a)*.38,.32,.62,.04,-a); } box(r,'#2f3336',0,1.3,.29,.16,.16,.05);
    const Gt=sub(M,1.15,.22,0); [[-.32,-.32],[.32,-.32],[-.32,.32],[.32,.32]].forEach(([gx,gz])=>box(Gt,'#c8664b',gx,0,gz,.08,4,.08));
    for(let k=1;k<8;k++){ box(Gt,'#c8664b',0,k*.5,-.32,.64,.05,.05); box(Gt,'#c8664b',0,k*.5,.32,.64,.05,.05); box(Gt,'#c8664b',-.32,k*.5,0,.05,.05,.64); box(Gt,'#c8664b',.32,k*.5,0,.05,.05,.64); }
    box(Gt,'#8c3f2e',0,4,0,.8,.08,.8); box(Gt,'#c8664b',-.55,2.55,0,.8,.08,.12); kitTo();
    const hoop=new T.Mesh(new T.TorusGeometry(.56,.035,8,44).rotateX(Math.PI/2),flatMat('#ffb26a')); hoop.matrixAutoUpdate=false; mk.g.add(hoop); OG={M:r,hoop,x,z,t:6}; INST.og={x,z,h:6.2,r:7};
    sign(sub(M,-.6,0,2.1),'OGIVE',{sub:'AI tools for OpenRocket',w:1.7,h:.62,y:.95}); obs(x,z,1.9,4); markObs('og',.3); SEGS.push([6.2,10,x-1.4,z-1.5,.55]); }
  /* Aetos: a radar on the rocks, turning */
  { const [x,z]=coastR(-10.2,-11.6,2.6); const yaw=yawTo(x,z,0,0), M=frameAt(x,z,yaw);
    [[0,0,1.6],[.9,.5,1.1],[-.8,.4,1.2],[.3,-.9,1.1],[-.5,-.8,.9]].forEach(([rx,rz,s])=>put(M,'rock',rnd()<.5?'#a49e94':'#928c83',rx,.5*s,rz,.95*s,.75*s,.9*s,rnd()*3,.2,.1));
    const mk=mark('ae',x,z,1); kitTo('ae'); cyl(M,'#9aa3ab',0,1.0,0,.08,1.8,'cyl8'); kitTo(); const hd=new T.Group(); hd.matrixAutoUpdate=false; mk.g.add(hd);
    const dish=new T.Mesh(new T.SphereGeometry(.78,28,12,0,TAU,0,Math.PI*.32),toonMat('#f2f4f2',{side:T.DoubleSide})); dish.rotation.x=-1.25; dish.position.z=.08; hd.add(dish);
    hd.add(new T.Mesh(new T.BoxGeometry(.24,.24,.3),toonMat('#9aa3ab'))); hd.add(new T.Mesh(new T.CylinderGeometry(.018,.018,.6,6).rotateX(-1.25+Math.PI/2).translate(0,.1,.32),toonMat('#9aa3ab')));
    AE={hd,M:sub(M,0,2.9,0),B:M,cyc:0}; INST.ae={x,z,h:4.4,r:4.6};   // close by the landing: the card waits until you walk up to the rocks
    AE.dr=[0,1,2,3,4].map(k=>{ const d=drone(k===0?'#ff8a2a':'#f5f3ea'); mk.g.add(d); return {g:d,a:k*1.31,r:1.9+k*.38,h:3.6+(k%3)*.55,w:(.3+k*.05)*(k%2?-1:1)}; });
    AE.ring=new T.Mesh(new T.TorusGeometry(.34,.024,6,32).rotateX(Math.PI/2),flatMat('#ff8a2a')); AE.ring.matrixAutoUpdate=false; AE.ring.visible=false; AE.ring.userData.noInk=true; mk.g.add(AE.ring);
    sign(sub(M,1.2,0,2.1,-.3),'AETOS',{sub:'which drone actually matters',w:1.7,h:.62,y:.95}); obs(x,z,2.1,3); markObs('ae',1.4); SEGS.push([START[0]-1,START[1]-.4,x+1.8,z+.9,.55]); }
  /* the jetty, out from the beach */
  { const [a,b]=JETTY, L=Math.hypot(b[0]-a[0],b[1]-a[1]), yaw=Math.atan2(-(b[1]-a[1]),b[0]-a[0]); DECK=Math.max(grid(GH,a[0],a[1]),-.55);
    for(let k=0;k<=Math.floor(L/.32);k++){ const t=k*.32/L, M=frameAt(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,yaw); box(M,k%3?'#b48a5c':'#a77e52',0,DECK,0,.26,.08,1.2);
      if(k%5===0){ [-.55,.55].forEach(s=>cyl(M,'#7a5a42',0,DECK-1.1,s,.07,1.4,'cyl8')); } }
    const E=frameAt(b[0],b[1],yaw); cyl(E,'#43504f',0,DECK+.08,.5,.06,1.6,'cyl8'); obsAt(E,0,.5,.16,1.6); box(E,'#fff2c4',0,DECK+1.6,.5,.16,.16,.16);
    SEGS.push([7.4,-7.6,a[0],a[1],.5]); }
  /* street lamps, poles and wires, a signpost */
  [[-9.9,-6.2],[-11.3,1.4],[-7.9,10.4],[0,11.9],[8,9.9],[11.7,-1.4],[9.9,-7.4],[3.8,-11.2]].forEach(([x,z])=>lamp(x,z));
  [[-10.6,-7.6],[-11.4,-1],[-10.9,5.4],[-7.4,11.1],[-2.6,12.1]].forEach(([x,z],i,a)=>{ const q=a[Math.min(i+1,a.length-1)], p0=a[Math.max(0,Math.min(i,a.length-2))], qq=i<a.length-1?q:a[i], pp=i<a.length-1?[x,z]:a[i-1]; pole(x,z,Math.atan2(-(qq[1]-pp[1]),qq[0]-pp[0])+Math.PI/2); }); wires();
}
/* ---------- grass, trees and rocks around the town ---------- */
const CLEAR=()=>[AHR,[6.1,11.1],[1.3,-2.7],START];
const clearAt=(x,z,m)=>roadDist(x,z)>RW+SW+m&&pathDist(x,z)>m*.8&&!OBS.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+m)&&!CLEAR().some(c=>Math.hypot(x-c[0],z-c[1])<4.2);
function mergeG(gs){ const P=[], N=[]; gs.forEach(g=>{ const q=g.index?g.toNonIndexed():g; P.push(...q.attributes.position.array); N.push(...q.attributes.normal.array); });
  const o=new T.BufferGeometry(); o.setAttribute('position',new T.Float32BufferAttribute(P,3)); o.setAttribute('normal',new T.Float32BufferAttribute(N,3)); return o; }
function buildNature(){
  let n=0; for(let i=0;i<900&&n<(LO?34:52);i++){ const a=rnd()*TAU, r=10.5+rnd()*8, x=Math.cos(a)*r, z=Math.sin(a)*r, l=isle(at(x,z)); if(l<.07||!clearAt(x,z,1.1)) continue;
    const s=.85+rnd()*.55; if(x<-5&&rnd()<.6) pine(x,z,s); else tree(x,z,s); n++; }
  for(let i=0;i<400&&n<90;i++){ const a=rnd()*TAU, r=6+rnd()*12, x=Math.cos(a)*r, z=Math.sin(a)*r; if(isle(at(x,z))<.05||!clearAt(x,z,.5)) continue; bush(x,z,.7+rnd()*.6); n++; }
  for(let i=0;i<500;i++){ const a=rnd()*TAU, r=14+rnd()*6, x=Math.cos(a)*r, z=Math.sin(a)*r, l=isle(at(x,z)); if(l<.0||l>.05||!clearAt(x,z,.4)) continue; rock(x,z,.6+rnd()*.9); }
  // grass tufts: small clumps that sway, not inked
  const NG=Math.floor(LO?380:900), blade=mergeG([new T.ConeGeometry(.03,.2,3).translate(0,.1,0),new T.ConeGeometry(.026,.15,3).rotateZ(.35).translate(.04,.07,.01),new T.ConeGeometry(.026,.16,3).rotateZ(-.3).rotateY(1.2).translate(-.035,.075,.02)]);
  const gm=new T.ShaderMaterial({uniforms:Object.assign({uTime:G.uTime},LU),vertexShader:`uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec3 vC;
    void main(){ vec4 p=instanceMatrix*vec4(position,1.); vC=instanceColor; vec3 base=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz; float h=position.y/.2;
      p.xyz+=normalize(cross(normalize(base),vec3(.3,.1,.9)))*sin(uTime*1.6+base.x*2.+base.z*1.7)*.03*h; vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(base); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} void main(){ gl_FragColor=vec4(toon(vC,normalize(vN),vW),1.); }`});
  const gi=new T.InstancedMesh(blade,gm,NG), M=new T.Matrix4(), Qq=new T.Quaternion(), Y=new T.Quaternion(), Ss=new T.Vector3(), Pp=new T.Vector3(), C=new T.Color(); let k=0;
  for(let i=0;i<NG*4&&k<NG;i++){ const x=(rnd()-.5)*36, z=(rnd()-.5)*36, d=at(x,z); if(isle(d)<.04||!clearAt(x,z,.05)) continue; Qq.setFromUnitVectors(UPY,d); Y.setFromAxisAngle(UPY,rnd()*TAU); Qq.multiply(Y);
    const s=.7+rnd()*.9; Pp.copy(d).multiplyScalar(R); Ss.set(s,s,s); M.compose(Pp,Qq,Ss); gi.setMatrixAt(k,M); C.setRGB(.4+rnd()*.08,.58+rnd()*.08,.33+rnd()*.05); gi.setColorAt(k,C); k++; }
  gi.count=k; gi.layers.set(1); sc.add(gi); }

/* ---------- the ground, the sea and the sky ---------- */
const SEGU={value:Array.from({length:12},()=>new T.Vector4(99,99,99,99))}, SEGW={value:new Float32Array(12)};
function buildGround(){
  for(let j=0;j<CN;j++) for(let i=0;i<CN;i++){ const x=-CAPR+i*CS, z=-CAPR+j*CS, d=at(x,z,V), l=isle(d), b=l<.06&&l>-.3?beachK(d):0, k=j*CN+i; GL[k]=l; GB[k]=b; GH[k]=hOf(l,b); }
  const P=new Float32Array(CN*CN*3), XZ=new Float32Array(CN*CN*2), idx=[];
  for(let j=0;j<CN;j++) for(let i=0;i<CN;i++){ const k=j*CN+i, x=-CAPR+i*CS, z=-CAPR+j*CS; at(x,z,V).multiplyScalar(R+GH[k]); P[k*3]=V.x; P[k*3+1]=V.y; P[k*3+2]=V.z; XZ[k*2]=x; XZ[k*2+1]=z;
    if(i<CN-1&&j<CN-1){ const a=k, b=k+1, c=k+CN, e=k+CN+1; if(Math.max(GH[a],GH[b],GH[c],GH[e])>-1.55) idx.push(a,c,b, b,c,e); } } // the sea floor far out is hidden by the sea: skip it
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); g.setAttribute('aL',new T.BufferAttribute(GL,1)); g.setAttribute('aB',new T.BufferAttribute(GB,1)); g.setAttribute('aH',new T.BufferAttribute(GH,1));
  g.setAttribute('aXZ',new T.BufferAttribute(XZ,2)); g.setIndex(idx); g.computeVertexNormals();
  const cap=new T.Mesh(g,new T.ShaderMaterial({uniforms:Object.assign({uSeg:SEGU,uSegW:SEGW},LU),side:T.DoubleSide,
    vertexShader:`attribute float aL,aB,aH; attribute vec2 aXZ; varying vec3 vN; varying vec3 vW; varying float vL,vB,vH; varying vec2 vXZ;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vL=aL; vB=aB; vH=aH; vXZ=aXZ; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec4 uSeg[12]; uniform float uSegW[12]; varying vec3 vN; varying vec3 vW; varying float vL,vB,vH; varying vec2 vXZ; ${N2} ${LIGHT}
      void main(){ vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 up=normalize(vW); float steep=1.-dot(n,up); vec2 xz=vXZ;
        // grass painted in two greens, with brushy streaks
        float p1=vn2(xz*.3+3.)*.7+vn2(xz*1.1)*.3, p2=vn2(xz*vec2(1.9,.5)+11.), p3=vn2(xz*2.6);
        vec3 c=mix(vec3(.55,.71,.43),vec3(.45,.62,.38),step(.56,p1)); c=mix(c,vec3(.63,.77,.48),step(.74,p2)*.55); c*=.97+.05*p3;
        // dirt paths with a drawn edge
        float pd=1e3; for(int i=0;i<12;i++){ vec4 s=uSeg[i]; vec2 ab=s.zw-s.xy; float t=clamp(dot(xz-s.xy,ab)/max(dot(ab,ab),1e-4),0.,1.); pd=min(pd,length(xz-s.xy-ab*t)-uSegW[i]); }
        pd+=(vn2(xz*1.7)-.5)*.22; float fw=fwidth(pd)*1.1+.004;
        c=mix(c,vec3(.84,.75,.57)*(.95+.08*vn2(xz*7.)),1.-smoothstep(-fw,fw,pd)); c=mix(c,vec3(.35,.33,.3),(1.-smoothstep(.0,fw*1.6,abs(pd-.01)))*.5);
        // sand by the sea, rock in the cliffs
        float sand=clamp(smoothstep(.035,.012,vL)*(.25+.75*vB)+smoothstep(-.02,-.25,vH)*vB,0.,1.); c=mix(c,vec3(.91,.84,.66)*(.96+.06*vn2(xz*5.)),sand);
        vec3 rock=mix(vec3(.67,.61,.54),vec3(.56,.51,.47),step(.5,fract(vH*2.6+vn2(xz*.7)*.7)));
        c=mix(c,rock,smoothstep(.3,.5,steep)*(1.-vB*.85));
        /* snow on the grass and the paths, thinner on the sand; in the rain the ground darkens and the paths hold puddles of sky */
        { float upn=dot(n,up); c=mix(c,vec3(.93,.95,.97)*(.97+.04*p3),uSnow*smoothstep(.75,.9,upn)*(1.-sand*.6));
          if(uWet>.01){ c*=1.-.16*uWet; float pud=smoothstep(.62,.7,vn2(xz*.8+7.3))*(1.-smoothstep(-fw,fw,pd)); c=mix(c,uSky*.9+vec3(.05),pud*uWet*.55); } }
        float ct=1.-smoothstep(0.,fwidth(vH)*1.3+.003,abs(vH+.05)); c=mix(c,vec3(.24,.22,.21),ct*(1.-vB)*step(.15,steep)*.9);
        gl_FragColor=vec4(toon(c,n,vW),1.); }`}));
  cap.userData.cast=true; sc.add(cap);
  // the sea: shallow and bright by the land, foam where it meets the shore, painted ripples
  const ld=new Uint16Array(CN*CN*4); for(let k=0;k<CN*CN;k++){ ld[k*4]=T.DataUtils.toHalfFloat(GL[k]); ld[k*4+1]=T.DataUtils.toHalfFloat(GH[k]); ld[k*4+2]=T.DataUtils.toHalfFloat(GB[k]); ld[k*4+3]=T.DataUtils.toHalfFloat(1); }
  const landTex=new T.DataTexture(ld,CN,CN,T.RGBAFormat,T.HalfFloatType); landTex.minFilter=landTex.magFilter=T.LinearFilter; landTex.needsUpdate=true;
  const sea=new T.Mesh(new T.SphereGeometry(R+WATER,160,110),new T.ShaderMaterial({uniforms:Object.assign({uLand:{value:landTex},uTime:G.uTime},LU),
    vertexShader:TOON_V(),
    fragmentShader:`uniform sampler2D uLand; uniform float uTime; varying vec3 vN; varying vec3 vW; ${N2} ${LIGHT}
      void main(){ vec3 d=normalize(vW); float a=acos(clamp(d.y,-1.,1.)); vec2 xz=d.xz*(a*${R}./max(sin(a),1e-4));
        vec2 g=((xz+${CAPR}.)/${CS}+.5)/${CN}.; float hg=-1.6; if(d.y>0.&&g.x>0.&&g.x<1.&&g.y>0.&&g.y<1.) hg=texture2D(uLand,g).g;
        float dep=${WATER}-hg;
        vec3 c=mix(vec3(.5,.84,.8),vec3(.27,.66,.73),smoothstep(.0,.3,dep)); c=mix(c,vec3(.18,.5,.66),smoothstep(.3,.7,dep));
        float rip=vn2(xz*vec2(.5,1.7)+vec2(uTime*.18,uTime*.05)); c=mix(c,vec3(.74,.92,.9),smoothstep(.72,.75,rip)*.5);
        float fo=1.-smoothstep(.0,.045+.025*sin(uTime*1.3+xz.x*.6+xz.y*.5),dep);
        float fo2=smoothstep(.12,.135,dep)*(1.-smoothstep(.15,.17,dep))*step(.45,vn2(xz*2.2+uTime*.25));
        c=mix(c,vec3(.97,.99,.97),max(fo,fo2*.8));
        gl_FragColor=vec4(toon(c,normalize(vN),vW),1.); }`}));
  sea.userData.cast=false; sc.add(sea);
  // the sky: blue overhead, pale at the horizon, flat painted clouds, the hole as a pale ring by day
  const sky=new T.Mesh(new T.SphereGeometry(300,48,32),new T.ShaderMaterial({uniforms:Object.assign({uUp:UPU,uBH:SKYBH,uTime:G.uTime,uSpace:SPACEU,uNight:LU.uNight},SKYU),side:T.BackSide,depthWrite:false,
    vertexShader:`varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uUp,uBH,uSunD,uMoonD; uniform float uTime,uSpace,uNight,uDusk,uOver,uBow; varying vec3 vD; ${EARTH_GLSL}
      void main(){ vec3 d=normalize(vD); float h=dot(d,uUp), sa=dot(d,uSunD);
        /* by day blue overhead and pale at the horizon; at sunrise and sunset warm low down, deepest by the sun; at night dark blue */
        vec3 c=mix(vec3(.85,.92,.9),vec3(.6,.82,.9),smoothstep(-.06,.22,h)); c=mix(c,vec3(.36,.64,.84),smoothstep(.22,.9,h));
        vec3 k=mix(vec3(.98,.74,.54),vec3(.56,.56,.74),smoothstep(-.05,.42,h)); k=mix(k,vec3(.27,.33,.55),smoothstep(.42,.95,h)); k=mix(k,vec3(1.,.6,.38),pow(max(sa,0.),5.)*(1.-smoothstep(0.,.45,h))*.85);
        c=mix(c,k,uDusk); c=mix(c,mix(vec3(.1,.14,.23),vec3(.025,.04,.09),smoothstep(-.05,.7,h)),uNight);
        c=mix(c,mix(vec3(.66,.7,.72),vec3(.53,.58,.62),smoothstep(0.,.8,h))*(1.-.78*uNight),uOver*.85);   // overcast
        /* the sun low in the sky, and the moon and the stars at night */
        float sd=acos(clamp(sa,-1.,1.)), clear=1.-uOver, md=acos(clamp(dot(d,uMoonD),-1.,1.));
        c+=vec3(1.,.68,.42)*exp(-sd*sd*40.)*.35*uDusk*clear; c=mix(c,vec3(1.,.9,.7),smoothstep(.052,.044,sd)*uDusk*clear*smoothstep(-.03,.01,h));
        c+=vec3(.45,.55,.75)*exp(-md*md*300.)*.22*uNight*clear; c=mix(c,vec3(.95,.94,.86),smoothstep(.034,.028,md)*uNight*clear);
        if(uNight>.01){ vec3 cell=floor(d*260.); float s=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
          c+=step(.9965,s)*(.55+.45*sin(uTime*(.8+s*2.)+s*60.))*smoothstep(.02,.25,h)*clear*uNight*vec3(.95,.93,.86); }
        /* flat painted clouds: white by day, pink at sunset, dark at night, grey and more of them under rain */
        vec3 q=vec3(d.x*1.8,d.y*3.6,d.z*1.8)+vec3(uTime*.006,0.,uTime*.003); float f=efbm(q), fw=fwidth(f)*1.2+.002, band=smoothstep(.0,.1,h)*(1.-smoothstep(.7,.9,h)), th=.57-.13*uOver;
        float cl=smoothstep(th-fw,th+fw,f)*band, top=smoothstep(th+.04-fw,th+.04+fw,efbm(q+vec3(.02,.06,-.02)));
        vec3 c1=mix(mix(vec3(.86,.92,.93),vec3(.96,.72,.66),uDusk),vec3(.1,.13,.2),uNight), c2=mix(mix(vec3(.99,.99,.96),vec3(1.,.87,.72),uDusk),vec3(.17,.2,.28),uNight);
        c1=mix(c1,vec3(.55,.6,.64)*(1.-.75*uNight),uOver); c2=mix(c2,vec3(.7,.74,.77)*(1.-.75*uNight),uOver);
        c=mix(c,c1,cl); c=mix(c,c2,top*cl);
        /* after the rain, with the sun behind you: a rainbow, red outside */
        if(uBow>.01){ float ra=acos(clamp(dot(d,-uSunD),-1.,1.)), t=(.735-ra)/.036; float m=smoothstep(.7,.25,abs(t-.5))*smoothstep(-.02,.12,h);
          vec3 rb=clamp(vec3(1.5-abs(t*4.-.4),1.5-abs(t*4.-1.8),1.5-abs(t*4.-3.2)),0.,1.); c=mix(c,rb,m*uBow*.32); }
        float a=acos(clamp(dot(d,uBH),-1.,1.)); c=mix(c,c*.86,smoothstep(.034,.028,a)); c+=vec3(1.,.86,.66)*exp(-(((a-.036)*120.)*((a-.036)*120.)))*(.22+.4*uNight);
        if(uSpace>0.){ vec3 cell=floor(d*380.); float sh=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
          float star=step(.9965,sh)*(.5+.5*fract(sh*91.7))*smoothstep(.5,1.,uSpace);
          c=mix(c,vec3(.012,.014,.022)+star*vec3(.95,.92,.88),smoothstep(0.,1.,uSpace)); }
        gl_FragColor=vec4(c,1.); }`}));
  sky.renderOrder=-1; sky.frustumCulled=false; sky.layers.set(1); sc.add(sky);
}

/* ---------- people: small cartoon figures, each in what they wear in their photo ---------- */
const SHG=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const SHM=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,
  vertexShader:`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`varying vec2 vU; void main(){ float r=length(vU-.5)*2.; gl_FragColor=vec4(.12,.18,.16,(1.-smoothstep(.55,1.,r))*.32); }`});
const BOXG=new T.BoxGeometry(1,1,1);
function mesh(g,c,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){ const m=new T.Mesh(g,toonMat(c,{fig:true})); m.position.set(x,y,z); m.scale.set(sx,sy,sz); return m; }
/* each part of a person that moves on its own (the body, the head, the eyes, each leg, each upper arm and forearm) is one
   mesh: every piece of it is baked in, in its own colour, so a face, a collar or a head of curls costs a single draw */
const FIGM=toonMat('#ffffff',{fig:true,vc:true});
const FG={sph:new T.SphereGeometry(1,14,10).toNonIndexed(), ball:new T.IcosahedronGeometry(1,1), box:new T.BoxGeometry(1,1,1).toNonIndexed(), cone:new T.ConeGeometry(1,1,12).toNonIndexed(),
  limb:new T.CylinderGeometry(1,.78,1,12,1,true).toNonIndexed(), tube:new T.CylinderGeometry(1,1,1,14,1,true).toNonIndexed(), can:new T.CylinderGeometry(1,1,1,14).toNonIndexed(),
  band:new T.TorusGeometry(1,.06,6,26,Math.PI).toNonIndexed()};
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), fM=new T.Matrix4(), fNM=new T.Matrix3(), fQ=new T.Quaternion(), fE=new T.Euler(), fT=v3(), fS=v3(), fU=v3(), fW=v3(), fX=v3(1,0,0), fY=v3(0,1,0);
const tint=(c,k)=>C3(c).clone().lerp(C3(k>0?'#ffffff':'#000000'),Math.abs(k));
function part(){ const P=[],N=[],C=[], o={};
  /* one triangle, turned to face the way its normals point */
  o.tri=(a,na,b,nb,c,nc,col)=>{ fU.subVectors(b,a).cross(fW.subVectors(c,a)); if(fU.dot(fW.copy(na).add(nb).add(nc))<0){ [b,c]=[c,b]; [nb,nc]=[nc,nb]; } const k=C3(col);
    for(const [p,n] of [[a,na],[b,nb],[c,nc]]){ P.push(p.x,p.y,p.z); N.push(n.x,n.y,n.z); C.push(k.r,k.g,k.b); } };
  /* rows of points (each {p, n}) joined into quads, round to the start of each row again if wrap */
  o.grid=(G,col,wrap)=>{ for(let i=0;i<G.length-1;i++) for(let j=0;j<G[i].length-(wrap?0:1);j++){ const j2=(j+1)%G[i].length, a=G[i][j], b=G[i][j2], c=G[i+1][j2], d=G[i+1][j];
    o.tri(a.p,a.n,b.p,b.n,c.p,c.n,col); o.tri(a.p,a.n,c.p,c.n,d.p,d.n,col); } };
  /* the same, seen from both sides (a collar) */
  o.grid2=(G,col,wrap)=>{ o.grid(G,col,wrap); o.grid(G.map(r=>r.map(v=>({p:v.p,n:v.n.clone().negate()}))),col,wrap); };
  /* one of the shapes in FG, placed by a matrix; at x,y,z, scaled, turned; or with its own axes laid along a, b and c */
  o.geo=(g,col,M)=>{ const p=g.attributes.position, q=g.attributes.normal, V=[v3(),v3(),v3()], Q=[v3(),v3(),v3()]; fNM.getNormalMatrix(M);
    for(let i=0;i<p.count;i+=3){ for(let k=0;k<3;k++){ V[k].fromBufferAttribute(p,i+k).applyMatrix4(M); Q[k].fromBufferAttribute(q,i+k).applyMatrix3(fNM).normalize(); } o.tri(V[0],Q[0],V[1],Q[1],V[2],Q[2],col); } };
  o.put=(g,col,x,y,z,sx,sy=sx,sz=sx,rx=0,ry=0,rz=0)=>o.geo(g,col,fM.compose(fT.set(x,y,z),fQ.setFromEuler(fE.set(rx,ry,rz,'YXZ')),fS.set(sx,sy,sz)));
  o.along=(g,col,p,a,b,c)=>o.geo(g,col,fM.makeBasis(a,b,c).setPosition(p));
  /* the mesh, its origin at (x,y,z), so that it scales about there */
  o.mesh=(x=0,y=0,z=0)=>{ for(let i=0;i<P.length;i+=3){ P[i]-=x; P[i+1]-=y; P[i+2]-=z; } const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('normal',new T.Float32BufferAttribute(N,3)); g.setAttribute('color',new T.Float32BufferAttribute(C,3));
    const m=new T.Mesh(g,FIGM); m.position.set(x,y,z); return m; };
  return o; }
/* a tube through rings [y, half width, half depth, forward], all the way round or from angle a0 to a1 (0 is the front) */
function tube(R0,n=16,a0=0,a1=TAU){ const full=a1-a0>TAU-1e-4, m=full?n:n+1, cy=(R0[0][0]+R0[R0.length-1][0])/2;
  const G=R0.map(([y,rx,rz,dz=0])=>Array.from({length:m},(_,j)=>{ const a=a0+(a1-a0)*j/n; return {p:v3(Math.sin(a)*rx,y,Math.cos(a)*rz+dz),c:dz}; }));
  G.forEach((row,i)=>row.forEach((v,j)=>{ const L=row[full?(j+m-1)%m:Math.max(0,j-1)].p, Rr=row[full?(j+1)%m:Math.min(m-1,j+1)].p, U=G[Math.min(G.length-1,i+1)][j].p, D=G[Math.max(0,i-1)][j].p;
    v.n=v3().subVectors(Rr,L).cross(v3().subVectors(U,D)); if(v.n.lengthSq()<1e-12) v.n.set(0,v.p.y-cy,0); v.n.normalize(); if(v.n.dot(v3(v.p.x,v.p.y-cy,v.p.z-v.c))<0) v.n.negate(); }));
  return G; }
/* a head: where each direction from its middle lands on the skin. w, h, d: half its width, height and depth; jaw: how much
   narrower it gets toward the chin; chin: how far the chin comes forward */
const headF=(w,h,d,jaw,chin)=>u=>{ const lo=sstep(.15,-.95,u.y), fr=sstep(-.35,.35,u.z);
  return v3(u.x*w*(1-jaw*lo),u.y*h,u.z*d*lerp(1.07,1-.05*(1-lo),fr)+chin*lo*Math.max(0,u.z)); };
function fnorm(f,u){ const t1=v3().crossVectors(u,Math.abs(u.y)<.9?fY:fX).normalize(), t2=v3().crossVectors(u,t1), p=f(u),
  n=f(t1.multiplyScalar(.01).add(u).normalize()).sub(p).cross(f(t2.multiplyScalar(.01).add(u).normalize()).sub(p)).normalize(); return n.dot(p)<0?n.negate():n; }
function skin(f,n=26,m=18){ return Array.from({length:m+1},(_,i)=>{ const th=Math.PI*i/m; return Array.from({length:n},(_,j)=>{ const ph=TAU*j/n, u=v3(Math.sin(th)*Math.sin(ph),Math.cos(th),Math.sin(th)*Math.cos(ph)); return {p:f(u),n:fnorm(f,u)}; }); }); }
/* the point of the face seen at (x, y) from straight in front, lifted off the skin by off */
function onFace(f,x,y,off){ const w=f(v3(1,0,0)).x, h=f(v3(0,1,0)).y; let X=x/w, Y=y/h; const u=v3();
  for(let k=0;k<14;k++){ u.set(X,Y,Math.sqrt(Math.max(.01,1-X*X-Y*Y))).normalize(); const p=f(u); X+=(x-p.x)/w; Y+=(y-p.y)/h; }
  const n=fnorm(f,u); return {p:f(u).addScaledVector(n,off),n}; }
/* painting on a surface S(x, y, off) that curves away from you: a filled shape (its outline as seen from in front), laid on in
   rings so it follows the curve; or a stroke along a line of points, with a width at each */
function fine(pts,close,st=.007){ const o=[], n=pts.length; for(let i=0;i<(close?n:n-1);i++){ const a=pts[i], b=pts[(i+1)%n], k=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/st));
  for(let j=0;j<k;j++) o.push(a.map((v,c)=>lerp(v,b[c],j/k))); } if(!close) o.push(pts[n-1]); return o; }
function blot(B,S,pts,col,off=.003){ const q=fine(pts,true), cx=q.reduce((s,p)=>s+p[0],0)/q.length, cy=q.reduce((s,p)=>s+p[1],0)/q.length;
  B.grid([0,1,2,3].map(k=>q.map(([x,y])=>S(cx+(x-cx)*k/3,cy+(y-cy)*k/3,off))),col,true); }
function line(B,S,pts,wd,col,off=.003){ const q=fine(pts.map(([x,y],i)=>[x,y,Array.isArray(wd)?wd[i]:wd]),false,.005), G=[[],[]];
  q.forEach(([x,y,w],i)=>{ const a=q[Math.max(0,i-1)], b=q[Math.min(q.length-1,i+1)], tx=b[0]-a[0], ty=b[1]-a[1], l=Math.hypot(tx,ty)||1; w/=2;
    G[0].push(S(x-ty/l*w,y+tx/l*w,off)); G[1].push(S(x+ty/l*w,y-tx/l*w,off)); }); B.grid(G,col); }
/* ... or raised off it, h(x, y) high, over a patch from x0 to x1 and y0 to y1 (a nose), its normals from its own shape */
function bump(B,S,x0,x1,y0,y1,h,col,n=14){ const G=Array.from({length:n+1},(_,i)=>Array.from({length:n+1},(_,j)=>{ const x=lerp(x0,x1,j/n), y=lerp(y1,y0,i/n); return S(x,y,.0006+h(x,y)); }));
  G.forEach((r,i)=>r.forEach((v,j)=>{ const k=v3().subVectors(r[Math.min(n,j+1)].p,r[Math.max(0,j-1)].p).cross(v3().subVectors(G[Math.max(0,i-1)][j].p,G[Math.min(n,i+1)][j].p)).normalize(); v.n=k.dot(v.n)<0?k.negate():k; }));
  B.grid(G,col); }
/* ... or the space between two curves, top(x) and bot(x), across xs */
function band(B,S,xs,top,bot,col,off=.003){ B.grid([xs.map(x=>S(x,top(x),off)),xs.map(x=>S(x,bot(x),off))],col); }
const oval=(x,y,rx,ry,n=12)=>Array.from({length:n},(_,i)=>[x+Math.cos(TAU*i/n)*rx,y+Math.sin(TAU*i/n)*ry]);
/* hair that hugs the head out to a hairline: edge(a) is how far down from the crown it comes (a is the way round: 0 in front, a
   quarter turn to his left), lift(t,a) how far it stands off the skin, t going from the crown (0) to the hairline (1). Its
   edge turns in under the skin, so the pen draws the hairline. Gives back at(t,a,up), a point on the hair (up above it) and the
   normal there, and lump(), to lay a shape on it */
function cap(B,f,col,edge,lift,tilt=.25,n=12,m=40){ const A=v3(0,Math.cos(tilt),-Math.sin(tilt)), F=v3(0,Math.sin(tilt),Math.cos(tilt));
  const dir=(th,a)=>A.clone().multiplyScalar(Math.cos(th)).addScaledVector(F,Math.sin(th)*Math.cos(a)).addScaledVector(fX,Math.sin(th)*Math.sin(a)).normalize();
  const at=(t,a,up=0)=>{ const u=dir(edge(a)*t,a), nn=fnorm(f,u); return {p:f(u).addScaledVector(nn,lift(t,a)+up),n:nn}; };
  const G=[], E=[], I=[]; for(let i=0;i<=n;i++) G.push(Array.from({length:m},(_,j)=>at(i/n,TAU*j/m)));
  for(let i=1;i<=n;i++) G[i].forEach((v,j)=>{ const k=v3().subVectors(G[i][(j+1)%m].p,G[i][(j+m-1)%m].p).cross(v3().subVectors(G[Math.min(n,i+1)][j].p,G[i-1][j].p)).normalize(); if(k.dot(v.n)<0) k.negate(); v.k=k; });
  for(let i=1;i<=n;i++) G[i].forEach(v=>{ v.n=v.k; });
  for(let j=0;j<m;j++){ const a=TAU*j/m, th=edge(a), u=dir(th,a), nn=fnorm(f,u), tg=f(dir(th+.03,a)).sub(f(u)).normalize(); E.push({p:G[n][j].p,n:tg}); I.push({p:f(u).addScaledVector(nn,-.005),n:tg}); }
  B.grid(G,col,true); B.grid([E,I],col,true);
  /* a shape laid on it at p, long along L, its sizes r: long, wide, deep */
  const lump=(g,c,p,n,L,r)=>{ const l=L.clone().normalize(), s=v3().crossVectors(n,l); if(s.lengthSq()<1e-6) s.crossVectors(fX,l); s.normalize(); const d=v3().crossVectors(l,s).normalize(); B.along(g,c,p,l.multiplyScalar(r[0]),s.multiplyScalar(r[1]),d.multiplyScalar(r[2])); };
  return {at,lump}; }
const burns=(a,w=1.22,k=.3)=>k*Math.exp(-(((Math.abs(a)-w)/.13)**2));   // sideburns, just in front of the ears
/* hair, each of us as in our photo: tight black curls with short sides; a light brown crop pushed up at the front; dark
   waves swept back and up. (short is for you, the visitor) */
const HAIR={
  curly:(B,f,c)=>{ const c2=C3(c).clone().lerp(C3('#6a4a36'),.22), r=seeded(7), edge=a=>1.32-.36*Math.cos(a)+burns(a,1.2,.26), sd=a=>Math.abs(Math.sin(a)),
    H=cap(B,f,c,edge,(t,a)=>.006+.028*(1-t*t)*(1-.6*sd(a)));
    // coils all over the top, fewer down the faded sides; a few fall forward onto his forehead
    for(let k=0;k<84;k++){ const t=Math.sqrt((k+.5)/84)*.92, a=k*2.39996; if(t>.6&&sd(a)>.78||t>.74&&Math.cos(a)<-.15) continue;
      const rr=.025+r()*.012, q=H.at(t,a,rr*.3); B.put(FG.ball,k%3?c:c2,q.p.x,q.p.y,q.p.z,rr,rr*.85,rr,r()*3,r()*3,r()*3); }
    for(let k=0;k<8;k++){ const a=(k/7-.5)*1.6, rr=.022+r()*.008, q=H.at(.96+.04*(k%2),a,rr*.2); B.put(FG.ball,k%2?c2:c,q.p.x,q.p.y-.006,q.p.z,rr,rr*.9,rr,r()*3,r()*3,0); } },
  textured:(B,f,c)=>{ const fr=a=>Math.max(0,Math.cos(a))**1.5, rg=(t,a)=>(.5+.5*Math.cos(a*15+3*t))**2, edge=a=>1.4-.38*Math.cos(a)+burns(a,1.22,.2)+.05*fr(a)*rg(1,a);
    // short at the sides, the fringe pushed up into a ridge of pieces along the front, the pieces running back over the top
    cap(B,f,c,edge,(t,a)=>.01+.016*(1-t*t)+.052*fr(a)*sstep(.1,.72,t)*sstep(1,.9,t)+.012*sstep(.05,.5,t)*rg(t,a)*(.4+.6*fr(a)),.25,14,90); },
  wavy:(B,f,c)=>{ const fr=a=>Math.max(0,Math.cos(a*.85))**1.3, edge=a=>1.3-.4*Math.cos(a)+burns(a,1.22,.24);
    // high at the front and swept back over the top in waves, short at the sides; two locks fallen onto his forehead
    const H=cap(B,f,c,edge,(t,a)=>.011+.012*(1-t)+.07*fr(a)*sstep(0,.72,t)*sstep(1,.86,t)+.011*sstep(.05,.4,t)*(.5+.5*Math.cos(a*11+2.2*Math.sin(t*6)))**2,.25,14,80);
    for(const a of [-.4,-.22]){ const q=H.at(.97,a,-.002), L=v3(a-.2,-1,.3); H.lump(FG.sph,c,q.p.addScaledVector(L.clone().normalize(),.026),q.n,L,[.04,.013,.008]); } },
  short:(B,f,c)=>{ const edge=a=>1.3-.36*Math.cos(a)+burns(a,1.22,.2); cap(B,f,c,edge,(t,a)=>.012+.012*(1-t)); } };
/* a face, painted on: eyes (dark, with a glint; in a mesh of their own so they can blink), brows, a nose, a mouth, and
   what each of us has besides (a moustache and a chin beard, rosy cheeks) */
function face(B,E,f,o){ const F=o.face||{}, S=(x,y,off)=>onFace(f,x,y,off), ey=F.ey??-.012, ex=F.ex??.058, rw=F.rw??.0155, rh=F.rh??.021, my=ey-(F.mouth??.078), hc=o.hairC, bw=F.bw??.014;
  [-1,1].forEach(s=>{ blot(E,S,oval(s*ex,ey,rw,rh,14),'#221a16',.0035); blot(E,S,oval(s*ex+rw*.32,ey+rh*.4,rw*.36,rw*.36,8),'#fbf7f0',.005);
    const by=ey+(F.by??.05), ar=F.arch??.008; line(B,S,[[s*(ex-.03),by-.003+(F.knit??0)],[s*(ex-.006),by+ar],[s*(ex+.03),by-.002]],[bw,bw*.9,bw*.5],hc,.0035); });
  // the nose: a ridge from between the eyes to a rounded tip, its wings either side, so the pen finds only its underside
  const nt=ey-(F.nose??.036), ns=F.ns??1; bump(B,S,-.03,.03,nt-.022,ey+.004,(x,y)=>{ const t=clamp((ey-.004-y)/(ey-.004-nt),0,1.6), w=(.005+.008*Math.min(t,1))*ns;
    return (.012*ns*(t<1?t**1.5:Math.exp(-(((t-1)/.24)**2)))*Math.exp(-((x/w)**2))+.006*ns*[-1,1].reduce((m,s)=>m+Math.exp(-(((x-s*.011*ns)/.006)**2+((y-nt-.002)/.006)**2)),0)); },o.skin,18);
  if(o.cheeks) [-1,1].forEach(s=>blot(B,S,oval(s*.088,ey-.042,.02,.012),C3(o.skin).clone().lerp(C3('#ee8f7c'),.38),.003));
  const mc='#5a2822';
  if(o.mouth==='grin'){ const W=.046, top=x=>my+.004+.01*(x/W)**2, bot=x=>my+.01*(x/W)**2-.026*(1-(x/W)**2), xs=Array.from({length:11},(_,i)=>(i/10*2-1)*W);
    band(B,S,xs,top,bot,'#6b2a27',.003); band(B,S,xs.map(x=>x*.96),x=>top(x)-.001,x=>Math.min(top(x)-.001,Math.max(bot(x)+.004,top(x)-.011)),'#f6f0e6',.0042);
    blot(B,S,oval(0,my-.019,.014,.005,10),'#c4615c',.0042); }
  else if(o.mouth==='smirk') line(B,S,[[-.033,my+.006],[-.012,my-.004],[.012,my-.004],[.031,my+.008],[.036,my+.012]],[.004,.0075,.0075,.006,.003],mc,.0035);
  else line(B,S,[[-.032,my+.007],[-.012,my-.003],[.012,my-.003],[.032,my+.007]],[.004,.007,.007,.004],mc,.0035);
  if(o.mous) line(B,S,[[-.038,my+.008],[-.022,my+.017],[0,my+.019],[.022,my+.017],[.038,my+.008]],[.004,.008,.007,.008,.004],hc,.004);
  if(o.goatee){ blot(B,S,[[-.009,my-.012],[.009,my-.012],[.006,my-.03],[-.006,my-.03]],hc,.004);
    blot(B,S,[[-.022,my-.036],[0,my-.03],[.022,my-.036],[.026,my-.062],[.016,my-.08],[0,my-.086],[-.016,my-.08],[-.026,my-.062]],hc,.004);
    const q=S(0,my-.066,0); B.put(FG.sph,hc,0,q.p.y-.006,q.p.z-.012,.024,.022,.02,.5); }
  return ey; }
/* each of us, a little more ourselves. build broadens the shoulders (arm: the arms); head is the shape of the head (half width,
   height, depth, how much the jaw narrows, how far the chin comes forward); funnel and zip make a quarter-zip (funnel: how far
   open its collar is), polo a polo's collar and buttons; under is the shirt collar showing beneath; watch on the left wrist;
   mous(tache), goatee, cheeks, mouth; prop is the thing we carry for our project */
function figure(o){ const g=new T.Group(), body=new T.Group(); g.add(body); const W=o.build||1, Aw=o.arm||W, sk=o.skin, sh=o.shirt;
  const bd=part();
  bd.put(FG.sph,o.pants,0,.53,0,.138*W,.09,.088);
  // the top, hem to neck: in at the waist, out at the chest, round over the shoulders; a band at the hem
  const D=(o.depth||.7)/.7, TR=[[.465,.13,.092],[.475,.142,.1],[.535,.144,.102],[.545,.136,.096],[.65,.136,.096],[.79,.152,.108],[.86,.166,.11],[.9,.188,.104],[.932,.194,.094],[.952,.175,.082],[.968,.13,.068],[.981,.076,.055],[.99,.046,.044]].map(([y,x,z])=>[y,x*W,z*D]);
  bd.grid(tube(TR,22),sh,true);
  const TS=(x,y,off)=>{ let k=0; while(k<TR.length-2&&TR[k+1][0]<y) k++; const [y0,x0,z0]=TR[k], [y1,x1,z1]=TR[k+1], e=clamp((y-y0)/(y1-y0),0,1), rx=lerp(x0,x1,e), rz=lerp(z0,z1,e), q=clamp(x/rx,-.98,.98), z=rz*Math.sqrt(1-q*q), n=v3(x/(rx*rx),0,z/(rz*rz)).normalize();
    return {p:v3(x,y,z).addScaledVector(n,off),n}; };
  bd.put(FG.tube,sk,0,1.0,0,.045,.13,.043);   // the neck
  if(o.funnel){ const gp=o.funnel;   // a quarter-zip: its stand-up collar, open at the front where the zip is down
    bd.grid2(tube([[.95,.07*Math.max(1,W*.9),.064,.004],[.995,.066,.06,.006],[1.04,.062,.057,.007]],18,gp,TAU-gp),sh,false);
    const vb=o.zipV??.9; blot(bd,TS,[[-.046*gp/.5,.986],[.046*gp/.5,.986],[0,vb]],o.under||tint(sh,-.4),.002);
    if(o.under){ bd.grid(tube([[.955,.05,.047,.006],[.998,.048,.046,.006]],14),o.under,true);   // the shirt collar beneath, its points spread over the zip
      [-1,1].forEach(s=>blot(bd,TS,[[s*.008,.986],[s*.05,.978],[s*.03,.944]],tint(o.under,.15),.0035)); }
    line(bd,TS,[[0,vb+.004],[0,.755]],.008,o.zip,.003); const q=TS(.0,vb-.012,.008); bd.put(FG.box,o.zip,q.p.x+.004,q.p.y,q.p.z,.011,.03,.006,0,0,.12);
    line(bd,TS,[[-.004,.755],[.004,.755]],.006,o.zip,.003); }
  if(o.polo){   // a polo: a collar lying over the shoulders with its points on the chest, and a placket with two buttons
    bd.grid2(tube([[.995,.054,.05,.006],[.97,.074,.066,.006],[.955,.086,.074,.006]],18,.3,TAU-.3),sh,false);
    [-1,1].forEach(s=>{ const q=TS(s*.03,.948,.005); bd.put(FG.box,sh,q.p.x,q.p.y,q.p.z,.052,.04,.007,-.55,0,s*.42); });
    blot(bd,TS,[[-.013,.97],[.013,.97],[.013,.865],[-.013,.865]],o.polo,.003); [.94,.9].forEach(y=>{ const q=TS(0,y,.006); bd.put(FG.sph,'#59534d',q.p.x,q.p.y,q.p.z,.0065,.0065,.004); }); }
  if(o.logo) blot(bd,TS,oval(.075*W,.86,.011,.006,8),o.logo,.003);
  if(o.pack){ bd.put(FG.box,o.pack,0,.79,-.17,.24,.3,.12); bd.put(FG.box,tint(o.pack,-.3),0,.93,-.205,.2,.05,.06); [-1,1].forEach(s=>bd.put(FG.box,tint(o.pack,-.3),s*.085,.83,0,.028,.2,.235)); }   // and its straps
  body.add(bd.mesh());
  // legs: trousers tapering to the ankle, and shoes with a sole
  const legs=[-1,1].map(s=>{ const l=new T.Group(); l.position.set(s*.074*W,.5,0); const L=part();
    L.put(FG.sph,o.pants,0,0,0,.07); L.put(FG.limb,o.pants,0,-.215,0,.069,.43,.069); L.put(FG.tube,o.pants,0,-.418,0,.058,.026,.06);
    L.put(FG.box,o.sole||tint(o.shoes,-.35),0,-.488,.03,.098,.024,.21); L.put(FG.sph,o.shoes,0,-.458,.034,.052,.044,.102); L.put(FG.sph,o.shoes,0,-.445,-.012,.05,.05,.05);
    l.add(L.mesh()); body.add(l); return l; });
  // arms: a rounded shoulder and the upper arm in one piece, the forearm and hand in another, so a wave can bend at the elbow
  const fore=[], arms=[-1,1].map(s=>{ const a=new T.Group(); a.position.set(s*.2*W,.9,0); const U=part(), sl=o.short?sk:sh;
    U.put(FG.sph,sh,0,-.012,0,.049*Aw);
    if(o.short){ U.put(FG.limb,sh,0,-.055,0,.058*Aw,.11,.058*Aw); U.put(FG.tube,sh,0,-.104,0,.047*Aw,.014,.047*Aw); U.put(FG.limb,sk,0,-.14,0,.045*Aw,.09,.045*Aw); }
    else U.put(FG.limb,sh,0,-.09,0,.049*Aw,.18,.049*Aw);
    a.add(U.mesh()); const fa=new T.Group(); fa.position.y=-.18; fa.rotation.x=-.12; a.add(fa); const Fm=part();
    Fm.put(FG.sph,sl,0,0,0,.039*Aw); Fm.put(FG.limb,sl,0,-.075,0,.04*Aw,.15,.04*Aw);
    if(!o.short) Fm.put(FG.tube,sh,0,-.14,0,.035*Aw,.026,.035*Aw);   // a ribbed cuff
    Fm.put(FG.sph,sk,0,-.19,.004,.024*Aw,.043,.034*Aw); Fm.put(FG.sph,sk,-s*.006,-.172,.026,.012,.022,.012,.4);   // the hand, palm in, thumb forward
    if(o.watch&&s>0){ Fm.put(FG.tube,o.watch,0,-.128,0,.034*Aw,.016,.034*Aw); Fm.put(FG.can,o.watch,.034*Aw,-.128,0,.016,.008,.016,0,0,Math.PI/2); Fm.put(FG.can,'#5d6066',.038*Aw,-.128,0,.011,.002,.011,0,0,Math.PI/2); }
    if(o.prop==='rocket'&&s<0){ const z=.05;   // Ogive: a model rocket in his hand
      Fm.put(FG.can,'#f4f0e8',0,-.15,z,.03,.17,.03); Fm.put(FG.cone,'#f4f0e8',0,-.03,z,.03,.07,.03); Fm.put(FG.can,'#ef8a3c',0,-.105,z,.032,.022,.032);
      [-1,1].forEach(k=>Fm.put(FG.box,'#ffc392',k*.038,-.222,z,.03,.045,.008)); }
    fa.add(Fm.mesh()); fore.push(fa); body.add(a); return a; });
  // the head
  const head=new T.Group(); head.position.y=1.165; body.add(head); const H=part(), E=part(), hd=o.head||[.152,.172,.16,.14,.024], f=headF(...hd);
  H.grid(skin(f),sk,true);
  [-1,1].forEach(s=>H.put(FG.sph,sk,s*hd[0]*.97,-.022,-.008,.02,.038,.028,0,s*.35));   // ears
  const ey=face(H,E,f,o);
  HAIR[o.hair](H,f,o.hairC);
  if(o.prop==='headset'){ const hc='#2a2c31';   // Kríos: a headset, its band behind his hair, the mic at his mouth
    H.put(FG.band,hc,0,.0,-.01,hd[0]+.035,.225,.225,-.55); [-1,1].forEach(s=>{ H.put(FG.sph,hc,s*(hd[0]+.03),-.02,-.004,.024,.046,.042); H.put(FG.can,'#4a4d54',s*(hd[0]+.05),-.02,-.004,.03,.006,.03,0,0,Math.PI/2); });
    const m0=v3(-(hd[0]+.04),-.04,.03), mq=onFace(f,-.036,ey-.075,.016).p, L=mq.clone().sub(m0), mid=m0.clone().add(mq).multiplyScalar(.5), s1=v3().crossVectors(L,fY).normalize().multiplyScalar(.006), s2=v3().crossVectors(L,s1).normalize().multiplyScalar(.006);
    H.along(FG.box,hc,mid,L,s1,s2); H.put(FG.sph,hc,mq.x,mq.y,mq.z,.014); }
  head.add(H.mesh()); const em=E.mesh(0,ey,0); head.add(em);
  let prop=null;
  if(o.prop==='drone'){ prop=drone('#7fd3ff'); prop.matrixAutoUpdate=true; prop.scale.setScalar(.62); prop.position.set(-.46,1.48,.06); g.add(prop); }   // Aetos: a little drone at his shoulder, clear of the hand he waves with
  const shd=new T.Mesh(SHG,SHM); shd.scale.set(.62,1,.62); shd.position.y=.025; shd.renderOrder=1; shd.layers.set(1); g.add(shd);
  g.userData={legs,arms,fore,head,body,eyes:[em],drone:o.prop==='drone'?prop:null}; return g; }
/* what each of us says: every landmark stands, so we talk about them as they are, and mention it if you came by way of
   the flight and stopped at one of them up there */
const NAME={kr:'Kríos',ae:'Aetos',ph:'Pharos',og:'Ogive',be:'Beacon'}, MET=new Set(); let FRESH=[];
function linesFor(i){ const land=!!st.land, been=id=>!land&&S.docked.has(id), back=MET.has(i);
  if(i===0){ const last='And this is me. Come and say hello properly.';
    if(back) return ['Good to see you again.','Michael is up by his rocket and Abraham is in the square, if you haven\'t caught them yet.',last];
    return [...(land?['Oh, hello! Welcome to Earth.']:['Oh, hello! That contact inside the horizon? It was us.','Welcome to Earth.']),
      'I\'m Ahroon. Michael, Abraham and I build Heloria Labs together, and everything round here is something we\'ve made.',
      `That radar on the rocks is Aetos, mine.${land?'':' It\'s what picked you up.'} When the sky fills with drones, it works out which one actually matters.`,
      `The lighthouse out on the cliff is mine too: Pharos.${been('ph')?' You\'ve flown it already.':''} When GPS is jammed, spoofed or gone, its drone keeps going, and it knows when it doesn\'t know.`,
      'Abraham is in the square by Kríos, and Michael is up by his rocket. Go and say hi.',last]; }
  if(i===1) return [back?'Hey, good to see you again.':'Hey, I\'m Michael.',
    `This rocket is Ogive, my project: AI tools for OpenRocket.${been('og')?' You\'ve launched it up there already.':''} Name the height, and it reworks the design until the rocket gets there.`,
    'I built Kríos too, down in the square. That one belongs to all three of us: it\'s our group project.',
    'That\'s me. Come and find me.'];
  return [back?'Hi again!':'Hi, I\'m Abraham.',
    `The glass sculpture is Kríos, our group project: Michael built it, and all three of us are behind it.${been('kr')?' You\'ve made a call on it up there already.':''}`,
    'Reps rehearse the calls that matter against a buyer who answers back, before a real one ever hears them.',
    'That\'s me. Say hi any time.']; }
const CREW=[
  {name:'Ahroon Santhosh',first:'Ahroon',li:'https://www.linkedin.com/in/ahroon-santhosh/',at:AHR,face:START,pitch:520,
    look:{shirt:'#ecebe5',funnel:.55,zipV:.9,under:'#93b1d8',zip:'#45484e',watch:'#1c1d20',build:.95,pants:'#3d4350',shoes:'#2b2b2e',skin:'#9c6646',
      head:[.148,.176,.16,.17,.03],face:{bw:.016,arch:.006},mouth:'smirk',hair:'curly',hairC:'#1b1411',prop:'drone'}},
  {name:'Michael Sweeney Heffernan',first:'Michael',li:'https://www.linkedin.com/in/michael-sweeney-heffernan-589155354',at:[6.1,11.1],face:[5,8.6],pitch:430,
    look:{shirt:'#262524',short:true,polo:'#1c1b1a',build:1.14,arm:1.2,depth:.74,pants:'#4a4f5a',shoes:'#ece7dc',sole:'#cfc8bb',skin:'#e8b898',
      head:[.16,.172,.164,.1,.024],face:{rh:.016,bw:.011,arch:.011,by:.054},mouth:'grin',cheeks:true,hair:'textured',hairC:'#9a6842',prop:'rocket'}},
  {name:'Abraham Sabu Kurian',first:'Abraham',li:'https://www.linkedin.com/in/abraham-sabu-kurian/',at:[1.3,-2.7],face:[1.3,-8],pitch:470,
    look:{shirt:'#222838',funnel:.32,zipV:.925,zip:'#b6bac2',logo:'#8d93a0',watch:'#202224',pants:'#d6b88c',shoes:'#3b2d25',skin:'#94603f',
      head:[.148,.18,.16,.2,.03],face:{bw:.015,arch:.004,knit:.004},mouth:'smile',mous:true,goatee:true,hair:'wavy',hairC:'#251c17',prop:'headset'}}];
CREW.forEach((c,i)=>c.lines=linesFor(i));
let people=[], me=null;
function buildPeople(){
  people=CREW.map((c,i)=>{ const g=figure(c.look); sc.add(g); const [x,z]=c.at; obs(x,z,.4,1.2); return {...c,i,g,x,z,ob:OBS[OBS.length-1],walk:0,ph:0,dir:at(x,z),f:tang(at(x,z),at(c.face[0],c.face[1]),new T.Vector3()),near:false,greeted:false,wave:0,blink:2+i}; });
  me=figure({shirt:'#ef8a3c',pants:'#3a3f4a',shoes:'#f2efe8',skin:'#c99a74',hair:'short',hairC:'#3a2a1e',pack:'#5b6b7d'}); sc.add(me);
  /* a light over anyone you have not met yet, tall enough to see over the curve of the world */
  const bg=new T.CylinderGeometry(.035,.2,14,14,1,true); bg.translate(0,7,0);
  people.forEach(p=>{ const m=new T.Mesh(bg,new T.ShaderMaterial({uniforms:{uK:{value:0},uCol:{value:new T.Color(p.i===0?'#ffb26a':'#ffe8c6')}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
      vertexShader:`varying float vY; varying vec3 vN,vW; void main(){ vY=position.y/14.; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform float uK; uniform vec3 uCol; varying float vY; varying vec3 vN,vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),V));
        float a=pow(f,1.4)*pow(1.-vY,1.5)*smoothstep(0.,.04,vY)*uK; gl_FragColor=vec4(uCol*a*.6,1.); }`}));
    m.userData.noInk=true; m.frustumCulled=false; m.renderOrder=6; m.visible=false; sc.add(m); p.beam=m; }); }
/* and, when someone you still have to meet is off the screen, their name at its edge with an arrow the way to go; click it to walk there */
const edges=CREW.map((c,i)=>{ const e=document.createElement('span'); e.className='cre ui'; e.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6H10M6.6 2.4 10.2 6 6.6 9.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square"/></svg>'+c.first; $('#crLabels',el).appendChild(e);
  e.addEventListener('click',ev=>{ ev.stopPropagation(); if(S.st===st&&S.mode==='station'&&people[i]) goTalk(people[i]); }); return e; });
const Y_UP=new T.Vector3(0,1,0);

/* ---------- the rocket you flew in orbit, at the size of a small house: a cream cone with peach fins, and a real hatch ---------- */
const RKR=1.2, RKH=4.4, RKB=.35, FLOOR=.42, BAND=2.05, GAP=.42, rAt=y=>RKR*(1-(y-RKB)/RKH);
const HINGE_Z=rAt(FLOOR)-.035, DOOR_L=BAND-FLOOR, DOOR_SHUT=-Math.atan((rAt(FLOOR)-rAt(BAND))/DOOR_L), DROP=Math.asin(FLOOR/DOOR_L), DOOR_OPEN=Math.PI/2+DROP, RAMP_END=HINGE_Z+DOOR_L*Math.cos(DROP), OUT_Z=Math.hypot(START[0]-PAD[0],START[1]-PAD[1]);
const RK={g:null,door:null,flame:null,shadow:null,puffs:[]}, PADU=at(PAD[0],PAD[1]), RKN=new T.Vector3(), padTop=PADU.clone().multiplyScalar(R+.1);
const rkM=new T.Matrix4(), rkW=new T.Matrix4(), rkX=new T.Vector3(), rkY=new T.Vector3(), rkZ=new T.Vector3(), shM0=frameAt(PAD[0],PAD[1],0,.12);
const B0=new T.Vector3(), B1=new T.Vector3(), B2=new T.Vector3(), B3=new T.Vector3();
// the hull is open where the hatch is; seen from inside it is dark
const HULL_F=`uniform vec3 uC; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
  void main(){ nearFade(vW); if(!gl_FrontFacing){ gl_FragColor=vec4(.13,.12,.13,1.); return; } gl_FragColor=vec4(toon(uC,normalize(vN),vW),1.); }`;
/* Andrena on the rocket's side: a band of letters on the hull between the hatch's top and the orange ring */
function rocketName(){ const cv=document.createElement('canvas'); cv.width=1536; cv.height=256; const tx=new T.CanvasTexture(cv); tx.anisotropy=4;
  const draw=()=>{ const c=cv.getContext('2d'); c.clearRect(0,0,cv.width,cv.height); c.fillStyle='#000'; c.textAlign='center'; c.textBaseline='middle';
    let f=200; c.font=`900 ${f}px Doto, monospace`; const w=c.measureText('ANDRENA').width; if(w>cv.width*.92){ f*=cv.width*.92/w; c.font=`900 ${f}px Doto, monospace`; }
    c.fillText('ANDRENA',cv.width/2,cv.height*.55); tx.needsUpdate=true; };
  draw(); if(document.fonts&&document.fonts.load) document.fonts.load('900 40px Doto').then(draw).catch(()=>{});
  const y0=2.16, y1=2.41, th=1.1, m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3('#2a241d')},uMap:{value:tx},uCut:{value:1}},LU),vertexShader:TOON_V(true),
    fragmentShader:`uniform vec3 uC; uniform sampler2D uMap; varying vec3 vN; varying vec3 vW; varying vec3 vC; varying vec2 vUv; ${LIGHT} ${NEAR}
      void main(){ nearFade(vW); if(texture2D(uMap,vUv).a<.5) discard; gl_FragColor=vec4(toon(uC,normalize(vN),vW),1.); }`});
  const g=new T.Mesh(new T.CylinderGeometry(rAt(y1)+.01,rAt(y0)+.01,y1-y0,48,1,true,-th,2*th),m); g.position.y=(y0+y1)/2; g.userData.noInk=true; RK.g.add(g); }
function buildRocket(){ const g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g); RK.g=g; rocketName();
  const add=(m,x,y,z)=>{ m.position.set(x,y,z); g.add(m); return m; };
  const hullM=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3('#EEE9DF')},uCut:{value:1}},LU),vertexShader:TOON_V(),fragmentShader:HULL_F,side:T.DoubleSide});
  add(new T.Mesh(new T.CylinderGeometry(rAt(BAND),rAt(RKB),BAND-RKB,40,1,true,GAP,TAU-2*GAP),hullM),0,(RKB+BAND)/2,0);
  add(new T.Mesh(new T.ConeGeometry(rAt(BAND),RKH-(BAND-RKB),40,1,true),hullM),0,BAND+(RKH-(BAND-RKB))/2,0);
  add(new T.Mesh(new T.CircleGeometry(rAt(FLOOR)-.02,32).rotateX(-Math.PI/2),toonMat('#6a6560')),0,FLOOR,0);
  add(new T.Mesh(new T.CircleGeometry(RKR,32).rotateX(Math.PI/2),toonMat('#5a5f63')),0,RKB,0);
  add(new T.Mesh(new T.CylinderGeometry(rAt(2.54)+.016,rAt(2.42)+.016,.12,40),toonMat('#ef8a3c')),0,2.48,0);
  add(new T.Mesh(new T.CylinderGeometry(.5,.66,.34,24),toonMat('#5a5f63')),0,.19,0);
  [Math.PI/4,-Math.PI/4].forEach(a=>{ const f=add(new T.Mesh(new T.BoxGeometry(3.1,1.25,.09),toonMat('#FFC392')),0,.64,0); f.rotation.y=a; });
  const w=add(new T.Mesh(new T.SphereGeometry(.17,16,10),toonMat('#38444d')),0,3.25,rAt(3.25)-.02); w.scale.set(1,1,.4); w.rotation.x=-Math.atan(RKR/RKH);
  /* the hatch is cut out of the hull itself: a curved panel that closes flush into the opening, inside a dark frame (two
     posts and a header), swinging on a hinge barrel along its bottom edge. Light outside, a grey deck inside, which is the
     side you walk on when it lies open as a ramp */
  const frM=toonMat('#4f5458'), seg=(r0,r1,y0,y1,a0,a1,m,sides)=>{ const gm=new T.CylinderGeometry(r1,r0,y1-y0,sides||10,1,true,a0,a1-a0); return add(new T.Mesh(gm,m),0,(y0+y1)/2,0); };
  const JAMB=.07, PROUD=.022;
  seg(rAt(FLOOR)+PROUD,rAt(BAND)+PROUD,FLOOR-.02,BAND+.02,GAP,GAP+JAMB,frM,3);            // the post on one side
  seg(rAt(FLOOR)+PROUD,rAt(BAND)+PROUD,FLOOR-.02,BAND+.02,-GAP-JAMB,-GAP,frM,3);          // and on the other
  seg(rAt(BAND)+PROUD,rAt(BAND+.075)+PROUD,BAND,BAND+.075,-GAP-JAMB,GAP+JAMB,frM,12);      // the header over it
  const hinge=add(new T.Mesh(new T.CylinderGeometry(.05,.05,2*rAt(FLOOR)*Math.sin(GAP)+.08,14).rotateZ(Math.PI/2),frM),0,FLOOR,HINGE_Z+.035);   // the hinge barrel
  const piv=add(new T.Group(),0,FLOOR,HINGE_Z); piv.rotation.x=DOOR_SHUT; RK.door=piv;
  const din=new T.Group(); din.rotation.x=-DOOR_SHUT; piv.add(din);   // at DOOR_SHUT the panel sits exactly in the hull
  const doorM=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3('#EEE9DF')},uIn:{value:C3('#8f8a82')}},LU),vertexShader:TOON_V(),side:T.DoubleSide,
    fragmentShader:`uniform vec3 uC,uIn; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
      void main(){ nearFade(vW); vec3 n=normalize(vN); gl_FragColor=vec4(gl_FrontFacing?toon(uC,n,vW):toon(uIn,-n,vW),1.); }`});
  const panel=new T.Mesh(new T.CylinderGeometry(rAt(BAND)-.004,rAt(FLOOR)-.004,BAND-FLOOR,14,1,true,-GAP+.004,2*GAP-.008).translate(0,(FLOOR+BAND)/2-FLOOR,-HINGE_Z),doorM); din.add(panel);
  const hd=new T.Mesh(new T.BoxGeometry(.05,.22,.05),frM); hd.position.set(rAt(FLOOR+DOOR_L*.55)*Math.sin(GAP*.62),DOOR_L*.55,rAt(FLOOR+DOOR_L*.55)*Math.cos(GAP*.62)-HINGE_Z+.02); hd.rotation.y=GAP*.62; din.add(hd);   // the handle
  [-1,1].forEach(sd=>{ const a=sd*GAP*.62, r=rAt(FLOOR+.12); const k=new T.Mesh(new T.BoxGeometry(.12,.24,.04),frM); k.position.set(r*Math.sin(a),.12,r*Math.cos(a)-HINGE_Z+.016); k.rotation.y=a; din.add(k); });   // the hinge straps, on the door
  [[-.7,.3],[.7,.3],[-.7,.86],[.7,.86]].forEach(([u,v])=>{ const y=DOOR_L*v, a=GAP*u, r=rAt(FLOOR+y); const b=new T.Mesh(new T.CylinderGeometry(.022,.022,.02,8).rotateX(Math.PI/2),frM); b.position.set(r*Math.sin(a),y,r*Math.cos(a)-HINGE_Z+.008); b.rotation.y=a; din.add(b); });   // four bolts
  const fl=add(new T.Group(),0,.02,0); fl.add(new T.Mesh(new T.ConeGeometry(.5,2.2,16).rotateX(Math.PI).translate(0,-1.1,0),flatMat('#ff9b3d')),new T.Mesh(new T.ConeGeometry(.27,1.25,12).rotateX(Math.PI).translate(0,-.62,0),flatMat('#fff1b8'))); RK.flame=fl;
  const sh=new T.Mesh(SHG,SHM); sh.matrixAutoUpdate=false; sh.renderOrder=1; sh.layers.set(1); sc.add(sh); RK.shadow=sh;
  const pm=toonMat('#f3efe7'); for(let i=0;i<120;i++){ const m=new T.Mesh(GEO.blob,pm); m.visible=false; sc.add(m); RK.puffs.push({m,t:9,life:1,v:new T.Vector3(),s:1}); }
  tang(PADU,at(PAD[0]+DOOR[0]*.2,PAD[1]+DOOR[1]*.2),RKN);
  // the hole hangs in the sky behind the pad, 42 degrees up, so the rocket comes down out of it toward you
  SKYBH.value.copy(PADU).multiplyScalar(Math.cos(.73)).addScaledVector(RKN,-Math.sin(.73)).normalize();
  // the way down: one smooth curve straight out of the hole, bending to come in vertically over the pad
  B0.copy(padTop).addScaledVector(SKYBH.value,36); B1.copy(padTop).addScaledVector(SKYBH.value,17); B2.copy(padTop).addScaledVector(PADU,9); B3.copy(padTop).addScaledVector(PADU,1.7); }
function rocketPose(pos,axis,wob=0){ rkY.copy(axis); rkZ.copy(RKN).addScaledVector(rkY,-rkY.dot(RKN)).normalize(); rkX.crossVectors(rkY,rkZ); rkM.makeBasis(rkX,rkY,rkZ);
  if(wob) rkM.multiply(rkW.makeRotationZ(wob)); rkM.setPosition(pos); RK.g.matrix.copy(rkM); RK.g.matrixWorldNeedsUpdate=true;
  const k=clamp(1-V.copy(pos).sub(padTop).dot(PADU)/14,0,1), sz=.6+2.6*k; RK.shadow.visible=k>0; RK.shadow.matrix.copy(shM0).scale(V.set(sz,1,sz)); }
function bez(s,o){ const a=1-s; return o.copy(B0).multiplyScalar(a*a*a).addScaledVector(B1,3*a*a*s).addScaledVector(B2,3*a*s*s).addScaledVector(B3,s*s*s); }
function bezD(s,o){ const a=1-s; o.copy(B1).sub(B0).multiplyScalar(3*a*a); o.addScaledVector(V.copy(B2).sub(B1),6*a*s); return o.addScaledVector(V.copy(B3).sub(B2),3*s*s); }
/* where the rocket is c seconds in: down the curve, slowing all the way to a hover over the pad, then a gentle last drop */
const T_HOV=3, T_LAND=4.2, T_DOOR=4.6, T_OUT=5.45, T_WALK=7.1, T_CAM=6.1, T_END=7.6;
function flight(c,pos,vel){ if(c<T_HOV){ const u=c/T_HOV, sv=1-Math.pow(1-u,3), ds=3*Math.pow(1-u,2)/T_HOV; bez(sv,pos); bezD(sv,vel).multiplyScalar(ds); }
  else { const u=clamp((c-T_HOV)/(T_LAND-T_HOV),0,1), k=u*u*(3-2*u); pos.copy(padTop).addScaledVector(PADU,1.7*(1-k)); vel.copy(PADU).multiplyScalar(-1.7*6*u*(1-u)/(T_LAND-T_HOV)); } }
const fPos=new T.Vector3(), fVel=new T.Vector3(), fAx=new T.Vector3();
function rocketFly(c,t){ flight(c,fPos,fVel); const sp=fVel.length(); fAx.copy(PADU); if(sp>1e-4) fAx.addScaledVector(fVel,-Math.min(1,sp/16)*.8/sp); fAx.normalize();
  const wob=Math.sin(c*2.3)*.025*sstep(T_HOV-.6,T_HOV,c)*(1-sstep(T_LAND-.45,T_LAND,c)); rocketPose(c>=T_LAND?padTop:fPos,c>=T_LAND?PADU:fAx,wob); return sp; }
function puff(pos,vel,s,life){ const p=RK.puffs.find(q=>q.t>=q.life)||RK.puffs[0]; p.t=0; p.life=life; p.s=s; p.m.position.copy(pos); p.v.copy(vel); p.m.visible=true; }
function puffsUpdate(dt){ for(const p of RK.puffs){ if(p.t>=p.life){ p.m.visible=false; continue; } p.t+=dt; p.m.position.addScaledVector(p.v,dt); p.v.multiplyScalar(Math.exp(-2.4*dt));
  const k=p.t/p.life, sz=Math.max(.001,p.s*Math.sin(Math.PI*Math.min(1,k*1.15))); p.m.scale.set(sz,sz*.62,sz); } }
/* the landing: out of the hole, a long braking curve, a hover, a soft touchdown, the hatch drops, and out you walk */
const CUT={on:false,t:0,look:new T.Vector3()}, CAMC=[PAD[0]+2.6,PAD[1]+6.6];
function rocketLanded(){ rocketPose(padTop,PADU); RK.door.rotation.x=DOOR_OPEN; RK.flame.visible=false; RK.puffs.forEach(p=>{ p.t=p.life; p.m.visible=false; }); }
function placeAtStart(){ const P=player; P.u.copy(at(START[0],START[1])); tang(P.u,at(START[0]+FACE[0],START[1]+FACE[1]),P.f); C.f.copy(P.f); C.pitch=C.pEff=C.PITCH; C.zoom=1; C.dragT=9; C.tk=0; P.tgt=null; P.speed=0;
  [P.x,P.z]=START; P.h=standH(START[0],START[1]); C.camH=P.h; C.tgt.copy(P.u).multiplyScalar(R+P.h+C.HEAD); C.dist=rigLimit(START[0],START[1],P.u,P.f,C.pitch,C.D0()); }
function endCut(){ CUT.on=false; el.classList.remove('cut'); document.documentElement.classList.remove('crcut'); me.visible=true; rocketLanded(); placeAtStart(); cardT=0; started=false; el.classList.remove('walked'); hint.classList.remove('gone'); A.thrust(0); A.roar(0); S.stSnap=true; }
function skipCut(){ if(CUT.on){ CUT.t=T_END; endCut(); } }
st.cutscene=function(){ CUT.on=true; CUT.t=0; document.documentElement.classList.add('crcut'); CUT.landed=false; CUT.door=false; CUT.ph=0; el.classList.add('cut'); me.visible=false; RK.door.rotation.x=DOOR_SHUT; RK.flame.visible=true; closeTalk(); rocketFly(0,0); CUT.look.copy(fPos); S.stSnap=true; };
function camAt(x,z,h,o){ return at(x,z,o).multiplyScalar(R+standH(x,z)+h); }
/* the walk out, as distance from the middle of the rocket toward the hatch: along the floor, down the ramp, onto the pad */
const rampY=z=>z<HINGE_Z?FLOOR:z<RAMP_END?FLOOR-(z-HINGE_Z)*Math.tan(DROP):0;
const cT=new T.Vector3(), cG=new T.Vector3(), cL=new T.Vector3(), cF=new T.Vector3();
function cutUpdate(dt,t){ CUT.t+=dt; const c=CUT.t, up=PADU;
  const sp=rocketFly(c,t), hgt=c<T_LAND?V.copy(fPos).sub(padTop).dot(up):0;
  // the flame: steady while it brakes, strongest in the hover, gone just after touchdown
  const fk=c<T_HOV?.65+.55*sstep(.35,.95,c/T_HOV):c<T_LAND?.95-.4*sstep(T_LAND-.5,T_LAND,c):Math.max(0,1-(c-T_LAND)/.35)*.55;
  RK.flame.visible=fk>.02; RK.flame.scale.set(.95+.05*Math.sin(t*31),fk*(.88+.18*Math.sin(t*43)+.08*Math.sin(t*19)),.95+.05*Math.sin(t*29));
  if(c<T_LAND){ A.thrust(.35+.6*fk); A.roar(.06+.1*fk);
    if(hgt<4&&Math.random()<dt*22*(1-hgt/4)){ const a=Math.random()*TAU, r=.7+Math.random()*.8; at(PAD[0]+Math.cos(a)*r,PAD[1]+Math.sin(a)*r,V2).multiplyScalar(R+.2);
      tang(up,at(PAD[0]+Math.cos(a)*3,PAD[1]+Math.sin(a)*3),V3).multiplyScalar(2+Math.random()*1.5).addScaledVector(up,.3); puff(V2,V3,.16+Math.random()*.14,1); } }
  if(c>=T_LAND&&!CUT.landed){ CUT.landed=true; S.shake=.28; A.pop(); A.thrust(0); A.roar(0);
    for(let k=0;k<14;k++){ const a=k/14*TAU+Math.random()*.3; at(PAD[0]+Math.cos(a)*1.3,PAD[1]+Math.sin(a)*1.3,V2).multiplyScalar(R+.35);
      tang(up,at(PAD[0]+Math.cos(a)*3,PAD[1]+Math.sin(a)*3),V3).multiplyScalar(2.2+Math.random()*1.2).addScaledVector(up,.2); puff(V2,V3,.24+Math.random()*.14,1.4); } }
  // the hatch drops into a ramp, settling with a small bounce
  const dk=clamp((c-T_DOOR)/.8,0,1); if(dk>0&&!CUT.door){ CUT.door=true; A.click(); }
  RK.door.rotation.x=lerp(DOOR_SHUT,DOOR_OPEN,dk<1?1-Math.pow(1-dk,3)+Math.sin(dk*Math.PI)*.06*dk:1);
  // and out you come through the hatch, down the ramp, turning to look across at Aetos
  if(c>=T_OUT){ me.visible=true; const wk=clamp((c-T_OUT)/(T_WALK-T_OUT),0,1), z=.15+(OUT_Z-.15)*wk*wk*(3-2*wk), wv=6*wk*(1-wk); // starts and stops gently
    const x0=PAD[0]+DOOR[0]*z, z0=PAD[1]+DOOR[1]*z, tk=sstep(.72,1,wk), fx=lerp(DOOR[0],FACE[0],tk), fz=lerp(DOOR[1],FACE[1],tk);
    at(x0,z0,V2); tang(V2,at(x0+fx*.2,z0+fz*.2),cF); standOn(me,V2,cF,.1+rampY(z)); CUT.ph+=dt*7.2*Math.min(1,wv*.8); animate(me,CUT.ph,Math.min(1,wv*.75),0,t,9);
    player.x=x0; player.z=z0; player.u.copy(V2); player.f.copy(cF); }
  // the camera: low by the road, following the rocket down out of the sky, then round behind you
  camAt(CAMC[0],CAMC[1],1.45,cT);
  const lk=sstep(T_LAND-.6,T_LAND+.6,c); cL.copy(fPos).addScaledVector(fAx,1.4); cG.copy(padTop).addScaledVector(up,1.5).addScaledVector(RKN,.7); CUT.look.copy(cL).lerp(cG,lk);
  st.camP.copy(cT); st.camL.copy(CUT.look);
  const bk=E.io(clamp((c-T_CAM)/(T_END-T_CAM),0,1));
  if(bk>0){ at(START[0],START[1],V2); tang(V2,at(START[0]+FACE[0],START[1]+FACE[1]),V3); const hs=standH(START[0],START[1]);
    V4.copy(V2).multiplyScalar(R+hs+C.HEAD); rigPose(V4,V2,V3,C.PITCH,rigLimit(START[0],START[1],V2,V3,C.PITCH,C.D0()),cG,cL);
    const [ex,ez]=loc(camW.copy(cG).normalize()), eh=cG.length()-R-standH(ex,ez), a0=Math.atan2(CAMC[0]-START[0],CAMC[1]-START[1]), r0=Math.hypot(CAMC[0]-START[0],CAMC[1]-START[1]), a1=Math.atan2(ex-START[0],ez-START[1]), r1=Math.hypot(ex-START[0],ez-START[1]);
    let da=a1-a0; da=Math.atan2(Math.sin(da),Math.cos(da)); const a=a0+da*bk, r=lerp(r0,r1,bk);
    camAt(START[0]+Math.sin(a)*r,START[1]+Math.cos(a)*r,lerp(1.45,eh,bk),cT); st.camP.copy(cT); st.camL.copy(CUT.look).lerp(cL,bk); }
  stUp.copy(at(lerp(CAMC[0],START[0],bk),lerp(CAMC[1],START[1],bk))); stCam.up.copy(stUp); UPU.value.copy(stUp); S.stSnap=true; LU.uPly.value.copy(st.camP);
  puffsUpdate(dt);
  if(c>=T_END) endCut(); }

/* ---------- the sky over Earth: the visitor's own time of day, the weather now and then, the season ----------
   The sun stands where it would at this hour and on this day of the year, at our latitude: up early and late in summer,
   low and short in winter. At night the moon gives the light, the street lamps and the windows come on, and the stars are
   out. Now and then it rains (and in December it snows instead), sea fog rolls in with the foghorn, and after the rain
   there is a rainbow. Leaves turn in autumn and blossom in spring; there is snow and fairy lights in December and
   pumpkins on the doorsteps at Halloween. ?time=21:30, ?date=12-24 and ?weather=rain|fog|clear set any of it. */
const SKY={h:15,doy:200,md:'07-15',e:40,night:0,dusk:0,dir:0,t:9,baked:new T.Vector3(),over:0}, WX={kind:'clear',rain:0,fog:0,bow:0,t:0,stop:0,horn:12,bowT:0,snow:false}, SEA={};
const QPS=new URLSearchParams(location.search), SKYSET={time:QPS.get('time'),date:QPS.get('date'),weather:QPS.get('weather')};
const D2R=Math.PI/180, SOUTH=new T.Vector3(.38,0,.46).normalize(), WEST=new T.Vector3(SOUTH.z,0,-SOUTH.x);
/* where the sun is: elevation from the hour angle, the sun's declination for the day and our latitude; the moon opposite */
function sunDir(h,doy,out,moon){ const lat=50*D2R, dec=23.44*D2R*Math.sin(TAU*(doy-81)/365)*(moon?-1:1), H=((moon?h+12:h)-12.5)*15*D2R;
  const se=Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(H), e=Math.asin(clamp(se,-1,1)), ce=Math.max(1e-4,Math.cos(e));
  let ca=clamp((se*Math.sin(lat)-Math.sin(dec))/(ce*Math.cos(lat)),-1,1), az=Math.acos(ca); if(H<0) az=-az;
  return out.copy(SOUTH).multiplyScalar(ce*Math.cos(az)).addScaledVector(WEST,ce*Math.sin(az)).add(V4.set(0,se,0)).normalize(); }
const doyOf=(m,d)=>Math.round([0,31,59,90,120,151,181,212,243,273,304,334][m-1]+d);
const inRange=(md,a,b)=>a<=b?md>=a&&md<=b:md>=a||md<=b;   // month-day strings, wrapping the new year
/* how much of a season there is on a day: ramps in and out over a few days at each end */
function seasonK(doy,a,b,ramp){ const span=(b-a+365)%365, x=(doy-a+365)%365; if(x>span) return 0; return Math.min(1,x/ramp,(span-x)/ramp); }
function skyClock(){ const now=new Date(); let h=now.getHours()+now.getMinutes()/60+now.getSeconds()/3600, m=now.getMonth()+1, d=now.getDate();
  if(window.__TEST&&!SKYSET.time){ h=15; } if(window.__TEST&&!SKYSET.date){ m=7; d=15; }   // the tests see one fixed afternoon unless they ask
  if(SKYSET.time){ const p=SKYSET.time.split(':'); h=clamp((+p[0]||0)+(+p[1]||0)/60,0,23.99); }
  if(SKYSET.date){ const p=SKYSET.date.split('-'); m=clamp(+p[0]||1,1,12); d=clamp(+p[1]||1,1,31); }
  SKY.h=h; SKY.doy=doyOf(m,d); SKY.md=String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
/* the weather for this visit: the same for everyone within the same three hours of the same day */
function skyWeather(){ let k='clear'; const now=new Date(), seed=(now.getFullYear()*400+SKY.doy)*8+Math.floor(SKY.h/3), r=fract(Math.sin(seed*12.9898)*43758.5453);
  if(r<.2) k='rain'; else if(r<.36) k='fog';
  if(window.__TEST&&!SKYSET.weather) k='clear'; if(SKYSET.weather) k=SKYSET.weather;
  WX.kind=k; WX.snow=inRange(SKY.md,'12-01','01-06'); WX.t=0; WX.rain=k==='rain'?1:0; WX.fog=0; WX.bow=0; WX.stop=70+r*400%60; WX.horn=10; WX.bowT=0; SKY.over=k==='rain'?1:0; }
const fract=x=>x-Math.floor(x);
const SUND=new T.Vector3(), MOOND=new T.Vector3(), LT=new T.Vector3(), LT2=new T.Vector3();
const mixV=(o,a,b,k)=>o.set(a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k);
const SKYC={day:{la:[.93,.92,.89],lb:[1.05,1.02,.95],sh:[.6,.66,.83],sky:[.62,.82,.85],fog:[.83,.9,.89]},
  gold:{la:[1.,.85,.7],lb:[1.1,.93,.75],sh:[.52,.53,.72],sky:[.88,.72,.63],fog:[.89,.8,.73]},
  night:{la:[.34,.4,.58],lb:[.4,.47,.66],sh:[.19,.23,.37],sky:[.17,.23,.36],fog:[.105,.145,.21]}};
const cA=new T.Vector3(), cB=new T.Vector3();
function skyApply(){ sunDir(SKY.h,SKY.doy,SUND,false); sunDir(SKY.h,SKY.doy,MOOND,true);
  const ed=Math.asin(clamp(SUND.y,-1,1))/D2R; SKY.e=ed;
  const night=1-sstep(-8,-1,ed), dusk=sstep(-8,0,ed)*(1-sstep(4,16,ed)), sunOn=ed>-2.5;
  SKY.night=night; SKY.dusk=dusk;
  /* the light that casts: the sun, or the moon once the sun is well down; how strong it is fades to nothing at the hand-over */
  SUN.copy(sunOn?SUND:MOOND); let direct=sunOn?sstep(-2,4,ed):1-sstep(-9,-3,ed); direct*=1-.7*SKY.over-.4*WX.fog;
  const K=['la','lb','sh','sky','fog'], out={};
  for(const k of K){ mixV(cA,SKYC.day[k],SKYC.gold[k],dusk); mixV(cB,[cA.x,cA.y,cA.z],SKYC.night[k],night); out[k]=cB.clone(); }
  LU.uShdC.value.copy(out.sh); LU.uLitA.value.copy(out.sh).lerp(out.la,direct); LU.uLitB.value.copy(out.sh).lerp(out.lb,direct);
  /* rain greys the air; sea fog closes in, pale by day and dark blue at night */
  const grey=V4.set(.7,.75,.77).multiplyScalar(1-.85*night);
  out.fog.lerp(grey,.6*SKY.over); out.sky.lerp(grey,.5*SKY.over); out.fog.lerp(V4.set(.8,.85,.87).multiplyScalar(1-.78*night),WX.fog*.9);
  LU.uFog.value.setRGB(out.fog.x,out.fog.y,out.fog.z); LU.uSky.value.setRGB(out.sky.x,out.sky.y,out.sky.z);
  const fg=WX.fog, ov=SKY.over; LU.uFogR.value.set(lerp(lerp(16,11,ov),2.5,fg),lerp(lerp(52,40,ov),16,fg)); LU.uFogA.value=lerp(lerp(.55,.65,ov),.92,fg);
  LU.uNight.value=night; LU.uWet.value=Math.max(WX.rain,LU.uWet.value*.999); LU.uSnow.value=WX.snow?.8:0;
  LU.uSeason.value=seasonK(SKY.doy,doyOf(9,18),doyOf(11,30),12)-seasonK(SKY.doy,doyOf(3,22),doyOf(5,18),10);
  SKYU.uSunD.value.copy(SUND); SKYU.uMoonD.value.copy(MOOND); SKYU.uDusk.value=dusk*(1-night*.5); SKYU.uOver.value=Math.max(ov,fg*.5); SKYU.uBow.value=WX.bow*(ed>2?1:0);
  /* the shadows are drawn again when the light has moved a degree or so */
  if(SKY.baked.dot(SUN)<.9998){ SKY.baked.copy(SUN); baked=false; } }
/* ---------- the things the sky brings: rain and snow, fireflies, fairy lights and pumpkins ---------- */
let FALL=null, FLIES=null, XMAS=null; const PUMPS=[];
function buildSkyFx(){ skyClock(); skyWeather();
  /* rain and snow: a few hundred streaks or flakes in a box that travels with the camera, falling in the vertex shader */
  { const N=LO?260:520, P=[], S=[], Cn=[], I=[]; for(let i=0;i<N;i++){ const s=[Math.random(),Math.random(),Math.random(),Math.random()];
      for(const [cx,cy] of [[-1,0],[1,0],[1,1],[-1,1]]){ P.push(0,0,0); S.push(...s); Cn.push(cx,cy); } const b=i*4; I.push(b,b+1,b+2, b,b+2,b+3); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aS',new T.Float32BufferAttribute(S,4)); g.setAttribute('aC',new T.Float32BufferAttribute(Cn,2)); g.setIndex(I);
    const m=new T.ShaderMaterial({uniforms:{uCam:{value:new T.Vector3()},uUp:UPU,uTime:G.uTime,uK:{value:0},uSnow:{value:0},uNight:LU.uNight},transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:`attribute vec4 aS; attribute vec2 aC; uniform vec3 uCam,uUp; uniform float uTime,uSnow; varying vec2 vC; varying float vA;
        void main(){ vec3 e1=normalize(cross(uUp,abs(uUp.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.))), e2=cross(uUp,e1);
          float sp=mix(9.,.9,uSnow), y=fract(aS.y-uTime*sp/12.)*12.-5.; vec3 p=uCam+e1*(aS.x-.5)*18.+e2*(aS.z-.5)*18.+uUp*y;
          p+=(e1*sin(uTime*1.3+aS.w*20.)+e2*cos(uTime*1.1+aS.w*17.))*.35*uSnow;   // flakes drift
          vec3 vd=normalize(p-cameraPosition), sd=normalize(cross(uUp,vd)); float L=mix(.42,.05,uSnow), W=mix(.022,.05,uSnow);
          p+=sd*aC.x*W+(uSnow>.5?cross(vd,sd)*(aC.y-.5)*2.*W:uUp*aC.y*L); vC=aC; vA=smoothstep(18.,6.,distance(p,cameraPosition))*(.55+.45*aS.w);
          gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader:`uniform float uK,uSnow,uNight; varying vec2 vC; varying float vA; void main(){ float a=uSnow>.5?smoothstep(1.,.5,length(vec2(vC.x,vC.y*2.-1.))):1.-abs(vC.x)*.6;
        gl_FragColor=vec4(mix(vec3(.82,.88,.93),vec3(.97),uSnow)*(1.-.55*uNight),a*vA*uK*mix(.5,.9,uSnow)); }`});
    FALL=new T.Mesh(g,m); FALL.frustumCulled=false; FALL.layers.set(1); FALL.renderOrder=5; FALL.visible=false; sc.add(FALL); }
  /* fireflies by the trees on summer nights */
  if(inRange(SKY.md,'05-15','09-15')){ const n=LO?16:28, m=new T.InstancedMesh(new T.SphereGeometry(.035,6,4),new T.MeshBasicMaterial({color:new T.Color(1,1,.6)}),n);
    m.layers.set(1); m.frustumCulled=false; m.userData.f=Array.from({length:n},(_,i)=>{ const t=TREES[i%Math.max(1,TREES.length)]||[0,0,1]; return {x:t[0]+(Math.random()-.5)*2.4,z:t[1]+(Math.random()-.5)*2.4,ph:Math.random()*TAU,h:.5+Math.random()*1.4}; }); sc.add(m); FLIES=m; }
  /* December: fairy lights along the front of every house */
  if(inRange(SKY.md,'12-01','01-06')){ const pts=[]; for(const H of HOUSES){ const n=Math.max(4,Math.floor(H.w/.3)); for(let i=0;i<=n;i++) pts.push(V.set(-H.w/2+i*H.w/n,H.h-(H.flat?-.08:.16),H.d/2+.1).applyMatrix4(H.M).clone()); }
    const m=new T.InstancedMesh(new T.SphereGeometry(.05,6,4),new T.MeshBasicMaterial(),pts.length), M4=new T.Matrix4(), CL=['#ff5a4a','#ffd05a','#5fd36a','#6fb4ff'].map(c=>new T.Color(c));
    pts.forEach((p,i)=>{ M4.makeTranslation(p.x,p.y,p.z); m.setMatrixAt(i,M4); m.setColorAt(i,CL[i%4]); }); m.layers.set(1); m.frustumCulled=false; sc.add(m); XMAS={m,CL,n:pts.length,t:0}; }
  /* Halloween: a carved pumpkin by every door, lit inside when it gets dark */
  if(inRange(SKY.md,'10-20','11-02')){ for(const H of HOUSES){ const Mp=new T.Matrix4().multiplyMatrices(H.M,new T.Matrix4().makeTranslation(H.dx+.62,0,H.d/2+.42)), g=new T.Group(); g.matrixAutoUpdate=false; g.matrix.copy(Mp); sc.add(g);
      const body=new T.Mesh(new T.SphereGeometry(.2,14,10),toonMat('#e8822e')); body.scale.set(1,.8,1); body.position.y=.17; g.add(body);
      const stem=new T.Mesh(new T.CylinderGeometry(.025,.03,.08,6),toonMat('#5b6b33')); stem.position.y=.35; g.add(stem);
      const face=flatMat('#3a2412'); [[-.07,.21,.12],[.07,.21,.12]].forEach(([x,y,s])=>{ const t=new T.Mesh(new T.CircleGeometry(.045,3),face); t.position.set(x,y,.17); t.rotation.z=Math.PI/2; g.add(t); });
      const mo=new T.Mesh(new T.PlaneGeometry(.18,.045),face); mo.position.set(0,.11,.185); g.add(mo); PUMPS.push(face); } } }
/* ---------- each frame ---------- */
function skyUpdate(dt,t){ SKY.t+=dt; if(SKY.t>1){ SKY.t=0; skyClock(); }
  /* the weather moves on: the rain stops after a while and the cloud clears, and with the sun out behind you a rainbow; fog rolls in */
  WX.t+=dt;
  if(WX.kind==='rain'){ if(WX.t>WX.stop){ WX.rain=Math.max(0,WX.rain-dt/8); SKY.over=Math.max(0,SKY.over-dt/22); if(!WX.bowT&&SKY.over<.5&&SKY.e>2&&!WX.snow){ WX.bowT=1; A.chime(4,0,.025); } } }
  if(WX.bowT){ WX.bowT+=dt; WX.bow=sstep(1,9,WX.bowT)*(1-sstep(55,70,WX.bowT)); }
  if(WX.kind==='fog') WX.fog=sstep(10,40,WX.t);
  skyApply();
  /* rain or snow round the camera */
  const fall=WX.rain*(1-sstep(0,1,SPACEU.value)); FALL.visible=fall>.01; if(FALL.visible){ const u=FALL.material.uniforms; u.uCam.value.copy(stCam.position); u.uK.value=fall; u.uSnow.value=WX.snow?1:0; }
  A.rain(WX.snow?0:fall*(FIN.on?.3:1));
  /* the street lamps: dim at night, full as you come by, then easing back; a click as each one comes up */
  const P=player, nt=SKY.night;
  LAMPS.forEach((l,i)=>{ const near=Math.hypot(P.x-l.x,P.z-l.z)<6, want=nt>.15?(near?1:.4):0;
    if(want>l.k){ l.k=Math.min(want,l.k+dt*(near?3.2:1)); } else l.k=Math.max(want,l.k-dt/5);
    if(near&&nt>.15&&!l.hot&&l.k>.8){ l.hot=1; if(!TALK.p&&!CUT.on) A.tick(); } if(!near) l.hot=0;
    const f=l.k*(near&&l.k<1?.85+.15*Math.sin(t*60+i):1); LU.uLmp.value[i].set(l.p.x,l.p.y,l.p.z,f); });
  /* fireflies wander round the trees on a summer night */
  document.documentElement.classList.toggle('crnight',nt>.5);
  if(FLIES){ FLIES.visible=nt>.3&&inRange(SKY.md,'05-15','09-15'); if(FLIES.visible){ const M4=Mf; FLIES.userData.f.forEach((q,i)=>{ const a=t*.4+q.ph, x=q.x+Math.sin(a*1.3)*.6, z=q.z+Math.cos(a*.9)*.6, h=q.h+Math.sin(a*2.1)*.25, on=.5+.5*Math.sin(t*3+q.ph*5)>.35?1:.001;
      at(x,z,V).multiplyScalar(R+standH(x,z)+h); M4.makeScale(on,on,on).setPosition(V); FLIES.setMatrixAt(i,M4); }); FLIES.instanceMatrix.needsUpdate=true; } }
  /* the fairy lights twinkle; the pumpkins glow once it is dark */
  if(XMAS){ XMAS.t+=dt; if(XMAS.t>.5){ XMAS.t=0; const k=.55+.45*nt; for(let i=0;i<XMAS.n;i++){ const c=XMAS.CL[(i+Math.floor(t*2))%4]; XMAS.m.setColorAt(i,V.set(c.r*k,c.g*k,c.b*k)); } XMAS.m.instanceColor.needsUpdate=true; } }
  PUMPS.forEach(m=>m.uniforms.uC.value.setRGB(lerp(.23,1,nt),lerp(.14,.72,nt),lerp(.07,.25,nt)));
  /* the foghorn, from the lighthouse when there is one, out at sea when not */
  if(WX.fog>.6&&!FIN.on&&!CUT.on){ WX.horn-=dt; if(WX.horn<=0){ WX.horn=26+Math.random()*8; const d0=PH?Math.hypot(P.x-PH.x,P.z-PH.z):14; A.foghorn(.1*clamp(1.3-d0/30,.55,1)); } } }
/* ---------- the lighthouse: take the light and steer it ----------
   By the lighthouse you can take the light: drag (or the arrow keys) turns the beam out over the water, the camera up on
   the gallery behind it. The beam lights whatever it falls on and thins the fog along it, so at night and in fog it is
   what you see by. Out there are a fishing boat, a bell buoy, and a drone that has lost its way: hold the light on it and
   it locks on and follows the beam home, which is Pharos in small. Let go and the light turns on by itself again. */
const PHS={on:false,yaw:0,v:0,k:0,cp:new T.Vector3(),cl:new T.Vector3(),drag:null,turned:0,T:[],lost:null,lockT:0,state:'lost',st:0,home:new T.Vector3(),bgW:new T.Matrix4()};
const steerBtn=$('#crSteer',el), steerUI=$('#crSteerUI',el);
const phLocal=(a,r,y,o)=>o.set(Math.cos(a)*r,y,-Math.sin(a)*r).applyMatrix4(PHS.bgW);   // a point at an angle round the lighthouse, out from the lamp
const angWrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function seaAngles(){ const out=[]; for(let i=0;i<72;i++){ const a=i/72*TAU; let sea=true; for(const r of [6,8.5,11]){ if(isle(phLocal(a,r,0,V).normalize())>-.06){ sea=false; break; } } if(sea) out.push(a); } return out; }
function seaThing(kind){ const g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g);
  if(kind==='boat'){ const hull=new T.Mesh(new T.BoxGeometry(1.05,.24,.42),toonMat('#8e3b2f')); hull.position.y=.12; g.add(hull);
    const deck=new T.Mesh(new T.BoxGeometry(1.08,.05,.44),toonMat('#e9e2d4')); deck.position.y=.26; g.add(deck);
    const cab=new T.Mesh(new T.BoxGeometry(.34,.28,.3),toonMat('#f2ede3')); cab.position.set(-.22,.42,0); g.add(cab);
    const mast=new T.Mesh(new T.CylinderGeometry(.018,.018,.8,6),toonMat('#5a4636')); mast.position.set(.18,.66,0); g.add(mast);
    const lan=new T.Mesh(new T.SphereGeometry(.05,8,6),flatMat('#ffd27a')); lan.position.set(.18,1.07,0); g.add(lan); g.userData.lan=lan; }
  else { const b=new T.Mesh(new T.CylinderGeometry(.14,.18,.42,12),toonMat('#cf4a36')); b.position.y=.21; g.add(b);
    const w=new T.Mesh(new T.CylinderGeometry(.145,.15,.09,12),toonMat('#f4efe6')); w.position.y=.3; g.add(w);
    const c=new T.Mesh(new T.ConeGeometry(.12,.26,10),toonMat('#cf4a36')); c.position.y=.55; g.add(c);
    const bell=new T.Mesh(new T.SphereGeometry(.055,8,6),toonMat('#d9b45a')); bell.position.y=.72; g.add(bell); }
  return g; }
function buildSteer(){ if(!PH) return; PH.beam.parent.updateWorldMatrix(true,false); PHS.bgW.copy(PH.beam.parent.matrixWorld);
  const sa=seaAngles(); if(!sa.length) return; const pick=k=>sa[Math.floor(k*(sa.length-1))];
  PHS.T=[{kind:'boat',a:pick(.3),r:9.5,g:seaThing('boat'),lit:false,ph:1.3},{kind:'buoy',a:pick(.75),r:6.6,g:seaThing('buoy'),lit:false,ph:.4}];
  const d=drone('#ff5a4a'); d.scale.setScalar(1.7); sc.add(d); const ring=new T.Mesh(new T.TorusGeometry(.42,.025,6,32).rotateX(Math.PI/2),flatMat('#ffd27a')); ring.visible=false; sc.add(ring);
  PHS.lost={g:d,ring,a:pick(.55),r:8.6,pos:new T.Vector3(),from:new T.Vector3(),sa}; phLocal(0,.95,-.15,PHS.home); }
/* a thing at sea: on the water at its angle and distance from the lamp, bobbing */
function seaPose(q,t){ phLocal(q.a,q.r,0,V); const up=V2.copy(V).normalize(); V.copy(up).multiplyScalar(R+WATER+.02+Math.sin(t*1.4+q.ph)*.03);
  const M=frameAt(...loc(up),q.a+Math.sin(t*.9+q.ph)*.08); M.setPosition(V); M.multiply(Mr.makeRotationZ(Math.sin(t*1.7+q.ph)*.07)); q.g.matrix.copy(M); q.g.matrixWorldNeedsUpdate=true; }
function seaMid(){ const sa=PHS.lost?PHS.lost.sa:[]; if(!sa.length) return null; let x=0, y=0; for(const a of sa){ x+=Math.cos(a); y+=Math.sin(a); } return Math.atan2(y,x); }
function steerSet(on){ if(on===PHS.on) return; PHS.on=on; steerUI.hidden=!on; if(on){ closeTalk(); steerBtn.hidden=true; player.tgt=null; player.speed=0; A.click(); PHS.aim=seaMid(); } else { PHS.drag=null; PHS.aim=null; A.click(); } }
steerBtn.addEventListener('click',e=>{ e.stopPropagation(); steerSet(true); });
$('#crSteerDone',el).addEventListener('click',e=>{ e.stopPropagation(); steerSet(false); });
steerUI.addEventListener('pointerdown',e=>e.stopPropagation());
function steerUpdate(dt,t){ const nt=SKY.night;
  /* the beam: your hand on it, or turning by itself; longer and brighter at night and in fog */
  if(PHS.on){ const kd=(keys.has('ArrowLeft')||keys.has('KeyA')?1:0)-(keys.has('ArrowRight')||keys.has('KeyD')?1:0); if(kd) PHS.v=kd*1.4;
    else if(!PHS.drag) PHS.v*=Math.exp(-3*dt); } else PHS.v=damp(PHS.v,.9,1.5,dt);
  if(PHS.on&&PHS.aim!=null){ if(PHS.drag) PHS.aim=null; else { const d=angWrap(PHS.aim-PHS.yaw); PHS.v=clamp(d*3,-2.2,2.2); if(Math.abs(d)<.03) PHS.aim=null; } }   // out to sea first
  const dy=PHS.v*dt; PHS.yaw+=dy; if(PHS.on){ PHS.turned+=Math.abs(dy); if(PHS.turned>.21){ PHS.turned=0; A.tick(); } }   // the gear clicks as it turns
  PH.beam.rotation.set(0,PHS.yaw,-.1); PH.beam.scale.set(lerp(1.5,2.2,Math.max(nt,WX.fog)),1,1); PH.beam.material.uniforms.uOp.value=lerp(.14,.34,nt)+.12*WX.fog;
  /* what the beam falls on: its origin and which way it points, for the light it gives everything */
  V.set(0,0,0).applyMatrix4(PHS.bgW); V2.set(Math.cos(PHS.yaw),0,-Math.sin(PHS.yaw)).transformDirection(PHS.bgW);
  LU.uBmO.value.set(V.x,V.y,V.z,PH?(.35+.65*Math.max(nt,WX.fog)):0); LU.uBmD.value.set(V2.x,V2.y,V2.z,.985);
  /* the boat and the buoy ride the swell; each answers the light the first time it crosses them */
  for(const q of PHS.T){ seaPose(q,t); const lit=Math.abs(angWrap(q.a-PHS.yaw))<.16; if(lit&&!q.lit&&PHS.on){ if(q.kind==='boat') A.ping(392,.03); else A.chime(5,0,.035); } q.lit=lit;
    if(q.g.userData.lan) q.g.userData.lan.material.uniforms.uC.value.setRGB(1,lerp(.62,.86,lit?1:0),lerp(.3,.55,lit?1:0)); }
  /* the lost drone: blinking out over the water; held in the light it locks on, then follows the beam home */
  const L=PHS.lost; if(L){ PHS.st+=dt;
    if(PHS.state==='lost'){ phLocal(L.a,L.r,1.7+Math.sin(t*1.1)*.12,L.pos); const on=PHS.on&&Math.abs(angWrap(L.a-PHS.yaw))<.14;
      PHS.lockT=on?PHS.lockT+dt:Math.max(0,PHS.lockT-dt*2); if(PHS.lockT>.9){ PHS.state='lock'; PHS.st=0; A.lock(0,.05); } L.g.visible=true; }
    else if(PHS.state==='lock'){ phLocal(L.a,L.r,1.7,L.pos); if(PHS.st>.6){ PHS.state='home'; PHS.st=0; L.from.copy(L.pos); } }
    else if(PHS.state==='home'){ const u=sstep(0,1,PHS.st/3.4); L.pos.copy(L.from).lerp(PHS.home,u).addScaledVector(V.copy(PHS.home).normalize(),Math.sin(u*Math.PI)*1.2);
      if(PHS.st>3.4){ PHS.state='gone'; PHS.st=0; L.g.visible=false; A.chord(); } }
    else if(PHS.st>7){ PHS.state='lost'; PHS.st=0; PHS.lockT=0; let a=L.a; for(let i=0;i<20;i++){ a=L.sa[Math.floor(Math.random()*L.sa.length)]; if(Math.abs(angWrap(a-PHS.yaw))>.8) break; } L.a=a; L.r=7.5+Math.random()*3; }
    const up=V.copy(L.pos).normalize(); const M=frameAt(...loc(up),t*.6); M.setPosition(L.pos); M.multiply(Mf.makeScale(1.7,1.7,1.7)); L.g.matrix.copy(M); L.g.matrixWorldNeedsUpdate=true;
    L.g.userData.light.material.uniforms.uC.value.setStyle(PHS.state==='lost'?((t*2)%1<.5?'#ff5a4a':'#5a1a16'):'#7dff9a',T.LinearSRGBColorSpace);
    L.ring.visible=PHS.state==='lock'; if(L.ring.visible){ const s=1+.25*Math.sin(PHS.st*20); L.ring.matrix.copy(M).multiply(Mf.makeScale(s/1.7,s/1.7,s/1.7)); L.ring.matrixAutoUpdate=false; L.ring.matrixWorldNeedsUpdate=true; } }
  steerBtn.hidden=!(PJ.id==='ph'&&!PHS.on&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0); }
/* the camera up behind the lamp, looking out along the beam; handing back to the walking camera smoothly */
function steerCam(dt){ PHS.k=damp(PHS.k,PHS.on?1:0,PHS.on?3:4,dt); if(PHS.k<.002) return;
  const Lp=V.set(0,0,0).applyMatrix4(PHS.bgW), U=V3.copy(Lp).normalize(), Dh=V2.set(Math.cos(PHS.yaw),0,-Math.sin(PHS.yaw)).transformDirection(PHS.bgW);
  const pk=innerHeight>innerWidth?1.35:1;   // a phone held upright stands further back
  V4.copy(Lp).addScaledVector(Dh,-2.4*pk).addScaledVector(U,3.6*pk); PHS.cp.lerp(V4,PHS.k>.98?1-Math.exp(-6*dt):1); V4.copy(Lp).addScaledVector(Dh,11).addScaledVector(U,-5.5); PHS.cl.lerp(V4,PHS.k>.98?1-Math.exp(-6*dt):1);   // up over the gallery, looking out and down along the beam
  st.camP.lerp(PHS.cp,PHS.k); st.camL.lerp(PHS.cl,PHS.k); stUp.lerp(U,PHS.k).normalize(); stCam.up.copy(stUp); UPU.value.copy(stUp); if(PHS.k>.5) LU.uPly.value.copy(st.camP); S.stSnap=true; }
/* ---------- birds circling over town ---------- */
const BIRDS=[], BU=new T.Vector3();
function buildBirds(){ for(let i=0;i<6;i++){ const g=new T.Group(), wl=mesh(BOXG,'#3b3a3c',-.17,0,0,.34,.02,.09), wr=mesh(BOXG,'#3b3a3c',.17,0,0,.34,.02,.09); g.add(wl,wr,mesh(BOXG,'#3b3a3c',0,0,0,.07,.05,.16)); sc.add(g);
  BIRDS.push({g,wl,wr,c:[(rnd()-.5)*16,(rnd()-.5)*16],r:3+rnd()*5,h:6+rnd()*4,sp:(.25+rnd()*.25)*(rnd()<.5?-1:1),ph:rnd()*TAU}); } }

/* ---------- drawing: the sun's shadow map once, then every frame the ink buffer, the colour, and the two together ---------- */
const INK=[], inkC=new Map(), shdC=new Map();
const variant=(cache,m,frag,side)=>{ let k=cache.get(m); if(!k){ k=new T.ShaderMaterial({uniforms:m.uniforms,vertexShader:m.vertexShader,fragmentShader:frag,side:side??m.side,vertexColors:m.vertexColors}); cache.set(m,k); } return k; };
function registerInk(){ sc.traverse(o=>{ if(!o.isMesh||!o.layers.isEnabled(0)||!o.material.isShaderMaterial||o.userData.noInk===true) return;
  o.userData.col=o.material; o.userData.inkM=variant(inkC,o.material,INK_F); o.userData.shdM=variant(shdC,o.material,SHD_F,T.DoubleSide);
  if(o.userData.cast&&!o.userData.dyn) o.layers.enable(2); INK.push(o); }); }
const shRT=new T.WebGLRenderTarget(SHN,SHN,{depthBuffer:true}); shRT.depthTexture=new T.DepthTexture(SHN,SHN); LU.uShM.value=shRT.depthTexture;
const shCam=new T.OrthographicCamera(-30,30,30,-30,1,160);
let baked=false;
function bakeShadow(){ shCam.position.set(0,R,0).addScaledVector(SUN,80); shCam.lookAt(0,R,0); shCam.updateMatrixWorld(); shCam.updateProjectionMatrix(); shCam.layers.set(2);
  LU.uShP.value.multiplyMatrices(shCam.projectionMatrix,shCam.matrixWorldInverse); LU.uShOn.value=0;
  for(const m of INK) m.material=m.userData.shdM; renderer.setRenderTarget(shRT); renderer.setClearColor(0xffffff,1); renderer.clear(); renderer.render(sc,shCam); for(const m of INK) m.material=m.userData.col;
  renderer.setClearColor(0,1); LU.uShOn.value=1; baked=true; }
const inkRT=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true});
const colRT=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,depthBuffer:true,samples:LO?0:4});
const compM=new T.ShaderMaterial({uniforms:{tC:{value:colRT.texture},tN:{value:inkRT.texture},uRes:{value:new T.Vector2(1,1)},uPx:{value:1}},depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`uniform sampler2D tC,tN; uniform vec2 uRes; uniform float uPx; varying vec2 vUv; ${N2}
    float zOf(float a){ return a>0.?1./a-1.:1e4; }
    void main(){ vec4 c0=texture2D(tN,vUv); float z0=zOf(c0.a); vec3 n0=c0.rgb*2.-1.; vec2 asp=vec2(uRes.x/uRes.y,1.);
      vec2 wob=(vec2(vn2(vUv*asp*60.),vn2(vUv*asp*60.+5.2))-.5)*1.6*uPx/uRes;   // the pen wanders a little
      float w=uPx*mix(1.55,.8,smoothstep(3.,34.,min(z0,60.))), e=0.;
      for(int k=0;k<8;k++){ float a=float(k)*.785398; vec2 o=vec2(cos(a),sin(a))*w/uRes+wob; vec4 s=texture2D(tN,vUv+o); float z=zOf(s.a);
        float de=smoothstep(.045,.1,abs(z-z0)/max(min(z,z0),.1));
        float ne=(s.a>0.&&c0.a>0.)?smoothstep(.24,.46,1.-dot(s.rgb*2.-1.,n0)):0.; e=max(e,max(de,ne)); }
      vec3 col=texture2D(tC,vUv).rgb; col=mix(col,mix(vec3(.15,.14,.16),col*.3,.3),e*.9);
      col*=.972+.04*(vn2(vUv*uRes/2.4)*.6+vn2(vUv*uRes/9.)*.4);   // paper
      gl_FragColor=vec4(col,1.); }`});
const compS=new T.Scene(), compCam=new T.OrthographicCamera(-1,1,1,-1,0,1); { const q=new T.Mesh(new T.PlaneGeometry(2,2),compM); q.frustumCulled=false; compS.add(q); }
st.render=function(rt){ if(!st.built){ renderer.setRenderTarget(rt); renderer.clear(); return; }
  const w=rt.width, h=rt.height; if(inkRT.width!==w||inkRT.height!==h){ inkRT.setSize(w,h); colRT.setSize(w,h); }
  compM.uniforms.uRes.value.set(w,h); compM.uniforms.uPx.value=Math.max(1,h/820);
  if(!baked) bakeShadow();
  for(const m of INK) m.material=m.userData.inkM; stCam.layers.set(0);
  renderer.setRenderTarget(inkRT); renderer.setClearColor(0,0); renderer.clear(); renderer.render(sc,stCam);
  for(const m of INK) m.material=m.userData.col; stCam.layers.enable(1); renderer.setClearColor(0,1);
  renderer.setRenderTarget(colRT); renderer.clear(); renderer.render(sc,stCam); stCam.layers.set(0);
  renderer.setRenderTarget(rt); renderer.render(compS,compCam); };

/* ---------- roads: a ribbon with kerbs and pavements, lines painted on ---------- */
function ribbon(pts,closed,hw=RW,sw=SW){ const n=pts.length, side=[];
  for(let i=0;i<n;i++){ const a=closed?pts[(i-1+n)%n]:pts[Math.max(0,i-1)], b=closed?pts[(i+1)%n]:pts[Math.min(n-1,i+1)], tx=b[0]-a[0], tz=b[1]-a[1], L=Math.hypot(tx,tz)||1; side.push([-tz/L,tx/L]); }
  const P=(i,lat,h)=>at(pts[i][0]+side[i][0]*lat,pts[i][1]+side[i][1]*lat,new T.Vector3()).multiplyScalar(R+h);
  const strips=[[-hw-sw,0,-hw-sw,CURB,'#d9d2c4',-1],[-hw-sw,CURB,-hw,CURB,'#d3ccbe',0],[-hw,CURB,-hw,ROADH,'#e6e0d4',1],[-hw,ROADH,hw,ROADH,'#7f878b',0],[hw,ROADH,hw,CURB,'#e6e0d4',-1],[hw,CURB,hw+sw,CURB,'#d3ccbe',0],[hw+sw,CURB,hw+sw,0,'#d9d2c4',1]];
  const segs=closed?n:n-1, nrm=new T.Vector3(); let along=0;
  for(let i=0;i<segs;i++){ const j=(i+1)%n, sl=Math.hypot(pts[j][0]-pts[i][0],pts[j][1]-pts[i][1]);
    for(const [l0,h0,l1,h1,c,sd] of strips){ const a=P(i,l0,h0), b=P(j,l0,h0), cc=P(j,l1,h1), d=P(i,l1,h1);
      if(sd===0) nrm.copy(a).normalize(); else nrm.copy(P(i,l0+.05,h0)).sub(P(i,l0,h0)).normalize().multiplyScalar(sd);
      kquad(a,b,cc,d,nrm,c); }
    nrm.copy(P(i,0,0)).normalize();
    if(hw>1&&(along%2.1)<1) kquad(P(i,-.06,ROADH+.006),P(j,-.06,ROADH+.006),P(j,.06,ROADH+.006),P(i,.06,ROADH+.006),nrm,'#f1ecdf');
    for(const s of [-1,1]) kquad(P(i,s*(hw-.26),ROADH+.006),P(j,s*(hw-.26),ROADH+.006),P(j,s*(hw-.18),ROADH+.006),P(i,s*(hw-.18),ROADH+.006),nrm,'#e9e4d8');
    along+=sl; } }
function zebra(lp){ let bi=0,bd=1e9; lp.forEach((p,i)=>{ const d=Math.hypot(p[0]-SPUR[0][0],p[1]-(SPUR[0][1]+2)); if(d<bd){ bd=d; bi=i; } });
  const a=lp[(bi-2+lp.length)%lp.length], b=lp[(bi+2)%lp.length], c=lp[bi], tx=b[0]-a[0], tz=b[1]-a[1], L=Math.hypot(tx,tz), ux=tx/L, uz=tz/L, up=at(c[0],c[1]);
  for(let k=-2;k<=2;k++){ const lat=k*.42, x0=c[0]-uz*lat, z0=c[1]+ux*lat; const Pq=(al,dl)=>at(x0+ux*al-uz*dl,z0+uz*al+ux*dl,new T.Vector3()).multiplyScalar(R+ROADH+.008);
    kquad(Pq(-.9,-.12),Pq(.9,-.12),Pq(.9,.12),Pq(-.9,.12),up,'#f1ecdf'); } }

/* ---------- build, in steps so the loader keeps breathing ---------- */
st.build=async function(){
  buildGround(); await nextFrame();
  const loop=new T.CatmullRomCurve3(LOOP.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal'), lp=loop.getSpacedPoints(Math.round(loop.getLength()/.35)).slice(0,-1).map(p=>[p.x,p.z]);
  ROADS.push(lp.concat([lp[0]]),[SPUR[0],SPUR[1]]); ribbon(lp,true); ribbon([SPUR[0],[SPUR[0][0],(SPUR[0][1]+SPUR[1][1])/2],SPUR[1]],false,.95,.75); zebra(lp);
  SEGS.push([0,-6.4,0,-1.5,.6],[0,1.5,0,8.3,.6],[-7.7,0,-1.5,0,.6],[1.5,0,8,0,.6]);
  buildTown(); await nextFrame(); buildNature(); buildPeople(); buildBirds(); buildRocket(); buildLaunchFlame(); buildNav(); buildSkyFx(); buildSteer();
  SEGS.slice(0,12).forEach((s,i)=>{ SEGU.value[i].set(s[0],s[1],s[2],s[3]); SEGW.value[i]=s[4]; });
  const kitM=toonMat('#ffffff',{vc:true,side:T.DoubleSide,fresh:true}); kitM.uniforms.uKit={value:1};   // the seasons, snow, rain and lit windows are the kit's
  for(const id in KITS){ const k=KITS[id]; if(!k.P.length) continue; const kg=new T.BufferGeometry(); kg.setAttribute('position',new T.Float32BufferAttribute(k.P,3)); kg.setAttribute('normal',new T.Float32BufferAttribute(k.N,3)); kg.setAttribute('color',new T.Float32BufferAttribute(k.C,3));
    const kit=new T.Mesh(kg,kitM); kit.frustumCulled=false; kit.userData.cast=true; (MK[id]?MK[id].g:sc).add(kit); k.P.length=k.N.length=k.C.length=0; }
  kitTo();
  registerInk(); st.built=true; };

/* ---------- walking on a sphere ---------- */
const player={u:at(START[0],START[1]),f:new T.Vector3(0,0,1),tgt:null,speed:0,ph:0,step:0,h:0,x:START[0],z:START[1]};
/* ---------- the camera: an orbit rig round a point at your head. Everything about it is smoothed in its own terms (which way
   it looks, how far down, how far back, what it centres on), so it never cuts a corner, bobs on a kerb or swings about.
   It follows lazily when you walk forward and holds still when you step sideways or back; it never fights a drag; it only
   comes in for houses and big landmarks, and trees or poles between it and you fade out instead. ---------- */
const C={f:new T.Vector3(0,0,1),pitch:.34,pEff:.34,dist:4.6,zoom:1,dragT:9,tgt:new T.Vector3(),mid:new T.Vector3(),camH:0,tk:0,tf:new T.Vector3(),PITCH:.34,HEAD:1.15,
  D0:()=>(innerHeight>innerWidth?5.6:4.6)*C.zoom};
function rigPose(target,u,f,pitch,dist,oP,oL){ oP.copy(target).addScaledVector(f,-Math.cos(pitch)*dist).addScaledVector(u,Math.sin(pitch)*dist); return oL&&oL.copy(target).addScaledVector(f,1.6).addScaledVector(u,-.25); }
/* how far back the rig can sit before a house or a big landmark is in the way of the line to your head */
function rigLimit(px,pz,u,f,pitch,D){ const cp=Math.cos(pitch), tp=Math.tan(pitch); let lim=D*cp;
  const [cx,cz]=loc(V.copy(u).multiplyScalar(R).addScaledVector(f,-1).normalize()), bx=cx-px, bz=cz-pz, bl=Math.hypot(bx,bz)||1, ux=bx/bl, uz=bz/bl;
  for(const o of OBS){ if(o.r<.6||o.h<1.8) continue; const ox=o.x-px, oz=o.z-pz, tt=ox*ux+oz*uz; if(tt<.2||tt>lim+o.r) continue; if(C.HEAD+tt*tp>o.h+.15) continue;
    const dd=Math.abs(ox*uz-oz*ux); if(dd<o.r+.35) lim=Math.min(lim,Math.max(1.5,tt-Math.sqrt(Math.max(0,(o.r+.35)**2-dd*dd))-.3)); }
  return lim/cp; }
function rot(f,u,a){ V.crossVectors(u,f); return f.multiplyScalar(Math.cos(a)).addScaledVector(V,Math.sin(a)).normalize(); }
function walk(P,dist){ const th=dist/R, c=Math.cos(th), s=Math.sin(th); V.copy(P.u); P.u.multiplyScalar(c).addScaledVector(P.f,s).normalize(); P.f.multiplyScalar(c).addScaledVector(V,-s); P.f.addScaledVector(P.u,-P.u.dot(P.f)).normalize(); }
const tang=(u,to,o)=>o.copy(to).addScaledVector(u,-u.dot(to)).normalize();
function walkable(x,z){ if(onJetty(x,z)) return true; const h=grid(GH,x,z); if(h>-.04) return true; return grid(GB,x,z)>.45&&h>-.72; }
/* ---------- finding the way: a grid over the town, so walking over to someone goes round houses, fences and the water ---------- */
const NAV={S:.4,O:-23,N:0,free:null};
function buildNav(){ const S=NAV.S, N=NAV.N=Math.ceil(-2*NAV.O/S)+1, f=NAV.free=new Uint8Array(N*N), fixed=OBS.filter(o=>!people.some(p=>p.ob===o));
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const x=NAV.O+i*S, z=NAV.O+j*S; let ok=walkable(x,z);
    if(ok) for(const o of fixed){ const dx=x-o.x, dz=z-o.z, m=o.r+.3; if(dx*dx+dz*dz<m*m){ ok=false; break; } }
    f[j*N+i]=ok?1:0; } }
const navIJ=(x,z)=>[clamp(Math.round((x-NAV.O)/NAV.S),0,NAV.N-1),clamp(Math.round((z-NAV.O)/NAV.S),0,NAV.N-1)];
const navOK=(i,j)=>i>=0&&j>=0&&i<NAV.N&&j<NAV.N&&NAV.free[j*NAV.N+i]===1;
function navNear(i,j){ if(navOK(i,j)) return [i,j]; for(let r=1;r<10;r++) for(let dj=-r;dj<=r;dj++) for(let di=-r;di<=r;di++) if(Math.max(Math.abs(di),Math.abs(dj))===r&&navOK(i+di,j+dj)) return [i+di,j+dj]; return null; }
function navClear(x0,z0,x1,z1){ const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/(NAV.S*.45)); for(let k=1;k<n;k++){ const t=k/n, [i,j]=navIJ(x0+(x1-x0)*t,z0+(z1-z0)*t); if(!navOK(i,j)) return false; } return true; }
/* from (x0,z0) to a spot between 1 m and reach of (gx,gz): A* over the grid, then pulled tight so it walks straight wherever it can */
function navPath(x0,z0,gx,gz,reach){ if(!NAV.free) return null; const N=NAV.N, S=NAV.S, s=navNear(...navIJ(x0,z0)); if(!s) return null;
  const xy=k=>[NAV.O+(k%N)*S,NAV.O+Math.floor(k/N)*S], dG=(i,j)=>Math.hypot(NAV.O+i*S-gx,NAV.O+j*S-gz), H=(i,j)=>Math.max(0,dG(i,j)-reach);
  const g=new Float32Array(N*N).fill(1e9), from=new Int32Array(N*N).fill(-1), shut=new Uint8Array(N*N), heap=[];
  const push=(f,k)=>{ heap.push([f,k]); let c=heap.length-1; while(c>0){ const q=(c-1)>>1; if(heap[q][0]<=heap[c][0]) break; [heap[q],heap[c]]=[heap[c],heap[q]]; c=q; } };
  const pop=()=>{ const top=heap[0], l=heap.pop(); if(heap.length){ heap[0]=l; let c=0; for(;;){ const a=2*c+1, b=a+1; let m=c; if(a<heap.length&&heap[a][0]<heap[m][0]) m=a; if(b<heap.length&&heap[b][0]<heap[m][0]) m=b; if(m===c) break; [heap[m],heap[c]]=[heap[c],heap[m]]; c=m; } } return top; };
  const k0=s[1]*N+s[0]; g[k0]=0; push(H(s[0],s[1]),k0); let end=-1, it=0;
  while(heap.length&&it++<25000){ const k=pop()[1]; if(shut[k]) continue; shut[k]=1; const i=k%N, j=(k-i)/N, dg=dG(i,j);
    if(dg<=reach&&dg>=1){ end=k; break; }
    for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ if(!di&&!dj) continue; const ni=i+di, nj=j+dj; if(!navOK(ni,nj)) continue;
      if(di&&dj&&(!navOK(i+di,j)||!navOK(i,j+dj))) continue;   // never across a corner
      const nk=nj*N+ni, ng=g[k]+(di&&dj?1.4142:1)*S; if(ng<g[nk]){ g[nk]=ng; from[nk]=k; push(ng+H(ni,nj),nk); } } }
  if(end<0) return null;
  const cells=[]; for(let k=end;k>=0;k=from[k]) cells.push(xy(k)); cells.reverse();
  const out=[]; let a=[x0,z0];   // pulled tight: from each corner, the farthest point along the way that it can see
  for(let k=1;k<cells.length;){ let far=k; for(let m=cells.length-1;m>k;m--) if(navClear(a[0],a[1],cells[m][0],cells[m][1])){ far=m; break; } a=cells[far]; out.push(a); k=far+1; }
  return out.length?out:[cells[cells.length-1]]; }
const ray=new T.Raycaster(), ndc=new T.Vector2(), ball=new T.Sphere(new T.Vector3(),R), hits=[];
function pickPerson(e){ ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); hits.length=0; ray.layers.set(0);
  let hit=null; ray.intersectObjects(people.map(p=>p.g),true,hits); for(const h of hits){ let o=h.object; while(o&&!people.some(p=>p.g===o)) o=o.parent; if(o){ hit=people.find(p=>p.g===o); break; } }
  /* or near enough: within a body's width of the line from their feet to their head, as the screen sees it; when two are
     in the same place on the screen, the nearer one is the one you mean */
  let best=null, bd=1; for(const p of people){ const h0=R+standH(p.x,p.z), f=V.copy(p.dir).multiplyScalar(h0).project(stCam); if(f.z>1) continue;
    const fx=(f.x*.5+.5)*innerWidth, fy=(-f.y*.5+.5)*innerHeight, hd=V.copy(p.dir).multiplyScalar(h0+1.6).project(stCam), hx=(hd.x*.5+.5)*innerWidth, hy=(-hd.y*.5+.5)*innerHeight;
    const ex=hx-fx, ey=hy-fy, L2=ex*ex+ey*ey||1, t=clamp(((e.clientX-fx)*ex+(e.clientY-fy)*ey)/L2,0,1), dd=Math.hypot(e.clientX-fx-ex*t,e.clientY-fy-ey*t), r=Math.max(26,Math.sqrt(L2)*.34);
    if(dd/r<bd){ bd=dd/r; best=p; } }
  if(hit&&best&&best!==hit&&bd<.6){ const cp=stCam.position; if(V.copy(best.dir).multiplyScalar(R).distanceTo(cp)<V2.copy(hit.dir).multiplyScalar(R).distanceTo(cp)) return best; }
  return hit||best; }
let down=null, look=null, hov=null, started=false, cardT=0;
const stick=$('#crStick',el), stickI=$('#crStick i',el);
function stickOff(){ stick.hidden=true; stickI.style.transform=''; }
st.onPointer=function(e){ if(FIN.on) return; if(CUT.on){ skipCut(); return; } if(PHS.on){ PHS.drag={x:e.clientX,id:e.pointerId,t:performance.now()}; return; } if(down&&down.touch&&e.pointerType!=='mouse'){ look={id:e.pointerId,lx:e.clientX,ly:e.clientY}; return; } down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,id:e.pointerId,moved:false,touch:e.pointerType!=='mouse',ix:0,iz:0};
  if(down.touch){ stick.hidden=false; stick.style.left=e.clientX+'px'; stick.style.top=e.clientY+'px'; stickI.style.transform=''; } };
const turnBy=(dx,dy)=>{ rot(C.f,player.u,-dx*.0052); C.pitch=clamp(C.pitch-dy*.0038,.08,1); C.dragT=0; };
addEventListener('pointermove',e=>{ if(S.st!==st||S.mode!=='station') return;
  if(PHS.drag&&e.pointerId===PHS.drag.id){ const dx=e.clientX-PHS.drag.x, now=performance.now(), dtm=Math.max(8,now-PHS.drag.t); PHS.drag.x=e.clientX; PHS.drag.t=now; const d=-dx*.0065; PHS.yaw+=d; PHS.v=clamp(d/(dtm/1000),-4,4); if(Math.abs(d)>0){ PHS.turned+=Math.abs(d); if(PHS.turned>.21){ PHS.turned=0; A.tick(); } } return; }
  if(look&&e.pointerId===look.id){ turnBy(e.clientX-look.lx,e.clientY-look.ly); look.lx=e.clientX; look.ly=e.clientY; return; }
  if(down&&e.pointerId===down.id){ const dx=e.clientX-down.lx; if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>(down.touch?8:13)) down.moved=true;
    if(down.touch){ const sx=clamp(e.clientX-down.x,-50,50), sy=clamp(e.clientY-down.y,-50,50); stickI.style.transform=`translate(${sx}px,${sy}px)`; down.ix=sx/50; down.iz=-sy/50; if(down.moved) began(); }
    else if(down.moved){ turnBy(dx,e.clientY-down.ly); began(); }
    down.lx=e.clientX; down.ly=e.clientY; }
  if(e.pointerType==='mouse'&&!down){ const p=pickPerson(e); if(p!==hov){ hov=p; const ce=$('#cur'), ct=$('#curT'); if(ce&&ct){ if(p){ ct.textContent='Say hello'; ce.classList.add('big'); } else ce.classList.remove('big'); } } } },{passive:true});
addEventListener('pointerup',e=>{ if(PHS.drag&&e.pointerId===PHS.drag.id){ PHS.drag=null; return; } if(look&&e.pointerId===look.id){ look=null; return; } if(S.st!==st||!down||e.pointerId!==down.id) return; const d=down; down=null; stickOff(); if(d.moved||S.mode!=='station'||CUT.on) return;
  if(TALK.p){ nextTalk(); return; }   // talking, a click anywhere goes on
  const p=pickPerson(e); if(p) goTalk(p); });
addEventListener('pointercancel',()=>{ down=null; look=null; PHS.drag=null; stickOff(); });
$('#crSkip',el).addEventListener('click',e=>{ e.stopPropagation(); skipCut(); });
addEventListener('wheel',e=>{ if(S.st!==st||S.mode!=='station'||CUT.on||S.wheelSettle) return; C.zoom=clamp(C.zoom*Math.exp(e.deltaY*.0008),.7,1.6); },{passive:true});
function began(){ if(started) return; started=true; el.classList.add('walked'); hint.classList.add('gone'); }

/* ---------- talking ---------- */
const tk=$('#crTalk',el), tkN=$('#crTkN',el), tkImg=$('#crImg',el), tkLink=$('#crLink',el), goBtn=$('#crGo',el);
/* the words typed so far, and the rest of the line held in place unseen, so the box is the size of the whole line from the first letter */
const tkT=$('#crTkT',el), tkS=$('#crTkS',el), tkR=$('#crTkR',el), say=n=>{ tkS.textContent=TALK.txt.slice(0,n); tkR.textContent=TALK.txt.slice(n); };
/* and the box hugs the words: the narrowest width that still takes no more lines than the line needs at full width */
function hug(){ tkT.style.width=''; const h=tkT.offsetHeight, w=tkT.offsetWidth; if(!w||!h) return; let lo=w*.35, hi=w;
  for(let k=0;k<9;k++){ const m=(lo+hi)/2; tkT.style.width=m+'px'; if(tkT.offsetHeight>h) lo=m; else hi=m; } tkT.style.width=Math.ceil(hi)+1+'px'; }
addEventListener('resize',()=>{ if(TALK.p) hug(); });
const PJ={el:$('#crProj',el),n:$('#crProj .crpj-n',el),k:$('#crProj .crpj-k',el),t:$('#crProj .crpj-t',el),l:$('#crProj .crpj-l',el),id:null,want:null,dw:0};
PJ.el.addEventListener('click',e=>e.stopPropagation());
const TALK={p:null,i:0,shown:0,txt:'',acc:0,L:null,ask:false,goal:null};
const allMet=()=>MET.size>=3;
function page(){ const p=TALK.p, L=TALK.L, last=TALK.i>=L.length-1; TALK.txt=L[TALK.i]; TALK.shown=0; TALK.acc=0; say(0);
  tk.classList.toggle('last',last&&!TALK.ask); tk.classList.toggle('ask',last&&TALK.ask); tk.classList.add('typing');
  if(last&&!TALK.ask){ MET.add(p.i); p.resume=0; tkImg.src=PHOTOS[p.i]||''; tkImg.alt=p.name; tkLink.href=p.li; tkLink.setAttribute('aria-label',p.name+' on LinkedIn'); }
  hug(); }
function openTalk(p,i=0,L=null){ TALK.ask=!!L; TALK.walkT=0; TALK.held='?'; TALK.p=p; player.path=null; player.speed=0; TALK.L=L||p.lines; TALK.i=Math.min(i,TALK.L.length-1); TALK.goal=null; C.guide=null;
  tkN.textContent=!TALK.ask&&TALK.i>=TALK.L.length-1?p.name:p.first; page(); tk.classList.add('on'); tk.setAttribute('aria-hidden','false'); p.greeted=true; p.wave=1.6;
  player.tgt=null; A.chime(5+p.i*2,0,.035); began(); }
function nextTalk(){ if(!TALK.p) return; if(TALK.shown<TALK.txt.length){ TALK.shown=TALK.txt.length; say(TALK.shown); tk.classList.remove('typing'); return; }
  if(TALK.i<TALK.L.length-1){ TALK.i++; if(TALK.i>=TALK.L.length-1&&!TALK.ask) tkN.textContent=TALK.p.name; page(); A.tick(); } else if(!TALK.ask) closeTalk(true); }
/* closing a conversation: if someone is still to meet, the camera turns gently toward them; once all three are met, Ahroon comes over */
function closeTalk(done=false){ if(!TALK.p) return; const was=TALK.p, ask=TALK.ask; if(!ask&&!MET.has(was.i)) was.resume=TALK.i;
  TALK.p=null; TALK.ask=false; tk.classList.remove('on','last','ask','typing'); tk.setAttribute('aria-hidden','true');
  if(ask){ AH.heard=true; if(GLN.t>=0) GLN.t=Math.max(GLN.t,G_IN+G_HOLD-.2); if(AH.st==='wait') ahroonCome(); return; }
  if(FIN.on) return;
  const left=people.filter(q=>!MET.has(q.i));
  if(left.length&&done){ const P=player; C.guide={p:left.reduce((a,b)=>Math.hypot(P.x-a.x,P.z-a.z)<Math.hypot(P.x-b.x,P.z-b.z)?a:b),t:1.8}; }
  if(!left.length&&AH.st==='home') { AH.st='wait'; AH.t=was.i===0?.6:.9; } }
/* say hello: from far away you walk over by yourself; close up the conversation opens. Someone you have met shows you their page */
function talkTo(p){ TALK.goal=null; if(p.i===0&&allMet()) return openInvite(); openTalk(p,MET.has(p.i)?p.lines.length-1:(p.resume||0)); }
/* walking over to someone: the way round, found on the grid; straight at them only if there is no way round */
function walkTo(p){ const P=player, path=navPath(P.x,P.z,p.x,p.z,1.8); P.goalX=p.x; P.goalZ=p.z;
  if(path){ P.path=path; P.tgt=null; return true; }
  const d=Math.hypot(P.x-p.x,P.z-p.z)||1, ux=(P.x-p.x)/d, uz=(P.z-p.z)/d; P.path=null; P.tgt=at(p.x+ux*1.6,p.z+uz*1.6).multiplyScalar(R); return false; }
function goTalk(p){ if(FIN.on||CUT.on||TALK.p||GLN.t>=0) return; const P=player, d=Math.hypot(P.x-p.x,P.z-p.z);
  if(d<2.6) return talkTo(p);
  walkTo(p); TALK.goal=p; P.stuck=0; P.tries=0; began(); A.tick(); }
labels.forEach((lb,i)=>lb.addEventListener('click',e=>{ e.stopPropagation(); if(S.st===st&&S.mode==='station'&&people[i]) goTalk(people[i]); }));
$('#crTkB',el).addEventListener('click',e=>{ if(e.target.closest('a,button')) return; nextTalk(); });
$('#crNext',el).addEventListener('click',e=>{ e.stopPropagation(); nextTalk(); });   // the arrow: the next line (it is a button, so the box's own click leaves it alone)
$('#crClose',el).addEventListener('click',e=>{ e.stopPropagation(); closeTalk(true); });
$('#crFly',el).addEventListener('click',e=>{ e.stopPropagation(); if(TALK.ask) startFinale(); });
$('#crNot',el).addEventListener('click',e=>{ e.stopPropagation(); closeTalk(); });
goBtn.addEventListener('click',e=>{ e.stopPropagation(); if(allMet()&&!FIN.on) startFinale(); });
addEventListener('keydown',e=>{ if(S.st!==st||S.mode!=='station') return;
  if(FIN.on){ if(LKEYS.includes(e.code)) launchHold(true); e.preventDefault(); e.stopImmediatePropagation(); return; }   // the last flight takes no keys but the launch
  if(CUT.on){ skipCut(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if(TALK.p&&e.code==='Escape'){ closeTalk(); e.stopImmediatePropagation(); return; }
  if(PHS.on&&e.code==='Escape'){ steerSet(false); e.stopImmediatePropagation(); return; }
  if(!TALK.p&&GLN.t<0&&(e.code==='KeyE'||e.code==='Enter')&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button'))){
    const P=player; let best=null, bd=3.4; for(const q of people){ const dq=Math.hypot(P.x-q.x,P.z-q.z); if(dq<bd){ bd=dq; best=q; } }
    if(best){ talkTo(best); e.preventDefault(); e.stopImmediatePropagation(); return; } }
  if(TALK.p&&(e.code==='Space'||e.code==='Enter'||e.code==='KeyE')&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button'))){
    if(TALK.ask&&TALK.i>=TALK.L.length-1&&TALK.shown>=TALK.txt.length&&e.code!=='KeyE'){ startFinale(); } else nextTalk(); e.preventDefault(); e.stopImmediatePropagation(); } },true);

/* ---------- once you have met all three of us, Ahroon has one more thing. The camera goes over to him for a moment (he waves),
   and as it comes back to you he sets off across town to find you, his name calling, and asks when he gets there.
   Close enough to see him, he just waves and comes over; right beside you, he asks ---------- */
const INVITE=['That\'s all three of us. One more thing: she\'s got one flight left in her. Want to see what she can really do?'];
const AH={st:'home',t:0,heard:false,asked:false,ph:0,turn:0,chk:0,lx:0,lz:0};
const GLN={t:-1,d:0,P:new T.Vector3(),L:new T.Vector3(),U:new T.Vector3(),q:new T.Vector3()};
const G_IN=.8, G_HOLD=2.05, G_OUT=.7;   // the flight over, the look at him, the flight back
function openInvite(){ AH.asked=true; openTalk(people[0],0,INVITE); }
function ahroonHome(){ const a=people[0]; if(!a) return; [a.x,a.z]=AHR; a.dir=at(a.x,a.z); if(a.ob){ a.ob.x=a.x; a.ob.z=a.z; } a.walk=0; GLN.t=-1; AH.asked=false; AH.st=allMet()?'wait':'home'; AH.t=allMet()?1.2:0; }
function ahroonCome(){ const a=people[0]; AH.st='come'; AH.chk=0; AH.rp=0; AH.path=null; AH.lx=a.x; AH.lz=a.z; }
function ahroonUpdate(dt){ const a=people[0], P=player; if(!a) return; if(FIN.on||CUT.on){ a.walk=0; return; }
  const d=Math.hypot(P.x-a.x,P.z-a.z);
  if(AH.st==='wait'){ a.walk=0; if(TALK.p) return; AH.t-=dt; if(AH.t>0) return;
    if(d<7){ AH.st='here'; a.wave=2; openInvite(); return; }   // close enough: he just asks
    AH.st='look'; glanceStart(d); return; }                     // too far: the camera goes over to him and he asks from there
  if(AH.st==='look'){ a.walk=0; if(!AH.asked&&GLN.t>=G_IN*.85) openInvite(); if(GLN.t<0) ahroonCome(); return; }
  if(AH.st!=='come'){ a.walk=damp(a.walk||0,0,6,dt); return; }
  if(TALK.p){ a.walk=0; return; }
  if(d<2.1){ a.walk=0; AH.st='here'; a.wave=1.4; if(!AH.asked) openInvite(); else a.greeted=true; return; }   // he has asked already: he waits by you, and Let's fly stays on screen
  AH.rp=(AH.rp||0)-dt; if(AH.rp<=0||!AH.path||!AH.path.length){ AH.rp=.9; AH.path=navPath(a.x,a.z,P.x,P.z,1.9)||[[P.x,P.z]]; }
  let [wx,wz]=AH.path[0]; if(Math.hypot(wx-a.x,wz-a.z)<.4&&AH.path.length>1){ AH.path.shift(); [wx,wz]=AH.path[0]; }
  const dw=Math.hypot(wx-a.x,wz-a.z)||1, dx=(wx-a.x)/dw, dz=(wz-a.z)/dw;
  const sp=Math.min(3.3,.9+d*.5); let nx=a.x+dx*sp*dt, nz=a.z+dz*sp*dt;
  for(const o of OBS){ if(o===a.ob) continue; const ex=nx-o.x, ez=nz-o.z, dd=Math.hypot(ex,ez), m=o.r+.3; if(dd<m&&dd>1e-4){ nx=o.x+ex/dd*m; nz=o.z+ez/dd*m; } }
  if(!walkable(nx,nz)){ AH.rp=0; a.walk=0; return; }
  a.x=nx; a.z=nz; a.dir=at(nx,nz); if(a.ob){ a.ob.x=nx; a.ob.z=nz; } a.walk=sp; a.ph=(a.ph||0)+dt*sp*4.6;
  AH.chk+=dt; if(AH.chk>.9){ if(Math.hypot(a.x-AH.lx,a.z-AH.lz)<.35) AH.rp=0; AH.chk=0; AH.lx=a.x; AH.lz=a.z; } }
/* the shot of him: in front of him and a little to one side, at eye height, looking at him as he waves */
function glanceStart(d){ const a=people[0]; GLN.t=0; GLN.d=d; a.wave=G_IN+G_HOLD+.4; A.chime(5,.05,.045); A.chime(8,.34,.035); A.whoosh(true,1.1,.05);
  let fx=a.face[0]-a.x, fz=a.face[1]-a.z; const l=Math.hypot(fx,fz)||1; fx/=l; fz/=l; const rx=-fz, rz=fx;
  const cx=a.x+fx*3.4+rx*.9, cz=a.z+fz*3.4+rz*.9; camAt(cx,cz,1.62,GLN.P);
  GLN.L.copy(a.dir).multiplyScalar(R+standH(a.x,a.z)+1.2); GLN.U.copy(at(cx,cz)); }
const gA=new T.Vector3(), gB=new T.Vector3();
function sphLerp(a,b,w,lift,o){ const ra=a.length(), rb=b.length(); o.copy(gA.copy(a).normalize().lerp(gB.copy(b).normalize(),w).normalize()); return o.multiplyScalar(lerp(ra,rb,w)+lift*Math.sin(Math.PI*w)); }
/* the camera during the glance: over the rooftops and back, on the planet's curve, never through it */
function glanceApply(dt){ if(GLN.t<0) return false; GLN.t+=dt; if(TALK.ask&&GLN.t>G_IN+.2) GLN.t=G_IN+.2; const t=GLN.t, end=G_IN+G_HOLD+G_OUT;
  const w=t<G_IN?E.io(t/G_IN):t<G_IN+G_HOLD?1:1-E.io((t-G_IN-G_HOLD)/G_OUT);
  if(t>=end){ GLN.t=-1; return false; }
  const lift=Math.min(8,1.5+GLN.d*.22)*(t<G_IN+G_HOLD?1:.8);
  sphLerp(st.camP,GLN.P,w,lift,GLN.q); st.camP.copy(GLN.q);
  sphLerp(st.camL,GLN.L,w,0,GLN.q); st.camL.copy(GLN.q);
  stCam.up.copy(stUp).lerp(GLN.U,w).normalize(); UPU.value.copy(stCam.up);
  LU.uPly.value.copy(GLN.L);   // whatever stands between the camera and him fades away, so he is always seen
  return true; }

/* ---------- landmarks: all of them stand, however you came ---------- */
const MKR={kr:1.3,ph:1.25,og:1.7,ae:1.3,be:.45};
function marksEnter(){ FRESH=[];
  for(const id in MK){ const m=MK[id]; m.st='on';
    m.g.visible=m.st==='on'; markScale(m,1); m.obs.forEach(q=>q.o.h=m.st==='on'?q.h:q.h0); }
  people.forEach(p=>{ p.lines=linesFor(p.i); }); baked=false; }
const mkU=new T.Vector3(), mkE=new T.Vector3(), mkF=new T.Vector3(), mkP=new T.Vector3(), mkV=new T.Vector3();
const backOut=u=>{ const c=1.9; return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2); };
function marksUpdate(dt){ for(const id in MK){ const m=MK[id];
  if(m.st==='wait'&&!CUT.on){ mkU.copy(m.base).normalize(); V.copy(m.base).addScaledVector(mkU,1.4).project(stCam); const [mx,mz]=loc(mkU);
    if(Math.hypot(player.x-mx,player.z-mz)<17&&V.z<1&&Math.abs(V.x)<.8&&Math.abs(V.y)<.8){ m.st='grow'; m.t=0; m.g.visible=true; markScale(m,.001); m.obs.forEach(q=>q.o.h=q.h);
      // the same bell that called you up there, and a ring of dust where it comes up
      const s0=STA.find(x=>x.id===id); A.call(s0?BEACON_NOTES[s0.idx]:12,0,.06); A.pop(); S.shake=Math.max(S.shake,.12);
      mkE.crossVectors(mkU,Math.abs(mkU.y)<.9?UPY:V2.set(1,0,0)).normalize(); mkF.crossVectors(mkU,mkE);
      for(let k=0;k<12;k++){ const a=k/12*TAU+Math.random()*.3, c=Math.cos(a), sn=Math.sin(a); mkV.copy(mkE).multiplyScalar(c).addScaledVector(mkF,sn);
        mkP.copy(m.base).addScaledVector(mkV,MKR[id]).addScaledVector(mkU,.15); puff(mkP,mkV.multiplyScalar(1.6+Math.random()).addScaledVector(mkU,.35),.2+Math.random()*.14,1.3); } } }
  if(m.st==='grow'){ m.t+=dt; const u=clamp(m.t/1.25,0,1); markScale(m,Math.max(.001,backOut(u)));
    if(u>=1){ m.st='on'; seen.add(id); markScale(m,1); baked=false; } } } }   // the sun's shadows are drawn again with it in

/* ---------- the last flight, on the ground. Everyone is at the pad when you get there; you walk up the ramp and the hatch shuts.
   Then a short wait: the music has gone, a clock ticks three times, a heartbeat quickens, steam hisses out of the base, the engines
   spool up and the rocket starts to shiver. One second of nothing at all. Then it lights, the smoke rolls out across the town,
   the three of us wave, and you climb, quickly now, through the clouds until the sky goes black. ---------- */
const FIN={on:false,t:0,look:new T.Vector3(),wave:0,mus:0,fov:45,ign:false,shut:false,handed:false,beat:0,clk:-1,vent:0,trail:0,st:0,ph:0,go:false,ask:false,wait:0,held:0,hold:false,
  cp:new T.Vector3(),cl:new T.Vector3(),pos:new T.Vector3(),alt:0};
const F_WALK0=.3, F_WALK1=1.9, F_DOOR0=2.0, F_DOOR1=2.55, F_TICK0=2.85, F_TICKI=.6, F_HOLD=.5, F_IGN=4.75, F_LIFT=5.1, F_SPACE=7;   // three quick ticks, a breath, lit; F_SPACE: seconds of climbing, by when the camera looks back down at Earth
/* after the ticks the rocket waits on the pad for you: hold (Space, or press anywhere) and the engines spool up under your
   hand until it lights. F_HELD: seconds of holding to light it; nobody holding, it goes by itself after F_AUTO */
const F_WAIT=F_IGN-F_HOLD-.001, F_HELD=1.3, F_AUTO=9, HP=$('#holdp'), HPT=$('#holdp span');
const LKEYS=['Space','Enter','KeyW','ArrowUp'], launchHold=on=>{ if(FIN.on&&FIN.ask&&!FIN.go){ if(on&&!FIN.hold){ A.vent(0); if(!FIN.pr){ FIN.pr=true; A.clunk(); } } FIN.hold=on; } else if(!on) FIN.hold=false; };
addEventListener('keyup',e=>{ if(LKEYS.includes(e.code)) launchHold(false); });
addEventListener('pointerdown',()=>launchHold(true)); addEventListener('pointerup',()=>launchHold(false)); addEventListener('pointercancel',()=>launchHold(false));
function launchPrompt(on){ document.documentElement.classList.toggle('launching',on); if(on){ HPT.textContent=FINE?'Hold Space to launch':'Hold anywhere to launch'; HP.style.setProperty('--k','0'); }
  HP.classList.toggle('on',on); HP.classList.remove('go'); }
const FOUND=(()=>{ const cx=CAMC[0], cz=CAMC[1], fx=PAD[0]-cx, fz=PAD[1]-cz, l=Math.hypot(fx,fz), ux=fx/l, uz=fz/l, rx=-uz, rz=ux;   // to the right of the view from the road
  return [0,1,2].map(k=>[cx+ux*(3.5+.55*k)+rx*(1.25+.8*k),cz+uz*(3.5+.55*k)+rz*(1.25+.8*k)]); })();
const fSide=new T.Vector3(), fA=new T.Vector3(), fB=new T.Vector3(), fC=new T.Vector3(), fUp=new T.Vector3();
/* the launch flame: one drawn shape, banded like a cartoon flame (white-hot where you look straight in, yellow, then orange at the
   edges and the tip), licking and flickering, with the same ink line round it as everything else */
const LFU={uTime:G.uTime,uLen:{value:6},uR:{value:.6}};
let LFLAME=null;
function buildLaunchFlame(){ const g=new T.CylinderGeometry(1,1,1,32,24,true).translate(0,-.5,0);
  const m=new T.ShaderMaterial({uniforms:Object.assign({uCut:{value:0}},LFU,{uPly:LU.uPly}),side:T.DoubleSide,
    vertexShader:`uniform float uTime,uLen,uR; varying vec3 vN,vW,vA; varying float vU;
      float h(float n){ return fract(sin(n)*43758.5453); } float nz(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(h(i),h(i+1.),f); }
      void main(){ vec3 p=position; float u=clamp(-p.y,0.,1.), a=atan(p.z,p.x);
        float prof=pow(max(1.-u,0.),.55)*(1.+.9*u)*(.62+.38*smoothstep(0.,.08,u));   // a full belly, then a quick lick to the point
        float lick=1.+.34*(nz(uTime*9.+u*7.+a*1.6)-.5)*u+.12*(nz(uTime*23.+a*3.)-.5);
        vec2 dir=p.xz/max(length(p.xz),1e-4); p.xz=dir*uR*prof*lick; p.y=-u*uLen*(1.+.12*(nz(uTime*11.)-.5));
        p.x+=sin(uTime*14.+u*5.)*.08*u*u; p.z+=cos(uTime*12.+u*4.)*.07*u*u;
        vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*vec3(dir.x,0.,dir.y)); vA=normalize(mat3(modelMatrix)*vec3(0.,1.,0.)); vU=u; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uTime; varying vec3 vN,vW,vA; varying float vU; ${NEAR}
      void main(){ nearFade(vW); vec3 V=normalize(cameraPosition-vW), A=normalize(vA), Vp=V-A*dot(V,A); float lp=length(Vp);
        // how far in from the edge of the flame as you see it: measured across the flame, so it is pale down the middle
        // and hot at the nozzle from any angle, from below as much as from the side
        float f=mix(1.,abs(dot(normalize(vN),Vp))/max(lp,1e-3),smoothstep(.06,.28,lp));
        float b=f*.85+.2-vU*.55+.025*sin(uTime*23.+vU*7.);   // hot and pale near the nozzle, cooling out to the edges and the tip
        vec3 c=b>.66?vec3(1.,.98,.9):b>.42?vec3(1.,.86,.4):b>.16?vec3(1.,.58,.2):vec3(.9,.34,.13);
        gl_FragColor=vec4(c,1.); }`});
  LFLAME=new T.Mesh(g,m); LFLAME.position.y=.06; LFLAME.visible=false; LFLAME.frustumCulled=false; LFLAME.userData.dyn=true; RK.g.add(LFLAME); }
function startFinale(){ if(FIN.on) return; closeTalk(); GLN.t=-1; goBtn.hidden=true; Object.assign(FIN,{on:true,t:0,ign:false,shut:false,handed:false,cloud:false,lift:false,top:false,dawn:false,pr:false,ck:0,beat:0,clk:-1,vent:0,trail:0,st:0,ph:0,wave:0,mus:.55,alt:0,go:false,ask:false,wait:0,held:0,hold:false});
  S.fin=true; S.flash=1; document.documentElement.classList.add('fin'); el.classList.add('fin','walked'); hint.classList.add('gone'); cine(true); stickOff(); down=null; look=null;
  people.forEach((p,k)=>{ [p.x,p.z]=FOUND[k]; p.dir=at(p.x,p.z); if(p.ob){ p.ob.x=p.x; p.ob.z=p.z; } p.walk=0; tang(p.dir,padTop,p.f); });
  AH.st='done'; FIN.look.copy(padTop).addScaledVector(PADU,2.2); rocketLanded(); me.visible=true; player.tgt=null; player.speed=0; TALK.goal=null; C.guide=null;
  camAt(CAMC[0],CAMC[1],1.45,FIN.cp); FIN.cl.copy(padTop).addScaledVector(PADU,1.4); A.whoosh(false,1.4,.1); }
function finUpdate(dt,t){ const up=PADU, P=player;
  // the clock stops on the pad until you have held long enough to light it
  FIN.t=FIN.go?FIN.t+dt*(S.finX||1):Math.min(F_WAIT,FIN.t+dt*(S.finX||1)); let c=FIN.t;
  if(!FIN.go&&c>=F_WAIT){ if(!FIN.ask){ FIN.ask=true; FIN.wait=0; launchPrompt(true); }
    FIN.wait+=dt; const want=FIN.hold||FIN.wait>F_AUTO; FIN.held=want?FIN.held+dt:Math.max(0,FIN.held-dt*1.6);
    HP.style.setProperty('--k',clamp(FIN.held/F_HELD,0,1).toFixed(3)); HP.classList.toggle('held',want);
    if(FIN.held>=F_HELD){ FIN.go=true; FIN.hold=false; HP.classList.add('go'); setTimeout(()=>launchPrompt(false),500); FIN.t=c=F_IGN; } }
  const hk=FIN.go?1:clamp(FIN.held/F_HELD,0,1);   // how far the engines have spooled up under your hand
  // up the ramp and in
  if(c<F_WALK1){ const wk=clamp((c-F_WALK0)/(F_WALK1-F_WALK0),0,1), z=OUT_Z-(OUT_Z-.15)*wk*wk*(3-2*wk), wv=6*wk*(1-wk);
    const x0=PAD[0]+DOOR[0]*z, z0=PAD[1]+DOOR[1]*z; at(x0,z0,V2); tang(V2,at(PAD[0]-DOOR[0],PAD[1]-DOOR[1]),cF); standOn(me,V2,cF,.1+rampY(z));
    FIN.ph+=dt*7.2*Math.min(1,wv*.8); animate(me,FIN.ph,Math.min(1,wv*.75),0,t,9); const stp=Math.floor(FIN.ph/Math.PI); if(wv>.25&&stp!==FIN.st){ FIN.st=stp; A.step(z<RAMP_END+.3?2:1); } }
  else me.visible=false;
  // the hatch comes up and shuts
  const dk=clamp((c-F_DOOR0)/(F_DOOR1-F_DOOR0),0,1); RK.door.rotation.x=lerp(DOOR_OPEN,DOOR_SHUT,dk*dk*(3-2*dk));
  if(dk>=1&&!FIN.shut){ FIN.shut=true; A.clunk(); S.shake=Math.max(S.shake,.14); document.body.classList.add('tense'); }
  // the wait, short: three quick ticks of a clock, a heartbeat that quickens, steam from the base, a low drone, the engines spooling up; then one second of nothing
  const hold=c>=F_IGN-F_HOLD&&c<F_IGN;
  if(c>=F_TICK0&&c<F_IGN-F_HOLD){ const k=Math.floor((c-F_TICK0)/F_TICKI); if(k!==FIN.clk){ FIN.clk=k; A.tock(k); } }
  FIN.beat-=dt*(S.finX||1); if(c>F_DOOR1&&c<F_IGN-F_HOLD&&FIN.beat<=0){ const k=sstep(F_DOOR1,F_IGN,c); FIN.beat=(.7-.25*k)*(1-.4*hk); A.beat(.55+.45*k); }
  if(c>F_DOOR1+.4&&c<F_IGN){ FIN.vent-=dt; if(FIN.vent<=0){ FIN.vent=.22+Math.random()*.3; const sg=Math.random()<.5?-1:1; fA.crossVectors(up,RKN).normalize();
      fB.copy(padTop).addScaledVector(fA,sg*1.05).addScaledVector(up,.45); fC.copy(fA).multiplyScalar(sg*(1.1+Math.random()*.6)).addScaledVector(up,.25); puff(fB,fC,.2+Math.random()*.12,1.7); A.vent(sg*.45); } }
  // ignition
  if(c>=F_IGN&&!FIN.ign){ FIN.ign=true; A.ignite(); S.shake=1.2; S.flash=Math.max(S.flash,.22); document.body.classList.remove('tense'); document.body.classList.add('loose');
    for(let k=0;k<44;k++){ const a=k/44*TAU+Math.random()*.15, r=1.1+Math.random()*.4; at(PAD[0]+Math.cos(a)*r,PAD[1]+Math.sin(a)*r,V2).multiplyScalar(R+.3);
      tang(up,at(PAD[0]+Math.cos(a)*4,PAD[1]+Math.sin(a)*4),V3).multiplyScalar(3+Math.random()*2.6).addScaledVector(up,.35+Math.random()*.5); puff(V2,V3,.42+Math.random()*.38,3+Math.random()*1.4); } }
  const fk=c<F_IGN?0:sstep(F_IGN,F_IGN+.4,c), tau=Math.max(0,c-F_LIFT), alt=.5*tau*tau+.12*tau*tau*tau; FIN.alt=alt; FIN.wave=c>F_IGN+.35?1:0;   // it gets going at once
  RK.flame.visible=false; LFLAME.visible=fk>.01; LFU.uR.value=.62*(.4+.6*fk)*(1+.25*sstep(0,3,tau)); LFU.uLen.value=fk*(3.8+2.6*sstep(0,2.5,tau))*(.94+.06*Math.sin(t*37));
  const wob=c>F_IGN-1.8&&tau<1.2?(Math.random()-.5)*.014*sstep(F_IGN-1.8,F_IGN,c)*(c>F_IGN?1.6:.35+1.1*hk):0;
  if(FIN.ask&&!FIN.go) S.shake=Math.max(S.shake,.32*hk);
  FIN.pos.copy(padTop).addScaledVector(up,alt); rocketPose(FIN.pos,up,wob);
  if(FIN.ign){ FIN.trail-=dt; let n=0; while(FIN.trail<=0&&n++<4){ FIN.trail+=tau>0?.022:.05; fB.copy(FIN.pos).addScaledVector(up,-.25-Math.random()*.6);
      fC.set(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(1.2).addScaledVector(up,tau>0?-2.5:-.2);
      if(tau<2.5&&alt<3){ fA.set(Math.random()-.5,0,Math.random()-.5); tang(up,fA.add(padTop),fC).multiplyScalar(3.5+Math.random()*2).addScaledVector(up,.3); }
      puff(fB,fC,(tau>0?.35:.45)+Math.random()*.3,tau>0?2.6:2.2); } }
  // sound, matched to every beat: the drone and the engines spooling up while it shivers, silence, the hit of ignition, the roar
  // and its crackle on the pad, a long push as it leaves, then the roar dulling and thinning to nothing as the air goes
  const air=1-sstep(22,72,alt), spool=c<F_IGN-F_HOLD?sstep(F_IGN-1.9,F_IGN-F_HOLD,c)*(.3+.7*hk):0;
  /* on the pad the engines answer your hand: as you hold they build from a murmur to a roar, the whine climbing with them */
  const hs=FIN.ask&&!FIN.go?hk*hk:0;
  if(c<F_IGN){ A.roar(hold?0:.02+.16*sstep(F_DOOR1,F_IGN-F_HOLD,c)+.1*spool+.42*hs); A.thrust(.18*spool+.75*hs); A.whine(hold?0:.34*spool+.5*hs); A.roarTone(380+420*hs); }
  else { A.whine(0); A.roar(.8*air); A.thrust(1.1*air); A.roarTone(lerp(240,950,fk)*(1-.65*sstep(8,55,alt)));
    S.shake=Math.max(S.shake,(.55+.4*(1-sstep(0,1.5,tau)))*(1-sstep(4,26,alt)));
    FIN.ck-=dt; if(air>.04&&FIN.ck<=0){ FIN.ck=.035+Math.random()*.08; A.crackle(.06*air*air*(.4+Math.random()*.8)*(1-.5*sstep(6,30,alt))); } }
  if(c>=F_LIFT&&!FIN.lift){ FIN.lift=true; A.liftoff(); A.swell(); }
  if(alt>44&&!FIN.top){ FIN.top=true; A.chord(); }   // the black, and the orbit's music
  FIN.mus=.55*(1-sstep(0,F_DOOR1-.4,c));
  A.update(t,{sub:.18*sstep(45,70,alt),pad:.42*sstep(34,66,alt),bright:.2});   // as the air goes, the orbit's own music comes in to meet you
  if(FIN.ign) BIRDS.forEach(b=>{ b.h=Math.min(b.h+dt*2.4,45); b.r+=dt*1.1; });
  // the sky goes to black and the haze lifts; through the cloud layer the picture whites out for a moment, with a rush of air
  SPACEU.value=sstep(20,66,alt); LU.uFogK.value=1-sstep(5,26,alt);
  if(alt>17&&!FIN.cloud){ FIN.cloud=true; S.flash=Math.max(S.flash,.42); A.whoosh(true,1.4,.2); }
  FIN.look.copy(tau>0?FIN.pos:fB.copy(padTop).addScaledVector(up,2.2));
  // the camera: on the road behind the three of us, creeping in during the wait, then up after the rocket and out above it
  const road=camAt(CAMC[0],CAMC[1],1.45,fA), push=camAt(lerp(CAMC[0],PAD[0],.13),lerp(CAMC[1],PAD[1],.13),1.25,fB);
  fSide.crossVectors(up,RKN).normalize(); if(fSide.dot(V.copy(road).sub(padTop))<0) fSide.negate();   // the side the road is on
  const wP=E.io(clamp((c-F_DOOR1)/(F_IGN-F_DOOR1),0,1)), cp=V3.copy(road).lerp(push,wP*.85), cl=V4.copy(padTop).addScaledVector(up,lerp(1.5,2.2,wP));
  if(c<F_WALK1) cl.lerp(V.copy(me.position).addScaledVector(up,1.1),.45*(1-sstep(F_WALK1-.8,F_WALK1,c)));
  let k2=0;
  if(tau>0){ const k1=E.io(clamp((tau-1.5)/3.2,0,1)); k2=E.io(clamp((tau-4.6)/2.8,0,1));
    fC.copy(FIN.pos).addScaledVector(up,-3.6).addScaledVector(fSide,7.5); cp.lerp(fC,k1);
    fC.copy(FIN.pos).addScaledVector(up,13).addScaledVector(fSide,3.8); cp.lerp(fC,k2);
    cl.copy(FIN.pos).addScaledVector(up,1.2*(1-k2)-5*k2); }
  if(c<.05){ FIN.cp.copy(cp); FIN.cl.copy(cl); }
  FIN.cp.lerp(cp,1-Math.exp(-(tau>0?5:3)*dt)); FIN.cl.lerp(cl,1-Math.exp(-(tau>0?7:3.5)*dt));
  st.camP.copy(FIN.cp); st.camL.copy(FIN.cl); FIN.fov=lerp(45,40,wP)+(tau>0?12*sstep(0,3,tau):0);
  // looking straight down, the top of the picture is the way the road was
  fUp.copy(up).multiplyScalar(1-k2).addScaledVector(fA.crossVectors(fSide,up).normalize(),-k2).normalize();
  stUp.copy(fUp); stCam.up.copy(fUp); UPU.value.copy(up); LU.uPly.value.copy(FIN.cp); S.stSnap=true;   // uPly at the camera: nothing gets cut away
  // looking back down at the town from above the rocket, the light takes over, and then the white page
  if(tau>F_SPACE-.5){ const k=sstep(F_SPACE-.5,F_SPACE+2.1,tau), L=post.uniforms.uLight.value;
    /* where the rocket is on the screen: the light opens from it */
    V.copy(FIN.pos).addScaledVector(up,-.5).project(stCam); const vis=V.z<1&&Math.abs(V.x)<1.1&&Math.abs(V.y)<1.1, x=vis?V.x*.5+.5:.5, y=vis?V.y*.5+.5:.5;
    if(!FIN.dawn){ FIN.dawn=true; A.dawn(); }   // the light's own sound: a rush of air rising into a bright open chord
    if(L.z<=0) L.set(x,y,0); L.x=lerp(L.x,x,1-Math.exp(-4*dt)); L.y=lerp(L.y,y,1-Math.exp(-4*dt)); L.z=k;
    if(k>=1&&!FIN.handed){ FIN.handed=true; if(typeof finaleWhite==='function') setTimeout(finaleWhite,0); } } }   /* (after this frame: Earth is still drawing it) */
/* when space has taken over completely, Earth puts itself back as it was */
st.finaleEnd=function(){ post.uniforms.uLight.value.z=0; FIN.on=false; S.fin=false; launchPrompt(false); el.classList.remove('fin'); SPACEU.value=0; LU.uFogK.value=1; RK.flame.visible=false; A.roarTone(380); A.whine(0); if(LFLAME) LFLAME.visible=false; me.visible=true; rocketLanded();
  people.forEach(p=>{ [p.x,p.z]=p.at; p.dir=at(p.x,p.z); if(p.ob){ p.ob.x=p.x; p.ob.z=p.z; } p.walk=0; }); BIRDS.forEach(b=>{ b.h=Math.min(b.h,10); }); AH.st='home'; };

/* ---------- lifecycle ---------- */
let bloom0=1, birdT=2;
const stUp=new T.Vector3(0,1,0);
st.enter=function(){ post.uniforms.uFlat.value=1;   /* Earth's daylight from the first frame: no dark edges left over from space, fading as you watch */
  const P=player; CUT.on=false; CUT.landed=false; CUT.door=false; el.classList.remove('cut'); if(me) me.visible=true; rocketLanded(); placeAtStart(); stickOff(); down=null;
  started=false; cardT=0; el.classList.remove('walked'); closeTalk(); hint.classList.remove('gone');
  $('#crLede',el).textContent=st.land?'You\'ve landed. Walk over and say hello.':'You came through the hole. Walk over and say hello.'; people.forEach(p=>{ p.greeted=false; p.near=false; }); ahroonHome(); TALK.goal=null; C.guide=null;
  hint.textContent=FINE?'WASD or the arrows to walk · drag to look around · scroll to zoom · walk up to someone to talk':'Drag anywhere to walk · a second finger looks round · walk up to someone to talk';
  marksEnter(); stUp.copy(P.u); st.setState('menu'); document.documentElement.classList.add('earth'); bloom0=post.uniforms.uBloom.value; post.uniforms.uBloom.value=.05; };
st.exit=function(){ inkRT.setSize(1,1); colRT.setSize(1,1); if(baked){ shRT.dispose(); shRT.depthTexture.dispose(); baked=false; }   /* Earth's own drawing buffers and its sun's shadow are given back while you are not on Earth: the next frame here makes them again */
  CUT.on=false; el.classList.remove('cut'); document.documentElement.classList.remove('crcut'); stickOff(); down=null; A.thrust(0); A.roar(0); stCam.up.set(0,1,0); stCam.layers.set(0); if(stCam.fov!==36){ stCam.fov=36; stCam.updateProjectionMatrix(); } document.documentElement.classList.remove('earth');
  post.uniforms.uBloom.value=bloom0||1; post.uniforms.uFlat.value=0; closeTalk(); A.music(0); A.hush(); };
st.abort=function(){ closeTalk(); };

const Mf=new T.Matrix4(), Qb=new T.Quaternion(), camT=new T.Vector3(), camR=new T.Vector3(), camW=new T.Vector3();
const sT=new T.Vector3();
function standOn(g,u,f,h){ sT.crossVectors(u,f).normalize(); Mf.makeBasis(sT,u,f); g.quaternion.setFromRotationMatrix(Mf); g.position.copy(u).multiplyScalar(R+h); }
function animate(fig,walkPh,amt,wave,t,i){ const d=fig.userData, sw=Math.sin(walkPh);
  d.legs[0].rotation.x=sw*.72*amt; d.legs[1].rotation.x=-sw*.72*amt; d.arms[0].rotation.x=-sw*.6*amt; d.arms[1].rotation.x=sw*.6*amt;
  d.fore[0].rotation.x=-.12-Math.max(0,sw)*.4*amt; d.fore[1].rotation.x=-.12-Math.max(0,-sw)*.4*amt;   // the elbow bends as the arm swings forward
  d.body.position.y=Math.abs(Math.cos(walkPh))*.04*amt+Math.sin(t*2.1+i)*.006; d.body.rotation.y=sw*.08*amt;
  // a wave: the left arm out and up, the forearm upright, waving from the elbow
  const a=d.arms[1], f=d.fore[1];
  if(wave>0){ a.rotation.z=damp(a.rotation.z,1.95,14,.016); a.rotation.x=0; f.rotation.z=damp(f.rotation.z,.95+Math.sin(t*11)*.38,14,.016); }
  else { a.rotation.z=damp(a.rotation.z,0,8,.016); f.rotation.z=damp(f.rotation.z,0,8,.016); }
  if(d.drone){ d.drone.position.y=1.48+Math.sin(t*2.3+i)*.035; d.drone.rotation.y=Math.sin(t*.5+i)*.5; } }

st.update=function(dt,t){ if(!st.built) return; const P=player; cardT+=dt; if(cardT>7) el.classList.add('walked');
  const port=innerHeight>innerWidth, fov=FIN.on?FIN.fov*(port?1.3:1):port?58:45; if(stCam.fov!==fov){ stCam.fov=fov; stCam.updateProjectionMatrix(); }
  if(FIN.on) finUpdate(dt,t); else if(CUT.on) cutUpdate(dt,t); else {
  // input, the same as flying: keys move you relative to the camera; on a touch screen, the stick
  let iz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0), ix=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0), mag=1;
  if(down&&down.touch&&down.moved){ ix=down.ix; iz=down.iz; mag=Math.min(1,Math.hypot(ix,iz)); if(mag<.15){ ix=iz=0; } }
  if(GLN.t>=0){ ix=iz=0; P.tgt=null; }   // while the camera looks at Ahroon, you wait
  if(PHS.on){ ix=iz=0; P.tgt=null; }   // holding the light, you stay put
  const run=keys.has('ShiftLeft')||keys.has('ShiftRight');
  /* talking, you stay put. To walk off, let go of the keys (or the stick) and set off again, and keep going a moment */
  if(TALK.p){ const mv=!!(ix||iz), stick=!!(down&&down.touch&&down.moved), sig=stick?'stick':Math.sign(ix)+','+Math.sign(iz);
    if(TALK.held==='?') TALK.held=mv?sig:null; else if(TALK.held&&(sig!==TALK.held||!mv)) TALK.held=null;   // what you were already holding when it began does not count
    TALK.walkT=mv&&!TALK.held?(TALK.walkT||0)+dt:0; if(TALK.walkT>.55) closeTalk(); else { ix=iz=0; } }
  if(ix||iz){ P.tgt=null; P.path=null; TALK.goal=null; C.guide=null; began(); }
  /* walking a path: aim at the next corner, and slow down only for the last one */
  if(P.path&&P.path.length&&!TALK.p){ const [wx,wz]=P.path[0], dw=Math.hypot(wx-P.x,wz-P.z);
    if(dw<(P.path.length>1?.45:.22)){ P.path.shift(); if(!P.path.length){ P.path=null; P.tgt=null; } }
    if(P.path){ P.tgt=at(P.path[0][0],P.path[0][1]).multiplyScalar(R); let rest=0; for(let k=1;k<P.path.length;k++) rest+=Math.hypot(P.path[k][0]-P.path[k-1][0],P.path[k][1]-P.path[k-1][1]); P.rest=rest; } }
  let want=0;
  if(ix||iz){ camR.crossVectors(C.f,P.u); V4.copy(C.f).multiplyScalar(iz).addScaledVector(camR,ix).normalize(); want=(run?4.2:2.7)*mag; }
  else if(P.tgt){ const ang=Math.acos(clamp(P.u.dot(V2.copy(P.tgt).normalize()),-1,1)); if(ang*R<.2&&!P.path){ P.tgt=null; } else { tang(P.u,P.tgt,V4); want=Math.min(2.7,(ang*R+(P.path?P.rest||0:0))*2+.5); } }
  if(want>0){ const s=V.crossVectors(P.f,V4).dot(P.u), c=P.f.dot(V4), a=Math.atan2(s,c); rot(P.f,P.u,clamp(a,-11*dt,11*dt)); if(Math.abs(a)>1.6) want*=.3; }
  if(TALK.p) want=0;
  P.speed=damp(P.speed,want,8,dt);
  if(P.speed>.01){ const u0=P.u.clone(), f0=P.f.clone(); walk(P,P.speed*dt); let [x,z]=loc(P.u);
    if(!walkable(x,z)){ P.u.copy(u0); P.f.copy(f0); P.speed*=.2; if(P.path) P.stuck=(P.stuck||0)+.4; else P.tgt=null; }
    else { let tx=null,tz=null; if(P.tgt) [tx,tz]=loc(V.copy(P.tgt).normalize());
      for(const o of OBS){ const dx=x-o.x, dz=z-o.z, d=Math.hypot(dx,dz), m=o.r+.28; if(d<m&&d>1e-4){ x=o.x+dx/d*m; z=o.z+dz/d*m; if(tx!==null&&!P.path&&Math.hypot(tx-o.x,tz-o.z)<m+.3) P.tgt=null; } }
      if(walkable(x,z)) at(x,z,P.u); else P.u.copy(u0); tang(P.u,P.f,P.f); } }
  [P.x,P.z]=loc(P.u); P.h=damp(P.h,standH(P.x,P.z),14,dt);
  /* walked over to someone: talk on arrival. Held up on the way, or they have moved: find the way again; after a few tries,
     close enough is close enough */
  if(TALK.goal&&!TALK.p){ const g=TALK.goal, dg=Math.hypot(P.x-g.x,P.z-g.z);
    if(dg<2.5) talkTo(g);
    else { P.stuck=Math.max(0,(P.stuck||0)+(P.speed<.3?dt:-dt*.5));
      if(P.stuck>.7||(Math.hypot(g.x-(P.goalX??g.x),g.z-(P.goalZ??g.z))>1.2)){ P.stuck=0; P.tries=(P.tries||0)+1; if(P.tries>3){ if(dg<6) talkTo(g); else { TALK.goal=null; P.path=null; P.tgt=null; } } else walkTo(g); }
      else if(!P.tgt&&!P.path) TALK.goal=null; } }
  P.ph+=dt*P.speed*4.6; standOn(me,P.u,P.f,P.h); animate(me,P.ph,clamp(P.speed/2.7,0,1),0,t,9);
  P.step+=P.speed*dt; if(P.step>.62){ P.step=0; const rd=roadDist(P.x,P.z); A.step(onJetty(P.x,P.z)?2:rd<RW+SW?1:0); }
  // the camera rig: a lazy follow when you walk forward, never against a drag
  C.dragT+=dt; tang(P.u,C.f,C.f);
  if(P.speed>.3&&C.dragT>2.5&&!TALK.p){ const sg=Math.sign(V.crossVectors(C.f,P.f).dot(P.u))||1, a=Math.acos(clamp(C.f.dot(P.f),-1,1));
    if(a>.12&&a<2.3) rot(C.f,P.u,sg*Math.min(a,1.05*Math.min(1,P.speed/2.7)*sstep(.12,.7,a)*(1-a/3.2)*dt)); }
  // after a conversation the camera turns, slowly, toward whoever you have not met yet
  if(C.guide&&!TALK.p){ const g=C.guide; g.t-=dt; tang(P.u,g.p.dir,V3); const sg=Math.sign(V.crossVectors(C.f,V3).dot(P.u))||1, a=Math.acos(clamp(C.f.dot(V3),-1,1));
    if(a>.05) rot(C.f,P.u,sg*Math.min(a,1.3*dt*sstep(0,.5,g.t))); if(g.t<=0||C.dragT<.05) C.guide=null; }
  // talking: centre between the two of you, turned to see you both a little from the side; afterwards it simply stays turned
  const tp=TALK.p; C.tk=damp(C.tk,tp?1:0,2.4,dt); const tE=C.tk*C.tk*(3-2*C.tk);
  C.camH=damp(C.camH,P.h,3,dt); camT.copy(P.u).multiplyScalar(R+C.camH+C.HEAD);
  if(tp){ V2.copy(tp.dir).multiplyScalar(R+standH(tp.x,tp.z)+C.HEAD); C.mid.copy(camT).lerp(V2,.3); tang(P.u,V3.copy(V2).sub(camT),V4);
    const [mx,mz]=loc(camW.copy(C.mid).normalize());
    if(!TALK.side){ let best=-9; for(const sg of [1,-1]){ const f=rot(V3.copy(V4),P.u,.36*sg), sc=rigLimit(mx,mz,P.u,f,.16,3.4)-Math.acos(clamp(f.dot(C.f),-1,1))*.6; if(sc>best){ best=sc; TALK.side=sg; } } }
    rot(C.tf.copy(V4),P.u,.36*TALK.side); const sg=Math.sign(V.crossVectors(C.f,C.tf).dot(P.u))||1, aa=Math.acos(clamp(C.f.dot(C.tf),-1,1)); rot(C.f,P.u,sg*aa*(1-Math.exp(-2.6*dt)));
    tang(P.u,tp.dir,V4); const s=V.crossVectors(P.f,V4).dot(P.u), c=P.f.dot(V4); rot(P.f,P.u,clamp(Math.atan2(s,c),-6*dt,6*dt)); }
  else TALK.side=0;
  camT.lerp(C.mid,tE);
  const pitch=lerp(C.pitch,.16,tE), D=lerp(C.D0(),3.4,tE), [tx,tz]=loc(camW.copy(camT).normalize()), lim=rigLimit(tx,tz,P.u,C.f,pitch,D);
  // pressed against a house while you move: slide slowly round to whichever side is more open
  if(lim<D*.55&&P.speed>.3&&!tp&&C.dragT>1.2){ let best=lim, bs=0; for(const a of [.45,-.45,.9,-.9]){ const l2=rigLimit(tx,tz,P.u,rot(V3.copy(C.f),P.u,a),pitch,D); if(l2>best+.3){ best=l2; bs=a; } }
    if(bs) rot(C.f,P.u,Math.sign(bs)*Math.min(Math.abs(bs),.8*dt)); }
  C.pEff=damp(C.pEff,pitch,2.5,dt);
  C.dist=damp(C.dist,lim,lim<C.dist?7:1.6,dt);
  C.tgt.lerp(camT,1-Math.exp(-14*dt));
  stUp.lerp(P.u,1-Math.exp(-6*dt)).normalize(); stCam.up.copy(stUp); UPU.value.copy(stUp);
  rigPose(C.tgt,stUp,C.f,C.pEff,C.dist,st.camP,st.camL);
  LU.uPly.value.copy(P.u).multiplyScalar(R+P.h+1);   // what the camera must always see: you
  glanceApply(dt); steerCam(dt);
  S.stSnap=true; // the camera does its own smoothing
  }
  post.uniforms.uFlat.value=damp(post.uniforms.uFlat.value,1,3,dt); puffsUpdate(CUT.on?0:dt); marksUpdate(dt);
  // the three of us: turn to you when you are near, wave hello, and start talking when you walk right up
  ahroonUpdate(dt);
  people.forEach((p,i)=>{ const d=Math.hypot(P.x-p.x,P.z-p.z), near=d<6&&!(CUT.on&&CUT.t<T_OUT)&&!FIN.on;
    // walk right up to someone you have not met (or to Ahroon, once he has something to show you) and they start talking
    /* (Ahroon walking over to you after a not yet is not you walking up to him: he does not ask again until you come back to him) */
    /* (on your way over to someone you clicked, nobody else stops you) */
    if(d<2.3&&!p.greeted&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0&&(!TALK.goal||TALK.goal===p)&&!(i===0&&AH.st==='come')&&(!MET.has(i)||(i===0&&allMet()))) talkTo(p);
    if(d>3.3) p.greeted=false;
    if(near&&!p.near) p.wave=1.2; p.near=near; p.wave=Math.max(0,p.wave-dt);
    const faceTo=FIN.on?FIN.look:(near||p.walk>.2)?P.u:at(p.face[0],p.face[1]);
    tang(p.dir,faceTo,V4); p.f.lerp(V4,1-Math.exp(-4*dt)); tang(p.dir,p.f,p.f); standOn(p.g,p.dir,p.f,standH(p.x,p.z)); animate(p.g,p.ph||0,clamp((p.walk||0)/2.7,0,1),FIN.on?FIN.wave:p.wave,t,i);
    p.blink-=dt; const ey=p.blink<.12?.15:1; if(p.blink<0) p.blink=2+Math.random()*3; p.g.userData.eyes.forEach(e=>e.scale.y=ey);
    // name tags: anyone you have not met is always marked, wherever they are; Ahroon's tag calls you once he has one more thing
    const ask=i===0&&allMet(), lb=labels[i]; lb.classList.toggle('ask',ask); lb.classList.toggle('can',d<3.4&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0); V.copy(p.dir).multiplyScalar(R+standH(p.x,p.z)+1.62).project(stCam); lb.classList.toggle('on',(!MET.has(i)||ask||d<10||hov===p)&&V.z<1&&!TALK.p&&!CUT.on&&!FIN.on);
    lb.style.transform=`translate(${((V.x*.5+.5)*innerWidth).toFixed(1)}px,${((-V.y*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
    /* the way to whoever you still have to meet: a light over them, and their name at the edge of the screen when they are off it */
    const owed=(!MET.has(i)&&(MET.size>0||i>0))||(ask&&AH.heard), busy=TALK.p||CUT.on||FIN.on||GLN.t>=0;
    /* (only from a distance: right beside you the light is not needed, and from close up it would be a wall of white) */
    const bu=p.beam.material.uniforms.uK; bu.value=damp(bu.value,owed&&!busy&&d>8?1:0,3,dt); p.beam.visible=bu.value>.01;
    if(p.beam.visible){ p.beam.position.copy(p.dir).multiplyScalar(R+standH(p.x,p.z)+2.05); p.beam.quaternion.setFromUnitVectors(Y_UP,p.dir); }
    const off=V.z>1||Math.abs(V.x)>.9||Math.abs(V.y)>.84, ed=edges[i], showE=owed&&off&&!busy&&d>6; ed.classList.toggle('on',showE);
    if(showE){ let ex=V.z>1?-V.x:V.x, ey=V.z>1?-V.y:V.y; const m=Math.max(Math.abs(ex)/.82,Math.abs(ey)/.74,1e-3); ex/=m; ey/=m;
      ed.style.transform=`translate(${((ex*.5+.5)*innerWidth).toFixed(1)}px,${((-ey*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-50%)`; ed.style.setProperty('--a',Math.atan2(-ey,ex).toFixed(3)+'rad'); } });
  goBtn.hidden=!(allMet()&&AH.heard&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0&&!PHS.on);
  /* walk up to a landmark and it says what it is, and where to find it */
  /* a landmark's card: only once you are out and walking, never on the way over to someone, and only when you stop by
     it for a moment, so passing one on your way somewhere does not flash it up */
  { let near=null, bd=1; if(started&&!TALK.p&&!TALK.goal&&!CUT.on&&!FIN.on&&GLN.t<0&&!PHS.on) for(const id in INST){ if(MK[id]&&MK[id].st!=='on') continue; /* the café is always open, a landmark once it is built */ const q=INST[id], dq=Math.hypot(P.x-q.x,P.z-q.z)/q.r; if(dq<bd){ bd=dq; near=id; } }
    if(near!==PJ.want){ PJ.want=near; PJ.dw=0; } else PJ.dw+=dt;
    const best=near&&(near===PJ.id||PJ.dw>.5)?near:null;
    if(best!==PJ.id){ PJ.id=best; if(best){ const c=CARD[best]; PJ.n.textContent=c[0]; PJ.k.textContent=c[1]; PJ.t.textContent=c[2]; PJ.el.href=c[3]; PJ.l.textContent=c[4]; PJ.el.target=/^mailto:/.test(c[3])?'_self':'_blank'; }
      PJ.el.classList.toggle('on',!!best); PJ.el.setAttribute('aria-hidden',best?'false':'true'); PJ.el.tabIndex=best?0:-1; }
  }
  // talking: the words type out with a little voice
  if(TALK.p&&TALK.shown<TALK.txt.length){ TALK.acc+=dt*44; const n=Math.min(TALK.txt.length,Math.floor(TALK.acc)); if(n>TALK.shown){ if(Math.floor(n/2)>Math.floor(TALK.shown/2)&&TALK.txt[n-1]!==' ') A.voice(TALK.p.pitch); TALK.shown=n; say(n); if(n>=TALK.txt.length) tk.classList.remove('typing'); } }
  // things that move: the radar, the lighthouse, the voice inside Kríos, the birds
  if(AE){ AE.hd.matrix.copy(AE.M).multiply(Mf.makeRotationY(t*.8)); AE.hd.matrixWorldNeedsUpdate=true; }
  const quiet=TALK.p||CUT.on||FIN.on, near=q=>q?Math.hypot(P.x-q.x,P.z-q.z):99;
  /* Aetos: 0 to 6 s the drones loiter; 6 the threat is marked; 8 locked; 8.6 it falls; 11 another comes */
  if(AE&&AE.dr&&MK.ae.st==='on'){ const c0=AE.cyc%11; AE.cyc+=dt; const c=AE.cyc%11, d0=near(INST.ae);
    AE.dr.forEach((q,k)=>{ q.a+=q.w*dt; let h=q.h+Math.sin(t*1.3+k)*.12, sk=1;
      if(k===0){ if(c>8.6) h-=Math.pow(Math.min(1,(c-8.6)/1.3),2)*3.4; sk=c>9.9?0:c<.8?c/.8:1; }
      Mf2.copy(AE.B).multiply(Mf.makeTranslation(Math.cos(q.a)*q.r,h,Math.sin(q.a)*q.r)).multiply(Mr.makeRotationY(-q.a)).multiply(Mf.makeScale(sk||1e-3,sk||1e-3,sk||1e-3));
      q.g.matrix.copy(Mf2); q.g.matrixWorldNeedsUpdate=true; });
    const mk=c>6&&c<8.65; AE.ring.visible=mk; if(mk){ const s=c>8?1-.45*sstep(8,8.6,c):1+.08*Math.sin(t*9); AE.ring.matrix.copy(AE.dr[0].g.matrix).multiply(Mf.makeScale(s,s,s)); AE.ring.matrixWorldNeedsUpdate=true; }
    if(!quiet&&d0<15){ if(c0<6&&c>=6) A.ping(1175,.016*(1-d0/15)); if(c0<8&&c>=8) A.ping(1568,.024*(1-d0/15)); } }
  if(PH) steerUpdate(dt,t);
  /* Pharos: once round the lighthouse every fifteen seconds; over open water there is nothing to match, and it says so */
  if(PH&&PH.dr&&MK.ph.st==='on'){ PH.a+=dt*.42; const lx=Math.cos(PH.a)*3.3, lz=Math.sin(PH.a)*3.3;
    PH.dr.matrix.copy(PH.M).multiply(Mf.makeTranslation(lx,3.3+Math.sin(t*1.1)*.12,lz)).multiply(Mr.makeRotationY(-PH.a-Math.PI/2)); PH.dr.matrixWorldNeedsUpdate=true;
    const sea=isle(V.set(lx,0,lz).applyMatrix4(PH.M).normalize())<0;
    if(sea!==PH.over){ PH.over=sea; PH.dr.userData.light.material.uniforms.uC.value.setStyle(sea?'#ff9a3c':'#f5f3ea',T.LinearSRGBColorSpace); const d0=near(INST.ph);
      if(!quiet&&d0<15){ if(sea) A.ping(523,.014*(1-d0/15)); else A.chime(9,0,.03*(1-d0/15)); } } }
  /* Ogive: the hoop at the height asked for; every so often the engine is fired on the pad */
  if(OG&&MK.og.st==='on'){ OG.hoop.matrix.copy(OG.M).multiply(Mf.makeTranslation(0,5.3+Math.sin(t*.9)*.08,0)); OG.hoop.matrixWorldNeedsUpdate=true;
    OG.t+=dt; if(OG.t>14){ OG.t=0; const d0=near(INST.og);
      for(let k=0;k<12;k++){ const a=k/12*TAU+Math.random()*.3; V2.set(Math.cos(a)*.34,.22,Math.sin(a)*.34).applyMatrix4(OG.M); V3.set(Math.cos(a)*2,.5,Math.sin(a)*2).applyMatrix4(OG.M).sub(V2); puff(V2,V3,.16+Math.random()*.1,1.3); }
      if(!quiet&&d0<15) A.vent(0); } }
  if(BE) BE.lt.visible=(t/1.6)%1<.3;
  if(KR){ const u=(t/3.4)%2, w=u<1?sstep(.86,1,u):1-sstep(1.86,2,u); KRC.copy(KRY).lerp(KRT,w);   // you speak, then the buyer answers
    for(let k=0;k<28;k++){ const a=k/28*TAU, hh=.12+.32*Math.abs(Math.sin(a*3+t*4.2)*Math.sin(t*1.7+k*.4)); Qb.setFromAxisAngle(UPY,-a); Mf.compose(V.set(Math.cos(a)*.33,0,Math.sin(a)*.33),Qb,V2.set(1,hh,1)); KR.bars.setMatrixAt(k,Mf); KR.bars.setColorAt(k,KRC); }
    KR.bars.instanceMatrix.needsUpdate=true; KR.bars.instanceColor.needsUpdate=true;
    const who=w>.5?1:0; if(who!==KR.who&&Math.abs(w-.5)>.4){ KR.who=who; const d0=near(INST.kr); if(!quiet&&d0<9&&MK.kr.st==='on') A.phrase(who,.014*(1-d0/9)); } }
  BIRDS.forEach(b=>{ const a=b.ph+t*b.sp, sg=Math.sign(b.sp), x=b.c[0]+Math.cos(a)*b.r, z=b.c[1]+Math.sin(a)*b.r; at(x,z,BU); tang(BU,at(x-Math.sin(a)*sg,z+Math.cos(a)*sg,V),V2); standOn(b.g,BU,V2,b.h);
    const fl=Math.sin(t*9+b.ph)*.5; b.wl.rotation.z=fl; b.wr.rotation.z=-fl; });
  // sound: the music and birds now and then
  A.music(FIN.on?FIN.mus:CUT.on?(CUT.t>T_HOV-.6?.55*sstep(T_HOV-.6,T_LAND+.9,CUT.t):0):.55);   /* the town's music is up before the roar dies away */ skyUpdate(dt,t); birdT-=dt; if(birdT<=0){ birdT=1.2+Math.random()*3.5; if(!(FIN.on&&FIN.shut)){ if(SKY.night>.5) A.cricket((Math.random()-.5)*1.6); else if(WX.rain<.3) A.chirp((Math.random()-.5)*1.6); } }   /* crickets at night, no birds in the rain */
  A.hiss(0); A.wind(0);   // (no sea hiss and no wind on Earth: they were the static under the town)
};
st._dbg={steer:{PHS,set:steerSet,step(sec){ for(let i=0;i<sec*10;i++) steerUpdate(.1,G.uTime.value+i*.1); }},sky:{set(o){ if(o.time) SKYSET.time=o.time; if(o.date) SKYSET.date=o.date; skyClock(); if(o.weather){ SKYSET.weather=o.weather; skyWeather(); } if(o.wxT!=null) WX.t=o.wxT; skyApply(); },
    step(sec){ for(let i=0;i<sec*10;i++) skyUpdate(.1,G.uTime.value+i*.1); },   // the tests run the weather and the lamps on without waiting for slow frames
    get state(){ return {h:+SKY.h.toFixed(2),md:SKY.md,e:+SKY.e.toFixed(1),night:+SKY.night.toFixed(2),dusk:+SKY.dusk.toFixed(2),kind:WX.kind,rain:+WX.rain.toFixed(2),fog:+WX.fog.toFixed(2),bow:+WX.bow.toFixed(2),
      season:+LU.uSeason.value.toFixed(2),snow:LU.uSnow.value,lamps:LAMPS.map(l=>+l.k.toFixed(2)),fx:{fall:!!(FALL&&FALL.visible),flies:!!FLIES,xmas:!!XMAS,pumpkins:PUMPS.length}}; },WX,SKY,LAMPS,get FALL(){ return FALL; }},
  began,get started(){ return started; },RK,DOOR:()=>[DOOR_SHUT,DOOR_OPEN],LU,MK,seen,linesFor,MET,AH,GLN,FIN,startFinale,goTalk,talkTo,navPath,NAV,pickPerson,INST,PJ,marksEnter,openInvite,cut:()=>CUT,skipCut,place:()=>placeAtStart(),player,get people(){return people;},cam:C,OBS,at,loc,openTalk,closeTalk,nextTalk,talk:()=>TALK,get started(){return started;},head:i=>people[i].dir.clone().multiplyScalar(R+standH(people[i].x,people[i].z)+1.05)};
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
      float pk(float c,float y){ return c<0.?0.:exp(-(((y-c)*11.)*((y-c)*11.))); }
      void main(){ float y=aY; float b=.2+.26*y+.14*exp(-(((y-fract(uTime*.2))*7.)*((y-fract(uTime*.2))*7.)));
        b+=(pk(uPulse.x,y)+pk(uPulse.y,y)+pk(uPulse.z,y)+pk(uPulse.w,y))*1.3;
        b=b*(.75+.6*uE)+uFire*(.6+1.6*exp(-(((y-fract(uTime*1.6))*5.)*((y-fract(uTime*1.6))*5.))));
        vB=b*aK*smoothstep(-.02,.08,y); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uC; uniform float uOp; varying float vB; void main(){ gl_FragColor=vec4(uC*vB*uOp,1.); }`}));
  tower.frustumCulled=false; sc.add(tower);
  // the lamp
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0],3)); lg.setAttribute('aR',new T.Float32BufferAttribute([0,.5,.5,0, 1,.5,.5,0],4));
  sc.add(pts(lg,PM({size:.5,color:'#FF8100',uniforms:u,decl:'uniform vec3 uLamp; uniform float uE,uFire,uH;',body:`p=uLamp; float bl=.55+.45*((.5+.5*sin(uTime*2.2))*(.5+.5*sin(uTime*2.2))*(.5+.5*sin(uTime*2.2)));
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
      float pk=exp(-(((t-(uTime-uFireT)*.9))*((t-(uTime-uFireT)*.9)))*260.)*step(0.,uTime-uFireT)*step(uTime-uFireT,1.4);
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
/* compile a scene's shaders without freezing the page, where the browser can do it in the background; never wait forever */
async function compileQuiet(sc,cam){ try{ if(renderer.compileAsync) await Promise.race([renderer.compileAsync(sc,cam),wait(8000)]); else renderer.compile(sc,cam); }catch(e){} }
async function boot(){
  const mark=$('#mark'), bootEl=$('#boot'), txt={set textContent(v){ bootEl.textContent=v; }}; // the mark's weight is the progress bar; one quiet line says what is being built
  mark.textContent=''; [...'Heloria'].forEach(ch=>{ const c=document.createElement('span'); c.className='c'; c.textContent=ch; mark.appendChild(c); });
  const setP=v=>{ mark.style.fontWeight=Math.round(100+700*v); };
  setP(0); try{ await Promise.race([document.fonts.ready,wait(2500)]); }catch(e){}
  resize();
  txt.textContent='Tracing geodesics'; await nextFrame();
  try{ BH.makeSky(); }catch(e){ console.warn('sky',e); } BH.render(hubCam); renderer.setRenderTarget(null); setP(.1);
  const steps=STA.map(s=>[s.name,s.id]).concat([['Earth','cr']]).filter(x=>ST[x[1]]); // Earth is not in orbit but is built with the rest
  for(let i=0;i<steps.length;i++){ txt.textContent='Building '+steps[i][0]; await nextFrame(); try{ await ST[steps[i][1]].build(); }catch(err){ console.error('build '+steps[i][1],err); delete ST[steps[i][1]]; } setP(.1+.5*(i+1)/steps.length); }
  txt.textContent='Compiling shaders'; await nextFrame();
  universeVisible(1); U.belt.visible=true; U.probe.visible=U.trail.visible=U.dust.visible=U.streak.visible=true;
  await compileQuiet(U.scene,hubCam); renderer.setRenderTarget(rtA); renderer.render(U.scene,hubCam);
  universeVisible(0); U.probe.visible=U.trail.visible=U.dust.visible=U.streak.visible=false; setP(.7);
  /* every station is drawn once now, so nothing stalls the first time you see it: its shaders compiled (in the background
     where the browser can) and its textures sent, into a small target of the same kind, so the warming never holds a
     full screen's worth of memory for a station you are not in */
  const warm=mkRT(); warm.setSize(64,64);
  for(const [nm,id] of steps){ const st=ST[id]; if(!st) continue; txt.textContent='Warming '+nm; await nextFrame(); await compileQuiet(st.scene,stCam);
    st.enter(); st.update(.016,0); stCam.position.copy(st.camP); stCam.lookAt(st.camL); setPx(stCam);
    try{ renderer.compile(st.scene,stCam); }catch(e){} if(st.render){ try{ st.render(warm); }catch(e){ console.error('render '+id,e); } } else { renderer.setRenderTarget(warm); renderer.render(st.scene,stCam); } st.exit(); setP(.7+.3*(steps.findIndex(s=>s[1]===id)+1)/steps.length); }
  warm.dispose(); renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  setP(1); $('#load').classList.add('ready'); S.ready=true; setTimeout(()=>{ bootEl.textContent=''; },700);   // the build line fades, then goes
}

/* ---------- three ways in, chosen at the front door: the whole story (Fly), straight down to Earth (#land), or into
   orbit at Aetos, where the rocket at the end of the walk goes (#aetos). Land opens in its own daylight, the colour the
   front door left you in ---------- */
S.entry=({'#land':'land','#aetos':'aetos'})[location.hash]||""||'fly';   // the build fills in a preview's own way in
if(S.entry==='land') document.documentElement.classList.add('landing');
/* on the site the address says where you are: /land, or /fly (the rocket from the walk goes to /fly too). The page itself
   lives at untamed/, so its own address is kept to come back to; reloading /land or /fly goes to the front door */
const PAGE_URL=location.pathname, PRETTY=true&&/^\/untamed\/(index\.html)?$/.test(PAGE_URL);   // only where the site is the whole domain
if(PRETTY){ try{ history.replaceState(null,'','/'+(S.entry==='land'?'land':'fly')); }catch(e){} }

/* ---------- enter: the word falls into the hole ---------- */
const entry={t:-1,from:mkPose()};
function enter(){
  if(!S.ready||S.mode!=='load') return; A.start();
  const mark=$('#mark'), mr=mark.getBoundingClientRect(), cx=innerWidth/2, cy=innerHeight/2;
  $$('.c',mark).forEach(c=>{ const r=c.getBoundingClientRect(); c.style.setProperty('--tx',(cx-(r.left+r.width/2))+'px'); c.style.setProperty('--ty',(cy-(r.top+r.height/2))+'px'); c.style.transitionDelay=(Math.random()*.25).toFixed(2)+'s'; });
  $('#load').classList.add('go');
  // Land: the word lifts away like cloud, and the rocket is already coming down through the sky behind it
  if(S.entry==='land'){ S.mode='landing'; A.whoosh(false,2.2,.16); if(ST.cr) ST.cr.land=true;
    setTimeout(()=>{ show('#chrome',true); enterEarth(); S.flash=.5; },650); setTimeout(()=>show('#load',false),800); return; }
  A.swell(); S.mode='entering'; entry.t=0; hubCam.position.set(0,.4,90); hubCam.lookAt(0,0,0); hubCam.fov=30; hubCam.updateProjectionMatrix();
  entry.from.p.copy(hubCam.position); entry.from.q.copy(hubCam.quaternion); entry.from.fov=30;
  // from the walk's rocket: no story, the radar at Aetos already has you
  if(S.entry==='aetos'){ setTimeout(()=>{ show('#load',false); show('#chrome',true); },900);
    setTimeout(()=>{ if(S.mode!=='entering') return; A.launch(); S.flash=.5; feedback(.8,1.2); S.mode='story'; toHub(true); },1500); return; }
  setTimeout(()=>{ A.boom(); S.flash=.6; feedback(.6,1.2); },1150);
  setTimeout(()=>{ show('#load',false); show('#chrome',true); },900);
}
/* the way in: a scroll or a swipe (a click, a tap or a key do it too). Coming from the front door you have already clicked,
   and the browser lets the sound start on the scroll. The scroll that begins it is let finish before anything else on the
   page listens to the wheel, so a trackpad's long glide does not run on into the story or the zoom */
$('#beginT').textContent=(FINE?'Scroll':'Swipe')+({land:' to land',aetos:' to go into orbit'}[S.entry]||' to begin');
{ let wheelT=0, t0=0; addEventListener('wheel',e=>{ const now=performance.now(); if(S.wheelSettle&&now-wheelT>260&&now-t0>2600) S.wheelSettle=false; wheelT=now;
    if(S.mode!=='load'||!S.ready||Math.abs(e.deltaY)<4) return; S.wheelSettle=true; t0=now; enter(); },{passive:true,capture:true}); }
{ let y0=null; addEventListener('touchstart',e=>{ if(S.mode==='load') y0=e.touches[0].clientY; },{passive:true});
  addEventListener('touchend',e=>{ if(S.mode!=='load'||!S.ready||y0===null) return; const dy=y0-(e.changedTouches[0]?.clientY??y0); y0=null; if(dy>20||Math.abs(dy)<8) enter(); },{passive:true}); }
$('#load').addEventListener('click',()=>{ if(S.mode==='load'&&S.ready) enter(); });
addEventListener('keydown',e=>{ if(S.mode==='load'&&S.ready&&['Enter','Space','ArrowDown','PageDown'].includes(e.code)){ e.preventDefault(); enter(); } });

/* ---------- into orbit. Out of the story, Aetos's radar has you, a way off across the system: you fire the thruster and
   fly in to it yourself, and flying into it docks you ---------- */
function spawnProbe(r=10.5,a=2.6){ const P=S.probe; P.p.set(Math.cos(a)*r,0,Math.sin(a)*r); const vc=Math.sqrt(GM/r); P.v.set(-Math.sin(a)*vc,0,Math.cos(a)*vc); P.head=Math.atan2(-P.v.x,-P.v.z); S.yaw=Math.atan2(P.p.x,P.p.z);
  for(let i=0;i<TRL;i++){ U.trailPos[i*3]=P.p.x;U.trailPos[i*3+1]=0;U.trailPos[i*3+2]=P.p.z; } U.trailG.attributes.position.needsUpdate=true; U.probe.position.copy(P.p); }
function toHub(lead){
  if(S.mode!=='story'&&S.mode!=='beyond') return;
  S.mode='tohub'; S.hubT=0; A.whoosh(true,1.8,.2); cine(true);
  const ae=lead&&ST.ae&&STA.find(s=>s.id==='ae');
  if(ae){ updateStations(S.t); spawnProbe(16,ae.a-.85); S.lead={s:ae,t:0}; S.ap=null;   // out past the belt, a dozen units short of Aetos
    const dx=ae.pos.x-S.probe.p.x, dz=ae.pos.z-S.probe.p.z, l=Math.hypot(dx,dz)||1; S.yaw=Math.atan2(-dx/l,-dz/l);
    STA.forEach(s=>{ s.wake=s.wakeT=s===ae?1:0; stationWake(s,s.wake); }); }   // only Aetos is awake on the way in
  else spawnProbe();
  fromP.p.copy(hubCam.position); fromP.q.copy(hubCam.quaternion); fromP.fov=hubCam.fov;
  U.probe.visible=U.trail.visible=U.dust.visible=U.streak.visible=true; A.whine(0);
}

/* ---------- horizon ---------- */
function crossHorizon(){ if(S.mode!=='hub') return; S.mode='falling'; S.fallT=0; S.ap=null; S.been=true; S.push=false; guide('off'); show('#hub',false); cine(true); $('#warn').classList.remove('on'); A.tapeStop(2.2); A.hush(); callOff(); }
/* past the horizon: Earth. The fall ends in white, and the white opens on the rocket coming down through the clouds */
function enterEarth(){ const st=ST.cr; if(!st){ S.mode='story'; post.uniforms.uStretch.value=0; U.probe.visible=U.trail.visible=true; toHub(); return; }
  S.mode='station'; S.stId='cr'; S.st=st; S.iris=3; S.arrive=0; S.stSnap=true; S.flash=1; post.uniforms.uStretch.value=0; post.uniforms.uIrisCol.value.set('#FFC392'); cine(false);
  st.enter(); if(st.cutscene) st.cutscene(); show('#station',true); st.showUI(); where('Earth'); }
/* and back: a flash of white, and you are in orbit again */
function leaveEarth(){ const st=ST.cr; if(S.stId!=='cr'||!st) return; st.abort(); st.hideUI(); A.hush(); A.whoosh(false,1.3); S.flash=1;
  show('#station',false); st.el.classList.remove('on'); st.exit(); S.st=null; S.stId=null; S.iris=0; S.mode='story'; U.probe.visible=U.trail.visible=true; const lead=!S.docked.has('ae'); toHub(lead); if(!lead) toast('Back in orbit'); }

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
    if(entry.t>2.3&&!entry.rev&&S.entry==='fly'){ entry.rev=true; show('#story',true); reveal(story.blocks[0]); }
    if(entry.t>=3.4){ S.mode='story'; S.ch=0; story.k=1; story.from.p.copy(hubCam.position); story.from.q.copy(hubCam.quaternion); story.from.fov=hubCam.fov; }
  }
  else if(S.mode==='story'){ storyUpdate(rdt,t); }
  else if(S.mode==='tohub'){
    S.hubT+=rdt; const k=E.io(clamp(S.hubT/2.6,0,1)); hubPhysics(dt); chasePose(chase);
    hubCam.position.lerpVectors(fromP.p,chase.p,k); hubCam.quaternion.slerpQuaternions(fromP.q,chase.q,k); hubCam.fov=lerp(fromP.fov,36,k); hubCam.updateProjectionMatrix();
    hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion); S.sysVis=damp(S.sysVis||0,1,3,rdt); universeVisible(S.sysVis);
    post.uniforms.uWarp.value=RM?0:(1-sstep(0,.9,S.hubT))*.7; post.uniforms.uIC.value.set(.5,.5);
    if(S.hubT>1.3&&!S.hudOn){ S.hudOn=true; show('#hub',true); cine(false); updateQuest(); where('Orbit');
      if(S.lead){ guide('lead'); _cr.setFromMatrixColumn(hubCam.matrixWorld,0); _cp.copy(S.lead.s.pos).sub(S.probe.p); _cp.y=0; A.lock(clamp(_cp.dot(_cr)/Math.max(_cp.length(),.5)*1.3,-1,1),.05); } }
    if(S.hubT>=2.6&&S.mode==='tohub'){ S.mode='hub'; S.hudOn=false; post.uniforms.uWarp.value=0; }
    wakeUpdate(rdt); labelsUpdate();
  }
  else if(S.mode==='hub'){
    hubPhysics(dt); if(S.mode==='hub'){ holeCall(dt); sealUpdate(dt); } wakeUpdate(dt);
    if(S.mode==='hub'){ chasePose(chase); hubBase.p.lerp(chase.p,1-Math.exp(-5*dt)); hubBase.q.slerp(chase.q,1-Math.exp(-6*dt));
      hubCam.position.copy(hubBase.p); hubCam.quaternion.copy(hubBase.q);
      const P=S.probe, sp=P.v.length(), turn=angDiff(P.head,S.lastHead??P.head)/Math.max(dt,1e-3), yr=(S.yaw-(S.lastYaw??S.yaw))/Math.max(dt,1e-3); S.lastHead=P.head; S.lastYaw=S.yaw;
      if(!RM){ S.bank=damp(S.bank||0,clamp(-turn*.05-yr*.035,-.15,.15),2.2,dt); hubCam.rotateZ(S.bank); }
      hubCam.fov=damp(hubCam.fov,36+(RM?0:sstep(1.5,12,sp)*6.5),1.8,dt); hubCam.updateProjectionMatrix();
      // when nobody is flying, the camera takes a slow walk around the probe
      S.idle=(keys.size||drag||S.ap)?0:(S.idle||0)+dt; if(S.idle>6&&!RM) S.yaw+=dt*.03*sstep(6,10,S.idle);
      labelsUpdate(); if((radarK++&1)===0) radarDraw(); presenceTick(); }
    universeVisible(1);
  }
  else if(S.mode==='credits'){ requestAnimationFrame(frame); return; }   // the white page: nothing left to draw
  else if(S.mode==='docking'){ dockUpdate(rdt); }
  else if(S.mode==='undocking'){ undockUpdate(rdt,dt); wakeUpdate(dt); if(S.mode==='hub'||(TR&&TR.t>1.1)){ labelsUpdate(); radarDraw(); } }
  else if(S.mode==='falling'){
    S.fallT+=rdt; const k=Math.min(1,S.fallT/2.6); post.uniforms.uStretch.value=k*(RM?.2:1); A.whine(k*(1-sstep(.8,1,k))); A.update(t,{pad:0,sub:.7*(1-k)}); // the orbit's score does not follow you in
    const P=S.probe; P.p.multiplyScalar(1-dt*1.1); U.probe.position.copy(P.p);
    hubCam.position.lerp(tv[2].set(P.p.x*1.4,.8,P.p.z*1.4+.01),dt*2); hubCam.lookAt(0,0,0); hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion);
    const c=tv[3].set(0,0,0).project(hubCam); post.uniforms.uSC.value.set(c.x*.5+.5,c.y*.5+.5);
    S.flash=Math.max(S.flash,sstep(.75,1,k));
    if(k>=1){ A.hush(); A.update(t,{pad:0,sub:0}); U.probe.visible=U.trail.visible=false; enterEarth(); }
  }
  // camera shake, flashes, grade
  if(S.shake>0&&!RM){ const a=S.shake*S.shake*.25; if(S.iris<2.5&&S.mode!=='station'){ hubCam.position.add(tv[4].set((Math.random()-.5)*a,(Math.random()-.5)*a,(Math.random()-.5)*a)); } }
  S.shake=Math.max(0,S.shake-rdt*1.8); S.ca=damp(S.ca,0,5,rdt);
  post.uniforms.uTint.value.multiplyScalar(Math.exp(-4*rdt));
  S.flash=Math.max(S.flashMin||0,S.flash-rdt*1.2); post.uniforms.uFlash.value=S.flash;
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
    if((S.mode==='station'||S.mode==='docking')&&!S.fin) A.update(t,{sub:0,pad:S.stId==='cr'?0:.3,bright:.12}); // inside a station the orbit's score is a faint, muffled thing under the station's own air
  }
  A.bed((S.mode==='station'||S.mode==='docking')&&S.stId&&!(S.stId==='cr'&&S.fin)?S.stId:null,t);   // Earth's breeze goes for the last flight
  // render: trace the hole, draw the system over it, then the station world, then composite
  { const tn=performance.now()/1000; rtLive(rtA,needA,tn,RTS); rtLive(rtB,needB,tn,S.st&&S.st.render?0:RTS); bhLive(needA,tn); }
  if(needA&&S.mode!=='load'){ BH.render(hubCam); setPx(hubCam); renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(U.scene,hubCam); }
  if(needB){ setPx(stCam); if(S.st.render) S.st.render(rtB); else { renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(S.st.scene,stCam); } } // a station may draw itself (Earth inks its own lines)
  post.uniforms.uIris.value=S.st?S.iris:0;
  renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  requestAnimationFrame(frame);
}
hubCam.position.set(0,.4,90); hubCam.lookAt(0,0,0);
requestAnimationFrame(frame);
boot();
/* test helper: straight into a station with no transitions */
function jump(id){
  const s=STA.find(x=>x.id===id), st=ST[id]; if(!st||!S.ready) return false;
  ['#load','#story','#hub'].forEach(q=>show(q,false)); show('#chrome',true); A.start();
  if(S.st&&S.st!==st){ S.st.abort(); S.st.exit(); S.st.el.classList.remove('on'); }
  S.mode='station'; S.stId=id; S.st=st; S.iris=3; S.arrive=0; S.stSnap=true; S.docked.add(id);
  post.uniforms.uIrisCol.value.set(s?s.color:'#FFC392'); st.enter(); show('#station',true); st.showUI(); where(s?s.name:'Earth'); return true;
}
window.__heloria={A,SB,finaleWhite,credits,jump,enterEarth,leaveEarth,crossHorizon,storyUnlock:()=>{ story.busy=0; },S,ST,U,STA,post,BH,renderer,stCam,hubCam,rtA,rtB,postScene,ortho,dock:id=>dock(STA.find(x=>x.id===id)),toHub,undock,goChapter,escape};

})();

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
  let ctx=null,out,comp,rev,revIn,on=false,muted=false; const n={};
  const LITE=matchMedia('(pointer: coarse)').matches||Math.min(screen.width,screen.height)<700;
  /* phones: the sound and a heavy 3D scene share a small processor. When the audio can no longer keep up, some phones stop
     sending it to the speaker while the page carries on as if it were playing, and iOS can hand the speaker to something
     else. So: lighter work on a phone (LITE), the playback audio session on iOS, and a watchdog once a second that wakes
     the context if it was put to sleep and restarts it if its clock has stopped moving */
  /* and if waking it does not work (a clock still stopped after a restart, or a context that will not come back even on a
     tap) the whole sound is built again on a fresh context: everything in it is made from n, so nothing is lost */
  let wdT=-1, wdC=-1, wdBad=0, downAt=0;
  function rebuild(){ const old=ctx; if(!old) return; if(n.musClock) clearInterval(n.musClock); for(const k in n) delete n[k];
    ctx=null; init(); try{ old.close(); }catch(e){} set(out.gain,muted?0:LOUD,.4); ctx.resume().catch(()=>{}); wdT=-1; wdBad=0; downAt=0; }
  function watch(){ if(!ctx||!on||document.hidden){ wdT=-1; return; }
    const now=performance.now();
    if(ctx.state!=='running'){ if(!downAt) downAt=now; ctx.resume().catch(()=>{}); wdT=-1; return; }
    downAt=0; const c=ctx.currentTime;
    if(wdT>0&&now-wdT>900&&c===wdC){ if(++wdBad>=2){ rebuild(); return; } ctx.suspend().then(()=>ctx.resume()).catch(()=>{}); }
    else if(c!==wdC) wdBad=0;
    wdT=now; wdC=c; }
  setInterval(watch,1000);
  document.addEventListener('visibilitychange',()=>{ wdT=-1; if(!document.hidden&&ctx&&on&&ctx.state!=='running') ctx.resume().catch(()=>{}); });
  ['touchend','pointerup','click','keydown'].forEach(ev=>addEventListener(ev,()=>{ if(!ctx||!on||ctx.state==='running') return;
    if(downAt&&performance.now()-downAt>2500) rebuild(); else ctx.resume().catch(()=>{}); },{capture:true,passive:true}));
  const CH=[[73.42,146.83,220,329.63,440],[65.41,130.81,196,293.66,392],[58.27,116.54,174.61,261.63,349.23],[55,110,164.81,246.94,329.63]];
  function init(){
    if(ctx) return;
    { const AC=window.AudioContext||window.webkitAudioContext; try{ ctx=LITE?new AC({latencyHint:'playback'}):new AC(); }catch(e){ ctx=new AC(); } }   // a phone gets a deeper buffer: a busy frame can never starve the speaker
    try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}   // iOS: play like media, through the silent switch and other apps
    /* what leaves for the speakers: nothing below 40 Hz (a phone or laptop cannot play it, only strain at it), and never a
       hard clip, so sounds piling up never reach the point where small speakers distort */
    out=ctx.createGain(); out.gain.value=0;
    { const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=40; hp.Q.value=.6;
      /* a soft clip in place of a limiter: below 0.7 it lets the sound through untouched, above it rounds the peaks off
         smoothly towards full scale. (The browser's compressor would add its own make-up gain to everything) */
      const cv=new Float32Array(2049); for(let i=0;i<cv.length;i++){ const x=i/1024-1, a=Math.abs(x); cv[i]=a<=.7?x:Math.sign(x)*(.7+.28*Math.tanh((a-.7)/.28)); }
      const lim=ctx.createWaveShaper(); lim.curve=cv; lim.oversample=LITE?'none':'2x';
      out.connect(hp); hp.connect(lim); lim.connect(ctx.destination); }
    comp=ctx.createDynamicsCompressor(); comp.threshold.value=-20; comp.ratio.value=3; comp.connect(out);
    rev=ctx.createConvolver(); const L=Math.floor(ctx.sampleRate*(LITE?1.6:3.2)), ir=ctx.createBuffer(2,L,ctx.sampleRate);   // a shorter room on a phone: half the work
    for(let c=0;c<2;c++){const d=ir.getChannelData(c); for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.6);}
    rev.buffer=ir; const rg=ctx.createGain(); rg.gain.value=.65; rev.connect(rg); rg.connect(comp); revIn=ctx.createGain(); revIn.connect(rev);
    // pad: five detuned voices per chord tone through a breathing low-pass
    n.padF=ctx.createBiquadFilter(); n.padF.type='lowpass'; n.padF.frequency.value=520; n.padF.Q.value=.7;
    n.padG=ctx.createGain(); n.padG.gain.value=.05; n.padF.connect(n.padG); n.padG.connect(comp); n.padG.connect(revIn);
    n.voices=CH[0].map((f,i)=>{ const os=[-6,5].map(dt=>{ const o=ctx.createOscillator(); o.type=i<1?'sine':'sawtooth'; o.frequency.value=f; o.detune.value=dt; o._dt=dt; const g=ctx.createGain(); g.gain.value=i<1?.9:.22/(1+i*.3); o.connect(g); g.connect(n.padF); o.start(); return o; }); return os; });
    const lfo=ctx.createOscillator(); lfo.frequency.value=.07; const lg=ctx.createGain(); lg.gain.value=220; lfo.connect(lg); lg.connect(n.padF.frequency); lfo.start();
    n.chord=0; n.nextChord=ctx.currentTime+9;
    // sub: the hole itself
    n.sub=ctx.createOscillator(); n.sub.type='sine'; n.sub.frequency.value=34; n.subG=ctx.createGain(); n.subG.gain.value=0; n.sub.connect(n.subG); n.subG.connect(comp); n.sub.start();
    /* the noise everything is made of: one long stretch, nine seconds. Every layer reads it at its own speed and from its own
       place, so no two layers are ever copies of each other (copies a moment apart cancel and reinforce: that is phasing)
       and none of them comes round again on a loop short enough to hear */
    const buf=ctx.createBuffer(1,ctx.sampleRate*9,ctx.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; n.buf=buf;
    const RATES=[.83,1.17,.94,1.29,.71,1.06], nsrc=k=>{ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; s.playbackRate.value=RATES[k]; s.start(0,Math.random()*8); return s; };
    let nk=0; const mk=(type,f,q)=>{const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q||.7; const g=ctx.createGain(); g.gain.value=0; nsrc(nk++).connect(b); b.connect(g); g.connect(comp); return {b,g};};
    n.wind=mk('bandpass',700,.8); n.thrust=mk('bandpass',240,1.1); n.roar=mk('lowpass',380,.9); n.hiss=mk('highpass',3000,.5);
    n.ten=ctx.createOscillator(); n.ten.type='sawtooth'; n.ten.frequency.value=40; const tf=ctx.createBiquadFilter(); tf.type='lowpass'; tf.frequency.value=700; n.teng=ctx.createGain(); n.teng.gain.value=0; n.ten.connect(tf); tf.connect(n.teng); n.teng.connect(comp); n.ten.start();
    // each station's own air, under its screen: a bed of filtered noise and a low hum, shaped per station by A.bed
    { const s=nsrc(5); n.bedF=ctx.createBiquadFilter(); n.bedF.type='bandpass'; n.bedF.Q.value=.8; n.bedF.frequency.value=600;
      n.bedG=ctx.createGain(); n.bedG.gain.value=0; s.connect(n.bedF); n.bedF.connect(n.bedG); n.bedG.connect(comp); const bs=ctx.createGain(); bs.gain.value=.35; n.bedG.connect(bs); bs.connect(revIn); n.bedS=bs;
      n.hum=ctx.createOscillator(); n.hum.type='triangle'; n.hum.frequency.value=55; const hf=ctx.createBiquadFilter(); hf.type='lowpass'; hf.frequency.value=420;
      n.humG=ctx.createGain(); n.humG.gain.value=0; n.hum.connect(hf); hf.connect(n.humG); n.humG.connect(comp); n.hum.start(); n.bedT=0; }
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
  const BEDS={kr:{f:700,q:.7,g:.21,hz:98,h:.012,wob:.22},ae:{f:340,q:.6,g:.22,hz:49,h:.03,ping:2.6,pf:1568},ph:{f:420,q:.45,g:.3,hz:55,h:0,sea:1},
    og:{f:1900,q:.9,g:.07,hz:41,h:.045},be:{f:3400,q:.5,g:.04,hz:880,h:.02,wob:.06},
    cr:{f:560,q:.6,g:.06,hz:55,h:0,type:'lowpass',send:0}};   /* Earth: a soft, low breeze under the town's music, so the gaps between its notes are never
       empty; no hiss on top and no echo of it (noise mixed with its own echo is what sounds phasey) */
  /* the town's key on Earth: C major pentatonic. inKey snaps a pitch to its nearest note there */
  const PENT_C=[0,2,4,7,9], inKey=f=>{ const m=69+12*Math.log2(f/440), o=Math.floor(m/12)*12; let best=m, bd=99;
    for(const k of [-12,0,12]) for(const pc of PENT_C){ const c=o+k+pc; if(Math.abs(c-m)<bd){ bd=Math.abs(c-m); best=c; } } return 440*Math.pow(2,(best-69)/12); };
  const PEN=[0,2,3,7,9]; // D dorian-ish pentatonic
  /* the untamed plays at the walk's level, and a sound you hear again and again is never quite the same twice */
  const LOUD=.5, vr=(k=.04)=>1+(Math.random()*2-1)*k;
  const note=i=>146.83*Math.pow(2,(PEN[((i%5)+5)%5]+12*Math.floor(i/5))/12);
  return {
    get on(){return on&&!muted}, get ctx(){return ctx}, _rebuild:rebuild,
    async start(){ try{ init(); on=true; await ctx.resume(); set(out.gain,muted?0:LOUD,.6); }catch(e){ on=false; } sndUI(); },
    toggle(){ muted=!muted; if(ctx) set(out.gain,muted?0:LOUD,.3); sndUI(); },
    get muted(){return muted},
    _lv(){ if(!ctx) return null; const r=x=>+x.value.toFixed(4); return {pad:r(n.padG.gain),sub:r(n.subG.gain),wind:r(n.wind.g.gain),thrust:r(n.thrust.g.gain),roar:r(n.roar.g.gain),hiss:r(n.hiss.g.gain),whine:r(n.teng.gain),beacons:n.beacons?n.beacons.map(b=>r(b.lvl.gain)):null,pans:n.beacons?n.beacons.map(b=>b.pan?r(b.pan.pan):0):null,mus:n.mus?r(n.mus.gain):0,bed:n.bedG?r(n.bedG.gain):0,hum:n.humG?r(n.humG.gain):0,cb:n.cb?r(n.cb.lvl.gain):0}; }, // test hook: current levels
    update(t,p){ // p: {sub, wind, pad}
      if(!ctx) return;
      if(ctx.currentTime>n.nextChord){ n.chord=(n.chord+1)%CH.length; n.nextChord=ctx.currentTime+10+Math.random()*4; CH[n.chord].forEach((f,i)=>n.voices[i].forEach(o=>o.frequency.setTargetAtTime(f,ctx.currentTime,2.2))); }
      if(p){ if(p.sub!=null) set(n.subG.gain,p.sub*.26,.4); if(p.pad!=null) set(n.padG.gain,p.pad*.045,.8);   /* (orbit was the loudest steady part: a little under it now) */ if(p.bright!=null) set(n.padF.frequency,(380+p.bright*900)*(n.muf?.42:1),n.muf?.08:.6); }
    },
    tick(){ tone(2600*vr(),.02,.01,'square'); },
    click(){ const v=vr(); tone(1200*v,.06,.03,'triangle',600*v); },
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
    /* a station's own air under its screen, so docking never drops you into silence: Kríos a low murmur of voices in a
       room, Aetos the hum of its radar and a slow sweep, Pharos the sea against the rocks, Ogive a hangar's hum and the hiss
       of a vent, Beacon the static and the carrier of a radio mast. id null: the air goes */
    bed(id,t){ if(!ctx) return; const B=BEDS[id];
      if(B){ const ty=B.type||'bandpass'; if(n.bedF.type!==ty) n.bedF.type=ty; set(n.bedS.gain,B.send??.35,.6);
        set(n.bedF.frequency,B.f*(1+(B.wob||0)*Math.sin(t*.17)),.6); set(n.bedF.Q,B.q,.6); set(n.hum.frequency,B.hz,.8); }
      const sw=B&&B.sea?.55+.45*Math.sin(t*.42)*Math.sin(t*.13+1):1;
      set(n.bedG.gain,B?B.g*sw:0,B?.9:.5); set(n.humG.gain,B?B.h:0,B?.9:.5);
      if(B&&B.ping&&on&&!muted&&t>n.bedT){ n.bedT=t+B.ping; tone(B.pf,.5,.01,'sine',B.pf*.92,0,.6); } },
    muffle(v){ n.muf=!!v; },
    hush(){ if(!ctx) return; set(n.wind.g.gain,0,.15); set(n.thrust.g.gain,0,.1); set(n.roar.g.gain,0,.1); set(n.hiss.g.gain,0,.1); set(n.teng.gain,0,.2); if(n.cb) set(n.cb.lvl.gain,0,.2); if(n.beacons) n.beacons.forEach(b=>set(b.lvl.gain,0,.2)); if(n.mus) set(n.mus.gain,0,.3); if(n.bedG){ set(n.bedG.gain,0,.3); set(n.humG.gain,0,.3); } },
    /* station beacons: a soft glass tone per station in the score's key, each with its own slow pulse,
       louder as you approach and panned to where the station is */
    beacons(notes){ if(!ctx||n.beacons) return;
      n.beacons=notes.map((ni,k)=>{ const f=note(ni), o=ctx.createOscillator(), o2=ctx.createOscillator(), g2=ctx.createGain(), trem=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain(), lvl=ctx.createGain();
        o.type='sine'; o.frequency.value=f; o2.type='sine'; o2.frequency.value=f*2.003; g2.gain.value=.16; o2.connect(g2);
        trem.gain.value=.55; lfo.frequency.value=.28+k*.11; lg.gain.value=.45; lfo.connect(lg); lg.connect(trem.gain);
        o.connect(trem); g2.connect(trem); lvl.gain.value=0; trem.connect(lvl);
        let pan=null; if(ctx.createStereoPanner){ pan=ctx.createStereoPanner(); lvl.connect(pan); pan.connect(comp); const sg=ctx.createGain(); sg.gain.value=.6; pan.connect(sg); sg.connect(revIn); } else lvl.connect(comp);
        o.start(); o2.start(); lfo.start(); return {lvl,pan}; }); },
    beacon(i,g,p){ if(!ctx||!n.beacons||!n.beacons[i]) return; const b=n.beacons[i]; set(b.lvl.gain,g,.3); if(b.pan) set(b.pan.pan,p,.12); },
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
    /* music for Earth: a slow, warm loop (keys, a plucked melody, soft bass, brushes and a little vinyl), built note by note
       in the score's own scheduler. music(v) sets the level; call it every frame while it should play. */
    music(v){ if(!ctx) return;
      if(!n.mus){ n.mus=ctx.createGain(); n.mus.gain.value=0; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3400; lp.Q.value=.5; n.mus.connect(lp); lp.connect(comp);
        const sg=ctx.createGain(); sg.gain.value=.4; lp.connect(sg); sg.connect(revIn); n.mt=ctx.currentTime+.15; n.ms=0; n.mel=7; }
      set(n.mus.gain,v*1.2,.9); n.musV=v;   /* Earth's music carries the town now the hiss is gone: level with the stations */
      if(!n.musClock) n.musClock=setInterval(()=>{ if(n.musV>.001&&n.musGo) n.musGo(); },200);   // its own clock: notes keep coming when a frame runs long
      if(v<=.001) return; if(n.musGo){ n.musGo(); return; }
      n.musGo=()=>{ if(n.mt<ctx.currentTime) n.mt=ctx.currentTime+.05;
      const mf=m=>440*Math.pow(2,(m-69)/12), beat=60/72, bus=n.mus;
      const play=(f,t0,dur,g,type,atk,f2)=>{ const o=ctx.createOscillator(), a=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur*.6);
        a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(bus); o.start(t0); o.stop(t0+dur+.05); };
      const hit=(t0,dur,g,f,type,q)=>{ const s=shot(); const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q; const a=ctx.createGain();
        a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.004); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); s.connect(b); b.connect(a); a.connect(bus); s.start(t0,Math.random()*8); s.stop(t0+dur+.05); };
      const PROG=[[53,57,60,64,67],[52,55,59,62,66],[50,53,57,60,64],[48,52,55,59,62]], BASS=[41,40,38,36], SCALE=[60,62,64,67,69,72,74,76,79];
      while(n.mt<ctx.currentTime+1.2){ const k=n.ms, t0=n.mt, pos=k%8, bar=Math.floor(k/8), ch=PROG[bar%4];
        if(pos===0){ ch.forEach((m,i)=>{ play(mf(m),t0+i*.012,beat*(LITE?2.6:3.6),.018,'sine',.03); if(!LITE) play(mf(m)*2.003,t0+i*.012,beat*1.4,.004,'triangle',.02); }); play(mf(BASS[bar%4]),t0,beat*1.7,.075,'sine',.02); }
        if(pos===5){ ch.slice(2).forEach((m,i)=>play(mf(m),t0+i*.01,beat*1.3,.011,'sine',.02)); play(mf(BASS[bar%4]+7),t0,beat*.9,.05,'sine',.02); }
        if(pos===0||pos===5) play(95,t0,.22,.07,'sine',.005,42);                    // a soft kick
        if(pos===4) hit(t0,.16,.022,1900,'bandpass',.9);                            // a brush on the snare
        if(k%2===1) hit(t0,.045,.007+Math.random()*.004,7000,'highpass',.7);        // brushes on the offbeat
        if(!LITE&&Math.random()<.18) hit(t0+Math.random()*.2,.012,.012,3000+Math.random()*3000,'bandpass',3); // vinyl
        if([0,3,4,6].includes(pos)&&Math.random()<.62){ n.mel=clamp(n.mel+Math.floor(Math.random()*5)-2,0,SCALE.length-1); const f=mf(SCALE[n.mel]);
          play(f,t0,beat*1.5,.024,'sine',.004); play(f*3.01,t0,beat*.35,.005,'sine',.002); }
        n.ms++; n.mt+=beat*(k%2?.44:.56); } };
      n.musGo(); },
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
    contactBed(g,near=0,p=0){ if(!ctx) return;
      if(!n.cb){ const o=ctx.createOscillator(), o2=ctx.createOscillator(), g2=ctx.createGain(), lp=ctx.createBiquadFilter(), lvl=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain(), trem=ctx.createGain();
        o.type='sine'; o2.type='triangle'; o.frequency.value=62; o2.frequency.value=93; g2.gain.value=.22; lp.type='lowpass'; lp.frequency.value=260; o2.connect(g2); g2.connect(lp);
        trem.gain.value=.7; lfo.frequency.value=.21; lg.gain.value=.3; lfo.connect(lg); lg.connect(trem.gain); o.connect(trem); lp.connect(trem); trem.connect(lvl); lvl.gain.value=0;
        let pn=null; if(ctx.createStereoPanner){ pn=ctx.createStereoPanner(); lvl.connect(pn); pn.connect(comp); const sg=ctx.createGain(); sg.gain.value=.45; pn.connect(sg); sg.connect(revIn); } else lvl.connect(comp);
        o.start(); o2.start(); lfo.start(); n.cb={o,o2,lvl,pn,lfo}; }
      const c=n.cb, k=clamp(near,0,1); set(c.lvl.gain,g,.5); set(c.o.frequency,62-21*k,.6); set(c.o2.frequency,93-31.5*k,.6); set(c.lfo.frequency,.21+.5*k,.6); if(c.pn) set(c.pn.pan,clamp(p,-1,1),.2); },
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
    tapeStop(d=2){ if(!ctx) return; const t0=ctx.currentTime;
      n.voices.forEach(os=>os.forEach(o=>{ o.detune.cancelScheduledValues(t0); o.detune.setValueAtTime(o._dt||0,t0); o.detune.linearRampToValueAtTime((o._dt||0)-1200,t0+d); o.detune.setValueAtTime(o._dt||0,t0+d+1.5); }));
      if(n.cb){ const f=n.cb.o.frequency, v0=f.value; f.cancelScheduledValues(t0); f.setValueAtTime(v0,t0); f.linearRampToValueAtTime(Math.max(20,v0*.5),t0+d); f.setValueAtTime(v0,t0+d+1.5); } },
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
    roarTone(f=380){ if(!ctx) return; set(n.roar.b.frequency,f,.25); },
    /* leaving the pad: a long low push under everything */
    liftoff(){ tone(36,3,.22,'sine',24); noise(2.4,.16,1100,140,'lowpass',.8,0,.3); },
    /* the bottom of the well: a long falling tone, as if time were slowing */
    stretch(){ tone(220,7,.05,'sine',55,0,.8,.8); tone(330,7,.025,'sine',82,.2,.8,.8); },
    /* paper burning away: a soft long crackle */
    burn(){ for(let k=0;k<14;k++) noise(.12+Math.random()*.2,.03+Math.random()*.04,2400+Math.random()*3000,900,'bandpass',3,k*.22+Math.random()*.15,.3); noise(3.2,.05,600,2200,'bandpass',.8,0,.4); },
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

/* adaptive quality: watch frame times, trade pixel density and trace resolution for smoothness */
const QM={buf:[],cool:0,
  tick(ms,now){ if(window.__TEST) return; this.buf.push(ms); if(this.buf.length>60) this.buf.shift(); if(now<this.cool||this.buf.length<60) return;
    const avg=this.buf.reduce((a,b)=>a+b,0)/this.buf.length;
    if(avg>23){ if(RTS>0){ RTS=0; rtA.samples=rtB.samples=0; rtA.dispose(); rtB.dispose(); } else if(BH.scale>.32){ BH.scale-=.1; BH.resize(); } else if(DPR>.75){ DPR=Math.max(.75,DPR-.25); resize(); } this.cool=now+2500; this.buf=[]; }
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

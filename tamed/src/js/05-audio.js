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
  function watch(){ if(!ctx||!on||document.hidden) return;
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
    const up=on&&!document.hidden; MX.v+=((up?1:0)-MX.v)*(1-Math.exp(-dt/MX.tc));
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
       or a rocket going over, and buried the score. It comes and goes in soft swells now, under the music */
    const lapG=k.g(.2,lp); k.noise('brown',.83,k.bq('highpass',120,.6,k.bq('lowpass',420,null,lapG)));
    [[.11,.11],[.27,.06],[.53,.03]].forEach(([f,d])=>k.lfo(f,d,lapG.gain));
    const trG=k.g(.035,lp); k.noise('white',1.17,k.bq('bandpass',1300,.9,trG)); k.lfo(.37,.025,trG.gain); };
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
  loop((oc,out,sr,k)=>{ const f=k.bq('bandpass',750,.6,k.g(.25,out)); k.noise('white',.94,f); k.lfo(.06,330,f.frequency); },16,{name:'wind',full:.06,tc:.8});
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
  loop((oc,out,sr,k)=>{ const bus=k.g(1,out); bus.connect(k.g(.5,k.wet));
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
  loop((oc,out,sr,k)=>{ const hp=k.bq('highpass',300,null,out); hp.connect(k.g(.9,k.wet)); k.noise('white',1.23,k.bq('bandpass',6500,.7,hp)); },10,{name:'ogHiss',full:.45*.065,tc2:.3,room:true,sr:32000});
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
    async start(){ try{ init(); on=true; MX.tc=.5; await ctx.resume(); set(n.master.gain,LEVEL,1.2); }catch(e){ on=false; } },
    suspend(v){ if(!ctx) return;
      if(v){ set(n.master.gain,0,.15); for(const L of LOOPS) if(L.run) halt(L); MX.v=0; setTimeout(()=>{ if(document.hidden&&ctx) ctx.suspend().catch(()=>{}); },400); }
      else { MX.tc=.6; ctx.resume().then(()=>set(n.master.gain,LEVEL,.6)).catch(()=>{}); } },
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

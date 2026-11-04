/* ================= SOUND =================
   Everything is synthesized. A slow warm score in D (pads, a soft bass, a distant glass piano),
   water that is close by the lake and muffled inside the rooms, one droplet when the cursor breaks
   the surface, a tonal colour for each room, and quiet sounds for the hand. Never harsh, never loud. */
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
  function init(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    n.master=ctx.createGain(); n.master.gain.value=0;
    n.comp=ctx.createDynamicsCompressor(); n.comp.threshold.value=-20; n.comp.knee.value=14; n.comp.ratio.value=3; n.comp.attack.value=.02; n.comp.release.value=.5;
    /* what leaves for the speakers: nothing below 40 Hz (a phone or laptop cannot play it, only strain at it), and never a
       hard clip, so sounds piling up never reach the point where small speakers distort */
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=40; hp.Q.value=.6;
    /* a soft clip in place of a limiter: below 0.7 it lets the sound through untouched, above it rounds the peaks off
         smoothly towards full scale. (The browser's compressor would add its own make-up gain to everything) */
      const cv=new Float32Array(2049); for(let i=0;i<cv.length;i++){ const x=i/1024-1, a=Math.abs(x); cv[i]=a<=.7?x:Math.sign(x)*(.7+.28*Math.tanh((a-.7)/.28)); }
      const lim=ctx.createWaveShaper(); lim.curve=cv; lim.oversample='2x';
    n.comp.connect(n.master); n.master.connect(hp); hp.connect(lim); lim.connect(ctx.destination);
    n.meter=ctx.createAnalyser(); n.meter.fftSize=4096; lim.connect(n.meter);
    n.rev=ctx.createConvolver(); n.rev.buffer=ir(5.2,2.6); n.revG=ctx.createGain(); n.revG.gain.value=.62; n.rev.connect(n.revG); n.revG.connect(n.comp);
    n.revIn=ctx.createGain(); n.revIn.connect(n.rev);
    /* nine seconds of each noise, read by every layer at its own speed (src): no two layers line up, so nothing phases */
    const nb=ctx.createBuffer(1,ctx.sampleRate*9,ctx.sampleRate), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1; n.noise=nb;
    const bb=ctx.createBuffer(1,ctx.sampleRate*9,ctx.sampleRate), bd=bb.getChannelData(0); let br=0; for(let i=0;i<bd.length;i++){ br=(br+.02*(Math.random()*2-1))/1.02; bd[i]=br*3.5; } n.brown=bb;
    /* music bus: everything musical passes one low-pass that closes when you are inside */
    n.mus=ctx.createGain(); n.mus.gain.value=0; n.musLP=ctx.createBiquadFilter(); n.musLP.type='lowpass'; n.musLP.frequency.value=9000; n.musLP.Q.value=.5;
    n.mus.connect(n.musLP); n.musLP.connect(n.comp); const ms=ctx.createGain(); ms.gain.value=.55; n.musLP.connect(ms); ms.connect(n.revIn);
    /* pad: two detuned saws and a sine an octave down for each of five voices, through a slowly breathing filter. The low
       end is kept light: the root sits under the lowest voice already, and a phone or laptop speaker only strains at more */
    n.padF=ctx.createBiquadFilter(); n.padF.type='lowpass'; n.padF.frequency.value=700; n.padF.Q.value=.6;
    n.padG=ctx.createGain(); n.padG.gain.value=.085; n.padF.connect(n.padG); n.padG.connect(n.mus);
    const lfo=ctx.createOscillator(); lfo.frequency.value=.045; const lg=ctx.createGain(); lg.gain.value=260; lfo.connect(lg); lg.connect(n.padF.frequency); lfo.start();
    n.voices=CH[0].map((m,i)=>{ const f=mtof(m); const vg=ctx.createGain(); vg.gain.value=i===0?.5:.32/(1+i*.15); vg.connect(n.padF);
      const os=[-7,6].map(dt=>{ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=dt; const g=ctx.createGain(); g.gain.value=.16; o.connect(g); g.connect(vg); o.start(); return o; });
      const s=ctx.createOscillator(); s.type='sine'; s.frequency.value=f/2; const sg=ctx.createGain(); sg.gain.value=i<2?.22:.14; s.connect(sg); sg.connect(vg); s.start(); os.push(s);
      const am=ctx.createOscillator(); am.frequency.value=.07+i*.031; const ag=ctx.createGain(); ag.gain.value=.12; am.connect(ag); ag.connect(vg.gain); am.start();
      return {os,ratio:[1,1,.5]}; });
    n.bass=ctx.createOscillator(); n.bass.type='sine'; n.bass.frequency.value=mtof(ROOT[0]); n.bassG=ctx.createGain(); n.bassG.gain.value=.022; n.bass.connect(n.bassG); n.bassG.connect(n.mus); n.bass.start();
    n.ci=0; n.nextChord=ctx.currentTime+9; n.nextNote=ctx.currentTime+2.5;
    /* water: lapping close by, a trickle above it, small plips */
    n.water=ctx.createGain(); n.water.gain.value=0; n.waterLP=ctx.createBiquadFilter(); n.waterLP.type='lowpass'; n.waterLP.frequency.value=2400; n.waterLP.Q.value=.4;
    n.water.connect(n.waterLP); n.waterLP.connect(n.comp); const ws=ctx.createGain(); ws.gain.value=.25; n.waterLP.connect(ws); ws.connect(n.revIn);
    const lap=src(n.brown), lapF=ctx.createBiquadFilter(); lapF.type='lowpass'; lapF.frequency.value=420; const lapH=ctx.createBiquadFilter(); lapH.type='highpass'; lapH.frequency.value=120; lapH.Q.value=.6;   // the lapping, without the rumble under it no small speaker can play
    const lapG=ctx.createGain(); lapG.gain.value=.62; lap.connect(lapH); lapH.connect(lapF); lapF.connect(lapG); lapG.connect(n.water);
    [[.11,.22],[.27,.14],[.53,.07]].forEach(([f,k])=>{ const o=ctx.createOscillator(); o.frequency.value=f; const g=ctx.createGain(); g.gain.value=k; o.connect(g); g.connect(lapG.gain); o.start(); });
    const tr=src(n.noise), trF=ctx.createBiquadFilter(); trF.type='bandpass'; trF.frequency.value=1300; trF.Q.value=.9; const trG=ctx.createGain(); trG.gain.value=.035; tr.connect(trF); trF.connect(trG); trG.connect(n.water);
    const to=ctx.createOscillator(); to.frequency.value=.37; const tg=ctx.createGain(); tg.gain.value=.025; to.connect(tg); tg.connect(trG.gain); to.start();
    n.nextPlip=ctx.currentTime+1;
    /* air in the grass */
    n.wind=ctx.createGain(); n.wind.gain.value=0; const wi=src(n.noise), wf=ctx.createBiquadFilter(); wf.type='bandpass'; wf.frequency.value=900; wf.Q.value=.5; wi.connect(wf); wf.connect(n.wind); n.wind.connect(n.comp);
    const wl=ctx.createOscillator(); wl.frequency.value=.06; const wlg=ctx.createGain(); wlg.gain.value=500; wl.connect(wlg); wlg.connect(wf.frequency); wl.start(); n.windF=wf;
    n.nextBird=ctx.currentTime+6;
    /* the rooms */
    roomKrios(); roomAetos(); roomPharos(); roomOgive();
    /* the gate: warm light on one side, the dark on the other */
    n.warm=ctx.createGain(); n.warm.gain.value=0; n.warm.connect(n.comp); const wr=ctx.createGain(); wr.gain.value=.7; n.warm.connect(wr); wr.connect(n.revIn);
    [62,69,74,78].forEach((m,i)=>{ const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=mtof(m); o.detune.value=(i-1.5)*3; const g=ctx.createGain(); g.gain.value=.25/(1+i*.4); o.connect(g); g.connect(n.warm); o.start(); });
    n.dark=ctx.createGain(); n.dark.gain.value=0; n.dark.connect(n.comp);
    const rb=src(n.brown), rf=ctx.createBiquadFilter(); rf.type='lowpass'; rf.frequency.value=110; rb.connect(rf); rf.connect(n.dark);
    const sub=ctx.createOscillator(); sub.type='sine'; sub.frequency.value=34; const sg2=ctx.createGain(); sg2.gain.value=.6; sub.connect(sg2); sg2.connect(n.dark); sub.start();
    const trm=ctx.createOscillator(); trm.frequency.value=6.5; const trmG=ctx.createGain(); trmG.gain.value=.35; trm.connect(trmG); trmG.connect(sg2.gain); trm.start();
    n.nextPing=0; n.nextGateBird=0;
    /* a rocket going up from the far shore: a low, uneven rumble that comes in late and far; it opens up and comes close
       when you catch it */
    n.rk=ctx.createGain(); n.rk.gain.value=0; n.rkF=ctx.createBiquadFilter(); n.rkF.type='lowpass'; n.rkF.frequency.value=150; n.rkF.Q.value=.7;
    const rks=src(n.brown), rkA=ctx.createGain(); rkA.gain.value=.75; rks.connect(n.rkF); n.rkF.connect(rkA); rkA.connect(n.rk); n.rk.connect(n.comp);
    const rkr=ctx.createGain(); rkr.gain.value=.8; n.rk.connect(rkr); rkr.connect(n.revIn);
    const crk=ctx.createOscillator(); crk.type='sawtooth'; crk.frequency.value=7.3; const crkG=ctx.createGain(); crkG.gain.value=.28; crk.connect(crkG); crkG.connect(rkA.gain); crk.start();
  }
  const RATES=[.83,1.17,.94,1.29,.71,1.06,.88,1.23,.77,1.12,.97,1.34]; let srcK=0;
  const LEVEL=.75;   /* the whole walk's level: a little under full, so phones and laptops have room */
  function src(buf){ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; s.playbackRate.value=RATES[srcK++%RATES.length]; s.start(0,Math.random()*8); return s; }
  const last=new WeakMap();
  const set=(p,v,tc=.15)=>{ if(!ctx) return; const l=last.get(p); if(l!==undefined&&Math.abs(l-v)<=Math.max(1e-4,Math.abs(v)*.004)) return; last.set(p,v); p.setTargetAtTime(v,ctx.currentTime,tc); };
  function pan(p,dest){ if(ctx.createStereoPanner){ const s=ctx.createStereoPanner(); s.pan.value=clamp(p,-1,1); s.connect(dest); return s; } return dest; }
  /* a glass piano note: a sine with a few soft partials and a long fading tail */
  function glass(m,t0,g,p=0,dest){ const f=mtof(m), out=pan(p,dest||n.mus);
    [[1,1,3.2],[2.005,.22,1.4],[3.01,.07,.7],[4.2,.025,.35]].forEach(([r,k,d])=>{ const o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine'; o.frequency.value=f*r;
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g*k,t0+.006); a.gain.exponentialRampToValueAtTime(.0001,t0+d*(1.2-r*.05)); o.connect(a); a.connect(out); o.start(t0); o.stop(t0+d*1.3+.1); }); }
  function tone(f,dur,g,type='sine',f2=0,delay=0,send=.2,atk=.008,dest){ if(!on) return; const t0=ctx.currentTime+delay, o=ctx.createOscillator(), a=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur*.8);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+atk); a.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(a); a.connect(dest||n.comp);
    if(send){ const s=ctx.createGain(); s.gain.value=send; a.connect(s); s.connect(n.revIn); } o.start(t0); o.stop(t0+dur+.05); }
  function noise(dur,g,f0,f1,type='bandpass',q=.8,delay=0,send=.3,dest){ if(!on) return; const t0=ctx.currentTime+delay, s=ctx.createBufferSource(); s.buffer=n.noise; s.loop=true; s.playbackRate.value=.86+Math.random()*.3;
    const b=ctx.createBiquadFilter(); b.type=type; b.Q.value=q; b.frequency.setValueAtTime(f0,t0); b.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t0+dur);
    const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+Math.min(.25,dur*.35)); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(b); b.connect(a); a.connect(dest||n.comp); if(send){ const x=ctx.createGain(); x.gain.value=send; a.connect(x); x.connect(n.revIn); } s.start(t0,Math.random()*2); s.stop(t0+dur+.1); }
  function chirp(p,g=.012,dest){ if(!on) return; const k=2+Math.floor(Math.random()*3), base=2600+Math.random()*1800, out=pan(p,dest||n.comp);
    for(let i=0;i<k;i++){ const t0=ctx.currentTime+i*(.07+Math.random()*.06), o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(base*(1+i*.06),t0); o.frequency.exponentialRampToValueAtTime(base*(1.3+Math.random()*.25),t0+.05);
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.006); a.gain.exponentialRampToValueAtTime(.0001,t0+.085); o.connect(a); a.connect(out);
      const s=ctx.createGain(); s.gain.value=.6; a.connect(s); s.connect(n.revIn); o.start(t0); o.stop(t0+.12); } }
  function plip(g,delay=0){ const t0=ctx.currentTime+delay, f=1100+Math.random()*1400, o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
    o.frequency.setValueAtTime(f,t0); o.frequency.exponentialRampToValueAtTime(f*1.9,t0+.035);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.003); a.gain.exponentialRampToValueAtTime(.0001,t0+.07); o.connect(a); a.connect(pan(Math.random()*1.4-.7,n.water)); o.start(t0); o.stop(t0+.1); }
  /* Kríos: no voices. A quiet room with a lamp on: a little air, and a low D under the conversation */
  function roomKrios(){ const R=n.kr={}; R.g=ctx.createGain(); R.g.gain.value=0; R.g.connect(n.comp);
    const a=src(n.noise), f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=520; f.Q.value=.5; const ag=ctx.createGain(); ag.gain.value=.05; a.connect(f); f.connect(ag); ag.connect(R.g);
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=mtof(38); const og=ctx.createGain(); og.gain.value=.045; o.connect(og); og.connect(R.g); o.start();
    const l=ctx.createOscillator(); l.frequency.value=.07; const lg=ctx.createGain(); lg.gain.value=.015; l.connect(lg); lg.connect(og.gain); l.start(); }
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
  /* Aetos: wind high up, and the hum of rotors far above */
  function roomAetos(){ const R=n.ae={}; R.g=ctx.createGain(); R.g.gain.value=0; R.g.connect(n.comp);
    const hm=src(n.noise), hmf=ctx.createBiquadFilter(); hmf.type='bandpass'; hmf.frequency.value=190; hmf.Q.value=2.4; const hmg=ctx.createGain(); hmg.gain.value=.05; hm.connect(hmf); hmf.connect(hmg); hmg.connect(R.g);
    const hl=ctx.createOscillator(); hl.frequency.value=.21; const hlg=ctx.createGain(); hlg.gain.value=.025; hl.connect(hlg); hlg.connect(hmg.gain); hl.start();
    const w=src(n.noise), f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=700; f.Q.value=.45; const wg=ctx.createGain(); wg.gain.value=.22; w.connect(f); f.connect(wg); wg.connect(R.g);
    const l=ctx.createOscillator(); l.frequency.value=.08; const lg=ctx.createGain(); lg.gain.value=420; l.connect(lg); lg.connect(f.frequency); l.start();
    const l2=ctx.createOscillator(); l2.frequency.value=.13; const l2g=ctx.createGain(); l2g.gain.value=.12; l2.connect(l2g); l2g.connect(wg.gain); l2.start();
    const hi=ctx.createOscillator(); hi.type='sine'; hi.frequency.value=mtof(86); const hg=ctx.createGain(); hg.gain.value=.006; hi.connect(hg); hg.connect(R.g); hi.start();
    R.next=0; }
  /* Pharos: a deep slow tone that swells as the beam comes round */
  function roomPharos(){ const R=n.ph={}; R.g=ctx.createGain(); R.g.gain.value=0; R.g.connect(n.comp); const s=ctx.createGain(); s.gain.value=.5; R.g.connect(s); s.connect(n.revIn);
    R.sw=ctx.createGain(); R.sw.gain.value=.6; R.sw.connect(R.g);
    [[38,.32,'sine'],[45,.3,'sine'],[50,.15,'triangle'],[57,.07,'sine']].forEach(([m,k,t])=>{ const o=ctx.createOscillator(); o.type=t; o.frequency.value=mtof(m); const g=ctx.createGain(); g.gain.value=k; o.connect(g); g.connect(R.sw); o.start(); });
    const w=src(n.noise), f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=400; f.Q.value=1.2; R.air=ctx.createGain(); R.air.gain.value=0; w.connect(f); f.connect(R.air); R.air.connect(R.g); R.airF=f; }
  /* Ogive: a shimmer that keeps rising and never arrives */
  function roomOgive(){ const R=n.og={}; R.g=ctx.createGain(); R.g.gain.value=0; const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=300; R.g.connect(hp); hp.connect(n.comp);
    const s=ctx.createGain(); s.gain.value=.9; hp.connect(s); s.connect(n.revIn);
    R.os=[]; for(let i=0;i<6;i++){ const o=ctx.createOscillator(); o.type='sine'; const g=ctx.createGain(); g.gain.value=0; o.connect(g); g.connect(pan((i%2?.3:-.3),R.g)); o.start(); R.os.push({o,g,ph:i/6}); }
    const h=src(n.noise), hf=ctx.createBiquadFilter(); hf.type='bandpass'; hf.frequency.value=6500; hf.Q.value=.7; R.hiss=ctx.createGain(); R.hiss.gain.value=0; h.connect(hf); hf.connect(R.hiss); R.hiss.connect(R.g); }

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

  const L={music:0,water:0,waterF:2400,mus:9000,kr:0,ae:0,ph:0,og:0,wind:0};
  return {
    get on(){ return on; }, get ctx(){ return ctx; },
    async start(){ try{ init(); on=true; await ctx.resume(); set(n.master.gain,LEVEL,1.2); }catch(e){ on=false; } },
    suspend(v){ if(!ctx) return; if(v){ set(n.master.gain,0,.15); setTimeout(()=>{ if(document.hidden&&ctx) ctx.suspend().catch(()=>{}); },400); } else { ctx.resume().then(()=>set(n.master.gain,LEVEL,.6)).catch(()=>{}); } },
    meter(){ if(!ctx) return null; const b=new Float32Array(n.meter.fftSize); n.meter.getFloatTimeDomainData(b); let pk=0,sq=0; for(const v of b){ pk=Math.max(pk,Math.abs(v)); sq+=v*v; }
      const rms=Math.sqrt(sq/b.length); return {peak:+pk.toFixed(3),rmsDb:+(20*Math.log10(rms+1e-9)).toFixed(1)}; },
    levels(){ return ctx?{master:+n.master.gain.value.toFixed(3),mus:+n.mus.gain.value.toFixed(3),water:+n.water.gain.value.toFixed(3),waterF:Math.round(n.waterLP.frequency.value),kr:+n.kr.g.gain.value.toFixed(3),ae:+n.ae.g.gain.value.toFixed(3),ph:+n.ph.g.gain.value.toFixed(3),og:+n.og.g.gain.value.toFixed(3),state:ctx.state}:null; },
    /* every frame: where you are decides what you hear */
    update(dt,st){
      if(!ctx||!on) return;
      const t=ctx.currentTime;
      if(t>n.nextChord&&!n.tape){ n.ci=(n.ci+1)%CH.length; n.nextChord=t+9+Math.random()*3; const C=CH[n.ci]; n.cc=(n.cc||0)+1;
        if(n.cc%2===0&&st.music>.3){ const M=MOTIF[n.cc%8===0?0:Math.floor(Math.random()*MOTIF.length)], g=.034*st.music, t0=t+1.2; M.forEach(([m,dt],i)=>glass(m,t0+dt+(Math.random()-.5)*.06,g*(1-i*.08),(i%2?.18:-.18))); n.nextNote=Math.max(n.nextNote,t0+4.5); }
        n.voices.forEach((v,i)=>v.os.forEach((o,j)=>o.frequency.setTargetAtTime(mtof(C[i])*v.ratio[j],t,1.6))); n.bass.frequency.setTargetAtTime(mtof(ROOT[n.ci]),t,1.2); }
      if(t>n.nextNote){ const C=CH[n.ci]; const pick=()=>{ let m=PENTA[Math.floor(Math.random()*PENTA.length)]; return m; };
        const g=.03+Math.random()*.025*st.music, m=pick(); glass(m,t+.02,g,Math.random()*.8-.4);
        if(Math.random()<.35) glass(pick(),t+.32+Math.random()*.3,g*.7,Math.random()*.8-.4);
        if(Math.random()<.15) glass(C[3]+12,t+.05,g*.5,0);
        n.nextNote=t+3.4+Math.random()*5; }
      set(n.mus.gain,st.music*.9,.9); set(n.musLP.frequency,st.musF,.6);
      set(n.water.gain,st.water*.62,.7); set(n.waterLP.frequency,st.waterF,.5);
      set(n.wind.gain,st.wind*.06,.8);
      if(st.water>.3&&t>n.nextPlip){ plip(.018*st.water*(st.waterF>1500?1:.4)); n.nextPlip=t+.35+Math.random()*2.4; }
      if(st.birds>.2&&t>n.nextBird){ chirp(Math.random()*1.6-.8,.006*st.birds); n.nextBird=t+7+Math.random()*14; }
      /* rooms */
      set(n.kr.g.gain,st.kr*.55,.5); set(n.ae.g.gain,st.ae*.75,.5); set(n.ph.g.gain,st.ph*.36,.5); set(n.og.g.gain,st.og*.45,.5);
      for(const [nm,p,v] of RSND) roomSound(nm,p,v,st,t);
      /* Pharos: the tone settles as the drone becomes sure where it is; doubt is a little air */
      if(st.ph>.01){ const f=st.beam||0; set(n.ph.sw.gain,.35+.65*f,.2); set(n.ph.air.gain,(1-f)*.1,.15); set(n.ph.airF.frequency,300+(1-f)*900,.2); }
      if(st.og>.01){ for(const v of n.og.os){ v.ph=(v.ph+dt/11)%1; const f=520*Math.pow(2,v.ph*2.5); v.o.frequency.setTargetAtTime(f,t,.05); v.g.gain.setTargetAtTime(Math.sin(v.ph*Math.PI)*.05,t,.05); } set(n.og.hiss.gain,.025+st.rise*.04,.3); }
      set(n.warm.gain,st.warm*.09,.35); set(n.dark.gain,st.dark*.3,.25);
      /* the gate's ways: open air and birds for Land; for Fly, far off in the dark, the ping of something not yet known */
      if(st.land>.5&&t>n.nextGateBird){ chirp(Math.random()*1.4-.7,.011); n.nextGateBird=t+1.1+Math.random()*2.2; }
      if(st.dark>.5&&t>n.nextPing){ const p=Math.random()*.6-.3; tone(1320,.12,.012,'sine',1180,0,.9,.002,pan(p,n.comp)); tone(1320,.1,.004,'sine',1180,.42,.9,.002,pan(-p,n.comp)); n.nextPing=t+2.4; }
      set(n.rk.gain,(st.rocket||0)*.16+(st.rocketNear||0)*.62,.45); set(n.rkF.frequency,150+(st.rocketNear||0)*1100,.5);
      if(n.tape&&(st.rocketNear||0)<.05){ n.tape=false; const C=CH[n.ci]; n.voices.forEach((v,i)=>v.os.forEach((o,j)=>o.frequency.setTargetAtTime(mtof(C[i])*v.ratio[j],t,.8))); n.bass.frequency.setTargetAtTime(mtof(ROOT[n.ci]),t,.8); }
    },
    /* the gate: a way being shown, and a way being taken */
    preview(v){ if(!on) return; const t=ctx.currentTime;
      if(v==='walk'){ plip(.016,.05); glass(74,t+.08,.016,-.2,n.comp); }
      else if(v==='land'){ noise(1.2,.06,700,2600,'bandpass',.5,0,.25); noise(3.3,.045,560,150,'bandpass',.9,0,.5);   /* the clouds parting, then the air you fall through */ tone(mtof(43),3.2,.012,'sine',mtof(40),0,.4,.6);
        setTimeout(()=>{ if(S.gateHover!=='land'||!on) return;
          glass(79,ctx.currentTime+.12,.02,.25,n.comp); glass(86,ctx.currentTime+.3,.014,.3,n.comp); },3400); }
      else if(v==='fly'){ tone(mtof(26),2.6,.028,'sine',mtof(24),0,.5,.5); noise(2.4,.024,90,600,'lowpass',.7,0,.6); n.nextPing=t+.9; } },
    leave(v){ if(!on) return; const t=ctx.currentTime;
      if(v==='land'){ noise(.9,.05,300,3200,'bandpass',.8,0,.5); [74,79,83].forEach((m,i)=>glass(m,t+.05+i*.09,.022,(i-1)*.25,n.comp)); }
      else { tone(54,1.2,.07,'sine',30,0,.6,.01); noise(1,.05,2400,120,'lowpass',.7,0,.6); } },
    /* the rocket at the end of the walk, caught: it roars in close, a long rise, and the walk falls quiet under it */
    rocketGo(){ if(!on) return; const t=ctx.currentTime; noise(2.6,.06,180,2600,'bandpass',.9,0,.6); tone(mtof(38),2.8,.05,'sine',mtof(50),0,.7,.9); tone(mtof(45),2.6,.03,'sine',mtof(57),.2,.7,.9);
      n.tape=true; n.voices.forEach(v=>v.os.forEach(o=>o.frequency.setTargetAtTime(o.frequency.value*.5,t+.3,.75))); n.bass.frequency.setTargetAtTime(n.bass.frequency.value*.5,t+.3,.75); },
    /* the hand */
    hover(){ if(!on) return; const m=PENTA[3+Math.floor(Math.random()*5)]; tone(mtof(m),.32,.016,'sine',0,0,.35,.004); tone(mtof(m)*2,.12,.004,'sine',0,0,0,.002); },
    click(){ if(!on) return; tone(560,.09,.05,'triangle',260,0,.15,.003); noise(.03,.03,2400,1800,'bandpass',2,0,.05); },
    drop(g=1){ if(!on) return; const t0=ctx.currentTime, f=620+Math.random()*180, o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(f,t0); o.frequency.exponentialRampToValueAtTime(f*2.3,t0+.05);
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.075*g,t0+.004); a.gain.exponentialRampToValueAtTime(.0001,t0+.16);
      o.connect(a); a.connect(n.comp); const s=ctx.createGain(); s.gain.value=.65; a.connect(s); s.connect(n.revIn); o.start(t0); o.stop(t0+.2);
      tone(f*3.1,.06,.008*g,'sine',f*4,.012,.4,.002); },
    /* a hand moving through the water: a soft swish, longer and darker when slow, quicker and brighter when fast, from the
       side of the screen the hand is on, and now and then a drop flicked off */
    swish(k=.5,p=0){ if(!on) return; const out=pan(p*.7,n.comp), d=.5+.3*(1-k);
      noise(d,.06+.09*k,700+1500*k,260+200*k,'bandpass',1.3,0,.35,out);
      noise(d*.6,.012+.02*k,3400+900*k,1800,'bandpass',1.6,.03,.25,out);
      if(k>.45&&Math.random()<.5) plip(.008+.01*k,.12+Math.random()*.2); },
    whoosh(up=true,dur=1.4,g=.07){ noise(dur,g,up?260:2600,up?2600:260,'bandpass',1,0,.5); },
    swell(){ if(!on) return; [62,66,69,74].forEach((m,i)=>tone(mtof(m),3.2,.03,'sine',0,i*.06,.8,.6)); noise(2.2,.05,200,2600,'lowpass',.7,0,.6); },
    open(){ if(!on) return; [57,62,66,69].forEach((m,i)=>tone(mtof(m),2.6,.028,'sine',mtof(m)*1.003,i*.05,.8,.35)); noise(1.4,.06,300,4200,'lowpass',.6,0,.6); },
    close(){ if(!on) return; noise(1.1,.05,3000,300,'lowpass',.6,0,.5); tone(mtof(62),1.6,.025,'sine',0,0,.7,.2); },
    index(){ if(!on) return; noise(.7,.04,600,2400,'bandpass',1.2,0,.4); tone(mtof(74),1.2,.02,'sine',0,.05,.7,.02); },
    tick(i){ if(!on) return; tone(mtof(PENTA[(i||0)%PENTA.length]),.25,.014,'sine',0,0,.4,.003); },
    pick(){ if(!on) return; glass(74,ctx.currentTime,.05,0,n.comp); glass(81,ctx.currentTime+.09,.03,0,n.comp); },
    rise(){ if(!on) return; noise(1.6,.05,180,1500,'bandpass',1.4,0,.6); for(let i=0;i<9;i++) plip(.012+Math.random()*.012,.5+i*.22+Math.random()*.35); glass(69,ctx.currentTime+.1,.03,-.2,n.comp); },
  };
})();

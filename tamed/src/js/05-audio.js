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
  function ir(sec,decay){
    const L=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(2,L,ctx.sampleRate);
    for(let c=0;c<2;c++){ const d=b.getChannelData(c); let lp=0; for(let i=0;i<L;i++){ const t=i/L; const k=.35+.6*(1-t); lp=lp+(Math.random()*2-1-lp)*k; d[i]=lp*Math.pow(1-t,decay)*(i<ctx.sampleRate*.012?.3:1); } }
    return b; }
  function init(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    n.master=ctx.createGain(); n.master.gain.value=0;
    n.comp=ctx.createDynamicsCompressor(); n.comp.threshold.value=-20; n.comp.knee.value=14; n.comp.ratio.value=3; n.comp.attack.value=.02; n.comp.release.value=.5;
    n.comp.connect(n.master); n.master.connect(ctx.destination);
    n.rev=ctx.createConvolver(); n.rev.buffer=ir(5.2,2.6); n.revG=ctx.createGain(); n.revG.gain.value=.62; n.rev.connect(n.revG); n.revG.connect(n.comp);
    n.revIn=ctx.createGain(); n.revIn.connect(n.rev);
    const nb=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1; n.noise=nb;
    const bb=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate), bd=bb.getChannelData(0); let br=0; for(let i=0;i<bd.length;i++){ br=(br+.02*(Math.random()*2-1))/1.02; bd[i]=br*3.5; } n.brown=bb;
    /* music bus: everything musical passes one low-pass that closes when you are inside */
    n.mus=ctx.createGain(); n.mus.gain.value=0; n.musLP=ctx.createBiquadFilter(); n.musLP.type='lowpass'; n.musLP.frequency.value=9000; n.musLP.Q.value=.5;
    n.mus.connect(n.musLP); n.musLP.connect(n.comp); const ms=ctx.createGain(); ms.gain.value=.55; n.musLP.connect(ms); ms.connect(n.revIn);
    /* pad: two detuned saws and a sine an octave down for each of five voices, through a slowly breathing filter */
    n.padF=ctx.createBiquadFilter(); n.padF.type='lowpass'; n.padF.frequency.value=700; n.padF.Q.value=.6;
    n.padG=ctx.createGain(); n.padG.gain.value=.085; n.padF.connect(n.padG); n.padG.connect(n.mus);
    const lfo=ctx.createOscillator(); lfo.frequency.value=.045; const lg=ctx.createGain(); lg.gain.value=260; lfo.connect(lg); lg.connect(n.padF.frequency); lfo.start();
    n.voices=CH[0].map((m,i)=>{ const f=mtof(m); const vg=ctx.createGain(); vg.gain.value=i===0?.5:.32/(1+i*.15); vg.connect(n.padF);
      const os=[-7,6].map(dt=>{ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=dt; const g=ctx.createGain(); g.gain.value=.16; o.connect(g); g.connect(vg); o.start(); return o; });
      const s=ctx.createOscillator(); s.type='sine'; s.frequency.value=f/2; const sg=ctx.createGain(); sg.gain.value=i<2?.45:.18; s.connect(sg); sg.connect(vg); s.start(); os.push(s);
      const am=ctx.createOscillator(); am.frequency.value=.07+i*.031; const ag=ctx.createGain(); ag.gain.value=.12; am.connect(ag); ag.connect(vg.gain); am.start();
      return {os,ratio:[1,1,.5]}; });
    n.bass=ctx.createOscillator(); n.bass.type='sine'; n.bass.frequency.value=mtof(ROOT[0]); n.bassG=ctx.createGain(); n.bassG.gain.value=.07; n.bass.connect(n.bassG); n.bassG.connect(n.mus); n.bass.start();
    n.ci=0; n.nextChord=ctx.currentTime+9; n.nextNote=ctx.currentTime+2.5;
    /* water: lapping close by, a trickle above it, small plips */
    n.water=ctx.createGain(); n.water.gain.value=0; n.waterLP=ctx.createBiquadFilter(); n.waterLP.type='lowpass'; n.waterLP.frequency.value=2400; n.waterLP.Q.value=.4;
    n.water.connect(n.waterLP); n.waterLP.connect(n.comp); const ws=ctx.createGain(); ws.gain.value=.25; n.waterLP.connect(ws); ws.connect(n.revIn);
    const lap=src(n.brown), lapF=ctx.createBiquadFilter(); lapF.type='lowpass'; lapF.frequency.value=420; const lapG=ctx.createGain(); lapG.gain.value=.5; lap.connect(lapF); lapF.connect(lapG); lapG.connect(n.water);
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
  }
  function src(buf){ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; s.start(0,Math.random()*2); return s; }
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
  function noise(dur,g,f0,f1,type='bandpass',q=.8,delay=0,send=.3,dest){ if(!on) return; const t0=ctx.currentTime+delay, s=ctx.createBufferSource(); s.buffer=n.noise;
    const b=ctx.createBiquadFilter(); b.type=type; b.Q.value=q; b.frequency.setValueAtTime(f0,t0); b.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t0+dur);
    const a=ctx.createGain(); a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+Math.min(.25,dur*.35)); a.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(b); b.connect(a); a.connect(dest||n.comp); if(send){ const x=ctx.createGain(); x.gain.value=send; a.connect(x); x.connect(n.revIn); } s.start(t0,Math.random()*2); s.stop(t0+dur+.1); }
  function chirp(p,g=.012,dest){ if(!on) return; const k=2+Math.floor(Math.random()*3), base=2600+Math.random()*1800, out=pan(p,dest||n.comp);
    for(let i=0;i<k;i++){ const t0=ctx.currentTime+i*(.07+Math.random()*.06), o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(base*(1+i*.06),t0); o.frequency.exponentialRampToValueAtTime(base*(1.3+Math.random()*.25),t0+.05);
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.006); a.gain.exponentialRampToValueAtTime(.0001,t0+.085); o.connect(a); a.connect(out);
      const s=ctx.createGain(); s.gain.value=.6; a.connect(s); s.connect(n.revIn); o.start(t0); o.stop(t0+.12); } }
  function plip(g){ const t0=ctx.currentTime, f=1100+Math.random()*1400, o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
    o.frequency.setValueAtTime(f,t0); o.frequency.exponentialRampToValueAtTime(f*1.9,t0+.035);
    a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(g,t0+.003); a.gain.exponentialRampToValueAtTime(.0001,t0+.07); o.connect(a); a.connect(pan(Math.random()*1.4-.7,n.water)); o.start(t0); o.stop(t0+.1); }
  /* Kríos: two soft voices, humming a conversation through the wall */
  function roomKrios(){ const R=n.kr={}; R.g=ctx.createGain(); R.g.gain.value=0; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1700; R.g.connect(lp); lp.connect(n.comp);
    const s=ctx.createGain(); s.gain.value=.8; lp.connect(s); s.connect(n.revIn);
    R.v=[0,1].map(w=>{ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=w?118:158; const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=w?118:158;
      const pre=ctx.createGain(); pre.gain.value=.5; o.connect(pre); const p2=ctx.createGain(); p2.gain.value=.8; o2.connect(p2);
      const env=ctx.createGain(); env.gain.value=0;
      const fs=[0,1,2].map(k=>{ const b=ctx.createBiquadFilter(); b.type='bandpass'; b.Q.value=[5,8,10][k]; b.frequency.value=[600,1100,2500][k]; pre.connect(b); const bg=ctx.createGain(); bg.gain.value=[1,.55,.2][k]; b.connect(bg); bg.connect(env); return b; });
      p2.connect(env); env.connect(pan(w?.35:-.35,R.g)); o.start(); o2.start(); return {o,o2,env,fs}; }); }
  /* Aetos: wind high up, and distant birds */
  function roomAetos(){ const R=n.ae={}; R.g=ctx.createGain(); R.g.gain.value=0; R.g.connect(n.comp);
    const w=src(n.noise), f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=700; f.Q.value=.45; const wg=ctx.createGain(); wg.gain.value=.22; w.connect(f); f.connect(wg); wg.connect(R.g);
    const l=ctx.createOscillator(); l.frequency.value=.08; const lg=ctx.createGain(); lg.gain.value=420; l.connect(lg); lg.connect(f.frequency); l.start();
    const l2=ctx.createOscillator(); l2.frequency.value=.13; const l2g=ctx.createGain(); l2g.gain.value=.12; l2.connect(l2g); l2g.connect(wg.gain); l2.start();
    const hi=ctx.createOscillator(); hi.type='sine'; hi.frequency.value=mtof(86); const hg=ctx.createGain(); hg.gain.value=.006; hi.connect(hg); hg.connect(R.g); hi.start();
    R.next=0; }
  /* Pharos: a deep slow tone that swells as the beam comes round */
  function roomPharos(){ const R=n.ph={}; R.g=ctx.createGain(); R.g.gain.value=0; R.g.connect(n.comp); const s=ctx.createGain(); s.gain.value=.5; R.g.connect(s); s.connect(n.revIn);
    R.sw=ctx.createGain(); R.sw.gain.value=.6; R.sw.connect(R.g);
    [[38,.5,'sine'],[45,.28,'sine'],[50,.12,'triangle'],[26,.4,'sine']].forEach(([m,k,t])=>{ const o=ctx.createOscillator(); o.type=t; o.frequency.value=mtof(m); const g=ctx.createGain(); g.gain.value=k; o.connect(g); g.connect(R.sw); o.start(); });
    const w=src(n.noise), f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=400; f.Q.value=1.2; R.air=ctx.createGain(); R.air.gain.value=0; w.connect(f); f.connect(R.air); R.air.connect(R.g); R.airF=f; }
  /* Ogive: a shimmer that keeps rising and never arrives */
  function roomOgive(){ const R=n.og={}; R.g=ctx.createGain(); R.g.gain.value=0; const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=300; R.g.connect(hp); hp.connect(n.comp);
    const s=ctx.createGain(); s.gain.value=.9; hp.connect(s); s.connect(n.revIn);
    R.os=[]; for(let i=0;i<6;i++){ const o=ctx.createOscillator(); o.type='sine'; const g=ctx.createGain(); g.gain.value=0; o.connect(g); g.connect(pan((i%2?.3:-.3),R.g)); o.start(); R.os.push({o,g,ph:i/6}); }
    const h=src(n.noise), hf=ctx.createBiquadFilter(); hf.type='bandpass'; hf.frequency.value=6500; hf.Q.value=.7; R.hiss=ctx.createGain(); R.hiss.gain.value=0; h.connect(hf); hf.connect(R.hiss); R.hiss.connect(R.g); }

  const L={music:0,water:0,waterF:2400,mus:9000,kr:0,ae:0,ph:0,og:0,wind:0};
  return {
    get on(){ return on; }, get ctx(){ return ctx; },
    async start(){ try{ init(); on=true; await ctx.resume(); set(n.master.gain,.9,1.2); }catch(e){ on=false; } },
    suspend(v){ if(!ctx) return; if(v){ set(n.master.gain,0,.15); setTimeout(()=>{ if(document.hidden&&ctx) ctx.suspend().catch(()=>{}); },400); } else { ctx.resume().then(()=>set(n.master.gain,.9,.6)).catch(()=>{}); } },
    levels(){ return ctx?{master:+n.master.gain.value.toFixed(3),mus:+n.mus.gain.value.toFixed(3),water:+n.water.gain.value.toFixed(3),waterF:Math.round(n.waterLP.frequency.value),kr:+n.kr.g.gain.value.toFixed(3),ae:+n.ae.g.gain.value.toFixed(3),ph:+n.ph.g.gain.value.toFixed(3),og:+n.og.g.gain.value.toFixed(3),state:ctx.state}:null; },
    /* every frame: where you are decides what you hear */
    update(dt,st){
      if(!ctx||!on) return;
      const t=ctx.currentTime;
      if(t>n.nextChord){ n.ci=(n.ci+1)%CH.length; n.nextChord=t+9+Math.random()*3; const C=CH[n.ci];
        n.voices.forEach((v,i)=>v.os.forEach((o,j)=>o.frequency.setTargetAtTime(mtof(C[i])*v.ratio[j],t,1.6))); n.bass.frequency.setTargetAtTime(mtof(ROOT[n.ci]),t,1.2); }
      if(t>n.nextNote){ const C=CH[n.ci]; const pick=()=>{ let m=PENTA[Math.floor(Math.random()*PENTA.length)]; return m; };
        const g=.03+Math.random()*.025*st.music, m=pick(); glass(m,t+.02,g,Math.random()*.8-.4);
        if(Math.random()<.35) glass(pick(),t+.32+Math.random()*.3,g*.7,Math.random()*.8-.4);
        if(Math.random()<.15) glass(C[3]+12,t+.05,g*.5,0);
        n.nextNote=t+2.2+Math.random()*4.2; }
      set(n.mus.gain,st.music*.9,.9); set(n.musLP.frequency,st.musF,.6);
      set(n.water.gain,st.water*.62,.7); set(n.waterLP.frequency,st.waterF,.5);
      set(n.wind.gain,st.wind*.06,.8);
      if(st.water>.3&&t>n.nextPlip){ plip(.018*st.water*(st.waterF>1500?1:.4)); n.nextPlip=t+.35+Math.random()*2.4; }
      if(st.birds>.2&&t>n.nextBird){ chirp(Math.random()*1.6-.8,.006*st.birds); n.nextBird=t+7+Math.random()*14; }
      /* rooms */
      set(n.kr.g.gain,st.kr*.55,.5); set(n.ae.g.gain,st.ae*.75,.5); set(n.ph.g.gain,st.ph*.6,.5); set(n.og.g.gain,st.og*.45,.5);
      if(st.kr>.01){ const w=VOICE.who; n.kr.v.forEach((v,i)=>{ const act=i===w?VOICE.env:0; set(v.env.gain,act*.32,.05);
          const base=i?118:158, ip=base*(1+.05*Math.sin(t*1.7+i)+.03*Math.sin(t*4.3+i*2)); v.o.frequency.setTargetAtTime(ip,t,.08); v.o2.frequency.setTargetAtTime(ip,t,.08);
          const vw=(Math.sin(t*2.3+i*1.7)*.5+.5), F=[[700,1150,2600],[400,1900,2550],[550,850,2400]]; const a=F[Math.floor(vw*2.99)];
          v.fs.forEach((b,k)=>b.frequency.setTargetAtTime(a[k]*(i?.9:1.05),t,.12)); }); }
      if(st.ae>.05&&t>n.ae.next){ chirp(Math.random()*1.2-.6,.011*st.ae); if(Math.random()<.3) chirp(Math.random()*1.2-.6,.007*st.ae); n.ae.next=t+1.2+Math.random()*3.5; }
      if(st.ph>.01){ const f=st.beam||0; set(n.ph.sw.gain,.35+.65*f,.2); set(n.ph.air.gain,f*.12,.15); set(n.ph.airF.frequency,300+f*900,.2); }
      if(st.og>.01){ for(const v of n.og.os){ v.ph=(v.ph+dt/11)%1; const f=520*Math.pow(2,v.ph*2.5); v.o.frequency.setTargetAtTime(f,t,.05); v.g.gain.setTargetAtTime(Math.sin(v.ph*Math.PI)*.05,t,.05); } set(n.og.hiss.gain,.025+st.rise*.04,.3); }
      set(n.warm.gain,st.warm*.09,.35); set(n.dark.gain,st.dark*.42,.25);
    },
    /* the hand */
    hover(){ if(!on) return; const m=PENTA[3+Math.floor(Math.random()*5)]; tone(mtof(m),.32,.016,'sine',0,0,.35,.004); tone(mtof(m)*2,.12,.004,'sine',0,0,0,.002); },
    click(){ if(!on) return; tone(560,.09,.05,'triangle',260,0,.15,.003); noise(.03,.03,2400,1800,'bandpass',2,0,.05); },
    drop(g=1){ if(!on) return; const t0=ctx.currentTime, f=620+Math.random()*180, o=ctx.createOscillator(), a=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(f,t0); o.frequency.exponentialRampToValueAtTime(f*2.3,t0+.05);
      a.gain.setValueAtTime(0,t0); a.gain.linearRampToValueAtTime(.075*g,t0+.004); a.gain.exponentialRampToValueAtTime(.0001,t0+.16);
      o.connect(a); a.connect(n.comp); const s=ctx.createGain(); s.gain.value=.65; a.connect(s); s.connect(n.revIn); o.start(t0); o.stop(t0+.2);
      tone(f*3.1,.06,.008*g,'sine',f*4,.012,.4,.002); },
    whoosh(up=true,dur=1.4,g=.07){ noise(dur,g,up?260:2600,up?2600:260,'bandpass',1,0,.5); },
    swell(){ if(!on) return; [62,66,69,74].forEach((m,i)=>tone(mtof(m),3.2,.03,'sine',0,i*.06,.8,.6)); noise(2.2,.05,200,2600,'lowpass',.7,0,.6); },
    open(){ if(!on) return; [57,62,66,69].forEach((m,i)=>tone(mtof(m),2.6,.028,'sine',mtof(m)*1.003,i*.05,.8,.35)); noise(1.4,.06,300,4200,'lowpass',.6,0,.6); },
    close(){ if(!on) return; noise(1.1,.05,3000,300,'lowpass',.6,0,.5); tone(mtof(62),1.6,.025,'sine',0,0,.7,.2); },
    index(){ if(!on) return; noise(.7,.04,600,2400,'bandpass',1.2,0,.4); tone(mtof(74),1.2,.02,'sine',0,.05,.7,.02); },
    tick(i){ if(!on) return; tone(mtof(PENTA[(i||0)%PENTA.length]),.25,.014,'sine',0,0,.4,.003); },
    pick(){ if(!on) return; glass(74,ctx.currentTime,.05,0,n.comp); glass(81,ctx.currentTime+.09,.03,0,n.comp); },
    rise(){ if(!on) return; noise(1.6,.05,180,1500,'bandpass',1.4,0,.6); glass(69,ctx.currentTime+.1,.03,-.2,n.comp); },
  };
})();

/* ================= FLOW + LOOP ================= */
let peerList=[], room=null, lastPres=0;
const WHITE=new T.Color(1,1,1);

/* ---------- boot: what the way in shows first is built behind the loader, and every shader it needs compiled and drawn
   once; the other worlds are made after (LATE, below) ---------- */
/* compile a scene's shaders without freezing the page, where the browser can do it in the background; never wait forever */
async function compileQuiet(sc,cam,sets){ try{
    /* a world drawn more than one way (Earth: its ink and its sun's shadow) has those sent off with it (for what is shown
       now: the drawing would make no others), and the wait is for every shader sent so far: a browser that makes them in
       the background makes them side by side, and none is then made on its own, holding the page, the first time it is
       drawn with */
    if(sets) intoTarget(()=>sc.traverseVisible(o=>{ if(!o.material||Array.isArray(o.material)||hasLight(o)) return;
      for(const f of sets){ const m=f(o); if(m&&m!==o.material){ const m0=o.material; o.material=m; try{ renderer.compile(o,cam,sc); }catch(e){} finally{ o.material=m0; } } } }));
    if(renderer.compileAsync) await Promise.race([intoTarget(()=>renderer.compileAsync(sc,cam)).then(programsReady),wait(8000)]); else intoTarget(()=>renderer.compile(sc,cam)); }catch(e){} }
/* every shader sent off so far is made (at once, where the browser makes them as they are first drawn with) */
const programsReady=()=>new Promise(res=>{ const ck=()=>{ let ok=true; try{ ok=renderer.info.programs.every(p=>p.isReady()); }catch(e){} if(ok) res(); else setTimeout(ck,10); }; ck(); });
/* what each way in shows first: Land, Earth; Fly, the orbit round the hole (U); the rocket from the walk, the orbit with Aetos
   ahead of you */
const FIRST={land:['cr'],aetos:['U','ae'],fly:['U']};
const worldName=id=>id==='cr'?'Earth':(STA.find(s=>s.id===id)||{}).name||id;
/* a world drawn once into a small target of the same kind, so its textures are sent and every shader it draws with is made,
   and nothing stalls the first time you see it. full: entered and left again round it, as it will be when you arrive; that
   is done behind the loader, or the moment the world is wanted; otherwise a station is only drawn as it stands, which
   touches nothing you can see or hear */
let warmRT=null;
function warmWorld(id,full){
  if(id==='U'){ universeVisible(1); U.belt.visible=true; U.probe.visible=U.trail.visible=U.dust.visible=U.streak.visible=true;
    renderer.setRenderTarget(rtA); renderer.render(U.scene,hubCam);
    universeVisible(0); U.probe.visible=U.trail.visible=U.dust.visible=U.streak.visible=false; return; }
  const st=ST[id]; if(!st) return; if(!warmRT){ warmRT=mkRT(); warmRT.setSize(64,64); }
  if(full){ st.enter(); st.update(.016,0); }
  stCam.position.copy(st.camP); stCam.lookAt(st.camL); setPx(stCam);
  try{ intoTarget(()=>renderer.compile(st.scene,stCam)); }catch(e){}
  if(st.render&&full){ try{ st.render(warmRT); }catch(e){ console.error('render '+id,e); } } else { renderer.setRenderTarget(warmRT); renderer.render(st.scene,stCam); }
  if(full) st.exit(); }
async function boot(){
  const mark=$('#mark'), bootEl=$('#boot'), txt={set textContent(v){ bootEl.textContent=v; }}; // the mark's weight is the progress bar; one quiet line says what is being built
  mark.textContent=''; [...'Heloria'].forEach(ch=>{ const c=document.createElement('span'); c.className='c'; c.textContent=ch; mark.appendChild(c); });
  const setP=v=>{ mark.style.fontWeight=Math.round(100+700*v); };
  setP(0); try{ await Promise.race([document.fonts.ready,wait(2500)]); }catch(e){}
  resize();
  txt.textContent='Tracing geodesics'; await nextFrame();
  try{ BH.makeSky(); }catch(e){ console.warn('sky',e); } BH.render(hubCam); renderer.setRenderTarget(null); setP(.1);
  const first=FIRST[S.entry]||FIRST.fly, sts=first.filter(id=>id!=='U'&&ST[id]);
  for(let i=0;i<sts.length;i++){ const id=sts[i]; txt.textContent='Building '+worldName(id); await nextFrame(); try{ await ST[id].build(); }catch(err){ console.error('build '+id,err); delete ST[id]; } setP(.1+.5*(i+1)/sts.length); }
  if(first.includes('U')){ txt.textContent='Compiling shaders'; await nextFrame();
    universeVisible(1); U.belt.visible=true; U.probe.visible=U.trail.visible=U.dust.visible=U.streak.visible=true;
    await compileQuiet(U.scene,hubCam); warmWorld('U'); worldOf('U').stage=4; }
  setP(.7);
  for(let i=0;i<sts.length;i++){ const id=sts[i]; if(!ST[id]) continue; txt.textContent='Warming '+worldName(id); await nextFrame(); await compileQuiet(ST[id].scene,stCam,ST[id].matSets);
    warmWorld(id,true); worldOf(id).stage=4; setP(.7+.3*(i+1)/sts.length); }
  sts.forEach(id=>{ worldOf(id).stage=4; });
  renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  /* the rest, in the order you can come to them: the orbit (from Earth), Aetos (where the radar leads you first), the other
     stations, and Earth (past the horizon, at the end) */
  LATE.q=['U','ae',...STA.map(s=>s.id).filter(id=>id!=='ae'),'cr'].filter((id,i,a)=>a.indexOf(id)===i&&!lateReady(id)&&(id==='U'||ST[id]));
  try{ await A.firstReady(); }catch(e){}   // (what you hear first, made: see firstReady)
  setP(1); $('#load').classList.add('ready'); S.ready=true; setTimeout(()=>{ bootEl.textContent=''; },700);   // the build line fades, then goes
}

/* ---------- the other worlds, made after the loader ----------
   Behind the loader (it covers the screen) a step every frame; once you are in, a step only at a quiet moment: nothing
   touched for a little while, and nothing moving that a pause would show (a chapter turning, a flight on autopilot, a walk,
   a game, a scene). A step is one world built, or its shaders compiled, or some of them linked (a few milliseconds' worth),
   or the world drawn once. A world you go to before it is made is made that moment: behind a white that stays a moment
   longer (into orbit from Earth, or on to Earth past the horizon), or with the probe held at the station (docking). The
   frame timer never counts these frames against the device */
const LATE={q:[],W:{},need:[],busy:false,after:0,lastIn:-1e9,qm:0,dockW:null,log:[],mode:'',modeAt:0};
function worldOf(id){ return LATE.W[id]||(LATE.W[id]={id,stage:0,cbs:[]}); }   // stage: 0 to build, 1 to compile, 2 to link, 3 to draw once, 4 made
const lateReady=id=>worldOf(id).stage>=4;
function lateNeed(id){ const w=worldOf(id); if(w.stage<4&&id!=='U'&&!ST[id]) w.stage=4; if(w.stage>=4) return Promise.resolve();
  if(!LATE.need.includes(id)) LATE.need.push(id); return new Promise(r=>w.cbs.push(r)); }
['pointerdown','wheel','keydown','touchstart','touchmove'].forEach(ev=>addEventListener(ev,()=>{ LATE.lastIn=performance.now(); },{capture:true,passive:true}));
/* anything held (a key, a button, a finger) is not a quiet moment however long it is held */
const HELD=new Set(); addEventListener('keydown',e=>HELD.add('k'+e.code),{capture:true,passive:true}); addEventListener('keyup',e=>HELD.delete('k'+e.code),{capture:true,passive:true});
addEventListener('pointerdown',e=>HELD.add('p'+e.pointerId),{capture:true,passive:true}); ['pointerup','pointercancel'].forEach(ev=>addEventListener(ev,e=>HELD.delete('p'+e.pointerId),{capture:true,passive:true}));
addEventListener('blur',()=>HELD.clear());
addEventListener('pointermove',e=>{ if(e.buttons||e.pointerType==='mouse'||S.mode==='load') LATE.lastIn=performance.now(); },{capture:true,passive:true});   // (a hand moving the mouse is about to do something: the worlds still to make wait until it rests)
function lateCalm(now){ if(S.mode!==LATE.mode){ LATE.mode=S.mode; LATE.modeAt=now; }
  if(S.mode==='load') return now-LATE.lastIn>1500;   // behind the loader any time, except while you are reaching for it: then you come first
  if(now-LATE.lastIn<2500||HELD.size) return false;
  if(now-LATE.modeAt<3000) return false;   // nothing just after you arrive anywhere: what plays then (the seal giving, a guide) is let play
  if(S.mode==='story') return !(story.busy>0)&&S.ch!==3;   // (the last chapter is a scene: the probe creeping in, the alarm)
  if(S.mode==='hub') return !S.ap&&!LATE.dockW&&!(SB.t>=0);   // (nor while the seal breaks)
  if(S.mode==='station') return !!S.st&&(S.st.calm?S.st.calm():S.st.state==='menu');
  return false; }
/* may this world be drawn once here: behind the loader, any; the orbit while you are on Earth; a station as it stands while
   you are in orbit or the story; Earth only behind the loader or when it is wanted */
function lateDrawOK(id){ if(S.mode==='load') return true; if(id==='U') return S.mode==='station'; if(id==='cr') return false; return !S.st&&(S.mode==='story'||S.mode==='hub'); }
/* the shaders compiled ahead of time are linked a few at a time; where the browser compiles in the background, only those it
   has finished, so nothing waits on the graphics chip at all */
const LINKED=new WeakSet(); let PAR=null;
function linkSome(ms){ if(PAR===null){ try{ PAR=!!renderer.getContext().getExtension('KHR_parallel_shader_compile'); }catch(e){ PAR=false; } }
  const t0=performance.now(); let left=false;
  for(const p of renderer.info.programs){ if(LINKED.has(p)) continue; if(PAR&&!p.isReady()){ left=true; continue; }
    /* linked, and taken up only if it linked: a shader three made that can never link (none is drawn with) is left alone,
       as it always was, rather than reported */
    try{ const gl=renderer.getContext(); if(gl.getProgramParameter(p.program,gl.LINK_STATUS)) p.getUniforms(); }catch(e){} LINKED.add(p); if(performance.now()-t0>ms){ left=true; break; } }
  return left; }
/* a world's shaders compiled a few objects at a time, and each object's linked at once, so the graphics chip's work comes in
   small pieces rather than all of the world's in one (asking about the first would wait for every one sent before it). An
   object with a light of its own waits for the whole scene at the end: three would count its light twice (from the scene and
   from the object). A world drawn more than one way (Earth: its ink and its sun's shadow) has those compiled with it */
const hasLight=o=>{ let l=false; o.traverse(x=>{ if(x.isLight) l=true; }); return l; };
function compileSome(w,ms){ const id=w.id, sc=id==='U'?U.scene:ST[id].scene, cam=id==='U'?hubCam:stCam, sets=id==='U'?null:ST[id].matSets;
  if(!w.objs){ w.objs=[]; sc.traverse(o=>{ if(o.material&&!Array.isArray(o.material)&&!hasLight(o)) w.objs.push(o); }); w.oi=0; }
  const t0=performance.now();
  intoTarget(()=>{ while(w.oi<w.objs.length){ const o=w.objs[w.oi++];
      try{ renderer.compile(o,cam,sc); if(sets) for(const f of sets){ const m=f(o); if(m&&m!==o.material){ const m0=o.material; o.material=m; try{ renderer.compile(o,cam,sc); } finally{ o.material=m0; } } } }catch(e){}
      linkSome(1e9,true); if(performance.now()-t0>ms) break; } });
  return w.oi<w.objs.length; }
async function lateStep(w,force){ const id=w.id, st=ST[id], ms=force?1e9:S.mode==='load'?30:8;
  if(id!=='U'&&!st) w.stage=4;
  else if(w.stage===0){ if(id!=='U'){ st.pace=()=>latePace(id); try{ await st.build(); }catch(err){ console.error('build '+id,err); delete ST[id]; w.stage=4; } delete st.pace; } if(w.stage<4) w.stage=1; }
  else if(w.stage===1){ if(!compileSome(w,ms)){ w.objs=null; await compileQuiet(id==='U'?U.scene:st.scene,id==='U'?hubCam:stCam); w.stage=2; } }
  else if(w.stage===2){ if(!linkSome(ms)) w.stage=3; }
  else if(w.stage===3){ warmWorld(id,force||S.mode==='load'); w.stage=4; }
  if(w.stage>=4) w.cbs.splice(0).forEach(f=>f()); }
/* a world built in parts (Earth) waits between them for the next quiet frame, or for none once anything is wanted now */
function latePace(id){ return new Promise(r=>{ const go=()=>{ if(LATE.need.length||lateCalm(performance.now())) r(); else requestAnimationFrame(go); }; requestAnimationFrame(go); }); }
/* the next step to take now, if there is one: what is wanted first, whatever is happening; otherwise, at a quiet moment, the
   next world in the order you can come to them */
function lateNext(now){ LATE.need=LATE.need.filter(id=>!lateReady(id));
  if(LATE.need.length) return [worldOf(LATE.need[0]),true];
  if(now<LATE.after||!lateCalm(now)) return null;
  if(holeOpen()&&LATE.q[LATE.q.length-1]==='cr') LATE.q.unshift(LATE.q.pop());   // the horizon is open: Earth is next
  for(const id of LATE.q){ const x=worldOf(id); if(x.stage>=4) continue; if(id!=='U'&&!ST[id]){ x.stage=4; continue; } if(x.stage===3&&!lateDrawOK(id)) continue; return [x,false]; }
  if(warmRT&&LATE.q.every(lateReady)){ warmRT.dispose(); warmRT=null; } return null; }
/* once a frame, a moment after it is drawn: a step. Behind the loader, or for a world wanted now, the steps then follow each
   other with only a pause for anything you do in between (the loader covers the screen; what is wanted is waited for);
   at a quiet moment, one */
function lateTick(now){ if(!S.ready||LATE.busy) return; let n=lateNext(now); if(!n) return;
  LATE.busy=true;
  setTimeout(async()=>{
    while(n){ const [w,force]=n, s0=w.stage, t1=performance.now(); try{ await lateStep(w,force); }catch(e){ console.error('late '+w.id,e); w.stage=4; w.cbs.splice(0).forEach(f=>f()); }
      const t=performance.now(); if(LATE.log.length<400) LATE.log.push([w.id,s0,Math.round(t-t1),S.mode,force?1:0]); LATE.qm=t+400; LATE.after=t+(force||S.mode==='load'||t-t1<40?0:250);   // after a long step, a few frames' rest
      if(!(force||S.mode==='load')) break; await (S.mode==='load'&&!force?new Promise(r=>requestAnimationFrame(()=>r())):wait(0)); /* behind the loader, a frame between steps, so it breathes and answers you */ n=lateNext(performance.now()); if(n&&!n[1]&&S.mode!=='load') n=null; }
    LATE.busy=false; },0); }

/* ---------- three ways in, chosen at the front door: the whole story (Fly), straight down to Earth (#land), or into
   orbit at Aetos, where the rocket at the end of the walk goes (#aetos). Land opens in its own daylight, the colour the
   front door left you in ---------- */
S.entry=({'#land':'land','#aetos':'aetos'})[location.hash]||'__ENTRY__'||'fly';   // the build fills in a preview's own way in
if(S.entry==='land') document.documentElement.classList.add('landing');
/* on the site the address says where you are: /land, or /fly (the rocket from the walk goes to /fly too). The page itself
   lives at untamed/, so its own address is kept to come back to; reloading /land or /fly goes to the front door */
const PAGE_URL=location.pathname, PRETTY='__PRETTY__'&&/^\/untamed\/(index\.html)?$/.test(PAGE_URL);   // only where the site is the whole domain
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
  /* Earth is made last, on the way round: if it is not made yet, the white at the end of the fall holds while it is */
  if(!lateReady('cr')){ if(!LATE.holdE){ LATE.holdE=true; S.flashMin=1; lateNeed('cr').then(()=>{ LATE.holdE=false; S.flashMin=0; enterEarth(); }); } return; }
  S.mode='station'; S.stId='cr'; S.st=st; S.iris=3; S.arrive=0; S.stSnap=true; S.flash=1; post.uniforms.uStretch.value=0; post.uniforms.uIrisCol.value.set('#FFC392'); cine(false);
  st.enter(); if(st.cutscene) st.cutscene(); show('#station',true); st.showUI(); where('Earth'); }
/* and back: a flash of white, and you are in orbit again */
function leaveEarth(){ const st=ST.cr; if(S.stId!=='cr'||!st) return; st.abort(); st.hideUI(); A.hush(); A.whoosh(false,1.3); S.flash=1;
  show('#station',false); st.el.classList.remove('on'); st.exit(); S.st=null; S.stId=null; S.iris=0; S.mode='story'; U.probe.visible=U.trail.visible=true; const lead=!S.docked.has('ae');
  /* the orbit not made yet (you came in by Land): the white holds while it is */
  if(!lateReady('U')){ S.mode='white'; S.flashMin=1; lateNeed('U').then(()=>{ S.flashMin=0; S.mode='story'; U.probe.visible=U.trail.visible=true; toHub(lead); if(!lead) toast('Back in orbit'); }); return; }
  toHub(lead); if(!lead) toast('Back in orbit'); }

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
  if(needA&&S.mode!=='load'&&S.mode!=='white'){ BH.render(hubCam); setPx(hubCam); renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(U.scene,hubCam); }
  if(needB){ setPx(stCam); if(S.st.render) S.st.render(rtB); else { renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(S.st.scene,stCam); } } // a station may draw itself (Earth inks its own lines)
  post.uniforms.uIris.value=S.st?S.iris:0;
  renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  lateTick(now);
  requestAnimationFrame(frame);
}
hubCam.position.set(0,.4,90); hubCam.lookAt(0,0,0);
requestAnimationFrame(frame);
boot();
/* test helper: straight into a station with no transitions */
function jump(id){
  const s=STA.find(x=>x.id===id), st=ST[id]; if(!st||!S.ready) return false;
  if(!lateReady(id)) return lateNeed(id).then(()=>jump(id));   // its world made first
  ['#load','#story','#hub'].forEach(q=>show(q,false)); show('#chrome',true); A.start();
  if(S.st&&S.st!==st){ S.st.abort(); S.st.exit(); S.st.el.classList.remove('on'); }
  S.mode='station'; S.stId=id; S.st=st; S.iris=3; S.arrive=0; S.stSnap=true; S.docked.add(id);
  post.uniforms.uIrisCol.value.set(s?s.color:'#FFC392'); st.enter(); show('#station',true); st.showUI(); where(s?s.name:'Earth'); return true;
}
window.__heloria={late:()=>({ready:LATE.q.every(lateReady),q:LATE.q.map(id=>id+':'+worldOf(id).stage).join(' '),busy:LATE.busy,log:LATE.log}),A,SB,finaleWhite,credits,jump,enterEarth,leaveEarth,crossHorizon,storyUnlock:()=>{ story.busy=0; },S,ST,U,STA,post,BH,renderer,stCam,hubCam,rtA,rtB,postScene,ortho,dock:id=>dock(STA.find(x=>x.id===id)),toHub,undock,goChapter,escape};

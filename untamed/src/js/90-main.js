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

/* ---------- ?debug: a small panel for finding out what the sound needs on a given device ----------
   It shows how fast the page draws, the sound's state and the browser's own count of sound underruns, and lets you, while
   listening, stop the 3D drawing (2), draw at half rate (3), or at half resolution (4); 1 puts everything back */
const DBG={on:/[?&]debug\b/.test(location.search),mode:0,n:0,drawn:0,frames:0,maxMs:0,lastT:0,u0:null,
  draws(){ this.frames++; if(!this.on) { this.drawn++; return true; } const d=this.mode!==2&&!(this.mode===3&&(this.n++&1)); if(d) this.drawn++; return d; },
  set(m){ if(this.mode===4&&m!==4){ DPR=this.dpr0; resize(); } if(m===4&&this.mode!==4){ this.dpr0=DPR; DPR=Math.max(.5,DPR/2); resize(); } this.mode=m; this.paint(); },
  paint(){ if(!this.el) return; const c=A.ctx, ps=c&&c.playbackStats, now=performance.now(), sec=Math.max(.001,(now-this.lastT)/1000);
    const u=ps?ps.underrunEvents:null, ud=ps?ps.underrunDuration:null; const du=this.u0&&u!=null?u-this.u0[0]:null, dud=this.u0&&ud!=null?(ud-this.u0[1])*1000:null; if(u!=null) this.u0=[u,ud];
    const E=A._em, mus=E&&E.el?(E.el.paused?'recording, paused':'recording, playing'):'live';
    this.el.innerHTML=`<b>Heloria sound check</b><br>drawing: ${['every frame','stopped','half rate','half resolution'][this.mode===4?3:this.mode===3?2:this.mode===2?1:0]}<br>frames drawn ${Math.round(this.drawn/sec)}/s of ${Math.round(this.frames/sec)}/s, slowest ${Math.round(this.maxMs)} ms<br>sound ${c?c.state:'not started'}${c?`, ${c.sampleRate} Hz, buffer ${Math.round((c.baseLatency||0)*1000)}+${Math.round((c.outputLatency||0)*1000)} ms`:''}<br>${ps?`underruns ${du==null?'-':du}/s (${dud==null?'-':Math.round(dud)} ms), total ${u}`:'underrun count: not available in this browser'}<br>music: ${mus}<br><span style="opacity:.7">1 all on · 2 stop drawing · 3 half rate · 4 half resolution</span>`;
    this.drawn=0; this.frames=0; this.maxMs=0; this.lastT=now; },
  init(){ if(!this.on) return; const el=this.el=document.createElement('div'); el.id='dbg'; el.style.cssText='position:fixed;left:10px;bottom:10px;z-index:99;padding:10px 12px;background:rgba(0,0,0,.78);color:#fff;font:12px/1.5 ui-monospace,monospace;border-radius:6px;pointer-events:auto;max-width:360px';
    document.body.appendChild(el); addEventListener('keydown',e=>{ const m={Digit1:0,Digit2:2,Digit3:3,Digit4:4}[e.code]; if(m!=null) this.set(m); },true);
    el.addEventListener('click',e=>{ e.stopPropagation(); this.set((this.mode===0?2:this.mode===2?3:this.mode===3?4:0)); });   // on a phone: tap the panel to step through the four
    let pt=performance.now(); const tick=()=>{ const t=performance.now(); this.maxMs=Math.max(this.maxMs,t-pt); pt=t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    this.lastT=performance.now(); setInterval(()=>this.paint(),1000); } };
DBG.init();

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
  if(DBG.draws()){
  { const tn=performance.now()/1000; rtLive(rtA,needA,tn,RTS); rtLive(rtB,needB,tn,S.st&&S.st.render?0:RTS); bhLive(needA,tn); }
  if(needA&&S.mode!=='load'){ BH.render(hubCam); setPx(hubCam); renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(U.scene,hubCam); }
  if(needB){ setPx(stCam); if(S.st.render) S.st.render(rtB); else { renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(S.st.scene,stCam); } } // a station may draw itself (Earth inks its own lines)
  post.uniforms.uIris.value=S.st?S.iris:0;
  renderer.setRenderTarget(null); renderer.render(postScene,ortho); }
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

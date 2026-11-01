/* ================= FLOW + LOOP ================= */
let peerList=[], room=null, db=null, me=null, lastPres=0;
const beats=$$('#intro .beat'), progs=$$('#intro .prog b');
let holding=false;

/* ---------- boot: build everything and prewarm every shader before the first frame matters ---------- */
async function boot(){
  const bar=$('#ldBar'), pct=$('#ldPct'), txt=$('#ldTxt'); let p=0;
  const setP=v=>{ p=v; bar.style.setProperty('--p',v); pct.textContent=String(Math.round(v*100)).padStart(3,'0'); };
  reveal($('#enter .wrap')); split($('#word')); reveal($('#word'));
  const steps=[['Kríos',()=>ST.kr.build()],['Ogive',()=>ST.og.build()],['Aetos',()=>ST.ae.build()],['Crew',()=>ST.cr.build()],['Beacon',()=>ST.be.build()]];
  for(let i=0;i<steps.length;i++){ txt.textContent='Building '+steps[i][0]; await nextFrame(); await steps[i][1](); setP((i+1)/(steps.length+3)); }
  txt.textContent='Loading type'; try{ await Promise.race([document.fonts.ready,wait(2500)]); }catch(e){}
  setP((steps.length+1)/(steps.length+3)); await nextFrame();
  txt.textContent='Compiling shaders';
  // render every scene once so programs compile and buffers upload now, not on first dock
  const prevVis=STA.map(s=>s.grp.visible); universeVisible(1); U.belt.visible=true; U.probe.visible=U.trail.visible=U.dust.visible=true;
  try{ renderer.compile(U.scene,hubCam); }catch(e){}
  renderer.setRenderTarget(rtA); renderer.render(U.scene,hubCam);
  universeVisible(0); U.probe.visible=U.trail.visible=U.dust.visible=false; STA.forEach((s,i)=>s.grp.visible=prevVis[i]);
  setP((steps.length+2)/(steps.length+3)); await nextFrame();
  for(const id of ['kr','og','ae','cr','be']){ const st=ST[id]; st.enter(); st.update(.016,0,.016); stCam.position.copy(st.camP); stCam.lookAt(st.camL);
    try{ renderer.compile(st.scene,stCam); }catch(e){} renderer.setRenderTarget(rtB); renderer.render(st.scene,stCam); st.exit&&st.exit(); await nextFrame(); }
  ['next step','um','book the demo'].forEach(w=>{ const s=textSprite(w,w==='um'?'bad':w==='book the demo'?'gold':'good'); ST.kr.scene.add(s); renderer.render(ST.kr.scene,stCam); ST.kr.scene.remove(s); s.material.dispose(); });
  renderer.setRenderTarget(null);
  setP(1); txt.textContent='Universe ready'; $('#enterRow').setAttribute('aria-busy','false'); $('#enterSound').focus({preventScroll:true});
  S.ready=true;
}

/* ---------- enter + gate ---------- */
function enter(sound){ if(!S.ready) return; A.enable(sound); A.whoosh(true,1.6,.18); show('#enter',false); show('#chrome',true); $('#frame').classList.add('on');
  S.mode='gate'; S.gateT=0; setTimeout(()=>{ show('#gate',true); reveal($('#gate')); },500); }
$('#enterSound').addEventListener('click',()=>enter(true));
$('#enterQuiet').addEventListener('click',()=>enter(false));
const hb=$('#holdBtn');
const startHold=e=>{ if(S.mode!=='gate') return; holding=true; $('#gate').classList.add('holding'); if(e&&e.preventDefault) e.preventDefault(); };
const endHold=()=>{ holding=false; $('#gate').classList.remove('holding'); };
hb.addEventListener('pointerdown',startHold); addEventListener('pointerup',endHold); addEventListener('pointercancel',endHold);
canvas.addEventListener('pointerdown',e=>{ if(S.mode==='gate') startHold(e); });
addEventListener('keydown',e=>{ if(e.code==='Space'&&S.mode==='gate'){ startHold(); e.preventDefault(); } });
addEventListener('keyup',e=>{ if(e.code==='Space') endHold(); });
function collapse(){
  S.mode='forming'; endHold(); unreveal($('#gate')); setTimeout(()=>show('#gate',false),400); A.hold(0); A.boom(); S.flash=1.15; S.formT=0; S.shockT=0; feedback(1.2,1.5);
  post.uniforms.uGrade.value.set(1,1,1); // the colour snaps back the instant the star goes
  setTimeout(()=>{ S.mode='intro'; S.intro=S.introT=0; show('#intro',true); },RM?300:2700);
}

/* ---------- intro (virtual scroll) ---------- */
addEventListener('wheel',e=>{ if(S.mode==='intro'){ S.introT=clamp(S.introT+e.deltaY*.00042,0,1); e.preventDefault(); } },{passive:false});
let tY=null;
addEventListener('touchstart',e=>{ tY=e.touches[0].clientY; },{passive:true});
addEventListener('touchmove',e=>{ if(S.mode==='intro'&&tY!==null){ const y=e.touches[0].clientY; S.introT=clamp(S.introT+(tY-y)*.0016,0,1); tY=y; } },{passive:true});
addEventListener('keydown',e=>{ if(S.mode==='intro'&&['ArrowDown','PageDown','Space','Enter'].includes(e.code)){ S.introT=clamp(S.introT+.09,0,1); e.preventDefault(); } if(S.mode==='intro'&&['ArrowUp','PageUp'].includes(e.code)) S.introT=clamp(S.introT-.09,0,1); });
$('#launchProbe').addEventListener('click',()=>toHub());
$('#skip').addEventListener('click',()=>toHub());
let beatOn=-1;
function spawnProbe(r=10,a=2.6){ const P=S.probe; P.p.set(Math.cos(a)*r,0,Math.sin(a)*r); const vc=Math.sqrt(GM/r); P.v.set(-Math.sin(a)*vc,0,Math.cos(a)*vc); P.head=Math.atan2(-P.v.x,-P.v.z); S.yaw=Math.atan2(P.p.x,P.p.z);
  for(let i=0;i<TRL;i++){ U.trailPos[i*3]=P.p.x;U.trailPos[i*3+1]=0;U.trailPos[i*3+2]=P.p.z; } U.trailG.attributes.position.needsUpdate=true; U.probe.position.copy(P.p); }
function toHub(){
  if(S.mode!=='intro'&&S.mode!=='beyond') return;
  const was=S.mode; S.mode='tohub'; S.hubT=0; spawnProbe(); A.whoosh(true,1.8,.2); cine(true);
  fromP.p.copy(hubCam.position); fromP.q.copy(hubCam.quaternion); fromP.fov=hubCam.fov;
  if(was==='intro'){ unreveal(beats[beatOn]||beats[3]); setTimeout(()=>show('#intro',false),500); }
  U.probe.visible=U.trail.visible=U.dust.visible=true; S.introT=1;
}

/* ---------- horizon easter egg ---------- */
function crossHorizon(){ if(S.mode!=='hub') return; S.mode='falling'; S.fallT=0; S.ap=null; show('#hub',false); cine(true); $('#warn').classList.remove('on'); }
function hzLeave(){ show('#horizon',false); S.stretch=0; post.uniforms.uStretch.value=0; U.probe.visible=U.trail.visible=true; }
$('#hzBack').addEventListener('click',()=>{ hzLeave(); toHub(); toast('Respawned at 10 r_s'); });
$('#hzBeacon').addEventListener('click',()=>{ hzLeave(); const b=STA[4]; S.mode='hub'; spawnProbe(b.R+2.5,b.a); chasePose(chase); hubBase.p.copy(chase.p); hubBase.q.copy(chase.q); hubCam.position.copy(chase.p); hubCam.quaternion.copy(chase.q); show('#hub',true); cine(false); dock(b); });

/* ---------- mail + signals ---------- */
$('#mail').addEventListener('click',async()=>{ const out=$('#copied');
  try{ await navigator.clipboard.writeText('contact@helorialabs.com'); out.textContent='Copied to clipboard'; }
  catch(e){ const r=document.createRange(); r.selectNodeContents($('#mail')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); out.textContent='Selected. Press Ctrl+C or ⌘C'; }
  setTimeout(()=>out.textContent='Click the address to copy it',2600); });
$('#sig').addEventListener('submit',async e=>{
  e.preventDefault(); const out=$('#sgOut'); const name=$('#sgName').value.trim().slice(0,40), link=$('#sgLink').value.trim().slice(0,200);
  if(!name||!/^https?:\/\/\S+\.\S+/.test(link)){ out.textContent='Add your name and a full link starting with https://'; A.beep(220); return; }
  if(!db||!me){ out.textContent='Signals need a signed-in view. Email us instead.'; return; }
  $('#sgBtn').disabled=true; out.textContent='Transmitting…'; ST.be.fire(); A.launch();
  try{ await db.collection('signals').doc(me).set({name,link,t:Date.now()}); out.textContent='Signal received. It is orbiting the beacon now.'; A.chord(); S.flash=Math.max(S.flash,.25); }
  catch(err){ out.textContent='That did not send. Email us instead.'; }
  $('#sgBtn').disabled=false;
});
function presenceTick(){ if(!room||S.t-lastPres<.25) return; lastPres=S.t; room.presence({x:+S.probe.p.x.toFixed(2),z:+S.probe.p.z.toFixed(2),mode:S.mode==='hub'?'hub':'away'}).catch(()=>{}); }
function drawPeers(){
  let k=0; peerList.forEach(p=>{ if(p.sameTab||k>=MAXP) return; const pr=p.presence||{}; if(typeof pr.x!=='number'||typeof pr.z!=='number'||pr.mode!=='hub') return; U.peerPos.set([pr.x,0,pr.z],k*3); k++; });
  for(let i=k;i<MAXP;i++) U.peerPos.set([9999,9999,9999],i*3); U.peerG.attributes.position.needsUpdate=true;
  const others=peerList.filter(p=>!p.sameTab).length; $('#peers').textContent=others?`${others} other ${others===1?'probe':'probes'} in orbit`:'';
}
(async()=>{
  if(!window.claude||!window.claude.use) return;
  try{ room=await window.claude.use('room'); if(room) room.onPeers(c=>{ peerList=c.peers; drawPeers(); },()=>{ room=null; }); }catch(e){ room=null; }
  try{ db=await window.claude.use('db'); const user=await window.claude.use('user'); me=user?await user.id():null;
    if(db) db.collection('signals').orderBy('t','desc').limit(200).onSnapshot(s=>{ U.sigU.uCount.value=s.size; ST.be.setCount(s.size); $('#sgOut').textContent=s.size?`${s.size} ${s.size===1?'signal':'signals'} in orbit`:''; },()=>{});
  }catch(e){ db=null; }
})();
window.__onResize=()=>{ window.__crLayout&&window.__crLayout(); };

/* ---------- main loop ---------- */
const WHITE=new T.Color(1,1,1), stPos=new T.Vector3(), stLook=new T.Vector3(), camI=new T.Vector3(), tgtI=new T.Vector3(), qI=new T.Quaternion();
let last=performance.now(), radarK=0;
function frame(now){
  const raw=(now-last)/1000; last=now; const rdt=Math.min(.1,raw), dt=Math.min(.05,raw); S.rdt=rdt; S.t+=dt; const t=S.t;
  G.uTime.value=RM?t*.35:t; QM.tick(raw*1000,now); cursorTick();
  updateStations(t);
  // the star, the collapse and the disk
  if(S.formT!==null&&S.form<1){ S.formT+=rdt; S.form=Math.min(1,S.formT/(RM?.3:3.2)); }
  if(S.mode==='gate'){ S.hold=holding?Math.min(1,S.hold+rdt/2.3):Math.max(0,S.hold-rdt*1.1); hb.style.setProperty('--p',S.hold); $('#holdTxt').textContent=S.hold>0?Math.round(S.hold*100)+'%':'Hold'; A.hold(S.hold);
    post.uniforms.uGrade.value.setRGB(1+S.hold*.25,1-S.hold*.25,1-S.hold*.35); post.uniforms.uVig.value=1+S.hold*.6; if(S.hold>=1) collapse(); }
  else { S.hold=Math.max(0,S.hold-rdt*3); post.uniforms.uVig.value=damp(post.uniforms.uVig.value,1,4,rdt); }
  U.bhU.uHold.value=S.hold; U.bhU.uForm.value=S.form; U.bhU.uBurst.value=RM?0:1; U.hole.scale.setScalar(Math.max(.001,sstep(.15,.6,S.form)));
  if(S.shockT!==undefined){ S.shockT+=rdt; U.shockU.uS.value=1+E.o(clamp(S.shockT/1.6,0,1))*42; U.shockU.uO.value=1-clamp(S.shockT/1.6,0,1); }
  let lens=0;
  if(S.mode==='enter'||S.mode==='gate'||S.mode==='forming'){
    if(S.mode!=='enter') S.gateT=(S.gateT||0)+rdt;
    const ez=S.mode==='enter'?70:lerp(70,30,E.io(clamp(S.gateT/2.4,0,1)));
    const sh=S.hold*S.hold*.12*(RM?0:1);
    hubBase.p.set(Math.sin(t*.1)*.6,1.2+S.form*1.2,ez-S.form*12-S.hold*4); lookQ(hubBase.p,tv[0].set(0,0,0),hubBase.q);
    hubCam.position.copy(hubBase.p).add(tv[1].set((Math.random()-.5)*sh,(Math.random()-.5)*sh,0)); hubCam.quaternion.copy(hubBase.q); lens=S.form;
  }
  else if(S.mode==='intro'){
    S.intro=damp(S.intro,S.introT,RM?50:3,rdt); const v=S.intro;
    let cur=-1; beats.forEach((b,i)=>{ if(v>=+b.dataset.a&&v<+b.dataset.b) cur=i; });
    if(cur!==beatOn){ if(beatOn>=0) unreveal(beats[beatOn]); if(cur>=0){ reveal(beats[cur]); A.whoosh(true,.8,.08); } beatOn=cur; }
    progs.forEach((p,i)=>p.style.setProperty('--p',clamp((v-[0,.26,.51,.76][i])/.24,0,1)));
    $('#cue').style.opacity=1-sstep(.05,.15,v);
    const k1=sstep(.18,.5,v), k2=sstep(.5,.86,v);
    camI.set(lerp(lerp(-3.4,5.4,k1),0,k2),lerp(lerp(2.2,.45,k1),26,k2),lerp(lerp(17.5,5.2,k1),30,k2));
    tgtI.set(lerp(lerp(-4.2,-2,k1),0,k2),lerp(-.2,-4,k2),0);
    if(NARROW()){ camI.x*=.2; tgtI.x=0; camI.z*=1.3; tgtI.y-=1.6; }
    hubCam.position.copy(camI); hubCam.lookAt(tgtI); hubCam.rotateZ(Math.sin(k1*Math.PI)*.12*(RM?0:1));
    hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion);
    universeVisible(k2); U.gridU.uDip.value=k2; STA.forEach(s=>s.el.style.display='none');
    A.wind(Math.abs(S.introT-S.intro)*3); lens=1;
  }
  else if(S.mode==='tohub'){
    S.hubT+=rdt; const k=E.io(clamp(S.hubT/2.3,0,1)); hubPhysics(dt); chasePose(chase);
    hubCam.position.lerpVectors(fromP.p,chase.p,k); hubCam.quaternion.slerpQuaternions(fromP.q,chase.q,k); hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion);
    universeVisible(1); U.gridU.uDip.value=damp(U.gridU.uDip.value,1,3,rdt); lens=lerp(1,.15,k);
    if(S.hubT>1.2&&!S.hudOn){ S.hudOn=true; show('#hub',true); cine(false); updateQuest(); setTimeout(()=>{ if(!S.firstThrust) $('#hint').classList.add('gone'); },14000); }
    if(S.hubT>=2.3&&S.mode==='tohub'){ S.mode='hub'; S.hudOn=false; toast('Gravity is on. Thrust gently.'); }
    labelsUpdate();
  }
  else if(S.mode==='hub'){
    hubPhysics(dt);
    if(S.mode==='hub'){ chasePose(chase); hubBase.p.lerp(chase.p,1-Math.exp(-5*dt)); hubBase.q.slerp(chase.q,1-Math.exp(-6*dt));
      hubCam.position.copy(hubBase.p); hubCam.quaternion.copy(hubBase.q); labelsUpdate(); if((radarK++&1)===0) radarDraw(); presenceTick(); }
    universeVisible(1); lens=.15;
  }
  else if(S.mode==='docking'){ dockUpdate(rdt); lens=.15; }
  else if(S.mode==='undocking'){ undockUpdate(rdt,dt); lens=.15; if(S.mode==='hub'||(TR&&TR.t>1.1)){ labelsUpdate(); radarDraw(); } }
  else if(S.mode==='station'){ lens=0; }
  else if(S.mode==='falling'){
    S.fallT+=rdt; const k=Math.min(1,S.fallT/2.6); post.uniforms.uStretch.value=k*(RM?.2:1); A.whine(k); A.thrust(0);
    const P=S.probe; P.p.multiplyScalar(1-dt*1.2); U.probe.position.copy(P.p);
    hubCam.position.lerp(tv[2].set(P.p.x*1.3,1.5,P.p.z*1.3+.01),dt*2); hubCam.lookAt(0,0,0); hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion);
    S.flash=Math.max(S.flash,sstep(.7,1,k)); lens=1;
    if(k>=1){ S.mode='beyond'; A.whine(0); U.probe.visible=U.trail.visible=false; cine(false);
      $('#hzStats').innerHTML=statsHTML([['Proper time',fmtT(S.tau)],['Stations docked',S.docked.size+' / 5'],['Games played',S.games]]); show('#horizon',true); reveal($('#horizon .h')); }
  }
  else if(S.mode==='beyond'){ lens=1; }
  // shake on the active camera
  if(S.shake>0&&!RM){ const a=S.shake*S.shake*.25; if(S.iris<2.5&&S.mode!=='station') hubCam.position.add(tv[3].set((Math.random()-.5)*a,(Math.random()-.5)*a,(Math.random()-.5)*a)); }
  S.shake=Math.max(0,S.shake-rdt*1.8); S.ca=damp(S.ca,0,5,rdt);
  post.uniforms.uTint.value.multiplyScalar(Math.exp(-4*rdt));
  S.flash=Math.max(0,S.flash-rdt*1.3); post.uniforms.uFlash.value=S.flash;
  post.uniforms.uCA.value=S.ca+(S.mode==='hub'?S.probe.thr*.25:0);
  if(S.mode!=='falling'&&S.mode!=='beyond') post.uniforms.uStretch.value=damp(post.uniforms.uStretch.value,0,4,rdt);
  if(S.mode!=='gate') post.uniforms.uGrade.value.lerp(WHITE,1-Math.exp(-12*rdt));
  // station camera (smoothed) + its update
  const needB=S.st&&S.iris>0, needA=S.iris<2.5;
  if(S.st&&(needB||S.mode==='docking')){
    S.st.update(dt,t,rdt);
    const target=tv[5].copy(S.st.camP).addScaledVector(S.st.arrive,S.arrive);
    if(S.stSnap){ stPos.copy(target); stLook.copy(S.st.camL); S.stSnap=false; }
    else { const k=S.mode==='docking'||S.mode==='undocking'?1-Math.exp(-14*dt):1-Math.exp(-4*dt); stPos.lerp(target,k); stLook.lerp(S.st.camL,1-Math.exp(-5*dt)); }
    stCam.position.copy(stPos); if(S.shake>0&&!RM){ const a=S.shake*S.shake*.22; stCam.position.add(tv[6].set((Math.random()-.5)*a,(Math.random()-.5)*a,0)); } stCam.lookAt(stLook);
  }
  // render
  if(needA){
    const c=tv[7].set(0,0,0).project(hubCam); post.uniforms.uCen.value.set(c.x*.5+.5,c.y*.5+.5);
    const dist=hubCam.position.length(); post.uniforms.uRs.value=U.hole.scale.x*.5/(dist*Math.tan(hubCam.fov*Math.PI/360));
    post.uniforms.uLens.value=lens*1.1*(c.z<1?1:0);
    hubCam.updateMatrixWorld(); U.bhU.uR.value.setFromMatrixColumn(hubCam.matrixWorld,0); U.bhU.uU.value.setFromMatrixColumn(hubCam.matrixWorld,1);
    setPx(hubCam); renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(U.scene,hubCam);
  }
  if(needB){ setPx(stCam); renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(S.st.scene,stCam); }
  post.uniforms.uIris.value=S.st?S.iris:0;
  renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  requestAnimationFrame(frame);
}
hubCam.position.set(0,1.2,70); hubCam.lookAt(0,0,0);
requestAnimationFrame(frame);
boot();
window.__heloria={S,ST,U,STA,post,dock:id=>dock(STA.find(x=>x.id===id)),toHub,undock};

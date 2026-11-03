/* ================= THE LAST FLIGHT, IN SPACE =================
   Earth's drawn sky has gone black; now the drawn world burns away like paper, and behind it is the real system, traced.
   You come in on one long curve round the hole, closer than you have ever been. At the bottom of the well time slows,
   everything goes quiet, and the screen asks for one thing: hold to burn. Burning at the bottom of a gravity well is the
   best place there is to burn, and it throws you out. The stars stretch, the system falls away to a point, and the light
   takes over. Then a white page: who made this, and why. */
const FZ={on:false,t:0,ph:'',th:0,hold:false,held:0,auto:0,esc:0,boost:0,said:false,white:0,beatT:0,sw:false,
  P:new T.Vector3(),Tn:new T.Vector3(),prev:new T.Vector3(),vel:new T.Vector3(),cam:new T.Vector3(),look:new T.Vector3(),fov:42};
/* the path: one hyperbola round the hole, tilted a little off the disk so it skims over it, going the way the disk turns */
const FP={p:6.75,e:1.25,inc:.27,az:.85,th0:-2.05,thE:2.44};
const fE1=new T.Vector3(), fE2=new T.Vector3(), fT=[...Array(8)].map(()=>new T.Vector3()), FUP=new T.Vector3(0,1,0), FO=new T.Vector3();
{ const c=Math.cos(FP.az), s=Math.sin(FP.az); fE1.set(c*Math.cos(FP.inc),Math.sin(FP.inc),s*Math.cos(FP.inc)); fE2.set(-s,0,c); }
function fPath(th,o){ const r=FP.p/(1+FP.e*Math.cos(th)); return o.copy(fE1).multiplyScalar(r*Math.cos(th)).addScaledVector(fE2,r*Math.sin(th)); }
const fR=th=>FP.p/(1+FP.e*Math.cos(th));
const holdEl=$('#holdp'), finEl=$('#fin');

/* Earth hands over here, while the rocket is still climbing */
function finaleSpace(){ if(FZ.on) return;
  Object.assign(FZ,{on:true,t:0,ph:'burn',th:FP.th0,hold:false,held:0,auto:0,esc:0,boost:0,said:false,white:0,beatT:0,sw:false,fov:42});
  S.mode='finale'; S.iris=1; post.uniforms.uBurn.value=0; post.uniforms.uIrisCol.value.set('#FFB066');
  fPath(FZ.th,FZ.P); FZ.prev.copy(FZ.P); fPath(FZ.th+.01,fT[0]); FZ.Tn.copy(fT[0]).sub(FZ.P).normalize();
  U.probe.visible=U.trail.visible=U.dust.visible=U.streak.visible=true; universeVisible(1); U.belt.visible=true;
  for(let i=0;i<TRL;i++){ U.trailPos[i*3]=FZ.P.x; U.trailPos[i*3+1]=FZ.P.y; U.trailPos[i*3+2]=FZ.P.z; } U.trailG.attributes.position.needsUpdate=true;
  finCam(0,true); A.burn(); A.update(S.t,{sub:.2,pad:.5,bright:.25}); A.beacons(BEACON_NOTES); }

function finHold(on){ if(S.mode!=='finale') return; FZ.hold=on; }
addEventListener('keydown',e=>{ if(S.mode!=='finale') return; if(['Space','Enter','KeyW','ArrowUp','KeyB'].includes(e.code)){ e.preventDefault(); if(!e.repeat) finHold(true); } if(e.code==='Escape') e.preventDefault(); });
addEventListener('keyup',e=>{ if(S.mode!=='finale') return; if(['Space','Enter','KeyW','ArrowUp','KeyB'].includes(e.code)) finHold(false); });
addEventListener('pointerup',()=>finHold(false)); addEventListener('pointercancel',()=>finHold(false));

/* where the camera sits: behind you on the way in, out to the side at the bottom (you, small, against the bent light), behind you
   on the way out with the stars streaking, and at the very end ahead of you, looking back at everything falling away */
function finCam(rdt,snap){ const P=FZ.P, Tn=FZ.Tn, th=FZ.th;
  const out=fT[1].copy(P).setY(0).normalize(), side=fT[2].crossVectors(Tn,FUP).normalize();
  const wW=sstep(-.95,-.38,th)*(1-sstep(.1,.7,FZ.esc)), wE=sstep(0,.8,FZ.esc), wL=sstep(2.4,5,FZ.esc);
  const cA=fT[3].copy(P).addScaledVector(Tn,-2.7).addScaledVector(FUP,.95), lA=fT[4].copy(P).addScaledVector(Tn,5).lerp(FO,.32);
  const cW=fT[5].copy(P).addScaledVector(out,1.75).addScaledVector(FUP,.32).addScaledVector(Tn,-.55), lW=fT[6].copy(P).lerp(FO,.42);
  cA.lerp(cW,wW); lA.lerp(lW,wW);
  // on the way out you pull ahead of the camera, a little more every second, until you are only a light going into the stars
  if(wE>0){ cW.copy(P).addScaledVector(Tn,-2.8-9*wL*wL).addScaledVector(FUP,.55+.6*wL).addScaledVector(side,.3); lW.copy(P).addScaledVector(Tn,9); cA.lerp(cW,wE); lA.lerp(lW,wE); }
  const fov=lerp(lerp(42,58,wW),70+8*wL,wE)*(innerHeight>innerWidth?1.32:1);   // a phone held upright sees less across, so it sees more up and down
  cA.sub(P); lA.sub(P);   // the camera rides with you; only where it sits around you is smoothed
  if(snap){ FZ.cam.copy(cA); FZ.look.copy(lA); FZ.fov=fov; }
  else { const k=1-Math.exp(-4.5*rdt); FZ.cam.lerp(cA,k); FZ.look.lerp(lA,1-Math.exp(-6*rdt)); FZ.fov=damp(FZ.fov,fov,2.5,rdt); }
  hubCam.position.copy(P).add(FZ.cam); hubCam.up.set(0,1,0); hubCam.lookAt(fT[7].copy(P).add(FZ.look)); hubCam.fov=FZ.fov; hubCam.updateProjectionMatrix(); }

function finaleUpdate(rdt,dt,t){ const x=S.finX||1, d=dt*x; FZ.t+=d; const th0=FZ.th;
  // how fast you move along the curve: brisk far out, slowing as you sink, nearly still at the bottom, then thrown
  let w;
  if(FZ.ph==='burn'||FZ.ph==='dive') w=.1+.15*sstep(-.45,-2,FZ.th);
  else if(FZ.ph==='well') w=FZ.hold?.045:.06;
  else w=.22+2.2*sstep(0,3.2,FZ.esc)*(1+.35*FZ.boost);
  FZ.th=Math.min(FP.thE,FZ.th+w*d);
  fPath(FZ.th,FZ.P); FZ.vel.copy(FZ.P).sub(FZ.prev).divideScalar(Math.max(d,1e-3)); FZ.prev.copy(FZ.P);
  fPath(FZ.th+.004,fT[0]); FZ.Tn.copy(fT[0]).sub(FZ.P).normalize();
  const r=fR(FZ.th);
  // the drawn world burns away
  if(FZ.ph==='burn'){ const k=clamp(FZ.t/3.4,0,1); post.uniforms.uBurn.value=.001+E.i(k)*1.06;
    if(k>=1){ post.uniforms.uBurn.value=0; S.iris=0; const st=ST.cr; if(st){ st.finaleEnd&&st.finaleEnd(); st.abort(); st.hideUI(); show('#station',false); st.el.classList.remove('on'); st.exit(); }
      S.st=null; S.stId=null; FZ.ph='dive'; A.update(t,{sub:.3,pad:.6,bright:.3}); } }
  // falling in
  if(FZ.ph==='dive'){ if(FZ.th>-.6&&!FZ.said){ FZ.said=true; holdEl.classList.add('on'); }
    if(FZ.th>=-.38){ FZ.ph='well'; FZ.auto=0; A.stretch(); } }
  // the bottom of the well: hold to burn (or it burns for you)
  if(FZ.ph==='well'){ FZ.auto+=d; FZ.beatT-=d; if(FZ.beatT<=0){ FZ.beatT=1.05; A.beat(.8); }
    const want=FZ.hold||(FZ.auto>4.2&&FZ.held<1.4);
    if(want){ if(!FZ.sw){ FZ.sw=true; A.swell(); holdEl.classList.add('go'); } FZ.held+=d; }
    if((FZ.held>.6&&!want)||FZ.held>2.8){ FZ.ph='esc'; FZ.esc=0; FZ.boost=clamp(FZ.held/2.8,.3,1); holdEl.classList.remove('on','go');
      A.boom(); A.launch(); A.whoosh(true,2.6,.34); setTimeout(()=>A.chord(),380); S.shake=Math.max(S.shake,1); S.flash=Math.max(S.flash,.12); } }
  if(FZ.ph==='esc') FZ.esc+=d;
  // the probe, and its flame
  U.probe.position.copy(FZ.P); fT[7].copy(FZ.P).sub(FZ.Tn); U.probe.lookAt(fT[7]);
  const burning=FZ.ph==='well'&&FZ.held>0&&(FZ.hold||FZ.auto>4.2), thr=FZ.ph==='esc'?1.5*(1-sstep(2.5,5,FZ.esc)):burning?1.5:FZ.ph==='well'?.05:.35;
  S.probe.thr=damp(S.probe.thr,thr,8,rdt); U.engU.uThr.value=S.probe.thr;
  if(S.probe.thr>.2){ fT[7].copy(FZ.Tn).multiplyScalar(-.3-S.probe.thr*.3).add(FZ.P); for(let k=0;k<Math.ceil(S.probe.thr*3*Q);k++) U.exhaust.emit(fT[7],1,.35,null,0,.5+Math.random()*.3); }
  U.exhaust.update(rdt,0,2.2);
  U.trailPos.copyWithin(3,0,(TRL-1)*3); U.trailPos[0]=FZ.P.x; U.trailPos[1]=FZ.P.y; U.trailPos[2]=FZ.P.z;
  for(let i=0;i<TRL;i++){ const f=Math.pow(1-i/TRL,2)*.8; U.trailCol[i*3]=f*.85; U.trailCol[i*3+1]=f*.78; U.trailCol[i*3+2]=f; }
  U.trailG.attributes.position.needsUpdate=true; U.trailG.attributes.color.needsUpdate=true;
  U.dustU.uC.value.copy(FZ.P); U.dustU.uV.value.copy(FZ.vel).clampLength(0,40); U.gridU.uProbe.value.copy(FZ.P);
  if(FZ.ph==='well'&&burning) S.shake=Math.max(S.shake,.35);
  finCam(rdt,false); universeVisible(1);
  // sound: the hole's low note grows as you sink; at the bottom the score thins to almost nothing; then it opens up
  if(FZ.ph!=='esc'){ const deep=sstep(13,3.2,r), still=FZ.ph==='well'?1:0;
    A.update(t,{sub:.25+.7*deep,pad:lerp(.6,.12,Math.max(deep*.6,still)),bright:lerp(.35,.04,Math.max(deep*.7,still))}); A.roar(sstep(9,3.2,r)*.22*(1-still*.6)+(burning?.5:0)); A.thrust(burning?1.1:S.probe.thr*.4); A.whine(burning?.2+.5*clamp(FZ.held/2.8,0,1):0); A.wind(.04+.12*deep); }
  else { const e=FZ.esc; A.update(t,{sub:.4*(1-sstep(0,2,e)),pad:.9*(1-sstep(4,6,e)),bright:.9}); A.roar(.35*(1-sstep(0,2.5,e))); A.thrust(S.probe.thr*.5); A.whine(0); A.wind(.26*sstep(0,1,e)*(1-sstep(3.5,5.5,e))); }
  // and the light takes over
  if(FZ.ph==='esc'){ FZ.white=sstep(3.4,5.4,FZ.esc); S.flashMin=FZ.white; if(FZ.esc>5.6) credits(); } }

/* the white page */
function credits(){ if(S.mode==='credits') return; S.mode='credits'; FZ.on=false; S.flashMin=1; post.uniforms.uFlash.value=1;
  A.hush(); A.update(S.t,{sub:0,pad:.45,bright:.18}); A.credits(); holdEl.classList.remove('on','go');
  $('#finAgain').textContent=S.entry==='fly'?'Fly again':'Fly the whole thing';
  finEl.hidden=false; requestAnimationFrame(()=>finEl.classList.add('on')); }
/* again, from the very beginning: the whole flight, whichever way you came in */
/* Fly again, or the whole thing from the start: the same page with no way in on its address. A preview built to open on
   Land or Aetos has the whole thing somewhere else, so it opens that */
const FLY_URL='__FLY__';
$('#finAgain').addEventListener('click',()=>{ if(FLY_URL){ window.open(FLY_URL,'_blank','noopener'); return; }
  if(location.hash) history.replaceState(null,'',location.pathname+location.search); location.reload(); });
$('#finWalk').addEventListener('click',()=>{ A.hush&&A.hush(); });

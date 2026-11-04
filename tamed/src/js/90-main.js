/* ================= BOOT, LOOP ================= */
const CAM={out:new T.PerspectiveCamera(40,1,.1,3000), gal:new T.PerspectiveCamera(40,1,.1,3000)};
const G={px:600};
let OUT=null, GAL=null, rtA=null, rtB=null;
const WORLD={onWater:false,offT:0,tap(x,y){ if(!OUT||!(S.mode==='world')) return; HAND.tapT=now(); const mx=sceneMix(S.s); if(mx.a!=='out'&&mx.b!=='out') return;
  if(waterAt(x,y,CAM.out,_hit)){ OUT.sim.drop(_hit.x,_hit.z,.8,2.4); A.drop(1.1); } }};
const _ray=new T.Raycaster(), _nd=new T.Vector2(), _hit=v3(), _lastHit=v3(), _plane=new T.Plane(v3(0,1,0),0), _hd=v3(), _hp=v3(), _cp=v3(), _ct=v3();
function waterAt(x,y,cam,out){
  _nd.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); _ray.setFromCamera(_nd,cam);
  if(!_ray.ray.intersectPlane(_plane,out)) return false; if(out.distanceTo(cam.position)>150) return false;
  const inPool=out.x>POOL.x0&&out.x<POOL.x1&&out.z>POOL.z0&&out.z<POOL.z1;
  if(Math.abs(out.x)<14&&out.z>-21.4&&out.z<.6&&!inPool) return false;
  if(Math.abs(out.x)<PV.half&&out.z>=.6&&out.z<PV.foot) return false;
  return true;
}
function waterInteract(){
  if(!M.on||S.mode!=='world'||HOLD.open) { if(WORLD.onWater){ WORLD.onWater=false; WORLD.offT=now(); } return; }
  if(waterAt(M.x,M.y,CAM.out,_hit)){ const sp=Math.hypot(M.vx,M.vy);
    if(!WORLD.onWater){ WORLD.onWater=true; if(now()-WORLD.offT>.55){ A.drop(.75); OUT.sim.drop(_hit.x,_hit.z,.55,1.4); } }
    else if(sp>25){ OUT.sim.stroke(_lastHit.x,_lastHit.z,_hit.x,_hit.z,clamp(sp/1500,0,1)*.6);
      const k=clamp(sp/1400,0,1); if(now()-(WORLD.swT||0)>.34-.14*k){ WORLD.swT=now(); A.swish(k,M.x/innerWidth*2-1); } }   // and you hear it move
    _lastHit.copy(_hit);
  } else if(WORLD.onWater){ WORLD.onWater=false; WORLD.offT=now(); }
}
function horizonY(cam){ cam.getWorldDirection(_hd); _hd.y=0; if(_hd.lengthSq()<1e-6) return .5; _hd.normalize(); _hp.copy(cam.position).addScaledVector(_hd,5000); _hp.y=0; _hp.project(cam); return _hp.y*.5+.5; }
const PAR={x:0,y:0};
function camAt(name,s,cam){
  const keys=name==='gal'?TR.gal:(s<2.5?TR.out:TR.out2);
  let f=trackEval(keys,s,_cp,_ct);
  if(S.camOv&&S.camOv[0]===name){ const o=S.camOv; _cp.fromArray(o[1]); _ct.fromArray(o[2]); f=o[3]; }
  if(name==='out'&&LAUNCH.camK>.001){ const k=LAUNCH.camK; _ct.lerp(LAUNCH.mid,k); f=lerp(f,LAUNCH.fov,k); }
  cam.position.copy(_cp); cam.lookAt(_ct);
  if(!RM){ cam.rotateY(-PAR.x*.03); cam.rotateX(PAR.y*.018); }
  if(Math.abs(cam.fov-f)>1e-3){ cam.fov=f; cam.updateProjectionMatrix(); }
}
function resize(){
  if(!GL_OK) return;
  const w=innerWidth, h=innerHeight, d=QL.dpr; renderer.setPixelRatio(d); renderer.setSize(w,h,false);
  const W=Math.max(2,Math.floor(w*d)), H=Math.max(2,Math.floor(h*d));
  rtA.setSize(W,H); rtB.setSize(W,H); POST.setSize(W,H); OUT.setSize(W,H); GAL.setSize(W,H);
  for(const c of Object.values(CAM)){ c.aspect=w/h; c.updateProjectionMatrix(); }
  GU.uRes.value.set(W,H); POST.comp.uniforms.uAsp.value=w/h; POST.mixM.uniforms.uAsp.value=w/h;
  const was=STOPS.length; setLayout(); if(STOPS.length!==was){ const s=S.s; SC.v=SC.target=clamp(STOPS.indexOf(placeAt(s).s),0,STOPS.length-1); }
  TXT.dirty=true;
}
let rsT=0; addEventListener('resize',()=>{ clearTimeout(rsT); rsT=setTimeout(resize,60); });
const QM={buf:[],cool:0,tick(ms){ if(TEST||HQ||!S.ready) return; this.buf.push(ms); if(this.buf.length>90) this.buf.shift(); const t=performance.now(); if(this.buf.length<90||t<this.cool) return;
  const avg=this.buf.reduce((a,b)=>a+b,0)/this.buf.length;
  if(avg>23&&QL.dpr>.6){ QL.dpr=Math.max(.6,QL.dpr-.2); resize(); this.cool=t+3000; this.buf=[]; }
  else if(avg<13&&QL.dpr<QL.dprMax){ QL.dpr=Math.min(QL.dprMax,QL.dpr+.125); resize(); this.cool=t+6000; this.buf=[]; } }};

/* ---------- entering ---------- */
S.enterT=0; S.enterK=0; S.veil=1;
function enter(){
  if(S.nogl){ gate.classList.add('go','gone'); ui.classList.add('on'); ui.setAttribute('aria-hidden','false'); $('#logo').classList.add('on'); S.mode='plain'; return; }
  if(S.mode!=='gate'||!S.ready) return;
  S.mode='entering'; S.enterT=0; S.entered=true;
  A.start().then(()=>{ A.swell(); });
  const word=$('#word'), logo=$('#logo'), a=word.getBoundingClientRect(), b=logo.getBoundingClientRect();
  const k=b.height/a.height*1.02;
  word.style.transform=`translate(${(b.left+b.width/2-(a.left+a.width/2)).toFixed(1)}px,${(b.top+b.height/2-(a.top+a.height/2)).toFixed(1)}px) scale(${k.toFixed(4)})`;
  gate.classList.add('go'); ui.classList.add('on'); ui.setAttribute('aria-hidden','false');
  gate.setAttribute('aria-hidden','true');
  setTimeout(()=>{ logo.classList.add('on'); },1250);
  setTimeout(()=>{ gate.classList.add('gone'); },1900);
}

/* ---------- the loop ---------- */
let last=performance.now();
function frame(tn){
  requestAnimationFrame(frame);
  const raw=Math.max(0,(tn-last)/1000); last=tn;
  const dt=Math.min(TEST?.25:.05,raw); S.dt=dt; S.t+=dt; S.frame++;
  const way=S.mode==='gate'?S.gateHover:null, tsT=way==='walk'?.25:way==='fly'?2.2:1;
  S.timeScale=damp(S.timeScale,tsT,2.4,dt); S.ut=(S.ut||0)+dt*S.timeScale; GU.uTime.value=RM?S.ut*.4:S.ut;
  QM.tick(raw*1000); UI.cursor(dt);
  if(!S.ready||!GL_OK) return;
  scrollTick(dt); VEIL.tick(dt); holdTick(); launchTick(dt); UI.gateTick(dt);
  if(S.mode==='entering'){ S.enterT+=dt; S.veil=1-E.io(clamp(S.enterT/2.6,0,1)); S.enterK=sstep(1.3,2.5,S.enterT); if(S.enterT>2.7){ S.mode='world'; S.veil=0; S.enterK=1; } }
  let s=warp(SC.v); if(S.mode==='gate'||S.mode==='entering') s=0; S.s=s;
  const [el,az]=S.sunOv||sunAt(s); SUN.el=el; SUN.az=az; sunDir(el,az,SUN.dir); const tod=todAt(el); tintAt(s,TINT);
  const mx=sceneMix(s);
  const px=M.on?M.x/innerWidth*2-1:0, py=M.on?-(M.y/innerHeight*2-1):0; PAR.x=damp(PAR.x,px,2,dt); PAR.y=damp(PAR.y,py,2,dt);
  const needOut=mx.a==='out'||mx.b==='out', needGal=mx.a==='gal'||mx.b==='gal';
  if(needOut){ camAt('out',s,CAM.out); OUT.update(dt); OUT.applyLight(tod,TINT); waterInteract(); OUT.sim.follow(CAM.out); OUT.sim.step(dt);
    G.px=GU.uRes.value.y/(2*Math.tan(CAM.out.fov*DEG/2)); OUT.seeds.mat.uniforms.uPx.value=G.px;
    if(TXT.dirty){ drawReflectText(); OUT.waterMat.uniforms.tText.value=TXT.tex; }
    const wu=OUT.waterMat.uniforms; wu.uTextK.value.set(SECS[0].vis>0?SECS[0].vis:0,SECS[SECS.length-1].vis>0?SECS[SECS.length-1].vis:0); wu.uTextCol.value.copy(_fg); wu.uHorizon.value=horizonY(CAM.out); }
  launchHit();
  if(needGal){ camAt('gal',s,CAM.gal); G.px=GU.uRes.value.y/(2*Math.tan(CAM.gal.fov*DEG/2)); GAL.update(dt); GAL.applyLight(tod,TINT,s); }
  const Wd={out:OUT,gal:GAL};
  let src;
  if(mx.b){ Wd[mx.a].render(CAM[mx.a],rtA); Wd[mx.b].render(CAM[mx.b],rtB); const m=POST.mixM.uniforms; m.tA.value=rtA.texture; m.tB.value=rtB.texture; m.uK.value=mx.k; POST.pass(POST.mixM,POST.mix); src=POST.mix; }
  else { Wd[mx.a].render(CAM[mx.a],rtA); src=rtA; }
  const bt=POST.bloom(src);
  const cu=POST.comp.uniforms, inside=sstep(.42,.6,s)*(1-sstep(4.4,4.58,s)), dusk=sstep(5.3,6,s);
  cu.tScene.value=src.texture; cu.tBloom.value=bt;
  cu.uExpo.value=lerp(1.06,1.22,inside)*(1+dusk*.12);
  cu.uBloom.value=lerp(.038,.18,inside);
  cu.uGrade.value.set(1,1,1).lerp(TINT,inside*.26+dusk*.1);
  /* the gate: Walk thins the mist so the walk shows through; Fly brings the dark in round a black hole. Then the rocket at
     the end of the walk: the night comes in from it as you follow it up */
  cu.uVeil.value=S.mode==='gate'?damp(cu.uVeil.value,way==='walk'?.6:1,2.5,dt):S.veil;
  const dk=LAUNCH.dark>.001?LAUNCH.dark*1.15:(way==='fly'?1:0);
  cu.uDark.value=LAUNCH.dark>.001?dk:damp(cu.uDark.value,dk,way==='fly'?1.1:3.2,dt); if(cu.uDark.value<.002) cu.uDark.value=0;
  if(LAUNCH.dark>.001){ const v=LAUNCH.sc.copy(LAUNCH.mid).project(CAM.out); cu.uDarkC.value.set(v.x*.5+.5,v.y*.5+.5); cu.uHole.value.z=0; cu.uKeep.value=1; }
  else { const H=UI.holeAt(); cu.uDarkC.value.set(.5,.5); cu.uKeep.value=0; cu.uHole.value.set(H[0],H[1],damp(cu.uHole.value.z,way==='fly'?H[2]:0,way==='fly'?1.6:4,dt)); }
  cu.uDim.value=damp(S.idim||0,HOLD.open?.7:0,6,dt); S.idim=HOLD.open?Math.min(.7,(S.idim||0)+dt*3):Math.max(0,(S.idim||0)-dt*3);
  cu.uDimCol.value.set(1,1,1).lerp(TINT,.5);
  const fk=VEIL.k; cu.uFlood.value=fk; if(VEIL.k>0){ cu.uFloodCol.value.copy(VEIL.col).lerp(LIGHT,.3); cu.uFloodC.value.set(.5,.5); }
  const d=QL.dpr; cu.uMouse.value.set(M.x*d,(innerHeight-M.y)*d); cu.uVel.value.set(M.vx*d,-M.vy*d); M.vx*=Math.exp(-6*dt); M.vy*=Math.exp(-6*dt);
  cu.uDropR.value=damp(cu.uDropR.value,(UI.isBig()?24:12)*d*(HOLD.open?1.4:1),9,dt);
  cu.uDropK.value=damp(cu.uDropK.value,FINE&&M.on?1:0,8,dt);
  cu.uGrain.value=way==='walk'?.016:.032;
  POST.pass(POST.comp,null);
  UI.update(s,dt);
  A.update(dt,audioState(s,inside)); RSND.length=0;
}
function audioState(s,inside){
  const contact=sstep(5.45,6,s), court=sstep(4.55,4.85,s)*(1-contact), prox=k=>(1-sstep(.24,.62,Math.abs(s-k)))*inside;
  const R=id=>SLOT[id]+1, beam=GAL&&prox(R('pharos'))>.01?GAL.room('pharos').lock:0;   // how sure the drone is of where it is
  const gate=S.mode==='gate', way=gate?S.gateHover:null, go=LAUNCH.near;
  // the gate at rest is not silent: the walk's score far off and muffled, and the lake under it; a way, shown, takes over
  const rest=gate&&!way?1:0;
  return {music:gate?.3*rest:(1-inside*.3)*(1-go*.6), musF:gate?1600:lerp(9000,2600,inside)*(1-go*.93), water:gate?(way==='walk'?.34:.2*rest):lerp(1,.36,inside)*(1-court*.3)*(1-go*.5), waterF:gate?(way==='walk'?1500:850):lerp(2400,320,inside)+contact*1800,
    wind:gate?(way==='land'?.85:0):(1-inside)*(1-court*.7), birds:gate?(way==='land'?1:0):(1-inside)*(1-contact)*(1-court), kr:prox(R('krios')), ae:prox(R('aetos')), ph:prox(R('pharos')), og:prox(R('ogive')), beam, rise:sstep(R('ogive')-.3,R('ogive')+.4,s),
    warm:way==='walk'?1:0, land:way==='land'?1:0, dark:way==='fly'?1:0, rocket:LAUNCH.heard, rocketNear:go};
}
document.addEventListener('visibilitychange',()=>A.suspend(document.hidden));

async function boot(){
  if(!GL_OK){ document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.loadStep(1); UI.gateReady(); $('#gateState').textContent='This browser shows the plain page'; return; }
  UI.loadStep(.08);
  try{ await Promise.race([document.fonts.ready,wait(2600)]); }catch(e){}
  await nextFrame();
  rtA=RT(4,4,{samples:QL.samples}); rtB=RT(4,4,{samples:QL.samples});
  OUT=buildOutside(); UI.loadStep(.3); await nextFrame();
  GAL=buildGallery(); UI.loadStep(.45); await nextFrame();
  OUT.sim.clear();
  resize();
  setLayout();
  /* compile and draw every shader once behind the loader, so the walk never stalls */
  const steps=[[0,'out'],[1,'gal'],[2,'gal'],[3,'gal'],[4,'gal'],[5,'out']];
  for(let i=0;i<steps.length;i++){ const [s,w]=steps[i]; const W=w==='out'?OUT:GAL, cam=CAM[w];
    S.s=s; const [el,az]=sunAt(s); SUN.el=el; SUN.az=az; sunDir(el,az,SUN.dir); const tod=todAt(el); tintAt(s,TINT);
    camAt(w,s,cam); W.update(.016); W.applyLight(tod,TINT,s);
    try{ renderer.compile(W.scene,cam); }catch(e){}
    W.render(cam,rtA); UI.loadStep(.45+.5*(i+1)/steps.length); await nextFrame(); }
  S.s=0; drawReflectText(); OUT.waterMat.uniforms.tText.value=TXT.tex;
  const bt=POST.bloom(rtA); POST.comp.uniforms.tScene.value=rtA.texture; POST.comp.uniforms.tBloom.value=bt; POST.pass(POST.comp,null);
  UI.loadStep(1);
  S.ready=true; setTimeout(()=>UI.gateReady(),TEST?0:500);
}
requestAnimationFrame(frame);
boot().catch(e=>{ console.error(e); document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.gateReady(); });

/* ---------- test hooks: jump along the walk, step time, open things ---------- */
window.__tamed={S,SC,A,QL,PLACES,LAUNCH,get OUT(){return OUT;},get GAL(){return GAL;},CAM,POST,renderer,get rtA(){return rtA;},SUN,TODC,
  probe(pts){ const h2f=h=>{ const s=(h&0x8000)>>15,e=(h&0x7C00)>>10,f=h&0x03FF; if(e===0) return (s?-1:1)*Math.pow(2,-14)*(f/1024); if(e===0x1F) return f?NaN:(s?-1:1)*Infinity; return (s?-1:1)*Math.pow(2,e-15)*(1+f/1024); };
    const b=new Uint16Array(4); return pts.map(([x,y])=>{ renderer.readRenderTargetPixels(rtA,Math.floor(x*rtA.width),Math.floor((1-y)*rtA.height),1,1,b); return [...b].map(h=>+h2f(h).toFixed(3)); }); },
  enter,travel,
  jump(s){ S.mode='world'; S.veil=0; S.enterK=1; gate.classList.add('go','gone'); ui.classList.add('on'); $('#logo').classList.add('on'); const i=STOPS.indexOf(s); SC.v=SC.target=i>=0?i:s; SC.glide=null; SC.lastIn=-9; SC.pin=false; },
  setV(v){ SC.v=SC.target=v; SC.glide=null; SC.pin=true; },
  openIndex(){ UI.indexOpen(true); }, closeIndex(){ UI.indexOpen(false); },
  people(on){ S.peopleAll=!!on; if(OUT) OUT.people.forEach(p=>{ p.target=on?1:0; p.reveal=on?1:0; }); },
  holdPeople(v){ S.peopleHold=!!v; },
  state(){ return {mode:S.mode,s:+S.s.toFixed(4),v:+SC.v.toFixed(4),target:+SC.target.toFixed(4),stops:STOPS.slice(),place:placeAt(S.s).id,proj:S.proj,index:HOLD.open,dpr:QL.dpr,frame:S.frame,audio:A.levels()}; },
  hover(v){ setHover(v); },
  sun(el,az){ S.sunOv=el==null?null:[el,az]; },
  cam(name,p,t,f){ S.camOv=name?[name,p,t,f]:null; },
};

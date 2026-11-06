/* ================= BOOT, LOOP ================= */
const CAM={out:new T.PerspectiveCamera(40,1,.1,3000), gal:new T.PerspectiveCamera(40,1,.1,3000)};
const G={px:600};
let OUT=null, GAL=null, rtA=null, rtB=null;
const WORLD={onWater:false,offT:0,tap(x,y){ if(!OUT||!(S.mode==='world')) return; HAND.tapT=now(); const mx=sceneMix(S.s); if(mx.a!=='out'&&mx.b!=='out') return;
  if(POND.press&&POND.press(x,y)) return;   // a stone under the hand is pressed, rather than the water beside it
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
  rtA.setSize(W,H); if(rtB.width>1) rtB.setSize(W,H); POST.setSize(W,H); OUT.setSize(W,H); GAL.setSize(W,H);
  for(const c of Object.values(CAM)){ c.aspect=w/h; c.updateProjectionMatrix(); }
  GU.uRes.value.set(W,H); POST.comp.uniforms.uAsp.value=w/h; POST.mixM.uniforms.uAsp.value=w/h;
  const was=STOPS.length; setLayout(); if(STOPS.length!==was){ const s=S.s; SC.v=SC.target=SC.turn=clamp(STOPS.indexOf(placeAt(s).s),0,STOPS.length-1); SC.glide=null; SC.inertia=0; SC.fresh=true; }
  TXT.dirty=true;
}
let rsT=0; addEventListener('resize',()=>{ clearTimeout(rsT); rsT=setTimeout(resize,60); });
/* the frame timer: pixel density down a step when frames are steadily slow, and back up when they are steadily quick.
   It reads the middle of the last second and a half, so one slow frame, a hitch, or the long gap after the tab was away
   counts for nothing; while the sound is being made at the start only a really slow device steps down; it comes back up on an ordinary
   60 Hz screen (above the density it starts at only on a quicker one); and a density it has had to leave twice soon
   after reaching it is not tried again */
const QM={buf:[],cool:0,lv:null,i:0,up:0,bad:{},
  tick(ms){ if(TEST||HQ||!S.ready) return; const t=performance.now();
    if(!this.lv){ const d0=QL.dpr, L=[d0]; for(let d=d0-.2;d>.61;d-=.2) L.unshift(+d.toFixed(3)); if(d0>.6) L.unshift(.6); for(let d=d0+.15;d<QL.dprMax-.01;d+=.15) L.push(+d.toFixed(3)); if(QL.dprMax>d0) L.push(QL.dprMax); this.lv=L; this.i=this.d0i=L.indexOf(d0); }
    if(ms>250||document.hidden){ this.buf.length=0; this.cool=Math.max(this.cool,t+1500); return; }
    const busy=A.busy;   // while the sound is being made only a really slow device steps down, and nothing steps up
    this.buf.push(ms); if(this.buf.length>90) this.buf.shift(); if(this.buf.length<90||t<this.cool) return;
    const s=this.buf.slice().sort((a,b)=>a-b), mid=s[45], p75=s[67];
    const go=i=>{ this.i=i; QL.dpr=this.lv[i]; resize(); this.buf=[]; };
    if(mid>(busy?40:22)&&this.i>0){ if(t-this.up<12000) this.bad[this.i]=(this.bad[this.i]||0)+1; go(this.i-1); this.cool=t+3000; }
    else if(!busy&&this.i<this.lv.length-1&&(this.bad[this.i+1]||0)<2&&p75<(this.i<this.d0i?18.5:12.5)){ go(this.i+1); this.up=t; this.cool=t+6000; } }};

/* ---------- entering ---------- */
S.enterT=0; S.enterK=0; S.veil=1;
function enter(){
  if(S.nogl){ gate.classList.add('go','gone'); ui.classList.add('on'); ui.setAttribute('aria-hidden','false'); $('#logo').classList.add('on'); S.mode='plain'; return; }
  if(S.mode!=='gate'||!S.ready) return;
  S.mode='entering'; S.enterT=0; S.entered=true; walkAddress();
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
  if(needOut){ camAt('out',s,CAM.out); OUT.update(dt); OUT.applyLight(tod,TINT); waterInteract(); POND.tick(dt); OUT.sim.follow(CAM.out); OUT.sim.step(dt);
    G.px=GU.uRes.value.y/(2*Math.tan(CAM.out.fov*DEG/2)); OUT.seeds.mat.uniforms.uPx.value=G.px;
    if(TXT.dirty){ drawReflectText(); OUT.waterMat.uniforms.tText.value=TXT.tex; }
    const wu=OUT.waterMat.uniforms; wu.uTextK.value.set(SECS[0].vis>0?SECS[0].vis:0,SECS[SECS.length-1].vis>0?SECS[SECS.length-1].vis:0); wu.uTextCol.value.copy(_fg); wu.uHorizon.value=horizonY(CAM.out); }
  launchHit();
  if(needGal){ camAt('gal',s,CAM.gal); G.px=GU.uRes.value.y/(2*Math.tan(CAM.gal.fov*DEG/2)); GAL.update(dt); GAL.applyLight(tod,TINT,s); }
  const Wd={out:OUT,gal:GAL};
  /* the second full-screen target is only for a doorway, where two places are drawn at once: it is made as you come near
     one, well before the blend begins, and given back a few seconds after you have walked on */
  { const tn=now(), nearDoor=Math.min(Math.abs(s-DOOR_IN),Math.abs(s-DOOR_OUT))<BLEND+.35||!!mx.b;
    if(nearDoor){ rtB.lastUse=tn; if(rtB.width!==rtA.width||rtB.height!==rtA.height) rtB.setSize(rtA.width,rtA.height); }
    else if(rtB.width>1&&tn-(rtB.lastUse||-1e9)>3) rtB.setSize(1,1); }
  let src;
  if(mx.b){ Wd[mx.a].render(CAM[mx.a],rtA); Wd[mx.b].render(CAM[mx.b],rtB); const m=POST.mixM.uniforms; m.tA.value=rtA.texture; m.tB.value=rtB.texture; m.uK.value=mx.k; POST.pass(POST.mixM,POST.mix); src=POST.mix; }
  else { Wd[mx.a].render(CAM[mx.a],rtA); src=rtA; }
  const bt=POST.bloom(src);
  const cu=POST.comp.uniforms, inside=sstep(.42,.6,s)*(1-sstep(4.4,4.58,s)), dusk=sstep(5.3,6,s);
  cu.tScene.value=src.texture; cu.tBloom.value=bt;
  cu.uExpo.value=lerp(1.06,1.22,inside)*(1+dusk*.12);
  cu.uBloom.value=lerp(.038,.18,inside);
  cu.uGrade.value.set(1,1,1).lerp(TINT,inside*.26+dusk*.1);
  /* the gate: Walk thins the mist so the walk shows through; Land opens onto the sky over a small world; Fly brings the dark
     in round a black hole. Then the rocket at
     the end of the walk: the night comes in from it as you follow it up */
  cu.uVeil.value=S.mode==='gate'?damp(cu.uVeil.value,way==='walk'?.6:1,2.5,dt):S.veil;
  const dk=LAUNCH.dark>.001?LAUNCH.dark*1.15:(way==='fly'?1:0);
  cu.uDark.value=LAUNCH.dark>.001?dk:damp(cu.uDark.value,dk,way==='fly'?1.1:3.2,dt); if(cu.uDark.value<.002) cu.uDark.value=0;
  if(LAUNCH.dark>.001){ const v=LAUNCH.sc.copy(LAUNCH.mid).project(CAM.out); cu.uDarkC.value.set(v.x*.5+.5,v.y*.5+.5); cu.uHole.value.z=0; cu.uKeep.value=1; }
  else { const H=UI.holeAt(); cu.uDarkC.value.set(.5,.5); cu.uKeep.value=0; cu.uHole.value.set(H[0],H[1],damp(cu.uHole.value.z,way==='fly'?H[2]:0,way==='fly'?1.6:4,dt)); }
  cu.uLand.value=damp(cu.uLand.value,way==='land'&&cu.tLand.value?1:0,way==='land'?1.1:3.2,dt); if(cu.uLand.value<.002) cu.uLand.value=0;
  cu.uLandT.value=cu.uLand.value>0?(way==='land'||cu.uLandT.value>0?cu.uLandT.value+dt:0):0;
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
  // the gate is not silent: the walk's score from the first moment, a little muffled, and the lake under it; a way, shown,
  // takes over and the score steps back under it
  const rest=gate&&!way?1:0;
  return {music:gate?.15+.5*rest:(1-inside*.3)*(1-go*.6), musF:gate?1600:lerp(9000,2600,inside)*(1-go*.93), water:gate?(way==='walk'?.34:.2*rest):lerp(1,.36,inside)*(1-court*.3)*(1-go*.5), waterF:gate?(way==='walk'?1500:850):lerp(2400,320,inside)+contact*1800,
    wind:gate?(way==='land'?.85:0):(1-inside)*(1-court*.7), birds:gate?(way==='land'?1:0):(1-inside)*(1-contact)*(1-court), kr:prox(R('krios')), ae:prox(R('aetos')), ph:prox(R('pharos')), og:prox(R('ogive')), beam, rise:sstep(R('ogive')-.3,R('ogive')+.4,s),
    warm:way==='walk'?1:0, land:way==='land'?1:0, dark:way==='fly'?1:0, rocket:LAUNCH.heard, rocketNear:go};
}
/* the sound is tried the moment the page opens: a browser that allows it (one that knows you have played sound here before)
   plays the score at once; any other wakes it on the first click, tap or key (see gateWake) */
A.start().catch(()=>{});

/* compile a scene's shaders without freezing the page, where the browser can do it in the background; never wait forever */
async function compileQuiet(sc,cam){ try{ if(renderer.compileAsync) await Promise.race([renderer.compileAsync(sc,cam),wait(8000)]); else renderer.compile(sc,cam); }catch(e){} }
/* ?diag on the address: a small panel with how long each step of the loading takes, the graphics chip, and any error, so a
   slow load in a particular browser can be read off a screenshot. Nothing of it exists without ?diag */
const DIAG=/[?&]diag(=|&|$)/.test(location.search)?{steps:[['page and scripts',Math.round(performance.now())]],cur:'start',last:performance.now(),errs:[]}:null;
function diag(name){ if(!DIAG) return; const t=performance.now(); DIAG.steps.push([DIAG.cur,Math.round(t-DIAG.last)]); DIAG.cur=name; DIAG.last=t; }
if(DIAG){ addEventListener('error',e=>DIAG.errs.push(String(e.message||e.error||e).slice(0,200)),true);
  addEventListener('unhandledrejection',e=>DIAG.errs.push('promise: '+String(e.reason&&e.reason.message||e.reason).slice(0,200)));
  const ce=console.error; console.error=(...a)=>{ DIAG.errs.push(a.map(x=>String(x&&x.message||x)).join(' ').slice(0,200)); ce.apply(console,a); };
  const el=document.createElement('pre'); el.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:8px 10px;max-width:min(600px,calc(100vw - 16px));max-height:70vh;overflow:auto;background:rgba(0,0,0,.84);color:#e8f0e8;font:11px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;border-radius:6px';
  document.body.appendChild(el);
  let gpu='?'; try{ const gl=renderer&&renderer.getContext(), ext=gl&&gl.getExtension('WEBGL_debug_renderer_info'); gpu=gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):'no WebGL'; }catch(e){ gpu='error '+e.message; }
  setInterval(()=>{ const now=performance.now();
    el.textContent='Heloria loading diagnostics\n'+navigator.userAgent+'\nGPU: '+gpu+'\nscreen '+innerWidth+'x'+innerHeight+' at '+devicePixelRatio+'x, drawing at '+QL.dpr+'x; sound being made: '+(A.busy?'yes':'no')+'\n\n'
      +DIAG.steps.map(([n,ms])=>(n+'                          ').slice(0,26)+String(ms).padStart(7)+' ms').join('\n')
      +'\n'+(S.ready?'READY':'now: '+DIAG.cur+' for '+Math.round(now-DIAG.last)+' ms')+'\ntotal '+Math.round(now)+' ms since the page opened'
      +(DIAG.errs.length?'\n\nerrors:\n'+DIAG.errs.slice(0,12).join('\n'):''); },250); }
async function boot(){
  if(!GL_OK){ document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.loadStep(1); UI.gateReady(); $('#gateState').textContent='This browser shows the plain page'; return; }
  UI.loadStep(.08); diag('fonts');
  try{ await Promise.race([document.fonts.ready,wait(2600)]); }catch(e){}
  await nextFrame(); diag('build outside');
  rtA=RT(4,4,{samples:QL.samples}); rtB=RT(4,4,{samples:QL.samples});
  OUT=buildOutside(); UI.loadStep(.3); await nextFrame(); diag('build gallery');
  GAL=buildGallery(); UI.loadStep(.45); await nextFrame();
  OUT.sim.clear();
  resize();
  setLayout();
  /* compile and draw every shader once behind the loader, so the walk never stalls */
  const steps=[[0,'out'],[1,'gal'],[2,'gal'],[3,'gal'],[4,'gal'],[5,'out']];
  for(let i=0;i<steps.length;i++){ const [s,w]=steps[i]; const W=w==='out'?OUT:GAL, cam=CAM[w];
    S.s=s; const [el,az]=sunAt(s); SUN.el=el; SUN.az=az; sunDir(el,az,SUN.dir); const tod=todAt(el); tintAt(s,TINT);
    camAt(w,s,cam); W.update(.016); W.applyLight(tod,TINT,s);
    diag('compile '+(i+1)+'/6 '+w); await compileQuiet(W.scene,cam);
    diag('first draw '+(i+1)+'/6 '+w); W.render(cam,rtA); UI.loadStep(.45+.5*(i+1)/steps.length); await nextFrame(); }
  diag('glow and finish');
  S.s=0; drawReflectText(); OUT.waterMat.uniforms.tText.value=TXT.tex;
  const bt=POST.bloom(rtA); POST.comp.uniforms.tScene.value=rtA.texture; POST.comp.uniforms.tBloom.value=bt; POST.pass(POST.comp,null);
  UI.loadStep(1); diag('ready');
  S.ready=true; setTimeout(()=>UI.gateReady(),TEST?0:500);
}
requestAnimationFrame(frame);
boot().catch(e=>{ console.error(e); document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.gateReady(); });

/* ---------- test hooks: jump along the walk, step time, open things ---------- */
window.__tamed={S,SC,A,QL,UI,PLACES,LAUNCH,POND,get OUT(){return OUT;},get GAL(){return GAL;},CAM,POST,renderer,get rtA(){return rtA;},SUN,TODC,
  probe(pts){ const h2f=h=>{ const s=(h&0x8000)>>15,e=(h&0x7C00)>>10,f=h&0x03FF; if(e===0) return (s?-1:1)*Math.pow(2,-14)*(f/1024); if(e===0x1F) return f?NaN:(s?-1:1)*Infinity; return (s?-1:1)*Math.pow(2,e-15)*(1+f/1024); };
    const b=new Uint16Array(4); return pts.map(([x,y])=>{ renderer.readRenderTargetPixels(rtA,Math.floor(x*rtA.width),Math.floor((1-y)*rtA.height),1,1,b); return [...b].map(h=>+h2f(h).toFixed(3)); }); },
  enter,travel,
  jump(s){ S.mode='world'; S.veil=0; S.enterK=1; gate.classList.add('go','gone'); ui.classList.add('on'); $('#logo').classList.add('on'); const i=STOPS.indexOf(s); SC.v=SC.target=SC.turn=i>=0?i:s; SC.glide=null; SC.inertia=0; SC.lastIn=-9; SC.pin=false; SC.fresh=true; },
  setV(v){ SC.v=SC.target=SC.turn=v; SC.glide=null; SC.pin=true; SC.fresh=true; },
  openIndex(){ UI.indexOpen(true); }, closeIndex(){ UI.indexOpen(false); },
  people(on){ S.peopleAll=!!on; if(OUT) OUT.people.forEach(p=>{ p.target=on?1:0; p.reveal=on?1:0; }); },
  holdPeople(v){ S.peopleHold=!!v; },
  state(){ return {mode:S.mode,s:+S.s.toFixed(4),v:+SC.v.toFixed(4),target:+SC.target.toFixed(4),stops:STOPS.slice(),place:placeAt(S.s).id,proj:S.proj,index:HOLD.open,dpr:QL.dpr,frame:S.frame,audio:A.levels()}; },
  hover(v){ setHover(v); },
  sun(el,az){ S.sunOv=el==null?null:[el,az]; },
  cam(name,p,t,f){ S.camOv=name?[name,p,t,f]:null; },
  /* for the scroll tests: where the camera is for a scroll position v, without moving the walk */
  walkAt(v){ const s=warp(v), m=sceneMix(s), name=m.b&&m.k>.5?m.b:m.a, keys=name==='gal'?TR.gal:(s<2.5?TR.out:TR.out2), p=new T.Vector3(), t=new T.Vector3(), f=trackEval(keys,s,p,t);
    return {s,scene:name,p:p.toArray(),t:t.toArray(),f}; },
  /* and for driving the scroll on a clock of the test's own: one frame of the hand and the walk */
  tick(dt){ S.frame++; scrollTick(dt); VEIL.tick(dt); holdTick(); return warp(SC.v); },
};

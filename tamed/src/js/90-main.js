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
  rtA.setSize(W,H); if(rtB.width>1) rtB.setSize(W,H); POST.setSize(W,H); OUT.setSize(W,H); if(GAL) GAL.setSize(W,H); G.W=W; G.H=H;
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
const QM={buf:[],cool:0,lv:null,i:0,up:0,bad:{},long:0,off:false,
  tick(ms){ if(TEST||HQ||!S.ready||this.off) return; const t=performance.now();
    if(!this.lv){ const d0=QL.dpr, L=[d0]; for(let d=d0-.2;d>.61;d-=.2) L.unshift(+d.toFixed(3)); if(d0>.6) L.unshift(.6); for(let d=d0+.15;d<QL.dprMax-.01;d+=.15) L.push(+d.toFixed(3)); if(QL.dprMax>d0) L.push(QL.dprMax); this.lv=L; this.i=this.d0i=L.indexOf(d0); }
    /* a frame over a quarter of a second is a hitch, or the gap after the tab was away; but six of them running, with the page
       in view, is a device that cannot keep up: down a step at once (and again, until it can) */
    if(t<GLATE.qm){ this.buf.length=0; this.cool=Math.max(this.cool,t+1500); return; }   // (the gallery being made after the gate is not the device being slow)
    if(ms>250||document.hidden){ this.long=document.hidden?0:this.long+1; this.buf.length=0;
      if(this.long>=6&&this.i>0){ this.long=0; this.i--; QL.dpr=this.lv[this.i]; resize(); this.cool=t+1500; } else this.cool=Math.max(this.cool,t+1500); return; }
    this.long=0;
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
  if(S.mode==='gate'&&!S.ready){ S.wantWalk=true; return; }   // (chosen before the walk is made: it goes the moment it is, see UI.gateReady)
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
function frame(tn){ const f0=DIAG?performance.now():0; if(TRAIL&&(S.mode!==TRAIL.mode||S.frame%60===0)){ TRAIL.mode=S.mode; TRAIL.add('frame '+S.frame+', '+S.mode+(S.ready?'':' (loading)')+', at '+(S.s||0).toFixed(3)); }
  try{ frameBody(tn); } finally{ if(DIAG) DIAG.js.push(performance.now()-f0); } }
function frameBody(tn){
  requestAnimationFrame(frame);
  const raw=Math.max(0,(tn-last)/1000); last=tn;
  const dt=Math.min(TEST?.25:.05,raw); S.dt=dt; S.t+=dt; S.frame++;
  const way=S.mode==='gate'?S.gateHover:null, tsT=way==='walk'?.25:1;
  S.timeScale=damp(S.timeScale,tsT,2.4,dt); S.ut=(S.ut||0)+dt*S.timeScale; GU.uTime.value=RM?S.ut*.4:S.ut;
  QM.tick(raw*1000); UI.cursor(dt);
  if(!S.ready||!GL_OK) return;
  scrollTick(dt); if(GLATE.stage<3) galDoor(dt); VEIL.tick(dt); holdTick(); launchTick(dt); UI.gateTick(dt);
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
  const galOK=GLATE.stage>=3;
  if(needGal&&galOK){ camAt('gal',s,CAM.gal); G.px=GU.uRes.value.y/(2*Math.tan(CAM.gal.fov*DEG/2)); GAL.update(dt); GAL.applyLight(tod,TINT,s); }
  const Wd={out:OUT,gal:GAL};
  /* the second full-screen target is only for a doorway, where two places are drawn at once: it is made as you come near
     one, well before the blend begins, and given back a few seconds after you have walked on */
  { const tn=now(), nearDoor=Math.min(Math.abs(s-DOOR_IN),Math.abs(s-DOOR_OUT))<BLEND+.35||!!mx.b;
    if(nearDoor){ rtB.lastUse=tn; if(rtB.width!==rtA.width||rtB.height!==rtA.height) rtB.setSize(rtA.width,rtA.height); }
    else if(rtB.width>1&&tn-(rtB.lastUse||-1e9)>3) rtB.setSize(1,1); }
  let src;
  if(needGal&&!galOK) src=rtA;   // (only ever under the full light of a long walk, while the gallery is still being made)
  else if(mx.b){ Wd[mx.a].render(CAM[mx.a],rtA); Wd[mx.b].render(CAM[mx.b],rtB); const m=POST.mixM.uniforms; m.tA.value=rtA.texture; m.tB.value=rtB.texture; m.uK.value=mx.k; POST.pass(POST.mixM,POST.mix); src=POST.mix; }
  else { Wd[mx.a].render(CAM[mx.a],rtA); src=rtA; }
  const bt=POST.bloom(src);
  const cu=POST.comp.uniforms, inside=sstep(.42,.6,s)*(1-sstep(4.4,4.58,s)), dusk=sstep(5.3,6,s);
  cu.tScene.value=src.texture; cu.tBloom.value=bt;
  cu.uExpo.value=lerp(1.06,1.22,inside)*(1+dusk*.12);
  cu.uBloom.value=lerp(.038,.18,inside);
  cu.uGrade.value.set(1,1,1).lerp(TINT,inside*.26+dusk*.1);
  /* the gate: Walk thins the mist so the walk shows through; Land opens onto the sky over a small world. Then the rocket at
     the end of the walk: the night comes in from it as you follow it up */
  cu.uVeil.value=S.mode==='gate'?damp(cu.uVeil.value,way==='walk'?.6:1,2.5,dt):S.veil;
  cu.uDark.value=LAUNCH.dark>.001?LAUNCH.dark*1.15:damp(cu.uDark.value,0,3.2,dt); if(cu.uDark.value<.002) cu.uDark.value=0;
  if(LAUNCH.dark>.001){ const v=LAUNCH.sc.copy(LAUNCH.mid).project(CAM.out); cu.uDarkC.value.set(v.x*.5+.5,v.y*.5+.5); cu.uKeep.value=1; }
  else { cu.uDarkC.value.set(.5,.5); cu.uKeep.value=0; }
  cu.uFade.value=LAUNCH.wash;
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
  galTick();
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
    warm:way==='walk'?1:0, land:way==='land'?1:0, rocket:LAUNCH.heard, rocketNear:go};
}
/* the sound is tried the moment the page opens: a browser that allows it (one that knows you have played sound here before)
   plays the score at once; any other wakes it on the first click, tap or key (see gateWake) */
A.start().catch(()=>{});

/* compile a scene's shaders without freezing the page, where the browser can do it in the background; never wait forever */
async function compileQuiet(sc,cam){ try{ if(renderer.compileAsync) await Promise.race([renderer.compileAsync(sc,cam),wait(8000)]); else renderer.compile(sc,cam); }catch(e){} }
/* ?diag on the address: a small panel with how long each step of the loading takes, the graphics chip, and any error, so a
   slow load in a particular browser can be read off a screenshot. Nothing of it exists without ?diag */
const DIAG=/[?&]diag(=|&|$)/.test(location.search)?{steps:[['page and scripts',Math.round(performance.now())]],cur:'start',last:performance.now(),errs:[],js:[],fr:[],bench:[],bt:null}:null;
function diag(name){ if(!DIAG) return; const t=performance.now(); DIAG.steps.push([DIAG.cur,Math.round(t-DIAG.last)]); DIAG.cur=name; DIAG.last=t; }
if(DIAG){ addEventListener('error',e=>DIAG.errs.push(String(e.message||e.error||e).slice(0,200)),true);
  addEventListener('unhandledrejection',e=>DIAG.errs.push('promise: '+String(e.reason&&e.reason.message||e.reason).slice(0,200)));
  const ce=console.error; console.error=(...a)=>{ DIAG.errs.push(a.map(x=>String(x&&x.message||x)).join(' ').slice(0,200)); ce.apply(console,a); };
  const el=document.createElement('pre'); el.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:8px 10px;max-width:min(600px,calc(100vw - 16px));max-height:70vh;overflow:auto;background:rgba(0,0,0,.84);color:#e8f0e8;font:11px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;border-radius:6px';
  document.body.appendChild(el);
  /* the sound starting, and the page's answer to a click, in the trail */
  if(TRAIL){ for(const k of ['start','preview','click','leave']){ const f=A[k]; if(typeof f!=='function') continue;
      A[k]=function(){ TRAIL.add('sound: '+k+(k==='start'?' (begins)':'')); const r=f.apply(this,arguments); if(r&&r.then) r.then(()=>TRAIL.add('sound: '+k+' done'),e=>TRAIL.add('sound: '+k+' failed '+(e&&e.message))); return r; }; }
    ['pointerdown','pointerup','click'].forEach(n=>addEventListener(n,()=>TRAIL.add(n+' answered'),{capture:false,passive:true}));
    canvas.addEventListener('webglcontextlost',()=>TRAIL.add('GRAPHICS LOST'),false); canvas.addEventListener('webglcontextrestored',()=>TRAIL.add('graphics restored'),false);
    const en=enter; enter=function(){ TRAIL.add('entering the walk'); return en.apply(this,arguments); }; }
  /* every frame's length, and after the page is ready a short test: three seconds each as it is, at lower sharpness, with no
     edge smoothing, and with the page's blur effects off (then all put back), to see which of them a slow browser is held by */
  let lf=0; const fr=t=>{ if(lf) DIAG.fr.push(t-lf); lf=t; if(DIAG.fr.length>240) DIAG.fr.shift(); if(DIAG.js.length>240) DIAG.js.shift(); requestAnimationFrame(fr); }; requestAnimationFrame(fr);
  const med=a=>{ const q=a.slice().sort((x,y)=>x-y); return q.length?q[Math.floor(q.length/2)]:0; }, p90=a=>{ const q=a.slice().sort((x,y)=>x-y); return q.length?q[Math.floor(q.length*.9)]:0; };
  const nob=document.createElement('style'); nob.textContent='#gate,#gate *,#ui,#ui *{filter:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}';
  const setSmp=n=>{ for(const r of [rtA,rtB]) if(r&&r.samples!==n){ r.samples=n; r.dispose(); } resize(); };
  const T0=[['as it is',()=>{},()=>{}],['at 0.65x sharpness',()=>{ DIAG.d0=QL.dpr; QL.dpr=.65; resize(); },()=>{ QL.dpr=DIAG.d0; resize(); }],
    ['no edge smoothing',()=>{ DIAG.s0=rtA.samples; setSmp(0); },()=>setSmp(DIAG.s0)],['no blur effects',()=>document.head.appendChild(nob),()=>nob.remove()]];
  const runBench=async()=>{ QM.off=true; for(const [n,on,off] of T0){ on(); await wait(600); DIAG.fr.length=0; DIAG.js.length=0; await wait(2600); DIAG.bench.push([n,med(DIAG.fr),p90(DIAG.fr),med(DIAG.js)]); off(); await wait(300); } QM.off=false; DIAG.bt='done'; };
  let gpu='?'; try{ const gl=renderer&&renderer.getContext(), ext=gl&&gl.getExtension('WEBGL_debug_renderer_info'); gpu=gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):'no WebGL'; }catch(e){ gpu='error '+e.message; }
  /* whether this browser compiles shaders in the background (KHR_parallel_shader_compile): without it, each compile step
     holds the page, the letters of the loader included, until it is done */
  let par='?'; try{ const gl=renderer&&renderer.getContext(); par=gl?(gl.getExtension('KHR_parallel_shader_compile')?'yes':'no'):'-'; }catch(e){}
  setInterval(()=>{ const now=performance.now(); if(S.ready&&!DIAG.bt&&now-DIAG.last>3000){ DIAG.bt='running'; runBench(); }
    el.textContent='Heloria loading diagnostics\n'+navigator.userAgent+'\nGPU: '+gpu+'\nshaders compiled in the background: '+par+(GLATE.stage<3?' (the gallery is being made after the gate)':GLATE.log.length?' (the gallery was made after the gate)':' (the gallery was made with the rest)')+'\nscreen '+innerWidth+'x'+innerHeight+' at '+devicePixelRatio+'x, drawing at '+QL.dpr+'x; sound being made: '+(A.busy?'yes':'no')
      +'\npicture: '+(RT_OK?'draws':'does not draw (plain page)')+', edge smoothing '+(QL.samples?QL.samples+' samples':(QL.noSmooth?'off (this browser draws it black)':'off'))+'\n\n'
      +DIAG.steps.map(([n,ms])=>(n+'                          ').slice(0,26)+String(ms).padStart(7)+' ms').join('\n')
      +'\n'+(S.ready?'READY':'now: '+DIAG.cur+' for '+Math.round(now-DIAG.last)+' ms')+'\ntotal '+Math.round(now)+' ms since the page opened'
      +'\n\nframes now: '+med(DIAG.fr).toFixed(1)+' ms (1 in 10 over '+p90(DIAG.fr).toFixed(1)+' ms), script '+med(DIAG.js).toFixed(1)+' ms a frame'
      +(DIAG.bench.length?'\n\ntest, ms a frame (typical, 1 in 10, script):\n'+DIAG.bench.map(([n,a,b,c])=>(n+'                    ').slice(0,20)+a.toFixed(1).padStart(7)+b.toFixed(1).padStart(8)+c.toFixed(1).padStart(7)).join('\n'):'')
      +(DIAG.bt==='running'?'\n(testing, a few seconds...)':DIAG.bt==='done'?'\n(test done)':'')
      +(DIAG.errs.length?'\n\nerrors:\n'+DIAG.errs.slice(0,12).join('\n'):'')
      +(TRAIL&&TRAIL.prev?'\n\nTHE LAST VISIT ('+TRAIL.prevAt+') STOPPED WITHOUT CLOSING. Its last steps:\n'+TRAIL.prev.slice(-16).join('\n'):'\n\n(the last visit closed normally)'); },250); }
/* ---------- the gallery, made after the gate ----------
   The gate shows only the lake, under its mist; the gallery is first seen at the door. So the gate opens once the lake is
   made, and the gallery is made after, a small step at a time: at the gate while your hand is still (the mist is over
   everything there), as you walk in while the mist is still lifting, and on the walk at quiet moments. A step is the
   gallery built, or a few of its shaders compiled and linked (a few milliseconds' worth), or one of its places drawn once.
   If you come to the door before it is made, it is made then: the walk eases to a stop at the door until it is, and goes
   on where you were going; a long walk through the light holds the light. The frame timer never counts these frames */
const GLATE={stage:0,si:0,objs:null,oi:0,busy:false,lastIn:-1e9,lastMove:-1e9,qm:0,after:0,want:false,vPrev:0,cbs:[],door:null,log:[]};   // stage: 0 to build, 1 to compile, 2 to draw, 3 made
const GSTATES=[1,2,3,4];
['pointerdown','wheel','keydown','touchstart','touchmove'].forEach(ev=>addEventListener(ev,()=>{ GLATE.lastIn=GLATE.lastMove=performance.now(); },{capture:true,passive:true}));
addEventListener('pointermove',e=>{ GLATE.lastMove=performance.now(); if(e.buttons) GLATE.lastIn=GLATE.lastMove; },{capture:true,passive:true});
function galNeed(){ if(GLATE.stage>=3) return Promise.resolve(); GLATE.want=true; return new Promise(r=>GLATE.cbs.push(r)); }
/* where on the walk the gallery begins to be drawn, from the lake's side and from the courtyard's (in the walk's own measure) */
function doorVs(){ const D=GLATE.door; if(D&&D.tr===TR&&D.stops===STOPS) return D.v;
  const at=(sT,lo,hi)=>{ for(let k=0;k<40;k++){ const m=(lo+hi)/2; if(warp(m)<sT) lo=m; else hi=m; } return lo; };
  const n=STOPS.length-1, v=[at(DOOR_IN-BLEND-.01,0,n),at(DOOR_OUT+BLEND+.01,0,n)]; GLATE.door={tr:TR,stops:STOPS,v}; return v; }
const galAt=v=>{ const s=warp(v); return s>DOOR_IN-BLEND-.01&&s<DOOR_OUT+BLEND+.01; };
/* a long walk landing in the gallery before it is made: the light holds until it is (see VEIL) */
function galFor(v){ if(GLATE.stage>=3||!galAt(v)) return true; GLATE.want=true; return false; }
/* the walk coming to the door before the gallery is made: it eases to a stop there, and asks for the gallery now */
function galDoor(dt){ if(S.mode!=='world'){ GLATE.vPrev=SC.v; return; } const [a,b]=doorVs(), p=GLATE.vPrev;
  if(SC.v>a&&p<=a+1e-4&&SC.v>p){ GLATE.want=true; SC.v=p+(a-p)*(1-Math.exp(-9*dt)); }
  else if(SC.v<b&&p>=b-1e-4&&SC.v<p){ GLATE.want=true; SC.v=p+(b-p)*(1-Math.exp(-9*dt)); }
  if((SC.target>a-.3&&SC.v<=a+1e-4)||(SC.target<b+.3&&SC.v>=b-1e-4)) GLATE.want=true;   // heading for the door: start now
  GLATE.vPrev=SC.v; }
function galQuiet(now){ if(GLATE.want) return true; if(!S.ready) return false;
  if(S.mode==='gate') return now-GLATE.lastMove>700;
  if(S.mode==='entering') return S.veil>.5;
  if(S.mode==='world') return now-GLATE.lastIn>2500&&!SC.touch&&SC.glide===null&&!SC.inertia&&Math.abs(SC.v-SC.target)<.002&&!HOLD.open&&!(LAUNCH.dark>.001);
  return false; }
const hasLight=o=>{ let l=false; o.traverse(x=>{ if(x.isLight) l=true; }); return l; };
let PARC=null; const LINKED=new WeakSet();   // (PARC: whether this browser compiles shaders in the background)
function linkSome(ms){ if(PARC===null){ try{ PARC=!!renderer.getContext().getExtension('KHR_parallel_shader_compile'); }catch(e){ PARC=false; } }
  const t0=performance.now(); let left=false;
  for(const p of renderer.info.programs){ if(LINKED.has(p)) continue; if(PARC&&!p.isReady()){ left=true; continue; }
    /* linked, and taken up only if it linked: a shader three made that can never link (none is drawn with) is left alone,
       as it always was, rather than reported */
    try{ const gl=renderer.getContext(); if(gl.getProgramParameter(p.program,gl.LINK_STATUS)) p.getUniforms(); }catch(e){} LINKED.add(p); if(performance.now()-t0>ms){ left=true; break; } }
  return left; }
/* the gallery set as it is at one place on the walk (the light, the hour, the camera), as the loader used to set it */
function galSet(s,first){ const s0=S.s; S.s=s; const [el,az]=sunAt(s); SUN.el=el; SUN.az=az; sunDir(el,az,SUN.dir); const tod=todAt(el); tintAt(s,TINT);
  camAt('gal',s,CAM.gal); if(first) GAL.update(.016); GAL.applyLight(tod,TINT,s); return s0; }
async function galStep(ms){ const g=GLATE;
  if(g.stage===0){ GAL=buildGallery(); if(G.W) GAL.setSize(G.W,G.H); g.stage=1; g.si=0; g.objs=null; }
  else if(g.stage===1){ const s=GSTATES[g.si], s0=galSet(s,!g.objs);
    if(!g.objs){ g.objs=[]; GAL.scene.traverse(o=>{ if(o.material&&!Array.isArray(o.material)&&!hasLight(o)) g.objs.push(o); }); g.oi=0; }
    const t0=performance.now(), was=renderer.getRenderTarget(); renderer.setRenderTarget(rtA);   // compiled as it will be drawn: into a target
    try{ while(g.oi<g.objs.length){ try{ renderer.compile(g.objs[g.oi++],CAM.gal,GAL.scene); }catch(e){} linkSome(1e9); if(performance.now()-t0>ms) break; } }
    finally{ renderer.setRenderTarget(was); }
    if(g.oi>=g.objs.length){ renderer.setRenderTarget(rtA); try{ renderer.compile(GAL.scene,CAM.gal); }catch(e){} renderer.setRenderTarget(was); g.objs=null; g.si++; if(g.si>=GSTATES.length){ g.stage=2; g.si=0; } }
    S.s=s0; }
  else if(g.stage===2){ if(linkSome(ms)) return;   // drawn only once every shader is finished, so the drawing never waits on one
    const s=GSTATES[g.si], s0=galSet(s,false); GAL.render(CAM.gal,rtA); S.s=s0; g.si++; if(g.si>=GSTATES.length){ g.stage=3; } }
  if(g.stage>=3){ g.want=false; g.cbs.splice(0).forEach(f=>f()); } }
/* once a frame, a moment after it is drawn: a step, if this is a moment for one. Once the gallery is wanted, the steps follow
   each other with only a pause for anything you do in between */
function galTick(){ const g=GLATE; if(g.stage>=3||g.busy) return; const now=performance.now(); if(!g.want&&now<g.after) return; if(!galQuiet(now)) return;
  g.busy=true;
  setTimeout(async()=>{ do{ const t1=performance.now(), st=g.stage; try{ await galStep(g.want?1e9:S.mode==='gate'||S.mode==='entering'?20:8); }catch(e){ console.error('gallery',e); g.stage=3; g.cbs.splice(0).forEach(f=>f()); }
      const t=performance.now(); if(g.log.length<200) g.log.push([st,Math.round(t-t1),S.mode,g.want?1:0]); g.qm=t+400; g.after=t+(t-t1<40?0:250);
      if(!g.want||g.stage>=3) break; await wait(st===g.stage&&g.stage===2?10:0); }while(true);
    g.busy=false; },0); }
async function boot(){
  if(!GL_OK||!RT_OK){ document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.loadStep(1); UI.gateReady(); $('#gateState').textContent='This browser shows the plain page'; return; }
  UI.loadStep(.08); diag('fonts');
  try{ await Promise.race([document.fonts.ready,wait(2600)]); }catch(e){}
  UI.gateEarly();   // (the ways offered now, the walk made behind them)
  await nextFrame(); diag('build outside');
  rtA=RT(4,4,{samples:QL.samples}); rtB=RT(4,4,{samples:QL.samples});
  /* the gallery is made after the gate only where the browser compiles shaders in the background, away from the page:
     elsewhere a gallery shader is one long wait that no step can split, so it is made here, behind the loader, as always */
  let par=false; try{ par=!!renderer.getContext().getExtension('KHR_parallel_shader_compile'); }catch(e){}
  const late=window.__GLATE!==undefined?!!window.__GLATE:par;
  OUT=buildOutside(); UI.loadStep(.3); await nextFrame();
  if(!late){ diag('build gallery'); GAL=buildGallery(); UI.loadStep(.45); await nextFrame(); }
  OUT.sim.clear();
  resize();
  setLayout();
  /* the shaders needed by the end of the loader that no scene holds (the glow, the picture, the water's ripples) are sent off
     first, so that a browser that makes shaders in the background makes them alongside the lake's */
  try{ POST.prep(); OUT.sim.prep(); }catch(e){}
  /* compile and draw every shader once behind the loader, so the walk never stalls (the gallery's after the gate, where it
     is made then: see GLATE) */
  const steps=late?[[0,'out'],[5,'out']]:[[0,'out'],[1,'gal'],[2,'gal'],[3,'gal'],[4,'gal'],[5,'out']], k0=late?.3:.45, k1=late?.6:.5;
  for(let i=0;i<steps.length;i++){ const [s,w]=steps[i]; const W=w==='out'?OUT:GAL, cam=CAM[w];
    S.s=s; const [el,az]=sunAt(s); SUN.el=el; SUN.az=az; sunDir(el,az,SUN.dir); const tod=todAt(el); tintAt(s,TINT);
    camAt(w,s,cam); W.update(.016); W.applyLight(tod,TINT,s);
    diag('compile '+(i+1)+'/'+steps.length+' '+w); await compileQuiet(W.scene,cam);
    diag('first draw '+(i+1)+'/'+steps.length+' '+w); W.render(cam,rtA); UI.loadStep(k0+k1*(i+1)/steps.length); await nextFrame(); }
  if(!late) GLATE.stage=3;
  diag('glow and finish');
  S.s=0; drawReflectText(); OUT.waterMat.uniforms.tText.value=TXT.tex;
  const bt=POST.bloom(rtA); POST.comp.uniforms.tScene.value=rtA.texture; POST.comp.uniforms.tBloom.value=bt; POST.pass(POST.comp,null);
  UI.loadStep(1); diag('ready');
  GLATE.vPrev=SC.v;
  S.ready=true; setTimeout(()=>UI.gateReady(),TEST?0:500);
  setTimeout(ahead,TEST?0:2500);
}
/* Land opens a page of its own, with a large script of its own. Once this page is ready and quiet, that script and its
   styles are fetched in the background into the browser's cache, so choosing Land (or the rocket at the end of the walk)
   finds them already here. Nothing on this page waits for them; a visitor saving data, or on a very slow
   connection, is not sent them */
function ahead(){ if(!AHEAD.length) return; const c=navigator.connection; if(c&&(c.saveData||/2g$/.test(c.effectiveType||''))) return;
  for(const u of AHEAD){ try{ fetch(u,{priority:'low'}).then(r=>r.ok?r.arrayBuffer():null).catch(()=>{}); }catch(e){} } }
requestAnimationFrame(frame);
boot().catch(e=>{ console.error(e); document.documentElement.classList.add('nogl'); S.nogl=true; S.ready=true; UI.gateReady(); });

/* ---------- test hooks: jump along the walk, step time, open things ---------- */
window.__tamed={gal:()=>({stage:GLATE.stage,want:GLATE.want,log:GLATE.log}),galNeed,S,SC,A,QL,UI,PLACES,LAUNCH,POND,rtWorks,get RT_OK(){ return RT_OK; },get OUT(){return OUT;},get GAL(){return GAL;},CAM,POST,renderer,get rtA(){return rtA;},SUN,TODC,
  probe(pts){ const h2f=h=>{ const s=(h&0x8000)>>15,e=(h&0x7C00)>>10,f=h&0x03FF; if(e===0) return (s?-1:1)*Math.pow(2,-14)*(f/1024); if(e===0x1F) return f?NaN:(s?-1:1)*Infinity; return (s?-1:1)*Math.pow(2,e-15)*(1+f/1024); };
    const b=new Uint16Array(4); return pts.map(([x,y])=>{ renderer.readRenderTargetPixels(rtA,Math.floor(x*rtA.width),Math.floor((1-y)*rtA.height),1,1,b); return [...b].map(h=>+h2f(h).toFixed(3)); }); },
  enter,travel,
  jump(s){ if(GLATE.stage<3&&s>DOOR_IN-BLEND-.01&&s<DOOR_OUT+BLEND+.01) return galNeed().then(()=>window.__tamed.jump(s)); S.mode='world'; S.veil=0; S.enterK=1; gate.classList.add('go','gone'); ui.classList.add('on'); $('#logo').classList.add('on'); const i=STOPS.indexOf(s); SC.v=SC.target=SC.turn=i>=0?i:s; SC.glide=null; SC.inertia=0; SC.lastIn=-9; SC.pin=false; SC.fresh=true; },
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
/* Land is a page of its own: once the front door is in and the browser is idle, Land's script and styles are asked for (at
   the very addresses Land asks for, which the build writes into the page), so going in finds them already kept */
addEventListener('load',()=>{ const m=document.querySelector('meta[name="heloria-land"]'); if(!m||!m.content||!window.fetch) return;
  const go=()=>m.content.split(',').forEach(u=>{ try{ fetch(u,{credentials:'same-origin'}).then(r=>r.ok&&r.blob()).catch(()=>{}); }catch(e){} });
  if(window.requestIdleCallback) requestIdleCallback(go,{timeout:6000}); else setTimeout(go,3000); });

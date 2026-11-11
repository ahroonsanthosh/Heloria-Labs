/* ================= THE HAND: SCROLL, TOUCH, KEYS, HOLD =================
   A damped virtual scroll. Input moves a target; the walk follows it with weight. One gesture takes you one place on: once
   the hand has moved the walk off a place it is on its way to the next one that way, and when the hand goes still it walks
   on there, never back. A fling never carries you past that next place, however long a trackpad's tail goes on; a new
   gesture (the next notch of a wheel, another swipe, even one that starts while the last one's tail is still fading) takes
   you one place further. The walk only goes back when the hand does, or by a hair when the hand only grazed the wheel. */
const SC={v:0, target:0, lastIn:-9, dir:1, turn:0, glide:null, touch:null, inertia:0, base:0, k:2.6, fresh:true, src:'wheel', wt:-9, g0:-9, fast:0, slow:0, fell:false, sign:0, gmin:9};
/* how far the hand travels for one place: generous, so the walk keeps its pace however hard you scroll */
const PXSTOP=()=>FINE?1250:Math.max(560,innerHeight*.85);
/* less than DEAD and the hand only grazed the wheel or the glass, and the walk stays on its place; the hand has turned back
   once it has come back TURN, never on a tremor */
const DEAD=.035, TURN=.025;
const now=()=>performance.now()/1000;
function scrollMax(){ return STOPS.length-1; }
/* a wheel turned notch by notch (a tenth of a second or more apart), not a trackpad's stream of sixty a second: every
   notch is meant, however small (a Mac gives a slow notch of a mouse wheel as 4 pixels), and it turns the way it goes at
   once */
const ticks=()=>SC.src==='wheel'&&SC.gmin>=.1;
/* where the walk is going: the place the target stands on, or the next one the way the hand is going */
function aim(){ const x=SC.target, r=Math.round(x), tick=ticks()&&Math.abs(x-SC.base)>=.002;
  return clamp(Math.abs(x-r)<DEAD&&!tick?r:(SC.dir>0?Math.ceil(x):Math.floor(x)),0,scrollMax()); }
/* a gesture starts from where the walk is going and reaches at most one place on from there */
function gesture(){ SC.base=aim(); SC.turn=SC.target; SC.g0=now(); SC.fresh=false; SC.fell=false; SC.gmin=9; }
const reach=x=>clamp(x,Math.max(0,SC.base-1),Math.min(scrollMax(),SC.base+1));
/* when the hand turns back, the walk turns at once from where it is, not from where it was heading (the target runs ahead
   of the walk, and would carry it on the old way a moment longer) */
function steer(){ const d=SC.target-SC.turn; if(d*SC.dir>=0){ SC.turn=SC.target; return; } if(Math.abs(d)<=(ticks()?0:TURN)) return;
  SC.dir=-SC.dir; const c=reach(SC.dir>0?Math.max(SC.target,SC.v):Math.min(SC.target,SC.v))-SC.target;
  SC.target+=c; if(SC.touch) SC.touch.v0+=c; SC.turn=SC.target; }
function moveBy(dv){ SC.target=reach(SC.target+dv); steer(); }
/* keys, the menu and a jump set the walk going somewhere of their own: the next input starts afresh from there */
function goTo(i,d){ SC.glide=i; SC.target=i; SC.dir=d; SC.turn=i; SC.inertia=0; SC.fresh=true; }
function nudge(dv,fresh){
  if(S.mode!=='world') return;
  if(fresh||SC.fresh||SC.glide!==null) gesture();
  SC.glide=null; SC.pin=false; SC.inertia=0; SC.src='wheel'; moveBy(dv); SC.lastIn=now(); SC.lastF=S.frame;
  UI.firstScroll();
}
/* a new gesture on the wheel: the hand still for a moment, a turn the other way, or a clear rise in a stream that had been
   fading (a trackpad goes on sending its fading tail after the fingers lift; the fingers coming down again for another
   swipe, or the next notch of a wheel, rise out of it). fast and slow are the stream's strength over the last two frames or
   so and over the last fifth of a second */
function wheelFresh(d){
  const t=now(), gap=t-SC.wt, ad=Math.abs(d), sg=Math.sign(d); SC.wt=t;
  const f=SC.fast*Math.exp(-gap/.03), s=SC.slow*Math.exp(-gap/.2);
  if(f/.03<s/.2*.8) SC.fell=true;
  SC.fast=f+ad; SC.slow=s+ad;
  const turned=sg&&sg!==SC.sign&&ad>=4; if(sg&&(ad>=4||!SC.sign)) SC.sign=sg;
  const fresh=gap>.18||turned||(SC.fell&&ad>=6&&SC.fast/.03>1.6*SC.slow/.2&&t-SC.g0>.12);
  if(!fresh) SC.gmin=Math.min(SC.gmin,gap);
  return fresh;
}
function scrollTick(dt){
  const t=now();
  if(S.mode==='world'||S.mode==='veil'){
    const touching=!!SC.touch;
    if(SC.glide!==null||touching) SC.pin=false;
    if(SC.inertia&&!touching){ moveBy(SC.inertia*dt); SC.inertia*=Math.exp(-4.2*dt); if(Math.abs(SC.inertia)<.02) SC.inertia=0; }
    /* settle once the hand lets go: on the place the walk is going to. A finger off the glass is plainly done; a wheel
       could still be turning, so it waits a moment, unless what is coming is only fading (the tail a trackpad sends after
       the fingers lift, or the gap after a notch), when the walk carries on the way it was going at once; and a graze waits
       longest before the walk steps back to its place. (The test browser draws a frame only now and then, so there it
       waits for some frames as well as for the time) */
    const slow=TEST&&!SC.live, quiet=t-SC.lastIn, goal=aim(), back=(goal-SC.target)*SC.dir<0;
    const Q=slow?1.6:(back?1:(SC.src==='touch'?.12:.3)), still=!slow||S.frame-(SC.lastF||0)>6;
    const wg=t-SC.wt, fading=!slow&&!back&&SC.src==='wheel'&&SC.fast*Math.exp(-wg/.03)/.03<.8*SC.slow*Math.exp(-wg/.2)/.2;
    if(!touching&&(quiet>Q||fading)&&still&&SC.glide===null&&!SC.pin){
      SC.target=damp(SC.target,goal,clamp(.9+(quiet-Q)*4,.9,2.6),dt);
      if(Math.abs(SC.target-goal)<1e-4) SC.target=goal;
    }
    /* the walk follows the hand with weight, unhurried; closer under a finger. The weight changes gently, so the walk never
       lurches as a finger lifts */
    SC.k=damp(SC.k,SC.glide!==null?1.8:(touching?6:2.6),5,dt);
    SC.v=damp(SC.v,SC.target,SC.k,dt);
    if(SC.glide!==null&&Math.abs(SC.v-SC.glide)<.004){ SC.v=SC.target=SC.glide; SC.glide=null; }
  }
}
/* travel: a short walk glides; a long one passes through a wash of light */
function travel(id){
  const p=placeById(id); if(!p) return;
  let idx=STOPS.indexOf(p.s); if(idx<0) idx=stopOf(p.s);
  if(S.mode!=='world') return;
  const d=Math.abs(idx-SC.v);
  if(d<.02) return;
  if(d<=1.25){ const up=idx>SC.v; goTo(idx,up?1:-1); A.whoosh(up,1.6,.04); }
  else VEIL.go(idx,p);
}
const VEIL={t:0,phase:0,to:0,col:new T.Color(),k:0,
  go(idx,p){ this.to=idx; this.t=0; this.phase=1; S.mode='veil'; this.col.set(p.proj>=0?PROJ[p.proj].col:(p.id==='contact'?'#E9B9A0':p.id==='team'?'#FFD2A8':'#FFF0DC')); A.whoosh(true,1.4,.05); },
  tick(dt){
    if(!this.phase) return;
    this.t+=dt;
    if(this.phase===1){ this.k=E.io2(clamp(this.t/.55,0,1)); if(this.t>=.6){ this.phase=2; this.t=0; SC.v=SC.target=SC.turn=this.to; SC.glide=null; SC.inertia=0; SC.fresh=true; UI.jumped(); } }
    else if(this.phase===2){ this.k=1; if(this.t>.12&&galFor(this.to)){ this.phase=3; this.t=0; } }   // (into the gallery before it is made: the light holds until it is)
    else { this.k=1-E.o(clamp(this.t/.9,0,1)); if(this.t>=.9){ this.phase=0; this.k=0; if(S.mode==='veil') S.mode='world'; } }
  }};

/* ---------- pointer ---------- */
const M={x:innerWidth/2,y:innerHeight/2,px:innerWidth/2,py:innerHeight/2,vx:0,vy:0,on:false,type:'mouse',t:0};
const HOLD={down:false,open:false,t0:0,x:0,y:0,moved:false,id:-1,pointer:null};
const isUI=el=>!!(el&&el.closest&&el.closest('a,button,input,[data-noh]'));
addEventListener('pointermove',e=>{
  const t=now(), dt=Math.max(.008,t-M.t); M.t=t;
  M.vx=lerp(M.vx,(e.clientX-M.x)/dt,.35); M.vy=lerp(M.vy,(e.clientY-M.y)/dt,.35);
  M.x=e.clientX; M.y=e.clientY; M.type=e.pointerType; M.on=e.pointerType==='mouse'||e.pointerType==='pen';
  if(HOLD.down&&!HOLD.open){ const d=Math.hypot(e.clientX-HOLD.x,e.clientY-HOLD.y); if(d>(e.pointerType==='touch'?10:14)){ HOLD.moved=true; HOLD.down=false; UI.ring(0); } }
  if(HOLD.open) UI.indexHover(e.clientX,e.clientY);
  if(SC.touch&&e.pointerId===SC.touch.id){ const dy=SC.touch.y-e.clientY;
    if(S.mode==='world'){ SC.target=reach(SC.touch.v0+dy/PXSTOP()); steer(); SC.lastIn=t; SC.lastF=S.frame; UI.firstScroll(); }
    const vt=(dy-SC.touch.py)/Math.max(.008,t-SC.touch.pt); SC.touch.vel=lerp(SC.touch.vel,vt,.4); SC.touch.py=dy; SC.touch.pt=t; SC.touch.far=Math.max(SC.touch.far,Math.abs(dy)); }
},{passive:true});
addEventListener('pointerdown',e=>{
  if(e.button>0) return;
  M.x=e.clientX; M.y=e.clientY; M.type=e.pointerType;
  /* a swipe walks wherever it starts, on a link too (a finger that moves never makes a click); only a still tap is the link's */
  if(e.pointerType==='touch'&&S.mode==='world'&&!HOLD.open&&!(e.target&&e.target.closest&&e.target.closest('input,textarea'))){
    SC.inertia=0; SC.glide=null; SC.src='touch'; gesture(); SC.touch={id:e.pointerId,y:e.clientY,v0:SC.target,vel:0,py:0,pt:now(),far:0,ui:isUI(e.target)}; }
  if(S.mode==='world'&&!isUI(e.target)&&!HOLD.open){ HOLD.down=true; HOLD.moved=false; HOLD.t0=now(); HOLD.f0=S.frame; HOLD.x=e.clientX; HOLD.y=e.clientY; HOLD.id=e.pointerId; }
  if(S.mode==='world'&&!isUI(e.target)&&e.pointerType!=='touch') WORLD.tap(e.clientX,e.clientY);
},{passive:true});
const endPointer=e=>{
  /* a flick carries on after the finger lifts, so the walk keeps its speed; a finger that stopped before it lifted, or that
     only wobbled on a tap, throws nothing */
  if(SC.touch&&e.pointerId===SC.touch.id){ const far=SC.touch.far, v=now()-SC.touch.pt<.08&&far>16?SC.touch.vel:0, moved=far>8;
    if(S.mode==='world'&&moved){ SC.inertia=clamp(v/PXSTOP(),-2.5,2.5)*.6; }
    else if(S.mode==='world'&&!moved&&!HOLD.open&&e.type==='pointerup'&&!SC.touch.ui) WORLD.tap(e.clientX,e.clientY);
    SC.touch=null; SC.lastIn=now(); SC.lastF=S.frame; }
  if(HOLD.open){ UI.indexRelease(e.clientX,e.clientY,now()-HOLD.t0); }
  HOLD.down=false; UI.ring(0);
};
addEventListener('pointerup',endPointer,{passive:true});
addEventListener('pointercancel',endPointer,{passive:true});
document.addEventListener('mouseleave',()=>{ M.on=false; });
/* (a press only counts as held once a few frames have gone by as well: on a slow frame the finger's first move can be
   waiting behind it, and a swipe must never open the index) */
function holdTick(){
  if(HOLD.down&&!HOLD.open&&!HOLD.moved){ const k=(now()-HOLD.t0-.12)/.48; UI.ring(clamp(k,0,1),HOLD.x,HOLD.y);
    if(k>=1&&S.frame-HOLD.f0>=6){ /* a held finger, not one slow frame: the start of a swipe never opens it */ HOLD.open=true; HOLD.down=false; UI.ring(0); UI.indexOpen(true); if(SC.touch){ SC.touch=null; } } }
}
addEventListener('wheel',e=>{
  if(S.mode==='gate'||S.mode==='entering'||S.mode==='plain'){ return; }
  e.preventDefault();
  let d=Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.2?e.deltaX:e.deltaY;
  if(e.deltaMode===1) d*=32; else if(e.deltaMode===2) d*=innerHeight;
  d=clamp(d,-260,260); S.wheelLog=(S.wheelLog||[]).slice(-9).concat([[Math.round(e.deltaY),e.deltaMode,Math.round(d),+SC.target.toFixed(3)]]);
  if(HOLD.open) return;
  nudge(d/PXSTOP(),wheelFresh(d));
},{passive:false});
addEventListener('keydown',e=>{
  if(e.target&&e.target.closest&&e.target.closest('input,textarea')) return;
  if(e.key==='Escape'){ if(HOLD.open){ UI.indexOpen(false); return; } }
  if(S.mode==='gate'||S.mode==='plain') return;
  if(S.mode!=='world') return;
  const f=document.activeElement; const onCtl=f&&f!==document.body&&f.matches&&f.matches('a,button');
  if(['ArrowDown','PageDown','ArrowRight'].includes(e.key)||(e.key===' '&&!onCtl)){ e.preventDefault(); goTo(Math.min(scrollMax(),Math.round(SC.target)+1),1); UI.firstScroll(); }
  else if(['ArrowUp','PageUp','ArrowLeft'].includes(e.key)){ e.preventDefault(); goTo(Math.max(0,Math.round(SC.target)-1),-1); }
  else if(e.key==='Home'){ e.preventDefault(); travel('home'); }
  else if(e.key==='End'){ e.preventDefault(); travel('contact'); }
  else if(e.key==='i'||e.key==='I'){ UI.indexOpen(!HOLD.open); }
});
/* a long press on a touch screen is ours (the index), not the browser's menu */
addEventListener('contextmenu',e=>{ if(M.type==='touch'||HOLD.down||HOLD.open) e.preventDefault(); });

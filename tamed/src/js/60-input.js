/* ================= THE HAND: SCROLL, TOUCH, KEYS, HOLD =================
   A damped virtual scroll. Input moves a target; the walk follows it with weight. When the hand goes
   quiet the walk settles on the nearest place, leaning the way you were going. It never pulls against
   a trackpad that is still moving. */
const SC={v:0, target:0, lastIn:-9, dir:1, glide:null, touch:null, inertia:0};
const PXSTOP=()=>FINE?820:Math.max(420,innerHeight*.62);
const now=()=>performance.now()/1000;
function scrollMax(){ return STOPS.length-1; }
function nudge(dv){
  if(S.mode!=='world') return;
  SC.glide=null; SC.target=clamp(SC.target+dv,-.12,scrollMax()+.12); SC.lastIn=now(); if(dv) SC.dir=Math.sign(dv);
  UI.firstScroll();
}
function scrollTick(dt){
  const t=now();
  if(S.mode==='world'||S.mode==='veil'){
    const quiet=t-SC.lastIn, touching=!!SC.touch;
    if(SC.inertia&&!touching){ const step=SC.inertia*dt; SC.target=clamp(SC.target+step,-.12,scrollMax()+.12); SC.inertia*=Math.exp(-4.2*dt); if(Math.abs(SC.inertia)<.02) SC.inertia=0; SC.lastIn=t-.05; }
    if(!touching&&!SC.inertia&&quiet>.22&&SC.glide===null){
      const f=SC.target-Math.floor(SC.target); let goal;
      if(SC.dir>0) goal=f>.2?Math.ceil(SC.target):Math.floor(SC.target); else goal=f<.8?Math.floor(SC.target):Math.ceil(SC.target);
      goal=clamp(goal,0,scrollMax());
      SC.target=damp(SC.target,goal,Math.min(4.5,1.5+quiet*6),dt);
      if(Math.abs(SC.target-goal)<1e-4) SC.target=goal;
    }
    const k=SC.glide!==null?2.2:(touching?9:4.2);
    SC.v=damp(SC.v,SC.target,k,dt);
    if(SC.glide!==null&&Math.abs(SC.v-SC.glide)<.004){ SC.v=SC.target=SC.glide; SC.glide=null; }
  }
}
/* travel: a short walk glides; a long one passes through a wash of light */
function travel(id){
  const p=placeById(id); if(!p) return;
  if(S.mode==='page') CASE.close(true);
  let idx=STOPS.indexOf(p.s); if(idx<0) idx=stopOf(p.s);
  if(S.mode!=='world') return;
  const d=Math.abs(idx-SC.v);
  if(d<.02) return;
  if(d<=1.25||RM&&d<=1.25){ SC.glide=idx; SC.target=idx; SC.dir=Math.sign(idx-SC.v)||1; A.whoosh(idx>SC.v,1.6,.04); }
  else VEIL.go(idx,p);
}
const VEIL={t:0,phase:0,to:0,col:new T.Color(),k:0,
  go(idx,p){ this.to=idx; this.t=0; this.phase=1; S.mode='veil'; this.col.set(p.proj>=0?PROJ[p.proj].col:(p.id==='contact'?'#E9B9A0':p.id==='team'?'#FFD2A8':'#FFF0DC')); A.whoosh(true,1.4,.05); },
  tick(dt){
    if(!this.phase) return;
    this.t+=dt;
    if(this.phase===1){ this.k=E.io2(clamp(this.t/.55,0,1)); if(this.t>=.6){ this.phase=2; this.t=0; SC.v=SC.target=this.to; SC.glide=null; UI.jumped(); } }
    else if(this.phase===2){ this.k=1; if(this.t>.12){ this.phase=3; this.t=0; } }
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
    if(S.mode==='page') CASE.drag(dy-SC.touch.last), SC.touch.last=dy;
    else if(S.mode==='world'){ SC.target=clamp(SC.touch.v0+dy/PXSTOP(),-.15,scrollMax()+.15); SC.lastIn=t; if(Math.abs(dy)>4) SC.dir=Math.sign(dy); UI.firstScroll(); }
    const vt=(dy-SC.touch.py)/Math.max(.008,t-SC.touch.pt); SC.touch.vel=lerp(SC.touch.vel,vt,.4); SC.touch.py=dy; SC.touch.pt=t; }
},{passive:true});
addEventListener('pointerdown',e=>{
  if(e.button>0) return;
  M.x=e.clientX; M.y=e.clientY; M.type=e.pointerType;
  if(e.pointerType==='touch'&&(S.mode==='world'||S.mode==='page')&&!HOLD.open&&!isUI(e.target)){
    SC.touch={id:e.pointerId,y:e.clientY,v0:SC.target,vel:0,py:0,pt:now(),last:0}; SC.inertia=0; SC.glide=null; CASE.stopInertia(); }
  if((S.mode==='world'||S.mode==='page')&&!isUI(e.target)&&!HOLD.open){ HOLD.down=true; HOLD.moved=false; HOLD.t0=now(); HOLD.x=e.clientX; HOLD.y=e.clientY; HOLD.id=e.pointerId; }
  if(S.mode==='world'&&!isUI(e.target)&&e.pointerType!=='touch') WORLD.tap(e.clientX,e.clientY);
},{passive:true});
const endPointer=e=>{
  if(SC.touch&&e.pointerId===SC.touch.id){ const v=SC.touch.vel; const moved=Math.abs(SC.touch.py)>8;
    if(S.mode==='page') CASE.fling(v);
    else if(S.mode==='world'&&moved){ SC.inertia=clamp(v/PXSTOP(),-3.2,3.2)*.9; }
    else if(S.mode==='world'&&!moved&&!HOLD.open&&e.type==='pointerup') WORLD.tap(e.clientX,e.clientY);
    SC.touch=null; SC.lastIn=now(); }
  if(HOLD.open){ UI.indexRelease(e.clientX,e.clientY,now()-HOLD.t0); }
  HOLD.down=false; UI.ring(0);
};
addEventListener('pointerup',endPointer,{passive:true});
addEventListener('pointercancel',endPointer,{passive:true});
document.addEventListener('mouseleave',()=>{ M.on=false; });
function holdTick(){
  if(HOLD.down&&!HOLD.open&&!HOLD.moved){ const k=(now()-HOLD.t0-.12)/.48; UI.ring(clamp(k,0,1),HOLD.x,HOLD.y);
    if(k>=1){ HOLD.open=true; HOLD.down=false; UI.ring(0); UI.indexOpen(true); if(SC.touch){ SC.touch=null; } } }
}
addEventListener('wheel',e=>{
  if(S.mode==='gate'||S.mode==='entering'){ return; }
  e.preventDefault();
  let d=Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.2?e.deltaX:e.deltaY;
  if(e.deltaMode===1) d*=32; else if(e.deltaMode===2) d*=innerHeight;
  d=clamp(d,-260,260);
  if(HOLD.open) return;
  if(S.mode==='page') CASE.wheel(d); else nudge(d/PXSTOP());
},{passive:false});
addEventListener('keydown',e=>{
  if(e.target&&e.target.closest&&e.target.closest('input,textarea')) return;
  if(e.key==='Escape'){ if(HOLD.open){ UI.indexOpen(false); return; } if(S.mode==='page'){ CASE.close(); return; } }
  if(S.mode==='gate') return;
  if(S.mode==='page'){ if(['ArrowDown','PageDown',' '].includes(e.key)){ e.preventDefault(); CASE.wheel(e.key==='ArrowDown'?120:innerHeight*.8); } if(['ArrowUp','PageUp'].includes(e.key)){ e.preventDefault(); CASE.wheel(e.key==='ArrowUp'?-120:-innerHeight*.8); } return; }
  if(S.mode!=='world') return;
  const f=document.activeElement; const onCtl=f&&f!==document.body&&f.matches&&f.matches('a,button');
  if(['ArrowDown','PageDown','ArrowRight'].includes(e.key)||(e.key===' '&&!onCtl)){ e.preventDefault(); const i=Math.min(scrollMax(),Math.round(SC.target)+1); SC.glide=i; SC.target=i; SC.dir=1; UI.firstScroll(); }
  else if(['ArrowUp','PageUp','ArrowLeft'].includes(e.key)){ e.preventDefault(); const i=Math.max(0,Math.round(SC.target)-1); SC.glide=i; SC.target=i; SC.dir=-1; }
  else if(e.key==='Home'){ e.preventDefault(); travel('home'); }
  else if(e.key==='End'){ e.preventDefault(); travel('contact'); }
  else if(e.key==='i'||e.key==='I'){ UI.indexOpen(!HOLD.open); }
});

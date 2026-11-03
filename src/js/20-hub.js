/* ================= HUB: FLIGHT, MAP, DOCKING ================= */
const S={mode:'load',ch:0,chT:0,t:0,tau:0,hold:0,form:0,formT:null,flash:0,intro:0,introT:0,yaw:.5,zoom:1,iris:0,arrive:0,shake:0,ca:0,rdt:0,games:0,
  probe:{p:new T.Vector3(10,0,0),v:new T.Vector3(),thr:0,head:0}, ap:null, docked:new Set(), near:null, st:null, stId:null, firstThrust:false, hubT:0, edgeT:0, sealT:0, sealK:1, call:null, callK:0, callWait:1.6, callT:0};
const keys=new Set();
const tv=[...Array(10)].map(()=>new T.Vector3());
const _m=new T.Matrix4(), UPV=new T.Vector3(0,1,0);
function lookQ(pos,target,out){ _m.lookAt(pos,target,UPV); return out.setFromRotationMatrix(_m); }
const mkPose=()=>({p:new T.Vector3(),q:new T.Quaternion(),fov:36});
const chase=mkPose(), fromP=mkPose(), closeP=mkPose();
const hubBase={p:new T.Vector3(0,1.2,70),q:new T.Quaternion()};

function chasePose(out){
  const P=S.probe, D=12.5*S.zoom, H=5.4*S.zoom;
  out.p.set(P.p.x+Math.sin(S.yaw)*D,H,P.p.z+Math.cos(S.yaw)*D);
  tv[0].copy(P.p).addScaledVector(P.v,.25); tv[0].y=-.9;
  if(SB.look>0) tv[0].multiplyScalar(1-SB.look*.5);   // while the seal breaks, the camera turns a little toward the hole
  lookQ(out.p,tv[0],out.q); out.fov=36; return out;
}

/* ---------- input ---------- */
addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input')) return;
  keys.add(e.code);
  if(e.code==='KeyE'&&S.mode==='hub'&&S.near) dock(S.near);
  if(e.code==='Escape'&&S.mode==='station') undock();
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&S.mode==='hub'){ S.ap=null; e.preventDefault(); }
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
let drag=null;
canvas.addEventListener('pointerdown',e=>{
  if(S.mode==='finale'){ finHold(true); return; }
  if(S.mode==='station'&&S.st&&S.st.onPointer) return S.st.onPointer(e);
  if(S.mode!=='hub') return;
  drag={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,touch:e.pointerType!=='mouse',id:e.pointerId};
  if(drag.touch){ const s=$('#stick'); s.hidden=false; s.style.left=e.clientX+'px'; s.style.top=e.clientY+'px'; S.ap=null; }
});
addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id) return;
  if(!drag.touch){ S.yaw-=(e.clientX-drag.x)*.005; drag.x=e.clientX; }
  else { drag.x=e.clientX; drag.y=e.clientY; const dx=clamp(drag.x-drag.ox,-50,50),dy=clamp(drag.y-drag.oy,-50,50); $('#stick i').style.transform=`translate(${dx}px,${dy}px)`; }
});
const endDrag=e=>{ if(drag&&(!e||e.pointerId===drag.id)){ drag=null; $('#stick').hidden=true; $('#stick i').style.transform=''; } };
addEventListener('pointerup',endDrag); addEventListener('pointercancel',endDrag);
addEventListener('wheel',e=>{ if(S.mode==='hub'){ S.zoom=clamp(S.zoom*Math.exp(e.deltaY*.0008),.72,1.35); e.preventDefault(); } },{passive:false});

/* the hole as a destination: sealed until you have docked at one station; what is on the other side is Earth */
const SEAL=2.4, HOLE={id:'hole',name:'The horizon',pos:new T.Vector3(),vel:new T.Vector3(),R:0,color:'#FFC392'};
const holeOpen=()=>S.docked.size>=1, SEALTINT=new T.Color(.06,.015,0);
function autopilot(s){ if(S.mode!=='hub') return; if(s===HOLE&&!holeOpen()) return; if(S.near===s) return dock(s); S.ap=s; toast(s===HOLE?'Autopilot · into the horizon':'Autopilot · '+s.name); A.blip(); }
$('#dockp').addEventListener('click',()=>S.near&&dock(S.near));

/* ---------- physics ---------- */
function hubPhysics(dt){
  const P=S.probe;
  const fwd=tv[1].set(-Math.sin(S.yaw),0,-Math.cos(S.yaw)), rgt=tv[2].set(Math.cos(S.yaw),0,-Math.sin(S.yaw));
  let ix=0,iz=0;
  if(keys.has('KeyW')||keys.has('ArrowUp')) iz+=1; if(keys.has('KeyS')||keys.has('ArrowDown')) iz-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight')) ix+=1; if(keys.has('KeyA')||keys.has('ArrowLeft')) ix-=1;
  if(drag&&drag.touch){ ix=clamp((drag.x-drag.ox)/50,-1,1); iz=clamp(-(drag.y-drag.oy)/50,-1,1); }
  const thrust=tv[3].copy(fwd).multiplyScalar(iz).addScaledVector(rgt,ix);
  if(thrust.lengthSq()>.01&&!S.firstThrust){ S.firstThrust=true; $('#hint').classList.add('gone'); }
  const r=Math.max(.5,Math.hypot(P.p.x,P.p.z));
  if(S.ap){ const s=S.ap; const to=tv[4].copy(s.pos).sub(P.p); to.y=0; const dist=to.length();
    const dl=tv[5].copy(to).normalize(); const along=clamp(-P.p.dot(dl),0,dist); const cl=tv[6].copy(P.p).addScaledVector(dl,along); cl.y=0;
    let aim=to, aimLen=dist;
    if(s!==HOLE&&cl.length()<8.5&&dist>4){ const side=cl.length()>.1?cl.normalize():tv[6].set(-P.p.z,0,P.p.x).normalize(); aim=side.multiplyScalar(Math.max(9.5,Math.min(r,s.R))).sub(P.p); aim.y=0; aimLen=aim.length()+6; }
    const want=tv[7].copy(aim).normalize().multiplyScalar(Math.min(11,aimLen*1.1)).add(s.vel);
    thrust.copy(want.sub(P.v)).multiplyScalar(.6); if(thrust.length()>1.5) thrust.setLength(1.5);
    if(dist<2.2&&s!==HOLE){ S.ap=null; dock(s); return; }
    U.apLine.visible=true; const ap=U.apLine.geometry.attributes.position.array; ap[0]=P.p.x;ap[1]=0;ap[2]=P.p.z;ap[3]=s.pos.x;ap[4]=s.pos.y;ap[5]=s.pos.z; U.apLine.geometry.attributes.position.needsUpdate=true; U.apLine.material.uniforms.uR.value=dist*1.2; U.apLine.material.uniforms.uOp.value=1;
  } else U.apLine.visible=false;
  const tl=Math.min(1.5,thrust.length()); P.thr=damp(P.thr,tl,10,dt);
  const acc=tv[8].set(-P.p.x,0,-P.p.z).multiplyScalar(GM/(r*r*r)).addScaledVector(thrust,9);
  if(tl<.05&&r>3.5){ const vc=Math.sqrt(GM/r); const tang=tv[9].set(-P.p.z/r,0,P.p.x/r); const sg=Math.sign(tang.dot(P.v))||1; tang.multiplyScalar(vc*sg).sub(P.v); acc.addScaledVector(tang,.4); }
  if(r>RB-2.5){ acc.addScaledVector(tv[4].set(-P.p.x/r,0,-P.p.z/r),(r-(RB-2.5))*9); if(S.t>S.edgeT){ S.edgeT=S.t+6; A.beep(440); } }
  if(S.ap&&S.ap!==HOLE&&r<7) acc.addScaledVector(tv[4].set(P.p.x/r,0,P.p.z/r),30);
  P.v.addScaledVector(acc,dt); if(P.v.length()>12) P.v.setLength(12);
  P.p.addScaledVector(P.v,dt); P.p.y=0;
  if(S.ap&&S.ap!==HOLE){ const rr=Math.hypot(P.p.x,P.p.z); if(rr<4){ P.p.multiplyScalar(4/rr); const vr=(P.v.x*P.p.x+P.v.z*P.p.z)/4; if(vr<0){ P.v.x-=vr*P.p.x/4; P.v.z-=vr*P.p.z/4; } } } // autopilot never falls in by accident
  // until you have docked somewhere, the horizon is sealed: the probe bounces off it
  if(!holeOpen()){ const rr=Math.hypot(P.p.x,P.p.z);
    if(rr<SEAL){ const nx=P.p.x/rr, nz=P.p.z/rr; P.p.x=nx*SEAL; P.p.z=nz*SEAL; const vr=P.v.x*nx+P.v.z*nz; if(vr<0){ P.v.x-=1.7*vr*nx; P.v.z-=1.7*vr*nz; }
      U.sealU.uNear.value=1; if(S.t>S.sealT){ S.sealT=S.t+3.5; toast('The horizon is sealed · dock at any station first'); A.beep(330); A.beep(262); feedback(.35,1.2,SEALTINT); } } }
  else if(r<1.35){ crossHorizon(); return; }
  if(P.v.lengthSq()>.04) P.head=P.head+angDiff(Math.atan2(-P.v.x,-P.v.z),P.head)*Math.min(1,dt*6);
  U.probe.position.copy(P.p); U.probe.rotation.set(0,P.head,0); U.engU.uThr.value=P.thr; A.thrust(P.thr);
  if(P.thr>.1){ tv[4].set(Math.sin(P.head),0,Math.cos(P.head)).multiplyScalar(.3+P.thr*.35).add(P.p); for(let k=0;k<Math.ceil(P.thr*3*Q);k++) U.exhaust.emit(tv[4],1,.35,null,0,.45+Math.random()*.3); }
  U.exhaust.update(dt,0,2.2);   // the sparks drift, cool and go out behind you
  U.trailPos.copyWithin(3,0,(TRL-1)*3); U.trailPos[0]=P.p.x;U.trailPos[1]=0;U.trailPos[2]=P.p.z;
  for(let i=0;i<TRL;i++){const f=Math.pow(1-i/TRL,2)*.8; U.trailCol[i*3]=f*.85;U.trailCol[i*3+1]=f*.78;U.trailCol[i*3+2]=f;}
  U.trailG.attributes.position.needsUpdate=true; U.trailG.attributes.color.needsUpdate=true;
  U.dustU.uC.value.copy(P.p); U.dustU.uV.value.copy(P.v); U.gridU.uProbe.value.copy(P.p); U.sealU.uNear.value=damp(U.sealU.uNear.value,0,2.5,dt);
  U.fenceU.uPA.value=Math.atan2(P.p.z,P.p.x); U.fenceU.uNear.value=sstep(RB-6,RB-1,r);
  // proximity
  let near=null, nd=1e9; STA.forEach(s=>{ const d=s.pos.distanceTo(P.p); if(d<nd){nd=d;near=s;} s.zone.material.uniforms.uNear.value=damp(s.zone.material.uniforms.uNear.value,d<2.6?1:0,6,dt); });
  S.near=nd<2.6?near:null;
  const dp=$('#dockp'); dp.hidden=!S.near||FINE; if(S.near){ dp.textContent='Dock at '+S.near.name; dp.style.setProperty('--acc',S.near.color); }
  // telemetry + warnings
  const g=1/Math.sqrt(Math.max(1e-4,1-BH.RS/r)); S.tau+=dt/g;
  // proper time still accrues for the horizon page; the readouts are gone
  const rs=r/BH.RS, danger=r<6.2; $('#warn').classList.toggle('on',danger); if(danger){ $('#warnR').textContent='r = '+rs.toFixed(2)+' rs'; post.uniforms.uTint.value.r=Math.max(post.uniforms.uTint.value.r,(6.2-r)*.012); }
  A.wind(P.v.length()/34+Math.max(0,(7-r))*.05); A.update(S.t,{sub:sstep(12,2,r),pad:1,bright:.4});
  orbitSound(P,r,dt);
}

/* ---------- the sound of the system: where things are, how fast you go, how close the hole is ---------- */
const BEACON_NOTES=[12,10,13,11,14];   // Kríos F, Aetos D, Pharos A, Ogive E, Beacon B: all in the score's mode
const _cr=new T.Vector3(), _to=new T.Vector3();
function orbitSound(P,r,dt){
  if(!A.ctx) return; A.beacons(BEACON_NOTES);
  _cr.setFromMatrixColumn(hubCam.matrixWorld,0);
  const sp=P.v.length();
  STA.forEach((s,i)=>{ _to.copy(s.pos).sub(P.p); const d=_to.length(); _to.y=0;
    const k=1-sstep(1.6,11,d), pan=clamp(_to.dot(_cr)/Math.max(d,.5)*1.3,-1,1);
    A.beacon(i,.055*k*k,pan);
    // a fly-by: the closest approach to a station, taken at speed
    const pd=s._pd??d; if(d>pd&&pd<3.2&&sp>4&&S.t>(s._pbT||0)){ s._pbT=S.t+2; A.passby(pan,.06+.05*sstep(4,12,sp)); }
    s._pd=d; });
  // the asteroid belt: faint grains on the hull while you cross it
  const near=1-Math.min(1,Math.abs(r-14.9)/1.6); if(near>0&&Math.random()<dt*near*(2+sp*1.6)) A.pebble((Math.random()-.5)*1.6);
  // the hole: a low growl that builds inside a few radii
  A.roar(sstep(7.5,2.6,r)*.2);
}

/* ---------- labels, edge markers, radar ---------- */
STA.forEach(s=>{
  const el=document.createElement('button'); el.type='button'; el.className='slab'; el.style.setProperty('--acc',s.color); el.dataset.cur='Fly';
  el.innerHTML=`<span class="rt"></span><span class="tx"><b>${s.name}</b><span class="sub">${s.game}</span><span class="act">${FINE?'<kbd>E</kbd> Dock':'Tap to dock'}</span></span>`;
  el.addEventListener('click',()=>autopilot(s)); $('#labels').appendChild(el); s.el=el;
  const ed=document.createElement('button'); ed.type='button'; ed.className='edge'; ed.style.setProperty('--acc',s.color); ed.dataset.cur='Fly';
  ed.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><span>${s.name}</span>`;
  ed.addEventListener('click',()=>autopilot(s)); $('#edges').appendChild(ed); s.edge=ed;
});
/* the horizon gets a label of its own once it is open */
{ const el=document.createElement('button'); el.type='button'; el.className='slab hole'; el.style.setProperty('--acc',HOLE.color); el.dataset.cur='Fall';
  el.innerHTML=`<span class="rt"></span><span class="tx"><b>The horizon</b><span class="sub">What is on the other side?</span><span class="act">${FINE?'Click':'Tap'} to fall in</span></span>`;
  el.style.display='none'; el.addEventListener('click',()=>autopilot(HOLE)); $('#labels').appendChild(el); HOLE.el=el; }
const _edges=[]; let _rb=null, _rbK='';
function radarBox(){ const key=innerWidth+'x'+innerHeight; if(_rbK!==key){ const r=$('#radar').getBoundingClientRect(); if(r.width<1) return null; _rb={l:r.left-30,t:r.top-30,r:r.right+10,b:r.bottom+10}; _rbK=key; } return _rb; }
function labelsUpdate(){
  const W=innerWidth,H=innerHeight, m=46, hw=W/2-m, hh=H/2-m-40; _edges.length=0;
  STA.forEach(s=>{
    const p=tv[1].copy(s.pos).project(hubCam), behind=p.z>1;
    const sx=(p.x*.5+.5)*W, sy=(-p.y*.5+.5)*H;
    const on=!behind&&sx>40&&sx<W-40&&sy>70&&sy<H-60;
    if(on){ tv[2].setFromMatrixColumn(hubCam.matrixWorld,0).multiplyScalar(1.7).add(s.pos).project(hubCam); const rad=Math.abs((tv[2].x-p.x)*.5*W);
      const sz=clamp(rad*2,32,150); s.el.style.display=''; s.el.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; s.el.style.setProperty('--s',sz.toFixed(0)+'px'); s.el.classList.toggle('low',sy-sz/2<74);
      s.el.classList.toggle('near',S.near===s); s.el.classList.toggle('flip',sx>W-200); s.el.classList.toggle('done',S.docked.has(s.id)); s.edge.style.display='none';
      const rb=radarBox(); s.el.classList.toggle('under',!!rb&&sx>rb.l&&sx<rb.r&&sy>rb.t&&sy<rb.b); }
    else { s.el.style.display='none';
      let dx=sx-W/2, dy=sy-H/2; if(behind){dx=-dx;dy=-dy;} const a=Math.atan2(dy,dx);
      const k=Math.min(hw/Math.max(1e-6,Math.abs(Math.cos(a))),hh/Math.max(1e-6,Math.abs(Math.sin(a))));
      if(s.edge.style.display==='none'||!s.ew){ s.edge.style.display=''; s.ew=s.edge.offsetWidth||90; }
      _edges.push({s,a,x:W/2+Math.cos(a)*k,y:H/2+Math.sin(a)*k}); }
  });
  { const H_=HOLE.el; if(holeOpen()&&S.sealK<1&&(S.mode==='hub'||S.mode==='tohub')){ const p=tv[1].set(0,0,0).project(hubCam), sx=(p.x*.5+.5)*W, sy=(-p.y*.5+.5)*H;
      if(p.z<1&&sx>40&&sx<W-40&&sy>70&&sy<H-60){ tv[2].setFromMatrixColumn(hubCam.matrixWorld,0).multiplyScalar(SEAL).project(hubCam); const sz=clamp(Math.abs((tv[2].x-p.x)*.5*W)*2,40,170);
        H_.style.display=''; H_.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; H_.style.setProperty('--s',sz.toFixed(0)+'px'); H_.classList.add('near'); H_.classList.toggle('flip',sx>W-200); H_.classList.toggle('low',sy-sz/2<74);
        } else H_.style.display='none'; } else if(H_.style.display!=='none') H_.style.display='none'; }
  // markers that point the same way share an edge of the screen: slide them apart along it so names never overlap
  const n=_edges.length;
  for(let it=0;it<6;it++) for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const a=_edges[i], b=_edges[j];
    const side=Math.abs(a.x-W/2)>=hw-1&&Math.abs(b.x-W/2)>=hw-1, ow=(a.s.ew+b.s.ew)/2+14, oh=24, dx=b.x-a.x, dy=b.y-a.y;
    if(Math.abs(dx)>=ow||Math.abs(dy)>=oh) continue;
    if(side){ const push=(oh-Math.abs(dy))/2*(dy>=0?1:-1); a.y-=push; b.y+=push; }
    else { const push=(ow-Math.abs(dx))/2*(dx>=0?1:-1); a.x-=push; b.x+=push; }
  }
  for(const e of _edges){ const x=clamp(e.x,m*.5+e.s.ew/2,W-m*.5-e.s.ew/2), y=clamp(e.y,m+20,H-m-20);
    e.s.edge.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; $('svg',e.s.edge).style.transform=`rotate(${e.a}rad)`; }
}
const rc=$('#radar'), rx=rc.getContext('2d');
function radarDraw(){
  const w=rc.width, cx=w/2, R=w/2-16, k=R/RB;
  rx.clearRect(0,0,w,w); rx.save(); rx.translate(cx,cx);
  // sweep
  const sa=S.t*1.4; const gr=rx.createConicGradient?rx.createConicGradient(sa,0,0):null;
  if(gr){ gr.addColorStop(0,'rgba(255,195,146,.16)'); gr.addColorStop(.08,'rgba(255,195,146,0)'); gr.addColorStop(1,'rgba(255,195,146,0)'); rx.fillStyle=gr; rx.beginPath(); rx.arc(0,0,R+8,0,TAU); rx.fill(); }
  rx.rotate(S.yaw);
  rx.lineWidth=1.5;
  STA.forEach(s=>{ rx.strokeStyle=s.color+'38'; rx.beginPath(); rx.arc(0,0,s.R*k,0,TAU); rx.stroke(); });
  rx.setLineDash([2,6]); rx.strokeStyle='rgba(238,233,223,.2)'; rx.beginPath(); rx.arc(0,0,14*k,0,TAU); rx.stroke(); rx.setLineDash([]);
  rx.strokeStyle='rgba(255,195,146,.5)'; rx.beginPath(); rx.arc(0,0,RB*k,0,TAU); rx.stroke(); rx.fillStyle='rgba(255,195,146,.18)'; rx.beginPath(); rx.arc(0,0,6.6*k,0,TAU); rx.arc(0,0,1.65*k,0,TAU,true); rx.fill();
  rx.fillStyle='#000'; rx.strokeStyle='#FFC392'; rx.beginPath(); rx.arc(0,0,1.43*k,0,TAU); rx.fill(); rx.stroke();
  if(S.sealK<1){ rx.strokeStyle='rgba(255,195,146,'+(.5+.5*Math.sin(S.t*4)).toFixed(2)+')'; rx.lineWidth=2; rx.beginPath(); rx.arc(0,0,1.43*k+8+3*Math.sin(S.t*4),0,TAU); rx.stroke(); rx.lineWidth=1.5; }
  else { rx.strokeStyle='rgba(255,86,54,.55)'; rx.setLineDash([3,4]); rx.beginPath(); rx.arc(0,0,SEAL*k,0,TAU); rx.stroke(); rx.setLineDash([]); }
  peerList.forEach(p=>{ const pr=p.presence||{}; if(p.sameTab||typeof pr.x!=='number') return; rx.fillStyle='rgba(255,195,146,.8)'; rx.fillRect(pr.x*k-2,pr.z*k-2,4,4); });
  STA.forEach(s=>{ const x=s.pos.x*k, y=s.pos.z*k; rx.fillStyle=s.color; rx.beginPath(); rx.arc(x,y,S.ap===s?9:7,0,TAU); rx.fill();
    if(S.docked.has(s.id)){ rx.strokeStyle=s.color; rx.beginPath(); rx.arc(x,y,12,0,TAU); rx.stroke(); }
    if(S.ap===s){ rx.strokeStyle='#fff'; rx.setLineDash([4,4]); rx.beginPath(); rx.moveTo(S.probe.p.x*k,S.probe.p.z*k); rx.lineTo(x,y); rx.stroke(); rx.setLineDash([]); } });
  const P=S.probe; rx.save(); rx.translate(P.p.x*k,P.p.z*k); rx.rotate(-P.head+Math.PI); rx.fillStyle='#fff'; rx.beginPath(); rx.moveTo(0,10); rx.lineTo(6,-6); rx.lineTo(0,-2); rx.lineTo(-6,-6); rx.closePath(); rx.fill(); rx.restore();
  rx.restore();
  rx.fillStyle='rgba(238,233,223,.5)'; rx.font='900 16px "Doto", monospace'; rx.textAlign='center'; rx.fillText('▲',cx,16);
}
rc.addEventListener('click',e=>{
  const b=rc.getBoundingClientRect(), sc=rc.width/b.width; let x=(e.clientX-b.left)*sc-rc.width/2, y=(e.clientY-b.top)*sc-rc.width/2;
  const c=Math.cos(-S.yaw), s=Math.sin(-S.yaw); const wx=x*c-y*s, wy=x*s+y*c; const k=(rc.width/2-16)/RB;
  let best=null, bd=40; STA.forEach(st=>{ const d=Math.hypot(st.pos.x*k-wx,st.pos.z*k-wy); if(d<bd){bd=d;best=st;} });
  if(holeOpen()&&Math.hypot(wx,wy)<Math.min(bd,34)) best=HOLE; if(best) autopilot(best);
});
function updateQuest(){}

/* ---------- docking: fly in, iris open into the station world ---------- */
let TR=null;
function dock(s){
  if(S.mode!=='hub') return;
  const st=ST[s.id]; if(!st) return;
  S.mode='docking'; S.ap=null; U.apLine.visible=false; S.near=null; callOff(); A.hush(); A.update(S.t,{sub:0,pad:0}); A.swell(); cine(true);
  TR={t:0,s,st,dir:tv[0].copy(hubCam.position).sub(s.pos).setY(0).normalize().clone()};
  fromP.p.copy(hubCam.position); fromP.q.copy(hubCam.quaternion); fromP.fov=hubCam.fov;
  S.stId=s.id; S.st=st; st.enter(); S.stSnap=true; S.arrive=1;
  post.uniforms.uIrisCol.value.set(s.color);
  show('#hub',false); $('#dockp').hidden=true; $('#warn').classList.remove('on');
  S.docked.add(s.id); updateQuest(); where(s.name);
}
function dockUpdate(rdt){
  const tr=TR; tr.t+=rdt; const t=tr.t, s=tr.s;
  const k=E.io(clamp(t/1.15,0,1));
  closeP.p.copy(s.pos).addScaledVector(tr.dir,3.2); closeP.p.y=s.pos.y+1.05; lookQ(closeP.p,s.pos,closeP.q);
  hubCam.position.lerpVectors(fromP.p,closeP.p,k); hubCam.quaternion.slerpQuaternions(fromP.q,closeP.q,k);
  hubCam.fov=lerp(fromP.fov,28,k); hubCam.updateProjectionMatrix();
  post.uniforms.uWarp.value=RM?0:sstep(.45,1.05,t)*(1-sstep(1.2,1.6,t));
  const p=tv[1].copy(s.pos).project(hubCam); post.uniforms.uIC.value.set(p.x*.5+.5,p.y*.5+.5);
  const ki=clamp((t-.8)/.9,0,1); S.iris=ki<=0?0:ki>=1?3:E.i(ki)*2.1;
  S.arrive=1-E.o5(clamp((t-.85)/1.6,0,1));
  if(t>1.3&&!tr.ui){ tr.ui=true; show('#station',true); tr.st.showUI(); }
  if(t>1.8&&!tr.cin){ tr.cin=true; cine(false); }
  if(t>=2.5){ S.mode='station'; TR=null; S.iris=3; post.uniforms.uWarp.value=0; hubCam.fov=36; hubCam.updateProjectionMatrix(); }
}
$('#back').addEventListener('click',()=>undock());
function undock(){
  if(S.mode!=='station'||S.fin) return;
  if(S.stId==='cr') return leaveEarth(); // Earth is past the horizon, not a station in orbit
  const s=STA.find(x=>x.id===S.stId), st=S.st;
  st.abort(); st.hideUI(); cine(true); A.hush(); A.whoosh(false,1.3); S.mode='undocking';
  const out=tv[0].copy(s.pos).setY(0).normalize();
  TR={t:0,s,st,dir:out.clone()};
  S.probe.p.copy(s.pos).addScaledVector(out,3.2); S.probe.p.y=0; S.probe.v.copy(s.vel); S.probe.head=Math.atan2(-s.vel.x,-s.vel.z);
  S.yaw=Math.atan2(out.x,out.z); for(let i=0;i<TRL;i++){ U.trailPos[i*3]=S.probe.p.x;U.trailPos[i*3+1]=0;U.trailPos[i*3+2]=S.probe.p.z; } U.trailG.attributes.position.needsUpdate=true;
  closeP.p.copy(s.pos).addScaledVector(out,3.2); closeP.p.y=s.pos.y+1.05; lookQ(closeP.p,s.pos,closeP.q);
  hubCam.position.copy(closeP.p); hubCam.quaternion.copy(closeP.q); hubCam.fov=28; hubCam.updateProjectionMatrix();
  post.uniforms.uIrisCol.value.set(s.color);
}
function undockUpdate(rdt,dt){
  const tr=TR; tr.t+=rdt; const t=tr.t, s=tr.s;
  S.arrive=E.i(clamp(t/1.,0,1))*.8;
  const ki=clamp((t-.3)/.8,0,1); S.iris=ki>=1?0:(1-E.o(ki))*2.1;
  // probe rides with the station until the iris closes
  if(t<1.1){ S.probe.p.copy(s.pos).addScaledVector(tr.dir,3.2); S.probe.p.y=0; S.probe.v.copy(s.vel); closeP.p.copy(s.pos).addScaledVector(tr.dir,3.2); closeP.p.y=s.pos.y+1.05; lookQ(closeP.p,s.pos,closeP.q); hubCam.position.copy(closeP.p); hubCam.quaternion.copy(closeP.q);
    const p=tv[1].copy(s.pos).project(hubCam); post.uniforms.uIC.value.set(p.x*.5+.5,p.y*.5+.5); fromP.p.copy(closeP.p); fromP.q.copy(closeP.q); U.probe.position.copy(S.probe.p); }
  else { hubPhysics(dt); chasePose(chase); const k=E.io(clamp((t-1.1)/1.3,0,1)); hubCam.position.lerpVectors(fromP.p,chase.p,k); hubCam.quaternion.slerpQuaternions(fromP.q,chase.q,k); hubCam.fov=lerp(28,36,k); hubCam.updateProjectionMatrix(); }
  if(t>1.1&&!tr.off){ tr.off=true; show('#station',false); tr.st.el.classList.remove('on'); tr.st.exit(); S.st=null; S.stId=null; }
  if(t>1.5&&!tr.hud){ tr.hud=true; show('#hub',true); cine(false); where('Orbit'); }
  if(t>=2.4){ S.mode='hub'; TR=null; hubBase.p.copy(hubCam.position); hubBase.q.copy(hubCam.quaternion); S.callWait=Math.max(S.callWait,2.5);
    if(holeOpen()&&S.sealK>=1) sealBreak(); }
}

/* ---------- a station calls you: the nearest one you have not played rings its bell, from the side where it is ----------
   Nothing on screen: you hear which way it is, and you go. When you have played it, the next one starts. */
const _cp=new T.Vector3();
function callOff(){ S.callK=0; }
function callUpdate(dt){
  const P=S.probe, open=STA.filter(s=>!S.docked.has(s.id));
  S.callWait-=dt; S.callT+=dt;
  let want=S.call;
  if(want&&S.docked.has(want.id)) want=null;
  if(S.ap&&S.ap!==HOLE) want=S.docked.has(S.ap.id)?null:S.ap;           // flying somewhere already: that is the one, or none
  else if(open.length&&S.callWait<=0){ const dist=s=>s.pos.distanceTo(P.p);
    const best=open.reduce((a,b)=>dist(b)<dist(a)?b:a);
    if(!want||(dist(best)<dist(want)*.5&&dist(best)<8&&S.callT>6)) want=best; }   // keep calling the same one unless you are right by another
  if(!open.length||SB.t>=0) want=null;
  if(want!==S.call){ if(S.call&&want&&S.callK>.05){ S.callK=0; } S.call=want; S.callT=0; }
  const s=S.call, d=s?s.pos.distanceTo(P.p):99, k=s&&d>2.8?1:0;
  S.callK=damp(S.callK,k,k?1.6:5,dt);
  if(s){
    // the bell, once a ring: louder as you get close, softer if you have been ignoring it a while
    const beat=Math.floor(G.uTime.value/2.4); if(beat!==S.callBeat){ S.callBeat=beat;
      if(S.callK>.4&&A.ctx){ _cr.setFromMatrixColumn(hubCam.matrixWorld,0); _cp.copy(s.pos).sub(P.p); _cp.y=0; const pan=clamp(_cp.dot(_cr)/Math.max(d,.5)*1.3,-1,1);
        const g=(.022+.034*(1-sstep(4,26,d)))*(1-.55*sstep(20,45,S.callT))*S.callK; A.call(BEACON_NOTES[s.idx],pan,g); setTimeout(()=>{ if(S.call===s&&S.mode==='hub') A.call(BEACON_NOTES[s.idx]+5,pan,g*.45); },430); } } }
}

/* ---------- the seal breaking: the first time you come back from a station, the ring round the horizon strains, cracks and lets go.
   One wave runs out across the whole system. ---------- */
const SB={t:-1,look:0}, OPENTINT=new T.Color(0,.025,.06);
function sealBreak(){ if(SB.t>=0||S.sealK<1) return; SB.t=0; SB.crack=SB.chord=SB.said=false; A.strain(); }
function sealUpdate(dt){
  if(SB.t<0){ SB.look=damp(SB.look,0,3,dt); return; }
  SB.t+=dt; const t=SB.t;
  SB.look=sstep(0,.8,t)*(1-sstep(3.4,4.6,t));
  if(t<1){ U.sealU.uNear.value=Math.max(U.sealU.uNear.value,sstep(0,.95,t)); S.shake=Math.max(S.shake,.16*sstep(.2,1,t)); A.roar(.22*sstep(0,1,t)); }
  else if(!SB.crack){ SB.crack=true; S.sealK=0; U.shardU.uT.value=0; U.gridU.uShock.value=SEAL; A.roar(0); A.crack(); A.boom(); S.flash=Math.max(S.flash,.3); feedback(.6,1.6,OPENTINT); }
  if(SB.crack){ const k=t-1; U.shardU.uT.value=k; U.gridU.uShock.value=k<2.8?SEAL+k*11:-9;
    if(k>1.2&&!SB.chord){ SB.chord=true; A.chord(); }
    if(k>2.2&&!SB.said){ SB.said=true; toast('The horizon is open. Fall in when you are ready.'); }
    if(k>3.6){ U.shardU.uT.value=-1; SB.t=-1; } }
}

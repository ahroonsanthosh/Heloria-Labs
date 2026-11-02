/* ================= STORY: four chapters, one gesture each ================= */
const CH=[ // camera shots of the hole: position, look-at, field of view, drift
  {p:[4.95,1.0,14.3],l:[-2.5,-.55,0],f:30,dr:.5,sys:0,narP:[0,2.2,22],narL:[0,-2.2,0]},
  {p:[3.4,2.6,6.9],l:[-2.4,-.9,0],f:38,dr:.35,sys:0,narP:[0,3.4,12.5],narL:[0,-2,0]},
  {p:[12,64,62],l:[-12,-6,6],f:34,dr:.15,sys:1,narP:[0,96,52],narL:[0,-3,-2]},
  {p:[1.05,.24,1.95],l:[-.25,.08,0],f:64,dr:.12,sys:0,narP:[.4,.5,3.1],narL:[-.1,-.4,0]}
];
const story={busy:0,acc:0,from:mkPose(),to:mkPose(),k:1,blocks:$$('#story .ch'),rail:$$('#rail button'),creep:0};
function chPose(i,out,t){ const c=CH[i], nar=NARROW(); const P=nar?c.narP:c.p, L=nar?c.narL:c.l;
  const a=Math.sin(t*.07)*c.dr*.12; out.p.set(P[0]*Math.cos(a)-P[2]*Math.sin(a),P[1]+Math.sin(t*.11)*c.dr*.25,P[0]*Math.sin(a)+P[2]*Math.cos(a));
  if(i===3) out.p.multiplyScalar(1-story.creep*.18);
  tv[0].set(L[0],L[1],L[2]); lookQ(out.p,tv[0],out.q); out.fov=c.f; return out; }
function goChapter(i){
  if(S.mode!=='story') return; if(i>3){ escape(); return; } i=clamp(i,0,3); if(i===S.ch||story.busy>0) return;
  const prev=S.ch; S.ch=i; story.busy=1.15; story.k=0; story.from.p.copy(hubCam.position); story.from.q.copy(hubCam.quaternion); story.from.fov=hubCam.fov;
  unreveal(story.blocks[prev]); setTimeout(()=>{ if(S.ch===i&&S.mode==='story') reveal(story.blocks[i]); },430);
  story.rail.forEach((b,k)=>b.classList.toggle('on',k===i)); $('#cue').style.opacity=i===0?1:0; $('#prox').classList.toggle('on',i===3);
  $('#cue').innerHTML='<i></i>Scroll'; $('#cue').style.opacity=i===3?0:1;
  A.stinger(i); A.whoosh(i>prev,1.2,.12); if(i===3){ A.alarm(); story.creep=0; }
  where(['Approach','Builders','System','Too close'][i]);
}
function escape(){
  if(S.mode!=='story') return; unreveal(story.blocks[S.ch]); $('#prox').classList.remove('on'); $('#cue').style.opacity=0;
  A.boom(); A.launch(); S.flash=.9; feedback(1.2,1.6); setTimeout(()=>{ show('#story',false); },300); toHub();
}
addEventListener('wheel',e=>{ if(S.mode!=='story') return; e.preventDefault(); if(story.busy>0) return; story.acc+=e.deltaY; if(Math.abs(story.acc)>60){ goChapter(S.ch+(story.acc>0?1:-1)); story.acc=0; } },{passive:false});
let tY0=null;
addEventListener('touchstart',e=>{ tY0=e.touches[0].clientY; },{passive:true});
addEventListener('touchend',e=>{ if(S.mode!=='story'||tY0===null) return; const dy=tY0-(e.changedTouches[0]?.clientY??tY0); if(Math.abs(dy)>40&&story.busy<=0) goChapter(S.ch+(dy>0?1:-1)); tY0=null; },{passive:true});
addEventListener('keydown',e=>{ if(S.mode!=='story') return; if(['ArrowDown','PageDown','Space','Enter'].includes(e.code)){ e.preventDefault(); goChapter(S.ch+1); } if(['ArrowUp','PageUp'].includes(e.code)){ e.preventDefault(); goChapter(S.ch-1); } });
story.rail.forEach((b,k)=>b.addEventListener('click',()=>goChapter(k)));
$('#skip').addEventListener('click',()=>{ if(S.mode==='story') escape(); });
const _sp=mkPose();
function storyUpdate(rdt,t){
  story.busy-=rdt; story.k=Math.min(1,story.k+rdt/1.6);
  if(S.ch===3) story.creep=Math.min(1,story.creep+rdt/14);
  chPose(S.ch,_sp,t); const k=E.io(story.k);
  hubCam.position.lerpVectors(story.from.p,_sp.p,k); hubCam.quaternion.slerpQuaternions(story.from.q,_sp.q,k); hubCam.fov=lerp(story.from.fov,_sp.fov,k); hubCam.updateProjectionMatrix();
  const sys=CH[S.ch].sys; S.sysVis=damp(S.sysVis||0,sys,2.5,rdt); universeVisible(S.sysVis); STA.forEach(s=>{ s.el.style.display='none'; s.edge.style.display='none'; });
  if(S.ch===3){ const r=hubCam.position.length()/BH.RS; $('#proxR').textContent=r.toFixed(2); A.update(t,{sub:.6+story.creep*.4,pad:.6,bright:.1}); A.whine(.15+story.creep*.35); post.uniforms.uTint.value.r=Math.max(post.uniforms.uTint.value.r,.02+story.creep*.05); S.shake=Math.max(S.shake,.05+story.creep*.12); }
  else { A.update(t,{sub:[.15,.3,.1][S.ch],pad:1,bright:[.5,.35,.6][S.ch]}); A.whine(0); }
}

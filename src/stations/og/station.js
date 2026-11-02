/* ================= OGIVE: APOGEE =================
   Design on an OpenRocket-style side view: drag the nose and fins, trim with ballast, watch CG and CP.
   Then fly it. Hit the target altitude in three flights and open the chute at the top. */
(()=>{
const st=mkStation('og',{arrive:new T.Vector3(-1.5,1.5,7)});
const sc=st.scene, el=st.el, S6=6, SC=.035, WIND=3.5, Dm=.066, R0=Dm/2, LB=.62, TAIL=-3.1;
const MOT={F:{I:40,tb:1.4,mp:.055,mm:.095},G:{I:58,tb:1.7,mp:.09,mm:.15},H:{I:80,tb:2.0,mp:.13,mm:.21}};
let d={motor:'G',LD:2.5,fin:1,bal:0}, target=280, tries=0, F=null, assisted=false, busy=false, phase='design', tw=0, landT=0, last=null;
let rocket,body,fins=[],chute,ex,trailG,tP,tI=0,ringU,ladder,launchCtl;
function geom(dd){ const Ln=dd.LD*Dm, fs=dd.fin; return {Ln,fs,Cr:.09*fs,Ct:.045*fs,s:.075*fs,Xr:.045*fs,L:Ln+LB}; }
function design(dd){ const M=MOT[dd.motor], g=geom(dd);
  const ms=[[.03+.16*g.Ln,.62*g.Ln],[.24,g.Ln+LB/2],[.03*g.fs*g.fs,g.Ln+LB-g.Cr*.55],[.05,g.Ln+.12],[M.mm,g.Ln+LB-.06],[dd.bal,.45*g.Ln]];
  const m=ms.reduce((a,x)=>a+x[0],0), cg=ms.reduce((a,x)=>a+x[0]*x[1],0)/m;
  const Lf=Math.sqrt(g.s*g.s+Math.pow(g.Xr+g.Ct/2-g.Cr/2,2));
  const CNf=(1+R0/(g.s+R0))*(16*Math.pow(g.s/Dm,2))/(1+Math.sqrt(1+Math.pow(2*Lf/(g.Cr+g.Ct),2)));
  const Xb=g.Ln+LB-g.Cr, Xf=Xb+(g.Xr/3)*(g.Cr+2*g.Ct)/(g.Cr+g.Ct)+(1/6)*((g.Cr+g.Ct)-g.Cr*g.Ct/(g.Cr+g.Ct));
  const cp=(2*.466*g.Ln+CNf*Xf)/(2+CNf);
  return {M,g,dry:m-M.mm,mass:m,cg,cp,stab:(cp-cg)/Dm,Cd:.32+.13*(4-dd.LD)/2.5+.16*(g.fs-.6)}; }
function thrustAt(m,t){ const M=MOT[m], avg=M.I/M.tb; if(t<0||t>M.tb) return 0; const x=t/M.tb; if(x<.08) return avg*1.7*x/.08; if(x<.25) return lerp(avg*1.7,avg*.95,(x-.08)/.17); if(x<.88) return avg*.95; return lerp(avg*.95,0,(x-.88)/.12); }
function newF(dd,sign){ const D=design(dd); return {t:0,x:0,h:0,vx:0,vy:0,th:0,om:0,m:D.mass,D,d:{...dd},apo:0,tApo:0,maxV:0,maxA:0,tumble:false,chute:false,torn:false,landed:false,lifted:false,sign:sign||1,deployT:-1,auto:false}; }
function stepF(f,h){
  const D=f.D, Th=thrustAt(f.d.motor,f.t); f.m=D.mass-D.M.mp*clamp(f.t/D.M.tb,0,1);
  const rvx=f.vx-WIND, rvy=f.vy, rv=Math.hypot(rvx,rvy)||1e-6, v=Math.hypot(f.vx,f.vy);
  if(!f.chute&&f.lifted&&f.h>1.5){ if(D.stab<1){ f.om+=(1-D.stab)*4*h*f.sign; f.th+=f.om*h; if(Math.abs(f.th)>1.3) f.tumble=true; }
    else { const aoa=Math.atan2(rvx,Math.max(rvy,.5)); const k=Math.min(8,D.stab*1.3)*clamp(rv/30,0,1); f.th+=(aoa-f.th)*Math.min(1,k*h); f.th=clamp(f.th,-1.2,1.2); } }
  let Cd=D.Cd, Ar=Math.PI*R0*R0; if(f.tumble) Cd=1.1; if(f.chute){ Cd=1.5; Ar=f.torn?.05:.5; }
  const rho=1.225*Math.exp(-f.h/8500), Fd=.5*rho*Cd*Ar*rv*rv, dir=f.tumble?f.t*9:f.th;
  let ax=(-Fd*rvx/rv+Th*Math.sin(dir))/f.m, ay=(-Fd*rvy/rv+Th*Math.cos(dir))/f.m-9.81;
  if(!f.lifted){ if(ay<=0){ f.t+=h; return; } ax=0; } if(f.h<1.5&&!f.chute) ax=0;
  f.vx+=ax*h; f.vy+=ay*h; f.x+=f.vx*h; f.h+=f.vy*h; f.t+=h; f.acc=Math.hypot(ax,ay+9.81);
  if(f.h>.3) f.lifted=true; f.maxV=Math.max(f.maxV,v); f.maxA=Math.max(f.maxA,f.acc);
  if(f.lifted&&f.apo===0&&f.vy<=0){ f.apo=f.h; f.tApo=f.t; }
  if(f.lifted&&f.h<=0){ f.h=0; f.landed=true; } }
function simApo(dd){ const f=newF(dd,1); for(let i=0;i<8000;i++){ stepF(f,.01); if(f.apo>0||f.landed) break; } return f.apo; }

/* ---------- the rocket, rebuilt from the design ---------- */
const matB=LM('#FFB475',{emit:.05,rim:1.1,amb:.12,key:'#FFE6CC'}), matF=LM('#FFB475',{emit:.03,rim:.9,amb:.1,key:'#FFE6CC'});
const wire=new T.LineBasicMaterial({color:0xFFB475,transparent:true,opacity:.35,blending:T.AdditiveBlending});
function rebuild(){
  const g=geom(d); if(body){ rocket.remove(body); body.geometry.dispose(); } fins.forEach(f=>{ rocket.remove(f); f.geometry.dispose(); }); fins=[];
  const prof=[], L=g.Ln, rho=(R0*R0+L*L)/(2*R0);
  prof.push(new T.Vector2(0,0)); prof.push(new T.Vector2(R0*S6*.92,0)); prof.push(new T.Vector2(R0*S6,.02*S6));
  prof.push(new T.Vector2(R0*S6,LB*S6));
  for(let k=1;k<=28;k++){ const x=L*(1-k/28); const r=Math.sqrt(Math.max(rho*rho-Math.pow(L-x,2),0))+R0-rho; prof.push(new T.Vector2(Math.max(r,0)*S6,(LB+(L-x))*S6)); }
  body=new T.Mesh(new T.LatheGeometry(prof,48),matB); rocket.add(body);
  const shp=new T.Shape(); shp.moveTo(0,g.Cr*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr)*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr-g.Ct)*S6); shp.lineTo(0,0); shp.closePath();
  const fg=new T.ExtrudeGeometry(shp,{depth:.025,bevelEnabled:false}); fg.translate(R0*S6*.96,0,-.0125);
  for(let k=0;k<4;k++){ const m=new T.Mesh(fg,matF); m.rotation.y=k*Math.PI/2+Math.PI; rocket.add(m); fins.push(m); }
  const edges=new T.LineSegments(new T.EdgesGeometry(body.geometry,30),wire); body.add(edges);
  chute.position.y=(g.L+.25)*S6;
}
st.build=function(){
  // blueprint plane behind the design view, a dotted ground for the flight
  sc.add(pts(cloud(Math.floor(9000*Q+3000),(i,r,o)=>{ const gx=Math.round((r[0]-.5)*40/.5)*.5, gy=Math.round((r[1]-.5)*20/.5)*.5; o[0]=gx; o[1]=gy; o[2]=-2.5; }),PM({size:.03,color:'#FFB475',body:'b=.12*smoothstep(14.,4.,length(p.xy));'})));
  sc.add(pts(cloud(Math.floor(26000*Q+6000),(i,r,o)=>{const gx=(r[0]-.5)*160,gz=(r[1]-.5)*160;o[0]=Math.round(gx/2)*2+(r[2]<.5?(r[3]-.5)*2:0);o[2]=Math.round(gz/2)*2+(r[2]>=.5?(r[3]-.5)*2:0);o[1]=-.02;}),
    PM({size:.05,color:'#FFB475',uniforms:{uOn:{value:0}},decl:'uniform float uOn;',body:'b=.14*smoothstep(80.,8.,length(p.xz))*uOn;'})));
  st.groundU=sc.children[sc.children.length-1].material.uniforms;
  sc.add(pts(cloud(2400,(i,r,o)=>{o[0]=.32+gauss()*.008;o[1]=r[0]*2.8;o[2]=gauss()*.008;}),PM({size:.03,color:'#FFFFFF',uniforms:{uOn:st.groundU.uOn},decl:'uniform float uOn;',body:'b=.3*uOn;'})));
  // altitude ladder with labels every 50 m
  ladder=new T.Group(); sc.add(ladder);
  ladder.add(pts(cloud(Math.floor(8000*Q+2000),(i,r,o)=>{const m=r[0]*520; const tick=Math.abs(m/50-Math.round(m/50))<.02; o[0]=-4.2+(tick?(r[1]-.5)*.8:gauss()*.01); o[1]=m*SC; o[2]=-1.5;}),PM({size:.035,color:'#FFE0C8',body:'b=.22;'})));
  for(let m=50;m<=500;m+=50){ const c=document.createElement('canvas'); c.width=160; c.height=48; const x=c.getContext('2d'); x.font='34px "Departure Mono", monospace'; x.fillStyle='#FFE0C8'; x.fillText(m+' m',4,36);
    const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,opacity:.55,depthWrite:false})); sp.position.set(-5.4,m*SC,-1.5); sp.scale.set(1.1,.33,1); ladder.add(sp); }
  ladder.visible=false;
  rocket=new T.Group(); sc.add(rocket);
  chute=pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{const a=r[0]*TAU,e=r[1]*Math.PI*.45,R=2.2;o[0]=Math.cos(a)*Math.sin(e)*R;o[1]=Math.cos(e)*R*.75;o[2]=Math.sin(a)*Math.sin(e)*R;if(r[2]<.2){const k=r[3];o[0]*=k;o[1]=lerp(-1.6,o[1],k);o[2]*=k;}}),PM({size:.035,color:'#FFE0CF',body:'b=.6;'}));
  chute.visible=false; rocket.add(chute);
  rebuild();
  ex=Burst(sc,Math.floor(5000*Q+800),'#FFCF9E',.12);
  tP=new Float32Array(900*3); trailG=new T.BufferGeometry(); trailG.setAttribute('position',new T.BufferAttribute(tP,3)); trailG.setDrawRange(0,0);
  const tl=new T.Line(trailG,new T.LineBasicMaterial({color:0xFFB475,transparent:true,opacity:.5,blending:T.AdditiveBlending})); tl.frustumCulled=false; sc.add(tl);
  ringU={uY:{value:target*SC},uHit:{value:0},uOn:{value:0}};
  sc.add(pts(cloud(2400,(i,r,o)=>{const a=r[0]*TAU,R=2.6+gauss()*.03;o[0]=Math.cos(a)*R;o[1]=0;o[2]=Math.sin(a)*R;}),PM({size:.05,color:'#FFB475',uniforms:ringU,decl:'uniform float uY,uHit,uOn;',
    body:'p.y=uY; p.xz*=1.+uHit*.4; float a=atan(p.z,p.x); b=(.55+.45*step(.5,fract(a*6.+uTime*.6))+uHit*2.)*uOn;'})));
  st.anchors=[new T.Vector3(0,0,0),new T.Vector3(0,0,0),new T.Vector3(0,0,0)];
};
const hN=$('#ogHN'), hF=$('#ogHF'), cgEl=$('#ogCG'), cpEl=$('#ogCP'), dim=$('#ogDim'), stabL=$('#ogStabL');
function axisWorld(fromTip){ const g=geom(d); return rocket.localToWorld(new T.Vector3(0,(g.L-fromTip)*S6,0)); }
function syncUI(){
  const D=design(d); $('#ogStab').textContent=D.stab.toFixed(2)+' cal';
  const w=D.stab<1?['Unstable','var(--alarm)']:D.stab>2.6?['Overstable','var(--acc)']:['Stable','var(--ink)']; $('#ogStabW').textContent=w[0]; $('#ogStab').style.color=w[1];
  $('#ogMass').textContent=`Mass ${D.mass.toFixed(2)} kg · Cd ${D.Cd.toFixed(2)}`; $('#ogBal').textContent=Math.round(d.bal*1000)+' g';
  $$('#ogMotor button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===d.motor));
  $('#ogNoseNote').innerHTML=`<b>Tangent ogive</b>L/D ${d.LD.toFixed(2)} · fins ${Math.round(d.fin*100)}% · ${D.stab.toFixed(2)} cal`;
}
function placeMarkers(){
  if(phase!=='design') return; rocket.updateMatrixWorld(); const D=design(d), g=D.g;
  const pcg=proj(axisWorld(D.cg),stCam), pcp=proj(axisWorld(D.cp),stCam);
  const off=Math.max(40,Math.abs(proj(rocket.localToWorld(new T.Vector3(0,0,(R0+g.s)*S6)),stCam).y-pcg.y)*0+64);
  cgEl.style.transform=`translate(${pcg.x}px,${pcg.y+off}px) translate(-50%,-50%)`; cpEl.style.transform=`translate(${pcp.x}px,${pcp.y+off}px) translate(-50%,-50%)`;
  const x0=Math.min(pcg.x,pcp.x), x1=Math.max(pcg.x,pcp.x); dim.style.transform=`translate(${x0}px,${pcg.y+off-22}px)`; dim.style.width=(x1-x0)+'px';
  stabL.style.transform=`translate(${(pcg.x+pcp.x)/2}px,${pcg.y+off+14}px) translate(-50%,0)`;
  const tip=proj(rocket.localToWorld(new T.Vector3(0,g.L*S6,0)),stCam); hN.style.transform=`translate(${tip.x}px,${tip.y}px)`;
  const ft=proj(rocket.localToWorld(new T.Vector3(-(R0*.96+g.s)*S6,(g.Cr-g.Xr)*S6,0)),stCam); hF.style.transform=`translate(${ft.x}px,${ft.y}px)`;
  st.anchors[0].copy(axisWorld(g.Ln*.3)); st.anchors[1].copy(axisWorld(D.cp)); st.anchors[2].copy(axisWorld(g.L-.05));
}
function wpp(){ const dist=stCam.position.distanceTo(st.camL); return 2*dist*Math.tan(stCam.fov*Math.PI/360)/innerHeight; }
function dragHandle(h,apply){ let drag=null;
  h.addEventListener('pointerdown',e=>{ if(phase!=='design'||busy||st.state!=='play') return; drag={x:e.clientX,y:e.clientY,d:{...d}}; h.classList.add('drag'); h.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
  h.addEventListener('pointermove',e=>{ if(!drag) return; apply(drag,(e.clientX-drag.x)*wpp(),-(e.clientY-drag.y)*wpp()); assisted=false; $('#ogAI').textContent=''; rebuild(); syncUI(); A.key(); });
  const up=()=>{ drag=null; h.classList.remove('drag'); }; h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up); }
dragHandle(hN,(g,dx)=>{ d.LD=clamp(g.d.LD+dx/S6/Dm,1.5,4); });
dragHandle(hF,(g,dx,dy)=>{ d.fin=clamp(g.d.fin+dy/(.075*S6),.6,1.5); });
$('#ogBm').addEventListener('click',()=>{ d.bal=Math.max(0,+(d.bal-.01).toFixed(3)); assisted=false; syncUI(); });
$('#ogBp').addEventListener('click',()=>{ d.bal=Math.min(.15,+(d.bal+.01).toFixed(3)); assisted=false; syncUI(); });
$$('#ogMotor button').forEach(b=>b.addEventListener('click',()=>{ d.motor=b.dataset.m; assisted=false; syncUI(); }));
$('#ogAsk').addEventListener('click',async()=>{
  if(busy||phase!=='design') return; busy=true; $('#ogAsk').disabled=true; const ai=$('#ogAI'); let best=null, n=0;
  const tryD=dd=>{ const s=design(dd).stab; if(s<1.3||s>2.6) return; n++; const apo=simApo(dd); const err=Math.abs(apo-target)+.5*Math.abs(dd.LD-d.LD)+2*Math.abs(dd.fin-d.fin); if(!best||err<best.err) best={dd:{...dd},apo,err}; };
  for(const m of ['F','G','H']){ for(let LD=1.5;LD<=4.001;LD+=.25) for(let fin=.6;fin<=1.501;fin+=.1) for(let bal=0;bal<=.1501;bal+=.01) tryD({motor:m,LD,fin,bal}); ai.textContent=`Ogive · evaluating ${fmt(n)} designs`; A.beep(660+n%5*80); await nextFrame(); }
  if(best){ const b0=best.dd; for(let LD=Math.max(1.5,b0.LD-.25);LD<=Math.min(4,b0.LD+.25)+.001;LD+=.05) for(let bal=Math.max(0,b0.bal-.02);bal<=Math.min(.15,b0.bal+.02)+.0001;bal+=.002) tryD({motor:b0.motor,LD,fin:b0.fin,bal}); }
  if(!best){ ai.textContent='No stable design reaches that altitude.'; busy=false; $('#ogAsk').disabled=false; return; }
  const from={...d}, to=best.dd, t0=performance.now(); d.motor=to.motor;
  await new Promise(res=>{ (function step(){ const k=E.io(clamp((performance.now()-t0)/900,0,1)); d.LD=lerp(from.LD,to.LD,k); d.fin=lerp(from.fin,to.fin,k); d.bal=lerp(from.bal,to.bal,k); rebuild(); syncUI(); if(k<1) requestAnimationFrame(step); else res(); })(); });
  assisted=true; A.chime(9);
  ai.textContent=`Ogive · ${fmt(n)} designs · ${to.motor} motor, L/D ${to.LD.toFixed(2)}, fins ${Math.round(to.fin*100)}%, ${Math.round(to.bal*1000)} g ballast · predicts ${Math.round(best.apo)} m · this flight counts as assisted`;
  busy=false; $('#ogAsk').disabled=false;
});
launchCtl=holdControl($('#ogHold'),1.1,()=>startLaunch(),{key:'Space',enabled:()=>S.stId==='og'&&S.mode==='station'&&st.state==='play'&&phase==='design'&&!busy,onProgress:p=>A.roar(p*.25)});
addEventListener('keydown',e=>{ if(S.stId!=='og'||S.mode!=='station'||e.code!=='Space'||e.repeat) return; if(F&&!F.chute&&F.lifted){ e.preventDefault(); deploy(); } });
st.onPointer=()=>{ if(F&&!F.chute&&F.lifted) deploy(); };
function deploy(auto){ if(!F||F.chute) return; F.chute=true; F.deployT=F.t; F.auto=!!auto; if(!auto&&F.vy>12){ F.torn=true; A.buzz(); feedback(.3,.8,new T.Color(.12,0,0)); } else A.pop(); chute.visible=true; chute.scale.setScalar(.01); }
function startLaunch(){ phase='tilt'; tw=0; el.classList.add('flying'); $('#ogAI').textContent=''; A.whoosh(true,1.2,.15); }
function launch(){ phase='flight'; F=newF(d,Math.random()<.5?-1:1); tI=0; trailG.setDrawRange(0,0); chute.visible=false; A.launch(); A.boom(); feedback(.45,.6); S.flash=Math.max(S.flash,.18); landT=0; ringU.uHit.value=0; }
function newTarget(){ target=Math.round((160+Math.random()*280)/10)*10; tries=0; last=null; ringU.uY.value=target*SC; $('#ogTarget').textContent=target+' m'; $('#ogLast').textContent=''; }
function toDesign(){ F=null; phase='untilt'; tw=0; chute.visible=false; A.roar(0); el.classList.remove('flying'); }
function finish(){
  const f=F; tries++; const err=Math.abs(f.apo-target), pct=err/target*100;
  const apoS=Math.max(0,Math.round(1000-pct*45)), dep=f.torn?0:f.auto?60:Math.max(0,Math.round(300-Math.abs(f.deployT-f.tApo)*260)); const total=apoS+dep;
  const grade=f.tumble?'It cartwheeled':f.torn?'Chute shredded':pct<2?'Bullseye':pct<5?'On target':pct<12?'Close':'Off target';
  const dt=f.deployT<0?0:f.deployT-f.tApo; last={apo:f.apo};
  $('#ogLast').textContent=`Last flight ${Math.round(f.apo)} m (${f.apo>=target?'+':'−'}${Math.round(err)})`;
  $('#ogResEb').textContent=`Flight ${tries} / 3 · target ${target} m`;
  const tip=f.tumble?"Under 1 calibre the rocket can't keep its nose into the wind. Bigger fins or nose ballast.":f.D.stab>2.6?'Overstable rockets weathercock into the wind and lose height.':f.apo<target?'Undershot. More motor, a longer nose, or less mass.':'Overshot. Add ballast, shorten the nose, or step the motor down.';
  st.result({grade,score:total,assisted,stats:[['Apogee',Math.round(f.apo)+' m'],['Off target',Math.round(err)===0?'0 m':(f.apo>=target?'+':'−')+Math.round(err)+' m'],['Chute',f.torn?'Too fast':f.auto?'Auto, late':(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s'],['Max speed',Math.round(f.maxV)+' m/s'],['Peak accel',(f.maxA/9.81).toFixed(1)+' g'],['Stability',f.D.stab.toFixed(2)+' cal']],
    text:pct<2&&!f.tumble?'Within 2% of the target. Landing a design on a number is exactly what Ogive is for.':tip});
  $('#ogAgain').disabled=tries>=3; $('#ogAgain').textContent=tries>=3?'No flights left':`Adjust and fly again · ${3-tries} left`;
  if(pct<2) A.chord(); else A.dock();
}
$('#ogAgain').addEventListener('click',()=>{ toDesign(); $('#ogTries').textContent=`Flight ${tries+1} / 3`; st.setState('play'); });
$('#ogNewT').addEventListener('click',()=>{ toDesign(); newTarget(); assisted=false; $('#ogAI').textContent=''; $('#ogTries').textContent='Flight 1 / 3'; st.setState('play'); });
st.play=function(){ F=null; phase='design'; newTarget(); assisted=false; $('#ogTries').textContent='Flight 1 / 3'; $('#ogAI').textContent=''; syncUI(); rebuild(); el.classList.remove('flying'); st.setState('play'); launchCtl.reset(); };
st.abort=function(){ F=null; phase='design'; el.classList.remove('flying'); chute.visible=false; A.roar(0); launchCtl&&launchCtl.reset(); };
st.enter=function(){ st.abort(); st.setState('menu'); syncUI(); $('#ogBest').textContent='Best '+fmt(store.get('og',0)); };
st.exit=function(){ st.abort(); };
const camT=new T.Vector3(), designPos=new T.Vector3(TAIL,.2,0), padPos=new T.Vector3(0,0,0);
st.update=function(dt,t){
  const nar=NARROW(); const rd=S.rdt||dt;
  if(st.state==='play'&&phase==='design') launchCtl.tick(rd);
  // pose: horizontal for design, vertical on the pad, tweened between
  if(phase==='design'||st.state==='menu'){ rocket.rotation.set(0,0,-Math.PI/2); rocket.position.copy(designPos); if(st.state==='menu'){ rocket.rotation.x=Math.sin(t*.3)*.15; } rocket.scale.setScalar(1); }
  if(phase==='tilt'||phase==='untilt'){ tw+=rd; const k=E.io(clamp(tw/1.3,0,1)), kk=phase==='tilt'?k:1-k;
    rocket.rotation.set(0,0,-Math.PI/2*(1-kk)); rocket.position.lerpVectors(designPos,padPos,kk); rocket.scale.setScalar(lerp(1,.42,kk));
    st.groundU.uOn.value=kk; ringU.uOn.value=kk; ladder.visible=kk>.05;
    if(tw>=1.3){ if(phase==='tilt') launch(); else { phase='design'; st.groundU.uOn.value=0; ringU.uOn.value=0; ladder.visible=false; } } }
  if(phase==='flight'&&F){
    const sub=Math.max(1,Math.round(dt/.01)); for(let k=0;k<sub;k++) stepF(F,.01);
    if(!F.chute&&F.apo>0&&F.t>F.tApo+2.5) deploy(true);
    const th=thrustAt(F.d.motor,F.t); A.roar(th/60);
    rocket.position.set(F.x*SC*3,F.h*SC,0); rocket.rotation.set(0,0,F.tumble?F.t*9:F.chute?damp(rocket.rotation.z,.2,2,dt):-F.th);
    if(chute.visible) chute.scale.setScalar(damp(chute.scale.x,F.torn?.35:1,6,dt));
    if(th>0){ const n=Math.floor(110*Q*th/60)+3; for(let k=0;k<n;k++) ex.emit({x:rocket.position.x,y:rocket.position.y,z:0},1,1.2,null,-7,.9); }
    if(tI<900&&F.t*30>tI){ tP[tI*3]=rocket.position.x; tP[tI*3+1]=rocket.position.y+.15; tP[tI*3+2]=0; tI++; trailG.setDrawRange(0,tI); trailG.attributes.position.needsUpdate=true; }
    if(Math.abs(F.h-target)<8&&F.vy>0) ringU.uHit.value=1;
    $('#ogA').textContent=Math.round(F.h); $('#ogV').textContent=(F.vy>=0?'+':'−')+Math.abs(F.vy).toFixed(1)+' m/s'; $('#ogT').textContent='T+ '+F.t.toFixed(1)+' s';
    if(F.landed){ landT+=dt; if(landT<dt*1.5){ ex.emit({x:rocket.position.x,y:.1,z:0},60,2.5,new T.Color('#FFD9C4'),1,1); A.pop(); } if(landT>1.3){ finish(); phase='landed'; } } else if(F.t>70) F.landed=true;
  }
  ringU.uHit.value=damp(ringU.uHit.value,0,1.5,dt); ex.update(dt,-2,1.2);
  // cameras
  if(phase==='flight'||phase==='landed'){ const ry=rocket.position.y, rx=rocket.position.x; st.camP.set(rx-4.4,Math.max(2.4,ry*.9+2),(nar?17:12)+Math.min(14,ry*.12)); camT.set(rx+(nar?0:1),lerp(ry+1.2,ringU.uY.value,.25),0); st.camL.copy(camT); }
  else if(phase==='tilt'||phase==='untilt'){ const k=phase==='tilt'?E.io(clamp(tw/1.3,0,1)):1-E.io(clamp(tw/1.3,0,1)); st.camP.set(lerp(0,-4,k),lerp(.8,2.6,k),lerp(nar?15:9.2,nar?17:12,k)); st.camL.set(lerp(0,.6,k),lerp(.1,2.2,k),0); }
  else { st.camP.set(nar?0:.4+Math.sin(t*.15)*.3,nar?.5:.9,nar?15:9.2); st.camL.set(nar?0:.4,nar?-.6:.05,0); }
  placeMarkers();
  if(st.state==='menu') notesUpdate(st);
};
})();

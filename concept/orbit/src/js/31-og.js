/* ================= OGIVE: APOGEE ================= */
(()=>{
const st=mkStation('og',{arrive:new T.Vector3(-3,3,9)});
const sc=st.scene, SC=.035, WIND=3.5;
const MOT={F:{I:60,tb:1.4,mp:.055,mm:.095},G:{I:85,tb:1.7,mp:.105,mm:.16},H:{I:120,tb:2.0,mp:.19,mm:.27}};
let d={motor:'G',LD:2.5,fin:1,bal:0}, target=250, tries=0, bestRun=0, F=null, assisted=false, hold=0, holdOn=false, busy=false;
let rocket,ru,chute,ex,trailG,tP,tI=0,ringU,ringPts,landT=0;
const el=st.el;

function thrustAt(m,t){ const M=MOT[m], avg=M.I/M.tb; if(t<0||t>M.tb) return 0; const x=t/M.tb;
  if(x<.08) return avg*1.7*x/.08; if(x<.25) return lerp(avg*1.7,avg*.95,(x-.08)/.17); if(x<.88) return avg*.95; return lerp(avg*.95,0,(x-.88)/.12); }
function design(dd){ const M=MOT[dd.motor]; return {M,dry:.55+.05*dd.fin+.025*dd.LD+dd.bal, stab:.25+1.9*dd.fin+.18*(dd.LD-1.5)+5*dd.bal-3.2*(M.mm-.1), Cd:.36+.05*(4-dd.LD)+.07*(dd.fin-.6)}; }
function newF(dd,sign){ const D=design(dd); return {t:0,x:0,h:0,vx:0,vy:0,th:0,om:0,m:D.dry+D.M.mm,D,d:{...dd},apo:0,tApo:0,maxV:0,maxA:0,acc:0,tumble:false,chute:false,torn:false,landed:false,lifted:false,sign:sign||1,deployT:-1,auto:false}; }
function stepF(f,h){
  const D=f.D, Th=thrustAt(f.d.motor,f.t);
  f.m=D.dry+D.M.mm-D.M.mp*clamp(f.t/D.M.tb,0,1);
  const rvx=f.vx-WIND, rvy=f.vy, rv=Math.hypot(rvx,rvy)||1e-6, v=Math.hypot(f.vx,f.vy);
  if(!f.chute&&f.lifted&&f.h>1.5){
    if(D.stab<1){ f.om+=(1-D.stab)*4*h*f.sign; f.th+=f.om*h; if(Math.abs(f.th)>1.3) f.tumble=true; }
    else { const aoa=Math.atan2(rvx,Math.max(rvy,.5)); const k=Math.min(8,D.stab*1.3)*clamp(rv/30,0,1); f.th+=(aoa-f.th)*Math.min(1,k*h); f.th=clamp(f.th,-1.2,1.2); }
  }
  let Cd=D.Cd, Ar=Math.PI*.033*.033; if(f.tumble) Cd=1.1; if(f.chute){ Cd=1.5; Ar=f.torn?.05:.55; }
  const rho=1.225*Math.exp(-f.h/8500), Fd=.5*rho*Cd*Ar*rv*rv;
  const dir=f.tumble?f.t*9:f.th;
  let ax=(-Fd*rvx/rv+Th*Math.sin(dir))/f.m, ay=(-Fd*rvy/rv+Th*Math.cos(dir))/f.m-9.81;
  if(!f.lifted){ if(ay<=0){ f.t+=h; return; } ax=0; }
  if(f.h<1.5&&!f.chute) ax=0;
  f.vx+=ax*h; f.vy+=ay*h; f.x+=f.vx*h; f.h+=f.vy*h; f.t+=h; f.acc=Math.hypot(ax,ay+9.81);
  if(f.h>.3) f.lifted=true;
  f.maxV=Math.max(f.maxV,v); f.maxA=Math.max(f.maxA,f.acc);
  if(f.lifted&&f.apo===0&&f.vy<=0){ f.apo=f.h; f.tApo=f.t; }
  if(f.lifted&&f.h<=0){ f.h=0; f.landed=true; }
}
function simApo(dd){ const f=newF(dd,1); for(let i=0;i<6000;i++){ stepF(f,.01); if(f.apo>0||f.landed) break; } return f.apo; }

st.build=function(){
  // ground grid + launch rail + altitude ladder
  sc.add(pts(cloud(Math.floor(30000*Q+6000),(i,r,o)=>{const gx=(r[0]-.5)*160,gz=(r[1]-.5)*160;o[0]=Math.round(gx/2)*2+(r[2]<.5?(r[3]-.5)*2:0);o[2]=Math.round(gz/2)*2+(r[2]>=.5?(r[3]-.5)*2:0);o[1]=0;}),
    PM({size:.05,color:'#ffb48c',body:'b=.16*smoothstep(80.,8.,length(p.xz));'})));
  sc.add(pts(cloud(2400,(i,r,o)=>{o[0]=.55+gauss()*.012;o[1]=r[0]*5.2;o[2]=gauss()*.012;}),PM({size:.03,color:'#ffffff',body:'b=.3;'})));
  sc.add(pts(cloud(Math.floor(9000*Q+2000),(i,r,o)=>{const m=r[0]*480; const tick=Math.abs(m/50-Math.round(m/50))<.02; o[0]=-3.4+(tick?(r[1]-.5)*.7:gauss()*.01); o[1]=m*SC; o[2]=-1.5;}),
    PM({size:.035,color:'#ffd9c4',body:'b=.22;'})));
  // parametric rocket: nose length and fin size are uniforms, so sliders reshape it live
  const NR=Math.floor(24000*Q+5000);
  const g=cloud(NR,(i,r,o,ex)=>{ const part=r[3]<.34?0:(r[3]<.86?1:2); ex.aP.set([part,r[1],r[0]*TAU,Math.random()],i*4); o[0]=o[1]=o[2]=0; },{aP:4});
  ru={uLD:{value:2.5},uFin:{value:1},uSpin:{value:0},uBurn:{value:0}};
  rocket=pts(g,PM({size:.03,color:'#ffb48c',uniforms:ru,decl:'uniform float uLD,uFin,uSpin,uBurn; attribute vec4 aP;',body:`
    float part=aP.x,u=aP.y,a=aP.z; float R=.3; float L=uLD*2.*R; float bl=2.2;
    if(part<.5){ float xx=sqrt(u)*L; float rho=(R*R+L*L)/(2.*R); float rad=sqrt(max(rho*rho-pow(L-xx,2.),0.))+R-rho; p=vec3(cos(a)*rad,bl*.5+L-xx,sin(a)*rad); b=1.; }
    else if(part<1.5){ p=vec3(cos(a)*R,(u-.5)*bl,sin(a)*R); b=.82+.15*step(.48,u)*step(u,.5); }
    else { float fa=floor(a/1.5708)*1.5708+.7854; float s=aP.w; float span=.55*uFin*s; float root=.62*uFin*(1.-.5*s); p=vec3(cos(fa)*(R+span),-bl*.5+u*root-s*.2*uFin,sin(fa)*(R+span)); b=1.05; }
    p=rotY(p,uSpin); p.y+=bl*.5+.32; b*=1.+uBurn*.3;`}));
  sc.add(rocket);
  chute=pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{const a=r[0]*TAU,e=r[1]*Math.PI*.45,R=1.9;o[0]=Math.cos(a)*Math.sin(e)*R;o[1]=Math.cos(e)*R*.75+5.4;o[2]=Math.sin(a)*Math.sin(e)*R;if(r[2]<.2){const k=r[3];o[0]*=k;o[1]=lerp(4.,o[1],k);o[2]*=k;}}),
    PM({size:.03,color:'#ffe0cf',body:'b=.6;'})); chute.visible=false; rocket.add(chute);
  ex=Burst(sc,Math.floor(5000*Q+800),'#ffcf9e',.12);
  tP=new Float32Array(900*3); trailG=new T.BufferGeometry(); trailG.setAttribute('position',new T.BufferAttribute(tP,3)); trailG.setDrawRange(0,0);
  const tl=new T.Line(trailG,new T.LineBasicMaterial({color:0xffb48c,transparent:true,opacity:.55,blending:T.AdditiveBlending})); tl.frustumCulled=false; sc.add(tl);
  ringU={uY:{value:target*SC},uHit:{value:0}};
  ringPts=pts(cloud(2400,(i,r,o)=>{const a=r[0]*TAU,R=2.6+gauss()*.03;o[0]=Math.cos(a)*R;o[1]=0;o[2]=Math.sin(a)*R;}),PM({size:.05,color:'#ffb48c',uniforms:ringU,decl:'uniform float uY,uHit;',
    body:`p.y=uY; p.xz*=1.+uHit*.4; float a=atan(p.z,p.x); b=.55+.45*step(.5,fract(a*6.+uTime*.6))+uHit*2.;`})); sc.add(ringPts);
};
const tLabel=document.createElement('span'); tLabel.className='mono'; tLabel.style.cssText='position:absolute;left:0;top:0;color:var(--acc);white-space:nowrap;transition:opacity .4s'; $('.ghud',el).appendChild(tLabel);

/* ---------- design console ---------- */
const sLD=$('#ogLD'), sFin=$('#ogFin'), sBal=$('#ogBal');
function fill(i){ const f=(i.value-i.min)/(i.max-i.min)*100; i.style.setProperty('--f',f+'%'); }
function syncUI(){
  sLD.value=d.LD; sFin.value=d.fin; sBal.value=Math.round(d.bal*1000); [sLD,sFin,sBal].forEach(fill);
  $('#ogLDo').textContent='L/D '+(+d.LD).toFixed(2); $('#ogFino').textContent=Math.round(d.fin*100)+'%'; $('#ogBalo').textContent=Math.round(d.bal*1000)+' g';
  $$('#ogMotor button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===d.motor));
  const D=design(d); $('#ogStab').textContent=D.stab.toFixed(2)+' cal'; $('#ogStabI').style.setProperty('--v',clamp(D.stab/4,0,1));
  $('#ogStab').style.color=D.stab<1?'var(--signal)':D.stab>2.6?'var(--ember)':'var(--ink)';
  $('#ogMass').textContent='Mass '+(D.dry+D.M.mm).toFixed(2)+' kg'; $('#ogCd').textContent='Cd '+D.Cd.toFixed(2);
  ru.uLD.value=d.LD; ru.uFin.value=d.fin;
}
sLD.addEventListener('input',()=>{ d.LD=+sLD.value; assisted=false; syncUI(); A.key(); });
sFin.addEventListener('input',()=>{ d.fin=+sFin.value; assisted=false; syncUI(); A.key(); });
sBal.addEventListener('input',()=>{ d.bal=+sBal.value/1000; assisted=false; syncUI(); A.key(); });
$$('#ogMotor button').forEach(b=>b.addEventListener('click',()=>{ d.motor=b.dataset.m; assisted=false; syncUI(); }));
$('#ogAsk').addEventListener('click',async()=>{
  if(busy||F) return; busy=true; $('#ogAsk').disabled=true; const ai=$('#ogAI'); let best=null, n=0;
  const tryD=dd=>{ const D=design(dd); if(D.stab<1.3||D.stab>2.6) return; n++; const apo=simApo(dd); const err=Math.abs(apo-target)+.6*Math.abs(dd.LD-d.LD)+2*Math.abs(dd.fin-d.fin); if(!best||err<best.err) best={dd:{...dd},apo,err}; };
  for(const m of ['F','G','H']){ for(let LD=1.5;LD<=4.001;LD+=.25) for(let fin=.6;fin<=1.401;fin+=.1) for(let bal=0;bal<=.3001;bal+=.03) tryD({motor:m,LD,fin,bal});
    ai.textContent=`Evaluating designs · ${fmt(n)}`; A.beep(660+n%5*80); await nextFrame(); }
  if(best){ const b0=best.dd; for(let LD=Math.max(1.5,b0.LD-.25);LD<=Math.min(4,b0.LD+.25)+.001;LD+=.05) for(let bal=Math.max(0,b0.bal-.04);bal<=Math.min(.3,b0.bal+.04);bal+=.002) tryD({motor:b0.motor,LD,fin:b0.fin,bal}); }
  if(!best){ ai.textContent='No stable design reaches that altitude.'; busy=false; $('#ogAsk').disabled=false; return; }
  const from={...d}, to=best.dd, t0=performance.now(); d.motor=to.motor;
  await new Promise(res=>{ (function st_(){ const k=E.io(clamp((performance.now()-t0)/900,0,1)); d.LD=lerp(from.LD,to.LD,k); d.fin=lerp(from.fin,to.fin,k); d.bal=lerp(from.bal,to.bal,k); syncUI(); if(k<1) requestAnimationFrame(st_); else res(); })(); });
  assisted=true; A.chime(9);
  ai.textContent=`Ogive · ${fmt(n)} designs · ${to.motor} motor, L/D ${to.LD.toFixed(2)}, fins ${Math.round(to.fin*100)}%, ballast ${Math.round(to.bal*1000)} g → predicted ${Math.round(best.apo)} m. This flight counts as assisted.`;
  busy=false; $('#ogAsk').disabled=false;
});

/* ---------- launch + flight ---------- */
const hb=$('#ogHold');
hb.addEventListener('pointerdown',e=>{ if(st.state==='play'&&!F&&!busy){ holdOn=true; e.preventDefault(); } });
addEventListener('pointerup',()=>{ holdOn=false; });
addEventListener('keydown',e=>{ if(S.stId!=='og'||S.mode!=='station'||e.target.closest('input')) return; if(e.code==='Space'){ e.preventDefault(); if(F&&!F.chute&&F.lifted){ if(!e.repeat) deploy(); } else if(st.state==='play'&&!F&&!busy) holdOn=true; } });
addEventListener('keyup',e=>{ if(e.code==='Space') holdOn=false; });
$('#ogDeploy').addEventListener('click',()=>{ if(F&&!F.chute&&F.lifted) deploy(); });
function deploy(auto){ if(!F||F.chute) return; F.chute=true; F.deployT=F.t; F.auto=!!auto; if(!auto&&F.vy>12){ F.torn=true; A.buzz(); feedback(.3,.8,new T.Color(.12,0,0)); } else { A.pop(); } chute.visible=true; chute.scale.setScalar(.01); }
function launch(){ F=newF(d,Math.random()<.5?-1:1); tI=0; trailG.setDrawRange(0,0); chute.visible=false; el.classList.add('flying'); A.launch(); A.boom(); feedback(.4,.6); S.flash=Math.max(S.flash,.2); landT=0; ringU.uHit.value=0; }
function newTarget(){ target=Math.round((160+Math.random()*300)/10)*10; tries=0; bestRun=0; ringU.uY.value=target*SC; $('#ogTarget').textContent=target+' m'; }
function resetPad(){ F=null; rocket.position.set(0,0,0); rocket.rotation.set(0,0,0); chute.visible=false; el.classList.remove('flying'); A.roar(0); ru.uBurn.value=0; }
function finish(){
  const f=F; tries++; const err=Math.abs(f.apo-target), pct=err/target*100;
  const apoS=Math.max(0,Math.round(1000-pct*45));
  const dep=f.torn?0:f.auto?60:Math.max(0,Math.round(300-Math.abs(f.deployT-f.tApo)*260));
  const total=apoS+dep; bestRun=Math.max(bestRun,assisted?0:total);
  const best=store.get('og',0); const isNew=!assisted&&total>best; if(isNew) store.set('og',total); $('#ogBest').textContent=fmt(Math.max(best,assisted?0:total));
  const grade=f.tumble?'It cartwheeled.':f.torn?'Chute shredded.':pct<2?'Bullseye.':pct<5?'On target.':pct<12?'Close.':'Back to the drawing board.';
  $('#ogGrade').textContent=grade; $('#ogFinal').textContent=fmt(total); $('#ogNew').textContent=assisted?'Assisted by Ogive':isNew?'New best':'Best '+fmt(best);
  $('#ogResEb').textContent=`Flight ${tries} of 3 · target ${target} m`;
  const dt=f.deployT<0?0:f.deployT-f.tApo;
  $('#ogStats').innerHTML=statsHTML([['Apogee',Math.round(f.apo)+' m'],['Off target',Math.round(err)===0?'0 m':(f.apo>=target?'+':'−')+Math.round(err)+' m'],['Deploy',f.torn?'Too fast':f.auto?'Auto, late':(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s'],['Max speed',Math.round(f.maxV)+' m/s'],['Peak accel',(f.maxA/9.81).toFixed(1)+' g'],['Stability',f.D.stab.toFixed(2)+' cal']]);
  const tip=f.tumble?'Under 1 calibre the rocket can\'t hold its nose into the wind. Bigger fins or nose ballast.':f.D.stab>2.6?'Overstable rockets turn hard into the wind and lose height.':f.apo<target?'Undershot. More motor, a longer nose or less mass.':'Overshot. Add ballast, shorten the nose or step the motor down.';
  $('#ogLine').textContent=pct<2&&!f.tumble?'Within 2% of the target. That is what Ogive is for: landing a design on a number.':tip;
  $('#ogAgain').disabled=tries>=3; $('#ogAgain').textContent=tries>=3?'No flights left':`Adjust and fly again · ${3-tries} left`;
  if(pct<2) A.chord(); else A.dock(); st.setState('res'); S.games++;
}
$('#ogAgain').addEventListener('click',()=>{ resetPad(); $('#ogTries').textContent=`Flight ${tries+1} of 3`; st.setState('play'); });
$('#ogNewT').addEventListener('click',()=>{ resetPad(); newTarget(); assisted=false; $('#ogAI').textContent=''; $('#ogTries').textContent='Flight 1 of 3'; st.setState('play'); });
st.play=function(){ resetPad(); if(st.state!=='res') newTarget(); else newTarget(); $('#ogTries').textContent='Flight 1 of 3'; $('#ogAI').textContent=''; assisted=false; syncUI(); st.setState('play'); };
st.abort=function(){ resetPad(); holdOn=false; hold=0; };
st.enter=function(){ st.abort(); st.setState('menu'); syncUI(); $('#ogBest').textContent=fmt(store.get('og',0)); };
st.exit=function(){ st.abort(); };
const camT=new T.Vector3();
st.update=function(dt,t){
  const nar=NARROW();
  ru.uSpin.value=F?0:t*.22;
  if(!F){ hold=holdOn?hold+S.rdt/1.5:Math.max(0,hold-S.rdt*2.5); hb.style.setProperty('--p',Math.min(1,hold));
    $('#ogCnt').textContent=hold>0?String(Math.max(1,3-Math.floor(hold*3))):''; A.roar(hold*.25); rocket.position.x=(Math.random()-.5)*.03*hold;
    if(hold>=1){ hold=0; hb.style.setProperty('--p',0); $('#ogCnt').textContent=''; launch(); } }
  if(F){
    const sub=Math.max(1,Math.round(dt/.01)); for(let k=0;k<sub;k++) stepF(F,.01);
    if(!F.chute&&F.apo>0&&F.t>F.tApo+2.5) deploy(true);
    const th=thrustAt(F.d.motor,F.t); A.roar(th/120); ru.uBurn.value=th>0?1:0;
    rocket.position.set(F.x*SC*3,F.h*SC,0); rocket.rotation.z=F.tumble?F.t*9:F.chute?damp(rocket.rotation.z,.2,2,dt):-F.th;
    if(chute.visible) chute.scale.setScalar(damp(chute.scale.x,F.torn?.35:1,6,dt));
    if(th>0){ const n=Math.floor(110*Q*th/120)+3; for(let k=0;k<n;k++){ ex.emit({x:rocket.position.x,y:rocket.position.y+.15,z:0},1,1.2,null,-7,.9); } }
    if(tI<900&&F.t*30>tI){ tP[tI*3]=rocket.position.x; tP[tI*3+1]=rocket.position.y+.3; tP[tI*3+2]=0; tI++; trailG.setDrawRange(0,tI); trailG.attributes.position.needsUpdate=true; }
    if(Math.abs(F.h-target)<8&&F.vy>0) ringU.uHit.value=1;
    const tube=$('#ogAlt .tube'), max=Math.max(target*1.5,120);
    $('#ogAltT').style.bottom=(target/max*100)+'%'; $('#ogAltN').style.bottom=clamp(F.h/max*100,0,100)+'%';
    $('#ogA').textContent=Math.round(F.h)+' m'; $('#ogV').textContent=(F.vy>=0?'+':'−')+Math.abs(F.vy).toFixed(1)+' m/s'; $('#ogT').textContent=F.t.toFixed(1)+' s';
    if(F.landed){ landT+=dt; if(landT<dt*1.5){ ex.emit({x:rocket.position.x,y:.1,z:0},60,2.5,new T.Color('#ffd9c4'),1,1); A.pop(); } if(landT>1.3){ finish(); F=null; el.classList.remove('flying'); } }
    else if(F.t>70){ F.landed=true; }
  }
  ringU.uHit.value=damp(ringU.uHit.value,0,1.5,dt);
  ex.update(dt,-2,1.2);
  // camera: hero shot on the pad, chase in flight
  const ry=rocket.position.y, rx=rocket.position.x;
  if(F){ st.camP.set(rx-4.8,Math.max(2.6,ry*.9+2.2),(nar?16:12)+Math.min(14,ry*.12)); camT.set(rx+(nar?0:1.2),lerp(ry+1.6,ringU.uY.value,.25),0); st.camL.copy(camT); }
  else if(st.state==='play'||st.state==='res'){ st.camP.set(nar?0:-2.4+Math.sin(t*.15)*.6,nar?3.6:3,nar?12.5:9.6); st.camL.set(nar?0:-2.3,nar?3.6:2.5,0); }
  else { st.camP.set(nar?0:-2.6+Math.sin(t*.15)*.6,nar?3.4:2.9,nar?12.5:9.8); st.camL.set(nar?0:-2.6,nar?3.6:2.5,0); }
  // target label tracks the ring
  const lp=new T.Vector3(2.7,ringU.uY.value,0).project(stCam); tLabel.textContent='Target '+target+' m'; tLabel.style.opacity=st.state==='play'?1:0;
  tLabel.style.transform=`translate(${(lp.x*.5+.5)*innerWidth+8}px,${(-lp.y*.5+.5)*innerHeight-6}px)`;
  cursorAim(false);
};
})();

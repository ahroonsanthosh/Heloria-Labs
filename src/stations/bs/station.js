/* ================= BOWSHOCK: SHOCK LINE =================
   A finned rocket in a supersonic tunnel. Shape the nose cone so its shock just grazes the fin tips.
   The cone's shock comes from the Taylor-Maccoll equation (checked: 20 deg cone at Mach 2 gives a 37.8 deg shock, as in NACA 1135). */
(()=>{
const st=mkStation('bs',{arrive:new T.Vector3(0,1.5,6)});
const sc=st.scene, GAM=1.4, DEG=Math.PI/180, RB=.42, LEN=6.2, XF=5.15, NP=Math.floor(5200*Q+1800);
/* ---- gas dynamics ---- */
const wedge=(b,M)=>Math.atan(2/Math.tan(b)*(M*M*Math.sin(b)**2-1)/(M*M*(GAM+Math.cos(2*b))+2));
function behind(b,M){ const d=wedge(b,M); const Mn1=M*Math.sin(b); const Mn2=Math.sqrt((1+.2*Mn1*Mn1)/(1.4*Mn1*Mn1-.2)); const p=1+2*GAM/(GAM+1)*(Mn1*Mn1-1); return {d,M2:Mn2/Math.sin(b-d),p,Tr:p*(2+(GAM-1)*Mn1*Mn1)/((GAM+1)*Mn1*Mn1)}; }
function coneFromBeta(b,M){ const B=behind(b,M); if(!(B.d>0)) return {tc:0}; const V=1/Math.sqrt(2/((GAM-1)*B.M2*B.M2)+1); let v=V*Math.cos(b-B.d), w=-V*Math.sin(b-B.d), th=b; const h=-.0012;
  const f=(t,v,dv)=>{ const A=(GAM-1)/2*(1-v*v-dv*dv); return (dv*dv*v-A*(2*v+dv/Math.tan(t)))/(A-dv*dv); };
  for(let i=0;i<2000;i++){ const a1=w,b1=f(th,v,w), a2=w+h/2*b1,b2=f(th+h/2,v+h/2*a1,a2), a3=w+h/2*b2,b3=f(th+h/2,v+h/2*a2,a3), a4=w+h*b3,b4=f(th+h,v+h*a3,a4);
    const n0=v+h/6*(a1+2*a2+2*a3+a4), n1=w+h/6*(b1+2*b2+2*b3+b4);
    if(n1>=0){ const fr=w/(w-n1); return {tc:th+h*fr,Vc:v+(n0-v)*fr,B}; } v=n0; w=n1; th+=h; if(th<=.002) return {tc:0}; }
  return {tc:0}; }
const maxCache=new Map();
function coneMax(M){ const k=M.toFixed(3); if(maxCache.has(k)) return maxCache.get(k); let best=0,bb=0; for(let b=Math.asin(1/M)+.002;b<Math.PI/2-.01;b+=.012){ const c=coneFromBeta(b,M).tc; if(c>best){best=c;bb=b;} } const r={tc:best,b:bb}; maxCache.set(k,r); return r; }
const solCache=new Map();
function solve(tc,M){ const k=M.toFixed(3)+'|'+(tc/DEG).toFixed(2); if(solCache.has(k)) return solCache.get(k); const mx=coneMax(M); let r=null;
  if(tc<=mx.tc){ let lo=Math.asin(1/M)+1e-4, hi=mx.b; for(let i=0;i<26;i++){ const mid=(lo+hi)/2; if(coneFromBeta(mid,M).tc<tc) lo=mid; else hi=mid; } const b=(lo+hi)/2, c=coneFromBeta(b,M);
    const Vc=c.Vc||.5, Mc=Math.sqrt(2/(GAM-1)*Vc*Vc/Math.max(1e-6,1-Vc*Vc)); const pc=c.B.p*Math.pow((1+.2*c.B.M2*c.B.M2)/(1+.2*Mc*Mc),3.5);
    r={b,Mc,pc,Tr:c.B.Tr,M2:c.B.M2,d:c.B.d,cd:(pc-1)*2/(GAM*M*M)}; }
  if(solCache.size>4000) solCache.clear(); solCache.set(k,r); return r; }

let tc=14*DEG, M=3.2, finY=2, game=null, run=null, keysHeld=0, rocket, shockCone, shockL, flowG, fP, fC, tipM, roll=0;
const read=$('#bsRead'), conv=$('#bsConv'), cx=conv.getContext('2d');
const mat=LM('#8FA3CC',{emit:.02,rim:.75,amb:.07,key:'#FFFFFF'}), edgeM=new T.LineBasicMaterial({color:0xC4D6FF,transparent:true,opacity:.3});
const KEY=new T.Vector3(-6,5,8);
function buildRocket(){
  if(rocket){ sc.remove(rocket); rocket.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
  rocket=new T.Group(); const Ln=RB/Math.tan(tc);
  const prof=[new T.Vector2(0,0),new T.Vector2(RB,Ln),new T.Vector2(RB,LEN),new T.Vector2(RB*.82,LEN+.1),new T.Vector2(0,LEN+.1)];
  const lg=new T.LatheGeometry(prof,64); const body=new T.Mesh(lg,mat); body.add(new T.LineSegments(new T.EdgesGeometry(lg,25),edgeM)); body.rotation.z=-Math.PI/2; rocket.add(body);
  const span=Math.max(.2,finY-RB), sh=new T.Shape(); sh.moveTo(4.55,0); sh.lineTo(XF,span); sh.lineTo(5.85,span); sh.lineTo(LEN,0); sh.closePath();
  const fg=new T.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false}); fg.translate(0,RB*.97,-.0175);
  for(let k=0;k<4;k++){ const f=new T.Mesh(fg,mat); f.rotation.x=k*Math.PI/2; rocket.add(f); const e=new T.LineSegments(new T.EdgesGeometry(fg),edgeM); e.rotation.x=f.rotation.x; rocket.add(e); }
  rocket.rotation.x=roll; sc.add(rocket);
}
st.build=function(){
  mat.uniforms.uKey.value.copy(KEY);
  buildRocket();
  // the shock cone itself: faint glass, brightest at its silhouette
  const cg=new T.ConeGeometry(1,1,96,1,true); cg.translate(0,-.5,0); cg.rotateZ(Math.PI/2);
  shockCone=new T.Mesh(cg,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{uC:{value:new T.Color('#E8EEFF')}},
    vertexShader:`varying vec3 vN; varying vec3 vV; varying float vX; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); vX=w.x; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying float vX; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.); gl_FragColor=vec4(uC*(.004+f*.11)*smoothstep(8.8,5.5,vX),1.); }`}));
  sc.add(shockCone);
  const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.BufferAttribute(new Float32Array(12),3)); shockL=new T.LineSegments(sg,new T.LineBasicMaterial({color:0xFFFFFF,transparent:true,opacity:.6,blending:T.AdditiveBlending})); shockL.frustumCulled=false; sc.add(shockL);
  // the target: the upper fin tip
  tipM=pts(cloud(500,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*.16;o[1]=Math.sin(a)*.16;o[2]=0;}),PM({size:.07,color:'#FFC392',body:'float k=fract(uTime*.8); p*=1.+k*1.5; b=(1.-k)*1.5;'})); sc.add(tipM);
  // flow streaks in the meridian plane, a little depth either side
  fP=new Float32Array(NP*2); fC=new Float32Array(NP).fill(1);
  for(let i=0;i<NP;i++){ fP[i*2]=-4+Math.random()*13; fP[i*2+1]=(Math.random()*2-1)*3.6; }
  flowG=new T.BufferGeometry(); flowG.setAttribute('position',new T.BufferAttribute(new Float32Array(NP*6),3)); flowG.setAttribute('color',new T.BufferAttribute(new Float32Array(NP*6),3)); flowG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  const fl=new T.LineSegments(flowG,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false})); fl.frustumCulled=false; sc.add(fl);
  sc.add(pts(cloud(3600,(i,r,o)=>{o[0]=-4+r[0]*13;o[1]=(r[1]<.5?-1:1)*3.95;o[2]=(r[2]-.5)*2.4;}),PM({size:.03,color:'#C4D6FF',body:'b=.1;'})));
  sc.add(pts(cloud(3000,(i,r,o)=>{o[0]=-4+r[0]*13;o[1]=(r[1]*2-1)*3.95;o[2]=-2.2;}),PM({size:.025,color:'#C4D6FF',body:'b=.05*step(.5,fract(p.x*2.))*step(.5,fract(p.y*2.));'})));
  st.anchors=[new T.Vector3(.5,.12,0),new T.Vector3(3.2,1.25,0),new T.Vector3(XF,1.4,0)];
};
const LUT=[...Array(96)].map((_,i)=>blackbodyJS(clamp(2300*Math.pow(1+i/24,1.5),1800,24000)));
function shockUpdate(){ const s=solve(tc,M); const a=shockL.geometry.attributes.position.array; a.fill(0);
  if(s){ const L=8.6, R=L*Math.tan(s.b); a.set([0,0,0,L,R,0,0,0,0,L,-R,0]); shockCone.visible=true; shockCone.scale.set(L,R,R); }
  else shockCone.visible=false;
  shockL.geometry.attributes.position.needsUpdate=true; return s; }
function flow(dt,s){
  const V1=2.4, Ln=RB/Math.tan(tc), pos=flowG.attributes.position.array, cl=flowG.attributes.color.array;
  const tb=s?Math.tan(s.b):0, V2=s?V1*s.M2/M*Math.sqrt(s.Tr):V1*.3;
  for(let i=0;i<NP;i++){ let x=fP[i*2], y=fP[i*2+1]; const sg=y<0?-1:1, ay=Math.abs(y); let vx=V1, vy=0, Tr=1;
    if(s&&x>0&&ay<x*tb){ const phi=Math.atan2(ay,x); const k=clamp((phi-tc)/Math.max(1e-3,s.b-tc),0,1); const dir=lerp(tc,s.d,k);
      if(x<Ln){ vx=V2*Math.cos(dir); vy=V2*Math.sin(dir)*sg; Tr=lerp(s.Tr*1.08,s.Tr,k); } else { const f=clamp((x-Ln)/1.2,0,1); vx=lerp(V2*Math.cos(dir),V1*.92,f); vy=lerp(V2*Math.sin(dir),0,f)*sg; Tr=lerp(s.Tr,1+(s.Tr-1)*.55,f); } }
    const surf=x<0?-1:x<Ln?x*Math.tan(tc):x<LEN?RB:-1; if(surf>0&&ay<surf+.03){ y=sg*(surf+.03); vy=Math.abs(vy)*sg; }
    x+=vx*dt; y+=vy*dt; if(x>9||Math.abs(y)>3.9){ x=-4-Math.random()*.6; y=(Math.random()*2-1)*3.6; Tr=1; }
    fP[i*2]=x; fP[i*2+1]=y; fC[i]=lerp(fC[i],Tr,.25);
    const bb=LUT[clamp(Math.round((fC[i]-1)*24),0,95)], br=.12+.45*clamp(fC[i]-1,0,2.5);
    const k6=i*6, len=.06, z=((i%9)/9-.5)*1.8; pos[k6]=x; pos[k6+1]=y; pos[k6+2]=z; pos[k6+3]=x-vx*len; pos[k6+4]=y-vy*len; pos[k6+5]=z;
    cl[k6]=bb.r*br;cl[k6+1]=bb.g*br;cl[k6+2]=bb.b*br; cl[k6+3]=cl[k6+4]=cl[k6+5]=0; }
  flowG.attributes.position.needsUpdate=true; flowG.attributes.color.needsUpdate=true;
}
function readout(s){ const mx=coneMax(M);
  read.innerHTML=[['Mach',M.toFixed(2)],['Nose half-angle',(tc/DEG).toFixed(2)+'°'],['Shock angle',s?(s.b/DEG).toFixed(2)+'°':'detached'],['Max cone',(mx.tc/DEG).toFixed(1)+'°'],['Mach at surface',s?s.Mc.toFixed(2):'< 1'],['p surface / p∞',s?s.pc.toFixed(2):'-'],['T2 / T1',s?s.Tr.toFixed(2):'-'],['Cd wave',s?s.cd.toFixed(3):'-']].map(([k,v])=>`<span>${k}</span><span>${v}</span>`).join(''); }
function setTc(v){ const n=clamp(v,4*DEG,42*DEG); if(Math.abs(n-tc)>.02*DEG){ tc=n; buildRocket(); A.key(); } }
function newRun(){
  const g=game; g.r++; if(g.r>5) return end();
  M=[2.6,3.1,3.6,4.2,4.9][g.r-1]+(Math.random()-.5)*.2;
  let tStar=14*DEG, s=null; for(let k=0;k<40;k++){ tStar=(7+Math.random()*16)*DEG; s=solve(tStar,M); if(s){ const span=XF*Math.tan(s.b)-RB; if(span>.55&&span<2.6) break; } }
  finY=XF*Math.tan(s.b); g.tStar=tStar; tc=clamp(tStar+(Math.random()<.5?-1:1)*(5+Math.random()*5)*DEG,4*DEG,40*DEG); roll=0; buildRocket(); tipM.position.set(XF,finY,.05);
  g.left=12; g.state='set'; $('#bsRound').textContent=`Run ${g.r} / 5`; $('#bsMach').textContent='M '+M.toFixed(2); $('#bsRun').disabled=false;
  showBanner($('#bsBanner'),'Mach '+M.toFixed(1),`Run ${g.r}`); A.ping(1175,.04); cx.clearRect(0,0,conv.width,conv.height);
}
function lockRun(){ if(!game||game.state!=='set') return; game.state='run'; run={t:0}; $('#bsRun').disabled=true; A.launch(); A.roar(.22); }
function scoreRun(){
  const g=game, s=solve(tc,M); let pts_=0, g_='', err=99;
  if(!s){ g_='Detached'; g.det++; A.buzz(); feedback(.3,.8,new T.Color(.1,0,0)); }
  else { const ys=XF*Math.tan(s.b); err=Math.abs(ys-finY)/XF*100; const tb=1+g.left/12*.3; pts_=Math.round(Math.max(0,1000-err*90)*tb);
    g_=err<1.5?'Grazing':err<5?'Close':ys<finY?'Fins pierce the shock':'Shock clears the fins'; if(err<1.5){ g.hits++; A.chord(); S.flash=Math.max(S.flash,.12); } else A.chime(5); }
  g.score+=pts_; g.errs.push(err); $('#bsScore').textContent=fmt(g.score);
  popAt($('#bsPops'),new T.Vector3(XF,finY+.45,0),s?`${g_} · ${err.toFixed(1)}%`:g_,err<1.5?'big':s?'':'bad');
  g.state='done'; setTimeout(()=>{ if(game===g) newRun(); },1700); A.roar(0);
}
function drawConv(k,s){ const w=conv.width,h=conv.height; cx.clearRect(0,0,w,h); cx.strokeStyle='rgba(196,214,255,.25)'; cx.lineWidth=1; cx.beginPath(); cx.moveTo(0,h-1); cx.lineTo(w,h-1); cx.stroke();
  cx.strokeStyle='#C4D6FF'; cx.lineWidth=2; cx.beginPath(); const n=Math.floor(k*120);
  for(let i=0;i<=n;i++){ const x=i/120*w; const lvl=Math.floor(i/40); const yy=h*(.3+.55*(1-Math.exp(-(i%40)/10))*.7+lvl*.04)+Math.sin(i*1.7)*2; i?cx.lineTo(x,yy):cx.moveTo(x,yy); } cx.stroke();
  const lvl=Math.min(2,Math.floor(k*3)), band=[.024,.009,.003][lvl];
  cx.fillStyle='rgba(196,214,255,.85)'; cx.font='20px "Departure Mono", monospace'; cx.fillText(`GRID ${[40,80,160][lvl]}   CD ${s?s.cd.toFixed(3):'-'} ± ${band.toFixed(3)}`,6,22); }
st.onPointer=function(e){ if(!game||game.state!=='set') return; const y0=e.clientY, t0=tc; const mv=ev=>setTc(t0+(y0-ev.clientY)*.0016); const up=()=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); }; addEventListener('pointermove',mv); addEventListener('pointerup',up); };
addEventListener('keydown',e=>{ if(S.stId!=='bs'||S.mode!=='station'||!game) return; if(e.code==='ArrowUp'||e.code==='ArrowDown'){ e.preventDefault(); keysHeld=e.code==='ArrowUp'?1:-1; } if(e.code==='Space'&&!e.repeat){ e.preventDefault(); lockRun(); } });
addEventListener('keyup',e=>{ if(e.code==='ArrowUp'||e.code==='ArrowDown') keysHeld=0; });
addEventListener('wheel',e=>{ if(S.stId==='bs'&&game&&game.state==='set') setTc(tc-e.deltaY*.00025); },{passive:true});
$('#bsRun').addEventListener('click',lockRun);
st.play=function(){ game={r:0,score:0,hits:0,det:0,errs:[]}; $('#bsScore').textContent='0'; st.setState('play'); newRun(); };
st.abort=function(){ game=null; run=null; A.roar(0); };
function end(){ const g=game; game=null; const ok=g.errs.filter(e=>e<99); const avg=ok.length?ok.reduce((a,b)=>a+b,0)/ok.length:0;
  const grade=g.hits>=4?'Grazing':g.hits>=2?'Clean flow':'Shock-bitten';
  st.result({grade,score:g.score,stats:[['Grazing runs',g.hits+' / 5'],['Average miss',avg.toFixed(1)+'%'],['Top Mach','4.9'],['Detached',g.det],['Gas','Air, γ 1.4'],['Model','Taylor-Maccoll cone']],
    text:'Every shock here comes from the exact conical-flow solution. Bowshock goes much further: it solves the full flow around your rocket on your own GPU, and gives drag only with a checked uncertainty band.'}); A.dock(); }
st.enter=function(){ st.abort(); st.setState('menu'); M=3.2; tc=14*DEG; finY=XF*Math.tan(solve(tc,M).b); buildRocket(); tipM.position.set(XF,finY,.05); $('#bsBest').textContent='Best '+fmt(store.get('bs',0)); };
st.exit=function(){ st.abort(); };
let lastRead=-1;
st.update=function(dt,t){
  if(game&&game.state==='set'){ game.left-=dt; if(keysHeld) setTc(tc+keysHeld*dt*5*DEG); $('#bsTime').textContent=Math.max(0,game.left).toFixed(1)+' s'; if(game.left<=0) lockRun(); }
  const s=shockUpdate();
  if(run&&game&&game.state==='run'){ run.t+=dt; drawConv(Math.min(1,run.t/1.6),s); if(run.t>1.6){ run=null; scoreRun(); } }
  if(!game&&st.state==='menu'){ const nt=(14+Math.sin(t*.5)*4)*DEG; if(Math.abs(nt-tc)>.4*DEG){ tc=nt; buildRocket(); } }
  // the rocket rolls slowly while you read; it holds still while you play
  roll=st.state==='menu'?t*.2:damp(roll,Math.round(roll/(Math.PI/2))*(Math.PI/2),4,dt); rocket.rotation.x=roll;
  flow(Math.min(dt,.033),s); if(t-lastRead>.1||t<lastRead){ lastRead=t; readout(s); }
  const nar=NARROW(); st.camP.set(nar?3:2.2,nar?2.4:1.9,nar?20:13.4); st.camL.set(nar?3:3.3,nar?.6:.1,0);
  if(st.state==='menu') notesUpdate(st);
};
})();

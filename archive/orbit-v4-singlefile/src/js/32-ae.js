/* ================= AETOS: HOLD THE SKY ================= */
(()=>{
const STA_AE_A=[new T.Vector3(0,.3,0),new T.Vector3(1.9,.2,1.1),new T.Vector3(-2.1,.2,.55)];
const st=mkStation('ae',{arrive:new T.Vector3(0,6,8)});
const sc=st.scene, el=st.el, MAXD=48, MAXM=10, AMMO=6;
const COL={unk:new T.Color('#C9C2B4'),hos:new T.Color('#FF5636'),fri:new T.Color('#A5C3FF')};
const TYPES={scout:{spd:1.25,hp:1,sc:1,pts:100,label:'SCOUT'},swarm:{spd:.55,hp:1,sc:.62,pts:60,label:'SWARM'},heavy:{spd:.45,hp:2,sc:1.55,pts:250,label:'HEAVY'},friend:{spd:.95,hp:1,sc:1.1,pts:-400,label:'FRIENDLY'}};
const WAVES=[{dur:20,every:1.55,mix:[['scout',.72],['friend',.28]],name:'Scouts inbound'},{dur:22,every:1.35,mix:[['scout',.42],['friend',.22],['swarm',.36]],name:'Swarms inbound'},{dur:25,every:1.15,mix:[['scout',.34],['friend',.2],['swarm',.24],['heavy',.22]],name:'Heavies inbound'}];
const SITES=[{name:'Substation',p:new T.Vector3(1.9,0,1.1)},{name:'Airfield',p:new T.Vector3(-2.1,0,.55)},{name:'Water works',p:new T.Vector3(.25,0,-2.25)}];
let sweepU,inst,navG,navP,navB,missP,missG,boom,smoke,jamU,game=null,drones=[],miss=[],nextId=1,sw=0,lastSw=0,tableT=0;
const M4=new T.Matrix4(), Qn=new T.Quaternion(), V=new T.Vector3(), V2=new T.Vector3(), SCL=new T.Vector3(), YAX=new T.Vector3(0,1,0);
const marks=$('#aeMarks'), table=$('#aeTable'), banner=$('#aeBanner'), pips=$('#aePips');
for(let i=0;i<AMMO;i++) pips.appendChild(document.createElement('i'));
const trk=[...Array(24)].map(()=>{const d=document.createElement('div'); d.className='trk'; d.innerHTML='<span></span>'; d.style.display='none'; marks.appendChild(d); return d;});
const siteEls=SITES.map(s=>{const d=document.createElement('div'); d.className='asset'; d.innerHTML=`<span>${s.name}</span><span class="hp"><i></i><i></i><i></i></span>`; marks.appendChild(d); return d;});

function droneGeo(){
  const pos=[],nor=[]; const add=(bg)=>{ const b=bg.toNonIndexed(); pos.push(...b.attributes.position.array); nor.push(...b.attributes.normal.array); };
  add(new T.BoxGeometry(.2,.07,.2));
  const a1=new T.BoxGeometry(.62,.025,.04); a1.rotateY(Math.PI/4); add(a1); const a2=new T.BoxGeometry(.62,.025,.04); a2.rotateY(-Math.PI/4); add(a2);
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([x,z])=>{ const r=new T.CylinderGeometry(.1,.1,.012,14); r.translate(x*.22,.03,z*.22); add(r); });
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new T.Float32BufferAttribute(nor,3)); return g;
}
st.build=function(){
  sweepU={uSw:{value:0}};
  sc.add(pts(cloud(Math.floor(24000*Q+5000),(i,r,o)=>{ const R=6.6, w=r[3];
    if(w>.62){ const lines=r[2]<.5, az=lines?Math.floor(r[0]*16)/16*TAU:r[0]*TAU, e=lines?r[1]*Math.PI/2:Math.floor(r[1]*5)/5*Math.PI/2+.02; o[0]=Math.cos(az)*Math.cos(e)*R;o[1]=Math.sin(e)*R*.55;o[2]=Math.sin(az)*Math.cos(e)*R; }
    else if(w>.48){ const az=Math.floor(r[0]*12)/12*TAU,rr=r[1]*R; o[0]=Math.cos(az)*rr;o[1]=0;o[2]=Math.sin(az)*rr; }
    else { const ring=r[2]<.7,az=r[0]*TAU,rr=ring?(Math.floor(r[1]*6)+1)/6*R+gauss()*.012:Math.sqrt(r[1])*R; o[0]=Math.cos(az)*rr;o[1]=0;o[2]=Math.sin(az)*rr; } }),
    PM({size:.032,color:'#D8D0C2',uniforms:sweepU,decl:'uniform float uSw;',body:`float a=atan(p.z,p.x); float d=mod(uSw-a,6.28318); float ph=exp(-d*2.4);
      b=aR.w>.62?.06+.24*ph:.07+1.1*ph; col=mix(uCol,vec3(1.,.97,.93),ph*.7);`})));
  // sweep beam wedge
  sc.add(pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{o[0]=r[0];o[1]=r[1];o[2]=0;}),PM({size:.04,color:'#F2EEE6',uniforms:sweepU,decl:'uniform float uSw;',
    body:`float a=uSw-position.y*.35; float rr=sqrt(position.x)*6.6; p=vec3(cos(a)*rr,.02,sin(a)*rr); b=.5*(1.-position.y);`})));
  // command post + sites
  const cp=new T.Mesh(new T.OctahedronGeometry(.22,0),LM('#F2EEE6',{emit:.4,rim:1.2})); cp.position.y=.25; sc.add(cp); st.cp=cp;
  SITES.forEach(s=>{ const m=new T.Mesh(new T.CylinderGeometry(.3,.36,.24,6),LM('#D8D0C2',{emit:.08,rim:1.1,amb:.15,key:'#FFFFFF'})); m.position.copy(s.p).setY(.12); sc.add(m); s.mesh=m;
    const ring=new T.LineLoop(ringGeo(.62,64),dashMat('#D8D0C2','float a=.5*step(.5,fract(vAng*4.+uTime*.2));')); ring.material.uniforms.uOp.value=1; ring.position.copy(s.p).setY(.02); sc.add(ring); s.ring=ring; });
  inst=new T.InstancedMesh(droneGeo(),LM('#FFFFFF',{emit:.55,rim:1.1,amb:.2,key:'#FFFFFF'}),MAXD); inst.frustumCulled=false;
  for(let i=0;i<MAXD;i++){ M4.makeScale(0,0,0); inst.setMatrixAt(i,M4); inst.setColorAt(i,COL.unk); } sc.add(inst);
  navP=new Float32Array(MAXD*3).fill(999); navB=new Float32Array(MAXD); navG=new T.BufferGeometry(); navG.setAttribute('position',new T.BufferAttribute(navP,3)); navG.setAttribute('aB',new T.BufferAttribute(navB,1));
  navG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXD*4).fill(.6),4)); navG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  sc.add(pts(navG,PM({size:.3,color:'#ffd6cf',decl:'attribute float aB;',body:'b=aB;'})));
  missP=new Float32Array(MAXM*3).fill(999); missG=new T.BufferGeometry(); missG.setAttribute('position',new T.BufferAttribute(missP,3)); missG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXM*4).fill(.8),4)); missG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  sc.add(pts(missG,PM({size:.28,color:'#ffffff',body:'b=1.6;'})));
  boom=Burst(sc,Math.floor(1400*Q+400),'#ffd2c2',.12); smoke=Burst(sc,Math.floor(1600*Q+400),'#c8c0dc',.07);
  jamU={uR:{value:0},uO:{value:0}};
  sc.add(pts(cloud(1600,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=.1+gauss()*.1;o[2]=Math.sin(a);}),PM({size:.07,color:'#8fc2ff',uniforms:jamU,decl:'uniform float uR,uO;',body:'p.xz*=uR; b=uO*(.5+aR.z);'})));
};
function spawn(type,at,center){
  if(drones.length>=MAXD-1) return;
  const a=at??Math.random()*TAU, R=7.3; let p=new T.Vector3(Math.cos(a)*R,1.2+Math.random()*1.1,Math.sin(a)*R); if(center) p=center.clone().add(new T.Vector3(gauss()*.35,gauss()*.15,gauss()*.35));
  const T_=TYPES[type]; const alive=SITES.map((s,i)=>i).filter(i=>SITES[i].hp>0);
  const d={id:nextId++,type,cls:'unk',p,hp:T_.hp,ph:Math.random()*6,jam:0,dead:false,fall:false,vy:0,lock:false,seen:0};
  if(type==='friend'){ const b=a+Math.PI+(Math.random()-.5)*1.1; d.goal=new T.Vector3(Math.cos(b)*R,2.4,Math.sin(b)*R); d.p.y=2.4; }
  else { d.site=alive.length?alive[(Math.random()*alive.length)|0]:0; }
  drones.push(d); return d;
}
function kill(d,byJam){
  d.dead=true; const T_=TYPES[d.type]; boom.emit(d.p,d.type==='heavy'?80:46,2.6,d.type==='friend'?COL.fri:COL.hos,.4,.9); A.pop();
  if(!game) return;
  if(d.type==='friend'){ game.score-=400; game.blue++; feedback(.35,1,new T.Color(0,.03,.14)); showBanner(banner,'Friendly hit','−400'); A.buzz(); }
  else { game.score+=T_.pts; game.kills++; feedback(.12,.25); }
}
function fire(d){
  if(!game||game.ammo<=0){ if(game){ A.beep(220); } return; }
  const m=miss.find(x=>!x.on)||(miss.length<MAXM?(miss.push({}),miss[miss.length-1]):null); if(!m) return;
  Object.assign(m,{on:true,p:new T.Vector3(0,.3,0),v:new T.Vector3(0,4,0),tgt:d,life:3.2}); d.lock=true; game.ammo--; game.shots++; A.launch(); A.blip();
}
function jam(){
  if(!game||game.jamCD>0) return; game.jamCD=10; game.jamT=0; A.jam(); feedback(.18,.5,new T.Color(0,.02,.08));
  drones.forEach(d=>d.jamHit=false);
}
st.onPointer=function(e){
  if(st.state!=='play'||!game||game.inter>0&&game.wave===0) return;
  let best=null,bd=e.pointerType==='mouse'?70:95;
  drones.forEach(d=>{ if(d.dead||d.fall) return; V.copy(d.p).project(stCam); const sx=(V.x*.5+.5)*innerWidth, sy=(-V.y*.5+.5)*innerHeight; const dd=Math.hypot(sx-e.clientX,sy-e.clientY); if(dd<bd){bd=dd;best=d;} });
  if(best) fire(best); else A.beep(330);
};
$('#aeJam').addEventListener('click',jam);
addEventListener('keydown',e=>{ if(S.stId==='ae'&&S.mode==='station'&&e.code==='Space'&&!e.repeat){ e.preventDefault(); jam(); } });
st.play=function(){
  drones=[]; miss.forEach(m=>m.on=false); boom.clear(); smoke.clear();
  SITES.forEach(s=>{ s.hp=3; s.mesh.material.uniforms.uC.value.set('#D8D0C2'); });
  game={wave:0,wt:0,inter:2.2,spawnT:0,score:0,kills:0,shots:0,blue:0,siteHits:0,ammo:AMMO,reload:0,jamCD:0,jamT:-1,ending:-1};
  st.setState('play'); showBanner(banner,'Wave 1',WAVES[0].name);
};
st.abort=function(){ game=null; drones=[]; miss.forEach(m=>m.on=false); trk.forEach(t=>t.style.display='none'); };
function end(){
  const g=game; game=null;
  const hp=SITES.reduce((a,s)=>a+Math.max(0,s.hp),0); const total=Math.max(0,g.score+hp*100);
  const grade=hp===0?'Airspace lost':g.blue>0?'Held, with a blue-on-blue':hp===9?'Flawless':hp>=6?'Airspace held':'Damaged, standing';
  st.result({grade,score:total,stats:[['Intercepted',g.kills],['Accuracy',g.shots?Math.round(g.kills/g.shots*100)+'%':'-'],['Friendlies hit',g.blue],['Site damage',g.siteHits],['Sites standing',SITES.filter(s=>s.hp>0).length+' / 3'],['Waves',Math.min(3,g.wave+1)+' / 3']],
    text:(g.blue?'Identification matters as much as speed. Let the sweep classify a contact before you fire. ':'')+'Aetos is built around this loop: detect, identify, decide, act, with every track accounted for.'});
  A.dock(); trk.forEach(t=>t.style.display='none');
}
st.enter=function(){ st.abort(); st.setState('menu'); SITES.forEach(s=>s.hp=3); $('#aeBest').textContent='Best '+fmt(store.get('ae',0));
  for(let i=0;i<6;i++){ const d=spawn(Math.random()<.3?'friend':'scout'); if(d){ d.p.setLength(2+Math.random()*4); d.p.y=1.2+Math.random(); d.demo=true; } } };
st.exit=function(){ st.abort(); };
st.update=function(dt,t){
  const playing=st.state==='play'&&game;
  sw=(sw+dt*TAU/2.4)%TAU; sweepU.uSw.value=sw; if(sw<lastSw) A.ping(1318,playing?.04:.025); lastSw=sw;
  // game flow
  if(playing){ const g=game, W=WAVES[g.wave];
    if(g.inter>0){ g.inter-=dt; } else {
      g.wt+=dt; $('#aeWaveM').style.setProperty('--v',clamp(g.wt/W.dur,0,1));
      if(g.wt<W.dur){ g.spawnT-=dt; if(g.spawnT<=0){ g.spawnT=W.every*(.7+Math.random()*.6); let r=Math.random(),type='scout'; for(const [k,p] of W.mix){ if(r<p){type=k;break;} r-=p; }
          if(type==='swarm'){ const a=Math.random()*TAU; const c=new T.Vector3(Math.cos(a)*7.3,1.4,Math.sin(a)*7.3); const s0=spawn('swarm',a); for(let k=0;k<4;k++){ const s=spawn('swarm',a,c); if(s&&s0) s.site=s0.site; } } else spawn(type); } }
      else if(!drones.some(d=>!d.dead&&d.type!=='friend')||g.wt>W.dur+6){ if(g.wave<2){ g.wave++; g.wt=0; g.inter=2.4; showBanner(banner,'Wave '+(g.wave+1),WAVES[g.wave].name); A.alarm(); } else return end(); }
    }
    $('#aeWave').textContent=`Wave ${g.wave+1} / 3`; $('#aeScore').textContent=fmt(g.score);
    if(g.ammo<AMMO){ g.reload+=dt; if(g.reload>=1.25){ g.reload=0; g.ammo++; } }
    [...pips.children].forEach((p,i)=>p.classList.toggle('e',i>=g.ammo));
    if(g.jamCD>0) g.jamCD=Math.max(0,g.jamCD-dt); $('#aeJam').style.setProperty('--p',1-g.jamCD/10);
    if(g.jamT>=0){ g.jamT+=dt; const R=E.o(clamp(g.jamT/.75,0,1))*5; jamU.uR.value=R; jamU.uO.value=1-clamp((g.jamT-.5)/.6,0,1);
      drones.forEach(d=>{ if(d.dead||d.jamHit) return; const r=Math.hypot(d.p.x,d.p.z); if(r<R){ d.jamHit=true; if(d.type==='swarm'){ d.fall=true; d.cls='hos'; } else if(d.type!=='friend'){ d.jam=3.5; } } });
      if(g.jamT>1.3) g.jamT=-1; }
    if(SITES.every(s=>s.hp<=0)) return end();
  } else { jamU.uO.value=0; }
  // drones
  drones.forEach(d=>{
    if(d.dead) return;
    const T_=TYPES[d.type]; const spd=T_.spd*(d.jam>0?.3:1)*(playing?1+game.wave*.08:.35); d.jam=Math.max(0,d.jam-dt);
    if(d.fall){ d.vy-=6*dt; d.p.y+=d.vy*dt; if(d.p.y<=.05) kill(d,true); return; }
    if(d.type==='friend'){ V.copy(d.goal).sub(d.p); V.y=0; if(V.length()<.4||Math.hypot(d.p.x,d.p.z)>7.6&&d.seen>3){ d.dead=true; return; } V.normalize().multiplyScalar(spd*dt); d.p.add(V); d.seen+=dt; }
    else { const s=SITES[d.site]; V.copy(s.p).sub(d.p); V.y=0; const dist=V.length(); V.normalize();
      V2.set(-V.z,0,V.x).multiplyScalar(Math.sin(t*1.7+d.ph)*.45*clamp(dist/3,0,1)); d.p.addScaledVector(V,spd*dt).addScaledVector(V2,dt);
      d.p.y=damp(d.p.y,dist<2?.32:1.4,1.2,dt);
      if(d.demo&&Math.hypot(d.p.x,d.p.z)<1){ d.p.setLength(6.5); }
      if(!d.demo&&dist<.42&&d.p.y<.7&&s.hp>0){ d.dead=true; s.hp--; boom.emit(s.p.clone().setY(.3),90,3,COL.hos,1,1); smoke.emit(s.p.clone().setY(.3),40,.6,null,1.2,2.2); A.alarm(); A.pop(); feedback(.5,1,new T.Color(.18,0,0));
        if(game){ game.score-=150; game.siteHits++; } if(s.hp<=0) s.mesh.material.uniforms.uC.value.set('#FF5636'); } }
    // the sweep identifies contacts
    if(d.cls==='unk'){ const a=Math.atan2(d.p.z,d.p.x); const df=((sw-a)%TAU+TAU)%TAU; if(df<TAU/2.4*dt*1.6+.02){ d.cls=d.type==='friend'?'fri':'hos'; if(playing) A.beep(d.cls==='fri'?520:1040); } }
  });
  // missiles
  miss.forEach((m,i)=>{ if(!m.on){ missP[i*3+1]=999; return; }
    m.life-=dt; let tg=m.tgt; if(!tg||tg.dead||tg.fall){ tg=null; let bd=3; drones.forEach(d=>{ if(d.dead||d.fall||d.cls==='fri') return; const dd=d.p.distanceTo(m.p); if(dd<bd){bd=dd;tg=d;} }); m.tgt=tg; }
    if(tg){ V.copy(tg.p).sub(m.p); const dist=V.length(); V.normalize().multiplyScalar(10); m.v.lerp(V,1-Math.exp(-7*dt)); if(dist<.3){ m.on=false; tg.hp--; tg.lock=false; if(tg.hp<=0) kill(tg); else { boom.emit(tg.p,20,1.5,COL.hos,0,.5); A.blip(); } } }
    m.p.addScaledVector(m.v,dt); smoke.emit(m.p,2,.15,null,.2,.7); if(m.life<=0){ m.on=false; boom.emit(m.p,12,1,null,0,.4); }
    missP[i*3]=m.p.x; missP[i*3+1]=m.p.y; missP[i*3+2]=m.p.z; });
  for(let i=miss.length;i<MAXM;i++) missP[i*3+1]=999;
  missG.attributes.position.needsUpdate=true;
  drones=drones.filter(d=>!d.dead);
  // write instances, nav lights, brackets
  let tk=0; const live=playing||st.state==='menu';
  for(let i=0;i<MAXD;i++){ const d=drones[i];
    if(!d||!live){ M4.makeScale(0,0,0); inst.setMatrixAt(i,M4); navP[i*3+1]=999; continue; }
    const s=TYPES[d.type].sc; Qn.setFromAxisAngle(YAX,t*.4+d.ph); SCL.set(s,s,s); M4.compose(d.p,Qn,SCL); inst.setMatrixAt(i,M4); inst.setColorAt(i,COL[d.cls]);
    navP[i*3]=d.p.x; navP[i*3+1]=d.p.y+.06; navP[i*3+2]=d.p.z; navB[i]=(Math.sin(t*8+d.ph*3)>.3?1.3:.25)*(d.cls==='hos'?1.4:1);
    if(playing&&tk<trk.length){ const e=trk[tk++]; V.copy(d.p).project(stCam); e.style.display=''; e.className='trk '+d.cls+(d.lock?' lock':''); e.style.transform=`translate(${(V.x*.5+.5)*innerWidth}px,${(-V.y*.5+.5)*innerHeight}px)`;
      e.firstChild.textContent=`TRK-${String(d.id).padStart(3,'0')} ${d.cls==='unk'?'UNK':d.cls==='fri'?'FRD':TYPES[d.type].label}`; }
  }
  for(;tk<trk.length;tk++) trk[tk].style.display='none';
  inst.instanceMatrix.needsUpdate=true; if(inst.instanceColor) inst.instanceColor.needsUpdate=true; navG.attributes.position.needsUpdate=true; navG.attributes.aB.needsUpdate=true;
  // track table at 8 Hz
  tableT-=dt; if(playing&&tableT<=0){ tableT=.12; const rows=drones.filter(d=>!d.fall).sort((a,b)=>Math.hypot(a.p.x,a.p.z)-Math.hypot(b.p.x,b.p.z)).slice(0,8);
    table.innerHTML=rows.map(d=>`<tr class="${d.cls}"><td>TRK-${String(d.id).padStart(3,'0')}</td><td>${d.cls==='unk'?'UNKNOWN':d.cls==='fri'?'FRIEND':'HOSTILE'}</td><td>${(Math.hypot(d.p.x,d.p.z)*180).toFixed(0)} m</td><td>${d.jam>0?'JAMMED':d.lock?'ENGAGED':d.type==='friend'?'TRANSIT':d.cls==='hos'?SITES[d.site].name.split(' ')[0].toUpperCase():'TRACKING'}</td></tr>`).join('');
    $('#aeCount').textContent=drones.length+' active'; }
  // sites
  SITES.forEach((s,i)=>{ V.copy(s.p).project(stCam); const e=siteEls[i]; e.style.transform=`translate(${(V.x*.5+.5)*innerWidth}px,${(-V.y*.5+.5)*innerHeight}px) translate(-50%,30px)`; e.classList.toggle('dead',s.hp<=0);
    [...e.querySelectorAll('.hp i')].forEach((p,k)=>p.classList.toggle('x',k>=s.hp)); e.style.opacity=st.state==='res'?0:1;
    s.mesh.position.y=.12+(s.hp>0?0:-.08); if(s.hp<=0&&Math.random()<dt*8) smoke.emit(s.p.clone().setY(.25),1,.2,null,.8,2); });
  st.cp.rotation.y=t;
  boom.update(dt,1.5,1.8); smoke.update(dt,-.4,.8);
  const nar=NARROW(); st.camP.set(0,nar?13.5:9.4,nar?10.5:8.6); st.camL.set(nar?0:-.6,-.2,.5);
  cursorAim(playing&&FINE); if(!playing&&st.state==='menu'){ st.anchors=[STA_AE_A[0],STA_AE_A[1],STA_AE_A[2]]; notesUpdate(st); }
};
})();

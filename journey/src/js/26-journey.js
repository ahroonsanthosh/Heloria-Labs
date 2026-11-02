/* ================= THE JOURNEY =================
   The site as one trip instead of a set of exhibits. You wake in orbit with the three of us on the radio. Home is Earth,
   on the far side of the black hole, and each project is what gets you past the next problem: Pharos finds you when
   the navigation dies, Aetos picks out the one contact that matters, Kríos talks the gate at the horizon open, and on
   the far side Ogive is your landing burn. One objective on screen at a time; every moment can be skipped. After you
   land, orbit is yours: every station is open as a full game. */
const J={active:false,done:false,gateOpen:false,hold:false,holdP:new T.Vector3(),obj:null,t:0,fx:[]};
const jv=[...Array(6)].map(()=>new T.Vector3());

/* ---------- the radio: who is speaking, typed out with their voice, one line after another ---------- */
const RADIO=(()=>{ const el=$('#radio'), img=$('#rdImg'), nm=$('#rdN'), tx=$('#rdT'), q=[]; let cur=null, shown=0, acc=0, hold=0;
  const WHO={ahroon:{name:'Ahroon',img:0,pitch:520},michael:{name:'Michael',img:1,pitch:430},abraham:{name:'Abraham',img:2,pitch:470},gate:{name:'The gate',img:-1,pitch:200}};
  function next(){ cur=q.shift()||null; if(!cur){ el.classList.remove('on'); return; } const w=WHO[cur.who]; nm.textContent=w.name; el.classList.toggle('gate',w.img<0); if(w.img>=0) img.src=PHOTOS[w.img];
    tx.textContent=''; shown=0; acc=0; hold=0; el.classList.add('on'); A.radio(); }
  function say(who,text,o={}){ q.push({who,text,o}); if(!cur) next(); }
  function update(dt){ if(!cur) return; const t=cur.text;
    if(shown<t.length){ acc+=dt*(J.fast?2000:46); const n=Math.min(t.length,Math.floor(acc)); if(n>shown){ if(Math.floor(n/2)>Math.floor(shown/2)&&t[n-1]!==' ') A.voice(WHO[cur.who].pitch); shown=n; tx.textContent=t.slice(0,n); } }
    else { hold+=dt; if(hold>(J.fast?.05:cur.o.hold??Math.max(1.5,t.length*.042))){ const f=cur.o.then; next(); if(f) f(); } } }
  el.addEventListener('click',()=>{ if(!cur) return; if(shown<cur.text.length){ shown=cur.text.length; tx.textContent=cur.text; } else hold=99; });
  return {say,update,clear(){ q.length=0; cur=null; el.classList.remove('on'); },get busy(){ return !!cur||q.length>0; }};
})();
/* a run of lines, then something happens */
function lines(list,then){ list.forEach((l,i)=>RADIO.say(l[0],l[1],i===list.length-1&&then?{then}:{})); }

/* ---------- the objective: one line at the top, a marker in space (click it to fly there), a faint line from you to it ---------- */
const JE={bar:$('#jobj'),txt:$('#jobjT'),dist:$('#jobjD'),mk:$('#jmark'),mkT:$('#jmarkT')};
JE.mk.addEventListener('click',()=>{ if(J.obj) autopilot(J.obj.hole?HOLE:J.obj); });
function objective(text,pos,arrive,radius=1.8,hole=false){ J.obj={id:'obj',obj:true,hole,name:text,pos:pos.clone(),vel:new T.Vector3(),R:0,color:'#FFC392',arrive,radius};
  JE.txt.textContent=text; JE.mkT.textContent=text; JE.bar.classList.add('on'); A.blip(); }
function noObjective(){ J.obj=null; JE.bar.classList.remove('on'); JE.mk.classList.remove('on'); if(S.ap&&S.ap.obj) S.ap=null; }
function holdHere(on){ J.hold=on; const P=S.probe; if(on){ J.holdP.copy(P.p); S.ap=null; } else { const r=Math.hypot(P.p.x,P.p.z), vc=Math.sqrt(GM/r); P.v.set(-P.p.z/r*vc,0,P.p.x/r*vc); } } // let go into a gentle orbit
const orbitA=()=>Math.atan2(S.probe.p.z,S.probe.p.x);
const onOrbit=(r,a,o=new T.Vector3())=>o.set(Math.cos(a)*r,0,Math.sin(a)*r);
function markUpdate(){ const o=J.obj, show=!!o&&(S.mode==='hub'||S.mode==='tohub'); JE.mk.classList.toggle('on',show); if(!show) return;
  const W=innerWidth, H=innerHeight, p=jv[0].copy(o.pos).project(hubCam), m=46; let x=(p.x*.5+.5)*W, y=(-p.y*.5+.5)*H; const behind=p.z>1;
  if(behind){ x=W-x; y=H-y; } let edge=behind||x<m||x>W-m||y<m+50||y>H-m-60;
  if(edge){ const cx=W/2, cy=H/2, dx=x-cx||1e-3, dy=y-cy||1e-3, k=Math.min((W/2-m)/Math.abs(dx),(H/2-m-60)/Math.abs(dy)); x=cx+dx*k; y=cy+dy*k; JE.mk.style.setProperty('--a',Math.atan2(dy,dx).toFixed(3)+'rad'); }
  JE.mk.classList.toggle('edge',edge); JE.mk.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  const d=o.hole?Math.hypot(S.probe.p.x,S.probe.p.z):o.pos.distanceTo(S.probe.p); JE.dist.textContent=(d/BH.RS).toFixed(1)+' rs';
  if(!S.ap&&S.mode==='hub'){ U.apLine.visible=true; const ap=U.apLine.geometry.attributes.position.array; ap[0]=S.probe.p.x; ap[1]=0; ap[2]=S.probe.p.z; ap[3]=o.pos.x; ap[4]=o.pos.y; ap[5]=o.pos.z;
    U.apLine.geometry.attributes.position.needsUpdate=true; U.apLine.material.uniforms.uR.value=d*1.2; U.apLine.material.uniforms.uOp.value=.45; }
  if(S.mode==='hub'&&!o.hole&&d<o.radius){ const f=o.arrive; noObjective(); if(f) f(); } }

/* ---------- small effects in space: a ring to fly through, bursts ---------- */
let ring=null;
function ringAt(pos,normal){ if(!ring){ ring=new T.Mesh(new T.TorusGeometry(1.15,.05,10,72),new T.MeshBasicMaterial({color:'#FFC392',transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false})); U.scene.add(ring); }
  ring.position.copy(pos); ring.lookAt(jv[1].copy(pos).add(normal)); ring.scale.setScalar(1); ring.material.opacity=.95; ring.visible=true; ring.userData.pop=0; }
function burst(pos,color='#FFC392',size=1){ const m=new T.Mesh(new T.SphereGeometry(.3,16,10),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));
  m.position.copy(pos); U.scene.add(m); J.fx.push({m,t:0,s:size}); }
function fxUpdate(dt){ for(let i=J.fx.length-1;i>=0;i--){ const f=J.fx[i]; f.t+=dt; const k=f.t/.55; f.m.scale.setScalar(f.s*(.4+k*2.6)); f.m.material.opacity=.9*(1-k); if(k>=1){ U.scene.remove(f.m); f.m.geometry.dispose(); J.fx.splice(i,1); } }
  if(ring&&ring.visible){ ring.rotation.z+=dt*.6; if(ring.userData.pop>0){ ring.userData.pop+=dt; const k=ring.userData.pop/.6; ring.scale.setScalar(1+k*1.8); ring.material.opacity=.95*(1-k); if(k>=1) ring.visible=false; } } }

/* ---------- Pharos: the navigation is dead; find yourself on the map from what the camera sees ---------- */
const PH={el:$('#jPh'),cam:$('#jPhCam'),map:$('#jPhMap'),r:$('#jPhR'),m:$('#jPhM'),terr:null,on:false,round:0,tx:0,ty:0,vx:256,vy:256,lock:0,miss:0,drag:false,done:null};
const PHN=512, CROP=88;
function phTerrain(){ const c=document.createElement('canvas'); c.width=c.height=PHN; const x=c.getContext('2d'), im=x.createImageData(PHN,PHN), d=im.data, rnd=seeded(5), H=new Float32Array(PHN*PHN);
  const h2=(i,j)=>{ const s=Math.sin(i*127.1+j*311.7)*43758.5453; return s-Math.floor(s); };
  const vn=(u,v)=>{ const i=Math.floor(u), j=Math.floor(v); let a=u-i, b=v-j; a=a*a*(3-2*a); b=b*b*(3-2*b); return lerp(lerp(h2(i,j),h2(i+1,j),a),lerp(h2(i,j+1),h2(i+1,j+1),a),b); };
  for(let y=0;y<PHN;y++) for(let X=0;X<PHN;X++){ let a=.5,f=1/70,s=0; for(let o=0;o<5;o++){ s+=a*vn(X*f+o*7.3,y*f+o*3.1); a*=.5; f*=2.1; } H[y*PHN+X]=s; }
  for(let k=0;k<80;k++){ const cx=rnd()*PHN, cy=rnd()*PHN, r=4+Math.pow(rnd(),2)*28, R=r*1.35;   // craters: a dark bowl and a bright rim on the sunward side
    for(let y=Math.max(0,(cy-R)|0);y<Math.min(PHN,cy+R);y++) for(let X=Math.max(0,(cx-R)|0);X<Math.min(PHN,cx+R);X++){ const dd=Math.hypot(X-cx,y-cy)/r, i=y*PHN+X;
      if(dd<1) H[i]-=.24*(1-dd*dd); else if(dd<1.35) H[i]+=.13*(1-(dd-1)/.35)*(((X-cx)-(y-cy))>0?1:.35); } }
  for(let i=0;i<PHN*PHN;i++){ const t=clamp((H[i]-.18)/.72,0,1); d[i*4]=34+t*178; d[i*4+1]=30+t*146; d[i*4+2]=26+t*108; d[i*4+3]=255; }
  x.putImageData(im,0,0); return c; }
function phRound(k){ PH.round=k; PH.lock=0; PH.miss=0; const m=CROP;
  do{ PH.tx=m+Math.random()*(PHN-2*m); PH.ty=m+Math.random()*(PHN-2*m); } while(Math.hypot(PH.tx-PH.vx,PH.ty-PH.vy)<150);
  PH.r.textContent=(k+1)+' / 3'; PH.m.textContent=FINE?'Move the square to where the camera is, then click':'Drag the square to where the camera is'; }
function phOpen(done){ if(!PH.terr) PH.terr=phTerrain(); PH.on=true; PH.done=done; PH.vx=PHN/2; PH.vy=PHN/2; phRound(0); PH.el.classList.add('on'); PH.el.setAttribute('aria-hidden','false'); }
function phClose(skipped){ PH.on=false; PH.el.classList.remove('on'); PH.el.setAttribute('aria-hidden','true'); const f=PH.done; PH.done=null; if(f) f(skipped); }
function phMove(e){ const r=PH.map.getBoundingClientRect(); PH.vx=clamp((e.clientX-r.left)/r.width*PHN,CROP/2,PHN-CROP/2); PH.vy=clamp((e.clientY-r.top)/r.height*PHN,CROP/2,PHN-CROP/2); }
function phTry(){ if(!PH.on||PH.lock) return; const d=Math.hypot(PH.vx-PH.tx,PH.vy-PH.ty);
  if(d<16){ PH.lock=1; A.ping(1318,.05); A.chime(9+PH.round*2,0,.05); feedback(.12,.3); PH.m.textContent='Position fixed';
    setTimeout(()=>{ if(!PH.on) return; if(PH.round<2) phRound(PH.round+1); else phClose(false); },900); }
  else { PH.miss++; A.tick(); PH.m.textContent=d<60?'Close. Look again.':'No match there'; if(PH.miss===2) RADIO.say('ahroon','Look for the big craters first. They don\'t lie.'); } }
PH.map.addEventListener('pointerdown',e=>{ if(!PH.on||PH.lock) return; PH.drag=true; try{ PH.map.setPointerCapture(e.pointerId); }catch(_){} phMove(e); });
PH.map.addEventListener('pointermove',e=>{ if(!PH.on||PH.lock) return; if(PH.drag||e.pointerType==='mouse') phMove(e); });
PH.map.addEventListener('pointerup',e=>{ if(!PH.on) return; PH.drag=false; phTry(); });
function phDraw(t){ const mc=PH.map.getContext('2d'), W=PH.map.width, k=W/PHN; mc.drawImage(PH.terr,0,0,W,W);
  mc.strokeStyle='rgba(255,195,146,.13)'; mc.lineWidth=1; mc.beginPath(); for(let g=1;g<8;g++){ const p=g*W/8; mc.moveTo(p,0); mc.lineTo(p,W); mc.moveTo(0,p); mc.lineTo(W,p); } mc.stroke();
  if(PH.lock){ PH.vx=lerp(PH.vx,PH.tx,.3); PH.vy=lerp(PH.vy,PH.ty,.3); }
  const d=Math.hypot(PH.vx-PH.tx,PH.vy-PH.ty), heat=PH.lock?1:clamp(1-d/210,0,1), s=CROP*k, x=PH.vx*k-s/2, y=PH.vy*k-s/2;
  const c=heat<.5?`rgb(${110+heat*2*150|0},${150+heat*2*40|0},${190-heat*2*110|0})`:`rgb(${255},${190-(heat-.5)*2*90|0},${80-(heat-.5)*2*40|0})`;
  mc.strokeStyle=c; mc.lineWidth=PH.lock?3:2; mc.strokeRect(x,y,s,s); mc.fillStyle=c; mc.globalAlpha=.12+.18*heat; mc.fillRect(x,y,s,s); mc.globalAlpha=1;
  if(heat>.7&&!PH.lock){ mc.strokeStyle=c; mc.globalAlpha=.5*Math.abs(Math.sin(t*9)); mc.strokeRect(x-4,y-4,s+8,s+8); mc.globalAlpha=1; }
  $('#jPhH').textContent=PH.lock?'Match 100%':'Match '+Math.round(heat*100)+'%'; $('#jPhH').style.color=c;
  const cc=PH.cam.getContext('2d'), CW=PH.cam.width; cc.drawImage(PH.terr,PH.tx-CROP/2,PH.ty-CROP/2,CROP,CROP,0,0,CW,CW);
  const nA=[.05,.2,.36][PH.round]*(PH.lock?.3:1);   // the jamming gets worse each round
  for(let i=0;i<1400*nA;i++){ const v=Math.random()>.5?235:15; cc.fillStyle=`rgba(${v},${v},${v},${.25+Math.random()*.5})`; cc.fillRect(Math.random()*CW,Math.random()*CW,2,2); }
  cc.fillStyle='rgba(0,0,0,.22)'; for(let yy=(t*40)%4;yy<CW;yy+=4) cc.fillRect(0,yy,CW,1);
  if(Math.random()<nA*.6){ const yy=Math.random()*CW, hh=4+Math.random()*16; cc.drawImage(PH.cam,0,yy,CW,hh,(Math.random()-.5)*20*nA*3,yy,CW,hh); }
  cc.strokeStyle='rgba(255,195,146,.7)'; cc.lineWidth=1; cc.beginPath(); cc.moveTo(CW/2-10,CW/2); cc.lineTo(CW/2+10,CW/2); cc.moveTo(CW/2,CW/2-10); cc.lineTo(CW/2,CW/2+10); cc.stroke(); }
$('#jPh [data-skip]').addEventListener('click',()=>{ if(PH.on){ RADIO.say('ahroon','I\'ll take this one.'); phClose(true); } });

/* ---------- Aetos: contacts close in; only one of them is a threat. Aetos rates each one; hit the one that matters ---------- */
const AE={el:$('#jAe'),on:false,wave:-1,list:[],done:null,warned:false,slow:1};
const aeGeo=new T.OctahedronGeometry(.17,0);
function aeClear(){ AE.list.forEach(c=>{ U.scene.remove(c.m); c.m.material.dispose(); c.el.remove(); }); AE.list=[]; }
function aeWave(k){ aeClear(); AE.wave=k; AE.warned=false; const n=[3,5,6][k], P=S.probe.p, ti=Math.floor(Math.random()*n), di=(ti+1+Math.floor(Math.random()*(n-1)))%n;
  const fa=Math.atan2(-Math.cos(S.yaw),-Math.sin(S.yaw));   // the way the camera looks, across the disk
  for(let i=0;i<n;i++){ const a=fa+(i/(n-1||1)-.5)*2.3+(Math.random()-.5)*.3, r=6.4+Math.random()*2.4, pos=new T.Vector3(P.x+Math.cos(a)*r,(Math.random()-.5)*.7,P.z+Math.sin(a)*r);
    const threat=i===ti, decoy=k===2&&i===di, to=jv[2].copy(P).sub(pos).normalize(), vel=new T.Vector3();
    if(threat) vel.copy(to).multiplyScalar([1.35,1.6,1.85][k]); else if(decoy) vel.copy(to).applyAxisAngle(UPV,.35).multiplyScalar(1.15); else vel.set(-to.z,0,to.x).multiplyScalar((.45+Math.random()*.45)*(Math.random()<.5?-1:1)).addScaledVector(to,.1);
    const m=new T.Mesh(aeGeo,new T.MeshBasicMaterial({color:'#EEE9DF'})); m.position.copy(pos); U.scene.add(m);
    const el=document.createElement('button'); el.type='button'; el.className='jae hit'; el.dataset.cur='Intercept'; el.innerHTML=`<i></i><span>TRK ${String(k*10+i+1).padStart(2,'0')} <b>0%</b></span>`; AE.el.appendChild(el);
    const c={m,el,b:el.querySelector('b'),pos,vel,threat,decoy,p:.06+Math.random()*.16,fr:false,dead:false}; el.addEventListener('click',()=>aeHit(c)); AE.list.push(c); } }
function aeHit(c){ if(!AE.on||c.dead) return;
  if(c.threat){ c.dead=true; burst(c.pos,'#FFC392',1); A.pop(); A.chime(10+AE.wave*2,0,.05); feedback(.18,.5); U.scene.remove(c.m); c.el.classList.add('gone'); aeNext(); }
  else if(!c.fr){ c.fr=true; c.el.classList.add('fr'); A.tick(); if(!AE.warned){ AE.warned=true; RADIO.say('ahroon','That one is friendly. Trust the numbers.'); } } }
function aeNext(){ AE.list.forEach(c=>{ if(!c.dead) c.el.classList.add('calm'); }); setTimeout(()=>{ if(!AE.on) return; if(AE.wave<2) aeWave(AE.wave+1); else aeClose(false); },1000); AE.slow=1; }
function aeOpen(done){ AE.on=true; AE.done=done; AE.el.classList.add('on'); aeWave(0); }
function aeClose(skipped){ AE.on=false; aeClear(); AE.el.classList.remove('on'); AE.slow=1; const f=AE.done; AE.done=null; if(f) f(skipped); }
function aeUpdate(dt){ const P=S.probe.p, W=innerWidth, H=innerHeight; let slowWant=1;
  for(const c of AE.list){ if(c.dead) continue; const d=c.pos.distanceTo(P);
    if(c.threat){ c.vel.multiplyScalar(1+.16*dt); if(AE.wave===2&&d<2.9) slowWant=.32; c.p=damp(c.p,clamp(.5+.47*(1-d/8.5),.5,.97),3,dt); }
    else if(c.decoy){ if(d<4.2) c.vel.applyAxisAngle(UPV,dt*.9); c.p=damp(c.p,d<4.2?.22:.48,2,dt); }
    else c.p=clamp(c.p+(Math.random()-.5)*dt*.3,.04,.26);
    c.pos.addScaledVector(c.vel,dt*AE.slow); c.m.position.copy(c.pos); c.m.rotation.y+=dt*2.2; c.m.rotation.x+=dt*1.3;
    if(c.threat&&d<.7){ c.dead=true; burst(c.pos,'#FF5636',1.3); A.buzz(); feedback(.6,1.4,new T.Color(.08,.02,0)); S.flash=Math.max(S.flash,.25); U.scene.remove(c.m); c.el.classList.add('gone');
      RADIO.say('michael','It clipped us. We\'re fine. Next one.'); aeNext(); continue; }
    if(c.decoy&&d>11){ c.dead=true; U.scene.remove(c.m); c.el.classList.add('gone'); continue; }
    const pr=jv[3].copy(c.pos).project(hubCam), on=pr.z<1&&Math.abs(pr.x)<1.05&&Math.abs(pr.y)<1.05; c.el.style.display=on?'':'none';
    if(on){ c.el.style.transform=`translate(${((pr.x*.5+.5)*W).toFixed(1)}px,${((-pr.y*.5+.5)*H).toFixed(1)}px)`; c.b.textContent=Math.round(c.p*100)+'%';
      c.el.classList.toggle('hot',c.p>.7); c.el.classList.toggle('warm',c.p>.38&&c.p<=.7); } }
  AE.slow=damp(AE.slow,slowWant,slowWant<1?6:3,dt); if(slowWant<1&&!AE.slowed){ AE.slowed=true; A.whoosh(false,1.2,.15); } if(slowWant>=1) AE.slowed=false; }
$('#jAeSkip').addEventListener('click',()=>{ if(AE.on){ RADIO.say('ahroon','I\'ll take this one.'); AE.list.forEach(c=>{ if(c.threat&&!c.dead) burst(c.pos); }); aeClose(true); } });

/* ---------- Kríos: the gate at the horizon answers back. Read the room ---------- */
const KR={el:$('#jKr'),cards:$('#jKrC'),mood:$('#jKrM'),q:$('#jKrQ'),on:false,i:0,score:0,done:null,line:'',shown:0,acc:0,hold:0,then:null};
function krSay(text,then,hold=1.2){ KR.line=text; KR.shown=0; KR.acc=0; KR.hold=hold; KR.then=then; KR.q.textContent=''; A.radio(); }
function krType(dt){ if(!KR.line) return; if(KR.shown<KR.line.length){ KR.acc+=dt*(J.fast?2000:44); const n=Math.min(KR.line.length,Math.floor(KR.acc)); if(n>KR.shown){ if(Math.floor(n/2)>Math.floor(KR.shown/2)&&KR.line[n-1]!==' ') A.voice(200); KR.shown=n; KR.q.textContent=KR.line.slice(0,n); } }
  else if(KR.then){ KR.hold-=dt; if(KR.hold<=0||J.fast){ const f=KR.then; KR.then=null; f(); } } }
const GATE=[
  {q:'No one goes through. Nothing comes back out. State your business.',a:[['Let me through. Now.',-1,'Demands. How original.'],['There are people on the other side I need to see.',1,'...Go on.'],['I\'m from Heloria Labs. We have a great product.',-1,'Everyone has a great product.']]},
  {q:'Everyone says that. Why should I believe you?',a:[['You shouldn\'t. But I came all this way to try.',1,'Honest. That is rare out here.'],['Because I\'m different.',-1,'They all say that too.'],['Trust me.',-1,'No.']]},
  {q:'Last question. What is waiting for you on the other side?',a:[['Three people who built everything that got me here.',1,'...That I can respect.'],['No idea. That\'s why I\'m going.',0,'Curious. Fine.'],['Does it matter?',-1,'It does to me.']]}];
function krMood(){ [...KR.mood.children].forEach((d,i)=>d.classList.toggle('on',i<2+KR.score)); U.sealU.uNear.value=clamp(.25+(KR.score+1)*.25,0,1); }
function krAsk(i){ KR.i=i; krSay(GATE[i].q,()=>krCards(i),.15); }
function krCards(i){ if(!KR.on) return; const opts=GATE[i].a.map((a,k)=>({a,k})).sort(()=>Math.random()-.5); KR.cards.innerHTML='';
  opts.forEach(({a})=>{ const b=document.createElement('button'); b.type='button'; b.className='jkc hit'; b.textContent=a[0];
    b.addEventListener('click',()=>{ if(!KR.on) return; KR.cards.classList.remove('on'); KR.score+=a[1]; krMood(); A.click(); if(a[1]>0) A.chime(8+i*2,0,.04);
      krSay(a[2],()=>{ if(i<2) krAsk(i+1); else krClose(false); },1.3); }); KR.cards.appendChild(b); });
  KR.cards.classList.add('on'); }
function krOpen(done){ KR.on=true; KR.done=done; KR.score=0; KR.el.classList.add('on'); $('#hub').classList.add('talking'); krMood(); krAsk(0); }
function krClose(skipped){ KR.on=false; KR.line=''; KR.then=null; KR.cards.classList.remove('on'); KR.el.classList.remove('on'); $('#hub').classList.remove('talking'); const f=KR.done; KR.done=null; if(f) f(skipped); }
$('#jKr [data-skip]').addEventListener('click',()=>{ if(KR.on){ RADIO.clear(); RADIO.say('abraham','Let me talk to it.'); krClose(true); } });

/* ---------- the trip, beat by beat ---------- */
J.begin=function(){ J.active=true; J.done=false; J.gateOpen=false; S.mode='story'; toHub(); spawnProbe(24,2.2); $('#hub').classList.add('mission');
  setTimeout(()=>lines([
    ['ahroon','Pilot? You awake? It\'s Ahroon, back at Heloria.'],
    ['ahroon','You\'re a long way out. Home is on the other side of that black hole.'],
    ['michael','Michael here. Easy on the thrust, gravity is strong out there. Fly through the ring ahead of you.']],beatRing),1600); };
function beatRing(){ const P=S.probe, rad=jv[0].copy(P.p).normalize(), tg=jv[1].copy(P.v).normalize(), pos=P.p.clone().addScaledVector(tg,7).addScaledVector(rad,-1.4); pos.y=0;
  ringAt(pos,tg); objective('Fly through the ring',pos,()=>{ ring.userData.pop=.001; A.chime(12,0,.06); A.whoosh(true,1,.15); beatBelt(); },1.3); }
function beatBelt(){ lines([['ahroon','Nice flying. Now head in, toward the asteroid belt.']]); objective('Reach the asteroid belt',onOrbit(15.4,orbitA()+.5),()=>{ holdHere(true);
  lines([['michael','Wait. We\'ve lost you. Navigation is dead.'],['ahroon','GPS can\'t work this close to the hole. Good thing I built Pharos.'],['ahroon','Find yourself on the map from what the camera sees.']],()=>phOpen(sk=>{
    holdHere(false); lines([['ahroon',sk?'There. Navigation is back.':'Got you. Navigation is back. That was Pharos.']],beatContacts); })); },2.2); }
function beatContacts(){ lines([['michael','Next stop, the horizon. Head straight in.']]); objective('Head for the hole',onOrbit(9.8,orbitA()+.45),()=>{ holdHere(true);
  lines([['ahroon','Contacts. A lot of them.'],['ahroon','Most are harmless. One isn\'t. Aetos rates every one of them: hit the one it marks before it reaches you.']],()=>aeOpen(sk=>{
    holdHere(false); lines([['ahroon',sk?'Clear.':'That\'s all of them. Clear. That was Aetos.'],['michael','Keep going. The horizon is close.']],beatGate); })); },2.2); }
function beatGate(){ objective('The horizon',onOrbit(3.7,orbitA()+.35),()=>{ holdHere(true);
  lines([['abraham','Abraham here. That\'s the gatekeeper, and it won\'t just open.'],['abraham','This one is mine: Kríos. It answers back, like a real buyer would. Read the room. Don\'t push.']],()=>krOpen(sk=>{
    const open=()=>{ J.gateOpen=true; holdHere(false); A.chord(); feedback(.4,1); S.flash=Math.max(S.flash,.2);
      lines([['ahroon','You did it. Now fall in.'],['ahroon','We\'ll see you on the other side.']]); objective('Fall in',new T.Vector3(),null,0,true); };
    RADIO.say('gate',sk?'...Fine. Go.':KR.score>=1?'You read the room. Go on, then. Mind the drop.':'You don\'t give up, do you. Fine. Go.',{then:open}); })); },1.6); }
/* the seal holds you off until the gate is talked open */
J.sealHit=function(){ if(J.active&&!J.gateOpen&&!J.sealTold&&!J.obj){ J.sealTold=true; RADIO.say('ahroon','Not yet. The gate is still shut.'); } };
/* the fall is the old plunge; then Earth. Coming back up from Earth, orbit is yours */
J.fellIn=function(){ noObjective(); };
J.finish=function(){ if(J.done) return; J.done=true; J.active=false; J.gateOpen=true; noObjective(); $('#hub').classList.remove('mission');
  setTimeout(()=>lines([['ahroon','Orbit is yours now. Every project out there is a full game.'],['michael','Go and play. And come back down any time.']]),2200); };
J.update=function(dt,rdt){ RADIO.update(rdt); if(!J.active){ JE.mk.classList.remove('on'); return; } J.t+=dt;
  markUpdate(); fxUpdate(rdt); if(PH.on) phDraw(J.t); if(AE.on) aeUpdate(rdt);
  if(KR.on) krType(rdt);
  if(KR.on) U.sealU.uNear.value=damp(U.sealU.uNear.value,clamp(.25+(KR.score+1)*.25,0,1),3,dt); };

/* for tests: the moments' state and a way through them */
J.dbg={PH,AE,KR,phTry,aeHit,GATE,get ring(){ return ring; }};

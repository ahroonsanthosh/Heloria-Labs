/* ================= PHAROS: LOST SIGNAL =================
   GPS is jammed. The drone's downward camera goes through Pharos's pipeline (raw, rectify, describe) and you do the match:
   find the view on the map. Trusted within 25 m. A confident GNSS fix may be spoofed. */
(()=>{
const st=mkStation('ph',{arrive:new T.Vector3(0,3,5)});
const sc=st.scene, MAP=1024, MPX=2000/MAP, FEED=150, PW=12;   // 2 km map, plane 12 world units wide
let mapC,edgeC,mapTex,edgeTex,u,plane,drone,game=null,rand=Math.random,feedCtx,stageT=0,stage=0,reveal_=null;
const feed=$('#phFeed'); feedCtx=feed.getContext('2d');
const marks=document.createElement('div'); $('.ghud',st.el).appendChild(marks);
const mk=(cls,html)=>{ const d=document.createElement('div'); d.className='ui s'; d.style.cssText='position:absolute;left:0;top:0;white-space:nowrap;pointer-events:none;'+cls; d.innerHTML=html; marks.appendChild(d); return d; };
const mClick=mk('color:var(--ink)','<span style="display:block;width:14px;height:14px;margin:-7px 0 0 -7px;border:1px solid currentColor;transform:rotate(45deg)"></span>');
const mTrue=mk('color:var(--acc)','<span style="display:block;width:18px;height:18px;margin:-9px 0 0 -9px;border:1px solid currentColor;border-radius:50%"></span><span style="position:absolute;left:14px;top:-6px">Truth</span>');
const mSpoof=mk('color:var(--alarm)','<span style="display:block;width:10px;height:10px;margin:-5px 0 0 -5px;background:currentColor"></span><span style="position:absolute;left:12px;top:-6px">GNSS · ±3 m</span>');
[mClick,mTrue,mSpoof].forEach(m=>m.style.display='none');
const svgNS='http://www.w3.org/2000/svg'; const errSvg=document.createElementNS(svgNS,'svg'); errSvg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible'; const errLine=document.createElementNS(svgNS,'line'); errLine.setAttribute('stroke','#FFD5B3'); errLine.setAttribute('stroke-dasharray','4 4'); errSvg.appendChild(errLine); marks.appendChild(errSvg); errSvg.style.display='none';

/* ---------- an Irish landscape, generated ---------- */
function genMap(seed){
  rand=seeded(seed); const R=rand;
  mapC=mapC||document.createElement('canvas'); mapC.width=mapC.height=MAP; const x=mapC.getContext('2d');
  x.fillStyle='#4b5a3c'; x.fillRect(0,0,MAP,MAP);
  // fields: a warped grid of irregular quads
  const NG=9, V=[]; for(let j=0;j<=NG;j++){ V[j]=[]; for(let i=0;i<=NG;i++){ const e=i===0||i===NG||j===0||j===NG; V[j][i]=[i/NG*MAP+(e?0:(R()-.5)*70),j/NG*MAP+(e?0:(R()-.5)*70)]; } }
  const tones=['#5d6b43','#6e7a4a','#7a7650','#56623f','#8a8358','#66704a','#4f5e3d','#77754e','#6c6340','#83804f'];
  for(let j=0;j<NG;j++) for(let i=0;i<NG;i++){
    const q=[V[j][i],V[j][i+1],V[j+1][i+1],V[j+1][i]]; // split some cells in two
    const polys=R()<.45?(R()<.5?[[q[0],q[1],q[2]],[q[0],q[2],q[3]]]:[[q[0],q[1],q[3]],[q[1],q[2],q[3]]]):[q];
    polys.forEach(pp=>{ x.beginPath(); pp.forEach((p,k)=>k?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.closePath(); x.fillStyle=tones[(R()*tones.length)|0]; x.fill();
      if(R()<.4){ x.save(); x.clip(); const a=R()*Math.PI; x.strokeStyle='rgba(30,35,20,.22)'; x.lineWidth=2; const cx=pp[0][0],cy=pp[0][1]; for(let k=-30;k<30;k++){ x.beginPath(); x.moveTo(cx+Math.cos(a)*-400-Math.sin(a)*k*7,cy+Math.sin(a)*-400+Math.cos(a)*k*7); x.lineTo(cx+Math.cos(a)*400-Math.sin(a)*k*7,cy+Math.sin(a)*400+Math.cos(a)*k*7); x.stroke(); } x.restore(); }
      if(R()<.12){ x.save(); x.clip(); x.fillStyle='#6b5536'; for(let k=0;k<40;k++){ x.beginPath(); x.arc(pp[0][0]+(R()-.3)*120,pp[0][1]+(R()-.3)*120,6+R()*22,0,TAU); x.fill(); } x.restore(); } });
    // hedgerows
    x.strokeStyle='#2c3a24'; x.lineWidth=4; x.beginPath(); q.forEach((p,k)=>k?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.closePath(); x.stroke();
    x.fillStyle='#22301c'; for(let k=0;k<4;k++){ const a=q[k], b=q[(k+1)%4]; for(let m=0;m<8;m++){ if(R()<.5) continue; const t=R(); x.beginPath(); x.arc(lerp(a[0],b[0],t),lerp(a[1],b[1],t),3+R()*5,0,TAU); x.fill(); } }
  }
  // woodland
  for(let w=0;w<5;w++){ const cx=R()*MAP, cy=R()*MAP; x.fillStyle='#24331f'; for(let k=0;k<160;k++){ x.beginPath(); x.arc(cx+gauss()*38,cy+gauss()*30,4+R()*7,0,TAU); x.fill(); } }
  // river
  const river=[]; let ry=R()*MAP*.6+MAP*.2, rx=-20; while(rx<MAP+20){ river.push([rx,ry]); rx+=34; ry+=(R()-.5)*60+Math.sin(rx*.01)*12; }
  const smooth=(pts_,w,c)=>{ x.strokeStyle=c; x.lineWidth=w; x.lineCap='round'; x.lineJoin='round'; x.beginPath(); x.moveTo(pts_[0][0],pts_[0][1]); for(let k=1;k<pts_.length-1;k++){ const mx=(pts_[k][0]+pts_[k+1][0])/2, my=(pts_[k][1]+pts_[k+1][1])/2; x.quadraticCurveTo(pts_[k][0],pts_[k][1],mx,my); } x.stroke(); };
  smooth(river,18,'#2a3328'); smooth(river,11,'#3f5560');
  // roads: two through-roads and a track
  const road=(a,b,wob)=>{ const p=[]; for(let k=0;k<=14;k++){ const t=k/14; p.push([lerp(a[0],b[0],t)+(k&&k<14?(R()-.5)*wob:0),lerp(a[1],b[1],t)+(k&&k<14?(R()-.5)*wob:0)]); } return p; };
  const r1=road([0,R()*MAP],[MAP,R()*MAP],70), r2=road([R()*MAP,0],[R()*MAP,MAP],70), r3=road([R()*MAP*.5,MAP],[MAP,R()*MAP*.5],50);
  [r1,r2].forEach(r=>{ smooth(r,11,'#2b2a26'); smooth(r,8,'#9a968a'); }); smooth(r3,5,'#8a7d62');
  // buildings: a village at the junction-ish, farmsteads along the roads
  const along=(r,t)=>{ const k=Math.min(13,Math.floor(t*14)); return r[k]; };
  const house=(cx,cy,a,w,h)=>{ x.save(); x.translate(cx,cy); x.rotate(a); x.fillStyle='#1c1b19'; x.fillRect(-w/2+2,-h/2+2,w,h); x.fillStyle=R()<.5?'#b9b2a5':'#8d4b3a'; x.fillRect(-w/2,-h/2,w,h); x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(-w/2,0,w,h/2); x.restore(); };
  const v=along(r1,.3+R()*.4); for(let k=0;k<26;k++) house(v[0]+gauss()*40,v[1]+gauss()*26,R()<.7?0:Math.PI/2+R()*.2,10+R()*12,8+R()*9);
  for(let f=0;f<10;f++){ const rr=[r1,r2,r3][f%3], p=along(rr,R()); const a=R()*Math.PI; for(let k=0;k<3;k++) house(p[0]+20+gauss()*10,p[1]+gauss()*10,a,9+R()*14,7+R()*8); }
  // speckle
  const id=x.getImageData(0,0,MAP,MAP), dd=id.data; for(let i=0;i<dd.length;i+=4){ const n=(R()-.5)*18; dd[i]+=n; dd[i+1]+=n; dd[i+2]+=n; } x.putImageData(id,0,0);
  // describe: edge map (Sobel on luminance), the same representation Pharos matches on
  edgeC=edgeC||document.createElement('canvas'); edgeC.width=edgeC.height=MAP; const ex=edgeC.getContext('2d'); const out=ex.createImageData(MAP,MAP), od=out.data;
  const L=new Float32Array(MAP*MAP); for(let i=0;i<MAP*MAP;i++) L[i]=dd[i*4]*.3+dd[i*4+1]*.59+dd[i*4+2]*.11;
  for(let y=1;y<MAP-1;y++) for(let xx=1;xx<MAP-1;xx++){ const i=y*MAP+xx; const gx=-L[i-MAP-1]-2*L[i-1]-L[i+MAP-1]+L[i-MAP+1]+2*L[i+1]+L[i+MAP+1]; const gy=-L[i-MAP-1]-2*L[i-MAP]-L[i-MAP+1]+L[i+MAP-1]+2*L[i+MAP]+L[i+MAP+1];
    const m=clamp((Math.hypot(gx,gy)-40)*1.4,0,255); od[i*4]=m; od[i*4+1]=m*.86; od[i*4+2]=m*.72; od[i*4+3]=255; }
  ex.putImageData(out,0,0);
  if(mapTex){ mapTex.needsUpdate=true; edgeTex.needsUpdate=true; }
}
function edgeDensity(cx,cy){ const d=edgeC.getContext('2d').getImageData(cx-FEED/2,cy-FEED/2,FEED,FEED).data; let s=0; for(let i=0;i<d.length;i+=16) s+=d[i]; return s/(d.length/16)/255; }

st.build=function(){
  genMap(7);
  mapTex=new T.CanvasTexture(mapC); edgeTex=new T.CanvasTexture(edgeC); [mapTex,edgeTex].forEach(t=>{ t.anisotropy=4; t.colorSpace=T.SRGBColorSpace; });
  u={tMap:{value:mapTex},tEdge:{value:edgeTex},uC:{value:new T.Vector2(.5,.5)},uR:{value:0},uTime:G.uTime,uOn:{value:0},uDesc:{value:.65},uFoot:{value:new T.Vector3(0,0,0)}};
  plane=new T.Mesh(new T.PlaneGeometry(PW,PW),new T.ShaderMaterial({uniforms:u,
    vertexShader:`varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D tMap,tEdge; uniform vec2 uC; uniform float uR,uTime,uOn,uDesc; uniform vec3 uFoot; varying vec2 vUv; varying vec3 vW;
      void main(){ vec3 m=texture2D(tMap,vUv).rgb; float l=dot(m,vec3(.3,.59,.11)); vec3 photo=mix(vec3(l),m,.55)*.42;
        vec3 e=texture2D(tEdge,vUv).rgb; vec3 c=photo*(1.-uDesc*.55)+e*vec3(1.,.84,.7)*uDesc*.72;
        // lighthouse sweep
        vec2 q=vUv-vec2(-.1,1.1); float a=atan(q.y,q.x); float bm=pow(max(cos(a-(-.8+.45*sin(uTime*.35))),0.),160.); c+=vec3(1.,.84,.7)*bm*.07;
        // uncertainty circle
        float d=length((vUv-uC)); float ring=smoothstep(.0035,0.,abs(d-uR)); float dash=step(.5,fract(atan(vUv.y-uC.y,vUv.x-uC.x)*12.+uTime*.3));
        c+=vec3(1.,.84,.7)*ring*(.4+.6*dash)*uOn; c*=1.+.12*step(d,uR)*uOn;
        // camera footprint after reveal
        if(uFoot.z>0.){ vec2 fq=abs(vUv-uFoot.xy); float fe=max(fq.x,fq.y); c+=vec3(1.,.84,.7)*smoothstep(.003,0.,abs(fe-uFoot.z))*.9; }
        float v=smoothstep(.75,.35,length(vUv-.5)); c*=mix(.35,1.,v);
        gl_FragColor=vec4(c,1.); }`}));
  plane.rotation.x=-Math.PI/2; sc.add(plane);
  drone=new T.Group(); const body=new T.Mesh(new T.BoxGeometry(.22,.06,.22),LM('#FFD5B3',{emit:.3,rim:1})); drone.add(body);
  for(let k=0;k<4;k++){ const a=k*Math.PI/2+Math.PI/4; const r=new T.Mesh(new T.TorusGeometry(.09,.008,6,24),LM('#FFD5B3',{emit:.6})); r.rotation.x=Math.PI/2; r.position.set(Math.cos(a)*.2,.03,Math.sin(a)*.2); drone.add(r); }
  const cone=new T.Mesh(new T.ConeGeometry(.5,1.6,4,1,true),new T.MeshBasicMaterial({color:0xFFD5B3,transparent:true,opacity:.07,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false})); cone.position.y=-.8; cone.rotation.y=Math.PI/4; drone.add(cone);
  drone.position.set(0,1.7,0); sc.add(drone);
  sc.add(pts(cloud(Math.floor(2400*Q+400),(i,r,o)=>{o[0]=(r[0]-.5)*22;o[1]=.3+r[1]*4;o[2]=(r[2]-.5)*22;}),PM({size:.04,color:'#FFD5B3',body:'p.y+=sin(uTime*.3+aR.x*9.)*.2; b=.08;'})));
  st.anchors=[new T.Vector3(0,1.7,0),new T.Vector3(2.5,0,-1.5),new T.Vector3(-3,0,2)];
};
const px2w=(px,py)=>new T.Vector3((px/MAP-.5)*PW,0,(py/MAP-.5)*PW);
function drawFeed(){
  if(!game||!game.cur) return; const c=game.cur, w=feed.width, x=feedCtx;
  x.save(); x.fillStyle='#000'; x.fillRect(0,0,w,w); x.translate(w/2,w/2);
  const k=stage===0?0:clamp(stageT/.7,0,1), rot=c.head*(1-E.io(k)), sk=.35*(1-E.io(k));
  x.transform(1,0,sk*.2,1-sk*.3,0,0); x.rotate(rot); const s=w/FEED;
  const src=stage>=2?edgeC:mapC; const F2=FEED*1.5; x.drawImage(src,c.x-F2/2,c.y-F2/2,F2,F2,-w*.75,-w*.75,w*1.5,w*1.5);
  if(stage<2){ x.fillStyle='rgba(255,213,179,.06)'; x.fillRect(-w/2,-w/2,w,w); }
  x.restore();
  // lens vignette and noise on the raw feed
  if(stage<1){ const g=x.createRadialGradient(w/2,w/2,w*.2,w/2,w/2,w*.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.75)'); x.fillStyle=g; x.fillRect(0,0,w,w); }
  $$('.feed .stage span').forEach((s_,i)=>s_.classList.toggle('on',i===stage));
}
function pickSpot(){ let best=null; for(let k=0;k<26;k++){ const x=140+rand()*(MAP-280), y=140+rand()*(MAP-280); const e=edgeDensity(x,y); if(!best||e>best.e) best={x,y,e}; } return best; }
function newFix(){
  const g=game; g.r++; if(g.r>5) return end();
  const spot=pickSpot(); const ang=rand()*TAU, off=rand()*95+30; const R0=170+g.r*10;
  g.cur={x:spot.x,y:spot.y,head:(rand()-.5)*2.6,cx:clamp(spot.x+Math.cos(ang)*off,R0*.5,MAP-R0*.5),cy:clamp(spot.y+Math.sin(ang)*off,R0*.5,MAP-R0*.5),R:R0,t:0,clicked:false};
  g.spoof=g.r>=2?{x:clamp(g.cur.cx+(rand()-.5)*R0*1.1,40,MAP-40),y:clamp(g.cur.cy+(rand()-.5)*R0*1.1,40,MAP-40)}:null;
  if(g.spoof&&Math.hypot(g.spoof.x-spot.x,g.spoof.y-spot.y)<90){ g.spoof.x=clamp(spot.x+(spot.x<MAP/2?1:-1)*160,40,MAP-40); }
  stage=0; stageT=0; reveal_=null; u.uFoot.value.set(0,0,0); [mClick,mTrue].forEach(m=>m.style.display='none'); errSvg.style.display='none';
  mSpoof.style.display=g.spoof?'':'none';
  $('#phRound').textContent=`Fix ${g.r} / 5`; $('#phHelp').textContent=g.r===1?'Watch the pipeline, then click where the camera is looking':'GNSS says it knows where you are. Does it?';
  showBanner($('#phBanner'),`Fix ${g.r}`,g.r===1?'GPS jammed':'Dead reckoning');
  A.ping(988,.04);
}
st.onPointer=function(e){
  if(st.state!=='play'||!game||!game.cur||game.cur.clicked||stage<3) return;
  const ray=new T.Raycaster(); ray.setFromCamera({x:e.clientX/innerWidth*2-1,y:-(e.clientY/innerHeight*2-1)},stCam); const hit=ray.intersectObject(plane)[0]; if(!hit) return;
  const px=(hit.point.x/PW+.5)*MAP, py=(hit.point.z/PW+.5)*MAP; const c=game.cur; c.clicked=true; c.px=px; c.py=py;
  const err=Math.hypot(px-c.x,py-c.y)*MPX, spoofed=game.spoof&&Math.hypot(px-game.spoof.x,py-game.spoof.y)*MPX<60;
  const tf=Math.max(.3,1-c.t/25); let pts_=0, g_='';
  if(spoofed){ g_='Spoofed'; game.spoofed++; pts_=-300; A.buzz(); feedback(.3,.8,new T.Color(.14,0,0)); }
  else if(err<25){ g_='Trusted'; pts_=Math.round(1000*tf); game.trusted++; A.chord(); S.flash=Math.max(S.flash,.12); }
  else if(err<70){ g_='Close'; pts_=Math.round(420*tf); game.close++; A.chime(6); }
  else { g_='Wrong'; game.wrong++; A.buzz(); }
  game.score=Math.max(0,game.score+pts_); game.errs.push(err); $('#phScore').textContent=fmt(game.score);
  reveal_={t:0,err,g:g_}; u.uFoot.value.set(c.x/MAP,1-c.y/MAP,FEED/MAP*.5);
  popAt($('#phPops'),px2w(c.x,c.y),`${g_} · ${Math.round(err)} m`,g_==='Trusted'?'big':g_==='Close'?'':'bad');
  $('#phHelp').textContent=g_==='Spoofed'?'That fix was spoofed. A confident receiver is not the same as a correct one.':g_==='Trusted'?'Within 25 m. Pharos would trust that.':`${Math.round(err)} m off.`;
};
st.play=function(){ genMap((Math.random()*1e9)|0); rand=seeded((Math.random()*1e9)|0); game={r:0,score:0,trusted:0,close:0,wrong:0,spoofed:0,errs:[]}; $('#phScore').textContent='0'; st.setState('play'); u.uOn.value=1; newFix(); };
st.abort=function(){ game=null; u&&(u.uOn.value=0); [mClick,mTrue,mSpoof].forEach(m=>m.style.display='none'); errSvg.style.display='none'; };
function end(){
  const g=game; game=null; u.uOn.value=0; [mClick,mTrue,mSpoof].forEach(m=>m.style.display='none'); errSvg.style.display='none';
  const med=g.errs.slice().sort((a,b)=>a-b)[2]||0;
  const grade=g.spoofed?'Fooled by a spoof':g.trusted>=4?'Trusted':g.trusted+g.close>=3?'Holding position':'Lost';
  st.result({grade,score:g.score,stats:[['Trusted fixes',g.trusted+' / 5'],['Close',g.close],['Wrong',g.wrong],['Spoofs believed',g.spoofed],['Median error',Math.round(med)+' m'],['Map','2 km, edge matched']],
    text:'Pharos does this match on every frame with FFT cross-correlation, on a laptop CPU. On a real 13 minute flight it was trusted within 25 m 92% of the time, and never trusted a wrong position.'});
  A.dock();
}
st.enter=function(){ st.abort(); st.setState('menu'); $('#phBest').textContent='Best '+fmt(store.get('ph',0)); };
st.exit=function(){ st.abort(); };
st.update=function(dt,t){
  const nar=NARROW();
  if(game&&game.cur){ const c=game.cur;
    if(stage<3){ stageT+=dt; const dur=[.9,.9,.6][stage]; if(stageT>dur){ stage++; stageT=0; A.blip(); if(stage===3) $('#phHelp').textContent='Click where the camera is looking'; } }
    if(!c.clicked&&stage>=3){ c.t+=dt; c.R+=dt*7; }
    u.uC.value.set(c.cx/MAP,1-c.cy/MAP); u.uR.value=c.R/MAP; $('#phUnc').textContent='± '+Math.round(c.R*MPX)+' m';
    drawFeed();
    const est=px2w(c.cx,c.cy); if(!reveal_) drone.position.lerp(new T.Vector3(est.x,1.7,est.z),1-Math.exp(-3*dt));
    if(reveal_){ reveal_.t+=dt; const tw=px2w(c.x,c.y); drone.position.lerp(new T.Vector3(tw.x,1.5,tw.z),1-Math.exp(-5*dt));
      const pc=proj(px2w(c.px,c.py),stCam), pt=proj(tw,stCam); mClick.style.display=mTrue.style.display=''; errSvg.style.display='';
      mClick.style.transform=`translate(${pc.x}px,${pc.y}px)`; mTrue.style.transform=`translate(${pt.x}px,${pt.y}px)`;
      errLine.setAttribute('x1',pc.x); errLine.setAttribute('y1',pc.y); errLine.setAttribute('x2',pt.x); errLine.setAttribute('y2',pt.y);
      if(reveal_.t>2.3){ newFix(); } }
    if(game&&game.spoof){ const ps=proj(px2w(game.spoof.x,game.spoof.y),stCam); mSpoof.style.transform=`translate(${ps.x}px,${ps.y}px)`; }
  } else { drone.position.set(Math.sin(t*.3)*2,1.7+Math.sin(t*1.3)*.05,Math.cos(t*.4)*1.5); }
  drone.rotation.y=t*.4; u.uDesc.value=damp(u.uDesc.value,game?.75:.55,2,dt);
  st.camP.set(nar?0:1.4,nar?11.5:7.6,nar?9:6.6); st.camL.set(nar?0:-1.1,0,nar?.6:.3);
  if(st.state==='menu') notesUpdate(st);
};
})();

/* ================= UNIVERSE ================= */
const U={scene:new T.Scene()};
const GM=60, RB=27.5;
const wellY=r=>-2.4-8/(r+.8);

/* procedural nebula sky */
U.sky=new T.Mesh(new T.SphereGeometry(420,48,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{uTime:G.uTime},
  vertexShader:`varying vec3 vD; void main(){vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vD; uniform float uTime;
  float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}
  void main(){ vec3 d=normalize(vD); float n=fbm(d*2.6+vec3(0.,uTime*.003,0.)); float n2=fbm(d*6.5-4.);
    float band=exp(-pow(dot(d,normalize(vec3(.28,1.,.35))),2.)*9.);
    vec3 c=mix(vec3(.04,.025,.1),vec3(.3,.2,.58),n)*pow(n,2.8)*.5;
    c+=vec3(.5,.42,.85)*band*pow(n2,3.)*.32;
    c+=vec3(.12,.22,.32)*pow(fbm(d*1.8+9.),4.)*.22;
    gl_FragColor=vec4(c,1.); }`}));
U.scene.add(U.sky);
U.stars=pts(cloud(Math.floor(6500*Q+2000),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),R=280+r[2]*60;o[0]=Math.sin(b)*Math.cos(a)*R;o[1]=Math.cos(b)*R;o[2]=Math.sin(b)*Math.sin(a)*R;}),
  PM({size:.95,color:'#d9d2ff',body:`b=.22+.78*pow(aR.x,6.)*(.6+.4*sin(uTime*(1.+aR.y*3.)+aR.w*40.)); col=mix(uCol,vec3(.75,.85,1.),aR.y); sz=.6+pow(aR.x,8.)*2.2;`}));
U.scene.add(U.stars);

/* black hole: a star that collapses into a disk */
const NB=Math.floor(44000*Q);
U.bhU={uForm:{value:0},uHold:{value:0},uBurst:{value:1},uR:{value:new T.Vector3(1,0,0)},uU:{value:new T.Vector3(0,1,0)}};
U.bh=pts(cloud(NB,(i,r,o,ex)=>{
  if(r[3]>.8){const a=r[0]*TAU,rr=1.12+Math.pow(r[1],2.2)*.72+gauss()*.02; o[0]=Math.cos(a)*rr;o[1]=Math.sin(a)*rr*.94;o[2]=-.05;}
  else {const a=r[0]*TAU,rr=1.55+Math.pow(r[1],1.7)*4.9; o[0]=Math.cos(a)*rr;o[2]=Math.sin(a)*rr;o[1]=gauss()*.025*rr;}
  const a=r[0]*TAU,b=Math.acos(2*r[2]-1),R=2.2*Math.cbrt(.2+.8*r[1]); ex.pS.set([Math.sin(b)*Math.cos(a)*R,Math.cos(b)*R,Math.sin(b)*Math.sin(a)*R],i*3);
},{pS:3}), PM({size:.036,uniforms:U.bhU,decl:'uniform float uForm,uHold,uBurst; uniform vec3 uR,uU; attribute vec3 pS;',body:`
  vec3 q=position; float r=length(q.xz); vec3 dk; float bd;
  if(aR.w>.8){ vec3 r2=rotZ(q,uTime*.08); dk=uR*r2.x+uU*r2.y; bd=1.25; }
  else { dk=rotY(q,uTime*.95/pow(max(r,1.),1.5)); bd=1.6-r*.17; bd*=1.+.55*(dk.x/max(r,.001)); }
  vec3 s=pS*(1.-.8*uHold); float n=sin(uTime*37.+aR.x*60.)*sin(uTime*23.+aR.y*40.);
  s+=normalize(pS+.001)*n*.08*uHold; s=rotY(s,uTime*.3);
  float f=smoothstep(aR.y*.35,.65+aR.y*.35,uForm);
  vec3 sp=rotY(mix(s,dk,f),(1.-f)*6.*(1.-aR.x*.5)*step(.001,uForm));
  p=sp+normalize(sp+.001)*sin(f*3.1416)*uBurst*4.*aR.z;
  b=mix(.7+uHold*1.8,bd,f)+sin(f*3.1416)*uBurst*.8;
  col=mix(vec3(1.,.82,.6),uCol,f); sz=mix(1.25,1.,f);`}));
U.bh.renderOrder=1; U.scene.add(U.bh);
U.hole=new T.Mesh(new T.SphereGeometry(1,48,32),new T.MeshBasicMaterial({color:0})); U.hole.scale.setScalar(.001); U.hole.renderOrder=0; U.scene.add(U.hole);
U.jet=pts(cloud(Math.floor(5000*Q+800),(i,r,o)=>{o[0]=gauss();o[1]=r[0];o[2]=gauss();}),PM({size:.05,color:'#cfdcff',uniforms:{uF:U.bhU.uForm},decl:'uniform float uF;',
  body:`float s=aR.w<.5?1.:-1.; float h=fract(position.y+uTime*.16)*13.; float w=.05+h*.03; p=vec3(position.x*w,s*(1.1+h),position.z*w); b=(1.-h/13.)*.3*smoothstep(.6,1.,uF);`}));
U.scene.add(U.jet);
/* shockwave ring for the collapse */
U.shockU={uS:{value:0},uO:{value:0}};
U.shock=pts(cloud(Math.floor(2600*Q+600),(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=gauss()*.02;o[2]=Math.sin(a);}),PM({size:.07,color:'#ffe6d2',uniforms:U.shockU,decl:'uniform float uS,uO;',body:'p=position*(uS*(.92+aR.y*.16)); b=uO*(.6+aR.z);'}));
U.scene.add(U.shock);

/* spacetime grid: a polar mesh that sinks into the hole and dents under every mass */
{
  const v=[];
  for(let r=2;r<=30.5;r+=1.25){ const N=Math.max(64,Math.floor(r*9)); for(let k=0;k<N;k++){ const a0=k/N*TAU,a1=(k+1)/N*TAU; v.push(Math.cos(a0)*r,0,Math.sin(a0)*r,Math.cos(a1)*r,0,Math.sin(a1)*r); } }
  for(let s=0;s<48;s++){ const a=s/48*TAU; for(let k=0;k<72;k++){ const r0=1.7+k*.4, r1=1.7+(k+1)*.4; v.push(Math.cos(a)*r0,0,Math.sin(a)*r0,Math.cos(a)*r1,0,Math.sin(a)*r1); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  U.gridU={uTime:G.uTime,uProbe:{value:new T.Vector3(99,0,99)},uSt:{value:[0,1,2,3,4].map(()=>new T.Vector3(99,0,99))},uOp:{value:0},uC:{value:new T.Color('#9d8bd9')},uDip:{value:0}};
  U.grid=new T.LineSegments(g,new T.ShaderMaterial({uniforms:U.gridU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform vec3 uProbe; uniform vec3 uSt[5]; uniform float uTime,uOp,uDip; varying float vA;
    void main(){ vec3 p=position; float r=length(p.xz); float y=-2.4-8./(r+.8)*uDip-(1.-uDip)*1.2;
      float d=length(p.xz-uProbe.xz); y-=1.1*exp(-d*d*.55)*uDip;
      for(int i=0;i<5;i++){ float ds=length(p.xz-uSt[i].xz); y-=.75*exp(-ds*ds*.32)*uDip; }
      p.y=y; float wv=pow(.5+.5*sin(r*.85-uTime*1.3),10.);
      vA=uOp*((.07+.2*wv)*smoothstep(30.5,19.,r)*smoothstep(1.7,4.,r)+.32*exp(-d*d*.12));
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader:`uniform vec3 uC; varying float vA; void main(){ gl_FragColor=vec4(uC*vA,1.); }`}));
  U.grid.frustumCulled=false; U.scene.add(U.grid);
}

/* stations */
const STA=[
  {id:'kr',name:'Kríos',sub:'Voice · Clear Signal',R:8.6,ph:.4,color:'#a9dcff'},
  {id:'og',name:'Ogive',sub:'Flight · Apogee',R:12.4,ph:2.5,color:'#ffb48c'},
  {id:'ae',name:'Aetos',sub:'Airspace · Hold the Sky',R:16.2,ph:4.4,color:'#ff8a7a'},
  {id:'cr',name:'Crew',sub:'Who builds this',R:20,ph:1.3,color:'#dcd6ff'},
  {id:'be',name:'Beacon',sub:'Join · contact',R:23.8,ph:3.6,color:'#c9b6ff'}
];
const dashMat=(color,extra='')=>new T.ShaderMaterial({uniforms:{uC:{value:new T.Color(color)},uAng:{value:0},uR:{value:1},uOp:{value:0},uNear:{value:0},uTime:G.uTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`attribute float aAng; varying float vAng; void main(){ vAng=aAng; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform vec3 uC; uniform float uAng,uR,uOp,uNear,uTime; varying float vAng; void main(){ ${extra||`float df=mod(uAng-vAng,6.28318); float a=(.06+.75*exp(-df*2.))*step(.4,fract(vAng*uR*1.4)); `} gl_FragColor=vec4(uC*a*uOp,1.); }`});
function ringGeo(R,N,y=0){ const p=new Float32Array(N*3), a=new Float32Array(N); for(let k=0;k<N;k++){const t=k/N*TAU; p[k*3]=Math.cos(t)*R; p[k*3+1]=y; p[k*3+2]=Math.sin(t)*R; a[k]=t;} const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(p,3)); g.setAttribute('aAng',new T.BufferAttribute(a,1)); return g; }
STA.forEach((s,si)=>{
  s.idx=si; s.w=Math.sqrt(GM/(s.R**3))*.28; s.pos=new T.Vector3(); s.vel=new T.Vector3(); s.a=s.ph;
  const g=new T.Group(); s.grp=g; g.visible=false; U.scene.add(g);
  const N=Math.floor(2400*Q+600);
  let body=''; let geo;
  if(s.id==='kr'){ geo=cloud(N,(i,r,o)=>{const ring=Math.floor(r[0]*9),a=r[1]*TAU,y=(ring/8-.5)*1.7,rr=Math.sqrt(Math.max(0,1-Math.pow(y/.9,2)))*1.05;o[0]=Math.cos(a)*rr;o[1]=y;o[2]=Math.sin(a)*rr;});
    body=`float k=1.+.3*sin(uTime*5.+position.y*7.)*sin(uTime*1.3); p.xz*=k; b=.6+.6*abs(sin(uTime*5.+position.y*7.));`;
    const core=new T.Mesh(new T.SphereGeometry(.42,32,20),FM(s.color,{int:1.8})); g.add(core); }
  if(s.id==='og'){ geo=cloud(N,(i,r,o)=>{const a=r[0]*TAU;if(r[1]<.3){const u=Math.sqrt(r[2]);const rr=.28*Math.sqrt(1-Math.pow(1-u,2));o[0]=Math.cos(a)*rr;o[2]=Math.sin(a)*rr;o[1]=.9+(1-u)*1.1;}else if(r[1]<.85){o[0]=Math.cos(a)*.28;o[2]=Math.sin(a)*.28;o[1]=(r[2]-.5)*1.8;}else{const f=Math.floor(r[0]*4)*Math.PI/2;const sp=r[2]*.45;o[0]=Math.cos(f)*(.28+sp);o[2]=Math.sin(f)*(.28+sp);o[1]=-.9+Math.random()*.5*(1-r[2]);}});
    body=`p=rotZ(rotY(p,uTime*.6),.3); b=.9;`; }
  if(s.id==='ae'){ geo=cloud(N,(i,r,o)=>{const a=r[0]*TAU; if(r[3]<.5){const rr=r[1]<.6?(Math.floor(r[2]*4)+1)/4*1.5:r[2]*1.5;o[0]=Math.cos(a)*rr;o[1]=0;o[2]=Math.sin(a)*rr;} else {const el=r[1]*Math.PI/2;const R=1.5;o[0]=Math.cos(a)*Math.cos(el)*R;o[1]=Math.sin(el)*R*.6;o[2]=Math.sin(a)*Math.cos(el)*R;}});
    body=`float a=atan(p.z,p.x); float d=mod(uTime*2.6-a,6.2832); b=(aR.w<.5?.25+1.5*exp(-d*2.):.08+.4*exp(-d*2.)); p=rotX(p,.35);`;
    const core=new T.Mesh(new T.OctahedronGeometry(.3,0),FM(s.color,{int:1.6})); core.position.y=.35; g.add(core); s.spin=core; }
  if(s.id==='cr'){ geo=cloud(N,(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),R=1.25+r[2]*.25;o[0]=Math.sin(b)*Math.cos(a)*R;o[1]=Math.cos(b)*R*.5;o[2]=Math.sin(b)*Math.sin(a)*R;});
    body=`p=rotY(p,uTime*.2); b=.18;`;
    s.orbs=[0,1,2].map(k=>{const m=new T.Mesh(new T.SphereGeometry(.24,24,16),FM(s.color,{int:1.7,core:.08})); g.add(m); return m;}); }
  if(s.id==='be'){ geo=cloud(N,(i,r,o)=>{if(r[0]<.6){o[0]=gauss()*.05;o[2]=gauss()*.05;o[1]=r[1]*4.2-.5;}else{const a=r[1]*TAU,rr=.6+r[2]*1.1;o[0]=Math.cos(a)*rr;o[1]=-.6;o[2]=Math.sin(a)*rr;}});
    body=`if(aR.x<.6){ float t=fract(aR.y-uTime*.4); p.y=-.6+t*4.6; b=.45+1.3*(1.-t); } else { b=.3+.5*sin(uTime*2.+length(p.xz)*6.); }`;
    const sp=new T.Mesh(new T.CylinderGeometry(.05,.16,2.2,12),FM(s.color,{int:1.6})); sp.position.y=.4; g.add(sp); }
  s.mat=PM({size:.07,color:s.color,body}); g.add(pts(geo,s.mat));
  g.add(pts(cloud(380,(i,r,o)=>{const v=[gauss(),gauss(),gauss()],l=Math.hypot(...v)||1,R=1.9+r[0]*.7;o[0]=v[0]/l*R;o[1]=v[1]/l*R;o[2]=v[2]/l*R;}),PM({size:.05,color:s.color,body:'b=.1;'})));
  // orbit path with a comet trail behind the station
  s.orbit=new T.LineLoop(ringGeo(s.R,420),dashMat(s.color)); s.orbit.material.uniforms.uR.value=s.R; U.scene.add(s.orbit);
  // dock zone
  s.zone=new T.LineLoop(ringGeo(2.6,120),dashMat(s.color,`float a=(.18+.82*uNear)*step(.5,fract(vAng*6.+uTime*(.3+uNear)));`)); g.add(s.zone);
  // tether down to the grid
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(new Float32Array([0,-.9,0,0,wellY(s.R)-.75,0]),3)); tg.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  s.tether=new T.Line(tg,dashMat(s.color,'float a=.35*(1.-vAng)*step(.5,fract(vAng*14.-uTime*1.5));')); g.add(s.tether);
});

/* asteroid belt lit by the disk */
{
  const N=Math.floor(420*Q+120);
  const m=new T.ShaderMaterial({vertexShader:`varying vec3 vW; void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 vW; float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);} void main(){ float dc=length(cameraPosition-vW); if(dc<6.&&hh(gl_FragCoord.xy)>(dc-3.)/3.) discard; vec3 n=normalize(cross(dFdx(vW),dFdy(vW))+1e-6); if(dot(n,cameraPosition-vW)<0.) n=-n; vec3 L=normalize(-vW); float d=max(dot(n,L),0.); float r=length(vW.xz);
      vec3 c=vec3(1.,.82,1.)*pow(d,1.3)*(2.2/(1.+r*.08))+vec3(.03,.026,.06); gl_FragColor=vec4(c,1.); }`});
  U.belt=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),m,N); const M=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), sc=new T.Vector3(), p=new T.Vector3();
  for(let i=0;i<N;i++){ const a=Math.random()*TAU, r=14.3+gauss()*.42; p.set(Math.cos(a)*r,gauss()*.14,Math.sin(a)*r); e.set(Math.random()*6,Math.random()*6,Math.random()*6); q.setFromEuler(e);
    const s=.03+Math.pow(Math.random(),3)*.15; sc.set(s,s*(.6+Math.random()*.6),s*(.7+Math.random()*.5)); M.compose(p,q,sc); U.belt.setMatrixAt(i,M); }
  U.belt.frustumCulled=false; U.belt.visible=false; U.scene.add(U.belt);
}
/* system boundary curtain */
U.fenceU={uPA:{value:0},uNear:{value:0},uOp:{value:0}};
U.fence=pts(cloud(Math.floor(3200*Q+800),(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*RB;o[1]=gauss()*.55;o[2]=Math.sin(a)*RB;}),PM({size:.06,color:'#c9b6ff',uniforms:U.fenceU,decl:'uniform float uPA,uNear;',
  body:`float a=atan(p.z,p.x); float da=abs(mod(a-uPA+3.1416,6.2832)-3.1416); float hex=step(.82,fract((a*24.)+floor(p.y*3.)*.5)); b=uOp*(.05+.04*sin(uTime+a*9.)+uNear*(.6+.9*hex)*exp(-da*da*18.));`}));
U.scene.add(U.fence);

/* probe */
U.probe=new T.Group();
{ const hull=new T.Mesh(new T.ConeGeometry(.12,.44,16),FM('#f2f0f7',{core:.14,int:1.7})); hull.rotation.x=-Math.PI/2; U.probe.add(hull);
  const fin=new T.Mesh(new T.BoxGeometry(.36,.015,.1),FM('#c9b6ff',{int:1.5})); fin.position.z=.14; U.probe.add(fin);
  U.engU={uThr:{value:0}};
  const eng=pts(cloud(40,(i,r,o)=>{o[0]=gauss()*.02;o[1]=gauss()*.02;o[2]=.24+r[0]*.05;}),PM({size:.12,color:'#d9ccff',uniforms:U.engU,decl:'uniform float uThr;',body:'b=.4+uThr*1.6; sz=1.+uThr;'}));
  U.probe.add(eng); }
U.probe.visible=false; U.scene.add(U.probe);
U.exhaust=Burst(U.scene,Math.floor(500*Q+120),'#bfb0ff',.08);
const TRL=170; U.trailPos=new Float32Array(TRL*3); U.trailCol=new Float32Array(TRL*3);
U.trailG=new T.BufferGeometry(); U.trailG.setAttribute('position',new T.BufferAttribute(U.trailPos,3)); U.trailG.setAttribute('color',new T.BufferAttribute(U.trailCol,3));
U.trail=new T.Line(U.trailG,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false})); U.trail.frustumCulled=false; U.trail.visible=false; U.scene.add(U.trail);
U.dustU={uC:{value:new T.Vector3()}};
U.dust=pts(cloud(Math.floor(2200*Q),(i,r,o)=>{o[0]=(r[0]-.5)*50;o[1]=(r[1]-.5)*18;o[2]=(r[2]-.5)*50;}),PM({size:.045,color:'#b9b2d8',uniforms:U.dustU,decl:'uniform vec3 uC;',body:`p=uC+mod(position-uC+vec3(25.,9.,25.),vec3(50.,18.,50.))-vec3(25.,9.,25.); b=.3;`}));
U.dust.visible=false; U.scene.add(U.dust);
/* autopilot path */
{ const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3)); g.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  U.apLine=new T.Line(g,dashMat('#f2f0f7','float a=.5*step(.5,fract(vAng*uR-uTime*2.));')); U.apLine.frustumCulled=false; U.apLine.visible=false; U.scene.add(U.apLine); }
/* peers */
const MAXP=24; U.peerPos=new Float32Array(MAXP*3).fill(9999);
U.peerG=new T.BufferGeometry(); U.peerG.setAttribute('position',new T.BufferAttribute(U.peerPos,3)); U.peerG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXP*4).fill(.7),4)); U.peerG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
U.peers=pts(U.peerG,PM({size:.2,color:'#c9b6ff',body:'b=1.1+.5*sin(uTime*4.);'})); U.scene.add(U.peers);
/* visitor signals orbiting the beacon */
U.sigU={uCount:{value:0},uBe:{value:new T.Vector3()}};
U.sig=pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.12,color:'#ffffff',uniforms:U.sigU,decl:'uniform float uCount; uniform vec3 uBe;',body:`
  float i=position.x; b=step(i,uCount-.5)*.9; float a=uTime*(.2+aR.x*.3)+aR.y*6.28; float rr=2.6+aR.z*1.4; p=uBe+vec3(cos(a)*rr,(aR.w-.5)*1.4,sin(a)*rr);`}));
U.scene.add(U.sig);

function updateStations(t){
  STA.forEach(s=>{ s.a=s.ph+t*s.w; s.pos.set(Math.cos(s.a)*s.R,Math.sin(t*.3+s.ph)*.3,Math.sin(s.a)*s.R); s.vel.set(-Math.sin(s.a)*s.R*s.w,0,Math.cos(s.a)*s.R*s.w);
    s.grp.position.copy(s.pos); s.orbit.material.uniforms.uAng.value=s.a; U.gridU.uSt.value[s.idx].copy(s.pos);
    if(s.spin) s.spin.rotation.y=t*.9;
    if(s.orbs) s.orbs.forEach((m,k)=>{const a=t*.8+k*TAU/3; m.position.set(Math.cos(a)*.7,Math.sin(t*1.2+k)*.2,Math.sin(a)*.7);}); });
  U.sigU.uBe.value.copy(STA[4].pos);
}
function universeVisible(k){ // fade the map furniture in (0..1)
  STA.forEach(s=>{ s.grp.visible=k>.01; s.orbit.material.uniforms.uOp.value=k; s.zone.material.uniforms.uOp.value=k; s.tether.material.uniforms.uOp.value=k; });
  U.gridU.uOp.value=k; U.fenceU.uOp.value=k; U.belt.visible=k>.05;
}

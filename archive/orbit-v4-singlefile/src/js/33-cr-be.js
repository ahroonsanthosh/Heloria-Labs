/* ================= CREW ================= */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,1,6)});
const sc=st.scene, tags=$$('#tags .tag'), people=[];
let focus=-1, on=0;
const vert=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const frag=`uniform sampler2D tP; uniform float uOn,uF,uTime,uSeed,uCells; uniform vec2 uM; uniform vec3 uInk; varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uSeed)*43758.5453);}
  void main(){
    vec2 g=vec2(uCells,uCells*1.3); vec2 id=floor(vUv*g); vec2 cu=(id+.5)/g; vec2 f=fract(vUv*g)-.5;
    vec4 cs=texture2D(tP,cu); float l=dot(cs.rgb,vec3(.3,.59,.11));
    float lit=step(h(id),uOn*1.15-.1);                                   // dots power on in a scattered order
    float md=length((cu-uM)*vec2(1.,1.3)); float grow=smoothstep(.22,0.,md)*.18;
    float r=(.12+.42*pow(l,.8)+grow)*cs.a*lit;
    float dot_=smoothstep(r,r-.08,length(f));
    vec3 dotc=uInk*(.35+.9*l);
    vec4 ph=texture2D(tP,vUv); vec3 photo=mix(vec3(dot(ph.rgb,vec3(.3,.59,.11))),ph.rgb,.78)*vec3(1.04,.99,.92);
    vec3 c=mix(dotc*dot_,photo,uF*ph.a); float a=mix(dot_*cs.a,ph.a,uF);
    gl_FragColor=vec4(c*a,a); }`;
st.build=async function(){
  const loader=new T.TextureLoader();
  const texs=await Promise.all(PHOTOS.map(src=>new Promise(res=>loader.load(src,t=>{ t.colorSpace=T.SRGBColorSpace; t.minFilter=T.LinearFilter; t.generateMipmaps=false; res(t); },undefined,()=>res(null)))));
  texs.forEach((tx,k)=>{ const u={tP:{value:tx},uOn:{value:0},uF:{value:0},uTime:G.uTime,uSeed:{value:k*7.3},uCells:{value:58},uM:{value:new T.Vector2(9,9)},uInk:{value:new T.Color('#FFB27A')}};
    const m=new T.Mesh(new T.PlaneGeometry(2.6,2.6/.769),new T.ShaderMaterial({uniforms:u,vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:false,premultipliedAlpha:true,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor}));
    sc.add(m); people.push({m,u,f:0}); });
  // a warm floor of light beneath them
  sc.add(pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{o[0]=(r[0]-.5)*22;o[1]=-2.3;o[2]=(r[1]-.5)*8-1;}),PM({size:.04,color:'#FF9B3D',body:'b=.1*smoothstep(11.,2.,abs(p.x))*(.6+.4*sin(uTime+p.x*2.));'})));
  layout();
};
function layout(){ const nar=NARROW(); people.forEach((p,k)=>{ if(nar){ p.m.position.set(-.9,(1-k)*3.75,-k*.05); p.m.scale.setScalar(.95); } else { p.m.position.set((k-1)*3.1,-.3,[-.4,0,-.25][k]); p.m.scale.setScalar(.92); } }); }
window.__crLayout=layout;
st.enter=function(){ on=0; people.forEach(p=>{ p.u.uOn.value=0; p.u.uF.value=0; }); layout(); st.setState('menu'); };
const ray=new T.Raycaster();
st.onPointer=function(e){ if(focus>=0) tags[focus].click(); };
st.update=function(dt,t){
  const nar=NARROW(); on=Math.min(1,on+(S.rdt||dt)/1.6);
  focus=-1; if(mouse.on){ ray.setFromCamera(G.uMouse.value,stCam); const hit=ray.intersectObjects(people.map(p=>p.m))[0]; if(hit){ focus=people.findIndex(p=>p.m===hit.object); people[focus].u.uM.value.copy(hit.uv); } }
  people.forEach((p,k)=>{ p.u.uOn.value=clamp(on*1.4-k*.15,0,1); p.f=damp(p.f,focus===k?1:0,5,dt); p.u.uF.value=p.f; if(focus!==k) p.u.uM.value.set(9,9); p.m.rotation.y=(mouse.on?G.uMouse.value.x:0)*.08; });
  if(focus>=0&&focus!==st._lf){ A.tick(); } st._lf=focus;
  st.camP.set(nar?.6:(mouse.on?G.uMouse.value.x*.6:0),nar?0:(mouse.on?G.uMouse.value.y*.3:0)+.2,nar?18:10.2); st.camL.set(nar?.6:0,nar?0:-.1,0);
  tags.forEach((el,k)=>{ const p=people[k]; if(!p) return; const v=p.m.position.clone(); if(nar){ v.x+=1.55; v.y+=.2; } else v.y-=2.6/.769/2*.92+.15;
    const q=proj(v,stCam); el.style.transform=nar?`translate(${q.x}px,${q.y}px) translate(0,-50%)`:`translate(${q.x}px,${q.y}px) translate(-50%,0)`; el.style.justifyItems=nar?'start':'center'; el.style.textAlign=nar?'left':'center';
    el.style.opacity=clamp(on*2-k*.3,0,1); el.classList.toggle('f',focus===k); el.classList.toggle('dim',focus>=0&&focus!==k); });
};
})();

/* ================= BEACON ================= */
(()=>{
const st=mkStation('be',{arrive:new T.Vector3(1.5,2,7)});
const sc=st.scene; let u;
st.build=function(){
  u={uM3:{value:new T.Vector3()},uPulse:{value:0},uFire:{value:0},uCount:{value:0}};
  sc.add(pts(cloud(Math.floor(24000*Q+5000),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),rr=3+Math.cbrt(r[2])*7;o[0]=Math.sin(b)*Math.cos(a)*rr*1.5+3;o[1]=Math.cos(b)*rr*.8;o[2]=Math.sin(b)*Math.sin(a)*rr*.7-2;}),
    PM({size:.03,color:'#FF8100',uniforms:u,decl:'uniform vec3 uM3; uniform float uPulse,uFire;',body:`
      p+=vec3(sin(uTime*.31+p.y*.5+aR.x*6.),cos(uTime*.27+p.x*.4+aR.y*6.),sin(uTime*.22+p.z*.6+aR.z*6.))*.7;
      vec3 d=uM3-p; float l=length(d)+.001; float pull=exp(-l*.2);
      vec3 tg=normalize(cross(d,vec3(0.,0.,1.))+.0001); p+=d*pull*.82+tg*pull*2.2*(.6+aR.z);
      vec3 bc=vec3(4.,0.,-1.); float rb=length(p.xz-bc.xz); p+=normalize(vec3(p.x-bc.x,0.,p.z-bc.z)+.001)*uPulse*.8*exp(-rb*.3);
      b=.26+pull*1.2+uFire*.6*exp(-rb*.4); col=mix(uCol,vec3(1.,.86,.66),pull*.5);`})));
  const tw=new T.Mesh(new T.CylinderGeometry(.05,.2,4.4,16),LM('#FF8100',{emit:.15,rim:1.2,key:'#FFD9B0'})); tw.position.set(4,-3.6,-1); sc.add(tw);
  sc.add(pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{o[0]=gauss()*.05;o[2]=gauss()*.05;o[1]=r[0];}),PM({size:.06,color:'#FFD9B0',uniforms:u,decl:'uniform float uFire,uPulse;',
    body:'float t=fract(position.y-uTime*(.3+uFire*1.6)); p=vec3(position.x*(1.+uFire*3.)+4.,-1.4+t*(16.+uFire*20.),position.z-1.); b=(.25+.8*(1.-t))*(1.+uFire*2.+uPulse);'})));
  sc.add(pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.14,color:'#FFFFFF',uniforms:u,decl:'uniform float uCount;',body:`
    float i=position.x; b=step(i,uCount-.5)*1.1; float a=uTime*(.15+aR.x*.25)+aR.y*6.28; float rr=1.4+aR.z*2.2; p=vec3(4.+cos(a)*rr,-.4+(aR.w-.5)*3.,-1.+sin(a)*rr);`})));
};
st.enter=function(){ st.setState('menu'); };
st.setCount=n=>{ if(u) u.uCount.value=n; };
st.pulse=()=>{ if(u) u.uPulse.value=1; };
st.fire=()=>{ if(u) u.uFire.value=1; };
const ray=new T.Raycaster(), plane=new T.Plane(new T.Vector3(0,0,1),0), hit=new T.Vector3();
const wc=$('#sgWave'), wx=wc.getContext('2d');
st.update=function(dt,t){
  if(mouse.on){ ray.setFromCamera(G.uMouse.value,stCam); if(ray.ray.intersectPlane(plane,hit)) u.uM3.value.lerp(hit,.12); } else u.uM3.value.lerp(new T.Vector3(3+Math.sin(t*.5)*4,Math.cos(t*.37)*2.4,0),.05);
  u.uPulse.value=damp(u.uPulse.value,0,4,dt); u.uFire.value=damp(u.uFire.value,0,.8,dt);
  const nar=NARROW(); st.camP.set(nar?3:1.6,nar?1:.3,nar?18:13.5); st.camL.set(nar?3:1.1,nar?2:.4,0);
  const w=wc.width,h=wc.height; wx.clearRect(0,0,w,h); wx.strokeStyle='rgba(255,129,0,.9)'; wx.lineWidth=2; wx.beginPath();
  const amp=u.uPulse.value*.8+.06+u.uFire.value;
  for(let x=0;x<=w;x+=4){ const k=x/w; const y=h/2+Math.sin(k*40+t*8)*Math.sin(k*7-t*2)*h*.42*amp*Math.sin(k*Math.PI); x?wx.lineTo(x,y):wx.moveTo(x,y); } wx.stroke();
};
$('#sgName').addEventListener('input',()=>{ st.pulse(); A.key(); });
$('#sgLink').addEventListener('input',()=>{ st.pulse(); A.key(); });
})();

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

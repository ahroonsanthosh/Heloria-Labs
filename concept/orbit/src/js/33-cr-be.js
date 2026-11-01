/* ================= CREW ================= */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,2,8)});
const sc=st.scene, N=Math.floor(42000*Q+6000), tags=$$('#tags .tag');
let g,m,u,anchors=[],offs=[],data=null,focus=-1;
function layout(){
  const nar=NARROW(), W=nar?2.3:3.25, H=W*1.333;
  offs=nar?[[0,H+.45],[0,0],[0,-(H+.45)]]:[[-(W+1.1),.2],[0,-.35],[W+1.1,.05]];
  anchors=offs.map(o=>new T.Vector3(o[0],o[1]-H*.5-.25,0)); st.W=W; st.H=H;
  if(!data) return; const S3=g.attributes.aS.array, L=g.attributes.aL.array, K=g.attributes.aK.array;
  for(let i=0;i<N;i++){ const k=i%3, im=data[k]; let px,py,l,tr=0; do{ px=Math.random();py=Math.random(); l=im.d[Math.floor(py*im.h)*im.w+Math.floor(px*im.w)]; tr++; }while(Math.random()>l&&tr<30);
    S3[i*3]=offs[k][0]+(px-.5)*W; S3[i*3+1]=offs[k][1]-(py-.5)*H; S3[i*3+2]=l*.7-.2; L[i]=l; K[i]=k; }
  g.attributes.aS.needsUpdate=true; g.attributes.aL.needsUpdate=true; g.attributes.aK.needsUpdate=true;
}
st.build=async function(){
  u={uAs:{value:0},uF:{value:-1}};
  g=cloud(N,(i,r,o,ex)=>{o[0]=(r[0]-.5)*30;o[1]=(r[1]-.5)*20;o[2]=(r[2]-.5)*20; ex.aL[i]=.2; ex.aK[i]=i%3;},{aL:1,aS:3,aK:1});
  m=PM({size:Q<1?.05:.034,color:'#dcd6ff',mouse:1,uniforms:u,decl:'uniform float uAs,uF; attribute float aL,aK; attribute vec3 aS;',body:`
    float k=smoothstep(aR.y*.5,.5+aR.y*.5,uAs); p=mix(position,aS+vec3(0.,0.,sin(uTime*1.3+aR.x*20.)*.03),k);
    p+=(1.-k)*vec3(sin(uTime*.4+aR.x*9.),cos(uTime*.3+aR.y*9.),0.)*.6;
    float isF=1.-step(.5,abs(aK-uF)); float fv=uF<0.?1.:mix(.4,1.35,isF);
    b=mix(.22,.14+aL*1.25,k)*fv; col=mix(uCol,vec3(1.,.97,1.),isF*step(0.,uF)*.3);`});
  sc.add(pts(g,m));
  const ims=await Promise.all(PHOTOS.map(src=>new Promise(res=>{const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=src;})));
  if(!ims.some(x=>!x)){
    data=ims.map(im=>{ const w=96,h=128,c=document.createElement('canvas'); c.width=w;c.height=h; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(im,0,0,w,h);
      const px=x.getImageData(0,0,w,h).data, d=new Float32Array(w*h);
      for(let j=0;j<w*h;j++){ const Lm=(px[j*4]*.299+px[j*4+1]*.587+px[j*4+2]*.114)/255; const cx=(j%w)/w-.5, cy=Math.floor(j/w)/h-.42; d[j]=Math.pow(Lm,1.35)*Math.exp(-(cx*cx/.11+cy*cy/.2)*1.6); }
      let mx=0; for(const v of d) mx=Math.max(mx,v); for(let j=0;j<d.length;j++) d[j]/=mx; return {w,h,d}; });
  }
  layout();
};
window.__crLayout=()=>{ if(g) layout(); };
st.enter=function(){ u.uAs.value=0; st.setState('menu'); };
st.onPointer=function(e){ if(focus>=0&&e.pointerType==='mouse') tags[focus].click(); };
const V=new T.Vector3();
st.update=function(dt,t){
  u.uAs.value=Math.min(1,u.uAs.value+S.rdt/(RM?.3:2.4)); m.uniforms.uMouseOn.value=mouse.on?.65:0;
  const nar=NARROW();
  // focus = portrait nearest the pointer
  focus=-1; if(mouse.on&&u.uAs.value>.8){ let bd=1e9; anchors.forEach((a,k)=>{ V.set(a.x,a.y+st.H*.5,0).project(stCam); const sx=(V.x*.5+.5)*innerWidth, sy=(-V.y*.5+.5)*innerHeight; const dd=Math.hypot(sx-mouse.x,(sy-mouse.y)*.6); if(dd<bd){bd=dd;focus=k;} }); if(bd>innerWidth*.16) focus=-1; }
  u.uF.value=damp(u.uF.value<0&&focus>=0?focus:u.uF.value,focus,20,dt); if(focus<0) u.uF.value=-1; else u.uF.value=focus;
  st.camP.set(nar?0:-2.1+(mouse.on?G.uMouse.value.x*.6:0),nar?-.4:-.1,nar?16.5:13.8); st.camL.set(nar?0:-2.1,nar?-.4:-.25,0);
  tags.forEach((el,k)=>{ const a=anchors[k]; if(!a) return; V.copy(a).project(stCam); el.style.transform=`translate(${(V.x*.5+.5)*innerWidth}px,${(-V.y*.5+.5)*innerHeight}px) translate(-50%,0)`;
    el.style.opacity=u.uAs.value; el.classList.toggle('f',focus===k); el.classList.toggle('dim',focus>=0&&focus!==k); });
  cursorAim(false);
};
})();

/* ================= BEACON ================= */
(()=>{
const st=mkStation('be',{arrive:new T.Vector3(2,3,9)});
const sc=st.scene; let u,wave=[],sigN=0;
st.build=function(){
  u={uM3:{value:new T.Vector3()},uPulse:{value:0},uFire:{value:0},uCount:{value:0}};
  sc.add(pts(cloud(Math.floor(26000*Q+5000),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),rr=3+Math.cbrt(r[2])*7;o[0]=Math.sin(b)*Math.cos(a)*rr*1.5;o[1]=Math.cos(b)*rr*.8;o[2]=Math.sin(b)*Math.sin(a)*rr*.7-2;}),
    PM({size:.032,color:'#c9b6ff',uniforms:u,decl:'uniform vec3 uM3; uniform float uPulse,uFire;',body:`
      p+=vec3(sin(uTime*.31+p.y*.5+aR.x*6.),cos(uTime*.27+p.x*.4+aR.y*6.),sin(uTime*.22+p.z*.6+aR.z*6.))*.7;
      vec3 d=uM3-p; float l=length(d)+.001; float pull=exp(-l*.2);
      vec3 tg=normalize(cross(d,vec3(0.,0.,1.))+.0001); p+=d*pull*.82+tg*pull*2.2*(.6+aR.z);
      vec3 bc=vec3(2.6,0.,-1.); float rb=length(p.xz-bc.xz); p+=normalize(vec3(p.x-bc.x,0.,p.z-bc.z)+.001)*uPulse*.8*exp(-rb*.3);
      b=.32+pull*1.3+uFire*.6*exp(-rb*.4);`})));
  // tower + beam
  const tw=new T.Mesh(new T.CylinderGeometry(.06,.22,4.4,16),FM('#c9b6ff',{int:1.6,core:.08})); tw.position.set(2.6,-3.6,-1); sc.add(tw);
  sc.add(pts(cloud(Math.floor(5000*Q+1000),(i,r,o)=>{o[0]=gauss()*.05;o[2]=gauss()*.05;o[1]=r[0];}),PM({size:.06,color:'#ffffff',uniforms:u,decl:'uniform float uFire,uPulse;',
    body:'float t=fract(position.y-uTime*(.3+uFire*1.6)); p=vec3(position.x*(1.+uFire*3.)+2.6,-1.4+t*(16.+uFire*20.),position.z-1.); b=(.25+.8*(1.-t))*(1.+uFire*2.+uPulse);'})));
  // signals from other visitors orbit the tower
  sc.add(pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.14,color:'#ffffff',uniforms:u,decl:'uniform float uCount;',body:`
    float i=position.x; b=step(i,uCount-.5)*1.1; float a=uTime*(.15+aR.x*.25)+aR.y*6.28; float rr=1.4+aR.z*2.2; p=vec3(2.6+cos(a)*rr,-.4+(aR.w-.5)*3.,-1.+sin(a)*rr);`})));
};
st.enter=function(){ st.setState('menu'); };
st.setCount=n=>{ sigN=n; if(u) u.uCount.value=n; };
st.pulse=()=>{ if(u) u.uPulse.value=1; wave.push(1); };
st.fire=()=>{ if(u) u.uFire.value=1; };
const ray=new T.Raycaster(), plane=new T.Plane(new T.Vector3(0,0,1),0), hit=new T.Vector3();
const wc=$('#sgWave'), wx=wc.getContext('2d');
st.update=function(dt,t){
  if(mouse.on){ ray.setFromCamera(G.uMouse.value,stCam); if(ray.ray.intersectPlane(plane,hit)) u.uM3.value.lerp(hit,.12); }
  else u.uM3.value.lerp(new T.Vector3(Math.sin(t*.5)*4,Math.cos(t*.37)*2.4,0),.05);
  u.uPulse.value=damp(u.uPulse.value,0,4,dt); u.uFire.value=damp(u.uFire.value,0,.8,dt);
  const nar=NARROW(); st.camP.set(nar?1.5:0,nar?.5:0,nar?17:14); st.camL.set(nar?1.5:-2.4,nar?1.2:0,0);
  // the transmission waveform reacts to typing
  const w=wc.width,h=wc.height; wx.clearRect(0,0,w,h); wx.strokeStyle='rgba(201,182,255,.9)'; wx.lineWidth=2; wx.beginPath();
  const amp=u.uPulse.value*.8+.08+u.uFire.value;
  for(let x=0;x<=w;x+=4){ const k=x/w; const y=h/2+Math.sin(k*40+t*8)*Math.sin(k*7-t*2)*h*.4*amp*Math.sin(k*Math.PI); x?wx.lineTo(x,y):wx.moveTo(x,y); } wx.stroke();
  cursorAim(false);
};
$('#sgName').addEventListener('input',()=>{ st.pulse(); A.key(); });
$('#sgLink').addEventListener('input',()=>{ st.pulse(); A.key(); });
})();

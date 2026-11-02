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

/* ---------- beacon: mail + signals ---------- */
(()=>{
const EMAIL='contact@helorialabs.com';
$('#mail').addEventListener('click',async()=>{ const out=$('#copied');
  try{ await navigator.clipboard.writeText(EMAIL); out.textContent='Copied to clipboard'; }
  catch(e){ const r=document.createRange(); r.selectNodeContents($('#mail')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); out.textContent='Selected. Press Ctrl+C or ⌘C'; }
  setTimeout(()=>out.textContent='Click the address to copy it',2600); });
$('#sig').addEventListener('submit',async e=>{
  e.preventDefault(); const out=$('#sgOut'); const name=$('#sgName').value.trim().slice(0,40), link=$('#sgLink').value.trim().slice(0,200);
  if(!name||!/^https?:\/\/\S+\.\S+/.test(link)){ out.textContent='Add your name and a full link starting with https://'; A.beep(220); return; }
  ST.be&&ST.be.fire&&ST.be.fire(); A.launch();
  if(!RT.db||!RT.me){ // on the public website the signal goes out by email
    const body=`Name: ${name}\nSomething I built: ${link}\n`;
    location.href=`mailto:${EMAIL}?subject=${encodeURIComponent('Signal from '+name)}&body=${encodeURIComponent(body)}`;
    out.textContent='Your email app should open with the signal ready to send.'; return; }
  $('#sgBtn').disabled=true; out.textContent='Transmitting';
  try{ await RT.db.collection('signals').doc(RT.me).set({name,link,t:Date.now()}); out.textContent='Signal received. It is orbiting the beacon.'; A.chord(); S.flash=Math.max(S.flash,.25); }
  catch(err){ out.textContent='That did not send. Email us instead.'; }
  $('#sgBtn').disabled=false;
});
})();

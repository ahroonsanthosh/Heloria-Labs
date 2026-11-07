/* ================= BEACON =================
   A radio mast drawn in hairlines with a lamp on top. Typing charges the signal: pulses climb the mast, rings leave the
   lamp and the waveform wakes up. Transmit fires the beam. On the public site the signal goes out as a prefilled email;
   inside a claude.ai artifact it is written to a shared database and joins the orbit around the beacon. */
(()=>{
const st=mkStation('be',{arrive:new T.Vector3(1.5,2,7)});
const sc=st.scene, el=st.el, NR=8, LAMP=new T.Vector3(), _m=new T.Vector3(), _h=new T.Vector3(), pl=new T.Plane(new T.Vector3(0,0,1),0), ray=new T.Raycaster();
let E=0, ready=false, deny=0, u, tower, burst, pulses=new T.Vector4(-1,-1,-1,-1), pi=0, ri=0, idleT=0, pct=-1, lvl='';
const lay={D:14,wpp:.01,x:3.6,y:-4,h:6,nar:false};

/* ---------- the mast: a triangular lattice, X-braced, guyed, with a spire ---------- */
function mastGeo(){
  const P=[], Yv=[], K=[], seg=18, rb=.1, rt=.02, top=.9;
  const cn=(y,i)=>{ const r=lerp(rb,rt,Math.pow(y/top,.75)), a=i/3*TAU+Math.PI/2; return [Math.cos(a)*r,y,Math.sin(a)*r]; };
  const Ln=(a,b,k)=>{ P.push(a[0],a[1],a[2],b[0],b[1],b[2]); Yv.push(a[1],b[1]); K.push(k,k); };
  for(let s=0;s<seg;s++){ const y0=s/seg*top, y1=(s+1)/seg*top;
    for(let i=0;i<3;i++){ const a0=cn(y0,i), a1=cn(y1,i), b0=cn(y0,(i+1)%3), b1=cn(y1,(i+1)%3); Ln(a0,a1,1); Ln(a0,b0,.8); Ln(a0,b1,.55); Ln(b0,a1,.55); } }
  for(let i=0;i<3;i++) Ln(cn(top,i),cn(top,(i+1)%3),1);
  Ln([0,top,0],[0,1,0],1);
  for(const y of [.62,.78]) for(let i=0;i<3;i++){ const c=cn(y,i); Ln(c,[c[0]*2.6,y,c[2]*2.6],.7); }
  for(const h of [.3,.56,.8]) for(let i=0;i<3;i++){ const a=i/3*TAU+Math.PI/2+.25, R=h*.3+.09; Ln(cn(h,i),[Math.cos(a)*R,0,Math.sin(a)*R],.22); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aY',new T.Float32BufferAttribute(Yv,1)); g.setAttribute('aK',new T.Float32BufferAttribute(K,1));
  g.boundingSphere=new T.Sphere(new T.Vector3(0,.5,0),2); return g;
}
st.build=function(){
  u={uM3:{value:new T.Vector3(0,0,0)},uE:{value:0},uFire:{value:0},uFireT:{value:-99},uCount:{value:RT.signals||0},uLamp:{value:LAMP},uH:{value:6},uPulse:{value:pulses},
    uRg:{value:[...Array(NR)].map(()=>new T.Vector4(-99,0,0,1))}};
  // a slow warm field of particles around the mast, drawn toward the pointer
  sc.add(pts(cloud(Math.floor(9000*Q+2600),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),rr=.15+Math.cbrt(r[2])*.85;o[0]=Math.sin(b)*Math.cos(a)*rr*1.6;o[1]=Math.cos(b)*rr*1.1;o[2]=Math.sin(b)*Math.sin(a)*rr*.7;}),
    PM({size:.03,color:'#FF8100',uniforms:u,decl:'uniform vec3 uM3,uLamp; uniform float uE,uFire,uH;',body:`
      p=uLamp+vec3(position.x,position.y-.15,position.z)*uH*1.15;
      p+=vec3(sin(uTime*.31+p.y*.5+aR.x*6.),cos(uTime*.27+p.x*.4+aR.y*6.),sin(uTime*.22+p.z*.6+aR.z*6.))*.35*uH/6.;
      vec3 d=uM3-p; float l=length(d)+.001, pull=exp(-l*.35); vec3 tg=normalize(cross(d,vec3(0.,0.,1.))+.0001); p+=d*pull*.6+tg*pull*1.2*(.6+aR.z);
      float rl=length(p-uLamp); p+=normalize(p-uLamp+.001)*uFire*1.4*exp(-rl*.25);
      b=(.1+.12*uE+pull*.9+uFire*.5*exp(-rl*.3))*smoothstep(uH*1.4,uH*.2,rl); col=mix(uCol,vec3(1.,.82,.6),pull*.5+uFire*.3);`})));
  // the mast
  tower=new T.LineSegments(mastGeo(),new T.ShaderMaterial({uniforms:{uTime:G.uTime,uE:u.uE,uFire:u.uFire,uPulse:u.uPulse,uC:{value:new T.Color('#FF9A3A')},uOp:{value:1}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute float aY,aK; uniform float uTime,uE,uFire; uniform vec4 uPulse; varying float vB;
      float pk(float c,float y){ return c<0.?0.:exp(-(((y-c)*11.)*((y-c)*11.))); }
      void main(){ float y=aY; float b=.2+.26*y+.14*exp(-(((y-fract(uTime*.2))*7.)*((y-fract(uTime*.2))*7.)));
        b+=(pk(uPulse.x,y)+pk(uPulse.y,y)+pk(uPulse.z,y)+pk(uPulse.w,y))*1.3;
        b=b*(.75+.6*uE)+uFire*(.6+1.6*exp(-(((y-fract(uTime*1.6))*5.)*((y-fract(uTime*1.6))*5.))));
        vB=b*aK*smoothstep(-.02,.08,y); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uC; uniform float uOp; varying float vB; void main(){ gl_FragColor=vec4(uC*vB*uOp,1.); }`}));
  tower.frustumCulled=false; sc.add(tower);
  // the lamp
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0],3)); lg.setAttribute('aR',new T.Float32BufferAttribute([0,.5,.5,0, 1,.5,.5,0],4));
  sc.add(pts(lg,PM({size:.5,color:'#FF8100',uniforms:u,decl:'uniform vec3 uLamp; uniform float uE,uFire,uH;',body:`p=uLamp; float bl=.55+.45*((.5+.5*sin(uTime*2.2))*(.5+.5*sin(uTime*2.2))*(.5+.5*sin(uTime*2.2)));
    if(aR.x<.5){ sz=.42*uH/6.; b=(.9+bl*.9+uE*1.4+uFire*3.)*.9; col=vec3(1.,.93,.82); } else { sz=(2.2+uE*1.2+uFire*3.)*uH/6.; b=.12+.18*bl+.25*uE+.7*uFire; }`})));
  // radio rings leaving the lamp
  sc.add(pts(cloud(NR*180,(i,r,o,ex)=>{ o[0]=o[1]=o[2]=0; ex.aRg[i]=Math.floor(i/180); },{aRg:1}),PM({size:.05,color:'#FFB066',uniforms:u,decl:'attribute float aRg; uniform vec3 uLamp; uniform float uH; uniform vec4 uRg[8];',body:`
    vec4 R=uRg[int(aRg)]; float age=uTime-R.x, k=age/R.w;
    if(k<0.||k>1.){ b=0.; p=uLamp+vec3(0.,-999.,0.); }
    else { float a=aR.x*6.2832, rad=R.z*age*uH/6.; p=uLamp+vec3(cos(a)*rad,sin(a)*rad,(aR.y-.5)*.12*rad); b=R.y*pow(1.-k,1.7)*(.45+.55*aR.z)*smoothstep(0.,.06,k)*(.55+.45*smoothstep(-.2,.6,sin(a))); sz=.8+R.y*.4; }`})));
  // the beam: light climbing from the lamp into the sky, faster and wider when charged or fired
  sc.add(pts(cloud(Math.floor(4200*Q+900),(i,r,o)=>{o[0]=gauss()*.05;o[2]=gauss()*.05;o[1]=r[0];}),PM({size:.05,color:'#FFD9B0',uniforms:u,decl:'uniform vec3 uLamp; uniform float uE,uFire,uFireT,uH;',
    body:`float sp=.12+uE*.25+uFire*1.4, t=fract(position.y-uTime*sp); float w=1.+uE*.8+uFire*3.;
      p=uLamp+vec3(position.x*w*uH/6.,t*uH*(1.8+uFire*1.2),position.z*w*uH/6.);
      float pk=exp(-(((t-(uTime-uFireT)*.9))*((t-(uTime-uFireT)*.9)))*260.)*step(0.,uTime-uFireT)*step(uTime-uFireT,1.4);
      b=(.16+.5*uE+1.4*uFire+3.*pk)*(1.-t)*smoothstep(0.,.05,t); sz=1.+pk*1.5;`})));
  // signals already received, orbiting the lamp
  sc.add(pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.12,color:'#FFFFFF',uniforms:u,decl:'uniform float uCount,uH; uniform vec3 uLamp;',body:`
    float i=position.x; b=step(i,uCount-.5)*1.1; float a=uTime*(.15+aR.x*.25)+aR.y*6.28, rr=(.25+aR.z*.45)*uH; p=uLamp+vec3(cos(a)*rr,(aR.w-.5)*uH*.35,sin(a)*rr*.6);`})));
  // a horizon of embers at the foot of the mast
  sc.add(pts(cloud(Math.floor(1600*Q+500),(i,r,o)=>{o[0]=(r[0]-.5)*2;o[1]=gauss()*.006;o[2]=(r[1]-.5);}),PM({size:.035,color:'#FF8100',uniforms:u,decl:'uniform vec3 uLamp; uniform float uH,uE;',
    body:`p=vec3(uLamp.x+position.x*uH*4.,uLamp.y-uH+position.y*uH,position.z*uH*.6); b=(.1+.08*uE)*smoothstep(1.,.05,abs(position.x))*(.6+.4*sin(uTime+aR.x*30.));`})));
  burst=Burst(sc,Math.floor(320*Q+80),'#FFB066',.06);
  layout();
};

/* ---------- placement: to the right of the form on wide screens, beside the title on phones ---------- */
function layout(){
  const W=innerWidth, H=innerHeight, nar=NARROW(), D=nar?15:14, wpp=2*D*Math.tan(18*Math.PI/180)/H; let sx, by, ty;
  if(!nar){ const c=$('.card',el).getBoundingClientRect(), left=Math.max((c.right||W*.5)+40,W*.5); sx=(left+W)/2; ty=H*.25; by=H*.98; }
  else { const hb=$('.card h2',el).getBoundingClientRect(); sx=W*.79; by=hb.bottom>0?hb.bottom+4:H*.33; ty=Math.max(92,by-H*.21); }
  lay.nar=nar; lay.D=D; lay.wpp=wpp; lay.x=(sx-W/2)*wpp; lay.y=-(by-H/2)*wpp; lay.h=(by-ty)*wpp;
  if(tower){ tower.position.set(lay.x,lay.y,0); tower.scale.setScalar(lay.h); }
  LAMP.set(lay.x,lay.y+lay.h,0); if(u) u.uH.value=lay.h;
  const wc=$('#sgWave'), r=wc.getBoundingClientRect(), d=Math.min(2,devicePixelRatio||1); if(r.width){ const w=Math.round(r.width*d), h=Math.round(r.height*d); if(wc.width!==w||wc.height!==h){ wc.width=w; wc.height=h; } }
}
addEventListener('resize',()=>{ if(S.st===st) layout(); });

/* ---------- signal state ---------- */
function ring(s,v,life){ if(!u) return; u.uRg.value[ri].set(G.uTime.value,s,v,life); ri=(ri+1)%NR; }
const XYZW=['x','y','z','w'];
function pulse(){ pulses[XYZW[pi]]=0; pi=(pi+1)%4; }
const nameEl=$('#sgName'), linkEl=$('#sgLink'), lvlEl=$('#sgLvl'), pctEl=$('#sgPct'), btn=$('#sgBtn'), wc=$('#sgWave'), wx=wc.getContext('2d');
const okLink=v=>/^https?:\/\/\S+\.\S+/.test(v)||/^[^\s/:]+\.[^\s]{2,}/.test(v);
function check(){ const n=!!nameEl.value.trim(), l=okLink(linkEl.value.trim()); ready=n&&l;
  const t=ready?'Ready to transmit':!n&&!linkEl.value.trim()?'Type to charge the signal':!n?'Add your name':'Add a link to something you built';
  if(t!==lvl){ lvl=t; lvlEl.textContent=t; lvlEl.classList.toggle('acc',ready); btn.classList.toggle('armed',ready); } }
const outEl=$('#sgOut');
[nameEl,linkEl].forEach(f=>f.addEventListener('input',()=>{ E=Math.min(1,E+.11); pulse(); ring(.45+E*.6,.9,1.7); A.key(); f.closest('label').classList.remove('err'); if(outEl.classList.contains('bad')){ outEl.textContent=''; outEl.classList.remove('bad'); } check(); }));
st.setCount=n=>{ if(u) u.uCount.value=n; };
st.pulse=()=>{ E=Math.min(1,E+.1); pulse(); };
st.fire=()=>st.transmit();
st.transmit=()=>{ if(!u) return; E=1; u.uFire.value=1; u.uFireT.value=G.uTime.value; ring(1.8,1.6,2.2); setTimeout(()=>ring(1.3,1.25,2.3),150); setTimeout(()=>ring(.9,.95,2.5),320);
  burst.emit(LAMP,Math.floor(120*Q+40),2.2*lay.h/6,null,1.4*lay.h/6,1.5); S.flash=Math.max(S.flash,.2); feedback(.18,.6);
  A.launch(); A.whoosh(true,1.6,.2); A.stinger(3); setTimeout(()=>A.chord(),450);
  btn.classList.remove('tx'); void btn.offsetWidth; btn.classList.add('tx'); clearTimeout(btn._t); btn._t=setTimeout(()=>btn.classList.remove('tx'),1600); };
st.deny=()=>{ deny=1; btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); };
st.start=()=>{ (nameEl.value.trim()?linkEl:nameEl).focus({preventScroll:true}); };
st.enter=function(){ st.setState('menu'); layout(); check(); $('#copied').textContent=FINE?'Click the address to copy it':'Tap the address to copy it'; };

/* ---------- per frame ---------- */
st.update=function(dt,t){
  if(!u) return;
  if(mouse.on&&FINE){ ray.setFromCamera(G.uMouse.value,stCam); if(ray.ray.intersectPlane(pl,_h)) u.uM3.value.lerp(_h,.12); }
  else u.uM3.value.lerp(_m.set(LAMP.x+Math.sin(t*.5)*lay.h*.5,LAMP.y-lay.h*.4+Math.cos(t*.37)*lay.h*.3,0),.04);
  E=Math.max(ready?.3:0,E-dt*.16); u.uE.value=damp(u.uE.value,E,6,dt); u.uFire.value=damp(u.uFire.value,0,.9,dt); deny=Math.max(0,deny-dt*2);
  for(let i=0;i<4;i++){ const k=XYZW[i]; if(pulses[k]>=0){ pulses[k]+=dt*1.5; if(pulses[k]>1.3) pulses[k]=-1; } }
  idleT-=dt; if(idleT<=0){ idleT=ready?1.1:2.4; ring(ready?.6:.3,.75,2.4); }
  // camera: a slow drift and a little parallax
  const px=(FINE&&mouse.on?mouse.nx*.3:0)+Math.sin(t*.09)*.15, py=(FINE&&mouse.on?mouse.ny*.16:0)+Math.cos(t*.07)*.08;
  st.camP.set(px,py,lay.D); st.camL.set(px*.3,py*.3,0);
  // the waveform under the form
  const w=wc.width, h=wc.height; if(w){ wx.clearRect(0,0,w,h); const amp=(.06+u.uE.value*.7+u.uFire.value*.9+deny*.5)*h*.44, cl=ready?1:0, N=Math.min(240,w>>2);
    for(let pass=0;pass<2;pass++){ wx.lineWidth=pass?Math.max(1.2,h/40):Math.max(4,h/9); wx.strokeStyle=deny>.05?`rgba(255,86,54,${pass?.95:.18})`:pass?'rgba(255,150,60,.95)':'rgba(255,129,0,.16)'; wx.beginPath();
      for(let i=0;i<=N;i++){ const k=i/N, env=Math.sin(k*Math.PI), y=h/2+((Math.sin(k*46+t*7)*.75)*cl+(Math.sin(k*37+t*9)*Math.sin(k*11-t*3)+Math.sin(k*93+t*17)*.3)*(1-cl*.75))*amp*env;
        i?wx.lineTo(k*w,y):wx.moveTo(0,y); } wx.stroke(); } }
  const pc=Math.round(Math.min(1,u.uE.value+u.uFire.value)*100); if(pc!==pct){ pct=pc; pctEl.textContent=String(pc).padStart(3,'0'); }
  burst.update(dt,.6,1.2);
};
st._dbg={get E(){return E;},get ready(){return ready;},lay,lamp:()=>{ _m.copy(LAMP).project(stCam); return {x:(_m.x*.5+.5)*innerWidth,y:(-_m.y*.5+.5)*innerHeight}; }};
})();

/* ---------- beacon: mail + signals ---------- */
(()=>{
const EMAIL='hello@krios.ie';
$('#mail').addEventListener('click',async()=>{ const out=$('#copied'), m=$('#mail');
  try{ await navigator.clipboard.writeText(EMAIL); out.textContent='Copied to clipboard'; }
  catch(e){ const r=document.createRange(); r.selectNodeContents(m); const s=getSelection(); s.removeAllRanges(); s.addRange(r); out.textContent='Selected. Press Ctrl+C or ⌘C'; }
  A.ping(1568,.035); m.classList.remove('ok'); void m.offsetWidth; m.classList.add('ok'); out.classList.add('acc');
  clearTimeout(m._t); m._t=setTimeout(()=>{ out.textContent=FINE?'Click the address to copy it':'Tap the address to copy it'; out.classList.remove('acc'); m.classList.remove('ok'); },2600); });
$('#sig').addEventListener('submit',async e=>{
  e.preventDefault(); const out=$('#sgOut'), nEl=$('#sgName'), lEl=$('#sgLink');
  let name=nEl.value.trim().slice(0,40), link=lEl.value.trim().slice(0,200);
  if(link&&!/^https?:\/\//i.test(link)&&/^[^\s/:]+\.[^\s]{2,}/.test(link)){ link='https://'+link; lEl.value=link; }
  const badN=!name, badL=!/^https?:\/\/\S+\.\S+/.test(link);
  nEl.closest('label').classList.toggle('err',badN); lEl.closest('label').classList.toggle('err',badL); out.classList.toggle('bad',badN||badL);
  if(badN||badL){ out.textContent=badN&&badL?'Add your name and a link to something you built.':badN?'Add your name.':'Add a full link, starting with https://'; A.beep(220); ST.be&&ST.be.deny&&ST.be.deny(); (badN?nEl:lEl).focus({preventScroll:true}); return; }
  ST.be&&ST.be.fire&&ST.be.fire();
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

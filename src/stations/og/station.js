/* ================= OGIVE: APOGEE =================
   Design on an OpenRocket-style side view: drag the nose and the fins, pick a motor, trim with nose ballast, watch CG and CP.
   Then fly it at night: count down, burn up through the cloud deck, open the chute right at the top, drift down, land.
   Three flights to put the apogee on the target. */
(()=>{
const st=mkStation('og',{arrive:new T.Vector3(-1.5,1.5,7)});
const sc=st.scene, el=st.el, sky0=sc.children[0];
const S6=6, WIND=3.5, Dm=.066, R0=Dm/2, LB=.62;     // design view: S6 units per metre. A 66 mm tube, 620 mm long. Wind blows toward +x
const SCF=.1, FS=.3, PADY=.06, DY=1.7, HP=Math.PI/2; // flight world: SCF units per metre, rocket drawn at FS of its design size. The design view floats DY above the pad
/* F was 40 N·s, which left 225 to 236 m out of reach for any design Ogive calls stable. 42 N·s closes the gap: F, G and H now cover 126 to 462 m */
const MOT={F:{I:42,tb:1.4,mp:.055,mm:.095},G:{I:58,tb:1.7,mp:.09,mm:.15},H:{I:80,tb:2.0,mp:.13,mm:.21}};

/* ---------- physics: Barrowman CP, a thrust curve, drag, wind, weathercocking ---------- */
function geom(dd){ const Ln=dd.LD*Dm, fs=dd.fin; return {Ln,fs,Cr:.09*fs,Ct:.045*fs,s:.075*fs,Xr:.045*fs,L:Ln+LB}; }
function design(dd){ const M=MOT[dd.motor], g=geom(dd);
  const ms=[[.03+.16*g.Ln,.62*g.Ln],[.24,g.Ln+LB/2],[.03*g.fs*g.fs,g.Ln+LB-g.Cr*.55],[.05,g.Ln+.12],[M.mm,g.Ln+LB-.06],[dd.bal,.45*g.Ln]];
  const m=ms.reduce((a,x)=>a+x[0],0), cg=ms.reduce((a,x)=>a+x[0]*x[1],0)/m;
  const Lf=Math.sqrt(g.s*g.s+Math.pow(g.Xr+g.Ct/2-g.Cr/2,2));
  const CNf=(1+R0/(g.s+R0))*(16*Math.pow(g.s/Dm,2))/(1+Math.sqrt(1+Math.pow(2*Lf/(g.Cr+g.Ct),2)));
  const Xb=g.Ln+LB-g.Cr, Xf=Xb+(g.Xr/3)*(g.Cr+2*g.Ct)/(g.Cr+g.Ct)+(1/6)*((g.Cr+g.Ct)-g.Cr*g.Ct/(g.Cr+g.Ct));
  const cp=(2*.466*g.Ln+CNf*Xf)/(2+CNf);
  return {M,g,dry:m-M.mm,mass:m,cg,cp,stab:(cp-cg)/Dm,Cd:.32+.13*(4-dd.LD)/2.5+.16*(g.fs-.6)}; }
function thrustAt(m,t){ const M=MOT[m], avg=M.I/M.tb; if(t<0||t>M.tb) return 0; const x=t/M.tb; if(x<.08) return avg*1.7*x/.08; if(x<.25) return lerp(avg*1.7,avg*.95,(x-.08)/.17); if(x<.88) return avg*.95; return lerp(avg*.95,0,(x-.88)/.12); }
function newF(dd,sign){ const D=design(dd); return {t:0,x:0,h:0,vx:0,vy:0,th:0,om:0,m:D.mass,D,d:{...dd},apo:0,tApo:0,xApo:0,maxV:0,maxA:0,acc:0,tumble:false,chute:false,torn:false,landed:false,lifted:false,sign:sign||1,deployT:-1,deployV:0,auto:false}; }
function stepF(f,h){
  if(f.landed) return;
  const D=f.D, Th=thrustAt(f.d.motor,f.t); f.m=D.mass-D.M.mp*clamp(f.t/D.M.tb,0,1);
  const rvx=f.vx-WIND, rvy=f.vy, rv=Math.hypot(rvx,rvy)||1e-6, v=Math.hypot(f.vx,f.vy);
  if(!f.chute&&f.lifted&&f.h>1.5){ if(D.stab<1){ f.om+=(1-D.stab)*4*h*f.sign; f.th+=f.om*h; if(Math.abs(f.th)>1.3) f.tumble=true; }
    else { const aoa=Math.atan2(rvx,Math.max(rvy,.5)); const k=Math.min(8,D.stab*1.3)*clamp(rv/30,0,1); f.th+=(aoa-f.th)*Math.min(1,k*h); f.th=clamp(f.th,-1.2,1.2); } }
  let Cd=D.Cd, Ar=Math.PI*R0*R0; if(f.tumble) Cd=1.1; if(f.chute){ Cd=1.5; Ar=f.torn?.05:.5; }
  const rho=1.225*Math.exp(-f.h/8500), Fd=.5*rho*Cd*Ar*rv*rv, dir=f.tumble?f.t*9:f.th;
  let ax=(-Fd*rvx/rv+Th*Math.sin(dir))/f.m, ay=(-Fd*rvy/rv+Th*Math.cos(dir))/f.m-9.81;
  if(!f.lifted){ if(ay<=0){ f.t+=h; return; } ax=0; } if(f.h<1.5&&!f.chute) ax=0;
  f.vx+=ax*h; f.vy+=ay*h; f.x+=f.vx*h; f.h+=f.vy*h; f.t+=h; f.acc=Math.hypot(ax,ay+9.81);
  if(f.h>.3) f.lifted=true; f.maxV=Math.max(f.maxV,v); f.maxA=Math.max(f.maxA,f.acc);
  if(f.lifted&&f.apo===0&&f.vy<=0){ f.apo=f.h; f.tApo=f.t; f.xApo=f.x; }
  if(f.lifted&&f.h<=0){ f.h=0; f.landed=true; } }
function simApo(dd,sign){ const f=newF(dd,sign||1); for(let i=0;i<9000;i++){ stepF(f,.01); if(f.apo>0||f.landed) break; } return f; }

/* ---------- state ---------- */
let d={motor:'G',LD:2.5,fin:1,bal:0}, DC=design(d), target=280, hist=[], ai=null;
let phase='design', F=null, NAT=null, busy=false, searchId=0, tw=null, cdT=0, cdN=0, simClock=0, tScale=1, ffMax=1, landT=0, ign=0, done=false;
let vT=0, emitAcc=0, pathAcc=0, pathN=0, chuteK=0, slowOn=false, cineOn=false, ev={}, ladX=-2.3, maxH=0, snap=true, keyT=0;
const V1=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3(), V4=new T.Vector3(), V5=new T.Vector3(), NZ=new T.Vector3(), RC=new T.Vector3();
const CP=new T.Vector3(), CL=new T.Vector3(), CA=new T.Vector3(), CB=new T.Vector3(), CC=new T.Vector3(), CD=new T.Vector3();
const P0={x:0,y:0,z:0}, P1={x:0,y:0,z:0}, P2={x:0,y:0,z:0}, P3={x:0,y:0,z:0}, P4={x:0,y:0,z:0}, P5={x:0,y:0,z:0};
function pj(v,o){ V5.copy(v).project(stCam); o.x=(V5.x*.5+.5)*innerWidth; o.y=(-V5.y*.5+.5)*innerHeight; o.z=V5.z; return o; }
const setT=(e,s)=>{ if(e._t!==s){ e._t=s; e.textContent=s; } };
const PORT=()=>innerHeight>innerWidth*1.05;
function curReset(){ const c=$('#cur'); if(c) c.classList.remove('big'); }
function setPhase(p){ el.classList.remove('ph-'+phase); phase=p; el.classList.add('ph-'+p); }

/* ---------- the rocket: rebuilt from the design whenever the design changes ---------- */
const matB=LM('#FFB475',{emit:.05,rim:1.1,amb:.14,key:'#FFE6CC'}), matF=LM('#FFB475',{emit:.03,rim:.9,amb:.12,key:'#FFE6CC'}), matN=LM('#5a4a3b',{rim:.7,amb:.28,key:'#FFE6CC'});
matN.side=T.DoubleSide;
const RKMAT=[matB,matF,matN]; let rkK=.62;
const wire=new T.LineBasicMaterial({color:0xFFB475,transparent:true,opacity:.32,blending:T.AdditiveBlending,depthWrite:false});
const rocket=new T.Group(), rk=new T.Group(); rocket.rotation.order='ZYX'; rocket.add(rk); sc.add(rocket);
let body=null, edges=null, finG=null, fins=[], Lh=2.35, pivotL=2.3;
function rebuild(){
  const g=DC.g;
  if(body){ rk.remove(body); body.geometry.dispose(); edges.geometry.dispose(); }
  if(finG){ fins.forEach(f=>rk.remove(f)); finG.dispose(); }
  const prof=[], L=g.Ln, rho=(R0*R0+L*L)/(2*R0);
  prof.push(new T.Vector2(0,0),new T.Vector2(R0*S6*.92,0),new T.Vector2(R0*S6,.02*S6),new T.Vector2(R0*S6,LB*S6));
  for(let k=1;k<=28;k++){ const x=L*(1-k/28); const r=Math.sqrt(Math.max(rho*rho-Math.pow(L-x,2),0))+R0-rho; prof.push(new T.Vector2(Math.max(r,0)*S6,(LB+(L-x))*S6)); }
  body=new T.Mesh(new T.LatheGeometry(prof,48),matB); rk.add(body);
  edges=new T.LineSegments(new T.EdgesGeometry(body.geometry,30),wire); body.add(edges);
  const shp=new T.Shape(); shp.moveTo(0,g.Cr*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr)*S6); shp.lineTo(g.s*S6,(g.Cr-g.Xr-g.Ct)*S6); shp.lineTo(0,0); shp.closePath();
  finG=new T.ExtrudeGeometry(shp,{depth:.025,bevelEnabled:false}); finG.translate(R0*S6*.96,0,-.0125);
  fins=[0,1,2,3].map(k=>{ const m=new T.Mesh(finG,matF); m.rotation.y=k*HP+Math.PI; rk.add(m); return m; });
  Lh=g.L*S6/2; pivotL=(g.L-DC.cg)*S6; rk.position.y=-pivotL;
}
{ // fixed parts: nozzle, the joint between nose cone and body tube, the motor flame and its glow
  const nz=new T.Mesh(new T.CylinderGeometry(R0*S6*.46,R0*S6*.6,.16,20,1,true),matN); nz.position.y=-.05; rk.add(nz);
  const seam=new T.Mesh(new T.TorusGeometry(R0*S6*1.004,.007,6,56),matN); seam.rotation.x=HP; seam.position.y=LB*S6; rk.add(seam);
}
const flameU={uI:{value:0},uLen:{value:4},uTime:G.uTime};
const fp=[]; for(let k=0;k<=24;k++){ const u=k/24; fp.push(new T.Vector2(R0*S6*.5*(1+1.5*u)*Math.pow(1-u,.7)+.002,-u)); }
const flame=new T.Mesh(new T.LatheGeometry(fp,20),new T.ShaderMaterial({uniforms:flameU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`uniform float uI,uLen,uTime; varying float vU; varying vec3 vN,vV;
    void main(){ vec3 p=position; vU=-p.y; float fl=1.+.2*sin(uTime*47.+vU*19.)+.13*sin(uTime*31.-vU*11.); p.xz*=fl*(.55+.45*uI); p.y*=uLen*(.92+.08*sin(uTime*23.));
      vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform float uI; varying float vU; varying vec3 vN,vV;
    void main(){ float c=pow(abs(dot(normalize(vN),normalize(vV))),1.3); vec3 col=mix(vec3(1.,.95,.86),vec3(1.,.48,.16),smoothstep(0.,.55,vU));
      float a=(1.-smoothstep(.05,1.,vU))*(.42+.58*c)*uI; gl_FragColor=vec4(col*a*2.8,1.); }`}));
flame.position.y=-.1; flame.frustumCulled=false; flame.visible=false; rk.add(flame);
const glowU={uI:{value:0},uS:{value:1.6}};
const glow=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({uniforms:glowU,transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,
  vertexShader:`uniform float uS; varying vec2 vQ; void main(){ vQ=position.xy; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*uS; gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`uniform float uI; varying vec2 vQ; void main(){ float r=length(vQ)*2.; float a=exp(-r*r*6.)*1.3+.08*exp(-r*r*1.5); gl_FragColor=vec4(vec3(1.,.64,.34)*a*uI,1.); }`}));
glow.frustumCulled=false; glow.position.y=-.35; glow.visible=false; glow.renderOrder=5; rk.add(glow);

/* ---------- shared GLSL: hashes, value noise, and the night sky colour along a view direction ---------- */
const GLN=`float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n=h21(p); return vec2(n,h21(p+n+19.19)); }
float vn2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
vec3 skyCol(vec3 d){ float e=max(d.y,0.), az=atan(d.x,-d.z+1e-5), a2=az-2.4;
  float town=.4+exp(-az*az*1.3)*.95+exp(-a2*a2*3.)*.3;
  float g=exp(-e*34.)*.9+exp(-e*7.)*.16;
  vec3 c=vec3(.008,.009,.013)+vec3(1.,.58,.32)*.062*town*g;
  return c*mix(1.,.85,smoothstep(0.,-.12,d.y)); }`;

/* ---------- the night launch site ---------- */
const W=new T.Group(); W.visible=false; sc.add(W);
const WU={value:0}, FL={value:new T.Vector4(0,-50,0,0)}, BP={value:1};
// sky dome and stars ride with the camera
const dome=new T.Mesh(new T.SphereGeometry(1,48,24),new T.ShaderMaterial({uniforms:{uOn:WU},side:T.BackSide,depthWrite:false,depthTest:false,
  vertexShader:`varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*viewMatrix*vec4(position*620.+cameraPosition,1.); }`,
  fragmentShader:GLN+`uniform float uOn; varying vec3 vD; void main(){ gl_FragColor=vec4(skyCol(normalize(vD))*uOn,1.); }`}));
dome.renderOrder=-10; dome.frustumCulled=false; W.add(dome);
W.add(pts(cloud(Math.floor(1500*Q+500),(i,r,o)=>{ const a=r[0]*TAU, e=Math.asin(Math.pow(r[1],.85)); o[0]=Math.cos(a)*Math.cos(e); o[1]=Math.sin(e); o[2]=Math.sin(a)*Math.cos(e); }),
  PM({size:3.6,color:'#E8DECF',uniforms:{uOn:WU},decl:'uniform float uOn;',body:'float e=position.y; p=position*600.+cameraPosition; b=uOn*(.08+.8*pow(aR.x,6.))*smoothstep(.02,.22,e)*(.78+.22*sin(uTime*(1.+aR.w*3.)+aR.y*40.)); col=mix(uCol,vec3(.75,.84,1.),aR.y*.6);'})));
{ // a ring of low hills, a dark line against the glow of the towns behind them
  const N=256, R=470, P=[], I=[], ph=[...Array(4)].map(()=>Math.random()*9);
  for(let k=0;k<=N;k++){ const a=k/N*TAU, h=2.2+3.4*Math.pow(.5+.5*Math.sin(a*3+ph[0]),2)+2.4*(.5+.5*Math.sin(a*7+ph[1]))+1.1*Math.sin(a*17+ph[2])+.5*Math.sin(a*43+ph[3]);
    P.push(Math.cos(a)*R,-8,Math.sin(a)*R,Math.cos(a)*R,h,Math.sin(a)*R); if(k<N){ const b=k*2; I.push(b,b+1,b+2,b+1,b+3,b+2); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setIndex(I);
  const m=new T.Mesh(g,new T.ShaderMaterial({uniforms:{uOn:WU},side:T.DoubleSide,vertexShader:`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:GLN+`uniform float uOn; varying vec3 vW; void main(){ vec3 d=normalize(vW-cameraPosition); gl_FragColor=vec4(skyCol(normalize(vec3(d.x,0.,d.z)))*.34*uOn,1.); }`}));
  m.frustumCulled=false; W.add(m);
}
// fields: irregular plots with hedgerows and crop rows, lit by the moon, the towns, and the motor
const groundU={uOn:WU,uFl:FL,uScorch:{value:0}};
const ground=new T.Mesh(new T.PlaneGeometry(1000,1000),new T.ShaderMaterial({uniforms:groundU,extensions:{derivatives:true},
  vertexShader:`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:GLN+`uniform float uOn,uScorch; uniform vec4 uFl; varying vec3 vW;
  void main(){
    vec2 p=vW.xz; float dist=length(vW-cameraPosition);
    vec2 q=p/14.+vec2(.37,.61)+.35*vec2(vn2(p*.045)-.5,vn2(p*.045+7.3)-.5), n=floor(q), f=fract(q); float d1=9., d2=9.; vec2 id=vec2(0.);
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 gg=vec2(float(i),float(j)); vec2 o=gg+.5+.47*(h22(n+gg)*2.-1.)-f; float dd=dot(o,o); if(dd<d1){ d2=d1; d1=dd; id=n+gg; } else if(dd<d2) d2=dd; }
    float edge=sqrt(d2)-sqrt(d1);
    float r1=h21(id*1.7+3.1), r2=h21(id*2.3+11.7), r3=h21(id*.7+5.3);
    float ph=dot(p,vec2(cos(r2*3.1416),sin(r2*3.1416)))/(.16+.22*r3);
    float aa=clamp(1.-fwidth(ph)*1.3,0.,1.);
    float rows=r3>.42?mix(.5,.5+.5*sin(ph*6.2832),aa):.5;
    float gr=vn2(p*2.7)*.55+vn2(p*.61)*.45; gr=mix(.5,gr,clamp(1.-fwidth(p.x*2.7)*.7,0.,1.));
    float hedge=1.-smoothstep(.014,.05,edge), hn=vn2(p*1.3+id*7.);
    vec3 alb=r1<.3?vec3(.075,.065,.055)*(.75+.5*rows):r1<.68?vec3(.105,.112,.1)*(.9+.2*rows):vec3(.15,.135,.105)*(.85+.3*rows);
    alb*=(.8+.4*gr)*(.85+.3*r2);
    alb=mix(alb,vec3(.03,.034,.028)*(.5+.9*hn),hedge);
    float rp=length(p);
    alb=mix(alb,vec3(.17,.16,.14)*(.85+.3*gr),smoothstep(5.6,4.9,rp)*.5);
    alb=mix(alb,vec3(.02,.018,.016),smoothstep(1.5,.35,rp)*uScorch);
    vec3 L=uFl.xyz-vW; float fl=uFl.w/(1.+dot(L,L)*.08);
    vec3 col=alb*(vec3(.2,.22,.3)*.36+vec3(1.,.66,.4)*.1+vec3(1.,.58,.3)*fl*1.2);
    vec3 vd=normalize(vW-cameraPosition);
    col=mix(col,skyCol(normalize(vec3(vd.x,-.0005,vd.z)))*.8,1.-exp(-dist*.0019));
    gl_FragColor=vec4(col*uOn,1.);
  }`}));
ground.rotation.x=-HP; W.add(ground);
// farm lights far out in the fields
W.add(pts(cloud(Math.floor(36*Q+18),(i,r,o)=>{ const a=r[0]*TAU, R=55+Math.pow(r[1],.7)*390; o[0]=Math.cos(a)*R; o[1]=.25; o[2]=Math.sin(a)*R; }),
  PM({size:.55,color:'#FFC48A',uniforms:{uOn:WU},decl:'uniform float uOn;',body:'b=uOn*(.45+.9*aR.z)*(.8+.2*sin(uTime*(.4+aR.w)+aR.x*30.));'})));
// the pad: a slab, a blast plate, a launch rail, a windsock
const matPad=LM('#8c8274',{rim:.3,amb:.16,key:'#FFB87A'}), matRail=LM('#c2b6a4',{rim:.55,amb:.22,key:'#FFB87A'}), matSock=LM('#FFB475',{emit:.12,rim:.7,amb:.2,key:'#FFB87A'});
matSock.side=T.DoubleSide;
const PADMAT=[matPad,matRail,matSock];
function mesh(geo,mat,x,y,z,par){ const m=new T.Mesh(geo,mat); m.position.set(x,y,z); (par||W).add(m); return m; }
mesh(new T.BoxGeometry(1.1,PADY,1.1),matPad,0,PADY/2,0);
mesh(new T.BoxGeometry(.42,.012,.42),matN,0,PADY+.006,0);
mesh(new T.BoxGeometry(.024,2.25,.024),matRail,.074,PADY+1.125,-.074);
mesh(new T.BoxGeometry(.05,.05,.05),matRail,.074,PADY+2.25,-.074);
const sockP=new T.Group(); sockP.position.set(-3.6,0,-1.6); W.add(sockP);
mesh(new T.CylinderGeometry(.012,.016,1.25,8),matRail,0,.625,0,sockP);
const sock=new T.Group(); sock.position.y=1.2; sockP.add(sock);
const sockM=mesh(new T.CylinderGeometry(.075,.035,.55,14,4,true),matSock,.3,0,0,sock); sockM.rotation.z=-HP;
// clouds: a broken deck between 110 and 150 m, lit from below by the motor as it passes
const NC=Math.floor(110*Q+60), cPos=new Float32Array(NC*3), cRnd=new Float32Array(NC*4);
{ const cl=[[-1.6,.6,2.6],[-5,-4,3.5],[4,-7,4]]; for(let i=0;i<11;i++) cl.push([(Math.random()-.5)*140,(Math.random()-.5)*90-12,3+Math.random()*7]);
  for(let i=0;i<NC;i++){ const c=cl[i%cl.length]; cPos[i*3]=c[0]+gauss()*c[2]; cPos[i*3+1]=5.6+gauss()*.5; cPos[i*3+2]=c[1]+gauss()*c[2]*.7; for(let k=0;k<4;k++) cRnd[i*4+k]=Math.random(); } }
function bbGeo(n,attrs){ const q=new T.PlaneGeometry(1,1), g=new T.InstancedBufferGeometry(); g.index=q.index; g.setAttribute('position',q.attributes.position);
  for(const k in attrs) g.setAttribute(k,new T.InstancedBufferAttribute(attrs[k][0],attrs[k][1])); g.instanceCount=n; return g; }
const cloudU={uOn:WU,uDrift:{value:0},uFl:FL};
const clouds=new T.Mesh(bbGeo(NC,{aP:[cPos,3],aR:[cRnd,4]}),new T.ShaderMaterial({uniforms:cloudU,transparent:true,depthWrite:false,
  vertexShader:`attribute vec3 aP; attribute vec4 aR; uniform float uDrift,uOn; uniform vec4 uFl; varying vec2 vQ; varying vec3 vC; varying float vA; varying float vS;
    void main(){ vS=aR.y*40.; vec3 c=aP; c.x=mod(c.x+uDrift+100.,200.)-100.; float s=2.4+aR.x*3.6;
      vec4 mv=modelViewMatrix*vec4(c,1.); float dz=-mv.z; mv.xy+=position.xy*s; vQ=position.xy;
      vec3 L=c-uFl.xyz; float fl=uFl.w*.42/(1.+dot(L,L)*.14);
      vC=vec3(.05,.047,.045)*(.6+.8*aR.z)+vec3(1.,.56,.28)*fl;
      vA=uOn*smoothstep(s*.2,s*1.1,dz)*(1.-smoothstep(140.,300.,dz))*(.2+.22*aR.w);
      gl_Position=projectionMatrix*mv; }`,
  fragmentShader:GLN+`varying vec2 vQ; varying vec3 vC; varying float vA; varying float vS; void main(){ float r=length(vQ)*2.; float n=vn2(vQ*4.+vS)*.6+vn2(vQ*9.+vS*1.7)*.4; float a=smoothstep(1.,.15,r+(n-.5)*.7)*vA; if(a<.002) discard; gl_FragColor=vec4(vC*(.75+.5*n),a); }`}));
clouds.frustumCulled=false; W.add(clouds);
// smoke: a ring buffer of soft puffs. kind 0 exhaust trail, 1 pad billow, 2 thin delay smoke, 3 landing dust
const NS=Math.floor(1100*Q+300), sP=new Float32Array(NS*3), sV=new Float32Array(NS*3), sD=new Float32Array(NS*4);
const smokeU={uNow:{value:0},uOn:WU,uWind:{value:new T.Vector3(WIND*SCF,0,0)},uFl:FL};
const smokeG=bbGeo(NS,{aP:[sP,3],aV:[sV,3],aD:[sD,4]}); ['aP','aV','aD'].forEach(k=>smokeG.attributes[k].setUsage(T.DynamicDrawUsage));
const smoke=new T.Mesh(smokeG,new T.ShaderMaterial({uniforms:smokeU,transparent:true,depthWrite:false,
  vertexShader:`attribute vec3 aP,aV; attribute vec4 aD; uniform float uNow,uOn; uniform vec3 uWind; uniform vec4 uFl; varying vec2 vQ; varying vec3 vC; varying float vA;
    void main(){ float age=uNow-aD.x, kind=aD.y, sd=aD.z;
      float life=kind<.5?15.:kind<1.5?20.:kind<2.5?9.:5.;
      if(age<0.||age>life||uOn<.01){ gl_Position=vec4(0.,0.,2.,1.); vA=0.; return; }
      float k=age/life, dr=(1.-exp(-age*1.6))/1.6;
      vec3 c=aP+aV*dr+uWind*(age-dr)*(kind>2.5?.4:1.)+vec3(0.,(kind>2.5?.03:.09)*age,0.);
      c+=vec3(sin(age*.8+sd*40.),.5*sin(age*.6+sd*27.),cos(age*.7+sd*33.))*.15*sqrt(age);
      float grow=kind<.5?1.3:kind<1.5?1.05:kind<2.5?.9:1.7;
      float s=aD.w*(1.+grow*sqrt(age));
      vec4 mv=modelViewMatrix*vec4(c,1.); float dz=-mv.z; mv.xy+=position.xy*s; vQ=position.xy;
      vec3 L=c-uFl.xyz; float fl=min(1.6,uFl.w*.42/(1.+dot(L,L)*.6));
      float hot=kind<1.5?exp(-age*5.):0.;
      vec3 base=kind>2.5?vec3(.08,.07,.06):vec3(.095,.097,.104);
      vC=base+vec3(1.,.55,.24)*(fl+hot*.55);
      vA=uOn*smoothstep(0.,.08,age)*pow(1.-k,1.4)*(kind<.5?.6:kind<1.5?.45:kind<2.5?.5:.45)*smoothstep(.05,s*.9,dz);
      gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`varying vec2 vQ; varying vec3 vC; varying float vA; void main(){ float r=length(vQ)*2.; float a=exp(-r*r*3.)*vA; if(a<.003) discard; gl_FragColor=vec4(vC,a); }`}));
smoke.frustumCulled=false; W.add(smoke);
let sI=0, sDirty=false;
function puff(x,y,z,vx,vy,vz,kind,size){ const i=sI++%NS; sP[i*3]=x; sP[i*3+1]=y; sP[i*3+2]=z; sV[i*3]=vx; sV[i*3+1]=vy; sV[i*3+2]=vz; sD[i*4]=simClock; sD[i*4+1]=kind; sD[i*4+2]=Math.random(); sD[i*4+3]=size; sDirty=true; }
function smokeClear(){ for(let i=0;i<NS;i++) sD[i*4]=-1e5; sDirty=true; }
smokeClear();
const sparks=Burst(W,Math.floor(700*Q+250),'#FFCF9E',.045);
// altitude ladder: a tick every 10 m, a label every 50 m, brightest around the rocket
const lad=new T.Group(); lad.position.z=-4; W.add(lad);
const ladU={uFocus:{value:0},uOn:WU,uLad:{value:0}};
function labelSprite(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; const tex=new T.CanvasTexture(c); tex.minFilter=T.LinearFilter; tex.generateMipmaps=false;
  const sp=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:0})); sp.userData={c,x:c.getContext('2d'),tex}; return sp; }
function drawLabel(sp,text,color,px,align){ const {c,x,tex}=sp.userData; x.clearRect(0,0,c.width,c.height); x.font='900 '+Math.round(px*.92)+'px "Doto", monospace'; x.fillStyle=x.strokeStyle=color; x.lineWidth=Math.max(1,px*.05); x.lineJoin='round'; x.textBaseline='middle';
  x.textAlign=align||'left'; const tx=align==='right'?c.width-6:6; x.strokeText(text,tx,c.height/2+2); x.fillText(text,tx,c.height/2+2); tex.needsUpdate=true; } // the stroke fills the dots in, as in the page's text
const ladLabels=[];
{ const P=[], K=[]; P.push(0,0,0,0,52,0); K.push(.6,.6);
  for(let m=10;m<=520;m+=10){ const y=m*SCF, maj=m%50===0; P.push(0,y,0,maj?.6:.22,y,0); K.push(maj?1:0,maj?1:0); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aK',new T.Float32BufferAttribute(K,1));
  const m=new T.LineSegments(g,new T.ShaderMaterial({uniforms:ladU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform float uFocus; attribute float aK; varying float vA; void main(){ float y=position.y; vA=(.1+.5*exp(-pow((y-uFocus)/6.5,2.)))*(.45+.55*aK); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOn,uLad; varying float vA; void main(){ gl_FragColor=vec4(vec3(1.,.86,.72)*vA*uOn*uLad,1.); }`}));
  m.frustumCulled=false; lad.add(m);
  for(let mm=50;mm<=500;mm+=50){ const sp=labelSprite(256,64); drawLabel(sp,mm+' m','#FFE6D2',38,'right'); sp.position.set(-.18,mm*SCF,0); sp.scale.set(1.12,.28,1); sp.center.set(1,.5); sp.userData.y=mm*SCF; lad.add(sp); ladLabels.push(sp); }
}
const tgtLab=labelSprite(512,64); tgtLab.center.set(0,.5); tgtLab.scale.set(2.24,.28,1); lad.add(tgtLab);
const tgtTick=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-.3,0,0),new T.Vector3(.68,0,0)]),new T.LineBasicMaterial({color:0xFFB475,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
lad.add(tgtTick);
const lastG=new T.BufferGeometry(); lastG.setAttribute('position',new T.BufferAttribute(new Float32Array(18),3)); lastG.setDrawRange(0,0);
lad.add(new T.LineSegments(lastG,new T.LineBasicMaterial({color:0xEEE9DF,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false})));
// the target: a glowing plane of rings and spokes at the target altitude
const tgtU={uOn:WU,uHit:{value:0},uNear:{value:0}};
const tgt=new T.Group(); W.add(tgt);
{ const pos=[]; [2.5,5,7.5,10].forEach((R,ri)=>{ const n=Math.floor(R*TAU/.26); for(let k=0;k<n;k++){ const a=k/n*TAU; pos.push(Math.cos(a)*R,ri===3?1:0,Math.sin(a)*R); } });
  for(let s=0;s<12;s++){ const a=s/12*TAU; for(let r=1.2;r<10;r+=.32) pos.push(Math.cos(a)*r,0,Math.sin(a)*r); }
  const N=pos.length/3; tgt.add(pts(cloud(N,(i,r,o)=>{ o[0]=pos[i*3]; o[1]=0; o[2]=pos[i*3+2]; r[3]=pos[i*3+1]; }),PM({size:.1,color:'#FFB475',uniforms:tgtU,decl:'uniform float uOn,uHit,uNear;',
    body:'float rr=length(p.xz); float a=atan(p.z,p.x); p.xz*=1.+uHit*.12; float dz=-(modelViewMatrix*vec4(p,1.)).z; b=uOn*(.22+.45*aR.w+uNear*.35+uHit*1.2)*(1.-smoothstep(7.,10.5,rr)*(1.-aR.w)*.7)*(.6+.4*step(.5,fract(a*3.-uTime*.08))); sz=(2.+aR.w*1.2+uHit*1.5)*dz/(uSize*uPx);'})));
  const disc=new T.Mesh(new T.CircleGeometry(10.4,72),new T.ShaderMaterial({uniforms:tgtU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOn,uHit,uNear; varying vec2 vP; void main(){ float r=length(vP); float a=(.01+.02*uNear+.07*uHit)*(1.-smoothstep(2.,10.4,r))+(.13+.3*uHit)*exp(-pow((r-10.)/.12,2.)); gl_FragColor=vec4(vec3(1.,.7,.46)*a*uOn,1.); }`}));
  disc.rotation.x=-HP; tgt.add(disc);
}
// flight path: a dot every 80 ms of flight, kept for the results
const NPATH=900, pathP=new Float32Array(NPATH*3).fill(9999), pathU={uOn:WU,uRes:{value:0}};
const pathG=new T.BufferGeometry(); pathG.setAttribute('position',new T.BufferAttribute(pathP,3)); pathG.setAttribute('aR',new T.BufferAttribute(new Float32Array(NPATH*4).fill(.5),4)); pathG.setDrawRange(0,0); pathG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
pathG.attributes.position.setUsage(T.DynamicDrawUsage);
W.add(pts(pathG,PM({size:1,color:'#FFB475',uniforms:pathU,decl:'uniform float uOn,uRes;',body:'float dz=-(modelViewMatrix*vec4(p,1.)).z; sz=(2.2+uRes*1.6)*dz/uPx; b=uOn*(.35+.4*uRes);'})));
const apoLab=labelSprite(512,64); apoLab.center.set(0,.5); apoLab.scale.set(2.24,.28,1); W.add(apoLab);
// parachute: eight gores in amber and cream, eight shroud lines, a shock cord to the rocket
const chute=new T.Group(), canopy=new T.Group(); chute.add(canopy); chute.visible=false; W.add(chute);
const canU={uOn:{value:1},uA:{value:new T.Color('#FFB475')},uB:{value:new T.Color('#E9E2D4')}};
{ const pr=[]; for(let k=0;k<=16;k++){ const a=k/16*HP; pr.push(new T.Vector2(Math.sin(a)+.0001,1.5+Math.cos(a)*.58)); } pr.push(new T.Vector2(.985,1.45));
  canopy.add(new T.Mesh(new T.LatheGeometry(pr,64),new T.ShaderMaterial({uniforms:canU,side:T.DoubleSide,
    vertexShader:`varying vec3 vP,vN,vV; void main(){ vec3 p=position; float a=atan(p.z,p.x), r=length(p.xz), rim=smoothstep(.55,1.,r), ln=.5+.5*cos(a*8.);
      p.xz*=1.-.08*ln*rim; p.y+=.06*ln*rim; vP=position; vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uA,uB; uniform float uOn; varying vec3 vP,vN,vV; void main(){ float a=atan(vP.z,vP.x)/6.28318*8.; vec3 base=mix(uA,uB,step(.5,fract(a)));
      float f=abs(dot(normalize(vN),normalize(vV))), top=smoothstep(1.4,2.05,vP.y), seam=1.-smoothstep(0.,.04,abs(fract(a+.5)-.5));
      vec3 c=base*(.1+.17*f+.14*top)+base*pow(1.-f,2.)*.34; c*=1.-.3*seam; gl_FragColor=vec4(c*uOn,1.); }`})));
  const lp=[]; for(let k=0;k<8;k++){ const a=k/8*TAU; lp.push(Math.cos(a)*.906,1.51,Math.sin(a)*.906,0,0,0); }
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.Float32BufferAttribute(lp,3));
  canopy.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:0xE9E2D4,transparent:true,opacity:.6,depthWrite:false})));
}
const cordP=new Float32Array(6), cordG=new T.BufferGeometry(); cordG.setAttribute('position',new T.BufferAttribute(cordP,3));
const cord=new T.Line(cordG,new T.LineBasicMaterial({color:0xE9E2D4,transparent:true,opacity:.5,depthWrite:false})); cord.frustumCulled=false; cord.visible=false; W.add(cord);
const chP=new T.Vector3();

/* ---------- the blueprint behind the design view ---------- */
const bp=pts(cloud(Math.floor(9000*Q+3000),(i,r,o)=>{ o[0]=Math.round((r[0]-.5)*40/.5)*.5; o[1]=DY+Math.round((r[1]-.5)*20/.5)*.5; o[2]=-2.5; }),PM({size:.03,color:'#FFB475',body:`b=.12*smoothstep(14.,4.,length(p.xy-vec2(0.,${DY.toFixed(2)})));`}));
sc.add(bp);

/* ---------- HUD ---------- */
const $o=id=>$('#og'+id);
const hN=$o('HN'), hF=$o('HF'), rail=$o('Rail'), drCG=$o('DrCG'), drCP=$o('DrCP'), dim=$o('Dim'), mCG=$o('CG'), mCP=$o('CP'), lCG=$o('CGl'), lCP=$o('CPl'), stabL=$o('StabL');
const altEl=$o('A'), vEl=$o('V'), tEl=$o('T'), xEl=$o('X'), ring=$o('Ring'), ringO=$o('RingO'), cdK=$o('CDk'), cdNum=$o('CDn'), capK=$o('CapK'), capV=$o('CapV'), capEl=$o('Cap');
const sayEl=$o('AI'), askBtn=$o('Ask'), askT=$o('AskT'), launchBtn=$o('Launch'), launchT=$o('LaunchT'), gauge=$o('Gauge'), plot=$o('Plot'), px=plot.getContext('2d');
gauge.innerHTML='<i class="ax"></i>'+[0,100,200,300,400,500].map(m=>`<span class="tk" data-m="${m}">${m}</span>`).join('')+'<i class="tg" id="ogGT"></i><span class="tgl ui s" id="ogGTl">Target</span>'
  +[0,1,2].map(i=>`<i class="fm" id="ogGF${i}"></i>`).join('')+'<span class="fml ui s" id="ogGFl"></span><i class="pr" id="ogGP"></i><i class="mx" id="ogGM"></i><i class="lv" id="ogGL"></i>';
const gT=$o('GT'), gTl=$o('GTl'), gF=[0,1,2].map(i=>$o('GF'+i)), gFl=$o('GFl'), gP=$o('GP'), gM=$o('GM'), gL=$o('GL');
let GH=132;
const gy=m=>GH*(1-clamp(m,0,500)/500);
function layoutGauge(){
  GH=gauge.clientHeight||GH; $$('.tk',gauge).forEach(s=>s.style.top=gy(+s.dataset.m)+'px');
  gT.style.transform=`translateY(${gy(target)}px)`; gTl.style.transform=`translateY(${gy(target)}px)`;
  gF.forEach((e,i)=>{ const h=hist[i]; e.classList.toggle('on',!!h); e.classList.toggle('old',!!h&&i<hist.length-1); if(h) e.style.transform=`translateY(${gy(h.apo)}px)`; });
  const L=hist[hist.length-1]; gFl.classList.toggle('on',!!L); if(L){ gFl.textContent=`${hist.length} · ${Math.round(L.apo)}`; gFl.style.transform=`translateY(${gy(L.apo)}px)`; }
  if(ai) gP.style.transform=`translateY(${gy(ai.apo)}px)`;
}
addEventListener('resize',()=>{ if(S.stId==='og') layoutGauge(); });
function cap(k,v){ capK.textContent=k; capV.textContent=v||''; capEl.classList.remove('on'); void capEl.offsetWidth; capEl.classList.add('on'); }
function aiMatch(){ return !!ai&&ai.motor===d.motor&&Math.abs(ai.LD-d.LD)<.12&&Math.abs(ai.fin-d.fin)<.05&&Math.abs(ai.bal-d.bal)<.006; }
function syncUI(){
  const D=DC, s=D.stab, M=MOT[d.motor];
  setT($o('Stab'),s.toFixed(2)+' cal'); setT($o('StabW'),s<1?'Unstable':s>2.6?'Overstable':'Stable');
  el.classList.toggle('unstable',s<1); el.classList.toggle('overstable',s>2.6);
  $$('#ogMotor button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===d.motor));
  setT($o('MotS'),`${M.I} N·s · ${M.tb.toFixed(1)} s burn`); setT($o('Bal'),Math.round(d.bal*1000)+' g'); setT($o('Mass'),`${D.mass.toFixed(2)} kg · Cd ${D.Cd.toFixed(2)}`);
  $o('StabNote').innerHTML=`<b>${s.toFixed(2)} cal</b>The centre of pressure sits behind the centre of gravity, by Barrowman's equations.`;
  setT($o('HNv'),'L/D '+d.LD.toFixed(2)); setT($o('HFv'),Math.round(D.g.s*1000)+' mm');
  hN.setAttribute('aria-valuenow',d.LD.toFixed(2)); hF.setAttribute('aria-valuenow',Math.round(D.g.s*1000));
  const m=aiMatch(); el.classList.toggle('assisted',m); el.classList.toggle('predicted',m);
}
function designChanged(){ DC=design(d); rebuild(); syncUI(); const n=performance.now(); if(n-keyT>45){ keyT=n; A.key(); } }

/* ---------- design input: drag handles (mouse, touch, keys), motor, ballast ---------- */
const AX={x:1,y:0}, FO={x:0,y:-1};
function wpp(){ centreOf(V3); return 2*stCam.position.distanceTo(V3)*Math.tan(stCam.fov*Math.PI/360)/innerHeight; }
function dragHandle(h,kind){
  let drag=null;
  h.addEventListener('pointerdown',e=>{ if(phase!=='design'||busy||st.state!=='play') return; drag={x:e.clientX,y:e.clientY,d:{...d},id:e.pointerId,w:wpp(),ax:{...AX},fo:{...FO}};
    h.classList.add('drag','used'); try{ h.setPointerCapture(e.pointerId); }catch(_){} e.preventDefault(); e.stopPropagation(); A.tick(); });
  h.addEventListener('pointermove',e=>{ if(!drag||e.pointerId!==drag.id) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(kind==='nose') d.LD=clamp(drag.d.LD+(dx*drag.ax.x+dy*drag.ax.y)*drag.w/S6/Dm,1.5,4);
    else d.fin=clamp(drag.d.fin+(dx*drag.fo.x+dy*drag.fo.y)*drag.w/(.075*S6),.6,1.5);
    designChanged(); });
  const up=()=>{ if(!drag) return; drag=null; h.classList.remove('drag'); };
  h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up); h.addEventListener('lostpointercapture',up);
  h.addEventListener('keydown',e=>{ if(phase!=='design'||busy||st.state!=='play') return; let s=0;
    if(e.code==='ArrowRight'||e.code==='ArrowUp') s=1; else if(e.code==='ArrowLeft'||e.code==='ArrowDown') s=-1; else return; e.preventDefault();
    if(kind==='nose') d.LD=clamp(+(d.LD+s*.05).toFixed(2),1.5,4); else d.fin=clamp(+(d.fin+s*.02).toFixed(2),.6,1.5); h.classList.add('used'); designChanged(); });
}
dragHandle(hN,'nose'); dragHandle(hF,'fin');
if(!FINE) $o('PromptT').textContent='Tap anywhere, right at the top';
const canEdit=()=>phase==='design'&&!busy&&st.state==='play';
$o('Bm').addEventListener('click',()=>{ if(!canEdit()) return; d.bal=Math.max(0,+(d.bal-.01).toFixed(3)); designChanged(); });
$o('Bp').addEventListener('click',()=>{ if(!canEdit()) return; d.bal=Math.min(.15,+(d.bal+.01).toFixed(3)); designChanged(); });
$$('#ogMotor button').forEach(b=>b.addEventListener('click',()=>{ if(!canEdit()||d.motor===b.dataset.m) return; d.motor=b.dataset.m; designChanged(); A.blip(); }));

/* ---------- Ask Ogive: search the design space, plot every stable design, morph to the best ---------- */
let GRID=null;
const PCOL={F:'rgba(200,193,179,.55)',G:'rgba(255,180,117,.6)',H:'rgba(255,224,200,.7)'};
const plx=s=>6+(s-1.3)/1.3*220, ply=a=>82-(a-100)/380*76;
function plotReset(){ px.clearRect(0,0,232,88); px.fillStyle='rgba(238,233,223,.16)'; px.fillRect(6,82,220,1); px.fillRect(6,6,1,76);
  px.fillStyle='rgba(255,180,117,.75)'; for(let x=6;x<226;x+=6) px.fillRect(x,Math.round(ply(target)),3,1); }
function plotBest(b){ const x=plx(b.stab), y=ply(b.apo); px.strokeStyle='#EEE9DF'; px.lineWidth=1.5; px.beginPath(); px.moveTo(x-7,y); px.lineTo(x+7,y); px.moveTo(x,y-7); px.lineTo(x,y+7); px.stroke(); px.strokeRect(x-3.5,y-3.5,7,7); }
async function askOgive(){
  if(!canEdit()) return;
  busy=true; const my=++searchId, cur={...d}; let best=null, n=0, i=0, lastBeep=0;
  el.classList.add('searching'); el.classList.remove('answered'); askBtn.setAttribute('aria-busy','true'); setT(askT,'Searching'); launchBtn.disabled=true;
  if(!GRID){ GRID=[]; for(const m of ['F','G','H']) for(let LD=1.5;LD<=4.001;LD+=.25) for(let fin=.6;fin<=1.501;fin+=.1) for(let bal=0;bal<=.1501;bal+=.01) GRID.push({motor:m,LD:+LD.toFixed(2),fin:+fin.toFixed(2),bal:+bal.toFixed(3)}); }
  plotReset();
  const tryD=dd=>{ const D=design(dd); if(D.stab<1.3||D.stab>2.6) return; n++; const apo=simApo(dd,1).apo; const err=Math.abs(apo-target)+.5*Math.abs(dd.LD-cur.LD)+2*Math.abs(dd.fin-cur.fin);
    px.fillStyle=PCOL[dd.motor]; px.fillRect(plx(D.stab),ply(apo),2,2); if(!best||err<best.err) best={dd:{...dd},apo,err,stab:D.stab}; };
  const run=async list=>{ i=0; while(i<list.length){ const t0=performance.now(), bud=clamp((S.rdt||.016)*400,6,60);
      while(i<list.length&&performance.now()-t0<bud) tryD(list[i++]);
      sayEl.innerHTML=`<span class="mute">Ogive is flying</span> ${fmt(n)} <span class="mute">simulated designs</span>`;
      if(performance.now()-lastBeep>110){ lastBeep=performance.now(); A.key(); }
      await nextFrame(); if(my!==searchId) return false; } return true; };
  if(!await run(GRID)) return;
  if(best){ const b0=best.dd, ref=[]; for(let LD=Math.max(1.5,b0.LD-.25);LD<=Math.min(4,b0.LD+.25)+.001;LD+=.05) for(let bal=Math.max(0,b0.bal-.02);bal<=Math.min(.15,b0.bal+.02)+.0001;bal+=.002) ref.push({motor:b0.motor,LD:+LD.toFixed(2),fin:b0.fin,bal:+bal.toFixed(3)}); if(!await run(ref)) return; }
  if(!best){ sayEl.textContent='No stable design reaches that altitude.'; finishAsk(); return; }
  plotBest(best);
  const from={...d}, to=best.dd, t0=performance.now(); d.motor=to.motor;
  await new Promise(res=>{ (function step(){ if(my!==searchId) return res(); const k=E.io(clamp((performance.now()-t0)/900,0,1)); d.LD=lerp(from.LD,to.LD,k); d.fin=lerp(from.fin,to.fin,k); d.bal=lerp(from.bal,to.bal,k); designChanged(); if(k<1) requestAnimationFrame(step); else res(); })(); });
  if(my!==searchId) return;
  d={...to}; ai={...to,apo:best.apo}; designChanged(); A.chime(9); A.chime(12,.1);
  sayEl.innerHTML=`<span class="mute">Flew ${fmt(n)} designs.</span> ${to.motor} motor, L/D ${to.LD.toFixed(2)}, fins ${Math.round(to.fin*100)}%, ${Math.round(to.bal*1000)} g ballast. <span class="mute">Predicts</span> ${Math.round(best.apo)} m`;
  el.classList.remove('searching'); el.classList.add('answered'); layoutGauge(); finishAsk();
}
function finishAsk(){ busy=false; el.classList.remove('searching'); askBtn.removeAttribute('aria-busy'); setT(askT,'Ask Ogive'); launchBtn.disabled=false; }
askBtn.addEventListener('click',askOgive);

/* ---------- poses ---------- */
const pose={tail:new T.Vector3(-2.45,DY,0),pitch:-HP,roll:0};
const twA={c:new T.Vector3(),pitch:0,roll:0,scale:1}, twB={c:new T.Vector3(),pitch:0,roll:0,scale:1};
function axisOf(pitch,o){ return o.set(-Math.sin(pitch),Math.cos(pitch),0); }
function placeByTail(tail,pitch,roll,scale){ rocket.rotation.set(0,roll,pitch); rocket.scale.setScalar(scale); axisOf(pitch,V1); rocket.position.copy(tail).addScaledVector(V1,pivotL*scale); }
function placeByCentre(c,pitch,roll,scale){ rocket.rotation.set(0,roll,pitch); rocket.scale.setScalar(scale); axisOf(pitch,V1); rocket.position.copy(c).addScaledVector(V1,(pivotL-Lh)*scale); }
function centreOf(o){ axisOf(rocket.rotation.z,V1); return o.copy(rocket.position).addScaledVector(V1,(Lh-pivotL)*rocket.scale.x); }
const rkW=(x,y,z,o)=>rk.localToWorld(o.set(x,y,z));
function designTarget(t,port,menu,o){ // tail position (into o) and pitch, for the title screen and the design view
  if(menu){ if(port){ o.set(.3,DY-3.15+.06*Math.sin(t*.7),0); return -.24+.02*Math.sin(t*.5); }
    o.set(.22,DY-2.62+.05*Math.sin(t*.7),0); return -.05+.02*Math.sin(t*.5); }
  if(port){ o.set(.62,DY-2.55,0); return 0; }
  o.set(-2.45,DY,0); return -HP;
}

/* ---------- launch flow: arm (to the pad), count down, fly, land ---------- */
function startArm(){
  if(phase!=='design'||busy||st.state!=='play') return;
  centreOf(twA.c); twA.pitch=pose.pitch; twA.roll=pose.roll; twA.scale=1;
  twB.c.set(0,PADY+Lh*FS,0); twB.pitch=0; twB.roll=Math.round(pose.roll/HP)*HP; twB.scale=FS;
  tw={t:0,dur:1.6,arm:true}; setPhase('arm'); W.visible=true; el.classList.remove('chute-ready','chute-now');
  launchBtn.classList.add('cancel'); setT(launchT,'Cancel'); launchBtn.dataset.cur='Cancel';
  setT(cdK,'To the pad'); setT(cdNum,''); placePad(); lastFlights(); A.whoosh(true,1.4,.14); A.chime(5);
}
function cancelLaunch(){
  if(phase!=='arm'&&phase!=='count') return;
  A.whoosh(false,.9,.12); A.beep(330); cap('Countdown cancelled','Back to the design'); toDesign();
}
function toDesign(){ // tween from wherever the rocket is back to the design view
  F=null; centreOf(twA.c); twA.pitch=rocket.rotation.z; twA.roll=rocket.rotation.y; twA.scale=rocket.scale.x;
  tw={t:0,dur:1.3,arm:false,from:stCam.position.clone(),fromL:st.camL.clone()}; setPhase('disarm'); chute.visible=cord.visible=false; flame.visible=glow.visible=false; FL.value.w=0;
  stopSound(); slow(false); launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); launchBtn.dataset.cur='Launch';
  el.classList.remove('chute-ready','chute-now');
}
function placePad(){ // the target label faces the rocket, the scale labels the other way; a scale label next to the target steps aside
  // portrait mirrors the ladder: it stands right of the rocket there, so the ticks and the target label turn toward it
  const port=PORT(); lad.scale.x=port?-1:1; tgt.position.y=target*SCF; tgtTick.position.y=target*SCF;
  tgtLab.center.set(port?1:0,.5); tgtLab.position.set(port?.3:.75,target*SCF,0); drawLabel(tgtLab,'Target '+target+' m','#FFB475',38,port?'right':'left');
  for(let i=0;i<ladLabels.length;i++){ const sp=ladLabels[i]; sp.center.set(port?0:1,.5); sp.position.x=port?-.12:-.18; sp.userData.hide=Math.abs(sp.userData.y/SCF-target)<16; drawLabel(sp,Math.round(sp.userData.y/SCF)+' m','#FFE6D2',38,port?'left':'right'); } }
function lastFlights(){ const a=lastG.attributes.position.array; hist.forEach((h,i)=>{ const y=h.apo*SCF; a.set([-.1,y,0,.45,y,0],i*6); }); lastG.attributes.position.needsUpdate=true; lastG.setDrawRange(0,hist.length*2); }
function startCount(){ setPhase('count'); cdT=3; cdN=4; tScale=1; }
function ignite(){
  const sign=Math.random()<.5?-1:1; F=newF(d,sign); NAT=simApo(d,sign); setPhase('flight'); simClock=0; smokeClear(); tScale=1; ev={}; maxH=0; done=false;
  pathN=0; pathAcc=0; emitAcc=0; ffMax=1; pathG.setDrawRange(0,0); pathU.uRes.value=0; apoLab.material.opacity=0; groundU.uScorch.value=0; cloudU.uDrift.value=0;
  flame.visible=glow.visible=true; ign=1; chute.visible=cord.visible=false; curReset(); ring.classList.remove('pop','late'); ringLate=false;
  launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); el.classList.remove('chute-ready','chute-now');
  A.launch(); A.boom(); A.beep(1320); feedback(.5,.7); S.flash=Math.max(S.flash,.16);
  for(let k=0;k<Math.floor(26*Q+10);k++){ const a=Math.random()*TAU, s=1.2+Math.random()*2; puff(Math.cos(a)*.2,.1,Math.sin(a)*.2,Math.cos(a)*s,.15+Math.random()*.35,Math.sin(a)*s,1,.28+Math.random()*.22); }
  cap('Ignition',MOT[d.motor].I+' N·s '+d.motor+' motor');
}
function deploy(auto){
  if(!F||F.chute||F.landed||phase!=='flight') return;
  if(!auto&&F.t<F.D.M.tb){ centreOf(RC); popAt($o('Pops'),RC,'Still burning','bad'); A.beep(260); return; }
  F.chute=true; F.deployT=F.t; F.auto=!!auto; F.deployV=Math.hypot(F.vx,F.vy); chuteK=0; chute.visible=cord.visible=true; curReset();
  el.classList.remove('chute-ready','chute-now'); centreOf(RC); canU.uOn.value=1;
  if(ev.win||ringLate){ ring.classList.add('pop'); ringO.style.transform='scale(2.6)'; }
  if(!auto&&F.vy>12){ F.torn=true; A.buzz(); A.pop(); feedback(.35,.9,new T.Color(.14,0,0)); cap('Chute shredded',Math.round(F.vy)+' m/s is too fast to open'); popAt($o('Pops'),RC,'Too fast','bad'); return; }
  A.pop(); A.whoosh(true,.7,.13); feedback(.14,.35);
  if(auto){ cap('Ejection charge','Opened late, by the motor'); popAt($o('Pops'),RC,'Late','bad'); return; }
  const dt=F.t-NAT.tApo, ok=Math.abs(dt)<.12; A.ping(ok?1568:1175,.05);
  cap(ok?'Right at the top':dt<0?'A touch early':'A touch late',(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s from apogee');
  popAt($o('Pops'),RC,(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s',Math.abs(dt)<.25?'big':'');
}
function slow(on){ if(on===slowOn) return; slowOn=on; if(on&&!cineOn){ cine(true); cineOn=true; } if(!on&&cineOn){ cine(false); cineOn=false; } if(on) A.whoosh(false,1.1,.07); }
function stopSound(){ A.roar(0); A.wind(0); A.thrust(0); A.hiss(0); }
const L0={cy:0,cx:0,sx:1,sy:1,rz:0,py:0};
function landing(){
  setPhase('landed'); landT=0; stopSound(); A.pop(); feedback(.2,.25); slow(false); curReset();
  L0.cy=chP.y; L0.cx=chP.x; L0.sx=canopy.scale.x; L0.sy=canopy.scale.y; L0.rz=rocket.rotation.z; L0.py=rocket.position.y;
  const x=rocket.position.x; for(let k=0;k<Math.floor(22*Q+10);k++){ const a=Math.random()*TAU, s=.5+Math.random()*.9; puff(x+Math.cos(a)*.15,.05,Math.sin(a)*.15,Math.cos(a)*s,.08+Math.random()*.14,Math.sin(a)*s,3,.12+Math.random()*.12); }
  V2.set(x,.05,0); sparks.emit(V2,Math.floor(30*Q+10),1.2,new T.Color('#C8B49A'),.8,.7);
  cap('Touchdown',Math.round(Math.abs(F.x))+' m '+(F.x>=0?'downwind':'upwind')+' of the pad');
}
function finish(){
  if(done) return; done=true; const f=F; hist.push({apo:f.apo}); const tries=hist.length;
  const err=Math.abs(f.apo-target), pct=err/target*100, dt=f.deployT<0?0:f.deployT-NAT.tApo;
  const apoS=Math.max(0,Math.round(1000-pct*45)), dep=f.torn?0:f.auto?60:Math.max(0,Math.round(300-Math.abs(dt)*260)), total=apoS+dep;
  const grade=f.tumble?'Cartwheeled':f.torn?'Chute shredded':pct<2?'Bullseye':pct<5?'On target':pct<12?'Close':'Off target';
  const sgn=f.apo>=target?'+':'−';
  const tip=f.tumble?'Under 1 calibre the fins cannot hold the nose into the wind. Bigger fins or nose ballast will fix it.'
    :f.torn?`The chute opened at ${Math.round(f.deployV)} m/s and tore. Wait until the rocket stops climbing.`
    :pct<2?'Within 2% of the target. Landing a design on a number is what Ogive is for.'
    :f.D.stab>2.6&&f.apo<target?'Overstable rockets turn into the wind and lose height. Trim the fins or the ballast.'
    :f.apo<target?`${Math.round(err)} m short. More motor, less ballast, or a longer nose.`
    :`${Math.round(err)} m over. Add ballast, shorten the nose, or step the motor down.`;
  const chuteTxt=f.torn?' The chute timing scored nothing.':f.auto?' The motor opened the chute late.':Math.abs(dt)<.12?' The chute timing was spot on.':'';
  $o('ResEb').textContent=`Flight ${tries} / 3 · target ${target} m`;
  const left=3-tries, again=$o('Again'), nt=$o('NewT');
  again.disabled=left<=0; again.textContent=left>0?`Adjust and fly again · ${left} left`:'No flights left';
  again.classList.toggle('pri',left>0); nt.classList.toggle('pri',left<=0);
  st.result({grade,score:total,assisted:aiMatchF(f),stats:[['Apogee',Math.round(f.apo)+' m'],['Off target',Math.round(err)===0?'0 m':sgn+Math.round(err)+' m'],
    ['Chute',f.torn?'Torn':f.auto?'Auto, late':(dt>=0?'+':'−')+Math.abs(dt).toFixed(2)+' s'],['Max speed',Math.round(f.maxV)+' m/s'],['Peak accel',(f.maxA/9.81).toFixed(1)+' g'],['Stability',f.D.stab.toFixed(2)+' cal']],
    text:tip+(pct<2||f.torn||f.tumble?'':chuteTxt)});
  if(pct<2&&!f.tumble) A.chord(); else if(f.tumble||f.torn) A.buzz(); else A.dock();
  layoutGauge();
}
function aiMatchF(f){ return !!ai&&ai.motor===f.d.motor&&Math.abs(ai.LD-f.d.LD)<.12&&Math.abs(ai.fin-f.d.fin)<.05&&Math.abs(ai.bal-f.d.bal)<.006; }
function newTarget(){ let t; do{ t=Math.round((160+Math.random()*280)/10)*10; }while(t===target); target=t; hist=[]; ai=null; setT($o('Target'),target+' m'); sayEl.textContent=''; el.classList.remove('answered'); syncUI(); layoutGauge(); }
function triesUI(){ setT($o('Tries'),`Flight ${Math.min(3,hist.length+1)} / 3`); }
launchBtn.addEventListener('click',()=>{ if(phase==='design') startArm(); else cancelLaunch(); });
$o('Chute').addEventListener('click',()=>deploy(false));
$o('Again').addEventListener('click',()=>{ if(hist.length>=3) return; curReset(); triesUI(); st.setState('play'); toDesign(); });
$o('NewT').addEventListener('click',()=>{ curReset(); newTarget(); triesUI(); st.setState('play'); toDesign(); });
st.onPointer=()=>{ if(phase==='flight'&&st.state==='play') deploy(false); };
addEventListener('keydown',e=>{
  if(S.stId!=='og'||S.mode!=='station') return;
  if(e.code==='Escape'&&(phase==='arm'||phase==='count')&&st.state==='play'){ e.preventDefault(); e.stopImmediatePropagation(); cancelLaunch(); return; }
  if(e.code!=='Space'||(e.target.closest&&e.target.closest('input,textarea'))) return;
  e.preventDefault(); const a=document.activeElement; if(a&&a!==document.body&&a.blur) a.blur();
  if(e.repeat||st.state!=='play') return;
  if(phase==='design') startArm(); else if(phase==='arm'||phase==='count') cancelLaunch(); else if(phase==='flight') deploy(false);
},true);

/* ---------- lifecycle ---------- */
st.play=function(){ searchId++; busy=false; finishAsk(); F=null; tw=null; d={motor:'G',LD:2.5,fin:1,bal:0}; DC=design(d); rebuild(); newTarget(); triesUI();
  setPhase('design'); W.visible=false; WU.value=0; BP.value=1; stopSound(); slow(false); st.setState('play');
  launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); hN.classList.remove('used'); hF.classList.remove('used'); curReset(); requestAnimationFrame(layoutGauge); };
st.abort=function(){ searchId++; if(busy) finishAsk(); F=null; tw=null; setPhase('design'); W.visible=false; WU.value=0; BP.value=1; chute.visible=cord.visible=false; flame.visible=glow.visible=false; FL.value.w=0;
  stopSound(); slow(false); el.classList.remove('chute-ready','chute-now'); launchBtn.classList.remove('cancel'); setT(launchT,'Launch'); };
st.enter=function(){ st.abort(); st.setState('menu'); syncUI(); snap=true; $o('Best').textContent='Best '+fmt(store.get('og',0)); };
st.exit=function(){ st.abort(); };
st.build=function(){
  rebuild(); syncUI(); st.anchors=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  // compile the night scene now, so the first launch does not stall on shader compiles
  W.visible=true; chute.visible=cord.visible=flame.visible=glow.visible=true; WU.value=1;
  try{ renderer.compile(sc,stCam); }catch(e){}
  W.visible=false; chute.visible=cord.visible=flame.visible=glow.visible=false; WU.value=0;
};

/* ---------- frame ---------- */
st.update=function(dt,t){
  const rd=S.rdt||dt, port=PORT(), menu=st.state==='menu';
  if(menu||phase==='design'){ // title screen and design view: ease toward the pose, the tail anchors the rocket
    const tp=designTarget(t,port,menu,V2);
    if(snap){ pose.tail.copy(V2); pose.pitch=tp; snap=false; } else { pose.tail.lerp(V2,1-Math.exp(-5*rd)); pose.pitch=damp(pose.pitch,tp,5,rd); }
    if(menu) pose.roll+=rd*.32; else pose.roll=damp(pose.roll,Math.round(pose.roll/HP)*HP,6,rd);
    placeByTail(pose.tail,pose.pitch,pose.roll,1);
    rocket.updateMatrixWorld(true);
    if(menu){ const g=DC.g; rkW(0,(g.L-g.Ln*.38)*S6,0,st.anchors[0]); rkW(0,(g.L-DC.cp)*S6,0,st.anchors[1]); rkW(0,g.Cr*.5*S6,0,st.anchors[2]); }
    BP.value=damp(BP.value,1,3,rd); WU.value=0; W.visible=false;
  }
  if(tw){ // arm: design to pad, disarm: back
    tw.t+=rd; const k=E.io(clamp(tw.t/tw.dur,0,1)), kk=tw.arm?k:1-k;
    if(tw.arm){ V2.lerpVectors(twA.c,twB.c,k); V2.y+=Math.sin(k*Math.PI)*.45; placeByCentre(V2,lerp(twA.pitch,twB.pitch,k),lerp(twA.roll,twB.roll,k),lerp(twA.scale,twB.scale,k)); }
    else { const tp=designTarget(t,port,false,V3); pose.tail.copy(V3); pose.pitch=tp; pose.roll=Math.round(twA.roll/HP)*HP;
      axisOf(tp,V1); V2.copy(V3).addScaledVector(V1,Lh); V4.lerpVectors(twA.c,V2,k); V4.y+=Math.sin(k*Math.PI)*.35;
      placeByCentre(V4,lerp(twA.pitch,tp,k),lerp(twA.roll,pose.roll,k),lerp(twA.scale,1,k)); }
    WU.value=sstep(.25,.85,kk); BP.value=1-sstep(0,.45,kk); W.visible=WU.value>.002;
    if(tw.t>=tw.dur){ const arm=tw.arm; tw=null; if(arm) startCount(); else { setPhase('design'); W.visible=false; WU.value=0; } }
  }
  if(phase==='count'){
    cdT-=rd; const n=Math.ceil(cdT);
    if(n!==cdN&&n>0){ cdN=n; setT(cdK,'T minus'); setT(cdNum,String(n)); cdNum.classList.remove('ogtk'); void cdNum.offsetWidth; cdNum.classList.add('ogtk'); A.beep(n===1?990:740); A.tick(); }
    if(cdT<1){ glowU.uI.value=.08+.08*Math.random(); glow.visible=true; rkW(0,-.2,0,NZ); FL.value.set(NZ.x,NZ.y,NZ.z,.12+.1*Math.random()); if(Math.random()<rd*14) sparks.emit(NZ,2,.8,null,-1,.4); }
    if(cdT<=0) ignite();
  }
  if(phase==='flight'&&F) flightStep(dt,rd,t);
  if(phase==='landed'&&F) landedStep(dt,rd,t);
  if(phase!=='flight'&&phase!=='landed') simClock+=rd;
  // shared world state
  smokeU.uNow.value=simClock; if(sDirty){ smokeG.attributes.aP.needsUpdate=smokeG.attributes.aV.needsUpdate=smokeG.attributes.aD.needsUpdate=true; sDirty=false; }
  sparks.update(phase==='flight'?dt*tScale:rd,3.5,1.4);
  bp.material.uniforms.uOp.value=BP.value; bp.visible=BP.value>.01; sky0.material.uniforms.uOp.value=1-WU.value; sky0.visible=WU.value<.99;
  if(W.visible){ const ry=phase==='landed'&&F?F.apo*SCF*.5:rocket.position.y; ladX=damp(ladX,(phase==='flight'||phase==='landed'?rocket.position.x:0)+(PORT()?.65:-2.3),2,rd); lad.position.x=ladX; ladU.uFocus.value=damp(ladU.uFocus.value,ry,4,rd);
    ladU.uLad.value=damp(ladU.uLad.value,(phase==='flight'&&F&&F.t>.5)||(phase==='landed'&&st.state==='res')?1:0,3,rd); const lk=WU.value*ladU.uLad.value;
    for(let i=0;i<ladLabels.length;i++){ const sp=ladLabels[i]; sp.material.opacity=sp.userData.hide?0:lk*(.22+.7*Math.exp(-Math.pow((sp.userData.y-ladU.uFocus.value)/6.5,2))); } tgtLab.material.opacity=lk*.95; tgtTick.material.opacity=lk*.9; lad.visible=lk>.005;
    sock.rotation.y=.12*Math.sin(t*2.3)+.05*Math.sin(t*5.1); sock.rotation.z=-.08+.05*Math.sin(t*3.7);
    for(let i=0;i<PADMAT.length;i++){ const u=PADMAT[i].uniforms; u.uKey.value.set(FL.value.x,Math.max(FL.value.y,.3),FL.value.z+.4); u.uKeyCol.value.setRGB(1,.62,.34).multiplyScalar(.25+Math.min(2.5,FL.value.w*1.4)); } }
  // close up (title and design) the key light is softer so the body shows its shape instead of blooming flat
  rkK=damp(rkK,(menu||phase==='design')?.62:1,3,rd);
  centreOf(RC); for(let i=0;i<RKMAT.length;i++){ const u=RKMAT[i].uniforms; u.uKey.value.set(RC.x+5,RC.y+14,RC.z+20); u.uKeyCol.value.setRGB(1,.902,.8).multiplyScalar(rkK); }
  camStep(t,rd,port,menu);
  if(!domQ){ domQ=true; queueMicrotask(placeDOM); }
};
function flightStep(dt,rd,t){
  const D=F.D;
  // time: slow motion around apogee, a gentle hold on the chute pop, fast forward under the canopy
  let want=1;
  if(!F.chute&&F.t>NAT.tApo-1.15&&F.t<NAT.tApo+1.0) want=.26;
  if(F.chute&&F.t<F.deployT+.4) want=.3;
  if(F.chute&&F.t>F.deployT+2&&!F.landed){ if(ffMax===1) ffMax=clamp((F.h-25)/(Math.max(2.5,-F.vy)*4.5),1,9); want=1+(ffMax-1)*sstep(5,32,F.h); }
  tScale=damp(tScale,want,want<tScale?6:3,rd);
  const sdt=dt*tScale; simClock+=sdt; vT+=rd; // vT: real time, for motion that must not speed up with the fast-forward
  const ph=F.h, px0=F.x; let rem=sdt; while(rem>1e-7){ const h=Math.min(.01,rem); stepF(F,h); rem-=h; }
  if(F.t>240&&!F.landed){ F.h=0; F.landed=true; }
  const th=thrustAt(F.d.motor,F.t), thN=th/(D.M.I/D.M.tb);
  // rocket pose
  let pitch, roll=F.t*1.4;
  if(F.chute){ chuteK=Math.min(1,chuteK+sdt/.55); const sw=.11*Math.sin(vT*1.25)+.035*Math.sin(vT*2.1); pitch=lerp(F.tumble?-F.t*9:-F.th,1.25+sw,E.o(chuteK)); roll=F.deployT*1.4; }
  else pitch=F.tumble?-F.t*9:-F.th;
  rocket.rotation.set(0,roll,pitch); rocket.scale.setScalar(FS); rocket.position.set(F.x*SCF,F.h*SCF+PADY+pivotL*FS,0);
  rocket.updateMatrixWorld(true); rkW(0,-.25,0,NZ);
  // motor: flame, glow, light on the ground and the smoke, sparks
  ign=Math.max(0,ign-sdt*2.2);
  flameU.uI.value=th>0?Math.min(1.25,.35+thN*.7):0; flameU.uLen.value=2.4+thN*2.6; glowU.uI.value=th>0?.3+thN*.45+ign*.6:0; glowU.uS.value=.55+thN*.3+ign*.7;
  flame.visible=th>0; glow.visible=th>0;
  FL.value.set(NZ.x,NZ.y,NZ.z,th>0?thN*1.25+ign*2.6:0);
  groundU.uScorch.value=Math.min(1,groundU.uScorch.value+sdt*2);
  if(th>0){ emitAcc+=sdt*(95*Q+30); const n=Math.floor(emitAcc); emitAcc-=n; axisOf(rocket.rotation.z,V1);
    for(let k=0;k<n;k++){ const f=(k+1)/n; V2.set(lerp(px0,F.x,f)*SCF,lerp(ph,F.h,f)*SCF+PADY+pivotL*FS,0).addScaledVector(V1,-pivotL*FS-.06);
      const bl=F.h<4?1:0; puff(V2.x+gauss()*.03,V2.y,V2.z+gauss()*.03,-V1.x*1.4+gauss()*.3,-V1.y*1.4+gauss()*.2,gauss()*.3,bl,.13+Math.random()*.1+bl*.12); }
    if(F.h<3&&Math.random()<sdt*18){ const a=Math.random()*TAU, s=1.4+Math.random()*1.6; puff(Math.cos(a)*.3,.08,Math.sin(a)*.3,Math.cos(a)*s,.12,Math.sin(a)*s,1,.3+Math.random()*.2); }
    sparks.emit(NZ,Math.ceil(5*Q*thN+1),1.1,null,-5,.5); }
  else if(!F.chute&&F.lifted){ emitAcc+=sdt*(22*Q+8); const n=Math.floor(emitAcc); emitAcc-=n; for(let k=0;k<n;k++) puff(NZ.x,NZ.y,NZ.z,gauss()*.05,gauss()*.05,gauss()*.05,2,.09+Math.random()*.06); }
  cloudU.uDrift.value+=sdt*.45;
  // path dots
  pathAcc+=sdt; if(pathAcc>=.08&&pathN<NPATH&&F.lifted){ pathAcc=0; centreOf(V2); pathP[pathN*3]=V2.x; pathP[pathN*3+1]=V2.y; pathP[pathN*3+2]=V2.z; pathN++; pathG.setDrawRange(0,pathN); pathG.attributes.position.needsUpdate=true; }
  // events
  if(F.lifted&&!ev.lift){ ev.lift=true; }
  if(F.h>50&&!ev.deck){ ev.deck=true; A.whoosh(true,.9,.09); }
  if(F.t>=D.M.tb&&!ev.burn){ ev.burn=true; cap('Burnout','Coasting up. Open the chute at the top'); A.thrust(0); }
  const win=!F.chute&&F.t>NAT.tApo-1.15&&F.t<NAT.tApo+1.05;
  if(win!==!!ev.win){ ev.win=win; el.classList.toggle('chute-now',win); if(win){ el.classList.add('chute-ready'); A.ping(880,.03); } }
  slow(tScale<.7&&!F.landed);
  if(F.apo>0&&!ev.apo){ ev.apo=true; const pc=Math.abs(F.apo-target)/target; tgtU.uHit.value=pc<.05?1:0;
    apoLab.position.set(F.xApo*SCF+.45,F.apo*SCF+.1,0); const er=Math.round(Math.abs(F.apo-target)); drawLabel(apoLab,Math.round(F.apo)+' m  '+(er===0?'on target':(F.apo>=target?'+':'−')+er),pc<.05?'#FFB475':'#EEE9DF',36); apoLab.material.opacity=.95;
    if(pc<.02){ A.chime(14); A.chime(17,.1); } }
  if(!F.chute&&F.apo>0&&F.t>F.tApo+2.2) deploy(true);
  maxH=Math.max(maxH,F.h);
  tgtU.uNear.value=damp(tgtU.uNear.value,Math.abs(F.h-target)<target*.08?1:0,4,rd); tgtU.uHit.value=damp(tgtU.uHit.value,0,.9,rd);
  // canopy: inflate with a little overshoot, breathe, sway with the wind
  if(F.chute){ centreOf(RC); axisOf(rocket.rotation.z,V1); V2.copy(RC).addScaledVector(V1,(Lh*.25)*FS);
    V3.set(V2.x+.25,V2.y+1.0,0); if(chuteK<.05) chP.copy(V2); chP.lerp(V3,1-Math.exp(-7*sdt));
    const k=chuteK, o=k<1?1-Math.pow(1-k,3)*Math.cos(k*7):1, br=Math.sin(vT*2.4)*(F.torn?.16:.025);
    canopy.scale.set(lerp(.1,F.torn?.45:1,o)*(1+br),lerp(1.7,F.torn?.8:1,o)*(1-br*.8),lerp(.1,F.torn?.3:1,o)*(1+br));
    chute.position.copy(chP); chute.rotation.set(.04*Math.sin(vT*.9),vT*.14,-.1-.05*Math.sin(vT*1.25+.6)); chute.scale.setScalar(.95);
    cordP[0]=chP.x; cordP[1]=chP.y; cordP[2]=chP.z; cordP[3]=V2.x; cordP[4]=V2.y; cordP[5]=V2.z; cordG.attributes.position.needsUpdate=true; }
  // sound
  const air=Math.hypot(F.vx-WIND,F.vy);
  A.roar(th>0?Math.min(1.1,thN*.8+ign*.3):0); A.thrust(th>0?thN*.8:0); A.wind(Math.min(.24,air/420)*(tScale<.5?.4:1)); A.hiss(!F.chute&&F.lifted&&th<=0?.25:0);
  // read-outs
  setT(altEl,String(Math.round(F.h))); setT(vEl,(F.vy>=0?'+':'−')+Math.abs(F.vy).toFixed(1)+' m/s'); setT(tEl,'T+ '+F.t.toFixed(1)+' s');
  setT(xEl,tScale<.7?'Slow motion':tScale>1.6?'Descent ×'+Math.round(tScale):'');
  gL.style.transform=`translateY(${gy(F.h).toFixed(1)}px)`; gM.style.transform=`translateY(${gy(maxH).toFixed(1)}px)`;
  if(F.landed) landing();
}
function landedStep(dt,rd,t){
  landT+=rd; simClock+=rd;
  // the rocket tips over onto its fins, the canopy settles downwind
  const k=E.io(clamp(landT/.7,0,1)), side=L0.rz>=0?1:-1;
  rocket.rotation.z=lerp(L0.rz,side*HP*.97,k); rocket.position.y=lerp(L0.py,.17,k);
  if(chute.visible){ const c=E.io(clamp(landT/1.5,0,1)); chP.x=L0.cx+c*.9; chP.y=lerp(L0.cy,.05,c); chute.position.copy(chP);
    canopy.scale.set(lerp(L0.sx,1.12,c),lerp(L0.sy,.1,c),lerp(L0.sx,1.12,c)); chute.rotation.set(0,chute.rotation.y,lerp(-.12,0,c));
    centreOf(RC); cordP[0]=chP.x; cordP[1]=chP.y; cordP[2]=chP.z; cordP[3]=RC.x; cordP[4]=RC.y; cordP[5]=RC.z; cordG.attributes.position.needsUpdate=true; }
  FL.value.w=0; flame.visible=glow.visible=false; canU.uOn.value=damp(canU.uOn.value,.55,1.5,rd);
  tgtU.uHit.value=damp(tgtU.uHit.value,0,.9,rd);
  if(st.state==='res') pathU.uRes.value=damp(pathU.uRes.value,1,2,rd);
  if(landT>1.7&&!done) finish();
}

/* ---------- camera ---------- */
function camDesign(o,l,port,menu,t){
  if(menu){ if(port){ o.set(.35,DY+1.0,17.6); l.set(.35,DY+.22,0); } else { o.set(.62+Math.sin(t*.15)*.25,DY+.2,13.2); l.set(.62,DY-.22,0); } }
  else { if(port){ o.set(.06,DY-.2,18.6); l.set(.06,DY-.62,0); } else if(innerHeight<520){ o.set(.1,DY+.2,8.6); l.set(.1,DY-.62,0); } else { o.set(-.05,DY+.4,9.1); l.set(-.05,DY-.32,0); } } }
function camPad(o,l,port){ if(port){ o.set(1.5,.85,8.6); l.set(.05,1.45,0); } else { o.set(2.5,.68,6.6); l.set(.1,1.18,0); } }
function camStep(t,rd,port,menu){
  if(menu||phase==='design'){ camDesign(CP,CL,port,menu,t); }
  else if(tw){ const k=E.io(clamp(tw.t/tw.dur,0,1)), kk=tw.arm?k:1-k; camDesign(CA,CB,port,false,t); camPad(CC,CD,port);
    if(!tw.arm&&tw.from){ CC.copy(tw.from); CD.copy(tw.fromL); }
    CP.lerpVectors(CA,CC,kk); CL.lerpVectors(CB,CD,kk); }
  else if(phase==='count'){ camPad(CP,CL,port); const k=1-clamp(cdT/3,0,1); CP.z-=k*.35; CP.x-=k*.12; }
  else if(phase==='flight'&&F){
    const rp=rocket.position, spd=Math.hypot(F.vx,F.vy), ts=tScale;
    CA.set(rp.x+1.75,rp.y-1.25,(port?9.6:7.4)+Math.min(4,spd*.03)); CB.set(rp.x+.1,rp.y+.95,0);
    const hold=1-sstep(.55,1.5,F.t); camPad(CC,CD,port); CA.lerp(CC,hold); CB.x=lerp(CB.x,CD.x,hold); CB.y=lerp(CB.y,Math.max(CD.y,rp.y+.4),hold);
    const ka=NAT?sstep(NAT.tApo-2.8,NAT.tApo-1.3,F.t):0, out=F.chute?sstep(F.deployT+.9,F.deployT+3,F.t):0;
    const ty=target*SCF, dy=clamp(ty-rp.y,-3,3);
    CC.set(rp.x+1.3,rp.y-.35+dy*.25,port?13.6:10.6); CD.set(rp.x+.15,rp.y+.25+dy*.4,0); CA.lerp(CC,ka*(1-out)); CB.lerp(CD,ka*(1-out));
    if(F.chute){ // frame the canopy and the rocket together; in portrait, keep them clear of the HUD column on the left
      const my=(rp.y+chP.y+1.5)*.5, mx=(rp.x+chP.x)*.5-(port?.55:0), kc=E.o(chuteK); CA.x=lerp(CA.x,mx+1.4,kc); CB.x=lerp(CB.x,mx,kc); CA.y=lerp(CA.y,my-.6,kc); CB.y=lerp(CB.y,my,kc); CA.z=lerp(CA.z,port?14.5:11.5,kc);
      CC.set(mx+2.5,Math.max(my-1.6,.7),port?15:12); CD.set(mx,my,0); CA.lerp(CC,out); CB.lerp(CD,out); }
    const vx=F.vx*SCF*ts, vy=F.vy*SCF*ts; CA.x+=vx/4; CA.y+=vy/4; CB.x+=vx/5; CB.y+=vy/5; CA.y=Math.max(CA.y,.45);
    CP.copy(CA); CL.copy(CB);
  }
  else if(phase==='landed'&&F){
    if(st.state==='res'){ const xa=F.xApo*SCF, xl=F.x*SCF, x0=Math.min(0,xa,xl)-2, x1=Math.max(0,xa,xl)+2, top=Math.max(F.apo,target)*SCF+2.5, tn=Math.tan(18*Math.PI/180);
      const dist=Math.max(top*1.2/(2*tn),(x1-x0)*1.1/(2*tn*innerWidth/innerHeight))+2; CP.set((x0+x1)/2+dist*.14+Math.sin(t*.08)*2,top*.42,dist); CL.set((x0+x1)/2,top*.5,0); }
    else { const lx=rocket.position.x, a=.55+Math.sin(t*.2)*.12, R=port?9:7.4; CP.set(lx+Math.sin(a)*R,port?1.9:1.55,Math.cos(a)*R); CL.set(lx,.55,0); }
  }
  st.camP.copy(CP); st.camL.copy(CL);
}

/* ---------- DOM overlays, placed after the frame renders so they match the camera exactly ---------- */
let domQ=false, orient='', ringLate=false;
function tf(e,x,y){ e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
function tfc(e,x,y){ e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; }
function seg(e,x0,y0,x1,y1){ const dx=x1-x0, dy=y1-y0; e.style.transform=`translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) rotate(${Math.atan2(dy,dx).toFixed(4)}rad) scaleX(${(Math.hypot(dx,dy)/100).toFixed(4)})`; }
function placeDOM(){
  domQ=false;
  if(st.state==='menu'){ notesUpdate(st); return; }
  if(st.state!=='play') return;
  if(phase==='design') placeDesign();
  if(phase==='flight'&&ev.win&&F){ centreOf(RC); pj(RC,P0); tf(ring,P0.x,P0.y); const dtA=NAT.tApo-F.t, late=dtA<0;
    ringO.style.transform=`scale(${late?Math.max(.15,1+dtA*.9).toFixed(3):(1+dtA*2.4).toFixed(3)})`; if(late!==ringLate){ ringLate=late; ring.classList.toggle('late',late); } }
}
function placeDesign(){
  rocket.updateMatrixWorld(true); const g=DC.g, Ls=g.L*S6;
  const tl=pj(rkW(0,0,0,V2),P0), no=pj(rkW(0,Ls,0,V2),P1);
  let ax=no.x-tl.x, ay=no.y-tl.y; const al=Math.hypot(ax,ay)||1; ax/=al; ay/=al; AX.x=ax; AX.y=ay;
  const vert=Math.abs(ay)>Math.abs(ax); let nx=-ay, ny=ax; if(vert?nx>0:ny<0){ nx=-nx; ny=-ny; }
  // the four fin tips: the deepest one on the rail side sets the rail offset, the furthest on the other side carries the handle
  const r=(R0*.96+g.s)*S6, ty=(g.Cr-g.Xr)*S6; let ext=0, best=1e9;
  for(let k=0;k<4;k++){ const a=k*HP; pj(rkW(Math.cos(a)*r,ty,Math.sin(a)*r,V2),P2); const s=(P2.x-tl.x)*nx+(P2.y-tl.y)*ny; ext=Math.max(ext,s); if(s<best){ best=s; P3.x=P2.x; P3.y=P2.y; } }
  FO.x=-nx; FO.y=-ny;
  const off=ext+30, cg=pj(rkW(0,(g.L-DC.cg)*S6,0,V2),P4), cp=pj(rkW(0,(g.L-DC.cp)*S6,0,V2),P5);
  const re=vert?.55:1; seg(rail,tl.x+nx*off,tl.y+ny*off,lerp(tl.x,no.x,re)+nx*off,lerp(tl.y,no.y,re)+ny*off);
  const gx=cg.x+nx*off, gyy=cg.y+ny*off, cx=cp.x+nx*off, cy=cp.y+ny*off;
  seg(drCG,cg.x,cg.y,gx,gyy); seg(drCP,cp.x,cp.y,cx,cy); seg(dim,gx,gyy,cx,cy);
  tf(mCG,gx,gyy); tf(mCP,cx,cy);
  const sep=(gx-cx)*ax+(gyy-cy)*ay, sp=Math.abs(sep)<34?(sep>=0?1:-1)*(17-Math.abs(sep)/2):0; // when the markers crowd, each label steps away from the other
  tfc(lCG,gx+nx*22+ax*sp,gyy+ny*22+ay*sp); tfc(lCP,cx+nx*22-ax*sp,cy+ny*22-ay*sp);
  tfc(stabL,(gx+cx)/2+nx*(vert?70:52),(gyy+cy)/2+ny*(vert?70:52));
  tf(hN,no.x+ax*14,no.y+ay*14); tf(hF,P3.x,P3.y);
  const o=vert?'v':'h'; if(o!==orient){ orient=o; hN.classList.toggle('vert',vert); hF.classList.toggle('vert',!vert); hF.classList.toggle('lbl-u',!vert); }
}

/* test hooks for the playtest harness */
st.dbg={ get phase(){return phase}, get F(){return F}, get NAT(){return NAT}, get tScale(){return tScale}, get d(){return d}, get target(){return target}, set target(v){ target=v; setT($o('Target'),v+' m'); layoutGauge(); },
  set(dd){ Object.assign(d,dd); designChanged(); return DC.stab; },
  snap(){ snap=true; S.stSnap=true; },
  ff(sec){ const r=S.rdt; S.rdt=.05; for(let i=0,n=Math.round(sec/.05);i<n;i++){ S.t+=.05; st.update(.05,S.t); } S.rdt=r; S.stSnap=true; },
  until(fn,max=4000){ const r=S.rdt; S.rdt=.05; let i=0; for(;i<max&&!fn(st.dbg);i++){ S.t+=.05; st.update(.05,S.t); } S.rdt=r; S.stSnap=true; return i; } };
})();

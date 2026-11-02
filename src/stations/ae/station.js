/* ================= AETOS: HOLD THE SKY =================
   Counter-drone command. One picture of the airspace: a radar scope drawn in a shader over a contour map,
   quadcopter contacts with screen-space track symbology, interceptors on proportional navigation, a jammer.
   The loop is the game: detect, identify, decide, act. */
(()=>{
const st=mkStation('ae',{arrive:new T.Vector3(0,5,7)});
const sc=st.scene, el=st.el;
const KM=1.2, RS=5*KM, SPAWN=RS-.12, GR=11.5, LR=7.6;          // 1 km in world units, scope radius, ground radius, label map half size
const MAXD=48, MAXG=8, MAXM=12, AMMO=6, RELOAD=1.25, JAMCD=10, JAMR=5.4, SWEEP=2.6, NB=36, NR=10, TL=26;
const COL={ink:new T.Color('#F2EEE6'),unk:new T.Color('#B5AFA3'),hos:new T.Color('#FF5636'),fri:new T.Color('#A5C3FF')};
const CLN={unk:0,hos:1,fri:2};
const TYPES={
  scout:{spd:.92,hp:1,sc:.82,pts:100,dmg:.34,name:'Scout',alt:.95},
  swarm:{spd:.58,hp:1,sc:.56,pts:60,dmg:.14,name:'Swarm',alt:.72},
  heavy:{spd:.5,hp:2,sc:1.4,pts:250,dmg:.5,name:'Heavy',alt:1.15},
  friend:{spd:.72,hp:1,sc:.9,pts:-400,dmg:0,name:'Friend',alt:1.65}};
const WAVES=[
  {name:'Scouts inbound',dur:22,bag:{scout:9,friend:4}},
  {name:'Swarms inbound',dur:24,bag:{scout:6,friend:3,swarm:5}},
  {name:'Heavies inbound',dur:26,bag:{scout:6,friend:3,swarm:4,heavy:5}}];
const SITES=[
  {name:'Substation',p:new T.Vector3(2.35,0,1.15),hp:1,hitT:-99,thr:0},
  {name:'Airfield',p:new T.Vector3(-2.45,0,.75),hp:1,hitT:-99,thr:0},
  {name:'Water works',p:new T.Vector3(.35,0,-2.55),hp:1,hitT:-99,thr:0}];
const brg=(x,z)=>{ const b=Math.atan2(x,-z); return b<0?b+TAU:b; };   // compass bearing, clockwise from north (-z)
const id3=n=>'T-'+String(n%1000).padStart(3,'0');

let clk=0, sw=0, game=null, nextId=1, tblT=0, attractT=2, lastIdS=0, layoutKey='', menuDemo=null, aimOn=false, hintT=0;
const V=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3(), V4=new T.Vector3(), V5=new T.Vector3();
const M4=new T.Matrix4(), M5=new T.Matrix4(), Qn=new T.Quaternion(), EU=new T.Euler(), SCL=new T.Vector3(), ZF=new T.Vector3(0,0,1), TC=new T.Color();

/* pools: contacts, swarm groups, interceptors, scope paints, ground events */
const D=[...Array(MAXD)].map((_,i)=>({i,on:false,p:new T.Vector3(),v:new T.Vector3(),q:new T.Quaternion(),goal:new T.Vector3(),off:new T.Vector3(),
  type:'scout',cls:'unk',hp:1,id:0,site:0,grp:null,ph:0,yaw:0,yawR:0,roll:0,pitch:0,jam:0,jamHit:false,fall:false,vy:0,spin:0,eng:0,idT:-1,reacted:false,
  demo:false,loiter:false,tk:null,sx:0,sy:0,vis:false,hov:false,rowHov:false,tti:99,flash:0,dmgT:-9,age:0}));
const GP=[...Array(MAXG)].map(()=>({on:false,c:new T.Vector3(),v:new T.Vector3(),site:0,id:0,n:0,ph:0,tk:null,cls:'unk',alt:.72,sx:0,sy:0,vis:false,lead:null,tti:99}));
const MS=[...Array(MAXM)].map(()=>({on:false,live:false,demo:false,p:new T.Vector3(),v:new T.Vector3(),tgt:null,t:0,lost:0,fade:1,tr:new Float32Array(TL*3),trN:0,d0:1,k:0}));
const PB=[...Array(NB)].map(()=>new T.Vector4(0,0,-99,0)); let pbI=0;
const RG=[...Array(NR)].map(()=>new T.Vector4(0,0,-99,0)); let rgI=0;
function paintAt(x,z,c){ PB[pbI].set(x,z,clk,c); pbI=(pbI+1)%NB; }
function ringAt(x,z,type){ RG[rgI].set(x,z,clk,type); rgI=(rgI+1)%NR; }

/* ---------- DOM: track symbols, site labels, table rows, pips ---------- */
const marks=$('#aeMarks'), pops=$('#aePops'), rowsEl=$('#aeRows'), banner=$('#aeBanner'), pipsEl=$('#aePips'), jamB=$('#aeJam'), jamP=$('#aeJamP'), jamTx=$('#aeJamT'),
  warnEl=$('#aeWarn'), warnT=$('#aeWarnT'), scoreEl=$('#aeScore'), waveEl=$('#aeWave'), waveN=$('#aeWaveN'), waveM=$('#aeWaveM'), cntEl=$('#aeCount'), hintEl=$('#aeHint');
const SYM='<svg class="sym" viewBox="-12 -12 24 24" aria-hidden="true"><path class="u" d="M-8-8H8V8H-8Z"/><path class="h" d="M0-10.5 10.5 0 0 10.5-10.5 0Z"/><circle class="f" r="9"/><path class="g" d="M-11-5V-11H-5M5-11H11V-5M11 5V11H5M-5 11H-11V5"/></svg>';
const TK=[...Array(44)].map(()=>{ const e=document.createElement('div'); e.className='ae-trk';
  e.innerHTML=SYM+'<i class="ldr"></i><i class="ret"></i><span class="lb"><b></b><span></span></span>'; marks.appendChild(e);
  return {e,ldr:e.querySelector('.ldr'),ret:e.querySelector('.ret'),b:e.querySelector('.lb b'),s:e.querySelector('.lb span'),free:true,cls:'',txt:'',id:'',shown:false}; });
function takeTK(mini,grp){ for(const t of TK) if(t.free){ t.free=false; t.cls=''; t.txt=''; t.id=''; t.mini=!!mini; t.grp=!!grp; t.shown=false; return t; } return null; }
function dropTK(t){ if(!t) return; t.free=true; t.e.style.display='none'; t.shown=false; t.e.className='ae-trk'; t.cls=''; }
const SL=SITES.map(s=>{ const e=document.createElement('div'); e.className='ae-site'; e.innerHTML=`<span class="n">${s.name}</span><span class="bar"><i></i></span>`; marks.appendChild(e); return {e,bar:$('.bar i',e),k:'',hp:-1}; });
const PIPS=[...Array(AMMO)].map(()=>{ const i=document.createElement('i'), b=document.createElement('b'); i.appendChild(b); pipsEl.appendChild(i); return {i,b,k:''}; });
const ROWS=[...Array(8)].map(()=>{ const b=document.createElement('button'); b.type='button'; b.className='ae-row'; b.hidden=true; b.dataset.key='ok'; b.dataset.cur='Engage';
  b.innerHTML='<span class="t"></span><span class="c"></span><span class="r"></span><span class="x"></span>'; rowsEl.appendChild(b);
  const r={b,t:b.children[0],c:b.children[1],r:b.children[2],x:b.children[3],d:null,g:null,k:'',cls:'',hov:false};
  b.addEventListener('click',()=>rowEngage(r));
  b.addEventListener('pointerenter',()=>{ r.hov=true; }); b.addEventListener('pointerleave',()=>{ r.hov=false; });
  return r; });
const HUD={score:'',wave:'',waveN:'',cnt:'',jam:'',jamCls:'',jamOff:-1,warn:'',warnOn:false,pipOut:false};

/* ---------- the radar: a plan position indicator, drawn in one shader ----------
   A graduated bezel around the glass. Inside, raw video: a sweep with a full turn of phosphor afterglow, ground clutter
   and returns that flash blue-white when painted and fade to amber, smeared along the bearing by the beam's width.
   Range rings, bearing lines and site symbols are drawn by the display electronics over the raw video.
   Lines are antialiased in pixel space: a world distance is divided by how far one pixel reaches along the line's normal. */
const BZ=RS+1.05;
const GROUND_F=`
uniform float uNow,uSw,uLab,uBoot;
uniform vec4 uB[${NB}]; uniform vec4 uR[${NR}]; uniform vec4 uSite[3]; uniform vec3 uThr; uniform vec2 uJam;
uniform vec3 uInk,uHos,uFri,uUnk; uniform sampler2D tLab,tH;
varying vec2 vP;
#define KM ${KM.toFixed(4)}
#define RS ${RS.toFixed(4)}
#define BZ ${BZ.toFixed(4)}
#define GR ${GR.toFixed(4)}
#define LR ${LR.toFixed(4)}
#define SWP ${SWEEP.toFixed(3)}
#define TAU 6.2831853
float h21(vec2 p){ p=fract(p*vec2(233.34,851.73)); p+=dot(p,p+23.45); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
float pxw(vec2 n,vec2 jx,vec2 jy){ return max(length(vec2(dot(jx,n),dot(jy,n))),1e-5); }
float ln(float dpx,float w){ return clamp(w+.5-dpx,0.,1.); }
float band(float x,float a,float b,float g){ return clamp((x-a)/g+.5,0.,1.)*clamp((b-x)/g+.5,0.,1.); }
float tick(float br,float r,float n,float gT){ float a=abs(fract(br/(TAU/n)+.5)-.5)*(TAU/n)*r; return a/gT; }
void main(){
  vec2 p=vP; float r=length(p);
  if(r>BZ+.7) discard;
  vec2 jx=dFdx(p), jy=dFdy(p);
  vec2 rn=p/max(r,1e-4), tn=vec2(-rn.y,rn.x);
  float gR=pxw(rn,jx,jy), gT=pxw(tn,jx,jy);
  float br=atan(p.x,-p.y); if(br<0.) br+=TAU;
  float dA=mod(uSw-br,TAU);
  float boot=smoothstep(r-.8,r,uBoot*(BZ+1.));            // the display draws itself outward when you arrive
  vec3 PH=vec3(1.,.69,.38), FL=vec3(.9,.95,1.);           // phosphor: amber persistence, blue-white flash
  vec3 col=vec3(0.);
  // ---- the bezel: a matte ring with a degree scale and the bearing numbers
  float bz=band(r,RS+.05,BZ,gR);
  if(bz>0.){
    float rel=(r-RS)/(BZ-RS);
    col+=vec3(.026,.024,.022)*bz*(.75+.25*smoothstep(1.,.2,rel));
    float tk=ln(tick(br,r,360.,gT),.06)*band(r,RS+.08,RS+.2,gR)*.4
            +ln(tick(br,r,72.,gT),.12)*band(r,RS+.08,RS+.29,gR)*.7
            +ln(tick(br,r,36.,gT),.18)*band(r,RS+.08,RS+.36,gR)
            +ln(tick(br,r,12.,gT),.32)*band(r,RS+.08,RS+.46,gR);
    float rim=ln(abs(r-(RS+.06))/gR,.55)+ln(abs(r-BZ)/gR,.45)*.6+ln(abs(r-(BZ-.1))/gR,.15)*.3;
    float sm=exp(-pow(min(dA,TAU-dA)*r/.07,2.))*band(r,RS+.08,RS+.5,gR);   // the sweep's bearing, read off the scale
    col+=(uInk*(tk*.52+rim*.42)+FL*sm*.7)*boot;
  }
  // ---- the glass
  if(r<RS+.06){
    float inS=band(r,0.,RS,gR);
    float glow=exp(-dA*1.05), wash=exp(-dA*2.6), fresh=exp(-dA*10.);
    float rk=r/KM;
    float grain=vn(p*46.+floor(uNow*10.)*17.3);
    col+=(vec3(.010,.009,.007)+PH*(.004+.026*grain*wash)*smoothstep(0.,.6,r))*inS;
    // ground clutter: high ground returns the beam as mottled patches that fade between sweeps
    float h=texture2D(tH,p/(2.*GR)+.5).r, cm=smoothstep(.55,.74,h)*smoothstep(.4,1.3,r);
    float mott=vn(p*24.)*.65+vn(p*63.)*.35;
    col+=PH*cm*mott*(.03+.3*glow+.5*fresh)*inS;
    col+=PH*smoothstep(.8,.05,r)*smoothstep(.5,.95,vn(p*31.+floor(uNow*5.)*3.1))*(.22*glow+.4*fresh);   // near-in clutter
    // display electronics: range rings, dashed bearing lines, the edge of coverage, the antenna mark
    float ring=ln(abs(fract(rk+.5)-.5)*KM/gR,.16)*step(.5,rk)*step(rk,4.5);
    float spoke=ln(tick(br,r,12.,gT),.08)*band(r,.35*KM,RS,gR)*step(.45,fract(r*2.6));
    float outer=ln(abs(r-RS)/gR,.65);
    float cross=ln(abs(p.x)/pxw(vec2(1.,0.),jx,jy),.1)*band(r,.1,.3,gR)+ln(abs(p.y)/pxw(vec2(0.,1.),jx,jy),.1)*band(r,.1,.3,gR)+ln(abs(r-.06)/gR,.25);
    col+=uInk*(ring*.13+spoke*.06+outer*.5+cross*.35)*(1.+wash*.9)*boot;
    // the sweep: a bright trace with a soft leading flare
    float sA=dA>3.14159?dA-TAU:dA;
    float sl=ln(abs(r*sin(sA))/gT,.6)*step(abs(sA),1.)*inS;
    col+=(FL*sl*1.15+PH*wash*.045*smoothstep(0.,RS,r)*inS)*boot;
    // raw returns, painted by the sweep and left to fade
    for(int i=0;i<${NB};i++){
      vec4 b=uB[i]; vec2 d=p-b.xy;
      if(abs(d.x)>.7||abs(d.y)>.7) continue;
      float age=uNow-b.z; if(age<0.||age>SWP*2.5) continue;
      float rb=length(b.xy); vec2 bn=b.xy/max(rb,1e-4); float dr=dot(d,bn), dt=dot(d,vec2(-bn.y,bn.x));
      float sT=.03+rb*.022, sR=.036;
      float core=exp(-dr*dr/(sR*sR)-dt*dt/(sT*sT)), halo=exp(-dot(d,d)/.05);
      float k=exp(-age*2.4)*1.25+.5*exp(-age*.45);
      col+=mix(PH,FL,exp(-age*5.))*(core*1.7+halo*.13)*k;
    }
    // glass: a little darker toward the rim, a faint reflection up and to the left
    col*=1.-smoothstep(RS*.5,RS,r)*.22;
    col+=vec3(.013,.013,.015)*smoothstep(RS*.9,0.,length(p-vec2(-RS*.42,-RS*.5)))*inS;
  }
  // bearing numbers on the bezel, range numbers on the glass
  if(r<BZ) col+=uInk*texture2D(tLab,vec2(p.x,-p.y)/(2.*LR)+.5).r*uLab*boot;
  // ---- the three defended sites: a square symbol, a dashed keep-out ring, threat and hit pulses
  for(int i=0;i<3;i++){
    vec4 s=uSite[i]; vec2 d=p-s.xy; float rr=length(d); float ha=uNow-s.w; bool hit=ha>0.&&ha<1.8;
    if(rr>.75&&!hit) continue;
    vec2 en=d/max(rr,1e-4); float g=pxw(en,jx,jy);
    float thr=uThr[i], alive=step(.001,s.z);
    vec3 rc=mix(uInk,uHos,max(thr,1.-alive));
    float ring=0.;
    if(abs(rr-.64)<.1) ring=ln(abs(rr-.64)/g,.3)*step(.45,fract(atan(d.y,d.x)/TAU*30.+uNow*.05))*(.3+thr*(.5+.4*sin(uNow*14.)));
    float q=max(abs(d.x),abs(d.y)), gq=max(pxw(vec2(1.,0.),jx,jy),pxw(vec2(0.,1.),jx,jy));
    float sq=ln(abs(q-.1)/gq,.35)*alive+ln(abs(q-.1)/gq,.35)*(1.-alive)*.4;
    float x1=(1.-alive)*ln(abs(d.x-d.y)*.707/gq,.3)*step(q,.1), x2=(1.-alive)*ln(abs(d.x+d.y)*.707/gq,.3)*step(q,.1);
    float fill=smoothstep(.64,.2,rr)*(.012+thr*.05);
    float pulse=hit?ln(abs(rr-(.64+ha*1.15))/g,.7)*exp(-ha*2.)+smoothstep(.7,0.,rr)*exp(-ha*3.)*.25:0.;
    col+=rc*(ring+sq*.85+x1+x2+fill)*boot+uHos*pulse;
  }
  // ---- events: intercept, site hit, impact, launch, wave start
  for(int i=0;i<${NR};i++){
    vec4 e=uR[i]; float age=uNow-e.z; if(age<0.||age>2.6) continue;
    vec2 d=p-e.xy; float rr=length(d); if(rr>3.6&&e.w<3.5) continue;
    float R, a; vec3 cc;
    if(e.w<.5){ R=.06+age*1.9; a=exp(-age*2.4); cc=FL; }
    else if(e.w<1.5){ R=.3+age*1.3; a=exp(-age*1.5); cc=uHos; }
    else if(e.w<2.5){ R=.04+age*.8; a=exp(-age*2.8); cc=PH; }
    else if(e.w<3.5){ R=.1+age*1.4; a=exp(-age*3.2); cc=uInk; }
    else { R=age*8.; a=.7*exp(-age*1.2)*step(rr,RS+.2); cc=uInk; }
    float g=pxw(d/max(rr,1e-4),jx,jy);
    col+=cc*a*(ln(abs(rr-R)/g,.45)*.95+exp(-abs(rr-R)*12.)*.14);
  }
  // ---- our jammer: a front that rolls out, with noise strobes along random bearings behind it
  if(uJam.y>0.){ float d=abs(r-uJam.x);
    float strobe=step(.84,vn(vec2(br*44.,floor(uNow*14.))))*step(r,uJam.x)*step(r,RS);
    col+=uFri*uJam.y*(ln(d/gR,.7)+exp(-d*4.)*.3+step(r,min(uJam.x,RS))*.03)+PH*uJam.y*strobe*.3; }
  gl_FragColor=vec4(col*(1.-smoothstep(BZ,BZ+.7,r)),1.);
}`;

const GROUND_V=`varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }`;

/* ---------- materials ---------- */
const INST_V=`
#ifdef USE_INSTANCING
  p=instanceMatrix*p; n=mat3(instanceMatrix)*n;
#endif
#ifdef USE_INSTANCING_COLOR
  vC=instanceColor;
#endif
`;
// contacts: dark airframe, class colour on the rim, a soft top light
const droneMat=new T.ShaderMaterial({uniforms:{uBase:{value:new T.Color('#4a453e')}},
  vertexShader:`varying vec3 vN,vW,vC; void main(){ vec4 p=vec4(position,1.); vec3 n=normal; vC=vec3(1.); ${INST_V}
    vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(mat3(modelMatrix)*n); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform vec3 uBase; varying vec3 vN,vW,vC; void main(){ vec3 n=normalize(vN), V=normalize(cameraPosition-vW);
    float up=n.y*.5+.5, fr=pow(1.-abs(dot(n,V)),2.);
    gl_FragColor=vec4(uBase*(.18+.82*up*up)+vC*(.12+fr*1.25),1.); }`});
// rotor discs: two blurred blades turning, per-instance phase and direction
const RRAD=.085;
const rotorMat=new T.ShaderMaterial({uniforms:{uT:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`attribute float aSp; varying vec2 vL; varying float vSp; varying vec3 vC; void main(){ vec4 p=vec4(position,1.); vec3 n=vec3(0.,1.,0.); vC=vec3(1.); vL=position.xz/${RRAD}; vSp=aSp; ${INST_V}
    gl_Position=projectionMatrix*viewMatrix*modelMatrix*p; }`,
  fragmentShader:`uniform float uT; varying vec2 vL; varying float vSp; varying vec3 vC; void main(){ float r=length(vL); if(r>1.) discard;
    float a=atan(vL.y,vL.x), dir=vSp>.5?1.:-1.;
    float bl=pow(abs(cos(a-uT*41.*dir-vSp*9.)),22.);
    float disc=smoothstep(1.,.78,r)*smoothstep(.1,.28,r), rim=smoothstep(.08,0.,abs(r-.93));
    gl_FragColor=vec4(mix(vec3(.95,.92,.88),vC,.5)*(bl*disc*.5+disc*.06+rim*.2),1.); }`});
// point lights (nav lights, ground feet, exhaust): size in world units
const ptMat=new T.ShaderMaterial({uniforms:{uPx:G.uPx},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`uniform float uPx; attribute vec3 aC; attribute float aS; varying vec3 vC; void main(){ vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS>0.?clamp(aS*uPx/-mv.z,1.5,64.):0.; }`,
  fragmentShader:`varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vC*(exp(-d*d*30.)*1.3+exp(-d*d*7.)*.22),1.); }`});
// soft puffs: smoke, flashes, muzzle blasts. aP = (progress, start size, end size, opacity)
const puffMat=new T.ShaderMaterial({uniforms:{uPx:G.uPx},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`uniform float uPx; attribute vec4 aP; attribute vec3 aC; varying vec3 vC; varying float vA; void main(){ vC=aC;
    if(aP.x>=1.){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=0.; vA=0.; return; }
    vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(mix(aP.y,aP.z,sqrt(aP.x))*uPx/-mv.z,1.,180.); vA=aP.w*(1.-aP.x)*(1.-aP.x)*smoothstep(0.,.05,aP.x); }`,
  fragmentShader:`varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(vC*vA*a*a,1.); }`});
// lit edges for the structures: brighter toward the top, red when hit
const edgeMat=()=>new T.ShaderMaterial({uniforms:{uC:{value:new T.Color('#F2EEE6')},uHit:{value:0},uDead:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`varying float vY; void main(){ vec4 w=modelMatrix*vec4(position,1.); vY=w.y; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform vec3 uC; uniform float uHit,uDead; varying float vY; void main(){ vec3 red=vec3(1.,.34,.21);
    vec3 c=mix(uC,red,clamp(max(uHit,uDead*.85),0.,1.)); float b=(.38+.75*clamp(vY/.32,0.,1.))*(1.+uHit*1.6)*(1.-uDead*.45);
    gl_FragColor=vec4(c*b,1.); }`});
const faceMat=new T.MeshBasicMaterial({color:0x0b0a09,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
// jammer wall: a thin curtain that rides the expanding front
const jamWallMat=new T.ShaderMaterial({uniforms:{uA:{value:0},uT:G.uTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform float uA,uT; varying vec2 vU; void main(){ float y=vU.y; float s=.55+.45*sin(vU.x*6.2831*90.+uT*6.)*sin(y*40.-uT*9.);
    gl_FragColor=vec4(vec3(.65,.76,1.)*uA*pow(1.-y,3.)*s*.32,1.); }`});
const lineMat=new T.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending});

/* ---------- geometry helpers ---------- */
function merge(list){ // non-indexed merge of position + normal
  let n=0; const parts=list.map(g=>{ const b=g.index?g.toNonIndexed():g; n+=b.attributes.position.count; return b; });
  const P=new Float32Array(n*3), N=new Float32Array(n*3); let o=0;
  parts.forEach(b=>{ P.set(b.attributes.position.array,o*3); N.set(b.attributes.normal.array,o*3); o+=b.attributes.position.count; });
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); g.setAttribute('normal',new T.BufferAttribute(N,3)); return g;
}
function at(g,x,y,z,ry,rx,rz){ if(rx) g.rotateX(rx); if(rz) g.rotateZ(rz); if(ry) g.rotateY(ry); g.translate(x,y,z); return g; }
// a structure: dark faces with lit edges. parts: geometries already placed
function structure(parts,mat){ const grp=new T.Group(); parts.forEach(g=>{ grp.add(new T.Mesh(g,faceMat)); grp.add(new T.LineSegments(new T.EdgesGeometry(g,30),mat)); }); return grp; }
/* the radar view is a display, not a diorama: structures stay in the scene graph for the anchors but are never drawn */
// quadcopter: body, canopy, four arms, motor pods, a camera gimbal at the front (+z)
function quadGeo(){
  const L=[]; const arm=.2;
  L.push(at(new T.CylinderGeometry(.07,.085,.045,8),0,0,0,Math.PI/8));
  L.push(at(new T.CylinderGeometry(.045,.06,.03,8),0,.035,0,Math.PI/8));
  [Math.PI/4,-Math.PI/4].forEach(a=>L.push(at(new T.BoxGeometry(arm*2.15,.018,.022),0,.004,0,a)));
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([x,z])=>L.push(at(new T.CylinderGeometry(.022,.02,.04,8),x*arm*.72,.012,z*arm*.72)));
  L.push(at(new T.SphereGeometry(.024,8,6),0,-.03,.06));
  [-1,1].forEach(x=>L.push(at(new T.BoxGeometry(.008,.05,.008),x*.05,-.04,0)));
  L.push(at(new T.BoxGeometry(.13,.006,.008),0,-.065,0));
  return merge(L);
}
const ARM=.2*.72, ROTY=.04;
const ROT_LOCAL=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,z])=>new T.Matrix4().makeTranslation(x*ARM,ROTY,z*ARM));
function missileGeo(){
  const L=[]; L.push(at(new T.CylinderGeometry(.016,.016,.15,8),0,0,0,0,Math.PI/2));
  L.push(at(new T.ConeGeometry(.016,.05,8),0,0,.1,0,Math.PI/2));
  L.push(at(new T.BoxGeometry(.07,.003,.03),0,0,-.06)); L.push(at(new T.BoxGeometry(.003,.07,.03),0,0,-.06));
  return merge(L);
}

/* ---------- build: ground, command post, sites, contacts, interceptors, effects ---------- */
let GU, labCv, labCx, labTex, labMode=-1, cpAnt, cpMat, inst, rot, rotSp, lights, lP, lC, lS, drops, dP, dC, msl, trails, tP, tC, puffs, pP, pA, pC, pV, pL, pI=0, debris, jamWall;
const NL=MAXD*3+MAXM+1;
function drawLabels(mob){
  if(!labCx||labMode===+mob) return; labMode=+mob;
  const N=labCv.width, k=N/(2*LR), x=labCx; x.fillStyle='#000'; x.fillRect(0,0,N,N); x.fillStyle='#fff'; x.textBaseline='middle';
  const put=(t,wx,wz,al,fs)=>{ x.font=`${fs}px "Michroma", sans-serif`; x.textAlign=al; x.fillText(t,N/2+wx*k,N/2+wz*k); };
  for(let a=0;a<360;a+=mob?30:10){ const b=a*Math.PI/180, rr=RS+(a%30?.62:.74), big=a%30===0; if(mob&&!big) continue; put(String(a).padStart(3,'0'),Math.sin(b)*rr,-Math.cos(b)*rr,'center',big?(mob?44:24):15); }
  for(let km=1;km<=5;km++){ if(mob&&km%2===0) continue; const rr=km*KM-(mob?.2:.12), b=42*Math.PI/180; put(km+' km',Math.sin(b)*rr+.06,-Math.cos(b)*rr,'left',mob?30:17); }
  labTex.needsUpdate=true;
}
// terrain heightfield, baked once: value noise fbm, 4 octaves, over the whole ground disc
function heightTex(){
  const N=512, L=256, R=seeded(11), lat=new Float32Array(L*L); for(let i=0;i<L*L;i++) lat[i]=R();
  const vn=(x,y)=>{ const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy), x0=xi&255, x1=(xi+1)&255, y0=(yi&255)*L, y1=((yi+1)&255)*L;
    const a=lat[y0+x0], b=lat[y0+x1], c=lat[y1+x0], d=lat[y1+x1]; return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; };
  const data=new Uint8Array(N*N);
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){ let x=(i/(N-1)*2-1)*GR*.2+7.3, y=(j/(N-1)*2-1)*GR*.2+2.1, s=0, a=.5;
    for(let o=0;o<4;o++){ s+=a*vn(x,y); const nx=1.6*x-1.2*y+3.1, ny=1.2*x+1.6*y+1.7; x=nx; y=ny; a*=.5; }
    data[j*N+i]=Math.round(clamp(s,0,1)*255); }
  const t=new T.DataTexture(data,N,N,T.RedFormat,T.UnsignedByteType); t.magFilter=t.minFilter=T.LinearFilter; t.generateMipmaps=false; t.needsUpdate=true; return t;
}
st.build=async function(){
  try{ await Promise.race([document.fonts.load('20px "Michroma"'),wait(1500)]); }catch(e){}
  labCv=document.createElement('canvas'); labCv.width=labCv.height=2048; labCx=labCv.getContext('2d');
  labTex=new T.CanvasTexture(labCv); labTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); drawLabels(false);
  GU={uNow:{value:0},uSw:{value:0},uLab:{value:.5},uBoot:{value:1},uB:{value:PB},uR:{value:RG},uSite:{value:SITES.map(s=>new T.Vector4(s.p.x,s.p.z,1,-99))},uThr:{value:new T.Vector3()},
    uJam:{value:new T.Vector2()},uInk:{value:COL.ink},uHos:{value:COL.hos},uFri:{value:COL.fri},uUnk:{value:COL.unk},tLab:{value:labTex},tH:{value:heightTex()}};
  const ground=new T.Mesh(new T.PlaneGeometry(GR*2,GR*2).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:GU,vertexShader:GROUND_V,fragmentShader:GROUND_F,extensions:{derivatives:true}}));
  ground.renderOrder=-2; ground.frustumCulled=false; sc.add(ground);
  // command post: a low octagonal base, an operations block, a launcher, a mast with an array that turns with the sweep
  cpMat=edgeMat();
  sc.add(structure([at(new T.CylinderGeometry(.27,.31,.07,8),0,.035,0,Math.PI/8),at(new T.BoxGeometry(.24,.1,.17),.02,.12,.03),
    at(new T.BoxGeometry(.11,.06,.11),-.15,.1,-.08),at(new T.BoxGeometry(.022,.34,.022),.06,.34,-.04)],cpMat));
  cpAnt=structure([at(new T.BoxGeometry(.34,.075,.016),0,0,0),at(new T.BoxGeometry(.02,.02,.08),0,0,.04)],cpMat); cpAnt.position.set(.06,.53,-.04); sc.add(cpAnt); cpAnt.visible=false;
  sc.children.forEach(o=>{ if(o.isGroup&&o!==cpAnt) o.visible=false; });
  // the three sites, each a small clean structure
  const SG=[
    ()=>[at(new T.BoxGeometry(.8,.024,.52),0,.012,0),...[-.24,0,.24].map(x=>at(new T.BoxGeometry(.13,.13,.12),x,.09,-.1)),
      at(new T.BoxGeometry(.018,.3,.018),-.34,.15,.15),at(new T.BoxGeometry(.018,.3,.018),.34,.15,.15),at(new T.BoxGeometry(.7,.018,.018),0,.3,.15),at(new T.BoxGeometry(.16,.08,.11),-.12,.06,.15)],
    ()=>[at(new T.BoxGeometry(1.15,.012,.15),0,.006,-.06,.32),at(new T.BoxGeometry(.5,.01,.05),.06,.005,.15,.32),at(new T.BoxGeometry(.22,.1,.16),.2,.05,.3,.32),
      at(new T.BoxGeometry(.04,.22,.04),-.3,.11,.22),at(new T.BoxGeometry(.1,.05,.1),-.3,.245,.22)],
    ()=>[at(new T.CylinderGeometry(.13,.13,.13,20),-.17,.065,-.06),at(new T.CylinderGeometry(.13,.13,.13,20),.17,.065,-.06),
      at(new T.CylinderGeometry(.19,.19,.035,24),0,.018,.24),at(new T.BoxGeometry(.14,.08,.1),0,.04,-.31)]];
  SITES.forEach((s,i)=>{ s.mat=edgeMat(); const g=structure(SG[i](),s.mat); g.position.copy(s.p); sc.add(g); s.grp=g; g.visible=false; });
  // contacts: instanced airframes, instanced rotor discs
  inst=new T.InstancedMesh(quadGeo(),droneMat,MAXD); inst.frustumCulled=false;
  rot=new T.InstancedMesh(new T.CircleGeometry(RRAD,20).rotateX(-Math.PI/2),rotorMat,MAXD*4); rot.frustumCulled=false;
  rotSp=new Float32Array(MAXD*4); for(let i=0;i<MAXD*4;i++){ const k=i%4; rotSp[i]=(k===0||k===3)?.72+Math.random()*.28:Math.random()*.28; }
  rot.geometry.setAttribute('aSp',new T.InstancedBufferAttribute(rotSp,1));
  for(let i=0;i<MAXD;i++){ inst.setColorAt(i,COL.unk); for(let k=0;k<4;k++) rot.setColorAt(i*4+k,COL.unk); }
  inst.count=0; rot.count=0; sc.add(inst); sc.add(rot); inst.visible=rot.visible=false;
  // point lights: two nav lights and a ground foot per contact, one exhaust per interceptor
  lP=new Float32Array(NL*3); lC=new Float32Array(NL*3); lS=new Float32Array(NL);
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.BufferAttribute(lP,3)); lg.setAttribute('aC',new T.BufferAttribute(lC,3)); lg.setAttribute('aS',new T.BufferAttribute(lS,1));
  lg.boundingSphere=new T.Sphere(new T.Vector3(),1e4); lights=new T.Points(lg,ptMat); lights.frustumCulled=false; sc.add(lights);
  // altitude stalks from each contact down to the ground
  dP=new Float32Array(MAXD*6); dC=new Float32Array(MAXD*6);
  const dg=new T.BufferGeometry(); dg.setAttribute('position',new T.BufferAttribute(dP,3)); dg.setAttribute('color',new T.BufferAttribute(dC,3)); dg.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  drops=new T.LineSegments(dg,lineMat); drops.frustumCulled=false; sc.add(drops); drops.visible=false;
  // interceptors and their trails
  msl=new T.InstancedMesh(missileGeo(),new T.MeshBasicMaterial({color:0xFFF4E6}),MAXM); msl.frustumCulled=false; msl.count=0; sc.add(msl); msl.visible=false;
  tP=new Float32Array(MAXM*(TL-1)*6); tC=new Float32Array(MAXM*(TL-1)*6);
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(tP,3)); tg.setAttribute('color',new T.BufferAttribute(tC,3)); tg.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  trails=new T.LineSegments(tg,lineMat); trails.frustumCulled=false; sc.add(trails);
  // puffs
  const NP=Math.floor(1500*Q+300); pP=new Float32Array(NP*3); pA=new Float32Array(NP*4); pC=new Float32Array(NP*3); pV=new Float32Array(NP*3); pL=new Float32Array(NP);
  for(let i=0;i<NP;i++) pA[i*4]=1;
  const pg=new T.BufferGeometry(); pg.setAttribute('position',new T.BufferAttribute(pP,3)); pg.setAttribute('aP',new T.BufferAttribute(pA,4)); pg.setAttribute('aC',new T.BufferAttribute(pC,3)); pg.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  puffs=new T.Points(pg,puffMat); puffs.frustumCulled=false; sc.add(puffs);
  debris=Burst(sc,Math.floor(900*Q+200),'#FFE4D6',.055);
  jamWall=new T.Mesh(new T.CylinderGeometry(1,1,1,96,1,true).translate(0,.5,0),jamWallMat); jamWall.visible=false; jamWall.frustumCulled=false; sc.add(jamWall);
};
function puff(x,y,z,vx,vy,vz,life,s0,s1,a,c){
  const N=pL.length, i=pI; pI=(pI+1)%N;
  pP[i*3]=x; pP[i*3+1]=y; pP[i*3+2]=z; pV[i*3]=vx; pV[i*3+1]=vy; pV[i*3+2]=vz; pL[i]=life; pA[i*4]=0; pA[i*4+1]=s0; pA[i*4+2]=s1; pA[i*4+3]=a;
  pC[i*3]=c.r; pC[i*3+1]=c.g; pC[i*3+2]=c.b;
}
const SMOKE=new T.Color(.62,.6,.57), HOT=new T.Color(1,.86,.7), WHITE3=new T.Color(1,.97,.93), RED3=new T.Color(1,.42,.28);

/* ---------- contacts ---------- */
const TINT_B=new T.Color(0,.02,.08), TINT_R=new T.Color(.1,0,0), TINT_J=new T.Color(0,.01,.045);
let hovD=null;
function freeD(){ for(const d of D) if(!d.on) return d; return null; }
function resetD(d,type){ Object.assign(d,{on:true,type,cls:'unk',hp:TYPES[type].hp,id:nextId++,grp:null,ph:Math.random()*TAU,jam:0,jamHit:false,fall:false,vy:0,spin:0,eng:0,idT:-1,reacted:false,
  demo:!game,loiter:false,tk:null,hov:false,rowHov:false,tti:99,flash:0,dmgT:-9,age:0,roll:0,pitch:0,yawR:0,cruise:1,dive:false}); d.v.set(0,0,0); }
function pickSite(){ let n=0; for(const s of SITES) if(s.hp>0) n++; if(!n) return -1; let k=(Math.random()*n)|0; for(let i=0;i<3;i++) if(SITES[i].hp>0&&k--===0) return i; return 0; }
function spawnBearing(si){ const s=SITES[si].p, sb=brg(s.x,s.z); let b=0; for(let k=0;k<12;k++){ b=Math.random()*TAU; if(Math.abs(angDiff(b,sb))>.8) break; } return b; }
function spawnHostile(type){ const si=pickSite(); if(si<0) return null; const d=freeD(); if(!d) return null; resetD(d,type); d.site=si;
  const b=spawnBearing(si); d.p.set(Math.sin(b)*SPAWN,TYPES[type].alt*(.9+Math.random()*.2),-Math.cos(b)*SPAWN); d.cruise=d.p.y; d.yaw=Math.atan2(-d.p.x,-d.p.z);
  d.tk=takeTK(false,false); if(game&&!d.demo) game.hostiles++; return d; }
function spawnFriend(){ const d=freeD(); if(!d) return null; resetD(d,'friend'); const b=Math.random()*TAU, e=b+Math.PI+(Math.random()-.5)*1.1;
  d.p.set(Math.sin(b)*SPAWN,1.5+Math.random()*.3,-Math.cos(b)*SPAWN); d.cruise=d.p.y; d.goal.set(Math.sin(e)*(SPAWN+.9),d.p.y,-Math.cos(e)*(SPAWN+.9));
  d.yaw=Math.atan2(d.goal.x-d.p.x,d.goal.z-d.p.z); d.tk=takeTK(false,false); return d; }
function spawnSwarm(){ let g=null; for(const x of GP) if(!x.on){ g=x; break; } if(!g) return null; const si=pickSite(); if(si<0) return null; const b=spawnBearing(si);
  Object.assign(g,{on:true,site:si,id:nextId++,cls:'unk',ph:Math.random()*TAU,n:0,alt:.66+Math.random()*.12,tti:99,dive:false,lead:null}); g.c.set(Math.sin(b)*SPAWN,g.alt,-Math.cos(b)*SPAWN); g.v.set(0,0,0);
  g.tk=takeTK(false,true);
  for(let k=0;k<5;k++){ const d=freeD(); if(!d) break; resetD(d,'swarm'); d.grp=g; d.site=si; d.id=g.id; const a=k/4*TAU+.4, rr=k===0?0:.25;
    d.off.set(Math.cos(a)*rr,k%2?.05:-.04,Math.sin(a)*rr); d.p.copy(g.c).add(d.off); d.cruise=g.alt+d.off.y; d.yaw=Math.atan2(-g.c.x,-g.c.z); d.tk=takeTK(true,false); g.n++; if(game&&!d.demo) game.hostiles++; }
  return g; }
function release(d){ if(!d.on) return; d.on=false; if(d.tk){ dropTK(d.tk); d.tk=null; } const g=d.grp; d.grp=null;
  if(g&&g.on){ g.n--; if(g.n<=0){ g.on=false; dropTK(g.tk); g.tk=null; } } if(hovD===d) hovD=null; }
function identify(d,silent){
  if(d.cls!=='unk') return; const c=d.type==='friend'?'fri':'hos';
  if(d.grp){ const g=d.grp; g.cls=c; for(const x of D) if(x.on&&x.grp===g&&x.cls==='unk'){ x.cls=c; x.idT=clk; } } else { d.cls=c; d.idT=clk; }
  if(!silent&&game&&!d.demo&&clk-lastIdS>.09){ lastIdS=clk; if(c==='hos') A.chime(13,0,.034); else A.chime(9,0,.03); }
}
function kill(d,how){
  const s=TYPES[d.type].sc, c=d.type==='friend'?COL.fri:COL.hos;
  debris.emit(d.p,Math.floor((d.type==='heavy'?70:d.type==='swarm'?22:40)*(Q*.5+.5)),2.2*s+.6,c,.6,1.1);
  for(let k=0;k<5;k++) puff(d.p.x,d.p.y,d.p.z,(Math.random()-.5)*.4,.12+Math.random()*.2,(Math.random()-.5)*.4,1.5+Math.random(),.1,.5*s+.2,.14,SMOKE);
  if(game&&!d.demo){
    if(d.type==='friend'){ game.score-=400; game.blue++; showBanner(banner,'Friendly down','Minus 400'); A.buzz(); feedback(.35,1,TINT_B); popAt(pops,d.p,'−400','bad'); }
    else { game.score+=TYPES[d.type].pts; game.kills++; if(how==='jam') game.jammed++; popAt(pops,d.p,'+'+TYPES[d.type].pts,d.type==='heavy'?'big':''); }
  }
  release(d);
}
function siteHit(d){
  const s=SITES[d.site], T_=TYPES[d.type], live=game&&!d.demo;
  if(live){ s.hp=Math.max(0,s.hp-T_.dmg); if(s.hp<.03) s.hp=0; }
  s.hitT=clk; s.smk=Math.max(s.smk||0,live?5:1.5); ringAt(s.p.x,s.p.z,1);
  puff(s.p.x,.25,s.p.z,0,0,0,.3,.3,1.6,live?1.8:.6,RED3); debris.emit(V.copy(s.p).setY(.25),live?60:16,2.4,COL.hos,1.2,1.1);
  if(live){ game.leak++; A.alarm(); A.pop(); feedback(.5,1,TINT_R); popAt(pops,V.copy(s.p).setY(.4),'Site hit','bad');
    if(s.hp<=0){ showBanner(banner,s.name+' down','Site lost'); A.boom(); } }
  release(d);
}

/* ---------- interceptors: boost, then proportional navigation ---------- */
function freeM(){ for(const m of MS) if(!m.on) return m; return null; }
function launch(m,d,demo){
  Object.assign(m,{on:true,live:true,demo,tgt:d,t:0,lost:0,fade:1,trN:0,k:0,puffT:0});
  m.p.set(-.15+(Math.random()-.5)*.05,.17,-.08+(Math.random()-.5)*.05);
  V.copy(d.p).sub(m.p).setY(0).normalize(); m.v.set(V.x*.7,3,V.z*.7);
  m.d0=Math.max(.5,d.p.distanceTo(m.p)); d.eng++;
  ringAt(m.p.x,m.p.z,3);
  for(let k=0;k<6;k++) puff(m.p.x,m.p.y,m.p.z,(Math.random()-.5)*.7,Math.random()*.25,(Math.random()-.5)*.7,.9+Math.random()*.5,.08,.42,.18,SMOKE);
  puff(m.p.x,m.p.y+.05,m.p.z,0,0,0,.16,.12,.55,1.6,HOT);
  if(!demo){ A.launch(); A.blip(); }
}
function retarget(m){ let best=null, bd=2.6; for(const d of D){ if(!d.on||d.fall||d.cls!=='hos') continue; const dd=d.p.distanceTo(m.p); if(dd<bd){ bd=dd; best=d; } } if(best) best.eng++; return best; }
function fizzle(m){ m.live=false; if(m.tgt){ m.tgt.eng=Math.max(0,m.tgt.eng-1); m.tgt=null; } puff(m.p.x,m.p.y,m.p.z,0,0,0,.25,.1,.5,.8,HOT); debris.emit(m.p,10,1,null,0,.5); }
function detonate(m,tg){
  m.live=false; m.tgt=null; tg.eng=Math.max(0,tg.eng-1);
  const s=TYPES[tg.type].sc, P=tg.p;
  puff(P.x,P.y,P.z,0,0,0,.2,.2,1.5*s+.5,2.4,WHITE3); puff(P.x,P.y,P.z,0,0,0,.55,.2,.9*s+.35,.8,HOT);
  ringAt(P.x,P.z,0); if(!m.demo) feedback(.16,.35);
  if(game&&!m.demo&&tg.type!=='friend') game.mhit++;
  tg.hp--;
  if(tg.hp<=0){ if(!m.demo){ A.pop(); A.ping(2349,.026); } kill(tg,'msl'); }
  else { tg.dmgT=clk; debris.emit(P,14,1.4,COL.hos,.3,.6); if(!m.demo) A.ping(1760,.03); }
}
function stepMissile(m,dt){
  m.t+=dt; let tg=m.tgt;
  if(tg&&(!tg.on||tg.fall)){ tg=m.tgt=retarget(m); }
  const spd=Math.min(9.5,3+m.t*15);
  if(!tg){ m.lost+=dt; m.v.y-=dt*2; m.v.setLength(spd); }
  else if(m.t<.15){ m.v.y+=dt*8; m.v.setLength(spd); }
  else {
    V.copy(tg.p).sub(m.p); const R2=Math.max(V.lengthSq(),1e-4), R=Math.sqrt(R2);
    V2.copy(tg.v).sub(m.v); const vc=Math.max(1.5,-V.dot(V2)/R);
    V3.crossVectors(V,V2).multiplyScalar(1/R2); V4.copy(V).multiplyScalar(1/R);
    V5.crossVectors(V3,V4).multiplyScalar(4*vc).addScaledVector(V4,spd*2.6).addScaledVector(m.v,-2.6);
    if(V5.length()>80) V5.setLength(80);
    m.v.addScaledVector(V5,dt).setLength(spd);
    // closest approach over this step, in the target's frame
    V.copy(m.p).sub(tg.p); V2.copy(m.v).sub(tg.v).multiplyScalar(dt); const L2=V2.lengthSq(); const u=L2>1e-9?clamp(-V.dot(V2)/L2,0,1):0;
    V.addScaledVector(V2,u);
    if(V.length()<.11+.1*TYPES[tg.type].sc){ m.p.addScaledVector(m.v,dt*u); detonate(m,tg); return; }
  }
  m.p.addScaledVector(m.v,dt);
  if(m.p.y<.03){ m.p.y=.03; fizzle(m); return; }
  if(m.t>4||m.lost>.5) fizzle(m);
}

/* ---------- jammer ---------- */
function nudge(e){ e.classList.remove('no'); void e.offsetWidth; e.classList.add('no'); }
function jam(){
  if(!game||st.state!=='play') return;
  if(game.jamCD>0){ A.beep(220); nudge(jamB); return; }
  game.jamCD=JAMCD; game.jamT=0; game.jams++; for(const d of D) d.jamHit=false;
  A.jam(); feedback(.16,.6,TINT_J); jamB.classList.add('fire'); setTimeout(()=>jamB.classList.remove('fire'),180); hideHint();
}
function jamStep(dt){
  const g=game; g.jamT+=dt; const R=JAMR*E.o(clamp(g.jamT/.85,0,1)), a=1-clamp((g.jamT-.55)/.75,0,1);
  GU.uJam.value.set(R,a); jamWall.visible=false; jamWall.scale.set(Math.max(.01,R),.7+.6*(1-a),Math.max(.01,R)); jamWallMat.uniforms.uA.value=a;
  for(const d of D){ if(!d.on||d.jamHit||d.fall) continue; if(Math.hypot(d.p.x,d.p.z)<R){ d.jamHit=true;
    if(d.type==='swarm'){ d.fall=true; d.vy=.2; d.spin=(Math.random()-.5)*12; identify(d,true); } else if(d.type!=='friend'){ d.jam=3.5; } } }
  if(g.jamT>1.45){ g.jamT=-1; GU.uJam.value.set(0,0); jamWall.visible=false; }
}

/* ---------- movement ---------- */
function steer(d,tx,tz,spd,dt,weave){
  const dist=Math.max(Math.hypot(tx,tz),1e-3); let dx=tx/dist, dz=tz/dist;
  if(weave){ const w=Math.sin(clk*1.25+d.ph)*.42*clamp((dist-1)/3,0,1), px=-dz, pz=dx; dx+=px*w; dz+=pz*w; const n=Math.hypot(dx,dz); dx/=n; dz/=n; }
  const k=1-Math.exp(-2.6*dt); d.v.x+=(dx*spd-d.v.x)*k; d.v.z+=(dz*spd-d.v.z)*k; d.v.y=0;
  return dist;
}
function stepGroup(g,dt){
  if(SITES[g.site].hp<=0){ const n=pickSite(); if(n>=0){ g.site=n; for(const d of D) if(d.on&&d.grp===g) d.site=n; } }
  const s=SITES[g.site].p, spd=TYPES.swarm.spd*(game?1+game.wave*.08:.75);
  const tx=s.x-g.c.x, tz=s.z-g.c.z, dist=Math.max(Math.hypot(tx,tz),1e-3);
  const w=Math.sin(clk*.9+g.ph)*.35*clamp((dist-1)/3,0,1); let dx=tx/dist-tz/dist*w, dz=tz/dist+tx/dist*w; const n=Math.hypot(dx,dz);
  const k=1-Math.exp(-2*dt); g.v.x+=(dx/n*spd-g.v.x)*k; g.v.z+=(dz/n*spd-g.v.z)*k;
  g.c.x+=g.v.x*dt; g.c.z+=g.v.z*dt; g.tti=dist/spd; g.dive=dist<1.2;
}
function stepDrone(d,dt){
  d.age+=dt; const T_=TYPES[d.type];
  if(d.jam>0) d.jam=Math.max(0,d.jam-dt);
  const spd=T_.spd*(game?1+game.wave*.08:.75)*(d.jam>0?.3:1);
  const yaw0=d.yaw;
  if(d.fall){ d.vy-=5.5*dt; d.p.y+=d.vy*dt; d.p.addScaledVector(d.v,dt); d.v.multiplyScalar(Math.exp(-1.2*dt)); d.yaw+=d.spin*dt; d.roll+=d.spin*.5*dt; d.pitch+=d.spin*.3*dt;
    if(Math.random()<dt*25) puff(d.p.x,d.p.y,d.p.z,0,.05,0,.9,.05,.22,.12,SMOKE);
    if(d.p.y<=.04){ ringAt(d.p.x,d.p.z,2); debris.emit(d.p,10,1,COL.hos,.5,.5); kill(d,'jam'); }
    d.q.setFromEuler(EU.set(d.pitch,d.yaw,d.roll,'YXZ')); return; }
  let dist=9;
  if(d.loiter){ const a=clk*.3+d.ph, R=.42; d.p.set(d.goal.x+Math.cos(a)*R,d.cruise+Math.sin(clk*.7)*.05,d.goal.z+Math.sin(a)*R); d.v.set(-Math.sin(a)*R*.3,0,Math.cos(a)*R*.3); }
  else if(d.type==='friend'){ dist=steer(d,d.goal.x-d.p.x,d.goal.z-d.p.z,spd,dt,false); d.p.addScaledVector(d.v,dt); d.p.y=damp(d.p.y,d.cruise,1.5,dt);
    if(dist<.35||(Math.hypot(d.p.x,d.p.z)>SPAWN+.6&&d.age>3)){ release(d); return; } }
  else {
    const g=d.grp;
    if(g&&!g.dive){ const tx=g.c.x+d.off.x-d.p.x, tz=g.c.z+d.off.z-d.p.z; const k=Math.min(1,dt*3.2);
      d.v.x+=(g.v.x+tx*2.6-d.v.x)*k; d.v.z+=(g.v.z+tz*2.6-d.v.z)*k; d.v.y=0; d.p.addScaledVector(d.v,dt); d.p.y=damp(d.p.y,d.cruise+Math.sin(clk*2+d.ph)*.03,2.5,dt);
      d.tti=g.tti; }
    else {
      if(SITES[d.site].hp<=0){ const n=pickSite(); if(n>=0) d.site=n; }
      const s=SITES[d.site].p; dist=steer(d,s.x-d.p.x,s.z-d.p.z,spd,dt,!g); d.p.addScaledVector(d.v,dt);
      const alt=dist<1.5?lerp(.3,d.cruise,clamp((dist-.35)/1.15,0,1)):d.cruise; d.p.y=damp(d.p.y,alt,2.4,dt);
      d.tti=dist/Math.max(spd,.05);
      if(dist<.36&&d.p.y<.66){ siteHit(d); return; }
    }
    if(d.jam>0){ d.p.x+=Math.sin(clk*7+d.ph)*dt*.18; d.p.z+=Math.cos(clk*6+d.ph)*dt*.18; }
  }
  const sp=Math.hypot(d.v.x,d.v.z);
  if(sp>.02){ d.yaw+=angDiff(Math.atan2(d.v.x,d.v.z),d.yaw)*Math.min(1,dt*4.5); }
  const rate=angDiff(d.yaw,yaw0)/Math.max(dt,1e-3);
  d.roll=damp(d.roll,clamp(-rate*sp*.55,-.5,.5)+(d.jam>0?Math.sin(clk*11+d.ph)*.25:0),5,dt);
  d.pitch=damp(d.pitch,clamp(sp*.38,0,.36),4,dt);
  d.q.setFromEuler(EU.set(d.pitch,d.yaw,d.roll,'YXZ'));
}

/* ---------- engagement: forgiving picking, never on an identified friendly ---------- */
function pick(x,y,R){
  let best=null, bs=R;
  for(const d of D){ if(!d.on||d.fall||!d.vis) continue; let s=Math.hypot(d.sx-x,d.sy-y); if(s>R) continue;
    s+=d.cls==='hos'?-10:d.cls==='fri'?28:0; if(d.eng>=d.hp) s+=14; if(s<bs){ bs=s; best=d; } }
  for(const g of GP){ if(!g.on||!g.vis) continue; const s=Math.hypot(g.sx-x,g.sy-y)+6; if(s<bs){ const l=groupLead(g); if(l){ bs=s; best=l; } } }
  return best;
}
function groupLead(g){ let best=null, bt=1e9; for(const d of D){ if(!d.on||d.grp!==g||d.fall) continue; const t=Math.hypot(SITES[d.site].p.x-d.p.x,SITES[d.site].p.z-d.p.z)+(d.eng>0?5:0); if(t<bt){ bt=t; best=d; } } return best; }
function refuse(d,msg){ A.beep(220); if(d) popAt(pops,V.copy(d.p).setY(d.p.y+.25),msg,'bad'); }
function engage(d){
  if(!game||st.state!=='play'||!d||!d.on||d.fall) return false;
  if(d.cls==='fri'){ refuse(d,'Friendly'); return false; }
  const m=game.ammo>=1?freeM():null; if(!m){ refuse(d,'Reloading'); nudge(pipsEl); return false; }
  launch(m,d,false); game.ammo--; game.shots++;
  if(d.cls==='hos'&&!d.reacted&&d.idT>=0){ d.reacted=true; game.rs+=clk-d.idT; game.rc++; }
  hideHint(); return true;
}
function rowEngage(r){ if(!game||st.state!=='play') return; const d=r.g?(r.g.on?groupLead(r.g):null):r.d; if(d&&d.on) engage(d); else A.beep(220); }
st.onPointer=function(e){
  if(st.state!=='play'||!game) return;
  const d=pick(e.clientX,e.clientY,e.pointerType==='mouse'?64:92);
  if(d) engage(d); else { A.tick(); missPing(e.clientX,e.clientY); }
};
const MP=document.createElement('i'); MP.className='ae-ping'; marks.appendChild(MP);
function missPing(x,y){ MP.style.transform=`translate3d(${x}px,${y}px,0)`; MP.classList.remove('go'); void MP.offsetWidth; MP.classList.add('go'); }
jamB.addEventListener('click',jam);
addEventListener('keydown',e=>{
  if(S.mode!=='station'||S.stId!=='ae') return;
  if(e.code==='Space'){ e.preventDefault(); if(!e.repeat) jam(); return; }
  const k=/^Digit([1-8])$/.exec(e.code); if(k&&st.state==='play'){ const r=ROWS[+k[1]-1]; if(r&&!r.b.hidden){ e.preventDefault(); rowEngage(r); } }
});
function hideHint(){ if(game&&game.hint){ game.hint=0; hintEl.classList.add('gone'); } }

/* ---------- game flow ---------- */
function bagOf(W){ const b=[]; for(const k in W.bag) for(let i=0;i<W.bag[k];i++) b.push(k); for(let i=b.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]]; }
  const L=b.length-1; if(b[L]!=='scout'){ const j=b.lastIndexOf('scout'); if(j>=0) [b[L],b[j]]=[b[j],b[L]]; } return b; }   // popped from the end: each wave opens with a scout
function nextWave(){ const g=game; g.wave++; const W=WAVES[g.wave]; g.phase='brief'; g.pt=2.4; g.wt=0; g.bag=bagOf(W); g.every=W.dur/g.bag.length; g.nextAt=.3;
  showBanner(banner,'Wave '+(g.wave+1),W.name); ringAt(0,0,4); if(g.wave>0) A.alarm(); }
function hostilesLeft(){ for(const d of D) if(d.on&&!d.demo&&d.type!=='friend') return true; return false; }
function flow(dt){
  const g=game, W=WAVES[g.wave]; g.total+=dt;
  if(g.ammo<AMMO){ g.reload+=dt; if(g.reload>=RELOAD){ g.reload=0; g.ammo++; } } else g.reload=0;
  if(g.jamCD>0) g.jamCD=Math.max(0,g.jamCD-dt);
  if(g.jamT>=0) jamStep(dt);
  let alive=0; for(const s of SITES) if(s.hp>0) alive++;
  if(!alive){ g.lostT=g.lostT<0?2:g.lostT-dt; if(g.lostT<=0) return end(); return; }
  if(g.phase==='brief'){ g.pt-=dt; if(g.pt<=0){ g.phase='fight'; g.wt=0; } return; }
  g.wt+=dt;
  while(g.bag.length&&g.wt>=g.nextAt){ const t=g.bag.pop(); if(t==='swarm') spawnSwarm(); else if(t==='friend') spawnFriend(); else spawnHostile(t); g.nextAt+=g.every*(.7+Math.random()*.6); }
  if(!g.bag.length&&(!hostilesLeft()||g.wt>W.dur+14)){ if(g.wave<2) nextWave(); else return end(); }
  if(g.total>160) end();
}
function end(){
  const g=game; if(!g) return; game=null;
  const standing=SITES.filter(s=>s.hp>0).length, integ=SITES.reduce((a,s)=>a+s.hp,0)/3;
  const total=Math.max(0,Math.round(g.score+integ*900));
  const clean=g.leak===0, allDown=g.kills>=g.hostiles;
  const grade=!standing?'Sky lost':g.blue?'Blue on blue':clean&&allDown?'Flawless':standing===3?'Sky held':'Held, with losses';
  const lines=[];
  if(!standing) lines.push('All three sites went down. Jam swarms early and save interceptors for scouts and heavies.');
  else if(g.blue) lines.push(`${g.blue===1?'One friendly was':g.blue+' friendlies were'} hit. Wait for the sweep to identify a contact before you fire.`);
  else if(g.leak) lines.push(`${g.leak} hostile${g.leak>1?'s':''} reached a site. The table is sorted by time to impact, so work from the top.`);
  else lines.push('Nothing reached a site and no friendly was touched.');
  lines.push('Aetos is built around this loop: detect, identify, decide, act.');
  st.result({grade,score:total,text:lines.join(' '),stats:[['Hostiles down',g.kills+' / '+g.hostiles],['Reached a site',g.leak],['Friendlies hit',g.blue],
    ['Downed by jammer',g.jammed],['Sites standing',standing+' / 3'],['Time to engage',g.rc?(g.rs/g.rc).toFixed(1)+' s':'None']]});
  A.chord(); for(const d of D) if(d.on) d.demo=true; for(const m of MS) m.demo=true;
  GU.uJam.value.set(0,0); jamWall.visible=false; warnEl.classList.remove('on'); topEl.classList.remove('thr'); HUD.warnOn=false;
}

/* ---------- attract mode: the loop running on its own ---------- */
function attract(dt){
  let n=0, loi=null; for(const d of D) if(d.on){ n++; if(d.loiter) loi=d; }
  if(!loi&&st.state==='menu'){ const d=freeD(); if(d){ resetD(d,'scout'); d.loiter=true; d.demo=true; d.goal.set(2.55,0,.3); d.cruise=1.05; d.p.set(3,1.05,.3); d.tk=takeTK(false,false); identify(d,true); loi=d; } }
  menuDemo=loi;
  attractT-=dt; demoT-=dt;
  if(attractT<=0){ attractT=2.8+Math.random()*1.6;
    if(n<7){ const r=Math.random(); if(r<.5) spawnHostile('scout'); else if(r<.75) spawnFriend(); else spawnHostile('heavy'); } }
  // demo engagements: the identified hostile closest to impact, a little before it gets there
  if(demoT<=0){ demoT=.9+Math.random()*.8;
    let best=null, bt=1e9; for(const d of D){ if(!d.on||!d.demo||d.loiter||d.cls!=='hos'||d.fall||d.eng>=d.hp) continue; if(d.tti<bt){ bt=d.tti; best=d; } }
    if(best&&bt<4.6){ const m=freeM(); if(m) launch(m,best,true); } }
}
let demoT=1;
function clearAll(){
  for(const d of D) if(d.on) release(d); for(const g of GP){ if(g.on){ g.on=false; dropTK(g.tk); g.tk=null; } }
  for(const m of MS){ m.on=false; m.live=false; m.tgt=null; }
  for(let i=0;i<pL.length;i++) pA[i*4]=1; debris.clear(); for(const v of PB) v.z=-99; for(const v of RG) v.z=-99;
  GU.uJam.value.set(0,0); jamWall.visible=false; menuDemo=null; hovD=null;
}
function resetSites(){ SITES.forEach(s=>{ s.hp=1; s.hitT=-99; s.smk=0; s.thr=0; }); }
st.play=function(){
  clearAll(); resetSites(); nextId=1;
  game={wave:-1,phase:'brief',pt:0,wt:0,bag:[],every:2,nextAt:0,score:0,kills:0,jammed:0,mhit:0,shots:0,blue:0,leak:0,hostiles:0,ammo:AMMO,reload:0,jamCD:0,jamT:-1,jams:0,rs:0,rc:0,total:0,lostT:-1,alarmT:0,hint:1};
  for(const r of ROWS){ r.d=null; r.g=null; r.k=''; r.b.hidden=true; }
  hintEl.classList.remove('gone'); hintEl.textContent=FINE?'Click a track or a row to engage. Keys 1 to 8 engage rows':'Tap a track or a row to engage';
  st.setState('play'); nextWave(); tblT=0;
};
st.abort=function(){ game=null; if(pL) clearAll(); warnEl.classList.remove('on'); topEl.classList.remove('thr'); HUD.warnOn=false; };
let bootT=1;
st.enter=function(){ st.abort(); st.setState('menu');
  // a hidden button elsewhere (the loader's Enter keeps focus after a keyboard entry) must not swallow Enter on this title
  const ae=document.activeElement; if(ae&&ae!==document.body&&!el.contains(ae)&&ae.blur) ae.blur();
  resetSites(); nextId=1; bootT=0; $('#aeBest').textContent='Best '+fmt(store.get('ae',0)); attractT=.4; layoutKey='';
  for(let k=0;k<3;k++){ const d=k===1?spawnFriend():spawnHostile('scout'); if(d){ const a=Math.random()*TAU, r=3.4+Math.random()*1.6; d.p.x=Math.sin(a)*r; d.p.z=-Math.cos(a)*r; } } };
st.exit=function(){ st.abort(); };

/* ---------- per frame: sweep, missiles, effects ---------- */
function sweepPaint(s0,s1){
  const wrap=s1<s0;
  for(const d of D){ if(!d.on) continue; const b=brg(d.p.x,d.p.z); if(wrap?(b<=s0&&b>s1):(b<=s0||b>s1)) continue; if(Math.hypot(d.p.x,d.p.z)>RS+.25) continue;
    identify(d,false); paintAt(d.p.x,d.p.z,CLN[d.cls]); d.flash=1; }
}
function stepM(m,dt){
  if(m.live){ stepMissile(m,dt);
    const tr=m.tr; if(!m.trN||Math.hypot(tr[0]-m.p.x,tr[1]-m.p.y,tr[2]-m.p.z)>.085){ tr.copyWithin(3,0,(TL-1)*3); tr[0]=m.p.x; tr[1]=m.p.y; tr[2]=m.p.z; m.trN=Math.min(TL,m.trN+1); }
    m.puffT-=dt; if(m.puffT<=0){ m.puffT=.028; puff(m.p.x,m.p.y,m.p.z,(Math.random()-.5)*.08,.02+Math.random()*.05,(Math.random()-.5)*.08,1.3+Math.random()*.6,.07,.42,.11,SMOKE); } }
  else { m.fade-=dt*1.5; if(m.fade<=0){ m.on=false; m.trN=0; } }
}
function stepPuffs(dt){
  const N=pL.length, dr=Math.exp(-.7*dt);
  for(let i=0;i<N;i++){ const a=i*4; if(pA[a]>=1) continue; const k=pA[a]+dt/pL[i]; if(k>=1){ pA[a]=1; continue; } pA[a]=k;
    const j=i*3; pV[j]*=dr; pV[j+1]*=dr; pV[j+2]*=dr; pP[j]+=pV[j]*dt; pP[j+1]+=pV[j+1]*dt; pP[j+2]+=pV[j+2]*dt; }
  const g=puffs.geometry; g.attributes.position.needsUpdate=true; g.attributes.aP.needsUpdate=true; g.attributes.aC.needsUpdate=true;
}
const SMOKE_D=new T.Color(.5,.36,.3);
function sitesStep(dt){
  for(let i=0;i<3;i++){ const s=SITES[i]; const h=clk-s.hitT; s.mat.uniforms.uHit.value=h<2?Math.exp(-h*2.5):0; s.mat.uniforms.uDead.value=s.hp<=0?1:0;
    GU.uSite.value[i].set(s.p.x,s.p.z,s.hp,s.hitT);
    if(s.smk>0||s.hp<=0){ s.smk=Math.max(0,(s.smk||0)-dt); const rate=s.hp<=0?9:16*clamp(s.smk/4,0,1);
      if(Math.random()<rate*dt) puff(s.p.x+(Math.random()-.5)*.3,.12,s.p.z+(Math.random()-.5)*.3,(Math.random()-.5)*.05+.03,.42+Math.random()*.25,(Math.random()-.5)*.05,3.2+Math.random()*1.4,.14,.95,.1,s.hp<=0?SMOKE_D:SMOKE); } }
  GU.uThr.value.set(SITES[0].thr,SITES[1].thr,SITES[2].thr);
}

/* ---------- write instances, lights, stalks, interceptors, trails ---------- */
function writeScene(){
  let n=0; const big=innerWidth<=820?1.35:1.12;
  for(const d of D){ if(!d.on) continue; const i=n++;
    const s=TYPES[d.type].sc*big; SCL.set(s,s,s); M4.compose(d.p,d.q,SCL); inst.setMatrixAt(i,M4);
    const c=d.cls==='hos'?COL.hos:d.cls==='fri'?COL.fri:COL.unk; d.flash=Math.max(0,d.flash-.04);
    TC.copy(c).multiplyScalar(1+(clk-d.dmgT<.3?2:0)+d.flash*.8); inst.setColorAt(i,TC);
    for(let k=0;k<4;k++){ M5.multiplyMatrices(M4,ROT_LOCAL[k]); rot.setMatrixAt(i*4+k,M5); rot.setColorAt(i*4+k,c); }
    const bl=Math.sin(clk*6.5+d.ph*3), j=i*3;
    for(let k=0;k<2;k++){ V.set(k?-ARM:ARM,ROTY-.012,ARM).multiplyScalar(s).applyQuaternion(d.q).add(d.p); const o=(j+k)*3; lP[o]=V.x; lP[o+1]=V.y; lP[o+2]=V.z;
      const on=(k?bl:-bl)>.35?1:.12; lC[o]=c.r*on; lC[o+1]=c.g*on; lC[o+2]=c.b*on; lS[j+k]=.075*s+.03; }
    const o=(j+2)*3; lP[o]=d.p.x; lP[o+1]=.012; lP[o+2]=d.p.z; lC[o]=c.r*.3; lC[o+1]=c.g*.3; lC[o+2]=c.b*.3; lS[j+2]=.07;
    const q=i*6; dP[q]=d.p.x; dP[q+1]=d.p.y-.04*s; dP[q+2]=d.p.z; dP[q+3]=d.p.x; dP[q+4]=0; dP[q+5]=d.p.z;
    dC[q]=c.r*.26; dC[q+1]=c.g*.26; dC[q+2]=c.b*.26; dC[q+3]=c.r*.04; dC[q+4]=c.g*.04; dC[q+5]=c.b*.04; }
  for(let i=0;i<MAXD*3;i++) lS[i]=0;   // airframes are not drawn on the radar
  inst.count=n; rot.count=n*4; inst.instanceMatrix.needsUpdate=true; inst.instanceColor.needsUpdate=true; rot.instanceMatrix.needsUpdate=true; rot.instanceColor.needsUpdate=true;
  drops.geometry.setDrawRange(0,n*2); drops.geometry.attributes.position.needsUpdate=true; drops.geometry.attributes.color.needsUpdate=true;
  let mn=0, sgi=0;
  for(let k=0;k<MAXM;k++){ const m=MS[k], li=MAXD*3+k; lS[li]=0; if(!m.on) continue;
    if(m.live){ V.copy(m.v).normalize(); Qn.setFromUnitVectors(ZF,V); SCL.set(1.35,1.35,1.35); M4.compose(m.p,Qn,SCL); msl.setMatrixAt(mn++,M4);
      const o=li*3; lP[o]=m.p.x-V.x*.1; lP[o+1]=m.p.y-V.y*.1; lP[o+2]=m.p.z-V.z*.1; const f=.8+Math.random()*.4; lC[o]=1.6*f; lC[o+1]=1.35*f; lC[o+2]=1.1*f; lS[li]=.22; }
    // trail: newest sample first, the live head joins it
    const tr=m.tr, N=m.trN; let hx=m.live?m.p.x:tr[0], hy=m.live?m.p.y:tr[1], hz=m.live?m.p.z:tr[2];
    for(let s=0;s<N&&sgi<MAXM*(TL-1);s++){ const ax=s===0?hx:tr[(s-1)*3], ay=s===0?hy:tr[(s-1)*3+1], az=s===0?hz:tr[(s-1)*3+2];
      if(s===0&&!m.live) continue;
      const fa=Math.pow(1-s/TL,1.5)*m.fade*1.25, fb=Math.pow(1-(s+1)/TL,1.5)*m.fade*1.25, o=sgi*6; sgi++;
      tP[o]=ax; tP[o+1]=ay; tP[o+2]=az; tP[o+3]=tr[s*3]; tP[o+4]=tr[s*3+1]; tP[o+5]=tr[s*3+2];
      tC[o]=fa; tC[o+1]=fa*.94; tC[o+2]=fa*.86; tC[o+3]=fb; tC[o+4]=fb*.94; tC[o+5]=fb*.86; } }
  { const li=MAXD*3+MAXM, o=li*3, on=(clk%1.6)<.14?1:.08; lP[o]=.06; lP[o+1]=.62; lP[o+2]=-.04; lC[o]=1.3*on; lC[o+1]=1.2*on; lC[o+2]=1.05*on; lS[li]=0; }
  msl.count=mn; msl.instanceMatrix.needsUpdate=true;
  trails.geometry.setDrawRange(0,sgi*2); trails.geometry.attributes.position.needsUpdate=true; trails.geometry.attributes.color.needsUpdate=true;
  const lg=lights.geometry; lg.attributes.position.needsUpdate=true; lg.attributes.aC.needsUpdate=true; lg.attributes.aS.needsUpdate=true;
}

/* ---------- HUD: track symbology, sites, arm, table ---------- */
const topEl=$('.ae-top',el);
function retK(d){ let k=1; for(const m of MS) if(m.live&&m.tgt===d) k=Math.min(k,clamp(m.p.distanceTo(d.p)/m.d0,0,1)); return k; }
function writeTrack(t,x,y,vis,cls,lab,sub,lock,hov,jm,p,v,rk){
  if(!vis){ if(t.shown){ t.e.style.display='none'; t.shown=false; } return; }
  if(!t.shown){ t.e.style.display='block'; t.shown=true; }
  const c='ae-trk '+cls+(t.mini?' mini':'')+(t.grp?' grp':'')+(lock?' lock':'')+(hov?' hov':'')+(jm?' jam':'');
  if(c!==t.cls){ t.e.className=c; t.cls=c; }
  t.e.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  if(t.mini) return;
  if(lab!==t.id){ t.b.textContent=lab; t.id=lab; } if(sub!==t.txt){ t.s.textContent=sub; t.txt=sub; }
  // velocity leader: where the track will be in 1.2 s, drawn from the symbol's edge
  V2.copy(p).addScaledVector(v,1.2).project(stCam); const ex=(V2.x*.5+.5)*innerWidth-x, ey=(-V2.y*.5+.5)*innerHeight-y, len=Math.min(42,Math.hypot(ex,ey));
  const off=t.grp?22:12; t.ldr.style.transform=len>3?`rotate(${Math.atan2(ey,ex).toFixed(3)}rad) translateX(${off}px) scaleX(${len.toFixed(1)})`:'scaleX(0)';
  if(lock) t.ret.style.transform=`scale(${(.85+rk*1.7).toFixed(3)}) rotate(${(45+rk*90).toFixed(1)}deg)`;
}
function courseTTI(d){ // time to the closest approach to a site, if the present course passes within 0.9
  const vx=d.v.x, vz=d.v.z, v2=vx*vx+vz*vz; if(v2<1e-4) return 99; let best=99;
  for(const s of SITES){ if(s.hp<=0) continue; const rx=s.p.x-d.p.x, rz=s.p.z-d.p.z, t=(rx*vx+rz*vz)/v2; if(t<=0) continue; const mx=rx-vx*t, mz=rz-vz*t; if(Math.hypot(mx,mz)<.9) best=Math.min(best,t); }
  return best;
}
const ENT=[...Array(MAXD+MAXG)].map(()=>({d:null,g:null,key:0,tti:99,r:0})); const ENTS=[];
function buildTable(){
  ENTS.length=0; let n=0;
  for(const d of D){ if(!d.on||d.fall||d.grp) continue; const e=ENT[n++]; e.d=d; e.g=null; e.r=Math.hypot(d.p.x,d.p.z);
    e.tti=d.cls==='hos'?d.tti:d.cls==='unk'?courseTTI(d):99; e.key=d.cls==='fri'?200+e.r:e.tti<99?e.tti:100+e.r; ENTS.push(e); }
  for(const g of GP){ if(!g.on) continue; const e=ENT[n++]; e.d=null; e.g=g; e.r=Math.hypot(g.c.x,g.c.z); e.tti=g.tti; e.key=g.tti; ENTS.push(e); }
  ENTS.sort((a,b)=>a.key-b.key);
  ROWS.forEach((r,k)=>{ const e=ENTS[k]; if(!e){ if(!r.b.hidden){ r.b.hidden=true; r.d=r.g=null; r.k=''; } return; }
    r.d=e.d; r.g=e.g; const d=e.d||groupLead(e.g)||null, cls=e.g?e.g.cls:e.d.cls, eng=d&&d.eng>0, jm=d&&d.jam>0;
    const id=id3(e.g?e.g.id:e.d.id), cl=cls==='unk'?'Unknown':cls==='fri'?'Friend':e.g?'Swarm '+e.g.n:TYPES[e.d.type].name;
    const x=eng?'Engaged':jm?'Jammed':cls==='fri'?'Transit':e.tti<99?Math.max(1,Math.ceil(e.tti))+' s':'Tracking';
    const key=id+cl+x+(e.r/KM).toFixed(1), rc='ae-row '+cls+(eng?' eng':'')+(e.tti<4&&cls!=='fri'&&!eng?' urg':'');
    if(r.b.hidden) r.b.hidden=false;
    if(key!==r.k){ r.k=key; r.t.textContent=id; r.c.textContent=cl; r.r.textContent=(e.r/KM).toFixed(1)+' km'; r.x.textContent=x; r.b.setAttribute('aria-label','Engage '+id+', '+cl+', '+(e.r/KM).toFixed(1)+' kilometres, '+x); }
    if(rc!==r.cls){ r.cls=rc; r.b.className=rc; } });
  const c=String(n); if(c!==HUD.cnt){ HUD.cnt=c; cntEl.textContent=c; }
}
function writeHUD(dt,playing){
  const W=innerWidth, H=innerHeight;
  for(const d of D){ if(!d.on) continue; V.copy(d.p).project(stCam); d.vis=V.z<1&&V.z>-1; d.sx=(V.x*.5+.5)*W; d.sy=(-V.y*.5+.5)*H; d.rowHov=false; }
  for(const g of GP){ if(!g.on) continue; V.copy(g.c).setY(g.alt).project(stCam); g.vis=V.z<1; g.sx=(V.x*.5+.5)*W; g.sy=(-V.y*.5+.5)*H; g.rowHov=false; }
  for(const r of ROWS) if(r.hov&&!r.b.hidden){ if(r.d) r.d.rowHov=true; if(r.g) r.g.rowHov=true; }
  hovD=playing&&mouse.on?pick(mouse.x,mouse.y,64):null;
  // track symbols
  for(const d of D){ if(!d.on||!d.tk) continue; const t=d.tk, show=playing&&d.vis&&!d.demo;
    if(!show){ writeTrack(t,0,0,false); continue; }
    const sub=d.cls==='unk'?'Unknown':d.cls==='fri'?'Friend':TYPES[d.type].name+(d.jam>0?' · Jammed':d.eng>0?' · Lock':'');
    writeTrack(t,d.sx,d.sy,true,d.cls,id3(d.id),sub,d.eng>0,hovD===d||d.rowHov||(d.grp&&d.grp.rowHov),d.jam>0||d.fall,d.p,d.v,d.eng>0?retK(d):1); }
  for(const g of GP){ if(!g.on||!g.tk) continue; const show=playing&&g.vis; if(!show){ writeTrack(g.tk,0,0,false); continue; }
    V3.copy(g.c).setY(g.alt); writeTrack(g.tk,g.sx,g.sy,true,g.cls,id3(g.id),(g.cls==='unk'?'Unknown ':'Swarm ')+g.n,false,g.rowHov||(hovD&&hovD.grp===g),false,V3,g.v,1); }
  // sites: labels, integrity, threat
  let worst=99, ws=-1;
  for(let i=0;i<3;i++){ const s=SITES[i]; let tt=99; if(playing) for(const d of D){ if(!d.on||d.fall||d.demo||d.type==='friend'||d.site!==i) continue; const x=d.grp&&!d.grp.dive?d.grp.tti:d.tti; if(x<tt) tt=x; }
    s.thr=s.hp>0?clamp((5-tt)/4,0,1):0; if(s.hp>0&&tt<worst){ worst=tt; ws=i; }
    const L=SL[i]; V.set(s.p.x,0,s.p.z+.78).project(stCam); L.e.style.transform=`translate3d(${((V.x*.5+.5)*W).toFixed(1)}px,${((-V.y*.5+.5)*H).toFixed(1)}px,0) translate(-50%,0)`;
    const k=(s.hp<=0?'dead':s.thr>.25?'thr':'')+(st.state==='play'?'':' off'); if(k!==L.k){ L.k=k; L.e.className='ae-site '+k; L.e.style.opacity=st.state==='play'?'':'0'; }
    if(L.hp!==s.hp){ L.hp=s.hp; L.bar.style.transform=`scaleX(${s.hp.toFixed(3)})`; } }
  if(!playing) return;
  const g=game, Wv=WAVES[g.wave];
  const warnOn=worst<4.5; if(warnOn!==HUD.warnOn){ HUD.warnOn=warnOn; warnEl.classList.toggle('on',warnOn); topEl.classList.toggle('thr',warnOn); }
  if(warnOn){ const w=SITES[ws].name+' '+Math.max(1,Math.ceil(worst))+' s'; if(w!==HUD.warn){ HUD.warn=w; warnT.textContent=w; } if(worst<3&&clk-g.alarmT>2.4){ g.alarmT=clk; A.alarm(); } }
  const sc=fmt(g.score); if(sc!==HUD.score){ HUD.score=sc; scoreEl.textContent=sc; }
  const wv='Wave '+(g.wave+1)+' / 3'; if(wv!==HUD.wave){ HUD.wave=wv; waveEl.textContent=wv; }
  const wn=g.phase==='brief'?Wv.name:g.bag.length?Wv.name:'Clearing'; if(wn!==HUD.waveN){ HUD.waveN=wn; waveN.textContent=wn; }
  waveM.style.transform=`scaleX(${(g.phase==='brief'?0:clamp(g.wt/Wv.dur,0,1)).toFixed(3)})`;
  for(let i=0;i<AMMO;i++){ const P=PIPS[i], q=Math.floor(g.reload/RELOAD*12), k=i<g.ammo?'f':i===g.ammo?'r'+q:'e';
    if(k!==P.k){ P.k=k; P.i.className=k==='f'?'f':k==='e'?'':'r'; P.b.style.transform=k==='f'?'none':k==='e'?'scaleY(0)':`scaleY(${(q/12).toFixed(3)})`; } }
  const out=g.ammo<1; if(out!==HUD.pipOut){ HUD.pipOut=out; pipsEl.classList.toggle('out',out); }
  const q=Math.round(g.jamCD/JAMCD*80); if(q!==HUD.jamOff){ HUD.jamOff=q; jamP.style.strokeDashoffset=(238.8*q/80).toFixed(1); }
  const jt=g.jamCD>0?Math.ceil(g.jamCD)+' s':'Jam'; if(jt!==HUD.jam){ HUD.jam=jt; jamTx.textContent=jt; jamB.classList.toggle('cd',g.jamCD>0); }
  tblT-=dt; if(tblT<=0){ tblT=.125; buildTable(); }
}

/* ---------- camera: solve a framing for the scope in a screen rectangle, then drift ---------- */
const FC=new T.PerspectiveCamera(36,1,.1,900), FV=new T.Vector3(), FR={play:{D:18,tx:0,tz:0,el:.8},menu:{D:12,tx:0,tz:0,el:.5}};
function solveFrame(o,el,R,rect){
  const W=innerWidth, H=innerHeight; FC.fov=stCam.fov; FC.aspect=W/H; FC.updateProjectionMatrix();
  let Dd=18, tx=0, tz=0;
  for(let it=0;it<60;it++){
    FC.position.set(tx,Math.sin(el)*Dd,tz+Math.cos(el)*Dd); FC.lookAt(tx,0,tz); FC.updateMatrixWorld();
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(let k=0;k<40;k++){ const a=k/40*TAU; FV.set(Math.cos(a)*R,0,Math.sin(a)*R).project(FC); const sx=(FV.x*.5+.5)*W, sy=(-FV.y*.5+.5)*H; x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy); }
    const bw=x1-x0, bh=y1-y0; Dd*=Math.pow(Math.max(bw/(rect[2]-rect[0]),bh/(rect[3]-rect[1])),.6);
    tx+=((x0+x1)/2-(rect[0]+rect[2])/2)/(bw/(2*R))*.6; tz+=((y0+y1)/2-(rect[1]+rect[3])/2)/(bh/(2*R))*.6;
  }
  o.D=Dd; o.tx=tx; o.tz=tz; o.el=el;
}
function layout(){
  const W=innerWidth, H=innerHeight, mob=W<=820, key=W+'x'+H; if(key===layoutKey) return; layoutKey=key;
  drawLabels(mob); GU.uLab.value=mob?.62:.5;
  if(mob){ solveFrame(FR.play,1.53,BZ,[10,H*.19,W-10,H-292]); solveFrame(FR.menu,1.2,BZ,[8,H*.36,W-8,H-104]); }
  else { solveFrame(FR.play,1.53,BZ+.05,[40,150,W-400,H-22]); solveFrame(FR.menu,1.16,BZ,[W*.2,70,W-360,H-104]); }
}
function cam(t){
  const f=st.state==='menu'?FR.menu:FR.play, k=RM?0:1, az=k*(Math.sin(t*.07)*.05+(st.state==='menu'?Math.sin(t*.043)*.06:0)), el=f.el+k*Math.sin(t*.05)*.012;
  st.camL.set(f.tx,0,f.tz); st.camP.set(f.tx+Math.sin(az)*Math.cos(el)*f.D,Math.sin(el)*f.D,f.tz+Math.cos(az)*Math.cos(el)*f.D);
}
const AN=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
let paused=false;   // test hook: freeze the simulation while frames keep rendering
st.update=function(dt,t){
  if(!GU) return;
  if(paused) dt=0;
  clk+=dt; GU.uNow.value=clk; rotorMat.uniforms.uT.value=clk; layout();
  if(bootT<1){ bootT=Math.min(1,bootT+dt/1.8); GU.uBoot.value=E.o(bootT); }
  const s0=sw; sw=(sw+dt*TAU/SWEEP)%TAU; GU.uSw.value=sw; if(sw<s0) A.ping(880,st.state==='play'?.02:.011);
  cpAnt.rotation.y=-sw;
  if(st.state==='play'&&game) flow(dt); else attract(dt);
  const playing=st.state==='play'&&!!game;
  for(const g of GP) if(g.on) stepGroup(g,dt);
  for(const d of D) if(d.on) stepDrone(d,dt);
  sweepPaint(s0,sw);
  for(const m of MS) if(m.on) stepM(m,dt);
  stepPuffs(dt); debris.update(dt,1.6,1.3); sitesStep(dt);
  writeScene(); writeHUD(dt,playing); cam(t);
  if(playing&&FINE) cursorAim(true);   // setState clears it on leaving play; toggling an existing class is a no-op
  if(st.state==='menu'){ AN[0].set(0,0,0); if(menuDemo) AN[1].copy(menuDemo.p).setY(0); else AN[1].set(2.55,0,.3); AN[2].copy(SITES[0].p).setY(0); st.anchors=AN; notesUpdate(st); }
};
st._dbg={get game(){return game}, D, GP, MS, SITES, engage, jam, end, pick, rowEngage, ROWS, flow, get clk(){return clk}, pause(v){ paused=!!v; }};
})();

/* ================= EARTH =================
   What is on the other side of the hole: a small town on a small planet, where the three of us live. You come down
   through the sky in the rocket you flew in orbit, land on the pad and step out. You walk the way you fly: WASD or the
   arrows, or the stick on a touch screen; drag to look around. Ahroon is waiting by Aetos, Abraham is in the square by
   Kríos, Michael is up by Ogive. Walk up to one of us and we talk; click one of us for the photograph and LinkedIn.
   It is drawn rather than rendered: three tones of sunlight with real cast shadows, then a second pass finds the edges
   of things from depth and normals and inks them with a line that wanders a little, like a pen. */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,12,-10)});
st.land=false;   // Land: straight down to Earth without the flight, so we say hello without mentioning it
const sc=st.scene, el=st.el, hint=$('#crHint',el), labels=$$('#crLabels .crl',el);
sc.children.filter(o=>o.isPoints).forEach(o=>sc.remove(o)); // no night stars by day
const R=24, LO=Q<1, UPY=new T.Vector3(0,1,0), V=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3(), V4=new T.Vector3();
const C3=c=>c&&c.isColor?c:new T.Color().setStyle(c,T.LinearSRGBColorSpace); // display colours: this world skips the film curve
const SUN=new T.Vector3(.38,.8,.46).normalize();
const rnd=seeded(11);
const UPU={value:new T.Vector3(0,1,0)};

/* ---------- a map of the town on the sphere: x and z in metres from the square ---------- */
function at(x,z,o=new T.Vector3()){ const r=Math.hypot(x,z); if(r<1e-6) return o.set(0,1,0); const a=r/R, s=Math.sin(a)/r; return o.set(x*s,Math.cos(a),z*s); }
function loc(d){ const a=Math.acos(clamp(d.y,-1,1)), s=Math.sin(a); if(s<1e-6) return [0,0]; const k=a*R/s; return [d.x*k,d.z*k]; }
const _up=new T.Vector3(), _n=new T.Vector3(), _e=new T.Vector3(), _Ry=new T.Matrix4(), _S=new T.Vector3();
function frameAt(x,z,yaw=0,lift=0,s=1){ at(x,z,_up); at(x,z+.05,_n).sub(_up); _n.addScaledVector(_up,-_n.dot(_up)).normalize(); _e.crossVectors(_up,_n);
  const M=new T.Matrix4().makeBasis(_e,_up,_n); M.setPosition(_up.x*(R+lift),_up.y*(R+lift),_up.z*(R+lift)); if(yaw) M.multiply(_Ry.makeRotationY(yaw)); if(s!==1) M.scale(_S.set(s,s,s)); return M; }
const yawTo=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z); // turns a thing's front toward a point
/* where the rocket lands, which way its hatch opens, where you stand when you step off, and which way you then look */
const PAD=[-3.2,-15.6], DOOR=[0,1], START=[-3.2,-12.0];
const AHR=(()=>{ const l=Math.hypot(-.91,.42), fx=-.91/l, fz=.42/l, c=Math.cos(.55), sn=Math.sin(.55); return [START[0]+(fx*c-fz*sn)*4.6,START[1]+(fx*sn+fz*c)*4.6]; })();
// you step off looking just past Ahroon, so he stands beside you in the picture (on a phone too), not behind you
const FACE=(()=>{ let x=AHR[0]-START[0], z=AHR[1]-START[1]; const l=Math.hypot(x,z), c=Math.cos(.14), sn=Math.sin(.14); x/=l; z/=l; return [x*c-z*sn,x*sn+z*c]; })();
const SKYBH={value:new T.Vector3(-.35,.75,.55).normalize()}, SPACEU={value:0};
const SKYU={uSunD:{value:new T.Vector3(.38,.8,.46).normalize()},uMoonD:{value:new T.Vector3(-.3,.8,-.5).normalize()},uDusk:{value:0},uOver:{value:0},uBow:{value:0}};   // where the sun and the moon are, sunset, overcast, a rainbow   // SPACEU: how far into the black the sky has gone, climbing out // where the hole hangs in the sky: set so the rocket comes down out of it

/* ---------- the island: the same noise in JavaScript (to build and to walk) and in the shaders ---------- */
const fr=x=>x-Math.floor(x);
function eh(x,y,z){ x=fr(x*.3183099+.1)*17; y=fr(y*.3183099+.1)*17; z=fr(z*.3183099+.1)*17; return fr(x*y*z*(x+y+z)); }
function en(x,y,z){ const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z); let fx=x-ix,fy=y-iy,fz=z-iz; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); fz=fz*fz*(3-2*fz);
  const L=(a,b,t)=>a+(b-a)*t, h=(a,b,c)=>eh(ix+a,iy+b,iz+c);
  return L(L(L(h(0,0,0),h(1,0,0),fx),L(h(0,1,0),h(1,1,0),fx),fy),L(L(h(0,0,1),h(1,0,1),fx),L(h(0,1,1),h(1,1,1),fx),fy),fz); }
function efbm(x,y,z){ let a=.5,s=0; for(let i=0;i<5;i++){ s+=a*en(x,y,z); x*=2.1; y*=2.1; z*=2.1; a*=.5; } return s; }
const ISLETS=[[23,-7.5,.07],[-8.5,22.5,.06],[17.5,17,.045]].map(([x,z,r])=>({d:at(x,z),r}));
const JETTY=[[10.5,-14.3],[12.9,-18.1]], JB=at(11.4,-15.6);
function isle(d){ const a=Math.acos(clamp(d.y,-1,1)); let l=1.35*(.78-a)+.32*(efbm(d.x*3.3+1.3,d.y*3.3+2.1,d.z*3.3+.7)-.5);
  for(const s of ISLETS) l=Math.max(l,1.6*(s.r-Math.acos(clamp(d.dot(s.d),-1,1)))+.1*(en(d.x*20,d.y*20,d.z*20)-.5)); return l; }
function beachK(d){ return clamp((efbm(d.x*5+7,d.y*5+7,d.z*5+7)-.5)*6+.5+Math.max(0,.16-Math.acos(clamp(d.dot(JB),-1,1)))*14,0,1); }
const WATER=-.9;
function hOf(l,b){ const w0=.014+.2*b, t=clamp((l+w0)/(w0+.004),0,1); return -1.6*(1-t*t*(3-2*t)); }
const CAPR=25, CS=LO?.22:.17, CN=Math.ceil(2*CAPR/CS)+1, GL=new Float32Array(CN*CN), GH=new Float32Array(CN*CN), GB=new Float32Array(CN*CN);
function grid(A,x,z){ const fx=(x+CAPR)/CS, fz=(z+CAPR)/CS, i=clamp(Math.floor(fx),0,CN-2), j=clamp(Math.floor(fz),0,CN-2), tx=clamp(fx-i,0,1), tz=clamp(fz-j,0,1);
  const k=j*CN+i; return lerp(lerp(A[k],A[k+1],tx),lerp(A[k+CN],A[k+CN+1],tx),tz); }

/* ---------- light: three tones of sun with cast shadows, a little sky from above, haze far away ---------- */
const N2=`float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y); }`;
const NEAR=`uniform vec3 uPly; uniform float uCut;
  void nearFade(vec3 w){ float k=smoothstep(.7,1.25,distance(cameraPosition,w));
    if(uCut>.5){ vec3 ab=uPly-cameraPosition; float L2=dot(ab,ab); if(L2>.25){ float t=dot(w-cameraPosition,ab)/L2;
      /* the inside of a thing (its back faces) is cut away wider than its skin, so the gap shows the world beyond, not the dark inside */
      if(t>0.&&t<.95){ float r0=gl_FrontFacing?.5:1.1; k=min(k,smoothstep(r0,r0+.16,length(w-cameraPosition-ab*t))); } } }
    if(k<fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))) discard; }`;
const SHN=LO?1536:2048;
const LU={uPly:{value:new T.Vector3()},uShDbg:{value:0},uSun:{value:SUN},uSky:{value:C3('#9fd0d8')},uFog:{value:C3('#d3e6e2')},uShM:{value:null},uShP:{value:new T.Matrix4()},uShOn:{value:0},uFogK:{value:1},
  /* the time of day (see the sky's block): the light's two tones and the shade's, night, the street lamps, fog's reach, rain and snow, the season */
  uLitA:{value:new T.Vector3(.93,.92,.89)},uLitB:{value:new T.Vector3(1.05,1.02,.95)},uShdC:{value:new T.Vector3(.6,.66,.83)},uNight:{value:0},
  uLmp:{value:Array.from({length:8},()=>new T.Vector4(0,-99,0,0))},uFogR:{value:new T.Vector2(16,52)},uFogA:{value:.55},uWet:{value:0},uSnow:{value:0},uSeason:{value:0},
  uBmO:{value:new T.Vector4(0,0,0,0)},uBmD:{value:new T.Vector4(1,0,0,.985)}};   // the lighthouse's beam: where it starts (and how strong), which way it points
/* ----- the launch scene's light (see the launch scene, at the end) -----
   uHole: the launch shaft's axis and radius (0 whenever the scene is not running, so nothing is cut); uLamp: how many rings
   of the shaft's lamps are on; uQL: the scene's own lamps (where, how bright), uQR: how far each reaches.
   The ground and the pad are cut where the shaft opens (uHoleOn 1); its doors show only inside it, the rest of them hidden
   under the rim (uHoleOn -1) */
Object.assign(LU,{uHole:{value:new T.Vector4(0,1,0,0)},uLamp:{value:0},uQL:{value:Array.from({length:3},()=>new T.Vector4(0,-99,0,0))},uQR:{value:new T.Vector3(1,1,1)}});
const HOLE=`uniform vec4 uHole; uniform float uHoleOn;
  void holeCut(vec3 w){ if(uHole.w>0.){ float a=dot(w,uHole.xyz); if(a>0.&&length(w-uHole.xyz*a)<uHole.w) discard; } }
  void hole(vec3 w){ if(uHoleOn>.5) holeCut(w); else if(uHoleOn<-.5){ float a=dot(w,uHole.xyz); if(uHole.w<=0.||length(w-uHole.xyz*a)>uHole.w-.004) discard; } }`;
/* (each part below is compiled into a shader only where its name is defined: QSHAFT, QLAMP, QHOLE. Only the scene's own
   versions of the town's materials have them, worn while it plays; the rest of the time every shader is as it always was) */
/* down the shaft: the sun gets in only through its mouth (and only where nothing up top, a tree, a house, shades the mouth
   itself), the sky's light fades with depth, and the lamps light what passes them */
const QSHAFT=`float sh=1., amb=1.; vec3 lamp=vec3(0.);
#if defined(QFIG)
    sh=1.;   // (the scene's two faces: never in a cast shadow, as a film lights its close-ups)
#elif defined(QSHAFT)
    float ha=1., hl=1e3; vec3 lat=vec3(0.); if(uHole.w>0.){ float a=dot(w,uHole.xyz); ha=a-${(R+.1).toFixed(2)}; lat=w-uHole.xyz*a; hl=length(lat); }
    if(ha<.02&&hl<uHole.w+.02){ float su=dot(uSun,uHole.xyz); vec3 sl=uSun-uHole.xyz*su;
      sh=su>.02?smoothstep(.03,-.05,length(lat+sl*(-min(ha,0.)/su))-uHole.w)*shadowAt(w+uSun*((.03-min(ha,0.))/su),.0006+.0024*(1.-su)):0.;
      amb=mix(.1,1.,smoothstep(-2.6,-.05,ha)); float fw=.4+.6*max(dot(n,lat/max(hl,.001)),0.);
      for(int i=0;i<4;i++){ float y=-.9-1.55*float(i); lamp+=vec3(1.,.74,.42)*exp(-pow((ha-y)/.6,2.))*step(float(i)+.5,uLamp)*fw; } }
    else sh=shadowAt(w,.0006+.0024*(1.-clamp(d,0.,1.)));
#else
    sh=shadowAt(w,.0006+.0024*(1.-clamp(d,0.,1.)));
#endif
`;
/* and the scene's own lamps: a warm light on whatever faces them, by night and at dusk (the street lamps' light, further) */
const QLAMPS=`
#ifdef QLAMP
    if(uQL[0].w+uQL[1].w+uQL[2].w>.001){ vec3 L=vec3(0.); for(int i=0;i<3;i++){ vec3 tl=uQL[i].xyz-w; float dd=length(tl), f=max(0.,1.-dd/uQR[i]); L+=vec3(1.,.78,.5)*uQL[i].w*f*f*(.25+.75*max(dot(n,tl/max(dd,.001)),0.)); } c+=base*L; }
#endif
`;
/* the cut, in the shaders that take it (compiled in only for the scene's own versions of them: see the launch scene) */
const QCUT=`
#ifdef QHOLE
  hole(vW);
#endif
`;
const LIGHT=`uniform vec3 uSun,uSky,uFog,uLitA,uLitB,uShdC; uniform sampler2D uShM; uniform mat4 uShP; uniform float uShOn,uShDbg,uFogK,uNight,uFogA,uWet,uSnow,uSeason,uLamp; uniform vec2 uFogR; uniform vec4 uLmp[8],uBmO,uBmD,uQL[3]; uniform vec3 uQR; ${HOLE}
  float shadowAt(vec3 w,float b){ if(uShOn<.5) return 1.; vec3 q=(uShP*vec4(w,1.)).xyz*.5+.5; if(q.x<.001||q.x>.999||q.y<.001||q.y>.999||q.z>.999) return 1.;
    float t=.6/${SHN}.; return .25*(step(q.z-b,texture2D(uShM,q.xy+vec2(-t,-t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(t,-t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(-t,t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(t,t)).r)); }
  vec3 toon(vec3 base,vec3 n,vec3 w){ float d=dot(n,uSun); ${QSHAFT}
    float k=min(smoothstep(-.03,.03,d),smoothstep(.35,.65,sh)), hi=smoothstep(.5,.56,d)*k;
    vec3 c=mix(base*uShdC*amb,mix(base*uLitA,base*uLitB,hi),k);
    c+=base*uSky*.07*(.5+.5*dot(n,normalize(w)))*amb+base*lamp*.62; c=mix(c,vec3(1.,0.,0.),(1.-sh)*uShDbg); ${QLAMPS}
    /* at night, the street lamps: a warm pool round each, on whatever faces it */
    if(uNight>.01){ vec3 L=vec3(0.); for(int i=0;i<8;i++){ vec3 tl=uLmp[i].xyz-w; float dd=length(tl), f=max(0.,1.-dd/5.5); L+=uLmp[i].w*f*f*(.3+.7*max(dot(n,tl/max(dd,.001)),0.)); } c+=base*vec3(1.,.74,.42)*L*1.7*uNight; }
    /* the lighthouse's beam lights whatever lies in its sweep below the lamp, and the fog thins along it */
    float bm=0.; if(uBmO.w>.01){ vec3 U=normalize(uBmO.xyz), v=w-uBmO.xyz, vh=v-U*dot(v,U); float L=length(vh);
      if(L>2.&&dot(v,U)<.5) bm=smoothstep(uBmD.w,uBmD.w+.012,dot(vh/L,uBmD.xyz))*smoothstep(26.,9.,L)*smoothstep(2.5,6.5,L)*uBmO.w; }
    c+=base*vec3(1.,.93,.74)*bm*(.12+.85*uNight);
    return mix(c,uFog,smoothstep(uFogR.x,uFogR.y,distance(cameraPosition,w))*uFogA*uFogK*(1.-.7*bm)); }`;
const TOON_V=uv=>`varying vec3 vN; varying vec3 vW; varying vec3 vC; ${uv?'varying vec2 vUv;':''}
  void main(){ vec4 p=vec4(position,1.); vec3 nn=normal; vC=vec3(1.); ${uv?'vUv=uv;':''}
    #ifdef USE_INSTANCING
      p=instanceMatrix*p; nn=mat3(instanceMatrix)*nn;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vC=instanceColor;
    #endif
    #ifdef USE_COLOR
      vC*=color;
    #endif
    vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(mat3(modelMatrix)*nn); gl_Position=projectionMatrix*viewMatrix*w; }`;
const TOON_F=`uniform vec3 uC; uniform float uOp,uKit; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
  void main(){ ${QCUT} nearFade(vW); vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 b=uC*vC, E=vec3(0.);
    if(uKit>.5){ float upn=dot(n,normalize(vW));
      /* leaves turn with the season, tree by tree: reds and golds in autumn (uSeason up to 1), blossom in spring (down to -1) */
      float lb=-1.; if(abs(vC.r-.31)<.006&&abs(vC.g-.498)<.006) lb=.29; else if(abs(vC.r-.373)<.006&&abs(vC.g-.573)<.006) lb=.337; else if(abs(vC.r-.435)<.006&&abs(vC.g-.635)<.006) lb=.373; else if(abs(vC.r-.498)<.006&&abs(vC.g-.682)<.006) lb=.4;
      if(abs(uSeason)>.01&&lb>0.){ float hs=clamp((vC.b-lb)/.012,0.,1.);
        vec3 au=mix(vec3(.86,.45,.2),mix(vec3(.9,.7,.3),vec3(.74,.3,.18),step(.7,hs)),step(.42,hs))*(.82+.4*vC.g);
        b=uSeason>0.?mix(b,au,uSeason*.85*step(.2,hs)):mix(b,mix(vec3(.97,.78,.85),vec3(.99,.93,.94),hs),-uSeason*step(.55,hs)*.85); }
      b=mix(b,vec3(.93,.95,.97),uSnow*smoothstep(.55,.8,upn));   // snow on whatever faces the sky
      b*=1.-.2*uWet*smoothstep(.5,.9,upn);   // rain darkens it
      if(uNight>.01&&distance(vC,vec3(.498,.639,.706))<.02){ float hw=fract(sin(dot(floor(vW*1.7),vec3(7.13,157.1,113.7)))*43758.5453); E+=vec3(1.,.76,.44)*step(.3,hw)*(.7+.4*hw)*uNight; }   // windows lit inside, not every one
      if(distance(vC,vec3(1.,.949,.769))<.02){ float m=0.; for(int i=0;i<8;i++) m=max(m,uLmp[i].w*step(distance(vW,uLmp[i].xyz),.7)); E+=vec3(1.,.86,.55)*m*1.6*uNight; } }   // a lamp's glass, as bright as its lamp
    gl_FragColor=vec4(toon(b,n,vW)+E,uOp); }`;
const mcache=new Map();
function toonMat(color,o={}){ const op=o.op??1, key=op+'|'+(o.side||0)+'|'+(o.vc?1:0)+'|'+(o.fig?1:0)+'|'+C3(color).getHexString(); if(!o.fresh&&mcache.has(key)) return mcache.get(key);
  const m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3(color).clone()},uOp:{value:op},uCut:{value:o.fig?0:1}},LU),vertexShader:TOON_V(),fragmentShader:TOON_F,transparent:op<1,depthWrite:op>=1,side:o.side||T.FrontSide,vertexColors:!!o.vc});
  if(!o.fresh) mcache.set(key,m); return m; }
/* what the ink pass sees: the normal and the distance of every surface; what the sun sees: only depth */
const INK_F=`varying vec3 vN; varying vec3 vW; ${HOLE} ${NEAR} void main(){ ${QCUT} nearFade(vW); vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(n*.5+.5,1./(1.+distance(cameraPosition,vW))); }`;
const SHD_F=`void main(){ gl_FragColor=vec4(1.); }`;
const FLAT_F=`uniform vec3 uC; varying vec3 vN; varying vec3 vW; ${NEAR} void main(){ nearFade(vW); gl_FragColor=vec4(uC,1.); }`;
const flatMat=c=>new T.ShaderMaterial({uniforms:{uC:{value:C3(c)}},vertexShader:TOON_V(),fragmentShader:FLAT_F});

/* ---------- one big mesh for everything that never moves: houses, roads, trees, fences, the lighthouse ---------- */
const KITS={main:{P:[],N:[],C:[]}}; let KP=KITS.main.P, KN=KITS.main.N, KC=KITS.main.C; const kT=new T.Vector3(), kV=new T.Vector3(), kNM=new T.Matrix3();
/* what goes into the static mesh can be sent to a landmark's own mesh instead, so it can be shown, hidden and grown on its own */
function kitTo(id='main'){ const k=KITS[id]||(KITS[id]={P:[],N:[],C:[]}); KP=k.P; KN=k.N; KC=k.C; }
function kadd(g,c,M){ const p=g.attributes.position, q=g.attributes.normal; kNM.getNormalMatrix(M); const col=C3(c);
  for(let i=0;i<p.count;i++){ kT.fromBufferAttribute(p,i).applyMatrix4(M); kV.fromBufferAttribute(q,i).applyMatrix3(kNM).normalize(); KP.push(kT.x,kT.y,kT.z); KN.push(kV.x,kV.y,kV.z); KC.push(col.r,col.g,col.b); } }
function ktri(a,b,c,n,col){ const C=C3(col); for(const p of [a,b,c]){ KP.push(p.x,p.y,p.z); KN.push(n.x,n.y,n.z); KC.push(C.r,C.g,C.b); } }
const qA=new T.Vector3(), qB=new T.Vector3();
function kquad(a,b,c,d,n,col){ qA.subVectors(b,a); qB.subVectors(c,a); if(qA.cross(qB).dot(n)>=0){ ktri(a,b,c,n,col); ktri(a,c,d,n,col); } else { ktri(a,c,b,n,col); ktri(a,d,c,n,col); } }
const prismG=(()=>{ const A=[-.5,0,-.5],B=[.5,0,-.5],Cc=[0,1,-.5],A2=[-.5,0,.5],B2=[.5,0,.5],C2=[0,1,.5];
  const v=[A,Cc,B, A2,B2,C2, A,A2,C2, A,C2,Cc, B,Cc,C2, B,C2,B2, A,B,B2, A,B2,A2].flat(); const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(v,3)); g.computeVertexNormals(); return g; })();
const GEO={box:new T.BoxGeometry(1,1,1).toNonIndexed(), cyl:new T.CylinderGeometry(1,1,1,18).toNonIndexed(), cyl8:new T.CylinderGeometry(1,1,1,8).toNonIndexed(), tcyl:new T.CylinderGeometry(.9,1,1,18).toNonIndexed(),
  cone:new T.ConeGeometry(1,1,18).toNonIndexed(), cone8:new T.ConeGeometry(1,1,9).toNonIndexed(), blob:new T.IcosahedronGeometry(1,1).toNonIndexed(), rock:new T.DodecahedronGeometry(1,0).toNonIndexed(),
  sph:new T.SphereGeometry(1,12,8).toNonIndexed(), prism:prismG};
const pL=new T.Matrix4(), pM=new T.Matrix4(), pQ=new T.Quaternion(), pE=new T.Euler(), pS=new T.Vector3(), pP=new T.Vector3();
function put(M,geo,c,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){ pE.set(rx,ry,rz,'YXZ'); pQ.setFromEuler(pE); pL.compose(pP.set(x,y,z),pQ,pS.set(sx,sy,sz)); kadd(GEO[geo],c,pM.multiplyMatrices(M,pL)); }
const box=(M,c,x,y,z,w,h,d,ry=0,rx=0,rz=0)=>put(M,'box',c,x,y+h/2,z,w,h,d,ry,rx,rz); // y is the bottom
const cyl=(M,c,x,y,z,r,h,g='cyl')=>put(M,g,c,x,y+h/2,z,r,h,r);
const sub=(M,x,y,z,ry=0)=>new T.Matrix4().multiplyMatrices(M,new T.Matrix4().makeRotationY(ry).setPosition(x,y,z));
const OBS=[]; const obs=(x,z,r,h=3)=>OBS.push({x,z,r,h});
/* an obstacle at a point in a thing's own frame */
const _oa=new T.Vector3(); function obsAt(M,lx,lz,r,h=1.2){ const [x,z]=loc(_oa.set(lx,0,lz).applyMatrix4(M).normalize()); obs(x,z,r,h); }
function obsRect(x,z,yaw,w,d,h=3){ const ax=w>=d, L=ax?w:d, Wd=ax?d:w, n=Math.max(1,Math.ceil(L/Wd)), ux=ax?Math.cos(yaw):Math.sin(yaw), uz=ax?-Math.sin(yaw):Math.cos(yaw);
  for(let k=0;k<n;k++){ const t=(n===1?0:(k/(n-1)-.5))*(L-Wd); obs(x+ux*t,z+uz*t,Wd/2+.12,h); } }

/* ---------- roads and paths ---------- */
const LOOP=[[-3,-8.7],[2.5,-8.9],[7.4,-6.4],[9.3,-.8],[8.6,4.8],[5,8.6],[-.5,9.6],[-5.8,8],[-8.8,3.4],[-9,-2.4],[-7,-7.1]];
const SPUR=[[-3,-10.9],[-3,-13.3]];
const RW=1.2, SW=1, CURB=.09, ROADH=.015;
const ROADS=[]; // dense samples [x,z] of every road centre line, for distances
function roadDist(x,z){ let m=1e9; for(const r of ROADS) for(let i=0;i<r.length-1;i++){ const a=r[i],b=r[i+1], ex=b[0]-a[0], ez=b[1]-a[1], t=clamp(((x-a[0])*ex+(z-a[1])*ez)/(ex*ex+ez*ez||1),0,1); m=Math.min(m,Math.hypot(x-a[0]-ex*t,z-a[1]-ez*t)); } return m; }
let SEGS=[]; // dirt paths [x1,z1,x2,z2,halfwidth]
function pathDist(x,z){ let m=1e9; for(const s of SEGS){ const ex=s[2]-s[0], ez=s[3]-s[1], t=clamp(((x-s[0])*ex+(z-s[1])*ez)/(ex*ex+ez*ez),0,1); m=Math.min(m,Math.hypot(x-s[0]-ex*t,z-s[1]-ez*t)-s[4]); } return m; }
function onJetty(x,z){ const [a,b]=JETTY, ex=b[0]-a[0], ez=b[1]-a[1], L=Math.hypot(ex,ez), t=((x-a[0])*ex+(z-a[1])*ez)/(L*L); if(t<-.02||t>1) return false; return Math.abs(((x-a[0])*ez-(z-a[1])*ex)/L)<.62; }
let DECK=-.5;
/* where your feet are: on the ground, up on the pavement, or on the boards of the jetty */
function standH(x,z){ if(onJetty(x,z)) return DECK+.12; if(Math.hypot(x-PAD[0],z-PAD[1])<2.35) return .1; const g=grid(GH,x,z), rd=roadDist(x,z); return g+(rd<RW?ROADH:rd<RW+SW?CURB:0); }

/* ---------- signs: painted boards with the dot-matrix type, drawn on a canvas ---------- */
const SIGN_F=`uniform sampler2D uMap; varying vec3 vN; varying vec3 vW; varying vec3 vC; varying vec2 vUv; ${LIGHT} ${NEAR}
  void main(){ nearFade(vW); vec3 n=normalize(vN); gl_FragColor=vec4(toon(texture2D(uMap,vUv).rgb,n,vW),1.); }`;
function signTex(txt,sub,w,h,bg,fg){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const tx=new T.CanvasTexture(cv); tx.anisotropy=4;
  const draw=()=>{ const c=cv.getContext('2d'); c.fillStyle=bg; c.fillRect(0,0,w,h); c.strokeStyle=fg; c.lineWidth=h*.05; c.strokeRect(h*.06,h*.06,w-h*.12,h-h*.12);
    c.fillStyle=fg; c.strokeStyle=fg; c.textAlign='center'; c.textBaseline='middle'; const fs=h*(sub?.36:.46); c.font=`900 ${fs}px Doto, monospace`; c.lineWidth=fs*.07;
    const y=sub?h*.4:h*.53, fit=(t,f)=>{ c.font=`900 ${f}px Doto, monospace`; const m=c.measureText(t).width; return m>w*.86?f*w*.86/m:f; };
    let f1=fit(txt,fs); c.font=`900 ${f1}px Doto, monospace`; c.lineWidth=f1*.07; c.strokeText(txt,w/2,y); c.fillText(txt,w/2,y);
    if(sub){ const f2=fit(sub,h*.15); c.font=`900 ${f2}px Doto, monospace`; c.lineWidth=f2*.06; c.strokeText(sub,w/2,h*.74); c.fillText(sub,w/2,h*.74); } tx.needsUpdate=true; };
  draw(); if(document.fonts&&document.fonts.load) document.fonts.load('900 40px Doto').then(draw).catch(()=>{}); return tx; }
function sign(M,txt,o={}){ const w=o.w||1.5, h=o.h||.5, y=o.y??1.25, post=o.post!==false;
  const px=o.legs?w/2+.04:w*.38;   // legs: posts at the board's ends, clear of words that run its whole width
  if(post){ box(M,'#6d5544',-px,0,-.04,.08,y+h/2,.08); box(M,'#6d5544',px,0,-.04,.08,y+h/2,.08); [-px,0,px].forEach(k=>obsAt(M,k,-.04,.15,y+h/2)); }
  const ox=o.x||0; box(M,o.board||'#5b4636',ox,y-h/2-.03,-.06,w+.1,h+.06,.06);
  const mat=new T.ShaderMaterial({uniforms:Object.assign({uCut:{value:1},uMap:{value:signTex(txt,o.sub,512,Math.round(512*h/w),o.bg||'#f3ead8',o.fg||'#2a241d')}},LU),vertexShader:TOON_V(true),fragmentShader:SIGN_F});
  const m=new T.Mesh(new T.PlaneGeometry(w,h),mat); m.matrixAutoUpdate=false; m.matrix.copy(sub(M,ox,y,-.025)); m.userData.cast=true; sc.add(m); return m; }

/* ---------- prefabs ---------- */
function windowAt(M,x,y,z,ry,o={}){ const W=sub(M,x,y,z,ry), tr=o.trim||'#f6f1e7';
  box(W,tr,0,-.36,.02,.76,.72,.06); box(W,'#7fa3b4',0,-.29,.04,.58,.56,.05); box(W,tr,0,-.29,.05,.04,.56,.04); box(W,tr,0,-.03,.05,.58,.04,.04); box(W,tr,0,-.42,.06,.88,.06,.16);
  if(o.flowers){ box(W,'#8a5a3c',0,-.56,.12,.72,.14,.18); for(let k=0;k<4;k++) put(W,'sph',['#f19bb0','#f6d26b','#fbf6ec','#e9744f'][k],-.24+k*.16,-.38,.14,.07,.07,.07); } }
function door(M,x,z,ry,c,tr){ const D=sub(M,x,0,z,ry); box(D,tr,0,.2,.02,.78,1.26,.06); box(D,c,0,.2,.05,.6,1.12,.05); box(D,'#e7c36a',.2,.75,.09,.05,.05,.04); box(D,'#bdb6aa',0,0,.32,.96,.16,.56); }
const HOUSES=[];
function house(x,z,yaw,o){ const M=frameAt(x,z,yaw), w=o.w||3.4, d=o.d||2.8, h=o.h||2.4, tr=o.trim||'#f6f1e7'; HOUSES.push({M,w,d,h,dx:o.doorX||0,flat:!!o.flat});
  box(M,'#a49b8f',0,0,0,w+.18,.22,d+.18); box(M,o.wall,0,.2,0,w,h-.2,d);
  if(o.flat){ box(M,o.roof,0,h,0,w+.3,.2,d+.3); box(M,tr,0,h+.2,0,w+.3,.06,d+.3); }
  else { const rh=o.rh||1.3; put(M,'prism',o.roof,0,h,0,d+.62,rh,w+.5,Math.PI/2); box(M,tr,0,h-.12,d/2+.04,w+.1,.12,.05); box(M,tr,0,h-.12,-d/2-.04,w+.1,.12,.05);
    if(o.chim!==false) box(M,'#b07a5e',w*.28,h+.25,-d*.16,.34,rh*.95,.34); }
  door(M,o.doorX||0,d/2,0,o.door||'#6e4a3a',tr);
  (o.win||[-w*.3,w*.3]).forEach((wx,i)=>windowAt(M,wx,1.42,d/2,0,{flowers:o.flowers&&i===0,trim:tr}));
  if(o.up) (o.win||[-w*.3,w*.3]).concat([o.doorX||0]).forEach(wx=>windowAt(M,wx,h-.85,d/2,0,{trim:tr}));
  windowAt(M,w/2,1.42,0,Math.PI/2,{trim:tr}); windowAt(M,-w/2,1.42,0,-Math.PI/2,{trim:tr});
  if(o.extra) o.extra(M,w,d,h); obsRect(x,z,yaw,w+.25,d+.25,h+(o.flat?.35:(o.rh||1.3)+.3)); return M; }  // as tall as the ridge
const LAMPS=[];
function lamp(x,z){ const M=frameAt(x,z,0); LAMPS.push({x,z,p:new T.Vector3(0,2.44,.38).applyMatrix4(M),k:0,hot:0}); cyl(M,'#43504f',0,0,0,.09,.26,'cyl8'); cyl(M,'#536160',0,.24,0,.05,2.5,'cyl8'); box(M,'#536160',0,2.66,.16,.06,.06,.4);
  box(M,'#3c4746',0,2.5,.38,.28,.14,.26); box(M,'#fff2c4',0,2.44,.38,.2,.06,.18); obs(x,z,.2,1.2); }
function bench(x,z,yaw){ const M=frameAt(x,z,yaw); [-.6,.6].forEach(s=>{ box(M,'#4e4a45',s,0,0,.07,.42,.42); box(M,'#4e4a45',s,.42,-.2,.07,.36,.06); });
  for(let k=0;k<3;k++) box(M,'#b8834f',0,.42,-.14+k*.14,1.46,.05,.12); for(let k=0;k<2;k++) box(M,'#b8834f',0,.56+k*.15,-.22,1.46,.1,.04,0,-.12); obs(x,z,.6,1); }
const LEAF=['#4f7f4a','#5f9256','#6fa25f','#7fae66'];
const TREES=[];
function tree(x,z,s=1){ const M=frameAt(x,z,rnd()*TAU), th=1.25*s; TREES.push([x,z,s]);
  put(M,'cyl8','#7a5a42',0,th/2,0,.12*s,th,.12*s); put(M,'cyl8','#7a5a42',.2*s,th*.82,0,.05*s,.62*s,.05*s,0,0,-.75);
  const tk=fract(Math.sin(x*12.9898+z*78.233)*43758.5453), lc=LEAF.map(c=>{ const q=C3(c).clone(); q.b+=tk*.012; return q; });   // which colour this tree turns in autumn, hidden in its leaves' blue
  const n=5+Math.floor(rnd()*3); for(let k=0;k<n;k++){ const a=rnd()*TAU, rr=k?(.42+rnd()*.25)*s:0, bs=(k?.48+rnd()*.3:.82)*s; put(M,'blob',lc[Math.min(3,Math.floor(rnd()*3)+(k>2?1:0))],Math.cos(a)*rr,th+.45*s+(k?rnd()*.55*s-.1:.2*s),Math.sin(a)*rr,bs,bs*.86,bs); }
  obs(x,z,.26*s,3.5); }
function pine(x,z,s=1){ const M=frameAt(x,z,rnd()*TAU); put(M,'cyl8','#6b4e3e',0,.35*s,0,.1*s,.7*s,.1*s);
  for(let k=0;k<3;k++){ const r=(1-k*.25)*.82*s, hh=1.2*s; put(M,'cone8',k%2?'#3f6c4f':'#4a7b57',0,.55*s+k*.62*s+hh/2,0,r,hh,r); } obs(x,z,.3*s,3.5); }
function bush(x,z,s=1){ const M=frameAt(x,z,rnd()*TAU); for(let k=0;k<3;k++) put(M,'blob',LEAF[1+(k%2)],(k-1)*.32*s,.26*s,(rnd()-.5)*.2*s,.36*s,.3*s,.34*s); obs(x,z,.42*s,.6); }
function rock(x,z,s=1,y=0){ const M=frameAt(x,z,rnd()*TAU); put(M,'rock',rnd()<.5?'#a49e94':'#928c83',0,y+.25*s,0,.62*s,.45*s,.55*s,0,rnd(),rnd()); obs(x,z,.5*s,.5*s); }
function fence(pts,c='#f3ede2'){ for(let i=0;i<pts.length-1;i++){ const [x0,z0]=pts[i],[x1,z1]=pts[i+1], L=Math.hypot(x1-x0,z1-z0), n=Math.max(1,Math.round(L/.5)), yaw=Math.atan2(-(z1-z0),x1-x0);
    for(let k=0;k<=n;k++){ if(k===n&&i<pts.length-2) continue; const t=k/n, fx=x0+(x1-x0)*t, fz=z0+(z1-z0)*t, M=frameAt(fx,fz,yaw); obs(fx,fz,.14,.9); box(M,c,0,0,0,.07,.78,.07); box(M,c,0,.78,0,.05,.06,.05,0,0,.785); }
    const Mm=frameAt((x0+x1)/2,(z0+z1)/2,yaw); box(Mm,c,0,.32,0,L,.06,.04); box(Mm,c,0,.6,0,L,.06,.04); } }
const POLES=[];
function pole(x,z,yaw){ const M=frameAt(x,z,yaw); cyl(M,'#7a6352',0,0,0,.1,4.4,'cyl8'); box(M,'#6a5446',0,4.0,0,1.3,.09,.09);
  [-.55,.55].forEach(s=>cyl(M,'#e7e2d8',s,4.09,0,.03,.1,'cyl8')); POLES.push([-.55,.55].map(s=>new T.Vector3(s,4.18,0).applyMatrix4(M))); obs(x,z,.16,4); }
function wires(){ for(let i=0;i<POLES.length-1;i++){ const A=POLES[i], B=POLES[i+1]; if(A[0].distanceTo(B[0])>9) continue;
  for(let s=0;s<2;s++){ const a=A[s], b=B[s], pts=[]; for(let k=0;k<=10;k++){ const t=k/10; const p=a.clone().lerp(b,t); p.addScaledVector(V.copy(p).normalize(),-.38*4*t*(1-t)); pts.push(p); }
    kadd(new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,.014,4,false).toNonIndexed(),'#3a383b',new T.Matrix4()); } } }

/* ---------- the town ---------- */
function coastR(bx,bz,margin){ const L=Math.hypot(bx,bz), ux=bx/L, uz=bz/L; for(let r=6;r<24;r+=.1){ if(isle(at(ux*r,uz*r))<.03) return [ux*(r-margin),uz*(r-margin)]; } return [ux*14,uz*14]; }
/* ---------- the landmarks: every project stands here, however you came; never an empty plot to wonder about ---------- */
const MK={}, seen=new Set();
function mark(id,x,z,y=0){ const g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g); const base=at(x,z).multiplyScalar(R+y); return MK[id]={id,g,base,obs:[],k:1,st:'off',t:0}; }
function markObs(id,h0){ const o=OBS[OBS.length-1]; MK[id].obs.push({o,h:o.h,h0}); }   // the obstacle just added: full height when built, h0 when not
function markScale(m,k){ m.k=k; const b=m.base; m.g.matrix.makeScale(k,k,k).setPosition(b.x*(1-k),b.y*(1-k),b.z*(1-k)); m.g.matrixWorldNeedsUpdate=true; }
let PH, AE, KR, BE, OG;
/* where each landmark stands, how tall it is, and what it says when you walk up to it */
const INST={}, CARD={kr:['Kríos','Voice practice for sales teams','Rehearse the call out loud, and a buyer answers back.','https://krios.ie','View project'],
  ae:['Aetos','Counter-drone command software','It reads a sky full of drones and marks the one that matters.','https://github.com/ahroonsanthosh/Aetos','View project'],
  ph:['Pharos','GPS-free drone navigation','No GPS, so the drone finds itself by matching what it sees to the map.','https://github.com/ahroonsanthosh/pharos','View project'],
  og:['Ogive','AI tools for OpenRocket','Name the height, and it reworks the rocket until it gets there.','https://github.com/michaelsheffernan/ogive','View project'],
  be:['Heloria Labs','The workshop','Where the three of us build. Talk to us: contact@helorialabs.com','mailto:contact@helorialabs.com','Email us'],
  cafe:['Café','Book a chat with us','Pull up a chair. Tell us what you are working on and we will find a time to talk.',
    'mailto:contact@helorialabs.com?subject='+encodeURIComponent('Booking a chat with Heloria Labs')+'&body='+encodeURIComponent('Hi Ahroon, Michael and Abraham,\n\nI would like to book a chat about:\n\nA few times that suit me:\n'),'Book a chat']};
const CAFE_ON=__CAFE__;   // the board and its card: set by the build (untamed/build.py CAFE_LIVE for the site)
/* a small quadcopter for the landmarks: a body, four arms, four rotors, and a light underneath */
function drone(light){ const g=new T.Group(); g.matrixAutoUpdate=false; const dk=toonMat('#4a5058'), lt=toonMat('#e9ecef');
  g.add(new T.Mesh(new T.BoxGeometry(.22,.07,.22),dk));
  for(let k=0;k<4;k++){ const a=k*Math.PI/2+Math.PI/4, ax=Math.cos(a)*.2, az=Math.sin(a)*.2;
    const arm=new T.Mesh(new T.BoxGeometry(.2,.025,.03),dk); arm.position.set(ax*.5,0,az*.5); arm.rotation.y=-a; g.add(arm);
    const r=new T.Mesh(new T.CylinderGeometry(.085,.085,.012,14),lt); r.position.set(ax,.04,az); g.add(r); }
  const L=new T.Mesh(new T.SphereGeometry(.036,8,6),flatMat(light)); L.position.y=-.055; g.add(L); g.userData.light=L; return g; }
const Mf2=new T.Matrix4(), Mr=new T.Matrix4(), KRY=C3('#3f6fd0'), KRT=C3('#e9873a'), KRC=new T.Color();
function buildTown(){
  /* the square: Kríos, as a glass sculpture with a voice turning inside it */
  { const M=frameAt(0,0,0); cyl(M,'#c9c1b3',0,0,0,1.55,.16); cyl(M,'#ddd6c8',0,.16,0,1.28,.14); const mk=mark('kr',0,0,.3);
    kitTo('kr'); put(M,'cyl','#e9e3d7',0,.3+.55,0,.34,1.1,.34); cyl(M,'#bba987',0,1.38,0,.42,.08); kitTo();
    const g=new T.Group(); g.matrixAutoUpdate=false; g.matrix.copy(sub(M,0,2.05,0)); mk.g.add(g);
    const orb=new T.Mesh(new T.SphereGeometry(.64,32,20),toonMat('#bcd8e6',{op:.42,fresh:true})); g.add(orb);
    const bars=new T.InstancedMesh(new T.BoxGeometry(.05,1,.05),toonMat('#ffffff',{fresh:true}),28); for(let k=0;k<28;k++) bars.setColorAt(k,KRY); bars.userData.dyn=true; g.add(bars); KR={g,bars,M,mt:0};
    INST.kr={x:0,z:0,h:3.1,r:4.8};
    sign(sub(M,0,0,-1.95,Math.PI),'KRÍOS',{sub:'rehearse the calls that matter',w:1.7,h:.62,y:.95}); obs(0,0,1.6,2.6); markObs('kr',.4); }
  [[1.9,1.9],[-1.9,1.9],[1.9,-1.9],[-1.9,-1.9]].forEach(([x,z])=>bench(x*1.45,z*1.45,yawTo(x,z,0,0)));
  for(let k=0;k<26;k++){ const a=k/26*TAU, r=1.85+rnd()*.25; if(Math.abs(Math.sin(a))<.16||Math.abs(Math.cos(a))<.16) continue; const M=frameAt(Math.cos(a)*r,Math.sin(a)*r,0); put(M,'sph',['#f19bb0','#f6d26b','#fbf6ec','#e9744f','#b9a2e0'][k%5],0,.12,0,.13,.11,.13); put(M,'blob',LEAF[2],0,.04,0,.16,.08,.16); }
  [[-4,4,1.3],[4.1,-3.7,1.15],[4.6,4.3,1],[-4.6,-3.9,1.05]].forEach(([x,z,s])=>tree(x,z,s));
  [[-2.4,-5.4],[2.6,5.6],[5.6,-1.8],[-5.6,2.2]].forEach(([x,z])=>bush(x,z,1.1));
  /* houses round the loop, each facing the road */
  const H=(x,z,o)=>house(x,z,yawTo(x,z,0,0),o);
  H(-13.3,-3.2,{wall:'#f1e2c6',roof:'#c8664b',flowers:true});
  H(-13,3.8,{wall:'#cfe0e6',roof:'#4f6f8f',w:3.8,h:2.6});
  H(-5.8,13.6,{wall:'#f3d9c4',roof:'#9a5340',w:3.2,d:2.6});
  H(13.3,-3.4,{wall:'#e8ecd9',roof:'#c8664b',up:true,h:3.6,rh:1.1});
  H(12.9,7.2,{wall:'#f6eedf',roof:'#5d7f6a',w:3,d:2.6,flowers:true});
  H(-10.6,10.4,{wall:'#e9d3b0',roof:'#7d5a8f',w:3,d:2.6});
  H(6.4,-12.6,{wall:'#dfe6ef',roof:'#c8664b',w:3.2,flowers:true});
  // the workshop: Heloria Labs
  { const x=-.8,z=13.8, yaw=yawTo(x,z,-.5,9.6); house(x,z,yaw,{wall:'#c9d5d1',roof:'#59646a',trim:'#eef0ea',flat:true,w:4.8,d:3.2,h:3,doorX:1.65,win:[-1.9],
      extra:(M,w,d,h)=>{ box(M,'#8c9599',-.35,.2,d/2+.02,2.1,2.1,.05); for(let k=0;k<11;k++) box(M,'#a9b2b5',-.35,.3+k*.18,d/2+.05,2,.04,.03); box(M,'#59646a',-.35,2.3,d/2+.04,2.3,.12,.08);
        sign(sub(M,-.35,0,d/2+.09),'HELORIA LABS',{w:2.3,h:.5,y:2.68,post:false,bg:'#2a241d',fg:'#f3ead8',board:'#2a241d'});
        [[2.9,.7],[3.3,.2],[2.95,-.4]].forEach(([cx,cz],i)=>{ box(M,i===1?'#b88a5a':'#a77a4c',cx,.2,cz,.6,.55,.6,i*.4); obsAt(M,cx,cz,.42,.8); }); cyl(M,'#5a7d9a',-3,.2,.9,.28,.9); cyl(M,'#c8664b',-3.05,.2,.25,.28,.9); obsAt(M,-3,.9,.32,1); obsAt(M,-3.05,.25,.32,1);
        /* Beacon: a mast on the roof that keeps calling out */
        const B=sub(M,1.4,h+.26,-.7), bw=new T.Vector3(1.4,h+.26,-.7).applyMatrix4(M); const mk=MK.be=mark('be',0,0); mk.base.copy(bw); kitTo('be');
        box(B,'#59646a',0,0,0,.7,.08,.7); for(const [lx,lz] of [[-.2,-.2],[.2,-.2],[0,.22]]) put(B,'cyl8','#8c9599',lx*.5,1.5,lz*.5,.035,3,.035,0,lz*.06,-lx*.06);
        for(let k=0;k<6;k++) cyl(B,'#8c9599',0,.4+k*.45,0,.16-k*.018,.03,'cyl8'); kitTo();
        const lt=new T.Mesh(new T.SphereGeometry(.1,12,8),flatMat('#ff8a2a')); lt.matrixAutoUpdate=false; lt.matrix.copy(sub(B,0,3.08,0)); mk.g.add(lt); BE={lt}; } }); INST.be={x,z,h:4.6,r:5.6}; }
  // the café
  { const x=3,z=-13.4, yaw=yawTo(x,z,3,-8.9); (CAFE_ON?cafeHouse:house)(x,z,yaw,{wall:'#f2dcb8',roof:'#b65a3e',w:4,d:2.8,h:2.95,win:[-1.25,1.25],
      extra:(M,w,d,h)=>{ for(let k=0;k<9;k++) put(M,'box',k%2?'#fbf6ec':'#e9744f',-1.8+k*.45,1.98,d/2+.48,.45,.04,1,0,.42); sign(sub(M,0,0,d/2+.06),'CAFÉ',{w:1.3,h:.38,y:2.55,post:false});
        [[-1.15,1.85],[1.25,1.85]].forEach(([tx,tz])=>{ cyl(M,'#4e4a45',tx,0,tz,.05,.7,'cyl8'); cyl(M,'#f3ede2',tx,.7,tz,.38,.05); [-1,1].forEach(s=>{ cyl(M,'#b8834f',tx+s*.55,0,tz,.17,.45,'cyl8'); }); });
        } });
    obs(3-1.15,-13.4+1.85,.5,1); obs(3+1.25,-13.4+1.85,.5,1); if(CAFE_ON) INST.cafe={x,z,h:3.4,r:4.4}; }
  fence([[-15.2,-5.2],[-15.6,-1.2],[-15.2,1.8]]); fence([[11.2,-6],[15,-6.4]]); fence([[4.2,-14.6],[8.6,-14.6]]);
  /* the landing pad; the rocket that stands on it is built on its own, because it moves */
  { const M=frameAt(PAD[0],PAD[1],0); cyl(M,'#c9c3b8',0,0,0,2.35,.1); for(let k=0;k<24;k++){ const a=k/24*TAU; box(M,'#ef8a3c',Math.cos(a)*2.05,.1,Math.sin(a)*2.05,.2,.012,.07,-a); } obs(PAD[0],PAD[1],1.3,4.5); }
  /* Pharos: a lighthouse on the cliff */
  { const [x,z]=coastR(15,4.2,2.3); const M=frameAt(x,z,yawTo(x,z,0,0)); cyl(M,'#bdb5a8',0,0,0,1.15,.5); const mk=mark('ph',x,z,.5); kitTo('ph');
    for(let k=0;k<6;k++) put(M,'tcyl',k%2?'#cf4a36':'#f4efe6',0,.5+k*.72+.36,0,.84-k*.06,.72,.84-k*.06);
    cyl(M,'#3e4448',0,4.82,0,.92,.1); for(let k=0;k<14;k++){ const a=k/14*TAU; box(M,'#3e4448',Math.cos(a)*.86,4.92,Math.sin(a)*.86,.03,.36,.03); } cyl(M,'#3e4448',0,5.26,0,.88,.03);
    cyl(M,'#e7f1ef',0,4.92,0,.5,.62); put(M,'cone','#cf4a36',0,5.54+.3,0,.66,.6,.66); put(M,'sph','#3e4448',0,6.2,0,.08,.08,.08);
    const beam=new T.Mesh(new T.CylinderGeometry(.03,.36,6,12,1,true).rotateZ(Math.PI/2).translate(3,0,0),toonMat('#fff4c8',{op:.18,fresh:true})); beam.material.depthWrite=false; beam.layers.set(1);
    const bg=new T.Group(); bg.matrixAutoUpdate=false; bg.matrix.copy(sub(M,0,5.2,0)); bg.add(beam); mk.g.add(bg); PH={beam,M,x,z,a:0,over:false,dr:drone('#f5f3ea')}; mk.g.add(PH.dr); kitTo();
    INST.ph={x,z,h:6.7,r:7};
    const yy=yawTo(x,z,0,0), rr=Math.hypot(x,z), ix=-x/rr, iz=-z/rr; house(x+ix*.6+iz*2.7,z+iz*.6-ix*2.7,yy,{wall:'#f4efe6',roof:'#cf4a36',w:2.2,d:2,h:2,win:[-.6],doorX:.5,chim:false});
    sign(sub(M,-1.6,0,1.6,.3),'PHAROS',{sub:'finds its way without GPS',w:1.7,h:.62,y:.95}); obs(x,z,1.25,6); markObs('ph',.6); SEGS.push([10.6,1.7,x-1.2,z-.3,.55]); }
  /* Ogive: a rocket on its pad, with the tower beside it */
  { const [x,z]=coastR(8.8,13.4,3.2); const yaw=yawTo(x,z,5,8.6), M=frameAt(x,z,yaw); box(M,'#c3bdb2',0,0,0,3.2,.22,3.2); box(M,'#6f6a64',0,.22,0,1,.02,1);
    const mk=mark('og',x,z,.22); kitTo('og'); const r=sub(M,0,.22,0); cyl(r,'#f4f0e8',0,.3,0,.3,2.5); cyl(r,'#2f3336',0,1.9,0,.305,.12); put(r,'cone','#ef8a3c',0,2.8+.42,0,.3,.84,.3);
    for(let k=0;k<4;k++){ const a=k*Math.PI/2+.785; box(r,'#ef8a3c',Math.cos(a)*.38,0,Math.sin(a)*.38,.32,.62,.04,-a); } box(r,'#2f3336',0,1.3,.29,.16,.16,.05);
    const Gt=sub(M,1.15,.22,0); [[-.32,-.32],[.32,-.32],[-.32,.32],[.32,.32]].forEach(([gx,gz])=>box(Gt,'#c8664b',gx,0,gz,.08,4,.08));
    for(let k=1;k<8;k++){ box(Gt,'#c8664b',0,k*.5,-.32,.64,.05,.05); box(Gt,'#c8664b',0,k*.5,.32,.64,.05,.05); box(Gt,'#c8664b',-.32,k*.5,0,.05,.05,.64); box(Gt,'#c8664b',.32,k*.5,0,.05,.05,.64); }
    box(Gt,'#8c3f2e',0,4,0,.8,.08,.8); box(Gt,'#c8664b',-.55,2.55,0,.8,.08,.12); kitTo();
    const hoop=new T.Mesh(new T.TorusGeometry(.56,.035,8,44).rotateX(Math.PI/2),flatMat('#ffb26a')); hoop.matrixAutoUpdate=false; mk.g.add(hoop); OG={M:r,hoop,x,z,t:6}; INST.og={x,z,h:6.2,r:7};
    sign(sub(M,-.6,0,2.1),'OGIVE',{sub:'AI tools for OpenRocket',w:1.7,h:.62,y:.95}); obs(x,z,1.9,4); markObs('og',.3); SEGS.push([6.2,10,x-1.4,z-1.5,.55]); }
  /* Aetos: a radar on the rocks, turning */
  { const [x,z]=coastR(-10.2,-11.6,2.6); const yaw=yawTo(x,z,0,0), M=frameAt(x,z,yaw);
    [[0,0,1.6],[.9,.5,1.1],[-.8,.4,1.2],[.3,-.9,1.1],[-.5,-.8,.9]].forEach(([rx,rz,s])=>put(M,'rock',rnd()<.5?'#a49e94':'#928c83',rx,.5*s,rz,.95*s,.75*s,.9*s,rnd()*3,.2,.1));
    const mk=mark('ae',x,z,1); kitTo('ae'); cyl(M,'#9aa3ab',0,1.0,0,.08,1.8,'cyl8'); kitTo(); const hd=new T.Group(); hd.matrixAutoUpdate=false; mk.g.add(hd);
    const dish=new T.Mesh(new T.SphereGeometry(.78,28,12,0,TAU,0,Math.PI*.32),toonMat('#f2f4f2',{side:T.DoubleSide})); dish.rotation.x=-1.25; dish.position.z=.08; hd.add(dish);
    hd.add(new T.Mesh(new T.BoxGeometry(.24,.24,.3),toonMat('#9aa3ab'))); hd.add(new T.Mesh(new T.CylinderGeometry(.018,.018,.6,6).rotateX(-1.25+Math.PI/2).translate(0,.1,.32),toonMat('#9aa3ab')));
    AE={hd,M:sub(M,0,2.9,0),B:M,cyc:0}; INST.ae={x,z,h:4.4,r:4.6};   // close by the landing: the card waits until you walk up to the rocks
    AE.dr=[0,1,2,3,4].map(k=>{ const d=drone(k===0?'#ff8a2a':'#f5f3ea'); mk.g.add(d); return {g:d,a:k*1.31,r:1.9+k*.38,h:3.6+(k%3)*.55,w:(.3+k*.05)*(k%2?-1:1)}; });
    AE.ring=new T.Mesh(new T.TorusGeometry(.34,.024,6,32).rotateX(Math.PI/2),flatMat('#ff8a2a')); AE.ring.matrixAutoUpdate=false; AE.ring.visible=false; AE.ring.userData.noInk=true; mk.g.add(AE.ring);
    sign(sub(M,1.2,0,2.1,-.3),'AETOS',{sub:'which drone actually matters',w:1.7,h:.62,y:.95}); obs(x,z,2.1,3); markObs('ae',1.4); SEGS.push([START[0]-1,START[1]-.4,x+1.8,z+.9,.55]); }
  /* the jetty, out from the beach */
  { const [a,b]=JETTY, L=Math.hypot(b[0]-a[0],b[1]-a[1]), yaw=Math.atan2(-(b[1]-a[1]),b[0]-a[0]); DECK=Math.max(grid(GH,a[0],a[1]),-.55);
    for(let k=0;k<=Math.floor(L/.32);k++){ const t=k*.32/L, M=frameAt(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,yaw); box(M,k%3?'#b48a5c':'#a77e52',0,DECK,0,.26,.08,1.2);
      if(k%5===0){ [-.55,.55].forEach(s=>cyl(M,'#7a5a42',0,DECK-1.1,s,.07,1.4,'cyl8')); } }
    const E=frameAt(b[0],b[1],yaw); cyl(E,'#43504f',0,DECK+.08,.5,.06,1.6,'cyl8'); obsAt(E,0,.5,.16,1.6); box(E,'#fff2c4',0,DECK+1.6,.5,.16,.16,.16);
    SEGS.push([7.4,-7.6,a[0],a[1],.5]); }
  /* street lamps, poles and wires, a signpost */
  [[-9.9,-6.2],[-11.3,1.4],[-7.9,10.4],[0,11.9],[8,9.9],[11.7,-1.4],[9.9,-7.4],[3.8,-11.2]].forEach(([x,z])=>lamp(x,z));
  [[-10.6,-7.6],[-11.4,-1],[-10.9,5.4],[-7.4,11.1],[-2.6,12.1]].forEach(([x,z],i,a)=>{ const q=a[Math.min(i+1,a.length-1)], p0=a[Math.max(0,Math.min(i,a.length-2))], qq=i<a.length-1?q:a[i], pp=i<a.length-1?[x,z]:a[i-1]; pole(x,z,Math.atan2(-(qq[1]-pp[1]),qq[0]-pp[0])+Math.PI/2); }); wires();
}
/* ---------- grass, trees and rocks around the town ---------- */
const CLEAR=()=>[AHR,[6.1,11.1],[1.3,-2.7],START];
const clearAt=(x,z,m)=>roadDist(x,z)>RW+SW+m&&pathDist(x,z)>m*.8&&!OBS.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+m)&&!CLEAR().some(c=>Math.hypot(x-c[0],z-c[1])<4.2);
function mergeG(gs){ const P=[], N=[]; gs.forEach(g=>{ const q=g.index?g.toNonIndexed():g; P.push(...q.attributes.position.array); N.push(...q.attributes.normal.array); });
  const o=new T.BufferGeometry(); o.setAttribute('position',new T.Float32BufferAttribute(P,3)); o.setAttribute('normal',new T.Float32BufferAttribute(N,3)); return o; }
function buildNature(){
  let n=0; for(let i=0;i<900&&n<(LO?34:52);i++){ const a=rnd()*TAU, r=10.5+rnd()*8, x=Math.cos(a)*r, z=Math.sin(a)*r, l=isle(at(x,z)); if(l<.07||!clearAt(x,z,1.1)) continue;
    const s=.85+rnd()*.55; if(x<-5&&rnd()<.6) pine(x,z,s); else tree(x,z,s); n++; }
  for(let i=0;i<400&&n<90;i++){ const a=rnd()*TAU, r=6+rnd()*12, x=Math.cos(a)*r, z=Math.sin(a)*r; if(isle(at(x,z))<.05||!clearAt(x,z,.5)) continue; bush(x,z,.7+rnd()*.6); n++; }
  for(let i=0;i<500;i++){ const a=rnd()*TAU, r=14+rnd()*6, x=Math.cos(a)*r, z=Math.sin(a)*r, l=isle(at(x,z)); if(l<.0||l>.05||!clearAt(x,z,.4)) continue; rock(x,z,.6+rnd()*.9); }
  // grass tufts: small clumps that sway, not inked
  const NG=Math.floor(LO?380:900), blade=mergeG([new T.ConeGeometry(.03,.2,3).translate(0,.1,0),new T.ConeGeometry(.026,.15,3).rotateZ(.35).translate(.04,.07,.01),new T.ConeGeometry(.026,.16,3).rotateZ(-.3).rotateY(1.2).translate(-.035,.075,.02)]);
  const gm=new T.ShaderMaterial({uniforms:Object.assign({uTime:G.uTime},LU),vertexShader:`uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec3 vC;
    void main(){ vec4 p=instanceMatrix*vec4(position,1.); vC=instanceColor; vec3 base=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz; float h=position.y/.2;
      p.xyz+=normalize(cross(normalize(base),vec3(.3,.1,.9)))*sin(uTime*1.6+base.x*2.+base.z*1.7)*.03*h; vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(base); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} void main(){ ${QCUT} gl_FragColor=vec4(toon(vC,normalize(vN),vW),1.); }`}); gm.uniforms.uHoleOn={value:1};
  const gi=new T.InstancedMesh(blade,gm,NG), M=new T.Matrix4(), Qq=new T.Quaternion(), Y=new T.Quaternion(), Ss=new T.Vector3(), Pp=new T.Vector3(), C=new T.Color(); let k=0;
  for(let i=0;i<NG*4&&k<NG;i++){ const x=(rnd()-.5)*36, z=(rnd()-.5)*36, d=at(x,z); if(isle(d)<.04||!clearAt(x,z,.05)) continue; Qq.setFromUnitVectors(UPY,d); Y.setFromAxisAngle(UPY,rnd()*TAU); Qq.multiply(Y);
    const s=.7+rnd()*.9; Pp.copy(d).multiplyScalar(R); Ss.set(s,s,s); M.compose(Pp,Qq,Ss); gi.setMatrixAt(k,M); C.setRGB(.4+rnd()*.08,.58+rnd()*.08,.33+rnd()*.05); gi.setColorAt(k,C); k++; }
  gi.count=k; gi.layers.set(1); sc.add(gi); }

/* ---------- the ground, the sea and the sky ---------- */
const SEGU={value:Array.from({length:12},()=>new T.Vector4(99,99,99,99))}, SEGW={value:new Float32Array(12)};
function buildGround(){
  for(let j=0;j<CN;j++) for(let i=0;i<CN;i++){ const x=-CAPR+i*CS, z=-CAPR+j*CS, d=at(x,z,V), l=isle(d), b=l<.06&&l>-.3?beachK(d):0, k=j*CN+i; GL[k]=l; GB[k]=b; GH[k]=hOf(l,b); }
  const P=new Float32Array(CN*CN*3), XZ=new Float32Array(CN*CN*2), idx=[];
  for(let j=0;j<CN;j++) for(let i=0;i<CN;i++){ const k=j*CN+i, x=-CAPR+i*CS, z=-CAPR+j*CS; at(x,z,V).multiplyScalar(R+GH[k]); P[k*3]=V.x; P[k*3+1]=V.y; P[k*3+2]=V.z; XZ[k*2]=x; XZ[k*2+1]=z;
    if(i<CN-1&&j<CN-1){ const a=k, b=k+1, c=k+CN, e=k+CN+1; if(Math.max(GH[a],GH[b],GH[c],GH[e])>-1.55) idx.push(a,c,b, b,c,e); } } // the sea floor far out is hidden by the sea: skip it
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); g.setAttribute('aL',new T.BufferAttribute(GL,1)); g.setAttribute('aB',new T.BufferAttribute(GB,1)); g.setAttribute('aH',new T.BufferAttribute(GH,1));
  g.setAttribute('aXZ',new T.BufferAttribute(XZ,2)); g.setIndex(idx); g.computeVertexNormals();
  const cap=new T.Mesh(g,new T.ShaderMaterial({uniforms:Object.assign({uSeg:SEGU,uSegW:SEGW,uHoleOn:{value:1}},LU),side:T.DoubleSide,
    vertexShader:`attribute float aL,aB,aH; attribute vec2 aXZ; varying vec3 vN; varying vec3 vW; varying float vL,vB,vH; varying vec2 vXZ;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vL=aL; vB=aB; vH=aH; vXZ=aXZ; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec4 uSeg[12]; uniform float uSegW[12]; varying vec3 vN; varying vec3 vW; varying float vL,vB,vH; varying vec2 vXZ; ${N2} ${LIGHT}
      void main(){ ${QCUT} vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 up=normalize(vW); float steep=1.-dot(n,up); vec2 xz=vXZ;
        // grass painted in two greens, with brushy streaks
        float p1=vn2(xz*.3+3.)*.7+vn2(xz*1.1)*.3, p2=vn2(xz*vec2(1.9,.5)+11.), p3=vn2(xz*2.6);
        vec3 c=mix(vec3(.55,.71,.43),vec3(.45,.62,.38),step(.56,p1)); c=mix(c,vec3(.63,.77,.48),step(.74,p2)*.55); c*=.97+.05*p3;
        // dirt paths with a drawn edge
        float pd=1e3; for(int i=0;i<12;i++){ vec4 s=uSeg[i]; vec2 ab=s.zw-s.xy; float t=clamp(dot(xz-s.xy,ab)/max(dot(ab,ab),1e-4),0.,1.); pd=min(pd,length(xz-s.xy-ab*t)-uSegW[i]); }
        pd+=(vn2(xz*1.7)-.5)*.22; float fw=fwidth(pd)*1.1+.004;
        c=mix(c,vec3(.84,.75,.57)*(.95+.08*vn2(xz*7.)),1.-smoothstep(-fw,fw,pd)); c=mix(c,vec3(.35,.33,.3),(1.-smoothstep(.0,fw*1.6,abs(pd-.01)))*.5);
        // sand by the sea, rock in the cliffs
        float sand=clamp(smoothstep(.035,.012,vL)*(.25+.75*vB)+smoothstep(-.02,-.25,vH)*vB,0.,1.); c=mix(c,vec3(.91,.84,.66)*(.96+.06*vn2(xz*5.)),sand);
        vec3 rock=mix(vec3(.67,.61,.54),vec3(.56,.51,.47),step(.5,fract(vH*2.6+vn2(xz*.7)*.7)));
        c=mix(c,rock,smoothstep(.3,.5,steep)*(1.-vB*.85));
        /* snow on the grass and the paths, thinner on the sand; in the rain the ground darkens and the paths hold puddles of sky */
        { float upn=dot(n,up); c=mix(c,vec3(.93,.95,.97)*(.97+.04*p3),uSnow*smoothstep(.75,.9,upn)*(1.-sand*.6));
          if(uWet>.01){ c*=1.-.16*uWet; float pud=smoothstep(.62,.7,vn2(xz*.8+7.3))*(1.-smoothstep(-fw,fw,pd)); c=mix(c,uSky*.9+vec3(.05),pud*uWet*.55); } }
        float ct=1.-smoothstep(0.,fwidth(vH)*1.3+.003,abs(vH+.05)); c=mix(c,vec3(.24,.22,.21),ct*(1.-vB)*step(.15,steep)*.9);
        gl_FragColor=vec4(toon(c,n,vW),1.); }`}));
  cap.userData.cast=true; sc.add(cap);
  // the sea: shallow and bright by the land, foam where it meets the shore, painted ripples
  const ld=new Uint16Array(CN*CN*4); for(let k=0;k<CN*CN;k++){ ld[k*4]=T.DataUtils.toHalfFloat(GL[k]); ld[k*4+1]=T.DataUtils.toHalfFloat(GH[k]); ld[k*4+2]=T.DataUtils.toHalfFloat(GB[k]); ld[k*4+3]=T.DataUtils.toHalfFloat(1); }
  const landTex=new T.DataTexture(ld,CN,CN,T.RGBAFormat,T.HalfFloatType); landTex.minFilter=landTex.magFilter=T.LinearFilter; landTex.needsUpdate=true;
  const sea=new T.Mesh(new T.SphereGeometry(R+WATER,160,110),new T.ShaderMaterial({uniforms:Object.assign({uLand:{value:landTex},uTime:G.uTime,uHoleOn:{value:1}},LU),
    vertexShader:TOON_V(),
    fragmentShader:`uniform sampler2D uLand; uniform float uTime; varying vec3 vN; varying vec3 vW; ${N2} ${LIGHT}
      void main(){ ${QCUT} vec3 d=normalize(vW); float a=acos(clamp(d.y,-1.,1.)); vec2 xz=d.xz*(a*${R}./max(sin(a),1e-4));
        vec2 g=((xz+${CAPR}.)/${CS}+.5)/${CN}.; float hg=-1.6; if(d.y>0.&&g.x>0.&&g.x<1.&&g.y>0.&&g.y<1.) hg=texture2D(uLand,g).g;
        float dep=${WATER}-hg;
        vec3 c=mix(vec3(.5,.84,.8),vec3(.27,.66,.73),smoothstep(.0,.3,dep)); c=mix(c,vec3(.18,.5,.66),smoothstep(.3,.7,dep));
        float rip=vn2(xz*vec2(.5,1.7)+vec2(uTime*.18,uTime*.05)); c=mix(c,vec3(.74,.92,.9),smoothstep(.72,.75,rip)*.5);
        float fo=1.-smoothstep(.0,.045+.025*sin(uTime*1.3+xz.x*.6+xz.y*.5),dep);
        float fo2=smoothstep(.12,.135,dep)*(1.-smoothstep(.15,.17,dep))*step(.45,vn2(xz*2.2+uTime*.25));
        c=mix(c,vec3(.97,.99,.97),max(fo,fo2*.8));
        gl_FragColor=vec4(toon(c,normalize(vN),vW),1.); }`}));
  sea.userData.cast=false; sc.add(sea);
  // the sky: blue overhead, pale at the horizon, flat painted clouds, the hole as a pale ring by day
  const sky=new T.Mesh(new T.SphereGeometry(300,48,32),new T.ShaderMaterial({uniforms:Object.assign({uUp:UPU,uBH:SKYBH,uTime:G.uTime,uSpace:SPACEU,uNight:LU.uNight},SKYU),side:T.BackSide,depthWrite:false,
    vertexShader:`varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uUp,uBH,uSunD,uMoonD; uniform float uTime,uSpace,uNight,uDusk,uOver,uBow; varying vec3 vD; ${EARTH_GLSL}
      void main(){ vec3 d=normalize(vD); float h=dot(d,uUp), sa=dot(d,uSunD);
        /* by day blue overhead and pale at the horizon; at sunrise and sunset warm low down, deepest by the sun; at night dark blue */
        vec3 c=mix(vec3(.85,.92,.9),vec3(.6,.82,.9),smoothstep(-.06,.22,h)); c=mix(c,vec3(.36,.64,.84),smoothstep(.22,.9,h));
        vec3 k=mix(vec3(.98,.74,.54),vec3(.56,.56,.74),smoothstep(-.05,.42,h)); k=mix(k,vec3(.27,.33,.55),smoothstep(.42,.95,h)); k=mix(k,vec3(1.,.6,.38),pow(max(sa,0.),5.)*(1.-smoothstep(0.,.45,h))*.85);
        c=mix(c,k,uDusk); c=mix(c,mix(vec3(.1,.14,.23),vec3(.025,.04,.09),smoothstep(-.05,.7,h)),uNight);
        c=mix(c,mix(vec3(.66,.7,.72),vec3(.53,.58,.62),smoothstep(0.,.8,h))*(1.-.78*uNight),uOver*.85);   // overcast
        /* the sun low in the sky, and the moon and the stars at night */
        float sd=acos(clamp(sa,-1.,1.)), clear=1.-uOver, md=acos(clamp(dot(d,uMoonD),-1.,1.));
        c+=vec3(1.,.68,.42)*exp(-sd*sd*40.)*.35*uDusk*clear; c=mix(c,vec3(1.,.9,.7),smoothstep(.052,.044,sd)*uDusk*clear*smoothstep(-.03,.01,h));
        c+=vec3(.45,.55,.75)*exp(-md*md*300.)*.22*uNight*clear; c=mix(c,vec3(.95,.94,.86),smoothstep(.034,.028,md)*uNight*clear);
        if(uNight>.01){ vec3 cell=floor(d*260.); float s=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
          c+=step(.9965,s)*(.55+.45*sin(uTime*(.8+s*2.)+s*60.))*smoothstep(.02,.25,h)*clear*uNight*vec3(.95,.93,.86); }
        /* flat painted clouds: white by day, pink at sunset, dark at night, grey and more of them under rain */
        vec3 q=vec3(d.x*1.8,d.y*3.6,d.z*1.8)+vec3(uTime*.006,0.,uTime*.003); float f=efbm(q), fw=fwidth(f)*1.2+.002, band=smoothstep(.0,.1,h)*(1.-smoothstep(.7,.9,h)), th=.57-.13*uOver;
        float cl=smoothstep(th-fw,th+fw,f)*band, top=smoothstep(th+.04-fw,th+.04+fw,efbm(q+vec3(.02,.06,-.02)));
        vec3 c1=mix(mix(vec3(.86,.92,.93),vec3(.96,.72,.66),uDusk),vec3(.1,.13,.2),uNight), c2=mix(mix(vec3(.99,.99,.96),vec3(1.,.87,.72),uDusk),vec3(.17,.2,.28),uNight);
        c1=mix(c1,vec3(.55,.6,.64)*(1.-.75*uNight),uOver); c2=mix(c2,vec3(.7,.74,.77)*(1.-.75*uNight),uOver);
        c=mix(c,c1,cl); c=mix(c,c2,top*cl);
        /* after the rain, with the sun behind you: a rainbow, red outside */
        if(uBow>.01){ float ra=acos(clamp(dot(d,-uSunD),-1.,1.)), t=(.735-ra)/.036; float m=smoothstep(.7,.25,abs(t-.5))*smoothstep(-.02,.12,h);
          vec3 rb=clamp(vec3(1.5-abs(t*4.-.4),1.5-abs(t*4.-1.8),1.5-abs(t*4.-3.2)),0.,1.); c=mix(c,rb,m*uBow*.32); }
        float a=acos(clamp(dot(d,uBH),-1.,1.)); c=mix(c,c*.86,smoothstep(.034,.028,a)); c+=vec3(1.,.86,.66)*exp(-(((a-.036)*120.)*((a-.036)*120.)))*(.22+.4*uNight);
        if(uSpace>0.){ vec3 cell=floor(d*380.); float sh=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
          float star=step(.9965,sh)*(.5+.5*fract(sh*91.7))*smoothstep(.5,1.,uSpace);
          c=mix(c,vec3(.012,.014,.022)+star*vec3(.95,.92,.88),smoothstep(0.,1.,uSpace)); }
        gl_FragColor=vec4(c,1.); }`}));
  sky.renderOrder=-1; sky.frustumCulled=false; sky.layers.set(1); sc.add(sky);
}

/* ---------- people: small cartoon figures, each in what they wear in their photo ---------- */
const SHG=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const SHM=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,
  vertexShader:`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`varying vec2 vU; void main(){ float r=length(vU-.5)*2.; gl_FragColor=vec4(.12,.18,.16,(1.-smoothstep(.55,1.,r))*.32); }`});
const BOXG=new T.BoxGeometry(1,1,1);
function mesh(g,c,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){ const m=new T.Mesh(g,toonMat(c,{fig:true})); m.position.set(x,y,z); m.scale.set(sx,sy,sz); return m; }
/* each part of a person that moves on its own (the body, the head, the eyes, each leg, each upper arm and forearm) is one
   mesh: every piece of it is baked in, in its own colour, so a face, a collar or a head of curls costs a single draw */
const FIGM=toonMat('#ffffff',{fig:true,vc:true});
const FG={sph:new T.SphereGeometry(1,14,10).toNonIndexed(), ball:new T.IcosahedronGeometry(1,1), box:new T.BoxGeometry(1,1,1).toNonIndexed(), cone:new T.ConeGeometry(1,1,12).toNonIndexed(),
  limb:new T.CylinderGeometry(1,.78,1,12,1,true).toNonIndexed(), tube:new T.CylinderGeometry(1,1,1,14,1,true).toNonIndexed(), can:new T.CylinderGeometry(1,1,1,14).toNonIndexed(),
  band:new T.TorusGeometry(1,.06,6,26,Math.PI).toNonIndexed()};
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), fM=new T.Matrix4(), fNM=new T.Matrix3(), fQ=new T.Quaternion(), fE=new T.Euler(), fT=v3(), fS=v3(), fU=v3(), fW=v3(), fX=v3(1,0,0), fY=v3(0,1,0);
const tint=(c,k)=>C3(c).clone().lerp(C3(k>0?'#ffffff':'#000000'),Math.abs(k));
function part(){ const P=[],N=[],C=[], o={};
  /* one triangle, turned to face the way its normals point */
  o.tri=(a,na,b,nb,c,nc,col)=>{ fU.subVectors(b,a).cross(fW.subVectors(c,a)); if(fU.dot(fW.copy(na).add(nb).add(nc))<0){ [b,c]=[c,b]; [nb,nc]=[nc,nb]; } const k=C3(col);
    for(const [p,n] of [[a,na],[b,nb],[c,nc]]){ P.push(p.x,p.y,p.z); N.push(n.x,n.y,n.z); C.push(k.r,k.g,k.b); } };
  /* rows of points (each {p, n}) joined into quads, round to the start of each row again if wrap */
  o.grid=(G,col,wrap)=>{ for(let i=0;i<G.length-1;i++) for(let j=0;j<G[i].length-(wrap?0:1);j++){ const j2=(j+1)%G[i].length, a=G[i][j], b=G[i][j2], c=G[i+1][j2], d=G[i+1][j];
    o.tri(a.p,a.n,b.p,b.n,c.p,c.n,col); o.tri(a.p,a.n,c.p,c.n,d.p,d.n,col); } };
  /* the same, seen from both sides (a collar) */
  o.grid2=(G,col,wrap)=>{ o.grid(G,col,wrap); o.grid(G.map(r=>r.map(v=>({p:v.p,n:v.n.clone().negate()}))),col,wrap); };
  /* one of the shapes in FG, placed by a matrix; at x,y,z, scaled, turned; or with its own axes laid along a, b and c */
  o.geo=(g,col,M)=>{ const p=g.attributes.position, q=g.attributes.normal, V=[v3(),v3(),v3()], Q=[v3(),v3(),v3()]; fNM.getNormalMatrix(M);
    for(let i=0;i<p.count;i+=3){ for(let k=0;k<3;k++){ V[k].fromBufferAttribute(p,i+k).applyMatrix4(M); Q[k].fromBufferAttribute(q,i+k).applyMatrix3(fNM).normalize(); } o.tri(V[0],Q[0],V[1],Q[1],V[2],Q[2],col); } };
  o.put=(g,col,x,y,z,sx,sy=sx,sz=sx,rx=0,ry=0,rz=0)=>o.geo(g,col,fM.compose(fT.set(x,y,z),fQ.setFromEuler(fE.set(rx,ry,rz,'YXZ')),fS.set(sx,sy,sz)));
  o.along=(g,col,p,a,b,c)=>o.geo(g,col,fM.makeBasis(a,b,c).setPosition(p));
  /* the mesh, its origin at (x,y,z), so that it scales about there */
  o.mesh=(x=0,y=0,z=0)=>{ for(let i=0;i<P.length;i+=3){ P[i]-=x; P[i+1]-=y; P[i+2]-=z; } const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('normal',new T.Float32BufferAttribute(N,3)); g.setAttribute('color',new T.Float32BufferAttribute(C,3));
    const m=new T.Mesh(g,FIGM); m.position.set(x,y,z); return m; };
  return o; }
/* a tube through rings [y, half width, half depth, forward], all the way round or from angle a0 to a1 (0 is the front) */
function tube(R0,n=16,a0=0,a1=TAU){ const full=a1-a0>TAU-1e-4, m=full?n:n+1, cy=(R0[0][0]+R0[R0.length-1][0])/2;
  const G=R0.map(([y,rx,rz,dz=0])=>Array.from({length:m},(_,j)=>{ const a=a0+(a1-a0)*j/n; return {p:v3(Math.sin(a)*rx,y,Math.cos(a)*rz+dz),c:dz}; }));
  G.forEach((row,i)=>row.forEach((v,j)=>{ const L=row[full?(j+m-1)%m:Math.max(0,j-1)].p, Rr=row[full?(j+1)%m:Math.min(m-1,j+1)].p, U=G[Math.min(G.length-1,i+1)][j].p, D=G[Math.max(0,i-1)][j].p;
    v.n=v3().subVectors(Rr,L).cross(v3().subVectors(U,D)); if(v.n.lengthSq()<1e-12) v.n.set(0,v.p.y-cy,0); v.n.normalize(); if(v.n.dot(v3(v.p.x,v.p.y-cy,v.p.z-v.c))<0) v.n.negate(); }));
  return G; }
/* a head: where each direction from its middle lands on the skin. w, h, d: half its width, height and depth; jaw: how much
   narrower it gets toward the chin; chin: how far the chin comes forward */
const headF=(w,h,d,jaw,chin)=>u=>{ const lo=sstep(.15,-.95,u.y), fr=sstep(-.35,.35,u.z);
  return v3(u.x*w*(1-jaw*lo),u.y*h,u.z*d*lerp(1.07,1-.05*(1-lo),fr)+chin*lo*Math.max(0,u.z)); };
function fnorm(f,u){ const t1=v3().crossVectors(u,Math.abs(u.y)<.9?fY:fX).normalize(), t2=v3().crossVectors(u,t1), p=f(u),
  n=f(t1.multiplyScalar(.01).add(u).normalize()).sub(p).cross(f(t2.multiplyScalar(.01).add(u).normalize()).sub(p)).normalize(); return n.dot(p)<0?n.negate():n; }
function skin(f,n=26,m=18){ return Array.from({length:m+1},(_,i)=>{ const th=Math.PI*i/m; return Array.from({length:n},(_,j)=>{ const ph=TAU*j/n, u=v3(Math.sin(th)*Math.sin(ph),Math.cos(th),Math.sin(th)*Math.cos(ph)); return {p:f(u),n:fnorm(f,u)}; }); }); }
/* the point of the face seen at (x, y) from straight in front, lifted off the skin by off */
function onFace(f,x,y,off){ const w=f(v3(1,0,0)).x, h=f(v3(0,1,0)).y; let X=x/w, Y=y/h; const u=v3();
  for(let k=0;k<14;k++){ u.set(X,Y,Math.sqrt(Math.max(.01,1-X*X-Y*Y))).normalize(); const p=f(u); X+=(x-p.x)/w; Y+=(y-p.y)/h; }
  const n=fnorm(f,u); return {p:f(u).addScaledVector(n,off),n}; }
/* painting on a surface S(x, y, off) that curves away from you: a filled shape (its outline as seen from in front), laid on in
   rings so it follows the curve; or a stroke along a line of points, with a width at each */
function fine(pts,close,st=.007){ const o=[], n=pts.length; for(let i=0;i<(close?n:n-1);i++){ const a=pts[i], b=pts[(i+1)%n], k=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/st));
  for(let j=0;j<k;j++) o.push(a.map((v,c)=>lerp(v,b[c],j/k))); } if(!close) o.push(pts[n-1]); return o; }
function blot(B,S,pts,col,off=.003){ const q=fine(pts,true), cx=q.reduce((s,p)=>s+p[0],0)/q.length, cy=q.reduce((s,p)=>s+p[1],0)/q.length;
  B.grid([0,1,2,3].map(k=>q.map(([x,y])=>S(cx+(x-cx)*k/3,cy+(y-cy)*k/3,off))),col,true); }
function line(B,S,pts,wd,col,off=.003){ const q=fine(pts.map(([x,y],i)=>[x,y,Array.isArray(wd)?wd[i]:wd]),false,.005), G=[[],[]];
  q.forEach(([x,y,w],i)=>{ const a=q[Math.max(0,i-1)], b=q[Math.min(q.length-1,i+1)], tx=b[0]-a[0], ty=b[1]-a[1], l=Math.hypot(tx,ty)||1; w/=2;
    G[0].push(S(x-ty/l*w,y+tx/l*w,off)); G[1].push(S(x+ty/l*w,y-tx/l*w,off)); }); B.grid(G,col); }
/* ... or raised off it, h(x, y) high, over a patch from x0 to x1 and y0 to y1 (a nose), its normals from its own shape */
function bump(B,S,x0,x1,y0,y1,h,col,n=14){ const G=Array.from({length:n+1},(_,i)=>Array.from({length:n+1},(_,j)=>{ const x=lerp(x0,x1,j/n), y=lerp(y1,y0,i/n); return S(x,y,.0006+h(x,y)); }));
  G.forEach((r,i)=>r.forEach((v,j)=>{ const k=v3().subVectors(r[Math.min(n,j+1)].p,r[Math.max(0,j-1)].p).cross(v3().subVectors(G[Math.max(0,i-1)][j].p,G[Math.min(n,i+1)][j].p)).normalize(); v.n=k.dot(v.n)<0?k.negate():k; }));
  B.grid(G,col); }
/* ... or the space between two curves, top(x) and bot(x), across xs */
function band(B,S,xs,top,bot,col,off=.003){ B.grid([xs.map(x=>S(x,top(x),off)),xs.map(x=>S(x,bot(x),off))],col); }
const oval=(x,y,rx,ry,n=12)=>Array.from({length:n},(_,i)=>[x+Math.cos(TAU*i/n)*rx,y+Math.sin(TAU*i/n)*ry]);
/* hair that hugs the head out to a hairline: edge(a) is how far down from the crown it comes (a is the way round: 0 in front, a
   quarter turn to his left), lift(t,a) how far it stands off the skin, t going from the crown (0) to the hairline (1). Its
   edge turns in under the skin, so the pen draws the hairline. Gives back at(t,a,up), a point on the hair (up above it) and the
   normal there, and lump(), to lay a shape on it */
function cap(B,f,col,edge,lift,tilt=.25,n=12,m=40){ const A=v3(0,Math.cos(tilt),-Math.sin(tilt)), F=v3(0,Math.sin(tilt),Math.cos(tilt));
  const dir=(th,a)=>A.clone().multiplyScalar(Math.cos(th)).addScaledVector(F,Math.sin(th)*Math.cos(a)).addScaledVector(fX,Math.sin(th)*Math.sin(a)).normalize();
  const at=(t,a,up=0)=>{ const u=dir(edge(a)*t,a), nn=fnorm(f,u); return {p:f(u).addScaledVector(nn,lift(t,a)+up),n:nn}; };
  const G=[], E=[], I=[]; for(let i=0;i<=n;i++) G.push(Array.from({length:m},(_,j)=>at(i/n,TAU*j/m)));
  for(let i=1;i<=n;i++) G[i].forEach((v,j)=>{ const k=v3().subVectors(G[i][(j+1)%m].p,G[i][(j+m-1)%m].p).cross(v3().subVectors(G[Math.min(n,i+1)][j].p,G[i-1][j].p)).normalize(); if(k.dot(v.n)<0) k.negate(); v.k=k; });
  for(let i=1;i<=n;i++) G[i].forEach(v=>{ v.n=v.k; });
  for(let j=0;j<m;j++){ const a=TAU*j/m, th=edge(a), u=dir(th,a), nn=fnorm(f,u), tg=f(dir(th+.03,a)).sub(f(u)).normalize(); E.push({p:G[n][j].p,n:tg}); I.push({p:f(u).addScaledVector(nn,-.005),n:tg}); }
  B.grid(G,col,true); B.grid([E,I],col,true);
  /* a shape laid on it at p, long along L, its sizes r: long, wide, deep */
  const lump=(g,c,p,n,L,r)=>{ const l=L.clone().normalize(), s=v3().crossVectors(n,l); if(s.lengthSq()<1e-6) s.crossVectors(fX,l); s.normalize(); const d=v3().crossVectors(l,s).normalize(); B.along(g,c,p,l.multiplyScalar(r[0]),s.multiplyScalar(r[1]),d.multiplyScalar(r[2])); };
  return {at,lump}; }
const burns=(a,w=1.22,k=.3)=>k*Math.exp(-(((Math.abs(a)-w)/.13)**2));   // sideburns, just in front of the ears
/* hair, each of us as in our photo: tight black curls with short sides; a light brown crop pushed up at the front; dark
   waves swept back and up. (short is for you, the visitor) */
const HAIR={
  curly:(B,f,c)=>{ const c2=C3(c).clone().lerp(C3('#6a4a36'),.22), r=seeded(7), edge=a=>1.32-.36*Math.cos(a)+burns(a,1.2,.26), sd=a=>Math.abs(Math.sin(a)),
    H=cap(B,f,c,edge,(t,a)=>.006+.028*(1-t*t)*(1-.6*sd(a)));
    // coils all over the top, fewer down the faded sides; a few fall forward onto his forehead
    for(let k=0;k<84;k++){ const t=Math.sqrt((k+.5)/84)*.92, a=k*2.39996; if(t>.6&&sd(a)>.78||t>.74&&Math.cos(a)<-.15) continue;
      const rr=.025+r()*.012, q=H.at(t,a,rr*.3); B.put(FG.ball,k%3?c:c2,q.p.x,q.p.y,q.p.z,rr,rr*.85,rr,r()*3,r()*3,r()*3); }
    for(let k=0;k<8;k++){ const a=(k/7-.5)*1.6, rr=.022+r()*.008, q=H.at(.96+.04*(k%2),a,rr*.2); B.put(FG.ball,k%2?c2:c,q.p.x,q.p.y-.006,q.p.z,rr,rr*.9,rr,r()*3,r()*3,0); } },
  textured:(B,f,c)=>{ const fr=a=>Math.max(0,Math.cos(a))**1.5, rg=(t,a)=>(.5+.5*Math.cos(a*15+3*t))**2, edge=a=>1.4-.38*Math.cos(a)+burns(a,1.22,.2)+.05*fr(a)*rg(1,a);
    // short at the sides, the fringe pushed up into a ridge of pieces along the front, the pieces running back over the top
    cap(B,f,c,edge,(t,a)=>.01+.016*(1-t*t)+.052*fr(a)*sstep(.1,.72,t)*sstep(1,.9,t)+.012*sstep(.05,.5,t)*rg(t,a)*(.4+.6*fr(a)),.25,14,90); },
  wavy:(B,f,c)=>{ const fr=a=>Math.max(0,Math.cos(a*.85))**1.3, edge=a=>1.3-.4*Math.cos(a)+burns(a,1.22,.24);
    // high at the front and swept back over the top in waves, short at the sides; two locks fallen onto his forehead
    const H=cap(B,f,c,edge,(t,a)=>.011+.012*(1-t)+.07*fr(a)*sstep(0,.72,t)*sstep(1,.86,t)+.011*sstep(.05,.4,t)*(.5+.5*Math.cos(a*11+2.2*Math.sin(t*6)))**2,.25,14,80);
    for(const a of [-.4,-.22]){ const q=H.at(.97,a,-.002), L=v3(a-.2,-1,.3); H.lump(FG.sph,c,q.p.addScaledVector(L.clone().normalize(),.026),q.n,L,[.04,.013,.008]); } },
  short:(B,f,c)=>{ const edge=a=>1.3-.36*Math.cos(a)+burns(a,1.22,.2); cap(B,f,c,edge,(t,a)=>.012+.012*(1-t)); } };
/* a face, painted on: eyes (dark, with a glint; in a mesh of their own so they can blink), brows, a nose, a mouth, and
   what each of us has besides (a moustache and a chin beard, rosy cheeks) */
function face(B,E,f,o){ const F=o.face||{}, S=(x,y,off)=>onFace(f,x,y,off), ey=F.ey??-.012, ex=F.ex??.058, rw=F.rw??.0155, rh=F.rh??.021, my=ey-(F.mouth??.078), hc=o.hairC, bw=F.bw??.014;
  [-1,1].forEach(s=>{ blot(E,S,oval(s*ex,ey,rw,rh,14),'#221a16',.0035); blot(E,S,oval(s*ex+rw*.32,ey+rh*.4,rw*.36,rw*.36,8),'#fbf7f0',.005);
    const by=ey+(F.by??.05), ar=F.arch??.008; line(B,S,[[s*(ex-.03),by-.003+(F.knit??0)],[s*(ex-.006),by+ar],[s*(ex+.03),by-.002]],[bw,bw*.9,bw*.5],hc,.0035); });
  // the nose: a ridge from between the eyes to a rounded tip, its wings either side, so the pen finds only its underside
  const nt=ey-(F.nose??.036), ns=F.ns??1; bump(B,S,-.03,.03,nt-.022,ey+.004,(x,y)=>{ const t=clamp((ey-.004-y)/(ey-.004-nt),0,1.6), w=(.005+.008*Math.min(t,1))*ns;
    return (.012*ns*(t<1?t**1.5:Math.exp(-(((t-1)/.24)**2)))*Math.exp(-((x/w)**2))+.006*ns*[-1,1].reduce((m,s)=>m+Math.exp(-(((x-s*.011*ns)/.006)**2+((y-nt-.002)/.006)**2)),0)); },o.skin,18);
  if(o.cheeks) [-1,1].forEach(s=>blot(B,S,oval(s*.088,ey-.042,.02,.012),C3(o.skin).clone().lerp(C3('#ee8f7c'),.38),.003));
  /* stubble: the jaw, chin and upper lip a shade toward the colour of the beard, drawn under the mouth */
  if(o.stubble){ const sc=C3(o.skin).clone().lerp(C3(o.stubble),.52); blot(B,S,[[-.084,ey-.052],[-.05,my+.024],[-.018,my+.03],[0,my+.026],[.018,my+.03],[.05,my+.024],[.084,ey-.052],[.088,my-.026],[.062,my-.066],[.03,my-.084],[0,my-.088],[-.03,my-.084],[-.062,my-.066],[-.088,my-.026]],sc,.0025); }
  const mc='#5a2822';
  if(o.mouth==='grin'){ const W=.046, top=x=>my+.004+.01*(x/W)**2, bot=x=>my+.01*(x/W)**2-.026*(1-(x/W)**2), xs=Array.from({length:11},(_,i)=>(i/10*2-1)*W);
    band(B,S,xs,top,bot,'#6b2a27',.003); band(B,S,xs.map(x=>x*.96),x=>top(x)-.001,x=>Math.min(top(x)-.001,Math.max(bot(x)+.004,top(x)-.011)),'#f6f0e6',.0042);
    blot(B,S,oval(0,my-.019,.014,.005,10),'#c4615c',.0042); }
  else if(o.mouth==='smirk') line(B,S,[[-.033,my+.006],[-.012,my-.004],[.012,my-.004],[.031,my+.008],[.036,my+.012]],[.004,.0075,.0075,.006,.003],mc,.0035);
  else line(B,S,[[-.032,my+.007],[-.012,my-.003],[.012,my-.003],[.032,my+.007]],[.004,.007,.007,.004],mc,.0035);
  if(o.mous) line(B,S,[[-.038,my+.008],[-.022,my+.017],[0,my+.019],[.022,my+.017],[.038,my+.008]],[.004,.008,.007,.008,.004],hc,.004);
  if(o.goatee){ blot(B,S,[[-.009,my-.012],[.009,my-.012],[.006,my-.03],[-.006,my-.03]],hc,.004);
    blot(B,S,[[-.022,my-.036],[0,my-.03],[.022,my-.036],[.026,my-.062],[.016,my-.08],[0,my-.086],[-.016,my-.08],[-.026,my-.062]],hc,.004);
    const q=S(0,my-.066,0); B.put(FG.sph,hc,0,q.p.y-.006,q.p.z-.012,.024,.022,.02,.5); }
  /* glasses: dark, squarish rims round the eyes, a bridge, and the arms going back toward the ears */
  if(o.glasses){ const gc=o.glasses, gw=.031, gh=.02, cy=ey+.003;
    [-1,1].forEach(sd=>{ const cx=sd*ex; line(B,S,[[cx-gw,cy+gh],[cx+gw,cy+gh*.94],[cx+gw*1.02,cy-gh*.8],[cx+gw*.8,cy-gh],[cx-gw*.8,cy-gh],[cx-gw*1.02,cy-gh*.8],[cx-gw,cy+gh]],.0048,gc,.0062);
      line(B,S,[[cx+sd*gw,cy+gh*.7],[sd*(ex+gw+.03),cy+gh*.8]],.0045,gc,.006); });
    line(B,S,[[-ex+gw,cy+gh*.45],[0,cy+gh*.62],[ex-gw,cy+gh*.45]],.0042,gc,.0062); }
  return ey; }
/* each of us, a little more ourselves. build broadens the shoulders (arm: the arms); head is the shape of the head (half width,
   height, depth, how much the jaw narrows, how far the chin comes forward); funnel and zip make a quarter-zip (funnel: how far
   open its collar is), polo a polo's collar and buttons; under is the shirt collar showing beneath; watch on the left wrist;
   mous(tache), goatee, cheeks, mouth; prop is the thing we carry for our project */
function figure(o){ const g=new T.Group(), body=new T.Group(); g.add(body); const W=o.build||1, Aw=o.arm||W, sk=o.skin, sh=o.shirt;
  const bd=part();
  bd.put(FG.sph,o.pants,0,.53,0,.138*W,.09,.088);
  // the top, hem to neck: in at the waist, out at the chest, round over the shoulders; a band at the hem
  const D=(o.depth||.7)/.7, TR=[[.465,.13,.092],[.475,.142,.1],[.535,.144,.102],[.545,.136,.096],[.65,.136,.096],[.79,.152,.108],[.86,.166,.11],[.9,.188,.104],[.932,.194,.094],[.952,.175,.082],[.968,.13,.068],[.981,.076,.055],[.99,.046,.044]].map(([y,x,z])=>[y,x*W,z*D]);
  bd.grid(tube(TR,22),sh,true);
  const TS=(x,y,off)=>{ let k=0; while(k<TR.length-2&&TR[k+1][0]<y) k++; const [y0,x0,z0]=TR[k], [y1,x1,z1]=TR[k+1], e=clamp((y-y0)/(y1-y0),0,1), rx=lerp(x0,x1,e), rz=lerp(z0,z1,e), q=clamp(x/rx,-.98,.98), z=rz*Math.sqrt(1-q*q), n=v3(x/(rx*rx),0,z/(rz*rz)).normalize();
    return {p:v3(x,y,z).addScaledVector(n,off),n}; };
  bd.put(FG.tube,sk,0,1.0,0,.045,.13,.043);   // the neck
  if(o.funnel){ const gp=o.funnel;   // a quarter-zip: its stand-up collar, open at the front where the zip is down
    bd.grid2(tube([[.95,.07*Math.max(1,W*.9),.064,.004],[.995,.066,.06,.006],[1.04,.062,.057,.007]],18,gp,TAU-gp),sh,false);
    const vb=o.zipV??.9; blot(bd,TS,[[-.046*gp/.5,.986],[.046*gp/.5,.986],[0,vb]],o.under||tint(sh,-.4),.002);
    if(o.under){ bd.grid(tube([[.955,.05,.047,.006],[.998,.048,.046,.006]],14),o.under,true);   // the shirt collar beneath, its points spread over the zip
      [-1,1].forEach(s=>blot(bd,TS,[[s*.008,.986],[s*.05,.978],[s*.03,.944]],tint(o.under,.15),.0035)); }
    line(bd,TS,[[0,vb+.004],[0,.755]],.008,o.zip,.003); const q=TS(.0,vb-.012,.008); bd.put(FG.box,o.zip,q.p.x+.004,q.p.y,q.p.z,.011,.03,.006,0,0,.12);
    line(bd,TS,[[-.004,.755],[.004,.755]],.006,o.zip,.003); }
  if(o.crew){   // a crew-neck jumper: a ribbed band round the neck; the shirt's collar points above it and its hem below
    bd.grid(tube([[.952,.068,.06,.007],[.99,.058,.053,.007]],18),tint(sh,-.14),true);
    if(o.under){ [-1,1].forEach(sd=>blot(bd,TS,[[sd*.004,.995],[sd*.058,.986],[sd*.036,.958]],o.under,.0075));
      bd.grid(tube([[.448,.133*W,.096*D],[.47,.134*W,.097*D]],22),o.under,true); } }
  if(o.polo){   // a polo: a collar lying over the shoulders with its points on the chest, and a placket with two buttons
    bd.grid2(tube([[.995,.054,.05,.006],[.97,.074,.066,.006],[.955,.086,.074,.006]],18,.3,TAU-.3),sh,false);
    [-1,1].forEach(s=>{ const q=TS(s*.03,.948,.005); bd.put(FG.box,sh,q.p.x,q.p.y,q.p.z,.052,.04,.007,-.55,0,s*.42); });
    blot(bd,TS,[[-.013,.97],[.013,.97],[.013,.865],[-.013,.865]],o.polo,.003); [.94,.9].forEach(y=>{ const q=TS(0,y,.006); bd.put(FG.sph,'#59534d',q.p.x,q.p.y,q.p.z,.0065,.0065,.004); }); }
  if(o.logo) blot(bd,TS,oval(.075*W,.86,.011,.006,8),o.logo,.003);
  if(o.pack){ bd.put(FG.box,o.pack,0,.79,-.17,.24,.3,.12); bd.put(FG.box,tint(o.pack,-.3),0,.93,-.205,.2,.05,.06); [-1,1].forEach(s=>bd.put(FG.box,tint(o.pack,-.3),s*.085,.83,0,.028,.2,.235)); }   // and its straps
  body.add(bd.mesh());
  // legs: trousers tapering to the ankle, and shoes with a sole
  const legs=[-1,1].map(s=>{ const l=new T.Group(); l.position.set(s*.074*W,.5,0); const L=part();
    L.put(FG.sph,o.pants,0,0,0,.07); L.put(FG.limb,o.pants,0,-.215,0,.069,.43,.069); L.put(FG.tube,o.pants,0,-.418,0,.058,.026,.06);
    L.put(FG.box,o.sole||tint(o.shoes,-.35),0,-.488,.03,.098,.024,.21); L.put(FG.sph,o.shoes,0,-.458,.034,.052,.044,.102); L.put(FG.sph,o.shoes,0,-.445,-.012,.05,.05,.05);
    l.add(L.mesh()); body.add(l); return l; });
  // arms: a rounded shoulder and the upper arm in one piece, the forearm and hand in another, so a wave can bend at the elbow
  const fore=[], arms=[-1,1].map(s=>{ const a=new T.Group(); a.position.set(s*.2*W,.9,0); const U=part(), sl=o.short?sk:sh;
    U.put(FG.sph,sh,0,-.012,0,.049*Aw);
    if(o.short){ U.put(FG.limb,sh,0,-.055,0,.058*Aw,.11,.058*Aw); U.put(FG.tube,sh,0,-.104,0,.047*Aw,.014,.047*Aw); U.put(FG.limb,sk,0,-.14,0,.045*Aw,.09,.045*Aw); }
    else U.put(FG.limb,sh,0,-.09,0,.049*Aw,.18,.049*Aw);
    a.add(U.mesh()); const fa=new T.Group(); fa.position.y=-.18; fa.rotation.x=-.12; a.add(fa); const Fm=part();
    Fm.put(FG.sph,sl,0,0,0,.039*Aw); Fm.put(FG.limb,sl,0,-.075,0,.04*Aw,.15,.04*Aw);
    if(!o.short) Fm.put(FG.tube,sh,0,-.14,0,.035*Aw,.026,.035*Aw);   // a ribbed cuff
    Fm.put(FG.sph,sk,0,-.19,.004,.024*Aw,.043,.034*Aw); Fm.put(FG.sph,sk,-s*.006,-.172,.026,.012,.022,.012,.4);   // the hand, palm in, thumb forward
    if(o.watch&&s>0){ Fm.put(FG.tube,o.watch,0,-.128,0,.034*Aw,.016,.034*Aw); Fm.put(FG.can,o.watch,.034*Aw,-.128,0,.016,.008,.016,0,0,Math.PI/2); Fm.put(FG.can,'#5d6066',.038*Aw,-.128,0,.011,.002,.011,0,0,Math.PI/2); }
    if(o.prop==='rocket'&&s<0){ const z=.05;   // Ogive: a model rocket in his hand
      Fm.put(FG.can,'#f4f0e8',0,-.15,z,.03,.17,.03); Fm.put(FG.cone,'#f4f0e8',0,-.03,z,.03,.07,.03); Fm.put(FG.can,'#ef8a3c',0,-.105,z,.032,.022,.032);
      [-1,1].forEach(k=>Fm.put(FG.box,'#ffc392',k*.038,-.222,z,.03,.045,.008)); }
    fa.add(Fm.mesh()); fore.push(fa); body.add(a); return a; });
  // the head
  const head=new T.Group(); head.position.y=1.165; body.add(head); const H=part(), E=part(), hd=o.head||[.152,.172,.16,.14,.024], f=headF(...hd);
  H.grid(skin(f),sk,true);
  [-1,1].forEach(s=>H.put(FG.sph,sk,s*hd[0]*.97,-.022,-.008,.02,.038,.028,0,s*.35));   // ears
  const ey=face(H,E,f,o);
  HAIR[o.hair](H,f,o.hairC);
  if(o.prop==='headset'){ const hc='#2a2c31';   // Kríos: a headset, its band behind his hair, the mic at his mouth
    H.put(FG.band,hc,0,.0,-.01,hd[0]+.035,.225,.225,-.55); [-1,1].forEach(s=>{ H.put(FG.sph,hc,s*(hd[0]+.03),-.02,-.004,.024,.046,.042); H.put(FG.can,'#4a4d54',s*(hd[0]+.05),-.02,-.004,.03,.006,.03,0,0,Math.PI/2); });
    const m0=v3(-(hd[0]+.04),-.04,.03), mq=onFace(f,-.036,ey-.075,.016).p, L=mq.clone().sub(m0), mid=m0.clone().add(mq).multiplyScalar(.5), s1=v3().crossVectors(L,fY).normalize().multiplyScalar(.006), s2=v3().crossVectors(L,s1).normalize().multiplyScalar(.006);
    H.along(FG.box,hc,mid,L,s1,s2); H.put(FG.sph,hc,mq.x,mq.y,mq.z,.014); }
  head.add(H.mesh()); const em=E.mesh(0,ey,0); head.add(em);
  let prop=null;
  if(o.prop==='drone'){ prop=drone('#7fd3ff'); prop.matrixAutoUpdate=true; prop.scale.setScalar(.62); prop.position.set(-.46,1.48,.06); g.add(prop); }   // Aetos: a little drone at his shoulder, clear of the hand he waves with
  const shd=new T.Mesh(SHG,SHM); shd.scale.set(.62,1,.62); shd.position.y=.025; shd.renderOrder=1; shd.layers.set(1); g.add(shd);
  g.userData={legs,arms,fore,head,body,eyes:[em],drone:o.prop==='drone'?prop:null}; return g; }
/* what each of us says: every landmark stands, so we talk about them as they are, and mention it if you came by way of
   the flight and stopped at one of them up there */
const NAME={kr:'Kríos',ae:'Aetos',ph:'Pharos',og:'Ogive',be:'Beacon'}, MET=new Set(); let FRESH=[];
function linesFor(i){ const land=!!st.land, been=id=>!land&&S.docked.has(id), back=MET.has(i);
  if(i===0){ const last='And this is me. Come and say hello properly.';
    if(back) return ['Good to see you again.','Michael is up by his rocket and Abraham is in the square, if you haven\'t caught them yet.',last];
    return [...(land?['Oh, hello! Welcome to Earth.']:['Oh, hello! That contact inside the horizon? It was us.','Welcome to Earth.']),
      'I\'m Ahroon. Michael, Abraham and I build Heloria Labs together, and everything round here is something we\'ve made.',
      `That radar on the rocks is Aetos, mine.${land?'':' It\'s what picked you up.'} When the sky fills with drones, it works out which one actually matters.`,
      `The lighthouse out on the cliff is mine too: Pharos.${been('ph')?' You\'ve flown it already.':''} When GPS is jammed, spoofed or gone, its drone keeps going, and it knows when it doesn\'t know.`,
      'Abraham is in the square by Kríos, and Michael is up by his rocket. Go and say hi.',last]; }
  if(i===1) return [back?'Hey, good to see you again.':'Hey, I\'m Michael.',
    `This rocket is Ogive, my project: AI tools for OpenRocket.${been('og')?' You\'ve launched it up there already.':''} Name the height, and it reworks the design until the rocket gets there.`,
    'I built Kríos too, down in the square. That one belongs to all three of us: it\'s our group project.',
    'That\'s me. Come and find me.'];
  return [back?'Hi again!':'Hi, I\'m Abraham.',
    `The glass sculpture is Kríos, our group project: Michael built it, and all three of us are behind it.${been('kr')?' You\'ve made a call on it up there already.':''}`,
    'Reps rehearse the calls that matter against a buyer who answers back, before a real one ever hears them.',
    'That\'s me. Say hi any time.']; }
const CREW=[
  {name:'Ahroon Santhosh',first:'Ahroon',li:'https://www.linkedin.com/in/ahroon-santhosh/',at:AHR,face:START,pitch:520,
    look:{shirt:'#ecebe5',funnel:.55,zipV:.9,under:'#93b1d8',zip:'#45484e',watch:'#1c1d20',build:.95,pants:'#3d4350',shoes:'#2b2b2e',skin:'#9c6646',
      head:[.148,.176,.16,.17,.03],face:{bw:.016,arch:.006},mouth:'smirk',hair:'curly',hairC:'#1b1411',prop:'drone'}},
  {name:'Michael Sweeney Heffernan',first:'Michael',li:'https://www.linkedin.com/in/michael-sweeney-heffernan-589155354',at:[6.1,11.1],face:[5,8.6],pitch:430,
    look:{shirt:'#262524',short:true,polo:'#1c1b1a',build:1.14,arm:1.2,depth:.74,pants:'#4a4f5a',shoes:'#ece7dc',sole:'#cfc8bb',skin:'#e8b898',
      head:[.16,.172,.164,.1,.024],face:{rh:.016,bw:.011,arch:.011,by:.054},mouth:'grin',cheeks:true,hair:'textured',hairC:'#9a6842',prop:'rocket'}},
  {name:'Abraham Sabu Kurian',first:'Abraham',li:'https://www.linkedin.com/in/abraham-sabu-kurian/',at:[1.3,-2.7],face:[1.3,-8],pitch:470,
    look:{shirt:'#222838',funnel:.32,zipV:.925,zip:'#b6bac2',logo:'#8d93a0',watch:'#202224',pants:'#d6b88c',shoes:'#3b2d25',skin:'#94603f',
      head:[.148,.18,.16,.2,.03],face:{bw:.015,arch:.004,knit:.004},mouth:'smile',mous:true,goatee:true,hair:'wavy',hairC:'#251c17',prop:'headset'}}];
CREW.forEach((c,i)=>c.lines=linesFor(i));
let people=[], me=null;
function buildPeople(){
  people=CREW.map((c,i)=>{ const g=figure(c.look); sc.add(g); const [x,z]=c.at; obs(x,z,.4,1.2); return {...c,i,g,x,z,ob:OBS[OBS.length-1],walk:0,ph:0,dir:at(x,z),f:tang(at(x,z),at(c.face[0],c.face[1]),new T.Vector3()),near:false,greeted:false,wave:0,blink:2+i}; });
  me=figure({shirt:'#ef8a3c',pants:'#3a3f4a',shoes:'#f2efe8',skin:'#c99a74',hair:'short',hairC:'#3a2a1e',pack:'#5b6b7d'}); sc.add(me);
  /* a light over anyone you have not met yet, tall enough to see over the curve of the world */
  const bg=new T.CylinderGeometry(.035,.2,14,14,1,true); bg.translate(0,7,0);
  people.forEach(p=>{ const m=new T.Mesh(bg,new T.ShaderMaterial({uniforms:{uK:{value:0},uCol:{value:new T.Color(p.i===0?'#ffb26a':'#ffe8c6')}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
      vertexShader:`varying float vY; varying vec3 vN,vW; void main(){ vY=position.y/14.; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform float uK; uniform vec3 uCol; varying float vY; varying vec3 vN,vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),V));
        float a=pow(f,1.4)*pow(1.-vY,1.5)*smoothstep(0.,.04,vY)*uK; gl_FragColor=vec4(uCol*a*.6,1.); }`}));
    m.userData.noInk=true; m.frustumCulled=false; m.renderOrder=6; m.visible=false; sc.add(m); p.beam=m; }); }
/* and, when someone you still have to meet is off the screen, their name at its edge with an arrow the way to go; click it to walk there */
const edges=CREW.map((c,i)=>{ const e=document.createElement('span'); e.className='cre ui'; e.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6H10M6.6 2.4 10.2 6 6.6 9.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square"/></svg>'+c.first; $('#crLabels',el).appendChild(e);
  e.addEventListener('click',ev=>{ ev.stopPropagation(); if(S.st===st&&S.mode==='station'&&people[i]) goTalk(people[i]); }); return e; });
const Y_UP=new T.Vector3(0,1,0);

/* ---------- Diarmuid, playing outside the café ----------
   A busker on the pavement in front of the café, by the street lamp: tall and lean, greying hair swept up, glasses and
   stubble, a brown jumper over a green shirt, an electric guitar slung low, a small practice amp beside him with a lantern on it, and his case open in front of him. He plays all day.
   His guitar is made in the browser (BUSK in the core): as you come near it rises and the town's music dips under it,
   and as you walk away it all comes back. At night a string of lights hangs over his spot from the lamp post and his lantern
   is lit, so he is a small warm pool of light in the dark town. Tap him (or press E beside him) and he stops and talks, in
   the same box as the three of us (he used to teach English, and left to play music); then he plays you his song, and
   goes back to his piece. He is not one of the three to meet.
   Everything about how he looks is in DM_LOOK, so it is one place to change. */
const DM_LOOK={shirt:'#8a7161',crew:true,under:'#8aa48f',pants:'#2f3137',shoes:'#9b6234',sole:'#e2d4bc',skin:'#e7bea2',build:.8,arm:.82,depth:.62,
  head:[.14,.184,.152,.16,.02],face:{bw:.012,arch:.006,by:.054},mouth:'smile',hair:'wavy',hairC:'#7d6d5f',glasses:'#25201d',stubble:'#857a70',mous:true,
  tall:{leg:1.22,torso:1.1,arm:1.17,fore:1.12,all:1.03},   // how much longer than the figure's own his legs, body and arms are, then all of him
  guitar:{body:'#b4512e',guard:'#efe6d2',neck:'#d4ad78',board:'#3b2a22',strap:'#3a2f28'}};
/* his hair: brown, a bit long and tousled. A full cap heaped up in uneven clumps, a few pieces flicking out round the
   edge, and a fringe falling over his forehead */
HAIR.tousled=(B,f,c)=>{ const c2=tint(c,-.18), r=seeded(23), edge=a=>1.5-.42*Math.cos(a)+.04*Math.cos(3*a)+.05*Math.sin(5*a+1),
  clump=(t,a)=>.5+.5*Math.sin(a*6+t*5+1.3)*Math.cos(a*4-t*7),
  H=cap(B,f,c,edge,(t,a)=>.012+.032*(1-t*t)+.018*clump(t,a)*sstep(0,.3,t)*(1-.5*t),.22,16,80);
  for(let k=0;k<11;k++){ const a=1.05+k/10*(TAU-2.1)+(r()-.5)*.2, q=H.at(.93,a,-.002), L=v3(Math.sin(a)*(.5+r()*.6),-1,Math.cos(a)*(.5+r()*.6)+.3*(r()-.5));
    H.lump(FG.sph,k%3?c:c2,q.p.addScaledVector(L.clone().normalize(),.018),q.n,L,[.036+r()*.012,.017,.009]); }
  [[-.45,.75,.05],[-.12,.55,.052],[.2,.35,.046],[.5,.2,.038]].forEach(([a,sx,s],k)=>{ const q=H.at(.95,a,.002), L=v3(sx,-1,.25); H.lump(FG.sph,k%2?c2:c,q.p.addScaledVector(L.clone().normalize(),.018),q.n,L,[s,.024,.009]); }); };   // swept to one side
/* where he stands and which way he looks (the town); the lamp post and the pole his lights hang between */
const DM={x:4.42,z:-10.28,face:[.8,-4.6],lamp:[3.8,-11.2],pole:[5.75,-9.75],g:null,st:'play',stT:0,ct:0,sct:0,att:0,attT:5,blink:2.5,d:99,lv:0,hov:false,goal:false,cool:0,
  obs:[],pick:[],ev:null,sev:null,rh:new T.Vector3(),lh:new T.Vector3(),hy:0,nk:0};
const dmM=new T.Matrix4(), dmM2=new T.Matrix4(), dmQ=new T.Quaternion(), dmE=new T.Euler(), dmV=new T.Vector3(), dmW=new T.Vector3(), DOWN=new T.Vector3(0,-1,0);
/* the guitar's frets: where along the neck (from the nut, toward the bridge) the n-th one is */
const NOTE_N=8, NOTE_L=2.4;
/* talking to him: the same box as with the three of us, but he is not one of us (no photo, no page, not counted as met).
   When you have heard him out he plays you a song; asked again later, he just plays */
const DMP={guest:true,i:3,first:'Diarmuid',name:'Diarmuid',pitch:380,x:DM.x,z:DM.z,dir:new T.Vector3(),greeted:false,wave:0,resume:0,lines:null,
  L0:['Hey, I\'m Diarmuid. I used to be an English teacher.','I decided to chase my dream and play music.','This one\'s mine. Turn it up.'],
  L1:['Back for another? Go on then.'],
  onClose(done){ DM.att=1; DM.stT=0; if(done&&DM.g&&!FIN.on&&!CUT.on){ DM.st='nod'; DM.met=true; } else DM.st='play'; }};
const NUT=.452, SCALE=.567, fretX=n=>NUT-SCALE*(1-Math.pow(2,-n/12));
function buildBusker(){ const L=DM_LOOK, K=L.tall, gc=L.guitar, yaw=yawTo(DM.x,DM.z,DM.face[0],DM.face[1]);
  const spot=new T.Group(); spot.matrixAutoUpdate=false; spot.matrix.copy(frameAt(DM.x,DM.z,yaw,standH(DM.x,DM.z))); sc.add(spot); DM.spot=spot; DM.dir=at(DM.x,DM.z); DMP.dir.copy(DM.dir);
  /* lanky: the figure's own build, then longer legs, a longer body and longer, thinner arms; his head as it is */
  const g=figure(L), d=g.userData, b=d.body, mat=toonMat('#ffffff',{fig:true,vc:true,fresh:true}); DM.mat=mat;
  const torso=b.children.find(o=>o.isMesh); torso.scale.y=K.torso; torso.position.y=.5*(1-K.torso);
  d.legs.forEach((l,i)=>{ l.scale.set(.86,K.leg,.86); l.rotation.z=i?.05:-.05; });
  DM.sh=.5+.4*K.torso; d.arms.forEach(a=>{ a.position.y=DM.sh; a.children[0].scale.set(.9,K.arm,.9); });
  d.fore.forEach(f=>{ f.position.y=-.18*K.arm; f.rotation.set(0,0,0); f.children[0].scale.set(.9,K.fore,.9); });
  d.head.position.y=.5+.665*K.torso; DM.hy=d.head.position.y; DM.lift=.5*(K.leg-1); DM.ua=.18*K.arm; DM.fa=.19*K.fore;
  g.scale.setScalar(K.all); spot.add(g); DM.g=g; DM.fig=d;
  /* the guitar, in his body's frame: slung low across his hips, its face to the street and a little up, the neck rising to his left */
  const GM=new T.Matrix4().compose(v3(-.035,.6,.128),dmQ.setFromEuler(dmE.set(-.16,-.22,.36,'YXZ')),v3(1,1,1)); DM.GM=GM;
  const Gp=part(), shp=pts=>{ const s=new T.Shape(); s.moveTo(pts[0][0],pts[0][1]); s.splineThru(pts.slice(1).map(([x,y])=>new T.Vector2(x,y))); return s; };
  const gput=(geo,col,x,y,z,sx,sy,sz,rx=0,rz=0)=>Gp.geo(geo,col,dmM.multiplyMatrices(GM,dmM2.compose(dmV.set(x,y,z),dmQ.setFromEuler(dmE.set(rx,0,rz)),dmW.set(sx,sy,sz))));
  const BODY=[[-.215,0],[-.2,-.078],[-.15,-.12],[-.08,-.128],[-.03,-.11],[0,-.097],[.04,-.1],[.085,-.112],[.116,-.098],[.108,-.072],[.09,-.05],[.1,-.024],[.1,.024],[.096,.05],[.12,.082],[.152,.108],[.14,.126],[.1,.124],[.06,.11],[.02,.1],[-.03,.118],[-.08,.13],[-.15,.122],[-.2,.08],[-.215,0]];
  Gp.geo(new T.ExtrudeGeometry(shp(BODY),{depth:.03,bevelEnabled:true,bevelThickness:.007,bevelSize:.007,bevelSegments:2,curveSegments:48}).translate(0,0,-.015).toNonIndexed(),gc.body,GM);
  Gp.geo(new T.ShapeGeometry(shp([[-.15,-.03],[-.12,-.07],[-.04,-.09],[.05,-.078],[.088,-.042],[.092,.03],[.07,.068],[0,.068],[-.06,.045],[-.12,.02],[-.15,-.03]]),24).translate(0,0,.0235).toNonIndexed(),gc.guard,GM);   // the scratchplate
  [-.072,-.022,.026].forEach((x,i)=>gput(FG.box,'#2a2826',x,0,.027,.016,.07,.007,0,i?0:.14));   // three pickups
  gput(FG.box,'#b9bcbe',-.115,0,.027,.024,.075,.007); [[-.1,-.07],[-.066,-.086]].forEach(([x,y])=>gput(FG.can,gc.guard,x,y,.03,.011,.012,.011,Math.PI/2));   // the bridge, two knobs
  gput(FG.can,'#4a4846',-.12,-.124,0,.009,.016,.009);   // the jack, where his lead goes in
  gput(FG.box,gc.neck,.2675,0,.014,.365,.042,.02); gput(FG.box,gc.board,.2675,0,.0275,.365,.04,.006); gput(FG.box,gc.guard,NUT,0,.0295,.006,.04,.008);   // the neck, its fingerboard and nut
  [3,5,7,9].forEach(n=>gput(FG.sph,gc.guard,(fretX(n)+fretX(n-1))/2,0,.031,.005,.005,.002)); [-.011,.011].forEach(y=>gput(FG.sph,gc.guard,(fretX(12)+fretX(11))/2,y,.031,.005,.005,.002));
  gput(FG.box,gc.neck,.53,.012,.011,.16,.064,.014); for(let k=0;k<6;k++) gput(FG.can,'#c9ccce',.47+k*.021,.05,.019,.006,.014,.006);   // the headstock and its tuners
  [[.15,.112],[-.219,0]].forEach(([x,y])=>gput(FG.sph,'#c9ccce',x,y,0,.008,.008,.008));
  /* the strap: from the horn over his left shoulder, across his back to the tail of the guitar */
  const ky=y=>.5+(y-.5)*K.torso, sb1=v3(.15,.112,-.012).applyMatrix4(GM), sb2=v3(-.219,0,-.01).applyMatrix4(GM);
  Gp.geo(new T.TubeGeometry(new T.CatmullRomCurve3([sb1,v3(.125,ky(.86),.108),v3(.128,ky(.985),.012),v3(.105,ky(.88),-.1),v3(.01,ky(.74),-.098),v3(-.105,ky(.6),-.094),v3(-.124,ky(.54),-.02),sb2]),56,.011,5,false).toNonIndexed(),gc.strap,new T.Matrix4());
  const gm=Gp.mesh(); b.add(gm);
  /* what is round him, in his spot's frame: the amp with a lantern on it, his case open in front, the lead between */
  const Pp=part(), AM=new T.Matrix4().compose(v3(-.5,0,-.02),dmQ.setFromAxisAngle(UPY,.4),v3(1,1,1)), CM=new T.Matrix4().compose(v3(.36,0,.6),dmQ.setFromAxisAngle(UPY,-.5),v3(1,1,1));
  const pput=(M,geo,col,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>Pp.geo(geo,col,dmM.multiplyMatrices(M,dmM2.compose(dmV.set(x,y,z),dmQ.setFromEuler(dmE.set(rx,ry,rz,'YXZ')),dmW.set(sx,sy,sz))));
  pput(AM,FG.box,'#2f2b29',0,.15,0,.32,.3,.18); pput(AM,FG.box,'#a99d86',0,.12,.091,.27,.19,.004); pput(AM,FG.box,'#d9d0bc',0,.265,.091,.27,.04,.006);   // the cabinet, its grille and panel
  [-.09,-.05,-.01,.03,.1].forEach(x=>pput(AM,FG.can,'#1e1c1b',x,.265,.097,.009,.012,.009,Math.PI/2)); pput(AM,FG.sph,'#c2412f',.065,.265,.096,.007,.007,.004);   // its knobs, the input and the light
  pput(AM,FG.box,'#e9e2cf',0,.13,.094,.06,.016,.003); pput(AM,FG.box,'#1e1c1b',0,.31,0,.11,.02,.03);
  /* the lantern on the amp: its base, frame and cap here; the glass is its own, to light up at night */
  pput(AM,FG.can,'#2b2b2b',.07,.306,-.02,.032,.012,.032); for(let k=0;k<4;k++){ const a=k*Math.PI/2+.785; pput(AM,FG.box,'#2b2b2b',.07+Math.cos(a)*.026,.346,-.02+Math.sin(a)*.026,.006,.07,.006); }
  pput(AM,FG.cone,'#2b2b2b',.07,.395,-.02,.036,.03,.036); pput(AM,FG.sph,'#2b2b2b',.07,.415,-.02,.01,.01,.01);
  DM.glass=new T.Mesh(new T.CylinderGeometry(.022,.022,.062,10),flatMat('#e6dcc4')); DM.glass.position.copy(v3(.07,.346,-.02).applyMatrix4(AM)); spot.add(DM.glass);
  /* his case, open on the pavement: the shell, its lining, the lid stood up on his side, a few coins */
  const CASE=[[-.29,0],[-.27,-.12],[-.18,-.155],[-.06,-.15],[.03,-.11],[.1,-.07],[.42,-.06],[.47,-.035],[.47,.035],[.42,.06],[.1,.07],[.03,.11],[-.06,.15],[-.18,.155],[-.27,.12],[-.29,0]];
  const inner=s=>s.map(([x,y])=>[(x-.09)*.88+.09,y*.82]), slab=(pts,dp,bv)=>new T.ExtrudeGeometry(shp(pts),{depth:dp,bevelEnabled:!!bv,bevelThickness:bv,bevelSize:bv,bevelSegments:1,curveSegments:20}).rotateX(-Math.PI/2).toNonIndexed();
  Pp.geo(slab(CASE,.07,.008).translate(0,.008,0),'#3a2e27',CM); Pp.geo(slab(inner(CASE),.002,0).translate(0,.086,0),'#7a3a3f',CM);
  const LID=new T.Matrix4().multiplyMatrices(CM,new T.Matrix4().makeTranslation(0,.088,-.155)).multiply(new T.Matrix4().makeRotationX(-1.83)).multiply(new T.Matrix4().makeTranslation(0,0,.155));
  Pp.geo(slab(CASE,.035,.006),'#3a2e27',LID); Pp.geo(slab(inner(CASE),.002,0).translate(0,-.007,0),'#7a3a3f',LID);
  const cr=seeded(5); for(let k=0;k<6;k++) pput(CM,FG.can,k%2?'#c9cdd0':'#d8b45a',-.2+cr()*.2,.091,(cr()-.5)*.16,.017,.004,.017,cr()*.3,0,cr()*.3);
  /* the lead: out of the guitar, down to the pavement by his foot, along it and up into the amp */
  const jk=v3(-.12,-.13,0).applyMatrix4(GM).add(v3(0,DM.lift,0)).multiplyScalar(K.all), ai=v3(.1,.265,.1).applyMatrix4(AM);
  Pp.geo(new T.TubeGeometry(new T.CatmullRomCurve3([jk,jk.clone().add(v3(-.02,-.12,.03)),v3(-.16,.012,.12),v3(-.3,.012,.16),v3(-.36,.03,.14),ai.clone().add(v3(.0,.02,.03)),ai]),40,.0065,4,false).toNonIndexed(),'#1f1d1c',new T.Matrix4());
  const pm=Pp.mesh(); spot.add(pm);
  /* soft shadows under the amp and the case */
  [[AM,.42,.3],[CM,.62,.42]].forEach(([M,sx,sz])=>{ const s=new T.Mesh(SHG,SHM); s.matrixAutoUpdate=false; s.matrix.copy(M).multiply(dmM2.compose(dmV.set(0,.02,0),dmQ.identity(),dmW.set(sx,1,sz))); s.renderOrder=1; s.layers.set(1); spot.add(s); });
  g.traverse(o=>{ if(o.isMesh&&o.material===FIGM) o.material=mat; }); pm.material=mat; DM.pick=[g,pm];
  /* he, his amp and his case are solid; so is the walking grid round them, which was laid out before he arrived */
  obsAt(spot.matrix,0,0,.34,1.8); obsAt(spot.matrix,-.5,-.02,.22,.6); obsAt(spot.matrix,.36,.6,.3,.4); DM.obs=OBS.slice(-3);
  /* the lights: a wire from a band round the lamp post to a slim pole of their own, sagging over his spot, bulbs along it */
  kitTo(); const LP=frameAt(DM.lamp[0],DM.lamp[1],0), PM=frameAt(DM.pole[0],DM.pole[1],0), a0=v3(0,2.32,0).applyMatrix4(LP), a1=v3(0,2.3,0).applyMatrix4(PM);
  cyl(LP,'#3c4746',0,2.29,0,.064,.05,'cyl8'); cyl(PM,'#3c4746',0,0,0,.075,.04,'cyl8'); cyl(PM,'#3c4746',0,.04,0,.024,2.28,'cyl8'); put(PM,'sph','#3c4746',0,2.33,0,.034,.034,.034); obs(DM.pole[0],DM.pole[1],.1,2.3); DM.obs.push(OBS[OBS.length-1]);
  const wp=[]; for(let k=0;k<=12;k++){ const t=k/12, p=a0.clone().lerp(a1,t); p.addScaledVector(dmV.copy(p).normalize(),-.36*4*t*(1-t)); wp.push(p); }
  const wire=new T.CatmullRomCurve3(wp); kadd(new T.TubeGeometry(wire,28,.008,4,false).toNonIndexed(),'#2e2c2b',new T.Matrix4());
  const NB=12, bulbs=new T.InstancedMesh(new T.SphereGeometry(.03,8,6).scale(1,1.3,1),flatMat('#ece3cc'),NB), hp=[], hs=[];
  for(let k=0;k<NB;k++){ const p=wire.getPoint((k+.5)/NB), u=dmV.copy(p).normalize(), [bx,bz]=loc(u), M=frameAt(bx,bz,0,p.length()-R);
    cyl(M,'#2e2c2b',0,-.03,0,.014,.03,'cyl8'); const c=v3(0,-.075,0).applyMatrix4(M); bulbs.setMatrixAt(k,dmM.compose(c,dmQ.setFromUnitVectors(UPY,u),dmW.set(1,1,1))); hp.push(c.x,c.y,c.z); hs.push(.34); }
  bulbs.frustumCulled=false; sc.add(bulbs); DM.bulbs=bulbs;
  /* at night: a soft glow round each bulb and the lantern, and a warm pool on the pavement under them */
  spot.updateMatrixWorld(true); const gw=DM.glass.getWorldPosition(new T.Vector3()); hp.push(gw.x,gw.y,gw.z); hs.push(.5);
  const hg=new T.BufferGeometry(); hg.setAttribute('position',new T.Float32BufferAttribute(hp,3)); hg.setAttribute('aS',new T.Float32BufferAttribute(hs,1));
  const halo=new T.Points(hg,new T.ShaderMaterial({uniforms:{uK:{value:0},uH:{value:800}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute float aS; uniform float uH; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS*projectionMatrix[1][1]*uH*.5/max(-mv.z,.1); }`,
    fragmentShader:`uniform float uK; void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q), a=exp(-r*5.)*(1.-smoothstep(.6,1.,r)); gl_FragColor=vec4(vec3(1.,.72,.38)*a*uK,1.); }`}));
  halo.layers.set(1); halo.frustumCulled=false; halo.renderOrder=7; sc.add(halo); DM.halo=halo;
  { const cx=(DM.x+(DM.lamp[0]+DM.pole[0])/2)/2, cz=(DM.z+(DM.lamp[1]+DM.pole[1])/2)/2, GR=2.3, NR=8, NS=32, P=[], Kk=[], I=[];
    for(let i=0;i<=NR;i++) for(let j=0;j<NS;j++){ const r=GR*i/NR, a=TAU*j/NS, x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r; at(x,z,dmV).multiplyScalar(R+standH(x,z)+.025); P.push(dmV.x,dmV.y,dmV.z); Kk.push(1-i/NR); }
    for(let i=0;i<NR;i++) for(let j=0;j<NS;j++){ const a=i*NS+j, b2=i*NS+(j+1)%NS, c=a+NS, e=b2+NS; I.push(a,c,b2, b2,c,e); }
    const pg=new T.BufferGeometry(); pg.setAttribute('position',new T.Float32BufferAttribute(P,3)); pg.setAttribute('aK',new T.Float32BufferAttribute(Kk,1)); pg.setIndex(I);
    const pool=new T.Mesh(pg,new T.ShaderMaterial({uniforms:{uK:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
      vertexShader:`attribute float aK; varying float vK; void main(){ vK=aK; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader:`uniform float uK; varying float vK; void main(){ gl_FragColor=vec4(vec3(1.,.66,.34)*vK*vK*(3.-2.*vK)*uK*.3,1.); }`}));
    pool.layers.set(1); pool.renderOrder=2; pool.frustumCulled=false; sc.add(pool); DM.pool=pool; }
  /* when he plays for you: notes rise from his amp, drift and fade, drawn like everything else, in ink on paper */
  { const N=NOTE_N, ng=new T.BufferGeometry(); ng.setAttribute('position',new T.BufferAttribute(new Float32Array(N*3),3)); ng.setAttribute('aA',new T.BufferAttribute(new Float32Array(N*3),3));
    const nm=new T.ShaderMaterial({uniforms:{uH:{value:800},uDim:{value:1}},transparent:true,depthWrite:false,
      vertexShader:`attribute vec3 aA; uniform float uH; varying vec3 vA; varying float vPx; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=aA.z*projectionMatrix[1][1]*uH*.5/max(-mv.z,.1); vPx=max(gl_PointSize,1.); if(aA.x<.003) gl_Position=vec4(2.,2.,2.,1.); }`,
      fragmentShader:`uniform float uDim; varying vec3 vA; varying float vPx;
        float seg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
        void main(){ vec2 q=vec2(gl_PointCoord.x*2.-1.,1.-gl_PointCoord.y*2.); float c=cos(vA.y), s=sin(vA.y); q=mat2(c,s,-s,c)*q*1.12;
          vec2 h=q-vec2(-.2,-.5); float hc=cos(.42), hs=sin(.42); h=mat2(hc,-hs,hs,hc)*h; float dh=(length(h/vec2(.3,.21))-1.)*.21;
          float ds=seg(q,vec2(.07,-.48),vec2(.07,.72))-.055;
          float df=seg(q,vec2(.07,.7),vec2(.38,.38))-.07; df=min(df,seg(q,vec2(.38,.38),vec2(.36,.12))-.06);
          float d=min(dh,min(ds,df)), aa=2.4/vPx, o=.1;
          float a=1.-smoothstep(o-aa,o+aa,d); if(a*vA.x<.004) discard;
          vec3 col=mix(vec3(.17,.14,.11),vec3(.985,.965,.925)*uDim,smoothstep(-aa,aa,d));
          gl_FragColor=vec4(col,a*vA.x); }`});
    const notes=new T.Points(ng,nm); notes.layers.set(1); notes.renderOrder=8; notes.frustumCulled=false; notes.visible=false; sc.add(notes); DM.notes=notes;
    DM.nt=Array.from({length:N},()=>({t:9,x:0,y:0,s:0,r:0})); DM.nk2=0;
    const o=gw.clone(), u=o.clone().normalize(), t1=new T.Vector3().crossVectors(u,Math.abs(u.y)<.9?UPY:new T.Vector3(1,0,0)).normalize();
    DM.nO=o.addScaledVector(u,.12); DM.nU=u; DM.nS=t1; DM.nF=new T.Vector3().crossVectors(u,t1); }
  if(NAV.free) for(const o of DM.obs){ const m=o.r+.3, N=NAV.N; for(let j=Math.floor((o.z-m-NAV.O)/NAV.S);j<=Math.ceil((o.z+m-NAV.O)/NAV.S);j++) for(let i=Math.floor((o.x-m-NAV.O)/NAV.S);i<=Math.ceil((o.x+m-NAV.O)/NAV.S);i++){
    if(i<0||j<0||i>=N||j>=N) continue; const x=NAV.O+i*NAV.S, z=NAV.O+j*NAV.S; if((x-o.x)**2+(z-o.z)**2<m*m) NAV.free[j*N+i]=0; } }
  /* the houses near him, to know when you are inside one (where you do not hear him) */
  DM.houses=HOUSES.filter(H=>{ const p=dmV.setFromMatrixPosition(H.M), [hx,hz]=loc(p.normalize()); return Math.hypot(hx-DM.x,hz-DM.z)<16; }).map(H=>({inv:H.M.clone().invert(),w:H.w,d:H.d}));
  /* what he plays, as moments his hands move: each chord or note (strums grouped), with where the fretting hand goes */
  const sc0=A.buskAt?A.buskAt().score:null; if(sc0){ DM.score=sc0; DM.ev=busEvents(sc0.notes,sc0,false); DM.sev=busEvents(sc0.solo.notes,sc0,true); }
  /* his name tag, the same as ours; tapping it asks him to play */
  const lb=document.createElement('span'); lb.className='crl ui'; lb.textContent='Diarmuid'; $('#crLabels',el).appendChild(lb); DM.lb=lb;
  lb.addEventListener('click',e=>{ e.stopPropagation(); if(S.st===st&&S.mode==='station') buskAsk(); });
  /* on a computer, pointing at him shows his name; E beside him (with none of us closer) asks him to play */
  addEventListener('pointermove',e=>{ if(S.st!==st||S.mode!=='station'||e.pointerType!=='mouse'||down) return; const on=!hov&&!CAFE.on&&!!pickBusk(e);
    if(on!==DM.hov){ DM.hov=on; const ce=$('#cur'), ct=$('#curT'); if(ce&&ct){ if(on){ ct.textContent='Say hello'; ce.classList.add('big'); } else if(!hov) ce.classList.remove('big'); } } },{passive:true});
  addEventListener('keydown',e=>{ if(S.st!==st||S.mode!=='station'||FIN.on||CUT.on||CAFE.on||TALK.p||GLN.t>=0||PHS.on||!(e.code==='KeyE'||e.code==='Enter')) return;
    if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button')) return;
    if(DM.d<3.4&&!people.some(q=>Math.hypot(player.x-q.x,player.z-q.z)<3.4)){ buskAsk(); e.preventDefault(); } },true);
  st._dbg.busk={DM,ask:buskAsk,pick:pickBusk,level:buskLevel,update:buskUpdate,get state(){ return {st:DM.st,d:+DM.d.toFixed(2),lv:+DM.lv.toFixed(3),goal:DM.goal,att:+DM.att.toFixed(2),ct:+DM.ct.toFixed(2),sct:+DM.sct.toFixed(2)}; },spot:[DM.x,DM.z]}; }
/* the score as moments: strums (three strings or more at once) and single notes, each with the strings in the order struck,
   and the fret the left hand is at: the chord's shape for his piece, the note itself for the solo */
function busEvents(N,S0,solo){ const n=N.slice().sort((a,b)=>a.t-b.t), out=[];
  for(let i=0;i<n.length;){ const g=[n[i]]; while(i+g.length<n.length&&n[i+g.length].t-n[i].t<.045) g.push(n[i+g.length]); i+=g.length;
    const ss=g.map(q=>q.s), strum=g.length>=3, top=g.reduce((a,q)=>q.s>a.s?q:a,g[0]);
    let fr; if(solo) fr=strum?Math.max(1,g.reduce((a,q)=>Math.min(a,q.m-S0.open[q.s]),99))+.3:Math.max(1,top.m-S0.open[top.s])-.4; else { const bar=Math.floor((g[0].t+.05)/S0.bar)%4; fr=[7,5,3,2][bar]+1.2; }
    out.push({t:g[0].t,ss,strum,dir:strum?(ss[0]<ss[ss.length-1]?1:-1):0,mute:g.every(q=>q.d<.05),fr}); }
  return out; }
/* what you tapped: him (or his amp or case) under the pointer, or close enough to him on the screen */
function pickBusk(e){ if(!DM.g||!DM.spot.visible) return null; ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); ray.layers.set(0); hits.length=0;
  ray.intersectObjects(DM.pick,true,hits); if(hits.length) return {direct:true,dist:hits[0].distance};
  const h0=R+standH(DM.x,DM.z), f=V.copy(DM.dir).multiplyScalar(h0).project(stCam); if(f.z>1) return null;
  const fx=(f.x*.5+.5)*innerWidth, fy=(-f.y*.5+.5)*innerHeight, hd=V.copy(DM.dir).multiplyScalar(h0+1.65).project(stCam), hx=(hd.x*.5+.5)*innerWidth, hy=(-hd.y*.5+.5)*innerHeight;
  const ex=hx-fx, ey=hy-fy, L2=ex*ex+ey*ey||1, tt=clamp(((e.clientX-fx)*ex+(e.clientY-fy)*ey)/L2,0,1), dd=Math.hypot(e.clientX-fx-ex*tt,e.clientY-fy-ey*tt);
  return dd<Math.max(26,Math.sqrt(L2)*.34)?{direct:false,dist:1e9}:null; }
/* a click or tap: his, unless one of us is the one you meant (a squarely hit person in front of him, or one of us near the
   pointer when he is not squarely under it) */
function buskTap(e,p){ if(!DM.g||FIN.on||CUT.on||CAFE.on||TALK.p||GLN.t>=0||PHS.on) return false; const k=pickBusk(e); if(!k) return false;
  if(p){ if(!k.direct) return false; hits.length=0; ray.intersectObject(p.g,true,hits); if(hits.length&&hits[0].distance<k.dist) return false; }
  buskAsk(); return true; }
/* his tag: lit while he is the one you are walking over to (and at once, on the tap itself) */
function buskSay(quiet){ const L=DM.lb; if(!L) return false; const go=DM.goal; L.classList.toggle('ask',go&&!quiet); return go; }
/* asking him to play: beside him he looks up and plays; from further off you walk over first */
function buskAsk(){ if(!DM.g||FIN.on||CUT.on||CAFE.on||TALK.p||GLN.t>=0||PHS.on) return; const P=player; began();
  if(DM.d<3.2){ DM.goal=false; buskSay(false); if(DM.st!=='play'||DM.cool>0){ DM.att=Math.max(DM.att,.6); return; }
    DM.st='talk'; DM.stT=0; DMP.lines=DM.met?DMP.L1:DMP.L0; openTalk(DMP,0); return; }
  TALK.goal=null; const path=navPath(P.x,P.z,DM.x,DM.z,2.2); if(path){ P.path=path; P.tgt=null; } else { P.path=null; P.tgt=at(DM.x,DM.z).multiplyScalar(R); } DM.goal=true; P.stuck=0; A.tick(); buskSay(false); }
const BEAT=60/72;
/* how much of him you hear at (x, z): all of him within a couple of metres, none by ten, and next to nothing from inside a house */
function buskLevel(x,z){ const d=Math.hypot(x-DM.x,z-DM.z); if(d>=10) return 0; let k=Math.pow(sstep(10,2.3,d),1.6);
  for(const H of DM.houses){ at(x,z,dmV).multiplyScalar(R).applyMatrix4(H.inv); if(Math.abs(dmV.x)<H.w/2&&Math.abs(dmV.z)<H.d/2){ k*=.035; break; } } return k; }
function buskUpdate(dt,t){ if(!DM.g) return; const P=player, d=Math.hypot(P.x-DM.x,P.z-DM.z); DM.d=d;
  /* the sound: nothing during the landing or the last flight; from inside the café (you stand at its door while the view goes
     in) he is heard only faintly through the wall */
  const busy=CUT.on||FIN.on, lv=busy?0:buskLevel(P.x,P.z)*(CAFE.on?1-.965*CDIN.value:1); DM.lv=lv;
  if(busy&&DM.st!=='play'){ DM.st='play'; DM.goal=false; }
  DM.cool=Math.max(0,DM.cool-dt); DM.stT+=dt;
  /* asked from across town: when you get there, he plays */
  if(DM.goal){ if(TALK.goal||TALK.p||busy) DM.goal=false; else if(d<2.8||(!P.path&&!P.tgt&&d<3.4)){ DM.goal=false; P.path=null; P.tgt=null; buskAsk(); } else if(!P.path&&!P.tgt) DM.goal=false; }
  if(DM.st==='talk'&&TALK.p!==DMP){ DM.st='play'; DM.stT=0; }   // (the conversation went some other way than closing)
  if(DM.st==='nod'&&DM.stT>.95){ DM.st='solo'; DM.stT=0; DM.sct=0; }
  if(DM.st==='solo'&&DM.sct>((DM.score&&DM.score.solo.P)||18)-2){ DM.st='play'; DM.stT=0; DM.cool=1.2; }
  /* talking, he stops playing and the town's music comes back a little under the conversation */
  A.busk&&A.busk(DM.st==='play'?lv:0,DM.st==='solo'?Math.max(1e-4,Math.min(1,lv*1.15)):0,DM.st==='talk'?lv*.3:lv);   // (the solo kept just above nothing while you are away, so it carries on rather than starting again)
  /* his clock: the recording's own time where it is playing, his own where it is not, so his hands keep time with what you hear */
  const S0=DM.score, aw=A.buskAt?A.buskAt():null;
  if(S0&&DM.st!=='talk'){ const Pd=S0.P; DM.ct=(DM.ct+dt)%Pd; if(aw&&aw.loop>=0){ let e=aw.loop-DM.ct; if(e>Pd/2) e-=Pd; if(e<-Pd/2) e+=Pd; DM.ct=(DM.ct+(Math.abs(e)>.35?e:e*Math.min(1,dt*3))+Pd)%Pd; }
    if(DM.st==='solo'){ DM.sct+=dt; if(aw&&aw.solo>=0){ const e=aw.solo-DM.sct; if(e>-.35) DM.sct+=e>.35?e:e*Math.min(1,dt*3); } } }   // (the solo's clock only ever goes forward)
  /* round the curve of the world (past about 26 m, below the horizon from where you stand) he and his lights are not drawn at all */
  const vis=d<26; if(DM.spot.visible!==vis){ DM.spot.visible=DM.bulbs.visible=vis; DM.nk=-1; }
  /* the lights: up as it gets dark */
  const nk=sstep(.12,.6,SKY.night); if(Math.abs(nk-DM.nk)>.002||t<1){ DM.nk=nk;
    DM.bulbs.material.uniforms.uC.value.setRGB(lerp(.93,1.35,nk),lerp(.89,1.05,nk),lerp(.8,.62,nk)); DM.glass.material.uniforms.uC.value.setRGB(lerp(.9,1.4,nk),lerp(.86,1.05,nk),lerp(.77,.55,nk));
    DM.mat.uniforms.uC.value.setRGB(1+.42*nk,1+.22*nk,1+.02*nk); DM.pool.material.uniforms.uK.value=nk; DM.pool.visible=DM.halo.visible=vis&&nk>.01; }
  if(DM.halo.visible){ DM.halo.material.uniforms.uK.value=nk*(.92+.08*Math.sin(t*2.3)); DM.halo.material.uniforms.uH.value=colRT.height||innerHeight; }
  /* his name tag: when you point at him, or are near */
  const lb=DM.lb, hw=dmW.copy(DM.dir).multiplyScalar(R+standH(DM.x,DM.z)+1.82).project(stCam), quiet=TALK.p||CUT.on||FIN.on||CAFE.on||GLN.t>=0||PHS.on;
  /* asked, he is the one you are going to; nodding he says so; and while he plays for you his tag stays lit */
  const forYou=buskSay(quiet);
  lb.classList.toggle('on',(DM.hov||d<5.5||forYou)&&hw.z<1&&!quiet); lb.classList.toggle('can',d<3.4&&!quiet&&DM.st==='play'&&DM.cool<=0);
  buskNotes(dt,vis&&!quiet&&(DM.st==='solo'||(DM.st==='nod'&&DM.stT>.5)),nk);
  lb.style.transform=`translate(${((hw.x*.5+.5)*innerWidth).toFixed(1)}px,${((-hw.y*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
  if(!vis) return;
  buskPose(dt,t,P); }
/* the notes over his amp: a new one every half second or so while he plays for you, each rising a metre, swaying, and
   fading over a couple of seconds; the last ones finish their rise after he stops */
function buskNotes(dt,on,nk){ const N=DM.notes; if(!N) return; let live=false;
  DM.nk2-=dt; if(on&&DM.nk2<=0){ const n=DM.nt.find(q=>q.t>=NOTE_L); if(n){ n.t=0; n.x=(Math.random()-.5)*.5; n.y=(Math.random()-.5)*.3; n.s=.17+Math.random()*.07; n.r=(Math.random()-.5)*.5; } DM.nk2=.42+Math.random()*.3; }
  const P=N.geometry.attributes.position, Aa=N.geometry.attributes.aA;
  DM.nt.forEach((n,i)=>{ if(n.t<NOTE_L){ n.t+=dt; live=true; } const k=Math.min(1,n.t/NOTE_L), a=n.t>=NOTE_L?0:sstep(0,.25,n.t)*(1-sstep(NOTE_L-.9,NOTE_L,n.t));
    dmV.copy(DM.nO).addScaledVector(DM.nU,k*1.05).addScaledVector(DM.nS,n.x+Math.sin(n.t*2.4+i)*.1*k).addScaledVector(DM.nF,n.y);
    P.setXYZ(i,dmV.x,dmV.y,dmV.z); Aa.setXYZ(i,a,n.r+Math.sin(n.t*1.9+i*2.1)*.22,n.s*(.75+.25*sstep(0,.5,n.t))); });
  N.visible=live; if(live){ P.needsUpdate=true; Aa.needsUpdate=true; N.material.uniforms.uH.value=colRT.height||innerHeight; N.material.uniforms.uDim.value=1-.3*nk; } }
/* an arm reaching a point (in his body's frame): the elbow out toward pole, the upper arm and forearm laid along the two halves */
const rU=new T.Vector3(), rN=new T.Vector3(), rE=new T.Vector3(), rF=new T.Vector3(), rQ=new T.Quaternion();
function reach(arm,fore,H,pole){ const S=arm.position, a=DM.ua, b=DM.fa; rU.subVectors(H,S); const D0=rU.length()||1, D=clamp(D0,Math.abs(a-b)+.002,a+b-.002); rU.divideScalar(D0);
  const ca=clamp((a*a+D*D-b*b)/(2*a*D),-1,1); rN.copy(pole).addScaledVector(rU,-pole.dot(rU)).normalize(); rE.copy(rN).multiplyScalar(a*Math.sqrt(1-ca*ca)).addScaledVector(rU,a*ca);   // the elbow, from the shoulder
  arm.quaternion.setFromUnitVectors(DOWN,rF.copy(rE).divideScalar(a)); rF.copy(rU).multiplyScalar(D).sub(rE).normalize().applyQuaternion(rQ.copy(arm.quaternion).invert());
  fore.quaternion.setFromUnitVectors(DOWN,rF); }
const RPOLE=new T.Vector3(-.7,-.35,-.6).normalize(), LPOLE=new T.Vector3(.55,-.85,-.2).normalize(), dmH=new T.Vector3(), dmL=new T.Vector3();
/* the last moment of the score at or before c, by halving */
function evAt(E,c){ let lo=0, hi=E.length-1; if(!E.length||c<E[0].t) return -1; while(lo<hi){ const m=(lo+hi+1)>>1; if(E[m].t<=c) lo=m; else hi=m-1; } return lo; }
function buskPose(dt,t,P){ const d=DM.fig, solo=DM.st==='solo', E=solo?DM.sev:DM.ev, c=solo?DM.sct:DM.ct, S0=DM.score;
  /* the beat he nods and taps to */
  const bt=solo?(DM.sct-S0.solo.t1)/(S0.solo.beat||BEAT):DM.ct/BEAT, ph=((bt%1)+1)%1, nod=Math.exp(-ph*5)*(Math.floor(bt)%4===0?1.4:1), tap=.5-.5*Math.cos(TAU*ph);
  /* the right hand: through the strings on each strum or note, back to where the next one starts in between */
  const ys=s=>(2.5-s)*.0068; let ry=0, rz=.04, rx=-.045, fr=E&&E.length?E[0].fr:8;
  if(E&&E.length){ const i=evAt(E,c), e0=i>=0?E[i]:E[E.length-1], e1=E[i+1]||null, k=i>=0?c-e0.t:9;
    const from=q=>q.strum?(q.dir>0?ys(0)+.024:ys(5)-.02):ys(q.ss[q.ss.length-1])+.008, to=q=>q.strum?(q.dir>0?ys(5)-.026:ys(0)+.022):ys(q.ss[q.ss.length-1])-.01;
    const sw=e0.strum?.06:.035, u=sstep(0,sw,k), y1=to(e0);
    if(k<sw||!e1) ry=lerp(from(e0),y1,u); else { const gap=e1.t-e0.t-sw, w=sstep(0,1,(k-sw)/Math.max(.05,gap)); ry=lerp(y1,from(e1),w); rz=.04+.018*Math.sin(Math.PI*w); }
    if(k<sw) rz=.026+.01*u; if(e0.strum) rx=-.025;
    fr=e0.fr; if(e1&&e1.fr!==e0.fr) fr=lerp(e0.fr,e1.fr,sstep(e1.t-.14,e1.t-.02,c)); }
  if(DM.st==='nod') ry=lerp(ry,.03,sstep(.2,.5,DM.stT)), rz=.07;
  if(DM.st==='talk') ry=.03, rz=.07;   // talking: his picking hand off the strings
  dmH.set(rx,ry,rz).applyMatrix4(DM.GM); DM.rh.lerp(dmH,1-Math.exp(-28*dt)); reach(d.arms[0],d.fore[0],DM.rh,RPOLE);
  /* the left hand: on the neck at the fret, behind and under it */
  DM.fr=damp(DM.fr??fr,fr,16,dt); dmL.set(fretX(DM.fr)-.012,-.03,-.004+.004*Math.sin(t*7.3)).applyMatrix4(DM.GM); DM.lh.lerp(dmL,1-Math.exp(-22*dt)); reach(d.arms[1],d.fore[1],DM.lh,LPOLE);
  /* the rest of him: a sway every two bars, the nod and the foot on the beat */
  const sway=Math.sin(Math.PI*bt/4), en=solo?1.7:DM.st==='talk'?.3:1;
  d.body.position.y=DM.lift-.006*(1-tap)*en; d.body.rotation.set(.03+.012*nod*en,.05*Math.sin(Math.PI*bt/4+1)*en,.022*sway*en);
  d.legs[0].rotation.x=-.1*tap; d.legs[0].position.y=.5+.008*tap; d.legs[1].rotation.x=.02;
  /* where he looks: down at his hands mostly; up at you now and then when you are near, and when you ask him to play */
  DM.attT-=dt; let want=0;
  if(DM.st==='nod'||DM.st==='talk') want=1; else if(solo&&DM.sct<1.6) want=.75; else if(DM.d<6&&DM.attT<0){ want=1; if(DM.attT<-1.8) DM.attT=5+Math.random()*6; }
  DM.att=damp(DM.att,want,want>DM.att?6:2.5,dt);
  DM.g.updateWorldMatrix(true,false); const lp=DM.g.worldToLocal(dmV.copy(P.u).multiplyScalar(R+P.h+1.1)); lp.y-=DM.hy+DM.lift;
  const ly=clamp(Math.atan2(lp.x,lp.z),-1,1), lpt=clamp(-Math.atan2(lp.y,Math.hypot(lp.x,lp.z)),-.35,.5);
  const nodK=DM.st==='nod'?.2*Math.max(0,Math.sin(TAU*DM.stT/.45))*sstep(.15,.3,DM.stT):0;
  d.head.rotation.set(lerp(.36+.05*nod,lpt,DM.att)+nodK,lerp(.32,ly,DM.att),lerp(.05*sway,0,DM.att)); d.body.rotation.y+=clamp(ly*.2,-.2,.2)*DM.att;
  DM.blink-=dt; if(DM.blink<0) DM.blink=2+Math.random()*3; d.eyes[0].scale.y=DM.blink<.12?.15:1; }

/* ---------- the rocket you flew in orbit, at the size of a small house: a cream cone with peach fins, and a real hatch ---------- */
const RKR=1.2, RKH=4.4, RKB=.35, FLOOR=.42, BAND=2.05, GAP=.42, rAt=y=>RKR*(1-(y-RKB)/RKH);
const HINGE_Z=rAt(FLOOR)-.035, DOOR_L=BAND-FLOOR, DOOR_SHUT=-Math.atan((rAt(FLOOR)-rAt(BAND))/DOOR_L), DROP=Math.asin(FLOOR/DOOR_L), DOOR_OPEN=Math.PI/2+DROP, RAMP_END=HINGE_Z+DOOR_L*Math.cos(DROP), OUT_Z=Math.hypot(START[0]-PAD[0],START[1]-PAD[1]);
const RK={g:null,door:null,flame:null,shadow:null,puffs:[]}, PADU=at(PAD[0],PAD[1]), RKN=new T.Vector3(), padTop=PADU.clone().multiplyScalar(R+.1);
const rkM=new T.Matrix4(), rkW=new T.Matrix4(), rkX=new T.Vector3(), rkY=new T.Vector3(), rkZ=new T.Vector3(), shM0=frameAt(PAD[0],PAD[1],0,.12);
const B0=new T.Vector3(), B1=new T.Vector3(), B2=new T.Vector3(), B3=new T.Vector3();
// the hull is open where the hatch is; seen from inside it is dark
const HULL_F=`uniform vec3 uC; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
  void main(){ nearFade(vW); if(!gl_FrontFacing){ gl_FragColor=vec4(.13,.12,.13,1.); return; } gl_FragColor=vec4(toon(uC,normalize(vN),vW),1.); }`;
/* Andrena on the rocket's side: a band of letters on the hull between the hatch's top and the orange ring */
function rocketName(){ const cv=document.createElement('canvas'); cv.width=1536; cv.height=256; const tx=new T.CanvasTexture(cv); tx.anisotropy=4;
  const draw=()=>{ const c=cv.getContext('2d'); c.clearRect(0,0,cv.width,cv.height); c.fillStyle='#000'; c.textAlign='center'; c.textBaseline='middle';
    let f=200; c.font=`900 ${f}px Doto, monospace`; const w=c.measureText('ANDRENA').width; if(w>cv.width*.92){ f*=cv.width*.92/w; c.font=`900 ${f}px Doto, monospace`; }
    c.fillText('ANDRENA',cv.width/2,cv.height*.55); tx.needsUpdate=true; };
  draw(); if(document.fonts&&document.fonts.load) document.fonts.load('900 40px Doto').then(draw).catch(()=>{});
  const y0=2.16, y1=2.41, th=1.1, m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3('#2a241d')},uMap:{value:tx},uCut:{value:1}},LU),vertexShader:TOON_V(true),
    fragmentShader:`uniform vec3 uC; uniform sampler2D uMap; varying vec3 vN; varying vec3 vW; varying vec3 vC; varying vec2 vUv; ${LIGHT} ${NEAR}
      void main(){ nearFade(vW); if(texture2D(uMap,vUv).a<.5) discard; gl_FragColor=vec4(toon(uC,normalize(vN),vW),1.); }`});
  const g=new T.Mesh(new T.CylinderGeometry(rAt(y1)+.01,rAt(y0)+.01,y1-y0,48,1,true,-th,2*th),m); g.position.y=(y0+y1)/2; g.userData.noInk=true; RK.g.add(g); }
function buildRocket(){ const g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g); RK.g=g; rocketName();
  const add=(m,x,y,z)=>{ m.position.set(x,y,z); g.add(m); return m; };
  const hullM=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3('#EEE9DF')},uCut:{value:1}},LU),vertexShader:TOON_V(),fragmentShader:HULL_F,side:T.DoubleSide});
  add(new T.Mesh(new T.CylinderGeometry(rAt(BAND),rAt(RKB),BAND-RKB,40,1,true,GAP,TAU-2*GAP),hullM),0,(RKB+BAND)/2,0);
  add(new T.Mesh(new T.ConeGeometry(rAt(BAND),RKH-(BAND-RKB),40,1,true),hullM),0,BAND+(RKH-(BAND-RKB))/2,0);
  add(new T.Mesh(new T.CircleGeometry(rAt(FLOOR)-.02,32).rotateX(-Math.PI/2),toonMat('#6a6560')),0,FLOOR,0);
  add(new T.Mesh(new T.CircleGeometry(RKR,32).rotateX(Math.PI/2),toonMat('#5a5f63')),0,RKB,0);
  add(new T.Mesh(new T.CylinderGeometry(rAt(2.54)+.016,rAt(2.42)+.016,.12,40),toonMat('#ef8a3c')),0,2.48,0);
  add(new T.Mesh(new T.CylinderGeometry(.5,.66,.34,24),toonMat('#5a5f63')),0,.19,0);
  [Math.PI/4,-Math.PI/4].forEach(a=>{ const f=add(new T.Mesh(new T.BoxGeometry(3.1,1.25,.09),toonMat('#FFC392')),0,.64,0); f.rotation.y=a; });
  const w=add(new T.Mesh(new T.SphereGeometry(.17,16,10),toonMat('#38444d')),0,3.25,rAt(3.25)-.02); w.scale.set(1,1,.4); w.rotation.x=-Math.atan(RKR/RKH);
  /* the hatch is cut out of the hull itself: a curved panel that closes flush into the opening, inside a dark frame (two
     posts and a header), swinging on a hinge barrel along its bottom edge. Light outside, a grey deck inside, which is the
     side you walk on when it lies open as a ramp */
  const frM=toonMat('#4f5458'), seg=(r0,r1,y0,y1,a0,a1,m,sides)=>{ const gm=new T.CylinderGeometry(r1,r0,y1-y0,sides||10,1,true,a0,a1-a0); return add(new T.Mesh(gm,m),0,(y0+y1)/2,0); };
  const JAMB=.07, PROUD=.022;
  seg(rAt(FLOOR)+PROUD,rAt(BAND)+PROUD,FLOOR-.02,BAND+.02,GAP,GAP+JAMB,frM,3);            // the post on one side
  seg(rAt(FLOOR)+PROUD,rAt(BAND)+PROUD,FLOOR-.02,BAND+.02,-GAP-JAMB,-GAP,frM,3);          // and on the other
  seg(rAt(BAND)+PROUD,rAt(BAND+.075)+PROUD,BAND,BAND+.075,-GAP-JAMB,GAP+JAMB,frM,12);      // the header over it
  const hinge=add(new T.Mesh(new T.CylinderGeometry(.05,.05,2*rAt(FLOOR)*Math.sin(GAP)+.08,14).rotateZ(Math.PI/2),frM),0,FLOOR,HINGE_Z+.035);   // the hinge barrel
  const piv=add(new T.Group(),0,FLOOR,HINGE_Z); piv.rotation.x=DOOR_SHUT; RK.door=piv;
  const din=new T.Group(); din.rotation.x=-DOOR_SHUT; piv.add(din);   // at DOOR_SHUT the panel sits exactly in the hull
  const doorM=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3('#EEE9DF')},uIn:{value:C3('#8f8a82')}},LU),vertexShader:TOON_V(),side:T.DoubleSide,
    fragmentShader:`uniform vec3 uC,uIn; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
      void main(){ nearFade(vW); vec3 n=normalize(vN); gl_FragColor=vec4(gl_FrontFacing?toon(uC,n,vW):toon(uIn,-n,vW),1.); }`});
  const panel=new T.Mesh(new T.CylinderGeometry(rAt(BAND)-.004,rAt(FLOOR)-.004,BAND-FLOOR,14,1,true,-GAP+.004,2*GAP-.008).translate(0,(FLOOR+BAND)/2-FLOOR,-HINGE_Z),doorM); din.add(panel);
  const hd=new T.Mesh(new T.BoxGeometry(.05,.22,.05),frM); hd.position.set(rAt(FLOOR+DOOR_L*.55)*Math.sin(GAP*.62),DOOR_L*.55,rAt(FLOOR+DOOR_L*.55)*Math.cos(GAP*.62)-HINGE_Z+.02); hd.rotation.y=GAP*.62; din.add(hd);   // the handle
  [-1,1].forEach(sd=>{ const a=sd*GAP*.62, r=rAt(FLOOR+.12); const k=new T.Mesh(new T.BoxGeometry(.12,.24,.04),frM); k.position.set(r*Math.sin(a),.12,r*Math.cos(a)-HINGE_Z+.016); k.rotation.y=a; din.add(k); });   // the hinge straps, on the door
  [[-.7,.3],[.7,.3],[-.7,.86],[.7,.86]].forEach(([u,v])=>{ const y=DOOR_L*v, a=GAP*u, r=rAt(FLOOR+y); const b=new T.Mesh(new T.CylinderGeometry(.022,.022,.02,8).rotateX(Math.PI/2),frM); b.position.set(r*Math.sin(a),y,r*Math.cos(a)-HINGE_Z+.008); b.rotation.y=a; din.add(b); });   // four bolts
  const fl=add(new T.Group(),0,.02,0); fl.add(new T.Mesh(new T.ConeGeometry(.5,2.2,16).rotateX(Math.PI).translate(0,-1.1,0),flatMat('#ff9b3d')),new T.Mesh(new T.ConeGeometry(.27,1.25,12).rotateX(Math.PI).translate(0,-.62,0),flatMat('#fff1b8'))); RK.flame=fl;
  const sh=new T.Mesh(SHG,SHM); sh.matrixAutoUpdate=false; sh.renderOrder=1; sh.layers.set(1); sc.add(sh); RK.shadow=sh;
  const pm=toonMat('#f3efe7'); for(let i=0;i<120;i++){ const m=new T.Mesh(GEO.blob,pm); m.visible=false; sc.add(m); RK.puffs.push({m,t:9,life:1,v:new T.Vector3(),s:1}); }
  tang(PADU,at(PAD[0]+DOOR[0]*.2,PAD[1]+DOOR[1]*.2),RKN);
  // the hole hangs in the sky behind the pad, 42 degrees up, so the rocket comes down out of it toward you
  SKYBH.value.copy(PADU).multiplyScalar(Math.cos(.73)).addScaledVector(RKN,-Math.sin(.73)).normalize();
  // the way down: one smooth curve straight out of the hole, bending to come in vertically over the pad
  B0.copy(padTop).addScaledVector(SKYBH.value,36); B1.copy(padTop).addScaledVector(SKYBH.value,17); B2.copy(padTop).addScaledVector(PADU,9); B3.copy(padTop).addScaledVector(PADU,1.7); }
function rocketPose(pos,axis,wob=0){ rkY.copy(axis); rkZ.copy(RKN).addScaledVector(rkY,-rkY.dot(RKN)).normalize(); rkX.crossVectors(rkY,rkZ); rkM.makeBasis(rkX,rkY,rkZ);
  if(wob) rkM.multiply(rkW.makeRotationZ(wob)); rkM.setPosition(pos); RK.g.matrix.copy(rkM); RK.g.matrixWorldNeedsUpdate=true;
  const k=clamp(1-V.copy(pos).sub(padTop).dot(PADU)/14,0,1), sz=.6+2.6*k; RK.shadow.visible=k>0; RK.shadow.matrix.copy(shM0).scale(V.set(sz,1,sz)); }
function bez(s,o){ const a=1-s; return o.copy(B0).multiplyScalar(a*a*a).addScaledVector(B1,3*a*a*s).addScaledVector(B2,3*a*s*s).addScaledVector(B3,s*s*s); }
function bezD(s,o){ const a=1-s; o.copy(B1).sub(B0).multiplyScalar(3*a*a); o.addScaledVector(V.copy(B2).sub(B1),6*a*s); return o.addScaledVector(V.copy(B3).sub(B2),3*s*s); }
/* where the rocket is c seconds in: down the curve, slowing all the way to a hover over the pad, then a gentle last drop */
const T_HOV=3, T_LAND=4.2, T_DOOR=4.6, T_OUT=5.45, T_WALK=7.1, T_CAM=6.1, T_END=7.6;
function flight(c,pos,vel){ if(c<T_HOV){ const u=c/T_HOV, sv=1-Math.pow(1-u,3), ds=3*Math.pow(1-u,2)/T_HOV; bez(sv,pos); bezD(sv,vel).multiplyScalar(ds); }
  else { const u=clamp((c-T_HOV)/(T_LAND-T_HOV),0,1), k=u*u*(3-2*u); pos.copy(padTop).addScaledVector(PADU,1.7*(1-k)); vel.copy(PADU).multiplyScalar(-1.7*6*u*(1-u)/(T_LAND-T_HOV)); } }
const fPos=new T.Vector3(), fVel=new T.Vector3(), fAx=new T.Vector3();
function rocketFly(c,t){ flight(c,fPos,fVel); const sp=fVel.length(); fAx.copy(PADU); if(sp>1e-4) fAx.addScaledVector(fVel,-Math.min(1,sp/16)*.8/sp); fAx.normalize();
  const wob=Math.sin(c*2.3)*.025*sstep(T_HOV-.6,T_HOV,c)*(1-sstep(T_LAND-.45,T_LAND,c)); rocketPose(c>=T_LAND?padTop:fPos,c>=T_LAND?PADU:fAx,wob); return sp; }
function puff(pos,vel,s,life){ const p=RK.puffs.find(q=>q.t>=q.life)||RK.puffs[0]; p.t=0; p.life=life; p.s=s; p.m.position.copy(pos); p.v.copy(vel); p.m.visible=true; }
function puffsUpdate(dt){ for(const p of RK.puffs){ if(p.t>=p.life){ p.m.visible=false; continue; } p.t+=dt; p.m.position.addScaledVector(p.v,dt); p.v.multiplyScalar(Math.exp(-2.4*dt));
  const k=p.t/p.life, sz=Math.max(.001,p.s*Math.sin(Math.PI*Math.min(1,k*1.15))); p.m.scale.set(sz,sz*.62,sz); } }
/* the landing: out of the hole, a long braking curve, a hover, a soft touchdown, the hatch drops, and out you walk */
const CUT={on:false,t:0,look:new T.Vector3()}, CAMC=[PAD[0]+2.6,PAD[1]+6.6];
function rocketLanded(){ rocketPose(padTop,PADU); RK.door.rotation.x=DOOR_OPEN; RK.flame.visible=false; RK.puffs.forEach(p=>{ p.t=p.life; p.m.visible=false; }); }
function placeAtStart(){ const P=player; P.u.copy(at(START[0],START[1])); tang(P.u,at(START[0]+FACE[0],START[1]+FACE[1]),P.f); C.f.copy(P.f); C.pitch=C.pEff=C.PITCH; C.zoom=1; C.dragT=9; C.tk=0; P.tgt=null; P.speed=0;
  [P.x,P.z]=START; P.h=standH(START[0],START[1]); C.camH=P.h; C.tgt.copy(P.u).multiplyScalar(R+P.h+C.HEAD); C.dist=rigLimit(START[0],START[1],P.u,P.f,C.pitch,C.D0()); }
function endCut(){ CUT.on=false; el.classList.remove('cut'); document.documentElement.classList.remove('crcut'); me.visible=true; rocketLanded(); placeAtStart(); cardT=0; started=false; el.classList.remove('walked'); hint.classList.remove('gone'); A.thrust(0); A.roar(0); S.stSnap=true; }
function skipCut(){ if(CUT.on){ CUT.t=T_END; endCut(); } }
st.cutscene=function(){ CUT.on=true; CUT.t=0; document.documentElement.classList.add('crcut'); CUT.landed=false; CUT.door=false; CUT.ph=0; el.classList.add('cut'); me.visible=false; RK.door.rotation.x=DOOR_SHUT; RK.flame.visible=true; closeTalk(); rocketFly(0,0); CUT.look.copy(fPos); S.stSnap=true; };
function camAt(x,z,h,o){ return at(x,z,o).multiplyScalar(R+standH(x,z)+h); }
/* the walk out, as distance from the middle of the rocket toward the hatch: along the floor, down the ramp, onto the pad */
const rampY=z=>z<HINGE_Z?FLOOR:z<RAMP_END?FLOOR-(z-HINGE_Z)*Math.tan(DROP):0;
const cT=new T.Vector3(), cG=new T.Vector3(), cL=new T.Vector3(), cF=new T.Vector3();
function cutUpdate(dt,t){ CUT.t+=dt; const c=CUT.t, up=PADU;
  const sp=rocketFly(c,t), hgt=c<T_LAND?V.copy(fPos).sub(padTop).dot(up):0;
  // the flame: steady while it brakes, strongest in the hover, gone just after touchdown
  const fk=c<T_HOV?.65+.55*sstep(.35,.95,c/T_HOV):c<T_LAND?.95-.4*sstep(T_LAND-.5,T_LAND,c):Math.max(0,1-(c-T_LAND)/.35)*.55;
  RK.flame.visible=fk>.02; RK.flame.scale.set(.95+.05*Math.sin(t*31),fk*(.88+.18*Math.sin(t*43)+.08*Math.sin(t*19)),.95+.05*Math.sin(t*29));
  if(c<T_LAND){ A.thrust(.35+.6*fk); A.roar(.06+.1*fk);
    if(hgt<4&&Math.random()<dt*22*(1-hgt/4)){ const a=Math.random()*TAU, r=.7+Math.random()*.8; at(PAD[0]+Math.cos(a)*r,PAD[1]+Math.sin(a)*r,V2).multiplyScalar(R+.2);
      tang(up,at(PAD[0]+Math.cos(a)*3,PAD[1]+Math.sin(a)*3),V3).multiplyScalar(2+Math.random()*1.5).addScaledVector(up,.3); puff(V2,V3,.16+Math.random()*.14,1); } }
  if(c>=T_LAND&&!CUT.landed){ CUT.landed=true; S.shake=.28; A.pop(); A.thrust(0); A.roar(0);
    for(let k=0;k<14;k++){ const a=k/14*TAU+Math.random()*.3; at(PAD[0]+Math.cos(a)*1.3,PAD[1]+Math.sin(a)*1.3,V2).multiplyScalar(R+.35);
      tang(up,at(PAD[0]+Math.cos(a)*3,PAD[1]+Math.sin(a)*3),V3).multiplyScalar(2.2+Math.random()*1.2).addScaledVector(up,.2); puff(V2,V3,.24+Math.random()*.14,1.4); } }
  // the hatch drops into a ramp, settling with a small bounce
  const dk=clamp((c-T_DOOR)/.8,0,1); if(dk>0&&!CUT.door){ CUT.door=true; A.click(); }
  RK.door.rotation.x=lerp(DOOR_SHUT,DOOR_OPEN,dk<1?1-Math.pow(1-dk,3)+Math.sin(dk*Math.PI)*.06*dk:1);
  // and out you come through the hatch, down the ramp, turning to look across at Aetos
  if(c>=T_OUT){ me.visible=true; const wk=clamp((c-T_OUT)/(T_WALK-T_OUT),0,1), z=.15+(OUT_Z-.15)*wk*wk*(3-2*wk), wv=6*wk*(1-wk); // starts and stops gently
    const x0=PAD[0]+DOOR[0]*z, z0=PAD[1]+DOOR[1]*z, tk=sstep(.72,1,wk), fx=lerp(DOOR[0],FACE[0],tk), fz=lerp(DOOR[1],FACE[1],tk);
    at(x0,z0,V2); tang(V2,at(x0+fx*.2,z0+fz*.2),cF); standOn(me,V2,cF,.1+rampY(z)); CUT.ph+=dt*7.2*Math.min(1,wv*.8); animate(me,CUT.ph,Math.min(1,wv*.75),0,t,9);
    player.x=x0; player.z=z0; player.u.copy(V2); player.f.copy(cF); }
  // the camera: low by the road, following the rocket down out of the sky, then round behind you
  camAt(CAMC[0],CAMC[1],1.45,cT);
  const lk=sstep(T_LAND-.6,T_LAND+.6,c); cL.copy(fPos).addScaledVector(fAx,1.4); cG.copy(padTop).addScaledVector(up,1.5).addScaledVector(RKN,.7); CUT.look.copy(cL).lerp(cG,lk);
  st.camP.copy(cT); st.camL.copy(CUT.look);
  const bk=E.io(clamp((c-T_CAM)/(T_END-T_CAM),0,1));
  if(bk>0){ at(START[0],START[1],V2); tang(V2,at(START[0]+FACE[0],START[1]+FACE[1]),V3); const hs=standH(START[0],START[1]);
    V4.copy(V2).multiplyScalar(R+hs+C.HEAD); rigPose(V4,V2,V3,C.PITCH,rigLimit(START[0],START[1],V2,V3,C.PITCH,C.D0()),cG,cL);
    const [ex,ez]=loc(camW.copy(cG).normalize()), eh=cG.length()-R-standH(ex,ez), a0=Math.atan2(CAMC[0]-START[0],CAMC[1]-START[1]), r0=Math.hypot(CAMC[0]-START[0],CAMC[1]-START[1]), a1=Math.atan2(ex-START[0],ez-START[1]), r1=Math.hypot(ex-START[0],ez-START[1]);
    let da=a1-a0; da=Math.atan2(Math.sin(da),Math.cos(da)); const a=a0+da*bk, r=lerp(r0,r1,bk);
    camAt(START[0]+Math.sin(a)*r,START[1]+Math.cos(a)*r,lerp(1.45,eh,bk),cT); st.camP.copy(cT); st.camL.copy(CUT.look).lerp(cL,bk); }
  stUp.copy(at(lerp(CAMC[0],START[0],bk),lerp(CAMC[1],START[1],bk))); stCam.up.copy(stUp); UPU.value.copy(stUp); S.stSnap=true; LU.uPly.value.copy(st.camP);
  puffsUpdate(dt);
  if(c>=T_END) endCut(); }

/* ---------- the sky over Earth: the visitor's own time of day, the weather now and then, the season ----------
   The sun stands where it would at this hour and on this day of the year, at our latitude: up early and late in summer,
   low and short in winter. At night the moon gives the light, the street lamps and the windows come on, and the stars are
   out. Now and then it rains (and in December it snows instead), sea fog rolls in with the foghorn, and after the rain
   there is a rainbow. Leaves turn in autumn and blossom in spring; there is snow and fairy lights in December and
   pumpkins on the doorsteps at Halloween. ?time=21:30, ?date=12-24 and ?weather=rain|fog|clear set any of it. */
const SKY={h:15,doy:200,md:'07-15',e:40,night:0,dusk:0,dir:0,t:9,baked:new T.Vector3(),over:0}, WX={kind:'clear',rain:0,fog:0,bow:0,t:0,stop:0,horn:12,bowT:0,snow:false}, SEA={};
const QPS=new URLSearchParams(location.search), SKYSET={time:QPS.get('time'),date:QPS.get('date'),weather:QPS.get('weather')};
const D2R=Math.PI/180, SOUTH=new T.Vector3(.38,0,.46).normalize(), WEST=new T.Vector3(SOUTH.z,0,-SOUTH.x);
/* where the sun is: elevation from the hour angle, the sun's declination for the day and our latitude; the moon opposite */
function sunDir(h,doy,out,moon){ const lat=50*D2R, dec=23.44*D2R*Math.sin(TAU*(doy-81)/365)*(moon?-1:1), H=((moon?h+12:h)-12.5)*15*D2R;
  const se=Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(H), e=Math.asin(clamp(se,-1,1)), ce=Math.max(1e-4,Math.cos(e));
  let ca=clamp((se*Math.sin(lat)-Math.sin(dec))/(ce*Math.cos(lat)),-1,1), az=Math.acos(ca); if(H<0) az=-az;
  return out.copy(SOUTH).multiplyScalar(ce*Math.cos(az)).addScaledVector(WEST,ce*Math.sin(az)).add(V4.set(0,se,0)).normalize(); }
const doyOf=(m,d)=>Math.round([0,31,59,90,120,151,181,212,243,273,304,334][m-1]+d);
const inRange=(md,a,b)=>a<=b?md>=a&&md<=b:md>=a||md<=b;   // month-day strings, wrapping the new year
/* how much of a season there is on a day: ramps in and out over a few days at each end */
function seasonK(doy,a,b,ramp){ const span=(b-a+365)%365, x=(doy-a+365)%365; if(x>span) return 0; return Math.min(1,x/ramp,(span-x)/ramp); }
function skyClock(){ const now=new Date(); let h=now.getHours()+now.getMinutes()/60+now.getSeconds()/3600, m=now.getMonth()+1, d=now.getDate();
  if(window.__TEST&&!SKYSET.time){ h=15; } if(window.__TEST&&!SKYSET.date){ m=7; d=15; }   // the tests see one fixed afternoon unless they ask
  if(SKYSET.time){ const p=SKYSET.time.split(':'); h=clamp((+p[0]||0)+(+p[1]||0)/60,0,23.99); }
  if(SKYSET.date){ const p=SKYSET.date.split('-'); m=clamp(+p[0]||1,1,12); d=clamp(+p[1]||1,1,31); }
  SKY.h=h; SKY.doy=doyOf(m,d); SKY.md=String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
/* the weather for this visit: the same for everyone within the same three hours of the same day */
function skyWeather(){ let k='clear'; const now=new Date(), seed=(now.getFullYear()*400+SKY.doy)*8+Math.floor(SKY.h/3), r=fract(Math.sin(seed*12.9898)*43758.5453);
  if(r<.2) k='rain'; else if(r<.36) k='fog';
  if(window.__TEST&&!SKYSET.weather) k='clear'; if(SKYSET.weather) k=SKYSET.weather;
  WX.kind=k; WX.snow=inRange(SKY.md,'12-01','01-06'); WX.t=0; WX.rain=k==='rain'?1:0; WX.fog=0; WX.bow=0; WX.stop=70+r*400%60; WX.horn=10; WX.bowT=0; SKY.over=k==='rain'?1:0; }
const fract=x=>x-Math.floor(x);
const SUND=new T.Vector3(), MOOND=new T.Vector3(), LT=new T.Vector3(), LT2=new T.Vector3();
const mixV=(o,a,b,k)=>o.set(a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k);
const SKYC={day:{la:[.93,.92,.89],lb:[1.05,1.02,.95],sh:[.6,.66,.83],sky:[.62,.82,.85],fog:[.83,.9,.89]},
  gold:{la:[1.,.85,.7],lb:[1.1,.93,.75],sh:[.52,.53,.72],sky:[.88,.72,.63],fog:[.89,.8,.73]},
  night:{la:[.34,.4,.58],lb:[.4,.47,.66],sh:[.19,.23,.37],sky:[.17,.23,.36],fog:[.105,.145,.21]}};
const cA=new T.Vector3(), cB=new T.Vector3();
function skyApply(){ sunDir(SKY.h,SKY.doy,SUND,false); sunDir(SKY.h,SKY.doy,MOOND,true);
  const ed=Math.asin(clamp(SUND.y,-1,1))/D2R; SKY.e=ed;
  const night=1-sstep(-8,-1,ed), dusk=sstep(-8,0,ed)*(1-sstep(4,16,ed)), sunOn=ed>-2.5;
  SKY.night=night; SKY.dusk=dusk;
  /* the light that casts: the sun, or the moon once the sun is well down; how strong it is fades to nothing at the hand-over */
  if(!SKY.hold) SUN.copy(sunOn?SUND:MOOND); let direct=sunOn?sstep(-2,4,ed):1-sstep(-9,-3,ed);   // (hold: a test moving the light by hand) direct*=1-.7*SKY.over-.4*WX.fog;
  const K=['la','lb','sh','sky','fog'], out={};
  for(const k of K){ mixV(cA,SKYC.day[k],SKYC.gold[k],dusk); mixV(cB,[cA.x,cA.y,cA.z],SKYC.night[k],night); out[k]=cB.clone(); }
  LU.uShdC.value.copy(out.sh); LU.uLitA.value.copy(out.sh).lerp(out.la,direct); LU.uLitB.value.copy(out.sh).lerp(out.lb,direct);
  /* rain greys the air; sea fog closes in, pale by day and dark blue at night */
  const grey=V4.set(.7,.75,.77).multiplyScalar(1-.85*night);
  out.fog.lerp(grey,.6*SKY.over); out.sky.lerp(grey,.5*SKY.over); out.fog.lerp(V4.set(.8,.85,.87).multiplyScalar(1-.78*night),WX.fog*.9);
  LU.uFog.value.setRGB(out.fog.x,out.fog.y,out.fog.z); LU.uSky.value.setRGB(out.sky.x,out.sky.y,out.sky.z);
  const fg=WX.fog, ov=SKY.over; LU.uFogR.value.set(lerp(lerp(16,11,ov),2.5,fg),lerp(lerp(52,40,ov),16,fg)); LU.uFogA.value=lerp(lerp(.55,.65,ov),.92,fg);
  LU.uNight.value=night; LU.uWet.value=Math.max(WX.rain,LU.uWet.value*.999); LU.uSnow.value=WX.snow?.8:0;
  LU.uSeason.value=seasonK(SKY.doy,doyOf(9,18),doyOf(11,30),12)-seasonK(SKY.doy,doyOf(3,22),doyOf(5,18),10);
  SKYU.uSunD.value.copy(SUND); SKYU.uMoonD.value.copy(MOOND); SKYU.uDusk.value=dusk*(1-night*.5); SKYU.uOver.value=Math.max(ov,fg*.5); SKYU.uBow.value=WX.bow*(ed>2?1:0);
  /* the shadows are drawn again when the light has moved a degree or so */
  if(SKY.baked.dot(SUN)<.9998){ SKY.baked.copy(SUN); baked=false; } }
/* ---------- the things the sky brings: rain and snow, fireflies, fairy lights and pumpkins ---------- */
let FALL=null, FLIES=null, XMAS=null; const PUMPS=[];
function buildSkyFx(){ skyClock(); skyWeather();
  /* rain and snow: a few hundred streaks or flakes in a box that travels with the camera, falling in the vertex shader */
  { const N=LO?260:520, P=[], S=[], Cn=[], I=[]; for(let i=0;i<N;i++){ const s=[Math.random(),Math.random(),Math.random(),Math.random()];
      for(const [cx,cy] of [[-1,0],[1,0],[1,1],[-1,1]]){ P.push(0,0,0); S.push(...s); Cn.push(cx,cy); } const b=i*4; I.push(b,b+1,b+2, b,b+2,b+3); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aS',new T.Float32BufferAttribute(S,4)); g.setAttribute('aC',new T.Float32BufferAttribute(Cn,2)); g.setIndex(I);
    const m=new T.ShaderMaterial({uniforms:{uCam:{value:new T.Vector3()},uUp:UPU,uTime:G.uTime,uK:{value:0},uSnow:{value:0},uNight:LU.uNight},transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:`attribute vec4 aS; attribute vec2 aC; uniform vec3 uCam,uUp; uniform float uTime,uSnow; varying vec2 vC; varying float vA;
        void main(){ vec3 e1=normalize(cross(uUp,abs(uUp.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.))), e2=cross(uUp,e1);
          float sp=mix(9.,.9,uSnow), y=fract(aS.y-uTime*sp/12.)*12.-5.; vec3 p=uCam+e1*(aS.x-.5)*18.+e2*(aS.z-.5)*18.+uUp*y;
          p+=(e1*sin(uTime*1.3+aS.w*20.)+e2*cos(uTime*1.1+aS.w*17.))*.35*uSnow;   // flakes drift
          vec3 vd=normalize(p-cameraPosition), sd=normalize(cross(uUp,vd)); float L=mix(.42,.05,uSnow), W=mix(.022,.05,uSnow);
          p+=sd*aC.x*W+(uSnow>.5?cross(vd,sd)*(aC.y-.5)*2.*W:uUp*aC.y*L); vC=aC; vA=smoothstep(18.,6.,distance(p,cameraPosition))*(.55+.45*aS.w);
          gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader:`uniform float uK,uSnow,uNight; varying vec2 vC; varying float vA; void main(){ float a=uSnow>.5?smoothstep(1.,.5,length(vec2(vC.x,vC.y*2.-1.))):1.-abs(vC.x)*.6;
        gl_FragColor=vec4(mix(vec3(.82,.88,.93),vec3(.97),uSnow)*(1.-.55*uNight),a*vA*uK*mix(.5,.9,uSnow)); }`});
    FALL=new T.Mesh(g,m); FALL.frustumCulled=false; FALL.layers.set(1); FALL.renderOrder=5; FALL.visible=false; sc.add(FALL); }
  /* fireflies by the trees on summer nights */
  if(inRange(SKY.md,'05-15','09-15')){ const n=LO?16:28, m=new T.InstancedMesh(new T.SphereGeometry(.035,6,4),new T.MeshBasicMaterial({color:new T.Color(1,1,.6)}),n);
    m.layers.set(1); m.frustumCulled=false; m.userData.f=Array.from({length:n},(_,i)=>{ const t=TREES[i%Math.max(1,TREES.length)]||[0,0,1]; return {x:t[0]+(Math.random()-.5)*2.4,z:t[1]+(Math.random()-.5)*2.4,ph:Math.random()*TAU,h:.5+Math.random()*1.4}; }); sc.add(m); FLIES=m; }
  /* December: fairy lights along the front of every house */
  if(inRange(SKY.md,'12-01','01-06')){ const pts=[]; for(const H of HOUSES){ const n=Math.max(4,Math.floor(H.w/.3)); for(let i=0;i<=n;i++) pts.push(V.set(-H.w/2+i*H.w/n,H.h-(H.flat?-.08:.16),H.d/2+.1).applyMatrix4(H.M).clone()); }
    const m=new T.InstancedMesh(new T.SphereGeometry(.05,6,4),new T.MeshBasicMaterial(),pts.length), M4=new T.Matrix4(), CL=['#ff5a4a','#ffd05a','#5fd36a','#6fb4ff'].map(c=>new T.Color(c));
    pts.forEach((p,i)=>{ M4.makeTranslation(p.x,p.y,p.z); m.setMatrixAt(i,M4); m.setColorAt(i,CL[i%4]); }); m.layers.set(1); m.frustumCulled=false; sc.add(m); XMAS={m,CL,n:pts.length,t:0}; }
  /* Halloween: a carved pumpkin by every door, lit inside when it gets dark */
  if(inRange(SKY.md,'10-20','11-02')){ for(const H of HOUSES){ const Mp=new T.Matrix4().multiplyMatrices(H.M,new T.Matrix4().makeTranslation(H.dx+.62,0,H.d/2+.42)), g=new T.Group(); g.matrixAutoUpdate=false; g.matrix.copy(Mp); sc.add(g);
      const body=new T.Mesh(new T.SphereGeometry(.2,14,10),toonMat('#e8822e')); body.scale.set(1,.8,1); body.position.y=.17; g.add(body);
      const stem=new T.Mesh(new T.CylinderGeometry(.025,.03,.08,6),toonMat('#5b6b33')); stem.position.y=.35; g.add(stem);
      const face=flatMat('#3a2412'); [[-.07,.21,.12],[.07,.21,.12]].forEach(([x,y,s])=>{ const t=new T.Mesh(new T.CircleGeometry(.045,3),face); t.position.set(x,y,.17); t.rotation.z=Math.PI/2; g.add(t); });
      const mo=new T.Mesh(new T.PlaneGeometry(.18,.045),face); mo.position.set(0,.11,.185); g.add(mo); PUMPS.push(face); } } }
/* ---------- each frame ---------- */
function skyUpdate(dt,t){ SKY.t+=dt; if(SKY.t>1){ SKY.t=0; skyClock(); }
  /* the weather moves on: the rain stops after a while and the cloud clears, and with the sun out behind you a rainbow; fog rolls in */
  WX.t+=dt;
  if(WX.kind==='rain'){ if(WX.t>WX.stop){ WX.rain=Math.max(0,WX.rain-dt/8); SKY.over=Math.max(0,SKY.over-dt/22); if(!WX.bowT&&SKY.over<.5&&SKY.e>2&&!WX.snow){ WX.bowT=1; A.chime(4,0,.025); } } }
  if(WX.bowT){ WX.bowT+=dt; WX.bow=sstep(1,9,WX.bowT)*(1-sstep(55,70,WX.bowT)); }
  if(WX.kind==='fog') WX.fog=sstep(10,40,WX.t);
  skyApply();
  /* rain or snow round the camera */
  const fall=WX.rain*(1-sstep(0,1,SPACEU.value)); FALL.visible=fall>.01; if(FALL.visible){ const u=FALL.material.uniforms; u.uCam.value.copy(stCam.position); u.uK.value=fall; u.uSnow.value=WX.snow?1:0; }
  A.rain(WX.snow?0:fall*(FIN.on?.3:1));
  /* the street lamps: dim at night, full as you come by, then easing back; a click as each one comes up */
  const P=player, nt=SKY.night;
  LAMPS.forEach((l,i)=>{ const near=Math.hypot(P.x-l.x,P.z-l.z)<6, want=nt>.15?(near?1:.4):0;
    if(want>l.k){ l.k=Math.min(want,l.k+dt*(near?3.2:1)); } else l.k=Math.max(want,l.k-dt/5);
    if(near&&nt>.15&&!l.hot&&l.k>.8){ l.hot=1; if(!TALK.p&&!CUT.on) A.tick(); } if(!near) l.hot=0;
    const f=l.k*(near&&l.k<1?.85+.15*Math.sin(t*60+i):1); LU.uLmp.value[i].set(l.p.x,l.p.y,l.p.z,f); });
  /* fireflies wander round the trees on a summer night */
  document.documentElement.classList.toggle('crnight',nt>.5);
  if(FLIES){ FLIES.visible=nt>.3&&inRange(SKY.md,'05-15','09-15'); if(FLIES.visible){ const M4=Mf; FLIES.userData.f.forEach((q,i)=>{ const a=t*.4+q.ph, x=q.x+Math.sin(a*1.3)*.6, z=q.z+Math.cos(a*.9)*.6, h=q.h+Math.sin(a*2.1)*.25, on=.5+.5*Math.sin(t*3+q.ph*5)>.35?1:.001;
      at(x,z,V).multiplyScalar(R+standH(x,z)+h); M4.makeScale(on,on,on).setPosition(V); FLIES.setMatrixAt(i,M4); }); FLIES.instanceMatrix.needsUpdate=true; } }
  /* the fairy lights twinkle; the pumpkins glow once it is dark */
  if(XMAS){ XMAS.t+=dt; if(XMAS.t>.5){ XMAS.t=0; const k=.55+.45*nt; for(let i=0;i<XMAS.n;i++){ const c=XMAS.CL[(i+Math.floor(t*2))%4]; XMAS.m.setColorAt(i,V.set(c.r*k,c.g*k,c.b*k)); } XMAS.m.instanceColor.needsUpdate=true; } }
  PUMPS.forEach(m=>m.uniforms.uC.value.setRGB(lerp(.23,1,nt),lerp(.14,.72,nt),lerp(.07,.25,nt)));
  /* the foghorn, from the lighthouse when there is one, out at sea when not */
  if(WX.fog>.6&&!FIN.on&&!CUT.on){ WX.horn-=dt; if(WX.horn<=0){ WX.horn=26+Math.random()*8; const d0=PH?Math.hypot(P.x-PH.x,P.z-PH.z):14; A.foghorn(.1*clamp(1.3-d0/30,.55,1)); } } }
/* ---------- the lighthouse: take the light and steer it ----------
   By the lighthouse you can take the light: drag (or the arrow keys) turns the beam out over the water, the camera up on
   the gallery behind it. The beam lights whatever it falls on and thins the fog along it, so at night and in fog it is
   what you see by. Out there are a fishing boat, a bell buoy, and a drone that has lost its way: hold the light on it and
   it locks on and follows the beam home, which is Pharos in small. Let go and the light turns on by itself again. */
const PHS={on:false,yaw:0,v:0,k:0,cp:new T.Vector3(),cl:new T.Vector3(),drag:null,turned:0,T:[],lost:null,lockT:0,state:'lost',st:0,home:new T.Vector3(),bgW:new T.Matrix4()};
const steerBtn=$('#crSteer',el), steerUI=$('#crSteerUI',el);
const phLocal=(a,r,y,o)=>o.set(Math.cos(a)*r,y,-Math.sin(a)*r).applyMatrix4(PHS.bgW);   // a point at an angle round the lighthouse, out from the lamp
const angWrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function seaAngles(){ const out=[]; for(let i=0;i<72;i++){ const a=i/72*TAU; let sea=true; for(const r of [6,8.5,11]){ if(isle(phLocal(a,r,0,V).normalize())>-.06){ sea=false; break; } } if(sea) out.push(a); } return out; }
function seaThing(kind){ const g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g);
  if(kind==='boat'){ const hull=new T.Mesh(new T.BoxGeometry(1.05,.24,.42),toonMat('#8e3b2f')); hull.position.y=.12; g.add(hull);
    const deck=new T.Mesh(new T.BoxGeometry(1.08,.05,.44),toonMat('#e9e2d4')); deck.position.y=.26; g.add(deck);
    const cab=new T.Mesh(new T.BoxGeometry(.34,.28,.3),toonMat('#f2ede3')); cab.position.set(-.22,.42,0); g.add(cab);
    const mast=new T.Mesh(new T.CylinderGeometry(.018,.018,.8,6),toonMat('#5a4636')); mast.position.set(.18,.66,0); g.add(mast);
    const lan=new T.Mesh(new T.SphereGeometry(.05,8,6),flatMat('#ffd27a')); lan.position.set(.18,1.07,0); g.add(lan); g.userData.lan=lan; }
  else { const b=new T.Mesh(new T.CylinderGeometry(.14,.18,.42,12),toonMat('#cf4a36')); b.position.y=.21; g.add(b);
    const w=new T.Mesh(new T.CylinderGeometry(.145,.15,.09,12),toonMat('#f4efe6')); w.position.y=.3; g.add(w);
    const c=new T.Mesh(new T.ConeGeometry(.12,.26,10),toonMat('#cf4a36')); c.position.y=.55; g.add(c);
    const bell=new T.Mesh(new T.SphereGeometry(.055,8,6),toonMat('#d9b45a')); bell.position.y=.72; g.add(bell); }
  return g; }
function buildSteer(){ if(!PH) return; PH.beam.parent.updateWorldMatrix(true,false); PHS.bgW.copy(PH.beam.parent.matrixWorld);
  const sa=seaAngles(); if(!sa.length) return; const pick=k=>sa[Math.floor(k*(sa.length-1))];
  PHS.T=[{kind:'boat',a:pick(.3),r:9.5,g:seaThing('boat'),lit:false,ph:1.3},{kind:'buoy',a:pick(.75),r:6.6,g:seaThing('buoy'),lit:false,ph:.4}];
  const d=drone('#ff5a4a'); d.scale.setScalar(1.7); sc.add(d); const ring=new T.Mesh(new T.TorusGeometry(.42,.025,6,32).rotateX(Math.PI/2),flatMat('#ffd27a')); ring.visible=false; sc.add(ring);
  PHS.lost={g:d,ring,a:pick(.55),r:8.6,pos:new T.Vector3(),from:new T.Vector3(),sa}; phLocal(0,.95,-.15,PHS.home); }
/* a thing at sea: on the water at its angle and distance from the lamp, bobbing */
function seaPose(q,t){ phLocal(q.a,q.r,0,V); const up=V2.copy(V).normalize(); V.copy(up).multiplyScalar(R+WATER+.02+Math.sin(t*1.4+q.ph)*.03);
  const M=frameAt(...loc(up),q.a+Math.sin(t*.9+q.ph)*.08); M.setPosition(V); M.multiply(Mr.makeRotationZ(Math.sin(t*1.7+q.ph)*.07)); q.g.matrix.copy(M); q.g.matrixWorldNeedsUpdate=true; }
function seaMid(){ const sa=PHS.lost?PHS.lost.sa:[]; if(!sa.length) return null; let x=0, y=0; for(const a of sa){ x+=Math.cos(a); y+=Math.sin(a); } return Math.atan2(y,x); }
function steerSet(on){ if(on===PHS.on) return; PHS.on=on; steerUI.hidden=!on; if(on){ closeTalk(); steerBtn.hidden=true; player.tgt=null; player.speed=0; A.click(); PHS.aim=seaMid(); } else { PHS.drag=null; PHS.aim=null; A.click(); } }
steerBtn.addEventListener('click',e=>{ e.stopPropagation(); steerSet(true); });
$('#crSteerDone',el).addEventListener('click',e=>{ e.stopPropagation(); steerSet(false); });
steerUI.addEventListener('pointerdown',e=>e.stopPropagation());
function steerUpdate(dt,t){ const nt=SKY.night;
  /* the beam: your hand on it, or turning by itself; longer and brighter at night and in fog */
  if(PHS.on){ const kd=(keys.has('ArrowLeft')||keys.has('KeyA')?1:0)-(keys.has('ArrowRight')||keys.has('KeyD')?1:0); if(kd) PHS.v=kd*1.4;
    else if(!PHS.drag) PHS.v*=Math.exp(-3*dt); } else PHS.v=damp(PHS.v,.9,1.5,dt);
  if(PHS.on&&PHS.aim!=null){ if(PHS.drag) PHS.aim=null; else { const d=angWrap(PHS.aim-PHS.yaw); PHS.v=clamp(d*3,-2.2,2.2); if(Math.abs(d)<.03) PHS.aim=null; } }   // out to sea first
  const dy=PHS.v*dt; PHS.yaw+=dy; if(PHS.on){ PHS.turned+=Math.abs(dy); if(PHS.turned>.21){ PHS.turned=0; A.tick(); } }   // the gear clicks as it turns
  const dk=Math.max(nt,WX.fog); PH.beam.rotation.set(0,PHS.yaw,-.1); PH.beam.scale.set(lerp(1,2.2,dk),1,1); PH.beam.material.uniforms.uOp.value=lerp(PHS.on?.16:.06,.34,nt)+.12*WX.fog;   // by day the beam is a faint thing; at night and in fog it reaches out
  /* what the beam falls on: its origin and which way it points, for the light it gives everything */
  V.set(0,0,0).applyMatrix4(PHS.bgW); V2.set(Math.cos(PHS.yaw),0,-Math.sin(PHS.yaw)).transformDirection(PHS.bgW);
  LU.uBmO.value.set(V.x,V.y,V.z,PH?(.35+.65*Math.max(nt,WX.fog)):0); LU.uBmD.value.set(V2.x,V2.y,V2.z,.985);
  /* the boat and the buoy ride the swell; each answers the light the first time it crosses them */
  for(const q of PHS.T){ seaPose(q,t); const lit=Math.abs(angWrap(q.a-PHS.yaw))<.16; if(lit&&!q.lit&&PHS.on){ if(q.kind==='boat') A.ping(392,.03); else A.chime(5,0,.035); } q.lit=lit;
    if(q.g.userData.lan) q.g.userData.lan.material.uniforms.uC.value.setRGB(1,lerp(.62,.86,lit?1:0),lerp(.3,.55,lit?1:0)); }
  /* the lost drone: blinking out over the water; held in the light it locks on, then follows the beam home */
  const L=PHS.lost; if(L){ PHS.st+=dt;
    if(PHS.state==='lost'){ phLocal(L.a,L.r,1.7+Math.sin(t*1.1)*.12,L.pos); const on=PHS.on&&Math.abs(angWrap(L.a-PHS.yaw))<.14;
      PHS.lockT=on?PHS.lockT+dt:Math.max(0,PHS.lockT-dt*2); if(PHS.lockT>.9){ PHS.state='lock'; PHS.st=0; A.lock(0,.05); } L.g.visible=true; }
    else if(PHS.state==='lock'){ phLocal(L.a,L.r,1.7,L.pos); if(PHS.st>.6){ PHS.state='home'; PHS.st=0; L.from.copy(L.pos); } }
    else if(PHS.state==='home'){ const u=sstep(0,1,PHS.st/3.4); L.pos.copy(L.from).lerp(PHS.home,u).addScaledVector(V.copy(PHS.home).normalize(),Math.sin(u*Math.PI)*1.2);
      if(PHS.st>3.4){ PHS.state='gone'; PHS.st=0; L.g.visible=false; A.chord(); } }
    else if(PHS.st>7){ PHS.state='lost'; PHS.st=0; PHS.lockT=0; let a=L.a; for(let i=0;i<20;i++){ a=L.sa[Math.floor(Math.random()*L.sa.length)]; if(Math.abs(angWrap(a-PHS.yaw))>.8) break; } L.a=a; L.r=7.5+Math.random()*3; }
    const up=V.copy(L.pos).normalize(); const M=frameAt(...loc(up),t*.6); M.setPosition(L.pos); M.multiply(Mf.makeScale(1.7,1.7,1.7)); L.g.matrix.copy(M); L.g.matrixWorldNeedsUpdate=true;
    L.g.userData.light.material.uniforms.uC.value.setStyle(PHS.state==='lost'?((t*2)%1<.5?'#ff5a4a':'#5a1a16'):'#7dff9a',T.LinearSRGBColorSpace);
    L.ring.visible=PHS.state==='lock'; if(L.ring.visible){ const s=1+.25*Math.sin(PHS.st*20); L.ring.matrix.copy(M).multiply(Mf.makeScale(s/1.7,s/1.7,s/1.7)); L.ring.matrixAutoUpdate=false; L.ring.matrixWorldNeedsUpdate=true; } }
  steerBtn.hidden=!(PJ.id==='ph'&&!PHS.on&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0); }
/* the camera up behind the lamp, looking out along the beam; handing back to the walking camera smoothly */
function steerCam(dt){ PHS.k=damp(PHS.k,PHS.on?1:0,PHS.on?3:4,dt); if(PHS.k<.002) return;
  const Lp=V.set(0,0,0).applyMatrix4(PHS.bgW), U=V3.copy(Lp).normalize(), Dh=V2.set(Math.cos(PHS.yaw),0,-Math.sin(PHS.yaw)).transformDirection(PHS.bgW);
  const pk=innerHeight>innerWidth?1.35:1;   // a phone held upright stands further back
  V4.copy(Lp).addScaledVector(Dh,-2.4*pk).addScaledVector(U,3.6*pk); PHS.cp.lerp(V4,PHS.k>.98?1-Math.exp(-6*dt):1); V4.copy(Lp).addScaledVector(Dh,11).addScaledVector(U,-5.5); PHS.cl.lerp(V4,PHS.k>.98?1-Math.exp(-6*dt):1);   // up over the gallery, looking out and down along the beam
  st.camP.lerp(PHS.cp,PHS.k); st.camL.lerp(PHS.cl,PHS.k); stUp.lerp(U,PHS.k).normalize(); stCam.up.copy(stUp); UPU.value.copy(stUp); if(PHS.k>.5) LU.uPly.value.copy(st.camP); S.stSnap=true; }
/* ---------- postcards ----------
   The camera in the corner frames whatever you are looking at; take it and it comes out as a postcard: your view inside a
   paper border, "Greetings from Earth", a stamp for the landmark you are by, and a postmark with the moment it was taken,
   the time and the weather as they are here. Save it, or on a phone share it straight on. The picture is taken from the
   frame the page has just drawn, so nothing on top of the world (labels, buttons) is in it. */
const PC={on:false,grab:false,busy:false,url:null,last:null,frame:null};
const pcBtn=$('#crPost',el), pcUI=$('#crFrame',el), pcCard=$('#crCard',el), pcImg=$('#crCardImg',el), pcSave=$('#crCardSave',el), pcShare=$('#crCardShare',el);
const PC_NAME={kr:'KRÍOS',ae:'AETOS',ph:'PHAROS',og:'OGIVE',be:'HELORIA LABS',cafe:'CAFÉ'};
function pcOpen(on){ if(on===PC.on) return; PC.on=on; pcUI.hidden=!on; el.classList.toggle('post',on); document.documentElement.classList.toggle('crpost',on); A.click(); if(on) closeTalk(); }
pcBtn.addEventListener('click',e=>{ e.stopPropagation(); pcOpen(!PC.on); });
$('#crFrameCancel',el).addEventListener('click',e=>{ e.stopPropagation(); pcOpen(false); });
$('#crFrameTake',el).addEventListener('click',e=>{ e.stopPropagation(); pcTake(); });
$('#crCardAgain',el).addEventListener('click',e=>{ e.stopPropagation(); pcCard.hidden=true; pcOpen(true); });
$('#crCardClose',el).addEventListener('click',e=>{ e.stopPropagation(); pcCard.hidden=true; });
pcCard.addEventListener('click',e=>{ if(e.target===pcCard) pcCard.hidden=true; });   // a click on the dimmed world puts the card away
[pcUI,pcCard].forEach(n=>['pointerdown','pointerup','click'].forEach(ev=>n.addEventListener(ev,e=>{ if(e.target.closest('button,a')) e.stopPropagation(); })));
/* the shutter: ask for the next frame the page draws to the screen, and copy it the moment it is drawn */
function pcTake(){ if(PC.busy) return; PC.busy=true; PC.grab=true; PC.frame=$('.crframe-w',el).getBoundingClientRect(); A.click(); A.pebble(0); }
{ const R0=renderer.render.bind(renderer); renderer.render=function(s,c){ R0(s,c); if(PC.grab&&renderer.getRenderTarget()===null){ PC.grab=false; pcSnap(); } }; }
function pcSnap(){ const src=renderer.domElement, k=src.width/innerWidth, f=PC.frame, shot=document.createElement('canvas');
  shot.width=Math.round(f.width*k); shot.height=Math.round(f.height*k); shot.getContext('2d').drawImage(src,f.left*k,f.top*k,f.width*k,f.height*k,0,0,shot.width,shot.height);
  const fl=$('.crflash',el); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  pcOpen(false); pcCompose(shot); }
/* where, when and what the weather is, for the stamp and the postmark */
function pcWhere(){ const P=player; let best='earth', bd=1.7; for(const id in INST){ const q=INST[id], d=Math.hypot(P.x-q.x,P.z-q.z)/q.r; if(d<bd){ bd=d; best=id; } } return best; }
function pcWhen(){ const now=new Date(), M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'], m=+SKY.md.slice(0,2), d=+SKY.md.slice(3);
  const hh=Math.floor(SKY.h), mm=Math.floor((SKY.h-hh)*60);
  const wx=WX.snow&&WX.rain>.3?'SNOW':WX.rain>.3?'RAIN':WX.fog>.5?'SEA FOG':WX.bow>.3?'RAINBOW':SKY.night>.5?'CLEAR NIGHT':SKY.dusk>.5?(SKY.h<12?'SUNRISE':'SUNSET'):'CLEAR';
  return {date:d+' '+M[m-1]+' '+now.getFullYear(),time:String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'),wx}; }
const PC_INK='#2a241d', PC_PAPER='#fbf6ec', PC_OR='#ef8a3c';
/* a small drawing for each landmark's stamp */
function pcGlyph(g,id,x,y,s){ g.save(); g.translate(x,y); g.scale(s,s); g.lineWidth=3/s*s; g.lineJoin=g.lineCap='round'; g.strokeStyle=PC_INK; g.fillStyle=PC_INK;
  const L=(...p)=>{ g.beginPath(); g.moveTo(p[0],p[1]); for(let i=2;i<p.length;i+=2) g.lineTo(p[i],p[i+1]); };
  if(id==='ph'){ L(-14,40,-9,-22,9,-22,14,40); g.closePath(); g.fillStyle='#f4efe6'; g.fill(); g.stroke(); g.fillStyle='#cf4a36'; [[-12,22,24,10],[-11,0,22,9]].forEach(r=>g.fillRect(...r)); g.fillStyle=PC_INK; g.fillRect(-12,-34,24,12); L(-14,-34,0,-46,14,-34); g.closePath(); g.fillStyle='#cf4a36'; g.fill(); g.stroke();
    g.strokeStyle=PC_OR; L(14,-28,46,-40); g.stroke(); L(14,-28,46,-16); g.stroke(); }
  else if(id==='ae'){ g.beginPath(); g.arc(0,-6,30,Math.PI*.15,Math.PI*1.05); g.stroke(); L(0,-6,10,14,0,40); g.stroke(); L(-16,40,16,40); g.stroke(); [[30,-36],[-34,-30]].forEach(([a,b])=>{ L(a-7,b,a+7,b); g.stroke(); g.beginPath(); g.arc(a,b+4,2.5,0,TAU); g.fill(); }); }
  else if(id==='og'){ L(0,-44,12,-18,12,26,-12,26,-12,-18); g.closePath(); g.fillStyle='#f4f0e8'; g.fill(); g.stroke(); g.fillStyle=PC_OR; L(-12,12,-24,34,-12,30); g.closePath(); g.fill(); g.stroke(); L(12,12,24,34,12,30); g.closePath(); g.fill(); g.stroke(); g.strokeStyle=PC_OR; L(-5,32,0,46,5,32); g.stroke(); }
  else if(id==='kr'){ for(let i=0;i<5;i++){ const h=[10,26,40,26,14][i]; L(-24+i*12,-h/2,-24+i*12,h/2); g.stroke(); } g.beginPath(); g.arc(0,0,40,0,TAU); g.stroke(); }
  else if(id==='be'){ L(0,40,0,-20); g.stroke(); L(-14,40,0,-6,14,40); g.stroke(); [14,24,34].forEach(r=>{ g.beginPath(); g.arc(0,-24,r,-Math.PI*.8,-Math.PI*.2); g.stroke(); }); }
  else if(id==='cafe'){ L(-20,-4,-16,30,16,30,20,-4); g.closePath(); g.fillStyle='#f4efe6'; g.fill(); g.stroke(); g.beginPath(); g.arc(24,10,8,-Math.PI/2,Math.PI/2); g.stroke(); [-8,2,12].forEach(x=>{ g.beginPath(); g.moveTo(x,-12); g.bezierCurveTo(x-6,-20,x+6,-26,x,-34); g.stroke(); }); }
  else { g.beginPath(); g.arc(0,0,22,0,TAU); g.fillStyle='#8fc7c0'; g.fill(); g.stroke(); g.beginPath(); g.ellipse(0,0,40,11,-.3,0,TAU); g.stroke(); }
  g.restore(); }
function pcCompose(shot){ const port=shot.height>shot.width, W=port?1200:1800, H=port?1500:1200, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
  g.fillStyle=PC_PAPER; g.fillRect(0,0,W,H);
  for(let i=0;i<2600;i++){ g.fillStyle=`rgba(42,36,29,${Math.random()*.035})`; g.fillRect(Math.random()*W,Math.random()*H,1.5,1.5); }   // the paper's grain
  const m=port?48:56, pw=W-2*m, ph=H-2*m; g.drawImage(shot,0,0,shot.width,shot.height,m,m,pw,ph); g.lineWidth=3; g.strokeStyle=PC_INK; g.strokeRect(m,m,pw,ph);
  const where=pcWhere(), when=pcWhen(); PC.last={where,...when,w:W,h:H};
  /* the caption, on a paper label over the picture */
  const disp=getComputedStyle(document.documentElement).getPropertyValue('--disp').trim()||'Doto, monospace', mono='ui-monospace, Menlo, monospace';
  g.font=`900 ${port?64:72}px ${disp}`; const t1='Greetings from Earth', tw=g.measureText(t1).width, lx=m+34, ly=H-m-34, lh=port?150:160;
  g.fillStyle=PC_PAPER; g.fillRect(lx,ly-lh,tw+56,lh); g.lineWidth=3; g.strokeRect(lx,ly-lh,tw+56,lh); g.fillStyle='rgba(42,36,29,.9)'; g.fillRect(lx+8,ly,tw+56,8); g.fillRect(lx+tw+56,ly-lh+8,8,lh);
  g.fillStyle=PC_INK; g.textBaseline='alphabetic'; g.fillText(t1,lx+28,ly-lh*.42); g.font=`600 ${port?24:26}px ${mono}`; g.fillStyle='#6f6355'; g.fillText('HELORIALABS.COM',lx+30,ly-lh*.14);
  /* the stamp: perforated, the landmark drawn on it, its name */
  const sw=port?190:210, sh=port?230:250, sx=W-m-34-sw, sy=m+34;
  g.save(); g.fillStyle='#fffdf7'; g.beginPath(); const pr=7; for(let x=sx;x<=sx+sw;x+=pr*2.2){ g.moveTo(x,sy); g.arc(x,sy,pr,0,TAU); g.moveTo(x,sy+sh); g.arc(x,sy+sh,pr,0,TAU); } for(let y=sy;y<=sy+sh;y+=pr*2.2){ g.moveTo(sx,y); g.arc(sx,y,pr,0,TAU); g.moveTo(sx+sw,y); g.arc(sx+sw,y,pr,0,TAU); }
  g.rect(sx,sy,sw,sh); g.shadowColor='rgba(0,0,0,.25)'; g.shadowBlur=10; g.shadowOffsetY=3; g.fill(); g.restore();
  g.fillStyle='#e9e2d4'; g.fillRect(sx+16,sy+16,sw-32,sh-80); pcGlyph(g,where,sx+sw/2,sy+16+(sh-80)/2,port?1.25:1.4);
  g.fillStyle=PC_INK; g.font=`600 ${port?20:22}px ${mono}`; g.textAlign='center'; g.fillText(PC_NAME[where]||'EARTH',sx+sw/2,sy+sh-36); g.font=`600 16px ${mono}`; g.fillStyle='#6f6355'; g.fillText('HELORIA POST',sx+sw/2,sy+sh-16);
  /* the postmark: a ring of ink over the stamp's corner, the place and date round the top, the time and weather round the bottom, wavy lines off to the side */
  const cx=sx-10, cy=sy+sh*.58, r=port?92:104; g.save(); g.globalAlpha=.78; g.strokeStyle='#3b3a52'; g.fillStyle='#3b3a52'; g.lineWidth=4;
  g.beginPath(); g.arc(cx,cy,r,0,TAU); g.stroke(); g.lineWidth=2; g.beginPath(); g.arc(cx,cy,r-34,0,TAU); g.stroke();
  const arcText=(txt,rad,top)=>{ g.font=`700 ${port?17:19}px ${mono}`; g.textAlign='center'; const span=txt.length*.115; for(let i=0;i<txt.length;i++){ const a=(top?-Math.PI/2:Math.PI/2)+(top?1:-1)*(i-(txt.length-1)/2)*span/txt.length*1.9;
    g.save(); g.translate(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad); g.rotate(a+(top?Math.PI/2:-Math.PI/2)); g.fillText(txt[i],0,top?0:12); g.restore(); } };
  arcText('EARTH · '+when.date,r-22,true); arcText(when.time+' · '+when.wx,r-22,false);
  g.font=`800 ${port?30:34}px ${mono}`; g.textAlign='center'; g.fillText(when.time,cx,cy+11);
  g.lineWidth=3; for(let k=0;k<4;k++){ g.beginPath(); for(let x=0;x<=(port?150:210);x+=6){ const px=cx-r-14-x, py=cy-30+k*20+Math.sin(x/16)*6; x?g.lineTo(px,py):g.moveTo(px,py); } g.stroke(); }
  g.restore();
  cv.toBlob(b=>{ if(!b){ PC.busy=false; return; } if(PC.url) URL.revokeObjectURL(PC.url); PC.url=URL.createObjectURL(b); PC.blob=b; pcImg.src=PC.url; pcSave.href=PC.url;
    pcSave.download='heloria-postcard-'+when.date.replace(/ /g,'-').toLowerCase()+'.jpg';
    pcShare.hidden=!(navigator.canShare&&navigator.canShare({files:[new File([b],'heloria-postcard.jpg',{type:'image/jpeg'})]}));
    pcCard.hidden=false; PC.busy=false; A.chime(7,0,.03); },'image/jpeg',.92); }
pcShare.addEventListener('click',async e=>{ e.stopPropagation(); if(!PC.blob) return; try{ await navigator.share({files:[new File([PC.blob],'heloria-postcard.jpg',{type:'image/jpeg'})],title:'A postcard from Heloria',text:'Greetings from Earth. helorialabs.com'}); }catch(err){} });
/* the camera button is there while you are out walking, not in the middle of a conversation, a landing or the launch */
function pcUpdate(){ const ok=started&&!CUT.on&&!FIN.on&&!TALK.p&&!PHS.on&&pcCard.hidden; pcBtn.hidden=!(ok||PC.on); if(PC.on&&(CUT.on||FIN.on)) pcOpen(false); }
/* ---------- inside the café ----------
   The café is a room you can go into. Walk up to its door (or tap the café, or Go in for a coffee by it): the door swings
   open, the camera comes down behind you to eye height and through the doorway, and you are standing at the counter.
   Inside there is a counter, an espresso machine and its grinder, cups on the back bar, a few tables and stools, lamps
   over the bar, and the menu on a chalkboard. Behind the counter is the barista, who waves when you come in and wipes the
   counter while nobody is ordering. Order a drink (on the board or from the menu) and they say it back, take a cup, grind,
   tamp, pull the shot, steam the milk and set it down in front of you on its saucer. Each drink has its sign drawn in the
   foam. Look into the cup and the camera sinks into it, the foam swirls over the screen, and in the foam is where the
   drink leads, as a real link (a browser lets a page open a link only inside the visitor's own click). Then you rise back
   out of the cup, still in the café. Leave by the door, the Leave button or Escape.
   The room has its own warm light (lamps over the bar, and by day the sun through the windows), and the town's music is
   a little quieter in here. */
/* the menu: each drink, what it is for, its sign in the foam, and where it takes you. The links are all here */
const cafeMail=(s,b)=>'mailto:contact@helorialabs.com?subject='+encodeURIComponent(s)+'&body='+encodeURIComponent(b);
const MENU=[
  {name:'Founders\' Flat White',what:'A coffee chat with the three of us',art:'heart',go:'Book the chat',head:'A coffee chat',
    href:cafeMail('Booking a coffee chat','Hi Ahroon, Michael and Abraham,\n\nI would like a coffee chat about:\n\nA few times that suit me:\n'),
    text:'Pull up a stool with Ahroon, Michael and Abraham. Tell us what you are working on and we will find a time.'},
  {name:'Kríos Cortado',what:'Book a Kríos demo',art:'krios',go:'See Kríos',head:'A Kríos demo',href:'https://krios.ie',
    text:'Voice practice for sales teams: rehearse the call out loud and a buyer answers back. Book a demo on krios.ie.'},
  {name:'New Hire Americano',what:'Join the team',art:'rocket',go:'Write to us',head:'Join the team',
    href:cafeMail('Joining Heloria Labs','Hi Ahroon, Michael and Abraham,\n\nI would like to join Heloria Labs. A little about me:\n\nWhat I would love to build:\n'),
    text:'Three builders with more hard problems than hands. Tell us who you are and what you want to build.'}];
/* the barista: everything about how they look is here (the same builder as the three of us, see figure; apron and ties are
   the café's own), and how their voice sounds. Not one of us: they have no name tag, no conversation, and they stay behind the counter */
const BARISTA={shirt:'#f3efe6',short:true,pants:'#3b3f4a',shoes:'#2e2b29',sole:'#d8d1c4',skin:'#c48a63',hair:'short',hairC:'#3a2a1e',
  head:[.15,.172,.158,.14,.024],face:{bw:.012,arch:.009},mouth:'smile',cheeks:true,build:1,apron:'#2f5a4a',ties:'#efe7da',cloth:'#9fc3d6',pitch:540};
/* st: out, go (walking to the door), enter, in, exit. ph, once in: menu, brew, served, dive, card, rise */
const CAFE={st:'out',on:false,k:0,M:null,Mi:null,x:3,z:-13.4,w:4,d:2.8,h:2.95,ph:'menu',t:0,pt:0,dr:0,yaw:0,pitch:.1,lean:0,dragT:9,drag:null,hov:-1,kb:false,go:0,cur:false,
  cp:new T.Vector3(),cl:new T.Vector3(),cu:new T.Vector3(0,1,0),up:new T.Vector3(),pl:new T.Vector3(),curve:null,lcurve:null,y0:0,p0:0,
  fig:[0,0],fh:0,fph:0,fstep:0,door:0,doorV:0,doorT:0,bell:0,bellV:0,dv:0,sw:0,swT:0,card:0,d0p:new T.Vector3(),d0l:new T.Vector3(),d0u:new T.Vector3(),
  cup:{at:'stack',p:new T.Vector3(),from:new T.Vector3(),k:1,fill:0,art:0,drain:0},
  /* the barista: where they stand and which way they face (0 to you, PI to the back bar), where they are walking from and to,
     each arm's pose, and the wave, nod and voice */
  bar:{x:.3,z:-.74,yaw:0,fx:.3,fz:-.74,sp:0,ph:0,step:0,R:'wipe',L:'rest',arm:[[0,0,-.12],[0,0,-.12]],wave:0,nod:0,blink:2,say:0,cloth:1,fig:null},
  beats:[],beat:0,bt:0,shake:0,steam:0,wisp:0,g:null,meshes:[],m:{},warm:true};
const CFL=.22, CEY=1.15, CDW=.8, CDT=1.84, CWIN=[1.13,1.69];   // the floor (the plinth's top), eye height over it, the door's width and head, the windows' sill and head
/* where things are, in the café's own frame (x across, y up, z out to the street): the cups on the back bar, the machine's drip
   tray, the steam wand's tip, the spout, the place on the counter where your cup is set down, the grinder, the door's bell;
   and where the barista stands to do each thing (their right hand reaches the cups, the tray and your place, the left the
   grinder and the wand) */
const CP={stack:[.45,.94,-1.06],brew:[-.38,.97,-.93],steam:[-.85,1.0,-.95],spout:[-.38,1.115,-.93],serve:[0,1.005,-.24],grind:[-1.08,.94,-1.1],bell:[.3,1.98,1.24]};
const BP={home:[.22,-.74],stack:[.25,-.72],machine:[-.58,-.7],grind:[-.88,-.7],serve:[.2,-.6]};
const cV=new T.Vector3(), cV2=new T.Vector3(), cV3=new T.Vector3(), cV4=new T.Vector3(), cM=new T.Matrix4(), cM2=new T.Matrix4(), cI=new T.Matrix4(), cRay=new T.Raycaster(), cNdc=new T.Vector2();
const cw=(x,y,z,o=new T.Vector3())=>o.set(x,y,z).applyMatrix4(CAFE.M);
const cdir=(x,y,z,o=new T.Vector3())=>o.set(x,y,z).transformDirection(CAFE.M);
const clocal=(w,o=new T.Vector3())=>o.copy(w).applyMatrix4(CAFE.Mi);
const cxz=(x,z)=>loc(cw(x,0,z,cV4).normalize());   // a point in the café's frame, on the town's map
const cport=()=>innerHeight>innerWidth;
const sag=(x,z)=>(x*x+z*z)/(2*R);   // how far the ground curves away below the café's flat frame, this far from its middle

/* a wall along x (at z=off) or along z (at x=off), L long and t thick, from y0 to y1, with openings [middle, width, sill, head] */
function slab(M,c,ax,off,L,t,y0,y1,holes){ const b=(u0,u1,a,z)=>{ if(u1-u0<1e-3||z-a<1e-3) return; if(ax==='x') box(M,c,(u0+u1)/2,a,off,u1-u0,z-a,t); else box(M,c,off,a,(u0+u1)/2,t,z-a,u1-u0); };
  let u=-L/2; for(const [m,w,a,z] of holes.slice().sort((p,q)=>p[0]-q[0])){ b(u,m-w/2,y0,y1); b(m-w/2,m+w/2,y0,Math.max(y0,a)); b(m-w/2,m+w/2,Math.min(y1,z),y1); u=m+w/2; } b(u,L/2,y0,y1); }
/* the café's own house: like every other (see house), but its walls are walls, with a real door and real windows */
function cafeHouse(x,z,yaw,o){ const M=frameAt(x,z,yaw), w=o.w, d=o.d, h=o.h, tr=o.trim||'#f6f1e7', t=.08, rh=o.rh||1.3;
  Object.assign(CAFE,{M,Mi:M.clone().invert(),x,z,w,d,h}); HOUSES.push({M,w,d,h,dx:0,flat:false});
  box(M,'#a49b8f',0,0,0,w+.18,.22,d+.18);
  const front=[[0,CDW,.2,CDT],[-1.25,.58,...CWIN],[1.25,.58,...CWIN]], end=[[0,.58,...CWIN]];
  slab(M,o.wall,'x',d/2-t/2,w,t,.2,h,front); slab(M,o.wall,'x',-d/2+t/2,w,t,.2,h,[]); slab(M,o.wall,'z',w/2-t/2,d-2*t,t,.2,h,end); slab(M,o.wall,'z',-w/2+t/2,d-2*t,t,.2,h,end);
  put(M,'prism',o.roof,0,h,0,d+.62,rh,w+.5,Math.PI/2); box(M,tr,0,h-.12,d/2+.04,w+.1,.12,.05); box(M,tr,0,h-.12,-d/2-.04,w+.1,.12,.05); box(M,'#b07a5e',w*.28,h+.25,-d*.16,.34,rh*.95,.34);
  /* the windows' frames, as windowAt draws them but open in the middle (the glass is its own: see buildCafe) */
  const win=W=>{ box(W,tr,-.335,-.36,.02,.09,.72,.06); box(W,tr,.335,-.36,.02,.09,.72,.06); box(W,tr,0,.27,.02,.76,.09,.06); box(W,tr,0,-.36,.02,.76,.07,.06);
    box(W,tr,0,-.29,.05,.04,.56,.04); box(W,tr,0,-.03,.05,.58,.04,.04); box(W,tr,0,-.42,.06,.88,.06,.16); };
  [-1.25,1.25].forEach(wx=>win(sub(M,wx,1.42,d/2))); win(sub(M,w/2,1.42,0,Math.PI/2)); win(sub(M,-w/2,1.42,0,-Math.PI/2));
  /* the door's frame and its step (the door itself swings: see buildCafe) */
  [-1,1].forEach(s=>box(M,tr,s*(CDW/2+.045),.2,d/2+.02,.09,CDT-.2+.09,.06)); box(M,tr,0,CDT,d/2+.02,CDW+.18,.09,.06); box(M,'#bdb6aa',0,0,d/2+.32,1.04,.16,.56);
  if(o.extra) o.extra(M,w,d,h); obsRect(x,z,yaw,w+.25,d+.25,h+rh+.3); return M; }

/* ---------- the café's light: its own, warm. The lamps over the bar (uCL: where each is, how bright), a little more from
   above, and by day the sun where it comes in at the windows and the door (the sun's shadow map already knows where the
   walls are). Everything in here is inked like the town, but cut away only right at the lens, so the counter in front of
   you and the cup you look into stay whole ---------- */
const CU={uCL:{value:[0,1,2,3].map(()=>new T.Vector4())},uCU:{value:new T.Vector3(0,1,0)},uNr:{value:.12},uDim:{value:1}}, CDIN={value:0};
const CDITH=`float cdith(){ return fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))); }`;
const CAFE_L=`uniform vec4 uCL[4]; uniform vec3 uCU; uniform float uNr,uDim; ${CDITH}
  void cnear(vec3 w){ if(smoothstep(uNr*.4,uNr,distance(cameraPosition,w))<cdith()) discard; }
  vec3 cafe(vec3 base,vec3 n,vec3 w){ float l=0.;
    for(int i=0;i<4;i++){ vec3 d=uCL[i].xyz-w; float r=length(d); l+=uCL[i].w*(.35+.65*max(dot(n,d/max(r,1e-3)),0.))/(1.+r*r*1.1); }
    /* by day the windows fill the room; at night it is the lamps alone, so the corners go dark and warm and their pools of light hotter */
    float nt=uNight, f=l+.14*dot(n,uCU)+.2*(1.-nt), e=.3*nt, k=smoothstep(.44+e,.5+e,f), hi=smoothstep(.9+e*.5,.96+e*.5,f);
    vec3 c=mix(base*mix(vec3(.62,.52,.47),vec3(.36,.26,.23),nt),mix(base*mix(vec3(.95,.86,.73),vec3(.86,.66,.46),nt),base*mix(vec3(1.06,.99,.87),vec3(1.16,.94,.66),nt),hi),k);
    float sd=dot(n,uSun); if(sd>0.){ float sh=shadowAt(w,.0006+.0024*(1.-sd)); c+=base*uLitA*smoothstep(.35,.65,sh)*smoothstep(0.,.12,sd)*.45*clamp((uLitA.g-uShdC.g)*2.4,0.,1.); }
    return c*uDim; }`;
/* a bulb (the colour of the street lamps' glass) shines by itself; uIn mixes in the town's own light, for the door, which is outside as much as in */
const CAFE_F=`uniform vec3 uC; uniform float uIn; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${CAFE_L}
  void main(){ cnear(vW); vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 b=uC*vC;
    if(distance(vC,vec3(1.,.949,.769))<.012){ gl_FragColor=vec4(1.,.93,.74,1.); return; }
    vec3 c=cafe(b,n,vW); if(uIn<.999) c=mix(toon(b,n,vW),c,uIn); gl_FragColor=vec4(c,1.); }`;
const cafeMat=(o={})=>new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3(o.c||'#ffffff')},uIn:o.uIn||{value:1}},LU,CU),vertexShader:TOON_V(),fragmentShader:CAFE_F,vertexColors:o.vc!==false,side:T.DoubleSide});
const CINK=new T.ShaderMaterial({uniforms:CU,vertexShader:TOON_V(),side:T.DoubleSide,
  fragmentShader:`uniform float uNr; varying vec3 vN; varying vec3 vW; ${CDITH}
    void main(){ if(smoothstep(uNr*.4,uNr,distance(cameraPosition,vW))<cdith()) discard; vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(n*.5+.5,1./(1.+distance(cameraPosition,vW))); }`});
/* the menu on the board, in chalk, half lit by the room and half by itself so it always reads */
const BOARD_F=`uniform sampler2D uMap; varying vec3 vN; varying vec3 vW; varying vec3 vC; varying vec2 vUv; ${LIGHT} ${CAFE_L}
  void main(){ cnear(vW); vec3 t=texture2D(uMap,vUv).rgb; gl_FragColor=vec4(mix(cafe(t,normalize(vN),vW),t,.45),1.); }`;
/* the coffee: dark while the shot runs in, then crema, then the drink's sign in the milk, spreading out from the middle. uSw
   twists it round, most in the middle, for the dive into the cup */
const FOAM_F=`uniform sampler2D uMap; uniform float uSw,uArt,uFill,uTime; varying vec3 vN; varying vec3 vW; varying vec3 vC; varying vec2 vUv; ${LIGHT} ${CAFE_L}
  void main(){ cnear(vW); vec2 p=vUv-.5; float r=length(p)*2., a=atan(p.y,p.x+1e-5);
    a+=uSw*(2.4*(1.-r)*(1.-r)+.35)*3.+uSw*uTime*.45;
    vec3 art=texture2D(uMap,vec2(cos(a),sin(a))*r*.5+.5).rgb;
    vec3 crema=mix(vec3(.74,.5,.3),vec3(.46,.27,.15),smoothstep(.3,1.,r)), c=mix(vec3(.21,.12,.07),crema,smoothstep(.2,.9,uFill));
    c=mix(c,art,smoothstep(uArt*1.45,uArt*1.45-.3,r));
    gl_FragColor=vec4(mix(cafe(c,normalize(vN),vW),c,.35+.65*clamp(uSw,0.,1.)),1.); }`;
/* glass: a faint tint and a glint, drawn with the colour only (it has no ink, so what is behind it keeps its lines) */
const CGLASS=new T.ShaderMaterial({uniforms:{uNight:LU.uNight},transparent:true,depthWrite:false,side:T.DoubleSide,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform float uNight; varying vec2 vUv; void main(){ float g=fract((vUv.x+vUv.y)*.9+.15), s=step(abs(g-.5),.06)+step(abs(g-.3),.02);
    gl_FragColor=vec4(mix(vec3(.74,.88,.92),vec3(.42,.52,.68),uNight),.13+.22*s*(1.-.6*uNight)); }`});
const STEAM_F=`uniform float uA; varying vec3 vN; varying vec3 vW; void main(){ float f=abs(dot(normalize(vN),normalize(cameraPosition-vW))); gl_FragColor=vec4(.98,.97,.95,uA*f*f*.6); }`;

/* ---------- the drink's sign, drawn in the milk on a canvas: a heart, the K of Kríos with its voice, a small rocket ---------- */
function cafeArt(cv,kind){ const c=cv.getContext('2d'), S=cv.width, m=S/2, F='#f8f1e6';
  const g=c.createRadialGradient(m,m,0,m,m,m); g.addColorStop(0,'#c58d5c'); g.addColorStop(.62,'#a9693d'); g.addColorStop(1,'#6e4024'); c.fillStyle=g; c.fillRect(0,0,S,S);
  c.save(); c.fillStyle=c.strokeStyle=F; c.shadowColor=F; c.shadowBlur=S*.014; c.lineCap=c.lineJoin='round';
  c.lineWidth=S*.03; c.globalAlpha=.5; c.beginPath(); c.arc(m,m,S*.45,0,TAU); c.stroke(); c.globalAlpha=1;   // the white edge of the foam
  if(kind==='heart'){ const s=S*.44, y=m+S*.02; c.beginPath(); c.moveTo(m,y+s*.42); c.bezierCurveTo(m-s*.98,y-s*.1,m-s*.42,y-s*.8,m,y-s*.27); c.bezierCurveTo(m+s*.42,y-s*.8,m+s*.98,y-s*.1,m,y+s*.42); c.fill();
    c.shadowBlur=0; c.strokeStyle='#b47848'; c.lineWidth=S*.011; c.beginPath(); c.moveTo(m,y-s*.2); c.quadraticCurveTo(m+S*.012,y,m,y+s*.5); c.stroke(); }   // the line the pour draws through it
  else if(kind==='krios'){ c.lineWidth=S*.085; c.beginPath(); c.moveTo(m-S*.16,m-S*.21); c.lineTo(m-S*.16,m+S*.21); c.moveTo(m+S*.1,m-S*.21); c.lineTo(m-S*.13,m+S*.01); c.lineTo(m+S*.11,m+S*.21); c.stroke();
    c.lineWidth=S*.032; [.2,.29].forEach((r,i)=>{ c.globalAlpha=1-i*.3; c.beginPath(); c.arc(m+S*.06,m,S*r,-.55,.55); c.stroke(); }); c.globalAlpha=1; }   // and its voice going out
  else { const y=m-S*.02; c.beginPath(); c.moveTo(m,y-S*.28); c.bezierCurveTo(m+S*.12,y-S*.15,m+S*.11,y+S*.08,m+S*.075,y+S*.15); c.lineTo(m-S*.075,y+S*.15); c.bezierCurveTo(m-S*.11,y+S*.08,m-S*.12,y-S*.15,m,y-S*.28); c.fill();
    [-1,1].forEach(s=>{ c.beginPath(); c.moveTo(m+s*S*.07,y+S*.02); c.lineTo(m+s*S*.17,y+S*.17); c.lineTo(m+s*S*.06,y+S*.15); c.fill(); });
    [[0,.24,.055],[-.045,.3,.035],[.045,.31,.032]].forEach(([dx,dy,r])=>{ c.beginPath(); c.arc(m+S*dx,y+S*dy,S*r,0,TAU); c.fill(); });   // the flame, in puffs of milk
    c.shadowBlur=0; c.fillStyle='#a9693d'; c.beginPath(); c.arc(m,y-S*.06,S*.035,0,TAU); c.fill(); }   // its window
  c.restore(); }
/* the menu board, in chalk. hov: the drink the pointer is on (ringed); mark: the one being made or served (ticked) */
function cafeBoard(cv,hov,mark){ const c=cv.getContext('2d'), W=cv.width, H=cv.height, ch='#f1ede2', r=seeded(5);
  c.fillStyle='#2f3d36'; c.fillRect(0,0,W,H); c.fillStyle='rgba(240,236,226,.035)'; for(let i=0;i<150;i++){ c.beginPath(); c.ellipse(r()*W,r()*H,10+r()*60,4+r()*14,r()*3,0,TAU); c.fill(); }   // old chalk, rubbed out
  c.fillStyle=c.strokeStyle=ch; c.lineCap=c.lineJoin='round'; c.textBaseline='middle';
  const fit=(t,f,max,wt=900)=>{ c.font=`${wt} ${f}px Doto, monospace`; const w=c.measureText(t).width; if(w>max){ f*=max/w; c.font=`${wt} ${f}px Doto, monospace`; } return f; };
  c.textAlign='center'; fit('MENU',H*.13,W*.5); c.fillText('MENU',W/2,H*.12); c.lineWidth=4; c.beginPath(); c.moveTo(W*.39,H*.21); c.quadraticCurveTo(W*.5,H*.225,W*.61,H*.205); c.stroke();
  c.textAlign='left';
  MENU.forEach((d,i)=>{ const y=H*(.37+i*.215), ix=W*.1, s=H*.055; c.lineWidth=5;
    if(d.art==='heart'){ c.beginPath(); c.moveTo(ix,y+s*.8); c.bezierCurveTo(ix-s*1.6,y-s*.2,ix-s*.6,y-s*1.3,ix,y-s*.45); c.bezierCurveTo(ix+s*.6,y-s*1.3,ix+s*1.6,y-s*.2,ix,y+s*.8); c.stroke(); }
    else if(d.art==='krios'){ c.beginPath(); c.moveTo(ix-s*.5,y-s); c.lineTo(ix-s*.5,y+s); c.moveTo(ix+s*.6,y-s); c.lineTo(ix-s*.35,y); c.lineTo(ix+s*.6,y+s); c.stroke(); }
    else { c.beginPath(); c.moveTo(ix,y-s*1.1); c.quadraticCurveTo(ix+s*.6,y-s*.3,ix+s*.4,y+s*.6); c.lineTo(ix-s*.4,y+s*.6); c.quadraticCurveTo(ix-s*.6,y-s*.3,ix,y-s*1.1); c.stroke();
      c.beginPath(); c.moveTo(ix-s*.4,y+s*.2); c.lineTo(ix-s*.8,y+s*.9); c.moveTo(ix+s*.4,y+s*.2); c.lineTo(ix+s*.8,y+s*.9); c.moveTo(ix,y+s*.9); c.lineTo(ix,y+s*1.2); c.stroke(); }
    fit(d.name.toUpperCase(),H*.075,W*.72); c.fillText(d.name.toUpperCase(),W*.18,y-H*.03);
    c.globalAlpha=.78; fit(d.what.toLowerCase(),H*.045,W*.72,800); c.fillText(d.what.toLowerCase(),W*.18,y+H*.05); c.globalAlpha=1;
    if(i===hov){ c.lineWidth=3.5; c.beginPath(); c.ellipse(W*.5,y+H*.005,W*.47,H*.095,-.012,0,TAU); c.stroke(); }
    if(i===mark){ c.lineWidth=6; c.beginPath(); c.moveTo(W*.925,y-H*.005); c.lineTo(W*.945,y+H*.035); c.lineTo(W*.975,y-H*.05); c.stroke(); } });
  c.textAlign='center'; c.globalAlpha=.7; fit('made to order, right here',H*.04,W*.6,800); c.fillText('made to order, right here',W/2,H*.95); c.globalAlpha=1; }

/* ---------- building it: the room, its glass, the board, the door and its bell, the grinder, the barista, the cup ---------- */
function kgeo(id){ const k=KITS[id], g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(k.P,3)); g.setAttribute('normal',new T.Float32BufferAttribute(k.N,3)); g.setAttribute('color',new T.Float32BufferAttribute(k.C,3)); k.P.length=k.N.length=k.C.length=0; return g; }
function buildCafe(){ if(!CAFE.M||!CAFE_ON) return; const M=CAFE.M, w=CAFE.w, d=CAFE.d, h=CAFE.h, t=.08, iw=w/2-t, id=d/2-t, F=CFL, top=h-.04, I=cI.identity();
  CAFE.up.copy(cdir(0,1,0)); CU.uCU.value.copy(CAFE.up); CAFE.c0=cw(0,1.4,0);
  const g=CAFE.g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g);
  const add=(m,ink=true)=>{ m.matrixAutoUpdate=false; m.frustumCulled=false; g.add(m); CAFE.meshes.push(m); if(ink){ m.userData.noInk=true; m.userData.col=m.material; m.userData.inkM=CINK; m.userData.shdM=m.material; INK.push(m); } return m; };
  /* the room: tiles, panelling and plaster round the walls (open where the door and the windows are), a planked ceiling */
  kitTo('cafein'); const up=cdir(0,1,0);
  for(let i=0;i<12;i++) for(let j=0;j<9;j++){ const x0=-iw+i*2*iw/12, x1=x0+2*iw/12, z0=-id+j*2*id/9, z1=z0+2*id/9; kquad(cw(x0,F+.004,z0),cw(x1,F+.004,z0),cw(x1,F+.004,z1),cw(x0,F+.004,z1),up,(i+j)%2?'#ecdfc6':'#c98e66'); }
  const fh=[[0,CDW,0,CDT],[-1.25,.58,...CWIN],[1.25,.58,...CWIN]], eh=[[0,.58,...CWIN]], li=(c,y0,y1,th,o=0)=>{
    slab(M,c,'x',id-th/2-o,2*iw,th,y0,y1,fh); slab(M,c,'x',-id+th/2+o,2*iw,th,y0,y1,[]); slab(M,c,'z',iw-th/2-o,2*id-2*(th+o),th,y0,y1,eh); slab(M,c,'z',-iw+th/2+o,2*id-2*(th+o),th,y0,y1,eh); };
  li('#3e5d4f',F,F+.56,.025); li('#f2e3c6',F+.56,top,.025); li('#8a6448',F+.54,F+.6,.05,.01); li('#2f4a3e',F,F+.05,.04,.01);   // panelling, plaster, the rail between them, a skirting board
  box(M,'#d8bb94',0,top,0,2*iw,.04,2*id); for(let k=-3;k<=3;k++) box(M,'#8f6a4c',k*.55,top-.07,0,.07,.07,2*id);
  [-1.25,1.25].forEach(x=>box(M,'#8a6448',x,1.07,id-.06,.72,.04,.12)); [-1,1].forEach(s=>box(M,'#8a6448',s*(iw-.06),1.07,0,.12,.04,.72));   // sills inside
  [-1,1].forEach(s=>box(M,'#8a6448',s*(CDW/2+.035),F,id-.03,.07,CDT-F+.07,.04)); box(M,'#8a6448',0,CDT,id-.03,CDW+.14,.07,.04);   // the door's frame inside
  box(M,'#5b4636',0,F,id-.32,.72,.012,.38);   // a mat at the door
  /* the back bar: cupboards along the back wall with a pale top, the espresso machine on it, cups by it, shelves above */
  box(M,'#6b4a36',0,F,-id+.17,2*iw,.68,.34); for(let k=0;k<6;k++) box(M,'#5a3d2c',-iw+.32+k*(2*iw-.64)/5,F+.08,-id+.345,.5,.5,.012); box(M,'#e8e0d2',0,F+.68,-id+.17,2*iw,.04,.38);
  { const x=-.5, z=-1.12;   // the machine: red, with a chrome top, two group heads with their handles, a drip tray, a gauge, a steam wand
    box(M,'#c8473a',x,.94,z,.6,.42,.28); box(M,'#d9dbd6',x,1.36,z,.63,.035,.31); box(M,'#bfc3c2',x,1.25,-.975,.6,.05,.012);
    [-.62,-.38].forEach(gx=>{ cyl(M,'#bfc3c2',gx,1.17,-.93,.045,.07); cyl(M,'#9fa3a2',gx,1.13,-.93,.05,.04); box(M,'#2c2b2a',gx+.06,1.135,-.86,.025,.025,.13,-.6); cyl(M,'#9fa3a2',gx,1.115,-.93,.012,.015,'cyl8'); });
    box(M,'#9fa3a2',x,.94,-.93,.58,.03,.15); put(M,'cyl','#f4efe6',x,1.3,-.97,.04,.012,.04,0,Math.PI/2); put(M,'cyl','#2a2624',x,1.3,-.975,.044,.008,.044,0,Math.PI/2);
    cyl(M,'#bfc3c2',-.84,1.0,-.96,.008,.28,'cyl8'); put(M,'sph','#2a2624',-.84,1.3,-.96,.02,.02,.02);   // the steam wand, on the left
    for(let k=0;k<4;k++) cyl(M,'#f6f1e8',x-.2+k*.13,1.395,z,.035,.05); }   // cups warming on top
  for(let k=0;k<3;k++){ const x=.62+k*.17; cyl(M,'#f6f1e8',x,.94,-1.06,.085,.01); cyl(M,'#f6f1e8',x,.95,-1.06,.056,.062); cyl(M,'#f6f1e8',x,1.012,-1.06,.085,.01); cyl(M,'#f6f1e8',x,1.022,-1.06,.056,.062); }   // cups on saucers, stacked two high
  cyl(M,'#d7c9b4',-1.4,.94,-1.08,.08,.22); cyl(M,'#5a3826',-1.4,1.16,-1.08,.082,.03); cyl(M,'#7a5a42',-1.65,.94,-1.06,.11,.16); for(let k=0;k<5;k++) put(M,'blob',LEAF[1+(k%3)],-1.65+Math.cos(k*1.3)*.08,1.2+(k%2)*.08,-1.06+Math.sin(k*1.3)*.07,.11,.1,.11);   // a jar of beans, a plant
  [[.85,1.85,1.52],[.85,1.85,1.92],[-1.85,-.85,1.62],[-1.85,-.85,2.02]].forEach(([a,b,y])=>{ box(M,'#8a6448',(a+b)/2,y,-id+.1,b-a,.035,.2); box(M,'#6b4a36',a+.08,y-.12,-id+.03,.03,.12,.05); box(M,'#6b4a36',b-.08,y-.12,-id+.03,.03,.12,.05); });
  [1.0,1.2,1.4,1.6].forEach((x,k)=>{ cyl(M,['#f6f1e8','#ef8a3c','#f6f1e8','#5d7f6a'][k],x,1.555,-1.2,.05,.11); });   // mugs
  [1.05,1.35,1.65].forEach((x,k)=>{ cyl(M,'#dfe9ea',x,1.955,-1.2,.07,.2); cyl(M,['#5a3826','#7a5238','#3e2a1c'][k],x,1.955,-1.2,.062,.12); cyl(M,'#8a6448',x,2.155,-1.2,.074,.025); });   // jars of beans
  [-1.7,-1.45,-1.2,-.98].forEach((x,k)=>{ box(M,'#b8956a',x,1.655,-1.2,.17,.24-(k%2)*.04,.1); box(M,'#ef8a3c',x,1.73-(k%2)*.04,-1.147,.12,.05,.006); });   // bags of coffee
  [-1.6,-1.35,-1.1].forEach((x,k)=>cyl(M,['#cf4a36','#f6f1e8','#3f6fd0'][k],x,2.055,-1.2,.055,.1));
  box(M,'#7a5238',0,1.5,-id+.04,1.42,.9,.05);   // the board's frame
  /* the counter: panelled front, a pale top, a brass foot rail; a cake stand and a jar for tips on it */
  box(M,'#7a5238',0,F,-.23,2.3,.74,.46); for(let k=0;k<23;k++) box(M,k%2?'#835a3f':'#734d35',-1.1+k*.1,F+.05,.005,.1,.62,.012); box(M,'#a8714a',0,F+.74,-.23,2.42,.045,.56); box(M,'#8a5a3a',0,F+.74,.05,2.42,.045,.012);
  box(M,'#c9a24a',0,F+.12,.1,2.2,.025,.025); [-1,0,1].forEach(s=>box(M,'#c9a24a',s*1.05,F,.08,.025,.12,.025));
  cyl(M,'#f4efe6',-.98,1.005,-.36,.03,.05,'cyl8'); cyl(M,'#f4efe6',-.98,1.055,-.36,.11,.01); cyl(M,'#f1c9b0',-.98,1.065,-.36,.075,.055); cyl(M,'#fbf6ec',-.98,1.12,-.36,.075,.012); put(M,'sph','#d84a4a',-.98,1.145,-.36,.014,.014,.014);
  cyl(M,'#dfe9ea',.95,1.005,-.34,.04,.1); cyl(M,'#e7c36a',.95,1.005,-.34,.035,.035);
  /* lamps: three over the bar, a globe over the room */
  [-.8,0,.8].forEach(x=>{ cyl(M,'#2a2624',x,2.22,-.3,.006,top-2.22,'cyl8'); put(M,'cone','#2f4d42',x,2.2,-.3,.13,.12,.13); put(M,'sph','#fff2c4',x,2.135,-.3,.045,.05,.045); });
  cyl(M,'#2a2624',0,2.18,.78,.006,top-2.18,'cyl8'); put(M,'sph','#fff2c4',0,2.12,.78,.075,.075,.075);
  /* stools at the bar, two tables by the front windows with their stools, a vase on each */
  [-.75,.75].forEach(x=>{ cyl(M,'#3b3836',x,F,.32,.12,.02); cyl(M,'#3b3836',x,F,.32,.025,.52,'cyl8'); cyl(M,'#b8834f',x,F+.52,.32,.13,.05); });
  [-1.28,1.28].forEach(x=>{ const z=.82; cyl(M,'#3b3836',x,F,z,.15,.02); cyl(M,'#3b3836',x,F,z,.03,.5,'cyl8'); cyl(M,'#f3ede2',x,F+.5,z,.27,.035);
    [-.43,.43].forEach(s=>{ if(Math.abs(x+s)<1.82) cyl(M,'#b8834f',x+s,F,z,.12,.34,'cyl8'); });
    cyl(M,'#5d7f6a',x+.06,F+.535,z-.05,.025,.08,'cyl8'); put(M,'sph',x<0?'#f19bb0':'#f6d26b',x+.06,F+.64,z-.05,.035,.035,.035); });
  cyl(M,'#f6f1e8',1.2,F+.535,.75,.06,.01); cyl(M,'#f6f1e8',1.2,F+.545,.75,.04,.05);   // somebody's cup
  /* on the walls: the hole as a print (the dark disk and its ring of light), and the bell's bracket over the door */
  box(M,'#2a241d',-iw+.015,1.2,.45,.03,.6,.6); box(M,'#0d0d10',-iw+.03,1.25,.45,.01,.5,.5); put(M,'cyl','#ef8a3c',-iw+.04,1.5,.45,.16,.006,.16,0,0,Math.PI/2); put(M,'cyl','#0d0d10',-iw+.045,1.5,.45,.11,.006,.11,0,0,Math.PI/2);
  box(M,'#c9a24a',CP.bell[0],CP.bell[1],id-.06,.02,.02,.12);
  kitTo(); add(new T.Mesh(kgeo('cafein'),cafeMat()));
  /* the glass in the windows: one mesh, drawn with the colour only */
  { const P=[], U=[], pane=(W,x,y,z,sw,sh)=>{ const q=[[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,-1,0,0],[1,1,1,1],[-1,1,0,1]]; for(const [a,b,u,v] of q){ const p=new T.Vector3(x+a*sw/2,y+b*sh/2,z).applyMatrix4(W); P.push(p.x,p.y,p.z); U.push(u,v); } };
    [-1.25,1.25].forEach(x=>pane(M,x,1.41,d/2-t/2,.58,.56)); [-1,1].forEach(s=>pane(new T.Matrix4().multiplyMatrices(M,new T.Matrix4().makeRotationY(s*Math.PI/2)),0,1.41,w/2-t/2,.58,.56));
    const gg=new T.BufferGeometry(); gg.setAttribute('position',new T.Float32BufferAttribute(P,3)); gg.setAttribute('uv',new T.Float32BufferAttribute(U,2));
    const gm=add(new T.Mesh(gg,CGLASS),false); gm.layers.set(1); gm.renderOrder=4; }
  /* the board */
  { const cv=document.createElement('canvas'); cv.width=1024; cv.height=640; const tx=new T.CanvasTexture(cv); tx.anisotropy=4; CAFE.bcv=cv; CAFE.btx=tx;
    const draw=()=>{ cafeBoard(cv,CAFE.hov,CAFE.ph==='brew'||CAFE.ph==='served'?CAFE.dr:-1); tx.needsUpdate=true; }; CAFE.bdraw=draw; draw(); if(document.fonts&&document.fonts.load) document.fonts.load('900 40px Doto').then(draw).catch(()=>{});
    const b=add(new T.Mesh(new T.PlaneGeometry(1.3,.81),new T.ShaderMaterial({uniforms:Object.assign({uMap:{value:tx}},LU,CU),vertexShader:TOON_V(true),fragmentShader:BOARD_F})));
    b.matrix.copy(sub(M,0,1.95,-id+.07)); b.matrixWorldNeedsUpdate=true; CAFE.m.board=b; }
  /* the door, on its hinge at the left of the opening, with a glass panel; it is lit as the town lights it from outside and
     as the room lights it from in (uIn) */
  { kitTo('cafedoor'); const c='#6e4a3a';
    box(I,c,.4,.2,0,.8,.8,.05); box(I,c,.4,1.68,0,.8,.16,.05); box(I,c,.075,1.0,0,.15,.68,.05); box(I,c,.725,1.0,0,.15,.68,.05); box(I,'#5d3e30',.4,.3,0,.6,.58,.066);
    box(I,'#c9a24a',.4,.21,0,.76,.09,.058); [-1,1].forEach(s=>{ box(I,'#e7c36a',.69,.86,s*.045,.025,.3,.02); box(I,'#e7c36a',.69,.9,s*.032,.02,.02,.03); box(I,'#e7c36a',.69,1.12,s*.032,.02,.02,.03); });
    kitTo(); const dm=add(new T.Mesh(kgeo('cafedoor'),cafeMat({uIn:CDIN}))); CAFE.m.door=dm;
    const gp=new T.Mesh(new T.PlaneGeometry(.5,.68),CGLASS); gp.position.set(.4,1.34,0); gp.layers.set(1); gp.renderOrder=4; dm.add(gp); gp.matrixAutoUpdate=true; }
  { kitTo('cafebell'); put(I,'cone','#d9b45a',0,-.07,0,.035,.055,.035); put(I,'sph','#b8933f',0,-.1,0,.012,.012,.012); cyl(I,'#c9a24a',0,-.045,0,.004,.045,'cyl8'); kitTo(); CAFE.m.bell=add(new T.Mesh(kgeo('cafebell'),cafeMat())); }
  /* the grinder: a hopper of beans on a dark body; it shakes while it grinds */
  { kitTo('cafegr'); box(I,'#3a3634',0,0,0,.17,.22,.19); box(I,'#9fa3a2',0,.09,.1,.05,.04,.04); cyl(I,'#9fa3a2',0,.22,0,.06,.03); put(I,'cone','#e4d8c4',0,.33,0,.085,.18,.085,0,Math.PI); put(I,'cone','#4a2c1b',0,.34,0,.068,.13,.068,0,Math.PI); cyl(I,'#3a3634',0,.42,0,.088,.025);
    kitTo(); CAFE.m.grind=add(new T.Mesh(kgeo('cafegr'),cafeMat())); }
  /* the barista: a person, drawn by the same hand as the three of us (figure, from BARISTA), in an apron tied at the waist and
     round the neck, with a cloth for the counter; lit by the room like everything in it */
  { const B=BARISTA, f=figure(B), d=f.userData, W=B.build||1, ap=part(), up=v3(0,1,0);
    ap.grid(tube([[.34,.172*W,.136,0],[.46,.158*W,.12,0],[.58,.146*W,.108,0]],14,-1.2,1.2),B.apron,false);   // the skirt, over the hips
    ap.grid(tube([[.58,.146*W,.108,0],[.7,.144*W,.106,0],[.8,.16*W,.117,0],[.875,.168*W,.118,0]],12,-.8,.8),B.apron,false);   // the bib
    ap.grid(tube([[.565,.149*W,.111],[.6,.149*W,.111]],22),B.ties,true);   // the tie round the waist, and its bow at the back
    [-1,1].forEach(s=>{ ap.put(FG.sph,B.ties,s*.03,.585,-.112,.03,.018,.012,0,0,s*.5); const a=v3(s*.11,.87,.105), b=v3(s*.06,.99,-.01), L=b.clone().sub(a);
      ap.along(FG.box,B.ties,a.clone().add(b).multiplyScalar(.5),L,v3().crossVectors(L,up).normalize().multiplyScalar(.012),v3().crossVectors(L,v3(1,0,0)).normalize().multiplyScalar(.006)); });   // the straps round the neck
    ap.put(FG.box,tint(B.apron,-.2),.06*W,.62,.118,.08,.07,.01);   // a pocket
    d.body.add(ap.mesh());
    const cl=new T.Mesh(new T.BoxGeometry(.075,.012,.055),cafeMat({c:B.cloth,vc:false})); cl.position.set(0,-.205,.02); d.fore[0].add(cl); CAFE.m.cloth=cl;
    const mat=cafeMat(); f.traverse(o=>{ if(!o.isMesh||o.material===SHM) return; if(o!==cl) o.material=mat; o.frustumCulled=false; o.userData.noInk=true; o.userData.col=o.material; o.userData.inkM=CINK; o.userData.shdM=o.material; INK.push(o); CAFE.meshes.push(o); });
    g.add(f); CAFE.bar.fig=f; }
  /* the cup: a saucer, the cup with an orange band and its handle; the coffee in it is a disc of its own */
  { kitTo('cafecup'); const pc='#f6f1e8', ka=(geo,col,mx)=>kadd(geo.toNonIndexed(),col,mx||I);
    cyl(I,pc,0,0,0,.062,.006); cyl(I,pc,0,.004,0,.088,.008); ka(new T.CylinderGeometry(.056,.04,.062,22,1,true),pc,cM.makeTranslation(0,.043,0)); ka(new T.CylinderGeometry(.052,.036,.058,22,1,true),pc,cM.makeTranslation(0,.045,0));
    cyl(I,pc,0,.012,0,.04,.004); ka(new T.TorusGeometry(.054,.0042,6,26).rotateX(Math.PI/2),pc,cM.makeTranslation(0,.074,0)); ka(new T.CylinderGeometry(.0566,.0538,.013,22,1,true),'#ef8a3c',cM.makeTranslation(0,.056,0));
    ka(new T.TorusGeometry(.02,.0058,6,14,Math.PI*1.25).rotateZ(-Math.PI*.62),pc,cM.makeTranslation(.064,.046,0));
    kitTo(); CAFE.m.cup=add(new T.Mesh(kgeo('cafecup'),cafeMat()));
    const cv=document.createElement('canvas'); cv.width=cv.height=512; const tx=new T.CanvasTexture(cv); tx.anisotropy=4; CAFE.acv=cv; CAFE.atx=tx; cafeArt(cv,MENU[0].art); tx.needsUpdate=true;
    CAFE.fu={uMap:{value:tx},uSw:{value:0},uArt:{value:0},uFill:{value:0},uTime:{value:0}};
    CAFE.m.foam=add(new T.Mesh(new T.CircleGeometry(.051,40).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:Object.assign(CAFE.fu,LU,CU),vertexShader:TOON_V(true),fragmentShader:FOAM_F})));
    CAFE.m.pour=add(new T.Mesh(new T.CylinderGeometry(.006,.005,1,8).translate(0,-.5,0),cafeMat({c:'#4a2c1b',vc:false}))); }
  /* steam: a few soft puffs, colour only */
  CAFE.wisps=[]; for(let i=0;i<7;i++){ const m=add(new T.Mesh(GEO.blob,new T.ShaderMaterial({uniforms:{uA:{value:0}},vertexShader:TOON_V(),fragmentShader:STEAM_F,transparent:true,depthWrite:false})),false); m.layers.set(1); m.renderOrder=5; CAFE.wisps.push({m,t:9,life:1,p:new T.Vector3(),s:.02}); }
  /* where the lamps hang, for the light */
  [[-.8,2.09,-.3],[0,2.09,-.3],[.8,2.09,-.3],[0,2.05,.78]].forEach((p,i)=>{ cw(p[0],p[1],p[2],cV); CU.uCL.value[i].set(cV.x,cV.y,cV.z,i<3?1:.85); });
  /* tapping the café from the street: a box round it */
  CAFE.pick=new T.Mesh(new T.BoxGeometry(w+.3,h+1.4,d+.3),new T.MeshBasicMaterial()); CAFE.pick.matrixAutoUpdate=false; CAFE.pick.matrixWorld.copy(M).multiply(cM.makeTranslation(0,(h+1.4)/2,0));
  /* the camera's resting look: just below the middle of the board */
  CAFE.p0=cport()?-.05:.06; cafeRest(); }
/* the barista, the cup and the coffee at rest: as they are each time you come in */
function cafeRest(){ const B=CAFE.bar; [B.x,B.z]=BP.home; B.fx=B.x; B.fz=B.z; B.yaw=B.yawT=0; B.sp=0; B.R='wipe'; B.L='free'; B.wave=B.nod=0; B.say='';
  CAFE.cup.at='stack'; CAFE.cup.p.set(...CP.stack); CAFE.cup.from.copy(CAFE.cup.p); CAFE.cup.k=1; CAFE.cup.fill=CAFE.cup.art=CAFE.cup.drain=0; CAFE.beats=[]; CAFE.ph='menu'; CAFE.shake=0; CAFE.steam=0;
  CAFE.fu.uSw.value=0; CAFE.sw=0; CAFE.dv=0; CAFE.card=0; CAFE.lean=0; CAFE.yaw=0; CAFE.pitch=CAFE.p0; CAFE.wisps.forEach(q=>{ q.t=9; }); }

/* ---------- the way in and the way out ---------- */
function cset(s){ CAFE.st=s; CAFE.on=s==='enter'||s==='in'||s==='exit'; CAFE.t=0; el.classList.toggle('incafe',CAFE.on); if(CAFE.cur){ CAFE.cur=false; const ce=$('#cur'); if(ce) ce.classList.remove('big'); } cafeUI(); }
const cbusy=()=>!CAFE.g||!!TALK.p||CUT.on||FIN.on||PHS.on||GLN.t>=0;
/* where you are and which way you face, in the café's frame */
function cafeYou(){ const P=player; clocal(cV.copy(P.u).multiplyScalar(R+P.h),CAFE.pl); cV2.copy(P.f).transformDirection(CAFE.Mi); return {x:CAFE.pl.x,z:CAFE.pl.z,fz:cV2.z}; }
const cafeAtDoor=(m=1)=>{ const y=cafeYou(); return Math.abs(y.x)<.62*m&&y.z>1.5&&y.z<2.8+(m-1)*.6; };
/* go in: from right by the door straight away, from further off walking over there first (round whatever is in the way) */
function cafeGo(){ if(CAFE.st!=='out'||cbusy()) return false; if(cafeAtDoor(1.6)){ cafeEnter(); return true; }
  const P=player, [gx,gz]=cxz(0,CAFE.d/2), path=navPath(P.x,P.z,gx,gz,1.5); if(!path) return false;   // (to between 1 and 1.5 m out from the door)
  closeTalk(); TALK.goal=null; C.guide=null; P.path=path; P.tgt=null; P.stuck=0; CAFE.go=0; CAFE.last=0; cset('go'); began(); A.tick(); return true; }
function cafeEnter(){ const P=player; closeTalk(); TALK.goal=null; C.guide=null; P.path=null; P.tgt=null; P.speed=0; stickOff(); down=null; look=null;
  const y=cafeYou(); CAFE.fig=[y.x,y.z]; CAFE.fh=Math.atan2(cV2.x,cV2.z); CAFE.fph=P.ph; CAFE.fstep=0; cafeRest();
  /* the camera: from where it is, down behind you to eye height, in through the door, to the counter */
  const E=cafeEye(new T.Vector3()); CAFE.curve=new T.CatmullRomCurve3([st.camP.clone(),cw(0,CFL+1.32,2.95),cw(0,CFL+CEY+.05,1.45),E],false,'centripetal');
  CAFE.lcurve=new T.CatmullRomCurve3([st.camL.clone(),cw(0,1.22,.9),cw(0,1.5,-.6),E.clone().add(cafeDir(0,CAFE.p0,cV3))],false,'centripetal');
  CAFE.u0=stUp.clone(); CAFE.k=1; CAFE.wIn=null; CAFE.greet=0; me.visible=true; inBtn.hidden=true; cset('enter'); }
function cafeLeave(){ if(CAFE.st!=='in'||CAFE.ph==='dive'||CAFE.ph==='card'||CAFE.ph==='rise') return; const P=player;
  /* you come out onto the pavement, facing the street, and the walking camera takes over just where this one ends */
  const [x,z]=cxz(0,3.05); P.x=x; P.z=z; P.u.copy(at(x,z)); tang(P.u,cw(0,0,9,cV),P.f); P.h=standH(x,z); P.speed=0; P.path=null; P.tgt=null;
  const D=rigLimit(x,z,P.u,P.f,C.PITCH,C.D0()), head=cV.copy(P.u).multiplyScalar(R+P.h+C.HEAD); CAFE.endP=new T.Vector3(); CAFE.endL=new T.Vector3(); rigPose(head,P.u,P.f,C.PITCH,D,CAFE.endP,CAFE.endL); CAFE.endD=D;
  CAFE.y0=CAFE.yaw; CAFE.p0x=CAFE.pitch; CAFE.fig=[0,1.2]; CAFE.fh=0; CAFE.curve=null; cset('exit'); }
function cafeEye(o,lean=0){ const p=cport(); return cw(0,CFL+CEY+(p?.06:0)-lean*.04,(p?1.05:1)-lean*.85,o); }   // lean: up to the counter, over your cup
function cafeDir(yaw,pitch,o){ return cdir(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch),o); }
/* the figure (you) walking in or out: in the café's frame, on the ground, the step or the floor, turning as it goes */
function cafeFig(dt,t,x,z,sp){ const [ox,oz]=CAFE.fig, dx=x-ox, dz=z-oz, dd=Math.hypot(dx,dz); CAFE.fig=[x,z];
  if(dd>1e-4){ let a=Math.atan2(dx,dz)-CAFE.fh; a=Math.atan2(Math.sin(a),Math.cos(a)); CAFE.fh+=a*Math.min(1,dt*9); }
  const [mx,mz]=cxz(x,z), y=z>2?standH(mx,mz)-sag(x,z):z>1.44?.16:CFL; cw(x,y,z,cV); const U=cV2.copy(at(mx,mz)); cdir(Math.sin(CAFE.fh),0,Math.cos(CAFE.fh),cV3);
  sT.crossVectors(U,tang(U,cV3,cV3)).normalize(); Mf.makeBasis(sT,U,cV3); me.quaternion.setFromRotationMatrix(Mf); me.position.copy(cV);
  CAFE.fph+=dt*sp*4.6; animate(me,CAFE.fph,clamp(sp/2.7,0,1),0,t,9); CAFE.fstep+=sp*dt; if(CAFE.fstep>.62){ CAFE.fstep=0; A.step(z>2?(roadDist(mx,mz)<RW+SW?1:0):1); } }
/* a point along a line of points, a fraction u of the way by length */
function cpoly(pts,u){ let L=0; const s=[]; for(let i=1;i<pts.length;i++){ const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); s.push(l); L+=l; }
  let r=u*L; for(let i=0;i<s.length;i++){ if(r<=s[i]||i===s.length-1){ const k=s[i]?clamp(r/s[i],0,1):1; return [lerp(pts[i][0],pts[i+1][0],k),lerp(pts[i][1],pts[i+1][1],k),L]; } r-=s[i]; } return [pts[0][0],pts[0][1],L]; }
const CT_IN=2.9, CT_OUT=2.6;   // seconds to walk in, and out
function cafeWayIn(dt,t){ const c=CAFE.t+=dt, P=player;
  /* you walk to the door and in; the door opens as you reach it and shuts behind you */
  /* (you walk on to where you will stand at the counter, so the camera arrives in your own eyes: you fade as it comes up behind you) */
  const W=CAFE.wIn||(CAFE.wIn=[CAFE.fig.slice(),[0,1.78],[0,clocal(cafeEye(cV4),cV4).z]]), wk=sstep(0,2.2,c), [x,z,L]=cpoly(W,wk), sp=L*6*wk*(1-wk)/2.2;
  if(c>.3&&CAFE.doorT===0){ CAFE.doorT=1; A.cafeDoor(true); CAFE.bellV+=5; } if(c>2.25&&CAFE.doorT===1){ CAFE.doorT=0; CAFE.shut=1; }
  const s=E.io(clamp(c/(CT_IN-.1),0,1)); CAFE.curve.getPointAt(s,CAFE.cp); CAFE.lcurve.getPointAt(Math.min(1,s*1.04),CAFE.cl); CAFE.cu.copy(CAFE.u0).lerp(CAFE.up,sstep(.2,.8,s)).normalize();
  if(me.visible){ cafeFig(dt,t,x,z,sp); if(c>1&&me.position.distanceTo(CAFE.cp)<.9||c>2.3) me.visible=false; }
  if(c>=CT_IN){ CAFE.wIn=null; CAFE.curve=CAFE.lcurve=null; CAFE.ph='menu'; CAFE.bar.say='Hello! What can I get you?'; cset('in'); if(CAFE.kb) cafeFocus('#crMenu .crdrink'); }
  if(c>1.5&&!CAFE.greet){ CAFE.greet=1; CAFE.bar.wave=1.8; A.murmur(BARISTA.pitch,3); } }   // the barista looks up and waves as you come in
function cafeWayOut(dt,t){ const c=CAFE.t+=dt, P=player;
  /* you turn round to the door, it opens, out you go and it shuts behind you; the camera ends just where the walking one starts */
  if(c<.75){ const k=E.io(c/.75), to=CAFE.y0>=0?Math.PI:-Math.PI; CAFE.yaw=lerp(CAFE.y0,to,k); CAFE.pitch=lerp(CAFE.p0x,-.08,k); cafeEye(CAFE.cp); cafeDir(CAFE.yaw,CAFE.pitch,cV).add(CAFE.cp); CAFE.cl.copy(cV); CAFE.cu.copy(CAFE.up);
    if(!CAFE.curve){ /* (built once the turn is done, from where the turn ends) */ } }
  else { if(!CAFE.curve){ CAFE.curve=new T.CatmullRomCurve3([CAFE.cp.clone(),cw(0,CFL+CEY+.06,1.3),CAFE.endP.clone()],false,'centripetal'); CAFE.lc0=CAFE.cl.clone(); }
    const s=E.io(clamp((c-.75)/(CT_OUT-.85),0,1)); CAFE.curve.getPointAt(s,CAFE.cp); CAFE.cl.copy(CAFE.lc0).lerp(CAFE.endL,sstep(.1,.9,s)); CAFE.cu.copy(CAFE.up).lerp(P.u,s).normalize(); }
  if(c>.4&&CAFE.doorT===0&&!CAFE.shut){ CAFE.doorT=1; A.cafeDoor(true); CAFE.bellV+=5; } if(c>2.05&&CAFE.doorT===1){ CAFE.doorT=0; CAFE.shut=1; }
  const W=[[0,1.1],[0,3.05]], u=clamp((c-.45)/1.45,0,1), wk=u*u*(3-2*u), [x,z,L]=cpoly(W,wk), sp=L*6*u*(1-u)/1.45; if(c>.45){ me.visible=true; cafeFig(dt,t,x,z,sp); }   // (out ahead of the camera, so you are seen walking out)
  if(c>=CT_OUT){ /* hand back: you, standing on the pavement, and the walking camera set exactly where this one is */
    const [mx,mz]=cxz(0,3.05); P.x=mx; P.z=mz; P.u.copy(at(mx,mz)); tang(P.u,cw(0,0,9,cV),P.f); P.h=standH(mx,mz); P.ph=CAFE.fph;
    C.f.copy(P.f); C.pitch=C.pEff=C.PITCH; C.dist=CAFE.endD; C.camH=P.h; C.tgt.copy(P.u).multiplyScalar(R+P.h+C.HEAD); C.dragT=9; C.tk=0; stUp.copy(P.u);
    CAFE.curve=null; cset('out'); CAFE.cp.copy(CAFE.endP); CAFE.cl.copy(CAFE.endL); CAFE.cu.copy(P.u); } }

/* ---------- the barista at work ----------
   Each beat: how long, where they stand (BP), which way they face (0 to you, PI to the back bar), what each hand is doing
   (R, L: a pose from CPOSE, else the walk's own swing), and what happens: go, as it starts; end, when it is done. Between
   two places they walk */
function barPlan(){ const L=[], b=(dur,to,face,o={})=>L.push(Object.assign({dur,to,face},o)), PI=Math.PI, again=CAFE.cup.at==='serve';
  b(.7,again?BP.serve:BP.home,0,{nod:1,go:'say'});                                                      // says it back, with a nod
  if(again) b(.35,BP.serve,0,{R:'set',end:'take'});                                                      // (another: your cup first)
  else { b(.6,BP.stack,PI); b(.35,BP.stack,PI,{R:'reach',end:'take'}); }                                // turns to the cups and takes one
  b(.75,BP.machine,PI,{R:'carry'}); b(.32,BP.machine,PI,{R:'reach',end:'set'});                       // to the machine: the cup on the tray
  b(.35,BP.grind,PI); b(.85,BP.grind,PI,{L:'reach',go:'grind'});                                      // grinds
  b(.35,BP.machine,PI); b(.5,BP.machine,PI,{R:'work',L:'work',go:'tamp'});                            // tamps, and locks the handle in
  b(.9,BP.machine,PI,{R:'work',go:'pour'});                                                           // the shot runs
  b(.8,BP.machine,PI,{L:'work',go:'steam'});                                                          // and the milk, at the wand
  b(.32,BP.machine,PI,{R:'reach',end:'take'});                                                        // takes it up
  b(.85,BP.serve,0,{R:'carry'}); b(.42,BP.serve,0,{R:'set',end:'serve'});                             // turns and sets it down in front of you
  b(.55,BP.home,0); return L; }
/* the arms in each pose: [the upper arm forward, out to the side, the forearm forward] */
const CPOSE={rest:[0,0,-.12],reach:[-.95,0,-.3],work:[-1.3,0,-.6],carry:[-.8,0,-1.05],set:[-1.1,0,-.2],wipe:[-1.05,0,-.35]};
function cafeOrder(i){ if(CAFE.st!=='in'||!(CAFE.ph==='menu'||CAFE.ph==='served')||!MENU[i]) return; CAFE.dr=i; CAFE.ph='brew'; CAFE.beats=barPlan(); CAFE.beat=-1; CAFE.bt=0;
  if(CAFE.cup.at!=='serve'){ cafeArt(CAFE.acv,MENU[i].art); CAFE.atx.needsUpdate=true; } A.tick(); CAFE.bdraw(); cafeUI(); }
/* the cup goes from where it is to its next place (the hand, the tray, your place) in a moment, not in a jump */
function cupTo(at){ const c=CAFE.cup; c.from.copy(c.p); c.at=at; c.k=0; }
function cafeBeats(dt){ const B=CAFE.bar, cup=CAFE.cup; if(CAFE.ph!=='brew') return;
  if(CAFE.beat<0||CAFE.bt>=CAFE.beats[CAFE.beat].dur){ const q=CAFE.beats[CAFE.beat];
    if(q){ B.x=q.to[0]; B.z=q.to[1];   // there
      if(q.end==='take'){ if(cup.at==='serve') cup.drain=1; cupTo('hand'); A.clink(.018); }
      else if(q.end==='set'){ cupTo('brew'); A.clink(.022); if(cup.drain||cup.fill>0){ cup.fill=cup.art=0; cup.drain=0; cafeArt(CAFE.acv,MENU[CAFE.dr].art); CAFE.atx.needsUpdate=true; } }
      else if(q.end==='serve'){ cupTo('serve'); A.cupDown(); A.chime(12,.06,.022); A.chime(14,.2,.018); } }
    CAFE.beat++; CAFE.bt=0; B.fx=B.x; B.fz=B.z; const n=CAFE.beats[CAFE.beat];
    if(!n){ CAFE.ph='served'; CAFE.pt=0; CAFE.fold=true; B.say='Your '+MENU[CAFE.dr].name+'. Enjoy!'; A.murmur(BARISTA.pitch,4); cafeUI(); if(CAFE.kb) cafeFocus('#crLook'); return; }
    if(n.go==='say'){ B.say='One '+MENU[CAFE.dr].name+', coming up.'; A.murmur(BARISTA.pitch,6); cafeUI(); }
    if(n.nod) B.nod=1; if(n.go==='grind'){ A.grind(.85); CAFE.shake=.85; } if(n.go==='tamp') A.tamp(); if(n.go==='pour') A.pour(.9); if(n.go==='steam'){ A.steam(.75); CAFE.steam=.8; } }
  const q=CAFE.beats[CAFE.beat]; CAFE.bt+=dt; const u=clamp(CAFE.bt/q.dur,0,1), k=u*u*(3-2*u);
  B.x=lerp(B.fx,q.to[0],k); B.z=lerp(B.fz,q.to[1],k); B.sp=Math.hypot(q.to[0]-B.fx,q.to[1]-B.fz)*6*u*(1-u)/q.dur; B.yawT=q.face; B.R=q.R||'free'; B.L=q.L||'free';
  if(q.go==='pour'&&cup.at==='brew') cup.fill=u; if(!cup.drain&&cup.fill>.99&&(q.go==='steam'||cup.art>0&&cup.art<1)) cup.art=Math.min(1,cup.art+dt/1.3); }
/* the barista drawn: where they stand and face, walking or not, each arm in its pose, the wave, the nod, a blink, a little sway;
   the cloth in hand while they wipe the counter; and the cup, in their hand or where it was set down */
function cafePose(dt,t){ const B=CAFE.bar, cup=CAFE.cup, m=CAFE.m, f=B.fig, d=f.userData;
  if(CAFE.ph!=='brew'){ B.sp=0; B.yawT=0; B.R=CAFE.st==='in'||CAFE.st==='out'?'wipe':'rest'; B.L='free';
    if(Math.hypot(B.x-BP.home[0],B.z-BP.home[1])>.005){ B.x=damp(B.x,BP.home[0],3,dt); B.z=damp(B.z,BP.home[1],3,dt); } }   // (back to their place behind the counter)
  let a=(B.yawT||0)-B.yaw; a=Math.atan2(Math.sin(a),Math.cos(a)); B.yaw+=a*Math.min(1,dt*7);
  cw(B.x,CFL,B.z,cV); cdir(Math.sin(B.yaw),0,Math.cos(B.yaw),cV3); sT.crossVectors(CAFE.up,cV3).normalize(); Mf.makeBasis(sT,CAFE.up,cV3); f.quaternion.setFromRotationMatrix(Mf); f.position.copy(cV);
  B.ph+=dt*B.sp*5; B.wave=Math.max(0,B.wave-dt); animate(f,B.ph,clamp(B.sp/1.4,0,1)*.7,B.wave,t,7);
  B.step+=B.sp*dt; if(B.step>.4){ B.step=0; if(CAFE.on) A.step(1); }
  [B.R,B.L].forEach((p,i)=>{ const arm=d.arms[i], fa=d.fore[i], c=B.arm[i];
    if(p==='free'||i===1&&B.wave>0){ c[0]=arm.rotation.x; c[1]=arm.rotation.z; c[2]=fa.rotation.x; return; }
    const P0=CPOSE[p], w=p==='wipe'?1:0; c[0]=damp(c[0],P0[0]+w*Math.sin(t*4.2)*.12,9,dt); c[1]=damp(c[1],P0[1]+w*Math.cos(t*4.2)*.1*(i?1:-1),9,dt); c[2]=damp(c[2],P0[2],9,dt);
    arm.rotation.x=c[0]; arm.rotation.z=c[1]; fa.rotation.x=c[2]; });
  B.nod=Math.max(0,B.nod-dt*1.6); d.head.rotation.x=Math.sin(B.nod*Math.PI)*.3; d.body.rotation.z=B.sp>.05?0:Math.sin(t*.8)*.025;
  B.blink-=dt; const ey=B.blink<.12?.15:1; if(B.blink<0) B.blink=2+Math.random()*3; d.eyes.forEach(e=>e.scale.y=ey);
  m.cloth.visible=B.R==='wipe'||CAFE.warm;
  /* the cup: in the barista's hand while it is carried (upright), else where it was set down */
  f.updateMatrixWorld(true); clocal(d.fore[0].localToWorld(cV2.set(0,-.2,.03)),cV2); cV2.y-=.03;
  const goal=cup.at==='hand'?cV2:cup.at==='brew'?cV3.set(...CP.brew):cup.at==='serve'?cV3.set(...CP.serve):cV3.set(...CP.stack);
  cup.k=Math.min(1,cup.k+dt/.2); cup.p.copy(cup.from).lerp(goal,sstep(0,1,cup.k));
  if(cup.drain){ cup.fill=Math.max(0,cup.fill-dt*1.6); cup.art=Math.max(0,cup.art-dt*1.6); }
  m.cup.matrix.multiplyMatrices(CAFE.M,cM.makeTranslation(cup.p.x,cup.p.y,cup.p.z)); m.cup.matrixWorldNeedsUpdate=true;
  const fy=lerp(.017,.068,cup.fill), fr=lerp(.036,.0515,cup.fill)/.051; m.foam.visible=cup.fill>.01||CAFE.warm;
  m.foam.matrix.multiplyMatrices(CAFE.M,cM.makeTranslation(cup.p.x,cup.p.y+fy,cup.p.z).multiply(cM2.makeScale(fr,1,fr))); m.foam.matrixWorldNeedsUpdate=true;
  CAFE.fu.uFill.value=cup.fill; CAFE.fu.uArt.value=cup.art;
  /* the shot running from the spout while it pours */
  const pouring=CAFE.ph==='brew'&&CAFE.beats[CAFE.beat]&&CAFE.beats[CAFE.beat].go==='pour'&&cup.at==='brew'; m.pour.visible=pouring||CAFE.warm;
  if(pouring){ const y0=CP.spout[1], y1=cup.p.y+fy; m.pour.matrix.multiplyMatrices(CAFE.M,cM.makeTranslation(CP.spout[0],y0,CP.spout[2]).multiply(cM2.makeScale(1,Math.max(.01,y0-y1),1))); m.pour.matrixWorldNeedsUpdate=true; }
  /* the grinder shaking, the door on its hinge (a spring with a little overshoot), the bell swinging when the door moves */
  CAFE.shake=Math.max(0,CAFE.shake-dt); const j=CAFE.shake>0?.0035:0; cw(CP.grind[0]+(Math.random()-.5)*j,CP.grind[1],CP.grind[2]+(Math.random()-.5)*j,cV); m.grind.matrix.copy(CAFE.M).setPosition(cV); m.grind.matrixWorldNeedsUpdate=true;
  const dk=CAFE.doorT*1.62; CAFE.doorV+=((dk-CAFE.door)*38-CAFE.doorV*8.5)*dt; CAFE.door+=CAFE.doorV*dt;
  if(CAFE.shut&&CAFE.door<.02&&CAFE.doorT===0){ CAFE.shut=0; CAFE.door=0; CAFE.doorV=0; A.cafeDoor(false); CAFE.bellV+=3; }
  m.door.matrix.multiplyMatrices(CAFE.M,cM.makeTranslation(-CDW/2,0,CAFE.d/2-.04).multiply(cM2.makeRotationY(CAFE.door))); m.door.matrixWorldNeedsUpdate=true;
  CAFE.bellV+=(-CAFE.bell*55-CAFE.bellV*2.4)*dt; CAFE.bell+=CAFE.bellV*dt;
  m.bell.matrix.multiplyMatrices(CAFE.M,cM.makeTranslation(...CP.bell).multiply(cM2.makeRotationX(clamp(CAFE.bell,-.6,.6)*.5))); m.bell.matrixWorldNeedsUpdate=true;
  /* steam: from the wand while it steams, then a thread or two off the cup once it is served */
  CAFE.steam=Math.max(0,CAFE.steam-dt); CAFE.wisp-=dt;
  if(CAFE.wisp<=0&&(CAFE.steam>0||cup.at==='serve'&&cup.fill>.9)){ CAFE.wisp=CAFE.steam>0?.09:.55; const q=CAFE.wisps.find(w=>w.t>=w.life); if(q){ q.t=0; q.life=CAFE.steam>0?.9:1.6; q.s=CAFE.steam>0?.022:.016;
      if(CAFE.steam>0) q.p.set(CP.steam[0]+(Math.random()-.5)*.02,CP.steam[1]-.03,CP.steam[2]+.02); else q.p.set(cup.p.x+(Math.random()-.5)*.03,cup.p.y+.08,cup.p.z+(Math.random()-.5)*.03); } }
  for(const q of CAFE.wisps){ q.t+=dt; const a=q.t/q.life, on=a<1&&!CAFE.warm; q.m.visible=on||CAFE.warm; if(!on){ q.m.material.uniforms.uA.value=0; continue; }
    q.p.y+=dt*.11; q.p.x+=Math.sin(t*2+q.life*9)*dt*.02; const s=q.s*(1+a*2.2); q.m.material.uniforms.uA.value=Math.sin(Math.PI*a)*.55;
    cM.makeScale(s,s*1.3,s).setPosition(q.p); q.m.matrix.multiplyMatrices(CAFE.M,cM); q.m.matrixWorldNeedsUpdate=true; } }

/* ---------- looking into the cup: the camera sinks into it and the foam swirls over the screen; the card is in the foam ---------- */
function cafeDive(){ if(CAFE.st!=='in'||CAFE.ph!=='served'||CAFE.cup.at!=='serve') return; CAFE.ph='dive'; CAFE.dv=0; CAFE.d0p.copy(CAFE.cp); CAFE.d0l.copy(CAFE.cl); CAFE.d0u.copy(CAFE.cu); A.whoosh(false,1.2,.06); cafeUI(); }
function cafeRise(){ if(CAFE.ph!=='dive'&&CAFE.ph!=='card') return; CAFE.ph='rise'; cupCard(false); A.whoosh(true,1.1,.05); cafeUI(); }
function cafeDiveCam(dt){ const u=CAFE.dv, s=E.io(u), cup=CAFE.cup.p, top=cw(cup.x,cup.y+.068,cup.z,cV4);
  cV.copy(top).addScaledVector(CAFE.up,.42).addScaledVector(cdir(0,0,1,cV3),.07); cV2.copy(top).addScaledVector(CAFE.up,.03);   // over the cup, then down to just above the foam
  const a=1-s; CAFE.cp.copy(CAFE.d0p).multiplyScalar(a*a).addScaledVector(cV,2*a*s).addScaledVector(cV2,s*s);
  CAFE.cl.copy(CAFE.d0l).lerp(top,sstep(0,.55,s)); CAFE.cu.copy(CAFE.d0u).lerp(cdir(0,0,-1,cV3),sstep(.2,.75,s)).normalize();
  CU.uNr.value=lerp(.12,.004,sstep(.25,.75,s)); }
function cupCard(on){ const i=CAFE.dr, d=MENU[i]; if(on){ cupK.textContent=d.name; cupH.textContent=d.head; cupT.textContent=d.text; cupS.innerHTML=CSIGN[d.art];
    cupGo.href=d.href; cupGo.firstChild.nodeValue=d.go+' '; const ext=/^https?:/.test(d.href); cupGo.target=ext?'_blank':'_self'; if(ext) cupGo.rel='noopener'; else cupGo.removeAttribute('rel'); cupGo.querySelector('svg').style.display=ext?'':'none'; }
  cupEl.classList.toggle('on',on); cupEl.setAttribute('aria-hidden',on?'false':'true'); if(on&&CAFE.kb) cafeFocus('#crCupGo'); }
/* the signs on the card, as on the board */
const CSIGN={heart:'<svg viewBox="0 0 40 40"><path d="M20 33C7 24 4 17 8 11c3-4 9-4 12 1 3-5 9-5 12-1 4 6 1 13-12 22Z" fill="currentColor"/></svg>',
  krios:'<svg viewBox="0 0 40 40"><path d="M11 8v24M26 8 13 20l13 12" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M29 15a7 7 0 0 1 0 10M33 12a11 11 0 0 1 0 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  rocket:'<svg viewBox="0 0 40 40"><path d="M20 4c6 5 7 14 4 22h-8c-3-8-2-17 4-22Z" fill="currentColor"/><path d="M16 20l-5 8 5-1M24 20l5 8-5-1" fill="currentColor"/><circle cx="20" cy="31" r="2.6" fill="currentColor"/><circle cx="20" cy="15" r="2.4" fill="#fbf6ec"/></svg>'};

/* ---------- each frame ---------- */
function cafeStep(dt,t){ if(!CAFE.g) return; const P=player; CAFE.p0=cport()?-.05:.06;   // (on a phone held upright the view rests a little lower, so the barista is in it above the menu)
  /* the room is drawn only when it can be seen: from the street nearby, or from inside */
  CAFE.g.visible=CAFE.warm||CAFE.on||stCam.position.distanceTo(CAFE.c0)<20; if(!CAFE.g.visible&&CAFE.st==='out'&&CAFE.k<.001){ cafeOutside(dt); return; }
  if(CAFE.st==='out'||CAFE.st==='go') cafeOutside(dt);
  else if(CAFE.st==='enter') cafeWayIn(dt,t);
  else if(CAFE.st==='exit') cafeWayOut(dt,t);
  else cafeInside(dt,t);
  cafeBeats(dt); cafePose(dt,t);
  /* how far inside the camera is: the door takes the room's light, and from the street by day the room is a little dimmer than the day */
  const cz=clocal(CAFE.on?CAFE.cp:stCam.position,cV).z, inn=CAFE.on?sstep(1.7,1.1,cz):0; CDIN.value=inn; CU.uDim.value=1-.2*(1-inn)*(1-SKY.night);
  CU.uCL.value.forEach((l,i)=>{ l.w=(i<3?1.12:.85)*(1+.18*SKY.night); });
  /* the swirl in the foam keeps turning while you are in the cup */
  CAFE.swT+=dt; CAFE.fu.uTime.value=CAFE.swT; CAFE.fu.uSw.value=CAFE.sw;
  /* the camera: this one while you are in here (and on the way in and out), handed back smoothly after */
  if(CAFE.st==='out') CAFE.k=damp(CAFE.k,0,7,dt);
  if(CAFE.k>.001){ const k=CAFE.st==='out'?CAFE.k:1; st.camP.lerp(CAFE.cp,k); st.camL.lerp(CAFE.cl,k); stUp.lerp(CAFE.cu,k).normalize(); stCam.up.copy(stUp); UPU.value.copy(stUp);
    if(CAFE.on) LU.uPly.value.copy(st.camP); S.stSnap=true; }
  /* (a nearer lens in here, for the cup; a little wider, for the room) */
  const nr=CAFE.on?.02:.1; if(stCam.near!==nr){ stCam.near=nr; stCam.updateProjectionMatrix(); }
  if(CAFE.k>.001){ const fv=lerp(stCam.fov,cport()?62:50,CAFE.k); if(Math.abs(stCam.fov-fv)>.01){ stCam.fov=fv; stCam.updateProjectionMatrix(); } }
  /* the town's music is a little quieter in here */
  CAFE.mk=damp(CAFE.mk||0,CAFE.st==='in'?1:CAFE.on?CDIN.value:0,2.5,dt); if(CAFE.mk>.002) A.music(.55*(1-.42*CAFE.mk)); }
/* out in the street: going in when you walk up to the door, or once you get there after asking to; the button by the café */
function cafeOutside(dt){ const P=player;
  if(CAFE.st==='go'){ CAFE.go+=dt; if(cbusy()||TALK.goal||CAFE.go>20){ cset('out'); }
    else if(cafeAtDoor(1.6)) cafeEnter();
    else if(!P.path&&!P.tgt){ if(!CAFE.last){ CAFE.last=1; P.tgt=at(...cxz(0,2.45)).multiplyScalar(R); } else cset('out'); } }   // the last step, straight to the door
  else if(!cbusy()&&!TALK.goal&&P.speed>.35&&CAFE_ON){ const y=cafeYou(); if(Math.abs(y.x)<.62&&y.z>1.5&&y.z<2.8&&y.fz<-.5) cafeEnter(); }
  inBtn.hidden=!(CAFE.st==='out'&&PJ.id==='cafe'&&!cbusy()); }
function cafeInside(dt,t){ const port=cport();
  /* turning: a drag, or the arrow keys (or A and D); W walks you back up to the counter, or out if you face the door; S steps back out */
  const kx=(keys.has('ArrowLeft')||keys.has('KeyA')?1:0)-(keys.has('ArrowRight')||keys.has('KeyD')?1:0), busy=CAFE.ph==='dive'||CAFE.ph==='card'||CAFE.ph==='rise';
  if(kx&&!busy){ CAFE.yaw=clamp(CAFE.yaw+kx*1.6*dt,-2.95,2.95); CAFE.dragT=0; }
  const fw=keys.has('KeyW')||keys.has('ArrowUp'), bk=keys.has('KeyS')||keys.has('ArrowDown');
  if(!busy&&(bk||fw&&Math.abs(CAFE.yaw)>2.2)){ CAFE.out=(CAFE.out||0)+dt; if(CAFE.out>.3){ CAFE.out=0; cafeLeave(); return; } } else CAFE.out=0;
  CAFE.dragT+=dt; CAFE.pt+=dt;
  /* where the view rests on its own: the board; the barista while they work; the cup, leaning in, once it is served */
  let ay=0, ap=CAFE.p0, al=0;
  if(CAFE.ph==='brew'){ const e=clocal(cafeEye(cV),cV2), B=CAFE.bar, dx=B.x-e.x, dy=CFL+.95-e.y, dz=B.z-e.z; ay=Math.atan2(-dx,-dz)*.45; ap=lerp(CAFE.p0,Math.atan2(dy,Math.hypot(dx,dz)),.45); }
  else if(CAFE.ph==='served'&&CAFE.cup.at==='serve'){ al=1; const e=clocal(cafeEye(cV,CAFE.lean),cV2), c=CAFE.cup.p; ap=Math.atan2(c.y+.05-e.y,Math.hypot(c.x-e.x,c.z-e.z))+(port?.09:.07); }   // (the cup a little below the middle, clear of the menu)
  if(fw&&Math.abs(CAFE.yaw)<1.2&&!busy) al=1;
  if(CAFE.dragT>2.4&&!busy){ CAFE.yaw=damp(CAFE.yaw,ay,1.8,dt); CAFE.pitch=damp(CAFE.pitch,ap,1.8,dt); }
  CAFE.lean=damp(CAFE.lean,al,1.6,dt);
  /* into the cup: the swirl starts as you near the foam and keeps turning slowly while the card is up; out again, it settles back into the drink's sign */
  if(CAFE.ph==='dive'||CAFE.ph==='card'){ CAFE.dv=Math.min(1,CAFE.dv+dt/1.7); CAFE.sw=CAFE.ph==='card'?Math.min(1.8,CAFE.sw+dt*.07):Math.max(CAFE.sw,1.1*sstep(.45,1,CAFE.dv));
    if(CAFE.dv>=1&&CAFE.ph==='dive'){ CAFE.ph='card'; CAFE.pt=0; } if(CAFE.ph==='card'&&CAFE.pt>.25&&!CAFE.card){ CAFE.card=1; cupCard(true); } }
  else if(CAFE.ph==='rise'){ CAFE.dv=Math.max(0,CAFE.dv-dt/1.3); CAFE.sw=Math.min(CAFE.sw,1.1*sstep(.25,1,CAFE.dv)); if(CAFE.dv<=0){ CAFE.ph='served'; CAFE.card=0; CAFE.sw=0; CAFE.dragT=9; CU.uNr.value=.12; cafeUI(); if(CAFE.kb) cafeFocus('#crLook'); } }
  if(CAFE.dv>0) cafeDiveCam(dt);
  else { cafeEye(CAFE.cp,CAFE.lean); cafeDir(CAFE.yaw,CAFE.pitch,cV).add(CAFE.cp); CAFE.cl.copy(cV); CAFE.cu.copy(CAFE.up); }
  me.visible=false; }

/* ---------- the café's buttons and its card ---------- */
const inBtn=$('#crCafeIn',el), cafeEl=$('#crCafe',el), menuEl=$('#crMenu',el), brewT=$('#crBrewT',el), lookBtn=$('#crLook',el), moreBtn=$('#crMore',el), leaveBtn=$('#crLeave',el),
  cupEl=$('#crCup',el), cupK=$('#crCupK',el), cupH=$('#crCupH',el), cupT=$('#crCupT',el), cupS=$('#crCupS',el), cupGo=$('#crCupGo',el), cupBack=$('#crCupBack',el), drinkB=$$('.crdrink',el);
drinkB.forEach((b,i)=>{ b.querySelector('.crdrink-n').textContent=MENU[i].name; b.querySelector('.crdrink-k').textContent=MENU[i].what; b.addEventListener('click',e=>{ e.stopPropagation(); if(e.detail===0) CAFE.kb=true; cafeOrder(i); }); });
inBtn.addEventListener('click',e=>{ e.stopPropagation(); CAFE.kb=e.detail===0; cafeGo(); });
lookBtn.addEventListener('click',e=>{ e.stopPropagation(); if(e.detail===0) CAFE.kb=true; cafeDive(); });
moreBtn.addEventListener('click',e=>{ e.stopPropagation(); CAFE.fold=false; cafeUI(); if(e.detail===0){ CAFE.kb=true; cafeFocus('#crMenu .crdrink'); } });   // the menu again, to order another
leaveBtn.addEventListener('click',e=>{ e.stopPropagation(); CAFE.kb=e.detail===0; cafeLeave(); });
cupBack.addEventListener('click',e=>{ e.stopPropagation(); cafeRise(); });
/* the link in the foam: the visitor's own click opens it (a new tab, or their mail in this one), and then you rise back out of the cup */
cupGo.addEventListener('click',e=>{ e.stopPropagation(); setTimeout(cafeRise,180); });
[cafeEl,cupEl,inBtn].forEach(x=>x.addEventListener('pointerdown',e=>e.stopPropagation()));
function cafeFocus(sel){ setTimeout(()=>{ const b=$(sel,el); if(b&&!b.closest('[hidden]')){ kbNav=true; b.focus(); } },60); }
function cafeUI(){ const inside=CAFE.st==='in', ph=CAFE.ph, cup=ph==='dive'||ph==='card'||ph==='rise', d=MENU[CAFE.dr];
  cafeEl.classList.toggle('on',inside&&!cup); el.classList.toggle('incup',CAFE.on&&cup);
  menuEl.classList.toggle('brew',ph==='brew'); menuEl.classList.toggle('served',ph==='served'); menuEl.classList.toggle('fold',ph==='served'&&CAFE.fold); moreBtn.hidden=!(ph==='served'&&CAFE.fold);
  /* what the barista last said (under their tag, Barista) */
  brewT.textContent=CAFE.bar.say?'\u201c'+CAFE.bar.say+'\u201d':''; menuEl.classList.toggle('said',!!CAFE.bar.say); lookBtn.hidden=ph!=='served';
  drinkB.forEach((b,i)=>{ b.disabled=ph==='brew'; b.classList.toggle('mine',(ph==='brew'||ph==='served')&&i===CAFE.dr); });
  if(CAFE.bdraw) CAFE.bdraw(); if(!CAFE.on) cupCard(false); }
/* ---------- pointing, inside: drag to look round; tap the board to order, the cup to look into it, the door to leave ---------- */
function cafeDown(e){ CAFE.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false}; }
function cafePick(e){ cNdc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)); cRay.setFromCamera(cNdc,stCam); cRay.layers.set(0);
  if(CAFE.st==='out') return cRay.intersectObject(CAFE.pick,false).length?{cafe:1}:null;
  const m=CAFE.m, h=cRay.intersectObjects([m.board,m.door,m.cup,m.foam],false)[0];
  if(!h){ /* the cup is small: near it on the screen is near enough */ if(CAFE.cup.at!=='serve') return null; const s=cafeDbg.screen('cup'); return Math.hypot(s[0]-e.clientX,s[1]-e.clientY)<Math.max(44,innerHeight*.06)?{cup:1}:null; }
  if(h.object===m.board){ const v=1-h.uv.y; for(let i=0;i<MENU.length;i++) if(Math.abs(v-(.37+i*.215))<.1) return {drink:i}; return null; }
  if(h.object===m.door) return {door:1};
  return {cup:1}; }
function cafeTapIn(e){ if(CAFE.st!=='in') return; const p=cafePick(e); if(!p) return;
  if(p.drink!=null&&(CAFE.ph==='menu'||CAFE.ph==='served')) cafeOrder(p.drink); else if(p.cup&&CAFE.ph==='served') cafeDive(); else if(p.door) cafeLeave(); }
/* from the street: tapping the café walks you over and in */
function cafeTap(e){ if(CAFE.st!=='out'||!CAFE.g||cbusy()) return; const P=player; if(Math.hypot(P.x-CAFE.x,P.z-CAFE.z)>26) return; if(cafePick(e)) cafeGo(); }
addEventListener('pointermove',e=>{ if(S.st!==st||S.mode!=='station'||!CAFE.g) return; const D=CAFE.drag;
  if(D&&e.pointerId===D.id){ if(Math.hypot(e.clientX-D.x,e.clientY-D.y)>(e.pointerType==='mouse'?6:9)) D.moved=true;
    if(D.moved&&CAFE.st==='in'&&CAFE.dv<=0){ CAFE.yaw=clamp(CAFE.yaw-(e.clientX-D.lx)*.0042,-2.95,2.95); CAFE.pitch=clamp(CAFE.pitch-(e.clientY-D.ly)*.0034,-.8,.65); CAFE.dragT=0; }
    D.lx=e.clientX; D.ly=e.clientY; return; }
  /* the cursor says what a click would do */
  if(e.pointerType!=='mouse'||(CAFE.st==='out'&&down)) return; let lab=null, hv=-1;
  if(CAFE.st==='in'&&(CAFE.ph==='menu'||CAFE.ph==='served'||CAFE.ph==='brew')){ const p=cafePick(e); if(p){ if(p.drink!=null&&CAFE.ph!=='brew'){ lab='Order'; hv=p.drink; } else if(p.cup&&CAFE.ph==='served') lab='Look in'; else if(p.door&&CAFE.ph!=='brew') lab='Leave'; } }
  else if(CAFE.st==='out'&&!cbusy()&&CAFE.g.visible&&Math.hypot(player.x-CAFE.x,player.z-CAFE.z)<26&&cafePick(e)&&!pickPerson(e)) lab='Go in';
  if(hv!==CAFE.hov){ CAFE.hov=hv; if(CAFE.bdraw) CAFE.bdraw(); }
  const ce=$('#cur'), ct=$('#curT'); if(!ce||!ct) return; if(lab){ ct.textContent=lab; ce.classList.add('big'); CAFE.cur=true; } else if(CAFE.cur){ ce.classList.remove('big'); CAFE.cur=false; } },{passive:true});
addEventListener('pointerup',e=>{ const D=CAFE.drag; if(!D||e.pointerId!==D.id) return; CAFE.drag=null; if(!D.moved&&S.st===st&&S.mode==='station') cafeTapIn(e); });
addEventListener('pointercancel',()=>{ CAFE.drag=null; });
addEventListener('pointerdown',()=>{ CAFE.kb=false; },true);   // a pointer, not the keys: focus is not moved for you
/* keys: by the door E or Enter goes in; inside Escape backs out of the cup or leaves, Enter looks into a served cup */
addEventListener('keydown',e=>{ if(S.st!==st||S.mode!=='station'||!CAFE.g) return; const k=e.code, ctl=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button');
  if(k==='Tab'||k==='Enter'||k==='Space'||k==='KeyE') CAFE.kb=true;
  if(CAFE.st==='out'||CAFE.st==='go'){
    if(CAFE.st==='go'&&k==='Escape'){ cset('out'); player.path=null; e.stopImmediatePropagation(); return; }
    if((k==='KeyE'||k==='Enter')&&!ctl&&!cbusy()&&CAFE_ON&&cafeAtDoor(1.6)&&!people.some(q=>Math.hypot(player.x-q.x,player.z-q.z)<3.4)){ cafeEnter(); e.preventDefault(); e.stopImmediatePropagation(); }
    return; }
  if(k==='Escape'){ if(CAFE.ph==='dive'||CAFE.ph==='card') cafeRise(); else if(CAFE.st==='in') cafeLeave(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if((k==='Enter'||k==='Space'||k==='KeyE')&&!ctl){ if(CAFE.st==='in'&&CAFE.ph==='served') cafeDive(); e.preventDefault(); e.stopImmediatePropagation(); } },true);
function cafeReset(leaving){ if(!CAFE.g) return; if(leaving&&CAFE.warm){ CAFE.warm=false; CAFE.meshes.forEach(m=>{ m.frustumCulled=true; }); }
  CAFE.drag=null; CAFE.curve=null; CAFE.wIn=null; CAFE.shut=0; CAFE.door=CAFE.doorV=CAFE.doorT=0; CAFE.k=0; cafeRest(); cset('out'); CU.uNr.value=.12; CDIN.value=0;
  if(stCam.near!==.1){ stCam.near=.1; stCam.updateProjectionMatrix(); } if(me) me.visible=true; inBtn.hidden=true; cupCard(false); }
const cafeDbg={C:CAFE,MENU,CP,BP,get state(){ return {st:CAFE.st,ph:CAFE.ph,dr:CAFE.dr,cup:CAFE.cup.at,fill:+CAFE.cup.fill.toFixed(2),art:+CAFE.cup.art.toFixed(2),door:+CAFE.door.toFixed(2),k:+CAFE.k.toFixed(3),
    card:cupEl.classList.contains('on'),me:me.visible,near:stCam.near,beat:CAFE.beat,bar:[+CAFE.bar.x.toFixed(2),+CAFE.bar.z.toFixed(2),CAFE.bar.R,CAFE.bar.L,+CAFE.bar.yaw.toFixed(2)],say:CAFE.bar.say,you:(({x,z})=>[+x.toFixed(2),+z.toFixed(2)])(cafeYou()),menu:cafeEl.classList.contains('on'),button:!inBtn.hidden}; },
  go:cafeGo,enter:cafeEnter,leave:cafeLeave,order:cafeOrder,dive:cafeDive,rise:cafeRise,local:(x,z)=>cxz(x,z),
  run(sec,fps=30){ for(let i=0;i<Math.round(sec*fps);i++){ S.t+=1/fps; st.update(1/fps,S.t); } },
  /* where on the screen a drink on the board, the cup and the door are (for a test to tap them) */
  screen(what){ stCam.updateMatrixWorld(); const p=what==='cup'?cw(CAFE.cup.p.x,CAFE.cup.p.y+.06,CAFE.cup.p.z,cV):what==='door'?cw(0,1.1,CAFE.d/2-.04,cV):cw(-.12,1.95+.405-(.37+what*.215)*.81,-CAFE.d/2+.08+.07,cV);
    const v=p.project(stCam); return [(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight,v.z]; }};
/* ---------- birds circling over town ---------- */
const BIRDS=[], BU=new T.Vector3();
function buildBirds(){ for(let i=0;i<6;i++){ const g=new T.Group(), wl=mesh(BOXG,'#3b3a3c',-.17,0,0,.34,.02,.09), wr=mesh(BOXG,'#3b3a3c',.17,0,0,.34,.02,.09); g.add(wl,wr,mesh(BOXG,'#3b3a3c',0,0,0,.07,.05,.16)); sc.add(g);
  BIRDS.push({g,wl,wr,c:[(rnd()-.5)*16,(rnd()-.5)*16],r:3+rnd()*5,h:6+rnd()*4,sp:(.25+rnd()*.25)*(rnd()<.5?-1:1),ph:rnd()*TAU}); } }

/* ---------- drawing: the sun's shadow map once, then every frame the ink buffer, the colour, and the two together ---------- */
const INK=[], inkC=new Map(), shdC=new Map();
const variant=(cache,m,frag,side)=>{ let k=cache.get(m); if(!k){ k=new T.ShaderMaterial({uniforms:m.uniforms,vertexShader:m.vertexShader,fragmentShader:frag,side:side??m.side,vertexColors:m.vertexColors}); cache.set(m,k); } return k; };
function registerInk(){ sc.traverse(o=>{ if(!o.isMesh||!o.layers.isEnabled(0)||!o.material.isShaderMaterial||o.userData.noInk===true) return;
  o.userData.col=o.material; o.userData.inkM=variant(inkC,o.material,INK_F); o.userData.shdM=variant(shdC,o.material,SHD_F,T.DoubleSide);
  if(o.userData.cast&&!o.userData.dyn) o.layers.enable(2); INK.push(o); }); }
const shRT=new T.WebGLRenderTarget(SHN,SHN,{depthBuffer:true}); shRT.depthTexture=new T.DepthTexture(SHN,SHN); LU.uShM.value=shRT.depthTexture;
const shCam=new T.OrthographicCamera(-30,30,30,-30,1,160);
let baked=false;
function bakeShadow(){ shCam.position.set(0,R,0).addScaledVector(SUN,80); shCam.lookAt(0,R,0); shCam.updateMatrixWorld(); shCam.updateProjectionMatrix(); shCam.layers.set(2);
  LU.uShP.value.multiplyMatrices(shCam.projectionMatrix,shCam.matrixWorldInverse); LU.uShOn.value=0;
  for(const m of INK) m.material=m.userData.shdM; renderer.setRenderTarget(shRT); renderer.setClearColor(0xffffff,1); renderer.clear(); renderer.render(sc,shCam); for(const m of INK) m.material=m.userData.col;
  renderer.setClearColor(0,1); LU.uShOn.value=1; baked=true; }
const inkRT=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true});
const colRT=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,depthBuffer:true,samples:LO?0:4});
const compM=new T.ShaderMaterial({uniforms:{tC:{value:colRT.texture},tN:{value:inkRT.texture},uRes:{value:new T.Vector2(1,1)},uPx:{value:1}},depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`uniform sampler2D tC,tN; uniform vec2 uRes; uniform float uPx; varying vec2 vUv; ${N2}
    float zOf(float a){ return a>0.?1./a-1.:1e4; }
    void main(){ vec4 c0=texture2D(tN,vUv); float z0=zOf(c0.a); vec3 n0=c0.rgb*2.-1.; vec2 asp=vec2(uRes.x/uRes.y,1.);
      vec2 wob=(vec2(vn2(vUv*asp*60.),vn2(vUv*asp*60.+5.2))-.5)*1.6*uPx/uRes;   // the pen wanders a little
      float w=uPx*mix(1.55,.8,smoothstep(3.,34.,min(z0,60.))), e=0.;
      for(int k=0;k<8;k++){ float a=float(k)*.785398; vec2 o=vec2(cos(a),sin(a))*w/uRes+wob; vec4 s=texture2D(tN,vUv+o); float z=zOf(s.a);
        float de=smoothstep(.045,.1,abs(z-z0)/max(min(z,z0),.1));
        float ne=(s.a>0.&&c0.a>0.)?smoothstep(.24,.46,1.-dot(s.rgb*2.-1.,n0)):0.; e=max(e,max(de,ne)); }
      vec3 col=texture2D(tC,vUv).rgb; col=mix(col,mix(vec3(.15,.14,.16),col*.3,.3),e*.9);
      col*=.972+.04*(vn2(vUv*uRes/2.4)*.6+vn2(vUv*uRes/9.)*.4);   // paper
      gl_FragColor=vec4(col,1.); }`});
const compS=new T.Scene(), compCam=new T.OrthographicCamera(-1,1,1,-1,0,1); { const q=new T.Mesh(new T.PlaneGeometry(2,2),compM); q.frustumCulled=false; compS.add(q); }
st.render=function(rt){ if(!st.built){ renderer.setRenderTarget(rt); renderer.clear(); return; }
  const w=rt.width, h=rt.height; if(inkRT.width!==w||inkRT.height!==h){ inkRT.setSize(w,h); colRT.setSize(w,h); }
  compM.uniforms.uRes.value.set(w,h); compM.uniforms.uPx.value=Math.max(1,h/820);
  if(!baked) bakeShadow();
  for(const m of INK) m.material=m.userData.inkM; stCam.layers.set(0);
  renderer.setRenderTarget(inkRT); renderer.setClearColor(0,0); renderer.clear(); renderer.render(sc,stCam);
  for(const m of INK) m.material=m.userData.col; stCam.layers.enable(1); renderer.setClearColor(0,1);
  renderer.setRenderTarget(colRT); renderer.clear(); renderer.render(sc,stCam); stCam.layers.set(0);
  renderer.setRenderTarget(rt); renderer.render(compS,compCam); };

/* ---------- roads: a ribbon with kerbs and pavements, lines painted on ---------- */
function ribbon(pts,closed,hw=RW,sw=SW){ const n=pts.length, side=[];
  for(let i=0;i<n;i++){ const a=closed?pts[(i-1+n)%n]:pts[Math.max(0,i-1)], b=closed?pts[(i+1)%n]:pts[Math.min(n-1,i+1)], tx=b[0]-a[0], tz=b[1]-a[1], L=Math.hypot(tx,tz)||1; side.push([-tz/L,tx/L]); }
  const P=(i,lat,h)=>at(pts[i][0]+side[i][0]*lat,pts[i][1]+side[i][1]*lat,new T.Vector3()).multiplyScalar(R+h);
  const strips=[[-hw-sw,0,-hw-sw,CURB,'#d9d2c4',-1],[-hw-sw,CURB,-hw,CURB,'#d3ccbe',0],[-hw,CURB,-hw,ROADH,'#e6e0d4',1],[-hw,ROADH,hw,ROADH,'#7f878b',0],[hw,ROADH,hw,CURB,'#e6e0d4',-1],[hw,CURB,hw+sw,CURB,'#d3ccbe',0],[hw+sw,CURB,hw+sw,0,'#d9d2c4',1]];
  const segs=closed?n:n-1, nrm=new T.Vector3(); let along=0;
  for(let i=0;i<segs;i++){ const j=(i+1)%n, sl=Math.hypot(pts[j][0]-pts[i][0],pts[j][1]-pts[i][1]);
    for(const [l0,h0,l1,h1,c,sd] of strips){ const a=P(i,l0,h0), b=P(j,l0,h0), cc=P(j,l1,h1), d=P(i,l1,h1);
      if(sd===0) nrm.copy(a).normalize(); else nrm.copy(P(i,l0+.05,h0)).sub(P(i,l0,h0)).normalize().multiplyScalar(sd);
      kquad(a,b,cc,d,nrm,c); }
    nrm.copy(P(i,0,0)).normalize();
    if(hw>1&&(along%2.1)<1) kquad(P(i,-.06,ROADH+.006),P(j,-.06,ROADH+.006),P(j,.06,ROADH+.006),P(i,.06,ROADH+.006),nrm,'#f1ecdf');
    for(const s of [-1,1]) kquad(P(i,s*(hw-.26),ROADH+.006),P(j,s*(hw-.26),ROADH+.006),P(j,s*(hw-.18),ROADH+.006),P(i,s*(hw-.18),ROADH+.006),nrm,'#e9e4d8');
    along+=sl; } }
function zebra(lp){ let bi=0,bd=1e9; lp.forEach((p,i)=>{ const d=Math.hypot(p[0]-SPUR[0][0],p[1]-(SPUR[0][1]+2)); if(d<bd){ bd=d; bi=i; } });
  const a=lp[(bi-2+lp.length)%lp.length], b=lp[(bi+2)%lp.length], c=lp[bi], tx=b[0]-a[0], tz=b[1]-a[1], L=Math.hypot(tx,tz), ux=tx/L, uz=tz/L, up=at(c[0],c[1]);
  for(let k=-2;k<=2;k++){ const lat=k*.42, x0=c[0]-uz*lat, z0=c[1]+ux*lat; const Pq=(al,dl)=>at(x0+ux*al-uz*dl,z0+uz*al+ux*dl,new T.Vector3()).multiplyScalar(R+ROADH+.008);
    kquad(Pq(-.9,-.12),Pq(.9,-.12),Pq(.9,.12),Pq(-.9,.12),up,'#f1ecdf'); } }

/* ---------- build, in steps so the loader keeps breathing ---------- */
st.build=async function(){
  buildGround(); await nextFrame();
  const loop=new T.CatmullRomCurve3(LOOP.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal'), lp=loop.getSpacedPoints(Math.round(loop.getLength()/.35)).slice(0,-1).map(p=>[p.x,p.z]);
  ROADS.push(lp.concat([lp[0]]),[SPUR[0],SPUR[1]]); ribbon(lp,true); ribbon([SPUR[0],[SPUR[0][0],(SPUR[0][1]+SPUR[1][1])/2],SPUR[1]],false,.95,.75); zebra(lp);
  SEGS.push([0,-6.4,0,-1.5,.6],[0,1.5,0,8.3,.6],[-7.7,0,-1.5,0,.6],[1.5,0,8,0,.6]);
  buildTown(); await nextFrame(); buildNature(); buildPeople(); buildBirds(); buildRocket(); buildLaunchFlame(); buildNav(); buildSkyFx(); buildSteer(); buildCafe();
  buildCliff();   // the bench and the kite on the cliff: after the town and its trees, so nothing of theirs moves (see the cliff, below)
  SEGS.slice(0,12).forEach((s,i)=>{ SEGU.value[i].set(s[0],s[1],s[2],s[3]); SEGW.value[i]=s[4]; });
  buildBusker();   // Diarmuid outside the café (after the walking grid, which he marks his own spot on)
  const kitM=toonMat('#ffffff',{vc:true,side:T.DoubleSide,fresh:true}); kitM.uniforms.uKit={value:1}; kitM.uniforms.uHoleOn={value:1};   // the seasons, snow, rain and lit windows are the kit's; it takes the launch scene's cut, the pad being in it
  for(const id in KITS){ const k=KITS[id]; if(!k.P.length) continue; const kg=new T.BufferGeometry(); kg.setAttribute('position',new T.Float32BufferAttribute(k.P,3)); kg.setAttribute('normal',new T.Float32BufferAttribute(k.N,3)); kg.setAttribute('color',new T.Float32BufferAttribute(k.C,3));
    const kit=new T.Mesh(kg,kitM); kit.frustumCulled=false; kit.userData.cast=true; (MK[id]?MK[id].g:sc).add(kit); k.P.length=k.N.length=k.C.length=0; }
  kitTo();
  registerInk(); st.built=true; };

/* ---------- walking on a sphere ---------- */
const player={u:at(START[0],START[1]),f:new T.Vector3(0,0,1),tgt:null,speed:0,ph:0,step:0,h:0,x:START[0],z:START[1]};
/* ---------- the camera: an orbit rig round a point at your head. Everything about it is smoothed in its own terms (which way
   it looks, how far down, how far back, what it centres on), so it never cuts a corner, bobs on a kerb or swings about.
   It follows lazily when you walk forward and holds still when you step sideways or back; it never fights a drag; it only
   comes in for houses and big landmarks, and trees or poles between it and you fade out instead. ---------- */
const C={f:new T.Vector3(0,0,1),pitch:.34,pEff:.34,dist:4.6,zoom:1,dragT:9,tgt:new T.Vector3(),mid:new T.Vector3(),camH:0,tk:0,tf:new T.Vector3(),PITCH:.34,HEAD:1.15,
  D0:()=>(innerHeight>innerWidth?5.6:4.6)*C.zoom};
function rigPose(target,u,f,pitch,dist,oP,oL){ oP.copy(target).addScaledVector(f,-Math.cos(pitch)*dist).addScaledVector(u,Math.sin(pitch)*dist); return oL&&oL.copy(target).addScaledVector(f,1.6).addScaledVector(u,-.25); }
/* how far back the rig can sit before a house or a big landmark is in the way of the line to your head */
function rigLimit(px,pz,u,f,pitch,D){ const cp=Math.cos(pitch), tp=Math.tan(pitch); let lim=D*cp;
  const [cx,cz]=loc(V.copy(u).multiplyScalar(R).addScaledVector(f,-1).normalize()), bx=cx-px, bz=cz-pz, bl=Math.hypot(bx,bz)||1, ux=bx/bl, uz=bz/bl;
  for(const o of OBS){ if(o.r<.6||o.h<1.8) continue; const ox=o.x-px, oz=o.z-pz, tt=ox*ux+oz*uz; if(tt<.2||tt>lim+o.r) continue; if(C.HEAD+tt*tp>o.h+.15) continue;
    const dd=Math.abs(ox*uz-oz*ux); if(dd<o.r+.35) lim=Math.min(lim,Math.max(1.5,tt-Math.sqrt(Math.max(0,(o.r+.35)**2-dd*dd))-.3)); }
  return lim/cp; }
function rot(f,u,a){ V.crossVectors(u,f); return f.multiplyScalar(Math.cos(a)).addScaledVector(V,Math.sin(a)).normalize(); }
function walk(P,dist){ const th=dist/R, c=Math.cos(th), s=Math.sin(th); V.copy(P.u); P.u.multiplyScalar(c).addScaledVector(P.f,s).normalize(); P.f.multiplyScalar(c).addScaledVector(V,-s); P.f.addScaledVector(P.u,-P.u.dot(P.f)).normalize(); }
const tang=(u,to,o)=>o.copy(to).addScaledVector(u,-u.dot(to)).normalize();
function walkable(x,z){ if(onJetty(x,z)) return true; const h=grid(GH,x,z); if(h>-.04) return true; return grid(GB,x,z)>.45&&h>-.72; }
/* ---------- finding the way: a grid over the town, so walking over to someone goes round houses, fences and the water ---------- */
const NAV={S:.4,O:-23,N:0,free:null};
function buildNav(){ const S=NAV.S, N=NAV.N=Math.ceil(-2*NAV.O/S)+1, f=NAV.free=new Uint8Array(N*N), fixed=OBS.filter(o=>!people.some(p=>p.ob===o));
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const x=NAV.O+i*S, z=NAV.O+j*S; let ok=walkable(x,z);
    if(ok) for(const o of fixed){ const dx=x-o.x, dz=z-o.z, m=o.r+.3; if(dx*dx+dz*dz<m*m){ ok=false; break; } }
    f[j*N+i]=ok?1:0; } }
const navIJ=(x,z)=>[clamp(Math.round((x-NAV.O)/NAV.S),0,NAV.N-1),clamp(Math.round((z-NAV.O)/NAV.S),0,NAV.N-1)];
const navOK=(i,j)=>i>=0&&j>=0&&i<NAV.N&&j<NAV.N&&NAV.free[j*NAV.N+i]===1;
function navNear(i,j){ if(navOK(i,j)) return [i,j]; for(let r=1;r<10;r++) for(let dj=-r;dj<=r;dj++) for(let di=-r;di<=r;di++) if(Math.max(Math.abs(di),Math.abs(dj))===r&&navOK(i+di,j+dj)) return [i+di,j+dj]; return null; }
function navClear(x0,z0,x1,z1){ const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/(NAV.S*.45)); for(let k=1;k<n;k++){ const t=k/n, [i,j]=navIJ(x0+(x1-x0)*t,z0+(z1-z0)*t); if(!navOK(i,j)) return false; } return true; }
/* from (x0,z0) to a spot between 1 m and reach of (gx,gz): A* over the grid, then pulled tight so it walks straight wherever it can */
function navPath(x0,z0,gx,gz,reach){ if(!NAV.free) return null; const N=NAV.N, S=NAV.S, s=navNear(...navIJ(x0,z0)); if(!s) return null;
  const xy=k=>[NAV.O+(k%N)*S,NAV.O+Math.floor(k/N)*S], dG=(i,j)=>Math.hypot(NAV.O+i*S-gx,NAV.O+j*S-gz), H=(i,j)=>Math.max(0,dG(i,j)-reach);
  const g=new Float32Array(N*N).fill(1e9), from=new Int32Array(N*N).fill(-1), shut=new Uint8Array(N*N), heap=[];
  const push=(f,k)=>{ heap.push([f,k]); let c=heap.length-1; while(c>0){ const q=(c-1)>>1; if(heap[q][0]<=heap[c][0]) break; [heap[q],heap[c]]=[heap[c],heap[q]]; c=q; } };
  const pop=()=>{ const top=heap[0], l=heap.pop(); if(heap.length){ heap[0]=l; let c=0; for(;;){ const a=2*c+1, b=a+1; let m=c; if(a<heap.length&&heap[a][0]<heap[m][0]) m=a; if(b<heap.length&&heap[b][0]<heap[m][0]) m=b; if(m===c) break; [heap[m],heap[c]]=[heap[c],heap[m]]; c=m; } } return top; };
  const k0=s[1]*N+s[0]; g[k0]=0; push(H(s[0],s[1]),k0); let end=-1, it=0;
  while(heap.length&&it++<25000){ const k=pop()[1]; if(shut[k]) continue; shut[k]=1; const i=k%N, j=(k-i)/N, dg=dG(i,j);
    if(dg<=reach&&dg>=1){ end=k; break; }
    for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ if(!di&&!dj) continue; const ni=i+di, nj=j+dj; if(!navOK(ni,nj)) continue;
      if(di&&dj&&(!navOK(i+di,j)||!navOK(i,j+dj))) continue;   // never across a corner
      const nk=nj*N+ni, ng=g[k]+(di&&dj?1.4142:1)*S; if(ng<g[nk]){ g[nk]=ng; from[nk]=k; push(ng+H(ni,nj),nk); } } }
  if(end<0) return null;
  const cells=[]; for(let k=end;k>=0;k=from[k]) cells.push(xy(k)); cells.reverse();
  const out=[]; let a=[x0,z0];   // pulled tight: from each corner, the farthest point along the way that it can see
  for(let k=1;k<cells.length;){ let far=k; for(let m=cells.length-1;m>k;m--) if(navClear(a[0],a[1],cells[m][0],cells[m][1])){ far=m; break; } a=cells[far]; out.push(a); k=far+1; }
  return out.length?out:[cells[cells.length-1]]; }
const ray=new T.Raycaster(), ndc=new T.Vector2(), ball=new T.Sphere(new T.Vector3(),R), hits=[];
function pickPerson(e){ ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); hits.length=0; ray.layers.set(0);
  let hit=null; ray.intersectObjects(people.map(p=>p.g),true,hits); for(const h of hits){ let o=h.object; while(o&&!people.some(p=>p.g===o)) o=o.parent; if(o){ hit=people.find(p=>p.g===o); break; } }
  /* or near enough: within a body's width of the line from their feet to their head, as the screen sees it; when two are
     in the same place on the screen, the nearer one is the one you mean */
  let best=null, bd=1; for(const p of people){ const h0=R+standH(p.x,p.z), f=V.copy(p.dir).multiplyScalar(h0).project(stCam); if(f.z>1) continue;
    const fx=(f.x*.5+.5)*innerWidth, fy=(-f.y*.5+.5)*innerHeight, hd=V.copy(p.dir).multiplyScalar(h0+1.6).project(stCam), hx=(hd.x*.5+.5)*innerWidth, hy=(-hd.y*.5+.5)*innerHeight;
    const ex=hx-fx, ey=hy-fy, L2=ex*ex+ey*ey||1, t=clamp(((e.clientX-fx)*ex+(e.clientY-fy)*ey)/L2,0,1), dd=Math.hypot(e.clientX-fx-ex*t,e.clientY-fy-ey*t), r=Math.max(26,Math.sqrt(L2)*.34);
    if(dd/r<bd){ bd=dd/r; best=p; } }
  if(hit&&best&&best!==hit&&bd<.6){ const cp=stCam.position; if(V.copy(best.dir).multiplyScalar(R).distanceTo(cp)<V2.copy(hit.dir).multiplyScalar(R).distanceTo(cp)) return best; }
  return hit||best; }
let down=null, look=null, hov=null, started=false, cardT=0;
const stick=$('#crStick',el), stickI=$('#crStick i',el);
function stickOff(){ stick.hidden=true; stickI.style.transform=''; }
st.onPointer=function(e){ if(FIN.on) return; if(CUT.on){ skipCut(); return; } if(PHS.on){ PHS.drag={x:e.clientX,id:e.pointerId,t:performance.now()}; return; } if(CAFE.on){ cafeDown(e); return; } if(down&&down.touch&&e.pointerType!=='mouse'){ look={id:e.pointerId,lx:e.clientX,ly:e.clientY}; return; } down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,id:e.pointerId,moved:false,touch:e.pointerType!=='mouse',ix:0,iz:0};
  if(down.touch){ stick.hidden=false; stick.style.left=e.clientX+'px'; stick.style.top=e.clientY+'px'; stickI.style.transform=''; } };
const turnBy=(dx,dy)=>{ rot(C.f,player.u,-dx*.0052); C.pitch=clamp(C.pitch-dy*.0038,.08,1); C.dragT=0; };
addEventListener('pointermove',e=>{ if(S.st!==st||S.mode!=='station') return;
  if(PHS.drag&&e.pointerId===PHS.drag.id){ const dx=e.clientX-PHS.drag.x, now=performance.now(), dtm=Math.max(8,now-PHS.drag.t); PHS.drag.x=e.clientX; PHS.drag.t=now; const d=-dx*.0065; PHS.yaw+=d; PHS.v=clamp(d/(dtm/1000),-4,4); if(Math.abs(d)>0){ PHS.turned+=Math.abs(d); if(PHS.turned>.21){ PHS.turned=0; A.tick(); } } return; }
  if(look&&e.pointerId===look.id){ turnBy(e.clientX-look.lx,e.clientY-look.ly); look.lx=e.clientX; look.ly=e.clientY; return; }
  if(down&&e.pointerId===down.id){ const dx=e.clientX-down.lx; if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>(down.touch?8:13)) down.moved=true;
    if(down.touch){ const sx=clamp(e.clientX-down.x,-50,50), sy=clamp(e.clientY-down.y,-50,50); stickI.style.transform=`translate(${sx}px,${sy}px)`; down.ix=sx/50; down.iz=-sy/50; if(down.moved) began(); }
    else if(down.moved){ turnBy(dx,e.clientY-down.ly); began(); }
    down.lx=e.clientX; down.ly=e.clientY; }
  if(e.pointerType==='mouse'&&!down&&!CAFE.on){ const p=pickPerson(e); if(p!==hov){ hov=p; const ce=$('#cur'), ct=$('#curT'); if(ce&&ct){ if(p){ ct.textContent='Say hello'; ce.classList.add('big'); } else ce.classList.remove('big'); } } } },{passive:true});
addEventListener('pointerup',e=>{ if(PHS.drag&&e.pointerId===PHS.drag.id){ PHS.drag=null; return; } if(look&&e.pointerId===look.id){ look=null; return; } if(S.st!==st||!down||e.pointerId!==down.id) return; const d=down; down=null; stickOff(); if(d.moved||S.mode!=='station'||CUT.on) return;
  if(CL.tap&&CL.tap.id===e.pointerId&&CL.tap.stood) return;   // (the tap that stands you up from the bench does only that: it does not also send you off to the café, him, or one of us)
  if(TALK.p){ nextTalk(); return; }   // talking, a click anywhere goes on
  const p=pickPerson(e); if(buskTap(e,p)) return; if(p) goTalk(p); else cafeTap(e); });
addEventListener('pointercancel',()=>{ down=null; look=null; PHS.drag=null; stickOff(); });
$('#crSkip',el).addEventListener('click',e=>{ e.stopPropagation(); skipCut(); });
addEventListener('wheel',e=>{ if(S.st!==st||S.mode!=='station'||CUT.on||S.wheelSettle) return; C.zoom=clamp(C.zoom*Math.exp(e.deltaY*.0008),.7,1.6); },{passive:true});
function began(){ if(started) return; started=true; el.classList.add('walked'); hint.classList.add('gone'); }

/* ---------- talking ---------- */
const tk=$('#crTalk',el), tkN=$('#crTkN',el), tkImg=$('#crImg',el), tkLink=$('#crLink',el), goBtn=$('#crGo',el);
/* the words typed so far, and the rest of the line held in place unseen, so the box is the size of the whole line from the first letter */
const tkT=$('#crTkT',el), tkS=$('#crTkS',el), tkR=$('#crTkR',el), say=n=>{ tkS.textContent=TALK.txt.slice(0,n); tkR.textContent=TALK.txt.slice(n); };
/* and the box hugs the words: the narrowest width that still takes no more lines than the line needs at full width */
function hug(){ tkT.style.width=''; const h=tkT.offsetHeight, w=tkT.offsetWidth; if(!w||!h) return; let lo=w*.35, hi=w;
  for(let k=0;k<9;k++){ const m=(lo+hi)/2; tkT.style.width=m+'px'; if(tkT.offsetHeight>h) lo=m; else hi=m; } tkT.style.width=Math.ceil(hi)+1+'px'; }
addEventListener('resize',()=>{ if(TALK.p) hug(); });
const PJ={el:$('#crProj',el),n:$('#crProj .crpj-n',el),k:$('#crProj .crpj-k',el),t:$('#crProj .crpj-t',el),l:$('#crProj .crpj-l',el),id:null,want:null,dw:0};
PJ.el.addEventListener('click',e=>e.stopPropagation());
const TALK={p:null,i:0,shown:0,txt:'',acc:0,L:null,ask:false,goal:null};
const allMet=()=>MET.size>=3;
function page(){ const p=TALK.p, L=TALK.L, last=TALK.i>=L.length-1; TALK.txt=L[TALK.i]; TALK.shown=0; TALK.acc=0; say(0);
  tk.classList.toggle('last',last&&!TALK.ask&&!p.guest); tk.classList.toggle('ask',last&&TALK.ask); tk.classList.add('typing');
  if(last&&!TALK.ask&&!p.guest){ MET.add(p.i); p.resume=0; tkImg.src=PHOTOS[p.i]||''; tkImg.alt=p.name; tkLink.href=p.li; tkLink.setAttribute('aria-label',p.name+' on LinkedIn'); }
  hug(); }
function openTalk(p,i=0,L=null){ TALK.ask=!!L; TALK.walkT=0; TALK.held='?'; TALK.p=p; player.path=null; player.speed=0; TALK.L=L||p.lines; TALK.i=Math.min(i,TALK.L.length-1); TALK.goal=null; C.guide=null;
  tkN.textContent=!TALK.ask&&TALK.i>=TALK.L.length-1?p.name:p.first; page(); tk.classList.add('on'); tk.setAttribute('aria-hidden','false'); p.greeted=true; p.wave=1.6;
  player.tgt=null; A.chime(5+p.i*2,0,.035); began(); }
function nextTalk(){ if(!TALK.p) return; if(TALK.shown<TALK.txt.length){ TALK.shown=TALK.txt.length; say(TALK.shown); tk.classList.remove('typing'); return; }
  if(TALK.i<TALK.L.length-1){ TALK.i++; if(TALK.i>=TALK.L.length-1&&!TALK.ask) tkN.textContent=TALK.p.name; page(); A.tick(); } else if(!TALK.ask) closeTalk(true); }
/* closing a conversation: if someone is still to meet, the camera turns gently toward them; once all three are met, Ahroon comes over */
function closeTalk(done=false){ if(!TALK.p) return; const was=TALK.p, ask=TALK.ask; if(!ask&&!MET.has(was.i)) was.resume=TALK.i;
  TALK.p=null; TALK.ask=false; tk.classList.remove('on','last','ask','typing'); tk.setAttribute('aria-hidden','true');
  if(was.guest){ if(was.onClose) was.onClose(done); return; }   // (someone in town who is not one of the three: nothing to count, nobody to turn to next)
  if(ask){ AH.heard=true; if(GLN.t>=0) GLN.t=Math.max(GLN.t,G_IN+G_HOLD-.2); if(AH.st==='wait') ahroonCome(); return; }
  if(FIN.on) return;
  const left=people.filter(q=>!MET.has(q.i));
  if(left.length&&done){ const P=player; C.guide={p:left.reduce((a,b)=>Math.hypot(P.x-a.x,P.z-a.z)<Math.hypot(P.x-b.x,P.z-b.z)?a:b),t:1.8}; }
  if(!left.length&&AH.st==='home') { AH.st='wait'; AH.t=was.i===0?.6:.9; } }
/* say hello: from far away you walk over by yourself; close up the conversation opens. Someone you have met shows you their page */
function talkTo(p){ TALK.goal=null; if(p.i===0&&allMet()) return openInvite(); openTalk(p,MET.has(p.i)?p.lines.length-1:(p.resume||0)); }
/* walking over to someone: the way round, found on the grid; straight at them only if there is no way round */
function walkTo(p){ const P=player, path=navPath(P.x,P.z,p.x,p.z,1.8); P.goalX=p.x; P.goalZ=p.z;
  if(path){ P.path=path; P.tgt=null; return true; }
  const d=Math.hypot(P.x-p.x,P.z-p.z)||1, ux=(P.x-p.x)/d, uz=(P.z-p.z)/d; P.path=null; P.tgt=at(p.x+ux*1.6,p.z+uz*1.6).multiplyScalar(R); return false; }
function goTalk(p){ if(FIN.on||CUT.on||TALK.p||GLN.t>=0) return; const P=player, d=Math.hypot(P.x-p.x,P.z-p.z);
  if(d<2.6) return talkTo(p);
  walkTo(p); TALK.goal=p; P.stuck=0; P.tries=0; began(); A.tick(); }
labels.forEach((lb,i)=>lb.addEventListener('click',e=>{ e.stopPropagation(); if(S.st===st&&S.mode==='station'&&people[i]) goTalk(people[i]); }));
$('#crTkB',el).addEventListener('click',e=>{ if(e.target.closest('a,button')) return; nextTalk(); });
$('#crNext',el).addEventListener('click',e=>{ e.stopPropagation(); nextTalk(); });   // the arrow: the next line (it is a button, so the box's own click leaves it alone)
$('#crClose',el).addEventListener('click',e=>{ e.stopPropagation(); closeTalk(true); });
$('#crFly',el).addEventListener('click',e=>{ e.stopPropagation(); if(TALK.ask) startFinale(); });
$('#crNot',el).addEventListener('click',e=>{ e.stopPropagation(); closeTalk(); });
goBtn.addEventListener('click',e=>{ e.stopPropagation(); if(allMet()&&!FIN.on) startFinale(); });
addEventListener('keydown',e=>{ if(S.st!==st||S.mode!=='station') return;
  if(FIN.on){ if(FIN.pre){ if(e.code==='Escape'&&!e.repeat) csSkip(); } else if(LKEYS.includes(e.code)) launchHold(true); e.preventDefault(); e.stopImmediatePropagation(); return; }   // the last flight takes no keys but the launch (and Escape, to skip the launch scene)
  if(CUT.on){ skipCut(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if(TALK.p&&e.code==='Escape'){ closeTalk(); e.stopImmediatePropagation(); return; }
  if(PHS.on&&e.code==='Escape'){ steerSet(false); e.stopImmediatePropagation(); return; }
  if(PC.on&&e.code==='Escape'){ pcOpen(false); e.stopImmediatePropagation(); return; }
  if(!pcCard.hidden&&e.code==='Escape'){ pcCard.hidden=true; e.stopImmediatePropagation(); return; }
  if(PC.on&&(e.code==='Space'||e.code==='Enter')&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button'))){ pcTake(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if(e.code==='KeyP'&&!TALK.p&&!PHS.on&&!pcBtn.hidden){ pcOpen(!PC.on); e.stopImmediatePropagation(); return; }
  if(!TALK.p&&GLN.t<0&&(e.code==='KeyE'||e.code==='Enter')&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button'))){
    const P=player; let best=null, bd=3.4; for(const q of people){ const dq=Math.hypot(P.x-q.x,P.z-q.z); if(dq<bd){ bd=dq; best=q; } }
    if(best){ talkTo(best); e.preventDefault(); e.stopImmediatePropagation(); return; } }
  if(TALK.p&&(e.code==='Space'||e.code==='Enter'||e.code==='KeyE')&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button'))){
    if(TALK.ask&&TALK.i>=TALK.L.length-1&&TALK.shown>=TALK.txt.length&&e.code!=='KeyE'){ startFinale(); } else nextTalk(); e.preventDefault(); e.stopImmediatePropagation(); } },true);

/* ---------- once you have met all three of us, Ahroon has one more thing. The camera goes over to him for a moment (he waves),
   and as it comes back to you he sets off across town to find you, his name calling, and asks when he gets there.
   Close enough to see him, he just waves and comes over; right beside you, he asks ---------- */
const INVITE=['That\'s all three of us. One more thing: she\'s got one flight left in her. Want to see what she can really do?'];
const AH={st:'home',t:0,heard:false,asked:false,ph:0,turn:0,chk:0,lx:0,lz:0};
const GLN={t:-1,d:0,P:new T.Vector3(),L:new T.Vector3(),U:new T.Vector3(),q:new T.Vector3()};
const G_IN=.8, G_HOLD=2.05, G_OUT=.7;   // the flight over, the look at him, the flight back
function openInvite(){ AH.asked=true; openTalk(people[0],0,INVITE); }
function ahroonHome(){ const a=people[0]; if(!a) return; [a.x,a.z]=AHR; a.dir=at(a.x,a.z); if(a.ob){ a.ob.x=a.x; a.ob.z=a.z; } a.walk=0; GLN.t=-1; AH.asked=false; AH.st=allMet()?'wait':'home'; AH.t=allMet()?1.2:0; }
function ahroonCome(){ const a=people[0]; AH.st='come'; AH.chk=0; AH.rp=0; AH.path=null; AH.lx=a.x; AH.lz=a.z; }
function ahroonUpdate(dt){ const a=people[0], P=player; if(!a) return; if(FIN.on||CUT.on||CAFE.on){ a.walk=0; return; }
  const d=Math.hypot(P.x-a.x,P.z-a.z);
  if(AH.st==='wait'){ a.walk=0; if(TALK.p) return; AH.t-=dt; if(AH.t>0) return;
    if(d<7){ AH.st='here'; a.wave=2; openInvite(); return; }   // close enough: he just asks
    AH.st='look'; glanceStart(d); return; }                     // too far: the camera goes over to him and he asks from there
  if(AH.st==='look'){ a.walk=0; if(!AH.asked&&GLN.t>=G_IN*.85) openInvite(); if(GLN.t<0) ahroonCome(); return; }
  if(AH.st!=='come'){ a.walk=damp(a.walk||0,0,6,dt); return; }
  if(TALK.p){ a.walk=0; return; }
  if(d<2.1){ a.walk=0; AH.st='here'; a.wave=1.4; if(!AH.asked) openInvite(); else a.greeted=true; return; }   // he has asked already: he waits by you, and Let's fly stays on screen
  AH.rp=(AH.rp||0)-dt; if(AH.rp<=0||!AH.path||!AH.path.length){ AH.rp=.9; AH.path=navPath(a.x,a.z,P.x,P.z,1.9)||[[P.x,P.z]]; }
  let [wx,wz]=AH.path[0]; if(Math.hypot(wx-a.x,wz-a.z)<.4&&AH.path.length>1){ AH.path.shift(); [wx,wz]=AH.path[0]; }
  const dw=Math.hypot(wx-a.x,wz-a.z)||1, dx=(wx-a.x)/dw, dz=(wz-a.z)/dw;
  const sp=Math.min(3.3,.9+d*.5); let nx=a.x+dx*sp*dt, nz=a.z+dz*sp*dt;
  for(const o of OBS){ if(o===a.ob) continue; const ex=nx-o.x, ez=nz-o.z, dd=Math.hypot(ex,ez), m=o.r+.3; if(dd<m&&dd>1e-4){ nx=o.x+ex/dd*m; nz=o.z+ez/dd*m; } }
  if(!walkable(nx,nz)){ AH.rp=0; a.walk=0; return; }
  a.x=nx; a.z=nz; a.dir=at(nx,nz); if(a.ob){ a.ob.x=nx; a.ob.z=nz; } a.walk=sp; a.ph=(a.ph||0)+dt*sp*4.6;
  AH.chk+=dt; if(AH.chk>.9){ if(Math.hypot(a.x-AH.lx,a.z-AH.lz)<.35) AH.rp=0; AH.chk=0; AH.lx=a.x; AH.lz=a.z; } }
/* the shot of him: in front of him and a little to one side, at eye height, looking at him as he waves */
function glanceStart(d){ const a=people[0]; GLN.t=0; GLN.d=d; a.wave=G_IN+G_HOLD+.4; A.chime(5,.05,.045); A.chime(8,.34,.035); A.whoosh(true,1.1,.05);
  let fx=a.face[0]-a.x, fz=a.face[1]-a.z; const l=Math.hypot(fx,fz)||1; fx/=l; fz/=l; const rx=-fz, rz=fx;
  const cx=a.x+fx*3.4+rx*.9, cz=a.z+fz*3.4+rz*.9; camAt(cx,cz,1.62,GLN.P);
  GLN.L.copy(a.dir).multiplyScalar(R+standH(a.x,a.z)+1.2); GLN.U.copy(at(cx,cz)); }
const gA=new T.Vector3(), gB=new T.Vector3();
function sphLerp(a,b,w,lift,o){ const ra=a.length(), rb=b.length(); o.copy(gA.copy(a).normalize().lerp(gB.copy(b).normalize(),w).normalize()); return o.multiplyScalar(lerp(ra,rb,w)+lift*Math.sin(Math.PI*w)); }
/* the camera during the glance: over the rooftops and back, on the planet's curve, never through it */
function glanceApply(dt){ if(GLN.t<0) return false; GLN.t+=dt; if(TALK.ask&&GLN.t>G_IN+.2) GLN.t=G_IN+.2; const t=GLN.t, end=G_IN+G_HOLD+G_OUT;
  const w=t<G_IN?E.io(t/G_IN):t<G_IN+G_HOLD?1:1-E.io((t-G_IN-G_HOLD)/G_OUT);
  if(t>=end){ GLN.t=-1; return false; }
  const lift=Math.min(8,1.5+GLN.d*.22)*(t<G_IN+G_HOLD?1:.8);
  sphLerp(st.camP,GLN.P,w,lift,GLN.q); st.camP.copy(GLN.q);
  sphLerp(st.camL,GLN.L,w,0,GLN.q); st.camL.copy(GLN.q);
  stCam.up.copy(stUp).lerp(GLN.U,w).normalize(); UPU.value.copy(stCam.up);
  LU.uPly.value.copy(GLN.L);   // whatever stands between the camera and him fades away, so he is always seen
  return true; }

/* ---------- landmarks: all of them stand, however you came ---------- */
const MKR={kr:1.3,ph:1.25,og:1.7,ae:1.3,be:.45};
function marksEnter(){ FRESH=[];
  for(const id in MK){ const m=MK[id]; m.st='on';
    m.g.visible=m.st==='on'; markScale(m,1); m.obs.forEach(q=>q.o.h=m.st==='on'?q.h:q.h0); }
  people.forEach(p=>{ p.lines=linesFor(p.i); }); baked=false; }
const mkU=new T.Vector3(), mkE=new T.Vector3(), mkF=new T.Vector3(), mkP=new T.Vector3(), mkV=new T.Vector3();
const backOut=u=>{ const c=1.9; return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2); };
function marksUpdate(dt){ for(const id in MK){ const m=MK[id];
  if(m.st==='wait'&&!CUT.on){ mkU.copy(m.base).normalize(); V.copy(m.base).addScaledVector(mkU,1.4).project(stCam); const [mx,mz]=loc(mkU);
    if(Math.hypot(player.x-mx,player.z-mz)<17&&V.z<1&&Math.abs(V.x)<.8&&Math.abs(V.y)<.8){ m.st='grow'; m.t=0; m.g.visible=true; markScale(m,.001); m.obs.forEach(q=>q.o.h=q.h);
      // the same bell that called you up there, and a ring of dust where it comes up
      const s0=STA.find(x=>x.id===id); A.call(s0?BEACON_NOTES[s0.idx]:12,0,.06); A.pop(); S.shake=Math.max(S.shake,.12);
      mkE.crossVectors(mkU,Math.abs(mkU.y)<.9?UPY:V2.set(1,0,0)).normalize(); mkF.crossVectors(mkU,mkE);
      for(let k=0;k<12;k++){ const a=k/12*TAU+Math.random()*.3, c=Math.cos(a), sn=Math.sin(a); mkV.copy(mkE).multiplyScalar(c).addScaledVector(mkF,sn);
        mkP.copy(m.base).addScaledVector(mkV,MKR[id]).addScaledVector(mkU,.15); puff(mkP,mkV.multiplyScalar(1.6+Math.random()).addScaledVector(mkU,.35),.2+Math.random()*.14,1.3); } } }
  if(m.st==='grow'){ m.t+=dt; const u=clamp(m.t/1.25,0,1); markScale(m,Math.max(.001,backOut(u)));
    if(u>=1){ m.st='on'; seen.add(id); markScale(m,1); baked=false; } } } }   // the sun's shadows are drawn again with it in

/* ---------- the last flight, on the ground. Everyone is at the pad when you get there; you walk up the ramp and the hatch shuts.
   Then a short wait: the music has gone, a clock ticks three times, a heartbeat quickens, steam hisses out of the base, the engines
   spool up and the rocket starts to shiver. One second of nothing at all. Then it lights, the smoke rolls out across the town,
   the three of us wave, and you climb, quickly now, through the clouds until the sky goes black. ---------- */
const FIN={on:false,t:0,look:new T.Vector3(),wave:0,mus:0,fov:45,ign:false,shut:false,handed:false,beat:0,clk:-1,vent:0,trail:0,st:0,ph:0,go:false,ask:false,wait:0,held:0,hold:false,
  cp:new T.Vector3(),cl:new T.Vector3(),pos:new T.Vector3(),alt:0};
const F_WALK0=.3, F_WALK1=1.9, F_DOOR0=2.0, F_DOOR1=2.55, F_TICK0=2.85, F_TICKI=.6, F_HOLD=.5, F_IGN=4.75, F_LIFT=5.1, F_SPACE=7;   // three quick ticks, a breath, lit; F_SPACE: seconds of climbing, by when the camera looks back down at Earth
/* after the ticks the rocket waits on the pad for you: hold (Space, or press anywhere) and the engines spool up under your
   hand until it lights. F_HELD: seconds of holding to light it; nobody holding, it goes by itself after F_AUTO */
const F_WAIT=F_IGN-F_HOLD-.001, F_HELD=1.3, F_AUTO=9, HP=$('#holdp'), HPT=$('#holdp span');
const LKEYS=['Space','Enter','KeyW','ArrowUp'], launchHold=on=>{ if(FIN.on&&FIN.ask&&!FIN.go){ if(on&&!FIN.hold){ A.vent(0); if(!FIN.pr){ FIN.pr=true; A.clunk(); } } FIN.hold=on; } else if(!on) FIN.hold=false; };
addEventListener('keyup',e=>{ if(LKEYS.includes(e.code)) launchHold(false); });
addEventListener('pointerdown',()=>launchHold(true)); addEventListener('pointerup',()=>launchHold(false)); addEventListener('pointercancel',()=>launchHold(false));
function launchPrompt(on){ document.documentElement.classList.toggle('launching',on); if(on){ HPT.textContent=FINE?'Hold Space to launch':'Hold anywhere to launch'; HP.style.setProperty('--k','0'); }
  HP.classList.toggle('on',on); HP.classList.remove('go'); }
const FOUND=(()=>{ const cx=CAMC[0], cz=CAMC[1], fx=PAD[0]-cx, fz=PAD[1]-cz, l=Math.hypot(fx,fz), ux=fx/l, uz=fz/l, rx=-uz, rz=ux;   // to the right of the view from the road
  return [0,1,2].map(k=>[cx+ux*(3.5+.55*k)+rx*(1.25+.8*k),cz+uz*(3.5+.55*k)+rz*(1.25+.8*k)]); })();
const fSide=new T.Vector3(), fA=new T.Vector3(), fB=new T.Vector3(), fC=new T.Vector3(), fUp=new T.Vector3();
/* the launch flame: one drawn shape, banded like a cartoon flame (white-hot where you look straight in, yellow, then orange at the
   edges and the tip), licking and flickering, with the same ink line round it as everything else */
const LFU={uTime:G.uTime,uLen:{value:6},uR:{value:.6}};
let LFLAME=null;
function buildLaunchFlame(){ const g=new T.CylinderGeometry(1,1,1,32,24,true).translate(0,-.5,0);
  const m=new T.ShaderMaterial({uniforms:Object.assign({uCut:{value:0}},LFU,{uPly:LU.uPly}),side:T.DoubleSide,
    vertexShader:`uniform float uTime,uLen,uR; varying vec3 vN,vW,vA; varying float vU;
      float h(float n){ return fract(sin(n)*43758.5453); } float nz(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(h(i),h(i+1.),f); }
      void main(){ vec3 p=position; float u=clamp(-p.y,0.,1.), a=atan(p.z,p.x);
        float prof=pow(max(1.-u,0.),.55)*(1.+.9*u)*(.62+.38*smoothstep(0.,.08,u));   // a full belly, then a quick lick to the point
        float lick=1.+.34*(nz(uTime*9.+u*7.+a*1.6)-.5)*u+.12*(nz(uTime*23.+a*3.)-.5);
        vec2 dir=p.xz/max(length(p.xz),1e-4); p.xz=dir*uR*prof*lick; p.y=-u*uLen*(1.+.12*(nz(uTime*11.)-.5));
        p.x+=sin(uTime*14.+u*5.)*.08*u*u; p.z+=cos(uTime*12.+u*4.)*.07*u*u;
        vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*vec3(dir.x,0.,dir.y)); vA=normalize(mat3(modelMatrix)*vec3(0.,1.,0.)); vU=u; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uTime; varying vec3 vN,vW,vA; varying float vU; ${NEAR}
      void main(){ nearFade(vW); vec3 V=normalize(cameraPosition-vW), A=normalize(vA), Vp=V-A*dot(V,A); float lp=length(Vp);
        // how far in from the edge of the flame as you see it: measured across the flame, so it is pale down the middle
        // and hot at the nozzle from any angle, from below as much as from the side
        float f=mix(1.,abs(dot(normalize(vN),Vp))/max(lp,1e-3),smoothstep(.06,.28,lp));
        float b=f*.85+.2-vU*.55+.025*sin(uTime*23.+vU*7.);   // hot and pale near the nozzle, cooling out to the edges and the tip
        vec3 c=b>.66?vec3(1.,.98,.9):b>.42?vec3(1.,.86,.4):b>.16?vec3(1.,.58,.2):vec3(.9,.34,.13);
        gl_FragColor=vec4(c,1.); }`});
  LFLAME=new T.Mesh(g,m); LFLAME.position.y=.06; LFLAME.visible=false; LFLAME.frustumCulled=false; LFLAME.userData.dyn=true; RK.g.add(LFLAME); }
function startFinale(go){ if(FIN.on&&!(go===true&&FIN.pre)) return; if(go!==true&&csStart()) return;   // the launch scene plays first, and goes on here itself (see the launch scene, at the end)
  closeTalk(); GLN.t=-1; goBtn.hidden=true; Object.assign(FIN,{on:true,pre:false,t:0,ign:false,shut:false,handed:false,cloud:false,lift:false,top:false,dawn:false,pr:false,ck:0,beat:0,clk:-1,vent:0,trail:0,st:0,ph:0,wave:0,mus:.55,alt:0,go:false,ask:false,wait:0,held:0,hold:false});
  S.fin=true; S.flash=1; document.documentElement.classList.add('fin'); el.classList.add('fin','walked'); hint.classList.add('gone'); cine(true); stickOff(); down=null; look=null;
  people.forEach((p,k)=>{ [p.x,p.z]=FOUND[k]; p.dir=at(p.x,p.z); if(p.ob){ p.ob.x=p.x; p.ob.z=p.z; } p.walk=0; tang(p.dir,padTop,p.f); });
  AH.st='done'; FIN.look.copy(padTop).addScaledVector(PADU,2.2); rocketLanded(); me.visible=true; player.tgt=null; player.speed=0; TALK.goal=null; C.guide=null;
  camAt(CAMC[0],CAMC[1],1.45,FIN.cp); FIN.cl.copy(padTop).addScaledVector(PADU,1.4); A.whoosh(false,1.4,.1); }
function finUpdate(dt,t){ const up=PADU, P=player;
  // the clock stops on the pad until you have held long enough to light it
  FIN.t=FIN.go?FIN.t+dt*(S.finX||1):Math.min(F_WAIT,FIN.t+dt*(S.finX||1)); let c=FIN.t;
  if(!FIN.go&&c>=F_WAIT){ if(!FIN.ask){ FIN.ask=true; FIN.wait=0; launchPrompt(true); }
    FIN.wait+=dt; const want=FIN.hold||FIN.wait>F_AUTO; FIN.held=want?FIN.held+dt:Math.max(0,FIN.held-dt*1.6);
    HP.style.setProperty('--k',clamp(FIN.held/F_HELD,0,1).toFixed(3)); HP.classList.toggle('held',want);
    if(FIN.held>=F_HELD){ FIN.go=true; FIN.hold=false; HP.classList.add('go'); setTimeout(()=>launchPrompt(false),500); FIN.t=c=F_IGN; } }
  const hk=FIN.go?1:clamp(FIN.held/F_HELD,0,1);   // how far the engines have spooled up under your hand
  // up the ramp and in
  if(c<F_WALK1){ const wk=clamp((c-F_WALK0)/(F_WALK1-F_WALK0),0,1), z=OUT_Z-(OUT_Z-.15)*wk*wk*(3-2*wk), wv=6*wk*(1-wk);
    const x0=PAD[0]+DOOR[0]*z, z0=PAD[1]+DOOR[1]*z; at(x0,z0,V2); tang(V2,at(PAD[0]-DOOR[0],PAD[1]-DOOR[1]),cF); standOn(me,V2,cF,.1+rampY(z));
    FIN.ph+=dt*7.2*Math.min(1,wv*.8); animate(me,FIN.ph,Math.min(1,wv*.75),0,t,9); const stp=Math.floor(FIN.ph/Math.PI); if(wv>.25&&stp!==FIN.st){ FIN.st=stp; A.step(z<RAMP_END+.3?2:1); } }
  else me.visible=false;
  // the hatch comes up and shuts
  const dk=clamp((c-F_DOOR0)/(F_DOOR1-F_DOOR0),0,1); RK.door.rotation.x=lerp(DOOR_OPEN,DOOR_SHUT,dk*dk*(3-2*dk));
  if(dk>=1&&!FIN.shut){ FIN.shut=true; A.clunk(); S.shake=Math.max(S.shake,.14); document.body.classList.add('tense'); }
  // the wait, short: three quick ticks of a clock, a heartbeat that quickens, steam from the base, a low drone, the engines spooling up; then one second of nothing
  const hold=c>=F_IGN-F_HOLD&&c<F_IGN;
  if(c>=F_TICK0&&c<F_IGN-F_HOLD){ const k=Math.floor((c-F_TICK0)/F_TICKI); if(k!==FIN.clk){ FIN.clk=k; A.tock(k); } }
  FIN.beat-=dt*(S.finX||1); if(c>F_DOOR1&&c<F_IGN-F_HOLD&&FIN.beat<=0){ const k=sstep(F_DOOR1,F_IGN,c); FIN.beat=(.7-.25*k)*(1-.4*hk); A.beat(.55+.45*k); }
  if(c>F_DOOR1+.4&&c<F_IGN){ FIN.vent-=dt; if(FIN.vent<=0){ FIN.vent=.22+Math.random()*.3; const sg=Math.random()<.5?-1:1; fA.crossVectors(up,RKN).normalize();
      fB.copy(padTop).addScaledVector(fA,sg*1.05).addScaledVector(up,.45); fC.copy(fA).multiplyScalar(sg*(1.1+Math.random()*.6)).addScaledVector(up,.25); puff(fB,fC,.2+Math.random()*.12,1.7); A.vent(sg*.45); } }
  // ignition
  if(c>=F_IGN&&!FIN.ign){ FIN.ign=true; A.ignite(); S.shake=1.2; S.flash=Math.max(S.flash,.22); document.body.classList.remove('tense'); document.body.classList.add('loose');
    for(let k=0;k<44;k++){ const a=k/44*TAU+Math.random()*.15, r=1.1+Math.random()*.4; at(PAD[0]+Math.cos(a)*r,PAD[1]+Math.sin(a)*r,V2).multiplyScalar(R+.3);
      tang(up,at(PAD[0]+Math.cos(a)*4,PAD[1]+Math.sin(a)*4),V3).multiplyScalar(3+Math.random()*2.6).addScaledVector(up,.35+Math.random()*.5); puff(V2,V3,.42+Math.random()*.38,3+Math.random()*1.4); } }
  const fk=c<F_IGN?0:sstep(F_IGN,F_IGN+.4,c), tau=Math.max(0,c-F_LIFT), alt=.5*tau*tau+.12*tau*tau*tau; FIN.alt=alt; FIN.wave=c>F_IGN+.35?1:0;   // it gets going at once
  RK.flame.visible=false; LFLAME.visible=fk>.01; LFU.uR.value=.62*(.4+.6*fk)*(1+.25*sstep(0,3,tau)); LFU.uLen.value=fk*(3.8+2.6*sstep(0,2.5,tau))*(.94+.06*Math.sin(t*37));
  const wob=c>F_IGN-1.8&&tau<1.2?(Math.random()-.5)*.014*sstep(F_IGN-1.8,F_IGN,c)*(c>F_IGN?1.6:.35+1.1*hk):0;
  if(FIN.ask&&!FIN.go) S.shake=Math.max(S.shake,.32*hk);
  FIN.pos.copy(padTop).addScaledVector(up,alt); rocketPose(FIN.pos,up,wob);
  if(FIN.ign){ FIN.trail-=dt; let n=0; while(FIN.trail<=0&&n++<4){ FIN.trail+=tau>0?.022:.05; fB.copy(FIN.pos).addScaledVector(up,-.25-Math.random()*.6);
      fC.set(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(1.2).addScaledVector(up,tau>0?-2.5:-.2);
      if(tau<2.5&&alt<3){ fA.set(Math.random()-.5,0,Math.random()-.5); tang(up,fA.add(padTop),fC).multiplyScalar(3.5+Math.random()*2).addScaledVector(up,.3); }
      puff(fB,fC,(tau>0?.35:.45)+Math.random()*.3,tau>0?2.6:2.2); } }
  // sound, matched to every beat: the drone and the engines spooling up while it shivers, silence, the hit of ignition, the roar
  // and its crackle on the pad, a long push as it leaves, then the roar dulling and thinning to nothing as the air goes
  const air=1-sstep(22,72,alt), spool=c<F_IGN-F_HOLD?sstep(F_IGN-1.9,F_IGN-F_HOLD,c)*(.3+.7*hk):0;
  /* on the pad the engines answer your hand: as you hold they build from a murmur to a roar, the whine climbing with them */
  const hs=FIN.ask&&!FIN.go?hk*hk:0;
  if(c<F_IGN){ A.roar(hold?0:.02+.16*sstep(F_DOOR1,F_IGN-F_HOLD,c)+.1*spool+.42*hs); A.thrust(.18*spool+.75*hs); A.whine(hold?0:.34*spool+.5*hs); A.roarTone(380+420*hs); }
  else { A.whine(0); A.roar(.8*air); A.thrust(1.1*air); A.roarTone(lerp(240,950,fk)*(1-.65*sstep(8,55,alt)));
    S.shake=Math.max(S.shake,(.55+.4*(1-sstep(0,1.5,tau)))*(1-sstep(4,26,alt)));
    FIN.ck-=dt; if(air>.04&&FIN.ck<=0){ FIN.ck=.035+Math.random()*.08; A.crackle(.06*air*air*(.4+Math.random()*.8)*(1-.5*sstep(6,30,alt))); } }
  if(c>=F_LIFT&&!FIN.lift){ FIN.lift=true; A.liftoff(); A.swell(); }
  if(alt>44&&!FIN.top){ FIN.top=true; A.chord(); }   // the black, and the orbit's music
  FIN.mus=.55*(1-sstep(0,F_DOOR1-.4,c));
  A.update(t,{sub:.18*sstep(45,70,alt),pad:.42*sstep(34,66,alt),bright:.2});   // as the air goes, the orbit's own music comes in to meet you
  if(FIN.ign) BIRDS.forEach(b=>{ b.h=Math.min(b.h+dt*2.4,45); b.r+=dt*1.1; });
  // the sky goes to black and the haze lifts; through the cloud layer the picture whites out for a moment, with a rush of air
  SPACEU.value=sstep(20,66,alt); LU.uFogK.value=1-sstep(5,26,alt);
  if(alt>17&&!FIN.cloud){ FIN.cloud=true; S.flash=Math.max(S.flash,.42); A.whoosh(true,1.4,.2); }
  FIN.look.copy(tau>0?FIN.pos:fB.copy(padTop).addScaledVector(up,2.2));
  // the camera: on the road behind the three of us, creeping in during the wait, then up after the rocket and out above it
  const road=camAt(CAMC[0],CAMC[1],1.45,fA), push=camAt(lerp(CAMC[0],PAD[0],.13),lerp(CAMC[1],PAD[1],.13),1.25,fB);
  fSide.crossVectors(up,RKN).normalize(); if(fSide.dot(V.copy(road).sub(padTop))<0) fSide.negate();   // the side the road is on
  const wP=E.io(clamp((c-F_DOOR1)/(F_IGN-F_DOOR1),0,1)), cp=V3.copy(road).lerp(push,wP*.85), cl=V4.copy(padTop).addScaledVector(up,lerp(1.5,2.2,wP));
  if(c<F_WALK1) cl.lerp(V.copy(me.position).addScaledVector(up,1.1),.45*(1-sstep(F_WALK1-.8,F_WALK1,c)));
  let k2=0;
  if(tau>0){ const k1=E.io(clamp((tau-1.5)/3.2,0,1)); k2=E.io(clamp((tau-4.6)/2.8,0,1));
    fC.copy(FIN.pos).addScaledVector(up,-3.6).addScaledVector(fSide,7.5); cp.lerp(fC,k1);
    fC.copy(FIN.pos).addScaledVector(up,13).addScaledVector(fSide,3.8); cp.lerp(fC,k2);
    cl.copy(FIN.pos).addScaledVector(up,1.2*(1-k2)-5*k2); }
  if(c<.05){ FIN.cp.copy(cp); FIN.cl.copy(cl); }
  FIN.cp.lerp(cp,1-Math.exp(-(tau>0?5:3)*dt)); FIN.cl.lerp(cl,1-Math.exp(-(tau>0?7:3.5)*dt));
  st.camP.copy(FIN.cp); st.camL.copy(FIN.cl); FIN.fov=lerp(45,40,wP)+(tau>0?12*sstep(0,3,tau):0);
  // looking straight down, the top of the picture is the way the road was
  fUp.copy(up).multiplyScalar(1-k2).addScaledVector(fA.crossVectors(fSide,up).normalize(),-k2).normalize();
  stUp.copy(fUp); stCam.up.copy(fUp); UPU.value.copy(up); LU.uPly.value.copy(FIN.cp); S.stSnap=true;   // uPly at the camera: nothing gets cut away
  // looking back down at the town from above the rocket, the light takes over, and then the white page
  if(tau>F_SPACE-.5){ const k=sstep(F_SPACE-.5,F_SPACE+2.1,tau), L=post.uniforms.uLight.value;
    /* where the rocket is on the screen: the light opens from it */
    V.copy(FIN.pos).addScaledVector(up,-.5).project(stCam); const vis=V.z<1&&Math.abs(V.x)<1.1&&Math.abs(V.y)<1.1, x=vis?V.x*.5+.5:.5, y=vis?V.y*.5+.5:.5;
    if(!FIN.dawn){ FIN.dawn=true; A.dawn(); }   // the light's own sound: a rush of air rising into a bright open chord
    if(L.z<=0) L.set(x,y,0); L.x=lerp(L.x,x,1-Math.exp(-4*dt)); L.y=lerp(L.y,y,1-Math.exp(-4*dt)); L.z=k;
    if(k>=1&&!FIN.handed){ FIN.handed=true; if(typeof finaleWhite==='function') setTimeout(finaleWhite,0); } } }   /* (after this frame: Earth is still drawing it) */
/* when space has taken over completely, Earth puts itself back as it was */
st.finaleEnd=function(){ post.uniforms.uLight.value.z=0; FIN.on=false; S.fin=false; launchPrompt(false); el.classList.remove('fin'); SPACEU.value=0; LU.uFogK.value=1; RK.flame.visible=false; A.roarTone(380); A.whine(0); if(LFLAME) LFLAME.visible=false; me.visible=true; rocketLanded();
  people.forEach(p=>{ [p.x,p.z]=p.at; p.dir=at(p.x,p.z); if(p.ob){ p.ob.x=p.x; p.ob.z=p.z; } p.walk=0; }); BIRDS.forEach(b=>{ b.h=Math.min(b.h,10); }); AH.st='home'; };

/* ---------- lifecycle ---------- */
let bloom0=1, birdT=2;
const stUp=new T.Vector3(0,1,0);
st.enter=function(){ post.uniforms.uFlat.value=1;   /* Earth's daylight from the first frame: no dark edges left over from space, fading as you watch */
  const P=player; CUT.on=false; CUT.landed=false; CUT.door=false; el.classList.remove('cut'); if(me) me.visible=true; rocketLanded(); placeAtStart(); stickOff(); down=null;
  started=false; cardT=0; el.classList.remove('walked'); closeTalk(); hint.classList.remove('gone');
  $('#crLede',el).textContent=st.land?'You\'ve landed. Walk over and say hello.':'You came through the hole. Walk over and say hello.'; people.forEach(p=>{ p.greeted=false; p.near=false; }); ahroonHome(); TALK.goal=null; C.guide=null;
  hint.textContent=FINE?'WASD or the arrows to walk · drag to look around · scroll to zoom · walk up to someone to talk':'Drag anywhere to walk · a second finger looks round · walk up to someone to talk';
  marksEnter(); cafeReset(); stUp.copy(P.u); st.setState('menu'); document.documentElement.classList.add('earth'); bloom0=post.uniforms.uBloom.value; post.uniforms.uBloom.value=.05; };
st.exit=function(){ inkRT.setSize(1,1); colRT.setSize(1,1); if(baked){ shRT.dispose(); shRT.depthTexture.dispose(); baked=false; }   /* Earth's own drawing buffers and its sun's shadow are given back while you are not on Earth: the next frame here makes them again */
  CUT.on=false; el.classList.remove('cut'); document.documentElement.classList.remove('crcut'); stickOff(); down=null; A.thrust(0); A.roar(0); stCam.up.set(0,1,0); stCam.layers.set(0); if(stCam.fov!==36){ stCam.fov=36; stCam.updateProjectionMatrix(); } document.documentElement.classList.remove('earth');
  post.uniforms.uBloom.value=bloom0||1; post.uniforms.uFlat.value=0; closeTalk(); cafeReset(true); A.music(0); A.hush(); };
st.abort=function(){ closeTalk(); };

const Mf=new T.Matrix4(), Qb=new T.Quaternion(), camT=new T.Vector3(), camR=new T.Vector3(), camW=new T.Vector3();
const sT=new T.Vector3();
function standOn(g,u,f,h){ sT.crossVectors(u,f).normalize(); Mf.makeBasis(sT,u,f); g.quaternion.setFromRotationMatrix(Mf); g.position.copy(u).multiplyScalar(R+h); }
function animate(fig,walkPh,amt,wave,t,i){ const d=fig.userData, sw=Math.sin(walkPh);
  d.legs[0].rotation.x=sw*.72*amt; d.legs[1].rotation.x=-sw*.72*amt; d.arms[0].rotation.x=-sw*.6*amt; d.arms[1].rotation.x=sw*.6*amt;
  d.fore[0].rotation.x=-.12-Math.max(0,sw)*.4*amt; d.fore[1].rotation.x=-.12-Math.max(0,-sw)*.4*amt;   // the elbow bends as the arm swings forward
  d.body.position.y=Math.abs(Math.cos(walkPh))*.04*amt+Math.sin(t*2.1+i)*.006; d.body.rotation.y=sw*.08*amt;
  // a wave: the left arm out and up, the forearm upright, waving from the elbow
  const a=d.arms[1], f=d.fore[1];
  if(wave>0){ a.rotation.z=damp(a.rotation.z,1.95,14,.016); a.rotation.x=0; f.rotation.z=damp(f.rotation.z,.95+Math.sin(t*11)*.38,14,.016); }
  else { a.rotation.z=damp(a.rotation.z,0,8,.016); f.rotation.z=damp(f.rotation.z,0,8,.016); }
  if(d.drone){ d.drone.position.y=1.48+Math.sin(t*2.3+i)*.035; d.drone.rotation.y=Math.sin(t*.5+i)*.5; } }

st.update=function(dt,t){ if(!st.built) return; const P=player; cardT+=dt; if(cardT>7) el.classList.add('walked');
  const port=innerHeight>innerWidth, fov=FIN.on?FIN.fov*(port?1.3:1):port?58:45; if(stCam.fov!==fov){ stCam.fov=fov; stCam.updateProjectionMatrix(); }
  if(FIN.on) (FIN.pre?csUpdate:finUpdate)(dt,t); else if(CUT.on) cutUpdate(dt,t); else {   // (FIN.pre: the launch scene, the last flight's first part)
  // input, the same as flying: keys move you relative to the camera; on a touch screen, the stick
  let iz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0), ix=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0), mag=1;
  if(down&&down.touch&&down.moved){ ix=down.ix; iz=down.iz; mag=Math.min(1,Math.hypot(ix,iz)); if(mag<.15){ ix=iz=0; } }
  if(GLN.t>=0){ ix=iz=0; P.tgt=null; }   // while the camera looks at Ahroon, you wait
  if(PHS.on||CAFE.on){ ix=iz=0; P.tgt=null; }   // holding the light (or in the café), you stay put
  const run=keys.has('ShiftLeft')||keys.has('ShiftRight');
  /* talking, you stay put. To walk off, let go of the keys (or the stick) and set off again, and keep going a moment */
  if(TALK.p){ const mv=!!(ix||iz), stick=!!(down&&down.touch&&down.moved), sig=stick?'stick':Math.sign(ix)+','+Math.sign(iz);
    if(TALK.held==='?') TALK.held=mv?sig:null; else if(TALK.held&&(sig!==TALK.held||!mv)) TALK.held=null;   // what you were already holding when it began does not count
    TALK.walkT=mv&&!TALK.held?(TALK.walkT||0)+dt:0; if(TALK.walkT>.55) closeTalk(); else { ix=iz=0; } }
  if(ix||iz){ P.tgt=null; P.path=null; TALK.goal=null; C.guide=null; began(); }
  /* walking a path: aim at the next corner, and slow down only for the last one */
  if(P.path&&P.path.length&&!TALK.p){ const [wx,wz]=P.path[0], dw=Math.hypot(wx-P.x,wz-P.z);
    if(dw<(P.path.length>1?.45:.22)){ P.path.shift(); if(!P.path.length){ P.path=null; P.tgt=null; } }
    if(P.path){ P.tgt=at(P.path[0][0],P.path[0][1]).multiplyScalar(R); let rest=0; for(let k=1;k<P.path.length;k++) rest+=Math.hypot(P.path[k][0]-P.path[k-1][0],P.path[k][1]-P.path[k-1][1]); P.rest=rest; } }
  let want=0;
  if(ix||iz){ camR.crossVectors(C.f,P.u); V4.copy(C.f).multiplyScalar(iz).addScaledVector(camR,ix).normalize(); want=(run?4.2:2.7)*mag; }
  else if(P.tgt){ const ang=Math.acos(clamp(P.u.dot(V2.copy(P.tgt).normalize()),-1,1)); if(ang*R<.2&&!P.path){ P.tgt=null; } else { tang(P.u,P.tgt,V4); want=Math.min(2.7,(ang*R+(P.path?P.rest||0:0))*2+.5); } }
  if(want>0){ const s=V.crossVectors(P.f,V4).dot(P.u), c=P.f.dot(V4), a=Math.atan2(s,c); rot(P.f,P.u,clamp(a,-11*dt,11*dt)); if(Math.abs(a)>1.6) want*=.3; }
  if(TALK.p) want=0;
  P.speed=damp(P.speed,want,8,dt);
  if(P.speed>.01){ const u0=P.u.clone(), f0=P.f.clone(); walk(P,P.speed*dt); let [x,z]=loc(P.u);
    if(!walkable(x,z)){ P.u.copy(u0); P.f.copy(f0); P.speed*=.2; if(P.path) P.stuck=(P.stuck||0)+.4; else P.tgt=null; }
    else { let tx=null,tz=null; if(P.tgt) [tx,tz]=loc(V.copy(P.tgt).normalize());
      for(const o of OBS){ const dx=x-o.x, dz=z-o.z, d=Math.hypot(dx,dz), m=o.r+.28; if(d<m&&d>1e-4){ x=o.x+dx/d*m; z=o.z+dz/d*m; if(tx!==null&&!P.path&&Math.hypot(tx-o.x,tz-o.z)<m+.3) P.tgt=null; } }
      if(walkable(x,z)) at(x,z,P.u); else P.u.copy(u0); tang(P.u,P.f,P.f); } }
  [P.x,P.z]=loc(P.u); P.h=damp(P.h,standH(P.x,P.z),14,dt);
  /* walked over to someone: talk on arrival. Held up on the way, or they have moved: find the way again; after a few tries,
     close enough is close enough */
  if(TALK.goal&&!TALK.p){ const g=TALK.goal, dg=Math.hypot(P.x-g.x,P.z-g.z);
    if(dg<2.5) talkTo(g);
    else { P.stuck=Math.max(0,(P.stuck||0)+(P.speed<.3?dt:-dt*.5));
      if(P.stuck>.7||(Math.hypot(g.x-(P.goalX??g.x),g.z-(P.goalZ??g.z))>1.2)){ P.stuck=0; P.tries=(P.tries||0)+1; if(P.tries>3){ if(dg<6) talkTo(g); else { TALK.goal=null; P.path=null; P.tgt=null; } } else walkTo(g); }
      else if(!P.tgt&&!P.path) TALK.goal=null; } }
  P.ph+=dt*P.speed*4.6; standOn(me,P.u,P.f,P.h); animate(me,P.ph,clamp(P.speed/2.7,0,1),0,t,9);
  P.step+=P.speed*dt; if(P.step>.62){ P.step=0; const rd=roadDist(P.x,P.z); A.step(onJetty(P.x,P.z)?2:rd<RW+SW?1:0); }
  // the camera rig: a lazy follow when you walk forward, never against a drag
  C.dragT+=dt; tang(P.u,C.f,C.f);
  if(P.speed>.3&&C.dragT>2.5&&!TALK.p){ const sg=Math.sign(V.crossVectors(C.f,P.f).dot(P.u))||1, a=Math.acos(clamp(C.f.dot(P.f),-1,1));
    if(a>.12&&a<2.3) rot(C.f,P.u,sg*Math.min(a,1.05*Math.min(1,P.speed/2.7)*sstep(.12,.7,a)*(1-a/3.2)*dt)); }
  // after a conversation the camera turns, slowly, toward whoever you have not met yet
  if(C.guide&&!TALK.p){ const g=C.guide; g.t-=dt; tang(P.u,g.p.dir,V3); const sg=Math.sign(V.crossVectors(C.f,V3).dot(P.u))||1, a=Math.acos(clamp(C.f.dot(V3),-1,1));
    if(a>.05) rot(C.f,P.u,sg*Math.min(a,1.3*dt*sstep(0,.5,g.t))); if(g.t<=0||C.dragT<.05) C.guide=null; }
  // talking: centre between the two of you, turned to see you both a little from the side; afterwards it simply stays turned
  const tp=TALK.p; C.tk=damp(C.tk,tp?1:0,2.4,dt); const tE=C.tk*C.tk*(3-2*C.tk);
  C.camH=damp(C.camH,P.h,3,dt); camT.copy(P.u).multiplyScalar(R+C.camH+C.HEAD);
  if(tp){ V2.copy(tp.dir).multiplyScalar(R+standH(tp.x,tp.z)+C.HEAD); C.mid.copy(camT).lerp(V2,.3); tang(P.u,V3.copy(V2).sub(camT),V4);
    const [mx,mz]=loc(camW.copy(C.mid).normalize());
    if(!TALK.side){ let best=-9; for(const sg of [1,-1]){ const f=rot(V3.copy(V4),P.u,.36*sg), sc=rigLimit(mx,mz,P.u,f,.16,3.4)-Math.acos(clamp(f.dot(C.f),-1,1))*.6; if(sc>best){ best=sc; TALK.side=sg; } } }
    rot(C.tf.copy(V4),P.u,.36*TALK.side); const sg=Math.sign(V.crossVectors(C.f,C.tf).dot(P.u))||1, aa=Math.acos(clamp(C.f.dot(C.tf),-1,1)); rot(C.f,P.u,sg*aa*(1-Math.exp(-2.6*dt)));
    tang(P.u,tp.dir,V4); const s=V.crossVectors(P.f,V4).dot(P.u), c=P.f.dot(V4); rot(P.f,P.u,clamp(Math.atan2(s,c),-6*dt,6*dt)); }
  else TALK.side=0;
  camT.lerp(C.mid,tE);
  const pitch=lerp(C.pitch,.16,tE), D=lerp(C.D0(),3.4,tE), [tx,tz]=loc(camW.copy(camT).normalize()), lim=rigLimit(tx,tz,P.u,C.f,pitch,D);
  // pressed against a house while you move: slide slowly round to whichever side is more open
  if(lim<D*.55&&P.speed>.3&&!tp&&C.dragT>1.2){ let best=lim, bs=0; for(const a of [.45,-.45,.9,-.9]){ const l2=rigLimit(tx,tz,P.u,rot(V3.copy(C.f),P.u,a),pitch,D); if(l2>best+.3){ best=l2; bs=a; } }
    if(bs) rot(C.f,P.u,Math.sign(bs)*Math.min(Math.abs(bs),.8*dt)); }
  C.pEff=damp(C.pEff,pitch,2.5,dt);
  C.dist=damp(C.dist,lim,lim<C.dist?7:1.6,dt);
  C.tgt.lerp(camT,1-Math.exp(-14*dt));
  stUp.lerp(P.u,1-Math.exp(-6*dt)).normalize(); stCam.up.copy(stUp); UPU.value.copy(stUp);
  rigPose(C.tgt,stUp,C.f,C.pEff,C.dist,st.camP,st.camL);
  LU.uPly.value.copy(P.u).multiplyScalar(R+P.h+1);   // what the camera must always see: you
  glanceApply(dt); steerCam(dt);
  S.stSnap=true; // the camera does its own smoothing
  }
  cliffUpdate(dt,t);   // the bench and the kite on the cliff (see the cliff, below)
  launchUpdate(dt,t);   // the launch scene's things: Gideon and Owen at the desk in the last flight (see the launch scene, at the end)
  post.uniforms.uFlat.value=damp(post.uniforms.uFlat.value,1,3,dt); puffsUpdate(CUT.on?0:dt); marksUpdate(dt);
  // the three of us: turn to you when you are near, wave hello, and start talking when you walk right up
  ahroonUpdate(dt);
  people.forEach((p,i)=>{ const d=Math.hypot(P.x-p.x,P.z-p.z), near=d<6&&!(CUT.on&&CUT.t<T_OUT)&&!FIN.on;
    // walk right up to someone you have not met (or to Ahroon, once he has something to show you) and they start talking
    /* (Ahroon walking over to you after a not yet is not you walking up to him: he does not ask again until you come back to him) */
    /* (on your way over to someone you clicked, nobody else stops you) */
    if(d<2.3&&!p.greeted&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0&&(!TALK.goal||TALK.goal===p)&&!(i===0&&AH.st==='come')&&(!MET.has(i)||(i===0&&allMet()))) talkTo(p);
    if(d>3.3) p.greeted=false;
    if(near&&!p.near) p.wave=1.2; p.near=near; p.wave=Math.max(0,p.wave-dt);
    const faceTo=FIN.on?FIN.look:(near||p.walk>.2)?P.u:at(p.face[0],p.face[1]);
    tang(p.dir,faceTo,V4); p.f.lerp(V4,1-Math.exp(-4*dt)); tang(p.dir,p.f,p.f); standOn(p.g,p.dir,p.f,standH(p.x,p.z)); animate(p.g,p.ph||0,clamp((p.walk||0)/2.7,0,1),FIN.on?FIN.wave:p.wave,t,i);
    p.blink-=dt; const ey=p.blink<.12?.15:1; if(p.blink<0) p.blink=2+Math.random()*3; p.g.userData.eyes.forEach(e=>e.scale.y=ey);
    // name tags: anyone you have not met is always marked, wherever they are; Ahroon's tag calls you once he has one more thing
    const ask=i===0&&allMet(), lb=labels[i]; lb.classList.toggle('ask',ask); lb.classList.toggle('can',d<3.4&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0); V.copy(p.dir).multiplyScalar(R+standH(p.x,p.z)+1.62).project(stCam); lb.classList.toggle('on',(!MET.has(i)||ask||d<10||hov===p)&&V.z<1&&!TALK.p&&!CUT.on&&!FIN.on);
    lb.style.transform=`translate(${((V.x*.5+.5)*innerWidth).toFixed(1)}px,${((-V.y*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
    /* the way to whoever you still have to meet: a light over them, and their name at the edge of the screen when they are off it */
    const owed=(!MET.has(i)&&(MET.size>0||i>0))||(ask&&AH.heard), busy=TALK.p||CUT.on||FIN.on||GLN.t>=0;
    /* (only from a distance: right beside you the light is not needed, and from close up it would be a wall of white) */
    const bu=p.beam.material.uniforms.uK; bu.value=damp(bu.value,owed&&!busy&&d>8?1:0,3,dt); p.beam.visible=bu.value>.01;
    if(p.beam.visible){ p.beam.position.copy(p.dir).multiplyScalar(R+standH(p.x,p.z)+2.05); p.beam.quaternion.setFromUnitVectors(Y_UP,p.dir); }
    const off=V.z>1||Math.abs(V.x)>.9||Math.abs(V.y)>.84, ed=edges[i], showE=owed&&off&&!busy&&d>6; ed.classList.toggle('on',showE);
    if(showE){ let ex=V.z>1?-V.x:V.x, ey=V.z>1?-V.y:V.y; const m=Math.max(Math.abs(ex)/.82,Math.abs(ey)/.74,1e-3); ex/=m; ey/=m;
      ed.style.transform=`translate(${((ex*.5+.5)*innerWidth).toFixed(1)}px,${((-ey*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-50%)`; ed.style.setProperty('--a',Math.atan2(-ey,ex).toFixed(3)+'rad'); } });
  goBtn.hidden=!(allMet()&&AH.heard&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0&&!PHS.on&&!CAFE.on);
  /* walk up to a landmark and it says what it is, and where to find it */
  /* a landmark's card: only once you are out and walking, never on the way over to someone, and only when you stop by
     it for a moment, so passing one on your way somewhere does not flash it up */
  { let near=null, bd=1; if(started&&!TALK.p&&!TALK.goal&&!CUT.on&&!FIN.on&&GLN.t<0&&!PHS.on&&!CAFE.on) for(const id in INST){ if(MK[id]&&MK[id].st!=='on') continue; /* the café is always open, a landmark once it is built */ if(id===PJ.left) continue; const q=INST[id], dq=Math.hypot(P.x-q.x,P.z-q.z)/q.r; if(dq<bd){ bd=dq; near=id; } }
    /* walking away from the landmark whose card is up puts the card away at once, not only once you are out of its reach;
       it stays away until you are out of reach, or stop and stand for a moment */
    if(PJ.id&&near===PJ.id){ const q=INST[PJ.id], d=Math.hypot(P.x-q.x,P.z-q.z); PJ.away=PJ.ld!=null&&d>PJ.ld+1e-4&&P.speed>.35?(PJ.away||0)+dt:0; PJ.ld=d; if(PJ.away>.2){ PJ.left=PJ.id; near=null; PJ.away=0; } } else { PJ.ld=null; PJ.away=0; }
    if(PJ.left){ const q=INST[PJ.left], d=q?Math.hypot(P.x-q.x,P.z-q.z)/q.r:9; if(d>1){ PJ.left=null; PJ.still=0; } else if(P.speed<.1){ PJ.still=(PJ.still||0)+dt; if(PJ.still>.8){ PJ.left=null; PJ.still=0; } } else PJ.still=0; }
    if(near!==PJ.want){ PJ.want=near; PJ.dw=0; } else PJ.dw+=dt;
    const best=near&&(near===PJ.id||PJ.dw>.5)?near:null;
    if(best!==PJ.id){ PJ.id=best; if(best){ const c=CARD[best]; PJ.n.textContent=c[0]; PJ.k.textContent=c[1]; PJ.t.textContent=c[2]; PJ.el.href=c[3]; PJ.l.textContent=c[4]; PJ.el.target=/^mailto:/.test(c[3])?'_self':'_blank'; }
      const show=!!best&&best!=='cafe';   // (at the café nothing is put up: you go in to book, and only the button to go in shows)
      PJ.el.classList.toggle('on',show); PJ.el.setAttribute('aria-hidden',show?'false':'true'); PJ.el.tabIndex=show?0:-1; }
  }
  // talking: the words type out with a little voice
  if(TALK.p&&TALK.shown<TALK.txt.length){ TALK.acc+=dt*44; const n=Math.min(TALK.txt.length,Math.floor(TALK.acc)); if(n>TALK.shown){ if(Math.floor(n/2)>Math.floor(TALK.shown/2)&&TALK.txt[n-1]!==' ') A.voice(TALK.p.pitch); TALK.shown=n; say(n); if(n>=TALK.txt.length) tk.classList.remove('typing'); } }
  // things that move: the radar, the lighthouse, the voice inside Kríos, the birds
  if(AE){ AE.hd.matrix.copy(AE.M).multiply(Mf.makeRotationY(t*.8)); AE.hd.matrixWorldNeedsUpdate=true; }
  const quiet=TALK.p||CUT.on||FIN.on, near=q=>q?Math.hypot(P.x-q.x,P.z-q.z):99;
  /* Aetos: 0 to 6 s the drones loiter; 6 the threat is marked; 8 locked; 8.6 it falls; 11 another comes */
  if(AE&&AE.dr&&MK.ae.st==='on'){ const c0=AE.cyc%11; AE.cyc+=dt; const c=AE.cyc%11, d0=near(INST.ae);
    AE.dr.forEach((q,k)=>{ q.a+=q.w*dt; let h=q.h+Math.sin(t*1.3+k)*.12, sk=1;
      if(k===0){ if(c>8.6) h-=Math.pow(Math.min(1,(c-8.6)/1.3),2)*3.4; sk=c>9.9?0:c<.8?c/.8:1; }
      Mf2.copy(AE.B).multiply(Mf.makeTranslation(Math.cos(q.a)*q.r,h,Math.sin(q.a)*q.r)).multiply(Mr.makeRotationY(-q.a)).multiply(Mf.makeScale(sk||1e-3,sk||1e-3,sk||1e-3));
      q.g.matrix.copy(Mf2); q.g.matrixWorldNeedsUpdate=true; });
    const mk=c>6&&c<8.65; AE.ring.visible=mk; if(mk){ const s=c>8?1-.45*sstep(8,8.6,c):1+.08*Math.sin(t*9); AE.ring.matrix.copy(AE.dr[0].g.matrix).multiply(Mf.makeScale(s,s,s)); AE.ring.matrixWorldNeedsUpdate=true; }
    if(!quiet&&d0<15){ if(c0<6&&c>=6) A.ping(1175,.016*(1-d0/15)); if(c0<8&&c>=8) A.ping(1568,.024*(1-d0/15)); } }
  if(PH) steerUpdate(dt,t); pcUpdate();
  /* Pharos: once round the lighthouse every fifteen seconds; over open water there is nothing to match, and it says so */
  if(PH&&PH.dr&&MK.ph.st==='on'){ PH.a+=dt*.42; const lx=Math.cos(PH.a)*3.3, lz=Math.sin(PH.a)*3.3;
    PH.dr.matrix.copy(PH.M).multiply(Mf.makeTranslation(lx,3.3+Math.sin(t*1.1)*.12,lz)).multiply(Mr.makeRotationY(-PH.a-Math.PI/2)); PH.dr.matrixWorldNeedsUpdate=true;
    const sea=isle(V.set(lx,0,lz).applyMatrix4(PH.M).normalize())<0;
    if(sea!==PH.over){ PH.over=sea; PH.dr.userData.light.material.uniforms.uC.value.setStyle(sea?'#ff9a3c':'#f5f3ea',T.LinearSRGBColorSpace); const d0=near(INST.ph);
      if(!quiet&&d0<15){ if(sea) A.ping(523,.014*(1-d0/15)); else A.chime(9,0,.03*(1-d0/15)); } } }
  /* Ogive: the hoop at the height asked for; every so often the engine is fired on the pad */
  if(OG&&MK.og.st==='on'){ OG.hoop.matrix.copy(OG.M).multiply(Mf.makeTranslation(0,5.3+Math.sin(t*.9)*.08,0)); OG.hoop.matrixWorldNeedsUpdate=true;
    OG.t+=dt; if(OG.t>14){ OG.t=0; const d0=near(INST.og);
      for(let k=0;k<12;k++){ const a=k/12*TAU+Math.random()*.3; V2.set(Math.cos(a)*.34,.22,Math.sin(a)*.34).applyMatrix4(OG.M); V3.set(Math.cos(a)*2,.5,Math.sin(a)*2).applyMatrix4(OG.M).sub(V2); puff(V2,V3,.16+Math.random()*.1,1.3); }
      if(!quiet&&d0<15) A.vent(0); } }
  if(BE) BE.lt.visible=(t/1.6)%1<.3;
  buskUpdate(dt,t);   // Diarmuid: his guitar, his hands, his lights
  if(KR){ const u=(t/3.4)%2, w=u<1?sstep(.86,1,u):1-sstep(1.86,2,u); KRC.copy(KRY).lerp(KRT,w);   // you speak, then the buyer answers
    for(let k=0;k<28;k++){ const a=k/28*TAU, hh=.12+.32*Math.abs(Math.sin(a*3+t*4.2)*Math.sin(t*1.7+k*.4)); Qb.setFromAxisAngle(UPY,-a); Mf.compose(V.set(Math.cos(a)*.33,0,Math.sin(a)*.33),Qb,V2.set(1,hh,1)); KR.bars.setMatrixAt(k,Mf); KR.bars.setColorAt(k,KRC); }
    KR.bars.instanceMatrix.needsUpdate=true; KR.bars.instanceColor.needsUpdate=true;
    const who=w>.5?1:0; if(who!==KR.who&&Math.abs(w-.5)>.4){ KR.who=who; const d0=near(INST.kr); if(!quiet&&d0<9&&MK.kr.st==='on') A.phrase(who,.014*(1-d0/9)); } }
  BIRDS.forEach(b=>{ const a=b.ph+t*b.sp, sg=Math.sign(b.sp), x=b.c[0]+Math.cos(a)*b.r, z=b.c[1]+Math.sin(a)*b.r; at(x,z,BU); tang(BU,at(x-Math.sin(a)*sg,z+Math.cos(a)*sg,V),V2); standOn(b.g,BU,V2,b.h);
    const fl=Math.sin(t*9+b.ph)*.5; b.wl.rotation.z=fl; b.wr.rotation.z=-fl; });
  // sound: the music and birds now and then
  A.music(FIN.on?FIN.mus:CUT.on?(CUT.t>T_HOV-.6?.55*sstep(T_HOV-.6,T_LAND+.9,CUT.t):0):.55);   /* the town's music is up before the roar dies away */ skyUpdate(dt,t); birdT-=dt; if(birdT<=0){ birdT=1.2+Math.random()*3.5; if(!(FIN.on&&FIN.shut)){ if(SKY.night>.5) A.cricket((Math.random()-.5)*1.6); else if(WX.rain<.3) A.chirp((Math.random()-.5)*1.6); } }   /* crickets at night, no birds in the rain */
  cafeStep(dt,t);   // the café: its room, its barista, and its camera while you are inside
  A.hiss(0); A.wind(0);   // (no sea hiss and no wind on Earth: they were the static under the town)
};
st._dbg={post:PC,steer:{PHS,set:steerSet,step(sec){ for(let i=0;i<sec*10;i++) steerUpdate(.1,G.uTime.value+i*.1); }},sky:{set(o){ if(o.time) SKYSET.time=o.time; if(o.date) SKYSET.date=o.date; skyClock(); if(o.weather){ SKYSET.weather=o.weather; skyWeather(); } if(o.wxT!=null) WX.t=o.wxT; skyApply(); },
    step(sec){ for(let i=0;i<sec*10;i++) skyUpdate(.1,G.uTime.value+i*.1); },   // the tests run the weather and the lamps on without waiting for slow frames
    get state(){ return {h:+SKY.h.toFixed(2),md:SKY.md,e:+SKY.e.toFixed(1),night:+SKY.night.toFixed(2),dusk:+SKY.dusk.toFixed(2),kind:WX.kind,rain:+WX.rain.toFixed(2),fog:+WX.fog.toFixed(2),bow:+WX.bow.toFixed(2),
      season:+LU.uSeason.value.toFixed(2),snow:LU.uSnow.value,lamps:LAMPS.map(l=>+l.k.toFixed(2)),fx:{fall:!!(FALL&&FALL.visible),flies:!!FLIES,xmas:!!XMAS,pumpkins:PUMPS.length}}; },WX,SKY,LAMPS,get FALL(){ return FALL; }},
  began,get started(){ return started; },RK,DOOR:()=>[DOOR_SHUT,DOOR_OPEN],LU,MK,seen,linesFor,MET,AH,GLN,FIN,startFinale,goTalk,talkTo,navPath,NAV,pickPerson,INST,PJ,marksEnter,openInvite,cut:()=>CUT,skipCut,place:()=>placeAtStart(),player,get people(){return people;},cam:C,OBS,at,loc,openTalk,closeTalk,nextTalk,talk:()=>TALK,get started(){return started;},head:i=>people[i].dir.clone().multiplyScalar(R+standH(people[i].x,people[i].z)+1.05)};

/* ---------- the cliff: a bench and a kite ----------
   Out on the east cliff, south of the lighthouse and clear of the town and its landmarks, a bench looks over the sea with a
   kite leaning on its back. Click the bench (or walk into it from the front or round an end, or press E beside it) and you
   go over and sit down, and the camera settles slowly into a wide view over the water toward the sun; by night, toward the
   western horizon. Anything you do then (a click, a drag, a key, the stick) stands you up and gives the camera back. Click
   the kite and you pick it up and carry it round to the top of the drop, where it rises on the wind on a string from your
   hand, its ribbon streaming. Drag to steer it and it swoops, climbs and dives a moment behind your hand; let go and it flies
   on steadily. Walk off, or click anywhere else, and it drifts down and is reeled in to its place by the bench.
   It is all the town's own kit and toon materials, so the light falls on it as on everything else, and the sun is read where
   it is, every frame. It is built after the town and its trees, so not one of theirs moves, and marks its own ground (and its
   one way in) on the walking grid. It takes the input it needs by wrapping the station's pointer handler and listening for
   itself, and touches the camera only after the town's rig has placed it, so nothing else on Earth works any differently. */
/* the bench, the way it faces (out to sea), and how far the view may turn from that to follow the sun. It stands in a nook
   between two trees, with a rock at each end of the ground in front of it, where the cliff drops to the sea; you reach that
   ground round its left end, where you also fly the kite */
const CLF={x:16.13,z:-6.25,yaw:Math.PI/2+.06,lim:.95};
/* west, for the view by night: the planet's +x, the side the town's sun stands over and the bench looks out to */
const CLWEST=WEST.clone();   // west as the sky has it (see the sky over Earth)
const CLMOVE=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'], CLNR=18, CLNS=22;
/* st: idle, go (walking over), sit (sitting down), sat, up (getting up). k: home, go (walking over), carry (round to the edge),
   rise, fly, down (back to the bench) */
const CL={st:'idle',t:0,arm:true,view:false,k:'home',kt:0,ws:0,vs:0,wk:0,vk:0,az:0,el:.2,vaz:0,vel:0,taz:0,tel:.9,L:1.4,look:0,lookOn:false,kcOn:false,drag:null,tap:null,held:new Set(),hov:null,
  fl:0,tg:0,acc:0,stuck:0,crk:false,lift:false,pan:0,sp:0,k0:new T.Vector3(),q0:new T.Quaternion(),pv:new T.Vector3(),kcP:new T.Vector3(),kcL:new T.Vector3(),
  kx:new T.Vector3(1,0,0),kz:new T.Vector3(0,0,1),rib:[]};
let CLM=null;
const cv0=new T.Vector3(), cv1=new T.Vector3(), cv2=new T.Vector3(), cv3=new T.Vector3(), cv4=new T.Vector3(), cv5=new T.Vector3(), cv6=new T.Vector3(), cv7=new T.Vector3(), cvP=new T.Vector3(), cvL=new T.Vector3();
const cq0=new T.Quaternion(), cq1=new T.Quaternion(), ce0=new T.Euler(), cm0=new T.Matrix4(), CLDOWN=new T.Vector3(0,-1,0);
function buildCliff(){
  const M=frameAt(CLF.x,CLF.z,CLF.yaw), lp=(x,y,z,o=new T.Vector3())=>o.set(x,y,z).applyMatrix4(M), xz=(x,z)=>loc(lp(x,0,z,cv0).normalize());
  const up=at(CLF.x,CLF.z), lf=new T.Vector3().setFromMatrixColumn(M,0).normalize(), fw=new T.Vector3().setFromMatrixColumn(M,2).normalize();   // its up, its left as you sit on it, its front
  /* the town's own bench, the same as the four round the square; solid as two round ends rather than one wide circle, which
     here would close the way round it to the ground in front */
  bench(CLF.x,CLF.z,CLF.yaw); OBS.pop(); obsAt(M,-.38,0,.38,1); obsAt(M,.38,0,.38,1);
  const kb=xz(.46,-.72); obs(kb[0],kb[1],.28,.9);   // and the kite, where it leans on it, is solid too
  /* the walking grid was made before these: they mark their own ground on it, by the same rule */
  for(const o of OBS.slice(-3)){ const m=o.r+.3; for(let j=0;j<NAV.N;j++) for(let i=0;i<NAV.N;i++){ const dx=NAV.O+i*NAV.S-o.x, dz=NAV.O+j*NAV.S-o.z; if(dx*dx+dz*dz<m*m) NAV.free[j*NAV.N+i]=0; } }
  /* the kite: a diamond of orange and cream, bowed a little toward you, on a spine and a cross spar */
  const P_=[], N_=[], C_=[], tri=(a,b,c,col)=>{ const n=cv0.subVectors(b,a).cross(cv1.subVectors(c,a)).normalize(); if(n.z<0){ const s=b; b=c; c=s; n.negate(); } const k=C3(col);
    for(const p of [a,b,c]){ P_.push(p.x,p.y,p.z); N_.push(n.x,n.y,n.z); C_.push(k.r,k.g,k.b); } };
  const dT=v3(0,.3,0), dB=v3(0,-.62,0), dL=v3(-.36,0,-.05), dR=v3(.36,0,-.05), dC=v3(0,0,.03);
  tri(dT,dL,dC,'#ef8a3c'); tri(dT,dC,dR,'#f7efe2'); tri(dL,dB,dC,'#f7efe2'); tri(dC,dB,dR,'#ef8a3c');
  const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.Float32BufferAttribute(P_,3)); sg.setAttribute('normal',new T.Float32BufferAttribute(N_,3)); sg.setAttribute('color',new T.Float32BufferAttribute(C_,3));
  const spar=(a,b)=>new T.BoxGeometry(.018,a.distanceTo(b),.018).applyMatrix4(cm0.compose(cv0.addVectors(a,b).multiplyScalar(.5),cq0.setFromUnitVectors(UPY,cv1.subVectors(b,a).normalize()),cv2.set(1,1,1)));
  const kite=new T.Group(); sc.add(kite);
  [new T.Mesh(sg,toonMat('#ffffff',{vc:true,side:T.DoubleSide,fig:true})),new T.Mesh(mergeG([spar(v3(0,.3,-.014),v3(0,-.62,-.014)),spar(v3(-.35,0,-.064),v3(0,0,.012)),spar(v3(0,0,.012),v3(.35,0,-.064))]),toonMat('#5a4537',{fig:true}))]
    .forEach(m=>{ m.userData.dyn=true; kite.add(m); });
  /* leaning on the back of the bench, its foot in the grass and its face to the town */
  const hb=lp(.46,.02,-.84), ky=lp(.46,.8,-.28).sub(hb).normalize(), kx=lf.clone().negate(), kz=new T.Vector3().crossVectors(kx,ky).normalize();
  const homeQ=new T.Quaternion().setFromRotationMatrix(cm0.makeBasis(kx,ky,kz)).multiply(cq0.setFromAxisAngle(UPY,.22)), homeP=hb.clone().addScaledVector(ky,.62);
  /* its ribbon tail, lying in the grass behind it in a lazy curve */
  const home=[]; { let x=.46, z=-.84; for(let i=0;i<CLNR;i++){ home.push(lp(x,.018,z)); const a=1.05*Math.cos(i*.55)-.3; x+=Math.sin(a)*.12; z-=Math.cos(a)*.12; } }
  const rp=new Float32Array(CLNR*6), rn=new Float32Array(CLNR*6), ri=[]; for(let i=0;i<CLNR-1;i++) ri.push(i*2,i*2+1,i*2+2, i*2+1,i*2+3,i*2+2);
  const rg=new T.BufferGeometry(); rg.setAttribute('position',new T.BufferAttribute(rp,3).setUsage(T.DynamicDrawUsage)); rg.setAttribute('normal',new T.BufferAttribute(rn,3).setUsage(T.DynamicDrawUsage)); rg.setIndex(ri);
  const rib=new T.Mesh(rg,toonMat('#d9553d',{side:T.DoubleSide,fig:true})); rib.frustumCulled=false; rib.userData.dyn=true; sc.add(rib);
  CL.rib=home.map(p=>({p:p.clone(),q:p.clone()}));
  /* the string: a strip turned to the camera, a pen line wide wherever it is, drawn with the colours only (no ink round it) */
  const sp=new Float32Array(CLNS*6), sn=new Float32Array(CLNS*6), si=[]; for(let i=0;i<CLNS*2;i++) sn[i*3+1]=1; for(let i=0;i<CLNS-1;i++) si.push(i*2,i*2+1,i*2+2, i*2+1,i*2+3,i*2+2);
  const stg=new T.BufferGeometry(); stg.setAttribute('position',new T.BufferAttribute(sp,3).setUsage(T.DynamicDrawUsage)); stg.setAttribute('normal',new T.BufferAttribute(sn,3)); stg.setIndex(si);
  const str=new T.Mesh(stg,flatMat('#2f2925')); str.material.side=T.DoubleSide; str.frustumCulled=false; str.layers.set(1); str.visible=false; sc.add(str);
  /* the reel: in the grass by the kite, and in your hand while you fly it */
  const reelG=new T.CylinderGeometry(.03,.03,.085,10).rotateZ(Math.PI/2), reelM=toonMat('#b8834f',{fig:true});
  const inHand=new T.Mesh(reelG,reelM); inHand.position.set(0,-.2,.045); inHand.visible=false; me.userData.fore[0].add(inHand);
  const onGround=new T.Mesh(reelG,reelM); onGround.position.copy(lp(.8,.03,-1)); onGround.quaternion.setFromRotationMatrix(M).multiply(cq0.setFromAxisAngle(UPY,.8)); sc.add(onGround);
  /* what a click finds: a box round each (never drawn) */
  const hit=(w,h,d,x,y,z)=>{ const m=new T.Mesh(new T.BoxGeometry(w,h,d)); m.applyMatrix4(cm0.copy(M).multiply(new T.Matrix4().makeTranslation(x,y,z))); m.updateMatrixWorld(true); return m; };
  /* where you stand to sit down (on the ground in front, by its left end), and to take the kite (behind it); you fly the kite
     from that ground in front, at the top of the drop */
  CLM={M,up,lf,fw,b:[CLF.x,CLF.z],bW:at(CLF.x,CLF.z).multiplyScalar(R),fx:Math.sin(CLF.yaw),fz:Math.cos(CLF.yaw),lx:Math.cos(CLF.yaw),lz:-Math.sin(CLF.yaw),sitA:xz(.8,.66),kiteA:xz(.85,-1.45),kb,
    seatP:lp(.28,.04,.13),seatQ:new T.Quaternion().setFromRotationMatrix(M),headW:lp(.28,1.15,.13),tagB:lp(0,1.3,0),tagK:lp(.62,1.12,-.7),reelW:lp(.8,.06,-1),
    kite,homeP,homeQ,home,rib,str,inHand,onGround,hitB:hit(1.75,1.1,1,0,.5,-.02),hitK:new T.Mesh(new T.BoxGeometry(.85,1.05,.3))};
  CLM.hitK.position.copy(homeP).addScaledVector(ky,-.16); CLM.hitK.quaternion.copy(homeQ); CLM.hitK.updateMatrixWorld(true);   // the kite's, close round it as it leans
  clWay([CLM.sitA,CLM.kiteA]); kiteHome(); }
/* the way in. The town's walking grid is coarse (a cell every 40 cm, each kept 30 cm clear of anything solid), and the trees
   and rocks along this cliff stand close together, so ground you can walk over is not always ground the grid can see a way
   across. From each spot here, a search over the same cells, allowed a little nearer the stones and trunks (16 cm clear, where
   walking past one only nudges you), finds the nearest ground the town can already reach, and the cells along that way are
   opened. Nothing else of the grid changes: it is one way in, so it is no short cut for any other walk */
function clWay(goals){ const n=NAV.N, F=NAV.free, id=(i,j)=>j*n+i, inn=(i,j)=>i>=0&&j>=0&&i<n&&j<n, free=(i,j)=>inn(i,j)&&F[id(i,j)]===1;
  const town=new Uint8Array(n*n), q=[navNear(...navIJ(0,-4))]; town[id(...q[0])]=1;
  while(q.length){ const [i,j]=q.pop(); for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ const a=i+di, b=j+dj; if((!di&&!dj)||!free(a,b)||town[id(a,b)]||(di&&dj&&(!free(i+di,j)||!free(i,j+dj)))) continue; town[id(a,b)]=1; q.push([a,b]); } }
  const near=OBS.filter(o=>Math.hypot(o.x-CLF.x,o.z-CLF.z)<17), loose=new Map(), ok=(i,j)=>{ if(!inn(i,j)) return false; if(F[id(i,j)]) return true; const k=id(i,j); if(loose.has(k)) return loose.get(k);
    const x=NAV.O+i*NAV.S, z=NAV.O+j*NAV.S; let v=Math.hypot(x-CLF.x,z-CLF.z)<14&&walkable(x,z); if(v) for(const o of near){ const dx=x-o.x, dz=z-o.z, m=o.r+.16; if(dx*dx+dz*dz<m*m){ v=false; break; } } loose.set(k,v); return v; };
  for(const [gx,gz] of goals){ let s=navIJ(gx,gz); if(!ok(...s)) for(let r=1;r<3&&!ok(...s);r++) for(let dj=-r;dj<=r;dj++) for(let di=-r;di<=r;di++) if(ok(s[0]+di,s[1]+dj)){ s=[s[0]+di,s[1]+dj]; }
    if(!ok(...s)||town[id(...s)]) continue;
    const from=new Map([[id(...s),-1]]), qq=[s]; let end=null;
    for(let h=0;h<qq.length&&!end;h++){ const [i,j]=qq[h]; for(let dj=-1;dj<=1&&!end;dj++) for(let di=-1;di<=1&&!end;di++){ const a=i+di, b=j+dj, k=id(a,b);
      if((!di&&!dj)||from.has(k)||!ok(a,b)||(di&&dj&&(!ok(i+di,j)||!ok(i,j+dj)))) continue; from.set(k,id(i,j)); if(town[k]) end=k; else qq.push([a,b]); } }
    for(let k=end, p=end==null?-1:from.get(end); k!=null&&k>=0; k=p, p=k>=0?from.get(k):-1){ F[k]=1; if(p>=0){ const i=k%n, j=(k-i)/n, i2=p%n, j2=(p-i2)/n; if(i!==i2&&j!==j2){ F[id(i,j2)]=1; F[id(i2,j)]=1; } } } } }

/* ---------- the cliff: sitting down, and getting up again ---------- */
function clWalk(ax,az){ const P=player, d=Math.hypot(P.x-ax,P.z-az); let path=null;
  if(d>2.2||!navClear(P.x,P.z,ax,az)) path=navPath(P.x,P.z,ax,az,1.3);   // the way round, to near enough, and the last steps straight there
  P.path=(path||[]).concat([[ax,az]]); P.tgt=null; P.stuck=0; TALK.goal=null; C.guide=null; CL.stuck=0; began(); A.tick(); }
function clFree(){ return !!CLM&&!FIN.on&&!CUT.on&&!TALK.p&&GLN.t<0; }
function clGoSit(){ if(!clFree()||(CL.st!=='idle'&&CL.st!=='go')) return; if(CL.k==='carry'||CL.k==='rise'||CL.k==='fly') kiteEnd(); else if(CL.k==='go') CL.k='home';
  const [ax,az]=CLM.sitA; if(Math.hypot(player.x-ax,player.z-az)<.45){ began(); clSit(); return; } clWalk(ax,az); CL.st='go'; }
function clGoKite(){ if(!clFree()||(CL.k!=='home'&&CL.k!=='go')) return; if(CL.st==='sat'||CL.st==='sit') clStand(); else if(CL.st==='go') CL.st='idle';
  const [ax,az]=CLM.kiteA; if(Math.hypot(player.x-ax,player.z-az)<.45){ began(); kiteTake(); return; } clWalk(ax,az); CL.k='go'; }
/* on the way over: there, sit down (or take the kite); set off somewhere else, and it is forgotten; held up for long, close
   enough is close enough */
function clGo(dt){ const P=player, gb=CL.st==='go', gk=CL.k==='go'; if(!gb&&!gk) return; const [ax,az]=gb?CLM.sitA:CLM.kiteA, d=Math.hypot(P.x-ax,P.z-az);
  const off=()=>{ if(gb) CL.st='idle'; else CL.k='home'; }, done=()=>{ P.path=null; P.tgt=null; if(gb) clSit(); else kiteTake(); };
  if(TALK.goal||TALK.p||(!P.path&&!P.tgt&&d>.6)) return off();
  if(d<.3||(!P.path&&!P.tgt)) return done();
  CL.stuck=P.speed<.25?CL.stuck+dt:Math.max(0,CL.stuck-dt);
  if(CL.stuck>1.3){ CL.stuck=0; if(d<1.4) done(); else { P.path=null; P.tgt=null; off(); } } }
function clSit(){ const P=player; CL.st='sit'; CL.t=0; CL.crk=false; CL.lookOn=false; P.path=null; P.tgt=null; P.speed=0; TALK.goal=null; C.guide=null;
  /* what you were holding to walk over does not count as getting up again: it is let go of, here */
  CL.held=new Set(CLMOVE.filter(k=>keys.has(k))); CL.held.forEach(k=>keys.delete(k)); if(down&&down.touch){ down=null; stickOff(); } look=null; }
function clStand(){ if(CL.st!=='sat'&&CL.st!=='sit') return; const P=player; CL.st='up'; CL.t=0; CL.held.clear(); CL.arm=false; A.creak(true);
  tang(P.u,CLM.fw,P.f); C.pitch=C.PITCH; C.dragT=0; }   // you stand facing the sea, and the town's camera picks you up from there
/* anything that would walk you: a key (not one held since you sat down) or the stick */
function clMoving(){ for(const k of CLMOVE) if(keys.has(k)&&!CL.held.has(k)) return true; return !!(down&&down.touch&&down.moved&&Math.hypot(down.ix,down.iz)>.15); }
function clSeat(dt,t){ const P=player, d=me.userData; CL.t+=dt; let mv=1, sk=1;
  if(CL.st==='sit'){ mv=E.io(clamp(CL.t/.75,0,1)); sk=sstep(.2,.8,CL.t); if(!CL.crk&&CL.t>.42){ CL.crk=true; A.creak(); } if(CL.t>=.85){ CL.st='sat'; CL.t=0; tang(P.u,CLM.fw,P.f); } }
  else if(CL.st==='sat'){ P.speed=0; P.tgt=null; P.path=null; if(clMoving()) clStand(); }
  if(CL.st==='up'){ mv=1-E.io(clamp((CL.t-.06)/.5,0,1)); sk=1-sstep(0,.38,CL.t); if(CL.t>=.6){ CL.st='idle'; clPoseOff(); return; } }
  /* from where the walk left you onto the seat, turning round; then the legs swing up and dangle, the hands in the lap, and
     the head turns a little toward wherever the view looks */
  me.position.lerp(CLM.seatP,mv); me.quaternion.slerp(CLM.seatQ,mv);
  if(sk<=0) return;
  d.legs[0].rotation.x=lerp(d.legs[0].rotation.x,-1.08+Math.sin(t*1.7)*.09,sk); d.legs[1].rotation.x=lerp(d.legs[1].rotation.x,-1.08+Math.sin(t*1.7+2.2)*.09,sk);
  for(let i=0;i<2;i++){ d.arms[i].rotation.x=lerp(d.arms[i].rotation.x,-.42,sk); d.fore[i].rotation.x=lerp(d.fore[i].rotation.x,-.95,sk); }
  d.body.rotation.x=-.05*sk; d.head.rotation.x=-.12*sk; d.head.rotation.y=clamp(CL.look*.55,-.5,.5)*sk; }
function clPoseOff(){ const d=me.userData; d.body.rotation.x=0; d.head.rotation.x=0; d.head.rotation.y=0; }
/* the view from the bench: from high up behind you, over the trees that stand either side, wide out over the sea; turned toward
   the sun if it is low (as far round as the sea goes), straight out if it is high, and toward the western horizon by night.
   This world is small enough that from up here its horizon is well below level, so the view looks down to it, keeping you
   on the bench low in the picture. The sun is read every frame, so the view follows it as the day moves it */
function seatCam(dt,oP,oL){ const u=CLM.up, f=CLM.fw, l=CLM.lf, sE=SUN.dot(u);
  cv0.copy(SUN).addScaledVector(u,-sE); let a=0; if(cv0.lengthSq()>1e-8) a=clamp(Math.atan2(cv0.dot(l),cv0.dot(f)),-CLF.lim,CLF.lim)*sstep(.75,.35,sE);
  cv1.copy(CLWEST).addScaledVector(u,-CLWEST.dot(u)); const wa=cv1.lengthSq()>1e-8?clamp(Math.atan2(cv1.dot(l),cv1.dot(f)),-CLF.lim,CLF.lim):0;
  a=lerp(wa,a,sstep(-.06,.04,sE));
  if(!CL.lookOn){ CL.look=a; CL.lookOn=true; } else CL.look=damp(CL.look,a,.35,dt);
  const port=innerHeight>innerWidth, dir=cv2.copy(f).multiplyScalar(Math.cos(CL.look)).addScaledVector(l,Math.sin(CL.look)), side=cv4.crossVectors(u,dir);
  oP.copy(CLM.headW).addScaledVector(dir,port?-3.9:-3.4).addScaledVector(u,port?4.9:4.4).addScaledVector(side,port?.7:.9);   // (to the left: the big tree is on the right)
  const cu=cv3.copy(oP).normalize(), dip=Math.acos(clamp((R+WATER)/oP.length(),-1,1)), pit=dip+(port?.14:.08); dir.addScaledVector(cu,-dir.dot(cu)).normalize();
  oL.copy(oP).addScaledVector(dir,Math.cos(pit)*8).addScaledVector(cu,-Math.sin(pit)*8); }

/* ---------- the cliff: the kite ---------- */
function kiteHome(){ const m=CLM, d=me.userData; m.kite.position.copy(m.homeP); m.kite.quaternion.copy(m.homeQ); CL.rib.forEach((r,i)=>{ r.p.copy(m.home[i]); r.q.copy(m.home[i]); });
  ribbonMesh(0,true); m.str.visible=false; m.inHand.visible=false; m.onGround.visible=true; d.arms[0].quaternion.identity(); }
/* taken from behind the bench: carried round its end to the top of the drop, and let go there into the wind */
function kiteTake(){ const P=player; CL.kt=0; CL.kcOn=false; CL.fl=.4; P.path=null; P.tgt=null; P.speed=0; TALK.goal=null; C.guide=null; CLM.onGround.visible=false; CLM.inHand.visible=true; A.flutter(.25,0);
  const [ax,az]=CLM.sitA; if(Math.hypot(P.x-ax,P.z-az)<.5) return kiteRise(); CL.k='carry'; clWalk(ax,az); CL.stuck=0; }
function kiteRise(){ const P=player; CL.k='rise'; CL.kt=0; CL.az=0; CL.el=.22; CL.vaz=CL.vel=0; CL.taz=0; CL.tel=.95; CL.L=1.4; CL.tg=.8; CL.acc=0; CL.lift=false; CL.kcOn=false; CL.pv.set(0,0,0);
  CL.k0.copy(CLM.kite.position); CL.q0.copy(CLM.kite.quaternion); P.path=null; P.tgt=null; P.speed=0; CLM.str.visible=true; }
function kiteEnd(){ if(CL.k!=='carry'&&CL.k!=='rise'&&CL.k!=='fly') return; CL.k='down'; CL.kt=0; CL.k0.copy(CLM.kite.position); CL.q0.copy(CLM.kite.quaternion); CL.drag=null;
  const d=me.userData; CLM.inHand.visible=false; CLM.onGround.visible=true; d.arms[0].quaternion.identity(); d.fore[0].rotation.set(-.12,0,0); A.flutter(.45,CL.pan); }
/* steering: across the screen sweeps it from one side of the wind to the other, up the screen climbs, down dives */
function kiteSteer(dx,dy){ CL.taz=clamp(CL.taz+dx/innerWidth*2.6*(innerHeight>innerWidth?1.5:1),-1.2,1.2); CL.tel=clamp(CL.tel-dy/innerHeight*2.4,.14,1.15); }
/* the wind where you stand: W the way it blows (out to sea), U up, Rt your right as you face it */
const kW=new T.Vector3(), kU=new T.Vector3(), kRt=new T.Vector3(), kO=new T.Vector3(), kTel=new T.Vector3(), kTaz=new T.Vector3(), kVt=new T.Vector3(), kN=new T.Vector3(), kNf=new T.Vector3(), kHand=new T.Vector3(), kAt=new T.Vector3();
function kiteUpdate(dt,t){ const P=player, K=CLM.kite, d=me.userData; CL.kt+=dt;
  kU.copy(P.u); tang(kU,CLM.fw,kW); kRt.crossVectors(kW,kU);
  kO.copy(P.u).multiplyScalar(R+P.h+1.12).addScaledVector(kW,.15);   // where the line runs from: about your hand, held up
  if(CL.k==='carry'){
    if(clMoving()||TALK.goal) return kiteEnd();   // you set off somewhere else: it goes back
    const [ax,az]=CLM.sitA; CL.stuck=P.speed<.25?CL.stuck+dt:Math.max(0,CL.stuck-dt);
    if(Math.hypot(P.x-ax,P.z-az)<.3||(!P.path&&!P.tgt)||CL.stuck>1.3){ P.path=null; P.tgt=null; kiteRise(); }
    else { /* in your right hand, upright at your side, its face turned out */
      const a=d.arms[0]; a.rotation.x=-.18; a.rotation.z=-.22; d.fore[0].rotation.set(-.55,0,0); me.updateMatrixWorld(true); d.fore[0].localToWorld(kHand.set(0,-.2,.045));
      K.quaternion.copy(me.quaternion).multiply(cq1.setFromEuler(ce0.set(0,-Math.PI/2,0)));
      K.position.copy(kHand).addScaledVector(cv0.set(0,1,0).applyQuaternion(me.quaternion),.47).addScaledVector(cv1.set(-1,0,0).applyQuaternion(me.quaternion),.09);
      CL.kx.set(1,0,0).applyQuaternion(K.quaternion); CL.kz.set(0,0,1).applyQuaternion(K.quaternion); }
  }
  if(CL.k==='rise'||CL.k==='fly'){
    if(clMoving()||TALK.goal) return kiteEnd();   // you walk off: it comes down
    const rk=CL.k==='rise'?E.o(clamp(CL.kt/1.9,0,1)):1; CL.L=lerp(1.4,7.2,rk);   // the line pays out as it climbs
    if(CL.k==='rise'){ if(!CL.lift&&CL.kt>.2){ CL.lift=true; A.lift(); } if(CL.kt>=1.9) CL.k='fly'; }
    /* let go, and it settles where the wind holds it: back toward the middle, and up off the water */
    if(!CL.drag&&CL.k==='fly'){ CL.taz=damp(CL.taz,0,.3,dt); CL.tel=damp(CL.tel,clamp(CL.tel,.7,1.05),.6,dt); }
    /* where your hand asks it to be, and where it is: a spring a moment behind, that overshoots a little in a swoop */
    const w=4.2, z=.6; CL.vaz+=(w*w*(CL.taz-CL.az)-2*z*w*CL.vaz)*dt; CL.vel+=(w*w*(CL.tel-CL.el)-2*z*w*CL.vel)*dt; CL.az+=CL.vaz*dt; CL.el+=CL.vel*dt;
    let hit=0;   // the edges of the wind: low over the water, high overhead, far out to the sides
    if(CL.el<.14){ hit=-CL.vel; CL.el=.14; CL.vel=Math.abs(CL.vel)*.25; } if(CL.el>1.2){ CL.el=1.2; CL.vel=-Math.abs(CL.vel)*.25; }
    if(Math.abs(CL.az)>1.22){ hit=Math.max(hit,Math.abs(CL.vaz)*CL.L*.3); CL.az=Math.sign(CL.az)*1.22; CL.vaz*=-.25; }
    const sp=Math.hypot(CL.vaz*Math.cos(CL.el),CL.vel)*CL.L, wb=.03+.03*clamp(sp/6,0,1);   // its speed through the air; and the wind is never quite steady
    const az=CL.az+wb*(Math.sin(t*1.3)+.6*Math.sin(t*3.4+1.7)), el=CL.el+wb*.8*(Math.sin(t*1.05+2.3)+.6*Math.sin(t*2.7+.4)), ce=Math.cos(el), se=Math.sin(el), ca=Math.cos(az), sa=Math.sin(az);
    cv0.copy(kW).multiplyScalar(ce*ca).addScaledVector(kRt,ce*sa).addScaledVector(kU,se); const pos=cv1.copy(kO).addScaledVector(cv0,CL.L);
    /* which way it points: up off the line while it hangs there, into the turn as it swoops; its face to you */
    kTel.copy(kW).multiplyScalar(-se*ca).addScaledVector(kRt,-se*sa).addScaledVector(kU,ce); kTaz.copy(kW).multiplyScalar(-sa).addScaledVector(kRt,ca);
    kVt.copy(kTaz).multiplyScalar(CL.vaz*CL.L*ce).addScaledVector(kTel,CL.vel*CL.L);
    kNf.subVectors(kO,pos).normalize(); kN.copy(kTel).addScaledVector(kVt,.8/(sp+.8)); kN.addScaledVector(kNf,-kN.dot(kNf)).normalize();
    cv2.crossVectors(kN,kNf); cq0.setFromRotationMatrix(cm0.makeBasis(cv2,kN,kNf)).multiply(cq1.setFromEuler(ce0.set(0,.16*Math.sin(t*1.9),.1*Math.sin(t*2.3)+.05*Math.sin(t*5.1))));   // and it rocks a little
    if(CL.k==='rise'){ const b=sstep(0,.8,CL.kt); K.position.lerpVectors(CL.k0,pos,b); K.quaternion.slerpQuaternions(CL.q0,cq0,b); }
    else { K.position.copy(pos); K.quaternion.copy(cq0); }
    /* the pull on the string: a tug when it changes course hard, or reaches the edge of the wind; the cloth flaps as fast as it flies */
    cv4.copy(kVt).sub(CL.pv); CL.pv.copy(kVt); CL.acc=damp(CL.acc,cv4.length()/Math.max(dt,1e-3),10,dt); CL.sp=sp;
    cv5.copy(K.position).project(stCam); CL.pan=clamp(cv5.x*.7,-.7,.7);
    CL.tg-=dt; if(CL.k==='fly'&&CL.tg<=0&&(CL.acc>7||hit>1.2)){ A.tug(clamp(Math.max((CL.acc-7)/18,hit/4),0,1),CL.pan); CL.tg=.32; }
    if(sp>2.1&&CL.fl>.5) CL.fl=.04+Math.random()*.08;   // (a swoop out of a lull is heard at once, not after the lull's long wait)
    CL.fl-=dt; if(CL.fl<=0){ const k=clamp(sp/7,0,1); A.flutter(.12+.88*k,CL.pan); CL.fl=k>.15?.13+.3*(1-k)+Math.random()*.06:1.1+Math.random()*1.4; }
    /* you face it, and hold the string up toward it */
    tang(P.u,cv6.subVectors(K.position,kO),cv7); const s=cv0.crossVectors(P.f,cv7).dot(P.u), c=P.f.dot(cv7); rot(P.f,P.u,clamp(Math.atan2(s,c),-4*dt,4*dt));
    const arm=d.arms[0]; me.updateMatrixWorld(true); arm.parent.worldToLocal(cv6.copy(K.position)).sub(arm.position).normalize();
    arm.quaternion.setFromUnitVectors(CLDOWN,cv6.lerp(CLDOWN,.25).normalize()); d.fore[0].rotation.set(-.3,0,0); me.updateMatrixWorld(true); d.fore[0].localToWorld(kHand.set(0,-.2,.045));
    CL.kx.copy(cv2); CL.kz.copy(kNf);
    kAt.copy(K.position).addScaledVector(kNf,.13).addScaledVector(kN,-.06);   // the bridle, where the string ties on
  } else if(CL.k==='down'){
    /* it drifts down like a leaf, swaying, and is reeled in to its place by the bench */
    const u=clamp(CL.kt/2.6,0,1), e=sstep(0,1,u);
    K.position.lerpVectors(CL.k0,CLM.homeP,e).addScaledVector(kU,.9*Math.sin(Math.PI*u)*(1-u)).addScaledVector(kRt,Math.sin(u*Math.PI*2.5)*.5*(1-e));
    K.quaternion.slerpQuaternions(CL.q0,CLM.homeQ,sstep(.3,1,u)).multiply(cq0.setFromAxisAngle(cv0.set(0,0,1),.35*Math.sin(u*Math.PI*3)*(1-u)));
    CL.kx.set(1,0,0).applyQuaternion(K.quaternion); CL.kz.set(0,0,1).applyQuaternion(K.quaternion);
    kHand.copy(CLM.reelW); kAt.copy(K.position).addScaledVector(CL.kz,.13);
    CL.fl-=dt; if(CL.fl<=0&&u<.85){ A.flutter(.3*(1-u),CL.pan); CL.fl=.35+Math.random()*.3; }
    if(u>=1){ CL.k='home'; kiteHome(); A.step(0); return; }
  }
  /* the ribbon: each piece follows the one before it, blown out with the wind and down a little, rippling, and never below the
     grass it lies on */
  const rb=CL.rib, tip=cv0.set(0,-.62,0).applyQuaternion(K.quaternion).add(K.position), dd=Math.min(dt,.05), hm=CL.k==='down'?sstep(.62,1,CL.kt/2.6):0, fl=CL.k==='carry'?.25:1;
  rb[0].p.copy(tip);
  for(let i=1;i<rb.length;i++){ const r=rb[i]; cv1.subVectors(r.p,r.q).multiplyScalar(.9); r.q.copy(r.p); r.p.add(cv1).addScaledVector(kW,4.2*fl*dd*dd).addScaledVector(kU,-2.6*dd*dd).addScaledVector(CL.kx,Math.sin(t*8-i*.7)*1.6*fl*dd*dd*i/rb.length); }
  for(let it=0;it<3;it++) for(let i=1;i<rb.length;i++){ const a=rb[i-1].p, b=rb[i].p; cv1.subVectors(b,a); const l=cv1.length()||1e-6; b.copy(a).addScaledVector(cv1,.12/l); }
  for(let i=1;i<rb.length;i++){ const p=rb[i].p, r=p.length(); if(r<R+.016) p.multiplyScalar((R+.016)/r); }
  if(hm>0) for(let i=1;i<rb.length;i++) rb[i].p.lerp(CLM.home[i],hm);
  ribbonMesh(t,false);
  CLM.str.visible=CL.k==='rise'||CL.k==='fly'||(CL.k==='down'&&CL.kt<2.5); }
/* the ribbon's strip: twisting as it ripples while it flies, flat on the grass at home */
function ribbonMesh(t,flat){ const rb=CL.rib, n=rb.length, a=CLM.rib.geometry.attributes, P_=a.position.array, N_=a.normal.array;
  for(let i=0;i<n;i++){ const p=rb[i].p; cv4.subVectors(rb[Math.min(n-1,i+1)].p,rb[Math.max(0,i-1)].p).normalize();
    if(flat) cv5.crossVectors(CLM.up,cv4); else { const ph=.9*Math.sin(t*3.3-i*.5); cv5.copy(CL.kx).multiplyScalar(Math.cos(ph)).addScaledVector(CL.kz,Math.sin(ph)); }
    cv5.addScaledVector(cv4,-cv5.dot(cv4)).normalize(); cv6.crossVectors(cv4,cv5); const w=.036*(1-.3*i/n);
    for(let s=0;s<2;s++){ const k=(i*2+s)*3, g=s?-w:w; P_[k]=p.x+cv5.x*g; P_[k+1]=p.y+cv5.y*g; P_[k+2]=p.z+cv5.z*g; N_[k]=cv6.x; N_[k+1]=cv6.y; N_[k+2]=cv6.z; } }
  a.position.needsUpdate=true; a.normal.needsUpdate=true; }
/* the string's strip, from your hand (or the reel) to the kite, sagging when it is slack, about one and a half pixels wide */
function stringMesh(){ const a=CLM.str.geometry.attributes.position, A_=a.array, cam=st.camP, pxw=2*Math.tan(stCam.fov*Math.PI/360)/innerHeight*.8;
  const L=kHand.distanceTo(kAt), sag=L*(.05-.03*clamp(CL.sp/5,0,1));
  for(let i=0;i<CLNS;i++){ const s=i/(CLNS-1); cv4.lerpVectors(kHand,kAt,s).addScaledVector(kU,-sag*4*s*(1-s));
    cv5.subVectors(kAt,kHand).normalize(); cv6.subVectors(cv4,cam); const w=Math.max(.0025,cv6.length()*pxw); cv6.cross(cv5).normalize().multiplyScalar(w);
    A_[i*6]=cv4.x+cv6.x; A_[i*6+1]=cv4.y+cv6.y; A_[i*6+2]=cv4.z+cv6.z; A_[i*6+3]=cv4.x-cv6.x; A_[i*6+4]=cv4.y-cv6.y; A_[i*6+5]=cv4.z-cv6.z; }
  a.needsUpdate=true; }
/* the camera while you fly it: up behind you looking down a little, turned partly toward the kite, and as far back as it needs
   to be to have you both in the picture (worked out from how far apart you are across it and up it, against its field of view) */
function kiteCam(dt,oP,oL){ const P=player, port=innerHeight>innerWidth, U=P.u, hd=cv4.copy(U).multiplyScalar(R+P.h+1), K=CLM.kite.position, tg=cvL.copy(hd).lerp(K,.5);
  tang(U,cv5.subVectors(K,hd),cv6); const cd=cv5.copy(kW).lerp(cv6,port?.7:.45).normalize(), ph=.32;
  const v=cv6.copy(cd).multiplyScalar(Math.cos(ph)).addScaledVector(U,-Math.sin(ph)), sr=cv7.crossVectors(v,U).normalize(), su=cv3.crossVectors(sr,v), s=cv2.subVectors(K,hd);
  const vf=stCam.fov*Math.PI/360, hf=Math.atan(Math.tan(vf)*innerWidth/innerHeight), ex=Math.abs(s.dot(sr))/2, ey=Math.abs(s.dot(su))/2, ez=Math.abs(s.dot(v))/2;
  cvP.copy(tg).addScaledVector(v,-clamp(ez+Math.max(ey/Math.tan(vf*.74),ex/Math.tan(hf*.74))+.8,4.5,18));
  if(!CL.kcOn){ CL.kcP.copy(cvP); CL.kcL.copy(tg); CL.kcOn=true; } else { CL.kcP.lerp(cvP,1-Math.exp(-2.5*dt)); CL.kcL.lerp(tg,1-Math.exp(-3.5*dt)); }
  oP.copy(CL.kcP); oL.copy(CL.kcL); }

/* ---------- the cliff, each frame: after the town has moved you and placed its camera ---------- */
function cliffUpdate(dt,t){ if(!CLM) return; dt=Math.min(dt,.05); const P=player;
  if(FIN.on||CUT.on){ if(CL.st!=='idle'||CL.k!=='home'||CL.ws>0||CL.wk>0) clReset(); clTagsUpdate(false); return; }
  /* someone talks to you, or the camera goes over to Ahroon: you are up and the kite comes down */
  if(TALK.p||GLN.t>=0){ clStand(); kiteEnd(); if(CL.st==='go') CL.st='idle'; if(CL.k==='go') CL.k='home'; }
  else if(TALK.goal) clStand();   // their name clicked while you sit: you get up and go over
  clGo(dt);
  /* walking into the bench, from in front or round an end (not over its back), sits you down */
  /* (once you have got up, only after you have stepped away from it: getting up and setting off is not walking into it) */
  { const bx=P.x-CLF.x, bz=P.z-CLF.z, lx=bx*CLM.lx+bz*CLM.lz, lz=bx*CLM.fx+bz*CLM.fz, sx=clamp(lx,-.38,.38), dd=Math.hypot(lx-sx,lz); if(dd>1.3) CL.arm=true;
  if(CL.arm&&CL.st==='idle'&&CL.k==='home'&&!P.path&&!TALK.goal&&P.speed>.4){
    if(lz>-.3&&dd<.74&&P.f.dot(cv0.copy(CLM.bW).addScaledVector(CLM.lf,sx).sub(cv1.copy(P.u).multiplyScalar(R)).normalize())>.3){ began(); clSit(); } } }
  if(CL.st==='sit'||CL.st==='sat'||CL.st==='up') clSeat(dt,t);
  if(CL.k==='carry'||CL.k==='rise'||CL.k==='fly'||CL.k==='down') kiteUpdate(dt,t);
  /* the camera: the view from the bench, or the kite and you, eased in slowly and handed back a little quicker */
  const sitW=CL.st==='sat'||(CL.st==='sit'&&CL.t>.35)?1:0, kW_=CL.k==='rise'||CL.k==='fly'?1:0;
  const ws=sitW?1.25:2.4, wk=2.1;
  CL.vs+=(ws*ws*(sitW-CL.ws)-2*ws*CL.vs)*dt; CL.ws+=CL.vs*dt; if(CL.ws>=1){ CL.ws=1; CL.vs=Math.min(0,CL.vs); } if(CL.ws<=.001&&!sitW){ CL.ws=0; CL.vs=0; CL.lookOn=false; }
  CL.vk+=(wk*wk*(kW_-CL.wk)-2*wk*CL.vk)*dt; CL.wk+=CL.vk*dt; if(CL.wk>=1){ CL.wk=1; CL.vk=Math.min(0,CL.vk); } if(CL.wk<=.001&&!kW_){ CL.wk=0; CL.vk=0; CL.kcOn=false; }
  if(GLN.t>=0){ CL.ws=CL.vs=CL.wk=CL.vk=0; }
  if(CL.ws>0){ seatCam(dt,cvP,cvL); st.camP.lerp(cvP,CL.ws); st.camL.lerp(cvL,CL.ws); LU.uPly.value.lerp(st.camP,CL.ws);   // (nothing stands between: nothing is cut away)
    stCam.fov+=6*CL.ws; stCam.updateProjectionMatrix();   // and a little wider (the town sets it back each frame)
    if(CL.ws>.95){ tang(P.u,cv0.subVectors(cvL,cvP),C.f); C.dragT=0; } }   // the town's camera, out of sight, turns to look the same way, so giving it back is a short move
  if(CL.wk>0){ kiteCam(dt,cvP,cvL); st.camP.lerp(cvP,CL.wk); st.camL.lerp(cvL,CL.wk); LU.uPly.value.lerp(st.camP,CL.wk);   /* (as on the bench: nothing cut away, so no speckled ring round you) */ if(CL.wk>.95){ tang(P.u,cv0.subVectors(cvL,cvP),C.f); C.dragT=0; } }
  if(CLM.str.visible) stringMesh();
  if(CL.hov&&(CL.st!=='idle'||CL.k!=='home')) clHover(null);   // the cursor's word goes once the bench or the kite is in use
  const vw=CL.ws>.5; if(vw!==CL.view){ CL.view=vw; el.classList.toggle('clview',vw); }   // while you take in the view, the name tags step aside
  clTagsUpdate(true); }
/* back to how it was: entering or leaving Earth, and when the last flight begins */
function clReset(){ if(!CLM) return; CL.st='idle'; CL.k='home'; CL.ws=CL.vs=CL.wk=CL.vk=0; CL.view=false; el.classList.remove('clview'); CL.drag=null; CL.tap=null; CL.held.clear(); CL.lookOn=false; CL.kcOn=false;
  kiteHome(); me.userData.arms[0].quaternion.identity(); clPoseOff(); }
{ const en=st.enter, ex=st.exit; st.enter=function(){ clReset(); return en.apply(this,arguments); }; st.exit=function(){ clReset(); clTagsUpdate(false); return ex.apply(this,arguments); }; }

/* ---------- the cliff: tags, clicks, drags and keys ---------- */
/* a tag over each when you are near, like the ones over the three of us: it says what to do there, and takes a click */
{ const s=document.createElement('style'); s.textContent='.st-cr.clview #crLabels{opacity:0;transition:opacity .6s}.st-cr.clview #crLabels>*{pointer-events:none!important}'; document.head.appendChild(s); }
const clTags=['Sit','Kite'].map((s,i)=>{ const e=document.createElement('span'); e.className='crl ui'; e.textContent=s; $('#crLabels',el).appendChild(e);
  e.addEventListener('click',ev=>{ ev.stopPropagation(); if(S.st===st&&S.mode==='station') (i?clGoKite:clGoSit)(); }); return {e,on:false,can:false}; });
function clTagsUpdate(live){ const P=player, free=live&&CLM&&clFree()&&CL.st==='idle'&&CL.k==='home';
  clTags.forEach((g,i)=>{ let on=false, can=false;
    const [x,z]=i?CLM.kb:CLM.b, d=free?Math.hypot(P.x-x,P.z-z):99;
    if(d<7){ cv0.copy(i?CLM.tagK:CLM.tagB).project(stCam); on=cv0.z<1&&Math.abs(cv0.x)<.95&&Math.abs(cv0.y)<.95; can=d<(i?2.4:2.6);
      if(on) g.e.style.transform=`translate(${((cv0.x*.5+.5)*innerWidth).toFixed(1)}px,${((-cv0.y*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-100%)`; }
    if(on!==g.on){ g.on=on; g.e.classList.toggle('on',on); } if(can!==g.can){ g.can=can; g.e.classList.toggle('can',can); } }); }
/* what a click is on: the bench, the kite (at home), or neither; never through the ground on the far side of the world */
const clRay=new T.Raycaster(), clBall=new T.Sphere(new T.Vector3(),R-.3), clHits=[];
function clPick(e){ if(!CLM) return null; ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)); clRay.setFromCamera(ndc,stCam);
  const g=clRay.ray.intersectSphere(clBall,cv7)?clRay.ray.origin.distanceTo(cv7):1e9; let best=null, bd=g;
  for(const [id,m] of [['bench',CLM.hitB],['kite',CLM.hitK]]){ if(id==='kite'&&CL.k!=='home') continue; clHits.length=0; m.raycast(clRay,clHits); for(const h of clHits) if(h.distance<bd){ bd=h.distance; best=id; } }
  return best; }
/* the station's own handler goes on doing what it did; while the kite flies every touch is the kite's, and sitting, a touch
   first stands you up */
{ const op=st.onPointer; st.onPointer=function(e){ if(!FIN.on&&!CUT.on&&clDown(e)) return; return op.call(this,e); }; }
function clDown(e){ CL.tap={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,touch:e.pointerType!=='mouse',talk:!!TALK.p,stood:false};
  if(CL.k==='rise'||CL.k==='fly'){ if(!CL.drag) CL.drag={id:e.pointerId,lx:e.clientX,ly:e.clientY}; return true; }
  if(CL.st==='sat'||CL.st==='sit'){ clStand(); CL.tap.stood=true; }
  return false; }
addEventListener('pointermove',e=>{ if(S.st!==st||S.mode!=='station') return; const tp=CL.tap, dr=CL.drag;
  if(tp&&e.pointerId===tp.id&&Math.hypot(e.clientX-tp.x,e.clientY-tp.y)>(tp.touch?8:13)) tp.moved=true;
  if(dr&&e.pointerId===dr.id&&e.pointerType==='mouse'&&!e.buttons){ CL.drag=null; return; }   // (a button let go of outside the window)
  if(dr&&e.pointerId===dr.id){ kiteSteer(e.clientX-dr.lx,e.clientY-dr.ly); dr.lx=e.clientX; dr.ly=e.clientY; }
  else if(e.pointerType==='mouse'&&!down&&!dr&&!look) clHover(e); },{passive:true});
addEventListener('pointerup',e=>{ const tp=CL.tap, dr=CL.drag; if(dr&&e.pointerId===dr.id) CL.drag=null; if(!tp||e.pointerId!==tp.id) return; CL.tap=null;
  if(S.st!==st||S.mode!=='station'||CUT.on||FIN.on||tp.moved||tp.talk||tp.stood) return;
  const flying=CL.k==='rise'||CL.k==='fly'; if(flying) kiteEnd();   // a click while it flies brings it down
  const p=pickPerson(e); if(p){ if(flying) goTalk(p); return; }   // (otherwise the station's own handler has already seen to them)
  const h=clPick(e); if(h==='bench') clGoSit(); else if(h==='kite'&&!flying) clGoKite(); });
addEventListener('pointercancel',e=>{ if(CL.drag&&e.pointerId===CL.drag.id) CL.drag=null; if(CL.tap&&e.pointerId===CL.tap.id) CL.tap=null; });
/* the mouse over the bench or the kite: the cursor says what a click does there */
function clHover(e){ const h=e&&CLM&&clFree()&&CL.st==='idle'&&CL.k==='home'&&!hov&&Math.hypot(player.x-CLF.x,player.z-CLF.z)<22?clPick(e):null;
  if(h===CL.hov) return; CL.hov=h; const ce=$('#cur'), ct=$('#curT'); if(!ce||!ct) return;
  if(h){ ct.textContent=h==='bench'?'Sit':'Fly the kite'; ce.classList.add('big'); } else if(!hov) ce.classList.remove('big'); }
/* keys: sitting, any key stands you up (one held since you sat down does not count, and its repeats are kept from walking
   you); flying, E, Space, Enter or Escape bring it down; and E or Enter beside the bench or the kite, with nobody there to
   talk to, sits you down or takes it */
addEventListener('keydown',e=>{ if(S.st!==st||S.mode!=='station'||FIN.on||CUT.on||!CLM) return; const k=e.code, act=k==='Escape'||k==='KeyE'||k==='Enter'||k==='Space';
  const typing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('a,button,input');
  if(CL.st==='sat'||CL.st==='sit'){ if(CL.held.has(k)){ if(e.repeat) e.stopImmediatePropagation(); return; } if(/^(Shift|Control|Alt|Meta|Tab)/.test(k)) return;
    clStand(); if(act&&!typing){ e.preventDefault(); e.stopImmediatePropagation(); } return; }
  if(CL.k==='rise'||CL.k==='fly'){ if(act&&!typing){ kiteEnd(); e.preventDefault(); e.stopImmediatePropagation(); } return; }
  if((k==='KeyE'||k==='Enter')&&!e.repeat&&!typing&&clFree()){ const P=player, db=Math.hypot(P.x-CLF.x,P.z-CLF.z), dk=Math.hypot(P.x-CLM.kb[0],P.z-CLM.kb[1]);
    if(CL.k==='home'&&dk<2.4&&dk<db){ clGoKite(); e.preventDefault(); e.stopImmediatePropagation(); }
    else if(CL.st==='idle'&&db<2.6){ clGoSit(); e.preventDefault(); e.stopImmediatePropagation(); } } },true);
addEventListener('keyup',e=>{ CL.held.delete(e.code); });
addEventListener('wheel',()=>{ if(S.st===st&&S.mode==='station'&&(CL.st==='sat'||CL.st==='sit')) clStand(); },{passive:true});   // (the wheel too)
st._dbg.cliff={CL,get M(){ return CLM; },F:CLF,WEST:CLWEST,goSit:()=>clGoSit(),goKite:()=>clGoKite(),sit:()=>clSit(),stand:()=>clStand(),take:()=>kiteTake(),end:()=>kiteEnd(),steer:(dx,dy)=>kiteSteer(dx,dy),pick:e=>clPick(e),reset:()=>clReset(),tags:clTags};
st._dbg.cafe=cafeDbg;

/* ===================== the launch scene: Gideon and Owen see you off =====================
   Saying yes to Ahroon's last flight (Let's fly, in the conversation or on its own button) plays a short scene first. The
   pad's doors slide apart over a dark shaft and the rocket comes up out of the ground on its lift, Andrena on its side.
   Gideon, by the pad, turns and says his line, and the hatch drops. Cut to the launch desk: the board's lamps go green one
   by one, the switch is thrown, and Owen turns and says his. Then the last flight as it always was, with the two of them
   standing at the desk, Owen working the board while you hold to launch.
   It is the last flight's first part (FIN.on with FIN.pre), so everything that keeps quiet for the last flight keeps quiet
   for it: no conversation, the cliff and the café put back, Diarmuid silent, no tags, cards or buttons, and no input but
   Skip (the landing's own button) and Escape, which go straight on to the last flight with everything as the scene leaves it.
   The light is wherever the visitor's own clock has put it (the sun, or the moon), so the shots of the two of them are
   planned when the scene starts, each taken from the side the light comes from, where there is ground to stand on and
   nothing in the way. By night the scene has lamps of its own: the shaft's rings, the warning beacons, the glow of the board,
   and a warm lamp by the camera for each face, as a film crew would set one.
   Gideon and Owen are figures, not anyone's photograph: they are not among the three to meet, nobody clicks them, they have
   no tags. They, the desk, the shaft, its doors and the lift are made only when first needed (in a quiet moment once all
   three of us are met, or when the scene starts) and are not drawn at all before it; the shaft is cut out of the pad
   (uHole) only while the scene plays. */
/* the desk, on the town side of the pad and facing it */
const DESK={at:[-5.4,-12.4]}; DESK.yaw=yawTo(DESK.at[0],DESK.at[1],PAD[0],PAD[1]);
/* how they look: the same figures as the three of us (see figure) */
const QLOOKS={gideon:{shirt:'#1f1f22',pants:'#d6c29a',shoes:'#2c2723',sole:'#4b433b',skin:'#eec3a2',build:1,depth:.72,head:[.152,.178,.16,.12,.024],face:{bw:.015,arch:.008},mouth:'smile',hair:'textured',hairC:'#2a1f1a'},
  owen:{shirt:'#6e2431',funnel:.42,zipV:.915,zip:'#d4ccc2',pants:'#b6bac0',shoes:'#f1eee7',sole:'#d4cdc0',skin:'#f0c4a4',build:1.06,depth:.74,head:[.156,.172,.162,.12,.024],face:{bw:.012,arch:.01},mouth:'smile',cheeks:true,hair:'short',hairC:'#7d5f48',watch:'#3a3d42'}};
const QLINES={gideon:'Fuelled and ready. Go and show them what you can do.',owen:'All green on the board. Hold it down when you\'re ready.'};
/* who each of them is, the first time the camera is on them */
const QID={gideon:['Gideon','Andrena Ventures · backs Heloria Labs'],owen:['Owen','Investor · backs Heloria Labs']};
const QS={on:false,done:false,built:false,stage:0,t:0,hold:false,figs:{},doors:[],lights:[],lever:null,shaft:[],lift:null,desk:null,cp:new T.Vector3(),cl:new T.Vector3(),snap:true,said:{},talk:null,typed:0,acc:0,greens:0,arrived:false,shot:-1,bon:null,plan:null,key:new T.Vector3(),dark:0};
const csV=new T.Vector3(), csU=new T.Vector3(), csF=new T.Vector3(), csA=new T.Vector3(), csB=new T.Vector3(), csM=new T.Matrix4(), csR=new T.Matrix4();
const qease=x=>{ x=clamp(x,0,1); return x*x*(3-2*x); }, qsine=x=>.5-.5*Math.cos(Math.PI*clamp(x,0,1));
/* the desk's frame: toward the pad, and across */
const QDK=DESK.at, dirDP=(()=>{ const x=PAD[0]-QDK[0], z=PAD[1]-QDK[1], l=Math.hypot(x,z); return [x/l,z/l]; })(), sDP=[-dirDP[1],dirDP[0]];
const QOW=[QDK[0]-dirDP[0]*.56,QDK[1]-dirDP[1]*.56], QGD=[QDK[0]-dirDP[0]*.62+sDP[0]*.95,QDK[1]-dirDP[1]*.62+sDP[1]*.95];   // Owen behind the desk; Gideon beside him for the launch
/* five shots, hard cuts between them: the doors and the shaft from above; the rocket coming out, low; Gideon; the board; Owen */
const Q_UNLATCH=.7, Q_SLIDE0=1.1, Q_SLIDE1=2.9, Q_RING0=1.3, Q_RISE0=2.9, Q_SH2=4.2, Q_RISE1=7.1, Q_HATCH=7.4, Q_CUT1=8.5, Q_TURN=8.6, Q_SAY_G=9.1, Q_CUT=12.9, Q_GREEN=13.2, Q_LEVER=14.9, Q_CUT2=15.5, Q_SAY_O=15.8, Q_END=19.6;
const QRISE=6.3, QDEEP=7.7, QHR=1.85, QDROP=.2, QBEA=[];   // how far under the pad the rocket waits, how deep the shaft goes, its radius, how far the doors drop
/* the sound's cues, from the same times: the horn with each flash of the lamps while the doors open, the latches, the doors
   seating in their slots and rolling away, each ring of lamps, the lift, the moment the nose clears the rim, the hatch,
   each lamp on the board and the switch */
const QCUE=(()=>{ const horns=[]; for(let k=0;k/2.2<Q_SLIDE1-.1;k++) horns.push(k/2.2);
  const u=Math.sqrt((1-4.85/QRISE)/2);   // where the lift's ease in brings the nose up to the rim
  return {horns,unlatch:Q_UNLATCH,drop:Q_UNLATCH+.4,slide:[Q_SLIDE0,Q_SLIDE1],rings:[0,1,2,3].map(i=>Q_RING0+i*.3),rise:[Q_RISE0,Q_RISE1],surface:Q_RISE0+u*(Q_RISE1-Q_RISE0),
    hatch:[Q_HATCH,Q_HATCH+.8],greens:Array.from({length:10},(_,i)=>Q_GREEN+i*.16),lever:Q_LEVER,end:Q_END}; })();
const QPM=frameAt(PAD[0],PAD[1],0);
/* building it, a piece at a time (one a frame while all is quiet, or all at once when the scene starts). Should any of it
   fail, the scene is left out and the last flight simply goes on as it always did (bad) */
function csBuild(all){ if(QS.built||QS.bad) return; const steps=[csFigures,csShaft,csDoors,csDesk,csWarm];
  try{ do { const t0=performance.now(); steps[QS.stage](); (QS.ms||(QS.ms=[])).push(Math.round(performance.now()-t0)); QS.stage++; } while(all&&QS.stage<steps.length); }catch(e){ QS.bad=true; console.warn('launch scene',e); return; }
  if(QS.stage>=steps.length) QS.built=true; }
function csFigures(){ for(const k of ['gideon','owen']){ const g=figure(QLOOKS[k]); if(k==='gideon') g.scale.setScalar(1.035); g.visible=false; sc.add(g); QS.figs[k]=g; qOwn(g,{QFIG:''}); qInk(g); } }
/* the shaft: concrete going dark with depth, panel seams, rings of lamps that come on one by one, and a floor; lit as the
   town is (the sun only down to where its light reaches, the shade the colour of the hour), and in the fog as the town is */
function csShaft(){ const shM=new T.ShaderMaterial({uniforms:Object.assign({uLit:LU.uLamp,uAx:{value:PADU.clone()},uCut:{value:0}},LU),side:T.BackSide,defines:{QSHAFT:'',QLAMP:''},
    vertexShader:`varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vUv=uv; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uLit; uniform vec3 uAx; varying vec3 vW; varying vec3 vN; varying vec2 vUv; ${N2} ${LIGHT}
      void main(){ float a=dot(vW,uAx), h=a-${(R+.1).toFixed(2)}; vec3 lat=vW-uAx*a, n=-lat/max(length(lat),.001);
        vec3 base=vec3(.6,.59,.57)*(.93+.1*vn2(vec2(vUv.x*60.,h*3.)));
        base*=1.-.32*max(step(.955,fract(-h/.85)),step(.972,fract(vUv.x*18.)));   // the panels
        base*=1.-.85*step(-.35,h)*step(h,-.16);   // the slots the doors slide into
        vec3 c=toon(base,n,vW);   // (the walls are inside the shaft: lit as everything down it is, see the light, above)
        for(int i=0;i<4;i++){ float y=-.9-1.55*float(i), on=step(float(i)+.5,uLit), dy=h-y, fu=fract(vUv.x*10.+float(i)*.5)-.5;   // lamps round each ring, staggered ring to ring, a band of warm light along each
          c+=vec3(.36,.25,.12)*on*exp(-pow(dy/.38,2.))*(.62+.25*exp(-pow(fu/.1,2.)));
          float lens=smoothstep(.05,.025,abs(dy))*step(abs(fu),.06); c=mix(c,mix(vec3(.18,.17,.16),vec3(1.,.92,.7),on),lens); }
        gl_FragColor=vec4(c,1.); }`});
  const shaft=new T.Mesh(new T.CylinderGeometry(QHR+.005,QHR+.005,QDEEP+.1,48,1,true).translate(0,.1-(QDEEP+.1)/2,0),shM); shaft.matrixAutoUpdate=false; shaft.matrix.copy(QPM); shaft.renderOrder=-1; sc.add(shaft);
  const floor=new T.Mesh(new T.CircleGeometry(QHR,40).rotateX(-Math.PI/2),flatMat('#0b0c0d')); floor.matrixAutoUpdate=false; floor.matrix.multiplyMatrices(QPM,new T.Matrix4().makeTranslation(0,-QDEEP+.1,0)); sc.add(floor);
  /* a steel rim round the mouth, and four warning lamps on the pad that flash while anything moves */
  const lip=new T.Mesh(new T.RingGeometry(QHR,QHR+.04,64).rotateX(-Math.PI/2),toonMat('#6d7479',{fresh:true})); lip.matrixAutoUpdate=false; lip.matrix.multiplyMatrices(QPM,new T.Matrix4().makeTranslation(0,.105,0)); sc.add(lip);
  QS.shaft=[shaft,floor,lip]; QS.shM=shM;
  for(let k=0;k<4;k++){ const a=(k*6+3.5)/24*TAU, g=new T.Group(); g.matrixAutoUpdate=false; g.matrix.multiplyMatrices(QPM,new T.Matrix4().makeTranslation(Math.cos(a)*2.07,.1,Math.sin(a)*2.07)); sc.add(g);
    g.add(new T.Mesh(new T.CylinderGeometry(.06,.07,.04,12).translate(0,.02,0),toonMat('#3a3e41'))); const m=flatMat('#a8742c'), b=new T.Mesh(new T.SphereGeometry(.048,14,8,0,TAU,0,Math.PI/2).translate(0,.04,0),m); g.add(b);
    QBEA.push(m); QS.shaft.push(g); }
  /* by night each beacon glows when it flashes, and the shaft's lamps light the air over the mouth */
  { const P=[]; for(let k=0;k<4;k++){ const a=(k*6+3.5)/24*TAU; V.set(Math.cos(a)*2.07,.2,Math.sin(a)*2.07).applyMatrix4(QPM); P.push(V.x,V.y,V.z); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3));
    const halo=new T.Points(g,new T.ShaderMaterial({uniforms:{uK:{value:0},uH:{value:800}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`uniform float uH; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=.55*projectionMatrix[1][1]*uH*.5/max(-mv.z,.1); }`,
      fragmentShader:`uniform float uK; void main(){ vec2 q=gl_PointCoord*2.-1.; float r=dot(q,q), a=exp(-r*5.)*(1.-smoothstep(.6,1.,r)); gl_FragColor=vec4(vec3(1.,.7,.25)*a*uK,1.); }`}));
    halo.layers.set(1); halo.frustumCulled=false; halo.renderOrder=7; halo.visible=false; sc.add(halo); QS.halo=halo; }
  /* the lift: a deck the rocket stands on and the ram under it; at the top the deck closes the shaft, flush with the pad */
  const lift=new T.Group(); lift.matrixAutoUpdate=false; sc.add(lift);
  lift.add(new T.Mesh(new T.CylinderGeometry(QHR-.02,QHR-.02,.16,48).translate(0,-.08,0),toonMat('#7c8388',{fresh:true})));
  for(let k=0;k<4;k++){ const a=(k+.5)/4*TAU, cl=new T.Mesh(new T.BoxGeometry(.22,.1,.3),toonMat('#3d4245')); cl.position.set(Math.cos(a)*1.45,.05,Math.sin(a)*1.45); cl.rotation.y=-a; lift.add(cl); }
  const ring=new T.Mesh(new T.TorusGeometry(QHR-.22,.04,6,48).rotateX(Math.PI/2),toonMat('#ef8a3c')); ring.position.y=.005; lift.add(ring);
  lift.add(new T.Mesh(new T.CylinderGeometry(.55,.62,QDEEP,24).translate(0,-.12-QDEEP/2,0),toonMat('#5d6469')));
  QS.lift=lift; [...QS.shaft,lift].forEach(o=>{ qOwn(o); qInk(o); }); setLift(0); showShaft(false); }
/* the doors: two heavy halves that unlatch, drop into their recess and slide away under the rim */
function csDoors(){ const dM=c=>{ const m=toonMat(c,{fresh:true}); m.uniforms.uHoleOn={value:-1}; return m; }, dPl=dM('#b8b4ab'), dEd=dM('#8d8a83'), dK=dM('#2a241d'), dY=dM('#f0a531'), dO=dM('#ef8a3c');
  for(const sd of [-1,1]){ const g=new T.Group(); g.matrixAutoUpdate=false; g.visible=false; sc.add(g);
    g.add(new T.Mesh(new T.CylinderGeometry(QHR+.3,QHR+.3,.12,48,1,false,sd>0?-Math.PI/2:Math.PI/2,Math.PI).translate(0,-.06,0),dPl));
    const edge=new T.Mesh(new T.BoxGeometry(2*QHR+.6,.12,.05).translate(0,-.06,0),dEd); edge.position.z=sd*.025; g.add(edge);
    for(let k=-9;k<=9;k++){ const st=new T.Mesh(new T.BoxGeometry(.13,.01,.2),k&1?dK:dY); st.position.set(k*.2,.005,sd*.15); st.rotation.y=sd*.6; g.add(st); }   // hazard stripes along the seam
    for(const x of [-1.05,-.35,.35,1.05]){ const st=new T.Mesh(new T.BoxGeometry(.3,.012,.07),dO); st.position.set(x,.006,sd*.85); g.add(st); }
    QS.doors.push({g,sd}); qOwn(g,{QHOLE:''}); qInk(g); }
  setDoors(0,0); }
/* the desk: the town's own kit (a cabinet, its plinth, the sloping top), then two rows of lamps and a screen on the top,
   and the big switch */
function csDesk(){ const [dx,dz]=QDK, M=frameAt(dx,dz,DESK.yaw), g=new T.Group(); g.visible=false; sc.add(g);
  kitTo('qdesk'); box(M,'#3f464b',0,0,.02,1.2,.78,.46); box(M,'#2c3236',0,0,.02,1.26,.06,.52); put(M,'box','#2b3135',0,.83,-.02,1.26,.07,.6,0,-.45);
  const k=KITS.qdesk, kg=new T.BufferGeometry(); kg.setAttribute('position',new T.Float32BufferAttribute(k.P,3)); kg.setAttribute('normal',new T.Float32BufferAttribute(k.N,3)); kg.setAttribute('color',new T.Float32BufferAttribute(k.C,3)); kitTo(); delete KITS.qdesk;
  { const m=toonMat('#ffffff',{vc:true,fresh:true}); m.uniforms.uKit={value:1}; g.add(new T.Mesh(kg,m)); }   // (the kit's own: rain darkens it, snow settles on it)
  const PM=new T.Matrix4().multiplyMatrices(M,new T.Matrix4().makeTranslation(0,.865,-.02)).multiply(new T.Matrix4().makeRotationX(-.45));
  for(let r=0;r<2;r++) for(let k2=0;k2<5;k2++){ const l=new T.Mesh(new T.BoxGeometry(.065,.025,.065),flatMat('#e8553f')); l.matrixAutoUpdate=false;
    l.matrix.multiplyMatrices(PM,new T.Matrix4().makeTranslation(-.5+k2*.1,.045,-.1+r*.13)); g.add(l); QS.lights.push(l); }
  const scr=new T.Mesh(new T.BoxGeometry(.3,.012,.2),flatMat('#9fd8c6')); scr.matrixAutoUpdate=false; scr.matrix.multiplyMatrices(PM,new T.Matrix4().makeTranslation(.12,.045,0)); g.add(scr);
  const lv=new T.Group(); lv.matrixAutoUpdate=false; g.add(lv); const st0=new T.Mesh(new T.CylinderGeometry(.022,.022,.26,10),toonMat('#c9ced2')); st0.position.y=.13; lv.add(st0);
  const kn=new T.Mesh(new T.SphereGeometry(.055,14,10),toonMat('#e0452f')); kn.position.y=.27; lv.add(kn); lv.add(new T.Mesh(new T.BoxGeometry(.16,.04,.12),toonMat('#1e2225')));
  QS.lever={g:lv,PM}; QS.desk=g; QS.glow=new T.Vector3(.12,.3,.05).applyMatrix4(PM); qOwn(g); qInk(g); setLever(-.6); }
/* the new materials are made ready for the screen now, out of sight, so the first frame of the scene does not wait on them */
function csWarm(){ qSwaps(); const all=[QS.figs.gideon,QS.figs.owen,...QS.shaft,QS.halo,QS.lift,QS.desk,...QS.doors.map(d=>d.g)];
  try{ for(const o of all){ renderer.compile(o,stCam,sc); o.traverse(m=>{ if(m.userData.inkM) m.material=m.userData.inkM; }); renderer.compile(o,stCam,sc); o.traverse(m=>{ if(m.userData.col) m.material=m.userData.col; }); }
    for(const w of QS.swap){ w.o.material=w.v; renderer.compile(w.o,stCam,sc); if(w.iv){ w.o.material=w.iv; renderer.compile(w.o,stCam,sc); } w.o.material=w.m; } }
  catch(e){ for(const o of all) o.traverse(m=>{ if(m.userData.col) m.material=m.userData.col; }); for(const w of QS.swap) w.o.material=w.m; } }
/* the scene's own versions of the town's materials: the same uniforms (so the same light, the same hour), with the cut
   (QHOLE), the shaft's light (QSHAFT) and the scene's lamps (QLAMP) compiled in. The ground, the sea, the grass and the
   kit (the pad is in it) wear the cut while the scene plays; the rocket wears the shaft's light; the scene's own things
   wear theirs always. Nothing else ever does, so outside the scene no shader carries any of it */
const QVC=new Map();
function qVar(m,defs){ const k=Object.keys(defs).sort().join(','); let c=QVC.get(m); if(!c) QVC.set(m,c={}); if(c[k]) return c[k];
  const v=m.clone(); v.uniforms=m.uniforms; v.defines=Object.assign({},m.defines,defs); return c[k]=v; }
const qToon=m=>m&&m.isShaderMaterial&&/toon\(/.test(m.fragmentShader||'');
function qOwn(root,extra){ root.traverse(o=>{ if(o.isMesh&&qToon(o.material)) o.material=qVar(o.material,Object.assign({QSHAFT:'',QLAMP:''},extra)); }); }
function qSwaps(){ if(QS.swap) return; QS.swap=[];
  const add=(o,defs)=>{ const ink=INK.includes(o), v=qVar(o.material,defs); QS.swap.push({o,ink,m:o.material,v,im:ink?o.userData.inkM:null,iv:ink&&defs.QHOLE!=null?qInkM(v):null}); };
  sc.traverse(o=>{ if(o.isMesh&&o.material&&o.material.isShaderMaterial&&o.material.uniforms&&o.material.uniforms.uHoleOn&&o.material.uniforms.uHoleOn.value===1&&!o.material.defines.QHOLE) add(o,{QHOLE:'',QLAMP:''}); });
  RK.g.traverse(o=>{ if(o.isMesh&&qToon(o.material)) add(o,{QSHAFT:'',QLAMP:''}); }); }
/* wearing them, or the town's own again */
function qWear(on){ if(!QS.swap) return; for(const w of QS.swap){ const m=on?w.v:w.m; w.o.material=m; if(w.ink){ w.o.userData.col=m; if(w.iv) w.o.userData.inkM=on?w.iv:w.im; } } }
/* the scene's own meshes join the ink pass as the rest of the world does, so their lines are drawn the same way */
function qInk(root){ root.traverse(o=>{ if(!o.isMesh||!o.material.isShaderMaterial||o.userData.noInk===true||INK.includes(o)) return;
  o.userData.col=o.material; o.userData.inkM=qInkM(o.material); o.userData.shdM=variant(shdC,o.material,SHD_F,T.DoubleSide); INK.push(o); }); }
function qInkM(m){ let k=inkC.get(m); if(!k){ k=new T.ShaderMaterial({uniforms:m.uniforms,vertexShader:m.vertexShader,fragmentShader:INK_F,side:m.side,vertexColors:m.vertexColors,defines:Object.assign({},m.defines)}); inkC.set(m,k); } return k; }
function setDoors(drop,slide){ for(const d of QS.doors){ d.g.matrix.multiplyMatrices(QPM,csM.makeTranslation(0,.1-QDROP*drop,d.sd*slide*(QHR+.12))); d.g.matrixWorldNeedsUpdate=true; } }
function setLift(y){ if(!QS.lift) return; QS.lift.matrix.multiplyMatrices(QPM,csM.makeTranslation(0,.1+y,0)); QS.lift.matrixWorldNeedsUpdate=true; }
/* the shaft cut into the pad, or the pad whole: only ever whole outside the scene */
function showShaft(on){ QS.shaft.forEach(m=>{ m.visible=on; }); QS.doors.forEach(d=>{ d.g.visible=on; }); if(QS.lift) QS.lift.visible=on; LU.uHole.value.set(PADU.x,PADU.y,PADU.z,on?QHR:0); if(!on){ LU.uLamp.value=0; if(QS.halo) QS.halo.visible=false; } }
function setLever(a){ if(!QS.lever) return; QS.lever.g.matrix.multiplyMatrices(QS.lever.PM,csM.makeTranslation(.43,.045,0)).multiply(csR.makeRotationX(a)); QS.lever.g.matrixWorldNeedsUpdate=true; }
const QVENT=new T.Vector3(), QVV=new T.Vector3();
function vent(n,up,out,s=1){ for(let i=0;i<n;i++){ const a=Math.random()*TAU, r=QHR*(.94+Math.random()*.06); QVENT.set(Math.cos(a)*r,.14,Math.sin(a)*r).applyMatrix4(QPM);
  QVV.set(Math.cos(a),0,Math.sin(a)).transformDirection(QPM).multiplyScalar(out*(.6+Math.random()*.8)).addScaledVector(PADU,up*(.7+Math.random()*.6)); puff(QVENT,QVV,(.13+Math.random()*.08)*s,.8+Math.random()*.5); } }
const qLights=c=>QS.lights.forEach(l=>l.material.uniforms.uC.value.set(c));   // (as the preview had them: the colour as the screen shows it)

/* ---------- planning the shots: from the side the light comes from ----------
   Where Gideon stands round the pad (theta), and where the camera stands for his close-up (round from where he stands,
   toward the pad's side, so the rocket is beside him in the picture); and where the camera stands for Owen's. Each place is
   tried round the circle: it must be ground you could stand on, clear of trees, houses and rocks, with nothing between it
   and the face, and it must still be clear where a phone held upright stands it further back. Of those, the one that sees
   the face most in the light wins (the sun, or by night the moon); for Owen, better still with the rocket behind him. */
const qFixed=()=>OBS.filter(o=>!people.some(p=>p.ob===o)&&!(o.x===PAD[0]&&o.z===PAD[1])).concat([{x:QDK[0],z:QDK[1],r:.75,h:1}]);   // (and the desk, which is not in the town's own list)
/* (a tree is in the list by its trunk; its crown spreads some four times as wide as that, and hangs at a face's height) */
const qWide=o=>o.r<.45&&o.h>=3?3.4*o.r:o.h>=3?.5:0;
function qClear(x,z,m,obs){ if(!walkable(x,z)||grid(GH,x,z)<-.05) return false; for(const o of obs){ const mm=o.r+m+qWide(o); if((x-o.x)**2+(z-o.z)**2<mm*mm) return false; } return true; }
function qSight(x0,z0,x1,z1,obs){ const ex=x1-x0, ez=z1-z0, L2=ex*ex+ez*ez||1;
  for(const o of obs){ if(o.h<1.3) continue; const t=clamp(((o.x-x0)*ex+(o.z-z0)*ez)/L2,0,1), d=Math.hypot(o.x-x0-ex*t,o.z-z0-ez*t); if(d<o.r+.15+qWide(o)) return false; } return true; }
/* how well a face turned toward (ux, uz) at (x, z) is lit: the light on its front, a little up from level */
function qLit(x,z,ux,uz){ at(x,z,csU); at(x+ux*.5,z+uz*.5,csV); tang(csU,csV,csF); csF.multiplyScalar(.95).addScaledVector(csU,.3).normalize(); return csF.dot(SUN); }
const qScore=d=>Math.min(1,Math.max(0,d)/.14)+.3*d;   // lit is what matters; then, a little, how brightly
function csPlan(){ const obs=qFixed(), P={};
  /* Gideon: on the pad's rim, never in front of the hatch (its ramp) and never between the low camera and the rocket */
  let best=null;
  for(let a=-70;a<=240;a+=10){ if(a>35&&a<145) continue; const th=a*Math.PI/180, gx=PAD[0]+Math.cos(th)*2.15, gz=PAD[1]+Math.sin(th)*2.15;
    for(const dl of [50,63,-50,-63,38,-38]) for(const cd of [2.6,2.2]){ const ps=th+dl*Math.PI/180, ux=Math.cos(ps), uz=Math.sin(ps), cx=gx+ux*cd, cz=gz+uz*cd, lx=(gx*2+PAD[0])/3, lz=(gz*2+PAD[1])/3;   // (nearer, or more square on, only where the usual spot is taken)
      const qx=gx+(lx-gx)*.35, qz=gz+(lz-gz)*.35, px=qx+(cx-qx)*1.45, pz=qz+(cz-qz)*1.45;   // a phone held upright looks nearer him (its picture is narrow), from further back
      if(Math.hypot(cx-PAD[0],cz-PAD[1])<2.5||Math.hypot(px-PAD[0],pz-PAD[1])<2.5||!qClear(cx,cz,.5,obs)||!qClear(px,pz,.35,obs)||!qSight(cx,cz,gx,gz,obs)||!qSight(px,pz,gx,gz,obs)) continue;
      const fin=Math.abs(angDiff(th,Math.round((th-Math.PI/4)/(Math.PI/2))*Math.PI/2+Math.PI/4));   // how far round from the nearest of the rocket's fins (they point between the hatch and its sides)
      const d=qLit(gx,gz,ux,uz), s=qScore(d)-.0012*Math.abs(a+13)-.004*Math.max(0,a<100?a:0)-(dl!==63?.01:0)-(Math.abs(dl)<40?.04:0)-(cd<2.6?.04:0)-.6*Math.max(0,1-fin/.7);   // (all else equal: as the preview had it, east of the pad, not nearer the cameras over the hatch side, not by a fin)
      if(!best||s>best.s) best={s,d,g:[gx,gz],cam:[cx,cz],look:[lx,lz],lookP:[qx,qz]}; } }
  P.g=best||{d:0,g:[-1.1,-16.1],cam:[1.2,-14.4],look:[(-1.1*2+PAD[0])/3,(-16.1*2+PAD[1])/3],lookP:[-1.1+(PAD[0]+1.1)*.12,-16.1+(PAD[1]+16.1)*.12]};
  /* Owen: behind the desk; the camera round him, clear of the desk */
  best=null;
  for(let a=0;a<360;a+=10){ const ps=a*Math.PI/180, ux=Math.cos(ps), uz=Math.sin(ps), cx=QOW[0]+ux*2.05, cz=QOW[1]+uz*2.05;
    /* it looks past him a little, toward the rocket's side */
    const vx=-ux, vz=-uz, sg=Math.sign(-vz*(PAD[0]-QOW[0])+vx*(PAD[1]-QOW[1]))||1, lx=QOW[0]+vx*.29-vz*sg*.49, lz=QOW[1]+vz*.29+vx*sg*.49;
    const qx=QOW[0]+(lx-QOW[0])*.35, qz=QOW[1]+(lz-QOW[1])*.35, px=qx+(cx-qx)*1.45, pz=qz+(cz-qz)*1.45;   // (a phone: nearer him, from further back)
    if(Math.hypot(cx-QDK[0],cz-QDK[1])<1.1||Math.hypot(px-QDK[0],pz-QDK[1])<1.1||Math.hypot(cx-PAD[0],cz-PAD[1])<2.5||!qClear(cx,cz,.45,obs)||!qClear(px,pz,.35,obs)||!qSight(cx,cz,QOW[0],QOW[1],obs)||!qSight(px,pz,QOW[0],QOW[1],obs)) continue;
    let ra=Math.atan2(PAD[1]-cz,PAD[0]-cx)-Math.atan2(QOW[1]-cz,QOW[0]-cx); ra=Math.abs(Math.atan2(Math.sin(ra),Math.cos(ra)));   // how far off the line of sight the rocket is
    const d=qLit(QOW[0],QOW[1],ux,uz), s=qScore(d)+.6*(1-sstep(.35,.75,ra))-.0008*Math.abs(angDiff(ps,1.45));
    if(!best||s>best.s) best={s,d,cam:[cx,cz],look:[lx,lz],lookP:[qx,qz]}; }
  P.o=best||{d:0,cam:[QOW[0]+.25,QOW[1]+2.05],look:[QOW[0]+.45,QOW[1]-.35],lookP:[QOW[0]+.16,QOW[1]-.12]};
  /* the board: from the side where the switch is beyond the lamps and he is in profile behind them (from the other side
     the switch stands in front of him and the lamps are seen edge on), unless something stands there */
  P.side=qClear(QDK[0]+sDP[0]*1.95+dirDP[0]*.2,QDK[1]+sDP[1]*1.95+dirDP[1]*.2,.3,obs)?1:-1;
  /* and for the dark: how much of the scene's own light it needs */
  P.dark=sstep(.08,.55,SKY.night); return P; }

/* ---------- the lines and the name cards: the conversation's own printed box, and a card like a landmark's ---------- */
const QUI=(()=>{ const say=document.createElement('div'); say.className='crtalk crqsay'; say.setAttribute('aria-hidden','true');
  say.innerHTML='<span class="crtk-n ui"></span><div class="crtk-b"><div class="crtk-m"><p class="crtk-t"><span></span><span class="crtk-r" aria-hidden="true"></span></p></div></div>';
  const id=document.createElement('div'); id.className='crqid'; id.setAttribute('aria-hidden','true'); id.innerHTML='<span class="crqid-n disp"></span><span class="crqid-r ui"></span>';
  const sk=$('#crSkip',el); el.insertBefore(say,sk); el.insertBefore(id,sk);
  return {say,id,n:say.querySelector('.crtk-n'),t:say.querySelector('.crtk-t'),s:say.querySelector('.crtk-t span'),r:say.querySelector('.crtk-r'),in:id.firstChild,ir:id.lastChild}; })();
/* the box the size of the whole line from the first letter, and no wider than it needs (as a conversation's) */
function qhug(){ const t=QUI.t; t.style.width=''; const h=t.offsetHeight, w=t.offsetWidth; if(!w||!h) return; let lo=w*.35, hi=w;
  for(let k=0;k<9;k++){ const m=(lo+hi)/2; t.style.width=m+'px'; if(t.offsetHeight>h) lo=m; else hi=m; } t.style.width=Math.ceil(hi)+1+'px'; }
addEventListener('resize',()=>{ if(QS.talk) qhug(); });
function qsay(who){ const b=QUI.say; if(!who){ b.classList.remove('on'); b.setAttribute('aria-hidden','true'); QS.talk=null; return; }
  QS.talk=who; QS.typed=0; QS.acc=0; QUI.n.textContent=QID[who][0]; qsayN(0); b.setAttribute('aria-label',QID[who][0]+': '+QLINES[who]); b.setAttribute('aria-hidden','false'); b.classList.add('on'); qhug(); }
function qsayN(n){ const t=QLINES[QS.talk]; QUI.s.textContent=t.slice(0,n); QUI.r.textContent=t.slice(n); }
function qid(who){ const c=QUI.id; if(!who){ c.classList.remove('on'); c.setAttribute('aria-hidden','true'); return; } QUI.in.textContent=QID[who][0]; QUI.ir.textContent=QID[who][1]; c.setAttribute('aria-hidden','false'); c.classList.add('on'); }
$('#crSkip',el).addEventListener('click',e=>{ if(!QS.on) return; e.stopPropagation(); csSkip(); });

/* ---------- starting, skipping and ending it ---------- */
/* Let's fly: the world goes quiet as for the last flight, under a white flash the rocket goes down into the ground, and the
   scene starts. (false: the last flight goes straight on without it, which is only ever when Earth is not built yet) */
function csStart(){ if(!st.built) return false; csBuild(true); if(!QS.built) return false; const P=player;
  closeTalk(); GLN.t=-1; goBtn.hidden=true; TALK.goal=null; C.guide=null; P.path=null; P.tgt=null; P.speed=0; stickOff(); down=null; look=null;
  if(CAFE.st!=='out') cafeReset(); CAFE.mk=0; if(PHS.on) steerSet(false); if(PC.on) pcOpen(false); pcCard.hidden=true;
  Object.assign(FIN,{on:true,pre:true,t:0,ask:false,go:false,hold:false,held:0,wave:0,mus:.55,fov:45,ign:false,shut:false});
  S.fin=true; S.flash=Math.max(S.flash,.6); cine(true); el.classList.add('fin','crq','walked'); document.documentElement.classList.add('crq'); hint.classList.add('gone');
  people.forEach(p=>{ p.g.visible=false; if(p.beam) p.beam.visible=false; }); me.visible=false;   // the three of us, and you, are off camera until the launch
  Object.assign(QS,{on:true,done:false,t:0,snap:true,said:{},greens:0,arrived:false,shot:-1,bon:null,plan:csPlan()}); QS.dark=QS.plan.dark;
  QS.figs.gideon.visible=QS.figs.owen.visible=true; QS.desk.visible=true; qLights('#e8553f'); setLever(-.6);
  qWear(true); showShaft(true); setDoors(0,0); setLift(-QRISE); LU.uLamp.value=0; RK.door.rotation.x=DOOR_SHUT; RK.flame.visible=false; if(LFLAME) LFLAME.visible=false; RK.shadow.visible=false;
  csPose(0,0); A.score(QCUE); return true; }
function csSkip(){ if(QS.on) csFinish(); }
/* the end, or Skip: everything as the scene leaves it (the doors open, the rocket up, the board green), the two of them at
   the desk, and the last flight from its start, exactly as it always was */
function csFinish(){ QS.on=false; QS.done=true; qsay(null); qid(null); el.classList.remove('crq'); document.documentElement.classList.remove('crq');
  setDoors(1,1); setLift(0); showShaft(false); qWear(false); QBEA.forEach(m=>m.uniforms.uC.value.set('#a8742c')); qLights('#5fd36a'); setLever(.6);
  A.whine(0); A.scoreStop(); csLamps(0,0,0); people.forEach(p=>{ p.g.visible=true; }); { const ce=$('#cur'); if(ce&&$('#curT').textContent==='Skip') ce.classList.remove('big'); }
  startFinale(true); csDuring(0,S.t); }
/* put away: entering or leaving Earth, and once the last flight is over */
function csReset(){ if(FIN.pre){ FIN.pre=false; FIN.on=false; S.fin=false; el.classList.remove('fin'); people.forEach(p=>{ p.g.visible=true; }); if(me) me.visible=true; }   // (cut short: nothing of the last flight was begun)
  QS.on=false; QS.done=false; qsay(null); qid(null); el.classList.remove('crq'); document.documentElement.classList.remove('crq'); A.scoreStop();
  if(QS.built){ showShaft(false); qWear(false); QS.figs.gideon.visible=QS.figs.owen.visible=false; QS.desk.visible=false; } else LU.uHole.value.w=0; csLamps(0,0,0); }
{ const en=st.enter, ex=st.exit, fe=st.finaleEnd; st.enter=function(){ csReset(); return en.apply(this,arguments); }; st.exit=function(){ csReset(); return ex.apply(this,arguments); };
  st.finaleEnd=function(){ const r=fe.apply(this,arguments); csReset(); return r; }; }

/* ---------- the scene's own lamps ---------- */
/* k: the lamp by the camera for a face; b: the glow of the board on whoever stands at it; s: the light out of the open shaft */
function csLamps(k,b,s){ const L=LU.uQL.value;
  L[0].set(QS.key.x,QS.key.y,QS.key.z,k); L[1].set(QS.glow?QS.glow.x:0,QS.glow?QS.glow.y:-99,QS.glow?QS.glow.z:0,b); csV.copy(padTop).addScaledVector(PADU,.6); L[2].set(csV.x,csV.y,csV.z,s); LU.uQR.value.set(6,1.8,4.2); }
/* the lamp for a face: up and to one side of the camera, toward the face */
function csKey(cp,lp){ csV.copy(lp).sub(cp); csU.copy(cp).normalize(); csF.crossVectors(csV,csU).normalize(); QS.key.copy(cp).addScaledVector(csU,.7).addScaledVector(csF,.8).addScaledVector(csV.normalize(),.4); }

/* ---------- each frame of the scene ---------- */
const qat3=(x,z,h,o)=>camAt(x,z,h,o), qatG=(x,z,h,o)=>at(x,z,o).multiplyScalar(R+h);
const QSHOTS=[0,Q_SH2,Q_CUT1,Q_CUT,Q_CUT2], qshot=c=>{ let i=0; while(i<QSHOTS.length-1&&c>=QSHOTS[i+1]) i++; return i; };
function qstand(g,x,z,fx,fz){ at(x,z,csU); tang(csU,at(fx,fz,csV),csF); standOn(g,csU,csF,standH(x,z)); }
/* the two of them where the scene has them at c (and the rocket, the doors and the lift with them) */
function csPose(c,t){ const G=QS.figs.gideon, O=QS.figs.owen, Pl=QS.plan, gz=Pl.g.g;
  { const tu=qease((c-Q_TURN)/.6); qstand(G,gz[0],gz[1],lerp(PAD[0],Pl.g.cam[0],tu),lerp(PAD[1],Pl.g.cam[1],tu)); animate(G,0,0,c>Q_SAY_G+.2&&c<Q_SAY_G+1.6?1:0,t,3); }
  { const tu=qease((c-Q_CUT2-.1)/.5); qstand(O,QOW[0],QOW[1],lerp(PAD[0],Pl.o.cam[0],tu),lerp(PAD[1],Pl.o.cam[1],tu)); animate(O,0,0,c>Q_SAY_O+1.4&&c<Q_SAY_O+2.6?1:0,t,4); }
  if(c>Q_LEVER-.45&&c<Q_LEVER+.5){ const d=O.userData; d.arms[1].rotation.x=-.95; d.fore[1].rotation.x=-.55; } }
function csUpdate(dt,t){ const c=QS.t, Pl=QS.plan;
  /* the warning lamps flash; the doors unlatch with a breath of vapour, drop into their slots and slide away under the rim;
     the shaft's lamps come on one ring at a time down into the dark; the lift brings the rocket up, slowly, and locks */
  const bon=c<Q_RISE1+.4&&(c*2.2)%1<.5; if(bon!==QS.bon){ QS.bon=bon; QBEA.forEach(m=>m.uniforms.uC.value.set(bon?'#ffc23a':'#a8742c')); }
  const dd=qease((c-Q_UNLATCH)/.4), ds=qease((c-Q_SLIDE0)/(Q_SLIDE1-Q_SLIDE0)); setDoors(dd,ds);
  if(c>=Q_UNLATCH&&!QS.said.door){ QS.said.door=true; vent(9,.25,.5); S.shake=Math.max(S.shake,.05); }
  const lit=clamp(Math.floor((c-Q_RING0)/.3)+1,0,4); if(lit!==LU.uLamp.value) LU.uLamp.value=lit;
  const u=clamp((c-Q_RISE0)/(Q_RISE1-Q_RISE0),0,1), ru=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2, y=-QRISE*(1-ru);   // a lift: easing in, easing to a stop
  setLift(y); csA.copy(padTop).addScaledVector(PADU,y); rocketPose(csA,PADU,c>Q_RISE0&&c<Q_RISE1?Math.sin(c*23)*.002:0); RK.shadow.visible=ru>=1;
  if(ru>=1&&!QS.arrived){ QS.arrived=true; vent(14,.2,.9,1.3); S.shake=Math.max(S.shake,.12); }
  RK.door.rotation.x=lerp(DOOR_SHUT,DOOR_OPEN,qease((c-Q_HATCH)/.8));
  /* Gideon by the pad, watching it come up, then he turns to you and says his line; Owen at the desk, the lamps going green
     one by one, then the switch; then he turns to you */
  csPose(c,t);
  if(c>=Q_GREEN){ const n=Math.min(10,Math.floor((c-Q_GREEN)/.16)+1); while(QS.greens<n){ QS.lights[QS.greens].material.uniforms.uC.value.set('#5fd36a'); QS.greens++; } }
  setLever(c>=Q_LEVER?lerp(-.6,.6,qease((c-Q_LEVER)/.22)):-.6);
  /* who they are, the moment the camera is on them, and their lines */
  if(c>=Q_CUT1+.15&&!QS.said.idg){ QS.said.idg=true; qid('gideon'); }
  if(c>=Q_CUT-.4&&!QS.said.idg2){ QS.said.idg2=true; qid(null); }
  if(c>=Q_CUT+.25&&!QS.said.ido){ QS.said.ido=true; qid('owen'); }
  if(c>=Q_END-.5&&!QS.said.ido2){ QS.said.ido2=true; qid(null); }
  if(c>=Q_SAY_G&&!QS.said.g){ QS.said.g=true; qsay('gideon'); }
  if(c>=Q_CUT&&!QS.said.cut){ QS.said.cut=true; qsay(null); }
  if(c>=Q_SAY_O&&!QS.said.o){ QS.said.o=true; qsay('owen'); }
  if(QS.talk&&QS.typed<QLINES[QS.talk].length){ QS.acc+=dt*34; const n=Math.min(QLINES[QS.talk].length,Math.floor(QS.acc)); if(n>QS.typed){ if(Math.floor(n/2)>Math.floor(QS.typed/2)&&QLINES[QS.talk][n-1]!==' ') A.voice(QS.talk==='gideon'?455:405); QS.typed=n; qsayN(n); } }
  /* the camera, shot by shot */
  const port=innerHeight>innerWidth, g0=standH(QOW[0],QOW[1]), sh=qshot(c); if(sh!==QS.shot){ QS.shot=sh; QS.snap=true; }
  if(sh===0){ const v=qsine(c/Q_SH2);   // high over the pad, pushing in and tipping down into the shaft as it opens
    qat3(PAD[0]+lerp(2.7,1.5,v),PAD[1]+lerp(4.6,3.0,v),lerp(4.8,4.3,v),csA); qat3(PAD[0],PAD[1],lerp(-.3,-1.5,v),csB); }
  else if(sh===1){ const v=qsine((c-Q_SH2)/(Q_CUT1-Q_SH2));   // low on the hatch side, tipping up with the nose as it comes out
    qat3(PAD[0]+lerp(1.15,1.5,v),PAD[1]+lerp(4.1,4.8,v),lerp(1.75,1.5,v),csA); qat3(PAD[0]+.1,PAD[1],clamp(y+4.85-1.9,-.25,2.4),csB); }
  else if(sh===2){ const v=qsine((c-Q_CUT1)/(Q_CUT-Q_CUT1)), k=lerp(1,.86,v), G=Pl.g;   // Gideon, from the light's side
    const L=port?G.lookP:G.look; qat3(G.g[0]+(G.cam[0]-G.g[0])*k,G.g[1]+(G.cam[1]-G.g[1])*k,lerp(1.5,1.42,v),csA); qat3(L[0],L[1],1.55,csB); }
  else if(sh===3){ const v=qease((c-Q_CUT)/(Q_CUT2-Q_CUT)), b=lerp(1.95,1.8,v)*Pl.side;   // the board from the side, then over to the rocket
    qatG(QDK[0]+sDP[0]*b+dirDP[0]*.2,QDK[1]+sDP[1]*b+dirDP[1]*.2,g0+lerp(1.62,1.55,v),csA);
    const lu=qease((c-Q_LEVER+.2)/.95); qatG(lerp(QDK[0]-dirDP[0]*.15,PAD[0],lu),lerp(QDK[1]-dirDP[1]*.15,PAD[1],lu),g0+lerp(.82,2.1,lu),csB); }
  else { const v=qsine((c-Q_CUT2)/(Q_END-Q_CUT2)), k=lerp(1,.88,v), O=Pl.o;   // his face, lit, the rocket over his shoulder where the light allows
    const L=port?O.lookP:O.look; qatG(QOW[0]+(O.cam[0]-QOW[0])*k,QOW[1]+(O.cam[1]-QOW[1])*k,g0+1.55,csA); qatG(L[0],L[1],g0+1.2,csB); }
  if(port){ csV.copy(csA).sub(csB); csA.copy(csB).addScaledVector(csV,sh===0?1.22:1.45); csA.addScaledVector(csV.copy(csA).normalize(),sh===0?.3:.7); }
  if(QS.snap){ QS.cp.copy(csA); QS.cl.copy(csB); QS.snap=false; } else { const k=1-Math.exp(-7*dt); QS.cp.lerp(csA,k); QS.cl.lerp(csB,k); }
  st.camP.copy(QS.cp); st.camL.copy(QS.cl); csU.copy(QS.cl).normalize(); stUp.copy(csU); stCam.up.copy(csU); UPU.value.copy(csU); LU.uPly.value.copy(QS.cp); S.stSnap=true;   // (uPly at the camera: nothing is cut away)
  /* by night (and a little at dusk): the shaft's light out of its mouth while it is open, the board's glow, and a lamp for each
     face; by day that lamp is lit only for a face the sun barely reaches (more, the less it does), as a crew would hold up a
     card to bounce the light */
  const dk=QS.dark, open=ds*(1-sstep(Q_RISE1-1.2,Q_RISE1,c)), face=sh===2?Pl.g:sh===4?Pl.o:null;
  if(face) csKey(QS.cp,csB); csLamps(face?dk*1.6+(1-dk)*.9*clamp((.25-face.d)/.2,0,1):0,dk*(c>=Q_GREEN-.3?1.1:.5),dk*1.3*open*lit/4);
  if(QS.halo){ QS.halo.visible=dk>.02&&bon; QS.halo.material.uniforms.uK.value=dk; QS.halo.material.uniforms.uH.value=colRT.height||innerHeight; }
  /* nothing in the world says hello to the pointer while it plays (only Skip does) */
  { const ce=$('#cur'); if(ce&&ce.classList.contains('big')&&$('#curT').textContent!=='Skip') ce.classList.remove('big'); }
  /* the sound: its recording in step with the scene, the town's music down while the machinery has the stage */
  A.scoreAt(c); FIN.mus=c<Q_CUT1?.25:.55; FIN.fov=45;
  if(!QS.hold){ QS.t+=dt; const ac=A.scoreClock(); if(ac!==null&&ac!==QS.ac&&Math.abs(ac-QS.t)<.4) QS.t+=(ac-QS.t)*Math.min(1,dt*4); QS.ac=ac; }   // (only a clock that has moved since the last frame is followed)
  if(QS.t>=Q_END) csFinish(); }
/* in the last flight: the two of them at the desk, Owen working the board while you hold, both waving as it lifts */
function csDuring(dt,t){ const G=QS.figs.gideon, O=QS.figs.owen; qstand(G,QGD[0],QGD[1],PAD[0],PAD[1]); qstand(O,QOW[0],QOW[1],PAD[0],PAD[1]);
  const wv=FIN.wave?1:0; animate(G,0,0,wv,t,3); animate(O,0,0,wv,t,4);
  if(FIN.ask&&!FIN.go&&FIN.hold){ const d=O.userData; d.arms[1].rotation.x=-.95; d.fore[1].rotation.x=-.55; QS.lights.forEach((l,i)=>l.material.uniforms.uC.value.set((Math.floor(t*6)+i)%3?'#5fd36a':'#c9f7c9')); QS.tw=true; }
  else if(QS.tw){ QS.tw=false; qLights('#5fd36a'); }
  csLamps(0,sstep(.08,.55,SKY.night)*1.1,0); }
/* every frame on Earth: the last flight's part of it, and building it all in a quiet moment once the invite is coming */
function launchUpdate(dt,t){
  if(FIN.on&&!FIN.pre&&QS.done) csDuring(dt,t);
  else if(!FIN.on&&!QS.built&&st.built&&allMet()&&S.mode==='station'&&!CAFE.on){ csBuild(false); if(QS.stage===1) A.score(QCUE); } }
st._dbg.launch={QS,QCUE,QLINES,QID,start:()=>startFinale(),skip:csSkip,plan:()=>csPlan(),build:()=>csBuild(true),
  /* where the scene is, and to go to a moment of it (held there until let go: for a test to look at it) */
  seek(c,hold=true){ QS.t=c; QS.snap=true; QS.hold=hold; const d=c>Q_HATCH+.8; QS.said={door:c>Q_UNLATCH,hatch:d,idg:c>Q_CUT1+.15,idg2:c>Q_CUT-.4,ido:c>Q_CUT+.25,ido2:c>Q_END-.5,g:c>Q_SAY_G,cut:c>Q_CUT,o:c>Q_SAY_O}; QS.arrived=c>Q_RISE1;
    if(c<Q_GREEN){ QS.greens=0; qLights('#e8553f'); } qid(c>Q_CUT1+.15&&c<Q_CUT-.4?'gideon':c>Q_CUT+.25&&c<Q_END-.5?'owen':null);
    if(c>Q_SAY_G&&c<Q_CUT){ qsay('gideon'); QS.acc=(c-Q_SAY_G)*34; } else if(c>Q_SAY_O){ qsay('owen'); QS.acc=(c-Q_SAY_O)*34; } else qsay(null); },
  /* the machinery as it stands: how far the doors have gone (0 shut, about 2 under the rim), the lift and the rocket (metres
     under the pad, 0 up), the hatch (0 shut, 1 down), where the two of them stand, and the desk */
  get rig(){ const inv=new T.Matrix4().copy(QPM).invert(), p=o=>{ const [x,z]=loc(V.setFromMatrixPosition(o.matrixWorld).normalize()); return [+x.toFixed(2),+z.toFixed(2)]; };
    if(!QS.built) return null; sc.updateMatrixWorld();
    return {door:+Math.abs(V.setFromMatrixPosition(QS.doors[0].g.matrix).applyMatrix4(inv).z).toFixed(3),lift:+(V.setFromMatrixPosition(QS.lift.matrix).applyMatrix4(inv).y-.1).toFixed(3),
      rocket:+V.setFromMatrixPosition(RK.g.matrix).sub(padTop).dot(PADU).toFixed(3),hatch:+((RK.door.rotation.x-DOOR_SHUT)/(DOOR_OPEN-DOOR_SHUT)).toFixed(3),
      gideon:p(QS.figs.gideon),owen:p(QS.figs.owen),desk:[...QDK],deskAt:{owen:[...QOW],gideon:[...QGD]},shaft:QS.shaft[0].visible,doorsShown:QS.doors[0].g.visible,lever:+QS.lever.g.matrix.elements[6].toFixed(2)}; },
  get state(){ return {on:QS.on,done:QS.done,built:QS.built,t:+QS.t.toFixed(2),shot:QS.shot,hole:+LU.uHole.value.w.toFixed(3),lamp:LU.uLamp.value,pre:!!FIN.pre,fin:FIN.on,talk:QS.talk,typed:QS.typed,
    id:QUI.id.classList.contains('on')?QUI.in.textContent:null,say:QUI.say.classList.contains('on')?QUI.s.textContent:null,greens:QS.greens,figs:!!(QS.figs.gideon&&QS.figs.gideon.visible),desk:!!(QS.desk&&QS.desk.visible),
    plan:QS.plan?{g:QS.plan.g.g.map(v=>+v.toFixed(2)),gcam:QS.plan.g.cam.map(v=>+v.toFixed(2)),gd:+QS.plan.g.d.toFixed(2),ocam:QS.plan.o.cam.map(v=>+v.toFixed(2)),od:+QS.plan.o.d.toFixed(2),side:QS.plan.side,dark:+QS.plan.dark.toFixed(2)}:null}; }};
/* ===================== (the launch scene ends here) ===================== */
})();

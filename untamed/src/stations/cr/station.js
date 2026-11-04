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
const SKYBH={value:new T.Vector3(-.35,.75,.55).normalize()}, SPACEU={value:0};   // SPACEU: how far into the black the sky has gone, climbing out // where the hole hangs in the sky: set so the rocket comes down out of it

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
const LU={uPly:{value:new T.Vector3()},uShDbg:{value:0},uSun:{value:SUN},uSky:{value:C3('#9fd0d8')},uFog:{value:C3('#d3e6e2')},uShM:{value:null},uShP:{value:new T.Matrix4()},uShOn:{value:0},uFogK:{value:1}};
const LIGHT=`uniform vec3 uSun,uSky,uFog; uniform sampler2D uShM; uniform mat4 uShP; uniform float uShOn,uShDbg,uFogK;
  float shadowAt(vec3 w,float b){ if(uShOn<.5) return 1.; vec3 q=(uShP*vec4(w,1.)).xyz*.5+.5; if(q.x<.001||q.x>.999||q.y<.001||q.y>.999||q.z>.999) return 1.;
    float t=.6/${SHN}.; return .25*(step(q.z-b,texture2D(uShM,q.xy+vec2(-t,-t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(t,-t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(-t,t)).r)+step(q.z-b,texture2D(uShM,q.xy+vec2(t,t)).r)); }
  vec3 toon(vec3 base,vec3 n,vec3 w){ float d=dot(n,uSun), sh=shadowAt(w,.0006+.0024*(1.-clamp(d,0.,1.)));
    float k=min(smoothstep(-.03,.03,d),smoothstep(.35,.65,sh)), hi=smoothstep(.5,.56,d)*k;
    vec3 c=mix(base*vec3(.6,.66,.83),mix(base*vec3(.93,.92,.89),base*vec3(1.05,1.02,.95),hi),k);
    c+=base*uSky*.07*(.5+.5*dot(n,normalize(w))); c=mix(c,vec3(1.,0.,0.),(1.-sh)*uShDbg);
    return mix(c,uFog,smoothstep(16.,52.,distance(cameraPosition,w))*.55*uFogK); }`;
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
const TOON_F=`uniform vec3 uC; uniform float uOp; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
  void main(){ nearFade(vW); vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(toon(uC*vC,n,vW),uOp); }`;
const mcache=new Map();
function toonMat(color,o={}){ const op=o.op??1, key=op+'|'+(o.side||0)+'|'+(o.vc?1:0)+'|'+(o.fig?1:0)+'|'+C3(color).getHexString(); if(!o.fresh&&mcache.has(key)) return mcache.get(key);
  const m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:C3(color).clone()},uOp:{value:op},uCut:{value:o.fig?0:1}},LU),vertexShader:TOON_V(),fragmentShader:TOON_F,transparent:op<1,depthWrite:op>=1,side:o.side||T.FrontSide,vertexColors:!!o.vc});
  if(!o.fresh) mcache.set(key,m); return m; }
/* what the ink pass sees: the normal and the distance of every surface; what the sun sees: only depth */
const INK_F=`varying vec3 vN; varying vec3 vW; ${NEAR} void main(){ nearFade(vW); vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(n*.5+.5,1./(1.+distance(cameraPosition,vW))); }`;
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
  if(post){ box(M,'#6d5544',-w*.38,0,-.04,.08,y+h/2,.08); box(M,'#6d5544',w*.38,0,-.04,.08,y+h/2,.08); [-.38,0,.38].forEach(k=>obsAt(M,w*k,-.04,.15,y+h/2)); }
  const ox=o.x||0; box(M,o.board||'#5b4636',ox,y-h/2-.03,-.06,w+.1,h+.06,.06);
  const mat=new T.ShaderMaterial({uniforms:Object.assign({uCut:{value:1},uMap:{value:signTex(txt,o.sub,512,Math.round(512*h/w),o.bg||'#f3ead8',o.fg||'#2a241d')}},LU),vertexShader:TOON_V(true),fragmentShader:SIGN_F});
  const m=new T.Mesh(new T.PlaneGeometry(w,h),mat); m.matrixAutoUpdate=false; m.matrix.copy(sub(M,ox,y,-.025)); m.userData.cast=true; sc.add(m); return m; }

/* ---------- prefabs ---------- */
function windowAt(M,x,y,z,ry,o={}){ const W=sub(M,x,y,z,ry), tr=o.trim||'#f6f1e7';
  box(W,tr,0,-.36,.02,.76,.72,.06); box(W,'#7fa3b4',0,-.29,.04,.58,.56,.05); box(W,tr,0,-.29,.05,.04,.56,.04); box(W,tr,0,-.03,.05,.58,.04,.04); box(W,tr,0,-.42,.06,.88,.06,.16);
  if(o.flowers){ box(W,'#8a5a3c',0,-.56,.12,.72,.14,.18); for(let k=0;k<4;k++) put(W,'sph',['#f19bb0','#f6d26b','#fbf6ec','#e9744f'][k],-.24+k*.16,-.38,.14,.07,.07,.07); } }
function door(M,x,z,ry,c,tr){ const D=sub(M,x,0,z,ry); box(D,tr,0,.2,.02,.78,1.26,.06); box(D,c,0,.2,.05,.6,1.12,.05); box(D,'#e7c36a',.2,.75,.09,.05,.05,.04); box(D,'#bdb6aa',0,0,.32,.96,.16,.56); }
function house(x,z,yaw,o){ const M=frameAt(x,z,yaw), w=o.w||3.4, d=o.d||2.8, h=o.h||2.4, tr=o.trim||'#f6f1e7';
  box(M,'#a49b8f',0,0,0,w+.18,.22,d+.18); box(M,o.wall,0,.2,0,w,h-.2,d);
  if(o.flat){ box(M,o.roof,0,h,0,w+.3,.2,d+.3); box(M,tr,0,h+.2,0,w+.3,.06,d+.3); }
  else { const rh=o.rh||1.3; put(M,'prism',o.roof,0,h,0,d+.62,rh,w+.5,Math.PI/2); box(M,tr,0,h-.12,d/2+.04,w+.1,.12,.05); box(M,tr,0,h-.12,-d/2-.04,w+.1,.12,.05);
    if(o.chim!==false) box(M,'#b07a5e',w*.28,h+.25,-d*.16,.34,rh*.95,.34); }
  door(M,o.doorX||0,d/2,0,o.door||'#6e4a3a',tr);
  (o.win||[-w*.3,w*.3]).forEach((wx,i)=>windowAt(M,wx,1.42,d/2,0,{flowers:o.flowers&&i===0,trim:tr}));
  if(o.up) (o.win||[-w*.3,w*.3]).concat([o.doorX||0]).forEach(wx=>windowAt(M,wx,h-.85,d/2,0,{trim:tr}));
  windowAt(M,w/2,1.42,0,Math.PI/2,{trim:tr}); windowAt(M,-w/2,1.42,0,-Math.PI/2,{trim:tr});
  if(o.extra) o.extra(M,w,d,h); obsRect(x,z,yaw,w+.25,d+.25,h+(o.flat?.35:(o.rh||1.3)+.3)); return M; }  // as tall as the ridge
function lamp(x,z){ const M=frameAt(x,z,0); cyl(M,'#43504f',0,0,0,.09,.26,'cyl8'); cyl(M,'#536160',0,.24,0,.05,2.5,'cyl8'); box(M,'#536160',0,2.66,.16,.06,.06,.4);
  box(M,'#3c4746',0,2.5,.38,.28,.14,.26); box(M,'#fff2c4',0,2.44,.38,.2,.06,.18); obs(x,z,.2,1.2); }
function bench(x,z,yaw){ const M=frameAt(x,z,yaw); [-.6,.6].forEach(s=>{ box(M,'#4e4a45',s,0,0,.07,.42,.42); box(M,'#4e4a45',s,.42,-.2,.07,.36,.06); });
  for(let k=0;k<3;k++) box(M,'#b8834f',0,.42,-.14+k*.14,1.46,.05,.12); for(let k=0;k<2;k++) box(M,'#b8834f',0,.56+k*.15,-.22,1.46,.1,.04,0,-.12); obs(x,z,.6,1); }
const LEAF=['#4f7f4a','#5f9256','#6fa25f','#7fae66'];
function tree(x,z,s=1){ const M=frameAt(x,z,rnd()*TAU), th=1.25*s;
  put(M,'cyl8','#7a5a42',0,th/2,0,.12*s,th,.12*s); put(M,'cyl8','#7a5a42',.2*s,th*.82,0,.05*s,.62*s,.05*s,0,0,-.75);
  const n=5+Math.floor(rnd()*3); for(let k=0;k<n;k++){ const a=rnd()*TAU, rr=k?(.42+rnd()*.25)*s:0, bs=(k?.48+rnd()*.3:.82)*s; put(M,'blob',LEAF[Math.min(3,Math.floor(rnd()*3)+(k>2?1:0))],Math.cos(a)*rr,th+.45*s+(k?rnd()*.55*s-.1:.2*s),Math.sin(a)*rr,bs,bs*.86,bs); }
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
  be:['Heloria Labs','The workshop','Where the three of us build. Talk to us: contact@helorialabs.com','mailto:contact@helorialabs.com','Email us']};
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
  { const x=3,z=-13.4, yaw=yawTo(x,z,3,-8.9); house(x,z,yaw,{wall:'#f2dcb8',roof:'#b65a3e',w:4,d:2.8,h:2.95,win:[-1.25,1.25],
      extra:(M,w,d,h)=>{ for(let k=0;k<9;k++) put(M,'box',k%2?'#fbf6ec':'#e9744f',-1.8+k*.45,1.98,d/2+.48,.45,.04,1,0,.42); sign(sub(M,0,0,d/2+.06),'CAFÉ',{w:1.3,h:.38,y:2.55,post:false});
        [[-1.15,1.85],[1.25,1.85]].forEach(([tx,tz])=>{ cyl(M,'#4e4a45',tx,0,tz,.05,.7,'cyl8'); cyl(M,'#f3ede2',tx,.7,tz,.38,.05); [-1,1].forEach(s=>{ cyl(M,'#b8834f',tx+s*.55,0,tz,.17,.45,'cyl8'); }); }); } });
    obs(3-1.15,-13.4+1.85,.5,1); obs(3+1.25,-13.4+1.85,.5,1); }
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
    fragmentShader:`varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} void main(){ gl_FragColor=vec4(toon(vC,normalize(vN),vW),1.); }`});
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
  const cap=new T.Mesh(g,new T.ShaderMaterial({uniforms:Object.assign({uSeg:SEGU,uSegW:SEGW},LU),side:T.DoubleSide,
    vertexShader:`attribute float aL,aB,aH; attribute vec2 aXZ; varying vec3 vN; varying vec3 vW; varying float vL,vB,vH; varying vec2 vXZ;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vL=aL; vB=aB; vH=aH; vXZ=aXZ; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec4 uSeg[12]; uniform float uSegW[12]; varying vec3 vN; varying vec3 vW; varying float vL,vB,vH; varying vec2 vXZ; ${N2} ${LIGHT}
      void main(){ vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 up=normalize(vW); float steep=1.-dot(n,up); vec2 xz=vXZ;
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
        float ct=1.-smoothstep(0.,fwidth(vH)*1.3+.003,abs(vH+.05)); c=mix(c,vec3(.24,.22,.21),ct*(1.-vB)*step(.15,steep)*.9);
        gl_FragColor=vec4(toon(c,n,vW),1.); }`}));
  cap.userData.cast=true; sc.add(cap);
  // the sea: shallow and bright by the land, foam where it meets the shore, painted ripples
  const ld=new Uint16Array(CN*CN*4); for(let k=0;k<CN*CN;k++){ ld[k*4]=T.DataUtils.toHalfFloat(GL[k]); ld[k*4+1]=T.DataUtils.toHalfFloat(GH[k]); ld[k*4+2]=T.DataUtils.toHalfFloat(GB[k]); ld[k*4+3]=T.DataUtils.toHalfFloat(1); }
  const landTex=new T.DataTexture(ld,CN,CN,T.RGBAFormat,T.HalfFloatType); landTex.minFilter=landTex.magFilter=T.LinearFilter; landTex.needsUpdate=true;
  const sea=new T.Mesh(new T.SphereGeometry(R+WATER,160,110),new T.ShaderMaterial({uniforms:Object.assign({uLand:{value:landTex},uTime:G.uTime},LU),
    vertexShader:TOON_V(),
    fragmentShader:`uniform sampler2D uLand; uniform float uTime; varying vec3 vN; varying vec3 vW; ${N2} ${LIGHT}
      void main(){ vec3 d=normalize(vW); float a=acos(clamp(d.y,-1.,1.)); vec2 xz=d.xz*(a*${R}./max(sin(a),1e-4));
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
  const sky=new T.Mesh(new T.SphereGeometry(300,48,32),new T.ShaderMaterial({uniforms:{uUp:UPU,uBH:SKYBH,uTime:G.uTime,uSpace:SPACEU},side:T.BackSide,depthWrite:false,
    vertexShader:`varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uUp,uBH; uniform float uTime,uSpace; varying vec3 vD; ${EARTH_GLSL}
      void main(){ vec3 d=normalize(vD); float h=dot(d,uUp);
        vec3 c=mix(vec3(.85,.92,.9),vec3(.6,.82,.9),smoothstep(-.06,.22,h)); c=mix(c,vec3(.36,.64,.84),smoothstep(.22,.9,h));
        vec3 q=vec3(d.x*1.8,d.y*3.6,d.z*1.8)+vec3(uTime*.006,0.,uTime*.003); float f=efbm(q), fw=fwidth(f)*1.2+.002, band=smoothstep(.0,.1,h)*(1.-smoothstep(.7,.9,h));
        float cl=smoothstep(.57-fw,.57+fw,f)*band, top=smoothstep(.61-fw,.61+fw,efbm(q+vec3(.02,.06,-.02)));
        c=mix(c,vec3(.86,.92,.93),cl); c=mix(c,vec3(.99,.99,.96),top*cl);
        float a=acos(clamp(dot(d,uBH),-1.,1.)); c=mix(c,c*.86,smoothstep(.034,.028,a)); c+=vec3(1.,.86,.66)*exp(-(((a-.036)*120.)*((a-.036)*120.)))*.22;
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

/* ---------- the rocket you flew in orbit, at the size of a small house: a cream cone with peach fins, and a real hatch ---------- */
const RKR=1.2, RKH=4.4, RKB=.35, FLOOR=.42, BAND=2.05, GAP=.42, rAt=y=>RKR*(1-(y-RKB)/RKH);
const HINGE_Z=rAt(FLOOR)-.035, DOOR_L=BAND-FLOOR, DOOR_SHUT=-Math.atan((rAt(FLOOR)-rAt(BAND))/DOOR_L), DROP=Math.asin(FLOOR/DOOR_L), DOOR_OPEN=Math.PI/2+DROP, RAMP_END=HINGE_Z+DOOR_L*Math.cos(DROP), OUT_Z=Math.hypot(START[0]-PAD[0],START[1]-PAD[1]);
const RK={g:null,door:null,flame:null,shadow:null,puffs:[]}, PADU=at(PAD[0],PAD[1]), RKN=new T.Vector3(), padTop=PADU.clone().multiplyScalar(R+.1);
const rkM=new T.Matrix4(), rkW=new T.Matrix4(), rkX=new T.Vector3(), rkY=new T.Vector3(), rkZ=new T.Vector3(), shM0=frameAt(PAD[0],PAD[1],0,.12);
const B0=new T.Vector3(), B1=new T.Vector3(), B2=new T.Vector3(), B3=new T.Vector3();
// the hull is open where the hatch is; seen from inside it is dark
const HULL_F=`uniform vec3 uC; varying vec3 vN; varying vec3 vW; varying vec3 vC; ${LIGHT} ${NEAR}
  void main(){ nearFade(vW); if(!gl_FrontFacing){ gl_FragColor=vec4(.13,.12,.13,1.); return; } gl_FragColor=vec4(toon(uC,normalize(vN),vW),1.); }`;
function buildRocket(){ const g=new T.Group(); g.matrixAutoUpdate=false; sc.add(g); RK.g=g;
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
  buildTown(); await nextFrame(); buildNature(); buildPeople(); buildBirds(); buildRocket(); buildLaunchFlame(); buildNav();
  SEGS.slice(0,12).forEach((s,i)=>{ SEGU.value[i].set(s[0],s[1],s[2],s[3]); SEGW.value[i]=s[4]; });
  const kitM=toonMat('#ffffff',{vc:true,side:T.DoubleSide,fresh:true});
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
st.onPointer=function(e){ if(FIN.on) return; if(CUT.on){ skipCut(); return; } if(down&&down.touch&&e.pointerType!=='mouse'){ look={id:e.pointerId,lx:e.clientX,ly:e.clientY}; return; } down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,id:e.pointerId,moved:false,touch:e.pointerType!=='mouse',ix:0,iz:0};
  if(down.touch){ stick.hidden=false; stick.style.left=e.clientX+'px'; stick.style.top=e.clientY+'px'; stickI.style.transform=''; } };
const turnBy=(dx,dy)=>{ rot(C.f,player.u,-dx*.0052); C.pitch=clamp(C.pitch-dy*.0038,.08,1); C.dragT=0; };
addEventListener('pointermove',e=>{ if(S.st!==st||S.mode!=='station') return;
  if(look&&e.pointerId===look.id){ turnBy(e.clientX-look.lx,e.clientY-look.ly); look.lx=e.clientX; look.ly=e.clientY; return; }
  if(down&&e.pointerId===down.id){ const dx=e.clientX-down.lx; if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>(down.touch?8:13)) down.moved=true;
    if(down.touch){ const sx=clamp(e.clientX-down.x,-50,50), sy=clamp(e.clientY-down.y,-50,50); stickI.style.transform=`translate(${sx}px,${sy}px)`; down.ix=sx/50; down.iz=-sy/50; if(down.moved) began(); }
    else if(down.moved){ turnBy(dx,e.clientY-down.ly); began(); }
    down.lx=e.clientX; down.ly=e.clientY; }
  if(e.pointerType==='mouse'&&!down){ const p=pickPerson(e); if(p!==hov){ hov=p; const ce=$('#cur'), ct=$('#curT'); if(ce&&ct){ if(p){ ct.textContent='Say hello'; ce.classList.add('big'); } else ce.classList.remove('big'); } } } },{passive:true});
addEventListener('pointerup',e=>{ if(look&&e.pointerId===look.id){ look=null; return; } if(S.st!==st||!down||e.pointerId!==down.id) return; const d=down; down=null; stickOff(); if(d.moved||S.mode!=='station'||CUT.on) return;
  if(TALK.p){ nextTalk(); return; }   // talking, a click anywhere goes on
  const p=pickPerson(e); if(p) goTalk(p); });
addEventListener('pointercancel',()=>{ down=null; look=null; stickOff(); });
$('#crSkip',el).addEventListener('click',e=>{ e.stopPropagation(); skipCut(); });
addEventListener('wheel',e=>{ if(S.st!==st||S.mode!=='station'||CUT.on) return; C.zoom=clamp(C.zoom*Math.exp(e.deltaY*.0008),.7,1.6); },{passive:true});
function began(){ if(started) return; started=true; el.classList.add('walked'); hint.classList.add('gone'); }

/* ---------- talking ---------- */
const tk=$('#crTalk',el), tkN=$('#crTkN',el), tkT=$('#crTkT',el), tkImg=$('#crImg',el), tkLink=$('#crLink',el), goBtn=$('#crGo',el);
const PJ={el:$('#crProj',el),n:$('#crProj .crpj-n',el),k:$('#crProj .crpj-k',el),t:$('#crProj .crpj-t',el),l:$('#crProj .crpj-l',el),id:null,want:null,dw:0};
PJ.el.addEventListener('click',e=>e.stopPropagation());
const TALK={p:null,i:0,shown:0,txt:'',acc:0,L:null,ask:false,goal:null};
const allMet=()=>MET.size>=3;
function page(){ const p=TALK.p, L=TALK.L, last=TALK.i>=L.length-1; TALK.txt=L[TALK.i]; TALK.shown=0; TALK.acc=0; tkT.textContent='';
  tk.classList.toggle('last',last&&!TALK.ask); tk.classList.toggle('ask',last&&TALK.ask); tk.classList.add('typing');
  if(last&&!TALK.ask){ MET.add(p.i); p.resume=0; tkImg.src=PHOTOS[p.i]||''; tkImg.alt=p.name; tkLink.href=p.li; tkLink.setAttribute('aria-label',p.name+' on LinkedIn'); } }
function openTalk(p,i=0,L=null){ TALK.ask=!!L; TALK.walkT=0; TALK.held='?'; TALK.p=p; player.path=null; player.speed=0; TALK.L=L||p.lines; TALK.i=Math.min(i,TALK.L.length-1); TALK.goal=null; C.guide=null;
  tkN.textContent=!TALK.ask&&TALK.i>=TALK.L.length-1?p.name:p.first; page(); tk.classList.add('on'); tk.setAttribute('aria-hidden','false'); p.greeted=true; p.wave=1.6;
  player.tgt=null; A.chime(5+p.i*2,0,.035); began(); }
function nextTalk(){ if(!TALK.p) return; if(TALK.shown<TALK.txt.length){ TALK.shown=TALK.txt.length; tkT.textContent=TALK.txt; tk.classList.remove('typing'); return; }
  if(TALK.i<TALK.L.length-1){ TALK.i++; if(TALK.i>=TALK.L.length-1&&!TALK.ask) tkN.textContent=TALK.p.name; page(); A.tick(); } else if(!TALK.ask) closeTalk(true); }
/* closing a conversation: if someone is still to meet, the camera turns gently toward them; once all three are met, Ahroon comes over */
function closeTalk(done=false){ if(!TALK.p) return; const was=TALK.p, ask=TALK.ask; if(!ask&&!MET.has(was.i)) was.resume=TALK.i;
  TALK.p=null; TALK.ask=false; tk.classList.remove('on','last','ask','typing'); tk.setAttribute('aria-hidden','true');
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
$('#crClose',el).addEventListener('click',e=>{ e.stopPropagation(); closeTalk(true); });
$('#crFly',el).addEventListener('click',e=>{ e.stopPropagation(); if(TALK.ask) startFinale(); });
$('#crNot',el).addEventListener('click',e=>{ e.stopPropagation(); closeTalk(); });
goBtn.addEventListener('click',e=>{ e.stopPropagation(); if(allMet()&&!FIN.on) startFinale(); });
addEventListener('keydown',e=>{ if(S.st!==st||S.mode!=='station') return;
  if(FIN.on){ if(LKEYS.includes(e.code)) launchHold(true); e.preventDefault(); e.stopImmediatePropagation(); return; }   // the last flight takes no keys but the launch
  if(CUT.on){ skipCut(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if(TALK.p&&e.code==='Escape'){ closeTalk(); e.stopImmediatePropagation(); return; }
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
function ahroonUpdate(dt){ const a=people[0], P=player; if(!a) return; if(FIN.on||CUT.on){ a.walk=0; return; }
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
const LKEYS=['Space','Enter','KeyW','ArrowUp'], launchHold=on=>{ if(FIN.on&&FIN.ask&&!FIN.go) FIN.hold=on; else if(!on) FIN.hold=false; };
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
function startFinale(){ if(FIN.on) return; closeTalk(); GLN.t=-1; goBtn.hidden=true; Object.assign(FIN,{on:true,t:0,ign:false,shut:false,handed:false,cloud:false,lift:false,top:false,ck:0,beat:0,clk:-1,vent:0,trail:0,st:0,ph:0,wave:0,mus:.55,alt:0,go:false,ask:false,wait:0,held:0,hold:false});
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
  if(c<F_IGN){ A.roar(hold?0:.02+.16*sstep(F_DOOR1,F_IGN-F_HOLD,c)+.1*spool); A.thrust(.18*spool); A.whine(hold?0:.34*spool); A.roarTone(380); }
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
  marksEnter(); stUp.copy(P.u); st.setState('menu'); document.documentElement.classList.add('earth'); bloom0=post.uniforms.uBloom.value; post.uniforms.uBloom.value=.05; };
st.exit=function(){ inkRT.setSize(1,1); colRT.setSize(1,1); if(baked){ shRT.dispose(); shRT.depthTexture.dispose(); baked=false; }   /* Earth's own drawing buffers and its sun's shadow are given back while you are not on Earth: the next frame here makes them again */
  CUT.on=false; el.classList.remove('cut'); document.documentElement.classList.remove('crcut'); stickOff(); down=null; A.thrust(0); A.roar(0); stCam.up.set(0,1,0); stCam.layers.set(0); if(stCam.fov!==36){ stCam.fov=36; stCam.updateProjectionMatrix(); } document.documentElement.classList.remove('earth');
  post.uniforms.uBloom.value=bloom0||1; post.uniforms.uFlat.value=0; closeTalk(); A.music(0); A.hush(); };
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
  if(FIN.on) finUpdate(dt,t); else if(CUT.on) cutUpdate(dt,t); else {
  // input, the same as flying: keys move you relative to the camera; on a touch screen, the stick
  let iz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0), ix=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0), mag=1;
  if(down&&down.touch&&down.moved){ ix=down.ix; iz=down.iz; mag=Math.min(1,Math.hypot(ix,iz)); if(mag<.15){ ix=iz=0; } }
  if(GLN.t>=0){ ix=iz=0; P.tgt=null; }   // while the camera looks at Ahroon, you wait
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
  glanceApply(dt);
  S.stSnap=true; // the camera does its own smoothing
  }
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
  goBtn.hidden=!(allMet()&&AH.heard&&!TALK.p&&!CUT.on&&!FIN.on&&GLN.t<0);
  /* walk up to a landmark and it says what it is, and where to find it */
  /* a landmark's card: only once you are out and walking, never on the way over to someone, and only when you stop by
     it for a moment, so passing one on your way somewhere does not flash it up */
  { let near=null, bd=1; if(started&&!TALK.p&&!TALK.goal&&!CUT.on&&!FIN.on&&GLN.t<0) for(const id in INST){ if(!MK[id]||MK[id].st!=='on') continue; const q=INST[id], dq=Math.hypot(P.x-q.x,P.z-q.z)/q.r; if(dq<bd){ bd=dq; near=id; } }
    if(near!==PJ.want){ PJ.want=near; PJ.dw=0; } else PJ.dw+=dt;
    const best=near&&(near===PJ.id||PJ.dw>.5)?near:null;
    if(best!==PJ.id){ PJ.id=best; if(best){ const c=CARD[best]; PJ.n.textContent=c[0]; PJ.k.textContent=c[1]; PJ.t.textContent=c[2]; PJ.el.href=c[3]; PJ.l.textContent=c[4]; PJ.el.target=/^mailto:/.test(c[3])?'_self':'_blank'; }
      PJ.el.classList.toggle('on',!!best); PJ.el.setAttribute('aria-hidden',best?'false':'true'); PJ.el.tabIndex=best?0:-1; }
  }
  // talking: the words type out with a little voice
  if(TALK.p&&TALK.shown<TALK.txt.length){ TALK.acc+=dt*44; const n=Math.min(TALK.txt.length,Math.floor(TALK.acc)); if(n>TALK.shown){ if(Math.floor(n/2)>Math.floor(TALK.shown/2)&&TALK.txt[n-1]!==' ') A.voice(TALK.p.pitch); TALK.shown=n; tkT.textContent=TALK.txt.slice(0,n); if(n>=TALK.txt.length) tk.classList.remove('typing'); } }
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
  if(PH) PH.beam.rotation.y=t*.9;
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
  if(KR){ const u=(t/3.4)%2, w=u<1?sstep(.86,1,u):1-sstep(1.86,2,u); KRC.copy(KRY).lerp(KRT,w);   // you speak, then the buyer answers
    for(let k=0;k<28;k++){ const a=k/28*TAU, hh=.12+.32*Math.abs(Math.sin(a*3+t*4.2)*Math.sin(t*1.7+k*.4)); Qb.setFromAxisAngle(UPY,-a); Mf.compose(V.set(Math.cos(a)*.33,0,Math.sin(a)*.33),Qb,V2.set(1,hh,1)); KR.bars.setMatrixAt(k,Mf); KR.bars.setColorAt(k,KRC); }
    KR.bars.instanceMatrix.needsUpdate=true; KR.bars.instanceColor.needsUpdate=true;
    const who=w>.5?1:0; if(who!==KR.who&&Math.abs(w-.5)>.4){ KR.who=who; const d0=near(INST.kr); if(!quiet&&d0<9&&MK.kr.st==='on') A.phrase(who,.014*(1-d0/9)); } }
  BIRDS.forEach(b=>{ const a=b.ph+t*b.sp, sg=Math.sign(b.sp), x=b.c[0]+Math.cos(a)*b.r, z=b.c[1]+Math.sin(a)*b.r; at(x,z,BU); tang(BU,at(x-Math.sin(a)*sg,z+Math.cos(a)*sg,V),V2); standOn(b.g,BU,V2,b.h);
    const fl=Math.sin(t*9+b.ph)*.5; b.wl.rotation.z=fl; b.wr.rotation.z=-fl; });
  // sound: the music and birds now and then
  A.music(FIN.on?FIN.mus:CUT.on?(CUT.t>T_HOV-.6?.55*sstep(T_HOV-.6,T_LAND+.9,CUT.t):0):.55);   // the town's music is up before the roar dies away birdT-=dt; if(birdT<=0){ birdT=1.2+Math.random()*3.5; if(!(FIN.on&&FIN.shut)) A.chirp((Math.random()-.5)*1.6); }
  A.hiss(0); A.wind(0);   // (no sea hiss and no wind on Earth: they were the static under the town)
};
st._dbg={began,get started(){ return started; },RK,DOOR:()=>[DOOR_SHUT,DOOR_OPEN],LU,MK,seen,linesFor,MET,AH,GLN,FIN,startFinale,goTalk,talkTo,navPath,NAV,pickPerson,INST,PJ,marksEnter,openInvite,cut:()=>CUT,skipCut,place:()=>placeAtStart(),player,get people(){return people;},cam:C,OBS,at,loc,openTalk,closeTalk,nextTalk,talk:()=>TALK,get started(){return started;},head:i=>people[i].dir.clone().multiplyScalar(R+standH(people[i].x,people[i].z)+1.05)};
})();

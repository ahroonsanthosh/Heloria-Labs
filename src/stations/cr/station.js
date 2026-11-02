/* ================= EARTH =================
   Where the three of us live: a tiny round island on a bright afternoon. You land, walk with WASD or the arrows (or
   click or tap the ground), and find us along a sandy path. Each of us turns and waves as you come close; click one of
   us to see the photograph and LinkedIn. Cel-shaded, outlined, soft: a small cosy world after the dark of orbit. */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,16,10)});
const sc=st.scene, el=st.el, hint=$('#crHint',el), labels=$$('#crLabels .crl',el), card=$('#crCard',el);
const R=8, UPY=new T.Vector3(0,1,0), V=new T.Vector3(), V2=new T.Vector3(), V3=new T.Vector3();
const SUNW=new T.Vector3(.5,.35,.42).normalize();     // the sun's bearing; light always comes from about 40 degrees up
const C3=c=>new T.Color().setStyle(c,T.LinearSRGBColorSpace); // colours here are display colours: this world skips the film curve
const SKY=C3('#A9D4F2'), GND=C3('#D9C08F'), FOGC=C3('#DCEAF0');
const UPU={value:new T.Vector3(0,1,0)};                // the up of where you stand, for the sky and the fog

/* ---------- the island's shape, the same noise the globe in orbit uses (here in JavaScript, to place things) ---------- */
const fr=x=>x-Math.floor(x);
function eh(x,y,z){ x=fr(x*.3183099+.1)*17; y=fr(y*.3183099+.1)*17; z=fr(z*.3183099+.1)*17; return fr(x*y*z*(x+y+z)); }
function en(x,y,z){ const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z); let fx=x-ix,fy=y-iy,fz=z-iz; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); fz=fz*fz*(3-2*fz);
  const L=(a,b,t)=>a+(b-a)*t, h=(a,b,c)=>eh(ix+a,iy+b,iz+c);
  return L(L(L(h(0,0,0),h(1,0,0),fx),L(h(0,1,0),h(1,1,0),fx),fy),L(L(h(0,0,1),h(1,0,1),fx),L(h(0,1,1),h(1,1,1),fx),fy),fz); }
function efbm(x,y,z){ let a=.5,s=0; for(let i=0;i<5;i++){ s+=a*en(x,y,z); x*=2.1; y*=2.1; z*=2.1; a*=.5; } return s; }
const ss=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
function eland(d){ return efbm(d.x*2.3+3.1,d.y*2.3+1.7,d.z*2.3+.4)+.5*ss(.8,.93,d.y)-.53; }
/* a direction on the planet from the home point at the top: fw toward +z, sd toward +x, in radians */
function spot(fw,sd){ return new T.Vector3(Math.sin(sd),Math.cos(fw)*Math.cos(sd),Math.sin(fw)*Math.cos(sd)).normalize(); }
function placeOn(o,dir,lift=0,yaw=0){ o.position.copy(dir).multiplyScalar(R+lift); o.quaternion.setFromUnitVectors(UPY,dir); if(yaw) o.rotateY(yaw); return o; }

/* ---------- cel shading: two tones from the sun, a little sky and ground bounce, a soft rim, fog toward the horizon ---------- */
const NEARV=`vec4 o0=vec4(0.,0.,0.,1.);
    #ifdef USE_INSTANCING
      o0=instanceMatrix*o0;
    #endif
    vK=smoothstep(2.5,3.,distance(cameraPosition,(modelMatrix*o0).xyz));`;
const NEARF=`if(vK<fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))) discard;`;
const TOON_V=`varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vK;
  void main(){ vec4 p=vec4(position,1.); vec3 nn=normal; vC=vec3(1.);
    #ifdef USE_INSTANCING
      p=instanceMatrix*p; nn=mat3(instanceMatrix)*nn;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vC=instanceColor;
    #endif
    vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(mat3(modelMatrix)*nn); gl_Position=projectionMatrix*viewMatrix*w; ${NEARV} }`;
const TOON_LIGHT=`uniform vec3 uSunW,uSky,uGnd,uFog,uUp; uniform float uLo;
  vec3 toon(vec3 base,vec3 n,vec3 w,float rim){
    vec3 up=normalize(w), L=normalize(up*1.15+(uSunW-up*dot(uSunW,up)));
    float d=dot(n,L), lit=uLo+(1.-uLo)*smoothstep(-.02,.06,d)+.07*smoothstep(.72,.78,d);
    vec3 hemi=mix(uGnd,uSky,.5+.5*dot(n,up));
    vec3 v=normalize(cameraPosition-w); float r=pow(1.-max(dot(n,v),0.),3.)*rim;
    vec3 c=base*lit*vec3(1.,.97,.9)+base*hemi*.18+uSky*r*.35;
    float fd=distance(cameraPosition,w); return mix(c,uFog,smoothstep(10.,26.,fd)*.7); }`;
const toonU=()=>({uSunW:{value:SUNW},uSky:{value:SKY},uGnd:{value:GND},uFog:{value:FOGC},uUp:UPU,uLo:{value:.66}});
function toon(color,o={}){ const u=Object.assign(toonU(),{uC:{value:C3(color)},uRim:{value:o.rim??.35},uOp:{value:o.op??1}});
  return new T.ShaderMaterial({uniforms:u,transparent:(o.op??1)<1,depthWrite:(o.op??1)>=1,vertexShader:TOON_V,
    fragmentShader:`uniform vec3 uC; uniform float uRim,uOp; varying vec3 vN; varying vec3 vW; varying vec3 vC; varying float vK; ${TOON_LIGHT}
      void main(){ ${NEARF} gl_FragColor=vec4(toon(uC*vC,normalize(vN),vW,uRim),uOp); }`}); }
/* an outline: the same shape drawn again, a touch larger, back faces only, in dark ink */
const OUT=new T.ShaderMaterial({uniforms:{uW:{value:.022}},side:T.BackSide,
  vertexShader:`uniform float uW; varying float vK; void main(){ vec4 p=vec4(position+normal*uW,1.);
    #ifdef USE_INSTANCING
      p=instanceMatrix*vec4(position+normal*uW,1.);
    #endif
    vec4 w=modelMatrix*p; gl_Position=projectionMatrix*viewMatrix*w; ${NEARV} }`,
  fragmentShader:`varying float vK; void main(){ ${NEARF} gl_FragColor=vec4(.16,.13,.11,1.); }`});
function withLine(mesh,w){ const o=new T.Mesh(mesh.geometry,w?OUT.clone():OUT); if(w) o.material.uniforms.uW.value=w; o.position.copy(mesh.position); o.rotation.copy(mesh.rotation); o.scale.copy(mesh.scale); return [mesh,o]; }
function part(geo,color,pos,o={}){ const m=new T.Mesh(geo,toon(color,o)); if(pos) m.position.set(pos[0],pos[1],pos[2]); return m; }
function add(g,...ms){ ms.forEach(m=>{ if(Array.isArray(m)) m.forEach(x=>g.add(x)); else g.add(m); }); return g; }

/* ---------- the planet: grass, sand, shallow and deep sea, foam, a sandy path between us ---------- */
const PEOPLE_AT=[spot(.2,.02),spot(.4,.3),spot(.42,-.26)];
const PATH=[spot(-.04,0),PEOPLE_AT[0],PEOPLE_AT[1],PEOPLE_AT[0],PEOPLE_AT[2]];
const planetU=Object.assign(toonU(),{uTime:G.uTime,uA:{value:PATH.slice(0,4)},uB:{value:PATH.slice(1,5)}});
const planet=new T.Mesh(new T.SphereGeometry(R,192,128),new T.ShaderMaterial({uniforms:planetU,extensions:{derivatives:true},
  vertexShader:`varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform float uTime; uniform vec3 uA[4],uB[4]; varying vec3 vW; varying vec3 vN; ${EARTH_GLSL} ${TOON_LIGHT}
  float arc(vec3 n,vec3 a,vec3 b){ vec3 c=normalize(cross(a,b)); float off=abs(dot(n,c)); float inA=dot(cross(a,n),c), inB=dot(cross(n,b),c); return (inA>0.&&inB>0.)?off:1.; }
  void main(){
    vec3 n=normalize(vN); float l=eland(n);
    float va=efbm(n*14.), vb=en(n*60.);
    vec3 grass=mix(vec3(.43,.66,.32),vec3(.55,.75,.37),smoothstep(.3,.7,va))*(.95+.08*vb);
    vec3 sand=vec3(.93,.85,.64), shallow=vec3(.42,.81,.82), deep=vec3(.2,.55,.72);
    // a sandy path between us, edged a little darker
    float pd=1.; for(int i=0;i<4;i++) pd=min(pd,arc(n,uA[i],uB[i]));
    float path=1.-smoothstep(.006,.011,pd), edge=(1.-smoothstep(.011,.016,pd))*(1.-path);
    vec3 land=mix(grass,sand,smoothstep(.028,.012,l)); land=mix(land,land*.86,edge); land=mix(land,vec3(.88,.78,.57)*(.96+.06*vb),path);
    float depth=smoothstep(0.,-.09,l);
    vec3 sea=mix(shallow,deep,depth);
    float waves=smoothstep(.55,.95,sin(l*420.-uTime*2.)*.5+.5)*(1.-depth)*.25;
    float foam=smoothstep(.006,0.,abs(l+.004+.003*sin(uTime*1.7+n.x*40.)))*.85;
    vec3 c=l>0.?land:sea+waves+foam;
    c=toon(c,n,vW,.0);
    gl_FragColor=vec4(c,1.); }`}));
sc.add(planet);
/* ---------- the sky: warm at the horizon, blue above, a soft sun, the hole as a pale ring by day ---------- */
const BHD=new T.Vector3(-.4,.55,.73).normalize();
sc.children.filter(o=>o.isPoints).forEach(o=>sc.remove(o)); // no night stars by day
const sky=new T.Mesh(new T.SphereGeometry(60,48,32),new T.ShaderMaterial({uniforms:{uUp:UPU,uSunW:{value:SUNW},uBH:{value:BHD}},side:T.BackSide,depthWrite:false,
  vertexShader:`varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform vec3 uUp,uSunW,uBH; varying vec3 vD; void main(){ vec3 d=normalize(vD); float h=dot(d,uUp);
    vec3 c=mix(vec3(.84,.92,.95),vec3(.52,.77,.96),smoothstep(-.12,.22,h)); c=mix(c,vec3(.3,.6,.92),smoothstep(.22,.9,h));
    vec3 sd=normalize(uSunW+uUp*.4); float s=max(dot(d,sd),0.); c+=vec3(1.,.9,.7)*(pow(s,40.)*.5+pow(s,6.)*.12);
    float a=acos(clamp(dot(d,uBH),-1.,1.)); c=mix(c,c*.9+vec3(.05,.03,.02),smoothstep(.05,.03,a))+vec3(1.,.82,.6)*exp(-pow((a-.055)*90.,2.))*.25;
    gl_FragColor=vec4(c,1.); }`})); sky.renderOrder=-2; sky.frustumCulled=false; sc.add(sky);

/* ---------- soft round shadows, so everything sits on the ground ---------- */
const SHG=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const SHM=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,
  vertexShader:`varying vec2 vU; void main(){ vU=uv; vec4 p=vec4(position,1.);
    #ifdef USE_INSTANCING
      p=instanceMatrix*p;
    #endif
    gl_Position=projectionMatrix*modelViewMatrix*p; }`,
  fragmentShader:`varying vec2 vU; void main(){ float r=length(vU-.5)*2.; gl_FragColor=vec4(.1,.2,.12,(1.-smoothstep(.55,1.,r))*.42); }`});
function shadow(g,s){ const m=new T.Mesh(SHG,SHM); m.scale.set(s,1,s); m.position.y=.02; m.renderOrder=1; g.add(m); return m; }
/* ---------- things on the ground ---------- */
const placed=[]; // directions already taken, so nothing grows on the path, on us or on the landmarks
const tall=[];   // trees, houses and landmarks: things the camera should not look through
function free(d,minA){ for(const p of placed) if(d.angleTo(p.d)<Math.max(minA,p.r)) return false; return true; }
PEOPLE_AT.forEach(d=>placed.push({d,r:.08}));
for(let i=0;i<PATH.length-1;i++) for(let k=0;k<=10;k++){ const d=new T.Vector3().copy(PATH[i]).lerp(PATH[i+1],k/10).normalize(); placed.push({d,r:.035}); }
const rnd=seeded(7);
function randLand(maxA,minL){ for(let i=0;i<200;i++){ const a=rnd()*maxA, b=rnd()*TAU, d=spot(a*Math.cos(b),a*Math.sin(b)); if(eland(d)>minL) return d; } return null; }
// trees: a trunk and two or three round canopy blobs, instanced
const NT=Math.floor(26*Q+16), trunkI=new T.InstancedMesh(new T.CylinderGeometry(.045,.065,.42,7).translate(0,.21,0),toon('#8a5d3c'),NT);
const blobG=new T.IcosahedronGeometry(.26,1), canopyI=new T.InstancedMesh(blobG,toon('#ffffff'),NT*3), canopyO=new T.InstancedMesh(blobG,OUT,NT*3), shI=new T.InstancedMesh(SHG,SHM,NT);
{ const M=new T.Matrix4(), Q0=new T.Quaternion(), S0=new T.Vector3(), P0=new T.Vector3(), C=new T.Color(); let n=0, b=0;
  for(let i=0;i<NT*8&&n<NT;i++){ const d=randLand(.95,.06); if(!d||!free(d,.075)||PEOPLE_AT.some(p=>p.angleTo(d)<.24)||d.angleTo(PATH[0])<.3) continue; placed.push({d,r:.06}); tall.push({d,r:.07});
    Q0.setFromUnitVectors(UPY,d); const s=.95+rnd()*.55; P0.copy(d).multiplyScalar(R); S0.set(s,s,s); M.compose(P0,Q0,S0); trunkI.setMatrixAt(n,M); P0.copy(d).multiplyScalar(R+.02); S0.set(s*.72,1,s*.72); M.compose(P0,Q0,S0); shI.setMatrixAt(n,M); P0.copy(d).multiplyScalar(R);
    const nb=2+Math.floor(rnd()*2), g=.5+rnd()*.5;
    for(let k=0;k<nb;k++){ const off=new T.Vector3((rnd()-.5)*.22,.48+k*.14+rnd()*.06,(rnd()-.5)*.22).multiplyScalar(s).applyQuaternion(Q0); P0.copy(d).multiplyScalar(R).add(off);
      const bs=s*(1-k*.18)*(.85+rnd()*.3); S0.set(bs,bs*.9,bs); M.compose(P0,Q0,S0); canopyI.setMatrixAt(b,M); canopyO.setMatrixAt(b,M);
      C.setRGB(.36+g*.1+k*.04,.6+g*.12+k*.03,.3+g*.04); canopyI.setColorAt(b,C); b++; }
    n++; }
  trunkI.count=shI.count=n; canopyI.count=canopyO.count=b; }
shI.renderOrder=1; sc.add(shI,trunkI,canopyO,canopyI);
// grass tufts and a few flowers near home, swaying a little
function mergeG(gs){ const P=[], N=[]; gs.forEach(g=>{ const q=g.index?g.toNonIndexed():g; P.push(...q.attributes.position.array); N.push(...q.attributes.normal.array); });
  const o=new T.BufferGeometry(); o.setAttribute('position',new T.Float32BufferAttribute(P,3)); o.setAttribute('normal',new T.Float32BufferAttribute(N,3)); return o; }
{ const NG=Math.floor(520*Q+260), blade=mergeG([new T.ConeGeometry(.026,.16,3).translate(0,.08,0),new T.ConeGeometry(.022,.12,3).rotateZ(.35).translate(.035,.055,.01),new T.ConeGeometry(.022,.13,3).rotateZ(-.3).rotateY(1.2).translate(-.03,.06,.02)]);
  const gm=new T.ShaderMaterial({uniforms:Object.assign(toonU(),{uTime:G.uTime}),vertexShader:`uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec3 vC;
    void main(){ vec4 p=instanceMatrix*vec4(position,1.); vC=instanceColor; vec3 base=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz; float h=position.y/.16;
      p.xyz+=normalize(cross(normalize(base),vec3(.3,.1,.9)))*sin(uTime*1.6+base.x*3.+base.z*2.)*.025*h;
      vec4 w=modelMatrix*p; vW=w.xyz; vN=normalize(base); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 vN; varying vec3 vW; varying vec3 vC; ${TOON_LIGHT} void main(){ gl_FragColor=vec4(toon(vC,normalize(vN),vW,0.),1.); }`});
  const gi=new T.InstancedMesh(blade,gm,NG), M=new T.Matrix4(), Q0=new T.Quaternion(), S0=new T.Vector3(), P0=new T.Vector3(), C=new T.Color(), Y=new T.Quaternion(); let n=0;
  for(let i=0;i<NG*3&&n<NG;i++){ const d=randLand(.85,.035); if(!d||!free(d,.02)) continue; Q0.setFromUnitVectors(UPY,d); Y.setFromAxisAngle(UPY,rnd()*TAU); Q0.multiply(Y);
    const fl=rnd()<.06, s=fl?.7:.6+rnd()*.8; P0.copy(d).multiplyScalar(R); S0.set(s,s*(fl?.9:1),s); M.compose(P0,Q0,S0); gi.setMatrixAt(n,M);
    if(fl){ const f=[[1,.72,.78],[1,.9,.45],[1,.98,.95]][Math.floor(rnd()*3)]; C.setRGB(f[0],f[1],f[2]); } else C.setRGB(.34+rnd()*.1,.56+rnd()*.1,.26+rnd()*.05); gi.setColorAt(n,C); n++; }
  gi.count=n; sc.add(gi); }
// cottages: cream walls, a roof, a door, two windows and a chimney
function cottage(dir,yaw,roofC){ const g=new T.Group(); placeOn(g,dir,0,yaw); g.scale.setScalar(1.7); placed.push({d:dir,r:.16}); tall.push({d:dir,r:.12}); shadow(g,1.1);
  add(g,withLine(part(new T.BoxGeometry(.62,.42,.48),'#f3e4c8',[0,.21,0])),
    withLine(part(new T.CylinderGeometry(.42,.42,.66,3,1).rotateZ(Math.PI/2).rotateX(Math.PI/2).scale(1,.62,.78),roofC,[0,.56,0])),
    part(new T.BoxGeometry(.12,.2,.02),'#7b4a35',[0,.1,.25]),part(new T.BoxGeometry(.11,.1,.02),'#57789b',[.19,.26,.25]),part(new T.BoxGeometry(.11,.1,.02),'#57789b',[-.19,.26,.25]),
    withLine(part(new T.BoxGeometry(.08,.22,.08),'#b8735a',[.16,.7,-.1])));
  sc.add(g); return g; }
[[spot(.58,.05),.4,'#c8664b'],[spot(.18,.52),-1.1,'#5d8fb0'],[spot(.22,-.5),1.2,'#c8664b'],[spot(-.32,-.28),2.5,'#d79a3c']].forEach(([d,y,c])=>{ if(eland(d)>.02) cottage(d,y,c); });

/* ---------- the four projects, as small landmarks ---------- */
function coastFrom(fw,sd){ for(let a=.3;a<1.2;a+=.02){ const d=spot(fw*a,sd*a); if(eland(d)<.01) return spot(fw*(a-.05),sd*(a-.05)); } return spot(fw*.6,sd*.6); }
const MARKS=[];
function mark(id,dir,g){ placeOn(g,dir); shadow(g,.8); tall.push({d:dir,r:.08}); placed.push({d:dir,r:.12}); sc.add(g); MARKS.push({id,dir,g}); return g; }
{ // Pharos: a striped lighthouse on the coast, its lamp turning
  const g=new T.Group(); for(let k=0;k<5;k++) add(g,withLine(part(new T.CylinderGeometry(.17-k*.018,.19-k*.018,.26,16),k%2?'#f5efe6':'#d9503c',[0,.13+k*.26,0])));
  add(g,withLine(part(new T.CylinderGeometry(.13,.13,.18,12),'#e8f3f5',[0,1.43,0],{op:.85})),withLine(part(new T.ConeGeometry(.17,.2,12),'#d9503c',[0,1.62,0])));
  const beam=part(new T.CylinderGeometry(.02,.22,1.4,10,1,true).rotateZ(Math.PI/2).translate(.7,0,0),'#fff4c8',[0,1.43,0],{op:.16}); beam.material.depthWrite=false; g.add(beam); g.userData.spin=beam;
  mark('ph',coastFrom(.55,-.85),g); }
{ // Ogive: a white rocket with orange fins on its pad
  const g=new T.Group(); add(g,withLine(part(new T.CylinderGeometry(.34,.38,.08,20),'#b9b2a8',[0,.04,0])),withLine(part(new T.CylinderGeometry(.09,.09,.9,16),'#f6f1e8',[0,.55,0])),
    withLine(part(new T.ConeGeometry(.09,.3,16),'#ef8a3c',[0,1.15,0])));
  for(let k=0;k<4;k++){ const a=k*Math.PI/2; const f=part(new T.BoxGeometry(.18,.2,.02),'#ef8a3c',[Math.cos(a)*.12,.2,Math.sin(a)*.12]); f.rotation.y=-a; add(g,withLine(f)); }
  mark('og',spot(.62,.5),g); }
{ // Aetos: a radar dish on a lattice mast, turning
  const g=new T.Group(); add(g,withLine(part(new T.CylinderGeometry(.04,.09,.95,6),'#9aa3ab',[0,.47,0])));
  const head=new T.Group(); head.position.y=1.0; g.add(head);
  const dish=part(new T.SphereGeometry(.34,24,12,0,TAU,0,Math.PI*.3),'#f2f4f2',[0,0,0]); dish.material.side=T.DoubleSide; dish.rotation.x=-1.2; add(head,withLine(dish));
  head.add(part(new T.CylinderGeometry(.015,.015,.3,6),'#9aa3ab',[0,.08,.1])); g.userData.spin=head;
  mark('ae',spot(-.1,.62),g); }
{ // Kríos: a glass orb on a pedestal with a voice moving inside
  const g=new T.Group(); add(g,withLine(part(new T.CylinderGeometry(.14,.18,.4,16),'#d8cdbd',[0,.2,0])));
  const orb=part(new T.SphereGeometry(.3,32,20),'#a9cbff',[0,.68,0],{op:.55,rim:.9}); g.add(orb);
  g.add(pts(cloud(260,(i,r,o)=>{ const a=r[0]*TAU; o[0]=Math.cos(a)*.19; o[1]=0; o[2]=Math.sin(a)*.19; }),PM({size:.03,color:'#4f7fd1',body:'float a=atan(p.z,p.x); p.xz*=1.+.4*sin(a*7.+uTime*5.)*sin(uTime*1.7); p.y=.1*sin(a*11.-uTime*4.)+.68; b=.9;'})));
  mark('kr',spot(-.38,-.46),g); }

/* ---------- clouds, drifting round the planet ---------- */
const clouds=[];
for(let i=0;i<9;i++){ const g=new T.Group(), n=3+Math.floor(rnd()*3);
  for(let k=0;k<n;k++){ const s=.35+rnd()*.35; const m=part(new T.IcosahedronGeometry(s,1),'#ffffff',[(k-n/2)*.42+rnd()*.15,(rnd()-.5)*.15,(rnd()-.5)*.3],{rim:.15}); m.material.uniforms.uLo.value=.86; g.add(m); }
  const axis=new T.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize(), start=new T.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize();
  sc.add(g); clouds.push({g,axis,start,sp:.02+rnd()*.025,alt:R+5.6+rnd()*1.8}); }

/* ---------- people: small cartoon figures, outlined, each in what they wear in their photo ---------- */
function figure(o){ const g=new T.Group(), body=new T.Group(); g.add(body);
  const legs=[-1,1].map(s=>{ const l=new T.Group(); l.position.set(s*.065,.2,0); add(l,withLine(part(new T.CapsuleGeometry(.05,.13,4,8).translate(0,-.1,0),o.pants))); body.add(l); return l; });
  add(body,withLine(part(new T.CapsuleGeometry(.13,.16,4,12),o.shirt,[0,.36,0])));
  const arms=[-1,1].map(s=>{ const a=new T.Group(); a.position.set(s*.155,.44,0); add(a,withLine(part(new T.CapsuleGeometry(.042,.15,4,8).translate(0,-.1,0),o.sleeve||o.shirt)),
    part(new T.SphereGeometry(.045,10,8),o.skin,[0,-.21,0])); body.add(a); return a; });
  const head=new T.Group(); head.position.y=.66; body.add(head);
  add(head,withLine(part(new T.SphereGeometry(.15,24,18),o.skin)));
  [-1,1].forEach(s=>head.add(part(new T.SphereGeometry(.018,8,6),'#1d1712',[s*.055,.01,.135])));
  head.add(part(new T.TorusGeometry(.03,.007,6,12,Math.PI).rotateZ(Math.PI),'#7a3d2c',[0,-.045,.138]));
  o.hair(head);
  if(o.pack) add(body,withLine(part(new T.BoxGeometry(.17,.2,.09),o.pack,[0,.38,-.15])));
  shadow(g,.5);
  g.userData={legs,arms,head,body}; return g; }
const hairCurly=c=>h=>{ for(let k=0;k<16;k++){ const a=k/16*TAU, r=.12+(k%3)*.012; add(h,part(new T.SphereGeometry(.055,10,8),c,[Math.cos(a)*r*.95,.1+(k%2)*.03,Math.sin(a)*r*.8-.02])); }
  add(h,withLine(part(new T.SphereGeometry(.142,18,12,0,TAU,0,Math.PI*.5),c,[0,.02,-.01]))); };
const hairShort=c=>h=>{ const cap=part(new T.SphereGeometry(.157,20,14,0,TAU,0,Math.PI*.52),c,[0,.01,-.012]); cap.rotation.x=-.25; add(h,withLine(cap)); const fr=part(new T.SphereGeometry(.1,14,10),c,[.02,.115,.075]); fr.scale.set(1.35,.42,.75); fr.rotation.z=.18; add(h,fr); };
const hairQuiff=c=>h=>{ const cap=part(new T.SphereGeometry(.156,20,14,0,TAU,0,Math.PI*.5),c,[0,.015,-.012]); cap.rotation.x=-.2; add(h,withLine(cap)); add(h,withLine(part(new T.SphereGeometry(.08,12,10),c,[.03,.15,.07]))); };
const CREW=[
  {name:'Ahroon Santhosh',first:'Ahroon',li:'https://www.linkedin.com/in/ahroon-santhosh/',shirt:'#f2efe9',pants:'#3d4350',skin:'#9a6847',hair:hairCurly('#1f1814')},
  {name:'Michael Sweeney Heffernan',first:'Michael',li:'https://www.linkedin.com/in/michael-sweeney-heffernan-589155354',shirt:'#2b2a29',sleeve:'#e3b796',pants:'#4a4f5a',skin:'#e3b796',hair:hairShort('#6b4a32')},
  {name:'Abraham Sabu Kurian',first:'Abraham',li:'https://www.linkedin.com/in/abraham-sabu-kurian/',shirt:'#2c2b2a',pants:'#3b3f48',skin:'#8f5f40',hair:hairQuiff('#1d1612')}];
const people=CREW.map((c,i)=>{ const g=figure(c); g.scale.setScalar(1.25); placeOn(g,PEOPLE_AT[i]); sc.add(g); return {...c,i,g,dir:PEOPLE_AT[i],near:false,wave:0,face:0}; });
const me=figure({shirt:'#ef8a3c',pants:'#3a3f4a',skin:'#c99a74',pack:'#5b6b7d',hair:hairShort('#3a2a1e')}); me.scale.setScalar(1.2); sc.add(me);
const player={u:spot(-.04,0),f:new T.Vector3(0,0,1),tgt:null,speed:0,step:0,ph:0};

/* ---------- walking on a sphere ---------- */
function turn(a){ const P=player; V.crossVectors(P.u,P.f); P.f.multiplyScalar(Math.cos(a)).addScaledVector(V,Math.sin(a)).normalize(); }
function walk(dist){ const P=player, th=dist/R, c=Math.cos(th), s=Math.sin(th); V.copy(P.u); P.u.multiplyScalar(c).addScaledVector(P.f,s).normalize(); P.f.multiplyScalar(c).addScaledVector(V,-s); P.f.addScaledVector(P.u,-P.u.dot(P.f)).normalize(); }
const ray=new T.Raycaster(), ndc=new T.Vector2(), ball=new T.Sphere(new T.Vector3(),R), hits=[];
function pickPerson(e){ ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); hits.length=0;
  ray.intersectObjects(people.map(p=>p.g),true,hits); for(const h of hits){ let o=h.object; while(o&&!people.some(p=>p.g===o)) o=o.parent; if(o) return people.find(p=>p.g===o); } return null; }
st.onPointer=function(e){ if(card.classList.contains('on')) return;
  const p=pickPerson(e); if(p){ openCard(p); return; }
  if(ray.ray.intersectSphere(ball,V2)){ player.tgt=V2.clone().normalize(); began(); A.tick(); } };
let hov=null; addEventListener('pointermove',e=>{ if(S.st!==st||e.pointerType!=='mouse') return; const p=pickPerson(e); if(p!==hov){ hov=p; $('#cur')&&p?($('#curT').textContent='Say hello',$('#cur').classList.add('big')):$('#cur')&&$('#cur').classList.remove('big'); } },{passive:true});
let started=false, cardT=0; function began(){ if(started) return; started=true; el.classList.add('walked'); hint.classList.add('gone'); }

/* ---------- the card: a photograph and a link ---------- */
const cImg=$('#crImg',el), cName=$('#crName',el), cN=$('#crN',el), cLink=$('#crLink',el);
const veil=$('#crVeil',el); veil.addEventListener('click',()=>closeCard());
function openCard(p){ cImg.src=PHOTOS[p.i]||''; cImg.alt=p.name; cName.textContent=p.name; cN.textContent=String(p.i+1).padStart(2,'0'); cLink.href=p.li; cLink.setAttribute('aria-label',p.name+' on LinkedIn');
  card.classList.add('on'); veil.classList.add('on'); card.setAttribute('aria-hidden','false'); p.wave=1.6; A.chime(5+p.i*2,0,.04); A.ping(1175,.025); began(); }
function closeCard(){ card.classList.remove('on'); veil.classList.remove('on'); card.setAttribute('aria-hidden','true'); }
$('#crClose',el).addEventListener('click',closeCard);
addEventListener('keydown',e=>{ if(S.st===st&&e.code==='Escape'&&card.classList.contains('on')){ closeCard(); e.stopImmediatePropagation(); } },true);

/* ---------- lifecycle ---------- */
const stUp=new T.Vector3(0,1,0); let bloom0=1, birdT=2;
st.enter=function(){ const P=player; P.u.copy(spot(-.04,0)); P.f.set(0,0,1).addScaledVector(P.u,-P.u.dot(P.f)).normalize(); P.tgt=null; P.speed=0; talkK=0; talkSide=0;
  started=false; cardT=0; el.classList.remove('walked'); closeCard(); hint.classList.remove('gone');
  hint.textContent=FINE?'WASD or the arrows to walk · click the ground to walk there · click someone to say hello':'Tap the ground to walk · tap someone to say hello';
  stUp.copy(P.u); st.setState('menu'); document.documentElement.classList.add('earth'); bloom0=post.uniforms.uBloom.value; post.uniforms.uBloom.value=.05; };
st.exit=function(){ stCam.up.set(0,1,0); if(stCam.fov!==36){ stCam.fov=36; stCam.updateProjectionMatrix(); } document.documentElement.classList.remove('earth'); post.uniforms.uBloom.value=bloom0||1; post.uniforms.uFlat.value=0; closeCard(); A.hush(); };
st.abort=function(){ closeCard(); };

const camR=new T.Vector3(), camT=new T.Vector3(), Qf=new T.Quaternion(), Mf=new T.Matrix4(); let talkK=0, talkSide=0, talkP=null;
function standOn(g,u,f){ V3.crossVectors(f,u).normalize(); Mf.makeBasis(V3.negate(),u,f); g.quaternion.setFromRotationMatrix(Mf); g.position.copy(u).multiplyScalar(R); }
function animate(fig,walkPh,amt,wave,t){ const d=fig.userData; d.legs[0].rotation.x=Math.sin(walkPh)*.7*amt; d.legs[1].rotation.x=-Math.sin(walkPh)*.7*amt;
  d.arms[0].rotation.x=-Math.sin(walkPh)*.6*amt; d.arms[1].rotation.x=Math.sin(walkPh)*.6*amt; d.body.position.y=Math.abs(Math.sin(walkPh))*.035*amt+Math.sin(t*2.1)*.006;
  if(wave>0){ d.arms[1].rotation.z=-2.5+Math.sin(t*12)*.35; d.arms[1].rotation.x=0; } else d.arms[1].rotation.z=damp(d.arms[1].rotation.z,0,8,.016); }
st.update=function(dt,t){
  const P=player; cardT+=dt; if(cardT>6) el.classList.add('walked');
  const open=card.classList.contains('on');
  const kf=open?0:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0), kt=open?0:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  if(kf||kt){ P.tgt=null; began(); }
  if(kt) turn(-kt*2.3*dt);
  let want=kf*2.;
  if(P.tgt&&!open){ const ang=Math.acos(clamp(P.u.dot(P.tgt),-1,1));
    if(ang<.012) P.tgt=null; else { V.copy(P.tgt).addScaledVector(P.u,-P.u.dot(P.tgt)).normalize(); const side=V2.crossVectors(P.u,P.f).dot(V), fw=P.f.dot(V);
      turn(clamp(Math.atan2(side,fw),-3.2*dt,3.2*dt)); want=Math.min(2.2,ang*R*1.6+.4)*(fw>0?1:.25); } }
  P.speed=damp(P.speed,want,7,dt); if(Math.abs(P.speed)>.001) walk(P.speed*dt);
  // no walking into the sea, into people or through landmarks: step back out
  if(eland(P.u)<.008){ walk(-P.speed*dt*1.2); P.speed=0; P.tgt=null; }
  for(const p of people){ const d=P.u.angleTo(p.dir)*R; if(d<.62&&P.tgt&&P.tgt.angleTo(p.dir)<.1){ P.tgt=null; } if(d<.45){ V.copy(P.u).sub(p.dir).normalize(); P.u.addScaledVector(V,(.45-d)/R).normalize(); } }
  for(const m of MARKS){ const d=P.u.angleTo(m.dir)*R; if(d<.5){ V.copy(P.u).sub(m.dir).normalize(); P.u.addScaledVector(V,(.5-d)/R).normalize(); } }
  P.f.addScaledVector(P.u,-P.u.dot(P.f)).normalize();
  // you
  P.ph+=dt*Math.abs(P.speed)*5.2; standOn(me,P.u,P.f); animate(me,P.ph,clamp(Math.abs(P.speed)/1.6,0,1),0,t);
  P.step+=Math.abs(P.speed)*dt; if(P.step>.55){ P.step=0; A.step(); }
  // the camera: behind and a little above, like a small world seen over your shoulder
  stUp.lerp(P.u,1-Math.exp(-4*dt)).normalize(); stCam.up.copy(stUp); UPU.value.copy(stUp);
  const port=innerHeight>innerWidth, far=port?1.45:1, fov=port?50:36; if(stCam.fov!==fov){ stCam.fov=fov; stCam.updateProjectionMatrix(); } // portrait: a wider lens, so all three of us fit
  st.camP.copy(P.u).multiplyScalar(R+3.9*far).addScaledVector(P.f,-5.6*far);
  st.camL.copy(P.u).multiplyScalar(R+.35).addScaledVector(P.f,1.2);
  // standing with one of us: the camera steps round to the side so it sees you both
  let nb=null, nd=9; for(const p of people){ const d=P.u.angleTo(p.dir)*R; if(d<nd){ nd=d; nb=p; } }
  talkK=damp(talkK,nb&&nd<1.7&&Math.abs(P.speed)<.6?1:0,2.5,dt);
  talkP=nb&&nd<1.7?nb:talkP; if(nb&&talkK>.001){ const a=V.copy(nb.dir).sub(P.u).normalize(), sd=V2.crossVectors(P.u,a).normalize(), mid=V3.copy(P.u).add(nb.dir).normalize().multiplyScalar(R);
    if(talkSide===0){ // pick the side with the clearer view: nothing tall between the camera and the two of you
      const lean=Math.sign(V2.dot(camR.copy(stCam.position).sub(mid)))||1; let best=-9;
      for(const sg of [lean,-lean]){ let c=9; for(const k of [.35,.65,1]){ camR.copy(mid).addScaledVector(V2,3.6*far*sg*k).addScaledVector(a,-2.6*far*k).normalize(); for(const o of tall) c=Math.min(c,camR.angleTo(o.d)-o.r); }
        if(c>best+.02){ best=c; talkSide=sg; } } }
    camT.copy(mid).addScaledVector(P.u,2.0*far).addScaledVector(sd,3.6*far*talkSide).addScaledVector(a,-2.6*far); // over your shoulder, so you see their face
    st.camP.lerp(camT,talkK); camT.copy(mid).addScaledVector(P.u,.62); camT.addScaledVector(a,.3); st.camL.lerp(camT,talkK); } else talkSide=0;
  post.uniforms.uFlat.value=damp(post.uniforms.uFlat.value,1,3,dt);
  // the three of us: face you when you are near, wave as you arrive
  camR.setFromMatrixColumn(stCam.matrixWorld,0); A.beacons(BEACON_NOTES);
  people.forEach((p,i)=>{ const d=P.u.angleTo(p.dir)*R, near=d<2.2;
    if(near&&!p.near){ p.wave=1.4; A.chime(7+i*2,0,.03); } p.near=near; p.wave=Math.max(0,p.wave-dt);
    V.copy(near?P.u:spot(-.04,0)).addScaledVector(p.dir,-p.dir.dot(near?P.u:spot(-.04,0))); if(V.lengthSq()<1e-6) V.set(0,0,1);
    V.addScaledVector(p.dir,-p.dir.dot(V)).normalize(); standOn(p.g,p.dir,V); p.g.scale.setScalar(1.25); animate(p.g,0,0,p.wave,t);
    V2.copy(p.dir).sub(P.u); const pan=clamp(V2.dot(camR)/Math.max(.2,V2.length())*1.2,-1,1), k=1-sstep(1,7,d); A.beacon(i,.035*k*k,pan);
    const lb=labels[i]; V.copy(p.dir).multiplyScalar(R+1.2).project(stCam); lb.classList.toggle('on',(d<4.5||hov===p)&&V.z<1&&!open&&(talkK<.4||p===talkP));
    lb.style.transform=`translate(${((V.x*.5+.5)*innerWidth).toFixed(1)}px,${((-V.y*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-100%)`; });
  for(let i=3;i<6;i++) A.beacon(i,0,0);
  MARKS.forEach((m,k)=>{ if(m.g.userData.spin) m.g.userData.spin.rotation.y=t*(m.id==='ph'?.9:1.2);
    const lb=labels.find(x=>x.dataset.k===m.id); if(!lb) return; const d=P.u.angleTo(m.dir)*R; V.copy(m.dir).multiplyScalar(R+1.9).project(stCam);
    lb.classList.toggle('on',d<3&&V.z<1&&!open); lb.style.transform=`translate(${((V.x*.5+.5)*innerWidth).toFixed(1)}px,${((-V.y*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-100%)`; });
  clouds.forEach(c=>{ c.g.position.copy(c.start).applyAxisAngle(c.axis,t*c.sp).multiplyScalar(c.alt); c.g.quaternion.setFromUnitVectors(UPY,V.copy(c.g.position).normalize()); });
  // birds now and then, the sea when you are near the shore, a light wind
  birdT-=dt; if(birdT<=0){ birdT=1.5+Math.random()*4; A.chirp((Math.random()-.5)*1.6); }
  const shore=1-ss(.0,.09,eland(P.u)); A.hiss(.22*shore*(.6+.4*Math.sin(t*.7))); A.wind(.035+Math.abs(P.speed)*.012);
};
st._dbg={player,people,MARKS,openCard,closeCard,get started(){return started;}};
})();

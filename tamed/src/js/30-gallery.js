/* ================= THE GALLERY: FOUR ROOMS OF LIGHT =================
   Bigger inside than out. Rooms in a line, doorways aligned, so each room shows the next one's light. */
const ROOM={L:16, W:12, H:7.2, T:1.2, z0:-6};
const roomZ=k=>ROOM.z0-ROOM.T-ROOM.L/2-k*(ROOM.L+ROOM.T);
const wallZ=k=>ROOM.z0-k*(ROOM.L+ROOM.T);
const EXIT_Z=wallZ(4)-ROOM.T;

function buildGallery(){
  const W={name:'gal', scene:new T.Scene(), U:sceneU(), t:0};
  const sc=W.scene, H=ROOM.H, B=Builder();
  const zA=1, zB=EXIT_Z-8;
  B.raw(`d=min(d,p.y);`);
  /* side walls, the vestibule and the exit corridor */
  B.box(-7,-6,0,H+.6,wallZ(4)-ROOM.T,wallZ(0)); B.box(6,7,0,H+.6,wallZ(4)-ROOM.T,wallZ(0));
  /* each group only costs a pixel within reach of it: a room never pays for the rooms beyond it */
  B.group(-6,6,0,H+.6,wallZ(0),zA,()=>{ B.box(-6,-2.2,0,H+.6,wallZ(0),zA); B.box(2.2,6,0,H+.6,wallZ(0),zA); B.box(-2.2,2.2,5.6,H+.6,wallZ(0),zA); });
  B.group(-6,6,0,H+.6,zB,EXIT_Z,()=>{ B.box(-6,-2.2,0,H+.6,zB,EXIT_Z); B.box(2.2,6,0,H+.6,zB,EXIT_Z); B.box(-2.2,2.2,5.6,H+.6,zB,EXIT_Z); });
  for(let k=0;k<=4;k++) B.wall('x',-7,7,0,H+.6,wallZ(k)-ROOM.T,wallZ(k),[{c:0,w:2.8,hs:3.45}]);
  /* ceilings: plain over Kríos and Pharos, a square opening over Aetos, a round shaft over Ogive */
  const z0=k=>wallZ(k)-ROOM.T, z1=k=>wallZ(k+1);
  B.box(-6,6,H,H+.6,z1(0),z0(0)); B.box(-6,6,H,H+.6,z1(2),z0(2));
  const AP=2.1, ac=roomZ(1);
  B.box(-6,6,H,H+.06,ac+AP,z0(1),{nosdf:1}); B.box(-6,6,H,H+.06,z1(1),ac-AP,{nosdf:1}); B.box(-6,-AP,H,H+.06,ac-AP,ac+AP,{nosdf:1}); B.box(AP,6,H,H+.06,ac-AP,ac+AP,{nosdf:1});
  B.box(-6,6,H+.06,H+.8,ac+AP+.9,z0(1),{nosdf:1}); B.box(-6,6,H+.06,H+.8,z1(1),ac-AP-.9,{nosdf:1}); B.box(-6,-AP-.9,H+.06,H+.8,ac-AP-.9,ac+AP+.9,{nosdf:1}); B.box(AP+.9,6,H+.06,H+.8,ac-AP-.9,ac+AP+.9,{nosdf:1});
  /* the skyspace's ceiling, and the stone bench round the room */
  const bz0=z1(1)+.15, bz1=z0(1)-.15;
  B.group(-6,6,0,H+.8,z1(1),z0(1),()=>{
    B.raw(`d=min(d,max(sdBox(p-vec3(0.,${H+.03},${ac.toFixed(3)}),vec3(6.,.03,8.)),-sdBox(p-vec3(0.,${H},${ac.toFixed(3)}),vec3(${AP},1.,${AP}))));`);
    B.box(-6,-5.45,0,.46,bz0,bz1); B.box(5.45,6,0,.46,bz0,bz1); B.box(-5.45,-1.7,0,.46,bz0,bz0+.55); B.box(1.7,5.45,0,.46,bz0,bz0+.55);
  });
  const oc=roomZ(3), OR=1.8;
  {
    const s=new T.Shape(); s.moveTo(-6,-z0(3)); s.lineTo(6,-z0(3)); s.lineTo(6,-z1(3)); s.lineTo(-6,-z1(3)); s.lineTo(-6,-z0(3));
    const hp=new T.Path(); hp.absarc(0,-oc,OR,0,TAU,false); s.holes.push(hp);
    const g=new T.ExtrudeGeometry(s,{depth:.6,bevelEnabled:false,curveSegments:48}); g.rotateX(-Math.PI/2); g.translate(0,H,0); B.geos.push(g);
    B.raw(`d=min(d,max(sdBox(p-vec3(0.,${H+.3},${oc.toFixed(3)}),vec3(6.,.3,8.)),-(length(p.xz-vec2(0.,${oc.toFixed(3)}))-${OR})));`);
    const sh=new T.CylinderGeometry(OR,OR,40,64,1,true); sh.translate(0,H+.6+20,oc);
    const idx=sh.index.array; for(let i=0;i<idx.length;i+=3){ const t=idx[i]; idx[i]=idx[i+2]; idx[i+2]=t; } // face inward
    sh.computeVertexNormals(); const nn=sh.attributes.normal.array; for(let i=0;i<nn.length;i++) nn[i]*=-1;
    W.shaftGeo=sh;
  }
  W.sdfGLSL=B.glsl();
  /* Pharos: the room is dark stone. The floor is a map, drawn in light only where the drone's camera is looking,
     with the square it thinks it is in and its circle of doubt */
  Object.assign(W.U,{uPhD:{value:new T.Vector4(0,roomZ(2),0,1.2)}, uPhM:{value:new T.Vector4(0,roomZ(2),.6,0)}, uPhCol:{value:col('#FFD5B3')}, uPhK:{value:1}});
  const PHM=`${(z0(2)+.3).toFixed(2)},${(z0(2)-.4).toFixed(2)},vWP.z)*smoothstep(${(z1(2)-.3).toFixed(2)},${(z1(2)+.4).toFixed(2)},vWP.z)`;
  const stone=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'gal', color:'#ECE5DA', rough:.88, joint:.55, warm:'#FFF4E6',
    albedo:`{ float ph=smoothstep(${PHM}; diffuseColor.rgb*=mix(1.,.27,ph); }`});
  const PHG=`uniform vec4 uPhD,uPhM; uniform vec3 uPhCol; uniform float uPhK,uTime;
    float mapLines(vec2 q){ float h=(vnoise(q*.11+3.)*.66+vnoise(q*.24+5.3)*.34)*14.+vnoise(q*.4+7.)*1.2; float dd=abs(fract(h+.5)-.5); float fw=fwidth(h)*1.2+.002;
      float line=1.-smoothstep(0.,.022+fw,dd); float major=1.-smoothstep(0.,.03+fw*.2,abs(fract(h*.2+.5)-.5)*5.);
      vec2 gq=abs(fract(q/1.24+.5)-.5)*1.24; float gw=fwidth(q.x)+fwidth(q.y); float grid=1.-smoothstep(0.,.005+gw,min(gq.x,gq.y));
      vec2 cq=abs(fract(q/4.96+.5)-.5)*4.96; float cross=(1.-smoothstep(.0,.012+gw,min(cq.x,cq.y)))*step(max(cq.x,cq.y),.16);
      return clamp(line*.42+major*.6+grid*.2+cross*.9,0.,1.); }
    float lakeK(vec2 q){ vec2 d=(q-vec2(${PH_LAKE[0].toFixed(3)},${PH_LAKE[1].toFixed(3)}))/vec2(${PH_LAKE[2].toFixed(3)},${PH_LAKE[3].toFixed(3)});
      return 1.-smoothstep(.92,1.04,length(d)+.05*(vnoise(q*2.3)-.5)); }`;
  const PHE=`{ float ph=smoothstep(${PHM};
    if(ph>.01&&uPhK>0.){ vec2 q=vWP.xz, d=q-uPhD.xy; float c=cos(uPhD.z), s=sin(uPhD.z);
      vec2 l=vec2(d.x*c-d.y*s,d.x*s+d.y*c); float e=max(abs(l.x),abs(l.y))/uPhD.w, fe=fwidth(e)*1.5+.002;
      float seen=1.-smoothstep(.94,1.,e), lk=lakeK(q), ml=mapLines(q)*(1.-lk);
      float water=lk*(.15+.07*sin(q.x*7.+uTime*.5)*sin(q.y*5.-uTime*.35));
      float frame=1.-smoothstep(0.,fe+.012,abs(e-1.));
      vec2 dm=q-uPhM.xy, lm=vec2(dm.x*c-dm.y*s,dm.x*s+dm.y*c); float em=max(abs(lm.x),abs(lm.y))/uPhD.w, fm=fwidth(em)*1.5+.002;
      float along=abs(lm.x)>abs(lm.y)?lm.y:lm.x, dash=mix(step(.45,fract(along*4.2)),1.,uPhM.w);
      float match=(1.-smoothstep(0.,fm+.016,abs(em-1.)))*dash;
      float rd=length(dm), rr=abs(rd-uPhM.z), fr=fwidth(rd)*1.5+.002; float ring=(1.-smoothstep(0.,fr+.01,rr))*(.3+.7*(1.-uPhM.w));
      float cr=(1.-smoothstep(0.,fm*.5+.01,min(abs(lm.x),abs(lm.y))))*step(max(abs(lm.x),abs(lm.y)),.12*uPhD.w)*uPhM.w;
      vec3 add=uPhCol*(seen*(ml*.9+water+.045)+frame*.35*seen)+uPhCol*(match*(.5+.9*uPhM.w)+ring*.55+cr*1.1)+uPhCol*ml*.022;
      outgoingLight+=add*ph*uPhK; } }`;
  const arch=new T.Mesh(mergeGeos(B.geos),stone); arch.castShadow=arch.receiveShadow=true; sc.add(arch);
  const shaftM=stoneMat({U:W.U, sdf:'float mapAO(vec3 p){return 1e5;}', key:'shaft', color:'#ECE3D6', rough:.9, joint:.6,
    emisGLSL:`outgoingLight+=diffuseColor.rgb*vec3(1.,.74,.48)*(pow(smoothstep(7.6,30.,vWP.y),.7)*2.6+smoothstep(7.6,9.5,vWP.y)*.25);`});
  W.shaft=new T.Mesh(mergeGeos([W.shaftGeo]),shaftM); W.shaft.receiveShadow=true; sc.add(W.shaft);
  const capM=new T.MeshBasicMaterial({color:new T.Color('#FFE2BC').multiplyScalar(6)}); const cap=new T.Mesh(new T.CircleGeometry(1.8,48),capM); cap.rotation.x=Math.PI/2; cap.position.set(0,47.5,roomZ(3)); sc.add(cap); W.shaftCap=cap;
  /* the floor: polished stone that holds a soft reflection of the light */
  W.mirror=new Mirror(MOBILE?.25:.35,{mips:true,bias:.001});
  const floorM=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'galfloor', color:'#DCD3C6', rough:.55, joint:1, mirror:true, mirrorK:.55, glsl:PHG, emisGLSL:PHE,
    albedo:`{ float ph=smoothstep(${PHM}; diffuseColor.rgb*=mix(1.,.32,ph); }`});
  floorM.userData.u.uMirror.value=W.mirror.rt.texture; floorM.userData.u.uTexMat.value=W.mirror.texMat;
  const floor=new T.Mesh(boxGeo(-6,6,-.5,0,zB,zA),floorM); floor.receiveShadow=true; sc.add(floor);
  W.floor=floor;

  /* the way out at the end: the courtyard's sunset light */
  const exitM=new T.MeshBasicMaterial({color:new T.Color('#FFC690').multiplyScalar(2.4)});
  const exitP=new T.Mesh(new T.PlaneGeometry(4.4,5.6),exitM); exitP.position.set(0,2.8,zB+.3); sc.add(exitP); W.exitM=exitM;
  const inP=new T.Mesh(new T.PlaneGeometry(4.4,5.6),new T.MeshBasicMaterial({color:new T.Color('#FFE2B8').multiplyScalar(2)})); inP.position.set(0,2.8,zA-.05); inP.rotation.y=Math.PI; sc.add(inP);

  /* gallery sky, seen through the skyspace and up the shaft */
  W.sky=new T.Mesh(new T.SphereGeometry(900,32,16),skyMat()); W.sky.frustumCulled=false; W.sky.renderOrder=900; sc.add(W.sky);

  /* soft room light: a low warm ambient, and a glow of each room's own colour */
  W.hemi=new T.HemisphereLight('#FFF4E8','#BFAF9C',.045); sc.add(W.hemi);
  W.roomLights=PROJ.map((p,k)=>{ const l=new T.PointLight(p.col,[5,7,.12,5][k],20,1.4); l.position.set(0,H-.6,roomZ(k)); sc.add(l); return l; });
  const exitL=new T.PointLight('#FFB980',40,16,1.6); exitL.position.set(0,3.5,zB+2); sc.add(exitL);
  const inL=new T.PointLight('#FFE3BC',26,12,1.6); inL.position.set(0,3.2,zA-1.5); sc.add(inL);

  W.rooms=[buildKrios(W,roomZ(0)),buildAetos(W,roomZ(1),AP),buildPharos(W,roomZ(2)),buildOgive(W,roomZ(3),OR)];
  W.hideInMirror=[floor];
  W.update=(dt,st)=>{ W.t+=dt*S.timeScale; for(const r of W.rooms) r.update(dt*S.timeScale,W.t,st); W.shaft.visible=W.shaftCap.visible=W.ogColumn.visible=CAM.gal.position.z<-38; };
  W.applyLight=(tod,tint,s)=>{
    const sk=W.sky.material.uniforms;
    sk.uSunDir.value.copy(SUN.dir); sk.uZen.value.copy(TODC.zen); sk.uHor.value.copy(TODC.hor); sk.uHorS.value.copy(TODC.horS); sk.uGlow.value.copy(TODC.glow);
    sk.uSun.value.copy(TODC.sun); sk.uBelt.value.copy(TODC.belt); sk.uBeltK.value=tod.beltK; sk.uCl.value.copy(TODC.cl); sk.uCs.value.copy(TODC.cs); sk.uSunK.value=sstep(-2.2,-.2,SUN.el);
    W.U.uSunDir.value.set(0,1,0);
    W.U.uHazeCol.value.copy(tint).multiplyScalar(.075); W.U.uHazeSun.value.copy(W.U.uHazeCol.value);
    W.exitM.color.copy(TODC.L).lerp(TODC.hazeS,.4).multiplyScalar(2.6);
    if(W.aetosPour) W.aetosPour.uSky.value.copy(TODC.mid).lerp(TODC.zen,.4);
  };
  W.render=(cam,target)=>{
    W.sky.position.copy(cam.position);
    renderer.shadowMap.needsUpdate=true;
    W.mirror.render(sc,cam,W.hideInMirror);
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(sc,cam);
  };
  W.setSize=(w,h)=>W.mirror.setSize(w,h);
  W.U.uFog.value.set(.022,0,1,.85);
  W.U.uAOk.value=1.05;
  return W;
}

/* ---------- shared by the rooms ---------- */
const ADD={transparent:true,depthWrite:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor};
/* what the rooms just did, for the sound to answer: [name, pan, value] */
const RSND=[]; const rsnd=(n,p=0,v=1)=>{ if(RSND.length<24) RSND.push([n,p,v]); };
const QUAD=[-1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0];
/* a line of light from uA to uB, drawn up to uDraw of the way, always turned to face you; uDash breaks it into dashes */
function lightLine(c,w=3){
  const U={uA:{value:v3()},uB:{value:v3()},uDraw:{value:1},uK:{value:0},uPx:{value:600},uW:{value:w},uDash:{value:0},uCol:{value:col(c)}};
  const m=new T.ShaderMaterial({uniforms:U,...ADD,side:T.DoubleSide,
    vertexShader:`uniform vec3 uA,uB; uniform float uPx,uW; varying float vU,vV,vL;
      void main(){ float u=position.x+.5; vec3 P=mix(uA,uB,u); vec3 d=normalize(uB-uA+vec3(0.,1e-5,0.)); vec3 toC=normalize(cameraPosition-P);
        vec3 side=normalize(cross(d,toC)+vec3(1e-5,0.,0.)); P+=side*position.y*length(cameraPosition-P)*uW/uPx;
        vU=u; vV=position.y*2.; vL=length(uB-uA); gl_Position=projectionMatrix*viewMatrix*vec4(P,1.); }`,
    fragmentShader:`uniform float uDraw,uK,uDash; uniform vec3 uCol; varying float vU,vV,vL;
      void main(){ float on=1.-smoothstep(uDraw-.004,uDraw,vU); float head=exp(-pow((vU-uDraw)*vL*3.,2.))*1.6*step(uDraw,.999);
        float dash=uDash>0.?smoothstep(.35,.5,abs(fract(vU*vL/uDash)-.5)*2.):1.;
        float core=exp(-vV*vV*3.); gl_FragColor=vec4(uCol*core*(on*.6*dash+head)*uK,1.); }`});
  const mesh=new T.Mesh(new T.PlaneGeometry(1,1,48,1),m); mesh.frustumCulled=false; return {mesh,U};
}
/* a soft round glow that always faces you */
function glowSprite(c,size){
  const U={uCol:{value:col(c)},uK:{value:1},uS:{value:1}};
  const m=new T.ShaderMaterial({uniforms:U,...ADD,
    vertexShader:`uniform float uS; varying vec2 vQ; void main(){ vQ=position.xy; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*${size.toFixed(3)}*uS; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying vec2 vQ; void main(){ float r=length(vQ); float a=(exp(-r*r*16.)+exp(-r*r*3.5)*.32)*(1.-smoothstep(.8,1.,r)); gl_FragColor=vec4(uCol*a*uK,1.); }`});
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(QUAD,3));
  const mesh=new T.Mesh(g,m); mesh.frustumCulled=false; return {mesh,U};
}

/* ---------- Kríos: you speak, and the room answers back. A microphone stands in a pool of light, turned to you; across the
   floor is a field of slender stems, each tipped with a bead of light. What you say runs out through the field from the
   microphone in rings. Then the buyer, a soft light at the far end of the room, answers back, and the field carries that
   back to you. The rings move with the syllables you hear ---------- */
const VOICE={who:0,phase:0,amp:0,env:0};   // shared with the sound: who is speaking (0 you, 1 the buyer), and how loudly
const VOICE_GLSL=`
float vTalk(float tt,out float who){ float k=mod(max(tt,0.),6.8); who=k<3.4?0.:1.; float u=mod(k,3.4)/3.4; return smoothstep(0.,.08,u)*(1.-smoothstep(.78,.95,u)); }
float vSyl(float tt,float who){ return pow(abs(sin(tt*6.2+who*2.)),2.2)*(.62+.38*sin(tt*2.1+who)); }
float vWave(vec2 p,vec2 src,float want,float vt){ float d=length(p-src); float te=vt-d/5.2; float w; float k=vTalk(te,w);
  return (abs(w-want)<.5?1.:0.)*k*vSyl(te,w)*exp(-d*.05)*step(0.,te); }`;
function buildKrios(W,zc){
  const g=new T.Group(); W.scene.add(g);
  const MIC=v3(-.45,0,zc+1.2), ORB=v3(-2.75,1.5,zc-5.6), CAMP=v3(1.75,1.58,-8.5);
  /* the pool of light, over the microphone */
  const spot=new T.SpotLight('#CADBFF',270,0,.27,.72,2); spot.position.set(MIC.x,ROOM.H-.15,MIC.z); spot.target.position.copy(MIC);
  spot.castShadow=true; spot.shadow.mapSize.set(1024,1024); spot.shadow.bias=-.0006; spot.shadow.radius=4; spot.shadow.camera.near=1; spot.shadow.camera.far=10;
  g.add(spot); g.add(spot.target);
  const coneM=new T.ShaderMaterial({uniforms:{uCol:{value:col('#A5C3FF')},uK:{value:1},uTime:GU.uTime},...ADD,side:T.DoubleSide,
    vertexShader:`varying vec3 vP; varying vec3 vN; varying vec3 vWP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK,uTime; varying vec3 vP; varying vec3 vN; varying vec3 vWP; ${GLSL.noise}
      void main(){ float h=vP.y/7.+.5; vec3 V=normalize(cameraPosition-vWP); float e=pow(1.-abs(dot(normalize(vN),V)),1.6);
        float n=.75+.25*vnoise(vec2(vWP.x*3.+uTime*.2,vWP.y*2.-uTime*.3));
        float a=(1.-e)*smoothstep(1.,.25,h)*smoothstep(0.,.08,h)*n; gl_FragColor=vec4(uCol*a*.045*uK,1.); }`});
  const cone=new T.Mesh(new T.CylinderGeometry(.28,2.2,7,48,1,true),coneM); cone.position.set(MIC.x,3.5,MIC.z); g.add(cone);
  /* the microphone: a heavy round foot, a slim stand, a capsule with a ball grille, tipped up towards you */
  const metal=new T.MeshStandardMaterial({color:'#E7E0D5',roughness:.3,metalness:.55});
  const grill=new T.MeshStandardMaterial({color:'#5E5A55',roughness:.72,metalness:.35,emissive:new T.Color('#BFD2FF'),emissiveIntensity:.02});
  const mic=new T.Group(); mic.position.copy(MIC); mic.rotation.y=Math.atan2(CAMP.x-MIC.x,CAMP.z-MIC.z)+.95; mic.scale.setScalar(1.25); g.add(mic);   // turned a little, so you see it in profile
  const foot=new T.Mesh(new T.CylinderGeometry(.15,.17,.03,48),metal); foot.position.y=.015;
  const pole=new T.Mesh(new T.CylinderGeometry(.009,.011,1.33,14),metal); pole.position.y=.03+.665;
  const collar=new T.Mesh(new T.CylinderGeometry(.016,.016,.05,16),metal); collar.position.y=1.36;
  const head=new T.Group(); head.position.y=1.4; head.rotation.x=-.5;
  const caps=new T.Mesh(new T.CylinderGeometry(.032,.022,.19,24),metal); caps.rotation.x=Math.PI/2; caps.position.z=-.035;
  const ring=new T.Mesh(new T.TorusGeometry(.031,.004,8,32),metal); ring.position.z=.054;
  const ball=new T.Mesh(new T.SphereGeometry(.044,28,18),grill); ball.position.z=.09;
  const clip=new T.Mesh(new T.BoxGeometry(.022,.05,.032),metal); clip.position.set(0,-.03,-.02);
  head.add(caps,ring,ball,clip); mic.add(foot,pole,collar,head);
  [foot,pole,collar,caps,ring,ball,clip].forEach(m=>{ m.castShadow=true; m.receiveShadow=true; });
  /* the buyer: a soft light at the far end that brightens as it speaks */
  const ORBC=col('#FFE3C4');
  const orbM=new T.MeshBasicMaterial({color:ORBC.clone()});
  const orb=new T.Mesh(new T.SphereGeometry(.11,32,20),orbM); orb.position.copy(ORB); g.add(orb);
  const halo=glowSprite('#FFD9B0',1.05); halo.mesh.position.copy(ORB); halo.mesh.renderOrder=958; g.add(halo.mesh);
  const orbL=new T.PointLight('#FFD9B4',.6,7,1.6); orbL.position.copy(ORB); g.add(orbL);
  const thread=lightLine('#FFD9B0',1.2); thread.U.uA.value.set(ORB.x,0,ORB.z); thread.U.uB.value.copy(ORB).y-=.14; thread.U.uK.value=.16; thread.U.uDash.value=.09; thread.mesh.renderOrder=957; g.add(thread.mesh);
  /* the field: stems on a loose grid, kept clear of the way through the room, of the microphone and of the light at the far end */
  const F=[]; const rnd=(()=>{let s=11;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(let z=zc+5; z>=zc-7.4; z-=.44) for(let x=-5.4; x<=5.4; x+=.44){
    const px=x+(rnd()-.5)*.26, pz=z+(rnd()-.5)*.26, ax=lerp(1.55,0,inv(zc+6.5,zc-6,pz)), h=.4+rnd()*.44, r=rnd();
    if(Math.abs(px-ax)<1.05||Math.hypot(px-MIC.x,pz-MIC.z)<.95||Math.hypot(px-ORB.x,pz-ORB.z)<.8||Math.abs(px)>5.55) continue;
    F.push(px,pz,h,r); }
  const NF=F.length/4, fA=new T.InstancedBufferAttribute(new Float32Array(F),4);
  const inst=a=>{ const ig=new T.InstancedBufferGeometry(); ig.setAttribute('position',new T.Float32BufferAttribute(a,3)); ig.setAttribute('aF',fA); ig.instanceCount=NF; ig.boundingSphere=new T.Sphere(v3(0,0,zc),24); return ig; };
  const FU={uVT:{value:0},uTime:GU.uTime,uMic:{value:new T.Vector2(MIC.x,MIC.z)},uOrb:{value:new T.Vector2(ORB.x,ORB.z)},uPx:{value:600},
    uYou:{value:col('#B9CDFF')},uThem:{value:col('#FFDDB8')},uBase:{value:col('#86A0DE')},uK:{value:1}};
  const FIELD=`attribute vec4 aF; uniform float uVT,uTime,uPx; uniform vec2 uMic,uOrb; ${VOICE_GLSL}
    void field(out float h,out float a,out float b){ vec2 p=aF.xy; a=vWave(p,uMic,0.,uVT); b=vWave(p,uOrb,1.,uVT);
      float idle=.028*sin(uTime*.6+aF.w*6.2832+p.x*.5)+.016*sin(uTime*1.1+p.y*.8+aF.w*3.);
      h=aF.z*(1.+.7*(a+b))+idle; }`;
  const stemM=new T.ShaderMaterial({uniforms:FU,...ADD,side:T.DoubleSide,
    vertexShader:`${FIELD} varying float vV,vA,vB;
      void main(){ float h,a,b; field(h,a,b); vec3 base=vec3(aF.x,0.,aF.y); vec3 toC=cameraPosition-base; vec3 r=normalize(vec3(toC.z,0.,-toC.x));
        float px=length(toC)/uPx; vec3 p=base+vec3(0.,position.y*h,0.)+r*position.x*max(.006,px*1.1);
        vV=position.y; vA=a; vB=b; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`,
    fragmentShader:`uniform vec3 uYou,uThem,uBase; uniform float uK; varying float vV,vA,vB;
      void main(){ vec3 c=uBase*.05*(.3+.7*vV)+(uYou*vA+uThem*vB)*.45*vV*vV; gl_FragColor=vec4(c*uK,1.); }`});
  const stems=new T.Mesh(inst([0,0,0, 1,0,0, 1,1,0, 0,0,0, 1,1,0, 0,1,0].map((v,i)=>i%3===0?v-.5:v)),stemM); stems.frustumCulled=false; stems.renderOrder=956; g.add(stems);
  const tipM=new T.ShaderMaterial({uniforms:FU,...ADD,
    vertexShader:`${FIELD} varying vec2 vQ; varying float vA,vB,vR;
      void main(){ float h,a,b; field(h,a,b); vec4 mv=viewMatrix*vec4(aF.x,h,aF.y,1.); float s=max(.026+.03*(a+b),-mv.z*2.2/uPx); mv.xy+=position.xy*s;
        vQ=position.xy; vA=a; vB=b; vR=aF.w; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uYou,uThem,uBase; uniform float uK; varying vec2 vQ; varying float vA,vB,vR;
      void main(){ float r=length(vQ); float k=(exp(-r*r*14.)+exp(-r*r*3.)*.3)*(1.-smoothstep(.8,1.,r));
        vec3 c=uBase*(.085+.05*vR)+uYou*vA*2.6+uThem*vB*2.6; gl_FragColor=vec4(c*k*uK,1.); }`});
  const tips=new T.Mesh(inst(QUAD),tipM); tips.frustumCulled=false; tips.renderOrder=957; g.add(tips);
  /* and the same rings drawn faintly on the floor, so you see each one go out across the room, through the gaps too */
  const ringM=new T.ShaderMaterial({uniforms:FU,...ADD,
    vertexShader:`varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uVT,uK; uniform vec2 uMic,uOrb; uniform vec3 uYou,uThem; varying vec2 vP; ${VOICE_GLSL}
      void main(){ float a=vWave(vP,uMic,0.,uVT), b=vWave(vP,uOrb,1.,uVT);
        float la=smoothstep(.42,.9,a)*a, lb=smoothstep(.42,.9,b)*b;
        vec2 e=min(vP-vec2(-5.9,${(zc-7.9).toFixed(2)}),vec2(5.9,${(zc+7.9).toFixed(2)})-vP); float edge=smoothstep(0.,.8,min(e.x,e.y));
        gl_FragColor=vec4((uYou*la+uThem*lb)*.62*edge*uK,1.); }`});
  const rings=new T.Mesh(new T.PlaneGeometry(11.8,15.8),ringM); rings.rotation.x=-Math.PI/2; rings.position.set(0,.007,zc); rings.renderOrder=8; g.add(rings);
  let t0=0, orbK=.4;
  return {g, spot, dbg:()=>({who:VOICE.who,u:+VOICE.phase.toFixed(2)}), update(dt,t,st){
    /* the call: you speak for a few seconds, a breath, then the buyer answers */
    t0+=dt; const turn=3.4, k=t0%(turn*2), who=k<turn?0:1, u=(k%turn)/turn;
    VOICE.who=who; VOICE.phase=u;
    const talk=sstep(0,.08,u)*(1-sstep(.78,.95,u));
    const syl=.55+.45*Math.abs(Math.sin(t0*6.2+who*2))*(.6+.4*Math.sin(t0*2.1+who));
    VOICE.env=talk*syl; VOICE.amp=damp(VOICE.amp,talk,8,dt);
    FU.uVT.value=t0; FU.uPx.value=G.px;
    const you=who===0?VOICE.env:0, them=who===1?VOICE.env:0;
    grill.emissiveIntensity=damp(grill.emissiveIntensity,.02+.55*you,14,dt);
    orbK=damp(orbK,.4+2.2*them,10,dt); orbM.color.copy(ORBC).multiplyScalar(1.2+orbK*1.6); halo.U.uK.value=.5+orbK; orbL.intensity=.5+3.2*orbK;
    thread.U.uPx.value=G.px;
    spot.intensity=270*(.93+.07*you);
  }};
}

/* ---------- Aetos: a skyspace full of drones. A radar sweeps the square of sky: friends are marked as it passes them, and
   one drone is picked out as the threat, locked, and taken out by the intercept. Then the sky is quiet for a while ---------- */
function buildAetos(W,zc,AP){
  const g=new T.Group(); W.scene.add(g);
  /* light hidden along the top of the walls washes the ceiling, so the sky reads as a flat colour (the Turrell trick) */
  [[-5.3,zc],[5.3,zc],[0,zc-7.2],[0,zc+7.2]].forEach(([x,z])=>{ const l=new T.PointLight('#FFF3E4',26,9,1.5); l.position.set(x,ROOM.H-.5,z); g.add(l); });
  const skyL=new T.SpotLight('#DCE6FA',120,0,.5,.9,2); skyL.position.set(0,ROOM.H+3,zc); skyL.target.position.set(0,0,zc); g.add(skyL); g.add(skyL.target);
  /* the sky's light pours down through the opening: a soft falling volume, and a pale square of it on the floor */
  const pourU={uCol:{value:col('#F4F0EA')},uSky:{value:new T.Color('#A9C3EC')},uTime:GU.uTime,uK:{value:1},uC:{value:v3(0,0,zc)},uA:{value:AP},uH:{value:ROOM.H}};
  const pourM=new T.ShaderMaterial({uniforms:pourU,...ADD,side:T.BackSide,
    vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol,uSky,uC; uniform float uTime,uK,uA,uH; varying vec3 vWP; ${GLSL.noise}
    float dens(vec3 p){ float spread=1.+(uH-p.y)*.055; vec2 q=abs(p.xz-uC.xz)/(uA*spread); float e=max(q.x,q.y);
      return (1.-smoothstep(.72,1.02,e))*smoothstep(0.,1.2,p.y)*(.35+.65*smoothstep(0.,uH,p.y))*step(p.y,uH); }
    void main(){ vec3 C=cameraPosition, rd=vWP-C; float tE=length(rd); rd/=tE; float seg=min(tE,9.), t0=tE-seg, dt=seg/6., acc=0.;
      for(int i=0;i<6;i++){ vec3 p=C+rd*(t0+(float(i)+.5)*dt); float d=dens(p); if(d>.001){ float n=vnoise(p.xz*.8+vec2(p.y*.35-uTime*.05,uTime*.03)); acc+=d*(.5+.8*n)*dt; } }
      gl_FragColor=vec4(mix(uSky,uCol,.55)*acc*.075*uK,1.); }`});
  const pour=new T.Mesh(boxGeo(-AP*1.45,AP*1.45,0,ROOM.H,zc-AP*1.45,zc+AP*1.45),pourM); pour.renderOrder=950; g.add(pour);
  const poolM=new T.ShaderMaterial({uniforms:pourU,...ADD,
    vertexShader:`varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol,uSky; uniform float uK,uA; varying vec2 vP; void main(){ vec2 q=abs(vP)/(uA*1.4); float e=max(q.x,q.y);
      float a=(1.-smoothstep(.62,1.,e))*(.7+.3*(1.-length(vP)/(uA*1.9))); gl_FragColor=vec4(mix(uSky,uCol,.6)*a*.36*uK,1.); }`});
  const poolL=new T.Mesh(new T.PlaneGeometry(AP*3.2,AP*3.2),poolM); poolL.rotation.x=-Math.PI/2; poolL.position.set(0,.004,zc); poolL.renderOrder=6; g.add(poolL);
  W.aetosPour=pourU;
  /* the patch of sky the opening shows: about 34 m up, some 21 m beyond the room's middle */
  const BZ=zc-21, CAM0=v3(0,1.38,-27.9), RC=CAM0.clone().addScaledVector(v3(0,ROOM.H,zc).sub(CAM0).normalize(),36);
  /* drones: six loiter in slow circles over the opening, six cross from one side of the sky to the other */
  const N=12, D=[]; const R=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(let i=0;i<N;i++){ const lo=i<6;
    D.push(Object.assign(lo?{kind:'loit',r:2.5+i*1.15+R()*.8,a0:R()*TAU,w:(.045+R()*.05)*(i%2?-1:1),y:27+R()*12,cx:(R()-.5)*3,cz:BZ+(R()-.5)*3}
      :{kind:'cross',ang:R()*TAU,sp:.016+R()*.018,ph:R(),off:(R()-.5)*14,y:25+R()*18},
      {p:v3(),yaw:0,a:1,fade:1,mk:0,ang:0,inR:9,role:'friend',drop:0,bl:R()*6,seen:0})); }
  const posOf=(d,t)=>{ if(d.kind==='loit'){ const a=d.a0+t*d.w; d.p.set(d.cx+Math.cos(a)*d.r,d.y+Math.sin(t*.3+d.a0)*.5,d.cz+Math.sin(a)*d.r); d.yaw=a*.6; }
    else { const dx=Math.cos(d.ang), dz=Math.sin(d.ang), u=((t*d.sp+d.ph)%1+1)%1; d.p.set(dx*(u-.5)*150-dz*d.off,d.y,BZ+dz*(u-.5)*150+dx*d.off); d.yaw=d.ang+.785; } };
  /* seen from below: a body, four arms in an X, four motors, and the blur of four rotors */
  const P=[], Q=[];
  const disc=(A,cx,cz,r,n)=>{ for(let i=0;i<n;i++){ const a0=i/n*TAU, a1=(i+1)/n*TAU; A.push(cx,0,cz, cx+Math.cos(a0)*r,0,cz+Math.sin(a0)*r, cx+Math.cos(a1)*r,0,cz+Math.sin(a1)*r); } };
  const bar=(A,ax,az,bx,bz,w)=>{ const dx=bx-ax, dz=bz-az, l=Math.hypot(dx,dz), nx=-dz/l*w, nz=dx/l*w; A.push(ax+nx,0,az+nz, bx+nx,0,bz+nz, bx-nx,0,bz-nz, ax+nx,0,az+nz, bx-nx,0,bz-nz, ax-nx,0,az-nz); };
  disc(P,0,0,.13,10); for(const [x,z] of [[.27,.27],[-.27,.27],[-.27,-.27],[.27,-.27]]){ bar(P,0,0,x,z,.026); disc(P,x,z,.05,10); disc(Q,x,z,.18,20); }
  const iP=new Float32Array(N*3), iY=new Float32Array(N), iA=new Float32Array(N);
  const aP=new T.InstancedBufferAttribute(iP,3), aY=new T.InstancedBufferAttribute(iY,1), aA=new T.InstancedBufferAttribute(iA,1);
  [aP,aY,aA].forEach(a=>a.setUsage(T.DynamicDrawUsage));
  const mkG=A=>{ const ig=new T.InstancedBufferGeometry(); ig.setAttribute('position',new T.Float32BufferAttribute(A,3)); ig.setAttribute('aP',aP); ig.setAttribute('aY',aY); ig.setAttribute('aA',aA);
    ig.instanceCount=N; ig.boundingSphere=new T.Sphere(v3(0,30,BZ),1e4); return ig; };
  const DV=`attribute vec3 aP; attribute float aY,aA; varying float vA;
    void main(){ vec3 p=position*1.25; float c=cos(aY), s=sin(aY); p=vec3(p.x*c-p.z*s,0.,p.x*s+p.z*c); vA=aA; gl_Position=projectionMatrix*viewMatrix*vec4(aP+p,1.); }`;
  const silM=k=>new T.ShaderMaterial({uniforms:{uCol:{value:col('#2E2A28')}},transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:DV,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ gl_FragColor=vec4(uCol,vA*${k}); }`});
  const rotors=new T.Mesh(mkG(Q),silM('.24')), frames=new T.Mesh(mkG(P),silM('1.')); [rotors,frames].forEach((m,i)=>{ m.frustumCulled=false; m.renderOrder=910+i; g.add(m); });
  /* their lights: a slow white blink on each friend, steady amber on the threat */
  const LP=new Float32Array(N*3), LC=new Float32Array(N*4);
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.BufferAttribute(LP,3)); lg.setAttribute('aC',new T.BufferAttribute(LC,4)); lg.boundingSphere=new T.Sphere(v3(0,30,BZ),1e4);
  const LUu={uPx:{value:600}};
  const lights=new T.Points(lg,new T.ShaderMaterial({uniforms:LUu,...ADD,
    vertexShader:`attribute vec4 aC; uniform float uPx; varying vec4 vC; void main(){ vC=aC; vec4 mv=viewMatrix*vec4(position,1.); gl_PointSize=aC.a>.01?clamp(.3*uPx/-mv.z,2.,9.):0.; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`varying vec4 vC; void main(){ float d=length(gl_PointCoord-.5); float k=smoothstep(.5,0.,d); gl_FragColor=vec4(vC.rgb*k*k*vC.a*2.4,1.); }`}));
  lights.frustumCulled=false; lights.renderOrder=913; g.add(lights);
  /* the radar: rings, a cross and a turning sweep, a faint drawing of light across the square of sky */
  const RU={uA:{value:0},uK:{value:1},uCol:{value:col('#F8F2E8')}};
  const radar=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:RU,...ADD,side:T.DoubleSide,
    vertexShader:`varying vec2 vQ; void main(){ vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uA,uK; uniform vec3 uCol; varying vec2 vQ;
      void main(){ float r=length(vQ), a=atan(vQ.y,vQ.x), da=mod(uA-a,6.2831853), fw=fwidth(r)*1.5;
        float trail=exp(-da*1.7)*smoothstep(0.,.02,da)*.13*smoothstep(.04,.2,r);
        float dl=abs(sin(a-uA))*r; float lead=(1.-smoothstep(0.,fw*1.6,dl))*step(0.,cos(a-uA))*.42*smoothstep(.02,.1,r);
        float rings=0.; for(int i=1;i<=4;i++){ rings+=1.-smoothstep(0.,fw,abs(r-float(i)*.25)); }
        float cr=(1.-smoothstep(0.,fw,abs(vQ.x)))+(1.-smoothstep(0.,fw,abs(vQ.y)));
        float k=(trail+lead+rings*.05+cr*.022)*(1.-smoothstep(.96,1.,r));
        gl_FragColor=vec4(uCol*k*uK,1.); }`}));
  radar.position.copy(RC); radar.scale.setScalar(12.5); radar.renderOrder=905; g.add(radar);
  /* the marks: four corners on a friend as the sweep finds it, a turning broken ring on the threat, a closed ring when locked */
  const MP=new Float32Array(N*3), MM=new Float32Array(N*4), aMP=new T.InstancedBufferAttribute(MP,3), aMM=new T.InstancedBufferAttribute(MM,4);
  [aMP,aMM].forEach(a=>a.setUsage(T.DynamicDrawUsage));
  const mg=new T.InstancedBufferGeometry(); mg.setAttribute('position',new T.Float32BufferAttribute(QUAD,3)); mg.setAttribute('aP',aMP); mg.setAttribute('aM',aMM); mg.instanceCount=N; mg.boundingSphere=new T.Sphere(v3(0,30,BZ),1e4);
  const MU={uPx:{value:600},uFr:{value:col('#FFFCF4')},uTh:{value:col('#FFB06A')}};
  const marks=new T.Mesh(mg,new T.ShaderMaterial({uniforms:MU,...ADD,
    vertexShader:`attribute vec3 aP; attribute vec4 aM; uniform float uPx; varying vec2 vQ; varying vec4 vM;
      void main(){ vec4 mv=viewMatrix*vec4(aP,1.); float s=aM.z*(-mv.z)*24./uPx; mv.xy+=position.xy*s; vQ=position.xy; vM=aM; gl_Position=aM.y>.002?projectionMatrix*mv:vec4(2.,2.,2.,1.); }`,
    fragmentShader:`uniform vec3 uFr,uTh; varying vec2 vQ; varying vec4 vM;
      float band(float x,float a,float b,float fw){ return smoothstep(a-fw,a,x)*(1.-smoothstep(b,b+fw,x)); }
      void main(){ float r=length(vQ), fw=fwidth(r)*1.2; vec2 b=abs(vQ); float m=max(b.x,b.y), fm=fwidth(m)*1.2; float a=0.; vec3 c=uFr;
        if(vM.x<.5){ a=band(m,.84,.9,fm)*smoothstep(.5,.56,min(b.x,b.y))*.8; }
        else if(vM.x<1.5){ float an=atan(vQ.y,vQ.x)+vM.w; a=band(r,.8,.87,fw)*smoothstep(.2,.32,abs(sin(an*2.))); a+=band(b.x,.58,.76,fw)*step(b.y,.022)+band(b.y,.58,.76,fw)*step(b.x,.022); c=uTh; }
        else { a=band(r,.46,.53,fw)*1.2+smoothstep(.1,.05,r); a+=band(b.x,.6,.92,fw)*step(b.y,.026)+band(b.y,.6,.92,fw)*step(b.x,.026); c=uTh*1.25; }
        gl_FragColor=vec4(c*a*vM.y,1.); }`}));
  marks.frustumCulled=false; marks.renderOrder=999; g.add(marks);
  /* the intercept, drawn from the edge of the opening up to the threat, and the flash where it meets it */
  const shot=lightLine('#FFD3A4',2.4); shot.mesh.renderOrder=998; g.add(shot.mesh); shot.U.uA.value.set(AP*.55,ROOM.H+.05,zc+AP*.98);
  const flash=glowSprite('#FFE2C0',1); flash.mesh.renderOrder=997; flash.U.uK.value=0; g.add(flash.mesh);
  const TH={i:-1,st:'pick',t:0,hits:0}, _l=v3();
  let tb=0, sweep=0;
  const pickThreat=()=>{ let best=-1, bd=9; D.forEach((d,i)=>{ if(d.kind==='loit'&&d.role==='friend'&&d.fade>.99&&d.inR<bd&&d.inR<.62){ bd=d.inR; best=i; } }); return best; };
  return {g, dbg:()=>({st:TH.st,t:+TH.t.toFixed(2)}), update(dt,t,st){
    tb+=dt; const px=G.px; LUu.uPx.value=MU.uPx.value=shot.U.uPx.value=px;
    radar.lookAt(CAM.gal.position); radar.updateMatrixWorld();
    const sp=TAU/3.2, s0=sweep; sweep=(sweep+dt*sp)%TAU; RU.uA.value=sweep;
    const passed=a=>{ const d0=((a-s0)%TAU+TAU)%TAU, d1=((sweep-s0)%TAU+TAU)%TAU; return d0<=d1&&d1<Math.PI; };
    if(sweep<s0) rsnd('ae-sweep',0,.6);
    for(let i=0;i<N;i++){ const d=D[i]; posOf(d,tb);
      if(d.role==='down'){ d.drop+=dt; d.p.y-=3.2*d.drop*d.drop; d.fade=Math.max(0,1-d.drop/2.2); }
      else if(d.fade<1) d.fade=Math.min(1,d.fade+dt*.7);
      _l.copy(d.p); radar.worldToLocal(_l); d.inR=Math.hypot(_l.x,_l.y); d.ang=Math.atan2(_l.y,_l.x);
      if(d.fade>.5&&d.inR<.98&&passed(d.ang)){ d.seen=1; if(i===TH.i&&TH.st==='search'){ TH.hits++; } }
      d.seen=Math.max(0,d.seen-dt*.42);
      iP.set([d.p.x,d.p.y,d.p.z],i*3); iY[i]=d.yaw; iA[i]=d.fade;
      LP.set([d.p.x,d.p.y-.02,d.p.z],i*3);
      const blink=Math.pow(Math.max(0,Math.sin(tb*2.1+d.bl)),24);
      if(d.role==='threat'&&TH.st!=='search') LC.set([1,.62,.3,.85*d.fade],i*4); else if(d.role==='down') LC.set([1,.62,.3,0],i*4); else LC.set([1,.98,.92,(.25+.75*blink)*d.fade],i*4);
      MP.set([d.p.x,d.p.y,d.p.z],i*3);
      if(i===TH.i&&TH.st!=='search'&&TH.st!=='clear') MM.set([TH.st==='id'?1:2,d.fade*(TH.st==='down'?Math.max(0,1-TH.t*1.6):1),TH.st==='id'?1.15:lerp(1.15,.85,Math.min(1,TH.t*2.5)),tb*.9],i*4);
      else MM.set([0,d.seen*d.fade,.82,0],i*4); }
    /* the threat: found by the sweep, picked out, locked, then the intercept goes up to it */
    TH.t+=dt; const th=D[TH.i];
    if(TH.st==='pick'){ const k=pickThreat(); if(k>=0){ TH.i=k; D[k].role='threat'; TH.st='search'; TH.t=0; TH.hits=0; } }
    else if(TH.st==='search'){ if(TH.hits>=2&&TH.t>2){ TH.st='id'; TH.t=0; rsnd('ae-id',th.p.x*.04); } }
    else if(TH.st==='id'){ if(TH.t>1.7){ TH.st='lock'; TH.t=0; rsnd('ae-lock',th.p.x*.04); } }
    else if(TH.st==='lock'){ shot.U.uB.value.copy(th.p); shot.U.uDraw.value=E.o(Math.min(1,TH.t/.95)); shot.U.uK.value=1;
      if(TH.t>1){ TH.st='down'; TH.t=0; th.role='down'; th.drop=0; flash.mesh.position.copy(th.p); flash.U.uK.value=2.2; rsnd('ae-hit',th.p.x*.04); } }
    else if(TH.st==='down'){ shot.U.uK.value=Math.max(0,1-TH.t*1.4); shot.U.uB.value.copy(th.p); if(TH.t>2.4){ TH.st='clear'; TH.t=0; } }
    else if(TH.st==='clear'){ if(TH.t>3){ th.role='friend'; th.drop=0; th.fade=0; th.a0+=Math.PI*.7; TH.st='pick'; TH.t=0; TH.i=-1; } }
    if(TH.st!=='lock'&&TH.st!=='down') shot.U.uK.value=0;
    flash.U.uK.value=Math.max(0,flash.U.uK.value-dt*2.6); flash.U.uS.value=(1+(2.2-flash.U.uK.value)*1.4)*flash.mesh.position.distanceTo(CAM.gal.position)*.012;
    aP.needsUpdate=aY.needsUpdate=aA.needsUpdate=aMP.needsUpdate=aMM.needsUpdate=true; lg.attributes.position.needsUpdate=lg.attributes.aC.needsUpdate=true;
  }};
}

/* ---------- Pharos: a drone in a dark room with nothing to go by. Its camera lights a square of the floor, and the floor is a
   map; a second square, where it thinks it is, slides over to match what it sees and locks on. Over open water there is
   nothing to match, and it says so: the square loosens and its circle of doubt opens up ---------- */
const PH_LAKE=[1.35,roomZ(2)-2.15,1.05,.95];   // the open water on the map: x, z and its two radii (the floor's shader draws it too)
function droneModel(){
  const g=new T.Group(), parts=[];
  const shell=new T.MeshStandardMaterial({color:'#ECE6DC',roughness:.38,metalness:.04});
  const dark=new T.MeshStandardMaterial({color:'#3B3633',roughness:.5,metalness:.25});
  const body=new T.Mesh(new T.SphereGeometry(.15,32,18),shell); body.scale.set(1.1,.42,1.45);
  const top=new T.Mesh(new T.SphereGeometry(.09,24,14),shell); top.scale.set(1,.5,1.3); top.position.set(0,.04,-.03);
  g.add(body,top); parts.push(body,top);
  const RA=.33, armG=new T.CylinderGeometry(.014,.019,RA,10); armG.rotateZ(Math.PI/2); armG.translate(RA/2,0,0);
  const rotM=new T.ShaderMaterial({uniforms:{uTime:GU.uTime},transparent:true,depthWrite:false,side:T.DoubleSide,
    vertexShader:`varying vec2 vQ; void main(){ vQ=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uTime; varying vec2 vQ; void main(){ float r=length(vQ)/.17, a=atan(vQ.y,vQ.x);
      float bl=pow(.5+.5*cos(a*2.-uTime*23.),6.)*.5+.5; float d=smoothstep(1.,.93,r)*smoothstep(.16,.24,r);
      gl_FragColor=vec4(vec3(.84,.79,.73),d*(.07+.17*bl*(1.-r*.5))); }`});
  for(let i=0;i<4;i++){ const a=Math.PI/4+i*Math.PI/2, x=Math.cos(a)*RA, z=Math.sin(a)*RA;
    const arm=new T.Mesh(armG,shell); arm.rotation.y=-a;
    const pod=new T.Mesh(new T.CylinderGeometry(.026,.03,.05,16),dark); pod.position.set(x,.01,z);
    const rot=new T.Mesh(new T.CircleGeometry(.17,40),rotM); rot.rotation.x=-Math.PI/2; rot.position.set(x,.045,z); rot.renderOrder=961;
    g.add(arm,pod,rot); parts.push(arm,pod); }
  const gim=new T.Mesh(new T.SphereGeometry(.042,20,14),dark); gim.position.set(0,-.075,.11);
  const lensM=new T.MeshBasicMaterial({color:new T.Color('#FFD5B3').multiplyScalar(3)});
  const lens=new T.Mesh(new T.CircleGeometry(.019,20),lensM); lens.rotation.x=Math.PI/2; lens.position.set(0,-.118,.11);
  g.add(gim,lens); parts.push(gim);
  for(const sx of [-1,1]){ const leg=new T.Mesh(new T.CylinderGeometry(.006,.006,.12,6),shell); leg.position.set(sx*.09,-.1,0); leg.rotation.z=sx*.25;
    const skid=new T.Mesh(new T.CylinderGeometry(.006,.006,.26,6),shell); skid.rotation.x=Math.PI/2; skid.position.set(sx*.115,-.155,0); g.add(leg,skid); parts.push(leg,skid); }
  parts.forEach(m=>{ m.castShadow=true; m.receiveShadow=true; });
  g.rotation.order='YXZ';
  return {g,lensM};
}
function buildPharos(W,zc){
  const g=new T.Group(); W.scene.add(g);
  const C=col('#FFD5B3'), CAMY=2.55, TANF=.46, HF=CAMY*TANF;   // the drone camera's height over the floor, and the half-width of the square it sees
  const dr=droneModel(); dr.g.scale.setScalar(1.05); g.add(dr.g);
  /* a little light of its own, so it can be seen in the dark, and the glow of what it sees thrown back up */
  const fill=new T.PointLight('#FFE6D2',2.4,4.5,1.6); g.add(fill);
  const under=new T.PointLight(C,3.4,5,1.4); g.add(under);
  /* what its camera sees: a square cone of light from the lens down to the floor, marched through drifting haze */
  const VU={uS:{value:v3()},uYaw:{value:0},uTan:{value:TANF},uBC:{value:v3()},uBH:{value:v3(HF+.35,CAMY/2+.06,HF+.35)},uCol:{value:C},uTime:GU.uTime,uK:{value:.38},uPx:{value:600}};
  const DENS=`uniform vec3 uS,uBC,uBH,uCol; uniform float uYaw,uTan,uTime,uK;
    float dens(vec3 p){ vec3 q=p-uS; float a=-q.y, c=cos(uYaw), s=sin(uYaw); vec2 l=vec2(q.x*c-q.z*s,q.x*s+q.z*c);
      float e=max(abs(l.x),abs(l.y))/(max(a,0.)*uTan+.012); return (1.-smoothstep(.8,1.,e))*smoothstep(0.,.3,a)*smoothstep(-.02,.25,p.y)/(1.+a*.22); }`;
  const volM=new T.ShaderMaterial({uniforms:VU,...ADD,side:T.BackSide,
    vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 vWP; ${GLSL.noise}${DENS}
      void main(){ vec3 ro=cameraPosition, rd=normalize(vWP-ro); float c=cos(uYaw), s=sin(uYaw);
        vec3 o=ro-uBC, lo=vec3(o.x*c-o.z*s,o.y,o.x*s+o.z*c), ld=vec3(rd.x*c-rd.z*s,rd.y,rd.x*s+rd.z*c);
        ld=sign(ld)*max(abs(ld),vec3(1e-5)); vec3 m=1./ld, n=m*lo, k=abs(m)*uBH, t1=-n-k, t2=-n+k;
        float tN=max(max(max(t1.x,t1.y),t1.z),0.), tF=min(min(t2.x,t2.y),t2.z);
        if(tF<=tN){ gl_FragColor=vec4(0.,0.,0.,1.); return; }
        float dt=(tF-tN)/10., acc=0.;
        for(int i=0;i<10;i++){ vec3 p=ro+rd*(tN+(float(i)+.5)*dt); float d=dens(p);
          if(d>.001){ float nz=vnoise3(p*vec3(1.6,2.2,1.6)+vec3(uTime*.05,uTime*.02,-uTime*.04)); acc+=d*(.35+1.2*nz*nz)*dt; } }
        gl_FragColor=vec4(uCol*acc*uK,1.); }`});
  const vol=new T.Mesh(new T.BoxGeometry(2,2,2),volM); vol.renderOrder=950; vol.frustumCulled=false; g.add(vol);
  /* dust that only shows where it is looking */
  const DN=MOBILE?360:720, dg=new T.BufferGeometry(), drr=new Float32Array(DN*4); for(let i=0;i<drr.length;i++) drr[i]=Math.random();
  dg.setAttribute('position',new T.BufferAttribute(new Float32Array(DN*3),3)); dg.setAttribute('aR',new T.BufferAttribute(drr,4)); dg.boundingSphere=new T.Sphere(v3(),1e5);
  const dust=new T.Points(dg,new T.ShaderMaterial({uniforms:VU,...ADD,
    vertexShader:`attribute vec4 aR; uniform float uPx; varying float vA; ${DENS}
      void main(){ vec3 p=vec3((aR.x-.5)*7.4,.08+aR.y*2.5,${zc.toFixed(2)}+(aR.z-.5)*8.4);
        p+=vec3(sin(uTime*.071+aR.w*31.),sin(uTime*.049+aR.x*23.)*.5,cos(uTime*.063+aR.y*27.))*.5;
        vA=dens(p)*(.35+.65*aR.w); vec4 mv=viewMatrix*vec4(p,1.); gl_PointSize=clamp(.03*uPx/max(-mv.z,.2),1.,6.); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uCol*a*a*vA*2.,1.); }`}));
  dust.frustumCulled=false; dust.renderOrder=955; g.add(dust);
  const U=W.U, p=v3(), pv=v3(), M2={x:0,z:zc}, wob={x:0,z:0};
  const lakeAt=(x,z)=>Math.hypot((x-PH_LAKE[0])/PH_LAKE[2],(z-PH_LAKE[1])/PH_LAKE[3])<1?1:0;
  /* one slow loop round the room every 24 s, a little uneven, and over the open water once each time round */
  const pos=(tt,o)=>{ const a=tt*TAU/24+.9; return o.set(.35+1.7*Math.cos(a)+.22*Math.sin(a*2.3),CAMY+.12+.05*Math.sin(tt*.9),zc-.4+1.95*Math.sin(a)+.18*Math.cos(a*1.7)); };
  let yaw=0, doubt=.6, lock=0, locked=false, tp=0, first=true;
  let wetK=0;
  return {g, get lock(){ return lock; }, dbg:()=>({lock:+lock.toFixed(2),wet:+wetK.toFixed(2),doubt:+doubt.toFixed(2)}), update(dt,t,st){
    tp+=dt; pos(tp,p); pos(tp+.4,pv);
    const vx=(pv.x-p.x)/.4, vz=(pv.z-p.z)/.4, sp=Math.hypot(vx,vz), want=Math.atan2(vx,vz);
    let dy=((want-yaw+Math.PI)%TAU+TAU)%TAU-Math.PI; yaw+=first?dy:dy*(1-Math.exp(-dt*.9)); first=false;
    const fw=vx*Math.sin(yaw)+vz*Math.cos(yaw), side=vx*Math.cos(yaw)-vz*Math.sin(yaw);
    dr.g.position.copy(p); dr.g.rotation.set(fw*.32,yaw,-side*.32);
    fill.position.set(p.x+.5,p.y+.6,p.z+.6); under.position.set(p.x,.9,p.z);
    const S0=VU.uS.value.set(p.x,p.y-.12,p.z); VU.uYaw.value=yaw; VU.uBC.value.set(p.x,(S0.y)/2,p.z); VU.uBH.value.y=S0.y/2+.04; VU.uPx.value=G.px;
    vol.position.copy(VU.uBC.value); vol.rotation.y=yaw; vol.scale.copy(VU.uBH.value);
    /* how much of what it sees is open water: nine points across the square */
    const hf=S0.y*TANF; let wet=0; for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) wet+=lakeAt(p.x+i*hf*.66,p.z+j*hf*.66); wet/=9;
    const conf=1-sstep(.12,.55,wet); wetK=wet;
    /* where it thinks it is: pulled to the truth while there is map to match, wandering off while there is only water */
    wob.x=damp(wob.x,Math.sin(tp*.7)*.9+Math.sin(tp*1.9)*.3,1.5,dt); wob.z=damp(wob.z,Math.cos(tp*.6)*.8,1.5,dt);
    /* (it keeps moving with the drone, as its own motion says, so a confident fix does not trail behind) */
    M2.x=damp(M2.x+vx*dt,p.x+wob.x*(1-conf)*1.3,.6+3*conf,dt); M2.z=damp(M2.z+vz*dt,p.z+wob.z*(1-conf)*1.3,.6+3*conf,dt);
    const off=Math.hypot(M2.x-p.x,M2.z-p.z);
    doubt=damp(doubt,.16+1.45*(1-conf)+off*.9,2.2,dt);
    const tight=conf>.85&&off<.09; lock=damp(lock,tight?1:0,tight?2.6:5,dt);
    if(lock>.8&&!locked){ locked=true; rsnd('ph-lock',p.x*.08); } if(lock<.25) locked=false;
    U.uPhD.value.set(p.x,p.z,yaw,hf); U.uPhM.value.set(M2.x,M2.z,doubt,lock);
    dr.lensM.color.copy(C).multiplyScalar(2.4+1.6*lock);
  }};
}

/* ---------- Ogive: say how high, and the design is worked until the rocket gets there. A hoop of light hangs in the shaft at
   the height asked for. The rocket on the pad changes shape, one design at a time, and a bead of light shows how high each
   would go: short, over, closer, there. Then it flies: up to the hoop and no higher, and back down on its chute ---------- */
function buildOgive(W,zc,OR){
  const g=new T.Group(); W.scene.add(g);
  const shaftL=new T.SpotLight('#FFB475',9000,0,.052,.55,2); shaftL.position.set(0,44,zc); shaftL.target.position.set(0,0,zc); g.add(shaftL); g.add(shaftL.target);
  shaftL.castShadow=true; shaftL.shadow.mapSize.set(512,512); shaftL.shadow.camera.near=30; shaftL.shadow.camera.far=48; shaftL.shadow.bias=-.0008;
  const glowL=new T.PointLight('#FFB475',20,10,1.4); glowL.position.set(0,.6,zc); g.add(glowL);
  const colM=new T.ShaderMaterial({uniforms:{uCol:{value:col('#FFC48C')},uTime:GU.uTime,uK:{value:1}},...ADD,side:T.DoubleSide,
    vertexShader:`varying vec3 vWP; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uTime,uK; varying vec3 vWP; varying vec3 vN; ${GLSL.noise}
    void main(){ vec3 V=normalize(cameraPosition-vWP); float e=abs(dot(normalize(vN),V));
      float n=.55+.45*vnoise(vec2(atan(vWP.x,vWP.z-(${zc.toFixed(2)}))*3.,vWP.y*.6-uTime*.5));
      float a=pow(e,2.)*n*(.55+.45*smoothstep(0.,6.,vWP.y))*smoothstep(0.,.4,vWP.y);
      gl_FragColor=vec4(uCol*a*.1*uK,1.); }`});
  const column=new T.Mesh(new T.CylinderGeometry(OR*.97,OR*.97,44,64,1,true),colM); column.position.set(0,22,zc); g.add(column); W.ogColumn=column;
  /* the rocket, in parts made at unit size and stretched to each design: a boat tail, the body, a tangent ogive nose, four fins */
  const Rr=.12;
  const tail=new T.LatheGeometry([[0,0],[.07,0],[.085,.07],[.1,.14],[Rr,.26]].map(q=>new T.Vector2(q[0],q[1])),48);
  const tube=new T.CylinderGeometry(Rr,Rr,1,48,1,true); tube.translate(0,.5,0);
  /* the nose, measured from its base: full radius where it meets the body, tangent to it, closing to a point at the tip */
  const rho=(Rr*Rr+1)/(2*Rr), noseP=[]; for(let i=0;i<=32;i++){ const x=i/32; noseP.push(new T.Vector2(Math.max(0,Math.sqrt(rho*rho-x*x)+Rr-rho),x)); }
  const nose=new T.LatheGeometry(noseP,48);
  const rkM=new T.MeshStandardMaterial({color:'#F4EFE7',roughness:.4,metalness:0,emissive:new T.Color('#FFB475'),emissiveIntensity:.05});
  const finM=new T.MeshStandardMaterial({color:'#E9E2D8',roughness:.4});
  const bandM=new T.MeshStandardMaterial({color:'#FFB475',roughness:.5,emissive:new T.Color('#FFB475'),emissiveIntensity:.15});
  const rocket=new T.Group(); rocket.position.set(0,.02,zc); g.add(rocket);
  const mTail=new T.Mesh(tail,rkM), mTube=new T.Mesh(tube,rkM), mNose=new T.Mesh(nose,rkM); mTube.position.y=.26;
  const finS=new T.Shape(); finS.moveTo(0,0); finS.lineTo(1,-.1); finS.lineTo(1,.26); finS.lineTo(0,1); finS.lineTo(0,0);
  const finG=new T.ExtrudeGeometry(finS,{depth:.012,bevelEnabled:false}); finG.translate(0,0,-.006);
  const fins=[]; for(let i=0;i<4;i++){ const pv=new T.Group(); pv.rotation.y=i*Math.PI/2+.4; pv.position.y=.2; const f=new T.Mesh(finG,finM); f.position.x=Rr-.01; f.castShadow=true; pv.add(f); rocket.add(pv); fins.push(f); }
  const band=new T.Mesh(new T.CylinderGeometry(Rr+.002,Rr+.002,.06,48,1,true),bandM);
  rocket.add(mTail,mTube,mNose,band); [mTail,mTube,mNose].forEach(m=>{ m.castShadow=true; });
  const cur={Lb:2.05,Ln:.78,Fs:.3,Fc:.62};
  const shape=d=>{ mTube.scale.y=d.Lb; mNose.position.y=.26+d.Lb; mNose.scale.y=d.Ln; band.position.y=.26+d.Lb*.72; fins.forEach(f=>f.scale.set(d.Fs,d.Fc,1)); return .26+d.Lb+d.Ln; };
  /* the flame: a short bright cone under the nozzle, and its glow */
  const flG=new T.CylinderGeometry(.078,.006,.62,24,8,true); flG.translate(0,-.31,0);
  const flU={uTime:GU.uTime,uK:{value:0}};
  const flame=new T.Mesh(flG,new T.ShaderMaterial({uniforms:flU,...ADD,side:T.DoubleSide,
    vertexShader:`uniform float uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 p=position; vY=clamp(-p.y/.62,0.,1.); p.xz*=1.+.16*sin(uTime*31.+p.y*20.)*vY; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uK,uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),V));
      vec3 c=mix(vec3(1.,.96,.84),vec3(1.,.56,.24),vY); float a=pow(f,1.4)*(1.-vY*.85)*(.85+.15*sin(uTime*47.)); gl_FragColor=vec4(c*a*uK*2.4,1.); }`}));
  rocket.add(flame);
  const nz=glowSprite('#FFD2A0',.42); nz.mesh.position.y=-.04; nz.U.uK.value=0; nz.mesh.renderOrder=962; rocket.add(nz.mesh);
  const rkL=new T.PointLight('#FFC892',7,6,1.6); rkL.position.set(.9,1.6,1.6); rocket.add(rkL);
  /* the chute: a pale canopy on eight lines, folded away until the top */
  const chute=new T.Group(); rocket.add(chute); chute.visible=false;
  const canopy=new T.Mesh(new T.SphereGeometry(.36,32,10,0,TAU,0,Math.PI*.42),new T.MeshStandardMaterial({color:'#FBF0E4',roughness:.85,side:T.DoubleSide,emissive:new T.Color('#FFB475'),emissiveIntensity:.08}));
  canopy.position.y=.62; chute.add(canopy);
  const lp=[]; for(let i=0;i<8;i++){ const a=i/8*TAU; lp.push(0,0,0, Math.cos(a)*.35,.62+.36*Math.cos(Math.PI*.42),Math.sin(a)*.35); }
  const lgeo=new T.BufferGeometry(); lgeo.setAttribute('position',new T.Float32BufferAttribute(lp,3));
  chute.add(new T.LineSegments(lgeo,new T.LineBasicMaterial({color:'#D9C9B6',transparent:true,opacity:.7})));
  /* the height asked for: a hoop of light in the shaft */
  const HY=5.7, hoopU={uK:{value:.5},uCol:{value:col('#FFC690')}};
  const hoop=new T.Mesh(new T.TorusGeometry(.42,.013,10,120),new T.ShaderMaterial({uniforms:hoopU,...ADD,
    vertexShader:`void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; void main(){ gl_FragColor=vec4(uCol*uK*1.7,1.); }`}));
  hoop.rotation.x=Math.PI/2; hoop.position.set(0,HY,zc); hoop.renderOrder=963; g.add(hoop);
  const hoopG=glowSprite('#FFC690',.9); hoopG.mesh.position.set(0,HY,zc); hoopG.mesh.renderOrder=962; g.add(hoopG.mesh);
  /* how high this design would go: a bead of light thrown up from the nose, and the line it leaves */
  const bead=glowSprite('#FFE6C6',.16); bead.U.uK.value=0; bead.mesh.renderOrder=964; g.add(bead.mesh);
  const trace=lightLine('#FFD7AE',1.6); trace.U.uDash.value=.12; trace.mesh.renderOrder=963; g.add(trace.mesh);
  /* dust rising in the column */
  const DN=MOBILE?160:320, dg=new T.BufferGeometry(), dr=new Float32Array(DN*4); for(let i=0;i<dr.length;i++) dr[i]=Math.random();
  dg.setAttribute('position',new T.BufferAttribute(new Float32Array(DN*3),3)); dg.setAttribute('aR',new T.BufferAttribute(dr,4)); dg.boundingSphere=new T.Sphere(v3(),1e5);
  const dm=new T.ShaderMaterial({uniforms:{uTime:GU.uTime,uC:{value:v3(0,0,zc)},uPx:{value:600},uCol:{value:col('#FFD2A4')}},...ADD,
    vertexShader:`attribute vec4 aR; uniform float uTime,uPx; uniform vec3 uC; varying float vA; void main(){
      float r=sqrt(aR.x)*${(OR*.95).toFixed(2)}, a=aR.y*6.283+uTime*.05*(aR.z-.5); float y=mod(aR.z*16.+uTime*(.12+aR.w*.18),16.);
      vec3 p=uC+vec3(cos(a)*r,y,sin(a)*r); vec4 mv=viewMatrix*vec4(p,1.); gl_PointSize=clamp(.05*uPx/-mv.z*(.5+aR.w),1.,12.);
      vA=smoothstep(0.,1.5,y)*smoothstep(16.,11.,y)*(.4+.6*aR.w); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uCol*a*a*vA*.9,1.); }`});
  const dust=new T.Points(dg,dm); dust.frustumCulled=false; g.add(dust);
  W.ogiveDust=dm;
  /* the designs it tries, and how high each would go */
  const DES=[{Lb:1.6,Ln:.5,Fs:.2,Fc:.46},{Lb:2.32,Ln:1.04,Fs:.4,Fc:.74},{Lb:1.88,Ln:.68,Fs:.26,Fc:.56},{Lb:2.05,Ln:.8,Fs:.3,Fc:.62}];
  const PRED=[4.35,6.75,5.2,HY];
  const IT=2.1, T_FLY=IT*4+.7, T_TOP=T_FLY+2.2, T_LAND=T_TOP+3.6, LOOP=T_LAND+1.8;
  let lt=0, from={...DES[3]}, top=shape(cur), alt=0, beat=-1, said=-1, leave=0;
  const setFrom=()=>{ Object.assign(from,cur); };
  return {g, rocket, dbg:()=>({lt:+lt.toFixed(2)}), update(dt,t,st){
    const s=S.s;
    /* the next room brightens as you come to it, so Pharos keeps its dark */
    const lk=lerp(.45,1,sstep(3.3,3.85,s)); shaftL.intensity=9000*lk; glowL.intensity=20*lk; W.roomLights[3].intensity=5*lk;
    dm.uniforms.uPx.value=G.px; trace.U.uPx.value=G.px;
    lt+=dt; if(lt>=LOOP){ lt-=LOOP; beat=-1; said=-1; setFrom(); }
    let flameK=0, chuteK=0, beadK=0, beadY=0, hoopK=.42;
    if(lt<T_FLY-.7){
      /* one design at a time: the rocket changes shape, then the bead goes up to where that design would get */
      const i=Math.min(3,Math.floor(lt/IT)), u=(lt-i*IT)/IT;
      if(i!==beat){ beat=i; setFrom(); rsnd('og-tick',.1); }
      const m=E.io(clamp(u/.26,0,1)), d=DES[i]; for(const k in cur) cur[k]=lerp(from[k],d[k],m);
      top=shape(cur); alt=0;
      const r=clamp((u-.3)/.38,0,1), y=lerp(top+.05,PRED[i],E.o(r));
      beadK=r>0?(u<.86?1:1-(u-.86)/.14):0; beadY=y;
      if(r>=1&&said!==i){ said=i; rsnd('og-pred',0,(PRED[i]-HY)/2); }
      if(r>=1) hoopK=i===3?1.4:.42+.25*Math.max(0,Math.sin((u-.68)*40.))*(1-(u-.68)/.32);
      if(i===3&&u>.66) hoopK=1.4;
    } else if(lt<T_FLY){ hoopK=1.4; beadK=Math.max(0,1-(lt-(T_FLY-.7))/.5); beadY=HY; }
    else if(lt<T_TOP){
      /* the flight: hard off the pad, burning out, coasting up to the hoop and stopping there */
      const u=(lt-T_FLY)/(T_TOP-T_FLY); if(beat<9){ beat=9; rsnd('og-launch'); }
      alt=(HY-top)*(1-Math.pow(1-u,2.2)); flameK=1-sstep(.38,.62,u); hoopK=1.4+.6*sstep(.9,1,u);
    } else if(lt<T_LAND){
      /* the chute opens at the top, and it comes back down to the pad */
      const u=(lt-T_TOP)/(T_LAND-T_TOP); if(beat<10){ beat=10; rsnd('og-chute'); }
      alt=(HY-top)*(1-sstep(.08,1,u)); chuteK=Math.min(1,u*9)*(1-sstep(.93,1,u)); hoopK=lerp(2,.42,sstep(0,.4,u));
      if(u>.985&&beat===10){ beat=11; rsnd('og-land'); }
    } else { alt=0; hoopK=.42; }
    /* walking on, out of the room: it goes, straight up the shaft and away */
    leave=damp(leave,s>4.02?1:0,s>4.02?.9:6,dt);
    const lv=Math.pow(Math.max(0,s-4)/.5,2.2)*30*leave;
    rocket.position.y=.02+alt+lv+Math.sin(t*.8)*.012*(alt>.05?1:0);
    if(lv>.05) flameK=Math.max(flameK,sstep(.05,.6,lv));
    rocket.rotation.y+=dt*.05;
    flU.uK.value=flameK*.95; nz.U.uK.value=flameK*1.4;
    chute.visible=chuteK>.01; canopy.scale.set(.2+.8*chuteK,.15+.85*chuteK,.2+.8*chuteK); chute.position.y=top-.02; chute.rotation.z=Math.sin(t*.9)*.05*chuteK;
    hoopU.uK.value=damp(hoopU.uK.value,hoopK,6,dt); hoopG.U.uK.value=hoopU.uK.value*.55;
    bead.U.uK.value=beadK*1.6; bead.mesh.position.set(0,beadY,zc);
    trace.U.uA.value.set(0,rocket.position.y+top+.04,zc); trace.U.uB.value.set(0,Math.max(beadY,rocket.position.y+top+.06),zc); trace.U.uK.value=beadK*.5;
  }};
}

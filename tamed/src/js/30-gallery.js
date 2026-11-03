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
  B.box(-6,-2.2,0,H+.6,wallZ(0),zA); B.box(2.2,6,0,H+.6,wallZ(0),zA);
  B.box(-2.2,2.2,5.6,H+.6,wallZ(0),zA);
  B.box(-6,-2.2,0,H+.6,zB,EXIT_Z); B.box(2.2,6,0,H+.6,zB,EXIT_Z); B.box(-2.2,2.2,5.6,H+.6,zB,EXIT_Z);
  for(let k=0;k<=4;k++) B.wall('x',-7,7,0,H+.6,wallZ(k)-ROOM.T,wallZ(k),[{c:0,w:2.8,hs:3.45}]);
  /* ceilings: plain over Kríos and Pharos, a square opening over Aetos, a round shaft over Ogive */
  const z0=k=>wallZ(k)-ROOM.T, z1=k=>wallZ(k+1);
  B.box(-6,6,H,H+.6,z1(0),z0(0)); B.box(-6,6,H,H+.6,z1(2),z0(2));
  const AP=2.1, ac=roomZ(1);
  B.box(-6,6,H,H+.06,ac+AP,z0(1),{nosdf:1}); B.box(-6,6,H,H+.06,z1(1),ac-AP,{nosdf:1}); B.box(-6,-AP,H,H+.06,ac-AP,ac+AP,{nosdf:1}); B.box(AP,6,H,H+.06,ac-AP,ac+AP,{nosdf:1});
  B.raw(`d=min(d,max(sdBox(p-vec3(0.,${H+.03},${ac.toFixed(3)}),vec3(6.,.03,8.)),-sdBox(p-vec3(0.,${H},${ac.toFixed(3)}),vec3(${AP},1.,${AP}))));`);
  B.box(-6,6,H+.06,H+.8,ac+AP+.9,z0(1),{nosdf:1}); B.box(-6,6,H+.06,H+.8,z1(1),ac-AP-.9,{nosdf:1}); B.box(-6,-AP-.9,H+.06,H+.8,ac-AP-.9,ac+AP+.9,{nosdf:1}); B.box(AP+.9,6,H+.06,H+.8,ac-AP-.9,ac+AP+.9,{nosdf:1});
  /* the stone bench around the skyspace */
  const bz0=z1(1)+.15, bz1=z0(1)-.15;
  B.box(-6,-5.45,0,.46,bz0,bz1); B.box(5.45,6,0,.46,bz0,bz1); B.box(-5.45,-1.7,0,.46,bz0,bz0+.55); B.box(1.7,5.45,0,.46,bz0,bz0+.55);
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
  const stone=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'gal', color:'#ECE5DA', rough:.88, joint:.55, warm:'#FFF4E6',
    albedo:`{ float ph=smoothstep(${(z0(2)+.3).toFixed(2)},${(z0(2)-.4).toFixed(2)},vWP.z)*smoothstep(${(z1(2)-.3).toFixed(2)},${(z1(2)+.4).toFixed(2)},vWP.z);
      diffuseColor.rgb*=mix(1.,.5,ph);
      if(ph>0.&&abs(wN.y)<.5){ vec2 q=abs(wN.x)>.5?vWP.zy:vWP.xy; float h=fbm2(q*.11+3.)*14.+fbm2(q*.4+7.)*1.2; float dd=abs(fract(h+.5)-.5); float fw=fwidth(h)*1.2+.002;
        float line=1.-smoothstep(.0,.02+fw,dd); float major=1.-smoothstep(.0,.03+fw*.2,abs(fract(h*.2+.5)-.5)*5.);
        diffuseColor.rgb*=1.-ph*clamp(line*.55+major*.4,0.,.75); } }`});
  const arch=new T.Mesh(mergeGeos(B.geos),stone); arch.castShadow=arch.receiveShadow=true; sc.add(arch);
  const shaftM=stoneMat({U:W.U, sdf:'float mapAO(vec3 p){return 1e5;}', key:'shaft', color:'#ECE3D6', rough:.9, joint:.6,
    emisGLSL:`outgoingLight+=diffuseColor.rgb*vec3(1.,.74,.48)*(pow(smoothstep(7.6,30.,vWP.y),.7)*2.6+smoothstep(7.6,9.5,vWP.y)*.25);`});
  W.shaft=new T.Mesh(mergeGeos([W.shaftGeo]),shaftM); W.shaft.receiveShadow=true; sc.add(W.shaft);
  const capM=new T.MeshBasicMaterial({color:new T.Color('#FFE2BC').multiplyScalar(6)}); const cap=new T.Mesh(new T.CircleGeometry(1.8,48),capM); cap.rotation.x=Math.PI/2; cap.position.set(0,47.5,roomZ(3)); sc.add(cap); W.shaftCap=cap;
  /* the floor: polished stone that holds a soft reflection of the light */
  W.mirror=new Mirror(MOBILE?.25:.35,{mips:true,bias:.001});
  const floorM=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'galfloor', color:'#DCD3C6', rough:.55, joint:1, mirror:true, mirrorK:.55,
    albedo:`{ float ph=smoothstep(${(z0(2)+.3).toFixed(2)},${(z0(2)-.4).toFixed(2)},vWP.z)*smoothstep(${(z1(2)-.3).toFixed(2)},${(z1(2)+.4).toFixed(2)},vWP.z); diffuseColor.rgb*=mix(1.,.45,ph); }`});
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
  W.roomLights=PROJ.map((p,k)=>{ const l=new T.PointLight(p.col,[5,7,.35,5][k],20,1.4); l.position.set(0,H-.6,roomZ(k)); sc.add(l); return l; });
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

/* ---------- Kríos: two chairs, a pool of light, the light between them moving like a voice ---------- */
const VOICE={who:0,phase:0,amp:0,env:0};   // shared with the sound: who is speaking, and how loudly
function buildKrios(W,zc){
  const g=new T.Group(); W.scene.add(g);
  const wood=new T.MeshStandardMaterial({color:'#D6BF9D',roughness:.5});
  /* a slender bentwood chair: tapered legs, back posts that curve away, a bent top rail, a rounded seat */
  const tube=(pts,r,n=14)=>new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>v3(...p))),n,r,8,false);
  const chair=(x,face)=>{ const c=new T.Group(), parts=[];
    const sh=new T.Shape(), w=.22, rr=.06; sh.moveTo(-w+rr,-w); sh.lineTo(w-rr,-w); sh.quadraticCurveTo(w,-w,w,-w+rr); sh.lineTo(w,w-rr); sh.quadraticCurveTo(w,w,w-rr,w);
    sh.lineTo(-w+rr,w); sh.quadraticCurveTo(-w,w,-w,w-rr); sh.lineTo(-w,-w+rr); sh.quadraticCurveTo(-w,-w,-w+rr,-w);
    const seat=new T.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,curveSegments:6}); seat.rotateX(-Math.PI/2); seat.translate(0,.425,0); parts.push(seat);
    for(const zz of [-.18,.18]){
      parts.push(tube([[.2,0,zz*1.04],[.19,.22,zz],[.18,.42,zz*.98]],.016,6));
      parts.push(tube([[-.16,0,zz*1.05],[-.19,.42,zz],[-.225,.68,zz*.98],[-.27,.9,zz*.96]],.017,16));
      parts.push(tube([[.19,.17,zz],[0,.165,zz],[-.17,.17,zz]],.009,4));
    }
    parts.push(tube([[-.27,.86,-.175],[-.305,.875,0],[-.27,.86,.175]],.022,12));
    parts.push(tube([[-.235,.64,-.17],[-.265,.645,0],[-.235,.64,.17]],.011,10));
    const m=new T.Mesh(mergeGeos(parts),wood); m.castShadow=m.receiveShadow=true; c.add(m);
    c.position.set(x,0,zc); c.rotation.y=face; g.add(c); return c; };
  chair(-1.18,0); chair(1.18,Math.PI);
  const spot=new T.SpotLight('#CADBFF',420,0,.34,.72,2); spot.position.set(0,ROOM.H-.15,zc); spot.target.position.set(0,0,zc);
  spot.castShadow=true; spot.shadow.mapSize.set(1024,1024); spot.shadow.bias=-.0006; spot.shadow.radius=4; spot.shadow.camera.near=1; spot.shadow.camera.far=10;
  g.add(spot); g.add(spot.target);
  /* a faint cone of light in the room's haze */
  const coneM=new T.ShaderMaterial({uniforms:{uCol:{value:col('#A5C3FF')},uK:{value:1},uTime:GU.uTime},transparent:true,depthWrite:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,side:T.DoubleSide,
    vertexShader:`varying vec3 vP; varying vec3 vN; varying vec3 vWP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK,uTime; varying vec3 vP; varying vec3 vN; varying vec3 vWP; ${GLSL.noise}
      void main(){ float h=vP.y/7.+.5; vec3 V=normalize(cameraPosition-vWP); float e=pow(1.-abs(dot(normalize(vN),V)),1.6);
        float n=.75+.25*vnoise(vec2(vWP.x*3.+uTime*.2,vWP.y*2.-uTime*.3));
        float a=(1.-e)*smoothstep(1.,.25,h)*smoothstep(0.,.08,h)*n; gl_FragColor=vec4(uCol*a*.05*uK,1.); }`});
  const cone=new T.Mesh(new T.CylinderGeometry(.3,2.5,7,48,1,true),coneM); cone.position.set(0,3.5,zc); g.add(cone);
  /* the voice: a ribbon of light between the two chairs, carrying the waveform from the one speaking to the one listening */
  const vm=new T.ShaderMaterial({uniforms:{uCol:{value:col('#C9DAFF')},uTime:GU.uTime,uWho:{value:0},uAmp:{value:0},uPh:{value:0}},transparent:true,depthWrite:false,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,side:T.DoubleSide,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uTime,uWho,uAmp,uPh; varying vec2 vUv; ${GLSL.noise}
    void main(){
      float x=vUv.x; float from=mix(x,1.-x,uWho);
      float travel=fract(uPh);
      float env=exp(-pow((from-travel*1.15+.1)*3.2,2.))*uAmp;
      float w=sin(from*19.-uTime*4.2)*.6+sin(from*31.-uTime*6.1+1.3)*.28+sin(from*9.-uTime*2.3)*.3;
      w*=env*(.75+.25*vnoise(vec2(from*5.,uTime*1.7)));
      float y=(vUv.y-.5)*2.;
      float line=exp(-pow((y-w*.55)*11.,2.));
      float glow=exp(-pow((y-w*.55)*2.6,2.))*.3;
      float edge=smoothstep(0.,.12,x)*smoothstep(1.,.88,x);
      float base=exp(-pow(y*30.,2.))*.32;
      gl_FragColor=vec4(uCol*(line*(.35+env*1.6)+glow*env+base)*edge,1.);
    }`});
  const rib=new T.Mesh(new T.PlaneGeometry(1.72,.62),vm); rib.position.set(0,1.08,zc); g.add(rib);
  /* rings of light on the floor, sent out by whoever is speaking */
  const fm=new T.ShaderMaterial({uniforms:{uCol:{value:col('#B9CEFF')},uTime:GU.uTime,uWho:{value:0},uAmp:{value:0}},transparent:true,depthWrite:false,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uTime,uWho,uAmp; varying vec2 vP;
    void main(){ vec2 src=vec2(mix(-1.18,1.18,uWho),0.); float r=length(vP-src); float R=length(vP);
      float rings=sin(r*11.-uTime*4.)*.5+.5; rings=pow(rings,6.);
      float a=rings*exp(-r*.75)*uAmp*smoothstep(2.4,1.6,R);
      gl_FragColor=vec4(uCol*a*.22,1.); }`});
  const fl=new T.Mesh(new T.CircleGeometry(2.5,64),fm); fl.rotation.x=-Math.PI/2; fl.position.set(0,.006,zc); g.add(fl);
  let t0=0;
  return {g, spot, update(dt,t,st){
    /* a conversation: each speaks for a few seconds, a breath, then the other answers */
    t0+=dt; const turn=3.4, k=t0%(turn*2), who=k<turn?0:1, u=(k%turn)/turn;
    VOICE.who=who; VOICE.phase=u;
    const talk=sstep(0,.08,u)*(1-sstep(.78,.95,u));
    const syl=.55+.45*Math.abs(Math.sin(t*7.3+who*2))*(.6+.4*Math.sin(t*2.1+who));
    VOICE.env=talk*syl;
    VOICE.amp=damp(VOICE.amp,talk,8,dt);
    vm.uniforms.uWho.value=who; vm.uniforms.uAmp.value=VOICE.amp*(.7+.3*syl); vm.uniforms.uPh.value=u;
    fm.uniforms.uWho.value=who; fm.uniforms.uAmp.value=VOICE.amp;
    spot.intensity=420*(.92+.08*VOICE.env);
  }};
}

/* ---------- Aetos: a skyspace. The evening sky in a square, birds crossing, one of them outlined ---------- */
function buildAetos(W,zc,AP){
  const g=new T.Group(); W.scene.add(g);
  /* light hidden along the top of the walls washes the ceiling, so the sky reads as a flat colour (the Turrell trick) */
  const cove=[];
  [[-5.3,zc],[5.3,zc],[0,zc-7.2],[0,zc+7.2]].forEach(([x,z])=>{ const l=new T.PointLight('#FFF3E4',26,9,1.5); l.position.set(x,ROOM.H-.5,z); g.add(l); cove.push(l); });
  const skyL=new T.SpotLight('#DCE6FA',120,0,.5,.9,2); skyL.position.set(0,ROOM.H+3,zc); skyL.target.position.set(0,0,zc); g.add(skyL); g.add(skyL.target);
  /* birds: flat silhouettes high above, seen from below. Wings flap in the vertex shader */
  const N=14, P=[], Wt=[];
  const bird=[[0,.38,0],[-.12,-.1,0],[.12,-.1,0], [-.05,.06,0],[-1,.02,1],[-.06,-.12,0], [.05,.06,0],[1,.02,1],[.06,-.12,0], [-1,.02,1],[-.6,-.1,1],[-.06,-.12,0],[1,.02,1],[.6,-.1,1],[.06,-.12,0]];
  for(const v of bird){ P.push(v[0],v[1],0); Wt.push(v[2]); }
  const bg=new T.BufferGeometry(); bg.setAttribute('position',new T.Float32BufferAttribute(P,3)); bg.setAttribute('aW',new T.Float32BufferAttribute(Wt,1));
  const ig=new T.InstancedBufferGeometry(); ig.attributes.position=bg.attributes.position; ig.attributes.aW=bg.attributes.aW;
  const ia=new Float32Array(N*4); const R=(()=>{let s=5;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(let i=0;i<N;i++){ ia[i*4]=R(); ia[i*4+1]=R(); ia[i*4+2]=R(); ia[i*4+3]=R(); }
  ig.setAttribute('aB',new T.InstancedBufferAttribute(ia,4)); ig.instanceCount=N; ig.boundingSphere=new T.Sphere(v3(),1e5);
  const BZ=zc-21; const bm=new T.ShaderMaterial({uniforms:{uTime:{value:0},uC:{value:v3(0,0,BZ)},uCol:{value:col('#34302E')}},side:T.DoubleSide,
    vertexShader:`attribute float aW; attribute vec4 aB; uniform float uTime; uniform vec3 uC; varying float vA;
    vec3 birdPos(vec4 b,float t){ if(b.w>1.5){ float a=t*.15+b.z*6.283; return vec3(uC.x+cos(a)*5.5,34.+sin(t*.23)*1.5,uC.z+sin(a)*5.5); }
      float ang=b.x*6.283; vec2 d=vec2(cos(ang),sin(ang)); float sp=.032+b.y*.03; float ph=fract(t*sp+b.z);
      vec2 perp=vec2(-d.y,d.x); vec2 xy=uC.xz+d*(ph-.5)*150.+perp*(b.w-.5)*20.; return vec3(xy.x,26.+b.y*22.,xy.y); }
    void main(){
      vec3 c=birdPos(aB,uTime); float ang=aB.x*6.283; vec2 d=vec2(cos(ang),sin(ang));
      float flap=sin(uTime*(5.5+fract(aB.w)*2.)+aB.z*20.); float glide=smoothstep(-.2,.6,sin(uTime*.6+aB.z*9.));
      if(aB.w>1.5){ float a=uTime*.15+aB.z*6.283; d=vec2(-sin(a),cos(a)); glide=max(glide,smoothstep(-.6,.2,sin(uTime*.31))); }
      vec3 p=position; float s=(.7+aB.y*.45)*(aB.w>1.5?1.25:1.);
      p.z=aW*abs(p.x)*mix(flap*.55,.08,glide);
      vec3 w=vec3(p.x*s,p.z*s,p.y*s);
      vec3 rw=vec3(w.x*d.y+w.z*d.x, w.y, -w.x*d.x+w.z*d.y);
      vA=1.; gl_Position=projectionMatrix*viewMatrix*vec4(c+rw,1.);
    }`,
    fragmentShader:`uniform vec3 uCol; void main(){ gl_FragColor=vec4(uCol,1.); }`});
  const birds=new T.Mesh(ig,bm); birds.frustumCulled=false; birds.renderOrder=910; g.add(birds);
  /* the outline around the one that matters */
  const rm=new T.ShaderMaterial({uniforms:{uK:{value:1}},transparent:true,depthWrite:false,depthTest:true,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uK; varying vec2 vUv; void main(){ vec2 q=vUv-.5; float r=length(q)*2.; float fw=fwidth(r)*1.5;
      float ring=smoothstep(.9-fw,.9,r)*smoothstep(.96+fw,.96,r);
      float ticks=0.; vec2 a=abs(q); ticks=step(a.y,.006)*step(.42,a.x)*step(a.x,.5)+step(a.x,.006)*step(.42,a.y)*step(a.y,.5);
      gl_FragColor=vec4(vec3(1.,.99,.96),(ring+ticks*.9)*uK); }`});
  const ring=new T.Mesh(new T.PlaneGeometry(1,1),rm); ring.renderOrder=999; g.add(ring);
  const mark=4, mb={x:ia[mark*4],y:ia[mark*4+1],z:ia[mark*4+2],w:ia[mark*4+3]};
  /* the marked bird always crosses the opening: give it a path through the middle */
  ia[mark*4+3]=2; mb.w=2; ia[mark*4+2]=.38; mb.z=.38;
  const bp=(t)=>{ const a=t*.15+mb.z*TAU; return v3(Math.cos(a)*5.5,34+Math.sin(t*.23)*1.5,BZ+Math.sin(a)*5.5); };
  let tb=0;
  return {g, update(dt,t,st){ tb+=dt; bm.uniforms.uTime.value=tb;
    const p=bp(tb); ring.position.copy(p); ring.quaternion.copy(CAM.gal.quaternion); const dist=p.distanceTo(CAM.gal.position); ring.scale.setScalar(dist*.052);
    rm.uniforms.uK.value=.85; }};
}

/* ---------- Pharos: a dark room and one slow beam, searching the walls with no map ---------- */
function buildPharos(W,zc){
  const g=new T.Group(); W.scene.add(g);
  const dark=new T.MeshStandardMaterial({color:'#6E665E',roughness:.8});
  const ped=new T.Mesh(boxGeo(-.32,.32,0,1.18,-.32,.32),dark); ped.position.set(0,0,zc); ped.castShadow=ped.receiveShadow=true; g.add(ped);
  const lensM=new T.MeshStandardMaterial({color:'#2A2622',roughness:.25,metalness:.2,emissive:new T.Color('#FFD5B3'),emissiveIntensity:2});
  const drum=new T.Mesh(new T.CylinderGeometry(.24,.26,.46,40,1),lensM); drum.position.set(0,1.42,zc); g.add(drum);
  const capM=new T.MeshStandardMaterial({color:'#3B3530',roughness:.5});
  const cap=new T.Mesh(new T.CylinderGeometry(.2,.3,.1,40),capM); cap.position.set(0,1.7,zc); g.add(cap);
  const beam=new T.SpotLight('#FFD5B3',900,0,.1,.5,2); beam.position.set(0,1.42,zc); beam.castShadow=true; beam.shadow.mapSize.set(512,512); beam.shadow.camera.near=.3; beam.shadow.camera.far=30; beam.shadow.bias=-.001;
  g.add(beam); g.add(beam.target);
  /* the visible beam in the dust */
  const bmM=new T.ShaderMaterial({uniforms:{uCol:{value:col('#FFD5B3')},uTime:GU.uTime,uK:{value:1}},transparent:true,depthWrite:false,side:T.DoubleSide,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec3 vP; varying vec3 vWP; varying vec3 vN; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uTime,uK; varying vec3 vP; varying vec3 vWP; varying vec3 vN; ${GLSL.noise}
    void main(){ float h=clamp(-vP.y/9.,0.,1.); vec3 V=normalize(cameraPosition-vWP); float e=abs(dot(normalize(vN),V));
      float n=.6+.4*vnoise(vec2(vWP.x*2.+uTime*.15,vWP.z*2.+vWP.y*3.-uTime*.2));
      float a=pow(e,1.4)*(1.-h)*smoothstep(0.,.03,h)*n; gl_FragColor=vec4(uCol*a*.16*uK,1.); }`});
  const cg=new T.CylinderGeometry(.06,1.15,9,40,1,true); cg.translate(0,-4.5,0); cg.rotateX(-Math.PI/2);
  const cone=new T.Mesh(cg,bmM); cone.position.set(0,1.42,zc); g.add(cone);
  const fill=new T.PointLight('#FFD5B3',3,9,1.6); fill.position.set(0,1.5,zc); g.add(fill);
  let a=-.6, last=0;
  return {g, beam, get angle(){return a;}, update(dt,t,st){
    /* sweep, slow where something answers, and once in a while look back the way it came */
    const slow=.3+.7*sstep(.15,.65,Math.abs(Math.sin(a*1.5+.7)));
    const back=Math.sin(t*.13)>.93?-.55:1;
    a+=dt*.36*slow*back;
    const dx=Math.sin(a), dz=-Math.cos(a), tilt=.03*Math.sin(t*.4);
    beam.target.position.set(dx*10,1.42+tilt*10,zc+dz*10);
    cone.lookAt(beam.target.position.x,beam.target.position.y,beam.target.position.z);
    drum.rotation.y=-a;
    last=t; }};
}

/* ---------- Ogive: a tall shaft of light, and a slender rocket rising through it ---------- */
function buildOgive(W,zc,OR){
  const g=new T.Group(); W.scene.add(g);
  const shaftL=new T.SpotLight('#FFB475',9000,0,.052,.55,2); shaftL.position.set(0,44,zc); shaftL.target.position.set(0,0,zc); g.add(shaftL); g.add(shaftL.target);
  shaftL.castShadow=true; shaftL.shadow.mapSize.set(512,512); shaftL.shadow.camera.near=30; shaftL.shadow.camera.far=48; shaftL.shadow.bias=-.0008;
  const glowL=new T.PointLight('#FFB475',20,10,1.4); glowL.position.set(0,.6,zc); g.add(glowL);
  const colM=new T.ShaderMaterial({uniforms:{uCol:{value:col('#FFC48C')},uTime:GU.uTime,uK:{value:1}},transparent:true,depthWrite:false,side:T.DoubleSide,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec3 vWP; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uTime,uK; varying vec3 vWP; varying vec3 vN; ${GLSL.noise}
    void main(){ vec3 V=normalize(cameraPosition-vWP); float e=abs(dot(normalize(vN),V));
      float n=.55+.45*vnoise(vec2(atan(vWP.x,vWP.z-(${zc.toFixed(2)}))*3.,vWP.y*.6-uTime*.5));
      float a=pow(e,2.)*n*(.55+.45*smoothstep(0.,6.,vWP.y))*smoothstep(0.,.4,vWP.y);
      gl_FragColor=vec4(uCol*a*.1*uK,1.); }`});
  const column=new T.Mesh(new T.CylinderGeometry(OR*.97,OR*.97,44,64,1,true),colM); column.position.set(0,22,zc); g.add(column); W.ogColumn=column;
  /* the rocket: a tangent ogive nose, a slim body, a boat tail and four fins */
  const prof=[]; const Rr=.12, Ln=.78, Lb=2.05;
  prof.push(new T.Vector2(.0,0)); prof.push(new T.Vector2(.07,0)); prof.push(new T.Vector2(.085,.07)); prof.push(new T.Vector2(.1,.14)); prof.push(new T.Vector2(Rr,.26));
  prof.push(new T.Vector2(Rr,.26+Lb));
  const rho=(Rr*Rr+Ln*Ln)/(2*Rr);
  for(let i=1;i<=24;i++){ const x=i/24*Ln; const y=Math.sqrt(rho*rho-(Ln-x)*(Ln-x))+Rr-rho; prof.push(new T.Vector2(Math.max(0,y),.26+Lb+x)); }
  const body=new T.LatheGeometry(prof,48);
  const rkM=new T.MeshStandardMaterial({color:'#F4EFE7',roughness:.4,metalness:0,emissive:new T.Color('#FFB475'),emissiveIntensity:.05});
  const rocket=new T.Group(); const bm=new T.Mesh(body,rkM); bm.castShadow=true; rocket.add(bm);
  const finS=new T.Shape(); finS.moveTo(0,0); finS.lineTo(.3,-.06); finS.lineTo(.3,.16); finS.lineTo(0,.62); finS.lineTo(0,0);
  const finG=new T.ExtrudeGeometry(finS,{depth:.012,bevelEnabled:false}); finG.translate(Rr-.01,.2,-.006);
  const finM=new T.MeshStandardMaterial({color:'#E9E2D8',roughness:.4});
  for(let i=0;i<4;i++){ const f=new T.Mesh(finG,finM); f.rotation.y=i*Math.PI/2+.4; f.castShadow=true; rocket.add(f); }
  const band=new T.Mesh(new T.CylinderGeometry(Rr+.002,Rr+.002,.06,48,1,true),new T.MeshStandardMaterial({color:'#FFB475',roughness:.5,emissive:new T.Color('#FFB475'),emissiveIntensity:.15}));
  band.position.y=.26+Lb*.72; rocket.add(band);
  const flameM=new T.ShaderMaterial({uniforms:{uTime:GU.uTime,uK:{value:0}},transparent:true,depthWrite:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uTime,uK; varying vec2 vUv; void main(){ vec2 q=vUv-vec2(.5,1.); float a=exp(-pow(q.x*7.,2.))*smoothstep(-1.,0.,q.y)*exp(q.y*3.)*(.85+.15*sin(uTime*40.)); gl_FragColor=vec4(vec3(1.,.72,.42)*a*uK*2.,1.); }`});
  const flame=new T.Mesh(new T.PlaneGeometry(.34,1.1),flameM); flame.position.y=-.5; rocket.add(flame);
  rocket.position.set(0,.02,zc); g.add(rocket);
  const rkL=new T.PointLight('#FFC892',7,6,1.6); rkL.position.set(.9,1.6,1.6); rocket.add(rkL);
  /* dust rising in the column */
  const DN=MOBILE?160:320, dg=new T.BufferGeometry(), dr=new Float32Array(DN*4); for(let i=0;i<dr.length;i++) dr[i]=Math.random();
  dg.setAttribute('position',new T.BufferAttribute(new Float32Array(DN*3),3)); dg.setAttribute('aR',new T.BufferAttribute(dr,4)); dg.boundingSphere=new T.Sphere(v3(),1e5);
  const dm=new T.ShaderMaterial({uniforms:{uTime:GU.uTime,uC:{value:v3(0,0,zc)},uPx:{value:600},uCol:{value:col('#FFD2A4')}},transparent:true,depthWrite:false,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`attribute vec4 aR; uniform float uTime,uPx; uniform vec3 uC; varying float vA; void main(){
      float r=sqrt(aR.x)*${(OR*.95).toFixed(2)}, a=aR.y*6.283+uTime*.05*(aR.z-.5); float y=mod(aR.z*16.+uTime*(.12+aR.w*.18),16.);
      vec3 p=uC+vec3(cos(a)*r,y,sin(a)*r); vec4 mv=viewMatrix*vec4(p,1.); gl_PointSize=clamp(.05*uPx/-mv.z*(.5+aR.w),1.,12.);
      vA=smoothstep(0.,1.5,y)*smoothstep(16.,11.,y)*(.4+.6*aR.w); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uCol*a*a*vA*.9,1.); }`});
  const dust=new T.Points(dg,dm); dust.frustumCulled=false; g.add(dust);
  W.ogiveDust=dm;
  return {g, rocket, update(dt,t,st){
    const s=S.s;
    const y=.02+3.0*E.io2(inv(3.3,4,s))+.35*sstep(4,4.5,s)*0+Math.pow(Math.max(0,s-4)/.5,2.2)*30;
    rocket.position.y=damp(rocket.position.y,y+Math.sin(t*.8)*.04*sstep(3.6,4,s),4,dt);
    rocket.rotation.y+=dt*.05;
    flameM.uniforms.uK.value=sstep(.3,1.2,rocket.position.y)*.9;
    dm.uniforms.uPx.value=G.px;
  }};
}

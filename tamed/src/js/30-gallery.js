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
  /* Pharos: the room is dark stone; a map is drawn on its walls in light, only where the beam has just been */
  Object.assign(W.U,{uPhS:{value:v3(0,1.48,roomZ(2))}, uPhA:{value:0}, uPhY:{value:1.5}, uPhCol:{value:col('#FFD5B3')}, uPhK:{value:1}});
  const PHM=`${(z0(2)+.3).toFixed(2)},${(z0(2)-.4).toFixed(2)},vWP.z)*smoothstep(${(z1(2)-.3).toFixed(2)},${(z1(2)+.4).toFixed(2)},vWP.z)`;
  const stone=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'gal', color:'#ECE5DA', rough:.88, joint:.55, warm:'#FFF4E6',
    glsl:`uniform vec3 uPhS,uPhCol; uniform float uPhA,uPhY,uPhK;
    float mapLines(vec2 q){ float h=(vnoise(q*.11+3.)*.66+vnoise(q*.24+5.3)*.34)*14.+vnoise(q*.4+7.)*1.2; float dd=abs(fract(h+.5)-.5); float fw=fwidth(h)*1.2+.002;
      float line=1.-smoothstep(0.,.022+fw,dd); float major=1.-smoothstep(0.,.03+fw*.2,abs(fract(h*.2+.5)-.5)*5.);
      vec2 gq=abs(fract(q/1.24+.5)-.5)*1.24; float gw=fwidth(q.x)+fwidth(q.y); float grid=1.-smoothstep(0.,.005+gw,min(gq.x,gq.y));
      vec2 cq=abs(fract(q/4.96+.5)-.5)*4.96; float cross=(1.-smoothstep(.0,.012+gw,min(cq.x,cq.y)))*step(max(cq.x,cq.y),.16);
      return clamp(line*.42+major*.6+grid*.2+cross*.9,0.,1.); }`,
    albedo:`{ float ph=smoothstep(${PHM}; diffuseColor.rgb*=mix(1.,.27,ph); }`,
    emisGLSL:`{ float ph=smoothstep(${PHM};
      if(ph>.01&&abs(wN.y)<.5&&uPhK>0.){ vec3 q=vWP-uPhS; float th=atan(q.x,-q.z); float dl=mod(uPhA-th,6.2831853);
        float rev=exp(-dl*1.35)*smoothstep(0.,.03,dl)+exp(-pow((6.2831853-dl)*9.,2.))*.6;
        float vb=exp(-pow((vWP.y-uPhY-length(q.xz)*.03)/1.9,2.));
        vec2 mq=abs(wN.x)>.5?vWP.zy:vWP.xy;
        outgoingLight+=uPhCol*mapLines(mq)*rev*vb*ph*uPhK*.55; } }`});
  const arch=new T.Mesh(mergeGeos(B.geos),stone); arch.castShadow=arch.receiveShadow=true; sc.add(arch);
  const shaftM=stoneMat({U:W.U, sdf:'float mapAO(vec3 p){return 1e5;}', key:'shaft', color:'#ECE3D6', rough:.9, joint:.6,
    emisGLSL:`outgoingLight+=diffuseColor.rgb*vec3(1.,.74,.48)*(pow(smoothstep(7.6,30.,vWP.y),.7)*2.6+smoothstep(7.6,9.5,vWP.y)*.25);`});
  W.shaft=new T.Mesh(mergeGeos([W.shaftGeo]),shaftM); W.shaft.receiveShadow=true; sc.add(W.shaft);
  const capM=new T.MeshBasicMaterial({color:new T.Color('#FFE2BC').multiplyScalar(6)}); const cap=new T.Mesh(new T.CircleGeometry(1.8,48),capM); cap.rotation.x=Math.PI/2; cap.position.set(0,47.5,roomZ(3)); sc.add(cap); W.shaftCap=cap;
  /* the floor: polished stone that holds a soft reflection of the light */
  W.mirror=new Mirror(MOBILE?.25:.35,{mips:true,bias:.001});
  const floorM=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'galfloor', color:'#DCD3C6', rough:.55, joint:1, mirror:true, mirrorK:.55,
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
  /* the voice: a ribbon of light between the two chairs. Seven threads of silk light twist through the air; each phrase
     travels along them from the one speaking to the one listening, and in the pauses they relax to one faint line */
  const NS=7, rg=new T.InstancedBufferGeometry(), rbase=new T.PlaneGeometry(1,1,240,1);
  rg.index=rbase.index; rg.attributes.position=rbase.attributes.position;
  const sd=new Float32Array(NS*4); for(let i=0;i<NS;i++){ sd[i*4]=(i-(NS-1)/2)/((NS-1)/2); sd[i*4+1]=Math.random(); sd[i*4+2]=.6+Math.random()*.4; sd[i*4+3]=Math.random(); }
  rg.setAttribute('aS',new T.InstancedBufferAttribute(sd,4)); rg.instanceCount=NS; rg.boundingSphere=new T.Sphere(v3(),1e4);
  const vm=new T.ShaderMaterial({uniforms:{uCol:{value:col('#A5C3FF')},uHot:{value:col('#EAF1FF')},uTime:GU.uTime,uWho:{value:0},uAmp:{value:0},uPh:{value:0},uSyl:{value:0}},transparent:true,depthWrite:false,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,side:T.DoubleSide,
    vertexShader:`attribute vec4 aS; uniform float uTime,uWho,uAmp,uPh,uSyl; varying float vV,vE,vU,vB;
    void main(){
      float u=position.x+.5, v=position.y*2.;
      float from=mix(u,1.-u,uWho);
      /* the phrase: a packet of energy moving from the speaker to the listener */
      float trav=uPh*1.25-.1;
      float env=exp(-pow((from-trav)*2.6,2.))*uAmp*(.7+.3*uSyl);
      float k=uTime*(3.2+aS.y*.8)*(uWho>.5?-1.:1.);
      float w=sin(from*17.+aS.y*6.-k*1.3)*.55+sin(from*29.+aS.w*4.-k*1.9)*.25+sin(from*7.-k*.6+aS.y*3.)*.35;
      float rest=sin(u*6.2832+uTime*.35+aS.y*6.)*.012;
      float y=w*env*.15+aS.x*(.006+.05*env)+rest;
      float z=sin(u*9.4+uTime*.8+aS.w*6.)*(.012+.06*env)+aS.x*.01;
      float tw=u*5.+uTime*.6+aS.y*6.2832, wid=(.005+.017*env)*aS.z*smoothstep(0.,.1,u)*smoothstep(1.,.9,u);
      vec3 p=vec3(mix(-.96,.96,u),y,z)+vec3(0.,cos(tw),sin(tw))*v*wid;
      vV=v; vE=env; vU=u; vB=aS.z;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`,
    fragmentShader:`uniform vec3 uCol,uHot; varying float vV,vE,vU,vB;
    void main(){ float core=exp(-vV*vV*3.2); float ends=smoothstep(0.,.08,vU)*smoothstep(1.,.92,vU);
      vec3 c=mix(uCol,uHot,clamp(vE*1.3,0.,1.)*core);
      gl_FragColor=vec4(c*core*ends*vB*(.3+3.2*vE),1.); }`});
  const rib=new T.Mesh(rg,vm); rib.position.set(0,1.1,zc); rib.frustumCulled=false; rib.renderOrder=958; g.add(rib);
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
    vm.uniforms.uWho.value=who; vm.uniforms.uAmp.value=VOICE.amp; vm.uniforms.uSyl.value=syl; vm.uniforms.uPh.value=u;
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
  /* the sky's light pours down through the opening: a soft falling volume, and a pale square of it on the floor */
  const pourU={uCol:{value:col('#F4F0EA')},uSky:{value:new T.Color('#A9C3EC')},uTime:GU.uTime,uK:{value:1},uC:{value:v3(0,0,zc)},uA:{value:AP},uH:{value:ROOM.H}};
  const pourM=new T.ShaderMaterial({uniforms:pourU,transparent:true,depthWrite:false,side:T.BackSide,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uCol,uSky,uC; uniform float uTime,uK,uA,uH; varying vec3 vWP; ${GLSL.noise}
    float dens(vec3 p){ float spread=1.+(uH-p.y)*.055; vec2 q=abs(p.xz-uC.xz)/(uA*spread); float e=max(q.x,q.y);
      return (1.-smoothstep(.72,1.02,e))*smoothstep(0.,1.2,p.y)*(.35+.65*smoothstep(0.,uH,p.y))*step(p.y,uH); }
    void main(){ vec3 C=cameraPosition, rd=vWP-C; float tE=length(rd); rd/=tE; float seg=min(tE,9.), t0=tE-seg, dt=seg/6., acc=0.;
      for(int i=0;i<6;i++){ vec3 p=C+rd*(t0+(float(i)+.5)*dt); float d=dens(p); if(d>.001){ float n=vnoise(p.xz*.8+vec2(p.y*.35-uTime*.05,uTime*.03)); acc+=d*(.5+.8*n)*dt; } }
      gl_FragColor=vec4(mix(uSky,uCol,.55)*acc*.075*uK,1.); }`});
  const pour=new T.Mesh(boxGeo(-AP*1.45,AP*1.45,0,ROOM.H,zc-AP*1.45,zc+AP*1.45),pourM); pour.renderOrder=950; g.add(pour);
  const poolM=new T.ShaderMaterial({uniforms:pourU,transparent:true,depthWrite:false,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol,uSky; uniform float uK,uA; varying vec2 vP; void main(){ vec2 q=abs(vP)/(uA*1.4); float e=max(q.x,q.y);
      float a=(1.-smoothstep(.62,1.,e))*(.7+.3*(1.-length(vP)/(uA*1.9))); gl_FragColor=vec4(mix(uSky,uCol,.6)*a*.36*uK,1.); }`});
  const poolL=new T.Mesh(new T.PlaneGeometry(AP*3.2,AP*3.2),poolM); poolL.rotation.x=-Math.PI/2; poolL.position.set(0,.004,zc); poolL.renderOrder=6; g.add(poolL);
  W.aetosPour=pourU;
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
  const SY=1.48, S0=v3(0,SY,zc), C=col('#FFD5B3'), TAN=Math.tan(.13);
  const zN=wallZ(2)-ROOM.T, zF=wallZ(3);
  /* the lamp: a slender pale column, a small bronze gimbal, and one lens of light */
  const prof=[[0,0],[.16,0],[.16,.045],[.11,.07],[.07,.12],[.052,.62],[.044,1.22],[.062,1.27],[.062,1.31],[.032,1.34],[0,1.34]].map(p=>new T.Vector2(p[0],p[1]));
  const column=new T.Mesh(new T.LatheGeometry(prof,40),new T.MeshStandardMaterial({color:'#D8CFC1',roughness:.5}));
  column.position.set(0,0,zc); column.castShadow=column.receiveShadow=true; g.add(column);
  const ring=new T.Mesh(new T.TorusGeometry(.1,.007,8,48),new T.MeshStandardMaterial({color:'#9C7A55',roughness:.35,metalness:.85}));
  ring.position.copy(S0); g.add(ring);
  const lens=new T.Mesh(new T.SphereGeometry(.05,24,16),new T.MeshBasicMaterial({color:C.clone().multiplyScalar(9)})); lens.position.copy(S0); g.add(lens);
  const haloM=new T.ShaderMaterial({uniforms:{uCol:{value:C},uK:{value:1}},transparent:true,depthWrite:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying vec2 vUv; void main(){ float r=length(vUv-.5)*2.; float a=exp(-r*r*9.)*.9+exp(-r*3.2)*.18; gl_FragColor=vec4(uCol*a*uK*(1.-smoothstep(.85,1.,r)),1.); }`});
  const halo=new T.Mesh(new T.PlaneGeometry(1.4,1.4),haloM); halo.position.copy(S0); halo.renderOrder=960; g.add(halo);
  const beam=new T.SpotLight(C,1500,0,.13,.55,2); beam.position.copy(S0); beam.castShadow=true; beam.shadow.mapSize.set(512,512); beam.shadow.camera.near=.2; beam.shadow.camera.far=30; beam.shadow.bias=-.001;
  g.add(beam); g.add(beam.target);
  /* the shaft: marched through drifting haze inside a cone that reaches exactly as far as the wall it finds */
  const VU={uS:{value:S0}, uD:{value:v3(0,0,-1)}, uCol:{value:C}, uTan:{value:TAN}, uL:{value:6}, uTime:GU.uTime, uK:{value:.55}, uPx:{value:600}};
  const DENS=`uniform vec3 uS,uD,uCol; uniform float uTan,uL,uTime,uK;
    float dens(vec3 p){ vec3 q=p-uS; float a=dot(q,uD); float r=length(q-uD*a); float R=max(a,0.)*uTan+.015;
      return smoothstep(R,R*.25,r)*smoothstep(-.02,.15,a)*smoothstep(uL+.02,uL-.35,a)/(1.+a*.16); }`;
  const volM=new T.ShaderMaterial({uniforms:VU,transparent:true,depthWrite:false,side:T.BackSide,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 vWP; ${GLSL.noise}${DENS}
    void main(){
      vec3 C=cameraPosition, rd=vWP-C; float tE=length(rd); rd/=tE;
      float aE=max(dot(vWP-uS,uD),0.), sn=sqrt(max(1.-pow(dot(rd,uD),2.),0.));
      float seg=min(tE,(aE*uTan*2.6+.35)/max(sn,.06));
      float t0=tE-seg, dt=seg/8., acc=0.;
      for(int i=0;i<8;i++){ vec3 p=C+rd*(t0+(float(i)+.5)*dt); float d=dens(p);
        if(d>.001){ float n=vnoise3(p*vec3(1.5,2.1,1.5)+vec3(uTime*.06,uTime*.025,-uTime*.05)); acc+=d*(.3+1.25*n*n)*dt; } }
      gl_FragColor=vec4(uCol*acc*uK,1.);
    }`});
  const cg=new T.CylinderGeometry(.02,TAN*1.3,1,32,1,false); cg.translate(0,-.5,0); cg.rotateX(-Math.PI/2);
  cg.computeBoundingSphere(); const cone=new T.Mesh(cg,volM); cone.position.copy(S0); cone.renderOrder=950; g.add(cone);
  /* dust that only shows where the beam is */
  const DN=MOBILE?240:520, dg=new T.BufferGeometry(), dr=new Float32Array(DN*4); for(let i=0;i<dr.length;i++) dr[i]=Math.random();
  dg.setAttribute('position',new T.BufferAttribute(new Float32Array(DN*3),3)); dg.setAttribute('aR',new T.BufferAttribute(dr,4)); dg.boundingSphere=new T.Sphere(v3(),1e5);
  const dustM=new T.ShaderMaterial({uniforms:VU,transparent:true,depthWrite:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`attribute vec4 aR; uniform float uPx; varying float vA; ${DENS}
    void main(){ vec3 p=vec3((aR.x-.5)*11.4,.12+aR.y*5.8,${zc.toFixed(2)}+(aR.z-.5)*15.4);
      p+=vec3(sin(uTime*.071+aR.w*31.),sin(uTime*.049+aR.x*23.)*.6,cos(uTime*.063+aR.y*27.))*.7;
      vA=dens(p)*(.35+.65*aR.w); vec4 mv=viewMatrix*vec4(p,1.); gl_PointSize=clamp(.03*uPx/max(-mv.z,.2),1.,7.); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uCol*a*a*vA*2.2,1.); }`});
  const dust=new T.Points(dg,dustM); dust.frustumCulled=false; dust.renderOrder=955; g.add(dust);
  const fill=new T.PointLight(C,1.4,6,1.6); fill.position.set(0,SY+.1,zc); g.add(fill);
  const D=v3(), _v=v3();
  let a=-.95;
  return {g, beam, get angle(){return a;}, update(dt,t,st){
    /* one slow sweep round the room, lingering where something seems to answer, never going back */
    const slow=.3+.7*sstep(.12,.62,Math.abs(Math.sin(a*1.3+.7)));
    a+=dt*.34*slow;
    const tilt=-.03+.028*Math.sin(t*.37);
    D.set(Math.sin(a)*Math.cos(tilt),Math.sin(tilt),-Math.cos(a)*Math.cos(tilt));
    beam.target.position.copy(S0).addScaledVector(D,10);
    /* the distance to the wall the beam lands on */
    const tx=D.x>0?(6-S0.x)/D.x:(-6-S0.x)/Math.min(D.x,-1e-6), tz=D.z>0?(zN-S0.z)/D.z:(zF-S0.z)/Math.min(D.z,-1e-6), ty=D.y>0?(ROOM.H-SY)/D.y:-SY/Math.min(D.y,-1e-6);
    const L=Math.max(.5,Math.min(tx,tz,ty));
    cone.lookAt(beam.target.position); cone.scale.setScalar(L);
    VU.uD.value.copy(D); VU.uL.value=L; VU.uPx.value=G.px;
    ring.lookAt(beam.target.position); ring.rotateY(Math.PI/2);
    halo.quaternion.copy(CAM.gal.quaternion);
    const face=Math.max(0,D.dot(_v.subVectors(CAM.gal.position,S0).normalize()));
    haloM.uniforms.uK.value=.55+2.4*Math.pow(face,12);
    W.U.uPhA.value=((a%TAU)+TAU)%TAU; W.U.uPhY.value=SY;
  }};
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
    /* the next room brightens as you come to it, so Pharos keeps its dark */
    const lk=lerp(.45,1,sstep(3.3,3.85,s)); shaftL.intensity=9000*lk; glowL.intensity=20*lk; W.roomLights[3].intensity=5*lk;
    const y=.02+3.0*E.io2(inv(3.3,4,s))+.35*sstep(4,4.5,s)*0+Math.pow(Math.max(0,s-4)/.5,2.2)*30;
    rocket.position.y=damp(rocket.position.y,y+Math.sin(t*.8)*.04*sstep(3.6,4,s),4,dt);
    rocket.rotation.y+=dt*.05;
    flameM.uniforms.uK.value=sstep(.3,1.2,rocket.position.y)*.9;
    dm.uniforms.uPx.value=G.px;
  }};
}

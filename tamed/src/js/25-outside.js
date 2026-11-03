/* ================= OUTSIDE: THE PAVILION IN STILL WATER =================
   One list of stone parts builds both the meshes and a signed distance function (GLSL) of the same shapes,
   so ambient occlusion is computed per pixel against the real architecture: arch reveals, corners, steps. */
function Builder(){
  const B={geos:[], sdf:[]};
  const fx=x=>{ const v=(+x).toFixed(3); return v.indexOf('.')<0?v+'.':v; };
  B.box=(x0,x1,y0,y1,z0,z1,o={})=>{ B.geos.push(boxGeo(x0,x1,y0,y1,z0,z1));
    if(!o.nosdf) B.sdf.push(`d=min(d,sdBox(p-vec3(${f3([(x0+x1)/2,(y0+y1)/2,(z0+z1)/2])}),vec3(${f3([(x1-x0)/2,(y1-y0)/2,(z1-z0)/2])})));`); };
  /* a slab with arch openings rising from its base; axis 'x' runs along x (faces +-z), axis 'z' runs along z */
  B.wall=(axis,a0,a1,y0,y1,t0,t1,arches=[],holes=[])=>{
    const s=new T.Shape(); s.moveTo(a0,y0);
    const as=[...arches].sort((p,q)=>p.c-q.c);
    for(const a of as){ const r=a.w/2; s.lineTo(a.c-r,y0); s.lineTo(a.c-r,y0+a.hs); s.absarc(a.c,y0+a.hs,r,Math.PI,0,true); s.lineTo(a.c+r,y0); }
    s.lineTo(a1,y0); s.lineTo(a1,y1); s.lineTo(a0,y1); s.lineTo(a0,y0);
    for(const h of holes){ const p=new T.Path(); p.absarc(h.c,h.y,h.r,0,TAU,false); s.holes.push(p); }
    const g=new T.ExtrudeGeometry(s,{depth:t1-t0,bevelEnabled:false,curveSegments:30});
    if(axis==='x') g.translate(0,0,t0); else { g.rotateY(-Math.PI/2); g.translate(t1,0,0); }
    B.geos.push(g);
    const c=axis==='x'?[(a0+a1)/2,(y0+y1)/2,(t0+t1)/2]:[(t0+t1)/2,(y0+y1)/2,(a0+a1)/2], h=axis==='x'?[(a1-a0)/2,(y1-y0)/2,(t1-t0)/2]:[(t1-t0)/2,(y1-y0)/2,(a1-a0)/2];
    const along=axis==='x'?'p.x':'p.z';
    let code=`{ float w=sdBox(p-vec3(${f3(c)}),vec3(${f3(h)})); if(w<d&&w<1.25){ float o=1e5;`;
    for(const a of as) code+=` o=min(o,archO(${along}-(${fx(a.c)}),p.y-(${fx(y0+a.hs)}),${fx(a.w/2)}));`;
    for(const q of holes) code+=` o=min(o,length(vec2(${along},p.y)-vec2(${fx(q.c)},${fx(q.y)}))-${fx(q.r)});`;
    code+=` d=min(d,max(w,-o)); } }`; B.sdf.push(code);
  };
  B.raw=code=>B.sdf.push(code);
  B.glsl=()=>'float mapAO(vec3 p){ float d=p.y+1.2;\n'+B.sdf.join('\n')+'\nreturn d; }';
  return B;
}

const Y0=.32;            // the stone floor, a hand's width above the water
const POOL={x0:-7.6,x1:8.6,z0:-14,z1:-6.4};
const PEOPLE_AT=[[7.35,-12.55],[7.35,-10.2],[7.35,-7.85]];   // waist deep at the east end of the pool, facing the sunset
const FAR_ARCH={z:-10.2,x:-11.5};                            // on the pool's axis: the last light comes straight down it

function buildOutside(){
  const W={name:'out', scene:new T.Scene(), U:sceneU(), t:0};
  const sc=W.scene;
  const B=Builder();
  /* terrace with the pool cut into it */
  B.box(-14,14,-1.2,Y0,POOL.z1,11.2,{nosdf:1}); B.box(-14,14,-1.2,Y0,-21.4,POOL.z0,{nosdf:1});
  B.box(-14,POOL.x0,-1.2,Y0,POOL.z0,POOL.z1,{nosdf:1}); B.box(POOL.x1,14,-1.2,Y0,POOL.z0,POOL.z1,{nosdf:1});
  B.raw(`d=min(d,max(sdBox(p-vec3(0.,-.44,-5.1),vec3(14.,.76,16.3)),-sdBox(p-vec3(${((POOL.x0+POOL.x1)/2).toFixed(2)},0.,${((POOL.z0+POOL.z1)/2).toFixed(2)}),vec3(${((POOL.x1-POOL.x0)/2).toFixed(2)},1.,${((POOL.z1-POOL.z0)/2).toFixed(2)}))));`);
  /* steps down into the water at the front door, and at the far arch */
  B.box(-5.2,5.2,-1.2,.21,11.2,11.8); B.box(-5.2,5.2,-1.2,.1,11.8,12.4); B.box(-5.2,5.2,-1.2,0,12.4,13);
  B.box(-15.1,-14,-1.2,.2,FAR_ARCH.z-2,FAR_ARCH.z+2); B.box(-16.2,-15.1,-1.2,.08,FAR_ARCH.z-2,FAR_ARCH.z+2);
  /* front block: two low arcaded wings either side of a taller portal with a round window */
  const WA=[{c:-5.75,w:2.4,hs:3.45},{c:-9.15,w:2.4,hs:3.45}], WB=[{c:5.75,w:2.4,hs:3.45},{c:9.15,w:2.4,hs:3.45}];
  B.wall('x',-12,-3.6,Y0,8.3,8,9,WA); B.wall('x',3.6,12,Y0,8.3,8,9,WB);
  B.wall('x',-3.6,3.6,Y0,10.5,8,9.45,[{c:0,w:3.4,hs:4.45}],[{c:0,y:8.3,r:1.02}]);
  B.box(-12.16,-3.6,Y0,.72,8.98,9.14); B.box(3.6,12.16,Y0,.72,8.98,9.14); B.box(-3.76,3.76,Y0,.72,9.43,9.6);
  B.box(-12.45,-3.6,8.3,8.62,.45,9.38); B.box(3.6,12.45,8.3,8.62,.45,9.38);
  B.box(-12.25,-3.6,8.62,8.95,.65,9.18); B.box(3.6,12.25,8.62,8.95,.65,9.18);
  B.box(-3.98,3.98,10.5,10.86,7.6,9.82); B.box(-3.8,3.8,10.86,11.16,7.8,9.6);
  B.box(-12.12,-3.6,5.92,6.08,8.98,9.12); B.box(3.6,12.12,5.92,6.08,8.98,9.12); B.box(-3.74,3.74,6.86,7.0,9.43,9.58);
  B.box(-12.2,-11.45,Y0,8.3,8.98,9.12); B.box(11.45,12.2,Y0,8.3,8.98,9.12); B.box(-3.74,-3.6,Y0,10.5,9.0,9.58); B.box(3.6,3.74,Y0,10.5,9.0,9.58);
  B.box(-3.6,3.6,8.3,10.5,4.6,8);
  B.wall('x',-11,11,Y0,8.3,4.6,5.6,[{c:0,w:3.4,hs:4.45}]);
  B.box(-11,11,6.55,8.3,5.6,8);
  B.wall('z',.6,9,Y0,8.3,-12,-11); B.wall('z',.6,9,Y0,8.3,11,12);
  B.box(-11,-3.4,Y0,8.3,1.6,4.6); B.box(3.4,11,Y0,8.3,1.6,4.6);
  B.box(-3.4,3.4,6.95,8.3,1.6,4.6); B.box(-3.4,3.4,Y0,6.95,1.6,2.5);
  B.wall('x',-12,12,Y0,8.3,.6,1.6,[{c:0,w:3.4,hs:4.45}]);
  /* the courtyard: an open arcade to the west lets the sunset in; a lower east wall of niches catches it; benches by the pool */
  const CA=[{c:-2.2,w:2.6,hs:3.4},{c:-6,w:2.6,hs:3.4},{c:FAR_ARCH.z,w:3.4,hs:4.3},{c:-14.4,w:2.6,hs:3.4},{c:-18.2,w:2.6,hs:3.4}];
  B.wall('z',-21.4,.6,Y0,6.9,-12,-11,CA); B.box(-12.2,-10.8,6.9,7.22,-21.6,.8);
  const CE=[{c:-2.2,w:2.4,hs:2.3},{c:-6,w:2.4,hs:2.3},{c:FAR_ARCH.z,w:2.8,hs:2.5},{c:-14.4,w:2.4,hs:2.3},{c:-18.2,w:2.4,hs:2.3}];
  B.wall('z',-21.4,.6,Y0,4.8,11,11.55,CE); B.box(11.55,12,Y0,4.8,-21.4,.6); B.box(10.84,12.2,4.8,5.1,-21.6,.8);
  B.wall('x',-11,11,Y0,4.8,-21.4,-20.4); B.box(-11,11,4.8,5.1,-21.6,-20.2);
  B.box(-5.2,5.2,Y0,.76,-15.6,-15); B.box(-5.2,5.2,Y0,.76,-5.4,-4.8);
  W.sdfGLSL=B.glsl();

  const stone=stoneMat({U:W.U, sdf:W.sdfGLSL, key:'out', color:'#F3ECE2', rough:.9, joint:1,
    albedo:'{ float lg=step(4.6,vWP.z)*step(vWP.z,8.01)*step(abs(vWP.x),11.01)*step(vWP.y,6.56); diffuseColor.rgb*=mix(1.,.58,lg); float wet=1.-smoothstep(.02,.55,vWP.y); diffuseColor.rgb*=mix(1.,.74,wet*(1.-step(.9,wN.y))); if(abs(wN.y)<.5){ float u=abs(wN.x)>.5?vWP.z:vWP.x; float st=vnoise(vec2(u*2.3,vWP.y*.16))*vnoise(vec2(u*7.,vWP.y*.5)); diffuseColor.rgb*=1.-.1*smoothstep(.25,.6,st); } }'});
  const arch=new T.Mesh(mergeGeos(B.geos),stone); arch.castShadow=arch.receiveShadow=true; sc.add(arch);

  /* the dark inside of the doors, with the gallery's first light glowing at the end */
  const glowM=new T.ShaderMaterial({uniforms:{uC:{value:col('#9DB9F4')}},vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform vec3 uC; varying vec2 vUv; void main(){ vec2 q=vUv-vec2(.5,.16); float g=exp(-dot(q*vec2(1.7,1.3),q*vec2(1.7,1.3))*4.)*.13+exp(-pow(q.x*3.2,2.))*smoothstep(.95,.0,vUv.y)*.035; gl_FragColor=vec4(uC*g+vec3(.006,.006,.008),1.); }`});
  const glow=new T.Mesh(new T.PlaneGeometry(3.4,6.6),glowM); glow.position.set(0,3.6,2.52); sc.add(glow);

  /* stepping stones: across the water to the front door, and out from the far arch toward the sunset */
  const stones=[];
  const slab=(w,d,top)=>{ const sh=new T.Shape(), r=Math.min(w,d)*.22; sh.moveTo(-w/2+r,-d/2); sh.lineTo(w/2-r,-d/2); sh.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r); sh.lineTo(w/2,d/2-r); sh.quadraticCurveTo(w/2,d/2,w/2-r,d/2);
    sh.lineTo(-w/2+r,d/2); sh.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r); sh.lineTo(-w/2,-d/2+r); sh.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
    const g=new T.ExtrudeGeometry(sh,{depth:.5,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:3,curveSegments:5}); g.rotateX(-Math.PI/2); g.translate(0,top-.6,0); return g; };
  const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  const homePath=[]; for(let i=0;i<22;i++){ const u=i/21, z=13.9+u*64; homePath.push([-4.2*Math.pow(u,1.3)+.9*Math.sin(u*Math.PI*1.6)*(1-u)+(rnd()-.5)*.25,z]); }
  homePath.forEach(([x,z],i)=>{ const w=.92+rnd()*.25, d=.7+rnd()*.16; const g=slab(w,d,.035+rnd()*.02); g.rotateY((rnd()-.5)*.5); g.translate(x,0,z); stones.push(g); });
  for(let i=0;i<16;i++){ const x=-17.6-i*3.0-i*i*.07, z=FAR_ARCH.z+Math.sin(i*.6)*.45-i*.08; const w=.95+rnd()*.25, d=.75+rnd()*.2;
    const g=slab(w,d,.035+rnd()*.02); g.rotateY((rnd()-.5)*.4); g.translate(x,0,z); stones.push(g); }
  const stoneM=stoneMat({U:W.U, sdf:'float mapAO(vec3 p){return p.y+.01;}', key:'stones', color:'#BFB3A4', rough:.9, joint:0, albedo:'diffuseColor.rgb*=mix(.55,1.,smoothstep(-.02,.05,vWP.y));'});
  const st=new T.Mesh(mergeGeos(stones),stoneM); st.receiveShadow=true; st.castShadow=true; sc.add(st);

  /* far shore: low hills deep in the haze */
  {
    const N=220, P=[], I=[];
    for(let i=0;i<=N;i++){ const a=i/N*TAU, r=760; const h=10+14*Math.pow(Math.sin(a*3.1+1.2)*.5+.5,2)+9*Math.sin(a*7.3+.4)*Math.sin(a*2.1)+5*Math.sin(a*17.)*.5;
      P.push(Math.cos(a)*r,-2,Math.sin(a)*r, Math.cos(a)*r,Math.max(2,h),Math.sin(a)*r); if(i<N){ const k=i*2; I.push(k,k+1,k+2, k+1,k+3,k+2); } }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setIndex(I);
    W.shoreMat=new T.ShaderMaterial({uniforms:Object.assign({uShore:{value:new T.Color('#9A9386')}},W.U),side:T.DoubleSide,
      vertexShader:`varying vec3 vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform vec3 uShore; varying vec3 vWP; ${GLSL.haze} void main(){ gl_FragColor=vec4(haze(uShore,vWP),1.); }`});
    const m=new T.Mesh(g,W.shoreMat); m.frustumCulled=false; sc.add(m);
  }

  /* sky */
  W.sky=new T.Mesh(new T.SphereGeometry(900,48,24),skyMat()); W.sky.frustumCulled=false; W.sky.renderOrder=900; sc.add(W.sky);

  /* light: the low sun with soft shadows, the sky's own light, and the warm water bouncing it back */
  W.sun=new T.DirectionalLight('#FFE7C6',3); W.sun.castShadow=true;
  const sh=W.sun.shadow; sh.mapSize.set(QL.shadow,QL.shadow); sh.bias=-.0004; sh.normalBias=.045; sh.radius=3;
  const oc=sh.camera; oc.left=-30; oc.right=30; oc.top=30; oc.bottom=-30; oc.near=1; oc.far=180;
  W.sunT=new T.Object3D(); W.sunT.position.set(0,0,-4); sc.add(W.sunT); W.sun.target=W.sunT; sc.add(W.sun);
  W.hemi=new T.HemisphereLight('#C9DAF0','#DDBB95',.9); sc.add(W.hemi);

  /* water */
  W.mirror=new Mirror(QL.refl);
  W.sim=makeSim();
  W.waterMat=waterMat(W.U,W.mirror,W.sim);
  W.water=new T.Mesh(new T.PlaneGeometry(1800,1800,1,1),W.waterMat); W.water.rotation.x=-Math.PI/2; W.water.frustumCulled=false; sc.add(W.water);

  /* tall grass at the edges */
  W.grass=makeGrass(W.U,[
    {x:-11.5,z:84,rx:4.6,rz:5.4,n:1050,h:2.1},{x:-21,z:66,rx:6,rz:6,n:1300,h:1.5},{x:10.5,z:70,rx:4.5,rz:5.5,n:1100,h:1.45},{x:4.5,z:90,rx:1.4,rz:1.6,n:220,h:1.2},{x:-26,z:46,rx:5,rz:6,n:700},{x:19,z:42,rx:5,rz:6,n:700},{x:-21,z:26,rx:4,rz:5,n:500},{x:17,z:22,rx:4,rz:5,n:500},{x:-16.5,z:9,rx:2.8,rz:4.5,n:420},{x:16.2,z:7,rx:2.6,rz:5,n:420},
    {x:-35,z:2,rx:6,rz:4.5,n:900},{x:-36,z:-19,rx:6.5,rz:4.5,n:900},{x:-58,z:-2,rx:3.5,rz:2.5,n:300},{x:-62,z:-15,rx:4,rz:2.5,n:320},
    {x:-10.2,z:-19.6,rx:.8,rz:.7,n:70,h:.7},{x:10.3,z:-19.7,rx:.7,rz:.7,n:60,h:.6},{x:-10.2,z:-.4,rx:.8,rz:.6,n:60,h:.7},{x:10.3,z:-.3,rx:.7,rz:.6,n:60,h:.6},
    {x:24,z:-6,rx:4,rz:7,n:500},{x:-25,z:-30,rx:5,rz:4,n:400}]);
  sc.add(W.grass.mesh);

  /* drifting seeds in the light */
  W.seeds=makeSeeds(W.U,QL.seeds); sc.add(W.seeds.mesh);

  /* the three of us: only reflections at first, standing waist deep at the far end of the pool */
  W.people=PHOTOS.map((src,i)=>{
    const tex=new T.TextureLoader().load(src); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=4;
    const m=new T.ShaderMaterial({uniforms:Object.assign({tPhoto:{value:tex},uReveal:{value:0},uTintP:{value:new T.Color(1,1,1)},uSeed:{value:i*3.7},uRefl:GU.uRefl,uTime:GU.uTime},W.U),
      transparent:true, depthWrite:false, side:T.DoubleSide,
      vertexShader:`varying vec2 vUv; varying vec3 vWP; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform sampler2D tPhoto; uniform float uReveal,uRefl,uTime,uSeed; uniform vec3 uTintP; varying vec2 vUv; varying vec3 vWP;
      ${GLSL.noise}${GLSL.haze}
      void main(){
        vec4 tx=texture2D(tPhoto,vUv); float a=tx.a; vec3 c=tx.rgb*uTintP;
        if(uRefl<.5){
          float n=vnoise(vec2(vUv.x*14.+uSeed,uTime*.7))*.6+vnoise(vec2(vUv.x*41.,uTime*1.3+uSeed))*.4;
          float edge=uReveal*1.12-.06+(n-.5)*.07;
          a*=smoothstep(edge+.012,edge-.012,vUv.y);
          float rim=smoothstep(.03,0.,abs(vUv.y-edge))*step(.002,uReveal)*(1.-smoothstep(.97,1.,uReveal));
          c+=vec3(1.,.86,.66)*rim*2.2*tx.a;
          a=max(a,rim*tx.a*.8);
        } else { c*=vec3(.82,.84,.86); }
        if(a<.004) discard;
        gl_FragColor=vec4(haze(c,vWP),a);
      }`});
    const h=1.5, w=h*360/468;
    const g=new T.PlaneGeometry(w,h); g.translate(0,h/2-.02,0);
    const mesh=new T.Mesh(g,m); mesh.position.set(PEOPLE_AT[i][0],0,PEOPLE_AT[i][1]); mesh.rotation.y=-Math.PI/2; mesh.renderOrder=5; sc.add(mesh);
    return {mesh,mat:m,reveal:0,target:0,w,h,i,last:0};
  });

  /* sunbeams: the last light streaming through each arch of the west arcade, dust turning in it */
  W.beamMat=new T.ShaderMaterial({uniforms:Object.assign({uK:{value:0},uTime:GU.uTime,uCol:{value:new T.Color('#FFC890')}},W.U),transparent:true,depthWrite:false,side:T.DoubleSide,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
    vertexShader:`attribute float aL; varying float vL; varying vec3 vWP; varying vec3 vN; void main(){ vL=aL; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uK,uTime; uniform vec3 uCol; varying float vL; varying vec3 vWP; varying vec3 vN; ${GLSL.noise}${GLSL.haze.split('vec3 haze')[0]}
    void main(){ vec3 V=normalize(vWP-cameraPosition); float face=abs(dot(normalize(vN),V)); float look=pow(max(dot(V,uSunDir),0.),3.);
      float n=.55+.45*vnoise(vec2(vWP.z*1.3+uTime*.12,vWP.y*1.6-uTime*.08)+vWP.x*.07);
      float a=pow(1.-vL,1.6)*smoothstep(0.,.04,vL)*(.25+.75*face)*(.16+1.6*look)*n;
      gl_FragColor=vec4(uCol*a*.055*uK,1.); }`});
  const beams=[];
  for(const a of CA){ const r=a.w/2-.05, sp=a.hs, sh=new T.Shape(); sh.moveTo(-r,0); sh.lineTo(-r,sp); sh.absarc(0,sp,r,Math.PI,0,true); sh.lineTo(r,0); sh.lineTo(-r,0);
    const L=24, g=new T.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false,curveSegments:16,steps:1});
    const pos=g.attributes.position, al=new Float32Array(pos.count); for(let i=0;i<pos.count;i++) al[i]=pos.getZ(i)/L; g.setAttribute('aL',new T.BufferAttribute(al,1));
    g.rotateY(Math.PI/2); const m=new T.Mesh(g,W.beamMat); m.position.set(-11.6,Y0,a.c); m.frustumCulled=false; m.renderOrder=960; sc.add(m); beams.push(m); }
  W.beams=beams;
  W.hideInMirror=[W.water,W.seeds.mesh,...beams];
  W.update=(dt,st)=>{
    { const gu=W.grass.mat.uniforms; gu.uMouseK.value=damp(gu.uMouseK.value,M.on&&S.mode==='world'?1:0,4,dt); gu.uMouseN.value.set(M.x/innerWidth*2-1,-(M.y/innerHeight*2-1)); gu.uAsp.value=innerWidth/innerHeight; const c=CAM.out; c.updateMatrixWorld(); gu.uVP.value.multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse); gu.uRight.value.setFromMatrixColumn(c.matrixWorld,0); }
    W.grass.mat.uniforms.uTime.value+=dt*S.timeScale; W.seeds.mat.uniforms.uTime.value+=dt*S.timeScale;
    for(const p of W.people){ const prev=p.reveal; p.reveal=damp(p.reveal,p.target,p.target>p.reveal?2.6:1.5,dt); p.mat.uniforms.uReveal.value=p.reveal;
      if((prev<.06&&p.reveal>=.06)||(prev>.9&&p.reveal<=.9)){ W.sim.drop(p.mesh.position.x-.2,p.mesh.position.z,.7,-1.4); } }
  };
  W.applyLight=(tod,tint)=>{ applyOutsideLight(W,tod,tint);
    const k=sstep(4.45,4.8,S.s)*(1-sstep(5.85,6.1,S.s))*sstep(-.5,1.5,SUN.el); W.beamMat.uniforms.uK.value=k;
    const yaw=Math.atan2(SUN.dir.z,-SUN.dir.x), pitch=Math.asin(clamp(SUN.dir.y,-1,1));
    for(const b of W.beams){ b.visible=k>.001; b.rotation.set(0,yaw,-pitch,'YZX'); } };
  W.render=(cam,target)=>{
    W.sky.position.copy(cam.position);
    renderer.shadowMap.needsUpdate=true;
    W.mirror.render(sc,cam,W.hideInMirror);
    W.waterMat.uniforms.tSim.value=W.sim.tex;
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(sc,cam);
  };
  W.setSize=(w,h)=>W.mirror.setSize(w,h);
  return W;
}

function applyOutsideLight(W,tod,tint){
  const U=W.U, sky=W.sky.material.uniforms;
  U.uSunDir.value.copy(SUN.dir); sky.uSunDir.value.copy(SUN.dir);
  sky.uMid.value.copy(TODC.mid); sky.uZen.value.copy(TODC.zen); sky.uHor.value.copy(TODC.hor); sky.uHorS.value.copy(TODC.horS); sky.uGlow.value.copy(TODC.glow);
  sky.uSun.value.copy(TODC.sun); sky.uBelt.value.copy(TODC.belt); sky.uBeltK.value=tod.beltK; sky.uCl.value.copy(TODC.cl); sky.uCs.value.copy(TODC.cs);
  sky.uSunK.value=sstep(-2.2,-.2,SUN.el);
  W.sun.color.copy(TODC.L); W.sun.intensity=tod.Li*sstep(-1.2,1.2,SUN.el);
  W.sun.position.copy(W.sunT.position).addScaledVector(SUN.dir,90);
  W.hemi.color.copy(TODC.sky); W.hemi.groundColor.copy(TODC.gnd); W.hemi.intensity=tod.hi;
  U.uHazeCol.value.copy(TODC.haze); U.uHazeSun.value.copy(TODC.hazeS);
  const wm=W.waterMat.uniforms; wm.uSunCol.value.copy(TODC.sun).multiplyScalar(sstep(-1.5,1,SUN.el)); wm.uSky.value.copy(TODC.zen);
  W.shoreMat.uniforms.uShore.value.copy(TODC.haze).lerp(TODC.zen,.35).multiplyScalar(.8);
  const gm=W.grass.mat.uniforms; gm.uSunCol.value.copy(TODC.L).multiplyScalar(tod.Li/3*sstep(-1.5,1.5,SUN.el)); gm.uAmb.value.copy(TODC.sky).multiplyScalar(.36*tod.hi).lerp(TODC.gnd,.25);
  W.seeds.mat.uniforms.uCol.value.copy(TODC.sun).lerp(TODC.glow,.4);
  for(const p of W.people) p.mat.uniforms.uTintP.value.set(1,1,1).lerp(TODC.L,.3).multiplyScalar(1.02);
}

/* ---------- grass: instanced blades bending in a slow travelling wind ---------- */
function makeGrass(U,clumps){
  const SEG=5, P=[], I=[];
  for(let i=0;i<=SEG;i++){ const t=i/SEG; P.push(-.5,t,0, .5,t,0); if(i<SEG){ const k=i*2; I.push(k,k+1,k+2, k+1,k+3,k+2); } }
  const base=new T.BufferGeometry(); base.setAttribute('position',new T.Float32BufferAttribute(P,3)); base.setIndex(I);
  const g=new T.InstancedBufferGeometry(); g.index=base.index; g.attributes.position=base.attributes.position;
  let n=0; clumps.forEach(c=>n+=Math.round(c.n*QL.grass));
  const off=new Float32Array(n*4), rnd=new Float32Array(n*4); let k=0;
  const R=(()=>{let s=11;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(const c of clumps){ const m=Math.round(c.n*QL.grass);
    for(let i=0;i<m;i++){ let x,z,r; do{ x=(R()*2-1); z=(R()*2-1); r=x*x+z*z; }while(r>1);
      const edge=1-Math.sqrt(r);
      off[k*4]=c.x+x*c.rx; off[k*4+1]=c.z+z*c.rz; off[k*4+2]=(c.h||1.25)*(.3+.9*Math.pow(edge,.6)*(.45+R()*.75)); off[k*4+3]=R()*TAU;
      rnd[k*4]=R(); rnd[k*4+1]=(R()-.5)*.7; rnd[k*4+2]=.016+R()*.026; rnd[k*4+3]=R(); k++; } }
  g.setAttribute('aOff',new T.InstancedBufferAttribute(off,4)); g.setAttribute('aRnd',new T.InstancedBufferAttribute(rnd,4)); g.instanceCount=n;
  g.boundingSphere=new T.Sphere(v3(0,0,0),1e4);
  const mat=new T.ShaderMaterial({uniforms:Object.assign({uTime:{value:0},uWind:{value:1},uSunCol:{value:new T.Color('#FFE0B0')},uAmb:{value:new T.Color('#8090A0')},
      uBase:{value:col('#35321F')},uMid:{value:col('#8C7A48')},uTip:{value:col('#EFD9A8')},uMouseN:{value:new T.Vector2(9,9)},uMouseK:{value:0},uAsp:{value:1},uVP:{value:new T.Matrix4()},uRight:{value:v3(1,0,0)}},U),
    side:T.DoubleSide,
    vertexShader:`attribute vec4 aOff; attribute vec4 aRnd; uniform float uTime,uWind,uMouseK,uAsp; uniform vec2 uMouseN; uniform mat4 uVP; uniform vec3 uRight; varying float vT; varying vec3 vWP; varying float vH; varying vec3 vN;
    ${GLSL.noise}
    void main(){
      float t=position.y; float H=aOff.z; float ang=aOff.w;
      vec2 dir=vec2(cos(ang),sin(ang));
      vec2 wd=normalize(vec2(.8,.35));
      float gust=vnoise(aOff.xy*.09-wd*uTime*.55)*.9+vnoise(aOff.xy*.3-wd*uTime*1.3)*.4;
      float sway=sin(uTime*1.6+aRnd.x*6.283+aOff.x*.4)*.12+(gust-.55)*.9;
      float bend=(aRnd.y*2.1+.32+sway*uWind)*pow(t,1.6);
      vec2 bd=normalize(wd+vec2(cos(aRnd.x*9.),sin(aRnd.x*9.))*.5);
      float w=aRnd.z*(1.-t*.94);
      vec3 p=vec3(aOff.x,-.12,aOff.y)+vec3(dir.x*position.x*w,t*H*(1.-.18*bend*bend),dir.y*position.x*w)+vec3(bd.x,0.,bd.y)*bend*H*.55;
      /* the hand brushes the reeds: blades near the cursor lean away from it */
      if(uMouseK>0.){ vec4 cl=uVP*vec4(p,1.); vec2 nd=cl.xy/cl.w-uMouseN; nd.x*=uAsp; float r=length(nd);
        float f=smoothstep(.2,0.,r)*t*t*uMouseK*step(0.,cl.w);
        p+=uRight*(nd.x/max(r,1e-3))*f*H*.45; p.y-=f*H*.12; }
      vT=t; vH=aRnd.w; vWP=p; vN=normalize(vec3(-dir.y,.35,dir.x));
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
    }`,
    fragmentShader:`uniform vec3 uSunCol,uAmb,uBase,uMid,uTip; varying float vT; varying vec3 vWP; varying float vH; varying vec3 vN;
    ${GLSL.haze}
    void main(){
      vec3 c=mix(uBase,uMid,smoothstep(0.,.5,vT)); c=mix(c,uTip,smoothstep(.5,1.,vT)); c=mix(c,c*vec3(1.08,1.,.82),step(.7,vH)); c=mix(c,vec3(dot(c,vec3(.33))),.18*step(vH,.25)); c*=.78+.42*vH;
      vec3 V=normalize(vWP-cameraPosition);
      float dif=.45+.55*abs(dot(normalize(vN),uSunDir));
      float back=pow(max(dot(V,uSunDir),0.),3.)*smoothstep(.3,1.,vT);
      vec3 l=c*(uAmb+uSunCol*dif*.85)+uSunCol*uTip*back*1.3;
      l*=mix(.55,1.,smoothstep(0.,.35,vT));
      gl_FragColor=vec4(haze(l,vWP),1.);
    }`});
  const mesh=new T.Mesh(g,mat); mesh.frustumCulled=false;
  return {mesh,mat};
}

/* ---------- seeds and dust: drifting points that catch the sun ---------- */
function makeSeeds(U,N){
  const g=new T.BufferGeometry(), r=new Float32Array(N*4), p=new Float32Array(N*3);
  for(let i=0;i<N*4;i++) r[i]=Math.random();
  g.setAttribute('position',new T.BufferAttribute(p,3)); g.setAttribute('aR',new T.BufferAttribute(r,4)); g.boundingSphere=new T.Sphere(v3(),1e5);
  const mat=new T.ShaderMaterial({uniforms:Object.assign({uTime:{value:0},uPx:{value:600},uBox:{value:v3(56,11,56)},uSize:{value:.055},uCol:{value:new T.Color('#FFEED6')},uK:{value:1}},U),
    transparent:true, depthWrite:false, blending:T.CustomBlending, blendEquation:T.AddEquation, blendSrc:T.OneFactor, blendDst:T.OneFactor, blendSrcAlpha:T.ZeroFactor, blendDstAlpha:T.OneFactor,
    vertexShader:`attribute vec4 aR; uniform float uTime,uPx,uSize; uniform vec3 uBox; varying float vA; ${GLSL.haze.split('vec3 haze')[0]}
    void main(){
      vec3 p=aR.xyz*uBox;
      float t=uTime;
      p+=vec3(t*.42,t*.05,t*.16)+vec3(sin(t*.45+aR.y*20.),sin(t*.37+aR.x*17.)*.6,sin(t*.41+aR.z*13.))*.7;
      vec3 c=cameraPosition;
      p.xz=mod(p.xz-c.xz+uBox.xz*.5,uBox.xz)-uBox.xz*.5+c.xz;
      p.y=mod(p.y,uBox.y)+.25;
      vec4 mv=viewMatrix*vec4(p,1.); float d=-mv.z;
      gl_PointSize=clamp(uSize*(.45+aR.w*1.1)*uPx/max(d,.1),1.,38.);
      vec3 dir=normalize(p-c); float fs=pow(max(dot(dir,uSunDir),0.),5.);
      vA=smoothstep(.6,2.2,d)*(1.-smoothstep(21.,27.,length(p.xz-c.xz)))*(.75+2.4*fs+.5*aR.z)*smoothstep(.1,.5,p.y);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying float vA; void main(){ vec2 q=gl_PointCoord-.5; float d=length(q); float a=smoothstep(.5,.0,d); a=a*a*.7+smoothstep(.18,.0,d)*.6; gl_FragColor=vec4(uCol*a*vA*uK*.8,1.); }`});
  const mesh=new T.Points(g,mat); mesh.frustumCulled=false; mesh.renderOrder=950;
  return {mesh,mat};
}

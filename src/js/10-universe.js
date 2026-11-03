/* ================= UNIVERSE (hub scene) ================= */
const U={scene:new T.Scene()};
const GM=60, RB=31;
U.scene.add(BH.back); U.scene.add(BH.occ);

/* stations, coloured by temperature on the same blackbody scale as the disk, evenly spaced from 9.5 to 27.5 */
const STA=[
  {id:'kr',name:'Kríos',game:'Read the Room',R:9.5,ph:.4,K:24000,color:'#A5C3FF'},
  {id:'ae',name:'Aetos',game:'Hold the Sky',R:13.1,ph:4.3,K:6600,color:'#F2EEE6'},
  {id:'ph',name:'Pharos',game:'Lost Signal',R:16.7,ph:1.1,K:4300,color:'#FFD5B3'},
  {id:'og',name:'Ogive',game:'Apogee',R:20.3,ph:3.3,K:3100,color:'#FFB475'},
  {id:'be',name:'Beacon',game:'Join · contact',R:27.5,ph:.2,K:1850,color:'#FF8100'}
];
const NST=STA.length, BEACON=STA.find(s=>s.id==='be');
/* noise for Earth, the world past the horizon */
const EARTH_GLSL=`
float eh(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float en(vec3 x){ vec3 i=floor(x),f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(eh(i),eh(i+vec3(1,0,0)),f.x),mix(eh(i+vec3(0,1,0)),eh(i+vec3(1,1,0)),f.x),f.y),mix(mix(eh(i+vec3(0,0,1)),eh(i+vec3(1,0,1)),f.x),mix(eh(i+vec3(0,1,1)),eh(i+vec3(1,1,1)),f.x),f.y),f.z); }
float efbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*en(p); p*=2.1; a*=.5; } return s; }
float eland(vec3 d){ return efbm(d*2.3+vec3(3.1,1.7,.4))+.5*smoothstep(.8,.93,d.y)-.53; }`;

/* spacetime grid: a polar mesh outside the disk, dented by every mass */
{
  const v=[];
  for(let r=7.5;r<=31;r+=1.25){ const N=Math.max(80,Math.floor(r*9)); for(let k=0;k<N;k++){ const a0=k/N*TAU,a1=(k+1)/N*TAU; v.push(Math.cos(a0)*r,0,Math.sin(a0)*r,Math.cos(a1)*r,0,Math.sin(a1)*r); } }
  for(let s=0;s<56;s++){ const a=s/56*TAU; for(let k=0;k<60;k++){ const r0=7.5+k*.4, r1=7.5+(k+1)*.4; v.push(Math.cos(a)*r0,0,Math.sin(a)*r0,Math.cos(a)*r1,0,Math.sin(a)*r1); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  U.gridU={uTime:G.uTime,uProbe:{value:new T.Vector3(99,0,99)},uSt:{value:[...Array(NST)].map(()=>new T.Vector3(99,0,99))},uOp:{value:0},uShock:{value:-9},uC:{value:new T.Color('#B9A58E')}};
  U.grid=new T.LineSegments(g,new T.ShaderMaterial({uniforms:U.gridU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform vec3 uProbe; uniform vec3 uSt[${NST}]; uniform float uTime,uOp,uShock; varying float vA;
    void main(){ vec3 p=position; float r=length(p.xz); float y=-1.4-14./(r+1.5);
      float d=length(p.xz-uProbe.xz); y-=.9*exp(-d*d*.5);
      for(int i=0;i<${NST};i++){ float ds=length(p.xz-uSt[i].xz); y-=.8*exp(-ds*ds*.3); }
      // the seal breaking sends one wave out across the whole system
      float sk=uShock>0.?exp(-pow(r-uShock,2.)*.7)*smoothstep(31.,20.,uShock):0.; y-=.7*sk;
      p.y=y; float wv=pow(.5+.5*sin(r*.7-uTime*1.1),12.);
      float dc=distance((modelMatrix*vec4(p,1.)).xyz,cameraPosition);
      vA=uOp*((.045+.14*wv)*smoothstep(31.,20.,r)*smoothstep(7.5,10.5,r)+.24*exp(-d*d*.1)+.7*sk*smoothstep(7.,9.,r))*smoothstep(3.,9.,dc)*smoothstep(46.,20.,dc);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader:`uniform vec3 uC; varying float vA; void main(){ gl_FragColor=vec4(uC*vA,1.); }`}));
  U.grid.frustumCulled=false; U.scene.add(U.grid);
}

STA.forEach((s,si)=>{
  s.idx=si; s.w=Math.sqrt(GM/(s.R**3))*.28; s.pos=new T.Vector3(); s.vel=new T.Vector3(); s.a=s.ph; s.c=new T.Color(s.color);
  const g=new T.Group(); s.grp=g; g.visible=false; U.scene.add(g); s.anim=[];
  const C=s.color, add=m=>{ g.add(m); return m; };
  if(s.id==='kr'){ // glass sphere with a speaking waveform inside
    add(new T.Mesh(new T.SphereGeometry(.62,40,24),LM(C,{emit:.02,rim:1.4,amb:.02,op:.55})));
    const w=add(pts(cloud(1400,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*.42;o[1]=0;o[2]=Math.sin(a)*.42;}),PM({size:.05,color:C,body:'float a=atan(p.z,p.x); float k=1.+.45*sin(a*9.+uTime*6.)*sin(uTime*2.3)*sin(a*2.+uTime); p.xz*=k; p.y=.18*sin(a*14.-uTime*5.)*sin(uTime*1.7); b=1.3;'})));
    w.rotation.x=.3;
  }
  if(s.id==='ae'){ // a surveillance radar: a curved antenna turning on a pedestal, its beam sweeping a scope below
    const steel=LM('#a9a196',{rim:.7,amb:.06});
    add(new T.Mesh(new T.CylinderGeometry(.06,.15,.72,8),steel)).position.y=-.44;                      // pedestal
    add(new T.Mesh(new T.BoxGeometry(.3,.16,.22),steel)).position.set(0,-.74,.05);                   // equipment shelter
    add(new T.Mesh(new T.CylinderGeometry(.13,.13,.06,20),steel)).position.y=-.05;                   // turntable
    const head=new T.Group(); add(head);
    head.add(new T.Mesh(new T.BoxGeometry(.05,.2,.05),steel)).position.set(0,.08,-.02);              // yoke
    // the reflector: a slice of a cylinder, concave toward the feed, tilted up a little like an airport radar
    const RR=.72, SPAN=1.6, refl=new T.Mesh(new T.CylinderGeometry(RR,RR,.3,32,1,true,Math.PI-SPAN/2,SPAN),LM(C,{emit:.015,rim:.85,amb:.06}));
    refl.material.side=T.DoubleSide; refl.position.set(0,.2,RR-.12); refl.rotation.x=-.18; head.add(refl);
    const ribs=new T.LineSegments(new T.EdgesGeometry(refl.geometry,20),new T.LineBasicMaterial({color:C,transparent:true,opacity:.5})); ribs.position.copy(refl.position); ribs.rotation.copy(refl.rotation); head.add(ribs);
    head.add(new T.Mesh(new T.BoxGeometry(.012,.012,.36),steel)).position.set(0,.13,.08);             // feed strut
    head.add(new T.Mesh(new T.BoxGeometry(.07,.06,.06),LM(C,{emit:.4,rim:.8}))).position.set(0,.14,.27); // feed horn
    // the scope below: range rings, the sweep with its afterglow, and returns that flash as the beam crosses them
    const sweepU={uA:{value:0}}, SR=1.7;
    const scope=add(pts(cloud(Math.floor(1700*Q+500),(i,r,o)=>{ let rr, a=r[0]*TAU;
        if(i%5===0){ rr=(Math.floor(r[1]*3)+1)/3*SR; } else if(i%41===1){ rr=(.35+.6*r[2])*SR; } else rr=Math.sqrt(r[1])*SR;
        o[0]=Math.sin(a)*rr; o[1]=-.86; o[2]=Math.cos(a)*rr; }),
      PM({size:.05,color:C,uniforms:sweepU,decl:'uniform float uA;',body:`
        float a=atan(p.x,p.z); float d=mod(uA-a,6.2832); float rr=length(p.xz)/${SR.toFixed(2)};
        float sw=exp(-d*3.2), lead=exp(-d*28.), fr=fract(rr*3.+.5)-.5;
        b=.04+sw*(.25+.6*rr)+lead*.9;
        if(aR.z>.985){ b=.06+2.2*exp(-d*1.4); sz=1.6; col=mix(uCol,vec3(1.,.85,.6),.5); }
        else if(abs(fr)<.012){ b=.22+.6*sw; }`})));
    scope.renderOrder=1;
    // a fine rim so the scope reads as an instrument from any angle
    const rim=new T.LineLoop(ringGeo(SR,160,-.86),dashMat(C,'float a=.55;')); rim.material.uniforms.uOp.value=1; add(rim);
    s.anim.push(t=>{ const a=t*1.25; head.rotation.y=a; sweepU.uA.value=a; });
  }
  if(s.id==='ph'){ // lighthouse: pharos, the first one
    const tw=add(new T.Mesh(new T.CylinderGeometry(.16,.3,1.5,20,6),LM('#d9cfc2',{rim:.7}))); tw.position.y=-.2;
    for(let k=0;k<3;k++){ const band=add(new T.Mesh(new T.CylinderGeometry(.3-.045*(k*.5+.25)*1.0,.3-.045*(k*.5+.25),.12,20),LM('#5b2a1e',{rim:.4}))); band.position.y=-.75+k*.45; band.scale.setScalar(1.02-k*.1); }
    const lamp=add(new T.Mesh(new T.SphereGeometry(.17,20,14),LM(C,{emit:1.8,rim:.6}))); lamp.position.y=.66;
    const beam=add(pts(cloud(2600,(i,r,o)=>{const u=Math.pow(r[0],.7);const sp=u*.55;o[0]=u*5.5;o[1]=(r[1]-.5)*sp*.6;o[2]=(r[2]-.5)*sp;if(i%2){o[0]*=-1;}}),PM({size:.07,color:C,body:'b=.55*(1.-abs(p.x)/5.5);'})));
    beam.position.y=.66; s.anim.push(t=>{ beam.rotation.y=t*1.1; });
  }
  if(s.id==='og'){ // the rocket itself, standing on its exhaust
    const prof=[new T.Vector2(0,1.25)]; for(let k=1;k<=18;k++){ const u=k/18, L=.75, R=.16, rho=(R*R+L*L)/(2*R); const x=u*L; prof.push(new T.Vector2(Math.sqrt(Math.max(rho*rho-Math.pow(L-x,2),0))+R-rho,1.25-x)); }
    prof.push(new T.Vector2(.16,-.55)); prof.push(new T.Vector2(.11,-.62)); prof.push(new T.Vector2(0,-.62));
    add(new T.Mesh(new T.LatheGeometry(prof.reverse(),28),LM(C,{emit:.03,rim:1})));
    for(let k=0;k<4;k++){ const f=add(new T.Mesh(new T.BoxGeometry(.32,.38,.02),LM(C,{rim:.8}))); const a=k*Math.PI/2; f.position.set(Math.cos(a)*.3,-.42,Math.sin(a)*.3); f.rotation.y=-a; }
    add(pts(cloud(700,(i,r,o)=>{o[0]=gauss()*.04;o[1]=-.7-r[0]*1.6;o[2]=gauss()*.04;}),PM({size:.08,color:'#FFD39A',body:'float t=fract(aR.x-uTime*1.2); p.y=-.66-t*1.4; p.xz*=1.+t*4.; b=(1.-t)*1.1;'})));
  }
  if(s.id==='be'){ // a mast that keeps calling out
    add(new T.Mesh(new T.CylinderGeometry(.03,.12,2,10),LM('#b9ad9e',{rim:.6}))).position.y=0;
    const tip=add(new T.Mesh(new T.SphereGeometry(.09,16,10),LM(C,{emit:2.2}))); tip.position.y=1.05;
    add(pts(cloud(1800,(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=1.05;o[2]=Math.sin(a);}),PM({size:.05,color:C,body:'float t=fract(aR.y*.999+uTime*.35+floor(aR.y*3.)/3.); p.xz*=t*2.4; b=(1.-t)*.9;'})));
  }
  // soft halo, and a dock ring that only shows when you are close enough to dock
  g.add(pts(cloud(300,(i,r,o)=>{const v=[gauss(),gauss(),gauss()],l=Math.hypot(...v)||1,R=1.9+r[0]*.6;o[0]=v[0]/l*R;o[1]=v[1]/l*R;o[2]=v[2]/l*R;}),PM({size:.05,color:C,body:'b=.08;'})));
  s.orbit=new T.LineLoop(ringGeo(s.R,480),dashMat(C,`float df=mod(uAng-vAng,6.28318); float a=(.025+.45*exp(-df*2.))*step(.45,fract(vAng*uR*1.4));`)); s.orbit.material.uniforms.uR.value=s.R; U.scene.add(s.orbit);
  s.zone=new T.LineLoop(ringGeo(2.4,120),dashMat(C,`float a=.86*uNear*step(.5,fract(vAng*6.+uTime*(.3+uNear)));`)); g.add(s.zone);
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(new Float32Array([0,-.95,0,0,-3.2,0]),3)); tg.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  s.tether=new T.Line(tg,dashMat(C,'float a=0.;')); s.tether.visible=false; g.add(s.tether);
});

/* asteroid belt between Aetos and Pharos, lit only by the disk */
{
  const N=Math.floor(380*Q+120);
  U.belt=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),LM('#8c8070',{rim:.25,amb:.03,key:'#FFC392'}),N);
  const M=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), sc=new T.Vector3(), p=new T.Vector3();
  for(let i=0;i<N;i++){ const a=Math.random()*TAU, r=14.9+gauss()*.38; p.set(Math.cos(a)*r,gauss()*.12,Math.sin(a)*r); e.set(Math.random()*6,Math.random()*6,Math.random()*6); q.setFromEuler(e);
    const s=.025+Math.pow(Math.random(),3)*.09; sc.set(s,s*(.6+Math.random()*.6),s*(.7+Math.random()*.5)); M.compose(p,q,sc); U.belt.setMatrixAt(i,M); }
  U.belt.frustumCulled=false; U.belt.visible=false; U.scene.add(U.belt);
}
/* the seal's pieces, flung out when it breaks */
U.shardU={uT:{value:-1}};
U.shard=pts(cloud(Math.floor(520*Q+220),(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a);o[1]=0;o[2]=Math.sin(a);}),PM({size:.1,color:'#FF6A3D',uniforms:U.shardU,decl:'uniform float uT;',
  body:`float t=max(uT,0.), sp=1.2+aR.y*aR.y*10.; p.xz*=2.4+sp*t*(1.-.14*t); p.y=(aR.z-.5)*t*(.6+aR.w*2.); col=mix(vec3(1.,.93,.8),uCol,smoothstep(.05,.6,t)); b=step(0.,uT)*exp(-t*(1.1+aR.x))*(1.1+aR.w); sz=.8+aR.w;`}));
U.scene.add(U.shard);
/* the seal: a dashed ring just outside the horizon that holds the probe off until it has docked at one station */
U.seal=new T.LineLoop(ringGeo(2.4,260),dashMat('#FF5636','float a=(.07+.75*uNear)*step(.5,fract(vAng*15.9+uTime*.12));')); U.seal.material.uniforms.uOp.value=0; U.scene.add(U.seal); U.sealU=U.seal.material.uniforms;
/* boundary curtain */
U.fenceU={uPA:{value:0},uNear:{value:0}};
U.fence=pts(cloud(Math.floor(3000*Q+800),(i,r,o)=>{const a=r[0]*TAU;o[0]=Math.cos(a)*RB;o[1]=gauss()*.5;o[2]=Math.sin(a)*RB;}),PM({size:.06,color:'#FFC392',uniforms:U.fenceU,decl:'uniform float uPA,uNear;',
  body:`float a=atan(p.z,p.x); float da=abs(mod(a-uPA+3.1416,6.2832)-3.1416); float hx=step(.82,fract((a*24.)+floor(p.y*3.)*.5)); b=uOp*(.012+uNear*(.6+.9*hx)*exp(-da*da*18.));`}));
U.fence.material.uniforms.uOp.value=0; U.scene.add(U.fence);

/* probe */
U.probe=new T.Group();
{ const hull=new T.Mesh(new T.ConeGeometry(.11,.42,16),LM('#EEE9DF',{emit:.1,rim:1.2})); hull.rotation.x=-Math.PI/2; U.probe.add(hull);
  const fin=new T.Mesh(new T.BoxGeometry(.34,.014,.1),LM('#FFC392',{emit:.3})); fin.position.z=.13; U.probe.add(fin);
  U.engU={uThr:{value:0}};
  U.probe.add(pts(cloud(40,(i,r,o)=>{o[0]=gauss()*.02;o[1]=gauss()*.02;o[2]=.23+r[0]*.05;}),PM({size:.09,color:'#FFD8B0',uniforms:U.engU,decl:'uniform float uThr;',body:'b=.18+uThr*.22; sz=1.+uThr*.35;'})));   // a small glow in the nozzle
  /* the flame: a jet out of the nozzle, as long as you push. Two shells, a hot blue-white core inside an orange plume,
     soft at the edges, flickering, with bright shock diamonds when you burn hard; at rest only a small blue pilot light */
  U.engU.uTime=G.uTime;
  const jet=(len,rad,core)=>{ const g=new T.CylinderGeometry(1,1,1,28,24,true).translate(0,.5,0).rotateX(Math.PI/2);   // a unit tube from the nozzle (z 0) to the tip (z 1), shaped in the shader
    const m=new T.ShaderMaterial({uniforms:U.engU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
      vertexShader:`uniform float uThr,uTime; varying float vU; varying vec3 vN,vV;
        float h(float n){ return fract(sin(n)*43758.5453); }
        float nz(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(h(i),h(i+1.),f); }
        void main(){ vec3 p=position; float u=p.z; vU=u; float k=clamp(uThr/1.5,0.,1.);
          float L=${len.toFixed(3)}*(.18+.82*k)*(1.+.12*(nz(uTime*23.+u*3.)-.5)), R=${rad.toFixed(3)}*(.55+.45*k);
          float prof=pow(max(1.-u,0.),.75)*(1.+.5*u)*(1.+.22*(nz(uTime*31.+u*9.+${core?'7.':'0.'})-.5)*u);   // full at the nozzle, licking to a point
          p.xy*=R*prof; p.z=.21+u*L;
          p.x+=sin(uTime*17.+u*6.)*.012*u*k; p.y+=cos(uTime*13.+u*5.)*.01*u*k;
          vec4 mv=modelViewMatrix*vec4(p,1.); vV=normalize(-mv.xyz); vN=normalize(normalMatrix*normal);
          gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform float uThr,uTime; varying float vU; varying vec3 vN,vV;
        void main(){ float k=clamp(uThr/1.5,0.,1.), u=clamp(vU,0.,1.); float edge=pow(abs(dot(normalize(vN),normalize(vV))),${core?'1.6':'1.1'});
          ${core?`vec3 c=mix(vec3(.85,.93,1.),vec3(1.,.86,.55),smoothstep(.05,.7,u)); float a=edge*(1.-smoothstep(.25,1.,u))*(.22+.85*k);
            a*=1.+.9*k*pow(max(.5+.5*cos(u*34.-uTime*3.),0.),6.)*max(1.-u,0.);`
          :`vec3 c=mix(vec3(1.,.72,.38),vec3(.95,.3,.08),smoothstep(.15,.85,u)); float a=edge*pow(max(1.-u,0.),1.25)*(.07+.95*k);
            a*=.75+.25*sin(uTime*40.+u*12.);`}
          gl_FragColor=vec4(c*a,1.); }`});
    const ms=new T.Mesh(g,m); ms.frustumCulled=false; ms.renderOrder=3; U.probe.add(ms); return ms; };
  jet(1.35,.1,false); jet(.62,.045,true); }
U.probe.visible=false; U.scene.add(U.probe);
U.exhaust=Burst(U.scene,Math.floor(500*Q+120),'#FFC392',.08);
const TRL=170; U.trailPos=new Float32Array(TRL*3); U.trailCol=new Float32Array(TRL*3);
U.trailG=new T.BufferGeometry(); U.trailG.setAttribute('position',new T.BufferAttribute(U.trailPos,3)); U.trailG.setAttribute('color',new T.BufferAttribute(U.trailCol,3));
U.trail=new T.Line(U.trailG,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false})); U.trail.frustumCulled=false; U.trail.visible=false; U.scene.add(U.trail);
U.dustU={uC:{value:new T.Vector3()},uV:{value:new T.Vector3()}};
U.dust=pts(cloud(Math.floor(1600*Q),(i,r,o)=>{o[0]=(r[0]-.5)*44;o[1]=(r[1]-.5)*16;o[2]=(r[2]-.5)*44;}),PM({size:.05,color:'#CFC3B1',uniforms:U.dustU,decl:'uniform vec3 uC;',body:`p=uC+mod(position-uC+vec3(22.,8.,22.),vec3(44.,16.,44.))-vec3(22.,8.,22.); b=.22;`}));
U.dust.visible=false; U.scene.add(U.dust);
/* speed streaks: the same dust drawn as short lines along the probe's velocity, visible only when you are moving fast */
{ const N=Math.floor(900*Q+200), P=new Float32Array(N*6), E=new Float32Array(N*2), R=new Float32Array(N*2);
  for(let i=0;i<N;i++){ const x=(Math.random()-.5)*44, y=(Math.random()-.5)*16, z=(Math.random()-.5)*44, r=Math.random();
    P.set([x,y,z,x,y,z],i*6); E[i*2]=0; E[i*2+1]=1; R[i*2]=R[i*2+1]=r; }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); g.setAttribute('aE',new T.BufferAttribute(E,1)); g.setAttribute('aR',new T.BufferAttribute(R,1)); g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  U.streak=new T.LineSegments(g,new T.ShaderMaterial({uniforms:U.dustU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform vec3 uC,uV; attribute float aE,aR; varying float vA;
      void main(){ vec3 p=uC+mod(position-uC+vec3(22.,8.,22.),vec3(44.,16.,44.))-vec3(22.,8.,22.);
        float sp=length(uV); p-=uV*aE*(.05+.07*aR);
        vec4 mv=modelViewMatrix*vec4(p,1.); float dc=-mv.z;
        vA=smoothstep(3.,8.,sp)*(1.-aE*.85)*.22*smoothstep(1.,4.,dc)*smoothstep(26.,8.,dc);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`varying float vA; void main(){ gl_FragColor=vec4(vec3(.85,.8,.74)*vA,1.); }`}));
  U.streak.frustumCulled=false; U.streak.visible=false; U.scene.add(U.streak); }
{ const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3)); g.setAttribute('aAng',new T.BufferAttribute(new Float32Array([0,1]),1));
  U.apLine=new T.Line(g,dashMat('#EEE9DF','float a=.5*step(.5,fract(vAng*uR-uTime*2.));')); U.apLine.frustumCulled=false; U.apLine.visible=false; U.scene.add(U.apLine); }
const MAXP=24; U.peerPos=new Float32Array(MAXP*3).fill(9999);
U.peerG=new T.BufferGeometry(); U.peerG.setAttribute('position',new T.BufferAttribute(U.peerPos,3)); U.peerG.setAttribute('aR',new T.BufferAttribute(new Float32Array(MAXP*4).fill(.7),4)); U.peerG.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
U.peers=pts(U.peerG,PM({size:.2,color:'#FFC392',body:'b=1.1+.5*sin(uTime*4.);'})); U.scene.add(U.peers);
U.sigU={uCount:{value:0},uBe:{value:new T.Vector3()}};
U.sig=pts(cloud(200,(i,r,o)=>{o[0]=i;o[1]=r[0];o[2]=r[1];}),PM({size:.12,color:'#FFFFFF',uniforms:U.sigU,decl:'uniform float uCount; uniform vec3 uBe;',body:`
  float i=position.x; b=step(i,uCount-.5)*.9; float a=uTime*(.2+aR.x*.3)+aR.y*6.28; float rr=2.4+aR.z*1.2; p=uBe+vec3(cos(a)*rr,(aR.w-.5)*1.4,sin(a)*rr);`}));
U.scene.add(U.sig);

/* everything in orbit is lit by the disk, and dimmer the farther it is from the hole */
U.scene.traverse(o=>{ const m=o.material; if(m&&m.uniforms&&m.uniforms.uFall) m.uniforms.uFall.value=1; });
function updateStations(t){
  STA.forEach(s=>{ s.a=s.ph+t*s.w; s.pos.set(Math.cos(s.a)*s.R,Math.sin(t*.3+s.ph)*.25,Math.sin(s.a)*s.R); s.vel.set(-Math.sin(s.a)*s.R*s.w,0,Math.cos(s.a)*s.R*s.w);
    s.grp.position.copy(s.pos); s.orbit.material.uniforms.uAng.value=s.a; U.gridU.uSt.value[s.idx].copy(s.pos);
    s.anim.forEach(f=>f(t));
    if(s.orbs) s.orbs.forEach((m,k)=>{const a=t*.8+k*TAU/3; m.position.set(Math.cos(a)*.78,Math.sin(t*1.2+k)*.15,Math.sin(a)*.78);}); });
  U.sigU.uBe.value.copy(BEACON.pos);
}
function universeVisible(k){
  STA.forEach(s=>{ s.grp.visible=k>.01; s.orbit.material.uniforms.uOp.value=k; s.zone.material.uniforms.uOp.value=k; s.tether.material.uniforms.uOp.value=k; });
  U.gridU.uOp.value=k; U.fence.material.uniforms.uOp.value=k; U.belt.visible=k>.05; U.sealU.uOp.value=k*S.sealK; U.shard.material.uniforms.uOp.value=k;
}

/* ================= THE LAST LIGHT: A ROCKET FROM THE FAR SHORE =================
   At the last stop, now and then a rocket goes up from behind the far hills into the evening, the same cream and
   peach rocket as the one in the wild universe. Its sound comes a couple of seconds after its light, because it is far.
   Catch it and the camera follows it up out of the sky into the night: that is the way into orbit, at Aetos. */
const LAUNCH={vis:false, ph:-1, wait:1.6, turn:.16, heard:0, near:0, go:false, gt:0, back:false, left:false, href:'', camK:0, fov:16, dark:0,
  p:v3(), dir:v3(0,1,0), mid:v3(), sc:new T.Vector3(), scr:{x:-1,y:-1,on:false}};
const L_T=21, L_GAP=5, L_LIFT=1.3;   // a flight, the quiet between flights, the engines lit behind the hills before it rises
function makeLaunch(W){
  const sc=W.scene, g=new T.Group(); g.visible=false; sc.add(g);
  /* where it goes up: behind the far hills, right of the sun as you look out from the last stop, then turning away to the
     right so it climbs clear of the words. A narrow screen sees less of the sky, so there it goes up nearer the middle */
  const CAMC=v3(-24.5,0,-9.7), FWD=v3(-.9989,0,-.0102), RIGHT=v3(.0102,0,-.9989), D=785, H=60, HILL=24, L0=v3();
  const base=()=>{ const port=portrait(), a=(port?5.5:12.5)*DEG; L0.copy(CAMC).addScaledVector(FWD,D*Math.cos(a)).addScaledVector(RIGHT,D*Math.sin(a)).setY(-14); LAUNCH.turn=port?.05:.16; pre.mesh.position.set(L0.x,6,L0.z); };
  /* where it is t seconds after it rises, and gt seconds after you caught it, when it really goes */
  const pos=(t,gt,o)=>{ const up=.5*2.3*t*t+(gt>0?11*gt*gt:0); return o.copy(L0).addScaledVector(RIGHT,LAUNCH.turn*up+LAUNCH.turn*.0018*up*up).setY(L0.y+up); };
  /* its own light: the low sun on one side, the sky on the other, the evening haze over it, eased so it still reads */
  const RV=`varying vec3 vN,vWP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
  const lit=[];
  const mat=c=>{ const m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:col(c)},uSunCol:{value:new T.Color('#FFD2A6')},uSkyCol:{value:new T.Color('#B9B4CE')}},W.U),
    vertexShader:RV, fragmentShader:`uniform vec3 uC,uSunCol,uSkyCol; varying vec3 vN,vWP; ${GLSL.haze}
      void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vWP);
        float key=max(dot(N,normalize(uSunDir+vec3(0.,.25,0.))),0.), rim=pow(1.-abs(dot(N,V)),3.);
        /* the low sun is behind it from where you stand, so the evening sky and the lake light the side you see */
        float fill=.55+.45*max(dot(N,V),0.);
        vec3 c=uC*(uSkyCol*.45+uSunCol*key*.8+vec3(1.,.86,.76)*fill*.62)+uSunCol*rim*.4;
        gl_FragColor=vec4(mix(c,haze(c,vWP),.38),1.); }`}); lit.push(m); return m; };
  const body=new T.Group(); g.add(body);
  const part=(geo,c,y)=>{ const m=new T.Mesh(geo,mat(c)); m.position.y=y; m.frustumCulled=false; body.add(m); return m; };
  part(new T.CylinderGeometry(2.2,2.9,4,20),'#3B3633',2);
  part(new T.CylinderGeometry(3.2,3.2,44,28),'#F4EFE6',26);
  part(new T.CylinderGeometry(3.26,3.26,3,28),'#EF8A3C',37.5);
  part(new T.ConeGeometry(3.2,12,28),'#F4EFE6',54);
  for(let i=0;i<4;i++){ const f=new T.Mesh(new T.BoxGeometry(.5,9,6.5),mat('#F2B98D')), a=i*Math.PI/2+.4;
    f.position.set(Math.cos(a)*5.6,7.5,Math.sin(a)*5.6); f.rotation.y=-a; f.frustumCulled=false; body.add(f); }
  /* the flame and its glow, which is all you can make out of it while it is far */
  const flU={uTime:GU.uTime,uK:{value:0}};
  const flG=new T.CylinderGeometry(2.6,.2,24,20,6,true); flG.translate(0,-12,0);
  const flame=new T.Mesh(flG,new T.ShaderMaterial({uniforms:flU,...ADD,side:T.DoubleSide,
    vertexShader:`uniform float uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 p=position; vY=clamp(-p.y/24.,0.,1.); p.xz*=1.+.18*sin(uTime*29.+p.y*.9)*vY; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uK,uTime; varying float vY; varying vec3 vN,vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),V));
      vec3 c=mix(vec3(1.,.95,.8),vec3(1.,.55,.22),vY); float a=pow(f,1.3)*(1.-vY*.85)*(.86+.14*sin(uTime*41.)); gl_FragColor=vec4(c*a*uK*2.2,1.); }`}));
  flame.frustumCulled=false; body.add(flame);
  const glow=glowSprite('#FFD3A0',16); glow.mesh.position.y=-3; glow.mesh.renderOrder=962; body.add(glow.mesh);
  /* behind the hills before it rises: the light of the engines on the haze */
  const pre=glowSprite('#FFC48E',70); pre.mesh.renderOrder=961; pre.U.uK.value=0; sc.add(pre.mesh); base();
  /* the smoke it leaves, lit by the low sun: puffs that spread and fade */
  const NP=MOBILE?180:300, pp=new Float32Array(NP*3), pb=new Float32Array(NP).fill(-99);
  const tg=new T.BufferGeometry(); tg.setAttribute('position',new T.BufferAttribute(pp,3)); tg.setAttribute('aB',new T.BufferAttribute(pb,1)); tg.boundingSphere=new T.Sphere(v3(),1e5);
  const TU={uNow:{value:0},uPx:{value:600},uCol:{value:new T.Color('#FFC7A8')},uK:{value:1}};
  const trail=new T.Points(tg,new T.ShaderMaterial({uniforms:TU,...ADD,
    vertexShader:`attribute float aB; uniform float uNow,uPx; varying float vA; void main(){ float age=uNow-aB; vec4 mv=viewMatrix*vec4(position+vec3(age*.9,age*.5,0.),1.);
      vA=(age<0.||aB<-90.)?0.:exp(-age/5.5)*smoothstep(0.,.35,age); gl_PointSize=clamp((7.5+age*2.6)*uPx/max(-mv.z,1.),1.5,64.); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uCol; uniform float uK; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.08,d); gl_FragColor=vec4(uCol*a*vA*.11*uK,1.); }`}));
  trail.frustumCulled=false; trail.renderOrder=958; sc.add(trail);
  let ip=0, gone=0; const lastP=v3();
  const _b=v3(), _q=new T.Quaternion(), Y=v3(0,1,0);
  return {
    update(dt,s){
      const here=s>5.9&&(S.mode==='world'||S.mode==='launch');
      /* the first one goes up soon after you arrive; then one now and then while you stay */
      if(!here&&!LAUNCH.go){ if(LAUNCH.ph>=0&&s<5.6){ LAUNCH.ph=-1; LAUNCH.wait=1.6; } }
      else if(LAUNCH.ph<0){ LAUNCH.wait-=dt; if(LAUNCH.wait<=0){ LAUNCH.ph=0; base(); } }
      if(LAUNCH.ph<0){ g.visible=false; LAUNCH.vis=false; LAUNCH.heard=0; pre.U.uK.value=0; return; }
      LAUNCH.ph+=dt; const ph=LAUNCH.ph, t=Math.max(0,ph-L_LIFT), gt=LAUNCH.go?LAUNCH.gt:0;
      const p=pos(t,gt,LAUNCH.p); pos(t+.2,gt+(LAUNCH.go?.2:0),_b);
      LAUNCH.dir.subVectors(_b,p); if(LAUNCH.dir.lengthSq()<1e-6) LAUNCH.dir.set(0,1,0); LAUNCH.dir.normalize();
      g.position.copy(p); _q.setFromUnitVectors(Y,LAUNCH.dir); g.quaternion.copy(_q);
      const ign=sstep(0,L_LIFT,ph), fly=ph>=L_LIFT;
      pre.U.uK.value=ign*(1-sstep(L_LIFT,L_LIFT+2.5,ph))*1.1; pre.U.uS.value=.8+.4*ign;
      flU.uK.value=fly?1:0; glow.U.uK.value=fly?1.6:0; glow.U.uS.value=1+.08*Math.sin(GU.uTime.value*37.);
      g.visible=fly&&(ph<L_T||LAUNCH.go);
      LAUNCH.vis=g.visible&&p.y>HILL-6;
      LAUNCH.mid.copy(p).addScaledVector(LAUNCH.dir,H*.45);
      /* smoke from the nozzle, a puff every couple of metres it climbs, so the column stays whole however fast it goes */
      if(g.visible){ if(gone<0) lastP.copy(p); const step=p.distanceTo(lastP); gone+=step; let n=0;
        while(gone>=2.4&&n<12){ gone-=2.4; n++; const f=gone/Math.max(step,1e-3), k=ip%NP;
          pp[k*3]=p.x+(lastP.x-p.x)*f+(Math.random()-.5)*2.5; pp[k*3+1]=p.y+(lastP.y-p.y)*f-2; pp[k*3+2]=p.z+(lastP.z-p.z)*f+(Math.random()-.5)*2.5; pb[k]=GU.uTime.value; ip++; }
        if(n) tg.attributes.position.needsUpdate=tg.attributes.aB.needsUpdate=true; lastP.copy(p); } else gone=-1;
      TU.uNow.value=GU.uTime.value; TU.uPx.value=G.px;
      /* the sound of it, which comes from that far away about two seconds late */
      const late=ph-2.3; LAUNCH.heard=late<0?0:(late<L_LIFT?sstep(0,L_LIFT,late)*.6:1-sstep(L_T-5,L_T+1,late))*(here?1:0);
      if(!LAUNCH.go&&ph>=L_T+L_GAP){ LAUNCH.ph=0; base(); }
    },
    /* the evening's light on it */
    light(){ for(const m of lit){ m.uniforms.uSunCol.value.copy(TODC.sun).multiplyScalar(.9); m.uniforms.uSkyCol.value.copy(TODC.zen).lerp(TODC.hor,.5); }
      TU.uCol.value.copy(TODC.sun).lerp(TODC.hor,.35); TU.uK.value=.6+.6*sstep(-2,4,SUN.el); },
  };
}

/* the round hit area that follows it: Fly on the cursor, and a tap target big enough for a thumb */
const RK=$('#rocket');
function launchHit(){
  const on=!!(OUT&&OUT.launch)&&LAUNCH.vis&&!LAUNCH.go&&S.mode==='world'&&!HOLD.open;
  if(on){ const v=LAUNCH.sc.copy(LAUNCH.mid).project(CAM.out); const x=(v.x*.5+.5)*innerWidth, y=(-v.y*.5+.5)*innerHeight;
    LAUNCH.scr.x=x; LAUNCH.scr.y=y; LAUNCH.scr.on=v.z<1&&x>-30&&x<innerWidth+30&&y>-30&&y<innerHeight+30;
    if(LAUNCH.scr.on){ RK.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; RK.style.setProperty('--rs',(FINE?112:136)+'px'); } }
  else LAUNCH.scr.on=false;
  const show=on&&LAUNCH.scr.on; if(show!==RK.classList.contains('on')){ RK.classList.toggle('on',show); RK.tabIndex=show?0:-1; }
}
/* caught: on this site the camera follows it up into the night and then the page changes; when the way into orbit lives
   somewhere else, the link opens in its own tab and the evening comes back here */
RK.addEventListener('click',e=>{
  if(!LAUNCH.vis||LAUNCH.go||S.mode!=='world'){ e.preventDefault(); return; }
  const local=sameSite(RK.getAttribute('href')||'');
  if(local) e.preventDefault();
  LAUNCH.go=true; LAUNCH.gt=0; LAUNCH.back=!local; LAUNCH.left=false; LAUNCH.href=RK.href; S.mode='launch';
  ui.classList.add('leaving'); RK.classList.remove('on'); A.rocketGo();
});
function launchTick(dt){
  if(!LAUNCH.go){ LAUNCH.camK=damp(LAUNCH.camK,0,2.4,dt); LAUNCH.dark=damp(LAUNCH.dark,0,2.2,dt); LAUNCH.near=damp(LAUNCH.near,0,2,dt); return; }
  if(!LAUNCH.hold) LAUNCH.gt+=dt; const t=LAUNCH.gt;   // (hold: only the stills tests stop its clock)
  LAUNCH.camK=RM?0:E.io(clamp(t/1.15,0,1)); LAUNCH.fov=lerp(16,11,sstep(1,2.6,t));
  LAUNCH.dark=sstep(RM?0:.85,RM?1:2.3,t); LAUNCH.near=sstep(0,1.6,t);
  if(!LAUNCH.back&&t>=2.75&&!LAUNCH.left){ LAUNCH.left=true; location.assign(LAUNCH.href); }
  if(LAUNCH.back&&t>=3.4){ LAUNCH.go=false; LAUNCH.ph=L_T+L_GAP-6; S.mode='world'; ui.classList.remove('leaving'); }
}

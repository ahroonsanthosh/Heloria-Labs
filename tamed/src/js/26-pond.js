/* ================= THE POND AT THE START OF THE WALK =================
   The stepping stones where the walk begins answer the hand. A stone near the pointer (on a phone, near a finger dragged
   over the water) leans a few degrees toward it, slowly and heavily, the way a stone resting on water would, and rocks
   back to rest when the hand goes. Coming onto a stone sends a ring out across the water from it and lights the water
   under its edge, warm, for a second or two.
   A few koi live in the water by the first stones. They drift to the hand, slowly, keeping a little together, turning with
   their whole body. They are seen under the surface: dimmed and tinted by the water over them, bent by its ripples and
   partly hidden by its reflection where that is strong. Each is drawn on a small patch of its own, so only the pixels where
   a koi is pay for it. Nothing here costs anything once the walk has gone on through the door. */
const POND=(()=>{
  const NS=30, KN=6, NG=4;
  const P={slabs:[], koi:[], NS, KN, t:0, hand:{live:false, sx:0, sy:0, top:false, tx:0, tz:0, water:false, wx:0, wz:0, koi:false, kx:0, kz:0, kt:-9},
    fing:null, count:{knock:0, ring:0, swirl:0}, layout:null, stat:null};
  /* for the tests: the most any stone has leaned (degrees), and the fastest any koi has turned (radians a second) or swum,
     and how near the surface and how deep they have been, since the last reset */
  P.reset=()=>{ P.stat={lean:0, turn:0, speed:0, top:9, deep:0}; }; P.reset();
  const V4=n=>Array.from({length:n},()=>new T.Vector4());
  const tilt=V4(NS), piv=Array.from({length:NS},()=>new T.Vector2());
  P.slabU={uTilt:{value:tilt}, uPiv:{value:piv}, uGlowCol:{value:col('#FFB066')}};

  /* ---------- the stones ---------- */
  P.addSlab=(x,z,w,d,ry)=>{ if(P.slabs.length>=NS) return; piv[P.slabs.length].set(x,z);
    P.slabs.push({i:P.slabs.length, x, z, hw:w/2, hd:d/2, c:Math.cos(ry), s:Math.sin(ry), r:Math.min(w,d)*.26,
      tx:0, tz:0, vx:0, vz:0, dy:0, vy:0, g:0, in:false, t:-9}); };
  /* every vertex of the merged stones knows which stone it belongs to (or -1, a stone that does not move) */
  P.slabAttr=(geo,list)=>{ const a=new Float32Array(geo.attributes.position.count); let o=0;
    list.forEach((g,i)=>{ const n=g.index?g.index.count:g.attributes.position.count, id=P.slabs[i]?i:-1; a.fill(id,o,o+n); o+=n; });
    geo.setAttribute('aSlab',new T.BufferAttribute(a,1)); };
  /* a stone turns about the point of the water line under its middle (uPiv): x, z its lean (radians, toward where it
     leans), y how far it has sunk, w how much light is under it */
  P.slabVert=`\nattribute float aSlab; uniform vec4 uTilt[${NS}]; uniform vec2 uPiv[${NS}]; varying float vSlabG;
  vec3 slabTurn(vec3 v,vec2 t){ float a=length(t); if(a<1e-6) return v; vec3 k=vec3(t.y,0.,-t.x)/a; return v*cos(a)+cross(k,v)*sin(a)+k*dot(k,v)*(1.-cos(a)); }`;
  const pick='int slabI=int(max(aSlab,0.)+.5); vec4 slabU=uTilt[slabI]*step(-.5,aSlab);';
  P.slabNormal=pick+' vSlabG=slabU.w; objectNormal=slabTurn(objectNormal,slabU.xy);';
  P.slabPos='if(dot(slabU.xyz,slabU.xyz)>0.){ vec3 pv=vec3(uPiv[slabI].x,0.,uPiv[slabI].y); transformed=slabTurn(transformed-pv,slabU.xy)+pv+vec3(0.,slabU.z,0.); }';
  /* the light under a stone catches its sides at the water line */
  P.slabFrag='\nvarying float vSlabG; uniform vec3 uGlowCol;';
  P.slabEmis='\n{ if(vSlabG>.002){ float low=exp(-max(vWP.y+.01,0.)*24.)*(1.-smoothstep(.5,.9,wN.y)); outgoingLight+=uGlowCol*vSlabG*low*.75; } }';
  /* and its shadow leans with it */
  P.slabDepth=()=>{ const m=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});
    m.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,P.slabU);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>'+P.slabVert).replace('#include <begin_vertex>','#include <begin_vertex>\n'+pick+P.slabPos); };
    m.customProgramCacheKey=()=>'stonesDepth'; return m; };

  /* ---------- the koi: who they are ---------- */
  /* kohaku (red-orange over white), a gold ogon, sanke (kohaku with small black marks), a plain orange, tancho (white, a
     round orange crown) and a second kohaku */
  const KIND=[0,1,2,3,4,0], LEN=[.78,.7,.74,.66,.72,.84];
  const R=(()=>{let s=41;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(let i=0;i<KN;i++) P.koi.push({i, x:0, z:0, h:0, v:.12, w:0, ph:R()*TAU, amp:.06, bend:0, depth:.24, L:LEN[i], kind:KIND[i], seed:R()*40,
    ox:R()*TAU, oy:R()*TAU, cool:-99});
  /* where they live: in the water just by the first stones, where the walk begins, a little to the side of the path
     (a phone held upright starts the walk a little nearer, so there they are nearer too) */
  const HOME={land:[1.6,85.2,3.8], port:[1.2,71.8,2.4]}, REACH=7.5, FAR=17;
  const home=()=>HOME[P.layout];
  function settle(){ const [hx,hz]=home(); P.koi.forEach((k,i)=>{ const a=i/KN*TAU+.4; k.x=hx+Math.cos(a)*(1+i%3*.6); k.z=hz+Math.sin(a)*(1.2+i%2*.7); k.h=a+1.9+R()*.6; k.v=.12; k.w=0; }); }
  const gA=V4(NG), gB=V4(NG);
  /* the water under a lit stone: only a pixel near one pays for it, and anywhere but the start of the walk the water pays for
     one comparison. The light is under the surface, so it wobbles with the ripples and shows more where the water's
     reflection is weak */
  P.water={uniforms:{uGlowA:{value:gA}, uGlowB:{value:gB}, uGlowCol:P.slabU.uGlowCol},
  decl:`
    uniform vec4 uGlowA[${NG}],uGlowB[${NG}]; uniform vec3 uGlowCol;`,
  body:`
      if(uGlowB[0].z>.002){ bool ng=false;
        for(int i=0;i<${NG};i++){ vec4 b=uGlowB[i]; if(b.z<=.002) break; vec2 d=vWP.xz-uGlowA[i].xy; float rr=max(b.x,b.y)+1.5; if(dot(d,d)<rr*rr){ ng=true; break; } }
        if(ng){ vec2 pg=vWP.xz-normalize(V.xz+vec2(1e-5,0.))*.07+N.xz*.05; float gs=0.;
          for(int i=0;i<${NG};i++){ vec4 a=uGlowA[i], b=uGlowB[i]; if(b.z<=.002) break; vec2 d=pg-a.xy; vec2 q=abs(vec2(a.z*d.x-a.w*d.y,a.w*d.x+a.z*d.y))-b.xy;
            float e=length(max(q,0.))+min(max(q.x,q.y),0.); gs+=b.z*exp(-max(e,0.)*3.)*(1.-.4*smoothstep(0.,.4,-e)); }
          body+=uGlowCol*gs*2.6; fr*=1.-.15*min(gs,1.); }
      }`};

  /* the koi are drawn on their own, one small quad each lying just over the water, over only the patch of it where that koi
     is seen. So they cost nothing anywhere else, and the water's own shader is as it was. A koi is seen through the
     surface: along the ray bent into the water, wobbled by the same ripples the water shows, dimmed and tinted by the water
     over it, and partly hidden by the sky's reflection, which is strong this low over the water */
  const KOI=`
    /* a koi seen from above, in its own frame: s along the body from the nose (0) to the end of the tail (about 1), y across
       it, in body lengths. Its spine swings in a wave that grows toward the tail and curls through a turn. A is its place and
       heading, B the wave's phase, the curl, the wave's size and its length, C its kind, depth and seed. rgb, and cover.
       Seen this low over the water a koi is a thin streak; each is drawn less foreshortened along the line of sight (vd), by
       vk, as if seen from about 24 degrees up, so that it reads as a fish */
    vec4 koi(vec2 p,vec4 A,vec4 B,vec4 C,float aa,vec2 vd,float vk){
      vec2 d=p-A.xy; d-=vd*dot(d,vd)*vk; float L=B.w;
      vec2 q=vec2(dot(d,A.zw),dot(d,vec2(-A.w,A.z)))/L;
      float s=.5-q.x, y=q.y-B.z*(.08+.92*s*s)*sin(B.x-s*5.6)-B.y*(s-.42)*(s-.42), ay=abs(y), e=aa/L;
      float w=s<.3?.118*sqrt(max(0.,1.-(.3-s)*(.3-s)/.09)):mix(.118,.028,smoothstep(.3,.88,s));
      float db=max(max(ay-w,-s),s-.9);
      float tw=.02+.13*smoothstep(.8,1.03,s), df=max(ay-tw,max(.8-s,s-(.96+.5*ay)));
      float dp=(length(vec2((s-.36)/.06,(ay-.125-.01*sin(B.x*.5))/.034))-1.)*.034;
      float ab=smoothstep(e,-e,db), af=smoothstep(e,-e,df)*.45, ap=smoothstep(e,-e,dp)*.28;
      if(ab+af+ap<.002) return vec4(0.);
      vec3 wh=vec3(.94,.91,.85), oc=vec3(.98,.4,.07), gd=vec3(.97,.68,.26), bk=vec3(.05,.045,.045);
      float n1=vnoise(vec2(s*6.,y*12.)+C.w), n2=vnoise(vec2(s*15.,y*30.)+C.w*1.7);
      float pt=smoothstep(.47,.55,n1)*(1.-smoothstep(.74,.86,s));
      vec3 kc=mix(wh,oc,pt);
      if(C.x>.5&&C.x<1.5) kc=gd;
      else if(C.x>1.5&&C.x<2.5) kc=mix(kc,bk,smoothstep(.7,.75,n2)*(1.-smoothstep(.7,.82,s))*.9);
      else if(C.x>2.5&&C.x<3.5) kc=oc*vec3(1.,1.12,1.05);
      else if(C.x>3.5) kc=mix(wh,oc,smoothstep(.075,.05,length(vec2(s-.13,y)))*.92);
      vec3 fc=mix(kc,wh,.55);
      float sh=.72+.28*sqrt(max(0.,1.-ay*ay/(w*w+1e-4)));
      vec3 c=fc; float a=max(af,ap); c=mix(c,kc*sh,ab); a=max(a,ab);
      return vec4(c,a);
    }`;
  const KQ=4, kPos=new Float32Array(KN*KQ*3), kA=new Float32Array(KN*KQ*4), kB=new Float32Array(KN*KQ*4), kC=new Float32Array(KN*KQ*4);
  P.koiU={uKoiK:{value:0}, uPondPx:{value:.001}};
  P.koiMesh=W=>{
    const g=new T.BufferGeometry(), idx=[]; for(let i=0;i<KN;i++){ const o=i*KQ; idx.push(o,o+1,o+2, o,o+2,o+3); }
    const at=(a,n)=>{ const b=new T.BufferAttribute(a,n); b.setUsage(T.DynamicDrawUsage); return b; };
    g.setAttribute('position',at(kPos,3)); g.setAttribute('aA',at(kA,4)); g.setAttribute('aB',at(kB,4)); g.setAttribute('aC',at(kC,4)); g.setIndex(idx);
    g.boundingSphere=new T.Sphere(v3(),1e5);
    const wu=W.waterMat.uniforms;
    const m=new T.ShaderMaterial({uniforms:Object.assign({tSim:wu.tSim, uSim:wu.uSim, uSimTx:wu.uSimTx, uSky:wu.uSky},GU,W.U,P.koiU),
      transparent:true, depthWrite:false, side:T.DoubleSide, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1,
      /* (they are under the water, so the water's mirror never sees them: there they are left out before a pixel is drawn) */
      vertexShader:`attribute vec4 aA,aB,aC; uniform float uRefl; varying vec4 vA,vB,vC; varying vec3 vWP;
      void main(){ vA=aA; vB=aB; vC=aC; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=uRefl>.5?vec4(2.,2.,2.,1.):projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`uniform sampler2D tSim; uniform vec4 uSim; uniform float uSimTx,uTime,uKoiK,uPondPx; uniform vec3 uSky; varying vec4 vA,vB,vC; varying vec3 vWP;
      ${GLSL.noise}${GLSL.haze}${KOI}
      void main(){
        vec3 toC=cameraPosition-vWP; float dist=length(toC); vec3 V=toC/dist;
        vec2 vd=normalize(V.xz+vec2(1e-5,0.)); float vk=1.-clamp(V.y/.4,.4,1.);
        /* the ray bent into the water (Snell), and how far along the line of sight a point at the koi's depth shows */
        float si=sqrt(max(1.-V.y*V.y,0.))/1.333, ct=sqrt(max(1.-si*si,.06)), dep=vC.y;
        vec2 p0=vWP.xz-vd*(si/ct)*dep;
        /* most of the quad is open water round the koi, as far as its tail could swing: a pixel there leaves at once */
        { vec2 d=p0-vA.xy; d-=vd*dot(d,vd)*vk; vec2 q=vec2(dot(d,vA.zw),dot(d,vec2(-vA.w,vA.z)))/vB.w; float m=.07/vB.w;
          if(q.x>.5+m||q.x<-.56-m||abs(q.y)>.2+vB.z+abs(vB.y)*.34+m) discard; }
        /* the ripples over it, as the water reads them, and the lake's own small waves */
        vec2 suv=(vWP.xz-uSim.xy)/uSim.zw, rg=vec2(0.);
        if(suv.x>0.&&suv.y>0.&&suv.x<1.&&suv.y<1.){ rg=vec2(texture2D(tSim,suv+vec2(uSimTx,0.)).r-texture2D(tSim,suv-vec2(uSimTx,0.)).r,texture2D(tSim,suv+vec2(0.,uSimTx)).r-texture2D(tSim,suv-vec2(0.,uSimTx)).r)*.9; }
        rg+=vec2(cos(vWP.x*2.3-vWP.z*1.7+uTime*1.3),cos(vWP.z*2.1+vWP.x*1.3+uTime*1.1))*.006;
        vec2 pk=p0-rg*dep*1.4;
        vec4 k=koi(pk,vA,vB,vC,dist*uPondPx/max(V.y,.05)*.5+.008+dep*.04,vd,vk);
        if(k.a<.002) discard;
        vec3 kl=(uSky*.25+uHazeSun*.75)*1.6*(.86+.24*vnoise(pk*5.5+vec2(uTime*.7,-uTime*.5)));
        float path=dep/max(ct,.25); vec3 c=k.rgb*kl*exp(-path*vec3(.8,.36,.28));
        float cs=V.y, fr=.02+.98*((1.-cs)*(1.-cs)*(1.-cs)*(1.-cs)*(1.-cs));
        gl_FragColor=vec4(haze(c,vWP),k.a*vC.z*uKoiK*exp(-path*.45)*(1.-.7*fr));
      }`});
    /* (seen from the start, so that the loader compiles it with everything else; until the first frame its quads have no size) */
    const mesh=new T.Mesh(g,m); mesh.frustumCulled=false; P.koiG=g; P.koiMeshObj=mesh; return mesh; };

  /* ---------- the hand ---------- */
  addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'){ P.fing={id:e.pointerId, x:e.clientX, y:e.clientY, on:true}; } },{passive:true});
  addEventListener('pointermove',e=>{ const f=P.fing; if(f&&f.on&&e.pointerId===f.id){ f.x=e.clientX; f.y=e.clientY; } },{passive:true});
  const lift=e=>{ const f=P.fing; if(f&&e.pointerId===f.id){ f.on=false; } };
  addEventListener('pointerup',lift,{passive:true}); addEventListener('pointercancel',lift,{passive:true});
  const ray=new T.Raycaster(), _n=new T.Vector2(), _v=v3();
  /* the pointer, or a finger on the glass: where it meets the stones' tops, and the water */
  function handAt(H){
    const f=P.fing, finger=!!(f&&f.on), live=S.mode==='world'&&!HOLD.open&&(M.on||finger);
    H.live=live; H.top=H.water=false; if(!live) return;
    H.sx=finger?f.x:M.x; H.sy=finger?f.y:M.y;
    CAM.out.updateMatrixWorld(); _n.set(H.sx/innerWidth*2-1,-(H.sy/innerHeight)*2+1); ray.setFromCamera(_n,CAM.out);
    const o=ray.ray.origin, d=ray.ray.direction; if(d.y>-1e-4) return;
    const t0=-o.y/d.y; if(t0>150) return;
    H.water=true; H.wx=o.x+d.x*t0; H.wz=o.z+d.z*t0;
    const t1=(.04-o.y)/d.y; H.top=true; H.tx=o.x+d.x*t1; H.tz=o.z+d.z*t1;
  }
  const pan=(x,z)=>{ _v.set(x,0,z).project(CAM.out); return clamp(_v.x,-1,1); };

  /* ---------- every frame ---------- */
  const A0=RM?1.6*DEG:4.2*DEG, W0=RM?3.2:4.6, Z0=RM?1:.42;   // how far a stone leans, and its spring: a slow, heavy rock
  let quiet=true;
  P.tick=(dt)=>{
    const lay=portrait()?'port':'land'; if(lay!==P.layout){ P.layout=lay; settle(); }
    const s=S.s, vis=1-sstep(.44,.56,s);
    P.koiU.uKoiK.value=vis>.001?1:0; if(P.koiMeshObj) P.koiMeshObj.visible=vis>.001;
    if(vis<=.001){ if(!quiet){ quiet=true; for(const sl of P.slabs){ sl.tx=sl.tz=sl.vx=sl.vz=sl.dy=sl.vy=sl.g=0; sl.in=false; tilt[sl.i].set(0,0,0,0); } for(const g of gB) g.z=0; } return; }
    quiet=false; P.t+=dt; P.koiU.uPondPx.value=2*Math.tan(CAM.out.fov*DEG/2)/GU.uRes.value.y;
    const H=P.hand, tn=now(); handAt(H);
    stones(dt,H,tn);
    fish(dt,H,tn);
  };

  function stones(dt,H,tn){
    for(const sl of P.slabs){
      let f=0, lx=0, lz=0, lean=0, e=9;
      if(H.top){ const dx=H.tx-sl.x, dz=H.tz-sl.z, d=Math.hypot(dx,dz);
        /* how far the hand is from the stone's edge (inside it, below zero) */
        const ux=Math.abs(sl.c*dx-sl.s*dz)-(sl.hw-sl.r), uz=Math.abs(sl.s*dx+sl.c*dz)-(sl.hd-sl.r);
        e=Math.hypot(Math.max(ux,0),Math.max(uz,0))+Math.min(Math.max(ux,uz),0)-sl.r;
        f=1-sstep(.05,1.6,e); if(d>1e-4){ lx=dx/d; lz=dz/d; lean=Math.min(1,d/(.55*Math.max(sl.hw,sl.hd))); } }
      /* coming onto a stone: it tips under the hand with a knock, a ring goes out from it and the water under it lights */
      if(!sl.in&&e<.04){ sl.in=true;
        sl.vx+=lx*lean*A0*2.4; sl.vz+=lz*lean*A0*2.4; sl.vy-=.045;
        sl.g=1;
        if(tn-sl.t>.45){ sl.t=tn; const p=pan(sl.x,sl.z), sz=(sl.hw+sl.hd)*.5;
          OUT.sim.drop(sl.x,sl.z,.42*sz+.24,1); P.count.ring++;
          if(tn-(P.knT||0)>.11){ P.knT=tn; A.knock(1,p,sz/.5); A.plink(.8,p,.07); P.count.knock++; } } }
      else if(sl.in&&e>.16) sl.in=false;
      /* the light fades over a second or two, and keeps a little while the hand rests on the stone */
      sl.g*=Math.exp(-dt/.62); if(sl.in) sl.g=Math.max(sl.g,.5); if(sl.g<.003) sl.g=0;
      /* the spring, in small steps however long the frame was */
      const ax=lx*A0*f*lean, az=lz*A0*f*lean, ay=-.014*f, n=Math.min(8,Math.ceil(dt*60)), h=dt/n;
      for(let k=0;k<n;k++){
        sl.vx+=(W0*W0*(ax-sl.tx)-2*Z0*W0*sl.vx)*h; sl.tx+=sl.vx*h;
        sl.vz+=(W0*W0*(az-sl.tz)-2*Z0*W0*sl.vz)*h; sl.tz+=sl.vz*h;
        sl.vy+=(W0*W0*(ay-sl.dy)-2*Z0*W0*sl.vy)*h; sl.dy+=sl.vy*h; }
      tilt[sl.i].set(sl.tx,sl.tz,sl.dy,sl.g); P.stat.lean=Math.max(P.stat.lean,Math.hypot(sl.tx,sl.tz)/DEG);
    }
    /* the brightest few lights go to the water */
    const lit=P.slabs.filter(sl=>sl.g>.002).sort((a,b)=>b.g-a.g);
    for(let i=0;i<NG;i++){ const sl=lit[i];
      if(sl){ gA[i].set(sl.x,sl.z,sl.c,sl.s); gB[i].set(sl.hw,sl.hd,sl.g,0); } else gB[i].z=0; }
  }

  function fish(dt,H,tn){
    const [hx,hz,ROAM]=home(), K=P.koi, sp=RM?.6:1, VC=.42*sp, VW=.16*sp, WM=(RM?.8:1.2);
    /* the hand calls them while it is over the water near them; a finger lifted is remembered for a moment */
    if(H.water){ const dx=H.wx-hx, dz=H.wz-hz, d=Math.hypot(dx,dz);
      if(d<FAR){ const k=Math.min(1,REACH/Math.max(d,1e-4)); H.kx=hx+dx*k; H.kz=hz+dz*k; H.kt=tn; } }
    const call=tn-H.kt<(H.live?.25:2.5);
    H.koi=call;
    const n=Math.min(8,Math.ceil(dt*30)), h=dt/n;
    for(let st=0;st<n;st++){
      const t=P.t-dt+h*(st+1);
      for(const k of K){
        let gx, gz;
        if(call){ const a=k.i/KN*TAU+t*.21*(k.i%2?1:-1); gx=H.kx+Math.cos(a)*.72; gz=H.kz+Math.sin(a)*.72; }
        else { const m=ROAM/4.6; gx=hx+(Math.sin(t*.061+1)*2.4+Math.cos(t*.097*(1+k.i*.11)+k.ox)*1.3)*m; gz=hz+(Math.sin(t*.047)*2+Math.sin(t*.083*(1+k.i*.07)+k.oy)*1.2)*m; }
        let dx=gx-k.x, dz=gz-k.z; const dg=Math.hypot(dx,dz)||1e-4; dx/=dg; dz/=dg;
        /* when it is there it circles, nosing round the hand */
        if(call&&dg<.8){ const o=(1-dg/.8)*.8, tx=-dz, tz=dx; dx+=tx*o; dz+=tz*o; }
        /* a little schooling: room of their own, a heading like their neighbours', and never far from them */
        let sx=0, sz=0, ax=0, az=0, na=0, cx=0, cz=0, nc=0;
        for(const j of K){ if(j===k) continue; const ex=k.x-j.x, ez=k.z-j.z, d=Math.hypot(ex,ez)||1e-4;
          if(d<1){ const q=(1-d)*1.8; sx+=ex/d*q; sz+=ez/d*q; }
          if(d<2.2){ ax+=Math.cos(j.h); az+=Math.sin(j.h); na++; }
          if(d<4){ cx+=j.x; cz+=j.z; nc++; } }
        let wx=dx*(call?1.4:1)+sx, wz=dz*(call?1.4:1)+sz;
        if(na){ wx+=ax/na*.32; wz+=az/na*.32; }
        if(nc&&!call){ const ex=cx/nc-k.x, ez=cz/nc-k.z, d=Math.hypot(ex,ez)||1; wx+=ex/d*.22; wz+=ez/d*.22; }
        /* and they keep to their own water */
        { const ex=k.x-hx, ez=k.z-hz, d=Math.hypot(ex,ez), o=d-ROAM-(call?REACH-ROAM+.6:0); if(o>0){ wx-=ex/d*o*1.2; wz-=ez/d*o*1.2; } }
        /* turning: the heading follows a turn rate that itself eases, so a koi never snaps round */
        const want=Math.atan2(wz,wx); let da=want-k.h; da=Math.atan2(Math.sin(da),Math.cos(da));
        const wt=clamp(da*1.4,-WM,WM); k.w+=(wt-k.w)*(1-Math.exp(-h*2.2)); k.h+=k.w*h;
        const near=call?clamp((dg-.35)/1.1,0,1):1, vt=(call?lerp(.08*sp,VC,near):VW)*(.45+.55*Math.max(0,Math.cos(da)));
        k.v+=(vt-k.v)*(1-Math.exp(-h*(vt>k.v?.9:1.5)));
        k.x+=Math.cos(k.h)*k.v*h; k.z+=Math.sin(k.h)*k.v*h;
        /* the tail beats faster as it swims and harder as it turns; the body curls into the turn */
        k.ph=(k.ph+h*(TAU*(.6+k.v*2.6)+Math.abs(k.w)*2.4))%(TAU*64);
        k.amp+=((.05+.11*clamp(k.v/.42,0,1)+.07*Math.min(1,Math.abs(k.w)))*(RM?.7:1)-k.amp)*(1-Math.exp(-h*3));
        k.bend+=(clamp(k.w/Math.max(k.v,.1)*k.L*.3,-.45,.45)-k.bend)*(1-Math.exp(-h*4));
        /* they come up toward the hand, and sink back when it goes */
        k.depth+=((call&&dg<1.8?.1:.24+.05*Math.sin(t*.13+k.i))-k.depth)*(1-Math.exp(-h*.7));
        const q=P.stat; q.turn=Math.max(q.turn,Math.abs(k.w)); q.speed=Math.max(q.speed,k.v); q.top=Math.min(q.top,k.depth); q.deep=Math.max(q.deep,k.depth);
      }
    }
    /* turning at the hand, a koi swirls the water over it */
    if(call) for(const k of K){ const dg=Math.hypot(H.kx-k.x,H.kz-k.z);
      if(dg<1.1&&Math.abs(k.w)>.85&&P.t-k.cool>8&&P.t-(P.swT||-9)>5){ k.cool=P.swT=P.t; const x=k.x+Math.cos(k.h)*k.L*.35, z=k.z+Math.sin(k.h)*k.L*.35;
        if(!RM) OUT.sim.drop(x,z,.3,.45); A.swirl(.8+.2*Math.min(1,Math.abs(k.w)),pan(x,z)); P.count.swirl++; } }
    /* to their quads: each covers where its koi is seen, a box round the fish (as far as its tail can swing), stretched
       along the line of sight as the koi is drawn, and moved toward you by as much as the water bends the view */
    const cp=CAM.out.position;
    K.forEach((k,i)=>{ const ch=Math.cos(k.h), sh=Math.sin(k.h), L=k.L;
      let vx=cp.x-k.x, vz=cp.z-k.z; const hd=Math.hypot(vx,vz)||1, vy=cp.y/Math.hypot(hd,cp.y); vx/=hd; vz/=hd;
      const vk=1-clamp(vy/.4,.4,1), si=Math.sqrt(Math.max(1-vy*vy,0))/1.333, sh2=si/Math.sqrt(Math.max(1-si*si,.06))*k.depth;
      const ly=(.2+k.amp+Math.abs(k.bend)*.34)*L+.1, x0=-.56*L-.1, x1=.5*L+.1;
      [[x1,-ly],[x1,ly],[x0,ly],[x0,-ly]].forEach(([qx,qy],j)=>{ let dx=ch*qx-sh*qy, dz=sh*qx+ch*qy; const a=(dx*vx+dz*vz)*vk/(1-vk); dx+=vx*a; dz+=vz*a;
        const o=i*KQ+j; kPos[o*3]=k.x+dx+vx*sh2; kPos[o*3+1]=.01; kPos[o*3+2]=k.z+dz+vz*sh2;
        kA[o*4]=k.x; kA[o*4+1]=k.z; kA[o*4+2]=ch; kA[o*4+3]=sh; kB[o*4]=k.ph; kB[o*4+1]=k.bend; kB[o*4+2]=k.amp; kB[o*4+3]=L; kC[o*4]=k.kind; kC[o*4+1]=k.depth; kC[o*4+2]=1; kC[o*4+3]=k.seed; }); });
    if(P.koiG) for(const n of ['position','aA','aB','aC']) P.koiG.attributes[n].needsUpdate=true;
  }

  /* for the tests: where a stone or a koi is on the screen */
  P.screen=(x,z,y=0)=>{ _v.set(x,y,z).project(CAM.out); return [(_v.x*.5+.5)*innerWidth,(-_v.y*.5+.5)*innerHeight,_v.z]; };
  P.home=()=>home();
  return P;
})();

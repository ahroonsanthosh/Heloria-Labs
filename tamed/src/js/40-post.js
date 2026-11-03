/* ================= POST: BLOOM, TRANSITIONS, THE DROP, THE FILM ================= */
const POST={};
(()=>{
  if(!GL_OK) return;
  const vs=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
  const quad=new T.Mesh(new T.PlaneGeometry(2,2)); quad.frustumCulled=false;
  const scene=new T.Scene(); scene.add(quad); const cam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  POST.pass=(mat,target)=>{ quad.material=mat; renderer.setRenderTarget(target); renderer.render(scene,cam); };
  const o={depthBuffer:false};
  POST.mix=RT(4,4,o);
  POST.down=[]; POST.up=[];
  for(let i=0;i<QL.bloomLv;i++){ POST.down.push(RT(4,4,o)); POST.up.push(RT(4,4,o)); }
  POST.downM=new T.ShaderMaterial({uniforms:{t:{value:null},uHp:{value:new T.Vector2()}},vertexShader:vs,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D t; uniform vec2 uHp; varying vec2 vUv; void main(){ vec3 s=texture2D(t,vUv).rgb*4.;
      s+=texture2D(t,vUv-uHp).rgb; s+=texture2D(t,vUv+uHp).rgb; s+=texture2D(t,vUv+vec2(uHp.x,-uHp.y)).rgb; s+=texture2D(t,vUv-vec2(uHp.x,-uHp.y)).rgb;
      gl_FragColor=vec4(min(s/8.,vec3(60.)),1.); }`});
  POST.upM=new T.ShaderMaterial({uniforms:{t:{value:null},tAdd:{value:null},uHp:{value:new T.Vector2()}},vertexShader:vs,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D t,tAdd; uniform vec2 uHp; varying vec2 vUv; void main(){ vec2 h=uHp;
      vec3 s=texture2D(t,vUv+vec2(-h.x*2.,0.)).rgb+texture2D(t,vUv+vec2(-h.x,h.y)).rgb*2.+texture2D(t,vUv+vec2(0.,h.y*2.)).rgb+texture2D(t,vUv+vec2(h.x,h.y)).rgb*2.
        +texture2D(t,vUv+vec2(h.x*2.,0.)).rgb+texture2D(t,vUv+vec2(h.x,-h.y)).rgb*2.+texture2D(t,vUv+vec2(0.,-h.y*2.)).rgb+texture2D(t,vUv+vec2(-h.x,-h.y)).rgb*2.;
      gl_FragColor=vec4(s/12.+texture2D(tAdd,vUv).rgb,1.); }`});
  /* walking through a doorway: the place you leave dissolves from the middle outward into the one you enter */
  POST.mixM=new T.ShaderMaterial({uniforms:{tA:{value:null},tB:{value:null},uK:{value:0},uTime:GU.uTime,uAsp:{value:1},uLift:{value:new T.Color('#FFE6C4')}},vertexShader:vs,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tA,tB; uniform float uK,uTime,uAsp; uniform vec3 uLift; varying vec2 vUv; ${GLSL.noise}
    void main(){ vec2 uv=vUv; float w=sin(uK*3.14159); vec2 p=(uv-.5)*vec2(uAsp,1.);
      float n=fbm2(p*2.3+vec2(uTime*.06,uTime*.02));
      float r=length(p)*.62+(n-.45)*.6;
      float front=uK*1.65-.3;
      float m=smoothstep(front,front+.14,r);
      vec2 g=(vec2(fbm2(p*3.1+4.),fbm2(p*3.1+9.))-.47)*w*.06;
      vec2 ua=.5+(uv-.5)*(1.-.07*w)+g, ub=.5+(uv-.5)*(1.+.06*(1.-uK)*w)-g;
      vec3 c=mix(texture2D(tB,ub).rgb,texture2D(tA,ua).rgb,m);
      float seam=smoothstep(.16,0.,abs(r-front-.07))*w;
      c+=uLift*seam*.5; c*=1.+w*.3;
      gl_FragColor=vec4(c,1.); }`});
  POST.comp=new T.ShaderMaterial({uniforms:{tScene:{value:null},tBloom:{value:null},uRes:GU.uRes,uTime:GU.uTime,uAsp:{value:1},
      uExpo:{value:1},uBloom:{value:.12},uGrade:{value:new T.Color(1,1,1)},uLift:{value:new T.Vector3(.034,.028,.026)},uSat:{value:1.05},
      uVeil:{value:1},uVeilCol:{value:new T.Color('#F3DDBF')},uDark:{value:0},uDim:{value:0},uDimCol:{value:new T.Color(1,1,1)},
      uFlood:{value:0},uFloodCol:{value:new T.Color(1,1,1)},uFloodC:{value:new T.Vector2(.5,.5)},
      uMouse:{value:new T.Vector2(-999,-999)},uVel:{value:new T.Vector2()},uDropR:{value:15},uDropK:{value:0},
      uCA:{value:.0035},uVig:{value:1},uGrain:{value:.045},uFade:{value:0},uBlN:{value:1/QL.bloomLv}},
    vertexShader:vs, depthTest:false, depthWrite:false,
    fragmentShader:`uniform sampler2D tScene,tBloom; uniform vec2 uRes,uMouse,uVel,uFloodC; uniform float uTime,uAsp,uExpo,uBloom,uSat,uVeil,uDark,uDim,uFlood,uDropR,uDropK,uCA,uVig,uGrain,uFade,uBlN;
    uniform vec3 uGrade,uLift,uVeilCol,uDimCol,uFloodCol; varying vec2 vUv; ${GLSL.noise}
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
    vec3 toS(vec3 c){ return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c)); }
    void main(){
      vec2 uv=vUv, fc=uv*uRes;
      if(uDark>0.){ float tr=uDark*uDark; uv+=(vec2(vnoise(vec2(uTime*23.,3.)),vnoise(vec2(7.,uTime*19.)))-.5)*.007*tr; }
      /* the cursor is a drop of water on the glass: it magnifies, catches a highlight, casts a little shadow */
      vec2 dp=fc-uMouse; float vl=length(uVel); vec2 vd=vl>.01?uVel/vl:vec2(1.,0.); float st=clamp(vl*.0012,0.,.5);
      vec2 q=vec2(dot(dp,vd)/(1.+st),dot(dp,vec2(-vd.y,vd.x))*(1.+st*.35));
      float r=length(q)/max(uDropR,1.); float lens=0.,rim=0.,spec=0.,shade=0.;
      if(uDropK>0.){
        float h=sqrt(max(1.-r*r,0.));
        if(r<1.){ uv-=dp/uRes*(.5*h)*uDropK; lens=uDropK; }
        vec2 lq=q/uDropR-vec2(-.34,.36); spec=exp(-dot(lq,lq)*26.)*step(r,1.)*uDropK;
        rim=smoothstep(.72,.98,r)*smoothstep(1.06,.98,r)*uDropK;
        vec2 sq=(dp-vec2(2.,-4.))/uDropR; shade=exp(-pow(max(length(sq)-.7,0.)*3.,2.))*(1.-step(r,1.))*.16*uDropK;
      }
      vec2 cd=uv-.5; float ca=uCA*(dot(cd,cd)*2.2+.12)+lens*.006;
      vec3 c=vec3(texture2D(tScene,uv+cd*ca).r,texture2D(tScene,uv).g,texture2D(tScene,uv-cd*ca).b);
      vec3 bl=texture2D(tBloom,uv).rgb*uBlN;
      c+=bl*uBloom;
      /* the gate: the place is there behind a sunlit mist, which burns off from the middle when you go in */
      if(uVeil>0.){ vec2 vq=(vUv-vec2(.5,.56))*vec2(uAsp,1.); float vr=length(vq);
        float n=fbm2(vq*2.4+vec2(uTime*.035,uTime*.02));
        float f=clamp(.62*(1.-vr*.9)+.42*n,0.,1.);
        float vm=uVeil>=.999?1.:smoothstep(f*.78,f*.78+.26,uVeil);
        float bl1=dot(bl,vec3(.3,.5,.2));
        vec3 mist=uVeilCol*(.78+.3*bl1)*(1.12-vr*.32)+vec3(1.,.86,.62)*exp(-vr*vr*3.)*.22;
        c=mix(c,mist*.92+bl*.1,vm*.84); }
      c*=uExpo;
      c=aces(c*.92);
      float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,uSat);
      c=toS(c);
      c=c*(1.-uLift)+uLift;
      c*=uGrade;
      /* a project open: the room softens and dims under the page */
      if(uDim>0.){ vec3 b=toS(aces(bl*uExpo*.92)); b=b*(1.-uLift)+uLift; float gy=mix(.74,.5,smoothstep(.9,.1,vUv.y)); c=mix(c,b*uDimCol*gy,uDim); }
      /* light flooding out of a room */
      if(uFlood>0.){ vec2 fq=(vUv-uFloodC)*vec2(uAsp,1.); float fr=length(fq); float n=fbm2(fq*3.+uTime*.2);
        float R=uFlood*2.1; float m=smoothstep(R,R-.35,fr+(n-.5)*.35); c=mix(c,uFloodCol,m*clamp(uFlood*1.3,0.,1.)); }
      /* the dark: what waits on the other side */
      if(uDark>0.){ vec2 dq=(vUv-.5)*vec2(uAsp,1.); float dr=length(dq); float n=fbm2(dq*2.6+vec2(uTime*.18,-uTime*.11));
        float R=uDark*1.3; float edge=(1.-smoothstep(R-.42,R+.02,dr+(n-.5)*.5))*smoothstep(0.,.12,uDark);
        vec3 ink=vec3(.012,.012,.02); float stars=step(.9965,hash12(floor(fc/2.)))*hash12(floor(fc/2.)+3.)*edge;
        c=mix(c,ink,edge*.97)+stars*.55*uDark; c*=1.-uDark*.18; }
      c=c*(1.-lens*.03)+spec*.85-shade+rim*.06;
      c=mix(c,c*vec3(.94,.97,1.03),rim*.6);
      float v=length((vUv-.5)*vec2(uAsp,1.)*uVig); c*=mix(1.,smoothstep(1.25,.25,v),.42);
      c+=(hash12(fc+fract(uTime*7.3)*91.)-.5)*uGrain;
      c=mix(c,vec3(.96,.93,.88),uFade);
      gl_FragColor=vec4(clamp(c,0.,1.),1.);
    }`});
  POST.setSize=(w,h)=>{ POST.mix.setSize(w,h); let ww=Math.max(2,w>>1), hh=Math.max(2,h>>1);
    for(let i=0;i<QL.bloomLv;i++){ POST.down[i].setSize(ww,hh); POST.up[i].setSize(ww,hh); ww=Math.max(2,ww>>1); hh=Math.max(2,hh>>1); } };
  POST.bloom=(src)=>{
    let s=src, sw=src.width, sh=src.height;
    for(let i=0;i<QL.bloomLv;i++){ POST.downM.uniforms.t.value=s.texture; POST.downM.uniforms.uHp.value.set(.5/sw,.5/sh); POST.pass(POST.downM,POST.down[i]); s=POST.down[i]; sw=s.width; sh=s.height; }
    let u=POST.down[QL.bloomLv-1];
    for(let i=QL.bloomLv-2;i>=0;i--){ POST.upM.uniforms.t.value=u.texture; POST.upM.uniforms.tAdd.value=POST.down[i].texture; POST.upM.uniforms.uHp.value.set(.5/u.width,.5/u.height); POST.pass(POST.upM,POST.up[i]); u=POST.up[i]; }
    return u.texture;
  };
})();

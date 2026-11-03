/* ================= STILL WATER =================
   A wave equation on a ping-pong pair of targets: the cursor, a tap, a person rising from the pool
   all drop energy in and it spreads in rings. The water samples it for its normals.
   The simulated patch goes where you look: it follows the camera in whole texels, carrying its rings with it, so the
   water answers anywhere you can see it and a ring never slides */
const SIM={rect:new T.Vector4(-72,-60,128,128)}; // xz origin and size of the simulated patch, in metres
function makeSim(){
  const N=QL.sim, o={type:T.HalfFloatType,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,wrapS:T.ClampToEdgeWrapping,wrapT:T.ClampToEdgeWrapping};
  const a=RT(N,N,o), b=RT(N,N,o);
  const drops=[]; for(let i=0;i<4;i++) drops.push(new T.Vector4(0,0,0,0));
  const mat=new T.ShaderMaterial({uniforms:{tPrev:{value:null},uTx:{value:new T.Vector2(1/N,1/N)},uD:{value:drops},uSeg:{value:new T.Vector4()},uSegK:{value:0},uSize:{value:SIM.rect.z},uK:{value:.16},uDamp:{value:.986},uShift:{value:new T.Vector2()}},
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader:`uniform sampler2D tPrev; uniform vec2 uTx,uShift; uniform vec4 uD[4]; uniform vec4 uSeg; uniform float uSegK,uSize,uK,uDamp; varying vec2 vUv;
    float seg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.); return length(pa-ba*h); }
    vec4 at(vec2 u){ return (u.x<0.||u.y<0.||u.x>1.||u.y>1.)?vec4(0.):texture2D(tPrev,u); }
    void main(){
      vec2 u=vUv+uShift; vec4 c=at(u); float h=c.r, hp=c.g;
      float s=at(u+vec2(uTx.x,0.)).r+at(u-vec2(uTx.x,0.)).r+at(u+vec2(0.,uTx.y)).r+at(u-vec2(0.,uTx.y)).r;
      float nh=(2.*h-hp+uK*(s-4.*h))*uDamp;
      vec2 wp=vUv*uSize;
      for(int i=0;i<4;i++){ vec4 d=uD[i]; if(d.w!=0.){ float r=length(wp-d.xy)/d.z; nh+=d.w*exp(-r*r*2.); } }
      if(uSegK!=0.){ float r=seg(wp,uSeg.xy,uSeg.zw)/.55; nh+=uSegK*exp(-r*r*2.); }
      vec2 e=min(vUv,1.-vUv); nh*=smoothstep(0.,.02,min(e.x,e.y));
      gl_FragColor=vec4(clamp(nh,-4.,4.),h,0.,1.);
    }`, depthTest:false, depthWrite:false});
  const sc=new T.Scene(), q=new T.Mesh(new T.PlaneGeometry(2,2),mat); q.frustumCulled=false; sc.add(q);
  const cam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  let cur=a, prev=b, acc=0, nd=0, segW=null;
  const W=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], want={x:SIM.rect.x,y:SIM.rect.y}, TX=SIM.rect.z/N, _f=v3();
  const sim={ get tex(){ return cur.texture; },
    clear(){ [a,b].forEach(t=>{ renderer.setRenderTarget(t); renderer.setClearColor(0,0); renderer.clear(); }); renderer.setClearColor(0,0); },
    /* x,z world position, radius metres, strength: kept in the world until the next step places it in the patch */
    drop(x,z,r,k){ if(nd>=4) return; const w=W[nd++]; w[0]=x; w[1]=z; w[2]=r; w[3]=k; },
    stroke(x0,z0,x1,z1,k){ segW=[x0,z0,x1,z1,k]; },
    /* where the patch should be: centred a little ahead of the camera, over the water it is looking at */
    follow(c){ c.getWorldDirection(_f); _f.y=0; if(_f.lengthSq()<1e-6) _f.set(0,0,-1); _f.normalize();
      const sz=SIM.rect.z; want.x=c.position.x+_f.x*sz*.3-sz/2; want.y=c.position.z+_f.z*sz*.3-sz/2; },
    step(dt){
      acc+=dt; let n=0; const H=1/40, U=mat.uniforms;
      while(acc>=H&&n<3){ acc-=H; n++;
        if(n===1){
          /* move the patch in whole texels, and the rings with it */
          const dx=Math.round((want.x-SIM.rect.x)/TX), dz=Math.round((want.y-SIM.rect.y)/TX);
          U.uShift.value.set(dx/N,dz/N); SIM.rect.x+=dx*TX; SIM.rect.y+=dz*TX;
          for(let i=0;i<4;i++){ const w=W[i]; if(i<nd){ const u=w[0]-SIM.rect.x, v=w[1]-SIM.rect.y; drops[i].set(u,v,w[2],(u<0||v<0||u>SIM.rect.z||v>SIM.rect.w)?0:w[3]); } else drops[i].w=0; }
          if(segW){ U.uSeg.value.set(segW[0]-SIM.rect.x,segW[1]-SIM.rect.y,segW[2]-SIM.rect.x,segW[3]-SIM.rect.y); U.uSegK.value=segW[4]; }
        }
        U.tPrev.value=cur.texture; renderer.setRenderTarget(prev); renderer.render(sc,cam); const t=cur; cur=prev; prev=t;
        U.uShift.value.set(0,0); for(const d of drops) d.w=0; nd=0; segW=null; U.uSegK.value=0; }
      if(acc>H*3) acc=0;
    }};
  return sim;
}

/* the reflected headline: words drawn where the page shows them, mirrored about the horizon in the water */
const TXT={cv:document.createElement('canvas'), tex:null, dirty:true, scale:1};
TXT.ctx=TXT.cv.getContext('2d');
function drawReflectText(){
  const c=TXT.cv, k=TXT.scale, w=Math.max(2,Math.floor(innerWidth*k)), h=Math.max(2,Math.floor(innerHeight*k));
  if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
  const x=TXT.ctx; x.clearRect(0,0,w,h);
  $$('[data-reflect]').forEach(el=>{
    const ch=+el.dataset.reflect; x.fillStyle=ch?'#00ff00':'#ff0000'; x.globalCompositeOperation='lighter';
    const cs=getComputedStyle(el); x.font=`${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize)*k}px ${cs.fontFamily}`; x.textBaseline='alphabetic';
    /* measure the words where the layout puts them, ignoring the reveal animation's transforms */
    const sec=el.closest('.sec')||el, sr=sec.getBoundingClientRect(), words=$$('.w',el), list=words.length?words:[el];
    const m=x.measureText('Hg'), asc=m.fontBoundingBoxAscent||parseFloat(cs.fontSize)*k*.8, des=m.fontBoundingBoxDescent||parseFloat(cs.fontSize)*k*.22;
    for(const wd of list){ let L=0,Tp=0,n=wd; while(n&&n!==sec){ L+=n.offsetLeft; Tp+=n.offsetTop; n=n.offsetParent; } const h=wd.offsetHeight*k; if(!wd.offsetWidth) continue;
      const base=(sr.top+Tp)*k+(h-(asc+des))/2+asc;
      x.fillText(wd.textContent,(sr.left+L)*k,base); }
  });
  x.globalCompositeOperation='source-over';
  if(!TXT.tex){ TXT.tex=new T.CanvasTexture(c); TXT.tex.minFilter=T.LinearFilter; TXT.tex.generateMipmaps=false; }
  TXT.tex.needsUpdate=true; TXT.dirty=false;
}

function waterMat(U,mirror,sim,o={}){
  const u=Object.assign({tRefl:{value:mirror.rt.texture}, uTexMat:{value:mirror.texMat}, tSim:{value:null}, uSim:{value:SIM.rect}, uSimTx:{value:1/QL.sim},
    tText:{value:null}, uTextK:{value:new T.Vector2(0,0)}, uTextCol:{value:new T.Color('#2A2520')}, uHorizon:{value:.5},
    uDeep:{value:col(o.deep||'#122022')}, uSunCol:{value:new T.Color()}, uSky:{value:new T.Color()}, uRippleK:{value:1}, uWaveK:{value:1}, uSpec:{value:1}},GU,U);
  return new T.ShaderMaterial({uniforms:u,
    vertexShader:`uniform mat4 uTexMat; varying vec3 vWP; varying vec4 vMC; void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vMC=uTexMat*w; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D tRefl,tSim,tText; uniform vec4 uSim; uniform float uSimTx,uTime,uHorizon,uRippleK,uWaveK,uSpec; uniform vec2 uRes,uTextK;
    uniform vec3 uDeep,uSunCol,uSky,uTextCol; varying vec3 vWP; varying vec4 vMC;
    ${GLSL.noise}${GLSL.haze}
    vec2 waves(vec2 p,float t){
      vec2 g=vec2(0.);
      g+=vec2(cos(p.x*.9+t*.7+p.y*.3),cos(p.y*1.1-t*.6))*.010;
      g+=vec2(cos(p.x*2.3-p.y*1.7+t*1.3),cos(p.y*2.1+p.x*1.3+t*1.1))*.0055;
      float n1=vnoise(p*1.6+t*.25), n2=vnoise(p*1.6+vec2(5.2,1.3)-t*.22);
      g+=(vec2(n1,n2)-.5)*.028;
      return g;
    }
    void main(){
      vec3 toC=cameraPosition-vWP; float dist=length(toC); vec3 V=toC/dist;
      vec2 suv=(vWP.xz-uSim.xy)/uSim.zw; vec2 rg=vec2(0.);
      if(suv.x>0.&&suv.y>0.&&suv.x<1.&&suv.y<1.){
        float hl=texture2D(tSim,suv-vec2(uSimTx,0.)).r, hr=texture2D(tSim,suv+vec2(uSimTx,0.)).r;
        float hd=texture2D(tSim,suv-vec2(0.,uSimTx)).r, hu=texture2D(tSim,suv+vec2(0.,uSimTx)).r;
        rg=vec2(hr-hl,hu-hd)*.9*uRippleK;
      }
      float far=1./(1.+dist*.035);
      float paw=smoothstep(.42,.78,vnoise(vWP.xz*.045+vec2(uTime*.018,-uTime*.011))+vnoise(vWP.xz*.11-uTime*.03)*.35);
      vec2 wg=waves(vWP.xz,uTime)*uWaveK*(.22+.78*far)*(.28+.95*paw);
      vec3 N=normalize(vec3(-(rg.x+wg.x),1.,-(rg.y+wg.y)));
      vec2 off=N.xz*(1.1/max(vMC.w,1.));
      vec2 ruv=vMC.xy/vMC.w+off;
      vec4 rf=texture2D(tRefl,ruv);
      float cs=max(dot(N,V),0.);
      float fr=.02+.98*pow(1.-cs,5.);
      vec3 body=uDeep*(.55+.45*uSky);
      vec3 c=mix(body,rf.rgb,clamp(fr*1.04,0.,1.));
      vec3 Hh=normalize(uSunDir+V); float sp=pow(max(dot(N,Hh),0.),900.)*60.+pow(max(dot(N,Hh),0.),90.)*1.2;
      c+=uSunCol*sp*uSpec*fr*smoothstep(-.02,.06,uSunDir.y);
      /* the headline, mirrored about the horizon and broken by the same ripples */
      vec2 sp2=gl_FragCoord.xy/uRes; vec2 tuv=vec2(sp2.x,2.*uHorizon-sp2.y)+off*2.+vec2(rg.x,rg.y)*.006;
      vec4 tx=texture2D(tText,tuv);
      float ta=clamp(tx.r*uTextK.x+tx.g*uTextK.y,0.,1.)*(1.-rf.a)*smoothstep(.0,.08,uHorizon-sp2.y)*smoothstep(.0,.2,sp2.y)*.34;
      c=mix(c,uTextCol*(.6+.4*fr),ta*mix(.55,1.,fr));
      c=haze(c,vWP);
      gl_FragColor=vec4(c,1.);
    }`});
}

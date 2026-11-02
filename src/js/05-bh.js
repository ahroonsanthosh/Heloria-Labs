/* ================= RAY-TRACED BLACK HOLE =================
   Null geodesics in Schwarzschild spacetime, units of the Schwarzschild radius (rs = 1).
   A thin Novikov-Thorne disk, Doppler beaming and gravitational redshift, and a lensed sky.
   Rendered at reduced resolution into its own target, then used as the backdrop of the 3D scene. */
const GLSL_BB=`
vec3 blackbody(float t){ t=clamp(t,1000.,40000.)/100.;
  float r=t<=66.?1.:clamp(1.29293618606*pow(t-60.,-.1332047592),0.,1.);
  float g=t<=66.?clamp(.39008157876*log(t)-.63184144378,0.,1.):clamp(1.12989086089*pow(t-60.,-.0755148492),0.,1.);
  float b=t>=66.?1.:(t<=19.?0.:clamp(.54320678911*log(t-10.)-1.19625408914,0.,1.));
  return vec3(r,g,b); }`;
function blackbodyJS(k){ const t=clamp(k,1000,40000)/100; const c=v=>clamp(v,0,1);
  const r=t<=66?1:c(1.29293618606*Math.pow(t-60,-.1332047592));
  const g=t<=66?c(.39008157876*Math.log(t)-.63184144378):c(1.12989086089*Math.pow(t-60,-.0755148492));
  const b=t>=66?1:(t<=19?0:c(.54320678911*Math.log(t-10)-1.19625408914));
  return new T.Color(r,g,b); }
const BH={RS:.55, scale:Q<1?.5:.9, cap:Q<1?.7:1, steps:Q<1?120:180};   // trace resolution: scale x device pixels, never above cap x CSS pixels
if(window.__TEST&&!window.__HQ) { BH.scale=.22; BH.steps=90; }   // __HQ: a test that wants real-resolution stills
BH.rt=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false});
BH.u={uCam:{value:new T.Vector3(0,2,30)},uEsc:{value:60},uBasis:{value:new T.Matrix3()},uTan:{value:.4},uAsp:{value:1},uTime:G.uTime,
  uRin:{value:3.},uRout:{value:12.},uTmax:{value:5600},uBeam:{value:.9},uDisk:{value:1},uSky:{value:1},uExpo:{value:1},uHold:{value:0},uStar:{value:0},uSpin:{value:1},tSky:{value:null}};
BH.mat=new T.ShaderMaterial({uniforms:BH.u,depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`precision highp float;
  uniform samplerCube tSky; uniform vec3 uCam; uniform mat3 uBasis; uniform float uEsc,uTan,uAsp,uTime,uRin,uRout,uTmax,uBeam,uDisk,uSky,uExpo,uHold,uStar,uSpin; varying vec2 vUv;
  ${GLSL_BB}
  const vec3 GN=vec3(.42,.86,-.29);   // the galactic band's pole: tilted against the disk so the band crosses the sky diagonally
  float h1(float n){return fract(sin(n)*43758.5453);}
  float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p*=2.07;a*=.5;}return s;}
  // stars: three magnitudes on hashed cells of the direction sphere, colour from temperature, denser along the galactic band
  vec3 stars(vec3 d){
    vec3 c=vec3(0.); float band=exp(-pow(dot(d,GN),2.)*9.);
    for(int k=0;k<3;k++){ float sc=k==0?60.:(k==1?140.:300.); vec3 q=d*sc; vec3 id=floor(q); vec3 f=fract(q)-.5;
      float h=h3(id+float(k)*13.); float th=k==0?.975:(k==1?.955-band*.05:.93-band*.12);
      if(h>th){ vec3 o=vec3(h3(id+1.7),h3(id+3.1),h3(id+5.3))-.5; float dd=length(f-o*.7);
        float tt=h3(id+9.); float temp=k==0?mix(3800.,16000.,tt*tt):mix(2800.,9000.,tt);
        float sz=k==0?.11:(k==1?.085:.07), br=k==0?2.2:(k==1?.85:.38);
        c+=blackbody(temp)*smoothstep(sz,0.,dd)*br*(.55+.45*h3(id+4.4)); } }
    return c; }
  vec3 sky(vec3 d){ return (textureCube(tSky,d).rgb+stars(d))*uSky; }
  void main(){
    vec2 uv=(vUv*2.-1.)*vec2(uAsp,1.)*uTan;
    vec3 rd=normalize(uBasis*vec3(uv,-1.));
    vec3 p=uCam, v=rd; vec3 hv=cross(p,v); float h2=dot(hv,hv);
    vec3 col=vec3(0.); float a=0.;
    float rin=uRin, rout=uRout;
    for(int i=0;i<${BH.steps};i++){
      float r=length(p);
      float dt=clamp(.07*r*r/(r+2.),.012,max(3.,r*.08));
      vec3 pp=p;
      vec3 acc=-1.5*h2*p/pow(r,5.);
      v+=acc*dt; p+=v*dt;
      // thin disk crossing
      if(uDisk>0. && pp.y*p.y<0.){
        vec3 hit=mix(pp,p,pp.y/(pp.y-p.y)); float rr=length(hit.xz);
        if(rr>rin && rr<rout){
          float x=rin/rr; float prof=pow(x,.75)*pow(max(1.-sqrt(x),0.),.25)*2.05; float T0=uTmax*pow(prof,1.35);
          vec3 vd=normalize(vec3(-hit.z,0.,hit.x)); float beta=min(sqrt(.5/max(rr-1.,.2)),.62)*uSpin;
          vec3 n=-normalize(v); float gam=inversesqrt(1.-beta*beta);
          float D=1./(gam*(1.-beta*dot(vd,n))); float g=D*sqrt(1.-1./rr);
          float gb=mix(1.,g,uBeam);
          float ph=atan(hit.z,hit.x); float om=uTime*.9/pow(rr,1.5)*uSpin;
          vec3 q=vec3(rr*1.5,cos(ph-om)*2.,sin(ph-om)*2.);
          float tex=fbm(q)*.7+.55*fbm(vec3(rr*9.,cos(ph-om*1.2)*9.,sin(ph-om*1.2)*9.));
          float rings=.72+.28*sin(rr*11.+fbm(q*.7)*6.)*sin(rr*3.1+1.);
          float edge=smoothstep(rin,rin*1.08,rr)*smoothstep(rout,rout*.5,rr);
          float dens=clamp((tex*rings-.12)*edge*1.5,0.,1.);
          vec3 e=blackbody(T0*gb)*pow(gb,3.4)*prof*prof*2.1*dens;
          float al=clamp(dens*1.1,0.,1.);
          col+=(1.-a)*e*al; a+=(1.-a)*al;
          if(a>.995) break;
        }
      }
      if(r<1.){ a=1.; break; }
      if(r>uEsc&&dot(p,v)>0.) break;   // heading out past the disk and the camera: the rest of the bend is negligible
    }
    vec3 d=normalize(v);
    col+=(1.-a)*sky(d);
    // collapse glow: a star before it falls in (used by the entrance)
    col+=uStar*vec3(1.,.86,.7)*.0;
    gl_FragColor=vec4(col*uExpo,1.);
  }`});

/* ================= THE SKY, DRAWN ONCE =================
   A faint galactic band with dust lanes and star clouds, a few distant galaxies (one large spiral), and two faint
   nebulae. Rendered into a cube at boot; the tracer samples it for every ray that escapes, so all of it is lensed. */
BH.makeSky=function(){
  const N=window.__TEST&&!window.__HQ?256:(Q<1?512:768);
  const rt=new T.WebGLCubeRenderTarget(N,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter});
  const cam=new T.CubeCamera(.1,10,rt), sc=new T.Scene();
  const G_=[ // galaxies: direction, angular radius (rad), inclination, position angle, kind (0 spiral, 1 elliptical, 2 edge-on), arms seed
    // the orbit camera looks down past the plane, so most of them sit below it, where you will actually see them
    [[.61,-.43,.66],.11,1.0,.6,0,1.3],[[-.78,-.3,.4],.034,.5,2.1,0,4.2],[[.1,-.5,-.83],.027,.9,1.2,0,2.7],
    [[-.45,-.35,.82],.042,1.48,.4,2,0],[[.88,-.2,-.46],.015,.4,0,1,0],[[-.6,.35,-.7],.019,.7,1.9,1,0],[[.05,-.72,-.6],.023,1.15,2.6,0,6.1]];
  const glsl=G_.map(g=>{ const d=new T.Vector3(...g[0]).normalize(); return `galaxy(d,vec3(${d.x.toFixed(4)},${d.y.toFixed(4)},${d.z.toFixed(4)}),${g[1].toFixed(4)},${g[2].toFixed(3)},${g[3].toFixed(3)},${g[4].toFixed(1)},${g[5].toFixed(2)})`; }).join('+');
  const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    vertexShader:`varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`precision highp float; varying vec3 vD;
    ${GLSL_BB}
    const vec3 GN=vec3(.42,.86,-.29);
    float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}
    float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    vec3 galaxy(vec3 d,vec3 c,float R,float inc,float pa,float kind,float seed){
      float cd=dot(d,c); if(cd<cos(R*2.6)) return vec3(0.);
      vec3 e1=normalize(cross(c,abs(c.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.))), e2=cross(c,e1);
      vec2 q=vec2(dot(d,e1),dot(d,e2))/max(cd,.2)/R;
      float cp=cos(pa), sp=sin(pa); q=vec2(cp*q.x-sp*q.y,sp*q.x+cp*q.y);
      if(kind>1.5){ // edge-on: a thin luminous disk split by a dark dust lane
        float rr=abs(q.x), z=q.y;
        float disk=exp(-rr*2.6)*exp(-abs(z)*26.)*1.3+exp(-dot(q,q)*14.)*.9;
        float lane=1.-.85*exp(-pow(z*40.+.25,2.))*smoothstep(1.,.15,rr);
        return mix(vec3(1.,.82,.62),vec3(.78,.86,1.),smoothstep(.1,.7,rr))*disk*lane*.22; }
      q.y/=max(cos(inc),.12);
      float r=length(q), th=atan(q.y,q.x);
      if(kind>.5){ // elliptical: a smooth warm glow
        return vec3(1.,.8,.6)*exp(-pow(r,.62)*4.2)*.35; }
      float arms=pow(.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)),2.6);
      float knots=smoothstep(.986,1.,h2(floor(q*46.)+seed))*arms*smoothstep(.95,.25,r);
      float dust=1.-.55*pow(.5+.5*cos(2.*(th-log(r+.02)*2.4-seed)+.55),5.)*smoothstep(.12,.4,r);
      float disk=exp(-r*3.1)*(.35+.9*arms)*dust;
      float bulge=exp(-r*r*55.);
      vec3 col=vec3(.75,.84,1.)*disk*.8+vec3(1.,.83,.6)*bulge*.9+vec3(1.,.55,.5)*knots*.45;
      return col*.22*smoothstep(1.4,.6,r); }
    vec3 nebula(vec3 d,vec3 c,float R,vec3 tint){
      float cd=dot(d,c); if(cd<cos(R*1.6)) return vec3(0.);
      float a=acos(clamp(cd,-1.,1.))/R; float f=fbm(d*9.+c*3.), g=fbm(d*23.-c*5.);
      float m=smoothstep(1.2,.2,a)*smoothstep(.45,.85,f)*(.6+.8*g);
      return tint*m; }
    void main(){
      vec3 d=normalize(vD);
      // the galactic band: diffuse light, clumped star clouds, dark dust lanes along its middle
      float bz=dot(d,GN), band=exp(-bz*bz*9.), core=exp(-bz*bz*40.);
      float clouds=fbm(d*7.+2.), fine=fbm(d*31.-4.);
      float lanes=smoothstep(.42,.7,fbm(d*5.5+vec3(9.,3.,1.)))*core;
      vec3 c=vec3(.005,.0055,.007)*(.5+fbm(d*1.7+11.));
      c+=mix(vec3(.9,.82,.7),vec3(.72,.78,.95),clouds)*band*(.008+.03*pow(clouds,2.4)+.03*pow(fine,3.))*(1.-.85*lanes);
      // two faint nebulae in deep amber, a hint of hydrogen glow, no more
      c+=nebula(d,normalize(vec3(-.55,.18,-.81)),.32,vec3(.035,.011,.006))+nebula(d,normalize(vec3(.62,-.5,-.55)),.22,vec3(.026,.012,.006));
      c+=${glsl};
      gl_FragColor=vec4(c,1.); }`});
  sc.add(new T.Mesh(new T.BoxGeometry(2,2,2),mat));
  cam.update(renderer,sc); mat.dispose(); sc.children[0].geometry.dispose();
  BH.u.tSky.value=rt.texture; BH.skyRT=rt;
};
BH.quad=new T.Mesh(new T.PlaneGeometry(2,2),BH.mat); BH.quad.frustumCulled=false; BH.scene=new T.Scene(); BH.scene.add(BH.quad);
BH.resize=function(){ const k=Math.min(DPR*BH.scale,BH.cap); BH.rt.setSize(Math.max(2,Math.floor(innerWidth*k)),Math.max(2,Math.floor(innerHeight*k))); };
BH.render=function(cam){
  cam.updateMatrixWorld(); const e=cam.matrixWorld.elements;
  BH.u.uBasis.value.set(e[0],e[4],e[8], e[1],e[5],e[9], e[2],e[6],e[10]);
  BH.u.uCam.value.copy(cam.position).multiplyScalar(1/BH.RS); BH.u.uEsc.value=Math.max(26,BH.u.uCam.value.length()*1.08);
  BH.u.uTan.value=Math.tan(cam.fov*Math.PI/360); BH.u.uAsp.value=cam.aspect;
  renderer.setRenderTarget(BH.rt); renderer.render(BH.scene,ortho);
};
/* backdrop quad that samples the traced image, drawn first in the hub scene */
BH.backMat=new T.ShaderMaterial({uniforms:{tBH:{value:BH.rt.texture}},depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,.9999,1.); }`,
  fragmentShader:`uniform sampler2D tBH; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tBH,vUv).rgb,1.); }`});
BH.back=new T.Mesh(new T.PlaneGeometry(2,2),BH.backMat); BH.back.frustumCulled=false; BH.back.renderOrder=-10;
/* depth-only occluder so raster objects behind the shadow disappear */
BH.occ=new T.Mesh(new T.SphereGeometry(2.55*BH.RS,32,20),new T.MeshBasicMaterial({colorWrite:false}));
BH.occ.renderOrder=-5;

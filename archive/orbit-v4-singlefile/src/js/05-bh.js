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
const BH={RS:.55, scale:Q<1?.42:.6, steps:Q<1?110:170};
if(window.__TEST) { BH.scale=.22; BH.steps=90; }
BH.rt=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false});
BH.u={uCam:{value:new T.Vector3(0,2,30)},uBasis:{value:new T.Matrix3()},uTan:{value:.4},uAsp:{value:1},uTime:G.uTime,
  uRin:{value:3.},uRout:{value:12.},uTmax:{value:5600},uBeam:{value:.9},uDisk:{value:1},uSky:{value:1},uExpo:{value:1},uHold:{value:0},uStar:{value:0},uSpin:{value:1}};
BH.mat=new T.ShaderMaterial({uniforms:BH.u,depthTest:false,depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`precision highp float;
  uniform vec3 uCam; uniform mat3 uBasis; uniform float uTan,uAsp,uTime,uRin,uRout,uTmax,uBeam,uDisk,uSky,uExpo,uHold,uStar,uSpin; varying vec2 vUv;
  ${GLSL_BB}
  float h1(float n){return fract(sin(n)*43758.5453);}
  float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p*=2.07;a*=.5;}return s;}
  vec3 sky(vec3 d){
    vec3 c=vec3(0.);
    // stars: hashed cells on the direction sphere
    for(int k=0;k<2;k++){ float sc=k==0?90.:220.; vec3 q=d*sc; vec3 id=floor(q); vec3 f=fract(q)-.5;
      float h=h3(id+float(k)*13.); if(h>.965-float(k)*.012){ vec3 o=vec3(h3(id+1.7),h3(id+3.1),h3(id+5.3))-.5; float dd=length(f-o*.7);
        float t=mix(3200.,14000.,pow(h3(id+9.),2.)); c+=blackbody(t)*smoothstep(.12,0.,dd)*(k==0?1.6:.7)*(.6+.4*sin(uTime*(1.+h*4.)+h*40.)); } }
    float band=exp(-pow(dot(d,normalize(vec3(.32,1.,.18))),2.)*7.);
    float n=fbm(d*2.4+3.); float m=fbm(d*5.5-7.);
    c+=vec3(.05,.045,.06)*n*n*1.4+vec3(.16,.12,.1)*band*pow(m,2.6)*.9+vec3(.04,.07,.11)*pow(fbm(d*1.6+11.),3.)*.8;
    return c*uSky; }
  void main(){
    vec2 uv=(vUv*2.-1.)*vec2(uAsp,1.)*uTan;
    vec3 rd=normalize(uBasis*vec3(uv,-1.));
    vec3 p=uCam, v=rd; vec3 hv=cross(p,v); float h2=dot(hv,hv);
    vec3 col=vec3(0.); float a=0.;
    float rin=uRin, rout=uRout;
    for(int i=0;i<${BH.steps};i++){
      float r=length(p);
      float dt=clamp(.07*r*r/(r+2.),.012,3.);
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
      if(r>420.) break;
    }
    vec3 d=normalize(v);
    col+=(1.-a)*sky(d);
    // collapse glow: a star before it falls in (used by the entrance)
    col+=uStar*vec3(1.,.86,.7)*.0;
    gl_FragColor=vec4(col*uExpo,1.);
  }`});
BH.quad=new T.Mesh(new T.PlaneGeometry(2,2),BH.mat); BH.quad.frustumCulled=false; BH.scene=new T.Scene(); BH.scene.add(BH.quad);
BH.resize=function(){ BH.rt.setSize(Math.max(2,Math.floor(innerWidth*DPR*BH.scale)),Math.max(2,Math.floor(innerHeight*DPR*BH.scale))); };
BH.render=function(cam){
  cam.updateMatrixWorld(); const e=cam.matrixWorld.elements;
  BH.u.uBasis.value.set(e[0],e[4],e[8], e[1],e[5],e[9], e[2],e[6],e[10]);
  BH.u.uCam.value.copy(cam.position).multiplyScalar(1/BH.RS);
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

/* ================= RENDERER, QUALITY, SHARED SHADER CODE ================= */
const canvas=$('#gl');
let renderer=null;
const GL_OK=(()=>{
  if(!T) return false;
  try{ renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,stencil:false,depth:true,powerPreference:'high-performance'}); }catch(e){ return false; }
  return !!(renderer&&renderer.capabilities.isWebGL2);
})();

/* quality: what this device can afford. The frame timer below moves dpr up and down at run time */
const QL={
  dprMax:HQ?1:Math.min(devicePixelRatio||1, MOBILE?1.5:1.75),
  dpr:1, refl:HQ?.75:(MOBILE?.4:.5), sim:MOBILE?256:512, grass:MOBILE?.5:1, samples:(TEST&&!HQ)||MOBILE?0:4,
  ao:MOBILE?3:5, shadow:HQ?4096:(MOBILE?1024:2048), seeds:MOBILE?500:1100, bloomLv:MOBILE?4:5,
};
QL.dpr=TEST?1:QL.dprMax;
/* functional tests can ask for cheap pixels: the page, the walk and the timing are the same */
if(window.__LOWQ){ QL.dpr=QL.dprMax=.5; QL.ao=2; QL.refl=.3; QL.grass=.3; QL.sim=256; QL.shadow=512; QL.seeds=300; QL.bloomLv=4; }

const GU={uTime:{value:0}, uRefl:{value:0}, uRes:{value:new T.Vector2(1,1)}};

function RT(w,h,o={}){
  return new T.WebGLRenderTarget(w,h,Object.assign({type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,
    depthBuffer:true,stencilBuffer:false,generateMipmaps:false,colorSpace:T.NoColorSpace},o));
}

if(GL_OK){
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFShadowMap; renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=T.NoToneMapping;
  renderer.info.autoReset=true;
}

/* ---------- GLSL ---------- */
const GLSL={};
GLSL.noise=`
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),f.x),mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),f.x),f.y);}
float vnoise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=hash13(i),b=hash13(i+vec3(1.,0.,0.)),c=hash13(i+vec3(0.,1.,0.)),d=hash13(i+vec3(1.,1.,0.));
  float e=hash13(i+vec3(0.,0.,1.)),g=hash13(i+vec3(1.,0.,1.)),h=hash13(i+vec3(0.,1.,1.)),k=hash13(i+vec3(1.,1.,1.));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,k,f.x),f.y),f.z);}
float fbm2(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+3.1;a*=.5;}return s;}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*vnoise3(p);p=p*2.03+1.7;a*=.5;}return s;}
`;
GLSL.sdf=`
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float archO(float x,float y,float r){ return y>0.?length(vec2(x,y))-r:abs(x)-r; }
`;
/* height haze: denser near the water, brighter toward the sun */
GLSL.haze=`
uniform vec3 uSunDir; uniform vec3 uHazeCol; uniform vec3 uHazeSun; uniform vec4 uFog;
vec3 haze(vec3 c,vec3 wp){
  vec3 v=wp-cameraPosition; float d=length(v); vec3 dir=v/max(d,1e-4);
  float k=max(uFog.y,1e-3), h0=max(cameraPosition.y,0.), h1=max(wp.y,0.), dh=h1-h0;
  float m=abs(dh*k)>1e-3?(exp(-k*h0)-exp(-k*h1))/(k*dh):exp(-k*h0);
  float f=min(1.-exp(-uFog.x*d*m),uFog.w);
  float s=pow(max(dot(dir,uSunDir),0.),uFog.z);
  return mix(c,mix(uHazeCol,uHazeSun,s),f);
}
`;
GLSL.ao=`
uniform float uAOk;
float sceneAO(vec3 p,vec3 n){
  float o=0.,ws=0.;
  for(int i=0;i<AO_N;i++){ float fi=(float(i)+1.)/float(AO_N); float h=.05+1.05*fi*fi; float d=mapAO(p+n*h); float w=1.-.45*fi; o+=w*clamp((h-d)/h,0.,1.); ws+=w; }
  return clamp(1.-uAOk*o/ws,0.,1.);
}
`;
/* pale stone: soft clouding, fine grain, travertine streaks, ashlar coursing on the flat faces */
GLSL.stone=`
uniform float uJoint; uniform vec3 uWarm;
vec3 stoneTex(vec3 p,vec3 n){
  vec3 an=abs(n);
  float b=fbm3(p*.21);
  float g=vnoise3(p*3.7)*.55+vnoise3(p*13.)*.45;
  float st=vnoise3(vec3(p.x*.55,p.y*8.,p.z*.55));
  float k=.9+.17*b+.06*g-.07*smoothstep(.62,.92,st);
  if(uJoint>0.){
    float e=1.,id=0.;
    if(an.y>.92){ vec2 q=p.xz/1.24; vec2 f=abs(fract(q)-.5)*1.24; e=min(.62-f.x,.62-f.y); id=hash12(floor(q)); }
    else if(an.x>.92||an.z>.92){ float u=an.x>.92?p.z:p.x; float row=floor(p.y/.62); u+=mod(row,2.)*.62+row*.17;
      float fu=abs(fract(u/1.24)-.5)*1.24, fv=abs(fract(p.y/.62)-.5)*.62; e=min(.62-fu,.31-fv); id=hash12(vec2(floor(u/1.24),row)); }
    float fw=fwidth(e)*1.4+1e-4;
    float j=smoothstep(.0035,.0035+fw,e);
    float fade=1.-smoothstep(.008,.05,fw);
    k*=mix(1.,mix(.8,1.,j),fade*uJoint);
    k*=mix(1.,.965+.07*id,uJoint);
  }
  return vec3(k)*mix(vec3(.985,1.,1.02),uWarm,b);
}
`;

/* a scene's lighting atmosphere: its own sun, haze and ambient occlusion strength */
function sceneU(){
  return {uSunDir:{value:v3(0,1,0)}, uHazeCol:{value:col('#E9DFD2')}, uHazeSun:{value:col('#FFD9A8')}, uFog:{value:new T.Vector4(.0026,.05,7,.92)}, uAOk:{value:1}};
}

/* stone: MeshStandardMaterial with our grain, signed-distance ambient occlusion and haze stitched in.
   o.sdf is GLSL defining float mapAO(vec3 p) for this scene */
function stoneMat(o){
  const m=new T.MeshStandardMaterial({color:o.color||'#EDE3D3', roughness:o.rough??.92, metalness:0});
  m.userData.u={uJoint:{value:o.joint??1}, uWarm:{value:col(o.warm||'#FFF2DF')}, uMirror:{value:null}, uMirrorK:{value:o.mirrorK||0}, uTexMat:{value:new T.Matrix4()}, uEmis:{value:col(o.emis||'#000000')}};
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,o.U,m.userData.u,GU);
    const mir=!!o.mirror;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP; varying vec3 vWN;'+(mir?'\nuniform mat4 uTexMat; varying vec4 vMC;':''))
      .replace('#include <fog_vertex>','#include <fog_vertex>\n{ vec4 w4=modelMatrix*vec4(transformed,1.); vWP=w4.xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);'+(mir?' vMC=uTexMat*w4;':'')+' }');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n#define AO_N '+QL.ao+'\nvarying vec3 vWP; varying vec3 vWN;\nuniform vec3 uEmis; uniform float uRefl;'+(mir?'\nuniform sampler2D uMirror; uniform float uMirrorK; varying vec4 vMC;':'')
        +GLSL.noise+GLSL.sdf+(o.sdf||'float mapAO(vec3 p){return 1e5;}')+GLSL.ao+GLSL.haze+GLSL.stone+(o.glsl||''))
      .replace('#include <map_fragment>','#include <map_fragment>\n vec3 wN=normalize(vWN); diffuseColor.rgb*=stoneTex(vWP,wN);'+(o.albedo||''))
      .replace('#include <aomap_fragment>','#include <aomap_fragment>\n{ float ao=sceneAO(vWP,wN); reflectedLight.indirectDiffuse*=ao; reflectedLight.indirectSpecular*=ao; reflectedLight.directDiffuse*=mix(1.,ao,.3); }')
      .replace('#include <opaque_fragment>',(mir?`{ vec2 ruv=vMC.xy/vMC.w; vec3 V=normalize(cameraPosition-vWP); float fr=.04+.96*pow(1.-max(dot(wN,V),0.),5.);
          vec3 rc=textureLod(uMirror,ruv,2.2).rgb*.55+textureLod(uMirror,ruv,4.).rgb*.45; outgoingLight+=rc*uMirrorK*mix(.25,1.,fr)*(1.-uRefl); }`:'')
        +'outgoingLight+=uEmis;'+(o.emisGLSL||'')+'\n#include <opaque_fragment>')
      .replace('#include <fog_fragment>','gl_FragColor.rgb=haze(gl_FragColor.rgb,vWP);');
  };
  m.customProgramCacheKey=()=>'stone:'+(o.key||'x')+(o.mirror?':m':'');
  return m;
}

/* ---------- planar mirror: the scene seen from under the water line ---------- */
const _mv={n:v3(0,1,0),p:v3(),c:v3(),v:v3(),l:v3(),t:v3(),rot:new T.Matrix4(),pl:new T.Plane(),cp:new T.Vector4(),q:new T.Vector4()};
class Mirror{
  constructor(scale,o={}){ this.scale=scale; this.y=o.y||0; this.bias=o.bias??.002;
    this.rt=RT(4,4,o.mips?{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter}:{}); this.cam=new T.PerspectiveCamera(); this.texMat=new T.Matrix4(); }
  setSize(w,h){ this.rt.setSize(Math.max(4,Math.floor(w*this.scale)),Math.max(4,Math.floor(h*this.scale))); }
  render(scene,cam,hide){
    const M=_mv, N=M.n, P=M.p.set(0,this.y,0); cam.updateMatrixWorld();
    const cp=M.c.setFromMatrixPosition(cam.matrixWorld);
    const view=M.v.subVectors(P,cp); if(view.dot(N)>0) return false;
    view.reflect(N).negate().add(P);
    M.rot.extractRotation(cam.matrixWorld);
    const look=M.l.set(0,0,-1).applyMatrix4(M.rot).add(cp);
    const tgt=M.t.subVectors(P,look); tgt.reflect(N).negate().add(P);
    const mc=this.cam; mc.position.copy(view); mc.up.set(0,1,0).applyMatrix4(M.rot).reflect(N); mc.lookAt(tgt);
    mc.near=cam.near; mc.far=cam.far; mc.fov=cam.fov; mc.aspect=cam.aspect; mc.updateMatrixWorld(); mc.projectionMatrix.copy(cam.projectionMatrix);
    this.texMat.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1).multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse);
    M.pl.setFromNormalAndCoplanarPoint(N,P).applyMatrix4(mc.matrixWorldInverse);
    const c=M.cp.set(M.pl.normal.x,M.pl.normal.y,M.pl.normal.z,M.pl.constant), pm=mc.projectionMatrix.elements, q=M.q;
    q.x=(Math.sign(c.x)+pm[8])/pm[0]; q.y=(Math.sign(c.y)+pm[9])/pm[5]; q.z=-1; q.w=(1+pm[10])/pm[14];
    c.multiplyScalar(2/c.dot(q)); pm[2]=c.x; pm[6]=c.y; pm[10]=c.z+1-this.bias; pm[14]=c.w;
    mc.projectionMatrixInverse.copy(mc.projectionMatrix).invert();
    for(const o of hide) o.visible=false;
    GU.uRefl.value=1; renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(scene,mc); GU.uRefl.value=0;
    for(const o of hide) o.visible=true;
    return true;
  }
}

/* geometry helpers */
function boxGeo(x0,x1,y0,y1,z0,z1){ const g=new T.BoxGeometry(x1-x0,y1-y0,z1-z0); g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); return g; }
function mergeGeos(list){
  /* a minimal merge: non-indexed position + normal only */
  let n=0; const gs=list.map(g=>g.index?g.toNonIndexed():g); gs.forEach(g=>n+=g.attributes.position.count);
  const P=new Float32Array(n*3), Nn=new Float32Array(n*3); let o=0;
  for(const g of gs){ P.set(g.attributes.position.array,o*3); Nn.set(g.attributes.normal.array,o*3); o+=g.attributes.position.count; }
  const m=new T.BufferGeometry(); m.setAttribute('position',new T.BufferAttribute(P,3)); m.setAttribute('normal',new T.BufferAttribute(Nn,3)); m.computeBoundingSphere(); m.computeBoundingBox(); return m;
}
const f3=a=>a.map(x=>(+x).toFixed(3)).join(',');

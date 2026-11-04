/* ================= ONE EVENING: THE SUN, THE SKY, THE LIGHT =================
   Scroll is the time of day. Golden hour at Home, warmer through the gallery, sunset at Team, the sun
   touching the water at Contact with blue hour coming in overhead. The sundial reads the same sun. */
const SUN={el:14, az:40, dir:v3(0,1,0)};
/* walk position s to sun elevation and azimuth (degrees; azimuth measured from west toward south) */
const SUN_KEYS=[[0,13.5,40],[.5,13,44],[1,12,40],[2,10,18],[3,8.4,15],[4,6.8,10],[5,4.2,1],[5.5,1.8,-1],[6,.15,-4]];
function sunAt(s){
  const K=SUN_KEYS; if(s<=K[0][0]) return [K[0][1],K[0][2]];
  for(let i=0;i<K.length-1;i++){ const a=K[i],b=K[i+1]; if(s<=b[0]){ const t=(s-a[0])/(b[0]-a[0]), u=t*t*(3-2*t)*.35+t*.65; return [lerp(a[1],b[1],u),lerp(a[2],b[2],u)]; } }
  const l=K[K.length-1]; return [l[1]+(s-l[0])*-6,l[2]];
}
const sunDir=(el,az,out)=>out.set(-Math.cos(el*DEG)*Math.cos(az*DEG),Math.sin(el*DEG),Math.cos(el*DEG)*Math.sin(az*DEG)).normalize();

/* the palette of the evening, keyed by sun elevation */
const TOD_KEYS=[
  {e:16,  mid:'#B7C9E6', zen:'#7096CE', hor:'#F4DCCB', horS:'#FBCB9A', glow:'#FFC48A', sun:'#FFEDD2', belt:'#F3C8BE', beltK:.5, cl:'#FFEEDD', cs:'#C9BCC4',
          L:'#FFD09C', Li:5, sky:'#9DB2DE', gnd:'#CBAE96', hi:.44, haze:'#F2D6C0', hazeS:'#FFCB94'},
  {e:9,   mid:'#B4C2E2', zen:'#6B8CC7', hor:'#F5D3BE', horS:'#FDBE86', glow:'#FFB878', sun:'#FFE6C2', belt:'#F0C0BA', beltK:.6, cl:'#FFE2CA', cs:'#C4B4BC',
          L:'#FFC48C', Li:4.4, sky:'#9CADDB', gnd:'#C8A48E', hi:.46, haze:'#F1CEB6', hazeS:'#FFC084'},
  {e:4,   mid:'#AFBAE2', zen:'#5E7DBF', hor:'#F3C6A0', horS:'#FFA866', glow:'#FF9E58', sun:'#FFDAA4', belt:'#EBB4B8', beltK:.62, cl:'#FFC49C', cs:'#B3A2B4',
          L:'#FFB06E', Li:2.7, sky:'#9DAADA', gnd:'#BC9A8C', hi:.6, haze:'#EBC6AC', hazeS:'#FFA870'},
  {e:1,   mid:'#B1B6D8', zen:'#5E76B0', hor:'#F0B293', horS:'#FF8E55', glow:'#FF8648', sun:'#FFBE7E', belt:'#E6A6B0', beltK:.78, cl:'#FFA888', cs:'#A390A8',
          L:'#FF9A5C', Li:1.6, sky:'#9DA9D6', gnd:'#C4846E', hi:.78, haze:'#E0B2A2', hazeS:'#FF9864'},
  {e:-1.5,mid:'#9DA0C8', zen:'#4C62A0', hor:'#E0A294', horS:'#FA8858', glow:'#F57E4C', sun:'#FFA868', belt:'#D79CB0', beltK:.8, cl:'#F3988C', cs:'#8C80A2',
          L:'#FF9460', Li:.35, sky:'#93A0D0', gnd:'#9A7880', hi:.95, haze:'#C8A5AA', hazeS:'#F2986E'},
  {e:-4,  mid:'#8088BA', zen:'#384C8C', hor:'#B89AB0', horS:'#E88C6C', glow:'#DE785C', sun:'#E08A62', belt:'#B892AE', beltK:.55, cl:'#D28A92', cs:'#6E6A92',
          L:'#E08A62', Li:0, sky:'#8292C6', gnd:'#6C6884', hi:1.05, haze:'#9EA2C4', hazeS:'#DC9884'},
];
const TODC={}; ['mid','zen','hor','horS','glow','sun','belt','cl','cs','L','sky','gnd','haze','hazeS'].forEach(k=>TODC[k]=new T.Color());
const TOD={beltK:0,Li:0,hi:1};
const _ca=new T.Color(), _cb=new T.Color();
function todAt(el){
  const K=TOD_KEYS; let a=K[0],b=K[0],t=0;
  if(el>=K[0].e){ a=b=K[0]; } else if(el<=K[K.length-1].e){ a=b=K[K.length-1]; }
  else for(let i=0;i<K.length-1;i++){ if(el<=K[i].e&&el>=K[i+1].e){ a=K[i]; b=K[i+1]; t=(K[i].e-el)/(K[i].e-K[i+1].e); break; } }
  for(const k in TODC){ _ca.set(a[k]); _cb.set(b[k]); TODC[k].copy(_ca).lerp(_cb,t); }
  TOD.beltK=lerp(a.beltK,b.beltK,t); TOD.Li=lerp(a.Li,b.Li,t); TOD.hi=lerp(a.hi,b.hi,t);
  return TOD;
}

/* the sky dome: gradient, warm horizon toward the sun, the pink belt opposite it, glow, disc and thin cloud */
function skyMat(){
  const u={uSunDir:{value:v3(0,1,0)}, uMid:{value:new T.Color()}, uZen:{value:new T.Color()}, uHor:{value:new T.Color()}, uHorS:{value:new T.Color()}, uGlow:{value:new T.Color()},
    uSun:{value:new T.Color()}, uBelt:{value:new T.Color()}, uBeltK:{value:0}, uCl:{value:new T.Color()}, uCs:{value:new T.Color()}, uCloudK:{value:1}, uSunK:{value:1},
    uTime:GU.uTime, uRefl:GU.uRefl};
  return new T.ShaderMaterial({uniforms:u, side:T.BackSide, depthWrite:false, depthTest:true, fog:false,
    vertexShader:`varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=vec4(p.xy,p.w*.99999,p.w); }`,
    fragmentShader:`uniform vec3 uSunDir,uMid,uZen,uHor,uHorS,uGlow,uSun,uBelt,uCl,uCs; uniform float uBeltK,uCloudK,uSunK,uTime,uRefl; varying vec3 vD;
    ${GLSL.noise}
    vec3 skyCol(vec3 d){
      float y=d.y, hy=max(y,0.);
      vec3 c=mix(uHor,uMid,smoothstep(0.,.13,hy)); c=mix(c,uZen,smoothstep(.02,.34,hy));
      vec2 dh=normalize(d.xz+1e-5), sh=normalize(uSunDir.xz+1e-5); float az=dot(dh,sh)*.5+.5;
      c=mix(c,uHorS,pow(az,2.6)*exp(-hy*5.5));
      float anti=pow(1.-az,1.6);
      c=mix(c,uBelt,anti*uBeltK*exp(-(((hy-.085)/.075)*((hy-.085)/.075))));
      c=mix(c,uZen*vec3(.86,.9,1.05),anti*uBeltK*.5*exp(-((hy/.035)*(hy/.035)))*smoothstep(.07,-.02,uSunDir.y));
      float mu=dot(d,uSunDir);
      c+=uGlow*(((max(mu,0.))*(max(mu,0.))*(max(mu,0.))*(max(mu,0.))*(max(mu,0.)))*.28+pow(max(mu,0.),48.)*.75+pow(max(mu,0.),700.)*2.2)*uSunK;
      /* thin evening cloud, streaked along the horizon */
      vec2 cp=d.xz/(hy+.09);
      float n=fbm2(cp*vec2(.32,1.25)+vec2(uTime*.0025,0.)+vec2(7.,3.));
      float cl=smoothstep(.56,.86,n)*smoothstep(.0,.07,hy)*(1.-smoothstep(.22,.55,hy));
      vec3 cc=mix(uCs,uCl,pow(max(mu,0.)*.5+.5,2.2)+.25*smoothstep(.02,.15,hy));
      c=mix(c,cc,cl*uCloudK);
      float disc=smoothstep(.99982,.99991,mu)*uSunK;
      c+=uSun*disc*36.*(1.-cl*.7);
      if(y<0.) c=mix(c,uHor*.96,smoothstep(0.,-.06,y));
      return c;
    }
    void main(){ vec3 d=normalize(vD); gl_FragColor=vec4(skyCol(d),0.); }`});
}

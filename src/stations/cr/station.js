/* ================= CREW =================
   Three portraits drawn as a dot matrix that resolves into the photograph in focus. The page opens on Ahroon (01),
   resolved and named; then focus follows the pointer, a tap, Tab or the arrow keys. Clicking the focused portrait, a
   second tap on touch, or a name tag opens that person's LinkedIn in a new tab. */
(()=>{
const st=mkStation('cr',{arrive:new T.Vector3(0,1,6)});
const sc=st.scene, el=st.el, tagWrap=$('#tags'), tags=$$('#tags .tag'), people=[], meshes=[], hits=[], N=3, PH=1.3;
let lmx=-1, lmy=-1, focus=0, armed=false, moved=false, enterT=performance.now(), nar=false, cardB=240, glow=null, mx0=0, my0=0, hov=-1;
const L={D:10.2,wpp:.01}, FACE=new T.Vector2(.5,.8), hitUv=new T.Vector2(), _p=new T.Vector3(), ray=new T.Raycaster(), ndc=new T.Vector2();
const vert=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
/* a printed halftone that becomes the photograph. Fine round dots on a rotated grid, sized by brightness and
   antialiased. In focus the dots swell from where you pointed until they merge, carrying the photograph itself, so
   the hand-over is seamless. A thin warm rim light finds the silhouette; the base fades out instead of cutting off. */
const frag=`uniform sampler2D tP; uniform float uOn,uF,uSeed,uCells,uLo,uHi,uDim; uniform vec2 uM,uO; uniform vec3 uInk,uHot; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uSeed)*43758.5453); }
  float lum(vec3 c){ return dot(c,vec3(.3,.59,.11)); }
  void main(){
    const float ANG=.2618; mat2 R=mat2(cos(ANG),-sin(ANG),sin(ANG),cos(ANG)), Ri=mat2(cos(ANG),sin(ANG),-sin(ANG),cos(ANG));
    vec2 asp=vec2(1.,1.3), q=R*(vUv*asp)*uCells, id=floor(q), f=fract(q)-.5, cu=(Ri*((id+.5)/uCells))/asp;
    vec4 cs=texture2D(tP,clamp(cu,0.,1.)); float l=pow(clamp((lum(cs.rgb)-uLo)/max(.02,uHi-uLo),0.,1.),.8), n=h(id);
    float lit=step(n,uOn*1.15-.1);
    // reveal: spreads from the pointed spot, a little ragged so it reads as dots arriving, not a wipe
    float d=length((cu-uO)*asp), rv=clamp((uF*2.1-d*1.3-n*.22)*2.2,0.,1.);
    float near=smoothstep(.22,0.,length((cu-uM)*asp))*(1.-rv);
    float r=sqrt(l)*.5*(.35+.65*lit)+near*.08;      // area follows brightness, like ink on paper
    r=mix(r,.76,smoothstep(0.,1.,rv));               // in focus the dots swell until they overlap
    float dist=length(f), aa=max(fwidth(dist),.02);
    float dotm=(1.-smoothstep(r-aa,r+aa,dist))*step(.002,cs.a)*lit;
    vec4 ph=texture2D(tP,vUv); float pa=ph.a;
    vec3 photo=mix(vec3(lum(ph.rgb)),ph.rgb,.82); photo=pow(photo,vec3(1.05))*vec3(1.02,1.,.97);
    float pr=smoothstep(.55,1.,rv);
    vec3 ink=uInk*(.32+.6*l)*uDim;
    vec3 c=mix(ink,photo,smoothstep(.15,.9,rv));      // the dots carry the photograph as they grow
    float a=mix(dotm*cs.a,pa,pr);
    // a hairline of warm light from the upper right on the person in focus
    float a2=texture2D(tP,vUv+vec2(.0045,.003)).a; float rim=clamp(pa-a2,0.,1.)*pr;
    c+=uHot*rim*.85;
    // the base dissolves instead of ending in a hard cut
    float base=smoothstep(.0,.2,vUv.y); a*=base;
    gl_FragColor=vec4(c*a,a); }`;
/* per photo levels in linear light, so a dark jumper and a white one both draw a full dot pattern */
function levels(img){
  try{ const w=60, h=78, c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,w,h);
    const d=x.getImageData(0,0,w,h).data, v=[], lin=u=>Math.pow((u/255+.055)/1.055,2.4);
    for(let i=0;i<d.length;i+=4) if(d[i+3]>140) v.push(lin(d[i])*.3+lin(d[i+1])*.59+lin(d[i+2])*.11);
    if(v.length<50) return [0,1]; v.sort((a,b)=>a-b); return [v[Math.floor(v.length*.04)],Math.max(v[Math.floor(v.length*.97)],v[Math.floor(v.length*.04)]+.08)];
  }catch(e){ return [0,1]; }
}
st.build=async function(){
  const loader=new T.TextureLoader(), PG=new T.PlaneGeometry(1,PH);
  const texs=await Promise.all(PHOTOS.map(src=>new Promise(res=>loader.load(src,t=>{ t.colorSpace=T.SRGBColorSpace; t.minFilter=T.LinearFilter; t.generateMipmaps=false; res(t); },undefined,()=>res(null)))));
  texs.forEach((tx,k)=>{ const lv=tx?levels(tx.image):[0,1];
    const u={tP:{value:tx},uOn:{value:0},uF:{value:0},uSeed:{value:k*7.3},uCells:{value:44},uLo:{value:lv[0]},uHi:{value:lv[1]},uDim:{value:1},
      uM:{value:new T.Vector2(9,9)},uO:{value:FACE.clone()},uInk:{value:new T.Color('#EEE9DF')},uHot:{value:new T.Color('#FFB477')}};
    const m=new T.Mesh(PG,new T.ShaderMaterial({uniforms:u,vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:false,premultipliedAlpha:true,
      blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor}));
    m.visible=!!tx; sc.add(m); meshes.push(m); people.push({m,u,f:0,fz:0,on:0,x:0,y:0,z:0,s:1,tx:0,ty:0,ts:1,cells:44}); });
  // a faint warm light behind whoever is in focus, kept low so the photograph does the work
  glow=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({uniforms:{uOp:{value:0},uC:{value:new T.Color('#FFE2C4')}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:vert,fragmentShader:`uniform float uOp; uniform vec3 uC; varying vec2 vUv; void main(){ float r=length((vUv-.5)*vec2(1.,1.12))*2.; gl_FragColor=vec4(uC*pow(max(0.,1.-r),2.4)*uOp,1.); }`}));
  glow.position.z=-1.4; glow.renderOrder=-1; sc.add(glow);
  $('#crLede').textContent=FINE?'Point at someone to see them properly.':'Tap someone to see them. Tap again for LinkedIn.';
  measure(); layout(); people.forEach(p=>{ p.x=p.tx; p.y=p.ty; p.s=p.ts; });
};

/* ---------- layout from the viewport: a row on wide screens, a column with the focused person larger on phones ---------- */
function measure(){ const r=$('.card',el).getBoundingClientRect(); cardB=r.bottom>0?r.bottom:(NARROW()?230:250); const n=NARROW(); if(n!==nar){ nar=n; tagWrap.classList.toggle('nar',nar); } }
function layout(){
  const W=innerWidth, H=innerHeight, D=nar?16:10.2, wpp=2*D*Math.tan(18*Math.PI/180)/H; L.D=D; L.wpp=wpp;
  if(!nar){ const top=cardB+30, bot=H-(H<720?140:172), hgt=clamp(bot-top,200,480), w=hgt/PH, gap=Math.max(w*1.1,Math.min(W*.28,w*1.26));
    people.forEach((p,k)=>{ const cx=W/2+(k-1)*gap, cy=top+hgt/2; p.tx=(cx-W/2)*wpp; p.ty=-(cy-H/2)*wpp; p.ts=w*wpp; p.cells=clamp(Math.round(w/4.1),40,96); }); }
  else { const top=cardB+14, bot=H-24, av=bot-top, fh=av*.44, oh=(av-fh)/2; let y=top;
    people.forEach((p,k)=>{ const rh=k===focus?fh:oh, ph=rh-12, w=ph/PH, cx=22+w/2, cy=y+rh/2; y+=rh; p.tx=(cx-W/2)*wpp; p.ty=-(cy-H/2)*wpp; p.ts=w*wpp; p.cells=clamp(Math.round((oh-12)/PH/3.6),26,60); }); }
}
window.__crLayout=()=>{ measure(); layout(); };

/* ---------- focus ---------- */
function setFocus(k,uv){
  if(k<0||k>=people.length||k===focus) return;
  focus=k; people[k].u.uO.value.copy(uv||FACE); A.tick(); A.chime(5+k*2,0,.028);
  tags.forEach((t,i)=>{ t.classList.toggle('f',i===k); t.classList.toggle('dim',i!==k); });
}
function hitAt(cx,cy){ ndc.set(cx/innerWidth*2-1,-(cy/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); hits.length=0; ray.intersectObjects(meshes,false,hits);
  for(const h of hits){ if(!h.uv) continue; const k=meshes.indexOf(h.object); const tx=people[k].u.tP.value; if(tx&&alphaAt(k,h.uv)<.2) continue; hitUv.copy(h.uv); return k; } return -1; }
// only the person counts, not the empty corners of the frame
const ALPHA=[];
function alphaAt(k,uv){ const a=ALPHA[k]; if(!a){ try{ const img=people[k].u.tP.value.image, c=document.createElement('canvas'); c.width=36; c.height=47; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,36,47); ALPHA[k]=x.getImageData(0,0,36,47).data; }catch(e){ ALPHA[k]=new Uint8ClampedArray(36*47*4).fill(255); } return alphaAt(k,uv); }
  const i=Math.min(35,Math.max(0,(uv.x*36)|0)), j=Math.min(46,Math.max(0,((1-uv.y)*47)|0)); let m=0; for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ const ii=clamp(i+dx,0,35), jj=clamp(j+dy,0,46); m=Math.max(m,a[(jj*36+ii)*4+3]); } return m/255; }
// over a portrait the site cursor grows and says what a click does; only touch the cursor when this state changes
let curOn=false; const curEl=$('#cur'), curTx=$('#curT');
function cursorBig(on){ if(!curEl) return; if(on){ if(!curEl.classList.contains('big')){ curTx.textContent='Profile'; curEl.classList.add('big'); } } else if(curOn) curEl.classList.remove('big'); curOn=on; }
function open(k){ const t=tags[k]; if(!t) return; A.ping(1318,.04); try{ window.open(t.href,'_blank','noopener'); }catch(e){} }
st.onPointer=function(e){ const k=hitAt(e.clientX,e.clientY); armed=k>=0&&k===focus; if(k>=0&&k!==focus){ moved=true; setFocus(k,hitUv); } };
canvas.addEventListener('click',e=>{ if(S.mode!=='station'||S.st!==st) return; const k=hitAt(e.clientX,e.clientY); if(k>=0&&armed&&k===focus) open(k); armed=false; });
addEventListener('pointermove',e=>{ if(S.st!==st||e.pointerType!=='mouse'||moved) return; if(Math.hypot(e.clientX-mx0,e.clientY-my0)>8) moved=true; },{passive:true});
tags.forEach((t,k)=>{ t.addEventListener('pointerenter',e=>{ // a tag that slides under a still pointer as the page opens does not count: Ahroon stays first
  if(e.pointerType==='mouse'&&(moved||Math.hypot(e.clientX-mx0,e.clientY-my0)>8)){ moved=true; setFocus(k); } }); t.addEventListener('focus',()=>setFocus(k));
  t.addEventListener('click',()=>{ moved=true; setFocus(k); A.ping(1318,.04); }); });
addEventListener('keydown',e=>{ if(S.mode!=='station'||S.st!==st||e.target.closest&&e.target.closest('input,textarea')) return;
  const d=e.code==='ArrowRight'||e.code==='ArrowDown'?1:e.code==='ArrowLeft'||e.code==='ArrowUp'?-1:0; if(!d) return; e.preventDefault(); moved=true;
  const k=(focus+d+N)%N; setFocus(k); tags[k].focus({preventScroll:true}); });
st.start=()=>{ if(tags[focus]) tags[focus].focus({preventScroll:true}); };

st.enter=function(){
  focus=0; armed=false; moved=false; mx0=mouse.x; my0=mouse.y; enterT=performance.now(); hov=-1;
  tags.forEach((t,i)=>{ t.classList.toggle('f',i===0); t.classList.toggle('dim',i!==0); });
  people.forEach(p=>{ p.f=0; p.fz=0; p.on=0; p.u.uOn.value=0; p.u.uF.value=0; p.u.uO.value.copy(FACE); });
  measure(); layout(); people.forEach(p=>{ p.x=p.tx; p.y=p.ty; p.s=p.ts; });
  st.setState('menu'); tagWrap.classList.remove('in'); void tagWrap.offsetWidth; tagWrap.classList.add('in');
  $$('#tags .pw').forEach(p=>{ p.classList.remove('off'); p.classList.add('on'); });
};
st.exit=function(){ cursorBig(false); tagWrap.classList.remove('in'); $$('#tags .pw').forEach(p=>{ p.classList.remove('on'); p.classList.add('off'); }); };
addEventListener('resize',()=>{ if(S.st===st){ measure(); layout(); } });

/* ---------- per frame ---------- */
st.update=function(dt,t){
  if(!people.length) return;
  const age=(performance.now()-enterT)/1000, fine=FINE&&mouse.on&&moved;
  if(fine){ if(mouse.x!==lmx||mouse.y!==lmy){ lmx=mouse.x; lmy=mouse.y; const k=hitAt(mouse.x,mouse.y); hov=k; if(k>=0){ setFocus(k,hitUv); people[k].u.uM.value.copy(hitUv); } } } else hov=-1;
  cursorBig(hov>=0&&FINE);
  if(nar) layout();
  for(let k=0;k<people.length;k++){ const p=people[k], isF=k===focus, u=p.u;
    p.x=damp(p.x,p.tx,7,dt); p.y=damp(p.y,p.ty,7,dt); p.s=damp(p.s,p.ts,7,dt); p.fz=damp(p.fz,isF?1:0,5,dt);
    p.f=damp(p.f,isF?1:0,isF?2.6:4.2,dt); if(k===0&&focus===0&&!moved&&age<2.6) p.f=Math.max(p.f,E.io(clamp((age-.5)/.85,0,1)));
    p.on=E.o(clamp((age-.08-k*.14)/1.1,0,1));
    const m=p.m, s=p.s*(1+.05*p.fz); m.position.set(p.x,p.y,(nar?.3:.45)*p.fz-(isF?0:.15)); m.scale.set(s,s,1);
    m.rotation.y=(fine?mouse.nx:Math.sin(t*.25+k*2.1)*.35)*.09; m.rotation.x=(fine?-mouse.ny:Math.sin(t*.2+k)*.2)*.05;
    u.uOn.value=p.on; u.uF.value=p.f; u.uDim.value=damp(u.uDim.value,isF?1:.62,4,dt); u.uCells.value=p.cells; if(hov!==k) u.uM.value.set(9,9); }
  const fp=people[focus]; glow.position.x=damp(glow.position.x,fp.x,5,dt); glow.position.y=damp(glow.position.y,fp.y,5,dt);
  const gs=fp.s*2.2; glow.scale.set(gs,gs*1.3,1); glow.material.uniforms.uOp.value=.05*Math.min(1,age/1.2);
  // parallax: the camera leans with the pointer; on touch it breathes
  const px=fine?mouse.nx*.34:Math.sin(t*.13)*.07, py=fine?mouse.ny*.18:Math.cos(t*.11)*.05;
  st.camP.set(px,py,L.D); st.camL.set(px*.25,py*.25,0);
  // name tags follow their portraits
  for(let k=0;k<people.length;k++){ const m=people[k].m, hs=m.scale.x;
    if(!nar) _p.set(m.position.x,m.position.y-hs*PH/2-.1,m.position.z); else _p.set(m.position.x+hs*.5+.12,m.position.y,m.position.z);
    _p.project(stCam); const x=(_p.x*.5+.5)*innerWidth, y=(-_p.y*.5+.5)*innerHeight;
    tags[k].style.transform=nar?`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(0,-50%)`:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,0)`; }
};
st._dbg={get focus(){return focus;},get moved(){return moved;},people:()=>people.map(p=>({f:+p.f.toFixed(3),on:+p.on.toFixed(3),x:+p.m.position.x.toFixed(2),y:+p.m.position.y.toFixed(2),s:+p.m.scale.x.toFixed(2),cells:p.cells})),
  screen:k=>{ const m=people[k].m; _p.set(m.position.x,m.position.y+m.scale.y*.15,m.position.z).project(stCam); return {x:(_p.x*.5+.5)*innerWidth,y:(-_p.y*.5+.5)*innerHeight}; }};
})();

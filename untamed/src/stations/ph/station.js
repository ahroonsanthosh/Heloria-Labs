/* ================= PHAROS: LOST SIGNAL =================
   GPS is jammed. The drone's downward camera runs through Pharos's pipeline (raw, rectify, describe) and you make the
   match: put the camera's view on the map. Then Pharos shows its own answer: a normalised cross-correlation of the
   camera's edge image against the map's edge image, computed here over the search area and drawn as a surface of light.
   The camera frame is painted from the same world as the map but in another season, light and noise, so only the edges
   agree, which is the point of the describe step.
   One mapping everywhere. Map space: px, py in [0, MAP), py grows to the south. World: x=(px/MAP-.5)*PW,
   z=(py/MAP-.5)*PW, y=relief. The map shader derives map space from world position, clicks are ray cast onto the
   relief and converted back, so the circle, footprints, heat map, markers and clicks cannot disagree. */
(()=>{
const st=mkStation('ph',{arrive:new T.Vector3(0,3,5)});
const sc=st.scene, el=st.el, q=s=>$(s,el);
const MAP=1024, MPX=2, PW=12, FEED=160, DS=4, LO=MAP/DS, PS=FEED/DS, GN=96, GSTEP=4, MS=2, MG=GN/MS, HG=65, RELIEF=.3;
const CR=448, CS=2, CSZ=CR*CS, EN=FEED*CS, SEG=Q<1?96:128, RMAX=186, ROUNDS=5, MARG=150, CM=RMAX*.92;
const m2w=v=>(v/MAP-.5)*PW, TOUCH=!FINE;
const ACC=new T.Color('#FFD5B3');

/* ---------- buffers: two map sets so a new map can be built in the background and scanned in ---------- */
function mkSet(k){
  const c=new Uint8ClampedArray(MAP*MAP*4), t=new T.DataTexture(new Uint8Array(c.buffer),MAP,MAP,T.RGBAFormat,T.UnsignedByteType);
  t.minFilter=T.LinearMipmapLinearFilter; t.magFilter=T.LinearFilter; t.generateMipmaps=true; t.colorSpace=T.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); t.flipY=false;
  return {k,w:null,tex:c,t,hgt:new Float32Array(HG*HG),elo:new Float32Array(LO*LO),s1:new Float64Array((LO+1)*(LO+1)),s2:new Float64Array((LO+1)*(LO+1))};
}
const SETS=[mkSet(0),mkSet(1)]; let cur=0;
const LUM=new Float32Array(MAP*MAP), LOW=new Float32Array(LO*LO), TMP=new Float32Array(LO*LO), SH=new Float32Array(HG*HG);
const cv2=(n,rf)=>{ const c=document.createElement('canvas'); c.width=c.height=n; return [c,c.getContext('2d',rf?{willReadFrequently:true}:undefined)]; };
const [mapCv,mapX]=cv2(MAP,true);
// paint and read back on a CPU canvas; the feed draws every frame from a GPU copy made once per fix
const CAM=[0,1].map(()=>{ const [c,x]=cv2(CSZ,true), [g,gx]=cv2(CSZ), [e,ex]=cv2(EN); return {c,x,g,gx,e,ex,img:ex.createImageData(EN,EN)}; });
const [rotCv,rotX]=cv2(CSZ);
const CLUM=new Float32Array(EN*EN), PT=new Float32Array(PS*PS), PT2=new Float32Array(PS*PS);
const HEAT=[new Float32Array(GN*GN),new Float32Array(GN*GN)];

/* ---------- an Irish landscape, generated: Atlantic to the west, drumlins, small hedged fields ---------- */
function genWorld(seed){
  const R=seeded(seed), rn=(a,b)=>a+(b-a)*R(), gs=()=>{let u=0,v=0;while(!u)u=R();while(!v)v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);};
  const w={seed,fields:[],hedges:[],trees:[],woods:[],bogs:[],roads:[],houses:[],yards:[],farms:[],coast:[]};
  const c0=rn(66,118), ca=R()*TAU, cb=R()*TAU, cc=R()*TAU;
  for(let y=-32;y<=MAP+32;y+=8) w.coast.push([c0+Math.sin(y*.0047+ca)*40+Math.sin(y*.016+cb)*15+Math.sin(y*.05+cc)*5,y]);
  w.shore=y=>{ const k=clamp((y+32)/8,0,w.coast.length-1.001), i=k|0; return lerp(w.coast[i][0],w.coast[i+1][0],k-i); };
  let hi=-1; w.coast.forEach((p,i)=>{ if(p[1]>150&&p[1]<MAP-150&&(hi<0||p[0]<w.coast[hi][0])) hi=i; });
  w.lh=[w.coast[hi][0]+10,w.coast[hi][1]];
  // fields: a jittered grid, some cells split, hedges on almost every boundary
  const NG=11, cell=MAP/NG, V=[], mix2=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
  for(let j=0;j<=NG;j++){ V[j]=[]; for(let i=0;i<=NG;i++){ const e=i===0||i===NG||j===0||j===NG; V[j][i]=[i*cell+(e?0:gs()*cell*.15),j*cell+(e?0:gs()*cell*.15)]; } }
  const field=p=>{ const r=R(); w.fields.push({p,kind:r<.6?0:r<.8?1:r<.93?2:3,t:R(),alt:R(),ang:R()*Math.PI}); };
  for(let j=0;j<NG;j++) for(let i=0;i<NG;i++){
    const qd=[V[j][i],V[j][i+1],V[j+1][i+1],V[j+1][i]], r=R();
    if(r<.16){ field([qd[0],qd[1],qd[2]]); field([qd[0],qd[2],qd[3]]); w.hedges.push([qd[0],qd[2]]); }
    else if(r<.5){ const t1=rn(.3,.7), t2=rn(.3,.7);
      if(R()<.5){ const a=mix2(qd[0],qd[1],t1), b=mix2(qd[3],qd[2],t2); field([qd[0],a,b,qd[3]]); field([a,qd[1],qd[2],b]); w.hedges.push([a,b]); }
      else { const a=mix2(qd[0],qd[3],t1), b=mix2(qd[1],qd[2],t2); field([qd[0],qd[1],b,a]); field([a,b,qd[2],qd[3]]); w.hedges.push([a,b]); } }
    else field(qd);
  }
  for(let j=0;j<=NG;j++) for(let i=0;i<NG;i++) if(R()<.92) w.hedges.push([V[j][i],V[j][i+1]]);
  for(let j=0;j<NG;j++) for(let i=0;i<=NG;i++) if(R()<.92) w.hedges.push([V[j][i],V[j+1][i]]);
  w.hedges.forEach(([a,b])=>{ const L=Math.hypot(b[0]-a[0],b[1]-a[1]); for(let s=rn(4,12);s<L-4;s+=rn(10,26)) if(R()<.5){ const t=s/L; w.trees.push([lerp(a[0],b[0],t)+gs()*1.4,lerp(a[1],b[1],t)+gs()*1.4,rn(2.6,5)]); } });
  // woods and a cutaway bog
  for(let k=0;k<4;k++){ const cx=rn(220,MAP-60), cy=rn(60,MAP-60), r0=rn(28,58), pts=[], ph=R()*TAU, cr=[];
    for(let a=0;a<26;a++){ const t=a/26*TAU, rr=r0*(1+.26*Math.sin(t*3+ph)+.1*gs()); pts.push([cx+Math.cos(t)*rr*1.25,cy+Math.sin(t)*rr*.85]); }
    for(let c=0;c<Math.round(r0*r0*.1);c++){ const t=R()*TAU, rr=Math.sqrt(R())*r0; cr.push([cx+Math.cos(t)*rr*1.22,cy+Math.sin(t)*rr*.82,rn(2.6,5.6)]); }
    w.woods.push({pts,cr}); }
  { const cx=rn(300,MAP-160), cy=rn(160,MAP-160), r0=rn(46,74), pts=[], ph=R()*TAU;
    for(let a=0;a<22;a++){ const t=a/22*TAU, rr=r0*(1+.22*Math.sin(t*2+ph)+.08*gs()); pts.push([cx+Math.cos(t)*rr,cy+Math.sin(t)*rr*.78]); }
    w.bogs.push({pts,ang:R()*Math.PI,cx,cy,r:r0}); }
  // a river from the east that finds the sea
  { let x=MAP+26, y=rn(MAP*.28,MAP*.72), a=Math.PI+gs()*.2; const p=[];
    for(let g=0;g<420;g++){ p.push([x,y]); a+=gs()*.2+(Math.PI-a)*.07+Math.sin(g*.31)*.06; x+=Math.cos(a)*11; y=clamp(y+Math.sin(a)*11,50,MAP-50); if(x<w.shore(y)-30){ p.push([x,y]); break; } }
    w.river=p; }
  // a lough, away from the river
  { let best=null; for(let k=0;k<24;k++){ const cx=rn(MAP*.45,MAP-110), cy=rn(110,MAP-110); let d=1e9; for(const p of w.river) d=Math.min(d,Math.hypot(p[0]-cx,p[1]-cy)); if(!best||d>best.d) best={cx,cy,d}; }
    const r0=rn(40,62), pts=[], ph=R()*TAU; for(let a=0;a<30;a++){ const t=a/30*TAU, rr=r0*(1+.24*Math.sin(t*2+ph)+.12*Math.sin(t*5+ph*2)+.04*gs()); pts.push([best.cx+Math.cos(t)*rr*1.2,best.cy+Math.sin(t)*rr*.85]); }
    w.lough={pts,cx:best.cx,cy:best.cy,r:r0}; }
  // roads: a national road north to south, a road west to the shore, one east, and boreens to farms
  const roadPts=(a,b,amp,n)=>{ const p=[], p1=R()*TAU, p2=R()*TAU, dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L;
    for(let k=0;k<=n;k++){ const t=k/n, s=Math.sin(t*Math.PI)*(Math.sin(t*5.1+p1)*.7+Math.sin(t*11.3+p2)*.3)*amp; p.push([a[0]+dx*t+nx*s,a[1]+dy*t+ny*s]); } return p; };
  const at=(p,t)=>p[Math.round(t*(p.length-1))];
  const main=roadPts([rn(MAP*.38,MAP*.68),-24],[rn(MAP*.32,MAP*.72),MAP+24],58,30); w.roads.push({p:main,k:0});
  const j1=at(main,rn(.28,.44)), j2=at(main,rn(.58,.78));
  const west=roadPts(j1,[w.shore(j1[1])+14,j1[1]+rn(-90,90)],30,20); w.roads.push({p:west,k:1});
  const east=roadPts(j2,[MAP+24,j2[1]+rn(-150,150)],38,20); w.roads.push({p:east,k:1});
  for(let k=0;k<4;k++){ const base=[main,west,east,main][k], s=at(base,rn(.18,.82)), an=R()*TAU, L=rn(60,130), e=[clamp(s[0]+Math.cos(an)*L,40,MAP-40),clamp(s[1]+Math.sin(an)*L,40,MAP-40)];
    w.roads.push({p:roadPts(s,e,10,10),k:2}); w.farms.push(e); }
  // a village strung along the road around the junction, a GAA pitch beside it, farms at the end of the boreens
  const ribbon=(p,c,rad,dens)=>{ for(let k=1;k<p.length;k++){ const a=p[k-1], b=p[k], L=Math.hypot(b[0]-a[0],b[1]-a[1]), an=Math.atan2(b[1]-a[1],b[0]-a[0]);
    for(let s=0;s<L;s+=rn(10,16)) for(const sd of [-1,1]){ const t=s/L, x=lerp(a[0],b[0],t), y=lerp(a[1],b[1],t); if(Math.hypot(x-c[0],y-c[1])>rad||R()>dens) continue; const off=sd*rn(10,14);
      w.houses.push({x:x-Math.sin(an)*off,y:y+Math.cos(an)*off,a:an,w:rn(7,11),h:rn(5,7.5),roof:(R()*4)|0}); } } };
  ribbon(main,j1,120,.8); ribbon(west,j1,90,.7); ribbon(east,[MAP*2,0],0,0);
  for(const r of [west,east]) for(let k=2;k<r.length-1;k+=3) if(R()<.4){ const a=r[k], b=r[k+1], an=Math.atan2(b[1]-a[1],b[0]-a[0]), sd=R()<.5?-1:1;
    w.houses.push({x:a[0]-Math.sin(an)*13*sd,y:a[1]+Math.cos(an)*13*sd,a:an,w:rn(8,11),h:rn(5,7),roof:(R()*4)|0}); }
  { const k=Math.round(main.length*.38), a=main[Math.max(0,k-1)], b=main[k], an=Math.atan2(b[1]-a[1],b[0]-a[0]), sd=R()<.5?-1:1;
    w.pitch={x:j1[0]-Math.sin(an)*56*sd,y:j1[1]+Math.cos(an)*56*sd+rn(-30,30),a:an,w:72,h:45}; }
  w.farms.forEach(f=>{ const a=R()*Math.PI; w.yards.push({x:f[0],y:f[1],a,w:rn(26,34),h:rn(18,24)}); const n=2+((R()*3)|0);
    for(let k=0;k<n;k++) w.houses.push({x:f[0]+gs()*8,y:f[1]+gs()*6,a:a+(R()<.5?0:Math.PI/2),w:rn(9,16),h:rn(5,8),roof:(R()*4)|0}); });
  // nothing built in the sea, the lough or on the pitch
  const pc=w.pitch; w.houses=w.houses.filter(h=>h.x>w.shore(h.y)+8&&Math.hypot(h.x-w.lough.cx,h.y-w.lough.cy)>w.lough.r*1.35&&Math.hypot(h.x-pc.x,h.y-pc.y)>48);
  const bb=p=>{ let a=1e9,b=1e9,c=-1e9,d=-1e9; for(const q of p){ a=Math.min(a,q[0]); b=Math.min(b,q[1]); c=Math.max(c,q[0]); d=Math.max(d,q[1]); } return [a,b,c,d]; };
  w.fields.forEach(f=>f.bb=bb(f.p)); w.woods.forEach(f=>f.bb=bb(f.pts)); w.bogs.forEach(f=>f.bb=bb(f.pts));
  return w;
}

/* two palettes over the same world: the map (a summer orthophoto) and the camera (late autumn, low sun, cloud) */
const PAL={
  map:{base:'#56623f',past:['#5d6c40','#647341','#6c7845','#566640','#5f6f3e','#6a7746','#526238'],hay:['#80804c','#8a8653','#77804a'],till:['#6a5a41','#5f533c','#735f45'],rough:['#5a5d42','#615f45'],stub:['#80804c'],
    hedge:'#24301c',tree:'#1d2817',wood:'#223019',crown:'#1a2414',crownHi:'#2c3b21',bog:'#57493a',cut:'#3a2f25',bank:'#2b3227',water:'#2b3c46',reed:'#4a5238',
    sea:'#1b2a33',sand:'#9a9273',surf:'rgba(226,232,228,.3)',edge:'#2a2a25',road:['#8e8b82','#85827a','#7b705a'],roadW:[[11,8],[8,5.4],[0,3.6]],
    roofs:['#5b5f66','#c8c3b7','#7b4535','#8b8e90'],shadow:'rgba(8,10,6,.5)',sx:-2.2,sy:-1.8,yard:'#76736a',pitch:'#5f8c45',line:'rgba(240,240,230,.75)'},
  cam:{base:'#646640',past:['#6f7a43','#7a8247','#66713f','#5e6a3c'],hay:['#a8955c','#9e8b55','#b39f66'],till:['#5e4a33','#6b553a','#54432f'],rough:['#6e6446','#786c4b'],stub:['#b6a46b','#a9965f'],
    hedge:'#2b2b19',tree:'#232514',wood:'#2b3019',crown:'#25291a',crownHi:'#3f4227',bog:'#664f38',cut:'#3d2e22',bank:'#33352a',water:'#4a5761',reed:'#6a6440',
    sea:'#2a3a45',sand:'#b0a37e',surf:'rgba(240,244,240,.45)',edge:'#30302a',road:['#a39f93','#9a968b','#8c7d61'],roadW:[[11,8],[8,5.4],[0,3.6]],
    roofs:['#4f5359','#d8d2c4','#8a4a35','#9a9c9b'],shadow:'rgba(6,6,2,.62)',sx:4.2,sy:3,yard:'#86837a',pitch:'#6d8f4a',line:'rgba(245,245,236,.8)'}
};
function polyPath(x,p){ x.moveTo(p[0][0],p[0][1]); for(let k=1;k<p.length;k++) x.lineTo(p[k][0],p[k][1]); x.closePath(); }
function smoothPath(x,p){ x.moveTo(p[0][0],p[0][1]); for(let k=1;k<p.length-1;k++) x.quadraticCurveTo(p[k][0],p[k][1],(p[k][0]+p[k+1][0])/2,(p[k][1]+p[k+1][1])/2); x.lineTo(p[p.length-1][0],p[p.length-1][1]); }
function smoothLoop(x,p){ const n=p.length; x.moveTo((p[n-1][0]+p[0][0])/2,(p[n-1][1]+p[0][1])/2); for(let k=0;k<n;k++){ const a=p[k], b=p[(k+1)%n]; x.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2); } x.closePath(); }
function stripes(x,cx,cy,ang,sp,ext){ const ca=Math.cos(ang), sa=Math.sin(ang); x.beginPath(); for(let k=-ext/sp;k<=ext/sp;k++){ const ox=-sa*k*sp, oy=ca*k*sp; x.moveTo(cx+ox-ca*ext,cy+oy-sa*ext); x.lineTo(cx+ox+ca*ext,cy+oy+sa*ext); } x.stroke(); }
function paint(x,w,mode,clouds,rg,part){ // part 0: ground cover, part 1: everything on top, undefined: both
  const P=PAL[mode], cam=mode==='cam', R0=rg||[-1e9,-1e9,1e9,1e9];
  const vis=b=>b[2]>=R0[0]&&b[0]<=R0[2]&&b[3]>=R0[1]&&b[1]<=R0[3], near=(x_,y_,r)=>x_+r>=R0[0]&&x_-r<=R0[2]&&y_+r>=R0[1]&&y_-r<=R0[3];
  x.lineCap='round'; x.lineJoin='round';
  if(part!==1){ x.fillStyle=P.base; x.fillRect(-80,-80,MAP+160,MAP+160);
  for(const f of w.fields){ if(!vis(f.bb)) continue;
    let kind=f.kind; if(cam&&kind===0&&f.alt<.2) kind=4; if(cam&&kind===1&&f.alt>.45) kind=4; if(cam&&kind===2&&f.alt>.6) kind=0;
    const pal=[P.past,P.hay,P.till,P.rough,P.stub][kind]; x.fillStyle=pal[Math.floor((cam?f.alt:f.t)*pal.length)%pal.length];
    x.beginPath(); polyPath(x,f.p); x.fill();
    if(kind===1||kind===2||kind===4){ let cx=0,cy=0; for(const p of f.p){ cx+=p[0]; cy+=p[1]; } cx/=f.p.length; cy/=f.p.length;
      x.save(); x.clip(); x.lineWidth=kind===2?1.3:1; x.strokeStyle=kind===2?'rgba(22,16,10,.3)':'rgba(40,36,16,.17)'; stripes(x,cx,cy,f.ang,kind===2?3.4:kind===4?4.4:6,90);
      if(kind===4&&cam){ x.fillStyle='rgba(236,226,190,.85)'; x.beginPath(); for(let k=0;k<9;k++){ const bx=cx+Math.cos(f.ang)*(k-4)*9, by=cy+Math.sin(f.ang)*(k-4)*9; x.moveTo(bx+1.7,by); x.arc(bx,by,1.7,0,TAU); } x.fill(); }
      x.restore(); }
  }
  for(const b of w.bogs){ if(!vis(b.bb)) continue; x.fillStyle=P.bog; x.beginPath(); smoothLoop(x,b.pts); x.fill(); x.save(); x.clip(); x.strokeStyle=P.cut; x.lineWidth=2.4; stripes(x,b.cx,b.cy,b.ang,8,100); x.restore(); }
  for(const wd of w.woods){ if(!vis(wd.bb)) continue; x.fillStyle=P.wood; x.beginPath(); smoothLoop(x,wd.pts); x.fill(); x.save(); x.clip();
    x.fillStyle=P.crown; x.beginPath(); for(const c of wd.cr){ x.moveTo(c[0]+c[2],c[1]); x.arc(c[0],c[1],c[2],0,TAU); } x.fill();
    x.fillStyle=P.crownHi; x.beginPath(); for(const c of wd.cr){ x.moveTo(c[0]-1+c[2]*.45,c[1]-1); x.arc(c[0]-1,c[1]-1,c[2]*.45,0,TAU); } x.fill(); x.restore(); }
  }
  if(part===0) return;
  const hv=h=>near((h[0][0]+h[1][0])/2,(h[0][1]+h[1][1])/2,Math.abs(h[0][0]-h[1][0])/2+Math.abs(h[0][1]-h[1][1])/2+8);
  x.strokeStyle=P.shadow; x.lineWidth=5; x.beginPath(); for(const h of w.hedges){ if(!hv(h)) continue; x.moveTo(h[0][0]+P.sx,h[0][1]+P.sy); x.lineTo(h[1][0]+P.sx,h[1][1]+P.sy); } x.stroke();
  x.strokeStyle=P.hedge; x.lineWidth=3.6; x.beginPath(); for(const h of w.hedges){ if(!hv(h)) continue; x.moveTo(h[0][0],h[0][1]); x.lineTo(h[1][0],h[1][1]); } x.stroke();
  x.fillStyle=P.shadow; x.beginPath(); for(const t of w.trees){ if(!near(t[0],t[1],12)) continue; const sx=t[0]+P.sx*1.3, sy=t[1]+P.sy*1.3; x.moveTo(sx+t[2],sy); x.arc(sx,sy,t[2],0,TAU); } x.fill();
  x.fillStyle=P.tree; x.beginPath(); for(const t of w.trees){ if(!near(t[0],t[1],8)) continue; x.moveTo(t[0]+t[2],t[1]); x.arc(t[0],t[1],t[2],0,TAU); } x.fill();
  x.strokeStyle=P.bank; x.lineWidth=15; x.beginPath(); smoothPath(x,w.river); x.stroke();
  x.strokeStyle=P.water; x.lineWidth=9; x.beginPath(); smoothPath(x,w.river); x.stroke();
  x.beginPath(); smoothLoop(x,w.lough.pts); x.strokeStyle=P.reed; x.lineWidth=9; x.stroke(); x.fillStyle=P.water; x.fill();
  for(const k of [2,1,0]) for(const r of w.roads) if(r.k===k){ const ew=P.roadW[k][0], sw=P.roadW[k][1];
    if(ew){ x.strokeStyle=P.edge; x.lineWidth=ew; x.beginPath(); smoothPath(x,r.p); x.stroke(); }
    x.strokeStyle=P.road[k]; x.lineWidth=sw; x.beginPath(); smoothPath(x,r.p); x.stroke(); }
  const pc=w.pitch; x.save(); x.translate(pc.x,pc.y); x.rotate(pc.a); x.fillStyle=P.pitch; x.fillRect(-pc.w/2,-pc.h/2,pc.w,pc.h); x.strokeStyle=P.line; x.lineWidth=1;
  x.strokeRect(-pc.w/2+2.5,-pc.h/2+2.5,pc.w-5,pc.h-5); x.beginPath(); x.moveTo(0,-pc.h/2+2.5); x.lineTo(0,pc.h/2-2.5); x.moveTo(-pc.w/2+13,-pc.h/2+2.5); x.lineTo(-pc.w/2+13,pc.h/2-2.5); x.moveTo(pc.w/2-13,-pc.h/2+2.5); x.lineTo(pc.w/2-13,pc.h/2-2.5); x.stroke(); x.restore();
  for(const y of w.yards){ if(!near(y.x,y.y,30)) continue; x.save(); x.translate(y.x,y.y); x.rotate(y.a); x.fillStyle=P.yard; x.fillRect(-y.w/2,-y.h/2,y.w,y.h); x.restore(); }
  for(const h of w.houses){ if(!near(h.x,h.y,16)) continue; x.fillStyle=P.shadow; x.save(); x.translate(h.x+P.sx*.9,h.y+P.sy*.9); x.rotate(h.a); x.fillRect(-h.w/2,-h.h/2,h.w,h.h); x.restore();
    x.save(); x.translate(h.x,h.y); x.rotate(h.a); x.fillStyle=P.roofs[h.roof]; x.fillRect(-h.w/2,-h.h/2,h.w,h.h); x.fillStyle='rgba(0,0,0,.24)'; x.fillRect(-h.w/2,0,h.w,h.h/2); x.restore(); }
  x.fillStyle=P.sea; x.beginPath(); x.moveTo(-80,-80); for(const c of w.coast) x.lineTo(c[0],c[1]); x.lineTo(-80,MAP+80); x.closePath(); x.fill();
  x.strokeStyle=P.sand; x.lineWidth=5; x.beginPath(); w.coast.forEach((c,i)=>i?x.lineTo(c[0],c[1]):x.moveTo(c[0],c[1])); x.stroke();
  x.strokeStyle=P.surf; x.lineWidth=1.6; x.beginPath(); w.coast.forEach((c,i)=>i?x.lineTo(c[0]-7,c[1]):x.moveTo(c[0]-7,c[1])); x.stroke();
  x.fillStyle='#e9e5da'; x.beginPath(); x.arc(w.lh[0],w.lh[1],3.4,0,TAU); x.fill(); x.strokeStyle='#2a2a26'; x.lineWidth=1.2; x.stroke();
  if(clouds) for(const c of clouds){ const g=x.createRadialGradient(c[0],c[1],0,c[0],c[1],c[2]); g.addColorStop(0,'rgba(10,12,20,.34)'); g.addColorStop(.6,'rgba(10,12,20,.18)'); g.addColorStop(1,'rgba(10,12,20,0)'); x.fillStyle=g; x.fillRect(c[0]-c[2],c[1]-c[2],c[2]*2,c[2]*2); }
}

/* ---------- relief: drumlins aligned NE to SW, a river valley, land falling to the sea ---------- */
function vnoise(R){ const N=64, v=new Float32Array(N*N); for(let i=0;i<N*N;i++) v[i]=R();
  return (x,y)=>{ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), s=yf*yf*(3-2*yf);
    return lerp(lerp(v[(yi&63)*N+(xi&63)],v[(yi&63)*N+((xi+1)&63)],u),lerp(v[((yi+1)&63)*N+(xi&63)],v[((yi+1)&63)*N+((xi+1)&63)],u),s); }; }
function genHeights(S){
  const w=S.w, R=seeded(w.seed^0x5bd1e9), n1=vnoise(R), n2=vnoise(R), h=S.hgt, ca=Math.cos(.62), sa=Math.sin(.62);
  for(let j=0;j<HG;j++) for(let i=0;i<HG;i++){ const px=i/(HG-1)*MAP, py=j/(HG-1)*MAP, u=(px*ca+py*sa)/MAP, v=(-px*sa+py*ca)/MAP;
    let z=n1(u*4.2+11,v*1.9+5)*.62+n1(u*8.5+3,v*3.8+9)*.26+n2(u*16,v*16)*.12; z=sstep(.18,.92,z);
    let dr=1e9; for(let k=0;k<w.river.length;k+=2){ const p=w.river[k], d=(p[0]-px)**2+(p[1]-py)**2; if(d<dr) dr=d; }
    z*=1-.75*Math.exp(-dr/(80*80)); const sx=w.shore(py); z*=sstep(sx-4,sx+120,px);
    z*=sstep(w.lough.r*.6,w.lough.r*2.4,Math.hypot(px-w.lough.cx,py-w.lough.cy)); h[j*HG+i]=clamp(z,0,1); }
  const cw=MAP/(HG-1), ex=RELIEF/PW*MAP*5;
  for(let j=0;j<HG;j++) for(let i=0;i<HG;i++){ const i0=Math.max(0,i-1), i1=Math.min(HG-1,i+1), j0=Math.max(0,j-1), j1=Math.min(HG-1,j+1);
    const dx=(h[j*HG+i1]-h[j*HG+i0])*ex/((i1-i0)*cw), dy=(h[j1*HG+i]-h[j0*HG+i])*ex/((j1-j0)*cw), nl=1/Math.sqrt(dx*dx+dy*dy+1);
    SH[j*HG+i]=clamp(.38+.78*(dx*.55+.68+dy*.48)*nl,.5,1.3); }
}
function hAt(S,px,py){ const gx=clamp(px/MAP,0,1)*(HG-1), gy=clamp(py/MAP,0,1)*(HG-1), i=Math.min(HG-2,gx|0), j=Math.min(HG-2,gy|0), fx=gx-i, fy=gy-j, h=S.hgt;
  return lerp(lerp(h[j*HG+i],h[j*HG+i+1],fx),lerp(h[(j+1)*HG+i],h[(j+1)*HG+i+1],fx),fy)*RELIEF; }

/* ---------- describe: Sobel edges, soft threshold; the same function for the map and the camera ---------- */
const edgeK=m=>{ const e=(m-26)/150; return e<=0?0:e>=1?1:e; };
function blur3(src,dst){ // binomial 3x3 on the LO grid
  for(let y=0;y<LO;y++) for(let x=0;x<LO;x++){ const i=y*LO+x; TMP[i]=(src[x>0?i-1:i]+2*src[i]+src[x<LO-1?i+1:i])*.25; }
  for(let y=0;y<LO;y++) for(let x=0;x<LO;x++){ const i=y*LO+x; dst[i]=(TMP[y>0?i-LO:i]+2*TMP[i]+TMP[y<LO-1?i+LO:i])*.25; }
}
function integ(E,s1,s2){ const W=LO+1; s1.fill(0); s2.fill(0);
  for(let y=0;y<LO;y++){ let r1=0,r2=0; for(let x=0;x<LO;x++){ const v=E[y*LO+x]; r1+=v; r2+=v*v; s1[(y+1)*W+x+1]=s1[y*W+x+1]+r1; s2[(y+1)*W+x+1]=s2[y*W+x+1]+r2; } } }
function* buildSet(S,seed){
  S.w=genWorld(seed); yield;
  genHeights(S); yield;
  mapX.setTransform(1,0,0,1,0,0); paint(mapX,S.w,'map'); yield;
  const d=mapX.getImageData(0,0,MAP,MAP).data; yield;
  for(let i=0,n=MAP*MAP;i<n;i++){ const o=i*4; LUM[i]=d[o]*.299+d[o+1]*.587+d[o+2]*.114; } yield;
  LOW.fill(0); const tex=S.tex, L=LUM; let sd=seed|0;
  for(let y0=0;y0<MAP;y0+=64){
    for(let y=y0;y<y0+64;y++){ const gy=y/MAP*(HG-1), j=Math.min(HG-2,gy|0), fy=gy-j, lr=(y>>2)*LO;
      for(let x=0;x<MAP;x++){ const i=y*MAP+x; let e=0;
        if(x>0&&y>0&&x<MAP-1&&y<MAP-1){ const a=L[i-MAP-1],b=L[i-MAP],c=L[i-MAP+1],dl=L[i-1],f=L[i+1],g=L[i+MAP-1],h=L[i+MAP],k=L[i+MAP+1];
          const sx=(c+2*f+k)-(a+2*dl+g), sy=(g+2*h+k)-(a+2*b+c); e=edgeK(Math.sqrt(sx*sx+sy*sy)); }
        LOW[lr+(x>>2)]+=e;
        const gx=x/MAP*(HG-1), ii=Math.min(HG-2,gx|0), fx=gx-ii, s=lerp(lerp(SH[j*HG+ii],SH[j*HG+ii+1],fx),lerp(SH[(j+1)*HG+ii],SH[(j+1)*HG+ii+1],fx),fy);
        sd=(sd*1664525+1013904223)|0; const nz=((sd>>>24)-128)*.045, o=i*4;
        tex[o]=d[o]*s+nz; tex[o+1]=d[o+1]*s+nz; tex[o+2]=d[o+2]*s+nz; tex[o+3]=e*255; } }
    yield; }
  for(let i=0;i<LO*LO;i++) LOW[i]/=16;
  blur3(LOW,S.elo); integ(S.elo,S.s1,S.s2); yield;
  const a=plane.geometry.attributes['aH'+S.k], n=SEG+1; for(let j=0;j<n;j++) for(let i=0;i<n;i++) a.array[j*n+i]=hAt(S,i/SEG*MAP,j/SEG*MAP); a.needsUpdate=true;
  S.t.needsUpdate=true; S.ready=true;
}

/* ---------- the camera: a frame of the same ground in another season, then its edges ---------- */
function camPaint(F,part){ const C=CAM[F.slot], x=C.x; x.setTransform(CS,0,0,CS,-(F.x-CR/2)*CS,-(F.y-CR/2)*CS); paint(x,SETS[F.set].w,'cam',F.clouds,[F.x-CR/2-6,F.y-CR/2-6,F.x+CR/2+6,F.y+CR/2+6],part); x.setTransform(1,0,0,1,0,0); }
function camDescribe(F){
  const C=CAM[F.slot], o=(CR/2-FEED/2)*CS, n=EN, d=C.x.getImageData(o,o,n,n).data, E=C.img.data, L=CLUM; let sd=(F.x*7919+F.y*104729)|0;
  for(let i=0;i<n*n;i++){ sd=(sd*1664525+1013904223)|0; const k=i*4; L[i]=d[k]*.299+d[k+1]*.587+d[k+2]*.114+((sd>>>24)-128)*.035; }
  PT.fill(0);
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){ const i=y*n+x; let e=0;
    if(x>0&&y>0&&x<n-1&&y<n-1){ const a=L[i-n-1],b=L[i-n],c=L[i-n+1],dl=L[i-1],f=L[i+1],g=L[i+n-1],h=L[i+n],k=L[i+n+1];
      const sx=(c+2*f+k)-(a+2*dl+g), sy=(g+2*h+k)-(a+2*b+c); e=edgeK(Math.sqrt(sx*sx+sy*sy)); }
    PT[(y>>3)*PS+(x>>3)]+=e;
    const v=Math.pow(e,.75), o4=i*4; E[o4]=255*v; E[o4+1]=213*v*(.82+.18*v); E[o4+2]=179*v*(.66+.34*v); E[o4+3]=255; }
  C.ex.putImageData(C.img,0,0);
  for(let i=0;i<PS*PS;i++) PT[i]/=64;
  // the same blur as the map, then zero mean and unit norm
  for(let y=0;y<PS;y++) for(let x=0;x<PS;x++){ const i=y*PS+x; PT2[i]=(PT[x>0?i-1:i]+2*PT[i]+PT[x<PS-1?i+1:i])*.25; }
  let m=0; for(let y=0;y<PS;y++) for(let x=0;x<PS;x++){ const i=y*PS+x; PT[i]=(PT2[y>0?i-PS:i]+2*PT2[i]+PT2[y<PS-1?i+PS:i])*.25; m+=PT[i]; }
  m/=PS*PS; let nn=0; for(let i=0;i<PS*PS;i++){ PT[i]-=m; nn+=PT[i]*PT[i]; } F.pn=Math.sqrt(nn)||1;
}
/* normalised cross-correlation of the camera patch against every map window on the grid: integral images give each
   window's mean and variance in O(1), so the cost is one dot product per position */
function correlate(F,j0,j1){
  const S=SETS[F.set], E=S.elo, s1=S.s1, s2=S.s2, W=LO+1, n=PS*PS, P=PT, out=HEAT[F.slot];
  for(let j=j0;j<j1;j++) for(let i=0;i<GN;i++){
    const lx=((F.gx0+i*GSTEP)>>2)-PS/2, ly=((F.gy0+j*GSTEP)>>2)-PS/2, k=j*GN+i;
    if(lx<0||ly<0||lx+PS>LO||ly+PS>LO){ out[k]=0; continue; }
    const a=ly*W+lx, b=a+PS, c=(ly+PS)*W+lx, d=c+PS, m1=s1[d]-s1[b]-s1[c]+s1[a], vr=(s2[d]-s2[b]-s2[c]+s2[a])-m1*m1/n;
    if(vr<1e-7){ out[k]=0; continue; }
    let num=0; for(let y=0;y<PS;y++){ const r=(ly+y)*LO+lx, pr=y*PS; for(let x=0;x<PS;x++) num+=P[pr+x]*E[r+x]; }
    out[k]=num/(F.pn*Math.sqrt(vr));
  }
}
const SORT=new Float32Array(GN*GN);
function corrStats(F){ // peak, runner-up beyond 32 m, and a high percentile inside the circle as the display floor
  const H=HEAT[F.slot]; let pk=-9,pi=0,m=0; for(let k=0;k<GN*GN;k++) if(H[k]>pk){ pk=H[k]; pi=k; }
  let s2b=-9; for(let j=0;j<GN;j++) for(let i=0;i<GN;i++){ const mx=F.gx0+i*GSTEP-F.cx, my=F.gy0+j*GSTEP-F.cy; if(mx*mx+my*my>RMAX*RMAX) continue;
    const v=H[j*GN+i]; SORT[m++]=v; if(Math.max(Math.abs(i-F.ti),Math.abs(j-F.tj))<8) continue; if(v>s2b) s2b=v; }
  const arr=SORT.subarray(0,m).sort(), tv=H[F.tj*GN+F.ti], atT=Math.abs(pi%GN-F.ti)<=2&&Math.abs(((pi/GN)|0)-F.tj)<=2;
  F.peak=Math.max(pk,1e-3); F.base=arr[Math.floor(m*.5)]||0; F.tv=tv; F.second=s2b; F.ok=atT&&tv>.2&&s2b<tv*.9; F.score=(atT?1:0)+tv-Math.max(0,s2b);
}

/* ---------- a fix: where the camera really is, what dead reckoning believes, and the grid Pharos searches ---------- */
function candidates(S,avoid,sep){
  const out=[]; sep=sep==null?230:sep;
  for(let k=0;k<90;k++){ const x=(MARG+Math.random()*(MAP-2*MARG))&~3, y=(MARG+Math.random()*(MAP-2*MARG))&~3;
    if(x<S.w.shore(y)+26) continue; if(avoid.some(a=>Math.hypot(a[0]-x,a[1]-y)<sep)) continue;
    const lx=(x>>2)-PS/2, ly=(y>>2)-PS/2, W=LO+1, a=ly*W+lx, b=a+PS, c=(ly+PS)*W+lx, d=c+PS, e=S.s1[d]-S.s1[b]-S.s1[c]+S.s1[a];
    out.push({x,y,e}); }
  if(out.length<3&&sep>0) return candidates(S,avoid,sep>150?120:0); // later fixes: let spots sit closer rather than run out
  return out.sort((a,b)=>b.e-a.e).slice(0,6);
}
function mkFix(c,r){
  const R0=116+r*9; let cx=0, cy=0;
  for(let k=0;k<12;k++){ const a=Math.random()*TAU, off=R0*(.22+Math.random()*.46); cx=Math.round(clamp(c.x+Math.cos(a)*off,CM,MAP-CM)); cy=Math.round(clamp(c.y+Math.sin(a)*off,CM,MAP-CM)); if(Math.hypot(cx-c.x,cy-c.y)<R0*.74) break; }
  if(Math.hypot(cx-c.x,cy-c.y)>=R0*.74){ cx=Math.round(clamp(c.x,CM,MAP-CM)); cy=Math.round(clamp(c.y,CM,MAP-CM)); } // the truth is always inside the circle
  let gx0=c.x-Math.round((c.x-(cx-GN/2*GSTEP))/GSTEP)*GSTEP, gy0=c.y-Math.round((c.y-(cy-GN/2*GSTEP))/GSTEP)*GSTEP;
  if(((c.x-gx0)/GSTEP)%MS) gx0-=GSTEP; if(((c.y-gy0)/GSTEP)%MS) gy0-=GSTEP; // the truth sits on a node of the coarse mesh too
  const F={r,x:c.x,y:c.y,cx,cy,R:R0,R0,gx0,gy0,ti:(c.x-gx0)/GSTEP,tj:(c.y-gy0)/GSTEP,set:cur,slot:r%2,
    head:.5+Math.random()*5.28,tilt:.36+Math.random()*.07,frame:1000+((Math.random()*8000)|0),
    clouds:[...Array(3+((Math.random()*3)|0))].map(()=>[c.x+gauss()*130,c.y+gauss()*130,60+Math.random()*90]),spoof:null};
  if(r>=2){ // a confident GNSS fix that is quietly drifting away: what a spoofed receiver looks like
    for(let k=0;k<20;k++){ const b=Math.random()*TAU, dd=72+Math.random()*48, sx=c.x+Math.cos(b)*dd, sy=c.y+Math.sin(b)*dd;
      if(Math.hypot(sx-cx,sy-cy)<R0*.85&&sx>MARG*.6&&sy>MARG*.6&&sx<MAP-MARG*.6&&sy<MAP-MARG*.6){ F.spoof={x0:sx,y0:sy,dx:Math.cos(b),dy:Math.sin(b),v:2.6+Math.random()*1.4}; break; } } }
  return F;
}
function* prepFix(r,avoid){
  const cs=candidates(SETS[cur],avoid); let best=null, last=null;
  const shoot=function*(F){ camPaint(F,0); yield; camPaint(F,1); yield; camDescribe(F); yield; CAM[F.slot].gx.drawImage(CAM[F.slot].c,0,0); yield; for(let j=0;j<GN;j+=12){ correlate(F,j,j+12); yield; } corrStats(F); };
  for(let k=0;k<cs.length;k++){ const F=mkFix(cs[k],r); yield* shoot(F); last=F; if(!best||F.score>best.score) best=F; if(F.ok) break; }
  if(best&&best!==last) yield* shoot(best); // the canvases and heat must hold the chosen fix
  pend=best;
}

/* ---------- jobs: heavy work spread across frames ---------- */
let mapJob=null, prepJob=null, pend=null, scan=null;
const STEPS=[];
function pump(budget){ const t0=performance.now(); let n=0;
  while(performance.now()-t0<budget||n===0){ const j=mapJob||prepJob; if(!j) break; n++; const s0=performance.now(), dn=j.next().done; if(STEPS.length<400) STEPS.push([j===mapJob?'map':'prep',+(performance.now()-s0).toFixed(1)]); if(dn){ if(j===mapJob){ mapJob=null; startScan(); } else prepJob=null; } if(n>40) break; } }
function finishJobs(){ while(mapJob&&!mapJob.next().done){} if(mapJob){ mapJob=null; startScan(); } if(scan) endScan(); }
function startScan(){ scan={t:0,to:1-cur}; U.uSel.value=scan.to; U.uScan.value=-.05; pend=null; prepJob=null; }
function endScan(){ cur=scan.to; scan=null; U.uSel.value=cur; U.uScan.value=2; pend=null; prepJob=null; landmarks(); }
function landmarks(){ const w=SETS[cur].w, vil=w.roads[0].p[Math.round(w.roads[0].p.length*.36)]; U.uLH.value.set(w.lh[0]/MAP,w.lh[1]/MAP,0);
  if(st.anchors.length===3){ st.anchors[1].set(m2w(vil[0]),hAt(SETS[cur],vil[0],vil[1]),m2w(vil[1])); st.anchors[2].set(m2w(w.lh[0]),.02,m2w(w.lh[1])); } }

/* ---------- scene ---------- */
const CMAP=`vec3 cmap(float v){ vec3 a=vec3(.42,.07,.01), b=vec3(1.,.45,.08), c=vec3(1.,.8,.55), d=vec3(1.,.98,.94);
  return v<.45?mix(a,b,v/.45):v<.8?mix(b,c,(v-.45)/.35):mix(c,d,(v-.8)/.2); }`;
const heatD=new Uint8Array(GN*GN*4), heatTex=new T.DataTexture(heatD,GN,GN), NV=new Float32Array(MG*MG), NH=new Float32Array(MG*MG); heatTex.minFilter=heatTex.magFilter=T.LinearFilter; heatTex.needsUpdate=true;
const U={tA:{value:SETS[0].t},tB:{value:SETS[1].t},tHeat:{value:heatTex},uSel:{value:0},uScan:{value:2},uTime:G.uTime,uOn:{value:0},uDesc:{value:.5},uMenu:{value:1},
  uCirc:{value:new T.Vector3(.5,.5,0)},uHover:{value:new T.Vector4()},uFoot:{value:new T.Vector4()},uHeat:{value:new T.Vector4()},uWave:{value:new T.Vector4()},
  uShadow:{value:new T.Vector4()},uLock:{value:new T.Vector4()},uLH:{value:new T.Vector3()}};
let plane, drone, fr, beam, lat, mesh, burst, latU;
function gridGeo(){ const n=SEG+1, pos=new Float32Array(n*n*3), idx=new Uint16Array(SEG*SEG*6);
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const k=j*n+i; pos[k*3]=(i/SEG-.5)*PW; pos[k*3+2]=(j/SEG-.5)*PW; }
  let o=0; for(let j=0;j<SEG;j++) for(let i=0;i<SEG;i++){ const a=j*n+i, b=a+1, c=a+n, d=c+1; idx[o++]=a; idx[o++]=c; idx[o++]=b; idx[o++]=b; idx[o++]=c; idx[o++]=d; }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('aH0',new T.BufferAttribute(new Float32Array(n*n),1)); g.setAttribute('aH1',new T.BufferAttribute(new Float32Array(n*n),1));
  g.setIndex(new T.BufferAttribute(idx,1)); g.boundingSphere=new T.Sphere(new T.Vector3(),PW); return g; }
function buildPlane(){
  plane=new T.Mesh(gridGeo(),new T.ShaderMaterial({uniforms:U,extensions:{derivatives:true},
    vertexShader:`attribute float aH0,aH1; uniform float uSel,uScan; varying vec3 vW;
      void main(){ vec3 p=position; float nw=1.-smoothstep(uScan-.02,uScan,p.z/${PW}.+.5); p.y=mix(uSel<.5?aH1:aH0,uSel<.5?aH0:aH1,nw);
        vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D tA,tB,tHeat; uniform float uSel,uScan,uTime,uOn,uDesc,uMenu; uniform vec3 uCirc,uLH; uniform vec4 uHover,uFoot,uHeat,uWave,uShadow,uLock; varying vec3 vW;
      ${CMAP}
      float sq(vec2 p,vec2 c,float h){ vec2 d=abs(p-c); return max(d.x,d.y)-h; }
      void main(){
        vec2 mp=vW.xz/${PW}.+.5; float nw=1.-smoothstep(uScan-.012,uScan,mp.y);
        vec4 ta=texture2D(tA,mp), tb=texture2D(tB,mp); vec4 tx=mix(uSel<.5?tb:ta,uSel<.5?ta:tb,nw);
        vec3 AC=vec3(1.,.835,.70); float l=dot(tx.rgb,vec3(.3,.59,.11)); vec3 ph=mix(vec3(l),tx.rgb,.62); float e=tx.a;
        vec3 c=ph*(.6-uDesc*.2)+AC*e*uDesc*.78;
        float pw=fwidth(mp.x)+fwidth(mp.y);
        float dc=length(mp-uCirc.xy), ins=1.-smoothstep(uCirc.z-pw,uCirc.z+pw,dc);
        c*=mix(1.,mix(.38,1.1,ins),uOn);
        float ring=1.-smoothstep(pw*.5,pw*1.7,abs(dc-uCirc.z)); float an=atan(mp.y-uCirc.y,mp.x-uCirc.x);
        c+=AC*ring*(.22+.78*step(.4,fract(an*9.5493+uTime*.05)))*uOn;
        c*=1.-uShadow.w*(1.-smoothstep(0.,uShadow.z,length(mp-uShadow.xy)));
        if(uHover.w>.001){ float d=sq(mp,uHover.xy,uHover.z), iq=1.-smoothstep(-pw,0.,d);
          c=mix(c,ph*.16+AC*e*1.3,iq*uHover.w*.9); c+=AC*(1.-smoothstep(pw*.4,pw*1.5,abs(d)))*uHover.w*.95; }
        float fd=sq(mp,uFoot.xy,uFoot.z);
        if(uFoot.w>.001) c=mix(c,ph*.22+AC*e*1.35,(1.-smoothstep(-pw,0.,fd))*uFoot.w*.5);
        if(uHeat.w>.001){ vec2 g=(mp-uHeat.xy)/uHeat.z, tc=(g+.5)/${GN}.;
          float inG=step(0.,tc.x)*step(tc.x,1.)*step(0.,tc.y)*step(tc.y,1.), v=texture2D(tHeat,tc).r*inG, dw=length(mp-uWave.xy);
          float rv=1.-smoothstep(uWave.z-.035,uWave.z,dw);
          c=mix(c,c*.5,rv*ins*uHeat.w*.7); c+=cmap(v)*pow(v,2.2)*rv*ins*uHeat.w*1.15;
          c+=AC*(1.-smoothstep(0.,.005,abs(dw-uWave.z)))*uWave.w*ins*.7; }
        if(uFoot.w>.001) c+=vec3(1.,.95,.88)*(1.-smoothstep(pw*.5,pw*2.,abs(fd)))*uFoot.w*1.2;
        if(uLock.w>.001) c+=AC*(1.-smoothstep(0.,.0045,abs(length(mp-uLock.xy)-uLock.z)))*uLock.w;
        vec2 lq=mp-uLH.xy; float lr=length(lq), la=atan(lq.y,lq.x);
        c+=AC*pow(max(cos(la-uTime*.7),0.),70.)*smoothstep(.004,.03,lr)*exp(-lr*4.5)*.5*uMenu;
        c+=AC*(1.-smoothstep(0.,.004,lr))*(.55+.45*sin(uTime*3.))*uMenu;
        c+=AC*(1.-smoothstep(0.,.0035,abs(mp.y-uScan)))*step(uScan,1.02)*1.3;
        float bd=min(min(mp.x,1.-mp.x),min(mp.y,1.-mp.y)); c*=smoothstep(0.,.06,bd);
        c*=mix(.3,1.,smoothstep(.82,.3,length(mp-.5)));
        gl_FragColor=vec4(c,1.); }`}));
  sc.add(plane);
}
function buildDrone(){
  drone={g:new T.Group(),p:new T.Vector3(1,2,1),yaw:0,bank:0,spd:1,C:new T.Vector3(),r:2.2,alt:2,cw:1,prop:null};
  const M=(c,o)=>{ const m=LM(c,o); m.uniforms.uKey.value.set(-6,10,-4); return m; };
  const body=M('#EFE6D8',{emit:.14,rim:.9,amb:.16}), wing=M('#FFD5B3',{emit:.2,rim:1.1,amb:.14}), dark=M('#2c2620',{emit:0,rim:.5,amb:.3}), g=drone.g;
  const fus=new T.Mesh(new T.CapsuleGeometry(.024,.25,4,10),body); fus.rotation.x=Math.PI/2; g.add(fus);
  const ws=new T.Shape(); ws.moveTo(0,.05); ws.lineTo(.31,.024); ws.lineTo(.31,-.012); ws.lineTo(0,-.036); ws.lineTo(-.31,-.012); ws.lineTo(-.31,.024); ws.closePath();
  const wg=new T.Mesh(new T.ExtrudeGeometry(ws,{depth:.007,bevelEnabled:false}),wing); wg.rotation.x=-Math.PI/2; wg.position.set(0,.012,-.03); g.add(wg);
  const ts=new T.Shape(); ts.moveTo(0,.028); ts.lineTo(.085,.012); ts.lineTo(.085,-.008); ts.lineTo(0,-.02); ts.closePath();
  for(const sd of [-1,1]){ const t=new T.Mesh(new T.ExtrudeGeometry(ts,{depth:.005,bevelEnabled:false}),wing); t.rotation.set(-Math.PI/2,0,0); const pv=new T.Group(); pv.add(t); pv.rotation.z=sd*.62; pv.scale.x=sd; pv.position.set(0,.016,.135); g.add(pv); }
  const pod=new T.Mesh(new T.SphereGeometry(.017,12,8),dark); pod.position.set(0,-.022,-.07); g.add(pod);
  drone.prop=new T.Mesh(new T.CircleGeometry(.05,24),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying vec2 vU; void main(){ vU=uv-.5; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`varying vec2 vU; void main(){ float r=length(vU)*2.; gl_FragColor=vec4(vec3(1.,.86,.72)*.22*smoothstep(1.,.3,r)*(.4+.6*r),1.); }`}));
  drone.prop.position.set(0,0,.16); g.add(drone.prop);
  const lights=new Float32Array([-.31,.016,0, .31,.016,0, 0,.03,.15, 0,-.032,-.07]);
  const lg=new T.BufferGeometry(); lg.setAttribute('position',new T.BufferAttribute(lights,3)); lg.setAttribute('aR',new T.BufferAttribute(new Float32Array([.1,.1,.6,.3, .1,.1,.6,.3, .55,.5,.9,.3, .9,.9,.5,.3]),4));
  g.add(pts(lg,PM({size:.07,color:'#FFE9D6',body:'b=aR.x>.8?1.4:aR.x>.5?.25+1.6*step(.9,fract(uTime*.9)):.9+.25*sin(uTime*2.);'})));
  g.scale.setScalar(1.12); sc.add(g);
  // camera frustum: four hairlines from the lens to the footprint, faint faces between them
  fr={pos:new Float32Array(24),fpos:new Float32Array(36),op:0};
  const lgeo=new T.BufferGeometry(); lgeo.setAttribute('position',new T.BufferAttribute(fr.pos,3)); lgeo.boundingSphere=new T.Sphere(new T.Vector3(),40);
  fr.lines=new T.LineSegments(lgeo,new T.LineBasicMaterial({color:0xFFD5B3,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false})); fr.lines.frustumCulled=false; sc.add(fr.lines);
  const fgeo=new T.BufferGeometry(); fgeo.setAttribute('position',new T.BufferAttribute(fr.fpos,3)); const ft=new Float32Array(12); for(let k=0;k<4;k++){ ft[k*3]=0; ft[k*3+1]=1; ft[k*3+2]=1; } fgeo.setAttribute('aT',new T.BufferAttribute(ft,1)); fgeo.boundingSphere=new T.Sphere(new T.Vector3(),40);
  fr.mat=new T.ShaderMaterial({uniforms:{uOp:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`attribute float aT; varying float vT; void main(){ vT=aT; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOp; varying float vT; void main(){ gl_FragColor=vec4(vec3(1.,.835,.7)*(.008+.04*vT*vT)*uOp,1.); }`});
  fr.faces=new T.Mesh(fgeo,fr.mat); fr.faces.frustumCulled=false; sc.add(fr.faces);
}
function buildFX(){
  // the fix: a lighthouse shaft standing on the true position
  beam=new T.Mesh(new T.CylinderGeometry(.018,.07,1,14,1,true).translate(0,.5,0),new T.ShaderMaterial({uniforms:{uOp:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying float vY; void main(){ vY=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`uniform float uOp; varying float vY; void main(){ gl_FragColor=vec4(vec3(1.,.9,.8)*pow(1.-vY,2.2)*uOp*.9,1.); }`}));
  beam.visible=false; sc.add(beam);
  // the correlation surface as a lattice of points that rises where the camera's edges agree with the map's
  latU={uHeat:U.uHeat,uWave:U.uWave,uCirc:U.uCirc,uLift:{value:0},uMs:{value:MS}};
  const SURF=`vec2 mp=uHeat.xy+aIdx*uMs*uHeat.z; float k=clamp((uWave.z-length(mp-uWave.xy))/.07,0.,1.); float ins=1.-smoothstep(uCirc.z-.004,uCirc.z+.004,length(mp-uCirc.xy));
      float v=clamp(aV,0.,1.), e=1.-((1.-k)*(1.-k)*(1.-k)); vec3 q=vec3((mp.x-.5)*${PW}.,aH+.012+uLift*pow(v,1.9)*e,(mp.y-.5)*${PW}.);`;
  lat=pts(cloud(MG*MG,(i,r,o,ex)=>{ o[0]=o[1]=o[2]=0; ex.aIdx[i*2]=i%MG; ex.aIdx[i*2+1]=(i/MG)|0; },{aIdx:2,aV:1,aH:1}),
    PM({size:.045,color:'#FFD5B3',uniforms:latU,decl:'attribute vec2 aIdx; attribute float aV,aH; uniform vec4 uHeat,uWave; uniform vec3 uCirc; uniform float uLift,uMs;',fns:CMAP,body:SURF+`
      p=q; col=cmap(v); b=ins*k*uHeat.w*(.16+1.9*pow(v,2.4)); sz=.55+1.6*v*v;`}));
  sc.add(lat);
  { const segs=MG*(MG-1)*2, idx=new Float32Array(segs*4); let o=0;
    for(let j=0;j<MG;j++) for(let i=0;i<MG-1;i++){ idx[o++]=i; idx[o++]=j; idx[o++]=i+1; idx[o++]=j; }
    for(let i=0;i<MG;i++) for(let j=0;j<MG-1;j++){ idx[o++]=i; idx[o++]=j; idx[o++]=i; idx[o++]=j+1; }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(segs*6),3)); g.setAttribute('aIdx',new T.BufferAttribute(idx,2));
    g.setAttribute('aV',new T.BufferAttribute(new Float32Array(segs*2),1)); g.setAttribute('aH',new T.BufferAttribute(new Float32Array(segs*2),1)); g.boundingSphere=new T.Sphere(new T.Vector3(),40);
    mesh=new T.LineSegments(g,new T.ShaderMaterial({uniforms:latU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`attribute vec2 aIdx; attribute float aV,aH; uniform vec4 uHeat,uWave; uniform vec3 uCirc; uniform float uLift,uMs; varying vec3 vC; ${CMAP}
        void main(){ ${SURF} vC=mix(vec3(.5,.26,.12)*.22,cmap(v)*(.1+.9*pow(v,1.6)),smoothstep(0.,.35,v))*ins*k*uHeat.w; gl_Position=projectionMatrix*viewMatrix*vec4(q,1.); }`,
      fragmentShader:`varying vec3 vC; void main(){ gl_FragColor=vec4(vC,1.); }`})); mesh.frustumCulled=false; sc.add(mesh); }
  burst=Burst(sc,Math.floor(240*Q+60),'#FFD5B3',.045);
  sc.add(pts(cloud(Math.floor(1100*Q+300),(i,r,o)=>{o[0]=(r[0]-.5)*16;o[1]=.4+r[1]*3.4;o[2]=(r[2]-.5)*16;}),PM({size:.035,color:'#FFD5B3',body:'p.y+=sin(uTime*.3+aR.x*9.)*.15; p.x+=sin(uTime*.1+aR.y*7.)*.2; b=.06+.05*aR.w;'})));
}

/* ---------- mapping helpers ---------- */
const ray=new T.Raycaster(), ndc=new T.Vector2(), _v=new T.Vector3(), _tw=new T.Vector3(), SP={x:0,y:0,z:0}, SP2={x:0,y:0,z:0}, PK={px:0,py:0,ok:false};
function pick(cx,cy){ // screen to map px, ray cast onto the relief
  ndc.set(cx/innerWidth*2-1,-(cy/innerHeight*2-1)); ray.setFromCamera(ndc,stCam); const o=ray.ray.origin, d=ray.ray.direction; PK.ok=false;
  if(d.y>-1e-4) return PK; let h=RELIEF*.4, x=0, z=0;
  for(let it=0;it<7;it++){ const t=(h-o.y)/d.y; x=o.x+d.x*t; z=o.z+d.z*t; h=hAt(SETS[cur],(x/PW+.5)*MAP,(z/PW+.5)*MAP); }
  PK.px=(x/PW+.5)*MAP; PK.py=(z/PW+.5)*MAP; PK.ok=PK.px>=0&&PK.py>=0&&PK.px<=MAP&&PK.py<=MAP; return PK; }
function m2s(px,py,lift,out){ lift*=.25; _v.set(m2w(px),hAt(SETS[cur],px,py)+lift,m2w(py)).project(stCam); out.x=(_v.x*.5+.5)*innerWidth; out.y=(-_v.y*.5+.5)*innerHeight; out.z=_v.z; return out; }
const at=(e,x,y,extra)=>{ e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${extra||''}`; };

/* ---------- DOM ---------- */
const feedCv=$('#phFeed'), fx=feedCv.getContext('2d'), stg=$$('.stg li',el), D={round:$('#phRound'),unc:$('#phUnc'),uncL:$('#phUncL'),score:$('#phScore'),help:$('#phHelp'),keys:$('#phKeys'),
  next:$('#phNext'),cap:$('#phCap'),tele:$('#phTele'),tele2:$('#phTele2'),frm:$('#phFrm'),box:$('#phBox'),ring:$('#phRing'),gnss:$('#phGnss'),gnssL:$('#phGnssL'),
  ff:$('#phF'),clk:$('#phClk'),tru:$('#phTru'),ln:$('#phLn'),dist:$('#phDist'),banner:$('#phBanner'),pops:$('#phPops'),fxl:$('#phFx')};
let FN=300, vig=null, noiseC=null;
function feedSize(){ const r=D.box.getBoundingClientRect(); const n=Math.max(96,Math.round((r.width||300)*Math.min(2,devicePixelRatio||1)));
  if(n!==FN||!vig){ FN=feedCv.width=feedCv.height=n; const [c,x]=cv2(n); const g=x.createRadialGradient(n/2,n/2,n*.18,n/2,n/2,n*.74); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.78)'); x.fillStyle=g; x.fillRect(0,0,n,n); vig=c;
    if(F&&game) drawFeed(F); } } // a new size clears the canvas: put the frame back, or a phone turned while matching shows nothing to match
{ const [c,x]=cv2(128), im=x.createImageData(128,128); for(let i=0;i<im.data.length;i+=4){ const v=Math.random()*255; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; } x.putImageData(im,0,0); noiseC=c; }
const lay={cx:0,cy:0,d:400,stack:false,side:false};
const AIM_T='Drag the square over the map until it matches the camera, then let go', AIM_M='Move the square over the map until it matches the camera, then click', AIM_K='Or arrow keys and Enter';
function measure(){ const W=innerWidth, H=innerHeight, f=$('#phF').getBoundingClientRect(), top=Math.min(H*.2,140);
  /* the words under the map change through a fix: the map is framed for them as they stand while you aim (the first fix's,
     with its line of keys), not as they happened to read when this ran, which left the circle under them in some games */
  const h0=D.help.textContent, k0=D.keys.textContent; D.help.textContent=TOUCH?AIM_T:AIM_M; D.keys.textContent=TOUCH?'':AIM_K;
  const hb=q('.gbc').getBoundingClientRect(), gl=q('.gtl').getBoundingClientRect(); D.help.textContent=h0; D.keys.textContent=k0;
  const helpTop=Math.min(H-70,hb.top||H-80);
  lay.side=H<=520&&W/H>=.9;
  if(lay.side){ lay.stack=false; const x0=Math.max(gl.right,hb.right)+18, x1=f.left-22, y0=40, y1=H-14;   // a phone held sideways: a column of HUD each side, the map between (station.css)
    lay.cx=(x0+x1)/2; lay.cy=(y0+y1)/2; lay.d=Math.min((x1-x0)*.94,(y1-y0)*.9); }
  /* the phone's layout (station.css) puts the map under the camera, with room above the circle for its label; a tall desktop
     window keeps the map beside the camera, as its HUD is laid out */
  else if(NARROW()&&f.bottom<H*.5){ lay.stack=true; const y0=f.bottom+28, y1=helpTop-10; lay.cx=W/2; lay.cy=(y0+y1)/2; lay.d=Math.min(W*.94,(y1-y0)); }
  else { lay.stack=false; const x1=f.left-28; lay.cx=x1/2+8; lay.cy=(top+helpTop)/2+6; lay.d=Math.min(x1*.92,(helpTop-top)*.98); }
  feedSize(); }

/* ---------- the feed: raw, rectify, describe, match ---------- */
const ST_NAMES=['Raw','Rectify','Describe','Match'];
const CAPS=['The frame as it lands: tilted, rotated, this season’s colours and shadows.','Projected onto the ground with the drone’s attitude. North up, true scale.','Edges only: hedges, roads, buildings, water. Colour, season and shadow drop out.','These edges are somewhere inside the circle. Find them on the map.'];
const GP=[0,0];
function drawRaw(F,tilt,head,grid){
  const C=CAM[F.slot], x=fx, n=FN, c=CSZ/2;
  rotX.setTransform(1,0,0,1,0,0); rotX.fillStyle='#000'; rotX.fillRect(0,0,CSZ,CSZ); rotX.translate(c,c); rotX.rotate(-head); rotX.drawImage(C.g,-c,-c); rotX.setTransform(1,0,0,1,0,0);
  x.fillStyle='#000'; x.fillRect(0,0,n,n);
  const ct=Math.cos(tilt), sn=Math.sin(tilt), Hh=FEED/2, off=Hh*Math.tan(tilt), NS=Math.min(64,Math.round(n/5));
  const gy=v=>Hh*(v*ct+sn)/(ct-v*sn)-off;
  for(let k=0;k<NS;k++){ const v0=1-2*k/NS, v1=1-2*(k+1)/NS, s=Hh/(ct-(v0+v1)/2*sn), g0=gy(v0), g1=gy(v1);
    x.drawImage(rotCv,c-s*CS,c-g0*CS,2*s*CS,(g0-g1)*CS,0,k*n/NS,n,n/NS+.8); }
  if(grid>0){ // the ground grid this projection lands on
    x.strokeStyle=`rgba(255,213,179,${(.55*grid).toFixed(3)})`; x.lineWidth=Math.max(1,n/300);
    const ch=Math.cos(head), shd=Math.sin(head), tt=Math.tan(tilt), P=GP, at_=(dx,dy)=>{ const rx=dx*ch+dy*shd, ry=-dx*shd+dy*ch, G=-ry/Hh+tt, v=(G*ct-sn)/(ct+G*sn), s=Hh/(ct-v*sn); P[0]=n/2+rx/s*n/2; P[1]=n/2-v*n/2; };
    x.beginPath(); for(let k=-2;k<=2;k++){ for(let m=0;m<=8;m++){ at_(k*40,(m/8-.5)*FEED*1.5); m?x.lineTo(P[0],P[1]):x.moveTo(P[0],P[1]); } for(let m=0;m<=8;m++){ at_((m/8-.5)*FEED*1.5,k*40); m?x.lineTo(P[0],P[1]):x.moveTo(P[0],P[1]); } } x.stroke(); }
}
function drawFeed(F){
  const x=fx, n=FN, k=F.st/F.dur[Math.min(2,F.stage)], C=CAM[F.slot];
  if(F.stage===0){ drawRaw(F,F.tilt,F.head,0); x.globalAlpha=1; x.drawImage(vig,0,0); x.globalCompositeOperation='overlay'; x.globalAlpha=.32; x.drawImage(noiseC,(Math.random()*-64)|0,(Math.random()*-64)|0,n+64,n+64); x.globalCompositeOperation='source-over'; x.globalAlpha=1; }
  else if(F.stage===1){ const e=E.io(clamp(k,0,1)); drawRaw(F,F.tilt*(1-e),F.head*(1-e),Math.sin(clamp(k,0,1)*Math.PI)); x.globalAlpha=1-e; x.drawImage(vig,0,0); x.globalAlpha=1; }
  else { const o=CSZ/2-FEED*CS/2; x.drawImage(C.g,o,o,FEED*CS,FEED*CS,0,0,n,n);
    const wy=F.stage>=3?n+2:E.io(clamp(k,0,1))*n;
    if(F.stage===2){ x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(0,0,n,n); }
    x.save(); x.beginPath(); x.rect(0,0,n,wy); x.clip(); x.fillStyle='#000'; x.fillRect(0,0,n,n); x.drawImage(C.e,0,0,n,n); x.restore();
    if(F.stage===2){ const g=x.createLinearGradient(0,wy-n*.12,0,wy); g.addColorStop(0,'rgba(255,213,179,0)'); g.addColorStop(1,'rgba(255,213,179,.42)'); x.fillStyle=g; x.fillRect(0,wy-n*.12,n,n*.12); x.fillStyle='#FFE6D2'; x.fillRect(0,wy-1,n,Math.max(1.5,n/200)); } }
}
let teleT=0;
function teleText(F,force){ if(!force&&(teleT+=1)%4) return; const s=F.stage, k=s===1?E.io(clamp(F.st/F.dur[1],0,1)):s>1?1:0;
  const hd=Math.round(((F.head*(1-k))*180/Math.PI+360)%360), tl=Math.round(F.tilt*(1-k)*180/Math.PI);
  D.tele.textContent=s<2?`Hdg ${String(hd).padStart(3,'0')}° · Tilt ${tl}°`:'North up · nadir'; D.tele2.textContent=s<2?'Alt 120 m':'Edges'; }
const SHORT=['Raw frame: tilted, rotated, autumn light','Rectify: onto the ground, north up','Describe: edges only, colour and shadow gone'];
function stageUI(s){ stg.forEach((li,i)=>{ li.classList.toggle('on',i===s); li.classList.toggle('done',i<s); }); D.cap.textContent=CAPS[s]; if(s<3&&(lay.stack||lay.side)&&F&&F.phase==='feed') setHelp(SHORT[s],F.r===1?'':TOUCH?'Tap the camera to skip':'Click the camera or press Space to skip'); }

/* ---------- drone flight: loiter around a centre, bank into turns ---------- */
const _f=new T.Vector3(), _c=[new T.Vector3(),new T.Vector3(),new T.Vector3(),new T.Vector3()], _ap=new T.Vector3(), _q=new T.Euler(0,0,0,'YXZ');
function droneUpdate(dt,t){
  const Dr=drone, p=Dr.p, dx=p.x-Dr.C.x, dz=p.z-Dr.C.z, dist=Math.hypot(dx,dz)||1e-3, rx=dx/dist, rz=dz/dist;
  const tx=-rz*Dr.cw, tz=rx*Dr.cw, e=clamp((dist-Dr.r)/Math.max(.3,Dr.r)*1.7,-1.6,1.6);
  let wx=tx-rx*e, wz=tz-rz*e; if(dist>Dr.r*2.6+.6){ wx=-rx; wz=-rz; }
  const want=Math.atan2(-wx,-wz), rate=clamp(angDiff(want,Dr.yaw)*2.4,-2.2,2.2);
  Dr.yaw+=rate*dt; Dr.bank=damp(Dr.bank,clamp(rate*.42,-.7,.7),3,dt);
  const spd=Dr.spd*(1+clamp((dist-Dr.r*1.6)*.35,0,1.4));
  p.x+=-Math.sin(Dr.yaw)*spd*dt; p.z+=-Math.cos(Dr.yaw)*spd*dt; p.y=damp(p.y,Dr.alt+Math.sin(t*.8)*.03,1.6,dt);
  Dr.g.position.copy(p); _q.set(Math.sin(t*1.1)*.02,Dr.yaw,Dr.bank); Dr.g.rotation.copy(_q); Dr.prop.rotation.z=t*40;
  // shadow on the ground
  U.uShadow.value.set((p.x+p.y*.22)/PW+.5,(p.z+p.y*.18)/PW+.5,.016,.34);
}
const CRN=[-1,-1,1,-1,1,1,-1,1];
function frustum(on,px,py,dt){ // px, py: footprint centre in map px
  fr.op=damp(fr.op,on?1:0,4,dt); fr.lines.material.opacity=.3*fr.op; fr.mat.uniforms.uOp.value=fr.op; fr.lines.visible=fr.faces.visible=fr.op>.01; if(!fr.lines.visible) return;
  _ap.set(0,-.03,-.07).applyEuler(drone.g.rotation).multiplyScalar(1.12).add(drone.p);
  for(let k=0;k<4;k++){ const X=px+CRN[k*2]*FEED/2, Y=py+CRN[k*2+1]*FEED/2; _c[k].set(m2w(X),hAt(SETS[cur],X,Y)+.01,m2w(Y)); }
  const P=fr.pos; for(let k=0;k<4;k++){ P[k*6]=_ap.x; P[k*6+1]=_ap.y; P[k*6+2]=_ap.z; P[k*6+3]=_c[k].x; P[k*6+4]=_c[k].y; P[k*6+5]=_c[k].z; }
  const FP=fr.fpos; for(let k=0;k<4;k++){ const a=_c[k], b=_c[(k+1)%4], o=k*9; FP[o]=_ap.x; FP[o+1]=_ap.y; FP[o+2]=_ap.z; FP[o+3]=a.x; FP[o+4]=a.y; FP[o+5]=a.z; FP[o+6]=b.x; FP[o+7]=b.y; FP[o+8]=b.z; }
  fr.lines.geometry.attributes.position.needsUpdate=true; fr.faces.geometry.attributes.position.needsUpdate=true;
}

/* ---------- game ---------- */
let game=null, F=null;
const aim={x:MAP/2,y:MAP/2,on:0,want:0,drag:false,id:-1,kb:false};
function blurInside(){ const a=document.activeElement; if(a&&el.contains(a)&&a.blur) a.blur(); }
function vis(e,on){ e.classList.toggle('on',!!on); }
function hideMarks(){ [D.ring,D.gnss,D.clk,D.tru,D.ln,D.dist].forEach(e=>vis(e,false)); }
function setHelp(t,keys){ D.help.textContent=t; D.keys.textContent=keys||''; }
function startFix(Fx){
  F=Fx; game.r=F.r; F.phase='feed'; F.stage=0; F.st=0; F.t=0; F.ft=0; F.rt=0; F.dur=F.r===1?[1.3,1.3,1.15]:[.8,.85,.75]; F.lock=false; F.shownR=0;
  game.avoid.push([F.x,F.y]); game.gnss+=F.spoof?1:0;
  // heat data for this fix (only drawn after the click)
  const H=HEAT[F.slot], sp=Math.max(1e-3,F.peak-F.base);
  for(let k=0;k<GN*GN;k++){ const v=clamp((H[k]-F.base)/sp,0,1); heatD[k*4]=v*255; heatD[k*4+1]=heatD[k*4+2]=0; heatD[k*4+3]=255; }
  for(let j=0;j<MG;j++) for(let i=0;i<MG;i++){ const k=j*MG+i; NV[k]=heatD[((j*MS)*GN+i*MS)*4]/255; NH[k]=hAt(SETS[cur],F.gx0+i*MS*GSTEP,F.gy0+j*MS*GSTEP); }
  const la=lat.geometry.attributes.aV, lh=lat.geometry.attributes.aH; la.array.set(NV); lh.array.set(NH); la.needsUpdate=lh.needsUpdate=true;
  const ma=mesh.geometry.attributes.aV, mh=mesh.geometry.attributes.aH, mi=mesh.geometry.attributes.aIdx.array;
  for(let k=0;k<ma.count;k++){ const n=mi[k*2+1]*MG+mi[k*2]; ma.array[k]=NV[n]; mh.array[k]=NH[n]; } ma.needsUpdate=mh.needsUpdate=true;
  heatTex.needsUpdate=true;
  U.uHeat.value.set(F.gx0/MAP,F.gy0/MAP,GSTEP/MAP,0); U.uWave.value.set(0,0,0,0); U.uFoot.value.w=0; U.uLock.value.w=0; latU.uLift.value=0;
  hideMarks(); vis(D.next,false); aim.on=0; aim.want=0; aim.drag=false; beam.visible=false;
  D.round.textContent=`Fix ${F.r} / ${ROUNDS}`; D.frm.textContent='Frame '+F.frame; D.box.dataset.cur='Skip'; stageUI(0); teleText(F,true);
  D.uncL.textContent=F.spoof?'GNSS reports a fix · check it':'GPS jammed · dead reckoning';
  setHelp(F.r===1?'Pharos is reading the camera':'Reading the next frame',F.r===1?'':TOUCH?'Tap the camera to skip':'Click the camera or press Space to skip'); stageUI(0);
  showBanner(D.banner,`Fix ${F.r}`,F.r===1?'GPS jammed':F.spoof?'GNSS is back. Is it honest?':'Still no GPS');
  if(F.spoof) vis(D.gnss,true), D.gnssL.textContent='GNSS fix · ± 3 m', D.gnss.classList.remove('bad');
  drone.C.set(m2w(F.cx),0,m2w(F.cy)); drone.r=F.R0*PW/MAP+.55; drone.alt=2.15; drone.cw=Math.random()<.5?1:-1;
  A.ping(988,.04); A.whoosh(true,.7,.08);
  drawFeed(F);
}
function toMatch(){ if(!F||F.phase!=='feed') return; F.stage=3; F.st=0; F.phase='aim'; D.ff.classList.add('aim'); if(game&&F.r<ROUNDS&&!prepJob) prepJob=prepFix(F.r+1,game.avoid); stageUI(3); drawFeed(F); teleText(F,true); D.box.removeAttribute('data-cur'); curReset(); A.chime(4); // (the cursor would keep the camera's Skip label out over the map)
  vis(D.ring,true); cursorAim(true); if(!aim.want){ aim.x=F.cx; aim.y=F.cy; aim.want=1; aim.kb=false; } // the tool is visible before you move
  setHelp(TOUCH?AIM_T:AIM_M,TOUCH?'':(F.r===1?AIM_K:'')); }
function spoofAt(Fx,out){ const s=Fx.spoof, d=s.v*(Fx.ft+Fx.t); out[0]=s.x0+s.dx*d; out[1]=s.y0+s.dy*d; return out; }
const _sp=[0,0];
function commit(px,py){
  if(!F||F.phase!=='aim') return; F.phase='reveal'; F.rt=0; D.ff.classList.remove('aim'); F.px=clamp(px,0,MAP); F.py=clamp(py,0,MAP); aim.on=0; aim.want=0; aim.drag=false; cursorAim(false);
  const err=Math.hypot(F.px-F.x,F.py-F.y)*MPX; let spoofed=false;
  if(F.spoof){ spoofAt(F,_sp); const ds=Math.hypot(F.px-_sp[0],F.py-_sp[1])*MPX; spoofed=err>25&&ds<55&&ds<err; F.sx=_sp[0]; F.sy=_sp[1]; }
  const tf=Math.max(.35,1-F.t/30); let pts_=0, v='';
  if(spoofed){ v='Spoofed'; pts_=-250; game.spoofed++; }
  else if(err<=25){ v='Trusted'; pts_=Math.round(1000*tf); game.trusted++; }
  else if(err<=60){ v='Close'; pts_=Math.round(400*tf); game.close++; }
  else { v='Wrong'; game.wrong++; }
  F.err=err; F.v=v; F.pts=pts_; game.list.push({err,v,t:F.t,R:F.R}); game.from=game.score; game.score=Math.max(0,game.score+pts_); game.cnt=0;
  U.uWave.value.set(F.px/MAP,F.py/MAP,0,1); U.uHeat.value.w=1;
  vis(D.clk,true); D.ring.classList.remove('on');
  setHelp('Pharos correlates the camera’s edges with every point in the circle','');
  D.cap.textContent='The surface is Pharos’s answer: how well the camera’s edges agree with the map at each point. The peak is the fix.';
  A.click(); A.beep(1318); A.whoosh(true,1.1,.13);
}
function lock(){
  F.lock=true; const v=F.v, tw=_tw.set(m2w(F.x),hAt(SETS[cur],F.x,F.y),m2w(F.y));
  beam.visible=true; beam.position.set(tw.x,tw.y,tw.z); beam.scale.set(1,.6,1);
  burst.emit(tw,Math.floor(70*Q+30),1.4,null,1.6,1.1); U.uLock.value.set(F.x/MAP,F.y/MAP,0,1);
  drone.C.set(tw.x,0,tw.z); drone.r=.62; drone.alt=1.55;
  if(v==='Trusted'){ A.chord(); S.flash=Math.max(S.flash,.14); }
  else if(v==='Close') A.chime(6);
  else if(v==='Spoofed'){ A.alarm(); feedback(.2,.7,new T.Color(.07,.005,0)); }
  else A.buzz();
  vis(D.tru,true); D.dist.textContent=Math.round(F.err)+' m';
  if(F.spoof){ D.gnssL.textContent=`Spoofed · ${Math.round(Math.hypot(F.sx-F.x,F.sy-F.y)*MPX)} m off`; D.gnss.classList.add('bad'); }
  popAt(D.pops,tw,v==='Trusted'?`Trusted · ${Math.round(F.err)} m`:v==='Spoofed'?'Spoofed':`${v} · ${Math.round(F.err)} m`,v==='Trusted'?'big':v==='Close'?'':'bad');
  const ratio=F.second>0?(F.tv/F.second):9;
  setHelp(v==='Spoofed'?'That fix was the spoofed GNSS. A confident receiver is not the same as a correct one.':v==='Trusted'?`Within 25 m. Pharos would trust that. Its peak stood ${ratio.toFixed(1)}× above the next best.`:
    v==='Close'?`${Math.round(F.err)} m off. Close, but Pharos only trusts a fix within 25 m.`:`${Math.round(F.err)} m off. The bright peak is where the edges really agree.`,'');
}
function nextFix(){
  if(!F||F.phase!=='reveal'||!F.lock) return; blurInside(); vis(D.next,false); A.whoosh(false,.6,.08);
  if(F.r>=ROUNDS) return end();
  if(prepJob){ while(prepJob&&!prepJob.next().done){} prepJob=null; }
  const n=pend; pend=null; if(!n) return end();
  F.phase='out'; F.ot=0; F.nx=n; hideMarks(); // let the answer fade before the next frame arrives
}
function end(){
  const g=game; F.phase='done'; cursorAim(false); hideMarks(); U.uOn.value=0;
  const errs=g.list.map(x=>x.err).sort((a,b)=>a-b), med=errs[2]||0, best=errs[0]||0, avgT=g.list.reduce((a,x)=>a+x.t,0)/Math.max(1,g.list.length), avgR=g.list.reduce((a,x)=>a+x.R,0)/Math.max(1,g.list.length)*MPX;
  const grade=g.spoofed?'Fooled by a spoof':g.trusted>=4?'Trusted':g.trusted>=2||g.trusted+g.close>=3?'Holding position':'Lost';
  const text=g.spoofed?'A confident GNSS fix is not the same as a correct one. Pharos checks the receiver against the camera and flags one that looks sure but is drifting, which is what a spoofed receiver does.':
    'Pharos makes this match on every frame with FFT cross-correlation, across headings and scales, on a laptop CPU. On a real 13 minute flight it was trusted within 25 m 92% of the time and never trusted a wrong position.';
  D.fxl.innerHTML=g.list.map((x,i)=>`<li class="${x.v.toLowerCase()}"><b>0${i+1}</b><span>${x.v}</span><i style="--w:${Math.min(1,x.err/200).toFixed(3)}"></i><em>${Math.round(x.err)} m</em></li>`).join('');
  st.result({grade,score:g.score,stats:[['Trusted within 25 m',g.trusted+' / '+ROUNDS],['Median error',Math.round(med)+' m'],['Best fix',Math.round(best)+' m'],
    ['Spoofs believed',g.gnss?`${g.spoofed} / ${g.gnss}`:'0'],['Average time to fix',avgT.toFixed(1)+' s'],['Average search radius',Math.round(avgR)+' m']],text});
  game=null; A.dock(); blurInside();
  // build a fresh map in the background, then scan it in behind the results
  mapJob=buildSet(SETS[1-cur],(Math.random()*1e9)|0);
}
st.play=function(){
  blurInside(); if(game) st.abort();
  finishJobs(); if(!pend||pend.set!==cur||pend.r!==1){ prepJob=prepFix(1,[]); } while(prepJob&&!prepJob.next().done){} prepJob=null;
  if(!pend) return;
  game={r:0,score:0,list:[],trusted:0,close:0,wrong:0,spoofed:0,gnss:0,avoid:[],from:0,cnt:1,k0:performance.now()}; D.score.textContent='0';
  st.setState('play'); U.uMenu.value=0;
  A.jam(); feedback(0,1.1);
  const n=pend; pend=null; startFix(n);
  measure(); // once the fix is on the screen: the camera's stage line is lit, and the panel is as tall as it will be
};
st.abort=function(){ game=null; F=null; cursorAim(false); D.ff.classList.remove('aim'); hideMarks(); vis(D.next,false); if(U){ U.uOn.value=0; U.uHeat.value.w=0; U.uFoot.value.w=0; U.uLock.value.w=0; U.uHover.value.w=0; } if(beam) beam.visible=false; prepJob=null; aim.drag=false; };
function menuLoiter(){ const nar=NARROW(); drone.C.set(nar?.2:-.9,0,nar?2.6:-1.6); drone.r=nar?1.25:1.75; drone.alt=nar?1.6:2.05; }
st.enter=function(){ st.abort(); st.setState('menu'); U.uMenu.value=1; menuLoiter(); drone.cw=1; drone.p.set(drone.C.x+drone.r,drone.alt,drone.C.z); drone.yaw=Math.PI; { const b=store.get('ph',0); $('#phBest').textContent=b>0?'Best '+fmt(b):''; } measure(); if(!pend&&!prepJob&&!mapJob) prepJob=prepFix(1,[]); };
st.exit=function(){ st.abort(); };
st.build=function(){
  buildPlane(); buildDrone(); buildFX();
  const j=buildSet(SETS[0],(Math.random()*1e9)|0); while(!j.next().done){}
  cur=0; U.uSel.value=0; U.uScan.value=2;
  st.anchors=[new T.Vector3(0,2,0),new T.Vector3(),new T.Vector3()]; landmarks();
  drone.C.set(-.9,0,-1.6); drone.r=1.75; drone.alt=2.05; drone.p.set(.85,2.05,-1.6);
};

/* ---------- input: mouse aims and clicks, touch drags and lets go, keys move and press Enter ---------- */
st.onPointer=function(e){
  if(st.state!=='play'||!F) return;
  if(F.phase==='feed'){ if(e.pointerType==='mouse') return; }
  if(F.phase!=='aim') return; const p=pick(e.clientX,e.clientY); if(!p.ok) return;
  if(e.pointerType==='mouse'){ if(e.button===0) commit(p.px,p.py); }
  else { aim.drag=true; aim.id=e.pointerId; aim.x=p.px; aim.y=p.py; aim.want=1; aim.kb=false; A.tick(); }
};
addEventListener('pointermove',e=>{ if(S.st!==st||st.state!=='play'||!F||F.phase!=='aim') return;
  if(e.pointerType==='mouse'){ if(e.target!==canvas){ if(!aim.kb) aim.want=0; return; } const p=pick(e.clientX,e.clientY); if(p.ok){ aim.x=p.px; aim.y=p.py; aim.want=1; aim.kb=false; } else aim.want=0; }
  else if(aim.drag&&e.pointerId===aim.id){ const p=pick(e.clientX,e.clientY); if(p.ok){ aim.x=p.px; aim.y=p.py; } } },{passive:true});
addEventListener('pointerup',e=>{ if(!aim.drag||e.pointerId!==aim.id) return; aim.drag=false; if(S.st===st&&F&&F.phase==='aim') commit(aim.x,aim.y); });
addEventListener('pointercancel',e=>{ if(aim.drag&&e.pointerId===aim.id){ aim.drag=false; aim.want=0; } });
// (a key pressed before the game began, the Enter that started it from the title, is not also a press inside it)
addEventListener('keydown',e=>{ if(S.mode!=='station'||S.st!==st||st.state!=='play'||!F||(game&&e.timeStamp<game.k0)) return; if(e.target.closest&&e.target.closest('input,textarea,a')) return;
  if(e.code==='Enter'||e.code==='Space'){ e.preventDefault(); if(e.repeat) return;
    if(F.phase==='aim'){ if(aim.want&&aim.kb) commit(aim.x,aim.y); else { if(!aim.want){ aim.x=F.cx; aim.y=F.cy; } aim.want=1; aim.kb=true; A.tick(); } }
    else if(F.phase==='feed') toMatch(); else if(F.phase==='reveal'&&D.next.classList.contains('on')) nextFix(); }
  else if(F.phase==='aim'&&/^(Arrow|Key[WASD]$)/.test(e.code)){ e.preventDefault(); if(!aim.want){ aim.x=F.cx; aim.y=F.cy; } aim.want=1; aim.kb=true; } });
D.next.addEventListener('click',nextFix);
D.box.addEventListener('click',()=>{ if(F&&F.phase==='feed') toMatch(); });
/* the title's side notes are stacked by the height they had when first laid out (station framework): on a new size, or once
   shown again after the sideways layout hid them, they are measured afresh, or they run into each other */
addEventListener('resize',()=>{ st.notes.forEach(n=>{ n._h=0; }); if(S.st===st) measure(); });

/* ---------- per frame ---------- */
const STEP={x:0,y:0};
st.update=function(dt,t){
  pump(game?3:6);
  const nar=NARROW(), f=F&&game?F:null;
  if(scan){ scan.t+=dt; U.uScan.value=-.05+scan.t/1.7*1.15; if(scan.t>=1.7){ endScan(); if(!game&&!pend&&!prepJob) prepJob=prepFix(1,[]); } }
  U.uDesc.value=damp(U.uDesc.value,f?.74:.52,2,dt); U.uOn.value=damp(U.uOn.value,f&&F.phase!=='done'?1:0,3,dt);
  if(f){
    if(F.phase==='feed'){ F.st+=dt; F.ft+=dt; if(F.st>=F.dur[F.stage]){ F.st=0; F.stage++; A.blip(); if(F.stage>=3) toMatch(); else { stageUI(F.stage); teleText(F,true); } } if(F.phase==='feed'){ drawFeed(F); teleText(F); } }
    if(F.phase==='aim'){ F.t+=dt; F.R=Math.min(RMAX,F.R+dt*3.2);
      if(aim.kb){ STEP.x=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0); STEP.y=(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);
        const sp=(keys.has('ShiftLeft')||keys.has('ShiftRight')?260:110)*dt; aim.x=clamp(aim.x+STEP.x*sp,0,MAP); aim.y=clamp(aim.y+STEP.y*sp,0,MAP); } }
    if(F.phase==='reveal'){ F.rt+=dt; const rt=F.rt;
      // the wave runs out from the guess until it has crossed the whole circle, however far outside it the guess was
      U.uWave.value.z=E.o(clamp(rt/1.05,0,1))*(Math.max(F.R*2.3,Math.hypot(F.px-F.cx,F.py-F.cy)+F.R+72)/MAP); U.uWave.value.w=1-sstep(.8,1.1,rt); latU.uLift.value=1.25*E.o(clamp(rt/1.2,0,1));
      if(rt>=.95&&!F.lock) lock();
      if(F.lock){ const k=clamp((rt-.95)/.5,0,1), ov=1+1.25*Math.pow(1-k,3)-.06*Math.sin(k*Math.PI); U.uFoot.value.set(F.x/MAP,F.y/MAP,FEED/2/MAP*ov,Math.min(1,k*3));
        U.uLock.value.z=E.o(clamp((rt-.95)/.9,0,1))*.09; U.uLock.value.w=1-clamp((rt-.95)/.9,0,1);
        const bk=clamp((rt-.95)/1.1,0,1); beam.material.uniforms.uOp.value=(1-bk)*(1-bk)*1.5; beam.scale.y=.6+2.8*E.o(clamp((rt-.95)/.35,0,1)); beam.visible=bk<1;
        if(rt>1.15&&!D.ln.classList.contains('on')){ vis(D.ln,true); }
        if(rt>1.55&&!D.next.classList.contains('on')){ vis(D.dist,true); vis(D.next,true); D.next.firstChild.textContent=F.r>=ROUNDS?'See results ':'Next fix '; }
        if(rt>1.55+5.5) nextFix(); } }
    if(F.phase==='out'){ F.ot+=dt; const k=1-E.io(clamp(F.ot/.45,0,1)); U.uHeat.value.w=k; U.uFoot.value.w=Math.min(U.uFoot.value.w,k); U.uLock.value.w=0; latU.uLift.value=1.25*k;
      if(F.ot>=.45) startFix(F.nx); }
    // score count-up
    if(game&&game.cnt<1){ game.cnt=Math.min(1,game.cnt+dt/.7); D.score.textContent=fmt(lerp(game.from,game.score,E.o(game.cnt))); }
    // search circle, its label, the uncertainty readout
    F.shownR=damp(F.shownR,F.phase==='out'?0:F.R,F.phase==='out'?9:6,dt); U.uCirc.value.set(F.cx/MAP,F.cy/MAP,F.shownR/MAP);
    const um=Math.round(F.R*MPX/2)*2; if(um!==F.um){ F.um=um; const s='± '+um+' m'; D.unc.textContent=s; D.ring.textContent=s; }
    if(F.phase==='aim'){ m2s(F.cx,F.cy-F.shownR,.02,SP); at(D.ring,SP.x,SP.y); }
    if(F.spoof&&F.phase!=='done'){ if(F.phase!=='reveal') spoofAt(F,_sp); else { _sp[0]=F.sx; _sp[1]=F.sy; } m2s(_sp[0],_sp[1],.02,SP); at(D.gnss,SP.x,SP.y); }
    // aim square
    aim.on=damp(aim.on,aim.want&&F.phase==='aim'?1:0,10,dt); U.uHover.value.set(aim.x/MAP,aim.y/MAP,FEED/2/MAP,aim.on);
    if(F.phase==='reveal'){ m2s(F.px,F.py,.02,SP); at(D.clk,SP.x,SP.y);
      if(F.lock){ m2s(F.x,F.y,.02,SP2); at(D.tru,SP2.x,SP2.y); const k=E.io(clamp((F.rt-1.15)/.4,0,1)), dx=SP2.x-SP.x, dy=SP2.y-SP.y, L=Math.hypot(dx,dy);
        at(D.ln,SP.x,SP.y,` rotate(${Math.atan2(dy,dx).toFixed(4)}rad) scaleX(${(L*k).toFixed(1)})`);
        const ux=L>6?dx/L:1, uy=L>6?dy/L:0, lf=ux<0; if(lf!==F.lf){ F.lf=lf; D.tru.classList.toggle('l',lf); }
        at(D.dist,clamp(SP.x-ux*26,ux>0?110:16,innerWidth-(ux>0?16:110)),clamp(SP.y-uy*26,80,innerHeight-120),ux>0?' translate(-100%,-50%)':' translate(0,-50%)'); } }
    // camera: frame the search circle, north up, then lean toward the answer
    const el_=lay.stack?1.2:1.08, th=Math.tan(stCam.fov*Math.PI/360), rw=RMAX*PW/MAP*1.04, d=2*rw*innerHeight/(2*th*lay.d), wpp=2*d*th/innerHeight;
    let lx=m2w(F.cx)-(lay.cx-innerWidth/2)*wpp, lz=m2w(F.cy)-(lay.cy-innerHeight/2)*wpp/Math.sin(el_);
    if(F.lock){ const k=E.io(clamp((F.rt-.95)/1.4,0,1))*.22; lx+=(m2w(F.x)-m2w(F.cx))*k; lz+=(m2w(F.y)-m2w(F.cy))*k; }
    const dd=F.lock?d*(1-.06*E.io(clamp((F.rt-.95)/1.4,0,1))):d;
    st.camL.set(lx,0,lz); st.camP.set(lx,dd*Math.sin(el_),lz+dd*Math.cos(el_));
    // drone and its camera
    if(F.phase==='reveal'&&F.lock) frustum(true,F.x,F.y,dt); else frustum(false,0,0,dt);
  } else {
    // title: a slow cinematic orbit over the map, the drone surveying with its camera
    U.uOn.value=damp(U.uOn.value,0,3,dt); U.uHover.value.w=0; U.uHeat.value.w=damp(U.uHeat.value.w,0,3,dt); U.uFoot.value.w=damp(U.uFoot.value.w,0,3,dt); U.uLock.value.w=damp(U.uLock.value.w,0,3,dt);
    if(beam.visible){ beam.material.uniforms.uOp.value=damp(beam.material.uniforms.uOp.value,0,3,dt); if(beam.material.uniforms.uOp.value<.01) beam.visible=false; }
    if(st.state==='menu') menuLoiter();
    const a=t*.045;
    if(nar){ st.camP.set(Math.sin(a)*1.2,12.5,9.5); st.camL.set(0,0,.9); }
    else { st.camP.set(1.4+Math.sin(a)*.9,7.4,6.8+Math.cos(a)*.4); st.camL.set(-1.2,0,.25); }
    const nx=(drone.p.x/PW+.5)*MAP, nz=(drone.p.z/PW+.5)*MAP; frustum(st.state==='menu',nx,nz,dt);
    if(st.state==='menu'){ st.anchors[0].copy(drone.p); notesUpdate(st); }
  }
  droneUpdate(dt,t); burst.update(dt,1.2,1.4); lat.visible=mesh.visible=U.uHeat.value.w>.002;
  if(!f) U.uWave.value.w=0;
};
st._dbg={steps:STEPS,end:()=>{ if(F&&game){ F.phase='reveal'; F.lock=true; F.r=ROUNDS; nextFix(); } },spoof:()=>F&&F.spoof?spoofAt(F,[0,0]):null,get F(){return F;},get game(){return game;},get pend(){return pend;},get jobs(){return {map:!!mapJob,prep:!!prepJob,scan:!!scan};},pick,m2s:(x,y)=>{ m2s(x,y,.02,SP); return {x:SP.x,y:SP.y}; },commit,toMatch,nextFix,lay,
  heat:()=>{ const H=HEAT[F.slot]; let pk=-9,pi=0; for(let k=0;k<GN*GN;k++) if(H[k]>pk){pk=H[k];pi=k;} return {peakNode:[pi%GN,(pi/GN)|0],truthNode:[F.ti,F.tj],tv:F.tv,second:F.second,ok:F.ok}; }};
})();

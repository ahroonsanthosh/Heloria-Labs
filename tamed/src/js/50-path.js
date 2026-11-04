/* ================= THE WALK =================
   One path through one place. s runs from 0 (Home) to 6 (Contact); the scroll moves along it.
   Each scene has its own camera track; through a doorway both play at once and the composite blends them. */
const K=(s,p,t,f)=>({s,p,t,f});
const TRACK={
  out:[ /* across the water on the stepping stones, up the steps, into the portal */
    K(0,   [21,1.5,94],[1.6,5.2,3],29),
    K(.12, [14.6,1.52,71],[1.2,4.5,2],32),
    K(.26, [7.6,1.58,47],[.6,3.5,2],36),
    K(.38, [2.2,1.66,27],[0,3,4],40),
    K(.46, [.2,1.76,15.4],[0,2.9,0],44),
    K(.5,  [0,2.3,12.2],[0,2.9,-4],46),
    K(.54, [0,2.8,9.4],[0,2.85,-6],47),
    K(.6,  [0,2.85,5.6],[0,2.7,-8],50)],
  out2:[ /* out of the gallery through the far arch and along the pool to the three of us, who rise out of the water as you
           come. Then back the way you came, still looking at us, the courtyard framed in the arch, and only once you are out
           on the steps the turn to the sunset over the lake: never a blank wall */
    K(4.4, [-9.4,1.72,-10.1],[8,1.5,-10.2],50),
    K(4.5, [-8.2,1.7,-10.15],[8,1.45,-10.2],46),
    K(4.75,[-5.8,1.6,-10.2],[8,1.32,-10.2],42),
    K(5,   [-4.4,1.5,-10.2],[8,1.0,-10.2],41),
    K(5.18,[-7.4,1.62,-10.2],[8,1.25,-10.2],43),
    K(5.34,[-11.5,1.72,-10.2],[8,1.45,-10.2],46),
    K(5.44,[-14.4,1.68,-10.25],[8,1.6,-12],47),
    K(5.56,[-16.2,1.6,-10.4],[-17,1.9,-40],48),
    K(5.7, [-17.8,1.53,-10.15],[-60,3.4,-10.4],45),
    K(5.84,[-20.4,1.48,-9.95],[-110,6.2,-11],43),
    K(6,   [-24.5,1.42,-9.7],[-200,9.2,-11.5],42),
    K(6.5, [-30,1.42,-9.7],[-200,10,-11.5],42)],
};
/* in portrait the camera stands further back with a wider lens, and walks past the three of us one by one */
const TRACK_P={
  out:{0:K(0,[3.4,1.5,80],[.6,4.1,2],52), .12:K(.12,[2.8,1.55,61],[.5,3.6,1],52), .26:K(.26,[2.2,1.6,43],[.3,3.1,2],52)},
  out2:{5:K(5,[1.2,1.45,-10.2],[7.6,1.2,-10.2],46), 5.18:K(5.18,[-3,1.55,-9.1],[7.6,1.3,-8.4],50), 6:K(6,[-24.5,1.42,-9.7],[-200,12,-11.5],56), 6.5:K(6.5,[-30,1.42,-9.7],[-200,12,-11.5],56)},
  outAdd:[K(4.86,[1.2,1.45,-14.4],[7.6,1.2,-14.4],46), K(5.14,[1.2,1.45,-6],[7.6,1.2,-6],46)],
};
/* the gallery's track is made from the rooms, in the order you walk through them: in through the middle of each doorway,
   up to the room, then to where it is best seen. Each room's two poses are given from its own centre (x, y, z from zc;
   the target likewise; the lens), and a phone held upright stands further back with a wider lens */
const VIEW={
  aetos: {a:[[0,1.68,8.5],[0,3.8,1.4],46], v:[[0,1.38,4.5],[0,7.5,-.7],56], vp:[[0,1.36,5],[0,7.5,-.8],70], d:3.8},
  pharos:{a:[[-.4,1.65,7.3],[.15,1.6,.3],45], v:[[-1.75,1.62,6.4],[.25,1.55,0],44], vp:[[-1.65,1.62,6.5],[.25,1.55,0],62], d:2},
  ogive: {a:[[.35,1.6,7.3],[0,3,0],48], v:[[1.25,1.5,6.7],[0,3.1,0],50], vp:[[1.1,1.5,6.7],[0,3.25,0],64], d:2.7},
  krios: {a:[[-.3,1.66,7.8],[1.6,1.95,-.5],48], v:[[-1.2,1.62,5.4],[.9,2.05,-.6],46], vp:[[-.8,1.62,6.8],[1.78,.85,-.6],62], d:1.9},
};
function galTrack(port){
  const L=[K(.4,[0,1.72,3.6],[0,1.8,-8],48), K(.5,[0,1.72,.8],[0,1.76,-10],46), K(.72,[0,1.7,-5],[0,1.9,-14],42)];
  PROJ.forEach((p,k)=>{ const zc=roomZ(k), V=VIEW[p.id], at=(o,z)=>[o[0],o[1],z+o[2]], vw=port?V.vp:V.v;
    if(k>0) L.push(K(k+.45,[0,1.68,wallZ(k)-.6],[0,V.d,zc+1.5],46));   // through the middle of the doorway
    L.push(K(k===0?.86:k+.64,at(V.a[0],zc),at(V.a[1],zc),V.a[2]));
    L.push(K(k+1,at(vw[0],zc),at(vw[1],zc),vw[2])); });
  /* and out: past the last room to the far arch, and into the courtyard's light */
  L.push(K(4.3,[.2,1.7,-72.2],[0,2.2,-82],46), K(4.5,[0,1.72,-76.6],[0,1.9,-84],46), K(4.6,[0,1.72,-78.8],[0,1.9,-86],48));
  return L;
}
function tracksFor(port){
  const out={gal:galTrack(port)};
  for(const k of ['out','out2']){
    let L=TRACK[k].map(x=>({...x}));
    if(port){ const o=TRACK_P[k]; L=L.map(x=>o[x.s]?{...o[x.s]}:x); if(k==='out2') L=L.concat(TRACK_P.outAdd.map(x=>({...x}))).sort((a,b)=>a.s-b.s); }
    out[k]=L;
  }
  return out;
}
let TR=tracksFor(false);
/* the stops the scroll settles on */
let STOPS=[0,1,2,3,4,5,6];
function setLayout(){ const p=portrait(); TR=tracksFor(p); STOPS=p?[0,1,2,3,4,4.86,5,5.14,6]:[0,1,2,3,4,5,6]; }

/* C1 interpolation through unevenly spaced keys (Catmull-Rom tangents, Hermite basis) */
function trackEval(keys,s,outP,outT){
  let i=0; const n=keys.length;
  if(s<=keys[0].s) i=0; else if(s>=keys[n-1].s) i=n-2; else { while(i<n-2&&s>keys[i+1].s) i++; }
  const a=keys[i], b=keys[i+1], h=b.s-a.s, u=clamp((s-a.s)/h,0,1);
  const pa=keys[Math.max(0,i-1)], pb=keys[Math.min(n-1,i+2)];
  const h00=2*u*u*u-3*u*u+1, h10=u*u*u-2*u*u+u, h01=-2*u*u*u+3*u*u, h11=u*u*u-u*u;
  const tan=(k0,k1,get,j)=>(get(k1)[j]-get(k0)[j])/Math.max(1e-4,k1.s-k0.s);
  const go=(get,out)=>{ for(let j=0;j<3;j++){ const m0=tan(pa===a?a:pa,pa===a?b:b,get,j), m1=tan(a,pb===b?b:pb,get,j);
      out.setComponent(j,h00*get(a)[j]+h10*h*m0+h01*get(b)[j]+h11*h*m1); } };
  go(k=>k.p,outP); go(k=>k.t,outT);
  return lerp(a.f,b.f,u*u*(3-2*u));
}
/* virtual scroll position v (in stops) to path position s: linger at each stop, move between them */
/* between two stops the walk eases in and out. Where a doorway lies between them it eases through that too, so you cross
   a threshold at a walk and see the room open up, never in a blur: the stop's ease, mixed with one that comes almost to a
   stand in the doorway (five times slower there than it was) */
function warp(v){
  const n=STOPS.length; v=clamp(v,0,n-1); const i=Math.min(n-2,Math.floor(v)), f=v-i, a=STOPS[i], b=STOPS[i+1];
  let e=f-.5*Math.sin(TAU*f)/TAU;
  const d=[DOOR_IN,DOOR_OUT].find(x=>x>a+.05&&x<b-.05);
  if(d!==undefined){ const fd=(d-a)/(b-a), E=x=>x-Math.sin(TAU*x)/TAU, held=f<fd?fd*E(f/fd):fd+(1-fd)*E((f-fd)/(1-fd)); e=lerp(e,held,.8); }
  return lerp(a,b,e);
}
function stopOf(s){ let best=0,d=1e9; STOPS.forEach((x,i)=>{ const dd=Math.abs(x-s); if(dd<d){ d=dd; best=i; } }); return best; }
/* which scene is on screen, and how far through a doorway blend */
function sceneMix(s){
  if(s<DOOR_IN-BLEND) return {a:'out',b:null,k:0};
  if(s<=DOOR_IN+BLEND) return {a:'out',b:'gal',k:sstep(DOOR_IN-BLEND,DOOR_IN+BLEND,s)};
  if(s<DOOR_OUT-BLEND) return {a:'gal',b:null,k:0};
  if(s<=DOOR_OUT+BLEND) return {a:'gal',b:'out',k:sstep(DOOR_OUT-BLEND,DOOR_OUT+BLEND,s)};
  return {a:'out',b:null,k:0};
}
/* the world's colour: each room tints everything with its project's light as you arrive */
const TINT=new T.Color(1,1,1), _tc=PROJ.map(p=>col(p.col)), _warm=col('#FFF6EA');
function tintAt(s,out){
  if(s<.55||s>4.45){ out.copy(_warm); return out; }
  const f=clamp(s-1,0,3), k=Math.min(2,Math.floor(f)), t=sstep(.3,.7,f-k);
  out.copy(_tc[k]).lerp(_tc[k+1],f>=3?1:t);
  if(s<1) out.copy(_warm).lerp(_tc[0],sstep(.55,.9,s));
  if(s>4) out.lerp(_warm,sstep(4.1,4.45,s));
  return out;
}
/* where the place says you are */
function placeAt(s){ let best=PLACES[0],d=1e9; for(const p of PLACES){ const dd=Math.abs(p.s-s); if(dd<d){ d=dd; best=p; } } return best; }

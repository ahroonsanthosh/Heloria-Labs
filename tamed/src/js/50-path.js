/* ================= THE WALK =================
   One path through one place. s runs from 0 (Home) to 6 (Contact); the scroll moves along it.
   Each scene has its own camera track; through a doorway both play at once and the composite blends them. */
const K=(s,p,t,f)=>({s,p,t,f});
const TRACK={
  out:[ /* across the water to the front door */
    K(0,   [-5.4,1.48,100],[1.2,-.2,0],29),
    K(.12, [-4.7,1.52,76],[.8,.4,0],32),
    K(.26, [-3,1.58,48],[.3,1.4,2],36),
    K(.38, [-1,1.66,26],[0,2.4,4],40),
    K(.46, [-.1,1.72,13.8],[0,2.3,0],44),
    K(.52, [0,1.74,8.6],[0,2.1,-4],47),
    K(.6,  [0,1.76,5.3],[0,1.9,-8],50)],
  out2:[ /* out of the gallery into the courtyard, then through the far arch onto the water */
    K(4.4, [0,1.72,1.6],[0,1.5,-12],50),
    K(4.5, [0,1.68,-.3],[0,1.4,-13],46),
    K(4.75,[.1,1.6,-2.8],[0,1.2,-15.3],42),
    K(5,   [0,1.56,-5.3],[0,1.06,-15.3],40),
    K(5.28,[-3.5,1.6,-7.6],[-16,1.8,-9.4],44),
    K(5.55,[-9.4,1.62,-8.6],[-26,2,-8.9],46),
    K(5.76,[-13.8,1.6,-8.55],[-40,2.6,-8.8],46),
    K(6,   [-24.5,1.42,-8.1],[-200,9.2,-9.5],42),
    K(6.5, [-30,1.42,-8.1],[-200,10,-9.5],42)],
  gal:[
    K(.4,  [0,1.72,3.6],[0,1.8,-8],48),
    K(.5,  [0,1.72,.8],[0,1.76,-10],46),
    K(.72, [0,1.7,-5],[.3,1.5,-14],42),
    K(1,   [1.75,1.58,-8.5],[-.15,.95,-15.2],38),
    K(1.3, [.6,1.7,-17.4],[0,2.7,-28],42),
    K(1.55,[0,1.68,-23.9],[0,3.8,-31],46),
    K(2,   [0,1.38,-27.9],[0,7.5,-33.1],56),
    K(2.45,[0,1.68,-40.9],[0,2,-48],46),
    K(3,   [-1.75,1.62,-42.7],[.25,1.55,-49.6],44),
    K(3.45,[0,1.68,-58.2],[0,2.7,-64],46),
    K(4,   [1.25,1.5,-59.4],[0,4.5,-66.8],50),
    K(4.3, [.2,1.7,-72.2],[0,2.2,-82],46),
    K(4.5, [0,1.72,-76.6],[0,1.9,-84],46),
    K(4.6, [0,1.72,-78.8],[0,1.9,-86],48)],
};
/* in portrait the camera stands further back with a wider lens, and walks past the three of us one by one */
const TRACK_P={
  out:{0:K(0,[-2.4,1.52,72],[0,3.2,0],52), .12:K(.12,[-2.2,1.55,56],[0,2.6,0],52), .26:K(.26,[-1.8,1.6,40],[0,2.3,2],52)},
  out2:{5:K(5,[0,1.5,-8.8],[0,1.02,-15.35],46), 6:K(6,[-24.5,1.42,-8.1],[-200,12,-9.5],56), 6.5:K(6.5,[-30,1.42,-8.1],[-200,12,-9.5],56)},
  outAdd:[K(4.86,[-2.75,1.5,-8.6],[-2.75,1.0,-15.1],46), K(5.14,[2.75,1.5,-8.6],[2.75,1.0,-15.1],46)],
  gal:{1:K(1,[2.4,1.62,-6.9],[-.2,.95,-15.2],56), 2:K(2,[0,1.36,-27.4],[0,7.5,-33.2],70), 3:K(3,[-2.1,1.62,-41.2],[.25,1.55,-49.6],60), 4:K(4,[1.3,1.5,-58.6],[0,4.8,-66.8],64)},
};
function tracksFor(port){
  const out={};
  for(const k of ['out','out2','gal']){
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
function warp(v){
  const n=STOPS.length; v=clamp(v,0,n-1); const i=Math.min(n-2,Math.floor(v)), f=v-i;
  const e=f-.5*Math.sin(TAU*f)/TAU;
  return lerp(STOPS[i],STOPS[i+1],e);
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

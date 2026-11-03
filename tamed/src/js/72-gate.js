/* ================= THE GATE: LAND, BEFORE YOU CHOOSE IT =================
   A bright drawn sky over the curve of a small planet, a few houses and trees on it, and the rocket coming down onto its
   pad, in the flat colours and ink lines of the world Land takes you to. Drawn only while it is being shown. */
const LANDV=(()=>{
  const cv=$('#gateLand'), x=cv.getContext('2d');
  const INK='#2A241D';
  let on=false, run=false, t0=0, last=0, fade=0, w=0, h=0, dpr=1;
  const CLOUDS=[[.1,.13,1],[.6,.08,.8],[.88,.16,.7],[.34,.05,.55]];   // high in the sky, clear of the words
  const size=()=>{ dpr=Math.min(2,devicePixelRatio||1); w=innerWidth; h=innerHeight; const W2=Math.round(w*dpr), H2=Math.round(h*dpr);
    if(cv.width!==W2||cv.height!==H2){ cv.width=W2; cv.height=H2; } };
  const cloud=(cx,cy,k)=>{ x.save(); x.translate(cx,cy); x.scale(k,k);
    const blobs=[[-46,6,26],[-16,-8,34],[20,-2,30],[50,8,22],[4,12,30]];
    x.fillStyle='#FFFFFF'; x.beginPath(); for(const [bx,by,r] of blobs){ x.moveTo(bx+r,by); x.arc(bx,by,r,0,TAU); } x.fill();
    x.fillStyle='rgba(205,226,238,.55)'; x.beginPath(); x.ellipse(2,22,70,9,0,0,TAU); x.fill(); x.restore(); };
  /* something standing on the planet at x along its top: turned so it stands upright on the curve */
  const stand=(P,px,fn)=>{ const dx=px-P.cx, y=P.cy-Math.sqrt(Math.max(0,P.R*P.R-dx*dx)); x.save(); x.translate(px,y); x.rotate(Math.asin(clamp(dx/P.R,-1,1))); fn(); x.restore(); return y; };
  const house=(s,roof)=>{ x.lineWidth=2.4; x.strokeStyle=INK; x.lineJoin='round';
    x.fillStyle='#F7F0E3'; x.beginPath(); x.rect(-s*.5,-s*.78,s,s*.8); x.fill(); x.stroke();
    x.fillStyle=roof; x.beginPath(); x.moveTo(-s*.66,-s*.74); x.lineTo(0,-s*1.28); x.lineTo(s*.66,-s*.74); x.closePath(); x.fill(); x.stroke();
    x.fillStyle='#6B5644'; x.beginPath(); x.rect(-s*.12,-s*.36,s*.24,s*.38); x.fill(); x.stroke();
    x.fillStyle='#9FD2EC'; x.beginPath(); x.rect(s*.18,-s*.62,s*.2,s*.18); x.fill(); x.stroke(); };
  const tree=s=>{ x.lineWidth=2.4; x.strokeStyle=INK; x.lineJoin='round';
    x.fillStyle='#7A5A3E'; x.beginPath(); x.rect(-s*.07,-s*.5,s*.14,s*.52); x.fill(); x.stroke();
    x.fillStyle='#5DA55A'; x.beginPath(); x.arc(0,-s*.78,s*.42,0,TAU); x.fill(); x.stroke();
    x.fillStyle='rgba(150,210,120,.8)'; x.beginPath(); x.arc(-s*.13,-s*.9,s*.16,0,TAU); x.fill(); };
  /* the rocket, base at the origin, with its landing burn under it */
  const rocket=(rh,burn,t)=>{ const rw=rh*.27; x.lineWidth=2.6; x.strokeStyle=INK; x.lineJoin='round'; x.lineCap='round';
    if(burn>0){ const fl=rh*(.22+.5*burn)*(.88+.12*Math.sin(t*41)+.06*Math.sin(t*67));
      x.fillStyle='#FF9442'; x.beginPath(); x.moveTo(-rw*.36,0); x.quadraticCurveTo(0,fl*1.15,rw*.36,0); x.closePath(); x.fill();
      x.fillStyle='#FFE48F'; x.beginPath(); x.moveTo(-rw*.2,0); x.quadraticCurveTo(0,fl*.7,rw*.2,0); x.closePath(); x.fill(); }
    x.fillStyle='#F2B98D'; for(const sd of [-1,1]){ x.beginPath(); x.moveTo(sd*rw*.5,-rh*.1); x.lineTo(sd*rw*.95,rh*.01); x.lineTo(sd*rw*.95,-rh*.08); x.lineTo(sd*rw*.5,-rh*.36); x.closePath(); x.fill(); x.stroke(); }
    x.fillStyle='#3B3633'; x.beginPath(); x.rect(-rw*.3,-rh*.06,rw*.6,rh*.06); x.fill(); x.stroke();
    x.fillStyle='#F4EFE6'; x.beginPath(); x.moveTo(-rw*.5,-rh*.06); x.lineTo(-rw*.5,-rh*.68); x.quadraticCurveTo(-rw*.46,-rh*.92,0,-rh); x.quadraticCurveTo(rw*.46,-rh*.92,rw*.5,-rh*.68); x.lineTo(rw*.5,-rh*.06); x.closePath(); x.fill(); x.stroke();
    x.fillStyle='#EF8A3C'; x.beginPath(); x.rect(-rw*.5,-rh*.5,rw,rh*.07); x.fill(); x.stroke();
    x.fillStyle='#2F3336'; x.beginPath(); x.arc(0,-rh*.72,rw*.17,0,TAU); x.fill(); x.stroke(); };
  const D=3.4;   // seconds from the top of the sky to the pad
  function draw(now){
    const t=(now-t0)/1000; size(); x.setTransform(dpr,0,0,dpr,0,0);
    const port=w/h<.82, P={R:Math.max(w,h)*1.9}; P.cx=w*.5; P.cy=h*(port?.84:.81)+P.R;
    /* the sky, its sun, its clouds */
    const sky=x.createLinearGradient(0,0,0,h); sky.addColorStop(0,'#86C4E6'); sky.addColorStop(.5,'#BBDFEF'); sky.addColorStop(.82,'#E9F4EF'); x.fillStyle=sky; x.fillRect(0,0,w,h);
    const sg=x.createRadialGradient(w*.16,h*.18,0,w*.16,h*.18,h*.32); sg.addColorStop(0,'rgba(255,251,226,.85)'); sg.addColorStop(1,'rgba(255,251,226,0)'); x.fillStyle=sg; x.fillRect(0,0,w,h);
    const drift=(now/1000)*6;
    const ck=Math.min(w,h)/900*1.5; for(const [cx,cy,k] of CLOUDS){ const px=((cx*w+drift*k)%(w+260))-130; cloud(px,cy*h,k*ck); }
    /* the planet: grass over its curve, a lit edge, an ink line */
    x.fillStyle='#97CF74'; x.beginPath(); x.arc(P.cx,P.cy,P.R,0,TAU); x.fill();
    x.fillStyle='#86C266'; x.beginPath(); x.arc(P.cx,P.cy,P.R-h*.045,0,TAU); x.fill();
    x.strokeStyle='rgba(190,232,150,.9)'; x.lineWidth=5; x.beginPath(); x.arc(P.cx,P.cy,P.R-5,Math.PI*1.25,Math.PI*1.75); x.stroke();
    x.strokeStyle=INK; x.lineWidth=3; x.beginPath(); x.arc(P.cx,P.cy,P.R,Math.PI*1.2,Math.PI*1.8); x.stroke();
    /* the town on it, kept clear of the words and of the pad */
    const s=h*(port?.05:.06), rx=w*(port?.86:.8);
    const things=[[.06,'t',1],[.11,'h','#5C82B8'],[.17,'t',.85],[.23,'h','#C77B62'],[.3,'t',1.1],[.48,'t',.8],[.56,'h','#E59A4C'],[.68,'t',.9],[.92,'h','#7E6DB0'],[.97,'t',1]];
    let lastX=-1e9; for(const [fx,k,v] of things){ const px=fx*w; if(Math.abs(px-rx)<s*1.7||px-lastX<s*1.45) continue; lastX=px; stand(P,px,()=>k==='t'?tree(s*1.05*v):house(s,v)); }
    /* the pad, and the rocket coming down to it, slowing, its burn dying away as it touches down */
    const padY=stand(P,rx,()=>{ x.lineWidth=2.4; x.strokeStyle=INK; x.fillStyle='#C9C4B8'; x.beginPath(); x.rect(-s*.95,-s*.16,s*1.9,s*.18); x.fill(); x.stroke(); });
    const rh=h*(port?.12:.15), u=RM?1:clamp(t/D,0,1), e=1-Math.pow(1-u,2.4);
    const ry=lerp(-rh*.35,padY-s*.16,e), burn=u<1?.35+.65*(1-u):0;
    x.save(); x.translate(rx,ry); x.rotate(Math.asin(clamp((rx-P.cx)/P.R,-1,1))*e); rocket(rh,burn,now/1000); x.restore();
    /* the dust it throws up when it lands */
    const pu=RM?0:(t-D)/1.2;
    if(pu>0&&pu<1){ x.fillStyle=`rgba(255,255,255,${(.85*(1-pu)).toFixed(3)})`; x.strokeStyle=`rgba(42,36,29,${(.5*(1-pu)).toFixed(3)})`; x.lineWidth=2;
      for(const [dx,r] of [[-1.3,.42],[-.6,.55],[.6,.55],[1.3,.42]]){ x.beginPath(); x.arc(rx+dx*s*(.6+pu),padY-s*.2-pu*s*.3,s*r*(.6+pu*.8),0,TAU); x.fill(); x.stroke(); } }
  }
  function loop(now){ if(!run) return; draw(now); fade=on?1:fade-(now-last)/1000; last=now;
    if(!on&&fade<=0){ run=false; return; } requestAnimationFrame(loop); }
  addEventListener('resize',()=>{ if(run) size(); });
  return { show(v){ if(v===on) return; on=v; if(v){ t0=performance.now(); fade=1; if(!run){ run=true; last=t0; requestAnimationFrame(loop); } } else fade=1.1; },
    get t(){ return on?(performance.now()-t0)/1000:-1; } };
})();

/* ================= THE PAGE OVER THE PLACE ================= */
const UI={};
const INK=col('#2B2520'), LIGHT=col('#FFF8EE'), _fg=new T.Color();
outLinks(document);
/* headlines are split into words: they rise in one by one, and the water reflects each word where it stands */
$$('.split').forEach(el=>{ const txt=el.textContent.trim(); el.setAttribute('aria-label',txt); el.textContent='';
  txt.split(' ').forEach((w,i,a)=>{ const s=document.createElement('span'); s.className='w'; s.setAttribute('aria-hidden','true'); s.style.setProperty('--i',i); s.textContent=w; el.appendChild(s); if(i<a.length-1) el.appendChild(document.createTextNode(' ')); }); });

/* ---------- gate ---------- */
const gate=$('#gate'), ui=$('#ui');
UI.loadStep=(k)=>{ const ls=$$('#word span'); const n=Math.round(clamp(k,0,1)*ls.length); ls.forEach((l,i)=>l.classList.toggle('in',i<n)); };
UI.gateReady=()=>{ holeK=null; gate.classList.remove('loading'); gate.classList.add('ready'); $('#tamed').disabled=false; gateFoot(); };
/* the three ways in. Pointing at one (or focusing it) shows its world behind the letters, with its sound: Walk, the
   walk's own evening through a thinning mist; Land, a bright drawn sky over a small town with a rocket coming down; Fly,
   the dark coming in round a black hole. On a touch screen, with nothing to point with, the gate shows them in turn */
S.gateHover=null;
const WAYS=$$('#gate .way[data-way]'), OLD={tamed:'walk',untamed:'fly'};
const setHover=(v,quiet)=>{ v=OLD[v]||v||null; if(S.gateHover===v) return; S.gateHover=v;
  ['walk','land','fly'].forEach(w=>gate.classList.toggle(w,v===w)); WAYS.forEach(w=>w.classList.toggle('on',w.dataset.way===v));
  if(v){ if(!quiet) A.hover(); A.preview(v); if(A.on) S.prevAt=performance.now(); } };
/* the line at the foot: how to look and how to go */
function gateFoot(){ $('#gateState').textContent=FINE?'Point or scroll to look, click to go':'Swipe to look, tap to go'; }
WAYS.forEach(w=>{ const v=w.dataset.way;
  w.addEventListener('pointerenter',e=>{ if(e.pointerType==='mouse'||e.pointerType==='pen'){ CYC.off=true; setHover(v); } });
  w.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse'||e.pointerType==='pen') setHover(null); });
  w.addEventListener('focus',()=>{ CYC.off=true; setHover(v); }); w.addEventListener('blur',()=>{ if(!S.leaving) setHover(null); }); });
$('#tamed').addEventListener('click',()=>enter());
/* a browser lets sound start only from a click, a tap or a key; pointing and a mouse wheel are not enough. So the sound
   wakes on the first of those it allows (on a phone the first swipe between the ways, on a desktop the arrow keys or any
   click), and the way being shown is heard at once */
S.prevAt=0;
const gateWake=()=>{ if(S.mode!=='gate'||(A.on&&A.ctx&&A.ctx.state==='running')) return;
  (A.on?A.ctx.resume():A.start()).then(()=>{ if(S.mode==='gate'&&!S.leaving&&S.gateHover&&performance.now()-S.prevAt>400){ A.preview(S.gateHover); S.prevAt=performance.now(); } }).catch(()=>{}); };
['pointerdown','pointerup','touchend','keydown'].forEach(ev=>addEventListener(ev,gateWake,{capture:true,passive:true}));
/* Land and Fly leave the walk. On this site the gate goes over to that world's light first, so the change of page is not a
   cut; when they live somewhere else they open in a tab of their own */
const leaveTo=(a,v)=>a.addEventListener('click',e=>{ if(S.mode!=='gate'||S.leaving){ e.preventDefault(); return; } A.click();
  if(!sameSite(a.getAttribute('href')||'')) return;
  e.preventDefault(); S.leaving=true; CYC.off=true; setHover(v,true); gate.style.setProperty('--out',v==='land'?'#EAF4F4':'#030305');
  gate.classList.add('leaving'); A.leave(v); setTimeout(()=>location.assign(a.href),RM?120:820); });
leaveTo($('#land'),'land'); leaveTo($('#untamed'),'fly');
/* where the Fly way's black hole sits: behind the middle of the word, about as big as the letters are tall */
let holeK=null; addEventListener('resize',()=>{ holeK=null; });
UI.holeAt=()=>{ if(!holeK){ const r=$('#word').getBoundingClientRect(); holeK=[(r.left+r.width/2)/innerWidth,1-(r.top+r.height/2)/innerHeight,clamp(r.height*.62/innerHeight,.05,.11)]; } return holeK; };
/* on a touch screen: Walk, Land and Fly in turn, slowly, each with its name lit, then a breath of the plain gate */
const CYC={off:FINE,i:-1,t:1.2};
UI.gateTick=dt=>{ if(CYC.off||S.mode!=='gate'||S.leaving||!gate.classList.contains('ready')) return; CYC.t-=dt;
  if(CYC.t<=0){ CYC.i=(CYC.i+1)%4; CYC.t=CYC.i===3?2.2:(CYC.i===1?4.6:3.8); setHover(['walk','land','fly',null][CYC.i],true); } };

/* scroll moves between the three ways, one way per gesture, showing each one's world as it comes; so do a swipe on a
   phone and the arrow keys. A click, a tap or Enter goes. (A trackpad goes on sending fading wheel events after the
   fingers lift, so a new gesture is a quiet gap or a clear rise in strength; the rest is ignored) */
const GW={last:0,peak:0,armed:true,acc:0}, ORDER=['walk','land','fly'];
const gateStep=d=>{ if(S.mode!=='gate'||S.leaving||!gate.classList.contains('ready')) return; CYC.off=true;
  const i=ORDER.indexOf(S.gateHover); setHover(ORDER[i<0?0:clamp(i+d,0,2)]); };
addEventListener('wheel',e=>{ if(S.mode!=='gate') return; e.preventDefault();
  const t=performance.now(), d=(Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.2?e.deltaX:e.deltaY)*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1), ad=Math.abs(d), gap=t-GW.last; GW.last=t;
  if(gap>220||ad>GW.peak*1.7+6){ GW.armed=true; GW.acc=0; }
  GW.peak=gap>220?ad:Math.max(ad,GW.peak*.92);
  if(!GW.armed) return; GW.acc+=d; if(Math.abs(GW.acc)>36){ gateStep(Math.sign(GW.acc)); GW.acc=0; GW.armed=false; } },{passive:false});
{ let t0=null; addEventListener('touchstart',e=>{ t0=S.mode==='gate'?[e.touches[0].clientX,e.touches[0].clientY]:null; },{passive:true});
  addEventListener('touchend',e=>{ if(S.mode!=='gate'||!t0) return; const c=e.changedTouches[0], dx=t0[0]-c.clientX, dy=t0[1]-c.clientY, d=Math.abs(dy)>Math.abs(dx)?dy:dx; t0=null;
    if(Math.abs(d)>34) gateStep(Math.sign(d)); },{passive:true}); }
addEventListener('keydown',e=>{ if(S.mode!=='gate'||S.leaving||!gate.classList.contains('ready')) return;
  if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){ e.preventDefault(); gateStep(1); }
  else if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){ e.preventDefault(); gateStep(-1); }
  else if(e.key==='Enter'&&S.gateHover&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#gate .way'))){ e.preventDefault(); $('#gate .way[data-way="'+S.gateHover+'"]').click(); } });

if(!FINE){ $('#cue span').textContent='Swipe up to begin'; $('#tamed .m').textContent='2 min · swipe'; }
/* ---------- menu and anything that names a place ---------- */
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-go]'); if(!a) return;
  if(a.closest('#index')) return;
  e.preventDefault(); if(S.mode==='gate') return; travel(a.dataset.go); A.click();
});
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,#index li'); if(!t||t._h) return; t._h=1; setTimeout(()=>t._h=0,160); if(S.mode!=='gate') A.hover(); });
/* a project's link goes straight to the project */
$$('.view').forEach(a=>a.addEventListener('click',e=>{ e.stopPropagation(); A.click(); }));

/* ---------- sections follow the walk ---------- */
const SECS=$$('.sec').map(el=>({el,p:placeById(el.dataset.place),on:false,vis:-1}));
/* standing at the start without scrolling: every few seconds the cue calls again and the walk leans a step forward and
   back, so you see that scrolling walks you in */
function cueCall(s,dt){
  if(S.mode!=='world'||UI._fs||RM||(TEST&&!window.__NUDGE)){ UI._idle=0; return; }
  if(SC.touch||SC.inertia||s>.02||now()-SC.lastIn<1){ UI._idle=Math.min(UI._idle||0,0); return; }
  UI._idle=(UI._idle||0)+dt;
  if(UI._idle>4.5){ UI._idle=-3.5; const c=$('#cue'); c.classList.remove('call'); void c.offsetWidth; c.classList.add('call');
    SC.glide=null; SC.pin=false; SC.target=.045; SC.lastIn=now(); SC.lastF=S.frame; }
}
UI.firstScroll=()=>{ if(!UI._fs){ UI._fs=1; $('#cue').classList.add('gone'); } };
UI.jumped=()=>{ TXT.dirty=true; };
let fgKey='';
UI.update=(s,dt)=>{
  for(const x of SECS){
    /* the team's words come early as you walk into the courtyard and go as you turn away from us */
    const d=Math.abs(s-x.p.s), w=x.p.id==='team'?(s<x.p.s?.24:.1):0;
    let vis=x.p.id==='home'?1-sstep(.035,.15,d):1-sstep(.09+w,.32+w,d); if(S.mode==='gate'||S.mode==='entering') vis=x.p.id==='home'&&S.mode==='entering'?S.enterK:0;
    if(Math.abs(vis-x.vis)>.002){ x.vis=vis; x.el.style.opacity=vis.toFixed(3); x.el.style.visibility=vis>.002?'visible':'hidden'; }
    const on=vis>.5; if(on!==x.on){ x.on=on; x.el.classList.toggle('in',on); if(on&&x.el.querySelector('[data-reflect]')){ TXT.dirty=true; setTimeout(()=>TXT.dirty=true,1800); } }
  }
  /* the ink of the page changes with the light: dark on the bright evening, pale indoors and after sunset */
  const k=sstep(.47,.6,s); _fg.copy(INK).lerp(LIGHT,k);
  const key=_fg.getHexString(); if(key!==fgKey){ fgKey=key; document.documentElement.style.setProperty('--fg','#'+key); document.documentElement.classList.toggle('lite',k>.5); }
  const pl=placeAt(s); if(pl!==UI._pl){ UI._pl=pl; $('#dialT').textContent=pl.name; $$('#menu a').forEach(a=>a.classList.toggle('on',(a.dataset.nav==='projects'&&pl.proj>=0)||a.dataset.nav===pl.id)); document.documentElement.style.setProperty('--accent',pl.tint); }
  $('#cue').classList.toggle('away',s>.12);
  cueCall(s,dt);
  dialUpdate(s);
  peopleUpdate(s,dt);
};

/* ---------- the sundial: its shadow is the progress, and it agrees with the sun ---------- */
const dsvg=$('#dial svg'), _sd=v3();
(()=>{ const tk=$('.ticks',dsvg); let h=''; for(let i=0;i<24;i++){ const a=i/24*TAU, r0=i%6===0?35:38.5, r1=41.5; h+=`<line x1="${(Math.cos(a)*r0).toFixed(2)}" y1="${(Math.sin(a)*r0).toFixed(2)}" x2="${(Math.cos(a)*r1).toFixed(2)}" y2="${(Math.sin(a)*r1).toFixed(2)}"/>`; } tk.innerHTML=h;
  const mk=$('.marks',dsvg); mk.innerHTML=PLACES.map((p,i)=>{ const a=dialAng(p.s); return `<circle data-i="${i}" cx="${(Math.cos(a)*29).toFixed(2)}" cy="${(Math.sin(a)*29).toFixed(2)}" r="1.9"/>`; }).join(''); })();
function dialAng(s){ const [el,az]=sunAt(s); sunDir(el,az,_sd); return Math.atan2(-_sd.z,-_sd.x); }
let dialLast=-1;
function dialUpdate(s){
  if(Math.abs(s-dialLast)<.0015) return; dialLast=s;
  const [el]=sunAt(s), a=dialAng(s), L=clamp(4.6/Math.tan(Math.max(el,.4)*DEG),13,40), op=sstep(-.6,2.6,el);
  const cx=Math.cos(a), sy=Math.sin(a), px=-sy, py=cx, w=3.4;
  $('.shadow',dsvg).setAttribute('d',`M${(px*w).toFixed(2)} ${(py*w).toFixed(2)} L${(cx*L).toFixed(2)} ${(sy*L).toFixed(2)} L${(-px*w).toFixed(2)} ${(-py*w).toFixed(2)} Z`);
  $('.shadow',dsvg).style.opacity=(.62*op).toFixed(3);
  const ga=a+Math.PI; $('.gnomon',dsvg).setAttribute('d',`M${(-Math.sin(ga)*2).toFixed(2)} ${(Math.cos(ga)*2).toFixed(2)} L${(Math.cos(ga)*11).toFixed(2)} ${(Math.sin(ga)*11).toFixed(2)} L${(Math.sin(ga)*2).toFixed(2)} ${(-Math.cos(ga)*2).toFixed(2)} Z`);
  const cur=PLACES.indexOf(placeAt(s)); $$('.marks circle',dsvg).forEach((c,i)=>c.classList.toggle('on',i===cur));
  $('#dial').style.setProperty('--dusk',(1-sstep(-1,4,el)).toFixed(3));
}
$('#dial').addEventListener('click',()=>{ A.click(); UI.indexOpen(true); });

/* ---------- press and hold: every place ---------- */
const IDX=$('#index'), ILI=$$('#index li'); let hot=-1;
UI.ring=(k,x,y)=>{ const r=$('#ring'); if(k<=0){ r.classList.remove('on'); return; } r.classList.add('on'); r.style.transform=`translate(${x}px,${y}px)`; r.style.setProperty('--k',k.toFixed(3)); };
UI.indexOpen=(on)=>{
  if(on&&S.mode!=='world') return;
  HOLD.open=on; IDX.classList.toggle('on',on); IDX.setAttribute('aria-hidden',on?'false':'true'); document.documentElement.classList.toggle('indexed',on);
  if(on){ A.index(); const cur=PLACES.indexOf(placeAt(S.s)); ILI.forEach((l,i)=>l.classList.toggle('cur',i===cur)); hot=-1; ILI.forEach(l=>l.classList.remove('hot')); }
};
UI.indexHover=(x,y)=>{ let h=-1; ILI.forEach((l,i)=>{ const r=l.querySelector('.t').getBoundingClientRect(); if(y>=r.top-8&&y<=r.bottom+8&&x>=r.left-60&&x<=r.right+60) h=i; });
  if(h!==hot){ hot=h; ILI.forEach((l,i)=>l.classList.toggle('hot',i===h)); IDX.classList.toggle('has',h>=0); if(h>=0) A.tick(h); } };
UI.indexRelease=(x,y,held)=>{ UI.indexHover(x,y); if(hot>=0){ const id=ILI[hot].dataset.go; UI.indexOpen(false); A.pick(); travel(id); } };
ILI.forEach((l,i)=>{ l.addEventListener('click',e=>{ e.stopPropagation(); if(!HOLD.open) return; UI.indexOpen(false); A.pick(); travel(l.dataset.go); });
  l.addEventListener('pointerenter',()=>{ if(HOLD.open&&M.type!=='touch'){ hot=i; ILI.forEach((q,j)=>q.classList.toggle('hot',j===i)); IDX.classList.add('has'); A.tick(i); } }); });
IDX.addEventListener('click',e=>{ if(!e.target.closest('li')&&HOLD.open&&now()-HOLD.t0>.9) UI.indexOpen(false); });

/* ---------- the three of us: we rise as you walk up; point at one of us and the portrait lifts, and opens LinkedIn ---------- */
const PEO=$$('#people .person'); const _pp=v3(), _pq=v3();
PEO.forEach((el,i)=>{ const a=el.querySelector('a');
  a.addEventListener('pointerenter',()=>{ el._h=1; }); a.addEventListener('pointerleave',()=>{ el._h=0; });
  a.addEventListener('focus',()=>{ el._h=1; }); a.addEventListener('blur',()=>{ el._h=0; });
  a.addEventListener('click',e=>{ e.stopPropagation(); A.click(); }); });
/* where a point of the portrait falls on the screen, in pixels */
const scr=(x,y,z,cam)=>{ _pq.set(x,y,z).project(cam); return [(_pq.x*.5+.5)*innerWidth,(-_pq.y*.5+.5)*innerHeight,_pq.z]; };
function peopleUpdate(s,dt){
  /* we are there from the moment you come into the courtyard until you have turned away from us at the arch */
  const near=s<5?1-sstep(.22,.42,5-s):1-sstep(.46,.6,s-5); const box=$('#people');
  box.style.opacity=near.toFixed(3); box.style.visibility=near>.01?'visible':'hidden';
  if(!OUT||near<=.01){ if(OUT) OUT.people.forEach(p=>{ p.target=0; p.seen=false; }); UI._teamT=0; return; }
  /* how long you have stood here: a breath with only the reflections, then we rise one after another */
  UI._teamT=near>.85&&S.mode==='world'?(UI._teamT||0)+dt:Math.max(0,(UI._teamT||0)-dt*2);
  const cam=CAM.out, FP=OUT.FP, port=portrait();
  OUT.people.forEach((p,i)=>{
    const el=PEO[i], fx=p.x-FP.pd/2-.01;
    /* the portrait and its plinth as the screen sees them; on a touch screen the box is only where the caption hangs, under
       the plinth */
    const a=scr(fx,p.lift+FP.top,p.z-FP.pw/2,cam), b=scr(fx,p.lift,p.z+FP.pw/2,cam), pw=Math.abs(b[0]-a[0]);
    let L=Math.min(a[0],b[0]), Tp=Math.min(a[1],b[1]), Wd=pw, Hd=Math.abs(b[1]-a[1]);
    if(!FINE){ Tp=Math.max(a[1],b[1])+14; Hd=0; }
    el.style.transform=`translate(${L.toFixed(1)}px,${Tp.toFixed(1)}px)`;
    el.style.setProperty('--pw',Wd.toFixed(0)+'px'); el.style.setProperty('--ph',Hd.toFixed(0)+'px');
    /* only a portrait that stands in front of you, big enough to point at, takes a click */
    const cx=(a[0]+b[0])/2, cy=(a[1]+b[1])/2;
    el.classList.toggle('off',!(a[2]<1&&b[2]<1&&cx>-pw*.3&&cx<innerWidth+pw*.3&&cy>0&&cy<innerHeight&&pw>70));
    /* we rise as you come, one after another, so you never have to wait for us; on a narrow screen you walk past us one
       at a time, and whoever you are coming up to rises and stays */
    if(port&&s>[4.86,5,5.14][i]-.06) p.seen=true;
    const auto=S.peopleHold?false:(port?p.seen:(s>4.7+i*.07||UI._teamT>.5+i*.45));
    const want=((auto||S.peopleAll)&&near>.6)?1:0;
    p.target=want; p.hot=!!el._h&&!el.classList.contains('off'); el.classList.toggle('up',p.reveal>.8); el.classList.toggle('hot',p.hot);
    /* on a touch screen the caption shows under whoever you are standing in front of, once they have risen */
    const front=!FINE&&p.reveal>.9&&!el.classList.contains('off')&&(port?Math.abs(s-[4.86,5,5.14][i])<.07:pw>150&&Math.abs(s-5)<.06);
    el.classList.toggle('front',front);
    if(want&&!p._was){ setTimeout(()=>A.rise(),i*40); } p._was=want;
  });
}

/* ---------- cursor: a drop of water ---------- */
const cur=$('#cur'), curT=$('#curT'); let cx=M.x, cy=M.y, curBig=0;
document.documentElement.classList.add(FINE?'fine':'coarse');
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,#index li,.person'); curBig=t?1:0; curT.textContent=t?(t.dataset.cur||''):''; cur.classList.toggle('big',!!t); });
UI.cursor=(dt)=>{ if(!FINE) return; cx=damp(cx,M.x,22,dt); cy=damp(cy,M.y,22,dt); cur.style.transform=`translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px)`; cur.classList.toggle('off',!M.on); };
UI.isBig=()=>curBig;

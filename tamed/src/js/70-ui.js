/* ================= THE PAGE OVER THE PLACE ================= */
const UI={};
const INK=col('#2B2520'), LIGHT=col('#FFF8EE'), _fg=new T.Color();
$$('[data-untamed]').forEach(a=>{ a.href=UNTAMED_URL; });
/* headlines are split into words: they rise in one by one, and the water reflects each word where it stands */
$$('.split').forEach(el=>{ const txt=el.textContent.trim(); el.setAttribute('aria-label',txt); el.textContent='';
  txt.split(' ').forEach((w,i,a)=>{ const s=document.createElement('span'); s.className='w'; s.setAttribute('aria-hidden','true'); s.style.setProperty('--i',i); s.textContent=w; el.appendChild(s); if(i<a.length-1) el.appendChild(document.createTextNode(' ')); }); });

/* ---------- gate ---------- */
const gate=$('#gate'), ui=$('#ui');
UI.loadStep=(k)=>{ const ls=$$('#word span'); const n=Math.round(clamp(k,0,1)*ls.length); ls.forEach((l,i)=>l.classList.toggle('in',i<n)); };
UI.gateReady=()=>{ gate.classList.remove('loading'); gate.classList.add('ready'); $('#tamed').disabled=false; $('#gateState').textContent='Choose how to see us'; };
S.gateHover=null;
const setHover=v=>{ if(S.gateHover===v) return; S.gateHover=v; gate.classList.toggle('warm',v==='tamed'); gate.classList.toggle('dark',v==='untamed'); if(v) A.hover(); };
$('#tamed').addEventListener('pointerenter',()=>setHover('tamed')); $('#tamed').addEventListener('pointerleave',()=>setHover(null));
$('#untamed').addEventListener('pointerenter',()=>setHover('untamed')); $('#untamed').addEventListener('pointerleave',()=>setHover(null));
$('#tamed').addEventListener('focus',()=>setHover('tamed')); $('#untamed').addEventListener('focus',()=>setHover('untamed'));
$('#tamed').addEventListener('blur',()=>setHover(null)); $('#untamed').addEventListener('blur',()=>setHover(null));
$('#tamed').addEventListener('click',()=>enter());
/* any first touch of the gate wakes the sound (silently: the score waits for the walk), so the two ways can be heard on hover */
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{ if(S.mode==='gate'&&!A.on) A.start(); },{capture:true,passive:true}));
$('#untamed').addEventListener('click',()=>{ A.click(); });

if(!FINE){ $('#cue span').textContent='Swipe'; }
/* ---------- menu and anything that names a place ---------- */
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-go]'); if(!a) return;
  if(a.closest('#index')) return;
  e.preventDefault(); if(S.mode==='gate') return; travel(a.dataset.go); A.click();
});
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,#index li'); if(!t||t._h) return; t._h=1; setTimeout(()=>t._h=0,160); if(S.mode!=='gate') A.hover(); });
$$('[data-open]').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); A.click(); CASE.open(+b.dataset.open,b); }));

/* ---------- sections follow the walk ---------- */
const SECS=$$('.sec').map(el=>({el,p:placeById(el.dataset.place),on:false,vis:-1}));
UI.firstScroll=()=>{ if(!UI._fs){ UI._fs=1; $('#cue').classList.add('gone'); } };
UI.jumped=()=>{ TXT.dirty=true; };
let fgKey='';
UI.update=(s,dt)=>{
  for(const x of SECS){
    const d=Math.abs(s-x.p.s), w=x.p.id==='team'?.24:0;
    let vis=x.p.id==='home'?1-sstep(.035,.15,d):1-sstep(.09+w,.32+w,d); if(S.mode==='page'||S.mode==='gate'||S.mode==='entering') vis=x.p.id==='home'&&S.mode==='entering'?S.enterK:0;
    if(Math.abs(vis-x.vis)>.002){ x.vis=vis; x.el.style.opacity=vis.toFixed(3); x.el.style.visibility=vis>.002?'visible':'hidden'; }
    const on=vis>.5; if(on!==x.on){ x.on=on; x.el.classList.toggle('in',on); if(on&&x.el.querySelector('[data-reflect]')){ TXT.dirty=true; setTimeout(()=>TXT.dirty=true,1800); } }
  }
  /* the ink of the page changes with the light: dark on the bright evening, pale indoors and after sunset */
  const k=sstep(.47,.6,s); _fg.copy(INK).lerp(LIGHT,k);
  const key=_fg.getHexString(); if(key!==fgKey){ fgKey=key; document.documentElement.style.setProperty('--fg','#'+key); document.documentElement.classList.toggle('lite',k>.5); }
  const pl=placeAt(s); if(pl!==UI._pl){ UI._pl=pl; $('#dialT').textContent=pl.name; $$('#menu a').forEach(a=>a.classList.toggle('on',(a.dataset.nav==='projects'&&pl.proj>=0)||a.dataset.nav===pl.id)); document.documentElement.style.setProperty('--accent',pl.tint); }
  $('#cue').classList.toggle('away',s>.12);
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
  if(on&&!(S.mode==='world'||S.mode==='page')) return;
  HOLD.open=on; IDX.classList.toggle('on',on); IDX.setAttribute('aria-hidden',on?'false':'true'); document.documentElement.classList.toggle('indexed',on);
  if(on){ A.index(); const cur=PLACES.indexOf(placeAt(S.s)); ILI.forEach((l,i)=>l.classList.toggle('cur',i===cur)); hot=-1; ILI.forEach(l=>l.classList.remove('hot')); }
};
UI.indexHover=(x,y)=>{ let h=-1; ILI.forEach((l,i)=>{ const r=l.querySelector('.t').getBoundingClientRect(); if(y>=r.top-8&&y<=r.bottom+8&&x>=r.left-60&&x<=r.right+60) h=i; });
  if(h!==hot){ hot=h; ILI.forEach((l,i)=>l.classList.toggle('hot',i===h)); IDX.classList.toggle('has',h>=0); if(h>=0) A.tick(h); } };
UI.indexRelease=(x,y,held)=>{ UI.indexHover(x,y); if(hot>=0){ const id=ILI[hot].dataset.go; UI.indexOpen(false); A.pick(); travel(id); } };
ILI.forEach((l,i)=>{ l.addEventListener('click',e=>{ e.stopPropagation(); if(!HOLD.open) return; UI.indexOpen(false); A.pick(); travel(l.dataset.go); });
  l.addEventListener('pointerenter',()=>{ if(HOLD.open&&M.type!=='touch'){ hot=i; ILI.forEach((q,j)=>q.classList.toggle('hot',j===i)); IDX.classList.add('has'); A.tick(i); } }); });
IDX.addEventListener('click',e=>{ if(!e.target.closest('li')&&HOLD.open&&now()-HOLD.t0>.9) UI.indexOpen(false); });

/* ---------- the three of us: names under the reflections; hover (or walk up to) one and they rise ---------- */
const PEO=$$('#people .person'); const _pp=v3(), _pq=v3();
PEO.forEach((el,i)=>{ el.addEventListener('pointerenter',()=>{ el._h=1; }); el.addEventListener('pointerleave',()=>{ el._h=0; });
  el.querySelector('a').addEventListener('focus',()=>{ el._h=1; }); el.querySelector('a').addEventListener('blur',()=>{ el._h=0; });
  el.addEventListener('click',e=>{ if(e.target.closest('a')) return; el._tap=!el._tap; }); });
function peopleUpdate(s,dt){
  const near=1-sstep(.22,.42,Math.abs(s-5)); const box=$('#people');
  box.style.opacity=near.toFixed(3); box.style.visibility=near>.01?'visible':'hidden';
  if(!OUT||near<=.01){ if(OUT) OUT.people.forEach(p=>{ p.target=0; p.seen=false; }); UI._teamT=0; return; }
  /* how long you have stood here: a breath with only the reflections, then we rise one after another */
  UI._teamT=near>.85&&S.mode==='world'?(UI._teamT||0)+dt:Math.max(0,(UI._teamT||0)-dt*2);
  const cam=CAM.out, w=innerWidth, h=innerHeight, FP=OUT.FP, port=portrait();
  OUT.people.forEach((p,i)=>{
    const el=PEO[i], fx=p.x-FP.pd/2-.02;
    _pp.set(fx,p.lift+FP.phh*.5,p.z).project(cam);
    const x=(_pp.x*.5+.5)*w, y=(-_pp.y*.5+.5)*h;
    _pq.set(fx,p.lift+FP.phh*.5,p.z-FP.pw/2).project(cam); const xa=(_pq.x*.5+.5)*w;
    _pq.set(fx,p.lift+FP.phh*.5,p.z+FP.pw/2).project(cam); const xb=(_pq.x*.5+.5)*w;
    _pq.set(fx,p.lift+FP.top,p.z).project(cam); const yt=(-_pq.y*.5+.5)*h;
    const pw=Math.abs(xb-xa);
    el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    el.style.setProperty("--pw",Math.max(120,pw).toFixed(0)+"px"); el.style.setProperty("--k",clamp(pw/235,.8,1.2).toFixed(3));
    const over=M.on&&Math.abs(M.x-x)<pw*.5&&M.y>yt-10&&M.y<y+pw*.2;
    /* on a narrow screen you walk past us one at a time, and whoever you reach rises and stays */
    if(port&&1-sstep(.035,.075,Math.abs(s-[4.86,5,5.14][i]))>.5) p.seen=true;
    const auto=S.peopleHold?false:(port?p.seen:UI._teamT>1.2+i*.62);
    const want=((auto||el._tap||S.peopleAll)&&near>.6)?1:0;
    p.target=want; el.classList.toggle('up',p.reveal>.8); el.classList.toggle('hot',!!(over||el._h));
    if(want&&!p._was){ setTimeout(()=>A.rise(),i*40); } p._was=want;
  });
}

/* ---------- cursor: a drop of water ---------- */
const cur=$('#cur'), curT=$('#curT'); let cx=M.x, cy=M.y, curBig=0;
if(FINE) document.documentElement.classList.add('fine');
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest('a,button,#index li,.person'); curBig=t?1:0; curT.textContent=t?(t.dataset.cur||''):''; cur.classList.toggle('big',!!t); });
UI.cursor=(dt)=>{ if(!FINE) return; cx=damp(cx,M.x,22,dt); cy=damp(cy,M.y,22,dt); cur.style.transform=`translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px)`; cur.classList.toggle('off',!M.on); };
UI.isBig=()=>curBig;

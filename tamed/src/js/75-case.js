/* ================= A PROJECT, READ OVER ITS ROOM =================
   The four case studies are one long column. Reading past the end of one brings the next one's title up
   while the camera walks into its room behind the page; past the last, the first comes round again. */
const CASE={floodK:0,y:0,ty:0,vel:0,k:0,s:1,tops:[],wrapAt:0,el:$('#case'),roll:$('#caseRoll'),arts:$$('#case .case'),flood:0,floodT:-1,dim:0,on:false,fromK:0};
(()=>{ /* the loop: after the last project, the first one's head comes up again */
  const nx=$('.case-next'), h=CASE.arts[0].querySelector('.case-head');
  nx.innerHTML=''; const c=h.cloneNode(true); c.classList.add('ghost'); nx.appendChild(c);
})();
CASE.layout=()=>{
  CASE.tops=CASE.arts.map(a=>a.offsetTop);
  CASE.wrapAt=$('.case-next').offsetTop;
};
CASE.open=(i,fromEl)=>{
  if(S.mode!=='world') return;
  S.mode='page'; CASE.on=true; CASE.k=i; S.proj=i;
  CASE.el.classList.add('on'); CASE.el.setAttribute('aria-hidden','false'); document.documentElement.classList.add('reading');
  CASE.layout(); CASE.y=CASE.ty=CASE.tops[i]; CASE.vel=0; CASE.apply();
  const c=PROJ[i].col; POST.comp.uniforms.uFloodCol.value.set(c).lerp(LIGHT,.25);
  if(fromEl){ const r=fromEl.getBoundingClientRect(); POST.comp.uniforms.uFloodC.value.set((r.left+r.width/2)/innerWidth,1-(r.top+r.height/2)/innerHeight); }
  else POST.comp.uniforms.uFloodC.value.set(.5,.5);
  CASE.floodT=0; A.open();
  CASE.el.classList.remove('shown'); setTimeout(()=>{ if(CASE.on) CASE.el.classList.add('shown'); },380);
  $('#back').focus({preventScroll:true});
};
CASE.close=(instant)=>{
  if(!CASE.on) return;
  CASE.on=false; CASE.el.classList.remove('shown','on'); CASE.el.setAttribute('aria-hidden','true'); document.documentElement.classList.remove('reading');
  S.mode='world'; S.proj=-1;
  const idx=STOPS.indexOf(Math.round(CASE.s)); const v=idx>=0?idx:stopOf(CASE.s);
  SC.v=SC.target=v; SC.glide=null; SC.lastIn=now();
  if(!instant) A.close();
  CASE.floodT=-1;
};
CASE.wheel=d=>{ CASE.ty+=d*1.05; CASE.vel=0; };
CASE.drag=dd=>{ CASE.ty+=dd; CASE.y+=dd; };
CASE.fling=v=>{ CASE.vel=clamp(v,-4000,4000); };
CASE.stopInertia=()=>{ CASE.vel=0; };
CASE.apply=()=>{ CASE.roll.style.transform=`translate3d(0,${(-CASE.y).toFixed(2)}px,0)`; };
CASE.tick=dt=>{
  /* the flood: the room's light fills the screen, then draws back to a low glow behind the words */
  if(CASE.floodT>=0){ CASE.floodT+=dt; const t=CASE.floodT; CASE.floodK=t<.55?E.o(t/.55):Math.max(0,1-E.io2((t-.55)/.9)); if(t>1.5){ CASE.floodT=-1; CASE.floodK=0; } }
  CASE.dim=damp(CASE.dim,CASE.on?1:0,CASE.on?3.2:4.5,dt);
  if(!CASE.on) return;
  if(CASE.vel){ CASE.ty+=CASE.vel*dt; CASE.vel*=Math.exp(-3.4*dt); if(Math.abs(CASE.vel)<4) CASE.vel=0; }
  CASE.ty=Math.max(0,CASE.ty);
  CASE.y=damp(CASE.y,CASE.ty,7,dt);
  if(CASE.y>=CASE.wrapAt-.5){ const L=CASE.wrapAt-CASE.tops[0]; CASE.y-=L; CASE.ty-=L; CASE.floodT=.8; }
  CASE.apply();
  /* where we are in the column decides the room behind */
  const vh=innerHeight, y=CASE.y, T_=CASE.tops; let k=0; for(let i=0;i<4;i++) if(y+vh*.45>=T_[i]) k=i;
  const nextTop=k<3?T_[k+1]:CASE.wrapAt; const p=clamp((y+vh-nextTop)/(vh*.9),0,1);
  CASE.k=k; S.proj=k;
  CASE.s=k<3?k+1+E.io2(p):4;
  CASE.tint=k<3?null:p;
  const art=CASE.arts[k], bar=$('#caseBar i'); const a0=T_[k], a1=nextTop; bar.style.transform=`scaleY(${clamp((y-a0)/Math.max(1,a1-a0-vh*.5),0,1).toFixed(3)})`;
  CASE.el.style.setProperty('--c',k<3&&p>.5?PROJ[k+1].col:(k===3&&p>.5?PROJ[0].col:PROJ[k].col));
};
$('#back').addEventListener('click',()=>{ A.click(); CASE.close(); });
addEventListener('resize',()=>{ if(CASE.on){ const k=CASE.k, off=CASE.y-CASE.tops[k]; CASE.layout(); CASE.y=CASE.ty=CASE.tops[k]+off; CASE.apply(); } });

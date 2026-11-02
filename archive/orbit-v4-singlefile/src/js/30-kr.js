/* ================= KRÍOS: DEAD AIR =================
   A sales call as a timeline. The buyer talks (top lane). Wait for them to finish, then hold to answer (bottom lane).
   Start inside the window, stop inside the bracket. A pause mid-sentence is not your turn. */
(()=>{
const st=mkStation('kr',{arrive:new T.Vector3(1.5,2.4,6)});
const sc=st.scene, RATE=40, N=512, SPD=1.15, XP=-9.5, XF=4.2;
const LINES=[
  {t:"Hi, this is Dana. I've got five minutes. What's this about?",ans:[1.6,3.6]},
  {t:"We already use something for call coaching... | it's fine, honestly.",ans:[1.4,3.2]},
  {t:"How long does it take to set up?",ans:[.9,2.4]},
  {t:"Okay. And what does it cost per seat?",ans:[1.2,3]},
  {t:"I'd need to run that past... | my head of sales.",ans:[1.2,3]},
  {t:"Can you send me something I can share with her?",ans:[.8,2.2]},
  {t:"Alright. What's the next step?",ans:[1.6,3.4]}
];
let tex,buf,u,game=null,vB=null,vY=null,talkCtl,talking=false,talkStart=0,keyTalk=false,attract=0,lastWrite=-1,demoT=0;
const cap=$('#krLine'), hint=$('#krHint'), gradeEl=$('#krGrade');
function syl(w){ const m=w.toLowerCase().replace(/[^a-z']/g,'').match(/[aeiouy]+/g); return Math.max(1,m?m.length:1); }
function idx(time){ return ((Math.floor(time*RATE)%N)+N)%N; }
function wr(time,ch,v,mode){ const i=idx(time)*4+ch; buf[i]=mode==='max'?Math.max(buf[i],v*255):v*255; }

st.build=function(){
  buf=new Uint8Array(N*4); tex=new T.DataTexture(buf,N,1,T.RGBAFormat); tex.magFilter=T.LinearFilter; tex.minFilter=T.LinearFilter; tex.needsUpdate=true;
  u={uH:{value:tex},uNow:{value:0},uN:{value:N},uRate:{value:RATE},uSpd:{value:SPD},uLive:{value:0},uFlash:{value:0},uFlashC:{value:new T.Color('#A5C3FF')}};
  const cols=Math.floor(380*Math.sqrt(Q)), rows=Math.floor(46*Math.sqrt(Q));
  const g=cloud(cols*rows*2,(i,r,o)=>{ const lane=i<cols*rows?0:1; const j=i%(cols*rows); const gx=j%cols, gz=Math.floor(j/cols);
    o[0]=XP+gx/(cols-1)*(XF-XP)+(r[0]-.5)*.02; o[1]=lane; o[2]=(gz/(rows-1)-.5)*1.5+(lane?1.15:-1.15); });
  sc.add(pts(g,PM({size:.032,color:'#A5C3FF',uniforms:u,decl:'uniform sampler2D uH; uniform float uNow,uN,uRate,uSpd,uLive,uFlash; uniform vec3 uFlashC;',body:`
    float lane=position.y; float tm=uNow+p.x/uSpd; float ix=mod(floor(tm*uRate),uN); vec4 h=texture2D(uH,vec2((ix+.5)/uN,.5));
    float zl=(p.z-(lane>.5?1.15:-1.15))/0.75; float prof=gs(zl*1.5);
    float amp=lane>.5?h.g:h.r; float fut=step(0.,p.x);
    float shimmer=.5+.5*sin(p.x*9.+uTime*3.+zl*3.);
    float hgt=amp*prof*(1.25+.25*shimmer)*(1.-fut*(lane>.5?1.:0.));
    p.y=hgt*1.15-.9+ (lane>.5?0.:.05);
    float zone=lane>.5?h.b*smoothstep(1.,.2,abs(zl)):0.;
    float edge=smoothstep(${XP.toFixed(1)},${(XP+3).toFixed(1)},p.x)*smoothstep(${XF.toFixed(1)},${(XF-1.6).toFixed(1)},p.x);
    vec3 cb=uCol, cy=vec3(.93,.91,.87);
    col=lane>.5?cy:cb; col=mix(col,vec3(1.,.76,.5),zone*.9);
    b=(.07+hgt*1.6+zone*.55*(.6+.4*sin(uTime*6.)))*edge*(1.-fut*.55);
    float nowl=gs(p.x*7.); b+=nowl*.35*edge; col=mix(col,uFlashC,nowl*uFlash);
    b*=1.+nowl*uFlash*2.;`})));
  // the now-line: a thin standing plane of light
  sc.add(pts(cloud(900,(i,r,o)=>{o[0]=gauss()*.01;o[1]=-.9+r[0]*2.4;o[2]=(r[1]-.5)*4.6;}),PM({size:.03,color:'#EEE9DF',body:'b=.18*(1.-position.y*.2-.2);'})));
  sc.add(pts(cloud(Math.floor(2000*Q+400),(i,r,o)=>{o[0]=(r[0]-.5)*30;o[1]=-1-r[1]*.1;o[2]=(r[2]-.5)*16;}),PM({size:.03,color:'#A5C3FF',body:'b=.05;'})));
  st.anchors=[new T.Vector3(-2.2,.6,-1.15),new T.Vector3(0,.3,0),new T.Vector3(-3.5,-.2,1.15)];
};
/* ---------- the buyer's line, scheduled on the game clock ---------- */
function schedule(L,t0){
  const parts=L.t.split(' '); const ev=[]; let t=t0; let base=186; const isQ=/\?$/.test(L.t);
  const words=[]; parts.forEach((w,wi)=>{ if(w==='|'){ ev.push({t,type:'pause'}); t+=1.15; return; }
    const n=syl(w); const last=wi===parts.length-1, nearEnd=wi>=parts.length-2;
    const wd={w,t0:t,t1:0,i:words.length}; words.push(wd);
    for(let k=0;k<n;k++){ let p=base*(1-.12*(wi/parts.length)); if(isQ&&nearEnd) p*=1+.22*((k+1)/n)*(last?1.3:.6); else if(last) p*=.86-.06*k; if(/\.\.\.$/.test(w)&&k===n-1) p*=1.04;
      ev.push({t,type:'syl',d:.15,p:p*(1+(Math.random()-.5)*.06),v:(wi*3+k)%6,wd}); t+=.15; }
    wd.t1=t; t+=.07; if(/[,.]$/.test(w)&&!last) t+=/\.\.\.$/.test(w)?.05:.22; });
  return {ev,words,end:t};
}
function setCaption(words){ cap.innerHTML=words.map(w=>`<span class="w">${w.w.replace(/\.\.\.$/,'')}${/\.\.\.$/.test(w.w)?'<span class="pause">…</span>':''}</span>`).join(' '); }
function grade(txt,good){ gradeEl.textContent=txt; gradeEl.style.color=good===1?'var(--acc)':good===0?'var(--ink)':'var(--alarm)'; gradeEl.animate([{opacity:0,transform:'translate(-50%,-30%)'},{opacity:1,transform:'translate(-50%,-50%)',offset:.15},{opacity:1,offset:.7},{opacity:0,transform:'translate(-50%,-70%)'}],{duration:1100,easing:'cubic-bezier(.16,1,.3,1)'}); }
function flash(c){ u.uFlashC.value.set(c); u.uFlash.value=1; }

function nextLine(){
  const g=game; if(g.li>=LINES.length) return end();
  const L=LINES[g.li]; const s=schedule(L,g.t+.5); g.cur={L,...s,ei:0,state:'buyer',open:0,startGrade:null,interrupted:false};
  setCaption(s.words); $('#krTurn').textContent=`Line ${g.li+1} / ${LINES.length}`; hint.textContent=g.li===0?'Listen. Wait until she has finished.':'';
}
function startTalk(){ if(!game||st.state!=='play') return; if(talking) return; talking=true; talkStart=game.t; const c=game.cur; if(!c) return;
  if(c.state==='buyer'){ c.interrupted=true; game.cut++; game.mom-=14; game.combo=0; grade('Cut off',-1); A.buzz(); flash('#FF5636'); feedback(.25,.8,new T.Color(.12,0,0)); hint.textContent="That wasn't your turn. Let her finish."; }
  else if(c.state==='open'){ const d=game.t-c.open; c.startD=d; let pts=0, gtx='';
    if(d<.15){ gtx='Quick'; pts=180; } else if(d<.9){ gtx='Right on time'; pts=300; } else if(d<1.8){ gtx='A bit slow'; pts=90; } else { gtx='Dead air'; pts=0; game.dead++; }
    c.startPts=pts; c.startG=gtx; c.state='you'; hint.textContent=`Answer between ${c.L.ans[0]}s and ${c.L.ans[1]}s. Release to stop.`;
    // the bracket for a good answer length
    for(let tt=game.t+c.L.ans[0]; tt<game.t+c.L.ans[1]; tt+=1/RATE) wr(tt,2,.55);
    A.chime(5,0,.03); }
}
function stopTalk(){ if(!talking) return; talking=false; if(!game) return; const c=game.cur; if(!c||c.state!=='you') return;
  const L=game.t-talkStart; let lp=0, lt='';
  if(L<c.L.ans[0]){ lp=90; lt='Too short'; } else if(L<=c.L.ans[1]){ lp=300; lt='Clean answer'; } else { lp=Math.max(0,220-(L-c.L.ans[1])*120); lt='Rambling'; game.ramble++; }
  finishTurn(c,lp,lt);
}
function finishTurn(c,lp,lt){
  const good=(c.startPts>=180&&lp>=300&&!c.interrupted);
  if(good){ game.combo++; game.best=Math.max(game.best,game.combo); } else game.combo=0;
  const mult=1+Math.min(game.combo,6)*.25; const pts=Math.round((c.startPts+lp)*(c.interrupted?.5:1)*mult); game.score+=pts;
  game.mom+=good?11:(c.startPts>=90&&lp>=90?3:-9); if(c.startG==='Dead air') game.mom-=6;
  grade(good?(c.startG==='Right on time'?'Perfect':'Clean'):lt==='Clean answer'?c.startG:lt,good?1:lt==='Clean answer'?0:-1);
  if(good){ A.chime(7+game.combo); flash('#A5C3FF'); } else if(lt!=='Clean answer') A.buzz();
  popAt($('.pops',st.el)||st.el,new T.Vector3(0,.4,1.15),'+'+pts);
  c.state='done'; game.li++; game.gap=game.t+.7; hint.textContent='';
  game.turns.push({start:c.startD||0,len:lt,interrupted:c.interrupted});
}
function hud(){ $('#krScore').textContent=fmt(game.score); $('#krCombo').textContent=game.combo>1?`Streak ×${(1+Math.min(game.combo,6)*.25).toFixed(2)}`:'';
  const m=$('#krMom'); game.mom=clamp(game.mom,0,100); m.style.setProperty('--v',game.mom/100); m.classList.toggle('low',game.mom<35); }
st.play=function(){
  if(!vB) vB=A.voice(0); if(!vY) vY=A.voice(1);
  buf.fill(0); tex.needsUpdate=true; game={t:0,li:0,score:0,mom:50,combo:0,best:0,cut:0,dead:0,ramble:0,turns:[],gap:.4,cur:null}; lastWrite=-1;
  st.setState('play'); u.uLive.value=1; hud(); cap.innerHTML=''; A.update(0,{pad:.45});
};
st.abort=function(){ game=null; talking=false; u.uLive.value=0; if(vB) vB.hold(0); if(vY) vY.hold(0); A.update(0,{pad:1}); };
function end(){
  const g=game; game=null; talking=false; if(vY) vY.hold(0);
  const grade_=g.mom>=80?'Demo booked':g.mom>=60?'Follow-up set':g.mom>=40?'Send an email':'She hung up';
  const avgStart=g.turns.filter(x=>!x.interrupted).reduce((a,x)=>a+x.start,0)/Math.max(1,g.turns.filter(x=>!x.interrupted).length);
  st.result({grade:grade_,score:g.score,stats:[['Momentum',Math.round(g.mom)+'%'],['Best streak',g.best+' lines'],['Times you cut in',g.cut],['Dead air',g.dead],['Ran long',g.ramble],['Avg reply gap',avgStart.toFixed(2)+' s']],
    text:(g.cut?'Every cut-in cost her trust. ':'')+(g.dead?'Silence reads as doubt. ':'')+'Kríos puts reps through calls like this against a voice that answers back, so the timing is automatic before it matters.'});
  A.update(0,{pad:1}); A.dock();
}
st.enter=function(){ st.abort(); st.setState('menu'); $('#krBest').textContent='Best '+fmt(store.get('kr',0)); buf.fill(0); tex.needsUpdate=true; demoT=0; };
st.exit=function(){ st.abort(); };
talkCtl={};
const tb=$('#krTalk');
tb.addEventListener('pointerdown',e=>{ e.preventDefault(); tb.classList.add('down'); startTalk(); });
addEventListener('pointerup',()=>{ tb.classList.remove('down'); if(!keyTalk) stopTalk(); });
st.onPointer=e=>{ if(st.state==='play'){ startTalk(); } };
addEventListener('keydown',e=>{ if(e.code==='Space'&&S.stId==='kr'&&S.mode==='station'&&st.state==='play'){ e.preventDefault(); if(!e.repeat){ keyTalk=true; tb.classList.add('down'); startTalk(); } } });
addEventListener('keyup',e=>{ if(e.code==='Space'&&keyTalk){ keyTalk=false; tb.classList.remove('down'); stopTalk(); } });

st.update=function(dt,t){
  const now=game?game.t:t;
  // clear the slot that is about to scroll into the future window
  const cur=Math.floor((now+(XF/SPD)+.2)*RATE); if(lastWrite<0) lastWrite=cur-1; for(let k=lastWrite+1;k<=cur;k++){ const i=((k%N)+N)%N*4; buf[i]=buf[i+1]=buf[i+2]=buf[i+3]=0; } lastWrite=cur;
  if(game){
    game.t+=dt; const c=game.cur;
    if(!c&&game.t>game.gap) nextLine();
    else if(c&&c.state==='done'&&game.t>game.gap) nextLine();
    if(c&&c.state==='buyer'){
      while(c.ei<c.ev.length&&c.ev[c.ei].t<=game.t){ const e=c.ev[c.ei++]; if(e.type==='syl'){ vB.syl(e.d,e.p,e.v); $$('.w',cap)[e.wd.i]?.classList.add('on'); } }
      // write the buyer's envelope for the just-spoken slice
      const live=c.ev.some(e=>e.type==='syl'&&game.t>=e.t&&game.t<e.t+e.d); wr(game.t,0,live?.55+.45*Math.abs(Math.sin(game.t*31)):.0,'max');
      if(game.t>c.end+.02&&c.ei>=c.ev.length){ c.state='open'; c.open=game.t; for(let tt=game.t+.15;tt<game.t+.9;tt+=1/RATE) wr(tt,2,1); if(game.li===0) hint.textContent='Now. Hold to answer.'; }
    }
    if(c&&c.state==='open'&&!talking&&game.t-c.open>3.2){ game.dead++; game.mom-=12; c.startPts=0; c.startG='Dead air'; grade('Dead air',-1); A.buzz(); hint.textContent='"Hello? Are you still there?"'; finishTurn(c,0,'No answer'); }
    if(c&&c.state==='you'){ const L=game.t-talkStart; if(L>c.L.ans[1]+2.2){ talking=false; finishTurn(c,0,'Monologue'); game.ramble++; hint.textContent='She tuned out.'; } }
    if(talking){ wr(game.t,1,.5+.5*Math.abs(Math.sin(game.t*23+Math.sin(game.t*7)*2)),'max'); vY.hold(1,110+Math.sin(game.t*3)*12); if(Math.random()<dt*9) vY.syl(.13,108+Math.random()*24,(Math.random()*6)|0); }
    else if(vY) vY.hold(0);
    hud();
  } else {
    // attract loop: a quiet call already in progress
    demoT+=dt; const a=Math.max(0,Math.sin(demoT*1.3))*Math.abs(Math.sin(demoT*17)); wr(t,0,(demoT%9)<4?a*.6:0,'max'); wr(t,1,(demoT%9)>4.8&&(demoT%9)<7.5?Math.abs(Math.sin(t*19))*.45:0,'max');
  }
  tex.needsUpdate=true; u.uNow.value=now; u.uFlash.value=damp(u.uFlash.value,0,4,dt);
  const nar=NARROW(); st.camP.set(nar?1.2:3.6,nar?4.2:2.9,nar?11:7.6); st.camL.set(nar?-.8:-1.6,nar?.2:.55,0);
  if(st.state!=='play') notesUpdate(st);
};
})();

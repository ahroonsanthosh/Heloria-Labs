/* ================= KRÍOS: CLEAR SIGNAL ================= */
(()=>{
const st=mkStation('kr',{arrive:new T.Vector3(0,5,9)});
const sc=st.scene;
const H=128, Z0=-13, Z1=5, ZL=Z1-Z0, PZ=3.2, PY=.95, ROW=ZL/(H-1), IP=Math.round((PZ-Z0)/ZL*(H-1));
const GOOD=['next step','value','listen','budget','timeline','why now','decision','fit','question','agreed','priority','impact','outcome','ROI','pain point','clarity'];
const BAD=['um','uh','like','basically','actually','you know','sort of','honestly','literally','kind of'];
const pick=a=>a[(Math.random()*a.length)|0];
let hist,tex,tu,orb,burst,words=[],game=null,px=0,tx=0,acc=0,vt=0,f1=.4,f2=.5,spawnT=0,lastX=0,keyT=0;
const pops=$('#krPops');
const XMAX=()=>NARROW()?3.9:6;

st.build=function(){
  hist=new Uint8Array(H*4); for(let i=0;i<H;i++) hist[i*4+3]=128;
  tex=new T.DataTexture(hist,H,1,T.RGBAFormat); tex.magFilter=T.LinearFilter; tex.minFilter=T.LinearFilter; tex.needsUpdate=true;
  const cols=Math.floor(250*Math.sqrt(Q)), rows=Math.floor(150*Math.sqrt(Q));
  const g=cloud(cols*rows,(i,r,o)=>{const gx=i%cols,gz=Math.floor(i/cols);o[0]=(gx/(cols-1)-.5)*15+(r[0]-.5)*.02;o[1]=0;o[2]=Z0+gz/(rows-1)*ZL;});
  tu={uH:{value:tex},uPX:{value:0},uPZ:{value:PZ},uKick:{value:0},uLive:{value:0}};
  sc.add(pts(g,PM({size:.04,color:'#9fd6ff',uniforms:tu,decl:'uniform sampler2D uH; uniform float uPX,uPZ,uKick,uLive;',body:`
    float u=clamp((p.z-(${Z0.toFixed(1)}))/${ZL.toFixed(1)},0.,1.); vec4 h=texture2D(uH,vec2(u*.992+.004,.5));
    float amp=h.r; float f1=mix(-6.,-1.5,h.g), f2=mix(-1.,3.6,h.b);
    float e=amp*(1.5*gs((p.x-f1)*1.1)+1.*gs((p.x-f2)*1.3)+.5*gs((p.x-4.8)*1.5))+amp*.12*(.5+.5*sin(p.x*11.));
    float you=step(uPZ-.15,p.z)*gs((p.x-(h.a*15.-7.5))*3.)*1.15*uLive;
    float kick=uKick*gs((p.x-uPX)*1.4)*gs((p.z-uPZ)*.6);
    e+=you+kick; p.y=e*1.2-1.6;
    float edge=smoothstep(7.5,5.6,abs(p.x))*smoothstep(${Z0.toFixed(1)},${(Z0+4).toFixed(1)},p.z)*smoothstep(${Z1.toFixed(1)},${(Z1-1.6).toFixed(1)},p.z);
    b=(.26+e*1.35)*edge; col=mix(uCol,vec3(1.),clamp(e-.6,0.,1.)*.5); col=mix(col,vec3(1.,.97,.92),clamp(you,0.,1.)*.75);`})));
  orb=new T.Group(); sc.add(orb);
  orb.add(new T.Mesh(new T.SphereGeometry(.17,28,18),FM('#bfe6ff',{int:2.1,core:.35})));
  orb.add(pts(cloud(50,(i,r,o)=>{o[0]=gauss()*.04;o[1]=gauss()*.04;o[2]=gauss()*.04;}),PM({size:.42,color:'#d6efff',body:'b=.35+.15*sin(uTime*8.);'})));
  burst=Burst(sc,Math.floor(700*Q+200),'#cfeeff',.085);
};
function shift(){
  hist.copyWithin(4,0,(H-1)*4); vt+=.045;
  const syl=Math.abs(Math.sin(vt*5.1)*Math.sin(vt*1.9+1.)); const live=st.state==='play';
  f1=clamp(f1+(Math.random()-.5)*.08,.1,.9); f2=clamp(f2+(Math.random()-.5)*.1,.1,.9);
  hist[0]=clamp((live?.6:.45)*syl+.05,0,1)*255; hist[1]=f1*255; hist[2]=f2*255; hist[3]=128;
  hist[IP*4+3]=clamp((px+7.5)/15,0,1)*255;
}
function spawn(attract){
  const el=game?game.el:0, r=Math.random();
  const kind=(!attract&&el>8&&r<.045)?'gold':(Math.random()<(attract?.55:lerp(.6,.47,clamp(el/50,0,1)))?'good':'bad');
  const txt=kind==='gold'?'book the demo':kind==='good'?pick(GOOD):pick(BAD);
  const s=textSprite(txt,kind); const h=kind==='bad'?.42:kind==='gold'?.66:.6; s.scale.set(h*s.userData.aspect,h,1);
  let x=0; for(let k=0;k<8;k++){ x=(Math.random()*2-1)*XMAX(); if(Math.abs(x-lastX)>1.5) break; } lastX=x;
  s.position.set(x,PY,Z0+.5); s.material.opacity=0; sc.add(s);
  words.push({s,kind,x,z:Z0+.5,hw:h*s.userData.aspect*.5,done:false,die:0});
}
function clearWords(){ words.forEach(w=>{ sc.remove(w.s); w.s.material.dispose(); }); words=[]; }
function hit(w){
  w.done=true; w.die=1; const p=w.s.position.clone();
  if(w.kind==='bad'){ game.combo=0; game.mult=1; game.clar-=16; game.fillers++; A.buzz(); feedback(.35,1,new T.Color(.16,0,0)); popAt(pops,p,'Filler','bad'); w.s.material.color.set('#ff5040'); return; }
  const base=w.kind==='gold'?500:100; game.combo++; game.best=Math.max(game.best,game.combo); game.mult=Math.min(8,1+Math.floor(game.combo/4));
  const pts_=base*game.mult; game.score+=pts_; game.clar=Math.min(100,game.clar+(w.kind==='gold'?20:4)); game.words++;
  if(w.kind==='gold'){ A.chord(); feedback(.15,.4); S.flash=Math.max(S.flash,.18); } else A.chime(4+game.combo%10);
  burst.emit(p,w.kind==='gold'?70:34,3.2,w.kind==='gold'?new T.Color('#ffd0b0'):null,.6,.9); tu.uKick.value=w.kind==='gold'?2:1.2;
  popAt(pops,p,'+'+pts_+(game.mult>1?'  ×'+game.mult:''));
}
function hud(){
  $('#krScore').textContent=fmt(game.score); $('#krMult').textContent='×'+game.mult; $('#krTime').textContent=Math.max(0,60-game.el).toFixed(1)+' s';
  const m=$('#krClar'); m.style.setProperty('--v',clamp(game.clar/100,0,1)); m.classList.toggle('low',game.clar<30);
}
st.play=function(){ clearWords(); game={el:0,score:0,combo:0,mult:1,clar:100,fillers:0,words:0,best:0}; spawnT=1.2; st.setState('play'); tu.uLive.value=1; hud(); A.drone(300); };
st.abort=function(){ game=null; tu.uLive.value=0; };
function end(){
  const g=game; game=null; tu.uLive.value=0; S.games++;
  const best=store.get('kr',0); const isNew=g.score>best; if(isNew) store.set('kr',g.score); $('#krBest').textContent=fmt(Math.max(best,g.score));
  const grade=g.score>=16000?'Closed. They signed.':g.score>=9000?'Next step booked.':g.score>=3500?"They'll think about it.":'Ghosted.';
  const line=g.score>=16000?'Clear, confident, no filler. That call closes itself.':g.score>=9000?'Strong call. Trim the filler and it becomes a close.':g.score>=3500?'The signal got lost in the noise. Every filler word cost you clarity.':'The prospect hung up. Say less, say it clearly.';
  $('#krGrade').textContent=grade; $('#krFinal').textContent=fmt(g.score); $('#krNew').textContent=isNew?'New best':'Best '+fmt(best);
  $('#krStats').innerHTML=statsHTML([['Words that landed',g.words],['Best streak',g.best],['Filler slips',g.fillers],['Clarity left',Math.max(0,Math.round(g.clar))+'%'],['Time on call',Math.min(60,g.el).toFixed(1)+' s'],['Top multiplier','×'+Math.min(8,1+Math.floor(g.best/4))]]);
  $('#krLine').textContent=line+' Kríos lets reps practise calls like this against a voice that answers back.';
  st.setState('res'); A.dock(); A.drone(200);
}
st.enter=function(){ st.abort(); clearWords(); st.setState('menu'); px=tx=0; $('#krBest').textContent=fmt(store.get('kr',0)); for(let i=0;i<H;i++) shift(); };
st.exit=function(){ st.abort(); clearWords(); };
addEventListener('keydown',e=>{ if(S.stId==='kr'&&(e.code==='KeyA'||e.code==='KeyD'||e.code==='ArrowLeft'||e.code==='ArrowRight')) keyT=performance.now(); });
st.update=function(dt,t){
  const playing=st.state==='play'&&game;
  const speed=playing?Math.min(10.5,5.2+game.el*.085):2.4;
  // steering: keys beat pointer, pointer beats nothing
  let k=0; if(keys.has('KeyA')||keys.has('ArrowLeft')) k-=1; if(keys.has('KeyD')||keys.has('ArrowRight')) k+=1;
  if(k) tx=clamp(tx+k*10*dt,-XMAX(),XMAX());
  else if(performance.now()-keyT>600 && G.uMouse.value.x<5) tx=clamp(G.uMouse.value.x*XMAX()*1.15,-XMAX(),XMAX());
  px=damp(px,tx,12,dt);
  acc+=speed*dt/ROW; let n=0; while(acc>=1&&n<12){ acc-=1; shift(); n++; } if(n) tex.needsUpdate=true;
  for(let i=words.length-1;i>=0;i--){ const w=words[i];
    w.z+=speed*dt; w.s.position.z=w.z;
    const fade=sstep(Z0+.5,Z0+3,w.z)*(1-sstep(Z1-.8,Z1+.6,w.z));
    if(w.die>0){ w.die-=dt*3.2; w.s.material.opacity=Math.max(0,w.die); w.s.scale.multiplyScalar(1+dt*2.4); w.s.position.y+=dt*1.2; }
    else { w.s.material.opacity=fade*(playing||w.kind==='good'?1:.75);
      if(!w.done&&playing&&Math.abs(w.z-PZ)<.45&&Math.abs(w.x-px)<w.hw*.85+.28) hit(w);
      else if(!w.done&&w.z>PZ+.55){ w.done=true; if(playing&&w.kind!=='bad') game.clar-=2.5; } }
    if(w.z>Z1+1||(w.die<=0&&w.done&&w.s.material.opacity<=0.001&&w.z>PZ)){ sc.remove(w.s); w.s.material.dispose(); words.splice(i,1); }
  }
  spawnT-=dt; if(spawnT<=0){ spawn(!playing); spawnT=playing?Math.max(.3,.6-game.el*.0055):1.1; }
  if(playing){ game.el+=dt; game.clar-=dt; hud(); if(game.clar<=0||game.el>=60) end(); }
  tu.uPX.value=px; tu.uKick.value=damp(tu.uKick.value,0,3.5,dt);
  orb.position.set(px,PY+Math.sin(t*6)*.04,PZ); orb.visible=st.state!=='res';
  burst.update(dt,0,2.2);
  const nar=NARROW(); st.camP.set(px*.18,nar?5.8:3.6,nar?12.8:9.7); st.camL.set(px*.3,nar?-.6:-.3,-3);
  cursorAim(false);
};
})();

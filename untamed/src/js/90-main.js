/* ================= FLOW + LOOP ================= */

/* ---------- boot: Earth is built behind the loader, and every shader it needs compiled and drawn once, so nothing stalls
   the first time you see it ---------- */
/* compile a scene's shaders without freezing the page, where the browser can do it in the background; never wait forever */
async function compileQuiet(sc,cam,sets){ try{
    /* a world drawn more than one way (Earth: its ink and its sun's shadow) has those sent off with it (for what is shown
       now: the drawing would make no others), and the wait is for every shader sent so far: a browser that makes them in
       the background makes them side by side, and none is then made on its own, holding the page, the first time it is
       drawn with */
    sendSets(sc,cam,sets);
    if(renderer.compileAsync) await Promise.race([intoTarget(()=>renderer.compileAsync(sc,cam)).then(programsReady),wait(8000)]); else intoTarget(()=>renderer.compile(sc,cam)); }catch(e){} }
/* a world's shaders sent off as it is being built, waited for by nobody: a browser that makes them in the background makes
   them while the rest of the world is still being put together, so the wait behind the loader is only for those not made by
   then. They are the very ones the wait sends (each is made once, sooner). Only what is shown is sent: something hidden may
   yet be changed before it is first drawn (the rain is made dry in the workshop), and would then be made twice */
function sendShaders(sc,cam){ try{ sc.traverse=sc.traverseVisible; intoTarget(()=>renderer.compile(sc,cam)); renderer.getContext().flush(); }catch(e){} finally{ delete sc.traverse; } }
/* the other ways a world is drawn (its ink, its shadow), of what is shown now, sent off without waiting */
function sendSets(sc,cam,sets){ if(sets) intoTarget(()=>sc.traverseVisible(o=>{ if(!o.material||Array.isArray(o.material)||hasLight(o)) return;
  for(const f of sets){ const m=f(o); if(m&&m!==o.material){ const m0=o.material; o.material=m; try{ renderer.compile(o,cam,sc); }catch(e){} finally{ o.material=m0; } } } })); }
/* the page's next turn: whatever is waiting (a frame to draw, a click) goes first, then straight on */
const nextSlice=()=>new Promise(r=>{ const c=new MessageChannel(); c.port1.onmessage=()=>{ c.port1.close(); r(); }; c.port2.postMessage(0); });
/* every shader sent off so far is made (at once, where the browser makes them as they are first drawn with) */
const programsReady=()=>new Promise(res=>{ const ck=()=>{ let ok=true; try{ ok=renderer.info.programs.every(p=>p.isReady()); }catch(e){} if(ok) res(); else setTimeout(ck,10); }; ck(); });
/* an object with a light of its own is compiled with the whole scene, not by itself: three would count its light twice
   (from the scene and from the object) */
const hasLight=o=>{ let l=false; o.traverse(x=>{ if(x.isLight) l=true; }); return l; };
/* Earth drawn once into a small target of the same kind, entered and left again round it as it will be when you arrive,
   so its textures are sent and every shader it draws with is made. What this first drawing shows that the town at rest did
   not (the rooms drawn once behind the loader), the ink's composite and the screen's own last pass are sent off first, and
   waited for together, so none of them is made on its own, holding the page, as the drawing comes to it */
async function warmEarth(st){ const rt=mkRT(); rt.setSize(64,64);
  st.enter(); st.update(.016,0);
  stCam.position.copy(st.camP); stCam.lookAt(st.camL);
  try{ intoTarget(()=>renderer.compile(st.scene,stCam)); sendSets(st.scene,stCam,st.matSets); for(const [s,c] of st.warmAlso||[]) intoTarget(()=>renderer.compile(s,c)); }catch(e){}
  { const was=renderer.getRenderTarget(); try{ renderer.setRenderTarget(null); renderer.compile(postScene,ortho); }catch(e){} finally{ renderer.setRenderTarget(was); } }
  await Promise.race([programsReady(),wait(8000)]);
  try{ st.render(rt); }catch(e){ console.error('render cr',e); }
  st.exit(); renderer.setRenderTarget(null); rt.dispose(); }
async function boot(){
  const mark=$('#mark'), bootEl=$('#boot'); // the mark's weight is the progress bar; one quiet line says what is being built
  mark.textContent=''; [...'Heloria'].forEach(ch=>{ const c=document.createElement('span'); c.className='c'; c.textContent=ch; mark.appendChild(c); });
  const setP=v=>{ mark.style.fontWeight=Math.round(100+700*v); };
  setP(0); try{ await Promise.race([document.fonts.ready,wait(2500)]); }catch(e){}
  resize(); setP(.1);
  /* between the parts of Earth, the page's own turn rather than the next frame: a frame due is drawn and a click answered
     all the same, but the build does not stand idle waiting for one (nor for a graphics card busy making shaders) */
  bootEl.textContent='Building Earth'; await nextFrame(); if(ST.cr) ST.cr.pace=nextSlice; try{ await ST.cr.build(); }catch(err){ console.error('build cr',err); delete ST.cr; } if(ST.cr) delete ST.cr.pace; setP(.6);
  const st=ST.cr;
  if(st){ bootEl.textContent='Warming Earth'; await nextFrame(); await compileQuiet(st.scene,stCam,st.matSets);
    /* (the graphics card's answer, by now long drawn: where it cannot draw the page's pictures, the plain page instead) */
    if(!rtWorks()){ document.documentElement.classList.add('nogl'); delete ST.cr; setP(1); $('#load').classList.add('ready'); S.ready=true; return; }
    await warmEarth(st); }
  setP(.9);
  renderer.setRenderTarget(null); renderer.render(postScene,ortho);
  try{ await A.firstReady(); }catch(e){}   // (what you hear first, made: see firstReady)
  setP(1); $('#load').classList.add('ready'); S.ready=true;
  /* and down, by itself: no click asked for. Once the page has drawn a frame or two of its own (the graphics card caught up
     with everything just made, so the landing has every frame from its first) */
  await nextFrame(); await nextFrame(); enter();
}

/* ---------- Land: straight down to Earth, in its own daylight, the colour the front door left you in. Any address of
   this page comes here (the old ones too: #land, and #aetos, where the rocket at the end of the walk used to go) ---------- */
document.documentElement.classList.add('landing');
/* on the site the address says where you are: /land. The page itself lives at untamed/, so its own address is kept to come
   back to; reloading /land goes to the front door */
const PAGE_URL=location.pathname, PRETTY='__PRETTY__'&&/^\/untamed\/(index\.html)?$/.test(PAGE_URL);   // only where the site is the whole domain
if(PRETTY){ try{ history.replaceState(null,'','/land'); }catch(e){} }

/* ---------- enter: the word lifts away like cloud, and the rocket is already coming down through the sky behind it ---------- */
function enter(){
  if(!S.ready||S.mode!=='load') return; A.start();
  const mark=$('#mark'), cx=innerWidth/2, cy=innerHeight/2;
  $$('.c',mark).forEach(c=>{ const r=c.getBoundingClientRect(); c.style.setProperty('--tx',(cx-(r.left+r.width/2))+'px'); c.style.setProperty('--ty',(cy-(r.top+r.height/2))+'px'); c.style.transitionDelay=(Math.random()*.25).toFixed(2)+'s'; });
  $('#load').classList.add('go');
  S.mode='landing'; A.whoosh(false,2.2,.16);
  /* (on down unless something has already put you on Earth in the meantime: the tests' own straight way in, see earth) */
  setTimeout(()=>{ if(S.mode!=='landing') return; show('#chrome',true); enterEarth(); S.flash=.5; },650); setTimeout(()=>show('#load',false),800);
}
/* the way in is by itself (see boot). The sound: a browser lets it start only once the page has had a click, a tap or a key.
   Come from the front door, it has (a click there counts here too, in the browsers that carry it to the next page of the
   same site), and the landing is heard from its first moment. Come straight here (a bookmark, a reload, or a browser that
   does not carry it), a click, a tap or a key while it loads or as it comes down starts it then, in step with the landing,
   and a first click on the landing starts the sound rather than skipping it (see the landing) */
['pointerdown','keydown','touchend'].forEach(ev=>addEventListener(ev,()=>{ if(S.mode==='load'&&!A.on) A.start(); },{capture:true,passive:true}));

/* onto Earth: a flash of white, and it opens on the rocket coming down through the clouds. Should Earth not have been made
   (an error while it was built), the plain page is the way in instead */
function enterEarth(){ const st=ST.cr; if(!st){ document.documentElement.classList.add('nogl'); return; }
  S.mode='station'; S.stId='cr'; S.st=st; S.stSnap=true; S.flash=1;
  st.enter(); if(st.cutscene) st.cutscene(); show('#station',true); st.showUI(); }
window.__onResize=()=>{ window.__crLayout&&window.__crLayout(); };

/* ---------- main loop ---------- */
const stPos=new T.Vector3(), stLook=new T.Vector3();
let last=performance.now();
function frame(now){
  const raw=(now-last)/1000; last=now; const rdt=Math.min(window.__TEST?.5:.1,raw), dt=Math.min(.05,raw); S.rdt=rdt; S.t+=dt; const t=S.t;
  G.uTime.value=RM?t*.35:t; QM.tick(raw*1000,now); cursorTick();
  if(S.mode==='credits'){ requestAnimationFrame(frame); return; }   // the white page: nothing left to draw
  S.shake=Math.max(0,S.shake-rdt*1.8);
  S.flash=Math.max(S.flashMin||0,S.flash-rdt*1.2); post.uniforms.uFlash.value=S.flash;
  // Earth, and its camera (Earth smooths its own: it asks for the camera to be put where it says every frame)
  const on=!!S.st; rtLive(rtW,on);
  if(on){
    S.st.update(dt,t);
    if(S.stSnap){ stPos.copy(S.st.camP); stLook.copy(S.st.camL); S.stSnap=false; }
    else { stPos.lerp(S.st.camP,1-Math.exp(-4*dt)); stLook.lerp(S.st.camL,1-Math.exp(-5*dt)); }
    stCam.position.copy(stPos); if(S.shake>0&&!RM){ const a=S.shake*S.shake*.22; stCam.position.add(_shk.set((Math.random()-.5)*a,(Math.random()-.5)*a,0)); } stCam.lookAt(stLook);
    if(!S.fin) A.update(t,{sub:0,pad:0});   // (the last flight sets the music up high itself)
    S.st.render(rtW);   // Earth draws itself, and inks its own lines
    renderer.setRenderTarget(null); renderer.render(postScene,ortho); }
  requestAnimationFrame(frame);
}
const _shk=new T.Vector3();
requestAnimationFrame(frame);
boot();
/* test helper: straight onto Earth with no transitions */
function earth(){ const st=ST.cr; if(!st||!S.ready) return false;
  show('#load',false); show('#chrome',true); A.start();
  S.mode='station'; S.stId='cr'; S.st=st; S.stSnap=true; st.enter(); show('#station',true); st.showUI(); return true; }
window.__heloria={A,finaleWhite,credits,earth,enterEarth,S,ST,post,renderer,stCam,rtW,postScene,ortho};

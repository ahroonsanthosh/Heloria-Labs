/* arrived over plain http on the site's own domain: the same place over https, at once (see the walk's js/01-secure.js) */
if(location.protocol==='http:'&&/(^|\.)helorialabs\.com$/.test(location.hostname)) location.replace('https://'+location.host+location.pathname+location.search+location.hash);
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
/* (each way of drawing a thing sent once, not once for every thing drawn that way; and each sent on its own, not as a scene
   searched through for lights (a world with none: the town has its own light, in its shaders) or with its children sent again) */
function sendSets(sc,cam,sets){ if(!sets) return; let lit=false; sc.traverse(o=>{ if(o.isLight) lit=true; }); const done=new Set();
  intoTarget(()=>sc.traverseVisible(o=>{ if(!o.material||Array.isArray(o.material)||(lit&&hasLight(o))) return;
    for(const f of sets){ const m=f(o); if(!m||m===o.material) continue; const g=o.geometry, k=m.uuid+(o.isInstancedMesh?'i':'')+(o.isSkinnedMesh?'s':'')+(g?Object.keys(g.attributes).join()+'|'+Object.keys(g.morphAttributes||{}).join():'');
      if(done.has(k)) continue; done.add(k); const m0=o.material, kids=o.children; o.material=m; o.children=[];
      try{ renderer.compile(o,cam,lit?sc:null); }catch(e){} finally{ o.material=m0; o.children=kids; } } })); }
/* the page's next turn: whatever is waiting (a frame to draw, a click) goes first, then straight on */
const nextSlice=()=>new Promise(r=>{ const c=new MessageChannel(); c.port1.onmessage=()=>{ c.port1.close(); r(); }; c.port2.postMessage(0); });
/* every shader sent off so far is made (at once, where the browser makes them as they are first drawn with) */
const programsReady=()=>new Promise(res=>{ const ck=()=>{ let ok=true; try{ ok=renderer.info.programs.every(p=>p.isReady()); }catch(e){} if(ok) res(); else setTimeout(ck,10); }; ck(); });
/* every shader made is taken up now, behind the loader: its uniforms and attributes looked up, as three does the first time
   it draws with one. Where a shader is not quite finished that waits for it, so it waits here, not on the first frame that
   draws something no one has seen yet (the market's people by day, the rooms built after you land, the lamps at dusk) */
function takeUp(){ for(const p of renderer.info.programs){ try{ p.getUniforms(); p.getAttributes(); }catch(e){} } }
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
  await Promise.race([programsReady(),wait(8000)]); takeUp();
  try{ st.render(rt); }catch(e){ console.error('render cr',e); }
  st.exit(); renderer.setRenderTarget(null); rt.dispose(); }
/* ---------- the way down: from the moment the page opens, the rocket is coming down through the cloud ----------
   Earth is built while you come down through it, so there is nothing to wait for: no loader, only the way down. The cloud
   is drawn once, small and soft, as the page opens (three layers, far, middle and near, each a picture that repeats from
   top to bottom), and moved by the browser itself, not by the page: it keeps moving, smoothly, while the page is busy
   building Earth, however long that takes on a slow phone. The way down is heard from its first moment (the cloud, in
   00-core.js), and lasts at least DSC_MIN; once Earth is built and ready to draw, the cloud closes in white, and opens on
   the landing (in the same white the landing begins in), with Earth already there, every shader made. Where the browser
   holds the sound until a click or a tap, nothing comes down without it: the cloud drifts, the name waits, and it says so;
   the click brings it down, and Earth is built meanwhile */
const DSC={on:false,t0:0,an:[],out:false};
const DSC_MIN=2200;
const RMO=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* one layer of cloud: n clouds, each of a few overlapping puffs, a lit top over a shade underneath, drawn into the top half
   of the canvas so that it repeats from top to bottom, and copied into the bottom half: moved up by one half, it is back
   where it began */
function cloudTile(cv,W,H,seed,n,rMin,rMax,al){ cv.width=W; cv.height=H*2; const c=cv.getContext('2d'); let sd=seed; const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  c.save(); c.beginPath(); c.rect(0,0,W,H); c.clip();
  const disc=(x,y,r,col,a)=>{ for(const yy of [y-H,y,y+H]){ if(yy+r<0||yy-r>H) continue; const g=c.createRadialGradient(x,yy,0,x,yy,r);
      g.addColorStop(0,'rgba('+col+','+a+')'); g.addColorStop(.78,'rgba('+col+','+a+')'); g.addColorStop(1,'rgba('+col+',0)'); c.fillStyle=g; c.fillRect(x-r,yy-r,r*2,r*2); } };
  for(let i=0;i<n;i++){ const cx=rnd()*W, cy=rnd()*H, R=rMin+rnd()*(rMax-rMin), k=6+Math.floor(rnd()*5), P=[];
    for(let j=0;j<k;j++){ const u=(rnd()-.5)*2; P.push([cx+u*R*1.1, cy+(rnd()-.5)*R*.35-(1-Math.abs(u))*R*.28, R*(.45+rnd()*.38)*(1.15-Math.abs(u)*.4)]); }
    for(const [x,y,r] of P) disc(x,y+r*.22,r,'196,210,222',al*.92);   // the shade underneath
    for(const [x,y,r] of P) disc(x,y-r*.08,r*.9,'255,253,248',al); }   // the lit tops
  c.restore(); c.drawImage(cv,0,0,W,H,0,H,W,H); }
/* the cloud drawn, and set drifting slowly (as it does while it waits for a click): far, middle and near, each faster than the
   one behind it. [smaller than the screen by, seed, clouds, smallest and largest, how solid, seconds to cross the screen] */
function skyDraw(){ const L=[...document.querySelectorAll('#sky canvas')], vw=Math.max(320,innerWidth), vh=Math.max(320,innerHeight);
  const spec=[[3,7,10,.05,.11,.8,7.5],[3,13,6,.08,.16,.92,3.6],[4,29,3,.16,.26,.6,1.7]];
  DSC.an=L.map((cv,i)=>{ const [ds,sd,n,r0,r1,al,sec]=spec[i], W=Math.ceil(vw/ds), H=Math.ceil(vh/ds), big=Math.max(W,H*.75); try{ cloudTile(cv,W,H,sd,n,r0*big,r1*big,al); }catch(e){}
    if(RMO||!cv.animate) return null;
    try{ const an=cv.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,-50%,0)'}],{duration:sec*1000,iterations:Infinity}); an.playbackRate=.06; return an; }catch(e){ return null; } });
  $('#load').classList.add('idle'); }
const skyRate=v=>DSC.an.forEach(an=>{ if(!an) return; try{ if(an.updatePlaybackRate) an.updatePlaybackRate(v); else an.playbackRate=v; }catch(e){} });
/* and down: the name lifts away into the cloud, the cloud gathers speed past you, and the way down is heard */
function descend(){ if(DSC.on||S.mode!=='load') return; DSC.on=true; DSC.t0=performance.now(); S.ask=false;
  const ld=$('#load'); ld.classList.remove('ask'); ld.classList.add('desc');
  $$('.c',$('#mark')).forEach(c=>{ c.style.transitionDelay=(Math.random()*.25).toFixed(2)+'s'; }); ld.classList.add('go');
  S.mode='landing'; A.start(); A.cloud(1);
  /* (gathering speed over half a second, not at once: each step by the time gone, so a page too busy to take a step on time
     catches up at the next rather than lagging behind) */
  { const t=performance.now(); const up=()=>{ const k=Math.min(1,(performance.now()-t)/540); skyRate(.06+.94*k); if(k<1) setTimeout(up,60); }; up(); }
  outWhenReady(); }
/* out through the bottom of the cloud: once Earth is built and ready (and the way down has been long enough to be one), the
   cloud closes in white; the landing begins under the white (its first frames, the heaviest, drawn while nothing shows them),
   in the same white, held there until the cloud has gone; then it fades as the landing always has */
async function outWhenReady(){ while(!S.ready||performance.now()-DSC.t0<DSC_MIN) await wait(40);
  if(window.__TEST) await wait(1500);   // (under the tests' helper, which goes straight onto Earth the moment it is ready: it is given time to, so no landing ever starts under a test)
  if(DSC.out||S.mode!=='landing') return; DSC.out=true; DSC.t1=performance.now();
  if(!ST.cr){ dscStop(); enterEarth(); return; }   // (Earth could not be made: the plain page instead, see enterEarth)
  const ld=$('#load'); ld.classList.add('out'); await wait(440);
  if(S.mode!=='landing') return;   // (something has already put you on Earth in the meantime: the tests' own straight way in, see earth)
  S.flashMin=1; show('#chrome',true); enterEarth(); A.cloud(0);
  await nextFrame(); await nextFrame(); await nextFrame();
  ld.classList.add('gone'); await wait(320); S.flashMin=0; show('#load',false); dscStop(); }
/* the way down over: the cloud stopped and its sound let go (once out of the cloud; or the plain page instead; or the tests'
   straight way onto Earth) */
function dscStop(){ DSC.out=true; A.cloud(0); DSC.an.forEach(an=>{ try{ an&&an.cancel(); }catch(e){} }); }
/* the graphics card done with everything sent to it so far: a fence put in after it, and asked about once a turn, never
   waited on (that would hold the page), for at most a few seconds */
async function gpuDone(ms=6000){ let gl=null, f=null; try{ gl=renderer.getContext(); if(!gl.fenceSync) return; f=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0); gl.flush(); }catch(e){ return; }
  const t0=performance.now(); try{ while(performance.now()-t0<ms){ if(gl.getSyncParameter(f,gl.SYNC_STATUS)===gl.SIGNALED) break; await wait(30); } }catch(e){} finally{ try{ gl.deleteSync(f); }catch(e){} }
  DSC.gpu=Math.round(performance.now()-t0); }
/* (the one line under the name, until the way down begins: what is being made; and, where the sound waits for a click, that) */
const bootLine=t=>{ if(!S.ask) $('#boot').textContent=t; };
async function boot(){
  const mark=$('#mark'); // the mark's weight is the progress bar, where it waits for a click; one quiet line says what is being built
  mark.textContent=''; [...'Heloria'].forEach(ch=>{ const c=document.createElement('span'); c.className='c'; c.textContent=ch; mark.appendChild(c); });
  const setP=v=>{ mark.style.fontWeight=Math.round(100+700*v); };
  const ph=DSC.ph={}, pt=k=>{ ph[k]=Math.round(performance.now()); };   // (when each part of the way in was done, for the tests)
  setP(0); skyDraw(); soundOrAsk();
  /* the fonts asked for now and not waited for: Earth is built meanwhile (its signs are lettered at once and again when the
     dot-matrix type comes, if it had not; see dotoLater), and they are waited for (if they are still coming) once it is
     built, before the landing's words are shown. Waited for first, they held the whole build up by as long as they took
     to come (up to two and a half seconds on a slow connection) */
  const fontsIn=(async()=>{ try{ if(document.fonts.load) document.fonts.load('900 40px Doto').catch(()=>{}); await Promise.race([document.fonts.ready,wait(2500)]); }catch(e){} })();
  resize(); setP(.1);
  /* between the parts of Earth, the page's own turn rather than the next frame: a frame due is drawn and a click answered
     all the same, but the build does not stand idle waiting for one (nor for a graphics card busy making shaders) */
  pt('start'); bootLine('Building Earth'); await nextFrame(); if(ST.cr) ST.cr.pace=nextSlice; try{ await ST.cr.build(); }catch(err){ console.error('build cr',err); delete ST.cr; } if(ST.cr) delete ST.cr.pace; setP(.6);
  await fontsIn; const st=ST.cr; pt('built');
  if(st){ bootLine('Warming Earth'); await nextFrame(); await compileQuiet(st.scene,stCam,st.matSets); pt('compiled');
    /* (the graphics card's answer, by now long drawn: where it cannot draw the page's pictures, the plain page instead) */
    if(!rtWorks()){ document.documentElement.classList.add('nogl'); delete ST.cr; dscStop(); setP(1); $('#load').classList.add('ready'); S.ready=true; return; }
    await warmEarth(st); pt('warmed'); }
  setP(.9);
  /* nothing is drawn onto the page's own picture while the cloud is up: a picture drawn there has to be shown, and to show
     it the browser waits for the graphics card to finish everything sent to it (Earth's shaders, its first drawing), which
     would hold the cloud still (seen: three and a half seconds, on a slow one). The card is asked instead, without waiting,
     whether it has finished, while the cloud goes on moving; Earth's first picture is drawn under the cloud's white */
  renderer.setRenderTarget(null); await gpuDone(); pt('gpu');
  try{ await A.firstReady(); }catch(e){} pt('heard');   // (what you hear first, made: see firstReady)
  setP(1); $('#load').classList.add('ready'); S.ready=true; DSC.tr=performance.now();   // (and, if the way down has begun, out of the cloud: see outWhenReady)
}
/* the sound, asked for as the page opens. Where the browser lets it start without a click here (it carried the click on the
   front door over, as Chrome does; or Land is inside the front door, whose sound is already going), it is running at once,
   and down it comes. Where it does not (Safari, or anyone come straight to this address), nothing comes down silent: the cloud
   drifts, and the name waits, saying so (see askLand), for the first click, tap or key. (A browser that says outright whether
   it will let the sound start is taken at its word; any other is given a second to get it going, as one waking a pair of
   wireless headphones may need, while Earth is already being built) */
async function soundOrAsk(){ A.start(); let pol=null; try{ pol=navigator.getAutoplayPolicy?navigator.getAutoplayPolicy('audiocontext'):null; }catch(e){}
  const t0=performance.now(); if(pol!=='allowed'&&pol!=='disallowed') while(A.waiting&&S.mode==='load'&&performance.now()-t0<1000) await wait(25);
  /* (inside the front door, Land is asked for at once, behind the front door's own light, and shown only once that has
     gone over to Land's: the way down waits to be seen, while Earth is built meanwhile. The front door says when it is
     shown; failing that, Land looks for itself, and after a few seconds goes on regardless) */
  if(HOST){ const t1=performance.now(); while(S.mode==='load'&&!hostShown()&&performance.now()-t1<6000) await wait(40); }
  if(S.mode!=='load') return; if(!A.waiting||pol==='allowed') descend(); else askLand(); }
const hostShown=()=>{ if(HOST.shown) return true; try{ const f=window.frameElement; return !!f&&+getComputedStyle(f).opacity>.9; }catch(e){ return false; } };
/* (the one line, quiet, where the name was being built: what to do, on a phone or not) */
function askLand(){ if(DSC.on) return; S.ask=true; const b=$('#boot'); b.textContent=matchMedia('(pointer:coarse)').matches?'Tap to land':'Click to land'; $('#load').classList.add('ask');
  /* (the second given to the sound to start falls while Earth is being built, and a page that busy may hear late that it
     has: should it turn out to be running after all, with no click, down it comes by itself, as it would have) */
  const late=()=>{ if(!S.ask||S.mode!=='load'||DSC.on) return; if(A.on&&!A.waiting){ $('#load').classList.remove('ask'); descend(); } else setTimeout(late,200); };
  setTimeout(late,200); }

/* ---------- Land: straight down to Earth, in its own daylight, the colour the front door left you in. Any address of
   this page comes here (the old ones too: #land, and #aetos, where the rocket at the end of the walk used to go) ---------- */
document.documentElement.classList.add('landing');
/* on the site the address says where you are: /land. The page itself lives at untamed/, so its own address is kept to come
   back to; reloading /land goes to the front door */
const PAGE_URL=location.pathname, PRETTY='__PRETTY__'&&/^\/untamed\/(index\.html)?$/.test(PAGE_URL);   // only where the site is the whole domain
if(PRETTY&&!HOST){ try{ history.replaceState(null,'','/land'); }catch(e){} }
if(HOST) document.querySelectorAll('a[href]').forEach(a=>{ a.target='_top'; });   // (inside the front door: the way home is the whole page's)

/* the way in is by itself (see boot). The sound: a browser lets it start only once the page has had a click, a tap or a key.
   Come from the front door, it has (a click there counts here too, in the browsers that carry it to the next page of the
   same site), and the way down is heard from its first moment. Come straight here (a bookmark, a reload, or a browser that
   does not carry it), the first click, tap or key while the name waits starts the sound and brings it down with it */
['pointerdown','mousedown','click','keydown','touchend'].forEach(ev=>addEventListener(ev,()=>{ if(S.mode!=='load') return; if(!A.on||A.waiting) A.start();
  if(S.ask){ $('#load').classList.remove('ask'); descend(); } },{capture:true,passive:true}));

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
  show('#load',false); show('#chrome',true); A.start(); dscStop();
  S.mode='station'; S.stId='cr'; S.st=st; S.stSnap=true; st.enter(); show('#station',true); st.showUI(); return true; }
/* ?diag: how long each part of the way in took on this device, its graphics card, and whether it makes shaders in the
   background, in a small panel over the page (as the Walk's ?diag has it), to be read off a phone and sent back */
if(/[?&]diag(=|&|$)/.test(location.search)){ const el=document.createElement('pre'); el.id='diag';
  el.style.cssText='position:fixed;left:8px;bottom:8px;z-index:2147483647;margin:0;padding:8px 10px;max-width:calc(100vw - 16px);white-space:pre-wrap;font:11px/1.35 ui-monospace,Menlo,monospace;color:#1d1a16;background:rgba(255,253,248,.92);border:1px solid #2a241d;pointer-events:none';
  let gpu='?', par='?'; try{ const gl=renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info'); gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER); par=gl.getExtension('KHR_parallel_shader_compile')?'yes':'no'; }catch(e){}
  let walk=0; const row=(n,ms)=>(n+'                          ').slice(0,26)+(ms==null?'      -':String(Math.round(ms)).padStart(7)+' ms');
  const tick=()=>{ if(!document.body) return; if(!el.parentNode) document.body.appendChild(el); const p=DSC.ph||{}, c=ST.cr&&ST.cr._dbg&&ST.cr._dbg.cut?ST.cr._dbg.cut():null;
    if(!walk&&S.mode==='station'&&c&&!c.on&&DSC.t1) walk=performance.now();
    const d=(a,b)=>p[a]!=null&&p[b]!=null?p[b]-p[a]:null;
    el.textContent='Heloria Land, the way in\n'+navigator.userAgent+'\nGPU: '+gpu+'\nshaders made in the background: '+par+'\n\n'
      +[row('page and scripts',p.start),row('building Earth',d('start','built')),row('sending shaders',d('built','compiled')),row('warming Earth',d('compiled','warmed')),
        row('graphics card catching up',d('warmed','gpu')),row('first sounds',d('gpu','heard')),row('ready (from page open)',DSC.tr||null),
        row('out of the cloud',DSC.t1||null),row('landing scene',walk&&DSC.t1?walk-DSC.t1:null),row('walking (from page open)',walk||null)].join('\n'); };
  setInterval(tick,400); }
window.__heloria={A,finaleWhite,credits,earth,enterEarth,S,ST,post,renderer,stCam,rtW,postScene,ortho,DSC};

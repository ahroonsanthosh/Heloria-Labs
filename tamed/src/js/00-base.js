/* ================= HELORIA TAMED =================
   A pavilion of pale stone standing in still water at golden hour. One evening, one walk:
   scroll moves you through the place and moves the sun down the sky with you. */
/* ?diag on the address: a trail of what the page was doing, written into the browser as it goes, so that if a browser
   gives up on the page (it crashes and reloads) the next visit with ?diag can say what was happening at that moment.
   Nothing of it exists without ?diag */
const TRAIL=/[?&]diag(=|&|$)/.test(location.search)?(()=>{ let prev=null, prevAt=''; try{ const s=localStorage.getItem('heloria.trail'); if(s){ const t=JSON.parse(s); if(t&&!t.end&&t.ev&&t.ev.length){ prev=t.ev; prevAt=t.at||''; } } }catch(e){}
  const T0=performance.now(), ev=[], at=new Date().toLocaleTimeString(), save=end=>{ try{ localStorage.setItem('heloria.trail',JSON.stringify({ev:ev.slice(-48),end,at})); }catch(e){} };
  const add=s=>{ ev.push(((performance.now()-T0)/1000).toFixed(2)+'s  '+s); if(ev.length>200) ev.splice(0,100); save(false); };
  const who=e=>{ let t=e.target; return t&&t.closest?((t.closest('[id]')||{}).id||t.tagName||'?'):'page'; };
  ['pointerdown','pointerup','click','keydown'].forEach(n=>addEventListener(n,e=>add(n+' on '+who(e)+' (before the page answers)'),{capture:true,passive:true}));
  addEventListener('pagehide',()=>save(true)); addEventListener('error',e=>add('ERROR '+String(e.message||e.error||'').slice(0,140)),true);
  addEventListener('unhandledrejection',e=>add('ERROR promise '+String(e.reason&&e.reason.message||e.reason).slice(0,140)));
  add('page opened'); return {add,prev,prevAt}; })():null;
/* the way out of the walk, set by the build: on the site untamed/#land (Land, where the rocket at the end of the walk goes
   too); as an artifact, the whole site's link */
const LAND_URL='__LAND__';
/* on the site, the script and styles of the page Land opens (see ahead() in 90-main.js); none as an artifact */
const AHEAD='__AHEAD__'.split(' ').filter(Boolean);
/* on the site the address follows you: /walk while you walk. It is not a page of its own: reloading it, or going back,
   brings you to the front door again */
const SITE_ROOT=location.pathname.replace(/[^/]*$/,''), PRETTY='__PRETTY__'==='1'&&SITE_ROOT==='/';   // only where the site is the whole domain
const walkAddress=()=>{ if(!PRETTY) return; try{ history.pushState({walk:1},'',SITE_ROOT+'walk'); }catch(e){} };
addEventListener('popstate',()=>{ if(PRETTY&&S.mode!=='gate') location.replace(SITE_ROOT); });
const sameSite=u=>!/^https?:/.test(u);
/* the same tab when it is part of this site, a new one when it lives somewhere else */
const outLinks=d=>d.querySelectorAll('[data-land]').forEach(a=>{ a.href=LAND_URL; if(sameSite(LAND_URL)){ a.removeAttribute('target'); a.removeAttribute('rel'); } });
const PHOTOS=__PHOTOS__;
const T=window.THREE;
/* without three.js there is no place to walk through: keep the words, as a plain page */
if(!T){ const d=document; d.documentElement.classList.add('nogl'); const g=d.getElementById('gate'), b=d.getElementById('tamed');
  outLinks(d); g.classList.remove('loading'); g.classList.add('ready'); [...d.querySelectorAll('#word span')].forEach(l=>l.classList.add('in'));
  b.disabled=false; b.onclick=()=>{ g.style.display='none'; const u=d.getElementById('ui'); u.classList.add('on'); u.removeAttribute('aria-hidden'); d.getElementById('logo').classList.add('on'); };
  throw new Error('Heloria Tamed: three.js did not load, showing the plain page'); }
const TEST=!!window.__TEST, HQ=!!window.__HQ;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const inv=(a,b,v)=>clamp((v-a)/(b-a),0,1);
const sstep=(a,b,x)=>{const t=inv(a,b,x);return t*t*(3-2*t)};
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const E={io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, o:t=>1-Math.pow(1-t,3), o4:t=>1-Math.pow(1-t,4), i:t=>t*t*t, io2:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
const TAU=Math.PI*2, DEG=Math.PI/180;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(pointer: fine)').matches;
const TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0;
const SMALL=Math.min(screen.width||innerWidth,screen.height||innerHeight)<720;
const MOBILE=SMALL||(TOUCH&&!FINE);
const portrait=()=>innerWidth/innerHeight<.82;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
const col=h=>new T.Color(h);
const v3=(x,y,z)=>new T.Vector3(x,y,z);

/* the rooms, one for each project, in the order you walk through them: projects.json at the top of the repo, put here by
   the build. Each room's place in the line (its slot) is read from here, so its architecture, light, camera and sound all
   follow it. A project the walk has no room of its own for gets the plain one (buildRoom in 30-gallery.js) */
const PROJ=__PROJECTS__;
const SLOT={}; PROJ.forEach((p,k)=>{ SLOT[p.id]=k; });
const OWN_SOUND=['aetos','pharos','ogive','krios'];   // the rooms with a sound of their own (05-audio.js); any other has the plain room's
/* the rooms are at s 1 to ROOMS. Everything after them (the far arch, the courtyard, Team, Contact, the rocket) was laid
   out for four rooms and is moved along by MORE, the number of rooms past four; written as 4.45+MORE, it is the same place
   with any number of rooms */
const ROOMS=PROJ.length, MORE=ROOMS-4;
/* the sun's way down the sky was set for four rooms: a place on the walk as it would be with four, so it keeps its course */
const as4=s=>MORE===0||s<=1?s:s>=ROOMS?s-MORE:1+(s-1)*3/Math.max(1,ROOMS-1);
/* every place on the walk, in order. s is the place's position on the one continuous path */
const PLACES=[
  {id:'home',   name:'Home',    s:0, tint:'#FFF1DE', proj:-1},
  ...PROJ.map((p,k)=>({id:p.id, name:p.name, s:k+1, tint:p.col, proj:k})),
  {id:'team',   name:'Team',    s:ROOMS+1, tint:'#FFC9A0', proj:-1},
  {id:'contact',name:'Contact', s:ROOMS+2, tint:'#C7CCEA', proj:-1},
];
const placeById=id=>PLACES.find(p=>p.id===id);
/* the walk changes scene twice: through the front door into the gallery, and out of it into the courtyard */
const DOOR_IN=.5, DOOR_OUT=ROOMS+.5, BLEND=.085, MID=(DOOR_IN+DOOR_OUT)/2;   // MID: inside, between the two

/* the whole app's live state */
const S={ready:false, mode:'gate', s:0, t:0, dt:0, frame:0, hover:null, timeScale:1, proj:-1, entered:false};

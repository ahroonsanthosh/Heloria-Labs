/* ================= HELORIA TAMED =================
   A pavilion of pale stone standing in still water at golden hour. One evening, one walk:
   scroll moves you through the place and moves the sun down the sky with you. */
const UNTAMED_URL='__UNTAMED__';   // set by the build: untamed/ on the site, the untamed artifact's link as an artifact
/* the way to the wild site: the same tab when it is part of this site, a new one when it lives somewhere else */
const untamedLinks=d=>d.querySelectorAll('[data-untamed]').forEach(a=>{ a.href=UNTAMED_URL; if(!/^https?:/.test(UNTAMED_URL)){ a.removeAttribute('target'); a.removeAttribute('rel'); } });
const PHOTOS=__PHOTOS__;
const T=window.THREE;
/* without three.js there is no place to walk through: keep the words, as a plain page */
if(!T){ const d=document; d.documentElement.classList.add('nogl'); const g=d.getElementById('gate'), b=d.getElementById('tamed');
  untamedLinks(d); g.classList.remove('loading'); g.classList.add('ready'); [...d.querySelectorAll('#word span')].forEach(l=>l.classList.add('in'));
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

/* every place on the walk, in order. s is the place's position on the one continuous path */
const PLACES=[
  {id:'home',   name:'Home',    s:0, tint:'#FFF1DE', proj:-1},
  {id:'krios',  name:'Kríos',   s:1, tint:'#A5C3FF', proj:0},
  {id:'aetos',  name:'Aetos',   s:2, tint:'#F2EEE6', proj:1},
  {id:'pharos', name:'Pharos',  s:3, tint:'#FFD5B3', proj:2},
  {id:'ogive',  name:'Ogive',   s:4, tint:'#FFB475', proj:3},
  {id:'team',   name:'Team',    s:5, tint:'#FFC9A0', proj:-1},
  {id:'contact',name:'Contact', s:6, tint:'#C7CCEA', proj:-1},
];
const PROJ=[
  {id:'krios', name:'Kríos', col:'#A5C3FF', kind:'Voice practice for sales teams'},
  {id:'aetos', name:'Aetos', col:'#F2EEE6', kind:'Counter-drone command software'},
  {id:'pharos',name:'Pharos',col:'#FFD5B3', kind:'GPS-free drone navigation'},
  {id:'ogive', name:'Ogive', col:'#FFB475', kind:'AI tools for OpenRocket'},
];
const placeById=id=>PLACES.find(p=>p.id===id);
/* the walk changes scene twice: through the front door into the gallery, and out of it into the courtyard */
const DOOR_IN=.5, DOOR_OUT=4.5, BLEND=.085;

/* the whole app's live state */
const S={ready:false, mode:'gate', s:0, t:0, dt:0, frame:0, hover:null, timeScale:1, proj:-1, entered:false};

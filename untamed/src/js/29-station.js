/* ================= THE PAGE'S STATE, AND EARTH'S FRAME ================= */
/* mode: 'load' behind the loader, 'landing' as the word lifts away, 'station' on Earth, 'credits' on the white page */
const S={mode:'load',t:0,rdt:0,flash:0,shake:0,st:null,stId:null};
/* the keys held down (Earth walks on them) */
const keys=new Set();
addEventListener('keydown',e=>{ if(e.target.closest&&e.target.closest('input')) return; keys.add(e.code); });
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
/* a press on the picture is Earth's to answer */
canvas.addEventListener('pointerdown',e=>{ if(S.mode==='station'&&S.st&&S.st.onPointer) return S.st.onPointer(e); });
/* noise for Earth's shaders */
const EARTH_GLSL=`
float eh(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float en(vec3 x){ vec3 i=floor(x),f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(eh(i),eh(i+vec3(1,0,0)),f.x),mix(eh(i+vec3(0,1,0)),eh(i+vec3(1,1,0)),f.x),f.y),mix(mix(eh(i+vec3(0,0,1)),eh(i+vec3(1,0,1)),f.x),mix(eh(i+vec3(0,1,1)),eh(i+vec3(1,1,1)),f.x),f.y),f.z); }
float efbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*en(p); p*=2.1; a*=.5; } return s; }
float eland(vec3 d){ return efbm(d*2.3+vec3(3.1,1.7,.4))+.5*smoothstep(.8,.93,d.y)-.53; }`;

/* the frame Earth is built in: its scene, its camera (camP, camL: where it wants the camera this frame), its article on
   the page, and what it does as you arrive (enter), leave (exit) and walk about (update) */
const ST={};
function mkStation(id,impl){
  const el=$(`.st[data-st=${id}]`);
  const st=Object.assign({id,el,scene:new T.Scene(),camP:new T.Vector3(0,3,12),camL:new T.Vector3(0,0,0),state:'menu',
    setState(s){ this.state=s; el.classList.remove('is-menu','is-play','is-res'); el.classList.add('is-'+s);
      if(s==='menu'&&el.classList.contains('on')) reveal($('.card',el));
      // the panel under the pointer changed: drop the hover cursor and any focus left on a control that just hid
      curReset(); const f=document.activeElement; if(f&&f!==document.body&&el.contains(f)&&!f.matches('input,textarea,select')) f.blur(); },
    showUI(){ el.classList.add('on'); this.setState('menu'); },
    hideUI(){ unreveal($('.card',el)); el.classList.remove('is-play','is-res'); setTimeout(()=>{ if(S.st!==st||S.mode!=='station') el.classList.remove('on'); },700); },
    build(){}, enter(){}, exit(){}, update(){}, abort(){}
  },impl);
  ST[id]=st; return st;
}

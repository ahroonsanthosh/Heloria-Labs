/* ================= STATION FRAMEWORK ================= */
const ST={};
const _pv=new T.Vector3();
function proj(v,cam){ _pv.copy(v).project(cam); return {x:(_pv.x*.5+.5)*innerWidth,y:(-_pv.y*.5+.5)*innerHeight,z:_pv.z}; }
function mkStation(id,impl){
  const el=$(`.st[data-st=${id}]`);
  const st=Object.assign({id,el,scene:new T.Scene(),camP:new T.Vector3(0,3,12),camL:new T.Vector3(0,0,0),arrive:new T.Vector3(0,2.5,8),state:'menu',anchors:[],gameT:0,
    setState(s){ this.state=s; el.classList.remove('is-menu','is-play','is-res'); el.classList.add('is-'+s);
      if(s==='menu'&&el.classList.contains('on')) reveal($('.card',el)); if(s!=='play') cursorAim(false);
      // the panel under the pointer changed: drop the hover cursor and any focus left on a control that just hid
      curReset(); const f=document.activeElement; if(f&&f!==document.body&&el.contains(f)&&!f.matches('input,textarea,select')) f.blur(); },
    showUI(){ el.classList.add('on'); this.setState('menu'); },
    hideUI(){ unreveal($('.card',el)); el.classList.remove('is-play','is-res'); setTimeout(()=>{ if(S.stId!==id||S.mode!=='station') el.classList.remove('on'); },700); },
    result(o){ // o: {grade, score, key, stats, text, assisted}
      const best=store.get(id,0), isNew=!o.assisted&&o.score>best; if(isNew) store.set(id,o.score);
      const B=Math.max(best,o.assisted?0:o.score); const bEl=$('#'+id+'Best'); if(bEl) bEl.textContent=B>0?'Best '+fmt(B):'';
      const gEl=$('#'+id+'G'); gEl.removeAttribute('data-sp'); gEl.classList.add('pw'); gEl.textContent=o.grade; $('#'+id+'Final').textContent=fmt(o.score);
      const nw=$('#'+id+'New'); if(nw) nw.textContent=o.assisted?'Assisted':isNew?'New best':'Best '+fmt(best);
      $('#'+id+'Stats').innerHTML=statsHTML(o.stats); $('#'+id+'P').textContent=o.text||'';
      prepPW(gEl); this.setState('res'); reveal($('.res',el)); S.games++;
      // a finger still tapping the game must not land on the panel that just appeared under it
      el.classList.add('rguard'); clearTimeout(this._rg); this._rg=setTimeout(()=>el.classList.remove('rguard'),750);
    },
    build(){}, enter(){}, exit(){}, update(){}, play(){}, abort(){}
  },impl);
  { const bEl=$('#'+id+'Best'), b=store.get(id,0); if(bEl) bEl.textContent=b>0?'Best '+fmt(b):''; } // no 'Best 0' before a first game
  // the index on the title card follows the order of the stations in orbit
  { const si=STA.findIndex(s=>s.id===id), ix=$('.idx span:first-child',el); if(ix&&si>=0) ix.textContent=String(si+1).padStart(2,'0')+' / '+String(NST).padStart(2,'0'); }
  st.start=()=>{ if(S.mode!=='station'||S.stId!==id) return; const f=document.activeElement; if(f&&f!==document.body&&!f.matches('input,textarea,select')) f.blur(); A.stinger(2); A.whoosh(true,.8,.14); st.play(); };
  $$('[data-play]',el).forEach(b=>b.addEventListener('click',st.start));
  $$('[data-back]',el).forEach(b=>b.addEventListener('click',()=>undock()));
  // every station sits in the same sky: a sparse starfield with a faint warm haze toward the hole
  st.scene.add(pts(cloud(Math.floor(1800*Q+400),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),R=90+r[2]*40;o[0]=Math.sin(b)*Math.cos(a)*R;o[1]=Math.cos(b)*R;o[2]=Math.sin(b)*Math.sin(a)*R;}),
    PM({size:.75,color:'#E8DECF',body:'b=.14+.7*pow(aR.x,7.); col=mix(uCol,vec3(.75,.84,1.),aR.y*.6);'})));
  // annotation leader lines
  st.notes=$$('.note',el); const nl=$('.notes',el); st.noteOff=st.notes.length===2?1:0; // two notes: they describe anchors 1 and 2
  st.leads=st.notes.map(()=>{ const h=document.createElement('i'); h.className='ld h'; const d=document.createElement('i'); d.className='ld d'; const p=document.createElement('i'); p.className='ld p'; nl.appendChild(h); nl.appendChild(d); nl.appendChild(p); return {h,d,p}; });
  ST[id]=st; return st;
}
function notesUpdate(st){
  if(!st.notes||!st.notes.length||NARROW()) return;
  const W=innerWidth, H=innerHeight, nw=Math.min(250,W*.22), x0=W-nw-54;
  let y=H*.2; const gap=Math.max(26,H*.05);
  st.notes.forEach((n,i)=>{ if(!n._h) n._h=n.offsetHeight||70; n.style.transform=`translate(${x0}px,${y}px)`; const a=st.anchors[i+st.noteOff], L=st.leads[i];
    if(a&&L){ const p=proj(a,stCam); const ny=y+12, ex=x0-28; const ok=p.z<1&&isFinite(p.x)&&isFinite(p.y);
      L.h.style.transform=`translate(${ex}px,${ny}px)`; L.h.style.width='24px';
      const dx=p.x-ex, dy=p.y-ny, len=Math.hypot(dx,dy); L.d.style.width=len+'px'; L.d.style.transform=`translate(${ex}px,${ny}px) rotate(${Math.atan2(dy,dx)}rad)`;
      L.p.style.transform=`translate(${p.x-2.5}px,${p.y-2.5}px)`; L.d.style.opacity=L.p.style.opacity=ok?'':'0'; }
    y+=n._h+gap; });
}
function popAt(container,v3,text,cls){
  const p=proj(v3,stCam); const el=document.createElement('span'); el.className='pop '+(cls||''); el.textContent=text;
  el.style.left=p.x+'px'; el.style.top=p.y+'px'; el.style.transform='translate(-50%,-50%)';
  container.appendChild(el); setTimeout(()=>el.remove(),1050);
}
function statsHTML(rows){ return rows.map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join(''); }
const _tint=new T.Color();
function feedback(shake,ca,tint){ S.shake=Math.max(S.shake,shake||0); S.ca=Math.max(S.ca,ca||0);
  if(tint){ const c=tint.isColor?tint:_tint.setRGB(+tint.x||+tint.r||0,+tint.y||+tint.g||0,+tint.z||+tint.b||0); if(isFinite(c.r+c.g+c.b)) post.uniforms.uTint.value.add(c); } }
function showBanner(el,h,sub){ el.innerHTML=`<span class="ui acc fade">${sub||''}</span><h3 class="disp pw">${h}</h3>`; prepPW($('h3',el)); reveal(el); clearTimeout(el._t); el._t=setTimeout(()=>unreveal(el),1500); }

/* Enter starts the game from a station's title screen */
addEventListener('keydown',e=>{ if(e.code!=='Enter'||e.repeat||S.mode!=='station'||!S.st||S.st.state!=='menu') return; const f=document.activeElement; if(f&&f!==document.body&&f.closest&&f.closest('input,textarea,select,a,button,[role=button]')) return; e.preventDefault(); S.st.start(); });

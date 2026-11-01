/* ================= STATION FRAMEWORK ================= */
const ST={};
function mkStation(id,impl){
  const el=$(`.st[data-st=${id}]`);
  const st=Object.assign({id,el,scene:new T.Scene(),camP:new T.Vector3(0,3,12),camL:new T.Vector3(0,0,0),arrive:new T.Vector3(0,3,9),state:'menu',
    setState(s){ this.state=s; el.classList.remove('is-menu','is-play','is-res'); el.classList.add('is-'+s);
      if(s==='menu'&&el.classList.contains('on')) reveal($('.dos',el)); if(s!=='play') cursorAim(false); },
    showUI(){ el.classList.add('on'); this.setState('menu'); },
    hideUI(){ unreveal($('.dos',el)); el.classList.remove('is-play','is-res'); setTimeout(()=>{ if(S.stId!==id||S.mode!=='station') el.classList.remove('on'); },700); },
    build(){}, enter(){}, exit(){}, update(){}, play(){}, abort(){}
  },impl);
  $$('[data-play]',el).forEach(b=>b.addEventListener('click',()=>{ A.whoosh(true,.7,.15); st.play(); }));
  $$('[data-back]',el).forEach(b=>b.addEventListener('click',()=>undock()));
  // a soft starfield so every station sits in the same universe
  st.scene.add(pts(cloud(Math.floor(1600*Q+400),(i,r,o)=>{const a=r[0]*TAU,b=Math.acos(2*r[1]-1),R=80+r[2]*40;o[0]=Math.sin(b)*Math.cos(a)*R;o[1]=Math.cos(b)*R;o[2]=Math.sin(b)*Math.sin(a)*R;}),
    PM({size:.8,color:'#d9d2ff',body:'b=.18+.6*pow(aR.x,6.);'})));
  ST[id]=st; return st;
}
function popAt(container,v3,text,cls){
  const p=v3.clone().project(stCam); const el=document.createElement('span'); el.className='pop '+(cls||''); el.textContent=text;
  el.style.left=((p.x*.5+.5)*innerWidth)+'px'; el.style.top=((-p.y*.5+.5)*innerHeight)+'px'; el.style.transform='translate(-50%,-50%)';
  container.appendChild(el); setTimeout(()=>el.remove(),950);
}
function statsHTML(rows){ return rows.map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join(''); }
function feedback(shake,ca,tint){ S.shake=Math.max(S.shake,shake||0); S.ca=Math.max(S.ca,ca||0); if(tint) post.uniforms.uTint.value.add(tint); }

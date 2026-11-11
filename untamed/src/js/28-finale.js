/* ================= THE END OF THE LAST FLIGHT =================
   The last flight ends over Earth. You hold to launch, the rocket climbs through the clouds until the sky goes black, and
   the camera rises above it to look back down at the town; then the light takes over, and a white page: who made this,
   and why. (Earth runs all of that itself and calls finaleWhite at the end.) */
const holdEl=$('#holdp'), finEl=$('#fin');
/* Earth hands over here, already white: it puts itself back as it was behind the page */
function finaleWhite(){ if(S.mode==='credits') return; const st=ST.cr;
  if(st){ st.finaleEnd&&st.finaleEnd(); st.abort(); st.hideUI(); show('#station',false); st.el.classList.remove('on'); st.exit(); }
  S.st=null; S.stId=null; credits(); }

/* the white page */
function credits(){ if(S.mode==='credits') return; S.mode='credits'; S.flashMin=1; post.uniforms.uFlash.value=1; post.uniforms.uLight.value.z=1;   /* the white of the page itself */
  A.hush(); A.update(S.t,{sub:0,pad:.45}); A.credits(); holdEl.classList.remove('on','go');
  finEl.hidden=false; requestAnimationFrame(()=>finEl.classList.add('on')); }
/* Land again: the page from its start, the loader and the rocket coming down. On the site that is the page's own address
   (/land, where the address bar is, would go to the front door) */
$('#finAgain').addEventListener('click',()=>{ if(PRETTY){ location.assign(PAGE_URL); return; } location.reload(); });
$('#finWalk').addEventListener('click',()=>{ A.hush&&A.hush(); });

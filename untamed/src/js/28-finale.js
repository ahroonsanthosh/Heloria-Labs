/* ================= THE END OF THE LAST FLIGHT =================
   The last flight ends over Earth. You hold to launch, the rocket climbs through the clouds until the sky goes black, and
   the camera rises above it to look back down at the town; then the light takes over, and a white page: who made this,
   and why. (Earth runs all of that itself and calls finaleWhite at the end.) */
const holdEl=$('#holdp'), finEl=$('#fin');
/* Earth hands over here, already white: it puts itself back as it was behind the page */
function finaleWhite(){ if(S.mode==='credits') return; const st=ST.cr;
  if(st){ st.finaleEnd&&st.finaleEnd(); st.abort(); st.hideUI(); show('#station',false); st.el.classList.remove('on'); st.exit(); }
  S.st=null; S.stId=null; S.iris=0; credits(); }

/* the white page */
function credits(){ if(S.mode==='credits') return; S.mode='credits'; S.flashMin=1; post.uniforms.uFlash.value=1;
  A.hush(); A.update(S.t,{sub:0,pad:.45,bright:.18}); A.credits(); holdEl.classList.remove('on','go');
  $('#finAgain').textContent=S.entry==='fly'?'Fly again':'Fly the whole thing';
  finEl.hidden=false; requestAnimationFrame(()=>finEl.classList.add('on')); }
/* again, from the very beginning: the whole flight, whichever way you came in */
/* Fly again, or the whole thing from the start: the same page with no way in on its address. A preview built to open on
   Land or Aetos has the whole thing somewhere else, so it opens that */
const FLY_URL='__FLY__';
$('#finAgain').addEventListener('click',()=>{ if(FLY_URL){ window.open(FLY_URL,'_blank','noopener'); return; }
  if(location.hash) history.replaceState(null,'',location.pathname+location.search); location.reload(); });
$('#finWalk').addEventListener('click',()=>{ A.hush&&A.hush(); });

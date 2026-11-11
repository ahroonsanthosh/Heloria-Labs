/* ================= THE RECORDINGS, KEPT =================
   The long sounds (see the recordings in 05-audio.js) are worked out once, at the start of a visit, which keeps a
   processor busy for a while. Once made, each is kept in the browser's own store (Cache Storage, which a page may write
   to without asking), under its name and a fingerprint of the code that makes it, so a later visit plays the very
   recording the first one made and works nothing out again. Code that makes the sounds differently has another
   fingerprint, so its sounds are made afresh, and the recordings kept for the old code are cleared away.
   Where the store is missing, full, closed or slow (a private window, a page opened from a file), every sound is made as
   before; nothing here waits for long. A first visit does not ask the store at all (a note in localStorage says whether
   anything has been kept for this code), so its sounds are started as soon as they always were */
const KEEP=(()=>{
  const V='__SOUNDV__', PRE='/__sounds/walk/', asked=new Map();
  const NOTE='heloria.sounds.walk'; let box=null, seek=false;
  try{ seek=localStorage.getItem(NOTE)===V; }catch(e){}
  const open=()=>box||(box=(async()=>{ try{ return window.caches&&window.isSecureContext?await caches.open('heloria-sounds'):null; }catch(e){ return null; } })());
  const soon=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(()=>r(null),ms))]);
  const at=n=>new URL(PRE+V+'/'+n,location.href).href;
  const look=async n=>{ if(!seek) return null; try{ const c=await soon(open(),8000); if(!c) return null; const r=await soon(c.match(at(n)),8000); if(!r) return null;
    const b=await soon(r.blob(),8000); return b?{blob:b,rms:+r.headers.get('x-rms')}:null; }catch(e){ return null; } };
  return {
    /* asked for all at once, as the page starts, so the store answers for every one together */
    want(names){ for(const n of names) if(!asked.has(n)) asked.set(n,look(n)); },
    /* the recording kept under this name, as {blob, rms}, or null */
    get(n){ const p=asked.get(n)||look(n); asked.delete(n); return p; },
    /* and kept: the bytes as they are, with how loud they are (a number written out in full comes back exactly) */
    put(n,blob,rms){ open().then(c=>c&&c.put(at(n),new Response(blob,{headers:{'content-type':blob.type||'application/octet-stream','x-rms':String(rms)}})).then(()=>{ try{ localStorage.setItem(NOTE,V); }catch(e){} })).catch(()=>{}); },
    /* once every sound is made: those kept for code that is no longer this page's go */
    tidy(){ open().then(async c=>{ if(!c) return; for(const q of await c.keys()){ const p=new URL(q.url).pathname; if(p.startsWith(PRE)&&!p.startsWith(PRE+V+'/')) await c.delete(q); } }).catch(()=>{}); }
  };
})();

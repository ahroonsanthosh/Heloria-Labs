/* ================= KRÍOS: DEAD AIR =================
   A sales call drawn on a dot-matrix board. The buyer talks on the top track, you answer on the bottom one, and time
   flows right to left through a fixed now line. Wait until she has really finished, start inside the window, and stop
   when your line is said. One control: tap to talk and tap again to stop, or hold and let go. */
(()=>{
const st=mkStation('kr',{arrive:new T.Vector3(.4,1,4.6)});
const sc=st.scene, el=st.el, q=s=>$(s,el);

/* ---------- the call ---------- */
const LINES=[
  {her:"Hi, this is Dana. I've got five minutes. What's this about?", you:"Thanks, Dana. We help reps practise calls before the real ones."},
  {her:"We already use something for call coaching... | it's fine, honestly.", you:"Fair. Can your reps practise before a call, or only review after?"},
  {her:"How long does it take to set up?", you:"About a day. Your reps can start this week."},
  {her:"Okay. And what does it cost per seat?", you:"It depends on the team. I can send you numbers today."},
  {her:"I'd need to run that past... | my head of sales.", you:"Of course. Would it help if I joined that call?"},
  {her:"Can you send me something I can share with her?", you:"Yes. A one-page summary, this afternoon."},
  {her:"Alright. What's the next step?", you:"A short demo with you both. Does Thursday work?"}
];
const HELLO="Hello? Are you still there?";
const OUT=[[80,'Demo booked',"Thursday works. Send me the invite."],[60,'Follow-up set',"Okay. Send that over and we'll talk next week."],
  [40,'Send an email',"Look, just send me an email."],[-1,'She hung up',"Sorry, I have to jump on another call."]];
const FILL=['and,','um,','basically,','so,','yeah,','the','thing','is,','like,','um,','you','know,'];
const GR={perfect:{t:'Perfect',c:'ice',m:12},clean:{t:'Clean',c:'ink',m:8},late:{t:'Late',c:'hot',m:-3},short:{t:'Too short',c:'hot',m:-5},
  ramble:{t:'Rambling',c:'hot',m:-8},tuned:{t:'She tuned out',c:'alarm',m:-10},cut:{t:'Cut off',c:'alarm',m:-14},dead:{t:'Dead air',c:'alarm',m:-12}};
/* seconds: lead-in before a line, her mid-sentence pause, the start window, slow start, no answer, bracket around the end of
   your line, how long past it before she stops listening, the beat after a grade, and the press length that means push-to-talk */
const LEAD=.8, TRAP=1.1, WIN0=.12, WIN1=.85, SLOW=1.6, DEAD=3.4, BR0=.45, BR1=.55, OVER=2.4, BEAT=1.55, HOLD=.3;

/* ---------- clock: real time, so speech, audio and input agree; it stops while the tab is hidden ---------- */
const CLK={off:0,stop:0,get t(){ return (this.stop||performance.now()/1000)-this.off; },
  hold(){ if(!this.stop) this.stop=performance.now()/1000; }, go(){ if(this.stop){ this.off+=performance.now()/1000-this.stop; this.stop=0; } },
  set(t){ this.off=(this.stop||performance.now()/1000)-t; }};

/* ---------- words: syllables, vowels and onsets drive both the formant voice and the board ---------- */
function syl(w){ w=w.toLowerCase().replace(/[^a-z]/g,''); if(w.length<=3) return 1; w=w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'').replace(/^y/,''); const m=w.match(/[aeiouy]{1,2}/g); return Math.max(1,m?m.length:1); }
const VMAP={a:5,e:1,i:2,o:3,u:4,y:2,ai:1,ay:1,ee:2,ea:2,ie:2,oo:4,ou:4,ow:3,oa:3,au:3,aw:3,ei:1,ey:1,oi:3,oy:3,ue:4};
function vow(w){ const m=w.toLowerCase().match(/[aeiouy]{1,2}/g)||['a']; return m.map(v=>VMAP[v]??VMAP[v[0]]??0); }
function ons(w){ const s=w.toLowerCase().replace(/[^a-z]/g,''), m=s.match(/^[^aeiou]+/); if(!m) return 0; const c=m[0];
  if(/^(sh|ch|j)/.test(c)) return 2; if(/^th/.test(c)) return 6; if(/^[szx]/.test(c)||/^c[eiy]/.test(s)) return 1; if(/^[td]/.test(c)) return 3;
  if(/^[kcgq]/.test(c)) return 4; if(/^[pb]/.test(c)) return 5; if(/^[fv]/.test(c)) return 6; if(/^h/.test(c)) return 7; return 0; }
function words(text){ return text.split(/\s+/).filter(x=>x&&x!=='|').map(w=>({w,s:syl(w),v:vow(w),c:ons(w),p:/\.\.\.$/.test(w)?3:/[.?!]$/.test(w)?2:/[,;:]$/.test(w)?1:0,el:null,lit:false})); }
/* syllable timing and pitch for a run of words starting at clock time t0. trail: the run stops mid-sentence */
function plan(ws,t0,o){
  const sy=[], at=[]; let t=t0; const n=ws.length, last=ws[n-1]||{w:''}, qn=/\?$/.test(last.w), trail=!!o.trail;
  ws.forEach((w,i)=>{ at.push(t); const k=w.s, end=i===n-1, prog=i/Math.max(1,n-1), amp=.86+Math.random()*.14;
    for(let j=0;j<k;j++){ let d=.152/o.spd; if(j===0&&k>1) d+=.022; if(j===k-1) d+=.03; if(end&&j===k-1) d+=trail?.17:.07;
      let p=o.base*(1-.12*prog)*(j===0&&k>1?1.06:1);
      if(end){ if(qn) p*=1+.26*(j+1)/k; else if(trail) p*=1.05; else p*=.9-.05*j; }
      sy.push({t,d,p:p*(1+(Math.random()-.5)*.035),v:w.v[j%w.v.length],c:j===0?w.c:0,a:(j===0?1:.84)*amp,wi:(o.wi0||0)+i}); t+=d; }
    t+=.045; if(w.p===1) t+=.17; else if((w.p===2||w.p===3)&&!end) t+=.27; });
  return {sy,at,end:t};
}
const HER_O={base:214,spd:1}, YOU_O={base:122,spd:1.04};
const shift=(sy,dt)=>sy.map(s=>({t:s.t+dt,d:s.d,a:s.a,v:s.v,p:s.p,c:s.c,wi:s.wi}));

/* ---------- the formant voice: hers when the browser has no speech voices, and always yours ---------- */
const VF=[[730,1090,2440],[530,1840,2480],[270,2290,3010],[570,840,2410],[440,1020,2240],[660,1720,2410]];
const CN=[null,[[4800,6800,8800],.075,.07],[[2400,3400,5200],.085,.06],[[3800,5200,7000],.028,.08],[[1800,2700,3600],.032,.07],[[900,1500,2400],.022,.05],[[2800,5600,8400],.06,.035],[[1200,2200,3200],.05,.03]];
let AV=null;
function audio(){
  if(AV||!A.ctx) return AV; const ctx=A.ctx;
  try{
    const her=A.voice(0), cv=A.voice(0), you=A.voice(1); if(!her||!cv||!you) return null;
    // soften the raw sawtooth before the formants (closer to a glottal pulse) and give both voices a little vibrato
    [her,you].forEach((v,i)=>{ v.o.disconnect(); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=i?2300:3300; lp.Q.value=.4; v.o.connect(lp); v.bs.forEach(b=>lp.connect(b));
      const lfo=ctx.createOscillator(); lfo.frequency.value=i?4.6:5.4; const lg=ctx.createGain(); lg.gain.value=i?1.6:2.8; lfo.connect(lg); lg.connect(v.o.frequency); lfo.start(); });
    // one looping noise source: consonants through their own formant bank, and a breath under her vowels
    const nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate), d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const ns=ctx.createBufferSource(); ns.buffer=nb; ns.loop=true; cv.o.disconnect(); try{ cv.o.stop(); }catch(e){}
    cv.bs.forEach(b=>{ b.Q.value=1.3; ns.connect(b); }); const br=ctx.createGain(); br.gain.value=.035; ns.connect(br); her.bs.forEach(b=>br.connect(b)); ns.start();
    AV={her,cv,you};
  }catch(e){ AV=null; }
  return AV;
}
/* schedule syllables on the audio clock, so the voice keeps time however slow the frames are */
function sing(v,sy,lvl,who,cv){
  const ctx=A.ctx; if(!ctx||!v||!A.on) return; const k=who?.92:1.08, base=ctx.currentTime-CLK.t, now=ctx.currentTime;
  try{ for(const s of sy){ if(base+s.t<now-.005) continue; const t=Math.max(now,base+s.t), F=VF[s.v];
    v.bs.forEach((b,i)=>b.frequency.setTargetAtTime(F[i]*k,t,.018)); v.o.frequency.setTargetAtTime(s.p,t,.028);
    v.g.gain.setTargetAtTime(lvl*s.a,t+(s.c&&s.c<7?.022:0),.014); v.g.gain.setTargetAtTime(0,t+s.d*.8,.03);
    const C=cv&&CN[s.c]; if(C){ cv.bs.forEach((b,i)=>b.frequency.setValueAtTime(C[0][i],t)); cv.g.gain.setTargetAtTime(C[2]*lvl*5,t,.004); cv.g.gain.setTargetAtTime(0,t+C[1],.012); } } }catch(e){}
}
function hush(v){ if(!v||!A.ctx) return; const t=A.ctx.currentTime; try{ [v.g.gain,v.o.frequency,...v.bs.map(b=>b.frequency)].forEach(p=>p.cancelScheduledValues(t)); v.g.gain.setTargetAtTime(0,t,.02); }catch(e){} }

/* ---------- the speech voice: Web Speech when it has voices, an Irish or British woman if there is one ---------- */
const FEM=/female|moira|emily|hazel|susan|libby|sonia|maisie|kate|serena|stephanie|martha|fiona|karen|samantha|zira|aria|jenny|\bava\b|allison|victoria|tessa|veena|catherine|amy|emma|olivia|siobhan|niamh|orla|sinead|aoife|clara|isla|abbie|bella|hollie|\bmia\b|joanna|salli|kimberly|\bivy\b|kendra|natasha|michelle|elsa|evie|ellie|nora|ruth/i;
const MALE=/\bmale\b|daniel|arthur|george|ryan|thomas|oliver|rishi|\balex\b|\bfred\b|david|\bmark\b|\bguy\b|connor|james|william|brian|matthew|justin|joey|russell|\breed\b|ralph|albert|bruce|aaron|gordon|noah|\beric\b|christopher|roger|andrew|brandon|davis|jason|\btony\b|liam|ethan|elliot|alfie|harry|\btom\b/i;
const JUNK=/bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|zarvox|wobble|deranged|hysterical|junior|kathy|princess|grandma|grandpa|\bflo\b|sandy|eddy|rocko|shelley/i;
const TTS={ok:false,v:null,keep:[],broken:false,used:false,
  init(){ const ss=window.speechSynthesis; if(!ss||typeof SpeechSynthesisUtterance!=='function') return;
    const pick=()=>{ let best=null,bs=0; try{ for(const v of ss.getVoices()){ const s=this.score(v); if(s>bs){ bs=s; best=v; } } }catch(e){} this.v=best; this.ok=!!best; };
    pick(); try{ ss.addEventListener('voiceschanged',pick); }catch(e){ ss.onvoiceschanged=pick; } },
  score(v){ const l=(v.lang||'').toLowerCase().replace('_','-'); if(!/^en/.test(l)||JUNK.test(v.name)) return 0;
    let s=10; if(l==='en-ie') s+=40; else if(l==='en-gb') s+=30; else if(/en-(au|nz|za)/.test(l)) s+=12; else if(l==='en-us') s+=8;
    if(FEM.test(v.name)) s+=25; if(MALE.test(v.name)&&!/female/i.test(v.name)) s-=30; if(/natural|neural|enhanced|premium/i.test(v.name)) s+=8; if(v.localService) s+=4; return Math.max(1,s); },
  live(){ return this.ok&&!!this.v&&!this.broken&&A.on; },
  say(text,h){ try{ const u=new SpeechSynthesisUtterance(text); u.voice=this.v; u.lang=this.v.lang; u.rate=1.02; u.pitch=1.04; u.volume=1;
    u.onstart=h.start; u.onboundary=h.word; u.onend=h.end; u.onerror=h.err; this.keep.push(u); if(this.keep.length>8) this.keep.shift(); // keep a reference, or Chrome may drop onend
    speechSynthesis.speak(u); }catch(e){ this.broken=true; h.err({error:'throw'}); } },
  unlock(){ if(!this.ok||this.unlocked) return; this.unlocked=true; try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(e){} },
  stop(){ for(const u of this.keep){ u.onstart=u.onboundary=u.onend=u.onerror=null; } this.keep.length=0; try{ if(window.speechSynthesis&&(speechSynthesis.speaking||speechSynthesis.pending)) speechSynthesis.cancel(); }catch(e){} }
};

/* ---------- the board: one curved plane, every dot drawn in the shader from a scrolling data texture ---------- */
const RATE=60, N=1200, M=3, CLEAR=8; // slots per second, ring length (20 s), frame margin in dots, seconds behind now that the guide row is wiped
const DB=new Uint8Array(N*2*4);
const tex=new T.DataTexture(DB,N,2,T.RGBAFormat); tex.magFilter=tex.minFilter=T.LinearFilter; tex.wrapS=T.RepeatWrapping; tex.generateMipmaps=false; tex.needsUpdate=true;
const LAY={w:{cols:Math.round(124+36*Q),rows:29,half:5,cps:16*(124+36*Q)/160,pitch:.064*160/(124+36*Q),curve:13},n:{cols:Math.round(60+12*Q),rows:33,half:6,cps:8.5*(60+12*Q)/72,pitch:.064*72/(60+12*Q),curve:7.5}}; // fewer, larger dots at lower quality
const col3=(r,g,b)=>new T.Color().setRGB(r,g,b);
const U={uData:{value:tex},uN:{value:N},uRate:{value:RATE},uHead:{value:0},uNowT:{value:0},uCols:{value:160},uRows:{value:29},uCps:{value:16},uNowCol:{value:74.5},
  uRowY:{value:7},uRowB:{value:21},uRowR:{value:14},uHalf:{value:5},uM:{value:M},uW:{value:10},uH:{value:2},uCurve:{value:13},
  uPow:{value:0},uLive:{value:1},uFlash:{value:0},uTurn:{value:0},uTalk:{value:0},uClk:{value:0},
  uRip:{value:[0,1,2].map(()=>new T.Vector4(0,0,-99,0))},uRipC:{value:[0,1,2].map(()=>new T.Color())},
  uIce:{value:col3(.55,.72,1.)},uWarm:{value:col3(1.,.9,.78)},uAmb:{value:col3(1.,.62,.32)},uRed:{value:col3(1.,.24,.12)},uOff:{value:col3(.9,.84,.76)}};
const VS=`uniform float uW,uH,uCurve; varying vec2 vUv;
void main(){ vUv=uv; float x=position.x*uW, a=x/uCurve; vec3 p=vec3(sin(a)*uCurve,position.y*uH,(1.-cos(a))*uCurve); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`;
const FS=`uniform sampler2D uData;
uniform float uN,uRate,uHead,uNowT,uCols,uRows,uCps,uNowCol,uRowY,uRowB,uRowR,uHalf,uM,uPow,uLive,uFlash,uTurn,uTalk,uClk,uRefl;
uniform vec4 uRip[3]; uniform vec3 uRipC[3]; uniform vec3 uIce,uWarm,uAmb,uRed,uOff; varying vec2 vUv;
vec4 rd(float ds,float row){ return texture2D(uData,vec2(fract((uHead+ds*uRate+.5)/uN),row)); }
void main(){
  vec2 G=vUv*vec2(uCols+2.*uM,uRows+2.*uM)-uM; vec2 id=floor(G); vec2 f=fract(G)-.5;
  vec2 fw=fwidth(G); float px=max(fw.x,fw.y); float aa=px*(uRefl>.5?2.4:.8)+.02;
  float inX=step(0.,id.x)*step(id.x,uCols-1.); float inside=inX*step(0.,id.y)*step(id.y,uRows-1.);
  float ds=(id.x+.5-uNowCol)/uCps; float past=step(ds,.001); float fut=1.-past;
  vec4 a=rd(ds,.25); vec4 b=rd(ds,.75);
  float yB=abs(id.y-uRowB), yY=abs(id.y-uRowY), K=uHalf+1.;
  float onB=step(yB,uHalf), onY=step(yY,uHalf), rim=step(uHalf-.5,yY)*onY;
  float lB=clamp(a.r*K-yB,0.,1.)*onB*past;            // her voice, a mirrored level meter
  float lY=clamp(a.g*K-yY,0.,1.)*onY*past;            // yours
  float trap=a.a*step(yB,.5)*past;                    // her mid-sentence pause, dotted on her centre row
  float gh=clamp(b.g*K-yY,0.,1.)*onY*fut;              // the line you are about to say
  float br=b.b*onY; float bL=rd(ds-1./uCps,.75).b; float bR=rd(ds+1./uCps,.75).b;
  float brL=br*max(max(step(bL,.5),step(bR,.5)),rim); // the bracket: end columns and top and bottom rows
  float win=b.r*onY;                                   // the start window
  float ts=uNowT+ds; float s1=abs(fract(ts+.5)-.5); float s2=abs(fract(ts*2.+.5)-.5)*.5;
  float rul=step(abs(id.y-uRowR),.5)*(exp(-pow(s1*uCps/.6,2.))*.42+exp(-pow(s2*uCps/.6,2.))*.16);
  float nowc=exp(-pow((id.x+.5-uNowCol)*1.3,2.));
  float grain=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
  float sheen=exp(-pow((id.x-id.y*1.6-mod(uClk*9.,uCols*2.6)+uCols*.6)/14.,2.));
  vec3 c=uOff*(.085+.03*grain+.05*sheen); float lv=0.;
  c+=(uIce*step(yB,.5)+uWarm*step(yY,.5))*.06*inX;
  c+=uIce*lB*1.3; lv=max(lv,lB);
  c+=mix(uWarm,uRed,a.b)*lY*1.1; lv=max(lv,lY);
  c+=uAmb*trap*.5; lv=max(lv,trap*.5);
  c+=uWarm*gh*.17; lv=max(lv,gh*.42);
  c+=mix(uAmb,uIce,b.a*past)*(brL*mix(.8,.34,past)+br*.05); lv=max(lv,brL*.62);
  c+=uAmb*win*(rim*.6+.07)*mix(1.,.35,past); lv=max(lv,win*rim*.5);
  c+=uWarm*rul*inX; lv=max(lv,rul);
  float nrow=onY+onB+step(abs(id.y-uRowR),.5);
  c+=(uWarm*.07+uAmb*uTurn*.4*(.6+.4*sin(uClk*9.))+uWarm*uTalk*.1)*nowc*nrow; lv=max(lv,nowc*nrow*(.2+uTurn*.4));
  float rip=0.; vec3 rc=vec3(0.);
  for(int i=0;i<3;i++){ float age=uClk-uRip[i].z; if(age>0.&&age<3.){ float r=length((G-uRip[i].xy)*vec2(1.,1.25)); float k=exp(-pow((r-age*66.)/5.5,2.))*uRip[i].w*exp(-age*1.25); rip+=k; rc+=uRipC[i]*k; } }
  c+=rc*.8; lv=max(lv,min(1.,rip*.9));
  c*=1.+uFlash*.5;
  float R=mix(.17,.38,clamp(lv,0.,1.)); float d=length(f);
  float m=1.-smoothstep(R-aa,R+aa,d);
  m=mix(m,3.1416*R*R,smoothstep(.32,.75,px));          // far away: the average, instead of shimmering
  float halo=exp(-d*d*11.)*.2*lv;
  float vig=smoothstep(-.5,uCols*.07,id.x)*smoothstep(uCols+.5,uCols*.94,id.x)*smoothstep(-.5,1.6,id.y)*smoothstep(uRows+.5,uRows-2.,id.y);
  float pw=clamp((uPow*(uCols*.62+16.)-abs(id.x+.5-uNowCol))/10.,0.,1.);
  vec3 col=c*(m+halo)*inside*vig*pw*uLive;
  float cx=min(G.x+1.4,uCols+.4-G.x); float cy=min(G.y+1.4,uRows+.4-G.y); float lw=px*1.1;
  float tick=(1.-smoothstep(0.,lw,abs(cy)))*step(-.05,cx)*step(cx,2.6)+(1.-smoothstep(0.,lw,abs(cx)))*step(-.05,cy)*step(cy,2.6);
  float nl=(1.-smoothstep(0.,lw,abs(G.x-uNowCol)))*step(-2.2,G.y)*step(G.y,uRows+1.2)*(1.-inside*.55);
  float cap=(1.-smoothstep(0.,lw,min(abs(G.y+2.2),abs(G.y-uRows-1.2))))*step(abs(G.x-uNowCol),.9);
  col+=(uWarm*(tick*.3+(nl+cap)*(.42+uTalk*.3))+uAmb*(nl+cap)*uTurn*.7)*uLive*clamp(uPow*2.,0.,1.);
  if(uRefl>.5) col*=.2*exp(-vUv.y*8.);
  gl_FragColor=vec4(col,1.);
}`;
function boardMat(r){ return new T.ShaderMaterial({uniforms:{...U,uRefl:{value:r}},vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,depthTest:false,
  blending:T.AdditiveBlending,side:r?T.DoubleSide:T.FrontSide,extensions:{derivatives:true}}); }
let board=null, refl=null, layN=null;
function layout(){ const n=NARROW(); if(n===layN) return; layN=n; const L=n?LAY.n:LAY.w;
  U.uCols.value=L.cols; U.uRows.value=L.rows; U.uHalf.value=L.half; U.uCps.value=L.cps; U.uCurve.value=L.curve; U.uNowCol.value=Math.round(L.cols*.46)+.5;
  U.uRowY.value=2+L.half; U.uRowR.value=2+2*L.half+2; U.uRowB.value=U.uRowR.value+2+L.half;
  U.uW.value=(L.cols+2*M)*L.pitch; U.uH.value=(L.rows+2*M)*L.pitch;
  if(refl) refl.position.y=-U.uH.value-.34; }
/* a point on the board, from dot coordinates (column, row) to world space; the board sits at the origin */
function boardPt(c,r,out){ const W=U.uW.value, R=U.uCurve.value; const u=(c+M)/(U.uCols.value+2*M), v=(r+M)/(U.uRows.value+2*M); const a=(u-.5)*W/R; return out.set(Math.sin(a)*R,(v-.5)*U.uH.value,(1-Math.cos(a))*R); }
const colAt=dt=>U.uNowCol.value+dt*U.uCps.value;

/* ---------- writing the board: what was said goes in at the now line, plans for the future go ahead of it ---------- */
const HER=[], YOU=[], RED=[], TRP=[];
const ivAdd=(L,o)=>{ L.push(o); if(L.length>12) L.shift(); return o; };
const pseudo=t=>{ const u=Math.abs(Math.sin(t*13.8+Math.sin(t*2.7)*1.6)); return .32+.68*Math.pow(u,.7)*(.78+.22*Math.sin(t*3.3)); };
function envAt(sy,t){ let v=0; for(let i=0;i<sy.length;i++){ const s=sy[i], x=t-s.t; if(x<0) break; if(x<s.d+.07){ const at=Math.min(1,x/.028), rl=x>s.d*.78?Math.max(0,1-(x-s.d*.78)/(s.d*.22+.07)):1; v=Math.max(v,s.a*at*rl*(.84+.16*Math.sin(x*38+s.t*7))); } } return v; }
function ampAt(L,t){ let v=0; for(let i=0;i<L.length;i++){ const iv=L[i]; if(t<iv.t0||t>=iv.t1) continue; const e=iv.sy?envAt(iv.sy,t):iv.sg?speechEnv(iv.sg,t):pseudo(t)*Math.min(1,(t-iv.t0)/.05); v=Math.max(v,e*(iv.k||1)); } return Math.min(1,v); }
/* real speech gives no audio to measure: draw the syllable estimate, re-anchored at the latest word boundary */
function speechEnv(sg,t){ const base=sg.bt||sg.st, o=(sg.bt?sg.bi:sg.a)-sg.a, at=sg.est.at; if(!base||o>=at.length) return pseudo(t)*.7; const x=t-base+at[o]; return x>sg.est.end?pseudo(t)*.7:envAt(sg.est.sy,x); }
function inAny(L,t){ for(let i=0;i<L.length;i++){ const iv=L[i]; if(t>=iv.t0&&t<iv.t1) return 1; } return 0; }
let wK=-1;
function write(now){
  const k1=Math.floor(now*RATE); if(wK<0||k1<wK||k1-wK>N/2) wK=k1-1;
  const cl=Math.round(CLEAR*RATE);
  for(let k=wK+1;k<=k1;k++){ const t=k/RATE, i=((k%N)+N)%N*4;
    DB[i]=ampAt(HER,t)*255; DB[i+1]=ampAt(YOU,t)*255; DB[i+2]=inAny(RED,t)*255; DB[i+3]=inAny(TRP,t)*255;
    const j=N*4+(((k-cl)%N)+N)%N*4; DB[j]=DB[j+1]=DB[j+2]=DB[j+3]=0; }
  if(k1>wK) tex.needsUpdate=true; wK=k1;
}
/* the guide row: r start window, g the line you are about to say, b the bracket, a the bracket you hit */
function guide(t0,t1,ch,v){ for(let k=Math.ceil(t0*RATE);k<t1*RATE;k++) DB[N*4+((k%N)+N)%N*4+ch]=v*255; tex.needsUpdate=true; }
function ghost(t0,sy,t1){ for(let k=Math.ceil(t0*RATE);k<t1*RATE;k++) DB[N*4+((k%N)+N)%N*4+1]=Math.min(1,envAt(sy,k/RATE))*255; tex.needsUpdate=true; }
function clearBoard(){ DB.fill(0); tex.needsUpdate=true; HER.length=YOU.length=RED.length=TRP.length=0; wK=-1; }

/* ---------- ripples across the board ---------- */
let ripI=0; const RC={ice:col3(.6,.78,1.),ink:col3(1.,.92,.8),hot:col3(1.,.62,.3),alarm:col3(1.,.26,.12)};
function ripple(c,r,kind,s,t){ U.uRip.value[ripI].set(c,r,t,RM?s*.5:s); U.uRipC.value[ripI].copy(RC[kind]||RC.ink); ripI=(ripI+1)%3; }

/* ---------- DOM ---------- */
const E={score:q('#krScore'),combo:q('#krCombo'),mom:q('#krMom'),turn:q('#krTurn'),her:q('#krLine'),me:q('#krMine'),hint:q('#krHint'),gp:q('#krGP'),gpi:q('#krGP .in'),
  grade:q('#krGrade'),pts:q('#krPts'),btn:q('#krTalk'),state:q('#krState'),tm:q('#krT'),mb:q('#krMB'),mf:q('#krMF'),lb:q('#krLB'),ly:q('#krLY'),now:q('#krNow'),nowT:q('#krNow i'),br:q('#krBr'),meP:q('#krMeP')};
function fillLine(box,ws){ box.textContent=''; ws.forEach((w,i)=>{ const s=document.createElement('span'); s.className='kw'; s.textContent=w.w; box.appendChild(s); if(i<ws.length-1) box.appendChild(document.createTextNode(' ')); w.el=s; }); }
let hintT=0; function hint(t,ms){ clearTimeout(hintT); if(t) E.hint.textContent=t; E.hint.classList.toggle('on',!!t); if(t&&ms) hintT=setTimeout(()=>E.hint.classList.remove('on'),ms); }
let uiState='';
function setUI(s){ if(s===uiState) return; uiState=s; E.btn.dataset.s=s; el.dataset.ks=s;
  E.state.textContent={listen:'Listening',turn:'Your turn',talk:'Talking',wait:'Next line',idle:'Answer'}[s]||'Answer';
  E.nowT.textContent={listen:'Listening',turn:'Your turn'}[s]||'';
  if(s!=='talk'){ E.tm.textContent=''; E.mf.style.transform='scaleX(0)'; } }
const capOff=()=>el.classList.add('kr-out'), capOn=()=>el.classList.remove('kr-out');
const HOW=FINE?'Tap Answer, Space or the board to talk.':'Tap Answer or the board to talk.';

/* ---------- the call engine. The attract loop on the title screen runs the same engine, silently, answering for you ---------- */
let game=null, demo=null, bt=0, freezeBoard=false, powT=-9, shown=0, resAt=0;
function newGame(isDemo,t){ return {demo:isDemo,talk:{on:false,src:null,down:false,t0:0,ign:null},li:-1,ln:null,next:t,over:0,close:'',outcome:null,closed:false,
  score:0,mom:50,streak:0,best:0,cut:0,dead:0,late:0,ramble:0,short:0,perfect:0,clean:0,gaps:[],you:0,her:0}; }
function mkLine(g,i,t0,kind){
  const text=kind==='hello'?HELLO:kind==='close'?g.close:LINES[i].her, ws=words(text);
  let a=0; const segs=text.split('|').map(s=>{ const n=words(s).length, sg={a,b:a+n}; a+=n; return sg; });
  const ln={i,kind,ws,segs,si:0,st:'pre',t0,tok:0,endAt:0,my:null,demo:g.demo,cur:null};
  if(kind==='line'){ const mw=words(LINES[i].you); ln.myWs=mw; ln.myPlan=plan(mw.concat(words(FILL.join(' '))),0,YOU_O);
    let D=0; for(const s of ln.myPlan.sy) if(s.wi<mw.length) D=Math.max(D,s.t+s.d); ln.D=D; }
  if(!g.demo){ fillLine(E.her,ws); E.her.className='krher'; E.me.className='krme'; if(kind==='line') fillLine(E.me,ln.myWs); else E.me.textContent=''; capOn();
    for(let j=segs[0].b;j<ws.length;j++) ws[j].el.classList.add('later'); } // words after a pause stay dark, so the pause looks like an ending
  return ln;
}
function nextLine(g,t){
  if(g.outcome&&!g.closed){ g.closed=true; g.ln=mkLine(g,g.li,t,'close'); if(!g.demo) setUI('listen'); return; }
  g.li++; if(g.demo) g.li%=LINES.length;
  g.ln=mkLine(g,g.li,t,'line');
  if(!g.demo){ scramble(E.turn,`Line ${g.li+1} / ${LINES.length}`,400); hint(g.li===0?'Listen. Wait until she has finished.':''); setUI('listen'); }
}
/* her segment: speech when we can, otherwise the formant voice on an exact schedule (silent when muted) */
function startSeg(g,ln,t){
  const sg=ln.segs[ln.si], tok=++ln.tok, trail=ln.si<ln.segs.length-1; ln.st='her';
  if(!g.demo&&ln.si>0) for(let j=sg.a;j<sg.b;j++) ln.ws[j].el&&ln.ws[j].el.classList.remove('later');
  Object.assign(sg,{t0:t,st:0,done:0,fail:0,bi:sg.a-1,bt:0,iv:null});
  if(!g.demo&&TTS.live()){
    const ws=ln.ws.slice(sg.a,sg.b); sg.mode='tts'; sg.est=plan(ws,0,{...HER_O,trail}); sg.iv=ivAdd(HER,{t0:t+99,t1:Infinity,sy:null,sg});
    let txt=ws.map(w=>w.w).join(' '); if(trail) txt=txt.replace(/\.\.\.$/,',');
    sg.chars=[]; let c=0; ws.forEach(w=>{ sg.chars.push(c); c+=w.w.length+1; });
    sg.wait=TTS.used?1.6:2.6; TTS.used=true; sg.deadline=t+sg.wait+sg.est.end*1.45+.8;
    TTS.say(txt,{start:()=>{ if(tok!==ln.tok) return; sg.st=CLK.t; sg.iv.t0=sg.st; },
      word:e=>{ if(tok!==ln.tok||(e.name&&e.name!=='word')) return; let k=0; for(let j=0;j<sg.chars.length;j++) if(sg.chars[j]<=e.charIndex) k=j;
        const tb=CLK.t; if(!sg.st){ sg.st=tb; sg.iv.t0=tb; } for(let j=sg.a;j<=sg.a+k;j++) lightHer(ln,j); sg.bi=sg.a+k; sg.bt=tb; },
      end:()=>{ if(tok!==ln.tok) return; sg.done=CLK.t; if(!sg.st){ sg.st=sg.done-.2; sg.iv.t0=sg.st; } sg.iv.t1=sg.done; },
      err:e=>{ if(tok!==ln.tok||(e&&(e.error==='interrupted'||e.error==='canceled'))) return; sg.fail=CLK.t; }});
  } else toSynth(g,ln,sg,t,sg.a);
}
function toSynth(g,ln,sg,t,from){
  const trail=ln.si<ln.segs.length-1, p=plan(ln.ws.slice(from,sg.b),t,{...HER_O,trail,wi0:from});
  sg.mode='synth'; sg.plan=p; sg.from=from; sg.end=p.end; if(sg.iv) sg.iv.t1=Math.min(sg.iv.t1,t); sg.iv=ivAdd(HER,{t0:t,t1:p.end,sy:p.sy});
  if(!g.demo&&A.on){ const av=audio(); if(av) sing(av.her,p.sy,.3,0,av.cv); }
}
function lightHer(ln,j){ const w=ln.ws[j]; if(!w||w.lit) return; w.lit=true; if(ln.demo||!w.el) return; w.el.classList.add('on','now'); if(ln.cur&&ln.cur!==w.el) ln.cur.classList.remove('now'); ln.cur=w.el; }
function stopHer(ln,t){ ln.tok++; const sg=ln.segs[ln.si]; if(sg&&sg.iv) sg.iv.t1=Math.min(sg.iv.t1,t); if(sg&&sg.mode==='tts') TTS.stop(); if(AV){ hush(AV.her); hush(AV.cv); } }
function wdur(sg,j){ const o=j-sg.a, at=sg.est.at; return (o+1<at.length?at[o+1]:sg.est.end)-at[o]; }
/* advance to time `now`, taking every transition in order at its own time, so slow frames never change the timing */
function step(g,now){ for(let n=0;n<40;n++){ if(!adv(g,now)) break; } }
function adv(g,now){
  if(g.over){ if(now>=g.over){ g.over=0; finish(g); } return false; }
  const ln=g.ln;
  if(!ln||ln.st==='done'){ if(g.hello&&now>=g.hello){ g.ln=mkLine(g,g.li,g.hello,'hello'); g.hello=0; if(!g.demo) setUI('listen'); return true; } if(now>=g.next){ nextLine(g,g.next); return true; } return false; }
  if(ln.st==='pre'){ const ts=ln.t0+(ln.kind==='line'?LEAD:.35); if(now>=ts){ startSeg(g,ln,ts); return true; } return false; }
  if(ln.st==='her'){ const sg=ln.segs[ln.si];
    if(sg.mode==='tts'){
      if(sg.fail||(!sg.st&&now-sg.t0>sg.wait)||(!A.on&&!sg.done)){ // speech failed, never started, or the sound was muted: carry on with the formant schedule
        if(!sg.st) TTS.broken=true; ln.tok++; TTS.stop(); let f=sg.a; while(f<sg.b&&ln.ws[f].lit) f++; toSynth(g,ln,sg,Math.max(now,sg.t0),f); return true; }
      if(sg.st&&!sg.done){ // light words between boundaries from the syllable estimate, a little slow so real boundaries pull it forward
        let j=sg.bt?sg.bi+1:sg.a, t=sg.bt?sg.bt+wdur(sg,sg.bi)*1.08:sg.st;
        for(;j<sg.b-1;j++){ if(t>now) break; lightHer(ln,j); t+=wdur(sg,j)*1.08; } }
      let end=sg.done; if(!end&&now>sg.deadline){ end=sg.deadline; ln.tok++; TTS.stop(); }
      if(!end) return false; for(let j=sg.a;j<sg.b;j++) lightHer(ln,j); return segEnd(g,ln,end);
    }
    const at=sg.plan.at; for(let o=0;o<at.length&&at[o]<=now;o++) lightHer(ln,sg.from+o);
    return now>=sg.end?segEnd(g,ln,sg.end):false; }
  if(ln.st==='trap'){ if(g.demo&&ln.cutAt&&now>=ln.cutAt){ act(g,'demo',ln.cutAt); return true; } if(now>=ln.trapEnd){ ln.si++; startSeg(g,ln,ln.trapEnd); return true; } return false; }
  if(ln.st==='open'){ if(g.demo&&now>=ln.endAt+ln.auto){ act(g,'demo',ln.endAt+ln.auto); return true; }
    if(now>=ln.endAt+DEAD){ grade(g,ln,'dead',ln.endAt+DEAD,0); return true; } return false; }
  if(ln.st==='you'){ const t0=ln.my.t0; if(g.demo&&now>=t0+ln.D+ln.autoL){ endTalk(g,t0+ln.D+ln.autoL); return true; }
    if(now>=t0+ln.D+OVER){ endTalk(g,t0+ln.D+OVER,true); return true; } return false; }
  if(ln.st==='end'){ if(now>=ln.endAt+.3){ ln.st='gone'; g.over=ln.endAt+1.25; if(!g.demo){ if(g.outcome==='She hung up'||g.outcome==='Send an email'){ A.beep(480); setTimeout(()=>A.beep(480),190); setTimeout(()=>A.beep(480),380); } else A.chime(9,0,.04); } return true; } return false; }
  return false;
}
function segEnd(g,ln,t){
  const sg=ln.segs[ln.si]; if(sg.iv) sg.iv.t1=Math.min(sg.iv.t1,t); if(ln.cur){ ln.cur.classList.remove('now'); ln.cur=null; } g.her+=Math.max(0,t-(sg.st||sg.t0));
  if(ln.si<ln.segs.length-1){ ln.st='trap'; ln.trapEnd=t+TRAP; ivAdd(TRP,{t0:t+.08,t1:t+TRAP-.05}); if(g.demo&&Math.random()<.3) ln.cutAt=t+.45+Math.random()*.3; return true; }
  ln.endAt=t;
  if(ln.kind==='close'){ ln.st='end'; if(!g.demo) setUI('idle'); return true; }
  if(ln.kind==='hello'){ ln.st='done'; g.next=t+.7; return true; }
  ln.st='open';
  // the start window, and a preview of your line with its bracket, placed as if you start on time
  guide(t+WIN0,t+WIN1,0,1); guide(t+WIN1,t+SLOW,0,.38);
  const ps=t+.32; ghost(ps,shift(ln.myPlan.sy,ps),ps+ln.D+.1); guide(ps+ln.D-BR0,ps+ln.D+BR1,2,1);
  ln.auto=.2+Math.random()*.32;
  if(!g.demo){ setUI('turn'); if(g.li===0) hint('Your turn. '+HOW); }
  return true;
}

/* ---------- the one control: a press starts talking and a second press stops; a press held past HOLD stops on release ---------- */
function press(g,src,t){ if(!g) return; step(g,t); act(g,src,t); }
function act(g,src,t){
  const ln=g.ln, tk=g.talk;
  if(tk.on){ endTalk(g,t); tk.ign=src; return; }
  if(!ln||ln.kind!=='line'||ln.st==='pre'||ln.st==='done'){ tk.ign=src; if(!g.demo&&ln&&ln.kind==='line') hint('Wait for her line.',1300); return; }
  if(ln.st==='her'||ln.st==='trap'){ // talking over her
    tk.ign=src; const inTrap=ln.st==='trap'; stopHer(ln,t); if(inTrap) for(const iv of TRP) if(iv.t1>t) iv.t1=Math.max(iv.t0,t);
    ivAdd(RED,{t0:t,t1:t+.34}); ivAdd(YOU,{t0:t,t1:t+.34,sy:null,k:.8});
    if(!g.demo){ A.buzz(); feedback(.22,.7,TINT.set(.1,0,0)); hint(inTrap?'She paused, but she had not finished.':'Let her finish first.',2600); }
    grade(g,ln,'cut',t,0); return; }
  if(ln.st!=='open'){ tk.ign=src; return; }
  // your answer starts: re-place the preview where you really started
  const my=ln.my={t0:t,gap:t-ln.endAt,plan:shift(ln.myPlan.sy,t)}; ln.st='you';
  Object.assign(tk,{on:true,src,down:src!=='demo',t0:t}); ln.autoL=(Math.random()-.35)*.42;
  my.iv=ivAdd(YOU,{t0:t,t1:Infinity,sy:my.plan});
  for(let ch=1;ch<4;ch++) guide(ln.endAt,ln.endAt+ln.D+4.5,ch,0);
  ghost(t,my.plan,t+ln.D+.1); guide(t+ln.D-BR0,t+ln.D+BR1,2,1);
  if(g.demo) return;
  setUI('talk'); A.tick(); if(AV) sing(AV.you,my.plan.filter(s=>s.t<t+ln.D+OVER),.16,1,null);
  hint(g.li===0?'Stop when your line is said. Tap again, or let go.':'');
  const S0=ln.D+BR1+.6; E.mb.style.left=(100*(ln.D-BR0)/S0).toFixed(1)+'%'; E.mb.style.width=(100*(BR0+BR1)/S0).toFixed(1)+'%';
}
function release(g,src,t){
  const tk=g&&g.talk; if(!tk) return;
  if(tk.ign===src){ tk.ign=null; return; }
  if(!tk.on||tk.src!==src||!tk.down) return; tk.down=false;
  if(t-tk.t0>HOLD) endTalk(g,t);
}
function endTalk(g,t,tuned){
  const ln=g.ln; g.talk.on=false; g.talk.down=false; if(!ln||ln.st!=='you') return;
  const my=ln.my; my.t1=t; my.iv.t1=t; if(!g.demo){ if(AV) hush(AV.you); litMine(ln,t); }
  const L=t-my.t0, D=ln.D, gap=my.gap; g.you+=L; g.gaps.push(gap);
  let k; if(tuned) k='tuned'; else if(L<D-BR0) k='short'; else if(L>D+BR1) k='ramble'; else k=gap>SLOW?'late':gap>=WIN0&&gap<=WIN1?'perfect':'clean';
  const sp=gap<WIN0?150:gap<=WIN1?300:gap<=SLOW?130:0; let pts;
  if(k==='perfect'||k==='clean'||k==='late') pts=sp+300+Math.round(160*Math.max(0,1-Math.abs(L-D-.05)/.5));
  else if(k==='short') pts=sp*.5+60; else if(k==='ramble') pts=sp*.5+Math.max(0,140-(L-D-BR1)*90); else pts=sp*.3;
  if(gap>SLOW) g.late++;
  if(k==='perfect'||k==='clean') guide(my.t0+D-BR0,my.t0+D+BR1,3,1);
  grade(g,ln,k,t,Math.round(pts));
}
const TINT=new T.Color();
function grade(g,ln,k,t,pts){
  const G0=GR[k]; ln.st='done'; ln.grade=k; g.talk.on=false; g.next=t+(k==='dead'?.35:BEAT);
  const good=k==='perfect'||k==='clean'; if(good){ g.streak++; g.best=Math.max(g.best,g.streak); } else g.streak=0;
  if(k==='perfect') g.perfect++; if(k==='clean') g.clean++; if(k==='cut') g.cut++; if(k==='dead') g.dead++; if(k==='ramble'||k==='tuned') g.ramble++; if(k==='short') g.short++;
  const mult=1+Math.min(g.streak,6)*.25, got=Math.round(pts*(good?mult:1));
  g.score+=got; g.mom=clamp(g.mom+G0.m,0,100);
  ripple(U.uNowCol.value,k==='cut'?U.uRowB.value:U.uRowY.value,G0.c,k==='perfect'?1.15:good?.9:.8,t);
  if(g.demo) return;
  const isLast=g.li>=LINES.length-1, hang=g.mom<=0&&g.li>=2;
  if(isLast||hang){ const o=hang?OUT[3]:OUT.find(x=>g.mom>=x[0]); g.outcome=o[1]; g.close=o[2]; }
  U.uFlash.value=k==='perfect'?1:.45; setUI('wait');
  E.grade.textContent=G0.t; E.gp.dataset.c=G0.c; E.pts.textContent=got>0?'+'+fmt(got)+(good&&mult>1?'   ×'+mult.toFixed(2):''):'';
  E.gpi.getAnimations().forEach(a=>a.cancel());
  capOff(); E.gpi.animate([{opacity:0,transform:'translate(-50%,-25%) scale(.97)',easing:'cubic-bezier(.16,1,.3,1)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.16},{opacity:1,transform:'translate(-50%,-53%)',offset:.74,easing:'cubic-bezier(.65,0,.35,1)'},{opacity:0,transform:'translate(-50%,-62%)'}],{duration:1650,delay:120,fill:'both'});
  if(k==='perfect'){ A.chime(7+Math.min(g.streak,5)); A.ping(1318,.025); feedback(.06,.25); }
  else if(k==='clean') A.chime(5); else if(k==='late'||k==='short') A.chime(1,0,.04); else if(k==='ramble'||k==='tuned') A.beep(392);
  else if(k==='dead'){ A.beep(300); feedback(.12,.4,TINT.set(.08,0,0)); }
  if(k==='dead') hint('Silence after a question reads as doubt.',2600); else if(k==='ramble') hint('Stop when your point is made.',2400);
  else if(k==='tuned') hint('She stopped listening.',2400); else if(k==='short') hint('Finish your line before you stop.',2400);
  else if(k==='late') hint('Answer sooner. A long gap sounds unsure.',2400); else if(g.li===0&&good) hint('That is the rhythm. Six more.',2400);
  hud(g);
  if(k==='dead'&&!g.outcome){ g.hello=t+1.55; g.next=Infinity; } // she checks you are still there, then moves on
}
function hud(g){ E.combo.textContent=g.streak>1?`Streak ×${(1+Math.min(g.streak,6)*.25).toFixed(2)}`:''; E.mom.style.setProperty('--v',g.mom/100); E.mom.classList.toggle('low',g.mom<35); }
function finish(g){
  if(game!==g) return;
  const ans=g.gaps.length, avg=ans?g.gaps.reduce((a,b)=>a+b,0)/ans:0, ratio=g.you/Math.max(.1,g.you+g.her);
  const parts=[]; if(g.cut) parts.push(g.cut===1?'You talked over her once.':`You talked over her ${g.cut} times.`);
  if(g.dead||g.late) parts.push('Silence after a question reads as doubt.'); if(g.ramble) parts.push('Long answers lose the room.'); if(g.short) parts.push('Cut-short answers sound unsure.');
  if(!parts.length) parts.push(g.perfect>=5?'Clean timing all the way through.':'Good timing, with room to tighten.');
  freezeBoard=true; setUI('idle'); capOff(); hint(''); game=null;
  el.classList.add('kr-arm'); resAt=performance.now(); setTimeout(()=>el.classList.remove('kr-arm'),750);
  st.result({grade:g.outcome||'She hung up',score:g.score,stats:[['Perfect lines',`${g.perfect} / ${LINES.length}`],['Avg reply gap',ans?avg.toFixed(2)+' s':'None'],
    ['Talked over her',g.cut],['Dead air',g.dead+g.late],['Ran long',g.ramble],['Your share of talk',Math.round(ratio*100)+'%']],
    text:parts.slice(0,2).join(' ')+' Kríos lets reps rehearse calls like this against a voice that answers back, before a real buyer hears them.'});
  if(g.outcome==='Demo booked') A.chord(); else A.dock();
}
function startDemo(pre){ demo=newGame(true,CLK.t-pre); }

/* ---------- build ---------- */
st.build=function(){
  TTS.init();
  const geo=new T.PlaneGeometry(1,1,96,1);
  board=new T.Mesh(geo,boardMat(0)); board.frustumCulled=false; board.renderOrder=2; sc.add(board);
  refl=new T.Mesh(geo,boardMat(1)); refl.frustumCulled=false; refl.scale.y=-1; refl.renderOrder=1; sc.add(refl);
  layN=null; layout();
  st.anchors=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
};

/* ---------- input ---------- */
const docked=()=>S.stId==='kr'&&(S.mode==='station'||S.mode==='docking');
let tabAt=-1e9, kbFocus=false, lastDown={t:0,el:null};
addEventListener('keydown',e=>{
  if(e.code==='Tab'){ tabAt=performance.now(); return; }
  if(!docked()) return;
  const sp=e.code==='Space', en=e.code==='Enter'||e.code==='NumpadEnter';
  if(!sp&&!en) return;
  if(sp) e.preventDefault(); // never scroll, never press whatever has focus
  if(st.state==='play'){ e.preventDefault(); if(!e.repeat&&game) press(game,'key',CLK.t); return; }
  const a=document.activeElement, mine=a&&a!==document.body&&(el.contains(a)||a.id==='back');
  if(sp){ if(mine) a.blur(); if(st.state==='menu'&&!e.repeat&&S.mode==='station') st.start(); return; }
  // Enter: only a control reached with Tab may act; anything else focused is stale and must not navigate
  if(mine&&!kbFocus){ e.preventDefault(); e.stopImmediatePropagation(); a.blur(); if(st.state==='menu'&&!e.repeat&&S.mode==='station') st.start(); }
},true);
addEventListener('keyup',e=>{ if(!docked()) return; const sp=e.code==='Space', en=e.code==='Enter'||e.code==='NumpadEnter';
  if(sp||(en&&st.state==='play')) e.preventDefault(); if((sp||en)&&game) release(game,'key',CLK.t); },true);
addEventListener('focusin',()=>{ kbFocus=performance.now()-tabAt<600; });
addEventListener('blur',()=>{ if(game&&game.talk.on&&game.talk.src==='key'&&game.talk.down) release(game,'key',CLK.t); }); // a held key can never send keyup now
addEventListener('pointerdown',e=>{ lastDown={t:performance.now(),el:e.target}; },true);
/* a click only counts if the press began on that same control, and results buttons only after the panel has appeared.
   This is what stops a tap meant for the game from landing on krios.ie or Back to orbit as the panel opens under it. */
addEventListener('click',e=>{
  const t=e.target; if(!(t instanceof Element)||!el.contains(t)) return;
  if(t.closest('#krTalk')){ e.stopPropagation(); return; }
  const ctl=t.closest('a,button'), inRes=!!t.closest('.res'); if(!inRes&&!(ctl&&ctl.matches('a[href]'))) return;
  const ok=e.detail===0?kbFocus&&document.activeElement===ctl:!!(ctl&&lastDown.el&&ctl.contains(lastDown.el))&&(!inRes||lastDown.t>resAt+150);
  if(!ok){ e.preventDefault(); e.stopImmediatePropagation(); }
},true);
E.btn.addEventListener('pointerdown',e=>{ if(e.button>0) return; e.preventDefault(); if(st.state==='play'&&game) press(game,'p'+e.pointerId,CLK.t); });
E.btn.addEventListener('mousedown',e=>e.preventDefault());
E.btn.addEventListener('contextmenu',e=>e.preventDefault());
const up=e=>{ if(game) release(game,'p'+e.pointerId,CLK.t); };
addEventListener('pointerup',up); addEventListener('pointercancel',up);
st.onPointer=e=>{ if(st.state==='play'&&game&&e.button<=0) press(game,'p'+e.pointerId,CLK.t); };
canvas.addEventListener('contextmenu',e=>{ if(docked()&&st.state==='play') e.preventDefault(); });
/* a hidden tab stops the clock; the line that was playing starts again when you come back */
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){ CLK.go(); return; } CLK.hold(); const g=game, ln=g&&g.ln; if(!ln||ln.st==='done'||ln.st==='end'||ln.st==='gone') return;
  stopHer(ln,CLK.t); if(AV) hush(AV.you); if(ln.my&&ln.my.iv) ln.my.iv.t1=Math.min(ln.my.iv.t1,CLK.t); Object.assign(g.talk,{on:false,down:false,ign:null});
  for(let ch=0;ch<4;ch++) guide(CLK.t,CLK.t+8,ch,0);
  if(ln.kind==='line') g.li--; else if(ln.kind==='close') g.closed=false;
  ln.st='done'; ln.tok++; g.next=CLK.t+.7; capOff(); setUI('listen');
});
function blurInside(){ const a=document.activeElement; if(a&&a!==document.body&&(el.contains(a)||a.id==='back')) a.blur(); }

/* ---------- lifecycle ---------- */
function stopAudio(){ TTS.stop(); if(AV){ hush(AV.her); hush(AV.cv); hush(AV.you); } }
st.play=function(){
  stopAudio(); blurInside(); demo=null; freezeBoard=false; clearBoard(); powT=CLK.t; shown=0;
  game=newGame(false,CLK.t+1.5); hud(game);
  if(A.on){ TTS.unlock(); const ring=()=>{ if(game&&st.state==='play'){ A.ping(440,.02); A.ping(480,.02); } }; ring(); setTimeout(ring,420); } E.score.textContent='0'; E.turn.textContent=`Line 1 / ${LINES.length}`;
  E.her.textContent=''; E.me.textContent=''; capOn(); setUI('listen'); hint('');
  audio(); st.setState('play'); const cu=$('#cur'); if(cu) cu.classList.remove('big');
};
st.abort=function(){ stopAudio(); if(game&&game.ln) game.ln.tok++; game=null; setUI('idle'); hint(''); if(!demo){ freezeBoard=false; startDemo(0); } };
st.enter=function(){ stopAudio(); game=null; freezeBoard=false; st.setState('menu'); $('#krBest').textContent='Best '+fmt(store.get('kr',0));
  clearBoard(); layN=null; layout(); startDemo(5.5); wK=Math.floor((CLK.t-5.5)*RATE); powT=CLK.t; U.uPow.value=0; setUI('idle'); };
st.exit=function(){ stopAudio(); game=null; demo=null; };

/* ---------- frame ---------- */
/* camera per layout and state: board centre at screen fraction (sx, sy), board takes share fw of the width, seen from yaw and elevation */
const CAM={w:{menu:[.45,.4,.76,.42,.1],play:[.5,.57,.84,.05,.07],res:[.5,.5,.8,.2,.1]},n:{menu:[.5,.6,1.3,.1,.1],play:[.5,.555,1.04,.03,.05],res:[.5,.6,1,.1,.07]}};
const _a=new T.Vector3(), _dir=new T.Vector3(), _rt=new T.Vector3(), _up=new T.Vector3(), UPV3=new T.Vector3(0,1,0);
function frameCam(t){
  const c=CAM[layN?'n':'w'][st.state]||CAM.w.menu, asp=innerWidth/innerHeight, th=Math.tan(18*Math.PI/180), dr=RM?0:1;
  const yaw=c[3]+Math.sin(t*.07)*.022*dr, e2=c[4]+Math.sin(t*.09+1)*.01*dr;
  const d=Math.max(U.uW.value*.97*(.35+.65*Math.cos(yaw))/(c[2]*2*th*asp),U.uH.value*2.3/(.9*2*th))*(1-.035*Math.max(U.uTurn.value,U.uTalk.value)), hh=d*th;
  _dir.set(-Math.sin(yaw)*Math.cos(e2),-Math.sin(e2),-Math.cos(yaw)*Math.cos(e2)); _rt.crossVectors(_dir,UPV3).normalize(); _up.crossVectors(_rt,_dir);
  const xc=(2*c[0]-1)*hh*asp+Math.sin(t*.11)*.05*dr, yc=(1-2*c[1])*hh+Math.sin(t*.083)*.03*dr;
  st.camL.set(0,0,0).addScaledVector(_rt,-xc).addScaledVector(_up,-yc);
  st.camP.copy(st.camL).addScaledVector(_dir,-d);
}
function place(e,c,r){ boardPt(c,r,_a); const p=proj(_a,stCam); e.style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; }
let brOn=false, lastTm='', tickN=0;
st.update=function(dt,t){ try{ frameUpdate(dt,t); }catch(err){ if(!st.err){ st.err=1; console.error('kr update',err); } } };
function frameUpdate(dt,t){
  const now=CLK.t; layout();
  if(game) step(game,now); if(demo) step(demo,now);
  if(!freezeBoard) bt=now; write(bt);
  U.uHead.value=((bt*RATE)%N+N)%N; U.uNowT.value=bt; U.uClk.value=now;
  U.uPow.value=clamp((now-powT)/1.5,0,1); U.uFlash.value=damp(U.uFlash.value,0,3.5,dt);
  const ln=game&&game.ln, turn=!!(ln&&ln.st==='open'), tk=!!(ln&&ln.st==='you');
  U.uTurn.value=damp(U.uTurn.value,turn?1:0,8,dt); U.uTalk.value=damp(U.uTalk.value,tk?1:0,8,dt);
  U.uLive.value=damp(U.uLive.value,st.state==='menu'?.95:st.state==='res'?.7:1,3,dt);
  frameCam(t);
  if(st.state==='play'){
    if(game&&shown!==game.score){ shown=Math.min(game.score,shown+Math.max(1,(game.score-shown)*Math.min(1,dt*9))); E.score.textContent=fmt(shown); }
    if(turn){ const n=Math.floor((now-ln.endAt-SLOW)/.45); if(n>=0&&n!==tickN&&now-ln.endAt<DEAD){ tickN=n; A.tick(); } } else tickN=-1;
    if(tk){ const L=now-ln.my.t0, s=L.toFixed(1)+' s'; if(s!==lastTm){ lastTm=s; E.tm.textContent=s; E.nowT.textContent=s; }
      E.mf.style.transform=`scaleX(${Math.min(1,L/(ln.D+BR1+.6)).toFixed(3)})`; litMine(ln,now); }
    const top=U.uRows.value+1.4;
    place(E.now,U.uNowCol.value,top); place(E.lb,-1.6,U.uRowB.value); place(E.ly,-1.6,U.uRowY.value); place(E.meP,U.uCols.value/2,layN?-7.5:-6.2);
    const b0=(tk||turn)?(tk?ln.my.t0:ln.endAt+.32)+ln.D-BR0-bt:-9, showBr=b0+BR0+BR1>.05; if(showBr) place(E.br,clamp(colAt(b0+(BR0+BR1)/2),U.uNowCol.value,U.uCols.value-2),-1.1);
    if(showBr!==brOn){ brOn=showBr; E.br.classList.toggle('on',brOn); }
  }
  if(st.state==='menu'){ const nc=U.uNowCol.value, cps=U.uCps.value;
    boardPt(nc-2.2*cps,U.uRowB.value+1,st.anchors[0]); boardPt(nc,U.uRowR.value,st.anchors[1]); boardPt(Math.min(U.uCols.value-8,nc+1.4*cps),U.uRowY.value,st.anchors[2]);
    notesUpdate(st); }
}
function litMine(ln,now){ const my=ln.my, n=ln.myWs.length; let j=-1; for(const s of my.plan){ if(s.t>now) break; j=s.wi; }
  for(let i=0;i<=Math.min(j,n-1);i++){ const w=ln.myWs[i]; if(!w.lit){ w.lit=true; w.el&&w.el.classList.add('on'); } }
  if(j>=n){ if(!my.over){ my.over=1; E.me.classList.add('over'); } while(E.me.children.length<n+Math.min(j-n+1,FILL.length)){ const s=document.createElement('span'); s.className='kw on fill'; s.textContent=FILL[E.me.children.length-n]; E.me.appendChild(document.createTextNode(' ')); E.me.appendChild(s); } } }

/* test hooks: read the state, drive the clock */
st.dbg={CLK,U,TTS,get AV(){ return AV; },get game(){ return game; },get demo(){ return demo; },
  end(){ const g=game; if(!g) return; const ln=g.ln; if(ln){ stopHer(ln,CLK.t); ln.st='done'; ln.tok++; } g.talk.on=false; g.outcome=OUT[2][1]; g.close=OUT[2][2]; g.closed=false; g.hello=0; g.next=CLK.t; },
  now(){ const t=CLK.t; if(game) step(game,t); const ln=game&&game.ln; return {t,state:st.state,li:game?game.li:-1,st:ln?ln.st:null,kind:ln?ln.kind:null,endAt:ln?ln.endAt:0,D:ln?ln.D:0,
    my:ln&&ln.my?{t0:ln.my.t0,gap:ln.my.gap}:null,grade:ln?ln.grade:null,score:game?game.score:0,mom:game?game.mom:0,talk:game?game.talk.on:false,ks:el.dataset.ks}; }};
})();

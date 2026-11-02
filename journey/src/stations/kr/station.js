/* ================= KRÍOS: READ THE ROOM =================
   A cold call in six turns. The buyer says something; you pick one of three replies before the line goes quiet.
   Each reply moves her trust and interest. The room, a sphere of dots, warms with interest and frays as trust drops.
   The right reply depends on what was just said and on how warm the room is, which is the skill Kríos trains. */
(()=>{
const st=mkStation('kr',{arrive:new T.Vector3(0,1.2,6)});
const el=st.el, q$=s=>$(s,el);

/* ---------- the calls ----------
   R(text, quality, trust change, interest change, coach note): the same in a warm or a cool room.
   RW(text, warm, cool): [quality, trust, interest, note] for each kind of room. Quality 2 good, 1 fair, 0 misread. */
const R=(t,q,a,b,n)=>({t,q:[q,q],d:[[a,b],[a,b]],n:[n,n]});
const RW=(t,w,c)=>({t,q:[w[0],c[0]],d:[[w[1],w[2]],[c[1],c[2]]],n:[w[3],c[3]]});
const CALLS=[
 {name:'Dana Walsh',role:'VP Sales · fintech, 40 reps',pr:'She',
  hang:"I'm going to stop you there. Send me an email.",
  end:["Tuesday works. Send the invite.","Okay. Email me and we'll find a time.","Send me something. I'll have a look."],
  beats:[
  {w:"Dana speaking. I've got about two minutes. Who's this?",r:[
    R("Hi Dana, it's Sam from Kríos. It's a cold call, so I'll be quick. Can I ask you one question?",2,12,8,"Honest about the call and quick to hand her a question. She stays on."),
    R("Hi Dana, Sam from Kríos. We help sales teams practise their calls. Is now a bad time?",1,2,0,"Polite, but 'is now a bad time' invites a yes."),
    R("Kríos is an AI platform where reps rehearse calls against realistic buyers, with scoring and...",0,-6,-10,"A pitch before a single question. She hasn't told you anything yet.")]},
  {w:"Go on. One question.",c:"One question. Quickly.",r:[
    R("How long does a new rep take before they're closing on their own?",2,6,12,"Open, specific, and about her world. The best kind of first question."),
    R("Are you happy with your current sales training?",1,0,3,"A yes or no question. She can end the call with one word."),
    R("Do you actually train your reps at all?",0,-10,-4,"It sounds like an accusation. She bristles.")]},
  {w:"Honestly? Five months. Their first twenty calls are a write-off.",c:"Five months, maybe. That's normal for us.",r:[
    R("What does a written-off call cost you, roughly?",2,6,10,"You had her put a number on the pain. Now it matters to her."),
    R("Kríos can cut that ramp time in half.",1,-4,6,"A claim with no proof. Interesting, but she doesn't believe it yet."),
    R("Five months is pretty good, to be fair.",0,-6,-10,"You just told her she has no problem.")]},
  {w:"We tried role-play. The reps hated it and the managers never had the time.",c:"We tried role-play. It didn't work. Why would this?",r:[
    R("That's what we hear most. What did the reps hate about it?",2,10,6,"You acknowledged it and asked. Objections are questions in disguise."),
    R("With Kríos nobody needs a free manager: reps practise against a buyer any time they like.",1,2,8,"A fair answer, but you skipped finding out why it failed."),
    R("This is different. It's AI.",0,-8,-4,"'It's AI' is not an answer to 'it didn't work'.")]},
  {w:"Being watched, mostly. Nobody wants to fail in front of their manager.",c:"They felt watched. Nobody wants to fail in front of their manager.",r:[
    R("So they'd practise alone, fail in private, and show the manager the run they're proud of?",2,8,12,"You played her words back and tied them to the product. She hears herself in it."),
    R("Our customers ramp about thirty percent faster. I can send you the case study.",1,2,4,"Proof helps, but it isn't about her problem yet."),
    R("Totally. Anyway, pricing starts at forty euro a seat.",0,-10,-8,"Pricing before she's interested. The room goes cold.")]},
  {w:"That's actually our problem. What would trying it look like?",c:"Okay. I need to jump in a minute.",r:[
    RW("Twenty minutes next Tuesday, you and one manager? I'll set it up with your own scripts.",[2,8,10,"She asked what trying it looks like. You gave her a time, a who and a what."],[0,-8,-6,"She was leaving. Asking for her calendar now feels like a grab."]),
    RW("What would need to be true for you to try it with one team?",[1,2,2,"A good question, but she just asked to try it. Say yes and book it."],[2,6,8,"She was on her way out. You found the one thing that would keep the door open."]),
    R("I'll send over a deck and you can have a look in your own time.",1,0,-4,"Safe. Decks get forwarded to the bin.")]}
 ]},
 {name:'Ciarán Byrne',role:'Founder · 12-person startup',pr:'He',
  hang:"Yeah, I'm going to leave it there. Thanks.",
  end:["Thursday at ten. Don't be late.","Fine. Email me and I'll look at a time.","Send me a link. If I'm bored I'll look."],
  beats:[
  {w:"Ciarán here. If this is a sales call, it's a quick no.",r:[
    R("It is a sales call. Give me thirty seconds, then you can say no?",2,14,6,"Honesty disarms him. He gives you the thirty seconds."),
    R("Hi Ciarán, I'm calling from Kríos about AI sales coaching.",1,0,0,"Clear, but you handed him the easy no."),
    R("Oh no, not at all! Just a quick chat about your sales process.",0,-14,-2,"It is a sales call. He knows, and now he doesn't trust you.")]},
  {w:"Ha. Fair. Thirty seconds.",c:"Go on then. Quickly.",r:[
    R("Who closes your deals today: you, or the team?",2,6,10,"The question every founder has an opinion on."),
    R("How big is your sales team at the moment?",1,2,2,"You could have found that on LinkedIn."),
    R("Founders like you love Kríos because it saves so much time.",0,-8,-6,"He hasn't said a word yet. Don't tell him what he loves.")]},
  {w:"Me. Every one. My two reps can't close without me on the call.",c:"Me, mostly. That's how startups work.",r:[
    R("What happens to the pipeline when you're on holiday?",2,6,12,"Now he's picturing the cost of being the only closer."),
    R("So you'd like your reps to close the way you do?",1,4,6,"Right direction, but leading. Let him say it."),
    R("That's not very scalable, though.",0,-8,-6,"True, and he hates hearing it from a stranger.")]},
  {w:"Nothing closes. And I'm not convinced AI can teach anyone to sell like me.",c:"I don't buy that AI can teach selling.",r:[
    R("Fair. It doesn't teach. It lets them rehearse your hardest calls until they stop freezing.",2,10,8,"You agreed with the true part and corrected the rest."),
    R("What would convince you?",1,4,2,"Not bad, but he'll say 'nothing'. Give him something first."),
    R("Our AI is trained on millions of sales calls.",0,-6,-4,"Scale isn't his worry. His way of selling is.")]},
  {w:"Rehearse my calls? With my actual objections?",c:"And I suppose it knows my actual objections, does it?",r:[
    R("Yours. You record the five objections that cost you deals, and they practise against them.",2,8,12,"Concrete, about his calls, in his words."),
    R("It comes with a library of two hundred standard objections.",1,0,2,"Generic. He just told you he isn't generic."),
    R("Definitely! It's super flexible and really powerful.",0,-6,-6,"Adjectives, no answer.")]},
  {w:"Right. Show me. But I want to see it on one of my calls.",c:"I'll think about it.",r:[
    RW("Send me one objection you lost a deal on. I'll have it running for Thursday at ten.",[2,8,10,"He asked to see it. You made it about his call and gave him a date."],[0,-8,-6,"He said he'd think. A date this fast pushes him away."]),
    RW("What would you need to see to stop thinking and try it?",[1,2,2,"He already asked to see it. Book it."],[2,6,8,"You turned 'I'll think about it' into a reason to talk again."]),
    R("No problem, I'll follow up in a few weeks.",1,0,-4,"Polite. A few weeks is a long time to be forgotten.")]}
 ]},
 {name:'Priya Nair',role:'Head of Enablement · SaaS, 120 reps',pr:'She',
  hang:"I'll have to leave it there, sorry. Send something over.",
  end:["Let's do it. I'll bring her in.","Sounds good. Email me some times.","Send something over and I'll see."],
  beats:[
  {w:"Hi, Priya here. Is this about the webinar?",r:[
    R("No, it's a cold call, I'm afraid. It's about coaching at your scale. Have you a minute?",2,12,6,"Honest, and about her job. She gives you the minute."),
    R("Hi Priya, I'm with Kríos. We do practice calls for sales teams.",1,2,2,"Clear enough, but nothing about her yet."),
    R("Yes! Well, sort of. Did you enjoy it?",0,-14,-4,"A small lie. She'll find out in a sentence.")]},
  {w:"Sure, I've a minute. What's on your mind?",c:"A minute. Go on.",r:[
    R("With 120 reps, how many calls do your managers actually get to hear?",2,6,12,"A sharp question, built on what you know about her team."),
    R("What tools are you using for enablement at the moment?",1,2,2,"Fair, but it invites a list, not a problem."),
    R("I'd say your managers are overworked, are they?",0,-6,-2,"Putting words in her mouth. She doesn't like it.")]},
  {w:"Maybe one in fifty. Past that, coaching is guesswork.",c:"Not many. Same as everyone.",r:[
    R("So for forty-nine calls in fifty, nobody knows what the rep did. What does that cost you?",2,6,12,"You did the maths out loud. She's nodding."),
    R("Kríos scores every practice call automatically.",1,0,6,"Relevant, but you jumped to the answer before the pain landed."),
    R("That's a bit worrying, to be honest.",0,-4,-4,"Judging her team won't win her over.")]},
  {w:"I like it, genuinely. But budgets are frozen until the autumn.",c:"Look, budgets are frozen until the autumn anyway.",r:[
    R("Understood. Could a free pilot with one team build the case for the autumn?",2,10,10,"You worked with the freeze instead of against it."),
    R("No problem, I'll call you back in the autumn.",1,2,-6,"Respectful, but you let the momentum go."),
    R("We could do twenty percent off if you sign this month.",0,-8,-4,"A discount doesn't unfreeze a budget. It sounds desperate.")]},
  {w:"A pilot... who would need to sign off on that?",c:"A pilot would still need sign-off.",r:[
    R("Who usually signs off, and what would they want to see from a pilot?",2,8,10,"You mapped the decision with her instead of around her."),
    R("I can send you a one-page pilot plan you can forward on.",1,4,4,"Helpful, but you still don't know who decides."),
    R("Could you not just sign it yourself?",0,-8,-4,"Pushy. She'll protect her boss from you.")]},
  {w:"Our CRO. She'd want numbers after thirty days. I could bring her to a call.",c:"Probably the CRO. Send me something and I'll see.",r:[
    RW("Let's book thirty minutes with you and the CRO next week. I'll bring the pilot plan.",[2,8,10,"She offered the meeting with her boss. You took it, with a plan in hand."],[0,-8,-6,"She said 'send me something'. A meeting with her boss is too big a leap."]),
    RW("What would the CRO need to see to say yes to a free pilot?",[1,2,2,"Good, but she offered you the CRO. Take the meeting."],[2,6,8,"You gave her a reason to go back to the CRO for you."]),
    R("Great, I'll email you a deck.",1,0,-4,"A deck on its own rarely gets forwarded upwards.")]}
 ]}
];
const NB=6, WIN=12, T0={tr:40,in:35};
const warmOf=(tr,i)=>i*.6+tr*.4>=46;

/* ---------- the room: a sphere of dots ---------- */
const RO=1.0, RING=1.42;
const U2={uWarm:{value:.3},uCalm:{value:.5},uSpeak:{value:0},uHit:{value:0},uIn:{value:1},uLo:{value:new T.Color('#A5C3FF')},uHi:{value:new T.Color('#FFB475')}};
const DECL='uniform float uWarm,uCalm,uSpeak,uHit,uIn; uniform vec3 uLo,uHi;';
const orb=new T.Group(); st.scene.add(orb);
{ const N=Math.floor(2600*Q+900);
  orb.add(pts(cloud(N,(i,r,o)=>{ const y=1-2*(i+.5)/N, rr=Math.sqrt(1-y*y), a=i*2.399963; o[0]=Math.cos(a)*rr; o[1]=y; o[2]=Math.sin(a)*rr; }),
    PM({size:.05,color:'#A5C3FF',uniforms:U2,decl:DECL,body:`
      vec3 d=normalize(position);
      float n=sin(d.x*4.1+uTime*1.1)*sin(d.y*5.3-uTime*.9)*sin(d.z*3.7+uTime*.7);
      float fray=1.-uCalm;
      float r=${RO.toFixed(2)}*uIn*(1.+n*(.03+.17*fray)+uSpeak*.045*sin(uTime*19.+aR.x*6.283));
      float loose=step(.8,aR.w)*fray*(.3+.4*(.5+.5*sin(uTime*.7+aR.x*12.)));
      p=d*r*(1.+loose);
      col=mix(uLo,uHi,smoothstep(.2,.95,uWarm));
      col=mix(col,vec3(1.,.34,.21),clamp(-uHit,0.,1.)*.85);
      b=(.26+.5*aR.y)*(.75+.6*uWarm)+clamp(uHit,0.,1.)*.8+uSpeak*.2; b*=1.-loose*.55;
      sz=1.+.5*clamp(abs(uHit),0.,1.);`})));
  // a warm heart that grows with interest
  orb.add(pts(cloud(Math.floor(500*Q+200),(i,r,o)=>{ const v=[gauss(),gauss(),gauss()], l=Math.hypot(...v)||1, R=.1+Math.pow(r[0],1.8)*.6; o[0]=v[0]/l*R; o[1]=v[1]/l*R; o[2]=v[2]/l*R; }),
    PM({size:.06,color:'#A5C3FF',uniforms:U2,decl:DECL,body:'p*=uIn*(.55+.6*uWarm); col=mix(uLo,uHi,uWarm); b=(.12+.45*uWarm)*(.5+.5*aR.y)+uSpeak*.25;'})));
}
/* the call as a dial around the room: six marks, one per turn, lit by how each reply landed */
const dial=new T.Group(); st.scene.add(dial);
const MK=new Float32Array(NB).fill(-1), MKU={uCur:{value:0}};
const mkGeo=cloud(NB,(i,r,o,ex)=>{ const a=Math.PI/2-i*TAU/NB; o[0]=Math.cos(a)*RING; o[1]=Math.sin(a)*RING; o[2]=0; ex.aI[i]=i; ex.aK[i]=-1; },{aI:1,aK:1});
dial.add(pts(mkGeo,PM({size:.2,color:'#A5C3FF',uniforms:MKU,decl:'attribute float aI,aK; uniform float uCur;',body:`
  float cur=1.-step(.5,abs(aI-uCur));
  col=aK<-.5?vec3(.42,.4,.37):(aK<.5?vec3(1.,.34,.21):(aK<1.5?vec3(1.,.76,.57):vec3(.65,.76,1.)));
  b=aK<-.5?(.3+cur*(.55+.45*sin(uTime*5.))):1.25; sz=aK<-.5?(.8+cur*.5):1.25;`})));
{ const rg=new T.LineLoop(ringGeo(RING,240),dashMat('#A5C3FF','float a=.13*step(.5,fract(vAng*9.55));')); rg.rotation.x=Math.PI/2; rg.material.uniforms.uOp.value=1; dial.add(rg); }
const burst=Burst(st.scene,Math.floor(360*Q+120),'#A5C3FF',.06);
st.anchors=[new T.Vector3(0,RING,0),new T.Vector3(Math.cos(Math.PI/2-TAU/NB)*RING,Math.sin(Math.PI/2-TAU/NB)*RING,0),new T.Vector3(RO*.98,-.1,0)];

/* ---------- DOM ---------- */
const E={score:q$('#krScore'),combo:q$('#krCombo'),tr:q$('#krTr'),in:q$('#krIn'),trV:q$('#krTrV'),inV:q$('#krInV'),turn:q$('#krTurn'),who:q$('#krWho'),line:q$('#krLine'),note:q$('#krNote'),
  ops:q$('#krOps'),btns:$$('.krop',el),bar:q$('#krBar'),time:q$('.krtime',el),hint:q$('#krHint')};
const setPh=p=>{ el.dataset.ph=p; };
function meters(g){ E.tr.style.width=g.tr+'%'; E.in.style.width=g.in+'%'; E.tr.classList.toggle('lo',g.tr<25); E.in.classList.toggle('lo',g.in<20);
  E.trV.textContent=Math.round(g.tr); E.inV.textContent=Math.round(g.in); }
function setLine(text){ E.line.classList.remove('out'); E.line.textContent=''; const ws=text.split(' ');
  ws.forEach((w,i)=>{ const s=document.createElement('span'); s.className='kw'; s.textContent=w; E.line.appendChild(s); if(i<ws.length-1) E.line.appendChild(document.createTextNode(' ')); });
  E.line.setAttribute('aria-label',text); return $$('.kw',E.line); }
function noteShow(q,label,text,pts){ E.note.dataset.q=q; E.note.innerHTML=`<b>${label}</b>${text}${pts?`<em>+${fmt(pts)}</em>`:''}`; E.note.classList.add('on'); }
function noteHide(){ E.note.classList.remove('on'); }

/* ---------- the game ---------- */
let game=null, lastCall=-1;
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function newGame(){
  let ci=Math.floor(Math.random()*CALLS.length); if(ci===lastCall) ci=(ci+1)%CALLS.length; lastCall=ci;
  return {c:CALLS[ci],bi:-1,tr:T0.tr,in:T0.in,ph:'ring',t:0,words:[],wi:0,wt:0,order:[0,1,2],warm:false,score:0,shown:0,streak:0,good:0,qs:0,dead:0,rts:[],worst:null,hung:false,outcome:-1,pick:-1};
}
function startBeat(g,i){
  g.bi=i; g.ph='line'; g.t=0; g.wi=0; g.wt=0; g.pick=-1; const b=g.c.beats[i];
  g.warm=warmOf(g.tr,g.in); g.words=setLine(g.warm||!b.c?b.w:b.c); // the last coach note stays up while this line types in
  E.ops.classList.remove('in'); E.btns.forEach(x=>{ x.classList.remove('pick','dim','best'); x.removeAttribute('data-q'); });
  E.turn.textContent=`Turn ${i+1} / ${NB}`; MKU.uCur.value=i; setPh('line'); E.hint.textContent='';
}
function showOptions(g){
  const b=g.c.beats[g.bi]; g.order=shuffle([0,1,2]);
  E.btns.forEach((x,k)=>{ const r=b.r[g.order[k]]; $('span',x).textContent=r.t; x.setAttribute('aria-label',`Reply ${k+1}: ${r.t}`); });
  noteHide(); void E.ops.offsetWidth; E.ops.classList.add('in'); g.ph='pick'; g.t=0; setPh('pick'); A.tick();
  E.hint.textContent=FINE&&g.bi===0?'Pick a reply · keys 1, 2, 3':''; E.time.classList.remove('low'); // shown on the first turn only E.bar.style.transform='scaleX(1)';
}
function choose(g,k){
  if(!g||g.ph!=='pick') return;
  const b=g.c.beats[g.bi], wi=g.warm?0:1, rt=g.t; let q, dt_, din, note, label;
  if(k<0){ q=0; dt_=-10; din=-6; note='On a cold call, silence reads as doubt.'; label='Dead air'; g.dead++; A.buzz(); }
  else { const r=b.r[g.order[k]]; q=r.q[wi]; [dt_,din]=r.d[wi]; note=r.n[wi]; label=['Misread','Fair','Good read'][q]; g.pick=k; if(/\?\s*$/.test(r.t)) g.qs++; g.rts.push(rt); }
  g.tr=clamp(g.tr+dt_,0,100); g.in=clamp(g.in+din,0,100);
  // points: the read, a little for speed, more for a run of good reads
  let pts=0; if(q===2){ g.streak++; g.good++; } else g.streak=0;
  if(q>0){ const spd=Math.round(100*clamp(1-(rt-1.2)/7,0,1)); pts=Math.round(([0,120,300][q]+spd)*(q===2?1+.25*Math.min(g.streak-1,4):1)); g.score+=pts; }
  if(q===0&&!g.worst) g.worst={i:g.bi,n:note};
  // what the room does
  MK[g.bi]=k<0?0:q; mkGeo.attributes.aK.array[g.bi]=MK[g.bi]; mkGeo.attributes.aK.needsUpdate=true;
  U2.uHit.value=q===2?1:q===0?-1:.35;
  if(q===2){ A.chime(10+Math.min(g.streak,5)); A.chime(14+Math.min(g.streak,5),.08,.03); burst.emit(tv0.set(0,0,0),Math.floor(40*Q+14),1.6,COL.warm.clone().lerp(COL.ice,1-g.in/100),.2,1.1); feedback(.04,.3); }
  else if(q===1){ A.blip(); }
  else { A.buzz(); feedback(.18,.9,COL.red); }
  // the cards
  E.btns.forEach((x,i)=>{ if(i===k){ x.classList.add('pick'); x.dataset.q=q; } else x.classList.add('dim'); });
  if(q<2){ const bi=[0,1,2].find(i=>b.r[g.order[i]].q[wi]===2); if(bi!==undefined) E.btns[bi].classList.add('best'),E.btns[bi].classList.remove('dim'); }
  noteShow(q,label,note,pts); meters(g); E.combo.textContent=g.streak>1?`${g.streak} good reads in a row`:'';
  E.time.classList.remove('low'); g.ph='show'; g.t=0; setPh('show'); E.hint.textContent=FINE&&g.bi===0?'Space to skip ahead':'';
  if(g.bi>=1&&g.tr<=8) g.hung=true;
}
function next(g){
  if(!g||g.ph!=='show'||g.t<.25) return;
  if(g.hung||g.bi>=NB-1){ finish(g); return; }
  startBeat(g,g.bi+1);
}
function finish(g){
  const R=(g.tr+g.in)/2, last=MK[NB-1];
  g.outcome=g.hung?3:(R>=72&&last===2)?0:R>=54?1:R>=34?2:3;
  g.ph='end'; g.t=0; setPh('end'); noteHide(); E.ops.classList.remove('in'); E.hint.textContent='';
  g.words=setLine(g.outcome===3?g.c.hang:g.c.end[g.outcome]); g.wi=0; g.wt=0;
  if(g.outcome===3){ A.beep(330); setTimeout(()=>A.beep(250),260); } else if(g.outcome===0) A.chord(); else A.pop();
}
function results(g){
  const bonus=[600,300,100,0][g.outcome]; const total=g.score+bonus;
  const grade=['Demo booked','Follow-up set','Send an email',g.c.pr+' hung up'][g.outcome];
  const avg=g.rts.length?g.rts.reduce((a,b)=>a+b,0)/g.rts.length:0, turns=g.bi+1;
  const lines=[];
  if(g.outcome===0) lines.push(`${g.c.name.split(' ')[0]} booked the demo.`);
  if(g.worst) lines.push(`Turn ${g.worst.i+1}: ${g.worst.n}`);
  else if(g.dead) lines.push(`You went quiet ${g.dead===1?'once':g.dead+' times'}. On a call, silence reads as doubt.`);
  else if(g.outcome!==0) lines.push('No misreads, but the room never got warm enough to ask for the meeting.');
  lines.push('Kríos lets reps rehearse calls like this against a buyer who answers back, before a real one hears them.');
  st.result({grade,score:total,stats:[['Good reads',`${g.good} / ${turns}`],['Avg reply time',avg?avg.toFixed(1)+' s':'None'],['Questions asked',g.qs],
    ['Trust at the end',Math.round(g.tr)+'%'],['Interest at the end',Math.round(g.in)+'%'],['Dead air',g.dead]],text:lines.join(' ')});
}
const COL={ice:new T.Color('#A5C3FF'),warm:new T.Color('#FFB475'),red:new T.Color(.06,.01,0)}, tv0=new T.Vector3();

/* ---------- input ---------- */
E.btns.forEach((x,k)=>x.addEventListener('click',()=>{ if(game&&game.ph==='pick'&&S.stId==='kr'&&st.state==='play') choose(game,k); }));
addEventListener('keydown',e=>{
  if(S.stId!=='kr'||S.mode!=='station'||st.state!=='play'||!game||e.repeat) return;
  const n={Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2}[e.code];
  if(n!==undefined&&game.ph==='pick'){ e.preventDefault(); choose(game,n); return; }
  if((e.code==='Space'||e.code==='Enter')){ e.preventDefault(); if(game.ph==='show') next(game); else if(game.ph==='line') skipLine(game); }
});
st.onPointer=e=>{ if(st.state!=='play'||!game) return; if(game.ph==='show') next(game); else if(game.ph==='line') skipLine(game); };
// a tap anywhere outside the cards lands on the canvas (the HUD lets it through), so phones never need to aim
function skipLine(g){ if(g.wi<g.words.length){ g.words.forEach(w=>w.classList.add('on')); g.wi=g.words.length; g.wt=-.15; } }

/* ---------- lifecycle ---------- */
function resetDial(){ MK.fill(-1); mkGeo.attributes.aK.array.fill(-1); mkGeo.attributes.aK.needsUpdate=true; MKU.uCur.value=-9; }
st.play=function(){
  game=newGame(); resetDial(); MKU.uCur.value=0; shownScore=0; st.setState('play'); setPh('ring');
  E.score.textContent='0'; E.combo.textContent=''; E.turn.textContent=`Turn 1 / ${NB}`; meters(game); noteHide(); E.ops.classList.remove('in');
  E.who.textContent=`${game.c.name} · ${game.c.role}`; setLine('Calling '+game.c.name.split(' ')[0]+'...'); game.words.forEach(w=>w.classList.add('on'));
  E.hint.textContent=''; A.beep(440); setTimeout(()=>{ if(game&&game.ph==='ring') A.beep(440); },420);
};
st.abort=function(){ game=null; setPh('idle'); E.ops.classList.remove('in'); noteHide(); resetDial(); };
st.enter=function(){ U2.uIn.value=0; resetDial(); setPh('idle'); layout(true); };
st.exit=function(){ game=null; };
let lay=null;
function layout(force){ const n=NARROW(), key=n+'|'+st.state; if(!force&&key===lay) return; lay=key; const play=st.state!=='menu';
  // in a call the room sits in the gap between the buyer's line and the replies
  if(n){ if(play){ st.camP.set(0,.85,16.5); st.camL.set(0,.8,0); } else { st.camP.set(0,.35,12.5); st.camL.set(0,-.15,0); } }
  else { if(play){ st.camP.set(0,.6,11.6); st.camL.set(0,.56,0); } else { st.camP.set(0,.35,7.6); st.camL.set(0,-.5,0); } } }

let shownScore=0;
st.update=function(dt,t){
  layout(false);
  const g=game, play=st.state==='play'&&g;
  // the room breathes on the title screen; in a call it follows trust and interest
  const wT=play?g.in/100:.32+.18*Math.sin(t*.35), cT=play?g.tr/100:.62+.12*Math.sin(t*.27);
  U2.uWarm.value=damp(U2.uWarm.value,wT,1.8,dt); U2.uCalm.value=damp(U2.uCalm.value,cT,1.8,dt);
  U2.uIn.value=damp(U2.uIn.value,1,2.2,dt); U2.uSpeak.value=Math.max(0,U2.uSpeak.value-dt*3.2); U2.uHit.value=damp(U2.uHit.value,0,2.4,dt);
  orb.rotation.y=t*.07; orb.rotation.x=Math.sin(t*.13)*.12; dial.rotation.z=play?0:Math.sin(t*.2)*.04;
  if(!play&&st.state==='menu'&&Math.sin(t*1.7)>.985) U2.uSpeak.value=Math.max(U2.uSpeak.value,.5);
  burst.update(dt,0,1.6);
  if(play){
    g.t+=dt;
    if(g.ph==='ring'&&g.t>1.2){ A.blip(); startBeat(g,0); }
    else if(g.ph==='line'||g.ph==='end'){
      g.wt+=dt; const step=g.ph==='end'?.09:.055;
      while(g.wi<g.words.length&&g.wt>=step){ g.wt-=step; g.words[g.wi++].classList.add('on'); U2.uSpeak.value=1; if(g.wi%2) A.key(); }
      if(g.wi>=g.words.length){ if(g.ph==='line'&&g.wt>.15) showOptions(g); if(g.ph==='end'&&g.wt>1.5){ const gg=g; game=null; setPh('idle'); results(gg); } }
    }
    else if(g.ph==='pick'){
      const left=WIN-g.t; E.bar.style.transform=`scaleX(${Math.max(0,left/WIN).toFixed(4)})`;
      if(left<4&&!E.time.classList.contains('low')){ E.time.classList.add('low'); }
      if(left<3.5&&Math.floor(left)!==Math.floor(left+dt)) A.tick();
      if(left<=0) choose(g,-1);
    }
    else if(g.ph==='show'&&g.t>1.3) next(g);
    if(game){ shownScore=Math.abs(game.score-shownScore)<1?game.score:lerp(shownScore,game.score,1-Math.exp(-8*dt)); E.score.textContent=fmt(shownScore); }
  }
  if(st.state==='menu') notesUpdate(st);
};
st.build=function(){ resetDial(); };
/* test hook: the current call, and which card is the good read */
st._dbg={get game(){ return game; }, best(){ const g=game; if(!g||g.ph!=='pick') return -1; const wi=g.warm?0:1, b=g.c.beats[g.bi]; return [0,1,2].find(k=>b.r[g.order[k]].q[wi]===2); }};
})();

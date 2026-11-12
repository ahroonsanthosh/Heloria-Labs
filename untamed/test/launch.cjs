/* Earth's launch scene, before the last flight: saying yes to Ahroon plays it (the doors open, the lift brings the rocket up,
   Gideon and Owen each say their line under their name), Skip and Escape go straight on to the last flight, and the last
   flight then runs as it always did with the two of them at the desk. The world keeps quiet while it plays, its sound plays
   and stops, Gideon and Owen are never counted as met, and nothing is cut out of the pad outside it.
     node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/launch.cjs --out <dir> [--mobile] [--query time=21:30]
   The station's clock is stepped by hand where it matters: headless frames are slow. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  const D = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  /* step the station by hand: n frames of 1/30 s */
  const step = n => D((d, h, n) => { const st = h.ST.cr; for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } }, n);
  /* step until the launch scene's clock reaches c (or it ends) */
  const to = c => D((d, h, c) => { const st = h.ST.cr; for (let i = 0; i < 2000 && d.launch.state.on && d.launch.QS.t < c; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } return d.launch.state; }, c);
  const L = () => D(d => ({ ...d.launch.state, rig: d.launch.rig }));
  const until = async (fn, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await D(fn)) return true; await wait(250); } return false; };
  const ui = () => page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
    const box = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    const shown = [...document.querySelectorAll('#station button,#station a[href],#station .crl,#station .cre,#chrome .brand')].filter(vis).map(e => e.id || e.className);
    return { shown, skip: vis(document.querySelector('#crSkip')), say: vis(document.querySelector('.crqsay')), id: vis(document.querySelector('.crqid')), sayBox: box(document.querySelector('.crqsay')), idBox: box(document.querySelector('.crqid')), skipBox: box(document.querySelector('#crSkip')), W: innerWidth, H: innerHeight }; });
  const overlap = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);

  await D(d => d.skipCut()); await step(30); await wait(500);

  /* before: nothing of the scene, and the pad whole */
  { const s = await L(); rec(s.hole === 0 && !s.on && !s.figs && !s.desk, 'before it: the pad is whole and nothing of the scene is drawn', JSON.stringify({ hole: s.hole, figs: s.figs, desk: s.desk })); }
  /* (their only tags are the ones at the café, where they are regulars: see regulars.cjs; none is shown while the scene plays) */
  rec(await D(d => d.people.length === 3 && !d.people.some(p => /Gideon|Owen/.test(p.first))) && await page.evaluate(() => [...document.querySelectorAll('#crLabels > *')].filter(e => /Gideon|Owen/.test(e.textContent)).length === 2), 'Gideon and Owen are not among the three to meet, and have no tags but their own at the café');

  /* meet all three, heard out to the end: the scene is made ready in a quiet moment, its sound with it */
  await D(d => { d.place(); [0, 1, 2].forEach(i => { d.openTalk(d.people[i], d.people[i].lines.length - 1); d.closeTalk(true); }); });
  rec(await until(d => d.launch.state.built, 90000), 'once all three are met the scene is made ready, out of sight', JSON.stringify(await L()));
  { const s = await L(); rec(s.hole === 0 && !s.figs && !s.desk && s.rig && !s.rig.shaft && !s.rig.doorsShown, 'made ready, it is still not drawn and the pad is still whole', JSON.stringify({ hole: s.hole, figs: s.figs, desk: s.desk, rig: s.rig })); }
  rec(await until((d, h) => h.A.scoreReady, 120000), 'its sound is made, as a recording', JSON.stringify(await H(h => h.A._score())));

  /* Ahroon asks; Let's fly in the conversation plays the scene */
  await D((d, h) => { const st = h.ST.cr; for (let i = 0; i < 400 && !(d.talk().p && d.talk().ask); i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } const T = d.talk(); T.shown = T.txt.length; });
  rec(await D(d => !!d.talk().ask), 'Ahroon asks');
  await wait(900);
  if (mobile) await page.tap('#crFly'); else await page.click('#crFly');
  { const s = await L(); rec(s.on && s.pre && s.fin && s.hole > 1.5 && s.figs && s.desk, "Let's fly plays the launch scene first, as the first part of the last flight", JSON.stringify({ on: s.on, pre: s.pre, hole: s.hole })); }
  const met0 = await D(d => [...d.MET]);
  for (let i = 0; i < 40 && !(await ui()).skip; i++) await wait(250);   // (Skip fades in)
  { const u = await ui(); rec(u.skip && u.shown.length === 1 && /crSkip/.test(u.shown[0]), 'nothing on the screen but the picture and Skip', JSON.stringify(u.shown)); }
  /* the world is quiet: no input moves anything, nothing else answers */
  { const before = await D(d => [d.player.x, d.player.z, d.launch.QS.t]);
    await page.keyboard.down('KeyW'); await step(20); await page.keyboard.up('KeyW');
    if (mobile) await page.tap('canvas#gl', { position: { x: vp.width / 2, y: vp.height * .6 } }); else await page.mouse.click(vp.width / 2, vp.height * .6);
    await page.keyboard.press('Space'); await page.keyboard.press('KeyE'); await step(2);
    const after = await D(d => ({ p: [d.player.x, d.player.z], on: d.launch.state.on, talk: !!d.talk().p }));
    rec(after.on && !after.talk && Math.hypot(after.p[0] - before[0], after.p[1] - before[1]) < .01, 'while it plays, keys, clicks and taps do nothing (only Skip and Escape)', JSON.stringify({ before, after })); }

  /* the doors, the shaft's lamps, the lift */
  let s = await to(.3); const r0 = (await L()).rig;
  rec(r0.door < .05 && r0.rocket < -6 && r0.hatch < .05 && r0.shaft && r0.doorsShown, 'it starts with the doors shut and the rocket down the shaft, its hatch shut', JSON.stringify(r0));
  await shot(pre + 'launch-1-doors');
  s = await to(3.2); { const r = (await L()).rig; rec(r.door > 1.9 && s.lamp === 4, 'the doors slide away under the rim and the shaft lights up, ring by ring', JSON.stringify({ door: r.door, lamp: s.lamp })); }
  rec(await H(h => { const x = h.A._score(); return x.ready && !x.paused && x.want; }), 'its sound plays with it', JSON.stringify(await H(h => h.A._score())));
  { const lv = await H(h => h.A._loopRms()); rec(lv > .005, 'and is heard', 'rms ' + lv.toFixed(4)); }
  s = await to(5.5); { const r = (await L()).rig; rec(r.rocket > -6 && r.rocket < -.5, 'the lift brings the rocket up out of the ground', JSON.stringify(r)); }
  await shot(pre + 'launch-2-lift');
  s = await to(8.3); { const r = (await L()).rig; rec(Math.abs(r.rocket) < .01 && Math.abs(r.lift) < .01 && r.hatch > .95, 'it locks at the top, flush with the pad, and the hatch drops', JSON.stringify(r)); }

  /* Gideon: his name, his line */
  s = await to(9); rec(s.id === 'Gideon', 'Gideon, by name, as the camera comes to him', JSON.stringify({ id: s.id }));
  { const t = await page.evaluate(() => document.querySelector('.crqid').textContent); rec(/Andrena Ventures/.test(t) && /backs Heloria Labs/.test(t), 'his card says who he is', t); }
  s = await to(12.2); { const line = await D(d => d.launch.QLINES.gideon); rec(s.say === line && s.talk === 'gideon', 'Gideon says his line, typed out in full', JSON.stringify({ say: s.say })); }
  for (let i = 0; i < 40; i++) { const u = await ui(); if (u.say && u.id) break; await wait(250); }   // (they fade in)
  { const u = await ui(); rec(u.say && u.id && !overlap(u.sayBox, u.skipBox) && !overlap(u.idBox, u.skipBox) && u.sayBox[0] >= 0 && u.sayBox[2] <= u.W && u.idBox[2] <= u.W, 'his line and his card are on the screen, clear of Skip', JSON.stringify(u)); }
  await shot(pre + 'launch-3-gideon');
  /* the board: the lamps go green, the switch is thrown */
  s = await to(15.3); rec(s.greens === 10, 'the board goes green and the switch is thrown', JSON.stringify({ greens: s.greens, lever: (await L()).rig.lever }));
  /* Owen: his name, his line */
  s = await to(16.2); rec(s.id === 'Owen', 'Owen, by name', JSON.stringify({ id: s.id }));
  s = await to(18.8); { const line = await D(d => d.launch.QLINES.owen); rec(s.say === line && s.talk === 'owen', 'Owen says his line, typed out in full', JSON.stringify({ say: s.say })); }
  { const t = await page.evaluate(() => document.querySelector('.crqid').textContent); rec(/Investor/.test(t), 'his card says who he is', t); }
  await shot(pre + 'launch-4-owen');
  /* while it played: nobody counted as met, nothing else spoke up */
  rec(JSON.stringify(await D(d => [...d.MET])) === JSON.stringify(met0) && met0.length === 3, 'nobody is counted as met by it', JSON.stringify(met0));

  /* the end: the last flight from its start, the two of them at the desk */
  s = await to(25);
  { const f = await D(d => ({ on: d.FIN.on, pre: !!d.FIN.pre, t: d.FIN.t, ask: d.FIN.ask })), r = (await L()).rig;
    rec(f.on && !f.pre && s.done && !s.on && s.hole === 0 && !r.shaft, 'at its end the last flight starts, and the pad is whole again', JSON.stringify({ f, hole: s.hole })); }
  rec(await H(h => { const x = h.A._score(); return x.paused && !x.want; }), 'its sound stops with it', JSON.stringify(await H(h => h.A._score())));
  await step(60);
  { const r = (await L()).rig, dg = Math.hypot(r.gideon[0] - r.deskAt.gideon[0], r.gideon[1] - r.deskAt.gideon[1]), dO = Math.hypot(r.owen[0] - r.deskAt.owen[0], r.owen[1] - r.deskAt.owen[1]), f = await D(d => d.FIN.t);
    rec(dg < .05 && dO < .05 && (await L()).figs && f > 1, 'the last flight runs with Gideon and Owen at the desk', JSON.stringify({ dg, dO, finT: f })); }
  await wait(1500); await shot(pre + 'launch-5-flight');
  /* holding to launch: Owen works the board */
  await D((d, h) => { const st = h.ST.cr; for (let i = 0; i < 400 && !d.FIN.ask; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } });
  rec(await D(d => d.FIN.ask), 'and it waits on the pad for you to hold, as it always did');
  await D(d => { d.FIN.hold = true; }); await step(4);
  rec(await D(d => d.launch.QS.figs.owen.userData.arms[1].rotation.x < -.5), 'while you hold, Owen works the board');
  await D(d => { d.FIN.hold = false; });

  /* Skip: from the middle of it, the button itself */
  /* Earth again, from the start (the last flight put away first, as the white page does) */
  const again = async () => { await D((d, h) => { h.ST.cr.finaleEnd(); }); await H(h => { document.documentElement.classList.remove('fin'); h.earth(); }); await wait(800);
    await D(d => { d.skipCut(); d.AH.st = 'done'; }); await step(10); };
  await again();
  rec((await L()).hole === 0 && !(await L()).figs, 'back on Earth again, the pad is whole and nothing of it is drawn');
  /* sitting on the cliff's bench when it starts: up you get, and the kite stays home */
  await D((d, h) => { const c = d.cliff, P = d.player; P.x = c.F.x - 1.6; P.z = c.F.z + .6; P.u.copy(d.at(P.x, P.z)); c.sit(); const st = h.ST.cr; for (let i = 0; i < 60; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } });
  const sat = await D(d => d.cliff.CL.st);
  await D(d => d.startFinale()); await step(30);
  { const q = await D(d => ({ st: d.cliff.CL.st, k: d.cliff.CL.k, on: d.launch.state.on, busk: d.busk.state.lv, dmTag: d.busk.DM.lb.classList.contains('on'), card: d.PJ.el.classList.contains('on') }));
    rec(sat === 'sat' && q.on && q.st === 'idle' && q.k === 'home' && q.busk === 0 && !q.dmTag && !q.card, 'from the cliff bench: the scene plays, you are up, the kite is home, Diarmuid is silent and untagged, no landmark card', JSON.stringify({ sat, ...q })); }
  await to(5); for (let i = 0; i < 40 && !(await ui()).skip; i++) await wait(250);
  { const u = await ui(); rec(u.skip, 'Skip is there', JSON.stringify(u.shown)); }
  if (mobile) await page.tap('#crSkip'); else await page.click('#crSkip');
  { const s2 = await L(), f = await D(d => ({ on: d.FIN.on, pre: !!d.FIN.pre, t: d.FIN.t }));
    const ok = f.on && !f.pre && s2.done && !s2.on && s2.hole === 0 && s2.greens >= 0 && Math.abs(s2.rig.rocket) < .01 && s2.rig.hatch > .99 && !s2.rig.shaft && s2.figs;
    rec(ok, 'Skip goes straight on to the last flight, everything as the scene leaves it (rocket up, hatch down, the two at the desk)', JSON.stringify({ f, s2: { done: s2.done, hole: s2.hole, rig: s2.rig } })); }
  { const lit = await D(d => d.launch.QS.lights.every(l => l.material.uniforms.uC.value.g > l.material.uniforms.uC.value.r)); rec(lit, 'and the board is green'); }
  rec(await H(h => h.A._score().paused), 'its sound stops on Skip');

  /* Enter at the end of the invite says yes too; Escape skips */
  await again();
  await D(d => { d.openInvite(); const T = d.talk(); T.shown = T.txt.length; });
  await page.keyboard.press('Enter');
  { const q = await D(d => ({ on: d.launch.state.on, talk: !!d.talk().p })); rec(q.on && !q.talk, 'Enter at the end of the invite plays it too', JSON.stringify(q)); }
  await to(10.5);
  /* leaving the page: its sound stops at once, and comes back in step when you do */
  { const was = await H(h => h.A._score());
    await H(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hid = await H(h => h.A._score());
    await H(h => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
    await step(2); const back = await H(h => h.A._score());
    rec(!was.paused && hid.paused && !back.paused, 'leaving the page stops its sound at once; coming back brings it back', JSON.stringify({ was, hid, back })); }
  await page.keyboard.press('Escape');
  { const s3 = await L(), f = await D(d => ({ on: d.FIN.on, pre: !!d.FIN.pre })); rec(f.on && !f.pre && s3.done && s3.hole === 0 && Math.abs(s3.rig.rocket) < .01, 'Escape skips it too', JSON.stringify({ f, hole: s3.hole })); }

  /* in the café when it starts (by any way in): you are put back outside */
  await again();
  await D((d, h) => { d.cafe.enter(); d.cafe.run(4); });
  const inCafe = await D(d => d.cafe.C.on);
  await D(d => d.startFinale()); await step(10);
  { const q = await D(d => ({ on: d.launch.state.on, cafe: d.cafe.C.st, inside: d.cafe.C.on })); rec(inCafe && q.on && q.cafe === 'out' && !q.inside, 'from inside the café: it plays, and you are out of the café', JSON.stringify({ inCafe, ...q })); }
  await page.keyboard.press('Escape');
  rec(await D(d => d.FIN.on && !d.FIN.pre && d.launch.state.done), 'and Escape skips it');
  /* and once the last flight is over and Earth puts itself back, nothing of it is left */
  await D((d, h) => h.ST.cr.finaleEnd());
  { const s4 = await L(); rec(s4.hole === 0 && !s4.figs && !s4.desk && !s4.on && !s4.rig.shaft, 'after the last flight nothing of it is left drawn, and the pad is whole', JSON.stringify(s4)); }
  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

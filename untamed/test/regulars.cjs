/* Gideon and Owen, regulars at the café on Earth: both at their table outside it, seen from the street, with their name
   tags; sipping and looking round; a click or a tap on either (or E beside them, or a name tag from across town) gets you a
   word with that one in the same box as Diarmuid (no photo, nobody counted as met), the lines page through, and walking off
   or Escape ends it. They keep clear of the café's door, Diarmuid and the barista, and while the launch scene and the last
   flight play (where the same two stand at the desk) they are not at the café at all; afterwards they are back.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/regulars.cjs --out <dir> [--mobile] [--query time=21:30] [--meter]
   The station's clock is stepped by hand where only the logic matters: headless frames are slow. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__G = {
      run(n, watch) { let bad = 0; const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o));
        for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); const q = d.player; if (watch && fixed.some(o => Math.hypot(q.x - o.x, q.z - o.z) < o.r + .12)) bad++; }
        return bad; },
      put(x, z, fx, fz) { const P = d.player; d.began(); P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.tk = 0; P.tgt = null; P.path = null; P.speed = 0; },
      talk() { const T = d.talk(); return T.p ? T.p.first : null; },
      box() { const t = document.querySelector('#crTalk'); return { on: t.classList.contains('on'), last: t.classList.contains('last'), name: document.querySelector('#crTkN').textContent, text: document.querySelector('#crTkS').textContent + document.querySelector('#crTkR').textContent }; },
      /* a point on the town's map, in the café's own frame (x across, z out to the street) */
      cafe(x, z) { const inv = d.regs.REG.M.clone().invert(), p = d.at(x, z).multiplyScalar(24).applyMatrix4(inv); return [+p.x.toFixed(3), +p.z.toFixed(3)]; },
    };
  });
  const G = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__G, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = n => H((h, n) => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tapAt = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const tags = () => page.evaluate(() => { const o = {}; for (const e of document.querySelectorAll('#crLabels .crl')) if (/^(Gideon|Owen)$/.test(e.textContent)) { const r = e.getBoundingClientRect(); o[e.textContent] = { on: e.classList.contains('on'), can: e.classList.contains('can'), ask: e.classList.contains('ask'), box: [r.left, r.top, r.right, r.bottom].map(Math.round) }; } return o; });
  await H(h => h.ST.cr._dbg.skipCut()); await G(e => e.run(30));
  const T = await G((e, d) => d.regs.REGS.map(r => ({ who: r.first, x: r.x, z: r.z, L0: r.L0, L1: r.L1 })));
  const [GI, OW] = T;

  /* both are there, at the table, made with the town, and not among the three to meet */
  const there = await G((e, d) => ({ n: d.regs.REGS.length, vis: d.regs.REGS.map(r => r.g.visible && !!r.g.parent), people: d.people.length, guest: d.regs.REGS.every(r => r.guest), state: d.regs.state }));
  rec(there.n === 2 && there.vis.every(Boolean) && there.people === 3 && there.guest, 'Gideon and Owen are at their table outside the café, and are not among the three to meet', JSON.stringify(there.state.map(s => [s.who, s.x, s.z])));

  /* nothing overlaps: the café's door and its step, Diarmuid and his things, the barista inside, the walk to the door */
  const room = await G((e, d) => { const R = d.regs.REGS, D = d.busk.DM, C = d.cafe, out = {};
    out.door = R.map(r => +(Math.hypot(r.ob.x - C.local(0, 1.4)[0], r.ob.z - C.local(0, 1.4)[1]) - r.ob.r).toFixed(2));
    out.doorX = R.map(r => +(Math.abs(e.cafe(r.ob.x, r.ob.z)[0]) - r.ob.r).toFixed(2));   // how far across from the doorway's middle their edge is
    out.front = R.map(r => e.cafe(r.x, r.z)[1]);   // out in front of the café's wall (its front is at 1.4)
    out.busk = R.map(r => +Math.min(...D.obs.map(o => Math.hypot(r.ob.x - o.x, r.ob.z - o.z) - o.r - r.ob.r)).toFixed(2));
    const bw = C.local(C.BP.home[0], C.BP.home[1]); out.barista = R.map(r => +Math.hypot(r.x - bw[0], r.z - bw[1]).toFixed(2));
    out.pair = +(Math.hypot(R[0].ob.x - R[1].ob.x, R[0].ob.z - R[1].ob.z) - R[0].ob.r - R[1].ob.r).toFixed(2);
    out.inObs = R.every(r => d.OBS.includes(r.ob));
    out.grid = R.every(r => { const i = Math.round((r.ob.x - d.NAV.O) / d.NAV.S), j = Math.round((r.ob.z - d.NAV.O) / d.NAV.S); return d.NAV.free[j * d.NAV.N + i] === 0; });
    /* (a way ends between one metre and reach from where it is going: see navPath) */
    const [sx, sz] = C.local(-2.6, 4.4), [gx, gz] = C.local(0, 1.4), p = d.navPath(sx, sz, gx, gz, 1.5); out.toDoor = !!p;
    const [ax, az] = C.local(-3.4, 3.2), [bx, bz] = C.local(2.4, 3.6), q = d.navPath(ax, az, bx, bz, 1.2); out.along = !!q;
    return out; });
  rec(room.door.every(v => v > .55) && room.doorX.every(v => v > .4), 'they keep clear of the café door and its step', JSON.stringify({ door: room.door, doorX: room.doorX }));
  rec(room.front.every(v => v > 1.6), 'they sit outside on the pavement, not in the café', JSON.stringify(room.front));
  rec(room.busk.every(v => v > .8), 'and well away from Diarmuid, his amp and his case', JSON.stringify(room.busk));
  rec(room.barista.every(v => v > 2.2), 'and from the barista, inside behind the counter', JSON.stringify(room.barista));
  rec(room.pair > .2, 'and do not sit in each other', String(room.pair));
  rec(room.inObs && room.grid, 'their places are solid and marked on the walking grid');
  rec(room.toDoor && room.along, 'the way to the door, and along the pavement past them, is still open', JSON.stringify({ toDoor: room.toDoor, along: room.along }));

  /* from the street: both are on the screen and nothing is in front of them */
  await G(e => { e.put(1.6, -8.9, 1.6, -12); e.run(40); }); await frames(3);
  const seen = await G((e, d) => [d.regs.screen(0), d.regs.screen(1)]);
  rec(seen.every(s => s.seen && s.mid[0] > 0 && s.mid[0] < vp.width && s.mid[1] > 0 && s.mid[1] < vp.height && s.mid[2] < 1), 'from the street both are in view, nothing in front of them', JSON.stringify(seen.map(s => ({ mid: s.mid.map(v => +v.toFixed(0)), seen: s.seen }))));
  await wait(400); const tg = await tags();
  const ov = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);
  rec(tg.Gideon && tg.Owen && tg.Gideon.on && tg.Owen.on && !ov(tg.Gideon.box, tg.Owen.box), 'their name tags are up, side by side and not on top of each other', JSON.stringify(tg));
  await shot(pre + 'regulars-day');

  /* alive: each sips (the cup up to the mouth and back down on the saucer), and their heads move */
  const sip = await G((e, d) => { const R = d.regs.REGS, r = R[1], y0 = r.cup.position.y, h0 = R.map(q => [q.g.userData.head.rotation.x, q.g.userData.head.rotation.y]);
    d.regs.REG.turn = 0; d.regs.REG.tt = 5; r.sipT = 0; e.run(30); const up = r.cup.position.y - y0, tilt = r.cup.rotation.x; e.run(90); const back = Math.abs(r.cup.position.y - y0);
    const h1 = R.map(q => [q.g.userData.head.rotation.x, q.g.userData.head.rotation.y]), moved = h1.some((h, i) => Math.hypot(h[0] - h0[i][0], h[1] - h0[i][1]) > .01);
    return { up: +up.toFixed(3), tilt: +tilt.toFixed(2), back: +back.toFixed(4), moved }; });
  rec(sip.up > .15 && sip.tilt < -.2 && sip.back < .002, 'Owen sips: the cup up to his mouth, tipped, and back down on its saucer', JSON.stringify(sip));
  rec(sip.moved, 'and their heads move as they talk and look round');
  const turns = await G((e, d) => { const seenT = new Set(); for (let i = 0; i < 600; i++) { e.run(1); seenT.add(d.regs.REG.turn); } return [...seenT]; });
  rec(turns.length === 2, 'they take turns talking to each other', JSON.stringify(turns));
  const ms = await G((e, d, h) => { const n = 300, t0 = performance.now(); for (let i = 0; i < n; i++) d.regs.update(1 / 60, h.S.t + i / 60); return +((performance.now() - t0) / n).toFixed(3); });
  rec(ms < .5, 'their part of a frame is light', ms + ' ms a frame here (software rendering)');

  /* a click or tap on Owen: he talks, in the same box as everyone (no photo, nobody met) */
  const met0 = await G((e, d) => d.MET.size);
  await G(e => { e.put(2.7, -9.4, 1.6, -11.6); e.run(40); }); await frames(3);
  let s = await G((e, d) => d.regs.screen(1));
  await tapAt(s.mid[0], s.mid[1]);
  let b = await G((e, d) => ({ talk: e.talk(), ...e.box(), met: d.MET.size }));
  rec(b.talk === 'Owen' && b.on && !b.last && b.met === met0, (mobile ? 'a tap' : 'a click') + ' on Owen: he talks to you, in the same box', JSON.stringify({ at: s.mid.map(v => +v.toFixed(0)), b }));
  await G(e => e.run(10)); await frames(3); await shot(pre + 'regulars-talk');
  const said = []; for (let i = 0; i < 12; i++) { const q = await G((e, d) => ({ talk: e.talk(), ...e.box(), met: d.MET.size }));
    if (!q.talk) break; if (!said.length || said[said.length - 1].text !== q.text) said.push(q);
    if (mobile) await page.touchscreen.tap(vp.width * .5, vp.height * .35); else await page.keyboard.press('Enter'); await G(e => e.run(2)); }
  const lines = said.map(q => q.text);
  rec(JSON.stringify(lines) === JSON.stringify(OW.L0), 'his lines page through, one at a time, and then it closes', JSON.stringify(lines));
  rec(said.every(q => !q.last && q.met === met0 && q.name === 'Owen'), 'no photo or page in his box, and nobody is counted as met', JSON.stringify(said.map(q => [q.name, q.last, q.met])));
  const done = await G((e, d) => ({ talk: e.talk(), met: d.regs.REGS[1].met }));
  rec(!done.talk && done.met, 'heard out, the box is gone', JSON.stringify(done));
  /* again: he has another line (where he is on the screen once more: the camera turned to the two of you while he talked) */
  await G(e => e.run(30)); await frames(3); s = await G((e, d) => d.regs.screen(1)); await tapAt(s.mid[0], s.mid[1]); b = await G(e => ({ talk: e.talk(), ...e.box() }));
  rec(b.talk === 'Owen' && b.text === OW.L1[0], 'asked again, he has something else to say', JSON.stringify(b));
  /* walking off ends it (a key pressed once it has begun: one already held when it began does not count) */
  await G(e => e.run(3)); await page.keyboard.down('KeyS'); await G(e => e.run(30)); await page.keyboard.up('KeyS');
  rec(!(await G(e => e.talk())), 'walking away ends the conversation');

  /* E beside Gideon: he talks; Escape ends it */
  await G(e => { e.put(.9, -10.0, .96, -11.56); e.run(4); });
  await page.keyboard.press('KeyE'); b = await G(e => ({ talk: e.talk(), ...e.box() }));
  rec(b.talk === 'Gideon' && b.text === GI.L0[0], 'E beside Gideon: he talks', JSON.stringify(b));
  await page.keyboard.press('Escape'); rec(!(await G(e => e.talk())), 'Escape ends it');
  /* E between them and Diarmuid goes to whoever is nearer */
  await G(e => { e.put(2.4, -10.5, 2, -11.6); e.run(4); });
  await page.keyboard.press('KeyE'); const eo = await G((e, d) => ({ talk: e.talk(), dO: d.regs.REGS[1].d, dDM: d.busk.state.d }));
  rec(eo.talk === 'Owen', 'E with Owen nearer than Diarmuid talks to Owen', JSON.stringify(eo));
  await G((e, d) => d.closeTalk());
  /* (Diarmuid busks outside the pub now, across town from them: E beside him goes to him, not to them) */
  await G((e, d) => { const D = d.busk.DM, fx = D.face[0] - D.x, fz = D.face[1] - D.z, k = Math.hypot(fx, fz); D.st = 'play'; D.cool = 0; e.put(D.x + fx / k * 1.6, D.z + fz / k * 1.6, D.x, D.z); e.run(4); });
  await page.keyboard.press('KeyE'); const ed = await G(e => e.talk());
  rec(ed === 'Diarmuid', 'and beside Diarmuid, to Diarmuid', String(ed));
  await G((e, d) => { d.closeTalk(); const D = d.busk.DM; D.st = 'play'; D.cool = 0; });

  /* a name tag from across town: you walk over (round things) and he talks when you get there */
  await G(e => { e.put(-2, -3, 1, -11.5); e.run(10); }); await wait(600);   // (a tag takes no click for a moment after a conversation with them ends)
  const tagged = await G((e, d) => { d.regs.REGS[0].lb.click(); return { goal: d.regs.REG.goal && d.regs.REG.goal.first, path: !!d.player.path }; });
  const walk = await G((e, d) => { let i = 0, bad = 0; for (; i < 900 && !d.talk().p; i++) bad += e.run(1, ['me']); return { frames: i, bad, talk: e.talk(), d: +d.regs.REGS[0].d.toFixed(2) }; });
  rec(tagged.goal === 'Gideon' && walk.talk === 'Gideon' && walk.bad === 0, 'Gideon\'s tag from across the square walks you over round things, and he talks', JSON.stringify({ tagged, walk }));
  await G((e, d) => d.closeTalk());

  /* on a computer, pointing at one of them shows their name and offers to say hello */
  if (!mobile) {
    await G(e => { e.put(1.6, -6.4, 1.6, -12); e.run(30); }); await frames(3);
    s = await G((e, d) => d.regs.screen(0)); await page.mouse.move(s.mid[0] - 40, s.mid[1] + 40); await page.mouse.move(s.mid[0], s.mid[1], { steps: 4 }); await frames(2);
    const hv = await page.evaluate(() => { const l = [...document.querySelectorAll('#crLabels .crl')].find(x => x.textContent === 'Gideon'); return { on: l.classList.contains('on'), cur: document.querySelector('#curT') && document.querySelector('#curT').textContent }; });
    rec(hv.on && hv.cur === 'Say hello', 'pointing at Gideon shows his name, and the pointer offers to say hello', JSON.stringify(hv));
    await page.mouse.move(5, vp.height - 5);
  }

  /* the cup on the saucer: a quiet clink, no louder than a footstep on the pavement (with --meter) */
  const metered = await page.evaluate(() => !!window.__meter);
  if (metered) {
    const peak = async fn => { await H(fn); let pk = 0; for (let i = 0; i < 12; i++) { pk = Math.max(pk, (await page.evaluate(() => window.__meter().pk))); await wait(15); } return pk; };
    await G(e => { e.put(1.6, -9.6, 1.6, -12); e.run(4); }); await wait(1500);
    const quiet = await peak(() => {}); await wait(600);
    const step = await peak(h => h.A.step(1)); await wait(600);
    const clink = await peak(h => { const r = h.ST.cr._dbg.regs.REGS[0]; h.A.clink(.009 * (1 - r.d / 9)); });
    log('peaks: quiet', quiet, 'step', step, 'clink', clink);
    rec(clink <= Math.max(step, quiet) * 1.1, 'the clink of a cup is no louder than a footstep', JSON.stringify({ quiet, step, clink }));
  }

  /* the launch scene: the same two are at the desk, so they are not at the café; then the last flight; then back */
  await G((e, d) => { [0, 1, 2].forEach(i => { d.openTalk(d.people[i], d.people[i].lines.length - 1); d.closeTalk(true); }); d.closeTalk(); e.put(1.6, -8.9, 1.6, -12); e.run(5); });
  const before = await G((e, d) => d.regs.REGS.map(r => r.g.visible));
  await G((e, d) => d.launch.start());
  const during = []; for (const c of [.5, 5, 9.5, 14, 17]) during.push(await G((e, d, h, c) => { for (let i = 0; i < 1500 && d.launch.QS.on && d.launch.QS.t < c; i++) e.run(1);
    const R = d.regs.REGS; return { t: +d.launch.QS.t.toFixed(1), on: d.launch.QS.on, cafe: R.map(r => r.g.visible), desk: !!(d.launch.QS.figs.gideon && d.launch.QS.figs.gideon.visible), tags: R.map(r => r.lb.classList.contains('on')) }; }, c));
  rec(before.every(Boolean) && during.every(q => q.on && q.desk && q.cafe.every(v => !v) && q.tags.every(v => !v)), 'while the launch scene plays they are at the desk and not at the café (never two of each), and no tags', JSON.stringify(during));
  if (!mobile) await page.keyboard.press('Escape'); else await G((e, d) => d.launch.skip());
  const flight = await G((e, d) => { e.run(10); return { fin: d.FIN.on, pre: !!d.FIN.pre, cafe: d.regs.REGS.map(r => r.g.visible), desk: !!d.launch.QS.figs.gideon.visible }; });
  rec(flight.fin && !flight.pre && flight.desk && flight.cafe.every(v => !v), 'in the last flight after it, still only the two at the desk', JSON.stringify(flight));
  await G((e, d, h) => { h.ST.cr.finaleEnd(); }); await H(h => { document.documentElement.classList.remove('fin'); h.earth(); }); await wait(800);
  await G((e, d) => { d.skipCut(); d.AH.st = 'done'; e.put(1.6, -8.9, 1.6, -12); e.run(30); }); await frames(3); await wait(400);
  const after = await G((e, d) => ({ cafe: d.regs.REGS.map(r => r.g.visible), desk: !!(d.launch.QS.figs.gideon && d.launch.QS.figs.gideon.visible) }));
  const tg2 = await tags();
  rec(after.cafe.every(Boolean) && !after.desk && tg2.Gideon.on && tg2.Owen.on, 'back on Earth afterwards, they are at their table again, tags and all', JSON.stringify({ after, tg2 }));

  /* at night */
  await H(h => { const d = h.ST.cr._dbg; d.sky.set({ time: '21:30', weather: 'clear' }); d.sky.step(1); });
  await G(e => { e.put(1.6, -8.9, 1.6, -12); e.run(20); }); await wait(2500);
  const nseen = await G((e, d) => [d.regs.screen(0).seen, d.regs.screen(1).seen]);
  rec(nseen.every(Boolean), 'at night they are still there, in view', JSON.stringify(nseen));
  await shot(pre + 'regulars-night');

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

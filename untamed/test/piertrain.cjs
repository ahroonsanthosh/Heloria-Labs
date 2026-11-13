/* The harbour pier and the coast train on Earth.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/piertrain.cjs --out <dir> [--mobile] [--meter]
   The pier: the path finder walks you from the landing pad out to its head (and you get there without walking through
   anything), your steps on it are boards, you cannot walk off its side into the sea, its piles stand from below low water to
   above high water while the tide rises and falls round them (and the rowing boat tied up there rises and falls with it),
   and its lamps are lit at night. Everyone can still be walked to from the end of the pier.
   The train: its first stop at the halt comes within about a minute of arriving on Earth, and after that one every three
   minutes or so; it slows into the halt (the whistle first, then the brakes), stands a few seconds and pulls away, its wheels
   knocking over the rail joints. With you on the crossing it stops short and waits, both ways, and goes on once you are off;
   it never comes within a step of you, and it is solid. Its windows are lit at night. No new shader is made, and with
   --meter each of its sounds is heard and none is much louder than a footstep. Its clock is stepped by hand: timing is the
   point, but not the speed of the machine. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__C = {
      snd: [], fixed: null,
      run(n, watch) { let bad = 0; const fixed = this.fixed || (this.fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o)));
        for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); if (watch && fixed.some(o => Math.hypot(d.player.x - o.x, d.player.z - o.z) < o.r + .12)) bad++; } return bad; },
      until(src, max, watch) { const f = (0, eval)('(' + src + ')'); let i = 0, bad = 0; for (; i < max && !f(d); i++) bad += this.run(1, watch); return { frames: i, bad, done: !!f(d) }; },
      put(x, z, fx, fz, pitch, zoom) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = pitch || d.cam.PITCH; d.cam.zoom = zoom || 1; P.tgt = null; P.path = null; P.speed = 0; P.h = d.pier.onPier(x, z) === false ? P.h : d.pier.onPier(x, z); },
      count(name) { return this.snd.filter(s => s.n === name).length; },
      sea() { return -.9 + d.coast.TD.h; },
    };
    for (const n of ['railClack', 'trainWhistle', 'trainBrakes', 'step']) { const f = h.A[n]; h.A[n] = function () { window.__C.snd.push({ n, t: h.S.t, a: [...arguments] }); return f && f.apply(this, arguments); }; }
  });
  const C = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__C, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  await H(h => { h.A.start && h.A.start(); });
  await H(h => h.ST.cr._dbg.skipCut()); await C(c => c.run(10)); await wait(300);
  const p0 = await progs();
  /* (the train's first stop after arriving, noted before anything here moves its clock) */
  const first = await C((c, d) => { const T = d.pier.TR; return { since: +(T.clk - T.t0).toFixed(1), dueIn: +(T.next - T.t0).toFixed(1), st: T.st }; });

  /* ---------- it is all there ---------- */
  const built = await C((c, d) => { const P = d.pier.PR, M = d.pier.PRM, H_ = P.Hc; return { err: M.err, caps: P.caps.length, len: +d.pier.TRK.len.toFixed(1), train: M.train.length, trestle: d.OBS.filter(o => o.r === .42 && o.h === .5).length,
    head: { walk: d.life.walkable(H_[0], H_[1]), h: d.pier.onPier(H_[0], H_[1]), x: +H_[0].toFixed(2), z: +H_[1].toFixed(2) }, toHead: !!d.navPath(-3.2, -12, H_[0], H_[1], 1.6), lamps: M.lamps.length, piles: M.piles.length,
    off: d.life.walkable(H_[0] + P.d[0] * 1.6, H_[1] + P.d[1] * 1.6) }; });
  rec(!built.err && built.caps >= 5 && built.train === 3 && built.trestle > 20 && built.lamps >= 4 && built.piles > 20, 'the pier, the halt, the line and the train are made', JSON.stringify(built));
  rec(built.head.walk && built.head.h === -.08 && !built.off && built.toHead, 'the pier head is boards to stand on, the sea past it is not, and the path finder reaches it from the landing pad', JSON.stringify(built));

  /* ---------- walking out to the end of the pier: round whatever is in the way, onto the boards, steps that sound like boards ---------- */
  /* (Ahroon waits by the pad to say hello to someone he has not met, and the way to the pier goes past him now the building site
     stands in the straight line: met him already, so this is only about the pier) */
  const out = await C((c, d) => { const P = d.pier.PR; d.MET.add(0); c.put(-3.2, -12, P.Hc[0], P.Hc[1]); const T = d.pier.TR; T.next = T.clk + 600; d.pier.trPlan(); d.began();
    const p = d.navPath(-3.2, -12, P.Hc[0], P.Hc[1], 1.2); d.player.path = p ? p.concat([[P.Hc[0], P.Hc[1]]]) : null; d.player.stuck = 0; const s0 = c.snd.length;
    const u = c.until(d => !d.player.path && !d.player.tgt, 30 * 40, true); const steps = c.snd.slice(s0).filter(s => s.n === 'step'), last = steps.slice(-3).map(s => s.a[0]);
    return { ...u, on: d.pier.onPier(d.player.x, d.player.z), h: +d.player.h.toFixed(2), d: +Math.hypot(d.player.x - P.Hc[0], d.player.z - P.Hc[1]).toFixed(2), last, steps: steps.length }; });
  rec(out.done && out.bad === 0 && out.on !== false && out.d < 1, 'you walk from the landing pad out to the end of the pier, without walking through anything', JSON.stringify(out));
  rec(out.last.length >= 2 && out.last.every(k => k === 2) && Math.abs(out.h + .08) < .03, 'on the pier you stand on the boards, and your steps sound like boards', JSON.stringify(out));
  const edge = await C((c, d) => { const P = d.pier.PR, e = P.e; c.put(P.Hc[0], P.Hc[1], P.Hc[0] + e[0], P.Hc[1] + e[1]); window.__heloria.ST.cr._dbg.player.speed = 0; return 1; });
  if (!mobile) { await page.keyboard.down('KeyW'); await C(c => c.run(90)); await page.keyboard.up('KeyW'); }
  else await C((c, d) => { const P = d.pier.PR; d.player.tgt = d.at(P.Hc[0] + P.e[0] * 3, P.Hc[1] + P.e[1] * 3).multiplyScalar(24); c.run(90); });
  const stay = await C((c, d) => ({ on: d.pier.onPier(d.player.x, d.player.z) !== false, x: +d.player.x.toFixed(2), z: +d.player.z.toFixed(2) }));
  rec(stay.on, 'walking at the side of the pier, you stay on it (no walking off into the sea)', JSON.stringify(stay));
  await C((c, d) => { const P = d.pier.PR; c.put(P.C[0] + 1.3, P.C[1] + .5, P.Hc[0], P.Hc[1], .5, 1.35); c.run(60); }); await frames(4); await shot(pre + 'pt-pier-day');

  /* ---------- everyone can still be walked to, from the end of the pier ---------- */
  const navs = await C((c, d) => { const out = [], P = d.pier.PR;
    for (let i = 0; i < 3; i++) { const p = d.people[i]; d.closeTalk(); d.MET.clear(); d.people.forEach(q => { q.greeted = false; q.resume = 0; }); c.put(P.Hc[0], P.Hc[1], p.x, p.z); c.run(2);
      d.goTalk(p); const u = c.until(d => !!d.talk().p, 30 * 45, true); const T = d.talk(); out.push({ who: p.first, done: u.done && T.p === p, bad: u.bad, frames: u.frames }); d.closeTalk(); c.run(10); }
    return out; });
  rec(navs.every(n => n.done && n.bad === 0), 'from the end of the pier, each of us can be walked to, round whatever is in the way', JSON.stringify(navs));

  /* ---------- the tide round the piles, and the boat on it ---------- */
  const tide = await C((c, d) => { const co = d.coast, P = d.pier.PRM, piles = P.piles, out = {};
    for (const [k, v] of [['low', -1], ['high', 1]]) { co.tide(v); c.run(4); const sea = c.sea(), b = new THREE.Vector3().setFromMatrixPosition(P.boat.g.matrix).length() - 24;
      out[k] = { sea: +sea.toFixed(3), boat: +(b - sea).toFixed(3), deckOver: +(-.08 - sea).toFixed(2), wet: piles.filter(([g, y]) => g < sea).length, under: piles.filter(([g, y]) => g < sea && g - .1 > sea).length, over: piles.filter(([g, y]) => g < sea && y < sea).length }; }
    co.tide(null); return out; });
  rec(tide.low.wet > 6 && tide.low.under === 0 && tide.high.over === 0 && tide.high.deckOver > .4 && tide.high.wet >= tide.low.wet, 'the piles stand in the sea from below low water to above high water, the deck well clear of the highest tide', JSON.stringify(tide));
  rec(Math.abs(tide.low.boat) < .1 && Math.abs(tide.high.boat) < .1 && tide.high.sea - tide.low.sea > .3, 'the rowing boat tied up at the pier rises and falls with the tide', JSON.stringify(tide));

  /* ---------- the train: its first stop soon after you arrive, then one every three minutes ---------- */
  rec(first.dueIn > 15 && first.dueIn <= 60, 'its first stop at the halt is due within a minute of arriving on Earth', JSON.stringify(first));
  const sched = await C((c, d) => { const T = d.pier.TR, P = d.pier.PR; c.put(-16.5, 6, -16, 7); T.st = 'end'; T.sN = P.sMin; T.dir = 1; T.v = 0; T.next = T.clk + P.FIRST; d.pier.trPlan(); T.t0 = T.clk; T.arrive.length = 0;
    const vs = []; let k = 0; const s0 = c.snd.length;
    for (let i = 0; i < 20 * (P.FIRST + 10); i++) { d.pier.step(.05); if (T.st === 'run' && T.to === P.sHalt) vs.push([+(P.sHalt - T.sN).toFixed(2), +T.v.toFixed(2)]); if (T.st === 'halt') break; }
    const atHalt = { st: T.st, after: +(T.clk - T.t0).toFixed(1), sN: +T.sN.toFixed(2) }; let dwell = 0; while (T.st === 'halt' && dwell < 30) { d.pier.step(.05); dwell += .05; }
    d.pier.step(700); const arr = T.arrive.map(a => +(a - T.t0).toFixed(1)), gaps = arr.slice(1).map((a, i) => +(a - arr[i]).toFixed(1));
    const last = vs.filter(v => v[0] < 1), slowing = last.length > 3 && last.every((v, i) => i === 0 || v[1] <= last[i - 1][1] + 1e-6);
    return { atHalt, dwell: +dwell.toFixed(1), arr, gaps, slowing, peak: Math.max(...vs.map(v => v[1])), near: last.slice(-3), stops: T.stops }; });
  rec(sched.atHalt.st === 'halt' && sched.atHalt.after <= 60 && Math.abs(sched.atHalt.sN - (await C((c, d) => d.pier.PR.sHalt))) < .03, 'from where it waits at the end of the line, it is at the halt within a minute', JSON.stringify(sched.atHalt));
  rec(sched.slowing && sched.peak > 1 && sched.dwell >= 4 && sched.dwell <= 9, 'it slows into the halt, stands a few seconds and pulls away', JSON.stringify({ slowing: sched.slowing, peak: sched.peak, near: sched.near, dwell: sched.dwell }));
  rec(sched.gaps.length >= 3 && sched.gaps.every(g => g > 165 && g < 195), 'after that it stops at the halt every three minutes or so, each way in turn', JSON.stringify({ arr: sched.arr, gaps: sched.gaps }));
  const snd = await C((c, d) => { const n = d.pier.TR.n || {}; return { clack: n.railClack || 0, whistle: n.trainWhistle || 0, brakes: n.trainBrakes || 0 }; });
  rec(snd.clack > 10 && snd.whistle >= 4 && snd.brakes >= 3, 'as it goes its wheels knock over the joints; it whistles as it comes in and its brakes hiss as it stops', JSON.stringify(snd));

  /* ---------- it never runs through you: stopped short of the crossing, both ways, until you are off it ---------- */
  const cross = await C((c, d) => { const T = d.pier.TR, P = d.pier.PR, out = {};
    /* going north from the halt, with you on the crossing */
    c.put(P.C[0], P.C[1], P.Hc[0], P.Hc[1]); c.run(2); T.st = 'halt'; T.sN = P.sHalt; T.dir = 1; T.dwell = .1; T.v = 0; T.waits = 0; T.minGap = 99; T.blocked = false; T.held = false;
    d.pier.step(25); out.north = { st: T.st, front: +(T.sN - P.sC).toFixed(2), v: +T.v.toFixed(2), blocked: T.blocked, waits: T.waits, gap: +T.minGap.toFixed(2) };
    c.put(P.C[0] - P.nS[0] * 3, P.C[1] - P.nS[1] * 3, P.C[0], P.C[1]); c.run(2); d.pier.step(12); out.northGone = { front: +(T.sN - P.sC).toFixed(2), st: T.st };
    /* coming south from the end of the line, with you on the crossing */
    d.pier.step(4); c.put(P.C[0], P.C[1], P.Hc[0], P.Hc[1]); c.run(2); T.st = 'end'; T.sN = P.sMax; T.dir = -1; T.v = 0; T.next = T.clk + 14; d.pier.trPlan(); T.waits = 0; T.minGap = 99;
    d.pier.step(40); out.south = { st: T.st, tail: +(T.sN - P.len - P.sC).toFixed(2), v: +T.v.toFixed(2), blocked: T.blocked, waits: T.waits, gap: +T.minGap.toFixed(2) };
    c.put(P.C[0] - P.nS[0] * 3, P.C[1] - P.nS[1] * 3, P.C[0], P.C[1]); c.run(2); d.pier.step(15); out.southGone = { st: T.st, sN: +T.sN.toFixed(2), passed: T.sN < P.sC };
    /* it is solid: its own round shapes in the town's solids, where it is */
    const veh = d.pier.PRM.train.map(t => t.ob.every(o => d.OBS.includes(o))); out.solid = veh.every(Boolean); return out; });
  rec(cross.north.blocked === 'you' && cross.north.front < -.85 && cross.north.v === 0 && cross.north.waits >= 1 && cross.north.gap > .3, 'with you on the crossing, it stops short of it and waits (going north)', JSON.stringify(cross.north));
  rec(cross.northGone.front > 1, 'once you are off the crossing it goes on', JSON.stringify(cross.northGone));
  rec(cross.south.blocked === 'you' && cross.south.tail > .85 && cross.south.v === 0 && cross.south.gap > .3, 'and the same coming south', JSON.stringify(cross.south));
  rec(cross.southGone.passed, 'and on again once you step off', JSON.stringify(cross.southGone));
  rec(cross.solid, 'the train is solid where it stands', JSON.stringify(cross.solid));

  /* ---------- the train at the halt, by day; the pier and the train at night ---------- */
  await C((c, d) => { const T = d.pier.TR, P = d.pier.PR; T.st = 'halt'; T.sN = P.sHalt; T.dwell = 60; T.dir = 1; const o = d.pier.prAt(P.sHalt - P.len / 2, -2.6, {}); c.put(o.x, o.z, o.x + P.nS[0], o.z + P.nS[1], .32, 1.15); c.run(60); });
  await frames(4); await shot(pre + 'pt-train-halt');
  const lit = await C((c, d) => { const M = d.pier.PRM, col = () => M.lampM.material.uniforms.uC.value.toArray().map(v => +v.toFixed(2)), out = {};
    d.sky.set({ time: '14:00' }); c.run(30); out.day = { lamp: col(), win: M.train.every(t => !t.wm.visible) };
    d.sky.set({ time: '22:30' }); c.run(60); out.night = { lamp: col(), win: M.train.every(t => t.wm.visible), fisher: M.fisher.g.visible }; return out; });
  rec(lit.night.lamp[2] < lit.day.lamp[2] - .15 && lit.night.lamp[0] >= .95 && lit.night.win && lit.day.win, 'at night the pier\'s lamps and the train\'s windows are lit; by day they are not', JSON.stringify(lit));
  await C((c, d) => { const P = d.pier.PR; c.put(P.C[0] + 1.7, P.C[1] + 1.5, P.Hc[0], P.Hc[1], .45, 1.45); c.run(60); }); await frames(4); await shot(pre + 'pt-pier-night');
  await C((c, d) => { d.sky.set({ time: '15:00' }); c.run(10); });

  /* ---------- no new shader, and the sounds ---------- */
  const p1 = await progs();
  rec(p1 === p0 && p0 <= 74, 'none of it makes a new shader (the same count as before the pier: 74 at most)', JSON.stringify({ before: p0, after: p1 }));
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 1400) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(400); return +pk.toFixed(4); };
    await H(h => { h.A.music(0); }); await wait(1500);
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['step(0) again', h => h.A.step(0)], ['step(1) again', h => h.A.step(1)],
      ['railClack', h => h.A.railClack()], ['trainWhistle', h => h.A.trainWhistle()], ['trainBrakes', h => h.A.trainBrakes()]]) lv[n] = await listen(f);
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)'], lv['step(0) again'], lv['step(1) again']);
    rec(step > 0 && ['railClack', 'trainWhistle', 'trainBrakes'].every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'each of the train\'s sounds is heard, and none is much louder than a footstep', JSON.stringify(lv));
  }

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

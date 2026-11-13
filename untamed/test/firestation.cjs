/* The fire station on Earth: its door by the clock, and the drill.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/firestation.cjs --out <dir> [--mobile] [--query time=22:30] [--meter]
   By day its roller door is up and the engine stands in the bay with the two on duty by it; by night it is down. The door
   goes down in the evening and up in the morning as the visitor's clock passes, with the shutter's sounds. A click (a tap)
   on the engine starts a drill: the bell and the blue lights, the two run the hose out onto the forecourt, the water goes up
   in a high arc and comes down as drops and mist on the forecourt, with a rainbow in it while the sun is out (none in
   fog), then it is shut off and they walk the hose back in; a puddle stays a while and dries. A drill also starts by
   itself now and then by day, and a click on either of the two starts one too; at night, with the door down, none does. A
   drill compiles nothing new. The way to every landmark and everyone you can talk to is still there. With --meter the
   bell and the water are heard against a footstep. At night (--query time=22:30) only the door down and the pictures. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  await H(h => {
    const st = h.ST.cr, d = st._dbg, f = d.fire;
    window.__F = {
      snd: [], maxBow: 0, maxFlow: 0, maxLit: 0, maxPud: 0, drops: false, hose: false, phases: new Set(), out: 0,
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); const s = f.FS; this.maxBow = Math.max(this.maxBow, s.bow); this.maxFlow = Math.max(this.maxFlow, s.flow); this.maxLit = Math.max(this.maxLit, s.lit); this.maxPud = Math.max(this.maxPud, s.pud);
        if (f.FS.drops.visible) this.drops = true; if (f.FS.hose.m.visible) this.hose = true; this.phases.add(s.dr); this.out = Math.max(this.out, s.ff[0].z); } },
      until(src, max) { const fn = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !fn(f, d); i++) this.run(1); return { frames: i, done: !!fn(f, d) }; },
      put(lx, lz, fx, fz) { const [x, z] = f.local(lx, lz), P = d.player, t = d.at(...f.local(fx, fz)); P.x = x; P.z = z; P.u.copy(d.at(x, z)); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      clear() { this.maxBow = this.maxFlow = this.maxLit = this.maxPud = 0; this.drops = this.hose = false; this.phases = new Set(); this.out = 0; this.snd = []; },
      count(n) { return this.snd.filter(s => s.n === n).length; },
    };
    for (const n of ['fireBell', 'hoseGush', 'hoseSplash', 'shutterMotor', 'ratchet', 'shutterEnd']) { const fn = h.A[n]; h.A[n] = function () { window.__F.snd.push({ n, t: h.S.t, a: [...arguments] }); return fn.apply(this, arguments); }; }
  });
  const W = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__F, h.ST.cr._dbg.fire, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const state = () => W((w, f) => f.state);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const onScreen = q => q[2] < 1 && q[0] > 0 && q[0] < vp.width && q[1] > 0 && q[1] < vp.height;
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const night = await H(h => { const d = h.ST.cr._dbg; d.skipCut(); return d.sky.state.night > .5; });
  const pre = (mobile ? 'm-' : '') + (night ? 'n-' : '');
  await H(h => { h.A.start && h.A.start(); });
  await W((w, f, d) => { d.began(); w.run(30); }); await wait(300);
  const FW = await W((w, f) => f.FW);
  let s = await state();
  rec(!(await W((w, f) => f.err)), 'the fire station was built without an error', String(await W((w, f) => f.err)));

  /* ---- at night: the door is down, nobody about, and no drill ---- */
  if (night) {
    rec(s.door === 0 && s.doorT === 0 && s.crew.every(q => !q.vis), 'at night the roller door is down and the two are inside', JSON.stringify({ door: s.door, crew: s.crew }));
    await W(w => { w.put(.5, 6.0, .5, 0); w.run(40); }); await frames(4); await shot(pre + 'fire-1-street');
    rec(!(await W((w, f) => f.drill('test'))), 'and no drill can start with the door down', '');
    console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : '')); if (fail) process.exitCode = 1; return;
  }

  /* ---- by day: the door up, the engine in the bay, the two by it, the name over the front ---- */
  await W(w => { w.put(.4, 6.0, -.2, 0); w.run(45); }); await frames(4); s = await state();
  const sc = { engine: await W((w, f) => f.screen('engine')), sign: await W((w, f) => f.screen('sign')), crew0: await W((w, f) => f.screen('crew0')) };
  rec(s.door === 1 && s.crew.every(q => q.vis) && onScreen(sc.engine) && onScreen(sc.sign), 'by day the door is up: the engine in the bay, the two by it, FIRE STATION over the front, all in view from the street', JSON.stringify({ door: s.door, sc: Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v.map(x => +x.toFixed(0))])) }));
  await shot(pre + 'fire-1-street');
  const prog0 = await progs();

  /* ---- the door by the clock: down in the evening, up in the morning, with the shutter's sounds ---- */
  await W((w, f, d) => { w.clear(); d.sky.set({ time: '21:10' }); w.run(30 * 6); }); s = await state();
  rec(s.door === 0 && await W(w => w.count('shutterMotor')) === 1 && await W(w => w.count('ratchet')) >= 6 && await W(w => w.count('shutterEnd')) === 1 && s.crew.every(q => !q.vis), 'after nine in the evening the door rolls down (motor, slats, its stop) with the two inside', JSON.stringify({ door: s.door, snd: await W(w => w.snd.map(x => x.n).join(',')) }));
  await W((w, f, d) => { w.clear(); d.sky.set({ time: '07:40' }); w.run(30 * 6); }); s = await state();
  /* (counting only shutters going up: the chipper's along the street comes down for the morning in earshot) */
  rec(s.door === 1 && await W(w => w.snd.filter(x => x.n === 'shutterMotor' && x.a[0] === true).length) === 1 && s.crew.every(q => q.vis), 'and after half past seven in the morning it rolls up again', JSON.stringify({ door: s.door }));
  await W((w, f, d) => { d.sky.set({ time: '15:00' }); w.run(30); });

  /* ---- a drill, by a click (a tap) on the engine through the open door ---- */
  await W(w => { w.put(.4, 6.0, -.2, 0); w.run(30); w.clear(); }); await frames(4);
  const exy = await W((w, f) => f.screen('engine')); await tap(exy[0], exy[1]); s = await state();
  rec(s.dr !== 'idle' && s.by === 'click' && s.lit > 0 && await W(w => w.count('fireBell')) === 1, (mobile ? 'a tap' : 'a click') + ' on the engine starts a drill: the bell rings and the blue lights flash', JSON.stringify({ dr: s.dr, by: s.by, lit: s.lit, xy: exy.map(v => +v.toFixed(0)) }));
  let r = await W(w => w.until(f => f.FS.dr === 'spray', 30 * 6)); await W(w => w.run(30 * 3)); s = await state();
  const land = await W((w, f) => { const [mx, mz] = f.FS.landXZ, Mi = f.FS.Mi, p = window.__heloria.ST.cr._dbg.at(mx, mz).multiplyScalar(24).applyMatrix4(Mi); return [+p.x.toFixed(2), +p.z.toFixed(2)]; });
  const ap = FW.APRON, onApron = land[0] > ap[0] - .2 && land[0] < ap[1] + .2 && land[1] > ap[2] && land[1] < ap[3] + .2;
  rec(r.done && s.flow > .9 && s.drops && s.hose && s.crew[0].hold > .9 && s.crew[1].hold > .9 && s.crew[0].z > 2, 'they run the hose out onto the forecourt, and the water goes up in an arc, the second holding the hose behind', JSON.stringify({ r, flow: s.flow, hose: s.hose, crew: s.crew }));
  rec(onApron, 'the water comes down on the forecourt', JSON.stringify({ land, apron: ap }));
  rec(await W(w => w.count('hoseGush')) === 1 && await W(w => w.count('hoseSplash')) >= 8, 'the water let go with a gush, and its patter where it lands', JSON.stringify({ gush: await W(w => w.count('hoseGush')), splash: await W(w => w.count('hoseSplash')) }));
  rec(s.sun > .9 && s.bow > .5, 'in the sunshine there is a rainbow in the mist', JSON.stringify({ sun: s.sun, bow: s.bow }));
  rec(s.pud > .2 && s.pudVis, 'a puddle spreads where it comes down', JSON.stringify({ pud: s.pud }));
  const progD = await progs(); rec(progD === prog0, 'a drill compiles nothing new', prog0 + ' then ' + progD);
  /* the picture: from across the street, the arc, the rainbow and the two at work */
  await H(h => { const st = h.ST.cr, d = st._dbg, f = d.fire; window.__F.hold = true; const u = st.update;
    st.update = function (dt, t) { const r = u.apply(this, arguments); if (window.__F.view) { const V = window.__F.view; st.camP.copy(f.world(...V.p)); st.camL.copy(f.world(...V.l)); h.stCam.up.copy(f.FS.up); h.S.stSnap = true; } return r; }; });
  await W(w => { w.view = { p: [1.1, 2.0, 7.4], l: [-.4, 1.9, 1.6] }; w.run(2); }); await frames(4); await wait(600); await shot(pre + 'fire-2-drill');
  await W(w => { w.view = null; w.run(2); });
  r = await W(w => w.until(f => f.FS.dr === 'idle', 30 * 30)); s = await state();
  rec(r.done && w8(await W(w => [...w.phases])), 'the water is shut off and they walk the hose back in', JSON.stringify({ r, phases: await W(w => [...w.phases]) }));
  function w8(ph) { return ['bell', 'out', 'spray', 'off', 'in', 'idle'].every(p => ph.includes(p)); }
  rec(await W(w => w.count('hoseGush')) === 2 && !s.hose && !s.drops && s.crew.every(q => q.z < 1.3), 'with a sputter as it stops; the hose away and the two back by the engine', JSON.stringify({ gush: await W(w => w.count('hoseGush')), crew: s.crew }));
  rec(s.pud > .2 && s.pudVis, 'the puddle stays on the forecourt', JSON.stringify({ pud: s.pud }));
  await W(w => { w.view = { p: [1.1, 2.0, 7.4], l: [-.4, 1.0, 1.6] }; w.run(2); }); await frames(4); await wait(400); await shot(pre + 'fire-3-puddle'); await W(w => { w.view = null; w.run(2); });
  /* (no drill of its own meanwhile) */
  await W((w, f) => { f.FS.next = 1e9; w.run(30 * 50); }); const half = (await state()).pud; await W(w => w.run(30 * 60)); s = await state();
  rec(half < .8 && half > 0 && s.pud === 0 && !s.pudVis, 'and dries away over a minute and a half', JSON.stringify({ half, end: s.pud }));

  /* ---- a click (a tap) on one of the two starts one too ---- */
  await W(w => { w.put(.4, 6.0, -.2, 0); w.run(30); w.clear(); }); await frames(4);
  const cxy = await W((w, f) => f.screen('crew0')); await tap(cxy[0], cxy[1]); s = await state();
  rec(s.dr !== 'idle' && s.by === 'click', (mobile ? 'a tap' : 'a click') + ' on one of the two starts a drill too', JSON.stringify({ dr: s.dr, by: s.by, xy: cxy.map(v => +v.toFixed(0)) }));
  await W((w, f) => { f.reset(); w.run(10); });

  /* ---- by itself now and then, in the daytime, with you near enough to see ---- */
  s = await state(); rec(s.next > 30, 'the next one is a while off', String(s.next));
  await W((w, f) => { f.FS.next = 2; w.clear(); w.run(30 * 3); }); s = await state();
  rec(s.dr !== 'idle' && s.by === 'timer' && await W(w => w.count('fireBell')) === 1, 'and when its time comes a drill starts by itself', JSON.stringify({ dr: s.dr, by: s.by }));
  await W((w, f) => { f.reset(); w.run(10); });

  /* ---- the rainbow only in sunshine: none in fog ---- */
  await W((w, f, d) => { d.sky.set({ weather: 'fog', wxT: 60 }); d.sky.step(2); w.clear(); f.drill('test'); w.until(f => f.FS.dr === 'spray', 30 * 6); w.run(30 * 4); });
  s = await state(); rec(s.flow > .9 && s.sun < .2 && await W(w => w.maxBow) < .02, 'in fog the water goes up all the same, but there is no rainbow', JSON.stringify({ sun: s.sun, bow: await W(w => w.maxBow) }));
  await W((w, f, d) => { f.reset(); d.sky.set({ weather: 'clear' }); d.sky.step(1); w.run(10); });
  /* and at dusk, with the sun down at the horizon, none either */
  await W((w, f, d) => { d.sky.set({ time: '20:55' }); d.sky.step(1); w.clear(); f.drill('test'); w.until(f => f.FS.dr === 'spray', 30 * 6); w.run(30 * 4); });
  s = await state(); const e = await W((w, f, d) => d.sky.state.e); rec(e > 3 || await W(w => w.maxBow) < .3, 'with the sun low the rainbow is faint or gone', JSON.stringify({ e, bow: await W(w => w.maxBow) }));
  await W((w, f, d) => { f.reset(); d.sky.set({ time: '15:00' }); d.sky.step(1); w.run(10); });

  /* ---- the way to everywhere, past the station: every landmark and everyone you can talk to ---- */
  const nav = await W((w, f, d) => { const from = { pad: [-3.2, -12], fire: f.local(-.3, 2.3), pub: d.pub.local(-.32, 2.4) }, out = {};
    const goals = { ...Object.fromEntries(Object.entries(d.INST).map(([k, q]) => [k, [q.x, q.z, Math.max(1.2, q.r * .8)]])), ...Object.fromEntries(d.people.map(q => [q.first, [q.x, q.z, 1.8]])), Diarmuid: [...d.busk.spot, 1.8],
      poDoor: [...d.po.local(.95, 2.15), 1.2], pubDoor: [...d.pub.local(-.32, 2.2), 1.2], fire: [...f.local(-.3, 2.2), 1.2], bench: [...d.cliff.M.sitA, 1.3], kite: [...d.cliff.M.kiteA, 1.3] };
    for (const [a, [fx, fz]] of Object.entries(from)) for (const [g, [gx, gz, rr]] of Object.entries(goals)) { const q = d.navPath(fx, fz, gx, gz, rr); out[a + '>' + g] = q ? q.length : null; }
    return out; });
  const miss = Object.entries(nav).filter(([, v]) => v === null).map(([k]) => k);
  rec(miss.length === 0, 'there is a way to every landmark, each of us, Diarmuid, the cliff and every door on the street, from the pad, the station and the pub', miss.length ? 'none for ' + miss.join(', ') : Object.keys(nav).length + ' ways');
  /* and walking over to Michael from the forecourt goes through nothing */
  const walk = await W((w, f, d) => { d.closeTalk(); w.put(-.3, 2.4, 0, 6); d.MET.clear(); d.people.forEach(p => { p.greeted = false; }); w.run(4); d.closeTalk(); d.goTalk(d.people[1]); let bad = 0, i = 0; const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o) && o.r > 0);
    for (; i < 30 * 40 && !d.talk().p; i++) { w.run(1); const P = d.player; if (fixed.some(o => Math.hypot(P.x - o.x, P.z - o.z) < o.r + .12)) bad++; } const who = d.talk().p && d.talk().p.first; d.closeTalk(); return { frames: i, bad, talk: who }; });
  rec(walk.talk === 'Michael' && walk.bad === 0, 'from the forecourt, clicking Michael walks you to him through nothing', JSON.stringify(walk));

  /* ---- with --meter: how loud the bell and the water are, against a footstep ---- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 1500) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(300); return +pk.toFixed(4); };
    await H(h => { h.A.music(0); }); await wait(1500);
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['step(0) again', h => h.A.step(0)], ['step(1) again', h => h.A.step(1)], ['bell', h => h.A.fireBell(.022, 0)], ['gush(open)', h => h.A.hoseGush(true, .02, 0)], ['gush(shut)', h => h.A.hoseGush(false, .016, 0)],
      ['splash', h => { for (let k = 0; k < 8; k++) setTimeout(() => h.A.hoseSplash(1, .016, 0), k * 120); }]]) lv[n] = await listen(f);
    log('LEVELS (peak at the speakers, each at its loudest: beside it) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)'], lv['step(0) again'], lv['step(1) again']);
    rec(step > 0 && ['bell', 'gush(open)', 'gush(shut)', 'splash'].every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'the bell and the water are heard, and none is much louder than a footstep', JSON.stringify(lv));
  }

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

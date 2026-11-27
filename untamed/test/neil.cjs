/* Neil, at the site for what is next, and his place across the sea to the west, on Earth.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/neil.cjs --out <dir> [--mobile] [--meter]
   He is there once you have landed, at the site's gate with his tractor beside him: both solid and on the walking grid, the
   site's sign still read over the tractor's bonnet. His name tag shows as you come near; a tap on him from across the street
   walks you over and he talks, four lines, as a guest (not one of the three, no photo, no page); asked again, his last line.
   He turns to you as you come, and looks at his phone now and then when nobody is with him. You cannot walk through him or
   his tractor. Over the sea: his place is built, and drawn only from the west side of the island; from the bench on the
   cliff it is on the screen and over the horizon; its lights are on by night; sea fog takes it. A firing on his test stand:
   the flame and the cloud, and its sound from over the water, heard from the cliff and much less from the town; none in the
   small hours. With --meter the firing's sound is measured against a footstep. Pictures of him and of the view by day, at
   night and while an engine fires. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  await H(h => { const st = h.ST.cr, d = st._dbg;
    window.__NT = { calls: [],
      run(n, watch) { let bad = 0; const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o));
        for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); if (watch && fixed.some(o => Math.hypot(d.player.x - o.x, d.player.z - o.z) < o.r + .12)) bad++; } return bad; },
      until(src, max) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(d); i++) this.run(1); return { frames: i, done: !!f(d) }; },
      put(x, z, fx, fz) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.tk = 0; P.tgt = null; P.path = null; P.speed = 0; },
      talk() { const T = d.talk(); return T.p ? { who: T.p.first, i: T.i, txt: T.L[T.i], n: T.L.length, guest: !!T.p.guest } : null; } };
    const A = h.A; for (const n of ['testFire']) { const f = A[n]; A[n] = function () { window.__NT.calls.push({ n, g: +arguments[0].toFixed(4), t: +h.S.t.toFixed(2) }); return f && f.apply(this, arguments); }; } });
  const N = (fn, a) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__NT, h.ST.cr._dbg, h, a), [fn.toString(), a]);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = async xy => { if (mobile) await page.touchscreen.tap(xy[0], xy[1]); else await page.mouse.click(xy[0], xy[1]); };
  await H(h => h.ST.cr._dbg.skipCut()); await N(n => n.run(30));
  await N((n, d) => { d.sky.set({ time: '11:30', weather: 'clear' }); n.run(10); });

  /* ---------- him and his tractor ---------- */
  const s0 = await N((n, d) => d.neil.state);
  rec(s0.ok && !s0.err && s0.obs >= 3, 'Neil is built once you have landed, with his tractor', JSON.stringify({ ok: s0.ok, err: s0.err, at: [s0.x, s0.z], tr: s0.tr, obs: s0.obs }));
  const where = await N((n, d) => { const G = d.grow, e = G.list.find(q => q.status === 'next'), NL = d.neil.NL, P = G.plot(e.id), gx = Math.round((NL.x - d.NAV.O) / d.NAV.S), gz = Math.round((NL.z - d.NAV.O) / d.NAV.S),
      tx = Math.round((NL.trAt[0] - d.NAV.O) / d.NAV.S), tz = Math.round((NL.trAt[1] - d.NAV.O) / d.NAV.S);
    return { site: +G.rectD(e, NL.x, NL.z).toFixed(2), road: +G.roadDist(NL.x, NL.z).toFixed(2), trSite: +G.rectD(e, NL.trAt[0], NL.trAt[1]).toFixed(2), trRoad: +G.roadDist(NL.trAt[0], NL.trAt[1]).toFixed(2),
      grid: [d.NAV.free[gz * d.NAV.N + gx], d.NAV.free[tz * d.NAV.N + tx]], inObs: NL.obs.every(o => d.OBS.includes(o)), tag: NL.lb && NL.lb.textContent }; });
  rec(where.site < 1.4 && where.road > 1.9 && where.tag === 'Neil', 'he stands at the site\'s gate, off the road, with his name tag', JSON.stringify(where));
  rec(where.trSite < 1.2 && where.trRoad > 2.2 && where.inObs && where.grid[0] === 0 && where.grid[1] === 0, 'his tractor is beside the site, off the pavement, and both are solid and shut on the walking grid', JSON.stringify(where));
  /* the site's sign reads over the tractor: from the pavement across the front, the sign is the first thing on the way to it */
  const sign = await N((n, d) => { const G = d.grow, e = G.list.find(q => q.status === 'next'), P = G.plot(e.id), T = window.THREE, out = [], sw = P.sign.getWorldPosition(new T.Vector3());
    for (const lx of [-1.6, -.5, .6]) { const [x, z] = G.xz(e, lx, 4.4), eye = d.at(x, z).multiplyScalar(24 + 1.6), dir = sw.clone().sub(eye), L = dir.length(); dir.normalize();
      const rc = new T.Raycaster(eye, dir, 0, L + .5); rc.layers.set(0); const hit = rc.intersectObjects([P.g, d.neil.NL.grp], true)[0];
      out.push({ lx, first: hit ? (hit.object === P.sign ? 'sign' : hit.object.type) : null, d: hit ? +(L - hit.distance).toFixed(2) : null }); }
    return out; });
  rec(sign.filter(s => s.first === 'sign').length >= 2, 'the site\'s sign still reads from the pavement, over the tractor\'s bonnet', JSON.stringify(sign));

  /* ---------- his name tag, a tap, and his lines ---------- */
  const nl = await N((n, d) => [d.neil.NL.x, d.neil.NL.z]);
  const far = await N((n, d, h, a) => { n.put(a[0] + 7.5, a[1] + 2.5, a[0], a[1]); n.run(6); return d.neil.state; }, nl);
  const near = await N((n, d, h, a) => { n.put(a[0] + 3.6, a[1] + 1.4, a[0], a[1]); n.run(6); return d.neil.state; }, nl);
  rec(!far.tag && near.tag, 'his name tag shows as you come near (not from across the street)', JSON.stringify({ far: [far.d, far.tag], near: [near.d, near.tag] }));
  await N((n, d, h, a) => { n.put(a[0] + 7.5, a[1] + 2.5, a[0], a[1]); d.cam.pitch = .12; n.run(10); }, nl); await frames(3);
  const sc = await N((n, d) => d.neil.screen());
  await tap(sc.mid); await frames(2);
  const walk = await N(n => n.until(d => !!d.talk().p, 30 * 30));
  const t0 = await N(n => n.talk());
  rec(walk.done && t0 && t0.who === 'Neil' && t0.i === 0, 'a tap on him from across the street walks you over, and he talks', JSON.stringify({ sc, walk, t0 }));
  rec(t0 && t0.guest && t0.n === 4 && /Indiana/.test(t0.txt), 'four lines, as a guest: first, that he is over from Indiana', JSON.stringify(t0));
  await N(n => n.run(30)); await frames(3); await shot(pre + 'neil-1-talk');
  const face = await N((n, d) => { const NL = d.neil.NL, P = d.player, to = d.at(P.x, P.z).sub(NL.u.clone().multiplyScalar(NL.u.dot(d.at(P.x, P.z)))).normalize(); return +Math.acos(Math.max(-1, Math.min(1, NL.f.dot(to)))).toFixed(3); });
  rec(face < .45, 'he turns to you as you talk', 'off by ' + face + ' rad');
  const lines = []; for (let k = 0; k < 6; k++) { const t = await N(n => n.talk()); if (!t) break; lines.push(t.txt); await N((n, d) => { d.nextTalk(); d.nextTalk(); n.run(3); }); }
  const after = await N((n, d) => ({ talk: n.talk(), met: d.neil.NL.met, metThree: d.MET ? [...d.MET].length : null }));
  rec(lines.length === 4 && /Camden/.test(lines.join(' ')) && /five thousand acres/.test(lines.join(' ')) && /cliff/.test(lines[3]) && !after.talk && after.met, 'he tells you about his farm, the hub in Camden, and to look west from the cliff; then he has had his say', JSON.stringify({ lines, after }));
  const again = await N((n, d) => { d.neil.ask(); n.run(3); return n.talk(); });
  rec(again && again.n === 1 && /cliff/.test(again.txt), 'asked again, his last line', JSON.stringify(again));
  await N((n, d) => { d.closeTalk(); n.run(10); });

  /* ---------- his phone, and walking round him and his tractor ---------- */
  const ph = await N((n, d, h, a) => { n.put(a[0] + 8, a[1] + 3, a[0], a[1]); let seen = false; for (let i = 0; i < 30 * 40 && !seen; i++) { n.run(1); seen = d.neil.NL.ph > 0; } return seen; }, nl);
  rec(ph, 'with nobody near him, he looks at his phone now and then');
  /* (walking straight at each of them, toward a spot just the other side: you come up against them, and do not go in) */
  const round = await N((n, d) => { const NL = d.neil.NL, out = {};
    for (const [nm, o, obs] of [['Neil', [NL.x, NL.z], [NL.ob]], ['tractor', NL.trAt, NL.obs.filter(q => q !== NL.ob)]]) {
      const u = d.at(o[0], o[1]), P = d.player, [px, pz] = [o[0] + (o[0] - NL.x === 0 ? 0 : 0), o[1]];
      /* from the pavement in front (out from the site, the way he faces the street), to a point behind, at the fence */
      const fx = Math.sin(NL.trAt[2] - Math.PI / 2), fz = Math.cos(NL.trAt[2] - Math.PI / 2), sx = o[0] + fx * 2.6, sz = o[1] + fz * 2.6, tx = o[0] - fx * .9, tz = o[1] - fz * .9;
      n.put(sx, sz, tx, tz); n.run(2); P.tgt = d.at(tx, tz).multiplyScalar(24); P.path = null; d.began(); let m = 9;
      for (let i = 0; i < 30 * 4; i++) { n.run(1); for (const q of obs) m = Math.min(m, Math.hypot(P.x - q.x, P.z - q.z) - q.r); }
      out[nm] = +m.toFixed(3); P.tgt = null; }
    return out; });
  rec(round.Neil > .15 && round.tractor > .15, 'walking straight at him or his tractor, you come up against them and do not go in', JSON.stringify(round));

  /* ---------- his place over the sea ---------- */
  const fs = await N((n, d) => { const F = d.neil.FAR; n.put(4, -8, 8, -8); n.run(5); const town = F.grp.visible; n.put(13.5, -6.2, 30, -6.4); n.run(5); return { ok: F.ok, err: F.err, town, west: F.grp.visible, lights: d.neil.state.far.lights }; });
  rec(fs.ok && !fs.err && fs.lights > 10, 'his place over the sea is built, with its lights', JSON.stringify(fs));
  rec(!fs.town && fs.west, 'it is drawn only from the west side of the island (from anywhere else it is under the curve)', JSON.stringify(fs));
  const views = {};
  for (const [tm, nm] of [['16:00', 'day'], ['23:20', 'night']]) {
    views[nm] = await N((n, d, h, tm) => { d.closeTalk(); d.sky.set({ time: tm, weather: 'clear' }); if (d.cliff.CL.st === 'sat') { d.cliff.stand(); n.run(60); } const [ax, az] = d.cliff.M.sitA; n.put(ax, az, 30, -6.4); n.run(2); d.cliff.sit(); n.run(150);
      return 1; }, tm);
    await frames(3); await shot(pre + 'neil-2-view-' + nm);
    views[nm] = await N((n, d) => { const W = innerWidth, Hh = innerHeight, pts = [[33, -6.9, 1.2], [31.9, -14.2, 1.6], [30.6, .4, 1.2]].map(([x, z, y]) => d.neil.farScreen(x, z, y));
      return { st: d.cliff.CL.st, lk: d.neil.state.far.lk, pts: pts.map(p => ({ on: p.xy[0] > 0 && p.xy[0] < W && p.xy[1] > 0 && p.xy[1] < Hh && p.xy[2] < 1, clear: p.clear, xy: p.xy.map(v => Math.round(v * 100) / 100) })) }; }); }
  rec(views.day.st === 'sat' && views.day.pts.filter(p => p.on && p.clear).length >= 2, 'from the bench on the cliff his place is on the screen, over the horizon', JSON.stringify(views.day));
  rec(views.night.lk > .9 && views.day.lk < .1, 'its lights are on by night, not by day', JSON.stringify({ day: views.day.lk, night: views.night.lk }));
  const fog = await N((n, d) => { d.sky.set({ time: '13:00', weather: 'fog' }); n.run(30 * 50); return d.neil.state.far.fog; });
  rec(fog[2] >= .9 && fog[1] < 12, 'sea fog takes it', JSON.stringify(fog));

  /* ---------- a firing ---------- */
  const f1 = await N((n, d) => { d.sky.set({ time: '15:30', weather: 'clear' }); const F = d.neil.FAR.fire; for (let i = 0; i < 30 * 12 && F.on; i++) n.run(1); n.run(30); F.next = 999; n.calls.length = 0; const n0 = F.n; d.neil.fire(); n.run(30);
    const a = { on: F.on, flame: F.flame.visible, glow: F.glow.visible }; n.run(30 * 1.5); const b = { cloud: F.cloud.visible, calls: n.calls.slice() }; n.run(30 * 7); const c = { on: F.on, cloud: F.cloud.visible }; n.run(30 * 30); return { n: F.n - n0, a, b, c, gone: !F.cloud.visible }; });
  rec(f1.n === 1 && f1.a.on && f1.a.flame && f1.b.cloud, 'a firing: the flame under the stand, and the cloud boiling out of the trench', JSON.stringify(f1));
  rec(f1.b.calls.length === 1 && f1.b.calls[0].g > .008, 'and its sound, from over the water a moment later, heard from the cliff', JSON.stringify(f1.b.calls));
  rec(!f1.c.on && f1.c.cloud && f1.gone, 'it stops after about eight seconds; its cloud drifts on a while, then is gone', JSON.stringify({ c: f1.c, gone: f1.gone }));
  await N((n, d) => { if (d.cliff.CL.st === 'sat') { d.cliff.stand(); n.run(60); } const [ax, az] = d.cliff.M.sitA; n.put(ax, az, 30, -6.4); n.run(2); d.cliff.sit(); n.run(150); d.neil.fire(); n.run(30 * 4); }); await frames(3); await shot(pre + 'neil-3-firing');
  await N((n, d) => { n.run(30 * 30); d.sky.set({ time: '22:40', weather: 'clear' }); n.run(10); d.neil.fire(); n.run(30 * 3); }); await frames(3); await shot(pre + 'neil-4-firing-night');
  const town = await N((n, d) => { if (d.cliff.CL.st === 'sat') { d.cliff.stand(); n.run(60); } const F = d.neil.FAR.fire; for (let i = 0; i < 30 * 40 && (F.on || F.cloud.visible); i++) n.run(1); d.sky.set({ time: '15:30', weather: 'clear' }); n.put(4, -8, 8, -8); n.run(10); n.calls.length = 0; d.neil.fire(); n.run(30 * 3); return n.calls.slice(); });
  rec(town.length === 0 || (f1.b.calls[0] && town[0].g < f1.b.calls[0].g * .3), 'from the town it is heard much less, or not at all', JSON.stringify(town));
  const small = await N((n, d) => { n.run(30 * 30); d.sky.set({ time: '03:10', weather: 'clear' }); const F = d.neil.FAR.fire, n0 = F.n; n.put(13.5, -6.2, 30, -6.4); F.next = 0; n.run(30 * 3); return { fired: F.n - n0, next: +F.next.toFixed(1) }; });
  rec(small.fired === 0 && small.next > 60, 'none in the small hours (the next is put off)', JSON.stringify(small));

  /* ---------- how loud, with --meter: the firing beside a footstep (the town's music stopped, so only it is heard) ---------- */
  if (await page.evaluate(() => !!window.__meter)) {
    await H(h => { h.__st = h.S.st; h.S.st = null; h.A.hush(); }); await wait(2500);
    const lv = await page.evaluate(async () => { const A = window.__heloria.A, W = ms => new Promise(r => setTimeout(r, ms)), out = {};
      const meas = async (name, f, ms = 1600) => { await W(500); f(); let pk = 0, db = -200; const t0 = performance.now(); while (performance.now() - t0 < ms) { const m = window.__meter(); pk = Math.max(pk, m.pk); db = Math.max(db, m.db); await W(20); } out[name] = { pk: +pk.toFixed(4), db }; };
      await meas('silence', () => {}); await meas('step (pavement)', () => A.step(1)); await meas('step (grass)', () => A.step(0));
      await meas('a firing, from the cliff', () => A.testFire(.016, 0, 3), 4500); return out; });
    await H(h => { h.S.st = h.__st; });
    for (const [k, v] of Object.entries(lv)) log(('  ' + k).padEnd(30), 'peak', String(v.pk).padEnd(8), 'loudest', v.db, 'dB');
    const ref = Math.max(lv['step (pavement)'].db, lv['step (grass)'].db), f = lv['a firing, from the cliff'].db;
    rec(f <= ref + 3 && f > lv.silence.db + 6 && f > ref - 12, 'the firing from the cliff is heard, and no louder than a footstep (within 3 dB)', f + ' dB against footsteps ' + ref + ' dB');
  }

  const errs = await N((n, d) => [d.neil.state.err, d.neil.state.far.err]);
  rec(!errs[0] && !errs[1], 'no errors from him or his place', JSON.stringify(errs));
  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed'); for (const f of failed) console.log('  FAILED: ' + f); process.exitCode = fail ? 1 : 0;
};

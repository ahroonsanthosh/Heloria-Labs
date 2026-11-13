/* Earth's town life, the essentials in one go: the traffic on the loop (the kei van and its driver at the town hall, the bike
   and its rider at the café, the bus at its stop with its door, the post's van and its parcel at the post office, the milk
   float in the early morning with bottles on the doorsteps), every one of them slowing and stopping for you in the road; the
   cat on the café's sill, the gulls at the lighthouse, the dog that follows you, the pigeons that go up when you run at them;
   the football (kicked by walking into it, bouncing, kicked back by two of the school's children when it is their time); the
   duck pond (a real click or tap on the water throws bread, the ducks go for it; a picture from above); puddles after rain
   that splash; the doors that creak as people go in and out. And: the way to everyone you talk to is still there, nothing
   ever comes through you, no new shader is made as any of it comes out, and (with --meter) each new sound is about as loud
   as a footstep, no louder.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/townlife.cjs --out <dir> [--mobile] [--meter]
   The station's clock is stepped by hand where only the logic matters; pictures are taken from real frames. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  await H(h => {
    const st = h.ST.cr, d = st._dbg, T = d.town;
    window.__L = {
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } },
      /* stepped until f() is true (or max frames); how many it took */
      until(src, max) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(d, T); i++) this.run(1); return i; },
      put(x, z, fx, fz) { d.closeTalk(); d.people.forEach(q => { q.greeted = true; }); const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.tk = 0; d.cam.pitch = d.cam.PITCH; d.cam.dist = d.cam.D0(); P.tgt = null; P.path = null; P.speed = 0; T.TL.clearSkip = 3; },
      at(date, time, weather) { d.sky.set({ date, time, weather: weather || 'clear' }); d.sky.step(.2); this.run(2); return T.state; },
      calls: {},
    };
    for (const n of ['bell', 'busDoor', 'bottles', 'purr', 'gull', 'paws', 'woof', 'wings', 'kick', 'ballBounce', 'quack', 'splash', 'doorCreak', 'engine']) { const f = h.A[n]; h.A[n] = function () { const L = window.__L.calls[n] = window.__L.calls[n] || []; if (L.length < 400) L.push([...arguments].slice(0, 4)); return f.apply(this, arguments); }; }
  });
  const L = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__L, h.ST.cr._dbg, h.ST.cr._dbg.town, h, a), [fn.toString(), arg]);
  const frames = n => H((h, n) => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const pic = async (name, ms = 400) => { await frames(3); await wait(ms); await shot(pre + name); };
  const key = async (code, n, shift) => { if (shift) await page.keyboard.down('ShiftLeft'); await page.keyboard.down(code); await L((l, d, T, h, n) => l.run(n), n); await page.keyboard.up(code); if (shift) await page.keyboard.up('ShiftLeft'); };

  await H(h => { h.ST.cr._dbg.skipCut(); h.ST.cr._dbg.began(); });
  await L(l => l.run(30));
  const boot = await L((l, d, T, h) => ({ err: T.err, ok: T.TL.ok, warm: T.TL.warm }));
  rec(boot.ok && !boot.err && !boot.warm, 'town life is built with Earth and running', JSON.stringify(boot));
  await page.waitForFunction(() => (!window.__heloria.late || window.__heloria.late().ready), null, { timeout: 900000, polling: 500 }).catch(() => {});
  await frames(4); const prog0 = await H(h => h.renderer.info.programs.length); log('programs at the start', prog0);
  await L((l, d, T) => { T.TL.clear.min = 99; });

  /* ---------- the traffic, on a Wednesday afternoon ---------- */
  const st0 = await L(l => l.at('2026-07-15', '14:00'));
  const on0 = Object.fromEntries(st0.cars.map(c => [c.id, c.on]));
  rec(on0.kei && on0.bike && on0.bus && on0.post && !on0.milk, 'in the afternoon the kei van, the bike, the bus and the post van are out; no milk float', JSON.stringify(on0));
  /* the bus: comes up to its stop, stops, opens its door, shuts it and pulls away */
  const bus = await L((l, d, T) => { const c = T.TLA.bus, R = T.TLP; l.put(-3.4, -3.8, -8, -3); c.s = R.bus + 4; c.mode = 'drive'; c.stopAt = null; c.v = 1.6; c.lat = c.latW = c.lane; T.TL.n.busDoor = 0;
    const a = l.until((d, T) => T.TLA.bus.mode === 'stop', 30 * 12); const b = l.until((d, T) => T.TLA.bus.door > .9, 30 * 4); return { a, b, door: +c.door.toFixed(2), opens: T.TL.n.busDoor || 0 }; });
  const busSeen = await L((l, d, T) => { const c = T.TLA.bus, q = T.at(c.s + c.dir * .4, c.dir * 2.6); l.put(q.x, q.z, c.x, c.z); l.run(3); return [c.x, c.z]; });
  await pic('tl-bus-stop');
  const bus2 = await L((l, d, T) => { const c = T.TLA.bus; c.lay = 0; const k = l.until((d, T) => T.TLA.bus.mode === 'drive' && T.TLA.bus.v > 1, 30 * 14); return { k, mode: c.mode, v: +c.v.toFixed(2), door: +c.door.toFixed(2), sounds: T.TL.n.busDoor || 0 }; });
  rec(bus.a < 30 * 12 && bus.door > .9 && bus2.k < 30 * 14 && bus2.door < .2 && bus2.sounds >= 2, 'the bus stops at its stop, opens its door (a hiss), shuts it and pulls away', JSON.stringify({ bus, bus2 }));

  /* you in the road: the kei van slows and stops short of you, and goes on when you step out of the way; the bike rings its bell */
  const yld = await L((l, d, T) => { const c = T.TLA.kei, R = T.TLP; const s = (R.hall + 18) % T.TLR.L, q = T.at(s, .6); l.put(q.x, q.z, q.x + q.dx, q.z + q.dz); c.s = s - 7; c.mode = 'drive'; c.stopAt = null; c.laps = 0; c.want = 9; c.v = 2.4; c.lat = c.latW = c.lane; c.pass = null;
    let mn = 99; for (let i = 0; i < 30 * 6; i++) { l.run(1); for (const o of c.obs) mn = Math.min(mn, Math.hypot(d.player.x - o.x, d.player.z - o.z) - o.r); }
    const stopped = c.v < .05, gap = +mn.toFixed(2); const p = T.at(s, -2.0); d.player.x = p.x; d.player.z = p.z; d.player.u.copy(d.at(p.x, p.z)); l.run(30 * 3);
    return { stopped, gap, then: +c.v.toFixed(2) }; });
  rec(yld.stopped && yld.gap > .6 && yld.then > 1, 'a van coming up behind you in the road slows, stops well short of you, and drives on when you step out of the way', JSON.stringify(yld));
  const bell = await L((l, d, T) => { const c = T.TLA.bike; const s = (T.TLP.po + 12) % T.TLR.L, q = T.at(s, .6); l.put(q.x, q.z, q.x + q.dx, q.z + q.dz); c.s = s - 6; c.mode = 'drive'; c.stopAt = null; c.laps = 0; c.want = 9; c.v = 1.8; c.lat = c.latW = c.lane; c.bell = 0; T.TL.n.bell = 0;
    let mn = 99; for (let i = 0; i < 30 * 5; i++) { l.run(1); for (const o of c.obs) mn = Math.min(mn, Math.hypot(d.player.x - o.x, d.player.z - o.z) - o.r); } const p = T.at(s, 2.0); d.player.x = p.x; d.player.z = p.z; d.player.u.copy(d.at(p.x, p.z)); l.run(10); return { bells: T.TL.n.bell || 0, v: +c.v.toFixed(2), gap: +mn.toFixed(2) }; });
  rec(bell.bells >= 1 && bell.gap > .5, 'the bike rings its bell at you in the road and stops short', JSON.stringify(bell));

  /* the post's van: stops outside the post office; its driver takes a parcel from the back and carries it in, the door creaking open and shut */
  const post = await L((l, d, T) => { const c = T.TLA.post, R = T.TLP, q = T.at(R.po + 3, -2.1), w0 = T.at(R.po, 3.2); l.put(q.x, q.z, w0.x, w0.z); c.next = 'po'; c.s = R.po + .2 - 6; c.mode = 'drive'; c.stopAt = null; c.v = 2; c.lat = c.latW = c.lane; c.pass = null; const w = c.walker; T.TL.doors.po.open = 0; T.TL.doors.po.shut = 0; T.TL.seen.poDoor = 0;
    const a = l.until((d, T) => T.TLA.post.walker.on && T.TLA.post.walker.carryOn, 30 * 16); return { a, carry: w.carryOn, x: w.x, z: w.z }; });
  if (post.carry) { await L((l, d, T) => { l.run(24); const w = T.TLA.post.walker, q = T.at(T.TLP.po + 2.2, -2.1); l.put(q.x, q.z, w.x, w.z); l.run(2); }); await pic('tl-postie'); }
  const post2 = await L((l, d, T) => { const c = T.TLA.post, w = c.walker; const a = l.until((d, T) => !T.TLA.post.walker.on && T.TLA.post.stage === 2, 30 * 30); c.stay = .5; const b = l.until((d, T) => T.TLA.post.mode === 'drive' && T.TLA.post.v > .5, 30 * 40);
    return { a, b, door: +(T.TL.seen.poDoor || 0).toFixed(2), opens: T.TL.doors.po.open || 0, shuts: T.TL.doors.po.shut || 0, next: c.next, rear: +(T.TL.seen.rear || 0).toFixed(2) }; });
  rec(post.carry && post2.a < 30 * 30 && post2.b < 30 * 40 && post2.door > .4 && post2.opens >= 2 && post2.shuts >= 2 && post2.rear > .5, 'the post van stops at the post office; its driver carries a parcel in, the door creaks open and shut, and back out, and it drives off', JSON.stringify({ post, post2 }));

  /* the kei van at the town hall: its driver goes in and comes out again, the hall's door creaking */
  const hall = await L((l, d, T) => { const c = T.TLA.kei, R = T.TLP, q = T.at(R.hall + 4, -2.1), w0 = T.at(R.hall, 3.5); l.put(q.x, q.z, w0.x, w0.z); c.laps = 9; c.want = 1; c.s = R.hall - .5 - 6; c.mode = 'drive'; c.stopAt = null; c.v = 2; c.lat = c.latW = c.lane; c.pass = null; T.TL.doors.hall.open = 0; T.TL.seen.hallDoor = 0;
    const a = l.until((d, T) => T.TLA.kei.stage === 2, 30 * 30); c.stay = .5; const b = l.until((d, T) => T.TLA.kei.mode === 'drive' && T.TLA.kei.v > .5, 30 * 40);
    return { a, b, door: +(T.TL.seen.hallDoor || 0).toFixed(2), opens: T.TL.doors.hall.open || 0 }; });
  rec(hall.a < 30 * 30 && hall.b < 30 * 40 && hall.door > .3 && hall.opens >= 2, 'the kei van parks at the town hall; its driver goes in and out again through the creaking door, and drives on', JSON.stringify(hall));

  /* the bike at the café: its rider leans it at the kerb, goes in for a coffee (the café's door), and rides off again */
  const cafe = await L((l, d, T) => { const c = T.TLA.bike, R = T.TLP; l.put(-.6, -12.3, 3, -12); c.laps = 9; c.want = 1; c.s = R.cafe - 5; c.mode = 'drive'; c.stopAt = null; c.v = 1.6; c.lat = c.latW = c.lane; c.pass = null; c.ride = true; T.TL.doors.cafe.open = 0; T.TL.seen.cafeDoor = 0;
    const a = l.until((d, T) => T.TLA.bike.stage === 2, 30 * 30); c.stay = .5; const b = l.until((d, T) => T.TLA.bike.mode === 'drive' && T.TLA.bike.v > .5, 30 * 40);
    return { a, b, door: +(T.TL.seen.cafeDoor || 0).toFixed(2), opens: T.TL.doors.cafe.open || 0, ride: c.ride }; });
  rec(cafe.a < 30 * 30 && cafe.b < 30 * 40 && cafe.door > .3 && cafe.opens >= 2 && cafe.ride, 'the bike stops by the café; its rider goes in and out through the café door, and rides off', JSON.stringify(cafe));

  /* the school's door creaks for its children going back in after their break */
  const sch = await L((l, d, T) => { const q = T.at(T.near(10.46, 5.52).s + 1.5, -2.2); l.put(q.x, q.z, 12.5, 6.8); l.at('2026-07-15', '11:19:58'); l.run(30 * 2); T.TL.doors.school = { open: 0, shut: 0 };
    d.sky.set({ time: '11:20:02' }); const k = l.until((d, T) => (T.TL.doors.school.open || 0) >= 1, 30 * 20); l.run(30 * 3); return { k, ...T.TL.doors.school }; });
  rec(sch.open >= 1, 'the school door creaks as its children go back in after their break', JSON.stringify(sch));

  /* the milk float, early: in from out of sight, from doorstep to doorstep, two bottles left on each */
  const milk = await L((l, d, T) => { l.put(7.2, -9.3, 6.4, -12.6); const s0 = l.at('2026-07-15', '05:50'); const c = T.TLA.milk;
    const a = l.until((d, T) => T.TLA.milk.on, 30 * 3); const b = l.until((d, T) => T.TLA.milk.walker.on && T.TLA.milk.walker.carryOn, 30 * 40); return { a, b, on: c.on, k: c.k, u: +c.u.value.toFixed(2), x: c.walker.x, z: c.walker.z }; });
  if (milk.b < 30 * 40) { await L((l, d, T) => { l.run(20); const w = T.TLA.milk.walker, q = T.at(T.near(w.x, w.z).s + 2.6, 1.75); l.put(q.x, q.z, w.x, w.z); l.run(2); }); await pic('tl-milk'); }
  const milk2 = await L((l, d, T) => { const c = T.TLA.milk; T.TL.mk = c.k ?? 0; const a = l.until((d, T) => T.TL.n.left >= 1, 30 * 30); const b = l.until((d, T) => (T.TLA.milk.k ?? 0) > T.TL.mk && T.TLA.milk.mode === 'drive', 30 * 30);
    return { a, b, left: T.TL.n.left || 0, bottles: T.state.bottles, k: c.k, clinks: (window.__L.calls.bottles || []).length }; });
  const milk3 = await L((l, d, T) => { const s1 = l.at('2026-07-15', '09:00'); const s2 = l.at('2026-07-15', '14:00'); return { at9: s1.cars.find(c => c.id === 'milk').on, b9: s1.bottles, at14: s2.cars.find(c => c.id === 'milk').on }; });
  rec(milk.on && milk.u > .5 && milk2.left >= 1 && milk2.bottles.some(Boolean) && milk2.clinks >= 2 && milk2.b < 30 * 30, 'at ten to six the milk float comes, its milkman leaves bottles on a doorstep (clinking) and it drives on to the next', JSON.stringify({ milk, milk2 }));
  rec(!milk3.at9 && milk3.b9.every(Boolean) && !milk3.at14, 'it is gone by nine, the bottles still on the doorsteps; none of it in the afternoon', JSON.stringify(milk3));

  /* ---------- the animals ---------- */
  /* the cat: asleep on the sill; wakes as you come by, stretches, purrs while you stay; curls up again; walks along the sill now and then */
  const cat = await L((l, d, T) => { l.at('2026-07-15', '14:00'); const C = T.CAT; C.st = 'sleep'; C.cool = 0; C.walkT = 99; C.stretches = 0; const s0 = C.st; l.put(9.0, -10.5, 4.3, -11.9); l.run(30);
    const before = C.st; l.put(3.3, -10.9, C.wx, C.wz); const a = l.until((d, T) => T.CAT.stretches >= 1, 30 * 4); const b = l.until((d, T) => T.CAT.st === 'sit', 30 * 4); l.run(30 * 3);
    return { s0, before, a, b, st: C.st, purrs: T.TL.n.purr || 0, vis: !!C.g.visible }; });
  await L((l, d, T) => { const C = T.CAT; T.view(C.wx + .5, C.wz + 1.6, 1.55, C.wx, C.wz, 1.15); l.run(1); }); await pic('tl-cat'); await L((l, d, T) => { T.view(null); });
  const cat2 = await L((l, d, T) => { const C = T.CAT; l.put(C.wx - 9, C.wz + 6, C.wx, C.wz); const a = l.until((d, T) => T.CAT.st === 'sleep', 30 * 12); const x0 = C.x; C.walkT = 0; l.run(30 * 6); return { a, x0: +x0.toFixed(2), x1: +C.x.toFixed(2), walks: C.walks }; });
  rec(cat.before === 'sleep' && cat.a < 30 * 4 && cat.purrs >= 1 && cat2.a < 30 * 12 && Math.abs(cat2.x1 - cat2.x0) > .3, 'the cat sleeps on the café sill, wakes and stretches as you come by, purrs, curls up again, and walks along the sill now and then', JSON.stringify({ cat, cat2 }));

  /* the gulls: three on the lighthouse rail, the rest drifting over the coast; one calls now and then */
  const gull = await L((l, d, T) => { const G_ = T.GUL; const ph = d.INST.ph; l.put(ph.x - 3.4, ph.z - 1.8, ph.x, ph.z); const f0 = G_.b.filter(g => !g.perch).map(g => [g.x, g.z]); const c0 = T.TL.mk = G_.calls; l.run(30 * 2); const f1 = G_.b.filter(g => !g.perch).map(g => [g.x, g.z]);
    const k = l.until((d, T) => T.GUL.calls > T.TL.mk, 30 * 30); return { perched: G_.b.filter(g => g.perch).length, moved: f0.every((p, i) => Math.hypot(p[0] - f1[i][0], p[1] - f1[i][1]) > .3), k, calls: G_.calls - c0 }; });
  await L((l, d, T, h) => { const ph = d.INST.ph; T.view(ph.x - 5.2, ph.z - 3.6, 3.4, ph.x, ph.z, 5.2); l.run(1); }); await pic('tl-gulls'); await L((l, d, T) => { T.view(null); });
  rec(gull.perched === 3 && gull.moved && gull.calls >= 1, 'gulls sit on the lighthouse rail and drift over the coast, and one calls', JSON.stringify(gull));

  /* the dog: comes over to you (one woof), follows you as you walk, then wanders home */
  const dog = await L((l, d, T) => { const D = T.DOG; D.st = 'home'; D.cool = 0; [D.x, D.z] = D.home;
    /* (where the dog lives depends on what grows there, which is less on a phone: you start three metres or so from it, on free ground off the road) */
    const [hx, hz] = D.home, sp = [[-3, -1], [3, -1], [0, -3.2], [-3, 1.2], [3, 1.2], [0, 3.2]].map(([a, b]) => [hx + a, hz + b]).find(([x, z]) => d.OBS.every(o => Math.hypot(x - o.x, z - o.z) > o.r + .45) && Math.abs(T.near(x, z).lat) > 1.4) || [hx + 3, hz];
    l.put(sp[0], sp[1], hx, hz); const a = l.until((d, T) => T.DOG.st === 'follow', 30 * 10); return { a, st: D.st, woofs: D.woofs, d: T.state.dog.d }; });
  await L((l, d, T) => { const r = T.near(d.player.x, d.player.z), q = T.at(r.s - 6, 1.75); l.put(d.player.x, d.player.z, q.x, q.z); });
  await key('KeyW', 30 * 3);
  const dog2 = await L((l, d, T) => { const D = T.DOG; l.run(30 * 2); return { st: D.st, d: T.state.dog.d, paws: (window.__L.calls.paws || []).length }; });
  await pic('tl-dog');
  const dog3 = await L((l, d, T) => { const D = T.DOG; D.dur = 0; const a = l.until((d, T) => T.DOG.st === 'home', 30 * 40); return { a, st: D.st }; });
  rec(dog.a < 30 * 10 && dog.woofs >= 1 && dog2.st === 'follow' && dog2.d < 3.5 && dog2.paws >= 1 && dog3.st === 'home', 'the dog trots over (a woof), follows you as you walk (its paws), and wanders off home', JSON.stringify({ dog, dog2, dog3 }));

  /* the pigeons: run at them and they clap up, wheel round and settle again */
  const pg = await L((l, d, T) => { const P_ = T.PG; for (const p of P_.b) { p.st = 'ground'; p.cool = 0; } l.put(P_.Z[0] + 3.2, P_.Z[1], P_.Z[0], P_.Z[1]); l.run(5); return { ground: T.state.pigeons.ground }; });
  await key('KeyW', 26, true);
  const pg2 = await L((l, d, T) => { l.run(8); return { ...T.state.pigeons, claps: (window.__L.calls.wings || []).length }; });
  await pic('tl-pigeons', 100);
  const pg3 = await L((l, d, T) => { const k = l.until((d, T) => T.state.pigeons.fly === 0, 30 * 12); return { k, ...T.state.pigeons }; });
  rec(pg.ground >= 10 && pg2.ups >= 3 && pg2.claps >= 1 && pg3.ground >= 10, 'pigeons in the square clap up into the air when you run at them, and settle again', JSON.stringify({ pg, pg2, pg3 }));

  /* ---------- the football ---------- */
  const ball = await L((l, d, T) => { const B = T.BALL; T.TL.n.kick = 0; l.at('2026-07-15', '11:00'); B.x = -3.6; B.z = -.6; B.vx = B.vz = B.h = B.vh = 0; B.top = 0; l.put(-3.6 + 1.4, -.6 - 1.0, -3.6, -.6); l.run(3); return { kids: T.state.kids.map(k => k.on) }; });
  await key('KeyW', 22);
  const ball2 = await L((l, d, T) => { const B = T.BALL, b0 = B.bounces; let mxv = 0, mxh = 0, inside = true; for (let i = 0; i < 30 * 4; i++) { l.run(1); mxv = Math.max(mxv, Math.hypot(B.vx, B.vz)); mxh = Math.max(mxh, B.h); if (T.near(B.x, B.z).lat > -1.2) inside = false; }
    return { kicks: B.kicks, mxv: +mxv.toFixed(2), mxh: +Math.max(mxh, B.top || 0).toFixed(2), bounces: B.bounces - b0, inside, kids: T.state.kids.map(k => k.on) }; });
  rec(ball2.kicks >= 1 && ball2.mxv > 1.5 && ball2.mxh > .03 && ball2.bounces >= 1 && ball2.inside, 'walking into the football kicks it: it rolls off, bounces, and stays in the square', JSON.stringify(ball2));
  rec(ball.kids.every(k => !k) && ball2.kids.every(k => !k), 'in school hours on a weekday the children are not out to play', JSON.stringify(ball.kids));
  const kids = await L((l, d, T) => { const s = l.at('2026-07-18', '11:00'); const B = T.BALL; B.x = -3.6; B.z = -.6; B.vx = B.vz = 0; l.put(-1.4, -3.4, -3.6, -.6); const k0 = T.TL.mk = B.kidKicks; const a = l.until((d, T) => T.BALL.kidKicks > T.TL.mk, 30 * 20);
    /* now you kick it to them, and one kicks it back to you */
    return { on: s.kids.map(k => k.on), a, kidKicks: B.kidKicks - k0 }; });
  const back = await L((l, d, T) => { const B = T.BALL; l.until((d, T) => Math.hypot(T.BALL.vx, T.BALL.vz) < .3, 30 * 8); const P = d.player; B.last = 'me'; B.x = -4.3; B.z = .2; B.vx = -1.2; B.vz = .6; B.h = 0; T.TL.mk = B.kidKicks;
    const a = l.until((d, T) => T.BALL.kidKicks > T.TL.mk, 30 * 15); let toward = 0; for (let i = 0; i < 30; i++) { l.run(1); toward = Math.max(toward, -((B.x - P.x) * B.vx + (B.z - P.z) * B.vz) / Math.max(.01, Math.hypot(B.x - P.x, B.z - P.z))); } return { a, toward: +toward.toFixed(2) }; });
  await L((l, d, T) => { l.put(-3.6 + 3.2, -.6 - 3.4, -3.8, -.2); l.run(2); }); await pic('tl-football');
  const kidsWd = await L((l, d, T) => { const a = l.at('2026-07-15', '16:30'); const b = l.at('2026-07-18', '22:30'); return { wd: a.kids.map(k => k.on), night: b.kids.map(k => k.on) }; });
  rec(kids.on.every(Boolean) && kids.a < 30 * 20 && back.a < 30 * 15 && back.toward > .8, 'at the weekend two of the school\'s children play; they kick it to each other, and back to you when you kick it to them', JSON.stringify({ kids, back }));
  rec(kidsWd.wd.every(Boolean) && kidsWd.night.every(k => !k), 'on a weekday after school they are out too; never at night', JSON.stringify(kidsWd));

  /* ---------- the duck pond ---------- */
  const pond0 = await L((l, d, T) => { l.at('2026-07-15', '14:00'); const Pd = T.POND; l.put(3.0, 11.0, Pd.x + .3, Pd.z + .4); l.run(4); return { ducks: Pd.ducks.length, bread: T.TL.n.bread || 0 }; });
  await frames(4);
  const scr = await L((l, d, T) => T.screen(T.POND.x + .25, T.POND.z + .1, T.POND.wy - T.POND.y + .01));
  if (mobile) await page.touchscreen.tap(scr[0], scr[1]); else await page.mouse.click(scr[0], scr[1]);
  const pond = await L((l, d, T) => { const n0 = T.TL.n.bread || 0, e0 = T.TL.n.eaten || 0, Pd = T.POND, d0 = Pd.ducks.map(q => [q.lx, q.lz]); l.run(20); const w = T.TL.crumbs.filter(c => c.st === 'water').map(c => [c.lx, c.lz]);
    let closer = 0; if (w.length) { l.run(30 * 2); Pd.ducks.forEach((q, i) => { const dist = (a) => Math.min(...w.map(c => Math.hypot(c[0] - a[0], c[1] - a[1]))); if (dist([q.lx, q.lz]) < dist(d0[i]) - .05) closer++; }); }
    T.TL.mk = e0; const a = l.until((d, T) => (T.TL.n.eaten || 0) > T.TL.mk, 30 * 15); return { bread: (T.TL.n.bread || 0), water: w.length, closer, eaten: (T.TL.n.eaten || 0) - e0, a, talk: !!d.talk().p }; });
  rec(pond.bread >= 1 && pond.water >= 1 && pond.closer >= 2 && pond.eaten >= 1 && !pond.talk, 'a ' + (mobile ? 'tap' : 'click') + ' on the pond throws bread; the ducks paddle over and eat it', JSON.stringify({ scr: scr.map(v => +v.toFixed(1)), pond0, pond }));
  await L((l, d, T) => { if (!T.TL.crumbs.some(c => c.st === 'water')) T.feed(T.POND.x - .2, T.POND.z); l.run(25); }); await pic('tl-pond-bread');
  await L((l, d, T) => { l.put(1.6, 11.4, 4.5, 13.2); T.view(T.POND.x + .4, T.POND.z - 2.6, 6.2, T.POND.x, T.POND.z, 0); l.run(2); }); await pic('tl-pond-above'); await L((l, d, T) => { T.view(null); });

  /* ---------- puddles after rain, and a splash through one ---------- */
  const pud = await L((l, d, T) => { l.at('2026-07-15', '14:00', 'rain'); l.run(30 * 2); l.at('2026-07-15', '14:00', 'clear'); T.wet(1); l.run(30); T.wet(null); l.run(10);
    const Pq = T.PUD.list.filter(q => q.k > .5).sort((a, b) => Math.abs(T.near(a.x, a.z).lat) - Math.abs(T.near(b.x, b.z).lat)).find(q => Math.abs(T.near(q.x, q.z).lat) > 1.25);
    const s0 = T.TL.n.splashes || 0; if (Pq) { const r = T.near(Pq.x, Pq.z), a = T.at(r.s - 1.5, r.lat); l.put(a.x, a.z, Pq.x, Pq.z); } return { wet: T.state.wet, puddles: T.state.wetPuddles, s0, at: Pq ? [Pq.x, Pq.z] : null }; });
  await key('KeyW', 30 * 1.4);
  const pud2 = await L((l, d, T) => { l.run(4); return { splashes: (T.TL.n.splashes || 0), sounds: (window.__L.calls.splash || []).length, wet: T.state.wet }; });
  await pic('tl-puddles', 100);
  const dry = await L((l, d, T) => { l.at('2026-07-15', '14:00', 'clear'); for (let i = 0; i < 12; i++) l.run(30 * 30 / 12); return { wet: T.state.wet, puddles: T.state.wetPuddles }; });
  rec(pud.wet > .9 && pud.puddles >= 8 && pud2.splashes > pud.s0 && pud2.sounds >= 1, 'after rain the pavements hold puddles, and walking through one splashes', JSON.stringify({ pud, pud2 }));
  rec(dry.wet < pud.wet, 'and they dry away after it', JSON.stringify(dry));

  /* ---------- night: parked and quiet, the bus last of all ---------- */
  const night = await L((l, d, T) => { const a = l.at('2026-07-15', '22:40'); l.put(-6.6, -1.2, -8.6, -4.6); const c = T.TLA.bus; l.run(30); const b = l.at('2026-07-15', '23:30'); l.run(30 * 3);
    return { evening: a.cars.filter(c => c.on && c.mode === 'drive').map(c => c.id), late: b.cars.filter(c => c.on && c.mode === 'drive' && c.v > .2).map(c => c.id), lamps: T.TLA.kei.lamps ? 1 : 0 }; });
  await L((l, d, T) => { l.at('2026-07-15', '22:40'); const c = T.TLA.bus, sP = (T.TLP.bus + 14) % T.TLR.L, q = T.at(sP, -2.3), f = T.at(sP + 5, -.6); l.put(q.x, q.z, f.x, f.z); c.s = sP + 10; c.mode = 'drive'; c.stopAt = null; c.hold = 0; c.v = 1.8; c.lat = c.latW = c.lane; l.run(30); }); await pic('tl-night');
  rec(night.late.length === 0, 'after eleven at night every vehicle is parked', JSON.stringify(night));

  /* ---------- the way to everyone you talk to is still there; and walking over to one of us, nothing gets in the way ---------- */
  const nav = await L((l, d, T) => { l.at('2026-07-15', '14:00'); const P = d.player, out = {}; d.place(); for (const q of [...d.people, { first: 'Diarmuid', x: d.busk.DM.x, z: d.busk.DM.z }, ...d.regs.REGS.map(r => ({ first: r.first, x: r.x, z: r.z }))]) { const p = d.navPath(-3.2, -12, q.x, q.z, 1.8); out[q.first] = p ? p.length : -1; } return out; });
  rec(Object.values(nav).every(n => n > 0), 'there is a way from the pad to every one of us, Diarmuid, Gideon and Owen', JSON.stringify(nav));
  const walk = await L((l, d, T) => { const out = {}; for (const i of [1, 2, 0]) { d.closeTalk(); d.people.forEach(p => { p.greeted = false; }); d.MET.clear(); l.put(-3.2, -12.0, 0, 0); l.run(4); d.goTalk(d.people[i]); const k = l.until(d => !!d.talk().p, 30 * 45); out[d.people[i].first] = { k, talk: d.talk().p ? d.talk().p.first : null }; d.closeTalk(); } return out; });
  rec(Object.values(walk).every(w => w.talk && w.k < 30 * 45), 'clicking each of us from the pad still walks you all the way over and we talk', JSON.stringify(walk));
  const clear = await L((l, d, T) => T.TL.clear);
  rec(clear.min > .1, 'nothing of the town\'s life ever comes through you (the nearest any of it came, past its own edge)', JSON.stringify(clear));
  const err = await L((l, d, T) => T.err); rec(!err, 'no errors in town life', String(err));

  /* ---------- no new shader as any of it came out ---------- */
  await frames(3); const prog1 = await H(h => h.renderer.info.programs.length);
  rec(prog1 === prog0, 'no new shader program was made for any of it', prog0 + ' then ' + prog1);

  /* ---------- the sounds: each new one at the level it is given beside you, against a footstep ---------- */
  const metered = await page.evaluate(() => typeof window.__meter === 'function');
  if (!metered) log('(no --meter: the sound levels are not measured)');
  else {
    await L((l, d, T) => { d.closeTalk(); l.put(-1.5, -6.5, 0, 0); });
    const peak = async (src, ms = 1100) => { await H((h, s) => { (0, eval)('(' + s + ')')(h.A); }, src); let pk = 0, db = -200; const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = await page.evaluate(() => window.__meter()); pk = Math.max(pk, m.pk); db = Math.max(db, m.db); await wait(35); } return { pk, db }; };
    const quiet = async () => { await wait(500); };
    const best = async src => { src = typeof src === 'function' ? src.toString() : src; const a = await peak(src); await quiet(); const b = await peak(src); await quiet(); return a.pk < b.pk ? a : b; };
    const ref = { step1: await best(A => A.step(1)), step0: await best(A => A.step(0)) }; const foot = Math.max(ref.step1.pk, ref.step0.pk);
    const S = { bell: A => A.bell(.016), busDoor: A => A.busDoor(.024, 0, true), bottles: A => A.bottles(.016), purr: A => A.purr(.03), gull: A => A.gull(.028), paws: A => A.paws(.03), woof: A => A.woof(.024), wings: A => A.wings(.034),
      kick: A => A.kick(.0275), quack: A => A.quack(.03), splash: A => A.splash(.031, 0, 1.2), creak: A => A.doorCreak(.03, 0, true), knock: A => A.doorCreak(.03, 0, false) };
    const rows = {}; for (const [k, f] of Object.entries(S)) rows[k] = await best(f.toString());
    for (const [k, kind] of [['bus', 0], ['van', 1], ['float', 2]]) { await H((h, kind) => h.A.engine('meter', 1, kind, .6, 0), kind); await wait(700); const r = await peak('A=>0', 900); rows['engine ' + k] = r; await H(h => h.A.engine('meter', -1)); await wait(400); }
    log('footsteps', JSON.stringify(ref)); for (const [k, r] of Object.entries(rows)) log(('  ' + k).padEnd(16), 'peak', r.pk, ' dB', r.db, ' (' + (r.pk / foot).toFixed(2) + ' of a footstep)');
    const loud = Object.entries(rows).filter(([k, r]) => r.pk > foot * 1.6).map(([k]) => k), silent = Object.entries(rows).filter(([k, r]) => r.pk < .0008).map(([k]) => k);
    rec(foot > .002 && !loud.length && !silent.length, 'every new sound is heard, and at its loudest (beside you) no louder than about a footstep', JSON.stringify({ foot: +foot.toFixed(4), loud, silent }));
  }
  const calls = await page.evaluate(() => Object.fromEntries(Object.entries(window.__L.calls).map(([k, v]) => [k, v.length])));
  log('sounds called', JSON.stringify(calls));
  rec(['bell', 'busDoor', 'bottles', 'purr', 'gull', 'paws', 'woof', 'wings', 'kick', 'ballBounce', 'quack', 'splash', 'doorCreak', 'engine'].every(k => calls[k] > 0), 'every one of town life\'s sounds was played by the town itself', JSON.stringify(calls));
  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

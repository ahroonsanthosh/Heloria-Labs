/* The market in the square on Earth: on a Friday from six in the evening until two in the morning (the visitor's clock)
   there are festoons over the square, a chipper van and a crêpe and coffee cart, a few people about, and Diarmuid has his
   big amp out; on any other day, and on a Friday morning, there is none of it. It fades in and out as the clock crosses
   the hour, it never blocks the paths across the square or the way to anyone you talk to, no new shader is made when it
   appears, and its sounds are short, soft and in line with the footsteps.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/market.cjs --out <dir> [--mobile] [--meter]
   The station's clock is stepped by hand where only the logic matters; the sound is listened to in real time (--meter). */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  const FRI = '2026-11-13', TUE = '2026-11-10', SAT = '2026-11-14';
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__M = {
      run(n, watch) { let bad = 0; for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t);
          if (watch) { const q = d.player, fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o)); if (fixed.some(o => Math.hypot(q.x - o.x, q.z - o.z) < o.r + .12)) bad++; } }
        return bad; },
      until(src, max, watch) { const f = (0, eval)('(' + src + ')'); let i = 0, bad = 0; for (; i < max && !f(d); i++) bad += this.run(1, watch); return { frames: i, bad }; },
      put(x, z, fx, fz) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.tk = 0; P.tgt = null; P.path = null; P.speed = 0; },
      /* a day and an hour, the market brought straight to where it should be at that moment */
      at(date, time, weather) { d.sky.set({ date, time, weather: weather || 'clear' }); d.sky.step(.5); d.market.MKT.snap = true; d.market.step(.2); return d.market.state; },
      talk() { const T = d.talk(); return T.p ? T.p.first : null; },
    };
  });
  const M = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__M, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = n => H((h, n) => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  await H(h => h.ST.cr._dbg.skipCut()); await M(e => e.run(30));
  /* the view for the pictures: walking into the square from the south, the market (when there is one) beyond Kríos; on a
     phone held upright (too narrow for both stalls at once) turned a little toward the chipper van */
  const look = async () => { await M((e, d, h, m) => { e.put(.35, -7.4, m ? 2.6 : -.2, 2); e.run(40); }, mobile); await frames(4); await wait(1200); };

  /* ---------- no market on a Tuesday night, nor on a Friday morning ---------- */
  const tue = await M((e, d, h, a) => e.at(a, '21:30'), TUE);
  rec(!tue.open && !tue.vis && tue.e === 0 && !tue.solid && tue.inOBS === 0 && !tue.amp && tue.figs.every(f => !f.vis), 'no market on a Tuesday night', JSON.stringify(tue));
  const tueLv = await M(e => +window.__heloria.ST.cr._dbg.busk.level(window.__heloria.ST.cr._dbg.busk.DM.x + 11.5, window.__heloria.ST.cr._dbg.busk.DM.z).toFixed(3));
  /* (the other worlds are made after the loader, a step at a quiet moment: they finish first, so what is counted below is the market's alone) */
  await page.waitForFunction(() => window.__heloria.late().ready, null, { timeout: 900000, polling: 500 }).catch(() => {});
  await look(); const progTue = await H(h => h.renderer.info.programs.length); await shot(pre + 'market-tuesday-night');
  const morn = await M((e, d, h, a) => e.at(a, '10:00'), FRI);
  rec(!morn.open && !morn.vis && morn.e === 0 && !morn.solid && !morn.amp, 'no market on a Friday morning', JSON.stringify({ open: morn.open, vis: morn.vis, e: morn.e, dow: morn.dow }));
  const thu = await M((e, d, h, a) => e.at(a, '23:00'), '2026-11-12'), sat = await M((e, d, h, a) => e.at(a, '03:00'), SAT);
  rec(!thu.open && !thu.vis && !sat.open && !sat.vis, 'nor late on a Thursday, nor after two on Saturday morning', JSON.stringify([thu.open, sat.open]));

  /* ---------- Friday 21:30: festoons lit, stalls up, people about, Diarmuid's big amp ---------- */
  await M((e, d, h, a) => e.at(a, '21:30'), TUE); await look(); await frames(4);
  const progTue2 = await H(h => h.renderer.info.programs.length);
  const fri = await M((e, d, h, a) => e.at(a, '21:30'), FRI);
  await look(); await frames(6); await wait(800);
  const progFri = await H(h => h.renderer.info.programs.length);
  rec(fri.open && fri.vis && fri.e === 1 && fri.solid && fri.inOBS === fri.obs, 'Friday at half nine: the market is up and solid', JSON.stringify({ open: fri.open, e: fri.e, solid: fri.solid, obs: fri.obs, cells: fri.cells }));
  rec(fri.glow > .9, 'its festoons are lit', 'glow ' + fri.glow);
  rec(fri.figs.length >= 7 && fri.figs.every(f => f.vis && f.k > .99), 'the stallholders and the browsers are there', JSON.stringify(fri.figs.map(f => f.id)));
  rec(fri.amp, 'Diarmuid has his big amp out');
  const seen = await M((e, d, h) => { const c = h.stCam, M = d.market.MKT, R = 24, out = {}; c.updateMatrixWorld();
    const on = v => { const p = v.clone().project(c); return p.z < 1 && Math.abs(p.x) < .98 && Math.abs(p.y) < .98; };
    out.van = on(d.at(M.VAN[0], M.VAN[1]).multiplyScalar(R + 1)); out.cart = on(d.at(M.CART[0], M.CART[1]).multiplyScalar(R + 1));
    const bm = M.bulbs, m4 = bm.matrix.clone(), v = c.position.clone(); let nb = 0; for (let i = 0; i < bm.count; i++) { bm.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); if (on(v)) nb++; } out.bulbs = nb;
    out.people = M.figs.filter(f => on(f.g.position.clone().addScaledVector(f.dir, 1))).length; out.calls = h.renderer.info.render.calls; return out; });
  rec(mobile ? seen.van && seen.bulbs > 20 && seen.people >= 3 : seen.van && seen.cart && seen.bulbs > 20 && seen.people >= 5, 'walking into the square, the stalls, the festoons and the people are in view', JSON.stringify(seen));
  await shot(pre + 'market-friday-night');
  /* (between the two looks at the same spot, Tuesday night then Friday night, only the market differs) */
  rec(progFri === progTue2, 'no new shader is made when the market appears (all made ahead)', 'programs: Tuesday first look ' + progTue + ', again ' + progTue2 + ', Friday ' + progFri);
  const lv = await M(e => { const b = window.__heloria.ST.cr._dbg.busk; return { far: +b.level(b.DM.x + 11.5, b.DM.z).toFixed(3), near: +b.level(b.DM.x + 1.5, b.DM.z).toFixed(3) }; });
  rec(lv.far > .005 && tueLv === 0 && lv.near <= 1, 'on a market night his big amp carries further (heard at eleven and a half metres), never louder than full', JSON.stringify({ friday: lv, tuesday: tueLv }));
  /* a closer look at him on the night */
  await M((e, d) => { const D = d.busk.DM, fx = D.face[0] - D.x, fz = D.face[1] - D.z, k = Math.hypot(fx, fz), ux = fx / k, uz = fz / k; e.put(D.x + ux * 3.4 + uz * 1.5, D.z + uz * 3.4 - ux * 1.5, D.x + uz * .4, D.z - ux * .4); e.run(40); }); await frames(4); await wait(800); await shot(pre + 'market-diarmuid');

  /* ---------- walkways and the ways to everyone stay open ---------- */
  const ways = await M((e, d, h) => { const M = d.market.MKT, O = M.obs, res = {};
    /* the four paths across the square: their middle is clear by more than a body's width everywhere */
    const paths = [[0, -6.4, 0, -1.6], [0, 1.6, 0, 8.3], [-7.7, 0, -1.6, 0], [1.6, 0, 8, 0]]; let close = 99;
    for (const [x0, z0, x1, z1] of paths) for (let s = 0; s <= 40; s++) { const x = x0 + (x1 - x0) * s / 40, z = z0 + (z1 - z0) * s / 40; for (const o of O) close = Math.min(close, Math.hypot(x - o.x, z - o.z) - o.r); }
    res.pathClear = +close.toFixed(2);
    /* from around the square (and from where you land) to each of us, Diarmuid and every landmark */
    const from = [[0, -7.5], [-6.5, 0], [6.8, -.8], [0, 7.6], [1.2, 3], [-1.2, 3], [-3.2, -.9], [3.3, -1], [-3.2, -12]], to = d.people.map(p => [p.first, p.x, p.z, 1.8]).concat([['Diarmuid', d.busk.DM.x, d.busk.DM.z, 2.2]]).concat(Object.entries(d.INST).map(([k, q]) => [k, q.x, q.z, q.r * .8]));
    const bad = [], thru = []; for (const [fx, fz] of from) for (const [n, tx, tz, r] of to) { const p = d.navPath(fx, fz, tx, tz, r); if (!p) { bad.push(n + ' from ' + fx + ',' + fz); continue; }
      const pts = [[fx, fz], ...p]; for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s <= 10; s++) { const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * s / 10, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * s / 10; if (O.some(o => Math.hypot(x - o.x, z - o.z) < o.r)) { thru.push(n); break; } } }
    res.routes = from.length * to.length; res.none = bad; res.through = [...new Set(thru)]; return res; });
  rec(ways.pathClear > .45, 'the paths across the square stay clear', 'closest anything comes to a path\'s middle ' + ways.pathClear + ' m');
  rec(!ways.none.length, 'there is a way from all round the square to each of us, Diarmuid and every landmark', ways.routes + ' routes; none for ' + JSON.stringify(ways.none));
  rec(!ways.through.length, 'and none goes through a stall, a pole, the table or anyone standing about', JSON.stringify(ways.through));
  /* really walking: from the north of the square to Abraham and to Michael, round everything */
  for (const [i, from] of [[2, [0, 7.4]], [1, [-3.5, 1]]]) {
    await M((e, d, h, a) => { d.closeTalk(); d.people.forEach(p => { p.greeted = false; }); e.put(a[0], a[1], 0, 0); e.run(3); d.goTalk(d.people[a[2]]); }, [from[0], from[1], i]);
    const w = await M(e => e.until(d => !!d.talk().p, 30 * 40, true)), who = await M(e => e.talk());
    rec(who === (i === 2 ? 'Abraham' : 'Michael') && w.bad === 0, 'walking over to ' + (i === 2 ? 'Abraham' : 'Michael') + ' through the market, round everything', JSON.stringify({ ...w, who }));
  }
  await M((e, d) => d.closeTalk());
  /* and you cannot walk through the van */
  await M(e => { e.put(4.8, -.4, 4.8, 3); e.run(3); }); await page.keyboard.down('KeyW'); const vanW = await M((e, d) => { let m = 99; for (let i = 0; i < 90; i++) { e.run(1); const P = d.player; for (const o of d.market.MKT.obs) m = Math.min(m, Math.hypot(P.x - o.x, P.z - o.z) - o.r); } return +m.toFixed(2); }); await page.keyboard.up('KeyW');
  rec(vanW > .1, 'walking straight at the van, you stop at it', 'closest to anything of the market ' + vanW + ' m');

  /* ---------- the hour: it fades in at six, out at two, never all at once ---------- */
  const fade = await M((e, d, h, a) => { const m = d.market; e.at(a.fri, '17:59:40'); const k0 = m.state.e, rows = [];
    d.sky.set({ time: '18:00:00' }); for (let i = 0; i < 24; i++) { m.step(.5); const s = m.state; rows.push([s.e, s.glow, s.vis]); }
    e.at(a.sat, '01:59:40'); const k1 = m.state.e, out = []; d.sky.set({ time: '02:00:00' }); for (let i = 0; i < 24; i++) { m.step(.5); const s = m.state; out.push([s.e, s.glow, s.vis]); }
    return { k0, k1, up: rows, down: out }; }, { fri: FRI, sat: SAT });
  const mono = (r, s) => r.every((v, i) => !i || s * (v[0] - r[i - 1][0]) >= -1e-6), jump = r => Math.max(...r.map((v, i) => i ? Math.abs(v[0] - r[i - 1][0]) : 0)), gj = r => Math.max(...r.map((v, i) => i ? Math.abs(v[1] - r[i - 1][1]) : 0));
  rec(fade.k0 === 0 && mono(fade.up, 1) && fade.up[0][0] > 0 && fade.up[0][0] < .2 && fade.up[fade.up.length - 1][0] === 1 && jump(fade.up) < .2 && gj(fade.up) < .2,
    'crossing six on a Friday it fades in over a few seconds, no step bigger than a fifth', fade.up.map(r => r[0].toFixed(2)).join(' '));
  rec(fade.k1 === 1 && mono(fade.down, -1) && fade.down[0][0] < 1 && fade.down[0][0] > .8 && fade.down[fade.down.length - 1][0] === 0 && !fade.down[fade.down.length - 1][2] && jump(fade.down) < .2 && gj(fade.down) < .2,
    'crossing two on Saturday morning it fades out the same way, and is gone', fade.down.map(r => r[0].toFixed(2)).join(' '));
  const midShot = await M((e, d, h, a) => { e.at(a, '17:59:57'); d.sky.set({ time: '18:00:00' }); d.market.step(3.2); return d.market.state.e; }, FRI);
  await look(); await M((e, d) => { d.market.MKT.snap = false; }); await shot(pre + 'market-fading-in'); log('  (fading in, at ' + midShot + ')');

  /* ---------- rain: the stalls stay, the people at the table go home ---------- */
  const rain = await M((e, d, h, a) => { e.at(a, '21:30', 'rain'); d.sky.step(2); d.market.step(12); return d.market.state; }, FRI);
  const gone = rain.figs.filter(f => !f.vis).map(f => f.id), stay = rain.figs.filter(f => f.vis).map(f => f.id);
  rec(rain.vis && rain.e === 1 && rain.wet > .9 && gone.length >= 2 && stay.length >= 3 && stay.includes('chipper') && stay.includes('queue1'), 'in the rain the stalls stay open and only the queue stays about', JSON.stringify({ gone, stay }));
  await look(); await shot(pre + 'market-rain');

  /* ---------- dusk on a Friday in September ---------- */
  /* (the sun sets when it really does where the visitor is, Dublin for the tests: about 19:40 on that day, its gold light
     coming on from about 18:20, so the first moment of dusk is looked for from six on) */
  const dusk = await M((e, d, h, a) => { let s = null; for (const t of ['18:00', '18:10', '18:20', '18:30', '18:40', '18:50', '19:00', '19:10', '19:20', '19:30', '19:40']) { s = e.at(a, t); const k = d.sky.state; s.sky = k; if (k.dusk > .3 && k.night < .7) break; } return s; }, '2026-09-18');
  rec(dusk.open && dusk.vis && dusk.sky.dusk > .3 && dusk.glow > .3 && dusk.glow < 1, 'at dusk on a Friday the market is up and the bulbs are coming up with the dark', JSON.stringify({ h: dusk.h, dusk: dusk.sky.dusk, night: dusk.sky.night, glow: dusk.glow }));
  await look(); await shot(pre + 'market-friday-dusk');

  /* ---------- the sounds: the fryer, the basket and the glasses, only near, soft, in line with the footsteps ---------- */
  await M((e, d, h, a) => { e.at(a, '21:30'); }, FRI);
  const hasA = await H(h => !!(h.A.mktFry && h.A.mktBasket && h.A.mktClink));
  rec(hasA, 'the market has its own sounds: the fryer, the basket, the glasses');
  /* counted, as the station plays them: near the van on Friday night, and at the same spot on a Tuesday */
  await H(h => { const A = h.A; window.__MC = { fry: 0, basket: 0, clink: 0, g: [] }; for (const [k, f] of [['fry', 'mktFry'], ['basket', 'mktBasket'], ['clink', 'mktClink']]) { const o = A[f].bind(A); A['_' + f] = o; A[f] = (g, p) => { window.__MC[k]++; window.__MC.g.push([k, +g.toFixed(4)]); return o(g, p); }; } });
  /* (twenty seconds of the station's own clock, stepped by hand: headless frames are too slow to wait for) */
  await M(e => { e.put(3.2, -.3, 4.8, 2); e.run(2); }); await H(() => { window.__MC.fry = window.__MC.basket = window.__MC.clink = 0; window.__MC.g = []; });
  await M(e => e.run(600)); const cntF = await H(() => JSON.parse(JSON.stringify(window.__MC)));
  await M((e, d, h, a) => { e.at(a, '21:30'); e.put(3.2, -.3, 4.8, 2); }, TUE); await H(() => { window.__MC.fry = window.__MC.basket = window.__MC.clink = 0; });
  await M(e => e.run(300)); const cntT = await H(() => JSON.parse(JSON.stringify(window.__MC)));
  rec(cntF.fry >= 3 && cntF.basket >= 1 && cntF.g.every(([k, g]) => g <= (k === 'fry' ? .04 : k === 'basket' ? .02 : .016)), 'by the van on a Friday night the fryer spits now and then (and the basket, the glasses), never above their levels', JSON.stringify({ fry: cntF.fry, basket: cntF.basket, clink: cntF.clink, levels: cntF.g.slice(0, 6) }));
  rec(cntT.fry + cntT.basket + cntT.clink === 0, 'and on a Tuesday there is none of it', JSON.stringify(cntT));
  /* how loud, against the footsteps: each played alone (the music and the night's crickets held back for the moment) and
     its loudest 10 ms read off a long listen at the speakers */
  const meter = await H(async h => {
    const c = window.__meterCtx; if (!c || !c.__an) return null; const A = h.A, an = c.createAnalyser(); an.fftSize = 32768; c.__an.connect(an); const buf = new Float32Array(an.fftSize);
    const keep = { music: A.music, cricket: A.cricket, chirp: A.chirp, busk: A.busk }; A.music(0); A.busk(0, 0, 0); A.music = () => {}; A.cricket = () => {}; A.chirp = () => {}; A.busk = () => {};
    const sleep = ms => new Promise(r => setTimeout(r, ms)), lv = d => Math.pow(Math.max(0, 1 - d / 14), 1.5);
    const read = () => { an.getFloatTimeDomainData(buf); let pk = 0, best = 0; const W = Math.round(c.sampleRate * .01); for (let i = 0; i + W <= buf.length; i += W >> 1) { let q = 0; for (let j = i; j < i + W; j++) q += buf[j] * buf[j]; best = Math.max(best, q / W); } for (const v of buf) pk = Math.max(pk, Math.abs(v)); return { pk: +(20 * Math.log10(pk + 1e-9)).toFixed(1), rms10: +(10 * Math.log10(best + 1e-12)).toFixed(1) }; };
    await sleep(2500); const floor = read(); const out = { floor };
    const play = async (n, fn) => { const r = []; for (let i = 0; i < 3; i++) { fn(); await sleep(450); r.push(read()); await sleep(500); } out[n] = { pk: Math.max(...r.map(x => x.pk)), rms10: Math.max(...r.map(x => x.rms10)) }; };
    await play('step on the pavement', () => A.step(1)); await play('step on the grass', () => A.step(0));
    await play('fryer, 2 m from the van', () => A._mktFry(.04 * lv(2), 0)); await play('basket, 2 m', () => A._mktBasket(.02 * lv(2), 0)); await play('glasses, 2 m from the table', () => A._mktClink(.016 * lv(2), 0));
    Object.assign(A, keep); c.__an.disconnect(an); return out; });
  if (meter) { log('  levels (dB at the speakers, peak and loudest 10 ms):'); for (const [k, v] of Object.entries(meter)) log('   ', k.padEnd(30), String(v.pk).padStart(7), String(v.rms10).padStart(7));
    const st1 = meter['step on the pavement'], st0 = meter['step on the grass'], loudStep = Math.max(st1.rms10, st0.rms10), ks = ['fryer, 2 m from the van', 'basket, 2 m', 'glasses, 2 m from the table'];
    rec(ks.every(k => meter[k].rms10 <= loudStep + 1 && meter[k].rms10 > meter.floor.rms10 + 6), 'each market sound is heard, and no louder than a footstep', ks.map(k => k.split(',')[0] + ' ' + meter[k].rms10).join(', ') + ' against steps ' + st1.rms10 + ' / ' + st0.rms10 + ' (quiet ' + meter.floor.rms10 + ')'); }
  else log('  (run with --meter to measure the levels)');

  log(`\n${pass} passed, ${fail} failed` + (fail ? ': ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

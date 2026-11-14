/* Earth's traffic, soaked: the town's vehicles (the kei van, the bike, the bus, the post's van, the milk float) through whole
   days with the clock running, so that they always flow like a calm small town's: they stop where they mean to (the bus at
   its stop, for people on the zebra, to park, on the delivery round) and then always move on. Nobody is ever held up longer
   than they mean to stop, by each other, by anyone on foot or by you; nothing drives off the road; at night all of it is
   parked. First a Wednesday with you well off the road (the morning rush, the milk, the school run, the market evening, night),
   then a Friday with you in and by the road all day (in each lane, on the zebra, at the bus stop and its door, at the kerb
   where each one stops, at the doors, walking across and along), then the ways it used to stick, one at a time.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/traffic.cjs --out <dir>
   The station's clock is stepped by hand (a clock minute every two seconds of the town's own time, so a day is busy). */
module.exports = async ({ page, H, log }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  await H(h => {
    const st = h.ST.cr, d = st._dbg, T = d.town, TL = T.TL, RW = 1.2, pad = n => String(n).padStart(2, '0');
    /* how long each means to stop at most (seconds of its own time): the bus at its stop, the driver in at the town hall, the
       café, the post office, the post's van resting by day, a doorstep; and stopped on the road, waiting (for a gap to pass,
       for the bus to pull out from its stop) */
    const LIM = { stop: 45, hall: 120, cafe: 130, po: 60, rest: 100, milk: 60, drive: 45 };
    const W = window.__TR = {
      ev: [], maxLat: {}, passes: 0, youOff: 99, st: {}, act: null,
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); this.check(1 / 30); } },
      clock(hr) { const H_ = Math.floor(hr), m = (hr - H_) * 60, M = Math.floor(m), s = Math.floor((m - M) * 60); d.sky.set({ time: pad(H_) + ':' + pad(M) + ':' + pad(s) }); },
      at(date, time) { d.sky.set({ date, time, weather: 'clear' }); d.sky.step(.2); this.run(2); },
      put(x, z, fx, fz) { d.closeTalk(); d.people.forEach(q => { q.greeted = true; }); const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx ?? 0, fz ?? 0); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); P.tgt = null; P.path = null; P.speed = 0; TL.clearSkip = 8; },
      putAt(s, lat, ahead = 1) { const q = T.at(s, lat), f = T.at(s + ahead, lat); this.put(q.x, q.z, f.x, f.z); },
      far() { this.put(-6, -1, 0, 0); },   // (in the square, well off the road and away from everyone)
      /* parked for the night, or the post's van resting outside its hours: as long as it likes */
      legit(c) { const hh = d.sky.SKY.h, why = c.via && c.via.why, nt = hh >= 23 || hh < 6.5;
        return c.id === 'bus' && nt || (why === 'hall' || why === 'cafe') && nt && c.stage === 2 || why === 'rest' && (hh < 8 || hh >= 19); },
      who(b) { if (!b) return null; if (b.car) return 'car:' + b.car.id; if (b.me) return 'you'; const L = [];
        d.people.forEach(p => L.push(['person:' + p.first, p.x, p.z])); TL.feet.forEach(w => { if (w.on) L.push(['walker:' + w.key, w.x, w.z]); }); TL.kids.forEach((k, i) => { if (k.on) L.push(['kid' + i, k.x, k.z]); });
        d.civic.CIV.kids.forEach(k => { if (k.vis) L.push(['schoolchild' + k.i, k.x, k.z]); });
        let best = null, bd = 1e9; for (const [n, x, z] of L) { const e = Math.hypot(x - b.x, z - b.z); if (e < bd) { bd = e; best = n; } } return best; },
      /* a vehicle as it is: what it is doing, where, what it is waiting for, and what is round it */
      snap(c) { const r = x => +(+x).toFixed(2), [g, by] = T.gap(c), P = d.player, me = T.near(P.x, P.z);
        return { id: c.id, clock: +d.sky.SKY.h.toFixed(3), act: this.act, mode: c.mode, why: c.via && c.via.why, stage: c.stage, s: r(c.s), lat: r(c.lat), latW: r(c.latW), v: r(c.v), pass: c.pass ? c.pass.id || 'someone' : null, stopAt: c.stopAt == null ? null : r(c.stopAt),
          gap: r(g), by: this.who(by), you: [r(me.s), r(me.lat)], walker: c.walker && c.walker.on ? { s: r(T.near(c.walker.x, c.walker.z).s), lat: r(T.near(c.walker.x, c.walker.z).lat), wait: r(c.walker.wait) } : null,
          others: TL.cars.filter(o => o !== c && o.on).map(o => o.id + ' ' + o.mode + ' s' + r(o.s) + ' lat' + r(o.lat) + ' v' + r(o.v)).join(' | ') }; },
      /* each frame: any vehicle stopped on the road longer than it means to (while you are not in the road yourself), or at a
         stop longer than it means to; how far out from the middle each ever is; how often one goes round another */
      /* the solid things at the kerb (the pillar box, Diarmuid's case and the like), along the road */
      kerb() { if (!this.kb || this.kbN !== d.OBS.length) { this.kbN = d.OBS.length; this.kb = d.OBS.filter(o => !o.tl).map(o => { const q = T.near(o.x, o.z); return { s: q.s, lat: q.lat, r: o.r, x: +o.x.toFixed(2), z: +o.z.toFixed(2) }; }).filter(k => Math.abs(k.lat) - k.r < RW + .5); } return this.kb; },
      over: [], solid: [], maxOver: 0, maxSolid: 0, youMin: 99, youAt: null,
      inside: 0, indoors() { return [d.po.P, d.pub.P, d.garage.G, d.lighthouse.L, d.chipper.C, d.civic.inside.HSI, d.cafe.C].some(o => o && o.on); },
      check(dt) { const P = d.player, Lr = T.TLR.L, on = TL.cars.filter(c => c.on), r2 = x => +x.toFixed(2); this.youOff = Math.abs(T.near(P.x, P.z).lat) < RW ? 0 : this.youOff + dt; if (this.indoors()) this.inside += dt;
        /* no two of them ever into each other (their footprints, along the road and across it), nor over anything solid */
        for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) { const a = on[i], b = on[j], ds = Math.abs(((a.s - b.s) % Lr + Lr * 1.5) % Lr - Lr / 2), o = Math.min(a.hl + b.hl - ds, a.hw + b.hw - Math.abs(a.lat - b.lat)), key = a.id + '+' + b.id;
          if (o > .005) { this.maxOver = Math.max(this.maxOver, o); if (!this.over.some(e => e.key === key && e.open)) this.over.push({ key, open: true, depth: r2(o), clock: r2(d.sky.SKY.h), act: this.act, a: this.snap(a), b: this.snap(b) }); }
          else this.over.forEach(e => { if (e.key === key) e.open = false; }); }
        /* (the nearest any of them comes to you, and what was going on then) */
        if (!(TL.clearSkip > 0)) { for (const c of on) { let e = 99; for (const o of c.obs) e = Math.min(e, Math.hypot(P.x - o.x, P.z - o.z) - o.r); if (e < this.youMin) { const q = T.near(P.x, P.z); this.youMin = e; this.youAt = { e: r2(e), act: this.act, you: [r2(q.s), r2(q.lat)], path: !!P.path, speed: r2(P.speed), car: this.snap(c) }; } }
          for (const w of TL.feet) if (w.on) { const e = Math.hypot(P.x - w.x, P.z - w.z) - w.ob.r; if (e < this.youMin) { const q = T.near(P.x, P.z), c = TL.cars.find(c => c.walker === w); this.youMin = e; this.youAt = { e: r2(e), walker: w.key, act: this.act, you: [r2(q.s), r2(q.lat)], w: [r2(T.near(w.x, w.z).s), r2(T.near(w.x, w.z).lat)], ri: w.ri, n: w.route ? w.route.length : 0, wait: r2(w.wait), car: c ? this.snap(c) : null }; } } }
        for (const c of on) for (const k of this.kerb()) { const ds = Math.abs(((c.s - k.s) % Lr + Lr * 1.5) % Lr - Lr / 2), e = Math.hypot(Math.max(0, ds - c.hl), Math.max(0, Math.abs(c.lat - k.lat) - c.hw)) - k.r;
          if (e < -.005) { this.maxSolid = Math.max(this.maxSolid, -e); if (this.solid.length < 6 && !this.solid.some(q => q.id === c.id && q.at === k.x + ',' + k.z)) this.solid.push({ id: c.id, at: k.x + ',' + k.z, r: k.r, into: r2(-e), s: r2(c.s), lat: r2(c.lat), mode: c.mode, why: c.via && c.via.why }); } }
        for (const c of TL.cars) { const k = this.st[c.id] = this.st[c.id] || { still: 0, stopT: 0, ep: null, worst: 0, dist: 0, pass: null };
          if (!c.on) { k.still = 0; k.stopT = 0; k.ep = null; continue; }
          this.maxLat[c.id] = Math.max(this.maxLat[c.id] || 0, Math.abs(c.lat)); k.dist += c.v * dt; if (c.pass && c.pass !== k.pass) this.passes++; k.pass = c.pass;
          let over;
          if (c.mode === 'drive') { k.stopT = 0; k.still = c.v < .05 && this.youOff > 1 ? k.still + dt : 0; k.worst = Math.max(k.worst, k.still); over = k.still > LIM.drive; }
          else { k.still = 0; k.stopT = this.legit(c) ? 0 : k.stopT + dt; over = k.stopT > (LIM[c.via && c.via.why] || 60); }
          if (over && !k.ep) { k.ep = { at: this.snap(c), dur: 0 }; this.ev.push(k.ep); }
          if (k.ep) { if (over) k.ep.dur += dt; else { k.ep.end = this.snap(c); k.ep = null; } } } },
      /* the clock from h0 to h1, a minute every spm seconds; hook(hour) each minute */
      soak(h0, h1, spm, hook) { let hr = h0; this.clock(hr); this.run(2); while (hr < h1 - 1e-6) { if (hook) hook(hr); hr = Math.min(h1, hr + 1 / 60); this.clock(hr); this.run(Math.round(spm * 30)); } },
      /* the nearest two vehicles' bodies come (or you and a vehicle), past their edges */
      /* the room between two vehicles' footprints (along the road and across it; less than 0, into each other) */
      gapOf(a, b) { const Lr = T.TLR.L, ds = Math.abs(((a.s - b.s) % Lr + Lr * 1.5) % Lr - Lr / 2); return Math.max(ds - a.hl - b.hl, Math.abs(a.lat - b.lat) - a.hw - b.hw); },
      near(a, b) { let m = 99; for (const o of a.obs) for (const q of b.obs) m = Math.min(m, Math.hypot(o.x - q.x, o.z - q.z) - o.r - q.r); return m; },
      meNear(c) { const P = d.player; let m = 99; for (const o of c.obs) m = Math.min(m, Math.hypot(P.x - o.x, P.z - o.z) - o.r - .28); return m; },
      /* a vehicle set going on the road at s (or parked out of the way, for a while) */
      go(c, s, v) { c.s = (s % T.TLR.L + T.TLR.L) % T.TLR.L; c.mode = 'drive'; c.stopAt = null; c.hold = 99; c.v = v ?? c.vmax; c.lat = c.latW = c.lane; c.pass = null; c.laps = 0; c.want = 9; c.wait = 0; c.hp = 0; },
      park(c, s, why) { c.s = (s % T.TLR.L + T.TLR.L) % T.TLR.L; c.mode = 'stop'; c.v = 0; c.via = { s: c.s, lat: why === 'cafe' ? c.dir * (RW + .22) : c.dir * (RW - .04 - c.hw), why }; c.stopAt = c.s; c.lat = c.latW = c.via.lat; c.stage = 2; c.t2 = 0; c.stay = 999; c.pass = null; },
      out() { T.place(); const R = T.TLP; for (const c of TL.cars) if (c.on) { if (c.id === 'bus') this.park(c, R.bus, 'stop'), c.lay = 999, c.t = 0; else if (c.id === 'kei') this.park(c, R.hall - .5, 'hall'); else if (c.id === 'bike') this.park(c, R.cafe, 'cafe'); else if (c.id === 'post') this.park(c, R.rest, 'rest'); } },
    };
  });
  const L = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__TR, h.ST.cr._dbg, h.ST.cr._dbg.town, h, a), [fn.toString(), arg]);
  const evs = r => r.ev.map(e => JSON.stringify(e)).join('\n    ');

  /* ---------- the landing: the rocket comes down and you walk out, watched from low in the road by the zebra. Nothing drives
     through where it is watched from, nor near the rocket, at the hours each one would come by (the milk, the post, the bus) ---------- */
  const land = await L((W, d, T, h) => { const st = h.ST.cr, CUT = d.cut(), out = {};
    for (const time of ['07:00', '10:00', '15:00', '18:30']) { d.sky.set({ date: '2026-07-15', time, weather: 'clear' }); W.run(2);
      st.cutscene(); d.place(); T.TL.h0 = null; let f = 0, cam = 99, rk = 99, who = null;
      for (; f < 30 * 12 && CUT.on; f++) { W.run(1); const [cx, cz] = d.loc(st.camP.clone().normalize()), [rx, rz] = d.loc(d.RK.g.position.clone().normalize());
        for (const c of T.TL.cars) { if (!c.on) continue; for (const o of c.obs) { const e = Math.hypot(o.x - cx, o.z - cz) - o.r; if (CUT.t < 6.6 && e < cam) { cam = e; who = c.id + ' at ' + CUT.t.toFixed(1) + ' s'; } rk = Math.min(rk, Math.hypot(o.x - rx, o.z - rz) - o.r); } } }
      out[time] = { frames: f, cam: +cam.toFixed(2), who, rocket: +rk.toFixed(2) }; }
    return out; });
  rec(Object.values(land).every(r => r.frames < 30 * 12 && r.cam > .5 && r.rocket > 2), 'landing: no vehicle drives through where the landing is watched from (low in the road), nor anywhere near the rocket', JSON.stringify(land));
  await H(h => { h.ST.cr._dbg.skipCut(); h.ST.cr._dbg.began(); });
  const boot = await L((W, d, T) => ({ ok: T.TL.ok, err: T.err }));
  rec(boot.ok && !boot.err, 'town life is built with Earth and running', JSON.stringify(boot));
  await page.waitForFunction(() => (!window.__heloria.late || window.__heloria.late().ready), null, { timeout: 900000, polling: 500 }).catch(() => {});
  const prog0 = await H(h => h.renderer.info.programs.length);
  await L((W, d, T) => { T.TL.clear.min = 99; });

  /* ---------- a Wednesday, you well off the road: from the milk round to the last of them parked for the night ---------- */
  await L((W, d, T) => { W.at('2026-07-15', '05:35'); W.far(); W.run(30); });
  let day = { ev: [] };
  for (const [a, b] of [[5.6, 9], [9, 13], [13, 17], [17, 21], [21, 23.5]]) {
    const t0 = Date.now();
    const r = await L((W, d, T, h, [a, b]) => { const n0 = W.ev.length; W.soak(a, b, 2); return { ev: W.ev.slice(n0), cars: T.state.cars.filter(c => c.on).map(c => c.id + ' ' + c.mode + (c.why ? '/' + c.why : '') + ' v' + c.v) }; }, [a, b]);
    log('  ' + a + ' to ' + b + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):', r.cars.join(', ')); day.ev.push(...r.ev);
  }
  const wed = await L((W, d, T) => { const r = x => +x.toFixed(2); return { night: T.state.cars.filter(c => c.on).map(c => ({ id: c.id, mode: c.mode, why: c.why, v: c.v })), maxLat: Object.fromEntries(Object.entries(W.maxLat).map(([k, v]) => [k, r(v)])), passes: W.passes,
    dist: Object.fromEntries(Object.entries(W.st).map(([k, v]) => [k, Math.round(v.dist)])), worst: Object.fromEntries(Object.entries(W.st).map(([k, v]) => [k, r(v.worst)])), left: T.TL.n.left || 0, milkIn: T.TL.n.milkIn || 0, L: r(T.TLR.L) }; });
  log('  the day:', JSON.stringify(wed));
  rec(!day.ev.length, 'a whole Wednesday with you off the road: no vehicle is ever stopped longer than it means to (on the road or at a stop)', day.ev.length + ' held up' + (day.ev.length ? '\n    ' + evs(day) : '; the longest wait on the road ' + Math.max(...Object.values(wed.worst)).toFixed(1) + ' s'));
  rec(['kei', 'bike', 'bus', 'post'].every(k => wed.dist[k] > wed.L * 8) && wed.milkIn >= 1 && wed.left >= 2, 'all day every one of them keeps going round (the milk float on its round in the morning, leaving bottles)', JSON.stringify({ dist: wed.dist, milkIn: wed.milkIn, left: wed.left }));
  rec(Object.entries(wed.maxLat).every(([k, v]) => v <= (k === 'bike' ? 1.45 : 1.2)) && wed.passes > 0, 'every one keeps to the road (out to the kerb at most, the bike up on it at the café), going round what is stopped', JSON.stringify({ maxLat: wed.maxLat, passes: wed.passes }));
  rec(wed.night.every(c => c.mode === 'stop' && c.v === 0) && wed.night.some(c => c.id === 'bus' && c.why === 'stop'), 'by half past eleven at night all of them are parked, the bus at its stop', JSON.stringify(wed.night));

  /* ---------- a Friday, you in and by the road all day: a minute or so at each place, then off the road a while ---------- */
  const acts = await L((W, d, T) => { const R = T.TLP, z = T.near(-3, -8.9), PW = d.po.PW, [dx, dz] = d.po.local(PW.DX, PW.d / 2 + .85), dq = T.near(dx, dz);
    W.acts = [['in the outer lane', 'stand', R.hall + 9, .6], ['in the bus lane', 'stand', R.bus - 9, -.6], ['on the zebra', 'stand', z.s, .25], ['at the bus stop', 'stand', R.bus - 1.55, -1.8], ['by the bus door', 'stand', R.bus - .6, -1.49],
      ['at the kerb by the post office', 'stand', R.po + .2, 1.5], ['at the post office door', 'stand', dq.s, dq.lat], ['at the kerb by the town hall', 'stand', R.hall - .5, 1.45], ['at the kerb by the cafe', 'stand', R.cafe, 1.6], ['at the kerb by a doorstep', 'stand', R.milk[0].s, 1.45],
      ['in the middle by the bus stop', 'stand', R.bus + 3, 0], ['in the outer lane by the post office', 'stand', R.po - 2.5, .6],
      ['across at the post office', 'walk', R.po + .2, -2.0, R.po + .2, 1.6], ['across at the bus stop', 'walk', R.bus, -2.0, R.bus + 1, 1.6], ['along the outer lane', 'walk', R.hall + 2, .6, R.hall + 12, .6],
      ['across at the town hall', 'walk', R.hall, 1.6, R.hall + 1, -2.0], ['across at the cafe', 'walk', R.cafe + 1, -2.0, R.cafe + 1, 1.6], ['along the bus lane', 'walk', R.bus - 2, -.6, R.bus - 12, -.6]];
    W.ai = 0; return W.acts.map(a => a[0]); });
  log('  the places:', acts.join('; '));
  const fri = { ev: [] };
  for (const [a, b, time] of [[7.5, 10.5, '07:30'], [14.5, 18.5, '14:30'], [22.5, 23.75, '22:30']]) {
    const t0 = Date.now();
    const r = await L((W, d, T, h, [a, b, time]) => { W.at('2026-07-17', time); W.far(); W.run(30); const n0 = W.ev.length; let ph = 0;
      W.soak(a, b, 2, hr => { ph++;
        if (ph % 30 === 1) { const A = W.acts[W.ai++ % W.acts.length], p = T.at(A[2], A[3]);
          if (T.TL.cars.some(c => c.on && c.obs.some(o => Math.hypot(o.x - p.x, o.z - p.z) < o.r + .45))) return;   // (one is standing just there now: you are not put down on top of it)
          W.act = A[0]; if (A[1] === 'stand') { const f = T.at(A[2] + 1, A[3]); W.put(p.x, p.z, f.x, f.z); }
          else { W.put(p.x, p.z); const g = T.at(A[4], A[5]), P = d.player; P.path = d.navPath(p.x, p.z, g.x, g.z, .3) || [[g.x, g.z]]; P.tgt = null; } }
        else if (ph % 30 === 14) { W.act = null; W.far(); } });
      W.act = null; W.far(); return { ev: W.ev.slice(n0), cars: T.state.cars.filter(c => c.on).map(c => c.id + ' ' + c.mode + (c.why ? '/' + c.why : '') + ' v' + c.v) }; }, [a, b, time]);
    log('  ' + a + ' to ' + b + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):', r.cars.join(', ')); fri.ev.push(...r.ev);
  }
  const friS = await L((W, d, T) => ({ maxLat: Object.fromEntries(Object.entries(W.maxLat).map(([k, v]) => [k, +v.toFixed(2)])), err: T.err, inside: +W.inside.toFixed(1) }));
  rec(!fri.ev.length && !friS.inside, 'a whole Friday with you in and by the road (lanes, zebra, bus stop, kerbs, doors, walking across): once you are off the road nobody is held up, and nobody stops longer than they mean to', fri.ev.length + ' held up' + (friS.inside ? '; you were indoors ' + friS.inside + ' s of it (not in the street)' : '') + (fri.ev.length ? '\n    ' + evs(fri) : ''));
  rec(Object.entries(friS.maxLat).every(([k, v]) => v <= (k === 'bike' ? 1.45 : 1.2)), 'and every one of them still keeps to the road', JSON.stringify(friS.maxLat));

  /* ---------- the ways it used to stick, one at a time (a Wednesday afternoon) ---------- */
  /* going round a parked van with the bus coming the other way: it gets past and back in, the bus giving it room; never into either */
  const ov = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.far(); W.out(); const R = T.TLP, p = T.TLA.post, k = T.TLA.kei, b = T.TLA.bus;
    W.park(p, R.po + .2, 'po'); W.go(k, p.s - (p.hl + k.hl + 1.3), 0); W.go(b, k.s + 16.5, 1.9);
    const Lr = T.TLR.L, ah = () => ((k.s - p.s) % Lr + Lr) % Lr, bh = () => ((p.s - b.s) % Lr + Lr) % Lr;
    let mn = 99, mnP = 99, still = 0, worst = 0, went = false, mx = 0, t = 0; for (; t < 30 * 40; t++) { W.run(1); mn = Math.min(mn, W.gapOf(k, b)); mnP = Math.min(mnP, W.gapOf(k, p)); went = went || !!k.pass; mx = Math.max(mx, Math.abs(k.lat));
      still = k.v < .05 && b.v < .05 ? still + 1 / 30 : 0; worst = Math.max(worst, still); if (ah() > 2 && ah() < 20 && Math.abs(k.lat - .6) < .01 && bh() > 2 && bh() < 20 && k.v > 1 && b.v > 1) break; }
    return { sec: +(t / 30).toFixed(1), went, past: +ah().toFixed(1), busPast: +bh().toFixed(1), lat: +k.lat.toFixed(2), mx: +mx.toFixed(2), kv: +k.v.toFixed(2), bv: +b.v.toFixed(2), bus: +mn.toFixed(2), van: +mnP.toFixed(2), bothStill: +worst.toFixed(1) }; });
  rec(ov.went && ov.sec < 40 && ov.bus > 0 && ov.van > 0 && ov.bothStill < 5, 'going round a parked van with the bus coming the other way: the van gets past and back in, the bus gives it room, nothing touches', JSON.stringify(ov));

  /* two of them going the same way, nose to tail behind something stopped: only the one behind goes round, and both go on */
  const nt = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.far(); W.out(); const R = T.TLP, k = T.TLA.kei, bk = T.TLA.bike, p = T.TLA.post, s0 = R.hall + 12, Lr = T.TLR.L, ah = c => ((c.s - s0) % Lr + Lr) % Lr;
    W.park(p, s0, 'po'); W.go(bk, s0 - (p.hl + bk.hl + 1.25), 0); W.go(k, bk.s - (bk.hl + k.hl + 1.25), 0);
    let mx = 0, both = 0, t = 0; for (; t < 30 * 40; t++) { W.run(1); mx = Math.max(mx, Math.abs(k.lat), Math.abs(bk.lat)); if (k.pass && bk.pass && (k.pass === bk || bk.pass === k)) both++; if (ah(k) > 3 && ah(k) < 25 && ah(bk) > 3 && ah(bk) < 25 && Math.abs(k.lat - .6) < .01 && Math.abs(bk.lat - .6) < .01) break; }
    return { sec: +(t / 30).toFixed(1), both, mx: +mx.toFixed(2), kei: [+ah(k).toFixed(1), +k.v.toFixed(2), +k.lat.toFixed(2)], bike: [+ah(bk).toFixed(1), +bk.v.toFixed(2), +bk.lat.toFixed(2)] }; });
  rec(nt.both === 0 && nt.mx <= 1.2 && nt.sec < 40, 'two of them nose to tail behind a parked van: never each going round the other (out and out off the road), and both get by', JSON.stringify(nt));

  /* the bike held up (you on the zebra in front of it) with the van and the post's van coming up behind it: neither goes round
     it to stop again out in the middle of the road (and the next do the same, the road clogged); they wait behind it, and all
     three go on when you step off */
  const held = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.out(); const k = T.TLA.kei, bk = T.TLA.bike, p = T.TLA.post, z = T.near(-3, -8.9).s, Lr = T.TLR.L;
    W.putAt(z, .6); W.go(bk, z - 3.1, 0); W.go(k, bk.s - (bk.hl + k.hl + 3), 1.4); W.go(p, k.s - (k.hl + p.hl + 3.5), 1.4);
    let went = 0, outStill = 0, t = 0; const out = c => Math.abs(c.lat - c.lane) > .25;
    for (; t < 30 * 12; t++) { W.run(1); for (const c of [k, p]) { if (c.pass && c.pass === bk) went++; if (out(c) && c.v < .05) outStill += 1 / 30; } }
    W.putAt(z, 2.4); const past = c => { const a = ((c.s - z) % Lr + Lr) % Lr; return a > 2 && a < Lr / 2; };
    let t2 = 0; for (; t2 < 30 * 25 && !(past(bk) && past(k) && past(p)); t2++) { W.run(1); for (const c of [k, p]) if (out(c) && c.v < .05) outStill += 1 / 30; }
    return { wentRound: went, outInMiddleStill: +outStill.toFixed(1), allOnIn: +(t2 / 30).toFixed(1), bike: +bk.v.toFixed(2), kei: [+k.v.toFixed(2), +k.lat.toFixed(2)], post: [+p.v.toFixed(2), +p.lat.toFixed(2)] }; });
  rec(held.wentRound === 0 && held.outInMiddleStill < .5 && held.allOnIn < 25, 'the bike held up at the zebra with two behind it: neither goes round it to stop out in the middle of the road; they wait behind, and all three go on after', JSON.stringify(held));

  /* you standing in the outer lane a while: the van stops short of you, waits, then goes round you, well clear */
  const lane = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.out(); const k = T.TLA.kei, s = T.TLP.hall + 6; W.putAt(s, .6); W.go(k, s - 8, 2);
    let mn = 99, t = 0, waited = 0; for (; t < 30 * 30; t++) { W.run(1); mn = Math.min(mn, W.meNear(k)); if (k.v < .05) waited += 1 / 30; if (((k.s - s) % T.TLR.L + T.TLR.L) % T.TLR.L < T.TLR.L / 2 && ((k.s - s) % T.TLR.L + T.TLR.L) % T.TLR.L > 2) break; }
    return { sec: +(t / 30).toFixed(1), waited: +waited.toFixed(1), clear: +mn.toFixed(2), v: +k.v.toFixed(2) }; });
  rec(lane.sec < 25 && lane.waited > 6 && lane.clear > .2, 'you standing in the outer lane: the van stops short, waits a good while, then goes round you, well clear', JSON.stringify(lane));
  /* on the zebra it waits for you as long as you are on it, and goes when you step off */
  const zeb = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.out(); const k = T.TLA.kei, z = T.near(-3, -8.9).s; W.putAt(z, .3); W.go(k, z - 8, 2); W.run(30 * 25); const v1 = k.v, mn = W.meNear(k);
    W.putAt(z, 2.4); let t = 0; for (; t < 30 * 10 && k.v < 1; t++) W.run(1); return { waiting: +v1.toFixed(2), clear: +mn.toFixed(2), then: +(t / 30).toFixed(1), v: +k.v.toFixed(2) }; });
  rec(zeb.waiting < .05 && zeb.clear > .3 && zeb.then < 10, 'you on the zebra: it waits for you as long as you stand there, and drives on when you step off', JSON.stringify(zeb));
  /* by the bus's door at its stop: it still pulls away when it is time */
  const door = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.out(); const c = T.TLA.bus; W.park(c, T.TLP.bus, 'stop'); c.stage = 0; c.lay = 2; c.t = 3; const q = T.at(c.s + c.dir * .6, -1.49); W.put(q.x, q.z, q.x + q.dx, q.z + q.dz);
    let t = 0, mn = 99; for (; t < 30 * 20 && !(c.mode === 'drive' && c.v > 1); t++) { W.run(1); mn = Math.min(mn, W.meNear(c)); } return { sec: +(t / 30).toFixed(1), mode: c.mode, v: +c.v.toFixed(2), clear: +mn.toFixed(2) }; });
  rec(door.sec < 20 && door.clear > -.05, 'you standing by the bus\'s door at its stop: it still shuts its door and pulls away when it is time', JSON.stringify(door));
  /* the football children waiting at their way out (you watching them) at the kerb: the bus goes by */
  const kid = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.far(); W.out(); const c = T.TLA.bus, k = T.TL.kids[0], ks = T.near(k.sx, k.sz).s; k.x = k.sx; k.z = k.sz; k.st = 'out'; k.on = true; W.go(c, ks + 8, 1.9);
    let t = 0, mn = 99; for (; t < 30 * 15; t++) { W.run(1); k.x = k.sx; k.z = k.sz; k.st = 'out'; for (const o of c.obs) mn = Math.min(mn, Math.hypot(k.x - o.x, k.z - o.z) - o.r - .22); if (((ks - c.s) % T.TLR.L + T.TLR.L) % T.TLR.L > 3 && ((ks - c.s) % T.TLR.L + T.TLR.L) % T.TLR.L < 20) break; }
    k.on = false; k.st = 'off'; return { sec: +(t / 30).toFixed(1), v: +c.v.toFixed(2), clear: +mn.toFixed(2), lat: +T.near(k.sx, k.sz).lat.toFixed(2) }; });
  rec(kid.sec < 12 && kid.clear > 0, 'a child waiting on the pavement at the kerb (going home from football, while you watch) does not hold the bus up', JSON.stringify(kid));
  /* at the kerb where the post's van stops: it does not stand waiting for you, it goes round again */
  const kerb = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.out(); const c = T.TLA.post; W.putAt(T.TLP.po + .2, 1.5); W.go(c, T.TLP.po + .2 - 6, 2); c.hold = 0; c.next = 'po'; const k0 = c.skip || 0;
    let t = 0; for (; t < 30 * 30 && !(c.skip > k0 && c.v > 1); t++) W.run(1); return { sec: +(t / 30).toFixed(1), mode: c.mode, v: +c.v.toFixed(2), skipped: (c.skip || 0) - k0 }; });
  rec(kerb.sec < 30 && kerb.mode === 'drive' && kerb.skipped >= 1, 'you at the kerb where the post\'s van stops: it does not wait for you to move, it comes round again', JSON.stringify(kerb));
  /* standing in the post office's doorway as its van comes: the postie gives up a while after and drives on; nor standing where
     the kei van's driver gets back in holds it there */
  const pod = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.out(); const c = T.TLA.post, PW = d.po.PW, [x, z] = d.po.local(PW.DX, PW.d / 2 + .85); W.put(x, z, x + 1, z); W.go(c, T.TLP.po + .2 - 6, 2); c.hold = 0; c.next = 'po';
    let t = 0, st2 = false; for (; t < 30 * 75; t++) { W.run(1); st2 = st2 || c.mode === 'stop'; if (st2 && c.mode === 'drive' && c.v > 1) break; } return { stopped: st2, sec: +(t / 30).toFixed(1), mode: c.mode, v: +c.v.toFixed(2) }; });
  const hall = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.far(); W.out(); const c = T.TLA.kei; W.go(c, T.TLP.hall - .5 - 6, 2); c.hold = 0; c.laps = 9; c.want = 1;
    W.run(30 * 12); const q = T.at(c.s, c.lat + c.dir * (c.hw + .32)); W.put(q.x, q.z, q.x + q.dx, q.z + q.dz); c.stay = 3; let t = 0; for (; t < 30 * 60 && !(c.mode === 'drive' && c.v > 1); t++) W.run(1);
    return { sec: +(t / 30).toFixed(1), mode: c.mode, v: +c.v.toFixed(2) }; });
  rec(pod.stopped && pod.sec < 75 && hall.sec < 60, 'you in a driver\'s way (the post office doorway, where the kei van\'s driver gets back in): they get by you or give up for another time, and drive on', JSON.stringify({ pod, hall }));
  /* walking through where a van has stopped for you: you step round it, it drives on, and you get where you were going */
  const rnd = await L((W, d, T) => { W.at('2026-07-15', '14:00'); W.out(); const k = T.TLA.kei, s = T.TLP.hall + 10, P = d.player; W.go(k, s - 4.2, 0); W.putAt(s - 4.2 + k.hl + 1.2, .6, -1); W.run(30 * 2);
    const g = T.at(s - 10, .6); P.path = [[g.x, g.z]]; P.tgt = null; let t = 0, mn = 99; for (; t < 30 * 25; t++) { W.run(1); mn = Math.min(mn, W.meNear(k)); if (!P.path && Math.hypot(P.x - g.x, P.z - g.z) < 1 && k.v > 1) break; }
    return { sec: +(t / 30).toFixed(1), there: +Math.hypot(P.x - g.x, P.z - g.z).toFixed(2), v: +k.v.toFixed(2), rounds: P.rounds || 0, clear: +mn.toFixed(2) }; });
  rec(rnd.sec < 25 && rnd.clear > -0.05, 'walking along the road through where a van has stopped for you: you step round it, it drives on, and you get there', JSON.stringify(rnd));

  /* ---------- and through all of it ---------- */
  const end = await L((W, d, T) => ({ clear: T.TL.clear, youAt: W.youAt, err: T.err, over: W.over.map(({ open, ...e }) => e), maxOver: +W.maxOver.toFixed(3), solid: W.solid, maxSolid: +W.maxSolid.toFixed(3) }));
  rec(!end.over.length, 'no two vehicles ever into each other, at any frame of all of it: queued, each keeps its own length and a gap', end.over.length ? end.over.length + ' times, as deep as ' + end.maxOver + '\n    ' + end.over.slice(0, 6).map(e => JSON.stringify(e)).join('\n    ') : 'none');
  rec(!end.solid.length, 'and none ever over anything solid at the kerb (the pillar box, Diarmuid\'s case)', end.solid.length ? JSON.stringify(end.solid) : 'none');
  rec(end.clear.min > .1, 'nothing of the town\'s life ever came through you (the nearest any of it came, past its own edge)', JSON.stringify(end.clear) + (end.clear.min > .1 ? '' : '\n    the nearest vehicle: ' + JSON.stringify(end.youAt)));
  rec(!end.err, 'no errors in town life', String(end.err));
  const prog1 = await H(h => h.renderer.info.programs.length);
  rec(prog1 === prog0, 'no new shader program was made', prog0 + ' then ' + prog1);
  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

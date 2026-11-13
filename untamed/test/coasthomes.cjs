/* The coast and the homes on Earth: the tide, the boats at the jetty, the seal on its rock, the swing on the cliff tree; the
   homes' lit windows, chimney smoke and washing lines; and the greeting on a return visit.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/coasthomes.cjs --out <dir> [--mobile] [--meter]
   The tide is held high and then low: the sea rises and falls, and at low water a strip of wet sand shows. The boats' rounds
   are walked through second by second (always on the water, never a jump), one is tied up while the other is out, and both
   ride the swell. The seal comes in, hauls out on its rock, looks about and slips back in with a splash. The swing is
   reached with a click (a tap) on it, you sit and swing with the camera settled on the view, a key (a tap) stands you up,
   and E (its tag) sits you down again. Then the clock: no home is lit in the afternoon or at half three in the morning, some
   are in the evening (house by house, not all at once), and someone passes behind a curtain. Smoke comes from the homes'
   chimneys on a cold winter morning and goes with the wind, and not on a summer afternoon; the washing swings out with the
   wind and is mostly taken in when it rains. On a return visit (the browser's note of it set by hand) the three of us,
   Bríd and the line under the title all say so. And still: everyone can be walked to from the swing and the washing, nobody
   walks through anything, no new shader is made, and (with --meter) each new sound is heard and none is much louder than a
   footstep. The station's clock is stepped by hand where timing is not the point, as in earth.cjs. */
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
      put(x, z, fx, fz, pitch, zoom) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = pitch || d.cam.PITCH; d.cam.zoom = zoom || 1; P.tgt = null; P.path = null; P.speed = 0; },
      scr(v) { h.stCam.position.copy(st.camP); h.stCam.lookAt(st.camL); h.stCam.updateMatrixWorld(); const p = v.clone().project(h.stCam); return [(p.x * .5 + .5) * innerWidth, (-p.y * .5 + .5) * innerHeight, p.z]; },
      count(name) { return this.snd.filter(s => s.n === name).length; },
      sea() { return -.9 + d.coast.TD.h; },
    };
    for (const n of ['seaWash', 'putter', 'sealSplash', 'swingCreak', 'washFlap', 'creak']) { const f = h.A[n]; h.A[n] = function () { window.__C.snd.push({ n, t: h.S.t, a: [...arguments] }); return f && f.apply(this, arguments); }; }
  });
  const C = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__C, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  await H(h => { h.A.start && h.A.start(); });
  await H(h => h.ST.cr._dbg.skipCut()); await C(c => c.run(30)); await wait(400);
  const p0 = await progs();

  /* ---------- all of it is there ---------- */
  const built = await C((c, d) => { const co = d.coast.state, hm = d.homes.state, M = d.coast.M;
    return { rocks: co.rocks, boats: co.boats.length, seal: !!d.coast.SEAL.g, swing: !!M, err: d.coast.SWG.err || hm.err, homes: hm.homes.length, wins: hm.homes.map(x => x.wins), chim: hm.homes.every(x => x.chim), lines: hm.lines.length,
      bench: M ? +Math.hypot(M.seat[0] - d.cliff.F.x, M.seat[1] - d.cliff.F.z).toFixed(1) : 0, toSwing: M ? !!d.navPath(-3.2, -12, M.stand[0], M.stand[1], 1.3) : false }; });
  rec(!built.err && built.rocks >= 8 && built.boats === 2 && built.seal && built.swing, 'the coast is made: rocks in the shallows, two boats, the seal, the swing', JSON.stringify(built));
  /* (at least one: the chipper has since taken the peach house's plot, leaving the grey-blue one by the café) */
  rec(built.homes >= 1 && built.wins.every(n => n >= 3) && built.chim && built.lines >= 1, 'the homes are found, with their windows, chimneys and a washing line', JSON.stringify(built));
  rec(built.bench > 3 && built.toSwing, 'the swing is clear of the bench, and the town\'s path finder reaches it from the landing pad', JSON.stringify(built));

  /* ---------- the tide ---------- */
  const tide = await C((c, d) => { const co = d.coast, out = {};
    const wet = () => { let n = 0, sea = c.sea(), hw = -.9 + co.TD.hw; for (let x = 4; x <= 15; x += .1) for (let z = -21; z <= -12; z += .1) { const g = co.gh(x, z); if (co.beach(x, z) > .4 && g > sea + .005 && g < hw - .005) n++; } return n; };
    co.tide(1); c.run(2); out.high = { h: +co.TD.h.toFixed(3), scale: +co.TD.sea.scale.x.toFixed(5), u: +co.TIDEU.value.x.toFixed(3), wet: wet() };
    co.tide(-1); c.run(2); out.low = { h: +co.TD.h.toFixed(3), scale: +co.TD.sea.scale.x.toFixed(5), u: +co.TIDEU.value.x.toFixed(3), wet: wet() };
    /* and on its own, from the clock: a day of it rises and falls twice, about twelve hours twenty five minutes apart */
    co.tide(null); const hs = []; for (let k = 0; k < 26 * 12; k++) { d.sky.SKY.h = (k / 12) % 24; co.tdNow(); hs.push(co.TD.lv); } d.sky.set({ time: '15:00' }); co.tdNow();
    const highs = []; for (let k = 1; k < hs.length - 1; k++) if (hs[k] > hs[k - 1] && hs[k] >= hs[k + 1] && hs[k] > .9) highs.push(k / 12);
    out.highs = highs.map(v => +v.toFixed(2)); out.gap = highs.length > 1 ? +(highs[1] - highs[0]).toFixed(2) : 0; return out; });
  rec(tide.high.h > .15 && tide.low.h < -.15 && tide.high.scale > 1 && tide.low.scale < 1 && tide.high.u === tide.high.h, 'the sea rises at high tide and falls at low tide', JSON.stringify({ high: tide.high, low: tide.low }));
  rec(tide.low.wet > 300 && tide.high.wet === 0, 'at low tide a strip of wet sand is out of the water; at high tide it is covered', JSON.stringify({ low: tide.low.wet, high: tide.high.wet }));
  rec(tide.highs.length >= 2 && Math.abs(tide.gap - 12.42) < .2, 'on its own clock, a high water every twelve hours and twenty five minutes', JSON.stringify(tide));
  /* the jetty's beach from above, at low tide and at high, with a boat at the jetty and the other going out */
  await C((c, d) => { d.coast.tide(-1); d.coast.BT.clk = 420 * .55 + 24; c.put(9.4, -12.6, 12.5, -17.5, .95, 1.6); c.run(60); }); await frames(4); await shot(pre + 'ch-tide-low');
  await C((c, d) => { d.coast.tide(1); c.run(4); }); await frames(4); await shot(pre + 'ch-tide-high');
  await C((c, d) => { d.coast.tide(null); });

  /* ---------- the boats ---------- */
  const boats = await C((c, d) => { const B = d.coast.BT, o = { x: 0, z: 0, yaw: 0, st: '' }, res = [];
    for (const b of B.boats) { let bad = 0, jump = 0, minDeep = 9, px = null, pz = null, sts = new Set(); const clk0 = B.clk;
      for (let s = 0; s < B.P; s += .5) { B.clk = s; d.coast.btPose(b, o); sts.add(o.st); const g = d.coast.gh(o.x, o.z); minDeep = Math.min(minDeep, -.9 - .24 - g); if (g > -.9 - .24 - .06) bad++; if (px != null) jump = Math.max(jump, Math.hypot(o.x - px, o.z - pz) / .5); px = o.x; pz = o.z; }
      B.clk = clk0; res.push({ bad, jump: +jump.toFixed(2), deep: +minDeep.toFixed(2), sts: [...sts].join(',') }); }
    /* one in while the other is out, and then the other way round */
    B.clk = B.P * .2; c.run(3); const a = d.coast.state.boats; B.clk = B.P * .72; c.run(3); const b2 = d.coast.state.boats;
    /* riding the swell */
    let lo = 9, hi = -9; for (let k = 0; k < 40; k++) { c.run(2); const y = d.coast.state.boats[1].y; lo = Math.min(lo, y); hi = Math.max(hi, y); }
    return { res, a, b2, swell: +(hi - lo).toFixed(3), sea: +c.sea().toFixed(3) }; });
  rec(boats.res.every(r => r.bad === 0 && r.deep > .03 && r.jump < 2.6 && /fish/.test(r.sts) && /in/.test(r.sts)), 'each boat goes all the way round on the water, even at low tide, smoothly, out to fish and back', JSON.stringify(boats.res));
  rec(boats.a[0].st === 'in' && boats.a[0].berth < .05 && boats.a[1].st !== 'in' && boats.a[1].berth > 3.5 && boats.b2[1].st === 'in' && boats.b2[0].st !== 'in', 'one boat is tied up at the jetty while the other is out, and then the other way round', JSON.stringify({ a: boats.a, b: boats.b2 }));
  rec(boats.swell > .015 && boats.a.every(b => Math.abs(b.y - boats.sea) < .12), 'they sit on the water and ride the swell', JSON.stringify({ swell: boats.swell, sea: boats.sea, y: boats.a.map(b => b.y) }));
  /* a boat going out past you on the jetty: its engine putters */
  const put0 = await C((c, d) => { const B = d.coast.BT; B.clk = B.P * .55; c.put(12.3, -17.4, 13, -18.6); const n0 = c.count('putter'); c.run(30 * 12); return { n: c.count('putter') - n0 }; });
  rec(put0.n >= 3, 'a boat going out by you on the jetty putters as it goes', JSON.stringify(put0));
  /* (at the foot of the jetty's beach: the lowest ground you can walk on there) */
  const wash = await C((c, d) => { let lo = null; for (let x = 7; x <= 10.5; x += .2) for (let z = -16; z <= -13.5; z += .2) if (d.life.walkable(x, z) && !d.OBS.some(o => Math.hypot(x - o.x, z - o.z) < o.r + .3) && (!lo || d.coast.gh(x, z) < lo[2])) lo = [x, z, d.coast.gh(x, z)]; c.put(lo[0], lo[1], 11, -15.6); const n0 = c.count('seaWash'); c.run(30 * 12); return { n: c.count('seaWash') - n0, d: d.coast.state.waveD }; });
  rec(wash.n >= 2 && wash.d < 3, 'by the water the waves wash up the sand now and then', JSON.stringify(wash));

  /* ---------- the seal ---------- */
  const seal = await C((c, d) => { const S_ = d.coast.SEAL, R0 = d.coast.SEALR; c.put(16.6, -6.7, 20, -8.2); d.coast.sealGo('swim'); const sw = c.until(d => d.coast.SEAL.st === 'haul', 30 * 12); const swimY = S_.y - c.sea();
    const up = c.until(d => d.coast.SEAL.st === 'lie', 30 * 4); const onRock = { d: +Math.hypot(S_.x - R0[0], S_.z - R0[1]).toFixed(2), y: +(S_.y - c.sea()).toFixed(2) };
    let lo = 9, hi = -9; for (let k = 0; k < 30 * 8; k++) { c.run(1); lo = Math.min(lo, S_.hy); hi = Math.max(hi, S_.hy); }
    return { sw: sw.done, swimY: +swimY.toFixed(2), up: up.done, onRock, look: +(hi - lo).toFixed(2), vis: S_.g.visible }; });
  rec(seal.sw && seal.swimY < 0 && seal.up && seal.onRock.d < .1 && seal.onRock.y > .2 && seal.vis, 'the seal swims in and hauls itself out onto its rock', JSON.stringify(seal));
  rec(seal.look > .4, 'lying there, it looks about', JSON.stringify(seal));
  await C((c, d) => { c.put(16.9, -6.9, 16.13, -6.25); c.run(4); d.cliff.sit(); c.run(200); }); await frames(4); await shot(pre + 'ch-seal');
  const slip = await C((c, d) => { const S_ = d.coast.SEAL, n0 = S_.splashes, s0 = c.count('sealSplash'); S_.lie = S_.t; const a = c.until(d => d.coast.SEAL.st === 'away', 30 * 4); const b = c.until(d => d.coast.SEAL.st === 'gone', 30 * 10);
    const r = { away: a.done, gone: b.done, splashes: S_.splashes - n0, sound: c.count('sealSplash') - s0, vis: S_.g.visible }; d.cliff.stand(); c.run(40); return r; });
  rec(slip.away && slip.gone && slip.splashes === 1 && slip.sound === 1 && !slip.vis, 'it slips back into the water with a splash, swims off and is gone', JSON.stringify(slip));

  /* ---------- the swing ---------- */
  const from = await C((c, d) => { const M = d.coast.M; const [sx, sz] = M.stand, f = [M.dir.x, M.dir.z]; let best = null;
    for (const r of [3.6, 4, 3.2, 4.5]) for (let a = 0; a < 16 && !best; a++) { const t = Math.PI * (.6 + .8 * a / 16), x = sx + (Math.cos(t) * f[0] - Math.sin(t) * f[1]) * r, z = sz + (Math.sin(t) * f[0] + Math.cos(t) * f[1]) * r;
      if (d.OBS.some(o => Math.hypot(x - o.x, z - o.z) < o.r + .45) || !d.life.walkable(x, z) || !d.navPath(x, z, sx, sz, 1.3)) continue; best = [x, z]; } return best; });
  rec(!!from, 'there is open ground near the swing to set out from', JSON.stringify(from));
  if (from) {   // (the rest of the swing's checks need somewhere to set out from)
  await C((c, d, h, p) => { const M = d.coast.M; c.put(p[0], p[1], M.seat[0], M.seat[1]); d.began(); c.run(50); }, from);
  await frames(3);
  const tag = await page.evaluate(() => { const e = [...document.querySelectorAll('#crLabels .crl')].find(x => x.textContent === 'Swing'); return e ? { on: e.classList.contains('on'), pe: getComputedStyle(e).pointerEvents } : null; });
  rec(tag && tag.on && tag.pe !== 'none', 'near it, a tag over the swing says Swing', JSON.stringify(tag));
  const sxy = await C((c, d) => { const M = d.coast.M; return c.scr(M.seatW.clone().addScaledVector(M.up, .25)); });
  rec(sxy[2] < 1 && sxy[0] > 0 && sxy[0] < vp.width && sxy[1] > 0 && sxy[1] < vp.height, 'the swing is on the screen', JSON.stringify(sxy.map(v => +v.toFixed(1))));
  await tap(sxy[0], sxy[1]); await C(c => c.run(1));
  const go = await C((c, d) => d.coast.SWG.st);
  rec(go === 'go' || go === 'sit', (mobile ? 'a tap' : 'a click') + ' on the swing sets you walking over', go);
  const walk = await C(c => { const n0 = c.count('swingCreak'); const w = c.until(d => d.coast.SWG.st === 'sat', 30 * 30, true); c.run(30 * 8); return { ...w, creaks: c.count('swingCreak') - n0 }; });
  rec(walk.done && walk.bad === 0, 'you get there and sit on it, without walking through anything', JSON.stringify(walk));
  const sw = await C((c, d, h) => { const s = d.coast.state.swing, st = h.ST.cr, M = d.coast.M;
    let lo = 9, hi = -9; for (let k = 0; k < 90; k++) { c.run(1); lo = Math.min(lo, d.coast.SWG.phi); hi = Math.max(hi, d.coast.SWG.phi); }
    /* how much of the picture is open sea: rays through a grid over the screen, where each meets the water's surface */
    const cam = h.stCam; cam.position.copy(st.camP); cam.lookAt(st.camL); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); const rs = 24 + c.sea(), ray = new THREE.Raycaster(), ball = new THREE.Sphere(new THREE.Vector3(), rs), hp = new THREE.Vector3(); let sea = 0, n = 0;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { ray.setFromCamera(new THREE.Vector2(-.9 + i * .225, -.9 + j * .225), cam); n++; if (!ray.ray.intersectSphere(ball, hp)) continue; const [x, z] = d.loc(hp.clone().normalize()); if (d.coast.gh(x, z) < c.sea() - .05) sea++; }
    /* nothing stands between the camera and you on the swing (the swing itself aside), but leaves and the like, which are cut
       away round you as for the walking camera: it is set to cut toward you */
    const cp = st.camP, you = d.coast.M.seatW.clone().addScaledVector(M.up, .7), dir = you.clone().sub(cp), L = dir.length(), rc = new THREE.Raycaster(cp, dir.normalize(), .3, L - .5); rc.layers.set(0);
    const hit = rc.intersectObjects(st.scene.children, true).find(x => { let o = x.object; while (o) { if (o === M.g || (o.userData && o.userData.legs)) return false; o = o.parent; } const u = x.object.material && x.object.material.uniforms; return x.object.visible && !x.object.isPoints && !(u && u.uCut && u.uCut.value > .5); });
    const cut = +d.LU.uPly.value.distanceTo(window.__heloria.ST.cr._dbg.player ? d.coast.M.seatW.clone().addScaledVector(M.up, .65) : you).toFixed(2);
    return { ws: s.ws, amp: s.amp, range: +(hi - lo).toFixed(2), sea: +(sea / n).toFixed(2), seen: hit ? +hit.distance.toFixed(2) + ' ' + (hit.object.type) : null, cut, pj: d.PJ.id }; });
  rec(sw.ws > .97 && sw.amp > .3 && sw.range > .5, 'sitting, the camera settles and the swing swings', JSON.stringify(sw));
  rec(sw.sea > .15 && sw.seen === null && sw.cut < 1.2, 'the view has the sea below, and nothing stands between it and you (leaves are cut away round you)', JSON.stringify(sw));
  rec(walk.creaks >= 2, 'the ropes creak on the bough as it swings', JSON.stringify(walk));
  await frames(4); await shot(pre + 'ch-swing');
  /* anything stands you up, and the camera comes back; E (or the tag) sits you down again; a click (a tap) only stands you up */
  if (mobile) await tap(vp.width * .5, vp.height * .45); else await page.keyboard.press('KeyD');
  const up1 = await C((c, d) => d.coast.SWG.st); await C(c => c.run(90));
  const back = await C((c, d, h) => { const st = h.ST.cr, P = d.player, head = P.u.clone().multiplyScalar(24 + P.h + 1.15); return { st: d.coast.SWG.st, ws: +d.coast.SWG.ws.toFixed(3), cam: +st.camP.distanceTo(head).toFixed(2) }; });
  rec(up1 === 'up' && back.st === 'idle' && back.ws < .05 && back.cam < 8, (mobile ? 'a tap' : 'a key') + ' stands you up and gives the camera back', JSON.stringify({ up1, ...back }));
  if (mobile) { await C(c => c.run(60)); await frames(4); let t = null;
    for (let k = 0; k < 3 && !(await C((c, d) => d.coast.SWG.st !== 'idle')); k++) { t = await page.evaluate(() => { const e = [...document.querySelectorAll('#crLabels > span.crl')].find(x => x.textContent === 'Swing'), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
      return e.classList.contains('on') && (top === e || e.contains(top)) ? [x, y] : null; }); if (t) await page.touchscreen.tap(t[0], t[1]); await wait(150); }
    rec(!!t, 'the Swing tag is there to tap, on top'); }
  else await page.keyboard.press('KeyE');
  const s2 = await C(c => c.until(d => d.coast.SWG.st === 'sat', 150));
  rec(s2.done, (mobile ? 'tapping the Swing tag' : 'E beside the swing') + ' sits you down again', JSON.stringify(s2));
  await tap(vp.width * .5, vp.height * .3); await C(c => c.run(60));
  const s3 = await C((c, d) => ({ st: d.coast.SWG.st, path: !!d.player.path, goal: !!d.talk().goal }));
  rec(s3.st === 'idle' && !s3.path && !s3.goal, (mobile ? 'a tap' : 'a click') + ' stands you up, and only that', JSON.stringify(s3));

  }
  /* ---------- everyone can still be walked to, from the swing and from the washing line ---------- */
  const navs = await C((c, d) => { const out = []; const L = d.homes.state.lines[0], M = d.coast.M; let w = null;
    for (const r of [1.2, 1.6, 2, 2.5, 3]) for (let a = 0; a < 16 && !w; a++) { const x = L.x + Math.cos(a / 16 * 6.283) * r, z = L.z + Math.sin(a / 16 * 6.283) * r; if (d.life.walkable(x, z) && !d.OBS.some(o => Math.hypot(x - o.x, z - o.z) < o.r + .4) && d.navPath(-3.2, -12, x, z, 1.6)) w = [x, z]; }
    for (const [fx, fz] of [M.stand, w]) for (let i = 0; i < 3; i++) { const p = d.people[i]; d.closeTalk(); d.MET.clear(); d.people.forEach(q => { q.greeted = false; q.resume = 0; }); c.put(fx, fz, p.x, p.z); c.run(2);
      d.goTalk(p); const u = c.until(d => !!d.talk().p, 30 * 40, true); const T = d.talk(); out.push({ who: p.first, done: u.done && T.p === p, bad: u.bad, frames: u.frames }); d.closeTalk(); c.run(10); }
    return out; });
  rec(navs.every(n => n.done && n.bad === 0), 'from the swing and from the washing line, each of us can be walked to, round whatever is in the way', JSON.stringify(navs));

  /* ---------- the homes' windows, by the clock ---------- */
  const lit = await C((c, d) => { const S = d.homes, lit = () => S.HM.wins.filter(w => w.k > .4).length, out = {};
    d.sky.set({ time: '14:00' }); c.run(30); out.day = lit(); d.sky.set({ time: '22:15' }); c.run(60); out.eve = lit(); d.sky.set({ time: '03:30' }); c.run(60); out.night = lit();
    /* each house's evening: when its first light comes on and its last goes off (every quarter of an hour, 16:00 to 01:00) */
    const SK = d.sky.SKY, h0 = SK.h; out.houses = S.HM.homes.map(H => { let on = null, off = null; for (let q = 0; q <= 36; q++) { SK.h = (16 + q / 4) % 24; const any = H.wins.some(w => S.hmWant(w)); if (any && on == null) on = 16 + q / 4; if (any) off = 16 + q / 4; } return [on, off]; });
    out.changes = 0; let prev = null; for (let q = 0; q <= 36; q++) { SK.h = (16 + q / 4) % 24; const s = S.HM.wins.map(w => S.hmWant(w) ? 1 : 0).join(''); if (prev != null && s !== prev) out.changes++; prev = s; } SK.h = h0; return out; });
  /* (one home since the chipper took the peach house: at least one lit window in its evening) */
  rec(lit.day === 0 && lit.eve >= 1 && lit.night === 0, 'no home is lit in the afternoon or in the small hours; in the evening some are', JSON.stringify(lit));
  rec(lit.changes >= 6 && lit.houses.every(x => x[0] != null) && (lit.houses.length < 2 || lit.houses[0][0] !== lit.houses[1][0] || lit.houses[0][1] !== lit.houses[1][1]), 'through the evening the lights go on and off room by room, house by house', JSON.stringify(lit));
  const sil = await C((c, d) => { d.sky.set({ time: '22:15' }); c.run(30); const w = d.homes.HM.wins.find(w => w.k > .4 && (w.role === 'living' || w.role === 'kitchen')); if (!w) return null; w.sil = -9; w.silT = 0; w.silP = -1; c.run(40);
    const i = d.homes.HM.wins.indexOf(w), u = d.LU.uHX.value[i].w, k = d.LU.uHW.value[i].w; return { sil: +w.sil.toFixed(2), u: +u.toFixed(2), k: +k.toFixed(2), home: w.home.i }; });
  rec(sil && Math.abs(sil.sil) < 1.6 && sil.u === sil.sil && sil.k > .4, 'now and then someone passes behind the curtains of a lit window', JSON.stringify(sil));
  await C((c, d, h, s) => { const H = d.homes.HM.homes[s ? s.home : 1]; const yaw = Math.atan2(-H.x, -H.z), fx = Math.sin(yaw), fz = Math.cos(yaw); c.put(H.x + fx * 4.4, H.z + fz * 4.4, H.x, H.z, .3, .9); const w = d.homes.HM.wins.find(w => w.home === H && w.k > .4 && (w.role === 'living' || w.role === 'kitchen')); if (w) { w.sil = -9; w.silT = 0; w.silP = .5; } c.run(50); }, sil);
  await frames(2); await shot(pre + 'ch-night');

  /* ---------- smoke and washing, with the wind ---------- */
  const smoke = await C((c, d) => { const S = d.homes, out = {};
    d.sky.set({ time: '15:00', date: '07-15' }); d.life.set({ temp: 20, wind: .5 }); c.run(30 * 8); let n0 = S.HM.puffs; c.run(30 * 5); out.summer = { puffs: S.HM.puffs - n0, fire: S.HM.homes.map(H => +H.fire.toFixed(2)) };
    d.sky.set({ time: '08:10', date: '01-15' }); d.life.set({ temp: 2, wind: .7 }); c.run(30 * 8); n0 = S.HM.puffs; c.run(30 * 5); out.winter = { puffs: S.HM.puffs - n0, fire: S.HM.homes.map(H => +H.fire.toFixed(2)) };
    const W = d.life.WIND.v, tan = (v, p) => v.clone().addScaledVector(p.clone().normalize(), -v.dot(p.clone().normalize())).normalize(), chims = S.HM.homes.map(H => H.chim).filter(Boolean);
    out.drift = d.life.PF.p.filter(q => q.t < q.life && q.c < .5 && q.t > 1.5).map(q => { const ch = chims.reduce((b, x) => x.p.distanceTo(q.p) < b.p.distanceTo(q.p) ? x : b, chims[0]); return ch.p.distanceTo(q.p) < 4 ? +tan(q.p.clone().sub(ch.p), ch.p).dot(tan(W, ch.p)).toFixed(2) : null; }).filter(v => v != null).slice(0, 10);
    return out; });
  rec(smoke.summer.puffs === 0 && smoke.winter.puffs >= 8 && smoke.winter.fire.every(f => f > .5), 'the homes\' fires smoke on a cold winter morning, and not on a summer afternoon', JSON.stringify({ summer: smoke.summer, winter: smoke.winter }));
  rec(smoke.drift.length >= 3 && smoke.drift.filter(v => v > .5).length >= smoke.drift.length * .8, 'the smoke goes off the way the wind blows', JSON.stringify(smoke.drift));
  const wsh = await C((c, d) => { const S = d.homes, L = S.HM.lines[0], P = S.HM.P, wind = (s) => { d.life.set({ wind: s }); c.run(30 * 4); };
    const off = () => { let sum = 0, n = 0; const W = d.life.slWindAt ? null : d.life.WIND.v; for (const it of L.items) { if (it.k < .5) continue; for (let i = 0; i <= 4; i++) { const k = (it.b + 3 * 5 + i) * 3, top = L.a3.clone().lerp(L.b3, it.u0 + (it.u1 - it.u0) * i / 4); const v = new THREE.Vector3(P[k], P[k + 1], P[k + 2]).sub(top); sum += v.dot(L.n); n++; } } return n ? sum / n : 0; };
    let w = null; for (const r of [1.2, 1.6, 2, 2.5, 3]) for (let a = 0; a < 16 && !w; a++) { const x = L.x + Math.cos(a / 16 * 6.283) * r, z = L.z + Math.sin(a / 16 * 6.283) * r; if (d.life.walkable(x, z) && !d.OBS.some(o => Math.hypot(x - o.x, z - o.z) < o.r + .4)) w = [x, z]; }
    c.put(w[0], w[1], L.x, L.z); const wn = d.life.WIND.v.clone(), sgn = Math.sign(wn.clone().addScaledVector(L.up, -wn.dot(L.up)).dot(L.n)) || 1;
    wind(.9); const strong = off() * sgn, leanS = Math.abs(L.lean); wind(.05); const calm = off() * sgn, leanC = Math.abs(L.lean);
    const n0 = c.count('washFlap'); wind(.8); c.run(30 * 8); const flaps = c.count('washFlap') - n0; wind(.8);
    const wp = d.life.WIND.v.clone().addScaledVector(L.up, -d.life.WIND.v.dot(L.up)).dot(L.n);
    return { strong: +strong.toFixed(3), calm: +calm.toFixed(3), leanS: +leanS.toFixed(2), leanC: +leanC.toFixed(2), wp: +wp.toFixed(2), flaps }; });
  rec(wsh.strong > .04 && wsh.strong > wsh.calm + .03 && wsh.leanS > wsh.leanC,   // (how far it swings out depends on how square the day's wind meets the line)
  'the washing swings out the way the wind blows, more the harder it blows', JSON.stringify(wsh));
  rec(wsh.flaps >= 1, 'near it, the wind flaps it', JSON.stringify(wsh));
  /* (from the side of the line, a few steps off, so it is across the picture with the house and its chimney behind) */
  await C((c, d) => { const L = d.homes.HM.lines[0], n = L.n, mid = d.loc(L.mid.clone().normalize()); let p = null;
    for (const r of [3, 3.5, 2.6, 4]) for (const sg of [1, -1]) { if (p) break; const q = d.loc(L.mid.clone().addScaledVector(n, sg * r).normalize()); if (d.life.walkable(q[0], q[1]) && !d.OBS.some(o => Math.hypot(q[0] - o.x, q[1] - o.z) < o.r + .4)) p = q; }
    if (p) c.put(p[0], p[1], mid[0], mid[1], .3, 1.1); c.run(90); });
  await frames(4); await shot(pre + 'ch-washing-smoke');
  /* (the shaders counted before the rain: rain itself, not this, may make one the first time it falls) */
  const p1 = await progs();
  rec(p1 === p0, 'none of it makes a new shader', JSON.stringify({ before: p0, after: p1 }));
  const rain = await C((c, d) => { const L = d.homes.HM.lines[0], WX = d.sky.WX; WX.rain = 1; WX.kind = 'rain'; WX.t = 0; WX.stop = 600; c.run(30 * 4); const wet = L.items.filter(it => it.k > .5).length;
    d.sky.set({ weather: 'clear' }); WX.rain = 0; c.run(30 * 3); return { wet, n: L.items.length, after: L.items.filter(it => it.k > .5).length }; });
  rec(rain.wet <= 1 && rain.after === rain.n, 'in the rain most of the washing is taken in, and put out again after', JSON.stringify(rain));

  /* ---------- welcome back ---------- */
  const first = await C((c, d) => ({ back: d.homes.WB.back, line: d.people[0].lines[0], store: (() => { try { return JSON.parse(localStorage.getItem('heloria.earth.visits')); } catch (e) { return null; } })() }));
  rec(!first.back && first.line === 'Oh, hello! Welcome to Earth.' && first.store && first.store.n === 1, 'a first visit: hello as always, and the visit noted in the browser', JSON.stringify(first));
  const again = await C((c, d) => { localStorage.setItem('heloria.earth.visits', JSON.stringify({ n: 3, t: Date.now() - 2 * 864e5, b: false })); d.homes.wbRead(true); d.MET.clear(); d.marksEnter(); d.homes.wbSigns();
    const lines = d.people.map(p => p.lines[0]), brid = d.homes.greet(); d.closeTalk(); const lede = document.querySelector('#crLede').textContent, gid = d.regs.REGS[0].L0[0];
    d.homes.wbRead(true); const reload = d.homes.WB.back; return { back: d.homes.WB.back, lines, brid, lede, gid, reload, store: JSON.parse(localStorage.getItem('heloria.earth.visits')) }; });
  log('RETURN LINES ' + JSON.stringify({ lines: again.lines, brid: again.brid, gideon: again.gid, lede: again.lede }));
  rec(again.back && /back/i.test(again.lines[0]) && /came back/i.test(again.lines[1]) && /back/i.test(again.lines[2]), 'on a return visit Ahroon, Michael and Abraham each say so first', JSON.stringify(again.lines));
  rec(/You're back!/.test(again.brid) && /Welcome back/.test(again.lede) && /back/i.test(again.gid), 'and the town remembers: Bríd, Gideon and the line under the title', JSON.stringify({ brid: again.brid, lede: again.lede, gid: again.gid }));
  rec(again.reload && again.store.n === 4 && again.store.b === true, 'the visit is counted once, and a reload keeps the greeting', JSON.stringify(again.store));
  await C((c, d) => { d.sky.set({ time: '15:00', date: '07-15' }); d.life.set({ temp: null, wind: null }); const a = d.people[0]; c.put(-3.2, -12, a.x, a.z); c.run(4); d.openTalk(a, 0); d.nextTalk(); c.run(40); });
  await frames(4); await shot(pre + 'ch-welcome-back'); await C((c, d) => { d.closeTalk(); c.run(4); });

  /* ---------- the sounds ---------- */
  rec(await C(c => ['seaWash', 'putter', 'sealSplash', 'swingCreak', 'washFlap'].every(n => c.count(n) > 0)), 'each new sound was made along the way', JSON.stringify(await C(c => Object.fromEntries(['seaWash', 'putter', 'sealSplash', 'swingCreak', 'washFlap'].map(n => [n, c.count(n)])))));
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 1400) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(400); return +pk.toFixed(4); };
    await H(h => { h.A.music(0); }); await wait(1500);
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['step(0) again', h => h.A.step(0)], ['step(1) again', h => h.A.step(1)], ['seaWash', h => h.A.seaWash()], ['putter', h => h.A.putter()], ['sealSplash', h => h.A.sealSplash()],
      ['swingCreak', h => h.A.swingCreak()], ['swingCreak(hi)', h => h.A.swingCreak(.03, 0, true)], ['washFlap', h => h.A.washFlap(.03, 0, 1)]]) lv[n] = await listen(f);
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)'], lv['step(0) again'], lv['step(1) again']);
    const mine = ['seaWash', 'putter', 'sealSplash', 'swingCreak', 'swingCreak(hi)', 'washFlap'];
    rec(step > 0 && mine.every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'each new sound is heard, and none is much louder than a footstep', JSON.stringify(lv));
  }

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

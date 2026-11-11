/* Flying into the black hole on the thruster alone, and where the fall begins. Run with the rocket's way in:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/hole --scenario untamed/test/fly-hole.cjs --hash aetos [--mobile]
   1. Before any station: the probe is put 8 units out, pointed at the hole, and holds the thruster. The seal must hold.
   2. Docked at Aetos and back out: in the moment the seal strains but has not broken, the probe is put inside the shadow.
      It must not fall until the seal has broken.
   3. The seal broken: the probe starts 10 units out and holds the thruster pointed at the hole, from rest, from orbit (so it
      drifts sideways), pointed 8 degrees off, and pointed 8 and 12 degrees off with no help from the view turning toward the
      hole. Each run reports when the probe first looks inside the black disc, where the fall begins, and how long it looked
      inside without falling. HOLE_RUNS=1,5 runs only some of them.
   4. A still frame: the black disc is measured on the screen and set against the size the tracer gives it.
   "Looks inside" means the probe's centre, seen from the camera, is within the shadow's angular radius: sin a = b/d *
   sqrt(1 - rs/d), b = 2.6 rs, the edge of the dark disc a ray-traced Schwarzschild hole shows. Times are simulated seconds. */
module.exports = async ({ page, H, log, wait, shot, mobile }) => {
  const until = async (fn, ms = 120000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await H(fn, arg)) return true; await wait(200); } return false; };
  let fails = 0; const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  (' + JSON.stringify(x) + ')' : '')); if (!c) fails++; };
  await require('./begin.cjs')(page);
  await until(h => ['story', 'tohub', 'hub'].includes(h.S.mode), 60000);
  if (await H(h => h.S.mode === 'story')) await H(h => h.toHub(true));
  ok(await until(h => h.S.mode === 'hub', 90000), 'in orbit');

  // in the page: what the camera sees of the probe and the hole, a run recorder, and the thruster
  await H((h, mobile) => {
    const T = window.THREE, S = h.S, c = h.renderer.domElement, v1 = new T.Vector3(), v2 = new T.Vector3();
    window.__see = () => {
      const cam = h.hubCam, P = S.probe.p, RS = h.BH.RS, C = cam.position;
      const dH = C.length(), dx = P.x - C.x, dy = P.y - C.y, dz = P.z - C.z, dP = Math.hypot(dx, dy, dz);
      const th = Math.acos(Math.min(1, (-C.x * dx - C.y * dy - C.z * dz) / (dH * dP))), u = dH / RS;
      const al = Math.asin(Math.min(1, 2.598076 / u * Math.sqrt(Math.max(0, 1 - 1 / u))));
      const f = innerHeight / 2 / Math.tan(cam.fov * Math.PI / 360);
      v1.set(0, 0, 0).project(cam); v2.copy(P).project(cam);
      return { r: Math.hypot(P.x, P.z), th, al, inside: th < al, behind: dP > dH, discPx: f * Math.tan(al), sepPx: Math.hypot((v2.x - v1.x) * innerWidth / 2, (v2.y - v1.y) * innerHeight / 2),
        cx: (v1.x * .5 + .5) * innerWidth, cy: (-v1.y * .5 + .5) * innerHeight, checkPx: f * Math.tan(Math.asin(Math.min(1, 1.35 / dH))) };
    };
    window.__press = on => {
      if (!mobile) { window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: 'KeyW', bubbles: true })); return; }
      const X = innerWidth / 2, Y = innerHeight * .75, ev = (t, x, y) => new PointerEvent(t, { pointerId: 62, pointerType: 'touch', clientX: x, clientY: y, bubbles: true });
      if (on) { c.dispatchEvent(ev('pointerdown', X, Y)); window.dispatchEvent(ev('pointermove', X, Y - 55)); } else window.dispatchEvent(ev('pointerup', X, Y - 55));
    };
    /* one run: hold the probe still at r0 (pointed at the hole, off by `off` degrees) while the camera settles, then let it go
       with the thruster held, and record every frame until it falls or the time is up */
    window.__runHole = cfg => {
      const P = S.probe, a = cfg.a, p0 = new T.Vector3(Math.cos(a) * cfg.r0, 0, Math.sin(a) * cfg.r0), v0 = new T.Vector3();
      if (cfg.orbit) { const vc = Math.sqrt(60 / cfg.r0); v0.set(-Math.sin(a) * vc, 0, Math.cos(a) * vc); }
      const yaw0 = Math.atan2(p0.x, p0.z) + (cfg.off || 0) * Math.PI / 180;
      const run = window.__hr = { s: [], phase: 'settle', t0: S.t, done: false, cfg };
      S.ap = null; S.lookT = -9;
      const f = () => {
        if (run.phase === 'settle') { P.p.copy(p0); P.v.copy(v0); S.yaw = yaw0; if (cfg.noAssist) S.lookT = S.t;
          if (S.t - run.t0 > 1.4) { run.phase = 'fly'; run.tf = S.t; window.__press(true); } requestAnimationFrame(f); return; }
        if (cfg.noAssist) S.lookT = S.t;   // as if the view had just been turned by hand: no help toward any goal
        const m = S.mode, e = window.__see();
        run.s.push({ t: +(S.t - run.tf).toFixed(3), m, sealK: S.sealK, ...e });
        if (m === 'hub' && S.t - run.tf < cfg.limit) requestAnimationFrame(f); else { window.__press(false); run.done = true; }
      };
      requestAnimationFrame(f);
    };
  }, mobile);
  const doRun = async cfg => { await H((h, cfg) => window.__runHole(cfg), cfg); await until(() => window.__hr.done, 900000); return page.evaluate(() => window.__hr.s); };
  const deg = x => +(x * 180 / Math.PI).toFixed(2);
  const sumUp = (name, s) => {
    const fell = s.length && s[s.length - 1].m === 'falling';
    const hubS = s.filter(x => x.m === 'hub'), last = hubS[hubS.length - 1] || {}, fall = fell ? s[s.length - 1] : null;
    const first = hubS.find(x => x.inside);
    // over the black itself: inside the disc and either behind the hole (hidden in it) or in front inside the disk's inner
    // edge, 3 rs (in front and further out the probe is over the bright disk, which crosses the lower half of the disc)
    const black = x => x.inside && (x.behind || x.r < 3 * .55), firstB = hubS.find(black);
    let insideT = 0, blackT = 0; for (let i = 1; i < hubS.length; i++) { const dt = hubS[i].t - hubS[i - 1].t; if (hubS[i].inside) insideT += dt; if (black(hubS[i])) blackT += dt; }
    const res = { run: name, fell, fallAtS: fell ? fall.t : null, rAtFall: fell ? +fall.r.toFixed(2) : null, rsAtFall: fell ? +(fall.r / .55).toFixed(2) : null,
      // the last frame the visitor saw before the fall: where the probe was against the black disc
      lastSeen: last.r ? { r: +last.r.toFixed(2), probeFromCentreDeg: deg(last.th), discRadiusDeg: deg(last.al), probeFromCentrePx: Math.round(last.sepPx), discRadiusPx: Math.round(last.discPx), oldCheckRadiusPx: Math.round(last.checkPx), behindHole: last.behind } : null,
      firstLooksInside: first ? { t: first.t, r: +first.r.toFixed(2), discRadiusPx: Math.round(first.discPx) } : null,
      looksInsideWithoutFallingS: +insideT.toFixed(2), firstOverBlack: firstB ? { t: firstB.t, r: +firstB.r.toFixed(2), behindHole: firstB.behind } : null, overBlackWithoutFallingS: +blackT.toFixed(2), closestR: +Math.min(...s.map(x => x.r)).toFixed(2), frames: s.length };
    log('HOLE', JSON.stringify(res)); return res;
  };
  const backToOrbit = async () => {   // after a fall: off Earth, back in orbit, and the contact calling again as it was
    if (!(await until(h => h.S.mode === 'station' && h.S.stId === 'cr', 120000))) return false;
    await wait(1500); await H(h => h.leaveEarth());
    const back = await until(h => h.S.mode === 'hub', 120000);
    await H(h => { h.S.been = false; h.S.push = true; }); await wait(800); return back;
  };
  const results = [];

  const quick = !!process.env.HOLE_QUICK;   // HOLE_QUICK=1: only the seal breaking and the runs, no sealed check and no still
  /* 1. sealed: no station visited yet */
  if (!quick) { const ae = await H(h => h.STA.find(s => s.id === 'ae').a);
    const s = await doRun({ r0: 8, a: ae + Math.PI, limit: 6, noAssist: true });
    const fell = s.some(x => x.m === 'falling');
    ok(!fell, 'sealed before any station: holding the thruster at the hole does not take you in', { closestR: +Math.min(...s.map(x => x.r)).toFixed(2) });
    if (fell) await backToOrbit(); }

  /* 2. dock at Aetos and come out: the seal strains, then breaks. Put the probe inside the shadow in the moment before it breaks */
  await H(h => h.dock('ae'));
  ok(await until(h => h.S.mode === 'station', 120000), 'docked at Aetos');
  await wait(2500); await H(h => h.undock());
  await H(h => { const S = h.S, w = window.__crack = { s: [], done: false };
    const f = () => {
      if (S.mode === 'hub' && h.SB.t >= 0 && !w.on) { w.on = true; S.probe.p.set(1.1, 0, 0); S.probe.v.set(0, 0, 0); }
      if (w.on) w.s.push({ m: S.mode, sealK: S.sealK, r: Math.hypot(S.probe.p.x, S.probe.p.z) });
      if (w.on && (S.mode !== 'hub' || (S.sealK < 1 && w.s.filter(x => x.sealK < 1).length > 30))) { w.done = true; return; }
      requestAnimationFrame(f); };
    requestAnimationFrame(f); });
  await until(() => window.__crack.done, 300000);
  { const s = await page.evaluate(() => window.__crack.s), early = s.some(x => x.m === 'falling' && x.sealK >= 1), fellAfter = s.some(x => x.m === 'falling' && x.sealK < 1);
    ok(!early, 'docked but the seal not yet broken: inside the shadow, no fall', { framesBeforeCrack: s.filter(x => x.sealK >= 1).length, fellBeforeCrack: early, fellOnceBroken: fellAfter });
    if (s.some(x => x.m === 'falling')) await backToOrbit(); }
  ok(await until(h => h.S.sealK === 0 && h.SB.t < 0 && h.S.mode === 'hub', 300000), 'the seal has broken');
  await H(h => { h.S.been = false; h.S.push = true; });

  /* 3. the seal broken: fly at the hole */
  const runs = [['straight at it, from rest', { r0: 10, a: .9, limit: 15 }], ['straight at it, out of orbit (drifting sideways)', { r0: 10, a: .9, orbit: true, limit: 15 }],
    ['pointed 8 degrees off, from rest', { r0: 10, a: .9, off: 8, limit: 15 }], ['pointed 8 degrees off, no help toward the hole', { r0: 10, a: .9, off: 8, limit: 15, noAssist: true }],
    ['pointed 12 degrees off, no help toward the hole', { r0: 10, a: .9, off: 12, limit: 15, noAssist: true }]];
  const pick = (process.env.HOLE_RUNS || '').split(',').filter(Boolean).map(Number);   // HOLE_RUNS=1,5: only those runs
  for (const [name, cfg] of runs.filter((x, i) => !pick.length || pick.includes(i + 1))) {
    const s = await doRun(cfg); const r = sumUp(name, s); results.push(r);
    if (r.fell) { await wait(1200); if (results.length === 1) await shot((mobile ? 'm-' : '') + 'hole-falling'); if (!(await backToOrbit())) { log('could not get back to orbit'); break; } }
    else await wait(800);
  }

  /* 4. a still: the probe held 6 units out, in front of the hole; the black disc measured on the screen */
  let st = null;
  if (!quick) { await H(h => { const S = h.S, P = S.probe, w = window.__still = { n: 0, done: false };
    const p0 = new THREE.Vector3(Math.cos(.9) * 6, 0, Math.sin(.9) * 6);
    const f = () => { P.p.copy(p0); P.v.set(0, 0, 0); S.yaw = Math.atan2(p0.x, p0.z); S.lookT = S.t; w.n++;
      if (w.n > 40) {   // read the frame just drawn: scan out from the hole's centre until the black ends
        const e = window.__see(), c = h.renderer.domElement, k = c.width / innerWidth, cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height;
        const g = cv.getContext('2d'); g.drawImage(c, 0, 0); const img = g.getImageData(0, 0, cv.width, cv.height).data;
        const lum = (x, y) => { x = Math.round(x * k); y = Math.round(y * k); if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return 999; const i = (y * cv.width + x) * 4; return .2126 * img[i] + .7152 * img[i + 1] + .0722 * img[i + 2]; };
        const scan = (dx, dy) => { for (let d = 1; d < 600; d++) if (lum(e.cx + dx * d, e.cy + dy * d) > 40) return d; return -1; };
        // where the near edge of the disk's hole (its inner edge, 3 rs, on the side toward the camera) lands below the centre
        const C = h.hubCam.position, cl = Math.hypot(C.x, C.z), q = new THREE.Vector3(C.x / cl * 3 * h.BH.RS, 0, C.z / cl * 3 * h.BH.RS).project(h.hubCam);
        w.res = { ...e, left: scan(-1, 0), right: scan(1, 0), up: scan(0, -1), down: scan(0, 1), rinPx: Math.round((-q.y * .5 + .5) * innerHeight - e.cy), centreLum: lum(e.cx, e.cy) }; w.done = true; return; }
      requestAnimationFrame(f); };
    requestAnimationFrame(f); });
  await until(() => window.__still.done, 300000);
  await shot((mobile ? 'm-' : '') + 'hole-disc');
  st = await page.evaluate(() => window.__still.res);
  log('DISC', JSON.stringify({ predictedRadiusPx: Math.round(st.discPx), measuredBlackHalfWidthPx: [st.left, st.right], measuredBlackUpPx: st.up, measuredBlackDownPx: st.down, diskInnerEdgeBelowCentrePx: st.rinPx, screenHeightPx: await page.evaluate(() => innerHeight), oldCheckRadiusPx: Math.round(st.checkPx), centreLum: Math.round(st.centreLum) })); }

  log('\nHOLE SUMMARY');
  results.forEach(r => log('  ' + r.run + ': ' + (r.fell ? 'fell at r = ' + r.rAtFall + ' (' + r.rsAtFall + ' rs) after ' + r.fallAtS + ' s' : 'did NOT fall in 15 s (closest r = ' + r.closestR + ')') +
    '; inside the disc\'s circle for ' + r.looksInsideWithoutFallingS + ' s' + (r.firstLooksInside ? ' (from r = ' + r.firstLooksInside.r + ')' : '') +
    ', over or hidden in the black for ' + r.overBlackWithoutFallingS + ' s' + (r.firstOverBlack ? ' (from r = ' + r.firstOverBlack.r + (r.firstOverBlack.behindHole ? ', behind the hole' : '') + ')' : '') + (r.fell ? ' before it fell' : ' and never fell') +
    (r.fell && r.lastSeen ? '; last frame before the fall: probe at r = ' + r.lastSeen.r + ', ' + r.lastSeen.probeFromCentrePx + ' px from the centre of a ' + r.lastSeen.discRadiusPx + ' px (radius) disc' : '')));
  if (st) log('  still frame: black disc radius predicted ' + Math.round(st.discPx) + ' px, measured ' + st.left + ' / ' + st.right + ' px left / right of centre; the old 1.35 check is ' + Math.round(st.checkPx) + ' px');
  console.log(fails ? fails + ' FAILED' : 'HOLE OK');
};

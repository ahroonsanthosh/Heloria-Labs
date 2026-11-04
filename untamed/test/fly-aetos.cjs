/* Flying in to Aetos on the thruster alone: no steering, no autopilot. Measures whether you get there, how long it takes,
   and how much you overshoot, spin and drift on the way. Best with the rocket's way in, which skips the story:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/fly --scenario untamed/test/fly-aetos.cjs --hash aetos [--mobile]
   FLY=A,B,C picks the runs (each one reloads the page):
     A  hold the thruster and nothing else (W, or the stick pushed straight up)
     B  look away first (a mouse drag of about 120 degrees, or on a phone the probe turned the same amount), then hold the thruster
     C  start with a sideways drift of 4 units a second, then hold the thruster
     D  phone only: the thumb pushes up but a little to the right, as thumbs do
     E  tap the thruster: 0.8 s on, 0.8 s off
     F  hold the thruster until 7 units out, then let go and coast
   Times are in simulated seconds (the page caps a frame at 50 ms, so a slow headless run still flies the same path). */
module.exports = async ({ page, H, log, wait, shot, mobile }) => {
  const runs = (process.env.FLY || (mobile ? 'A,D' : 'A,B,C')).split(',').filter(Boolean);
  const LIMIT = +(process.env.FLY_LIMIT || 40);   // simulated seconds before a run counts as a failure
  const until = async (fn, ms = 120000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await H(fn, arg)) return true; await wait(200); } return false; };
  const out = [];
  for (let n = 0; n < runs.length; n++) {
    const v = runs[n];
    if (n > 0) { await page.reload({ timeout: 300000 }); await page.waitForFunction(() => window.__heloria && window.__heloria.S.ready, null, { timeout: 180000 }); }
    await page.click('#load');
    if (!(await until(h => ['story', 'tohub', 'hub'].includes(h.S.mode), 60000))) { log('run', v, 'never left the loader'); continue; }
    if (await H(h => h.S.mode === 'story')) await H(h => h.toHub(true));   // the Fly way in: what Skip does
    if (!(await until(h => h.S.mode === 'hub' && h.S.guide === 'lead', 90000))) { log('run', v, 'never reached orbit'); continue; }
    if (v === 'B' && !mobile) {   // a mouse drag on the canvas, to look away from Aetos (sent to the canvas itself, so no label or panel can take it)
      const turned = await H(h => { const c = h.renderer.domElement, y0 = h.S.yaw, X = innerWidth * .7, Y = innerHeight * .5;
        const ev = (t, x) => new PointerEvent(t, { pointerId: 71, pointerType: 'mouse', clientX: x, clientY: Y, bubbles: true });
        c.dispatchEvent(ev('pointerdown', X)); for (let k = 1; k <= 8; k++) window.dispatchEvent(ev('pointermove', X - k * 52)); window.dispatchEvent(ev('pointerup', X - 416));
        return Math.round((h.S.yaw - y0) * 180 / Math.PI); });
      log('looked away by', turned, 'degrees');
    }
    // from here everything happens inside the page, frame by frame, so nothing waits on a round trip
    await H((h, cfg) => {
      const S = h.S, P = S.probe, ae = h.STA.find(s => s.id === 'ae'), c = h.renderer.domElement;
      if (cfg.v === 'B' && cfg.mobile) { S.yaw += 2.1; S.lookT = S.t; }
      if (cfg.v === 'C') { const dx = ae.pos.x - P.p.x, dz = ae.pos.z - P.p.z, l = Math.hypot(dx, dz); P.v.x += -dz / l * 4; P.v.z += dx / l * 4; }
      const press = on => {
        if (!cfg.mobile) { window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: 'KeyW', bubbles: true })); return; }
        const X = innerWidth / 2, Y = innerHeight * .75, ev = (t, x, y) => new PointerEvent(t, { pointerId: 61, pointerType: 'touch', clientX: x, clientY: y, bubbles: true });
        if (on) { c.dispatchEvent(ev('pointerdown', X, Y)); window.dispatchEvent(ev('pointermove', X + (cfg.v === 'D' ? 14 : 0), Y - 55)); }
        else window.dispatchEvent(ev('pointerup', X, Y - 55));
      };
      const run = window.__fly = { s: [], t0: S.t, w0: performance.now(), done: false, d0: Math.hypot(ae.pos.x - P.p.x, ae.pos.z - P.p.z) };
      let held = false; const hold = on => { if (on !== held) { held = on; press(on); } };
      hold(true);
      const f = () => {
        const d = Math.hypot(ae.pos.x - P.p.x, ae.pos.z - P.p.z);
        if (cfg.v === 'E') hold((S.t - run.t0) % 1.6 < .8);
        if (cfg.v === 'F' && d < 7) { run.let = run.let || +(S.t - run.t0).toFixed(2); hold(false); }
        const rx = P.v.x - ae.vel.x, rz = P.v.z - ae.vel.z, ux = (ae.pos.x - P.p.x) / (d || 1), uz = (ae.pos.z - P.p.z) / (d || 1);
        run.s.push([+(S.t - run.t0).toFixed(3), +d.toFixed(3), +P.v.length().toFixed(3), +S.yaw.toFixed(4), Math.abs(rx * uz - rz * ux), S.mode]);
        if (S.mode === 'hub' && S.t - run.t0 < cfg.LIMIT) requestAnimationFrame(f);
        else { hold(false); run.done = true; run.wall = (performance.now() - run.w0) / 1000; run.stId = S.stId; }
      };
      requestAnimationFrame(f);
    }, { v, mobile, LIMIT });
    await until(() => window.__fly.done, 900000);
    const r = await page.evaluate(() => window.__fly);
    const s = r.s, docked = r.stId === 'ae';
    // overshoot: closing in to within 6 units, then the gap opening again by more than one unit
    let over = 0, low = Infinity, minD = Infinity, yawTot = 0, spin = 0, drift = 0, vmax = 0;
    for (let i = 0; i < s.length; i++) {
      const d = s[i][1]; minD = Math.min(minD, d); vmax = Math.max(vmax, s[i][2]); drift = Math.max(drift, s[i][4]);
      if (d < low) low = d; else if (low < 6 && d > low + 1) { over++; low = d; }
      if (i) { let dy = s[i][3] - s[i - 1][3]; yawTot += Math.abs(dy); }
      // the fastest the view turns over any quarter of a second
      let j = i; while (j > 0 && s[i][0] - s[j][0] < .25) j--; if (i > j && s[i][0] - s[j][0] > .2) spin = Math.max(spin, Math.abs(s[i][3] - s[j][3]) / (s[i][0] - s[j][0]));
    }
    const last = s[s.length - 1] || [0, 0, 0];
    const res = { run: v + (mobile ? ' (phone)' : ' (desktop)'), docked, simS: docked ? last[0] : null, wallS: +r.wall.toFixed(1), startGap: +r.d0.toFixed(1), closest: +minD.toFixed(2), overshoots: over,
      viewTurnedDeg: Math.round(yawTot * 180 / Math.PI), fastestTurnDegPerS: Math.round(spin * 180 / Math.PI), maxSpeed: +vmax.toFixed(1), speedAtDock: docked ? last[2] : null, maxSideDrift: +drift.toFixed(2), frames: s.length };
    out.push(res); log('FLY', JSON.stringify(res));
    if (docked) { await wait(2500); await shot((mobile ? 'm-' : '') + 'fly-' + v + '-docked'); }
  }
  log('\nFLY SUMMARY'); out.forEach(o => log('  ' + o.run + ': ' + (o.docked ? 'docked in ' + o.simS + ' s' : 'did NOT dock in ' + LIMIT + ' s') + ', closest ' + o.closest + ', overshoots ' + o.overshoots + ', view turned ' + o.viewTurnedDeg + ' deg (fastest ' + o.fastestTurnDegPerS + ' deg/s), top speed ' + o.maxSpeed + ', side drift up to ' + o.maxSideDrift));
};

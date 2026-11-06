/* The pond at the start of the walk, with real input. A stepping stone leans toward the pointer (on a phone, a finger
   dragged over the water) and rocks back to rest when it goes; coming onto one sends a ring out and lights the water under
   it, with a knock and a plink; the koi by the first stones come to the hand, turning smoothly, never faster than they
   swim, and staying under the surface. Nothing is heard before the first click or tap, nor once the page is left; it all
   rests once the walk has gone on through the door; with reduced motion the stones lean less and the koi swim slower.
   node tamed/test/run.cjs --html dist/tamed.html --lowq --scenario tamed/test/pond.cjs [--mobile] */
module.exports = async ({ page, wait, T, frames, log, mobile, vp, check, ctx }) => {
  const P = (fn, a) => T(fn, a);
  const ready = () => page.waitForFunction(() => window.__tamed && window.__tamed.S.ready, null, { timeout: 300000 });
  /* a world point on the screen, and whether a hand there would be on the page itself rather than on a link or button */
  const onScreen = (x, z, y = 0) => P((t, a) => { const s = t.POND.screen(a[0], a[1], a[2]); const el = document.elementFromPoint(s[0], s[1]);
    return { x: s[0], y: s[1], ok: s[2] < 1 && s[0] > 24 && s[0] < innerWidth - 24 && s[1] > 24 && s[1] < innerHeight - 24 && !!el && el.tagName === 'CANVAS' }; }, [x, z, y]);
  /* the walk sways a little with the pointer, so a point is aimed at a few times over */
  const aim = async (x, z, y = 0, n = 4) => { let s; for (let i = 0; i < n; i++) { s = await onScreen(x, z, y); await page.mouse.move(s.x, s.y); await frames(2); } return s; };
  const sim = async secs => { const t0 = await P(t => t.POND.t); for (let i = 0; i < 400; i++) { await frames(1); if (await P(t => t.POND.t) - t0 >= secs) return; } };
  const slab = i => P((t, i) => { const s = t.POND.slabs[i]; return { i, x: s.x, z: s.z, hw: s.hw, hd: s.hd, tx: s.tx, tz: s.tz, dy: s.dy, g: s.g, lean: Math.hypot(s.tx, s.tz) * 180 / Math.PI }; }, i);
  const cdp = mobile ? await ctx.newCDPSession(page) : null;
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1 })) });
  /* the nearest stone to the camera that is on the screen and clear of the page's own controls */
  const nearest = async () => { const n = await P(t => t.POND.slabs.length); let best = null;
    for (let i = 0; i < n; i++) { const s = await slab(i), o = await onScreen(s.x, s.z, .04); if (o.ok && (!best || o.y > best.o.y)) best = { s, o }; }
    return best; };

  await T(t => t.enter()); await wait(3200); await frames(3);
  await T(t => t.jump(0)); await frames(3);

  if (!mobile) {
    const st = await nearest(); check(!!st, 'a stepping stone is on the screen at the start of the walk (' + (st && st.s.i) + ')'); if (!st) return;
    const S0 = st.s;
    /* the hand on the water beside it: it leans toward the hand, and the stones far from it stay still */
    await aim(S0.x - 1, S0.z, 0); await sim(1.2);
    const a = await slab(S0.i), H = await P(t => t.POND.hand), dx = H.tx - a.x, dz = H.tz - a.z, d = Math.hypot(dx, dz), L = Math.hypot(a.tx, a.tz);
    const toward = L > 0 ? (a.tx * dx + a.tz * dz) / (L * d) : 0;
    check(a.lean > 1 && a.lean < 6.5 && toward > .85, 'a stone leans a few degrees toward the pointer beside it (' + a.lean.toFixed(2) + ' deg, toward ' + toward.toFixed(2) + ')');
    const far = await P((t, i) => t.POND.slabs.filter(s => Math.hypot(s.x - t.POND.slabs[i].x, s.z - t.POND.slabs[i].z) > 4).every(s => Math.hypot(s.tx, s.tz) < 1e-4), S0.i);
    check(far, 'stones far from the pointer stay still');
    /* onto it, before the visitor has clicked or tapped anything: a ring and the light, and no sound yet (the sound is
       already running here: this browser lets it start by itself) */
    const c0 = await P(t => ({ ...t.POND.count })), h0 = await P(t => ({ ...t.A.pondHeard }));
    await aim(S0.x, S0.z, .04, 2); await frames(2);
    const c1 = await P(t => ({ ...t.POND.count })), h1 = await P(t => ({ ...t.A.pondHeard })), b = await slab(S0.i), run = await P(t => t.A.ctx && t.A.ctx.state);
    check(c1.ring > c0.ring && c1.knock > c0.knock && b.g > .3, 'coming onto a stone sends a ring out and lights the water under it (rings ' + c1.ring + ', light ' + b.g.toFixed(2) + ')');
    check(run === 'running' && h1.knock === h0.knock && h1.plink === h0.plink, 'nothing is heard before the first click or tap, though the sound is running (' + run + ', ' + JSON.stringify(h1) + ')');
    /* the first click; then onto the stone again: a knock and a plink */
    /* (on the open water beside the stone, not on the page's own controls) */
    let wpt = null; for (const [ox, oz] of [[-2.4, .6], [-2.4, -1.5], [2.4, -1.5], [-2, -3], [2, -3]]) { wpt = await onScreen(S0.x + ox, S0.z + oz, 0); if (wpt.ok) break; }
    await page.mouse.click(wpt.x, wpt.y); await wait(700); await frames(2);
    await aim(S0.x, S0.z, .04, 3); await frames(2);
    const h2 = await P(t => ({ ...t.A.pondHeard }));
    check(h2.knock > h1.knock && h2.plink > h1.plink, 'after the first click a stone tipping is heard: a knock, and a plink for its ring (' + JSON.stringify(h2) + ')');
    /* the hand goes: it rocks back to rest, and the light fades within two seconds */
    await page.mouse.move(vp.width * .5, vp.height * .3); await sim(3.2);
    const r = await slab(S0.i), stat = await P(t => t.POND.stat);
    check(r.lean < .05 && Math.abs(r.dy) < .001 && r.g < .01, 'when the hand goes the stone rocks back to rest and its light fades (' + r.lean.toFixed(3) + ' deg, light ' + r.g.toFixed(3) + ')');
    check(stat.lean < 7.5, 'it never leans more than a few degrees, even rocking (at most ' + stat.lean.toFixed(2) + ' deg)');
    /* a fast sweep across the path: rate limited knocks */
    const k0 = await P(t => t.A.pondHeard.knock), ids = await P(t => t.POND.slabs.map(s => s.i).slice(-8));
    const pts = []; for (const i of ids) { const s = await slab(i), o = await onScreen(s.x, s.z, .04); if (o.ok) pts.push(o); }
    const t0 = Date.now(); for (const o of pts) { await page.mouse.move(o.x, o.y); await frames(1); }
    const k1 = await P(t => t.A.pondHeard.knock), secs = (Date.now() - t0) / 1000;
    check(k1 - k0 <= Math.ceil(secs / .11) + 1, 'a fast sweep over ' + pts.length + ' stones knocks at most every 0.11 s (' + (k1 - k0) + ' knocks in ' + secs.toFixed(1) + ' s)');
  }

  /* ---- a tap or a click on a stone presses it: even one the hand already rests on, and even a tap quicker than a frame ---- */
  {
    await T(t => { t.jump(0); t.POND.reset && t.POND.reset(); }); await frames(2);
    const st = await nearest(); check(!!st, 'a stone to tap is on the screen'); if (st) {
      const S0 = st.s, o = st.o; await wait(400);
      if (!mobile) { await aim(S0.x, S0.z, .04, 3); await sim(1.2); }   // (the pointer already resting on it)
      const c0 = await P(t => ({ ...t.POND.count })), h0 = await P(t => ({ ...t.A.pondHeard }));
      if (mobile) { await touch('touchStart', [[o.x, o.y]]); await touch('touchEnd', [[o.x, o.y]]); } else await page.mouse.click(o.x, o.y);
      await frames(2); const b = await slab(S0.i), c1 = await P(t => ({ ...t.POND.count })), h1 = await P(t => ({ ...t.A.pondHeard }));
      check((c1.press || 0) > (c0.press || 0) && c1.ring > c0.ring && h1.knock > h0.knock && b.g >= .5, (mobile ? 'a quick tap' : 'a click') + ' on a stone presses it: a knock, a ring and its light (' + JSON.stringify({ press: c1.press, ring: c1.ring, knock: h1.knock, g: +b.g.toFixed(2) }) + ')');
      const s1 = await P(t => t.S.s); check(Math.abs(s1) < .01, 'and the walk does not move for it (s ' + s1.toFixed(3) + ')'); } }

  /* ---- the koi: called to the hand ---- */
  {
    await T(t => { t.jump(0); t.POND.reset(); }); await frames(2);
    const [hx, hz] = await P(t => t.POND.home());
    const before = await P(t => t.POND.koi.map(k => [k.x, k.z]));
    const gx = hx + (mobile ? -.4 : 1.2), gz = hz - .4;
    let fx, fy;
    /* (a finger that rests still on the glass opens the index of places: this one moves along the water from the start) */
    if (mobile) { const o = await onScreen(gx, gz, 0); fx = o.x; fy = o.y; await touch('touchStart', [[fx - 60, fy]]);
      for (let i = 1; i <= 3; i++) { await touch('touchMove', [[fx - 60 + i * 20, fy]]); await wait(30); } await frames(1); }
    else await aim(gx, gz, 0);
    const d0 = before.map(([x, z]) => Math.hypot(x - gx, z - gz));
    for (let i = 0; i < 14; i++) { await sim(1); if (mobile) await touch('touchMove', [[fx + (i % 2 ? 4 : -4), fy]]); }
    const k = await P(t => ({ koi: t.POND.koi.map(k => [k.x, k.z, k.depth]), H: t.POND.hand, K: t.POND.koiU.uKoiK.value, stat: t.POND.stat, s: t.S.s, index: t.state().index }));
    if (mobile) await touch('touchEnd', [[fx, fy]]);
    const d1 = k.koi.map(([x, z]) => Math.hypot(x - k.H.kx, z - k.H.kz)), near = d1.filter(d => d < 1.8).length;
    const m0 = d0.reduce((a, b) => a + b, 0) / d0.length, m1 = d1.reduce((a, b) => a + b, 0) / d1.length;
    check(k.K === 1 && near >= 4 && m1 < m0, 'the koi by the first stones gather at the ' + (mobile ? 'finger' : 'pointer') + ' (' + near + ' of ' + d1.length + ' within 1.8 m, on average ' + m0.toFixed(2) + ' m away, then ' + m1.toFixed(2) + ')');
    if (mobile) check(Math.abs(k.s) < .01 && !k.index, 'a finger moved along the water does not move the walk, nor open the index (s ' + k.s.toFixed(3) + ')');
    const S1 = k.stat;
    check(S1.turn <= (await P(t => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? .8 : 1.2))) + 1e-6 && S1.speed <= .43, 'the koi turn smoothly and swim slowly (fastest turn ' + S1.turn.toFixed(2) + ' rad/s, fastest swim ' + S1.speed.toFixed(2) + ' m/s)');
    check(S1.top >= .08 && S1.deep <= .32, 'and stay under the surface (from ' + S1.top.toFixed(2) + ' to ' + S1.deep.toFixed(2) + ' m deep)');
  }

  /* ---- a phone: a finger dragged over a stone does what the pointer does ---- */
  if (mobile) {
    /* the stones come near on a phone part way to the pavilion: hold the walk there with the finger */
    const v = await P(t => { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (t.walkAt(m).s < .34) a = m; else b = m; } return (a + b) / 2; });
    await T((t, v) => t.setV(v), v); await frames(3);
    const st = await nearest(); check(!!st, 'part way across the water a stepping stone is on a phone\'s screen (' + (st && st.s.i) + ')');
    if (st) {
      const c0 = await P(t => ({ ...t.POND.count })), h0 = await P(t => ({ ...t.A.pondHeard }));
      /* onto the near side of it, from the left: on its middle a stone only sinks, evenly */
      const o = await onScreen(st.s.x - .3, st.s.z, .04), x0 = Math.max(12, o.x - 90);
      await touch('touchStart', [[x0, o.y]]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[x0 + (o.x - x0) * i / 6, o.y]]); await wait(30); if (i > 2) await frames(1); }
      await frames(2);
      const b = await slab(st.s.i), c1 = await P(t => ({ ...t.POND.count })), h1 = await P(t => ({ ...t.A.pondHeard }));
      await touch('touchEnd', [[o.x, o.y]]);
      check(b.lean > .8 && c1.ring > c0.ring && b.g > .3, 'a finger dragged onto a stone tips it, sends a ring out and lights the water under it (' + b.lean.toFixed(2) + ' deg, light ' + b.g.toFixed(2) + ')');
      check(h1.knock > h0.knock, 'and it is heard (a finger on the glass is the gesture that lets the sound play)');
    }
  }

  /* ---- leaving the page: nothing is heard ---- */
  if (!mobile) {
    const st = await nearest();
    await T(t => window.dispatchEvent(new Event('blur'))); await wait(1600);
    await page.mouse.move(vp.width * .5, vp.height * .3); await wait(600); await frames(2);
    if (st) { await aim(st.s.x, st.s.z, .04, 2); await frames(2); }
    let pk = 0; for (let i = 0; i < 8; i++) { const m = await P(t => t.A.meter()); pk = Math.max(pk, m.peak); await wait(100); }
    check(pk < .002, 'with another window in front the pond is silent too (peak ' + pk + ')');
    await T(t => window.dispatchEvent(new Event('focus')));
  }

  /* ---- once the walk has gone on through the door it all rests, and costs nothing: out in the courtyard by the pool the
     koi are not drawn and every stone is still ---- */
  await T(t => t.jump(5)); await frames(4);
  const rest = await P(t => ({ K: t.POND.koiU.uKoiK.value, glow: t.POND.water.uniforms.uGlowB.value.every(v => v.z === 0), still: t.POND.slabU.uTilt.value.every(v => v.x === 0 && v.y === 0 && v.z === 0 && v.w === 0) }));
  check(rest.K === 0 && rest.glow && rest.still, 'past the door the koi are not drawn and every stone is at rest (' + JSON.stringify(rest) + ')');

  /* ---- reduced motion: the stones lean less, and the koi swim slower ---- */
  if (!mobile) {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload(); await ready();
    await page.mouse.click(8, 8); await T(t => t.enter()); await wait(3200); await frames(3); await T(t => { t.jump(0); t.POND.reset(); }); await frames(3);
    const st = await nearest();
    if (st) { await aim(st.s.x - 1, st.s.z, 0); await sim(1); await aim(st.s.x, st.s.z, .04, 2); await sim(2); }
    const [hx, hz] = await P(t => t.POND.home()); await aim(hx - 1.4, hz - .4, 0); await sim(6);
    const S2 = await P(t => t.POND.stat);
    check(S2.lean > .3 && S2.lean <= 2.4 && S2.speed <= .26 && S2.turn <= .8 + 1e-6, 'with reduced motion the stones lean less and the koi swim slower (at most ' + S2.lean.toFixed(2) + ' deg, ' + S2.speed.toFixed(2) + ' m/s, ' + S2.turn.toFixed(2) + ' rad/s)');
  }
  log('counts', JSON.stringify(await P(t => ({ count: t.POND.count, heard: t.A.pondHeard }))));
};

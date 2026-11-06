/* The cliff on Earth: a bench you can sit on, and a kite you can fly.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/cliff.cjs --out <dir> [--mobile] [--meter]
   It clicks (or taps) the bench from across the grass and you walk over and sit; the camera must settle into the view over the
   sea, follow a low sun round and look west by night. A key, a click, a drag and the stick each stand you up again, and walking
   into the bench sits you down (what you held to get there does not stand you up again). Then it clicks the kite: you carry it
   to the edge and it rises on its string; drags steer it (a swoop to the left, a climb, a dive), let go it flies on steadily;
   a click elsewhere brings it down and back to the bench, and so does walking off. Along the way: nobody walks through
   anything, nothing is ever not a number, the sounds are made and kept apart in time, the town's own walks still work from
   the cliff (Abraham, called from the bench), and the last flight puts it all back. With --meter it also listens to each of
   the new sounds against a footstep. The station's clock is stepped by hand where timing is not the point, as in earth.cjs. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '', cdp = mobile ? await page.context().newCDPSession(page) : null;
  /* in the page: step the station, count anyone standing inside anything, place the player, and keep a log of the cliff's sounds */
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__C = {
      snd: [], fixed: null,
      run(n, watch) { let bad = 0; const fixed = this.fixed || (this.fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o)));
        for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); if (watch && fixed.some(o => Math.hypot(d.player.x - o.x, d.player.z - o.z) < o.r + .12)) bad++; } return bad; },
      until(src, max, watch) { const f = (0, eval)('(' + src + ')'); let i = 0, bad = 0; for (; i < max && !f(d); i++) bad += this.run(1, watch); return { frames: i, bad, done: f(d) }; },
      put(x, z, fx, fz) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      local(a, b) { const F = d.cliff.F, l = [Math.cos(F.yaw), -Math.sin(F.yaw)], f = [Math.sin(F.yaw), Math.cos(F.yaw)]; return [F.x + l[0] * a + f[0] * b, F.z + l[1] * a + f[1] * b]; },
      scr(v) { h.stCam.position.copy(st.camP); h.stCam.lookAt(st.camL); h.stCam.updateMatrixWorld(); const p = v.clone().project(h.stCam); return [(p.x * .5 + .5) * innerWidth, (-p.y * .5 + .5) * innerHeight, p.z, p.x, p.y]; },
      fin(v) { return [v.x, v.y, v.z].every(Number.isFinite); },
      count(name) { return this.snd.filter(s => s.n === name).length; },
      gaps(name) { const t = this.snd.filter(s => s.n === name).map(s => s.t); let m = 1e9; for (let i = 1; i < t.length; i++) m = Math.min(m, t[i] - t[i - 1]); return m; },
    };
    for (const n of ['creak', 'flutter', 'tug', 'lift', 'step']) { const f = h.A[n]; h.A[n] = function () { window.__C.snd.push({ n, t: h.S.t, a: [...arguments] }); return f.apply(this, arguments); }; }
  });
  const C = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__C, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  /* a drag across the screen, the station stepped between the moves, so the kite answers as it goes */
  const open = (x, y) => page.evaluate(([x, y]) => { for (const [a, b] of [[0, 0], [-.12, 0], [.12, 0], [0, -.1], [-.2, -.1], [.2, -.1]]) { const px = x + a * innerWidth, py = y + b * innerHeight, e = document.elementFromPoint(px, py); if (e && e.tagName === 'CANVAS') return [px, py]; } return [x, y]; }, [x, y]);
  const drag = async (x0, y0, dx, dy, steps = 10, per = 2) => { [x0, y0] = await open(x0, y0);
    if (mobile) await touch('touchStart', x0, y0); else { await page.mouse.move(x0, y0); await page.mouse.down(); }
    for (let i = 1; i <= steps; i++) { const x = x0 + dx * i / steps, y = y0 + dy * i / steps; if (mobile) await touch('touchMove', x, y); else await page.mouse.move(x, y); await C((c, d, h, n) => c.run(n), per); }
    if (mobile) await touch('touchEnd'); else await page.mouse.up(); };
  await H(h => { h.A.start && h.A.start(); });
  await H(h => h.ST.cr._dbg.skipCut()); await C(c => c.run(30)); await wait(400);

  /* ---- it is there, out of everyone's way, and the town's paths reach it ---- */
  const built = await C((c, d) => { const M = d.cliff.M, F = d.cliff.F, b = [F.x, F.z];
    const inst = Object.entries(d.INST).map(([id, q]) => [id, +(Math.hypot(b[0] - q.x, b[1] - q.z) - q.r).toFixed(2)]);
    const people = Math.min(...d.people.map(p => Math.hypot(b[0] - p.at[0], b[1] - p.at[1])));
    const solid = d.OBS.filter(o => Math.hypot(o.x - b[0], o.z - b[1]) < 1.1).length;
    const start = [-3.2, -12], p1 = d.navPath(start[0], start[1], M.sitA[0], M.sitA[1], 1.3), p2 = d.navPath(start[0], start[1], M.kiteA[0], M.kiteA[1], 1.3);
    return { inst, people: +people.toFixed(1), solid, toSit: !!p1, toKite: !!p2, kite: c.fin(M.kite.position) }; });
  rec(built.inst.every(([, m]) => m > .3), 'the bench stands clear of every landmark (and its card)', JSON.stringify(built.inst));
  rec(built.people > 5 && built.solid >= 2 && built.kite, 'it is away from the three of us, and the bench and kite are solid', JSON.stringify(built));
  rec(built.toSit && built.toKite, 'the town\'s own path finder reaches the bench and the kite from the landing pad');

  /* ---- across the grass: the bench and the kite, with their tags ---- */
  /* somewhere on the town's side, five or six metres off, with nothing in the way: open ground the path finder reaches */
  const from = await C((c, d) => { const M = d.cliff.M; for (const r of [5.5, 6, 5, 6.5, 7]) for (let a = 0; a < 24; a++) { const t = Math.PI * (.5 + a / 24), [x, z] = c.local(Math.sin(t) * r * .7 + .5, Math.cos(t) * r);
      if (d.OBS.some(o => Math.hypot(x - o.x, z - o.z) < o.r + .45)) continue; if (!d.navPath(-3.2, -12, x, z, 1.3) || !d.navPath(x, z, M.sitA[0], M.sitA[1], 1.3)) continue; return [x, z]; } return null; });
  rec(!!from, 'there is open ground on the town\'s side to set out from', JSON.stringify(from));
  await C((c, d, h, p) => { const F = d.cliff.F; c.put(p[0], p[1], F.x, F.z); d.began(); c.run(45); }, from);
  await frames(4); await shot(pre + 'cliff-spot');
  const tags = await page.evaluate(() => [...document.querySelectorAll('#crLabels .crl')].slice(-2).map(e => ({ t: e.textContent, on: e.classList.contains('on'), pe: getComputedStyle(e).pointerEvents })));
  rec(tags.length === 2 && tags.every(t => t.on && t.pe !== 'none'), 'near it, a tag over the bench and one over the kite say what you can do', JSON.stringify(tags));

  /* ---- click the bench: you walk over, round its end, and sit ---- */
  const bxy = await C((c, d) => c.scr(new THREE.Vector3(-.45, .62, -.1).applyMatrix4(d.cliff.M.M)));   // its right half: the kite leans on the left
  rec(bxy[2] < 1 && bxy[0] > 0 && bxy[0] < vp.width && bxy[1] > 0 && bxy[1] < vp.height, 'the bench is on the screen', JSON.stringify(bxy.map(v => +v.toFixed(2))));
  await tap(bxy[0], bxy[1]);
  const go = await C((c, d) => d.cliff.CL.st);
  rec(go === 'go', (mobile ? 'a tap' : 'a click') + ' on the bench sets you walking over', go);
  const walk = await C(c => c.until(d => d.cliff.CL.st === 'sat', 30 * 40, true));
  rec(walk.done && walk.bad === 0, 'you get there and sit down, without walking through anything', JSON.stringify(walk));
  rec(await C(c => c.count('creak') >= 1), 'the bench creaks as you sit');

  /* ---- sitting: the camera settles slowly into the view over the sea ---- */
  const early = await C((c, d) => d.cliff.CL.ws); await C(c => c.run(150));
  const view = await C((c, d, h) => { const st = h.ST.cr, M = d.cliff.M, cp = st.camP, v = st.camL.clone().sub(cp).normalize(), up = cp.clone().normalize(), hz = v.clone().addScaledVector(up, -v.dot(up)).normalize();
    const dip = Math.acos((24 - .9) / cp.length()), down = Math.asin(-v.dot(up)), out = hz.dot(M.fw);
    // the horizon that way is in the picture, and just short of it, out that way, is open sea past the coast
    const hv = hz.clone().multiplyScalar(Math.cos(dip + .035)).addScaledVector(up, -Math.sin(dip + .035)), b = cp.dot(hv), disc = b * b - (cp.lengthSq() - 23.1 * 23.1), t = -b - Math.sqrt(Math.max(0, disc)), [hx, hz2] = d.loc(cp.clone().addScaledVector(hv, t).normalize());
    const hor = c.scr(cp.clone().addScaledVector(hz.clone().multiplyScalar(Math.cos(dip)).addScaledVector(up, -Math.sin(dip)), 30)), head = c.scr(M.headW);
    return { ws: d.cliff.CL.ws, height: +(cp.length() - 24).toFixed(2), out: +out.toFixed(2), down: +(down * 57.3).toFixed(1), dip: +(dip * 57.3).toFixed(1), sea: disc > 0 ? +Math.hypot(hx, hz2).toFixed(1) : -1, horizon: +hor[4].toFixed(2), head: [+head[3].toFixed(2), +head[4].toFixed(2)] }; });
  rec(early < .5 && view.ws > .97, 'the camera eases over slowly and settles', JSON.stringify({ early, ws: view.ws }));
  rec(view.out > .5 && Math.abs(view.down - view.dip) < 12 && view.horizon > -.8 && view.horizon < .5 && view.sea > 18.5, 'it looks out over open sea to the horizon', JSON.stringify(view));
  const seen = await C((c, d, h) => { const st = h.ST.cr, cp = st.camP, head = d.cliff.M.headW, dir = head.clone().sub(cp), L = dir.length(), rc = new THREE.Raycaster(cp, dir.normalize(), .3, L - .4);
    rc.layers.set(0); const hit = rc.intersectObjects(st.scene.children, true).find(x => { let o = x.object; while (o) { if (o.userData && o.userData.legs) return false; o = o.parent; } return x.object.visible; }); return hit ? +hit.distance.toFixed(2) : null; });
  rec(seen === null, 'nothing stands between the camera and you on the bench', String(seen));
  await frames(4); await shot(pre + 'cliff-seated');
  /* the sun: low over the sea to one side, the view turns to it; by night it looks west. (The sun is moved here by hand, as the
     day will move it) */
  const sun = await C((c, d) => { d.sky.SKY.hold = true; const M = d.cliff.M, S = d.LU.uSun.value, s0 = S.clone(), dir = M.fw.clone().multiplyScalar(Math.cos(.6)).addScaledVector(M.lf, Math.sin(.6));
    S.copy(dir).multiplyScalar(Math.cos(.14)).addScaledVector(M.up, Math.sin(.14)).normalize(); c.run(240); const low = d.cliff.CL.look; const st = window.__heloria.ST.cr, cp = st.camP, cu = cp.clone().normalize(), v = st.camL.clone().sub(cp), vh = v.addScaledVector(cu, -v.dot(cu)).normalize(), sh = S.clone().addScaledVector(cu, -S.dot(cu)).normalize(); const p = [0, 0, 0, +Math.acos(Math.min(1, vh.dot(sh))).toFixed(3), 0];
    S.copy(dir).multiplyScalar(Math.cos(.4)).addScaledVector(M.up, -Math.sin(.4)).normalize(); c.run(300); const night = d.cliff.CL.look, west = d.cliff.WEST.clone().addScaledVector(M.up, -d.cliff.WEST.dot(M.up)).normalize(), wa = Math.atan2(west.dot(M.lf), west.dot(M.fw));
    S.copy(s0); d.sky.SKY.hold = false; c.run(300); return { low: +low.toFixed(2), sunOn: [+p[3].toFixed(2), +p[4].toFixed(2)], night: +night.toFixed(2), wa: +wa.toFixed(2), back: +d.cliff.CL.look.toFixed(2) }; });
  rec(sun.low > .45 && sun.sunOn[0] < .2, 'a low sun over the sea: the view turns round to face it', JSON.stringify(sun));
  rec(Math.abs(sun.night - sun.wa) < .12, 'by night it looks to the western horizon', JSON.stringify(sun));

  /* ---- anything stands you up, and the camera comes back ---- */
  const before = await C(c => c.count('creak'));
  if (mobile) await tap(vp.width * .5, vp.height * .4); else await page.keyboard.press('KeyD');
  const up1 = await C((c, d) => d.cliff.CL.st); await C(c => c.run(90));
  const back = await C((c, d, h) => { const st = h.ST.cr, P = d.player, head = P.u.clone().multiplyScalar(24 + P.h + 1.15); return { st: d.cliff.CL.st, ws: +d.cliff.CL.ws.toFixed(3), cam: +st.camP.distanceTo(head).toFixed(2), creak: window.__C.count('creak') }; });
  rec(up1 === 'up' && back.st === 'idle' && back.ws < .05 && back.cam < 7.5 && back.creak > before, (mobile ? 'a tap' : 'a key') + ' stands you up and gives the camera back', JSON.stringify({ up1, ...back }));
  /* E (or the tag) sits you down again where you stand; then a click (a tap) stands you up, and does not sit you down again */
  if (mobile) { let t = null;   // (the tag follows the bench as the camera settles back: found again, if a tap lands just off it)
    for (let k = 0; k < 3 && !(await C((c, d) => d.cliff.CL.st !== 'idle')); k++) { t = await page.evaluate(() => { const e = document.querySelector('#crLabels > span.crl:nth-last-child(2)'), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
      return e.classList.contains('on') && (top === e || e.contains(top)) ? [x, y] : null; }); if (t) await page.touchscreen.tap(t[0], t[1]); await wait(150); }
    rec(!!t, 'the Sit tag is there to tap, on top'); }
  else await page.keyboard.press('KeyE');
  const s2 = await C(c => c.until(d => d.cliff.CL.st === 'sat', 90));
  rec(s2.done, (mobile ? 'tapping the Sit tag' : 'E beside the bench') + ' sits you down', JSON.stringify(s2));
  await tap(vp.width * .5, vp.height * .3); await C(c => c.run(40));
  rec(await C((c, d) => d.cliff.CL.st === 'idle'), (mobile ? 'a tap' : 'a click') + ' stands you up, and only that');
  /* a drag stands you up too */
  await C((c, d) => { d.cliff.sit(); c.run(40); });
  await drag(vp.width * .5, vp.height * .55, 60, -40, 4); await C(c => c.run(10));
  rec(await C((c, d) => d.cliff.CL.st !== 'sat'), 'a drag stands you up');
  await C(c => c.run(40));

  /* ---- walking into it from round its end sits you down; what you held to get there does not stand you up ---- */
  await C((c, d) => { const [x, z] = c.local(1.7, -.35), [bx, bz] = c.local(.3, 0); c.put(x, z, bx, bz); c.run(5); });
  let into;
  if (mobile) { const [sx, sy] = await open(vp.width * .5, vp.height * .75); await touch('touchStart', sx, sy); for (let i = 1; i <= 4; i++) await touch('touchMove', sx, sy - i * 12);
    into = await C(c => c.until(d => d.cliff.CL.st === 'sit' || d.cliff.CL.st === 'sat', 120)); await touch('touchMove', sx, sy - 60); }
  else { await page.keyboard.down('KeyW'); into = await C(c => c.until(d => d.cliff.CL.st === 'sit' || d.cliff.CL.st === 'sat', 120)); }
  const held = await C((c, d) => { const P = d.player, x = P.x, z = P.z; c.run(45); return { st: d.cliff.CL.st, moved: +Math.hypot(P.x - x, P.z - z).toFixed(3), stick: !document.querySelector('#crStick').hidden }; });
  if (mobile) await touch('touchEnd'); else await page.keyboard.up('KeyW');
  rec(into.done, 'walking into the bench from its end sits you down', JSON.stringify(into));
  rec(held.st === 'sat' && held.moved < .02 && !held.stick, 'still holding on, you stay sitting and do not slide off', JSON.stringify(held));
  if (mobile) { await touch('touchStart', vp.width * .5, vp.height * .7); await touch('touchMove', vp.width * .5, vp.height * .7 - 40); await C(c => c.run(15)); await touch('touchEnd'); }
  else { await page.keyboard.down('KeyW'); await C(c => c.run(15)); }
  rec(await C((c, d) => d.cliff.CL.st !== 'sat'), 'setting off again (' + (mobile ? 'the stick' : 'W, pressed again') + ') stands you up');
  if (!mobile) { await C(c => c.run(30)); await page.keyboard.up('KeyW'); }

  /* ---- the kite: click it, carry it to the edge, and it rises ---- */
  rec(await C((c, d) => { c.run(60); return d.cliff.CL.st === 'idle'; }), 'once up, setting straight off does not sit you down again');
  await C((c, d, h, p) => { const [kx, kz] = d.cliff.M.kb; c.put(p[0], p[1], kx, kz); d.cam.dist = d.cam.D0(); c.run(60); }, from);
  await frames(4); await shot(pre + 'cliff-kite-home');
  const kxy = await C(c => c.scr(window.__heloria.ST.cr._dbg.cliff.M.hitK.getWorldPosition(new THREE.Vector3())));
  rec(kxy[2] < 1 && kxy[0] > 0 && kxy[0] < vp.width && kxy[1] > 0 && kxy[1] < vp.height, 'the kite is on the screen', JSON.stringify(kxy.map(v => +v.toFixed(2))));
  await tap(kxy[0], kxy[1]);
  rec(await C((c, d) => d.cliff.CL.k === 'go'), (mobile ? 'a tap' : 'a click') + ' on the kite sets you walking over');
  const take = await C(c => c.until(d => d.cliff.CL.k === 'carry', 30 * 30, true));
  const carry = await C(c => c.until(d => d.cliff.CL.k === 'rise', 30 * 20, true));
  rec(take.done && carry.done && take.bad + carry.bad === 0, 'you pick it up and carry it round to the edge, through nothing', JSON.stringify({ take, carry }));
  const rise = await C((c, d) => { const r = c.until(d => d.cliff.CL.k === 'fly', 120); c.run(60); const M = d.cliff.M, K = M.kite.position, [x, z] = d.loc(K.clone().normalize()), P = d.player;
    const k = c.scr(K), hd = c.scr(P.u.clone().multiplyScalar(24 + P.h + 1));
    return { ...r, lift: window.__C.count('lift'), str: M.str.visible, reel: M.inHand.visible, over: +Math.hypot(x, z).toFixed(1), high: +(K.length() - 24).toFixed(1), at: +Math.hypot(P.x - M.sitA[0], P.z - M.sitA[1]).toFixed(2), k: [k[3], k[4]].map(v => +v.toFixed(2)), you: [hd[3], hd[4]].map(v => +v.toFixed(2)) }; });
  rec(rise.done && rise.lift === 1 && rise.str && rise.reel, 'it rises on the wind, on a string from the reel in your hand, with a sound', JSON.stringify(rise));
  rec(rise.over > 18.2 && rise.high > 2.5 && rise.at < .8, 'it flies out over the sea, from the top of the drop', JSON.stringify(rise));
  rec([...rise.k, ...rise.you].every(v => Math.abs(v) < .97), 'the camera has you and the kite both in the picture', JSON.stringify({ k: rise.k, you: rise.you }));
  await frames(4); await shot(pre + 'cliff-kite');

  /* ---- drags steer it: a swoop to the left, a climb, a dive; it answers a moment behind, and tugs at the string ---- */
  const s0 = await C((c, d) => { const C_ = d.cliff.CL; window.__C.snd = window.__C.snd.filter(s => s.n !== 'flutter' && s.n !== 'tug'); return { az: C_.az, el: C_.el, x: c.scr(d.cliff.M.kite.position)[3] }; });
  await drag(vp.width * .6, vp.height * .5, -vp.width * .36, 0, 8);
  const left = await C((c, d) => { const C_ = d.cliff.CL; c.run(20); return { taz: +C_.taz.toFixed(2), az: +C_.az.toFixed(2), x: +c.scr(d.cliff.M.kite.position)[3].toFixed(2) }; });
  rec(left.taz < -.4 && left.az < s0.az - .3 && left.x < s0.x - .05, 'dragged left, it swoops off to the left', JSON.stringify({ s0, left }));
  /* and a moment behind the hand: asked to go a long way at once, it is still on its way a tenth of a second later, and gets
     there (or a little past, in a swoop) within a second */
  const lag = await C((c, d) => { const C_ = d.cliff.CL, a0 = C_.az; C_.taz = a0 + .8; c.run(3); const a1 = C_.az; let mx = a1; for (let i = 0; i < 30; i++) { c.run(1); mx = Math.max(mx, C_.az); } return { a0: +a0.toFixed(2), a1: +a1.toFixed(2), mx: +mx.toFixed(2), taz: +C_.taz.toFixed(2) }; });
  rec(lag.a1 - lag.a0 < .5 && lag.mx > lag.taz - .1, 'it follows a moment behind your hand, and swoops on round', JSON.stringify(lag));
  await frames(4); await shot(pre + 'cliff-kite-swoop');
  const e0 = await C((c, d) => d.cliff.CL.el);
  await drag(vp.width * .5, vp.height * .6, 0, -vp.height * .3, 6); await C(c => c.run(25));
  const e1 = await C((c, d) => d.cliff.CL.el);
  await drag(vp.width * .5, vp.height * .3, 0, vp.height * .5, 6);
  const dive = await C((c, d) => { let lo = 9; for (let i = 0; i < 30; i++) { c.run(1); lo = Math.min(lo, d.cliff.CL.el); } return +lo.toFixed(2); });
  rec(e1 > e0 + .1 && dive < e1 - .4 && dive >= .14, 'up the screen it climbs; down it dives, and stops short of the water', JSON.stringify({ e0: +e0.toFixed(2), e1: +e1.toFixed(2), dive }));
  const sounds = await C(c => ({ flutter: c.count('flutter'), tug: c.count('tug'), fgap: +c.gaps('flutter').toFixed(3), tgap: +c.gaps('tug').toFixed(3) }));
  rec(sounds.flutter >= 4 && sounds.tug >= 1 && sounds.fgap >= .12 && sounds.tgap >= .3, 'its cloth flutters and the string tugs as it swoops, never on top of each other', JSON.stringify(sounds));
  const steady = await C((c, d) => { c.run(150); const C_ = d.cliff.CL, M = d.cliff.M, ok = c.fin(M.kite.position) && [...M.rib.geometry.attributes.position.array].every(Number.isFinite) && [...M.str.geometry.attributes.position.array].every(Number.isFinite);
    return { k: C_.k, el: +C_.el.toFixed(2), az: +C_.az.toFixed(2), finite: ok }; });
  rec(steady.k === 'fly' && steady.el > .6 && steady.el < 1.12 && Math.abs(steady.az) < .45 && steady.finite, 'let go, it flies on steadily, settling up off the water', JSON.stringify(steady));

  /* ---- a click elsewhere brings it down, and it goes back to its place by the bench ---- */
  const st0 = await C(c => c.count('step'));
  await tap(vp.width * .15, vp.height * .35);
  const down = await C((c, d) => { const k = d.cliff.CL.k; const r = c.until(d => d.cliff.CL.k === 'home', 150); const M = d.cliff.M; return { k, ...r, home: +M.kite.position.distanceTo(M.homeP).toFixed(4), str: M.str.visible, reel: M.onGround.visible && !M.inHand.visible }; });
  rec(down.k === 'down' && down.done && down.home < .01 && !down.str && down.reel, (mobile ? 'a tap' : 'a click') + ' elsewhere brings it down, back to the bench', JSON.stringify(down));
  rec(await C((c, d, h, s) => c.count('step') > s, st0), 'and it lands in the grass with a soft sound');
  /* walking off ends it too */
  await C((c, d) => { d.cliff.goKite(); c.until(d => d.cliff.CL.k === 'fly', 30 * 40); c.run(10); });
  const flying = await C((c, d) => d.cliff.CL.k);
  if (mobile) { await touch('touchStart', vp.width * .5, vp.height * .8); await touch('touchEnd'); await C(c => c.run(3)); }
  else { await page.keyboard.down('KeyS'); await C(c => c.run(10)); await page.keyboard.up('KeyS'); }
  const off = await C((c, d) => { const k = d.cliff.CL.k; c.run(100); return { k, now: d.cliff.CL.k }; });
  rec(flying === 'fly' && off.k === 'down' && off.now === 'home', (mobile ? 'a tap' : 'walking off') + ' ends it too, and it goes back', JSON.stringify({ flying, ...off }));

  /* ---- the town still works from here: called from the bench, you get up and walk over to Abraham, and he talks ---- */
  const abe = await C((c, d) => { d.cliff.goSit(); c.until(d => d.cliff.CL.st === 'sat', 30 * 20); d.closeTalk(); d.people[2].greeted = false; d.goTalk(d.people[2]);
    const r = c.until(d => !!d.talk().p, 30 * 60, true); const T = d.talk(); return { ...r, who: T.p ? T.p.first : null, st: d.cliff.CL.st }; });
  rec(abe.done && abe.who === 'Abraham' && abe.bad === 0 && abe.st === 'idle', 'called from the bench, you get up and walk over to Abraham, and he talks', JSON.stringify(abe));
  await C((c, d) => { d.closeTalk(); c.run(5); });

  /* ---- with --meter: how loud each new sound is, against a footstep ---- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 900) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(300); return +pk.toFixed(4); };
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['creak', h => h.A.creak()], ['creak(soft)', h => h.A.creak(true)], ['flutter(1)', h => h.A.flutter(1)], ['flutter(.15)', h => h.A.flutter(.15)], ['tug(1)', h => h.A.tug(1)], ['tug(.2)', h => h.A.tug(.2)], ['lift', h => h.A.lift()]]) lv[n] = await listen(f);
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)']);
    rec(step > 0 && ['creak', 'flutter(1)', 'tug(1)', 'lift'].every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'each new sound is heard, and none is much louder than a footstep', JSON.stringify(lv));
  }

  /* ---- the last flight puts it all back: sitting when it starts, you are up, the camera is the flight's ---- */
  const fin = await C((c, d) => { d.cliff.goSit(); c.until(d => d.cliff.CL.st === 'sat', 30 * 20); c.run(60); d.startFinale(); c.run(3); const C_ = d.cliff.CL; return { st: C_.st, k: C_.k, ws: C_.ws, wk: C_.wk, fin: d.FIN.on }; });
  rec(fin.fin && fin.st === 'idle' && fin.k === 'home' && fin.ws === 0 && fin.wk === 0, 'the last flight starts with everything here put back', JSON.stringify(fin));

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

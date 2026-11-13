/* The town grows on Earth: one list of our projects' buildings in town (TOWN_GROWS), a building site on the plot marked
   'next', and a finished building for an entry marked 'built'.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/towngrows.cjs --out <dir> [--mobile] [--meter]
   The list is read and its site checked: on its plot, clear of the roads, the paths, the shore, the pier and the train,
   the lighthouse, the chipper and everything built; what grew there gone (and nothing else moved); every part of a site
   there (blockwork and its timber frame, scaffold poles and planks, the tarp, the mixer, the pallet of blocks, the fence
   of panels, the sign saying COMING SOON over Heloria Labs, the builder in his hard hat and hi-vis vest). Then: the three
   of us can still be found a way to, and walked to (with the town's traffic parked), from the landing, from the street in
   front of the site and from beside it, round whatever is in the way, without walking through anything; you cannot walk
   into the site; the tarp goes with the wind,
   more the harder it blows; by day on a weekday the site is at work now and then (taps, a saw, the mixer, the builder's
   arm and the drum going with them), softer the further off you are, and not at all at night, on a Sunday or on a
   Saturday afternoon, when the builder has gone home. Then an entry marked 'built' is added to the list and built: the
   site makes way for a finished house of the town's kit, its windows the kit's glass, its sign over the door, solid, and
   everyone still reachable. No new shader is made by any of it, and (with --meter) each of the site's sounds is heard
   and none is louder than about a footstep. The station's clock is stepped by hand, as in earth.cjs. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__G = {
      snd: [], fixed: null,
      run(n, watch) { let bad = 0; const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o) && !o.tl);
        for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); if (watch && fixed.some(o => Math.hypot(d.player.x - o.x, d.player.z - o.z) < o.r + .12)) bad++; } return bad; },
      until(src, max, watch) { const f = (0, eval)('(' + src + ')'); let i = 0, bad = 0; for (; i < max && !f(d); i++) bad += this.run(1, watch); return { frames: i, bad, done: !!f(d) }; },
      put(x, z, fx, fz, pitch, zoom) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = pitch || d.cam.PITCH; d.cam.zoom = zoom || 1; P.tgt = null; P.path = null; P.speed = 0; },
      count(name) { return this.snd.filter(s => s.n === name).length; },
      e() { return d.grow.list.find(x => x.id === 'next'); },
      P(id) { return d.grow.plot(id || 'next'); },
      /* the three of us walked over to from (fx, fz) */
      walks(from) { const out = []; for (let i = 0; i < 3; i++) { const p = d.people[i]; d.closeTalk(); d.MET.clear(); d.people.forEach(q => { q.greeted = false; q.resume = 0; }); this.put(from[0], from[1], p.x, p.z); this.run(2);
        d.goTalk(p); const u = this.until(d => !!d.talk().p, 30 * 40, true); const T = d.talk(); out.push({ who: p.first, done: u.done && T.p === p, bad: u.bad, frames: u.frames }); d.closeTalk(); this.run(10); } return out; },
      /* open ground near a place, that the path finder reaches from the landing */
      open(x, z, rs) { for (const r of rs) for (let a = 0; a < 24; a++) { const px = x + Math.cos(a / 24 * 6.283) * r, pz = z + Math.sin(a / 24 * 6.283) * r;
        if (d.grow.walkable(px, pz) && d.grow.isle(px, pz) > .03 && !d.OBS.some(o => Math.hypot(px - o.x, pz - o.z) < o.r + .45) && d.navPath(-3.2, -12, px, pz, 1.3)) return [+px.toFixed(2), +pz.toFixed(2)]; } return null; },
      /* a kit's vertices of a colour */
      col(m, hex) { const c = new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace), a = m.geometry.attributes.color.array; let n = 0; for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i] - c.r) < .004 && Math.abs(a[i + 1] - c.g) < .004 && Math.abs(a[i + 2] - c.b) < .004) n++; return n; },
      /* the tarp's foot, in the middle: how far it stands out from where it hangs */
      foot(S) { const i = S.NX / 2, j = S.NY, k = (j * (S.NX + 1) + i) * 3, p = new THREE.Vector3(S.P[k], S.P[k + 1], S.P[k + 2]), rest = S.a.clone().lerp(S.b, i / S.NX).addScaledVector(S.up, -S.L); return p.sub(rest).dot(S.n); },
    };
    for (const n of ['siteTap', 'siteSaw', 'siteMix']) { const f = h.A[n]; h.A[n] = function () { window.__G.snd.push({ n, t: h.S.t, a: [...arguments] }); return f && f.apply(this, arguments); }; }
  });
  const C = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__G, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  await H(h => { h.A.start && h.A.start(); });
  await H(h => h.ST.cr._dbg.skipCut()); await C((c, d) => { c.run(30); d.began(); c.run(10); }); await wait(400);
  const p0 = await progs();

  /* ---------- the list, and what stands on it ---------- */
  const list = await C((c, d) => ({ st: d.grow.state, list: d.grow.list.map(e => ({ ...e })), LO: d.grow.LO }));
  log('LIST ' + JSON.stringify(list.list));
  const nx = list.list.find(e => e.id === 'next');
  rec(!list.st.err && list.st.ok && list.st.skip.length === 0, 'the town grows is made, and every plot on its list is built on', JSON.stringify({ err: list.st.err, skip: list.st.skip }));
  rec(list.list.every(e => e.name && isFinite(e.x) && isFinite(e.z) && isFinite(e.yaw) && e.w > 0 && e.d > 0 && e.h > 0 && /^#/.test(e.wall) && e.sign && /^(built|next)$/.test(e.status)),
    'each entry of the list has its name, plot, turn, size, colour, sign and status', JSON.stringify(list.list.map(e => e.id + ':' + e.status)));
  rec(!!nx && nx.status === 'next' && list.st.plots.some(p => p.id === 'next' && p.kind === 'site' && p.up), 'the plot marked next is a building site', JSON.stringify(list.st.plots));
  rec(!!nx && nx.sign === 'COMING SOON' && nx.sub === 'Heloria Labs', 'its sign says COMING SOON, with Heloria Labs under it, and nothing else', JSON.stringify(nx && { sign: nx.sign, sub: nx.sub }));

  /* ---------- where it stands: clear of everything ---------- */
  const where = await C((c, d) => { const e = c.e(), P = c.P(), mine = new Set(P.obs), corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([a, b]) => d.grow.xz(e, a * e.w, b * e.d));
    const others = d.OBS.filter(o => !mine.has(o) && !o.tl && !d.people.some(p => p.ob === o) && d.grow.rectD(e, o.x, o.z) < o.r);
    const trees = d.grow.TREES.filter(([x, z]) => d.grow.rectD(e, x, z) < .6).length, ph = d.INST.ph;
    return { why: d.grow.check(e, mine), others: others.length, trees, cleared: d.grow.TG.cleared.length, clearedLeft: d.grow.TG.cleared.filter(o => d.OBS.includes(o)).length, tufts: P.tufts,
      west: +Math.min(...corners.map(q => q[0])).toFixed(2), light: +Math.min(...corners.map(q => Math.hypot(q[0] - ph.x, q[1] - ph.z))).toFixed(2), chip: +Math.min(...corners.map(q => Math.hypot(q[0] + 5.8, q[1] - 13.6))).toFixed(2),
      pad: +Math.min(...corners.map(q => Math.hypot(q[0] + 3.2, q[1] + 15.6))).toFixed(2), pier: +Math.min(...corners.map(q => Math.hypot(q[0] + 21.8, q[1] + 1.7))).toFixed(2),
      front: +d.grow.roadDist(...d.grow.xz(e, 0, e.d / 2)).toFixed(2) }; });
  rec(where.why.length === 0 && where.others === 0, 'the plot stands clear of the roads, the paths, the shore, everyone and everything built', JSON.stringify(where));
  rec(where.west > -15.3 && where.light > 8 && where.chip > 8 && where.pad > 6 && where.pier > 7, 'and well clear of the train along the west beach, the pier, the lighthouse, the chipper and the landing pad', JSON.stringify(where));
  rec(where.front - 2.2 < 1.6, 'it fronts the street, a step or two of grass back from the pavement', JSON.stringify({ fromRoadMiddle: where.front, fromPavement: +(where.front - 2.2).toFixed(2) }));
  rec(where.cleared > 0 && where.clearedLeft === 0 && where.trees === 0 && where.tufts > 0, 'what grew on the plot was left out, and its grass cut', JSON.stringify({ cleared: where.cleared, left: where.clearedLeft, trees: where.trees, tufts: where.tufts }));

  /* ---------- every part of the site ---------- */
  const parts = await C((c, d) => { const P = c.P(), k = P.kit, n = hex => Math.round(c.col(k, hex) / 36);
    let vest = 0, hat = 0; P.man.traverse(o => { if (o.isMesh && o.geometry.attributes.color) { vest += c.col(o, '#d4df3a'); hat += c.col(o, '#f3f0e6'); } });
    const sgn = new THREE.Vector3().setFromMatrixColumn(P.sign.matrix, 2).normalize(), e = c.e(), fw = d.at(...d.grow.xz(e, 0, 3)).sub(d.at(e.x, e.z)).normalize();
    return { blocks: n('#cfcac0') + n('#c4beb2') + n('#d6d1c7'), timber: n('#c9a06a'), poles: Math.round(c.col(k, '#9aa3ab') / 96), planks: n('#b48a5c') + n('#a87f53'), fence: n('#a7aeb2'), feet: n('#d9d3c6'),
      mixer: n('#c45f2a'), sand: c.col(k, '#d6c08e') > 0, drum: !!P.drum && c.col(P.drum, '#e2793a') > 0, tarp: !!P.tarp && P.tarp.m.geometry.attributes.position.count, vest, hat,
      sign: !!P.sign && !!P.sign.material.uniforms.uMap.value, faces: +sgn.dot(fw).toFixed(2), verts: k.geometry.attributes.position.count }; });
  rec(parts.blocks >= 60 && parts.timber >= 10, 'blockwork going up, with the timber frame and the gable on it', JSON.stringify({ blocks: parts.blocks, timber: parts.timber }));
  rec(parts.poles >= 15 && parts.planks >= 6, 'scaffolding: poles, and planks at two lifts', JSON.stringify({ poles: parts.poles, planks: parts.planks }));
  rec(parts.tarp > 20 && parts.drum && parts.mixer >= 3 && parts.sand && parts.feet >= 8 && parts.fence >= 40, 'a tarp, a cement mixer, a pallet of blocks and sand, and a fence of site panels round it', JSON.stringify(parts));
  rec(parts.sign && parts.faces > .9, 'the sign faces the street', JSON.stringify({ faces: parts.faces }));
  rec(parts.vest > 100 && parts.hat > 50, 'a builder in a hard hat and a hi-vis vest', JSON.stringify({ vest: parts.vest, hat: parts.hat }));

  /* ---------- by day, from the street; the sign up close ---------- */
  await C((c, d) => { d.sky.set({ time: '10:30', date: '07-14' }); d.civic.day(2); d.life.set({ wind: .6 }); const e = c.e(), [x, z] = d.grow.xz(e, -1.5, 4.5); c.put(x, z, ...d.grow.xz(e, .3, -.2), .3, 1.05); c.run(60); });
  await frames(4); await shot(pre + 'tg-site-day');
  await C((c, d) => { const e = c.e(), [px, pz] = d.grow.xz(e, -.2, 3.1), [lx, lz] = d.grow.xz(e, -.52, 1.1), [mx, mz] = d.grow.xz(e, 2.6, 3.4); c.put(mx, mz, px, pz); d.town.view(px, pz, 1.05, lx, lz, .82); c.run(20); });
  await frames(4); await shot(pre + 'tg-sign'); await C((c, d) => { d.town.view(null); c.run(4); });

  /* ---------- the way round it ---------- */
  const spots = await C((c, d) => { const e = c.e(); return { street: c.open(...d.grow.xz(e, 0, 3.0), [0, .4, .8, 1.2]), side: [[-(e.w / 2 + 1), 0], [e.w / 2 + 1, 0], [0, -(e.d / 2 + 1)]].map(([lx, lz]) => c.open(...d.grow.xz(e, lx, lz), [0, .4, .8, 1.2])).find(Boolean) || null }; });
  rec(!!spots.street && !!spots.side, 'there is open ground in front of the site and beside it, reached from the landing', JSON.stringify(spots));
  const plans = await C((c, d, h, s) => [[-3.2, -12], s.street, s.side].filter(Boolean).flatMap(f => d.people.map(p => d.navPath(f[0], f[1], p.x, p.z, 1.8) ? 1 : 0)), spots);
  rec(plans.length === 9 && plans.every(Boolean), 'the path finder finds a way to each of the three of us from the landing, the street and beside the site', JSON.stringify(plans));
  /* (walked at night, with the town's traffic parked: by day a bus can stop in the road to wait for you just as you walk
     into it, and the two of you then wait for each other for good, whatever stands by the road; that is the town's
     traffic, not the site, and is reported, not tested, here) */
  const navs = await C((c, d, h, s) => { d.sky.set({ time: '03:00', date: '07-14' }); c.run(30); const out = []; for (const f of [[-3.2, -12], s.street, s.side]) if (f) out.push(...c.walks(f)); return out; }, spots);
  rec(navs.length === 9 && navs.every(n => n.done && n.bad === 0), 'from the landing, the street and beside the site, each of the three of us can be walked to, round whatever is in the way', JSON.stringify(navs));
  /* walking straight at it: you stop at the fence */
  const into = await C((c, d) => { const e = c.e(), [x, z] = d.grow.xz(e, .3, 2.3), P = d.player; c.put(x, z, e.x, e.z); P.tgt = d.at(e.x, e.z).multiplyScalar(24); let inside = 0, min = 9;
    for (let i = 0; i < 30 * 5; i++) { c.run(1); const r = d.grow.rectD(e, P.x, P.z); min = Math.min(min, r); if (r < .02) inside++; if (!P.tgt) P.tgt = d.at(e.x, e.z).multiplyScalar(24); } P.tgt = null; c.run(5); return { inside, min: +min.toFixed(2) }; });
  rec(into.inside === 0, 'walking straight at the site, you stop at its fence and never get in', JSON.stringify(into));
  const man = await C((c, d) => { const P = c.P(), e = c.e(); return { r: +d.grow.rectD(e, ...P.manAt).toFixed(2), solid: d.OBS.filter(o => Math.hypot(o.x - P.manAt[0], o.z - P.manAt[1]) < .05).length }; });
  rec(man.r === 0, 'the builder works inside the fence, out of everyone\'s way', JSON.stringify(man));

  /* ---------- the tarp in the wind ---------- */
  const tarp = await C((c, d) => { const S = c.P().tarp, go = w => { d.life.set({ wind: w }); c.run(30 * 4); let lo = 9, hi = -9, sum = 0; for (let i = 0; i < 60; i++) { c.run(1); const f = c.foot(S); lo = Math.min(lo, f); hi = Math.max(hi, f); sum += f; } return { mean: +(sum / 60).toFixed(3), range: +(hi - lo).toFixed(3), lean: +S.lean.toFixed(3), wp: +S.wp.toFixed(2) }; };
    const strong = go(.95), calm = go(.05); d.life.set({ wind: .6 }); c.run(30); return { strong, calm }; });
  const tw = tarp.strong.wp;
  rec(tarp.strong.range > tarp.calm.range * 1.5 && tarp.strong.range > .01 && (Math.abs(tw) < .2 || (tw > 0 ? tarp.strong.mean > tarp.calm.mean + .02 : tarp.strong.mean <= tarp.calm.mean + .005)),
    'the tarp bellies and ripples the way the wind blows, more the harder it blows', JSON.stringify(tarp));

  /* ---------- at work by day, now and then ---------- */
  const near = await C((c, d) => { const e = c.e(), [x, z] = d.grow.xz(e, .8, 2.2); c.put(x, z, e.x, e.z); return [x, z]; });
  const day = await C((c, d) => { d.sky.set({ time: '10:30', date: '07-14' }); d.civic.day(2); c.run(30); const P = c.P(), n0 = { ...d.grow.TG.n }, s0 = c.snd.length; let acts = 0, was = null;
    for (let i = 0; i < 30 * 50; i++) { c.run(1); const a = P.act && P.act.what; if (a && a !== was) acts++; was = a; }
    return { acts, made: c.snd.length - s0, n: Object.fromEntries(Object.keys(n0).map(k => [k, d.grow.TG.n[k] - n0[k]])), man: P.man.visible, working: d.grow.working() }; });
  rec(day.working && day.man && day.acts >= 2 && day.made >= 2, 'on a weekday morning the site is at work now and then, and you hear it', JSON.stringify(day));
  const each = await C((c, d) => { const P = c.P(), D = P.man.userData, out = {};
    for (const w of ['siteTap', 'siteSaw', 'siteMix']) { c.run(5); while (P.act) c.run(1); const s0 = c.count(w), sp0 = P.spin; d.grow.act('next', w); let lo = 9, hi = -9;
      while (P.act) { c.run(1); lo = Math.min(lo, D.arms[0].rotation.x); hi = Math.max(hi, D.arms[0].rotation.x); }
      const s = c.snd.filter(q => q.n === w).pop(); out[w] = { heard: c.count(w) - s0, g: s ? +s.a[0].toFixed(4) : 0, arm: [+lo.toFixed(2), +hi.toFixed(2)], spin: +(P.spin - sp0).toFixed(2) }; }
    return out; });
  rec(each.siteTap.heard === 1 && each.siteTap.g > 0 && each.siteTap.arm[0] < -1.3, 'a few hammer taps, the hammer coming down on each', JSON.stringify(each.siteTap));
  rec(each.siteSaw.heard === 1 && each.siteSaw.g > 0 && each.siteSaw.arm[1] - each.siteSaw.arm[0] > .3, 'a saw, the arm going back and forth with it', JSON.stringify(each.siteSaw));
  rec(each.siteMix.heard === 1 && each.siteMix.g > 0 && each.siteMix.spin > 3, 'the mixer turning, and its drum turns', JSON.stringify(each.siteMix));
  const far = await C((c, d) => { const e = c.e(), out = []; for (const r of [2.2, 8, 13, 22]) { const [x, z] = d.grow.xz(e, .8, r); c.put(x, z, e.x, e.z); c.run(3); const P = c.P(); while (P.act) c.run(1); const s0 = c.snd.length; d.grow.act('next', 'siteTap'); const s = c.snd.slice(s0)[0];
      out.push({ r, d: d.grow.TG.last.d, g: s ? +s.a[0].toFixed(4) : 0 }); while (P.act) c.run(1); } return out; });
  rec(far[0].g > far[1].g && far[1].g > far[2].g && far[2].g > 0 && far[3].g === 0, 'softer the further off you are, and out of earshot down the road', JSON.stringify(far));

  /* ---------- quiet at night, on a Sunday, on a Saturday afternoon ---------- */
  const quiet = await C((c, d, h, near) => { const out = {}, e = c.e(); c.put(near[0], near[1], e.x, e.z);
    for (const [k, time, day] of [['night', '01:30', 2], ['sunday', '11:00', 0], ['saturday pm', '15:30', 6], ['saturday am', '10:00', 6]]) { d.sky.set({ time, date: '07-14' }); d.civic.day(day); c.run(30);
      const s0 = c.snd.length; let acts = 0; const P = c.P(); for (let i = 0; i < 30 * 30; i++) { c.run(1); if (P.act && P.act.t < 1 / 29) acts++; } out[k] = { made: c.snd.length - s0, acts, man: P.man.visible, working: d.grow.working() }; }
    d.sky.set({ time: '10:30', date: '07-14' }); d.civic.day(2); c.run(30); return out; }, near);
  rec(['night', 'sunday', 'saturday pm'].every(k => quiet[k].made === 0 && !quiet[k].man && !quiet[k].working), 'quiet at night, on a Sunday and on a Saturday afternoon, and the builder has gone home', JSON.stringify(quiet));
  rec(quiet['saturday am'].working && quiet['saturday am'].man, 'but at work on a Saturday morning', JSON.stringify(quiet['saturday am']));
  await C((c, d) => { d.sky.set({ time: '22:45', date: '07-14' }); d.civic.day(2); const e = c.e(), [x, z] = d.grow.xz(e, -1.5, 4.5); c.put(x, z, ...d.grow.xz(e, .3, -.2), .3, 1.05); c.run(60); });
  await frames(4); await shot(pre + 'tg-site-night');
  await C((c, d) => { d.sky.set({ time: '10:30', date: '07-14' }); c.run(30); });
  const p1 = await progs();
  rec(p1 === p0, 'the site makes no new shader', JSON.stringify({ before: p0, after: p1 }));

  /* ---------- an entry marked built: added to the list and built, it takes the place of the site ---------- */
  const built = await C((c, d) => { const e = c.e(), H0 = d.grow.HOUSES.length, o0 = d.OBS.length, site = c.P(), siteObs = site.obs.slice();
    const demo = { ...e, id: 'demo', name: 'A finished one', status: 'built', sign: 'NOW OPEN', sub: 'Heloria Labs', wall: '#d8e2e8', roof: '#c8664b' };
    d.grow.list.push(demo); const P = d.grow.build(demo); c.run(10);
    const glass = P ? Math.round(c.col(P.kit, '#7fa3b4') / 36) : 0, Hh = d.grow.HOUSES[d.grow.HOUSES.length - 1];
    return { made: !!P, kind: P && P.kind, up: P && P.up, skip: d.grow.TG.skip, siteUp: site.up, siteShown: site.g.visible, siteObsLeft: siteObs.filter(o => d.OBS.includes(o)).length,
      houses: d.grow.HOUSES.length - H0, plain: Hh.plain, obs: P ? P.obs.length : 0, inList: P ? P.obs.every(o => d.OBS.includes(o)) : false, glass, kit: P && P.kit.material.uniforms.uKit.value,
      sign: !!(P && P.sign), state: d.grow.state.plots }; });
  rec(built.made && built.kind === 'built' && built.up && built.skip.length === 0, 'an entry marked built is put up on its plot', JSON.stringify({ made: built.made, kind: built.kind, skip: built.skip }));
  rec(!built.siteUp && !built.siteShown && built.siteObsLeft === 0, 'the site on that ground makes way for it', JSON.stringify({ up: built.siteUp, shown: built.siteShown, left: built.siteObsLeft }));
  rec(built.houses === 1 && built.plain === false && built.glass >= 4 && built.kit === 1 && built.sign, 'it is one of the town\'s houses, with the kit\'s glass in its windows (lit at night as the rest are) and its sign over the door', JSON.stringify({ houses: built.houses, glass: built.glass, kit: built.kit }));
  rec(built.obs >= 2 && built.inList, 'it is solid, as the town\'s buildings are', JSON.stringify({ obs: built.obs }));
  const navs2 = await C((c, d, h, s) => { d.sky.set({ time: '03:00', date: '07-14' }); c.run(30); return c.walks(s.street || [-3.2, -12]); }, spots);
  rec(navs2.every(n => n.done && n.bad === 0), 'and the three of us can still be walked to from the street in front of it', JSON.stringify(navs2));
  await C((c, d) => { d.sky.set({ time: '11:00', date: '07-14' }); const e = c.e(), [x, z] = d.grow.xz(e, -1.5, 4.5); c.put(x, z, ...d.grow.xz(e, .3, -.2), .3, 1.05); c.run(60); });
  await frames(4); await shot(pre + 'tg-built-day');
  await C((c, d) => { d.sky.set({ time: '22:45', date: '07-14' }); c.run(60); });
  await frames(4); await shot(pre + 'tg-built-night');
  const p2 = await progs();
  rec(p2 === p0, 'nor does the finished building', JSON.stringify({ before: p0, after: p2 }));
  await C((c, d) => { d.sky.set({ time: '15:00', date: '07-15' }); d.civic.day(null); d.life.set({ wind: null }); c.run(10); });

  /* ---------- the sounds ---------- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 3000) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(400); return +pk.toFixed(4); };
    await H(h => { h.A.music(0); }); await wait(1500);
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['step(0) again', h => h.A.step(0)], ['step(1) again', h => h.A.step(1)],
      ['siteTap', h => h.A.siteTap()], ['siteSaw', h => h.A.siteSaw()], ['siteMix', h => h.A.siteMix()]]) lv[n] = await listen(f);
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)'], lv['step(0) again'], lv['step(1) again']);
    rec(step > 0 && ['siteTap', 'siteSaw', 'siteMix'].every(n => lv[n] > 0 && lv[n] <= step * 1.25), 'each of the site\'s sounds is heard, and none is louder than about a footstep', JSON.stringify(lv));
  }

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

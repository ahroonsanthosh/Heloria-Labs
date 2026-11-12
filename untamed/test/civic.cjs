/* The east side of town on Earth: the town hall with its clock, and the school.
   Both buildings stand and can be read from the street; the clock's hands show the time set; it strikes the hour (the right
   number of times, more softly at night) and is lit at night; the plaques by the hall's door bring up their cards; the
   children walk to school, play in the yard at break, are not about in lessons, at night or at the weekend, walk home, and
   keep out of the way between you and whoever you talk to; the school's bell rings at its times; you can still walk to every
   landmark and every one of us; nothing new is compiled when the children come out or the clock moves; the new sounds sit
   at about the footsteps' level.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/civic.cjs --out <dir> [--mobile] [--meter]
   CIVIC_VIEWS=1 takes only the views (the town from above, the street looking east by day and by night), for a build from
   before the east side was civic, to compare (their names begin before-, or with CIVIC_TAG).
   The station's clock is stepped by hand where only the logic matters; the sound is listened to in real time. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '', VIEWS = !!process.env.CIVIC_VIEWS, tag = process.env.CIVIC_TAG || (VIEWS ? 'before-' : 'after-');
  const frames = n => H((h, n) => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  await H(h => h.ST.cr._dbg.skipCut());
  /* in the page: step the station by hand; a camera placed by hand for the views (after the town's rig has placed its own) */
  await H(h => {
    const st = h.ST.cr, d = st._dbg, up = st.update;
    st.update = function (dt, t) { const r = up.apply(this, arguments); const c = window.__CAM; if (c) { st.camP.set(...c.p); st.camL.set(...c.l); h.stCam.up.set(...c.u); d.LU.uPly.value.copy(st.camP); d.LU.uFogK.value = c.fog ?? 1; h.S.stSnap = true; } return r; };
    window.__C = {
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } },
      put(x, z, fx, fz) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.tk = 0; P.tgt = null; P.path = null; P.speed = 0; },
      time(t, day) { if (day != null && d.civic) d.civic.day(day); d.sky.set({ time: t }); this.run(2); },
      /* a camera at a point of a building's frame (or of the map), looking at another */
      look(p, l, fog = 1) { const u = d.at(...d.loc(new h.T.Vector3(...p).normalize())); window.__CAM = { p, l, u: u.toArray(), fog }; },
      solid() { const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o)); return d.civic.kids().filter(k => k.vis && k.mode === 'route').map(k => { let m = 9; for (const o of fixed) m = Math.min(m, Math.hypot(k.x - o.x, k.z - o.z) - o.r); return m; }); },
    };
    if (!h.T) h.T = window.THREE;
  });
  const C = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__C, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const ui = on => page.evaluate(on => { let s = document.getElementById('civui'); if (!s) { s = document.createElement('style'); s.id = 'civui'; document.head.appendChild(s); }
    s.textContent = on ? '' : '.st-cr .card,#crLabels,.crhint,#chrome,.cre,.crcafein,.crpost,.crgo{visibility:hidden!important}'; }, on);
  const R = 24;

  /* ---------- the views: the whole town from above, the street from the square looking east, by day and by night ---------- */
  await ui(false);
  await C(e => e.time('11:05', 3));
  await C((e, d, h, a) => { window.__CAM = { p: [0, 24 + a, .01], l: [0, 24, 0], u: [0, 0, -1], fog: 0 }; }, mobile ? 70 : 44);
  await frames(3); await wait(1500); await shot(tag + pre + 'top');
  /* (a phone's picture is narrow: there the hall and the school each have a view of their own, from the same side of the square) */
  const east = [[1, 1.6, 2.0], [13, 1.6, 3.2]], views = mobile ? [['east-hall', [3.0, -1.4, 2.0], [13.3, -3.4, 4.2]], ['east-school', [2.2, 6.4, 2.0], [12.4, 7.4, 1.6]]] : [['east', ...east]];
  const look = v => C((e, d, h, a) => { const [p, l] = a; e.look(d.at(p[0], p[1]).multiplyScalar(24 + p[2]).toArray(), d.at(l[0], l[1]).multiplyScalar(24 + l[2]).toArray()); }, v);
  for (const [n, p, l] of views) { await C(e => e.time('11:05')); await look([p, l]); await frames(3); await wait(1500); await shot(tag + pre + n + '-day');
    await C(e => { e.time('21:30'); }); await C((e, d) => d.sky.step(1)); await frames(3); await wait(1800); await shot(tag + pre + n + '-night'); }
  await C((e, d, h, a) => { e.time('21:30'); window.__CAM = { p: [0, 24 + a, .01], l: [0, 24, 0], u: [0, 0, -1], fog: 0 }; }, mobile ? 70 : 44);
  await frames(3); await wait(1500); await shot(tag + pre + 'top-night');
  if (VIEWS) { await C(() => { window.__CAM = null; }); console.log('\nSUMMARY views only'); return; }

  /* ---------- both buildings stand, and read from the street ---------- */
  const built = await C((e, d) => { const c = d.civic; return c ? { err: c.err, routes: c.routes, bad: c.routeBad, kids: c.kids().length, tufts: c.state.tufts } : null; });
  rec(!!built && !built.err && built.routes.length === 3 && built.kids === 6, 'the town hall and the school are built, with six children and their ways to school', JSON.stringify(built));
  rec(!!built && built.bad.length === 0, 'every way the children walk is clear on the walking grid', JSON.stringify(built && built.bad));
  await C(e => e.time('15:40', 3));
  /* from the east edge of the square, at eye height, looking at each in turn */
  const read = {}; for (const [k, which, at, half] of [['clock', 'hall', null, .47], ['sign', 'school', [-.35, 1.55, 2.6], .17], ['hall', 'hall', [0, 3.46, 1.45], .12]]) {
    await C((e, d, h, [which, at]) => { const c = d.civic, t = at ? c.world(which, ...at) : c.face(0); e.look(d.at(2.4, which === 'hall' ? -.6 : 2.6).multiplyScalar(24 + 1.7).toArray(), t); }, [which, at]); await frames(3); await wait(500);
    read[k] = await C((e, d, h, [which, at, half]) => { h.stCam.updateMatrixWorld(); const T = h.T, sc = h.ST.cr.scene, ray = new T.Raycaster(), cam = h.stCam.position.clone();
    const see = (pt, half) => { const P = new T.Vector3(...pt), v = P.clone().project(h.stCam), on = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      const a = P.clone().addScaledVector(h.stCam.up, half).project(h.stCam), b = P.clone().addScaledVector(h.stCam.up, -half).project(h.stCam), px = Math.abs(a.y - b.y) * .5 * innerHeight;
      ray.set(cam, P.clone().sub(cam).normalize()); ray.layers.set(0); const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; }, hit = ray.intersectObjects(sc.children, true).find(x => shown(x.object)); const clear = !!hit && hit.distance > cam.distanceTo(P) - .2;
      return { on, px: +px.toFixed(1), clear, from: +cam.distanceTo(P).toFixed(1), by: hit && hit.distance < cam.distanceTo(P) - .2 ? (hit.object.type + ' at ' + hit.distance.toFixed(1)) : null }; };
    return see(at ? d.civic.world(which, ...at) : d.civic.face(0), half); }, [which, at, half]); }
  rec(read.clock.on && read.clock.clear && read.clock.px > (mobile ? 14 : 22), 'from the square the clock face is in view, unhidden, big enough to read', JSON.stringify(read.clock));
  rec(read.sign.on && read.sign.clear && read.sign.px > 6, 'and so is the school\'s name over its gate', JSON.stringify(read.sign));
  rec(read.hall.on && read.hall.clear, 'and the hall\'s lettering over its door', JSON.stringify(read.hall));

  /* ---------- the clock: its hands at the time set, lit at night ---------- */
  for (const [t, eh, em] of [['09:15', 277.5, 90], ['15:40', 110, 240], ['21:30', 285, 180]]) {
    const hd = await C((e, d, h, t) => { e.time(t); return d.civic.hands(); }, t);
    const dd = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
    rec(dd(hd.h, eh) < 1 && dd(hd.m, em) < 1, 'at ' + t + ' the hands read ' + t, JSON.stringify({ hands: hd, want: { h: eh, m: em } }));
    if (t !== '09:15') { await C((e, d) => { const c = d.civic, f = c.face(0), p = c.world('hall', 1.6, 4.4, 7.2); e.look(p, f); d.sky.step(1); }); await frames(3); await wait(1200); await shot(pre + (t === '21:30' ? 'clock-night' : 'clock')); }
  }
  const lit = await C((e, d) => ({ night: d.LU.uNight.value, glow: /uNight\*\.85/.test(d.civic.CIV.face.material.fragmentShader) }));
  rec(lit.night > .9 && lit.glow, 'at night the clock faces are lit from inside', JSON.stringify(lit));

  /* ---------- the hour: struck as many times as the hour, softly; more softly at night; nothing when the clock is set by hand ---------- */
  const strike = async (a, b) => C((e, d, h, [a, b]) => { e.time(a); const s0 = d.civic.state.struck; e.time(b); e.run(30 * 16); const s = d.civic.state; return { chime: s.chime, struck: s.struck - s0, last: s.log[s.log.length - 1] }; }, [a, b]);
  const ten = await strike('09:59', '10:00');
  rec(ten.chime && ten.chime.n === 10 && ten.chime.k === 10 && ten.struck === 10 && !ten.chime.night, 'at ten o\'clock the clock strikes ten times', JSON.stringify(ten));
  const one = await strike('12:59', '13:00');
  rec(one.chime && one.chime.n === 1 && one.struck === 1, 'at one o\'clock, once', JSON.stringify(one));
  const eleven = await strike('22:59', '23:00');
  rec(eleven.chime && eleven.chime.n === 11 && eleven.struck === 11 && eleven.chime.night && eleven.chime.g < ten.chime.g * .5, 'at eleven at night it strikes eleven times, more softly', JSON.stringify({ eleven, day: ten.chime && ten.chime.g }));
  const jump = await C((e, d) => { const n = d.civic.CIV.log.length, s0 = d.civic.state.struck; e.time('09:00'); e.run(60); e.time('16:00'); e.run(60); return { added: d.civic.CIV.log.length - n, struck: d.civic.state.struck - s0 }; });
  rec(jump.added === 0 && jump.struck === 0, 'setting the clock to a new hour by hand strikes nothing', JSON.stringify(jump));

  /* ---------- the school's bell: in at ten to nine, out at eleven, home at three; not on a Saturday ---------- */
  const bell = async (a, b, day) => C((e, d, h, [a, b, day]) => { e.time(a, day); e.run(2); const n = d.civic.CIV.bells.length; e.time(b); e.run(2); const B = d.civic.CIV.bells; return { rang: B.length - n, last: B[B.length - 1] }; }, [a, b, day]);
  for (const [a, b, want] of [['08:49', '08:50', 8.833], ['10:59', '11:00', 11], ['11:19', '11:20', 11.333], ['14:59', '15:00', 15]]) {
    const r = await bell(a, b, 3); rec(r.rang === 1 && Math.abs(r.last.h - want) < .01, 'on a Wednesday the school bell rings at ' + b, JSON.stringify(r)); }
  const sat = await bell('10:59', '11:00', 6); rec(sat.rang === 0, 'on a Saturday it does not', JSON.stringify(sat));
  const quiet = await bell('10:00', '10:00', 3); rec(quiet.rang === 0, 'and not in the middle of a lesson', JSON.stringify(quiet));

  /* ---------- the children ---------- */
  const seen = async (t, day, n = 45) => C((e, d, h, [t, day, n]) => { e.time(t, day); e.run(4); const a = d.civic.kids(); e.run(n); const b = d.civic.kids();
    return b.map((k, i) => ({ i, vis: k.vis, mode: k.mode, to: k.to, moved: +Math.hypot(k.x - a[i].x, k.z - a[i].z).toFixed(2), lx: k.lx, lz: k.lz, pose: k.pose })); }, [t, day, n]);
  const walkIn = await seen('08:30', 3);
  const wi = walkIn.filter(k => k.vis && k.mode === 'route' && k.to === 'school' && k.moved > .3);
  rec(wi.length >= 3, 'at half past eight on a Wednesday the children are walking to school', wi.length + ' walking: ' + JSON.stringify(walkIn.map(k => [k.vis, k.mode, k.to, k.moved])));
  const through = await C(e => { let bad = 0, min = 9, n = 0; for (let i = 0; i < 30 * 25; i++) { e.run(1); const s = e.solid(); n += s.length; for (const m of s) { min = Math.min(min, m); if (m < .02) bad++; } } return { bad, min: +min.toFixed(3), samples: n }; });
  rec(through.bad === 0 && through.samples > 100, 'on their way they never walk through anything', JSON.stringify(through));
  await C((e, d) => { d.civic.place(); e.run(20); }); const shotW = await C((e, d) => { const k = d.civic.kids().find(k => k.vis && k.mode === 'route'); return k ? [k.x, k.z] : null; });
  if (shotW) { await C((e, d, h, w) => { const p = d.at(w[0] - 2.2, w[1] + 2.6).multiplyScalar(24 + 2.2).toArray(), l = d.at(w[0], w[1]).multiplyScalar(24 + .5).toArray(); e.look(p, l); }, shotW); await frames(3); await wait(1200); await shot(pre + 'walk-to-school'); }

  const yard = await seen('11:05', 3, 90);
  const inYard = yard.filter(k => k.vis && k.lx > -2.15 && k.lx < 3.3 && k.lz > -1.4 && k.lz < 2.6);
  rec(inYard.length >= 5, 'at five past eleven they are out in the yard', JSON.stringify(yard.map(k => [k.vis, k.mode, k.lx, k.lz])));
  const play = await C(e => { const poses = new Set(), moved = {}; let ball = false; const a = window.__heloria.ST.cr._dbg.civic.kids(); for (let i = 0; i < 30 * 8; i++) { e.run(1); const k = window.__heloria.ST.cr._dbg.civic.kids(); k.forEach(q => { if (q.pose) poses.add(q.pose); }); if (window.__heloria.ST.cr._dbg.civic.state.ball) ball = true; }
    const b = window.__heloria.ST.cr._dbg.civic.kids(); b.forEach((k, i) => { moved[k.act] = Math.max(moved[k.act] || 0, Math.hypot(k.lx - a[i].lx, k.lz - a[i].lz)); }); return { poses: [...poses], ball, moved }; });
  rec((play.poses.includes('one') || play.poses.includes('two')) && play.ball && play.moved.chase > .5, 'and playing: hopscotch, a ball, a chase round the climbing frame', JSON.stringify(play));
  await C((e, d, h, m) => { const c = d.civic, p = c.world('school', m ? 1.1 : 1.3, m ? 4.4 : 3.1, m ? 7.8 : 6.3), l = c.world('school', 1.0, .2, .9); e.look(p, l); }, mobile); await frames(3); await wait(1500); await shot(pre + 'yard');
  const lesson = await seen('10:00', 3); rec(lesson.every(k => !k.vis), 'at ten, in lessons, none of them is to be seen', JSON.stringify(lesson.map(k => k.vis)));
  const night = await seen('21:30', 3); rec(night.every(k => !k.vis), 'at night none', JSON.stringify(night.map(k => k.vis)));
  const satK = []; for (const t of ['08:30', '11:05', '15:10']) satK.push(...(await seen(t, 6, 10)).filter(k => k.vis));
  rec(satK.length === 0, 'and none on a Saturday, morning, break or afternoon', JSON.stringify(satK));
  const home = await seen('15:10', 3);
  const wh = home.filter(k => k.vis && k.mode === 'route' && k.to === 'home' && k.moved > .3);
  rec(wh.length >= 3, 'at ten past three they are walking home', wh.length + ' walking: ' + JSON.stringify(home.map(k => [k.vis, k.mode, k.to, k.moved])));

  /* talking to Michael on the pavement where the children pass: they wait at the edge of the way between you, and go on after */
  const corr = await C((e, d) => { const c = d.civic, m = d.people[1], n = c.near(1, true, m.x, m.z), dx = n.x - m.x, dz = n.z - m.z, L = Math.hypot(dx, dz) || 1;
    e.time('08:30', 3); d.civic.kids().forEach((k, i) => { if (i) d.civic.CIV.kids[i].g.visible = false; }); c.CIV.kids.slice(1).forEach(k => { k.vis = false; k.mode = 'gone'; k.tm = 1e9; });
    const far = Math.max(2.4, n.d + 1.2); e.put(m.x + dx / L * far, m.z + dz / L * far, m.x, m.z); d.openTalk(m); c.put(0, 1, true, Math.max(0, n.s - 4));
    const seg = [d.player.x, d.player.z, m.x, m.z], dist = k => { const ex = seg[2] - seg[0], ez = seg[3] - seg[1], t = Math.max(0, Math.min(1, ((k.x - seg[0]) * ex + (k.z - seg[1]) * ez) / (ex * ex + ez * ez))); return Math.hypot(k.x - seg[0] - ex * t, k.z - seg[1] - ez * t); };
    let min = 9; for (let i = 0; i < 30 * 10; i++) { e.run(1); const k = c.kids()[0]; if (k.vis) min = Math.min(min, dist(k)); }
    const held = c.kids()[0]; d.closeTalk(); e.put(m.x - dx / L * 9, m.z - dz / L * 9, m.x, m.z); e.run(30 * 8); const after = c.kids()[0];
    return { gap: +n.d.toFixed(2), min: +min.toFixed(2), held: held.s, at: n.s, talking: !!d.talk().p, after: { s: after.s, mode: after.mode, vis: after.vis } }; });
  rec(corr.min > .5 && corr.held < corr.at, 'while you talk to Michael, a child on the way waits at the edge of the way between you', JSON.stringify(corr));
  rec(corr.after.s > corr.at + 1 || corr.after.mode === 'gone', 'and goes on once you are done', JSON.stringify(corr.after));

  /* ---------- the plaques: a click brings up the card; Escape puts it away; the blank one says nothing ---------- */
  await C(e => { window.__CAM = null; e.time('15:40', 3); });
  await C((e, d) => { const c = d.civic, [x, z] = c.xz('hall', -.7, 3.1), [fx, fz] = c.xz('hall', -1.13, 1.4); e.put(x, z, fx, fz); d.cam.zoom = .75; e.run(90); });
  await frames(6); await wait(600);
  const scr = await C((e, d, h) => { h.stCam.updateMatrixWorld(); return [0, 1, 2].map(i => { const v = new h.T.Vector3(...d.civic.plaque(i)).project(h.stCam); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight, v.z]; }); });
  const tap = async ([x, y]) => { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await frames(2); };
  const card = () => page.evaluate(() => { const c = document.querySelector('.crplq'); return { on: c.classList.contains('on'), n: c.querySelector('.crpj-n').textContent, k: c.querySelector('.crpj-k').textContent, t: c.querySelector('.crpj-t').textContent }; });
  await tap(scr[0]); const c0 = await card();
  rec(c0.on && c0.n === 'Andrena Ventures' && /backed by Andrena Ventures/.test(c0.t), (mobile ? 'a tap' : 'a click') + ' on the top plaque brings up its card: backed by Andrena Ventures', JSON.stringify({ scr: scr[0].map(v => +v.toFixed(1)), c0 }));
  await wait(500); await ui(true); await shot(pre + 'plaque'); await ui(false);
  if (!mobile) { await page.keyboard.press('Escape'); const ce = await card(); rec(!ce.on, 'Escape puts it away', JSON.stringify(ce)); } else { await tap([vp.width * .5, vp.height * .9]); const ce = await card(); rec(!ce.on, 'a tap elsewhere puts it away', JSON.stringify(ce)); }
  await tap(scr[1]); const c1 = await card(); rec(c1.on && c1.n === 'Heloria Labs' && /Ireland/.test(c1.k + c1.t), 'the second says where we are: a software lab in Ireland', JSON.stringify(c1));
  await tap(scr[2]); const c2 = await card(); rec(!c2.on, 'the blank one brings up nothing', JSON.stringify(c2));
  await tap(scr[1]); const away = await C((e, d) => { e.put(4, -5, 0, 0); e.run(10); return document.querySelector('.crplq').classList.contains('on'); });
  rec(!away, 'walking off puts the card away');

  /* ---------- the way to every landmark and every one of us, from the pad and from the hall's steps ---------- */
  const nav = await C((e, d) => { const c = d.civic, from = { pad: [-3.2, -12], hall: c.xz('hall', 0, 3.0), yard: c.xz('school', 1.0, 2.0) }, out = {};
    const goals = { ...Object.fromEntries(Object.entries(d.INST).map(([k, q]) => [k, [q.x, q.z, Math.max(1.2, q.r * .8)]])), ...Object.fromEntries(d.people.map(p => [p.first, [p.x, p.z, 1.8]])), Diarmuid: [...d.busk.spot, 1.8],
      bench: [...d.cliff.M.sitA, 1.3], kite: [...d.cliff.M.kiteA, 1.3], school: [...c.xz('school', -.35, 2.95), 1.2] };
    for (const [f, [fx, fz]] of Object.entries(from)) for (const [g, [gx, gz, r]] of Object.entries(goals)) { const p = d.navPath(fx, fz, gx, gz, r); out[f + '>' + g] = p ? p.length : null; }
    return out; });
  const miss = Object.entries(nav).filter(([, v]) => v === null).map(([k]) => k);
  rec(miss.length === 0, 'there is a way to every landmark, each of us, Diarmuid and the cliff, from the pad, the hall and the school yard', miss.length ? 'none for ' + miss.join(', ') : Object.keys(nav).length + ' ways');
  await C((e, d) => { d.closeTalk(); const [x, z] = d.civic.xz('hall', 0, 3.0); e.put(x, z, 0, 0); d.MET.clear(); d.people.forEach(p => { p.greeted = false; }); e.run(4); d.closeTalk(); });
  const walk = await C((e, d) => { d.goTalk(d.people[1]); let bad = 0, i = 0; const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o)); for (; i < 30 * 40 && !d.talk().p; i++) { e.run(1); const P = d.player; if (fixed.some(o => Math.hypot(P.x - o.x, P.z - o.z) < o.r + .12)) bad++; } return { frames: i, bad, talk: d.talk().p && d.talk().p.first }; });
  rec(walk.talk === 'Michael' && walk.bad === 0, 'from the hall\'s steps, clicking Michael walks you past the school to him, through nothing', JSON.stringify(walk));
  await C((e, d) => d.closeTalk());

  /* ---------- nothing new compiled when the children come out or the clock moves ---------- */
  await C((e, d) => { e.time('10:00', 3); const c = d.civic, p = c.world('school', 1.4, 2.4, 5.4), l = c.world('school', .9, .3, 1.0); e.look(p, l); });
  await frames(4); await wait(400);
  const pg0 = await H(h => h.renderer.info.programs.length);
  await C(e => e.time('11:05')); await frames(4); await C(e => e.time('15:40')); await frames(3); await C(e => e.time('08:30')); await frames(3); await C(e => e.time('21:30')); await frames(3); await C(e => e.time('11:05')); await frames(3);
  const pg1 = await H(h => h.renderer.info.programs.length);
  rec(pg1 === pg0, 'no shader is made when the children come out, or as the clock moves', pg0 + ' programs before, ' + pg1 + ' after');
  await C(() => { window.__CAM = null; });

  /* ---------- how loud: each new sound beside the footsteps, with the town's music stopped so only it is heard ---------- */
  const has = await page.evaluate(() => !!window.__meter);
  if (has) {
    await H(h => { h.__st = h.S.st; h.S.st = null; h.A.hush(); }); await wait(2500);
    const G = await H(h => h.ST.cr._dbg.civic.CGAIN);
    const lv = await page.evaluate(async G => { const A = window.__heloria.A, W = ms => new Promise(r => setTimeout(r, ms)), out = {};
      const meas = async (name, f) => { await W(500); f(); let pk = 0, db = -200; const t0 = performance.now(); while (performance.now() - t0 < 1600) { const m = window.__meter(); pk = Math.max(pk, m.pk); db = Math.max(db, m.db); await W(20); } out[name] = { pk: +pk.toFixed(4), db }; };
      await meas('silence', () => {});
      await meas('step (pavement)', () => A.step(1)); await meas('step (grass)', () => A.step(0));
      /* each at its loudest in town (beside it), as the station plays it */
      await meas('town clock, by day', () => A.townBell(G.clock)); await meas('town clock, at night', () => A.townBell(G.clock * G.night));
      await meas('school bell', () => A.schoolBell(G.bell)); await meas('child\'s step', () => A.kidStep(G.step)); await meas('ball', () => A.ballBounce(G.ball));
      return out; }, G);
    await H(h => { h.S.st = h.__st; });
    for (const [k, v] of Object.entries(lv)) log(('  ' + k).padEnd(26), 'peak', String(v.pk).padEnd(8), 'loudest', v.db, 'dB');
    const ref = Math.max(lv['step (pavement)'].db, lv['step (grass)'].db), refPk = Math.max(lv['step (pavement)'].pk, lv['step (grass)'].pk);
    const ours = ['town clock, by day', 'school bell', 'child\'s step', 'ball'];
    rec(ours.every(k => lv[k].db <= ref + 3 && lv[k].pk <= refPk * 1.6), 'the new sounds are no louder than a footstep (within 3 dB)', ours.map(k => k + ' ' + lv[k].db + ' dB').join(', ') + ' against footsteps ' + ref + ' dB');
    rec(ours.every(k => lv[k].db > lv.silence.db + 6 && lv[k].db > ref - 15), 'and each is heard, none much under a footstep', JSON.stringify(lv.silence));
    rec(lv['town clock, at night'].db < lv['town clock, by day'].db - 6, 'the clock at night is well under the clock by day', lv['town clock, at night'].db + ' against ' + lv['town clock, by day'].db + ' dB');
  } else log('(no --meter: the levels are not measured)');

  /* ---------- by night: the hall's lanterns and clock lit, the children home ---------- */
  await C((e, d) => { e.time('21:30', 3); d.sky.step(1); const c = d.civic, p = c.world('hall', -.6, 2.2, 7.4), l = c.world('hall', 0, 3.4, 0); e.look(p, l); });
  await frames(3); await wait(1800); await shot(pre + 'hall-night');
  await C(() => { window.__CAM = null; }); await ui(true);

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

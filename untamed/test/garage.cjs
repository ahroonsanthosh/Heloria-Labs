/* The workshop on Earth: its shutter opens on the garage, and you go in and look round.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/garage.cjs --out <dir> [--mobile] [--query time=21:30] [--meter]
   From across the street a click (a tap) on the shutter walks you over and it rolls up: the motor, a click for each slat
   over the drum, the clank at the top, the strip lights flickering on. Walk away and it rolls down again; E beside it (on a
   phone, its tag) opens it again. Then in: walking into it on a computer, its tag on a phone; the camera comes down behind
   you and through the opening into your own eyes, never through a wall, the roof, the van or anything else, and you never
   walk through anything on the way. Inside: nothing of the street over the room (no postcard either), a way out, the music a
   little quieter; drag (and on a computer the arrows) to look round. Out again by Escape (a phone: the button), and by a
   tap on the way out; back on the pavement with the walking camera. The last flight from inside, or just after opening it,
   puts it all back. Opening it compiles nothing new (its shaders were made with Earth's). Inside, the big red button on
   the bench (a click or a tap on it, or Space or Enter) runs a test fire of the rocket in the van: the warning, the coughs,
   the roar, the flame with its shock diamonds out through the shutter, smoke billowing out, things shaking, the smoke alarm
   after; it compiles nothing either, it can be run again once it is over, and walking out mid-fire, the last flight or
   leaving Earth stops it. With --meter it listens to each of its sounds (the test fire's too) against a footstep. The
   station's clock is stepped by hand where timing is not the point, as in earth.cjs. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '', cdp = mobile ? await page.context().newCDPSession(page) : null;
  /* in the page: step the station, and while it steps watch for the camera inside a wall or a solid thing, and you inside
     anything; put the player somewhere; and keep a log of the workshop's sounds */
  await H(h => {
    const st = h.ST.cr, d = st._dbg, g = d.garage, GW = g.GW, G = g.G;
    const ix = GW.w / 2 - GW.t, iz = GW.d / 2 - GW.t, x0 = GW.ox - GW.ow / 2, x1 = GW.ox + GW.ow / 2;
    /* the workshop's own obstacles (it is solid from outside) and anyone's are not what this is about */
    const mine = o => Math.hypot(o.x - G.x, o.z - G.z) < 2.6 && o.r > 1;
    window.__W = {
      snd: [], badCam: [], badMe: [], fixed: null,
      cam() { const p = g.toLocal(st.camP); const inRoom = Math.abs(p.x) < ix - .02 && Math.abs(p.z) < iz - .02 && p.y > GW.FL + .1 && p.y < GW.h - .05;
        const inOpening = p.x > x0 + .02 && p.x < x1 - .02 && p.y < GW.ot - .02 && p.y > GW.FL + .1 && p.z > iz - .1 && p.z < GW.d / 2 + .3;
        const inShell = Math.abs(p.x) < GW.w / 2 + .03 && Math.abs(p.z) < GW.d / 2 + .03 && p.y < GW.h + .3;
        if (inShell && !inRoom && !inOpening) return 'wall ' + [p.x, p.y, p.z].map(v => v.toFixed(2));
        for (const s of g.solids) if (p.x > s[0] && p.x < s[1] && p.z > s[2] && p.z < s[3] && p.y < GW.FL + s[4]) return 'solid ' + s.map(v => +v.toFixed(2)) + ' at ' + [p.x, p.y, p.z].map(v => v.toFixed(2));
        return null; },
      me() { if (!d.player || !window.__heloria) return null; const P = d.player, fx = this.fixed || (this.fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o) && !mine(o)));
        if (G.on) return null;   // (walking in or out, you are the figure: its way is checked against what is in there, below)
        return fx.some(o => Math.hypot(P.x - o.x, P.z - o.z) < o.r + .12) ? 'you at ' + P.x.toFixed(2) + ',' + P.z.toFixed(2) : null; },
      run(n, watch) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); if (watch) { const c = this.cam(); if (c && G.k > .5) this.badCam.push(c); const m = this.me(); if (m) this.badMe.push(m); } } },
      until(src, max, watch) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(g, d); i++) this.run(1, watch); return { frames: i, done: f(g, d) }; },
      put(lx, lz, fx, fz) { const [x, z] = g.local(lx, lz), P = d.player, t = d.at(...g.local(fx, fz)); P.x = x; P.z = z; P.u.copy(d.at(x, z)); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      count(n) { return this.snd.filter(s => s.n === n).length; },
      lastMusic: null,
    };
    for (const n of ['shutterMotor', 'ratchet', 'shutterEnd', 'tube', 'step', 'tfClick', 'tfBeep', 'tfPop', 'tfRoar', 'tfChirp', 'tfThud', 'tfTink', 'tfHush']) { const f = h.A[n]; h.A[n] = function () { window.__W.snd.push({ n, t: h.S.t }); return f.apply(this, arguments); }; }
    { const f = h.A.music; h.A.music = function (v) { window.__W.lastMusic = v; return f.apply(this, arguments); }; }
  });
  const W = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__W, h.ST.cr._dbg.garage, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const state = () => W((w, g) => g.state);
  const tf = () => W((w, g) => g.tf);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }, sel);
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 30000 }); else await page.click(sel, { timeout: 30000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const tagEl = () => page.evaluate(() => { const e = document.querySelector('#crLabels .crwt'), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    return { txt: e.textContent, on: e.classList.contains('on'), can: e.classList.contains('can'), xy: [x, y], top: !!top && (top === e || e.contains(top)) }; });
  const drag = async (x0, y0, dx, steps = 8) => { if (mobile) await touch('touchStart', x0, y0); else { await page.mouse.move(x0, y0); await page.mouse.down(); }
    for (let i = 1; i <= steps; i++) { const x = x0 + dx * i / steps; if (mobile) await touch('touchMove', x, y0); else await page.mouse.move(x, y0); await W(w => w.run(1)); }
    if (mobile) await touch('touchEnd'); else await page.mouse.up(); };
  await H(h => { h.A.start && h.A.start(); });
  await H(h => h.ST.cr._dbg.skipCut()); await W(w => w.run(30)); await wait(400);

  /* ---- before: the shutter shut, nothing inside drawn, the landmark as it was ---- */
  const b0 = await W((w, g, d) => ({ ...g.state, beacon: !!d.MK.be && d.MK.be.st === 'on', inst: !!d.INST.be, err: g.err }));
  rec(b0.shSt === 'shut' && !b0.vis && !b0.pool && b0.beacon && b0.inst && !b0.err, 'before: the shutter is down and nothing inside is drawn; the Beacon stands on the roof', JSON.stringify(b0));

  /* ---- from across the street: a click (a tap) on the shutter walks you over, and it goes up ---- */
  await W(w => { w.put(.9, 7.2, .7, 0); w.run(45); }); await frames(4);
  const sxy = await W((w, g) => g.screen('shutter'));
  rec(sxy[2] < 1 && sxy[0] > 0 && sxy[0] < vp.width && sxy[1] > 0 && sxy[1] < vp.height, 'the shutter is on the screen', JSON.stringify(sxy.map(v => +v.toFixed(2))));
  await shot(pre + 'garage-1-shut');
  const prog0 = await H(h => h.renderer.info.programs.length);   // (what has been compiled so far, the workshop shut and on the screen)
  await tap(sxy[0], sxy[1]);
  let s = await state(); rec(s.st === 'go' || s.shSt === 'up', (mobile ? 'a tap' : 'a click') + ' on the shutter from across the street sets you walking over to it', JSON.stringify({ st: s.st, shSt: s.shSt, da: s.da }));
  const walk = await W(w => { const r = w.until((g) => g.G.shSt !== 'shut', 30 * 20, true); return { ...r, bad: w.badMe.slice(0, 3) }; });
  rec(walk.done && walk.bad.length === 0, 'you get there without walking through anything, and it starts to go up', JSON.stringify(walk));
  s = await state(); rec(s.shSt === 'up' && await W(w => w.count('shutterMotor')) === 1, 'the motor starts as it goes up', JSON.stringify({ shSt: s.shSt, motor: await W(w => w.count('shutterMotor')) }));
  await W(w => w.run(30)); await frames(3); await shot(pre + 'garage-2-opening');
  const op = await W((w, g) => { const r = w.until(g => g.G.shSt === 'open', 30 * 6); w.run(20); return { ...r, st: g.state, ratchet: w.count('ratchet'), end: w.count('shutterEnd'), tube: w.count('tube') }; });
  rec(op.done && op.st.sh === 1 && op.ratchet >= 10 && op.end === 1, 'it rolls up all the way: a click as each slat goes over the drum, and a clank at the top', JSON.stringify({ done: op.done, sh: op.st.sh, ratchet: op.ratchet, end: op.end }));
  rec(op.st.tubes.every(v => v === 1) && op.st.lamp > .9 && op.tube >= 3 && op.st.vis, 'inside, the strip lights flicker and catch, each with its tink, and the room is there', JSON.stringify({ tubes: op.st.tubes, lamp: op.st.lamp, tube: op.tube }));
  const progOpen = await H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  rec(progOpen === prog0, 'opening it compiles no new shader (they were made ready with the rest of Earth)', prog0 + ' then ' + progOpen);
  await frames(4); await shot(pre + 'garage-3-open');
  let tg = await tagEl(); rec(tg.on && tg.txt === 'Go in' && tg.top, 'its tag now says Go in', JSON.stringify(tg));
  /* the landmark's card, beside it: how to reach us */
  const pj = await page.evaluate(() => { const e = document.querySelector('#crProj'); return { n: e.querySelector('.crpj-n').textContent, t: e.querySelector('.crpj-t').textContent, href: e.getAttribute('href') }; });
  rec(pj.n === 'Heloria Labs' && /contact@helorialabs\.com/.test(pj.t) && pj.href === 'mailto:contact@helorialabs.com', 'the workshop\'s card says to email contact@helorialabs.com', JSON.stringify(pj));

  /* ---- walk away and it rolls down after a moment; E (or the tag) beside it opens it again ---- */
  await W(w => { w.snd = []; w.put(.6, 10.2, .7, 20); w.run(15); });
  const cl = await W((w, g) => { const s1 = g.G.shSt; const r = w.until(g => g.G.shSt === 'shut', 30 * 8); w.run(5); return { s1, ...r, st: g.state, motor: w.count('shutterMotor'), end: w.count('shutterEnd'), ratchet: w.count('ratchet') }; });
  rec(cl.done && cl.motor === 1 && cl.end === 1 && cl.ratchet >= 10, 'walking away, it rolls down behind you, with its sound', JSON.stringify(cl));
  rec(!cl.st.vis && cl.st.tubes.every(v => v === 0) && !cl.st.lit, 'down, the lights are off and nothing inside is drawn', JSON.stringify(cl.st));
  await W(w => { w.put(.15, 2.4, .7, 0); w.run(30); }); await frames(4);   // (the tag follows the camera as the page draws it)
  tg = await tagEl(); rec(tg.on && tg.can && tg.txt === 'Open' && tg.top, 'beside it, its tag says Open, and how', JSON.stringify(tg));
  if (mobile) await page.touchscreen.tap(tg.xy[0], tg.xy[1]); else await page.keyboard.press('KeyE');
  s = await state(); rec(s.shSt === 'up', (mobile ? 'tapping its tag' : 'E beside it') + ' opens it again', s.shSt);
  await W(w => w.until(g => g.G.shSt === 'open', 30 * 6));

  /* ---- in: walking into it on a computer, its tag on a phone ---- */
  await W(w => { w.badCam = []; w.badMe = []; w.put(.25, 3.0, .25, 0); w.run(10); });
  if (!mobile) { await page.keyboard.down('KeyW'); await W(w => w.until(g => g.G.st !== 'out', 90)); await page.keyboard.up('KeyW'); }
  else { await W(w => w.run(10)); await frames(4); tg = await tagEl(); if (tg.on) await page.touchscreen.tap(tg.xy[0], tg.xy[1]); }
  s = await state(); rec(s.st === 'enter', mobile ? 'tapping Go in takes you in' : 'walking into the open shutter takes you in', JSON.stringify({ st: s.st, you: s.you }));
  await W(w => w.run(40, true)); await frames(3); await shot(pre + 'garage-4-going-in');
  const inn = await W(w => { const r = w.until(g => g.G.st === 'in', 30 * 5, true); w.run(20, true); return { ...r, cam: w.badCam.slice(0, 3), me: w.badMe.slice(0, 3) }; });
  s = await state();
  rec(inn.done && s.st === 'in' && !s.me && s.near === .02, 'you are in, in your own eyes (your figure is not drawn), with a nearer lens', JSON.stringify({ ...inn, me: s.me, near: s.near }));
  rec(inn.cam.length === 0, 'on the way in the camera never goes through a wall, the roof, the van or anything in there', JSON.stringify(inn.cam));
  /* the way you walked in: never through anything in there */
  const path = await W((w, g) => { const W_ = [[.25, 3.0], ...g.GW.WAY, g.GW.S], bad = []; for (let i = 0; i < W_.length - 1; i++) for (let k = 0; k <= 20; k++) { const t = k / 20, x = W_[i][0] + (W_[i + 1][0] - W_[i][0]) * t, z = W_[i][1] + (W_[i + 1][1] - W_[i][1]) * t;
      for (const s of g.solids) if (x > s[0] - .16 && x < s[1] + .16 && z > s[2] - .16 && z < s[3] + .16) bad.push([x, z].map(v => +v.toFixed(2)) + ' in ' + s.map(v => +v.toFixed(2))); } return bad.slice(0, 3); });
  rec(path.length === 0, 'and the way you walk in passes nothing in there', JSON.stringify(path));
  /* nothing of the street over the room, the postcard neither; a way out */
  const quiet = await page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
    return { labels: vis(document.querySelector('#crLabels')), card: vis(document.querySelector('#crProj')), hint: vis(document.querySelector('#crHint')) && !document.querySelector('#crHint').classList.contains('gone'), go: vis(document.querySelector('#crGo')), leave: vis(document.querySelector('#crWsLeave')), post: vis(document.querySelector('#crPost')) }; });
  rec(!quiet.labels && !quiet.card && !quiet.hint && !quiet.go, 'nothing of the street is drawn over the room: no name tags, no landmark card', JSON.stringify(quiet));
  rec(quiet.leave && !quiet.post, 'there is a way out, and no postcard button (as in the café)', JSON.stringify(quiet));
  const mus = await W(w => w.lastMusic); rec(mus > .2 && mus < .4, 'the town\'s music is a little quieter in here', String(mus));
  await shot(pre + 'garage-5-inside');
  /* look round: a drag, and on a computer the arrows */
  const y0 = await W((w, g) => g.G.yaw);
  await drag(vp.width * .6, vp.height * .5, -vp.width * .3);
  const y1 = await W((w, g) => g.G.yaw);
  rec(Math.abs(y1 - y0) > .3 && (await state()).st === 'in', 'a drag looks round, and does not take you out', JSON.stringify({ y0: +y0.toFixed(2), y1: +y1.toFixed(2) }));
  if (!mobile) { await page.keyboard.down('ArrowLeft'); await W(w => w.run(20)); await page.keyboard.up('ArrowLeft'); const y2 = await W((w, g) => g.G.yaw); rec(y2 > y1 + .6, 'the arrows look round too', JSON.stringify({ y1: +y1.toFixed(2), y2: +y2.toFixed(2) })); }
  for (const [n, yaw, p] of [['bench', .02, -.05], ['flag', -.55, .05], ['engine', -1.8, -.12]]) { await W((w, g, d, h, a) => { g.G.yaw = a[0]; g.G.pitch = a[1]; w.run(2); }, [yaw, p]); await frames(3); await shot(pre + 'garage-6-' + n); }
  /* and the same lens back after: E does nothing else in here */
  await page.keyboard.press('KeyE'); await W(w => w.run(3));
  rec((await state()).st === 'in' && !(await tf()).on, 'E does nothing else in here');

  /* ---- the test fire: the big red button on the bench ---- */
  const prog1 = await H(h => h.renderer.info.programs.length);
  rec(await page.evaluate(() => { const b = document.querySelector('#crFire'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 60; }), 'inside, a Fire the engine button you cannot miss is on the screen');
  const toBtn = () => W((w, g) => { const [bx, bz] = g.GTF.btn, [sx, sz] = g.GW.S; g.G.yaw = Math.atan2(-(bx - sx), -(bz - sz)); g.G.pitch = -.12; w.run(2); return g.screen('btn'); });
  await toBtn(); await frames(3);
  const bxy = await W((w, g) => g.screen('btn'));
  rec(bxy[2] < 1 && bxy[0] > 0 && bxy[0] < vp.width && bxy[1] > 0 && bxy[1] < vp.height && (await tf()).cap === 0, 'the big red button is on the bench, up, and on the screen', JSON.stringify(bxy.map(v => +v.toFixed(1))));
  await shot(pre + 'garage-9-button');
  /* (the page's own frames run the station too, so a fire goes on in real time between these steps: each step goes to a
     moment in it rather than on by so many frames, and it is held still for each picture) */
  const to = t => W((w, g, d, h, a) => w.until('g => g.TF.t >= ' + a, 30 * 10), t);
  const still = async n => { await W((w, g) => { g.TF.hold = true; }); await frames(3); await shot(pre + n); await W((w, g) => { g.TF.hold = false; }); };
  await W(w => { w.snd = []; });
  await tap(bxy[0], bxy[1]); let f = await tf();
  rec(f.on && f.fires === 1 && (await state()).st === 'in', (mobile ? 'a tap' : 'a click') + ' on it starts a test fire (and does not take you out)', JSON.stringify(f));
  await to(.9); f = await tf();
  const clicks = await W(w => [w.count('tfClick'), w.count('tfBeep')]);
  rec(f.cap === 1 && clicks[0] === 1 && clicks[1] === 2, 'the button goes down with a clunk, and two warning beeps', JSON.stringify({ cap: f.cap, click: clicks[0], beeps: clicks[1] }));
  await to(1.3);
  const yawF = await W((w, g) => g.G.yaw);
  rec(Math.abs(yawF - (mobile ? -2.05 : -1.85)) < .05, 'the view has turned to the engine', yawF.toFixed(2));
  await W(w => w.until('g => g.TF.P > .5', 30 * 2)); await still('garage-10-cough');
  await to(2.5); f = await tf();
  const pops = await W(w => w.count('tfPop'));
  rec(pops >= 4 && f.roar, 'it coughs and sputters a few times, then catches and roars', JSON.stringify({ pops, roar: f.roar, R: f.R }));
  rec(f.R === 1 && f.core && f.glow && f.lt > .8 && f.smoke > 4 && f.pool && f.shook, 'full burn: the flame and its glow out of the bell, its light in the room and on the pavement, smoke, things shaking', JSON.stringify(f));
  /* the flame and the smoke are where they should be: out of the bell, through the shutter */
  const geo = await W((w, g) => { const b = g.GTF.BELL, q = g.TF.sm.filter(p => p.a < p.life), out = q.filter(p => p.p.z > g.GW.d / 2).length; return { len: +g.TF.U.core.uLen.value.toFixed(2), glow: +g.TF.U.glow.uLen.value.toFixed(2), tip: +(b[2] + g.TF.U.glow.uLen.value).toFixed(2), wall: g.GW.d / 2, puffs: q.length, outside: out }; });
  rec(geo.len > 1.2 && geo.tip > geo.wall + .8 && geo.outside >= geo.puffs * .6, 'the plume reaches out through the open shutter, and the smoke is out in the street', JSON.stringify(geo));
  const progF = await H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  rec(progF === prog1 && progF === prog0, 'firing it compiles no new shader', prog0 + ', ' + prog1 + ' then ' + progF);
  await to(3.2); await still('garage-11-fire');
  /* the light it throws on the bench, behind you */
  await W((w, g) => { g.G.yaw = .02; g.G.pitch = -.05; w.run(1); }); await still('garage-12-fire-bench');
  await W((w, g, d, h, a) => { g.G.yaw = a; g.G.pitch = -.04; w.run(1); }, yawF);
  await to(5.7); f = await tf();
  const roars = await W(w => w.count('tfRoar'));
  rec(!f.roar && !f.core && f.on && roars === 1, 'then it is shut off, and the flame is gone', JSON.stringify({ ...f, roars }));
  await to(5.3); await still('garage-13-smoke');
  const end = await W(w => { const r = w.until((g) => !g.TF.on, 30 * 6); return { ...r, chirps: w.count('tfChirp'), thud: w.count('tfThud'), tink: w.count('tfTink') }; }); f = await tf();
  rec(end.done && end.chirps === 3 && end.thud === 1 && end.tink >= 1 && f.book && f.cap === 0 && !f.glow, 'after it: the book on the stool goes over, the bell ticks, the smoke alarm chirps three times, and it is over', JSON.stringify({ ...end, book: f.book, cap: f.cap }));
  const gone = await W(w => w.until((g) => g.TF.alive === 0 && !g.TF.shook, 30 * 14));
  rec(gone.done && !(await tf()).pool, 'the smoke drifts off, everything settles, and the light is gone', JSON.stringify(gone));
  /* again: Space on a computer, the button on a phone; and while it runs, pressing it again does nothing */
  await W(w => { w.snd = []; });
  rec(await page.evaluate(() => { const b = document.querySelector('#crFire'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none'; }), 'once it is over, the Fire the engine button is on the screen again');
  if (mobile) await page.click('#crFire');
  else await page.keyboard.press('Space');
  f = await tf(); rec(f.on && f.fires === 2, (mobile ? 'a tap on the button' : 'Space') + ' fires it again once it is over', JSON.stringify(f));
  await to(.6); if (!mobile) await page.keyboard.press('Enter'); else await W((w, g) => g.fire());
  await to(2.8); f = await tf();
  rec(f.fires === 2 && f.roar && f.core && f.book, 'pressing it again while it runs does nothing, and it roars again (the book stays where it fell)', JSON.stringify(f));
  await still('garage-14-refire');

  /* ---- out (mid-fire): Escape on a computer, the button on a phone ---- */
  await W(w => { w.badCam = []; });
  if (mobile) await press('#crWsLeave'); else await page.keyboard.press('Escape');
  s = await state(); rec(s.st === 'exit' && await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), (mobile ? 'Leave the workshop' : 'Escape') + ' takes you out (and does not leave Earth)', s.st);
  f = await tf(); const hush = await W(w => w.count('tfHush'));
  rec(!f.on && !f.roar && !f.core && !f.glow && f.lt === 0 && f.cap === 0 && hush === 1, 'walking out mid-fire stops it at once: no flame, no light, the roar and every other sound of it hushed', JSON.stringify({ ...f, hush }));
  await W(w => w.run(12)); f = await tf(); rec(f.smoke === 0 && !f.shook && !f.pool, 'and its smoke is gone a moment later', JSON.stringify(f));
  await W(w => w.run(36, true)); await frames(3); await shot(pre + 'garage-7-coming-out');
  const out = await W((w, g, d) => { const r = w.until(g => g.G.st === 'out', 30 * 5, true); w.run(30, true); const P = d.player, l = g.toLocal(d.at(P.x, P.z).multiplyScalar(24));
    return { ...r, st: g.state, cam: w.badCam.slice(0, 3), you: [+l.x.toFixed(2), +l.z.toFixed(2)], face: +g.toLocal(P.f.clone().add(d.at(P.x, P.z).multiplyScalar(24))).sub(l).z.toFixed(2) }; });
  rec(out.done && out.st.me && out.st.near === .1 && out.st.k < .05 && out.you[1] > 2.4, 'you are back out on the pavement, facing the street, with the walking camera', JSON.stringify(out));
  rec(out.cam.length === 0, 'on the way out the camera never goes through anything either', JSON.stringify(out.cam));
  rec((await W(w => w.lastMusic)) > .5, 'and the music is as it was');
  const postOut = await page.evaluate(() => { const b = document.querySelector('#crPost'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none' && getComputedStyle(b).visibility !== 'hidden'; });
  rec(postOut, 'and the postcard button is back');
  const moved = await W((w, g, d) => { const P = d.player, x0 = P.x, z0 = P.z; P.tgt = d.at(...g.local(.6, 6)).multiplyScalar(24); w.run(40); return Math.hypot(P.x - x0, P.z - z0); });
  rec(moved > .8, 'and you can walk off again', moved.toFixed(2) + ' m');
  await frames(3); await shot(pre + 'garage-8-back-out');

  /* ---- in again, and out by a tap on the way out ---- */
  await W(w => { w.put(.15, 2.4, .7, 0); w.run(5); });
  await W((w, g) => { g.act(); w.until(g => g.G.st === 'in', 30 * 5); w.run(5); });
  await W((w, g, d, h) => { g.G.yaw = -1.93; g.G.pitch = -.05; w.run(3); }); await frames(3);
  const oxy = await W((w, g) => g.screen('out'));
  await tap(oxy[0], oxy[1]); s = await state();
  rec(s.st === 'exit', (mobile ? 'a tap' : 'a click') + ' on the way out takes you out too', JSON.stringify({ st: s.st, oxy: oxy.map(v => +v.toFixed(1)) }));
  await W(w => w.until(g => g.G.st === 'out', 30 * 5));

  /* ---- with --meter: how loud each of its sounds is, against a footstep ---- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 900) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(300); return +pk.toFixed(4); };
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['ratchet', h => h.A.ratchet(.16, 1)], ['tube', h => h.A.tube(1)], ['end(up)', h => h.A.shutterEnd(true)], ['end(down)', h => h.A.shutterEnd(false)],
      ['motor', h => { const m = h.A.shutterMotor(true); setTimeout(() => m.stop(), 700); }],
      ['tf:click', h => h.A.tfClick()], ['tf:beep', h => h.A.tfBeep(false)], ['tf:beep(hi)', h => h.A.tfBeep(true)], ['tf:pop', h => h.A.tfPop(1)], ['tf:chirp', h => h.A.tfChirp()], ['tf:thud', h => h.A.tfThud()], ['tf:tink', h => h.A.tfTink()],
      ['tf:roar', h => { const r = h.A.tfRoar(); r.set(1); setTimeout(() => r.stop(), 750); }]]) lv[n] = await listen(f);
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)']), shut = Math.max(lv.ratchet, lv['end(up)'], lv['end(down)'], lv.motor);
    rec(step > 0 && ['ratchet', 'tube', 'end(up)', 'end(down)', 'motor'].every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'each of its sounds is heard, and none is much louder than a footstep', JSON.stringify(lv));
    const tfs = ['tf:click', 'tf:beep', 'tf:beep(hi)', 'tf:chirp', 'tf:thud', 'tf:tink'];
    rec(tfs.every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'each sound of the test fire is heard, and none is much louder than a footstep', JSON.stringify(tfs.map(n => n + ' ' + lv[n])));
    rec(lv['tf:pop'] > step && lv['tf:pop'] <= shut * 3, 'the coughs as it lights are louder than a footstep, but well under the roar', JSON.stringify({ pop: lv['tf:pop'], step, shut }));
    rec(lv['tf:roar'] > shut && lv['tf:roar'] > lv['tf:pop'] && lv['tf:roar'] <= shut * 5 && lv['tf:roar'] < .25, 'the roar is the loudest of them by far, but well clear of clipping (no more than about five times the shutter) (and far from clipping)', JSON.stringify({ roar: lv['tf:roar'], shutter: shut }));
  }

  /* ---- the last flight from inside: you are put back outside, the shutter down, and the scene has the camera ---- */
  await W((w, g) => { w.put(.15, 2.4, .7, 0); g.act(); w.until(g => g.G.shSt === 'open', 30 * 6); g.act(); w.until(g => g.G.st === 'in', 30 * 5); });
  const inside = (await state()).st;
  const fin0 = await W((w, g) => { g.fire(); w.run(75); return g.tf; });
  await W((w, g, d) => { d.startFinale(); w.run(6); });
  const fin1 = await tf(); rec(fin0.roar && !fin1.on && !fin1.roar && !fin1.core && !fin1.glow && fin1.smoke === 0 && fin1.lt === 0, 'the last flight in the middle of a test fire stops it, and nothing of it is left', JSON.stringify({ fin0, fin1 }));
  const f1 = await W((w, g, d, h) => ({ st: g.state, fin: d.FIN.on, pre: !!d.FIN.pre, near: h.stCam.near, ingar: document.querySelector('.st-cr').classList.contains('ingar'), leave: !document.querySelector('#crWsLeave').hidden }));
  rec(inside === 'in' && f1.fin && f1.st.st === 'out' && f1.st.shSt === 'shut' && !f1.st.vis && f1.st.k === 0 && f1.near === .1 && !f1.ingar && !f1.leave, 'the last flight from inside the workshop: it plays, and nothing of the workshop is left (you out, the shutter down, the lens back)', JSON.stringify(f1));
  await W((w, g, d) => { d.launch.skip(); w.run(10); }); await W((w, g, d, h) => h.ST.cr.finaleEnd());
  /* and just after opening it, from outside */
  await W((w, g, d, h) => { h.ST.cr.enter(); d.skipCut(); w.run(5); w.put(.15, 2.4, .7, 0); w.run(5); g.act(); w.run(20); });
  const up2 = (await state()).shSt;
  await W((w, g, d) => { d.startFinale(); w.run(4); });
  const f2 = await state();
  rec(up2 === 'up' && f2.shSt === 'shut' && !f2.vis && f2.st === 'out' && !f2.tag.on, 'the last flight just after opening it puts the shutter back down', JSON.stringify({ up2, f2 }));
  await W((w, g, d) => { d.launch.skip(); w.run(5); }); await W((w, g, d, h) => h.ST.cr.finaleEnd());
  const f3 = await state(); rec(f3.shSt === 'shut' && !f3.vis && f3.st === 'out', 'and once the last flight is over, it is as it was', JSON.stringify(f3));
  /* leaving Earth in the middle of a test fire puts it back too */
  const lx = await W((w, g, d, h) => { w.put(.15, 2.4, .7, 0); g.act(); w.until(g => g.G.shSt === 'open', 30 * 6); g.act(); w.until(g => g.G.st === 'in', 30 * 5); g.fire(); w.run(75); const a = g.tf;
    h.ST.cr.exit(); const b = g.tf; h.ST.cr.enter(); d.skipCut(); w.run(5); return { a, b, st: g.state }; });
  rec(lx.a.roar && !lx.b.on && !lx.b.roar && !lx.b.core && lx.b.smoke === 0 && lx.st.shSt === 'shut' && lx.st.st === 'out', 'leaving Earth in the middle of a test fire stops it, and back on Earth all is as it was', JSON.stringify(lx));

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

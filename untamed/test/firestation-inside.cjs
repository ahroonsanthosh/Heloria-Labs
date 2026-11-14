/* Inside the fire station on Earth: the bay with the engine, the gear on the lockers, the mess, and the drill rung from in here.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/firestation-inside.cjs --out <dir> [--mobile] [--meter]
   From the forecourt by day its office door is in view and its tag says Go in. In by a click (a tap) on the door: it swings
   open and knocks shut behind you, and you stand inside in your own eyes, nothing of the street drawn over the room, the
   town's music quieter, the buttons on the screen and nothing new compiled. The room: the engine in the bay, the lockers with
   the gear, the mess, the board. The two on duty are about the bay's mouth by day (polishing the engine, a clipboard, tea, a word). Read the map (the camera goes up to the
   board, and it is read aloud), try on a helmet (its brim over your eyes a moment, with its knock and the strap's click), ring
   the bell (the drill the engine starts outside: you step up to the bay's mouth to watch it, and back when it is over). Out by
   the button. In again by walking into the door, the W still held: it does nothing in here until let go, and S takes you out
   all the same. In through the open bay by walking into it (the one on duty steps aside, the office door stays shut), and out
   by Escape (an Escape just after stays on Earth). At night: the roller door down, nobody at the bay; inside, the officer at
   the table with his mug and the other by the lockers with his, their helmets on the shelves; ring the bell and they put
   their helmets on and go out to it as the door rolls up, and come back in to the mess after. With --meter every sound in
   here is heard and none is louder than a footstep. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  await H(h => {
    const st = h.ST.cr, d = st._dbg, F = d.fireIn;
    window.__F = {
      snd: [], lastMusic: null,
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } },
      until(src, max) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(F, d); i++) this.run(1); return { frames: i, done: !!f(F, d) }; },
      put(lx, lz, fx, fz) { const [x, z] = F.local(lx, lz), P = d.player, t = d.at(...F.local(fx, fz)); P.x = x; P.z = z; P.u.copy(d.at(x, z)); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      count(n) { return this.snd.filter(s => s.n === n).length; },
    };
    for (const n of ['civDoor', 'fireBell', 'helmet', 'fsRadio', 'poShuffle', 'step', 'kidStep', 'shutterMotor', 'hoseGush']) { const f = h.A[n]; h.A[n] = function () { window.__F.snd.push({ n, t: h.S.t, a: [...arguments] }); return f.apply(this, arguments); }; }
    { const f = h.A.music; h.A.music = function (v) { window.__F.lastMusic = v; return f.apply(this, arguments); }; }
  });
  const W = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__F, h.ST.cr._dbg.fireIn, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const state = () => W((w, F) => F.state), crew = () => W((w, F, d) => d.fire.state.crew), fire = () => W((w, F, d) => d.fire.state);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const onScreen = q => q[2] < 1 && q[0] > 0 && q[0] < vp.width && q[1] > 0 && q[1] < vp.height;
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 90000 }); else await page.click(sel, { timeout: 90000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }, sel);
  const fits = sel => page.evaluate(([sel, w, h]) => { const all = [...document.querySelectorAll(sel)].filter(e => { for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden') return false; } return !e.hidden; });
    return { n: all.length, ok: all.every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= w + 1 && r.top >= -1 && r.bottom <= h + 1; }), apart: all.every((a, i) => all.every((b, j) => { if (j <= i) return true; const p = a.getBoundingClientRect(), q = b.getBoundingClientRect(); return p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top; })) }; }, [sel, vp.width, vp.height]);
  const tagEl = () => page.evaluate(() => { const e = document.querySelector('#crLabels .crwfs'), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    return { txt: e.textContent, on: e.classList.contains('on'), can: e.classList.contains('can'), xy: [x, y], top: !!top && (top === e || e.contains(top)) }; });
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const quiet = () => page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
    return { labels: vis(document.querySelector('#crLabels')), card: vis(document.querySelector('#crProj')) && document.querySelector('#crProj').classList.contains('on'), steer: vis(document.querySelector('#crSteer')), post: vis(document.querySelector('#crPost')), stick: vis(document.querySelector('.crstick')), infs: document.querySelector('.st-cr').classList.contains('infs') }; });
  /* a look round inside: turned to yaw, up or down by pitch (and held there) */
  const view = (yaw, pitch) => W((w, F, d, h, a) => { F.B.yaw = a[0]; F.B.pitch = a[1]; F.B.dragT = -999; w.run(2); }, [yaw, pitch]);
  const snap = async n => { await frames(3); await wait(200); await shot(n); };
  const pre = mobile ? 'm-' : '';
  await H(h => { const d = h.ST.cr._dbg; d.skipCut(); h.A.start && h.A.start(); });
  await W((w, F, d) => { d.began(); d.sky.set({ time: '14:30', date: '2026-07-15', weather: 'clear' }); d.fire.FS.next = 1e9; w.run(40); }); await wait(300);

  /* ---- before: built without an error; nothing of the inside drawn but what is seen through the open bay ---- */
  let s = await state(); const errs = await W((w, F, d) => [F.err, d.fire.err]);
  rec(!errs[0] && !errs[1] && s.st === 'out' && !s.vis && s.roomOut && !s.roomIn && s.slats && s.win, 'before: you are outside, the station and its inside were built without an error, and the inside is drawn only as the street sees it', JSON.stringify({ errs, st: s.st, vis: s.vis, roomOut: s.roomOut }));
  let c = await crew(); rec(c.every(q => q.vis && q.w === 0 && q.helm && q.z > 1.18 && q.z < 1.75 && q.x > -1.25 && q.x < .35), 'by day the two on duty are about the bay\'s mouth in their helmets (at the engine\'s nose, the clipboard, a mug, a word)', JSON.stringify(c));

  /* ---- from the forecourt: the door in view, its tag Go in; by it the tag says how ---- */
  await W(w => { w.put(.78, 3.4, .78, 0); w.run(40); }); await frames(4);
  const dxy = await W((w, F) => F.screen('door')); s = await state();
  rec(onScreen(dxy) && s.tag.on && s.tag.txt === 'Go in', 'from the forecourt the office door is in view and its tag says Go in', JSON.stringify({ door: dxy.map(v => +v.toFixed(0)), tag: s.tag }));
  await shot(pre + 'fsi-1-door');
  await W(w => { w.put(.78, 2.05, .78, 0); w.run(30); }); await frames(4);
  let tg = await tagEl(); rec(tg.on && tg.can && tg.top, 'by the door its tag says Go in, and how (E, or Tap)', JSON.stringify(tg));
  const prog0 = await progs();

  /* ---- in by a click (a tap) on the door, from across the forecourt (from where none of us is near it on the screen: a tap
     close to the line from someone's feet to their head, as the screen sees it, is taken as meant for them) ---- */
  await W(w => { w.put(1.0, 3.8, .78, 0); w.run(30); w.snd = []; }); await frames(4);
  const dxy2 = await W((w, F) => F.screen('door')); await tap(dxy2[0], dxy2[1]); s = await state();
  rec(s.st === 'go' || s.st === 'enter', (mobile ? 'a tap' : 'a click') + ' on the door sets you walking over and in', JSON.stringify({ st: s.st, xy: dxy2.map(v => +v.toFixed(0)) }));
  let r = await W(w => w.until(F => F.B.st === 'in', 30 * 25)); await W(w => w.run(10)); s = await state();
  rec(r.done && s.st === 'in' && !s.me && s.near === .02 && s.vis && s.cin, 'you walk over and in, and stand inside the door in your own eyes, with a nearer lens', JSON.stringify({ r, st: s.st, me: s.me, near: s.near, eye: s.eye }));
  rec(await W(w => w.count('civDoor')) === 2 && s.door < .05, 'the door swings open with its latch and knocks shut behind you', String(await W(w => w.count('civDoor'))));
  rec(s.roomIn && !s.roomOut && !s.win && !s.slats, 'in here the room is in its own light, and you see out through the window (its glass not drawn over it)', JSON.stringify({ roomIn: s.roomIn, roomOut: s.roomOut, win: s.win }));
  const progIn = await progs(); rec(progIn === prog0, 'going in compiles no new shader', prog0 + ' then ' + progIn);
  let q = await quiet(); rec(!q.labels && !q.card && !q.steer && !q.post && !q.stick && q.infs, 'nothing of the street is drawn over the room: no tags, no landmark card, no postcard button, no stick', JSON.stringify(q));
  rec(['map', 'helm', 'bell'].every(k => s.btn.includes(k)) && s.leave && await visible('#crFiLeave') && await visible('#crFiBell'), 'there is a way out, and the three things to do', JSON.stringify({ btn: s.btn, leave: s.leave }));
  let fit = await fits('.crfibar .crlhb,#crFiLeave'); rec(fit.ok && fit.apart && fit.n === 4, 'the buttons fit on the screen, none over another', JSON.stringify(fit));
  const mus = await W(w => w.lastMusic); rec(mus > .2 && mus < .4, 'the town\'s music is a little quieter in here', String(mus));
  c = await crew(); rec(c.every(q => q.vis && q.w === 0 && q.helm), 'by day the two stay in the bay\'s mouth while you are in', JSON.stringify(c));
  await snap(pre + 'fsi-2-in');
  await W(w => w.run(30 * 6)); rec(await W(w => w.count('fsRadio')) >= 1, 'the radio on the watch desk crackles now and then', String(await W(w => w.count('fsRadio'))));
  /* looking round: the bay and the engine, the roller door from behind, the gear, the mess, the tower's shaft, the desk */
  const y0 = await W((w, F) => F.B.yaw);
  if (!mobile) { await page.keyboard.down('ArrowLeft'); await W(w => w.run(25)); await page.keyboard.up('ArrowLeft'); }
  else { const cdp = await page.context().newCDPSession(page), x0 = vp.width * .6, y = vp.height * .45; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - i * 25, y, id: 1 }] }); await W(w => w.run(1)); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  const y1 = await W((w, F) => F.B.yaw); rec(Math.abs(y1 - y0) > .3 && (await state()).st === 'in', (mobile ? 'a drag' : 'the arrows') + ' look round, and you stay in', JSON.stringify({ y0: +y0.toFixed(2), y1: +y1.toFixed(2) }));
  await view(.55, .25); await snap(pre + 'fsi-3-bay');
  await view(.1, .05); await snap(pre + 'fsi-4-gear');
  await view(-.75, -.02); await snap(pre + 'fsi-5-mess');
  await view(-.6, .55); await snap(pre + 'fsi-6-tower');
  await view(-2.0, -.1); await snap(pre + 'fsi-7-desk');
  await W((w, F) => { F.B.dragT = 0; w.run(5); });

  /* ---- the map: up to the board, read aloud; back ---- */
  await W(w => { w.snd = []; });
  if (mobile) await press('#crFiMap'); else await page.keyboard.press('KeyM');
  await W(w => w.run(40)); s = await state();
  rec(s.act === 'map' && s.ak > .99 && s.eye[0] > 1.1 && /callout/i.test(s.sr) && /Lanzetti/.test(s.sr) && await W(w => w.count('poShuffle')) === 1 && await visible('#crFiBack'), (mobile ? 'The callout map' : 'M') + ' takes you up to the board: the map of the town with this year\'s callouts pinned on it, read aloud too', JSON.stringify({ act: s.act, eye: s.eye, sr: s.sr.slice(0, 80) }));
  await frames(3); const bxy = await W((w, F) => F.screen('map')); rec(onScreen(bxy), 'the board is in front of you', JSON.stringify(bxy.map(v => +v.toFixed(0))));
  rec((await fits('.crfibar .crlhb,#crFiLeave')).ok, 'the buttons still fit');
  await snap(pre + 'fsi-8-map');
  if (mobile) await press('#crFiBack'); else await page.keyboard.press('Escape');
  await W(w => w.run(30)); s = await state(); rec(!s.act && s.ak < .01 && s.st === 'in', (mobile ? 'Back' : 'Escape') + ' takes you back from the board, still inside', JSON.stringify({ act: s.act, ak: s.ak, st: s.st }));

  /* ---- a helmet: off the shelf, on (its brim over your eyes a moment), off and back ---- */
  await W(w => { w.snd = []; });
  if (mobile) await press('#crFiHelm'); else await page.keyboard.press('KeyH');
  await W(w => w.run(50)); s = await state();
  rec(s.act === 'helm' && s.brim && s.helmOn && await W(w => w.count('helmet')) === 1, (mobile ? 'Try on a helmet' : 'H') + ': it comes off the shelf onto your head, its brim over the top of your eyes, with a knock and the strap\'s click', JSON.stringify({ act: s.act, brim: s.brim, helmOn: s.helmOn, snd: await W(w => w.count('helmet')) }));
  await snap(pre + 'fsi-9-helmet');
  await W(w => w.run(30 * 4.5)); s = await state();
  rec(!s.act && !s.brim && !s.helmOn && await W(w => w.count('helmet')) === 2, 'a moment later it comes off and goes back on its shelf', JSON.stringify({ act: s.act, brim: s.brim, helmOn: s.helmOn }));

  /* ---- the bell: rung, the drill as the engine starts it outside, watched from the bay's mouth; back after ---- */
  await W(w => { w.snd = []; });
  if (mobile) await press('#crFiBell'); else await page.keyboard.press('KeyB');
  await W(w => w.run(30)); s = await state(); let f = await fire();
  rec(s.act === 'bell' && f.dr !== 'idle' && f.by === 'bell' && await W(w => w.count('fireBell')) === 1 && Math.abs(s.bell) > .01, (mobile ? 'Ring the bell' : 'B') + ': the bell swings and rings, and the drill starts as it does from the engine outside', JSON.stringify({ act: s.act, dr: f.dr, by: f.by, bell: s.bell }));
  r = await W(w => w.until(F => F.B.act === 'watch', 30 * 3)); s = await state(); f = await fire();
  rec(r.done && f.dr !== 'idle' && f.crew.every(q => q.vis && q.w === 0), 'you watch from a step aside as the two run the hose out', JSON.stringify({ r, eye: s.eye, dr: f.dr }));
  r = await W(w => w.until(F => F.B.act === 'watch' && F.B.wph === 'bay' && F.B.ak > .99, 30 * 3)); s = await state(); f = await fire();
  rec(r.done && s.eye[2] > 3 && s.door < .05 && await W(w => w.count('civDoor')) === 0, 'a moment\'s dark, and you are out on the forecourt with the station, the engine and the two of them in view', JSON.stringify({ r, eye: s.eye, dr: f.dr }));
  r = await W(w => w.until((F, d) => d.fire.FS.dr === 'spray', 30 * 10)); rec(r.done && (await state()).act === 'watch', 'and watch them run the hose out until the water is on', JSON.stringify(r));
  await W(w => w.run(30 * 1.5)); await snap(pre + 'fsi-10-drill');
  f = await fire(); rec(f.flow > .9 && f.crew[0].z > 2, 'the water goes up over the forecourt, the first out at the branch', JSON.stringify({ flow: f.flow, crew: f.crew }));
  r = await W(w => w.until((F, d) => d.fire.FS.dr === 'idle' && !F.B.act, 30 * 30)); await W(w => w.run(50)); s = await state();
  rec(r.done && !s.act && s.eye[2] < .7 && await W(w => w.count('civDoor')) === 0, 'when they have the hose back in, back in through the dark to where you rang it', JSON.stringify({ r, act: s.act, eye: s.eye }));
  rec(await progs() === prog0, 'the map, the helmet and the drill compiled nothing new');

  /* ---- out by the button ---- */
  await press('#crFiLeave'); await W(w => w.run(2)); s = await state(); rec(s.st === 'exit', 'Leave the fire station takes you out', s.st);
  await W(w => w.until(F => F.B.st === 'out', 30 * 5)); await W(w => w.run(20)); s = await state(); await frames(4);
  rec(s.st === 'out' && s.me && s.near === .1 && s.k < .05 && s.you[1] > 1.6 && s.roomOut && !s.roomIn && s.win && await visible('#crPost'), 'you are back on the forecourt with the walking camera, the room as the street sees it, the postcard button back', JSON.stringify({ you: s.you, k: s.k, near: s.near }));

  /* ---- in by walking into the door, the W still held: nothing in here until it is let go; S takes you out all the same ---- */
  await W(w => { w.put(.78, 2.9, .78, 0); w.run(5); w.snd = []; });
  await page.keyboard.down('KeyW'); r = await W(w => w.until(F => F.B.st !== 'out', 30 * 5)); s = await state();
  rec(s.st === 'enter' && s.via === 'door', 'walking into the door takes you in', JSON.stringify({ r, st: s.st }));
  r = await W(w => w.until(F => F.B.st === 'in', 30 * 5)); await W(w => w.run(30)); s = await state();
  rec(r.done && s.st === 'in' && s.hf, 'in, the W you walked in on still held', JSON.stringify({ st: s.st, hf: s.hf }));
  const e0 = s.eye; await W(w => w.run(30)); s = await state();
  rec(s.st === 'in' && Math.hypot(s.eye[0] - e0[0], s.eye[2] - e0[2]) < .01, 'it does nothing in here while it is still held (you do not lean in, nor go out)', JSON.stringify({ e0, e1: s.eye }));
  await page.keyboard.press('KeyS'); await W(w => w.run(2)); s = await state();
  rec(s.st === 'exit', 'S takes you out at once, the W still held', s.st);
  await page.keyboard.up('KeyW'); await W(w => w.until(F => F.B.st === 'out', 30 * 5)); await W(w => w.run(15)); s = await state();
  rec(s.st === 'out' && s.me, 'and you are back outside', s.st);
  await W(w => w.run(30)); s = await state(); rec(s.st === 'out', 'and do not walk straight back in', s.st);

  /* ---- in through the open bay by walking into it: the one on duty steps aside, the office door stays shut; out by Escape ---- */
  await W(w => { w.put(.05, 2.4, .1, 0); w.run(5); w.snd = []; });
  await page.keyboard.down('KeyW'); r = await W(w => w.until(F => F.B.st !== 'out', 30 * 5)); await page.keyboard.up('KeyW'); s = await state();
  rec(s.st === 'enter' && s.via === 'bay', 'by day walking into the open bay takes you in that way', JSON.stringify({ r, st: s.st, via: s.via }));
  await W(w => w.run(36)); await snap(pre + 'fsi-11-bay-in'); c = await crew(); s = await state();
  rec(c[0].x < .0 && s.door < .05, 'the one on duty steps aside past the engine\'s nose, and the office door stays shut', JSON.stringify({ x: c[0].x, door: s.door }));
  r = await W(w => w.until(F => F.B.st === 'in', 30 * 5)); await W(w => w.run(30)); s = await state(); c = await crew();
  rec(r.done && s.st === 'in' && await W(w => w.count('civDoor')) === 0 && Math.abs(c[0].x - .08) < .02, 'and you are in, the door never opened, the one on duty back in his place', JSON.stringify({ st: s.st, door: await W(w => w.count('civDoor')), x: c[0].x }));
  await page.keyboard.press('Escape'); await W(w => w.run(2)); s = await state();
  rec(s.st === 'exit' && await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), 'Escape takes you out (and does not leave Earth)', s.st);
  await W(w => w.until(F => F.B.st === 'out', 30 * 5)); await page.keyboard.press('Escape'); await wait(400);
  rec(await H(h => h.S.stId === 'cr' && h.S.mode === 'station'), 'an Escape just after coming out does not send you up to orbit');

  /* ---- at night: the door down, nobody at the bay; inside the two in the mess with their mugs, their helmets on the shelves ---- */
  await W((w, F, d) => { d.sky.set({ time: '23:10' }); w.run(30 * 7); w.put(.78, 3.0, .78, 0); w.run(20); }); f = await fire();
  rec(f.door === 0 && f.crew.every(q => !q.vis), 'at night the roller door is down and nobody is at the bay', JSON.stringify({ door: f.door, crew: f.crew }));
  await frames(4); await shot(pre + 'fsi-12-night-door');
  const nxy = await W((w, F) => F.screen('door')); await tap(nxy[0], nxy[1]); r = await W(w => w.until(F => F.B.st === 'in', 30 * 25)); await W(w => w.run(20)); s = await state(); c = await crew();
  rec(r.done && c[1].vis && c[1].w === 1 && c[1].sit > .99 && c[1].mug && !c[1].helm, 'inside, the officer sits at the table with his mug, his helmet off', JSON.stringify(c[1]));
  rec(c[0].vis && c[0].w === 1 && c[0].sit === 0 && c[0].mug && !c[0].helm && c[0].z < -1, 'and the other stands by the lockers with his', JSON.stringify(c[0]));
  rec(s.crewH.every(Boolean) && s.rdoor && !s.slats, 'their helmets are on the shelves, and the roller door is down behind the engine', JSON.stringify({ crewH: s.crewH, rdoor: s.rdoor }));
  await view(-.2, -.02); await snap(pre + 'fsi-13-night-mess');
  await view(2.1, .12); await snap(pre + 'fsi-14-night-bay');
  await W((w, F) => { F.B.dragT = 0; w.run(5); });
  /* the bell at night: they get up, put their helmets on and go out to it as the door rolls up; and back in after */
  await W(w => { w.snd = []; }); if (mobile) await press('#crFiBell'); else await page.keyboard.press('KeyB');
  await W(w => w.run(30 * 2.4)); c = await crew(); f = await fire(); s = await state();
  rec(f.dr === 'bell' && c.every(q => q.vis && q.w < 1) && await W(w => w.count('fireBell')) === 1 && await W(w => w.count('shutterMotor')) === 1, 'at night the bell calls them out: they get up from the mess, and the roller door starts up', JSON.stringify({ dr: f.dr, door: f.door, crew: c.map(q => q.w) }));
  await snap(pre + 'fsi-15-night-call');
  r = await W(w => w.until((F, d) => d.fire.FS.dr === 'spray', 30 * 14)); c = await crew(); f = await fire();
  rec(r.done && f.door === 1 && c.every(q => q.vis && q.w === 0 && q.helm), 'helmets on, out at the bay\'s mouth, the door up, and the drill goes ahead', JSON.stringify({ r, door: f.door, crew: c }));
  await W(w => w.run(30 * 2.5)); await snap(pre + 'fsi-16-night-drill');
  r = await W(w => w.until((F, d) => d.fire.FS.dr === 'idle' && !F.B.act, 30 * 30)); await W(w => w.run(30 * 8)); c = await crew(); f = await fire();
  rec(r.done && f.door === 0 && c.every(q => q.vis && q.w === 1 && !q.helm) && c[1].sit > .99, 'after it the door comes down again and they go back in to the mess, helmets off', JSON.stringify({ r, door: f.door, crew: c }));
  await press('#crFiLeave'); await W(w => w.until(F => F.B.st === 'out', 30 * 5)); await W(w => w.run(10)); c = await crew();
  rec(c.every(q => !q.vis), 'out in the street at night again, nobody to be seen at the bay', JSON.stringify(c));
  rec(await progs() === prog0, 'the whole way, by day and by night, compiled nothing new', String(await progs()));

  /* ---- the way to the door, from the pad, the square and the pub ---- */
  const nav = await W((w, F, d) => { const g = F.local(.78, FW_AP()), out = {}; function FW_AP() { return F.B.AP[1]; } for (const [n, [x, z]] of Object.entries({ pad: [-3.2, -12], square: [0, 2.2], pub: d.pub.local(-.32, 2.4) })) { const q = d.navPath(x, z, g[0], g[1], 1.2); out[n] = q ? q.length : null; } return out; });
  rec(Object.values(nav).every(v => v !== null), 'there is a way to the fire station\'s door from the pad, the square and the pub', JSON.stringify(nav));

  /* ---- with --meter: how loud each sound in here is, against a footstep ---- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 1500) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(300); return +pk.toFixed(4); };
    await H(h => { h.A.music(0); }); await wait(1500);
    const lv = {};
    /* (a footstep is a little different each time: the loudest of five is the one to stay under. Each sound in here is heard
       twice and the quieter taken, so that something of the town's own landing in the same moment, a car or a gull, is not
       counted as it) */
    for (const [n, fn] of [['step(1)', h => h.A.step(1)], ['step(1) b', h => h.A.step(1)], ['step(1) c', h => h.A.step(1)], ['step(0)', h => h.A.step(0)], ['step(0) b', h => h.A.step(0)]]) lv[n] = await listen(fn);
    for (const [n, fn] of [['door(open)', h => h.A.civDoor(true, false)], ['door(shut)', h => h.A.civDoor(false, false)], ['bell', h => h.A.fireBell(h.ST.cr._dbg.fireIn.FIW.BELLG, 0)], ['helmet(on)', h => h.A.helmet(true)],
      ['helmet(off)', h => h.A.helmet(false)], ['radio', h => h.A.fsRadio(.008, .35)], ['map', h => h.A.poShuffle(.5)]]) lv[n] = Math.min(await listen(fn), await listen(fn));
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(...Object.keys(lv).filter(k => k.startsWith('step')).map(k => lv[k]));
    rec(step > 0 && ['door(open)', 'door(shut)', 'bell', 'helmet(on)', 'helmet(off)', 'radio', 'map'].every(n => lv[n] > 0 && lv[n] <= step), 'every sound in here is heard, and none is louder than a footstep', JSON.stringify(lv));
  }

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

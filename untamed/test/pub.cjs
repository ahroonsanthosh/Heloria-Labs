/* The pub on Earth: The Rocket & Anchor, going in and out, Tadhg behind his bar, the darts, and the session on a Friday.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/pub.cjs --out <dir> [--mobile] [--query time=22:30] [--meter]
   From the street its name and its sign are in view (the sign swings in the wind); walking up to the door its tag says Go
   in. In by a click (a tap) on the front from across the street, and you are in the room in your own eyes: nothing of the
   street over it, no postcard button, the music quieter, Tadhg looking up to say hello (his lines are checked). Then the
   darts: Play darts, and the view is on the board; real throws by a click (a tap, Space), and throws at exact points for
   the scoring (singles, doubles, trebles, the outer bull and the bull); the chalkboard shows each dart, the turn and your
   best, which your browser keeps (and which is not lost when the browser will not keep anything). Out by Escape (one to
   put the darts down, one to leave; one more just after stays on Earth), by the button, and in again by E (on a phone its
   tag). The session plays only on a Friday market night. Going in and playing compile nothing new. With --meter each new
   sound is heard against a footstep (the session too, played through the page's own sound with ?webaudio in --query). */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  await H(h => {
    const st = h.ST.cr, d = st._dbg, p = d.pub;
    window.__P = {
      snd: [], lastMusic: null, sess: 0, maxWave: 0, maxLook: 0,
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); this.maxWave = Math.max(this.maxWave, p.P.bk.wave); this.maxLook = Math.max(this.maxLook, p.P.bk.lk || 0); } },
      until(src, max) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(p, d); i++) this.run(1); return { frames: i, done: !!f(p, d) }; },
      put(lx, lz, fx, fz) { const [x, z] = p.local(lx, lz), P = d.player, t = d.at(...p.local(fx, fz)); P.x = x; P.z = z; P.u.copy(d.at(x, z)); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      count(n) { return this.snd.filter(s => s.n === n).length; },
    };
    for (const n of ['pubDoor', 'pubGlass', 'pubFire', 'dartThunk', 'dartPull', 'step']) { const f = h.A[n]; h.A[n] = function () { window.__P.snd.push({ n, t: h.S.t, a: [...arguments] }); return f.apply(this, arguments); }; }
    { const f = h.A.music; h.A.music = function (v) { window.__P.lastMusic = v; return f.apply(this, arguments); }; }
    { const f = h.A.pubSession; h.A.pubSession = function (v) { window.__P.sess = v; return f.apply(this, arguments); }; }
  });
  const W = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__P, h.ST.cr._dbg.pub, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const state = () => W((w, p) => p.state);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const onScreen = q => q[2] < 1 && q[0] > 0 && q[0] < vp.width && q[1] > 0 && q[1] < vp.height;
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 90000 }); else await page.click(sel, { timeout: 90000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }, sel);
  const tagEl = () => page.evaluate(() => { const e = document.querySelector('#crLabels .crwpb'), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    return { txt: e.textContent, on: e.classList.contains('on'), can: e.classList.contains('can'), xy: [x, y], top: !!top && (top === e || e.contains(top)) }; });
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const night = await H(h => { const d = h.ST.cr._dbg; d.skipCut(); return d.sky.state.night > .5; });
  const pre = (mobile ? 'm-' : '') + (night ? 'n-' : '');
  await H(h => { h.A.start && h.A.start(); try { localStorage.removeItem('heloria.darts.best'); } catch (e) {} });
  await W((w, p, d) => { d.began(); p.P.dt.best = 0; p.reload(); w.run(30); }); await wait(300);
  const BML = await W((w, p) => p.BML);

  /* ---- before: nothing inside drawn, no error ---- */
  let s = await state(); rec(s.st === 'out' && !s.vis && !(await W((w, p) => p.err)), 'before: you are in the street, nothing inside the pub is drawn, and it was built without an error', JSON.stringify({ st: s.st, vis: s.vis, err: await W((w, p) => p.err) }));

  /* ---- from across the street: the name over the windows and the sign on its bracket; the sign swings ---- */
  await W(w => { w.put(-.3, 6.2, -.3, 0); w.run(45); }); await frames(4);
  const fa = await W((w, p) => p.screen('fascia')), sg = await W((w, p) => p.screen('sign'));
  rec(onScreen(fa) && onScreen(sg), 'from the street THE ROCKET & ANCHOR over the windows and the hanging sign are on the screen', JSON.stringify({ fascia: fa.map(v => +v.toFixed(0)), sign: sg.map(v => +v.toFixed(0)) }));
  const sw = await W(w => { const a = []; for (let i = 0; i < 6; i++) { w.run(20); a.push(window.__heloria.ST.cr._dbg.pub.P.swing); } return a; });
  rec(Math.max(...sw) - Math.min(...sw) > .01, 'the sign swings in the wind', JSON.stringify(sw.map(v => +v.toFixed(3))));
  await shot(pre + 'pub-1-street');
  const prog0 = await progs();

  /* ---- walking up to the door: its tag says Go in, and how ---- */
  await W(w => { w.put(-.32, 2.45, -.32, 0); w.run(30); }); await frames(4);
  let tg = await tagEl(); rec(tg.on && tg.can && tg.txt === 'Go in' && tg.top, 'by the door its tag says Go in, and how (E, or Tap)', JSON.stringify(tg));

  /* ---- in by a click (a tap) on the front from across the street ---- */
  await W(w => { w.put(-.3, 6.2, -.3, 0); w.run(30); w.maxWave = 0; w.maxLook = 0; w.snd = []; }); await frames(4);
  const dxy = await W((w, p) => p.screen('door'));
  await tap(dxy[0], dxy[1]); s = await state();
  rec(s.st === 'go' || s.st === 'enter', (mobile ? 'a tap' : 'a click') + ' on the pub from across the street sets you walking over and in', JSON.stringify({ st: s.st, xy: dxy.map(v => +v.toFixed(0)) }));
  let r = await W(w => w.until(p => p.P.st === 'in', 30 * 25)); s = await state();
  rec(r.done && s.st === 'in' && !s.me && s.near === .02 && s.vis, 'you walk over and in, and stand in the room in your own eyes, with a nearer lens', JSON.stringify({ r, st: s.st, me: s.me, near: s.near }));
  rec(await W(w => w.count('pubDoor')) === 2, 'the door\'s latch as it opens, and its knock as it shuts', String(await W(w => w.count('pubDoor'))));
  rec(await W(w => w.count('pubGlass')) >= 1, 'a glass set down on the bar as Tadhg looks up', String(await W(w => w.count('pubGlass'))));
  const progIn = await progs(); rec(progIn === prog0, 'going in compiles no new shader (made ready with the rest of Earth)', prog0 + ' then ' + progIn);
  rec(s.talk === BML.hi && await W(w => w.maxWave) > .5 && await W(w => w.maxLook) > .9, 'Tadhg looks up, waves, and says hello', JSON.stringify({ talk: s.talk, wave: await W(w => w.maxWave), look: await W(w => w.maxLook) }));
  const quiet = await page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
    return { labels: vis(document.querySelector('#crLabels')), card: vis(document.querySelector('#crProj')) && document.querySelector('#crProj').classList.contains('on'), go: vis(document.querySelector('#crGo')), post: vis(document.querySelector('#crPost')), leave: vis(document.querySelector('#crPbLeave')), inpub: document.querySelector('.st-cr').classList.contains('inpub') }; });
  rec(!quiet.labels && !quiet.card && !quiet.go && quiet.inpub, 'nothing of the street is drawn over the room: no tags, no landmark card', JSON.stringify(quiet));
  rec(quiet.leave && !quiet.post, 'there is a way out, and no postcard button inside', JSON.stringify(quiet));
  const mus = await W(w => w.lastMusic); rec(mus > .2 && mus < .4, 'the town\'s music is a little quieter in here', String(mus));
  /* his lines: hello, the day's news, the board */
  const lines = [s.talk]; for (let i = 0; i < 4 && (await state()).talk; i++) { await W(w => w.run(50)); await frames(2); if (mobile) await tap(vp.width / 2, vp.height * .35); else await page.keyboard.press('Enter'); await W(w => w.run(3)); s = await state(); if (s.talk) lines.push(s.talk); }
  rec(lines[0] === BML.hi && lines.includes(BML.quiet) && lines.includes(BML.darts) && !(await state()).talk, 'Tadhg says hello, that it is quiet this time of day, and that the board is free', JSON.stringify(lines));
  log('TADHG ' + JSON.stringify(lines));
  await W(w => w.run(20)); await frames(3); await shot(pre + 'pub-2-inside');
  /* a click on him: a word about the photographs */
  const bxy = await W((w, p) => { p.P.yaw = p.PB.yaw0; p.P.pitch = p.PB.p0; p.P.dragT = 0; w.run(2); return p.screen('barman'); }); await tap(bxy[0], bxy[1]); await W(w => w.run(30));
  s = await state(); rec(s.talk === BML.photos, (mobile ? 'a tap' : 'a click') + ' on Tadhg: he has a word about the photographs', s.talk);
  if (mobile) await tap(vp.width / 2, vp.height * .35); else await page.keyboard.press('Enter'); await W(w => w.run(3));
  if (mobile) await tap(vp.width / 2, vp.height * .35); else await page.keyboard.press('Enter'); await W(w => w.run(3));
  /* looking round */
  const y0 = await W((w, p) => p.P.yaw);
  if (!mobile) { await page.keyboard.down('ArrowLeft'); await W(w => w.run(25)); await page.keyboard.up('ArrowLeft'); }
  else { const cdp = await page.context().newCDPSession(page), x0 = vp.width * .6, y = vp.height * .45; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - i * 25, y, id: 1 }] }); await W(w => w.run(1)); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  const y1 = await W((w, p) => p.P.yaw); rec(Math.abs(y1 - y0) > .3 && (await state()).st === 'in', (mobile ? 'a drag' : 'the arrows') + ' look round, and you stay in', JSON.stringify({ y0: +y0.toFixed(2), y1: +y1.toFixed(2) }));
  for (const [n, yaw, pt] of [['fire', 1.35, -.05], ['darts', -1.45, .05], ['session', -1.0, -.12]]) { await W((w, p, d, h, a) => { p.P.yaw = a[0]; p.P.pitch = a[1]; p.P.dragT = 0; w.run(2); }, [yaw, pt]); await frames(3); await shot(pre + 'pub-3-' + n); }

  /* ---- the session: only on a Friday market night (the market's own hours) ---- */
  s = await state(); rec(!s.session && s.sess === 0 && !s.mus.some(Boolean) && s.inst, 'on a weekday afternoon there is no session: the instruments are left on the chairs, and nothing plays', JSON.stringify({ session: s.session, sess: s.sess, mus: s.mus, inst: s.inst }));
  const sessAt = async (time, date) => { await W((w, p, d, h, a) => { d.sky.set({ time: a[0], date: a[1] }); w.run(40); }, [time, date]); return state(); };
  const fri = await sessAt('21:30', '2026-07-17'); await frames(3);
  rec(fri.session && fri.sess > .5 && fri.mus.every(Boolean) && !fri.inst && await W(w => w.sess) > .5, 'on a Friday night, market night, three of them sit in and play: fiddle, bodhrán and whistle', JSON.stringify({ session: fri.session, sess: fri.sess, mus: fri.mus }));
  const mk = await W((w, p, d) => d.market && d.market.M ? d.market.M.want : null); log('market want ' + mk);
  await W((w, p) => { p.P.yaw = -1.0; p.P.pitch = -.12; p.P.dragT = 0; w.run(2); }); await frames(3); await shot(pre + 'pub-4-session');
  const musFri = await W(w => w.lastMusic); rec(musFri < mus, 'and the town\'s music goes down under it', musFri + ' (under ' + mus + ')');
  const sat = await sessAt('01:30', '2026-07-18'); rec(sat.session, 'still playing in the small hours of Saturday, while the market is up', JSON.stringify({ session: sat.session }));
  const sat3 = await sessAt('03:00', '2026-07-18'); rec(!sat3.session && !sat3.mus.some(Boolean), 'gone home by three', JSON.stringify({ session: sat3.session, mus: sat3.mus }));
  const thu = await sessAt('21:30', '2026-07-16'); rec(!thu.session && !thu.mus.some(Boolean), 'and on a Thursday night, no session', JSON.stringify({ session: thu.session }));
  await W((w, p, d) => { d.sky.set({ time: '15:00', date: '2026-07-15' }); w.run(30); });

  /* ---- the darts ---- */
  const progD0 = await progs();
  if (mobile) await press('#crPbDarts'); else await page.keyboard.press('KeyE');
  await W(w => w.run(50)); await frames(3); s = await state();
  rec(s.ph === 'darts' && s.dk > .9 && s.fov < 40 && s.done && s.leave && !s.dartsBtn, (mobile ? 'Play darts' : 'E') + ' takes you to the line, the view on the board, with a way to put the darts down', JSON.stringify({ ph: s.ph, dk: s.dk, fov: s.fov, done: s.done }));
  const brd = await W((w, p) => p.screen('board')), chk = await W((w, p) => p.screen('chalk'));
  rec(onScreen(brd) && (onScreen(chk) || s.chalkEl), 'the board is in front of you and its chalkboard in sight (on a phone held upright, on the screen)', JSON.stringify({ board: brd.map(v => +v.toFixed(0)), chalk: chk.map(v => +v.toFixed(0)), chalkEl: s.chalkEl }));
  /* a real throw: point at the treble twenty, and throw (a click, a tap, Space) */
  await W(w => { w.snd = []; });
  const t20 = await W((w, p) => p.boardAt(0, .0915));
  if (mobile) { await page.touchscreen.tap(t20[0], t20[1] + 70); } else { await page.mouse.move(t20[0], t20[1]); await W(w => w.run(2)); s = await state(); rec(s.aim, 'the mark shows where your dart would go (and it sways a little)', ''); await page.mouse.click(t20[0], t20[1]); }
  await W(w => w.run(15)); s = await state();
  rec(s.darts.turn.length === 1 && s.darts.stuck === 1 && await W(w => w.count('dartThunk')) === 1, (mobile ? 'a tap' : 'a click') + ' throws: the dart flies and goes into the board with a thunk, and is chalked up', JSON.stringify(s.darts));
  const near20 = ['T20', '20', 'T1', '1', 'T5', '5', 'D20'].includes(s.darts.turn[0]); rec(near20, 'aimed at the treble twenty, it lands near it (your hand is never quite still)', s.darts.turn[0]);
  if (!mobile) { await page.keyboard.press('Space'); await W(w => w.run(15)); s = await state(); rec(s.darts.turn.length === 2, 'Space throws too', JSON.stringify(s.darts.turn)); }
  else { await page.touchscreen.tap(t20[0], t20[1] + 70); await W(w => w.run(15)); s = await state(); rec(s.darts.turn.length === 2, 'another tap throws again', JSON.stringify(s.darts.turn)); }
  await W((w, p) => { p.throwAt(0, 0); w.run(15); }); s = await state();
  rec(s.darts.turn.length === 3 && s.darts.st === 'done' && s.darts.turns === 1 && s.darts.best === s.darts.total && s.darts.best > 0, 'three darts make a turn: its total, and your best', JSON.stringify(s.darts));
  await W(w => w.run(70)); s = await state(); rec(s.darts.st === 'aim' && s.darts.stuck === 0 && await W(w => w.count('dartPull')) === 1, 'then the darts are drawn out of the board for the next turn', JSON.stringify({ st: s.darts.st, stuck: s.darts.stuck }));
  /* the scoring, as darts are scored: each part of the board (u across, v up, as a fraction of the double's outer wire) */
  const sc = await W((w, p) => { const RD = p.PB.RD, at = (n, k) => { const i = p.DART_N.indexOf(n), a = i * 18 * Math.PI / 180, r = k / 170 * RD; return [Math.sin(a) * r, Math.cos(a) * r]; };
    const q = { 'T20': at(20, 103), 'D16': at(16, 166), 'BULL': [0, .002], '25': [.009, 0], '20': at(20, 60), 'T19': at(19, 103), 'D3': at(3, 166), '6': at(6, 140), 'MISS': at(11, 190), '11': at(11, 130), 'T17': at(17, 104), 'D20': at(20, 165) };
    const o = {}; for (const k in q) { const s = p.score(...q[k]); o[k] = [s.l, s.s]; } return o; });
  const want = { T20: ['T20', 60], D16: ['D16', 32], BULL: ['BULL', 50], 25: ['25', 25], 20: ['20', 20], T19: ['T19', 57], D3: ['D3', 6], 6: ['6', 6], MISS: ['MISS', 0], 11: ['11', 11], T17: ['T17', 51], D20: ['D20', 40] };
  rec(Object.keys(want).every(k => sc[k][0] === want[k][0] && sc[k][1] === want[k][1]), 'the board scores as darts do: singles, doubles, trebles, the outer bull 25 and the bull 50, nothing off the board', JSON.stringify(sc));
  /* a turn at exact points: treble twenty, double sixteen, the bull: 142, chalked up, and kept as your best */
  await W((w, p, d) => { d.closeTalk(); w.run(3); const RD = p.PB.RD, at = (n, k) => { const i = p.DART_N.indexOf(n), a = i * 18 * Math.PI / 180, r = k / 170 * RD; return [Math.sin(a) * r, Math.cos(a) * r]; };   // (his word on your first turn put away: no throwing while he talks)
    p.throwAt(...at(20, 103)); w.run(12); p.throwAt(...at(16, 166)); w.run(12); p.throwAt(0, .001); w.run(12); });
  s = await state(); rec(JSON.stringify(s.darts.turn) === '["T20","D16","BULL"]' && s.darts.total === 142 && s.darts.shown.turn === 142 && s.darts.shown.rows.join() === 'T20 60,D16 32,BULL 50', 'treble twenty, double sixteen and the bull: 142, each chalked up with the turn', JSON.stringify(s.darts));
  const stored = await H(h => { try { return localStorage.getItem('heloria.darts.best'); } catch (e) { return 'threw'; } });
  rec(s.darts.best >= 142 && s.darts.shown.best === s.darts.best && +stored === s.darts.best, 'your best is chalked up and kept by your browser', JSON.stringify({ best: s.darts.best, stored }));
  await frames(3); await shot(pre + 'pub-5-darts');
  await W(w => w.run(70));
  const progD1 = await progs(); rec(progD1 === progD0, 'playing darts compiles nothing new', progD0 + ' then ' + progD1);
  /* shown again: a new visit finds the best your browser kept */
  const again = await W((w, p) => { p.P.dt.best = 0; return [p.reload(), p.state.darts.shown.best]; });
  rec(again[0] === s.darts.best && again[1] === s.darts.best, 'a new visit shows your best again, from your browser', JSON.stringify(again));
  /* and a browser that will not keep anything: the darts go on, the best is kept for this visit */
  const broken = await W((w, p, d) => { d.closeTalk(); w.run(70); d.closeTalk(); w.run(3); const S0 = Storage.prototype, g0 = S0.getItem, s0 = S0.setItem; S0.getItem = function () { throw new Error('no storage'); }; S0.setItem = function () { throw new Error('no storage'); };
    let err = null; try { const r = 103 / 170 * p.PB.RD; p.reload(); for (let k = 0; k < 3; k++){ p.throwAt(0, r); w.run(12); } } catch (e) { err = String(e); }
    const st_ = p.state.darts; S0.getItem = g0; S0.setItem = s0; return { err, best: st_.best, shown: st_.shown.best, total: st_.total, talk: p.state.talk }; });
  rec(!broken.err && broken.total === 180 && broken.best === 180 && broken.shown === 180, 'with a browser that will not keep anything, the darts go on and 180 is your best for this visit', JSON.stringify(broken));
  await W(w => w.run(30)); s = await state(); rec(s.talk === BML.ton, 'Tadhg: one hundred and eighty!', s.talk);
  if (mobile) await tap(vp.width / 2, vp.height * .35); else await page.keyboard.press('Enter'); await W((w, p, d) => { w.run(10); d.closeTalk(); w.run(60); });   // (a first tap may only finish his line: then it is put away)

  /* ---- Escape puts the darts down, Escape again takes you out, and one just after stays on Earth ---- */
  if (!mobile) {
    await page.keyboard.press('Escape'); await W(w => w.run(20)); s = await state(); rec(s.ph === 'idle' && s.st === 'in', 'Escape puts the darts down, and you are back at the bar', JSON.stringify({ ph: s.ph, st: s.st }));
    await page.keyboard.press('Escape'); await W(w => w.run(2)); s = await state(); rec(s.st === 'exit' && await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), 'Escape again takes you out (and does not leave Earth)', s.st);
    await W(w => w.until(p => p.P.st === 'out', 30 * 5)); await page.keyboard.press('Escape'); await wait(400);
    rec(await H(h => h.S.stId === 'cr' && h.S.mode === 'station'), 'an Escape just after coming out does not send you up to orbit');
  } else {
    await press('#crPbDone'); await W(w => w.run(20)); s = await state(); rec(s.ph === 'idle', 'Put the darts down takes you back to the bar', s.ph);
    await press('#crPbLeave'); await W(w => w.run(2)); s = await state(); rec(s.st === 'exit', 'Leave the pub takes you out', s.st);
    await W(w => w.until(p => p.P.st === 'out', 30 * 5));
  }
  r = await W(w => { w.run(20); return w.until(p => p.P.st === 'out', 3); }); s = await state();
  rec(s.st === 'out' && s.me && s.near === .1 && s.k < .05 && s.you[1] > 1.4, 'you are back on the pavement with the walking camera', JSON.stringify({ you: s.you, k: s.k, near: s.near }));
  await frames(4); rec(await visible('#crPost') && await W(w => w.lastMusic) > .5, 'and the postcard button is back, the music as it was');

  /* ---- in by E (on a phone its tag), out by the button ---- */
  await W(w => { w.put(-.32, 2.45, -.32, 0); w.run(30); }); await frames(4);
  if (mobile) { tg = await tagEl(); await page.touchscreen.tap(tg.xy[0], tg.xy[1]); } else await page.keyboard.press('KeyE');
  s = await state(); rec(s.st === 'enter', (mobile ? 'tapping its tag' : 'E by the door') + ' takes you in', s.st);
  await W(w => w.until(p => p.P.st === 'in', 30 * 5)); await W(w => w.run(10));
  s = await state(); rec(s.talk === BML.again, 'back in, Tadhg is glad to see you again', s.talk);
  if (mobile) await tap(vp.width / 2, vp.height * .35); else await page.keyboard.press('Enter'); await W(w => w.run(5));
  await press('#crPbLeave'); await W(w => w.until(p => p.P.st === 'out', 30 * 5)); await W(w => w.run(20)); await frames(3);
  rec(!(await page.evaluate(() => document.querySelector('.st-cr').classList.contains('inpub'))) && await visible('#crPost'), 'the button takes you out, and the street is as it was', '');
  /* walking into the door takes you in too */
  await W(w => { w.put(-.32, 3.2, -.32, 0); w.run(5); });
  if (!mobile) { await page.keyboard.down('KeyW'); r = await W(w => w.until(p => p.P.st !== 'out', 30 * 5)); await page.keyboard.up('KeyW'); s = await state(); rec(s.st === 'enter', 'and walking into the door takes you in', JSON.stringify(r)); await W(w => w.until(p => p.P.st === 'in', 30 * 5)); await W((w, p, d) => { d.closeTalk(); p.leave(); w.until(p => p.P.st === 'out', 30 * 5); }); }

  /* ---- the way to everywhere, past the pub: every landmark and everyone you can talk to ---- */
  const nav = await W((w, p, d) => { const from = { pad: [-3.2, -12], pub: p.local(-.32, 2.4), po: d.po.local(.95, 2.1) }, out = {};
    const goals = { ...Object.fromEntries(Object.entries(d.INST).map(([k, q]) => [k, [q.x, q.z, Math.max(1.2, q.r * .8)]])), ...Object.fromEntries(d.people.map(q => [q.first, [q.x, q.z, 1.8]])), Diarmuid: [...d.busk.spot, 1.8],
      pubDoor: [...p.local(-.32, 2.2), 1.2], poDoor: [...d.po.local(.95, 2.15), 1.2], fire: [...d.fire.local(-.3, 2.2), 1.2], bench: [...d.cliff.M.sitA, 1.3], kite: [...d.cliff.M.kiteA, 1.3] };
    for (const [f, [fx, fz]] of Object.entries(from)) for (const [g, [gx, gz, rr]] of Object.entries(goals)) { const q = d.navPath(fx, fz, gx, gz, rr); out[f + '>' + g] = q ? q.length : null; }
    return out; });
  const miss = Object.entries(nav).filter(([, v]) => v === null).map(([k]) => k);
  rec(miss.length === 0, 'there is a way to every landmark, each of us, Diarmuid, the cliff and every door on the street, from the pad, the pub and the post office', miss.length ? 'none for ' + miss.join(', ') : Object.keys(nav).length + ' ways');

  /* ---- with --meter: how loud each new sound is, against a footstep (and the session, when the page plays it itself) ---- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async (fn, ms = 900) => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(300); return +pk.toFixed(4); };
    await H(h => { h.A.music(0); }); await wait(1500);
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['step(0) again', h => h.A.step(0)], ['step(1) again', h => h.A.step(1)], ['door(open)', h => h.A.pubDoor(true)], ['door(shut)', h => h.A.pubDoor(false)],
      ['glass', h => h.A.pubGlass(1)], ['clink', h => h.A.pubGlass(1, true)], ['fire', h => h.A.pubFire(.016, true)], ['thunk', h => h.A.dartThunk(true)], ['thunk(wall)', h => h.A.dartThunk(false)], ['pull', h => h.A.dartPull()]]) lv[n] = await listen(f);
    const webaudio = await page.evaluate(() => /webaudio/.test(location.search));
    if (webaudio) { await W((w, p, d) => { d.sky.set({ time: '21:30', date: '2026-07-17' }); p.enter(); w.until(p => p.P.st === 'in', 30 * 5); d.closeTalk(); w.run(30); });
      let ok = false; for (let i = 0; i < 180 && !ok; i++) { await wait(500); await W(w => w.run(3)); ok = await H(h => h.A._loops().some(l => l.name === 'session' && l.ready && l.playing)); }
      log('SESSION LOOP ' + JSON.stringify(await H(h => ({ loop: h.A._loops().find(l => l.name === 'session'), st: h.ST.cr._dbg.pub.state.st, sess: h.ST.cr._dbg.pub.state.sess }))));
      await H(h => { h.A.music(0); window.__P.hold = setInterval(() => h.A.music(0), 50); }); await wait(1200); lv.session = await listen(h => {}, 3500); await H(h => clearInterval(window.__P.hold)); lv.sessionPlaying = ok;
      await W((w, p, d) => { p.leave(); w.until(p => p.P.st === 'out', 30 * 5); d.sky.set({ time: '15:00', date: '2026-07-15' }); w.run(30); }); }
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)'], lv['step(0) again'], lv['step(1) again']);
    const names = ['door(open)', 'door(shut)', 'glass', 'clink', 'fire', 'thunk', 'thunk(wall)', 'pull'].concat(webaudio ? ['session'] : []);
    rec(step > 0 && names.every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'each new sound is heard, and none is much louder than a footstep' + (webaudio ? ' (the session neither)' : ''), JSON.stringify(lv));
  }

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

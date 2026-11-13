/* Inside the lighthouse on Earth: the door at its foot, the spiral stair, the keeper's room and his log, the lamp room with
   the lens turning, and the gallery round the top.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/lighthouse-inside.cjs --out <dir> [--mobile] [--query time=21:30]
   From the path its door is in view and its tag says Go in (Steer the light is still offered a step back from the door). In
   by a click (a tap) on the door from the path: the door opens and shuts, and you are at the foot of the stair in your own
   eyes, nothing of the street drawn over it and the music quieter. Climb (E, or the button): the camera goes up and round
   with an iron ring under each step and the wind growing, to the keeper's room. Read the log (E, or the button): its pages
   turn (the arrows, or a tap on a page), and every line of it is in the site's own words (the walk, the README, the white
   page), the last page today's. Up to the lamp: the lens turns with the beam and its motor hums. Step out onto the gallery
   and walk round it (the arrows, or a drag), with the sea and the gulls below. Back in, down the ladder, down the stair
   and out (Escape, or the buttons), and an Escape just after stays on Earth. Nothing new is compiled the whole way. */
const fs = require('fs'), path = require('path');
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  await H(h => {
    const st = h.ST.cr, d = st._dbg, L = d.lighthouse;
    window.__L = {
      snd: [], lastMusic: null,
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } },
      until(src, max) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(L, d); i++) this.run(1); return { frames: i, done: !!f(L, d) }; },
      put(lx, lz, fx, fz) { const [x, z] = L.local(lx, lz), P = d.player, t = d.at(...L.local(fx, fz)); P.x = x; P.z = z; P.u.copy(d.at(x, z)); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      count(n) { return this.snd.filter(s => s.n === n).length; },
    };
    for (const n of ['civDoor', 'ironStep', 'gull', 'step', 'poShuffle']) { const f = h.A[n]; h.A[n] = function () { window.__L.snd.push({ n, t: h.S.t, a: [...arguments] }); return f.apply(this, arguments); }; }
    { const f = h.A.music; h.A.music = function (v) { window.__L.lastMusic = v; return f.apply(this, arguments); }; }
  });
  const W = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__L, h.ST.cr._dbg.lighthouse, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const state = () => W((w, L) => L.state);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const onScreen = q => q[2] < 1 && q[0] > 0 && q[0] < vp.width && q[1] > 0 && q[1] < vp.height;
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 90000 }); else await page.click(sel, { timeout: 90000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }, sel);
  const fits = sel => page.evaluate(([sel, w, h]) => [...document.querySelectorAll(sel)].filter(e => !e.hidden && getComputedStyle(e).display !== 'none').every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= w && r.top >= 0 && r.bottom <= h; }), [sel, vp.width, vp.height]);
  const tagEl = () => page.evaluate(() => { const e = document.querySelector('#crLabels .crwlh'), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    return { txt: e.textContent, on: e.classList.contains('on'), can: e.classList.contains('can'), xy: [x, y], top: !!top && (top === e || e.contains(top)) }; });
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const night = await H(h => { const d = h.ST.cr._dbg; d.skipCut(); return d.sky.state.night > .5; });
  const pre = (mobile ? 'm-' : '') + (night ? 'n-' : '');
  await H(h => { h.A.start && h.A.start(); });
  await W(w => { window.__heloria.ST.cr._dbg.began(); w.run(30); }); await wait(300);

  /* ---- before: nothing inside drawn, no error; the lantern as it always was from outside ---- */
  let s = await state(); rec(s.st === 'out' && !s.vis && s.topOut && !(await W((w, L) => L.err)), 'before: you are outside, nothing inside the lighthouse is drawn, and it was built without an error', JSON.stringify({ st: s.st, vis: s.vis, err: await W((w, L) => L.err) }));

  /* ---- from the path: the door; a step back from it Steer the light is offered, by the door its tag says Go in ---- */
  await W(w => { w.put(0, 2.75, 0, 0); w.run(40); }); await frames(4);
  const dxy = await W((w, L) => L.screen('door')); s = await state();
  rec(onScreen(dxy) && s.tag.on && s.tag.txt === 'Go in' && !s.tag.can, 'from the path the door is in view and its tag says Go in', JSON.stringify({ door: dxy.map(v => +v.toFixed(0)), tag: s.tag }));
  let steer = false; for (let i = 0; i < 20 && !steer; i++) { await W(w => w.run(3)); steer = await visible('#crSteer'); }
  rec(steer, 'a step back from the door Steer the light is offered, as before');
  await shot(pre + 'lhi-1-path');
  await W(w => { w.put(0, 2.3, 0, 0); w.run(30); }); await frames(4);
  let tg = await tagEl(); rec(tg.on && tg.can && tg.top, 'by the door its tag says Go in, and how (E, or Tap)', JSON.stringify(tg));
  const prog0 = await progs();

  /* ---- in by a click (a tap) on the door from the path ---- */
  await W(w => { w.put(0, 3.4, 0, 0); w.run(30); w.snd = []; }); await frames(4);
  const dxy2 = await W((w, L) => L.screen('door')); await tap(dxy2[0], dxy2[1]); s = await state();
  rec(s.st === 'go' || s.st === 'enter', (mobile ? 'a tap' : 'a click') + ' on the door from the path sets you walking over and in', JSON.stringify({ st: s.st, xy: dxy2.map(v => +v.toFixed(0)) }));
  let r = await W(w => w.until(L => L.L.st === 'in', 30 * 25)); s = await state();
  rec(r.done && s.st === 'in' && s.at === 'foot' && !s.me && s.near === .02 && s.vis, 'you walk up the steps and in, and stand at the foot of the stair in your own eyes, with a nearer lens', JSON.stringify({ r, st: s.st, at: s.at, me: s.me, near: s.near, eye: s.eye }));
  rec(await W(w => w.count('civDoor')) === 2, 'the door opens with its latch and knocks shut behind you', String(await W(w => w.count('civDoor'))));
  const progIn = await progs(); rec(progIn === prog0, 'going in compiles no new shader (made ready with the rest of Earth)', prog0 + ' then ' + progIn);
  const quiet = await page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
    return { labels: vis(document.querySelector('#crLabels')), card: vis(document.querySelector('#crProj')) && document.querySelector('#crProj').classList.contains('on'), steer: vis(document.querySelector('#crSteer')), post: vis(document.querySelector('#crPost')), leave: vis(document.querySelector('#crLhLeave')), inlh: document.querySelector('.st-cr').classList.contains('inlh') }; });
  rec(!quiet.labels && !quiet.card && !quiet.steer && quiet.inlh, 'nothing of the street is drawn over the room: no tags, no landmark card, no Steer the light', JSON.stringify(quiet));
  rec(quiet.leave && !quiet.post && await visible('#crLhClimb'), 'there is a way out and a way up, and no postcard button inside', JSON.stringify(quiet));
  rec(await fits('.crlhb,#crLhLeave'), 'the buttons fit on the screen');
  const mus = await W(w => w.lastMusic); rec(mus > .2 && mus < .4, 'the town\'s music is a little quieter in here', String(mus));
  const air0 = s.air;
  await W(w => w.run(10)); await frames(3); await shot(pre + 'lhi-2-foot');
  /* looking round */
  const y0 = await W((w, L) => L.L.yaw);
  if (!mobile) { await page.keyboard.down('ArrowLeft'); await W(w => w.run(25)); await page.keyboard.up('ArrowLeft'); }
  else { const cdp = await page.context().newCDPSession(page), x0 = vp.width * .6, y = vp.height * .45; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - i * 25, y, id: 1 }] }); await W(w => w.run(1)); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  const y1 = await W((w, L) => L.L.yaw); rec(Math.abs(y1 - y0) > .3 && (await state()).st === 'in', (mobile ? 'a drag' : 'the arrows') + ' look round, and you stay in', JSON.stringify({ y0: +y0.toFixed(2), y1: +y1.toFixed(2) }));

  /* ---- up the stair ---- */
  await W(w => { w.snd = []; });
  if (mobile) await press('#crLhClimb'); else await page.keyboard.press('KeyE');
  s = await state(); rec(s.mv === 'climb', (mobile ? 'Climb the stair' : 'E') + ' sets you climbing', JSON.stringify({ mv: s.mv }));
  await W(w => w.run(75)); await frames(3); await shot(pre + 'lhi-3-stair'); const mid = await state();
  r = await W(w => w.until(L => L.L.at === 'keep' && !L.L.mv, 30 * 8)); s = await state();
  rec(r.done && s.at === 'keep' && s.eye[1] > 4 && mid.eye[1] > 2 && mid.eye[1] < s.eye[1], 'the camera climbs round and up with you to the keeper\'s room', JSON.stringify({ mid: mid.eye, top: s.eye, r }));
  const steps = await W(w => w.count('ironStep')); rec(steps >= 10, 'an iron ring under each step', String(steps));
  await W(w => w.run(45)); s = await state(); rec(s.air[0] > air0[0] + .2, 'the wind in the tower grows as you climb', JSON.stringify({ foot: air0, keep: s.air }));
  await frames(3); await shot(pre + 'lhi-4-keeper');

  /* ---- the log ---- */
  if (mobile) await press('#crLhLog'); else await page.keyboard.press('KeyE');
  await W(w => w.run(40)); s = await state();
  rec(s.logOn && s.log > .99 && await visible('#crLhNext') && await visible('#crLhClose'), (mobile ? 'Read the log' : 'E') + ' opens the log on the desk, with a way to turn its pages and to close it', JSON.stringify({ logOn: s.logOn, log: s.log }));
  const LOG = await W((w, L) => L.LHLOG.map((sp, i) => ({ text: L.text(i), lines: sp.flatMap(p => p.today ? [] : p.t) })));
  let txt = await W((w, L) => L.text(L.L.page)); rec(/HELORIA LABS/.test(txt) && /A small software lab in Ireland/.test(txt), 'its first pages: Heloria Labs, three of us in Ireland', txt.slice(0, 120));
  await frames(3); await shot(pre + 'lhi-5-log');
  const pages = [s.page];
  for (let i = 0; i < 3; i++) { if (mobile) { await frames(2); const q = await W((w, L) => L.screen('pgR')); await tap(q[0], q[1]); } else await page.keyboard.press('ArrowRight'); await W(w => w.run(25)); pages.push((await state()).page); }
  rec(pages.join() === '0,1,2,3', (mobile ? 'a tap on the right-hand page' : 'the arrow') + ' turns to the next spread, to the end', pages.join());
  txt = await W((w, L) => L.text(L.L.page)); const today = await W((w, L) => L.today());
  rec(/TODAY/.test(txt) && txt.includes(today[0]) && /Andrena Ventures/.test(txt), 'the last page: backed by Andrena Ventures, and today, at your time', JSON.stringify(today));
  await frames(3); await shot(pre + 'lhi-6-log-today');
  if (mobile) await press('#crLhPrev'); else await page.keyboard.press('ArrowLeft'); await W(w => w.run(25)); s = await state(); rec(s.page === 2, 'and back a spread', String(s.page));
  /* every line of the log is in the site's own words: the walk, the README, the white page, the plaques */
  const strip = t => t.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ');
  const norm = t => ' ' + t.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}@]+/gu, ' ').trim() + ' ';
  const root = path.resolve(__dirname, '..', '..'), src = norm([strip(fs.readFileSync(path.join(root, 'tamed/src/body.html'), 'utf8')), strip(fs.readFileSync(path.join(root, 'untamed/src/body.html'), 'utf8')), fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
    (fs.readFileSync(path.join(root, 'untamed/src/stations/cr/station.js'), 'utf8').match(/const PLAQ=\[[\s\S]*?\];/) || [''])[0]].join(' '));
  const missing = []; for (const sp of LOG) for (const line of sp.lines) for (const frag of line.split(/[.:;,]\s+|\.$/)) { const f = norm(frag); if (f.trim().split(' ').length < 2) continue; if (!src.includes(f)) missing.push(frag); }
  rec(missing.length === 0, 'every line of the log is in the site\'s own words, nothing made up', missing.length ? JSON.stringify(missing) : LOG.reduce((a, s) => a + s.lines.length, 0) + ' lines');
  if (mobile) await press('#crLhClose'); else await page.keyboard.press('Escape');
  await W(w => w.run(30)); s = await state(); rec(!s.logOn && s.st === 'in' && s.at === 'keep', (mobile ? 'Close the log' : 'Escape') + ' shuts the log, and you are still in the keeper\'s room', JSON.stringify({ logOn: s.logOn, at: s.at }));

  /* ---- up to the lamp ---- */
  await W(w => { w.snd = []; });
  if (mobile) await press('#crLhUp'); else { await page.keyboard.down('KeyW'); await W(w => w.run(14)); await page.keyboard.up('KeyW'); }
  r = await W(w => w.until(L => L.L.at === 'lamp' && !L.L.mv, 30 * 6)); s = await state();
  rec(r.done && s.at === 'lamp' && s.eye[1] > 6.5, (mobile ? 'Up to the lamp' : 'W') + ' takes you up the ladder through the hatch to the lamp room', JSON.stringify({ at: s.at, eye: s.eye }));
  const ly0 = s.lensYaw; await W(w => w.run(60)); s = await state();
  rec(Math.abs(s.lensYaw - ly0) > .5 && s.air[1] > .5 && !s.topOut, 'the big lens turns (with the beam) and its motor hums; the lantern\'s glass is clear from in here', JSON.stringify({ lens: [ly0, s.lensYaw], air: s.air, topOut: s.topOut }));
  await frames(3); await shot(pre + 'lhi-7-lamp');

  /* ---- out onto the gallery, and round it ---- */
  if (mobile) await press('#crLhOut'); else await page.keyboard.press('KeyE');
  r = await W(w => w.until(L => L.L.at === 'gal' && !L.L.mv, 30 * 6)); await W(w => w.run(20)); s = await state();
  rec(r.done && s.at === 'gal' && s.gd > .9 && await visible('#crLhBack'), (mobile ? 'Step out' : 'E') + ': the lantern\'s door opens and you are out on the gallery, with a way back in', JSON.stringify({ at: s.at, gd: s.gd }));
  rec(s.air[0] > .8 && s.air[2] > .6, 'out here the wind is strongest and the sea is below', JSON.stringify(s.air));
  await frames(3); await shot(pre + 'lhi-8-gallery');
  const g0 = s.ga;
  if (!mobile) { await page.keyboard.down('ArrowLeft'); await W(w => w.run(60)); await page.keyboard.up('ArrowLeft'); }
  else { const cdp = await page.context().newCDPSession(page), x0 = vp.width * .7, y = vp.height * .4; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 2 }] }); for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - i * 22, y, id: 2 }] }); await W(w => w.run(2)); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  await W(w => w.run(60)); s = await state(); rec(Math.abs(s.ga - g0) > .6 && s.at === 'gal', (mobile ? 'a drag' : 'the arrows') + ' walk you round the gallery', JSON.stringify({ ga: [g0, s.ga] }));
  await frames(3); await shot(pre + 'lhi-9-gallery-round');
  await W(w => w.run(30 * 12)); rec(await W(w => w.count('gull')) >= 1 && await W(w => w.count('ironStep')) >= 2, 'gulls below, and your steps ring on the iron deck', JSON.stringify({ gulls: await W(w => w.count('gull')), steps: await W(w => w.count('ironStep')) }));

  /* ---- back in, down, and out ---- */
  if (mobile) await press('#crLhBack'); else await page.keyboard.press('Escape');
  r = await W(w => w.until(L => L.L.at === 'lamp' && !L.L.mv, 30 * 6)); await W(w => w.run(40)); s = await state();
  rec(r.done && s.at === 'lamp' && s.gd < .1, (mobile ? 'Back in' : 'Escape') + ' brings you in off the gallery, and the door shuts behind you', JSON.stringify({ at: s.at, gd: s.gd }));
  if (mobile) await press('#crLhDown'); else await page.keyboard.press('Escape');
  r = await W(w => w.until(L => L.L.at === 'keep' && !L.L.mv, 30 * 6)); rec(r.done, 'down the ladder to the keeper\'s room', JSON.stringify(r));
  if (mobile) await press('#crLhDown'); else { await page.keyboard.down('KeyS'); await W(w => w.run(14)); await page.keyboard.up('KeyS'); }
  r = await W(w => w.until(L => L.L.at === 'foot' && !L.L.mv, 30 * 8)); s = await state(); rec(r.done && s.at === 'foot' && s.eye[1] < 2, 'and down the stair to the foot', JSON.stringify({ at: s.at, eye: s.eye }));
  if (!mobile) {
    await page.keyboard.press('Escape'); await W(w => w.run(2)); s = await state(); rec(s.st === 'exit' && await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), 'Escape at the foot takes you out (and does not leave Earth)', s.st);
    await W(w => w.until(L => L.L.st === 'out', 30 * 5)); await page.keyboard.press('Escape'); await wait(400);
    rec(await H(h => h.S.stId === 'cr' && h.S.mode === 'station'), 'an Escape just after coming out does not send you up to orbit');
  } else { await press('#crLhLeave'); await W(w => w.run(2)); s = await state(); rec(s.st === 'exit', 'Leave the lighthouse takes you out', s.st); await W(w => w.until(L => L.L.st === 'out', 30 * 5)); }
  await W(w => w.run(20)); s = await state();
  rec(s.st === 'out' && s.me && s.near === .1 && s.k < .05 && s.you[1] > 1.9 && s.topOut, 'you are back on the path with the walking camera, the lantern as it was', JSON.stringify({ you: s.you, k: s.k, near: s.near }));
  await frames(4); rec(await visible('#crPost') && await W(w => w.lastMusic) > .5, 'and the postcard button is back, the music as it was');
  const progOut = await progs(); rec(progOut === prog0, 'the whole way up and down compiled nothing new', prog0 + ' then ' + progOut);

  /* ---- in again by E at the door (on a phone its tag), and out by the button ---- */
  await W(w => { w.put(0, 2.3, 0, 0); w.run(30); }); await frames(4);
  if (mobile) { tg = await tagEl(); await page.touchscreen.tap(tg.xy[0], tg.xy[1]); } else await page.keyboard.press('KeyE');
  s = await state(); rec(s.st === 'enter', (mobile ? 'tapping its tag' : 'E by the door') + ' takes you in', s.st);
  await W(w => w.until(L => L.L.st === 'in', 30 * 5)); await press('#crLhLeave'); await W(w => w.until(L => L.L.st === 'out', 30 * 5)); await W(w => w.run(20));
  rec(!(await page.evaluate(() => document.querySelector('.st-cr').classList.contains('inlh'))) && await visible('#crPost'), 'the button takes you out, and the path is as it was', '');

  /* ---- the way to the door, from the pad and from the square ---- */
  const nav = await W((w, L, d) => { const g = L.local(0, 2.34), out = {}; for (const [n, [x, z]] of Object.entries({ pad: [-3.2, -12], square: [0, 2.2], pub: d.pub.local(-.32, 2.4) })) { const q = d.navPath(x, z, g[0], g[1], 1.2); out[n] = q ? q.length : null; } return out; });
  rec(Object.values(nav).every(v => v !== null), 'there is a way to the lighthouse\'s door from the pad, the square and the pub', JSON.stringify(nav));

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

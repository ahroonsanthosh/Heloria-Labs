/* The chipper on Earth: Lanzetti's, its hours, its queue, going in, ordering, the salt and the vinegar, the paper, and
   your chips carried out.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/chipper.cjs --out <dir> [--mobile]
   By the visitor's clock: shut in the morning (the shutter down, its sign, the tag says when it opens and E does nothing),
   open from lunchtime until two (the shutter rolls up); someone waiting at lunch, a small queue in the evening, busy while
   the market is on. From the street its name is in view. In by a click (a tap) on the front: the bell, and you are at the
   counter in your own eyes, Enzo saying hello, the menu up, the fryer heard and the town's music quieter. Order (a key,
   or a tap on the menu): said back, rung into the till, fried (the basket lifted and shaken), laid out on the paper. Salt
   and vinegar by the buttons and by a tap on the cellar; wrapped (E, or the button); taken outside (the button), and
   carried. Everything on the menu can be had. Escape mid-order leaves without chips, and an Escape just after stays on
   Earth. Nothing new is compiled the whole way, and the paths round the shop stay open. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  await H(h => {
    const st = h.ST.cr, d = st._dbg, C = d.chipper;
    window.__C = {
      snd: [], lastMusic: null,
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } },
      until(src, max) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(C, d); i++) this.run(1); return { frames: i, done: !!f(C, d) }; },
      put(lx, lz, fx, fz) { const [x, z] = C.local(lx, lz), P = d.player, t = d.at(...C.local(fx, fz)); P.x = x; P.z = z; P.u.copy(d.at(x, z)); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      count(n) { return this.snd.filter(s => s.n === n).length; },
    };
    for (const n of ['poBell', 'till', 'mktFry', 'mktBasket', 'shaker', 'vinegar', 'wrap', 'poShuffle', 'murmur', 'shutterMotor']) { const f = h.A[n]; h.A[n] = function () { window.__C.snd.push({ n, t: h.S.t, a: [...arguments] }); return f.apply(this, arguments); }; }
    { const f = h.A.music; h.A.music = function (v) { window.__C.lastMusic = v; return f.apply(this, arguments); }; }
  });
  const W = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__C, h.ST.cr._dbg.chipper, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const state = () => W((w, C) => C.state);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const onScreen = q => q[2] < 1 && q[0] > 0 && q[0] < vp.width && q[1] > 0 && q[1] < vp.height;
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 90000 }); else await page.click(sel, { timeout: 90000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }, sel);
  const fits = sel => page.evaluate(([sel, w, h]) => [...document.querySelectorAll(sel)].filter(e => { for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden') return false; } return !e.hidden; }).every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= w + 1 && r.top >= -1 && r.bottom <= h + 1; }), [sel, vp.width, vp.height]);
  const tagEl = () => page.evaluate(() => { const e = document.querySelector('#crLabels .crwch'), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    return { txt: e.textContent, on: e.classList.contains('on'), can: e.classList.contains('can'), xy: [x, y], top: !!top && (top === e || e.contains(top)) }; });
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const at = (time, date = '2026-07-15') => W((w, C, d, h, a) => { d.sky.set({ time: a[0], date: a[1] }); w.run(100); return C.state; }, [time, date]);
  await H(h => { const d = h.ST.cr._dbg; d.skipCut(); }); const pre = mobile ? 'm-' : '';
  await H(h => { h.A.start && h.A.start(); });
  await W(w => { window.__heloria.ST.cr._dbg.began(); w.run(30); }); await wait(300);
  const CHL = await W((w, C) => C.CHL), MENU = await W((w, C) => C.CHMENU);

  /* ---- before: nothing inside drawn, no error ---- */
  let s = await state(); rec(s.st === 'out' && !s.vis && !(await W((w, C) => C.err)), 'before: you are in the street, nothing inside the chipper is drawn, and it was built without an error', JSON.stringify({ st: s.st, vis: s.vis, err: await W((w, C) => C.err) }));

  /* ---- its hours, by your clock: shut in the morning, open from lunchtime, a queue in the evening, busy on market nights ---- */
  await W(w => { w.put(.95, 2.3, .95, 0); w.run(10); });
  s = await at('09:30'); let tg;
  rec(!s.open && s.sh > .99 && s.q === 0 && !s.queue.some(Boolean), 'in the morning it is shut: the shutter down, and no one waiting', JSON.stringify({ open: s.open, sh: s.sh, q: s.q }));
  await frames(4); tg = await tagEl();
  rec(tg.on && !tg.can && /lunch/i.test(tg.txt), 'by the door its tag says when it opens (and not how to go in)', JSON.stringify(tg));
  if (!mobile) { await page.keyboard.press('KeyE'); await W(w => w.run(5)); s = await state(); rec(s.st === 'out', 'E by the shut door does nothing', s.st); }
  await W(w => { w.put(.3, 4.6, .3, 0); w.run(10); }); await frames(4); await shot(pre + 'chip-1-shut');
  s = await at('12:40'); rec(s.open && s.sh < .01 && s.q === 1 && s.queue[0] && !s.queue[3], 'from lunchtime it is open: the shutter rolled up, and someone waiting', JSON.stringify({ open: s.open, sh: s.sh, q: s.q, queue: s.queue }));
  s = await at('15:30'); rec(s.open && s.q === 0, 'quiet in the afternoon', JSON.stringify({ q: s.q }));
  s = await at('17:30'); rec(s.q === 2 && s.queue[0] && s.queue[1] && !s.queue[2], 'a small queue in the evening', JSON.stringify({ q: s.q, queue: s.queue }));
  s = await at('21:15'); const mkt = await W((w, C, d) => d.market.open());
  rec(mkt && s.q === 4 && s.queue.every(Boolean), 'busier while the market is on: inside, on the bench and at the door', JSON.stringify({ market: mkt, q: s.q, queue: s.queue }));
  await frames(4); const fa = await W((w, C) => C.screen('fascia'));
  rec(onScreen(fa), 'from across the street LANZETTI\'S is over the window', JSON.stringify(fa.map(v => +v.toFixed(0))));
  await shot(pre + 'chip-2-street-market');
  s = await at('01:30', '2026-07-16'); rec(s.open, 'still open at half one', JSON.stringify({ open: s.open }));
  s = await at('02:30', '2026-07-16'); rec(!s.open && s.sh > .99, 'shut by half two, the shutter down', JSON.stringify({ open: s.open, sh: s.sh }));
  s = await at('19:10'); rec(s.open && s.sh < .01, 'open again in the evening', JSON.stringify({ sh: s.sh }));
  const prog0 = await progs();

  /* ---- in by a click (a tap) on the front from across the street ---- */
  await W(w => { w.put(.3, 4.6, .3, 0); w.run(30); w.snd = []; }); await frames(4);
  const dxy = await W((w, C) => C.screen('door')); await tap(dxy[0], dxy[1]); s = await state();
  rec(s.st === 'go' || s.st === 'enter', (mobile ? 'a tap' : 'a click') + ' on the shop from across the street sets you walking over and in', JSON.stringify({ st: s.st, xy: dxy.map(v => +v.toFixed(0)) }));
  let r = await W(w => w.until(C => C.C.st === 'in', 30 * 25)); s = await state();
  rec(r.done && s.st === 'in' && !s.me && s.near === .02 && s.vis, 'you walk over and in, and stand at the counter in your own eyes', JSON.stringify({ r, st: s.st, me: s.me, near: s.near }));
  rec(await W(w => w.count('poBell')) === 2, 'the bell over the door as it opens, and as it shuts', String(await W(w => w.count('poBell'))));
  const progIn = await progs(); rec(progIn === prog0, 'going in compiles no new shader (made ready with the rest of Earth)', prog0 + ' then ' + progIn);
  rec(s.say === CHL.hi || s.say === CHL.night, 'Enzo says hello', s.say);
  rec(s.menu && await visible('.crchip .crdrink') && s.leave, 'the menu is up, with a way out', JSON.stringify({ menu: s.menu, leave: s.leave }));
  rec(await fits('.crchip .crmenu,#crChLeave'), 'the menu and the way out fit on the screen');
  const quiet = await page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
    return { labels: vis(document.querySelector('#crLabels')), post: vis(document.querySelector('#crPost')), inchip: document.querySelector('.st-cr').classList.contains('inchip') }; });
  rec(!quiet.labels && !quiet.post && quiet.inchip, 'nothing of the street is drawn over the room, and no postcard button', JSON.stringify(quiet));
  await W(w => w.run(30)); s = await state(); const mus = await W(w => w.lastMusic);
  rec(mus > .2 && mus < .4 && s.fry > .3, 'the fryer is heard and the town\'s music is a little quieter', JSON.stringify({ mus, fry: s.fry }));
  await wait(900); await frames(3); await shot(pre + 'chip-3-inside');

  /* ---- an order: a one and one ---- */
  await W(w => { w.snd = []; });
  if (mobile) { const b = await page.$$('.crchip .crdrink'); await b[1].tap(); } else await page.keyboard.press('Digit2');
  s = await state(); rec(s.ph === 'said' && s.oi === 1 && s.say === CHL.items[1], (mobile ? 'a tap on the menu' : 'the key') + ' orders it, and Enzo says it back', JSON.stringify({ ph: s.ph, oi: s.oi, say: s.say }));
  await W(w => w.until(C => C.C.ph === 'fry' && C.C.ot > 1.5, 30 * 6)); await frames(3); await shot(pre + 'chip-4-fryer'); s = await state();
  rec(s.enzo.act === 'fry' && s.fry > .5, 'he lifts the basket out of the fryer and shakes it', JSON.stringify({ enzo: s.enzo, fry: s.fry }));
  r = await W(w => w.until(C => C.C.ph === 'season', 30 * 8)); s = await state();
  rec(r.done && s.paper.sheet && s.paper.heap === 1 && s.say === CHL.sv, 'it is laid out on the paper in front of you: salt and vinegar?', JSON.stringify({ paper: s.paper, say: s.say }));
  rec(await W(w => w.count('till')) === 1 && await W(w => w.count('mktFry')) >= 1 && await W(w => w.count('mktBasket')) >= 2, 'the till rings it in, the oil spits, the basket is shaken', JSON.stringify({ till: await W(w => w.count('till')), fry: await W(w => w.count('mktFry')), basket: await W(w => w.count('mktBasket')) }));
  await frames(3); await shot(pre + 'chip-5-paper');
  await press('#crChSalt'); await W(w => w.run(20)); await frames(3); await shot(pre + 'chip-6-salt'); await W(w => w.run(40)); s = await state();
  rec(s.salt === 1 && s.paper.salted && await W(w => w.count('shaker')) === 1, 'Salt: the cellar shaken over the chips', JSON.stringify({ salt: s.salt, salted: s.paper.salted }));
  await press('#crChVin'); await W(w => w.run(60)); s = await state();
  rec(s.vin === 1 && s.paper.vined && await W(w => w.count('vinegar')) === 1, 'Vinegar: the bottle shaken over them, and the hiss', JSON.stringify({ vin: s.vin, vined: s.paper.vined }));
  await frames(3); { const q = await W((w, C) => C.screen('salt')); await tap(q[0], q[1]); await W(w => w.run(60)); s = await state(); rec(s.salt === 2, (mobile ? 'a tap' : 'a click') + ' on the salt cellar itself shakes it again', JSON.stringify({ salt: s.salt, xy: q.map(v => +v.toFixed(0)) })); }
  if (mobile) await press('#crChWrap'); else await page.keyboard.press('KeyE');
  await W(w => w.run(20)); await frames(3); await shot(pre + 'chip-7-wrapping');
  r = await W(w => w.until(C => C.C.ph === 'ready', 30 * 4)); await W(w => w.run(20)); s = await state();
  rec(r.done && s.paper.parcel && !s.paper.sheet && s.say === CHL.ready && await W(w => w.count('wrap')) >= 1, (mobile ? 'Wrap it up' : 'E') + ' and he wraps it in the paper and hands it over', JSON.stringify({ paper: s.paper, say: s.say }));
  rec(await visible('#crChTake'), 'Take it outside is offered');
  await frames(3); await shot(pre + 'chip-8-wrapped');
  const progD = await progs(); rec(progD === prog0, 'ordering compiles nothing new', prog0 + ' then ' + progD);

  /* ---- taken outside, and carried ---- */
  await press('#crChTake'); s = await state(); rec(s.st === 'exit' && s.carry === 1, 'Take it outside: out you go with it', JSON.stringify({ st: s.st, carry: s.carry }));
  await W(w => w.until(C => C.C.st === 'out', 30 * 5)); await W(w => w.run(30)); s = await state();
  rec(s.st === 'out' && s.me && s.carryVis && s.near === .1 && s.k < .05, 'back on the pavement with the walking camera, your chips in your hand', JSON.stringify({ st: s.st, carryVis: s.carryVis, k: s.k }));
  await frames(4); await shot(pre + 'chip-9-carry');
  rec(await visible('#crPost') && await W(w => w.lastMusic) > .5, 'the postcard button is back, the music as it was');

  /* ---- everything on the menu can be had (and Order another) ---- */
  const got = await W((w, C) => { const out = []; C.enter(); w.until(C => C.C.st === 'in', 30 * 5);
    for (let i = 0; i < 5; i++){ C.order(i); w.until(C => C.C.ph === 'season', 30 * 10); const heap = C.state.paper.heap; C.wrap(); w.until(C => C.C.ph === 'ready', 30 * 4); out.push({ i, heap, ready: C.C.ph === 'ready', parcel: C.state.paper.parcel }); if (i < 4) C.another(); }
    return out; });
  rec(got.every((q, i) => q.heap === i && q.ready && q.parcel), 'single, one and one, curry chips, battered sausage and spice bag, each laid out and wrapped', JSON.stringify(got));
  /* Escape mid-order: out, and no chips */
  if (!mobile) {
    await W((w, C) => { C.another(); C.order(0); w.run(30); }); await page.keyboard.press('Escape'); await W(w => w.run(2)); s = await state();
    rec(s.st === 'exit' && await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), 'Escape takes you out (and does not leave Earth)', s.st);
    await W(w => w.until(C => C.C.st === 'out', 30 * 5)); await page.keyboard.press('Escape'); await wait(400);
    rec(await H(h => h.S.stId === 'cr' && h.S.mode === 'station'), 'an Escape just after coming out does not send you up to orbit');
  } else { await W((w, C) => { C.another(); C.order(0); w.run(30); }); await press('#crChLeave'); await W(w => w.until(C => C.C.st === 'out', 30 * 5)); }
  s = await state(); rec(s.st === 'out' && s.carry === 1, 'leaving mid-order you have no new chips (only the ones you had)', JSON.stringify({ carry: s.carry }));

  /* ---- in again by E (on a phone its tag); Enzo glad to see you back ---- */
  await W(w => { w.put(.95, 2.25, .95, 0); w.run(30); }); await frames(4);
  if (mobile) { tg = await tagEl(); await page.touchscreen.tap(tg.xy[0], tg.xy[1]); } else await page.keyboard.press('KeyE');
  s = await state(); rec(s.st === 'enter', (mobile ? 'tapping its tag' : 'E by the door') + ' takes you in', s.st);
  await W(w => w.until(C => C.C.st === 'in', 30 * 5)); s = await state(); rec(s.say === CHL.again, 'Enzo is glad to see you back', s.say);
  await W(w => w.run(30)); await frames(4); { const q = await W((w, C) => C.screen('enzo')); await tap(q[0], q[1]); await W(w => w.run(5)); s = await state(); rec(CHL.more.includes(s.say), (mobile ? 'a tap' : 'a click') + ' on Enzo: he has a word', s.say); }
  await press('#crChLeave'); await W(w => w.until(C => C.C.st === 'out', 30 * 5)); await W(w => w.run(10));
  rec(!(await page.evaluate(() => document.querySelector('.st-cr').classList.contains('inchip'))), 'the button takes you out');

  /* ---- the paths round the shop are open: its door, the workshop and the fire station from the square and the pad ---- */
  const nav = await W((w, C, d) => { const out = {}, goals = { door: [...C.local(.95, 2.05), 1.2], workshop: [d.INST.be.x, d.INST.be.z, 2.5], fire: [...d.fire.local(-.3, 2.2), 1.2] };
    for (const [f, [fx, fz]] of Object.entries({ pad: [-3.2, -12], square: [0, 2.2], chip: C.local(.95, 2.1) })) for (const [g, [gx, gz, rr]] of Object.entries(goals)) { const q = d.navPath(fx, fz, gx, gz, rr); out[f + '>' + g] = q ? q.length : null; }
    return out; });
  const miss = Object.entries(nav).filter(([, v]) => v === null).map(([k]) => k);
  rec(miss.length === 0, 'there is a way to the chipper\'s door, the workshop and the fire station, from the pad, the square and the chipper', miss.length ? 'none for ' + miss.join(', ') : Object.keys(nav).length + ' ways');

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

/* The post office on Earth: going in, Bríd at her counter, and posting your postcard.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/postoffice.cjs --out <dir> [--mobile] [--query time=21:30] [--meter]
   From the street its sign and its pillar box are in view; walking up to the door its tag says Go in, and how. In by a
   click (a tap) on the shop from across the street, by E (on a phone, its tag), and you are at the counter in your own
   eyes: nothing of the street over the room, no postcard button, the music a little quieter, Bríd looking up to say hello.
   With no postcard she says to go and take one, and you can look round all the same. Out by the button, and by Escape
   (an Escape just after does not send you up to orbit). Then a postcard is taken (the real camera button, the real
   shutter) and posted in the pillar box outside: in it goes under the flap. Another is taken and handed over at the
   counter: she stamps it with a thunk, the postmark is on the card, into the sack it goes, and the card, postmarked,
   comes up to save or share. Going in and posting compile nothing new. With --meter it listens to each new sound against a
   footstep. The station's clock is stepped by hand where timing is not the point, as in earth.cjs. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  /* in the page: step the station, put the player somewhere, and keep a log of the post office's sounds */
  await H(h => {
    const st = h.ST.cr, d = st._dbg, p = d.po;
    window.__P = {
      snd: [], lastMusic: null, maxWave: 0, maxLook: 0,
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); this.maxWave = Math.max(this.maxWave, p.P.bk.wave); this.maxLook = Math.max(this.maxLook, p.P.bk.lk || 0); } },
      until(src, max) { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(p, d); i++) this.run(1); return { frames: i, done: !!f(p, d) }; },
      put(lx, lz, fx, fz) { const [x, z] = p.local(lx, lz), P = d.player, t = d.at(...p.local(fx, fz)); P.x = x; P.z = z; P.u.copy(d.at(x, z)); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; P.tgt = null; P.path = null; P.speed = 0; },
      count(n) { return this.snd.filter(s => s.n === n).length; },
    };
    for (const n of ['poBell', 'poThunk', 'poFlap', 'poShuffle', 'step']) { const f = h.A[n]; h.A[n] = function () { window.__P.snd.push({ n, t: h.S.t, a: [...arguments] }); return f.apply(this, arguments); }; }
    { const f = h.A.music; h.A.music = function (v) { window.__P.lastMusic = v; return f.apply(this, arguments); }; }
  });
  const W = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__P, h.ST.cr._dbg.po, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const state = () => W((w, p) => p.state);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const onScreen = q => q[2] < 1 && q[0] > 0 && q[0] < vp.width && q[1] > 0 && q[1] < vp.height;
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 90000 }); else await page.click(sel, { timeout: 90000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }, sel);
  const tagEl = cls => page.evaluate(cls => { const e = [...document.querySelectorAll('#crLabels .crwt')].find(e => e.classList.contains(cls || 'crwpo')), r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    return { txt: e.textContent, on: e.classList.contains('on'), can: e.classList.contains('can'), xy: [x, y], top: !!top && (top === e || e.contains(top)) }; }, cls);
  /* the red ink in the postmark's place on a card (where the post office's stamp puts it: by the stamp, below it) */
  const redInk = () => page.evaluate(() => { const i = document.querySelector('#crCardImg'), W = i.naturalWidth, H = i.naturalHeight; if (!W) return -1; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(i, 0, 0);
    const port = H > W, m = port ? 48 : 56, sw = port ? 190 : 210, sh = port ? 230 : 250, sx = W - m - 34 - sw, sy = m + 34, r = port ? 96 : 108, cx = sx + sw * .62, cy = sy + sh + r * .62;
    const d = g.getImageData(cx - r, cy - r, 2 * r, 2 * r).data; let n = 0; for (let k = 0; k < d.length; k += 4) if (d[k] > 120 && d[k] - d[k + 1] > 60 && d[k] - d[k + 2] > 60) n++; return n; });
  const progs = () => H(h => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r(h.renderer.info.programs.length) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const night = await H(h => { const d = h.ST.cr._dbg; d.skipCut(); return d.sky.state.night > .5; });
  const pre = (mobile ? 'm-' : '') + (night ? 'n-' : '');
  await H(h => { h.A.start && h.A.start(); });
  await W((w, p, d) => { d.began(); w.run(30); }); await wait(300);
  const BRL = await W((w, p) => p.BRL);
  /* taking a postcard, as a visitor does: the camera button, then Take it, and the card that comes out put away */
  const takeCard = async () => {
    await W((w, p, d) => { w.put(.2, 5.2, .2, 0); w.run(20); }); await frames(3);
    let ok = await press('#crPost'); if (!ok) return false; await wait(600); ok = await press('#crFrameTake'); if (!ok) return false;
    let card = false; for (let i = 0; i < 180 && !card; i++) { await wait(500); card = await page.evaluate(() => { const c = document.querySelector('#crCard'), i = document.querySelector('#crCardImg'); return !c.hidden && i.complete && i.naturalWidth > 0; }); }
    if (!card) return false; await press('#crCardClose'); await wait(300); return true; };

  /* ---- before: nothing inside drawn, no error ---- */
  let s = await state(); rec(s.st === 'out' && !s.vis && !(await W((w, p) => p.err)), 'before: you are in the street and nothing inside the post office is drawn', JSON.stringify({ st: s.st, vis: s.vis }));

  /* ---- from across the street: the sign and the pillar box are in view ---- */
  await W(w => { w.put(.2, 6.6, .2, 0); w.run(45); }); await frames(4);
  const sg = await W((w, p) => p.screen('sign')), bxy = await W((w, p) => p.screen('box'));
  rec(onScreen(sg) && onScreen(bxy), 'from the street the POST OFFICE sign and the pillar box are on the screen', JSON.stringify({ sign: sg.map(v => +v.toFixed(1)), box: bxy.map(v => +v.toFixed(1)) }));
  await shot(pre + 'po-1-street');
  const prog0 = await progs();

  /* ---- walking up to the door: its tag says Go in, and how ---- */
  await W(w => { w.put(.95, 2.45, .95, 0); w.run(30); }); await frames(4);
  let tg = await tagEl(); rec(tg.on && tg.can && tg.txt === 'Go in' && tg.top, 'by the door its tag says Go in, and how (E, or Tap)', JSON.stringify(tg));

  /* ---- in by a click (a tap) on the shop from across the street: you walk over and in ---- */
  await W(w => { w.put(.2, 6.6, .2, 0); w.run(30); w.maxWave = 0; w.maxLook = 0; w.snd = []; }); await frames(4);
  const dxy = await W((w, p) => p.screen('door'));
  await tap(dxy[0], dxy[1]); s = await state();
  rec(s.st === 'go' || s.st === 'enter', (mobile ? 'a tap' : 'a click') + ' on the shop from across the street sets you walking over and in', JSON.stringify({ st: s.st, xy: dxy.map(v => +v.toFixed(0)) }));
  let r = await W(w => w.until(p => p.P.st === 'in', 30 * 25)); s = await state();
  rec(r.done && s.st === 'in' && !s.me && s.near === .02 && s.vis, 'you walk over and in, and are at the counter in your own eyes, with a nearer lens', JSON.stringify({ r, st: s.st, me: s.me, near: s.near }));
  rec(await W(w => w.count('poBell')) === 2, 'the bell over the door rings as it opens, and again as it shuts', String(await W(w => w.count('poBell'))));
  const progIn = await progs(); rec(progIn === prog0, 'going in compiles no new shader (made ready with the rest of Earth)', prog0 + ' then ' + progIn);
  rec(s.talk === BRL.hi && await W(w => w.maxWave) > .5 && await W(w => w.maxLook) > .9, 'Bríd looks up from her ledger, waves, and says hello', JSON.stringify({ talk: s.talk, wave: await W(w => w.maxWave), look: await W(w => w.maxLook) }));
  const quiet = await page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
    return { labels: vis(document.querySelector('#crLabels')), card: vis(document.querySelector('#crProj')) && document.querySelector('#crProj').classList.contains('on'), go: vis(document.querySelector('#crGo')), post: vis(document.querySelector('#crPost')), leave: vis(document.querySelector('#crPoLeave')), inpo: document.querySelector('.st-cr').classList.contains('inpo') }; });
  rec(!quiet.labels && !quiet.card && !quiet.go && quiet.inpo, 'nothing of the street is drawn over the room: no tags, no landmark card', JSON.stringify(quiet));
  rec(quiet.leave && !quiet.post, 'there is a way out, and no postcard button inside', JSON.stringify(quiet));
  const mus = await W(w => w.lastMusic); rec(mus > .2 && mus < .4, 'the town\'s music is a little quieter in here', String(mus));
  await W(w => w.run(20)); await frames(3); await shot(pre + 'po-3-inside');
  /* no postcard on you: she says to go out and take one, and you can look round all the same */
  const lines = [s.talk]; for (let i = 0; i < 4 && (await state()).talk; i++) { await W(w => w.run(40)); await frames(2); if (mobile) await tap(vp.width / 2, vp.height * .35); else await page.keyboard.press('Enter'); await W(w => w.run(3)); s = await state(); if (s.talk) lines.push(s.talk); }
  rec(lines.includes(BRL.none) && lines.includes(BRL.look) && !(await state()).talk, 'with no postcard, she says to go out and take one, and to look round all the same', JSON.stringify(lines));
  rec(!(await visible('#crPoPost')), 'and there is nothing to post', '');
  const y0 = await W((w, p) => p.P.yaw);
  if (!mobile) { await page.keyboard.down('ArrowLeft'); await W(w => w.run(25)); await page.keyboard.up('ArrowLeft'); }
  else { const cdp = await page.context().newCDPSession(page), x0 = vp.width * .6, y = vp.height * .45; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] }); for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - i * 25, y, id: 1 }] }); await W(w => w.run(1)); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  const y1 = await W((w, p) => p.P.yaw); rec(Math.abs(y1 - y0) > .3 && (await state()).st === 'in', (mobile ? 'a drag' : 'the arrows') + ' look round, and you stay in', JSON.stringify({ y0: +y0.toFixed(2), y1: +y1.toFixed(2) }));
  /* (the rest of the room: --shots for pictures of it) */
  if (process.argv.includes('--shots')) for (const [n, yaw, pt] of [['board', 1.25, .05], ['shelves', -1.25, .02]]) { await W((w, p, d, h, a) => { p.P.yaw = a[0]; p.P.pitch = a[1]; p.P.dragT = 0; w.run(2); }, [yaw, pt]); await frames(3); await shot(pre + 'po-5-' + n); }

  /* ---- out by the button; the postcard button is back ---- */
  await press('#crPoLeave'); s = await state(); rec(s.st === 'exit', 'Leave the post office takes you out', s.st);
  r = await W(w => { const r = w.until(p => p.P.st === 'out', 30 * 5); w.run(20); return r; }); s = await state();
  rec(r.done && s.me && s.near === .1 && s.k < .05 && s.you[1] > 1.6, 'you are back on the pavement with the walking camera', JSON.stringify({ r, you: s.you, k: s.k }));
  await frames(4); rec(await visible('#crPost') && await W(w => w.lastMusic) > .5, 'and the postcard button is back, the music as it was');
  

  /* ---- in by E (on a phone its tag), out by Escape while she is talking; an Escape just after stays on Earth ---- */
  await W(w => { w.put(.95, 2.45, .95, 0); w.run(30); }); await frames(4);
  if (mobile) { tg = await tagEl(); await page.touchscreen.tap(tg.xy[0], tg.xy[1]); } else await page.keyboard.press('KeyE');
  s = await state(); rec(s.st === 'enter', (mobile ? 'tapping its tag' : 'E by the door') + ' takes you in', s.st);
  await W(w => w.until(p => p.P.st === 'in', 30 * 5)); await W(w => w.run(10));
  if (mobile) await press('#crPoLeave'); else await page.keyboard.press('Escape');
  await W(w => w.run(2)); s = await state(); rec(s.st === 'exit' && await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), (mobile ? 'the button' : 'Escape') + ' takes you out (and does not leave Earth)', s.st);
  await W(w => w.until(p => p.P.st === 'out', 30 * 5));
  await page.keyboard.press('Escape'); await wait(400);
  rec(await H(h => h.S.stId === 'cr' && h.S.mode === 'station'), 'an Escape just after coming out does not send you up to orbit');

  /* ---- a postcard, posted in the pillar box outside ---- */
  rec(await takeCard() && (await state()).has, 'a postcard is taken outside (the camera button, then Take it)');
  await W(w => { w.put(-1.75, 3.9, -1.75, 0); w.run(30); }); await frames(4);
  let bt = await tagEl('crwbox'); rec(bt.on && bt.txt === 'Post your card', 'with a postcard, the pillar box\'s tag says Post your card', JSON.stringify(bt));
  await W(w => { w.snd = []; });
  const bxy2 = await W((w, p) => p.screen('box')); await tap(bxy2[0], bxy2[1]);
  s = await state(); rec(s.bx === 'go' || s.bx === 'post', (mobile ? 'a tap' : 'a click') + ' on the box walks you over to post it', JSON.stringify({ bx: s.bx, db: s.db }));
  await W(w => w.until(p => p.P.bx.st === 'post', 30 * 8)); await W(w => w.run(14)); await frames(3);
  s = await state(); rec(s.bcard, 'the card goes in at the slot', JSON.stringify({ bx: s.bx, bcard: s.bcard }));
  await shot(pre + 'po-7-postbox');
  
  r = await W(w => w.until(p => p.P.bx.st === 'idle', 30 * 4)); s = await state(); const fl = s.flapMax;
  rec(r.done && s.boxed && !s.has && !s.bcard && await W(w => w.count('poFlap')) === 1 && fl > .2, 'in it goes under the flap, with its sound, and it is posted', JSON.stringify({ boxed: s.boxed, has: s.has, flap: fl, snd: await W(w => w.count('poFlap')) }));
  await frames(3); bt = await tagEl('crwbox'); rec(bt.txt === 'Posted', 'and the box\'s tag says Posted for a moment', JSON.stringify(bt));

  /* ---- another postcard, handed over at the counter: the thunk, the postmark, the sack, and the card to save or share ---- */
  rec(await takeCard() && (await state()).has, 'another postcard is taken');
  await W((w, p) => { w.put(.95, 2.45, .95, 0); w.run(10); p.go(); w.until(p => p.P.st === 'in', 30 * 6); w.run(30); });
  s = await state(); rec(s.st === 'in' && s.talk === BRL.card, 'she sees your postcard and asks for it', JSON.stringify({ st: s.st, talk: s.talk }));
  await W(w => w.run(60));   // (her line typed out)
  if (mobile) await tap(vp.width / 2, vp.height * .35); else await page.keyboard.press('Enter'); await W(w => w.run(4)); await frames(3);
  rec(await visible('#crPoPost'), 'there is a button to post it', '');
  const red0 = await redInk(), progPre = await progs();
  await W(w => { w.snd = []; });
  if (mobile) await press('#crPoPost'); else await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__heloria.ST.cr._dbg.po.P.ph === 'post', null, { timeout: 15000 }).catch(() => {});
  s = await state(); rec(s.ph === 'post' && s.cardVis, (mobile ? 'Post your postcard' : 'E') + ' hands it over: it is on the counter', JSON.stringify({ ph: s.ph, card: s.card }));
  await W((w, p) => { w.until(p => p.P.pt > 1.38, 30 * 3); p.P.hold = true; w.run(6); }); await frames(2);   // (the moment held still while its picture is taken)
  s = await state(); rec(s.stamped && s.thunks === 1 && await W(w => w.snd.some(x => x.n === 'poThunk' && x.a[0] === 1)), 'she inks the stamp and brings it down on your card with a thunk: the postmark is on it', JSON.stringify({ stamped: s.stamped, thunks: s.thunks }));
  const cs = await W((w, p) => p.screen('card')); rec(onScreen(cs), 'and you see it happen (your card on the screen)', JSON.stringify(cs.map(v => +v.toFixed(0))));
  await shot(pre + 'po-9-stamp'); await W((w, p) => { p.P.hold = false; });
  await W(w => w.until(p => p.P.pt > 3.25, 30 * 3)); 
  r = await W(w => w.until(p => p.P.ph !== 'post', 30 * 3)); s = await state();
  rec(s.posted === 1 && await W(w => w.count('poShuffle')) >= 2 && !s.cardVis, 'into the sack it goes, with a rustle of paper', JSON.stringify({ posted: s.posted, shuffle: await W(w => w.count('poShuffle')) }));
  rec(s.talk === BRL.posted, 'and she says it is posted', s.talk);
  let up = false; for (let i = 0; i < 40 && !up; i++) { await W(w => w.run(6)); await wait(200); up = await page.evaluate(() => { const c = document.querySelector('#crCard'), i = document.querySelector('#crCardImg'); return !c.hidden && i.complete && i.naturalWidth > 0; }); }
  const card = await page.evaluate(() => { const i = document.querySelector('#crCardImg'), a = document.querySelector('#crCardSave');
    
    return { w: i.naturalWidth, h: i.naturalHeight, href: a.href.slice(0, 5), dl: a.download, again: !!document.querySelector('#crCardAgain').offsetParent, save: !!a.offsetParent }; });
  rec(up && card.href === 'blob:' && /-posted\.jpg$/.test(card.dl) && card.save, 'your card, postmarked, comes up to save (or share)', JSON.stringify(card));
  const red1 = await redInk(); rec(red1 > red0 + 2000, 'the red postmark is on the card itself', 'red ink by the stamp: ' + red0 + ' before, ' + red1 + ' after');
  rec(!card.again, 'inside, the card offers no Take another', '');
  await wait(800); await shot(pre + 'po-11-card');
  await press('#crCardClose'); await W(w => w.run(4)); s = await state();
  rec(!s.has && !s.post && s.st === 'in', 'with it posted there is nothing more to post', JSON.stringify({ has: s.has, post: s.post }));
  const progPost = await progs(); rec(progPost === progPre, 'posting compiles nothing new either', progPre + ' then ' + progPost);
  /* asking her again (a click or a tap on her): go and take another */
  const kxy = await W((w, p) => { p.P.yaw = p.PW.yaw0; p.P.pitch = p.PW.p0; w.run(2); return p.screen('clerk'); }); await tap(kxy[0], kxy[1]); await W(w => w.run(30));
  s = await state(); rec([BRL.again, BRL.boxed].includes(s.talk), (mobile ? 'a tap' : 'a click') + ' on Bríd: she says to take another (or, the first time after, that she has the one you put in the box)', s.talk);
  if (!mobile) { await page.keyboard.press('Escape'); await W(w => w.run(2)); await wait(300); await W(w => w.run(2)); s = await state(); rec(s.st === 'exit', 'Escape while she is talking takes you out', s.st); }
  else { await tap(vp.width / 2, vp.height * .35); await W(w => w.run(2)); await press('#crPoLeave'); }
  await W(w => w.until(p => p.P.st === 'out', 30 * 5)); await W(w => w.run(20)); await frames(3);
  rec(await visible('#crPost') && !(await page.evaluate(() => document.querySelector('.st-cr').classList.contains('inpo'))), 'out again, the street is as it was', '');

  /* ---- with --meter: how loud each new sound is, against a footstep ---- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    const listen = async fn => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < 900) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(300); return +pk.toFixed(4); };
    await H(h => { h.A.music(0); }); await wait(1500);
    const lv = {};
    for (const [n, f] of [['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['step(0) again', h => h.A.step(0)], ['step(1) again', h => h.A.step(1)], ['bell(open)', h => h.A.poBell(true)], ['bell(shut)', h => h.A.poBell(false)], ['thunk', h => h.A.poThunk(1)], ['thunk(pad)', h => h.A.poThunk(.3)], ['flap', h => h.A.poFlap()], ['shuffle', h => h.A.poShuffle(1)]]) lv[n] = await listen(f);
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)'], lv['step(0) again'], lv['step(1) again']);   // (each step twice: a busy machine's meter can miss a peak)
    rec(step > 0 && ['bell(open)', 'bell(shut)', 'thunk', 'thunk(pad)', 'flap', 'shuffle'].every(n => lv[n] > 0 && lv[n] <= step * 1.6), 'each new sound is heard, and none is much louder than a footstep', JSON.stringify(lv));
  }

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

/* Inside the café: walking in, ordering each drink, the drone bringing it, looking into the cup, the link in the foam (its
   target is checked, never followed), back out of the cup, and leaving again.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/cafe.cjs [--mobile]
   The station's clock is stepped by hand between the real frames (headless frames are slow), and every button is a real
   click or tap; on a computer a drink is also ordered with the keys, and the way in is walking up to the door. */
module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '';
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  /* fn runs in the page with the café's own test hooks, Earth's, and the site's */
  const C = (fn, a) => H((h, [src, a]) => (0, eval)('(' + src + ')')(h.ST.cr._dbg.cafe, h.ST.cr._dbg, h, a), [fn.toString(), a]);
  const state = () => C(c => c.state), run = s => C((c, d, h, s) => c.run(s), s);
  const until = async (fn, max = 14, step = .25) => { for (let t = 0; t < max; t += step) { const s = await state(); if (fn(s)) return s; await run(step); } return state(); };
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 30000 }); else await page.click(sel, { timeout: 30000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const tapAt = ([x, y]) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const frames = n => H((h, n) => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const visibleSoon = (sel, ms = 15000) => page.waitForFunction(sel => { const e = document.querySelector(sel); if (!e) return false; let p = e; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .9) return false; p = p.parentElement; } return true; }, sel, { timeout: ms }).then(() => true).catch(() => false);   // (once it has faded in)
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; let p = e; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; p = p.parentElement; } return true; }, sel);

  await H(h => h.ST.cr._dbg.skipCut()); await run(.5);
  /* in the street, a few steps from the café's door, facing it */
  await C((c, d) => { d.began(); const [x, z] = c.local(0, 3.6), Pl = d.player; Pl.x = x; Pl.z = z; Pl.u.copy(d.at(x, z)); const t = d.at(...c.local(0, 0)); Pl.f.copy(t).addScaledVector(Pl.u, -Pl.u.dot(t)).normalize(); d.cam.f.copy(Pl.f); d.closeTalk(); });
  await run(1.2); await frames(3);
  let s = await state();
  rec(s.button && await visible('#crCafeIn'), 'by the café there is a button to go in', JSON.stringify({ st: s.st, you: s.you }));
  rec(await page.evaluate(() => !document.querySelector('#crProj').classList.contains('on')), 'and nothing else is put up outside it: you go in to book');
  await shot(P + 'cafe-street');

  /* on a computer, a click on the café from across the street walks you over (Escape stops that) */
  if (!mobile) {
    await C((c, d) => { const [x, z] = c.local(-1.5, 7.5), Pl = d.player; Pl.x = x; Pl.z = z; Pl.u.copy(d.at(x, z)); const t = d.at(...c.local(0, 0)); Pl.f.copy(t).addScaledVector(Pl.u, -Pl.u.dot(t)).normalize(); d.cam.f.copy(Pl.f); });
    await run(1.5); await frames(3);
    const xy = await C(c => c.screen('door')); await page.mouse.click(xy[0], xy[1] - 60);
    s = await state(); rec(s.st === 'go', 'clicking the café from across the street walks you over to it', JSON.stringify({ st: s.st, xy }));
    if (s.st === 'go') { await run(1); await page.keyboard.press('Escape'); s = await state(); rec(s.st === 'out' && await H(h => h.S.stId === 'cr' && h.S.mode === 'station'), 'and Escape stops you on the way (and does not leave Earth)', s.st); }
    await C((c, d) => { const [x, z] = c.local(0, 3.6), Pl = d.player; Pl.x = x; Pl.z = z; Pl.u.copy(d.at(x, z)); Pl.path = null; Pl.tgt = null; const t = d.at(...c.local(0, 0)); Pl.f.copy(t).addScaledVector(Pl.u, -Pl.u.dot(t)).normalize(); d.cam.f.copy(Pl.f); });
    await run(1);
  }
  /* going in: on a computer by walking up to the door; on a phone with the button */
  if (!mobile) { await page.keyboard.down('KeyW'); s = await until(s => s.st !== 'out', 6, .1); await page.keyboard.up('KeyW'); rec(s.st === 'enter', 'walking up to the door takes you in', JSON.stringify({ st: s.st, you: s.you })); }
  else { await press('#crCafeIn'); s = await until(s => s.st === 'enter', 6, .1); rec(s.st === 'enter', 'Go in for a coffee takes you in', s.st); }
  s = await until(s => s.door > .9, 2, .05); await run(.25); await frames(3);
  rec(s.door > .9, 'the door swings open', 'door ' + s.door);
  await shot(P + 'cafe-door');
  s = await until(s => s.st === 'in', 5);
  rec(s.st === 'in' && !s.me, 'you are inside, at the counter (your own eyes, so your figure is not drawn)', JSON.stringify({ st: s.st, me: s.me }));
  await run(1); await frames(4);
  s = await state(); rec(s.door < .05, 'the door has shut behind you', 'door ' + s.door);
  const names = await page.evaluate(() => [...document.querySelectorAll('#crMenu .crdrink-n')].map(e => e.textContent));
  rec(await visible('#crMenu') && names.join('|') === "Founders' Flat White|Kríos Cortado|New Hire Americano", 'the menu is on the screen as well as on the board', names.join(' | '));
  rec(await visible('#crLeave'), 'there is a way out');
  rec(await page.evaluate(() => getComputedStyle(document.querySelector('#crLabels')).opacity === '0'), 'the name tags from the street are not drawn over the room');
  const mus = await H(h => h.A._lv().mus); log('music level inside', mus);
  /* the barista: a person behind the counter, who says hello and wipes the counter while you choose; not one of the three of us */
  s = await state(); const bar = await C((c, d) => ({ people: d.people.length, tags: [...document.querySelectorAll('#crLabels .crl')].filter(e => !['Sit', 'Kite', 'Diarmuid', 'Gideon', 'Owen'].includes(e.textContent)).length, fig: !!c.C.bar.fig && c.C.bar.fig.parent === c.C.g, inPeople: d.people.some(p => p.g === c.C.bar.fig), home: c.BP.home }));
  rec(bar.fig && !bar.inPeople && bar.people === 3 && bar.tags === 3, 'the barista is there, and is not one of the three of us (no name tag, no conversation)', JSON.stringify(bar));
  rec(/^Hello/.test(s.say) && s.bar[2] === 'wipe' && Math.abs(s.bar[0] - bar.home[0]) < .05, 'they say hello and wipe the counter while you choose', JSON.stringify({ say: s.say, bar: s.bar }));
  await shot(P + 'cafe-inside');

  const EXPECT = [
    { href: /^mailto:contact@helorialabs\.com\?subject=Booking%20a%20coffee%20chat/, target: '_self', go: 'Book the chat' },
    { href: /^https:\/\/krios\.ie\/?$/, target: '_blank', rel: 'noopener', go: 'See Kríos' },
    { href: /^mailto:contact@helorialabs\.com\?subject=Joining%20Heloria%20Labs/, target: '_self', go: 'Write to us' }];
  for (let i = 0; i < 3; i++) {
    /* order: the menu's button, the drink on the chalkboard itself, or (on a computer) the keys */
    if (i === 2) { await press('#crMore'); rec(await visibleSoon('#crMenu .crdrink:nth-of-type(3)'), 'Another drink opens the menu again'); }
    if (i === 1) { await C(c => { c.C.yaw = 0; c.C.pitch = c.C.p0; c.C.lean = 0; c.C.dragT = 0; }); await run(.6); await frames(3); const xy = await C(c => c.screen(1)); await tapAt(xy); }
    else if (i === 2 && !mobile) { await page.keyboard.press('Tab'); await page.focus('#crMenu .crdrink:nth-of-type(3)'); await page.keyboard.press('Enter'); }
    else await press('#crMenu .crdrink:nth-of-type(' + (i + 1) + ')');
    s = await state(); rec(s.ph === 'brew' && s.dr === i, 'ordering ' + ['the flat white from the menu', 'the cortado on the board', mobile ? 'the americano from the menu' : 'the americano with the keys'][i], JSON.stringify({ ph: s.ph, dr: s.dr }));
    await run(.2); s = await state(); rec(/^One .*coming up/.test(s.say), 'the barista says it back', s.say);
    if (i === 0) { s = await until(s => s.cup === 'brew' && s.fill > .3, 8, .1); await frames(3); rec(s.cup === 'brew' && s.bar[0] < -.4 && Math.abs(s.bar[4]) > 2.5, 'the barista takes a cup to the machine and pulls the shot', JSON.stringify({ cup: s.cup, fill: s.fill, bar: s.bar })); await shot(P + 'cafe-barista-at-the-machine'); }
    s = await until(s => s.ph === 'served', 14);
    rec(s.ph === 'served' && s.cup === 'serve' && s.fill > .99 && s.art > .99 && /^Your /.test(s.say), 'the barista sets it down in front of you on its saucer, with its sign in the foam', JSON.stringify({ ph: s.ph, cup: s.cup, fill: s.fill, art: s.art, say: s.say }));
    await run(1.2); await frames(4); rec(await visible('#crLook'), 'and it says you can look into the cup');
    if (i === 0) await shot(P + 'cafe-cup');
    /* look into the cup: the button, a tap on the cup itself, or Enter */
    if (i === 1) { const xy = await C(c => c.screen('cup')); await tapAt(xy); }
    else if (i === 2 && !mobile) await page.keyboard.press('Enter');
    else await press('#crLook');
    s = await state(); rec(s.ph === 'dive', 'looking into the cup', s.ph);
    if (i === 0) { await run(1.1); await frames(3); await shot(P + 'cafe-into-the-cup'); }
    s = await until(s => s.card, 4, .1); await frames(5);
    const a = await page.evaluate(() => { const a = document.querySelector('#crCupGo'); return { href: a.getAttribute('href'), target: a.target, rel: a.rel, text: a.textContent.trim(), name: document.querySelector('#crCupK').textContent, focus: document.activeElement === a }; });
    const E = EXPECT[i];
    rec(s.card && await visible('#crCupGo'), 'in the foam: the card, with a real link', JSON.stringify({ ph: s.ph, near: s.near }));
    rec(E.href.test(a.href) && a.target === E.target && (!E.rel || a.rel === E.rel) && a.text === E.go, 'the ' + a.name + ' link goes where it should (' + E.go + ')', JSON.stringify(a).slice(0, 160));
    if (i === 2 && !mobile) rec(a.focus, 'with the keys, the link has the focus');
    await shot(P + 'cafe-card-' + i);
    /* back out of the cup: the button, or Escape */
    if (i === 1 && !mobile) await page.keyboard.press('Escape'); else await press('#crCupBack');
    s = await until(s => s.ph === 'served', 3, .1);
    rec(s.ph === 'served' && s.st === 'in' && !s.card && s.near < .05, 'back out of the cup, still in the café', JSON.stringify({ st: s.st, ph: s.ph, card: s.card }));
  }

  /* the café at night: warm, the street dark through the windows */
  await H(h => { h.ST.cr._dbg.sky.set({ time: '21:30' }); h.ST.cr._dbg.sky.step(1); });
  await C(c => { c.C.lean = 0; c.C.yaw = .35; c.C.pitch = .02; c.C.dragT = 0; }); await frames(4); await shot(P + 'cafe-night');
  await C(c => { c.C.yaw = 2.05; c.C.pitch = -.08; c.C.dragT = 0; }); await frames(4); await shot(P + 'cafe-night-windows');
  await H(h => { h.ST.cr._dbg.sky.set({ time: '15:00' }); h.ST.cr._dbg.sky.step(1); });

  /* leaving: Escape on a computer, the button on a phone */
  if (mobile) await press('#crLeave'); else await page.keyboard.press('Escape');
  s = await state(); rec(s.st === 'exit', 'leaving', s.st);
  await run(1.3); await frames(3); await shot(P + 'cafe-leaving');
  s = await until(s => s.st === 'out' && s.k < .01, 5);
  if (!mobile) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); rec(await H(h => h.S.stId === 'cr' && h.S.mode === 'station'), 'Escape again just after coming out does not send you up to orbit'); }
  const you = await C((c, d) => ({ you: c.state.you, near: d.player.x }));
  rec(s.st === 'out' && s.me && you.you[1] > 2.6, 'you are back out on the pavement, facing the street', JSON.stringify({ st: s.st, k: s.k, me: s.me, you: you.you }));
  rec(s.near === .1, 'the camera is the walking one again', 'near ' + s.near);
  await run(1); await frames(4); await shot(P + 'cafe-back-outside');
  /* and you can walk off */
  const moved = await C((c, d, h) => { const x0 = d.player.x, z0 = d.player.z; d.player.tgt = d.at(...c.local(4, 6)).multiplyScalar(24); c.run(1.5); return Math.hypot(d.player.x - x0, d.player.z - z0); });
  rec(moved > .8, 'and walk off again', moved.toFixed(2) + ' m');
  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

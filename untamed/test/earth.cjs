/* Earth, on its own: conversations that always start, never get lost and carry on where they left off; walking over to
   someone round whatever is in the way; nobody walking through anything.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/earth.cjs --out <dir> [--mobile]
   The station's clock is stepped by hand: headless frames are slow, and these are checks of logic, not of timing. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  /* in the page: step the station, put the player somewhere facing something, count anyone standing inside anything */
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__E = {
      run(n, watch) { let bad = 0; const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o));
        for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t);
          if (watch) for (const w of watch) { const q = w === 'me' ? d.player : d.people[w]; if (fixed.some(o => Math.hypot(q.x - o.x, q.z - o.z) < o.r + .12)) bad++; } }
        return bad; },
      until(src, max, watch) { const f = (0, eval)('(' + src + ')'); let i = 0, bad = 0; for (; i < max && !f(d); i++) bad += this.run(1, watch); return { frames: i, bad }; },
      put(x, z, fx, fz) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); P.tgt = null; P.path = null; P.speed = 0; },
      talk() { const T = d.talk(); return T.p ? { who: T.p.first, i: T.i, ask: T.ask } : null; },
    };
  });
  const E = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__E, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  await H(h => h.ST.cr._dbg.skipCut()); await E(e => e.run(30)); await wait(600);

  /* the way round: the grid is there, and the town is mostly walkable */
  const nav = await E((e, d) => { let n = 0; for (const v of d.NAV.free) n += v; return { N: d.NAV.N, free: n }; });
  rec(nav.free > 2000, 'the town has a walking grid with room to move', JSON.stringify(nav));
  const solid = await E((e, d) => ({ fence: d.OBS.some(o => Math.hypot(o.x + 15.4, o.z + 3.2) < .9 && o.r < .2), post: d.OBS.filter(o => o.r === .15).length, rock: d.OBS.length }));
  rec(solid.fence && solid.post >= 9, 'fences and signposts are solid now', JSON.stringify(solid));

  /* walking up while still holding the key: it starts, and holding on does not end it */
  const m = await E((e, d) => { const p = d.people[1]; d.MET.clear(); p.greeted = false; p.resume = 0; e.put(p.x - 5.2, p.z - .2, p.x, p.z); return [p.x, p.z]; });
  await page.keyboard.down('KeyW');
  const up = await E(e => e.until(d => !!d.talk().p, 240, ['me']));
  const t1 = await E(e => e.talk());
  rec(t1 && t1.who === 'Michael', 'walking up to Michael with the key still held starts the conversation', JSON.stringify({ ...up, t1 }));
  await E(e => e.run(70));
  rec(!!(await E(e => e.talk())), 'holding the key on does not end it');
  await page.keyboard.up('KeyW');
  await E((e, d) => { d.nextTalk(); d.nextTalk(); });   // finish the first line, then on to the second
  const mid = await E(e => e.talk());
  /* letting go and setting off again walks you out of it, and it keeps its place */
  await page.keyboard.down('KeyS'); await E(e => e.run(30)); await page.keyboard.up('KeyS');
  const gone = await E((e, d) => ({ talk: e.talk(), resume: d.people[1].resume }));
  rec(!gone.talk && gone.resume === mid.i, 'setting off again closes it and remembers the line', JSON.stringify({ mid, gone }));
  /* back out a little and walk up again: it carries on from that line */
  await E((e, d) => { const p = d.people[1]; e.put(p.x - 4, p.z, p.x, p.z); e.run(4); });
  await page.keyboard.down('KeyW'); const back = await E(e => e.until(d => !!d.talk().p, 240, ['me'])); await page.keyboard.up('KeyW');
  const t2 = await E(e => e.talk());
  rec(t2 && t2.who === 'Michael' && t2.i === mid.i, 'walking back up carries on where it left off', JSON.stringify({ t2, mid, frames: back.frames }));
  /* a click anywhere goes on; Escape closes */
  const i0 = (await E(e => e.talk())).i;
  await E((e, d) => { const T = d.talk(); T.shown = T.txt.length; });
  await page.mouse.click(vp.width * .5, vp.height * .3);
  const i1 = await E(e => { e.run(2); return e.talk(); });
  rec(i1 && i1.i === i0 + 1, 'a click anywhere goes on to the next line', JSON.stringify({ i0, i1 }));
  await page.keyboard.press('Escape'); rec(!(await E(e => e.talk())), 'Escape closes the conversation');

  /* clicking someone across town: you walk round whatever is in the way and they talk when you get there */
  await E((e, d) => { d.people.forEach(p => { p.greeted = false; }); e.put(-3.2, -12.0, 0, 0); e.run(4); });
  const plan = await E((e, d) => { const P = d.player, p = d.people[1], path = d.navPath(P.x, P.z, p.x, p.z, 1.8); return path ? path.length : -1; });
  rec(plan > 1, 'there is a way from the pad to Michael across town', 'corners ' + plan);
  await E((e, d) => d.goTalk(d.people[1]));
  const walk = await E(e => e.until(d => !!d.talk().p, 30 * 40, ['me']));
  const t3 = await E(e => e.talk());
  rec(t3 && t3.who === 'Michael', 'clicking Michael from the pad walks you all the way over and he talks (nobody stops you on the way)', JSON.stringify({ ...walk, t3 }));
  rec(walk.bad === 0, 'on the way you never walk through anything', 'frames inside something: ' + walk.bad);
  await E((e, d) => d.closeTalk());

  /* clicking near someone, not quite on them, still picks them; and a click with a small wobble is still a click */
  await E((e, d) => { const p = d.people[2]; e.put(p.x + 4.5, p.z + 2.5, p.x, p.z); d.cam.f.copy(d.player.f); d.cam.tk = 0; e.run(60); });
  /* let a real frame or two place the camera before reading where he is on the screen */
  await H(h => new Promise(r => { let n = 0; const f = () => (++n > 3 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const scr = await E((e, d, h) => { h.stCam.updateMatrixWorld(); const p = d.people[2], v = p.dir.clone().multiplyScalar(24.8).project(h.stCam); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight, v.z]; });
  const near = await E((e, d, h, a) => { const p = d.pickPerson({ clientX: a[0] + 18, clientY: a[1] + 6 }); return p ? p.first : null; }, scr);
  rec(near === 'Abraham', 'a click just beside Abraham picks him', JSON.stringify({ scr, near }));
  if (!mobile) {
    await page.mouse.move(scr[0], scr[1]); await page.mouse.down(); await page.mouse.move(scr[0] + 9, scr[1] + 4, { steps: 3 }); await page.mouse.up();
    const go = await E((e, d) => ({ goal: d.talk().goal ? d.talk().goal.first : null, talk: e.talk() }));
    rec(go.goal === 'Abraham' || (go.talk && go.talk.who === 'Abraham'), 'a click on him with a little wobble still counts', JSON.stringify(go));
  } else {
    await page.touchscreen.tap(scr[0] + 6, scr[1]);
    const go = await E((e, d) => ({ goal: d.talk().goal ? d.talk().goal.first : null, talk: e.talk() }));
    rec(go.goal === 'Abraham' || (go.talk && go.talk.who === 'Abraham'), 'a tap beside him counts', JSON.stringify(go));
  }
  await E(e => e.until(d => !!d.talk().p, 30 * 20, ['me'])); await E((e, d) => d.closeTalk());

  /* E next to someone starts it, a little further than walking right up does */
  await E((e, d) => { const p = d.people[2]; p.greeted = true; e.put(p.x + 2.9, p.z, p.x, p.z); e.run(3); p.greeted = false; });
  await page.keyboard.press('KeyE'); const te = await E(e => e.talk());
  rec(te && te.who === 'Abraham', 'E next to Abraham starts the conversation', JSON.stringify(te));
  const tag = await page.evaluate(() => { const l = document.querySelectorAll('#crLabels .crl')[2]; return l.classList.contains('can') || true; });
  await E((e, d) => d.closeTalk());

  /* the name tag says you can talk when you are right by someone */
  await E((e, d) => { const p = d.people[2]; e.put(p.x + 3, p.z, p.x, p.z); e.run(4); });
  const can = await page.evaluate(() => document.querySelectorAll('#crLabels .crl')[2].classList.contains('can'));
  rec(can, 'right by Abraham, his tag says how to talk');
  await wait(500); await shot(pre + 'earth-can-talk');

  /* Ahroon walks round things to you, once you have met all three and said not yet */
  const ah = await E((e, d) => { [1, 2, 0].forEach(i => { d.openTalk(d.people[i], d.people[i].lines.length - 1); d.closeTalk(true); });
    const p = d.people[1]; e.put(p.x - 2, p.z - 2, p.x, p.z); d.GLN.t = -1; d.AH.st = 'come'; d.AH.asked = true; d.AH.heard = true; d.AH.path = null; d.AH.rp = 0;
    const r = e.until(d => d.AH.st !== 'come', 30 * 45, [0]); return { ...r, st: d.AH.st, talk: e.talk() }; });
  rec(ah.st === 'here' && ah.bad === 0, 'Ahroon walks round things all the way over to you', JSON.stringify(ah));
  rec(!ah.talk, 'and waits without asking again');
  await wait(600); await shot(pre + 'earth-ahroon-arrived');

  /* Land: straight down to Earth. Every landmark stands, we talk about them as they are, and each says what it is close to */
  const land = await E((e, d, h) => { const st = h.ST.cr; st.land = true; d.MET.clear(); d.marksEnter();
    return { marks: Object.values(d.MK).every(m => m.st === 'on'), first: d.people[0].lines[0], noPlay: d.people.every(p => p.lines.every(l => !/play|played|flew|up there|through the hole/i.test(l))) }; });
  rec(land.marks, 'in Land every landmark is already built');
  rec(land.noPlay && /Welcome to Earth/.test(land.first), 'in Land we talk about the landmarks as they are, not about playing them', land.first);
  const cards = await E((e, d) => { const out = {}; for (const id of ['kr', 'ae', 'ph', 'og', 'be']) { const q = d.INST[id]; e.put(q.x + q.r * .55, q.z + q.r * .5, q.x, q.z); e.run(3); const c = document.querySelector('#crProj');
      out[id] = c.classList.contains('on') && c.target && c.href && c.querySelector('.crpj-n').textContent; } return out; });
  rec(Object.values(cards).every(Boolean), 'walking up to each landmark shows what it is, with its link', JSON.stringify(cards));
  const tgt = await page.evaluate(() => { const c = document.querySelector('#crProj'); return c.target; });
  await E((e, d, h) => { h.ST.cr.land = false; d.marksEnter(); });

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

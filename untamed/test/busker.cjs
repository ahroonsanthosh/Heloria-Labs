/* Diarmuid, playing outside the café on Earth: he is there and playing; as you come near his guitar rises and the town's
   music dips, and it comes back as you walk away; tapping him (or E beside him, or his name tag from across town) gets
   you his solo and then he goes back to his piece; he never starts a conversation or counts as one of the three; you
   cannot walk through him, his amp or his case; inside a house you do not hear him; at night his lights are on.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/busker.cjs --out <dir> [--mobile] [--meter]
   With --meter it also says how loud the page is at each distance (the live sound plus the recordings playing).
   The station's clock is stepped by hand where only the logic matters; the sound is listened to in real time. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__B = {
      run(n, watch) { let bad = 0, near = 99; const fixed = d.OBS.filter(o => !d.people.some(p => p.ob === o)), B = d.busk.DM;
        for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); const q = d.player;
          near = Math.min(near, ...B.obs.map(o => Math.hypot(q.x - o.x, q.z - o.z) - o.r));
          if (watch && fixed.some(o => Math.hypot(q.x - o.x, q.z - o.z) < o.r + .12)) bad++; }
        return { bad, near: +near.toFixed(3) }; },
      /* the player at (fwd, left) metres in his frame, facing him */
      put(f, l) { const B = d.busk.DM, fx = B.face[0] - B.x, fz = B.face[1] - B.z, k = Math.hypot(fx, fz), ux = fx / k, uz = fz / k, x = B.x + ux * f + uz * l, z = B.z + uz * f - ux * l, P = d.player;
        P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(B.x, B.z); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.tk = 0; P.tgt = null; P.path = null; P.speed = 0; return [x, z]; },
      loops() { const o = {}; for (const l of h.A._loops()) if (['music', 'busk', 'busk-solo'].includes(l.name)) o[l.name] = l; return o; },
      talk() { const T = d.talk(); return T.p ? T.p.first : null; },
    };
  });
  const B = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__B, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = n => H((h, n) => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const meter = () => page.evaluate(() => { const A = window.__heloria.A, lr = A._loopRms(), m = window.__meter ? window.__meter() : { db: -200 }; const r = Math.sqrt(Math.pow(10, m.db / 10) + lr * lr); return r > 0 ? +(20 * Math.log10(r)).toFixed(1) : -200; });
  await H(h => h.ST.cr._dbg.skipCut()); await B(e => e.run(30));

  /* he is there, solid, with his name tag, and his recordings are made */
  const there = await B((e, d) => { const b = d.busk; if (!b) return null; const D = b.DM;
    return { spot: b.spot, obs: D.obs.map(o => [+o.x.toFixed(2), +o.z.toFixed(2), o.r]), inOBS: D.obs.every(o => d.OBS.includes(o)), tag: D.lb && D.lb.textContent, onGrid: D.obs.every(o => { const i = Math.round((o.x - d.NAV.O) / d.NAV.S), j = Math.round((o.z - d.NAV.O) / d.NAV.S); return d.NAV.free[j * d.NAV.N + i] === 0; }) }; });
  rec(!!there && there.inOBS && there.tag === 'Diarmuid', 'Diarmuid is outside the café, solid, with his name tag', JSON.stringify(there));
  rec(!!there && there.onGrid, 'his spot is marked on the walking grid, so ways round go round him');
  const door = await B((e, d) => { const D = d.busk.DM; return D.obs.map(o => +(Math.hypot(o.x - 3, o.z + 11.62) - o.r).toFixed(2)); });   // the door: (3, -11.62)
  rec(door.every(v => v > 1.0), 'he keeps clear of the café door', 'gaps to the door ' + door.join(', '));
  let ready = false; for (let i = 0; i < 150 && !ready; i++) { ready = await B(e => { const L = e.loops(); return !!(L.busk && L.busk.ready && L['busk-solo'] && L['busk-solo'].ready && L.music && L.music.ready); }); if (!ready) await wait(1000); }
  rec(ready, 'his piece and his solo are recorded (with the town music)', JSON.stringify(await B(e => e.loops())));

  /* walking toward him from the north (clear of Abraham): his guitar rises and the town's music dips; walking away it comes back */
  const rows = [];
  for (const dist of [14, 9, 6, 4, 2.2, 6, 14]) {
    await B((e, d, h, dist) => { e.put(dist * .866, dist * .5); }, dist); await frames(3); await wait(3200);
    const L = await B(e => e.loops()), db = await meter();
    rows.push({ dist, busk: L.busk.vol, busking: L.busk.playing, music: L.music.vol, db, buskDb: L.busk.vol > 0 ? +(20 * Math.log10(L.busk.rms * L.busk.vol)).toFixed(1) : -200, musicDb: L.music.vol > 0 ? +(20 * Math.log10(L.music.rms * L.music.vol)).toFixed(1) : -200 });
    log(('  ' + dist + ' m').padEnd(9), 'his guitar', String(L.busk.vol).padEnd(7), 'town music', String(L.music.vol).padEnd(7), 'page', db, 'dB (him', rows[rows.length - 1].buskDb, 'dB, music', rows[rows.length - 1].musicDb, 'dB)');
  }
  const [r14, r9, r6, r4, r2, b6, b14] = rows;
  rec(r14.busk < .02 && r14.music > .9, 'far off he is not heard and the town music plays', JSON.stringify(r14));
  rec(r9.busk <= r6.busk && r6.busk < r4.busk && r4.busk < r2.busk && r2.busk > .8 && r2.busking, 'walking up, his guitar rises to full', rows.slice(0, 5).map(r => r.busk).join(' < '));
  rec(r2.music < .2 && r6.music > r2.music && r14.music > r6.music, 'and the town music dips under him', rows.slice(0, 5).map(r => r.music).join(' > '));
  rec(b6.busk < r2.busk && b14.busk < .02 && b14.music > .9, 'walking away, he fades and the town music comes back', JSON.stringify([b6, b14]));
  rec(Math.abs(r2.buskDb - r14.musicDb) < 6, 'beside him he is about as loud as the town music is elsewhere', r2.buskDb + ' dB against ' + r14.musicDb + ' dB');

  /* his hands keep moving with the music */
  await B(e => { e.put(2.2, -.6); }); await frames(2);
  /* (his clock is stepped between looks: under load a headless frame can take longer than the gap between them) */
  const hands = []; for (let i = 0; i < 4; i++) { hands.push(await B((e, d) => { e.run(4); const D = d.busk.DM; return [D.rh.x, D.rh.y, D.rh.z, D.lh.x, D.lh.y].map(v => +v.toFixed(4)); })); }
  const moved = hands.slice(1).some((h, i) => Math.hypot(h[0] - hands[0][0], h[1] - hands[0][1], h[2] - hands[0][2]) > .003);
  rec(moved, 'he is strumming: his right hand moves between frames', JSON.stringify(hands));

  /* walking right up to him never starts a conversation */
  const met0 = await B((e, d) => d.MET.size);
  await B(e => { e.put(1.1, .2); }); const up = await B((e, d) => { e.run(45); return { talk: e.talk(), met: d.MET.size }; });
  rec(!up.talk && up.met === met0, 'standing right by him, nobody starts talking', JSON.stringify(up));

  /* you cannot walk through him, his amp or his case: walk straight at him and through where he stands */
  for (const [f, l, name] of [[2.6, 0, 'from in front'], [1.6, -1.8, 'from his right, past the amp'], [1.9, 1.4, 'from his left, past the case']]) {
    await B((e, d, h, a) => { e.put(a[0], a[1]); }, [f, l]);
    await page.keyboard.down('KeyW'); const w = await B(e => e.run(100, ['me'])); await page.keyboard.up('KeyW');
    rec(w.near > .2, 'you cannot walk through him ' + name, 'closest to an edge of his spot ' + w.near + ' m');
  }
  const path = await B((e, d) => { const D = d.busk.DM, fx = D.face[0] - D.x, fz = D.face[1] - D.z, k = Math.hypot(fx, fz), lx = fz / k, lz = -fx / k;
    const p = d.navPath(D.x - lx * 2.4, D.z - lz * 2.4, D.x + lx * 2.4, D.z + lz * 2.4, 1.2); if (!p) return null; let pts = [[D.x - lx * 2.4, D.z - lz * 2.4], ...p], m = 99;
    for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s <= 20; s++) { const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * s / 20, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * s / 20; for (const o of D.obs) m = Math.min(m, Math.hypot(x - o.x, z - o.z) - o.r); }
    return +m.toFixed(2); });
  rec(path !== null && path > .25, 'a way past him goes round him', 'closest ' + path + ' m');

  /* inside a house he is next to silent */
  const inside = await B((e, d) => ({ cafe: +d.busk.level(3, -13.4).toFixed(3), door: +d.busk.level(3, -11.3).toFixed(3) }));
  rec(inside.cafe < .05 && inside.door > .3, 'inside the café you barely hear him; at its door you do', JSON.stringify(inside));

  /* tap him: he stops and talks, in the same box as the three of us (no photo, nobody counted as met); heard out, he plays
     you his song; then back to his piece */
  await B(e => { e.put(2.1, -1.1); e.run(20); }); await frames(4); await wait(400);
  const scr = await B((e, d, h) => { h.stCam.updateMatrixWorld(); const D = d.busk.DM, v = D.dir.clone().multiplyScalar(24 + .1 + 1.0).project(h.stCam); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight, v.z]; });
  if (mobile) await page.touchscreen.tap(scr[0], scr[1]); else await page.mouse.click(scr[0], scr[1]);
  const s1 = await B((e, d) => ({ ...d.busk.state, talk: e.talk(), met: d.MET.size, box: document.querySelector('#crTalk').classList.contains('on'), last: document.querySelector('#crTalk').classList.contains('last') }));
  rec(s1.st === 'talk' && s1.talk === 'Diarmuid' && s1.box && s1.met === met0, (mobile ? 'a tap' : 'a click') + ' on him: he stops and talks, in the same box as the three of us', JSON.stringify({ scr: scr.map(v => +v.toFixed(1)), s1 }));
  const quiet0 = await B(e => e.loops().busk.vol); await B(e => e.run(20)); const quiet1 = await B(e => e.loops().busk);
  /* through the conversation, as a visitor goes through it (a key or a tap each time) */
  const said = []; for (let i = 0; i < 16; i++) { const q = await B((e, d) => ({ talk: e.talk(), t: document.querySelector('#crTkS').textContent + document.querySelector('#crTkR').textContent, last: document.querySelector('#crTalk').classList.contains('last'), met: d.MET.size }));
    if (!q.talk) break; if (!said.length || said[said.length - 1].t !== q.t) said.push(q);
    if (mobile) await page.touchscreen.tap(vp.width * .5, vp.height * .35); else await page.keyboard.press('Enter'); await B(e => e.run(2)); }
  const lines = said.map(q => q.t);
  rec(lines.some(t => /English teacher/.test(t)) && lines.some(t => /chase my dream and play music/.test(t)), 'he says he used to be an English teacher, and that he left to chase his dream and play music', JSON.stringify(lines));
  rec(said.every(q => !q.last && q.met === met0), 'no photo or page in his box, and he is not counted as one of the three', JSON.stringify(said.map(q => [q.last, q.met])));
  const s1b = await B((e, d) => ({ st: d.busk.state.st, talk: e.talk() }));
  rec(!s1b.talk && (s1b.st === 'nod' || s1b.st === 'solo'), 'heard out, he counts himself in to play you his song', JSON.stringify({ s1b, playingWhileTalking: quiet1.vol }));
  /* the solo is caught as soon as the sound starts it (the sound keeps its own time, frames or no frames) */
  await B(e => { e.run(32); }); let s2 = null;
  for (let i = 0; i < 100; i++) { s2 = await B((e, d) => ({ st: d.busk.state.st, solo: e.loops()['busk-solo'], busk: e.loops().busk.vol, at: +window.__heloria.A.buskAt().solo.toFixed(2) })); if (s2.solo.playing && s2.solo.vol > .5) break; await wait(150); }
  rec(s2.st === 'solo' && s2.solo.playing && s2.solo.vol > .5 && s2.at >= 0 && s2.at < 6, 'and plays you his song, from its beginning', JSON.stringify(s2));
  let s2b = null; for (let i = 0; i < 40; i++) { s2b = await B((e, d) => ({ st: d.busk.state.st, busk: e.loops().busk })); if (s2b.busk.vol < .1) break; await wait(150); }
  rec(s2b.busk.vol < .1, 'his piece waits while he plays the song', JSON.stringify(s2b));
  const nt = await B((e, d) => { e.run(45); const D = d.busk.DM; return { vis: D.notes.visible, live: D.nt.filter(n => n.t < 2.4).length }; });
  rec(nt.vis && nt.live >= 2, 'while he plays for you notes rise from his amp', JSON.stringify(nt)); await frames(3); await shot(pre + 'busker-solo');
  let back = null; for (let i = 0; i < 90; i++) { await wait(1000); const st = await B((e, d) => d.busk.state.st); if (st === 'play') { back = i; break; } }
  await wait(2500); const s3 = await B(e => e.loops());
  rec(back !== null && s3.busk.playing && s3.busk.vol > .5 && !s3['busk-solo'].playing, 'after the song he goes back to his piece', JSON.stringify({ back, busk: s3.busk, solo: s3['busk-solo'] }));
  const met1 = await B((e, d) => ({ met: d.MET.size, talk: e.talk(), people: d.people.map(p => p.greeted) }));
  rec(met1.met === met0 && !met1.talk, 'he is not one of the three: nobody is counted as met', JSON.stringify(met1));

  /* E beside him talks to him too; this time he only has a line before he plays. Escape ends it and he goes back to his piece */
  await B((e, d) => { const D = d.busk.DM; D.st = 'play'; D.cool = 0; e.put(2.4, 0); e.run(3); }); await page.keyboard.press('KeyE');
  const se = await B((e, d) => ({ st: d.busk.state.st, talk: e.talk(), t: document.querySelector('#crTkS').textContent + document.querySelector('#crTkR').textContent }));
  rec(se.st === 'talk' && se.talk === 'Diarmuid' && !/English teacher/.test(se.t), 'E beside him talks to him; the second time he just offers another', JSON.stringify(se));
  await page.keyboard.press('Escape'); const sx = await B((e, d) => { e.run(2); return { st: d.busk.state.st, talk: e.talk() }; });
  rec(sx.st === 'play' && !sx.talk, 'Escape ends it, and he goes back to his piece', JSON.stringify(sx));
  await B((e, d) => { const D = d.busk.DM; D.st = 'play'; D.cool = 0; e.run(2); });

  /* his name tag from across town: you walk over (round things) and he plays when you get there */
  await B((e, d) => { d.closeTalk(); e.put(6, 6); e.run(10); });
  const tagged = await B((e, d) => { d.busk.DM.lb.click(); return { goal: d.busk.DM.goal, path: !!d.player.path }; });
  const walk = await B((e, d) => { let i = 0, bad = 0; for (; i < 600 && d.busk.state.st !== 'talk'; i++) bad += e.run(1, ['me']).bad; return { frames: i, bad, st: d.busk.state.st, d: d.busk.state.d, talk: e.talk() }; });
  rec(tagged.goal && walk.st === 'talk' && walk.bad === 0 && walk.talk === 'Diarmuid', 'his name tag from across town walks you over round things, and he talks', JSON.stringify({ tagged, walk }));
  await B((e, d) => { d.closeTalk(); const D = d.busk.DM; D.st = 'play'; D.cool = 0; });

  /* on a computer, pointing at him shows his name */
  if (!mobile) {
    await B((e, d) => { d.closeTalk(); e.put(7.2, -1.0); e.run(20); }); await frames(4);   // too far for his tag to show unless you point at him
    const sc = await B((e, d, h) => { h.stCam.updateMatrixWorld(); const v = d.busk.DM.dir.clone().multiplyScalar(24 + .1 + 1.0).project(h.stCam); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight]; });
    await page.mouse.move(sc[0] - 30, sc[1] + 40); await page.mouse.move(sc[0], sc[1], { steps: 4 }); await frames(2);
    const hv = await page.evaluate(() => { const l = [...document.querySelectorAll('#crLabels .crl')].find(x => x.textContent === 'Diarmuid'); const c = document.querySelector('#curT'); return { on: l.classList.contains('on'), cur: c && c.textContent }; });
    rec(hv.on && hv.cur === 'Say hello', 'pointing at him shows his name, and the pointer offers to say hello', JSON.stringify(hv));
  }

  /* how long his part of each frame takes */
  const ms = await B((e, d, h) => { const n = 400, t0 = performance.now(); for (let i = 0; i < n; i++) d.busk.update(1 / 60, h.S.t + i / 60); return +((performance.now() - t0) / n).toFixed(3); });
  rec(ms < 1, 'his part of a frame is light', ms + ' ms a frame here (software rendering, so a phone does better)');

  /* by day, close up; at night his lights are on and warm */
  await B(e => { e.put(2.6, -1.4); e.run(30); }); await wait(2500); await shot(pre + 'busker-day');
  await H(h => { const d = h.ST.cr._dbg; d.sky.set({ time: '21:30', weather: 'clear' }); d.sky.step(1); });
  await B(e => { e.run(10); }); await wait(2500);
  const night = await B((e, d) => { const D = d.busk.DM; return { nk: +D.nk.toFixed(2), halo: D.halo.visible, pool: D.pool.visible }; });
  rec(night.nk > .9 && night.halo && night.pool, 'at night his lights and lantern are lit, with a warm pool under them', JSON.stringify(night));
  await shot(pre + 'busker-night');
  await H(h => { const d = h.ST.cr._dbg; d.sky.set({ time: '13:00' }); d.sky.step(1); });
  const day = await B((e, d) => { e.run(3); const D = d.busk.DM; return { nk: D.nk, halo: D.halo.visible }; });
  rec(day.nk < .01 && !day.halo, 'by day the lights are off', JSON.stringify(day));

  /* leaving the page stops him with everything else */
  await B(e => { e.put(2.2, 0); }); await wait(2500);
  const hid = await H(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    return h.A._loops().filter(l => l.playing).map(l => l.name); });
  rec(!hid.length, 'a hidden page stops his guitar along with the rest', hid.join(', '));
  await H(h => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

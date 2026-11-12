/* How loud every stage of Land is, from the loader to the white page. Run with --meter (the harness then reads whatever
   reaches the speakers):
     node untamed/test/shot.cjs --html dist/untamed.html --meter --out /tmp/snd --scenario untamed/test/sound.cjs
   Each stage is listened to for a few seconds; the table at the end gives the loudest moment (dB) and the peak. A stage
   that never rises above -60 dB is silent to the ear. Headless frames are slow, so the clocks are stepped where it matters. */
module.exports = async ({ page, wait, H, log, mobile }) => {
  const rows = [];
  const listen = async (label, ms = 3200) => { let mx = -200, pk = 0, sum = 0, n = 0; const t0 = Date.now();
    while (Date.now() - t0 < ms) { const m = await page.evaluate(() => { const m = window.__meter(), A = window.__heloria && window.__heloria.A, lr = A && A._loopRms ? A._loopRms() : 0;   /* the recordings play outside the meter: their part is added */
      const r = Math.sqrt(Math.pow(10, m.db / 10) + lr * lr); return { ...m, db: r > 0 ? +(20 * Math.log10(r)).toFixed(1) : -200 }; }); mx = Math.max(mx, m.db); pk = Math.max(pk, m.pk); sum += Math.max(m.db, -90); n++; await wait(120); }
    const r = { label, max: mx, avg: +(sum / n).toFixed(1), peak: pk }; rows.push(r); log(('  ' + label).padEnd(46), String(mx).padStart(7), 'dB  peak', pk); return r; };
  const until = async (fn, ms = 120000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await H(fn, arg)) return true; await wait(200); } return false; };
  const step = n => H((h, n) => { const st = h.ST.cr; for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } }, n);

  await listen('loader, before anything is pressed', 2000);
  await require('./begin.cjs')(page, mobile);
  await wait(400); await listen('the word lifts away like cloud', 1600);
  await until(h => h.S.mode === 'station' && h.S.stId === 'cr', 60000); await wait(800); await listen('Earth: the rocket coming down');
  await H(h => h.ST.cr._dbg.skipCut()); await wait(1500); await listen('Earth: standing in town');
  await page.keyboard.down('KeyW'); await wait(300); await listen('Earth: walking'); await page.keyboard.up('KeyW');
  await H(h => { const d = h.ST.cr._dbg; d.openTalk(d.people[1], 0); }); await wait(600); await listen('Earth: talking to Michael');
  await H(h => h.ST.cr._dbg.closeTalk()); await wait(400);
  await H(h => { const d = h.ST.cr._dbg; d.marksEnter(); d.began(); const q = d.INST.ae, P = d.player; P.x = q.x + 2.6; P.z = q.z + 1.6; P.u.copy(d.at(P.x, P.z)); }); await step(60); await listen('Earth: by Aetos, at work');
  await H(h => { const d = h.ST.cr._dbg; const q = d.INST.kr, P = d.player; P.x = q.x + 2.4; P.z = q.z + 1.4; P.u.copy(d.at(P.x, P.z)); }); await step(60); await listen('Earth: by Kríos, at work');
  await H(h => { h.ST.cr._dbg.startFinale(); }); await wait(600); await listen('last flight: the launch scene, the doors and the lift');
  await H(h => { h.ST.cr._dbg.launch.skip(); h.S.finX = 3; }); await wait(600); await listen('last flight: up the ramp, the hatch, the ticks');
  await until(h => h.ST.cr._dbg.FIN.ask, 240000); await H(h => { h.S.finX = 1; }); await listen('last flight: waiting on the pad');
  await page.keyboard.down('Space'); await wait(300); await listen('last flight: holding, the engines spooling');
  await until(h => h.ST.cr._dbg.FIN.ign, 120000); await page.keyboard.up('Space'); await listen('last flight: lit, lifting off');
  await H(h => { h.S.finX = 3; }); await until(h => h.ST.cr._dbg.FIN.alt > 30, 240000); await listen('last flight: climbing through the clouds');
  if (await until(h => h.ST.cr._dbg.FIN.alt > 50 || h.S.mode === 'credits', 240000) && await H(h => h.S.mode !== 'credits')) await listen('last flight: up in the black, the music up high');
  await until(h => h.S.mode === 'credits', 300000); await wait(1500); await listen('the white page', 5000);
  const quiet = rows.filter(r => r.max < -60);
  log('\nSILENT (never above -60 dB): ' + (quiet.length ? quiet.map(r => r.label).join(' | ') : 'none'));
  log('QUIET (never above -45 dB): ' + rows.filter(r => r.max >= -60 && r.max < -45).map(r => r.label + ' ' + r.max).join(' | '));
  log('LOUDEST: ' + rows.slice().sort((a, b) => b.peak - a.peak).slice(0, 3).map(r => r.label + ' ' + r.peak).join(' | '));
};

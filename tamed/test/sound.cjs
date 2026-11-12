/* How loud every stage of the walk is, from the gate to the rocket at the end:
     node tamed/test/run.cjs --html dist/tamed.html --lowq --scenario tamed/test/sound.cjs --out /tmp/snd
   Each stage is listened to for a few seconds through the walk's own meter (what reaches the speakers); the table gives the
   loudest moment (dB) and the peak. A stage that never rises above -60 dB is silent to the ear. The meter hears only the
   sound made live (the notes, drops, birds and the hand): what sounds all the time is played from recordings, which it
   cannot hear, so the last column adds them in, worked out from each recording's level and its volume. */
module.exports = async ({ page, wait, T, settle, log, mobile }) => {
  const rows = [];
  const listen = async (label, ms = 3200) => { let mx = -200, pk = 0, all = -200; const t0 = Date.now();
    while (Date.now() - t0 < ms) { const m = await T(t => t.A.meter()); if (m) { mx = Math.max(mx, m.rmsDb); pk = Math.max(pk, m.peak); all = Math.max(all, m.allDb ?? m.rmsDb); } await wait(120); }
    mx = +mx.toFixed(1); all = +all.toFixed(1); rows.push({ label, max: mx, peak: pk, all }); log(('  ' + label).padEnd(44), String(mx).padStart(7), 'dB  peak', String(pk).padEnd(6), ' with the recordings', String(all).padStart(7), 'dB'); };
  await page.waitForFunction(() => window.__tamed.A.rendered !== 0, null, { timeout: 300000, polling: 500 }).catch(() => {});   // the recordings are made
  await page.mouse.click(8, 8);   // the first touch of the gate wakes the sound
  await wait(800); await listen('gate, nothing chosen');
  const ways = await page.evaluate(() => [...document.querySelectorAll('#gate .way')].map(w => w.dataset.way));   // Walk and Land
  for (const v of ways) { await T((t, v) => t.hover(v), v); await wait(400); await listen('gate, showing ' + v, 4200); }
  await T(t => t.hover(null));
  await T(t => t.enter()); await wait(3500); await settle(3); await listen('home, after entering');
  /* a hand through the water: each stroke swishes, louder and brighter the faster it moves */
  await T(t => { t.__sw = []; const f = t.A.swish; t.A.swish = function (k, p) { t.__sw.push(+k.toFixed(2)); return f.apply(this, arguments); }; });
  if (!mobile) { for (let i = 0; i < 14; i++) { await page.mouse.move(160 + i * 70, 690 - (i % 2) * 18); await settle(1); } }
  await listen('home, a hand moving through the water', 2000);
  const sw = await T(t => t.__sw); log('  swishes:', sw.length, JSON.stringify(sw.slice(0, 8)));
  if (!mobile && !sw.length) log('NO SWISH: moving through the water made no sound');
  for (const id of ['krios', 'aetos', 'pharos', 'ogive', 'team', 'contact']) {
    await T((t, id) => { const p = t.PLACES.find(p => p.id === id); t.jump(p.s); }, id); await settle(3); await wait(1500); await listen(id, 4000);
  }
  await page.waitForFunction(() => window.__tamed.LAUNCH.vis, null, { timeout: 120000, polling: 250 }).catch(() => {});
  await listen('contact, the rocket going up', 5000);
  await T(t => t.openIndex()); await wait(400); await listen('the index open', 2000); await T(t => t.closeIndex());
  const quiet = rows.filter(r => r.all < -60);
  log('\nSILENT with the recordings (never above -60 dB): ' + (quiet.length ? quiet.map(r => r.label).join(' | ') : 'none'));
  log('QUIET with the recordings (never above -45 dB): ' + rows.filter(r => r.all >= -60 && r.all < -45).map(r => r.label + ' ' + r.all).join(' | '));
};

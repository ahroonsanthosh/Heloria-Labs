/* What Earth's weather and nights sound like, and that each is there: rain on the roofs, crickets at night, the foghorn.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --meter --scenario untamed/test/weather-sound.cjs */
module.exports = async ({ page, wait, H, log }) => {
  const fail = m => { log('FAIL ' + m); process.exitCode = 1; };
  await page.mouse.click(200, 200);   // the sound starts on a gesture
  const listen = async (label, ms = 3500) => { let mx = -200, pk = 0; const t0 = Date.now();
    while (Date.now() - t0 < ms) { const m = await page.evaluate(() => { const m = window.__meter(), A = window.__heloria.A, lr = A._loopRms ? A._loopRms() : 0; const r = Math.sqrt(Math.pow(10, m.db / 10) + lr * lr); return { db: r > 0 ? 20 * Math.log10(r) : -200, pk: m.pk }; });
      mx = Math.max(mx, m.db); pk = Math.max(pk, m.pk); await wait(120); }
    log(('  ' + label).padEnd(40), mx.toFixed(1).padStart(7), 'dB  peak', pk.toFixed(3)); return mx; };
  const set = o => H((h, o) => h.ST.cr._dbg.sky.set(o), o);
  await set({ time: '13:00', weather: 'clear' }); await wait(1500); const base = await listen('a clear afternoon');
  await set({ weather: 'rain' }); await H(h => h.ST.cr._dbg.sky.step(.5)); await wait(4000);
  const loops = await H(h => h.A._loops().filter(l => l.name === 'rain')[0]); log('  rain recording', JSON.stringify(loops)); if (!(loops && loops.ready && loops.playing)) fail('the rain is not playing');
  await listen('rain');
  await set({ time: '22:00', weather: 'clear' }); await H(h => h.ST.cr._dbg.sky.step(1));
  /* (it fades over a couple of seconds; a page as slow as this one's software drawing fades it slower, so it is given time) */
  let r = null; for (let i = 0; i < 25; i++) { await wait(1000); r = await H(h => h.A._loops().filter(l => l.name === 'rain')[0]); if (!(r && r.playing && r.vol > .12)) break; }
  log('  rain after it stops', JSON.stringify(r)); if (r && r.playing && r.vol > .12) fail('the rain did not stop');
  await listen('night: crickets now and then', 6000);
  await set({ weather: 'fog' }); await H(h => { const d = h.ST.cr._dbg; d.sky.step(45); d.sky.WX.horn = 0; }); await wait(800);
  const fh = await listen('fog: the foghorn', 3500); if (!(fh > base + 2)) fail('the foghorn is not heard over the town');
  if (!process.exitCode) log('WEATHER SOUND OK');
};

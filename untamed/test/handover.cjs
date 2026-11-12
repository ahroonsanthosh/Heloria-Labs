/* The recordings' handovers when the page is busy: each long sound is two players in turn, crossing over a fade that is in
   the recording. A turn the mixer takes late (the page busy at that moment) must start the next player as far into its fade
   as the last one is into its own, so the crossing stays even and nothing dips or drops.
     node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/handover.cjs */
module.exports = async ({ page, wait, H, log }) => {
  let fails = 0; const rec = (ok, m, x) => { if (!ok) fails++; log((ok ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  (' + x + ')' : '')); };
  const loops = () => H(h => h.A._loops());
  let L = null; for (let i = 0; i < 120 && !L; i++) { L = (await loops()).find(l => l.playing && l.P > 0 && l.P < 60); if (!L) await wait(500); }
  if (!L) { rec(false, 'a recording playing on Earth to watch'); console.log('HANDOVER ' + fails + ' FAILED'); return; }
  log('watching', L.name, 'period', L.P, 'overlap', L.H);
  let tries = 0, checked = 0;
  while (checked < 2 && tries < 6) { tries++;
    /* wait until the playing one is a little short of its turn, then hold the page for 0.6 s across it */
    const t0 = Date.now(); let near = false;
    while (Date.now() - t0 < (L.P + 5) * 1000) { const l = (await loops()).find(x => x.name === L.name); const p = Math.max(...l.pos); if (p > l.P - .35 && p < l.P - .1 && l.players === 1) { near = true; break; } await wait(40); }
    if (!near) continue;
    await page.evaluate(() => { const e = performance.now() + 600; while (performance.now() < e) {} });   // the page busy across the turn
    await wait(250);
    const l = (await loops()).find(x => x.name === L.name), on = l.pos.filter(p => p >= 0).sort((a, b) => a - b);
    if (on.length < 2) { rec(false, 'both players crossing after a late turn', JSON.stringify(l.pos)); checked++; continue; }
    const behind = (on[1] - l.P) - on[0];   // the old one's distance past its turn against the new one's distance into its fade
    rec(Math.abs(behind) < .2, 'a turn taken 0.6 s late: the new player starts in step with the old one\'s fade (off by ' + behind.toFixed(3) + ' s)', JSON.stringify(l.pos));
    checked++; }
  if (!checked) rec(false, 'caught a turn to test');
  console.log(fails ? 'HANDOVER ' + fails + ' FAILED' : 'HANDOVER OK');
};

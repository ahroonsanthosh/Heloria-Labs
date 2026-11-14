/* The landing heard as a visitor's browser has it: sound only after a click, a tap or a key (a scroll is not one), on a page
   of its own (the click at the front door does not count here).
   node untamed/test/shot.cjs --html dist/untamed.html --real-autoplay --meter --scenario untamed/test/landing-sound.cjs --out <dir> [--mobile]
   (no --earth: it goes in from the opening screen.) On a computer the opening screen asks for a click, and a scroll only nudges
   the prompt, so the landing never comes down in silence; on a phone a swipe or a tap. The way in starts the sound: the
   landing's own recording plays from the moment the rocket is coming down, and the town's music is up by the touchdown,
   not at your first key afterwards. */
module.exports = async ({ page, shot, wait, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  const until = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await wait(120); } return false; };
  const pre = mobile ? 'm-' : '';

  rec(await until(() => document.querySelector('#load').classList.contains('ready'), 600000), 'the opening screen gets ready');
  await wait(1400);
  const cue = await page.evaluate(() => document.querySelector('#beginT').textContent);
  rec(mobile ? /^swipe to land$/i.test(cue) : /^click to land$/i.test(cue), mobile ? 'on a phone it asks for a swipe' : 'on a computer it asks for a click (a scroll cannot start the sound on a page of its own)', cue);
  rec(await page.evaluate(() => !window.__heloria.A.ctx || window.__heloria.A.ctx.state !== 'running'), 'before the way in, no sound has started (as on a visitor\'s browser)');
  await shot(pre + 'ls-1-opening');

  if (!mobile) {
    await page.mouse.move(640, 400); await page.mouse.wheel(0, 240); await wait(1000);
    const s = await page.evaluate(() => ({ mode: window.__heloria.S.mode, nudge: document.querySelector('#begin').classList.contains('nudge') }));
    rec(s.mode === 'load' && s.nudge, 'a scroll does not start a silent landing: it nudges the prompt', JSON.stringify(s));
    await page.mouse.click(640, 400);
  } else await page.tap('#begin');
  rec(await until(() => window.__heloria.S.mode !== 'load', 10000), mobile ? 'a tap goes in' : 'a click goes in');
  rec(await until(() => { const c = window.__heloria.A.ctx; return !!c && c.state === 'running'; }, 8000), 'and the sound starts with it', await page.evaluate(() => window.__heloria.A.ctx && window.__heloria.A.ctx.state));

  /* through the landing: when its own recording is heard, and when the music is */
  rec(await until(() => window.__heloria.S.mode === 'station' && window.__heloria.ST.cr._dbg.cut().on, 30000), 'the rocket comes down onto Earth');
  let land = null, mus = null, last = null, shotDone = false; const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    const q = await page.evaluate(() => { const h = window.__heloria, c = h.ST.cr._dbg.cut(); return { on: c.on, t: +(c.t || 0).toFixed(2), land: h.A.landClock(), loops: h.A._loopRms() }; });
    last = q; if (q.on && q.land !== null && land === null) land = q.t; if (q.on && q.loops > 0 && mus === null) mus = q.t;
    if (!shotDone && q.t > 3.2) { shotDone = true; await shot(pre + 'ls-2-hover'); }
    if (!q.on) break; await wait(150);
  }
  rec(land !== null && land < 1.5, 'the landing\'s own recording is heard from the start of the landing', JSON.stringify({ firstHeardAt: land }));
  rec(mus !== null && mus < 4.8, 'the town\'s music is up by the touchdown (4.2 s), not at the first key afterwards', JSON.stringify({ firstHeardAt: mus }));
  await wait(1500);
  const after = await page.evaluate(() => ({ loops: window.__heloria.A._loopRms(), state: window.__heloria.A.ctx.state }));
  rec(after.loops > 0 && after.state === 'running', 'on Earth, before any key, the music plays on', JSON.stringify(after));

  console.log(`\nSUMMARY ${pass} passed, ${fail} failed` + (fail ? ': ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

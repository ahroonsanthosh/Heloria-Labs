/* The landing heard as a visitor's browser has it. Land comes down by itself once Earth is ready, with no click asked for.
   A browser lets sound start only once the page has had a click, a tap or a key: come from the front door, the click there
   counts (in Chrome and the browsers like it), and the landing is heard from its first moment; come straight to Land (a
   bookmark, a reload), the landing comes down held silent until the first click, tap or key, which starts it in step with
   the landing and does not skip it.
   node untamed/test/shot.cjs --html dist/untamed.html --meter --scenario untamed/test/landing-sound.cjs --out <dir> [--mobile]
     (as a browser that lets the sound start: the landing's recording from the start, the music by the touchdown)
   node untamed/test/shot.cjs --html dist/untamed.html --real-autoplay --meter --scenario untamed/test/landing-sound.cjs --out <dir> [--mobile]
     (come straight here: held until a click or a tap, then in step) */
module.exports = async ({ page, shot, wait, log, mobile, quiet }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  const untilQ = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await quiet(expr)) return true; await wait(120); } return false; };
  const Q = async expr => JSON.parse(await quiet('() => JSON.stringify((' + expr + ')())'));
  const pre = mobile ? 'm-' : '';
  const NOW = "() => { const h = window.__heloria, c = h.ST.cr._dbg.cut(); return { mode: h.S.mode, on: c.on, t: +(c.t || 0).toFixed(2), ctx: h.A.ctx && h.A.ctx.state, land: h.A.landClock(), loops: h.A._loopRms() }; }";

  /* (until a click, the page is only looked at quietly: the test's own questions must not count as one) */
  rec(await untilQ("() => window.__heloria.S.mode !== 'load'", 15000), 'it comes down by itself once Earth is ready: no click, no scroll');
  rec(await untilQ("() => window.__heloria.S.mode === 'station' && window.__heloria.ST.cr._dbg.cut().on", 30000), 'the rocket comes down onto Earth');
  const free = await quiet("() => { const c = window.__heloria.A.ctx; return !!c && c.state === 'running'; }");
  log(free ? 'this browser lets the sound start here without a click' : 'this browser holds the sound until a click (come straight to Land)');

  if (free) {
    let land = null, mus = null; const t0 = Date.now(); let shotDone = false;
    while (Date.now() - t0 < 180000) { const q = await Q(NOW); if (q.on && q.land !== null && land === null) land = q.t; if (q.on && q.loops > 0 && mus === null) mus = q.t;
      if (!shotDone && q.t > 3.2) { shotDone = true; await shot(pre + 'ls-hover'); } if (!q.on) break; await wait(150); }
    rec(land !== null && land < 1.5, 'the landing\'s own recording is heard from the start of the landing', JSON.stringify({ firstHeardAt: land }));
    rec(mus !== null && mus < 4.8, 'the town\'s music is up by the touchdown (4.2 s)', JSON.stringify({ firstHeardAt: mus }));
  } else {
    await wait(1200); const b0 = await Q(NOW);
    rec(b0.on && b0.ctx !== 'running' && b0.land === null, 'with no click yet the browser holds the sound, and the landing comes down regardless', JSON.stringify(b0));
    /* (no screenshot until the click: the browser takes one as a gesture, as it would a click) */
    const vp = page.viewportSize(), cx = vp.width / 2, cy = vp.height / 2;   // (the middle of the screen: where a thumb or the mouse would be)
    if (mobile) await page.touchscreen.tap(cx, cy); else { await page.mouse.move(cx, cy); await page.mouse.click(cx, cy); }
    await wait(400);
    const a0 = await page.evaluate(new Function('return (' + NOW + ')()'));
    rec(a0.on, 'a first ' + (mobile ? 'tap' : 'click') + ' on the landing starts its sound and does not skip it', JSON.stringify(a0));
    await shot(pre + 'ls-after-first-click');
    /* (the recording plays from where the landing has got to; on this machine's software drawing the landing's own clock
       crawls while the sound runs at its own speed, so here it is only asked that it plays: on a visitor's screen the two
       keep step) */
    let land = a0.ctx === 'running' && a0.land !== null ? a0.land : null; const t0 = Date.now();
    while (land === null && Date.now() - t0 < 6000) { const q = await page.evaluate(new Function('return (' + NOW + ')()')); if (q.ctx === 'running' && q.land !== null) land = q.land; await wait(120); }
    rec(land !== null, 'the landing\'s own recording starts with that ' + (mobile ? 'tap' : 'click'), JSON.stringify({ land }));
    if (mobile) await page.touchscreen.tap(cx, cy); else await page.mouse.click(cx, cy);
    rec(await page.waitForFunction(() => !window.__heloria.ST.cr._dbg.cut().on, null, { timeout: 8000 }).then(() => true, () => false), 'a second ' + (mobile ? 'tap' : 'click') + ' skips the landing, as before');
  }
  let after = null; { const t0 = Date.now(); while (Date.now() - t0 < 10000) { after = await page.evaluate(() => ({ loops: window.__heloria.A._loopRms(), state: window.__heloria.A.ctx.state })); if (after.loops > 0) break; await wait(250); } }
  rec(after.loops > 0 && after.state === 'running', 'on Earth the town\'s music plays', JSON.stringify(after));
  console.log(`\nSUMMARY ${pass} passed, ${fail} failed` + (fail ? ': ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

/* The landing heard as a visitor's browser has it. A browser lets sound start only once the page has had a click, a tap or
   a key. Come from the front door, the click there counts (in Chrome and the browsers like it): Land comes down by itself
   once Earth is ready, with no click asked for, and the landing is heard from its first moment. Where the browser holds the
   sound (Safari, or anyone come straight to Land: a bookmark, a reload), the landing is never made without it: it waits
   under the name, saying "Click to land" (or "Tap"), and the first click, tap or key brings it down with its sound running
   from the start.
   node untamed/test/shot.cjs --html dist/untamed.html --meter --scenario untamed/test/landing-sound.cjs --out <dir> [--mobile]
     (as a browser that lets the sound start: the landing's recording from the start, the music by the touchdown)
   node untamed/test/shot.cjs --html dist/untamed.html --real-autoplay --meter --scenario untamed/test/landing-sound.cjs --out <dir> [--mobile]
     (come straight here: the landing waits for a click or a tap, then comes down with its sound) */
module.exports = async ({ page, shot, wait, log, mobile, quiet }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); };
  const untilQ = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await quiet(expr)) return true; await wait(120); } return false; };
  const Q = async expr => JSON.parse(await quiet('() => JSON.stringify((' + expr + ')())'));
  const pre = mobile ? 'm-' : '';
  const NOW = "() => { const h = window.__heloria, c = h.ST.cr._dbg.cut(); return { mode: h.S.mode, on: c.on, t: +(c.t || 0).toFixed(2), ctx: h.A.ctx && h.A.ctx.state, land: h.A.landClock(), loops: h.A._loopRms() }; }";

  /* (until a click, the page is only looked at quietly: the test's own questions must not count as one) */
  const LOADQ = "() => { const h = window.__heloria; return { mode: h.S.mode, ask: !!h.S.ask, boot: document.querySelector('#boot').textContent, op: +getComputedStyle(document.querySelector('#boot')).opacity, ctx: h.A.ctx && h.A.ctx.state }; }";
  let how = null; { const t0 = Date.now(); while (Date.now() - t0 < 15000) { how = await Q(LOADQ); if (how.mode !== 'load' || how.ask) break; await wait(120); } }
  const free = how.mode !== 'load';
  log(free ? 'this browser lets the sound start here without a click' : 'this browser holds the sound until a click (come straight to Land, or Safari)');

  if (free) {
    rec(true, 'where the browser lets the sound start, it comes down by itself once Earth is ready: no click, no scroll', JSON.stringify(how));
    rec(await untilQ("() => window.__heloria.S.mode === 'station' && window.__heloria.ST.cr._dbg.cut().on", 30000), 'the rocket comes down onto Earth');
    let land = null, mus = null; const t0 = Date.now(); let shotDone = false;
    while (Date.now() - t0 < 180000) { const q = await Q(NOW); if (q.on && q.land !== null && land === null) land = q.t; if (q.on && q.loops > 0 && mus === null) mus = q.t;
      if (!shotDone && q.t > 3.2) { shotDone = true; await shot(pre + 'ls-hover'); } if (!q.on) break; await wait(150); }
    rec(land !== null && land < 1.5, 'the landing\'s own recording is heard from the start of the landing', JSON.stringify({ firstHeardAt: land }));
    rec(mus !== null && mus < 4.8, 'the town\'s music is up by the touchdown (4.2 s)', JSON.stringify({ firstHeardAt: mus }));
  } else {
    rec(how.ask && how.boot === (mobile ? 'Tap to land' : 'Click to land') && how.ctx !== 'running', 'where the browser holds the sound, the landing waits under the name and says so: "' + how.boot + '"', JSON.stringify(how));
    await wait(2500); const b0 = await Q(LOADQ);
    rec(b0.mode === 'load' && b0.ask && b0.op > .3, 'and goes on waiting: it never comes down silent', JSON.stringify(b0));
    /* (no screenshot until the click: the browser takes one as a gesture, as it would a click) */
    const vp = page.viewportSize(), cx = vp.width / 2, cy = vp.height / 2;   // (the middle of the screen: where a thumb or the mouse would be)
    if (mobile) await page.touchscreen.tap(cx, cy); else { await page.mouse.move(cx, cy); await page.mouse.click(cx, cy); }
    const a0 = await page.evaluate(() => ({ mode: window.__heloria.S.mode, ctx: window.__heloria.A.ctx.state, ask: !!window.__heloria.S.ask }));
    rec(a0.mode !== 'load' && !a0.ask, 'the first ' + (mobile ? 'tap' : 'click') + ' brings the landing down', JSON.stringify(a0));
    await page.waitForFunction(() => window.__heloria.A.ctx.state === 'running', null, { timeout: 4000 }).catch(() => {});
    rec(await page.evaluate(() => window.__heloria.A.ctx.state) === 'running', 'and lets the sound start with it');
    await page.waitForFunction(() => window.__heloria.S.mode === 'station' && window.__heloria.ST.cr._dbg.cut().on, null, { timeout: 30000 }).catch(() => {});
    let land = null; const t0 = Date.now();
    while (Date.now() - t0 < 30000) { const q = await page.evaluate(new Function('return (' + NOW + ')()')); if (q.on && q.land !== null) { land = q.t; break; } if (q.mode === 'station' && !q.on) break; await wait(120); }
    rec(land !== null && land < 1.5, 'the landing\'s own recording is heard from the start of the landing', JSON.stringify({ firstHeardAt: land }));
    await shot(pre + 'ls-after-first-click');
    if (mobile) await page.touchscreen.tap(cx, cy); else await page.mouse.click(cx, cy);
    rec(await page.waitForFunction(() => !window.__heloria.ST.cr._dbg.cut().on, null, { timeout: 8000 }).then(() => true, () => false), 'a second ' + (mobile ? 'tap' : 'click') + ' skips the landing, as before');
  }
  let after = null; { const t0 = Date.now(); while (Date.now() - t0 < 10000) { after = await page.evaluate(() => ({ loops: window.__heloria.A._loopRms(), state: window.__heloria.A.ctx.state })); if (after.loops > 0) break; await wait(250); } }
  rec(after.loops > 0 && after.state === 'running', 'on Earth the town\'s music plays', JSON.stringify(after));
  console.log(`\nSUMMARY ${pass} passed, ${fail} failed` + (fail ? ': ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

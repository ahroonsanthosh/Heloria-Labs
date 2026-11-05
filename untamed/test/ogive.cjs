/* Apogee, played properly from the real Play button to the results, on a desktop or a phone:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/ogive --scenario untamed/test/ogive.cjs [--mobile]
   (a build of Ogive alone is quicker: python3 untamed/build.py --only og --single /tmp/x/og.html --inline-three)
   Headless frames are slow, so the station's clock is frozen and stepped by hand, 1/30 s at a time, between real inputs:
   drags on the nose and fin handles (the mouse, or a finger through the browser's own touch events), the arrow keys on a
   focused handle, the motor buttons, the ballast stepper, Ask Ogive, Launch, Cancel, Space and Escape, the Open chute
   button and taps on the sky. After every step the flight is checked: nothing that is not a number, the camera keeping the
   rocket on the screen, the read-outs matching the flight, and every flight landing. The flights cover the chute right at
   the top, opened while still burning (refused), torn open too fast, never opened (the motor's ejection charge), the
   heaviest and the lightest designs, an unstable one that cartwheels, an overstable one, and Ogive's own design. Three
   flights use up a target; New target, Back to orbit, the Orbit button and Escape (which first cancels a countdown) are
   checked, and the layout is looked at on other screens, the phone upright and held sideways among them.
   It ends on a line OGIVE (desktop|phone): N of M passed. */
const results = [];
function rec(ok, name, detail) { results.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); }

module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '', dev = mobile ? 'phone' : 'desktop';
  const until = (fn, arg, t = 60000) => page.waitForFunction(fn, arg, { timeout: t, polling: 250 }).then(() => true).catch(() => false);
  const frames = (n = 2) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const snapshot = async name => { await H(h => { h.S.stSnap = true; }); await frames(2); await wait(700); await frames(1); await shot(name); };
  const at = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const look = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return { err: 'not found' }; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return { err: 'not shown' };
    const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { err: 'off the screen' };
    const top = document.elementFromPoint(x, y); if (!top || !(top === e || e.contains(top))) return { err: 'covered by ' + (top ? (top.id || String(top.className) || top.tagName) : 'nothing') }; return { x, y }; }, sel);
  const press = async (sel, name) => {
    let p = await look(sel); for (let k = 0; k < 4 && p.err; k++) { await frames(2); p = await look(sel); }
    if (p.err) { rec(false, (name || sel) + ' can be pressed', p.err); return false; }
    await at(p.x, p.y); return true;
  };
  const covered = async (scope, label) => {
    await frames(2);
    const bad = await page.evaluate(scope => { const out = []; const root = document.querySelector(scope); if (!root) return ['scope missing ' + scope];
      root.querySelectorAll('button,a[href],[data-play],[data-back],.handle').forEach(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none' || el.disabled) return;
        let p = el; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.opacity === '0' || s.display === 'none' || s.visibility === 'hidden') return; p = p.parentElement; }
        const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { out.push((el.id || el.className) + ' off the screen'); return; }
        const top = document.elementFromPoint(x, y); if (!top || !(top === el || el.contains(top))) out.push((el.id || el.className) + ' covered by ' + (top ? (top.id || top.className || top.tagName) : 'nothing')); });
      return out; }, scope);
    rec(bad.length === 0, 'nothing covers the controls: ' + label, bad.join('; '));
  };
  // a drag with the real pointer: the mouse on a desktop, a finger (the browser's own touch events) on a phone
  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  const drag = async (x0, y0, x1, y1, mid) => {
    const vw = await page.evaluate(() => [innerWidth, innerHeight]), k = Math.min(1, ...[[x1 - x0, x0, vw[0]], [y1 - y0, y0, vw[1]]].map(([dd, p0, L]) => dd > 0 ? (L - 6 - p0) / dd : dd < 0 ? (p0 - 6) / -dd : 1));
    x1 = x0 + (x1 - x0) * Math.max(0, k); y1 = y0 + (y1 - y0) * Math.max(0, k);
    if (!mobile) { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6); if (mid) await mid(); await page.mouse.up(); return; }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 6, y: y0 + (y1 - y0) * i / 6, id: 1 }] });
    if (mid) await mid();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

  await H(h => h.jump('og')); await wait(2500);
  await H(h => {
    const st = h.ST.og, d = st.dbg, SCF = .1, MOT = { F: { I: 42, tb: 1.4 }, G: { I: 58, tb: 1.7 }, H: { I: 80, tb: 2.0 } };
    if (!st.__orig) { st.__orig = st.update; st.update = function (dt, t) { if (!(window.__ogT && window.__ogT.frozen)) return st.__orig.call(st, dt, t); }; }
    const q = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-IE');
    const T = window.__ogT = {
      frozen: false, flags: new Map(), off: 0, offMax: 0, steps: 0, caps: [], pops: [],
      flag(k, m) { if (!T.flags.has(k)) T.flags.set(k, m); },
      freeze(v) { T.frozen = v; },
      step(n, stop) { const r = h.S.rdt; h.S.rdt = 1 / 30; try { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.__orig.call(st, 1 / 30, h.S.t); T.steps++; T.watch(); if (stop && stop()) return i + 1; } } finally { h.S.rdt = r; } return n; },
      // the camera as the page draws it: it eases toward where the station puts it, 1 - e^(-4 dt) a frame, as the main loop does
      cp: null, cl: null,
      follow() { if (!T.cp || h.S.stSnap) { T.cp = st.camP.clone(); T.cl = st.camL.clone(); return; } T.cp.lerp(st.camP, 1 - Math.exp(-4 / 30)); T.cl.lerp(st.camL, 1 - Math.exp(-5 / 30)); },
      cam() { const c = h.stCam.clone(); c.position.copy(T.cp || st.camP); c.lookAt(T.cl || st.camL); c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); c.updateMatrixWorld(); return c; },
      scr(c, x, y, z) { const V = new h.stCam.position.constructor(x, y, z).project(c); return [(V.x * .5 + .5) * innerWidth, (-V.y * .5 + .5) * innerHeight, V.z]; },
      watch() {
        T.follow();
        const F = d.F, ph = d.phase;
        if (![st.camP.x, st.camP.y, st.camP.z, st.camL.x, st.camL.y, st.camL.z].every(Number.isFinite)) T.flag('cam', 'the camera is not a number in ' + ph);
        if (!F) return;
        if (![F.x, F.h, F.vx, F.vy, F.th, F.t, F.m].every(Number.isFinite)) T.flag('nan' + ph, 'the flight has a number that is not a number at T+' + F.t);
        if (F.t > 239) T.flag('long', 'the flight is still going after 239 s');
        if (ph === 'flight') {
          if (q('#ogA').textContent !== String(Math.round(F.h))) T.flag('alt' + Math.round(F.t), 'the altitude reads ' + q('#ogA').textContent + ' at ' + Math.round(F.h) + ' m');
          // the rocket (and once it is open, the canopy above it) on the screen, as the camera frames it
          if (F.lifted && F.t > 1.6 && !F.landed) { const c = T.cam(), y = F.h * SCF + .5, pts = [T.scr(c, F.x * SCF, y, 0)]; if (F.chute && F.t > F.deployT + 1.2) pts.push(T.scr(c, F.x * SCF + .25, y + 1.2, 0));
            for (const [x, yy, z] of pts) { const m = Math.max(-x, -yy, x - innerWidth, yy - innerHeight, z > 1 ? 1e4 : 0); if (m > 0) { T.off++; T.offMax = Math.max(T.offMax, m); if (m > 30) T.flag('off' + Math.round(F.t / 5), 'the rocket is ' + Math.round(m) + ' px off the screen at T+' + F.t.toFixed(1) + ' (' + (F.chute ? 'under the chute' : 'climbing or falling') + ', ' + Math.round(F.h) + ' m)'); } } }
        }
      },
      ui() { return { motor: [...document.querySelectorAll('#ogMotor button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.m).join(''), LDv: q('#ogHNv').textContent, finv: q('#ogHFv').textContent,
        bal: q('#ogBal').textContent, stab: q('#ogStab').textContent, word: q('#ogStabW').textContent, mass: q('#ogMass').textContent, mot: q('#ogMotS').textContent, target: q('#ogTarget').textContent, tries: q('#ogTries').textContent,
        cls: ['unstable', 'overstable', 'assisted', 'searching', 'answered', 'chute-ready', 'chute-now'].filter(c => st.el.classList.contains(c)).join(' '), launch: q('#ogLaunchT').textContent, cancel: q('#ogLaunch').classList.contains('cancel'), disabled: q('#ogLaunch').disabled }; },
      state() { const F = d.F, x = d.d; return { phase: d.phase, state: st.state, d: { motor: x.motor, LD: +x.LD.toFixed(3), fin: +x.fin.toFixed(3), bal: +x.bal.toFixed(3) }, target: d.target,
        F: F && { t: +F.t.toFixed(2), h: +F.h.toFixed(1), x: +F.x.toFixed(1), vy: +F.vy.toFixed(1), apo: +F.apo.toFixed(1), chute: F.chute, torn: F.torn, auto: F.auto, tumble: F.tumble, landed: F.landed, deployT: +F.deployT.toFixed(2), stab: +F.D.stab.toFixed(2), tb: F.D.M.tb },
        NAT: d.NAT && { tApo: +d.NAT.tApo.toFixed(2), apo: +d.NAT.apo.toFixed(1) }, tScale: +d.tScale.toFixed(2) }; },
      // the report this flight should get, by the game's own rules
      expectRes(hist) { const f = d.F, target = d.target, err = Math.abs(f.apo - target), pct = err / target * 100, dt = f.deployT < 0 ? 0 : f.deployT - d.NAT.tApo;
        const apoS = Math.max(0, Math.round(1000 - pct * 45)), dep = f.torn ? 0 : f.auto ? 60 : Math.max(0, Math.round(300 - Math.abs(dt) * 260));
        const grade = f.tumble ? 'Cartwheeled' : f.torn ? 'Chute shredded' : pct < 2 ? 'Bullseye' : pct < 5 ? 'On target' : pct < 12 ? 'Close' : 'Off target', sgn = f.apo >= target ? '+' : '−';
        return { grade, score: fmt(apoS + dep), apo: Math.round(f.apo) + ' m', off: Math.round(err) === 0 ? '0 m' : sgn + Math.round(err) + ' m', chute: f.torn ? 'Torn' : f.auto ? 'Auto, late' : (dt >= 0 ? '+' : '−') + Math.abs(dt).toFixed(2) + ' s',
          stab: f.D.stab.toFixed(2) + ' cal', eb: 'Flight ' + hist + ' / 3 · target ' + target + ' m' }; },
      res() { return { g: q('#ogG').getAttribute('aria-label') || q('#ogG').textContent, s: q('#ogFinal').textContent, eb: q('#ogResEb').textContent, nw: q('#ogNew').textContent, stats: Object.fromEntries([...document.querySelectorAll('#ogStats div')].map(e => [e.querySelector('span').textContent, e.querySelector('b').textContent])),
        p: q('#ogP').textContent, again: q('#ogAgain').textContent, againOff: q('#ogAgain').disabled, best: q('#ogBest').textContent }; },
      // where the controls are right now, for a real drag
      handles() { const b = s => { const r = q(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }; const m = /translate\(([-\d.]+)px, ?([-\d.]+)px\) rotate\(([-\d.]+)rad\)/.exec(q('#ogRail').style.transform);
        return { n: b('#ogHN'), f: b('#ogHF'), rail: m ? [+m[1], +m[2], +m[3]] : null }; },
      // the HUD at this moment: nothing overlapping, all on the screen and readable
      layout() {
        const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
          for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
        const txt = e => { const R = document.createRange(); R.selectNodeContents(e); return [...R.getClientRects()].filter(r => r.width > .5 && r.height > .5); };
        const B = [], add = (g, r) => B.push({ g, l: r.left, t: r.top, r: r.right, b: r.bottom }), ph = d.phase;
        if (vis(q('#back'))) add('the Orbit button', q('#back').getBoundingClientRect());
        if (vis(q('#chrome .brand'))) txt(q('#chrome .brand')).forEach(r => add('the brand', r));
        st.el.querySelectorAll('.ogtl > span').forEach(e => { if (vis(e)) txt(e).forEach(r => add('the target', r)); });
        if (vis(q('#ogGauge'))) add('the gauge', q('#ogGauge').getBoundingClientRect());
        if (ph === 'design') { if (vis(q('.st-og .ogbar'))) add('the design bar', q('.st-og .ogbar').getBoundingClientRect()); if (vis(q('#ogAI')) && q('#ogAI').textContent) txt(q('#ogAI')).forEach(r => add('Ogive\'s answer', r));
          for (const s of ['#ogHN', '#ogHF']) if (vis(q(s))) { const r = q(s).getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2]; add(s === '#ogHN' ? 'the nose handle' : 'the fin handle', { left: c[0] - 13, top: c[1] - 13, right: c[0] + 13, bottom: c[1] + 13 }); txt(q(s + ' .lb')).forEach(r => add(s === '#ogHN' ? 'the nose handle' : 'the fin handle', r)); }
          for (const [s, n] of [['#ogStabL', 'the stability'], ['#ogCGl', 'the CG label'], ['#ogCPl', 'the CP label']]) if (vis(q(s))) txt(q(s)).forEach(r => add(n, r)); }
        if (vis(q('#ogLaunch'))) add('the launch button', q('#ogLaunch').getBoundingClientRect());
        if (vis(q('.st-og .alt'))) st.el.querySelectorAll('.alt > span').forEach(e => { if (e.textContent) txt(e).forEach(r => add('the altitude', r)); });
        if (vis(q('#ogCD'))) st.el.querySelectorAll('#ogCD > *').forEach(e => { if (e.textContent) txt(e).forEach(r => add('the countdown', r)); });
        if (vis(q('#ogPrompt'))) { add('the chute button', q('#ogChute').getBoundingClientRect()); txt(q('#ogPromptT')).forEach(r => add('the chute button', r)); }
        const bad = [];
        for (const b of B) if (b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) bad.push(b.g + ' runs off the screen');
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; if (a.g === b.g) continue;
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 1 && oy > 1) bad.push(a.g + ' overlaps ' + b.g); }
        const small = [...st.el.querySelectorAll('.ghud *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 8).map(e => e.id || e.className || e.tagName);
        if (small.length) bad.push('text under 8 px: ' + [...new Set(small)].join(', '));
        // the rocket itself: in the design view, the markers on its rail; in flight, where the camera puts it
        if (ph === 'flight' && d.F && d.F.lifted) { const c = T.cam(), [x, y] = T.scr(c, d.F.x * SCF, d.F.h * SCF + .5, 0);
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) bad.push('the rocket is off the screen');
          for (const b of B.filter(b => ['the chute button', 'the altitude', 'the target'].includes(b.g))) if (x > b.l - 4 && x < b.r + 4 && y > b.t - 4 && y < b.b + 4) { bad.push('the rocket sits under ' + b.g); break; } }
        return [...new Set(bad)];
      },
      layoutPanel(which) {
        const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
          for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
        const txt = e => { const R = document.createRange(); R.selectNodeContents(e); return [...R.getClientRects()].filter(r => r.width > .5 && r.height > .5); };
        const B = [], add = (g, r) => B.push({ g, l: r.left, t: r.top, r: r.right, b: r.bottom }), bad = [];
        if (which === 'title') {
          st.el.querySelectorAll('.card > *').forEach(e => { if (vis(e)) txt(e).forEach(r => add('the title', r)); });
          st.el.querySelectorAll('.go .lbl > *').forEach(e => { if (vis(e)) txt(e).forEach(r => add('the game\'s name', r)); });
          st.el.querySelectorAll('.go .btn').forEach(e => { if (vis(e)) add('the buttons', e.getBoundingClientRect()); });
          st.el.querySelectorAll('.notes .note').forEach(e => { if (vis(e)) txt(e).forEach(r => add('the side notes', r)); });
          if (vis(q('#back'))) add('the Orbit button', q('#back').getBoundingClientRect());
        } else { const r = q('.st-og .res'); if (r.scrollHeight > r.clientHeight + 1) bad.push('the report scrolls'); const b = r.getBoundingClientRect(); if (b.top < 0 || b.bottom > innerHeight || b.left < 0 || b.right > innerWidth) bad.push('the report runs off the screen'); }
        for (const b of B) if (b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) bad.push(b.g + ' runs off the screen');
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; if (a.g === b.g) continue;
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 1 && oy > 1) bad.push(a.g + ' overlaps ' + b.g); }
        return [...new Set(bad)];
      },
      watchCaps() { new MutationObserver(() => { const k = q('#ogCapK').textContent; if (k) T.caps.push(k + ': ' + q('#ogCapV').textContent); }).observe(q('#ogCap'), { attributes: true, attributeFilter: ['class'] });
        new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.textContent) T.pops.push(n.textContent); }).observe(q('#ogPops'), { childList: true }); },
    };
    T.watchCaps();
  });

  const S = () => H(() => window.__ogT.state()), U = () => H(() => window.__ogT.ui());
  const step = (n, stop) => H((h, a) => window.__ogT.step(a.n, a.stop ? new Function('return (' + a.stop + ')(window.__heloria.ST.og.dbg)') : null), { n, stop: stop ? stop.toString() : null });
  const stepTo = (fn, n = 9000) => H((h, a) => { const f = new Function('return (' + a.fn + ')')(); const d = h.ST.og.dbg; return window.__ogT.step(a.n, () => f(d)); }, { fn: fn.toString(), n });
  // (after the clock was stepped through a change of phase, the page's own fades are given a moment of real time first)
  const settle = () => page.waitForFunction(() => !document.getAnimations().some(a => a instanceof CSSTransition && a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.st-og')), null, { timeout: 4000, polling: 100 }).catch(() => {});
  const layoutCheck = async label => { await frames(2); await wait(300); await settle(); const b = await H(() => window.__ogT.layout()); rec(b.length === 0, 'layout, ' + label + ': nothing overlaps, all on the screen and readable', b.join('; ')); return b; };
  const panelCheck = async (which, label) => { const b = await H((h, w) => window.__ogT.layoutPanel(w), which); rec(b.length === 0, 'layout, ' + label + ': nothing runs into anything else', b.join('; ')); };
  const skySpot = () => page.evaluate(() => { for (const [fx, fy] of [[.5, .3], [.6, .4], [.4, .4], [.5, .5], [.7, .3], [.3, .3], [.55, .62]]) { const x = innerWidth * fx, y = innerHeight * fy, e = document.elementFromPoint(x, y); if (e && e.tagName === 'CANVAS') return [x, y]; } return null; });
  const t0 = Date.now();

  /* ---------------- the title ---------------- */
  await snapshot(P + 'ogive-0-title');
  await covered('.st-og .go', 'the title'); await panelCheck('title', 'the title, ' + dev);
  await H(() => window.__ogT.freeze(true));
  await press('.st-og .go [data-play]', 'Play');
  rec(await until(() => window.__heloria.ST.og.state === 'play', null, 60000), 'Play starts the game (' + dev + ')');
  await step(30);
  { const s = await S(), u = await U();
    rec(s.phase === 'design' && s.d.motor === 'G' && s.d.LD === 2.5 && s.d.fin === 1 && s.d.bal === 0 && s.target >= 160 && s.target <= 440 && s.target % 10 === 0, 'the game opens on the design: a G motor, L/D 2.50, full fins, no ballast, a target between 160 and 440 m', JSON.stringify(s));
    rec(u.motor === 'G' && u.LDv === 'L/D 2.50' && u.finv === '75 mm' && u.bal === '0 g' && u.target === s.target + ' m' && u.tries === 'Flight 1 / 3' && u.launch === 'Launch' && !u.cancel && /^\d\.\d\d cal$/.test(u.stab) && u.word === 'Stable', 'and the HUD says so', JSON.stringify(u)); }
  await H(h => { h.S.stSnap = true; }); await frames(2); await step(2);
  await covered('.st-og .ghud', 'the design view (' + dev + ')'); await layoutCheck('the design view, ' + dev);
  await snapshot(P + 'ogive-1-design');

  /* ---------------- the design: drags, keys, motor, ballast ---------------- */
  const H0 = await H(() => window.__ogT.handles());
  { const s0 = await S(), a = H0.rail[2], dx = Math.cos(a), dy = Math.sin(a);
    await drag(H0.n[0], H0.n[1], H0.n[0] + dx * 50, H0.n[1] + dy * 50); const s1 = await S(), u1 = await U();
    rec(s1.d.LD > s0.d.LD + .05 && u1.LDv === 'L/D ' + s1.d.LD.toFixed(2), (mobile ? 'a finger' : 'the mouse') + ' drags the nose out: a longer nose', s0.d.LD + ' to ' + s1.d.LD + ', ' + u1.LDv);
    await step(2); const h1 = await H(() => window.__ogT.handles());
    await drag(h1.n[0], h1.n[1], h1.n[0] - dx * 600, h1.n[1] - dy * 600); const s2 = await S();
    rec(s2.d.LD === 1.5, 'dragged all the way in, the nose stops at L/D 1.50', String(s2.d.LD));
    await step(2); const h2 = await H(() => window.__ogT.handles());
    // the fins: out, away from the rail
    const nx = -Math.sin(a), ny = Math.cos(a), sg = Math.sign((h2.f[0] - h2.rail[0]) * nx + (h2.f[1] - h2.rail[1]) * ny) || 1;
    await drag(h2.f[0], h2.f[1], h2.f[0] + nx * sg * 400, h2.f[1] + ny * sg * 400); const s3 = await S(), u3 = await U();
    rec(s3.d.fin === 1.5 && u3.finv === '113 mm', 'the fins drag out to their biggest, 113 mm', s3.d.fin + ', ' + u3.finv);
    await step(2); const h3 = await H(() => window.__ogT.handles());
    await drag(h3.f[0], h3.f[1], h3.f[0] - nx * sg * 400, h3.f[1] - ny * sg * 400); const s4 = await S(), u4 = await U();
    rec(s4.d.fin === .6 && u4.finv === '45 mm', 'and in to their smallest, 45 mm', s4.d.fin + ', ' + u4.finv);
  }
  if (!mobile) { // the arrow keys on a focused handle
    await page.focus('#ogHN'); const a = await S(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp'); const b = await S();
    await page.focus('#ogHF'); await page.keyboard.press('ArrowRight'); const c = await S();
    rec(Math.abs(b.d.LD - a.d.LD - .1) < 1e-6 && Math.abs(c.d.fin - b.d.fin - .02) < 1e-6, 'the arrow keys step a focused handle', a.d.LD + ' to ' + b.d.LD + ', fins ' + b.d.fin + ' to ' + c.d.fin);
    await page.evaluate(() => document.activeElement.blur());
  }
  for (const m of ['F', 'H', 'G']) { await press('#ogMotor button[data-m=' + m + ']', 'motor ' + m); const s = await S(), u = await U();
    rec(s.d.motor === m && u.motor === m && u.mot.startsWith({ F: '42 N·s · 1.4 s', G: '58 N·s · 1.7 s', H: '80 N·s · 2.0 s' }[m]), 'the ' + m + ' motor button picks the ' + m + ' motor', u.mot); }
  { await press('#ogBm', 'less ballast'); const z = await S(); rec(z.d.bal === 0, 'ballast does not go below none', String(z.d.bal));
    for (let i = 0; i < 17; i++) await press('#ogBp', 'more ballast'); const s = await S(), u = await U();
    rec(s.d.bal === .15 && u.bal === '150 g', 'more ballast stops at 150 g', u.bal);
    for (let i = 0; i < 3; i++) await press('#ogBm', 'less ballast'); const s2 = await S(), u2 = await U();
    rec(s2.d.bal === .12 && u2.bal === '120 g', 'and less takes it off ten grams at a time', u2.bal); }
  // a design under 1 calibre is called unstable, one over 2.6 overstable
  await H(h => h.ST.og.dbg.set({ motor: 'G', LD: 1.5, fin: .6, bal: 0 })); { const u = await U(); rec(/unstable/.test(u.cls) && u.word === 'Unstable', 'a short nose, small fins and no ballast are called unstable', u.stab + ' ' + u.word); }
  await H(h => h.ST.og.dbg.set({ motor: 'F', LD: 4, fin: 1.5, bal: .15 })); { const u = await U(); rec(/overstable/.test(u.cls) && u.word === 'Overstable', 'a long nose, big fins and a lot of ballast are called overstable', u.stab + ' ' + u.word); }

  /* ---------------- a flight ---------------- */
  const sum = [];
  async function flight(o) {
    const tag = o.tag;
    if (o.design) await H((h, dd) => h.ST.og.dbg.set(dd), o.design);
    await step(2);
    const pre = await S(), u0 = await U();
    // launch, by the button or by Space
    if (o.launch === 'space') await page.keyboard.press('Space'); else await press('#ogLaunch', tag + ' Launch');
    { const s = await S(), u = await U(); rec(s.phase === 'arm' && u.launch === 'Cancel' && u.cancel, tag + ': ' + (o.launch === 'space' ? 'Space' : mobile ? 'a tap on Launch' : 'Launch') + ' takes the rocket to the pad, and the button turns to Cancel', s.phase + ' ' + u.launch); }
    // nothing about the design can change from here
    if (o.lockCheck) { await H(() => { const b = document.querySelector('#ogMotor button[data-m=F]'); b.click(); document.querySelector('#ogBp').click(); });
      const s = await S(); rec(JSON.stringify(s.d) === JSON.stringify(pre.d), tag + ': on the pad the motor and ballast cannot be changed', JSON.stringify(s.d)); }
    // the countdown: 3, 2, 1, then ignition
    const seen = [];
    for (let i = 0; i < 200; i++) { await step(3); const s = await S(); const n = await page.evaluate(() => document.querySelector('#ogCDn').textContent); if (n && seen[seen.length - 1] !== n) seen.push(n); if (s.phase === 'flight') break; if (o.cancel && s.phase === 'count' && seen.includes(o.cancelAt)) break; }
    if (o.cancel) {
      const before = await S();
      if (o.cancel === 'space') await page.keyboard.press('Space'); else if (o.cancel === 'escape') await page.keyboard.press('Escape'); else await press('#ogLaunch', tag + ' Cancel');
      const s = await S(); const caps = await H(() => window.__ogT.caps.slice(-1)[0]);
      rec(before.phase === 'count' && s.phase === 'disarm' && /Countdown cancelled/.test(caps || '') && (await H(h => h.S.mode)) === 'station', tag + ': ' + { space: 'Space', escape: 'Escape', button: mobile ? 'a tap on Cancel' : 'Cancel' }[o.cancel] + ' at T minus ' + o.cancelAt + ' calls the launch off, and stays in the station', before.phase + ' to ' + s.phase + ', ' + caps);
      await step(60); const s2 = await S(), u2 = await U(); rec(s2.phase === 'design' && u2.launch === 'Launch' && !u2.cancel && JSON.stringify(s2.d) === JSON.stringify(pre.d), tag + ': and the rocket comes back to the design, as it was', s2.phase + ' ' + u2.launch);
      return null;
    }
    rec(seen.join(',') === '3,2,1', tag + ': the countdown reads 3, 2, 1', seen.join(','));
    let s = await S(); if (s.phase !== 'flight') { rec(false, tag + ': the motor lights', JSON.stringify(s)); return null; }
    if (o.shots) { await step(20); await snapshot(P + 'ogive-' + o.id + '-launch'); }
    // the chute while the motor still burns: refused
    if (o.burning) { await step(8); const b = await S(); if (o.burning === 'space') await page.keyboard.press('Space'); else { const sp = await skySpot(); if (sp) await at(sp[0], sp[1]); }
      const a = await S(), pop = await H(() => window.__ogT.pops.join(','));
      rec(b.F.t < b.F.tb && !a.F.chute && /still burning/i.test(pop), tag + ': the chute while the motor burns is refused: Still burning', 'T+' + b.F.t + ', ' + pop); }
    // up to the moment it is opened
    if (o.chute === 'top') {
      await stepTo(d => d.F && d.NAT && !d.F.chute && d.F.t >= d.NAT.tApo - 1.0); const u = await U(); rec(/chute-ready/.test(u.cls) && /chute-now/.test(u.cls), tag + ': near the top the Open chute button comes up and beats', u.cls);
      if (o.layout) { await layoutCheck(tag + ', near the top (' + dev + ')'); await covered('#ogPrompt', tag + ', the chute button'); }
      if (o.shots) await snapshot(P + 'ogive-' + o.id + '-apogee');
      await stepTo(d => d.F.t >= d.NAT.tApo);
    } else if (o.chute === 'early') await stepTo(d => d.F.t >= d.F.D.M.tb + .2);
    else if (o.chute === 'never') { await stepTo(d => d.F.chute || d.F.landed); }
    s = await S();
    if (o.chute !== 'never') {
      if (o.how === 'space') await page.keyboard.press('Space'); else if (o.how === 'button') await press('#ogChute', tag + ' Open chute'); else { const sp = await skySpot(); if (sp) await at(sp[0], sp[1]); else rec(false, tag + ': a spot of open sky to tap'); }
      const a = await S(), cap = await H(() => window.__ogT.caps.slice(-1)[0]);
      if (o.chute === 'top') rec(a.F.chute && !a.F.torn && Math.abs(a.F.deployT - a.NAT.tApo) < .05 && /right at the top/i.test(cap), tag + ': ' + { space: 'Space', button: mobile ? 'a tap on Open chute' : 'Open chute', tap: mobile ? 'a tap on the sky' : 'a click on the sky' }[o.how] + ' at the top opens the chute, right at the top', 'deployed T+' + a.F.deployT + ' for apogee ' + a.NAT.tApo + ', ' + cap);
      else rec(a.F.chute && a.F.torn && /shredded/i.test(cap), tag + ': opened at ' + Math.round(s.F.vy) + ' m/s on the way up, the chute tears', cap);
    } else { const a = await S(), cap = await H(() => window.__ogT.caps.slice(-1)[0]); rec(a.F.chute && a.F.auto && Math.abs(a.F.deployT - a.NAT.tApo - 2.2) < .1 && /ejection charge/i.test(cap), tag + ': left alone, the motor\'s charge opens the chute late', 'T+' + a.F.deployT + ', apogee ' + a.NAT.tApo + ', ' + cap); }
    // a second press does nothing
    { const b = await S(); if (!mobile) await page.keyboard.press('Space'); else { const sp = await skySpot(); if (sp) await at(sp[0], sp[1]); } const a = await S(); rec(a.F.deployT === b.F.deployT && a.F.torn === b.F.torn, tag + ': a second press does not open it again', JSON.stringify({ b: b.F.deployT, a: a.F.deployT })); }
    // down under the canopy: the descent runs fast and lands
    await stepTo(d => d.F && d.F.chute && d.F.t > d.F.deployT + 6 || !d.F || d.F.landed, 3000);
    { const u = await page.evaluate(() => document.querySelector('#ogX').textContent), s2 = await S(); if (!s2.F.torn && s2.F.h > 60) rec(/Descent ×\d/.test(u) && s2.tScale > 1.6, tag + ': under the canopy the descent runs fast, and says so', u + ', ×' + s2.tScale); }
    if (o.shots) await snapshot(P + 'ogive-' + o.id + '-descent');
    const n = await stepTo(d => d.phase === 'landed', 12000); s = await S();
    const cap = await H(() => window.__ogT.caps.slice(-1)[0]);
    rec(s.phase === 'landed' && s.F.landed && s.F.h === 0 && /Touchdown/.test(cap), tag + ': it lands (' + Math.round(s.F.t) + ' s of flight), and says where', cap);
    await stepTo(() => window.__heloria.ST.og.state === 'res', 300);
    const e = await H((h, k) => window.__ogT.expectRes(k), o.n), r = await H(() => window.__ogT.res());
    const ok = r.g === e.grade && r.s === e.score && r.eb === e.eb && r.stats.Apogee === e.apo && r.stats['Off target'] === e.off && r.stats.Chute === e.chute && r.stats.Stability === e.stab && /\d+ m\/s/.test(r.stats['Max speed']) && /^\d+\.\d g$/.test(r.stats['Peak accel']);
    rec(ok, tag + ': the report: ' + r.g + ', ' + r.s + ', as the flight earned', ok ? r.stats.Apogee + ' for ' + s.target + ' m' : JSON.stringify({ want: e, got: r }));
    if (o.grade) rec(o.grade.test(r.g), tag + ': graded ' + r.g, r.p);
    const left = 3 - o.n; rec(r.again === (left > 0 ? 'Adjust and fly again · ' + left + ' left' : 'No flights left') && r.againOff === (left <= 0), tag + ': ' + r.again, String(r.againOff));
    sum.push({ tag, d: s.d, apo: s.F.apo, x: s.F.x, t: s.F.t, grade: r.g, score: r.s, offMax: await H(() => window.__ogT.offMax) });
    return r;
  }
  const again = async () => { await press('#ogAgain', 'Adjust and fly again'); await step(60); const s = await S(), u = await U(); return { s, u }; };

  // flight one: the starting design, the chute at the very top (Space on a desktop, a tap on the sky on a phone), after trying it while the motor burns
  await H(h => h.ST.og.dbg.set({ motor: 'G', LD: 2.5, fin: 1, bal: 0 })); await step(30);
  // a cancelled countdown first, by the button, then by Space (desktop) or a second tap
  await flight({ tag: 'cancel one', launch: mobile ? 'button' : 'space', cancel: 'button', cancelAt: '2', lockCheck: true });
  if (!mobile) await flight({ tag: 'cancel two', launch: 'button', cancel: 'space', cancelAt: '3' });
  const r1 = await flight({ tag: 'flight one', id: 'f1', n: 1, launch: 'button', burning: mobile ? 'tap' : 'space', chute: 'top', how: mobile ? 'tap' : 'space', shots: true, layout: true });
  await wait(1200); await covered('.st-og .res', 'the report (' + dev + ')'); await panelCheck('report', 'the report, ' + dev); await snapshot(P + 'ogive-f1-report');
  if (r1) rec(r1.nw === 'New best' && r1.best === 'Best ' + r1.s, 'the first flight\'s score is the new best', r1.nw + ', ' + r1.best);
  // flight two: the heaviest design, the Open chute button
  { const { s, u } = await again(); rec(s.phase === 'design' && u.tries === 'Flight 2 / 3' && s.state === 'play', 'Adjust and fly again goes back to the design for flight 2', u.tries); }
  await flight({ tag: 'flight two (heaviest: H, longest nose, biggest fins, 150 g)', id: 'f2', n: 2, design: { motor: 'H', LD: 4, fin: 1.5, bal: .15 }, launch: mobile ? 'button' : 'space', chute: 'top', how: 'button' });
  // flight three: the lightest, never opened
  await again();
  await flight({ tag: 'flight three (lightest: F, shortest nose, smallest fins, no ballast)', id: 'f3', n: 3, design: { motor: 'F', LD: 1.5, fin: .6, bal: 0 }, launch: 'button', chute: 'never', grade: /./ });
  { const b = await page.evaluate(() => document.querySelector('#ogAgain').disabled); await H(() => document.querySelector('#ogAgain').click()); const s = await S(); rec(b && s.state === 'res', 'after three flights there is no fourth on the same target', s.state); }
  { await press('#ogNewT', 'New target'); await step(60); const s = await S(), u = await U(); rec(s.phase === 'design' && u.tries === 'Flight 1 / 3' && u.target === s.target + ' m' && s.target >= 160 && s.target <= 440, 'New target starts again on flight 1 with a new target', u.target + ', ' + u.tries); }
  // an unstable rocket cartwheels; an overstable one flies; a torn chute
  await flight({ tag: 'flight four (unstable: it cartwheels)', id: 'f4', n: 1, design: { motor: 'H', LD: 1.5, fin: .6, bal: 0 }, launch: 'button', chute: 'top', how: 'tap', grade: /Cartwheeled/ });
  await again();
  await flight({ tag: 'flight five (opened on the way up)', id: 'f5', n: 2, design: { motor: 'G', LD: 2.5, fin: 1, bal: 0 }, launch: 'button', chute: 'early', how: mobile ? 'tap' : 'space', grade: /Chute shredded/ });
  await again();
  await flight({ tag: 'flight six (overstable)', id: 'f6', n: 3, design: { motor: 'G', LD: 4, fin: 1.5, bal: .1 }, launch: 'button', chute: 'top', how: 'button' });

  /* ---------------- Ask Ogive ---------------- */
  await press('#ogNewT', 'New target'); await step(60);
  { const tg = (await S()).target;
    await press('#ogAsk', 'Ask Ogive');
    const u = await U(); rec(/searching/.test(u.cls) && u.disabled, 'Ask Ogive searches, and Launch waits', u.cls + ', launch disabled ' + u.disabled);
    if (!mobile) { await page.keyboard.press('Space'); rec((await S()).phase === 'design', 'Space does not launch while Ogive is searching'); }
    { const m0 = (await S()).d.motor; await H(() => document.querySelector('#ogMotor button[data-m=' + (window.__heloria.ST.og.dbg.d.motor === 'F' ? 'H' : 'F') + ']').click());
      rec((await S()).d.motor === m0, 'the motor cannot be changed while Ogive is searching'); }
    const best0 = await page.evaluate(() => document.querySelector('#ogBest').textContent);
    await H(() => window.__ogT.freeze(false));
    const ok = await until(() => document.querySelector('.st-og').classList.contains('answered') && !document.querySelector('.st-og').classList.contains('searching'), null, 600000);
    await H(() => window.__ogT.freeze(true));
    const s = await S(), u2 = await U(), say = await page.evaluate(() => document.querySelector('#ogAI').textContent);
    rec(ok && /assisted/.test(u2.cls) && !u2.disabled && /Predicts \d+ m/.test(say), 'Ogive answers with a design and its predicted apogee, marked assisted', say);
    const pr = +/Predicts (\d+) m/.exec(say)[1];
    rec(Math.abs(pr - tg) <= 3, 'its prediction is within 3 m of the target', pr + ' for ' + tg);
    const r = await flight({ tag: 'flight seven (Ogive\'s design)', id: 'f7', n: 1, launch: 'button', chute: 'top', how: 'button' });
    if (r) rec(r.nw === 'Assisted' && Math.abs(+r.stats.Apogee.replace(/\D/g, '') - tg) <= 3, 'Ogive\'s design flies to its target, and the report says assisted', r.stats.Apogee + ' for ' + tg + ', ' + r.nw);
    if (r) rec(r.best === best0, 'an assisted flight does not set a best', best0 + ' then ' + r.best);
  }
  log('\nflights (' + dev + '):'); sum.forEach(x => log('  ' + JSON.stringify(x)));
  { const fl = await H(() => [...window.__ogT.flags.values()]); rec(fl.length === 0, 'in every flight: nothing that is not a number, the read-outs right, the rocket on the screen, and it lands', fl.join(' | ')); }

  /* ---------------- a drag held through the launch changes nothing ---------------- */
  await press('#ogAgain', 'Adjust and fly again'); await step(60);
  await H(h => { h.ST.og.dbg.set({ LD: 2.5 }); h.S.stSnap = true; }); await frames(2); await step(2);
  { const h0 = await H(() => window.__ogT.handles()), a = h0.rail[2], dx = Math.cos(a), dy = Math.sin(a); let mid, pre;
    await drag(h0.n[0], h0.n[1], h0.n[0] + dx * 12, h0.n[1] + dy * 12, async () => {
      pre = await S();
      if (mobile) await H(() => document.querySelector('#ogLaunch').click()); else await page.keyboard.press('Space');
      mid = await S();
      if (!mobile) for (let i = 1; i <= 4; i++) await page.mouse.move(h0.n[0] + dx * (12 + i * 12), h0.n[1] + dy * (12 + i * 12));
      else for (let i = 1; i <= 4; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: h0.n[0] + dx * (12 + i * 12), y: h0.n[1] + dy * (12 + i * 12), id: 1 }] }); });
    const s = await S();
    rec(pre.d.LD > 2.5 && pre.d.LD < 4 && mid.phase === 'arm' && s.d.LD === mid.d.LD, 'a drag still held once the rocket goes to the pad no longer changes the design', '2.5, dragged to ' + pre.d.LD + ', launched at ' + mid.d.LD + ', then ' + s.d.LD);
    await press('#ogLaunch', 'Cancel'); await step(60); }

  /* ---------------- leaving ---------------- */
  if (!mobile) { // Escape in a countdown cancels it; Escape in flight leaves
    await press('#ogLaunch', 'Launch'); await step(80); const c = await S(); await page.keyboard.press('Escape'); const s = await S();
    rec(c.phase === 'count' && s.phase === 'disarm' && (await H(h => h.S.mode)) === 'station', 'Escape in the countdown calls it off without leaving', c.phase + ' to ' + s.phase);
    await step(60); await press('#ogLaunch', 'Launch'); await stepTo(d => d.phase === 'flight' && d.F.t > 3, 600);
    await page.keyboard.press('Escape'); rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Escape in flight leaves for orbit');
    rec(await H(h => h.ST.og.dbg.phase === 'design' && !h.ST.og.dbg.F), 'and the flight is put away');
    await H(() => window.__ogT.freeze(false)); await wait(1500); await H(h => h.jump('og')); await wait(2500); await H(() => window.__ogT.freeze(true));
    await press('.st-og .go [data-play]', 'Play'); await step(30);
  }
  await press('#ogLaunch', 'Launch'); await stepTo(d => d.phase === 'flight' && d.F.t > 4, 600);
  await press('#back', 'the Orbit button in flight');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'the Orbit button leaves in flight');
  rec(await H(h => h.ST.og.dbg.phase === 'design' && !h.ST.og.dbg.F), 'and the flight is put away');
  await H(() => window.__ogT.freeze(false)); await wait(1500); await H(h => h.jump('og')); await wait(2500);
  { await H(() => window.__ogT.freeze(true)); await press('.st-og .go [data-play]', 'Play'); await step(30); const s = await S(); rec(s.phase === 'design' && s.d.motor === 'G' && s.d.LD === 2.5 && s.d.bal === 0, 'Play after leaving starts clean'); }
  await H(h => { h.ST.og.abort(); h.ST.og.setState('menu'); });

  /* ---------------- other screens ---------------- */
  const sizes = mobile ? [[390, 844], [375, 667], [844, 390], [667, 375], [740, 360]] : [[1024, 700], [1366, 657], [768, 1024], [1024, 768], [900, 960], [800, 700]];
  for (const [w, hh] of sizes) {
    const tag = w + 'x' + hh;
    await H(() => window.__ogT.freeze(false));
    await page.setViewportSize({ width: w, height: hh }); await wait(1200);
    await H(h => h.jump('og')); await wait(2000);
    await covered('.st-og .go', 'the title, ' + tag); await panelCheck('title', 'the title, ' + tag);
    await H(() => window.__ogT.freeze(true));
    await press('.st-og .go [data-play]', 'Play, ' + tag); await step(40); await H(h => { h.S.stSnap = true; }); await frames(2); await step(2);
    const side = hh <= 520 && w / hh >= .9;
    for (const dd of [{ motor: 'G', LD: 2.5, fin: 1, bal: 0 }, { motor: 'H', LD: 4, fin: 1.5, bal: .15 }, { motor: 'F', LD: 1.5, fin: .6, bal: 0 }]) {
      await H((h, x) => h.ST.og.dbg.set(x), dd); await step(12);
      await covered('.st-og .ghud', 'the design view, ' + tag + ', L/D ' + dd.LD + ' fins ' + dd.fin); await layoutCheck('the design view, ' + tag + ', L/D ' + dd.LD + ' fins ' + dd.fin);
    }
    await H(h => h.ST.og.dbg.set({ motor: 'G', LD: 2.5, fin: 1, bal: 0 })); await step(12);
    await snapshot(P + 'ogive-' + tag + '-design');
    await press('#ogLaunch', 'Launch, ' + tag); await stepTo(d => d.phase === 'count', 200); await step(20); await layoutCheck('the countdown, ' + tag);
    if (side) await snapshot(P + 'ogive-' + tag + '-count');
    await stepTo(d => d.F && d.NAT && d.F.t >= d.NAT.tApo - .6, 3000); await layoutCheck('near the top, ' + tag); await covered('#ogPrompt', 'the chute button, ' + tag);
    await snapshot(P + 'ogive-' + tag + '-apogee');
    await stepTo(d => d.F.t >= d.NAT.tApo, 300); await press('#ogChute', 'Open chute, ' + tag);
    await stepTo(d => d.F.chute && d.F.t > d.F.deployT + 3, 600); await layoutCheck('under the chute, ' + tag);
    await stepTo(() => window.__heloria.ST.og.state === 'res', 12000);
    await H(() => window.__ogT.freeze(false)); await wait(1500);
    await covered('.st-og .res', 'the report, ' + tag); await panelCheck('report', 'the report, ' + tag);
    if (side) await snapshot(P + 'ogive-' + tag + '-report');
    await press('.st-og .res [data-back]', 'Back to orbit, ' + tag);
    rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Back to orbit leaves, ' + tag);
    await wait(1200);
  }
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
  await H(() => window.__ogT.freeze(false));
  { const fl = await H(() => [...window.__ogT.flags.values()]); rec(fl.length === 0, 'nothing went wrong in the flights on the other screens either', fl.join(' | ')); }

  const fails = results.filter(r => !r.ok);
  log('\nOGIVE (' + dev + '): ' + (results.length - fails.length) + ' of ' + results.length + ' passed, ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  fails.forEach(f => log('  FAIL ' + f.name + (f.detail ? '  (' + f.detail + ')' : '')));
};

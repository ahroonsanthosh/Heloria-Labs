/* Lost Signal, played properly from the real Play button to the results, on a desktop or a phone:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/pharos --scenario untamed/test/pharos.cjs [--mobile]
   (a build of Pharos alone is quicker: python3 untamed/build.py --only ph --single /tmp/x/ph.html --inline-three)
   Headless frames are slow, so the station's clock is frozen and stepped by hand, 1/30 s at a time, between real inputs:
   clicks and taps on the map and on the camera, a finger dragged over the map, the arrow keys, Enter and Space, the Next
   button. Every guess is aimed at a spot of the map worked out from the truth, and the game's own reading of the screen
   must give that spot back; then the verdict, the points, the distance shown, the markers and the correlation surface are
   checked against it (the surface's brightest point on the screen must stand on the truth). Game one is played to win, by
   watching the pipeline or skipping it, from a quick click to a slow one. Game two guesses wild: off the map (refused), at
   the map's edge, at a corner of the screen, at the spoofed GNSS fix, far off and very late. Play again must start clean, the
   results must add up, and Back to orbit, the Orbit button, Escape and Enter on the title are checked. Then the page is
   resized in the middle of a fix (the camera must still show its frame), and the layout is checked on other screens: on a
   desktop 1024 x 700 played through five fixes to the results, a tall window and 1920 x 1080 through one; with --mobile a
   phone held sideways (844 x 390, 667 x 375) and an iPad held sideways through five, an iPad upright through one.
   It ends on a line PHAROS (desktop|phone): N of M passed. */
const results = [];
function rec(ok, name, detail) { results.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); }

module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '', dev = mobile ? 'phone' : 'desktop', MAP = 1024, MPX = 2, RMAX = 186, ROUNDS = 5;
  const until = (fn, arg, t = 60000) => page.waitForFunction(fn, arg, { timeout: t, polling: 250 }).then(() => true).catch(() => false);
  const frames = (n = 2) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const snapshot = async name => { await frames(2); await shot(name); };
  const at = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const press = async (sel, name) => {
    const look = () => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return { err: 'not found' }; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return { err: 'not shown' };
      const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { err: 'off the screen' };
      const top = document.elementFromPoint(x, y); if (!top || !(top === e || e.contains(top))) return { err: 'covered by ' + (top ? (top.id || String(top.className) || top.tagName) : 'nothing') }; return { x, y }; }, sel);
    let p = await look(); for (let k = 0; k < 4 && p.err; k++) { await frames(2); p = await look(); }
    if (p.err) { rec(false, (name || sel) + ' can be pressed', p.err); return false; }
    await at(p.x, p.y); return true;
  };
  const covered = async (scope, label) => {
    await frames(2);
    const bad = await page.evaluate(scope => { const out = []; const root = document.querySelector(scope); if (!root) return ['scope missing ' + scope];
      root.querySelectorAll('button,a[href],[data-play],[data-back]').forEach(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none') return;
        let p = el; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.opacity === '0' || s.display === 'none') return; p = p.parentElement; }
        const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { out.push((el.id || el.className) + ' off the screen'); return; }
        const top = document.elementFromPoint(x, y); if (!top || !(top === el || el.contains(top))) out.push((el.id || el.className) + ' covered by ' + (top ? (top.id || top.className || top.tagName) : 'nothing')); });
      return out; }, scope);
    rec(bad.length === 0, 'nothing covers the buttons: ' + label, bad.join('; '));
  };

  await H(h => h.jump('ph')); await wait(2500);
  /* the helpers that live in the page: the stepped clock, a watcher run after every step for anything stuck or not a
     number, the layout check, and the reading of the screen. They look; the scenario acts through the real inputs */
  await H(h => {
    const st = h.ST.ph, d = st._dbg, sc = st.scene, orig = st.update, uni = o => o.material && o.material.uniforms;
    const plane = sc.children.find(o => o.isMesh && uni(o) && uni(o).uHover), lat = sc.children.find(o => o.isPoints && uni(o) && uni(o).uLift),
      mesh = sc.children.find(o => o.isLineSegments && uni(o) && uni(o).uLift), beam = sc.children.find(o => o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry');
    const T = window.__phT = { paused: false, hold: false, clk: 0, flags: new Map(), orig, U: uni(plane), lat, mesh, beam, latU: uni(lat), ph: null,
      flag(k, m) { if (!T.flags.has(k)) T.flags.set(k, m); },
      step(n, stop) { for (let i = 0; i < n; i++) { T.clk += 1 / 30; h.S.t += 1 / 30; orig.call(st, 1 / 30, h.S.t); T.watch(); if (stop && stop()) break; } },
      still() { orig.call(st, 0, h.S.t); },   // a step of no time: everything on the screen placed for the camera as it is now
      watch() {
        const F = d.F, g = d.game, U = T.U, c = T.clk;
        for (const k of ['uCirc', 'uHover', 'uFoot', 'uHeat', 'uWave', 'uLock', 'uShadow']) { const v = U[k].value; if (![v.x, v.y, v.z, v.w === undefined ? 0 : v.w].every(Number.isFinite)) T.flag('u' + k, 'the map\'s ' + k + ' is not a number'); }
        if (!Number.isFinite(T.latU.uLift.value)) T.flag('lift', 'the surface\'s lift is not a number');
        if (!F || !g) { T.ph = null; return; }
        if (![F.R, F.shownR, F.t, F.ft, F.rt, F.st].every(Number.isFinite)) T.flag('nanF' + F.r, 'fix ' + F.r + ' has a timer or radius that is not a number');
        if (F.R > RMAX_ + 1e-6 || F.R < F.R0 - 1e-6) T.flag('R' + F.r, 'fix ' + F.r + ' search radius ' + F.R.toFixed(1) + ' outside ' + F.R0 + '..' + RMAX_);
        const s = document.querySelector('#phScore').textContent, u = document.querySelector('#phUnc').textContent, r = document.querySelector('#phRound').textContent;
        if (!/^\d{1,3}(,\d{3})*$/.test(s)) T.flag('sc' + s, 'the score reads ' + s);
        if (!/^± \d+ m$/.test(u) || document.querySelector('#phRing').textContent !== u) T.flag('unc' + u, 'the uncertainty reads ' + u + ' and the ring ' + document.querySelector('#phRing').textContent);
        if (r !== 'Fix ' + F.r + ' / 5') T.flag('rd' + r, 'the fix counter reads ' + r + ' in fix ' + F.r);
        for (const m of document.querySelectorAll('.st-ph .mk')) if (/NaN|Infinity/.test(m.style.transform)) T.flag('mk' + m.id, m.id + ' is placed at ' + m.style.transform);
        if (!T.ph || T.ph.F !== F || T.ph.phase !== F.phase) T.ph = { F, phase: F.phase, t0: c };
        const age = c - T.ph.t0, lim = { feed: F.dur.reduce((a, b) => a + b, 0) + .3, reveal: 7.4, out: .7 }[F.phase];
        if (lim && age > lim) T.flag('stuck' + F.r + F.phase, 'fix ' + F.r + ' stuck in ' + F.phase + ' for ' + age.toFixed(1) + ' s');
      },
      // a spot of the map on the screen: where it is, whether a click there reaches the map, and what the game reads back
      spot(px, py) { const s = d.m2s(px, py), p = d.pick(s.x, s.y);
        return { x: s.x, y: s.y, back: p.ok ? [p.px, p.py] : null, free: T.freeAt(s.x, s.y) && s.x > 6 && s.y > 6 && s.x < innerWidth - 6 && s.y < innerHeight - 6 }; },
      /* the map at this point and all round it: a fingertip a few pixels from a control is taken by that control (the browser's
         own touch adjustment), so a guess is never aimed that close to the HUD */
      freeAt(x, y) { for (const [dx, dy] of [[0, 0], [14, 0], [-14, 0], [0, 14], [0, -14], [10, 10], [-10, 10], [10, -10], [-10, -10]]) { const e = document.elementFromPoint(x + dx, y + dy); if (e && e.id !== 'gl') return false; } const e = document.elementFromPoint(x, y); return !!e && e.id === 'gl'; },
      aim() { T.still(); const v = T.U.uHover.value; return { x: v.x * MAP_, y: v.y * MAP_, on: v.w }; },
      // the HUD now: what must not overlap, what must stay on the screen and be readable, and the search circle clear of it all
      layout(o) {
        o = o || {}; const F = d.F, q = s => document.querySelector(s), vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
          for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
        const box = (n, e) => { const r = e.getBoundingClientRect(); return { n, l: r.left, t: r.top, r: r.right, b: r.bottom }; };
        const parts = [['fix counter', '.st-ph .gtl'], ['score', '.st-ph .gtr'], ['camera', '#phF'], ['help', '#phHelp'], ['keys', '#phKeys'], ['next', '#phNext'], ['orbit button', '#back'], ['brand', '#chrome .brand']];
        const B = parts.filter(([, s]) => vis(q(s))).map(([n, s]) => box(n, q(s))), bad = [];
        for (const b of B) if (b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) bad.push(b.n + ' runs off the screen');
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j];
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 4 && oy > 4) bad.push(a.n + ' overlaps ' + b.n + ' by ' + Math.round(Math.min(ox, oy)) + ' px'); }   // (4 px: a line of text's own leading)
        // inside the camera panel: the two lines of telemetry, and every piece of text within the panel
        const t1 = q('#phTele'), t2 = q('#phTele2'); if (vis(t1) && vis(t2)) { const a = t1.getBoundingClientRect(), b = t2.getBoundingClientRect(); if (a.right > b.left - 4 && a.bottom > b.top && b.bottom > a.top) bad.push('the camera\'s two lines of telemetry run into each other'); }
        const fb = q('#phF').getBoundingClientRect();
        for (const e of q('#phF').querySelectorAll('.hd span,.t1,.t2,.stg li,.fcap')) if (vis(e)) { const r = e.getBoundingClientRect(); if (r.left < fb.left - 1 || r.right > fb.right + 1 || r.bottom > fb.bottom + 1) bad.push((e.id || e.className || e.tagName) + ' sticks out of the camera panel'); }
        for (const e of [q('#phHelp'), q('#phCap'), q('#phUncL'), q('#phNext')]) if (vis(e) && e.scrollWidth > e.clientWidth + 1) bad.push((e.id || e.className) + ' text is wider than its box');
        const solid = B.filter(b => b.n !== 'brand');
        if (F && (F.phase === 'aim' || o.circle)) {
          // the circle at the size it grows to, on the ground; a tap must reach all of it
          const ring = []; for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, s = d.m2s(F.cx + Math.cos(a) * RMAX_, F.cy + Math.sin(a) * RMAX_); ring.push([s.x, s.y]); }
          const under = new Set(); for (const [x, y] of ring) for (const b of solid) if (x > b.l && x < b.r && y > b.t && y < b.b) under.add(b.n);
          const n = ring.filter(([x, y]) => solid.some(b => x > b.l && x < b.r && y > b.t && y < b.b)).length;
          if (n > 0) bad.push(n + ' of 48 points on the edge of the search circle are under the ' + [...under].join(', '));
          const off = ring.filter(([x, y]) => x < 2 || y < 2 || x > innerWidth - 2 || y > innerHeight - 2).length; if (off) bad.push(off + ' of 48 points on the edge of the search circle are off the screen');
          const tr = d.m2s(F.x, F.y); for (const b of solid) if (tr.x > b.l - 4 && tr.x < b.r + 4 && tr.y > b.t - 4 && tr.y < b.b + 4) bad.push('the true position is under the ' + b.n);
          const rg = q('#phRing'); if (vis(rg)) { const r = box('ring label', rg); for (const b of solid) { const ox = Math.min(r.r, b.r) - Math.max(r.l, b.l), oy = Math.min(r.b, b.b) - Math.max(r.t, b.t); if (ox > 1 && oy > 1) bad.push('the circle\'s label is under the ' + b.n); } if (r.t < 0 || r.l < 0 || r.r > innerWidth) bad.push('the circle\'s label is off the screen'); }
          T.lastRing = ring.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]).map(Math.round);
        }
        if (o.reveal) for (const id of ['#phDist', '#phTru']) { const e = q(id); if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) bad.push(id + ' runs off the screen');
          for (const b of solid) { const ox = Math.min(r.right, b.r) - Math.max(r.left, b.l), oy = Math.min(r.bottom, b.b) - Math.max(r.top, b.t); if (ox > 1 && oy > 1) bad.push(id + ' sits on the ' + b.n); } }
        const small = [...document.querySelectorAll('.st-ph .ghud *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 8).map(e => e.id || e.className || e.tagName);
        if (small.length) bad.push('text under 8 px: ' + [...new Set(small)].join(', '));
        return { bad, ring: T.lastRing, boxes: B.map(b => b.n + ' ' + [b.l, b.t, b.r, b.b].map(Math.round).join(',')) };
      },
      // the title: the words, the side notes and the buttons apart from each other and on the screen
      title() { const q = s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && getComputedStyle(e).display !== 'none' && getComputedStyle(e.closest('.notes') || e).display !== 'none'; });
        const B = [...q('.st-ph .card .lede'), ...q('.st-ph .card h2'), ...q('.st-ph .go'), ...q('.st-ph .notes .note'), ...q('#back')].map(e => { const r = e.getBoundingClientRect(); return { n: e.id || e.className.split(' ')[0] || e.tagName, l: r.left, t: r.top, r: r.right, b: r.bottom }; }), bad = [];
        for (const b of B) if (b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) bad.push(b.n + ' runs off the screen');
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 1 && oy > 1) bad.push(a.n + ' overlaps ' + b.n); }
        return bad; },
      // the results: on the screen, nothing scrolled out of sight, nothing wider than the panel
      res() { const e = document.querySelector('.st-ph .res'), r = e.getBoundingClientRect(), bad = [];
        if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) bad.push('the panel runs off the screen');
        if (e.scrollHeight > e.clientHeight + 1) bad.push('the panel scrolls (' + e.scrollHeight + ' of ' + e.clientHeight + ' px)');
        for (const x of e.querySelectorAll('.grade,.score,.fx li,.stats div,p,.acts .btn')) { const b = x.getBoundingClientRect(); if (b.right > r.right + 1 || b.left < r.left - 1) bad.push((x.id || x.className || x.tagName) + ' wider than the panel'); }
        return bad; },
      // the correlation surface as it is drawn: with the HUD and the beam, footprint and ring put aside for a moment, the
      // brightest patch inside the circle on a screenshot is found by the scenario; this gives the truth's foot and top
      surfaceOn(on) { const g = document.querySelector('.st-ph .ghud'), ch = document.querySelector('#chrome'), bk = document.querySelector('#back');
        if (on) { T.hold = true; const vis = T.lat.visible && T.mesh.visible; T.sv = [T.U.uFoot.value.w, T.U.uLock.value.w, sc.children.map(o => o.visible)]; T.U.uFoot.value.w = 0; T.U.uLock.value.w = 0;
          sc.children.forEach(o => { if (o !== plane && o !== lat && o !== mesh) o.visible = false; }); [g, ch, bk].forEach(e => e.style.visibility = 'hidden'); return vis; }
        T.U.uFoot.value.w = T.sv[0]; T.U.uLock.value.w = T.sv[1]; sc.children.forEach((o, i) => { o.visible = T.sv[2][i]; }); [g, ch, bk].forEach(e => e.style.visibility = ''); T.hold = false; },
      surfaceAt() { const F = d.F, k = (F.tj / 2) * 48 + F.ti / 2, y = T.lat.geometry.attributes.aH.array[k], V = new T.beam.position.constructor(), W = (F.x / MAP_ - .5) * 12, Z = (F.y / MAP_ - .5) * 12;
        const pr = v => [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight], ring = [];
        for (let a = 0; a < 48; a++) { const s = d.m2s(F.cx + Math.cos(a / 48 * Math.PI * 2) * F.R, F.cy + Math.sin(a / 48 * Math.PI * 2) * F.R); ring.push([s.x, s.y]); }
        return { foot: pr(V.set(W, y, Z).project(h.stCam)), top: pr(V.set(W, y + .012 + T.latU.uLift.value, Z).project(h.stCam)), lift: T.latU.uLift.value, heat: T.U.uHeat.value.w,
          ring: ring.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]).map(Math.round) }; },
      // the heat Pharos computed, as it was sent to the map and to the lattice: where its peak is, against the truth
      heat() { const F = d.F, D = T.U.tHeat.value.image.data, N = 96; let pk = -1, pi = 0; for (let k = 0; k < N * N; k++) if (D[k * 4] > pk) { pk = D[k * 4]; pi = k; }
        const a = T.lat.geometry.attributes.aV.array; let lm = -1, li = 0; for (let k = 0; k < a.length; k++) if (a[k] > lm) { lm = a[k]; li = k; }
        return { peak: [pi % N, (pi / N) | 0], truth: [F.ti, F.tj], atTruth: D[(F.tj * N + F.ti) * 4], latPeak: [li % 48, (li / 48) | 0], latTruth: a[(F.tj / 2) * 48 + F.ti / 2], ok: F.ok, tv: F.tv, second: F.second }; },
    };
    const RMAX_ = 186, MAP_ = 1024;
    st.update = function (dt, t) { if (T.hold) return; return orig.call(this, T.paused ? 0 : dt, t); };
    T.paused = true;   // from here on the station's clock moves only when the scenario steps it
  });

  const F_ = () => H(h => { const d = h.ST.ph._dbg, F = d.F, g = d.game; if (!F) return null;
    return { r: F.r, phase: F.phase, stage: F.stage, st: F.st, x: F.x, y: F.y, cx: F.cx, cy: F.cy, R: F.R, R0: F.R0, t: F.t, ft: F.ft, rt: F.rt, px: F.px, py: F.py, err: F.err, v: F.v, pts: F.pts, lock: F.lock, spoof: !!F.spoof, sx: F.sx, sy: F.sy, ok: F.ok,
      game: g && { r: g.r, score: g.score, from: g.from, trusted: g.trusted, close: g.close, wrong: g.wrong, spoofed: g.spoofed, gnss: g.gnss, list: g.list.length } }; });
  const hud = () => page.evaluate(() => { const t = s => document.querySelector(s).textContent; return { round: t('#phRound'), unc: t('#phUnc'), uncL: t('#phUncL'), score: t('#phScore'), help: t('#phHelp'), keys: t('#phKeys'), cap: t('#phCap'), tele: t('#phTele'), tele2: t('#phTele2'),
    next: document.querySelector('#phNext').classList.contains('on') ? t('#phNext').trim() : '', dist: document.querySelector('#phDist').classList.contains('on') ? t('#phDist') : '', stage: [...document.querySelectorAll('.st-ph .stg li')].findIndex(l => l.classList.contains('on')),
    marks: ['phRing', 'phGnss', 'phClk', 'phTru', 'phLn', 'phDist'].filter(i => document.querySelector('#' + i).classList.contains('on')), aim: document.querySelector('#phF').classList.contains('aim') }; });
  const step = (n, stop) => H((h, a) => window.__phT.step(a.n, a.stop ? new Function('return (' + a.stop + ')()') : null), { n, stop: stop ? stop.toString() : null });
  const settle = async () => { await H(h => { window.__phT.still(); h.S.stSnap = true; }); await frames(2); };
  const layoutCheck = async (label, o) => { const L = await H((h, o) => window.__phT.layout(o), o || {}); rec(L.bad.length === 0, 'layout, ' + label + ': nothing overlaps, everything readable and on the screen', L.bad.join('; ') || ('circle ' + (L.ring || []).join(','))); if (L.bad.length) log('  boxes: ' + L.boxes.join(' | ') + (L.ring ? ' | circle ' + L.ring.join(',') : '')); return L; };
  const flags = () => H(() => [...window.__phT.flags.values()]);
  // the menu gets its first fix ready in the background; let it finish so Play does not have to
  const ready = () => step(600, () => { const d = window.__heloria.ST.ph._dbg, j = d.jobs; return !!d.pend && !j.prep && !j.map && !j.scan; });

  /* one fix, start to finish. plan: feed 'watch' | 'space' | 'box'; how 'click' | 'tap' | 'drag' | 'keys'; target 'truth' |
     'close' | 'wild' | 'edge' | 'corner' | 'spoof'; wait (seconds of aiming first); off (first try a spot off the map and
     a click on the camera, which must be refused); next 'button' | 'space' | 'enter' | 'auto' */
  const book = [];   // every committed fix, as the scenario saw it, to check the results against
  async function playFix(plan, tag) {
    let F = await F_(); const r = F.r, name = tag + ' fix ' + r, tf0 = Date.now();
    const h0 = await hud();
    rec(F.phase === 'feed' && F.stage === 0 && h0.round === 'Fix ' + r + ' / 5' && h0.stage === 0 && !h0.next && !h0.aim, name + ' opens on the raw frame, counter Fix ' + r + ' / 5', JSON.stringify({ phase: F.phase, stage: F.stage, round: h0.round, marks: h0.marks }));
    // (150 px in from the edge, snapped down to the 4 px grid)
    rec(F.x >= 147 && F.x <= MAP - 150 && F.y >= 147 && F.y <= MAP - 150 && Math.hypot(F.x - F.cx, F.y - F.cy) < F.R0 * .74 + 1, name + ': the drone is on the map and inside the search circle', JSON.stringify({ x: F.x, y: F.y, cx: F.cx, cy: F.cy, R0: F.R0 }));
    rec(F.spoof === (h0.marks.includes('phGnss')) && (F.spoof ? /GNSS reports/.test(h0.uncL) : /GPS jammed/.test(h0.uncL)), name + ': the GNSS fix shows only when there is one' + (F.spoof ? ' (there is)' : ''), h0.uncL);
    // the pipeline
    if (plan.feed === 'watch') {
      const dur = r === 1 ? [1.3, 1.3, 1.15] : [.8, .85, .75], seen = [];
      for (let s = 0; s < 3; s++) { const n = await H((h, s) => { const T = window.__phT, F = h.ST.ph._dbg.F; let k = 0; while (F.phase === 'feed' && F.stage === s && k < 200) { T.step(1); k++; } return k; }, s); seen.push(n);
        const hh = await hud(); if (s < 2) rec(hh.stage === s + 1 && (s + 1 < 2 || /North up/.test(hh.tele)), name + ': stage ' + (s + 2) + ' of the pipeline lights after ' + (n / 30).toFixed(2) + ' s', hh.tele + ' | ' + (hh.cap || hh.help)); }
      seen[0] += Math.round(F.st * 30);   // (any time the first stage had already run before this was called)
      rec(seen.every((n, i) => Math.abs(n / 30 - dur[i]) <= 1.5 / 30), name + ': the pipeline keeps its timing', seen.map(n => (n / 30).toFixed(2)).join(' ') + ' s against ' + dur.join(' '));
    } else if (plan.feed === 'space') { await page.keyboard.press('Space'); }
    else { await step(4); await press('#phBox', 'the camera, to skip'); }
    F = await F_(); const h1 = await hud();
    rec(F.phase === 'aim' && F.stage === 3 && F.t < .05 && h1.stage === 3 && h1.marks.includes('phRing') && h1.aim && (mobile ? /^Drag the square/ : /^Move the square/).test(h1.help),
      name + ': ' + ({ watch: 'the pipeline runs into', space: 'Space skips to', box: (mobile ? 'a tap' : 'a click') + ' on the camera skips to' })[plan.feed] + ' the match', JSON.stringify({ phase: F.phase, t: F.t, help: h1.help, marks: h1.marks }));
    await settle();
    if (plan.layout) await layoutCheck(name + ' while matching, ' + plan.layout);
    if (plan.shot) await snapshot(P + 'pharos-' + plan.shot + '-aim');
    if (plan.wait) { await step(Math.round(plan.wait * 30)); await settle(); const f = await F_(), hh = await hud(), want = Math.round(Math.min(RMAX, f.R0 + plan.wait * 3.2) * MPX / 2) * 2;
      rec(Math.abs(f.t - plan.wait) < .05 && hh.unc === '± ' + want + ' m', name + ': after ' + plan.wait + ' s the uncertainty has grown to ± ' + want + ' m' + (want >= RMAX * MPX ? ', and no further' : ''), hh.unc);
      if (plan.shot) { await H(() => window.__phT.aim()); await snapshot(P + 'pharos-' + plan.shot + '-late'); } }
    // refused: a spot off the map, and the camera panel
    if (plan.off) {
      const pre = await F_();
      const o = await H(() => { const d = window.__heloria.ST.ph._dbg, T = window.__phT, off = (x, y) => T.freeAt(x, y) && !d.pick(x, y).ok;
        for (let y = 8; y < innerHeight - 8; y += 10) for (let x = 8; x < innerWidth - 8; x += 10) if (off(x, y) && off(x - 4, y - 4) && off(x + 4, y + 4) && off(x - 4, y + 4) && off(x + 4, y - 4)) return { x, y }; return null; });
      if (o) { await at(o.x, o.y); await step(1); const f = await F_(); rec(f.phase === 'aim' && f.game.list === pre.game.list, name + ': ' + (mobile ? 'a tap' : 'a click') + ' off the map is refused', JSON.stringify({ at: [o.x, o.y], phase: f.phase })); }
      else rec(true, name + ': no part of the screen shows anything but the map here, so there is nothing off it to try');
      await press('#phBox', 'the camera while matching');
      await step(1); const f = await F_(); rec(f.phase === 'aim' && f.game.list === pre.game.list, name + ': ' + (mobile ? 'a tap' : 'a click') + ' on the camera while matching does not guess there', f.phase);
      await settle();
    }
    // where to guess
    const tgt = await H((h, a) => {
      const MAP_ = 1024, d = h.ST.ph._dbg, T = window.__phT, F = d.F, sp = F.spoof ? d.spoof() : null, ok = (x, y) => { const s = T.spot(x, y); return s.free && s.back && Math.hypot(s.back[0] - x, s.back[1] - y) < 2 ? s : null; };
      const farSpoof = (x, y) => !sp || Math.hypot(x - sp[0], y - sp[1]) * 2 > 70;
      if (a === 'truth') return { px: F.x, py: F.y, s: ok(F.x, F.y) };
      if (a === 'spoof') return sp ? { px: sp[0], py: sp[1], s: ok(sp[0], sp[1]) } : null;
      if (a === 'close') for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2, x = F.x + Math.cos(an) * 20, y = F.y + Math.sin(an) * 20, s = ok(x, y); if (s && farSpoof(x, y)) return { px: x, py: y, s }; }
      if (a === 'wild') for (const rr of [170, 150, 130, 110, 90]) for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2, x = F.x + Math.cos(an) * rr, y = F.y + Math.sin(an) * rr; if (x < 0 || y < 0 || x > MAP_ || y > MAP_) continue; const s = ok(x, y); if (s && farSpoof(x, y)) return { px: x, py: y, s }; }
      if (a === 'edge' || a === 'corner') { // the map's own edge if it is on the screen, else the screen's corner
        let best = null; for (let y = 8; y < innerHeight - 8; y += 6) for (let x = 8; x < innerWidth - 8; x += 6) { if (!T.freeAt(x, y)) continue; const p = d.pick(x, y); if (!p.ok) continue;
          const e = a === 'edge' ? Math.min(p.px, p.py, MAP_ - p.px, MAP_ - p.py) : Math.min(Math.hypot(x, y), Math.hypot(innerWidth - x, y), Math.hypot(x, innerHeight - y), Math.hypot(innerWidth - x, innerHeight - y));
          if (a === 'edge' && e < 3) continue;   // (just inside the edge: a tap is rounded to the pixel and must not fall off it)
          if (!best || e < best.e) best = { e, px: p.px, py: p.py, x, y }; }
        if (best && farSpoof(best.px, best.py)) return { px: best.px, py: best.py, s: { x: best.x, y: best.y, back: [best.px, best.py], free: true }, e: best.e }; }
      return null;
    }, plan.target);
    if (!tgt || !tgt.s) { rec(false, name + ': a clear spot on the screen to guess at (' + plan.target + ')', JSON.stringify(tgt)); return false; }
    if (plan.target === 'edge' || plan.target === 'corner') log('  ' + name + ': the ' + (plan.target === 'edge' ? 'map\'s edge' : 'screen\'s corner') + ' is ' + tgt.e.toFixed(1) + ' px from the spot guessed at (' + tgt.px.toFixed(0) + ', ' + tgt.py.toFixed(0) + ' on the map, ' + tgt.s.x.toFixed(0) + ', ' + tgt.s.y.toFixed(0) + ' on the screen)');
    const pre = await F_(), score0 = pre.game.score;
    // the guess, by the plan's input
    if (plan.how === 'click' || plan.how === 'tap') {
      if (!mobile) { // the square follows the mouse over the map, and hides over the camera
        const mid = await H(() => { const d = window.__heloria.ST.ph._dbg, F = d.F, T = window.__phT, s = T.spot(F.cx, F.cy); return s.free ? s : null; });
        if (mid && plan.hover) { await page.mouse.move(mid.x, mid.y); await step(8); const a = await H(() => window.__phT.aim());
          rec(Math.hypot(a.x - mid.back[0], a.y - mid.back[1]) < 2 && a.on > .9, name + ': the square follows the mouse over the map', JSON.stringify(a));
          const bx = await H(() => { const r = document.querySelector('#phBox').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await page.mouse.move(bx[0], bx[1]); await step(8);
          const a2 = await H(() => window.__phT.aim()); rec(a2.on < .1, name + ': and hides when the mouse is over the camera', JSON.stringify(a2)); }
      }
      await at(tgt.s.x, tgt.s.y);
      if (!mobile && plan.feed === 'box') { const c = await page.evaluate(() => ({ big: document.querySelector('#cur').classList.contains('big'), t: document.querySelector('#curT').textContent }));
        rec(!c.big, name + ': once the camera is clicked to skip, the cursor out over the map carries no label', JSON.stringify(c)); }
    } else if (plan.how === 'drag') {
      const from = await H(() => { const d = window.__heloria.ST.ph._dbg, F = d.F, T = window.__phT; for (const [dx, dy] of [[-90, 60], [90, 60], [-90, -60], [90, -60], [0, 100], [0, -100]]) { const s = T.spot(F.x + dx, F.y + dy); if (s.free && s.back) return s; } return null; });
      if (!from) { rec(false, name + ': a clear spot to start the drag from'); return false; }
      await touch('touchStart', from.x, from.y); await step(2);
      const a0 = await H(() => window.__phT.aim()); rec(Math.hypot(a0.x - from.back[0], a0.y - from.back[1]) < 2, name + ': a finger down on the map puts the square under it', JSON.stringify({ a: [a0.x, a0.y], want: from.back }));
      for (let k = 1; k <= 6; k++) { await touch('touchMove', from.x + (tgt.s.x - from.x) * k / 6, from.y + (tgt.s.y - from.y) * k / 6); await step(1); }
      await frames(2); await step(1);   // (the browser hands pointer moves over with the next frame)
      const a1 = await H(() => window.__phT.aim()), f1 = await F_();
      rec(f1.phase === 'aim' && Math.hypot(a1.x - tgt.px, a1.y - tgt.py) < 2, name + ': dragging moves the square with the finger, and nothing is guessed until it lets go', JSON.stringify({ a: [a1.x.toFixed(1), a1.y.toFixed(1)], phase: f1.phase }));
      await touch('touchEnd');
    } else if (plan.how === 'keys') {
      await page.keyboard.press('Enter'); await step(1);   // the first press takes the keys
      const k0 = await F_(); rec(k0.phase === 'aim', name + ': the first Enter takes the keys and does not guess', k0.phase);
      for (const [axis, plus, minus] of [['x', 'ArrowRight', 'ArrowLeft'], ['y', 'ArrowDown', 'ArrowUp']]) {
        const a = await H(() => window.__phT.aim()), dv = (axis === 'x' ? tgt.px : tgt.py) - a[axis], n = Math.round(Math.abs(dv) / (110 / 30));
        if (!n) continue; const key = dv > 0 ? plus : minus; await page.keyboard.down(key); await step(n); await page.keyboard.up(key);
      }
      const a = await H(() => window.__phT.aim()); rec(Math.hypot(a.x - tgt.px, a.y - tgt.py) < 2.7, name + ': the arrow keys move the square onto the spot', JSON.stringify({ a: [a.x.toFixed(1), a.y.toFixed(1)], want: [tgt.px, tgt.py] }));
      tgt.px = a.x; tgt.py = a.y; tgt.s.back = [a.x, a.y];
      await page.keyboard.press('Enter');
    }
    // the guess is read back to the spot aimed at, and judged by the rules
    F = await F_();
    if (F.phase !== 'reveal') { rec(false, name + ': the guess is taken (' + plan.how + ')', F.phase); return false; }
    const back = tgt.s.back, err = Math.hypot(F.px - F.x, F.py - F.y) * MPX;
    rec(Math.hypot(F.px - back[0], F.py - back[1]) < 1.5 && Math.hypot(F.px - tgt.px, F.py - tgt.py) < 2.5, name + ': the ' + plan.how + ' lands on the spot aimed at', JSON.stringify({ took: [+F.px.toFixed(1), +F.py.toFixed(1)], aimed: [+tgt.px.toFixed(1), +tgt.py.toFixed(1)] }));
    let ds = Infinity; if (F.spoof) ds = Math.hypot(F.px - F.sx, F.py - F.sy) * MPX;
    const v = F.spoof && err > 25 && ds < 55 && ds < err ? 'Spoofed' : err <= 25 ? 'Trusted' : err <= 60 ? 'Close' : 'Wrong', tf = Math.max(.35, 1 - F.t / 30);
    const pts = { Spoofed: -250, Trusted: Math.round(1000 * tf), Close: Math.round(400 * tf), Wrong: 0 }[v];
    rec(F.v === v && F.pts === pts && Math.abs(F.err - err) < 1e-6 && F.game.score === Math.max(0, score0 + pts), name + ': ' + v + ' at ' + Math.round(err) + ' m after ' + F.t.toFixed(1) + ' s, ' + (pts >= 0 ? '+' : '') + pts + ', score ' + F.game.score,
      JSON.stringify({ v: F.v, pts: F.pts, score: F.game.score, was: score0 }));
    if (plan.target === 'truth') rec(v === 'Trusted', name + ': a guess on the truth is trusted');
    if (plan.target === 'spoof') rec(v === 'Spoofed', name + ': a guess on the GNSS fix is spoofed');
    // the reveal: the wave, the lock, the markers, the distance
    await step(30, () => window.__heloria.ST.ph._dbg.F.lock);
    const hv = await H(() => window.__phT.heat());
    // (the grid is 4 px, 8 m, a node; the game calls its peak right within two nodes, as here)
    rec(hv.ok && Math.abs(hv.peak[0] - hv.truth[0]) <= 2 && Math.abs(hv.peak[1] - hv.truth[1]) <= 2 && hv.atTruth >= 150 && hv.latTruth > .6, name + ': Pharos\'s correlation peaks on the truth', JSON.stringify(hv));
    await step(60, () => window.__heloria.ST.ph._dbg.F.rt > 1.6);
    if (!plan.quick) await settle();
    const m = await H(() => { const d = window.__heloria.ST.ph._dbg, F = d.F, T = window.__phT; T.still(); const xy = id => { const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(document.querySelector(id).style.transform); return m ? [+m[1], +m[2]] : null; };
      const a = d.m2s(F.x, F.y), b = d.m2s(F.px, F.py); return { tru: xy('#phTru'), clk: xy('#phClk'), want: [a.x, a.y], click: [b.x, b.y] }; });
    const hr = await hud(), dShown = +hr.dist.replace(/\D/g, '');
    rec(hr.dist === Math.round(err) + ' m' && Math.abs(dShown - Math.hypot(tgt.px - F.x, tgt.py - F.y) * MPX) <= 5, name + ': the distance shown is the distance from the guess to the truth', hr.dist + ' for a guess ' + (Math.hypot(tgt.px - F.x, tgt.py - F.y) * MPX).toFixed(1) + ' m off');
    if (!plan.quick) rec(m.tru && m.clk && Math.hypot(m.tru[0] - m.want[0], m.tru[1] - m.want[1]) < 1.5 && Math.hypot(m.clk[0] - m.click[0], m.clk[1] - m.click[1]) < 1.5 && ['phClk', 'phTru', 'phLn', 'phDist'].every(k => hr.marks.includes(k)) && !hr.marks.includes('phRing'),
      name + ': the truth and the guess are marked where they are on the map', JSON.stringify({ marks: hr.marks, tru: m.tru, clk: m.clk }));
    const helpOk = { Trusted: /^Within 25 m\. Pharos would trust that\. Its peak stood \d+\.\d× above the next best\.$/, Close: new RegExp('^' + Math.round(err) + ' m off\\. Close'), Wrong: new RegExp('^' + Math.round(err) + ' m off\\. The bright peak'), Spoofed: /^That fix was the spoofed GNSS/ }[v];
    rec(helpOk.test(hr.help), name + ': the words under the map say what happened', hr.help);
    if (v === 'Trusted') { const k = +/stood (\d+\.\d)×/.exec(hr.help)[1]; rec(k >= 1, name + ': the peak stood above the next best by ' + k + '×'); }
    const nxt = r >= ROUNDS ? 'See results' : 'Next fix';
    rec(hr.next.startsWith(nxt), name + ': the button reads ' + nxt, hr.next);
    if (F.spoof) { const g = await page.evaluate(() => document.querySelector('#phGnssL').textContent); rec(/^Spoofed · \d+ m off$/.test(g), name + ': the GNSS fix is shown up as spoofed', g); }
    if (plan.layout) await layoutCheck(name + ' at the reveal, ' + plan.layout, { reveal: true });
    if (plan.shot) await snapshot(P + 'pharos-' + plan.shot + '-reveal');
    // the surface, as drawn: its brightest patch stands on the truth
    if (plan.surface) {
      await step(20, () => window.__heloria.ST.ph._dbg.F.rt > 2.15);
      const drawn = await H(() => window.__phT.surfaceOn(true)); await H(h => { h.S.stSnap = true; }); await frames(3); const s0 = await H(() => window.__phT.surfaceAt()); s0.vis = drawn;
      const pad = 30, vs = page.viewportSize(), cl = { x: Math.max(0, s0.ring[0] - pad), y: Math.max(0, s0.ring[1] - 140) }; cl.width = Math.min(vs.width, s0.ring[2] + pad) - cl.x; cl.height = Math.min(vs.height, s0.ring[3] + pad) - cl.y;
      let png; try { png = await page.screenshot({ clip: cl, timeout: 240000 }); } finally { await H(() => window.__phT.surfaceOn(false)); }
      const b = await page.evaluate(async ([b64, cl]) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const D = x.getImageData(0, 0, c.width, c.height).data, W = c.width, Hh = c.height, L = new Float32Array(W * Hh); for (let i = 0; i < W * Hh; i++) L[i] = D[i * 4] * .3 + D[i * 4 + 1] * .59 + D[i * 4 + 2] * .11;
        const R = 7; let best = -1, bx = 0, by = 0; const all = [];
        for (let y = R; y < Hh - R; y += 2) for (let xx = R; xx < W - R; xx += 2) { let s = 0; for (let j = -R; j <= R; j += 1) for (let i = -R; i <= R; i += 1) s += L[(y + j) * W + xx + i]; all.push(s); if (s > best) { best = s; bx = xx; by = y; } }
        all.sort((a, b) => a - b); return { x: bx + cl.x, y: by + cl.y, best: best / 225, median: all[all.length >> 1] / 225 }; }, [png.toString('base64'), cl]);
      const onIt = Math.abs(b.x - s0.foot[0]) < 22 && b.y > Math.min(s0.top[1], s0.foot[1]) - 22 && b.y < Math.max(s0.top[1], s0.foot[1]) + 22;
      rec(s0.vis && s0.heat > .99 && Math.abs(s0.lift - 1.25) < 1e-3 && onIt && b.best > b.median * 1.8, name + ': the correlation surface is drawn, and its brightest patch stands on the truth',
        JSON.stringify({ bright: [b.x, b.y], foot: s0.foot.map(Math.round), top: s0.top.map(Math.round), lum: +b.best.toFixed(0), median: +b.median.toFixed(0) }));
      if (plan.shot) await snapshot(P + 'pharos-' + plan.shot + '-surface');
    } else await step(2);
    // the score has counted up to the new total by the time the button shows
    { const sc = (await hud()).score, g1 = (await F_()).game.score; rec(sc === g1.toLocaleString('en-IE'), name + ': the score reads ' + sc, 'game ' + g1); }
    book.push({ r, v, err, t: F.t, R: F.R, pts, spoof: F.spoof, ok: hv.ok });
    // on to the next
    const before = await F_();
    if (plan.next === 'button') await press('#phNext', nxt);
    else if (plan.next === 'space') await page.keyboard.press('Space');
    else if (plan.next === 'enter') await page.keyboard.press('Enter');
    else { await step(300, () => { const d = window.__heloria.ST.ph._dbg; return !d.game || d.F.phase !== 'reveal'; }); const f = await F_(); rec(!f.game || f.phase !== 'reveal', name + ': left alone, the reveal moves on by itself', 'after ' + (f.rt || 0).toFixed(1) + ' s'); }
    if (r < ROUNDS) {
      const ok = await H(() => { const d = window.__heloria.ST.ph._dbg, F0 = d.F; window.__phT.step(30, () => d.F !== F0); return d.F !== F0; });
      const f = await F_(), hh = await hud();
      rec(ok && f.r === r + 1 && f.phase === 'feed' && f.stage === 0 && hh.round === 'Fix ' + (r + 1) + ' / 5' && !hh.next && hh.marks.every(k => k === 'phGnss') && f.game.list === before.game.list,
        name + ': ' + ({ button: (mobile ? 'tapping' : 'clicking') + ' Next fix', space: 'Space', enter: 'Enter', auto: 'the wait' })[plan.next] + ' brings in fix ' + (r + 1) + ', the answer put away', JSON.stringify({ r: f.r, phase: f.phase, marks: hh.marks }));
      rec(Math.hypot(f.x - before.x, f.y - before.y) > 100, name + ': the next fix is somewhere else on the map', Math.hypot(f.x - before.x, f.y - before.y).toFixed(0) + ' px away');
    }
    log('  (' + name + ' took ' + ((Date.now() - tf0) / 1000).toFixed(0) + ' s)');
    return true;
  }

  // the results, against what the scenario saw
  async function resultsCheck(label, bk) {
    rec(await until(() => document.querySelector('.st-ph').classList.contains('is-res'), null, 30000), label + ': the game ends on the results');
    const R = await page.evaluate(() => ({ g: document.querySelector('#phG').getAttribute('aria-label') || document.querySelector('#phG').textContent, s: document.querySelector('#phFinal').textContent, nw: document.querySelector('#phNew').textContent,
      fx: [...document.querySelectorAll('#phFx li')].map(l => ({ c: l.className, v: l.querySelector('span').textContent, m: l.querySelector('em').textContent })), stats: Object.fromEntries([...document.querySelectorAll('#phStats div')].map(e => [e.querySelector('span').textContent, e.querySelector('b').textContent])), p: document.querySelector('#phP').textContent }));
    log(label + ' results: ' + JSON.stringify(R));
    if (bk.length < 5) { rec(false, label + ': all five fixes were played', bk.length + ' of 5'); return R; }
    const n = k => bk.filter(b => b.v === k).length, errs = bk.map(b => b.err).sort((a, b) => a - b), score = Math.max(0, bk.reduce((a, b) => Math.max(0, a + b.pts), 0));
    const grade = n('Spoofed') ? 'Fooled by a spoof' : n('Trusted') >= 4 ? 'Trusted' : n('Trusted') >= 2 || n('Trusted') + n('Close') >= 3 ? 'Holding position' : 'Lost', gn = bk.filter(b => b.spoof).length;
    rec(R.g === grade && R.s === score.toLocaleString('en-IE'), label + ': graded ' + grade + ', ' + score + ' points', R.g + ', ' + R.s);
    rec(R.fx.length === 5 && bk.length === 5 && R.fx.every((f, i) => f.v === bk[i].v && f.c === bk[i].v.toLowerCase() && f.m === Math.round(bk[i].err) + ' m'), label + ': the five fixes are listed as they went', R.fx.map(f => f.v + ' ' + f.m).join(', '));
    const want = { 'Trusted within 25 m': n('Trusted') + ' / 5', 'Median error': Math.round(errs[2]) + ' m', 'Best fix': Math.round(errs[0]) + ' m', 'Spoofs believed': gn ? n('Spoofed') + ' / ' + gn : '0',
      'Average time to fix': (bk.reduce((a, b) => a + b.t, 0) / 5).toFixed(1) + ' s', 'Average search radius': Math.round(bk.reduce((a, b) => a + b.R, 0) / 5 * MPX) + ' m' };
    const wrong = Object.keys(want).filter(k => R.stats[k] !== want[k]);
    rec(!wrong.length && Object.keys(R.stats).length === 6, label + ': the six figures add up', wrong.map(k => k + ' ' + R.stats[k] + ' (want ' + want[k] + ')').join('; ') || Object.values(R.stats).join(' | '));
    rec(n('Spoofed') ? /spoofed receiver/.test(R.p) : /92%/.test(R.p), label + ': the words under it fit the game', R.p.slice(0, 60));
    return R;
  }

  const t0 = Date.now();
  /* ---------------- the title ---------------- */
  await snapshot(P + 'pharos-0-title');
  await covered('.st-ph .go', 'the title (' + dev + ')');
  { const b = await H(() => window.__phT.title()); rec(!b.length, 'the title\'s words, notes and buttons sit apart (' + dev + ')', b.join('; ')); }
  rec(await page.evaluate(() => !document.querySelector('.st-ph .first')), 'Pharos has no first visit\'s choices: nothing to skip');
  await ready();
  { const pr = await H(h => { const d = h.ST.ph._dbg; return { pend: !!d.pend, jobs: d.jobs }; }); rec(pr.pend, 'on the title the first fix is made ready in the background', JSON.stringify(pr)); }
  const play = '.st-ph .go [data-play]';
  { const w0 = Date.now(); await press(play, 'Play'); const ok = await until(() => window.__heloria.ST.ph.state === 'play', null, 60000);
    rec(ok, 'Play starts the game (' + dev + ')', ((Date.now() - w0) / 1000).toFixed(1) + ' s'); }
  { const f = await F_(), hh = await hud(); rec(f && f.r === 1 && f.game.score === 0 && hh.score === '0' && f.game.list === 0, 'the game opens on fix 1 with no score', JSON.stringify({ r: f && f.r, score: hh.score })); }

  /* ---------------- game one: played to win ---------------- */
  const g1 = mobile
    ? [{ feed: 'watch', how: 'tap', target: 'truth', next: 'button', shot: 'f1', layout: 'phone', surface: true },
       { feed: 'box', how: 'drag', target: 'truth', next: 'button' },
       { feed: 'box', how: 'tap', target: 'close', next: 'auto' },
       { feed: 'watch', how: 'drag', target: 'truth', wait: 25, next: 'button', surface: true, shot: 'f4' },
       { feed: 'box', how: 'tap', target: 'truth', next: 'button', shot: 'f5' }]
    : [{ feed: 'watch', how: 'click', target: 'truth', next: 'button', hover: true, shot: 'f1', layout: 'desktop', surface: true },
       { feed: 'space', how: 'keys', target: 'truth', next: 'space' },
       { feed: 'box', how: 'click', target: 'close', next: 'enter' },
       { feed: 'watch', how: 'click', target: 'truth', wait: 25, next: 'auto', surface: true, shot: 'f4' },
       { feed: 'space', how: 'click', target: 'truth', next: 'button', shot: 'f5' }];
  book.length = 0;
  for (const p of g1) if (!(await playFix(p, 'game one,'))) break;
  if (book.length < ROUNDS) await H(h => h.ST.ph._dbg.end());   // (a fix that went wrong is recorded; the rest of the checks go on)
  { const f = await flags(); rec(!f.length, 'nothing stuck or not a number in game one', f.join(' | ')); }
  const r1 = await resultsCheck('game one (' + dev + ')', book.slice());
  rec(r1.g === 'Trusted', 'game one is won: four trusted fixes or more');
  await wait(1500); await covered('.st-ph .res', 'the results (' + dev + ')');
  { const b = await H(() => window.__phT.res()); rec(!b.length, 'the results fit the screen (' + dev + ')', b.join('; ')); }
  await snapshot(P + 'pharos-results-won');
  // the answer of the last fix is put away behind the results, the lock ring with it
  await step(45); { const u = await H(() => { const U = window.__phT.U; return { lock: +U.uLock.value.w.toFixed(3), foot: +U.uFoot.value.w.toFixed(3), heat: +U.uHeat.value.w.toFixed(3), on: +U.uOn.value.toFixed(3), wave: U.uWave.value.w }; });
    rec(u.lock < .05 && u.foot < .05 && u.heat < .05 && u.wave === 0, 'behind the results the map is clear of the last answer', JSON.stringify(u)); }

  /* ---------------- Play again, then game two: wild guesses ---------------- */
  await step(900, () => { const d = window.__heloria.ST.ph._dbg, j = d.jobs; return !!d.pend && !j.prep && !j.map && !j.scan; });
  { const j = await H(h => { const d = h.ST.ph._dbg; return { pend: !!d.pend && d.pend.r === 1, jobs: d.jobs }; }); rec(j.pend && !j.jobs.map && !j.jobs.scan, 'behind the results a new map is built, scanned in, and its first fix made ready', JSON.stringify(j)); }
  { const w0 = Date.now(); await press('.st-ph .res [data-play]', 'Play again'); const ok = await until(() => window.__heloria.ST.ph.state === 'play', null, 60000); rec(ok, 'Play again starts a new game', ((Date.now() - w0) / 1000).toFixed(1) + ' s'); }
  const resetCheck = async label => {
    const s = await H(h => { const d = h.ST.ph._dbg, F = d.F, g = d.game, T = window.__phT, U = T.U; return { r: F.r, phase: F.phase, stage: F.stage, t: F.t, score: g.score, list: g.list.length, trusted: g.trusted, spoofed: g.spoofed, wrong: g.wrong, close: g.close, gnss: g.gnss - (F.spoof ? 1 : 0), avoid: g.avoid.length,
      foot: U.uFoot.value.w, lock: U.uLock.value.w, wave: U.uWave.value.w, heatW: U.uHeat.value.w, lift: T.latU.uLift.value, beam: T.beam.visible }; });
    const hh = await hud();
    rec(s.r === 1 && s.phase === 'feed' && s.stage === 0 && s.score === 0 && s.list === 0 && !s.trusted && !s.spoofed && !s.wrong && !s.close && !s.gnss && s.avoid === 1 && !s.foot && !s.lock && !s.wave && !s.heatW && !s.lift && !s.beam,
      label + ': the new game starts clean', JSON.stringify(s));
    rec(hh.round === 'Fix 1 / 5' && hh.score === '0' && !hh.next && !hh.dist && hh.marks.every(k => k === 'phGnss') && hh.stage === 0, label + ': and so does the HUD', JSON.stringify(hh));
  };
  await resetCheck('after a win');
  await H(() => { window.__phT.flags.clear(); });
  const g2 = mobile
    ? [{ feed: 'box', how: 'tap', target: 'edge', off: true, next: 'button', shot: 'g2-edge', surface: true },
       { feed: 'box', how: 'tap', target: 'spoof', next: 'button', shot: 'g2-spoof' },
       { feed: 'watch', how: 'tap', target: 'corner', next: 'auto', surface: true },
       { feed: 'box', how: 'drag', target: 'wild', wait: 40, next: 'button' },
       { feed: 'box', how: 'tap', target: 'wild', next: 'button' }]
    : [{ feed: 'space', how: 'click', target: 'edge', off: true, next: 'button', shot: 'g2-edge', surface: true },
       { feed: 'box', how: 'click', target: 'spoof', next: 'space', shot: 'g2-spoof' },
       { feed: 'watch', how: 'click', target: 'corner', next: 'auto', surface: true },
       { feed: 'space', how: 'keys', target: 'wild', wait: 40, next: 'enter' },
       { feed: 'box', how: 'click', target: 'wild', next: 'button' }];
  book.length = 0;
  for (let i = 0; i < g2.length; i++) {
    const p = g2[i]; const f = await F_();
    if (p.target === 'spoof' && !f.spoof) p.target = 'wild';   // no GNSS fix this time
    if (!(await playFix(p, 'game two,'))) break;
  }
  if (book.length < ROUNDS) await H(h => h.ST.ph._dbg.end());
  if (!book.some(b => b.v === 'Spoofed')) log('  (no fix in game two had a GNSS fix to fall for)');
  { const f = await flags(); rec(!f.length, 'nothing stuck or not a number in game two', f.join(' | ')); }
  const r2 = await resultsCheck('game two (' + dev + ')', book.slice());
  rec(r2.g !== 'Trusted', 'game two, guessed wild, is not trusted', r2.g);
  await wait(1500); await snapshot(P + 'pharos-results-lost');
  await press('.st-ph .res [data-back]', 'Back to orbit');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Back to orbit leaves the station');
  rec(await H(h => !h.ST.ph._dbg.game && !h.ST.ph._dbg.F), 'and leaves nothing running behind it');

  /* ---------------- back again: Enter on the title, the Orbit button and Escape in the middle of a fix ---------------- */
  await wait(1500); await H(h => h.jump('ph')); await wait(2500);
  await ready();
  if (!mobile) {
    await page.keyboard.press('Enter');
    rec(await until(() => window.__heloria.ST.ph.state === 'play', null, 60000), 'Enter on the title starts the game');
    { const f = await F_(); rec(f.phase === 'feed' && f.stage === 0, 'and starts it on the first frame of the pipeline, not skipped past it', JSON.stringify({ phase: f.phase, stage: f.stage })); }
    await step(150);
    await page.keyboard.press('Escape');
    rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Escape leaves in the middle of a fix');
    await wait(1500); await H(h => h.jump('ph')); await wait(2500); await ready();
  }
  await press(play, 'Play'); rec(await until(() => window.__heloria.ST.ph.state === 'play', null, 60000), 'Play starts a game after leaving one');
  await resetCheck('after Back to orbit');
  // a resize while matching (a phone turned, a window dragged): the camera's frame must still be there to match
  await step(150);
  { const blank = () => page.evaluate(() => { const c = document.querySelector('#phFeed'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return { w: c.width, lit: s / (d.length / 4) }; });
    const a = await blank(); const vp = page.viewportSize(), alt = mobile ? { width: 844, height: 390 } : { width: 1024, height: 700 };
    await page.setViewportSize(alt); await wait(1200); await step(2); const b = await blank();
    rec(a.lit > 2 && b.lit > 2, 'turned or resized while matching, the camera still shows its frame', JSON.stringify({ before: a, after: b }));
    await page.setViewportSize(vp); await wait(1200); await step(2); const c = await blank(); rec(c.lit > 2, 'and again on the way back', JSON.stringify(c)); }
  await press('#back', 'the Orbit button during a fix');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'the Orbit button leaves in the middle of a fix');
  rec(await H(h => !h.ST.ph._dbg.game && !h.ST.ph._dbg.F && !h.ST.ph._dbg.jobs.prep), 'and the game is put away');

  /* ---------------- other screens: the title and a fix checked through; where the results are tightest, all five to them ---------------- */
  const screens = mobile ? [[844, 390, 'phone sideways', 1], [667, 375, 'small phone sideways', 1], [768, 1024, 'iPad upright', 0], [1024, 768, 'iPad sideways', 1]]
    : [[1024, 700, 'small desktop', 1], [1280, 1300, 'tall window', 0], [1920, 1080, 'large desktop', 0]];
  for (const [w, hh, what, all] of screens) {
    const tag = what + ' ' + w + 'x' + hh;
    await page.setViewportSize({ width: w, height: hh }); await wait(1500);
    await H(h => h.jump('ph')); await wait(2500);
    await covered('.st-ph .go', 'the title, ' + tag); { const b = await H(() => window.__phT.title()); rec(!b.length, 'the title\'s words, notes and buttons sit apart, ' + tag, b.join('; ')); }
    await snapshot(P + 'pharos-' + w + 'x' + hh + '-title');
    await ready();
    await press(play, 'Play, ' + tag);
    if (!(await until(() => window.__heloria.ST.ph.state === 'play', null, 60000))) { rec(false, 'Play starts the game, ' + tag); continue; }
    await step(3); await settle(); await layoutCheck(tag + ', the pipeline');
    book.length = 0;
    for (let i = 0; i < (all ? ROUNDS : 1); i++) if (!(await playFix({ feed: i ? 'box' : 'watch', how: mobile ? 'tap' : 'click', target: i === 2 ? 'wild' : 'truth', next: 'button', layout: i === 0 ? tag : '', shot: i === 0 ? w + 'x' + hh : '', quick: i > 0 }, tag + ','))) break;
    if (book.length === ROUNDS) {
      await resultsCheck(tag, book.slice());
      await wait(1500); await covered('.st-ph .res', 'the results, ' + tag);
      { const b = await H(() => window.__phT.res()); rec(!b.length, 'the results fit the screen without scrolling, ' + tag, b.join('; ')); }
      await snapshot(P + 'pharos-' + w + 'x' + hh + '-results');
      await press('.st-ph .res [data-back]', 'Back to orbit, ' + tag);
    } else await press('#back', 'the Orbit button, ' + tag);
    rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'back to orbit, ' + tag);
    await wait(1500);
  }
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
  await H(h => { const T = window.__phT; T.paused = false; h.ST.ph.update = T.orig; });

  const fails = results.filter(r => !r.ok);
  log('\nPHAROS (' + dev + '): ' + (results.length - fails.length) + ' of ' + results.length + ' passed, ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  fails.forEach(f => log('  FAIL ' + f.name + (f.detail ? '  (' + f.detail + ')' : '')));
};

/* Read the Room, played properly from the real Play button to the results, on a desktop or a phone:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/krios --scenario untamed/test/krios.cjs [--mobile]
   (a build of Kríos alone is quicker: python3 untamed/build.py --only kr --single /tmp/x/kr.html --inline-three)
   Headless frames are slow, so the station's clock is frozen and stepped by hand, 1/30 s at a time, between real inputs:
   clicks or taps on the replies, the keys 1 to 3 (and the number pad), Space and Enter, and taps on the room.
   Every reply is checked against the call's own data: the line she says (warm or cool), the three cards, the trust,
   interest and score it should leave, the coach note, the cards' marks, and that a second pick is refused. Four calls are
   played: every good read (the demo is booked), every misread (she hangs up), silence on every turn (dead air until she
   hangs up), and a fair call that ends in a follow-up or an email. Call again must ring someone else and start clean, and
   Back to orbit, the Orbit button and Escape must each leave. Then the layout is checked at other sizes (short laptops,
   tablets, the phone upright and held sideways): every line and reply of all three calls, the coach notes, the room, the
   title and the report, for overlaps, anything off the screen and text too small. It ends on KRIOS (desktop|phone): N of M passed. */
const results = [];
function rec(ok, name, detail) { results.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); }

module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '', dev = mobile ? 'phone' : 'desktop';
  const until = (fn, arg, t = 60000) => page.waitForFunction(fn, arg, { timeout: t, polling: 250 }).then(() => true).catch(() => false);
  const frames = (n = 2) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  // the room's camera snaps to where the station puts it, and the page's fades are given a moment of real time to finish
  const snapshot = async name => { await H(h => { h.S.stSnap = true; }); await frames(2); await wait(700); await frames(1); await shot(name); };
  const at = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  // a real click (or tap) at the middle of a control, once nothing else is over it there
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

  await H(h => h.jump('kr')); await wait(2500);
  /* the helpers that live in the page: the frozen clock and its stepping, a watcher that looks for anything stuck or out of
     step after every step, what a reply should do by the call's own data, and the layout of the moment */
  await H(h => {
    const st = h.ST.kr, d = st._dbg, WIN = 12, NB = 6;
    if (!st.__orig) { st.__orig = st.update; st.update = function (dt, t) { if (!(window.__krT && window.__krT.frozen)) return st.__orig.call(st, dt, t); }; }
    const q = s => document.querySelector(s), clamp = (v, a, b) => Math.min(b, Math.max(a, v)), fmt = n => Math.round(n).toLocaleString('en-IE');
    const T = window.__krT = {
      frozen: false, flags: new Map(), sounds: { tick: 0, chime: 0 }, lines: new Set(),
      flag(k, m) { if (!T.flags.has(k)) T.flags.set(k, m); },
      freeze(v) { T.frozen = v; },
      step(n, stop) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.__orig.call(st, 1 / 30, h.S.t); T.watch(); if (stop && stop()) return i + 1; } return n; },
      untilPh(ph, max = 900) { return T.step(max, () => !d.game || d.game.ph === ph) <= max && (!!d.game && d.game.ph === ph); },
      watch() {
        const g = d.game; if (!g) return;
        const k = g.c.name + ':' + g.bi;
        if (![g.tr, g.in, g.score, g.t].every(Number.isFinite)) T.flag('nan' + k, 'trust, interest or score is not a number at ' + k);
        if (g.tr < 0 || g.tr > 100 || g.in < 0 || g.in > 100) T.flag('rng' + k, 'trust or interest outside 0 to 100 at ' + k);
        if (st.el.dataset.ph !== g.ph) T.flag('ph' + k + g.ph, 'the page shows phase ' + st.el.dataset.ph + ' while the call is in ' + g.ph);
        if (q('#krTrV').textContent !== String(Math.round(g.tr)) || q('#krInV').textContent !== String(Math.round(g.in))) T.flag('mt' + k + g.ph, 'the meters read ' + q('#krTrV').textContent + '/' + q('#krInV').textContent + ' for ' + Math.round(g.tr) + '/' + Math.round(g.in));
        if (g.bi >= 0 && q('#krTurn').textContent !== 'Turn ' + (g.bi + 1) + ' / ' + NB) T.flag('turn' + k, 'the turn counter reads ' + q('#krTurn').textContent + ' on turn ' + (g.bi + 1));
        const lim = { ring: 1.2, pick: WIN, show: 1.3, line: g.words.length * .055 + .15, end: g.words.length * .09 + 1.5 }[g.ph];
        if (lim !== undefined && g.t > lim + .12) T.flag('stuck' + k + g.ph, 'the call has sat in ' + g.ph + ' for ' + g.t.toFixed(2) + ' s at ' + k);
        if (g.ph === 'line' || g.ph === 'pick') T.lines.add(g.c.name + ':' + g.bi + ':' + (g.warm || !g.c.beats[g.bi].c ? 'w' : 'c'));
      },
      // what the station should show and do at this moment, from the call's own data
      beat() { const g = d.game, b = g.c.beats[g.bi]; return { bi: g.bi, warm: g.warm || !b.c, line: g.warm || !b.c ? b.w : b.c, shown: q('#krLine').getAttribute('aria-label'), who: q('#krWho').textContent, name: g.c.name,
        on: q('#krLine').querySelectorAll('.kw.on').length, words: q('#krLine').querySelectorAll('.kw').length, turn: q('#krTurn').textContent }; },
      cards() { const g = d.game, b = g.c.beats[g.bi], wi = g.warm ? 0 : 1, B = [...st.el.querySelectorAll('.krop')];
        return B.map((x, k) => { const r = b.r[g.order[k]]; return { want: r.t, text: x.querySelector('span').textContent, label: x.getAttribute('aria-label'), q: r.q[wi], cls: [...x.classList].filter(c => c !== 'krop' && c !== 'hit').join(' '), dq: x.dataset.q || '' }; }); },
      want(policy) { const g = d.game, b = g.c.beats[g.bi], wi = g.warm ? 0 : 1, qs = [0, 1, 2].map(k => b.r[g.order[k]].q[wi]);
        const pref = { best: [2], worst: [0, 1], fair: [1, 2] }[policy]; for (const v of pref) { const k = qs.indexOf(v); if (k >= 0) return k; } return 0; },
      expect(k) { const g = d.game, b = g.c.beats[g.bi], wi = g.warm ? 0 : 1; let qq, dt, di, note, label;
        if (k < 0) { qq = 0; dt = -10; di = -6; note = 'On a cold call, silence reads as doubt.'; label = 'Dead air'; }
        else { const r = b.r[g.order[k]]; qq = r.q[wi]; [dt, di] = r.d[wi]; note = r.n[wi]; label = ['Misread', 'Fair', 'Good read'][qq]; }
        const streak = qq === 2 ? g.streak + 1 : 0; let pts = 0;
        if (qq > 0) { const spd = Math.round(100 * clamp(1 - (g.t - 1.2) / 7, 0, 1)); pts = Math.round(([0, 120, 300][qq] + spd) * (qq === 2 ? 1 + .25 * Math.min(streak - 1, 4) : 1)); }
        const tr = clamp(g.tr + dt, 0, 100), inn = clamp(g.in + di, 0, 100);
        const best = qq < 2 ? [0, 1, 2].find(i => b.r[g.order[i]].q[wi] === 2) : undefined;
        return { k, q: qq, tr, in: inn, score: g.score + pts, pts, streak, label, note, best, hung: g.bi >= 1 && tr <= 8, ques: k >= 0 && /\?\s*$/.test(b.r[g.order[k]].t), rt: g.t, last: g.bi === NB - 1 }; },
      after() { const g = d.game, n = q('#krNote'); return { ph: g.ph, pick: g.pick, tr: g.tr, in: g.in, score: g.score, streak: g.streak, hung: g.hung, trV: q('#krTrV').textContent, inV: q('#krInV').textContent,
        note: n.textContent, noteB: n.querySelector('b') ? n.querySelector('b').textContent : '', noteOn: n.classList.contains('on'), combo: q('#krCombo').textContent,
        cls: [...st.el.querySelectorAll('.krop')].map(x => [...x.classList].filter(c => c !== 'krop' && c !== 'hit').join(' ') + (x.dataset.q ? ' q' + x.dataset.q : '')), hint: q('#krHint').textContent }; },
      bar() { const m = /scaleX\(([\d.]+)\)/.exec(q('#krBar').style.transform); return { s: m ? +m[1] : -1, low: q('.st-kr .krtime').classList.contains('low'), t: d.game.t }; },
      // the HUD at this moment: nothing overlapping, everything on the screen and big enough to read, the room clear of the replies
      layout() {
        const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
          for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
        const txt = e => { const R = document.createRange(); R.selectNodeContents(e); return [...R.getClientRects()].filter(r => r.width > .5 && r.height > .5); };
        const B = [], add = (g, r) => B.push({ g, l: r.left, t: r.top, r: r.right, b: r.bottom });
        if (vis(q('#back'))) add('the Orbit button', q('#back').getBoundingClientRect());
        if (vis(q('#chrome .brand'))) txt(q('#chrome .brand')).forEach(r => add('the brand', r));
        st.el.querySelectorAll('.krm').forEach(e => { if (vis(e)) add('the meters', e.getBoundingClientRect()); });
        if (vis(q('#krTurn'))) txt(q('#krTurn')).forEach(r => add('the meters', r));
        st.el.querySelectorAll('.gtr > *').forEach(e => { if (vis(e)) txt(e).forEach(r => add('the score', r)); });
        if (vis(q('#krWho'))) txt(q('#krWho')).forEach(r => add('her name', r));
        q('#krLine').querySelectorAll('.kw').forEach(e => { if (vis(q('#krLine'))) add('her line', e.getBoundingClientRect()); });
        if (q('#krNote').classList.contains('on')) txt(q('#krNote')).forEach(r => add('the coach note', r));
        if (q('#krOps').classList.contains('in')) st.el.querySelectorAll('.krop').forEach(e => add('the replies', e.getBoundingClientRect()));
        if (vis(q('.st-kr .krtime'))) add('the clock', q('.st-kr .krtime').getBoundingClientRect());
        if (q('#krHint').textContent && vis(q('#krHint'))) txt(q('#krHint')).forEach(r => add('the hint', r));
        const bad = [];
        for (const b of B) if (b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) bad.push(b.g + ' runs off the screen');
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; if (a.g === b.g) continue;
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 1 && oy > 1) bad.push(a.g + ' overlaps ' + b.g); }
        const small = [...st.el.querySelectorAll('.ghud *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 9).map(e => e.id || e.className || e.tagName);
        if (small.length) bad.push('text under 9 px: ' + [...new Set(small)].join(', '));
        // a card whose words do not fit it
        st.el.querySelectorAll('.krop').forEach((e, k) => { const s = e.querySelector('span'); if (q('#krOps').classList.contains('in') && (s.scrollWidth > s.clientWidth + 1 || s.getBoundingClientRect().bottom > e.getBoundingClientRect().bottom + 1)) bad.push('reply ' + (k + 1) + ' spills out of its card'); });
        // the room, seen from where the station puts the camera: its heart must stay clear of the replies
        const cam = h.stCam.clone(); cam.position.copy(st.camP); cam.lookAt(st.camL); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        const V = new h.stCam.position.constructor(), pr = (x, y, z) => { V.set(x, y, z).project(cam); return [(V.x * .5 + .5) * innerWidth, (-V.y * .5 + .5) * innerHeight]; };
        const core = [pr(-.9, 0, 0), pr(.9, 0, 0), pr(0, -.9, 0), pr(0, .9, 0)], ring = [...Array(24)].map((_, i) => pr(Math.cos(i / 24 * 6.2832) * 1.42, Math.sin(i / 24 * 6.2832) * 1.42, 0));
        const bb = P => P.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]);
        const cb = bb(core), rb = bb(ring);
        if (st.state === 'play' && q('#krOps').classList.contains('in')) for (const b of B.filter(b => b.g === 'the replies')) if (Math.min(cb[2], b.r) - Math.max(cb[0], b.l) > 1 && Math.min(cb[3], b.b) - Math.max(cb[1], b.t) > 1) { bad.push('the heart of the room sits under the replies'); break; }
        if (st.state === 'play' && (cb[3] - cb[1] < innerHeight * .12)) bad.push('the room is a speck, ' + Math.round(cb[3] - cb[1]) + ' px');
        return { bad: [...new Set(bad)], core: cb.map(Math.round), ring: rb.map(Math.round) };
      },
      // the title and the report: their words must not run into each other
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
        } else { const r = q('.st-kr .res'); if (r.scrollHeight > r.clientHeight + 1) bad.push('the report scrolls'); const b = r.getBoundingClientRect(); if (b.top < 0 || b.bottom > innerHeight || b.left < 0 || b.right > innerWidth) bad.push('the report runs off the screen'); }
        for (const b of B) if (b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) bad.push(b.g + ' runs off the screen');
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; if (a.g === b.g) continue;
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 1 && oy > 1) bad.push(a.g + ' overlaps ' + b.g); }
        return [...new Set(bad)];
      },
      // a whole call played straight through with good reads, picked by clicking the cards in the page, checking the layout at
      // every line, every set of replies and every coach note: for the sizes, where the inputs themselves were tested already
      sweep(size) { const out = []; let n = 0; const label = size + ' ' + (d.game ? d.game.c.name.split(' ')[0] : '');
        for (let guard = 0; guard < 40 && d.game; guard++) { const g = d.game;
          if (g.ph === 'ring' || g.ph === 'line') { T.step(400, () => !d.game || d.game.ph === 'pick'); continue; }
          if (g.ph === 'pick') { T.step(3); const L = T.layout(); n++; L.bad.forEach(b => out.push(label + ', turn ' + (g.bi + 1) + ' replies: ' + b)); st.el.querySelectorAll('.krop')[T.want('best')].click(); T.step(2); continue; }
          if (g.ph === 'show') { const L = T.layout(); n++; L.bad.forEach(b => out.push(label + ', turn ' + (g.bi + 1) + ' note: ' + b)); T.step(60, () => !d.game || d.game.ph !== 'show'); continue; }
          if (g.ph === 'end') { T.step(200, () => !d.game); break; } }
        return { bad: [...new Set(out)], n }; },
      // the next call rings this person (Call again never rings the same one twice running)
      ring(i) { const p = st.play; st.play = function () { const r = Math.random; Math.random = () => (i + .5) / 3; try { p.call(st); } finally { Math.random = r; st.play = p; } }; },
      sound() { for (const k of ['tick', 'chime']) { const f = h.A[k]; h.A[k] = function () { T.sounds[k]++; return f.apply(this, arguments); }; } },
    };
    T.sound();
  });

  const g = () => H(h => { const x = h.ST.kr._dbg.game; return x && { ph: x.ph, bi: x.bi, t: +x.t.toFixed(3), tr: x.tr, in: x.in, score: x.score, streak: x.streak, good: x.good, dead: x.dead, qs: x.qs, pick: x.pick, warm: x.warm, hung: x.hung, name: x.c.name, pr: x.c.pr }; });
  const layoutCheck = async label => { const L = await H(() => window.__krT.layout()); rec(L.bad.length === 0, 'layout, ' + label + ': nothing overlaps, all on the screen and readable, the room clear of the replies', L.bad.join('; ') || ('room ' + L.core.join(','))); return L; };
  const panelCheck = async (which, label) => { const b = await H((h, w) => window.__krT.layoutPanel(w), which); rec(b.length === 0, 'layout, ' + label + ': nothing runs into anything else', b.join('; ')); };
  // a spot on the room itself, clear of every card and label, for a tap (or click) that should land on the canvas
  const roomSpot = () => page.evaluate(() => { const ok = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.tagName === 'CANVAS'; };
    for (const [fx, fy] of [[.5, .45], [.5, .5], [.42, .5], [.58, .5], [.5, .4], [.3, .45], [.7, .45], [.5, .55]]) { const x = innerWidth * fx, y = innerHeight * fy; if (ok(x, y)) return [x, y]; } return null; });

  /* ---------------- the title ---------------- */
  await snapshot(P + 'krios-0-title');
  await covered('.st-kr .go', 'the title');
  await panelCheck('title', 'the title, ' + dev);
  const t0 = Date.now();
  const tally = { click: [0, 0], tap: [0, 0], key: [0, 0], numpad: [0, 0], none: [0, 0] }, adv = { space: 0, enter: 0, tap: 0, click: 0, auto: 0 };
  let focusSeen = null;

  /* ---------------- one turn: her line, the replies, the pick, the note, the move on ---------------- */
  async function turn(policy, how, skip, advance, tag) {
    const b0 = await H(() => window.__krT.beat());
    rec(b0.shown === b0.line, tag + ': she says the ' + (b0.warm ? 'warm' : 'cool') + ' line', b0.shown + (b0.shown === b0.line ? '' : ' / wanted ' + b0.line));
    if (skip) {
      if (skip === 'space') await page.keyboard.press('Space'); else if (skip === 'enter') await page.keyboard.press('Enter');
      else { const s = await roomSpot(); if (s) await at(s[0], s[1]); else rec(false, tag + ': a clear spot on the room to tap'); }
      const b1 = await H(() => window.__krT.beat());
      rec(b1.on === b1.words, tag + ': ' + (skip === 'tap' ? (mobile ? 'a tap' : 'a click') + ' on the room' : skip === 'space' ? 'Space' : 'Enter') + ' shows her whole line at once', b1.on + ' of ' + b1.words + ' words');
    }
    const ok = await H(() => window.__krT.untilPh('pick', 400));
    if (!ok) { rec(false, tag + ': the replies come up', JSON.stringify(await g())); return null; }
    { const br = await H(() => window.__krT.bar()); rec(br.s > .99 && !br.low, tag + ': the clock starts full', JSON.stringify(br)); }
    await H(() => window.__krT.step(1));
    { const c = await H(() => window.__krT.cards());
      rec(c.every(x => x.text === x.want && x.label.endsWith(x.want)) && c.every(x => !/pick|dim|best/.test(x.cls) && !x.dq), tag + ': three replies, each the call\'s own words, none left marked from before', c.map(x => x.q).join(' ')); }
    // how long the rep takes to answer: quick, slow, or never
    if (policy !== 'none') await H((h, n) => window.__krT.step(n), { best: 36, fair: 75, worst: 20 }[policy] || 30);
    return true;
  }
  async function pickAndCheck(policy, how, advance, tag) {
    const k = await H((h, p) => p === 'none' ? -1 : window.__krT.want(p), policy);
    const e = await H((h, k) => window.__krT.expect(k), k);
    const pre = await g();
    if (k < 0) {
      // silence: the clock runs out and goes red, ticking in the last seconds, and the turn is taken as dead air
      const tk0 = await H(() => window.__krT.sounds.tick);
      await H(() => window.__krT.step(345));
      const br = await H(() => window.__krT.bar()), tk1 = await H(() => window.__krT.sounds.tick);
      rec(br.low && br.s < .1 && br.s > 0, tag + ': near the end the clock runs low and goes red', JSON.stringify(br));
      rec(tk1 - tk0 >= 3, tag + ': and ticks in the last seconds', (tk1 - tk0) + ' ticks');
      await H(() => window.__krT.step(60, () => window.__heloria.ST.kr._dbg.game.ph !== 'pick'));
      tally.none[0]++;
    } else {
      const sel = '.st-kr .krop:nth-child(' + (k + 1) + ')';
      if (how === 'click' || how === 'tap') await press(sel, tag + ' reply ' + (k + 1));
      else if (how === 'key') await page.keyboard.press('Digit' + (k + 1));
      else if (how === 'numpad') await page.keyboard.press('Numpad' + (k + 1));
    }
    const a = await H(() => window.__krT.after());
    const want = e.best !== undefined ? [0, 1, 2].map(i => i === k ? 'pick q' + e.q : i === e.best ? 'best' : 'dim') : [0, 1, 2].map(i => i === k ? 'pick q' + e.q : 'dim');
    const ok = a.ph === 'show' && a.pick === k && a.tr === e.tr && a.in === e.in && a.score === e.score && a.streak === e.streak && a.trV === String(Math.round(e.tr)) && a.inV === String(Math.round(e.in))
      && a.noteOn && a.noteB === e.label && a.note.includes(e.note) && (e.pts ? a.note.includes('+' + e.pts.toLocaleString('en-IE')) : !/\+\d/.test(a.note))
      && a.cls.every((c, i) => c.split(' ').sort().join(' ') === want[i].split(' ').sort().join(' ')) && a.combo === (e.streak > 1 ? e.streak + ' good reads in a row' : '') && a.hung === e.hung;
    if (k >= 0) tally[how][ok ? 0 : 1]++;
    if (!ok || k < 0) rec(ok, tag + ': ' + (k < 0 ? 'the silence is taken as dead air' : 'the ' + e.label.toLowerCase() + ' by ' + how) + ': trust, interest, score, the note and the cards all as the call says',
      JSON.stringify({ want: { tr: e.tr, in: e.in, score: e.score, label: e.label, cls: want, hung: e.hung }, got: { ph: a.ph, pick: a.pick, tr: a.tr, in: a.in, score: a.score, label: a.noteB, cls: a.cls, combo: a.combo, hung: a.hung } }));
    // a second pick, or a key, while the note is up: refused
    { const before = await g();
      const cardAt = i => page.evaluate(i => { const r = document.querySelectorAll('.st-kr .krop')[i].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, i);
      if (mobile) await at(...(await cardAt((k + 1 + 3) % 3)));
      else { await page.keyboard.press('Digit' + ((k + 1 + 3) % 3 + 1)); if (how !== 'click') await page.mouse.click(...(await cardAt((k + 2 + 3) % 3))); }
      const after = await g();
      if (!(after.ph === 'show' && after.pick === before.pick && after.score === before.score && after.tr === before.tr)) rec(false, tag + ': a second pick straight after the first is refused', JSON.stringify({ before, after }));
      else if (!focusSeen || focusSeen !== how) { focusSeen = how; rec(true, tag + ': after a pick by ' + how + ', a second pick straight after is refused (' + (mobile ? 'a tap on another card' : how === 'click' ? 'another key' : 'another key and a click on another card') + '), and so is moving on before a quarter second'); } }
    if (!mobile && how === 'click') { // Enter and Space during the pick do not press the card the mouse left focused
      /* (checked once a later turn's replies are up; see below) */ }
    // move on: Space, Enter, a tap on the room, or leave it to move on by itself
    const s0 = await g();
    if (advance === 'auto') { await H(() => window.__krT.step(60, () => { const x = window.__heloria.ST.kr._dbg.game; return !x || x.ph !== 'show'; })); adv.auto++; }
    else {
      await H(() => window.__krT.step(9));
      if (advance === 'space') await page.keyboard.press('Space'); else if (advance === 'enter') await page.keyboard.press('Enter');
      else { const s = await roomSpot(); if (s) await at(s[0], s[1]); }
      const s1 = await g();
      const moved = !s1 || s1.ph !== 'show' || s1.bi !== s0.bi;
      if (moved) adv[advance]++; else rec(false, tag + ': ' + advance + ' moves the call on', JSON.stringify(s1));
    }
    return e;
  }

  /* ---------------- a whole call ---------------- */
  async function call(policy, opts) {
    const s = await g(); const name = s.name, tag0 = opts.tag;
    rec(s.ph === 'ring' && s.score === 0 && s.tr === 40 && s.in === 35 && s.bi === -1, tag0 + ': the call opens ringing ' + name + ', score 0, trust 40, interest 35', JSON.stringify(s));
    { const hud = await page.evaluate(() => ({ who: document.querySelector('#krWho').textContent, line: document.querySelector('#krLine').getAttribute('aria-label'), turn: document.querySelector('#krTurn').textContent, score: document.querySelector('#krScore').textContent,
        combo: document.querySelector('#krCombo').textContent, note: document.querySelector('#krNote').classList.contains('on'), ops: document.querySelector('#krOps').classList.contains('in'), trV: document.querySelector('#krTrV').textContent, inV: document.querySelector('#krInV').textContent }));
      rec(hud.who.startsWith(name) && hud.line === 'Calling ' + name.split(' ')[0] + '...' && hud.turn === 'Turn 1 / 6' && hud.score === '0' && !hud.combo && !hud.note && !hud.ops && hud.trV === '40' && hud.inV === '35',
        tag0 + ': and so does the HUD', JSON.stringify(hud)); }
    const track = { good: 0, dead: 0, qs: 0, rts: [], worst: null, last: -1, tr: 40, in: 35, score: 0, turns: 0, hung: false };
    for (let i = 0; i < 6; i++) {
      const tag = tag0 + ' turn ' + (i + 1);
      if (!(await H(() => window.__krT.untilPh('line', 200)))) { rec(false, tag + ': her line comes', JSON.stringify(await g())); return null; }
      const how = opts.how[i % opts.how.length], skip = opts.skip[i % opts.skip.length], advance = opts.adv[i % opts.adv.length];
      if (!(await turn(policy, how, skip, advance, tag))) return null;
      if (opts.shots && opts.shots.includes(i)) await snapshot(P + 'krios-' + opts.id + '-turn' + (i + 1) + '-replies');
      if (opts.layout) await layoutCheck(tag + ', the replies (' + dev + ')');
      if (i === 1 && !mobile && opts.focus) { // Space and Enter while the replies are up do not press a card the mouse left focused
        const pre = await g(); await page.keyboard.press('Enter'); await page.keyboard.press('Space'); const post = await g();
        rec(post.ph === 'pick' && post.pick === -1, tag + ': Enter and Space while the replies are up pick nothing', JSON.stringify({ ph: post.ph, pick: post.pick, focus: await page.evaluate(() => document.activeElement && document.activeElement.className) })); }
      if (opts.focus && i >= 1) { const f = await page.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('krop') ? { k: [...a.parentElement.children].indexOf(a), fv: a.matches(':focus-visible') } : null; });
        if ((f && f.fv) || i === 2) rec(!(f && f.fv), tag + ': no card shows a keyboard focus ring the rep never put there (a clicked card gives its focus back)', JSON.stringify(f)); }
      const e = await pickAndCheck(policy, how, advance, tag);
      if (opts.shots && opts.shots.includes(i)) { /* the note after the pick was shot by the layout pass below on the next turn */ }
      track.turns++; track.tr = e.tr; track.in = e.in; track.score = e.score; track.last = e.k < 0 ? 0 : e.q;
      if (e.q === 2) track.good++; if (e.k < 0) track.dead++; else track.rts.push(e.rt); if (e.ques) track.qs++; if (e.q === 0 && e.k >= 0 && !track.worst) track.worst = { i, n: e.note };
      if (e.hung) { track.hung = true; break; }
    }
    // the end: her last line, then the report
    rec(await H(() => window.__krT.untilPh('end', 200)), tag0 + ': the call ends');
    const R = (track.tr + track.in) / 2, outcome = track.hung ? 3 : (R >= 72 && track.last === 2) ? 0 : R >= 54 ? 1 : R >= 34 ? 2 : 3;
    { const b = await H(() => { const g = window.__heloria.ST.kr._dbg.game; return { shown: document.querySelector('#krLine').getAttribute('aria-label'), hang: g.c.hang, end: g.c.end }; });
      const wantLine = outcome === 3 ? b.hang : b.end[outcome];
      rec(b.shown === wantLine, tag0 + ': she ends on the line for ' + ['a booked demo', 'a follow-up', 'an email', 'a hang-up'][outcome], b.shown); }
    if (opts.shots) { await H(() => window.__krT.step(40)); await snapshot(P + 'krios-' + opts.id + '-end'); }
    await H(() => window.__krT.step(400, () => !window.__heloria.ST.kr._dbg.game));
    rec(await until(() => document.querySelector('.st-kr').classList.contains('is-res'), null, 30000), tag0 + ': the report comes up');
    const res = await page.evaluate(() => ({ g: document.querySelector('#krG').getAttribute('aria-label') || document.querySelector('#krG').textContent, s: document.querySelector('#krFinal').textContent, stats: [...document.querySelectorAll('#krStats div')].map(e => [e.querySelector('span').textContent, e.querySelector('b').textContent]), p: document.querySelector('#krP').textContent, nw: document.querySelector('#krNew').textContent, best: document.querySelector('#krBest').textContent }));
    log('report:', JSON.stringify(res));
    const grade = ['Demo booked', 'Follow-up set', 'Send an email', s.pr + ' hung up'][outcome], total = track.score + [600, 300, 100, 0][outcome];
    const avg = track.rts.length ? (track.rts.reduce((a, b) => a + b, 0) / track.rts.length).toFixed(1) + ' s' : 'None';
    const st = Object.fromEntries(res.stats);
    rec(res.g === grade && res.s === total.toLocaleString('en-IE'), tag0 + ': the report reads ' + grade + ', ' + total.toLocaleString('en-IE'), res.g + ', ' + res.s);
    rec(st['Good reads'] === track.good + ' / ' + track.turns && st['Avg reply time'] === avg && st['Questions asked'] === String(track.qs) && st['Trust at the end'] === Math.round(track.tr) + '%' && st['Interest at the end'] === Math.round(track.in) + '%' && st['Dead air'] === String(track.dead),
      tag0 + ': and its six figures are the call\'s own', JSON.stringify(st));
    const first = name.split(' ')[0];
    const wantText = (outcome === 0 ? first + ' booked the demo. ' : '') + (track.worst ? 'Turn ' + (track.worst.i + 1) + ': ' + track.worst.n + ' ' : track.dead ? 'You went quiet ' + (track.dead === 1 ? 'once' : track.dead + ' times') + '. On a call, silence reads as doubt. ' : outcome !== 0 ? 'No misreads, but the room never got warm enough to ask for the meeting. ' : '');
    rec(res.p.startsWith(wantText) && res.p.endsWith('before a real one hears them.'), tag0 + ': and its advice fits the call', res.p);
    return { outcome, total, name, res };
  }

  /* ---------------- call one: every good read, the demo booked ---------------- */
  await H(() => window.__krT.freeze(true));   // frozen first, so the call starts at its first moment however slow the frames are
  await press('.st-kr .go [data-play]', 'Play');
  rec(await until(() => window.__heloria.ST.kr.state === 'play', null, 60000), 'Play starts a call (' + dev + ')');
  const hows = mobile ? ['tap'] : ['click', 'key', 'numpad'];
  const c1 = await call('best', { tag: 'call one (every good read)', id: 'won', how: hows, skip: mobile ? ['tap', 0] : ['space', 0, 'enter'], adv: mobile ? ['tap', 'auto'] : ['space', 'enter', 'auto', 'tap'], shots: [0, 5], layout: true, focus: true });
  if (c1) {
    rec(c1.outcome === 0, 'every good read books the demo', c1.res.g);
    rec(c1.res.nw === 'New best' && c1.res.best === 'Best ' + c1.total.toLocaleString('en-IE'), 'the first call\'s score is the new best, on the report and the title', c1.res.nw + ' / ' + c1.res.best);
  }
  await wait(1200); await covered('.st-kr .res', 'the report (' + dev + ')'); await panelCheck('report', 'the report, ' + dev); await snapshot(P + 'krios-won-report');

  /* ---------------- call two: every misread, she hangs up ---------------- */
  const n1 = c1 && c1.name;
  await press('.st-kr .res [data-play]', 'Call again');
  rec(await until(() => window.__heloria.ST.kr.state === 'play', null, 60000), 'Call again starts a new call');
  { const s = await g(); rec(!!s && s.name !== n1, 'Call again rings someone else', n1 + ' then ' + (s && s.name)); }
  const c2 = await call('worst', { tag: 'call two (every misread)', id: 'hung', how: mobile ? ['tap'] : ['key', 'click'], skip: [0], adv: ['auto'], shots: [] });
  if (c2) rec(c2.outcome === 3 && /hung up/.test(c2.res.g) && +c2.res.stats[0][1].split(' / ')[1] < 6, 'misread after misread, she hangs up before the sixth turn', c2.res.stats[0][1]);
  await wait(1200); await snapshot(P + 'krios-hung-report');

  /* ---------------- call three: silence every turn ---------------- */
  await press('.st-kr .res [data-play]', 'Call again');
  rec(await until(() => window.__heloria.ST.kr.state === 'play', null, 60000), 'Call again starts a third call');
  const c3 = await call('none', { tag: 'call three (silence)', id: 'quiet', how: ['none'], skip: [0], adv: ['auto'], shots: [] });
  if (c3) rec(c3.outcome === 3 && c3.res.stats.find(x => x[0] === 'Dead air')[1] === '4' && /went quiet 4 times/.test(c3.res.p), 'four turns of dead air and she hangs up, and the report says you went quiet', c3.res.p);

  /* ---------------- call four: fair replies ---------------- */
  await press('.st-kr .res [data-play]', 'Call again');
  rec(await until(() => window.__heloria.ST.kr.state === 'play', null, 60000), 'Call again starts a fourth call');
  const c4 = await call('fair', { tag: 'call four (fair replies)', id: 'fair', how: mobile ? ['tap'] : ['numpad', 'click'], skip: [0, mobile ? 'tap' : 'space'], adv: ['auto', mobile ? 'tap' : 'enter'], shots: [] });
  if (c4) rec(c4.outcome === 1 || c4.outcome === 2, 'fair replies end in a follow-up or an email', c4.res.g);
  rec(tally.none[0] === 4, 'the silent call ran out the clock four times', String(tally.none[0]));
  for (const [k, v] of Object.entries(tally)) if (k !== 'none' && v[0] + v[1]) rec(v[1] === 0, 'replies by ' + k + ': every one landed as the call says', v[0] + ' of ' + (v[0] + v[1]));
  log('moved on by: ' + JSON.stringify(adv));
  { const fl = await H(() => [...window.__krT.flags.values()]); rec(fl.length === 0, 'nothing stuck, out of step or not a number in four calls', fl.join(' | ')); }
  { const L = await H(() => [...window.__krT.lines]); log('lines heard: ' + L.length); }

  /* ---------------- leaving: Back to orbit, then the Orbit button and Escape in the middle of a call ---------------- */
  await press('.st-kr .res [data-back]', 'Back to orbit');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Back to orbit leaves the station');
  rec(await H(h => !h.ST.kr._dbg.game), 'and leaves no call running');
  await H(() => window.__krT.freeze(false)); await wait(1500); await H(h => h.jump('kr')); await wait(2500);
  await H(() => window.__krT.freeze(true)); await press('.st-kr .go [data-play]', 'Play'); await until(() => window.__heloria.ST.kr.state === 'play', null, 60000); await H(() => window.__krT.untilPh('pick', 400));
  await press('#back', 'the Orbit button during a call');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'the Orbit button leaves in the middle of a call');
  rec(await H(h => !h.ST.kr._dbg.game && h.ST.kr.el.dataset.ph === 'idle' && !document.querySelector('#krOps').classList.contains('in')), 'and the call is put away');
  if (!mobile) {
    await H(() => window.__krT.freeze(false)); await wait(1500); await H(h => h.jump('kr')); await wait(2500);
    await H(() => window.__krT.freeze(true)); await press('.st-kr .go [data-play]', 'Play'); await until(() => window.__heloria.ST.kr.state === 'play', null, 60000); await H(() => window.__krT.untilPh('pick', 400));
    await page.keyboard.press('Escape');
    rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Escape leaves in the middle of a call');
    // Enter on the title starts a call
    await H(() => window.__krT.freeze(false)); await wait(1500); await H(h => h.jump('kr')); await wait(2500);
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await page.keyboard.press('Enter'); rec(await until(() => window.__heloria.ST.kr.state === 'play', null, 60000), 'Enter on the title starts a call');
    await H(h => { h.ST.kr.abort(); h.ST.kr.setState('menu'); });
  }

  /* ---------------- other screens: every line, reply and note of all three calls, the title and the report ---------------- */
  const sizes = mobile ? [[390, 844], [375, 667], [844, 390], [667, 375], [740, 360]] : [[1024, 700], [1366, 657], [1024, 768], [768, 1024], [900, 960], [1440, 900]];
  const callers = [0, 1, 2];
  for (const [w, hh] of sizes) {
    const tag = w + 'x' + hh;
    await H(() => window.__krT.freeze(false));
    await page.setViewportSize({ width: w, height: hh }); await wait(1200);
    await H(h => h.jump('kr')); await wait(2000);
    await covered('.st-kr .go', 'the title, ' + tag); await panelCheck('title', 'the title, ' + tag);
    const side = hh <= 520 && w / hh >= .9;
    if (side || tag === '1024x700') await snapshot(P + 'krios-title-' + tag);
    let total = 0; const bad = [];
    for (const ci of callers) {
      await H((h, i) => window.__krT.ring(i), ci); await H(() => window.__krT.freeze(true));
      if (ci === callers[0]) await press('.st-kr .go [data-play]', 'Play, ' + tag); else await press('.st-kr .res [data-play]', 'Call again, ' + tag);
      if (!(await until(() => window.__heloria.ST.kr.state === 'play', null, 60000))) { rec(false, 'a call starts, ' + tag); break; }
      if (ci === callers[0]) { // a real pick on this screen, then the screenshot of the replies and of the note
        await H(() => window.__krT.untilPh('pick', 600)); await H(() => window.__krT.step(3));
        await layoutCheck(tag + ', the first replies'); await covered('.st-kr .krops', 'the replies, ' + tag);
        await snapshot(P + 'krios-' + tag + '-replies');
        const k = await H(() => window.__krT.want('best')), pre = await g();
        if (mobile) await press('.st-kr .krop:nth-child(' + (k + 1) + ')', 'a reply, ' + tag); else await page.keyboard.press('Digit' + (k + 1));
        const post = await g(); rec(post.ph === 'show' && post.pick === k && post.score > pre.score, (mobile ? 'a tap' : 'a key') + ' picks the reply, ' + tag);
        await H(() => window.__krT.step(4)); await layoutCheck(tag + ', the first note'); await snapshot(P + 'krios-' + tag + '-note');
      }
      const r = await H((h, l) => window.__krT.sweep(l), tag);
      total += r.n; bad.push(...r.bad);
      rec(await until(() => document.querySelector('.st-kr').classList.contains('is-res'), null, 30000), 'the call ends on the report, ' + tag + ', call ' + (ci + 1));
      await H(() => window.__krT.freeze(false));
      if (ci === callers[callers.length - 1]) { await wait(1500); await panelCheck('report', 'the report, ' + tag); await covered('.st-kr .res', 'the report, ' + tag); if (side) await snapshot(P + 'krios-' + tag + '-report'); }
      else await wait(900);
    }
    rec(bad.length === 0, 'layout, ' + tag + ': every line, set of replies and coach note of all three calls fits (' + total + ' moments)', bad.slice(0, 12).join('; '));
    await press('.st-kr .res [data-back]', 'Back to orbit, ' + tag);
    rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Back to orbit leaves, ' + tag);
    await wait(1200);
  }
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
  await H(() => window.__krT.freeze(false));
  { const L = await H(() => [...window.__krT.lines]); rec(L.filter(x => x.endsWith(':w')).length >= 18, 'every warm line of all three calls was heard, and ' + L.filter(x => x.endsWith(':c')).length + ' of the 15 cool ones', L.length + ' distinct'); }

  const fails = results.filter(r => !r.ok);
  log('\nKRIOS (' + dev + '): ' + (results.length - fails.length) + ' of ' + results.length + ' passed, ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  fails.forEach(f => log('  FAIL ' + f.name + (f.detail ? '  (' + f.detail + ')' : '')));
};

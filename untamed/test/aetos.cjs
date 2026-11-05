/* Hold the Sky, played properly from the real Play button to the results, on a desktop or a phone:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/aetos --scenario untamed/test/aetos.cjs [--mobile]
   (a build of Aetos alone is quicker: python3 untamed/build.py --only ae --single /tmp/x/ae.html --inline-three)
   Headless frames are slow, so the station's clock is frozen and stepped by hand, 1/30 s at a time, between real inputs:
   clicks or taps on the tracks, on the rows of the table, the keys 1 to 8, the jam button and Space.
   Game one is played to win: identified hostiles are engaged from the top of the table, friendlies are left alone (and a
   click on one must be refused), swarms are jammed. After every action the state is checked. Game two is left to run with no
   defence until all three sites are down. Defend again must start clean, and Back to orbit, the Orbit button, Escape and
   Skip must each leave. Every wave is screenshotted to --out and its layout checked for overlaps. With --mobile the phone is
   then held sideways (844 x 390 and 667 x 375) for the title, a tap to engage, a tap to jam and the report; on a desktop the
   first visit's choices are checked on a 1024 x 700 screen. It ends on a line AETOS (desktop|phone): N of M passed. */
const results = [];
function rec(ok, name, detail) { results.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); }

module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '', dev = mobile ? 'phone' : 'desktop';
  // polled on a timer: a test that waited on animation frames would crawl, since a busy machine draws one every few seconds
  const until = (fn, arg, t = 60000) => page.waitForFunction(fn, arg, { timeout: t, polling: 250 }).then(() => true).catch(() => false);
  const frames = (n = 2) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const snapshot = async name => { await frames(2); await shot(name); };   // after a change, the first frame still shows the moment before it
  const at = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  /* a real click (or tap) at the middle of a control, once nothing else is over it there: what Playwright's own click checks,
     without its wait for the element to hold still over two frames */
  const press = async (sel, name) => {
    const look = () => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return { err: 'not found' }; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return { err: 'not shown' };
      const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { err: 'off the screen' };
      const top = document.elementFromPoint(x, y); if (!top || !(top === e || e.contains(top))) return { err: 'covered by ' + (top ? (top.id || String(top.className) || top.tagName) : 'nothing') }; return { x, y }; }, sel);
    // a fade that has just begun only moves on with the next frames, so a control that is not there yet gets a few more
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

  await H(h => h.jump('ae')); await wait(2500);
  /* the helpers that live in the page: stepping, the watcher that looks for anything stuck or wrong after every step, and the
     choice of what to do next. They choose; the scenario acts through the real inputs */
  await H(h => {
    const st = h.ST.ae, d = st._dbg, K = d.K;
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.textContent) window.__aeT.pops.push(n.textContent); }).observe(document.querySelector('#aePops'), { childList: true });
    const T = window.__aeT = {
      flags: new Map(), checks: [], later: [], jw: [], stale: new Map(), pops: [], seen: new Map(), unk: new Map(), waves: [], cur: null, lastWave: -2, mid: {}, msl: new Map(), tgtMiss: new Map(), hits: 0, misses: 0,
      flag(k, m) { if (!T.flags.has(k)) T.flags.set(k, m); },
      hostile: x => x.on && !x.demo && x.type !== 'friend',
      spd: x => Math.hypot(x.v.x, x.v.z),
      norm: x => K.TYPES[x.type].spd * (d.game ? 1 + d.game.wave * .08 : .75),
      clickable(x, y) { if (x < 14 || y < 14 || x > innerWidth - 14 || y > innerHeight - 14) return false; const e = document.elementFromPoint(x, y); return !!e && e.tagName === 'CANVAS'; },
      step(n, stop) { d.pause(false); try { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); T.watch(); if (stop && stop()) break; } } finally { d.pause(true); } },
      // a short record of the game per wave, and anything that goes wrong, looked at after every step
      watch() {
        const g = d.game, c = d.clk;
        if (g && (!T.cur || T.cur.wave !== g.wave)) { if (T.cur) T.cur.endWt = T.cur.lastWt; T.cur = { wave: g.wave, t0: c, score0: g.score, kills0: g.kills, leak0: g.leak, blue0: g.blue, jams0: g.jams, shots0: g.shots, spawn: {}, lastWt: 0 }; T.waves.push(T.cur); }
        if (g && T.cur) { const w = T.cur; w.lastWt = g.wt; w.t1 = c; w.score = g.score; w.kills = g.kills - w.kills0; w.leak = g.leak - w.leak0; w.blue = g.blue - w.blue0; w.jams = g.jams - w.jams0; w.shots = g.shots - w.shots0; w.left = d.D.filter(T.hostile).length; }
        if (!g && T.cur && !T.cur.over) { T.cur.over = true; T.cur.endWt = T.cur.lastWt; }
        // contacts: new ones counted per wave, vanished ones scored, the stuck and the unidentified flagged
        const vanished = [];
        for (const [k, e] of T.seen) { const x = d.D[e.i]; if (!x.on || x.id !== e.id) { vanished.push(e); T.seen.delete(k); } }
        for (const x of d.D) { if (!x.on || x.demo) continue; const k = x.i + ':' + x.id;
          if (!T.seen.has(k)) { T.seen.set(k, { i: x.i, id: x.id, type: x.type }); if (T.cur && g) T.cur.spawn[x.type] = (T.cur.spawn[x.type] || 0) + 1; }
          if (![x.p.x, x.p.y, x.p.z, x.v.x, x.v.z].every(Number.isFinite)) T.flag('nan' + k, 'contact ' + x.id + ' has a position that is not a number');
          if (!x.tk) T.flag('tk' + k, 'contact ' + x.id + ' has no track symbol on the screen');
          if (x.type !== 'friend' && x.age > 45) T.flag('old' + k, x.type + ' ' + x.id + ' still flying ' + x.age.toFixed(0) + ' s after it appeared');
          if (x.type === 'friend' && x.age > 30) T.flag('oldf' + k, 'friendly ' + x.id + ' still crossing after ' + x.age.toFixed(0) + ' s');
          const r = Math.hypot(x.p.x, x.p.z);
          if (x.cls === 'unk' && r < K.RS) { const s = T.unk.get(k); if (s === undefined) T.unk.set(k, c); else if (c - s > K.SWEEP + .3) T.flag('unk' + k, 'contact ' + x.id + ' still unidentified ' + (c - s).toFixed(1) + ' s inside the scope'); }
          else T.unk.delete(k); }
        for (const gp of d.GP) { if (gp.on && gp.n <= 0) T.flag('grp' + gp.id, 'swarm ' + gp.id + ' has no drones left but is still tracked'); if (gp.on && !gp.tk) T.flag('gtk' + gp.id, 'swarm ' + gp.id + ' has no track symbol'); }
        T.peak = Math.max(T.peak || 0, d.D.filter(x => x.on).length);
        // the table is rebuilt eight times a second, so a row may outlive its contact by that much, not more
        for (const r of d.ROWS) { const k = r.b, x = r.d, bad = !r.b.hidden && x && (!x.on || x.id !== r.id);
          if (!bad) T.stale.delete(k); else { if (!T.stale.has(k)) T.stale.set(k, c); else if (c - T.stale.get(k) > .3) T.flag('row' + x.id, 'a row stays on the table for a contact that is gone'); } }
        if (g && T.prev && T.prev.g === g) { const p = T.prev, dk = g.kills - p.kills, dl = g.leak - p.leak, db = g.blue - p.blue, ds = g.score - p.score;
          const gone = vanished.filter(e => e.type !== 'friend');
          if (dl === 0) { const exp = gone.reduce((a, e) => a + K.TYPES[e.type].pts, 0) - 400 * db; if (dk !== gone.length || ds !== exp) T.flag('score' + c.toFixed(2), 'score moved by ' + ds + ' for ' + dk + ' kills where ' + exp + ' was expected (' + gone.map(e => e.type).join(',') + ')'); }
          else if (dk + dl !== gone.length) T.flag('cnt' + c.toFixed(2), gone.length + ' hostiles vanished but ' + dk + ' kills and ' + dl + ' site hits were counted'); }
        T.prev = g ? { g, kills: g.kills, leak: g.leak, blue: g.blue, score: g.score } : null;
        // interceptors: each one either detonates on what it chased or is wasted; a contact that keeps being missed is flagged
        for (const m of d.MS) { const e = T.msl.get(m);
          if (m.live && m.tgt) T.msl.set(m, { tgt: m.tgt, id: m.tgt.id, hp: m.tgt.hp, live: true, demo: m.demo });
          else if (e && e.live && !m.live) { const x = e.tgt, hit = !x.on || x.id !== e.id || x.hp < e.hp || x.fall; if (!e.demo) { if (hit) T.hits++; else { T.misses++; const n = (T.tgtMiss.get(e.id) || 0) + 1; T.tgtMiss.set(e.id, n); if (n >= 3) T.flag('miss' + e.id, x.type + ' ' + e.id + ' missed by ' + n + ' interceptors'); } } T.msl.delete(m); } }
        for (const J of T.jw) for (const e of J.list) { const x = e.x;
          if (x.on && x.id === e.id) { if (x.fall) e.fell = true;
            if (x.jam > 0) { if (!e.jammed) { e.jammed = true; e.j0 = c; } if (c - e.j0 > .7 && x.type !== 'friend') e.slow = Math.max(e.slow || 0, T.spd(x) / T.norm(x)); }
            else if (e.jammed) { if (e.j1 === undefined) e.j1 = c; if (c - e.j1 > .5 && e.back === undefined) e.back = T.spd(x) / T.norm(x); } }
          else if (!e.gone) { e.gone = true; e.goneFirst = !e.fell && !e.jammed; } }
        // checks that fall due later (the jammer's effect, its recovery)
        for (let i = T.later.length - 1; i >= 0; i--) { const L = T.later[i]; if (c >= L.at) { T.later.splice(i, 1); let r; try { r = L.fn(); } catch (e) { r = { ok: false, detail: 'threw ' + e.message }; } T.checks.push({ name: L.name, ok: r.ok, detail: r.detail }); } }
      },
      // what needs doing now, if anything
      need(o) {
        const g = d.game; if (!g || st.state !== 'play') return { kind: 'over' };
        if (g.wave !== T.lastWave) return { kind: 'wave', wave: g.wave };
        if (g.phase === 'fight' && !T.mid[g.wave] && g.wt > K.WAVES[g.wave].dur * .5) return { kind: 'mid' };
        if (o.cdAt && d.clk >= o.cdAt) return { kind: 'jamcd' };
        if (g.jamCD <= 0 && g.jamT < 0) { let sw = 0, any = 0;
          for (const x of d.D) { if (!T.hostile(x) || x.fall) continue; if (Math.hypot(x.p.x, x.p.z) < K.JAMR - 1) { if (x.tti > 3.5 && !x.eng) any++; if (x.type === 'swarm') sw++; } }
          if (sw >= 3 || (o.jamScouts && any >= 1 && g.wave === 0)) return { kind: 'jam' }; }
        if (o.jamScouts && g.wave === 0) o.hold = true;   // in the first wave, hold fire until a scout is close enough to jam
        if (o.friend) for (const x of d.D) { if (!x.on || x.demo || x.cls !== 'fri' || !x.vis || !T.clickable(x.sx, x.sy)) continue; let clear = true;
          for (const y of d.D) if (y !== x && y.on && y.vis && Math.hypot(y.sx - x.sx, y.sy - x.sy) < 120) clear = false;
          for (const q of d.GP) if (q.on && q.vis && Math.hypot(q.sx - x.sx, q.sy - x.sy) < 120) clear = false;
          if (clear) return { kind: 'friend', i: x.i, id: x.id, x: x.sx, y: x.sy }; }
        let best = null, bt = 1e9;
        for (const x of d.D) { if (!T.hostile(x) || x.fall || x.cls !== 'hos' || x.eng >= x.hp || !x.vis) continue;
          if (x.type === 'swarm' && g.jamCD < 4 && !(x.grp && x.grp.dive)) continue;   // swarms are the jammer's, unless it is a long way off or they dive
          const t = x.grp && !x.grp.dive ? x.grp.tti : x.tti;
          if ((t > 2.5 && (x.jam > 0 || o.hold)) || (t > 1.5 && T.held(x))) continue;   // a jammed contact crawls and can wait (the test watches it slow and recover)
          if (t < bt) { bt = t; best = x; } }
        if (best && g.ammo < 1 && o.reload) return { kind: 'reload', i: best.i, id: best.id, x: best.sx, y: best.sy };
        if (best && g.ammo >= 1) return { kind: 'engage', i: best.i, id: best.id, type: best.type };
        return null;
      },
      // a contact the jammer caught is left alone until a moment after its jam wears off, unless it is about to strike
      held(x) { for (const J of T.jw) for (const e of J.list) if (e.x === x && e.id === x.id && e.jammed && (e.j1 === undefined || d.clk < e.j1 + .7)) return true; return false; },
      run(n, o) { for (let k = 0; k < n; k++) { const x = T.need(o); if (x) return x; T.step(1); } return { kind: 'idle' }; },
      snap() { const g = d.game; return g ? { shots: g.shots, ammo: g.ammo, jams: g.jams, jamCD: g.jamCD, jamT: g.jamT, score: g.score, live: d.MS.filter(m => m.live && !m.demo).length } : null; },
      // how to reach a contact: its spot on the screen if nothing is over it, and its row in the table
      reach(i, id) { const x = d.D[i]; if (!x.on || x.id !== id) return null;
        const row = d.ROWS.findIndex(r => !r.b.hidden && (r.d === x || (r.g && r.g === x.grp)) && r.b.getBoundingClientRect().height > 0);
        return { x: x.sx, y: x.sy, ok: T.clickable(x.sx, x.sy), row }; },
      newMissile(pre) { const ms = d.MS.filter(m => m.live && !m.demo); return ms.length > pre.live ? ms.map(m => m.tgt && { id: m.tgt.id, type: m.tgt.type, cls: m.tgt.cls }).filter(Boolean) : []; },
      /* the jammer: every contact on the scope when it fires is followed step by step (the watcher marks when one falls, is
         jammed or is gone), then judged once the front has passed, again when the fallen should be down, and when it wears off */
      jamArm(name) {
        const g = d.game, c = d.clk, J = { t0: c, list: [], j0: g.jammed, s0: g.score };
        for (const x of d.D) if (x.on && !x.demo && !x.fall) J.list.push({ x, id: x.id, type: x.type, r: Math.hypot(x.p.x, x.p.z) });
        T.jw.push(J);
        const alive = e => e.x.on && e.x.id === e.id, inside = e => e.r < K.JAMR - 1;
        T.later.push({ at: c + 1.6, name: name + ': every swarm drone inside the jammer falls, scouts and heavies are jammed, friendlies are not', fn() {
          const bad = [];
          for (const e of J.list) {
            if (e.type === 'friend') { if (e.fell || e.jammed) bad.push('friendly ' + e.id + ' jammed'); continue; }
            if (!inside(e) || e.goneFirst) continue;   // out of reach, or shot down before the front got there
            if (e.type === 'swarm') { if (!e.fell) bad.push('swarm ' + e.id + ' at ' + e.r.toFixed(1) + ' did not fall'); }
            else if (!e.jammed) bad.push(e.type + ' ' + e.id + ' at ' + e.r.toFixed(1) + ' not jammed'); }
          const fell = J.list.filter(e => e.fell).length, jm = J.list.filter(e => e.jammed && e.type !== 'friend').length;
          return { ok: !bad.length, detail: fell + ' swarm drones fell, ' + jm + ' scouts or heavies jammed' + (bad.length ? '; ' + bad.join(', ') : '') }; } });
        T.later.push({ at: c + 2.2, name: name + ': the jammed slow to under half speed', fn() {
          const L = J.list.filter(e => e.slow !== undefined), bad = L.filter(e => e.slow > .55);
          return { ok: !bad.length, detail: L.length ? 'fastest seen while jammed, as a share of full speed: ' + L.map(e => e.slow.toFixed(2)).join(' ') : 'none jammed long enough to measure' }; } });
        T.later.push({ at: c + 3.6, name: name + ': the swarm drones it brought down hit the ground and are counted', fn() {
          const F = J.list.filter(e => e.fell), still = F.filter(alive).length, gg = d.game;
          if (!gg) return { ok: true, detail: 'the game ended first' };
          return { ok: still === 0 && gg.jammed - J.j0 >= F.length, detail: F.length + ' fell, ' + still + ' still falling, downed by jammer +' + (gg.jammed - J.j0) + ', score ' + J.s0 + ' to ' + gg.score }; } });
        T.later.push({ at: c + 5.8, name: name + ': the jammed recover when it wears off', fn() {
          const stuck = J.list.filter(e => e.jammed && e.type !== 'friend' && alive(e) && e.x.jam > 0);
          const L = J.list.filter(e => e.back !== undefined), bad = L.filter(e => e.back < .7);
          T.jw.splice(T.jw.indexOf(J), 1);
          return { ok: !bad.length && !stuck.length, detail: (L.length ? 'speed a moment after it wore off: ' + L.map(e => e.back.toFixed(2)).join(' ') : 'none left to measure') + (stuck.length ? '; still jammed: ' + stuck.map(e => e.id).join(',') : '') }; } });
      },
      // the HUD at this moment: everything that should not overlap, and anything off the screen or too small to read
      layout() {
        const q = s => document.querySelector(s), vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
          for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
        const box = (n, e) => { const r = e.getBoundingClientRect(); return { n, l: r.left, t: r.top, r: r.right, b: r.bottom }; };
        const parts = [['wave', '#aeWave'], ['wave name', '#aeWaveN'], ['hint', '#aeHint'], ['threat', '#aeWarn'], ['score', '.st-ae .ae-score'], ['table', '.st-ae .ae-tbl'],
          ['interceptors', '.st-ae .ae-ammo'], ['jam', '#aeJam'], ['orbit button', '#back'], ['brand', '#chrome .brand']];
        const B = parts.filter(([, s]) => vis(q(s))).map(([n, s]) => box(n, q(s)));
        const bad = [];
        for (const b of B) if (b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) bad.push(b.n + ' runs off the screen');
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j];
          if (['wave', 'wave name'].includes(a.n) && ['wave', 'wave name'].includes(b.n)) continue;
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 1 && oy > 1) bad.push(a.n + ' overlaps ' + b.n); }
        // the scope and the three sites must sit clear of the table and the arm, where a tap could not reach them
        const ring = [], P = new h.ST.ae.scene.position.constructor();
        for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; P.set(Math.cos(a) * K.RS, 0, Math.sin(a) * K.RS).project(h.stCam); ring.push([(P.x * .5 + .5) * innerWidth, (-P.y * .5 + .5) * innerHeight]); }
        const sites = d.SITES.map(s => { P.copy(s.p).project(h.stCam); return [(P.x * .5 + .5) * innerWidth, (-P.y * .5 + .5) * innerHeight, s.name]; });
        const solid = B.filter(b => ['table', 'interceptors', 'jam', 'orbit button'].includes(b.n));
        for (const [x, y, n] of sites) for (const b of solid) if (x > b.l - 8 && x < b.r + 8 && y > b.t - 8 && y < b.b + 8) bad.push(n + ' sits under the ' + b.n);
        const inside = ring.filter(([x, y]) => solid.some(b => x > b.l && x < b.r && y > b.t && y < b.b)).length;
        if (inside > 2) bad.push(inside + ' of 48 points on the scope\'s edge are under the table or the arm');
        const rb = ring.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]);
        if (rb[0] < -2 || rb[2] > innerWidth + 2) bad.push('the scope is wider than the screen');
        // text in the HUD big enough to read
        const small = [...document.querySelectorAll('.st-ae .ghud *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 8).map(e => e.id || e.className || e.tagName);
        if (small.length) bad.push('text under 8 px: ' + [...new Set(small)].join(', '));
        return { bad, scope: rb.map(v => Math.round(v)), boxes: B.map(b => b.n + ' ' + [b.l, b.t, b.r, b.b].map(Math.round).join(',')) };
      },
    };
  });

  const W = (fn, arg) => H(fn, arg);
  const g = () => H(h => { const x = h.ST.ae._dbg.game; return x && { wave: x.wave, phase: x.phase, wt: +x.wt.toFixed(2), score: x.score, ammo: x.ammo, jamCD: +x.jamCD.toFixed(2), jams: x.jams, kills: x.kills, leak: x.leak, blue: x.blue, hostiles: x.hostiles, jammed: x.jammed, shots: x.shots, mhit: x.mhit }; });
  const flushChecks = async () => { const c = await H(() => { const c = window.__aeT.checks; window.__aeT.checks = []; return c; }); for (const x of c) rec(x.ok, x.name, x.detail); return c; };
  const layoutCheck = async label => { const L = await H(() => window.__aeT.layout()); rec(L.bad.length === 0, 'layout, ' + label + ': nothing overlaps, everything readable and on the screen', L.bad.join('; ') || ('scope ' + L.scope.join(','))); return L; };
  const hudText = () => page.evaluate(() => ({ wave: document.querySelector('#aeWave').textContent, name: document.querySelector('#aeWaveN').textContent, score: document.querySelector('#aeScore').textContent,
    jam: document.querySelector('#aeJamT').textContent, cd: document.querySelector('#aeJam').classList.contains('cd'), banner: [...document.querySelectorAll('#aeBanner span.ui,#aeBanner h3')].map(e => e.getAttribute('aria-label') || e.textContent).join(' / '), hint: document.querySelector('#aeHint').className }));

  /* ---------------- game one: played to win ---------------- */
  await snapshot(P + 'aetos-0-title');
  await covered('.st-ae .go', 'the title');
  const play = '.st-ae .go [data-play]';
  await press(play, 'Play');
  rec(await until(() => window.__heloria.ST.ae.state === 'play', null, 60000), 'Play starts the game (' + dev + ')');
  await H(h => h.ST.ae._dbg.pause(true));
  { const s = await g(); rec(!!s && s.wave === 0 && s.phase === 'brief' && s.score === 0 && s.ammo === 6 && s.jamCD === 0, 'the game opens on wave 1, briefing, score 0, six interceptors, jammer ready', JSON.stringify(s)); }

  const tally = { click: [0, 0], tap: [0, 0], row: [0, 0], key: [0, 0] }, jamTally = { key: [0, 0], button: [0, 0] }, notes = [];
  let engN = 0, jamN = 0, staleDone = false, friendDone = false, friendRowDone = false, reloadDone = false, cdAt = 0, cdDone = false, jamShot = false, jamScoutsDone = false;
  const methods = mobile ? ['tap', 'row'] : ['click', 'row', 'key'], jamMethods = mobile ? ['button'] : ['key', 'button'];
  const t0 = Date.now();
  async function playGame(defend) {
    let guard = 0;
    for (;;) {
      if (++guard > 4000) { rec(false, 'the game ends by itself', 'gave up after 4000 decisions'); break; }
      const clk = await H(h => h.ST.ae._dbg.clk);
      const n = defend ? await H((h, o) => window.__aeT.run(90, o), { jamScouts: !jamScoutsDone, friend: !friendDone, reload: !reloadDone, cdAt: cdDone ? 0 : cdAt })
        : await H(() => { const T = window.__aeT, st = window.__heloria.ST.ae, d = st._dbg; T.step(900, () => !d.game || d.game.wave !== T.lastWave); return d.game ? (d.game.wave !== T.lastWave ? { kind: 'wave', wave: d.game.wave } : { kind: 'idle' }) : { kind: 'over' }; });
      if (n.kind === 'over') break;
      if (n.kind === 'idle') { const c = await H(h => h.ST.ae._dbg.clk); if (c > 260) { rec(false, 'the game ends by itself', 'still going at ' + c.toFixed(0) + ' s'); break; } continue; }
      if (n.kind === 'wave') {
        await H((h, w) => { window.__aeT.lastWave = w; }, n.wave);
        const s = await g(), hud = await hudText();
        rec(s.phase === 'brief' && new RegExp('Wave ' + (n.wave + 1)).test(hud.banner), 'wave ' + (n.wave + 1) + ' starts with its briefing and banner', hud.banner);
        await H(h => window.__aeT.step(1));
        const hud2 = await hudText();
        rec(hud2.wave === 'Wave ' + (n.wave + 1) + ' / 3', 'the wave counter reads Wave ' + (n.wave + 1) + ' / 3', hud2.wave + ', ' + hud2.name);
        if (defend) { await H(h => { h.S.stSnap = true; }); await snapshot(P + 'aetos-w' + (n.wave + 1) + '-start'); }
        if (defend) await layoutCheck('wave ' + (n.wave + 1) + ' start, ' + dev);
        continue;
      }
      if (n.kind === 'mid') {
        await H((h, w) => { window.__aeT.mid[w] = true; }, (await g()).wave);
        const s = await g(); await snapshot(P + 'aetos-w' + (s.wave + 1) + '-mid'); await layoutCheck('wave ' + (s.wave + 1) + ' half way, ' + dev);
        // a row whose contact has gone and whose slot a new contact took (the pools are reused) must not fire at the newcomer
        if (!staleDone) { const k = await H(h => { const R = h.ST.ae._dbg.ROWS, i = R.findIndex(r => !r.b.hidden && r.d && r.b.getBoundingClientRect().height > 0); if (i >= 0) R[i].d.id += 1000; return i; });
          if (k >= 0) { staleDone = true; const pre = await H(() => window.__aeT.snap());
            await press('#aeRows .ae-row:nth-child(' + (k + 1) + ')', 'a row gone stale');
            const post = await H(() => window.__aeT.snap()); await H((h, k) => { h.ST.ae._dbg.ROWS[k].d.id -= 1000; }, k);
            rec(post.shots === pre.shots && post.live === pre.live, 'a row whose track is gone does not fire at the contact that took its place', JSON.stringify({ shots: post.shots, live: post.live })); } }
        continue;
      }
      if (n.kind === 'jam' || n.kind === 'jamcd') {
        const pre = await H(() => window.__aeT.snap()), hud = await hudText();
        const how = jamMethods[jamN++ % jamMethods.length];
        if (n.kind === 'jam') rec(hud.jam === 'Jam' && !hud.cd, 'the jam button reads Jam when it is ready', hud.jam);
        await page.evaluate(() => document.querySelector('#aeJam').classList.remove('no'));
        if (how === 'key') await page.keyboard.press('Space'); else await press('#aeJam', 'the jam button');
        const post = await H(() => window.__aeT.snap()), hud2 = await hudText(), nudged = await page.evaluate(() => document.querySelector('#aeJam').classList.contains('no'));
        if (n.kind === 'jamcd') {
          cdDone = true;
          rec(post.jams === pre.jams && Math.abs(post.jamCD - pre.jamCD) < 1e-6 && nudged && pre.jamCD > 0, 'jam while it recharges (' + (how === 'key' ? 'Space' : mobile ? 'tap' : 'click') + ') is refused: no jam, the countdown carries on, the button shakes', JSON.stringify({ pre: pre.jamCD.toFixed(2), post: post.jamCD.toFixed(2), jams: post.jams, nudged, txt: hud2.jam }));
          rec(/^\d+ s$/.test(hud2.jam) && hud2.cd, 'while it recharges the button shows the seconds left', hud2.jam);
          continue;
        }
        const ok = post.jams === pre.jams + 1 && Math.abs(post.jamCD - 10) < 1e-6 && post.jamT >= 0;
        jamTally[how][ok ? 0 : 1]++;
        if (!ok) rec(false, 'jam by ' + how + ' fires', JSON.stringify({ pre, post }));
        else {
          const s = await g(); await H((h, nm) => window.__aeT.jamArm(nm), 'jam ' + (s.jams) + ' in wave ' + (s.wave + 1) + ' (' + (how === 'key' ? 'Space' : mobile ? 'tap' : 'click') + ')');
          if (!jamScoutsDone && s.wave === 0) jamScoutsDone = true;
          if (!cdAt) cdAt = (await H(h => h.ST.ae._dbg.clk)) + 2;
          if (!jamShot) { jamShot = true; await H(h => window.__aeT.step(12)); await snapshot(P + 'aetos-jam'); }
          await H(h => window.__aeT.step(1)); const hud3 = await hudText();
          if (jamN <= jamMethods.length) rec(/^10 s$|^9 s$/.test(hud3.jam) && hud3.cd, 'after a jam the button counts down from 10 s', hud3.jam);
        }
        await flushChecks();
        continue;
      }
      if (n.kind === 'friend') {
        friendDone = true;
        const pre = await H(() => window.__aeT.snap());
        await H(() => { window.__aeT.pops = []; });
        await at(n.x, n.y);
        const post = await H(() => window.__aeT.snap()), pop = await H(() => window.__aeT.pops.join(','));
        rec(post.shots === pre.shots && post.ammo === pre.ammo && post.live === pre.live && /friendly/i.test(pop), (mobile ? 'a tap' : 'a click') + ' on an identified friendly is refused: nothing fires', JSON.stringify({ shots: post.shots, ammo: post.ammo, pop }));
        if (!friendRowDone) {
          const row = await H(h => h.ST.ae._dbg.ROWS.findIndex(r => !r.b.hidden && r.d && r.d.cls === 'fri' && r.b.getBoundingClientRect().height > 0));
          if (row >= 0) { friendRowDone = true; const pre2 = await H(() => window.__aeT.snap());
            await press('#aeRows .ae-row:nth-child(' + (row + 1) + ')', 'a friendly row');
            const post2 = await H(() => window.__aeT.snap());
            rec(post2.shots === pre2.shots && post2.ammo === pre2.ammo, 'the row of a friendly is refused too', JSON.stringify(post2)); }
        }
        continue;
      }
      if (n.kind === 'reload') {
        reloadDone = true;
        const r = await H((h, a) => window.__aeT.reach(a.i, a.id), n);
        if (r && r.ok) { const pre = await H(() => { window.__aeT.pops = []; return window.__aeT.snap(); }); await at(r.x, r.y); const post = await H(() => window.__aeT.snap()), pop = await H(() => window.__aeT.pops.join(','));
          rec(post.shots === pre.shots && post.live === pre.live && /reloading/i.test(pop), 'with no interceptor left a click is refused: Reloading', pop); }
        else reloadDone = false;
        await H(h => window.__aeT.step(1));
        continue;
      }
      if (n.kind === 'engage') {
        const r = await H((h, a) => window.__aeT.reach(a.i, a.id), n); if (!r) { await H(h => window.__aeT.step(1)); continue; }
        let how = methods[engN++ % methods.length];
        if ((how === 'click' || how === 'tap') && !r.ok) how = r.row >= 0 ? 'row' : '';
        else if (how === 'row' && r.row < 0) how = r.ok ? methods[0] : '';
        else if (how === 'key' && !(r.row >= 0 && r.row < 8)) how = r.ok ? 'click' : '';
        if (!how) { notes.push('contact ' + n.id + ' had neither a clear spot nor a row'); await H(h => window.__aeT.step(1)); continue; }
        const pre = await H(() => window.__aeT.snap());
        if (how === 'click' || how === 'tap') await at(r.x, r.y);
        else if (how === 'row') await press('#aeRows .ae-row:nth-child(' + (r.row + 1) + ')', 'row ' + (r.row + 1));
        else await page.keyboard.press('Digit' + (r.row + 1));
        const post = await H(() => window.__aeT.snap()), nm = await H((h, pre) => window.__aeT.newMissile(pre), pre);
        const ok = post.shots === pre.shots + 1 && post.ammo === pre.ammo - 1 && nm.length > 0 && nm.every(x => x.type !== 'friend');
        tally[how][ok ? 0 : 1]++;
        if (!ok) rec(false, 'engage ' + n.type + ' ' + n.id + ' by ' + how, JSON.stringify({ pre, post, nm, r }));
        await H(h => window.__aeT.step(2));
        continue;
      }
    }
  }
  await playGame(true);
  await flushChecks();
  { const left = await H(() => { const T = window.__aeT, n = T.later.length; T.later = []; T.jw = []; return n; }); if (left) log(left + ' jammer checks fell due after the game ended and were dropped'); }
  const w1 = await H(() => window.__aeT.waves.map(w => ({ wave: w.wave + 1, secs: +(w.t1 - w.t0).toFixed(1), endWt: +(w.endWt || 0).toFixed(1), spawn: w.spawn, kills: w.kills, leak: w.leak, blue: w.blue, jams: w.jams, shots: w.shots, left: w.left, score: w.score })));
  log('\nGAME ONE (' + dev + '), per wave:'); w1.forEach(w => log('  ' + JSON.stringify(w)));
  rec(w1.length === 3, 'all three waves were played', w1.length + ' waves');
  w1.forEach((w, i) => { const dur = [22, 24, 26][i];
    rec(w.endWt > 0 && w.endWt <= dur + 14.2, 'wave ' + w.wave + ' ends (after ' + w.endWt + ' s of fighting' + (w.endWt > dur + 13.9 ? ', on the time limit' : ', cleared') + ')');
    rec(i === 0 ? w.score > 0 : w.score > w1[i - 1].score, 'the score rises through wave ' + w.wave, String(w.score)); });
  { const want = [{ scout: 9, friend: 4 }, { scout: 6, friend: 3, swarm: 25 }, { scout: 6, friend: 3, swarm: 20, heavy: 5 }];
    w1.forEach((w, i) => { const ok = Object.keys(want[i]).every(k => w.spawn[k] === want[i][k]); rec(ok, 'wave ' + w.wave + ' brings in all it should', JSON.stringify(w.spawn)); }); }
  for (const [k, v] of Object.entries(tally)) if (v[0] + v[1]) rec(v[1] === 0, 'engage by ' + k + ': every one fires at a hostile', v[0] + ' of ' + (v[0] + v[1]));
  for (const [k, v] of Object.entries(jamTally)) if (v[0] + v[1]) rec(v[1] === 0, 'jam by ' + (k === 'key' ? 'Space' : mobile ? 'tapping the button' : 'clicking the button') + ': every one fires', v[0] + ' of ' + (v[0] + v[1]));
  rec(friendDone, 'a friendly was offered as a target and refused');
  const end1 = await H(() => { const T = window.__aeT; return { flags: [...T.flags.values()], hits: T.hits, misses: T.misses, peak: T.peak }; });
  log('most contacts in the air at once: ' + end1.peak);
  rec(end1.flags.length === 0, 'nothing stuck, unidentified, miscounted or unhittable in game one', end1.flags.join(' | '));
  rec(end1.hits > 0 && end1.misses <= Math.max(2, end1.hits * .1), 'interceptors hit what they chase', end1.hits + ' hits, ' + end1.misses + ' wasted');
  if (notes.length) log('notes: ' + notes.join('; '));

  // the results
  rec(await until(() => document.querySelector('.st-ae').classList.contains('is-res'), null, 30000), 'the game ends on the results');
  const res1 = await page.evaluate(() => ({ g: document.querySelector('#aeG').getAttribute('aria-label') || document.querySelector('#aeG').textContent, s: document.querySelector('#aeFinal').textContent, stats: [...document.querySelectorAll('#aeStats div')].map(e => e.textContent), p: document.querySelector('#aeP').textContent }));
  log('results:', JSON.stringify(res1));
  rec(!/sky lost/i.test(res1.g) && +res1.s.replace(/\D/g, '') > 0, 'game one is won', res1.g + ', ' + res1.s);
  rec(res1.stats.length === 6 && res1.stats.some(s => /Downed by jammer/.test(s)), 'the results list six figures, the jammer\'s among them', res1.stats.join(' | '));
  await wait(1500); await covered('.st-ae .res', 'the results (' + dev + ')'); await snapshot(P + 'aetos-results-won');

  /* ---------------- Defend again, then game two with no defence ---------------- */
  await press('.st-ae .res [data-play]', 'Defend again');
  rec(await until(() => window.__heloria.ST.ae.state === 'play', null, 60000), 'Defend again starts a new game');
  const resetCheck = async label => {
    await H(h => h.ST.ae._dbg.pause(true));
    const s = await H(h => { const d = h.ST.ae._dbg, x = d.game; return { wave: x.wave, phase: x.phase, score: x.score, kills: x.kills, leak: x.leak, blue: x.blue, ammo: x.ammo, jamCD: x.jamCD, jamT: x.jamT, jams: x.jams, shots: x.shots,
      sites: d.SITES.map(s => s.hp), on: d.D.filter(y => y.on).length, groups: d.GP.filter(q => q.on).length, live: d.MS.filter(m => m.on).length, rows: d.ROWS.filter(r => !r.b.hidden).length }; });
    await H(h => window.__aeT.step(1)); const hud = await hudText(), warn = await page.evaluate(() => document.querySelector('#aeWarn').classList.contains('on'));
    rec(s.wave === 0 && s.phase === 'brief' && s.score === 0 && s.kills === 0 && s.leak === 0 && s.blue === 0 && s.ammo === 6 && s.jamCD === 0 && s.jamT === -1 && s.jams === 0 && s.shots === 0 && s.sites.every(v => v === 1) && s.on === 0 && s.groups === 0 && s.live === 0 && s.rows === 0,
      label + ': the new game starts clean', JSON.stringify(s));
    rec(hud.wave === 'Wave 1 / 3' && hud.score === '0' && hud.jam === 'Jam' && !hud.cd && !/gone/.test(hud.hint) && !warn, label + ': and so does the HUD', JSON.stringify(hud));
  };
  await resetCheck('after a win');
  await H(() => { const T = window.__aeT; T.waves = []; T.cur = null; T.lastWave = -2; T.flags.clear(); T.prev = null; T.mid = {}; T.later = []; T.checks = []; T.jw = []; });
  await playGame(false);
  rec(await until(() => document.querySelector('.st-ae').classList.contains('is-res'), null, 30000), 'left alone, the second game ends on the results');
  const w2 = await H(() => window.__aeT.waves.map(w => ({ wave: w.wave + 1, secs: +(w.t1 - w.t0).toFixed(1), spawn: w.spawn, leak: w.leak, left: w.left })));
  log('\nGAME TWO (' + dev + ', no defence), per wave:'); w2.forEach(w => log('  ' + JSON.stringify(w)));
  const res2 = await page.evaluate(() => ({ g: document.querySelector('#aeG').getAttribute('aria-label') || document.querySelector('#aeG').textContent, s: document.querySelector('#aeFinal').textContent, stats: [...document.querySelectorAll('#aeStats div')].map(e => e.textContent), p: document.querySelector('#aeP').textContent }));
  log('results:', JSON.stringify(res2));
  rec(/sky lost/i.test(res2.g) && res2.stats.some(s => /^0 \/ 3/.test(s)), 'with no defence the sky is lost: all three sites down', res2.g + ' | ' + res2.stats.join(' | '));
  const end2 = await H(() => [...window.__aeT.flags.values()]);
  rec(end2.length === 0, 'nothing stuck or miscounted in game two', end2.join(' | '));
  await wait(1500); await snapshot(P + 'aetos-results-lost');
  await press('.st-ae .res [data-back]', 'Back to orbit');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Back to orbit leaves the station');
  rec(await H(h => !h.ST.ae._dbg.game && h.ST.ae._dbg.D.every(x => !x.on)), 'and leaves nothing running behind it');

  /* ---------------- after a loss, Play again is clean; the Orbit button, Escape and Skip leave ---------------- */
  await wait(1500); await H(h => h.jump('ae')); await wait(2500);
  rec(await H(h => h.ST.ae._dbg.SITES.every(s => s.hp === 1)), 'back on the title after a loss, the three sites stand again');
  await press(play, 'Play after a loss'); rec(await until(() => window.__heloria.ST.ae.state === 'play', null, 60000), 'Play starts a game after a loss');
  await resetCheck('after a loss');
  await H(h => window.__aeT.step(150));
  await press('#back', 'the Orbit button during a game');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'the Orbit button leaves in the middle of a game');
  rec(await H(h => !h.ST.ae._dbg.game && h.ST.ae._dbg.D.every(x => !x.on || x.demo) && h.ST.ae._dbg.MS.every(m => !m.live || m.demo)), 'and the game is put away');
  if (!mobile) {
    await wait(1500); await H(h => h.jump('ae')); await wait(2500);
    await press(play, 'Play'); await until(() => window.__heloria.ST.ae.state === 'play', null, 60000);
    await H(h => { h.ST.ae._dbg.pause(true); window.__aeT.step(60); });
    await page.keyboard.press('Escape');
    rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Escape leaves in the middle of a game');
  }
  await wait(1500); await H(h => h.jump('ae')); await wait(1500);
  await H(h => { h.S.leadDock = true; h.ST.ae.el.classList.add('first'); document.documentElement.classList.add('firstdock'); }); await wait(1200);
  await covered('.st-ae .go', 'the first visit\'s choices');
  await press('.st-ae .first [data-back]', 'Skip, fly on');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Skip, fly on leaves for orbit');
  await H(h => { h.S.leadDock = false; h.ST.ae.el.classList.remove('first'); document.documentElement.classList.remove('firstdock'); });

  /* ---------------- the phone held sideways: the HUD in its own column, a tap engages, a tap jams, the report fits ---------------- */
  if (mobile) for (const [w, hh] of [[844, 390], [667, 375]]) {
    const tag = 'sideways ' + w + 'x' + hh;
    await page.setViewportSize({ width: w, height: hh }); await wait(1500);
    await H(h => h.jump('ae')); await wait(2500);
    await covered('.st-ae .go', 'the title, ' + tag); await snapshot(P + 'aetos-side-' + w + 'x' + hh + '-title');
    await H(h => h.ST.ae.el.classList.add('first')); await covered('.st-ae .go', 'the first visit\'s choices, ' + tag);
    { const o = await page.evaluate(() => { const a = document.querySelector('.st-ae .card').getBoundingClientRect(), b = document.querySelector('.st-ae .go').getBoundingClientRect(); return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1 && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1; });
      rec(!o, 'the first visit\'s choices sit clear of the title, ' + tag); }
    await snapshot(P + 'aetos-side-' + w + 'x' + hh + '-first'); await H(h => h.ST.ae.el.classList.remove('first'));
    await press(play, 'Play, ' + tag);
    if (!(await until(() => window.__heloria.ST.ae.state === 'play', null, 60000))) { rec(false, 'Play starts the game, ' + tag); continue; }
    await H(h => { h.ST.ae._dbg.pause(true); const T = window.__aeT; T.lastWave = 0; T.step(1, () => false); T.run(330, { jamScouts: false, friend: false, reload: false }); h.S.stSnap = true; });
    await frames(2); await layoutCheck(tag);
    const n = await H(h => window.__aeT.need({}));
    if (n && n.kind === 'engage') { const r = await H((h, a) => window.__aeT.reach(a.i, a.id), n);
      if (r && r.ok) { const pre = await H(() => window.__aeT.snap()); await at(r.x, r.y); const post = await H(() => window.__aeT.snap());
        rec(post.shots === pre.shots + 1, 'a tap on a hostile engages it, ' + tag); } }
    { const pre = await H(() => window.__aeT.snap()); await press('#aeJam', 'the jam button, ' + tag); const post = await H(() => window.__aeT.snap());
      rec(post.jams === (pre.jamCD > 0 ? pre.jams : pre.jams + 1), 'a tap on the jam button jams, ' + tag, JSON.stringify({ pre: pre.jams, post: post.jams })); }
    await H(h => window.__aeT.step(12)); await covered('.st-ae .ghud', 'the HUD, ' + tag); await snapshot(P + 'aetos-side-' + w + 'x' + hh);
    await H(h => h.ST.ae._dbg.end()); await wait(1500);
    await covered('.st-ae .res', 'the report, ' + tag);
    rec(await page.evaluate(() => { const r = document.querySelector('.st-ae .res').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && document.querySelector('.st-ae .res').scrollHeight <= document.querySelector('.st-ae .res').clientHeight + 1; }), 'the report fits on the screen without scrolling, ' + tag);
    await snapshot(P + 'aetos-side-' + w + 'x' + hh + '-report');
    await press('.st-ae .res [data-back]', 'Back to orbit, ' + tag);
    rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Back to orbit leaves, ' + tag);
    await wait(1500);
  }
  // a smaller desktop or a tablet held sideways: the first visit's three wide choices must not run over the title's words
  if (!mobile) {
    await page.setViewportSize({ width: 1024, height: 700 }); await wait(1500);
    await H(h => h.jump('ae')); await wait(2500); await H(h => h.ST.ae.el.classList.add('first'));
    await covered('.st-ae .go', 'the first visit\'s choices, 1024x700');
    { const o = await page.evaluate(() => { const a = document.querySelector('.st-ae .card .lede').getBoundingClientRect(), b = document.querySelector('.st-ae .go').getBoundingClientRect(); return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1 && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1; });
      rec(!o, 'the first visit\'s choices sit clear of the title, 1024x700'); }
    await snapshot('aetos-first-1024x700'); await H(h => h.ST.ae.el.classList.remove('first'));
    await page.setViewportSize({ width: 1280, height: 800 });
  }
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await H(h => h.ST.ae._dbg.pause(false));

  const fails = results.filter(r => !r.ok);
  log('\nAETOS (' + dev + '): ' + (results.length - fails.length) + ' of ' + results.length + ' passed, ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  fails.forEach(f => log('  FAIL ' + f.name + (f.detail ? '  (' + f.detail + ')' : '')));
};

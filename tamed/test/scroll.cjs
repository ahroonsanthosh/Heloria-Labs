/* The feel of the scroll, measured. The page's own frame loop is stopped and the walk is driven on a clock of the test's
   own, 60 frames a second, fed the streams real hands and devices send: a Windows mouse (100 px a notch), Firefox (3 lines
   a notch), a Mac mouse (small accelerated steps), a Mac trackpad (a swipe and then its long fading tail), a key, the menu,
   and on a phone (--mobile) a finger's swipes, flicks and drags. For each it records the hand's target, the walk's place
   and the path position every frame and reports:
     back   how far the walk moved against the hand (path units, and metres of camera) while or after it scrolled one way
     over   how far it went past the place it came to rest on, before coming back
     stall  the longest time the hand kept scrolling while the walk did not move on, and how much of the input was ignored
     n      how many notches or swipes a place takes to leave
     rest   where it came to rest, and how long after the hand stopped
     dip    a hesitation: the walk slowing and speeding up again on its way, against its fastest
   and checks what the walk promises: it never goes against the hand, one gesture takes you one place on and no further,
   and scrolling steadily on takes you all the way. (It uses window.__tamed.tick, one frame of the hand and the walk, and
   SC.live, which gives the scroll the live site's timing rather than the slow test browser's.)
   node tamed/test/run.cjs --lowq --scenario tamed/test/scroll.cjs --out <dir> [--mobile] [--json <file>] */
const fs = require('fs');
module.exports = async ({ page, log, check, mobile }) => {
  await page.evaluate(() => {
    const t = window.__tamed, SC = t.SC, S = t.S, DT = 1 / 60;
    let vt = performance.now() / 1000; performance.now = () => vt * 1000;   // the input code reads the time from here
    window.requestAnimationFrame = () => 0;                                   // and the page's own loop stops
    SC.live = true;                                                           // the scroll keeps the live site's timing
    const stopsN = () => t.state().stops.length;
    const reset = k => { t.jump(t.state().stops[k]); Object.assign(SC, { inertia: 0, touch: null, glide: null, pin: false, dir: 1, base: k, turn: k, k: 2.6 });
      vt += 8; SC.lastIn = vt - 8; };
    const fire = e => {
      if (e.type === 'wheel') window.dispatchEvent(new WheelEvent('wheel', { deltaX: 0, deltaY: e.d, deltaMode: e.m || 0, cancelable: true, bubbles: true }));
      else if (e.type === 'key') window.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, bubbles: true, cancelable: true }));
      else if (e.type === 'travel') t.travel(e.id);
      else { const ty = { down: 'pointerdown', move: 'pointermove', up: 'pointerup' }[e.type];
        (e.on ? document.querySelector(e.on) : document.body).dispatchEvent(new PointerEvent(ty, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: 195, clientY: e.y, button: 0, buttons: e.type === 'up' ? 0 : 1, bubbles: true })); }
    };
    /* run a list of input events from stop k; record every frame until `after` seconds past the last event */
    window.__sim = { stopsN,
      run(k, evs, after = 6) {
        reset(k); const t0 = vt, end = (evs.length ? evs[evs.length - 1].at : 0) + after, R = { T: [], G: [], V: [], S: [], P: [], E: [] }; let i = 0;
        for (let f = 0; f * DT <= end + 1e-9; f++) {
          vt = t0 + f * DT;
          while (i < evs.length && evs[i].at <= f * DT + 1e-9) { const e = evs[i], g0 = SC.target; fire(e); R.E.push([f, e.dir || 0, e.type, g0, SC.target, e.d || e.y || 0]); i++; }
          const s = t.tick(DT), w = t.walkAt(SC.v);
          R.T.push(f * DT); R.G.push(SC.target); R.V.push(SC.v); R.S.push(s); R.P.push(w.p);
        }
        return R;
      },
      /* how much the picture changes per unit of scroll along the walk (the pace's own measure) */
      pace(step = .01) { const n = stopsN(), out = [];
        const ch = (A, B) => { const d0 = A.t.map((x, j) => x - A.p[j]), d1 = B.t.map((x, j) => x - B.p[j]), l0 = Math.hypot(...d0), l1 = Math.hypot(...d1);
          const turn = Math.acos(Math.max(-1, Math.min(1, d0.reduce((a, x, j) => a + x * d1[j], 0) / (l0 * l1)))), go = Math.hypot(...A.p.map((x, j) => x - B.p[j])) / Math.max(2, (l0 + l1) / 2);
          return turn + .75 * go + Math.abs(B.f - A.f) / Math.max(1, A.f); };
        for (let v = 0; v < n - 1 - 1e-9; v += step) out.push([+v.toFixed(3), ch(t.walkAt(v), t.walkAt(Math.min(n - 1, v + step))) / step]);
        return out; } };
  });

  const N = await page.evaluate(() => window.__sim.stopsN()), STOPS = (await page.evaluate(() => window.__tamed.state().stops));
  const run = (k, evs, after) => page.evaluate(([k, evs, after]) => window.__sim.run(k, evs, after), [k, evs, after]);
  const R = {};   // everything measured, for the report

  /* ---- the hands ---- */
  const seq = (n, every, mk, t0 = 0) => Array.from({ length: n }, (_, i) => ({ at: +(t0 + i * every).toFixed(4), ...mk(i) }));
  const win = (dir, n = 1, every = .035, t0 = 0) => seq(n, every, () => ({ type: 'wheel', d: 100 * dir, m: 0, dir }), t0);
  const fox = (dir, n = 1, every = .035, t0 = 0) => seq(n, every, () => ({ type: 'wheel', d: 3 * dir, m: 1, dir }), t0);
  const macMouse = (dir, n = 4, t0 = 0) => seq(n, .045, i => ({ type: 'wheel', d: [4, 6, 10, 16, 24, 30, 36][Math.min(6, i)] * dir, m: 0, dir }), t0);
  /* a trackpad: the fingers' stroke (a rise and fall over about 0.17 s), then the fading tail after they lift */
  const pad = (dir, peak, t0 = 0) => { const E = [], A = 10; let at = t0;
    for (let i = 0; i < A; i++) { const d = peak * Math.sin(Math.PI * (i + .5) / (A + 2)); E.push({ at: +at.toFixed(4), type: 'wheel', d: +(d * dir).toFixed(1), m: 0, dir }); at += 1 / 60; }
    let d = peak * Math.sin(Math.PI * (A + .5) / (A + 2)); while (d > .5) { E.push({ at: +at.toFixed(4), type: 'wheel', d: Math.max(1, Math.round(d)) * dir, m: 0, dir }); at += 1 / 60; d *= .955; }
    return E; };
  /* a finger on a phone: down, moved by dy (up the screen is forward) over `dur` seconds, then lifted (after a still `hold`) */
  const swipe = (dy, dur, t0 = 0, hold = 0, y0 = 600) => { const E = [{ at: t0, type: 'down', y: y0, dir: 0 }], n = Math.max(2, Math.round(dur * 60));
    for (let i = 1; i <= n; i++) E.push({ at: +(t0 + i / 60).toFixed(4), type: 'move', y: +(y0 - dy * i / n).toFixed(1), dir: Math.sign(dy) });
    E.push({ at: +(t0 + n / 60 + hold + 1 / 120).toFixed(4), type: 'up', y: y0 - dy, dir: Math.sign(dy) }); return E; };
  const cat = (...L) => L.flat().sort((a, b) => a.at - b.at);
  /* swipes one after another: the fingers coming down again stop the last swipe's tail (as a Mac does) */
  const pads = (d, peak, every, n) => cat(...Array.from({ length: n }, (_, i) => pad(d, peak, i * every).filter(e => i === n - 1 || e.at < (i + 1) * every - 1e-6)));

  /* ---- what a run felt like ---- */
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const nearStop = v => Math.round(v);
  const feel = (r, k) => {
    const n = r.T.length, ev = r.E;
    /* the hand's direction at each frame: that of its latest input */
    let back = 0, backM = 0, ext = r.S[0], extI = 0, H = 0, j = 0, lastInF = -1e9;
    let stall = 0, stallRun = 0, ign = 0, tot = 0;
    for (let f = 0; f < n; f++) {
      while (j < ev.length && ev[j][0] <= f) { if (ev[j][1] && ev[j][1] !== H) { H = ev[j][1]; ext = r.S[f]; extI = f; } lastInF = ev[j][0];
        if (ev[j][2] === 'wheel') { tot += 1; if (Math.abs(ev[j][4] - ev[j][3]) < 1e-6) ign += 1; }   // a notch that moved nothing
        j++; }
      if (!H) continue;
      const s = r.S[f];
      if (H * (s - ext) > 0) { ext = s; extI = f; }
      const ret = H * (ext - s); if (ret > back) { back = ret; backM = dist(r.P[extI], r.P[f]); }
      /* the hand still scrolling (an input in the last 0.1 s) while the walk does not move on its way */
      const active = (f - lastInF) <= 6 && !(H > 0 ? r.G[f] >= N - 1 : r.G[f] <= 0), moving = f > 0 && H * (r.S[f] - r.S[f - 1]) > 1e-5;   // (not counting a hand still going at either end)
      if (active && !moving) { stallRun++; stall = Math.max(stall, stallRun); } else stallRun = 0;
    }
    const lastEv = ev.length ? ev[ev.length - 1][0] : 0, endV = r.V[n - 1], rest = nearStop(endV);
    let restT = null; for (let f = lastEv; f < n; f++) { if (Math.abs(r.V[f] - rest) < .005 && Math.abs(r.G[f] - rest) < .005) { restT = (f - lastEv) / 60; break; } }
    /* a hesitation: the walk slowing and then speeding up again on its way, against its fastest */
    let dip = 0; { const f0 = ev.length ? ev[0][0] : 0, f1 = restT == null ? n - 1 : lastEv + Math.round(restT * 60), sp = [];
      for (let f = f0 + 1; f <= f1; f++) sp.push(Math.abs(r.V[f] - r.V[f - 1]) * 60);
      if (sp.length > 2) { const peak = Math.max(1e-9, ...sp), suf = sp.slice(); for (let i = sp.length - 2; i >= 0; i--) suf[i] = Math.max(sp[i], suf[i + 1]);
        let run = 0; for (let i = 0; i < sp.length; i++) { run = Math.max(run, sp[i]); dip = Math.max(dip, Math.min(run, suf[i]) - sp[i]); } dip /= peak; } }
    /* overshoot: past the place it came to rest on, in the way it was going */
    const dirTo = Math.sign(rest - k) || H || 1; let over = 0;
    for (let f = 0; f < n; f++) over = Math.max(over, dirTo * (r.S[f] - STOPS[rest]));
    return { places: rest - k, back: +back.toFixed(4), backM: +backM.toFixed(2), over: +over.toFixed(4), stall: +(stall / 60).toFixed(2), ignored: tot ? +(ign / tot).toFixed(2) : 0, restT: restT == null ? null : +restT.toFixed(2), dip: +dip.toFixed(2), endV: +endV.toFixed(3) };
  };
  const fmt = o => Object.entries(o).map(([a, b]) => a + ' ' + b).join(', ');

  /* ---- one gesture from every place, both ways ---- */
  const G = mobile ? {
    'swipe 380 px in 0.16 s': d => swipe(380 * d, .16),
    'flick 120 px in 0.08 s': d => swipe(120 * d, .08),
    'slow drag 300 px over 0.9 s': d => swipe(300 * d, .9),
    'drag 250 px, hold still 0.25 s, lift': d => swipe(250 * d, .25, 0, .25),
    'small drag 40 px': d => swipe(40 * d, .2),
    'swipe 380 px starting on a link': d => swipe(380 * d, .16).map(e => ({ ...e, on: e.type === 'down' ? '.view' : null })),
    'tiny drag 14 px': d => swipe(14 * d, .15),
  } : {
    'mouse: 1 notch': d => win(d, 1),
    'mouse: flick of 3 notches': d => win(d, 3),
    'mouse: flick of 7 notches': d => win(d, 7),
    'Firefox: flick of 3 notches (lines)': d => fox(d, 3),
    'Mac mouse: flick (small accelerated steps)': d => macMouse(d, 5),
    'trackpad: tiny touch': d => pad(d, .9),
    'trackpad: gentle swipe': d => pad(d, 4),
    'trackpad: light swipe': d => pad(d, 22),
    'trackpad: normal swipe': d => pad(d, 45),
    'trackpad: strong fling': d => pad(d, 110),
  };
  R.one = {};
  for (const [name, mk] of Object.entries(G)) {
    const rows = [];
    for (let k = 0; k < N; k++) for (const d of [1, -1]) { if (k + d < 0 || k + d > N - 1) continue;
      const r = await run(k, mk(d), 7); rows.push({ k, d, ...feel(r, k) }); }
    const worst = key => rows.reduce((a, b) => (Math.abs(b[key]) > Math.abs(a[key]) ? b : a));
    const placesSet = [...new Set(rows.map(x => x.places * x.d))].sort();
    const sum = { moves: placesSet.join('/'), backMax: worst('back').back, backAt: worst('back').k + (worst('back').d > 0 ? '+' : '-'), backM: worst('back').backM, overMax: worst('over').over, stallMax: Math.max(...rows.map(x => x.stall)), ignoredMax: Math.max(...rows.map(x => x.ignored)), restT: Math.max(...rows.map(x => x.restT == null ? 99 : x.restT)), dipMax: Math.max(...rows.map(x => x.dip)) };
    R.one[name] = { sum, rows };
    log('ONE  ' + name.padEnd(42) + fmt(sum));
  }

  /* ---- how many inputs a place takes to leave, at an unhurried rhythm ---- */
  const H = mobile ? {
    'swipes of 60 px, 1 a second': (d, n) => cat(...Array.from({ length: n }, (_, i) => swipe(60 * d, .15, i))),
  } : {
    'mouse: 1 notch every 0.8 s': (d, n) => win(d, n, .8),
    'mouse: 1 notch every 0.3 s': (d, n) => win(d, n, .3),
    'Firefox: 1 notch every 0.8 s': (d, n) => fox(d, n, .8),
    'Mac mouse: 1 small step every 0.5 s': (d, n) => seq(n, .5, () => ({ type: 'wheel', d: 4 * d, m: 0, dir: d })),
    'Mac mouse: 1 small step every 1.5 s': (d, n) => seq(n, 1.5, () => ({ type: 'wheel', d: 4 * d, m: 0, dir: d })),
    'Mac mouse: steps every 0.15 s': (d, n) => seq(n, .15, () => ({ type: 'wheel', d: 4 * d, m: 0, dir: d })),
    'trackpad: gentle swipes, 1 a second': (d, n) => pads(d, 4, 1, n),
  };
  R.leave = {};
  for (const [name, mk] of Object.entries(H)) {
    const per = [];
    let backMax = 0;
    for (const k of (mobile ? [0, 2, 4, 5, 6] : [0, 2, 4, 5])) {
      let need = null;
      for (let n = 1; n <= 30; n = n < 6 ? n + 1 : n + 3) { const r = await run(k, mk(1, n), 6), f = feel(r, k); backMax = Math.max(backMax, f.back); if (f.places >= 1) { need = n; break; } }
      per.push(k + ':' + (need == null ? '>30' : need));
    }
    R.leave[name] = { per, backMax: +backMax.toFixed(4) };
    log('LEAVE ' + name.padEnd(40) + 'inputs to leave a place (from stop: n) ' + per.join(' ') + ', worst pull back on the way ' + backMax.toFixed(4));
  }

  /* ---- the whole walk, scrolling steadily on, then back ---- */
  const L = mobile ? {
    'swipes of 380 px every 0.7 s': d => cat(...Array.from({ length: 14 }, (_, i) => swipe(380 * d, .16, i * .7))),
    'swipes of 380 px every 1.6 s': d => cat(...Array.from({ length: 9 }, (_, i) => swipe(380 * d, .16, i * 1.6))),
    'slow drags of 200 px, every 1.2 s': d => cat(...Array.from({ length: 16 }, (_, i) => swipe(200 * d, .6, i * 1.2))),
  } : {
    'mouse: 4 notches a second, steadily': d => win(d, 120, .25),
    'mouse: spun on, 12 notches a second': d => win(d, 120, 1 / 12),
    'mouse: flicks of 3 notches every 0.5 s': d => cat(...Array.from({ length: 24 }, (_, i) => win(d, 3, .035, i * .5))),
    'Firefox: flicks of 3 notches every 0.6 s': d => cat(...Array.from({ length: 24 }, (_, i) => fox(d, 3, .035, i * .6))),
    'trackpad: light swipes every 0.7 s (each cuts the last tail)': d => pads(d, 22, .7, 16),
    'trackpad: normal swipes every 0.8 s': d => pads(d, 45, .8, 14),
    'trackpad: strong flings every 1.2 s': d => pads(d, 110, 1.2, 10),
  };
  R.walk = {};
  for (const [name, mk] of Object.entries(L)) {
    for (const d of [1, -1]) {
      const k0 = d > 0 ? 0 : N - 1, r = await run(k0, mk(d), 6), f = feel(r, k0);
      /* when it reached each place */
      const reach = []; for (let s = 1; s < N; s++) { const target = d > 0 ? s : N - 1 - s; const fi = r.V.findIndex(v => Math.abs(v - target) < .02); reach.push(fi < 0 ? '-' : (fi / 60).toFixed(1)); }
      const res = { ...f, reached: reach.join(' ') };
      R.walk[name + (d > 0 ? ' forward' : ' back')] = res;
      log('WALK ' + (name + (d > 0 ? ' >' : ' <')).padEnd(62) + fmt(res));
    }
  }

  /* ---- a reversal: forward, then straight back ---- */
  {
    const evs = mobile ? cat(swipe(250, .25), swipe(-400, .3, .6)) : cat(win(1, 4, .035), win(-1, 4, .035, .5));
    const k = 2, r = await run(k, evs, 6), f = feel(r, k);
    const revAt = evs.find(e => e.dir < 0).at, fr = Math.round(revAt * 60);
    let turn = null; for (let i = fr; i < r.S.length - 1; i++) if (r.S[i + 1] < r.S[i] - 1e-5) { turn = (i - fr) / 60; break; }
    R.reverse = { ...f, turnAfter: turn };
    log('REVERSE forward then back from stop ' + k + ': ' + fmt(R.reverse));
  }

  /* ---- a phone: the walk's speed as the finger lifts ---- */
  if (mobile) {
    const rows = []; R.liftK = [];
    for (const [dy, dur] of [[380, .16], [200, .2], [120, .08], [300, .9]]) {
      const evs = swipe(dy, dur), r = await run(2, evs, 4), up = Math.round(evs[evs.length - 1].at * 60);
      const sp = i => (r.V[i] - r.V[i - 1]) * 60, before = (sp(up) + sp(up - 1) + sp(up - 2)) / 3, after = (sp(up + 3) + sp(up + 4) + sp(up + 5)) / 3;
      R.liftK.push(after / before);
      rows.push(dy + 'px/' + dur + 's: ' + before.toFixed(2) + ' -> ' + after.toFixed(2) + ' places/s (x' + (after / before).toFixed(2) + ')');
    }
    R.lift = rows; log('LIFT walk speed just before and just after the finger lifts: ' + rows.join('; '));
  }

  /* ---- keys and the menu (desktop) ---- */
  if (!mobile) {
    const rows = [];
    for (const [nm, evs, k] of [['ArrowDown', [{ at: 0, type: 'key', key: 'ArrowDown', dir: 1 }], 2], ['ArrowUp', [{ at: 0, type: 'key', key: 'ArrowUp', dir: -1 }], 3],
      ['ArrowDown x2 quickly', [{ at: 0, type: 'key', key: 'ArrowDown', dir: 1 }, { at: .15, type: 'key', key: 'ArrowDown', dir: 1 }], 1],
      ['menu Team from Kríos', [{ at: 0, type: 'travel', id: 'team', dir: 1 }], 4], ['ArrowDown then a notch', [{ at: 0, type: 'key', key: 'ArrowDown', dir: 1 }, { at: .3, type: 'wheel', d: 100, dir: 1 }], 2],
      ['notch then ArrowDown', [{ at: 0, type: 'wheel', d: 100, dir: 1 }, { at: .3, type: 'key', key: 'ArrowDown', dir: 1 }], 2]]) {
      const r = await run(k, evs, 6); rows.push(nm + ': ' + fmt(feel(r, k)));
    }
    R.keys = rows; rows.forEach(x => log('KEYS ' + x));
  }

  /* ---- how much the picture changes per notch along the walk ---- */
  {
    const P = await page.evaluate(() => window.__sim.pace(.01));
    const segs = []; for (let k = 0; k < N - 1; k++) { const X = P.filter(([v]) => v >= k && v < k + 1).map(x => x[1]); const mn = Math.min(...X), mx = Math.max(...X), at = X[0], mean = X.reduce((a, b) => a + b, 0) / X.length;
      segs.push((STOPS[k] + '-' + STOPS[k + 1]) + ' at stop ' + (at / mean).toFixed(2) + ', min ' + (mn / mean).toFixed(2) + ', max ' + (mx / mean).toFixed(2)); }
    R.pace = segs; log('PACE picture change per notch against the segment mean: ' + segs.join('; '));
  }

  if (process.argv.includes('--json')) { const p = process.argv[process.argv.indexOf('--json') + 1]; fs.writeFileSync(p, JSON.stringify(R, null, 1)); log('wrote ' + p); }
  /* the feel the walk promises */
  /* (a graze, less than the walk's dead zone, may step back to its place by a hair: it must not move a place) */
  const GRAZE = /tiny/, ones = Object.entries(R.one).filter(([n]) => !GRAZE.test(n)).map(x => x[1].sum), grazes = Object.entries(R.one).filter(([n]) => GRAZE.test(n)).map(x => x[1].sum);
  check(ones.every(x => x.backMax < .004), 'one gesture never pulls the walk back (worst ' + Math.max(...ones.map(x => x.backMax)).toFixed(4) + ')');
  check(grazes.every(x => x.moves === '0' && x.backMax < .05), 'a graze stays on its place, stepping back at most a hair (' + grazes.map(x => x.moves + ' ' + x.backMax + ' / ' + x.backM + ' m').join(', ') + ')');
  check(ones.every(x => x.moves.split('/').every(m => Math.abs(+m) <= 1)), 'one gesture never moves more than one place');
  check(ones.every(x => x.moves === '1'), 'every gesture beyond a graze takes you one place on, the way it went');
  check(Object.values(R.leave).every(x => x.per.every(p => +p.split(':')[1] <= 2)), 'no place takes more than two inputs to leave');
  if (mobile) check(R.liftK.every(k => k > .7), 'the walk keeps its speed as the finger lifts (' + R.liftK.map(k => 'x' + k.toFixed(2)).join(', ') + ')');
  check(Object.values(R.walk).every(x => x.back < .004), 'scrolling steadily on never pulls the walk back (worst ' + Math.max(...Object.values(R.walk).map(x => x.back)).toFixed(4) + ')');
  check(Object.values(R.walk).every(x => x.reached.split(' ').every(x => x !== '-')), 'scrolling steadily on reaches the end');
};

/* The way down: from the moment Land's page opens, the rocket is coming down through the cloud, while Earth is built behind
   it; once Earth is ready the cloud closes in white and opens on the landing. Run on its own (it watches the page from its
   first moment, which the usual helper does not):
     node untamed/test/descent.cjs dist/untamed.html [--mobile] [--real-autoplay] [--reduced] [--cpu 4] [--swc]
   --real-autoplay  the browser's own rule (come straight here, or Safari): the cloud waits, drifting, under the name and
                    "Click to land" / "Tap to land", and the first click brings it down with its sound
   --reduced        a visitor who has asked for less motion: the cloud does not stream past, and all the rest is the same
   --cpu 4          the page four times slower, as a phone is
   --swc            the browser puts the page together on a thread of its own (as on a computer with a graphics card), so
                    the cloud's movement can be watched apart from Earth's shaders being made
   What is checked: Land is in its daylight from its very first picture (never black first); the way down begins at once,
   and the cloud is moving, faster as it begins; the way down is heard (the cloud's recording, as loud as the landing's
   recording is as it begins); it is not left before Earth is ready, nor before it has been long enough to be a way down;
   the cloud closes in the landing's own white and the landing begins under it, in the same white, held until the cloud has
   gone; the landing's own recording is heard from its start, the cloud's let go; the page has no errors. And the tests'
   straight way onto Earth (earth()) is never followed by a landing of its own. */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const argv = process.argv.slice(2), html = path.resolve(argv.find(a => !a.startsWith('--')) || 'dist/untamed.html');
const has = k => argv.includes('--' + k), val = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const mobile = has('mobile'), real = has('real-autoplay'), reduced = has('reduced'), cpu = +val('cpu', 1);
let pass = 0, fail = 0; const failed = [];
const rec = (ok, name, info) => { if (ok) pass++; else { fail++; failed.push(name); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  (' + (typeof info === 'string' ? info : JSON.stringify(info)) + ')' : '')); };
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    real ? '--autoplay-policy=document-user-activation-required' : '--autoplay-policy=no-user-gesture-required'].concat(has('swc') ? ['--disable-gpu-compositing'] : []) });
  const vp = mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 };
  const ctx = await b.newContext(Object.assign({ viewport: vp, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' }, mobile ? { isMobile: true, hasTouch: true } : {}));
  /* watched from the page's first moment: Land's colour as it is first drawn, and every change of the way down's state, the
     landing's and the flash's, with the time it happened */
  await ctx.addInitScript(() => {
    const M = window.__D = { first: null, ev: [], flash: [] }; const seen = new Set();
    const note = (k, extra) => { if (seen.has(k)) return; seen.add(k); M.ev.push([k, Math.round(performance.now()), extra === undefined ? null : extra]); };
    document.addEventListener('DOMContentLoaded', () => { const l = document.getElementById('load'); M.first = { html: document.documentElement.className, bg: l ? getComputedStyle(l).backgroundColor : null, body: getComputedStyle(document.body).backgroundColor }; });
    const tick = () => { const h = window.__heloria, l = document.getElementById('load');
      if (l) for (const c of ['idle', 'ask', 'desc', 'out', 'gone', 'off']) if (l.classList.contains(c)) note(c);
      if (h) { if (h.S.ready) note('ready'); if (h.S.mode === 'landing') note('landing');
        const c = h.ST.cr && h.ST.cr._dbg && h.ST.cr._dbg.cut ? h.ST.cr._dbg.cut() : null; if (c && c.on) note('cut', +(c.t || 0).toFixed(2));
        if (M.ev.some(e => e[0] === 'out') && !M.ev.some(e => e[0] === 'off')) M.flash.push([Math.round(performance.now()), +h.post.uniforms.uFlash.value.toFixed(3), l && l.classList.contains('gone') ? 1 : 0]); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  if (cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  /* (what the test asks the page must not count as a click: a plain evaluation that is not a gesture) */
  const cdpQ = await ctx.newCDPSession(page);
  const Q = async expr => { const r = await cdpQ.send('Runtime.evaluate', { expression: '(' + expr + ')()', returnByValue: true, userGesture: false, awaitPromise: true }); return r.result ? r.result.value : undefined; };
  const until = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await Q(expr)) return true; await W(100); } return false; };
  const ev = async () => (await Q('() => window.__D.ev')) || [];
  const at = (E, k) => { const e = E.find(x => x[0] === k); return e ? e[1] : null; };
  await page.goto('file://' + html, { timeout: 300000 });

  /* 1. its daylight from the first picture */
  await until('() => !!window.__D.first', 20000);
  const first = await Q('() => window.__D.first');
  rec(first && /\blanding\b/.test(first.html) && first.bg === 'rgb(234, 244, 244)', 'Land is in its daylight from its very first picture, as the front door hands over (never black first)', first);

  /* 2. the way down begins (or, where the sound is held, the cloud drifts and the name waits) */
  if (!real) {
    rec(await until("() => window.__D.ev.some(e => e[0] === 'desc')", 30000), 'the way down begins by itself');
    const E = await ev(), tDesc = at(E, 'desc'), tReady = at(E, 'ready');
    rec(tDesc !== null && (tReady === null || tDesc < tReady), 'it begins before Earth is ready: Earth is built while you come down', { desc: tDesc, ready: tReady });
    await W(900);
    const an = await Q("() => { const D = window.__heloria.DSC; return { mode: window.__heloria.S.mode, n: D.an.length, live: D.an.filter(a => a).map(a => ({ st: a.playState, rate: a.playbackRate, t: Math.round(a.currentTime || 0) })), out: D.out }; }");
    if (reduced) rec(an.live.length === 0, 'asked for less motion, the cloud does not stream past', an);
    else rec(an.live.length === 3 && an.live.every(a => a.st === 'running' && a.rate === 1), 'the cloud is moving, all three layers, at full speed once it has gathered it', an);
    const lp = await Q("() => window.__heloria.A._loops().find(l => l.name === 'cloud')");
    rec(lp && lp.ready && (lp.playing || lp.vol > 0), 'the way down is heard: the cloud\'s recording is playing', lp);
  } else {
    rec(await until("() => window.__D.ev.some(e => e[0] === 'ask')", 30000), 'where the browser holds the sound, the cloud waits, and the name says so');
    const q = await Q("() => ({ mode: window.__heloria.S.mode, boot: document.querySelector('#boot').textContent, op: +getComputedStyle(document.querySelector('#boot')).opacity, ctx: window.__heloria.A.ctx && window.__heloria.A.ctx.state, idle: document.querySelector('#load').classList.contains('idle'), rates: window.__heloria.DSC.an.filter(a => a).map(a => a.playbackRate) })");
    rec(q.mode === 'load' && q.boot === (mobile ? 'Tap to land' : 'Click to land') && q.op > .3 && q.ctx !== 'running' && q.idle && (reduced || q.rates.every(r => r < .1)), 'it says "' + q.boot + '", the cloud drifting slowly behind the name, and nothing comes down silent', q);
    await W(2500);
    rec((await Q("() => window.__heloria.S.mode")) === 'load', 'and goes on waiting');
    const cx = vp.width / 2, cy = vp.height / 2;
    if (mobile) await page.touchscreen.tap(cx, cy); else { await page.mouse.move(cx, cy); await page.mouse.click(cx, cy); }
    const a0 = await Q("() => ({ mode: window.__heloria.S.mode, desc: document.querySelector('#load').classList.contains('desc'), ask: !!window.__heloria.S.ask })");
    rec(a0.mode === 'landing' && a0.desc && !a0.ask, 'the first ' + (mobile ? 'tap' : 'click') + ' brings it down', a0);
    rec(await until("() => window.__heloria.A.ctx && window.__heloria.A.ctx.state === 'running'", 5000), 'and lets the sound start with it');
    await W(1200);
    const lp = await Q("() => window.__heloria.A._loops().find(l => l.name === 'cloud')");
    rec(lp && lp.ready && (lp.playing || lp.vol > 0), 'the way down is heard from then', lp);
  }

  /* 3. out of the cloud, onto the landing */
  rec(await until("() => window.__D.ev.some(e => e[0] === 'cut')", 300000), 'the landing begins');
  await until("() => window.__D.ev.some(e => e[0] === 'off')", 30000);
  const E = await ev(), T = k => at(E, k), D = await Q("() => { const D = window.__heloria.DSC; return { t0: Math.round(D.t0), t1: Math.round(D.t1), tr: Math.round(D.tr) }; }");
  console.log('times (ms from the page opening): ' + E.map(e => e[0] + ' ' + e[1]).join(', '));
  rec(T('out') !== null && T('ready') !== null && T('out') >= T('ready') && D.t1 >= D.tr, 'the cloud only opens once Earth is ready', { ready: D.tr, out: D.t1 });
  rec(D.t1 - D.t0 >= 2200 - 30, 'and the way down is long enough to be one (at least 2.2 s)', { down: D.t1 - D.t0 });
  rec(D.t1 - Math.max(D.tr, D.t0 + 2200) < 300, 'and no longer than it needs to be: out within a moment of Earth being ready', { late: D.t1 - Math.max(D.tr, D.t0 + 2200) });
  rec(T('cut') !== null && T('cut') > T('out') && T('cut') - T('out') < 3000, 'the landing begins under the white of the closing cloud', { out: T('out'), cut: T('cut') });
  const F = await Q('() => window.__D.flash');
  const beforeGone = F.filter(f => f[2] === 0 && f[0] > T('cut'));   // (from the frame after the landing's first: each frame reads the picture's white as the frame before set it)
  rec(beforeGone.length > 0 && beforeGone.every(f => f[1] >= .999), 'held in the same white until the cloud has gone (no picture shows through the cloud\'s white)', beforeGone.slice(0, 6));
  rec(T('off') !== null && T('off') - T('cut') < 4000, 'and the cloud is gone soon after', { cut: T('cut'), off: T('off') });
  const after = await Q("() => ({ land: window.__heloria.A.landClock(), cloud: window.__heloria.A._loops().find(l => l.name === 'cloud'), anims: window.__heloria.DSC.an.filter(a => a).map(a => a.playState), loadShown: getComputedStyle(document.querySelector('#load')).visibility })");
  rec(after.land !== null, 'the landing\'s own recording is heard from its start', { landClock: after.land });
  rec(after.cloud && after.cloud.vol < .5, 'and the cloud\'s recording is let go', after.cloud);
  rec(after.anims.every(s => s === 'idle'), 'the cloud\'s movement is stopped once it is gone', after.anims);
  rec(after.loadShown === 'hidden', 'nothing of the way down is left over the landing', after.loadShown);
  /* the two recordings: the cloud's as loud as the landing's is as it begins, so one goes into the other unheard */
  /* (the cloud's recording, as it plays: its two players cross over its overlaps, so it is as loud throughout as it is between
     them; its own level counts the overlaps at half) */
  const lv = await Q("() => { const env = window.__heloria.A._land(true), cl = window.__heloria.A._loops().find(l => l.name === 'cloud'); if (!env || !cl) return null; let q = 0, n = 0; for (let i = 3; i < 12; i++) { q += env[i] * env[i]; n++; } return { landStart: +Math.sqrt(q / n).toFixed(4), cloud: +(cl.rms / Math.sqrt(1 - cl.H / (cl.P + cl.H))).toFixed(4) }; }");
  const dB = lv ? 20 * Math.log10(lv.cloud / lv.landStart) : 99;
  rec(lv && Math.abs(dB) < 2.5, 'the cloud\'s recording is as loud as the landing\'s as it begins (within 2.5 dB)', Object.assign({ dB: +dB.toFixed(2) }, lv || {}));

  /* 4. the tests' straight way onto Earth never brings a landing after it */
  rec(errs.length === 0, 'no errors on the page', errs.slice(0, 4));
  const p2 = await ctx.newPage(); await p2.goto('file://' + html, { timeout: 300000 });
  const c2 = await ctx.newCDPSession(p2); const Q2 = async expr => { const r = await c2.send('Runtime.evaluate', { expression: '(' + expr + ')()', returnByValue: true, userGesture: false, awaitPromise: true }); return r.result ? r.result.value : undefined; };
  { const t0 = Date.now(); while (!(await Q2('() => !!(window.__heloria && window.__heloria.S.ready)')) && Date.now() - t0 < 300000) await W(150); }
  await Q2('() => window.__heloria.earth()'); await W(4000);
  const s2 = await Q2("() => ({ mode: window.__heloria.S.mode, cut: window.__heloria.ST.cr._dbg.cut().on, load: getComputedStyle(document.querySelector('#load')).visibility, cloud: window.__heloria.A._loops().find(l => l.name === 'cloud').vol })");
  rec(s2.mode === 'station' && !s2.cut && s2.load === 'hidden' && s2.cloud < .5, 'straight onto Earth (the tests\' way in): no landing comes after it, and the way down is put away', s2);

  console.log(`\nSUMMARY ${pass} passed, ${fail} failed` + (fail ? ': ' + failed.join('; ') : ''));
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });

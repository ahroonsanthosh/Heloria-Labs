#!/usr/bin/env node
/* Headless playtest helper (Chromium + SwiftShader, so it is slow: think 1 to 4 frames a second).
   node untamed/test/shot.cjs --html /tmp/x/kr.html --station kr --out /tmp/x/shots [--mobile] [--scenario s.cjs] [--settle 3000] [--hash land]
   Default: load, wait until ready, jump straight into the station, screenshot "menu".
   A scenario is a CommonJS module: module.exports = async ({page, shot, wait, H, vp, log}) => { ... }
     shot(name)            screenshot to <out>/<name>.png
     wait(ms)              sleep
     H(fn, arg)            page.evaluate(fn, arg) where fn receives (h=window.__heloria, arg)
*/
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) { const k = args[i].slice(2); const v = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[++i] : true; opt[k] = v; } }
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const out = opt.out || '/tmp/heloria-shots'; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const mobile = !!opt.mobile; const vp = mobile ? { width: 390, height: 844 } : { width: +(opt.w || 1280), height: +(opt.h || 800) };
  const ctx = await b.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { window.__TEST = true; });
  if (opt.hq) await ctx.addInitScript(() => { window.__HQ = true; });   // --hq: full-resolution black hole and sky, for stills
  /* --meter: whatever reaches the speakers is also read by an analyser, so a scenario can ask window.__meter() how loud
     the page is right now ({pk, db}); the page itself is not changed */
  if (opt.meter) await ctx.addInitScript(() => {
    const C = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (d, ...r) { const res = C.call(this, d, ...r);
      if (d instanceof AudioDestinationNode) { const c = this.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 4096; window.__meterCtx = c; } C.call(this, c.__an); }
      return res; };
    window.__meter = () => { const c = window.__meterCtx; if (!c || !c.__an) return { pk: 0, db: -200, state: 'none' }; const b = new Float32Array(c.__an.fftSize); c.__an.getFloatTimeDomainData(b);
      let pk = 0, sq = 0; for (const v of b) { pk = Math.max(pk, Math.abs(v)); sq += v * v; } const rms = Math.sqrt(sq / b.length); return { pk: +pk.toFixed(4), db: rms > 0 ? +(20 * Math.log10(rms)).toFixed(1) : -200, state: c.state }; };
  });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { errors.push('console: ' + m.text()); console.log('CONSOLE', m.text().slice(0, 300)); } });
  const shot = async n => { await page.screenshot({ path: path.join(out, n + '.png'), timeout: 240000 }); console.log('shot', path.join(out, n + '.png')); };
  const H = (fn, arg) => page.evaluate(([src, a]) => (0, eval)('(' + src + ')')(window.__heloria, a), [fn.toString(), arg]);
  const log = (...a) => console.log(...a);
  await page.goto('file://' + path.resolve(opt.html) + (opt.hash ? '#' + opt.hash : ''));   // --hash land / aetos: the other ways in
  await page.waitForFunction(() => window.__heloria && window.__heloria.S.ready, null, { timeout: 180000 });
  if (opt.station) { await H((h, id) => h.jump(id), opt.station); await W(+(opt.settle || 3000)); if (!opt.scenario) await shot((mobile ? 'm-' : '') + 'menu'); }
  if (opt.scenario) { const fn = require(path.resolve(opt.scenario)); await fn({ page, shot, wait: W, H, vp, log, mobile }); }
  console.log(errors.length ? 'ERRORS ' + errors.length : 'NO ERRORS');
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });

#!/usr/bin/env node
/* Headless harness for Heloria Tamed (Chromium + SwiftShader: slow, think 1 to 4 frames a second).
   node tamed/test/run.cjs --html dist/tamed.html --out /tmp/shots --scenario tamed/test/shots.cjs [--mobile] [--hq] [--w 1280 --h 800]
   A scenario is a CommonJS module: module.exports = async (h) => { ... } where h has:
     page, shot(name), wait(ms), T(fn,arg) (fn runs in the page with (t=window.__tamed, arg)), frames(n), settle(n), log, mobile, vp, errors, check(cond,msg)
   three.js is served from the repo's vendored copy (untamed/src/assets/vendor, read only) so the run does not depend on the CDN;
   fonts come through the network proxy when there is one. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) { const k = args[i].slice(2); const v = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[++i] : true; opt[k] = v; } }
const W = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.resolve(__dirname, '..', '..');
const THREE_LOCAL = path.join(ROOT, 'untamed', 'src', 'assets', 'vendor', 'three.min.js');
(async () => {
  const out = opt.out || '/tmp/tamed-shots'; fs.mkdirSync(out, { recursive: true });
  const launch = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] };
  if (process.env.HTTPS_PROXY) launch.proxy = { server: process.env.HTTPS_PROXY };
  const b = await chromium.launch(launch);
  const mobile = !!opt.mobile; const vp = mobile ? { width: +(opt.w || 390), height: +(opt.h || 844) } : { width: +(opt.w || 1280), height: +(opt.h || 800) };
  const ctx = await b.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { window.__TEST = true; });
  if (opt.hq) await ctx.addInitScript(() => { window.__HQ = true; });
  if (opt.lowq) await ctx.addInitScript(() => { window.__LOWQ = true; });
  await ctx.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(THREE_LOCAL, 'utf8') }));
  const page = await ctx.newPage(); const errors = []; const fails = [];
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { errors.push('console: ' + m.text()); console.log('CONSOLE', m.text().slice(0, 600)); } else if (opt.verbose) console.log('log', m.type(), m.text().slice(0, 300)); });
  page.on('popup', p => { console.log('POPUP', p.url()); });
  const shot = async n => { const p = path.join(out, (mobile ? 'm-' : '') + n + '.png'); await page.screenshot({ path: p, timeout: 300000 }); console.log('shot', p); return p; };
  const T = (fn, arg) => page.evaluate(([src, a]) => (0, eval)('(' + src + ')')(window.__tamed, a), [fn.toString(), arg]);
  const frames = async (n = 2) => { const f0 = await page.evaluate(() => window.__tamed.S.frame); await page.waitForFunction(([f0, n]) => window.__tamed.S.frame >= f0 + n, [f0, n], { timeout: 300000 }); };
  const settle = async (n = 3) => { await frames(n); };
  const check = (c, msg) => { if (c) console.log('PASS', msg); else { console.log('FAIL', msg); fails.push(msg); } };
  const log = (...a) => console.log(...a);
  const t0 = Date.now();
  await page.goto('file://' + path.resolve(opt.html || path.join(ROOT, 'dist', 'tamed.html')) + (opt.query ? '?' + opt.query : ''));
  await page.waitForFunction(() => window.__tamed && window.__tamed.S.ready, null, { timeout: 300000 });
  console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  if (opt.scenario) { const fn = require(path.resolve(opt.scenario)); await fn({ page, shot, wait: W, T, frames, settle, log, mobile, vp, errors, check, out, ctx }); }
  else { await settle(3); await shot('gate'); }
  console.log(errors.length ? 'ERRORS ' + errors.length : 'NO ERRORS');
  if (fails.length) console.log('FAILS ' + fails.length + ': ' + fails.join(' | ')); else console.log('ALL CHECKS PASSED');
  await b.close();
  process.exit(errors.length || fails.length ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(2); });

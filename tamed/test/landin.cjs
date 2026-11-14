/* Land opened inside the front door, the way Safari and Firefox on a computer have it (they do not carry the click on the
   front door over to Land's own page, so Land there would wait for a click of its own before it could be heard).
   node tamed/test/landin.cjs http://127.0.0.1:8800/        (the built site, docs/, served; any port)
   Here Chromium is made to take that way (window.__LANDIN) and to hold sound until a click on the page, as Safari does.
   The click on Land: the gate goes over to Land's light, and Land fills the page; the front door's sound, which that click
   let start, is Land's (the very same context, running); Land comes down by itself, with no click asked for and no
   "Click to land", heard from the start of the landing; the walk stops drawing; the address says /land where the site is
   the whole domain; Land's way home leaves it for the whole page; going back brings you to the front door. */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8800/';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=document-user-activation-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); await ctx.addInitScript(() => { window.__LANDIN = true; });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('frameattached', () => {});
  let pass = 0, fail = 0; const failed = []; const rec = (ok, n, i) => { if (ok) pass++; else { fail++; failed.push(n); } console.log((ok ? 'PASS ' : 'FAIL ') + n + (i ? '  (' + i + ')' : '')); };
  const W = ms => new Promise(r => setTimeout(r, ms));
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#gate') && document.querySelector('#gate').classList.contains('ready'), null, { timeout: 600000, polling: 250 });
  await W(1500);
  const box = await page.locator('#land').boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await W(400);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const f0 = await page.waitForFunction(() => !!document.querySelector('iframe[title="Land"]'), null, { timeout: 5000 }).then(() => true, () => false);
  rec(f0, 'the click on Land asks for Land inside this page');
  await page.waitForFunction(() => window.__tamed && window.__tamed.S.mode === 'land', null, { timeout: 15000 }).catch(() => {});
  const top = await page.evaluate(() => ({ mode: window.__tamed.S.mode, op: getComputedStyle(document.querySelector('iframe[title="Land"]')).opacity, path: location.pathname, url: location.href }));
  rec(top.mode === 'land', 'and shows it once the gate has gone over to its light: the walk stops', JSON.stringify(top));
  const fr = page.frames().find(f => f !== page.mainFrame() && /untamed/.test(f.url()));
  rec(!!fr, 'Land is there, in the page', fr && fr.url());
  await fr.waitForFunction(() => window.__heloria && window.__heloria.S.ready, null, { timeout: 600000, polling: 250 });
  const same = await page.evaluate(() => { const w = document.querySelector('iframe[title="Land"]').contentWindow; return { same: w.__heloria.A.ctx === window.__tamed.A.ctx, state: window.__tamed.A.ctx.state }; });
  rec(same.same && same.state === 'running', 'its sound is the front door\'s, already running', JSON.stringify(same));
  const went = await fr.waitForFunction(() => window.__heloria.S.mode !== 'load', null, { timeout: 15000, polling: 100 }).then(() => true, () => false);
  const ask = await fr.evaluate(() => ({ mode: window.__heloria.S.mode, ask: !!window.__heloria.S.ask, boot: document.querySelector('#boot').textContent }));
  rec(went && !ask.ask, 'it comes down by itself: no click asked for', JSON.stringify(ask));
  let land = null; { const t0 = Date.now(); while (Date.now() - t0 < 120000) { const q = await fr.evaluate(() => { const h = window.__heloria, c = h.ST.cr._dbg.cut(); return { on: c.on, t: +(c.t || 0).toFixed(2), land: h.A.landClock(), mode: h.S.mode }; }); if (q.on && q.land !== null) { land = q.t; break; } if (q.mode === 'station' && !q.on && q.t > 1) break; await W(120); } }
  rec(land !== null && land < 1.5, 'heard from the start of the landing', JSON.stringify({ firstHeardAt: land }));
  const links = await fr.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.target));
  rec(links.length > 0 && links.every(t => t === '_top'), 'Land\'s ways home leave it for the whole page', JSON.stringify(links));
  const drawn = await page.evaluate(() => new Promise(r => { const f0 = window.__tamed.S.frame; setTimeout(() => r({ f0, f1: window.__tamed.S.frame }), 1500); }));
  rec(drawn.f0 === drawn.f1, 'the walk is not drawn under it', JSON.stringify(drawn));
  if (/^\/(land)?$/.test(top.path) || top.path === '/land') rec(top.path === '/land', 'the address says /land', top.path);
  await page.goBack({ timeout: 60000 }).catch(() => {}); await W(3000);
  const backTo = await page.evaluate(() => ({ path: location.pathname, frame: !!document.querySelector('iframe[title="Land"]'), mode: window.__tamed && window.__tamed.S.mode }));
  rec(!backTo.frame, 'going back brings you to the front door again', JSON.stringify(backTo));
  rec(!errs.length, 'with no errors', errs.join(' | ').slice(0, 300));
  console.log(`RESULT ${pass} passed, ${fail} failed` + (failed.length ? ': ' + failed.join(' | ') : ''));
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });

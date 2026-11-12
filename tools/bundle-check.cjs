#!/usr/bin/env node
/* node tools/bundle-check.cjs /tmp/one   (after python3 tools/build.py --bundle /tmp/one) */
/* the one-artifact bundle, served locally: the front door's Land and the rocket at the end of the walk stay in the same tab
   and reach Land's page; any address of that page lands on Earth; its walk link comes back to the front door */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = process.argv[2];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
  let body = fs.readFileSync(f); if (p === '/index.html') body = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';   // the skeleton the artifact adds
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(body); });
let fails = 0; const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  (' + JSON.stringify(x) + ')' : '')); if (!c) fails++; };
srv.listen(0, async () => {
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/index.html'); await page.waitForTimeout(4000);
  const links = await page.evaluate(() => ['#tamed', '#land', '#rocket', '[data-land]'].map(q => [...document.querySelectorAll(q)].map(a => ({ q, href: a.href || '', target: a.getAttribute('target') }))).flat().filter(x => x.href));
  console.log(JSON.stringify(links, null, 1));
  ok(links.some(l => l.q === '#land' && l.href === base + '/untamed/index.html#land'), 'Land goes to its page, #land');
  ok(links.some(l => l.q === '#rocket' && l.href === base + '/untamed/index.html#land'), 'the rocket goes there too');
  ok(await page.evaluate(() => !document.querySelector('#untamed,[data-untamed],[data-rocket]')), 'no Fly, and nothing else that goes into orbit');
  ok(links.every(l => !l.target), 'none of them opens a new tab');
  for (const h of ['land', 'aetos', '']) {
    await page.goto('about:blank'); await page.goto(base + '/untamed/index.html' + (h ? '#' + h : ''));   // a fresh page each time, as from the front door
    await page.waitForFunction(() => window.__heloria && window.__heloria.S.ready, null, { timeout: 180000 });
    const s = await page.evaluate(() => ({ landing: document.documentElement.classList.contains('landing'), walk: document.querySelector('#finWalk').href, wt: document.querySelector('#finWalk').getAttribute('target'), begin: document.querySelector('#beginT').textContent }));
    ok(s.landing && /to land$/.test(s.begin), 'the page at ' + (h ? '#' + h : 'its own address') + ' lands on Earth', s);
    ok(s.walk === base + '/index.html' && !s.wt, 'its walk link comes back to the front door, same tab', s.walk);
  }
  ok(!errs.length, 'no page errors', errs);
  console.log(fails ? fails + ' FAILED' : 'BUNDLE OK');
  await b.close(); srv.close();
});

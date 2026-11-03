/* Serve the built site over HTTP under a sub-path (as GitHub Pages does, https://user.github.io/repo/) and check that
   both ways in boot with no missing files: Tamed at the front door, Untamed under untamed/, and the links between them.
   node tools/site-smoke.cjs [docsDir] */
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.resolve(process.argv[2] || 'docs'); const BASE = '/heloria/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith(BASE)) { res.writeHead(404); return res.end('outside base'); }
  let f = path.join(root, u.slice(BASE.length)); if (u.endsWith('/')) f = path.join(f, 'index.html');
  else if (fs.existsSync(f) && fs.statSync(f).isDirectory()) { res.writeHead(301, { location: u + '/' }); return res.end(); }
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(root, '404.html'))); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0, async () => {
  const port = srv.address().port, url = p => `http://localhost:${port}${BASE}${p}`; const bad = []; let fails = 0;
  const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  p.on('pageerror', e => bad.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') bad.push('console ' + m.text()); });
  /* the front door: Tamed */
  await p.goto(url(''), { timeout: 180000 });
  check(await p.waitForFunction(() => window.__tamed && window.__tamed.S.ready, null, { timeout: 240000 }).then(() => true).catch(() => false), 'Tamed boots at the front door, ' + BASE);
  const link = sel => p.evaluate(sel => { const a = document.querySelector(sel); return { href: a.href, target: a.getAttribute('target') }; }, sel);
  const way = await link('#untamed'), land = await link('#land'), rocket = await link('#rocket');
  check(way.href === url('untamed/') && !way.target, 'the gate\'s Fly way goes to untamed/ in the same tab (' + way.href + ')');
  check(land.href === url('untamed/#land') && !land.target, 'its Land way goes to untamed/#land in the same tab (' + land.href + ')');
  check(rocket.href === url('untamed/#aetos') && !rocket.target, 'the rocket at the end of the walk goes to untamed/#aetos in the same tab (' + rocket.href + ')');
  check(await p.evaluate(() => [...document.querySelectorAll('[data-untamed]')].every(a => /\/untamed\/$/.test(a.href))), 'every link to Fly points at untamed/');
  /* the other way in: Untamed */
  await p.goto(way.href, { timeout: 180000 });
  check(await p.waitForFunction(() => window.__heloria && window.__heloria.S.ready, null, { timeout: 240000 }).then(() => true).catch(() => false), 'Untamed boots at untamed/');
  const back = await p.evaluate(() => { const a = document.querySelector('#calm'); return a && { href: a.href, target: a.getAttribute('target') }; });
  check(back && back.href === url('') && !back.target, 'its Beacon station links back to the calm walk (' + (back && back.href) + ')');
  check(await p.evaluate(() => [...document.images].every(i => i.complete)) !== false, 'images there load');
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family));
  console.log('fonts loaded:', [...new Set(fonts)].join(', '));
  check(!bad.length, bad.length ? 'missing files or errors:\n  ' + bad.join('\n  ') : 'no missing files or errors in either site');
  /* and anywhere else: the lost-signal page */
  const r404 = await p.goto(url('nope/deeper')); check(r404.status() === 404 && /Lost signal/.test(await p.title()), 'an unknown address gets the 404 page');
  console.log(fails ? fails + ' FAILED' : 'ALL CHECKS PASSED');
  await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
});

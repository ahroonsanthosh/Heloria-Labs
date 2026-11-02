/* Serve docs/ over HTTP under a sub-path (like https://user.github.io/repo/) and check the site boots with no missing files.
   node tools/test/docs-smoke.cjs [docsDir] */
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.resolve(process.argv[2] || 'docs'); const BASE = '/heloria/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith(BASE)) { res.writeHead(404); return res.end('outside base'); }
  let f = path.join(root, u.slice(BASE.length)); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(root, '404.html'))); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0, async () => {
  const port = srv.address().port; const bad = [];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  p.on('pageerror', e => bad.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') bad.push('console ' + m.text()); });
  await p.goto(`http://localhost:${port}${BASE}`);
  const ok = await p.waitForFunction(() => window.__heloria && window.__heloria.S.ready, null, { timeout: 240000 }).then(() => true).catch(() => false);
  console.log(ok ? 'PASS boots from ' + BASE : 'FAIL did not boot');
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family));
  console.log('fonts loaded:', [...new Set(fonts)].join(', '));
  console.log(bad.length ? 'PROBLEMS\n  ' + bad.join('\n  ') : 'NO MISSING FILES OR ERRORS');
  const r404 = await p.goto(`http://localhost:${port}${BASE}nope/deeper`); console.log('custom 404 page:', r404.status(), await p.title());
  await b.close(); srv.close();
});

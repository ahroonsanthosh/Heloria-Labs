/* The site runs where it is meant to, and nowhere else (see LOCK in tools/build.py): the built site, docs/, served once and
   opened at two addresses of this machine. At the first (127.0.0.1, one of the addresses it allows for trying it out) the
   front door and Land run as ever; at the second (127.0.0.2, which it does not know) each page shows only where the real
   one is, and nothing of either starts.
     node tamed/test/lock.cjs http://127.0.0.1:8800/ http://127.0.0.2:8800/        (docs/ served on all addresses, any port) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const ok = process.argv[2] || 'http://127.0.0.1:8800/', away = process.argv[3] || 'http://127.0.0.2:8800/';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let pass = 0, fail = 0; const rec = (c, n, i) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? '  (' + i + ')' : '')); };
  const open = async url => { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(String(e && e.message || e))); await page.goto(url, { timeout: 120000 }); await page.waitForTimeout(4000);
    const s = await page.evaluate(() => ({ text: (document.body && document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160), gate: !!document.querySelector('#gate'),
      tamed: !!window.__tamed, land: !!window.__heloria, link: (document.querySelector('a[href="https://helorialabs.com"]') || {}).href || null }));
    await ctx.close(); return Object.assign(s, { errs }); };
  for (const [path, name] of [['', 'the front door'], ['untamed/', 'Land']]) {
    const a = await open(ok + path);
    rec((path ? a.land : a.tamed && a.gate) && !/copy of Heloria/.test(a.text), name + ' runs at an address it allows', JSON.stringify({ tamed: a.tamed, land: a.land, gate: a.gate }));
    const c = await open(away + path);
    rec(/This is a copy of Heloria Labs\./.test(c.text) && c.link === 'https://helorialabs.com/' && !c.tamed && !c.land && !c.gate, name + ' elsewhere shows only where the real one is, and does not start', JSON.stringify(c));
  }
  await b.close(); console.log('\nRESULT ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})();

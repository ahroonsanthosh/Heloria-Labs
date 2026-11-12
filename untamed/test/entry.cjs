/* The way in: Land, straight down to Earth. Every address of the page is Land, the old ones too (#land, and #aetos, where
   the rocket at the end of the walk used to go into orbit). Run once plain and once with an old address:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/entry --scenario untamed/test/entry.cjs
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/entry --scenario untamed/test/entry.cjs --hash aetos
   Earth is made behind the loader, every shader of it compiled, so nothing is made after it lets you in. */
module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const pre = (mobile ? 'm-' : '');
  let fails = 0; const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  (' + (typeof x === 'string' ? x : JSON.stringify(x)) + ')' : '')); if (!c) fails++; };
  const until = async (fn, ms = 60000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await H(fn, arg)) return true; await wait(250); } return false; };
  const hash = await page.evaluate(() => location.hash), tag = pre + 'entry' + (hash ? '-' + hash.slice(1) : '');
  const load = await page.evaluate(() => ({ bg: getComputedStyle(document.querySelector('#load')).backgroundColor, ink: getComputedStyle(document.querySelector('#mark')).color, begin: document.querySelector('#beginT').textContent, landing: document.documentElement.classList.contains('landing') }));
  log('loader', JSON.stringify(load), 'address', hash || '(none)');
  ok(await H(h => !!h.ST.cr && h.ST.cr.built), 'Earth is made before the loader lets you in');
  const progs0 = await H(h => h.renderer.info.programs.length);
  await wait(1400); await shot(tag + '-0-loader');
  const verb = mobile ? 'Swipe' : 'Scroll';
  ok(load.landing && /rgb\(234, 244, 244\)/.test(load.bg), 'it opens in the front door\'s daylight', load.bg);
  ok(/rgb\(42, 36, 29\)/.test(load.ink), 'with the word in ink', load.ink);
  ok(load.begin === verb + ' to land', 'its prompt says land', load.begin);
  await require('./begin.cjs')(page, mobile);
  ok(await until(h => h.S.mode === 'station' && h.S.stId === 'cr', 30000), 'it comes straight down onto Earth');
  ok(await H(h => h.ST.cr.el.classList.contains('cut')), 'with the rocket coming down');
  await wait(2500); await shot(tag + '-1-coming-down');
  ok(await until(() => getComputedStyle(document.querySelector('#load')).visibility === 'hidden' || getComputedStyle(document.querySelector('#load')).opacity === '0', 30000), 'the daylight opens onto the landing');
  await page.click('#crSkip').catch(() => {});
  ok(await until(h => !h.ST.cr.el.classList.contains('cut'), 30000), 'Skip lands you');
  const lines = await H(h => ({ a: h.ST.cr._dbg.people[0].lines[0], marks: Object.values(h.ST.cr._dbg.MK).every(m => m.st === 'on'), lede: document.querySelector('#crLede').textContent }));
  ok(lines.a === 'Oh, hello! Welcome to Earth.', 'Ahroon says hello', lines.a);
  ok(lines.marks, 'every landmark stands');
  ok(/landed/.test(lines.lede), 'the line on the screen says you have landed', lines.lede);
  const progs1 = await H(h => h.renderer.info.programs.length);
  ok(progs1 <= progs0 + 2, 'landing made (next to) no new shaders: Earth\'s were made behind the loader', progs0 + ' then ' + progs1);
  await wait(2500); await shot(tag + '-2-landed');
  /* the way home is in reach: a Home button by the name, and the name itself, to the front door; and nothing else up there */
  const home = await page.evaluate(() => { const a = document.querySelector('#home'), r = a && a.getBoundingClientRect(), b = document.querySelector('#chrome .brand'), top = a && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return a && { href: a.getAttribute('href'), brand: b && b.getAttribute('href'), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), shown: getComputedStyle(document.querySelector('#chrome')).opacity > .5, top: !!top && (top === a || a.contains(top)) }; });
  ok(!!home && home.shown && home.top && home.w >= 60 && home.h >= 30 && home.href && home.href === home.brand, 'a Home button is on the screen, on top, and goes home (as the name does)', home);
  ok(await page.evaluate(() => !document.querySelector('#back,#hub,#story,#toast')), 'no Orbit button, no orbit and no story on the page');
  await shot(tag + '-9-home');
  console.log(fails ? fails + ' FAILED' : 'ENTRY OK');
};

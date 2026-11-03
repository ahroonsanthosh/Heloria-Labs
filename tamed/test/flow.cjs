/* Functional walk-through with real input: every place by scroll (wheel or swipe), by the menu and by the
   press-and-hold index; project pages open, continue into the next and close; links point where they should.
   node tamed/test/run.cjs --lowq --scenario tamed/test/flow.cjs --out <dir> [--mobile] */
const UNTAMED = 'https://claude.ai/artifact/LudKe5Wd8ZGPv88m9A4MMn';
module.exports = async ({ page, shot, wait, T, frames, log, mobile, vp, check, ctx }) => {
  const st = () => T(t => t.state());
  const until = async (pred, desc, arg, timeout = 150000) => {
    try { await page.waitForFunction(([src, a]) => (0, eval)('(' + src + ')')(window.__tamed.state(), a), [pred.toString(), arg], { timeout, polling: 300 }); check(true, desc); return true; }
    catch (e) { check(false, desc + ' :: ' + JSON.stringify(await st())); return false; }
  };
  const at = (s) => until((x, s) => x.mode === 'world' && Math.abs(x.s - s) < .012 && Math.abs(x.v - x.target) < .01, 'arrived at s=' + s, s);
  const cdp = mobile ? await ctx.newCDPSession(page) : null;
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
  const swipe = async (dy, x = vp.width / 2, y0 = vp.height * .62) => {
    await touch('touchStart', [[x, y0]]); const n = 10;
    for (let i = 1; i <= n; i++) { await touch('touchMove', [[x, y0 - dy * i / n]]); await wait(16); }
    await touch('touchEnd', []);
  };
  const press = async (sel) => { if (mobile) await page.tap(sel); else await page.click(sel); };
  const sectionIn = () => page.evaluate(() => [...document.querySelectorAll('.sec.in')].map(e => e.dataset.place).join(','));

  /* ---- the gate ---- */
  check(await page.evaluate(() => !document.querySelector('#tamed').disabled), 'Tamed is enabled once ready');
  const un = await page.evaluate(() => { const a = document.querySelector('#untamed'); return { href: a.href, target: a.target, rel: a.rel }; });
  check(un.href === UNTAMED && un.target === '_blank' && /noopener/.test(un.rel), 'Untamed opens ' + UNTAMED + ' in a new tab');
  if (!mobile) {
    await page.hover('#untamed'); await wait(400); check(await page.evaluate(() => document.querySelector('#gate').classList.contains('dark')), 'hovering Untamed darkens the gate');
    await page.hover('#tamed'); await wait(400); check(await page.evaluate(() => document.querySelector('#gate').classList.contains('warm')), 'hovering Tamed warms the gate');
  }
  await press('#tamed');
  await until(x => x.mode === 'world', 'Tamed enters the walk');
  await until(x => !!x.audio && x.audio.state === 'running', 'the Tamed click unlocks the sound');
  check((await sectionIn()) === 'home', 'Home text is showing');
  await shot('flow-home');

  /* ---- every place by scrolling ---- */
  const stops = (await st()).stops;
  for (let i = 1; i < stops.length; i++) {
    if (mobile) await swipe(Math.min(vp.height * .5, 380));
    else { for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, 235); await wait(30); } }
    await at(stops[i]);
  }
  const last = await st(); check(last.place === 'contact', 'scrolling reaches Contact');
  check((await sectionIn()) === 'contact', 'Contact text is showing');
  const mail = await page.evaluate(() => document.querySelector('.mail').href); check(mail === 'mailto:contact@helorialabs.com', 'contact mailto is right');
  const q = await page.evaluate(() => { const a = document.querySelector('.contact .quiet'); return { href: a.href, target: a.target }; });
  check(q.href === UNTAMED && q.target === '_blank', 'Contact has the quiet link to untamed');
  await shot('flow-contact');
  /* back up by scrolling */
  if (mobile) await swipe(-380); else { for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, -235); await wait(30); } }
  await at(stops[stops.length - 2]);

  /* ---- the menu ---- */
  await press('#menu a[data-nav="team"]'); await at(5);
  check((await sectionIn()).includes('team'), 'menu Team shows the team');
  await press('#menu a[data-nav="projects"]'); await at(1);
  await press('#menu a[data-nav="contact"]'); await at(6);
  await press('#logo'); await at(0);

  /* ---- press and hold: the index ---- */
  const holdTo = async (id) => {
    const p = [vp.width * .5, vp.height * .56];
    if (mobile) { await touch('touchStart', [p]); await wait(950); }
    else { await page.mouse.move(p[0], p[1]); await page.mouse.down(); await wait(950); }
    const ok = await until(x => x.index === true, 'holding opens the index (' + id + ')');
    const box = await page.evaluate(id => { const r = document.querySelector('#index li[data-go="' + id + '"] .t').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id);
    if (mobile) { await touch('touchMove', [[box[0], box[1]]]); await wait(120); await touch('touchEnd', []); }
    else { await page.mouse.move(box[0], box[1], { steps: 6 }); await wait(120); await page.mouse.up(); }
    return ok;
  };
  await holdTo('pharos'); await at(3);
  await shot('flow-pharos');
  await holdTo('team'); await at(5);
  /* the sundial opens it too; then a click on a name */
  await press('#dial'); await until(x => x.index === true, 'the sundial opens the index');
  await press('#index li[data-go="ogive"]'); await at(4);
  /* keys */
  if (!mobile) {
    await page.keyboard.press('ArrowUp'); await at(3);
    await page.keyboard.press('ArrowDown'); await at(4);
    await page.keyboard.press('i'); await until(x => x.index === true, 'the I key opens the index');
    await page.keyboard.press('Escape'); await until(x => x.index === false, 'Escape closes the index');
  }

  /* ---- a project page, and on into the next ---- */
  await press('#menu a[data-nav="projects"]'); await at(1);
  await press('#krios .view');
  await until(x => x.mode === 'page' && x.proj === 0, 'View project opens Kríos');
  await wait(1500); await shot('flow-case-krios');
  const ext = await page.evaluate(() => [...document.querySelectorAll('#case .ext')].map(a => a.href + '|' + a.target));
  check(JSON.stringify(ext) === JSON.stringify(['https://krios.ie/|_blank', 'https://github.com/ahroonsanthosh/Aetos|_blank', 'https://github.com/ahroonsanthosh/pharos|_blank', 'https://github.com/michaelsheffernan/ogive|_blank']), 'project links are right: ' + ext.join(' '));
  for (let k = 0; k < 40; k++) { if (mobile) { await swipe(300); await wait(60); } else { await page.mouse.wheel(0, 240); await wait(25); } const x = await st(); if (x.proj === 1 && x.s > 1.98) break; }
  await until(x => x.mode === 'page' && x.proj === 1 && Math.abs(x.s - 2) < .02, 'reading past the end of Kríos glides into Aetos (camera to room 2)');
  await shot('flow-case-aetos');
  await press('#back');
  await until(x => x.mode === 'world' && Math.abs(x.s - 2) < .012, 'Back returns to the gallery at the room you were reading');
  if (!mobile) { await press('#aetos .view'); await until(x => x.mode === 'page' && x.proj === 1, 'View project opens Aetos'); await page.keyboard.press('Escape'); await until(x => x.mode === 'world', 'Escape closes the project'); }

  /* ---- the three of us ---- */
  await press('#menu a[data-nav="team"]'); await at(5);
  const li = await page.evaluate(() => [...document.querySelectorAll('.person .li')].map(a => a.href));
  check(li.join(' ') === 'https://www.linkedin.com/in/ahroon-santhosh/ https://www.linkedin.com/in/michael-sweeney-heffernan-589155354 https://www.linkedin.com/in/abraham-sabu-kurian/', 'LinkedIn links in order');
  const names = await page.evaluate(() => [...document.querySelectorAll('.person .nm')].map(a => a.textContent));
  check(names.join('|') === 'Ahroon Santhosh|Michael Sweeney Heffernan|Abraham Sabu Kurian', 'names in order');
  if (!mobile) {
    const box = await page.evaluate(() => { const r = document.querySelectorAll('.person')[1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + 10]; });
    await page.mouse.move(box[0], box[1] - 60, { steps: 4 }); await wait(2600);
    check(await page.evaluate(() => document.querySelectorAll('.person')[1].classList.contains('up')), 'hovering Michael resolves his reflection');
    await shot('flow-team-hover');
  } else {
    if (true) { await swipe(-380); await at(4.86); await wait(2200); check(await page.evaluate(() => document.querySelectorAll('.person')[0].classList.contains('up')), 'walking up to Ahroon resolves him (mobile)'); await shot('flow-team-ahroon'); }
  }
  const sum = await st(); log('final state', JSON.stringify(sum));
};

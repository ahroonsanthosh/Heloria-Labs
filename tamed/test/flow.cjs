/* Functional walk-through with real input: every place by scroll (wheel or swipe), by the menu and by the
   press-and-hold index; each room's View project goes straight to the project; links point where they should.
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
  { await wait(2500); const a = (await st()).audio; check(a.water > .45 && a.waterF > 1800 && a.mus > .5, 'sound at Home: score and close water (' + a.mus + ', ' + a.water + ' at ' + a.waterF + 'Hz)'); }
  await shot('flow-home');

  /* ---- every place by scrolling ---- */
  const stops = (await st()).stops;
  for (let i = 1; i < stops.length; i++) {
    if (mobile) await swipe(Math.min(vp.height * .5, 380));
    else { for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, 235); await wait(30); } }
    await at(stops[i]);
    if (!mobile && [1, 2, 3, 4, 6].includes(stops[i])) {
      await wait(2500); const a = (await st()).audio;
      const room = { 1: 'kr', 2: 'ae', 3: 'ph', 4: 'og' }[stops[i]];
      const mt = await T(t => t.A.meter()); check(mt && mt.peak < .9 && mt.rmsDb < -12, 'never loud at s=' + stops[i] + ': peak ' + (mt && mt.peak) + ', rms ' + (mt && mt.rmsDb) + ' dBFS');
      if (room) check(a[room] > .15 && a.waterF < 700 && a.water < .3, 'sound in ' + room + ': its own layer (' + a[room] + '), water muffled (' + a.water + ' at ' + a.waterF + 'Hz)');
      else check(a.water > .45 && a.waterF > 3000 && a.kr < .02 && a.og < .02, 'sound at Contact: water fully back (' + a.water + ' at ' + a.waterF + 'Hz), rooms silent');
    }
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

  /* ---- View project goes straight to the project, in a new tab, and the walk stays where it was ---- */
  const views = await page.evaluate(() => [...document.querySelectorAll('.view')].map(a => a.tagName + '|' + a.href + '|' + a.target + '|' + a.rel));
  check(JSON.stringify(views) === JSON.stringify(['A|https://krios.ie/|_blank|noopener', 'A|https://github.com/ahroonsanthosh/Aetos|_blank|noopener', 'A|https://github.com/ahroonsanthosh/pharos|_blank|noopener', 'A|https://github.com/michaelsheffernan/ogive|_blank|noopener']), 'each View project is a link to the project: ' + views.join(' '));
  check(await page.evaluate(() => !document.querySelector('#case') && !document.querySelector('[data-open]')), 'there are no project summary pages');
  await press('#menu a[data-nav="projects"]'); await at(1);
  await ctx.route(/krios\.ie/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>krios</title>ok' }));
  const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 20000 }).catch(() => null), press('#krios .view')]);
  if (tab) { try { await tab.waitForLoadState('domcontentloaded', { timeout: 15000 }); } catch (e) {} }
  check(!!tab && /krios\.ie/.test(tab.url()), 'View project on Kríos opens krios.ie in a new tab (' + (tab ? tab.url() : 'no tab') + ')');
  if (tab) await tab.close();
  await wait(600); { const x = await st(); check(x.mode === 'world' && Math.abs(x.s - 1) < .012, 'the walk stays in Kríos'); }

  /* ---- the three of us ---- */
  await press('#menu a[data-nav="team"]'); await at(5);
  const li = await page.evaluate(() => [...document.querySelectorAll('.person .li')].map(a => a.href + (a.target === '_blank' ? '' : ' (same tab)')));
  check(li.join(' ') === 'https://www.linkedin.com/in/ahroon-santhosh/ https://www.linkedin.com/in/michael-sweeney-heffernan-589155354 https://www.linkedin.com/in/abraham-sabu-kurian/', 'LinkedIn links in order');
  const names = await page.evaluate(() => [...document.querySelectorAll('.person .nm')].map(a => a.textContent));
  check(names.join('|') === 'Ahroon Santhosh|Michael Sweeney Heffernan|Abraham Sabu Kurian', 'names in order');
  if (!mobile) {
    let ok = true; try { await page.waitForFunction(() => [...document.querySelectorAll('.person')].every(p => p.classList.contains('up')), null, { timeout: 120000, polling: 400 }); } catch (e) { ok = false; }
    check(ok, 'standing at Team, the three portraits rise out of the pool one after another');
    try { await page.waitForFunction(() => window.__tamed.OUT.people.every(p => p.lift > -.05), null, { timeout: 60000, polling: 400 }); } catch (e) {}
    const lift = await T(t => t.OUT.people.map(p => +p.lift.toFixed(2)));
    check(lift.every(v => Math.abs(v) < .05), 'every portrait stands on the water (' + lift.join(', ') + ')');
    await shot('flow-team-risen');
    /* each portrait is its LinkedIn link: pointing at one lifts it and lights the LinkedIn line on its plinth */
    const box = await page.evaluate(() => { const r = document.querySelector('.person[data-i="1"] .li').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * .4, r.width, r.height]; });
    check(box[2] > 60 && box[3] > 60, 'the middle portrait has a hit area the size of the portrait (' + box[2].toFixed(0) + 'x' + box[3].toFixed(0) + ')');
    await page.mouse.move(box[0], box[1], { steps: 4 }); await wait(1400);
    const hov = await T(t => ({ hot: t.OUT.people[1].hot, hov: +t.OUT.people[1].hov.toFixed(2), cur: document.querySelector('#curT').textContent }));
    check(hov.hot && hov.hov > .5 && hov.cur === 'LinkedIn', 'pointing at Michael lifts his portrait and the cursor says LinkedIn ' + JSON.stringify(hov));
    await page.mouse.move(vp.width * .5, vp.height * .92, { steps: 4 }); await wait(400);
  } else {
    if (true) { await swipe(-380); await at(4.86); await wait(2200); check(await page.evaluate(() => document.querySelectorAll('.person')[0].classList.contains('up')), 'walking up to Ahroon resolves him (mobile)'); await shot('flow-team-ahroon'); }
  }
  const sum = await st(); log('final state', JSON.stringify(sum));
};

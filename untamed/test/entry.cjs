/* The three ways in. Run once per way, each alone:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/entry --scenario untamed/test/entry.cjs
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/entry --scenario untamed/test/entry.cjs --hash land
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/entry --scenario untamed/test/entry.cjs --hash aetos
   Fly opens on the black hole and its story; Land opens in daylight and comes straight down onto Earth; Aetos, where the
   rocket at the end of the walk goes, skips the story: Aetos's radar has you, and you fly in to it on the thruster. */
module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const pre = (mobile ? 'm-' : '');
  let fails = 0; const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  (' + (typeof x === 'string' ? x : JSON.stringify(x)) + ')' : '')); if (!c) fails++; };
  const until = async (fn, ms = 60000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await H(fn, arg)) return true; await wait(250); } return false; };
  const way = await H(h => h.S.entry); const tag = pre + 'entry-' + way;
  const load = await page.evaluate(() => ({ bg: getComputedStyle(document.querySelector('#load')).backgroundColor, ink: getComputedStyle(document.querySelector('#mark')).color, begin: document.querySelector('#beginT').textContent, landing: document.documentElement.classList.contains('landing') }));
  log('loader', JSON.stringify(load));
  await wait(1400); await shot(tag + '-0-loader');
  const verb = mobile ? 'Tap' : 'Click';
  if (way === 'fly') {
    ok(!load.landing && /rgb\(5, 5, 4\)/.test(load.bg), 'Fly opens in the dark', load.bg);
    ok(load.begin === verb + ' to begin', 'its prompt', load.begin);
    await page.click('#load');
    ok(await until(h => h.S.mode === 'story' || h.S.mode === 'entering', 20000), 'it goes into the story');
    ok(await until(() => !document.querySelector('#story').classList.contains('off'), 40000), 'and the story is on the screen');
    await wait(1500); await shot(tag + '-1-story');
  }
  if (way === 'land') {
    ok(load.landing && /rgb\(234, 244, 244\)/.test(load.bg), 'Land opens in the front door\'s daylight', load.bg);
    ok(/rgb\(42, 36, 29\)/.test(load.ink), 'with the word in ink', load.ink);
    ok(load.begin === verb + ' to land', 'its prompt says land', load.begin);
    await page.click('#load');
    ok(await until(h => h.S.mode === 'station' && h.S.stId === 'cr', 30000), 'it comes straight down onto Earth');
    const st = await H(h => ({ land: h.ST.cr.land, cut: h.ST.cr.el.classList.contains('cut'), story: !document.querySelector('#story').classList.contains('off'), hub: !document.querySelector('#hub').classList.contains('off') }));
    ok(st.land && st.cut, 'in Land, with the rocket coming down', st);
    ok(!st.story && !st.hub, 'no story and no orbit on the way', st);
    await wait(2500); await shot(tag + '-1-coming-down');
    ok(await until(() => getComputedStyle(document.querySelector('#load')).visibility === 'hidden' || getComputedStyle(document.querySelector('#load')).opacity === '0', 30000), 'the daylight opens onto the landing');
    await page.click('#crSkip').catch(() => {});
    ok(await until(h => !h.ST.cr.el.classList.contains('cut'), 30000), 'Skip lands you');
    const lines = await H(h => ({ a: h.ST.cr._dbg.people[0].lines[0], marks: Object.values(h.ST.cr._dbg.MK).every(m => m.st === 'on'), lede: document.querySelector('#crLede').textContent }));
    ok(lines.a === 'Oh, hello! Welcome to Earth.', 'Ahroon says hello for Land', lines.a);
    ok(lines.marks, 'every landmark stands');
    ok(/landed/.test(lines.lede), 'the line on the screen says you have landed', lines.lede);
    await wait(2500); await shot(tag + '-2-landed');
    /* up from Earth: a Land visitor goes up to Aetos, which brings them in */
    await page.click('#back');
    ok(await until(h => h.S.mode === 'hub' || h.S.mode === 'tohub', 30000), 'Orbit takes you up');
    const up = await H(h => ({ lead: h.S.lead && h.S.lead.s.id, ap: h.S.ap && h.S.ap.id }));
    ok(up.lead === 'ae', 'and Aetos brings you in', up);
    await wait(3000); await shot(tag + '-3-up');
  }
  if (way === 'aetos') {
    ok(!load.landing && /rgb\(5, 5, 4\)/.test(load.bg), 'from the walk\'s rocket: the night it left you in', load.bg);
    ok(load.begin === verb + ' to go into orbit', 'its prompt', load.begin);
    await page.click('#load');
    ok(await until(h => h.S.mode === 'tohub' || h.S.mode === 'hub', 40000), 'straight into orbit');
    const s = await H(h => ({ lead: h.S.lead && h.S.lead.s.id, ap: !!h.S.ap, far: +h.S.probe.p.distanceTo(h.S.lead.s.pos).toFixed(1), ch: h.S.ch, story: !document.querySelector('#story').classList.contains('off') }));
    ok(s.lead === 'ae' && !s.ap && s.far > 8, 'Aetos has you on its radar, a way off, and nothing flies you there', s);
    ok(!s.story, 'and the story never shows', s);
    ok(await until(() => /aetos/i.test(document.querySelector('#guide')?.innerText || ''), 40000), 'the caption says so', await page.evaluate(() => (document.querySelector('#guide')?.innerText || '').replace(/\s+/g, ' ')));
    await until(() => +getComputedStyle(document.querySelector('#guide .gb')).opacity > .98, 20000); await wait(2500); await shot(tag + '-1-lead');
    if (mobile) await H(h => { const c = h.renderer.domElement; c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 41, pointerType: 'touch', clientX: 195, clientY: 640, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 41, pointerType: 'touch', clientX: 195, clientY: 590, bubbles: true })); });
    else await page.keyboard.down('KeyW');
    ok(await until(h => h.S.mode === 'station' && h.S.stId === 'ae', 240000), 'you fly in on the thruster, and Aetos docks you');
    if (mobile) await H(h => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 41, pointerType: 'touch', clientX: 195, clientY: 590, bubbles: true }))); else await page.keyboard.up('KeyW');
    await wait(3000); await shot(tag + '-2-docked');
  }
  console.log(fails ? fails + ' FAILED' : 'ENTRY OK');
};

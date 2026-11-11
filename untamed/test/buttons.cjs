/* Every-button test for the whole site. Run with the harness:
   node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/btn --scenario untamed/test/buttons.cjs [--mobile]
   Set BTN_ONLY=kr,ae to test only some stations.
   It clicks real elements (Playwright refuses if anything covers them), checks each click does what it should,
   and checks every visible button in each screen is the topmost element at its centre. */
const results = [];
function rec(ok, name, detail) { results.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); }

module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const until = (fn, arg, t = 120000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true).catch(() => false);
  /* a click as a person makes it: the hand moves to the button first (which, as on the site, holds back the worlds still being
     made after the loader), whatever step is already under way finishes, then the click */
  const reach = async sel => { const r = await page.evaluate(q => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.x + b.width / 2, b.y + b.height / 2] : null; }, sel).catch(() => null);
    if (r) { await page.mouse.move(r[0] - 12, r[1] - 8); await page.mouse.move(r[0], r[1], { steps: 2 }); await page.waitForFunction(() => !(window.__heloria && window.__heloria.late && window.__heloria.late().busy), null, { timeout: 120000, polling: 100 }).catch(() => {}); } };
  const click = async (sel, name) => { try { await reach(sel); await page.click(sel, { timeout: 20000 }); return true; } catch (e) { rec(false, name || sel, e.message.split('\n')[0]); return false; } };
  const tap = async (sel, name) => mobile ? (async () => { try { await page.tap(sel, { timeout: 20000 }); return true; } catch (e) { rec(false, name || sel, e.message.split('\n')[0]); return false; } })() : click(sel, name);
  // every visible, enabled button or link in a container must be on top at its centre
  const covered = async (scope, label) => {
    const bad = await page.evaluate(scope => {
      const out = []; const root = document.querySelector(scope); if (!root) return ['scope missing ' + scope];
      root.querySelectorAll('button,a[href],input,[data-play],[data-back]').forEach(el => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none' || el.disabled) return;
        let p = el, vis = true; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.opacity === '0' || s.visibility === 'hidden' || s.display === 'none') { vis = false; break; } p = p.parentElement; }
        if (!vis) return;
        const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return;
        const top = document.elementFromPoint(x, y);
        if (!top || !(top === el || el.contains(top))) out.push((el.id || el.className || el.tagName) + ' covered by ' + (top ? (top.id || top.className || top.tagName) : 'nothing'));
      });
      return out;
    }, scope);
    rec(bad.length === 0, 'nothing covers buttons: ' + label, bad.join('; '));
  };
  const linkCheck = async (scope, label) => {
    const bad = await page.evaluate(scope => [...document.querySelectorAll(scope + ' a[href]')].filter(a => !/^mailto:/.test(a.href) && (a.target !== '_blank' || !/^https?:/.test(a.href))).map(a => a.outerHTML.slice(0, 80)), scope);
    rec(bad.length === 0, 'external links open in a new tab: ' + label, bad.join('; '));
  };

  /* ---- loader ---- */
  rec(await until(() => document.querySelector('#load').classList.contains('ready')), 'loader becomes ready');
  await covered('#load', 'loader');
  rec(await page.evaluate(() => document.querySelectorAll('#load button,#load a').length === 0 && [...document.querySelectorAll('#load > :not(#boot)')].map(e => e.innerText).join(' ').replace(/\s+/g, ' ').trim().split(' ').length <= 5), 'opening screen is only the mark and a prompt');
  if (mobile) await tap('#begin', 'Tap to begin');
  else { await page.mouse.move(640, 400); await page.mouse.wheel(0, 240); await wait(700);
    rec(/^scroll to/i.test(await page.evaluate(() => document.querySelector('#beginT').textContent)), 'the prompt asks for a scroll'); }
  rec(await until(() => window.__heloria.S.mode !== 'load'), mobile ? 'a tap begins' : 'a scroll begins');
  rec(await until(() => window.__heloria.S.mode === 'story'), 'the story starts');
  await wait(1500);

  /* ---- story ---- */
  await covered('#story', 'story');
  for (const c of [1, 2, 3, 0]) {
    await H((h, c) => h.goChapter(c), c);
    rec(await until(c => window.__heloria.S.ch === c, c, 60000), 'chapter ' + c + ' reached');
    await wait(400); await H(h => h.storyUnlock());   // test frames are slow, so release the transition lock by hand
  }
  rec(await page.evaluate(() => document.querySelector('#skip').textContent.trim() === 'Skip'), 'the story has one Skip');
  await H(h => { h.__calls = 0; const c = h.A.call; h.A.call = function () { h.__calls++; return c.apply(this, arguments); }; });
  await tap('#skip', 'Skip');

  /* ---- the story ends with Aetos's radar on you, a way off across the system: you fire the thruster and fly in to it
     yourself, and flying into it docks you ---- */
  rec(await until(() => { const S = window.__heloria.S; return S.mode === 'tohub' || S.mode === 'hub'; }, null, 30000), 'Skip leaves the story');
  rec(await H(h => !!h.S.lead && h.S.lead.s.id === 'ae' && !h.S.ap), 'the story hands you to Aetos, and nothing flies you there');
  { const d = await H(h => +h.S.probe.p.distanceTo(h.S.lead.s.pos).toFixed(1)); rec(d > 8, 'you start well away from Aetos, not on top of it', d + ' units'); }
  rec(await H(h => h.STA.every(s => s.id === 'ae' ? s.wake === 1 : s.wakeT === 0 && s.el.style.display === 'none')), 'on the way in the other stations are dark and unmarked');
  rec(await until(() => window.__heloria.S.guide === 'lead', null, 90000), 'the screen says what to do');
  // (the heading lights up glyph by glyph, so its words are read from its label)
  const gtext = () => page.evaluate(() => [document.querySelector('#guideE').textContent, document.querySelector('#guideH').getAttribute('aria-label') || '', document.querySelector('#guideK').textContent].join(' / '));
  { const t = await gtext(); rec(/aetos/i.test(t) && /unidentified contact/i.test(t) && /fly to aetos/i.test(t) && (mobile ? /drag up/i : /hold w/i).test(t), 'Aetos\'s radar has you: fly to Aetos, with how to fire the thruster', t); }
  await until(() => +getComputedStyle(document.querySelector('#guide .gb')).opacity > .98, null, 20000); await wait(600);
  await shot((mobile ? 'm-' : '') + 'orbit-fly-to-aetos');
  await H(h => { h.__sawSmall = false; h.__wSmall = setInterval(() => { if (h.S.guide === 'small' && /aetos/i.test(document.querySelector('#guideL').textContent)) h.__sawSmall = true; }, 40); });
  if (mobile) { await H(h => { const c = h.renderer.domElement; c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 31, pointerType: 'touch', clientX: 195, clientY: 640, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 31, pointerType: 'touch', clientX: 195, clientY: 600, bubbles: true })); window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 31, pointerType: 'touch', clientX: 195, clientY: 585, bubbles: true })); });
    rec(await H(h => !document.querySelector('#stick').hidden), 'the stick comes up under your thumb'); }
  else await page.keyboard.down('KeyW');
  rec(await until(() => window.__heloria.S.mode === 'station' && window.__heloria.S.stId === 'ae', null, 300000), 'holding the thruster flies you into Aetos, and you dock');
  if (mobile) await H(h => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 31, pointerType: 'touch', clientX: 195, clientY: 585, bubbles: true })));
  else await page.keyboard.up('KeyW');
  rec(await H(h => { clearInterval(h.__wSmall); return h.__sawSmall; }), 'once you are moving the instruction drops to one line, Fly to Aetos');
  await wait(2600);
  const fc = await page.evaluate(() => { const el = document.querySelector('.st-ae');
    const b = [...el.querySelectorAll('.first .two')].map(x => { const r = x.getBoundingClientRect(); return { t: x.innerText.replace(/\s+/g, ' ').trim(), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) }; });
    const c = el.querySelector('.first .code');
    return { first: el.classList.contains('first'), b, code: c ? c.href + '|' + c.target : null, back: getComputedStyle(document.querySelector('#station > #back')).display,
      other: [...el.querySelectorAll('.go > [data-play], .go > .links')].filter(x => getComputedStyle(x).display !== 'none').length }; });
  rec(fc.first && fc.b.length === 3 && fc.b.every(x => x.w > 100 && x.h > 40) && Math.abs(fc.b[0].w - fc.b[1].w) < 4 && Math.abs(fc.b[0].y - fc.b[1].y) < 4 && /play hold the sky/i.test(fc.b[0].t) && /skip, fly on/i.test(fc.b[1].t),
    'the first card offers Play Hold the Sky and Skip, fly on, equal and side by side', JSON.stringify(fc.b));
  rec(fc.code === 'https://github.com/ahroonsanthosh/Aetos|_blank' && /github/i.test(fc.b[2].t), 'and the Aetos code on GitHub, in a new tab', fc.code);
  rec(fc.back === 'none' && fc.other === 0, 'and nothing else to choose from');
  await covered('.st-ae', 'the first card');
  await shot((mobile ? 'm-' : '') + 'ae-first');
  await tap('.st-ae .first [data-play]', 'Play Hold the Sky');
  rec(await until(() => window.__heloria.ST.ae.state === 'play', null, 60000), 'Play Hold the Sky starts the game');
  await H(h => { const st = h.ST.ae; st.abort(); st.setState('menu'); }); await wait(1600);
  await tap('.st-ae .first [data-back]', 'Skip, fly on');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Skip, fly on takes you back out');
  rec(await until(() => window.__heloria.S.sealK === 0, null, 120000), 'leaving Aetos breaks the seal');
  rec(await until(() => window.__heloria.S.guide === 'big', null, 120000), 'then the screen says what to do');
  await until(() => +getComputedStyle(document.querySelector('#guide .gb')).opacity > .98, null, 20000); await wait(900);
  const g = await page.evaluate(() => { const h2 = document.querySelector('#guideH'); return { text: document.querySelector('#guideE').textContent + ' / ' + (h2.getAttribute('aria-label') || ''), fs: parseFloat(getComputedStyle(h2).fontSize), k: document.querySelector('#guideK').textContent }; });
  rec(/fly into the black hole/i.test(g.text) && /unidentified contact/i.test(g.text) && g.fs >= 30, 'big and clear: fly into the black hole, an unidentified contact inside', JSON.stringify(g));
  rec(mobile ? /drag/i.test(g.k) : /w a s d/i.test(g.k), 'with the controls, the first time (' + g.k + ')');
  rec(await until(() => window.__heloria.STA.every(s => s.wake > .99), null, 90000), 'and the other stations wake as the wave goes through them');
  await shot((mobile ? 'm-' : '') + 'orbit-instruction');
  // the hole is off the screen: one marker at the edge, its own; it takes no click, and neither does the hole on the map
  await H(h => { const P = h.S.probe.p; h.S.yaw = Math.atan2(P.x, P.z) + Math.PI / 2; });
  rec(await until(() => window.__heloria.U && document.querySelector('#edges .edge.hole').style.display !== 'none', null, 60000), 'with the hole off to the side, its marker is at the edge');
  rec(await page.evaluate(() => [...document.querySelectorAll('#edges .edge')].filter(e => e.style.display !== 'none').length === 1), 'and it is the only marker');
  { const b = await page.evaluate(() => { const r = document.querySelector('#edges .edge.hole').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    try { if (mobile) await page.touchscreen.tap(b[0], b[1]); else await page.mouse.click(b[0], b[1]); } catch (e) {}
    await wait(500); rec(await H(h => !(h.S.ap && h.S.ap.id === 'hole')), 'the marker does not fly you in'); await H(h => { h.S.ap = null; }); }
  { const rr = await page.evaluate(() => { const r = document.querySelector('#radar').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    try { if (mobile) await page.touchscreen.tap(rr[0], rr[1]); else await page.mouse.click(rr[0], rr[1]); } catch (e) {}
    await wait(500); rec(await H(h => !(h.S.ap && h.S.ap.id === 'hole')), 'the hole on the map does not fly you in'); await H(h => { h.S.ap = null; }); }
  await H(h => { const P = h.S.probe.p; h.S.yaw = Math.atan2(P.x, P.z); });
  if (await until(() => document.querySelector('.slab.hole').style.display !== 'none', null, 60000)) {
    const b = await page.evaluate(() => { const r = document.querySelector('.slab.hole .tx b').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    try { if (mobile) await page.touchscreen.tap(b[0], b[1]); else await page.mouse.click(b[0], b[1]); } catch (e) {}
    await wait(500); rec(await H(h => !(h.S.ap && h.S.ap.id === 'hole') && getComputedStyle(document.querySelector('.slab.hole .tx')).pointerEvents === 'none'), 'the horizon\'s label takes no click and does not fly you in either');
    await H(h => { h.S.ap = null; });
  } else rec(false, 'the horizon has a label when it is in view');
  // (headless frames are slow, so the next pulse is brought forward rather than waited for)
  await H(h => { h.__contacts = 0; const c = h.A.contact; h.A.contact = function () { h.__contacts++; return c.apply(this, arguments); }; h.__p0 = h.S.pulses; h.S.pulseT = 0; });
  rec(await until(() => window.__heloria.S.pulses > window.__heloria.__p0 && window.__heloria.__contacts > 0, null, 90000), 'the hole calls: its pulse plays', JSON.stringify(await H(h => ({ pulses: h.S.pulses, sealK: h.S.sealK, sb: h.SB.t, mode: h.S.mode }))));
  rec(await H(h => h.__calls === 0), 'and no station rings a bell');
  // flying: the instruction steps down to a line at the foot and stays
  if (mobile) { await H(h => { const c = h.renderer.domElement; c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 32, pointerType: 'touch', clientX: 195, clientY: 600, bubbles: true })); window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 32, pointerType: 'touch', clientX: 195, clientY: 560, bubbles: true })); });
    await until(() => window.__heloria.S.guide === 'small', null, 60000); await H(h => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 32, pointerType: 'touch', clientX: 195, clientY: 560, bubbles: true }))); }
  else { await page.keyboard.down('KeyW'); await until(() => window.__heloria.S.guide === 'small', null, 60000); await page.keyboard.up('KeyW'); }
  rec(await H(h => h.S.guide === 'small'), 'once you fly, it steps down to one line');
  await wait(1500);
  await until(() => +getComputedStyle(document.querySelector('#guide .gl')).opacity > .9, null, 20000);
  { const l = await page.evaluate(() => ({ op: getComputedStyle(document.querySelector('#guide .gl')).opacity, cls: document.querySelector('#guide').className, t: document.querySelector('#guide .gl').textContent, g: window.__heloria.S.guide }));
    rec(+l.op > .9 && /fly into the black hole/i.test(l.t), 'the line stays: fly into the black hole', JSON.stringify(l)); }
  await H(h => { const P = h.S.probe; P.v.set(0, 0, 0); });

  /* ---- hub ---- */
  await covered('#hub', 'orbit');
  await covered('#chrome', 'chrome');
  rec(await page.evaluate(() => !document.querySelector('#snd')), 'no sound indicator anywhere');
  rec(await page.evaluate(() => !document.querySelector('#rail,.tele,#where')), 'no chapter rail, telemetry or location label');
  // station labels and edge markers set autopilot. While the contact calls, the stations off the screen have no marker (checked
  // above), so this generic check steps out of that for a moment, as it is once you have been to Earth
  await H(h => { h.__push = h.S.push; h.S.push = false; }); await wait(1500);
  const ids = await H(h => h.STA.map(s => s.id));
  let apOk = 0;
  for (const id of ids) {
    const vis = await H((h, id) => { const s = h.STA.find(x => x.id === id); return s.el.style.display !== 'none' ? 'label' : (s.edge.style.display !== 'none' ? 'edge' : ''); }, id);
    if (!vis) continue;
    if (await H((h, id) => h.STA.find(x => x.id === id).el.classList.contains('under'), id)) continue;
    const ok = await H((h, id) => { const s = h.STA.find(x => x.id === id); const el = s.el.style.display !== 'none' ? s.el.querySelector('.tx b') : s.edge; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id);
    await H(h => { h.S.ap = null; });
    try { await page.mouse.click(ok[0], ok[1]); } catch (e) {}
    await wait(300);
    if (await H((h, id) => h.S.ap && h.S.ap.id === id || h.S.mode !== 'hub', id)) apOk++;
    await H(h => { h.S.ap = null; });
  }
  rec(apOk > 0, 'station labels or edge markers start autopilot', apOk + ' of ' + ids.length + ' visible ones worked');
  await H(h => { h.S.push = h.__push; });
  // radar click flies somewhere
  await H(h => { h.S.ap = null; });
  const rr = await page.evaluate(() => { const r = document.querySelector('#radar').getBoundingClientRect(); return [r.left, r.top, r.width]; });
  let radarOk = false;
  for (const [fx, fy] of [[.5, .2], [.8, .5], [.5, .8], [.2, .5], [.3, .3], [.7, .7], [.7, .3], [.3, .7]]) {
    await page.mouse.click(rr[0] + rr[2] * fx, rr[1] + rr[2] * fy); await wait(150);
    if (await H(h => !!h.S.ap)) { radarOk = true; break; }
  }
  rec(radarOk, 'radar click sets autopilot');
  await H(h => { h.S.ap = null; });
  // flying close to a station offers docking: E on a keyboard, the Dock button on touch
  await H(h => { const s = h.STA[0], P = h.S.probe; P.p.set(s.pos.x * 1.1, 0, s.pos.z * 1.1); P.v.copy(s.vel); });
  rec(await until(() => !!window.__heloria.S.near, null, 60000), 'probe near a station is offered docking');
  if (mobile) { await tap('#dockp', 'Dock button'); } else { await page.keyboard.press('KeyE'); }
  const dockedNear = await until(() => window.__heloria.S.mode === 'station', null, 180000); rec(dockedNear, mobile ? 'Dock button docks' : 'E docks');
  if (dockedNear) { await wait(2500); await tap('#back', 'Orbit button after docking'); await until(() => window.__heloria.S.mode === 'hub', null, 180000); await wait(800); }

  /* ---- the horizon is sealed until you have docked at one station (falling in is tested at the end) ---- */
  rec(await H(h => typeof h.crossHorizon === 'function' && !document.querySelector('#qtxt') && !document.querySelector('#horizon')), 'no counter and no horizon page');
  const docked0 = await H(h => [...h.S.docked]); await H(h => { h.S.docked.clear(); h.S.ap = null; const P = h.S.probe; P.p.set(1.6, 0, 0); P.v.set(0, 0, 0); });
  await wait(4000);
  rec(await H(h => h.S.mode === 'hub' && Math.hypot(h.S.probe.p.x, h.S.probe.p.z) > 2), 'the horizon is sealed before any station is visited');
  await H((h, d) => d.forEach(x => h.S.docked.add(x)), docked0);
  await H(h => { const P = h.S.probe; P.p.set(10.5, 0, 0); P.v.set(0, 0, Math.sqrt(60 / 10.5)); });
  await wait(1500);

  /* ---- each station: dock, back, play, results, play again, back ---- */
  const only = (process.env.BTN_ONLY || '').split(',').filter(Boolean);
  for (const id of ids.filter(id => !only.length || only.includes(id))) {
    const exists = await H((h, id) => !!h.ST[id], id); if (!exists) { rec(false, 'station ' + id + ' built'); continue; }
    await H((h, id) => h.dock(id), id);
    const docked = await until(() => window.__heloria.S.mode === 'station', null, 180000); rec(docked, id + ': docks');
    if (!docked) continue;
    await wait(2500);
    await covered('.st-' + id, id + ' title');
    await linkCheck('.st-' + id, id);
    await covered('#station > #back', id + ' back button');
    await tap('#back', id + ' Orbit button'); rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), id + ': Orbit button undocks');
    await wait(800);
    await H((h, id) => h.jump(id), id); await wait(2000);
    const hasPlay = await page.$('.st-' + id + ' .go [data-play], .st-' + id + ' .card [data-play]');
    if (hasPlay) {
      await tap('.st-' + id + ' .go [data-play], .st-' + id + ' .card [data-play]', id + ' Play');
      rec(await until(id => window.__heloria.ST[id].state === 'play', id, 60000), id + ': Play starts the game');
      await wait(2500); await covered('.st-' + id + ' .ghud', id + ' in-game HUD'); await shot((mobile ? 'm-' : '') + id + '-play');
      // results panel buttons
      await H((h, id) => { const st = h.ST[id]; st.abort(); st.result({ grade: 'Test', score: 1, stats: [['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5], ['f', 6]], text: 'test' }); }, id);
      await wait(1500); await covered('.st-' + id + ' .res', id + ' results');
      const again = '.st-' + id + ' .res [data-play]';
      if (await page.$(again)) { await tap(again, id + ' Play again'); rec(await until(id => window.__heloria.ST[id].state === 'play', id, 60000), id + ': Play again restarts'); }
      await H((h, id) => { const st = h.ST[id]; st.abort(); st.result({ grade: 'Test', score: 1, stats: [['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5], ['f', 6]], text: 'test' }); }, id);
      await wait(1200);
      const back = '.st-' + id + ' .res [data-back]';
      if (await page.$(back)) { await tap(back, id + ' Back to orbit'); rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), id + ': Back to orbit undocks'); }
    } else {
      await shot((mobile ? 'm-' : '') + id + '-title');
      await tap('#back', id + ' Orbit button'); await until(() => window.__heloria.S.mode === 'hub', null, 180000);
    }
    await wait(800);
  }

  /* ---- the horizon is open from the start; falling in lands you on Earth ---- */
  rec(await H(h => !h.STA.some(s => s.id === 'cr')), 'Earth is not a station in orbit');
  await H(h => { const P = h.S.probe; P.p.set(1.2, 0, 0); P.v.set(0, 0, 0); });
  rec(await until(() => window.__heloria.S.mode === 'station' && window.__heloria.S.stId === 'cr', null, 180000), 'falling in lands you on Earth');
  rec(await H(h => h.S.been && !h.S.ap), 'you flew in yourself: no autopilot took you');
  rec(await H(h => h.ST.cr._dbg.cut().on), 'Earth opens with the rocket landing');
  await wait(1500); await shot((mobile ? 'm-' : '') + 'earth-landing'); await covered('.st-cr', 'Earth landing');
  await tap('#crSkip', 'Skip the landing'); rec(await until(() => !window.__heloria.ST.cr._dbg.cut().on, null, 20000), 'Skip ends the landing');
  await wait(1500);
  { const id = 'cr';
    { // Earth: click one of us in town; you walk over by yourself and the conversation opens; it ends on the photo and LinkedIn; See you closes it
      /* the camera comes round from the landing to where you stand over a few frames, and a loaded test browser draws only a
         frame or two a second: wait until Ahroon is actually on the screen before clicking him */
      let xy = null; for (let i = 0; i < 80; i++) { xy = await H(h => { const v = h.ST.cr._dbg.head(0).project(h.stCam); return v.z < 1 && Math.abs(v.x) < .9 && Math.abs(v.y) < .9 ? [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight] : null; }); if (xy) break; await wait(250); }
      if (!xy) xy = await H(h => { const v = h.ST.cr._dbg.head(0).project(h.stCam); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight]; });
      if (mobile) await page.touchscreen.tap(xy[0], xy[1]); else await page.mouse.click(xy[0], xy[1]);
      await H(h => { const st = h.ST.cr, d = st._dbg; for (let i = 0; i < 240 && !d.talk().p; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } });
      rec(await H(h => { const T = h.ST.cr._dbg.talk(); return !!T.p && T.p.first === 'Ahroon' && T.i === 0; }), 'cr: clicking a person walks you over and starts the conversation');
      for (let i = 0; i < 16 && !(await page.evaluate(() => document.querySelector('#crTalk').classList.contains('last'))); i++) { await H(h => h.ST.cr._dbg.nextTalk()); await wait(150); }
      rec(await until(() => { const t = document.querySelector('#crTalk'); return t.classList.contains('on') && t.classList.contains('last'); }, null, 20000), 'cr: the conversation ends on their photo and LinkedIn');
      await wait(900); await covered('#crTalk', 'cr conversation'); await linkCheck('#crTalk', 'cr conversation');
      rec(await page.evaluate(() => /linkedin\.com\/in\//.test(document.querySelector('#crLink').href) && /^data:image|^https?:/.test(document.querySelector('#crImg').src)), 'cr: the conversation has the photo and LinkedIn');
      await shot((mobile ? 'm-' : '') + 'cr-talk');
      await tap('#crClose', 'cr See you'); rec(await until(() => !document.querySelector('#crTalk').classList.contains('on'), null, 20000), 'cr: See you closes the conversation');
      // walking up to someone starts a conversation by itself
      await H(h => { const st = h.ST.cr, d = st._dbg; d.MET.clear(); d.place(); d.people[0].greeted = false; d.player.tgt = d.at(d.people[0].x, d.people[0].z).multiplyScalar(24); for (let i = 0; i < 200 && !d.talk().p; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } });
      rec(await H(h => { const T = h.ST.cr._dbg.talk(); return !!T.p && T.i === 0 && T.p.first === 'Ahroon'; }), 'cr: walking up to someone you have not met starts a conversation');
      rec(await page.evaluate(() => [...document.querySelectorAll('#crLabels .crl')].every(l => getComputedStyle(l).pointerEvents !== 'none' || !l.classList.contains('on'))), 'cr: name tags you can see can be clicked');
      await H(h => h.ST.cr._dbg.closeTalk()); await wait(600);
      // walking with the stick, the same one that flies the rocket: press, drag, and you walk that way
      await H(h => h.ST.cr._dbg.place());
      const moved = await H(h => { const st = h.ST.cr, d = st._dbg, c = h.renderer.domElement, x0 = d.player.x, z0 = d.player.z, X = innerWidth / 2, Y = innerHeight * .6;
        const ev = (t, x, y) => new PointerEvent(t, { pointerId: 77, pointerType: 'touch', clientX: x, clientY: y, bubbles: true });
        c.dispatchEvent(ev('pointerdown', X, Y)); window.dispatchEvent(ev('pointermove', X, Y - 30)); window.dispatchEvent(ev('pointermove', X, Y - 45));
        const shown = !document.querySelector('#crStick').hidden; for (let i = 0; i < 45; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); }
        window.dispatchEvent(ev('pointerup', X, Y - 45)); return { shown, dist: Math.hypot(d.player.x - x0, d.player.z - z0), hidden: document.querySelector('#crStick').hidden }; });
      rec(moved.shown && moved.hidden && moved.dist > 1, 'the touch stick walks you, and goes away when you let go', JSON.stringify(moved));
    }
  }
  /* on Earth there is no Orbit button and Escape does not leave: the way out is Home (the last flight aside) */
  rec(await page.evaluate(() => { const b = document.querySelector('#back'); return !b || getComputedStyle(b).display === 'none'; }), 'no Orbit button on Earth');
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  rec(await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), 'Escape on Earth stays on Earth');
  rec(await page.evaluate(() => { const a = document.querySelector('#home'); return !!a && getComputedStyle(a).display !== 'none' && !!a.getAttribute('href'); }), 'Home is there instead');
  await H(h => h.leaveEarth()); rec(await until(() => window.__heloria.S.mode === 'hub' || window.__heloria.S.mode === 'tohub', null, 180000), 'leaving Earth by its own means still takes you back to orbit');
  rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'back in orbit and flying');
  rec(await H(h => h.S.guide === 'off' && !h.S.lead), 'back from Earth, orbit is quiet: no instruction and no lead-in');

  /* ---- the last flight: meet all three, Ahroon asks, and it runs all the way to the white page ---- */
  await H(h => { const P = h.S.probe; P.p.set(1.2, 0, 0); P.v.set(0, 0, 0); h.S.ap = null; });
  rec(await until(() => window.__heloria.S.stId === 'cr', null, 180000), 'falling in again lands you on Earth');
  await H(h => h.ST.cr._dbg.skipCut()); await wait(800);
  // meet all three (heard out to the end), the last of them far across town from Ahroon: the camera goes over to him and he
  // asks from there; Not yet brings the camera back and leaves Let's fly on the screen, one click from the last flight
  await H(h => { const d = h.ST.cr._dbg, P = d.player, m = d.people[1]; d.place(); [P.x, P.z] = [m.x - 1.8, m.z - 1.8]; P.u.copy(d.at(P.x, P.z)); [1, 2, 0].forEach(i => { d.openTalk(d.people[i], d.people[i].lines.length - 1); d.closeTalk(true); }); });
  rec(await H(h => { const st = h.ST.cr, d = st._dbg, head = d.head(0); let near = 99;
    for (let i = 0; i < 240 && !(d.talk().p && d.talk().ask); i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); if (d.GLN.t >= 0) near = Math.min(near, st.camP.distanceTo(head)); }
    return !!d.talk().ask && d.talk().p === d.people[0] && d.GLN.t >= 0 && near < 6; }), 'once you have met all three, the camera goes to Ahroon and he asks there and then');
  await wait(600); await covered('#crTalk', 'the invitation');
  await tap('#crNot', 'Not yet');
  rec(await H(h => { const st = h.ST.cr, d = st._dbg; for (let i = 0; i < 200 && d.GLN.t >= 0; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } h.S.t += 1 / 30; st.update(1 / 30, h.S.t); return d.GLN.t < 0 && !d.talk().p && !document.querySelector('#crGo').hidden; }), "Not yet brings the camera back and leaves Let's fly on the screen");
  // he walks over and waits by you: he does not ask again, and Let's fly is still there
  rec(await H(h => { const st = h.ST.cr, d = st._dbg; for (let i = 0; i < 900 && d.AH.st === 'come'; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } for (let i = 0; i < 30; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); }
    return d.AH.st === 'here' && !d.talk().p && !document.querySelector('#crGo').hidden; }), "Ahroon walks over after Not yet and waits, with Let's fly still on the screen");
  // the conversation box fades out; its buttons stop taking clicks at once, so wait for the fade before looking
  await until(() => getComputedStyle(document.querySelector('#crTalk')).opacity === '0', null, 8000); await wait(1200);
  await covered('.st-cr', "Earth with the Let's fly button");
  await tap('#crGo', "Let's fly"); rec(await H(h => h.ST.cr._dbg.FIN.on), "Let's fly starts the last flight");
  // it opens with the launch scene, with Skip the one button on the screen; Skip goes straight on to the last flight
  rec(await until(() => { const d = window.__heloria.ST.cr._dbg; return d.FIN.pre && d.launch.state.on && +getComputedStyle(document.querySelector('#crSkip')).opacity > .9; }, null, 30000), 'the launch scene plays first, with Skip on the screen');
  await covered('.st-cr', 'the launch scene');
  await tap('#crSkip', 'Skip the launch scene'); rec(await H(h => { const d = h.ST.cr._dbg; return d.FIN.on && !d.FIN.pre && d.launch.state.done && !d.launch.state.on; }), 'Skip goes straight on to the last flight');
  await H(h => { h.S.finX = 6; });
  // on the pad, after the countdown, the rocket waits for you: hold and the engines spool up until it lights
  rec(await until(() => window.__heloria.ST.cr._dbg.FIN.ask, null, 300000), 'after the countdown the rocket waits on the pad for you');
  await wait(900);
  { const hp = await page.evaluate(() => { const e = document.querySelector('#holdp'); return { on: e.classList.contains('on'), t: e.textContent.trim(), op: +getComputedStyle(e).opacity }; });
    rec(hp.on && /hold/i.test(hp.t) && /launch/i.test(hp.t), 'the screen asks you to hold to launch', JSON.stringify(hp)); }
  await wait(1500); rec(await H(h => !h.ST.cr._dbg.FIN.ign), 'and it does not light until you hold');
  await shot((mobile ? 'm-' : '') + 'launch-hold');
  if (mobile) await H(h => window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 51, pointerType: 'touch', clientX: 195, clientY: 500, bubbles: true })));
  else await page.keyboard.down('Space');
  rec(await until(() => window.__heloria.ST.cr._dbg.FIN.held > .4, null, 120000) && await H(h => !h.ST.cr._dbg.FIN.ign), 'holding spools the engines up');
  rec(await until(() => window.__heloria.ST.cr._dbg.FIN.ign, null, 300000), 'and it lights once you have held long enough');
  if (mobile) await H(h => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 51, pointerType: 'touch', clientX: 195, clientY: 500, bubbles: true })));
  else await page.keyboard.up('Space');
  rec(await until(() => window.__heloria.post.uniforms.uLight.value.z > .05 && window.__heloria.S.stId === 'cr', null, 600000), 'it climbs until the camera looks back down at Earth, and the light comes in from the rocket');
  rec(await until(() => window.__heloria.S.mode === 'credits', null, 600000), 'and straight onto the white page: no scene in orbit after it');
  rec(await H(h => !h.U.probe.visible && h.S.st === null), 'Earth has put itself away behind the page');
  await H(h => { h.S.finX = 1; }); await wait(20000);
  rec(await page.evaluate(() => { const f = document.querySelector('#fin'); return !f.hidden && getComputedStyle(f).backgroundColor === 'rgb(255, 255, 255)' && /challenging what's impossible/.test(f.textContent) && !/Kríos|Aetos|Pharos|Ogive/.test(f.textContent); }), 'the last page is white and ends on the three of us');
  rec(await until(() => { const b = document.querySelector('#fin .fb'); return !!b && /Backed by Andrena Ventures/.test(b.textContent) && +getComputedStyle(b).opacity > .5; }, null, 30000), 'and under the line, who backs us: Andrena Ventures');   // (it fades in after the line above it)
  await covered('#fin', 'the white page'); await shot((mobile ? 'm-' : '') + 'fin-end');

  const fails = results.filter(r => !r.ok);
  console.log('\nSUMMARY ' + (results.length - fails.length) + ' passed, ' + fails.length + ' failed');
  fails.forEach(f => console.log('  FAILED: ' + f.name + (f.detail ? ' (' + f.detail + ')' : '')));
};

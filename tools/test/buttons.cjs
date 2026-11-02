/* Every-button test for the whole site. Run with the harness:
   node tools/test/shot.cjs --html dist/heloria.html --out /tmp/btn --scenario tools/test/buttons.cjs [--mobile]
   Set BTN_ONLY=kr,ae to test only some stations.
   It clicks real elements (Playwright refuses if anything covers them), checks each click does what it should,
   and checks every visible button in each screen is the topmost element at its centre. */
const results = [];
function rec(ok, name, detail) { results.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); }

module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const until = (fn, arg, t = 120000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true).catch(() => false);
  const click = async (sel, name) => { try { await page.click(sel, { timeout: 20000 }); return true; } catch (e) { rec(false, name || sel, e.message.split('\n')[0]); return false; } };
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
  rec(await page.evaluate(() => document.querySelectorAll('#load button,#load a').length === 0 && document.querySelector('#load').innerText.replace(/\s+/g, ' ').trim().split(' ').length <= 5), 'opening screen is only the mark and a prompt');
  if (mobile) await tap('#begin', 'Tap to begin'); else { await page.mouse.move(640, 400); await page.mouse.wheel(0, 240); }
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
  await tap('#skip', 'Skip to orbit'); rec(await until(() => window.__heloria.S.mode === 'hub'), 'Skip reaches orbit');
  await wait(1500);

  /* ---- hub ---- */
  await covered('#hub', 'orbit');
  await covered('#chrome', 'chrome');
  rec(await page.evaluate(() => !document.querySelector('#snd')), 'no sound indicator anywhere');
  rec(await page.evaluate(() => !document.querySelector('#rail,.tele,#where')), 'no chapter rail, telemetry or location label');
  // station labels and edge markers set autopilot
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

  /* ---- the horizon is sealed until every station has been visited ---- */
  await H(h => { h.S.ap = null; const P = h.S.probe; P.p.set(1.6, 0, 0); P.v.set(0, 0, 0); });
  await wait(4000);
  rec(await H(h => h.S.mode === 'hub' && Math.hypot(h.S.probe.p.x, h.S.probe.p.z) > 2), 'the horizon is sealed before every station is visited');
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

  /* ---- horizon: open once every station is visited ---- */
  await H(h => h.STA.forEach(s => h.S.docked.add(s.id)));
  await H(h => { const P = h.S.probe; P.p.set(1.2, 0, 0); P.v.set(0, 0, 0); });
  rec(await until(() => window.__heloria.S.mode === 'beyond', null, 180000), 'falling in reaches the horizon page');
  await wait(1500); await covered('#horizon', 'horizon');
  await tap('#hzBack', 'Return to orbit'); rec(await until(() => window.__heloria.S.mode === 'hub', null, 180000), 'Return to orbit works');
  await H(h => { const P = h.S.probe; P.p.set(1.2, 0, 0); P.v.set(0, 0, 0); });
  await until(() => window.__heloria.S.mode === 'beyond', null, 180000); await wait(1500);
  await tap('#hzBeacon', 'Leave a signal'); rec(await until(() => window.__heloria.S.stId === 'be', null, 180000), 'Leave a signal docks at the Beacon');

  const fails = results.filter(r => !r.ok);
  console.log('\nSUMMARY ' + (results.length - fails.length) + ' passed, ' + fails.length + ' failed');
  fails.forEach(f => console.log('  FAILED: ' + f.name + (f.detail ? ' (' + f.detail + ')' : '')));
};

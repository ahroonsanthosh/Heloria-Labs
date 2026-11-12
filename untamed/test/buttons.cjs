/* Every-button test for Land, from the loader to the white page. Run with the harness:
   node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/btn --scenario untamed/test/buttons.cjs [--mobile]
   It clicks real elements (Playwright refuses if anything covers them), checks each click does what it should,
   and checks every visible button in each screen is the topmost element at its centre. */
const results = [];
function rec(ok, name, detail) { results.push({ ok, name, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); }

module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const until = (fn, arg, t = 120000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true).catch(() => false);
  /* a click as a person makes it: the hand moves to the button first */
  const reach = async sel => { const r = await page.evaluate(q => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.x + b.width / 2, b.y + b.height / 2] : null; }, sel).catch(() => null);
    if (r) { await page.mouse.move(r[0] - 12, r[1] - 8); await page.mouse.move(r[0], r[1], { steps: 2 }); } };
  const click = async (sel, name) => { try { await reach(sel); await page.click(sel, { timeout: 20000 }); return true; } catch (e) { rec(false, name || sel, e.message.split('\n')[0]); return false; } };
  const tap = async (sel, name) => mobile ? (async () => { try { await page.tap(sel, { timeout: 20000 }); return true; } catch (e) { rec(false, name || sel, e.message.split('\n')[0]); return false; } })() : click(sel, name);
  // every visible, enabled button or link in a container must be on top at its centre
  const covered = async (scope, label) => {
    const bad = await page.evaluate(scope => {
      const out = []; const root = document.querySelector(scope); if (!root) return ['scope missing ' + scope];
      root.querySelectorAll('button,a[href],input').forEach(el => {
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
  rec(await page.evaluate(() => /to land$/i.test(document.querySelector('#beginT').textContent)), 'the prompt says land');
  rec(await until(() => window.__heloria.S.mode === 'station' && window.__heloria.S.stId === 'cr', null, 60000), 'it comes straight down onto Earth');
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
  /* on Earth Escape does not leave: the way out is Home (the last flight aside) */
  rec(await page.evaluate(() => !document.querySelector('#back')), 'no Orbit button on Earth');
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  rec(await H(h => h.S.mode === 'station' && h.S.stId === 'cr'), 'Escape on Earth stays on Earth');
  rec(await page.evaluate(() => { const a = document.querySelector('#home'); return !!a && getComputedStyle(a).display !== 'none' && !!a.getAttribute('href'); }), 'Home is there');

  /* ---- the last flight: meet all three, Ahroon asks, and it runs all the way to the white page ---- */
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
  /* the conversation box fades out; its buttons stop taking clicks at once, so wait for the fade before looking (a fade
     moves on only as frames are drawn, and a loaded test browser can go seconds between them) */
  await until(() => getComputedStyle(document.querySelector('#crTalk')).opacity === '0', null, 60000); await wait(1200);
  await covered('.st-cr', "Earth with the Let's fly button");
  /* the launch scene is made ready out of sight once all three are met, a part a frame; on this slow machine its last part
     (its shaders) takes long enough that pressing Let's fly first would hold the page while the scene's sound runs on, so
     it is let finish, as a visitor reading the button gives it time to */
  await until(() => window.__heloria.ST.cr._dbg.launch.state.built, null, 300000);
  await tap('#crGo', "Let's fly"); rec(await H(h => h.ST.cr._dbg.FIN.on), "Let's fly starts the last flight");
  /* it opens with the launch scene, with Skip the one button on the screen; Skip goes straight on to the last flight.
     Skip fades in, and the cards go, only as frames are drawn: a loaded test browser draws the scene's first frames
     slowly, so give it time */
  rec(await until(() => { const d = window.__heloria.ST.cr._dbg; return d.FIN.pre && d.launch.state.on && +getComputedStyle(document.querySelector('#crSkip')).opacity > .9; }, null, 180000), 'the launch scene plays first, with Skip on the screen');
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
  rec(await until(() => window.__heloria.S.mode === 'credits', null, 600000), 'and straight onto the white page');
  rec(await H(h => h.S.st === null), 'Earth has put itself away behind the page');
  await H(h => { h.S.finX = 1; }); await wait(20000);
  rec(await page.evaluate(() => { const f = document.querySelector('#fin'); return !f.hidden && getComputedStyle(f).backgroundColor === 'rgb(255, 255, 255)' && /challenging what's impossible/.test(f.textContent) && !/Kríos|Aetos|Pharos|Ogive/.test(f.textContent); }), 'the last page is white and ends on the three of us');
  rec(await until(() => { const b = document.querySelector('#fin .fb'); return !!b && /Backed by Andrena Ventures/.test(b.textContent) && +getComputedStyle(b).opacity > .5; }, null, 30000), 'and under the line, who backs us: Andrena Ventures');   // (it fades in after the line above it)
  await covered('#fin', 'the white page'); await shot((mobile ? 'm-' : '') + 'fin-end');
  { const fa = await page.evaluate(() => [...document.querySelectorAll('#fin .fa > *')].map(e => [e.id, e.textContent.trim(), e.getAttribute('href')]));
    rec(fa.length === 3 && fa[0][1] === 'Walk through our work' && fa[0][2] && fa[1][0] === 'finAgain' && fa[1][1] === 'Land again' && /^mailto:/.test(fa[2][2] || ''),
      'its way on: Walk through our work, Land again, and our email', JSON.stringify(fa)); }
  /* Land again: the page from its start, the loader and the rocket coming down */
  { const fresh = page.waitForEvent('load', { timeout: 180000 }).then(() => true).catch(() => false);
    await tap('#finAgain', 'Land again'); rec(await fresh, 'Land again opens the page afresh');
    rec(await until(() => !!window.__heloria && window.__heloria.S.ready && window.__heloria.S.mode === 'load', null, 600000), 'at its loader, ready to land again'); }

  const fails = results.filter(r => !r.ok);
  console.log('\nSUMMARY ' + (results.length - fails.length) + ' passed, ' + fails.length + ' failed');
  fails.forEach(f => console.log('  FAILED: ' + f.name + (f.detail ? ' (' + f.detail + ')' : '')));
};

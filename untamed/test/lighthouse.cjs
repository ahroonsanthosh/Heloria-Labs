/* Steering the lighthouse: the button by it, dragging the beam round, the lost drone following it home, letting go.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/lighthouse.cjs [--mobile] */
module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '', fail = m => { log('FAIL ' + m); process.exitCode = 1; };
  await H(h => { const d = h.ST.cr._dbg; d.sky.set({ time: '21:30', weather: 'clear' }); d.sky.step(1); });
  /* walk up to the lighthouse: its card, then the button to take the light */
  await H(h => { const d = h.ST.cr._dbg, q = d.INST.ph; d.player.x = q.x - 2.6; d.player.z = q.z - .6; d.player.u.copy(d.at(d.player.x, d.player.z)); });
  await page.mouse.move(300, 300); await page.mouse.down(); await page.mouse.move(330, 300, { steps: 3 }); await page.mouse.up();   // you have started walking
  let ok = false; for (let i = 0; i < 120 && !ok; i++) { await wait(500); ok = await page.evaluate(() => { const b = document.querySelector('#crSteer'); return b && !b.hidden && getComputedStyle(b).display !== 'none'; }); }
  if (!ok) { fail('no Steer the light button by the lighthouse'); return; }
  await shot(P + 'lh-button');
  await page.click('#crSteer'); await wait(800);
  let s = await H(h => ({ on: h.ST.cr._dbg.steer.PHS.on, yaw: h.ST.cr._dbg.steer.PHS.yaw })); log('steering', JSON.stringify(s)); if (!s.on) fail('steering did not start');
  const ui = await page.evaluate(() => !document.querySelector('#crSteerUI').hidden); if (!ui) fail('no Done / drag hint while steering');
  await wait(2500); await shot(P + 'lh-steer');
  /* drag: the beam turns with your hand */
  const y0 = s.yaw, vp = page.viewportSize();
  if (mobile) { await page.evaluate(([w, h]) => { const t = (type, x) => { const tc = new Touch({ identifier: 7, target: document.querySelector('canvas') || document.body, clientX: x, clientY: h * .45 }); const ev = new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: h * .45, bubbles: true }); (document.querySelector('canvas') || document.body).dispatchEvent(ev); }; t('pointerdown', w * .7); for (let i = 1; i <= 8; i++) t('pointermove', w * .7 - i * 20); t('pointerup', w * .7 - 160); }, [vp.width, vp.height]); }
  else { await page.mouse.move(vp.width * .7, vp.height * .45); await page.mouse.down(); await page.mouse.move(vp.width * .4, vp.height * .45, { steps: 10 }); await page.mouse.up(); }
  await wait(600); s = await H(h => ({ yaw: h.ST.cr._dbg.steer.PHS.yaw })); log('after drag yaw', y0.toFixed(2), '->', s.yaw.toFixed(2)); if (!(Math.abs(s.yaw - y0) > .3)) fail('the drag did not turn the light');
  await wait(2000); await shot(P + 'lh-turned');
  /* the lost drone: hold the beam on it and it comes home */
  await H(h => { const p = h.ST.cr._dbg.steer.PHS; p.yaw = p.lost.a; p.v = 0; });
  await H(h => h.ST.cr._dbg.steer.step(1.4)); s = await H(h => h.ST.cr._dbg.steer.PHS.state); log('drone after 1.4 s in the beam:', s); if (!(s === 'lock' || s === 'home')) fail('the drone did not lock on');
  await wait(1500); await shot(P + 'lh-lock');
  await H(h => h.ST.cr._dbg.steer.step(4.5)); s = await H(h => h.ST.cr._dbg.steer.PHS.state); log('drone after the flight:', s); if (s !== 'gone') fail('the drone did not come home');
  /* let go */
  await page.click('#crSteerDone'); await wait(1200); s = await H(h => h.ST.cr._dbg.steer.PHS.on); if (s) fail('Done did not let go of the light');
  await wait(2000); await shot(P + 'lh-done');
  if (!process.exitCode) log('LIGHTHOUSE OK');
};

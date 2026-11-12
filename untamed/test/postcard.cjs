/* Postcards: the camera button, framing a view, taking it, the card that comes out (its size, stamp and postmark), saving it.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/postcard.cjs [--mobile] */
module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '', fail = m => { log('FAIL ' + m); process.exitCode = 1; };
  await H(h => { const d = h.ST.cr._dbg; d.sky.set({ time: '16:40', weather: 'clear' }); d.sky.step(.5); const q = d.INST.ph; d.player.x = q.x - 3.2; d.player.z = q.z - 1.2; d.player.u.copy(d.at(d.player.x, d.player.z)); });
  const vp = page.viewportSize(); await page.mouse.move(vp.width * .3, vp.height * .5); await page.mouse.down(); await page.mouse.move(vp.width * .3 + 40, vp.height * .5, { steps: 3 }); await page.mouse.up();   // out walking
  let ok = false; for (let i = 0; i < 120 && !ok; i++) { await wait(500); ok = await page.evaluate(() => { const b = document.querySelector('#crPost'); return b && !b.hidden && getComputedStyle(b).display !== 'none'; }); }
  if (!ok) { fail('no postcard button while walking'); return; }
  await page.click('#crPost'); await wait(1200);
  const framing = await page.evaluate(() => !document.querySelector('#crFrame').hidden && +getComputedStyle(document.querySelector('.st-cr .card')).opacity < .1);
  if (!framing) fail('framing did not open, or the labels stayed up over it'); await shot(P + 'pc-frame');
  await page.click('#crFrameTake');
  let card = false; for (let i = 0; i < 60 && !card; i++) { await wait(500); card = await page.evaluate(() => { const c = document.querySelector('#crCard'), i = document.querySelector('#crCardImg'); return !c.hidden && i.complete && i.naturalWidth > 0; }); }
  if (!card) { fail('no postcard came out'); return; }
  const info = await page.evaluate(() => { const i = document.querySelector('#crCardImg'), a = document.querySelector('#crCardSave'); return { w: i.naturalWidth, h: i.naturalHeight, href: a.href.slice(0, 5), dl: a.download }; });
  const last = await H(h => h.ST.cr._dbg.post.last); log('postcard', JSON.stringify(info), JSON.stringify(last));
  if (mobile ? !(info.w === 1200 && info.h === 1500) : !(info.w === 1800 && info.h === 1200)) fail('the card is the wrong size');
  if (!(info.href === 'blob:' && /^heloria-postcard-.*\.jpg$/.test(info.dl))) fail('Save does not save the picture');
  if (!(last.where === 'ph' && /SUNSET|CLEAR/.test(last.wx) && /^\d\d:\d\d$/.test(last.time))) fail('the stamp or the postmark is wrong');
  await wait(800); await shot(P + 'pc-card');
  await page.click('#crCardClose'); await wait(600); if (!(await page.evaluate(() => document.querySelector('#crCard').hidden))) fail('Close did not put the card away');
  if (!process.exitCode) log('POSTCARD OK');
};

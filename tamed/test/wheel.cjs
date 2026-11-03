/* Probe: what the page receives from wheel input, and where the walk settles, over two scrolls.
   node tamed/test/run.cjs --lowq --scenario tamed/test/wheel.cjs */
module.exports = async ({ page, wait, T, log }) => {
  await page.hover('#tamed'); await page.click('#tamed'); await page.waitForFunction(() => window.__tamed.S.mode === 'world', null, { timeout: 60000 });
  for (let round = 0; round < 2; round++) {
    for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, 235); await wait(30); }
    for (let i = 0; i < 5; i++) { await wait(1500); const x = await T(t => ({ s: t.state().s, v: t.state().v, tg: t.state().target, w: t.S.wheelLog, glide: t.SC.glide, pin: t.SC.pin, dir: t.SC.dir, in: t.SC.inertia })); log(round, JSON.stringify(x)); }
  }
};

/* Beginning from the loader as a person does: the hand goes to the mouse first (which, behind the loader, stops any more of
   the other worlds being made), whatever step is already being made finishes, then the click. Behind a slow machine's
   loader one such step can take seconds; on a real one, a moment. */
module.exports = async (page, mobile) => {
  if (mobile) { await page.tap('#load'); return; }
  const vp = page.viewportSize(), x = vp.width / 2, y = vp.height / 2;
  await page.mouse.move(x - 30, y - 20); await page.mouse.move(x, y, { steps: 3 });
  await page.waitForFunction(() => !(window.__heloria && window.__heloria.late && window.__heloria.late().busy), null, { timeout: 180000, polling: 100 }).catch(() => {});
  await page.mouse.click(x, y);
};

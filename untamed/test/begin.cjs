/* Beginning from the loader as a person does: the hand goes to the mouse first, then the click (on a phone, a tap). */
module.exports = async (page, mobile) => {
  if (mobile) { await page.tap('#load'); return; }
  const vp = page.viewportSize(), x = vp.width / 2, y = vp.height / 2;
  await page.mouse.move(x - 30, y - 20); await page.mouse.move(x, y, { steps: 3 });
  await page.mouse.click(x, y);
};

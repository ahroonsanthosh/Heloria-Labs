/* The way in: Land comes down by itself once Earth is ready (no click, no scroll asked for). Waits until it has. */
module.exports = async (page) => {
  await page.waitForFunction(() => window.__heloria && window.__heloria.S.mode !== 'load', null, { timeout: 120000, polling: 100 });
};

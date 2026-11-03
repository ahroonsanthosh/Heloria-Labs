/* Relative cost of each place: frames rendered over a fixed wall time (SwiftShader, so only the ratios mean anything).
   node tamed/test/run.cjs --scenario tamed/test/perf.cjs [--mobile] */
module.exports = async ({ page, wait, T, frames, log }) => {
  await T(t => t.enter()); await wait(3000);
  const out = {};
  for (const [id, s] of [['home', 0], ['door', .5], ['krios', 1], ['aetos', 2], ['pharos', 3], ['ogive', 4], ['team', 5], ['contact', 6]]) {
    await T((t, s) => { if (s % 1) { t.jump(0); t.setV(s); } else t.jump(s); }, s); await frames(2);
    const f0 = await T(t => t.S.frame), t0 = Date.now(); await wait(12000); const f1 = await T(t => t.S.frame);
    out[id] = +((Date.now() - t0) / Math.max(1, f1 - f0)).toFixed(0);
    log('ms/frame', id, out[id]);
  }
  log('PERF', JSON.stringify(out));
};

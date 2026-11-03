/* Debug probe: read back the HDR scene target at a few screen points for a given walk position.
   node tamed/test/run.cjs --scenario tamed/test/debug.cjs --s 0 */
module.exports = async ({ page, shot, wait, T, frames, settle, log }) => {
  const sArg = process.argv.indexOf('--s'); const s = sArg > 0 ? +process.argv[sArg + 1] : 0;
  await T(t => t.enter()); await wait(3200);
  await T((t, s) => t.jump(s), s); await settle(4);
  const r = await T(t => ({ state: t.state(), cam: t.CAM.out.position.toArray().map(v => +v.toFixed(2)), fov: t.CAM.out.fov, sun: t.SUN.dir.toArray().map(v => +v.toFixed(3)), el: t.SUN.el,
    px: t.probe([[.5, .1], [.5, .3], [.5, .5], [.5, .7], [.5, .9], [.2, .5], [.8, .5]]) }));
  log(JSON.stringify(r));
  await shot('debug-s' + s);
};

/* Quick stills for iterating on one place: node tamed/test/run.cjs --hq --scenario tamed/test/look.cjs --out <dir> --at "0:home,0.3:approach"
   Each entry is s:name[:el:az] (s is a stop index when whole, otherwise a raw scroll position; el and az override the sun).
   --people makes the team rise first. */
module.exports = async ({ page, shot, wait, T, frames, settle, log }) => {
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  const list = (arg('at') || '0:home').split(',').map(x => { const [s, n, el, az, cam] = x.split(':'); return { s: +s, n: n || ('s' + s), sun: el != null && el !== '' ? [+el, +az] : null, cam: cam ? cam.split('/').map(Number) : null }; });
  if (process.argv.includes('--hold')) await T(t => t.holdPeople(true));
  await T(t => t.enter()); await wait(1500);
  for (const { s, n, sun, cam } of list) {
    await T((t, a) => { t.sun(a.sun ? a.sun[0] : null, a.sun ? a.sun[1] : null); t.cam(a.cam ? 'out' : null, a.cam && a.cam.slice(0, 3), a.cam && a.cam.slice(3, 6), a.cam && a.cam[6]); if (a.s % 1) { t.jump(0); t.setV(a.s); } else t.jump(a.s); }, { s, sun, cam });
    if (process.argv.includes('--people')) await T(t => t.people(true));
    if (process.argv.includes('--hold')) await T(t => t.holdPeople(true));
    await settle(3); await wait(900); await settle(2);
    await shot(n);
  }
};

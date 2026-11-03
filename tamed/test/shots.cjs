/* Stills of every place: the gate (at rest, and each of its three ways shown), Home, the four rooms, Team (reflections,
   then risen), Contact and its rocket, and the hold index.
   node tamed/test/run.cjs --scenario tamed/test/shots.cjs --out <dir> [--mobile] [--hq] [--only home,krios] */
module.exports = async ({ page, shot, wait, T, frames, settle, log, mobile, check }) => {
  const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
  const want = n => !only.length || only.some(o => n.includes(o));
  const t0 = Date.now();
  const still = async (n) => { await settle(3); await wait(1200); await settle(2); await shot(n); log('  t=' + ((Date.now() - t0) / 1000).toFixed(0) + 's'); };
  if (want('gate')) {
    await wait(2600); await still('01-gate');
    await T(t => t.hover('walk')); await wait(1800); await still('02-gate-walk');
    await T(t => t.hover('land')); await wait(4600); await still('02-gate-land');
    await T(t => t.hover('fly')); await wait(2200); await still('02-gate-fly');
    await T(t => t.hover(null));
  }
  await T(t => t.enter()); await wait(3200); await settle(4);
  if (want('home')) { await T(t => t.jump(0)); await still('04-home'); }
  if (want('cursor')) {
    await page.mouse.move(400, 640); await settle(2);
    for (let i = 0; i <= 8; i++) { await page.mouse.move(400 + i * 60, 640 - i * 14); await settle(1); }
    await still('04b-home-cursor');
  }
  const places = [['krios', '05-krios'], ['aetos', '06-aetos'], ['pharos', '07-pharos'], ['ogive', '08-ogive'], ['team', '09-team'], ['contact', '11-contact']];
  for (const [id, n] of places) {
    if (!want(id)) continue;
    await T((t, id) => { const p = t.PLACES.find(p => p.id === id); t.jump(p.s); }, id);
    await still(n);
    if (id === 'team') { await T(t => t.people(true)); await still('10-team-risen'); await T(t => t.people(false)); }
    if (id === 'contact') { await page.waitForFunction(() => document.querySelector('#rocket').classList.contains('on'), null, { timeout: 120000, polling: 250 }).catch(() => {}); await wait(2500); await still('11b-contact-rocket'); }
  }
  if (want('door')) {
    for (const [v, n] of [[.22, '17-approach'], [.42, '18-door-near'], [.5, '19-door-in'], [4.5, '20-door-out'], [5.5, '21-far-arch']]) {
      await T((t, v) => { t.jump(0); t.setV(v); }, v); await still(n);
    }
  }
  if (want('index')) { await T(t => { t.jump(1); }); await settle(2); await T(t => t.openIndex()); await wait(900); await still('12-index'); await T(t => t.closeIndex()); }
};

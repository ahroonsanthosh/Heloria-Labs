/* The worlds made after the loader. Each way in opens on its own world alone (Land on Earth, Fly and the rocket's way in on
   the orbit, the rocket's with Aetos too); the rest is made after, and wherever you go before it is, it is made then:
   into orbit from Earth the white holds until the orbit is made, docking holds until the station is, and through the
   horizon the white holds until Earth is. Run once per way:
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/late --scenario untamed/test/late.cjs
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/late --scenario untamed/test/late.cjs --hash land
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/late --scenario untamed/test/late.cjs --hash aetos */
module.exports = async ({ page, wait, H, log, shot }) => {
  let pass = 0, fail = 0; const failed = [];
  const ok = (c, m, x) => { if (c) pass++; else { fail++; failed.push(m); } log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  (' + JSON.stringify(x) + ')' : '')); };
  const until = (fn, arg, ms = 240000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true).catch(() => false);
  const stage = id => H((h, id) => (h.late().q.split(' ').find(x => x.startsWith(id + ':')) || id + ':4').split(':')[1] * 1, id);
  const entry = await H(h => h.S.entry), first = { land: ['cr'], fly: ['U'], aetos: ['U', 'ae'] }[entry];
  log('way in:', entry, '| still to make at ready:', (await H(h => h.late())).q);
  const q = (await H(h => h.late())).q;
  ok(first.every(id => !q.includes(id + ':')), 'the way in\'s own world is made before the loader lets you in', first);
  ok(q.split(' ').filter(Boolean).length >= 5, 'the other worlds are left for after', q);
  await page.mouse.click(Math.round(page.viewportSize().width / 2), Math.round(page.viewportSize().height * .55));   // in
  if (entry === 'land') {
    ok(await until(() => window.__heloria.S.mode === 'station' && window.__heloria.S.stId === 'cr'), 'Land comes down on Earth');
    await wait(1500);
    const u0 = await stage('U'); log('the orbit, before leaving Earth: stage', u0);
    await H(h => h.leaveEarth());
    if (u0 < 4) ok(await H(h => h.S.mode === 'white' && h.S.flashMin === 1), 'leaving Earth before the orbit is made: the white holds');
    ok(await until(() => ['tohub', 'hub'].includes(window.__heloria.S.mode)), 'and then into orbit');
    ok(await stage('U') === 4, 'the orbit is made by then');
    ok(await until(() => window.__heloria.S.mode === 'hub'), 'in orbit');
    const k0 = await stage('kr'); log('Kríos, before docking: stage', k0);
    await H(h => h.dock('kr'));
    ok(await until(() => window.__heloria.S.stId === 'kr' && ['docking', 'station'].includes(window.__heloria.S.mode)), 'docking at Kríos waits for it, then docks', k0);
    ok(await stage('kr') === 4, 'Kríos is made');
    await until(() => window.__heloria.S.mode === 'station'); await wait(1500); await shot('late-land-kr');
  } else {
    ok(await until(() => ['entering', 'story', 'tohub', 'hub'].includes(window.__heloria.S.mode)), 'in');
    if (entry === 'fly') { await until(() => window.__heloria.S.mode === 'story'); await H(h => h.escape()); }
    ok(await until(() => window.__heloria.S.mode === 'hub'), 'in orbit');
    const e0 = await stage('cr'); log('Earth, before the horizon: stage', e0);
    await H(h => h.crossHorizon());
    ok(await until(() => window.__heloria.S.mode === 'falling'), 'falling');
    ok(await until(() => window.__heloria.S.mode === 'station' && window.__heloria.S.stId === 'cr', null, 400000), 'through the horizon, onto Earth', e0);
    ok(await stage('cr') === 4, 'Earth is made');
    ok(await H(h => !h.S.flashMin), 'and the white let go');
    await wait(2500); await shot('late-' + entry + '-earth');
  }
  const r = await H(h => ({ log: h.late().log.length, progs: h.renderer.info.programs.length }));
  log('steps taken after the loader:', r.log, '| shaders now:', r.progs);
  log(fail ? fail + ' FAILED: ' + failed.join(' | ') : 'ALL ' + pass + ' CHECKS PASSED');
  if (fail) process.exitCode = 1;
};

/* What sounds all the time is played from recordings (see LOOPS in 05-audio.js). This walks the gate (at rest and each of
   its three ways), home, a doorway, each room, the team and contact, and at each checks that exactly the right recordings
   are playing, at a volume heading where it should, and that nothing else plays: a recording that should be silent there
   must have faded out and stopped.
     node tamed/test/run.cjs --html dist/tamed.html --lowq --scenario tamed/test/loops.cjs --out /tmp/loops */
const ALL = ['waterClosed', 'waterOpen', 'warm', 'dark', 'wind', 'music', 'ae', 'phTone', 'phAir', 'og', 'ogHiss', 'kr', 'rkFar', 'rkNear'];
module.exports = async ({ page, wait, T, settle, log, check, mobile }) => {
  const loops = () => T(t => t.A.loops());
  /* playing: each named recording plays at a volume near the one it heads for; optional ones may play or not; every other
     one is stopped. A stage gets time to settle: the slowest fade (the score, 0.9 s) takes about six seconds to silence */
  const stage = async (label, playing, optional = [], timeout = 30000) => {
    const t0 = Date.now(); let L, bad = [];
    while (Date.now() - t0 < timeout) {
      L = await loops(); const by = Object.fromEntries(L.map(l => [l.name, l])); bad = [];
      for (const nm of playing) { const l = by[nm]; if (!l.playing) bad.push(nm + ' not playing'); else if (!(l.want > 0) || l.vol < l.want * .5) bad.push(nm + ' at ' + l.vol + ' heading for ' + l.want); }
      for (const nm of ALL) if (!playing.includes(nm) && !optional.includes(nm) && by[nm].playing) bad.push(nm + ' playing at ' + by[nm].vol + ' (should be silent)');
      if (!bad.length) break;
      await wait(500);
    }
    const on = L.filter(l => l.playing).map(l => l.name + ' ' + l.vol).join(', ');
    check(!bad.length, label + ': ' + (bad.length ? bad.join('; ') : 'playing ' + (on || 'nothing')));
    return L;
  };
  /* the recordings are worked out a moment after the page loads */
  await page.waitForFunction(() => window.__tamed.A.rendered > 0, null, { timeout: 300000, polling: 500 });
  const made = await loops();
  check(made.every(l => l.ready && l.bytes > 0), 'every recording is made: ' + made.map(l => l.name + ' ' + (l.bytes / 1024).toFixed(0) + ' KB').join(', '));
  log('  recordings: ' + (made.reduce((a, l) => a + l.bytes, 0) / 1048576).toFixed(2) + ' MB, worked out in ' + (await T(t => t.A.rendered)) + ' ms');
  /* nothing plays before the sound is woken */
  await stage('before any click, nothing plays', [], [], 3000);
  if (!mobile) await page.mouse.click(8, 8); else await page.touchscreen.tap(8, 8);   // the first touch of the gate wakes the sound
  await page.waitForFunction(() => window.__tamed.A.on && window.__tamed.A.ctx.state === 'running', null, { timeout: 30000 });
  if (!mobile) {
    await T(t => t.hover(null));
    await stage('the gate at rest: the score from the first moment, and the lake', ['music', 'waterOpen', 'waterClosed']);
    await T(t => t.hover('walk')); await stage('the gate showing Walk: the warm light and the lake, the score under them', ['warm', 'waterOpen', 'music']);
    await T(t => t.hover('land')); await stage('the gate showing Land: open air, the score under it', ['wind', 'music']);
    await T(t => t.hover('fly')); await stage('the gate showing Fly: the dark, the score under it', ['dark', 'music']);
    await T(t => t.hover(null));
  }
  await T(t => t.enter()); await wait(3500); await settle(3);
  await stage('home: the score, open water and air in the grass', ['music', 'waterOpen', 'wind']);
  /* in a doorway the water is half muffled: both its recordings play, crossed */
  const v = await T(t => { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (t.walkAt(m).s < .51) a = m; else b = m; } return (a + b) / 2; });
  await T((t, v) => t.setV(v), v); await settle(3);
  const s = await T(t => t.S.s); log('  doorway at s=' + s.toFixed(3));
  await stage('the front doorway: the water half muffled, both recordings crossed', ['music', 'waterOpen', 'waterClosed'], ['wind', 'ae']);
  for (const [id, own, opt] of [['aetos', ['ae'], []], ['pharos', ['phTone'], ['phAir']], ['ogive', ['og', 'ogHiss'], []], ['krios', ['kr'], []]]) {
    await T((t, id) => { const p = t.PLACES.find(p => p.id === id); t.jump(p.s); }, id); await settle(3);
    await stage(id + ': its own sound, the score, the water muffled', ['music', 'waterClosed'].concat(own), opt);
  }
  /* Pharos: the air of doubt follows how sure the drone is */
  { await T(t => { const p = t.PLACES.find(p => p.id === 'pharos'); t.jump(p.s); }); await settle(3); await wait(6000);
    const L = await loops(), by = Object.fromEntries(L.map(l => [l.name, l])), lock = await T(t => t.GAL.room('pharos').lock);
    check(Math.abs(by.phAir.want - (1 - lock) * Math.sqrt((300 + (1 - lock) * 900) / 1200)) < .15 && by.phTone.want > .3, 'Pharos follows the drone: lock ' + lock.toFixed(2) + ', tone ' + by.phTone.want + ', air ' + by.phAir.want); }
  await T(t => { const p = t.PLACES.find(p => p.id === 'team'); t.jump(p.s); }); await settle(3);
  await stage('team: the score, open water, a little air', ['music', 'waterOpen', 'wind']);
  await T(t => { const p = t.PLACES.find(p => p.id === 'contact'); t.jump(p.s); }); await settle(3);
  await stage('contact: the score, open water, air in the grass', ['music', 'waterOpen', 'wind'], ['rkFar']);
  /* and the rocket from the far shore, heard a couple of seconds after it rises */
  await page.waitForFunction(() => window.__tamed.LAUNCH.heard > .3, null, { timeout: 150000, polling: 250 }).catch(() => {});
  await stage('contact, a rocket going up far off', ['music', 'waterOpen', 'wind', 'rkFar'], [], 15000);
  /* tab hidden: everything stops; back: it comes back */
  await T(t => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await wait(600); { const L = await loops(); check(L.every(l => !l.playing), 'a hidden tab plays nothing (' + L.filter(l => l.playing).map(l => l.name).join(', ') + ')'); }
  await T(t => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await stage('back in front, it plays again', ['music', 'waterOpen', 'wind'], ['rkFar']);
};

/* Leaving the page and coming back, on Earth: a hidden tab, another app or a locked phone stops every recording in that
   same moment and puts the live sound to sleep (a phone may freeze the page next, and would play its recordings on in the
   background); coming back brings it back. Another window only in front of it, the page still showing, is not leaving:
   the sound plays on.
     node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/leave --scenario untamed/test/leave.cjs [--mobile] */
module.exports = async ({ page, wait, H, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const until = async (fn, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await H(fn)) return true; await wait(250); } return false; };
  const playing = () => H(h => h.A._loops().filter(l => l.playing).map(l => l.name));
  await until(h => h.A && h.A._loops().filter(l => l.ready).length >= 3, 240000);
  await require('./begin.cjs')(page, mobile);
  await until(h => h.S.mode === 'station' && h.S.stId === 'cr', 60000); await H(h => h.ST.cr._dbg && h.ST.cr._dbg.skipCut && h.ST.cr._dbg.skipCut());
  rec(await until(h => h.A._loops().some(l => l.playing && l.name === 'music'), 60000), 'on Earth the town music plays', (await playing()).join(', '));
  for (const round of [1, 2]) {
    const now = await H(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
      return h.A._loops().filter(l => l.playing).map(l => l.name); });
    rec(!now.length, 'round ' + round + ': a hidden tab stops every recording at once', now.join(', '));
    await wait(1500);
    const st = await H(h => h.A.ctx && h.A.ctx.state), still = await playing();
    rec(!still.length && st !== 'running', 'round ' + round + ': while hidden nothing plays and the live sound sleeps', st + ' ' + still.join(', '));
    await H(h => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    rec(await until(h => h.A._loops().some(l => l.playing && l.name === 'music') && h.A.ctx.state === 'running', 20000), 'round ' + round + ': back in front, the music plays again', (await playing()).join(', '));
  }
  await H(h => window.dispatchEvent(new Event('blur'))); await wait(3000);
  rec(await H(h => h.A._loops().some(l => l.playing && l.name === 'music')), 'another window only in front (the page still showing): the music plays on', (await playing()).join(', '));
  await H(h => window.dispatchEvent(new Event('focus')));
  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

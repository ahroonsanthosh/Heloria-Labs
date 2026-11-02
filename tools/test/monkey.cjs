/* Plays every game roughly: real Play click, then random clicks, drags and keys for a while, with screenshots.
   Catches runtime errors in game loops that a plain button test never reaches.
   node tools/test/shot.cjs --html dist/heloria.html --out /tmp/monkey --scenario tools/test/monkey.cjs [--mobile]
   Set MONKEY_ONLY=kr,bs to limit stations, MONKEY_SECONDS=20 to change how long each game is played. */
module.exports = async ({ page, shot, wait, H, log, mobile }) => {
  const only = (process.env.MONKEY_ONLY || '').split(',').filter(Boolean);
  const secs = +(process.env.MONKEY_SECONDS || 24);
  const ids = (await H(h => h.STA.map(s => s.id))).filter(id => !only.length || only.includes(id));
  const vp = page.viewportSize();
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const id of ids) {
    const ok = await H((h, id) => h.jump(id), id); if (!ok) { log(id + ': jump failed'); continue; }
    await wait(2500); await shot((mobile ? 'm-' : '') + id + '-0menu');
    const play = '.st-' + id + ' .go [data-play]';
    if (!(await page.$(play))) { log(id + ': no play button (page only)'); continue; }
    try { mobile ? await page.tap(play, { timeout: 15000 }) : await page.click(play, { timeout: 15000 }); } catch (e) { log(id + ': Play click failed ' + e.message.split('\n')[0]); continue; }
    const started = await page.waitForFunction(id => window.__heloria.ST[id].state === 'play', id, { timeout: 30000 }).then(() => true).catch(() => false);
    log(id + ': started ' + started);
    const t0 = Date.now(); let n = 0, shots = 0;
    while (Date.now() - t0 < secs * 1000) {
      const st = await H((h, id) => h.ST[id].state, id); if (st !== 'play') { log(id + ': left play by itself after ' + ((Date.now() - t0) / 1000).toFixed(0) + 's, state ' + st); break; }
      const r = rnd(), x = Math.floor(vp.width * (.15 + .7 * rnd())), y = Math.floor(vp.height * (.2 + .6 * rnd()));
      try {
        if (r < .35) { mobile ? await page.touchscreen.tap(x, y) : await page.mouse.click(x, y); }
        else if (r < .5) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 60 * (rnd() - .5), y + 60 * (rnd() - .5), { steps: 3 }); await page.mouse.up(); }
        else if (r < .7) { await page.keyboard.down('Space'); await wait(150 + 500 * rnd()); await page.keyboard.up('Space'); }
        else if (r < .85) { const k = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD'][Math.floor(rnd() * 6)]; await page.keyboard.down(k); await wait(200 + 400 * rnd()); await page.keyboard.up(k); }
        else { await page.mouse.move(x, y, { steps: 4 }); }
      } catch (e) {}
      n++; await wait(250);
      if (Date.now() - t0 > (shots + 1) * secs * 1000 / 3 && shots < 2) { shots++; await shot((mobile ? 'm-' : '') + id + '-' + shots + 'play'); }
    }
    const st = await H((h, id) => h.ST[id].state, id);
    if (st === 'play') { await H((h, id) => { const s = h.ST[id]; s.abort(); s.setState('menu'); }, id); }
    else if (st === 'res') { await wait(1500); await shot((mobile ? 'm-' : '') + id + '-3res'); }
    log(id + ': ' + n + ' inputs, ended in ' + st);
  }
};

/* Earth's sky: the time of day, the weather and the street lamps.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/sky.cjs [--mobile]
   (add --query date=12-24, date=10-31 or date=07-15 for the seasons' extras: snow and fairy lights, pumpkins, fireflies) */
module.exports = async ({ shot, wait, H, log, mobile }) => {
  const P = mobile ? 'm-' : '', fail = m => { log('FAIL ' + m); process.exitCode = 1; };
  const set = o => H((h, o) => h.ST.cr._dbg.sky.set(o), o), st = () => H(h => h.ST.cr._dbg.sky.state), step = s => H((h, s) => h.ST.cr._dbg.sky.step(s), s);
  const D = '11-06';
  const steps = [['day', { date: D, time: '13:00', weather: 'clear' }], ['dusk', { time: '16:35' }], ['night', { time: '21:30' }], ['dawn', { time: '07:50' }]];
  for (const [n, o] of steps) { await set(o); await step(.5); await wait(1500); const s = await st(); log(n, JSON.stringify(s)); await shot(P + 'sky-' + n);
    if (n === 'day' && !(s.night === 0 && s.e > 15)) fail('day is not day');
    if (n === 'night' && !(s.night > .95)) fail('night is not night');
    if ((n === 'dusk' || n === 'dawn') && !(s.dusk > .3)) fail('no low warm light at ' + n); }
  /* at night, a lamp near you comes up full and the far ones stay dim */
  await set({ time: '21:30' });
  await H(h => { const d = h.ST.cr._dbg, l = d.sky.LAMPS[0]; d.player.x = l.x + 1.2; d.player.z = l.z + 1.2; d.player.u.copy(d.at(d.player.x, d.player.z)); });
  await step(3); await wait(1500); let s = await st(); log('lamps at night', JSON.stringify(s.lamps));
  if (!(s.lamps[0] > .9)) fail('the lamp beside you did not come on'); if (!(Math.min(...s.lamps) > .3 && Math.min(...s.lamps) < .6)) fail('far lamps are not dimly lit');
  await shot(P + 'sky-night-lamp');
  /* rain, then it stops and a rainbow follows with the sun behind you; fog rolls in */
  await set({ time: '13:30', weather: 'rain' }); await step(.3); await wait(1500); s = await st(); log('rain', JSON.stringify(s)); if (!(s.rain > .9 && s.fx.fall)) fail('no rain'); await shot(P + 'sky-rain');
  await set({ wxT: 400 }); await step(30); await wait(1500); s = await st(); log('after rain', JSON.stringify(s)); if (!(s.rain < .05 && s.bow > .5)) fail('the rain did not stop, or no rainbow'); await shot(P + 'sky-after-rain');
  await set({ time: '10:00', weather: 'fog' }); await step(45); await wait(1500); s = await st(); log('fog', JSON.stringify(s)); if (!(s.fog > .9)) fail('no fog'); await shot(P + 'sky-fog');
  await set({ time: '22:00' }); await step(.3); await wait(1500); await shot(P + 'sky-fog-night');
  await set({ time: '13:00', weather: 'clear' }); await step(.3); await wait(800); s = await st(); log('season', JSON.stringify(s));
  if (!process.exitCode) log('SKY OK');
};

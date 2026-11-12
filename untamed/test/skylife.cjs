/* Earth's sky and weather, alive: each of the ten things the sky alive brings, by the date, the time and the weather.
   1 the seasons you cannot miss (snow lying, bare trees, frost and breath in winter; petals, full window boxes and busier
   birds in spring; long golden evenings, the ice cream cart and bees in summer; leaf piles you kick up, steam and breath on a
   cold autumn morning); 2 thunderstorms (the flash, thunder as late as the storm is far, heavier rain); 3 sea fog rolling in
   from the water and out again, the foghorn answering; 4 northern lights on a rare clear winter night; 5 meteor showers on
   their dates and a rare shooting star on other nights; 6 the real sunrise and sunset where the visitor's time zone says they
   are; 7 the moon's real phase (a full moon's light and its path on the sea, a new moon's dark and its stars); 8 one wind that
   the flags, the smoke and the kite agree on; 9 the visitor's own weather from Open-Meteo (mocked here, each kind, a failure
   and a timeout; ?weather= still decides); 10 a rainbow after the rain. And no new shader is made as any of it comes in.
   node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/skylife.cjs --out <dir> [--mobile] [--meter]
   The station's clock is stepped by hand where only the logic matters, as in market.cjs; pictures are taken from real frames. */
const fs = require('fs'), path = require('path');
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  await H(h => {
    const st = h.ST.cr, d = st._dbg;
    window.__S = {
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } },
      /* (anyone near is taken as greeted and any conversation closed, so nobody starts talking over a picture) */
      put(x, z, fx, fz) { d.closeTalk(); d.people.forEach(q => { q.greeted = true; }); const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.tk = 0; d.cam.pitch = d.cam.PITCH; d.cam.dist = d.cam.D0(); P.tgt = null; P.path = null; P.speed = 0; },
      /* a day, an hour and the weather, the sky brought straight to where it would be then */
      at(date, time, weather, o) { d.life.set(Object.assign({ aurora: null, temp: null, meteors: null, wind: null }, o || {})); d.sky.set({ date, time, weather: weather || 'clear' }); d.sky.step(.2); d.life.SL.snowSnap = true; d.life.ICE.snap = true; d.market.MKT.snap = true; d.sky.step(.1); return Object.assign(d.life.state, { dusk: d.sky.state.dusk }); },
      look(dir) { const P = d.player, t = P.u.clone().multiplyScalar(24).add(dir); const f = t.addScaledVector(P.u, -P.u.dot(t)); f.normalize(); P.f.copy(f); d.cam.f.copy(f); },
      calls: {},
    };
    for (const n of ['thunder', 'foghorn', 'gust', 'song', 'rustle']) { const f = h.A[n]; h.A[n] = function () { (window.__S.calls[n] = window.__S.calls[n] || []).push([...arguments]); return f.apply(this, arguments); }; }
  });
  const S = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__S, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = n => H((h, n) => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const pic = async (name, ms = 500) => { await frames(3); await wait(ms); await shot(pre + name); };
  await H(h => { h.ST.cr._dbg.skipCut(); h.ST.cr._dbg.began(); }); await S(s => s.run(30));
  /* (the other worlds are made after the loader, a step at a quiet moment: they finish first, so what is counted below is Earth's alone) */
  await page.waitForFunction(() => window.__heloria.late().ready, null, { timeout: 900000, polling: 500 }).catch(() => {});
  await S((s, d) => { s.at('2026-07-18', '13:00'); s.put(0, -7.6, 0, 0); s.run(30); }); await pic('sky-baseline', 300);
  const prog0 = await H(h => h.renderer.info.programs.length);
  log('programs at the start', prog0);

  /* ---------- 6: the real sunrise and sunset, where the time zone says the visitor is ---------- */
  const zone = await S((s, d) => d.life.zone()); log('the browser\'s own zone here', JSON.stringify(zone));
  rec(zone.where && typeof zone.where.lat === 'number', 'the browser\'s time zone gives a place (a city, or Dublin)', JSON.stringify(zone));
  const suns = await S((s, d) => { const out = {}; for (const tz of ['Europe/London', 'Australia/Sydney', 'America/New_York']) { s.at('2026-11-13', '17:00', 'clear', { tz }); const st = d.life.state;
      s.at('2026-11-13', String(Math.floor(st.sun.set)).padStart(2, '0') + ':' + String(Math.floor(st.sun.set % 1 * 60)).padStart(2, '0'), 'clear', { tz }); const atSet = d.life.state.e;
      s.at('2026-11-13', String(Math.floor(st.sun.rise)).padStart(2, '0') + ':' + String(Math.floor(st.sun.rise % 1 * 60)).padStart(2, '0'), 'clear', { tz }); const atRise = d.life.state.e;
      out[tz] = { city: st.city, rise: st.sun.rise, set: st.sun.set, e17: st.e, night17: st.night, atSet, atRise }; }
    d.life.set({ tz: null }); return out; });
  log('sunrise and sunset, 13 November 2026', JSON.stringify(suns));
  const L_ = suns['Europe/London'], SY = suns['Australia/Sydney'], NY = suns['America/New_York'];
  rec(Math.abs(L_.set - 16.25) < .12 && Math.abs(SY.set - 19.57) < .12 && Math.abs(NY.set - 16.68) < .12, 'London, Sydney and New York each have their own sunset on the same date (16:15, 19:34, 16:41)', [L_.set, SY.set, NY.set].join(' '));
  rec(Math.abs(L_.rise - 7.22) < .12 && Math.abs(SY.rise - 5.77) < .12 && Math.abs(NY.rise - 6.67) < .12, 'and their own sunrise', [L_.rise, SY.rise, NY.rise].join(' '));
  rec([L_, SY, NY].every(q => Math.abs(q.atSet) < 1.2 && Math.abs(q.atRise) < 1.2), 'the town\'s sun is on the horizon at each one\'s sunrise and sunset', JSON.stringify([L_, SY, NY].map(q => [q.atRise, q.atSet])));
  rec(SY.night17 === 0 && SY.e17 > 10 && L_.e17 < 0 && NY.e17 < 2, 'at five in the afternoon it is broad day in Sydney, the sun down in London and setting in New York', JSON.stringify([L_.e17, SY.e17, NY.e17]));
  for (const tz of ['Europe/London', 'Australia/Sydney', 'America/New_York']) { await S((s, d, h, tz) => { s.at('2026-11-13', '17:00', 'clear', { tz }); s.put(0, -7.6, 0, 0); s.run(20); }, tz); await pic('sky-17h-' + tz.split('/')[1].toLowerCase()); }
  await S((s, d) => d.life.set({ tz: null }));

  /* ---------- 1: winter. Snow lying through the season, bare trees, frost on the windows, breath in the cold ---------- */
  const wd = await S((s, d) => { const st = s.at('2027-01-15', '11:00'); s.put(0, -7.4, 0, 0); s.run(10); d.life.world(5); return d.life.state; });
  log('winter day', JSON.stringify(wd));
  rec(wd.kind === 'clear' && wd.uSnow > .35 && wd.bare > .6, 'mid-January, a clear day: snow still lies, and the trees are bare', JSON.stringify({ snow: wd.uSnow, bare: wd.bare }));
  await pic('sky-winter-day');
  const snowing = await S((s, d) => { s.at('2027-01-15', '11:00', 'snow'); const a = d.life.state.uSnow; d.life.step(120); const b = d.life.state; s.at('2027-01-15', '11:00', 'clear', { temp: 10 }); const mild = d.life.state.uSnow; return { a, b: b.uSnow, flakes: b.flakes, mild }; });
  rec(snowing.flakes && snowing.b > snowing.a + .1 && snowing.mild < snowing.a, 'it lies thicker after a fall of snow, and patchier on a mild day', JSON.stringify(snowing));
  const wn = await S((s, d) => { s.at('2027-01-15', '22:00'); s.put(-1.5, -5.4, 1.3, -2.7); s.run(30); d.life.world(5); return d.life.state; });
  log('winter night', JSON.stringify(wn));
  rec(wn.frost > .95 && wn.cold > .5 && wn.breath > 0, 'a cold winter night: frost round the windows, and breath clouds from everyone near', JSON.stringify({ frost: wn.frost, cold: wn.cold, temp: wn.temp, breath: wn.breath }));
  await pic('sky-winter-night');
  await S((s, d) => { s.put(-9.4, -2.3, -13.3, -3.2); s.run(30); d.life.world(3); }); await pic('sky-winter-frost');
  const breathers = await S((s, d, h) => { const L = d.life, figs = L.PF.figs || []; s.put(-1.5, -5.4, 1.3, -2.7); s.run(30); d.life.world(4);
    return { figs: figs.length, live: L.PF.p.filter(q => q.t < q.life && q.c === 1).length }; });
  rec(breathers.figs >= 9 && breathers.live > 2, 'the player, the three, Diarmuid, Gideon and Owen and the townsfolk all breathe out', JSON.stringify(breathers));

  /* ---------- 1: spring. Blossom and its petals on the wind, the window boxes full, the birds busier ---------- */
  const sp = await S((s, d) => { s.at('2026-04-22', '10:00'); const src = d.life.DR.src.find(q => q.blos) || d.life.DR.src[0]; s.put(src.x - 3, src.z - 1.5, src.x, src.z); s.run(20); d.life.world(6); const st = d.life.state; return { st, birds: d.life.SL.seas.sp }; });
  log('spring', JSON.stringify(sp.st));
  rec(sp.st.season < -.5 && sp.st.bits > 3 && sp.st.bloom > .95, 'late April: blossom on the trees, petals drifting off them, the window boxes full of flowers', JSON.stringify({ season: sp.st.season, petals: sp.st.bits, bloom: sp.st.bloom }));
  const birds = await S((s, d) => { const k = []; for (const date of ['2026-04-22', '2026-07-18', '2026-11-03', '2027-01-15']) { s.at(date, '10:00'); k.push(+d.life.SL.seas.sp.toFixed(2)); } return k; });
  rec(birds[0] > .9 && birds.slice(1).every(v => v < .05), 'the birds are busier in spring (more birdsong and chirps)', JSON.stringify(birds));
  await S((s, d) => { s.at('2026-04-22', '10:00'); const src = d.life.DR.src.find(q => q.blos) || d.life.DR.src[0]; s.put(src.x - 3, src.z - 1.5, src.x, src.z); s.run(20); d.life.world(3); });
  await pic('sky-spring');

  /* ---------- 1: summer. Long golden evenings, the ice cream cart, bees ---------- */
  const su = await S((s, d, h) => { const ev = s.at('2026-07-18', '20:00'); const st = s.at('2026-07-18', '15:30'); s.put(-3.9, .9, -5.05, -1.85); s.run(30); d.life.world(8);
    const I = d.life.ICE, M = d.market.MKT, spots = [M.VAN, M.CART, M.TABLE, ...M.POLES], near = Math.min(...I.obs.flatMap(o => spots.map(p => Math.hypot(o.x - p[0], o.z - p[1]) - o.r))),
      paths = [[0, -6.4, 0, -1.6], [0, 1.6, 0, 8.3], [-7.7, 0, -1.6, 0], [1.6, 0, 8, 0]]; let pc = 99;
    for (const [x0, z0, x1, z1] of paths) for (let k = 0; k <= 40; k++) { const x = x0 + (x1 - x0) * k / 40, z = z0 + (z1 - z0) * k / 40; for (const o of I.obs) pc = Math.min(pc, Math.hypot(x - o.x, z - o.z) - o.r); }
    return { ev: { e: ev.e, dusk: ev.dusk }, st: d.life.state, near: +near.toFixed(2), pc: +pc.toFixed(2) }; });
  log('summer', JSON.stringify(su.st));
  rec(su.ev.e > 8 && su.ev.dusk > .5, 'a summer evening is long and golden: at eight the sun is still well up and the light already gold', JSON.stringify(su.ev));
  rec(su.st.ice.vis && su.st.ice.k > .95 && su.st.ice.solid, 'a sunny summer afternoon: the ice cream cart is out by the square', JSON.stringify(su.st.ice));
  rec(su.near > 1 && su.pc > .45, 'it stands clear of the Friday market\'s spots and of the paths across the square', JSON.stringify({ toMarket: su.near, toPaths: su.pc }));
  await pic('sky-summer-icecream');
  const bees = await S((s, d) => { s.put(1.2, -3.6, 0, 0); s.run(20); d.life.world(2); return d.life.state.bees; });
  rec(bees > 0, 'bees work the flowers round Kríos', String(bees));
  const iceOff = await S((s, d) => { const a = s.at('2026-07-18', '15:30', 'rain'); d.life.world(8); const b = d.life.state.ice; s.at('2026-07-18', '21:30'); d.life.world(8); const c = d.life.state.ice; s.at('2026-11-03', '15:30'); d.life.world(8); return { rain: b, night: c, nov: d.life.state.ice }; });
  rec(!iceOff.rain.vis && !iceOff.night.vis && !iceOff.nov.vis && !iceOff.rain.solid, 'not in the rain, not at night, not in November', JSON.stringify(iceOff));

  /* ---------- 1: autumn. Leaf piles you kick up, steam off the cups and breath on a cold morning ---------- */
  const au = await S((s, d) => { const st = s.at('2026-11-25', '07:40'); d.life.kickReset(); d.life.world(1); return d.life.state; });
  log('autumn morning', JSON.stringify(au));
  rec(au.piles.vis && au.piles.n >= 4 && au.piles.k > .5, 'late November: piles of leaves under the trees', JSON.stringify(au.piles));
  const kick = await S((s, d) => { const p = d.life.LP.piles[0], P = d.player; d.closeTalk(); d.people.forEach(q => { q.greeted = true; }); s.put(p.x - 1.6, p.z, p.x + 2, p.z); P.path = [[p.x + 1.8, p.z]]; let mx = 0, hi = 0;
    for (let i = 0; i < 60; i++) { s.run(1); const st = d.life.state.piles; mx = Math.max(mx, st.flying); hi = Math.max(hi, ...p.leaves.map(L => L.h)); }
    P.tgt = null; P.path = null; s.run(150); const st = d.life.state.piles, moved = p.leaves.filter(L => Math.hypot(L.x - L.rx, L.z - L.rz) > .15).length;
    return { flyingMax: mx, high: +hi.toFixed(2), after: st, moved, rustles: (window.__S.calls.rustle || []).length, walked: +Math.hypot(P.x - p.x + 1.6, P.z - p.z).toFixed(2), talk: !!d.talk().p }; });
  rec(kick.flyingMax >= 5 && kick.high > .25 && kick.after.flying === 0 && kick.moved >= 5, 'walking through a pile throws the leaves up, and they settle again where they land', JSON.stringify(kick));
  rec(kick.rustles > 0, 'with a rustle');
  /* (the picture: another pile, untouched, on a golden October morning) */
  await S((s, d) => { s.at('2026-10-25', '09:30'); d.life.kickReset(); const p = d.life.LP.piles[1] || d.life.LP.piles[0]; s.put(p.x - 2.6, p.z + .9, p.x, p.z); s.run(20); d.life.world(3); }); await pic('sky-autumn-pile');
  const steam = await S((s, d) => { s.at('2026-11-25', '07:40'); const r = d.regs.REGS[0]; s.put(r.x + .4, r.z + 2.6, r.x, r.z); s.run(20); d.life.world(5); const L = d.life;
    const cups = L.PF.p.filter(q => q.t < q.life && q.c === 1 && q.s1 < .15).length; return { cups, breath: L.state.breath, temp: L.state.temp }; });
  rec(steam.cups > 0 && steam.breath > 0, 'a cold autumn morning: steam off Gideon and Owen\'s coffee, and their breath', JSON.stringify(steam));
  await pic('sky-autumn-morning');

  /* ---------- 2: thunderstorms ---------- */
  const storm = await S((s, d, h) => { const a = s.at('2026-08-20', '15:00', 'thunder'); const c0 = d.life.SL.strikes; d.life.step(60); const n = d.life.SL.strikes - c0;
    const lit0 = d.LU.uLitA.value.clone(); d.life.SL.thunder.length = 0; d.life.strike(); const q = d.life.SL.thunder[0], q0 = { t: q.t, d: q.d }; d.life.SL.fl.k = .8; d.life.step(.05); const lit1 = d.LU.uLitA.value.clone(), fl = d.life.SL.flash; d.life.step(.5); const fl2 = d.life.SL.flash;
    return { st: d.life.state, n, delay: +q0.t.toFixed(2), km: +q0.d.toFixed(2), fl: +fl.toFixed(2), after: fl2, lit: [+(lit0.x + lit0.y + lit0.z).toFixed(2), +(lit1.x + lit1.y + lit1.z).toFixed(2)], hv: h.ST.cr._dbg.sky.FALL.material.uniforms.uHv.value }; });
  log('storm', JSON.stringify(storm));
  rec(storm.st.storm > .9 && storm.st.rain > .9 && storm.hv > .9, 'a thunderstorm: the rain is heavier', JSON.stringify({ storm: storm.st.storm, hv: storm.hv }));
  rec(storm.n >= 2, 'lightning strikes now and then (twice or more in a minute)', String(storm.n));
  rec(storm.fl > .3 && storm.after === 0 && storm.lit[1] > storm.lit[0] + .3, 'a flash lights the whole town for a moment, then is gone', JSON.stringify({ fl: storm.fl, after: storm.after, lit: storm.lit }));
  rec(Math.abs(storm.delay - storm.km / .343) < .05 && storm.delay > 1, 'its thunder comes as much later as the strike is far off', JSON.stringify({ km: storm.km, seconds: storm.delay }));
  const thunder = await S((s, d) => { window.__S.calls.thunder = []; d.life.SL.thunder.length = 0; d.life.strike(); const q = d.life.SL.thunder[0]; d.life.step(Math.ceil(q.t * 10 + 1) / 10); return { calls: window.__S.calls.thunder.length, km: q.d }; });
  rec(thunder.calls === 1, 'and is heard', JSON.stringify(thunder));
  await S((s, d) => { s.put(0, -7.6, 0, 0); s.run(20); }); await pic('sky-storm');
  await S((s, d) => { d.life.strike(); d.life.step(.03); s.run(1); }); await frames(1); await shot(pre + 'sky-storm-flash');

  /* ---------- 3: fog rolling in from the sea, the foghorn answering ---------- */
  const fog = await S((s, d) => { window.__S.calls.foghorn = []; s.at('2026-10-10', '10:30', 'fog'); s.put(-1, -6, 0, 0); const r = {}; const W = d.sky.WX;
    d.life.step(20); r.t20 = { here: d.life.state.fog, ph: d.life.state.fogPh, front: d.life.state.front }; d.life.step(26); r.t46 = { here: d.life.state.fog, ph: d.life.state.fogPh };
    r.horn = window.__S.calls.foghorn.length; r.hold = W.fogHold; W.t = W.fogHold + 30; d.life.step(.1); r.out = { here: d.life.state.fog, ph: d.life.state.fogPh, front: d.life.state.front }; W.t = W.fogHold + 50; d.life.step(.1); r.gone = { here: d.life.state.fog, ph: d.life.state.fogPh };
    return r; });
  log('fog', JSON.stringify(fog));
  rec(fog.t20.ph > .5 && fog.t20.here < .2, 'the fog comes in from the water: the lighthouse is in it while the square is still clear', JSON.stringify(fog.t20));
  rec(fog.t46.here > .9 && fog.t46.ph > .9, 'and within the minute it covers the town', JSON.stringify(fog.t46));
  rec(fog.horn >= 1, 'the lighthouse\'s foghorn answers it', String(fog.horn));
  rec(fog.out.here === 0 && fog.out.ph > .5 && fog.gone.here === 0 && fog.gone.ph === 0, 'after a while it rolls back out to sea the way it came (the town clears first, the lighthouse last)', JSON.stringify({ out: fog.out, gone: fog.gone }));
  await S((s, d) => { s.at('2026-10-10', '10:30', 'fog'); d.life.step(16.4); s.put(8, -1.5, 14, 4); s.run(20); }); await pic('sky-fog-rolling-in');
  await S((s, d) => { d.life.step(30); s.run(10); }); await pic('sky-fog-in');

  /* ---------- 4: northern lights, rare, on clear winter nights only ---------- */
  const aur = await S((s, d) => { const nights = []; for (let day = 1; day <= 59; day++) { const dt = new Date(Date.UTC(2027, 0, day)), ds = dt.toISOString().slice(0, 10); s.at(ds, '23:00'); d.life.step(25); nights.push([ds, d.life.state.aur]); }
    const on = nights.filter(n => n[1] > .3); const sumr = s.at('2026-07-18', '23:59'); d.life.step(25); const summer = d.life.state.aur;
    const ds = (on[0] || ['2027-01-15'])[0]; s.at(ds, '23:00', 'cloudy'); d.life.step(25); const cloudy = d.life.state.aur; s.at(ds, '13:00'); d.life.step(25); const day = d.life.state.aur;
    return { on: on.length, of: nights.length, first: on[0], summer, cloudy, day }; });
  log('northern lights', JSON.stringify(aur));
  rec(aur.on >= 1 && aur.on <= aur.of * .4, 'northern lights on some clear winter nights, not most', JSON.stringify({ on: aur.on, of: aur.of }));
  rec(aur.summer === 0 && aur.cloudy === 0 && aur.day === 0, 'never in summer, under cloud, or by day', JSON.stringify(aur));
  await S((s, d, h, ds) => { s.at(ds, '23:00', 'clear', { aurora: true }); d.life.step(25); s.put(-4.5, -12.5, -4.5 - 3.2, -12.5 - 3.9); d.cam.pitch = .14; s.run(25); d.cam.pitch = .14; }, (aur.first || ['2027-01-15'])[0]); await pic('sky-northern-lights');

  /* ---------- 5: meteor showers on their dates; on other clear nights, a rare single one ---------- */
  const met = await S((s, d) => { const n = date => { s.at(date, '23:30'); const a = d.life.SL.metN; d.life.step(300); return d.life.SL.metN - a; };
    const per = n('2026-08-12'), gem = n('2026-12-14'), ord = n('2026-06-20'), ord2 = n('2026-10-02'); s.at('2026-10-02', '23:30'); const a = d.life.SL.metN; d.life.step(1500); return { per, gem, ord, ord2, long: d.life.SL.metN - a, shower: d.life.state.shower }; });
  log('meteors', JSON.stringify(met));
  rec(met.per >= 25 && met.gem >= 25 && met.ord <= 6 && met.ord2 <= 6, 'the Perseids and the Geminids: many shooting stars in five minutes; other nights hardly any', JSON.stringify(met));
  rec(met.long >= 1 && met.long <= 20, 'on other clear nights, one now and then (every few minutes)', String(met.long));
  await S((s, d) => { s.at('2026-08-12', '23:30'); s.put(0, -7.6, 0, 0); s.run(20); d.life.meteor(); d.life.SL.met.forEach(q => { if (q.t < 1) q.t = .55; }); }); await frames(1); await shot(pre + 'sky-shooting-star');

  /* ---------- 7: the moon's real phase: full moon bright with a path on the sea; new moon dark with more stars ---------- */
  const moonS = await S((s, d, h) => { const out = {}; for (const [k, date] of [['full', '2026-08-27'], ['new', '2026-08-12']]) { const st = s.at(date, '23:30'); const sky = h.ST.cr.scene.children.find(o => o.material && o.material.uniforms && o.material.uniforms.uMoonK);
      out[k] = { k: st.moon.k, glit: +sky.material.uniforms.uGlit.value.x.toFixed(2), stars: +sky.material.uniforms.uMoonK.value.z.toFixed(2), lit: +(d.LU.uLitA.value.x + d.LU.uLitA.value.y + d.LU.uLitA.value.z).toFixed(3) }; } return out; });
  log('moon', JSON.stringify(moonS));
  rec(moonS.full.k > .99 && moonS.new.k < .01, 'the moon is full on 27 August 2026 and new on the 12th, as it really is', JSON.stringify([moonS.full.k, moonS.new.k]));
  rec(moonS.full.lit > moonS.new.lit * 1.25 && moonS.full.glit > .5 && moonS.new.glit === 0, 'a full moon lights the town more and lays a path on the sea', JSON.stringify(moonS));
  rec(moonS.new.stars > .9 && moonS.full.stars === 0, 'a new moon leaves it darker, with more stars', JSON.stringify(moonS));
  /* (the view for the pictures: from a little inland, looking out over the sea the way the moon is) */
  const coast = await S((s, d, h) => { s.at('2026-08-27', '23:30'); const m = h.ST.cr.scene.children.find(o => o.material && o.material.uniforms && o.material.uniforms.uMoonK).material.uniforms.uMoonD.value, L = Math.hypot(m.x, m.z) || 1, dx = m.x / L, dz = m.z / L;
      /* (along the moon's way or a little to either side, the first spot near the shore with nothing big ahead or behind) */
      const a0 = Math.atan2(dz, dx); let best = null;
      for (const da of [0, .15, -.15, .3, -.3, .45, -.45, .6, -.6]) { const ux = Math.cos(a0 + da), uz = Math.sin(a0 + da); let r = 4; while (r < 22 && d.life.walkable(ux * r, uz * r)) r += .25; r -= 3.2;
        const clear = (x, z) => !d.OBS.some(o => o.r > .35 && o.h > 1 && Math.hypot(x - o.x, z - o.z) < o.r + 1.2);
        let ok = true; for (let k = -5; k <= 8 && ok; k += .5) ok = clear(ux * (r + k), uz * (r + k)); if (ok) { best = [ux, uz, r]; break; } }
      return best || [dx, dz, 8]; });
  for (const [k, date] of [['full-moon', '2026-08-27'], ['new-moon', '2026-08-12']]) { await S((s, d, h, a) => { s.at(a[0], '23:30'); const [dx, dz, r] = a[1]; s.put(dx * r, dz * r, dx * (r + 6), dz * (r + 6)); s.run(25); }, [date, coast]); await pic('sky-' + k); }

  /* ---------- 8: one wind: the flags, the smoke and the kite agree; harder in a storm ---------- */
  const wind = await S((s, d, h) => { const L = d.life; s.at('2027-01-15', '09:30'); const calm = L.state.wind; s.at('2026-08-20', '15:00', 'thunder'); L.step(20); const storm = L.state.wind;
    s.at('2027-01-15', '09:30'); L.step(5); const W = L.WIND.v.clone(), at = p => p.clone().normalize(), tan = (v, p) => { const u = at(p); return v.clone().addScaledVector(u, -v.dot(u)).normalize(); };
    L.world(3); const flags = L.FLAGS.map(f => { const P = f.P, n = f.NX, mid = j => new THREE.Vector3(P[(j * (n + 1)) * 3], P[(j * (n + 1)) * 3 + 1], P[(j * (n + 1)) * 3 + 2]), tip = j => new THREE.Vector3(P[(j * (n + 1) + n) * 3], P[(j * (n + 1) + n) * 3 + 1], P[(j * (n + 1) + n) * 3 + 2]);
      const fly = tip(2).sub(mid(2)); return +tan(fly, f.top).dot(tan(W, f.top)).toFixed(3); });
    const ch = L.SLCHIM.slice().sort((a, b) => a.p.distanceTo(h.stCam.position) - b.p.distanceTo(h.stCam.position));
    s.put(-12, -1, -13.3, -3.2); s.run(10); L.world(6); const smoke = L.PF.p.filter(q => q.t < q.life && q.c < .5 && q.t > 1.5).map(q => { const c = L.SLCHIM.reduce((b, x) => x.p.distanceTo(q.p) < b.p.distanceTo(q.p) ? x : b, L.SLCHIM[0]); return +tan(q.p.clone().sub(c.p), c.p).dot(tan(W, c.p)).toFixed(3); });
    return { calm, storm, flags, smoke: smoke.slice(0, 8), smokeN: smoke.length }; });
  log('wind', JSON.stringify(wind));
  rec(wind.storm.s > .7 && wind.calm.s < .5, 'the wind is harder in a storm', JSON.stringify([wind.calm.s, wind.storm.s]));
  rec(wind.flags.length >= 3 && wind.flags.every(v => v > .85), 'every flag flies the way the wind blows', JSON.stringify(wind.flags));
  rec(wind.smokeN >= 3 && wind.smoke.filter(v => v > .6).length >= wind.smoke.length * .8, 'chimney smoke drifts off the way the wind blows', JSON.stringify(wind.smoke));
  await S((s, d) => { s.at('2027-01-15', '09:30'); const f = d.life.FLAGS[0]; s.put(f.x - 3.5, f.z - 2.5, f.x, f.z); s.run(25); d.life.world(4); }); await pic('sky-flag-and-smoke');
  const kite = await S((s, d) => { s.at('2026-09-05', '14:00'); d.closeTalk(); d.people.forEach(q => { q.greeted = true; }); const [kx, kz] = d.cliff.M.kiteA; s.put(kx - .6, kz - .3, kx, kz); s.run(5); d.cliff.goKite(); let i = 0; for (; i < 1800 && d.cliff.CL.k !== 'fly'; i++) s.run(1); s.run(200);
    const P = d.player, K = d.cliff.M.kite.position, u = P.u.clone(), v = K.clone().sub(u.clone().multiplyScalar(24 + P.h + 1)), W = d.life.WIND.v.clone(); v.addScaledVector(u, -v.dot(u)).normalize(); W.addScaledVector(u, -W.dot(u)).normalize();
    const r = { k: d.cliff.CL.k, frames: i, dot: +v.dot(W).toFixed(3), az: +d.cliff.CL.az.toFixed(2) }; return r; });
  rec(kite.k === 'fly' && kite.dot > .8, 'the kite flies downwind, the way the flags and the smoke go', JSON.stringify(kite));
  await pic('sky-kite-wind');
  await S((s, d) => { d.cliff.end(); s.run(120); });

  /* ---------- 10: a rainbow after the rain, the sun low enough and behind you ---------- */
  const bow = await S((s, d) => { const r = {}; s.at('2026-09-10', '17:00', 'rain'); d.sky.set({ wxT: 500 }); d.life.step(30); r.after = d.life.state; d.life.step(120); r.later = d.life.state.bow;
    s.at('2026-06-21', '13:30', 'rain'); d.sky.set({ wxT: 500 }); d.life.step(30); r.highSun = d.life.state.bow; return r; });
  log('rainbow', JSON.stringify(bow));
  rec(bow.after.rain < .05 && bow.after.bow > .5, 'when the rain stops on a September evening, a rainbow', JSON.stringify({ rain: bow.after.rain, bow: bow.after.bow, e: bow.after.e }));
  rec(bow.later === 0, 'for a minute or two, then it fades', String(bow.later));
  rec(bow.highSun === 0, 'none with the sun too high (midsummer noon)', String(bow.highSun));
  await S((s, d, h) => { s.at('2026-09-10', '17:00', 'rain'); d.sky.set({ wxT: 500 }); d.life.step(32); const sun = h.ST.cr._dbg.LU.uSun.value.clone(), P = d.player; s.put(0, -7.6, 0, 0); s.look(sun.clone().multiplyScalar(-1)); d.cam.pitch = .08; s.run(25); d.cam.pitch = .08; }); await pic('sky-rainbow');

  /* ---------- 9: the visitor's own weather, from Open-Meteo (mocked) ---------- */
  const asked = []; let reply = null, delay = 0;
  await page.route('https://api.open-meteo.com/**', async route => { try { asked.push(route.request().url()); if (delay) await new Promise(r => setTimeout(r, delay));
    /* (an answer that is not the weather at all stands for a service that is down: a refused request would also be reported by the browser) */
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof reply === 'string' ? reply : JSON.stringify({ current: reply }) }); } catch (e) {} });
  const cases = [[{ weather_code: 0, temperature_2m: 14, wind_speed_10m: 8, wind_direction_10m: 250, cloud_cover: 5, is_day: 1 }, 'clear'], [{ weather_code: 3, temperature_2m: 11, wind_speed_10m: 18, wind_direction_10m: 200, cloud_cover: 95, is_day: 1 }, 'cloudy'],
    [{ weather_code: 45, temperature_2m: 8, wind_speed_10m: 3, wind_direction_10m: 90, cloud_cover: 100, is_day: 1 }, 'fog'], [{ weather_code: 63, temperature_2m: 9, wind_speed_10m: 28, wind_direction_10m: 230, cloud_cover: 100, is_day: 1 }, 'rain'],
    [{ weather_code: 73, temperature_2m: -1, wind_speed_10m: 12, wind_direction_10m: 20, cloud_cover: 100, is_day: 1 }, 'snow'], [{ weather_code: 95, temperature_2m: 19, wind_speed_10m: 40, wind_direction_10m: 270, cloud_cover: 100, is_day: 1 }, 'thunder']];
  const got = [];
  for (const [c, want] of cases) { reply = c; const r = await S(async (s, d) => { s.at('2026-10-14', '13:00'); d.life.set({ weather: null }); const st = await d.life.fetch(3500); d.life.step(30); const L = d.life.state;
      return { st, kind: L.kind, rain: L.rain, flakes: L.flakes, fog: L.fog, over: L.over, temp: L.temp, wind: L.wind.s, data: L.wx.data }; });
    got.push([want, r.st, r.kind, r.temp, r.wind]); rec(r.st === 'ok' && r.kind === want && Math.abs(r.temp - c.temperature_2m) < .01 && Math.abs(r.wind - Math.max(Math.min(1, Math.max(.04, c.wind_speed_10m / 42)), want === 'thunder' ? .85 : 0)) < .16, 'Open-Meteo says ' + want + ': Earth takes it on, with its cold and its wind', JSON.stringify(r)); }
  rec(asked.length === cases.length && asked.every(u => /latitude=53\.35&longitude=-6\.26&current=weather_code,temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,is_day$/.test(u)), 'it asks once each time, for Dublin (where the tests are), the current weather only', asked[0]);
  const once = await S(async (s, d) => { const n0 = d.life.SL.wx.state; await d.life.again(); return d.life.SL.wx.state; }); await wait(300);
  rec(asked.length === cases.length, 'and only once a visit', String(asked.length));
  reply = 'not weather'; const failed_ = await S(async (s, d) => { s.at('2026-10-14', '13:00'); d.life.set({ weather: null }); const st = await d.life.fetch(3500); d.life.step(5); return { st, kind: d.life.state.kind }; });
  rec(failed_.st === 'failed' && failed_.kind === 'clear', 'when it cannot be reached, Earth\'s own weather goes on', JSON.stringify(failed_));
  reply = cases[3][0]; delay = 4000; const slow = await S(async (s, d) => { s.at('2026-10-14', '13:00'); d.life.set({ weather: null }); const t0 = performance.now(); const st = await d.life.fetch(1500); d.life.step(5); return { st, kind: d.life.state.kind, ms: Math.round(performance.now() - t0) }; });
  rec(slow.st === 'timeout' && slow.kind === 'clear' && slow.ms < 3000, 'when it is slow, it is given up on after the short wait, and Earth\'s own weather goes on', JSON.stringify(slow));
  delay = 0; reply = cases[3][0]; const keep = await S(async (s, d) => { s.at('2026-10-14', '13:00', 'fog'); const st = await d.life.fetch(3500); d.life.step(5); return { st, kind: d.life.state.kind, said: d.life.SL.wx.kind }; });
  rec(keep.st === 'ok' && keep.kind === 'fog' && keep.said === 'rain', '?weather= in the address still decides', JSON.stringify(keep));
  await page.unroute('https://api.open-meteo.com/**'); await S((s, d) => d.life.set({ real: null }));
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'build.py'), 'utf8').match(/connect-src[^;]*/)[0];
  rec(/https:\/\/api\.open-meteo\.com/.test(csp), 'the site\'s Content-Security-Policy lets it ask Open-Meteo', csp);
  await S((s, d) => d.life.set({ weather: null }));

  /* ---------- no new shader as any of it comes in ---------- */
  /* (counted from a plain summer day, once every other world is surely made: on a slow machine the wait at the start can run out first) */
  const ready = await page.waitForFunction(() => window.__heloria.late().ready, null, { timeout: 1800000, polling: 1000 }).then(() => true).catch(() => false);
  await S((s, d) => { s.at('2026-07-18', '13:00'); s.put(-2, -6, 0, 0); s.run(10); d.life.world(1); }); await frames(3);
  const progA = await H(h => h.renderer.info.programs.length); log('programs before the tour', progA, ready ? '(every world made)' : '(the other worlds still being made)');
  const looks = [['2026-07-18', '13:00', 'clear'], ['2027-01-15', '22:00', 'clear', { aurora: true }], ['2027-01-15', '11:00', 'snow'], ['2026-08-20', '15:00', 'thunder'], ['2026-10-10', '10:30', 'fog'], ['2026-04-22', '10:00', 'clear'], ['2026-07-18', '15:30', 'clear'], ['2026-11-25', '07:40', 'clear'], ['2026-08-27', '23:30', 'clear'], ['2026-08-12', '23:30', 'clear']];
  for (const [date, time, w, o] of looks) { await S((s, d, h, a) => { s.at(a[0], a[1], a[2], a[3]); d.life.step(20); s.put(-2, -6, 0, 0); s.run(10); d.life.world(3); if (a[2] === 'thunder') { d.life.strike(); d.life.step(.03); } d.life.meteor(); }, [date, time, w, o]); await frames(3); }
  const prog1 = await H(h => h.renderer.info.programs.length);
  /* (should another world still be in the making, one of its shaders could land in the count and fail this; none of ours can pass it) */
  rec(prog1 === progA, 'no new shader is made as the seasons, the weather and the lights in the sky come and go (all made ahead)', 'programs ' + progA + ' then ' + prog1 + ' (at the very start ' + prog0 + (ready ? '' : '; the other worlds were still being made') + ')');

  /* ---------- with --meter: how loud the new sounds are, against the weather's own ---------- */
  if (await page.evaluate(() => typeof window.__meter === 'function')) {
    /* (the town's own sounds held back meanwhile: the music, the birds and the crickets) */
    await page.mouse.click(vp.width * .5, vp.height * .2); await H(h => { h.A.start && h.A.start(); h.ST.cr._dbg.closeTalk(); const m = h.A.music.bind(h.A); m(0); h.A.music = () => {}; h.A.chirp = h.A.cricket = () => {}; });
    await S((s, d) => { s.at('2026-07-18', '13:00'); }); await wait(2500);
    const listen = async (fn, ms = 1800) => { await H(fn); let pk = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { pk = Math.max(pk, (await page.evaluate(() => window.__meter())).pk); await wait(30); } await wait(400); return +pk.toFixed(4); };
    const lv = {};
    for (const [n, f, ms] of [['foghorn', h => h.A.foghorn(.1), 2800], ['step(0)', h => h.A.step(0)], ['step(1)', h => h.A.step(1)], ['thunder near', h => h.A.thunder(.075 * 1.05, .5, 0), 4500], ['thunder far', h => h.A.thunder(.075 * .4, 3.6, 0), 5500], ['gust (hard)', h => h.A.gust(.034, 0), 3000], ['gust (light)', h => h.A.gust(.02, 0), 3000], ['song', h => h.A.song(0), 2200], ['rustle', h => h.A.rustle(.022, 0)]]) lv[n] = await listen(f, ms || 900);
    log('LEVELS (peak at the speakers) ' + JSON.stringify(lv));
    const step = Math.max(lv['step(0)'], lv['step(1)']);
    rec(['thunder near', 'thunder far', 'gust (hard)', 'gust (light)', 'song', 'rustle'].every(n => lv[n] > 0) && lv['thunder near'] <= lv.foghorn && lv['gust (hard)'] <= lv.foghorn * .5 && lv.song <= step * 1.6 && lv.rustle <= step * 1.6,
      'each new sound is heard: thunder no louder than the foghorn, a gust well under it, birdsong and leaves no louder than a footstep', JSON.stringify(lv));
  }
  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

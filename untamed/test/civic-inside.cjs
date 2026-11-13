/* Inside the town hall and the school on Earth.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/civic-inside.cjs --out <dir> [--mobile] [--meter]
   Both are rooms you go into. In (a click or a tap on the building from across the street walks you over; E by the door, or
   on a phone its tag) and out (Escape, the Leave button, a tap on the door), the camera in through the door and out again,
   and an Escape just after coming out stays on Earth. Inside: nothing of the street over the room and no postcard, a way out,
   the music quieter, the doors opening as you go. The hall: Séamus talks; a tap on the town's model brings up a building's
   card and Walk there takes you out and over to it; a note on the noticeboard comes up to read; the visitor book takes a name
   (cleaned, kept to forty characters, kept in the browser, there again next time, and still fine when the browser will not
   keep it); the plaques; the stair up to the clock room, where the works turn with the clock (minute and hour as the hands
   show them) and the hour strikes louder than in the street; back down. The school, in a lesson: the six children at their
   desks (none at break); Ms Kavanagh talks; chalk on the blackboard (a drag that draws and does not look round) and the
   duster wiping it; the xylophone's eight notes, low to high; the globe spun by a drag; the rocket up to the ceiling and
   down on its parachute; Nibbles stopping to look when you look at him; the bell rope ringing the bell on the roof. Going in,
   and everything done in there, compiles nothing new. With --meter each new sound is measured against a footstep.
   Pictures of each room and of each thing done, by day and by night. The station's clock is stepped by hand where timing is
   not the point, as in earth.cjs. */
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  /* a picture, given longer than the harness gives (a busy machine draws slowly), and never the end of the test if it fails */
  const path = require('path'), outDir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/heloria-shots';
  shot = async n => { try { await page.screenshot({ path: path.join(outDir, n + '.png'), timeout: 900000 }); console.log('shot', path.join(outDir, n + '.png')); } catch (e) { console.log('NOSHOT ' + n + ' ' + e.message.split('\n')[0]); } };
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '', cdp = mobile ? await page.context().newCDPSession(page) : null;
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  /* in the page: the station's debug handles, a log of the rooms' sounds, the music's last level */
  await H(h => { const d = h.ST.cr._dbg; window.__CI = { snd: [], music: null };
    for (const n of ['civDoor', 'floorStep', 'chalk', 'xylo', 'rocketWhoosh', 'chutePop', 'wheelSqueak', 'gearTick', 'townBell', 'schoolBell', 'step']) { const f = h.A[n]; h.A[n] = function () { window.__CI.snd.push({ n, a: [...arguments].map(v => typeof v === 'number' ? +v.toFixed(4) : v), t: +h.S.t.toFixed(2) }); return f.apply(this, arguments); }; }
    { const f = h.A.music; h.A.music = function (v) { window.__CI.music = v; return f.apply(this, arguments); }; } });
  const D = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(h.ST.cr._dbg, h.ST.cr._dbg.civic.inside, h, a), [fn.toString(), arg]);
  const st = () => D((d, I) => I.state);
  const sounds = n => D((d, I, h, n) => window.__CI.snd.filter(s => s.n === n), n);
  const clearSnd = () => H(() => { window.__CI.snd = []; });
  const tap = async (xy, label) => { if (!xy || xy[2] > 1 || xy[0] < 0 || xy[1] < 0 || xy[0] > vp.width || xy[1] > vp.height) { rec(false, 'on the screen: ' + label, JSON.stringify(xy)); return false; } if (mobile) await page.touchscreen.tap(xy[0], xy[1]); else await page.mouse.click(xy[0], xy[1]); return true; };
  /* a tap on a thing in a room, where it shows: its middle, or (when one of the class or the teacher stands in front of that)
     the nearest spot up or down it that a tap there finds it */
  const tapOn = async (what, label) => { const xy = await D((d, I, h, w) => I.screen(w), what); if (!xy) return tap(xy, label); let at = xy;
    for (const [dx, dy] of [[0, 0], [0, -30], [0, 30], [0, -60], [0, 60], [-16, 0], [16, 0], [0, -90], [0, 90]]) { const p = [xy[0] + dx, xy[1] + dy, xy[2]], f = await D((d, I, h, p) => I.pickIn(p[0], p[1]), p); if (f && f.id === what) { at = p; break; } }
    return tap(at, label); };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const drag = async pts => { const [x0, y0] = pts[0]; if (mobile) await touch('touchStart', x0, y0); else { await page.mouse.move(x0, y0); await page.mouse.down(); }
    for (const [x, y] of pts.slice(1)) { if (mobile) await touch('touchMove', x, y); else await page.mouse.move(x, y); }
    if (mobile) await touch('touchEnd'); else await page.mouse.up(); };
  const line = (a, b, n = 10) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  const press = async sel => { try { if (mobile) await page.tap(sel, { timeout: 30000 }); else await page.click(sel, { timeout: 30000 }); return true; } catch (e) { rec(false, 'press ' + sel, e.message.split('\n')[0]); return false; } };
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }, sel);
  const programs = async () => { await frames(4); return H(h => h.renderer.info.programs.length); };
  const until = (src, max) => D((d, I, h, [src, max]) => { const f = (0, eval)('(' + src + ')'); let i = 0; for (; i < max && !f(I.state, d, I); i++) I.run(1 / 30, 30); return { frames: i, done: !!f(I.state, d, I), st: I.state.st }; }, [src.toString(), max]);
  const time = (t, day = 3) => D((d, I, h, [t, day]) => { d.civic.day(day); d.sky.set({ time: t }); d.sky.step(.5); I.run(.2); }, [t, day]);
  /* you, at a spot in a building's frame (the hall's, or the school's own: see schoolHouse), facing another */
  const put = (which, x, z, fx, fz) => D((d, I, h, [which, x, z, fx, fz]) => { const B = I.HSI[which], loc = (lx, lz) => { const v = new h.T.Vector3(lx, 0, lz).applyMatrix4(B.M).normalize(); return d.loc(v); };
    const [px, pz] = loc(x, z), [qx, qz] = loc(fx, fz), P = d.player; P.x = px; P.z = pz; P.u.copy(d.at(px, pz)); const t = d.at(qx, qz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = d.cam.PITCH; d.cam.zoom = 1; P.tgt = null; P.path = null; P.speed = 0; I.run(1.2); }, [which, x, z, fx, fz]);
  const look = (y, p) => D((d, I, h, [y, p]) => { I.look(y, p); I.run(.1); }, [y, p]);
  await H(h => { if (!h.T) h.T = window.THREE; });
  await H(h => { h.A.start && h.A.start(); });
  await H(h => h.ST.cr._dbg.skipCut()); await D((d, I) => { d.began(); I.run(1); });
  await time('10:00');

  /* ---------- before: built, both rooms hidden, nothing of theirs drawn ---------- */
  const b0 = await D((d, I) => ({ err: I.err, civ: d.civic.err, ok: I.HSI.ok, s: I.state }));
  rec(b0.ok && !b0.err && !b0.civ, 'the town hall and the school are built with their rooms inside', JSON.stringify({ err: b0.err, civ: b0.civ }));
  rec(!b0.s.hall.vis && !b0.s.school.vis && !b0.s.hall.clock && !b0.s.warm && b0.s.st === 'out', 'outside, neither room is drawn', JSON.stringify(b0.s));

  /* ---------- the hall: from across the street a click (a tap) on it walks you over, and in ---------- */
  /* (a spot across the street where the click is the hall's alone: one of us standing right by the camera is picked from
     anywhere on the screen, so where someone is, step along a little) */
  let front = null, clear = null;
  for (const [x, z] of [[.3, 7.5], [.3, 5.8], [-2.2, 6.4], [2.4, 6.4], [.3, 5.0]]) { await put('hall', x, z, 0, 0); await frames(4);
    front = await D((d, I) => I.screen('front', 'hall')); clear = await D((d, I, h, xy) => I.picksAt(xy[0], xy[1]), front);
    if (clear.front === 'hall' && !clear.person && !clear.busk && !clear.reg && !clear.cliff && clear.civ < 0 && !clear.gar && !clear.cafe && !clear.busy) break; }
  log('across the street', JSON.stringify(clear)); await shot(pre + 'hall-1-outside');
  const p0 = await programs();
  await clearSnd();
  await tap(front, 'the hall from across the street');
  let s = await st(); rec(s.st === 'go' || s.st === 'enter', (mobile ? 'a tap' : 'a click') + ' on the hall from across the street sets you walking over', JSON.stringify({ st: s.st }));
  let r = await until(s => s.st === 'enter', 30 * 25); rec(r.done, 'you get to its door and go in', JSON.stringify(r));
  await D((d, I) => I.run(1.3)); await frames(3); await shot(pre + 'hall-2-going-in');
  s = await st(); rec(s.hall.door > .5 && s.hall.vis, 'the doors open as you go in, and the room is there', JSON.stringify(s.hall));
  r = await until(s => s.st === 'in', 30 * 5); if (!r.done) await D((d, I) => { d.closeTalk(); d.talk().goal = null; I.reset(); I.enter('hall'); I.run(3.5); });   // (to go on with the rest)
  await D((d, I) => I.run(1.5)); s = await st();
  rec(r.done && s.on && !s.me && s.near === .02 && s.hall.door < .2, 'you are in, in your own eyes, a nearer lens; the doors shut behind you', JSON.stringify({ st: s.st, me: s.me, near: s.near, door: s.hall.door }));
  const doors = await sounds('civDoor'); rec(doors.length >= 2 && doors[0].a[0] === true && doors[doors.length - 1].a[0] === false, 'the door is heard opening and shutting', JSON.stringify(doors.map(x => x.a)));
  const steps = await sounds('floorStep'); rec(steps.length >= 1, 'and your steps on the boards', String(steps.length));
  const quiet = await page.evaluate(() => { const vis = e => { if (!e) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
    return { cls: document.querySelector('.st-cr').classList.contains('inciv'), labels: vis(document.querySelector('#crLabels')), card: vis(document.querySelector('#crProj')), hint: vis(document.querySelector('#crHint')) && !document.querySelector('#crHint').classList.contains('gone'), go: vis(document.querySelector('#crGo')), post: vis(document.querySelector('#crPost')), leave: vis(document.querySelector('#crCivLeave')) }; });
  rec(quiet.cls && !quiet.labels && !quiet.card && !quiet.hint && !quiet.go, 'nothing of the street is drawn over the room', JSON.stringify(quiet));
  rec(quiet.leave && !quiet.post, 'there is a way out, and no postcard button', JSON.stringify(quiet));
  const calm = await H(h => h.ST.cr.calm()); rec(calm === false, 'while you are inside, other work waits (the station is not calm)', String(calm));
  const mus = await H(() => window.__CI.music); rec(mus > .2 && mus < .4, 'the town\'s music is a little quieter in here', String(mus));
  const p1 = await programs(); rec(p1 === p0, 'going in compiles no new shader', p0 + ' then ' + p1);
  await shot(pre + 'hall-3-inside');
  for (const [n, y, p] of [['model', .85, -.55], ['desk', -1.3, -.02], ['stair', -.62, .12], ['notes', 1.35, .02], ['door', 3.14, .1]]) { await look(y, p); await frames(3); await shot(pre + 'hall-4-' + n); }

  /* ---------- Séamus ---------- */
  await look(-1.3, -.02); await frames(3);
  await tap(await D((d, I) => I.screen('clerk')), 'Séamus');
  const talk = await D(d => { const t = d.talk(); return t.p ? { who: t.p.first, lines: t.L.slice() } : null; });
  rec(!!talk && talk.who === 'Séamus', (mobile ? 'a tap' : 'a click') + ' on the clerk and he talks', JSON.stringify(talk));
  if (talk) log('  Séamus: ' + talk.lines.join(' | '));
  await D((d, I) => I.run(2)); await frames(3); await shot(pre + 'hall-5-seamus');
  await D((d, I) => { for (let i = 0; i < 12 && d.talk().p; i++) d.nextTalk(); I.run(.3); });
  rec(!(await D(d => !!d.talk().p)), 'and when he is done the box goes');

  /* ---------- the town's model: a building's card, and Walk there ---------- */
  await look(.85, -.55); await frames(3);
  await tap(await D((d, I) => I.screen('model', 'og')), 'Ogive on the model'); await D((d, I) => I.run(.2));
  let card = await page.evaluate(() => { const e = document.querySelector('#crCivCard'); return { on: e.classList.contains('on'), n: e.querySelector('.crpj-n').textContent, walk: !e.querySelector('#crCivWalk').hidden, link: e.querySelector('#crCivLink').getAttribute('href') }; });
  rec(card.on && card.n === 'Ogive' && card.walk && /ogive/i.test(card.link), 'a tap on Ogive on the model brings up its card, with Walk there', JSON.stringify(card));
  await frames(2); await shot(pre + 'hall-6-model-card');
  await tap(await D((d, I) => I.screen('model', 'kr')), 'Kríos on the model'); card = await page.evaluate(() => document.querySelector('#crCivCard .crpj-n').textContent);
  rec(card === 'Kríos', 'and on Kríos, Kríos\'s', card);
  await tap(await D((d, I) => I.screen('model', 'hall')), 'the hall on the model'); card = await page.evaluate(() => ({ n: document.querySelector('#crCivCard .crpj-n').textContent, walk: !document.querySelector('#crCivWalk').hidden }));
  rec(card.n === 'Town hall' && !card.walk, 'and on the hall itself: you are here, and nowhere to walk', JSON.stringify(card));
  if (!mobile) { await page.keyboard.press('Escape'); s = await st(); rec(!s.panel && s.st === 'in', 'Escape puts the card away (and you are still in)', JSON.stringify({ panel: s.panel, st: s.st })); }
  else { await press('.crmdl-x'); s = await st(); rec(!s.panel && s.st === 'in', 'its close button puts the card away (and you are still in)', JSON.stringify({ panel: s.panel, st: s.st })); }
  await D((d, I) => I.act('model', 'ph')); await look(.6, .75); await frames(3); await tap([vp.width * .5, vp.height * .5], 'the ceiling'); s = await st();
  rec(!s.panel && s.st === 'in', (mobile ? 'a tap' : 'a click') + ' elsewhere in the room puts a card away too', JSON.stringify({ panel: s.panel }));

  /* ---------- the noticeboard ---------- */
  await look(1.35, .02); await frames(3);
  await tap(await D((d, I) => I.screen('note', 0)), 'the market note'); let note = await page.evaluate(() => { const e = document.querySelector('#crCivNote'); return { on: e.classList.contains('on'), h: e.querySelector('.crnote-h').textContent, t: e.querySelector('.crnote-t').textContent }; });
  rec(note.on && /market/i.test(note.h) && /Fridays, 18:00 to 02:00/.test(note.t), 'a note on the noticeboard comes up to read: the market, Fridays 18:00 to 02:00', JSON.stringify(note));
  await frames(2); await shot(pre + 'hall-7-note');
  await press('#crCivNote button'); for (const i of [1, 2]) { await tap(await D((d, I, h, i) => I.screen('note', i), i), 'note ' + i); note = await page.evaluate(() => document.querySelector('#crCivNote .crnote-t').textContent); await press('#crCivNote button');
    rec(i === 1 ? /workshop/i.test(note) : /08:50 to 15:00/.test(note), i === 1 ? 'the test fires at the workshop' : 'the school\'s hours', note); }

  /* ---------- the visitor book: signed, kept, there again; and when the browser will not keep it ---------- */
  await look(-1.6, -.3); await frames(3); await H(() => { try { localStorage.removeItem('heloria.visitor-book'); } catch (e) {} }); await D((d, I) => I.bookForget());
  await tap(await D((d, I) => I.screen('book')), 'the visitor book');
  /* (it fades in, and a busy machine may draw only a frame every few seconds, so wait for it to be drawn) */
  await page.waitForFunction(() => { const e = document.querySelector('#crCivBook'); return e && e.classList.contains('on') && +getComputedStyle(e).opacity > .5; }, null, { timeout: 120000, polling: 250 }).catch(() => {});
  const bo = { panel: (await st()).panel, book: await visible('#crCivBook'), name: await visible('#crCivName') };
  rec(bo.panel === 'book' && bo.book && bo.name, 'a tap on the visitor book opens it to sign', JSON.stringify(bo));
  await page.fill('#crCivName', '  Ada <b>Love\u0007lace</b> from the far side of the moon, waving  '); await press('#crCivSign');
  const kept = await H(() => { try { return JSON.parse(localStorage.getItem('heloria.visitor-book')); } catch (e) { return 'err ' + e; } });
  rec(!!kept && typeof kept.n === 'string' && !/[<>\u0000-\u001f]/.test(kept.n) && [...kept.n].length <= 40 && /^Ada bLovelace/.test(kept.n), 'what you sign is cleaned, kept to forty characters, and kept in this browser', JSON.stringify(kept));
  await frames(2); await shot(pre + 'hall-8-book');
  await press('.crvbk-x'); await D((d, I) => { I.bookForget(); I.bookLoad(); });
  await tap(await D((d, I) => I.screen('book')), 'the visitor book again'); await wait(200);
  let bk = await D((d, I) => I.book); rec(/^Welcome back, Ada/.test(bk.shown) && bk.list[bk.list.length - 1] === kept.n, 'coming back, the book says welcome back, with your name in it', JSON.stringify(bk));
  await press('.crvbk-x');
  /* a browser that will not keep anything (private, or blocked) */
  await H(() => { const P = Storage.prototype; window.__ls = [P.getItem, P.setItem]; P.getItem = function () { throw new Error('no storage'); }; P.setItem = function () { throw new Error('no storage'); }; });
  await D((d, I) => I.bookForget()); await tap(await D((d, I) => I.screen('book')), 'the book, without storage'); await wait(200);
  await page.fill('#crCivName', 'Kim'); await press('#crCivSign'); bk = await D((d, I) => I.book);
  rec(bk.mine && bk.mine.n === 'Kim' && bk.ok === false && /Kim/.test(bk.shown), 'without storage the book still takes your name (for this visit)', JSON.stringify(bk));
  await press('.crvbk-x'); await tap(await D((d, I) => I.screen('book')), 'the book, again'); await wait(200); bk = await D((d, I) => I.book);
  rec(/Welcome back, Kim/.test(bk.shown), 'and shows it again', bk.shown); await press('.crvbk-x');
  await H(() => { const P = Storage.prototype; [P.getItem, P.setItem] = window.__ls; });

  /* ---------- the plaques, inside by the counter ---------- */
  await look(-1.26, .42); await frames(3);
  await tap(await D((d, I) => I.screen('plaque', 0)), 'the top plaque inside');
  const pq = await page.evaluate(() => { const c = document.querySelector('.crplq'); return { on: c.classList.contains('on'), n: c.querySelector('.crpj-n').textContent }; });
  rec(pq.on && pq.n === 'Andrena Ventures', 'the partners\' plaques hang inside too, and bring up their cards', JSON.stringify(pq));
  await frames(2); await shot(pre + 'hall-9-plaques'); if (!mobile) await page.keyboard.press('Escape'); else await press('.crplq');
  rec(!(await page.evaluate(() => document.querySelector('.crplq').classList.contains('on'))), mobile ? 'a tap on the card puts it away' : 'Escape puts it away');

  /* ---------- up the stair to the clock room ---------- */
  await time('15:40');
  await look(-.62, .12); await frames(3); await clearSnd();
  await tap(await D((d, I) => I.screen('stair')), 'the stair');
  s = await st(); rec(s.st === 'up', (mobile ? 'a tap' : 'a click') + ' on the stair climbs it', s.st);
  await D((d, I) => I.run(1.4)); await frames(2); await shot(pre + 'clock-1-climbing');
  r = await until(s => s.st === 'clock', 30 * 4); await D((d, I) => I.run(.4)); s = await st();
  rec(r.done && s.hall.clock && !s.hall.vis && s.downB && !s.leave, 'you come up into the clock room (the hall below put away), with a way back down', JSON.stringify({ st: s.st, clock: s.hall.clock, downB: s.downB }));
  const dd = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
  for (const t of ['15:40', '09:15', '21:30']) { await time(t); const g = await D((d, I) => ({ g: I.gears(), h: d.civic.hands() }));
    rec(dd(g.g.m, g.h.m) < 1 && dd(g.g.h, g.h.h) < 1 && dd(g.g.rod, g.h.m) < 1, 'at ' + t + ' the works turn with the clock: the centre wheel as the minute hand, the great wheel as the hour hand', JSON.stringify(g)); }
  await time('15:40'); await D((d, I) => I.run(2)); const tk = await sounds('gearTick'); rec(tk.length >= 1, 'the works tick', String(tk.length));
  await frames(3); await shot(pre + 'clock-2-works'); await look(.79, 1.0); await frames(3); await shot(pre + 'clock-3-bell');
  /* the hour, struck close by: louder than anywhere in the street */
  await clearSnd(); const ch = await D((d, I) => { d.sky.set({ time: '15:59' }); I.run(.5); d.sky.set({ time: '16:00' }); I.run(10); return { chimes: I.state.chimes, G: d.civic.CGAIN }; });
  const tb = await sounds('townBell');
  rec(tb.length === 4 && tb.every(b => b.a[0] >= ch.G.clock * 1.3 - 1e-4 && b.a[1] === 0), 'in the clock room the hour (four) is struck louder than in the street, and from right overhead', JSON.stringify({ played: tb.map(b => b.a), street: ch.G.clock }));
  await time('21:30'); await D((d, I) => I.run(.3)); await look(.79, .25); await frames(3); await shot(pre + 'clock-4-night'); await time('15:40');
  if (!mobile) await page.keyboard.press('Escape'); else await press('#crCivDown');
  s = await st(); rec(s.st === 'down', mobile ? 'Back down takes you down the stair' : 'Escape takes you back down the stair', s.st);
  r = await until(s => s.st === 'in', 30 * 4); s = await st(); rec(r.done && s.hall.vis && !s.hall.clock && s.leave, 'and you are back in the hall', JSON.stringify({ st: s.st, vis: s.hall.vis }));

  /* ---------- out, and an Escape just after stays on Earth ---------- */
  if (!mobile) { await page.keyboard.press('Escape'); s = await st(); rec(s.st === 'exit', 'Escape takes you out', s.st); }
  else { await press('#crCivLeave'); s = await st(); rec(s.st === 'exit', 'the Leave button takes you out', s.st); }
  await D((d, I) => I.run(.8)); await frames(2); await shot(pre + 'hall-10-leaving');
  r = await until(s => s.st === 'out', 30 * 4); await D((d, I) => I.run(.5)); s = await st();
  rec(r.done && !s.on && s.me && !s.hall.vis && s.near === .1, 'and you are back on the step, the room put away', JSON.stringify({ st: s.st, me: s.me, vis: s.hall.vis, near: s.near }));
  if (!mobile) { await page.keyboard.press('Escape'); await wait(200); const e2 = await H(h => ({ st: h.S.st === h.ST.cr, mode: h.S.mode })); rec(e2.st && e2.mode === 'station', 'an Escape just after coming out stays on Earth', JSON.stringify(e2)); }
  const pq2 = await visible('#crPost'); rec(pq2, 'outside again, the postcard button is back');

  /* ---------- in again (E by the door; on a phone its tag), and Walk there from the model ---------- */
  await put('hall', .05, 2.6, 0, 0); await frames(4);
  const tag = await D((d, I) => I.state.tag); rec(tag.on && tag.can && tag.txt === 'Go in' && tag.b === 'hall', 'by the door its tag says Go in, and how', JSON.stringify(tag));
  if (mobile) { const xy = await page.evaluate(() => { const e = [...document.querySelectorAll('#crLabels .crwt')].find(e => e.textContent === 'Go in' && e.classList.contains('on')); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, 0]; }); await tap(xy, 'the Go in tag'); }
  else await page.keyboard.press('KeyE');
  s = await st(); rec(s.st === 'enter', mobile ? 'tapping the tag takes you in' : 'E by the door takes you in', s.st);
  await until(s => s.st === 'in', 30 * 5);
  await D((d, I) => I.act('model', 'og')); await press('#crCivWalk');
  s = await st(); rec(s.st === 'exit', 'Walk there takes you out first', s.st);
  r = await until(s => s.st === 'out', 30 * 4);
  const walk = await D((d, I) => { let i = 0; for (; i < 30 * 60 && d.player.path; i++) I.run(1 / 30, 30); const P = d.player, w = I.state.walk; return { frames: i, w, d: +Math.hypot(P.x - w.x, P.z - w.z).toFixed(2), og: +Math.hypot(P.x - d.INST.og.x, P.z - d.INST.og.z).toFixed(2) }; });
  rec(walk.w && walk.w.id === 'og' && walk.w.path && walk.d <= walk.w.r + .7, 'and over to Ogive, round whatever is in the way', JSON.stringify(walk));
  await frames(4); await shot(pre + 'hall-11-walked-to-ogive');

  /* ---------- the school, in a lesson ---------- */
  await time('10:00'); await D(d => { d.civic.place(); });
  for (const [x, z] of [[0, 6.0], [-1, 5.8], [1, 5.8], [0, 5.0]]) { await put('school', x, z, 0, 0); await frames(4);
    front = await D((d, I) => I.screen('front', 'school')); clear = await D((d, I, h, xy) => I.picksAt(xy[0], xy[1]), front);
    if (clear.front === 'school' && !clear.person && !clear.busk && !clear.reg && !clear.cliff && clear.civ < 0 && !clear.gar && !clear.cafe && !clear.busy) break; }
  log('the street by the school', JSON.stringify(clear)); await shot(pre + 'school-1-outside');
  await clearSnd(); await tap(front, 'the school from the street');
  s = await st(); rec(s.st === 'go' || s.st === 'enter', (mobile ? 'a tap' : 'a click') + ' on the school from the street sets you walking over', s.st);
  r = await until(s => s.st === 'in', 30 * 30); if (!r.done) await D((d, I) => { d.closeTalk(); d.talk().goal = null; I.reset(); I.enter('school'); I.run(3.5); });   // (to go on with the rest)
  await D((d, I) => I.run(1.2)); s = await st();
  rec(r.done && s.b === 'school' && s.school.vis && !s.me, 'and in at its door', JSON.stringify({ st: s.st, b: s.b }));
  const sd = await sounds('civDoor'); rec(sd.length >= 2 && sd[0].a[1] === false, 'its door heard (the school\'s, lighter than the hall\'s)', JSON.stringify(sd.map(x => x.a)));
  const kids = await D((d, I) => I.kids()); rec(kids.filter(k => k.vis).length === 6 && kids.every(k => k.chair > .24), 'in a lesson the six children are at their desks, their chairs pulled out', JSON.stringify(kids));
  rec(await programs() === p0, 'nothing new compiled for the classroom either', String(await H(h => h.renderer.info.programs.length)));
  await shot(pre + 'school-2-lesson');
  for (const [n, y, p] of [['left', 1.3, -.25], ['right', -1.3, -.2], ['door', 3.14, -.3]]) { await look(y, p); await frames(3); await shot(pre + 'school-3-' + n); }
  /* Ms Kavanagh */
  await look(.62, -.1); await frames(3);
  await tap(await D((d, I) => I.screen('teacher')), 'Ms Kavanagh');
  const tt = await D(d => { const t = d.talk(); return t.p ? { who: t.p.first, lines: t.L.slice() } : null; });
  rec(!!tt && tt.who === 'Ms Kavanagh', (mobile ? 'a tap' : 'a click') + ' on the teacher and she talks', JSON.stringify(tt)); if (tt) log('  Ms Kavanagh: ' + tt.lines.join(' | '));
  await D((d, I) => I.run(1.5)); await frames(3); await shot(pre + 'school-4-teacher');
  await D((d, I) => { for (let i = 0; i < 12 && d.talk().p; i++) d.nextTalk(); I.run(.3); });
  /* the blackboard: a drag across it draws, and does not look round; the duster wipes it */
  await look(0, -.02); await frames(3); await clearSnd();
  const c0 = await D((d, I) => I.chalk()), y0 = (await st()).yaw;
  const a = await D((d, I) => I.screen('board', .2, .5)), b = await D((d, I) => I.screen('board', .75, .35)), c = await D((d, I) => I.screen('board', .55, .7));
  await drag([...line(a, b, 12), ...line(b, c, 8)]); await D((d, I) => I.run(.1));
  const c1 = await D((d, I) => I.chalk()), y1 = (await st()).yaw, chs = await sounds('chalk');
  rec(c1 > c0 + 300 && Math.abs(y1 - y0) < 1e-3, 'a drag across the blackboard draws in chalk, and does not turn the view', JSON.stringify({ c0, c1, y0, y1 }));
  rec(chs.length >= 2, 'the chalk is heard', String(chs.length));
  await frames(3); await shot(pre + 'school-5-board');
  await tap(await D((d, I) => I.screen('duster')), 'the duster'); await D((d, I) => I.run(.6)); await frames(2); await shot(pre + 'school-6-wiping'); await D((d, I) => I.run(1.4));
  const c2 = await D((d, I) => I.chalk()); rec(c2 < 30, 'the duster wipes the board clean', JSON.stringify({ c1, c2 }));
  /* the xylophone: low to high */
  await look(1.05, -.41); await frames(3); await clearSnd();
  for (let i = 0; i < 8; i++){ await tap(await D((d, I, h, i) => I.screen('xylo', i), i), 'bar ' + i); await D((d, I) => I.run(.05)); }
  const xs = await sounds('xylo'); rec(xs.length === 8 && xs.every((x, i) => x.a[0] === i), 'the xylophone plays its eight notes, low to high', JSON.stringify(xs.map(x => x.a[0])));
  await frames(2); await shot(pre + 'school-7-xylophone');
  /* the globe: a drag spins it, and does not turn the view */
  await look(.8, -.2); await frames(3); const g0 = (await st()).globe, yy0 = (await st()).yaw, gp = await D((d, I) => I.screen('globe'));
  await drag(line([gp[0] - 30, gp[1]], [gp[0] + 60, gp[1]], 8)); await D((d, I) => I.run(.5)); const g1 = (await st()).globe, yy1 = (await st()).yaw;
  rec(Math.abs(g1.v) > 1.5 && Math.abs(g1.a - g0.a) > .2 && Math.abs(yy1 - yy0) < 1e-3, 'a drag on the globe spins it, and does not turn the view', JSON.stringify({ g0, g1, yy0, yy1 }));
  await frames(2); await shot(pre + 'school-8-globe');
  /* the rocket: up to the ceiling, and down on its parachute */
  await look(-.95, -.22); await frames(3); await clearSnd();
  await tap(await D((d, I) => I.screen('rocket')), 'the rocket'); s = await st(); rec(s.rocket.st === 'up' && (await sounds('rocketWhoosh')).length === 1, 'a tap on the model rocket launches it, with a whoosh', JSON.stringify(s.rocket));
  await D((d, I) => I.run(.45)); await frames(2); await shot(pre + 'school-9-rocket-up');
  await D((d, I) => I.run(.4)); s = await st(); const top = s.rocket.y; rec(s.rocket.st === 'chute' && top > 1.1 && (await sounds('chutePop')).length === 1, 'it goes up to the ceiling and its parachute opens', JSON.stringify(s.rocket));
  await D((d, I) => I.run(2)); await look(-.95, .3); await frames(3); await shot(pre + 'school-10-parachute');
  r = await until(s => s.rocket.st === 'landed', 30 * 9); s = await st(); rec(r.done && s.rocket.y === 0, 'and floats down to land on the table', JSON.stringify(s.rocket));
  /* Nibbles: look at him and he stops and looks back; look away and he goes back to his wheel */
  await look(-1.6, -.36); await clearSnd(); const w0 = (await st()).ham; await D((d, I) => I.run(2)); let hm = await D((d, I) => I.ham());
  rec(hm.st === 'look' && hm.head < -.2, 'look at Nibbles and he stops, comes to the front of his cage and looks up at you', JSON.stringify({ w0, hm }));
  await frames(3); await shot(pre + 'school-11-hamster');
  await look(0, -.1); await D((d, I) => I.run(4)); hm = await D((d, I) => I.ham()); const w1 = (await st()).ham;
  rec(hm.st === 'run' && w1.rev > w0.rev, 'look away and he goes back to running his wheel', JSON.stringify({ hm, w0, w1 }));
  await D((d, I) => I.run(3)); rec((await sounds('wheelSqueak')).length >= 1, 'his wheel squeaks as it goes round');
  /* the bell rope */
  await look(-.96, -.12); await frames(3); await clearSnd(); const bt0 = await D(d => d.civic.CIV.bellT);
  await tapOn('rope', 'the bell rope'); s = await st(); const bt1 = await D(d => d.civic.CIV.bellT), sb = await sounds('schoolBell');
  rec(s.rope === 1 && sb.length === 1 && bt1 > 1.5 && bt0 < .1, 'a tap on the bell rope rings the bell on the roof', JSON.stringify({ rope: s.rope, sb, bt1 }));
  await D((d, I) => I.run(.3)); await frames(2); await shot(pre + 'school-12-bell');
  /* at break the children are out in the yard; after school the chairs go up on the desks */
  await look(0, -.15); await time('11:05'); await D(d => d.civic.place()); await D((d, I) => I.run(1));
  let k2 = await D((d, I) => I.kids()); rec(k2.every(k => !k.vis), 'at break none of them is at a desk (they are in the yard)', JSON.stringify(k2.map(k => k.vis)));
  await frames(3); await shot(pre + 'school-13-break');
  await time('17:30'); await D(d => d.civic.place()); await D((d, I) => I.run(1)); k2 = await D((d, I) => I.kids());
  rec(k2.every(k => !k.vis && k.up > .9), 'after school the room is tidy, the chairs up on the desks', JSON.stringify(k2));
  await time('21:30'); await D((d, I) => I.run(.5)); await frames(3); await shot(pre + 'school-14-night');
  rec(await programs() === p0, 'nothing new compiled for anything done in there', p0 + ' then ' + await H(h => h.renderer.info.programs.length));
  /* out by a tap on the door */
  await look(3.14, -.7); await frames(3); await tapOn('door', 'the school door'); s = await st();
  rec(s.st === 'exit', (mobile ? 'a tap' : 'a click') + ' on the door takes you out', s.st);
  await until(s => s.st === 'out', 30 * 4); await D((d, I) => I.run(1)); await frames(4); await shot(pre + 'school-15-night-outside');

  /* ---------- by night: the hall lit, warm inside ---------- */
  await put('hall', .3, 6.5, 0, 0); await frames(4); await shot(pre + 'hall-12-night-outside');
  await D((d, I) => { I.enter('hall'); I.run(3.4); }); await frames(4); await shot(pre + 'hall-13-night-inside');
  await D((d, I) => { I.leave(); I.run(3.2); }); s = await st(); rec(s.st === 'out', 'out again by night', s.st);

  /* ---------- how loud: each new sound beside a footstep, the town's music stopped so only it is heard ---------- */
  const has = await page.evaluate(() => !!window.__meter);
  if (has) {
    await H(h => { h.__st = h.S.st; h.S.st = null; h.A.hush(); }); await wait(2500);
    const G = await D(d => d.civic.CGAIN);
    const lv = await page.evaluate(async G => { const A = window.__heloria.A, W = ms => new Promise(r => setTimeout(r, ms)), out = {};
      const meas = async (name, f) => { await W(500); f(); let pk = 0, db = -200; const t0 = performance.now(); while (performance.now() - t0 < 1600) { const m = window.__meter(); pk = Math.max(pk, m.pk); db = Math.max(db, m.db); await W(20); } out[name] = { pk: +pk.toFixed(4), db }; };
      await meas('silence', () => {}); await meas('step (pavement)', () => A.step(1)); await meas('step (grass)', () => A.step(0));
      await meas('hall door opening', () => A.civDoor(true, true)); await meas('hall door shutting', () => A.civDoor(false, true)); await meas('school door opening', () => A.civDoor(true, false));
      await meas('step on the boards', () => A.floorStep(.04)); await meas('chalk', () => A.chalk(.032)); await meas('duster', () => A.chalk(.032, true));
      await meas('xylophone, lowest', () => A.xylo(0, .0075)); await meas('xylophone, highest', () => A.xylo(7, .0075)); await meas('rocket', () => A.rocketWhoosh(.03)); await meas('parachute', () => A.chutePop(.017));
      await meas('hamster wheel', () => A.wheelSqueak(.006)); await meas('the works ticking', () => A.gearTick(false, .016)); await meas('the hour, in the clock room', () => A.townBell(G.clock * G.tower, 0));
      await meas('the hour, in the street', () => A.townBell(G.clock, 0)); await meas('the school bell, inside', () => A.schoolBell(G.bell * .95, 0)); await meas('the school bell, by the yard', () => A.schoolBell(G.bell, 0)); return out; }, G);
    await H(h => { h.S.st = h.__st; });
    for (const [k, v] of Object.entries(lv)) log(('  ' + k).padEnd(30), 'peak', String(v.pk).padEnd(8), 'loudest', v.db, 'dB');
    const ref = Math.max(lv['step (pavement)'].db, lv['step (grass)'].db), refPk = Math.max(lv['step (pavement)'].pk, lv['step (grass)'].pk);
    /* (the bells are the town's own, as loud as they always were: the hour in the clock room is only that bell nearer) */
    const ours = Object.keys(lv).filter(k => !/^(silence|step \(|the hour|the school bell)/.test(k));
    rec(ours.every(k => lv[k].db <= ref + 3 && lv[k].pk <= refPk * 1.6), 'the new sounds are no louder than a footstep (within 3 dB)', ours.map(k => k + ' ' + lv[k].db).join(', ') + ' against footsteps ' + ref + ' dB');
    rec(ours.every(k => lv[k].db > lv.silence.db + 6 && lv[k].db > ref - 18), 'and each is heard, none far under a footstep', JSON.stringify(lv.silence));
    const hr = lv['the hour, in the clock room'].db - lv['the hour, in the street'].db, sb = lv['the school bell, inside'].db - lv['the school bell, by the yard'].db;
    rec(hr > 0 && hr <= 3.5 && sb <= .5, 'the hour in the clock room is the street\'s bell a little nearer (within 3.5 dB), the school bell inside no louder than by the yard', JSON.stringify({ hour: +hr.toFixed(1), bell: +sb.toFixed(1) }));
  } else log('(no --meter: the levels are not measured)');

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
};

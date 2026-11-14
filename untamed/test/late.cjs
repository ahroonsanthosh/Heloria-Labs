/* The rooms built after you land, the visitor's way.
   node untamed/test/shot.cjs --html dist/untamed.html --late --scenario untamed/test/late.cjs --out <dir>
   (Without --late the tests have every room built at the end of the build, behind the loader, as they always were.)
   Behind the loader only what is out in the open is made: the town hall's room, the school's and the lighthouse's are left
   for after the landing, and their street parts are there already (the hall's front doors; the lighthouse's steps solid and
   the walking grid round them). By day (the tests' afternoon) the night market's people are left too, last, their places
   kept on the square from the start. Nothing is built while the landing is still on. Once you are down they are built a little at
   a time between the frames, never holding one long, and until a room is all there it cannot be gone into. Each is made
   ready to draw as it is finished, so going in compiles nothing new; inside, each is all there (Séamus, Ms Kavanagh and the
   six children, the keeper's log). */
module.exports = async ({ page, H, wait, log }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const frames = (n = 4) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const L = () => H(h => h.ST.cr._dbg.late.state);

  /* behind the loader */
  const s0 = await L();
  rec(s0.left.includes('civic inside') && s0.left.includes('lh') && !s0.busy && !s0.log.length, 'behind the loader the hall, the school and the lighthouse rooms are left for after the landing', JSON.stringify(s0.left));
  rec(s0.left[s0.left.length - 1] === 'market people', 'by day the night market\'s people too, last of all', JSON.stringify(s0.left));
  const mk0 = await H(h => { const M = h.ST.cr._dbg.market.MKT; return { figs: M.figs.length, obs: M.obs.length }; });
  rec(mk0.figs === 0 && mk0.obs > 0, 'their places on the square are kept from the start', JSON.stringify(mk0));
  const pre = await H(h => { const d = h.ST.cr._dbg, I = d.civic.inside.HSI, Lh = d.lighthouse.L;
    return { hsi: I.ok, lh: !!Lh.g, doors: (I.leaves0 || []).map(l => !!l.g.parent && l.g.children.length === 2), progs: h.renderer.info.programs.length }; });
  rec(!pre.hsi && !pre.lh, 'neither room is there yet', JSON.stringify(pre));
  rec(pre.doors.length === 2 && pre.doors.every(Boolean), 'the hall\'s front doors are there already (they are the street\'s)', JSON.stringify(pre.doors));

  /* the landing itself: the page lands by itself once it is ready; nothing is built while it is on */
  let sawCut = false, builtInCut = false;
  for (let k = 0; k < 2400; k++) { const q = await H(h => ({ cut: document.documentElement.classList.contains('crcut'), mode: h.S.mode, late: h.ST.cr._dbg.late.state }));
    if (q.cut) { sawCut = true; if (q.late.busy || q.late.log.length) builtInCut = true; }
    if (sawCut && !q.cut && q.mode === 'station') break; await wait(250); }
  rec(sawCut && !builtInCut, 'nothing is built while the landing is on', 'landing seen ' + sawCut);

  /* while they are built: not to be gone into */
  let tried = null;
  for (let k = 0; k < 2400; k++) { const q = await H(h => { const d = h.ST.cr._dbg; return { late: d.late.state, hsi: d.civic.inside.HSI.ok, lh: !!d.lighthouse.L.g && !d.lighthouse.L.late }; });
    if (q.late.busy && !q.hsi && !tried) { tried = await H(h => { const d = h.ST.cr._dbg; return { hall: d.civic.inside.enter('hall'), school: d.civic.inside.enter('school'), on: d.civic.inside.HSI.on }; }); }
    if (q.late.busy && q.late.cur === 'lh' && !q.lh && tried && !('lh' in tried)) tried.lh = await H(h => h.ST.cr._dbg.lighthouse.enter());
    if (!q.late.busy && !q.late.left.length) break; await wait(250); }
  rec(tried && tried.hall === false && tried.school === false && !tried.on, 'the hall and the school cannot be gone into while they are being built', JSON.stringify(tried));
  rec(!tried || tried.lh === undefined || tried.lh === false, 'nor the lighthouse', JSON.stringify(tried && tried.lh));

  const s1 = await L();
  rec(!s1.left.length && !s1.busy && s1.log.length === 3, 'once you are down they are all built', JSON.stringify(s1.log));
  const mk1 = await H(h => { const M = h.ST.cr._dbg.market.MKT; return { figs: M.figs.length, placed: M.figs.every(f => f.g.parent === M.g), obs: M.obs.length, open: h.ST.cr._dbg.market.open(), vis: M.g.visible }; });
  rec(mk1.figs === 7 && mk1.placed && mk1.obs === mk0.obs && !mk1.open && !mk1.vis, 'the market\'s seven people are there, in their places, out of sight till evening', JSON.stringify(mk1));
  rec(s1.max < 50, 'a little at a time: the longest the page is held at once is short', s1.max + ' ms (at ' + JSON.stringify(s1.at) + '), in ' + s1.slices + ' turns');
  const err = await H(h => ({ hsi: h.ST.cr._dbg.civic.inside.err, lh: h.ST.cr._dbg.lighthouse.err, late: h.ST.cr._dbg.late.state.log.map(x => x[0]) }));
  rec(!err.hsi && !err.lh, 'with no errors', JSON.stringify(err));

  /* in: nothing new compiled; all there */
  await frames(); const p0 = await H(h => h.renderer.info.programs.length);
  const inHall = await H(h => h.ST.cr._dbg.civic.inside.enter('hall'));
  for (let k = 0; k < 900 && (await H(h => h.ST.cr._dbg.civic.inside.HSI.st)) !== 'in'; k++) await wait(250);
  await frames(); const hall = await H(h => { const I = h.ST.cr._dbg.civic.inside.HSI, B = I.hall; return { st: I.st, vis: B.g.visible, clerk: !!(B.clerk && B.clerk.f.parent), progs: h.renderer.info.programs.length }; });
  rec(inHall && hall.st === 'in' && hall.vis && hall.clerk, 'the hall can be gone into once built, Séamus behind his counter', JSON.stringify(hall));
  rec(hall.progs === p0, 'going into the hall compiles nothing new', p0 + ' then ' + hall.progs);
  await H(h => h.ST.cr._dbg.civic.inside.reset()); await frames();
  const inSch = await H(h => h.ST.cr._dbg.civic.inside.enter('school'));
  for (let k = 0; k < 900 && (await H(h => h.ST.cr._dbg.civic.inside.HSI.st)) !== 'in'; k++) await wait(250);
  await frames(); const sch = await H(h => { const I = h.ST.cr._dbg.civic.inside.HSI, B = I.school; return { st: I.st, vis: B.g.visible, kids: B.kids.length, teacher: !!B.teach, progs: h.renderer.info.programs.length }; });
  rec(inSch && sch.st === 'in' && sch.vis && sch.kids === 6, 'and the school, its six children there', JSON.stringify(sch));
  rec(sch.progs === p0, 'going into the school compiles nothing new', p0 + ' then ' + sch.progs);
  await H(h => h.ST.cr._dbg.civic.inside.reset()); await frames();
  const inLh = await H(h => h.ST.cr._dbg.lighthouse.enter());
  for (let k = 0; k < 900 && (await H(h => h.ST.cr._dbg.lighthouse.L.st)) !== 'in'; k++) await wait(250);
  await frames(); const lh = await H(h => { const B = h.ST.cr._dbg.lighthouse.L; return { st: B.st, vis: B.g.visible, log: !!B.logTx, progs: h.renderer.info.programs.length }; });
  rec(inLh && lh.st === 'in' && lh.vis && lh.log, 'and the lighthouse, the keeper\'s log on his desk', JSON.stringify(lh));
  rec(lh.progs === p0, 'going into the lighthouse compiles nothing new', p0 + ' then ' + lh.progs);
  await H(h => h.ST.cr._dbg.lighthouse.reset());

  console.log(`RESULT ${pass} passed, ${fail} failed` + (failed.length ? ': ' + failed.join(' | ') : ''));
};

/* Tidy rooms: inside each room, no two separate things run into each other.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 500 --scenario untamed/test/tidy.cjs --out <dir>
   The grounding test looks for things running into each other out in the town, between one place and another; this looks
   inside each room (the town hall and its clock room, the school, the lighthouse, the chipper, the pub, the post office, the
   café, the fire station, the workshop), at every box its builder laid, grouped by the line of the builder that laid it (one
   thing: a window and its frame and sill, a noticeboard, a shelf). Two boxes of different things that run into each other
   by more than 1.5 cm, neither wholly inside the other (a plaque on its panel, a book on its shelf), are listed, with the two
   lines that laid them: a noticeboard over a window's frame, a shelf through a sill. Walls, floors and ceilings (anything
   longer than 1.4 m) are what everything stands on and against, and are left out. */
module.exports = async ({ H, log, html }) => {
  const res = await H(h => {
    const GR = h.ST.cr._dbg.grd; if (!GR) return { err: 'not under test' };
    const ROOMS = ['hhall', 'hclock', 'hschool', 'lhin', 'chin', 'pbin', 'poin', 'cafein', 'fsin', 'garin'];
    const stk = []; for (const [s, id] of GR.stk) stk[id] = s;
    const keyOf = new Map(); const frameRe = /at (?:async )?([\w$.]+) \(.*?:(\d+):(\d+)\)/;
    const key = si => { if (keyOf.has(si)) return keyOf.get(si); let k = null; for (const l of stk[si].split('\n')) { const m = l.match(frameRe); if (!m) continue; if (/^(hiBuild\w*|hiModel|build\w*|\w+House|lhShell)$/.test(m[1])) { k = m[1] + ':' + m[2]; break; } }
      keyOf.set(si, k); return k; };
    const T = window.THREE, out = [];
    for (const room of ROOMS) {
      const bx = [];
      for (const p of GR.prims) { if (p.geo !== 'box' || !p.m || p.k.split('#')[0] !== room) continue; const M = new T.Matrix4().fromArray(p.m);
        const c = new T.Vector3().setFromMatrixPosition(M), ax = [0, 1, 2].map(i => new T.Vector3().setFromMatrixColumn(M, i)), hx = ax.map(a => a.length() / 2);
        if (Math.max(...hx) * 2 > 1.4 || Math.min(...hx) * 2 < .002) continue; ax.forEach(a => a.normalize()); bx.push({ c, ax, hx, k: key(p.s), col: p.c }); }
      /* overlap of two boxes along an axis: how far they run into each other there (negative: apart) */
      const ov = (A, B, L) => { const ra = A.hx.reduce((s, h, i) => s + h * Math.abs(A.ax[i].dot(L)), 0), rb = B.hx.reduce((s, h, i) => s + h * Math.abs(B.ax[i].dot(L)), 0); return ra + rb - Math.abs(new T.Vector3().subVectors(B.c, A.c).dot(L)); };
      const inside = (A, B) => { for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const p = B.c.clone().addScaledVector(B.ax[0], sx * B.hx[0]).addScaledVector(B.ax[1], sy * B.hx[1]).addScaledVector(B.ax[2], sz * B.hx[2]).sub(A.c);
          for (let i = 0; i < 3; i++) if (Math.abs(p.dot(A.ax[i])) > A.hx[i] + .004) return false; } return true; };
      const pairs = new Map();
      for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const A = bx[i], B = bx[j]; if (!A.k || !B.k || A.k === B.k) continue;
        if (A.c.distanceTo(B.c) > Math.hypot(...A.hx) + Math.hypot(...B.hx)) continue;
        let depth = 1e9; const axes = [...A.ax, ...B.ax]; for (const a of A.ax) for (const b of B.ax) { const cr = new T.Vector3().crossVectors(a, b); if (cr.lengthSq() > 1e-6) axes.push(cr.normalize()); }
        for (const L of axes) { depth = Math.min(depth, ov(A, B, L)); if (depth <= .015) break; }
        if (depth <= .015 || inside(A, B) || inside(B, A)) continue;
        const pk = [A.k, B.k].sort().join(' x '); const e = pairs.get(pk) || { room, pair: pk, n: 0, depth: 0, at: null }; e.n++; if (depth > e.depth) { e.depth = +depth.toFixed(3); e.at = A.c.toArray().map(v => +v.toFixed(2)); } pairs.set(pk, e); }
      out.push(...pairs.values()); }
    return { list: out.sort((a, b) => b.depth - a.depth) };
  });
  if (res.err) { console.log('FAIL ' + res.err); return; }
  const src = require('fs').readFileSync(require('path').resolve(process.argv[process.argv.indexOf('--html') + 1]), 'utf8').split('\n');
  const line = k => { const n = +k.split(':')[1]; return (src[n - 1] || '').trim().replace(/^await step\(\); /, '').slice(0, 110); };
  for (const e of res.list) { const [a, b] = e.pair.split(' x '); log(`${e.room}  ${e.n} box pair(s), up to ${Math.round(e.depth * 100)} cm into each other\n    ${a}: ${line(a)}\n    ${b}: ${line(b)}`); }
  console.log(`RESULT ${res.list.length} pairs of things running into each other inside the rooms`);
};

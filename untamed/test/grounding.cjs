/* The grounding audit on Earth: nothing floats, nothing is sunk, feet are planted, wheels are on the road, nothing clips.
   node untamed/test/shot.cjs --html dist/untamed.html --earth --settle 2500 --scenario untamed/test/grounding.cjs --out <dir> [--mobile]
   It walks what the town has built in the running page, not a list of names, so whatever is added later is covered too:
   - every piece of the town's own mesh (under test the station notes, for each piece, the placement it belongs to and the
     calls that made it: st._dbg.grd) and every other thing in the scene is measured against the ground directly under it,
     along the planet's up: the terrain, the roads and pavements, a floor, or whatever else it stands on. A thing whose lowest
     point is more than 3 cm over that is floating, unless it touches something that is itself held up (a sign on its posts,
     a lamp on its post, a rail on its fence posts, a pier deck on its piles: held up, not floating). A flat foot (a step, a
     slab, a leg, a post) buried more than 3 cm is sunk. A flat foot resting on the ground whose edge lifts more than 3 cm
     off it (the world is round and small: a wide flat thing laid flat rocks on it) is lifted.
   - everyone's soles (each of us, everyone in town, the visitor) against the ground or floor under them: within 2 cm while
     standing, and while walking the lower foot down on it nearly every frame; at four times of day, and walking the
     visitor over the kerbs, out along the pier's boards, and up the step or steps into each place that can be gone into (the
     café, the lighthouse, the chipper, the pub, the post office, the town hall, the school, the workshop) and out again.
     Someone sitting may have their feet off the floor (the man fishing off the pier's end); never in it.
   - the wheels of the vehicles on the loop against the road, driving and standing.
   - nothing clips: no two separate things of the town's mesh run into each other (a tree through a roof, a bin in a wall),
     and nobody stands or walks inside one, nor inside a parked vehicle.
   What is meant to be off the ground or to touch is left out on purpose, each with its reason where it is left out (EXCLUDE,
   and the notes before clips and bodyClips): a light or a glow, a flying bird or drone, a puff of smoke, a boat riding the
   sea (only one hovering over it is wrong), a footing or a pile made to reach into the ground, a plant among plants, a
   wire tied to a post. The station's clock is stepped by hand, as in earth.cjs. */
const fs = require('fs');
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  let pass = 0, fail = 0; const failed = [];
  const rec = (ok, name, info) => { if (ok) { pass++; console.log('PASS ' + name + (info ? '  (' + info + ')' : '')); } else { fail++; failed.push(name); console.log('FAIL ' + name + (info ? '  (' + info + ')' : '')); } };
  const pre = mobile ? 'm-' : '';
  const FOOT = .02;   // (as in the page: a sole more than 2 cm off the floor is not planted)
  /* (the page's lines to the station's own: the station is pasted into the page whole) */
  let off = 0; try { const html = fs.readFileSync(decodeURIComponent(new URL(page.url()).pathname), 'utf8'); off = html.split('\n').findIndex(l => l.startsWith('/* ================= EARTH')); } catch (e) { off = 0; }

  await H((h, OFF) => {
    const st = h.ST.cr, d = st._dbg, sc = st.scene, R = 24, T = THREE, GR = d.grd;
    if (!GR) { window.__G = { err: 'no st._dbg.grd: the page was not opened under test' }; return; }
    const TOL = .03, FOOT = .02;   // a thing more than 3 cm off the ground floats; a sole more than 2 cm off it is not planted
    const v1 = new T.Vector3(), v2 = new T.Vector3(), v3 = new T.Vector3(), m4 = new T.Matrix4(), m3 = new T.Matrix3();
    const visible = o => { const o0 = o; for (; o; o = o.parent) if (!o.visible) return false; return Math.abs(o0.matrixWorld.determinant()) > 1e-6; };   // (shrunk to nothing is not drawn either)
    /* a point in the world as the town's map has it: x and z from the square, h over the round world (R) */
    const locOf = (x, y, z, o) => { const L = Math.hypot(x, y, z), a = Math.acos(Math.max(-1, Math.min(1, y / L))), s = Math.sin(a), k = s < 1e-9 ? 0 : a * R / s / L; o[0] = x * k; o[1] = z * k; o[2] = L - R; return o; };
    const UP = (x, z) => d.at(x, z);
    /* ---------- the ground: the terrain exactly as it is drawn (the cap's own triangles) ---------- */
    let cap = null; sc.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.aH && o.geometry.attributes.aXZ) cap = o; });
    const XZ = cap.geometry.attributes.aXZ.array, AH = cap.geometry.attributes.aH.array, CN = Math.round(Math.sqrt(AH.length)), X0 = XZ[0], CS = XZ[2] - XZ[0];
    function terr(x, z) { const fx = (x - X0) / CS, fz = (z - X0) / CS, i = Math.max(0, Math.min(CN - 2, Math.floor(fx))), j = Math.max(0, Math.min(CN - 2, Math.floor(fz)));
      const tx = Math.max(0, Math.min(1, fx - i)), tz = Math.max(0, Math.min(1, fz - j)), k = j * CN + i, a = AH[k], b = AH[k + 1], c = AH[k + CN], e = AH[k + CN + 1];
      return tx + tz <= 1 ? a + (b - a) * tx + (c - a) * tz : e + (c - e) * (1 - tx) + (b - e) * (1 - tz); }
    const sea = () => -.9 + (d.coast ? d.coast.TD.h : 0);
    const LOWW = () => -.9 - (d.coast ? d.coast.TD.amp || .25 : .25);   // low water: anything below it is never seen
    /* ---------- who made what: the calls behind each piece, read from the station's note of them ---------- */
    const STK = [...GR.stk.keys()], FAM = new Map();
    const HELP = /^(kadd|put|box|cyl|ktri|kquad|grdPrim|sub|slTri|wiQuad|hiRod|hiTorus|hiLathe|hiTube|rod|pipe|lathe|torus|fin|fq|blot|ka|Array\.forEach|forEach|\(anon\)|Object\.\w+)$/;
    function famOf(si) { let f = FAM.get(si); if (f) return f;
      const fr = STK[si].split('\n').map(l => { const m = /at (?:async )?(\S+) \((.*):(\d+):(\d+)\)/.exec(l) || /at (?:async )?()(.*):(\d+):(\d+)$/.exec(l); return m ? { fn: m[1] || '(anon)', line: +m[3] - OFF, col: +m[4] } : null; }).filter(Boolean);
      let i = fr.findIndex(q => q.fn === 'st.build'); if (i < 0) i = fr.length - 1;
      const top = fr[Math.max(0, i - 1)], names = fr.slice(0, Math.max(1, i)).map(q => q.fn).filter(n => !HELP.test(n)).reverse();
      f = { key: top.fn + '@' + top.line + ':' + top.col, label: (names.slice(0, 3).join('>') || top.fn) + ' (line ' + top.line + ')' }; FAM.set(si, f); return f; }
    /* ---------- the dbg tree, read backwards: what each thing in the scene is called there, for the report ---------- */
    let NAMES = null;
    function names() { NAMES = new Map(); const seen = new Set();
      const walk = (o, path, dep) => { if (!o || typeof o !== 'object' || seen.has(o) || dep > 5) return; seen.add(o);
        if (o.isObject3D) { if (!NAMES.has(o)) NAMES.set(o, path); return; }
        if (o.isVector3 || o.isMatrix4 || o.isColor || o.isMaterial || o.isBufferGeometry || o.isTexture || ArrayBuffer.isView(o) || o instanceof Map || o instanceof Set || o === window || o.nodeType) return;
        const nm = o.first || o.name || o.key || o.id; let keys; try { keys = Object.keys(o); } catch (e) { return; }
        for (const k of keys) { if (k === 'grd' || k === 'parent') continue; let v; try { const ds = Object.getOwnPropertyDescriptor(o, k); if (ds && ds.get) continue; v = o[k]; } catch (e) { continue; }
          walk(v, path + (Array.isArray(o) ? '[' + k + ']' : '.' + k) + (typeof nm === 'string' && !Array.isArray(o) && k === 'g' ? '(' + nm + ')' : ''), dep + 1); } };
      for (const k of Object.keys(d)) { if (k === 'grd') continue; let v; try { const ds = Object.getOwnPropertyDescriptor(d, k); v = ds && ds.get && k !== 'people' ? null : d[k]; } catch (e) { continue; } walk(v, k, 0); }
      return NAMES; }
    const nameOf = o => { if (!NAMES) names(); for (let q = o; q; q = q.parent) { const n = NAMES.get(q); if (n) return n; } return null; };

    /* ---------- the town's mesh, piece by piece, where it is drawn now ---------- */
    let W = null;
    function collect() {
      sc.updateMatrixWorld(true); NAMES = null;
      const gens = new Map(); for (const p of GR.prims) { let g = gens.get(p.k); if (!g) gens.set(p.k, g = { k: p.k, prims: [], v: 0 }); g.prims.push(p); g.v = Math.max(g.v, p.v0 + p.nv); }
      const byN = new Map(); sc.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.attributes.position && o.geometry.attributes.color) { const n = o.geometry.attributes.position.count; if (!byN.has(n)) byN.set(n, []); byN.get(n).push(o); } });
      const geoGen = new Map();
      /* which geometry each batch of pieces became: the very same numbers (its first corner and colour, piece by piece); or, a
         batch moved as a whole after it was made, the one geometry of that shape */
      for (const g of gens.values()) { const done = new Set(), exact = [], moved = [];
        for (const m of byN.get(g.v) || []) { const geo = m.geometry; if (done.has(geo) || geoGen.has(geo)) continue; done.add(geo);
          const P = geo.attributes.position.array, Cc = geo.attributes.color.array, p0 = g.prims[0]; let ex = true, mv = true;
          for (const p of g.prims) { const a = p.v0 * 3, b = p0.v0 * 3;
            for (let c = 0; c < 3; c++) { if (Math.abs(P[a + c] - p.f[c]) > 1e-3) ex = false; if (Math.abs((P[a + c] - P[b + c]) - (p.f[c] - p0.f[c])) > 2e-3) mv = false; if (Math.abs(Cc[a + c] - p.c[c]) > 2e-3) ex = mv = false; } if (!mv) break; }
          if (ex) exact.push(geo); else if (mv && g.prims.length > 1) moved.push(geo); }
        for (const geo of exact.length ? exact : moved.length === 1 ? moved : []) geoGen.set(geo, g); }
      const users = new Map(); sc.traverse(m => { if (m.isMesh && geoGen.has(m.geometry)) users.set(m.geometry, (users.get(m.geometry) || 0) + 1); });
      const prims = [], places = new Map(), kitMeshes = new Set(), tmp = [0, 0, 0];
      sc.traverse(m => { if (!m.isMesh || !m.geometry) return; const g = geoGen.get(m.geometry); if (!g) return; kitMeshes.add(m); MW0.set(m, m.matrixWorld.clone());   /* (hidden ones too, an inside seen once you go in: whether each is drawn is asked as it is measured) */
        const P = m.geometry.attributes.position.array, Nn = m.geometry.attributes.normal ? m.geometry.attributes.normal.array : null, Mw = m.matrixWorld; m3.getNormalMatrix(Mw);
        for (const p of g.prims) { const n = p.nv, Wv = new Float32Array(n * 3), X = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { v1.fromArray(P, (p.v0 + i) * 3).applyMatrix4(Mw); Wv[i * 3] = v1.x; Wv[i * 3 + 1] = v1.y; Wv[i * 3 + 2] = v1.z; locOf(v1.x, v1.y, v1.z, tmp); X[i * 3] = tmp[0]; X[i * 3 + 1] = tmp[1]; X[i * 3 + 2] = tmp[2]; }
          const fam = famOf(p.s), key = (users.get(m.geometry) > 1 ? m.id + ':' : '') + p.n;   // (one placement, even across meshes; a copy of a shared geometry is its own)
          const q = { i: prims.length, p, m, W: Wv, X, n, geo: p.geo, solid: p.geo !== 'tri', fam, place: key, kit: p.k.split('#')[0], col: '#' + new T.Color(p.c[0], p.c[1], p.c[2]).getHexString() };
          /* up-facing triangles (floors, tops, the road) are what something can stand on */
          q.upTri = []; for (let t = 0; t + 2 < n; t += 3) { let nx, ny, nz; if (Nn) { v2.fromArray(Nn, (p.v0 + t) * 3).applyMatrix3(m3).normalize(); } else { v2.set(0, 1, 0); }
            v3.set(Wv[t * 3], Wv[t * 3 + 1], Wv[t * 3 + 2]).normalize(); if (v2.dot(v3) > .3) q.upTri.push(t); }
          /* its box, in its own frame (the matrix it was put in, turned as its mesh is now) */
          if (p.m && q.solid) { m4.fromArray(p.m); const ax = [new T.Vector3(), new T.Vector3(), new T.Vector3()]; m4.extractBasis(ax[0], ax[1], ax[2]); ax.forEach(a => a.transformDirection(Mw));
            const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const s = Wv[i * 3] * ax[k].x + Wv[i * 3 + 1] * ax[k].y + Wv[i * 3 + 2] * ax[k].z; if (s < lo[k]) lo[k] = s; if (s > hi[k]) hi[k] = s; }
            q.ax = ax; q.hx = [0, 1, 2].map(k => (hi[k] - lo[k]) / 2); q.c = new T.Vector3(); for (let k = 0; k < 3; k++) q.c.addScaledVector(ax[k], (hi[k] + lo[k]) / 2); q.lo = lo; }
          else if (q.solid) { /* (a piece made without a frame: its box along the world's axes) */ const bb = new T.Box3(); for (let i = 0; i < n; i++) bb.expandByPoint(v1.fromArray(Wv, i * 3));
            q.ax = [new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1)]; q.c = bb.getCenter(new T.Vector3()); const sz = bb.getSize(new T.Vector3()); q.hx = [sz.x / 2, sz.y / 2, sz.z / 2]; q.lo = [bb.min.x, bb.min.y, bb.min.z]; q.geo = 'kadd'; }
          let mx = 1e9, my = 1e9, MX = -1e9, MY = -1e9, mh = 1e9, MH = -1e9; for (let i = 0; i < n; i++) { const x = X[i * 3], z = X[i * 3 + 1], hh = X[i * 3 + 2]; if (x < mx) mx = x; if (x > MX) MX = x; if (z < my) my = z; if (z > MY) MY = z; if (hh < mh) mh = hh; if (hh > MH) MH = hh; }
          q.bx = [mx, my, MX, MY]; q.hmin = mh; q.hmax = MH; q.x = (mx + MX) / 2; q.z = (my + MY) / 2;
          prims.push(q); if (!places.has(key)) places.set(key, { key, prims: [], fam, m }); places.get(key).prims.push(q); } });
      /* the floors: every up-facing triangle, filed by where it is on the map */
      const CELL = .5, cells = new Map(), TR = [];
      for (const q of prims) for (const t of q.upTri) { const X = q.X, a = t * 3; const xs = [X[a], X[a + 3], X[a + 6]], zs = [X[a + 1], X[a + 4], X[a + 7]];
        const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs); if (x1 - x0 > 8 || z1 - z0 > 8) continue;
        const ti = TR.length; TR.push([q, a]);
        for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = i * 4096 + j; let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(ti); } }
      /* and every solid piece, filed by where it is in the world, for what touches what */
      const BOX = 1, bins = new Map(); for (const q of prims) { if (!q.solid) continue; const r = Math.hypot(q.hx[0], q.hx[1], q.hx[2]); q.r = r;
        const lo = [q.c.x - r, q.c.y - r, q.c.z - r].map(v => Math.floor(v / BOX)), hi = [q.c.x + r, q.c.y + r, q.c.z + r].map(v => Math.floor(v / BOX));
        if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 600) { q.big = true; continue; }
        for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) { const kk = i + ',' + j + ',' + k; let b = bins.get(kk); if (!b) bins.set(kk, b = []); b.push(q.i); } }
      const big = prims.filter(q => q.big);
      W = { prims, places, cells, TR, CELL, bins, BOX, big, kitMeshes };
      return { prims: prims.length, places: places.size, floors: TR.length, gens: gens.size, matched: geoGen.size };
    }
    /* whether a piece is drawn now (asked of its mesh, once per measurement) */
    let VIS = new Map(); const MW0 = new Map(), fresh = () => { VIS = new Map(); sc.updateMatrixWorld(); };   // (where everything is drawn this frame: a door swung open since the last is where it is now)
    /* (a piece of a mesh that has moved since it was read, a door swung open, is not where it was read: left out until read again) */
    const shown = q => { let v = VIS.get(q.m); if (v == null) VIS.set(q.m, v = visible(q.m) && q.m.matrixWorld.equals(MW0.get(q.m))); return v; };
    /* the floor under a point (x, z at height hh; p: the point in the world): the highest surface at or under it, the terrain or
       a triangle of the town's mesh that faces up. Under a surface by up to 20 cm, the point is buried if it is in the ground, in
       a road or a floor (laid on the ground), or inside the piece whose top that is; if not (a post through a deck, in the air
       under it), its floor is whatever is under it. skip: pieces not to count (a thing's own) */
    function floorAt(x, z, hh, skip, p) { const tg = terr(x, z), S = [], r_ = Math.hypot(x, z), ux = r_ < 1e-9 ? 0 : x * Math.sin(r_ / R) / r_, uy = Math.cos(r_ / R), uz = r_ < 1e-9 ? 0 : z * Math.sin(r_ / R) / r_;
      const c = W.cells.get(Math.floor(x / W.CELL) * 4096 + Math.floor(z / W.CELL)); if (c) for (const ti of c) { const [q, a] = W.TR[ti]; if (!shown(q) || (skip && skip(q))) continue; const X = q.X;
        const ax = X[a], az = X[a + 1], bx = X[a + 3], bz = X[a + 4], cx = X[a + 6], cz = X[a + 7], den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(den) < 1e-9) continue;
        const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den, l3 = 1 - l1 - l2; if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        /* (its height where the world's up through (x, z) meets its plane: a big flat face is flat, not bent round the world) */
        const Wv = q.W, e1x = Wv[a + 3] - Wv[a], e1y = Wv[a + 4] - Wv[a + 1], e1z = Wv[a + 5] - Wv[a + 2], e2x = Wv[a + 6] - Wv[a], e2y = Wv[a + 7] - Wv[a + 1], e2z = Wv[a + 8] - Wv[a + 2];
        const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x, nu = nx * ux + ny * uy + nz * uz; if (Math.abs(nu) < 1e-9) continue;
        const h_ = (nx * Wv[a] + ny * Wv[a + 1] + nz * Wv[a + 2]) / nu - R; if (h_ <= hh + .2 && h_ > tg) S.push([h_, q]); }
      S.sort((a, b) => b[0] - a[0]);
      if (tg > hh) return { h: tg, who: 'terrain', buried: true };
      for (const [h_, q] of S) { if (h_ <= hh + .002) return { h: h_, who: q };
        if (!q.solid || (p && inside(q, p[0], p[1], p[2], 0))) return { h: h_, who: q, buried: true }; }
      return { h: tg, who: 'terrain' }; }
    /* what pieces are near a point in the world */
    function near(x, y, z, r) { const out = new Set(), B = W.BOX; for (let i = Math.floor((x - r) / B); i <= Math.floor((x + r) / B); i++) for (let j = Math.floor((y - r) / B); j <= Math.floor((y + r) / B); j++) for (let k = Math.floor((z - r) / B); k <= Math.floor((z + r) / B); k++) { const b = W.bins.get(i + ',' + j + ',' + k); if (b) for (const ix of b) out.add(ix); } for (const q of W.big) out.add(q.i); return [...out].map(i => W.prims[i]); }
    /* boxes that overlap (each grown by e) */
    function obbHit(A, B, e) { const ax = [...A.ax, ...B.ax]; for (const a of A.ax) for (const b of B.ax) { const c = new T.Vector3().crossVectors(a, b); if (c.lengthSq() > 1e-6) ax.push(c.normalize()); }
      const D = v1.subVectors(B.c, A.c); for (const L of ax) { let ra = e, rb = e; for (let k = 0; k < 3; k++) { ra += A.hx[k] * Math.abs(A.ax[k].dot(L)); rb += B.hx[k] * Math.abs(B.ax[k].dot(L)); } if (Math.abs(D.dot(L)) > ra + rb) return false; } return true; }
    /* a point inside a solid piece, at least m inside its skin (by its shape: a box, a can, a cone, a ball, a roof) */
    const ROUND = { sph: 1, blob: 1, rock: 1 }, CAN = { cyl: 1, cyl8: 1, tcyl: 1 }, CONE = { cone: 1, cone8: 1, pyr4: 1 };
    function inside(B, x, y, z, m) { if (!B.solid || B.geo === 'kadd') return false; const u = [0, 0, 0];
      for (let k = 0; k < 3; k++) { const hk = B.hx[k] - Math.min(m, B.hx[k] * .35); if (hk <= 1e-4) return false; u[k] = ((x - B.c.x) * B.ax[k].x + (y - B.c.y) * B.ax[k].y + (z - B.c.z) * B.ax[k].z) / hk; if (Math.abs(u[k]) > 1) return false; }
      if (B.geo === 'box') return true; if (CAN[B.geo]) return u[0] * u[0] + u[2] * u[2] <= 1; if (ROUND[B.geo]) return u[0] * u[0] + u[1] * u[1] + u[2] * u[2] <= 1;
      if (CONE[B.geo]) return Math.hypot(u[0], u[2]) <= (1 - u[1]) / 2; if (B.geo === 'prism') { const t = (u[1] + 1) / 2; return Math.abs(u[0]) <= 1 - t; } return false; }
    /* points on a piece's skin: its corners and along its edges, every 8 cm */
    function skin(A) { if (A.pts) return A.pts; const P = [], Wv = A.W; if (A.n > 400) { for (let i = 0; i < A.n; i += 3) P.push(Wv[i * 3], Wv[i * 3 + 1], Wv[i * 3 + 2]); return A.pts = P; }
      for (let t = 0; t + 2 < A.n; t += 3) for (let e = 0; e < 3; e++) { const a = (t + e) * 3, b = (t + (e + 1) % 3) * 3, L = Math.hypot(Wv[b] - Wv[a], Wv[b + 1] - Wv[a + 1], Wv[b + 2] - Wv[a + 2]), s = Math.max(1, Math.ceil(L / .08));
        for (let k = 0; k < s; k++) { const f = k / s; P.push(Wv[a] + (Wv[b] - Wv[a]) * f, Wv[a + 1] + (Wv[b + 1] - Wv[a + 1]) * f, Wv[a + 2] + (Wv[b + 2] - Wv[a + 2]) * f); } } return A.pts = P; }
    const where = q => '(' + q.x.toFixed(1) + ', ' + q.z.toFixed(1) + ')';

    /* ======================================================================================================================
       EXCLUDE: what is meant to be off the ground, and why. Each is left out by what it is, never by a looser threshold.
       ====================================================================================================================== */
    function excluded(o) { const n = nameOf(o) || '', ud = o.userData || {};
      /* light, not things: beams, glows, lit panes and the like (marked noInk), and the sky's own sprites and particles */
      for (let q = o; q; q = q.parent) if (q.userData && q.userData.noInk) return 'light, not a thing (noInk)';
      if (o.isPoints || o.isLine || o.isSprite) return 'particles';
      if (o.material && o.material.blending === T.AdditiveBlending) return 'a glow';
      /* flat, unlit colour: a light's glass, a lamp's glow, the ring of light round a landmark; light, not a thing that stands */
      if (o.material && o.material.isShaderMaterial && /gl_FragColor=vec4\(uC,1\.\)/.test(o.material.fragmentShader || '')) return 'flat unlit colour: a light';
      /* flying: the birds over the town, the gulls, the little drones round the landmarks and at Ahroon's shoulder */
      if (d.BIRDS && d.BIRDS.some(b => b.g && (b.g === o || isUnder(o, b.g)))) return 'a bird, flying';
      if (/RK\.puffs/.test(n)) return 'a puff of a rocket\'s smoke, in the air';
      for (let q = o; q; q = q.parent) if (q.userData && q.userData.light && q.children.length >= 5) return 'a drone, flying';
      /* the kite on the cliff: on its string in the wind, or leaning on the bench (touching it) */
      if (/cliff\.|kite/i.test(n)) return null;
      return null; }
    const isUnder = (o, g) => { for (let q = o; q; q = q.parent) if (q === g) return true; return false; };
    const isFig = o => { for (let q = o; q; q = q.parent) if (q.userData && q.userData.legs) return q; return null; };
    const cars = () => (d.town && d.town.TL && d.town.TL.cars) || [];
    const isCar = o => cars().find(c => isUnder(o, c.g)) || null;

    /* ======================================================================================================================
       the town's mesh: float, sink, lift
       ====================================================================================================================== */
    function statics() {
      fresh(); const out = { float: [], sink: [], lift: [], held: 0, grounded: 0, wet: 0 }, ground = new Map(), cand = [], lw = LOWW();
      const HW = -.9 + (d.coast ? d.coast.TD.amp || .25 : .25), isGround = r => r === 'terrain' || (r && !r.solid);
      for (const P of W.places.values()) { const S = P.prims.filter(q => q.solid && shown(q)); if (!S.length) continue;
        /* standing in the sea (a pile, a post, the jetty's legs): its foot is under the water at some tide, and the seabed is
           what it is driven into, so it is held, never floating or sunk */
        if (S.some(q => q.hmin < lw)) { out.wet++; ground.set(P.key, true); continue; }
        let minT = 1e9; for (const q of S) for (let i = 0; i < q.n; i++) { const X = q.X, t = X[i * 3 + 2] - terr(X[i * 3], X[i * 3 + 1]); if (t < minT) minT = t; }
        let best = { c: 1e9 }; const own = q => q.place === P.key;
        for (const q of S) for (let i = 0; i < q.n; i++) { const X = q.X, x = X[i * 3], z = X[i * 3 + 1], hh = X[i * 3 + 2]; if (hh - terr(x, z) > minT + .25) continue;
          const f = floorAt(x, z, hh, own, [q.W[i * 3], q.W[i * 3 + 1], q.W[i * 3 + 2]]), c = hh - f.h; if (c < best.c) best = { c, q, x, z, hh, on: f.who, tg: terr(x, z) }; }
        P.min = best; ground.set(P.key, best.c <= TOL);
        if (best.c > TOL) cand.push(P); else out.grounded++;
        /* sunk: a flat foot (a step, a slab, a leg, a post's foot) buried in the ground, a road or a floor by more than 3 cm.
           Not: rocks, bushes, reeds and the like, which sit into the ground as they do; a footing or a pile, made to reach down
           into the ground (buried deeper than 25 cm); a foot on the beach below high water, where the sand comes and goes; and a thing inside another
           thing, which is clipping (below), not sinking */
        const bq = best.q, pile = -best.c > .25 || (CAN[bq.geo] && Math.max(bq.hx[0], bq.hx[2]) < .1 && best.on === 'terrain');   // (buried deeper than 25 cm: a footing, a pile, steps reaching down to meet the ground, sunk on purpose; or a post or a pile set in the ground)
        if (best.c < -TOL && !ROUND[bq.geo] && !CONE[bq.geo] && bq.geo !== 'kadd' && isGround(best.on) && !pile && best.tg > HW)
          out.sink.push({ what: bq.fam.label, at: where(bq), by: +(-best.c).toFixed(3), part: bq.geo + ' ' + bq.col + ' ' + (bq.hmax - bq.hmin).toFixed(2) + ' m tall', on: best.on === 'terrain' ? 'terrain' : best.on.fam.label, key: P.key });
        /* lifted: a flat foot resting on the ground (the terrain, a road, a floor), level with the world's up, whose edge stands
           more than 3 cm off whatever is under it (the world is round and small: a wide slab laid flat on it, or a step on a slope) */
        for (const q of S) { if (!q.ax || ROUND[q.geo] || CONE[q.geo] || q.geo === 'kadd') continue; v1.set(q.c.x, q.c.y, q.c.z).normalize(); if (Math.abs(q.ax[1].dot(v1)) < .97) continue;
          const sgn = q.ax[1].dot(v1) > 0 ? 1 : -1, lo = sgn > 0 ? q.lo[1] : -(q.lo[1] + 2 * q.hx[1]);
          let rest = false, cmax = -1e9, at = null;
          for (let i = 0; i < q.n; i++) { const s = sgn * (q.W[i * 3] * q.ax[1].x + q.W[i * 3 + 1] * q.ax[1].y + q.W[i * 3 + 2] * q.ax[1].z); if (s > lo + .003) continue;
            const X = q.X, x = X[i * 3], z = X[i * 3 + 1], hh = X[i * 3 + 2]; const f = floorAt(x, z, hh, r => r === q, null), c = hh - f.h;
            if (c <= TOL && isGround(f.who)) rest = true; if (c > cmax) { cmax = c; at = [x, z]; } }
          if (rest && cmax > TOL + .005) out.lift.push({ what: q.fam.label, at: '(' + at[0].toFixed(1) + ', ' + at[1].toFixed(1) + ')', by: +cmax.toFixed(3), part: q.geo + ' ' + q.col + ' ' + (2 * q.hx[0]).toFixed(2) + 'x' + (2 * q.hx[2]).toFixed(2), key: P.key }); } }
      /* held up: a thing off the ground touching something that is itself on the ground or held up */
      const touches = new Map();
      for (const P of cand) { const nb = new Set();
        for (const q of P.prims) { if (!q.solid) continue; for (const o of near(q.c.x, q.c.y, q.c.z, q.r + .05)) { if (o.place === P.key || !o.solid || !shown(o)) continue; if (v2.subVectors(o.c, q.c).length() > q.r + o.r + .02) continue; if (obbHit(q, o, .015)) nb.add(o.place); } }
        touches.set(P.key, nb); }
      let changed = true; const held = new Set(); while (changed) { changed = false; for (const P of cand) { if (held.has(P.key)) continue; for (const k of touches.get(P.key)) if (ground.get(k) || held.has(k)) { held.add(P.key); changed = true; break; } } }
      out.held = held.size;
      for (const P of cand) if (!held.has(P.key)) { const b = P.min; out.float.push({ what: b.q.fam.label, at: where(b.q), by: +b.c.toFixed(3), part: b.q.geo + ' ' + b.q.col, pieces: P.prims.length, key: P.key, kit: b.q.kit, xyz: [b.x, b.z, b.hh] }); }
      for (const k of ['float', 'sink', 'lift']) out[k].sort((a, b) => b.by - a.by);
      return out; }

    /* ======================================================================================================================
       everything else in the scene (things that move, signs, doors, the market's own meshes, boats): float and sink
       ====================================================================================================================== */
    function others() { fresh(); const out = { float: [], sink: [], ex: {}, n: 0 }, tops = new Map(), lw = LOWW(), tmp = [0, 0, 0];
      sc.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || W.kitMeshes.has(o) || o === cap || !visible(o)) return; if (o.isInstancedMesh) return;
        if (o.geometry.type === 'SphereGeometry' && o.geometry.parameters && o.geometry.parameters.radius > 20) return;   // the sea and the sky
        if (isFig(o) || isCar(o)) return;   // (people and vehicles: their feet and wheels, below)
        const why = excluded(o); if (why) { out.ex[why] = (out.ex[why] || 0) + 1; return; }
        let top = o; while (top.parent && top.parent !== sc && !(top.parent.parent === sc && d.MK && Object.values(d.MK).some(m => m.g === top.parent))) top = top.parent;
        if (!tops.has(top)) tops.set(top, []); tops.get(top).push(o); });
      for (const [top, ms] of tops) { out.n++; let best = { c: 1e9 }, minT = 1e9; const pts = [];
        for (const m of ms) { const P = m.geometry.attributes.position.array, n = P.length / 3, st_ = Math.max(1, Math.floor(n / 4000));
          for (let i = 0; i < n; i += st_) { v1.fromArray(P, i * 3).applyMatrix4(m.matrixWorld); locOf(v1.x, v1.y, v1.z, tmp); const t = tmp[2] - terr(tmp[0], tmp[1]); pts.push(tmp[0], tmp[1], tmp[2], v1.x, v1.y, v1.z); if (t < minT) minT = t; } }
        for (let i = 0; i < pts.length; i += 6) { const x = pts[i], z = pts[i + 1], hh = pts[i + 2]; if (hh - terr(x, z) > minT + .25) continue;
          let f = floorAt(x, z, hh, null, [pts[i + 3], pts[i + 4], pts[i + 5]]), wet = false; const sw = sea(); if (terr(x, z) < sw && f.who === 'terrain') { f = { h: sw, who: 'the sea' }; wet = true; }
          const c = hh - f.h; if (c < best.c) best = { c, x, z, hh, on: f.who, wet }; }
        if (best.c > 1e8) continue;
        const mc = ms[0].material && ms[0].material.uniforms && ms[0].material.uniforms.uC ? '#' + ms[0].material.uniforms.uC.value.getHexString() : '', nm = nameOf(top) || nameOf(ms[0]) || (ms.length + ' mesh ' + (ms[0].geometry.type || '') + ' ' + mc + ' ' + ms[0].geometry.attributes.position.count + 'v'), info = { what: nm, at: '(' + best.x.toFixed(1) + ', ' + best.z.toFixed(1) + ')', by: +Math.abs(best.c).toFixed(3), on: best.on === 'terrain' || best.on === 'the sea' ? best.on : best.on.fam.label };
        /* on the water: a boat rides it, its hull down in it; only one that hovers over it is wrong */
        if (best.wet) { if (best.c > TOL) out.float.push(Object.assign(info, { water: true })); continue; }
        if (best.c < -TOL) { if (best.on === 'terrain' || (best.on && best.on !== 'the sea' && !best.on.solid)) out.sink.push(info); continue; }   // (inside another thing is clipping, not sinking)
        if (best.c <= TOL) continue;
        /* held up by touch, as the town's own pieces are: a box round each of its meshes against the pieces near it */
        let heldUp = false;
        for (const m of ms) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; if (!isFinite(bb.min.x)) continue; const Mw = m.matrixWorld, ax = [new T.Vector3(), new T.Vector3(), new T.Vector3()]; Mw.extractBasis(ax[0], ax[1], ax[2]);
          const sz = [ax[0].length(), ax[1].length(), ax[2].length()]; ax.forEach(a => a.normalize()); const c = bb.getCenter(new T.Vector3()).applyMatrix4(Mw), s = bb.getSize(new T.Vector3());
          const A = { ax, c, hx: [s.x * sz[0] / 2, s.y * sz[1] / 2, s.z * sz[2] / 2] }; A.r = Math.hypot(...A.hx);
          for (const q of near(c.x, c.y, c.z, A.r + .05)) { if (!q.solid || !shown(q)) continue; if (v2.subVectors(q.c, c).length() > A.r + q.r + .02) continue; if (obbHit(A, q, .015)) { heldUp = true; break; } } if (heldUp) break; }
        if (!heldUp) out.float.push(info); }
      out.float.sort((a, b) => b.by - a.by); out.sink.sort((a, b) => b.by - a.by); return out; }

    /* ======================================================================================================================
       feet: everyone's soles against the floor under them
       ====================================================================================================================== */
    const LAST = new Map();
    function feetOf(f) { const ud = f.userData, tmp = [0, 0, 0]; f.updateMatrixWorld(true);
      const pos = f.getWorldPosition(new T.Vector3()), up = pos.clone().normalize(), pr = LAST.get(f), moved = pr ? pr.distanceTo(pos) : null; LAST.set(f, pos.clone());
      const seated = moved !== null && moved <= .004 && ud.legs.some(l => l.rotation.x < -.6), legs = [];   // (sitting: still, a thigh forward)
      /* each leg (a figure whose legs were merged into its body, as at the market's stalls: the whole of it, but its soft shadow) */
      const legsOn = ud.legs.filter(l => isUnder(l, f)), parts = legsOn.length ? legsOn : [f];
      /* (a walking shoe is tipped by its leg's swing, so its sole is on the floor wherever it is lowest over the floor under it:
         by its toe stepping up onto a step's nose, by its heel stepping down off one. The part of each leg looked at is the sole
         as the leg tips it, from its lowest point up the sole's length times the tip, and 1.5 cm more; a shoe flat on the floor,
         just its lowest 1.5 cm) */
      for (const l of parts) { let best = 1e9; const cand = [], kn = ud.knees && ud.knees[ud.legs.indexOf(l)], tip = l === f ? 0 : Math.abs(Math.sin(l.rotation.x + (kn ? kn.rotation.x : 0))) * .216 * l.getWorldScale(v2).y;
        l.traverse(m => { if (!m.isMesh || !visible(m) || m.layers.mask === 2) return; const P = m.geometry.attributes.position.array; for (let i = 0; i < P.length; i += 3) { v3.fromArray(P, i).applyMatrix4(m.matrixWorld); cand.push(v3.dot(up), v3.x, v3.y, v3.z); } });
        let lo = 1e9; for (let i = 0; i < cand.length; i += 4) lo = Math.min(lo, cand[i]);
        for (let i = 0; i < cand.length; i += 4) { if (cand[i] > lo + .015 + tip) continue; locOf(cand[i + 1], cand[i + 2], cand[i + 3], tmp); const fl = floorAt(tmp[0], tmp[1], tmp[2], null, [cand[i + 1], cand[i + 2], cand[i + 3]]); const c = tmp[2] - fl.h; if (c < best) best = c; }
        legs.push(best); }
      const nm = nameOf(f) || 'someone', xz = locOf(pos.x, pos.y, pos.z, tmp);
      if (legs.length < 2) legs.push(legs[0]); return { f, who: nm, x: +xz[0].toFixed(2), z: +xz[1].toFixed(2), legs: legs.map(v => +v.toFixed(3)), low: +Math.min(...legs).toFixed(3), seated, moving: moved == null ? null : moved > .004 }; }
    /* (riding: a figure in a vehicle's group, or sat on one where it is, a bike's rider pedalling; its feet are on the vehicle) */
    const riding = f => isCar(f) || cars().some(c => c.g && visible(c.g) && (p => Math.abs(p.x) < c.hw + .1 && Math.abs(p.z) < c.hl + .1 && p.y > -.2 && p.y < c.ht)(c.g.worldToLocal(f.getWorldPosition(new T.Vector3()))));
    function feet() { fresh(); const out = []; sc.traverse(f => { if (f.userData && f.userData.legs && visible(f) && !riding(f)) out.push(feetOf(f)); }); return out; }
    /* the visitor's own feet, frame by frame, until done(d) or max frames: how often the lower foot is off the floor or in it */
    function trace(max, done, body = true) { const P = d.player; let fr = 0, off = 0, worst = 0, at = null, lo = 9, hi = -9; const inn = new Set();
      for (let i = 0; i < max; i++) { if (done(d)) break; this.run(1); fresh(); const me = d.me; if (!me || !visible(me)) continue; const r = feetOf(me); if (r.seated) continue;
        fr++; if (Math.abs(r.low) > FOOT) { off++; if (Math.abs(r.low) > Math.abs(worst)) { worst = r.low; at = [r.x, r.z]; } } lo = Math.min(lo, r.low); hi = Math.max(hi, r.low);
        if (body && i % 4 === 0) for (const b of bodyClips([r])) b.in.forEach(k => inn.add(k)); }
      return { frames: fr, off, worst: +worst.toFixed(3), lo: +lo.toFixed(3), hi: +hi.toFixed(3), at, inside: [...inn].slice(0, 4), done: !!done(d) }; }

    /* ======================================================================================================================
       wheels: each axle of each vehicle on the loop, against the road
       ====================================================================================================================== */
    function wheels() { const out = [], tmp = [0, 0, 0];
      for (const c of cars()) { if (!c.g || !visible(c.g)) continue; c.g.updateMatrixWorld(true);
        for (let k = 0; k < c.axles.length; k++) { const a = c.axles[k]; if (!visible(a)) continue; const up = a.getWorldPosition(v2).normalize().clone(); let lo = 1e9; const P = a.geometry.attributes.position.array, pts = [];
          for (let i = 0; i < P.length; i += 3) { v3.fromArray(P, i).applyMatrix4(a.matrixWorld); const s = v3.dot(up); pts.push(s, v3.x, v3.y, v3.z); if (s < lo) lo = s; }
          let best = 1e9; for (let i = 0; i < pts.length; i += 4) { if (pts[i] > lo + .01) continue; locOf(pts[i + 1], pts[i + 2], pts[i + 3], tmp); const fl = floorAt(tmp[0], tmp[1], tmp[2], null, [pts[i + 1], pts[i + 2], pts[i + 3]]); best = Math.min(best, tmp[2] - fl.h); }
          out.push({ id: c.id, axle: k, v: +c.v.toFixed(2), c: +best.toFixed(3), x: +tmp[0].toFixed(1), z: +tmp[1].toFixed(1) }); } }
      return out; }

    /* ======================================================================================================================
       clipping: separate things of the town's mesh running into each other, and people inside things
       ====================================================================================================================== */
    /* what clipping leaves out, on purpose:
       - small things (under 36 cm every way: a flower and its leaves, a cup, a clamp) and wires, strings and rods hung between things (thin
         both ways across: the wires on the poles, Diarmuid's string of lights, a washing line), which are tied to what they touch;
       - coverings laid on the ground (paint, tarmac, a mat: their top within 8 cm of the ground), on which anything stands;
       - the wild: the trees, pines, bushes and rocks set about the island grow into one another as plants and rocks do */
    const minor = q => { const e = q.hx.slice().sort((a, b) => b - a); if (e[0] < .18 || e[1] < .015) return true; return q.hmax - terr(q.x, q.z) < .08; };
    /* - a plant grows round a fence's rails and posts (anything thin both ways across: under 8 cm); and the swing hangs from a
         branch grown out of its own tree */
    const thin = q => q.hx.slice().sort((a, b) => b - a)[1] < .04, LIMB = q => /(^|>)limb( |$)/.test(q.fam.label.split(' (')[0]);
    /* - and, by name: Diarmuid's string of lights, its wire tied round the lamp post by his spot */
    const TIED = [[/^buildBusker/, /(^|>)lamp /]], tied = (A, B) => TIED.some(([a, b]) => (a.test(A.fam.label) && b.test(B.fam.label)) || (a.test(B.fam.label) && b.test(A.fam.label)));
    const WILD = new Set(['tree', 'pine', 'bush', 'rock']), wild = q => q.fam.label.split(' (')[0].split('>').some(n => WILD.has(n));
    function clips() { fresh(); const pairs = new Map(), Mg = .03;
      for (const A of W.prims) { if (!A.solid || A.hmax < LOWW() || !shown(A)) continue;
        if (minor(A)) continue;
        for (const B of near(A.c.x, A.c.y, A.c.z, A.r + .05)) { if (B.i <= A.i || !B.solid || !shown(B) || minor(B)) continue; if (A.place === B.place || A.fam.key === B.fam.key || (wild(A) && (wild(B) || thin(B) || LIMB(B))) || (wild(B) && (thin(A) || LIMB(A))) || tied(A, B)) continue;
          if (v2.subVectors(B.c, A.c).length() > A.r + B.r) continue; if (!obbHit(A, B, -Mg)) continue;
          let n = 0; const pa = skin(A); for (let i = 0; i < pa.length && n < 3; i += 3) if (inside(B, pa[i], pa[i + 1], pa[i + 2], Mg)) n++;
          const pb = skin(B); for (let i = 0; i < pb.length && n < 3; i += 3) if (inside(A, pb[i], pb[i + 1], pb[i + 2], Mg)) n++;
          if (!n) continue; const k = [A.fam.label, B.fam.label].sort().join(' | '); let e = pairs.get(k); if (!e) pairs.set(k, e = { pair: k, n: 0, at: [] }); e.n++; if (e.at.length < 4) e.at.push(where(A) + ' ' + A.geo + A.col + '/' + B.geo + B.col); } }
      return [...pairs.values()].sort((a, b) => b.n - a.n); }
    function bodyClips(list) { const out = [], tmp = [0, 0, 0];   /* (sampled round a body: at the hips, the waist, the chest and the shoulders, 12 cm out) */
      const parked = cars().filter(c => c.g && visible(c.g) && Math.abs(c.v) < .05);
      for (const r of list) { if (r.seated || /MKT\.figs/.test(r.who)) continue;   /* (the market's vendors serve from inside their vans and behind their counters, on purpose) */ const f = r.f, up = f.getWorldPosition(v1).clone().normalize(), base = f.getWorldPosition(v2).clone();
        const e1 = new T.Vector3().crossVectors(up, Math.abs(up.y) < .9 ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0)).normalize(), e2 = new T.Vector3().crossVectors(up, e1);
        const hits = new Map();
        for (const hh of [.5, .8, 1.1, 1.4]) for (let k = -1; k < 8; k++) { const p = base.clone().addScaledVector(up, hh); if (k >= 0) p.addScaledVector(e1, Math.cos(k * Math.PI / 4) * .12).addScaledVector(e2, Math.sin(k * Math.PI / 4) * .12);
          for (const q of near(p.x, p.y, p.z, .3)) if (shown(q) && inside(q, p.x, p.y, p.z, .03)) hits.set(q.fam.label + ' ' + q.geo + q.col, 1);
          for (const c of parked) { const lp = c.g.worldToLocal(p.clone()); if (Math.abs(lp.x) < c.hw - .03 && Math.abs(lp.z) < c.hl - .03 && lp.y > .05 && lp.y < c.ht - .05) hits.set('the parked ' + c.id, 1); } }
        if (hits.size) out.push({ who: r.who, at: '(' + r.x + ', ' + r.z + ')', in: [...hits.keys()].slice(0, 3) }); }
      return out; }

    window.__G = { collect, statics, others, feet, feetOf, trace, wheels, clips, bodyClips, floorAt, terr, names, nameOf, famOf, get W() { return W; },
      run(n) { for (let i = 0; i < n; i++) { h.S.t += 1 / 30; st.update(1 / 30, h.S.t); } },
      put(x, z, fx, fz, pitch, zoom) { const P = d.player; P.x = x; P.z = z; P.u.copy(d.at(x, z)); const t = d.at(fx, fz); P.f.copy(t).addScaledVector(P.u, -P.u.dot(t)).normalize(); d.cam.f.copy(P.f); d.cam.pitch = pitch || d.cam.PITCH; d.cam.zoom = zoom || 1; P.tgt = null; P.path = null; P.speed = 0; P.h = d.standH(x, z); } };
  }, off);
  const G = (fn, arg) => H((h, [src, a]) => (0, eval)('(' + src + ')')(window.__G, h.ST.cr._dbg, h, a), [fn.toString(), arg]);
  const frames = (n = 3) => page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const err = await H(() => window.__G.err || null); if (err) { rec(false, 'the audit can read the town', err); console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = 1; return; }
  await H(h => h.ST.cr._dbg.skipCut()); await G(g => g.run(30)); await wait(300);
  const show = (title, list, n = 12) => { log('  ' + title + ': ' + list.length); for (const x of list.slice(0, n)) log('    ' + JSON.stringify(x)); };

  /* ---------- at four times of day: the static town, everything else, everyone's feet, the wheels, clipping ---------- */
  const TIMES = [['15:00', 'afternoon'], ['08:20', 'morning'], ['12:40', 'lunchtime'], ['21:30', 'night (the market, the pub)']];
  const all = { float: new Map(), sink: new Map(), lift: new Map(), ofloat: new Map(), osink: new Map(), clip: new Map(), stand: new Map(), walk: new Map(), seat: new Map(), wheel: new Map(), body: new Map() };
  const keep = (M, k, v, by) => { const o = M.get(k); if (!o || by > o.by) M.set(k, Object.assign({}, v, { by })); };
  for (const [time, label] of TIMES) {
    await G((g, d, h, t) => { d.sky.set({ time: t }); g.run(90); }, time);
    const info = await G(g => g.collect());
    log('\n=== ' + time + ' (' + label + '): ' + JSON.stringify(info));
    const S = await G(g => { const s = g.statics(); s.float.forEach(x => delete x.xyz); return s; });
    log('  town mesh: ' + S.grounded + ' on the ground, ' + S.held + ' held up by what they touch, ' + S.wet + ' under the sea');
    S.float.forEach(x => keep(all.float, x.what + x.at, x, x.by)); S.sink.forEach(x => keep(all.sink, x.what + x.at, x, x.by)); S.lift.forEach(x => keep(all.lift, x.what + x.part + x.at, x, x.by));
    const O = await G(g => g.others());
    log('  other things: ' + O.n + ' measured; left out on purpose: ' + JSON.stringify(O.ex));
    O.float.forEach(x => keep(all.ofloat, x.what, x, x.by)); O.sink.forEach(x => keep(all.osink, x.what, x, x.by));
    const C = await G(g => g.clips()); C.forEach(x => keep(all.clip, x.pair, x, x.n));
    /* feet and wheels over three seconds of the town going about its day */
    const FW = await G(g => { const F = [], Wh = [], B = []; for (let k = 0; k < 30; k++) { g.run(3); const f = g.feet(); F.push(f.map(r => { const o = Object.assign({}, r); delete o.f; return o; })); Wh.push(g.wheels()); if (k % 10 === 0) B.push(...g.bodyClips(f)); } return { F, Wh, B }; });
    for (const fr of FW.F) for (const r of fr) { const key = r.who;
      if (r.seated) { if (Math.abs(r.low) > FOOT) keep(all.seat, key, { who: key, at: [r.x, r.z], legs: r.legs, t: time }, Math.abs(r.low)); continue; }
      if (r.moving === null) continue; if (!r.moving) { const by = Math.max(Math.abs(r.legs[0]), Math.abs(r.legs[1])); if (by > FOOT) keep(all.stand, key, { who: key, at: [r.x, r.z], legs: r.legs, t: time }, by); }
      else { let e = all.walk.get(key); if (!e) all.walk.set(key, e = { who: key, frames: 0, off: 0, worst: 0, by: 0, t: time }); e.frames++; if (Math.abs(r.low) > FOOT) { e.off++; if (Math.abs(r.low) > Math.abs(e.worst)) { e.worst = r.low; e.at = [r.x, r.z]; } } e.by = e.off / e.frames; } }
    for (const fr of FW.Wh) for (const w of fr) { if (Math.abs(w.c) > FOOT) keep(all.wheel, w.id + ' axle ' + w.axle, Object.assign({ t: time }, w), Math.abs(w.c)); }
    for (const b of FW.B) keep(all.body, b.who + b.in.join(), b, 1);
  }

  /* ---------- the visitor's own feet: over the kerbs, along the pier's boards, and up the step (or steps) into each place
     that can be gone into, and out again: the café, the lighthouse, the chipper, the pub, the post office, the town hall,
     the school and the workshop ---------- */
  const walks = {};
  await G((g, d) => { d.sky.set({ time: '12:40' }); g.run(30); g.collect(); });
  walks.kerbs = await G((g, d) => { d.closeTalk(); g.put(-3.2, -12, -2, -5.6); g.run(2); const p = d.navPath(-3.2, -12, -2, -5.6, .3); d.player.path = p ? p.concat([[-2, -5.6]]) : [[-2, -5.6]]; d.player.stuck = 0; d.began();
    return g.trace(30 * 20, d => !d.player.path && !d.player.tgt); });
  /* (the way from the pad to the pier goes round the town grows site and passes 2.3 m from Ahroon, who greets anyone he has not
     met and so ends the walk; that is the game as meant, so he is met first. No other walk here passes within 3.8 m of him) */
  await G((g, d) => { d.MET.add(0); });
  walks.pier = await G((g, d) => { if (!d.pier || !d.pier.PR) return null; const P = d.pier.PR, T_ = d.pier.TR; T_.next = T_.clk + 600; d.pier.trPlan(); g.put(-3.2, -12, P.Hc[0], P.Hc[1]); g.run(2);
    const p = d.navPath(-3.2, -12, P.Hc[0], P.Hc[1], 1.2); d.player.path = p ? p.concat([[P.Hc[0], P.Hc[1]]]) : null; d.player.stuck = 0; d.began(); return g.trace(30 * 40, d => !d.player.path && !d.player.tgt); });
  const PLACES = [['café', 'cafe', 'C'], ['lighthouse', 'lighthouse', 'L'], ['chipper', 'chipper', 'C'], ['pub', 'pub', 'P'], ['post office', 'po', 'P'], ['town hall', 'civic.inside', 'HSI', 'hall'], ['school', 'civic.inside', 'HSI', 'school'], ['workshop', 'garage', 'G']];
  for (const [name, path, stk, id] of PLACES) for (const time of ['12:40', '21:30', '10:30']) {
    const r = await G((g, d, h, [path, stk, id, time]) => { const B = path.split('.').reduce((o, k) => o && o[k], d); if (!B || !B.go) return { none: true }; const S = () => (B[stk] || {}).st;
      d.sky.set({ time }); d.closeTalk(); if (S() !== 'out' && B.reset) B.reset(); d.place(); g.run(20); d.talk().goal = null; d.player.path = null;
      const ok = id ? B.go(id) : B.go(); if (!ok && S() !== 'go' && S() !== 'enter') return { closed: true, st: S() };
      /* (in and out through a door: its feet only; a door swings open as you come to it in its own shader, so where it is drawn is not where it was read) */
      const tin = g.trace(30 * 40, () => S() === 'in', false); if (S() !== 'in') return { closed: true, st: S(), tin };
      g.run(30); if (B.leave) B.leave(); const tout = g.trace(30 * 12, () => S() === 'out', false); return { in: tin, out: tout }; }, [path, stk, id, time]);
    if (r.none) break; if (r.closed) continue; walks[name + ' (in)'] = r.in; walks[name + ' (out)'] = r.out; break; }
  await G((g, d) => { d.sky.set({ time: '15:00' }); d.place(); g.run(10); });

  /* ---------- the report ---------- */
  const L = M => [...M.values()].sort((a, b) => b.by - a.by);
  log('\n=== FINDINGS (worst first, over all four times)');
  const fl = L(all.float), sk = L(all.sink), lf = L(all.lift), of = L(all.ofloat), os = L(all.osink), cl = L(all.clip), sd = L(all.stand), wk = L(all.walk).filter(w => w.frames >= 6), wh = L(all.wheel), bd = L(all.body), se = L(all.seat);
  show('town mesh floating (touching nothing that holds it up)', fl); show('town mesh sunk (a flat foot buried)', sk); show('town mesh lifted (a flat foot\'s edge off the ground)', lf, 20);
  show('other things floating', of); show('other things sunk', os); show('pieces running into each other', cl, 20);
  show('people standing with a sole off the floor or in it', sd, 20); show('people walking: frames with the lower foot off the floor or in it', wk.map(w => Object.assign({}, w, { by: +w.by.toFixed(2) })), 20);
  show('people sitting: lower sole off the floor or in it (in it fails; off it, feet dangling from a seat, is noted)', se); show('wheels off the road or in it', wh, 20); show('people inside something', bd, 20);
  log('  the visitor walking:');

  rec(!fl.length, 'nothing of the town\'s mesh floats', fl.length + ' floating' + (fl[0] ? ', worst ' + fl[0].what + ' ' + fl[0].at + ' by ' + fl[0].by : ''));
  rec(!sk.length, 'no flat foot of the town\'s mesh is sunk into the ground', sk.length + ' sunk' + (sk[0] ? ', worst ' + sk[0].what + ' ' + sk[0].at + ' by ' + sk[0].by : ''));
  rec(!lf.length, 'nothing flat on the ground lifts off it at an edge', lf.length + ' lifted' + (lf[0] ? ', worst ' + lf[0].what + ' ' + lf[0].at + ' by ' + lf[0].by : ''));
  rec(!of.length && !os.length, 'nothing else in the scene floats or is sunk', of.length + ' floating, ' + os.length + ' sunk' + (of[0] ? ', worst floating ' + of[0].what + ' by ' + of[0].by : '') + (os[0] ? ', worst sunk ' + os[0].what + ' by ' + os[0].by : ''));
  rec(!cl.length, 'no two separate things of the town run into each other', cl.length + ' pairs' + (cl[0] ? ', most ' + cl[0].pair + ' x' + cl[0].n : ''));
  rec(!sd.length, 'everyone standing has both soles on the floor (within 2 cm)', sd.length + ' not' + (sd[0] ? ', worst ' + sd[0].who + ' ' + JSON.stringify(sd[0].legs) : ''));
  rec(wk.length > 0 && wk.every(w => w.by <= .1), 'everyone walking has the lower foot down on the floor (within 2 cm, 90% of frames or more)', wk.length + ' walkers' + (wk[0] ? ', worst ' + wk[0].who + ' ' + (100 * wk[0].by).toFixed(0) + '% of frames off, by ' + wk[0].worst : ''));
  const ses = se.filter(r => Math.min(...r.legs) < -FOOT); rec(!ses.length, 'nobody sitting has a sole in the floor', ses.length + ' sunk' + (ses[0] ? ', worst ' + ses[0].who + ' ' + JSON.stringify(ses[0].legs) : ''));
  rec(!wh.length, 'every vehicle\'s wheels are on the road, driving and standing', wh.length + ' axles off' + (wh[0] ? ', worst ' + wh[0].id + ' ' + wh[0].c : ''));
  rec(!bd.length, 'nobody stands or walks inside a thing or a parked vehicle', bd.length + (bd[0] ? ', ' + bd[0].who + ' in ' + bd[0].in.join(', ') : ''));
  const wn = Object.entries(walks).filter(([k, w]) => w); for (const [k, w] of wn) log('    ' + k + ': ' + JSON.stringify(w));
  rec(wn.length >= 4 && wn.every(([k, w]) => w.frames > 10 && w.off / w.frames <= .1 && w.lo > -.05), 'the visitor\'s feet stay on the ground over the kerbs, along the pier and up the steps into each place (within 2 cm, 90% of frames or more)', wn.filter(([k, w]) => !(w.frames > 10 && w.off / w.frames <= .1 && w.lo > -.05)).map(([k, w]) => k + ' ' + w.off + '/' + w.frames + ' off, worst ' + w.worst).join('; ') || wn.map(([k]) => k).join(', '));
  rec(wn.every(([k, w]) => !w.inside.length), 'and the visitor never walks inside anything on the way', wn.filter(([k, w]) => w.inside.length).map(([k, w]) => k + ': ' + w.inside.join(', ')).join('; '));

  /* ---------- a look at it, from a camera held still (the town stopped a moment): the visitor mid-stride from the side, its
     feet down; the café and the house beside it; Gideon and Owen's feet at their table; the landing pad's rim ---------- */
  const look = async (name, setup, e, l) => {
    await G((g, d, h, [s, e, l]) => { const st = h.ST.cr, R = 24; (0, eval)('(' + s + ')')(g, d); d.closeTalk(); const w = ([x, z, y]) => d.at(x, z).multiplyScalar(R + y);
      g.upd = g.upd || st.update; st.update = () => { st.camP.copy(w(e)); st.camL.copy(w(l)); }; st.camP.copy(w(e)); st.camL.copy(w(l)); h.S.stSnap = true; }, [setup.toString(), e, l]);
    await frames(4); await shot(pre + name); await G((g, d, h) => { h.ST.cr.update = g.upd; }); };
  await G((g, d) => { d.people.forEach(p => { p.greeted = true; }); d.sky.set({ time: '15:00' }); g.run(10); });
  await look('gr-stride', (g, d) => { g.put(-5.2, -0.6, -5.2, 1.4); g.run(5); d.player.speed = 2.7; d.player.ph = Math.PI / 2 - .12; g.run(1); }, [-3.4, -0.5, .25], [-5.2, -0.45, .25]);
  await look('gr-cafe-house', (g, d) => { g.put(5.0, -9.6, 5.0, -12.0); g.run(5); }, [5.2, -9.4, 1.6], [5.0, -12.2, .9]);
  await look('gr-cafe-table', (g, d) => { g.put(1.5, -9.8, 1.5, -11.6); g.run(10); }, [1.4, -10.2, .6], [1.5, -11.6, .3]);
  await look('gr-pad-rim', (g, d) => { g.put(-1.0, -12.4, -3.2, -15.6); g.run(5); }, [0.1, -16.9, .3], [-1.0, -16.4, .05]);

  console.log('\nSUMMARY ' + pass + ' passed, ' + fail + ' failed' + (failed.length ? '\n  FAILED: ' + failed.join('; ') : ''));
  if (fail) process.exitCode = 1;
};

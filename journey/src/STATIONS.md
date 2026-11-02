# Writing a station

Each station (project page plus its game) lives in `src/stations/<id>/`:

| file | what it is |
| --- | --- |
| `station.html` | one `<article class="st st-<id> is-menu" data-st="<id>">` with the title card, notes, play row, in-game HUD and results panel |
| `station.css` | styles for this station only. Prefix every selector with `.st-<id>` (or use ids that start with `<id>`) |
| `station.js` | one IIFE that calls `mkStation('<id>', {...})` |
| `*.json` (optional) | precomputed data. Available at runtime as `DATA['<id>/<filename>']` |

Ids: `kr` Kríos, `ae` Aetos, `ph` Pharos, `og` Ogive, `be` Beacon in orbit; `cr` is Earth, reached by falling into the hole (not in `STA`, built separately, and it draws itself through `st.render`).

## Build and test

```bash
python3 tools/build.py --only kr --single /tmp/kr/kr.html        # just the core plus one station: fast to load
node tools/test/shot.cjs --html /tmp/kr/kr.html --station kr --out /tmp/kr/shots            # title screen
node tools/test/shot.cjs --html /tmp/kr/kr.html --station kr --out /tmp/kr/shots --mobile   # 390 x 844
node tools/test/shot.cjs --html /tmp/kr/kr.html --station kr --out /tmp/kr/shots --scenario my-scenario.cjs
```

The test browser renders WebGL on the CPU (SwiftShader), so expect 1 to 4 frames a second. Timers inside the page
run at real speed while frames are slow, so games that use `dt` see big steps (dt is capped at 0.05 s). A scenario is
a CommonJS module:

```js
module.exports = async ({ page, shot, wait, H, vp, log, mobile }) => {
  await shot('menu');
  await page.click('.st-kr [data-play]');          // real clicks: Playwright fails if anything covers the button
  await wait(4000); await shot('play');
  log(await H(h => h.ST.kr.state));                // H runs a function in the page with window.__heloria
};
```

`window.__heloria` exposes `S` (global state), `ST` (stations), `STA` (orbit data), `jump(id)`, `undock()`, `post`.

## The station object

```js
const st = mkStation('kr', { arrive: new T.Vector3(0, 2, 6) });  // arrive: camera offset that eases out as you dock in
st.scene        // THREE.Scene of this station's world (a sparse starfield is already in it)
st.camP, st.camL // set these every frame in update(): camera position and look-at target. The framework smooths them.
st.anchors      // Vector3[3]: where the three note leader lines point (world space)
st.state        // 'menu' | 'play' | 'res'
st.setState(s)  // switches the article's class to is-menu / is-play / is-res
st.result({ grade, score, stats: [[label, value], ...6 items], text, assisted })   // shows the results panel and saves the best score
```

Hooks you implement: `build()` (once at boot, may be async), `enter()` (each time you dock), `exit()` (on undock),
`update(dt, t)` (every frame while the station is on screen), `play()` (start a game), `abort()` (stop a game, used
on undock), `onPointer(e)` (pointerdown on the WebGL canvas while docked). Call `notesUpdate(st)` from `update()` while
`st.state==='menu'` to keep the leader lines attached to `st.anchors`.

Buttons with `data-play` call `st.play()`; `data-back` undocks. Enter on the title screen also starts the game.
Results panel ids the framework fills: `#<id>G` grade, `#<id>Final` score, `#<id>New`, `#<id>Stats`, `#<id>P`, `#<id>Best`.

## Globals you can use

- three.js as `T`. Camera for this station: `stCam` (36 degree fov).
- Maths: `clamp lerp sstep damp E.io E.o E.i E.o5 TAU gauss seeded(n)`. `NARROW()` true on phones and portrait.
- Quality: `Q` is 1 on desktop, 0.5 on phones. Scale particle counts by it. `RM` is prefers-reduced-motion.
- Materials: `PM({size,color,body,decl,uniforms})` additive point sprites (write GLSL in `body`: set `p`, `b` brightness, `col`, `sz`);
  `cloud(N, fill, extra)` builds point geometry; `pts(geo, mat)`; `LM(color, {emit, rim, amb, key, op})` a lit solid
  (key light at the origin unless you set `mat.uniforms.uKey`); `Burst(scene, N, color, size)` pooled particle bursts
  (`.emit(pos, n, speed, color, up, life)`, `.update(dt, gravity, drag)`); `ringGeo`, `dashMat` for dashed rings and lines.
- Colour: `blackbodyJS(kelvin)` returns a `T.Color` on the same scale the black hole disk uses.
- Feedback: `feedback(shake, chromaticAberration, tintColor)`, `S.flash` (white flash, decays), `popAt(container, v3, text, cls)`,
  `showBanner(el, heading, sub)`, `toast(text)`, `cursorAim(true)` for a crosshair cursor, `proj(v3, stCam)` to screen px.
- Input: `mouse` (`x y nx ny on`), `G.uMouse`, `keys` (Set of held `KeyboardEvent.code`).
- Sound (`A`, always on unless the visitor mutes): `chime(i) chord() buzz() pop() blip() beep(f) ping(f,g) launch() boom()
  roar(v) whoosh(up,dur,g) stinger(i) dock() key() tick() click() thrust(v) wind(v) whine(v) hiss(v)` and `A.voice(who)`,
  a formant voice with `.syl(dur, pitch, vowel)`, `.hold(level, pitch)`, `.stop()`.
- Storage: `store.get(key, default)`, `store.set(key, value)` (localStorage, safe).
- Text: `.pw` elements light up glyph by glyph when their container is revealed; `reveal(el)`, `unreveal(el)`, `prepPW(el)`.

## Design language

- Ground is near-black `#050504`. Ink `#EEE9DF`, secondary `#C8C1B3`, muted `#8A8478`, hairlines `rgba(238,233,223,.1)`.
- Every colour sits on one blackbody scale, hot to cool: Kríos 24,000 K `#A5C3FF`,
  Aetos 6,600 K `#F2EEE6`, Pharos 4,300 K `#FFD5B3`, Ogive 3,100 K `#FFB475`, Beacon 1,850 K `#FF8100`.
  Alarm red `#FF5636` only for danger. A station's accent is `var(--acc)`.
- Type: one family, Doto. Display (`.disp`, the title and big headings) keeps round dots ("ROND" 100). All other
  text uses the solid cut: square dots ("ROND" 0), weight 900 and a thin fill stroke (`-webkit-text-stroke`), set on
  `body` and inherited. Labels (`.ui`) are uppercase and small. Canvas text: weight 900 Doto with a stroke to fill.
- UI: hairline rectangles, corner ticks, no rounded cards, no drop shadows, no gradients on UI chrome. Generous dark space.
- 3D: depth from parallax, bloom and dark; light comes from a few bright things. Restraint over noise.
- Copy: short, plain, specific, sentence case for prose. Never use an em dash anywhere (text, comments, copy).

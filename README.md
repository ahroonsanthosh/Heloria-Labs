# Heloria Labs

The website of Heloria Labs, a software lab in Ireland. It is a small playable universe: you fall towards a
ray-traced black hole through a four-chapter story, escape into orbit, fly a probe around the system and dock at
six stations. Four of them are the lab's projects, each with a game built from the project's real idea:

| Station | Project | Game |
| --- | --- | --- |
| Kríos | [krios.ie](https://krios.ie), voice practice for sales teams | Read the Room: a cold call in six turns; pick the replies that win trust, then book the demo |
| Aetos | [Aetos](https://github.com/ahroonsanthosh/Aetos), counter-drone command software | Hold the Sky: read the radar, identify, intercept, never hit a friendly |
| Pharos | [pharos](https://github.com/ahroonsanthosh/pharos), GPS-free drone navigation | Lost Signal: find the drone on the map from its camera, then see the correlation surface |
| Ogive | [ogive](https://github.com/michaelsheffernan/ogive), AI tools for OpenRocket | Apogee: design the rocket, launch, open the chute at the top |

Crew and Beacon (join us, contact) complete the system. The horizon stays sealed until you have visited the four
projects; then fall into the black hole for the last page.

## Deploy on GitHub Pages

The built site is in `docs/` and needs no build step on GitHub.

1. Push this branch (or merge it into `main`).
2. In the repository on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Pick the branch and the **`/docs`** folder, then **Save**. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

All paths are relative, so it works on a project URL or a custom domain. For a custom domain such as
`helorialabs.com`, add it under **Settings → Pages → Custom domain** (GitHub then commits a `CNAME` file into `docs/`)
and point the domain's DNS at GitHub Pages.

Preview locally with any static server, for example:

```bash
python3 -m http.server --directory docs 8000
```

## Source

```
src/
  head.html, body.html     page shell: loader, story, orbit HUD, horizon page, chrome
  css/core.css             shared styles
  js/                      core: renderer and post-processing, ray-traced black hole, orbit, story, station framework, main loop
  stations/<id>/           one folder per station: station.html, station.css, station.js (+ data)
  assets/                  portraits, social image, vendored three.js r160
  STATIONS.md              how a station is written, the design language, and how to test
tools/
  build.py                 builds docs/ (GitHub Pages) and dist/heloria.html (single file)
  test/shot.cjs            headless playtest and screenshot harness
  test/buttons.cjs         clicks every button on the site and checks nothing covers it
  test/monkey.cjs          plays every game with random clicks, taps, drags and keys
  test/audit-buttons.cjs   lists controls with no click handler of their own
  test/docs-smoke.cjs      serves docs/ under a sub-path and checks it boots
archive/                   earlier prototypes
```

Rebuild after editing `src/`:

```bash
python3 tools/build.py              # writes docs/ and dist/heloria.html
python3 tools/build.py --only kr --single /tmp/kr.html   # one station, for fast iteration
```

Test (needs Node and Playwright with Chromium):

```bash
node tools/test/shot.cjs --html dist/heloria.html --out /tmp/btn --scenario tools/test/buttons.cjs
node tools/test/shot.cjs --html dist/heloria.html --out /tmp/btn --scenario tools/test/buttons.cjs --mobile
node tools/test/shot.cjs --html dist/heloria.html --out /tmp/monkey --scenario tools/test/monkey.cjs
node tools/test/docs-smoke.cjs docs
```

## Notes

- The opening screen is the mark and one line: scroll, swipe, tap or press a key to begin. Sound is part of the
  experience and has no off switch; browsers start it on the first click, tap or key press.
- Browsers without WebGL get a plain page with the projects, the crew and the contact address.
- The black hole is traced through Schwarzschild spacetime in a fragment shader, with a thin disk, Doppler beaming and
  gravitational redshift. Every colour on the site comes from one blackbody scale.
- The renderer watches its own frame times and trades resolution for smoothness on slower machines.

## Credits

three.js (MIT, vendored in `src/assets/vendor`). Doto from Google Fonts (SIL OFL), dotted for display and filled in for all other text.

# Heloria Labs

The website of Heloria Labs, a software lab in Ireland: one site with two ways in. The front door offers both.

- **Tamed** is the calm walk, for anyone who wants to see the work without playing for it. It is the front door.
- **Untamed** is the whole thing, wild and playable: a universe with a black hole in the middle and a game for every
  project. It lives at `untamed/`; its opening stays just the mark and one prompt, and Beacon (the contact station)
  links back to the calm walk.

Both are about the same four projects:

| Project | What it is | In Tamed | In Untamed |
| --- | --- | --- | --- |
| [Kríos](https://krios.ie) | Voice practice for sales teams | A microphone and a field of light that answers back | Read the Room: a cold call in six turns |
| [Aetos](https://github.com/ahroonsanthosh/Aetos) | Counter-drone command software | A skyspace full of drones, a radar, one threat and the intercept | Hold the Sky: read the radar, intercept, never hit a friendly |
| [Pharos](https://github.com/ahroonsanthosh/pharos) | GPS-free drone navigation | A drone in the dark finding itself on a map by what it sees | Lost Signal: find the drone on the map from its camera |
| [Ogive](https://github.com/michaelsheffernan/ogive) | AI tools for OpenRocket | A rocket reworked until it reaches the height asked for | Apogee: design the rocket, launch, open the chute at the top |

Ahroon Santhosh leads Aetos and Pharos, Michael Sweeney Heffernan built Kríos and leads Ogive, and Abraham Sabu
Kurian works on Kríos. Kríos is our group project: all three of us are behind it.

## Tamed

Heloria in daylight. A pavilion of pale stone stands in still water at golden hour; scroll walks you through it as the
evening goes on (the sundial in the corner reads the same sun). Through the doorway are four rooms of light, one per
project, each showing what the product does:

- **Kríos.** A microphone stands in a pool of light, turned to you. Across the floor is a field of slender stems, each
  tipped with a bead of light. What you say runs out through the field from the microphone; then the buyer, a soft
  light at the far end, answers back, and the field carries that back to you, in time with the voices you hear.
- **Aetos.** A skyspace full of drones. A radar sweeps the square of sky; friends are marked as it passes them, one is
  picked out as the threat, locked, and taken down by the intercept drawn up to it. Then the sky is quiet for a while.
- **Pharos.** A drone hovers in a dark room. Its camera lights a square of the floor, which is a map; a second square,
  where it thinks it is, slides over to match what it sees and locks on with a bell. Over open water there is nothing
  to match, and it says so: the square loosens and its circle of doubt opens up.
- **Ogive.** A hoop of light hangs in the shaft at the height asked for. The rocket on the pad changes shape one design
  at a time, and a bead of light shows how high each would go: short, over, closer, there. Then it flies to the hoop
  and no higher, and comes back down on its chute.

Each room has a calm project page. Then a courtyard where the three of us rise out of the pool as framed portraits,
and a sunset over the water to finish. Press and hold anywhere for every place. Sound is part of it, and the water is
used sparingly: close by the lake, muffled inside the rooms.

## Untamed

A small playable universe. You fall towards a ray-traced black hole through a four-chapter story, escape into orbit,
fly a probe around the system and dock at five stations: the four projects, each with a game built from the project's
real idea, and Beacon (join us, contact). The nearest station you have not played calls you with a bell you can place
by ear. The black hole is sealed until you have played one station; the first time you come back, the seal cracks.

Fall in and you come out over Earth, a small drawn town where the rocket you flew lands on a pad and you step out.
Every station you have played is built there, springing up the first time you see it. Ahroon is by Aetos, Abraham by
Kríos and Michael by Ogive, and each talks about what you have built. Click one of them (or their name tag) and you
walk over by yourself; walk up to someone you have not met and they start talking.

Once you have met all three, the camera goes over to Ahroon for a moment while he waves, and as it comes back he sets
off across town to find you: he has one more thing, the last flight. Everyone gathers at the pad, you walk up the
ramp, the hatch shuts, and the wait begins (six ticks of a clock, a heartbeat, steam, the engines spooling up). The
rocket lights, the smoke rolls across the town, and you climb through the clouds until the sky goes black. The drawn
world burns away like paper onto the traced system; you swing once round the hole, and at the bottom of the well you
hold to burn. It throws you out, and the light takes over: a white page with the three of us, and one line,
3 lads building the impossible.

## The repository

```
tools/
  build.py              builds the whole site into docs/, and both single-file builds into dist/
  site-smoke.cjs        serves docs/ under a sub-path, as GitHub Pages does, and checks both ways in
tamed/
  src/                  head.html, body.html, css/, js/ (base, sound, renderer, sky, water, outside, the gallery,
                        post, the walk, input, page, project pages, main loop), assets/og.jpg (the social image)
  build.py              the tamed build on its own: dist/tamed.html, or an artifact
  test/                 run.cjs (headless harness), flow.cjs (the whole walk), shots.cjs (stills of every place)
untamed/
  src/                  head.html, body.html, css/, js/ (core, black hole, orbit, story, the last flight, stations,
                        main loop), stations/<id>/ (one folder per station), assets/ (portraits, social image, three.js),
                        STATIONS.md (how a station is written and tested)
  build.py              the untamed build on its own: dist/untamed.html, one station, an artifact, or the journey
  test/                 shot.cjs (headless harness), buttons.cjs (every button), monkey.cjs, audit-buttons.cjs
journey/                the journey version, a separate preview with its own source tree (see journey/README.md)
archive/                earlier prototypes
docs/                   the built site that GitHub Pages serves (do not edit by hand)
```

Both sites share the portraits and three.js in `untamed/src/assets/`; the build copies them once into `docs/assets/`.

## Build

```bash
python3 tools/build.py
```

That writes the site to `docs/`:

```
docs/index.html            Tamed, the front door
docs/untamed/index.html    Untamed
docs/assets/               tamed.css, tamed.js, untamed.css, untamed.js, img/, vendor/
docs/404.html              for any address that is not there
```

and the two single-file builds, `dist/tamed.html` and `dist/untamed.html`, which the tests load. To work on one site
at a time:

```bash
python3 tamed/build.py
```

```bash
python3 untamed/build.py
```

```bash
python3 untamed/build.py --only kr --single /tmp/kr.html
```

## Test

Needs Node and Playwright with Chromium.

```bash
node tools/site-smoke.cjs docs
```

```bash
node tamed/test/run.cjs --html dist/tamed.html --lowq --scenario tamed/test/flow.cjs --out /tmp/tamed
```

```bash
node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/btn --scenario untamed/test/buttons.cjs
```

```bash
node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/btn --scenario untamed/test/buttons.cjs --mobile
```

```bash
node untamed/test/shot.cjs --html dist/untamed.html --out /tmp/monkey --scenario untamed/test/monkey.cjs
```

## Deploy on GitHub Pages

The built site is in `docs/` and needs no build step on GitHub.

1. Merge into `main`.
2. In the repository on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Pick `main` and the **`/docs`** folder, then **Save**. The site appears at `https://<user>.github.io/<repo>/`
   within a minute or two: Tamed at the address itself, Untamed at `untamed/`.

All paths are relative, so it works on a project URL or a custom domain. For a custom domain such as
`helorialabs.com`, add it under **Settings → Pages → Custom domain** (GitHub then commits a `CNAME` file into `docs/`)
and point the domain's DNS at GitHub Pages. Preview locally with any static server:

```bash
python3 -m http.server --directory docs 8000
```

## Notes

- Sound is part of both and has no off switch; browsers start it on the first click, tap or key press.
- Browsers without WebGL get a plain page with the projects, the people and the contact address.
- In Untamed the black hole is traced through Schwarzschild spacetime in a fragment shader, with a thin disk, Doppler
  beaming and gravitational redshift. Every colour comes from one blackbody scale.
- Both renderers watch their own frame times and trade resolution for smoothness on slower machines.
- No copy, comment or line of code uses an em dash; the tamed build refuses to run if one turns up.

## Credits

three.js (MIT, vendored in `untamed/src/assets/vendor`). Doto, Instrument Serif and Instrument Sans from Google Fonts
(SIL OFL).

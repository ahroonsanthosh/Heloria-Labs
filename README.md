<p align="center"><img src=".github/media/hole.jpg" alt="The black hole at the centre of Heloria, ray-traced in the browser" width="100%"></p>

<h1 align="center">Heloria</h1>

<p align="center">The website I built for Heloria Labs.</p>

<br>

Most company websites are a list of stats. I wanted ours to be somewhere you could actually go.

Heloria Labs is three of us: me, Michael Sweeney Heffernan and Abraham Sabu Kurian. We build around hard problems:
[Aetos](https://github.com/ahroonsanthosh/Aetos) (counter-drone command),
[Pharos](https://github.com/ahroonsanthosh/pharos) (drone navigation without GPS),
[Ogive](https://github.com/michaelsheffernan/ogive) (AI tools for rocket design) and
[Kríos](https://krios.ie) (voice practice for sales teams).

The site has three ways in. Point at one on the front door and you see where it goes before you choose it.

<table>
<tr>
<td width="33%"><img src=".github/media/walk.jpg" alt="Walk: the pavilion in still water at golden hour"></td>
<td width="33%"><img src=".github/media/land.jpg" alt="Land: the drawn town on Earth, just after the rocket comes down"></td>
<td width="33%"><img src=".github/media/fly.jpg" alt="Fly: the system in orbit round the black hole"></td>
</tr>
<tr>
<td valign="top"><b>Walk.</b> A pavilion in still water at golden hour, with a room of light for each project. Two minutes.</td>
<td valign="top"><b>Land.</b> Straight down to a little drawn town, where the three of us are waiting to talk. Four minutes.</td>
<td valign="top"><b>Fly.</b> The whole thing: a black hole, a game for every project, and Earth on the other side. Ten minutes.</td>
</tr>
</table>

Every way in leads to the three of us. On the walk we stand in frames on plinths in the water; on Earth each
conversation finishes with a photo and a link, and a board outside the café books a chat with us.

<table>
<tr>
<td width="50%"><img src=".github/media/team.jpg" alt="The walk: the three of us in bronze frames on stone plinths in the pool"></td>
<td width="50%"><img src=".github/media/talk.jpg" alt="Earth: the last card of my conversation, with my photo and a LinkedIn link"></td>
</tr>
</table>

## How it works

- The black hole is ray-traced through Schwarzschild spacetime in a fragment shader, with a thin disk, Doppler
  beaming and gravitational redshift. Every colour in it comes from one blackbody scale.
- Every sound is made in the browser with the Web Audio API, and not one audio file ships with the site. The long
  layers (the music, the water, the engine, each room's and station's air) are rendered once at load with an
  OfflineAudioContext into recordings that play through audio elements, so they hold up while the graphics card is
  busy. A browser pauses for a moment each time it loops a file, so two players take turns on every recording and
  overlap across the seam. Leave the page and the sound stops; come back and it picks up again.
- Earth is a small toon-shaded planet with real pathfinding: click any of us and you walk over, round the fences and
  the trees, and we pick up the conversation where you left it.
- Earth keeps your time. The sun stands where it would at your hour and on your date, so an evening visit gets a sunset
  and a late one the moon, the stars, lit windows and street lamps that come up as you pass. Now and then it rains (in
  December it snows) with a rainbow after, or sea fog rolls in with a foghorn; the trees turn in autumn and blossom in
  spring, and there are fairy lights at Christmas and pumpkins at Halloween. To see any of it now, open
  `/untamed/?time=21:30#land` (or `?date=12-24`, `?weather=fog`, together with `&`).
- Out on the cliff there is a bench: sit down and the camera settles on the view over the sea, toward the sun. A kite
  leans on it; pick it up and fly it, steering it with your hand.
- By the lighthouse you can take the light and steer it over the water. The beam lights whatever it crosses and thins
  the fog, and a drone that has lost its way locks onto it and follows it home: Pharos in small.
- At the start of the walk the stepping stones answer your hand: they tip toward it, ring the water and light up
  underneath, and the koi come over to see.
- Each project in the walk has its own room built around what it does, from a drone that finds itself on a map in the
  dark to a sales call that rises over a table as lines of light.
- No framework. Plain JavaScript and three.js, built by a short Python script into a static site of about 2 MB.

## Running it

```bash
python3 tools/build.py
```

```bash
python3 -m http.server --directory docs 8000
```

It's a static site on Cloudflare. Every push to `main` deploys `docs/` as it is; `wrangler.toml` points Cloudflare at it.

<details>
<summary>Tests</summary>
<br>

Everything is checked in a headless browser with Playwright. The black hole is software-rendered there, so the tests
are slow and best run one at a time.

```bash
node tamed/test/run.cjs --html dist/tamed.html --lowq --scenario tamed/test/flow.cjs
```

```bash
node untamed/test/shot.cjs --html dist/untamed.html --scenario untamed/test/buttons.cjs
```

```bash
node untamed/test/shot.cjs --html dist/untamed.html --station cr --settle 2500 --scenario untamed/test/earth.cjs
```

```bash
node tools/site-smoke.cjs docs
```

Add `--mobile` to any of them for a phone. `tamed/test/sound.cjs` and `untamed/test/sound.cjs` (with `--meter`)
listen to every stage and report how loud it is, and `untamed/test/leave.cjs` checks the sound stops when you leave the
page. `tamed/test/pond.cjs` checks the stepping stones and the koi at the start of the walk. Each game has its own full
check: `aetos.cjs`, `krios.cjs`, `ogive.cjs` and `pharos.cjs` in `untamed/test`.
On Earth, `sky.cjs` runs the day round, the weather and the street lamps, `lighthouse.cjs` steers the light and brings
the drone home, `cliff.cjs` sits on the bench on the cliff and flies the kite, `postcard.cjs` takes a postcard, and
`weather-sound.cjs` (with `--meter`) listens to the rain, the crickets and the foghorn; any of them takes
`--query date=12-24` and the like.
</details>

<br>

<sub>Copyright 2026 Ahroon Santhosh. All rights reserved. See [LICENSE](LICENSE).</sub>

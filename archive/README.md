# Heloria Labs: site concepts

## orbit/ (current direction)

A playable universe. Open `orbit/index.html` in a browser. Source lives in `orbit/src/` (`head.html` for markup and styles, `js/` for the modules, `img/` for the crew cutouts, `font/` for Departure Mono under the SIL OFL). Rebuild with `python3 concept/orbit/src/build.py`.

**Look.** The black hole is ray traced: light rays are bent through Schwarzschild spacetime in a shader, with a thin accretion disk, Doppler beaming and gravitational redshift, and a lensed sky behind it. Colour comes from one blackbody scale: the disk runs from white-hot to ember, and each station takes its colour from a point on the same scale (Kríos 24,000 K down to Beacon 1,850 K). Type is Doto (dot-matrix display), Departure Mono (interface) and Martian Mono (body).

**Flow.**
1. Loader: every world and shader is built behind it, so nothing hitches later. One button: enter with sound. A mute toggle stays in the corner.
2. The word *Heloria* falls into the hole and the camera arrives at the hero.
3. Four chapters, one scroll gesture each, ending on a proximity alarm. Scrolling fires the engine and throws you into orbit.
4. Orbit: fly a probe over a spacetime grid that dents under every mass. Radar, targeting labels, autopilot, a boundary. Fly close and press E to dock.
5. Docking flies the camera at the station and opens an iris into its world.

**Stations and games.**
- Kríos, *Dead Air*: a buyer speaks with a real formant voice. Wait for them to finish (a pause mid-sentence is not your turn), then hold to answer and stop inside the bracket.
- Bowshock, *Shock Line*: a finned rocket in a supersonic tunnel. Shape the nose cone so its shock grazes the fin tips. Shocks come from the Taylor-Maccoll conical-flow equation (20 degree cone at Mach 2 gives 37.8 degrees, matching NACA 1135).
- Aetos, *Hold the Sky*: three waves, three sites, identify before you intercept.
- Pharos, *Lost Signal*: GPS is jammed. The downward camera goes through rectify and describe; you do the match on a generated Irish landscape. Later rounds add a spoofed GNSS fix.
- Ogive, *Apogee*: design on an OpenRocket-style side view (drag the nose and fins, trim ballast, watch CG and CP from Barrowman), then fly to a target altitude and open the chute at the top. "Ask Ogive" searches a few thousand simulated designs.
- Crew: dot-matrix portraits that resolve into photographs as you point at them.
- Beacon: transmit a signal or copy the email.

Fly into the black hole for the easter egg.

The published artifact version also shows other visitors' probes live and stores signals. The real site would need a small backend for those two features.

## descent/ (first pass)

A scroll-driven particle morph. Superseded by orbit/.

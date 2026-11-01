# Heloria Labs: site concepts

## orbit/ (current direction)

A playable universe. Open `orbit/index.html` in a browser. Source lives in `orbit/src/` (`head.html` for markup and styles, `js/` for the modules); rebuild with `python3 concept/orbit/src/build.py`.

1. **Enter**: choose sound or silence. Every scene, shader and texture is built and compiled during this loader, so nothing hitches later.
2. **Gate**: press and hold to collapse a star. The frame warms and darkens while you hold, then snaps back as it implodes into the black hole.
3. **Story**: a short scroll sequence with kinetic type. The camera skims the disk, then pulls back to reveal the system.
4. **Orbit**: pilot a probe under inverse-square gravity over a spacetime grid that dents under every mass. It has an asteroid belt lit by the disk, a system boundary, a radar minimap, targeting labels, off-screen markers and autopilot. Fly close and press E to dock.
5. **Docking**: the camera flies at the station, then an iris opens into the station's own world. Undocking reverses it.
6. **Stations**
   - Kríos, *Clear Signal*: steer your voice across a live spectrogram, catch the words that sell, dodge the filler words. Streak multiplier, clarity meter, 60 seconds.
   - Ogive, *Apogee*: design a rocket (motor, nose length, fins, ballast) to peak at a target altitude, then deploy the chute at the top. Three flights per target. "Ask Ogive" runs a real optimiser over a few thousand simulated designs.
   - Aetos, *Hold the Sky*: three waves of drones against three sites. The radar sweep classifies contacts, interceptors are limited, the jammer drops swarms, and hitting a friendly costs you.
   - Crew: particle portraits that scatter and reassemble; hover to focus.
   - Beacon: transmit a signal (name and a link) or copy the email.
7. **Easter egg**: fly into the black hole.

The published artifact version also shows other visitors' probes live and stores signals. The real site would need a small backend for those two features.

## descent/ (first pass)

A scroll-driven particle morph. Superseded by orbit/.

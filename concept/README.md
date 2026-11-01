# Heloria Labs: site concepts

## orbit/ (current direction)

A playable universe. Open `orbit/index.html` in a browser.

1. **Enter**: choose sound or silence.
2. **Gate**: press and hold to collapse a star. It implodes into the Heloria black hole.
3. **Story**: a short scroll sequence. The camera skims the accretion disk, then pulls back to reveal five stations in orbit.
4. **Orbit**: you pilot a probe under real inverse-square gravity (WASD / arrows, drag to look, scroll to zoom; drag to fly on phones). Click any station label or use Map to autopilot. Fly close and press E to dock.
5. **Stations**
   - Kríos: take a practice sales call. A prospect pushes back three times (speech synthesis when sound is on), a live spectrogram reacts, and you answer out loud before the ring closes.
   - Ogive: hold to launch a tangent-ogive rocket. Simulated G-class flight with drag, apogee, parachute and a flight summary.
   - Aetos: a 40 second counter-drone round. Click contacts to designate and intercept them before they reach the centre.
   - Crew: the team as particle portraits that scatter around the cursor and reassemble.
   - Beacon: "Always looking for builders". Leave a signal (name + link) or copy the email.
6. **Easter egg**: fly into the black hole. Spaghettification, then a hiring message from the other side.

Telemetry shows real Schwarzschild values: r in r_s, time dilation and proper time.

The published artifact version also shows other live visitors' probes and stores signals. The real site would need a small backend (websocket presence and a form endpoint) for those two features.

## descent/ (first pass)

A scroll-driven particle morph. Superseded by orbit/.

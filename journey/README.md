# Heloria: the journey

A separate version of the site, built from its own source tree so the original in `untamed/src/` stays exactly as it is.

Instead of a set of exhibits, it is one trip. You wake in orbit with the three of us on the radio. Home is Earth, on
the far side of the black hole, and each project is what gets you past the next problem:

1. **Wake up.** Ahroon and Michael on the radio; fly through one ring to learn the controls.
2. **Pharos.** Near the asteroid belt the navigation dies. Find yourself on the map from what the camera sees.
3. **Aetos.** Contacts close in and only one of them is a threat. Aetos rates each one; hit the one that matters.
4. **Kríos.** The gate at the horizon answers back. Read the room to talk it open.
5. **The fall.** The same plunge into the black hole.
6. **Ogive.** You come out over Earth too fast; Michael talks you in and you call the landing burn.
7. **Earth.** Step out and meet the three voices in person. Meeting all three ends on "send one back".

After you land, orbit is free: every station is open as a full game. Every moment can be skipped.

Build it with the same script, pointing it at this tree:

```
python3 untamed/build.py --src journey/src --artifact out.html
python3 untamed/build.py --src journey/src --single dist/journey.html
```

What is new here: `src/js/26-journey.js` (the director, the radio, the objective marker and the three orbit
moments), the journey's markup and styles in `src/body.html` and `src/css/core.css`, and the Ogive landing burn
and closing scene in `src/stations/cr/`.

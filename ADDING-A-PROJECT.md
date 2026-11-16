# Adding a project

Every project is one entry in [`projects.json`](projects.json). Add an entry, build, and the new project is on the Walk
and in Land. Nothing else has to change.

## The short version

1. Add an entry to the `projects` list in `projects.json`. The Walk visits the projects in list order, so put the new
   one where its room should be (the end is usual):

   ```json
   {
     "id": "lumen", "name": "Lumen",
     "kind": "Satellite imagery for farmers",
     "walk": "One or two sentences for the label in its room on the Walk.",
     "card": "A shorter line for its card in Land.",
     "by": "Led by Ahroon Santhosh",
     "href": "https://github.com/ahroonsanthosh/lumen", "linkText": "github.com/ahroonsanthosh/lumen",
     "colour": "#B8E3C9", "colour2": "#3F8F63"
   }
   ```

2. Build and look at it:

   ```bash
   python3 tools/build.py
   ```

   ```bash
   python3 -m http.server --directory docs 8000
   ```

   The build checks the list first and stops with a plain message if something is wrong: a field missing, an id
   already taken, a colour that isn't `#RRGGBB`, a link that isn't `https://` or `mailto:`, or an em dash.

3. Commit and push as usual.

To try a project out without touching the real list, point the build at a copy:

```bash
HELORIA_PROJECTS=/tmp/trial.json python3 tools/build.py
```

## The fields

| Field | What it does |
| --- | --- |
| `id` | A short lower-case name: the room's address on the Walk (`#lumen`) and the project's name in the code. |
| `land` | Optional. Land's own short name for it. The four from the start use `ae`, `ph`, `og` and `kr`; a new one can leave it out and use its `id`. |
| `name` | The name as written, accents and all (`Kríos`). Signs and postcards set it in capitals for you. |
| `kind` | One short line saying what it is. It appears under the name on the Walk, on the Land card and on both plain pages. |
| `walk` | The Walk room's label: a sentence or two. |
| `card` | The line on its card in Land: shorter. |
| `by` | Who leads it, as the Walk's label says it. |
| `href`, `linkText` | Where its link goes, and how that link reads on the Walk. Land's card says "View project". |
| `colour` | Its light: the glow of its room and the tint of the walk as you arrive. Pale colours work best. |
| `colour2` | A deeper shade of it, for the rule on the Walk's label. |
| `plot` | Optional, for Land: where its building stands (see below). |

## What a new project gets

**On the Walk**

- A room of its own at its place in the line, with a plain installation: a stone plinth with a lantern over it, three
  rings of the project's light turning round a bright core, and a pool of that light on the floor. Moving your hand
  into the room wakes it: the rings speed up and brighten, and it rings a soft chord on glass. The room also has a
  quiet held chord of its own, so it is never silent.
- Its label ("05 of 05", the name, the line, who leads it, the link), its place in the press-and-hold index, and its
  name in the page's description. The menu's Projects link always goes to the first room.
- Everything after the rooms moves along by one: the far arch, the courtyard and the three of us, Team, Contact, and
  the rocket at the end. The sun keeps the same path down the sky from the first room to the last, however many rooms
  there are.

**In Land**

- A finished building in town, made from the town's own house kit and inked like the rest. Its sign over the door gives
  the name, and its windows light up at night. The first new project takes the plot where the "Coming soon" building
  site stands now, and the site moves on to the next spare plot. With no spare plot left, the site goes.
- Its card when you stop by it (name, line and link), a stamp and its name on any postcard sent from there, a place on
  the model of the town in the hall, and a line in the plain page shown when WebGL is unavailable.

There are three more spare plots after the current site, all checked to be clear of roads, paths, homes and everyone's
routes. To put a building somewhere else, give the project a `plot` in metres from the square:

```json
"plot": { "x": 12.5, "z": -8.5, "yaw": -1.04, "w": 3.2, "d": 2.4, "h": 2.4, "wall": "#dfe6ef", "roof": "#c8664b" }
```

`yaw` is the way its front faces, in radians (0 faces +z). `w`, `d` and `h` are optional, as are the colours. If the
plot isn't free (on a road, a path, the shore, someone's route or something already built), the building is left out
and the browser console says why. `st._dbg.grow.check(plot)` gives the same answer from a test.

## Making it its own

The plain room and the plain building are a starting point. When a project deserves more, these are the places to
change:

**Walk**

- A room of its own: write a builder like `buildKrios` in `tamed/src/js/30-gallery.js` (it gets the gallery, the
  room's centre and its slot, and returns `{g, update(dt, t, st), dbg}`), then add it to `BUILD` in `buildGallery`.
- Where the camera stands in it: an entry in `VIEW` in `tamed/src/js/50-path.js`. Its light level: `RL` in
  `buildGallery`.
- A sound of its own: a `loop(...)` in `tamed/src/js/05-audio.js` with its level set in `update`, the room's id added
  to `OWN_SOUND` in `00-base.js`, and its nearness passed in from `audioState` in `90-main.js`. The four rooms from the
  start show how.

**Land**

- A sculpture instead of a building: the four are made near the top of `untamed/src/stations/cr/station.js` (look for
  `mark('kr'`). A new one needs the same parts: `mark`, its sign, its obstacles, an entry in `INST`, its land name added
  to `SCULPT`, a stamp drawing in `pcGlyph`, and a small model for the hall's table.
- Things for the three of us to say about it: their lines are in `linesFor` in the same file.

## Taking one of the four away

Aetos, Pharos, Ogive and Kríos were there from the start, and each has parts made for it alone: Aetos's open
ceiling, Pharos's map floor and Ogive's shaft on the Walk, and all four sculptures in Land. The build won't let one of
them leave the list until those parts go too, because the site would break without them. Renaming one, or changing
its line, link or colour, is just an edit to its entry.

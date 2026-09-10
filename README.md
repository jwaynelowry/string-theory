# STRING THEORY

A first-person **silly string** shooter on outdoor paintball courses. Bright, goofy, summer-camp energy. No blood, no guns — just cans, physics streamers, and rivals wrapped like birthday presents.

Everyone is a bot except you. Runs entirely in the browser.

## Run

```bash
npm i
npm run dev
```

Open the URL Vite prints (default `http://127.0.0.1:5174`). Click **Shake a can**, then click the game to lock the mouse.

```bash
npm test          # unit + smoke
npm run build     # production bundle
npm run play      # preview the build
```

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| Mouse | Look (click to lock) |
| Hold LMB or F | Spray |
| Shift | Sprint |
| Ctrl / C | Crouch |
| Space | Jump |
| R | Swap cans (~1 s shake) |
| Tab | Scoreboard |
| Esc | Pause (sensitivity, FOV, volume, invert Y, quality) |
| F3 | Nav graph debug |

## Modes

- **Tangle Match** — first team to wrap the other.
- **Capture the Flag** — steal their streamer, limp home slower while you carry.
- **King of the Hill** — hold the moving party zone. String on the hill is extra bragging.
- **Glitter Bomb** — plant at a site, or spray the bomb clear.
- **Paint the Town** — most coverage on the course wins.
- **Tangled** — infection. Last clean camper wins.
- **Can Game** — every wrap upgrades your nozzle.
- **Target Range** — solo plates and combos.
- **Hot Potato** — a ticking can. Spray the holder to pass it before it pops.

## Courses

Speedball Field, Woodsball Ridge, Junkyard Fort, plus a seeded Mystery Layout. A tiny Backyard Test Lot is also in the list for debugging.

## Notes

- All art is primitives + canvas textures. All audio is WebAudio synth. No downloads.
- `window.__game` exposes `start`, `step`, `simulate`, `getState`, `forceTimer` for the smoke suite.
- Teams are **Party Pink** vs **Pool Cyan** (not red/green).

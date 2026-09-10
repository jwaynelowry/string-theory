# Progress

Overnight build of **STRING THEORY** — silly-string FPS.

## Timeline

- Scaffolded Vite + TypeScript + Three.js. Headless `Simulation` is the source of truth; Three.js is a view.
- TDD capsule physics: gravity, walls, slide, ramps, stairs, jump, dt cap, jump pads. 9 tests green.
- Silly string stream (droplets + gravity + wobble), pressure cans with 1s swap, decal pool capped at 2000, tangle freeze + respawn. 10 tests green.
- Obstacle library (inflatables, hay, pallets, tires, spools, towers/ladders, trenches, containers, trees/bushes, rocks, net wall, slide, bridge, jump pads).
- Courses: Backyard Test Lot, Speedball Field, Woodsball Ridge, Junkyard Fort, seeded Mystery Layout with flood-fill path check.
- Waypoint nav graph + A* + F3 debug draw. Bots: patrol / seek / engage / cover / retreat / celebrate, three difficulties, unstick timer, spread-out goals.
- Modes: Tangle Match, CTF, King of the Hill, Glitter Bomb, Paint the Town, Tangled (infection), Can Game, Target Range. Each has countdown, timer, scores, timeout winner.
- HUD, menus, pause settings (localStorage), minimap, kill feed, end-of-match awards, synth audio, viewmodel can, string wraps, confetti.
- Smoke: every mode × every course with 8 bots, plus a 30s tangle/test run. `window.__game` headless hooks.
- Polish: jump pads, spinning mid-field bunker, side-lane shortcuts, bot spread, hide click-hint after pointer lock.

- Hot Potato mode + can skins + landing dip + flanking. Smoke still green (31 tests).

## Next (polish loop)

- Flanking / anti-clump, landing dust, can skins, Hot Potato / Sticky Tag, merge static meshes, Playwright page boot if installable.
- Play-feel: camera, stream, and collision jank as noticed.

## Unsure

- Whether 16 bots stay at 60 fps on a mid-range laptop with shadows on; quality preset defaults to “Day camp”.

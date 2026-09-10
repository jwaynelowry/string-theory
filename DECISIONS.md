# Decisions

Ambiguous calls are recorded here instead of blocking.

## Process

- **TypeScript, not plain JS.** Keeps a large sim safer.
- **Headless `Simulation` is the source of truth.** Three.js is a view. Smoke tests drive the sim with a fixed timestep and no WebGL.
- **Custom capsule/AABB physics, no Cannon/Rapier.** Fewer deps, easier headless tests, enough for paintball bunkers and ramps.
- **Vitest unit tests + a Node smoke suite.** Playwright is optional; if it installs we also boot the page. Core assertions run against the sim.

## Feel / art

- **Teams are Party Pink vs Pool Cyan**, not red/green (colorblind-safe).
- **Tone:** 1990s summer-camp carnival, not a military sim. Inflatable candy colors, sticker HUD, no blood.
- **No external asset downloads.** Primitives, canvas textures, WebAudio synth, system fonts (Impact / Trebuchet MS).
- **String is a droplet stream** (pooled particles with gravity + wobble), not a hitscan and not a rope solver. Hits spawn decals; player hits add tangle.
- **Tangle threshold ~2–5 s of on-target spray.** 20 droplets/s × 0.036 tangle ≈ 1.4 s if every droplet connects; misses and pressure make real fights longer.
- **Three cans, R to swap (1 s).** Pressure drains while spraying and refills when idle.

## Modes / bots

- **Bots share the same sim entities as the player.** AI writes the same input struct.
- **Nav graph is waypoints generated from the course** (obstacle corners + lanes + bases). F3 draws it.
- **On timer = 0 every mode picks a winner** (score, coverage, or draw-break by team 0 then team 1) so smoke can force an ending.
- **Procedural course** mirrors obstacle placement across the midline and flood-fills a path between bases; if the path fails it punches a lane.

## Quality

- **60 fps budget on a mid-range laptop with 16 bots:** instanced decals, merged static course mesh, droplet/decal caps (900 / 2000).
- **If stuck > 30 minutes:** stub, log in `KNOWN_ISSUES.md`, move on.
- **Jump pads** are a `boost` field on box colliders (upward `vy`), not vehicles.
- **Spinning bunker** is visual-only (mesh name `spinner`); collision stays an AABB so bots do not get scooped.
- **A\* fallback** when a pair is disconnected: walk straight `start → goal` rather than freeze.

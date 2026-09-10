# Known issues

## Fixed: falling through the world / W reversing
- **Cause:** the ground collider was smaller than the grass plane, so walking onto visible grass had no floor. Once `y < -1.35` the snap logic never caught you. Under the map, WASD still followed look, which *felt* reversed.
- **Fix:** infinite y=0 floor, larger ground, map-edge clamp, camera aimed with the same look vector as movement.

# Known issues

## Bots still clump on objectives
- **Repro:** King of the Hill or CTF with 8 bots; several stack on the same waypoint.
- **Guess:** spread offset is small vs nav node spacing. Increase spread or assign lanes per id.

## Woodsball “hills” are props, not a heightfield
- **Repro:** walk Woodsball Ridge; the ground is still flat besides ramps/towers/slides.
- **Guess:** add plateau colliders / more ramps if we want real ridge terrain.

## Attract-mode sim runs behind the menu
- **Repro:** leave the badge screen up; bots play a match you cannot see except as orbiting camera over the field.
- **Guess:** either pause the sim on menu or dedicate a prettier attract course.

## No Playwright page-boot test
- **Repro:** `npm test` never launches Chrome. We curl the Vite page and dump-dom with system Chrome instead.
- **Guess:** add Playwright when `npx playwright install` is allowed (esbuild postinstall was skipped by the sandbox once).

## String stream is droplets, not a rope
- **Repro:** spray upward; segments do not stay linked.
- **Guess:** acceptable per DECISIONS.md. A verlet chain would cost more and is easy to go unstable.

## Static course meshes are not merged
- **Repro:** Speedball has many Mesh objects.
- **Guess:** bucket by color into InstancedMesh or merged BufferGeometry for 16-bot 60 fps headroom.

import { describe, expect, it } from 'vitest';
import { DECAL_CAP, PRESSURE_MAX, SWAP_TIME, TANGLE_DURATION } from '../src/constants';
import type { BoxCollider } from '../src/engine/physics';
import { createDecalPool, stampDecal } from '../src/weapons/decals';
import { fireStream, updateDroplets, type Droplet } from '../src/weapons/stream';
import { autoSwapIfEmpty, createCans, refillCans, startSwap, sprayCans, updateSwap } from '../src/weapons/cans';
import { applyTangle, updateTangle, type TangleBody } from '../src/weapons/tangle';

const WALL: BoxCollider = { minX: 4, minY: 0, minZ: -2, maxX: 5, maxY: 3, maxZ: 2 };

function droplet(over: Partial<Droplet> = {}): Droplet {
  return {
    alive: true,
    x: 0,
    y: 1,
    z: 0,
    vx: 20,
    vy: 0,
    vz: 0,
    team: 0,
    ownerId: 1,
    dist: 0,
    color: 0xff3d8a,
    ...over,
  };
}

describe('string stream', () => {
  it('applies gravity to droplets', () => {
    const d = droplet({ vx: 0 });
    updateDroplets([d], 0.1, [], [], createDecalPool(), () => {});
    expect(d.vy).toBeLessThan(0);
    expect(d.y).toBeLessThan(1);
  });

  it('stamps a decal and kills the droplet when it hits a wall', () => {
    const pool = createDecalPool();
    const d = droplet({ x: 3.9, vx: 30, y: 1.2 });
    const hits: string[] = [];
    updateDroplets([d], 0.05, [WALL], [], pool, (kind) => hits.push(kind));
    expect(d.alive).toBe(false);
    expect(pool.count).toBeGreaterThan(0);
    expect(hits).toContain('surface');
  });

  it('adds tangle when a droplet hits a rival capsule', () => {
    const target: TangleBody = {
      id: 2,
      team: 1,
      x: 2,
      y: 0,
      z: 0,
      radius: 0.4,
      height: 1.8,
      tangle: 0,
      tangled: false,
      tangledUntil: 0,
      alive: true,
    };
    const d = droplet({ x: 1.7, y: 1, vx: 20, ownerId: 1, team: 0 });
    updateDroplets([d], 0.05, [], [target], createDecalPool(), () => {});
    expect(target.tangle).toBeGreaterThan(0);
    expect(d.alive).toBe(false);
  });

  it('does not tangle teammates', () => {
    const target: TangleBody = {
      id: 2,
      team: 0,
      x: 2,
      y: 0,
      z: 0,
      radius: 0.4,
      height: 1.8,
      tangle: 0,
      tangled: false,
      tangledUntil: 0,
      alive: true,
    };
    const d = droplet({ x: 1.7, y: 1, vx: 20, team: 0 });
    updateDroplets([d], 0.05, [], [target], createDecalPool(), () => {});
    expect(target.tangle).toBe(0);
  });

  it('kills droplets that travel past range', () => {
    const d = droplet({ dist: 17.5, vx: 40 });
    updateDroplets([d], 0.1, [], [], createDecalPool(), () => {});
    expect(d.alive).toBe(false);
  });

  it('spawns a chain of droplets when firing', () => {
    const list: Droplet[] = [];
    const acc = { t: 0 };
    fireStream(list, acc, 0.2, {
      x: 0,
      y: 1.5,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      team: 0,
      ownerId: 1,
      color: 0xff3d8a,
      kind: 'standard',
    });
    expect(list.filter((d) => d.alive).length).toBeGreaterThan(2);
  });
});

describe('decal pool', () => {
  it('recycles the oldest decal instead of growing past the cap', () => {
    const pool = createDecalPool();
    for (let i = 0; i < DECAL_CAP + 25; i++) {
      stampDecal(pool, { x: i, y: 0, z: 0, nx: 0, ny: 1, nz: 0, team: 0, color: 0xff00ff, size: 0.3 });
    }
    expect(pool.count).toBeLessThanOrEqual(DECAL_CAP);
    expect(pool.items.length).toBeLessThanOrEqual(DECAL_CAP);
  });
});

describe('cans / pressure', () => {
  it('drains pressure while spraying and refills while idle', () => {
    const cans = createCans();
    expect(cans.pressure).toBe(PRESSURE_MAX);
    sprayCans(cans, 1);
    expect(cans.pressure).toBeLessThan(PRESSURE_MAX);
    const afterSpray = cans.pressure;
    refillCans(cans, 1);
    expect(cans.pressure).toBeGreaterThan(afterSpray);
  });

  it('auto-swaps to a full can when the current one runs dry', () => {
    const cans = createCans();
    cans.tanks[0] = 0;
    cans.tanks[1] = 80;
    expect(autoSwapIfEmpty(cans)).toBe(true);
    expect(cans.swapping).toBe(true);
    updateSwap(cans, SWAP_TIME);
    expect(cans.index).toBe(1);
    expect(autoSwapIfEmpty(cans)).toBe(false);
  });

  it('swap takes about a second and advances the can index', () => {
    const cans = createCans();
    startSwap(cans, 0);
    expect(cans.swapping).toBe(true);
    updateSwap(cans, SWAP_TIME * 0.4);
    expect(cans.swapping).toBe(true);
    expect(cans.index).toBe(0);
    updateSwap(cans, SWAP_TIME);
    expect(cans.swapping).toBe(false);
    expect(cans.index).toBe(1);
  });
});

describe('tangle', () => {
  it('marks a body tangled at full meter and respawns after the freeze', () => {
    const b: TangleBody = {
      id: 1,
      team: 0,
      x: 3,
      y: 0,
      z: 1,
      radius: 0.4,
      height: 1.8,
      tangle: 0.95,
      tangled: false,
      tangledUntil: 0,
      alive: true,
    };
    const r = applyTangle(b, 0.1, 10);
    expect(r.justTangled).toBe(true);
    expect(b.tangled).toBe(true);
    expect(b.tangledUntil).toBeCloseTo(10 + TANGLE_DURATION);
    updateTangle(b, 10 + TANGLE_DURATION + 0.05, () => {
      b.x = 0;
      b.z = 0;
      b.tangle = 0;
    });
    expect(b.tangled).toBe(false);
    expect(b.x).toBe(0);
    expect(b.tangle).toBe(0);
  });
});

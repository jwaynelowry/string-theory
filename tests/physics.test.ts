import { describe, expect, it } from 'vitest';
import { moveCharacter, type BoxCollider, type CharacterBody } from '../src/engine/physics';

const GROUND: BoxCollider = {
  minX: -80,
  minY: -4,
  minZ: -80,
  maxX: 80,
  maxY: 0,
  maxZ: 80,
};

function body(over: Partial<CharacterBody> = {}): CharacterBody {
  return {
    x: 0,
    y: 2,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 0.4,
    height: 1.8,
    onGround: false,
    ...over,
  };
}

function step(c: CharacterBody, n: number, colliders: BoxCollider[], wishX = 0, wishZ = 0, jump = false) {
  for (let i = 0; i < n; i++) {
    moveCharacter(c, wishX, wishZ, { dt: 1 / 60, colliders, jump });
  }
}

describe('moveCharacter', () => {
  it('applies gravity and lands on a ground box without sinking', () => {
    const c = body({ y: 3, vy: 0 });
    step(c, 90, [GROUND]);
    expect(c.y).toBeGreaterThanOrEqual(-0.001);
    expect(c.y).toBeLessThan(0.05);
    expect(c.onGround).toBe(true);
    expect(c.vy).toBeGreaterThanOrEqual(-0.05);
    expect(c.vy).toBeLessThanOrEqual(0.05);
  });

  it('does not walk through a wall', () => {
    const wall: BoxCollider = { minX: 2, minY: 0, minZ: -4, maxX: 3, maxY: 3, maxZ: 4 };
    const c = body({ y: 0, onGround: true });
    step(c, 120, [GROUND, wall], 1, 0);
    expect(c.x + c.radius).toBeLessThanOrEqual(2.05);
    expect(Number.isFinite(c.x)).toBe(true);
  });

  it('slides along a wall instead of sticking when pressing into a corner', () => {
    const wall: BoxCollider = { minX: 1.2, minY: 0, minZ: -8, maxX: 2.2, maxY: 3, maxZ: 8 };
    const c = body({ y: 0, x: 0, z: 0, onGround: true });
    step(c, 90, [GROUND, wall], 1, 1);
    expect(c.z).toBeGreaterThan(1.5);
    expect(c.x + c.radius).toBeLessThanOrEqual(1.3);
  });

  it('walks up a ramp instead of treating it as a wall', () => {
    const ramp: BoxCollider = {
      minX: 0,
      minY: 0,
      minZ: -2,
      maxX: 8,
      maxY: 3,
      maxZ: 2,
      ramp: { axis: 'x', y0: 0, y1: 2.4 },
    };
    const c = body({ y: 0, x: 0.2, onGround: true });
    step(c, 50, [GROUND, ramp], 1, 0);
    expect(c.x).toBeGreaterThan(4);
    expect(c.x).toBeLessThan(8);
    expect(c.y).toBeGreaterThan(1.0);
    expect(c.onGround).toBe(true);
  });

  it('steps up a short stair', () => {
    const stair: BoxCollider = { minX: 1, minY: 0, minZ: -1, maxX: 3, maxY: 0.32, maxZ: 1 };
    const c = body({ y: 0, x: 0, onGround: true });
    step(c, 28, [GROUND, stair], 1, 0);
    expect(c.x).toBeGreaterThan(1.4);
    expect(c.x).toBeLessThan(3);
    expect(c.y).toBeGreaterThan(0.25);
  });

  it('jumps when grounded and not when airborne', () => {
    const grounded = body({ y: 0, onGround: true });
    moveCharacter(grounded, 0, 0, { dt: 1 / 60, colliders: [GROUND], jump: true });
    expect(grounded.vy).toBeGreaterThan(8);

    const air = body({ y: 4, onGround: false, vy: -1 });
    const before = air.vy;
    moveCharacter(air, 0, 0, { dt: 1 / 60, colliders: [GROUND], jump: true });
    expect(air.vy).toBeLessThan(before + 0.1);
  });

  it('caps huge dt so a hitch does not tunnel through the floor', () => {
    const c = body({ y: 1, vy: 0 });
    moveCharacter(c, 0, 0, { dt: 2.5, colliders: [GROUND] });
    expect(c.y).toBeGreaterThanOrEqual(-0.05);
    expect(Number.isFinite(c.y)).toBe(true);
    expect(Number.isFinite(c.vy)).toBe(true);
  });

  it('launches upward from a jump pad', () => {
    const pad: BoxCollider = {
      minX: -1,
      minY: 0,
      minZ: -1,
      maxX: 1,
      maxY: 0.18,
      maxZ: 1,
      boost: 14,
    };
    const c = body({ y: 0.18, x: 0, z: 0, onGround: true });
    moveCharacter(c, 0, 0, { dt: 1 / 60, colliders: [GROUND, pad] });
    expect(c.vy).toBeGreaterThan(10);
    expect(c.onGround).toBe(false);
  });

  it('does not fall through the world after running off a finite ground collider', () => {
    const c = body({ y: 0, x: 78, onGround: true });
    step(c, 180, [GROUND], 1, 0);
    expect(c.y).toBeGreaterThanOrEqual(-0.05);
    expect(c.onGround).toBe(true);
  });

  it('does not ignore the ground when a tall box overlaps the player footprint', () => {
    const tower: BoxCollider = { minX: -2, minY: 0, minZ: -2, maxX: 2, maxY: 5.2, maxZ: 2 };
    const c = body({ x: 1.9, y: 0, z: 0, onGround: true });
    step(c, 90, [GROUND, tower]);
    expect(c.y).toBeGreaterThanOrEqual(-0.05);
    expect(c.y).toBeLessThan(0.5);
    expect(c.onGround).toBe(true);
  });

  it('never produces NaN positions', () => {
    const c = body({ vx: 1e9, vz: -1e8, vy: 50 });
    step(c, 10, [GROUND], 1, 1, true);
    expect(Number.isFinite(c.x)).toBe(true);
    expect(Number.isFinite(c.y)).toBe(true);
    expect(Number.isFinite(c.z)).toBe(true);
  });
});

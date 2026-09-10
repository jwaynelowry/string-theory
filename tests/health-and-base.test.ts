import { describe, expect, it } from 'vitest';
import { healthColor, remainingHealth } from '../src/view/health';
import { inflatableHome } from '../src/maps/obstacles';

describe('remainingHealth', () => {
  it('is full when clean and empty when tangled', () => {
    expect(remainingHealth(0, false)).toBe(1);
    expect(remainingHealth(0.4, false)).toBeCloseTo(0.6);
    expect(remainingHealth(1, true)).toBe(0);
  });

  it('shifts bar color from green to hot pink as health drops', () => {
    expect(healthColor(1)).toBe(0x7dff6b);
    expect(healthColor(0)).toBe(0xff3d8a);
  });
});

describe('inflatableHome door', () => {
  it('opens cyan (positive Z) toward midfield (-Z)', () => {
    const home = inflatableHome(0, 40, 0x14d4ff, -1);
    const back = home.colliders.find((c) => c.maxX - c.minX > 7 && c.maxZ - c.minZ < 1.2);
    expect(back).toBeTruthy();
    expect(back!.minZ).toBeGreaterThan(40);
  });

  it('opens pink (negative Z) toward midfield (+Z)', () => {
    const home = inflatableHome(0, -40, 0xff3d8a, 1);
    const back = home.colliders.find((c) => c.maxX - c.minX > 7 && c.maxZ - c.minZ < 1.2);
    expect(back).toBeTruthy();
    expect(back!.maxZ).toBeLessThan(-40);
  });
});

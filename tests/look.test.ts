import { describe, expect, it } from 'vitest';
import { lookDeltaYaw } from '../src/engine/input';
import { lookDir } from '../src/weapons/stream';

describe('trackpad / mouse look', () => {
  it('moving right increases yaw so you look right (+X when facing -Z)', () => {
    const dyaw = lookDeltaYaw(80, 0.01);
    expect(dyaw).toBeGreaterThan(0);
    const look = lookDir(dyaw, 0);
    expect(look.x).toBeGreaterThan(0);
  });
});

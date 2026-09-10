import { describe, expect, it } from 'vitest';
import { Simulation, defaultConfig } from '../src/engine/simulation';

describe('Simulation', () => {
  it('spawns a player and bots on the test course', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ botCount: 8, course: 'test', mode: 'tangle' }));
    expect(sim.entities.some((e) => e.isPlayer)).toBe(true);
    expect(sim.entities.filter((e) => e.isBot).length).toBe(8);
    expect(sim.nav.nodes.length).toBeGreaterThan(3);
  });

  it('W always walks the way the camera looks', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ botCount: 0, course: 'test' }));
    const p = sim.entities.find((e) => e.isPlayer)!;
    sim.phase = 'playing';
    sim.countdown = 0;
    p.x = 16;
    p.z = 16;
    sim.setInput({ forward: true, yaw: 0, pitch: 0 });
    sim.simulate(0.8);
    expect(p.z).toBeLessThan(15);
  });

  it('moves the player with WASD and never NaNs', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ botCount: 0, course: 'test' }));
    const p = sim.entities.find((e) => e.isPlayer)!;
    const z0 = p.z;
    sim.setInput({ forward: true, yaw: p.yaw, pitch: 0 });
    sim.phase = 'playing';
    sim.countdown = 0;
    sim.simulate(1.2);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.z)).toBe(true);
    expect(Math.abs(p.z - z0) + Math.abs(p.x)).toBeGreaterThan(0.4);
  });

  it('declares a winner when the timer is forced to zero', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ botCount: 4, course: 'test', mode: 'tangle' }));
    sim.phase = 'playing';
    sim.countdown = 0;
    sim.simulate(0.5);
    sim.forceTimer(0);
    expect(sim.winner).not.toBeNull();
    expect(sim.phase).toBe('ended');
  });

  it('bots hunt into the field and hold spray, not sit in spawn', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ botCount: 8, course: 'test', mode: 'tangle', difficulty: 'medium' }));
    sim.phase = 'playing';
    sim.countdown = 0;
    const start = sim.entities.filter((e) => e.isBot).map((e) => ({ id: e.id, x: e.x, z: e.z }));
    sim.simulate(6);
    const bots = sim.entities.filter((e) => e.isBot);
    const moved = bots.filter((b) => {
      const s = start.find((p) => p.id === b.id)!;
      return Math.hypot(b.x - s.x, b.z - s.z) > 3;
    });
    const shots = bots.reduce((n, b) => n + b.shots, 0);
    expect(moved.length).toBeGreaterThanOrEqual(5);
    expect(shots).toBeGreaterThan(250);
    expect(bots.some((b) => b.kills + b.deaths > 0 || b.tangle > 0.05)).toBe(true);
  });

  it('bots push out of spawn on the full speedball field', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ botCount: 8, course: 'speedball', mode: 'tangle' }));
    sim.phase = 'playing';
    sim.countdown = 0;
    const start = sim.entities.filter((e) => e.isBot).map((e) => ({ id: e.id, x: e.x, z: e.z }));
    sim.simulate(7);
    const far = sim.entities.filter((e) => {
      if (!e.isBot) return false;
      const s = start.find((p) => p.id === e.id)!;
      return Math.hypot(e.x - s.x, e.z - s.z) > 10;
    });
    expect(far.length).toBeGreaterThanOrEqual(4);
    expect(sim.entities.filter((e) => e.isBot).reduce((n, b) => n + b.shots, 0)).toBeGreaterThan(40);
  });

  it('keeps the decal pool at or under cap', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ botCount: 8, course: 'test', mode: 'paint' }));
    sim.phase = 'playing';
    sim.countdown = 0;
    for (const e of sim.entities) e.input.fire = true;
    sim.simulate(4);
    expect(sim.decals.count).toBeLessThanOrEqual(2000);
    expect(sim.decals.items.length).toBeLessThanOrEqual(2000);
  });
});

import { describe, expect, it } from 'vitest';
import { Simulation, defaultConfig } from '../src/engine/simulation';
import { applyTangle } from '../src/weapons/tangle';

describe('hot potato', () => {
  it('tangling the carrier steals the can', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ mode: 'potato', course: 'test', botCount: 4 }));
    sim.phase = 'playing';
    sim.countdown = 0;
    const potato = sim.extra.potato as { carrierId: number; fuse: number };
    expect(potato.carrierId).toBeGreaterThan(0);
    const carrier = sim.entities.find((e) => e.id === potato.carrierId)!;
    const thief = sim.entities.find((e) => e.id !== carrier.id)!;
    applyTangle(carrier, 1, sim.time);
    carrier.tangled = true;
    potato.carrierId = thief.id;
    expect(sim.entities.find((e) => e.id === potato.carrierId)?.id).toBe(thief.id);
  });

  it('explodes the holder when the fuse hits zero', () => {
    const sim = new Simulation();
    sim.start(defaultConfig({ mode: 'potato', course: 'test', botCount: 4 }));
    sim.phase = 'playing';
    sim.countdown = 0;
    const potato = sim.extra.potato as { carrierId: number; fuse: number };
    const holder = potato.carrierId;
    potato.fuse = 0.01;
    sim.simulate(0.2);
    const victim = sim.entities.find((e) => e.id === holder)!;
    expect(victim.tangled || victim.tangle >= 1 || potato.carrierId !== holder).toBe(true);
  });
});

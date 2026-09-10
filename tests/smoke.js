import { describe, expect, it } from 'vitest';
import { DECAL_CAP } from '../src/constants.ts';
import { Simulation, defaultConfig } from '../src/engine/simulation.ts';

const MODES = ['ctf', 'tangle', 'koth', 'bomb', 'paint', 'infection', 'cangame', 'range', 'potato'];
const COURSES = ['test', 'speedball', 'woodsball', 'junkyard', 'procedural'];

describe('smoke.js', () => {
  it('starts each mode on each course and ends with a winner', () => {
    for (const mode of MODES) {
      for (const course of COURSES) {
        const sim = new Simulation();
        sim.start(defaultConfig({ mode, course, botCount: 8, seed: 3 }));
        sim.phase = 'playing';
        sim.countdown = 0;
        sim.simulate(5);
        sim.forceTimer(0);
        const st = sim.getState();
        expect(st.winner, `${mode}/${course}`).toBeTruthy();
        expect(st.decalCount).toBeLessThanOrEqual(DECAL_CAP);
        for (const e of st.entities) {
          expect(Number.isFinite(e.x)).toBe(true);
          expect(Number.isFinite(e.y)).toBe(true);
          expect(Number.isFinite(e.z)).toBe(true);
        }
      }
    }
  }, 20000);
});

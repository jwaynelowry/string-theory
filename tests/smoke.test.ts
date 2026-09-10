import { describe, expect, it } from 'vitest';
import { DECAL_CAP, FRAME_BUDGET_MS } from '../src/constants';
import { Simulation, defaultConfig } from '../src/engine/simulation';
import type { CourseId, ModeId } from '../src/types';

const MODES: ModeId[] = ['ctf', 'tangle', 'koth', 'bomb', 'paint', 'infection', 'cangame', 'range', 'potato'];
const COURSES: CourseId[] = ['test', 'speedball', 'woodsball', 'junkyard', 'procedural'];

function runMatch(mode: ModeId, course: CourseId, seconds = 8): Simulation {
  const sim = new Simulation();
  sim.start(defaultConfig({ mode, course, botCount: 8, difficulty: 'medium', seed: 7 }));
  sim.phase = 'playing';
  sim.countdown = 0;
  sim.simulate(seconds);
  sim.forceTimer(0);
  return sim;
}

describe('smoke', () => {
  it('builds a match on every mode × course without NaNs, overflow, or a missing winner', () => {
    const failures: string[] = [];
    for (const mode of MODES) {
      for (const course of COURSES) {
        const sim = runMatch(mode, course, 6);
        const st = sim.getState();
        for (const e of st.entities) {
          if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.z)) {
            failures.push(`${mode}/${course} NaN on ${e.name}`);
          }
        }
        if (st.decalCount > DECAL_CAP) failures.push(`${mode}/${course} decals ${st.decalCount}`);
        if (st.winner == null) failures.push(`${mode}/${course} no winner`);
        if (st.maxStuck > 10.01) failures.push(`${mode}/${course} bot stuck ${st.maxStuck.toFixed(2)}s`);
        if (st.maxFrameMs > FRAME_BUDGET_MS * 4) {
          failures.push(`${mode}/${course} step ${st.maxFrameMs.toFixed(1)}ms`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  }, 20000);

  it('simulates 30s of tangle/test with 8 bots under budget', () => {
    const sim = runMatch('tangle', 'test', 30);
    const st = sim.getState();
    expect(st.winner).not.toBeNull();
    expect(st.decalCount).toBeLessThanOrEqual(DECAL_CAP);
    expect(st.entities.every((e) => Number.isFinite(e.x))).toBe(true);
    expect(st.maxFrameMs).toBeLessThan(FRAME_BUDGET_MS * 4);
  }, 15000);
});

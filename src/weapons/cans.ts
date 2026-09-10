import { CAN_COUNT, PRESSURE_DRAIN, PRESSURE_MAX, PRESSURE_REFILL, SWAP_TIME } from '../constants';
import { clamp } from '../engine/math';
import type { CanKind } from '../types';

export interface CanLoadout {
  tanks: number[];
  index: number;
  swapping: boolean;
  swapT: number;
  kind: CanKind;
  readonly pressure: number;
}

export function createCans(kind: CanKind = 'standard'): CanLoadout {
  return {
    tanks: Array.from({ length: CAN_COUNT }, () => PRESSURE_MAX),
    index: 0,
    swapping: false,
    swapT: 0,
    kind,
    get pressure() {
      return this.tanks[this.index] ?? 0;
    },
  };
}

export function sprayCans(cans: CanLoadout, dt: number): boolean {
  if (cans.swapping) return false;
  const i = cans.index;
  const tank = cans.tanks[i] ?? 0;
  if (tank <= 0) return false;
  cans.tanks[i] = Math.max(0, tank - PRESSURE_DRAIN * dt);
  return true;
}

export function refillCans(cans: CanLoadout, dt: number): void {
  if (cans.swapping) return;
  const i = cans.index;
  cans.tanks[i] = clamp((cans.tanks[i] ?? 0) + PRESSURE_REFILL * dt, 0, PRESSURE_MAX);
}

export function startSwap(cans: CanLoadout, _now: number): boolean {
  if (cans.swapping) return false;
  cans.swapping = true;
  cans.swapT = 0;
  return true;
}

/** Shake in the next can that still has pressure. */
export function autoSwapIfEmpty(cans: CanLoadout): boolean {
  if (cans.swapping) return false;
  if ((cans.tanks[cans.index] ?? 0) > 1) return false;
  const hasSpare = cans.tanks.some((t, i) => i !== cans.index && t > 1);
  if (!hasSpare) return false;
  return startSwap(cans, 0);
}

export function updateSwap(cans: CanLoadout, dt: number): void {
  if (!cans.swapping) return;
  cans.swapT += dt;
  if (cans.swapT >= SWAP_TIME - 1e-6) {
    cans.index = (cans.index + 1) % CAN_COUNT;
    cans.swapping = false;
    cans.swapT = 0;
  }
}

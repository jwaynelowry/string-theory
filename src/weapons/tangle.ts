import { TANGLE_DURATION } from '../constants';
import type { TeamId } from '../types';

export interface TangleBody {
  id: number;
  team: TeamId;
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  tangle: number;
  tangled: boolean;
  tangledUntil: number;
  alive: boolean;
}

export function applyTangle(b: TangleBody, amount: number, now: number): { justTangled: boolean } {
  if (b.tangled || !b.alive) return { justTangled: false };
  b.tangle = Math.min(1, b.tangle + amount);
  if (b.tangle >= 1) {
    b.tangled = true;
    b.tangle = 1;
    b.tangledUntil = now + TANGLE_DURATION;
    return { justTangled: true };
  }
  return { justTangled: false };
}

export function updateTangle(b: TangleBody, now: number, respawn: () => void): void {
  if (b.tangled && now >= b.tangledUntil) {
    b.tangled = false;
    b.alive = true;
    respawn();
  }
}

import { DECAL_CAP } from '../constants';
import type { TeamId } from '../types';

export interface Decal {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  color: number;
  team: TeamId;
  size: number;
  age: number;
  alive: boolean;
}

export interface DecalPool {
  items: Decal[];
  cursor: number;
  count: number;
}

export function createDecalPool(cap = DECAL_CAP): DecalPool {
  const items: Decal[] = [];
  for (let i = 0; i < cap; i++) {
    items.push({
      x: 0,
      y: 0,
      z: 0,
      nx: 0,
      ny: 1,
      nz: 0,
      color: 0,
      team: 0,
      size: 0.35,
      age: 0,
      alive: false,
    });
  }
  return { items, cursor: 0, count: 0 };
}

export function stampDecal(
  pool: DecalPool,
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  color: number,
  team: TeamId,
  size = 0.4,
): void {
  const d = pool.items[pool.cursor]!;
  const was = d.alive;
  d.x = x;
  d.y = y;
  d.z = z;
  d.nx = nx;
  d.ny = ny;
  d.nz = nz;
  d.color = color;
  d.team = team;
  d.size = size;
  d.age = 0;
  d.alive = true;
  if (!was) pool.count += 1;
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  if (pool.count > pool.items.length) pool.count = pool.items.length;
}

export function teamCoverage(pool: DecalPool): { pink: number; cyan: number } {
  let pink = 0;
  let cyan = 0;
  for (const d of pool.items) {
    if (!d.alive) continue;
    if (d.team === 0) pink += 1;
    else cyan += 1;
  }
  return { pink, cyan };
}

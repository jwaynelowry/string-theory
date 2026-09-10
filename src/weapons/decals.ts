import { DECAL_CAP } from '../constants';

export interface Decal {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  team: 0 | 1;
  color: number;
  size: number;
  alive: boolean;
  age: number;
}

export interface DecalPool {
  items: Decal[];
  count: number;
  cursor: number;
}

function blank(): Decal {
  return {
    x: 0,
    y: 0,
    z: 0,
    nx: 0,
    ny: 1,
    nz: 0,
    team: 0,
    color: 0,
    size: 0.25,
    alive: false,
    age: 0,
  };
}

export function createDecalPool(): DecalPool {
  const items: Decal[] = [];
  for (let i = 0; i < DECAL_CAP; i++) items.push(blank());
  return { items, count: 0, cursor: 0 };
}

export function stampDecal(
  pool: DecalPool,
  d: {
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
    team: 0 | 1;
    color: number;
    size: number;
  },
): Decal {
  const slot = pool.items[pool.cursor]!;
  slot.x = d.x;
  slot.y = d.y;
  slot.z = d.z;
  slot.nx = d.nx;
  slot.ny = d.ny;
  slot.nz = d.nz;
  slot.team = d.team;
  slot.color = d.color;
  slot.size = d.size;
  slot.alive = true;
  slot.age = 0;
  pool.cursor = (pool.cursor + 1) % DECAL_CAP;
  if (pool.count < DECAL_CAP) pool.count += 1;
  return slot;
}

export function teamCoverage(pool: DecalPool): { pink: number; cyan: number } {
  let pink = 0;
  let cyan = 0;
  for (let i = 0; i < pool.count; i++) {
    const d = pool.items[i]!;
    if (!d.alive) continue;
    if (d.team === 0) pink += d.size * d.size;
    else cyan += d.size * d.size;
  }
  return { pink, cyan };
}

import { COURSE_SIZE } from '../constants';
import { rand } from '../engine/math';
import {
  brick,
  cake,
  canBunker,
  container,
  dorito,
  hayStack,
  inflatableHome,
  palletWall,
  snake,
  tireStack,
  tree,
} from './obstacles';
import { groundBox, mergePieces, type Course, type Piece } from './types';

class Rng {
  constructor(private s: number) {}
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }
}

function flood(size: number, blocked: (x: number, z: number) => boolean, ax: number, az: number, bx: number, bz: number): boolean {
  const cell = 4;
  const n = Math.ceil(size / cell);
  const key = (x: number, z: number) => `${x},${z}`;
  const inb = (x: number, z: number) => Math.abs(x) < size / 2 && Math.abs(z) < size / 2;
  const start = { x: Math.round(ax / cell) * cell, z: Math.round(az / cell) * cell };
  const goal = { x: Math.round(bx / cell) * cell, z: Math.round(bz / cell) * cell };
  const seen = new Set<string>();
  const q = [start];
  seen.add(key(start.x, start.z));
  const dirs = [
    [cell, 0],
    [-cell, 0],
    [0, cell],
    [0, -cell],
  ];
  let hops = 0;
  while (q.length && hops++ < n * n) {
    const c = q.shift()!;
    if (Math.abs(c.x - goal.x) < cell * 1.1 && Math.abs(c.z - goal.z) < cell * 1.1) return true;
    for (const [dx, dz] of dirs) {
      const nx = c.x + dx;
      const nz = c.z + dz;
      const k = key(nx, nz);
      if (seen.has(k) || !inb(nx, nz) || blocked(nx, nz)) continue;
      seen.add(k);
      q.push({ x: nx, z: nz });
    }
  }
  return false;
}

export function generateProcedural(seed = 1): Course {
  const rng = new Rng((seed * 997 + 13) % 2147483647 || 1);
  const size = COURSE_SIZE;
  const half = size * 0.5 - 14;
  const pieces: Piece[] = [inflatableHome(0, -half, 0xff3d8a, 1), inflatableHome(0, half, 0x14d4ff, -1)];

  const catalog = [dorito, snake, canBunker, cake, brick, hayStack, palletWall, tireStack, container, tree];
  const placed: { x: number; z: number; r: number }[] = [];

  const tryPlace = (x: number, z: number, build: () => Piece, r = 5) => {
    for (const p of placed) {
      if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + r) ** 2) return;
    }
    if (Math.abs(z) > half - 8 && Math.abs(x) < 10) return;
    pieces.push(build());
    placed.push({ x, z, r });
    if (Math.abs(z) > 6) {
      pieces.push(build()); // mirrored counterpart added by caller
    }
  };

  for (let i = 0; i < 28; i++) {
    const x = rng.range(-size * 0.38, size * 0.38);
    const z = rng.range(8, half - 18);
    const fn = rng.pick(catalog);
    const rot = rng.next() > 0.5 ? 1 : 0;
    tryPlace(x, z, () => fn(x, z, rot), 6);
    tryPlace(x, -z, () => fn(x, -z, rot), 6);
  }

  const merged = mergePieces(pieces);
  const colliders = [groundBox(size), ...merged.colliders];

  const blocked = (x: number, z: number) => {
    for (const b of colliders) {
      if (b.soft || b.ramp || b.id === 'ground') continue;
      if (x > b.minX - 0.6 && x < b.maxX + 0.6 && z > b.minZ - 0.6 && z < b.maxZ + 0.6) return true;
    }
    return false;
  };

  if (!flood(size, blocked, 0, -half, 0, half)) {
    colliders.push({
      minX: -2.5,
      maxX: 2.5,
      minY: -1,
      maxY: 0.02,
      minZ: -half,
      maxZ: half,
      id: 'lane',
    });
    merged.meshes.push({ kind: 'box', x: 0, y: 0.03, z: 0, sx: 5, sy: 0.04, sz: size - 20, color: 0xc9e87a, name: 'lane' });
  }

  const waypoints = merged.waypoints ?? [];
  waypoints.push({ x: 0, y: 0, z: -half }, { x: 0, y: 0, z: half }, { x: 0, y: 0, z: 0 });
  for (let i = 0; i < 12; i++) {
    waypoints.push({
      x: (rand(seed + i) - 0.5) * size * 0.6,
      y: 0,
      z: (rand(seed + i * 3) - 0.5) * size * 0.6,
    });
  }

  return {
    id: 'procedural',
    name: `Mystery Layout #${seed}`,
    size,
    colliders,
    meshes: merged.meshes,
    spawns: {
      pink: [
        { x: -3, y: 0, z: -half, yaw: Math.PI },
        { x: 3, y: 0, z: -half, yaw: Math.PI },
        { x: 0, y: 0, z: -half + 3, yaw: Math.PI },
        { x: -5, y: 0, z: -half + 2, yaw: Math.PI },
        { x: 5, y: 0, z: -half + 2, yaw: Math.PI },
      ],
      cyan: [
        { x: -3, y: 0, z: half, yaw: 0 },
        { x: 3, y: 0, z: half, yaw: 0 },
        { x: 0, y: 0, z: half - 3, yaw: 0 },
        { x: -5, y: 0, z: half - 2, yaw: 0 },
        { x: 5, y: 0, z: half - 2, yaw: 0 },
      ],
    },
    bases: { pink: { x: 0, y: 0, z: -half, r: 8 }, cyan: { x: 0, y: 0, z: half, r: 8 } },
    flags: {
      pink: { x: 0, y: 1.2, z: -half, r: 1.4 },
      cyan: { x: 0, y: 1.2, z: half, r: 1.4 },
    },
    bombSites: [
      { x: -20, y: 0, z: 10, r: 4 },
      { x: 20, y: 0, z: -10, r: 4 },
    ],
    hillPath: [
      { x: 0, y: 0, z: 0, r: 7 },
      { x: 18, y: 0, z: 12, r: 7 },
      { x: -16, y: 0, z: -10, r: 7 },
    ],
    waypoints,
    seed,
  };
}

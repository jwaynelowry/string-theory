import {
  DROPLET_CAP,
  STRING_GRAVITY,
  STRING_RADIUS,
  STRING_RANGE,
  STRING_RATE,
  STRING_SPEED,
  STRING_TANGLE,
  STRING_WOBBLE,
} from '../constants';
import { clamp, finite, hypot3, rand } from '../engine/math';
import { sphereHitsBox, sphereHitsCapsule, type BoxCollider } from '../engine/physics';
import type { CanKind, TeamId } from '../types';
import { stampDecal, type DecalPool } from './decals';
import { applyTangle, type TangleBody } from './tangle';

export interface Droplet {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  team: TeamId;
  ownerId: number;
  dist: number;
  color: number;
}

export interface Muzzle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  team: TeamId;
  ownerId: number;
  color: number;
  kind: CanKind;
}

export interface KindStats {
  rate: number;
  speed: number;
  spread: number;
  range: number;
  tangle: number;
  gravity: number;
}

export const KIND_STATS: Record<CanKind, KindStats> = {
  standard: { rate: STRING_RATE, speed: STRING_SPEED, spread: 0.05, range: STRING_RANGE, tangle: STRING_TANGLE, gravity: STRING_GRAVITY },
  wide: { rate: 28, speed: 20, spread: 0.2, range: 12, tangle: 0.028, gravity: STRING_GRAVITY },
  long: { rate: 14, speed: 38, spread: 0.02, range: 28, tangle: 0.04, gravity: 8 },
  pulse: { rate: 11, speed: 30, spread: 0.07, range: 16, tangle: 0.07, gravity: 12 },
  foam: { rate: 8, speed: 14, spread: 0.12, range: 10, tangle: 0.12, gravity: 18 },
  popper: { rate: 6, speed: 16, spread: 0.24, range: 8, tangle: 0.02, gravity: 16 },
};

export const CAN_ORDER: CanKind[] = ['standard', 'wide', 'long', 'pulse', 'foam', 'popper'];

function allocDroplet(list: Droplet[]): Droplet | null {
  for (const d of list) {
    if (!d.alive) return d;
  }
  if (list.length >= DROPLET_CAP) return null;
  const d: Droplet = {
    alive: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    team: 0,
    ownerId: 0,
    dist: 0,
    color: 0,
  };
  list.push(d);
  return d;
}

export function lookDir(yaw: number, pitch: number): { x: number; y: number; z: number } {
  const cp = Math.cos(pitch);
  return {
    x: Math.sin(yaw) * cp,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cp,
  };
}

export function fireStream(list: Droplet[], acc: { t: number }, dt: number, muzzle: Muzzle): number {
  const stats = KIND_STATS[muzzle.kind] ?? KIND_STATS.standard;
  acc.t += dt;
  const interval = 1 / stats.rate;
  let spawned = 0;
  const dir = lookDir(muzzle.yaw, muzzle.pitch);
  while (acc.t >= interval) {
    acc.t -= interval;
    const d = allocDroplet(list);
    if (!d) break;
    const wob = STRING_WOBBLE * 0.04;
    const sid = muzzle.ownerId * 17 + list.length;
    d.alive = true;
    d.x = muzzle.x + dir.x * 0.35;
    d.y = muzzle.y + dir.y * 0.35;
    d.z = muzzle.z + dir.z * 0.35;
    d.vx = dir.x * stats.speed + muzzle.vx * 0.25 + (rand(sid) - 0.5) * stats.spread * stats.speed;
    d.vy = dir.y * stats.speed + muzzle.vy * 0.1 + (rand(sid + 1) - 0.5) * wob;
    d.vz = dir.z * stats.speed + muzzle.vz * 0.25 + (rand(sid + 2) - 0.5) * stats.spread * stats.speed;
    d.team = muzzle.team;
    d.ownerId = muzzle.ownerId;
    d.dist = 0;
    d.color = muzzle.color;
    spawned += 1;
  }
  return spawned;
}

export function updateDroplets(
  droplets: Droplet[],
  dt: number,
  colliders: BoxCollider[],
  targets: TangleBody[],
  pool: DecalPool,
  onHit: (kind: 'surface' | 'player') => void,
  now = 0,
): void {
  const sub = 4;
  const sdt = dt / sub;
  for (const d of droplets) {
    if (!d.alive) continue;
    for (let s = 0; s < sub; s++) {
      if (!d.alive) break;
      d.vy -= STRING_GRAVITY * sdt;
      const nx = d.x + d.vx * sdt;
      const ny = d.y + d.vy * sdt;
      const nz = d.z + d.vz * sdt;
      const step = hypot3(nx - d.x, ny - d.y, nz - d.z);
      d.dist += step;
      d.x = nx;
      d.y = ny;
      d.z = nz;
      d.vx = finite(d.vx);
      d.vy = finite(d.vy);
      d.vz = finite(d.vz);

      if (d.dist > STRING_RANGE || d.y < -1) {
        d.alive = false;
        break;
      }

      let hitBody = false;
      for (const t of targets) {
        if (!t.alive || t.tangled) continue;
        if (t.id === d.ownerId || t.team === d.team) continue;
        if (sphereHitsCapsule(d.x, d.y, d.z, STRING_RADIUS, t.x, t.y, t.z, t.radius, t.height)) {
          applyTangle(t, STRING_TANGLE, now);
          stampDecal(pool, {
            x: d.x,
            y: clamp(d.y, t.y + 0.2, t.y + t.height),
            z: d.z,
            nx: d.x - t.x,
            ny: 0.2,
            nz: d.z - t.z,
            team: d.team,
            color: d.color,
            size: 0.22,
          });
          d.alive = false;
          hitBody = true;
          onHit('player');
          break;
        }
      }
      if (hitBody) break;

      for (const box of colliders) {
        if (box.soft) continue;
        if (sphereHitsBox(d.x, d.y, d.z, STRING_RADIUS, box)) {
          stampDecal(pool, {
            x: d.x,
            y: Math.max(box.minY, Math.min(d.y, box.maxY)),
            z: d.z,
            nx: 0,
            ny: 1,
            nz: 0,
            team: d.team,
            color: d.color,
            size: 0.28 + rand(d.x * 3 + d.z) * 0.12,
          });
          d.alive = false;
          onHit('surface');
          break;
        }
      }
    }
  }
}

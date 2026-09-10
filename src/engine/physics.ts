import {
  AIR_ACCEL,
  FRICTION,
  GRAVITY,
  GROUND_ACCEL,
  JUMP_VEL,
  MAX_DT,
  STEP_HEIGHT,
  WALK_SPEED,
} from '../constants';
import { clamp, finite, hypot2, lerp } from './math';

export interface BoxCollider {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  ramp?: { axis: 'x' | 'z'; y0: number; y1: number };
  soft?: boolean;
  ladder?: boolean;
  boost?: number;
  id?: string;
}

export interface CharacterBody {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  height: number;
  onGround: boolean;
}

export interface MoveOpts {
  dt: number;
  colliders: BoxCollider[];
  gravity?: number;
  speed?: number;
  jump?: boolean;
  stepHeight?: number;
}

export function floorHeightAt(x: number, z: number, box: BoxCollider): number | null {
  if (x < box.minX - 1e-4 || x > box.maxX + 1e-4 || z < box.minZ - 1e-4 || z > box.maxZ + 1e-4) {
    return null;
  }
  if (box.ramp) {
    const t =
      box.ramp.axis === 'x'
        ? (x - box.minX) / Math.max(1e-6, box.maxX - box.minX)
        : (z - box.minZ) / Math.max(1e-6, box.maxZ - box.minZ);
    return lerp(box.ramp.y0, box.ramp.y1, clamp(t, 0, 1));
  }
  return box.maxY;
}

export function xzHitsBox(cx: number, cz: number, radius: number, box: BoxCollider): boolean {
  const closestX = clamp(cx, box.minX, box.maxX);
  const closestZ = clamp(cz, box.minZ, box.maxZ);
  const dx = cx - closestX;
  const dz = cz - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

export function resolveXZ(cx: number, cz: number, radius: number, box: BoxCollider): { x: number; z: number } {
  const closestX = clamp(cx, box.minX, box.maxX);
  const closestZ = clamp(cz, box.minZ, box.maxZ);
  const dx = cx - closestX;
  const dz = cz - closestZ;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return { x: cx, z: cz };
  if (d2 < 1e-10) {
    const left = cx - box.minX + radius;
    const right = box.maxX - cx + radius;
    const south = cz - box.minZ + radius;
    const north = box.maxZ - cz + radius;
    const m = Math.min(left, right, south, north);
    if (m === left) return { x: box.minX - radius, z: cz };
    if (m === right) return { x: box.maxX + radius, z: cz };
    if (m === south) return { x: cx, z: box.minZ - radius };
    return { x: cx, z: box.maxZ + radius };
  }
  const d = Math.sqrt(d2);
  const push = (radius - d) / d;
  return { x: cx + dx * push, z: cz + dz * push };
}

export function capsuleHitsBox(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  box: BoxCollider,
): boolean {
  const floor = floorHeightAt(clamp(x, box.minX, box.maxX), clamp(z, box.minZ, box.maxZ), box);
  const top = floor ?? box.maxY;
  if (y + height < box.minY || y > top) return false;
  return xzHitsBox(x, z, radius, box);
}

export function sphereHitsBox(x: number, y: number, z: number, radius: number, box: BoxCollider): boolean {
  const qx = clamp(x, box.minX, box.maxX);
  const qy = clamp(y, box.minY, box.maxY);
  const qz = clamp(z, box.minZ, box.maxZ);
  const dx = x - qx;
  const dy = y - qy;
  const dz = z - qz;
  return dx * dx + dy * dy + dz * dz < radius * radius;
}

export function sphereHitsCapsule(
  px: number,
  py: number,
  pz: number,
  pr: number,
  cx: number,
  cy: number,
  cz: number,
  cr: number,
  ch: number,
): boolean {
  const qy = clamp(py, cy, cy + ch);
  const dx = px - cx;
  const dy = py - qy;
  const dz = pz - cz;
  const r = pr + cr;
  return dx * dx + dy * dy + dz * dz < r * r;
}

function surfaceReachable(py: number, h: number, stepH: number): boolean {
  const stepUp = h > py && h - py <= stepH + 0.02;
  const landOrStand = h <= py + 0.15 && h >= py - 2.5;
  return stepUp || landOrStand;
}

function supportHeight(
  x: number,
  y: number,
  z: number,
  radius: number,
  colliders: BoxCollider[],
  stepH: number,
): number | null {
  let best: number | null = surfaceReachable(y, 0, stepH) ? 0 : null;
  const samples = [
    [x, z],
    [x + radius * 0.5, z],
    [x - radius * 0.5, z],
    [x, z + radius * 0.5],
    [x, z - radius * 0.5],
  ];
  for (const box of colliders) {
    if (box.soft) continue;
    for (const [sx, sz] of samples) {
      const h = floorHeightAt(sx, sz, box);
      if (h == null || !surfaceReachable(y, h, stepH)) continue;
      if (best == null || h > best) best = h;
    }
  }
  return best;
}

export function moveCharacter(
  c: CharacterBody,
  wishX: number,
  wishZ: number,
  opts: MoveOpts,
): CharacterBody {
  const dt = Math.min(Math.max(opts.dt, 0), MAX_DT);
  const gravity = opts.gravity ?? GRAVITY;
  const speed = opts.speed ?? WALK_SPEED;
  const stepH = opts.stepHeight ?? STEP_HEIGHT;
  const colliders = opts.colliders;

  let wx = 0;
  let wz = 0;
  const wlen = hypot2(wishX, wishZ);
  if (wlen > 1e-6) {
    wx = wishX / wlen;
    wz = wishZ / wlen;
  }

  if (c.onGround) {
    const sp = hypot2(c.vx, c.vz);
    if (sp > 1e-4) {
      const drop = Math.min(sp, FRICTION * dt);
      const keep = (sp - drop) / sp;
      c.vx *= keep;
      c.vz *= keep;
    } else {
      c.vx = 0;
      c.vz = 0;
    }
  }

  const accel = c.onGround ? GROUND_ACCEL : AIR_ACCEL;
  c.vx += wx * accel * dt;
  c.vz += wz * accel * dt;
  const hsp = hypot2(c.vx, c.vz);
  const limit = c.onGround ? speed : Math.max(speed * 1.05, Math.min(hsp, speed * 1.4));
  if (hsp > limit && hsp > 1e-6) {
    c.vx *= limit / hsp;
    c.vz *= limit / hsp;
  }

  if (opts.jump && c.onGround) {
    c.vy = JUMP_VEL;
    c.onGround = false;
  }

  c.vy -= gravity * dt;
  c.vy = clamp(c.vy, -42, 42);
  c.vx = clamp(finite(c.vx), -48, 48);
  c.vz = clamp(finite(c.vz), -48, 48);

  let x = c.x + c.vx * dt;
  let y = c.y + c.vy * dt;
  let z = c.z + c.vz * dt;
  let onGround = false;

  const radius = c.radius;
  const height = c.height;

  for (const box of colliders) {
    if (box.soft || box.ladder || box.ramp) continue;
    if (!xzHitsBox(x, z, radius * 0.85, box) && !xzHitsBox(c.x, c.z, radius * 0.85, box)) continue;
    if (c.vy > 0 && c.y + height <= box.minY + 0.04 && y + height > box.minY) {
      y = box.minY - height;
      c.vy = 0;
    }
  }

  const snapToSupport = (px: number, py: number, pz: number, vy: number): { y: number; onGround: boolean; vy: number } => {
    if (vy > 1.2) return { y: py, onGround: false, vy };
    const support = supportHeight(px, py, pz, radius, colliders, stepH);
    if (support == null) return { y: py, onGround: false, vy };
    if (py <= support + 0.12 && py >= support - 2.5) {
      return { y: support, onGround: true, vy: 0 };
    }
    return { y: py, onGround: false, vy };
  };

  let snapped = snapToSupport(x, y, z, c.vy);
  y = snapped.y;
  onGround = snapped.onGround;
  c.vy = snapped.vy;

  for (let pass = 0; pass < 4; pass++) {
    for (const box of colliders) {
      if (box.soft || box.ramp || box.ladder) continue;
      const floor = box.maxY;
      const feet = y;
      const head = y + height;
      if (feet >= floor - 0.05) continue;
      if (head <= box.minY + 0.02 || feet >= floor) continue;
      if (!xzHitsBox(x, z, radius, box)) continue;

      const rise = floor - feet;
      if (rise > 0.01 && rise <= stepH && (onGround || c.onGround) && c.vy <= 2) {
        y = floor;
        onGround = true;
        c.vy = 0;
        continue;
      }

      const pushed = resolveXZ(x, z, radius, box);
      if (pushed.x !== x || pushed.z !== z) {
        const pdx = pushed.x - x;
        const pdz = pushed.z - z;
        const into = c.vx * pdx + c.vz * pdz;
        if (into < 0) {
          const plen = hypot2(pdx, pdz) || 1;
          c.vx -= (pdx / plen) * into;
          c.vz -= (pdz / plen) * into;
        }
        x = pushed.x;
        z = pushed.z;
      }
    }
  }

  snapped = snapToSupport(x, y, z, c.vy);
  y = snapped.y;
  if (snapped.onGround) {
    onGround = true;
    c.vy = 0;
  } else if (c.vy <= 0) {
    const support = supportHeight(x, y, z, radius, colliders, stepH);
    if (support == null || Math.abs(y - support) > 0.2) onGround = false;
  }

  for (const box of colliders) {
    if (!box.ramp) continue;
    if (x < box.minX - radius || x > box.maxX + radius || z < box.minZ - radius || z > box.maxZ + radius) continue;
    const h = floorHeightAt(clamp(x, box.minX, box.maxX), clamp(z, box.minZ, box.maxZ), box);
    if (h == null) continue;
    if (y <= h + 0.35 && y >= h - 0.9 && c.vy <= 4) {
      y = h;
      onGround = true;
      if (c.vy < 0) c.vy = 0;
    }
  }

  if (onGround) {
    for (const box of colliders) {
      if (!box.boost) continue;
      if (!xzHitsBox(x, z, radius * 0.7, box)) continue;
      if (Math.abs(y - box.maxY) < 0.2) {
        c.vy = box.boost;
        onGround = false;
        break;
      }
    }
  }

  for (const box of colliders) {
    if (box.id !== 'ground') continue;
    const pad = radius + 0.25;
    x = clamp(x, box.minX + pad, box.maxX - pad);
    z = clamp(z, box.minZ + pad, box.maxZ - pad);
  }

  if (y < 0) {
    y = 0;
    if (c.vy < 0) c.vy = 0;
    onGround = true;
  }

  for (const box of colliders) {
    if (!box.ladder) continue;
    if (!xzHitsBox(x, z, radius, box)) continue;
    if (y + height < box.minY || y > box.maxY) continue;
    if (Math.abs(wishX) + Math.abs(wishZ) > 0.1) {
      y += 4.2 * dt;
      c.vy = 0;
      onGround = true;
    }
  }

  c.x = finite(x, c.x);
  c.y = finite(y, c.y);
  c.z = finite(z, c.z);
  c.vx = finite(c.vx);
  c.vy = finite(c.vy);
  c.vz = finite(c.vz);
  c.onGround = onGround;
  return c;
}

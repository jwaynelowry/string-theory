import { emptyPiece, type Piece } from './types';

const VINYL = [0xff6b9d, 0x3de0ff, 0xffe14a, 0xff8a3d, 0x7dff6b, 0xc77dff];
const WOOD = 0xc4a06a;
const HAY = 0xd8b14a;
const TIRE = 0x2a2a2e;
const STEEL = 0x8a93a0;
const RUST = 0xa86a3a;
const LEAF = 0x2f8f3a;
const LEAF2 = 0x4cb05a;
const BARK = 0x6a4424;
const ROCK = 0x8b8478;
const NET = 0xd9c27a;

function vinyl(i: number): number {
  return VINYL[Math.abs(i | 0) % VINYL.length]!;
}

function addBox(p: Piece, x: number, y: number, z: number, w: number, h: number, d: number, color: number, extra?: { soft?: boolean; ladder?: boolean; id?: string }): void {
  p.colliders.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y,
    maxY: y + h,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    soft: extra?.soft,
    ladder: extra?.ladder,
    id: extra?.id,
  });
  p.meshes.push({
    kind: 'box',
    x,
    y: y + h / 2,
    z,
    sx: w,
    sy: h,
    sz: d,
    color,
    soft: extra?.soft,
  });
}

function addCyl(p: Piece, x: number, y: number, z: number, r: number, h: number, color: number, extra?: { soft?: boolean }): void {
  p.colliders.push({
    minX: x - r,
    maxX: x + r,
    minY: y,
    maxY: y + h,
    minZ: z - r,
    maxZ: z + r,
    soft: extra?.soft,
  });
  p.meshes.push({ kind: 'cyl', x, y: y + h / 2, z, sx: r * 2, sy: h, sz: r * 2, color, soft: extra?.soft });
}

function cover(p: Piece, x: number, z: number, y = 0): void {
  p.waypoints!.push({ x, y, z, cover: true });
}

/** Inflatable dorito — triangular hunk of vinyl. */
export function dorito(x: number, z: number, rot = 0, color = vinyl(0)): Piece {
  const p = emptyPiece();
  const w = rot % 2 === 1 ? 2.2 : 3.4;
  const d = rot % 2 === 1 ? 3.4 : 2.2;
  addBox(p, x, 0, z, w, 1.35, d, color);
  cover(p, x + (rot % 2 === 0 ? 0 : 2.4), z + (rot % 2 === 0 ? 2.4 : 0));
  return p;
}

/** Long snake bunker. */
export function snake(x: number, z: number, rot = 0, color = vinyl(1)): Piece {
  const p = emptyPiece();
  const alongZ = rot % 2 === 0;
  const w = alongZ ? 1.6 : 8;
  const d = alongZ ? 8 : 1.6;
  addBox(p, x, 0, z, w, 1.15, d, color);
  cover(p, x + (alongZ ? 2.2 : 0), z + (alongZ ? 0 : 2.2));
  return p;
}

export function canBunker(x: number, z: number, color = vinyl(2)): Piece {
  const p = emptyPiece();
  addCyl(p, x, 0, z, 1.15, 1.5, color);
  cover(p, x + 2.1, z);
  return p;
}

export function cake(x: number, z: number, color = vinyl(3)): Piece {
  const p = emptyPiece();
  addCyl(p, x, 0, z, 1.6, 0.7, color);
  addCyl(p, x, 0.7, z, 1.15, 0.55, vinyl(4));
  cover(p, x + 2.3, z);
  return p;
}

export function brick(x: number, z: number, rot = 0, color = vinyl(5)): Piece {
  const p = emptyPiece();
  const w = rot % 2 === 0 ? 3.2 : 1.4;
  const d = rot % 2 === 0 ? 1.4 : 3.2;
  addBox(p, x, 0, z, w, 1.05, d, color);
  cover(p, x, z + (rot % 2 === 0 ? 2.1 : 0) + (rot % 2 === 1 ? 2.1 : 0));
  return p;
}

export function hayStack(x: number, z: number): Piece {
  const p = emptyPiece();
  addBox(p, x, 0, z, 1.8, 1.0, 1.2, HAY);
  addBox(p, x + 0.15, 1.0, z, 1.6, 0.9, 1.1, HAY);
  cover(p, x + 2.2, z);
  return p;
}

export function palletWall(x: number, z: number, rot = 0): Piece {
  const p = emptyPiece();
  const w = rot % 2 === 0 ? 4.2 : 0.35;
  const d = rot % 2 === 0 ? 0.35 : 4.2;
  addBox(p, x, 0, z, w, 1.7, d, WOOD);
  cover(p, x + (rot % 2 === 0 ? 0 : 1.6), z + (rot % 2 === 0 ? 1.6 : 0));
  return p;
}

export function tireStack(x: number, z: number): Piece {
  const p = emptyPiece();
  addCyl(p, x, 0, z, 0.7, 0.4, TIRE);
  addCyl(p, x, 0.4, z, 0.7, 0.4, TIRE);
  addCyl(p, x, 0.8, z, 0.7, 0.4, TIRE);
  cover(p, x + 1.6, z);
  return p;
}

export function spoolTable(x: number, z: number): Piece {
  const p = emptyPiece();
  addCyl(p, x, 0, z, 0.35, 0.9, WOOD);
  addCyl(p, x, 0.9, z, 1.1, 0.18, WOOD);
  cover(p, x + 1.8, z);
  return p;
}

export function woodenTower(x: number, z: number): Piece {
  const p = emptyPiece();
  addBox(p, x - 1.6, 0, z - 1.6, 0.35, 5.2, 0.35, WOOD);
  addBox(p, x + 1.6, 0, z - 1.6, 0.35, 5.2, 0.35, WOOD);
  addBox(p, x - 1.6, 0, z + 1.6, 0.35, 5.2, 0.35, WOOD);
  addBox(p, x + 1.6, 0, z + 1.6, 0.35, 5.2, 0.35, WOOD);
  addBox(p, x, 2.4, z, 3.6, 0.22, 3.6, WOOD);
  addBox(p, x, 4.8, z, 3.6, 0.22, 3.6, WOOD);
  addBox(p, x, 2.4, z - 1.9, 0.4, 2.4, 0.4, WOOD, { ladder: true, id: 'ladder' });
  p.meshes.push({ kind: 'box', x, y: 3.6, z: -1.9 + z, sx: 0.18, sy: 2.4, sz: 0.18, color: 0x5a3a1a, name: 'ladder' });
  p.waypoints!.push({ x, y: 2.62, z, cover: true });
  p.waypoints!.push({ x: x + 3.2, y: 0, z, cover: true });
  return p;
}

export function trench(x: number, z: number, rot = 0, len = 10): Piece {
  const p = emptyPiece();
  const alongZ = rot % 2 === 0;
  const w = alongZ ? 2.4 : len;
  const d = alongZ ? len : 2.4;
  addBox(p, x - (alongZ ? 1.4 : 0), 0, z - (alongZ ? 0 : 1.4), alongZ ? 0.5 : len, 0.85, alongZ ? len : 0.5, WOOD);
  addBox(p, x + (alongZ ? 1.4 : 0), 0, z + (alongZ ? 0 : 1.4), alongZ ? 0.5 : len, 0.85, alongZ ? len : 0.5, WOOD);
  p.meshes.push({
    kind: 'box',
    x,
    y: 0.02,
    z,
    sx: w,
    sy: 0.04,
    sz: d,
    color: 0x6b5a3a,
    name: 'trench',
  });
  p.waypoints!.push({ x, y: 0, z, cover: true });
  return p;
}

export function container(x: number, z: number, rot = 0): Piece {
  const p = emptyPiece();
  const w = rot % 2 === 0 ? 6.2 : 2.5;
  const d = rot % 2 === 0 ? 2.5 : 6.2;
  addBox(p, x, 0, z, w, 2.6, d, STEEL);
  p.meshes.push({ kind: 'box', x, y: 2.5, z, sx: w * 0.96, sy: 0.08, sz: d * 0.96, color: RUST });
  cover(p, x + (rot % 2 === 0 ? 0 : 3.4), z + (rot % 2 === 0 ? 3.4 : 0));
  return p;
}

export function tree(x: number, z: number, scale = 1): Piece {
  const p = emptyPiece();
  const h = 3.4 * scale;
  addCyl(p, x, 0, z, 0.22 * scale, h, BARK, { soft: true });
  p.meshes.push({
    kind: 'sphere',
    x,
    y: h + 0.6 * scale,
    z,
    sx: 2.4 * scale,
    sy: 2.1 * scale,
    sz: 2.4 * scale,
    color: Math.abs(x * 3 + z) % 2 > 0.5 ? LEAF : LEAF2,
    soft: true,
    name: 'canopy',
  });
  p.colliders.push({
    minX: x - 1.1 * scale,
    maxX: x + 1.1 * scale,
    minY: h * 0.5,
    maxY: h + 1.4 * scale,
    minZ: z - 1.1 * scale,
    maxZ: z + 1.1 * scale,
    soft: true,
    id: 'canopy',
  });
  p.waypoints!.push({ x: x + 2.2, y: 0, z, cover: true });
  return p;
}

export function bush(x: number, z: number): Piece {
  const p = emptyPiece();
  addCyl(p, x, 0, z, 0.85, 1.1, LEAF2, { soft: true });
  p.waypoints!.push({ x: x + 1.6, y: 0, z, cover: true });
  return p;
}

export function rock(x: number, z: number): Piece {
  const p = emptyPiece();
  addBox(p, x, 0, z, 1.8, 1.1, 1.5, ROCK);
  p.meshes.push({ kind: 'sphere', x: x + 0.3, y: 0.7, z: z - 0.2, sx: 1.3, sy: 1.0, sz: 1.2, color: 0x7a7368 });
  cover(p, x + 2, z);
  return p;
}

export function netWall(x: number, z: number, rot = 0): Piece {
  const p = emptyPiece();
  const w = rot % 2 === 0 ? 8 : 0.2;
  const d = rot % 2 === 0 ? 0.2 : 8;
  addBox(p, x, 0, z, w, 2.8, d, NET);
  cover(p, x + (rot % 2 === 0 ? 0 : 2), z + (rot % 2 === 0 ? 2 : 0));
  return p;
}

export function slide(x: number, z: number, rot = 0): Piece {
  const p = emptyPiece();
  const alongX = rot % 2 === 0;
  if (alongX) {
    p.colliders.push({
      minX: x - 4,
      maxX: x + 4,
      minY: 0,
      maxY: 3.2,
      minZ: z - 1.1,
      maxZ: z + 1.1,
      ramp: { axis: 'x', y0: 0.1, y1: 2.6 },
      id: 'slide',
    });
    p.meshes.push({ kind: 'box', x, y: 1.4, z, sx: 8, sy: 0.18, sz: 2, rotY: 0, color: vinyl(0), name: 'slide' });
  } else {
    p.colliders.push({
      minX: x - 1.1,
      maxX: x + 1.1,
      minY: 0,
      maxY: 3.2,
      minZ: z - 4,
      maxZ: z + 4,
      ramp: { axis: 'z', y0: 0.1, y1: 2.6 },
      id: 'slide',
    });
    p.meshes.push({ kind: 'box', x, y: 1.4, z, sx: 2, sy: 0.18, sz: 8, color: vinyl(1), name: 'slide' });
  }
  p.waypoints!.push({ x: x + 5, y: 0, z, cover: false });
  return p;
}

export function bridge(x: number, z: number, rot = 0): Piece {
  const p = emptyPiece();
  const w = rot % 2 === 0 ? 10 : 2.4;
  const d = rot % 2 === 0 ? 2.4 : 10;
  addBox(p, x, 1.4, z, w, 0.22, d, WOOD);
  addBox(p, x - (rot % 2 === 0 ? 4.6 : 0), 0, z - (rot % 2 === 0 ? 0 : 4.6), 0.4, 1.5, 0.4, WOOD);
  addBox(p, x + (rot % 2 === 0 ? 4.6 : 0), 0, z + (rot % 2 === 0 ? 0 : 4.6), 0.4, 1.5, 0.4, WOOD);
  p.waypoints!.push({ x, y: 1.62, z });
  return p;
}

export function jumpPad(x: number, z: number): Piece {
  const p = emptyPiece();
  p.colliders.push({
    minX: x - 0.9,
    maxX: x + 0.9,
    minY: 0,
    maxY: 0.18,
    minZ: z - 0.9,
    maxZ: z + 0.9,
    boost: 14,
    id: 'jumppad',
  });
  p.meshes.push({ kind: 'cyl', x, y: 0.1, z, sx: 1.8, sy: 0.18, sz: 1.8, color: 0xffee55, name: 'jumppad' });
  p.waypoints!.push({ x, y: 0, z });
  return p;
}

/** `openToward` +1 opens toward +Z (pink end), -1 toward -Z (cyan end / midfield from +Z). */
export function inflatableHome(x: number, z: number, color: number, openToward: 1 | -1 = 1): Piece {
  const p = emptyPiece();
  addBox(p, x - 4, 0, z, 0.6, 2.2, 8, color);
  addBox(p, x + 4, 0, z, 0.6, 2.2, 8, color);
  addBox(p, x, 0, z - 4 * openToward, 8.6, 2.2, 0.6, color);
  p.meshes.push({ kind: 'box', x, y: 2.4, z, sx: 8.6, sy: 0.15, sz: 8.6, color, name: 'base-roof' });
  p.waypoints!.push({ x, y: 0, z: z + 2 * openToward });
  return p;
}

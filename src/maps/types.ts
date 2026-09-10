import type { BoxCollider } from '../engine/physics';
import type { CourseId } from '../types';

export interface MeshSpec {
  kind: 'box' | 'cyl' | 'sphere';
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotY?: number;
  color: number;
  soft?: boolean;
  name?: string;
}

export interface Spawn {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Zone {
  x: number;
  y: number;
  z: number;
  r: number;
}

export interface Course {
  id: CourseId;
  name: string;
  size: number;
  colliders: BoxCollider[];
  meshes: MeshSpec[];
  spawns: { pink: Spawn[]; cyan: Spawn[] };
  bases: { pink: Zone; cyan: Zone };
  flags: { pink: Zone; cyan: Zone };
  bombSites: Zone[];
  hillPath: Zone[];
  waypoints: { x: number; y: number; z: number; cover?: boolean }[];
  seed?: number;
}

export interface Piece {
  colliders: BoxCollider[];
  meshes: MeshSpec[];
  waypoints?: { x: number; y: number; z: number; cover?: boolean }[];
}

export function emptyPiece(): Piece {
  return { colliders: [], meshes: [], waypoints: [] };
}

export function mergePieces(pieces: Piece[]): Piece {
  const out = emptyPiece();
  for (const p of pieces) {
    out.colliders.push(...p.colliders);
    out.meshes.push(...p.meshes);
    if (p.waypoints) out.waypoints!.push(...p.waypoints);
  }
  return out;
}

export function groundBox(size: number): BoxCollider {
  const s = size * 0.5 + 48;
  return { minX: -s, minY: -6, minZ: -s, maxX: s, maxY: 0, maxZ: s, id: 'ground' };
}

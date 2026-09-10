import { COURSE_SIZE } from '../constants';
import {
  brick,
  bridge,
  bush,
  cake,
  canBunker,
  container,
  dorito,
  hayStack,
  inflatableHome,
  jumpPad,
  netWall,
  palletWall,
  rock,
  slide,
  snake,
  spoolTable,
  tireStack,
  tree,
  trench,
  woodenTower,
} from './obstacles';
import { generateProcedural } from './procedural';
import { groundBox, mergePieces, type Course, type Piece, type Spawn, type Zone } from './types';
import type { CourseId } from '../types';

function spawnsAt(x: number, z: number, yaw: number, spread = 3.2, n = 5): Spawn[] {
  const out: Spawn[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ x: x + Math.cos(a) * spread, y: 0, z: z + Math.sin(a) * spread * 0.6, yaw });
  }
  return out;
}

function finish(id: CourseId, name: string, size: number, pieces: Piece[], extras?: Partial<Course>): Course {
  const merged = mergePieces(pieces);
  const colliders = [groundBox(size), ...merged.colliders];
  const half = size * 0.5 - 14;
  const pinkBase: Zone = extras?.bases?.pink ?? { x: 0, y: 0, z: -half, r: 8 };
  const cyanBase: Zone = extras?.bases?.cyan ?? { x: 0, y: 0, z: half, r: 8 };
  const waypoints = merged.waypoints ?? [];
  waypoints.push({ x: pinkBase.x, y: 0, z: pinkBase.z });
  waypoints.push({ x: cyanBase.x, y: 0, z: cyanBase.z });
  waypoints.push({ x: 0, y: 0, z: 0 });
  return {
    id,
    name,
    size,
    colliders,
    meshes: merged.meshes,
    spawns: extras?.spawns ?? {
      pink: spawnsAt(pinkBase.x, pinkBase.z, Math.PI),
      cyan: spawnsAt(cyanBase.x, cyanBase.z, 0),
    },
    bases: { pink: pinkBase, cyan: cyanBase },
    flags: extras?.flags ?? {
      pink: { x: pinkBase.x, y: 1.2, z: pinkBase.z, r: 1.4 },
      cyan: { x: cyanBase.x, y: 1.2, z: cyanBase.z, r: 1.4 },
    },
    bombSites: extras?.bombSites ?? [
      { x: -18, y: 0, z: 8, r: 4 },
      { x: 18, y: 0, z: -8, r: 4 },
    ],
    hillPath: extras?.hillPath ?? [
      { x: 0, y: 0, z: 0, r: 7 },
      { x: 16, y: 0, z: 10, r: 7 },
      { x: -14, y: 0, z: -8, r: 7 },
      { x: 0, y: 0, z: 18, r: 7 },
    ],
    waypoints,
    seed: extras?.seed,
  };
}

function mirrorLane(build: (zSign: 1 | -1) => Piece[]): Piece[] {
  return [...build(-1), ...build(1)];
}

export function buildTestCourse(): Course {
  const pieces: Piece[] = [
    inflatableHome(0, -22, 0xff3d8a, 1),
    inflatableHome(0, 22, 0x14d4ff, -1),
    dorito(-6, -8, 0, 0xff6b9d),
    dorito(6, 8, 0, 0x3de0ff),
    snake(0, 0, 1, 0xffe14a),
    canBunker(-10, 4, 0xff8a3d),
    cake(10, -4, 0x7dff6b),
    brick(-4, 10, 0),
    hayStack(8, 12),
    palletWall(-12, -6, 1),
    tireStack(12, 0),
    spoolTable(0, -10),
    rock(-8, -14),
    bush(5, -12),
  ];
  return finish('test', 'Backyard Test Lot', 56, pieces, {
    bases: { pink: { x: 0, y: 0, z: -22, r: 7 }, cyan: { x: 0, y: 0, z: 22, r: 7 } },
    bombSites: [
      { x: -8, y: 0, z: 2, r: 3.5 },
      { x: 8, y: 0, z: -2, r: 3.5 },
    ],
  });
}

export function buildSpeedball(): Course {
  const s = COURSE_SIZE;
  const pieces: Piece[] = [
    inflatableHome(0, -s * 0.5 + 12, 0xff3d8a, 1),
    inflatableHome(0, s * 0.5 - 12, 0x14d4ff, -1),
    ...mirrorLane((sgn) => [
      dorito(-8, sgn * 18, 0),
      dorito(8, sgn * 18, 0),
      snake(-18, sgn * 28, 0, 0x3de0ff),
      snake(18, sgn * 28, 0, 0xffe14a),
      brick(0, sgn * 32, 1, 0xff8a3d),
      canBunker(-12, sgn * 42),
      canBunker(12, sgn * 42),
      cake(-24, sgn * 20),
      cake(24, sgn * 20),
      dorito(-4, sgn * 50, 1),
      dorito(4, sgn * 50, 1),
      snake(0, sgn * 8, 1, 0xc77dff),
    ]),
    brick(-30, 0, 0),
    brick(30, 0, 0),
    (() => {
      const mid = canBunker(0, 0, 0xff6b9d);
      mid.meshes.forEach((m) => {
        m.name = 'spinner';
      });
      return mid;
    })(),
    cake(-40, 8),
    cake(40, -8),
    trench(-48, 0, 0, 40),
    trench(48, 0, 0, 40),
  ];
  return finish('speedball', 'Speedball Field', s, pieces);
}

export function buildWoodsball(): Course {
  const s = COURSE_SIZE;
  const pieces: Piece[] = [
    inflatableHome(0, -s * 0.5 + 12, 0xff3d8a, 1),
    inflatableHome(0, s * 0.5 - 12, 0x14d4ff, -1),
    woodenTower(-22, -20),
    woodenTower(22, 20),
    woodenTower(0, 0),
    trench(0, -8, 1, 28),
    trench(0, 12, 1, 22),
    bridge(0, 2, 1),
    slide(-30, 0, 0),
    slide(30, 8, 0),
    hayStack(-14, 6),
    hayStack(16, -10),
    palletWall(-8, 24, 0),
    palletWall(8, -24, 0),
    netWall(0, 36, 0),
    rock(-18, 14),
    rock(20, -16),
    rock(-6, 4),
    jumpPad(-12, 0),
    jumpPad(12, 8),
  ];
  for (let i = 0; i < 18; i++) {
    pieces.push(tree(((i * 17) % 70) - 35, ((i * 23) % 90) - 45, 0.8 + (i % 3) * 0.15));
    if (i % 2 === 0) pieces.push(bush(((i * 13) % 60) - 30, ((i * 19) % 70) - 35));
  }
  return finish('woodsball', 'Woodsball Ridge', s, pieces, {
    hillPath: [
      { x: 0, y: 0, z: 0, r: 8 },
      { x: -22, y: 0, z: -20, r: 7 },
      { x: 22, y: 0, z: 20, r: 7 },
      { x: 0, y: 0, z: 30, r: 7 },
    ],
    bombSites: [
      { x: -22, y: 0, z: -10, r: 4.5 },
      { x: 22, y: 0, z: 10, r: 4.5 },
    ],
  });
}

export function buildJunkyard(): Course {
  const s = COURSE_SIZE;
  const pieces: Piece[] = [
    inflatableHome(0, -s * 0.5 + 12, 0xff3d8a, 1),
    inflatableHome(0, s * 0.5 - 12, 0x14d4ff, -1),
    container(-10, 0, 0),
    container(10, 0, 0),
    container(-10, 8, 0),
    container(10, -8, 1),
    container(0, 16, 1),
    container(0, -16, 1),
    woodenTower(0, 0),
    tireStack(-20, 6),
    tireStack(-24, 6),
    tireStack(22, -8),
    tireStack(26, -8),
    spoolTable(-16, -12),
    spoolTable(16, 14),
    palletWall(-28, 0, 1),
    palletWall(28, 0, 1),
    netWall(0, 28, 0),
    hayStack(-6, 24),
    hayStack(8, -26),
    rock(18, 22),
    rock(-22, -18),
    slide(32, 10, 1),
    bridge(-32, 0, 1),
    jumpPad(-18, 18),
    jumpPad(18, -18),
  ];
  return finish('junkyard', 'Junkyard Fort', s, pieces, {
    bombSites: [
      { x: -10, y: 0, z: 8, r: 4 },
      { x: 10, y: 0, z: -8, r: 4 },
    ],
  });
}

export function getCourse(id: CourseId, seed = 1): Course {
  switch (id) {
    case 'speedball':
      return buildSpeedball();
    case 'woodsball':
      return buildWoodsball();
    case 'junkyard':
      return buildJunkyard();
    case 'procedural':
      return generateProcedural(seed);
    default:
      return buildTestCourse();
  }
}

export const COURSE_LIST: { id: CourseId; name: string }[] = [
  { id: 'speedball', name: 'Speedball Field' },
  { id: 'woodsball', name: 'Woodsball Ridge' },
  { id: 'junkyard', name: 'Junkyard Fort' },
  { id: 'procedural', name: 'Mystery Layout' },
  { id: 'test', name: 'Backyard Test Lot' },
];

import { PLAYER_HEIGHT, PLAYER_RADIUS, TEAM_CYAN, TEAM_PINK } from '../constants';
import type { CharacterBody } from './physics';
import type { BotState, CanKind, PlayerInput } from '../types';
import { emptyInput } from '../types';
import { createCans, type CanLoadout } from '../weapons/cans';
import type { TangleBody } from '../weapons/tangle';

export interface BotBrain {
  state: BotState;
  path: number[];
  pathI: number;
  goalX: number;
  goalZ: number;
  stuck: number;
  lastX: number;
  lastZ: number;
  targetId: number;
  repath: number;
  aimOffYaw: number;
  aimOffPitch: number;
  fireHold: number;
  unstick: number;
}

export function freshBrain(x: number, z: number): BotBrain {
  return {
    state: 'patrol',
    path: [],
    pathI: 0,
    goalX: x,
    goalZ: z,
    stuck: 0,
    lastX: x,
    lastZ: z,
    targetId: -1,
    repath: 0,
    aimOffYaw: 0,
    aimOffPitch: 0,
    fireHold: 0,
    unstick: 0,
  };
}

export interface Entity extends CharacterBody, TangleBody {
  name: string;
  isBot: boolean;
  isPlayer: boolean;
  yaw: number;
  pitch: number;
  color: number;
  spawnX: number;
  spawnY: number;
  spawnZ: number;
  spawnYaw: number;
  cans: CanLoadout;
  input: PlayerInput;
  fireAcc: { t: number };
  kind: CanKind;
  canLevel: number;
  infected: boolean;
  kills: number;
  deaths: number;
  captures: number;
  shots: number;
  hits: number;
  coverage: number;
  carrying: 0 | 1 | null;
  crouching: boolean;
  sprinting: boolean;
  brain: BotBrain;
}

export function createEntity(over: Partial<Entity> & Pick<Entity, 'id' | 'team' | 'name'>): Entity {
  const x = over.x ?? 0;
  const z = over.z ?? 0;
  const team = over.team;
  return {
    id: over.id,
    team,
    name: over.name,
    isBot: over.isBot ?? true,
    isPlayer: over.isPlayer ?? false,
    x,
    y: over.y ?? 0,
    z,
    vx: over.vx ?? 0,
    vy: over.vy ?? 0,
    vz: over.vz ?? 0,
    radius: over.radius ?? PLAYER_RADIUS,
    height: over.height ?? PLAYER_HEIGHT,
    onGround: over.onGround ?? true,
    yaw: over.yaw ?? 0,
    pitch: over.pitch ?? 0,
    color: over.color ?? (team === 0 ? TEAM_PINK : TEAM_CYAN),
    spawnX: over.spawnX ?? x,
    spawnY: over.spawnY ?? 0,
    spawnZ: over.spawnZ ?? z,
    spawnYaw: over.spawnYaw ?? over.yaw ?? 0,
    tangle: over.tangle ?? 0,
    tangled: over.tangled ?? false,
    tangledUntil: over.tangledUntil ?? 0,
    alive: over.alive ?? true,
    cans: over.cans ?? createCans(),
    input: over.input ?? emptyInput(),
    fireAcc: over.fireAcc ?? { t: 0 },
    kind: over.kind ?? 'standard',
    canLevel: over.canLevel ?? 0,
    infected: over.infected ?? false,
    kills: over.kills ?? 0,
    deaths: over.deaths ?? 0,
    captures: over.captures ?? 0,
    shots: over.shots ?? 0,
    hits: over.hits ?? 0,
    coverage: over.coverage ?? 0,
    carrying: over.carrying ?? null,
    crouching: over.crouching ?? false,
    sprinting: over.sprinting ?? false,
    brain: over.brain ?? freshBrain(x, z),
  };
}

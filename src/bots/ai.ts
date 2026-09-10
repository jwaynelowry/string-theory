import { BOT_UNSTICK, STRING_RANGE } from '../constants';
import { hypot2, hypot3, rand } from '../engine/math';
import type { Entity } from '../engine/entity';
import type { BoxCollider } from '../engine/physics';
import type { Course } from '../maps/types';
import type { Difficulty, ModeId } from '../types';
import { astar, lineBlocked, nearestNode, type NavGraph } from './nav';

export interface BotWorld {
  time: number;
  entities: Entity[];
  course: Course;
  nav: NavGraph;
  mode: ModeId;
  extra: Record<string, unknown>;
  difficulty: Difficulty;
  colliders: BoxCollider[];
}

const DIFF = {
  easy: { err: 0.28, duty: 0.55, lead: 0.05, vision: 36, burst: 0.45 },
  medium: { err: 0.1, duty: 0.88, lead: 0.18, vision: 52, burst: 0.7 },
  hard: { err: 0.04, duty: 0.96, lead: 0.32, vision: 64, burst: 0.95 },
};

function lookToward(e: Entity, x: number, y: number, z: number, errY: number, errP: number): void {
  const dx = x - e.x;
  const dy = y - (e.y + e.height * 0.7);
  const dz = z - e.z;
  e.yaw = Math.atan2(dx, -dz) + errY;
  const dist = Math.max(0.01, hypot3(dx, dy, dz));
  e.pitch = Math.atan2(dy, dist) + errP;
  e.pitch = Math.max(-1.2, Math.min(1.2, e.pitch));
  e.input.yaw = e.yaw;
  e.input.pitch = e.pitch;
}

function setGoal(e: Entity, world: BotWorld, x: number, z: number, force = false): void {
  const br = e.brain;
  if (!force && hypot2(br.goalX - x, br.goalZ - z) < 2 && br.path.length) return;
  br.goalX = x;
  br.goalZ = z;
  const a = nearestNode(world.nav, e.x, e.z);
  const b = nearestNode(world.nav, x, z);
  br.path = astar(world.nav, a, b);
  br.pathI = 0;
}

function nearestRival(e: Entity, world: BotWorld): Entity | null {
  let best: Entity | null = null;
  let bd = Infinity;
  for (const o of world.entities) {
    if (o.id === e.id || o.tangled || !o.alive) continue;
    if (world.mode === 'infection') {
      if (e.infected === o.infected) continue;
    } else if (o.team === e.team) continue;
    const d = hypot2(o.x - e.x, o.z - e.z);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function hasLos(e: Entity, o: Entity, world: BotWorld): boolean {
  return !lineBlocked(e.x, e.z, o.x, o.z, world.colliders);
}

function modeGoal(e: Entity, world: BotWorld): { x: number; z: number } {
  const extra = world.extra;
  const course = world.course;
  const home = e.team === 0 ? course.bases.pink : course.bases.cyan;
  const enemyBase = e.team === 0 ? course.bases.cyan : course.bases.pink;
  const hunt = nearestRival(e, world);
  const mid = { x: (home.x + enemyBase.x) * 0.5, z: (home.z + enemyBase.z) * 0.5 };
  switch (world.mode) {
    case 'ctf': {
      const myFlag = e.team === 0 ? extra.flagPink : extra.flagCyan;
      const theirFlag = e.team === 0 ? extra.flagCyan : extra.flagPink;
      const tf = theirFlag as { x: number; z: number; carrierId: number | null } | undefined;
      const mf = myFlag as { x: number; z: number; carrierId: number | null; home: boolean } | undefined;
      if (e.carrying != null) return { x: home.x, z: home.z };
      if (mf && !mf.home && (mf.carrierId == null || mf.carrierId < 0)) return { x: mf.x, z: mf.z };
      if (tf && tf.carrierId == null) return { x: tf.x, z: tf.z };
      return { x: enemyBase.x, z: enemyBase.z };
    }
    case 'koth': {
      const hill = extra.hill as { x: number; z: number } | undefined;
      return hill ?? mid;
    }
    case 'bomb': {
      const bomb = extra.bomb as { site: number; planted: boolean; attackerTeam: number } | undefined;
      const sites = course.bombSites;
      const site = sites[bomb?.site ?? 0] ?? sites[0]!;
      return { x: site.x, z: site.z };
    }
    case 'paint':
      if (hunt) return { x: hunt.x, z: hunt.z };
      return {
        x: (rand(e.id * 9 + world.time) - 0.5) * course.size * 0.35,
        z: (rand(e.id * 13 + world.time * 0.2) - 0.5) * course.size * 0.35,
      };
    case 'infection':
      if (e.infected) return hunt ? { x: hunt.x, z: hunt.z } : mid;
      return hunt ? { x: hunt.x, z: hunt.z } : { x: home.x, z: home.z };
    case 'range': {
      const t = extra.rangeTarget as { x: number; z: number } | undefined;
      return t ?? { x: 0, z: 8 };
    }
    case 'potato': {
      const potato = extra.potato as { carrierId: number } | undefined;
      if (!potato) return mid;
      if (e.id === potato.carrierId) return { x: home.x, z: home.z };
      const holder = world.entities.find((o) => o.id === potato.carrierId);
      return holder ? { x: holder.x, z: holder.z } : mid;
    }
    default:
      if (hunt) return { x: hunt.x, z: hunt.z };
      return mid;
  }
}

export function thinkBot(e: Entity, world: BotWorld, dt: number): void {
  const br = e.brain;
  const diff = DIFF[world.difficulty];
  const moved = hypot2(e.x - br.lastX, e.z - br.lastZ);
  if (moved < 0.12) br.stuck += dt;
  else br.stuck = 0;
  br.lastX = e.x;
  br.lastZ = e.z;
  br.fireHold = Math.max(0, br.fireHold - dt);

  e.input.forward = false;
  e.input.back = false;
  e.input.left = false;
  e.input.right = false;
  e.input.jump = false;
  e.input.fire = false;
  e.input.sprint = false;
  e.input.crouch = false;
  e.input.swap = false;

  if (e.tangled) {
    br.state = 'celebrate';
    return;
  }

  if (e.cans.swapping) {
    br.state = 'retreat';
    e.input.forward = true;
    e.input.sprint = true;
    return;
  }

  if (e.cans.pressure <= 1) {
    e.input.swap = true;
  }

  if (br.stuck > BOT_UNSTICK) {
    const n = world.nav.nodes[Math.floor(rand(e.id + world.time) * world.nav.nodes.length)];
    if (n) setGoal(e, world, n.x, n.z, true);
    e.input.jump = true;
    e.input.left = rand(world.time + e.id) > 0.5;
    e.input.right = !e.input.left;
    e.input.forward = true;
    br.stuck = 0;
  }

  const hunt = nearestRival(e, world);
  const los = hunt && hypot3(hunt.x - e.x, hunt.y - e.y, hunt.z - e.z) < diff.vision && hasLos(e, hunt, world);
  const range = hunt ? hypot2(hunt.x - e.x, hunt.z - e.z) : 999;

  if (hunt && los && e.cans.pressure > 4 && range < STRING_RANGE + 3) {
    br.state = 'engage';
    br.targetId = hunt.id;
    const lead = diff.lead * Math.min(1, range / 8);
    lookToward(
      e,
      hunt.x + hunt.vx * lead,
      hunt.y + hunt.height * 0.62,
      hunt.z + hunt.vz * lead,
      br.aimOffYaw,
      br.aimOffPitch,
    );
    if (br.fireHold <= 0 && rand(e.id * 0.19 + world.time * 1.7) < diff.duty) {
      br.fireHold = 0.35 + rand(e.id + world.time) * diff.burst;
    }
    e.input.fire = br.fireHold > 0;
    e.input.forward = range > 7.5;
    e.input.back = range < 3.8;
    e.input.sprint = range > 11;
    const strafe = Math.sin(world.time * 3.1 + e.id);
    e.input.left = strafe > 0.15;
    e.input.right = strafe < -0.15;
    if (rand(world.time * 5 + e.id) > 0.92) e.input.jump = true;
    br.aimOffYaw = Math.sin(world.time * 5 + e.id) * diff.err;
    br.aimOffPitch = Math.cos(world.time * 4.2 + e.id) * diff.err * 0.45;
    return;
  }

  const goal = { ...modeGoal(e, world) };
  const spread = ((e.id * 13) % 7) - 3;
  if (!hunt) {
    goal.x += spread * 3.4;
    goal.z += (((e.id * 7) % 5) - 2) * 3.1;
  }
  br.repath -= dt;
  if (br.repath <= 0 || br.path.length === 0) {
    const movedGoal = hypot2(br.goalX - goal.x, br.goalZ - goal.z) > 5;
    setGoal(e, world, goal.x, goal.z, movedGoal);
    br.repath = hunt ? 0.5 : 0.85 + rand(e.id) * 0.4;
  }
  br.state = hunt ? 'seek' : 'patrol';
  br.targetId = hunt?.id ?? -1;

  const node = br.path[Math.min(br.pathI, br.path.length - 1)];
  const wp = node != null ? world.nav.nodes[node] : null;
  const tx = hunt && !los ? hunt.x : (wp?.x ?? goal.x);
  const tz = hunt && !los ? hunt.z : (wp?.z ?? goal.z);
  if (hunt) {
    lookToward(e, hunt.x, hunt.y + hunt.height * 0.6, hunt.z, br.aimOffYaw * 0.5, 0);
    if (range < STRING_RANGE + 6 && e.cans.pressure > 12) {
      if (br.fireHold <= 0 && rand(world.time + e.id) < diff.duty * 0.5) br.fireHold = 0.25;
      e.input.fire = br.fireHold > 0;
    }
  } else {
    lookToward(e, tx, e.y + 1.2, tz, 0, 0);
  }
  const dist = hypot2(tx - e.x, tz - e.z);
  if (dist < 1.6) br.pathI = Math.min(br.pathI + 1, Math.max(0, br.path.length - 1));
  e.input.forward = dist > 0.5;
  e.input.sprint = true;
  if (world.mode === 'paint' || world.mode === 'bomb') e.input.fire = e.cans.pressure > 12;
}

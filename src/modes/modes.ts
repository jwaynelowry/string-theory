import { FLAG_RETURN } from '../constants';
import { hypot2 } from '../engine/math';
import type { Entity } from '../engine/entity';
import type { Course } from '../maps/types';
import type { ModeId, TeamId } from '../types';
import { teamCoverage, type DecalPool } from '../weapons/decals';
import { CAN_ORDER } from '../weapons/stream';

export type Winner = 'pink' | 'cyan' | 'draw' | 'player';

export interface FlagState {
  x: number;
  y: number;
  z: number;
  carrierId: number | null;
  droppedAt: number;
  home: boolean;
  homeX: number;
  homeY: number;
  homeZ: number;
}

export interface BombState {
  site: number;
  planted: boolean;
  plantProgress: number;
  defuseProgress: number;
  fuse: number;
  attackerTeam: TeamId;
  exploded: boolean;
  defused: boolean;
}

export interface ModeWorld {
  time: number;
  entities: Entity[];
  course: Course;
  decals: DecalPool;
  scores: { pink: number; cyan: number };
  extra: Record<string, unknown>;
  mode: ModeId;
  events: { t: number; text: string }[];
  emit: (text: string) => void;
  respawn: (e: Entity) => void;
}

export const MODE_META: { id: ModeId; name: string; blurb: string }[] = [
  { id: 'tangle', name: 'Tangle Match', blurb: 'First team to wrap the other wins.' },
  { id: 'ctf', name: 'Capture the Flag', blurb: 'Grab their streamer. Bring it home.' },
  { id: 'koth', name: 'King of the Hill', blurb: 'Hold the moving party zone.' },
  { id: 'bomb', name: 'Glitter Bomb', blurb: 'Plant it. Spray it clear. Do not get sparkled.' },
  { id: 'paint', name: 'Paint the Town', blurb: 'Coat the course. Coverage is king.' },
  { id: 'infection', name: 'Tangled', blurb: 'One walking wrap. Last clean kid wins.' },
  { id: 'cangame', name: 'Can Game', blurb: 'Every tangle upgrades your nozzle.' },
  { id: 'range', name: 'Target Range', blurb: 'Pop plates. Chase combos. Solo practice.' },
  { id: 'potato', name: 'Hot Potato', blurb: 'The can is ticking. Pass it with a spray.' },
];

function teamOf(id: TeamId): 'pink' | 'cyan' {
  return id === 0 ? 'pink' : 'cyan';
}

function inZone(e: Entity, z: { x: number; z: number; r: number }): boolean {
  return hypot2(e.x - z.x, e.z - z.z) < z.r;
}

export function setupMode(world: ModeWorld): void {
  const c = world.course;
  world.scores.pink = 0;
  world.scores.cyan = 0;
  world.extra.tangleLimit = 20;
  world.extra.flagPink = {
    x: c.flags.pink.x,
    y: c.flags.pink.y,
    z: c.flags.pink.z,
    carrierId: null,
    droppedAt: -1,
    home: true,
    homeX: c.flags.pink.x,
    homeY: c.flags.pink.y,
    homeZ: c.flags.pink.z,
  } satisfies FlagState;
  world.extra.flagCyan = {
    x: c.flags.cyan.x,
    y: c.flags.cyan.y,
    z: c.flags.cyan.z,
    carrierId: null,
    droppedAt: -1,
    home: true,
    homeX: c.flags.cyan.x,
    homeY: c.flags.cyan.y,
    homeZ: c.flags.cyan.z,
  } satisfies FlagState;
  world.extra.hill = { ...c.hillPath[0]!, i: 0, t: 0 };
  world.extra.bomb = {
    site: 0,
    planted: false,
    plantProgress: 0,
    defuseProgress: 0,
    fuse: 20,
    attackerTeam: 0,
    exploded: false,
    defused: false,
  } satisfies BombState;
  world.extra.rangeScore = 0;
  world.extra.combo = 0;
  world.extra.rangeTarget = { x: 0, z: 12, y: 1.2 };
  world.extra.modeWinner = null as Winner | null;
  const first = world.entities[Math.floor(world.entities.length / 2)] ?? world.entities[0];
  world.extra.potato = { carrierId: first?.id ?? 1, fuse: 12 };

  if (world.mode === 'infection') {
    const bots = world.entities.filter((e) => e.isBot);
    const patient = bots[0] ?? world.entities[0];
    if (patient) {
      patient.infected = true;
      patient.team = 1;
      patient.color = 0x7dff3d;
      patient.name = `${patient.name} (tangled)`;
      world.emit(`${patient.name} starts the wrap`);
    }
  }
}

export function onTangled(world: ModeWorld, victim: Entity, attacker: Entity | null): void {
  if (world.mode === 'infection' && attacker?.infected) {
    victim.infected = true;
    victim.team = 1;
    victim.color = 0x7dff3d;
    world.emit(`${victim.name} got wrapped into the party`);
    return;
  }
  if (world.mode === 'cangame' && attacker) {
    attacker.canLevel = Math.min(CAN_ORDER.length - 1, attacker.canLevel + 1);
    attacker.kind = CAN_ORDER[attacker.canLevel]!;
    attacker.cans.kind = attacker.kind;
    world.emit(`${attacker.name} upgraded to ${attacker.kind}`);
  }
  if (world.mode === 'tangle' || world.mode === 'ctf' || world.mode === 'koth' || world.mode === 'bomb' || world.mode === 'paint') {
    if (attacker && attacker.team !== victim.team) {
      if (attacker.team === 0) world.scores.pink += 1;
      else world.scores.cyan += 1;
      attacker.kills += 1;
    }
    victim.deaths += 1;
  }
  if (victim.carrying != null) dropFlag(world, victim);
  if (world.mode === 'potato') {
    const potato = world.extra.potato as { carrierId: number; fuse: number };
    if (potato && victim.id === potato.carrierId && attacker) {
      potato.carrierId = attacker.id;
      potato.fuse = Math.max(potato.fuse, 3.5);
      world.emit(`${attacker.name} stole the hot can`);
    }
  }
}

function dropFlag(world: ModeWorld, e: Entity): void {
  const which = e.carrying;
  if (which == null) return;
  const flag = (which === 0 ? world.extra.flagPink : world.extra.flagCyan) as FlagState;
  flag.x = e.x;
  flag.y = 0.4;
  flag.z = e.z;
  flag.carrierId = null;
  flag.home = false;
  flag.droppedAt = world.time;
  e.carrying = null;
  world.emit(`${e.name} dropped a flag`);
}

function tickFlag(world: ModeWorld, flag: FlagState, team: TeamId, dt: number): void {
  if (flag.carrierId != null) {
    const c = world.entities.find((e) => e.id === flag.carrierId);
    if (!c || c.tangled) {
      flag.carrierId = null;
      flag.droppedAt = world.time;
      return;
    }
    flag.x = c.x;
    flag.y = c.y + c.height * 0.9;
    flag.z = c.z;
    const home = team === 0 ? world.course.bases.cyan : world.course.bases.pink;
    // carrier is the opposite team
    const carrierHome = c.team === 0 ? world.course.bases.pink : world.course.bases.cyan;
    if (hypot2(c.x - carrierHome.x, c.z - carrierHome.z) < carrierHome.r * 0.7) {
      if (c.team === 0) world.scores.pink += 1;
      else world.scores.cyan += 1;
      c.captures += 1;
      world.emit(`${c.name} captured a flag!`);
      flag.x = flag.homeX;
      flag.y = flag.homeY;
      flag.z = flag.homeZ;
      flag.home = true;
      flag.carrierId = null;
      c.carrying = null;
    }
    void home;
    void dt;
    return;
  }
  if (!flag.home && flag.droppedAt >= 0 && world.time - flag.droppedAt > FLAG_RETURN) {
    flag.x = flag.homeX;
    flag.y = flag.homeY;
    flag.z = flag.homeZ;
    flag.home = true;
    world.emit('Flag fluttered home');
    return;
  }
  for (const e of world.entities) {
    if (e.tangled || !e.alive) continue;
    if (hypot2(e.x - flag.x, e.z - flag.z) > 1.4) continue;
    if (e.team === team) {
      if (!flag.home) {
        flag.x = flag.homeX;
        flag.y = flag.homeY;
        flag.z = flag.homeZ;
        flag.home = true;
        world.emit(`${e.name} returned a flag`);
      }
    } else {
      flag.carrierId = e.id;
      flag.home = false;
      e.carrying = team;
      world.emit(`${e.name} snatched a flag`);
    }
  }
}

export function tickMode(world: ModeWorld, dt: number): void {
  switch (world.mode) {
    case 'ctf':
      tickFlag(world, world.extra.flagPink as FlagState, 0, dt);
      tickFlag(world, world.extra.flagCyan as FlagState, 1, dt);
      break;
    case 'koth': {
      const hill = world.extra.hill as { x: number; z: number; r: number; i: number; t: number };
      hill.t += dt;
      if (hill.t > 25) {
        hill.t = 0;
        hill.i = (hill.i + 1) % world.course.hillPath.length;
        const n = world.course.hillPath[hill.i]!;
        hill.x = n.x;
        hill.z = n.z;
        hill.r = n.r;
        world.emit('The hill skipped!');
      }
      let pink = 0;
      let cyan = 0;
      for (const e of world.entities) {
        if (e.tangled) continue;
        if (hypot2(e.x - hill.x, e.z - hill.z) < hill.r) {
          if (e.team === 0) pink += 1;
          else cyan += 1;
        }
      }
      const cov = teamCoverage(world.decals);
      if (pink > cyan) world.scores.pink += dt * (1 + cov.pink * 0.0004);
      else if (cyan > pink) world.scores.cyan += dt * (1 + cov.cyan * 0.0004);
      break;
    }
    case 'bomb': {
      const bomb = world.extra.bomb as BombState;
      const site = world.course.bombSites[bomb.site] ?? world.course.bombSites[0]!;
      if (!bomb.planted) {
        let planting = false;
        for (const e of world.entities) {
          if (e.team !== bomb.attackerTeam || e.tangled) continue;
          if (inZone(e, site) && e.input.fire) {
            bomb.plantProgress += dt;
            planting = true;
          }
        }
        if (!planting) bomb.plantProgress = Math.max(0, bomb.plantProgress - dt * 0.4);
        if (bomb.plantProgress >= 3) {
          bomb.planted = true;
          bomb.fuse = 20;
          world.emit('Glitter bomb planted!');
        }
      } else if (!bomb.exploded && !bomb.defused) {
        bomb.fuse -= dt;
        let defusing = false;
        for (const e of world.entities) {
          if (e.team === bomb.attackerTeam || e.tangled) continue;
          if (inZone(e, site) && e.input.fire) {
            bomb.defuseProgress += dt;
            defusing = true;
          }
        }
        if (!defusing) bomb.defuseProgress = Math.max(0, bomb.defuseProgress - dt * 0.3);
        if (bomb.defuseProgress >= 4) {
          bomb.defused = true;
          world.scores.cyan += 5;
          world.emit('Bomb sprayed clear!');
        } else if (bomb.fuse <= 0) {
          bomb.exploded = true;
          world.scores.pink += 5;
          world.emit('GLITTERSTORM');
        }
      }
      break;
    }
    case 'paint': {
      const cov = teamCoverage(world.decals);
      world.scores.pink = cov.pink;
      world.scores.cyan = cov.cyan;
      break;
    }
    case 'range': {
      const t = world.extra.rangeTarget as { x: number; z: number; y: number };
      t.x = Math.sin(world.time * 0.6) * 8;
      t.z = 14 + Math.cos(world.time * 0.4) * 4;
      t.y = 1.1 + Math.sin(world.time * 1.3) * 0.4;
      for (const e of world.entities) {
        if (!e.isPlayer) continue;
        // droplets handled in sim via onHit player-or we count shots near target
      }
      break;
    }
    case 'infection': {
      const clean = world.entities.filter((e) => !e.infected && !e.tangled).length;
      world.scores.pink = clean;
      world.scores.cyan = world.entities.length - clean;
      break;
    }
    case 'potato': {
      const potato = world.extra.potato as { carrierId: number; fuse: number };
      potato.fuse -= dt;
      const holder = world.entities.find((e) => e.id === potato.carrierId);
      if (potato.fuse <= 0 && holder) {
        holder.tangle = 1;
        holder.tangled = true;
        holder.tangledUntil = world.time + 3;
        holder.deaths += 1;
        if (holder.team === 0) world.scores.cyan += 1;
        else world.scores.pink += 1;
        world.emit(`${holder.name} popped the hot can!`);
        const next = world.entities.find((e) => e.id !== holder.id && !e.tangled) ?? world.entities.find((e) => e.id !== holder.id);
        potato.carrierId = next?.id ?? holder.id;
        potato.fuse = 12;
      }
      break;
    }
    default:
      break;
  }
}

export function winnerOnTimeout(world: ModeWorld): Winner {
  if (world.mode === 'bomb') {
    const bomb = world.extra.bomb as BombState;
    if (bomb.exploded) return 'pink';
    return 'cyan';
  }
  if (world.mode === 'infection') {
    const clean = world.entities.filter((e) => !e.infected);
    if (clean.length === 0) return 'cyan';
    if (clean.some((e) => e.isPlayer)) return 'player';
    return 'pink';
  }
  if (world.mode === 'range') {
    return world.scores.pink >= world.scores.cyan ? 'player' : 'cyan';
  }
  if (world.mode === 'cangame') {
    let best = world.entities[0];
    for (const e of world.entities) {
      if (!best || e.canLevel > best.canLevel || (e.canLevel === best.canLevel && e.kills > best.kills)) best = e;
    }
    if (!best) return 'draw';
    if (best.isPlayer) return 'player';
    return teamOf(best.team);
  }
  if (world.scores.pink > world.scores.cyan) return 'pink';
  if (world.scores.cyan > world.scores.pink) return 'cyan';
  return 'draw';
}

export function checkEarlyWinner(world: ModeWorld): Winner | null {
  if (world.mode === 'tangle') {
    const limit = (world.extra.tangleLimit as number) ?? 20;
    if (world.scores.pink >= limit) return 'pink';
    if (world.scores.cyan >= limit) return 'cyan';
  }
  if (world.mode === 'ctf') {
    if (world.scores.pink >= 3) return 'pink';
    if (world.scores.cyan >= 3) return 'cyan';
  }
  if (world.mode === 'bomb') {
    const bomb = world.extra.bomb as BombState;
    if (bomb.exploded) return 'pink';
    if (bomb.defused) return 'cyan';
  }
  if (world.mode === 'infection') {
    const clean = world.entities.filter((e) => !e.infected);
    if (clean.length === 0) return 'cyan';
    if (clean.length === 1 && world.time > 8) return clean[0]!.isPlayer ? 'player' : 'pink';
  }
  if (world.mode === 'cangame') {
    const champ = world.entities.find((e) => e.canLevel >= CAN_ORDER.length - 1 && e.kills > 0);
    if (champ) return champ.isPlayer ? 'player' : teamOf(champ.team);
  }
  return null;
}

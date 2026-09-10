import {
  COUNTDOWN,
  CROUCH_HEIGHT,
  CROUCH_SPEED,
  DEFAULT_ROUND,
  EYE_HEIGHT,
  PLAYER_HEIGHT,
  SPRINT_SPEED,
  TANGLE_DECAY,
  TICK,
  WALK_SPEED,
} from '../constants';
import { thinkBot } from '../bots/ai';
import { buildNav, type NavGraph } from '../bots/nav';
import { getCourse } from '../maps/courses';
import {
  checkEarlyWinner,
  onTangled,
  setupMode,
  tickMode,
  winnerOnTimeout,
  type ModeWorld,
  type Winner,
} from '../modes/modes';
import type { Course } from '../maps/types';
import type { Difficulty, ModeId, PlayerInput, RoundPhase, SimConfig } from '../types';
import { emptyInput } from '../types';
import { autoSwapIfEmpty, refillCans, sprayCans, startSwap, updateSwap } from '../weapons/cans';
import { createDecalPool, type DecalPool } from '../weapons/decals';
import { fireStream, lookDir, updateDroplets, type Droplet } from '../weapons/stream';
import { updateTangle } from '../weapons/tangle';
import { createEntity, type Entity } from './entity';
import { moveCharacter } from './physics';

const PINK_NAMES = ['Scout Dip', 'Bunk 9', 'Giggle Can', "S'more", 'Kickball', 'Lanyard'];
const CYAN_NAMES = ['Pool Noodle', 'Cabin 4', 'Wiggle Worm', 'Bug Juice', 'Capture Tag', 'Canteen'];
const VERBS = ['tangled', 'wrapped', 'stringed', 'mummified', 'ribboned', 'party-fouled'];

export interface PublicEntity {
  id: number;
  name: string;
  team: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  tangle: number;
  tangled: boolean;
  isBot: boolean;
  isPlayer: boolean;
  alive: boolean;
  pressure: number;
  cans: number;
  canIndex: number;
  swapping: boolean;
  kind: string;
  infected: boolean;
}

export interface PublicState {
  time: number;
  phase: RoundPhase;
  winner: Winner | null;
  countdown: number;
  roundTime: number;
  roundDuration: number;
  entities: PublicEntity[];
  decalCount: number;
  dropletCount: number;
  scores: { pink: number; cyan: number };
  stuckBots: number;
  maxStuck: number;
  maxFrameMs: number;
  events: { t: number; text: string }[];
  mode: ModeId;
  course: string;
  navNodeCount: number;
}

export class Simulation implements ModeWorld {
  time = 0;
  phase: RoundPhase = 'countdown';
  winner: Winner | null = null;
  countdown = COUNTDOWN;
  roundTime = 0;
  roundDuration = DEFAULT_ROUND;
  entities: Entity[] = [];
  droplets: Droplet[] = [];
  decals: DecalPool = createDecalPool();
  course!: Course;
  nav!: NavGraph;
  scores = { pink: 0, cyan: 0 };
  extra: Record<string, unknown> = {};
  events: { t: number; text: string }[] = [];
  mode: ModeId = 'tangle';
  difficulty: Difficulty = 'medium';
  maxFrameMs = 0;
  lastStepMs = 0;
  playerInput: PlayerInput = emptyInput();
  seed = 1;
  private stepClock = 0;

  emit = (text: string): void => {
    this.events.unshift({ t: this.time, text });
    if (this.events.length > 40) this.events.pop();
  };

  respawn = (e: Entity): void => {
    e.x = e.spawnX;
    e.y = e.spawnY;
    e.z = e.spawnZ;
    e.vx = 0;
    e.vy = 0;
    e.vz = 0;
    e.yaw = e.spawnYaw;
    e.tangle = 0;
    e.tangled = false;
    e.alive = true;
    e.carrying = null;
    e.height = PLAYER_HEIGHT;
  };

  /** Boot a match. Rebuilds course, nav, entities, and mode extra. */
  start(cfg: SimConfig): void {
    this.mode = cfg.mode;
    this.difficulty = cfg.difficulty;
    this.seed = cfg.seed ?? 1;
    this.roundDuration = cfg.roundDuration ?? DEFAULT_ROUND;
    this.course = getCourse(cfg.course, this.seed);
    this.nav = buildNav(this.course);
    this.time = 0;
    this.phase = 'countdown';
    this.countdown = COUNTDOWN;
    this.roundTime = 0;
    this.winner = null;
    this.droplets = [];
    this.decals = createDecalPool();
    this.events = [];
    this.extra = {};
    this.maxFrameMs = 0;
    this.scores = { pink: 0, cyan: 0 };
    this.playerInput = emptyInput();
    this.entities = [];

    const pinkSp = this.course.spawns.pink;
    const cyanSp = this.course.spawns.cyan;
    const p0 = pinkSp[0]!;
    this.entities.push(
      createEntity({
        id: 1,
        team: 0,
        name: 'You',
        isBot: false,
        isPlayer: true,
        x: p0.x,
        y: p0.y,
        z: p0.z,
        yaw: p0.yaw,
        spawnX: p0.x,
        spawnY: p0.y,
        spawnZ: p0.z,
        spawnYaw: p0.yaw,
      }),
    );

    const bots = Math.max(0, cfg.botCount | 0);
    let pinkBots = Math.floor((bots - 0) / 2);
    let cyanBots = bots - pinkBots;
    // 4v4-ish: player occupies a pink slot
    if (bots >= 2) {
      cyanBots = Math.ceil(bots / 2);
      pinkBots = bots - cyanBots;
    }
    let pid = 2;
    for (let i = 0; i < pinkBots; i++) {
      const s = pinkSp[(i + 1) % pinkSp.length]!;
      this.entities.push(
        createEntity({
          id: pid++,
          team: 0,
          name: PINK_NAMES[i % PINK_NAMES.length]!,
          isBot: true,
          x: s.x,
          y: s.y,
          z: s.z,
          yaw: s.yaw,
          spawnX: s.x,
          spawnY: s.y,
          spawnZ: s.z,
          spawnYaw: s.yaw,
        }),
      );
    }
    for (let i = 0; i < cyanBots; i++) {
      const s = cyanSp[i % cyanSp.length]!;
      this.entities.push(
        createEntity({
          id: pid++,
          team: 1,
          name: CYAN_NAMES[i % CYAN_NAMES.length]!,
          isBot: true,
          x: s.x,
          y: s.y,
          z: s.z,
          yaw: s.yaw,
          spawnX: s.x,
          spawnY: s.y,
          spawnZ: s.z,
          spawnYaw: s.yaw,
        }),
      );
    }
    setupMode(this);
  }

  setInput(input: Partial<PlayerInput>): void {
    Object.assign(this.playerInput, input);
  }

  /** Remaining seconds; `0` ends the round and declares a winner. */
  forceTimer(seconds: number): void {
    this.roundTime = this.roundDuration - seconds;
    if (seconds <= 0) this.endRound();
  }

  endRound(): void {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    this.winner = winnerOnTimeout(this);
    this.emit(
      this.winner === 'draw'
        ? 'Time! It’s a gooey tie.'
        : `${this.winner === 'pink' ? 'Party Pink' : this.winner === 'cyan' ? 'Pool Cyan' : 'You'} win!`,
    );
    for (const e of this.entities) {
      if (!e.tangled) e.brain.state = 'celebrate';
    }
  }

  /** Fast-forward the sim at a fixed 60 Hz tick. Used by smoke tests. */
  simulate(seconds: number): void {
    const n = Math.max(1, Math.round(seconds / TICK));
    for (let i = 0; i < n; i++) this.step(TICK);
  }

  step(dt: number): void {
    const t0 = nowMs();
    if (this.phase === 'countdown') {
      this.countdown -= dt;
      this.time += dt;
      if (this.countdown <= 0) {
        this.phase = 'playing';
        this.emit('SPRAY!');
      }
      this.lastStepMs = nowMs() - t0;
      this.maxFrameMs = Math.max(this.maxFrameMs, this.lastStepMs);
      return;
    }
    if (this.phase === 'ended') {
      this.time += dt;
      this.lastStepMs = nowMs() - t0;
      return;
    }

    this.time += dt;
    this.roundTime += dt;
    this.stepClock += dt;

    const player = this.entities.find((e) => e.isPlayer);
    if (player) {
      player.input = this.playerInput;
      player.yaw = this.playerInput.yaw;
      player.pitch = this.playerInput.pitch;
    }

    for (const e of this.entities) {
      if (e.isBot) thinkBot(e, this, dt);
    }

    tickMode(this, dt);

    for (const e of this.entities) {
      this.stepEntity(e, dt);
    }

    const prevTangled = new Map<number, boolean>();
    for (const e of this.entities) prevTangled.set(e.id, e.tangled);

    updateDroplets(
      this.droplets,
      dt,
      this.course.colliders,
      this.entities,
      this.decals,
      () => {},
      this.time,
    );
    this.harvestTangles(prevTangled);
    if (this.mode === 'range') this.scoreRangeHits();

    for (const e of this.entities) {
      if (!e.tangled) e.tangle = Math.max(0, e.tangle - TANGLE_DECAY * dt);
      updateTangle(e, this.time, () => this.respawn(e));
    }

    const early = checkEarlyWinner(this);
    if (early) {
      this.winner = early;
      this.endRound();
    } else if (this.roundTime >= this.roundDuration) {
      this.endRound();
    }

    this.lastStepMs = nowMs() - t0;
    this.maxFrameMs = Math.max(this.maxFrameMs, this.lastStepMs);
  }

  private scoreRangeHits(): void {
    const t = this.extra.rangeTarget as { x: number; y: number; z: number };
    if (!t) return;
    for (const d of this.droplets) {
      if (!d.alive) continue;
      const dx = d.x - t.x;
      const dy = d.y - t.y;
      const dz = d.z - t.z;
      if (dx * dx + dy * dy + dz * dz < 0.55) {
        d.alive = false;
        this.scores.pink += 1;
        this.extra.combo = ((this.extra.combo as number) ?? 0) + 1;
      }
    }
  }

  private stepEntity(e: Entity, dt: number): void {
    updateSwap(e.cans, dt);
    if (e.tangled && !(this.mode === 'infection' && e.infected)) {
      e.vx *= 0.2;
      e.vz *= 0.2;
      e.height = Math.max(0.55, e.height - dt * 0.8);
      e.yaw += dt * 2.2;
      return;
    }

    if (this.mode === 'infection' && e.infected && e.tangled) {
      e.tangled = false;
      e.tangle = 0;
    }

    e.crouching = e.input.crouch;
    e.sprinting = e.input.sprint && !e.crouching;
    e.height = e.crouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
    const speed0 = e.crouching ? CROUCH_SPEED : e.sprinting ? SPRINT_SPEED : WALK_SPEED;
    const speed = e.carrying != null ? speed0 * 0.78 : speed0;

    const fwd = Number(e.input.forward) - Number(e.input.back);
    const strafe = Number(e.input.right) - Number(e.input.left);
    const look = lookDir(e.yaw, 0);
    const wishX = look.x * fwd + Math.cos(e.yaw) * strafe;
    const wishZ = look.z * fwd + Math.sin(e.yaw) * strafe;

    moveCharacter(e, wishX, wishZ, {
      dt,
      colliders: this.course.colliders,
      speed,
      jump: e.input.jump,
    });

    if (e.input.swap) startSwap(e.cans, this.time);

    const canFire = e.input.fire && !e.cans.swapping && e.cans.pressure > 1;
    if (e.input.fire && !e.cans.swapping && e.cans.pressure <= 1) autoSwapIfEmpty(e.cans);
    if (canFire && sprayCans(e.cans, dt)) {
      const eye = e.crouching ? 0.95 : EYE_HEIGHT;
      const dir = lookDir(e.yaw, e.pitch);
      const rateMul = e.carrying != null ? 0.6 : 1;
      fireStream(this.droplets, e.fireAcc, dt * rateMul, {
        x: e.x + dir.x * 0.4,
        y: e.y + eye,
        z: e.z + dir.z * 0.4,
        vx: e.vx,
        vy: e.vy,
        vz: e.vz,
        yaw: e.yaw,
        pitch: e.pitch,
        team: e.team,
        ownerId: e.id,
        color: e.color,
        kind: e.kind,
      });
      e.shots += 1;
    } else {
      refillCans(e.cans, dt);
      e.fireAcc.t = Math.min(e.fireAcc.t, 0.05);
    }

    // wrap just-tangled handling
    if (e.tangle >= 1 && !e.tangled) {
      // applyTangle already sets tangled in droplet hits
    }
  }

  /** Call after droplets so freshly tangled entities emit feed + scoring. */
  harvestTangles(prev: Map<number, boolean>): void {
    for (const e of this.entities) {
      const was = prev.get(e.id) ?? false;
      if (e.tangled && !was) {
        const attacker = this.guessAttacker(e);
        if (this.mode === 'infection' && attacker?.infected) {
          e.tangled = false;
          e.tangle = 0;
        }
        onTangled(this, e, attacker);
        const verb = VERBS[Math.floor(Math.abs(Math.sin(this.time + e.id)) * VERBS.length)]!;
        this.emit(`${attacker?.name ?? 'Someone'} ${verb} ${e.name}`);
      }
    }
  }

  private guessAttacker(victim: Entity): Entity | null {
    let best: Entity | null = null;
    let bd = 9;
    for (const e of this.entities) {
      if (e.id === victim.id) continue;
      const d = (e.x - victim.x) ** 2 + (e.z - victim.z) ** 2;
      if (d < bd * bd && (this.mode === 'infection' || e.team !== victim.team)) {
        bd = Math.sqrt(d);
        best = e;
      }
    }
    return best;
  }

  /** Snapshot for HUD, `window.__game`, and the smoke suite. */
  getState(): PublicState {
    let stuckBots = 0;
    let maxStuck = 0;
    for (const e of this.entities) {
      if (!e.isBot) continue;
      maxStuck = Math.max(maxStuck, e.brain.stuck);
      if (e.brain.stuck > 10) stuckBots += 1;
    }
    return {
      time: this.time,
      phase: this.phase,
      winner: this.winner,
      countdown: this.countdown,
      roundTime: this.roundTime,
      roundDuration: this.roundDuration,
      entities: this.entities.map((e) => ({
        id: e.id,
        name: e.name,
        team: e.team,
        x: e.x,
        y: e.y,
        z: e.z,
        yaw: e.yaw,
        pitch: e.pitch,
        tangle: e.tangle,
        tangled: e.tangled,
        isBot: e.isBot,
        isPlayer: e.isPlayer,
        alive: e.alive,
        pressure: e.cans.pressure,
        cans: e.cans.tanks.filter((t) => t > 0).length,
        canIndex: e.cans.index,
        swapping: e.cans.swapping,
        kind: e.kind,
        infected: e.infected,
      })),
      decalCount: this.decals.count,
      dropletCount: this.droplets.filter((d) => d.alive).length,
      scores: { ...this.scores },
      stuckBots,
      maxStuck,
      maxFrameMs: this.maxFrameMs,
      events: this.events.slice(0, 12),
      mode: this.mode,
      course: this.course.name,
      navNodeCount: this.nav.nodes.length,
    };
  }

  get colliders() {
    return this.course.colliders;
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function defaultConfig(over: Partial<SimConfig> = {}): SimConfig {
  return {
    mode: 'tangle',
    course: 'test',
    botCount: 12,
    difficulty: 'medium',
    headless: true,
    ...over,
  };
}

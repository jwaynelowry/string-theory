export type TeamId = 0 | 1;
export type ModeId =
  | 'ctf'
  | 'tangle'
  | 'koth'
  | 'bomb'
  | 'paint'
  | 'infection'
  | 'cangame'
  | 'range'
  | 'potato';
export type CourseId = 'test' | 'speedball' | 'woodsball' | 'junkyard' | 'procedural';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type CanKind = 'standard' | 'wide' | 'long' | 'pulse' | 'foam' | 'popper';
export type BotState = 'patrol' | 'seek' | 'engage' | 'cover' | 'retreat' | 'celebrate';
export type RoundPhase = 'menu' | 'countdown' | 'playing' | 'ended';

export interface PlayerInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  sprint: boolean;
  fire: boolean;
  swap: boolean;
  yaw: number;
  pitch: number;
}

export const emptyInput = (): PlayerInput => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  crouch: false,
  sprint: false,
  fire: false,
  swap: false,
  yaw: 0,
  pitch: 0,
});

export interface SimConfig {
  mode: ModeId;
  course: CourseId;
  botCount: number;
  difficulty: Difficulty;
  seed?: number;
  headless?: boolean;
  roundDuration?: number;
}

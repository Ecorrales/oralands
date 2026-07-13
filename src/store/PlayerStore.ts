import type { Creature } from "../engine";
import type { WeaponOpt, ArmorOpt } from "../game/catalog";
import type { Cargado } from "../game/cargados";

/** Foto de una bajada en curso, guardada en checkpoints seguros (campamento / sala despejada). */
export interface RunState {
  stage: number; stageRooms: number; roomInStage: number; depth: number;
  player: Creature; potions: number; inventory: WeaponOpt[];
  runGold: number; runXp: number; points: number;
  phase: "camp" | "cleared";
  drop: WeaponOpt | null; picked: boolean; equipped: boolean; roomGold: number; searched: boolean;
  resting: boolean; campStartMs: number; hpAtCamp: number; ambushAtSec: number | null;
  stalkerId: string | null; defeated: string[]; recovered: WeaponOpt[];
}

export interface SavedGame {
  version: number;
  player: Creature;
  gold: number;
  potions: number;
  inventory: WeaponOpt[];
  armor: ArmorOpt | null;
  cargados: Cargado[];
  run: RunState | null;
  xp: number;
  points: number;
  savedAt: string;
}

export interface PlayerStore {
  save(game: SavedGame): Promise<void>;
  load(): Promise<SavedGame | null>;
  clear(): Promise<void>;
}

export const SAVE_VERSION = 1;

import type { Creature } from "../engine";
import type { WeaponOpt } from "../game/catalog";
import type { GearItem, EquipSlot } from "../game/gear";
import type { Mats } from "../game/materials";
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
  runMaterials: Mats;
  dungeonId: string;
}

export interface SavedGame {
  version: number;
  player: Creature;
  gold: number;
  potions: number;
  inventory: WeaponOpt[];
  gear: GearItem[];
  equipped: Partial<Record<EquipSlot, string>>;
  cargados: Cargado[];
  materials: Mats;
  run: RunState | null;
  xp: number;
  points: number;
  maxDepth?: number;    // profundidad máxima histórica alcanzada (para estadísticas)
  unlockedFloors?: Record<string, number[]>;   // pisos desbloqueados por mazmorra (llaves): { cripta: [5,10], ... }
  savedAt: string;
}

export interface PlayerStore {
  save(game: SavedGame): Promise<void>;
  load(): Promise<SavedGame | null>;
  clear(): Promise<void>;
}

export const SAVE_VERSION = 1;

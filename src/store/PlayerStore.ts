import type { Creature } from "../engine";
import type { WeaponOpt, ArmorOpt } from "../game/catalog";
import type { Cargado } from "../game/cargados";

export interface SavedGame {
  version: number;
  player: Creature;
  gold: number;
  potions: number;
  inventory: WeaponOpt[];
  armor: ArmorOpt | null;
  cargados: Cargado[];
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

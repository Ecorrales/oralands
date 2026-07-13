// Enemigos "cargados": el que te mata se gradúa con nombre + título, sube de nivel,
// y carga lo que dejaste caer (oro sin asegurar + un arma al azar de tu mochila).
import { recomputeDerived, type Creature } from "../engine";
import { enemyKind } from "./enemies";
import type { WeaponOpt } from "./catalog";
import { UNDEAD_NAMES, BEAST_NAMES, TITLES } from "./cargadosPool";

export interface Cargado {
  id: string;
  creature: Creature;        // el enemigo graduado, listo para pelear
  gold: number;              // oro que te robó
  weapon: WeaponOpt | null;  // arma que te robó (se te devuelve al vencerlo)
  kindLabel: string;
}

export const MAX_CARGADOS = 6;

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const BLADE = new Set(["dagger", "sword", "sabre", "rapier", "greatsword", "voidrapier"]);
const BLUNT = new Set(["club", "mace", "warhammer", "executioner"]);

function titleFor(w: WeaponOpt | null): string {
  if (!w) return pick(TITLES.thief);
  if (BLUNT.has(w.id)) return pick(TITLES.blunt);
  if (BLADE.has(w.id)) return pick(TITLES.blade);
  return pick(TITLES.generic);
}
function nameFor(kind: "undead" | "rodent" | "beast"): string {
  return kind === "undead" ? pick(UNDEAD_NAMES) : pick(BEAST_NAMES);
}

/** Elige el índice de un arma de la mochila para robar, protegiendo una copia de la equipada. Devuelve -1 si no hay repuesto. */
export function pickStolenIndex(inventory: WeaponOpt[], equippedId: string): number {
  const protIdx = inventory.findIndex((w) => w.id === equippedId);
  const candidates = inventory.map((_, i) => i).filter((i) => i !== protIdx);
  return candidates.length ? pick(candidates) : -1;
}

/** Gradúa a un cargado a partir del grupo que te mató. */
export function graduateCargado(killers: Creature[], gold: number, stolen: WeaponOpt | null): Cargado {
  // el más fuerte del grupo (más vida) se lleva el crédito
  const base = killers.reduce((a, b) => (b.maxHp > a.maxHp ? b : a));
  const kind = enemyKind(base);
  const c: Creature = { ...base, characteristics: { ...base.characteristics }, tags: [...base.tags], weapon: { ...base.weapon }, modifiers: [] };
  c.level += 1;                 // sube de nivel al graduarse
  recomputeDerived(c);
  c.hp = c.maxHp; c.energy = c.maxEnergy;
  c.name = `${nameFor(kind)} ${titleFor(stolen)}`;
  const label = kind === "undead" ? "no-muerto" : kind === "rodent" ? "alimaña" : "bestia";
  return { id: `c${Date.now()}${Math.floor(Math.random() * 1000)}`, creature: c, gold, weapon: stolen, kindLabel: label };
}

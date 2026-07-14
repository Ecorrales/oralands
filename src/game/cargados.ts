// Enemigos "cargados": el que te mata se gradúa con nombre + título, sube de nivel,
// y carga lo que dejaste caer (oro sin asegurar + un arma al azar de tu mochila).
import { recomputeDerived, type Creature } from "../engine";
import { enemyKind } from "./enemies";
import { xpToNext } from "./progression";
import type { WeaponOpt } from "./catalog";
import { UNDEAD_NAMES, BEAST_NAMES, TITLES } from "./cargadosPool";

export interface Cargado {
  id: string;
  creature: Creature;        // el enemigo graduado, listo para pelear
  gold: number;              // oro que te robó
  weapon: WeaponOpt | null;  // arma que te robó (se te devuelve al vencerlo)
  kindLabel: string;
  xp?: number;               // XP acumulada hacia su siguiente nivel (crece al ganarte)
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

/** Sube stats según la identidad del némesis (2 puntos por nivel, como el jugador). */
function reinforceIdentity(c: Creature, kind: "undead" | "rodent" | "beast") {
  const ch = c.characteristics;
  if (kind === "undead") ch.vitality += 2;                       // no-muerto: correoso, tanque
  else if (kind === "beast") { ch.strength += 1; ch.dexterity += 1; }  // bestia: veloz y fuerte
  else { ch.dexterity += 1; ch.vitality += 1; }                 // alimaña: escurridiza y resistente
}

/** El némesis te volvió a ganar: gana XP proporcional a tu nivel, sube de nivel con TU curva,
 *  refuerza su identidad y regresa más letal. Su nivel es propio (no el del stage). */
export function levelUpCargado(prev: Cargado, playerLevel: number): Cargado {
  const c: Creature = {
    ...prev.creature,
    characteristics: { ...prev.creature.characteristics },
    tags: [...(prev.creature.tags ?? [])],
    weapon: { ...prev.creature.weapon },
    modifiers: [], nemesis: true,
  };
  const kind = enemyKind(c);
  // XP proporcional a tu nivel, medida con la curva del jugador: a la par = ~1 nivel, si lo superas = más.
  let xp = (prev.xp ?? 0) + Math.round(xpToNext(c.level) * playerLevel / Math.max(1, c.level));
  let gained = 0;
  while (xp >= xpToNext(c.level)) { xp -= xpToNext(c.level); c.level += 1; reinforceIdentity(c, kind); gained++; }
  if (gained === 0) { c.level += 1; reinforceIdentity(c, kind); }  // siempre crece algo al ganarte
  recomputeDerived(c);
  c.hp = c.maxHp; c.energy = c.maxEnergy;
  return { ...prev, creature: c, xp };
}

/** Gradúa a un cargado a partir del grupo que te mató. */
export function graduateCargado(killers: Creature[], gold: number, stolen: WeaponOpt | null): Cargado {
  // el más fuerte del grupo (más vida) se lleva el crédito
  const base = killers.reduce((a, b) => (b.maxHp > a.maxHp ? b : a));
  const kind = enemyKind(base);
  const c: Creature = { ...base, characteristics: { ...base.characteristics }, tags: [...base.tags], weapon: { ...base.weapon }, modifiers: [], nemesis: true };
  c.level += 1;                 // sube de nivel al graduarse
  recomputeDerived(c);
  c.hp = c.maxHp; c.energy = c.maxEnergy;
  c.name = `${nameFor(kind)} ${titleFor(stolen)}`;
  const label = kind === "undead" ? "no-muerto" : kind === "rodent" ? "alimaña" : "bestia";
  return { id: `c${Date.now()}${Math.floor(Math.random() * 1000)}`, creature: c, gold, weapon: stolen, kindLabel: label };
}

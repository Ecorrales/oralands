// Modelo de criatura + stats de combate derivados (con buffs/debuffs activos).
import { type Characteristics, getHealthForLevel, maxEnergy, energyRegen } from "./stats";
import { clamp, diceroll, type RNG } from "./dice";
import type { Modifier } from "./modifiers";

export interface Weapon {
  id?: string;           // referencia al item del catálogo (para el inventario)
  name: string;
  damage: string;        // dado, ej "1d4"
  accuracy: string;      // dado, ej "1d6"
  energyCost?: number;   // legado (las habilidades definen su costo)
  abilities?: string[];  // ids de habilidades que otorga; default ["smash"]
}

export interface Creature {
  name: string;
  characteristics: Characteristics;
  level: number;
  weapon: Weapon;
  tags: string[];
  modifiers: Modifier[];
  hp: number; maxHp: number;
  energy: number; maxEnergy: number; regen: number;
}

export function makeCreature(name: string, characteristics: Characteristics, level: number, weapon: Weapon, tags: string[] = []): Creature {
  const maxHp = getHealthForLevel(characteristics.vitality, level);
  const maxEn = maxEnergy(characteristics.strength, level);
  return { name, characteristics, level, weapon, tags, modifiers: [], hp: maxHp, maxHp, energy: maxEn, maxEnergy: maxEn, regen: energyRegen(characteristics.strength, level) };
}

export const hasTag = (c: Creature, tag: string): boolean => c.tags.includes(tag);

/** Recalcula stats derivados tras cambiar nivel o características. */
export function recomputeDerived(c: Creature): void {
  c.maxHp = getHealthForLevel(c.characteristics.vitality, c.level);
  c.maxEnergy = maxEnergy(c.characteristics.strength, c.level);
  c.regen = energyRegen(c.characteristics.strength, c.level);
  c.hp = Math.min(c.hp, c.maxHp);
  c.energy = Math.min(c.energy, c.maxEnergy);
}

/** Características efectivas = base + modificadores de tipo "stat" activos (mín 1). */
export function effectiveCharacteristics(c: Creature): Characteristics {
  const e: Characteristics = { ...c.characteristics };
  for (const m of c.modifiers) {
    if (m.kind === "stat" && m.statChange) {
      for (const k of Object.keys(m.statChange) as (keyof Characteristics)[]) e[k] += m.statChange[k] ?? 0;
    }
  }
  e.strength = Math.max(1, e.strength); e.vitality = Math.max(1, e.vitality);
  e.dexterity = Math.max(1, e.dexterity); e.intelligence = Math.max(1, e.intelligence);
  return e;
}

/** accuracy = (2*int)d(2*dex) + arma, con características efectivas (el dolor la baja). */
export function accuracyOf(c: Creature, rng: RNG = Math.random): number {
  const e = effectiveCharacteristics(c);
  return clamp(diceroll(`${2 * e.intelligence}d${2 * e.dexterity}`, rng) + diceroll(c.weapon.accuracy, rng), 0, 9999);
}

/** evasion = (dex)d6 con destreza efectiva. */
export function evasionOf(c: Creature, rng: RNG = Math.random): number {
  return diceroll(`${effectiveCharacteristics(c).dexterity}d6`, rng);
}

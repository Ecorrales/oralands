// Habilidades: to-hit uniforme (accuracy-evasion afinado), y por-habilidad el
// costo de energía, la fórmula de daño y el efecto (con su propia probabilidad).
import { clamp, diceroll, type RNG } from "./dice";
import type { Characteristics } from "./stats";
import { type Creature, accuracyOf, evasionOf, hasTag, effectiveCharacteristics } from "./creature";
import { type TuneConfig, DEFAULT_TUNE } from "./tune";
import { type Modifier, knockdown, pain, bleeding } from "./modifiers";

/** Fiel al original: clamp(accuracy - evasion, 5, 95). */
export const hitChanceRaw = (accuracy: number, evasion: number): number => clamp(accuracy - evasion, 5, 95);

/** Capa de afinación (recentrado): base alta empujada por accuracy vs evasion. */
export const hitChanceTuned = (accuracy: number, evasion: number, tune: TuneConfig = DEFAULT_TUNE): number =>
  clamp(tune.hitBase + (accuracy - evasion) / tune.hitSlope, 5, 97);

/** Smash faithful: weaponDmg*str, piso str/2 (el código no resta defensa). */
export const smashDamage = (weaponDamage: number, strength: number): number => clamp(weaponDamage * strength, strength / 2, Infinity);

export const knockdownChance = (uInt: number, uStr: number, tDex: number, tInt: number, tArm: boolean, tHeavy: boolean): number =>
  clamp(uInt * uStr - tDex - tInt / 2 + 5 * (tArm ? 1 : 0) + 10 * (tHeavy ? 1 : 0), 5, 95);

const rollUnder = (chance: number, rng: RNG): boolean => Math.floor(rng() * 100) + 1 <= chance;

// ---- resolveSmash (se conserva para tests y compatibilidad) ----
export interface AttackResolution {
  hit: boolean; chance: number; damage: number; weaponRoll: number;
  knockdown: boolean; knockdownChance: number; modifiers: Modifier[];
}
export function resolveSmash(user: Creature, target: Creature, tune: TuneConfig = DEFAULT_TUNE, rng: RNG = Math.random): AttackResolution {
  const acc = accuracyOf(user, rng), eva = evasionOf(target, rng);
  const chance = Math.round(hitChanceTuned(acc, eva, tune));
  if (!rollUnder(chance, rng)) return { hit: false, chance, damage: 0, weaponRoll: 0, knockdown: false, knockdownChance: 0, modifiers: [] };
  const weaponRoll = diceroll(user.weapon.damage, rng);
  const damage = Math.round(smashDamage(weaponRoll, user.characteristics.strength));
  const kc = knockdownChance(user.characteristics.intelligence, user.characteristics.strength, target.characteristics.dexterity, target.characteristics.intelligence, hasTag(target, "armor"), hasTag(target, "heavy armor"));
  const knocked = rollUnder(kc, rng);
  return { hit: true, chance, damage, weaponRoll, knockdown: knocked, knockdownChance: kc, modifiers: knocked ? [knockdown()] : [] };
}

// ===================== SISTEMA DE HABILIDADES =====================
const arm = (t: Creature) => hasTag(t, "armor");
const hvy = (t: Creature) => hasTag(t, "heavy armor");
const unarm = (t: Creature) => !arm(t) && !hvy(t);
const vitMult = (u: Characteristics) => clamp(Math.floor(u.vitality / 4), 1, 2);
const knockChance = (u: Characteristics, t: Creature, mult = 1) => {
  const tc = effectiveCharacteristics(t);
  return clamp(u.intelligence * u.strength * mult - tc.dexterity - tc.intelligence / 2 + 5 * (arm(t) ? 1 : 0) + 10 * (hvy(t) ? 1 : 0), 5, 95);
};
const painChance = (u: Characteristics, t: Creature) => {
  const tc = effectiveCharacteristics(t);
  return clamp(u.intelligence * u.dexterity - tc.vitality - tc.intelligence / 2 - 10 * (arm(t) || hvy(t) ? 1 : 0), 5, 95);
};
const bleedChance = (u: Characteristics, t: Creature) => {
  const tc = effectiveCharacteristics(t);
  return clamp(u.intelligence * u.dexterity - tc.vitality - 15 * (arm(t) ? 1 : 0) - 20 * (hvy(t) ? 1 : 0), 5, 95);
};

export interface AbilitySpec {
  id: string; name: string; desc: string; energyCost: number;
  accMod?: number;   // ± al % de acierto (negativo = más difícil de atinar)
  dmgMod?: number;   // multiplicador de daño (dial de balance, por defecto 1)
  damage: (u: Characteristics, target: Creature, weaponRoll: number) => number;
  effect?: { name: string; label: string; chance: (u: Characteristics, target: Creature) => number; make: (target: Creature) => Modifier };
}

export const ABILITIES: Record<string, AbilitySpec> = {
  smash: {
    id: "smash", name: "Golpe", desc: "Contundente y fiable. Puede derribar.", energyCost: 2, accMod: 0,
    damage: (u, _t, wr) => clamp(wr * u.strength, u.strength / 2, Infinity),
    effect: { name: "knockdown", label: "aturdido", chance: (u, t) => knockChance(u, t), make: () => knockdown() },
  },
  bash: {
    id: "bash", name: "Empujón", desc: "Poco daño pero fácil de acertar, alto derribo.", energyCost: 2, accMod: 6,
    damage: (u) => clamp(u.strength, u.strength / 2, Infinity),
    effect: { name: "knockdown", label: "aturdido", chance: (u, t) => knockChance(u, t), make: () => knockdown() },
  },
  crush: {
    id: "crush", name: "Aplastar", desc: "Golpe pesado y lento; pega durísimo pero cuesta atinar.", energyCost: 3, accMod: -12,
    damage: (u, _t, wr) => clamp(wr * u.strength * vitMult(u), u.strength / 2, Infinity),
    effect: { name: "knockdown", label: "aturdido", chance: (u, t) => knockChance(u, t, vitMult(u)), make: () => knockdown() },
  },
  stab: {
    id: "stab", name: "Estocada", desc: "Perfora con fuerza, pero difícil de atinar (pide destreza y fuerza). Puede causar dolor.", energyCost: 2, accMod: -16, dmgMod: 1.5,
    damage: (u, t, wr) => { const base = wr * u.strength; return clamp(base + (unarm(t) ? 1 : 0) * 0.05 * base, u.strength / 2, Infinity); },
    effect: { name: "pain", label: "dolor", chance: (u, t) => painChance(u, t), make: () => pain() },
  },
  quick_stab: {
    id: "quick_stab", name: "Finta", desc: "Rápida, barata y segura; poco daño.", energyCost: 1, accMod: 10,
    damage: (u, _t, wr) => clamp(wr * (u.strength / 2), u.strength / 2, Infinity),
    effect: { name: "pain", label: "dolor", chance: (u, t) => painChance(u, t), make: () => pain() },
  },
  cut: {
    id: "cut", name: "Tajo", desc: "Corte amplio. Puede causar sangrado.", energyCost: 2, accMod: 0,
    damage: (u, t, wr) => { const base = wr * u.strength; return clamp(base + (unarm(t) ? 1 : 0) * 0.05 * base * 1.15, u.strength / 2, Infinity); },
    effect: { name: "bleeding", label: "sangrado", chance: (u, t) => bleedChance(u, t), make: (t) => bleeding(t) },
  },
  quick_cut: {
    id: "quick_cut", name: "Sajadura", desc: "Corte rápido y seguro, poco daño.", energyCost: 1, accMod: 8,
    damage: (u, _t, wr) => clamp(wr * (u.strength / 2), u.strength / 2, Infinity),
    effect: { name: "bleeding", label: "sangrado", chance: (u, t) => bleedChance(u, t), make: (t) => bleeding(t) },
  },
};

export const getAbility = (id: string): AbilitySpec | undefined => ABILITIES[id];

export interface AbilityResolution {
  ability: string; hit: boolean; chance: number; damage: number; weaponRoll: number;
  modifiers: Modifier[];
  effect?: { name: string; label: string; chance: number; applied: boolean };
}

export function resolveAbility(ability: AbilitySpec, user: Creature, target: Creature, tune: TuneConfig = DEFAULT_TUNE, rng: RNG = Math.random): AbilityResolution {
  const acc = accuracyOf(user, rng), eva = evasionOf(target, rng);
  const chance = clamp(Math.round(hitChanceTuned(acc, eva, tune)) + (ability.accMod ?? 0), 5, 97);
  if (!rollUnder(chance, rng)) return { ability: ability.id, hit: false, chance, damage: 0, weaponRoll: 0, modifiers: [] };
  const u = effectiveCharacteristics(user);
  const weaponRoll = diceroll(user.weapon.damage, rng);
  const damage = Math.round(ability.damage(u, target, weaponRoll) * (ability.dmgMod ?? 1));
  let modifiers: Modifier[] = [];
  let effect: AbilityResolution["effect"];
  if (ability.effect) {
    const ec = Math.round(ability.effect.chance(u, target));
    const applied = rollUnder(ec, rng);
    if (applied) modifiers = [ability.effect.make(target)];
    effect = { name: ability.effect.name, label: ability.effect.label, chance: ec, applied };
  }
  return { ability: ability.id, hit: true, chance, damage, weaponRoll, modifiers, effect };
}

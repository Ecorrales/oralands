import { describe, it, expect } from "vitest";
import {
  getHealthForLevel, ENERGY_BASE, energyRaiseCost, energyRegen,
  hitChanceRaw, hitChanceTuned, smashDamage, knockdownChance,
  diceroll, makeCreature, resolveSmash, initiativeOrder,
  ABILITIES, effectiveCharacteristics, pain,
  type Characteristics, type Creature,
} from "../src/engine";

const chars = (o: Partial<Characteristics>): Characteristics => ({ strength: 5, vitality: 5, dexterity: 5, intelligence: 5, ...o });
const dummy = (o: Partial<Characteristics>, tags: string[] = []): Creature =>
  makeCreature("t", chars(o), 1, { name: "w", damage: "1d4", accuracy: "1d6" }, tags);

// ---- Parity with the original Python engine (deterministic formulas, no RNG) ----
describe("parity vs Python engine", () => {
  it("max health for level", () => {
    expect(getHealthForLevel(5, 1)).toBe(98);
    expect(getHealthForLevel(8, 1)).toBe(173);
  });
  it("energy is its own stat (base 6, incremental cost)", () => {
    expect(ENERGY_BASE).toBe(6);
    expect(energyRaiseCost(6)).toBe(1);
    expect(energyRaiseCost(11)).toBe(6);
  });
  it("energy regen", () => {
    expect(energyRegen(1)).toBe(2);
    expect(energyRegen(60)).toBe(6);
  });
  it("raw hit chance = clamp(acc - eva, 5, 95)", () => {
    expect(hitChanceRaw(30, 10)).toBe(20);
    expect(hitChanceRaw(12, 40)).toBe(5);
  });
  it("smash damage = clamp(weaponDmg * str, str/2, inf)", () => {
    expect(smashDamage(4, 5)).toBe(20);
    expect(smashDamage(2, 9)).toBe(18);
  });
  it("knockdown chance", () => {
    expect(knockdownChance(5, 5, 5, 5, false, false)).toBe(17.5);
    expect(knockdownChance(7, 6, 4, 4, false, true)).toBe(46);
  });
});

// ---- Tuning layer (recentrado) ----
describe("tuning layer", () => {
  it("recentrado baseline at parity", () => {
    // base 60, slope 2: acc==eva -> 60
    expect(hitChanceTuned(50, 50)).toBe(68);
  });
  it("clamps to [5, 97]", () => {
    expect(hitChanceTuned(999, 0)).toBe(97);
    expect(hitChanceTuned(0, 999)).toBe(5);
  });
});

// ---- RNG injection makes combat deterministic ----
describe("determinism via injected RNG", () => {
  it("diceroll reproduces with a fixed rng", () => {
    const fixed = () => 0.5;
    expect(diceroll("3d6", fixed)).toBe(diceroll("3d6", fixed));
  });
  it("d1 dice clamp to 1 each", () => {
    expect(diceroll("4d1")).toBe(4);
  });
  it("resolveSmash is reproducible with a fixed rng", () => {
    const aldric = makeCreature("Aldric", { strength: 5, vitality: 5, dexterity: 5, intelligence: 5 }, 1, { name: "club", damage: "1d4", accuracy: "1d6" });
    const skel = makeCreature("Esqueleto", { strength: 4, vitality: 4, dexterity: 4, intelligence: 3 }, 1, { name: "rusty sword", damage: "1d5", accuracy: "1d4" }, ["undead"]);
    const r1 = resolveSmash(aldric, skel, undefined, () => 0.5);
    const r2 = resolveSmash(aldric, skel, undefined, () => 0.5);
    expect(r1).toEqual(r2);
  });
});

// ---- Model sanity ----
describe("creature model", () => {
  it("derives hp/energy from characteristics", () => {
    const c = makeCreature("Aldric", { strength: 5, vitality: 5, dexterity: 5, intelligence: 5 }, 1, { name: "club", damage: "1d4", accuracy: "1d6" });
    expect(c.maxHp).toBe(98);
    expect(c.maxEnergy).toBe(6);
    expect(c.regen).toBe(2);
  });
  it("initiative orders by dexterity desc", () => {
    const slow = makeCreature("Slow", { strength: 5, vitality: 5, dexterity: 2, intelligence: 5 }, 1, { name: "w", damage: "1d4", accuracy: "1d6" });
    const fast = makeCreature("Fast", { strength: 5, vitality: 5, dexterity: 8, intelligence: 5 }, 1, { name: "w", damage: "1d4", accuracy: "1d6" });
    expect(initiativeOrder([slow, fast])[0].name).toBe("Fast");
  });
});

// ---- Habilidades portadas (paridad con Python) ----
describe("abilities parity vs Python", () => {
  const target = dummy({ vitality: 4, intelligence: 3 }); // sin armadura
  const armored = dummy({ vitality: 4, intelligence: 3 }, ["armor"]);
  it("crush damage scales with vitality", () => {
    expect(ABILITIES.crush.damage(chars({ strength: 6, vitality: 8 }), target, 4)).toBe(48);
    expect(ABILITIES.crush.damage(chars({ strength: 6, vitality: 3 }), target, 4)).toBe(24);
  });
  it("stab damage: unarmored bonus", () => {
    expect(ABILITIES.stab.damage(chars({ strength: 5 }), target, 4)).toBe(21);
    expect(ABILITIES.stab.damage(chars({ strength: 5 }), armored, 4)).toBe(20);
  });
  it("quick_stab half strength; bash flat strength", () => {
    expect(ABILITIES.quick_stab.damage(chars({ strength: 6 }), target, 4)).toBe(12);
    expect(ABILITIES.bash.damage(chars({ strength: 6 }), target, 4)).toBe(6);
  });
  it("effect chances", () => {
    expect(ABILITIES.stab.effect!.chance(chars({ intelligence: 5, dexterity: 5 }), target)).toBe(19.5);
    expect(ABILITIES.cut.effect!.chance(chars({ intelligence: 5, dexterity: 5 }), target)).toBe(21);
  });
});

describe("pain debuff via effective characteristics", () => {
  it("lowers str/dex/int while active", () => {
    const c = dummy({ strength: 6, dexterity: 6, intelligence: 6 });
    c.modifiers.push(pain());
    const e = effectiveCharacteristics(c);
    expect(e.strength).toBe(4);      // -2
    expect(e.dexterity).toBe(5);     // -1
    expect(e.intelligence).toBe(3);  // -3
  });
});

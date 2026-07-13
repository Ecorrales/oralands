// Datos de app (armas de arranque, etiquetas de stats). No es lógica del motor.
import type { Characteristics, Weapon } from "../engine";

export interface WeaponOpt {
  id: string; name: string; damage: string; accuracy: string;
  abilities: string[]; req: Partial<Characteristics>; note: string; price: number;
}

export interface ArmorOpt {
  id: string; name: string; tag: "armor" | "heavy armor";
  req: Partial<Characteristics>; note: string; price: number;
}

// Solo armas débiles al inicio; las fuertes y la armadura son botín.
export const STARTER_WEAPONS: WeaponOpt[] = [
  { id: "club",   name: "Garrote", damage: "1d4", accuracy: "1d6", abilities: ["smash"], req: {}, note: "contundente", price: 12 },
  { id: "dagger", name: "Daga",    damage: "1d3", accuracy: "1d6", abilities: ["quick_stab", "quick_cut"], req: {}, note: "rápida, ligera", price: 12 },
  { id: "sword",  name: "Espada",  damage: "2d4", accuracy: "2d5", abilities: ["cut", "stab"], req: { strength: 5, dexterity: 5 }, note: "versátil", price: 45 },
];

export const STAT_KEYS: (keyof Characteristics)[] = ["strength", "vitality", "dexterity", "intelligence"];
export const STAT_ES: Record<string, string> = {
  strength: "Fuerza", vitality: "Vitalidad", dexterity: "Destreza", intelligence: "Inteligencia",
};
export const STAT_BUDGET = 20;
export const STAT_MIN = 1;
export const STAT_MAX = 10;

export const reqMet = (req: Partial<Characteristics>, s: Characteristics): boolean =>
  STAT_KEYS.every((k) => (req[k] ?? 0) <= s[k]);

export interface WeaponStack { item: WeaponOpt; qty: number; }

/** Agrupa armas repetidas por id, con su cantidad. */
export function groupWeapons(list: WeaponOpt[]): WeaponStack[] {
  const map = new Map<string, WeaponStack>();
  const out: WeaponStack[] = [];
  for (const w of list) {
    const g = map.get(w.id);
    if (g) g.qty++;
    else { const ng: WeaponStack = { item: w, qty: 1 }; map.set(w.id, ng); out.push(ng); }
  }
  return out;
}

/** Convierte un item del catálogo en el arma equipable del motor. */
export const toWeapon = (o: WeaponOpt): Weapon => ({ id: o.id, name: o.name, damage: o.damage, accuracy: o.accuracy, abilities: o.abilities });

// Utilizables
export const STARTING_POTIONS = 2;
export const POTION_HEAL_FRACTION = 0.4; // cura 40% de la vida máx, al instante
export const POTION_COST = 2;             // energía que cuesta beber (compite con atacar)

// ---- Tienda (lo simple) ----
export const POTION_PRICE = 40;
export const sellValue = (w: WeaponOpt): number => Math.floor((Number.isFinite(w.price) ? w.price : 10) * 0.5);

export const SHOP_WEAPONS: WeaponOpt[] = [
  { id: "club",   name: "Garrote", damage: "1d4", accuracy: "1d6", abilities: ["smash"], req: {}, note: "contundente", price: 12 },
  { id: "dagger", name: "Daga",    damage: "1d3", accuracy: "1d6", abilities: ["quick_stab", "quick_cut"], req: {}, note: "rápida", price: 12 },
  { id: "rapier", name: "Estoque", damage: "1d6", accuracy: "3d5", abilities: ["stab", "quick_stab"], req: { dexterity: 7 }, note: "precisa", price: 35 },
  { id: "sword",  name: "Espada",  damage: "2d4", accuracy: "2d5", abilities: ["cut", "stab"], req: { strength: 5, dexterity: 5 }, note: "versátil", price: 45 },
];
// Armaduras básicas (ligeras). Las pesadas/finas son de forja o botín.
export const SHOP_ARMORS: ArmorOpt[] = [
  { id: "leather",    name: "Casaca de cuero", tag: "armor", req: {}, note: "protección ligera", price: 40 },
  { id: "brigandine", name: "Brigantina",      tag: "armor", req: { strength: 5 }, note: "protección reforzada", price: 85 },
];

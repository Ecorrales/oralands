// Sistema de ranuras de equipo (fiel al motor, ampliado). Defensa/evasión suman de todas
// las piezas; los ítems otorgan habilidades y ± características. Listo para llenar cualquier
// ranura solo con datos nuevos (anillos, cascos, etc.).
import type { Characteristics, Creature } from "../engine";

export type EquipSlot = "head" | "chest" | "gloves" | "legs" | "boots" | "mainhand" | "offhand" | "amulet";

export const SLOT_ES: Record<EquipSlot, string> = {
  head: "Casco", chest: "Pecho", gloves: "Guantes", legs: "Piernas", boots: "Botas",
  mainhand: "Mano derecha", offhand: "Mano izquierda", amulet: "Amuleto",
};
// filas del panel: armadura (5) · manos (2) · amuleto (1)
export const SLOT_ROWS: EquipSlot[][] = [
  ["head", "chest", "gloves", "legs", "boots"],
  ["mainhand", "offhand"],
  ["amulet"],
];

export interface GearItem {
  id: string; name: string; slot: EquipSlot;
  defense?: number; evasion?: number;
  tag?: "armor" | "heavy armor";
  abilities?: string[];
  statChange?: Partial<Characteristics>;
  req: Partial<Characteristics>;
  note: string; price: number;
}

// --- Escudos (mano izquierda) ---
export const SHIELDS: GearItem[] = [
  { id: "buckler", name: "Rodela",           slot: "offhand", defense: 2, evasion: 1,  abilities: ["bash"], req: {}, note: "escudo pequeño; permite embestir", price: 30 },
  { id: "targe",   name: "Escudo redondo",   slot: "offhand", defense: 5, evasion: -2, req: { strength: 5 }, note: "buena protección, algo torpe", price: 60 },
  { id: "tower",   name: "Escudo de torre",  slot: "offhand", defense: 9, evasion: -5, statChange: { dexterity: -2 }, req: { strength: 6 }, note: "máxima defensa, muy pesado", price: 110 },
];

// --- Armaduras de pecho (tienda) ---
export const SHOP_ARMOR: GearItem[] = [
  { id: "leather",    name: "Casaca de cuero", slot: "chest", defense: 2, tag: "armor", req: {}, note: "protección ligera", price: 40 },
  { id: "brigandine", name: "Brigantina",      slot: "chest", defense: 4, tag: "armor", req: { strength: 5 }, note: "protección reforzada", price: 85 },
];

// --- Armaduras de pecho (forja) ---
export const FORGE_ARMOR: GearItem[] = [
  { id: "chainmail", name: "Cota de malla",    slot: "chest", defense: 6, tag: "heavy armor", req: { strength: 6 }, note: "pesada: resiste sangrado/dolor, torpe", price: 150 },
  { id: "plate",     name: "Coraza de placas", slot: "chest", defense: 9, tag: "heavy armor", req: { strength: 7 }, note: "la mejor defensa", price: 260 },
];

export const ALL_GEAR: GearItem[] = [...SHIELDS, ...SHOP_ARMOR, ...FORGE_ARMOR];
const byId = new Map(ALL_GEAR.map((g) => [g.id, g]));
export const gearById = (id: string): GearItem | undefined => byId.get(id);

export interface GearDerived {
  defense: number; evasionBonus: number; grantedAbilities: string[];
  statMods: Partial<Characteristics>; tags: string[];
}

export function deriveGear(items: GearItem[]): GearDerived {
  let defense = 0, evasionBonus = 0;
  const grantedAbilities: string[] = [];
  const statMods: Partial<Characteristics> = {};
  const tags: string[] = [];
  for (const it of items) {
    defense += it.defense ?? 0;
    evasionBonus += it.evasion ?? 0;
    if (it.abilities) for (const a of it.abilities) if (!grantedAbilities.includes(a)) grantedAbilities.push(a);
    if (it.statChange) for (const k of Object.keys(it.statChange) as (keyof Characteristics)[]) statMods[k] = (statMods[k] ?? 0) + (it.statChange[k] ?? 0);
    if (it.tag && !tags.includes(it.tag)) tags.push(it.tag);
  }
  return { defense, evasionBonus, grantedAbilities, statMods, tags };
}

/** Aplica el equipo a una criatura: devuelve copia con defensa/evasión/habilidades/tags derivados. */
export function applyGear(c: Creature, items: GearItem[]): Creature {
  const d = deriveGear(items);
  return { ...c, defense: d.defense, evasionBonus: d.evasionBonus, grantedAbilities: d.grantedAbilities, statMods: d.statMods, tags: d.tags };
}

export const reqMetGear = (g: GearItem, ch: Characteristics): boolean =>
  (Object.keys(g.req) as (keyof Characteristics)[]).every((k) => (g.req[k] ?? 0) <= ch[k]);

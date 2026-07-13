// Herrería: entregas materiales (escombros + partes de monstruo) + oro para forjar
// equipo top que la tienda no vende.
import { reqMet, type WeaponOpt } from "./catalog";
import type { Characteristics } from "../engine";
import { FORGE_ARMOR, type GearItem } from "./gear";
import { matName, type Mats } from "./materials";

export interface MatReq { id: string; qty: number; }
export interface Recipe {
  id: string; name: string; kind: "weapon" | "armor";
  weapon?: WeaponOpt; gear?: GearItem;
  gold: number; materials: MatReq[]; note: string;
}

const FORGE_WEAPONS: Record<string, WeaponOpt> = {
  greatsword: { id: "greatsword", name: "Mandoble carmesí", damage: "2d6", accuracy: "2d5", abilities: ["cut", "crush"], req: { strength: 8, dexterity: 6 }, note: "acero de doble filo · dos manos", price: 120, twoHanded: true },
  executioner: { id: "executioner", name: "Martillo del verdugo", damage: "3d6", accuracy: "1d6", abilities: ["crush", "bash"], req: { strength: 10 }, note: "demoledor absoluto · dos manos", price: 160, twoHanded: true },
  voidrapier: { id: "voidrapier", name: "Estoque del vacío", damage: "2d6", accuracy: "3d6", abilities: ["stab", "quick_stab"], req: { dexterity: 10 }, note: "precisión letal", price: 130 },
};

export const RECIPES: Recipe[] = [
  { id: "greatsword",  name: "Mandoble carmesí",     kind: "weapon", weapon: FORGE_WEAPONS.greatsword,  gold: 200, note: "arma pesada versátil",           materials: [{ id: "steel", qty: 6 }, { id: "wood", qty: 3 }] },
  { id: "executioner", name: "Martillo del verdugo", kind: "weapon", weapon: FORGE_WEAPONS.executioner, gold: 280, note: "la máxima pegada contundente",     materials: [{ id: "steel", qty: 8 }, { id: "stone", qty: 4 }] },
  { id: "voidrapier",  name: "Estoque del vacío",    kind: "weapon", weapon: FORGE_WEAPONS.voidrapier,  gold: 220, note: "para builds de destreza pura",     materials: [{ id: "steel", qty: 5 }, { id: "fang", qty: 3 }] },
  { id: "chainmail",   name: "Cota de malla",        kind: "armor",  gear: FORGE_ARMOR.find((g) => g.id === "chainmail"), gold: 240, note: "armadura pesada",     materials: [{ id: "steel", qty: 9 }] },
  { id: "plate",       name: "Coraza de placas",     kind: "armor",  gear: FORGE_ARMOR.find((g) => g.id === "plate"),     gold: 360, note: "la mejor defensa",       materials: [{ id: "steel", qty: 15 }, { id: "stone", qty: 5 }] },
];

export const ALL_FORGE_WEAPONS: WeaponOpt[] = Object.values(FORGE_WEAPONS);
export const matReqLabel = (m: MatReq): string => `${matName(m.id)} ×${m.qty}`;

export interface ForgeCheck { gold: boolean; mats: boolean; req: boolean; ok: boolean; }
export function canForge(r: Recipe, gold: number, materials: Mats, ch: Characteristics): ForgeCheck {
  const mats = r.materials.every((m) => (materials[m.id] ?? 0) >= m.qty);
  const goldOk = gold >= r.gold;
  const req = r.kind === "armor" && r.gear ? reqMet(r.gear.req, ch) : true;
  return { gold: goldOk, mats, req, ok: goldOk && mats && req };
}

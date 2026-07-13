// Herrería: entregas armas (materiales) + oro para forjar equipo top que la tienda no vende.
import { reqMet, type WeaponOpt, type ArmorOpt } from "./catalog";
import type { Characteristics } from "../engine";

export interface Material { id: string; name: string; qty: number; }
export interface Recipe {
  id: string; name: string; kind: "weapon" | "armor";
  weapon?: WeaponOpt; armor?: ArmorOpt;
  gold: number; materials: Material[]; note: string;
}

// Armas forjables (mejores que cualquier cosa de tienda o botín).
const FORGE_WEAPONS: Record<string, WeaponOpt> = {
  greatsword: { id: "greatsword", name: "Mandoble carmesí", damage: "3d5", accuracy: "2d5", abilities: ["cut", "crush"], req: { strength: 6, dexterity: 5 }, note: "acero de doble filo", price: 120 },
  executioner: { id: "executioner", name: "Martillo del verdugo", damage: "3d6", accuracy: "1d6", abilities: ["crush", "bash"], req: { strength: 7 }, note: "demoledor absoluto", price: 160 },
  voidrapier: { id: "voidrapier", name: "Estoque del vacío", damage: "2d6", accuracy: "3d6", abilities: ["stab", "quick_stab"], req: { dexterity: 8 }, note: "precisión letal", price: 130 },
};
const FORGE_ARMORS: Record<string, ArmorOpt> = {
  chainmail: { id: "chainmail", name: "Cota de malla", tag: "heavy armor", req: { strength: 6 }, note: "resiste sangrado/dolor; más fácil de derribar", price: 150 },
  plate: { id: "plate", name: "Coraza de placas", tag: "heavy armor", req: { strength: 7 }, note: "máxima protección contra cortes", price: 260 },
};

export const RECIPES: Recipe[] = [
  { id: "greatsword", name: "Mandoble carmesí", kind: "weapon", weapon: FORGE_WEAPONS.greatsword, gold: 150, note: "arma pesada versátil", materials: [{ id: "sword", name: "Espada", qty: 2 }, { id: "sabre", name: "Sable", qty: 1 }] },
  { id: "executioner", name: "Martillo del verdugo", kind: "weapon", weapon: FORGE_WEAPONS.executioner, gold: 200, note: "la máxima pegada contundente", materials: [{ id: "mace", name: "Maza", qty: 3 }] },
  { id: "voidrapier", name: "Estoque del vacío", kind: "weapon", weapon: FORGE_WEAPONS.voidrapier, gold: 160, note: "para builds de destreza pura", materials: [{ id: "rapier", name: "Estoque", qty: 3 }] },
  { id: "chainmail", name: "Cota de malla", kind: "armor", armor: FORGE_ARMORS.chainmail, gold: 180, note: "armadura pesada", materials: [{ id: "mace", name: "Maza", qty: 2 }] },
  { id: "plate", name: "Coraza de placas", kind: "armor", armor: FORGE_ARMORS.plate, gold: 260, note: "la mejor defensa", materials: [{ id: "sabre", name: "Sable", qty: 3 }] },
];

export const ALL_FORGE_WEAPONS: WeaponOpt[] = Object.values(FORGE_WEAPONS);

export const countById = (inv: WeaponOpt[]): Record<string, number> =>
  inv.reduce((m, w) => { m[w.id] = (m[w.id] || 0) + 1; return m; }, {} as Record<string, number>);

export interface ForgeCheck { gold: boolean; mats: boolean; req: boolean; ok: boolean; }
export function canForge(r: Recipe, gold: number, inv: WeaponOpt[], ch: Characteristics): ForgeCheck {
  const counts = countById(inv);
  const mats = r.materials.every((m) => (counts[m.id] || 0) >= m.qty);
  const goldOk = gold >= r.gold;
  const req = r.kind === "armor" && r.armor ? reqMet(r.armor.req, ch) : true;
  return { gold: goldOk, mats, req, ok: goldOk && mats && req };
}

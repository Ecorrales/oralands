// Tablas de botín. Oro por enemigo + drops de arma, escalando con profundidad.
import type { WeaponOpt } from "./catalog";

export function goldForEnemy(depth: number): number {
  return 3 + depth * 2 + Math.floor(Math.random() * 6);
}

// Armas de botín (las fuertes que no están al crear el personaje).
export const LOOT_WEAPONS: WeaponOpt[] = [
  { id: "mace",      name: "Maza",                damage: "2d5", accuracy: "2d5", abilities: ["smash", "bash"], req: { strength: 6 }, note: "contundente", price: 55 },
  { id: "sabre",     name: "Sable",               damage: "2d5", accuracy: "2d6", abilities: ["cut", "stab"], req: { strength: 5, dexterity: 6 }, note: "afilado", price: 55 },
  { id: "rapier",    name: "Estoque",             damage: "1d6", accuracy: "3d5", abilities: ["stab", "quick_stab"], req: { dexterity: 7 }, note: "precisa", price: 35 },
  { id: "warhammer", name: "Martillo de guerra",  damage: "2d6", accuracy: "1d6", abilities: ["crush", "smash"], req: { strength: 7 }, note: "demoledor", price: 90 },
];

/** Probabilidad de drop crece con la profundidad. Devuelve arma o null. */
export function rollWeaponDrop(depth: number): WeaponOpt | null {
  const chance = 0.18 + depth * 0.05;
  if (Math.random() > chance) return null;
  return LOOT_WEAPONS[Math.floor(Math.random() * LOOT_WEAPONS.length)];
}

// Tablas de botín. Oro por enemigo + drops de arma, escalando con profundidad.
import type { WeaponOpt } from "./catalog";

// No todos los enemigos sueltan oro. Los animales rara vez cargan monedas —su valor son
// sus materiales, que vendes—; los no-muertos y humanoides sí traen algo. Esto empuja la
// economía a apoyarse también en vender botín y materiales, no solo en oro directo.
export function goldDropChance(kind: "undead" | "rodent" | "beast"): number {
  return kind === "undead" ? 0.65 : kind === "rodent" ? 0.10 : 0.15;
}

// Oro por enemigo: crece con la profundidad pero SUBLINEAL (raíz), para que el inicio
// siga siendo escaso y lo hondo no se vuelva una lluvia de oro. Dial de economía.
export function goldForEnemy(depth: number): number {
  return 2 + Math.floor(4 * Math.sqrt(depth)) + Math.floor(Math.random() * 4);
}

// Armas de botín (las fuertes que no están al crear el personaje).
export const LOOT_WEAPONS: WeaponOpt[] = [
  { id: "mace",      name: "Maza",                damage: "2d5", accuracy: "2d5", abilities: ["smash", "bash"], req: { strength: 6 }, note: "contundente", price: 55 },
  { id: "sabre",     name: "Sable",               damage: "2d5", accuracy: "2d6", abilities: ["cut", "stab"], req: { strength: 5, dexterity: 6 }, note: "afilado", price: 55 },
  { id: "rapier",    name: "Estoque",             damage: "1d6", accuracy: "3d5", abilities: ["stab", "quick_stab"], req: { dexterity: 7 }, note: "precisa", price: 35 },
  { id: "warhammer", name: "Martillo de guerra",  damage: "2d6", accuracy: "1d6", abilities: ["crush", "smash"], req: { strength: 7 }, note: "demoledor · dos manos", price: 90, twoHanded: true },
];

/** Probabilidad de drop crece con la profundidad. Devuelve arma o null. */
export function rollWeaponDrop(depth: number): WeaponOpt | null {
  const chance = 0.18 + depth * 0.05;
  if (Math.random() > chance) return null;
  return LOOT_WEAPONS[Math.floor(Math.random() * LOOT_WEAPONS.length)];
}

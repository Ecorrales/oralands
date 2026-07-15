// Tipos de calabozo. Al entrar se elige uno al azar con probabilidad PAREJA (1/N):
// con 4 tipos, 25% cada uno; con 3, 33.3%; etc. Cada tipo define qué enemigos aparecen
// y su ambiente. Agregar/quitar tipos reajusta la probabilidad solo.
import type { EnemyKind } from "./enemies";

export type Biome = "cripta" | "madriguera" | "cueva" | "ruinas";

export interface DungeonType {
  id: string;
  name: string;    // nombre completo
  short: string;   // etiqueta corta (barra de la cripta)
  desc: string;    // una línea de ambiente
  kinds: EnemyKind[];
  biome: Biome;
  minLevel: number; // nivel de personaje para desbloquear esta mazmorra
}

export const DUNGEON_TYPES: DungeonType[] = [
  { id: "cripta",     name: "Cripta olvidada",      short: "Cripta",     desc: "Pasillos de piedra tomados por los no-muertos.",        kinds: ["undead"],                     biome: "cripta",     minLevel: 1 },
  { id: "madriguera", name: "Madriguera infestada", short: "Madriguera", desc: "Túneles de tierra donde pululan las alimañas.",         kinds: ["rodent"],                     biome: "madriguera", minLevel: 1 },
  { id: "guarida",    name: "Guarida salvaje",      short: "Guarida",    desc: "Cuevas húmedas donde acechan las bestias.",             kinds: ["beast"],                      biome: "cueva",      minLevel: 6 },
  { id: "ruinas",     name: "Ruinas profundas",     short: "Ruinas",     desc: "Ruinas antiguas donde se mezclan todas las amenazas.",  kinds: ["undead", "rodent", "beast"],  biome: "ruinas",     minLevel: 10 },
];

/** Elige un calabozo al azar con probabilidad pareja (1/N). */
export const pickDungeon = (): DungeonType =>
  DUNGEON_TYPES[Math.floor(Math.random() * DUNGEON_TYPES.length)];

export const dungeonById = (id: string): DungeonType =>
  DUNGEON_TYPES.find((d) => d.id === id) ?? DUNGEON_TYPES[0];

/** Probabilidad de cada calabozo (para mostrar en UI si se desea). */
export const dungeonChance = (): number => 1 / DUNGEON_TYPES.length;

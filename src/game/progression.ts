// Experiencia y subida de nivel.
import { recomputeDerived, type Creature } from "../engine";

/** XP total para pasar del nivel actual al siguiente.
 *  Cuadrática: casi no afecta niveles bajos, pero empina fuerte en los altos
 *  para que las bajadas hondas no exploten la progresión. Dial de balance. */
export const xpToNext = (level: number): number => 40 + level * 30 + level * level * 8;

/** XP que da un enemigo según la profundidad de la sala. */
export const xpForEnemy = (depth: number): number => 8 + depth * 4;

export const POINTS_PER_LEVEL = 2;

export interface XpResult { xp: number; points: number; leveled: number[]; }

/** Aplica XP al jugador (muta nivel + derivados). Devuelve xp restante, puntos y niveles ganados. */
export function gainXp(player: Creature, xp: number, points: number, amount: number): XpResult {
  xp += amount;
  const leveled: number[] = [];
  while (xp >= xpToNext(player.level)) {
    xp -= xpToNext(player.level);
    player.level += 1;
    points += POINTS_PER_LEVEL;
    leveled.push(player.level);
  }
  recomputeDerived(player);
  return { xp, points, leveled };
}

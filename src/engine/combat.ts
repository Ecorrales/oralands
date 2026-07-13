// Turn orchestration helpers.
import { Creature } from "./creature";

/**
 * Initiative: placeholder ordering by dexterity (desc).
 * The original engine's exact turn-queue will be ported later; this is a
 * stable, deterministic stand-in for the vertical slice.
 */
export function initiativeOrder(creatures: Creature[]): Creature[] {
  return [...creatures].sort((a, b) => b.characteristics.dexterity - a.characteristics.dexterity);
}

export const isDead = (c: Creature): boolean => c.hp <= 0;

export function regenEnergy(c: Creature): void {
  c.energy = Math.min(c.maxEnergy, c.energy + c.regen);
}

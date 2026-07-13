// Derived stats — all stats come from the four characteristics + level.
import { clamp } from "./dice";

export interface Characteristics {
  strength: number;
  vitality: number;
  dexterity: number;
  intelligence: number;
}

export function getHealthForLevel(vitality: number, level: number): number {
  return Math.trunc(vitality * 10 + (vitality + level) * Math.log(clamp(vitality, 1.5, 10)) * 5);
}

export function maxEnergy(strength: number, level: number): number {
  return strength + Math.trunc(level / 20);
}

export function energyRegen(strength: number, level: number): number {
  return clamp(Math.trunc(strength / 3) + Math.trunc(level / 20), 2, 6);
}

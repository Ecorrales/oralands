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

// Energía como stat propio (desatada de la fuerza). Base 6, máximo 12.
// Subir de energía cuesta puntos de forma incremental: 6→7 cuesta 1, 7→8 cuesta 2, … 11→12 cuesta 6.
export const ENERGY_BASE = 6;
export const ENERGY_MAX = 12;

/** Costo en puntos para subir de `current` al siguiente punto de energía (válido 6..11). */
export function energyRaiseCost(current: number): number {
  return current - 5;   // 6→7:1, 7→8:2, …, 11→12:6
}

/** Puntos totales gastados para haber llegado a `energyMax` desde la base (para migración/UI). */
export function energySpent(energyMax: number): number {
  let total = 0;
  for (let e = ENERGY_BASE; e < energyMax; e++) total += energyRaiseCost(e);
  return total;
}

export function energyRegen(strength: number, level: number): number {
  return clamp(Math.trunc(strength / 3) + Math.trunc(level / 20), 2, 6);
}

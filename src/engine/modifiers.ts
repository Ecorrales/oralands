// Efectos con duración. Tres tipos:
//  - skip: pierdes el turno (knockdown)
//  - dot:  daño por turno (bleeding, burning) — dmg fijo o dado (dotSpec)
//  - stat: modifica características mientras dura (pain baja str/dex/int)
import type { Characteristics } from "./stats";
// (clamp ya no se usa tras el cambio de sangrado)

export type ModifierKind = "skip" | "dot" | "stat";

export interface Modifier {
  name: string;
  label: string;              // UI (es)
  kind: ModifierKind;
  duration: number;           // turnos restantes
  dmg?: number;               // dot: daño fijo por turno
  dotSpec?: string;           // dot: tirada por turno (ej "2d4"); tiene prioridad sobre dmg
  statChange?: Partial<Characteristics>; // stat: cambios a características
  crit?: boolean;             // dot: marca de sangrado crítico ("corte profundo")
}

export const knockdown = (): Modifier => ({ name: "knockdown", label: "aturdido", kind: "skip", duration: 1 });

// Sangrado: % de vida MÁXIMA del que sangra, por turno, durante turnos fijos.
// Escala solo por diseño — proporcional al enemigo, nunca rebasa su vida (adiós al 3484 en 2709).
// 15% de las veces sale un SANGRADO CRÍTICO ("corte profundo"): 8% por turno en vez de 5%.
const BLEED_PCT = 0.05;         // 5% de la vida máxima por turno (apoyo)
const BLEED_CRIT_PCT = 0.08;    // 8% por turno en el crítico
const BLEED_CRIT_CHANCE = 0.15; // probabilidad de corte profundo
const BLEED_TURNS = 4;          // → 20% (o 32% en crítico) de la vida total
export function bleeding(host: { maxHp: number }): Modifier {
  const crit = Math.random() < BLEED_CRIT_CHANCE;
  const perTurn = Math.max(1, Math.round(host.maxHp * (crit ? BLEED_CRIT_PCT : BLEED_PCT)));
  return {
    name: crit ? "bleeding_crit" : "bleeding",
    label: crit ? "corte profundo" : "sangrado",
    kind: "dot", duration: BLEED_TURNS, dmg: perTurn, crit,
  };
}

// Dolor: fiel al motor — debuff de características por 2 turnos (no es daño).
export const pain = (): Modifier => ({ name: "pain", label: "dolor", kind: "stat", duration: 2, statChange: { strength: -2, dexterity: -1, intelligence: -3 } });

export const burning = (dmg = 4, duration = 2): Modifier => ({ name: "burning", label: "quema", kind: "dot", duration, dmg });

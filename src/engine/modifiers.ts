// Efectos con duración. Tres tipos:
//  - skip: pierdes el turno (knockdown)
//  - dot:  daño por turno (bleeding, burning) — dmg fijo o dado (dotSpec)
//  - stat: modifica características mientras dura (pain baja str/dex/int)
import type { Characteristics } from "./stats";
import { clamp } from "./dice";

export type ModifierKind = "skip" | "dot" | "stat";

export interface Modifier {
  name: string;
  label: string;              // UI (es)
  kind: ModifierKind;
  duration: number;           // turnos restantes
  dmg?: number;               // dot: daño fijo por turno
  dotSpec?: string;           // dot: tirada por turno (ej "2d4"); tiene prioridad sobre dmg
  statChange?: Partial<Characteristics>; // stat: cambios a características
}

export const knockdown = (): Modifier => ({ name: "knockdown", label: "aturdido", kind: "skip", duration: 1 });

// Sangrado: fiel al motor — daño = (vit/2)d(vit) del que sangra, dura clamp(10-vit,3,8).
export function bleeding(host: { characteristics: Characteristics }): Modifier {
  const vit = host.characteristics.vitality;
  return { name: "bleeding", label: "sangrado", kind: "dot", duration: clamp(10 - vit, 3, 8), dotSpec: `${Math.max(1, Math.floor(vit / 2))}d${Math.max(1, vit)}` };
}

// Dolor: fiel al motor — debuff de características por 2 turnos (no es daño).
export const pain = (): Modifier => ({ name: "pain", label: "dolor", kind: "stat", duration: 2, statChange: { strength: -2, dexterity: -1, intelligence: -3 } });

export const burning = (dmg = 4, duration = 2): Modifier => ({ name: "burning", label: "quema", kind: "dot", duration, dmg });

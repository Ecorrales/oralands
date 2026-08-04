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

// familia de un efecto: bleeding y bleeding_crit son el MISMO efecto (quita el sufijo _crit)
const modFamily = (m: Modifier): string => m.name.replace(/_crit$/, "");

/**
 * Aplica efectos SIN apilar: una sola instancia por familia (stun, sangrado, dolor, quema…).
 * Re-aplicar REFRESCA la duración (a la mayor) y conserva la intensidad MÁS FUERTE.
 * Nunca acumula daño ni degrada → imposible de explotar (spammear solo mantiene el efecto vivo).
 */
export function applyModifiers(target: { modifiers: Modifier[] }, incoming: Modifier[]): void {
  if (!Array.isArray(target.modifiers)) target.modifiers = [];
  for (const m of incoming) {
    const fam = modFamily(m);
    const existing = target.modifiers.find((x) => modFamily(x) === fam);
    if (!existing) { target.modifiers.push({ ...m }); continue; }
    existing.duration = Math.max(existing.duration, m.duration);   // refresca la duración
    if (m.kind === "dot") {                                        // conserva el sangrado/quema más fuerte
      if ((m.dmg ?? 0) > (existing.dmg ?? 0)) {
        existing.dmg = m.dmg; existing.dotSpec = m.dotSpec;
        existing.name = m.name; existing.label = m.label; existing.crit = m.crit;
      }
    }
    // skip (aturdido) y stat (dolor): solo se refresca la duración; su magnitud es fija por efecto.
  }
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

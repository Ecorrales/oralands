// Fuente de verdad para EXPLICAR los efectos de las armas (aturdido, dolor, sangrado, quema).
// Data-driven: lee el efecto real del motor. Con enemigo enfrente → números exactos;
// sin enemigo (ficha del arma) → explica la mecánica.
import { getAbility } from "../engine/abilities";
import { effectiveCharacteristics, type Creature } from "../engine";
import { getLang } from "./i18n";

const ES = getLang() === "es";
const STAT: Record<string, string> = ES
  ? { strength: "Fuerza", dexterity: "Destreza", intelligence: "Inteligencia", vitality: "Vitalidad" }
  : { strength: "Strength", dexterity: "Dexterity", intelligence: "Intelligence", vitality: "Vitality" };

/** Promedio de una tirada "XdY" (X·(Y+1)/2). */
function diceAvg(spec: string): number {
  const m = /^(\d+)d(\d+)$/.exec(spec);
  if (!m) return 0;
  return (+m[1] * (+m[2] + 1)) / 2;
}

function statList(change: Record<string, number>): string {
  return Object.entries(change)
    .map(([k, v]) => `${v > 0 ? "+" : "−"}${Math.abs(v)} ${STAT[k] ?? k}`)
    .join(", ");
}

export interface EffectInfo {
  label: string;   // "sangrado" / "bleeding"
  title: string;   // título del tooltip
  body: string;    // explicación (con números si hay enemigo)
  chance?: number; // % de aplicar (solo si hay enemigo)
}

/**
 * Explica el efecto de una habilidad. `user` = quien ataca; `target` opcional:
 * si viene, calcula números exactos contra ESE enemigo; si no, explica la mecánica.
 */
export function explainEffect(abilityId: string, user: Creature, target?: Creature): EffectInfo | null {
  const ab = getAbility(abilityId);
  if (!ab?.effect) return null;
  const es = getLang() === "es";
  const label = ab.effect.label;

  // probabilidad real (necesita enemigo)
  const chance = target ? Math.round(ab.effect.chance(effectiveCharacteristics(user), target)) : undefined;
  const chanceLine = (c: number) => (es ? ` Probabilidad: ${c}%.` : ` Chance: ${c}%.`);

  // el modificador concreto (para sangrado necesita el enemigo por su vitalidad)
  const mod = target ? ab.effect.make(target) : null;

  let title = ""; let body = "";

  switch (ab.effect.name) {
    case "knockdown": {
      title = es ? "Aturdido" : "Stunned";
      body = es
        ? "Si el golpe conecta, el enemigo pierde su próximo turno."
        : "If the blow lands, the enemy loses its next turn.";
      if (chance !== undefined) body += chanceLine(chance);
      else body += es
        ? " Más probable con tu Fuerza e Inteligencia; menos si el enemigo es ágil o va blindado."
        : " More likely with your Strength and Intelligence; less if the enemy is nimble or armored.";
      break;
    }
    case "pain": {
      title = es ? "Dolor" : "Pain";
      const chg = mod?.statChange ? statList(mod.statChange as Record<string, number>) : (es ? "−2 Fuerza, −1 Destreza, −3 Inteligencia" : "−2 Strength, −1 Dexterity, −3 Intelligence");
      const dur = mod?.duration ?? 2;
      body = es
        ? `Debilita al enemigo ${dur} turnos: ${chg}. Pega y atina peor (no es daño directo).`
        : `Weakens the enemy for ${dur} turns: ${chg}. It hits and aims worse (not direct damage).`;
      if (chance !== undefined) body += chanceLine(chance);
      else body += es ? " Más probable con tu Inteligencia y Destreza." : " More likely with your Intelligence and Dexterity.";
      break;
    }
    case "bleeding": {
      title = es ? "Sangrado" : "Bleeding";
      if (mod && (mod.dotSpec || mod.dmg)) {
        const perTurn = mod.dotSpec ? Math.round(diceAvg(mod.dotSpec)) : (mod.dmg ?? 0);
        const dur = mod.duration;
        body = es
          ? `Abre una herida: el enemigo pierde ~${perTurn} de vida por turno durante ${dur} turnos (≈${perTurn * dur} en total).`
          : `Opens a wound: the enemy loses ~${perTurn} HP per turn for ${dur} turns (≈${perTurn * dur} total).`;
        if (chance !== undefined) body += chanceLine(chance);
      } else {
        body = es
          ? "Abre una herida que sangra varios turnos. El daño por turno depende de la vitalidad del enemigo: mientras más vitalidad, sangra más fuerte pero por menos turnos."
          : "Opens a wound that bleeds for several turns. Damage per turn depends on the enemy's vitality: the tougher it is, the harder it bleeds but for fewer turns.";
      }
      break;
    }
    case "burning": {
      title = es ? "Quema" : "Burning";
      const perTurn = mod?.dmg ?? 4; const dur = mod?.duration ?? 2;
      body = es
        ? `Prende al enemigo: ~${perTurn} de vida por turno durante ${dur} turnos.`
        : `Sets the enemy ablaze: ~${perTurn} HP per turn for ${dur} turns.`;
      if (chance !== undefined) body += chanceLine(chance);
      break;
    }
    default:
      return null;
  }

  return { label, title, body, chance };
}

/**
 * Explica un MODIFICADOR ACTIVO sobre un enemigo (pill en combate).
 * Usa la duración RESTANTE real y el daño/turno concreto que ya lleva el modificador.
 */
export function explainModifier(mod: { name: string; label: string; kind: string; duration: number; dmg?: number; dotSpec?: string; statChange?: Record<string, number> }): EffectInfo {
  const es = getLang() === "es";
  const turns = mod.duration;
  const tWord = es ? (turns === 1 ? "turno" : "turnos") : (turns === 1 ? "turn" : "turns");
  let title = mod.label; let body = "";

  if (mod.kind === "skip") {
    title = es ? "Aturdido" : "Stunned";
    body = es ? `Pierde su próximo turno. Le queda ${turns} ${tWord}.`
              : `Loses its next turn. ${turns} ${tWord} left.`;
  } else if (mod.kind === "stat") {
    title = es ? "Dolor" : "Pain";
    const chg = mod.statChange ? statList(mod.statChange) : "";
    body = es ? `Debilitado: ${chg}. Pega y atina peor. Le quedan ${turns} ${tWord}.`
              : `Weakened: ${chg}. Hits and aims worse. ${turns} ${tWord} left.`;
  } else { // dot (sangrado / quema)
    const perTurn = mod.dotSpec ? Math.round(diceAvg(mod.dotSpec)) : (mod.dmg ?? 0);
    title = mod.name === "burning" ? (es ? "Quema" : "Burning") : (es ? "Sangrado" : "Bleeding");
    body = es
      ? `Pierde ~${perTurn} de vida por turno. Le quedan ${turns} ${tWord} (≈${perTurn * turns} más).`
      : `Loses ~${perTurn} HP per turn. ${turns} ${tWord} left (≈${perTurn * turns} more).`;
  }
  return { label: mod.label, title, body };
}

/** Efectos ÚNICOS de un arma (dedupe por efecto), con una habilidad representativa cada uno. */
export function weaponEffects(abilities: string[]): { abilityId: string; effect: string }[] {
  const seen = new Set<string>(); const out: { abilityId: string; effect: string }[] = [];
  for (const id of abilities ?? []) {
    const ab = getAbility(id);
    if (ab?.effect && !seen.has(ab.effect.name)) { seen.add(ab.effect.name); out.push({ abilityId: id, effect: ab.effect.name }); }
  }
  return out;
}

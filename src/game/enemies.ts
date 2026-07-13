// Generador de enemigos de mazmorra. Plantillas + escalado por profundidad.
import { makeCreature, type Creature, type Characteristics } from "../engine";

export type EnemyKind = "undead" | "rodent" | "beast";

interface Template {
  name: string;
  kind: EnemyKind;
  tags: string[];
  ch: Characteristics;
  weapon: { name: string; damage: string; accuracy: string; abilities: string[] };
}

const TEMPLATES: Template[] = [
  { name: "Esqueleto",    kind: "undead", tags: ["undead"],            ch: { strength: 4, vitality: 4, dexterity: 4, intelligence: 3 }, weapon: { name: "rusty sword", damage: "1d5", accuracy: "1d4", abilities: ["stab"] } },
  { name: "Rata gigante", kind: "rodent", tags: ["animal", "rodent"],  ch: { strength: 2, vitality: 3, dexterity: 5, intelligence: 1 }, weapon: { name: "teeth", damage: "1d3", accuracy: "1d5", abilities: ["quick_stab"] } },
  { name: "Lobo",         kind: "beast",  tags: ["animal"],            ch: { strength: 4, vitality: 4, dexterity: 6, intelligence: 2 }, weapon: { name: "fangs", damage: "1d5", accuracy: "2d5", abilities: ["cut"] } },
];

/** depth = índice de sala (0-based) escala características; level = etapa (nivel del enemigo).
 *  kinds = tipos de enemigo permitidos (según el calabozo); si se omite, cualquiera. */
export function makeDungeonEnemy(depth: number, level = 1, kinds?: EnemyKind[]): Creature {
  const pool = kinds && kinds.length ? TEMPLATES.filter((t) => kinds.includes(t.kind)) : TEMPLATES;
  const list = pool.length ? pool : TEMPLATES;
  const t = list[Math.floor(Math.random() * list.length)];
  const ch: Characteristics = {
    ...t.ch,
    strength: t.ch.strength + Math.floor(depth / 3),
    vitality: t.ch.vitality + Math.floor(depth / 2),
  };
  return makeCreature(t.name, ch, level, { ...t.weapon }, [...t.tags]);
}

/** Salas por bajada: 3..7 (como generaba el motor original). */
export const rollRoomCount = (): number => 3 + Math.floor(Math.random() * 5);

/** Tamaño de grupo por etapa: 1 en etapa 1, hasta 4 en etapas hondas, sesgado a grupos chicos. */
export function rollGroupSize(stage: number): number {
  const maxG = Math.min(4, 1 + Math.floor(stage / 2)); // e1→1, e2..3→2, e4..5→3, e6+→4
  let n = 1;
  for (let i = 1; i < maxG; i++) if (Math.random() < 0.5) n++;
  return n;
}

/** Grupo de enemigos para una sala. depth escala características; level = etapa. kinds = pool del calabozo. */
export function makeDungeonGroup(depth: number, stage: number, kinds?: EnemyKind[]): Creature[] {
  const n = rollGroupSize(stage);
  const group: Creature[] = [];
  const seen: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const e = makeDungeonEnemy(depth, stage, kinds);
    seen[e.name] = (seen[e.name] || 0) + 1;
    group.push(e);
  }
  // desambigua nombres repetidos (Rata gigante I / II) para poder elegir objetivo
  const idx: Record<string, number> = {};
  const roman = ["", " I", " II", " III", " IV"];
  for (const e of group) {
    if (seen[e.name] > 1) { idx[e.name] = (idx[e.name] || 0) + 1; e.name += roman[idx[e.name]] || ` ${idx[e.name]}`; }
  }
  return group;
}

/** Etiqueta corta de familia para UI. */
export function enemyKind(c: Creature): "undead" | "rodent" | "beast" {
  if (c.tags.includes("undead")) return "undead";
  if (c.tags.includes("rodent")) return "rodent";
  return "beast";
}

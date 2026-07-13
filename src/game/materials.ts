// Materiales: escombros de batalla (madera, acero, roca) + partes de monstruo
// (hueso, colmillo, garra, pelaje). Se recolectan al despejar salas y al rebuscar,
// y alimentan la forja (en vez de entregar armas).

export interface Material { id: string; name: string; icon: string; }

export const MATERIALS: Material[] = [
  { id: "wood",  name: "Madera",   icon: "🪵" },
  { id: "steel", name: "Acero",    icon: "⛓️" },
  { id: "stone", name: "Roca",     icon: "🪨" },
  { id: "bone",  name: "Hueso",    icon: "🦴" },
  { id: "fang",  name: "Colmillo", icon: "🦷" },
  { id: "claw",  name: "Garra",    icon: "🐾" },
  { id: "hide",  name: "Pelaje",   icon: "🧶" },
];
const byId = new Map(MATERIALS.map((m) => [m.id, m]));
export const matName = (id: string): string => byId.get(id)?.name ?? id;
export const matIcon = (id: string): string => byId.get(id)?.icon ?? "▪";

// Precio de venta por unidad: escombros baratos, partes de monstruo algo más.
const MAT_PRICE: Record<string, number> = {
  wood: 2, steel: 4, stone: 2, bone: 3, fang: 5, claw: 4, hide: 3,
};
export const matSell = (id: string): number => MAT_PRICE[id] ?? 1;

// De dónde sale cada material (por ahora solo la Cripta; luego habrá más calabozos).
const MAT_SOURCE: Record<string, string> = {
  wood: "escombros de batalla",
  steel: "escombros de batalla",
  stone: "escombros de batalla",
  bone: "no-muertos (esqueletos)",
  fang: "bestias (lobos)",
  claw: "bestias y alimañas",
  hide: "alimañas y bestias (ratas, lobos)",
};
export const matSource = (id: string): string => MAT_SOURCE[id] ?? "";

export type Mats = Record<string, number>;
export function mergeMats(into: Mats, add: Mats): Mats {
  const out = { ...into };
  for (const k of Object.keys(add)) out[k] = (out[k] ?? 0) + add[k];
  return out;
}
const rnd = (n: number) => Math.floor(Math.random() * n);
const partsFor = (kind: "undead" | "rodent" | "beast"): string[] =>
  kind === "undead" ? ["bone"] : kind === "rodent" ? ["hide", "claw"] : ["fang", "claw", "hide"];

/** Materiales al despejar una sala: escombros + posible parte de monstruo (escala suave con profundidad). */
export function rollRoomMaterials(kind: "undead" | "rodent" | "beast", depth: number): Mats {
  const out: Mats = {};
  const add = (id: string, n: number) => { if (n > 0) out[id] = (out[id] ?? 0) + n; };
  const debris = ["wood", "steel", "stone"];
  add(debris[rnd(debris.length)], 1 + (Math.random() < 0.25 + depth * 0.02 ? 1 : 0));
  if (Math.random() < 0.5) { const p = partsFor(kind); add(p[rnd(p.length)], 1); }
  return out;
}

/** Rebuscar recompensa mejor: más partes de monstruo + a veces escombro extra. */
export function rollSearchMaterials(kind: "undead" | "rodent" | "beast", depth: number): Mats {
  const out: Mats = {};
  const add = (id: string, n: number) => { if (n > 0) out[id] = (out[id] ?? 0) + n; };
  const p = partsFor(kind);
  add(p[rnd(p.length)], 1 + (Math.random() < 0.4 ? 1 : 0));
  if (Math.random() < 0.4) { const debris = ["wood", "steel", "stone"]; add(debris[rnd(debris.length)], 1); }
  return out;
}

export const matsSummary = (m: Mats): string =>
  Object.entries(m).filter(([, n]) => n > 0).map(([id, n]) => `${matIcon(id)}${n} ${matName(id)}`).join(" · ");

// Estadísticas de comportamiento POR PERSONAJE. Contadores que solo suben (salvo records).
// Se acumulan en memoria durante la run y se fusionan al guardado al terminar (un golpe a Firebase).

export interface CharStats {
  // ── GESTA ──
  killsBySpecies: Record<string, number>; // { Esqueleto: 30, Lobo: 55, ... } (nombre BASE)
  killsByType: Record<string, number>;    // { undead: 42, beast: 55, rodent: 40 }
  killsTotal: number;
  floorsCleared: number;
  roomsCleared: number;
  deaths: number;
  nemesisSlain: number;
  deepestFloor: number;

  // ── ESTILO DE PELEA (Fase 2 llena skillUses) ──
  skillUses: Record<string, number>;      // { smash: 210, crush: 90, ... }
  weaponUses: Record<string, number>;     // peleas libradas con cada arma (id → nº)

  // ── ECONOMÍA ──
  goldEarned: number;
  goldSpent: number;
  itemsSold: number;
  potionsDrunk: number;

  // ── GESTIÓN DE RECURSOS ──
  timesCamped: number;
  energyEmptied: number;

  // ── EXPLORACIÓN / CAUTELA ──
  roomsSearched: number;
  trapsFound: number;
  trapsSprung: number;
  ambushed: number;
}

/** Stats en cero para un personaje nuevo. */
export function emptyStats(): CharStats {
  return {
    killsBySpecies: {}, killsByType: {}, killsTotal: 0,
    floorsCleared: 0, roomsCleared: 0, deaths: 0, nemesisSlain: 0, deepestFloor: 0,
    skillUses: {}, weaponUses: {},
    goldEarned: 0, goldSpent: 0, itemsSold: 0, potionsDrunk: 0,
    timesCamped: 0, energyEmptied: 0,
    roomsSearched: 0, trapsFound: 0, trapsSprung: 0, ambushed: 0,
  };
}

const MAP_KEYS = ["killsBySpecies", "killsByType", "skillUses", "weaponUses"] as const;
const MAX_KEYS = ["deepestFloor"] as const; // records: se quedan con el mayor, no se suman

/** Fusiona `delta` sobre `base` (mapas se suman por clave; records toman el máximo; el resto suma). */
export function mergeStats(base: CharStats | undefined, delta: Partial<CharStats>): CharStats {
  const out: CharStats = base ? { ...base, killsBySpecies: { ...base.killsBySpecies }, killsByType: { ...base.killsByType }, skillUses: { ...base.skillUses }, weaponUses: { ...base.weaponUses } } : emptyStats();
  for (const k of Object.keys(delta) as (keyof CharStats)[]) {
    const dv = delta[k];
    if (dv == null) continue;
    if ((MAP_KEYS as readonly string[]).includes(k)) {
      const m = out[k] as Record<string, number>;
      for (const [sk, sv] of Object.entries(dv as Record<string, number>)) m[sk] = (m[sk] ?? 0) + sv;
    } else if ((MAX_KEYS as readonly string[]).includes(k)) {
      (out[k] as number) = Math.max(out[k] as number, dv as number);
    } else {
      (out[k] as number) = (out[k] as number) + (dv as number);
    }
  }
  return out;
}

/** Quita el sufijo de desambiguación (" I", " II", " 5"…) para obtener la especie base. */
export function baseSpecies(name: string): string {
  return (name ?? "").replace(/\s+(I{1,3}|IV|V|\d+)$/, "").trim();
}

/** Deriva la clave de mayor valor de un mapa (para "arma/skill/presa de preferencia"). */
export function topKey(map: Record<string, number>): string | null {
  let best: string | null = null, max = -Infinity;
  for (const [k, v] of Object.entries(map ?? {})) if (v > max) { max = v; best = k; }
  return best;
}

/** Resta stats (actual − snapshot) para aislar el tramo reciente. No baja de 0. Records = valor actual. */
export function subtractStats(cur: CharStats, base: CharStats): CharStats {
  const out = emptyStats();
  for (const k of Object.keys(out) as (keyof CharStats)[]) {
    if ((["killsBySpecies", "killsByType", "skillUses", "weaponUses"] as string[]).includes(k)) {
      const c = cur[k] as Record<string, number>, b = base[k] as Record<string, number>, m = out[k] as Record<string, number>;
      for (const [sk, sv] of Object.entries(c)) { const d = sv - (b[sk] ?? 0); if (d > 0) m[sk] = d; }
    } else if (k === "deepestFloor") {
      (out[k] as number) = cur[k] as number;   // récord: se queda el actual
    } else {
      (out[k] as number) = Math.max(0, (cur[k] as number) - (base[k] as number));
    }
  }
  return out;
}

/** El hito de título más alto cruzado esta run (22, 42, 62…), o null si no cruzó ninguno. */
export function milestoneCrossed(oldLevel: number, newLevel: number, first = 22, step = 20): number | null {
  let hit: number | null = null;
  for (let m = first; m <= newLevel; m += step) if (oldLevel < m && newLevel >= m) hit = m;
  return hit;
}

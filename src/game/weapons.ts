// Normalización de armas guardadas: rellena campos que saves viejos no tienen
// (precio, habilidades, requisitos) usando el arma canónica por id.
import { STARTER_WEAPONS, SHOP_WEAPONS, type WeaponOpt } from "./catalog";
import { LOOT_WEAPONS } from "./loot";
import { ALL_FORGE_WEAPONS } from "./forge";

const ALL: WeaponOpt[] = [...STARTER_WEAPONS, ...LOOT_WEAPONS, ...SHOP_WEAPONS, ...ALL_FORGE_WEAPONS];
const byId = new Map<string, WeaponOpt>(ALL.map((w) => [w.id, w]));

export function normalizeWeapon(w: WeaponOpt): WeaponOpt {
  const canon = byId.get(w.id);
  return {
    ...canon,
    ...w,
    price: Number.isFinite(w.price) ? w.price : (canon?.price ?? 10),
    abilities: w.abilities ?? canon?.abilities ?? ["smash"],
    req: w.req ?? canon?.req ?? {},
  } as WeaponOpt;
}

export const normalizeInventory = (list: WeaponOpt[] | undefined): WeaponOpt[] =>
  (list ?? []).map(normalizeWeapon);

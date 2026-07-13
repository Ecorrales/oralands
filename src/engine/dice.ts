// Dice, RNG and clamp — faithful port of the engine's util helpers.

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Injectable RNG so combat can be made deterministic in tests. */
export type RNG = () => number;

/** Faithful to Python's random.triangular(low, high, mode). */
export function triangular(low: number, high: number, mode: number, rng: RNG = Math.random): number {
  const u = rng();
  const c = (mode - low) / (high - low);
  if (u < c) return low + Math.sqrt(u * (high - low) * (mode - low));
  return high - Math.sqrt((1 - u) * (high - low) * (high - mode));
}

/**
 * Port of the engine's diceroll("XdY"): X dice of Y sides.
 * Each die uses a triangular distribution with mode at 0.9*Y (rolls skew high).
 * Supports a leading "-" for negative specs (e.g. "-4d6").
 */
export function diceroll(spec: string, rng: RNG = Math.random): number {
  let negative = false;
  let s = spec;
  if (s[0] === "-") { negative = true; s = s.slice(1); }
  const [count, sides] = s.split("d").map(Number);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += sides <= 1 ? 1 : Math.trunc(triangular(1, sides, 0.9 * sides, rng));
  }
  return negative ? -total : total;
}

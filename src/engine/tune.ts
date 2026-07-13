// Balance/tuning layer — sits on top of the faithful engine formulas.
// Design dials, NOT part of the original Python engine.
export interface TuneConfig {
  hitBase: number;   // baseline hit % when accuracy == evasion
  hitSlope: number;  // divisor: how much (accuracy - evasion) swings the result
}

// "Conectado": base 68, slope 2. Menos fallos para builds de baja precisión.
export const DEFAULT_TUNE: TuneConfig = { hitBase: 68, hitSlope: 2 };

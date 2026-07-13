// Implementación local: guarda el blob JSON del personaje en el navegador.
// Por navegador y por dispositivo (no sincroniza); ideal para desarrollo.
import type { PlayerStore, SavedGame } from "./PlayerStore";

const KEY = "dungeon:save";

export class LocalStorageStore implements PlayerStore {
  async save(game: SavedGame): Promise<void> {
    localStorage.setItem(KEY, JSON.stringify(game));
  }
  async load(): Promise<SavedGame | null> {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as SavedGame; } catch { return null; }
  }
  async clear(): Promise<void> {
    localStorage.removeItem(KEY);
  }
}

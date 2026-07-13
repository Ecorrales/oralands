// Hueco para la nube. Cuando quieras Supabase: implementa estos tres métodos
// con el cliente de Supabase y cambia LocalStorageStore por SupabaseStore en
// App.tsx (una sola línea). Misma interfaz → cero cambios en el juego.
import type { PlayerStore, SavedGame } from "./PlayerStore";

export class SupabaseStore implements PlayerStore {
  async save(_game: SavedGame): Promise<void> { throw new Error("SupabaseStore: pendiente de implementar"); }
  async load(): Promise<SavedGame | null> { throw new Error("SupabaseStore: pendiente de implementar"); }
  async clear(): Promise<void> { throw new Error("SupabaseStore: pendiente de implementar"); }
}

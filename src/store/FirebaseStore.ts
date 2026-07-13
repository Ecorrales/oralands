// Firebase al mando directo: cada save/load pega a Realtime Database (era Fogata).
// Auth anónimo da un uid por jugador; el guardado vive en saves/{uid}.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, get, set, remove } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";
import type { PlayerStore, SavedGame } from "./PlayerStore";

export class FirebaseStore implements PlayerStore {
  private db;
  private uid: Promise<string>;

  constructor() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    this.db = getDatabase(app);
    this.uid = new Promise<string>((resolve, reject) => {
      onAuthStateChanged(auth, (user) => { if (user) resolve(user.uid); });
      signInAnonymously(auth).catch(reject);
    });
  }

  private async node() {
    const uid = await this.uid;
    return ref(this.db, `saves/${uid}`);
  }

  async load(): Promise<SavedGame | null> {
    const snap = await get(await this.node());
    return snap.exists() ? (snap.val() as SavedGame) : null;
  }

  async save(game: SavedGame): Promise<void> {
    // RTDB no acepta undefined; el blob SavedGame no los tiene (armor puede ser null, que sí acepta).
    await set(await this.node(), game);
  }

  async clear(): Promise<void> {
    await remove(await this.node());
  }
}

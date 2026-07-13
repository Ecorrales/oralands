// Firebase al mando directo: cada save/load pega a Realtime Database (era Fogata).
// Auth anónimo da un uid por jugador; el guardado vive en saves/{uid}.
// Login con Google: vincula la cuenta anónima (conserva uid y guardado) y permite
// entrar desde varios dispositivos con la misma partida.
import { initializeApp } from "firebase/app";
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  GoogleAuthProvider, linkWithPopup, signInWithCredential, signOut,
  type User,
} from "firebase/auth";
import { getDatabase, ref, get, set, remove } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";
import type { PlayerStore, SavedGame } from "./PlayerStore";

export interface AuthInfo { uid: string; email: string | null; isAnonymous: boolean; }

export class FirebaseStore implements PlayerStore {
  private db;
  private auth;
  private ready: Promise<string>;

  constructor() {
    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
    this.db = getDatabase(app);
    this.ready = new Promise<string>((resolve, reject) => {
      let done = false;
      onAuthStateChanged(this.auth, (user) => { if (user && !done) { done = true; resolve(user.uid); } });
      signInAnonymously(this.auth).catch(reject);
    });
  }

  private async uid(): Promise<string> {
    return this.auth.currentUser?.uid ?? this.ready;
  }
  private async node() {
    return ref(this.db, `saves/${await this.uid()}`);
  }

  /** Suscripción al estado de sesión (para pintar email / estado de cuenta). */
  onAuth(cb: (info: AuthInfo | null) => void): () => void {
    return onAuthStateChanged(this.auth, (u: User | null) =>
      cb(u ? { uid: u.uid, email: u.email, isAnonymous: u.isAnonymous } : null));
  }

  /** Vincula la cuenta anónima con Google (conserva uid y guardado).
   *  Si esa cuenta Google ya existe (otro dispositivo), entra a ella:
   *  devuelve switched=true para que la app recargue el guardado de esa cuenta. */
  async linkGoogle(): Promise<{ switched: boolean; email: string | null }> {
    const provider = new GoogleAuthProvider();
    const user = this.auth.currentUser;
    if (!user) throw new Error("sin usuario activo");
    try {
      const res = await linkWithPopup(user, provider);
      return { switched: false, email: res.user.email };
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "auth/credential-already-in-use") {
        const cred = GoogleAuthProvider.credentialFromError(e as never);
        if (cred) {
          const res = await signInWithCredential(this.auth, cred);
          return { switched: true, email: res.user.email };
        }
      }
      throw e;
    }
  }

  /** Cierra sesión de Google y vuelve a anónimo (para seguir con un guardado en la nube). */
  async signOutUser(): Promise<void> {
    await signOut(this.auth);
    await signInAnonymously(this.auth);
  }

  async load(): Promise<SavedGame | null> {
    const snap = await get(await this.node());
    return snap.exists() ? (snap.val() as SavedGame) : null;
  }
  async save(game: SavedGame): Promise<void> {
    await set(await this.node(), game);
  }
  async clear(): Promise<void> {
    await remove(await this.node());
  }
}

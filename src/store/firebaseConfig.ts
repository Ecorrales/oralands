// Pega aquí la config de tu proyecto Firebase (Consola → Configuración → Tus apps → SDK).
// Mientras el apiKey empiece con "TU_", el juego usa localStorage; al pegar el tuyo real,
// pasa automáticamente a guardar en Firebase.
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxx",
};

export const firebaseConfigured = !firebaseConfig.apiKey.startsWith("TU_");

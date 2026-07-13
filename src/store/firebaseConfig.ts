// Pega aquí la config de tu proyecto Firebase (Consola → Configuración → Tus apps → SDK).
// Mientras el apiKey empiece con "TU_", el juego usa localStorage; al pegar el tuyo real,
// pasa automáticamente a guardar en Firebase.
export const firebaseConfig = {
 apiKey: "AIzaSyAGWuxt8-fwOcHq-PR1Q80MN5dCIjUxzQ8",
  authDomain: "oralands.firebaseapp.com",
  databaseURL: "https://oralands-default-rtdb.firebaseio.com",
  projectId: "oralands",
  storageBucket: "oralands.firebasestorage.app",
  messagingSenderId: "764014772835",
  appId: "1:764014772835:web:03639ad797884d9668ee56"
};

export const firebaseConfigured = !firebaseConfig.apiKey.startsWith("TU_");
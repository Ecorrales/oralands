// Genera public/stats.json a partir de todos los saves de Firebase.
// Corre en GitHub Actions cada 8h con una service account (secreto FIREBASE_SERVICE_ACCOUNT).
// La página pública lee ESTE json — nunca toca Firebase directamente.
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const DATABASE_URL = "https://oralands-default-rtdb.firebaseio.com/";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Falta el secreto FIREBASE_SERVICE_ACCOUNT");
  try { return JSON.parse(raw); }
  catch { throw new Error("FIREBASE_SERVICE_ACCOUNT no es un JSON válido"); }
}

const num = (v, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
const round1 = (v) => Math.round(v * 10) / 10;

async function main() {
  initializeApp({ credential: cert(loadServiceAccount()), databaseURL: DATABASE_URL });
  const snap = await getDatabase().ref("saves").once("value");
  const all = snap.val() || {};

  const players = [];
  let strongestNemesis = null; // { name, level }

  for (const uid of Object.keys(all)) {
    const s = all[uid];
    if (!s || typeof s !== "object" || !s.player) continue; // salta saves corruptos
    const p = s.player;
    const level = num(p.level, 1);
    const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : "???";
    const gold = num(s.gold, 0);
    const cargados = Array.isArray(s.cargados) ? s.cargados : [];
    const nemesisCount = cargados.length;
    const maxDepth = num(s.maxDepth, 0);

    // némesis más fuerte global
    for (const c of cargados) {
      const cl = num(c?.creature?.level, 0);
      const cn = typeof c?.creature?.name === "string" ? c.creature.name : "???";
      if (!strongestNemesis || cl > strongestNemesis.level) strongestNemesis = { name: cn, level: cl };
    }

    players.push({ name, level, gold, nemesisCount, maxDepth });
  }

  const n = players.length;
  const sum = (f) => players.reduce((a, p) => a + f(p), 0);
  const max = (f) => players.reduce((a, p) => Math.max(a, f(p)), 0);

  const top10 = [...players].sort((a, b) => b.level - a.level || b.gold - a.gold).slice(0, 10)
    .map((p, i) => ({ rank: i + 1, name: p.name, level: p.level, gold: p.gold, maxDepth: p.maxDepth }));

  const stats = {
    generatedAt: new Date().toISOString(),
    players: n,
    maxLevel: max((p) => p.level),
    avgLevel: n ? round1(sum((p) => p.level) / n) : 0,
    maxGold: max((p) => p.gold),
    avgGold: n ? Math.round(sum((p) => p.gold) / n) : 0,
    maxNemesis: max((p) => p.nemesisCount),
    deepestRun: max((p) => p.maxDepth),
    strongestNemesis: strongestNemesis || { name: "—", level: 0 },
    top10,
  };

  await getDatabase().ref("stats/global").set(stats);   // escribe al nodo público (Admin SDK ignora las reglas)
  console.log(`stats/global actualizado: ${n} jugadores, nivel máx ${stats.maxLevel}, oro máx ${stats.maxGold}`);
  process.exit(0);
}

main().catch((e) => { console.error("Error generando stats:", e.message); process.exit(1); });

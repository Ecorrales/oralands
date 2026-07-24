// Motor de TÍTULOS. Calcula, para un tramo de estadísticas + nivel, el título más distintivo del
// jugador — por RATIOS (no totales), comparando contra baselines. Traduce el dato a lengua del mundo.
import { getLang } from "./i18n";
import { topKey, type CharStats } from "./charStats";

const ES = () => getLang() === "es";

export interface AwardedTitle {
  id: string;
  name: string;
  axis: string;
  level: number;   // nivel en que se otorgó
  why: string;     // el "porqué" narrado, ya con el nombre del jugador
  founder?: boolean;
}

// ── Baselines: "lo normal" para cada señal (ratios). Constantes TUNEABLES; a futuro pueden salir
//    del promedio global real de la comunidad. ──
const B = {
  roomsPerLevel: 2.0,
  deathsPerLevel: 0.4,
  searchPerRoom: 0.5,
  nemesisPerLevel: 0.1,
  energyEmptyPerRoom: 0.3,
  trapsSprungPerLevel: 0.15,
  soldPerLevel: 1.0,
  potionsPerRoom: 0.2,
};

const num = (v: number | undefined) => v ?? 0;
/** desviación relativa respecto al baseline (0 = normal, +0.5 = 50% arriba, -0.5 = 50% abajo). */
const dev = (val: number, base: number) => (base <= 0 ? 0 : (val - base) / base);

// ── Catálogo de nombres (ES/EN) ──
const NAME: Record<string, { es: string; en: string }> = {
  // combate / skill dominante
  crush: { es: "el Aplastador", en: "the Crusher" },
  smash: { es: "el Martillo", en: "the Hammer" },
  bash: { es: "el Arrollador", en: "the Bruiser" },
  stab: { es: "el Estilete", en: "the Stiletto" },
  quick_stab: { es: "el Veloz", en: "the Swift" },
  cut: { es: "el Desangrador", en: "the Bloodletter" },
  quick_cut: { es: "el que Sangró las Criptas", en: "who Bled the Crypts" },
  // combate / némesis
  nemesis_hunter: { es: "Verdugo de Pesadillas", en: "Nightmare's Executioner" },
  // exploración
  wanderer: { es: "el Errante", en: "the Wanderer" },
  swift_delver: { es: "el Relámpago", en: "the Lightning" },
  searcher: { es: "el Buscador", en: "the Seeker" },
  // temeridad
  reckless: { es: "el Temerario", en: "the Reckless" },
  methodical: { es: "el Metódico", en: "the Methodical" },
  furious: { es: "el Furioso", en: "the Furious" },
  // irónicos
  trap_lord: { es: "el Señor de las Trampas", en: "the Lord of Traps" },
  death_fearer: { es: "el que Teme a la Muerte", en: "who Fears Death" },
  // economía
  merchant: { es: "el Mercader", en: "the Merchant" },
  // fundador
  founder: { es: "el Primero de su Nombre", en: "the First of his Name" },
};

const nm = (id: string) => (ES() ? NAME[id]?.es : NAME[id]?.en) ?? id;

// ── Plantillas de "porqué" por título (pool para rotar). {p} = nombre del jugador. ──
function whyFor(id: string, p: string): string {
  const es = ES();
  const pool: Record<string, { es: string[]; en: string[] }> = {
    crush: { es: [`${p}, el calabozo te reconoce como {t}. No hay yelmo ni hueso que resista tu golpe: aplastas lo que se te pone enfrente, una y otra vez.`], en: [`${p}, the dungeon knows you as {t}. No helm nor bone withstands your blow: you crush all that stands before you.`] },
    smash: { es: [`${p}, se te conoce como {t}. Tu fuerza bruta es tu palabra: golpeas hasta que algo cede.`], en: [`${p}, you are known as {t}. Brute force is your word: you strike until something breaks.`] },
    bash: { es: [`${p}, el calabozo te nombra {t}. Arrollas a tus enemigos antes de que reaccionen.`], en: [`${p}, the dungeon names you {t}. You bowl over your foes before they react.`] },
    stab: { es: [`${p}, se te reconoce como {t}. Buscas el punto exacto, y ahí clavas tu acero.`], en: [`${p}, you are known as {t}. You find the exact point, and there you drive your steel.`] },
    quick_stab: { es: [`${p}, el calabozo te llama {t}. Golpeas más rápido de lo que el ojo alcanza.`], en: [`${p}, the dungeon calls you {t}. You strike faster than the eye can follow.`] },
    cut: { es: [`${p}, se te conoce como {t}. Dejas a tus presas desangrándose en la penumbra.`], en: [`${p}, you are known as {t}. You leave your prey bleeding in the gloom.`] },
    quick_cut: { es: [`${p}, el calabozo te reconoce como {t}. Los pasillos guardan la marca de tus tajos y la sangre que dejaste.`], en: [`${p}, the dungeon knows you as {t}. The halls bear the mark of your cuts and the blood you spilled.`] },
    nemesis_hunter: { es: [`${p}, el calabozo te corona {t}. Diste caza a las pesadillas que otros temen, y las venciste.`], en: [`${p}, the dungeon crowns you {t}. You hunted the nightmares others fear, and felled them.`] },
    wanderer: { es: [`${p}, se te conoce como {t}. Pocos han recorrido tantas salas como tú: no dejas rincón sin pisar.`], en: [`${p}, you are known as {t}. Few have walked as many rooms as you: you leave no corner untrodden.`] },
    swift_delver: { es: [`${p}, el calabozo te nombra {t}. Entras, tomas lo tuyo y desciendes — sin perder el tiempo.`], en: [`${p}, the dungeon names you {t}. You enter, take what's yours, and descend — wasting no time.`] },
    searcher: { es: [`${p}, se te reconoce como {t}. Escarbas cada sala en busca de lo que otros dejan atrás.`], en: [`${p}, you are known as {t}. You dig through every room for what others leave behind.`] },
    reckless: { es: [`${p}, el calabozo te nombra {t}. Llegaste hasta aquí desafiando a la muerte una y otra vez — y aún respiras.`], en: [`${p}, the dungeon names you {t}. You came this far defying death again and again — and still you breathe.`] },
    methodical: { es: [`${p}, el calabozo te reconoce como {t}. Te ganó ese nombre la cautela de tus bajadas: llegaste hasta aquí muriendo pocas veces, y eso… tiene su estilo.`], en: [`${p}, the dungeon knows you as {t}. Your caution earned it: you came this far dying few times, and that… has its style.`] },
    furious: { es: [`${p}, se te conoce como {t}. Peleas hasta la última gota de tu energía, sin guardar nada.`], en: [`${p}, you are known as {t}. You fight to your last drop of energy, holding nothing back.`] },
    trap_lord: { es: [`${p}, el calabozo te corona {t}. No por esquivarlas — sino porque no ha habido foso, lanza ni resorte en el que no hayas caído. El mundo entero te vio tropezar, una y otra vez. Y aun así, aquí sigues.`], en: [`${p}, the dungeon crowns you {t}. Not for dodging them — but because there's been no pit, spike, or spring you haven't fallen into. The whole world watched you stumble, again and again. And yet, here you are.`] },
    death_fearer: { es: [`${p}, se te nombra {t}. Bebes hasta la última poción con tal de no caer. Sobrevivir es tu obsesión.`], en: [`${p}, you are named {t}. You drink to the last potion rather than fall. Survival is your obsession.`] },
    merchant: { es: [`${p}, el calabozo te reconoce como {t}. Nada se te queda: todo botín encuentra comprador en tus manos.`], en: [`${p}, the dungeon knows you as {t}. Nothing stays with you: every spoil finds a buyer in your hands.`] },
    founder: { es: [`${p}. Antes de que el calabozo aprendiera a nombrar a sus hijos, ya caminabas sus profundidades. No hay gesta que registrar de tu ascenso, porque descendiste cuando nadie llevaba la cuenta. Por eso el mundo te reconoce con el único nombre que jamás volverá a otorgarse: {t}.`], en: [`${p}. Before the dungeon learned to name its children, you already walked its depths. There's no deed to record of your ascent, for you descended when no one kept count. So the world knows you by the one name that will never be granted again: {t}.`] },
  };
  const arr = (es ? pool[id]?.es : pool[id]?.en) ?? [`${p}: {t}.`];
  const chosen = arr[Math.floor(Math.random() * arr.length)];
  return chosen.replace("{t}", nm(id).toUpperCase());
}

/** Construye un título otorgado a partir de su id. */
function make(id: string, axis: string, level: number, player: string, founder = false): AwardedTitle {
  return { id, name: nm(id), axis, level, why: whyFor(id, player), founder };
}

/** Título de FUNDADOR (veteranos pre-sistema). */
export function founderTitle(level: number, player: string): AwardedTitle {
  return make("founder", "fundador", level, player, true);
}

/**
 * Calcula el título más distintivo para un tramo de stats + nivel.
 * `s` = estadísticas del tramo (todo el historial para el 1er título; solo lo reciente después).
 * `level` = nivel del jugador al otorgar. `levelsInStretch` = niveles que abarca el tramo (para ratios).
 */
export function computeTitle(s: Partial<CharStats>, level: number, player: string, levelsInStretch = level): AwardedTitle {
  const L = Math.max(1, levelsInStretch);
  const rooms = Math.max(1, num(s.roomsCleared));

  // candidatos: cada uno con su "fuerza" (desviación respecto al baseline). Solo cuentan si destacan.
  type Cand = { id: string; axis: string; strength: number };
  const cands: Cand[] = [];
  const consider = (id: string, axis: string, strength: number, min = 0.35) => { if (strength >= min) cands.push({ id, axis, strength }); };

  // EXPLORACIÓN
  const roomsPL = num(s.roomsCleared) / L;
  consider("wanderer", "exploracion", dev(roomsPL, B.roomsPerLevel));       // muchas salas/nivel
  consider("swift_delver", "exploracion", -dev(roomsPL, B.roomsPerLevel));  // pocas salas/nivel (eficiente)
  consider("searcher", "exploracion", dev(num(s.roomsSearched) / rooms, B.searchPerRoom));

  // TEMERIDAD
  const deathsPL = num(s.deaths) / L;
  consider("reckless", "temeridad", dev(deathsPL, B.deathsPerLevel));
  consider("methodical", "temeridad", -dev(deathsPL, B.deathsPerLevel));
  consider("furious", "temeridad", dev(num(s.energyEmptied) / rooms, B.energyEmptyPerRoom));

  // IRÓNICOS
  consider("trap_lord", "ironico", dev(num(s.trapsSprung) / L, B.trapsSprungPerLevel), 0.6);   // pide más desviación
  consider("death_fearer", "ironico", dev(num(s.potionsDrunk) / rooms, B.potionsPerRoom), 0.6);

  // ECONOMÍA
  consider("merchant", "economia", dev(num(s.itemsSold) / L, B.soldPerLevel));

  // COMBATE / némesis
  consider("nemesis_hunter", "combate", dev(num(s.nemesisSlain) / L, B.nemesisPerLevel), 0.5);

  // el candidato más fuerte gana
  cands.sort((a, b) => b.strength - a.strength);
  if (cands.length) return make(cands[0].id, cands[0].axis, level, player);

  // FALLBACK: si nada destaca, título de combate por skill dominante (siempre hay uno)
  const topSkill = topKey(s.skillUses ?? {});
  if (topSkill && NAME[topSkill]) return make(topSkill, "combate", level, player);
  return make("methodical", "temeridad", level, player);   // último recurso
}

// Rebuscar una sala despejada: observación por tiempo, tiro contra destreza + inteligencia,
// suelta oro, con riesgo pequeño de emboscada. Textos ambientales por bioma.
import type { Creature } from "../engine";
import { enemyKind } from "./enemies";

export const SEARCH_SEC = 7;              // duración de la observación
export const SEARCH_AMBUSH_CHANCE = 0.10; // hurgar hace ruido

/** Probabilidad de hallar algo según destreza (hurgar) + inteligencia (notar lo que vale). */
export const searchChance = (dex: number, int: number): number =>
  Math.min(0.9, 0.1 + (dex + int) * 0.03);

/** Oro hallado, escala suave con la profundidad. */
export const searchGold = (depth: number): number =>
  2 + Math.floor(2 * Math.sqrt(depth)) + Math.floor(Math.random() * 3);

import type { Biome } from "./dungeons";
export function biomeOf(enemies: Creature[]): Biome {
  const k = enemies.length ? enemyKind(enemies[0]) : "cueva" as const;
  return k === "undead" ? "cripta" : k === "rodent" ? "madriguera" : "cueva";
}

const TEXTS: Record<Biome, { intro: string; empty: string; found: string }> = {
  cripta: {
    intro: "Estás en una cripta angosta de piedra, con nichos vacíos y polvo de siglos.",
    empty: " Revisas los nichos y el suelo… huesos viejos y nada más. Nada fuera de lo normal.",
    found: " Revisas los nichos… espera, ¿qué es eso? Entre los huesos, un puñado de monedas olvidadas.",
  },
  madriguera: {
    intro: "Estás en una madriguera excavada, estrecha, con olor a tierra húmeda y pelaje.",
    empty: " Hurgas entre los desechos y el nido revuelto… nada de valor. Nada fuera de lo normal.",
    found: " Hurgas en el nido… espera, ¿qué es eso? Las alimañas guardaban un alijo de monedas.",
  },
  cueva: {
    intro: "Estás dentro de una pequeña cueva natural, oscura, húmeda y con mucho eco.",
    empty: " Palpas las paredes y revisas los rincones… nada fuera de lo normal.",
    found: " Palpas las paredes… espera, ¿qué es eso? Unas monedas tiradas brillan en una grieta.",
  },
  ruinas: {
    intro: "Estás entre ruinas derruidas, columnas caídas y escombros de una era olvidada.",
    empty: " Escarbas entre los escombros y las losas rotas… nada de valor. Nada fuera de lo normal.",
    found: " Escarbas entre los escombros… espera, ¿qué es eso? Algo de valor sobrevivió al derrumbe.",
  },
};

export const searchIntro = (b: Biome): string => TEXTS[b].intro;
export const searchOutcome = (b: Biome, found: boolean): string =>
  TEXTS[b].intro + (found ? TEXTS[b].found : TEXTS[b].empty);

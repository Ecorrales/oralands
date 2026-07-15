// Trampas por zona. Cada sala despejada puede esconder una trampa (probabilidad por bioma).
// Rebuscar la sala la DETECTA y desactiva; avanzar sin revisar la DISPARA.
// Ruinas: trampas man-made (púas, flechas, veneno, losa) — más frecuentes y dañinas.
// Cripta: mecanismos antiguos — frecuencia media.
// Guarida/Madriguera: peligros naturales (fosos, resbalones) — menos frecuentes, daño por caída.
import type { Biome } from "./dungeons";

export interface Trap {
  id: string;
  name: string;
  detect: string;   // texto al detectarla (rebuscando)
  trigger: string;  // texto al caer en ella (avanzando sin revisar)
  dmgFrac: number;  // daño como fracción de la vida máxima
}

// Probabilidad de que una sala esconda una trampa, por bioma. Baja pero real.
const TRAP_CHANCE: Record<Biome, number> = {
  ruinas: 0.35,     // man-made, intencionales: revisas todo
  cripta: 0.12,     // mecanismos antiguos: frecuencia baja-media
  cueva: 0.10,      // bestias: peligros naturales, andas despreocupado
  madriguera: 0.10, // alimañas: igual, natural y esporádico
};

// Repertorio de trampas por bioma. Man-made pegan más; naturales, daño de caída/tropiezo.
const TRAPS: Record<Biome, Trap[]> = {
  ruinas: [
    { id: "spikes", name: "Trampa de púas", dmgFrac: 0.16, detect: "Notas unas púas oxidadas asomando bajo una losa suelta. Las esquivas.", trigger: "¡Una losa cede y un lecho de púas se dispara! Te clavas al pisar." },
    { id: "darts",  name: "Dardos de veneno", dmgFrac: 0.18, detect: "Detectas hendiduras en la pared: un mecanismo de dardos. Lo trabas antes de cruzar.", trigger: "¡Dardos emponzoñados salen de la pared! El veneno arde en tus venas." },
    { id: "arrows", name: "Trampa de flechas", dmgFrac: 0.15, detect: "Ves un cable tenso a ras del suelo conectado a una ballesta oculta. Lo saltas.", trigger: "¡Rompes un cable y una andanada de flechas te cruza el paso!" },
    { id: "plate",  name: "Losa de presión", dmgFrac: 0.12, detect: "Una losa se hunde apenas al tacto: mecanismo de presión. La rodeas.", trigger: "¡Una losa se hunde y el techo suelta una descarga de escombro sobre ti!" },
  ],
  cripta: [
    { id: "tomb",  name: "Tumba trampa", dmgFrac: 0.14, detect: "Una lápida está mal encajada, lista para caer. La aseguras antes de pasar.", trigger: "¡Una lápida se desploma desde un nicho al pasar bajo ella!" },
    { id: "gas",   name: "Gas de la cripta", dmgFrac: 0.13, detect: "Hueles un dejo dulzón: gas atrapado en un nicho sellado. Contienes el aliento y lo evitas.", trigger: "¡Rompes un sello y una bocanada de gas rancio te llena los pulmones!" },
  ],
  cueva: [
    { id: "pit",  name: "Foso natural", dmgFrac: 0.12, detect: "El suelo suena hueco: una grieta cubierta de maleza. La bordeas.", trigger: "¡El suelo cede y caes por una grieta oculta! El golpe te sacude." },
    { id: "slip", name: "Resbalón", dmgFrac: 0.08, detect: "Una pendiente de roca húmeda y musgo. Buscas dónde pisar con cuidado.", trigger: "¡Resbalas en la roca húmeda y ruedas por la pendiente!" },
  ],
  madriguera: [
    { id: "pit",   name: "Foso de la madriguera", dmgFrac: 0.11, detect: "El túnel se hunde adelante: una galería colapsada bajo tierra floja. La rodeas.", trigger: "¡La tierra floja cede y caes a una galería colapsada!" },
    { id: "trip",  name: "Raíces y desechos", dmgFrac: 0.08, detect: "Raíces y huesos enredados a ras del suelo, fáciles de tropezar. Pasas con tiento.", trigger: "¡Te enredas en raíces y desechos y caes de bruces en la oscuridad!" },
  ],
};

/** ¿Esta sala esconde una trampa? Devuelve la trampa (por bioma) o null. */
export function rollRoomTrap(biome: Biome): Trap | null {
  if (Math.random() >= (TRAP_CHANCE[biome] ?? 0.1)) return null;
  const pool = TRAPS[biome] ?? TRAPS.cueva;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Daño de la trampa: fracción de la vida máxima, con un piso mínimo. Escala con el personaje. */
export function trapDamage(trap: Trap, maxHp: number): number {
  return Math.max(3, Math.round(maxHp * trap.dmgFrac));
}

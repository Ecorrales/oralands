# dungeon-engine

Headless combat core en TypeScript, portado fiel del motor Python de `dungeon_bot` (2015).
**Cero DOM, cero React** — pura lógica. La UI y la persistencia (Supabase) se envuelven encima.

## Instalar y probar

```bash
npm install
npm test          # corre los 13 tests (Vitest)
npm run typecheck # tsc --noEmit
```

## Estructura

```
src/engine/
  dice.ts        clamp, RNG inyectable, triangular, diceroll("XdY")
  stats.ts       characteristics + vida/energía/regen derivadas
  modifiers.ts   efectos con duración (knockdown, dolor, sangrado, quema) + tick
  creature.ts    modelo Creature, makeCreature, accuracy/evasion
  tune.ts        capa de balance (recentrado): base 60, pendiente ÷2
  abilities.ts   hit chance (fiel + afinado), smash, knockdown, resolveSmash
  combat.ts      iniciativa (placeholder por destreza), regen, isDead
  index.ts       barrel export
tests/
  engine.test.ts paridad con Python + determinismo por RNG inyectado
```

## Diseño clave

- **RNG inyectable.** Toda función que tira dados acepta `rng: () => number`.
  Con un RNG fijo el combate es reproducible → tests deterministas.
- **Fiel vs. afinado.** Las fórmulas base replican el motor Python exacto
  (validado en tests: vida, energía, hit crudo, smash, knockdown). La puntería
  **recentrada** vive aparte en `tune.ts` como decisión de diseño, no toca el core.
- **Sin efectos secundarios en la resolución.** `resolveSmash` devuelve datos
  (`AttackResolution`); quien llama aplica el daño y los modificadores. Esa es la
  costura que deja la UI como piel tonta sobre el motor.

## Hallazgos del port (revisar en el port completo)

- El `smash` real **no** resta defensa: el código hace `weapon_dmg * str` (piso `str/2`),
  aunque el docstring mencione mitigación. Portado fiel al código en `smashDamage`.
- La **iniciativa** aquí ordena por destreza como placeholder; la cola exacta del
  motor original se porta después.
- El daño concreto del arma usa specs fijos (p. ej. `club = "1d4"`); la generación
  de items con tirada dentro de rango va en una fase posterior.

## Pendiente (siguientes rebanadas)

- Portar las 22 habilidades restantes (stab, cut, sweep, shield up, ...).
- Generación de items (rollear stats dentro del rango de `item_listing`).
- Bestiario (23 criaturas) como datos declarativos.
- Cola de turnos e iniciativa exactas del motor.
- Bucle de mundo (pueblo/campo/dungeon), acampar, cargados.

## Ver el motor jugando (standalone)

```bash
npm run play        # bundlea el motor + UI en dist/dungeon-play.html
```

Luego abre `dist/dungeon-play.html` con doble clic. Es un solo archivo autocontenido
que corre el paquete real (bundleado con esbuild) — no re-implementa nada. Cada golpe
llama a `resolveSmash()` del motor.

También puedes abrir el `dungeon-play.html` que viene ya construido en el zip sin
instalar nada, si solo quieres jugar.

## La app (Vite + React)

Ya no es un demo: es la app de verdad, con creación de personaje, combate y
**persistencia local**. Tu personaje se guarda en el navegador y sobrevive al recargar.

```bash
npm install
npm run dev       # http://localhost:5173  (desarrollo, hot reload)
npm run build     # genera dist/ para producción
npm run preview   # sirve el build de producción
```

### Persistencia — la costura

- `src/store/PlayerStore.ts` — la interfaz (`save` / `load` / `clear`).
- `src/store/LocalStorageStore.ts` — implementación actual (blob JSON en el navegador).
- `src/store/SupabaseStore.ts` — hueco para la nube (misma interfaz).

El juego solo conoce la interfaz. Para pasar a Supabase, implementas
`SupabaseStore` y cambias **una línea** en `src/ui/App.tsx`. Cero cambios en el juego.

`localStorage` es por navegador y dispositivo (no sincroniza) — perfecto para
desarrollo; Supabase entra cuando quieras el mismo personaje en todos lados.

### Estructura de la app

```
index.html · vite.config.ts
src/
  engine/   motor (sin cambios, headless)
  store/    persistencia (interfaz + local + stub supabase)
  game/     catálogo de arranque (armas, stats)
  ui/       App, CharacterCreate, Hub, Combat (React)
  main.tsx  entry
```

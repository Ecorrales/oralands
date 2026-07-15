
## Némesis / cargados — pendientes de sabor
- Cuando una **bestia** se gradúa a némesis (cargado), su familia cambia de "bestia" a **"hombre bestia"** (beast-folk). Es decir, al cargarse asciende de animal a humanoide bestial. Aplicar el label "hombre bestia" a los cargados de kind beast (y usar el pool BEAST_NAMES que ya es de bestia-folk, que encaja perfecto). Agregar cuando toque pulir némesis, NO amerita iteración propia.

## Némesis — escalado a Overlord global (VISIÓN, no inmediato)
Contexto: fase 2 de némesis contempla que el mismo cargado que te re-mata **crece** cada vez (sube nivel, acumula botín, títulos). 

Idea de Nox: si un némesis personal te vence una y otra vez, tras suficientes "vueltas" se convierte en un **OVERLORD** — deja de ser némesis *personal* y asciende a némesis **GLOBAL**: puede aparecerle a **cualquier jugador**, no solo a quien lo creó.

Implicaciones / decisiones a definir cuando toque:
- **Umbral de ascenso**: ¿cuántas re-victorias (o qué nivel/botín acumulado) lo vuelven Overlord? (ej. re-mata 3-5 veces, o supera cierto nivel).
- **Requiere backend compartido de verdad**: los némesis personales viven en el SavedGame (Firebase por-uid). Un Overlord global necesita un **nodo compartido** en Firebase (p. ej. `overlords/`) legible por todos, con reglas distintas (lectura pública, escritura controlada — anti-trampa).
- **Aparición**: probabilidad de que un Overlord global "invada" la cripta de cualquier jugador. Tope de Overlords activos globalmente.
- **Recompensa**: vencer un Overlord global debería dar botín especial (¿su acumulado?, ¿materiales raros?, ¿gloria/leaderboard?). Podría anunciarse ("X derrotó al Overlord Vorlk").
- **Ciclo de vida**: ¿un Overlord derrotado muere para todos?, ¿revive?, ¿se debilita? ¿Puede seguir creciendo con cada jugador que mata?
- Encaja con la visión MMORPG: primer contenido de mundo **compartido** real, cimentado sobre el guardado en la nube que ya existe.

Orden sugerido: primero **fase 2 (crecimiento personal del némesis)**, y el salto a Overlord global como fase 3 (ya con backend compartido).

## El Pueblo — evolución del refugio (VISIÓN)
El "refugio" (hoy un menú de botones) crece a un **pueblo con edificios**, cada uno un sistema. Se desbloquean/mejoran con progreso (oro, materiales, misiones), dando sensación de construir tu base.
- **Herrería** (ya existe): forja armas/escudos/armadura con materiales.
- **Posada / INN**: descansar (cura), quizá guardar, punto social. Podría dar buffs temporales ("comida caliente").
- **Herbolario**: pociones y consumibles (hoy la poción vive en la tienda); recetas de pociones con hierbas/materiales.
- **Gremio de cazadores**: contratos de caza (mata X bestias / consigue Y colmillos) → recompensas. Da propósito a farmear materiales específicos.
- **Tablón de misiones**: misiones diarias/semanales. AQUÍ se anuncia cuando **nace un Overlord** (conecta con la visión del némesis global) — "Se avista al Overlord Vorlk en las criptas". Primer feed de eventos del mundo compartido.
- Tienda general: vender excedentes (incl. materiales — ver abajo), comprar básicos.
Notas: el pueblo es el marco que unifica economía (vender materiales), progresión (misiones), y mundo compartido (avisos de Overlord). Se puede construir edificio por edificio.

## Vender materiales (INMEDIATO, chico)
El jugador junta muchos materiales y no todos se usan en forja. Agregar venta de materiales en la tienda (tab Vender): precio bajo por unidad (tipo sellValue). Resuelve el excedente y da flujo de oro alternativo.

## Criptas navegables — de pasillo lineal a mapa explorable (VISIÓN GRANDE)
Hoy el dungeon es lineal: despejas sala → avanzas → siguiente sala, en una sola dirección. La idea de Nox: al terminar una sala, poder **navegar en 4 direcciones** (Izquierda · Derecha · Adelante · Atrás), convirtiendo la cripta en un **mapa 2D explorable** en vez de un pasillo.

Visión:
- **Cripta autogenerada aleatoriamente** como un grid/mapa de salas conectadas (procedural). Cada sala tiene salidas N/S/E/O hacia salas vecinas.
- **Exploración libre**: navegas la cripta todo lo que quieras hasta decidir salir (el "camp/salir" sigue siendo la decisión de asegurar botín). Puedes volver sobre tus pasos (Atrás), rodear, elegir ruta.
- Abre la puerta a:
  - **Mapa/minimapa** visible (salas visitadas, no visitadas, dónde estás).
  - **Salas especiales** colocadas en el mapa: tesoro, jefe, altar, tienda-en-mazmorra, puzzle, atajo.
  - **Buscar cosas / secretos**: pasajes ocultos, salas que solo aparecen si rebuscas (conecta con la mecánica de rebuscar que ya gusta).
  - Decisiones espaciales reales: "¿voy por el pasillo peligroso al tesoro, o rodeo?".

Implicaciones técnicas (por qué es fase grande):
- Reemplaza el modelo actual `stage/roomInStage/depth` (lineal) por un **grafo/grid de salas** con coordenadas y conexiones.
- Generación procedural del mapa (algoritmo de layout: drunkard walk, BSP, salas+corredores).
- Estado de exploración persistente en RunState (mapa generado, salas visitadas, posición actual) — el guardado por checkpoints tendría que serializar el mapa.
- La "profundidad" para escalado de dificultad/loot pasaría a derivarse de distancia al inicio o de un contador de salas exploradas.
- UI nueva: controles de navegación + minimapa.

Notas: es probablemente el cambio más grande de todos — redefine el núcleo del crawl. Vale hacerlo cuando el resto de sistemas (economía, pueblo, némesis) estén asentados, porque toca la espina dorsal del dungeon. Encaja con la visión roguelike/MMO: mapas procedurales = rejugabilidad infinita.

## Login con Google (Gmail) — partida multi-dispositivo
Idea: iniciar sesión con cuenta de Google para continuar la misma partida en distintos dispositivos (celular, tablet, PC).

Estado actual (por qué es un salto CORTO, no grande):
- Ya usamos **Firebase con auth anónima** (FirebaseStore guarda en `saves/{uid}`). El guardado en la nube YA existe; el problema es que la auth anónima genera un uid distinto por dispositivo/instalación, así que hoy cada dispositivo es una partida separada y no se puede recuperar si borras la app.
- El cambio es principalmente **cambiar auth anónima → Google Sign-In (Firebase Auth con GoogleAuthProvider)**. Con eso el `uid` es estable y el mismo en todos lados → la partida en `saves/{uid}` te sigue a cualquier dispositivo.

Implicaciones a resolver cuando toque:
- **UI de login**: pantalla/botón "Entrar con Google" antes del hub. Manejar estado no-autenticado.
- **Migración de partidas anónimas existentes**: si alguien ya jugó anónimo y luego entra con Google, ofrecer vincular (Firebase `linkWithCredential`) para no perder el progreso anónimo. O al menos migrar el save local.
- **Config Firebase real**: hoy firebaseConfig es placeholder (firebaseConfigured se activa al pegar la config). Requiere proyecto Firebase con Google provider habilitado + dominios autorizados (github.io).
- **Modo invitado**: conservar opción de jugar sin login (anónimo/local) para no forzar cuenta.
- **Reglas RTDB**: ya contempladas (`saves/{uid}` read/write == auth.uid); siguen sirviendo con uid de Google.
- Opcional: además de Google, permitir otros providers (email, Apple) más adelante.

Nota: es el habilitador natural de la visión MMO/mundo compartido — identidad estable de jugador = prerequisito para leaderboards, Overlords globales atribuidos a jugadores, etc.

## Pendiente de balance — % de caída de oro (EN PRUEBA)
Nox propuso 50% plano ("moneda al aire") en vez del actual por-tipo (esqueleto 65% / rata 10% / lobo 15%). Lo está probando antes de decidir.
Opciones cuando decida:
- A) 50% plano para todos: simple y claro, pierde el matiz temático (bestias=materiales).
- B) Por tipo menos extremo: esqueleto ~60%, bestias/ratas ~35-40% — mantiene "no-muertos dan más oro" sin castigar tanto las criptas de bestias.
Dial: goldDropChance en loot.ts.

## Historias y quests narrativas (VISIÓN)
Idea de Nox: escribir historias para generar quests, y que las misiones NO sean solo bajar lineal, sino objetivos como "ir a buscar algo o alguien". 
- Sistema de quests con objetivos variados: buscar un objeto, encontrar/rescatar un PNJ, cazar un objetivo específico, escoltar, entregar, etc.
- Conecta con el tablón de misiones del pueblo (ver visión del Pueblo) y con los avisos de Overlord.
- Las historias dan contexto/lore a las criptas: por qué bajas, qué buscas, quién te lo pide.
- Encaja fuerte con las criptas navegables (buscar "algo o alguien" implica explorar un mapa, no solo avanzar salas).
- Posible generación: plantillas de quest + relleno procedural (objetivo, lugar, recompensa) o quests escritas a mano para momentos clave.
- Es el pegamento narrativo que convierte "matar salas" en "tengo una razón para bajar".

## Ataques de área / barrido (para combate en grupo)
Hoy todas las habilidades pegan a UN solo objetivo (el motor no tiene concepto de multi-objetivo). Idea: ataques de área que peguen a varios enemigos con daño reducido, vs. ataques que concentran en uno.
- Ejemplo: "Tajo amplio" barre 2-3 enemigos con menos daño c/u; "Estocada" concentra todo en uno. Decisión táctica: ¿reparto o concentro?
- El nombre "Tajo" ya sugiere corte amplio pero hoy es single-target (disonancia nombre↔mecánica).
- Requiere que el motor aprenda "objetivos múltiples" (AbilitySpec con un flag aoe / número de objetivos, y el combate aplique a varios).
- Encaja perfecto con los grupos de enemigos ya existentes y complementa el uso del escudo para control de multitudes.

## Trampas por zona (autocuidado al avanzar)
Idea de Nox: al entrar a una sala hay una probabilidad de trampa. Revisar (rebuscar/observar) las descubre y desactiva; avanzar sin revisar arriesga caer en una.
- La probabilidad es BAJA (no frustrante) pero real: sin revisar casi siempre pasas, pero a veces caes.
- Convierte "rebuscar" en decisión de autocuidado, no solo de loot. Tensión por zona.
- POR ZONA (biome del calabozo):
  - Ruinas: trampas MAN-MADE, intencionales (púas, flechas, dardos de veneno, losas de presión) — más frecuentes y más dañinas. En ruinas revisas todo.
  - Cripta (no-muertos): mecanismos antiguos, tumbas trampa — frecuencia media.
  - Guarida/bosque (bestias) y Madriguera (alimañas): peligros NATURALES/manuales (fosas, resbalones, derrumbes, caídas) — menos frecuentes, daño por caída/tropiezo. Andas más despreocupado.
- Tipos de trampa: púas (daño directo), pozo/foso (daño por caída), flechas/dardos (daño + posible veneno = DoT), veneno (modifier tipo sangrado), losa (aturde/derriba).
- Revisar la sala (searchChance con DES/INT) también sirve para DETECTAR/DESACTIVAR la trampa antes de avanzar → sinergia con el sistema de rebuscar que ya existe.
- Daño escala con profundidad. Trampa fallida podría rolar un modifier (veneno como DoT usando el sistema de modifiers existente).
- Balance: la clave es que el % sea bajo para que no castigue avanzar rápido, pero suficiente para que en zonas peligrosas (ruinas) revisar valga la pena.

## Modo auto-batalla con IA (al tintero)
Idea: un "modo auto" donde una IA juega el combate y narra su razonamiento en un chat/log.
- Diseño elegido: opción 2 + toque visual 3 → la IA decide leyendo el estado real, RESALTA el botón elegido, lo ejecuta, y comenta su razonamiento turno a turno.
- Dos variantes de "cerebro":
  1) HEURÍSTICO (recomendado para el juego real): agente client-side que elige por valor esperado (acierto% × daño que ya calculamos), apunta al enemigo más cercano a morir, se cura cuando toca. Gratis, funciona en GitHub Pages, determinista, ideal para testear balance (mil peleas). Narra su razonamiento en lenguaje natural (puede ser técnico o con personalidad).
  2) LLM (Claude de verdad vía API de artifacts): solo funciona dentro del sandbox de claude.ai (llave inyectada); NO en GitHub Pages (no hay llave, e incrustarla es inseguro/costoso). Sirve como demo, no en producción.
- Narración en chat: el heurístico ya sabe POR QUÉ eligió (comparó EVs), así que solo hay que verbalizarlo. Opción técnica ("Estocada: 58%×36=20.9 supera Finta 10.1") o con personalidad ("este esqueleto ya tiembla, arriesgo el remate").
- Útil como: demo llamativa, playtester automático (reporta qué se siente injusto/confuso), y caza-bugs/desbalance corriendo muchas partidas.

## Editor de contenido con contraseña (panel de administración) — GRANDE, a futuro
Idea de Nox: pantalla de admin protegida con contraseña para agregar/editar TODO el contenido
(enemigos, calabozos, armas, escudos, armaduras, ítems, recetas, materiales, habilidades…)
sin tocar código. Que los agregados futuros sean naturales, no en el código.

DECISIONES TOMADAS:
- Alcance: TODO editable (no empezar con una sola cosa).
- Dónde vive: en FIREBASE, editable en vivo, sin recompilar.
- Cuándo: a futuro (después del i18n y el balance actual).

ARQUITECTURA (el corazón NO es el formulario, es mudar contenido de código a datos):
- Hoy el contenido está hardcodeado: catalog.ts (armas), enemies.ts (TEMPLATES), gear.ts
  (armaduras/escudos), forge.ts (FORGE_WEAPONS + RECIPES), materials.ts, dungeons.ts, abilities.ts.
- Migrar cada categoría a una colección/nodo en Firebase (p.ej. content/weapons, content/enemies,
  content/dungeons, content/recipes, content/materials, content/gear, content/abilities).
- El juego, al arrancar, CARGA el contenido desde Firebase (con caché local + fallback a un
  "seed" empaquetado por si Firebase falla o está offline — el PWA debe seguir jugable).
- Los IDs siguen siendo la clave (weapon.id, enemy.id) para saves/cargados/i18n.

RETOS / RED DE SEGURIDAD (clave para no romper el juego en vivo):
- Se pierde la validación de TypeScript. El editor DEBE validar al guardar (campos requeridos,
  tipos de dado "NdM", rangos de stats, req bien formados, referencias válidas a materiales/habilidades).
  Justo la clase de bug "arrays/objetos vacíos → undefined" que ya sufrimos con Firebase: el editor
  tiene que impedir guardar contenido mal formado (usar el mismo stripUndefined + validadores).
- Versionado: los datos en Firebase no tienen historial como Git. Considerar un export/backup
  (botón "descargar todo el contenido como JSON") y quizá un campo de versión por entrada.
- Seguridad: "contraseña" en cliente NO es seguridad real. Opciones: (a) gate suave por contraseña
  local solo para ocultar el panel (suficiente si el riesgo es bajo — es TU juego); (b) real:
  reglas de Firebase que solo permitan escribir a content/* si el uid es el de Nox (admin allowlist).
  Recomendado: (b) reglas por uid admin + (a) gate visual. Así nadie más puede escribir aunque encuentre el panel.
- i18n: el contenido nuevo necesitará nombres ES/EN. El editor debería capturar ambos idiomas
  (o al menos ES, y marcar EN como pendiente). Encaja con el sistema t()/tName que estamos montando.

FASES SUGERIDAS (cuando le entremos):
1. Definir esquemas de datos por categoría (lo que ya existe en código, formalizado como shape validable).
2. Capa de carga: el juego lee contenido desde Firebase con seed/fallback empaquetado + caché offline.
   (Migrar UNA categoría primero como piloto — p.ej. armas — probar que el juego sigue idéntico.)
3. Panel admin (gate por uid admin + contraseña visual): CRUD por categoría con validación al guardar.
4. Migrar el resto de categorías. Export/backup JSON. Captura ES/EN.

NOTA: es proyecto de varias sesiones. El editor en sí (formularios) es lo fácil; lo laborioso y
delicado es (2) la capa de datos con fallback y (3) la validación que evita romper el juego en vivo.

## Selector de mazmorra + desbloqueo por nivel + llaves de profundidad — GRANDE
Resuelve: grind de pisos bajos, falta de sink para oro tardío, y "tienes que pasar por lo fácil
para llegar a lo divertido". Idea de Nox, diseño cerrado.

### 1. Selector de mazmorra al entrar
- "Entrar al calabozo" ya NO elige bioma al azar → abre una pantalla de selección de mazmorra.
- Cada mazmorra muestra su estado: desbloqueada o "🔒 Nv X".
- 4 mazmorras (biomas ya existentes): cripta, madriguera, guarida (cueva), ruinas.

### 2. Desbloqueo por nivel de personaje (fijo)
- Madriguera: Nv 1  |  Cripta: Nv 1  |  Guarida: Nv 6  |  Ruinas: Nv 10
- Bloqueada = gris + candado + "Nv X" hasta alcanzar el nivel. Subir de nivel abre contenido tangible.

### 3. Llaves de profundidad (por mazmorra, permanentes)
- Llaves SON POR MAZMORRA: llave de Cripta, llave de Madriguera, etc. (no globales).
- Se encuentran al REBUSCAR la última sala de un piso múltiplo de 5 (piso 5, 10, 15…),
  con PROBABILIDAD ~35% (premio raro, hace que rebuscar valga). "Pegada a una puerta" (flavor).
- Al conseguirla, ese piso queda DESBLOQUEADO PERMANENTEMENTE en esa mazmorra.
- Desbloquear un piso NO obliga a entrar ahí: dentro de la mazmorra elegida, el jugador
  ELIGE desde qué profundidad empezar (piso 1, o cualquier múltiplo de 5 desbloqueado en ESA mazmorra).
- Empezar en piso 10 → enemigos ESCALAN al piso 10 (reto real, la dificultad usa la profundidad de entrada).
- Salto SOLO de entrada: al morir reapareces en el refugio (sin checkpoints de reaparición).

### DATOS NUEVOS (Firebase — cuidado con la clase de bug de arrays/objetos vacíos)
- SavedGame gana algo como: `unlockedDepths: Record<biome, number[]>` (múltiplos de 5 desbloqueados por mazmorra).
  OJO: usar stripUndefined; inicializar a {} o [] de forma segura; hydrate con fallback ?? {} / ?? [].
- El nivel de personaje ya existe (para el gating de desbloqueo).
- No hace falta guardar "llave" como ítem si el desbloqueo es permanente: basta con registrar el piso desbloqueado.
  (Alternativa: guardar llaves como inventario si queremos que se vean/coleccionen — decidir al implementar.
   Por ahora: registrar profundidad desbloqueada por bioma es lo mínimo y más robusto.)

### PIEZAS DE IMPLEMENTACIÓN (cuando le entremos)
1. dungeons.ts: agregar `minLevel` por DungeonType (mad1/crip1/guar6/ruin10). Quitar pickDungeon aleatorio del flujo de entrada.
2. Nueva pantalla DungeonSelect: lista de mazmorras con estado (desbloqueada/🔒Nv), y al elegir una,
   sub-selección de profundidad de entrada (1 + múltiplos de 5 desbloqueados en esa mazmorra).
3. Dungeon.tsx: aceptar `startDepth` (profundidad de entrada) en vez de arrancar siempre en 1;
   la escala de enemigos ya usa `depth`, así que arrancar depth alto da reto alto (casi gratis).
4. Llave: al rebuscar la última sala de un piso múltiplo de 5, rollear ~35% → si sale, registrar
   ese piso como desbloqueado para el bioma actual + alerta propia ("🗝️ ¡Llave encontrada!" estilo la de trampa).
   Debe distinguir "última sala del piso" (roomInStage === stageRooms-1) y "piso múltiplo de 5" (stage % 5 === 0).
5. i18n: textos ES/EN para selector, candados, llave encontrada, selección de profundidad.
6. Firebase: persistir unlockedDepths con las guardas anti-undefined.

### NOTAS DE BALANCE
- Niveles de desbloqueo: mad1/crip1/guar6/ruin10. Prob. de llave: 35%.
- El sink de oro llega solo: mazmorras difíciles piden mejor equipo (forja/tienda) → el oro tardío tiene destino.
- Verificar: ¿el "stage múltiplo de 5" cuenta como stage global o por-mazmorra? El juego usa stage/room/depth;
  confirmar que "piso" = depth acumulada y que múltiplo de 5 se mide sobre esa profundidad de entrada + avance.

## Página de estadísticas pública (dashboard del creador) — EN CONSTRUCCIÓN
Idea de Nox: página pública para ver si la gente juega. Agregados + top 10 con nombres de personaje.

### Arquitectura (elegida por Nox — muy limpia)
- GitHub Action programado (cron cada 8h) corre un script Node con Firebase Admin SDK
  (service account en secretos de GitHub), lee todos los saves/{uid}, calcula métricas, y
  escribe/commitea un stats.json en el repo (publicado en Pages).
- La página pública NUNCA toca Firebase: solo lee el stats.json estático. Ventajas: no expone
  credenciales, no hay abuso de lecturas, carga instantánea, reglas de Firebase siguen cerradas.
- Vive en DOS lados apuntando al mismo JSON: stats.html (dashboard dedicado) + botón "Estadísticas"
  en el hub de la app. Ambos fetch al mismo /stats.json.

### Métricas (agregados + top 10)
Directas (de los saves): jugadores guardados (conteo), lvl máx, lvl promedio, oro máx, oro promedio,
cantidad máx de némesis, némesis más fuerte (mayor nivel entre todos los cargados).
Top 10: ranking por nivel (o por oro) con NOMBRE DE PERSONAJE.
maxDepth: nivel más profundo llegado — NO retroactivo, se empieza a registrar ahora.

### Piezas
1. [HACER YA] Registrar maxDepth en el save: campo maxDepth en SavedGame, se actualiza cada vez que
   se baja (depth). Sin esto la métrica de profundidad no tiene datos. NO retroactivo.
2. Script Node scripts/build-stats.mjs: Admin SDK lee saves/*, agrega, escribe public/stats.json.
3. Workflow .github/workflows/stats.yml: cron cada 8h + workflow_dispatch manual; corre el script,
   commitea stats.json (o lo publica como artifact de Pages).
4. Secreto GitHub: FIREBASE_SERVICE_ACCOUNT (JSON de service account con permisos de lectura).
5. Página stats.html + botón "Estadísticas" en hub. Estética consistente (parchment/brass del juego).
6. i18n ES/EN de la página.

### Consideraciones
- Privacidad: nombres de PERSONAJE (no de cuenta/email) — es seguro, son alias del juego.
- El JSON debe ser robusto a saves malformados (mismo problema de arrays/objetos vacíos): el script
  valida y salta entradas corruptas.
- maxDepth: guardar el máximo histórico (Math.max con el actual) por jugador, no la profundidad actual.

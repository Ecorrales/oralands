
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

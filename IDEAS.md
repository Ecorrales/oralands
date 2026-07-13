
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

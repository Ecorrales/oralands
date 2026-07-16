# Oralands — Roadmap

Orden sugerido para sacar las features. Criterio: primero lo de alto impacto y bajo riesgo
(jugo + bucles que reutilizan mecánica probada), luego lo que expande sistemas, y al final
lo estructural y las visiones grandes. Cada ola es un entregable jugable por sí mismo.

Etiquetas: [S]=chico  [M]=medio  [L]=grande  [XL]=enorme  · 🔥=alto impacto  · ♻️=reutiliza mecánica existente

---

## ✅ Ya en vivo
- Bilingüe completo (ES/EN) con botón.
- Trampas por zona + alerta propia de detección.
- Selector de mazmorra + desbloqueo por nivel + llaves de profundidad.
- Página de estadísticas (Firebase, cero redeploys).
- Némesis: encadena ataques, sube de nivel al ganarte, empuña el arma que te robó.
- Vender materiales.

---

## 🌊 Ola 1 — Jugo y sentir  (rápido, máximo impacto emocional)
*Capa de presentación sobre eventos que YA ocurren → bajo riesgo, alta recompensa. Ideal ahora que hay jugadores.*

1. **Rituales — pantallas de momento** [M] 🔥♻️
   - Empezar por EL NACIMIENTO DEL NÉMESIS (el momento más memorable del juego).
   - Full-screen, nombre letra por letra, sonido grave. Luego: némesis asciende, llave encontrada.
   - Reutiliza eventos existentes; solo es la capa de presentación. Verificar audio (Tone.js).
2. **Sabor pendiente del némesis** [S]
   - Label "hombre bestia" para némesis de bestias (fase 2 del sabor). Detalle rápido.

## 🌊 Ola 2 — Bucles y ritmo  (medio, reutiliza mecánica probada)
*Añaden engagement e interactividad. Bajo riesgo técnico.*

3. **Forja con tiempo real** [M] ♻️
   - Forjar toma 5 min reales ("vuelve más tarde"). Reutiliza el timer del campamento (timestamps).
   - Puedes bajar al calabozo mientras forja en paralelo. Engagement loop temático.
4. **Mini-juego de desactivar trampas** [M]
   - Detectar trampa → reto de destreza (barra con zona verde / QTE) → atinar la desactiva, fallar la dispara.
   - Convierte el autocuidado pasivo en interacción activa y tensa. Se apoya en el sistema de trampas.

## 🌊 Ola 3 — Profundidad de combate  (medio-grande)
*Expanden el combate; se refuerzan entre sí.*

5. **Mascota — domar fieras (d20)** [M-L] 🔥
   - Fiera moribunda → opción "Domar" → 1d20 + (DEX/INT) vs. umbral por temperamento → éxito=aliada, fallo=matarla.
   - Comportamiento: agresiva / protectora / normal (IA heurística). Domar exitoso MERECE un ritual (sinergia Ola 1).
6. **Ataques de área / barrido** [M]
   - Tajo/Sajadura golpean a varios enemigos (~65% daño). Mejora el combate en grupo y sinergiza con mascotas.

## 🌊 Ola 4 — El salto estructural
7. **Editor de contenido (admin)** [L] 🔥
   - Panel con contraseña para dar de alta monstruos, ítems, calabozos, recetas SIN código, en Firebase.
   - El mayor ROI a largo plazo: creas contenido desde el celular. Ya se justifica por el volumen actual.
   - Requiere migrar contenido de código a datos + validación + reglas por uid admin + fallback offline.

## 🌊 Ola 5 — Visión  (lo más grande, cuando estés listo)
8. **El Pueblo — el refugio evoluciona** [L] — posada, herbolario, gremio, tablón de misiones.
9. **Historias / quests narrativas** [L] — objetivos no lineales (encuentra algo/alguien).
10. **Overlord global** [L] — un némesis asciende a jefe del mundo compartido (nodo Firebase compartido).
11. **Criptas navegables — mapa 2D explorable** [XL] 🔥 — el cambio más transformador (reemplaza pasillo lineal).
12. **Modo auto-batalla con IA** [M] — al tintero; heurística que juega y narra. Sinergia con la IA de mascotas.

---

## Notas de secuencia
- **Rituales primero** porque hace que TODO lo demás se sienta más épico (némesis, llaves, domar).
- **Domar + área** juntos: el combate multi-criatura mejora para ambos.
- **Editor** antes de las visiones grandes: crear contenido nuevo será mucho más rápido después.
- Las visiones (Ola 5) pueden reordenarse según lo que pida el feedback de jugadores reales.

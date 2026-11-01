# Consultorio de la Dra. Laura: recordatorios de citas y seguimiento de tratamientos

Aplicación para un consultorio dental pequeño: recordatorios de citas por WhatsApp y seguimiento de tratamientos de varias sesiones. Demo interactiva con datos de ejemplo: no envía mensajes ni se conecta a calendarios reales.

**Demo en línea (GitHub Pages):** https://arteduro.github.io/consultorio-dental-demo/

## Contenido
- `AGENTS.md`: contexto persistente del proyecto.
- `docs/ICP-persona.md`: ICP y user persona (qué datos vienen del caso y cuáles son inventados).
- `docs/SPEC-recordatorios.md`: spec de recordatorios y confirmación de citas (clase 2), con 5 criterios de aceptación.
- `docs/SPEC-tratamientos.md`: spec de seguimiento de tratamientos multisesión (clase 3), con 5 criterios de aceptación y métricas de éxito.
- `.claude/skills/marca-consultorio/SKILL.md`: guía de marca (tokens en `src/tokens.css`).
- `src/engine.js`: lógica de recordatorios y confirmación.
- `src/treatments.js`: lógica de seguimiento de tratamientos.
- `src/app.js`, `index.html`, `src/styles.css`: interfaz con reloj simulado, pestañas Citas / Tratamientos / Métricas.
- `test/`: pruebas de los criterios de ambas specs.

## Probar
```
node --test   # o: npm test
python3 -m http.server 8080   # y abrir http://localhost:8080
```
No requiere instalar nada (Node 20 o superior).

Para un recorrido de ejemplo (una cita cancelada, una confirmada, una en riesgo, un tratamiento en riesgo de abandono y uno completado) abre `index.html#demo`.
- `docs/capturas/`: capturas de la página a 320, 390 y 1280 px (recorrido de ejemplo `#demo`).

# Proyecto: asistente de recordatorios para el consultorio de la Dra. Laura

## El caso
- Consultorio dental pequeño: la Dra. Laura y una asistente.
- Las citas se agendan en Google Calendar y eso les funciona bien.
- Cerca del 30% de los pacientes no llega y esos espacios se pierden.
- Los tratamientos de varias sesiones se abandonan a la mitad.
- La asistente gasta buena parte de la mañana enviando recordatorios de WhatsApp uno por uno.
- No necesitan facturación ni expediente clínico.

## Requisitos del prompt original (enviado el 28 oct 2026)
- Google Calendar es la fuente de las citas; la solución no lo reemplaza.
- Recordatorios automáticos por WhatsApp (por ejemplo 48 h y 2 h antes) con confirmación o cancelación por respuesta.
- Avisar a la asistente cuando un paciente cancela o no confirma.
- Panel simple con las citas del día y su estado.
- Prototipo con datos ficticios y simulaciones: sin calendarios ni mensajes reales, sin pagos. Bandeja de salida visible.
- Fuera de alcance: facturación y expediente clínico.

## Alcance de las entregas
- Clase 2 (1 nov 2026): recordatorios y confirmación de citas. Spec en `docs/SPEC-recordatorios.md`.
- Clase 3 (1 nov 2026): ICP y persona en `docs/ICP-persona.md`; nueva función, seguimiento de tratamientos multisesión, con spec en `docs/SPEC-tratamientos.md` (incluye métricas de éxito); página adaptada al ICP y publicada en GitHub Pages.

## Decisiones de diseño tomadas (Edgar dio libertad de diseño el 1 nov 2026)
Son decisiones del prototipo, no requisitos del caso. Citas: respuestas 1/2, estado En riesgo a los 30 min del recordatorio de 2 h. Tratamientos: mensaje de cuidado 24 h tras cada sesión, recordatorio de agenda a los 7 días sin próxima cita, riesgo de abandono a los 14 días, el tiempo nunca da por abandonado a nadie. El panel lo usa la asistente (persona "Marcela": datos marcados como inventados en `docs/ICP-persona.md`).

## Reglas para el agente
- Lee la spec antes de programar; no inventes comportamientos.
- Si un criterio falla, corrige primero la spec y luego el código.
- Cada criterio de aceptación tiene al menos una prueba en `test/`.
- Sigue la skill `.claude/skills/marca-consultorio` y los tokens de `src/tokens.css`.
- Nunca conectes servicios reales ni envíes mensajes reales en este prototipo.

# Spec: seguimiento de tratamientos multisesión (Tarea 3, paso 2)

Nueva característica sobre el proyecto de la clase 2 (recordatorios y confirmación de citas, `docs/SPEC-recordatorios.md`).
Origen de cada punto: **caso**, **diseño** (decisión del prototipo; Edgar dio libertad de diseño el 1 nov 2026) o **tarea** (requisito del enunciado de la tarea 3).

## 1. Problema
Los tratamientos de varias sesiones se abandonan a la mitad (caso). Hoy nadie lleva la cuenta de qué paciente debe volver ni cuándo: la asistente lo lleva en la cabeza y se le escapan. La función acompaña cada tratamiento entre sesiones: cuida al paciente después de cada cita, le recuerda agendar la siguiente y avisa a la asistente antes de que el tratamiento se pierda.

## 2. Diseño de la solución
1. Un tratamiento tiene paciente, tipo (endodoncia, ortodoncia, limpieza...) y número total de sesiones. (diseño)
2. Al registrar una sesión realizada se programa un mensaje de cuidado para 24 h después: "¿cómo sigues? Si tienes alguna molestia, responde". (diseño)
3. La próxima sesión se agenda en el calendario como siempre; la aplicación solo la vincula al tratamiento. No reemplaza al calendario. (caso)
4. Si pasan 7 días desde la última sesión sin próxima cita agendada: el tratamiento pasa a "Sin próxima cita", se envía un recordatorio al paciente y se avisa a la asistente. (diseño)
5. Si pasan 14 días sin próxima cita: pasa a "En riesgo de abandono" y se avisa a la asistente para llamar. El tiempo nunca marca un tratamiento como abandonado por sí solo; solo una persona decide eso. (diseño)
6. Agendar la próxima sesión devuelve el tratamiento a "Activo" y cierra los avisos. Responder al seguimiento no equivale a agendar: la respuesta se registra y se muestra a la asistente. (diseño)
7. Al terminar la última sesión, el tratamiento queda "Completado": un mensaje de felicitación y cierre; no se generan más recordatorios ni alertas de ese tratamiento. (diseño)
8. Sin duplicados: cada mensaje y cada aviso tiene clave única; repetir una sesión o avanzar el reloj dos veces no duplica nada. (diseño)
9. WhatsApp y el calendario siguen simulados: no se envía nada real. (caso / prompt original)

## 3. Criterios de aceptación (pruebas en `test/treatments.test.mjs`)
1. **Cuidado post-sesión (T1).** Cada sesión registrada programa su mensaje de cuidado una sola vez y sale a las 24 h, no antes.
2. **Cierre (T2).** La última sesión marca el tratamiento Completado, felicita al paciente y no genera más recordatorios ni alertas.
3. **Sin próxima cita (T3).** A los 7 días sin agendar: recordatorio al paciente y aviso a la asistente. Al vincular una cita vuelve a Activo y los avisos se cierran.
4. **Riesgo de abandono (T4).** A los 14 días: En riesgo de abandono con aviso. El paso del tiempo nunca lo da por abandonado; agendar la próxima sesión lo reactiva.
5. **Sin duplicados y respuestas (T5).** Avanzar el reloj varias veces no duplica mensajes ni avisos; la respuesta del paciente se registra y avisa a la asistente sin agendar por él.

## 4. Métricas de éxito (tarea)
Medibles con conteos de la operación diaria. En el prototipo el panel Métricas muestra estos contadores con datos ficticios, solo para ilustrar cómo se leerían; no son resultados reales.

1. **Finalización de tratamientos:** % de tratamientos multisesión completados sobre los iniciados. Línea base: el caso indica que hoy se abandonan a la mitad. Meta propuesta (diseño): reducir el abandono a la mitad en 3 meses.
2. **Agendamiento oportuno:** % de sesiones cuya siguiente sesión queda agendada en 7 días o menos. Meta propuesta (diseño): 80%.
3. **Rescate:** % de tratamientos En riesgo de abandono que vuelven a Activo tras el contacto de la asistente. Meta propuesta (diseño): 50%.
4. **Tiempo de la asistente:** minutos al día en seguimiento manual de tratamientos. Meta propuesta (diseño): menos de 10 minutos, frente a la revisión manual paciente por paciente.

## 5. Fuera de alcance
Facturación, expediente clínico, planes de tratamiento clínicos (dosis, diagnósticos), envío real de WhatsApp, calendarios reales.

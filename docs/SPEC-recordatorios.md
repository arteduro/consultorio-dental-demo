# Spec: recordatorios y confirmación de citas

Origen de cada punto: **caso**, **prompt** (prompt original del 28 oct 2026) o **diseño** (decisión del prototipo; Edgar dio libertad de diseño el 1 nov 2026).

## 1. Problema
Cerca del 30% de los pacientes no llega y el espacio se pierde. La asistente envía los recordatorios a mano y cuando alguien cancela o no responde nadie se entera a tiempo. La función envía los recordatorios sin trabajo manual, deja confirmar o cancelar por respuesta y muestra a la asistente qué citas necesitan atención.

## 2. Diseño de la solución
1. Las citas vienen de Google Calendar; en el prototipo, un calendario simulado. (prompt)
2. Dos recordatorios por cita: 48 h y 2 h antes. (prompt, como ejemplo)
3. Programado no es enviado: un recordatorio Programado tiene salida futura; es Enviado solo cuando llegó su hora y aparece en la bandeja. (diseño)
4. Respuesta 1 = confirmar, 2 = cancelar. (diseño)
5. Estados: Sin confirmar (inicial), Confirmada, Cancelada, En riesgo. (diseño)
6. En riesgo: pasan 30 min desde el recordatorio de 2 h sin respuesta. El silencio nunca cancela ni libera el espacio. (diseño; el prompt pide avisar si no confirma)
7. Cancelación del paciente: Cancelada, aviso a la asistente, espacio marcado como disponible, recordatorios pendientes suprimidos. La app no escribe en Calendar. (prompt + diseño)
8. Reprogramación: pendientes antiguos anulados, nuevos para la hora nueva, estado vuelve a Sin confirmar, lo enviado queda en el historial. (diseño)
9. Poco margen: solo se programan recordatorios cuya hora no ha pasado. Menos de 48 h: solo el de 2 h. Menos de 2 h: ninguno y aviso a la asistente. Nada se envía de golpe. (diseño)
10. Sin duplicados: clave = cita + tipo + hora de la cita. Repetir la sincronización o la misma respuesta no cambia nada. Una respuesta tras cancelar se registra y no reactiva. (diseño)
11. Respuesta que no se entiende: se repite la instrucción una vez y se avisa a la asistente. (diseño)
12. Cancelación hecha en el calendario: igual que 7 sin aviso de cancelación. (diseño)
13. Panel: citas, estado, avisos y bandeja (Programados / Enviados). (prompt)

## 3. Criterios de aceptación (pruebas en `test/engine.test.mjs`)
1. **Programación (C1).** Cita con más de 48 h: dos recordatorios Programados y ninguno Enviado; al llegar su hora pasan a Enviados una sola vez.
2. **Confirmar y cancelar (C2).** 1 confirma. 2 cancela, avisa, marca el espacio disponible y suprime los pendientes.
3. **Silencio (C3).** 30 min tras el recordatorio de 2 h sin respuesta: En riesgo con aviso; la cita sigue activa y el espacio no se libera. Una respuesta tardía 1 confirma.
4. **Reprogramación (C4).** Pendientes antiguos anulados, nuevos creados, estado Sin confirmar, lo enviado se conserva.
5. **Poco margen y duplicados (C5).** Menos de 48 h: solo 2 h. Menos de 2 h: ninguno y aviso. Sincronizar dos veces o repetir una respuesta no duplica.

## 4. Fuera de alcance
Seguimiento de tratamientos, facturación, expediente clínico, envío real de WhatsApp, calendarios reales.

## 5. Historial de ajustes a la spec
- Al implementar se añadió el punto 12 (cancelación desde el calendario), que la primera versión no cubría.

# ICP y user persona (Tarea 3, paso 1)

Basado en la definición del problema de la tarea 1. Origen de cada dato: **caso** (viene del enunciado del consultorio dental) o **inventado** (permitido por la tarea para lo que el caso no define).

## ICP: a qué cliente le sirve

Consultorio dental pequeño e independiente en una ciudad intermedia de Colombia (inventado: entre 100 mil y 1 millón de habitantes, como Cúcuta).

- Un consultorio de una o dos personas: el odontólogo y una asistente. (caso)
- La agenda vive en Google Calendar y les funciona; no quieren reemplazarla. (caso)
- Los pacientes se comunican por WhatsApp. (caso)
- Cerca del 30% de los pacientes no llega a la cita y esos espacios se pierden. (caso)
- Los tratamientos de varias sesiones se abandonan a la mitad. (caso)
- No usan software de gestión de consultorios. (inventado: lo consideran caro y con funciones que no necesitan)
- No necesitan facturación ni expediente clínico. (caso)
- Presupuesto de software muy limitado; pagan solo si el ahorro de tiempo es evidente. (inventado)
- Volumen típico: 30 a 60 citas por semana y 10 a 20 tratamientos activos. (inventado)

**Lo que compra este cliente:** menos espacios vacíos y menos tratamientos abandonados, sin cambiar su agenda ni aprender un sistema complejo.

## User persona: Marcela, la asistente

Quien usaría la aplicación todos los días.

- Marcela Gómez, 29 años, asistente del consultorio de la Dra. Laura desde hace 3 años. (inventado; el caso solo dice que existe una asistente)
- Atiende la recepción, el teléfono y el WhatsApp del consultorio al mismo tiempo. (inventado)
- Gasta buena parte de la mañana enviando recordatorios de WhatsApp uno por uno. (caso)
- Trabaja sobre todo desde el celular, entre paciente y paciente; revisa el computador solo en momentos libres. (inventado)
- Se le pasan los pacientes que no confirman y se entera tarde de las cancelaciones. (caso: el problema que describe la Dra. Laura)
- Lleva en la cabeza (o en notas sueltas) qué paciente tiene tratamiento pendiente y a cuál hay que llamar. (inventado)
- No es técnica: necesita pantallas claras, botones grandes y mensajes que digan qué hacer. (inventado)
- Le preocupa quedar mal con los pacientes: un recordatorio duplicado o una cita cancelada por error la avergüenzan. (inventado)

**Lo que necesita Marcela:** que los recordatorios salgan solos, ver de un vistazo qué citas necesitan atención hoy, y saber a qué paciente llamar antes de que abandone su tratamiento.

## Cómo el ICP y la persona cambian el diseño

- Móvil primero: la pantalla principal se usa en un celular de gama básica, con una mano. Botones de al menos 40 px y textos de 16 px.
- Resumen "Hoy" al abrir: citas que necesitan atención y tratamientos en riesgo, sin buscar.
- Un mensaje por paciente, claro y con una sola petición; nada duplicado.
- La aplicación nunca decide sola sobre una cita o un tratamiento (no cancela ni da por abandonado a nadie): propone y Marcela decide.

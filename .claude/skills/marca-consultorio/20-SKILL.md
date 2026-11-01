---
name: marca-consultorio
description: Guía de identidad visual y de voz para la app de recordatorios del consultorio de la Dra. Laura. Úsala al crear o cambiar cualquier pantalla, color, texto o mensaje de la aplicación.
---

# Marca: consultorio de la Dra. Laura

Fuente única de valores: `src/tokens.css`. No escribas colores sueltos en otros archivos; usa las variables.

## Personalidad
Cercana, tranquila y confiable. Un consultorio pequeño donde todos se conocen. Ordenado, sin lenguaje clínico complicado ni tono de banco.

## Color
- Primario `--marca-primario` (verde azulado #0f6e66): encabezado, botones principales, títulos de sección en su versión oscura.
- Fondo `--marca-fondo` y superficies blancas. Tinta casi negra para texto.
- Estados de cita, siempre con texto además del color:
  - Sin confirmar: gris.
  - Confirmada: verde.
  - En riesgo: ámbar.
  - Cancelada: rojo suave.
- Rojo solo para cancelaciones o errores. Ámbar para lo que pide atención de la asistente.

## Tipografía
Fuentes del sistema (`--fuente`). Cuerpo 16 px, metadatos 14 px, títulos de sección 17 px con peso 650. Nada de mayúsculas sostenidas.

## Formas y espacio
Esquinas de 10 px (`--radio`), bordes finos `--marca-linea`, mucho aire. Botones de al menos 36 px de alto (40 px los principales). Foco visible con contorno ámbar de 3 px.

## Voz
- Español colombiano, tuteo, frases cortas.
- Mensajes a pacientes: saludo con el nombre, una sola petición, instrucción clara ("Responde 1 para confirmar o 2 para cancelar").
- Mensajes para la asistente: qué pasó, con quién y qué puede hacer. Sin culpar al paciente.
- Evita: jerga técnica, signos de exclamación en serie, humor con temas de salud.

## Accesibilidad
- Contraste de texto mínimo 4.5:1 (los pares de `tokens.css` lo cumplen).
- El estado nunca se comunica solo con color.
- Todo se maneja con teclado; usa etiquetas y `role` donde hagan falta.
- Funciona en teléfono (320 px) y escritorio.

## Lo que no hace la marca
- No usa el nombre ni el logo de ninguna clínica real.
- No usa fotos de pacientes ni imágenes clínicas.
- Un logo es opcional; si se crea, que sea un símbolo simple (muela estilizada o calendario) con `--marca-primario`.

## Antes de dar por buena una pantalla
Revisarla a 320 px y a 1280 px: sin texto cortado, estados legibles, botones alcanzables.

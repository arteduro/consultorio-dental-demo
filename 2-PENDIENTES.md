# Pendientes de la demo

- **Envío real de correos con EmailJS:** al crear una cita con correo, la demo muestra el email de confirmación simulado en la bandeja, pero ningún correo sale de verdad. Falta crear el servicio y la plantilla en EmailJS (cuenta del consultorio) y conectar el envío. Hasta entonces los envíos reales permanecen desactivados.
- **Publicación con GitHub Pages:** el repositorio todavía no se publica en la web. Cuando se decida, se compila con `npm run build` y se sirve la carpeta `dist` (el `base` de Vite ya quedó preparado con ruta relativa `./`).

## Cómo correr la demo en local

```bash
npm install
npm run dev
```

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa para que el build pueda servirse después desde GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
});

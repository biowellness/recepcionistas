import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Alias `@bw` -> ../src para reutilizar la lógica pura del backend (semáforo,
// tipos, catálogo). `fs.allow: ['..']` permite importar desde la raíz del repo.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bw': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    fs: { allow: ['..'] },
  },
});

import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: ['MEDPLUM_', 'GOOGLE_', 'RECAPTCHA_'],
  plugins: [react()],
  preview: {
    port: 5173,
    allowedHosts: true,
    host: 'recepcion.medplum.com.ar',
  },
  server: {
    port: 5173,
    host: 'localhost',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test.setup.ts'],
    globals: true,
    testTimeout: 120000,
  },
});

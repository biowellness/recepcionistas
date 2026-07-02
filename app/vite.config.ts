import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Chequeo de host de Vite (protección anti DNS-rebinding del dev server).
// `true` = aceptar cualquier Host: esta app se sirve detrás de nuestros propios
// dominios (que ya cambiaron una vez: medplum.com.ar → biowellness.ar) y el
// bloqueo "Blocked request. This host is not allowed" volvía con cada cambio.
const ALLOWED_HOSTS = true as const;

export default defineConfig(({ mode }) => {
  // Vite lee las variables de app/.env (este directorio), NO del .env de la raíz.
  const env = { ...loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ['MEDPLUM_', 'GOOGLE_', 'RECAPTCHA_']), ...process.env };

  // Aviso visible en el build: sin GOOGLE_CLIENT_ID no aparece el botón de Google.
  if (env.GOOGLE_CLIENT_ID) {
    console.log(`  ✓ GOOGLE_CLIENT_ID detectado (login con Google habilitado): …${String(env.GOOGLE_CLIENT_ID).slice(-28)}`);
  } else {
    console.warn('  ⚠ GOOGLE_CLIENT_ID NO seteado: el botón "Acceder con Google" NO va a aparecer.');
    console.warn('    Definilo en app/.env (no en el .env de la raíz) y volvé a buildear.');
  }

  return {
    plugins: [react()],

    // Exponemos al navegador SOLO variables con estos prefijos (convención Medplum:
    // MEDPLUM_BASE_URL, GOOGLE_CLIENT_ID, RECAPTCHA_SITE_KEY, etc.).
    // ⚠️ SEGURIDAD: nunca pongas secretos en app/.env. Con el prefijo MEDPLUM_, una
    // variable como MEDPLUM_CLIENT_SECRET quedaría embebida en el bundle del cliente.
    // Los secretos van solo en el .env de la raíz (seed/bots), que NO se carga acá.
    envPrefix: ['MEDPLUM_', 'GOOGLE_', 'RECAPTCHA_'],

    // Alias `@bw` -> ../src para reutilizar la lógica pura del backend (semáforo,
    // tipos, catálogo). `fs.allow: ['..']` permite importar desde la raíz del repo.
    resolve: {
      alias: {
        '@bw': fileURLToPath(new URL('../src', import.meta.url)),
      },
    },

    server: {
      port: 5173,
      host: true,
      allowedHosts: ALLOWED_HOSTS,
      fs: { allow: ['..'] },
    },

    preview: {
      port: 5173,
      host: true,
      allowedHosts: ALLOWED_HOSTS,
    },
  };
});

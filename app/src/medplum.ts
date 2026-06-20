import { MedplumClient } from '@medplum/core';

/**
 * Cliente Medplum único de la app de recepción. Apunta a la API configurada por
 * env (MEDPLUM_BASE_URL, expuesta por el envPrefix de Vite). La sesión se
 * persiste en localStorage, así que el login sobrevive al refresh.
 */
export const medplum = new MedplumClient({
  baseUrl: import.meta.env.MEDPLUM_BASE_URL ?? 'https://api.medplum.com.ar/',
  cacheTime: 10_000,
});

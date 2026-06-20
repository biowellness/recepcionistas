import { MedplumClient } from '@medplum/core';

/**
 * Cliente Medplum único de la app de recepción. Apunta a la API configurada por
 * env (VITE_MEDPLUM_BASE_URL). La sesión se persiste en localStorage, así que el
 * login sobrevive al refresh.
 */
export const medplum = new MedplumClient({
  baseUrl: import.meta.env.VITE_MEDPLUM_BASE_URL ?? 'https://api.medplum.com.ar/',
  cacheTime: 10_000,
});

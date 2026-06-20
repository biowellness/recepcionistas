/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API de Medplum. */
  readonly MEDPLUM_BASE_URL?: string;
  /** Client ID de Google OAuth (login con Google). */
  readonly GOOGLE_CLIENT_ID?: string;
  /** Site key de reCAPTCHA. */
  readonly RECAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

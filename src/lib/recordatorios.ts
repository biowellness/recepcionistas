/**
 * Recordatorios automáticos de turnos — lógica pura (sin FHIR ni red).
 *
 * Se avisa a las 48 h y a las 2 h del turno. Como el cron no corre exactamente en
 * esos instantes, usamos ventanas "hacia abajo": un turno debe el recordatorio de
 * 2 h cuando falta ≤ 2 h, y el de 48 h cuando falta ≤ 48 h (pero > 2 h). Así, si
 * una corrida se saltea, el siguiente tick igual lo manda; la idempotencia (no
 * reenviar) la resuelve el bot al registrar la Communication.
 */
import { RECORDATORIO_HORAS } from '../config/reglas.js';

export type TipoRecordatorio = '48h' | '2h';

const HORA_MS = 3_600_000;

/** Umbrales en ms, de menor a mayor antelación (2 h primero, luego 48 h). */
const UMBRALES: Array<{ tipo: TipoRecordatorio; ms: number }> = RECORDATORIO_HORAS.map((h) => ({
  tipo: `${h}h` as TipoRecordatorio,
  ms: h * HORA_MS,
})).sort((a, b) => a.ms - b.ms);

/**
 * ¿Qué recordatorio (si alguno) corresponde mandar para un turno que arranca en
 * `inicio`, evaluado en `ahora`? Devuelve el más urgente aplicable, o `undefined`
 * si el turno está en el pasado o todavía falta más que la ventana máxima.
 */
export function recordatorioDue(inicio: Date, ahora: Date): TipoRecordatorio | undefined {
  const faltaMs = inicio.getTime() - ahora.getTime();
  if (faltaMs <= 0) {
    return undefined;
  }
  for (const u of UMBRALES) {
    if (faltaMs <= u.ms) {
      return u.tipo;
    }
  }
  return undefined;
}

/** Ventana máxima de anticipación a considerar (la mayor de las configuradas), en ms. */
export const VENTANA_MAX_MS = Math.max(...UMBRALES.map((u) => u.ms));

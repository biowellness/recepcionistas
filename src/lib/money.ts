/**
 * Utilidades de moneda. Precios de lista en USD; cobro en ARS al TC vigente (R-17).
 */
import { resolverTC } from '../config/tipo-cambio.js';

/** Redondea a 2 decimales (USD). */
export function redondearUSD(usd: number): number {
  return Math.round(usd * 100) / 100;
}

/**
 * Convierte USD a ARS al tipo de cambio dado. Redondea al peso entero.
 * Ej.: USD 165 a TC 1450 => ARS 239.250 (R-17 / AC-13).
 */
export function usdAArs(usd: number, tc?: number): number {
  const tipoCambio = resolverTC(tc);
  return Math.round(usd * tipoCambio);
}

/** Formatea un monto en ARS para mostrar (es-AR), p. ej. "$ 239.250". */
export function formatearARS(ars: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(ars);
}

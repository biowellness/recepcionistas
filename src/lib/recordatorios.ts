/**
 * Recordatorios (cron) — lógica pura, sin FHIR ni red. Testeable.
 *
 * Decide QUÉ avisar; el bot orquesta (busca turnos/planes, manda WhatsApp+email
 * y deduplica). Dos familias:
 *   - Recordatorio de turno: hitos 24h y 1h antes del inicio.
 *   - Saldo en riesgo: sesiones libres que están por perderse (membresía al
 *     cerrar el mes; paquete al vencer).
 */

export type HitoTurno = '24h' | '1h';

const MIN_DIA = 1440;
const MIN_HORA = 60;

/**
 * Hitos cuya ventana ya está abierta para un turno que empieza en `minutos`.
 *
 * - '24h' mientras el turno esté a más de 1h y hasta 24h (la primera corrida del
 *   cron en esa franja lo dispara; el bot deduplica para no repetir).
 * - '1h' cuando falta 1h o menos (y el turno no pasó).
 * Un turno reservado con < 24h de anticipación simplemente no recibe el de 24h.
 */
export function hitosEnVentana(minutos: number): HitoTurno[] {
  if (minutos <= 0) {
    return [];
  }
  const out: HitoTurno[] = [];
  if (minutos > MIN_HORA && minutos <= MIN_DIA) {
    out.push('24h');
  }
  if (minutos <= MIN_HORA) {
    out.push('1h');
  }
  return out;
}

export interface RiesgoSaldo {
  enRiesgo: boolean;
  /** Días hasta perder el saldo (cierre de mes o vencimiento). */
  diasRestantes: number;
  /** Sufijo para deduplicar el aviso: ciclo (membresía) o vencimiento (paquete). */
  periodoDedup: string;
}

const DIA_MS = 86_400_000;

function finDeMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function cicloMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * ¿El saldo libre de un plan está por perderse dentro de `ventanaDias`?
 * Membresía: cuenta hasta el cierre del mes. Paquete: hasta el vencimiento.
 */
export function riesgoDeSaldo(opts: {
  tipo: 'membresia' | 'paquete';
  libres: number;
  vencimiento?: string;
  ahora: Date;
  ventanaDias: number;
}): RiesgoSaldo {
  if (opts.tipo === 'membresia') {
    const dias = Math.ceil((finDeMes(opts.ahora).getTime() - opts.ahora.getTime()) / DIA_MS);
    return {
      enRiesgo: opts.libres > 0 && dias <= opts.ventanaDias,
      diasRestantes: Math.max(dias, 0),
      periodoDedup: cicloMes(opts.ahora),
    };
  }
  if (!opts.vencimiento) {
    return { enRiesgo: false, diasRestantes: 0, periodoDedup: 'sin-venc' };
  }
  const dias = Math.ceil((new Date(opts.vencimiento).getTime() - opts.ahora.getTime()) / DIA_MS);
  return {
    enRiesgo: opts.libres > 0 && dias >= 0 && dias <= opts.ventanaDias,
    diasRestantes: Math.max(dias, 0),
    periodoDedup: opts.vencimiento.slice(0, 10),
  };
}

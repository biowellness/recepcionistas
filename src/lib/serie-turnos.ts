/**
 * Serie de turnos recurrentes (pre-agenda de membresías) — lógica pura.
 *
 * Dada una fecha de inicio, los días de la semana elegidos y la cantidad de
 * sesiones, genera las próximas N fechas hábiles (saltea días cerrados y el
 * pasado). No toca FHIR ni horas: devuelve fechas civiles "YYYY-MM-DD"; el front
 * les pone la hora elegida y el bot de combo valida/reserva cada una.
 *
 * Las membresías son 2x/semana (Standard) o 3x/semana (Intensivo): la cantidad
 * de días elegidos define el ritmo semanal.
 */

export interface OpcionesSerie {
  /** Primer día candidato, "YYYY-MM-DD" (inclusive). */
  desde: string;
  /** Días de la semana a usar (0=domingo .. 6=sábado). */
  diasSemana: number[];
  /** Cantidad de fechas a generar. */
  cantidad: number;
  /** ¿El centro abre ese día de la semana? */
  esDiaAbierto: (dia: number) => boolean;
  /** Hoy "YYYY-MM-DD": se descartan fechas iguales o anteriores (la serie arranca mañana o después). */
  hoy?: string;
  /** Tope de días a explorar hacia adelante (seguridad). Default 120. */
  maxDias?: number;
}

function partes(fecha: string): { y: number; m: number; d: number } {
  const [y, m, d] = fecha.split('-').map(Number);
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 };
}

function clave(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Genera las fechas "YYYY-MM-DD" de la serie. Usa fechas civiles (medianoche
 * local) sólo para iterar y leer el día de la semana; no depende de la zona
 * horaria porque nunca cruza a otro día.
 */
export function generarSerieFechas(o: OpcionesSerie): string[] {
  const dias = new Set(o.diasSemana.filter(o.esDiaAbierto));
  const fechas: string[] = [];
  if (dias.size === 0 || o.cantidad <= 0) {
    return fechas;
  }

  const { y, m, d } = partes(o.desde);
  const cursor = new Date(y, m - 1, d);
  const tope = o.maxDias ?? 120;

  for (let i = 0; i < tope && fechas.length < o.cantidad; i++) {
    const k = clave(cursor);
    if (dias.has(cursor.getDay()) && (!o.hoy || k > o.hoy)) {
      fechas.push(k);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return fechas;
}

/**
 * Días de la semana sugeridos para una frecuencia, repartidos en la semana
 * (sólo días hábiles). 2x → Lun/Jue · 3x → Lun/Mié/Vie · 1x → Lun.
 * Filtra los cerrados y completa con los hábiles disponibles si hiciera falta.
 */
export function diasSugeridos(frecuenciaSemanal: number, esDiaAbierto: (dia: number) => boolean): number[] {
  const preferidos: Record<number, number[]> = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
  const habiles = [1, 2, 3, 4, 5, 6].filter(esDiaAbierto);
  const base = (preferidos[frecuenciaSemanal] ?? [1]).filter(esDiaAbierto);
  const out = [...base];
  for (const dia of habiles) {
    if (out.length >= frecuenciaSemanal) {
      break;
    }
    if (!out.includes(dia)) {
      out.push(dia);
    }
  }
  return out.sort((a, b) => a - b);
}

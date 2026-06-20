/**
 * Horario de atención del centro (genera las franjas reservables de cada sala).
 *
 * ⚠️ PROVISIONAL / BLOQUEANTE: estos valores son un PLACEHOLDER hasta que Andrés
 * confirme el horario real (decisión bloqueante del brief). Al recibirlo se
 * actualiza este archivo y se regeneran los Slot. NO usar en producción tal cual.
 *
 * `dia`: 0=domingo ... 6=sábado (Date.getDay()).
 */
export interface FranjaHoraria {
  /** Hora de apertura "HH:mm" (24h, hora de Argentina). */
  desde: string;
  /** Hora de cierre "HH:mm". */
  hasta: string;
}

export interface HorarioDia {
  dia: number;
  abierto: boolean;
  franjas: FranjaHoraria[];
}

/** Granularidad de los slots, en minutos (sesión mínima = 30 min). */
export const SLOT_GRANULARIDAD_MIN = 30;

/** Zona horaria del centro. */
export const TZ = 'America/Argentina/Buenos_Aires';

/** PLACEHOLDER — reemplazar con el horario real confirmado por Andrés. */
export const HORARIO_SEMANAL: HorarioDia[] = [
  { dia: 0, abierto: false, franjas: [] }, // Domingo
  { dia: 1, abierto: true, franjas: [{ desde: '08:00', hasta: '21:00' }] }, // Lunes
  { dia: 2, abierto: true, franjas: [{ desde: '08:00', hasta: '21:00' }] },
  { dia: 3, abierto: true, franjas: [{ desde: '08:00', hasta: '21:00' }] },
  { dia: 4, abierto: true, franjas: [{ desde: '08:00', hasta: '21:00' }] },
  { dia: 5, abierto: true, franjas: [{ desde: '08:00', hasta: '21:00' }] },
  { dia: 6, abierto: true, franjas: [{ desde: '09:00', hasta: '14:00' }] }, // Sábado
];

/** Marca para que el seed advierta si el horario sigue siendo el placeholder. */
export const HORARIO_ES_PLACEHOLDER = true;

import type { Appointment, Patient, Slot } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { medplum } from '../medplum';
import { RECURSOS } from '@bw/config/recursos';
import { HORARIO_SEMANAL } from '@bw/config/horario';
import { EXT } from '@bw/fhir/identifiers';

export interface TurnoTimeline {
  recursoCodigo: string;
  /** Minutos desde medianoche (hora local). */
  inicioMin: number;
  finMin: number;
  servicio: string;
  paciente: string;
  estado: string;
}

export interface SalaFila {
  codigo: string;
  nombre: string;
  comparteEquipo: boolean;
}

export interface TimelineData {
  abierto: boolean;
  aperturaMin: number;
  cierreMin: number;
  salas: SalaFila[];
  turnos: TurnoTimeline[];
  /** Hora actual en minutos (para la línea de "ahora"). */
  ahoraMin: number;
}

function hhmmAMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minDelDia(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function rango(fecha: Date): { desde: string; hasta: string } {
  const ini = new Date(fecha);
  ini.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return { desde: ini.toISOString(), hasta: fin.toISOString() };
}

/** Carga el timeline del día: salas (filas), horario (columnas) y turnos ocupados. */
export async function cargarTimeline(fecha: Date = new Date()): Promise<TimelineData> {
  const salas: SalaFila[] = RECURSOS.map((r) => ({
    codigo: r.codigo,
    nombre: r.nombre,
    comparteEquipo: Boolean(r.comparteCon?.length),
  }));

  const horarioDia = HORARIO_SEMANAL.find((h) => h.dia === fecha.getDay());
  if (!horarioDia?.abierto || horarioDia.franjas.length === 0) {
    return { abierto: false, aperturaMin: 0, cierreMin: 0, salas, turnos: [], ahoraMin: minDelDia(new Date()) };
  }
  const aperturaMin = Math.min(...horarioDia.franjas.map((f) => hhmmAMin(f.desde)));
  const cierreMin = Math.max(...horarioDia.franjas.map((f) => hhmmAMin(f.hasta)));

  const { desde, hasta } = rango(fecha);

  // Slots ocupados (tienen el código de recurso); Appointments (tienen servicio + paciente).
  const [slots, appts] = await Promise.all([
    safe(() => medplum.searchResources('Slot', { status: 'busy', start: `ge${desde}`, _count: 500 })),
    safe(() => medplum.searchResources('Appointment', { date: `ge${desde}`, _count: 500 })),
  ]);

  // Appointment por id de Slot.
  const apptPorSlot = new Map<string, Appointment>();
  for (const a of appts) {
    const ref = a.slot?.[0]?.reference;
    const id = ref?.split('/')[1];
    if (id) {
      apptPorSlot.set(id, a);
    }
  }

  // Nombres de pacientes (batch).
  const pacienteIds = [
    ...new Set(
      appts
        .map((a) => a.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'))?.actor?.reference)
        .filter((r): r is string => Boolean(r))
        .map((r) => r.split('/')[1] as string),
    ),
  ];
  const nombrePaciente = new Map<string, string>();
  if (pacienteIds.length > 0) {
    const pacientes = await safe(() =>
      medplum.searchResources('Patient', { _id: pacienteIds.join(','), _count: pacienteIds.length }),
    );
    for (const p of pacientes as Patient[]) {
      if (p.id) {
        nombrePaciente.set(p.id, getDisplayString(p));
      }
    }
  }

  const turnos: TurnoTimeline[] = [];
  for (const sl of slots as Slot[]) {
    const recursoCodigo = sl.extension?.find((e) => e.url === EXT.recursoFisico)?.valueString;
    if (!recursoCodigo || !sl.start || !sl.end || sl.start > hasta) {
      continue;
    }
    const appt = sl.id ? apptPorSlot.get(sl.id) : undefined;
    const pacienteRef = appt?.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'))?.actor?.reference;
    const pacienteId = pacienteRef?.split('/')[1];
    turnos.push({
      recursoCodigo,
      inicioMin: minDelDia(new Date(sl.start)),
      finMin: minDelDia(new Date(sl.end)),
      servicio: appt?.description ?? 'Ocupado',
      paciente: (pacienteId && nombrePaciente.get(pacienteId)) || '',
      estado: appt?.status ?? 'busy',
    });
  }

  return { abierto: true, aperturaMin, cierreMin, salas, turnos, ahoraMin: minDelDia(new Date()) };
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

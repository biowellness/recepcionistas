import type { Slot } from '@medplum/fhirtypes';
import { medplum } from '../medplum';
import { estadoRecurso, generarSlots, type ColorSala, type TurnoVentana } from '@bw/lib/slots';
import { RECURSOS } from '@bw/config/recursos';
import { HORARIO_SEMANAL } from '@bw/config/horario';
import { EXT } from '@bw/fhir/identifiers';

export interface SalaEstado {
  codigo: string;
  nombre: string;
  color: ColorSala;
  slotsLibres: number;
  slotsTotales: number;
  comparteEquipo: boolean;
}

function hoyRango(): { desde: string; hasta: string } {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);
  return { desde: inicio.toISOString(), hasta: fin.toISOString() };
}

function seSolapan(a: TurnoVentana, b: TurnoVentana): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

/**
 * Estado de cada sala para HOY. Las franjas se calculan localmente desde el
 * horario confirmado (no se materializan Slots "libres" en FHIR). Los turnos
 * ocupados se leen de Medplum (Slots con estado distinto de 'free').
 */
export async function cargarSalas(): Promise<SalaEstado[]> {
  const ahora = new Date();

  // Franjas de hoy por recurso, según el horario del centro.
  const slotsHoy = generarSlots(RECURSOS, HORARIO_SEMANAL, { desde: ahora, dias: 1 });
  const franjasPorRecurso = new Map<string, TurnoVentana[]>();
  for (const s of slotsHoy) {
    const arr = franjasPorRecurso.get(s.recursoCodigo) ?? [];
    arr.push({ inicio: new Date(s.inicio), fin: new Date(s.fin) });
    franjasPorRecurso.set(s.recursoCodigo, arr);
  }

  // Turnos ocupados de hoy (Slots no-libres), agrupados por código de recurso.
  const { desde, hasta } = hoyRango();
  const ocupadosPorRecurso = new Map<string, TurnoVentana[]>();
  try {
    const busy: Slot[] = await medplum.searchResources('Slot', {
      status: 'busy',
      start: `ge${desde}`,
      _count: 1000,
    });
    for (const sl of busy) {
      const code = sl.extension?.find((e) => e.url === EXT.recursoFisico)?.valueString;
      if (!code || !sl.start || !sl.end || sl.start > hasta) {
        continue;
      }
      const arr = ocupadosPorRecurso.get(code) ?? [];
      arr.push({ inicio: new Date(sl.start), fin: new Date(sl.end) });
      ocupadosPorRecurso.set(code, arr);
    }
  } catch {
    // Sin turnos cargados todavía: todas las salas quedan libres.
  }

  return RECURSOS.map((r) => {
    const franjas = franjasPorRecurso.get(r.codigo) ?? [];
    const ocupados = ocupadosPorRecurso.get(r.codigo) ?? [];
    const libres = franjas.filter((f) => !ocupados.some((o) => seSolapan(f, o))).length;
    return {
      codigo: r.codigo,
      nombre: r.nombre,
      color: estadoRecurso(ahora, ocupados),
      slotsLibres: libres,
      slotsTotales: franjas.length,
      comparteEquipo: Boolean(r.comparteCon?.length),
    };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

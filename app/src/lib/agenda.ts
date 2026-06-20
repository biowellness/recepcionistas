import type { Schedule, Slot } from '@medplum/fhirtypes';
import { medplum } from '../medplum';
import { estadoRecurso, type ColorSala, type TurnoVentana } from '@bw/lib/slots';
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

function leerExt(sch: Schedule, url: string): { valueString?: string; valueBoolean?: boolean } | undefined {
  return sch.extension?.find((e) => e.url === url);
}

/**
 * Carga las salas (Schedule) y calcula el semáforo del día de cada una a partir
 * de sus Slots ocupados. Si no hay agenda generada, la sala figura libre (verde).
 */
export async function cargarSalas(): Promise<SalaEstado[]> {
  const schedules = await medplum.searchResources('Schedule', { _count: 50 });
  const { desde, hasta } = hoyRango();
  const ahora = new Date();

  const salas: SalaEstado[] = [];
  for (const sch of schedules) {
    const codigo = leerExt(sch, EXT.recursoFisico)?.valueString ?? sch.id ?? '?';
    const nombre = sch.actor?.[0]?.display ?? codigo;
    const comparteEquipo = leerExt(sch, EXT.comparteTumbona)?.valueBoolean ?? false;

    let slotsTotales = 0;
    let slotsLibres = 0;
    let ocupados: TurnoVentana[] = [];

    if (sch.id) {
      const slots: Slot[] = await medplum.searchResources('Slot', {
        schedule: `Schedule/${sch.id}`,
        start: `ge${desde}`,
        _count: 300,
      });
      const delDia = slots.filter((s) => s.start && s.start <= hasta);
      slotsTotales = delDia.length;
      slotsLibres = delDia.filter((s) => s.status === 'free').length;
      ocupados = delDia
        .filter((s) => s.status && s.status !== 'free' && s.start && s.end)
        .map((s) => ({ inicio: new Date(s.start as string), fin: new Date(s.end as string) }));
    }

    salas.push({
      codigo,
      nombre,
      color: estadoRecurso(ahora, ocupados),
      slotsLibres,
      slotsTotales,
      comparteEquipo,
    });
  }

  return salas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

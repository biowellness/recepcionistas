/**
 * Recursos físicos agendables.
 *
 * PROVISIONAL: esta es la lista preliminar de 13 recursos del Documento de
 * Requerimientos v4 (§6.2). Andrés confirmará la lista definitiva del local;
 * al recibirla se actualiza este archivo y se regeneran Schedule/Slot.
 *
 * `comparteCon` modela cuellos de botella de agenda (R-07): dos recursos que
 * comparten una misma clave NO pueden solaparse en la misma franja. Los dos
 * gabinetes Recovery Pro comparten las 2 tumbonas Red Light, por eso van
 * desfasados.
 */
import type { RecursoFisico } from '../domain/types.js';

const TUMBONAS_RECOVERY = 'TUMBONAS_RECOVERY';

export const RECURSOS: RecursoFisico[] = [
  { codigo: 'R_HBOT_MONO', nombre: 'Cámara Hiperbárica Monoplaza', tipo: 'HBOT', capacidad: 1, provisional: true },
  { codigo: 'R_HBOT_BIPLAZA', nombre: 'Cámara Hiperbárica Biplaza', tipo: 'HBOT', capacidad: 2, provisional: true },
  { codigo: 'R_HBOT_MULTIPLAZA', nombre: 'Cámara Hiperbárica Multiplaza', tipo: 'HBOT', capacidad: 6, provisional: true },
  { codigo: 'R_IHHT_1', nombre: 'Puesto IHHT 1 (JAY-20H)', tipo: 'IHHT', capacidad: 1, provisional: true },
  { codigo: 'R_IHHT_2', nombre: 'Puesto IHHT 2 (JAY-20H)', tipo: 'IHHT', capacidad: 1, provisional: true },
  {
    codigo: 'R_RECOVERY_G1',
    nombre: 'Recovery Pro — Gabinete 1',
    tipo: 'RECOVERY_PRO',
    capacidad: 2,
    comparteCon: [TUMBONAS_RECOVERY],
    provisional: true,
    nota: 'Comparte las 2 tumbonas Red Light con Gabinete 2 (R-07: desfasaje obligatorio).',
  },
  {
    codigo: 'R_RECOVERY_G2',
    nombre: 'Recovery Pro — Gabinete 2',
    tipo: 'RECOVERY_PRO',
    capacidad: 2,
    comparteCon: [TUMBONAS_RECOVERY],
    provisional: true,
    nota: 'Comparte las 2 tumbonas Red Light con Gabinete 1 (R-07: desfasaje obligatorio).',
  },
  { codigo: 'R_RED_LIGHT', nombre: 'Tumbona Red Light (standalone)', tipo: 'RED_LIGHT', capacidad: 1, provisional: true },
  { codigo: 'R_IPC06', nombre: 'Botas Compression Recovery (IPC06)', tipo: 'COMPRESION', capacidad: 1, provisional: true },
  { codigo: 'R_COT03', nombre: 'Crio Therapy (COT03)', tipo: 'CRIO', capacidad: 1, provisional: true },
  { codigo: 'R_CAMILLA_MASAJES', nombre: 'Camilla de masajes', tipo: 'SALA', capacidad: 1, provisional: true },
  { codigo: 'R_CONSULTORIO', nombre: 'Consultorio médico', tipo: 'CONSULTORIO', capacidad: 1, provisional: true },
  { codigo: 'R_SALA_TB', nombre: 'Sala de Terapias Biológicas / IV', tipo: 'BOX_CLINICO', capacidad: 1, provisional: true },
];

export const RECURSOS_POR_CODIGO: ReadonlyMap<string, RecursoFisico> = new Map(
  RECURSOS.map((r) => [r.codigo, r]),
);

/**
 * Devuelve true si dos recursos comparten algún equipo (cuello de botella),
 * por lo que sus turnos no pueden solaparse (R-07).
 */
export function compartenEquipo(codigoA: string, codigoB: string): boolean {
  if (codigoA === codigoB) {
    return true;
  }
  const a = RECURSOS_POR_CODIGO.get(codigoA);
  const b = RECURSOS_POR_CODIGO.get(codigoB);
  if (!a?.comparteCon || !b?.comparteCon) {
    return false;
  }
  return a.comparteCon.some((k) => b.comparteCon!.includes(k));
}

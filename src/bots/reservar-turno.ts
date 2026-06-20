/**
 * Bot · Reservar turno.
 *
 * Valida un turno propuesto (R-02 contraindicaciones, R-03 prescripción, R-07
 * capacidad/desfasaje, R-13 ventana) y, si está OK, crea el Appointment + un Slot
 * ocupado (para que la agenda lo refleje). Toda la decisión vive acá; el front
 * solo manda la propuesta.
 *
 * Alcance de este slice: un servicio por turno (los combos con secuencia vienen
 * después). La prescripción de IV/TB se pasa explícita hasta modelar ServiceRequest.
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Appointment, AppointmentParticipant, Flag, Slot } from '@medplum/fhirtypes';
import type { Servicio } from '../domain/types.js';
import { getServicio } from '../config/catalogo.js';
import type { PerfilReserva } from '../config/reglas.js';
import { EXT, SYSTEM } from '../fhir/identifiers.js';
import {
  combinar,
  recomendarHbotPrevio,
  validarContraindicaciones,
  validarPrescripcion,
  validarRecursos,
  validarVentanaReserva,
  type ReservaRecurso,
  type ResultadoValidacion,
} from '../lib/reglas-turno.js';

export interface EntradaReserva {
  pacienteRef: string; // "Patient/123"
  servicioCodigo: string;
  recursoCodigo: string;
  /** Inicio del turno en ISO (con offset de Argentina). */
  inicio: string;
  ocupantes?: number;
  /** Perfil para la ventana de reserva (R-13). Si se omite, no se limita. */
  perfil?: PerfilReserva;
  /** IV/TB: prescripción activa (hasta modelar ServiceRequest). */
  prescripcionActiva?: boolean;
  /** Autorización médica que destraba una contraindicación absoluta (R-02). */
  autorizacionMedica?: boolean;
  /** Si es false, solo valida (no crea). Default true. */
  confirmar?: boolean;
}

export interface ResultadoReserva extends ResultadoValidacion {
  creado: boolean;
  appointmentId?: string;
  slotId?: string;
}

export interface ContextoReserva {
  servicio: Servicio;
  inicio: Date;
  fin: Date;
  recursoCodigo: string;
  contraindicacionesActivas: string[];
  prescripcionActiva: boolean;
  autorizacionMedica: boolean;
  /** Turnos ya ocupados (de hoy), de todos los recursos, para capacidad/desfasaje. */
  reservasExistentes: ReservaRecurso[];
  perfil?: PerfilReserva;
  ahora: Date;
}

/** Validación pura de una reserva (sin FHIR). Reúne las reglas aplicables. */
export function validarReserva(ctx: ContextoReserva): ResultadoValidacion {
  const partes: ResultadoValidacion[] = [];

  // No se puede reservar en el pasado.
  if (ctx.inicio.getTime() <= ctx.ahora.getTime()) {
    partes.push({
      ok: false,
      bloqueos: [{ regla: 'R-13', nivel: 'bloqueo', mensaje: 'El turno está en el pasado.' }],
      advertencias: [],
    });
  }

  partes.push(validarPrescripcion(ctx.servicio, ctx.prescripcionActiva));
  partes.push(recomendarHbotPrevio(ctx.servicio.categoria, false));
  partes.push(
    validarContraindicaciones([ctx.servicio.categoria], ctx.contraindicacionesActivas, {
      autorizacionMedica: ctx.autorizacionMedica,
    }),
  );

  const nueva: ReservaRecurso = { recursoCodigo: ctx.recursoCodigo, inicio: ctx.inicio, fin: ctx.fin };
  partes.push(validarRecursos([...ctx.reservasExistentes, nueva]));

  if (ctx.perfil) {
    partes.push(validarVentanaReserva(ctx.perfil, ctx.ahora, ctx.inicio));
  }

  return combinar(...partes);
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<EntradaReserva>,
): Promise<ResultadoReserva> {
  const e = event.input;
  const servicio = getServicio(e.servicioCodigo);
  const inicio = new Date(e.inicio);
  const fin = new Date(inicio.getTime() + servicio.duracionMin * 60_000);
  const ahora = new Date();

  // Contraindicaciones activas del paciente (Flags).
  const flags = await medplum.searchResources('Flag', `subject=${e.pacienteRef}&status=active`);
  const contraindicacionesActivas = flags.flatMap(extraerCodigos);

  // Turnos ocupados de hoy (todos los recursos) para capacidad/desfasaje.
  const reservasExistentes = await cargarReservasDelDia(medplum, inicio);

  const resultado = validarReserva({
    servicio,
    inicio,
    fin,
    recursoCodigo: e.recursoCodigo,
    contraindicacionesActivas,
    prescripcionActiva: e.prescripcionActiva ?? false,
    autorizacionMedica: e.autorizacionMedica ?? false,
    reservasExistentes,
    perfil: e.perfil,
    ahora,
  });

  if (!resultado.ok || e.confirmar === false) {
    return { ...resultado, creado: false };
  }

  // Crear Slot ocupado + Appointment.
  const schedule = await medplum.searchOne(
    'Schedule',
    `identifier=${SYSTEM.recursoCodigo}|SCH_${e.recursoCodigo}`,
  );
  if (!schedule?.id) {
    return {
      ok: false,
      bloqueos: [{ regla: 'R-07', nivel: 'bloqueo', mensaje: `El recurso ${e.recursoCodigo} no tiene agenda (Schedule).` }],
      advertencias: resultado.advertencias,
      creado: false,
    };
  }

  const slot: Slot = await medplum.createResource<Slot>({
    resourceType: 'Slot',
    status: 'busy',
    schedule: { reference: `Schedule/${schedule.id}` },
    start: inicio.toISOString(),
    end: fin.toISOString(),
    extension: [{ url: EXT.recursoFisico, valueString: e.recursoCodigo }],
  });

  const participant: AppointmentParticipant[] = [{ actor: { reference: e.pacienteRef }, status: 'accepted' }];
  // Consultas: sumar al médico como participante (un consultorio, varios médicos).
  if (servicio.practitionerCodigo) {
    const pract = await medplum.searchOne('Practitioner', `identifier=${SYSTEM.medico}|${servicio.practitionerCodigo}`);
    if (pract?.id) {
      participant.push({
        actor: { reference: `Practitioner/${pract.id}`, display: pract.name?.[0]?.text },
        status: 'accepted',
      });
    }
  }

  const appointment: Appointment = await medplum.createResource<Appointment>({
    resourceType: 'Appointment',
    status: 'booked',
    description: servicio.nombre,
    start: inicio.toISOString(),
    end: fin.toISOString(),
    slot: [{ reference: `Slot/${slot.id}` }],
    participant,
    extension: [{ url: EXT.ocupantes, valueInteger: e.ocupantes ?? 1 }],
  });

  return {
    ...resultado,
    creado: true,
    appointmentId: appointment.id,
    slotId: slot.id,
  };
}

function extraerCodigos(flag: Flag): string[] {
  return (flag.code?.coding ?? []).map((c) => c.code).filter((c): c is string => Boolean(c));
}

async function cargarReservasDelDia(medplum: MedplumClient, dia: Date): Promise<ReservaRecurso[]> {
  const inicioDia = new Date(dia);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(dia);
  finDia.setHours(23, 59, 59, 999);

  const ocupados = await medplum.searchResources('Slot', {
    status: 'busy',
    start: `ge${inicioDia.toISOString()}`,
    _count: 500,
  });

  const reservas: ReservaRecurso[] = [];
  for (const s of ocupados) {
    const codigo = s.extension?.find((x) => x.url === EXT.recursoFisico)?.valueString;
    if (!codigo || !s.start || !s.end || s.start > finDia.toISOString()) {
      continue;
    }
    reservas.push({ recursoCodigo: codigo, inicio: new Date(s.start), fin: new Date(s.end) });
  }
  return reservas;
}

/**
 * Bot · Recordatorios (cron).
 *
 * Pensado para correr cada hora (Bot con cronTimer). Hace dos cosas y registra
 * todo como Communication (WhatsApp + email):
 *
 *  1. Recordatorio de turno: avisa 24h y 1h antes de cada turno confirmado. Los
 *     combos (varios Appointment) cuentan como UNA visita → un solo aviso.
 *  2. Saldo en riesgo: avisa cuando quedan sesiones libres por perderse pronto
 *     (membresía al cerrar el mes; paquete al vencer).
 *
 * Idempotente: cada aviso lleva un `identifier` único; si ya existe la
 * Communication, no se reenvía aunque el cron corra muchas veces.
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Appointment, Coverage } from '@medplum/fhirtypes';
import { SYSTEM } from '../fhir/identifiers.js';
import { estadoDeCoverage } from '../fhir/coverage.js';
import { saldoPlan } from '../lib/planes.js';
import { hitosEnVentana, riesgoDeSaldo, type HitoTurno } from '../lib/recordatorios.js';
import { enviarEmail, enviarWhatsApp, yaNotificado } from './_shared.js';

export interface EntradaRecordatorios {
  /** Fecha de referencia ISO (default: ahora). Útil para pruebas/reprocesos. */
  ahora?: string;
  /** Días de anticipación para avisar saldo en riesgo. Default 7. */
  ventanaSaldoDias?: number;
}

export interface ResultadoRecordatorios {
  ok: boolean;
  turnos24h: number;
  turnos1h: number;
  saldos: number;
}

const tz = 'America/Argentina/Buenos_Aires';
const fmtHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
const fmtFecha = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: tz });

interface Visita {
  key: string;
  inicio: Date;
  pacienteRef?: string;
  apptId: string;
  descripcion: string;
}

/** Una visita por combo (identifier compartido) o por turno suelto; toma el inicio más temprano. */
export function agruparVisitas(appts: Appointment[]): Visita[] {
  const porKey = new Map<string, Visita>();
  for (const a of appts) {
    if (!a.start || !a.id) {
      continue;
    }
    const comboId = a.identifier?.find((i) => i.system === SYSTEM.comboCodigo)?.value;
    const key = comboId ?? a.id;
    const inicio = new Date(a.start);
    const previa = porKey.get(key);
    if (!previa || inicio < previa.inicio) {
      porKey.set(key, {
        key,
        inicio,
        apptId: a.id,
        pacienteRef: a.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'))?.actor?.reference,
        descripcion: a.description?.split(' · ')[0] ?? 'tu sesión',
      });
    }
  }
  return [...porKey.values()];
}

function mensajeTurno(hito: HitoTurno, desc: string, inicio: Date): string {
  const hora = fmtHora.format(inicio);
  return hito === '24h'
    ? `BioWellness: te recordamos tu turno de ${desc} mañana ${fmtFecha.format(inicio)} a las ${hora}. Si no podés, avisanos así liberamos el lugar. ¡Te esperamos! 💚`
    : `BioWellness: tu turno de ${desc} es en una hora, a las ${hora}. ¡Te esperamos! 💚`;
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<EntradaRecordatorios>,
): Promise<ResultadoRecordatorios> {
  const ahora = event.input?.ahora ? new Date(event.input.ahora) : new Date();
  const ventanaSaldoDias = event.input?.ventanaSaldoDias ?? 7;

  // ── 1. Recordatorios de turno (próximas 25h, confirmados) ──────────────────
  const limite = new Date(ahora.getTime() + 25 * 60 * 60_000);
  const appts = await medplum.searchResources(
    'Appointment',
    `status=booked&date=ge${ahora.toISOString()}&date=le${limite.toISOString()}&_count=500`,
  );

  let turnos24h = 0;
  let turnos1h = 0;
  for (const v of agruparVisitas(appts)) {
    const minutos = (v.inicio.getTime() - ahora.getTime()) / 60_000;
    for (const hito of hitosEnVentana(minutos)) {
      const dedup = `turno-${v.key}-${hito}`;
      if (await yaNotificado(medplum, dedup)) {
        continue;
      }
      const body = mensajeTurno(hito, v.descripcion, v.inicio);
      await enviarWhatsApp(medplum, event.secrets, {
        template: `recordatorio-turno-${hito}`,
        body,
        pacienteRef: v.pacienteRef,
        about: `Appointment/${v.apptId}`,
        identifier: { system: SYSTEM.recordatorio, value: dedup },
      });
      await enviarEmail(medplum, {
        template: `recordatorio-turno-${hito}`,
        asunto: 'Recordatorio de tu turno en BioWellness',
        cuerpo: body,
        pacienteRef: v.pacienteRef,
        about: `Appointment/${v.apptId}`,
      });
      if (hito === '24h') {
        turnos24h++;
      } else {
        turnos1h++;
      }
    }
  }

  // ── 2. Saldo en riesgo (sesiones libres por perderse) ──────────────────────
  const coberturas = await medplum.searchResources('Coverage', { status: 'active', _count: 500 });
  let saldos = 0;
  for (const c of coberturas as Coverage[]) {
    if (!c.id) {
      continue;
    }
    const estado = estadoDeCoverage(c);
    const saldo = saldoPlan(estado, ahora);
    const riesgo = riesgoDeSaldo({
      tipo: estado.tipo,
      libres: saldo.restantes,
      vencimiento: estado.vencimiento,
      ahora,
      ventanaDias: ventanaSaldoDias,
    });
    if (!riesgo.enRiesgo) {
      continue;
    }
    const dedup = `saldo-${c.id}-${riesgo.periodoDedup}`;
    if (await yaNotificado(medplum, dedup)) {
      continue;
    }

    const ses = saldo.restantes === 1 ? '1 sesión' : `${saldo.restantes} sesiones`;
    const cierre =
      estado.tipo === 'membresia'
        ? `el mes cierra en ${riesgo.diasRestantes} ${riesgo.diasRestantes === 1 ? 'día' : 'días'} y no se acumulan`
        : `tu paquete vence en ${riesgo.diasRestantes} ${riesgo.diasRestantes === 1 ? 'día' : 'días'}`;
    const body = `BioWellness: te quedan ${ses} sin agendar y ${cierre}. ¿Coordinamos para no perderlas? 💚`;
    const pacienteRef = c.beneficiary?.reference;

    await enviarWhatsApp(medplum, event.secrets, {
      template: 'saldo-en-riesgo',
      body,
      pacienteRef,
      about: `Coverage/${c.id}`,
      identifier: { system: SYSTEM.recordatorio, value: dedup },
    });
    await enviarEmail(medplum, {
      template: 'saldo-en-riesgo',
      asunto: 'Tenés sesiones por aprovechar en BioWellness',
      cuerpo: body,
      pacienteRef,
      about: `Coverage/${c.id}`,
    });
    saldos++;
  }

  return { ok: true, turnos24h, turnos1h, saldos };
}

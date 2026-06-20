/**
 * Helpers compartidos por los bots de agenda (acceden a FHIR; no son "lib pura").
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Communication, Flag } from '@medplum/fhirtypes';
import { CONFIG_TC_ID, EXT, SYSTEM } from '../fhir/identifiers.js';
import { resolverTC } from '../config/tipo-cambio.js';
import type { ReservaRecurso } from '../lib/reglas-turno.js';

/** TC vigente: del recurso Basic de configuración; si no hay, el default. */
export async function leerTcVigente(medplum: MedplumClient): Promise<number> {
  try {
    const basic = await medplum.searchOne('Basic', `identifier=${CONFIG_TC_ID}`);
    const ext = basic?.extension?.find((e) => e.url === EXT.tcAplicado);
    if (ext?.valueDecimal && ext.valueDecimal > 0) {
      return ext.valueDecimal;
    }
  } catch {
    // sin servidor / sin recurso
  }
  return resolverTC();
}

type Secrets = BotEvent['secrets'];

/**
 * Envía un WhatsApp por Twilio y registra la Communication. Resuelve el teléfono
 * desde el paciente si no se pasa `to`. Si faltan credenciales o teléfono, NO
 * envía pero igual deja la Communication (estado 'preparation'). Los secretos de
 * Twilio se leen de event.secrets (Project Secrets de Medplum).
 */
export async function enviarWhatsApp(
  medplum: MedplumClient,
  secrets: Secrets,
  params: { template: string; body: string; pacienteRef?: string; to?: string },
): Promise<Communication> {
  let to = params.to;
  if (!to && params.pacienteRef) {
    const id = params.pacienteRef.split('/')[1];
    if (id) {
      const p = await medplum.readResource('Patient', id).catch(() => undefined);
      to = p?.telecom?.find((t) => t.system === 'phone' || t.system === 'sms')?.value;
    }
  }

  const sid = secrets['TWILIO_ACCOUNT_SID']?.valueString;
  const token = secrets['TWILIO_AUTH_TOKEN']?.valueString;
  const from = secrets['TWILIO_WHATSAPP_FROM']?.valueString;

  let status: Communication['status'] = 'preparation';
  if (to && sid && token && from) {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
        To: `whatsapp:${to}`,
        Body: params.body,
      }),
    });
    status = resp.ok ? 'completed' : 'entered-in-error';
  }

  return medplum.createResource<Communication>({
    resourceType: 'Communication',
    status,
    sent: new Date().toISOString(),
    ...(params.pacienteRef
      ? { subject: { reference: params.pacienteRef }, recipient: [{ reference: params.pacienteRef }] }
      : {}),
    payload: [{ contentString: params.body }],
    extension: [
      { url: EXT.canal, valueCode: 'whatsapp' },
      { url: EXT.templateUsado, valueString: params.template },
    ],
  });
}

/** Códigos de contraindicación activos de un Flag. */
export function extraerCodigos(flag: Flag): string[] {
  return (flag.code?.coding ?? []).map((c) => c.code).filter((c): c is string => Boolean(c));
}

/** Id del Schedule de un recurso físico (por identifier SCH_<codigo>). */
export async function scheduleIdDeRecurso(medplum: MedplumClient, recursoCodigo: string): Promise<string | undefined> {
  const sch = await medplum.searchOne('Schedule', `identifier=${SYSTEM.recursoCodigo}|SCH_${recursoCodigo}`);
  return sch?.id;
}

/** Turnos ocupados del día (todos los recursos), para validar capacidad/desfasaje. */
export async function cargarReservasDelDia(medplum: MedplumClient, dia: Date): Promise<ReservaRecurso[]> {
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

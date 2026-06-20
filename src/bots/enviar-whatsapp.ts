/**
 * Bot · Enviar WhatsApp.
 *
 * Envía un mensaje por la WhatsApp Business API (Twilio) y registra la
 * comunicación como recurso Communication para trazabilidad en la ficha
 * (Documento de Requerimientos §6.6). Los templates deben estar aprobados por Meta.
 *
 * Si no hay credenciales de Twilio configuradas, NO envía: igual deja registrada
 * la Communication en estado "preparation" (útil en staging / sin integración).
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Communication } from '@medplum/fhirtypes';
import { EXT } from '../fhir/identifiers.js';

type CommunicationStatus = Communication['status'];

export interface EntradaWhatsApp {
  /** Destinatario en formato E.164, ej. "+5491122334455". */
  to: string;
  /** Nombre del template aprobado por Meta (recordatorio, confirmación, etc.). */
  template: string;
  /** Texto ya resuelto del mensaje. */
  body: string;
  /** Referencia FHIR del paciente, ej. "Patient/123". */
  pacienteRef?: string;
  /** Si es false, no persiste la Communication. Default true. */
  persistir?: boolean;
}

/** Lee un secreto del proyecto (event.secrets) con fallback a process.env (local). */
function secreto(event: BotEvent<EntradaWhatsApp>, nombre: string): string | undefined {
  return event.secrets[nombre]?.valueString ?? process.env[nombre];
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<EntradaWhatsApp>,
): Promise<Communication> {
  const { to, template, body, pacienteRef } = event.input;

  // En Medplum los secretos llegan por event.secrets, NO por process.env.
  const sid = secreto(event, 'TWILIO_ACCOUNT_SID');
  const token = secreto(event, 'TWILIO_AUTH_TOKEN');
  const from = secreto(event, 'TWILIO_WHATSAPP_FROM');

  let status: CommunicationStatus = 'preparation';

  if (sid && token && from) {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
        To: `whatsapp:${to}`,
        Body: body,
      }),
    });
    status = resp.ok ? 'completed' : 'entered-in-error';
  }

  const comm: Communication = {
    resourceType: 'Communication',
    status,
    sent: new Date().toISOString(),
    ...(pacienteRef
      ? { subject: { reference: pacienteRef }, recipient: [{ reference: pacienteRef }] }
      : {}),
    payload: [{ contentString: body }],
    extension: [
      { url: EXT.canal, valueCode: 'whatsapp' },
      { url: EXT.templateUsado, valueString: template },
    ],
  };

  if (event.input.persistir === false) {
    return comm;
  }
  return medplum.createResource(comm);
}

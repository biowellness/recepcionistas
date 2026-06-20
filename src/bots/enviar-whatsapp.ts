/**
 * Bot · Enviar WhatsApp.
 *
 * Envía un mensaje por la WhatsApp Business API (Twilio) y registra la
 * comunicación como recurso Communication (trazabilidad en la ficha,
 * Documento de Requerimientos §6.6). La lógica vive en `_shared.enviarWhatsApp`,
 * que también usan los bots de reserva y de seña.
 *
 * Los secretos de Twilio se leen de event.secrets (Project Secrets de Medplum):
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Communication } from '@medplum/fhirtypes';
import { enviarWhatsApp } from './_shared.js';

export interface EntradaWhatsApp {
  /** Destinatario en formato E.164 (si no se pasa, se toma del paciente). */
  to?: string;
  /** Nombre del template aprobado por Meta. */
  template: string;
  /** Texto ya resuelto del mensaje. */
  body: string;
  /** Referencia FHIR del paciente, ej. "Patient/123". */
  pacienteRef?: string;
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<EntradaWhatsApp>,
): Promise<Communication> {
  const { to, template, body, pacienteRef } = event.input;
  return enviarWhatsApp(medplum, event.secrets, { template, body, pacienteRef, to });
}

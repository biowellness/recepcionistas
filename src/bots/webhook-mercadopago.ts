/**
 * Bot · Webhook de MercadoPago.
 *
 * URL pública que MercadoPago llama al cambiar un pago. NO confía en el payload:
 * toma el id del pago y lo VERIFICA contra la API de MP (con el access token).
 * Si el pago está `approved`, confirma el turno (external_reference = appointmentId)
 * reutilizando `confirmarReserva` (idempotente; los reintentos de MP no duplican).
 *
 * Configurar en MercadoPago (Webhooks, evento "Pagos") la URL del $execute de este
 * bot. Requiere el secret MERCADOPAGO_ACCESS_TOKEN.
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import { confirmarReserva } from './_shared.js';

interface NotificacionMP {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
  id?: string | number;
}

export interface ResultadoWebhook {
  ok: boolean;
  confirmado?: boolean;
  status?: string;
  motivo?: string;
  appointmentId?: string;
}

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<ResultadoWebhook> {
  const body = (event.input ?? {}) as NotificacionMP;
  const tipo = body.type ?? body.topic;
  if (tipo && tipo !== 'payment') {
    return { ok: true, confirmado: false, motivo: `evento ignorado (${tipo})` };
  }
  const paymentId = body.data?.id ?? body.id;
  if (!paymentId) {
    return { ok: true, confirmado: false, motivo: 'sin id de pago' };
  }

  const token = event.secrets['MERCADOPAGO_ACCESS_TOKEN']?.valueString;
  if (!token) {
    return { ok: false, motivo: 'falta MERCADOPAGO_ACCESS_TOKEN' };
  }

  // Verificación autoritativa contra MP.
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    return { ok: false, motivo: `MP payments respondió ${resp.status}` };
  }
  const pago = (await resp.json()) as { status?: string; external_reference?: string };

  if (pago.status !== 'approved') {
    return { ok: true, confirmado: false, status: pago.status };
  }
  const appointmentId = pago.external_reference;
  if (!appointmentId) {
    return { ok: false, motivo: 'el pago no tiene external_reference (appointmentId)' };
  }

  const r = await confirmarReserva(medplum, event.secrets, {
    appointmentId,
    medioPago: 'mercadopago',
    mpPaymentId: String(paymentId),
  });
  return { ok: true, confirmado: true, appointmentId, status: 'approved', motivo: r.yaConfirmado ? 'ya confirmado' : 'confirmado' };
}

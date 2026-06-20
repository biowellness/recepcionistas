/**
 * Bot · Link de pago MercadoPago (seña).
 *
 * Crea una preferencia de checkout de MercadoPago por el monto de la seña (50%)
 * y devuelve el link para que el paciente pague. Requiere el secret
 * MERCADOPAGO_ACCESS_TOKEN en los Project Secrets; si no está, devuelve un aviso
 * claro (el flujo manual de seña sigue funcionando).
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import { calcularSenaARS, type ItemCobro } from '../lib/pricing.js';
import { EXT } from '../fhir/identifiers.js';
import { leerTcVigente } from './_shared.js';

export interface EntradaLinkMP {
  appointmentId: string;
  tc?: number;
}

export interface ResultadoLinkMP {
  ok: boolean;
  mensaje?: string;
  senaARS?: number;
  url?: string;
}

export async function handler(medplum: MedplumClient, event: BotEvent<EntradaLinkMP>): Promise<ResultadoLinkMP> {
  const appt = await medplum.readResource('Appointment', event.input.appointmentId);
  const itemTipo = appt.extension?.find((e) => e.url === EXT.itemTipo)?.valueCode;
  const itemCodigo = appt.extension?.find((e) => e.url === EXT.itemCodigo)?.valueString;
  if (!itemTipo || !itemCodigo) {
    return { ok: false, mensaje: 'El turno no tiene ítem asociado para calcular la seña.' };
  }

  const tc = event.input.tc ?? (await leerTcVigente(medplum));
  const { senaARS } = calcularSenaARS([{ tipo: itemTipo as ItemCobro['tipo'], codigo: itemCodigo }], { tc });

  const token = event.secrets['MERCADOPAGO_ACCESS_TOKEN']?.valueString;
  if (!token) {
    return {
      ok: false,
      senaARS,
      mensaje: 'MercadoPago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN en Project Secrets).',
    };
  }

  const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          title: `Seña 50% · ${appt.description ?? itemCodigo}`,
          quantity: 1,
          unit_price: senaARS,
          currency_id: 'ARS',
        },
      ],
      metadata: { appointmentId: event.input.appointmentId },
    }),
  });

  if (!resp.ok) {
    return { ok: false, senaARS, mensaje: `MercadoPago respondió ${resp.status}.` };
  }
  const pref = (await resp.json()) as { init_point?: string; sandbox_init_point?: string };
  return { ok: true, senaARS, url: pref.init_point ?? pref.sandbox_init_point };
}

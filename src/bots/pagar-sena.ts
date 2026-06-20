/**
 * Bot · Pagar seña (50%).
 *
 * Registra el pago de la seña (50% del total) de un turno tentativo, lo confirma
 * (pending -> booked), emite un Invoice de la seña y envía el WhatsApp de
 * confirmación. Para combos confirma todos los componentes del mismo combo.
 */
import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Appointment, Invoice } from '@medplum/fhirtypes';
import { calcularSenaARS, type ItemCobro } from '../lib/pricing.js';
import { EXT, SYSTEM } from '../fhir/identifiers.js';
import { enviarWhatsApp, leerTcVigente } from './_shared.js';

export interface EntradaSena {
  appointmentId: string;
  /** efectivo / transferencia / tarjeta / mercadopago */
  medioPago?: string;
  tc?: number;
}

export interface ResultadoSena {
  ok: boolean;
  mensaje?: string;
  totalARS?: number;
  senaARS?: number;
  invoiceId?: string;
  confirmados?: number;
}

function extValor(appt: Appointment, url: string): string | undefined {
  return appt.extension?.find((e) => e.url === url)?.valueString ?? appt.extension?.find((e) => e.url === url)?.valueCode;
}

export async function handler(medplum: MedplumClient, event: BotEvent<EntradaSena>): Promise<ResultadoSena> {
  const { appointmentId, medioPago } = event.input;
  const appt = await medplum.readResource('Appointment', appointmentId);

  const itemTipo = extValor(appt, EXT.itemTipo);
  const itemCodigo = extValor(appt, EXT.itemCodigo);
  if (!itemTipo || !itemCodigo) {
    return { ok: false, mensaje: 'El turno no tiene ítem asociado para calcular la seña.' };
  }

  const tc = event.input.tc ?? (await leerTcVigente(medplum));
  const { totalARS, senaARS } = calcularSenaARS([{ tipo: itemTipo as ItemCobro['tipo'], codigo: itemCodigo }], { tc });

  // Confirmar el/los turno(s): todos los componentes del combo si aplica.
  const comboId = appt.identifier?.find((i) => i.system === SYSTEM.comboCodigo)?.value;
  const turnos: Appointment[] = comboId
    ? await medplum.searchResources('Appointment', `identifier=${SYSTEM.comboCodigo}|${comboId}`)
    : [appt];

  let confirmados = 0;
  for (const t of turnos) {
    if (t.status === 'pending' || t.status === 'proposed') {
      await medplum.updateResource({ ...t, status: 'booked' });
      confirmados++;
    }
  }

  const pacienteRef = appt.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'))?.actor?.reference;

  const invoice = await medplum.createResource<Invoice>({
    resourceType: 'Invoice',
    status: 'balanced',
    date: new Date().toISOString(),
    ...(pacienteRef ? { subject: { reference: pacienteRef } } : {}),
    lineItem: [
      {
        chargeItemCodeableConcept: { text: `Seña 50% · ${appt.description ?? itemCodigo}` },
        priceComponent: [{ type: 'base', amount: { value: senaARS, currency: 'ARS' } }],
      },
    ],
    totalGross: { value: senaARS, currency: 'ARS' },
    extension: [
      { url: EXT.esSena, valueBoolean: true },
      { url: EXT.tcAplicado, valueDecimal: tc },
      ...(medioPago ? [{ url: EXT.medioPago, valueCode: medioPago }] : []),
    ],
  });

  await enviarWhatsApp(medplum, event.secrets, {
    template: 'turno-confirmado',
    pacienteRef,
    body: `BioWellness: ¡tu turno quedó confirmado! ${appt.description ?? ''}. Recibimos la seña de $${senaARS.toLocaleString('es-AR')}. ¡Te esperamos! 💚`,
  });

  return { ok: true, totalARS, senaARS, invoiceId: invoice.id, confirmados };
}

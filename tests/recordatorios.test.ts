import { describe, it, expect } from 'vitest';
import type { Appointment } from '@medplum/fhirtypes';
import { hitosEnVentana, riesgoDeSaldo } from '../src/lib/recordatorios.js';
import { agruparVisitas } from '../src/bots/recordatorios.js';
import { SYSTEM } from '../src/fhir/identifiers.js';

describe('hitosEnVentana', () => {
  it('Dispara 24h cuando falta entre 1h y 24h', () => {
    expect(hitosEnVentana(1440)).toEqual(['24h']); // exactamente 24h
    expect(hitosEnVentana(600)).toEqual(['24h']); // 10h
    expect(hitosEnVentana(61)).toEqual(['24h']); // 1h01
  });

  it('Dispara 1h cuando falta 1h o menos', () => {
    expect(hitosEnVentana(60)).toEqual(['1h']); // exactamente 1h
    expect(hitosEnVentana(15)).toEqual(['1h']);
  });

  it('No dispara nada si el turno ya pasó o falta más de 24h', () => {
    expect(hitosEnVentana(0)).toEqual([]);
    expect(hitosEnVentana(-30)).toEqual([]);
    expect(hitosEnVentana(1441)).toEqual([]); // 24h01 → todavía no
  });
});

describe('riesgoDeSaldo', () => {
  it('Membresía: en riesgo si quedan libres y el mes cierra dentro de la ventana', () => {
    // 2026-06-28: faltan 2 días para fin de mes (30).
    const r = riesgoDeSaldo({ tipo: 'membresia', libres: 3, ahora: new Date('2026-06-28T12:00:00-03:00'), ventanaDias: 7 });
    expect(r.enRiesgo).toBe(true);
    expect(r.periodoDedup).toBe('2026-06');
  });

  it('Membresía: no avisa a principio de mes ni sin saldo', () => {
    expect(riesgoDeSaldo({ tipo: 'membresia', libres: 3, ahora: new Date('2026-06-05T12:00:00-03:00'), ventanaDias: 7 }).enRiesgo).toBe(
      false,
    );
    expect(riesgoDeSaldo({ tipo: 'membresia', libres: 0, ahora: new Date('2026-06-28T12:00:00-03:00'), ventanaDias: 7 }).enRiesgo).toBe(
      false,
    );
  });

  it('Paquete: en riesgo si vence dentro de la ventana y hay saldo', () => {
    const r = riesgoDeSaldo({
      tipo: 'paquete',
      libres: 2,
      vencimiento: '2026-06-25',
      ahora: new Date('2026-06-21T12:00:00-03:00'),
      ventanaDias: 7,
    });
    expect(r.enRiesgo).toBe(true);
    expect(r.periodoDedup).toBe('2026-06-25');
  });

  it('Paquete: no avisa si ya venció o si vence lejos', () => {
    const ahora = new Date('2026-06-21T12:00:00-03:00');
    expect(riesgoDeSaldo({ tipo: 'paquete', libres: 2, vencimiento: '2026-06-10', ahora, ventanaDias: 7 }).enRiesgo).toBe(false);
    expect(riesgoDeSaldo({ tipo: 'paquete', libres: 2, vencimiento: '2026-08-01', ahora, ventanaDias: 7 }).enRiesgo).toBe(false);
  });
});

describe('agruparVisitas', () => {
  const appt = (id: string, start: string, comboId?: string, description?: string): Appointment => ({
    resourceType: 'Appointment',
    id,
    status: 'booked',
    start,
    description,
    participant: [{ actor: { reference: 'Patient/p1' }, status: 'accepted' }],
    ...(comboId ? { identifier: [{ system: SYSTEM.comboCodigo, value: comboId }] } : {}),
  });

  it('Agrupa los componentes de un combo en una sola visita (inicio más temprano)', () => {
    const visitas = agruparVisitas([
      appt('a2', '2026-06-22T10:30:00-03:00', 'combo-1', 'BIO RECOVERY · IHHT'),
      appt('a1', '2026-06-22T10:00:00-03:00', 'combo-1', 'BIO RECOVERY · HBOT'),
    ]);
    expect(visitas).toHaveLength(1);
    expect(visitas[0]?.inicio.toISOString()).toBe(new Date('2026-06-22T10:00:00-03:00').toISOString());
    expect(visitas[0]?.descripcion).toBe('BIO RECOVERY');
  });

  it('Turnos sueltos cuentan como visitas separadas', () => {
    const visitas = agruparVisitas([
      appt('a1', '2026-06-22T10:00:00-03:00', undefined, 'HBOT'),
      appt('a2', '2026-06-22T12:00:00-03:00', undefined, 'IHHT'),
    ]);
    expect(visitas).toHaveLength(2);
  });
});

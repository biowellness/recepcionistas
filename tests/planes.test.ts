import { describe, it, expect } from 'vitest';
import { saldoPlan, motivoNoDisponible, cicloMes, debeRenovarMembresia } from '../src/lib/planes.js';

const AHORA = new Date('2026-06-22T10:00:00-03:00');

describe('saldoPlan', () => {
  it('Membresía con saldo => disponible', () => {
    const s = saldoPlan({ tipo: 'membresia', total: 8, usadas: 3, activo: true }, AHORA);
    expect(s.restantes).toBe(5);
    expect(s.disponible).toBe(true);
  });

  it('Membresía agotada (8/8) => no disponible (R-10)', () => {
    const s = saldoPlan({ tipo: 'membresia', total: 8, usadas: 8, activo: true }, AHORA);
    expect(s.agotado).toBe(true);
    expect(s.disponible).toBe(false);
    expect(motivoNoDisponible(s, true)).toMatch(/R-10/);
  });

  it('Paquete vencido => no disponible', () => {
    const s = saldoPlan(
      { tipo: 'paquete', total: 10, usadas: 2, activo: true, vencimiento: '2026-06-01T00:00:00-03:00' },
      AHORA,
    );
    expect(s.vencido).toBe(true);
    expect(s.disponible).toBe(false);
    expect(motivoNoDisponible(s, true)).toMatch(/vencido/i);
  });

  it('Paquete vigente con saldo => disponible', () => {
    const s = saldoPlan(
      { tipo: 'paquete', total: 10, usadas: 2, activo: true, vencimiento: '2026-12-31T00:00:00-03:00' },
      AHORA,
    );
    expect(s.restantes).toBe(8);
    expect(s.disponible).toBe(true);
  });

  it('Plan inactivo => no disponible', () => {
    const s = saldoPlan({ tipo: 'membresia', total: 8, usadas: 0, activo: false }, AHORA);
    expect(s.disponible).toBe(false);
  });
});

describe('cicloMes / debeRenovarMembresia (R-11)', () => {
  it('cicloMes devuelve YYYY-MM en zona Argentina', () => {
    expect(cicloMes(new Date('2026-06-20T10:00:00-03:00'))).toBe('2026-06');
    // 23:30 ART del 31/12 sigue siendo diciembre (no salta de año por UTC).
    expect(cicloMes(new Date('2026-12-31T23:30:00-03:00'))).toBe('2026-12');
  });

  it('día 3 con ciclo previo => renueva', () => {
    expect(debeRenovarMembresia('2026-05', new Date('2026-06-03T09:00:00-03:00'))).toBe(true);
  });

  it('día 3 con ciclo actual ya facturado => no renueva (idempotente)', () => {
    expect(debeRenovarMembresia('2026-06', new Date('2026-06-03T09:00:00-03:00'))).toBe(false);
  });

  it('día 10 => fuera de ventana, no renueva', () => {
    expect(debeRenovarMembresia('2026-05', new Date('2026-06-10T09:00:00-03:00'))).toBe(false);
  });

  it('membresía nueva sin ciclo registrado en día 1 => renueva', () => {
    expect(debeRenovarMembresia(undefined, new Date('2026-06-01T09:00:00-03:00'))).toBe(true);
  });
});

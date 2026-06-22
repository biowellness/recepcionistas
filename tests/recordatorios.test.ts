import { describe, it, expect } from 'vitest';
import { recordatorioDue, VENTANA_MAX_MS } from '../src/lib/recordatorios.js';

const AHORA = new Date('2026-06-22T10:00:00-03:00');
const enHoras = (h: number): Date => new Date(AHORA.getTime() + h * 3_600_000);

describe('recordatorioDue (48h / 2h)', () => {
  it('falta 1 h => recordatorio de 2 h', () => {
    expect(recordatorioDue(enHoras(1), AHORA)).toBe('2h');
  });

  it('exactamente 2 h => recordatorio de 2 h', () => {
    expect(recordatorioDue(enHoras(2), AHORA)).toBe('2h');
  });

  it('falta 3 h => recordatorio de 48 h', () => {
    expect(recordatorioDue(enHoras(3), AHORA)).toBe('48h');
  });

  it('falta 30 h => recordatorio de 48 h', () => {
    expect(recordatorioDue(enHoras(30), AHORA)).toBe('48h');
  });

  it('exactamente 48 h => recordatorio de 48 h', () => {
    expect(recordatorioDue(enHoras(48), AHORA)).toBe('48h');
  });

  it('falta 49 h => todavía nada', () => {
    expect(recordatorioDue(enHoras(49), AHORA)).toBeUndefined();
  });

  it('turno en el pasado => nada', () => {
    expect(recordatorioDue(enHoras(-1), AHORA)).toBeUndefined();
  });

  it('VENTANA_MAX_MS es 48 h', () => {
    expect(VENTANA_MAX_MS).toBe(48 * 3_600_000);
  });
});

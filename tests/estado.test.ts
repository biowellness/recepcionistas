import { describe, it, expect } from 'vitest';
import { ESTADOS_QUE_LIBERAN } from '../src/bots/estado-turno.js';

describe('Estado del turno', () => {
  it('Completar y cancelar liberan la sala; llegar / en curso no', () => {
    expect(ESTADOS_QUE_LIBERAN.has('fulfilled')).toBe(true);
    expect(ESTADOS_QUE_LIBERAN.has('cancelled')).toBe(true);
    expect(ESTADOS_QUE_LIBERAN.has('arrived')).toBe(false);
    expect(ESTADOS_QUE_LIBERAN.has('checked-in')).toBe(false);
  });
});

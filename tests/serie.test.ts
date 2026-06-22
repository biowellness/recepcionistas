import { describe, it, expect } from 'vitest';
import { generarSerieFechas, diasSugeridos } from '../src/lib/serie-turnos.js';

// Centro abierto Lunes a Sábado (1..6), cerrado Domingo (0).
const abiertoLaSab = (dia: number): boolean => dia >= 1 && dia <= 6;

describe('generarSerieFechas', () => {
  it('Genera N fechas 2x/semana (Lun/Jue) saltando el resto', () => {
    // 2026-06-22 es lunes.
    const fechas = generarSerieFechas({
      desde: '2026-06-22',
      diasSemana: [1, 4], // Lunes y Jueves
      cantidad: 4,
      esDiaAbierto: abiertoLaSab,
      hoy: '2026-06-21',
    });
    expect(fechas).toEqual(['2026-06-22', '2026-06-25', '2026-06-29', '2026-07-02']);
  });

  it('Genera 3x/semana (Lun/Mié/Vie)', () => {
    const fechas = generarSerieFechas({
      desde: '2026-06-22',
      diasSemana: [1, 3, 5],
      cantidad: 3,
      esDiaAbierto: abiertoLaSab,
      hoy: '2026-06-21',
    });
    expect(fechas).toEqual(['2026-06-22', '2026-06-24', '2026-06-26']);
  });

  it('Descarta días cerrados (Domingo) aunque se elijan', () => {
    const fechas = generarSerieFechas({
      desde: '2026-06-21', // domingo
      diasSemana: [0, 1], // domingo (cerrado) + lunes
      cantidad: 2,
      esDiaAbierto: abiertoLaSab,
      hoy: '2026-06-20',
    });
    // Sólo cuentan los lunes (22 y 29).
    expect(fechas).toEqual(['2026-06-22', '2026-06-29']);
  });

  it('No incluye fechas iguales o anteriores a hoy', () => {
    const fechas = generarSerieFechas({
      desde: '2026-06-22',
      diasSemana: [1],
      cantidad: 2,
      esDiaAbierto: abiertoLaSab,
      hoy: '2026-06-22', // el lunes 22 ya no cuenta
    });
    expect(fechas).toEqual(['2026-06-29', '2026-07-06']);
  });

  it('Devuelve vacío si no hay días abiertos elegidos o cantidad 0', () => {
    expect(
      generarSerieFechas({ desde: '2026-06-22', diasSemana: [0], cantidad: 4, esDiaAbierto: abiertoLaSab }),
    ).toEqual([]);
    expect(
      generarSerieFechas({ desde: '2026-06-22', diasSemana: [1], cantidad: 0, esDiaAbierto: abiertoLaSab }),
    ).toEqual([]);
  });
});

describe('diasSugeridos', () => {
  it('2x → Lunes y Jueves; 3x → Lunes, Miércoles y Viernes', () => {
    expect(diasSugeridos(2, abiertoLaSab)).toEqual([1, 4]);
    expect(diasSugeridos(3, abiertoLaSab)).toEqual([1, 3, 5]);
  });

  it('Reemplaza días cerrados por otros hábiles hasta cubrir la frecuencia', () => {
    // Sólo abre Martes(2), Miércoles(3), Sábado(6).
    const abierto = (d: number): boolean => [2, 3, 6].includes(d);
    const dias = diasSugeridos(2, abierto);
    expect(dias).toHaveLength(2);
    expect(dias.every(abierto)).toBe(true);
  });
});

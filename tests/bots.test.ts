import { describe, it, expect } from 'vitest';
import type { BotEvent, MedplumClient } from '@medplum/core';
import { validarEntrada } from '../src/bots/validar-turno.js';
import { handler as cobroHandler, type EntradaCobro } from '../src/bots/calcular-cobro.js';

describe('Bot validar-turno (lógica pura)', () => {
  it('AC-02: BIO LONGEVITY (HBOT->IHHT->Recovery) sin contras => OK', () => {
    const r = validarEntrada({ secuenciaCategorias: ['HBOT', 'IHHT', 'RECOVERY_PRO'] });
    expect(r.ok).toBe(true);
  });

  it('IV NAD+ sin prescripción => bloqueo (R-03)', () => {
    const r = validarEntrada({ servicioCodigo: 'IV_NAD', prescripcionActiva: false });
    expect(r.ok).toBe(false);
    expect(r.bloqueos.some((b) => b.regla === 'R-03')).toBe(true);
  });

  it('Saldo de membresía agotado => bloqueo (R-10)', () => {
    const r = validarEntrada({ sesionesUsadas: 8, sesionesMes: 8 });
    expect(r.ok).toBe(false);
  });

  it('Combina varias reglas y acumula bloqueos', () => {
    const r = validarEntrada({
      secuenciaCategorias: ['IHHT', 'HBOT'], // R-01 viola orden
      sesionesUsadas: 8,
      sesionesMes: 8, // R-10
    });
    expect(r.ok).toBe(false);
    expect(r.bloqueos.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Bot calcular-cobro', () => {
  const medplumStub = {} as unknown as MedplumClient;

  it('Calcula Invoice en ARS con TC aplicado y splits (sin persistir)', async () => {
    const event = {
      input: {
        items: [{ tipo: 'servicio', codigo: 'HBOT_MONO' }],
        tc: 1450,
        persistir: false,
      } satisfies EntradaCobro,
    } as BotEvent<EntradaCobro>;

    const invoice = await cobroHandler(medplumStub, event);
    expect(invoice.resourceType).toBe('Invoice');
    expect(invoice.totalGross?.value).toBe(239250);
    expect(invoice.totalGross?.currency).toBe('ARS');
    const tcExt = invoice.extension?.find((e) => e.url.endsWith('tc-aplicado'));
    expect(tcExt?.valueDecimal).toBe(1450);
  });
});

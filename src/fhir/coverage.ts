/**
 * Lectura de planes desde recursos Coverage (membresías y paquetes).
 * Lo usan los bots y el front para calcular el saldo (`saldoPlan`).
 */
import type { Coverage } from '@medplum/fhirtypes';
import { EXT } from './identifiers.js';
import type { EstadoPlan, TipoCobertura } from '../lib/planes.js';

export function estadoDeCoverage(c: Coverage): EstadoPlan {
  const tipo = (c.extension?.find((e) => e.url === EXT.tipoCobertura)?.valueCode ?? 'membresia') as TipoCobertura;
  const totalUrl = tipo === 'membresia' ? EXT.sesionesMes : EXT.sesionesTotal;
  const total = c.extension?.find((e) => e.url === totalUrl)?.valueInteger ?? 0;
  const usadas = c.extension?.find((e) => e.url === EXT.sesionesUsadas)?.valueInteger ?? 0;
  return { tipo, total, usadas, vencimiento: c.period?.end, activo: c.status === 'active' };
}

export function planCodigoDeCoverage(c: Coverage): string | undefined {
  return c.extension?.find((e) => e.url === EXT.planCodigo)?.valueString;
}

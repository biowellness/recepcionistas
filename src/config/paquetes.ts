/**
 * Paquetes de sesiones — Manual de Protocolos (Sección 2).
 * Descuento por volumen: x5 = 5% · x10 = 10% · x20 = 15%.
 * Vigencias: 15 / 30 / 60 días. Founding Member: 20% adicional sobre el paquete.
 *
 * NOTA v9 (pendiente): el changelog v9 reemplazó la IHHT única (USD 90) por
 * Express (USD 60) y Premium (USD 120) pero NO recalculó los paquetes de IHHT.
 * Acá se generan paquetes de IHHT EXPRESS (base USD 60). Confirmar con negocio si
 * además se ofrecen paquetes de IHHT Premium. Ver docs/decisiones-pendientes.md.
 */
import type { Paquete } from '../domain/types.js';

interface BasePaquete {
  servicioBaseCodigo: string;
  etiqueta: string;
  /** Precio base por sesión para el paquete (USD). */
  precioBaseUSD: number;
}

const BASES: BasePaquete[] = [
  { servicioBaseCodigo: 'HBOT_MONO', etiqueta: 'HBOT_MONO', precioBaseUSD: 165 },
  { servicioBaseCodigo: 'HBOT_BIPLAZA', etiqueta: 'HBOT_BIPLAZA', precioBaseUSD: 200 }, // por pareja
  { servicioBaseCodigo: 'IHHT_EXPRESS', etiqueta: 'IHHT_EXPRESS', precioBaseUSD: 60 },
  { servicioBaseCodigo: 'RED_LIGHT', etiqueta: 'RED_LIGHT', precioBaseUSD: 50 },
  { servicioBaseCodigo: 'COMPRESION', etiqueta: 'BOTAS_COMP', precioBaseUSD: 60 },
  { servicioBaseCodigo: 'CRIO', etiqueta: 'BOTAS_CRYO', precioBaseUSD: 90 },
];

const TRAMOS: Array<{ tamano: number; descuento: number; vigenciaDias: number }> = [
  { tamano: 5, descuento: 0.05, vigenciaDias: 15 },
  { tamano: 10, descuento: 0.1, vigenciaDias: 30 },
  { tamano: 20, descuento: 0.15, vigenciaDias: 60 },
];

const FM_DESC = 0.2;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const PAQUETES: Paquete[] = BASES.flatMap((base) =>
  TRAMOS.map((t): Paquete => {
    const precioSesionUSD = round2(base.precioBaseUSD * (1 - t.descuento));
    const totalUSD = Math.round(precioSesionUSD * t.tamano);
    const totalFMUSD = Math.round(totalUSD * (1 - FM_DESC));
    return {
      codigo: `PAQ_${base.etiqueta}_X${t.tamano}`,
      servicioBaseCodigo: base.servicioBaseCodigo,
      tamano: t.tamano,
      vigenciaDias: t.vigenciaDias,
      descuento: t.descuento,
      precioSesionUSD,
      totalUSD,
      totalFMUSD,
    };
  }),
);

export const PAQUETES_POR_CODIGO: ReadonlyMap<string, Paquete> = new Map(
  PAQUETES.map((p) => [p.codigo, p]),
);

export function getPaquete(codigo: string): Paquete {
  const p = PAQUETES_POR_CODIGO.get(codigo);
  if (!p) {
    throw new Error(`Paquete desconocido: ${codigo}`);
  }
  return p;
}

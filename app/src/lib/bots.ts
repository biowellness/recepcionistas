import type { Invoice } from '@medplum/fhirtypes';
import { medplum } from '../medplum';

/**
 * Toda la inteligencia vive en los Bots: el front solo orquesta. Estas funciones
 * invocan los Bots de Medplum por nombre. Si el bot no está desplegado todavía,
 * lanzan un error claro (no se calcula nada en el front).
 */

export interface ItemCobroInput {
  tipo: 'servicio' | 'combo' | 'membresia' | 'paquete';
  codigo: string;
  ocupantes?: number;
  fm?: boolean;
  cantidad?: number;
}

async function botIdPorNombre(nombre: string): Promise<string> {
  const bot = await medplum.searchOne('Bot', `name=${nombre}`);
  if (!bot?.id) {
    throw new Error(
      `El bot "${nombre}" no está desplegado todavía. Desplegá los bots (npm run deploy:bots) para activar esta función.`,
    );
  }
  return bot.id;
}

/** Llama al bot de cobro y devuelve el Invoice calculado (total en ARS, splits, TC). */
export async function calcularCobro(items: ItemCobroInput[], pacienteRef?: string): Promise<Invoice> {
  const id = await botIdPorNombre('bw-calcular-cobro');
  return (await medplum.executeBot(id, { items, pacienteRef, persistir: false })) as Invoice;
}

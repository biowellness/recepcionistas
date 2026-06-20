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

/** Extrae un mensaje legible de un error de bot (que suele venir como JSON con stack). */
export function mensajeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  try {
    const o = JSON.parse(raw) as { errorMessage?: string };
    if (o && typeof o.errorMessage === 'string') {
      return o.errorMessage;
    }
  } catch {
    // no era JSON
  }
  return raw;
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

export interface ReservaInput {
  pacienteRef: string;
  servicioCodigo: string;
  recursoCodigo: string;
  /** Inicio del turno en ISO (con offset de Argentina). */
  inicio: string;
  ocupantes?: number;
  prescripcionActiva?: boolean;
  autorizacionMedica?: boolean;
  /** Si es false, solo valida (no crea). */
  confirmar?: boolean;
}

export interface IssueValidacion {
  regla: string;
  nivel: string;
  mensaje: string;
}

export interface ResultadoReserva {
  ok: boolean;
  bloqueos: IssueValidacion[];
  advertencias: IssueValidacion[];
  creado: boolean;
  appointmentId?: string;
  slotId?: string;
}

/** Llama al bot de reserva: valida y (si confirma) crea el turno + Slot ocupado. */
export async function reservarTurno(input: ReservaInput): Promise<ResultadoReserva> {
  const id = await botIdPorNombre('bw-reservar-turno');
  return (await medplum.executeBot(id, input)) as ResultadoReserva;
}

export interface ComboInput {
  pacienteRef: string;
  comboCodigo: string;
  inicio: string;
  autorizacionMedica?: boolean;
  confirmar?: boolean;
}

export interface ItemPlanDTO {
  servicio: string;
  recurso: string;
  desde: string;
  hasta: string;
}

export interface ResultadoCombo {
  ok: boolean;
  bloqueos: IssueValidacion[];
  advertencias: IssueValidacion[];
  creado: boolean;
  plan: ItemPlanDTO[];
  appointmentIds?: string[];
}

/** Llama al bot de combo: agenda los componentes en secuencia (HBOT primero). */
export async function reservarCombo(input: ComboInput): Promise<ResultadoCombo> {
  const id = await botIdPorNombre('bw-reservar-combo');
  return (await medplum.executeBot(id, input)) as ResultadoCombo;
}

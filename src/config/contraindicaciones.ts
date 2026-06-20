/**
 * Tabla de contraindicaciones — BORRADOR PARA VALIDACIÓN MÉDICA.
 *
 * ⚠️ IMPORTANTE: ni el Manual v8 ni el v9 incluyen una tabla de contraindicaciones.
 * Esta lista es un borrador con contraindicaciones clínicas ESTÁNDAR de HBOT e IHHT,
 * cargada para que el banner de seguridad (verde/rojo) tenga datos. DEBE ser revisada
 * y aprobada por el Director Médico (Dr. Dalessandro / Dra. Dos Santos) antes de uso real.
 *
 * Uso (R-02): una contraindicación `absoluta` activa bloquea la confirmación del turno
 * sin autorización médica explícita registrada. Una `relativa` genera advertencia.
 *
 * La recepción solo ve la señal binaria del banner (verde/rojo), nunca el detalle clínico.
 */
import type { Contraindicacion } from '../domain/types.js';

export const CONTRAINDICACIONES: Contraindicacion[] = [
  // ---- HBOT ----
  {
    codigo: 'HBOT_NEUMOTORAX_NO_TRATADO',
    aplicaA: ['HBOT'],
    descripcion: 'Neumotórax no tratado (contraindicación absoluta de HBOT).',
    severidad: 'absoluta',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'HBOT_MEDICACION_INCOMPATIBLE',
    aplicaA: ['HBOT'],
    descripcion: 'Tratamiento con bleomicina, cisplatino, doxorrubicina o disulfiram.',
    severidad: 'absoluta',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'HBOT_EPOC_RETENCION_CO2',
    aplicaA: ['HBOT'],
    descripcion: 'EPOC con retención de CO2 / enfisema severo.',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'HBOT_INFECCION_VIA_AEREA',
    aplicaA: ['HBOT'],
    descripcion: 'Infección de vías aéreas superiores o sinusitis activa (riesgo de barotrauma).',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'HBOT_CONVULSIONES',
    aplicaA: ['HBOT'],
    descripcion: 'Antecedente de convulsiones no controladas / epilepsia.',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'HBOT_FIEBRE_ALTA',
    aplicaA: ['HBOT'],
    descripcion: 'Fiebre alta (umbral convulsivo reducido).',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'HBOT_CLAUSTROFOBIA',
    aplicaA: ['HBOT'],
    descripcion: 'Claustrofobia severa.',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'HBOT_EMBARAZO',
    aplicaA: ['HBOT', 'IHHT'],
    descripcion: 'Embarazo (evaluación médica requerida).',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },

  // ---- IHHT ----
  {
    codigo: 'IHHT_SCA_RECIENTE',
    aplicaA: ['IHHT'],
    descripcion: 'Síndrome coronario agudo o infarto reciente / angina inestable.',
    severidad: 'absoluta',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'IHHT_INSUF_CARDIACA_DESCOMP',
    aplicaA: ['IHHT'],
    descripcion: 'Insuficiencia cardíaca descompensada.',
    severidad: 'absoluta',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'IHHT_HTP_SEVERA',
    aplicaA: ['IHHT'],
    descripcion: 'Hipertensión pulmonar severa.',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'IHHT_INFECCION_RESPIRATORIA',
    aplicaA: ['IHHT'],
    descripcion: 'Infección respiratoria aguda.',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
  {
    codigo: 'IHHT_HTA_NO_CONTROLADA',
    aplicaA: ['IHHT'],
    descripcion: 'Hipertensión arterial no controlada.',
    severidad: 'relativa',
    borradorPendienteRevision: true,
  },
];

export const CONTRAINDICACIONES_POR_CODIGO: ReadonlyMap<string, Contraindicacion> = new Map(
  CONTRAINDICACIONES.map((c) => [c.codigo, c]),
);

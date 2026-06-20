/**
 * Sistemas (URLs canónicas) e identificadores FHIR de BioWellness.
 *
 * Convención: kebab-case para los nombres de extensión, bajo el namespace
 * `https://biowellness.ar/fhir/...`. Centralizado acá para que el seed, los
 * bots y los tests usen exactamente los mismos strings.
 */

const BASE = 'https://biowellness.ar/fhir';

/** URLs base de StructureDefinition de extensiones custom. */
export const EXT = {
  // Patient
  tipoCliente: `${BASE}/StructureDefinition/tipo-cliente`,
  tagFm: `${BASE}/StructureDefinition/tag-fm`,
  tcBloqueoFm: `${BASE}/StructureDefinition/tc-bloqueo-fm`,
  perfilClinico: `${BASE}/StructureDefinition/perfil-clinico`,
  origenLead: `${BASE}/StructureDefinition/origen-lead`,
  // Practitioner
  splitPorcentaje: `${BASE}/StructureDefinition/split-porcentaje`,
  tipoContrato: `${BASE}/StructureDefinition/tipo-contrato`,
  // Schedule / Slot
  recursoFisico: `${BASE}/StructureDefinition/recurso-fisico`,
  comparteTumbona: `${BASE}/StructureDefinition/comparte-tumbona`,
  // Appointment
  ordenProtocolo: `${BASE}/StructureDefinition/orden-protocolo`,
  requiereHbotPrevio: `${BASE}/StructureDefinition/requiere-hbot-previo`,
  ocupantes: `${BASE}/StructureDefinition/ocupantes`,
  // ActivityDefinition (catálogo)
  precioUsd: `${BASE}/StructureDefinition/precio-usd`,
  precioArs: `${BASE}/StructureDefinition/precio-ars`,
  reglaPricingRecurso: `${BASE}/StructureDefinition/regla-pricing-recurso`,
  splitBw: `${BASE}/StructureDefinition/split-bw`,
  requierePrescripcion: `${BASE}/StructureDefinition/requiere-prescripcion`,
  // PlanDefinition (combos)
  secuenciaOrdenada: `${BASE}/StructureDefinition/secuencia-ordenada`,
  descuentoCombo: `${BASE}/StructureDefinition/descuento-combo`,
  // Coverage / Contract (membresía)
  tier: `${BASE}/StructureDefinition/tier`,
  version: `${BASE}/StructureDefinition/version`,
  sesionesMes: `${BASE}/StructureDefinition/sesiones-mes`,
  sesionesUsadas: `${BASE}/StructureDefinition/sesiones-usadas`,
  precioBloqueadoFm: `${BASE}/StructureDefinition/precio-bloqueado-fm`,
  // Invoice / ChargeItem
  montoSplitBw: `${BASE}/StructureDefinition/monto-split-bw`,
  montoSplitProfesional: `${BASE}/StructureDefinition/monto-split-profesional`,
  tcAplicado: `${BASE}/StructureDefinition/tc-aplicado`,
  // Communication
  canal: `${BASE}/StructureDefinition/canal`,
  templateUsado: `${BASE}/StructureDefinition/template-usado`,
} as const;

/** Sistemas de codificación / identificadores de negocio. */
export const SYSTEM = {
  servicioCodigo: `${BASE}/CodeSystem/servicio`,
  comboCodigo: `${BASE}/CodeSystem/combo`,
  membresiaCodigo: `${BASE}/CodeSystem/membresia`,
  paqueteCodigo: `${BASE}/CodeSystem/paquete`,
  recursoCodigo: `${BASE}/CodeSystem/recurso-fisico`,
  contraindicacion: `${BASE}/CodeSystem/contraindicacion`,
  medico: `${BASE}/CodeSystem/medico`,
  config: `${BASE}/Identifier/config`,
} as const;

/** Clave del recurso de configuración de Tipo de Cambio (Basic). */
export const CONFIG_TC_ID = 'config-tipo-cambio';

/** Moneda de lista del catálogo. */
export const MONEDA_LISTA = 'USD' as const;

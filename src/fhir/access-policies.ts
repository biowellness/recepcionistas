/**
 * AccessPolicies de Medplum (Documento de Requerimientos §3, mínimo privilegio).
 *
 * Pieza central: la recepcionista con acceso "Operativo". Privacidad por diseño:
 * sólo lista recursos operativos; los recursos clínicos (Observation, Condition,
 * DiagnosticReport, DocumentReference, CarePlan, MedicationRequest) NO se listan,
 * por lo que quedan denegados por defecto. La recepción ve el banner de seguridad
 * (Flag), nunca el detalle clínico.
 */
import type { AccessPolicy } from '@medplum/fhirtypes';
import { EXT } from './identifiers.js';

/** Recepcionista — acceso Operativo: agenda, check-in/out, pagos, comunicación, CRM. */
export const POLICY_RECEPCIONISTA: AccessPolicy = {
  resourceType: 'AccessPolicy',
  name: 'Recepción — Operativo',
  resource: [
    // Agenda
    { resourceType: 'Appointment' },
    { resourceType: 'Schedule', readonly: true },
    { resourceType: 'Slot' },
    // Check-in / check-out (datos operativos del Encounter, sin contenido clínico)
    { resourceType: 'Encounter' },
    // Pagos
    { resourceType: 'Invoice' },
    { resourceType: 'ChargeItem' },
    { resourceType: 'PaymentReconciliation' },
    { resourceType: 'Account' },
    // Membresía / sesiones del mes (sólo lectura)
    { resourceType: 'Coverage', readonly: true },
    { resourceType: 'Contract', readonly: true },
    // Comunicación (WhatsApp / email)
    { resourceType: 'Communication' },
    // CRM / leads
    { resourceType: 'Task' },
    // Banner de seguridad (señal binaria; sin detalle clínico)
    { resourceType: 'Flag', readonly: true },
    // Ficha del paciente: demografía y datos comerciales; se oculta lo clínico.
    {
      resourceType: 'Patient',
      hiddenFields: [`Patient.extension('${EXT.perfilClinico}')`],
    },
    // Catálogo y profesionales (sólo lectura, para mostrar precios y quién atiende)
    { resourceType: 'ActivityDefinition', readonly: true },
    { resourceType: 'PlanDefinition', readonly: true },
    { resourceType: 'Practitioner', readonly: true },
    { resourceType: 'Location', readonly: true },
    { resourceType: 'HealthcareService', readonly: true },
    // Bots: lectura para poder invocarlos (cobro, validación, WhatsApp).
    { resourceType: 'Bot', readonly: true },
  ],
};

/** Director Médico — acceso clínico completo. */
export const POLICY_DIRECTOR_MEDICO: AccessPolicy = {
  resourceType: 'AccessPolicy',
  name: 'Director Médico — Clínico completo',
  resource: [{ resourceType: '*' }],
};

/** Médico prescriptor — clínico completo + prescripción/autorización IV y TB. */
export const POLICY_MEDICO_PRESCRIPTOR: AccessPolicy = {
  resourceType: 'AccessPolicy',
  name: 'Médico Prescriptor — Clínico + prescripción',
  resource: [{ resourceType: '*' }],
};

/** Enfermera — clínico limitado: ve órdenes IV/TB del día y registra ejecución. */
export const POLICY_ENFERMERA: AccessPolicy = {
  resourceType: 'AccessPolicy',
  name: 'Enfermería — Clínico limitado',
  resource: [
    { resourceType: 'Appointment', readonly: true },
    { resourceType: 'Encounter' },
    { resourceType: 'ServiceRequest' },
    { resourceType: 'MedicationAdministration' },
    { resourceType: 'Observation' },
    { resourceType: 'Patient', readonly: true },
  ],
};

/** Terapeuta — sólo sus turnos y registrar la sesión. */
export const POLICY_TERAPEUTA: AccessPolicy = {
  resourceType: 'AccessPolicy',
  name: 'Terapeuta — Propio',
  resource: [
    { resourceType: 'Appointment', readonly: true },
    { resourceType: 'Encounter' },
    { resourceType: 'Patient', readonly: true },
  ],
};

export const ACCESS_POLICIES: AccessPolicy[] = [
  POLICY_RECEPCIONISTA,
  POLICY_DIRECTOR_MEDICO,
  POLICY_MEDICO_PRESCRIPTOR,
  POLICY_ENFERMERA,
  POLICY_TERAPEUTA,
];

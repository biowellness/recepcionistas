/**
 * Runner del seed del Bloque 0.
 *
 *   npm run seed -- --dry-run   → construye todos los recursos y muestra un resumen
 *                                  SIN conectarse a Medplum (sirve para CI/local).
 *   npm run seed                → conecta a Medplum (client credentials del .env) y
 *                                  hace upsert idempotente de todo el catálogo.
 *
 * Idempotente: cada recurso se busca por url/identifier; si existe, se actualiza.
 */
import 'dotenv/config';
import { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import { buildSeed } from './builders.js';
import { HORARIO_ES_PLACEHOLDER } from '../config/horario.js';
import { RECURSOS } from '../config/recursos.js';
import { CONTRAINDICACIONES } from '../config/contraindicaciones.js';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const seed = buildSeed();

  const grupos: Array<[string, Resource[]]> = [
    ['StructureDefinition (extensiones)', seed.structureDefinitions],
    ['AccessPolicy (roles)', seed.accessPolicies],
    ['Basic (config TC)', [seed.tcConfig]],
    ['ActivityDefinition (servicios)', seed.activityDefinitions],
    ['PlanDefinition (combos)', seed.combos],
    ['PlanDefinition (membresías)', seed.membresias],
    ['PlanDefinition (paquetes)', seed.paquetes],
    ['CodeSystem (contraindicaciones)', [seed.contraindicaciones]],
    ['Location (recursos)', seed.locations],
    ['Schedule (agendas)', seed.schedules],
  ];

  const total = grupos.reduce((acc, [, arr]) => acc + arr.length, 0);

  console.log('=== Seed BioWellness · Bloque 0 (Manual v9) ===');
  for (const [nombre, arr] of grupos) {
    console.log(`  • ${nombre}: ${arr.length}`);
  }
  console.log(`  TOTAL: ${total} recursos`);

  imprimirAdvertencias();

  if (dryRun) {
    console.log('\n[dry-run] No se conecta a Medplum. Recursos construidos OK.');
    return;
  }

  const baseUrl = requireEnv('MEDPLUM_BASE_URL');
  const clientId = requireEnv('MEDPLUM_CLIENT_ID');
  const clientSecret = requireEnv('MEDPLUM_CLIENT_SECRET');

  const medplum = new MedplumClient({ baseUrl, fetch });
  await medplum.startClientLogin(clientId, clientSecret);
  console.log(`\nConectado a Medplum: ${baseUrl}`);

  for (const [nombre, arr] of grupos) {
    for (const recurso of arr) {
      await upsert(medplum, recurso);
    }
    console.log(`  ✓ ${nombre} (${arr.length})`);
  }
  console.log('\nSeed completado.');
}

/** Upsert idempotente por url (recursos canónicos) o por identifier. */
async function upsert(medplum: MedplumClient, recurso: Resource): Promise<void> {
  const query = buildQuery(recurso);
  if (!query) {
    await medplum.createResource(recurso);
    return;
  }
  const existente = await medplum.searchOne(recurso.resourceType, query);
  if (existente?.id) {
    await medplum.updateResource({ ...recurso, id: existente.id });
  } else {
    await medplum.createResource(recurso);
  }
}

function buildQuery(recurso: Resource): string | undefined {
  const r = recurso as Resource & {
    url?: string;
    name?: string;
    identifier?: Array<{ system?: string; value?: string }>;
  };
  if (r.url) {
    return `url=${encodeURIComponent(r.url)}`;
  }
  const ident = r.identifier?.[0];
  if (ident?.value) {
    return `identifier=${ident.system ? `${ident.system}|` : ''}${ident.value}`;
  }
  if (recurso.resourceType === 'AccessPolicy' && r.name) {
    return `name=${encodeURIComponent(r.name)}`;
  }
  return undefined;
}

function imprimirAdvertencias(): void {
  const avisos: string[] = [];
  if (HORARIO_ES_PLACEHOLDER) {
    avisos.push(
      'Horario de atención es PLACEHOLDER (decisión bloqueante). No se generan Slot hasta confirmar el horario real.',
    );
  }
  if (RECURSOS.some((r) => r.provisional)) {
    avisos.push('La lista de recursos físicos es PROVISIONAL (lista preliminar de 13). Confirmar con Andrés.');
  }
  if (CONTRAINDICACIONES.some((c) => c.borradorPendienteRevision)) {
    avisos.push('Tabla de contraindicaciones es BORRADOR. Requiere validación del Director Médico.');
  }
  if (avisos.length) {
    console.log('\n⚠️  Pendientes (ver docs/decisiones-pendientes.md):');
    for (const a of avisos) {
      console.log(`   - ${a}`);
    }
  }
}

function requireEnv(nombre: string): string {
  const v = process.env[nombre];
  if (!v) {
    throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example).`);
  }
  return v;
}

main().catch((err) => {
  console.error('Seed falló:', err);
  process.exitCode = 1;
});

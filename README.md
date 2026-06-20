# Recepcionistas — BioWellness San Isidro

Herramienta de Recepción de BioWellness San Isidro. **Bloque 0 (Cimientos)**: la
base sobre la que se apoya la pantalla de la recepción. Backend **Medplum (FHIR R4)**.

> Principio rector: *"Las Recepcionistas nunca calculan ni deciden nada que el
> sistema pueda calcular o decidir por ellas."* Toda la inteligencia vive en el
> backend (catálogo, motor de precios, reglas de agenda y bots).

## Estado actual (Bloque 0)

| Pieza | Estado |
|---|---|
| Andamiaje TypeScript + tooling | ✅ |
| Catálogo v9 (servicios, combos, membresías, paquetes) | ✅ |
| Motor de precios (USD→ARS, splits, cascada TB) | ✅ con tests |
| Motor de reglas de agenda (R-01..R-14) | ✅ con tests |
| Extensiones FHIR + AccessPolicies (recepción) | ✅ |
| Bots: calcular-cobro · validar-turno · enviar-whatsapp | ✅ |
| Seed del catálogo (idempotente) | ✅ (`--dry-run` sin servidor) |
| Harness de tests (casos AC del Anexo A) | ✅ 53 tests |
| CI (GitHub Actions) | ✅ |
| Generación de Slots (agenda) | ⏳ bloqueado por horario + lista de salas |
| Contraindicaciones | ⚠️ borrador, pendiente validación médica |

Ver [`docs/decisiones-pendientes.md`](docs/decisiones-pendientes.md) para lo que falta definir.

## Requisitos

- Node.js ≥ 20 (probado en 22)
- Una cuenta de Medplum (arrancamos en **Medplum Cloud**; portable a self-hosted)

## Puesta en marcha

```bash
npm install
cp .env.example .env       # completar credenciales
npm run verify             # typecheck + tests
npm run seed -- --dry-run  # construye el catálogo sin conectarse a Medplum
npm run seed               # carga el catálogo en Medplum (requiere credenciales)
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run typecheck` | Chequeo de tipos (tsc) |
| `npm run test` | Tests (vitest) |
| `npm run verify` | typecheck + test (gate de CI) |
| `npm run seed` | Carga el catálogo en Medplum (idempotente) |
| `npm run seed -- --dry-run` | Construye todos los recursos sin servidor |
| `npm run deploy:bots` | Deploy de los Bots a Medplum (medplum CLI) |

## Estructura

```
src/
  domain/      Tipos de dominio (agnósticos de FHIR)
  config/      Datos del Manual v9 (catálogo, combos, membresías, paquetes,
               recursos, horario, contraindicaciones, TC, constantes de reglas)
  lib/         Lógica pura: money, pricing, reglas-turno (testeable sin servidor)
  fhir/        Identificadores, extensiones (StructureDefinition), AccessPolicies
  bots/        Medplum Bots: calcular-cobro, validar-turno, enviar-whatsapp
  seed/        Builders FHIR + runner del seed
tests/         Harness de tests (casos AC del Anexo A)
docs/          Documentación técnica (Bloque 0, reglas, modelo de datos, pendientes)
```

## Documentación

- [`docs/bloque-0.md`](docs/bloque-0.md) — alcance técnico y Definition of Done
- [`docs/reglas-negocio.md`](docs/reglas-negocio.md) — reglas R-01..R-18
- [`docs/modelo-datos-fhir.md`](docs/modelo-datos-fhir.md) — recursos y extensiones FHIR
- [`docs/decisiones-pendientes.md`](docs/decisiones-pendientes.md) — decisiones abiertas
- [`CLAUDE.md`](CLAUDE.md) — convenciones y guía para el desarrollo

---

Confidencial · Shanti OM SRL · 2026

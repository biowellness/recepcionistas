# Bots de Medplum

Los Bots concentran la inteligencia: el front solo orquesta. Son funciones
TypeScript que se bundlean a un único módulo CJS (`exports.handler`) y se
deployan al runtime **`awslambda`** de Medplum (configurable con la env
`BOT_RUNTIME_VERSION`).

## Los 3 bots del Bloque 0

| Bot | Qué hace | Cómo se invoca |
|---|---|---|
| `bw-calcular-cobro` | Calcula el cobro (USD→ARS al TC, splits) y emite `Invoice`. | `executeBot` desde el front (pantalla Atender). |
| `bw-validar-turno` | Valida un turno (orden HBOT, contraindicaciones, prescripción, capacidad/desfasaje, ventana, saldo). | `executeBot` al reservar/confirmar. |
| `bw-reservar-turno` | Valida y, si está OK, **crea** el turno (`Appointment` + `Slot` ocupado). | `executeBot` desde el front (Reservar turno). |
| `bw-reservar-combo` | Agenda un **combo** en secuencia (HBOT primero), auto-asignando sala por componente. | `executeBot` desde el front (Reservar combo). |
| `bw-estado-turno` | Check-in/out: cambia el estado del turno, gestiona el `Encounter` y libera la sala al completar/cancelar. | `executeBot` desde el front (clic en el turno). |
| `bw-enviar-whatsapp` | Envía WhatsApp (Twilio) y registra `Communication`. | `executeBot` por evento o manual. |

## Deploy

Requiere el `.env` de la raíz (mismas credenciales que el seed):
`MEDPLUM_BASE_URL`, `MEDPLUM_CLIENT_ID`, `MEDPLUM_CLIENT_SECRET`. La
`ClientApplication` debe ser **admin del proyecto** (para poder crear bots).

```bash
npm run bots:bundle   # opcional: bundlea y muestra tamaños, sin conectarse
npm run deploy:bots   # crea (si faltan) + bundlea + deploya + guarda ids
```

`deploy:bots` hace, por cada bot:
1. lo busca por `name`; si no existe, lo crea (`POST admin/projects/{id}/bot`, runtime `awslambda`);
2. bundlea el source con esbuild (CJS, sin dependencias externas);
3. lo deploya (`POST Bot/{id}/$deploy`);
4. guarda los ids en `medplum.config.json`.

Es idempotente: reejecutar redeploya el código sobre los bots existentes.

## Secretos (WhatsApp / Twilio)

En Medplum los bots leen secretos de `event.secrets`, **no** de `process.env`.
Para que `bw-enviar-whatsapp` envíe, cargá estos **Project Secrets** en el panel
de Medplum (Project → Secrets):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` (formato `whatsapp:+549...`)

Sin secretos, el bot no envía pero igual registra la `Communication` en estado
`preparation` (útil en pruebas).

## Permisos del bot

El bot se crea con su propia `ProjectMembership`. Para mínimo privilegio se le
puede asignar una `AccessPolicy` acotada (p. ej. solo `Invoice`/`Communication`/
lectura de catálogo). Pendiente de afinar.

## Invocación desde el front

El front llama a los bots **por nombre** (`Bot?name=bw-calcular-cobro` →
`executeBot`). Por eso los nombres de los bots no deben cambiarse sin actualizar
`app/src/lib/bots.ts`.

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
| `bw-pagar-sena` | Registra la seña (50%), confirma el turno (pending→booked) y envía WhatsApp de confirmación. | `executeBot` (clic en turno tentativo). |
| `bw-link-mercadopago` | Genera un link de MercadoPago por el monto de la seña (si está configurado el token). | `executeBot` (botón en turno tentativo). |
| `bw-webhook-mercadopago` | Webhook de MP: verifica el pago contra la API de MP y confirma el turno automáticamente al acreditarse. | URL pública que llama MercadoPago. |
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
`preparation` (útil en pruebas). El WhatsApp se dispara automático **al reservar**
(turno tentativo) y **al pagar la seña** (confirmado). El destinatario sale del
`Patient.telecom` (teléfono).

Para el link de MercadoPago (seña), además: `MERCADOPAGO_ACCESS_TOKEN`. Si no
está, el flujo manual de seña sigue funcionando y el bot de link avisa que MP no
está configurado.

## Permisos del bot

El bot se crea con su propia `ProjectMembership`. Para mínimo privilegio se le
puede asignar una `AccessPolicy` acotada (p. ej. solo `Invoice`/`Communication`/
lectura de catálogo). Pendiente de afinar.

## Webhook de MercadoPago (confirmación automática)

Cuando el paciente paga la seña por el link, MercadoPago avisa a un **webhook** y el
turno se confirma solo (pending → booked) + WhatsApp.

1. Crear el bot `bw-webhook-mercadopago` (UI) y `npm run deploy:bots`.
2. Cargar el secret `MERCADOPAGO_ACCESS_TOKEN` (el mismo del link).
3. En MercadoPago (Tus integraciones → tu app → **Webhooks**, evento **Pagos**),
   configurar la **URL** del `$execute` del bot:
   `https://api.medplum.com.ar/fhir/R4/Bot/<id-de-bw-webhook-mercadopago>/$execute`
   - Como MP no envía headers de auth, se usa una **ClientApplication dedicada** y
     se embeben las credenciales en la URL:
     `https://<clientId>:<clientSecret>@api.medplum.com.ar/fhir/R4/Bot/<id>/$execute`
   - (Esta parte la validamos juntos: confirmamos que MP acepte la URL con
     credenciales. El bot, además, **verifica el pago contra la API de MP**, así
     que no confía en el payload.)
4. (Opcional) Setear el secret `MP_WEBHOOK_URL` con esa URL: el link de pago la
   manda como `notification_url` por preferencia. Si no, alcanza con la config
   global del paso 3.

El bot toma el id del pago, hace `GET /v1/payments/{id}` con el token, y si está
`approved` confirma el turno por su `external_reference` (= appointmentId). Es
idempotente (los reintentos de MP no duplican la seña).

## Invocación desde el front

El front llama a los bots **por nombre** (`Bot?name=bw-calcular-cobro` →
`executeBot`). Por eso los nombres de los bots no deben cambiarse sin actualizar
`app/src/lib/bots.ts`.

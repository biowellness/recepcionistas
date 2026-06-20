# Decisiones pendientes

Definiciones que dependen de Andrés u otras fuentes. Las **bloqueantes** frenan
una parte del avance; el resto se resuelve en paralelo.

## Bloqueantes (agenda)

| # | Decisión | Por qué | Estado |
|---|---|---|---|
| 1 | **Horario de atención** (días y franjas) | Genera las franjas (`Slot`) de cada sala. Hoy hay un PLACEHOLDER en `src/config/horario.ts`. | ⏳ Andrés lo pasa |
| 2 | **Lista definitiva de salas y equipos** | Confirmar/corregir la lista preliminar de 13 (`src/config/recursos.ts`, todas marcadas `provisional`). | ⏳ Andrés lo pasa |

> Mientras tanto: el seed genera `Location` y `Schedule` provisionales y **no
> genera Slots** (el runner avisa). Al recibir 1 y 2 se actualizan los dos
> archivos y se habilita la generación de franjas.

## Catálogo (v9)

| Tema | Detalle | Estado |
|---|---|---|
| Ciclos/duración IHHT | v9 define IHHT Express (30 min, 3 ciclos) y Premium (60 min, 6-7 ciclos), a confirmar con el equipo médico. | A confirmar |
| Paquetes de IHHT | El changelog v9 no recalculó los paquetes de IHHT. Se generan paquetes de **IHHT Express** (base USD 60). ¿Se ofrecen también de IHHT Premium? | A confirmar |
| Descuento BIO OXYGEN | Pasó de ~21% a 20% por el recálculo v9. Validar que se mantiene en 20%. | A confirmar |
| FM en masajes/osteopatía | ¿El 20% FM aplica a masajes/osteopatía sueltos? Hoy `fmAplica = false` para ellos. | A confirmar |
| Insumos Regenerar (cascada TB) | La cascada de IV/TB (R-08) necesita el costo de insumo por terapia (lista Regenerar) para el neto real de BW. Hoy se pasa como parámetro. | A confirmar |

## Clínico

| Tema | Detalle | Estado |
|---|---|---|
| Tabla de contraindicaciones | Ni v8 ni v9 la incluyen. Se cargó un **borrador estándar HBOT/IHHT** (`src/config/contraindicaciones.ts`, todas `borradorPendienteRevision`). | ⚠️ Validar con Director Médico |
| Rol/alcance Dr. López Alonso | Pendiente de reunión. No frena la recepción. | A confirmar |

## Integraciones / cuentas (en paralelo)

| Cuenta | Para qué | Estado |
|---|---|---|
| WhatsApp Business (Twilio) | Confirmaciones y recordatorios (bot `enviar-whatsapp`). | A gestionar |
| SendGrid | Email transaccional. | A gestionar |
| MercadoPago | Cobro de membresías/sesiones (tokeniza tarjetas; no guardamos datos de tarjeta). | A gestionar |

## Infra

| Tema | Detalle | Estado |
|---|---|---|
| Medplum Cloud → self-hosted | Arrancamos en Cloud; migrar a self-hosted (Docker, datos en Argentina) cuando esté estable. Diseñado para no acoplarse a features propietarias. | Decidido (Cloud para arrancar) |

# Integración Recepción ↔ Portal del paciente

Contrato de integración entre **esta app (recepción)** y el **portal del paciente**
(`biowellness/portal`, basado en FooMedical, publicado en `bio.medplum.com.ar`).

Las dos apps comparten el **mismo servidor y proyecto Medplum**. La recepción es
para el staff (con su AccessPolicy operativa); el portal es para el paciente, que
ve **solo lo suyo** vía la AccessPolicy **"Paciente — Portal"**
(`src/fhir/access-policies.ts`).

> Estado: **pendiente de revisar el repo del portal.** Este documento es el
> checklist + contrato a verificar/ajustar cuando `biowellness/portal` esté en el
> scope de la sesión (hoy no es accesible desde recepción). Ver "Cómo dar acceso".

## Cómo se conectan (hoy)

- **Alta de paciente** (`bw-alta-paciente`): la recepción crea el `Patient`
  (dedupe por DNI/email/teléfono). No da login.
- **Invitación al portal** (`bw-invitar-paciente`, requiere admin): hace el
  *invite* de Medplum (`sendEmail:false`, `upsert:true` → reusa el `Patient`,
  no duplica) con la AccessPolicy "Paciente — Portal", y entrega el link mágico
  `/<portal>/setpassword/{id}/{secret}` por **WhatsApp / email / QR**.
- **Auto-registro** (portal, "Crear cuenta"): el paciente se crea solo. Medplum le
  asigna el **default patient access policy** del proyecto.

El link de invitación apunta al portal vía el secret **`PORTAL_BASE_URL`**
(default `https://bio.medplum.com.ar`).

## Checklist de revisión del repo del portal

1. **Mismo proyecto Medplum.** El portal debe registrar/loguear contra el mismo
   project que recepción (`7f068d7d-4633-46e9-9eff-d52bc03625b9`) en el mismo
   `MEDPLUM_BASE_URL` (`https://api.medplum.com.ar/`). Si fuera otro proyecto, los
   `Patient` no se comparten y la integración no funciona.
   → revisar config del `MedplumClient` / `projectId` / variables de entorno.

2. **Ruta `/setpassword/:id/:secret` — FALTA en el portal (verificado).**
   `app.medplum.com.ar/setpassword/...` funciona (es la app admin de Medplum), pero
   `bio.medplum.com.ar/setpassword/...` **no**: el portal no tiene esa ruta.
   `@medplum/react` **no** exporta un `SetPasswordPage`/`SetPasswordForm` listo, así
   que hay que agregar una página propia que haga `POST auth/setpassword`.

   **El link correcto es el portal** (branded, un solo dominio). Hay que sumar la
   ruta al portal (debe ser **pública**, accesible SIN login, junto a signin/register):

   ```tsx
   // SetPasswordPage.tsx (portal)
   import { PasswordInput, Button, Title, Stack, Alert } from '@mantine/core';
   import { normalizeErrorString } from '@medplum/core';
   import { Document, Form, Logo, useMedplum } from '@medplum/react';
   import { useState } from 'react';
   import { useParams, useNavigate } from 'react-router-dom';

   export function SetPasswordPage(): JSX.Element {
     const { id, secret } = useParams() as { id: string; secret: string };
     const medplum = useMedplum();
     const navigate = useNavigate();
     const [error, setError] = useState<string>();
     return (
       <Document width={450}>
         <Form onSubmit={async (formData) => {
           if (formData.password !== formData.confirm) { setError('No coinciden'); return; }
           try {
             await medplum.post('auth/setpassword', { id, secret, password: formData.password });
             navigate('/signin');
           } catch (err) { setError(normalizeErrorString(err)); }
         }}>
           <Stack><Logo size={32} /><Title>Elegí tu contraseña</Title>
             <PasswordInput name="password" label="Nueva contraseña" required />
             <PasswordInput name="confirm" label="Repetir contraseña" required />
             {error && <Alert color="red">{error}</Alert>}
             <Button type="submit">Guardar</Button>
           </Stack>
         </Form>
       </Document>
     );
   }
   ```
   ```tsx
   // en el router del portal (zona pública, sin guard de sesión):
   <Route path="/setpassword/:id/:secret" element={<SetPasswordPage />} />
   ```
   Referencia canónica: `medplum/packages/app/src/SetPasswordPage.tsx` (open source).

   **Stopgap** mientras no exista la ruta: setear el Project Secret
   `PORTAL_BASE_URL=https://app.medplum.com.ar` (el link funciona, pero el paciente
   queda en la app admin de Medplum tras fijar la clave). Volver a `bio` al agregar
   la ruta.

3. **Default patient access policy = "Paciente — Portal".** Para que el
   auto-registrado y el invitado queden con el **mismo** alcance, configurar en el
   proyecto Medplum el *default patient access policy* apuntando a la policy del
   seed. (Sin esto, el auto-registro podría quedar sin policy o con otra.)

4. **Recursos que lee/escribe el portal.** Hoy "Paciente — Portal" es de **lectura
   mínima** (Patient/Appointment/Invoice/Coverage/Communication propios). Si el
   portal permite que el paciente **reserve**, la policy queda corta: necesitaría
   leer `Schedule`/`Slot`/`ActivityDefinition`/`Practitioner` y **crear**
   `Appointment`. Recomendado: que el portal **reserve llamando a los bots**
   (`bw-reservar-turno`/`bw-reservar-combo`) y no a FHIR directo, para respetar las
   reglas (R-01 HBOT primero, R-07 capacidad/desfasaje, R-13 ventana, seña 50%).
   → revisar las páginas de agenda/booking del portal y ajustar la AccessPolicy en
   `src/fhir/access-policies.ts` en consecuencia.

5. **Branding/seguridad** ya consistente (theme BioWellness en `bio.medplum.com.ar`).
   Verificar `recaptchaSiteKey`/`googleClientId` si el registro los usa.

## Cómo dar acceso al repo del portal

Desde **Claude Code web → entorno de esta sesión → Repositories/Sources**, agregar
`biowellness/portal` a los repos permitidos y reabrir la sesión. Doc:
https://code.claude.com/docs/en/claude-code-on-the-web

Mientras no esté en el scope, recepción **no** puede leer ese repo (proxy de git y
GitHub MCP están acotados a `biowellness/recepcionistas`).

/**
 * Onboarding de pacientes al portal — lógica pura (sin FHIR ni red).
 *
 * El alta del paciente crea el recurso `Patient`. La invitación al portal le da
 * login: usa el invite de Medplum con `sendEmail:false` y entrega el link mágico
 * (`/setpassword/{id}/{secret}`) por el canal elegido (WhatsApp / mail / QR).
 */
export type CanalInvitacion = 'whatsapp' | 'email' | 'qr';

export const CANALES_INVITACION: readonly CanalInvitacion[] = ['whatsapp', 'email', 'qr'];

export function esCanalValido(c: string | undefined): c is CanalInvitacion {
  return c === 'whatsapp' || c === 'email' || c === 'qr';
}

/**
 * Email mínimamente válido (algo@algo.dominio). No pretende ser RFC-completo:
 * sólo evita altas de portal con un email obviamente roto.
 */
export function validarEmail(email: string | undefined): email is string {
  if (!email) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Link mágico de Medplum para que el paciente fije su contraseña. */
export function linkSetPassword(baseUrl: string, id: string, secret: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/setpassword/${id}/${secret}`;
}

/** Parte el nombre completo en nombre + apellido (apellido = última palabra). */
export function partirNombre(completo: string): { firstName: string; lastName: string } {
  const partes = completo.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) {
    return { firstName: partes[0] ?? '', lastName: '' };
  }
  return { firstName: partes.slice(0, -1).join(' '), lastName: partes[partes.length - 1]! };
}

export interface MensajeInvitacion {
  asunto: string;
  texto: string;
}

/** Cuerpo de la invitación al portal según el canal (mismo link en todos). */
export function mensajeInvitacion(nombre: string, link: string): MensajeInvitacion {
  const saludo = nombre ? `¡Hola ${nombre}!` : '¡Hola!';
  return {
    asunto: 'Tu acceso al portal de BioWellness',
    texto:
      `${saludo} Te damos la bienvenida a BioWellness 💚\n\n` +
      `Activá tu acceso al portal para ver tus turnos, tu plan y tus pagos. ` +
      `Entrá a este link y elegí tu contraseña:\n\n${link}\n\n` +
      `Si no solicitaste esto, podés ignorar este mensaje.`,
  };
}

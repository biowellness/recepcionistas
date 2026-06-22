import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BotEvent, MedplumClient } from '@medplum/core';
import { enviarWhatsApp, enviarEmail } from '../src/bots/_shared.js';

/** MedplumClient falso: captura las Communication creadas y espía sendEmail. */
function fakeMedplum(opts: { telefono?: string; email?: string } = {}) {
  const creadas: Record<string, unknown>[] = [];
  const sendEmail = vi.fn(async () => ({}) as unknown);
  const medplum = {
    readResource: async () => ({
      resourceType: 'Patient',
      telecom: [
        ...(opts.telefono ? [{ system: 'phone', value: opts.telefono }] : []),
        ...(opts.email ? [{ system: 'email', value: opts.email }] : []),
      ],
    }),
    createResource: async (r: Record<string, unknown>) => {
      creadas.push(r);
      return { ...r, id: `c${creadas.length}` };
    },
    sendEmail,
  } as unknown as MedplumClient;
  return { medplum, creadas, sendEmail };
}

const secretsTwilio = {
  TWILIO_ACCOUNT_SID: { name: 'TWILIO_ACCOUNT_SID', valueString: 'AC123' },
  TWILIO_AUTH_TOKEN: { name: 'TWILIO_AUTH_TOKEN', valueString: 'tok' },
  TWILIO_WHATSAPP_FROM: { name: 'TWILIO_WHATSAPP_FROM', valueString: 'whatsapp:+5491100000000' },
} as unknown as BotEvent['secrets'];

const sinSecretos = {} as unknown as BotEvent['secrets'];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('enviarWhatsApp · solo envía con secretos + teléfono', () => {
  it('Con secretos y teléfono: llama a Twilio y la Communication queda "completed"', async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const { medplum, creadas } = fakeMedplum({ telefono: '+5491150000000' });

    const comm = await enviarWhatsApp(medplum, secretsTwilio, {
      template: 'recordatorio-turno-24h',
      body: 'hola',
      pacienteRef: 'Patient/p1',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('api.twilio.com');
    expect(comm.status).toBe('completed');
    expect(creadas[0]?.resourceType).toBe('Communication');
  });

  it('Sin secretos: NO llama a Twilio pero igual registra la Communication ("preparation")', async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const { medplum } = fakeMedplum({ telefono: '+5491150000000' });

    const comm = await enviarWhatsApp(medplum, sinSecretos, { template: 't', body: 'hola', pacienteRef: 'Patient/p1' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(comm.status).toBe('preparation');
  });

  it('Con secretos pero sin teléfono del paciente: no envía (queda "preparation")', async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const { medplum } = fakeMedplum({}); // sin telecom

    const comm = await enviarWhatsApp(medplum, secretsTwilio, { template: 't', body: 'hola', pacienteRef: 'Patient/p1' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(comm.status).toBe('preparation');
  });

  it('Adjunta identifier (dedup) y about cuando se pasan', async () => {
    vi.stubGlobal('fetch', vi.fn(async (..._a: unknown[]) => ({ ok: true }) as Response));
    const { medplum, creadas } = fakeMedplum({ telefono: '+549115' });

    await enviarWhatsApp(medplum, secretsTwilio, {
      template: 't',
      body: 'hola',
      pacienteRef: 'Patient/p1',
      identifier: { system: 'sys', value: 'turno-x-24h' },
      about: 'Appointment/a1',
    });

    const comm = creadas[0] as { identifier?: { value: string }[]; about?: { reference: string }[] };
    expect(comm.identifier?.[0]?.value).toBe('turno-x-24h');
    expect(comm.about?.[0]?.reference).toBe('Appointment/a1');
  });
});

describe('enviarEmail · solo envía con email del paciente', () => {
  it('Con email: llama a sendEmail y queda "completed"', async () => {
    const { medplum, sendEmail } = fakeMedplum({ email: 'pac@example.com' });

    const comm = await enviarEmail(medplum, {
      template: 'recordatorio-turno-24h',
      asunto: 'Recordatorio',
      cuerpo: 'hola',
      pacienteRef: 'Patient/p1',
    });

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(comm.status).toBe('completed');
    expect(comm.extension?.find((e) => e.url.endsWith('/canal'))?.valueCode).toBe('email');
  });

  it('Sin email del paciente: no envía (queda "preparation")', async () => {
    const { medplum, sendEmail } = fakeMedplum({});

    const comm = await enviarEmail(medplum, { template: 't', asunto: 'a', cuerpo: 'hola', pacienteRef: 'Patient/p1' });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(comm.status).toBe('preparation');
  });

  it('Si SES falla: la Communication queda "entered-in-error" (no rompe el flujo)', async () => {
    const { medplum, sendEmail } = fakeMedplum({ email: 'pac@example.com' });
    (sendEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('SES down'));

    const comm = await enviarEmail(medplum, { template: 't', asunto: 'a', cuerpo: 'hola', pacienteRef: 'Patient/p1' });

    expect(comm.status).toBe('entered-in-error');
  });
});

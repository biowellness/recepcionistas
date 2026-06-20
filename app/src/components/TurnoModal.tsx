import { useState } from 'react';
import { Alert, Badge, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { cambiarEstadoTurno, mensajeError, type EstadoTurno } from '../lib/bots';
import { colorEstado, labelEstado } from '../lib/estados';
import type { TurnoTimeline } from '../lib/timeline';

const ACCIONES: Array<{ estado: EstadoTurno; label: string; color: string }> = [
  { estado: 'arrived', label: 'Llegó', color: 'orange' },
  { estado: 'checked-in', label: 'En curso', color: 'teal' },
  { estado: 'fulfilled', label: 'Completó', color: 'gray' },
  { estado: 'cancelled', label: 'Cancelar', color: 'red' },
];

function fmt(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function TurnoModal({
  turno,
  onClose,
  onCambiado,
}: {
  turno: TurnoTimeline | null;
  onClose: () => void;
  onCambiado: () => void;
}): JSX.Element {
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(estado: EstadoTurno): Promise<void> {
    if (!turno) {
      return;
    }
    setCargando(estado);
    setError(null);
    try {
      await cambiarEstadoTurno(turno.appointmentId, estado);
      onCambiado();
      onClose();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(null);
    }
  }

  return (
    <Modal opened={Boolean(turno)} onClose={onClose} title="Turno" centered>
      {turno && (
        <Stack gap="md">
          <div>
            <Text fw={700} size="lg">
              {turno.servicio}
            </Text>
            <Text>{turno.paciente || 'Paciente'}</Text>
            <Text c="dimmed" size="sm">
              {fmt(turno.inicioMin)}–{fmt(turno.finMin)}
            </Text>
          </div>

          <Group gap="xs">
            <Text size="sm">Estado:</Text>
            <Badge color={colorEstado(turno.estado)} variant="filled">
              {labelEstado(turno.estado)}
            </Badge>
          </Group>

          {error && (
            <Alert color="orange" variant="light">
              {error}
            </Alert>
          )}

          <Group>
            {ACCIONES.map((a) => (
              <Button
                key={a.estado}
                color={a.color}
                variant={a.estado === 'cancelled' ? 'light' : 'filled'}
                loading={cargando === a.estado}
                onClick={() => void cambiar(a.estado)}
              >
                {a.label}
              </Button>
            ))}
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

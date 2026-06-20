import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconRefresh, IconInfoCircle } from '@tabler/icons-react';
import { cargarTimeline, type TimelineData, type TurnoTimeline } from '../lib/timeline';
import { Timeline } from '../components/Timeline';
import { ReservaModal, type PresetReserva } from '../components/ReservaModal';
import { TurnoModal } from '../components/TurnoModal';
import { colorEstado, labelEstado } from '../lib/estados';

const REFRESCO_MS = 60_000;

export function AgendaDelDia(): JSX.Element {
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [preset, setPreset] = useState<PresetReserva | null>(null);
  const [turnoSel, setTurnoSel] = useState<TurnoTimeline | null>(null);

  const refrescar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setData(await cargarTimeline());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la agenda.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void refrescar();
    const id = setInterval(() => void refrescar(), REFRESCO_MS);
    return () => clearInterval(id);
  }, [refrescar]);

  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Title order={2}>Agenda del día</Title>
          <Text c="dimmed" tt="capitalize">
            {hoy}
          </Text>
        </Stack>
        <Group gap="sm">
          <Leyenda />
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void refrescar()} loading={cargando}>
            Actualizar
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" icon={<IconInfoCircle size={16} />} title="No se pudo cargar">
          {error}
        </Alert>
      )}

      {data === null && !error && (
        <Center mih={240}>
          <Loader />
        </Center>
      )}

      {data && (
        <Timeline
          data={data}
          onReservar={(recursoCodigo, horaMin) => setPreset({ recursoCodigo, horaMin })}
          onTurno={(t) => setTurnoSel(t)}
        />
      )}

      <ReservaModal preset={preset} onClose={() => setPreset(null)} onReservado={() => void refrescar()} />
      <TurnoModal turno={turnoSel} onClose={() => setTurnoSel(null)} onCambiado={() => void refrescar()} />
    </Stack>
  );
}

const ESTADOS_LEYENDA = ['pending', 'booked', 'arrived', 'checked-in', 'fulfilled'];

function Leyenda(): JSX.Element {
  return (
    <Group gap="md" visibleFrom="lg">
      {ESTADOS_LEYENDA.map((e) => (
        <Group gap={6} key={e}>
          <Box w={16} h={12} style={{ background: `var(--mantine-color-${colorEstado(e)}-6)`, borderRadius: 3 }} />
          <Text size="xs" c="dimmed">
            {labelEstado(e)}
          </Text>
        </Group>
      ))}
      <Group gap={6}>
        <Box w={2} h={14} style={{ background: 'var(--mantine-color-blue-6)' }} />
        <Text size="xs" c="dimmed">
          Ahora
        </Text>
      </Group>
    </Group>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconRefresh, IconInfoCircle } from '@tabler/icons-react';
import { cargarTimeline, type TimelineData } from '../lib/timeline';
import { Timeline } from '../components/Timeline';

const REFRESCO_MS = 60_000;

export function AgendaDelDia(): JSX.Element {
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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

      {data && <Timeline data={data} />}
    </Stack>
  );
}

function Leyenda(): JSX.Element {
  return (
    <Group gap="md" visibleFrom="md">
      <Group gap={6}>
        <Box w={16} h={12} style={{ background: 'var(--mantine-color-red-6)', borderRadius: 3 }} />
        <Text size="xs" c="dimmed">
          Turno
        </Text>
      </Group>
      <Group gap={6}>
        <Box w={2} h={14} style={{ background: 'var(--mantine-color-blue-6)' }} />
        <Text size="xs" c="dimmed">
          Ahora
        </Text>
      </Group>
    </Group>
  );
}

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconRefresh, IconInfoCircle, IconArrowsLeftRight } from '@tabler/icons-react';
import { cargarSalas, type SalaEstado } from '../lib/agenda';
import { SemaforoBadge } from '../components/SemaforoBadge';

const REFRESCO_MS = 60_000;

export function AgendaDelDia(): JSX.Element {
  const [salas, setSalas] = useState<SalaEstado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const refrescar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setSalas(await cargarSalas());
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

  const hoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void refrescar()}
            loading={cargando}
          >
            Actualizar
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" icon={<IconInfoCircle size={16} />} title="No se pudo cargar">
          {error}
        </Alert>
      )}

      {salas === null && !error && (
        <Center mih={240}>
          <Loader />
        </Center>
      )}

      {salas && salas.length === 0 && (
        <Alert color="yellow" icon={<IconInfoCircle size={16} />} title="Sin salas">
          No hay salas cargadas en Medplum. Corré el seed (<code>npm run seed</code>) para crearlas.
        </Alert>
      )}

      {salas && salas.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {salas.map((sala) => (
            <SalaCard key={sala.codigo} sala={sala} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

function SalaCard({ sala }: { sala: SalaEstado }): JSX.Element {
  const sinAgenda = sala.slotsTotales === 0;
  const tieneTurnos = sala.turnos.length > 0;
  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      padding="lg"
      style={tieneTurnos ? { borderColor: 'var(--mantine-color-red-4)', borderWidth: 2 } : undefined}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text fw={600} size="lg" lineClamp={2}>
          {sala.nombre}
        </Text>
        <SemaforoBadge estado={sala.color} />
      </Group>

      <Group gap="xs" mt="md">
        {sinAgenda ? (
          <Badge color="gray" variant="light">
            Sin agenda generada
          </Badge>
        ) : (
          <Badge color={tieneTurnos ? 'orange' : 'teal'} variant="light">
            {sala.slotsLibres} libres / {sala.slotsTotales} franjas
          </Badge>
        )}
        {tieneTurnos && (
          <Badge color="red" variant="filled">
            {sala.turnos.length} {sala.turnos.length === 1 ? 'turno' : 'turnos'} hoy
          </Badge>
        )}
        {sala.comparteEquipo && (
          <Badge color="grape" variant="light" leftSection={<IconArrowsLeftRight size={12} />}>
            Comparte equipo
          </Badge>
        )}
      </Group>

      {tieneTurnos && (
        <Group gap={6} mt="sm">
          {sala.turnos.map((t, i) => (
            <Badge key={i} color="red" variant="light" radius="sm">
              {t.desde}–{t.hasta}
            </Badge>
          ))}
        </Group>
      )}
    </Card>
  );
}

function Leyenda(): JSX.Element {
  return (
    <Group gap="xs" visibleFrom="md">
      <SemaforoBadge estado="verde" size="sm" />
      <SemaforoBadge estado="amarillo" size="sm" />
      <SemaforoBadge estado="rojo" size="sm" />
    </Group>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  List,
  Loader,
  NumberFormatter,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconSearch,
  IconShieldCheck,
  IconShieldX,
  IconCash,
  IconCalendarPlus,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { Patient, Invoice } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { medplum } from '../medplum';
import {
  calcularCobro,
  reservarTurno,
  reservarCombo,
  mensajeError,
  type ResultadoReserva,
  type ResultadoCombo,
} from '../lib/bots';
import { SERVICIOS } from '@bw/config/catalogo';
import { COMBOS } from '@bw/config/combos';
import { recursosParaCategoria } from '@bw/config/recursos';
import { generarSlots } from '@bw/lib/slots';
import { HORARIO_SEMANAL } from '@bw/config/horario';

export function Atender(): JSX.Element {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Patient[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Patient | null>(null);

  async function buscar(): Promise<void> {
    if (!query.trim()) {
      return;
    }
    setBuscando(true);
    setSeleccionado(null);
    try {
      const esDni = /^\d+$/.test(query.trim());
      const params = esDni ? { identifier: query.trim() } : { name: query.trim() };
      setResultados(await medplum.searchResources('Patient', { ...params, _count: 10 }));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Atender paciente</Title>

      <Group align="flex-end">
        <TextInput
          label="Buscar por nombre o DNI"
          placeholder="Ej.: Pérez o 30123456"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && void buscar()}
          w={360}
          size="md"
        />
        <Button leftSection={<IconSearch size={16} />} onClick={() => void buscar()} loading={buscando}>
          Buscar
        </Button>
      </Group>

      {!seleccionado && resultados && resultados.length === 0 && (
        <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
          No se encontraron pacientes. (En el entorno de prueba puede que aún no haya pacientes cargados.)
        </Alert>
      )}

      {!seleccionado &&
        resultados &&
        resultados.length > 0 &&
        resultados.map((p) => (
          <Card key={p.id} withBorder padding="md" radius="md" onClick={() => setSeleccionado(p)} style={{ cursor: 'pointer' }}>
            <Group justify="space-between">
              <Text fw={600}>{getDisplayString(p)}</Text>
              <Badge variant="light">{p.birthDate ?? 'sin fecha'}</Badge>
            </Group>
          </Card>
        ))}

      {seleccionado && <FichaPaciente paciente={seleccionado} onVolver={() => setSeleccionado(null)} />}
    </Stack>
  );
}

function FichaPaciente({ paciente, onVolver }: { paciente: Patient; onVolver: () => void }): JSX.Element {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>{getDisplayString(paciente)}</Title>
        <Button variant="subtle" onClick={onVolver}>
          ← Volver a la búsqueda
        </Button>
      </Group>
      <BannerSeguridad pacienteId={paciente.id!} />
      <PanelReserva paciente={paciente} />
      <PanelCobro paciente={paciente} />
    </Stack>
  );
}

/** Banner de seguridad: señal binaria verde/rojo. La recepción NO ve el detalle clínico. */
function BannerSeguridad({ pacienteId }: { pacienteId: string }): JSX.Element {
  const [estado, setEstado] = useState<'cargando' | 'verde' | 'rojo'>('cargando');

  useEffect(() => {
    let activo = true;
    medplum
      .searchResources('Flag', { subject: `Patient/${pacienteId}`, status: 'active', _count: 1 })
      .then((flags) => activo && setEstado(flags.length > 0 ? 'rojo' : 'verde'))
      .catch(() => activo && setEstado('verde'));
    return () => {
      activo = false;
    };
  }, [pacienteId]);

  if (estado === 'cargando') {
    return <Loader size="sm" />;
  }
  if (estado === 'rojo') {
    return (
      <Alert color="red" icon={<IconShieldX size={20} />} title="Atención: contraindicación activa" variant="filled">
        Consultar con el equipo médico antes de continuar.
      </Alert>
    );
  }
  return (
    <Alert color="teal" icon={<IconShieldCheck size={20} />} title="Sin contraindicaciones" variant="filled">
      Paciente apto para atención.
    </Alert>
  );
}

/** Reserva de turno o combo: el front arma la propuesta y el bot valida + crea. */
function PanelReserva({ paciente }: { paciente: Patient }): JSX.Element {
  const hoy = new Date().toISOString().slice(0, 10);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [recursoCodigo, setRecursoCodigo] = useState<string | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState<string | null>(null);
  const [prescripcion, setPrescripcion] = useState(false);
  const [resultado, setResultado] = useState<ResultadoReserva | null>(null);
  const [resultadoCombo, setResultadoCombo] = useState<ResultadoCombo | null>(null);
  const [reservando, setReservando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esCombo = seleccion ? COMBOS.some((c) => c.codigo === seleccion) : false;
  const servicio = !esCombo && seleccion ? SERVICIOS.find((s) => s.codigo === seleccion) : undefined;
  const salas = servicio ? recursosParaCategoria(servicio.categoria) : [];

  const opciones = [
    { group: 'Combos (secuencia automática)', items: COMBOS.map((c) => ({ value: c.codigo, label: c.nombre })) },
    { group: 'Servicios', items: SERVICIOS.map((s) => ({ value: s.codigo, label: s.nombre })) },
  ];

  const horas = useMemo(() => {
    const desde = new Date(`${fecha}T00:00:00-03:00`);
    const dummy = [{ codigo: '_', nombre: '_', tipo: 'SALA' as const, capacidad: 1 }];
    return generarSlots(dummy, HORARIO_SEMANAL, { desde, dias: 1 }).map((s) => s.inicio.slice(11, 16));
  }, [fecha]);

  function limpiar(): void {
    setResultado(null);
    setResultadoCombo(null);
    setError(null);
  }

  async function reservar(): Promise<void> {
    if (!seleccion || !hora || (!esCombo && !recursoCodigo)) {
      return;
    }
    setReservando(true);
    limpiar();
    const inicio = `${fecha}T${hora}:00-03:00`;
    const pacienteRef = `Patient/${paciente.id}`;
    try {
      if (esCombo) {
        setResultadoCombo(await reservarCombo({ pacienteRef, comboCodigo: seleccion, inicio, confirmar: true }));
      } else {
        setResultado(
          await reservarTurno({
            pacienteRef,
            servicioCodigo: seleccion,
            recursoCodigo: recursoCodigo as string,
            inicio,
            prescripcionActiva: prescripcion,
            confirmar: true,
          }),
        );
      }
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setReservando(false);
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Group gap="xs" mb="sm">
        <IconCalendarPlus size={18} />
        <Text fw={600}>Reservar turno</Text>
      </Group>

      <Stack gap="sm">
        <Group grow align="flex-end">
          <Select
            label="Servicio o combo"
            placeholder="Elegí qué reservar"
            data={opciones}
            value={seleccion}
            onChange={(v) => {
              setSeleccion(v);
              setRecursoCodigo(null);
              limpiar();
            }}
            searchable
          />
          {!esCombo && (
            <Select
              label="Sala / equipo"
              placeholder={servicio ? 'Elegí la sala' : 'Primero el servicio'}
              data={salas.map((r) => ({ value: r.codigo, label: r.nombre }))}
              value={recursoCodigo}
              onChange={setRecursoCodigo}
              disabled={!servicio}
              searchable
            />
          )}
        </Group>

        <Group grow align="flex-end">
          <TextInput
            type="date"
            label="Fecha"
            value={fecha}
            min={hoy}
            onChange={(e) => {
              setFecha(e.currentTarget.value);
              setHora(null);
            }}
          />
          <Select
            label={esCombo ? 'Hora de inicio' : 'Hora'}
            placeholder={horas.length ? 'Elegí la hora' : 'Cerrado ese día'}
            data={horas}
            value={hora}
            onChange={setHora}
            disabled={!horas.length}
            searchable
          />
        </Group>

        {esCombo && (
          <Text size="xs" c="dimmed">
            El sistema agenda los componentes en orden (HBOT primero) y elige una sala libre para cada uno.
          </Text>
        )}

        {servicio?.requierePrescripcion && (
          <Switch
            label="Prescripción médica activa (requerida para IV / Terapias Biológicas)"
            checked={prescripcion}
            onChange={(e) => setPrescripcion(e.currentTarget.checked)}
          />
        )}

        <Group>
          <Button
            onClick={() => void reservar()}
            loading={reservando}
            disabled={!seleccion || !hora || (!esCombo && !recursoCodigo)}
          >
            {esCombo ? 'Reservar combo' : 'Reservar turno'}
          </Button>
        </Group>

        {error && (
          <Alert color="orange" icon={<IconInfoCircle size={16} />}>
            {error}
          </Alert>
        )}

        {resultado?.creado && (
          <Alert color="teal" title="Turno reservado ✓">
            La sala queda ocupada en la agenda.
          </Alert>
        )}
        {resultado && !resultado.creado && (
          <Alert color="red" title="No se pudo reservar" icon={<IconShieldX size={16} />}>
            <List size="sm">
              {resultado.bloqueos.map((b, i) => (
                <List.Item key={i}>
                  [{b.regla}] {b.mensaje}
                </List.Item>
              ))}
            </List>
          </Alert>
        )}

        {resultadoCombo?.creado && (
          <Alert color="teal" title="Combo reservado ✓">
            <List size="sm">
              {resultadoCombo.plan.map((p, i) => (
                <List.Item key={i}>
                  {p.desde}–{p.hasta} · {p.servicio} · {p.recurso}
                </List.Item>
              ))}
            </List>
          </Alert>
        )}
        {resultadoCombo && !resultadoCombo.creado && (
          <Alert color="red" title="No se pudo reservar el combo" icon={<IconShieldX size={16} />}>
            <List size="sm">
              {resultadoCombo.bloqueos.map((b, i) => (
                <List.Item key={i}>
                  [{b.regla}] {b.mensaje}
                </List.Item>
              ))}
            </List>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

/** Cobro: el front no calcula nada; le pide el monto al bot calcular-cobro. */
function PanelCobro({ paciente }: { paciente: Patient }): JSX.Element {
  const [servicio, setServicio] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opciones = SERVICIOS.map((s) => ({ value: s.codigo, label: `${s.nombre}` }));

  async function calcular(): Promise<void> {
    if (!servicio) {
      return;
    }
    setCalculando(true);
    setError(null);
    setInvoice(null);
    try {
      const inv = await calcularCobro([{ tipo: 'servicio', codigo: servicio }], `Patient/${paciente.id}`);
      setInvoice(inv);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCalculando(false);
    }
  }

  const totalARS = invoice?.totalGross?.value;

  return (
    <Card withBorder radius="md" padding="lg">
      <Group gap="xs" mb="sm">
        <IconCash size={18} />
        <Text fw={600}>Cobro</Text>
      </Group>
      <Group align="flex-end">
        <Select
          label="Servicio"
          placeholder="Elegí un servicio"
          data={opciones}
          value={servicio}
          onChange={setServicio}
          searchable
          w={360}
        />
        <Button onClick={() => void calcular()} loading={calculando} disabled={!servicio}>
          Calcular cobro
        </Button>
      </Group>

      {error && (
        <Alert color="orange" mt="md" icon={<IconInfoCircle size={16} />}>
          {error}
        </Alert>
      )}

      {totalARS !== undefined && (
        <Alert color="teal" mt="md" title="Total a cobrar">
          <Text size="xl" fw={700}>
            <NumberFormatter prefix="$ " value={totalARS} thousandSeparator="." decimalSeparator="," />
          </Text>
          <Text size="sm" c="dimmed">
            Calculado por el bot (incluye conversión USD→ARS al TC vigente). La recepción solo elige el medio de pago.
          </Text>
        </Alert>
      )}
    </Card>
  );
}

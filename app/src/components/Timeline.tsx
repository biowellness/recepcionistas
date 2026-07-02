import { Box, Group, Text, Tooltip } from '@mantine/core';
import type { TimelineData, TurnoTimeline } from '../lib/timeline';
import { colorEstado, labelEstado } from '../lib/estados';

/**
 * Grilla del día ajustada a la pantalla: TODAS las salas y TODO el horario entran
 * sin scroll. Las columnas (franjas de 30') se reparten el ancho en % y las filas
 * (salas) se reparten el alto disponible del viewport.
 */
const NAME_W = 170; // columna de nombres de sala
const HEADER_H = 22;
/** Alto disponible: viewport menos header de la app + título de la página. */
const ALTO_GRILLA = 'calc(100vh - 215px)';

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function Timeline({
  data,
  onReservar,
  onTurno,
}: {
  data: TimelineData;
  onReservar?: (recursoCodigo: string, horaMin: number) => void;
  onTurno?: (turno: TurnoTimeline) => void;
}): JSX.Element {
  if (!data.abierto) {
    return (
      <Text c="dimmed" mt="md">
        El centro está cerrado hoy.
      </Text>
    );
  }

  const totalMin = data.cierreMin - data.aperturaMin;
  const cols: number[] = [];
  for (let m = data.aperturaMin; m < data.cierreMin; m += 30) {
    cols.push(m);
  }
  /** Posición/ancho horizontal en % del track. */
  const pct = (min: number): string => `${(((min - data.aperturaMin) / totalMin) * 100).toFixed(4)}%`;
  const anchoPct = (desdeMin: number, hastaMin: number): string =>
    `${(((hastaMin - desdeMin) / totalMin) * 100).toFixed(4)}%`;

  const turnosPorSala = new Map<string, TurnoTimeline[]>();
  for (const t of data.turnos) {
    const arr = turnosPorSala.get(t.recursoCodigo) ?? [];
    arr.push(t);
    turnosPorSala.set(t.recursoCodigo, arr);
  }

  // Líneas de grilla cada 30' (en %) — la de la hora en punto un toque más notoria.
  const lineas = `repeating-linear-gradient(to right, var(--mantine-color-default-border) 0 1px, transparent 1px calc(100% / ${cols.length}))`;
  const ahoraVisible = data.ahoraMin >= data.aperturaMin && data.ahoraMin <= data.cierreMin;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: ALTO_GRILLA, minHeight: 380 }}>
      <style>{`.bw-slot:hover{background:var(--mantine-color-bio-light);}`}</style>

      {/* Encabezado de horas */}
      <Group gap={0} wrap="nowrap" style={{ flexShrink: 0 }}>
        <Box w={NAME_W} style={{ flexShrink: 0 }} />
        <Box style={{ position: 'relative', flex: 1, height: HEADER_H }}>
          {cols.map((m, i) =>
            m % 60 === 0 ? (
              <Text key={i} size="xs" c="dimmed" style={{ position: 'absolute', left: pct(m), top: 2 }}>
                {fmt(m)}
              </Text>
            ) : null,
          )}
        </Box>
      </Group>

      {/* Filas de salas: se reparten el alto disponible */}
      {data.salas.map((sala) => (
        <Group
          key={sala.codigo}
          gap={0}
          wrap="nowrap"
          align="stretch"
          style={{ flex: 1, minHeight: 0, borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Box
            w={NAME_W}
            px="xs"
            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}
          >
            <Text fz={12} fw={500} lineClamp={2} lh={1.15}>
              {sala.nombre}
            </Text>
            {sala.comparteEquipo && (
              <Text fz={10} c="grape" lh={1.1}>
                comparte equipo
              </Text>
            )}
          </Box>

          <Box style={{ position: 'relative', flex: 1, minHeight: 0, backgroundImage: lineas }}>
            {/* Franjas libres clickeables para reservar */}
            {onReservar &&
              cols.map((m, i) => {
                const ocupado = (turnosPorSala.get(sala.codigo) ?? []).some((t) => m >= t.inicioMin && m < t.finMin);
                if (ocupado) {
                  return null;
                }
                return (
                  <Box
                    key={`slot-${i}`}
                    className="bw-slot"
                    title={`Reservar ${fmt(m)} · ${sala.nombre}`}
                    onClick={() => onReservar(sala.codigo, m)}
                    style={{
                      position: 'absolute',
                      left: pct(m),
                      top: 0,
                      width: `${(100 / cols.length).toFixed(4)}%`,
                      height: '100%',
                      cursor: 'pointer',
                    }}
                  />
                );
              })}

            {(turnosPorSala.get(sala.codigo) ?? []).map((t, i) => (
              <Tooltip
                key={i}
                label={`${t.paciente || 'Paciente'} · ${t.servicio} · ${fmt(t.inicioMin)}–${fmt(t.finMin)} · ${labelEstado(t.estado)}`}
                withArrow
              >
                <Box
                  onClick={() => onTurno?.(t)}
                  style={{
                    position: 'absolute',
                    left: `calc(${pct(t.inicioMin)} + 1px)`,
                    width: `calc(${anchoPct(t.inicioMin, Math.max(t.finMin, t.inicioMin + 30))} - 2px)`,
                    top: 2,
                    bottom: 2,
                    background: `var(--mantine-color-${colorEstado(t.estado)}-6)`,
                    color: 'white',
                    borderRadius: 5,
                    padding: '1px 5px',
                    overflow: 'hidden',
                    cursor: onTurno ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Text fz={11} c="white" fw={700} lineClamp={1} lh={1.2}>
                    {t.servicio}
                  </Text>
                  <Text fz={10} c="white" lineClamp={1} lh={1.2}>
                    {t.paciente || `${fmt(t.inicioMin)}–${fmt(t.finMin)}`}
                  </Text>
                </Box>
              </Tooltip>
            ))}

            {ahoraVisible && (
              <Box
                style={{
                  position: 'absolute',
                  left: pct(data.ahoraMin),
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: 'var(--mantine-color-blue-6)',
                }}
              />
            )}
          </Box>
        </Group>
      ))}
    </Box>
  );
}

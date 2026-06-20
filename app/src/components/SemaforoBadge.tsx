import { Badge } from '@mantine/core';
import type { ColorSala } from '@bw/lib/slots';

const MAP: Record<ColorSala, { color: string; label: string }> = {
  verde: { color: 'teal', label: 'Libre' },
  amarillo: { color: 'yellow', label: 'Por ocupar' },
  rojo: { color: 'red', label: 'Ocupada' },
};

export function SemaforoBadge({ estado, size = 'lg' }: { estado: ColorSala; size?: string }): JSX.Element {
  const { color, label } = MAP[estado];
  return (
    <Badge color={color} size={size} variant="filled">
      {label}
    </Badge>
  );
}

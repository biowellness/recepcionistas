/** Colores y etiquetas de los estados del turno (Appointment.status). */

const COLOR: Record<string, string> = {
  pending: 'yellow',
  proposed: 'yellow',
  booked: 'bio',
  arrived: 'orange',
  'checked-in': 'teal',
  fulfilled: 'gray',
  noshow: 'red',
  cancelled: 'gray',
};

const LABEL: Record<string, string> = {
  pending: 'Tentativo (falta seña)',
  proposed: 'Tentativo (falta seña)',
  booked: 'Confirmado',
  arrived: 'Llegó',
  'checked-in': 'En curso',
  fulfilled: 'Completado',
  noshow: 'No vino',
  cancelled: 'Cancelado',
};

export function colorEstado(estado: string): string {
  return COLOR[estado] ?? 'red';
}

export function labelEstado(estado: string): string {
  return LABEL[estado] ?? estado;
}

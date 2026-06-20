/** Colores y etiquetas de los estados del turno (Appointment.status). */

const COLOR: Record<string, string> = {
  booked: 'indigo',
  pending: 'indigo',
  proposed: 'indigo',
  arrived: 'orange',
  'checked-in': 'teal',
  fulfilled: 'gray',
  noshow: 'red',
  cancelled: 'gray',
};

const LABEL: Record<string, string> = {
  booked: 'Reservado',
  pending: 'Reservado',
  proposed: 'Reservado',
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

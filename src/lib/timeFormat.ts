function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Formato "HH:00 – HH:00" para el rango horario de un slot.
 * endHour === 24 se muestra como 00:00 (midnight) para retrocompat con docs legacy.
 */
export function windowLabel(startHour: number, endHour: number): string {
  const end = endHour === 24 ? 0 : endHour;
  return `${pad(startHour)}:00 – ${pad(end)}:00`;
}

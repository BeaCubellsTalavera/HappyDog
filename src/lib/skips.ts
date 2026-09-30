import { createFeeding } from './feedings';
import { slotToAbsoluteTimestamp } from './logicalDay';

interface CreateSkipInput {
  /** Fecha del día LÓGICO al que pertenece el slot (YYYY-MM-DD). */
  date: string;
  startHour: number;
  uid: string;
  name: string;
}

export async function createSkip({ date, startHour, uid, name }: CreateSkipInput): Promise<void> {
  const timestamp = slotToAbsoluteTimestamp(date, startHour);
  await createFeeding({ method: 'skipped', timestamp, feederUid: uid, feederName: name });
}

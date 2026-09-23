import { createFeeding } from './feedings';

interface CreateSkipInput {
  date: string;
  startHour: number;
  uid: string;
  name: string;
}

export async function createSkip({ date, startHour, uid, name }: CreateSkipInput): Promise<void> {
  const [year, month, day] = date.split('-').map(Number);
  const timestamp = new Date(year, month - 1, day, startHour, 0, 0);
  await createFeeding({ method: 'skipped', timestamp, feederUid: uid, feederName: name });
}

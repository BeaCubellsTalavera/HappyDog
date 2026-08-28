export interface Feeding {
  id?: string;
  timestamp: Date;
  dateLocal: string;
  hourLocal: number;
  feederUid: string;
  feederName: string;
  method: 'nfc' | 'manual';
  createdAt?: unknown;
}

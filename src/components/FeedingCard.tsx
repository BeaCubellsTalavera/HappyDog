import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Feeding } from '../types';
import { useSessionMark } from '../lib/sessionMark';
import { useAuth } from '../hooks/useAuth';

interface Props {
  feeding: Feeding;
}

export function FeedingCard({ feeding }: Props) {
  const currentUid = useAuth((s) => s.user?.uid);
  const seenAt = useSessionMark((s) => s.seenAt);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const initials = feeding.feederName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const date = feeding.timestamp.toDate();
  const relativeTime =
    Date.now() - date.getTime() < 60_000
      ? 'justo ahora'
      : formatDistanceToNow(date, { addSuffix: true, locale: es });

  // Nuevo solo para otros usuarios: llegó después de la última apertura y no
  // lo creó el usuario actual (quien lo crea ya sabe que lo acaba de apuntar).
  const isNew =
    seenAt > 0 &&
    feeding.createdAt != null &&
    feeding.createdAt.toMillis() > seenAt &&
    feeding.feederUid !== currentUid;

  return (
    <div className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm transition-colors ${isNew ? 'ring-1 ring-orange-200' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{feeding.feederName}</p>
          {isNew && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-500 text-white shrink-0">
              Nuevo
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{relativeTime}</p>
      </div>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
          feeding.method === 'nfc'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {feeding.method === 'nfc' ? 'NFC' : 'Manual'}
      </span>
    </div>
  );
}

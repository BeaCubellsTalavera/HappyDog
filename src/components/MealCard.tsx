import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Feeding, MealSlot, Skip, SlotStatus } from '../types';
import { ManualFeedDialog, type ManualFeedDialogHandle } from './ManualFeedDialog';

interface Props {
  slot: MealSlot;
  status: SlotStatus;
  feeding: Feeding | null;
  skip: Skip | null;
  onFeed: () => Promise<void>;
  onSkip: () => Promise<void>;
  onNavigateHistory: () => void;
}

const GRADIENTS: Record<string, string> = {
  morning:   'from-orange-300 via-yellow-200 to-sky-300',
  midday:    'from-sky-300 via-blue-200 to-sky-400',
  afternoon: 'from-orange-400 via-rose-300 to-purple-400',
  night:     'from-indigo-900 via-blue-900 to-slate-900',
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function windowLabel(slot: MealSlot) {
  const end = slot.endHour === 24 ? '00:00' : `${pad(slot.endHour)}:00`;
  return `${pad(slot.startHour)}:00 – ${end}`;
}

export function MealCard({ slot, status, feeding, skip, onFeed, onSkip, onNavigateHistory }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const retroRef = useRef<ManualFeedDialogHandle>(null);

  async function handleFeed() {
    if (saving) return;
    setSaving(true);
    try { await onFeed(); } finally { setSaving(false); }
  }

  async function handleSkip() {
    setMenuOpen(false);
    if (saving) return;
    setSaving(true);
    try { await onSkip(); } finally { setSaving(false); }
  }

  const hasBg = true; // always attempt; onerror will fall back to gradient
  const gradient = GRADIENTS[slot.id] ?? GRADIENTS.morning;

  const badgeConfig = {
    pending:  { bg: 'bg-orange-500/90',  text: 'PENDIENTE',      icon: '🕐' },
    given:    { bg: 'bg-green-500/90',   text: 'DADA',           icon: '✓'  },
    missed:   { bg: 'bg-red-500/90',     text: 'NO REGISTRADO',  icon: '✕'  },
    skipped:  { bg: 'bg-amber-400/90',   text: 'SALTADA',        icon: '⏭'  },
    'not-yet':{ bg: 'bg-gray-400/80',    text: 'NO TOCA AÚN',    icon: '○'  },
  }[status];

  const canAct = status === 'pending' || status === 'missed';

  return (
    <div className="relative w-full h-full flex-shrink-0 overflow-hidden rounded-3xl">
      {/* Background */}
      {hasBg ? (
        <img
          src={slot.bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : null}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} style={{ zIndex: hasBg ? -1 : 0 }} />

      {/* Dark overlay at bottom for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {/* Three-dots menu */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
          aria-label="Opciones"
        >
          ···
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg overflow-hidden min-w-[140px]">
              {canAct && (
                <button
                  onClick={handleSkip}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>⏭</span> Skip
                </button>
              )}
              {!canAct && (
                <p className="px-4 py-3 text-sm text-gray-400">Sin opciones</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-white/80 text-xs font-semibold tracking-widest">{slot.label}</p>
        <p className="text-white text-2xl font-bold leading-tight">{slot.name.toUpperCase()}</p>
        <p className="text-white/70 text-sm">{windowLabel(slot)}</p>
      </div>

      {/* Status badge */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center z-10">
        <div className={`${badgeConfig.bg} backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2`}>
          <span className="text-white text-sm">{badgeConfig.icon}</span>
          <span className="text-white text-sm font-semibold tracking-wide">{badgeConfig.text}</span>
          {status === 'given' && feeding && (
            <span className="text-white/80 text-xs ml-1">
              · {feeding.feederName} · {format(feeding.timestamp.toDate(), 'HH:mm', { locale: es })}
            </span>
          )}
          {status === 'skipped' && skip && (
            <span className="text-white/80 text-xs ml-1">· {skip.skippedByName}</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-6 left-4 right-4 z-10 flex gap-3">
        {canAct ? (
          <>
            <button
              onClick={handleFeed}
              disabled={saving}
              className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M4 11h16a1 1 0 0 1 .97 1.24C19.84 16.31 16.28 19 12 19s-7.84-2.69-8.97-6.76A1 1 0 0 1 4 11zm2.1 2a7.02 7.02 0 0 0 11.8 0H6.1zM3 9a1 1 0 0 1 1-1h16a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1z"/>
                  </svg>
                  DAR {slot.name.toUpperCase()}
                </>
              )}
            </button>
            <button
              onClick={() => retroRef.current?.open()}
              className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-orange-500 hover:bg-orange-50 active:bg-orange-100 transition-colors"
              aria-label="Registrar hora pasada"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <circle cx="12" cy="12" r="9"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={onNavigateHistory}
            className="flex-1 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
            VER HISTORIAL
          </button>
        )}
      </div>

      <ManualFeedDialog ref={retroRef} slot={slot} />
    </div>
  );
}

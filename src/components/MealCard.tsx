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
}

function BowlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 500" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M 250,110 A 150,70 0 0,0 100,180 L 60,320 C 60,410 440,410 440,320 L 400,180 A 150,70 0 0,0 250,110 Z M 250,130 A 130,50 0 0,1 380,180 A 130,50 0 0,1 250,230 A 130,50 0 0,1 120,180 A 130,50 0 0,1 250,130 Z"
      />
    </svg>
  );
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

export function MealCard({ slot, status, feeding, skip, onFeed, onSkip }: Props) {
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

  const gradient = GRADIENTS[slot.id] ?? GRADIENTS.morning;

  // Badge solo para pending y not-yet; el resto tiene bloque en el área de acción
  const badgeConfig: { bg: string; text: string; icon: string } | null = {
    pending:  { bg: 'bg-orange-500/55', text: 'PENDIENTE',   icon: '🕐' },
    'not-yet':{ bg: 'bg-gray-400/50',   text: 'NO TOCA AÚN', icon: '○'  },
    skipped:  null,
    given:    null,
    missed:   null,
  }[status] ?? null;

  return (
    <div className="relative w-full h-full flex-shrink-0 overflow-hidden rounded-3xl">
      {/* Background image with gradient fallback */}
      <img
        src={slot.bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} style={{ zIndex: -1 }} />

      {/* Dark overlay for legibility */}
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
              {status === 'pending' ? (
                <button
                  onClick={handleSkip}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>⏭</span> Skip
                </button>
              ) : (
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

      {/* Status badge — not shown when given (handled by the block below) */}
      {badgeConfig && (
        <div className="absolute bottom-28 left-0 right-0 flex justify-center z-10">
          <div className={`${badgeConfig.bg} backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2`}>
            <span className="text-white text-sm">{badgeConfig.icon}</span>
            <span className="text-white text-sm font-semibold tracking-wide">{badgeConfig.text}</span>
          </div>
        </div>
      )}

      {/* Action area — todos los bloques usan h-14 para ocupar el mismo espacio */}
      <div className="absolute bottom-10 left-5 right-5 z-10 flex gap-3">
        {/* Pending: DAR + relojito */}
        {status === 'pending' && (
          <>
            <button
              onClick={handleFeed}
              disabled={saving}
              className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <BowlIcon className="w-5 h-5" />
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
        )}

        {/* Missed: bloque NO REGISTRADO h-14 + relojito */}
        {status === 'missed' && (
          <>
            <div className="flex-1 h-14 bg-red-500/35 backdrop-blur-sm rounded-2xl px-5 flex items-center gap-2">
              <span className="text-white font-bold text-base">✕</span>
              <span className="text-white font-bold text-base">NO REGISTRADO</span>
            </div>
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
        )}

        {/* Not yet: DAR deshabilitado h-14 */}
        {status === 'not-yet' && (
          <button
            disabled
            className="flex-1 h-14 bg-white/15 text-white/40 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <BowlIcon className="w-5 h-5" />
            DAR {slot.name.toUpperCase()}
          </button>
        )}

        {/* Given: bloque DADA h-14 — feeder y hora en la misma línea */}
        {status === 'given' && feeding && (
          <div className="flex-1 h-14 bg-green-500/35 backdrop-blur-sm rounded-2xl px-5 flex flex-col justify-center">
            <p className="text-white font-bold text-sm leading-tight">✓ DADA</p>
            <p className="text-white/80 text-xs leading-tight">
              {feeding.feederName} · {format(feeding.timestamp.toDate(), 'HH:mm', { locale: es })}
            </p>
          </div>
        )}

        {/* Skipped: bloque SALTADA h-14, mismo tamaño y posición que DADA y NO REGISTRADO */}
        {status === 'skipped' && (
          <div className="flex-1 h-14 bg-amber-400/35 backdrop-blur-sm rounded-2xl px-5 flex flex-col justify-center">
            <p className="text-white font-bold text-sm leading-tight">⏭ SALTADA</p>
            {skip && (
              <p className="text-white/80 text-xs leading-tight">{skip.skippedByName}</p>
            )}
          </div>
        )}
      </div>

      <ManualFeedDialog ref={retroRef} slot={slot} />
    </div>
  );
}

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { z } from 'zod';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { createFeeding } from '../lib/feedings';
import { useTodayFeedings } from '../hooks/useFeedings';
import { injectHistoryFeeding } from '../hooks/useHistory';
import type { MealSlot } from '../types';

export interface ManualFeedDialogHandle {
  open: () => void;
}

interface Props {
  slot?: MealSlot;
  /** Modo historial: permite registrar entradas de ayer hasta 7 días atrás. */
  pastMode?: boolean;
}

/** Devuelve el valor inicial del input según el modo. */
function defaultValue(slot: MealSlot | undefined, pastMode: boolean): string {
  if (pastMode) return format(subDays(new Date(), 1), "yyyy-MM-dd'T'12:00");
  if (slot) {
    // Solo hora — type="time"
    const d = new Date();
    d.setHours(slot.startHour, 0, 0, 0);
    if (d > new Date()) return format(new Date(), 'HH:mm');
    return format(d, 'HH:mm');
  }
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

/** Construye la Date final a partir del valor del input. */
function toDate(value: string, slot: MealSlot | undefined, pastMode: boolean): Date {
  if (!pastMode && slot) {
    // value es "HH:mm" — combinar con la fecha de hoy
    return new Date(`${format(new Date(), 'yyyy-MM-dd')}T${value}`);
  }
  return new Date(value);
}

function buildSchema(slot: MealSlot | undefined, pastMode: boolean) {
  if (pastMode) {
    const minDate = startOfDay(subDays(new Date(), 7));
    const maxDate = endOfDay(subDays(new Date(), 1));
    return z.object({
      value: z
        .string()
        .refine((v) => new Date(v) >= minDate, { message: 'No puede ser de hace más de una semana' })
        .refine((v) => new Date(v) <= maxDate, { message: 'Solo se pueden registrar entradas de ayer para atrás' }),
    });
  }

  if (slot) {
    // value es "HH:mm"
    return z.object({
      value: z.string().refine((v) => {
        const hour = parseInt(v.split(':')[0], 10);
        const end = slot.endHour === 24 ? 24 : slot.endHour;
        return hour >= slot.startHour && hour < end;
      }, { message: `Debe estar entre las ${slot.startHour}:00 y las ${slot.endHour === 24 ? '24:00' : slot.endHour + ':00'}` }),
    });
  }

  return z.object({
    value: z
      .string()
      .refine((v) => new Date(v) <= new Date(), { message: 'No puede ser una fecha futura' })
      .refine((v) => new Date(v) >= new Date(Date.now() - 24 * 60 * 60 * 1000), { message: 'No puede ser de hace más de 24 horas' }),
  });
}

export const ManualFeedDialog = forwardRef<ManualFeedDialogHandle, Props>(
  ({ slot, pastMode = false }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const { user } = useAuth();
    const [value, setValue] = useState(() => defaultValue(slot, pastMode));
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const inputType = pastMode ? 'datetime-local' : slot ? 'time' : 'datetime-local';

    const minAttr = pastMode
      ? format(startOfDay(subDays(new Date(), 7)), "yyyy-MM-dd'T'HH:mm")
      : slot
      ? `${String(slot.startHour).padStart(2, '0')}:00`
      : undefined;

    const maxAttr = pastMode
      ? format(endOfDay(subDays(new Date(), 1)), "yyyy-MM-dd'T'HH:mm")
      : slot
      ? `${slot.endHour === 24 ? '23' : String(slot.endHour - 1).padStart(2, '0')}:59`
      : undefined;

    useImperativeHandle(ref, () => ({
      open() {
        setValue(defaultValue(slot, pastMode));
        setError(null);
        dialogRef.current?.showModal();
      },
    }));

    function close() {
      dialogRef.current?.close();
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      const result = buildSchema(slot, pastMode).safeParse({ value });
      if (!result.success) {
        setError(result.error.issues[0].message);
        return;
      }
      if (!user) return;
      setSaving(true);
      try {
        const feeding = await createFeeding({
          timestamp: toDate(value, slot, pastMode),
          feederUid: user.uid,
          feederName: user.displayName ?? user.email ?? 'Desconocido',
          method: 'manual',
        });
        if (pastMode) {
          injectHistoryFeeding(feeding);
        } else {
          await useTodayFeedings.getState().reload();
        }
        close();
      } catch (err) {
        console.error('createFeeding error:', err);
        setError('Error al guardar. Inténtalo de nuevo.');
      } finally {
        setSaving(false);
      }
    }

    return (
      <dialog
        ref={dialogRef}
        className="rounded-2xl shadow-xl p-0 w-full max-w-[min(24rem,calc(100%-2rem))] mx-auto my-auto backdrop:bg-black/50"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {pastMode ? 'Registrar toma pasada' : 'Registrar'}
          </h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700" htmlFor="feeding-input">
              {slot ? '¿A qué hora?' : '¿Cuándo?'}
            </label>
            <input
              id="feeding-input"
              type={inputType}
              value={value}
              min={minAttr}
              max={maxAttr}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {pastMode && (
              <p className="text-xs text-gray-400">
                De ayer hasta hace 7 días. Las de hoy se registran desde Inicio.
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </dialog>
    );
  }
);

ManualFeedDialog.displayName = 'ManualFeedDialog';

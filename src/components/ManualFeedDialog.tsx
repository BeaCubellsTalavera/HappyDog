import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { z } from 'zod';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { createFeeding } from '../lib/feedings';
import { injectTodayFeeding } from '../hooks/useFeedings';
import type { MealSlot } from '../types';

export interface ManualFeedDialogHandle {
  open: () => void;
}

interface Props {
  slot?: MealSlot;
}

function slotDefault(slot: MealSlot | undefined): string {
  if (!slot) return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const d = new Date();
  d.setHours(slot.startHour, 0, 0, 0);
  // If startHour is in the future today, use now instead
  if (d > new Date()) return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function buildSchema(slot: MealSlot | undefined) {
  return z.object({
    datetime: z
      .string()
      .refine(
        (val) => {
          const d = new Date(val);
          return !isNaN(d.getTime()) && d <= new Date();
        },
        { message: 'No puede ser una fecha futura' }
      )
      .refine(
        (val) => {
          if (!slot) {
            const d = new Date(val);
            return d >= new Date(Date.now() - 24 * 60 * 60 * 1000);
          }
          const hour = new Date(val).getHours();
          const end = slot.endHour === 24 ? 24 : slot.endHour;
          return hour >= slot.startHour && hour < end;
        },
        slot
          ? { message: `Debe estar dentro de la ventana ${slot.startHour}:00–${slot.endHour === 24 ? '24:00' : slot.endHour + ':00'}` }
          : { message: 'No puede ser de hace más de 24 horas' }
      ),
  });
}

export const ManualFeedDialog = forwardRef<ManualFeedDialogHandle, Props>(({ slot }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { user } = useAuth();
  const [datetime, setDatetime] = useState(() => slotDefault(slot));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    open() {
      setDatetime(slotDefault(slot));
      setError(null);
      dialogRef.current?.showModal();
    },
  }));

  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = buildSchema(slot).safeParse({ datetime });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const feeding = await createFeeding({
        timestamp: new Date(datetime),
        feederUid: user.uid,
        feederName: user.displayName ?? user.email ?? 'Desconocido',
        method: 'manual',
      });
      injectTodayFeeding(feeding);
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
      className="rounded-2xl shadow-xl p-0 max-w-sm w-full mx-4 my-auto backdrop:bg-black/50"
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {slot ? `Registrar ${slot.name.toLowerCase()} olvidada` : 'Registrar comida'}
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-700" htmlFor="feeding-datetime">
            ¿Cuándo?
          </label>
          <input
            id="feeding-datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => {
              setDatetime(e.target.value);
              setError(null);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
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
});

ManualFeedDialog.displayName = 'ManualFeedDialog';

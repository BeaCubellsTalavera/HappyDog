import { useToast } from '../hooks/useToast';

export function Toast() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);

  if (!current) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 inset-x-0 z-30 mx-auto max-w-md px-4 pointer-events-none"
    >
      <button
        type="button"
        onClick={hide}
        className="w-full text-left bg-orange-500 text-white rounded-2xl shadow-lg px-4 py-3 pointer-events-auto"
      >
        <p className="font-semibold text-sm">{current.title}</p>
        {current.body && <p className="text-sm opacity-90 mt-0.5">{current.body}</p>}
      </button>
    </div>
  );
}

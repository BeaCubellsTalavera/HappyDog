import { create } from 'zustand';

const KEY = 'happydog_last_opened';
const stored = localStorage.getItem(KEY);

// Timestamp de la última vez que el usuario salió de Home o mandó la app al background.
export const lastOpenedAt: number = stored ? parseInt(stored, 10) : 0;

// Fallback por si la app se cierra de golpe antes de que Home llame a markSeen.
localStorage.setItem(KEY, String(Date.now()));

interface SessionStore {
  seenAt: number;
  markSeen: () => void;
}

export const useSessionMark = create<SessionStore>(() => ({
  seenAt: lastOpenedAt,
  markSeen: () => {
    const now = Date.now();
    localStorage.setItem(KEY, String(now));
    useSessionMark.setState({ seenAt: now });
  },
}));

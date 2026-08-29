const KEY = 'happydog_last_opened';
const stored = localStorage.getItem(KEY);

// Timestamp de la apertura anterior (0 si es la primera vez).
// Se lee ANTES de actualizar para que los feedings de esta sesión no cuenten
// como "nuevo" en la próxima apertura.
export const lastOpenedAt: number = stored ? parseInt(stored, 10) : 0;

// Actualizar inmediatamente: la próxima sesión usa este instante como umbral.
localStorage.setItem(KEY, String(Date.now()));

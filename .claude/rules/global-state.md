# Global state: Zustand (no React Context)

Usar **Zustand** para todo estado compartido entre componentes. No crear `Context` + `Provider` para estado propio de la app.

**Patrón correcto:**
```ts
// src/hooks/useFoo.ts
import { create } from 'zustand';
export const useFoo = create<FooState>(() => ({ ... }));
```

**Por qué:** el store arranca al importar el módulo (sin Provider en el árbol), los suscriptores solo re-renderizan cuando cambia el slice que leen, y no hay riesgo de race entre Provider y navegación.

**Aplicación:**
- El store de auth está en `src/hooks/useAuth.tsx` — el `onAuthStateChanged` de Firebase arranca al importar el módulo, sin `AuthProvider`.
- Para nuevo estado global, crear `src/hooks/useXxx.ts` con `create`.
- React Context solo se usa cuando una librería externa lo impone (React Router, etc.).

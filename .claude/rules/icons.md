# Iconos SVG: src/components/icons/

Los iconos SVG reutilizables van en `src/components/icons/`, un archivo por icono.

```
src/components/icons/
  BowlIcon.tsx
  SkipIcon.tsx
  ...
```

**Patrón:**
```tsx
// src/components/icons/FooIcon.tsx
export function FooIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="..." />
    </svg>
  );
}
```

**Reglas:**
- No duplicar el mismo SVG inline en varios componentes. Si un icono aparece en más de un sitio, extraerlo.
- No definir un icono como función privada dentro de un componente si se usa en otro archivo.
- Los iconos de marca externa (ej. logo de Google con sus colores propios) pueden quedarse como SVG inline en su componente porque no son parte del sistema de iconos de la app.

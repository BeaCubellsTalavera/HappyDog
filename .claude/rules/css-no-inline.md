# CSS: no inline styles

No usar `style={{}}` en JSX.

**Primera opción:** utilidades Tailwind, incluyendo valores arbitrarios `[property:value]`.

**Si el valor no puede ser utilidad Tailwind:** definir una clase en `src/index.css` con `@utility` o en un CSS module del componente.

**Excepción permitida:** valores auténticamente dinámicos que no se pueden precalcular como clase (p.ej. `style={{ width: progress + '%' }}`).

**Por qué:** los inline styles no son procesables por Tailwind, rompen la consistencia del sistema de diseño y dificultan el theming y el purging de CSS no usado.

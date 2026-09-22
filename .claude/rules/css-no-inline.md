# CSS: clases y variables globales, no valores inline

## 1. No inline styles

No usar `style={{}}` en JSX.  
**Excepción:** valores auténticamente dinámicos que no se pueden precalcular como clase (p.ej. `style={{ width: progress + '%' }}`).

## 2. Colores: variables en `@theme`, no valores arbitrarios

No usar `text-[#xxx]`, `bg-[#xxx]` ni `fill-[#xxx]`.  
Los colores del proyecto se definen en `src/index.css` bajo `@theme`:

```css
@theme {
  --color-brand: #FFA000;
}
```

Esto genera tokens Tailwind (`text-brand`, `bg-brand`, `fill-brand`, etc.) y mantiene el color en un solo lugar.  
Los colores de terceros en SVG (ej. logo de Google) pueden quedar como `fill="#xxx"` en el atributo SVG porque son requisito de marca externa.

## 3. Clases CSS para patrones reutilizables, no valores arbitrarios Tailwind

No usar `className="w-[0.62em] h-[0.62em] [vertical-align:-0.04em]"` ni similares para estilos que pertenecen a un componente.  
Definir una clase CSS en `src/index.css` (o en un `.module.css` si es exclusiva del componente):

```css
.logo-icon {
  display: inline-block;
  width: 0.62em;
  height: 0.62em;
  vertical-align: -0.04em;
}
```

Los valores arbitrarios Tailwind (`[property:value]`) solo son aceptables para ajustes únicos de layout que no tienen nombre semántico y no se repiten.

## 4. Elementos UI semánticos: componente o clase con nombre

Un `<div>` o `<span>` con significado propio (separador, conector, badge, overlay…) debe ser un componente con nombre o usar una clase CSS semántica, no un div anónimo con cadena de utilidades.

```tsx
// Mal
<div className="h-0.5 w-6 flex-shrink-0 bg-gray-200" />

// Bien
function StepConnector() { return <div className="step-connector" />; }
// + .step-connector en index.css
```

## Por qué

- Un solo punto de cambio para el color de marca.
- Las clases CSS con nombre comunican la intención; una cadena de valores arbitrarios no.
- Los inline styles y los valores arbitrarios de color no participan en el sistema de theming.

# HappyDog — Guía para Claude Code

Proyecto: **HappyDog**, una PWA familiar para trackear cuándo se da de comer a los perros vía pegatina NFC (o registro manual como fallback). Notifica al resto de la familia por push. React 18 + TypeScript + Vite + Firebase + Vercel. Uso privado, sin app store.

## Autoría de commits

Los commits de esta sesión son trabajo conjunto. No añadir `Co-Authored-By` en el mensaje de commit; en su lugar, este `CLAUDE.md` documenta que Claude Code (Sonnet 4.6) co-desarrolla el proyecto.

## Flujo de Trabajo

1. Lee siempre `PLAN.md` para saber la fase activa.
2. Al completar cada checkbox: **primero marca `[x]` en `PLAN.md`, luego haz `git commit` inmediatamente**. Un checkbox = un commit. No agrupar varios checkboxes en un solo commit.
3. Actualiza el bloque "Estado Actual" de `PLAN.md` al final de cada fase y commitéalo.
4. No avances a la siguiente fase sin pedir confirmación.
5. Al completar una fase, verificar con Playwright MCP (`http://localhost:5173`) Y pedir confirmación manual al usuario. Ambas cosas. Solo omitir Playwright si la verificación requiere dispositivo físico, cuenta Google real, o push notifications.

## Reglas específicas del proyecto

- **⚠️ GASTO REAL 0 €.** Blaze/pay-as-you-go es aceptable si el uso real está muy por debajo del free tier del servicio (así es el caso: ~5 usuarios, ~25 feedings/día). Lo que no es aceptable es introducir un servicio cuyo uso previsto genere factura. Antes de añadir un servicio nuevo, comprobar la tabla en `PLAN.md` sección "⚠️ Restricción: gasto real cero" y verificar que el uso previsto se queda 10× o más por debajo del free tier. Si dudas, preguntar. **Nunca sacrificar calidad técnica** por evitar Blaze — el uso real es lo que importa.
- **Budget alert obligatorio.** En Google Cloud Console debe haber un budget de 1 € configurado con notificaciones. Si alguna vez llega una alerta, investigar antes de merge/deploy.
- **Nombre en UI, manifest y textos:** siempre `HappyDog` (no "NFC", no "Dog Feeder", etc.).
- **Idioma de UI:** español. Locale de `date-fns`: `es`.
- **Sesión de auth:** permanente por diseño. `setPersistence(auth, browserLocalPersistence)`. **No añadir botón "Recuérdame" ni lógica de expiración**.
- **Un solo NFC:** el tag es compartido para ambos perros. Un escaneo = un evento genérico "les dieron de comer". No añadir selector de perro sin acordar cambio de scope.
- **Campos obligatorios al crear un feeding:** `timestamp`, `dateLocal` (`format(d,'yyyy-MM-dd')`), `hourLocal` (`d.getHours()`), `feederUid`, `feederName`, `method` ('nfc' | 'manual'), `createdAt` (`serverTimestamp()`). No omitir `dateLocal`/`hourLocal` aunque no se usen todavía — son la base de stats/rankings futuros.
- **Arquitectura async con Cloud Functions v2 (pub/sub implícito):** el cliente hace `addDoc` (path crítico <300ms, la UI ya confirma) y termina. Los workers son **Cloud Functions v2 independientes disparadas por el mismo trigger `onDocumentCreated('feedings/{id}')`**. Añadir un nuevo consumidor = añadir un archivo en `functions/src/` con su propio `export const xxx = onDocumentCreated(...)` y re-exportarlo en `functions/src/index.ts`. NO extender un worker existente para meter lógica de otro dominio.
- **Reglas Firestore:** `feedings` create solo con `feederUid == request.auth.uid`; nunca update/delete. `config/*` read auth, no write cliente. `users/{uid}` write solo el propio dueño.
- **Web NFC API:** NO usar. La lectura NFC no funciona en iOS. El mecanismo es siempre "URL en el tag → abre PWA → detecta ruta `/feed?token=...`".

## Desarrollo local con Docker + Emuladores

**Todo dev y testing corre contra emuladores locales, NUNCA contra Firebase real.** Esto asegura coste cero y ciclos rápidos.

```bash
docker compose up -d              # arranca Firebase Emulator Suite en background
                                  # Emulator UI: http://localhost:4000
                                  # Auth: :9099, Firestore: :8080
npm run seed                      # (opcional) semilla usuarios y feedings de prueba
npm run dev                       # Vite en :5173, conectado a los emuladores vía VITE_USE_EMULATORS=true
```

- El SDK cliente detecta `import.meta.env.VITE_USE_EMULATORS` y llama a `connectAuthEmulator` / `connectFirestoreEmulator`.
- Los endpoints Vercel serverless en dev (`vercel dev`) también detectan variables `FIREBASE_AUTH_EMULATOR_HOST` y `FIRESTORE_EMULATOR_HOST`.
- Datos persistidos entre reinicios del contenedor con `--import`/`--export-on-exit` en el volumen `emulator-data`.
- Para probar push notifications reales hace falta móvil físico + Firebase real (única excepción). Se hace al final de F6.

**No commitear:**
- `.env.local` (secretos reales de Firebase prod)
- Cualquier `service-account*.json`

**Sí commitear:**
- `.env.example` (plantilla)
- `.env.emulators` (valores dummy para emuladores, safe)

## Comandos comunes

_(Se irán rellenando conforme se vayan configurando)_

```bash
# Levantar emuladores Firebase (Auth + Firestore) en Docker
docker compose up -d
docker compose down                 # apagar (el estado persiste en el volumen)
docker compose logs -f              # ver logs

# Dev local (Vite contra emuladores)
npm run dev

# Semillar emuladores con datos de prueba
npm run seed

# Ejecutar endpoints Vercel serverless en local
vercel dev

# Build de producción
npm run build

# Preview del build (necesario para probar Service Worker)
npm run preview

# Deploy rules de Firestore
firebase deploy --only firestore:rules --project happydog-prod

# Deploy Cloud Functions
cd functions && npm run build && firebase deploy --only functions --project happydog-prod

# Deploy frontend a Vercel
git push origin main                # deploy automático si está linkeado
# o manual:
vercel --prod
```

## Estructura del repo

- `src/` — código de la app React
- `public/` — assets estáticos, incluido `firebase-messaging-sw.js` (no lo toca vite-plugin-pwa)
- `functions/` — Cloud Functions (Node 20, TypeScript)
- `firestore.rules` — reglas de seguridad
- `PLAN.md` — plan de implementación con checkboxes (fuente de verdad del progreso entre sesiones)
- `.env.local` — variables reales, NO commitear
- `.env.example` — plantilla

## Convenciones de código

- TypeScript estricto (`"strict": true` en `tsconfig.json`, no relajar sin discutir).
- Componentes React funcionales con hooks. Nada de clases.
- Hooks propios en `src/hooks/`, cada uno en su archivo.
- Lib helpers en `src/lib/`, sin JSX.
- Tipos compartidos en `src/types/`.
- Nombres de archivo: `PascalCase.tsx` para componentes/páginas, `camelCase.ts` para lib/hooks.
- Nada de `any`. Si Firestore devuelve `unknown`, castear con type guard o zod.
- Comentarios: solo cuando el "por qué" no es obvio. Nunca comentarios que describen "qué hace este bloque".

## Antes de dar por completada una fase

Comprueba el bloque **Verificar** al final de la fase en `PLAN.md`. Si no lo puedes verificar tú (requiere móvil físico, cuenta Google, etc.), pide al usuario que lo confirme antes de marcar `[x]`.

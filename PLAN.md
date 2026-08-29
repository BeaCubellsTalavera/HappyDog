# HappyDog — Plan de Implementación

> PWA familiar (privada, sin app store) para registrar cuándo se da de comer a los dos perros de casa. NFC + registro manual + notificaciones push a la familia.

---

## ⚠️ Restricción: gasto real cero

**El gasto real de infraestructura debe ser 0 €/mes.** No es que no se puedan usar servicios con plan "pay-as-you-go": es que **el uso real no puede generar factura**. Un servicio con free tier generoso donde estamos órdenes de magnitud por debajo del límite gratuito es aceptable — la restricción no debe llevar a decisiones técnicamente peores.

**Servicios usados, cuotas gratis y uso esperado:**

| Servicio | Plan | Cuota gratis | Uso esperado HappyDog | Margen |
|---|---|---|---|---|
| Firebase Auth | Blaze (con free tier) | 50 000 MAU | ~5 usuarios | 10 000× |
| Firestore | Blaze (con free tier) | 50k lecturas + 20k escrituras + 1 GiB / día | ~200 lecturas + 25 escrituras / día | 250–800× |
| Firebase Cloud Messaging | Blaze (con free tier) | ilimitado | ~25 push/día | ∞ |
| Firebase Cloud Functions v2 | Blaze (con free tier) | 2M invocaciones + 400k GB-s / mes | ~750 invocaciones/mes | 2 600× |
| Firebase Cloud Scheduler | Blaze (con free tier) | 3 jobs gratis | 1 job (`reminders-cron`) | 3× |
| Vercel (frontend) | Hobby | 100 GB bandwidth/mes | poco | ✓ |
| GitHub (repo privado) | Free | ilimitado | 1 repo | ✓ |

**Nota sobre Firebase Blaze:** Blaze es "pay-as-you-go" pero incluye el free tier de todos los servicios. Con vuestro uso estamos entre **250× y 10 000× por debajo del límite gratuito** en cada servicio, así que la factura real es literalmente 0.00 €.

**Salvaguardas (obligatorias al activar Blaze):**
- Configurar **Google Cloud → Billing → Budgets & alerts** con umbral en **1 €** y notificaciones por email a partir del 50% del budget. Cualquier céntimo real dispara alerta inmediata.
- Considerar **desactivación automática de billing** al superar budget (opción "Disable Cloud Billing" en el budget). Esto tira abajo los servicios antes de generar factura significativa — aceptable porque HappyDog no es crítico.
- **No** introducir servicios sin free tier (BigQuery, Firestore multi-región, Storage con retención larga, etc.) sin discutir.
- Revisar factura Firebase mensualmente el primer mes.
- Cualquier PR o edición que introduzca dependencia con coste real (no free tier) se rechaza.

---

## 📍 Estado Actual

- **Fase activa:** `F4 — Flujo NFC` completada ✅. Verificado en prod (`https://happy-dog-alpha.vercel.app/feed?token=...`) con token temporal puesto a mano en Firestore Console. Pegatina física pendiente de llegar — cuando llegue, se graba con la misma URL. Rules `config/*` live en `happydog-prod`.
- **Último paso completado:** F4 verificada abriendo `/feed?token=...` a mano en el navegador — flujo NFC funcional en prod.
- **Próximo paso:** `F5 — PWA instalable` (en próxima sesión, en `phase/f5-pwa` desde `develop`).
- **Bloqueos:** ninguno.

> ⚠️ Actualiza esta sección al terminar cada paso: mueve **Último paso completado** y **Próximo paso**.

---

## 🎯 Contexto

- **Nombre:** HappyDog
- **Objetivo:** evitar que se alimente dos veces al perro por descoordinación entre miembros de la familia
- **Usuarios:** familia (pocas personas, todos con Google account, iPhone y Android mezclados)
- **Fuera de scope ahora:** rankings, estadísticas, horarios configurables, recordatorios — planificados como F7–F11

**Restricción técnica clave:** el API Web NFC solo funciona en Chrome Android. Para iPhone se usa el hecho de que iOS abre nativamente URLs codificadas en pegatinas NFC. Por eso el mecanismo es una URL profunda `/feed?token=XXX` en el tag, no lectura NFC desde código.

---

## ✅ Decisiones cerradas

| Área | Elección |
|---|---|
| Framework | React 18 + TypeScript, Vite (`react-ts`) |
| Routing | `react-router-dom` v6 |
| PWA | `vite-plugin-pwa` (Workbox), `registerType: 'autoUpdate'` |
| Estilos | Tailwind CSS |
| Backend datos | Firebase Blaze con free tier (Auth + Firestore + Cloud Messaging) — gasto real 0 € |
| Auth | Google Sign-In con `browserLocalPersistence` — sesión permanente por diseño |
| Workers async | **Firebase Cloud Functions v2** — triggers Firestore nativos, at-least-once, pub/sub implícito |
| Cron | Firebase Cloud Scheduler (3 jobs gratis) |
| Hosting frontend | Vercel Hobby |
| Dev local | **Docker Compose** + Firebase Emulator Suite (Auth + Firestore + Functions), sin tocar infra real |
| Fechas | `date-fns` (locale `es`) |
| Validación | `zod` |
| Datos en UI | `onSnapshot` de Firestore (realtime nativo) |
| NFC | **Un solo tag compartido** para ambos perros. URL profunda con token |

---

## 📦 Modelo de datos (Firestore)

```
users/{uid}
  displayName, email, photoURL, fcmTokens[], createdAt

feedings/{autoId}
  timestamp, dateLocal, hourLocal, feederUid, feederName, method, createdAt

config/nfc
  token: string

config/schedule                              # (futuro F8)
  meals: [{ id, label, startHour, endHour }], timezone

mealReminders/{dateLocal}_{mealId}          # (futuro F9, lock idempotente)
  notifiedAt

leaderboards/{periodType}/entries/{uid}     # (futuro F10)
  feederUid, feederName, photoURL, count, updatedAt
```

**Los campos `dateLocal` (`YYYY-MM-DD`) y `hourLocal` (0-23) se derivan del `timestamp` al crear cada feeding** — están desde F3 para no requerir migración cuando lleguen stats/rankings.

---

## 🧵 Arquitectura async — pub/sub implícito con Cloud Functions v2

El cliente hace `addDoc` y responde en <300 ms. Todo lo demás (push, leaderboards, analytics) son **Cloud Functions v2 independientes disparadas del mismo trigger `onDocumentCreated('feedings/{id}')`**. Cada worker vive en su archivo, se despliega y falla/retryea de forma aislada. Es efectivamente publish-subscribe con el evento Firestore como topic.

```
Cliente ──addDoc──▶ feedings/{id} ──trigger──┬──▶ sendFeedingNotifications  (F6)
                                              ├──▶ updateLeaderboards       (F10)
                                              └──▶ (futuros workers)
```

**Ventajas frente a orquestar desde el cliente:**
- **At-least-once delivery:** el trigger se ejecuta aunque el cliente cierre la app entre `addDoc` y cualquier otra acción. Cloud Functions v2 tiene retries configurables si falla.
- **Sin acoplamiento con el cliente:** añadir un worker nuevo = añadir un archivo en `functions/src/`, sin tocar el cliente ni deployar frontend.
- **Aislamiento real:** si el push notification worker tarda 5 s hablando con FCM, el worker de leaderboards no se ve afectado. Retries independientes por worker.
- **Path crítico intacto:** el cliente termina en cuanto Firestore confirma. Todos los workers corren después en el backend.

**No introducir Pub/Sub explícito** hasta que aparezca al menos una de: consumidor externo a Firebase, ≥5 suscriptores, o necesidad de replay de eventos.

**Sobre el coste:** con ~25 escrituras/día × 2-3 workers = ~50-75 invocaciones/día ≈ 2 250/mes. Free tier de Cloud Functions v2 es **2 000 000 invocaciones/mes**. Estamos ~900× por debajo. Coste real: 0 €.

---

## 🗂️ Estructura de carpetas objetivo

```
NFC/
├── public/
│   ├── firebase-messaging-sw.js
│   ├── icons/                     # 192, 512, maskable
│   └── apple-touch-icon.png
├── functions/                     # Firebase Cloud Functions v2 (workers async)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # re-export de todas las funciones
│       ├── send-push.ts           # F6 — trigger onDocumentCreated('feedings/{id}')
│       ├── update-leaderboards.ts # F10 (futuro) — trigger onDocumentCreated
│       └── reminders-cron.ts      # F9 (futuro) — onSchedule('every 15 minutes')
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── pages/         (Home, Feed, Login, Settings)
│   ├── components/    (Layout, FeedingCard, ManualFeedDialog, InstallPrompt, ProtectedRoute, TodayGauge)
│   ├── hooks/         (useAuth, useFeedings, useFcmToken)
│   ├── lib/           (firebase, auth, feedings, messaging)
│   ├── types/index.ts
│   └── index.css
├── firestore.rules
├── firebase.json                  # config de emuladores
├── docker-compose.yml             # levanta emuladores en local
├── docker/
│   └── emulators.Dockerfile       # imagen Node + firebase-tools + Java (para emuladores)
├── vite.config.ts
├── vercel.json                    # config de rutas del frontend
├── .env.example
├── .env.local                     (ignored)
├── .env.emulators                 # apunta a emuladores locales (committed, safe)
├── CLAUDE.md                      (flujo de trabajo para Claude Code)
└── PLAN.md                        (este archivo)
```

---

## 🐳 Desarrollo local con Docker + Firebase Emulators

**Objetivo:** todo el desarrollo y pruebas se hacen contra emuladores locales. Cero llamadas a Firebase real, cero riesgo de coste, cero necesidad de tener el proyecto Firebase creado para arrancar a programar.

**Stack local:**
- `docker compose up` levanta un contenedor con **Firebase Emulator Suite** (Auth + Firestore + FCM Emulator + UI en :4000)
- El cliente Vite detecta `import.meta.env.VITE_USE_EMULATORS === 'true'` y conecta automáticamente vía `connectAuthEmulator`, `connectFirestoreEmulator`, etc.
- El endpoint Vercel serverless en dev (con `vercel dev` o `npm run dev` con proxy) también apunta al emulador
- Datos de prueba semillados con un script `scripts/seed-emulators.ts`

**`docker-compose.yml` (setup objetivo, se creará en F1):**
```yaml
services:
  firebase-emulators:
    build:
      context: .
      dockerfile: docker/emulators.Dockerfile
    ports:
      - "4000:4000"   # Emulator UI
      - "9099:9099"   # Auth
      - "8080:8080"   # Firestore
      - "5001:5001"   # Functions (para probar los triggers localmente)
    volumes:
      - ./firebase.json:/app/firebase.json:ro
      - ./firestore.rules:/app/firestore.rules:ro
      - ./functions:/app/functions
      - emulator-data:/app/.emulator-data
    command: >
      firebase emulators:start
      --project=demo-happydog
      --only=auth,firestore,functions
      --import=/app/.emulator-data
      --export-on-exit=/app/.emulator-data

volumes:
  emulator-data:
```

**`docker/emulators.Dockerfile`:**
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y default-jre-headless && rm -rf /var/lib/apt/lists/*
RUN npm i -g firebase-tools
WORKDIR /app
```

**Flujo de dev diario:**
```bash
docker compose up -d              # arranca emuladores en background (Auth+Firestore+Functions)
npm run dev                       # Vite en :5173, conecta automáticamente al emulador
# ...trabajar...
docker compose down               # para al terminar (datos persistidos en volumen)
```

**Notas:**
- Los **triggers de Cloud Functions se ejecutan en el emulador**: escribir en Firestore emulado dispara la función localmente, ideal para desarrollar y depurar `send-push`, `update-leaderboards`, etc.
- El **FCM real no funciona contra el emulador**: para probar push notifications de verdad hace falta un móvil físico contra Firebase real. En local se puede loguear el payload en lugar de mandarlo.
- `--import`/`--export-on-exit` persiste el estado del emulador entre reinicios del contenedor. Usuarios de prueba y feedings sobreviven.

---

## 🚀 Fases

> **Regla de commit:** al completar cada checkbox, marcar `[x]` en PLAN.md y hacer `git commit` inmediatamente. Un checkbox = un commit. No agrupar varios. (Detalle completo en `CLAUDE.md`.)

Cada fase acaba con algo **verificable**. No pasar a la siguiente sin comprobar el bloque **Verificar**.

### F0 — Setup y documentación · ✅ _completada_

- [x] Escribir `PLAN.md` en el root (este archivo)
- [x] Escribir `CLAUDE.md` en el root con flujo de trabajo
- [x] Crear `.gitignore` (Vite estándar + `.env.local` + `firebase-service-account.json`)
- [x] `git init` (rama `main`)
- [x] Commit inicial local (`07ddc00`)

### F1 — Bootstrap Vite + TS + Tailwind + Firebase SDK + Docker · _2-3h_

- [x] `npm create vite@latest . -- --template react-ts`
- [x] Instalar deps: `npm i firebase react-router-dom date-fns zod`
- [x] Instalar dev deps: `npm i -D tailwindcss postcss autoprefixer vite-plugin-pwa workbox-window`
- [x] Configurar Tailwind (`npx tailwindcss init -p`) + directivas en `src/index.css`
- [x] Crear estructura de carpetas (`pages/`, `components/`, `hooks/`, `lib/`, `types/`, `functions/src/`, `docker/`, `scripts/`)
- [x] `firebase init functions` (TypeScript, Node 20) — genera `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts` stub
- [x] `src/lib/firebase.ts` — `initializeApp`, exports `auth`, `db`, `messaging`. Aplicar `setPersistence(auth, browserLocalPersistence)`. Si `VITE_USE_EMULATORS === 'true'`, llamar a `connectAuthEmulator(auth, 'http://localhost:9099')` y `connectFirestoreEmulator(db, 'localhost', 8080)`
- [x] Crear `docker/emulators.Dockerfile` (Node 20 + Java + firebase-tools)
- [x] Crear `docker-compose.yml` con servicio `firebase-emulators` (Auth + Firestore + Functions)
- [x] Crear `firebase.json` con config de emuladores + config `functions`
- [x] Crear `firestore.rules` stub (`allow read, write: if false;` — se irá abriendo por fase)
- [x] Crear `.env.example` (variables cliente)
- [x] Crear `.env.emulators` con `VITE_USE_EMULATORS=true` + valores dummy de Firebase project (committed)
- [x] Añadir script `scripts/seed-emulators.ts` que crea users y feedings de prueba en el emulador
- [x] Añadir scripts a `package.json`: `"emulators": "docker compose up"`, `"dev": "vite"`, `"seed": "tsx scripts/seed-emulators.ts"`, `"deploy:functions": "cd functions && npm run build && firebase deploy --only functions"`
- [x] **Verificar:** `docker compose up` levanta emuladores en :4000, `npm run dev` levanta Vite en :5173, la consola del navegador muestra conexión a emuladores (no a Firebase real). Escritura en Firestore desde la consola aparece en la UI del emulador (:4000)

### F2 — Auth con Google Sign-In persistente · _2-3h_

- [x] `src/lib/auth.ts` con `signInWithGoogle()` y `signOutUser()`
- [x] `src/hooks/useAuth.tsx` con `onAuthStateChanged` → `{ user, loading }` + `AuthProvider` context
- [x] Al primer login: crear/actualizar `users/{uid}` con `displayName`, `email`, `photoURL`, `createdAt`
- [x] `src/components/ProtectedRoute.tsx` con redirect a `/login?returnTo=...` si no hay user
- [x] `src/pages/Login.tsx` con botón "Continuar con Google" y branding HappyDog
- [x] `firestore.rules` v1: `users/{uid}` read auth, write solo `request.auth.uid == uid`
- [x] **Verificar:** login funciona, refresh mantiene sesión, cerrar/abrir navegador mantiene sesión, `users/{uid}` aparece en Firestore

### F3 — Registro manual y historial · _3-4h_

- [x] `src/types/index.ts` con interface `Feeding`
- [x] `src/lib/feedings.ts` con `createFeeding(input)` (rellena `dateLocal` con `format(d,'yyyy-MM-dd')` y `hourLocal` con `d.getHours()`) y `queryFeedings(limit)` con `onSnapshot`
- [x] `src/hooks/useFeedings.ts` reactivo, unsubscribe en cleanup
- [x] `src/pages/Home.tsx` con listado de `FeedingCard` (avatar + nombre + hora relativa + badge nfc/manual)
- [x] `src/components/ManualFeedDialog.tsx` con `<dialog>` HTML5, input `datetime-local`, validación zod (`no future`, `max 24h atrás`)
- [x] Actualizar `firestore.rules`: `feedings/` read auth, create solo con `feederUid == request.auth.uid`, no update/delete
- [x] **Verificar:** crear feeding manual desde dos móviles/pestañas, ambos ven actualización realtime; validaciones bloquean fechas futuras y >24h atrás

### Finfra — Infraestructura real (Firebase + Vercel + GitHub) · _1h_ ⚠️ _requiere acción manual_

> Se hace aquí, cuando ya hay frontend funcional y antes de necesitar la URL real de Vercel para grabar el tag NFC.

- [x] **[Manual usuario]** Conectar cuenta GitHub personal y crear repo privado `happydog` (o similar). Hacer `git remote add origin <url>` + `git push -u origin main`
- [x] **[Manual usuario]** Crear proyecto Firebase en consola, habilitar: Auth (Google provider), Firestore (production, región `europe-southwest1` / Madrid — ⚠️ la región es permanente), Cloud Messaging, Cloud Functions
- [x] **[Manual usuario]** Upgrade a **plan Blaze**. El uso real está órdenes de magnitud por debajo del free tier (ver tabla en sección "⚠️ Restricción")
- [x] **[Manual usuario]** ⚠️ **Crítico:** configurar **Budget Alert** en Google Cloud Console → Billing → Budgets & alerts. Budget de **1 €/mes** con notificaciones al 50% / 90% / 100%, email a la cuenta principal. Considerar activar "Disable Billing when budget exceeded" (protección extra)
- [x] **[Manual usuario]** Crear proyecto Vercel vacío en plan **Hobby (gratis)**, linkado al repo. Copiar URL HTTPS estable (`https://happy-dog-alpha.vercel.app`)
- [x] **[Manual usuario]** Añadir dominio Vercel a Firebase Auth → Authorized domains
- [x] **[Manual usuario]** Generar VAPID key: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
- [x] Añadir variables `VITE_FIREBASE_*` y `VITE_VAPID_KEY` en Vercel dashboard (Settings → Environment Variables)
- [x] `firebase deploy --only firestore:rules` contra el proyecto real (incluye rules de F2 y F3)
- [x] Deploy frontend a Vercel: `git push origin main` (auto-deploy si está linkeado)
- [x] **Verificar:** app accesible en `https://<app>.vercel.app`, login Google funciona en prod, budget alert configurado a 1 €

### F4 — Flujo NFC · _2-3h_

- [x] Crear doc `config/nfc` en Firestore con `token: <UUID random>` (seed en emulador con token dev fijo + script `npm run gen:nfc-token` para generar UUID de prod que se pega manualmente en Firestore Console)
- [x] `firestore.rules` para `config/*`: read auth, no write cliente
- [x] `src/pages/Feed.tsx`: lee `?token` → valida contra `config/nfc.token` → si no auth redirige a `/login?returnTo=/feed?token=...` → si válido `createFeeding({ method: 'nfc' })` → pantalla confirmación 2s → redirect `/`
- [x] Si token inválido, mostrar error visible
- [x] **[Manual usuario]** Ejecutar `npm run gen:nfc-token`, pegar el UUID resultante en Firestore Console (happydog-prod) como `config/nfc.token`, y grabar pegatina NFC con app "NFC Tools" (Android) o "NFC TagWriter by NXP" (iPhone) con la URL `https://<app>.vercel.app/feed?token=<UUID>` que imprime el script
- [x] **Verificar:** escanear pegatina desde iPhone (Safari) y Android (Chrome) → abre la PWA, registra feeding, muestra confirmación

### F5 — PWA instalable · _2-3h_

- [ ] Configurar `vite-plugin-pwa` en `vite.config.ts`: `registerType: 'autoUpdate'`, manifest completo (`name: 'HappyDog'`, `short_name: 'HappyDog'`, `description: 'Registra cuándo comen los perros'`, theme_color, background_color, `display: 'standalone'`, `lang: 'es'`, `start_url: '/'`), workbox con `navigateFallback: '/index.html'`, runtimeCaching NetworkFirst para Firestore/FCM
- [ ] Generar iconos (192, 512, 512 maskable) — usar [maskable.app](https://maskable.app) a partir del logo
- [ ] `public/apple-touch-icon.png`
- [ ] `src/components/InstallPrompt.tsx`: escucha `beforeinstallprompt` (Android), detecta iOS y muestra guía visual "Compartir → Añadir a pantalla de inicio"
- [ ] `npm run build && npm run preview` + Lighthouse PWA audit
- [ ] **Verificar (móviles reales):** iPhone → añadir a pantalla de inicio → abrir icono → standalone funciona. Android → prompt aparece / instala desde menú. Offline → historial cacheado visible

### F6 — Push notifications cross-device (async, Cloud Functions v2) · _3-4h_

- [ ] `public/firebase-messaging-sw.js` con `onBackgroundMessage` mostrando notificación
- [ ] `src/lib/messaging.ts` con `requestPermission()`, `getFcmToken(vapidKey)`, `onMessageForeground(cb)`
- [ ] `src/hooks/useFcmToken.ts`: al montar tras login, si `Notification.permission === 'default'` mostrar CTA en `/settings`; al conceder → `getToken` → `arrayUnion` en `users/{uid}.fcmTokens`
- [ ] Foreground: `onMessage` muestra toast in-app
- [ ] `functions/src/send-push.ts` — worker independiente:
  ```ts
  export const sendPushOnFeeding = onDocumentCreated('feedings/{id}', async (event) => {
    const feeding = event.data?.data()
    // carga users excepto feederUid, recopila fcmTokens
    // getMessaging().sendEachForMulticast({ tokens, notification: {...} })
    // cleanup de tokens 'messaging/registration-token-not-registered' con arrayRemove
  })
  ```
- [ ] `functions/src/index.ts` — re-export: `export { sendPushOnFeeding } from './send-push'`
- [ ] Testear localmente contra emulador Functions: `docker compose up`, escribir un feeding vía Vite → ver log de la función ejecutándose en la UI del emulador (:4000)
- [ ] `cd functions && npm run build && firebase deploy --only functions`
- [ ] **Verificar (dos móviles reales):** Móvil A registra → confirmación <300ms independiente del push → Móvil B recibe push background y foreground en 1-3s. iOS solo con PWA instalada. La función se ejecuta aunque el cliente cierre la app inmediatamente después del `addDoc` (at-least-once).

---

## 🔮 Iteraciones futuras (F7–F11)

No abordar hasta que MVP (F0-F6) esté verificado en producción.

### F7 — Home mejorada con "comidas de hoy" (gauge segmentado) · _3-4h_

Depende de F8 estar hecho (necesita `config/schedule.meals` para saber cuántos segmentos pintar). Si se aborda antes que F8, hardcodear temporalmente `meals: 2` (desayuno + cena).

**Diseño visual** (inspirado en la referencia dada por el usuario):

Un **gauge circular grande** en la parte superior de la Home. Círculo completo dividido en **N segmentos** (N = `config/schedule.meals.length`, típicamente 2-3). Cada segmento representa una comida del día. Los segmentos correspondientes a comidas ya suministradas van coloreados (rojo/coral de la marca); los pendientes en gris oscuro / vacío.

En el centro del círculo, **un número muy grande** = comidas completadas hoy (`0`, `1`, `2`…). Debajo un label pequeño: `"de X hoy"` o `"comidas de hoy"`.

```
        ╭──────────────╮
       ╱ ▓▓▓▓▓  ░░░░░░  ╲       segmento 1 (desayuno)  ✓ cumplido → rojo
      │                  │      segmento 2 (cena)      ✗ pendiente → gris
      │       2          │
      │   comidas hoy    │
       ╲                ╱
        ╰──────────────╯
```

**Implementación:**

- [ ] `src/components/TodayGauge.tsx` — SVG puro (no chart lib) por control total y peso mínimo:
  - Prop `segments: Array<{mealId, label, completed: boolean, feedingId?: string}>`
  - Renderiza N arcos con `<path>` usando la fórmula de arco polar. Gap pequeño entre segmentos (~4°) para separación visual
  - Cada segmento con transición CSS al cambiar `completed` (fade-in del color)
  - Número grande en `<text>` centrado, `font-size` responsivo con `clamp()`
  - Accesibilidad: `role="img"` + `aria-label="2 de 3 comidas hoy: desayuno completado, comida completada, cena pendiente"`
- [ ] Hook `useTodayFeedings` — combina `useFeedings` filtrado por `dateLocal === today` con `config/schedule.meals`. Devuelve `{ segments, totalCompleted, totalMeals }`
  - Cada feeding se asigna al meal cuyo rango `[startHour, endHour]` contiene el `hourLocal` del feeding
  - Si hay más feedings que meals en un rango (ej: comieron 2 veces en el rango de desayuno) → el segmento queda "completed", los feedings extra se cuentan pero no repintan
  - Si un feeding cae fuera de todos los rangos (ej: 15h, snack no configurado) → cuenta en el número central pero no ocupa segmento
- [ ] Integrar `TodayGauge` en `pages/Home.tsx` arriba del listado
- [ ] Estado especial cuando `totalMeals === 0` (no hay schedule configurado): mostrar número simple sin gauge, más CTA "Configurar horarios" que lleva a `/settings/schedule`
- [ ] **Verificar:** con 0 feedings hoy → todos segmentos grises, número `0`. Con 1 feeding en rango desayuno → 1 segmento rojo, número `1`. Con 3 feedings (2 dentro de rango, 1 fuera) → 2 segmentos rojos, número `3`. Al escanear NFC ahora, gauge se actualiza en realtime vía onSnapshot

### F8 — Configuración de horarios de comida · _3-4h_
- [ ] `/settings/schedule` CRUD de `config/schedule.meals`
- [ ] Validación zod: no solapamiento, `endHour > startHour`
- [ ] Rules: cualquier user autenticado edita `config/schedule`

### F9 — Recordatorios de comida no dada · _3-4h_
- [ ] `functions/src/reminders-cron.ts` — `onSchedule('every 15 minutes', ...)` (Cloud Scheduler, 3 jobs gratis)
- [ ] Lógica: para cada `meal` en `config/schedule`, si hora actual > `meal.endHour` → intentar `create` de `mealReminders/{dateLocal}_{mealId}` en transacción (falla si existe → at-most-once); si create OK, comprobar si hay `feedings` en rango → si no, enviar push a familia
- [ ] Push específico por meal ("⚠️ Aún no les habéis dado la Cena")
- [ ] TTL policy en Firestore para purgar `mealReminders` >30 días automáticamente

### F10 — Rankings semanal/mensual/all-time (async, Cloud Function aparte) · _4-5h_
- [ ] `functions/src/update-leaderboards.ts` — `export const updateLeaderboards = onDocumentCreated('feedings/{id}', ...)` — **independiente** de `sendPushOnFeeding`, mismo trigger, ejecución paralela
- [ ] Increment atómico sobre `leaderboards/all-time/entries/{uid}`, `leaderboards/weekly-{YYYY-Www}/entries/{uid}`, `leaderboards/monthly-{YYYY-MM}/entries/{uid}` (con `feederName` y `photoURL` denormalizados)
- [ ] Página `/rankings` con tabs (semana / mes / total), cada tab con `onSnapshot(orderBy('count','desc').limit(10))`
- [ ] Script admin one-off `scripts/recompute-leaderboards.ts` para recomputar desde `feedings/` (idempotente, corre local contra prod o contra emulador con datos importados)

### F11 — Estadísticas visuales · _4-5h_
- [ ] Página `/stats` con: comidas por día (últimos 30, agrupando `dateLocal`), distribución horaria (agrupando `hourLocal`), comparativa con `config/schedule`
- [ ] Librería: `recharts` o `chart.js` + `react-chartjs-2`

---

## 🧪 Verificación end-to-end del MVP

- [ ] `npm run dev` — login Google, feeding manual, historial realtime
- [ ] `npm run build && npm run preview` — SW registrado, offline con historial cacheado
- [ ] **iPhone real:** Safari → añadir a pantalla → activar notificaciones → escanear NFC → registro + push cross-device
- [ ] **Android real:** mismo flujo + `beforeinstallprompt`
- [ ] Fallback manual con hora pasada válida (dentro de 24h)
- [ ] Escaneo sin login → redirige a login → tras login registra
- [ ] Rules: intentar crear feeding con `feederUid` ajeno → debe fallar

---

## 📎 Referencias

- Plan detallado (con razonamiento arquitectural completo): `C:\Users\Beatriz.Cubells\.claude\plans\quiero-hacer-una-aplicacion-golden-knuth.md`
- Flujo de trabajo entre sesiones: `CLAUDE.md`

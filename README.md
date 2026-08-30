# HappyDog

PWA familiar para coordinar la alimentación de los perros. Evita que nadie dé de comer dos veces por descoordinación. Un solo toque a la pegatina NFC (o un registro manual) lo apunta en tiempo real para toda la familia.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| PWA / Offline | `vite-plugin-pwa` (Workbox) + `persistentLocalCache` (IndexedDB) |
| Auth | Firebase Auth — Google Sign-In, sesión permanente |
| Base de datos | Cloud Firestore (Madrid, `europe-southwest1`) |
| Push | Firebase Cloud Messaging (FCM) |
| Workers async | Firebase Cloud Functions v2 |
| Hosting | Vercel Hobby (deploy automático desde `main`) |
| Dev local | Docker Compose + Firebase Emulator Suite |

---

## Arquitectura general

Vista de pájaro de todos los sistemas y cómo se conectan.

```mermaid
graph LR
    subgraph Client["Dispositivos (familia)"]
        NFC["🏷️ Tag NFC"]
        MOB_A["📱 Móvil A"]
        MOB_B["📱 Móvil B"]
    end

    subgraph Edge["Hosting"]
        VERCEL["Vercel\nbundle estático"]
    end

    subgraph Firebase["Firebase — europe-southwest1"]
        AUTH["Auth\nGoogle Sign-In"]
        FS[("Firestore\nfeedings · users · config")]
        FCM["FCM\nCloud Messaging"]
        CF["Cloud Functions v2\nsendPushOnFeeding"]
    end

    NFC -->|"URL /feed?token"| MOB_A
    VERCEL -->|"descarga PWA"| MOB_A
    VERCEL -->|"descarga PWA"| MOB_B

    MOB_A <-->|"auth"| AUTH
    MOB_B <-->|"auth"| AUTH

    MOB_A -->|"addDoc"| FS
    FS -->|"onSnapshot"| MOB_A
    FS -->|"onSnapshot"| MOB_B

    MOB_A -->|"FCM token"| FCM
    MOB_B -->|"FCM token"| FCM

    FS -->|"onDocumentCreated"| CF
    CF -->|"sendEachForMulticast"| FCM
    FCM -->|"push"| MOB_B

    style NFC fill:#f97316,color:#fff
    style CF fill:#4f46e5,color:#fff
    style FS fill:#0284c7,color:#fff
```

---

## Flujos de datos

### 1 — Autenticación

```mermaid
sequenceDiagram
    actor U as Usuario
    participant PWA as PWA (React)
    participant Auth as Firebase Auth
    participant FS as Firestore

    U->>PWA: Abre la app
    PWA->>Auth: onAuthStateChanged
    Auth-->>PWA: user desde localStorage (browserLocalPersistence)

    alt Sin sesión guardada
        PWA->>U: Redirige a /login
        U->>PWA: "Continuar con Google"
        PWA->>Auth: signInWithPopup(GoogleProvider)
        Auth->>U: Popup OAuth de Google
        U->>Auth: Aprueba
        Auth-->>PWA: UserCredential (idToken + perfil)
        PWA->>FS: setDoc users/{uid} — displayName, email, photoURL
    end

    Note over PWA,Auth: Sesión persiste entre recargas y cierres del navegador.<br/>No hay lógica de expiración ni botón "Recuérdame".
```

---

### 2 — Registro de comida (NFC y manual)

```mermaid
sequenceDiagram
    actor NFC as 🏷️ Tag NFC
    actor U as Usuario
    participant Browser as Navegador
    participant Feed as Feed.tsx
    participant FS as Firestore

    alt Flujo NFC
        NFC->>Browser: URL /feed?token=<UUID>
        Browser->>Feed: Navega a /feed?token=<UUID>
    else Flujo manual
        U->>Feed: Abre ManualFeedDialog, elige fecha/hora
    end

    alt No autenticado
        Feed->>Browser: Redirige /login?returnTo=/feed?token=...
        Browser->>Feed: Regresa tras login
    end

    Feed->>FS: getDoc config/nfc (solo en flujo NFC)
    FS-->>Feed: { token: "<UUID>" }

    alt Token inválido
        Feed->>U: Pantalla de error
    else Token válido / flujo manual (validado con zod)
        Feed->>FS: addDoc feedings/{id}
        Note over Feed,FS: < 300 ms — Firestore confirma y la UI ya responde.<br/>El resto ocurre en background de forma asíncrona.
        Feed->>U: Confirmación visual 2 s → redirect /
    end
```

---

### 3 — Notificaciones push (trigger asíncrono)

```mermaid
sequenceDiagram
    participant FS as Firestore
    participant CF as Cloud Function v2<br/>sendPushOnFeeding
    participant FCM as Firebase Cloud Messaging
    participant SW as Service Worker<br/>(Móvil B, background)
    participant PWA_B as PWA<br/>(Móvil B, foreground)

    FS->>CF: onDocumentCreated feedings/{id}

    CF->>FS: query feedings where timestamp > feeding.timestamp limit 1
    alt Existe un feeding más reciente
        CF->>CF: Salir — no notificar correcciones del historial
    else Es el feeding más reciente
        CF->>FS: getDocs users/
        Note over CF: Excluye feederUid (quien alimentó no se notifica a sí mismo).<br/>Recopila fcmTokens[] de los destinatarios restantes.
        CF->>FCM: sendEachForMulticast({ tokens[], webpush.notification })

        alt App en background o cerrada
            FCM->>SW: Push message
            SW->>SW: onBackgroundMessage → showNotification
        else App en primer plano
            FCM->>PWA_B: onMessage
            PWA_B->>PWA_B: Toast in-app
        end

        alt Hay tokens con error registration-token-not-registered
            CF->>FS: arrayRemove tokens muertos de users/{uid}.fcmTokens
        end
    end
```

---

### 4 — Tiempo real (onSnapshot)

```mermaid
sequenceDiagram
    participant PWA_A as PWA Móvil A
    participant FS as Firestore
    participant PWA_B as PWA Móvil B

    PWA_A->>FS: onSnapshot(feedings, orderBy timestamp desc)
    PWA_B->>FS: onSnapshot(feedings, orderBy timestamp desc)
    Note over PWA_A,PWA_B: Ambos dispositivos tienen un listener activo.

    PWA_A->>FS: addDoc feedings/{id}
    FS-->>PWA_A: Delta — doc nuevo (< 1 s)
    FS-->>PWA_B: Delta — doc nuevo (< 1 s)
    PWA_A->>PWA_A: setState → re-render FeedingCard
    PWA_B->>PWA_B: setState → re-render FeedingCard

    Note over PWA_A,PWA_B: Sin polling ni refresh manual.<br/>onSnapshot desuscribe automáticamente al desmontar el componente.
```

---

### 5 — Offline y caché

```mermaid
flowchart TD
    REQ["Petición de recurso\n(JS, CSS, HTML)"]
    FS_READ["Lectura de datos\nonSnapshot"]

    REQ --> WB{Workbox SW\n¿en Cache Storage?}
    WB -->|Hit| CACHE_HIT["Responde desde caché\ninstantáneo"]
    WB -->|Miss| NET["Petición a red"]
    NET -->|200 OK| CACHE_STORE["Guarda en caché\ny responde"]
    NET -->|Sin red| NAV_FALLBACK["Sirve /index.html\ncacheado — app carga igualmente"]

    FS_READ --> IDB{Firestore SDK\nIndexedDB\npersistentLocalCache}
    IDB -->|Con red| LIVE["Datos en tiempo real\ndesde Firestore"]
    IDB -->|Sin red| CACHED["Últimos datos de la sesión\ncacheados localmente\n— historial visible offline"]
```

---

## Triggers

| Trigger | Origen | Qué hace |
|---|---|---|
| `onDocumentCreated('feedings/{id}')` | Firestore — Cloud Functions v2 | Envía push a la familia excepto al feeder; purga tokens muertos |
| `onSnapshot('feedings')` | Firestore SDK — cliente | Actualiza `useFeedings` → re-render reactivo en Home / History |
| `onAuthStateChanged` | Firebase Auth SDK — cliente | Actualiza store Zustand `useAuth`; redirige a `/login` si no hay sesión |
| `onMessage` | FCM SDK — cliente (foreground) | Muestra toast in-app vía `useToast` |
| `onBackgroundMessage` | Service Worker FCM (background) | `showNotification(...)` del sistema operativo |
| `beforeinstallprompt` | Browser event (Android Chrome) | `useInstallPrompt` captura el evento; `InstallPrompt` lo presenta al usuario |

---

## Modelo de datos (Firestore)

```
users/{uid}
  displayName: string
  email: string
  photoURL: string
  fcmTokens: string[]     ← un token por dispositivo registrado
  createdAt: Timestamp

feedings/{autoId}
  timestamp: Timestamp    ← cuándo ocurrió la comida (puede ser pasado)
  dateLocal: string       ← "YYYY-MM-DD" (agrupa por día sin UTC hell)
  hourLocal: number       ← 0–23 (base para stats futuras por franja horaria)
  feederUid: string
  feederName: string
  method: "nfc" | "manual"
  createdAt: Timestamp    ← serverTimestamp(), cuándo se escribió el doc

config/nfc
  token: string           ← UUID del tag; el cliente valida que coincida

config/schedule           ← (futuro F8)
  meals: [{ id, label, startHour, endHour }]
  timezone: string
```

---

## Desarrollo local

```bash
# Levanta Firebase Emulator Suite (Auth + Firestore + Functions) en Docker
docker compose up -d
# Emulator UI: http://localhost:4000

# Semilla de datos de prueba
npm run seed

# Dev con hot-reload conectado a los emuladores
npm run dev          # http://localhost:5173
```

Los triggers de Cloud Functions se ejecutan en el emulador: escribir en Firestore dispara `sendPushOnFeeding` localmente, con el log visible en `:4000`. El push real via FCM requiere móvil físico contra Firebase real.

---

## Deploy

```bash
# Reglas Firestore
firebase deploy --only firestore:rules --project happydog-prod

# Cloud Functions
cd functions && npm run build
firebase deploy --only functions --project happydog-prod

# Frontend (Vercel auto-deploy desde main)
git push origin main
```

Producción: `https://happy-dog-alpha.vercel.app`

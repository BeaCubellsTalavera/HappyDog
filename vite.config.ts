import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // firebase-messaging-sw.js lo sirve el navegador aparte para FCM (F6);
      // Workbox no lo puede tocar ni incluir en el precache.
      injectRegister: 'auto',
      devOptions: { enabled: false },
      includeAssets: ['apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'HappyDog',
        short_name: 'HappyDog',
        description: 'Registra cuándo comen los perros',
        theme_color: '#ef4444',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'es',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // El SW de FCM se registra aparte; Workbox no lo debe reclamar ni cachear.
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // El SW de FCM (F6) se registra aparte con su propio scope; no debe entrar en el precache de Workbox.
        globIgnores: ['**/firebase-messaging-sw.js'],
        runtimeCaching: [
          // Firestore lo gestiona el SDK vía IndexedDB (persistentLocalCache);
          // no lo cachea Workbox porque son streams de long-polling / WebChannel.
          {
            urlPattern: /^https:\/\/fcmregistrations\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fcm-registrations',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fcm\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fcm-api',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});

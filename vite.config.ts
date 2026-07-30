import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Brain Training',
        short_name: 'BrainApp',
        description: 'Senior Brain Training App for care homes',
        theme_color: '#2A66B8',
        background_color: '#F4F5F7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [
          {
            // Photo scenes are precached today (one scene, ~212 KB) via the webp glob
            // above. Workbox precaching is all-or-nothing on install, so at eight or
            // nine scenes a care-home wifi stall would leave a partially installed
            // worker under registerType 'autoUpdate'. This rule is in place before that
            // happens: draw the precache line at two scenes and let the rest come
            // through here.
            urlPattern: /\/pp\/scenes\/.+\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pp-scenes',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/locales\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'locale-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});

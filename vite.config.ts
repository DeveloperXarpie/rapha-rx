import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' leaves a new worker waiting instead of swapping it in under a
      // running page. AppUpdater (src/components/AppUpdater.tsx) lets it in, and
      // reloads, only when nobody is mid-round.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Brain Training',
        short_name: 'BrainApp',
        description: 'Senior Brain Training App for care homes',
        theme_color: '#2A66B8',
        background_color: '#F4F5F7',
        display: 'standalone',
        // Authoritative on Android once installed to the home screen, which is the
        // intended care-home deployment. iPadOS ignores it, so RotateDevice is the
        // only defence there - see src/components/RotateDevice.tsx.
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Translations are precached rather than runtime-cached, so they are
        // revisioned with the build and a copy change ships with the code that
        // needs it. The old CacheFirst rule held them for a week past a deploy.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}', 'locales/**/*.json'],
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

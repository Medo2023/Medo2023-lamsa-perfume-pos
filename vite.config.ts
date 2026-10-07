import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const basePath = env.VITE_BASE_PATH || (mode === 'production' ? '/Medo2023-lamsa-perfume-pos/' : '/');
    return {
      base: basePath,
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true as const,
        hmr: false,
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'icon.svg'],
          manifest: {
            id: basePath,
            name: 'لمسة عطر | نظام إدارة ونقاط بيع العطور',
            short_name: 'لمسة عطر',
            description: 'نظام محاسبي وتشغيلي لإدارة متجر العطور، حساب التكاليف، وإدارة المخزون والتزامن السحابي الفوري 24/7',
            start_url: basePath,
            scope: basePath,
            display: 'standalone',
            orientation: 'any',
            dir: 'rtl',
            lang: 'ar',
            theme_color: '#1D1D1F',
            background_color: '#F5F5F7',
            categories: ['business', 'finance', 'shopping'],
            icons: [
              {
                src: `${basePath}pwa-192x192.png`,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: `${basePath}pwa-512x512.png`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: `${basePath}pwa-maskable-512x512.png`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          },
          workbox: {
            maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB to support full offline rich build
            globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp,svg,woff,woff2,webmanifest}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 15,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/l\.top4top\.io\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'app-remote-images-cache',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 30,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              }
            ]
          },
          devOptions: {
            enabled: true,
            type: 'module'
          }
        })
      ],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

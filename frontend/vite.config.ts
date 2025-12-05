import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // Optimizar React para producción
        babel: {
          plugins: isProduction ? [
            ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]
          ] : []
        }
      }),

      // PWA Plugin optimizado para SYSME
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'sysme-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60, // 5 minutos
                },
                networkTimeoutSeconds: 3,
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
                },
              },
            },
          ],
        },
        manifest: {
          name: 'SYSME - Sistema de Restaurante',
          short_name: 'SYSME POS',
          description: 'Sistema POS completo para restaurantes',
          theme_color: '#667eea',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),

      // Compresión GZIP y Brotli para producción
      ...(isProduction ? [
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
        }),
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
        }),
      ] : []),

      // Analizador de bundle (solo en build)
      ...(command === 'build' ? [
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
      ] : []),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/api': path.resolve(__dirname, './src/api'),
        '@/store': path.resolve(__dirname, './src/store'),
        '@/services': path.resolve(__dirname, './src/services'),
      },
    },

    server: {
      port: 23847, // Puerto seguro no estándar
      host: '127.0.0.1', // Solo localhost por seguridad
      strictPort: true, // Fallar si el puerto está ocupado
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:47851', // Backend en puerto seguro
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
        '/uploads': {
          target: 'http://127.0.0.1:47851',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      port: 23847, // Mismo puerto que development para consistencia
      host: '127.0.0.1', // Solo localhost por seguridad
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:47851',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://127.0.0.1:47851',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: isProduction ? false : true, // Solo en desarrollo
      minify: isProduction ? 'terser' : false,
      target: 'esnext',
      assetsDir: 'assets',

      // Configuración optimizada de Terser
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      } : {},

      rollupOptions: {
        output: {
          // Optimización avanzada de chunks
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('react-router')) {
                return 'router-vendor';
              }
              if (id.includes('@radix-ui') || id.includes('@headlessui')) {
                return 'ui-vendor';
              }
              if (id.includes('recharts') || id.includes('chart')) {
                return 'charts-vendor';
              }
              if (id.includes('axios') || id.includes('fetch')) {
                return 'http-vendor';
              }
              if (id.includes('date-fns') || id.includes('moment')) {
                return 'date-vendor';
              }
              return 'vendor';
            }

            // Feature chunks
            if (id.includes('/pages/pos/')) {
              return 'pos-pages';
            }
            if (id.includes('/pages/dashboard/')) {
              return 'dashboard-pages';
            }
            if (id.includes('/pages/reports/')) {
              return 'reports-pages';
            }
            if (id.includes('/components/charts/')) {
              return 'charts-components';
            }
          },

          // Nombres de archivos optimizados
          entryFileNames: (chunkInfo) => {
            return isProduction
              ? 'assets/[name]-[hash].js'
              : 'assets/[name].js';
          },
          chunkFileNames: (chunkInfo) => {
            return isProduction
              ? 'assets/[name]-[hash].js'
              : 'assets/[name].js';
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return isProduction
                ? 'assets/images/[name]-[hash][extname]'
                : 'assets/images/[name][extname]';
            }
            if (/css/i.test(ext)) {
              return isProduction
                ? 'assets/css/[name]-[hash][extname]'
                : 'assets/css/[name][extname]';
            }
            return isProduction
              ? 'assets/[name]-[hash][extname]'
              : 'assets/[name][extname]';
          },
        },

        // Optimización de dependencias externas
        external: (id) => {
          // Externalizar dependencias grandes si es necesario
          return false;
        },
      },

      // Límites optimizados
      chunkSizeWarningLimit: 800,
      assetsInlineLimit: 4096, // 4KB
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'date-fns',
        'clsx',
      ],
      exclude: [
        // Excluir dependencias que no necesitan pre-bundling
      ],
    },

    esbuild: {
      // Optimizaciones de ESBuild
      legalComments: 'none',
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
      treeShaking: true,
    },

    // Variables de entorno
    define: {
      __DEV__: !isProduction,
      __PROD__: isProduction,
      __VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.1'),
    },
  };
});
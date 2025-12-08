// SYSME PWA Service Worker v2.0
// Optimizado para restaurantes - Sistema POS completo

const CACHE_NAME = 'sysme-pwa-v2.0.1';
const SW_VERSION = '2.0.1';

// URLs esenciales para cache - optimizado para restaurante
const ESSENTIAL_CACHE_URLS = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// URLs de la API para cache offline
const API_CACHE_URLS = [
  '/api/health',
  '/api/products',
  '/api/categories',
  '/api/tables'
];

// URLs de páginas críticas para funcionamiento offline
const CRITICAL_PAGES = [
  '/login',
  '/dashboard',
  '/pos',
  '/mesas',
  '/cocina'
];

// Estrategias de cache por tipo de recurso
const CACHE_STRATEGIES = {
  // Cache first para recursos estáticos
  static: 'cache-first',
  // Network first para API calls
  api: 'network-first',
  // Stale while revalidate para páginas
  pages: 'stale-while-revalidate'
};

// Configuración de timeouts
const NETWORK_TIMEOUT = 3000; // 3 segundos max para red
const CACHE_TIMEOUT = 1000;   // 1 segundo max para cache

// === INSTALACIÓN DEL SERVICE WORKER ===
self.addEventListener('install', event => {
  console.log(`🔧 SW v${SW_VERSION}: Instalando...`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Precaching recursos esenciales...');
        return cache.addAll(ESSENTIAL_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ SW instalado correctamente');
        // Activar inmediatamente
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Error instalando SW:', error);
      })
  );
});

// === ACTIVACIÓN DEL SERVICE WORKER ===
self.addEventListener('activate', event => {
  console.log(`🚀 SW v${SW_VERSION}: Activando...`);

  event.waitUntil(
    // Limpiar caches antiguos
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log(`🧹 Eliminando cache antiguo: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ SW activado correctamente');
        // Tomar control inmediato de todas las páginas
        return self.clients.claim();
      })
      .catch(error => {
        console.error('❌ Error activando SW:', error);
      })
  );
});

// === MANEJO DE FETCH REQUESTS ===
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo interceptar requests GET
  if (request.method !== 'GET') {
    return;
  }

  // Determinar estrategia según el tipo de recurso
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first
    event.respondWith(handleApiRequest(request));
  } else if (isStaticResource(url.pathname)) {
    // Recursos estáticos - Cache first
    event.respondWith(handleStaticRequest(request));
  } else if (isPageRequest(url.pathname)) {
    // Páginas - Stale while revalidate
    event.respondWith(handlePageRequest(request));
  }
});

// === ESTRATEGIA NETWORK FIRST PARA API ===
async function handleApiRequest(request) {
  const url = request.url;

  try {
    // Intentar red primero con timeout
    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise(NETWORK_TIMEOUT, 'network-timeout')
    ]);

    if (networkResponse && networkResponse.status === 200) {
      // Guardar en cache si es exitoso
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log(`🌐 API cached: ${url}`);
      return networkResponse;
    }
  } catch (error) {
    console.log(`📡 Network failed for API: ${url}, trying cache...`);
  }

  // Si la red falla, intentar cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log(`💾 API from cache: ${url}`);
    return cachedResponse;
  }

  // Si no hay cache, retornar error offline
  return createOfflineResponse(request);
}

// === ESTRATEGIA CACHE FIRST PARA RECURSOS ESTÁTICOS ===
async function handleStaticRequest(request) {
  const url = request.url;

  try {
    // Intentar cache primero
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`⚡ Static from cache: ${url}`);
      return cachedResponse;
    }
  } catch (error) {
    console.log(`Cache miss for static: ${url}`);
  }

  try {
    // Si no está en cache, fetch de red
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log(`🌐 Static cached: ${url}`);
      return networkResponse;
    }
  } catch (error) {
    console.log(`Network failed for static: ${url}`);
  }

  return createOfflineResponse(request);
}

// === ESTRATEGIA STALE WHILE REVALIDATE PARA PÁGINAS ===
async function handlePageRequest(request) {
  const url = request.url;

  // Intentar cache primero
  const cachedResponse = await caches.match(request);

  // Fetch de red en paralelo para actualizar cache
  const networkFetch = fetch(request).then(response => {
    if (response && response.status === 200) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
      console.log(`🔄 Page updated in cache: ${url}`);
    }
    return response;
  }).catch(() => null);

  // Retornar cache si existe, sino esperar red
  if (cachedResponse) {
    console.log(`📄 Page from cache: ${url}`);
    return cachedResponse;
  }

  return networkFetch || createOfflineResponse(request);
}

// === UTILIDADES ===

function isStaticResource(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname) ||
         pathname.startsWith('/static/');
}

function isPageRequest(pathname) {
  return CRITICAL_PAGES.some(page => pathname.startsWith(page)) ||
         pathname === '/' ||
         !pathname.includes('.');
}

function timeoutPromise(ms, reason) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(reason)), ms);
  });
}

function createOfflineResponse(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    // Respuesta offline para API
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'No hay conexión a internet',
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } else {
    // Página offline para navegación
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>SYSME - Sin Conexión</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0; padding: 20px; text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            color: white;
          }
          .container { max-width: 400px; }
          .icon { font-size: 64px; margin-bottom: 20px; }
          h1 { margin: 0 0 10px 0; font-size: 24px; }
          p { margin: 0 0 30px 0; opacity: 0.9; line-height: 1.5; }
          .btn {
            background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);
            padding: 12px 24px; border-radius: 8px; text-decoration: none;
            display: inline-block; transition: all 0.3s ease;
          }
          .btn:hover { background: rgba(255,255,255,0.3); }
          .status { margin-top: 20px; font-size: 12px; opacity: 0.7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📡</div>
          <h1>Sin Conexión a Internet</h1>
          <p>SYSME está funcionando en modo offline. Algunas funciones pueden estar limitadas.</p>
          <a href="javascript:window.location.reload()" class="btn">🔄 Reintentar Conexión</a>
          <div class="status">Service Worker v${SW_VERSION} activo</div>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// === MANEJO DE MENSAJES ===
self.addEventListener('message', event => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      if (payload && payload.urls) {
        cacheUrls(payload.urls);
      }
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    case 'GET_SW_INFO':
      event.ports[0].postMessage({
        version: SW_VERSION,
        cacheName: CACHE_NAME,
        status: 'active'
      });
      break;

    default:
      console.log('SW: Mensaje no reconocido:', type);
  }
});

// Cache URLs adicionales
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls);
    console.log(`📦 Cached ${urls.length} additional URLs`);
  } catch (error) {
    console.error('Error caching URLs:', error);
  }
}

// Limpiar todos los caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🧹 All caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

// === NOTIFICACIONES PUSH (para futuro) ===
self.addEventListener('push', event => {
  console.log('📬 Push notification received:', event);

  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de SYSME',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'sysme-notification',
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Abrir SYSME' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SYSME POS', options)
  );
});

// === CLICK EN NOTIFICACIONES ===
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log(`🚀 SYSME Service Worker v${SW_VERSION} loaded`);
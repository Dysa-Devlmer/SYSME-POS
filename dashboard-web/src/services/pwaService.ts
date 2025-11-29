// SYSME PWA Service - Gestión de Service Worker y funcionalidades PWA
// Optimizado para restaurantes - Manejo offline y notificaciones

import React from 'react';

export interface PWAUpdateEvent {
  type: 'updateavailable' | 'updateinstalled' | 'offline' | 'online';
  data?: any;
}

export interface SWInfo {
  version: string;
  cacheName: string;
  status: string;
}

class PWAService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private isOnline = navigator.onLine;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Solo inicializar PWA en producción
    if (import.meta.env.PROD) {
      this.initializePWA();
      this.setupNetworkListeners();
      this.setupUpdateListeners();
    } else {
      console.log('⚠️ PWA desactivado en desarrollo');
    }
  }

  // === INICIALIZACIÓN PWA ===
  private async initializePWA() {
    try {
      console.log('🚀 Inicializando PWA SYSME...');

      // Registrar Service Worker
      await this.registerServiceWorker();

      // Configurar notificaciones
      await this.requestNotificationPermission();

      // Verificar si ya está instalado como PWA
      this.checkInstallPrompt();

      console.log('✅ PWA inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando PWA:', error);
    }
  }

  // === REGISTRO DE SERVICE WORKER ===
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ Service Worker no soportado');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      this.swRegistration = registration;
      console.log('📦 Service Worker registrado:', registration.scope);

      // Configurar event listeners del SW
      this.setupServiceWorkerListeners(registration);

      // Verificar actualizaciones inmediatamente
      registration.update();

    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
    }
  }

  // === CONFIGURACIÓN DE LISTENERS DEL SW ===
  private setupServiceWorkerListeners(registration: ServiceWorkerRegistration) {
    // SW instalando
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('🔄 Nueva versión del SW encontrada');

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Hay una nueva versión disponible
              this.updateAvailable = true;
              this.emit('updateavailable', { newWorker });
              console.log('🆕 Actualización disponible');
            } else {
              // Primera instalación
              this.emit('updateinstalled', { newWorker });
              console.log('✅ SW instalado por primera vez');
            }
          }
        });
      }
    });

    // Mensajes del SW
    navigator.serviceWorker.addEventListener('message', event => {
      console.log('📨 Mensaje del SW:', event.data);
    });
  }

  // === GESTIÓN DE ACTUALIZACIONES ===
  public async updateServiceWorker(): Promise<void> {
    if (!this.swRegistration || !this.updateAvailable) {
      console.log('⚠️ No hay actualizaciones disponibles');
      return;
    }

    try {
      const waitingWorker = this.swRegistration.waiting;
      if (waitingWorker) {
        // Enviar mensaje para skip waiting
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });

        // Recargar página cuando el nuevo SW tome control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 Recargando aplicación con nueva versión...');
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('❌ Error actualizando SW:', error);
    }
  }

  // === GESTIÓN OFFLINE/ONLINE ===
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada');
      this.isOnline = true;
      this.emit('online');
      this.showNetworkStatus('Conexión restaurada', 'success');
    });

    window.addEventListener('offline', () => {
      console.log('📡 Sin conexión - Modo offline');
      this.isOnline = false;
      this.emit('offline');
      this.showNetworkStatus('Modo offline activado', 'warning');
    });
  }

  private setupUpdateListeners() {
    // Verificar actualizaciones periódicamente
    setInterval(() => {
      if (this.swRegistration) {
        this.swRegistration.update();
      }
    }, 60000); // Cada minuto
  }

  // === NOTIFICACIONES PWA ===
  private async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('⚠️ Notificaciones no soportadas');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log(`🔔 Permisos de notificación: ${permission}`);
    return permission === 'granted';
  }

  public async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.swRegistration) {
      console.log('⚠️ SW no disponible para notificaciones');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'sysme-notification',
      requireInteraction: false,
      ...options
    };

    try {
      await this.swRegistration.showNotification(title, defaultOptions);
      console.log(`🔔 Notificación enviada: ${title}`);
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
    }
  }

  // === GESTIÓN DE CACHÉ ===
  public async cacheResources(urls: string[]): Promise<void> {
    if (!this.swRegistration || !this.swRegistration.active) {
      console.log('⚠️ SW no activo para cache');
      return;
    }

    try {
      this.swRegistration.active.postMessage({
        type: 'CACHE_URLS',
        payload: { urls }
      });
      console.log(`📦 Cached ${urls.length} recursos adicionales`);
    } catch (error) {
      console.error('❌ Error cacheando recursos:', error);
    }
  }

  public async clearCache(): Promise<void> {
    if (!this.swRegistration || !this.swRegistration.active) {
      console.log('⚠️ SW no activo para limpiar cache');
      return;
    }

    try {
      this.swRegistration.active.postMessage({ type: 'CLEAR_CACHE' });
      console.log('🧹 Cache limpiado');
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
    }
  }

  // === INFORMACIÓN DEL SW ===
  public async getServiceWorkerInfo(): Promise<SWInfo | null> {
    if (!this.swRegistration || !this.swRegistration.active) {
      return null;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.swRegistration!.active!.postMessage(
        { type: 'GET_SW_INFO' },
        [channel.port2]
      );

      // Timeout después de 5 segundos
      setTimeout(() => resolve(null), 5000);
    });
  }

  // === INSTALACIÓN PWA ===
  private deferredPrompt: any = null;

  private checkInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('💾 PWA instalable detectado');
      e.preventDefault();
      this.deferredPrompt = e;
      this.emit('installprompt', { prompt: e });
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA instalado');
      this.deferredPrompt = null;
      this.emit('appinstalled');
    });
  }

  public async installPWA(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('⚠️ PWA no disponible para instalación');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log(`📱 Resultado instalación PWA: ${outcome}`);
      this.deferredPrompt = null;

      return outcome === 'accepted';
    } catch (error) {
      console.error('❌ Error instalando PWA:', error);
      return false;
    }
  }

  // === UTILIDADES ===
  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  public isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  public isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  private showNetworkStatus(message: string, type: 'success' | 'warning' | 'error') {
    // Crear notificación visual del estado de red
    const notification = document.createElement('div');
    notification.className = `pwa-notification pwa-${type}`;
    notification.innerHTML = `
      <div class="pwa-notification-content">
        <span class="pwa-icon">${type === 'success' ? '✅' : '⚠️'}</span>
        <span class="pwa-message">${message}</span>
      </div>
    `;

    // Agregar estilos si no existen
    if (!document.getElementById('pwa-styles')) {
      const styles = document.createElement('style');
      styles.id = 'pwa-styles';
      styles.textContent = `
        .pwa-notification {
          position: fixed; top: 20px; right: 20px; z-index: 10000;
          background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 12px 16px; min-width: 280px; animation: slideIn 0.3s ease;
        }
        .pwa-success { border-left: 4px solid #10b981; }
        .pwa-warning { border-left: 4px solid #f59e0b; }
        .pwa-error { border-left: 4px solid #ef4444; }
        .pwa-notification-content { display: flex; align-items: center; gap: 8px; }
        .pwa-icon { font-size: 16px; }
        .pwa-message { font-size: 14px; color: #374151; font-weight: 500; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // === SISTEMA DE EVENTOS ===
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

// Instancia singleton
export const pwaService = new PWAService();

// Hook para React
export function usePWA() {
  const [isOnline, setIsOnline] = React.useState(pwaService.isOnlineStatus());
  const [updateAvailable, setUpdateAvailable] = React.useState(pwaService.isUpdateAvailable());
  const [isPWAInstalled, setIsPWAInstalled] = React.useState(pwaService.isPWAInstalled());
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    const handleInstallPrompt = (data: any) => setInstallPrompt(data.prompt);
    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setInstallPrompt(null);
    };

    pwaService.on('online', handleOnline);
    pwaService.on('offline', handleOffline);
    pwaService.on('updateavailable', handleUpdateAvailable);
    pwaService.on('installprompt', handleInstallPrompt);
    pwaService.on('appinstalled', handleAppInstalled);

    return () => {
      pwaService.off('online', handleOnline);
      pwaService.off('offline', handleOffline);
      pwaService.off('updateavailable', handleUpdateAvailable);
      pwaService.off('installprompt', handleInstallPrompt);
      pwaService.off('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isOnline,
    updateAvailable,
    isPWAInstalled,
    installPrompt,
    updateApp: () => pwaService.updateServiceWorker(),
    installApp: () => pwaService.installPWA(),
    showNotification: (title: string, options?: NotificationOptions) =>
      pwaService.showNotification(title, options),
    cacheResources: (urls: string[]) => pwaService.cacheResources(urls),
    clearCache: () => pwaService.clearCache(),
    getSwInfo: () => pwaService.getServiceWorkerInfo()
  };
}

export default pwaService;
import React from 'react';
import { usePWA } from '@/services/pwaService';

const PWAStatus: React.FC = () => {
  const {
    isOnline,
    updateAvailable,
    isPWAInstalled,
    installPrompt,
    updateApp,
    installApp,
    getSwInfo
  } = usePWA();

  const [swInfo, setSwInfo] = React.useState<any>(null);

  React.useEffect(() => {
    getSwInfo().then(setSwInfo);
  }, [getSwInfo]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* Estado de conexión */}
      <div className={`
        px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg
        ${isOnline
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
        }
      `}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        {isOnline ? 'En línea' : 'Sin conexión'}
      </div>

      {/* Actualización disponible */}
      {updateAvailable && (
        <div className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>🔄 Actualización disponible</span>
            <button
              onClick={updateApp}
              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
      )}

      {/* Instalación PWA */}
      {installPrompt && !isPWAInstalled && (
        <div className="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>📱 Instalar como App</span>
            <button
              onClick={installApp}
              className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
            >
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* Información del SW (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && swInfo && (
        <div className="bg-gray-100 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-xs">
          <div>SW v{swInfo.version}</div>
          <div>Cache: {swInfo.cacheName}</div>
          <div>Estado: {swInfo.status}</div>
          {isPWAInstalled && <div>📱 PWA Instalado</div>}
        </div>
      )}
    </div>
  );
};

export default PWAStatus;
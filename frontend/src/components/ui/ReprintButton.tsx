/**
 * ReprintButton Component
 * Botón para reimprimir el último ticket (F4)
 * Compatible con el sistema legacy SYSME TPV v5.04
 */

import React from 'react';
import { useReprintShortcut } from '../../hooks/useReprintShortcut';
import { formatCurrency, formatDate } from '../../config/chile-config';

interface ReprintButtonProps {
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  showLastSaleInfo?: boolean;
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export const ReprintButton: React.FC<ReprintButtonProps> = ({
  onSuccess,
  onError,
  showLastSaleInfo = false,
  variant = 'default',
  className = ''
}) => {
  const {
    isReprinting,
    lastSale,
    error,
    reprint
  } = useReprintShortcut({
    enabled: true,
    onSuccess: (result) => {
      // Mostrar notificación de éxito
      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification('Ticket Reimpreso', {
          body: `Venta ${result.sale.sale_number} - ${formatCurrency(result.sale.total)}`,
          icon: '/icons/print.png'
        });
      }
      onSuccess?.(result);
    },
    onError
  });

  // Variante solo icono
  if (variant === 'icon-only') {
    return (
      <button
        onClick={reprint}
        disabled={isReprinting || !lastSale}
        className={`
          p-3 rounded-lg transition-all
          ${isReprinting
            ? 'bg-gray-300 cursor-wait'
            : lastSale
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
          ${className}
        `}
        title="Reimprimir último ticket (F4)"
      >
        {isReprinting ? (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        )}
      </button>
    );
  }

  // Variante compacta
  if (variant === 'compact') {
    return (
      <button
        onClick={reprint}
        disabled={isReprinting || !lastSale}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all
          ${isReprinting
            ? 'bg-gray-300 cursor-wait'
            : lastSale
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
          ${className}
        `}
        title="Reimprimir último ticket (F4)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        <span>F4</span>
      </button>
    );
  }

  // Variante default - completa
  return (
    <div className={`flex flex-col ${className}`}>
      <button
        onClick={reprint}
        disabled={isReprinting || !lastSale}
        className={`
          flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all
          ${isReprinting
            ? 'bg-gray-300 cursor-wait'
            : lastSale
              ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isReprinting ? (
          <>
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Reimprimiendo...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Reimprimir Último Ticket</span>
            <kbd className="px-2 py-1 bg-purple-400 rounded text-sm font-mono">F4</kbd>
          </>
        )}
      </button>

      {/* Info de última venta */}
      {showLastSaleInfo && lastSale && (
        <div className="mt-3 p-3 bg-gray-100 rounded-lg text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Última venta:</span>
            <span className="font-bold text-gray-800">{lastSale.sale_number}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-600">Total:</span>
            <span className="font-bold text-green-600">{formatCurrency(lastSale.total)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-600">Fecha:</span>
            <span className="text-gray-800">{formatDate(lastSale.created_at, true)}</span>
          </div>
          {lastSale.reprint_count && lastSale.reprint_count > 0 && (
            <div className="mt-2 text-xs text-orange-600">
              ⚠️ Reimpreso {lastSale.reprint_count} vez{lastSale.reprint_count > 1 ? 'es' : ''}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * ReprintLastSaleCard - Tarjeta con información de última venta y botón de reimprimir
 */
interface ReprintLastSaleCardProps {
  onReprint?: () => void;
  className?: string;
}

export const ReprintLastSaleCard: React.FC<ReprintLastSaleCardProps> = ({
  onReprint,
  className = ''
}) => {
  const { lastSale, isReprinting, reprint, error } = useReprintShortcut({
    enabled: true,
    onSuccess: onReprint
  });

  if (!lastSale) {
    return (
      <div className={`p-4 bg-gray-100 rounded-xl text-center text-gray-500 ${className}`}>
        No hay ventas recientes
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-xl shadow-md border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Última Venta</h3>
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
          {lastSale.status === 'completed' ? 'Completada' : lastSale.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Número:</span>
          <span className="font-mono font-bold">{lastSale.sale_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Mesa:</span>
          <span>{lastSale.table_number || 'Sin mesa'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Items:</span>
          <span>{lastSale.items?.length || 0} productos</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="text-gray-600 font-medium">Total:</span>
          <span className="font-bold text-green-600">{formatCurrency(lastSale.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Fecha:</span>
          <span className="text-gray-600">{formatDate(lastSale.created_at, true)}</span>
        </div>
      </div>

      {/* Botón de reimprimir */}
      <button
        onClick={reprint}
        disabled={isReprinting}
        className={`
          w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all
          ${isReprinting
            ? 'bg-gray-300 cursor-wait'
            : 'bg-purple-500 hover:bg-purple-600 text-white'
          }
        `}
      >
        {isReprinting ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Reimprimiendo...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Reimprimir Ticket</span>
            <kbd className="px-2 py-0.5 bg-purple-400 rounded text-xs font-mono">F4</kbd>
          </>
        )}
      </button>

      {/* Contador de reimpresiones */}
      {lastSale.reprint_count && lastSale.reprint_count > 0 && (
        <div className="mt-2 text-center text-xs text-orange-500">
          Reimpreso {lastSale.reprint_count} vez{lastSale.reprint_count > 1 ? 'es' : ''}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-xs">
          {error}
        </div>
      )}
    </div>
  );
};

export default ReprintButton;

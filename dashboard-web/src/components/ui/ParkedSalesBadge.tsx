/**
 * ParkedSalesBadge Component
 * Badge que muestra el número de ventas pendientes/parqueadas
 * Similar al badge del sistema legacy SYSME TPV v5.04
 */

import React from 'react';
import { useParkedSalesCount } from '../../hooks/useParkedSalesCount';
import { formatCurrency } from '../../config/chile-config';

interface ParkedSalesBadgeProps {
  onClick?: () => void;
  showAmount?: boolean;
  variant?: 'default' | 'compact' | 'expanded';
  className?: string;
}

export const ParkedSalesBadge: React.FC<ParkedSalesBadgeProps> = ({
  onClick,
  showAmount = false,
  variant = 'default',
  className = ''
}) => {
  const { count, totalAmount, isLoading } = useParkedSalesCount();

  // No mostrar si no hay ventas pendientes
  if (count === 0 && variant !== 'expanded') {
    return null;
  }

  // Variante compacta - solo el número
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={`relative inline-flex items-center justify-center ${className}`}
        title={`${count} venta${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}`}
      >
        <span className="sr-only">Ventas pendientes</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    );
  }

  // Variante expandida - con más información
  if (variant === 'expanded') {
    return (
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-xl transition-all
          ${count > 0
            ? 'bg-orange-100 hover:bg-orange-200 border-2 border-orange-400'
            : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
          }
          ${className}
        `}
      >
        {/* Icono de pausa */}
        <div className={`
          relative p-2 rounded-full
          ${count > 0 ? 'bg-orange-500 text-white' : 'bg-gray-400 text-white'}
        `}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {/* Badge contador */}
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>

        {/* Texto */}
        <div className="flex flex-col items-start">
          <span className={`font-bold text-lg ${count > 0 ? 'text-orange-700' : 'text-gray-600'}`}>
            {isLoading ? '...' : count} Pendiente{count !== 1 ? 's' : ''}
          </span>
          {showAmount && count > 0 && (
            <span className="text-sm text-orange-600">
              Total: {formatCurrency(totalAmount)}
            </span>
          )}
        </div>

        {/* Indicador visual */}
        {count > 0 && (
          <div className="ml-auto">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </button>
    );
  }

  // Variante default - botón con badge
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
        ${count > 0
          ? 'bg-orange-500 hover:bg-orange-600 text-white'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }
        ${className}
      `}
      title={`Ver ${count} venta${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}`}
    >
      {/* Icono pausa */}
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Texto */}
      <span>Pendientes</span>

      {/* Badge con número */}
      {count > 0 && (
        <span className="ml-1 flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-white text-orange-600 text-sm font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}

      {/* Animación de pulso para llamar atención */}
      {count > 0 && (
        <span className="absolute top-0 right-0 -mr-1 -mt-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </button>
  );
};

/**
 * ParkedSalesCounter - Versión simple solo número
 */
interface ParkedSalesCounterProps {
  className?: string;
}

export const ParkedSalesCounter: React.FC<ParkedSalesCounterProps> = ({ className = '' }) => {
  const { count } = useParkedSalesCount();

  if (count === 0) return null;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[1.25rem] h-5 px-1.5
        text-xs font-bold text-white
        bg-red-500 rounded-full
        ${className}
      `}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

/**
 * ParkedSalesNotification - Notificación flotante
 */
interface ParkedSalesNotificationProps {
  onClick?: () => void;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export const ParkedSalesNotification: React.FC<ParkedSalesNotificationProps> = ({
  onClick,
  position = 'bottom-right'
}) => {
  const { count, totalAmount, parkedSales } = useParkedSalesCount();

  if (count === 0) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // Obtener la venta más antigua
  const oldestSale = parkedSales.length > 0
    ? parkedSales.reduce((oldest, sale) =>
        new Date(sale.parked_at) < new Date(oldest.parked_at) ? sale : oldest
      )
    : null;

  const oldestTime = oldestSale
    ? Math.floor((Date.now() - new Date(oldestSale.parked_at).getTime()) / 60000)
    : 0;

  return (
    <div
      className={`
        fixed ${positionClasses[position]} z-50
        animate-bounce-slow
      `}
    >
      <button
        onClick={onClick}
        className="
          flex items-center gap-3 px-4 py-3
          bg-orange-500 hover:bg-orange-600
          text-white rounded-xl shadow-lg
          transition-all transform hover:scale-105
        "
      >
        {/* Icono animado */}
        <div className="relative">
          <svg
            className="w-8 h-8 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold">
            {count}
          </span>
        </div>

        {/* Info */}
        <div className="flex flex-col items-start">
          <span className="font-bold">
            {count} Venta{count !== 1 ? 's' : ''} Pendiente{count !== 1 ? 's' : ''}
          </span>
          <span className="text-sm text-orange-100">
            {formatCurrency(totalAmount)} total
          </span>
          {oldestTime > 5 && (
            <span className="text-xs text-orange-200">
              ⚠️ Más antigua: {oldestTime} min
            </span>
          )}
        </div>

        {/* Flecha */}
        <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

export default ParkedSalesBadge;

/**
 * Cash Session Status Component
 * Muestra el estado actual de la sesión de caja en el POS
 */

import React from 'react';
import { DollarSign, Lock, AlertCircle } from 'lucide-react';
import { CashSession } from '../../api/cashService';

interface CashSessionStatusProps {
  session: CashSession | null;
  onOpenSession: () => void;
  onCloseSession: () => void;
}

export const CashSessionStatus: React.FC<CashSessionStatusProps> = ({
  session,
  onOpenSession,
  onCloseSession
}) => {
  if (!session) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Caja Cerrada</h3>
            <p className="text-sm text-red-700 mt-1">
              Debe abrir una sesión de caja antes de procesar ventas
            </p>
          </div>
          <button
            onClick={onOpenSession}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Abrir Caja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-green-900">Caja Abierta</h3>
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">
              ACTIVA
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
            <div>
              <p className="text-gray-600 text-xs">Sesión</p>
              <p className="font-semibold text-gray-900">{session.session_number}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Ventas</p>
              <p className="font-semibold text-gray-900">{session.sales_count}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Total Ventas</p>
              <p className="font-semibold text-gray-900">
                {parseFloat(session.total_sales.toString()).toLocaleString('es-CL', {
                  style: 'currency',
                  currency: 'CLP',
                  minimumFractionDigits: 0
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Efectivo</p>
              <p className="font-semibold text-gray-900">
                {parseFloat(session.total_cash.toString()).toLocaleString('es-CL', {
                  style: 'currency',
                  currency: 'CLP',
                  minimumFractionDigits: 0
                })}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onCloseSession}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Cerrar Caja
        </button>
      </div>
    </div>
  );
};

export default CashSessionStatus;

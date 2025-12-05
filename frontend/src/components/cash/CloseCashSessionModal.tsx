/**
 * Close Cash Session Modal
 * Modal para cierre de caja con arqueo (cash count)
 */

import React, { useState } from 'react';
import { X, DollarSign, AlertCircle, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { cashService, CashSession } from '../../api/cashService';

interface CloseCashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  session: CashSession;
}

export const CloseCashSessionModal: React.FC<CloseCashSessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  session
}) => {
  const [closingBalance, setClosingBalance] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular saldo esperado
  const expectedBalance =
    parseFloat(session.opening_balance.toString()) +
    parseFloat(session.total_cash.toString()) +
    parseFloat(session.total_in.toString()) -
    parseFloat(session.total_out.toString());

  // Calcular diferencia
  const actualBalance = parseFloat(closingBalance || '0');
  const difference = actualBalance - expectedBalance;

  const handleCloseSession = async () => {
    try {
      setError(null);
      setLoading(true);

      if (!closingBalance || closingBalance === '') {
        setError('Debe ingresar el saldo de cierre');
        return;
      }

      const balance = parseFloat(closingBalance);
      if (isNaN(balance) || balance < 0) {
        setError('El saldo de cierre debe ser un número válido mayor o igual a 0');
        return;
      }

      await cashService.closeSession(balance, notes);

      // Reset form
      setClosingBalance('');
      setNotes('');

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error closing cash session:', err);
      setError(err.response?.data?.message || 'Error al cerrar la sesión de caja');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cerrar Caja - Arqueo</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Resumen de la sesión */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Resumen de la Sesión
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Sesión</p>
                <p className="font-semibold text-gray-900">{session.session_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Ventas realizadas</p>
                <p className="font-semibold text-gray-900">{session.sales_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Saldo inicial</p>
                <p className="font-semibold text-gray-900">
                  {parseFloat(session.opening_balance.toString()).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total ventas</p>
                <p className="font-semibold text-gray-900">
                  {parseFloat(session.total_sales.toString()).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Desglose por método de pago */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Desglose por Método de Pago</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">💵 Efectivo</span>
                <span className="font-semibold">
                  {parseFloat(session.total_cash.toString()).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">💳 Tarjeta</span>
                <span className="font-semibold">
                  {parseFloat(session.total_card.toString()).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🔄 Otros</span>
                <span className="font-semibold">
                  {parseFloat(session.total_other.toString()).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Movimientos de efectivo */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Movimientos de Efectivo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-green-600">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Ingresos adicionales
                </span>
                <span className="font-semibold">
                  +{parseFloat(session.total_in.toString()).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-red-600">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  Egresos
                </span>
                <span className="font-semibold">
                  -{parseFloat(session.total_out.toString()).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Saldo esperado */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Saldo Esperado en Caja</h3>
            <p className="text-2xl font-bold text-gray-900">
              {expectedBalance.toLocaleString('es-CL', {
                style: 'currency',
                currency: 'CLP'
              })}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Inicial + Efectivo ventas + Ingresos - Egresos
            </p>
          </div>

          {/* Saldo de cierre (arqueo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Saldo de Cierre - Arqueo (CLP) *
            </label>
            <input
              type="number"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="Contar el dinero físico en la caja"
              min="0"
              step="1000"
              autoFocus
            />
            {closingBalance && (
              <p className="mt-1 text-sm text-gray-500">
                {actualBalance.toLocaleString('es-CL', {
                  style: 'currency',
                  currency: 'CLP'
                })}
              </p>
            )}
          </div>

          {/* Diferencia */}
          {closingBalance && (
            <div className={`rounded-lg p-4 border-2 ${
              Math.abs(difference) < 100
                ? 'bg-green-50 border-green-200'
                : difference > 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="font-semibold text-gray-900 mb-2">Diferencia</h3>
              <p className={`text-3xl font-bold ${
                Math.abs(difference) < 100
                  ? 'text-green-600'
                  : difference > 0
                    ? 'text-blue-600'
                    : 'text-red-600'
              }`}>
                {difference >= 0 ? '+' : ''}{difference.toLocaleString('es-CL', {
                  style: 'currency',
                  currency: 'CLP'
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {Math.abs(difference) < 100
                  ? '✓ Caja cuadrada'
                  : difference > 0
                    ? 'Sobrante de caja'
                    : 'Faltante de caja'}
              </p>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas de Cierre (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Observaciones sobre el cierre, explicación de diferencias, etc."
            />
          </div>

          {/* Advertencia sobre diferencias grandes */}
          {closingBalance && Math.abs(difference) > 5000 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>⚠️ Atención:</strong> Hay una diferencia significativa.
                Por favor, verifica el conteo y considera agregar una nota explicativa.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCloseSession}
            disabled={loading || !closingBalance}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:bg-gray-400"
          >
            {loading ? 'Cerrando...' : 'Cerrar Caja'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseCashSessionModal;

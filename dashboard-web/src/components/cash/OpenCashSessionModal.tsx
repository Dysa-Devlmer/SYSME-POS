/**
 * Open Cash Session Modal
 * Modal for opening a new cash session (apertura de caja)
 */

import React, { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';
import { cashService } from '../../api/cashService';

interface OpenCashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OpenCashSessionModal: React.FC<OpenCashSessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenSession = async () => {
    try {
      setError(null);
      setLoading(true);

      const balance = parseFloat(openingBalance);
      if (isNaN(balance) || balance < 0) {
        setError('El saldo inicial debe ser un número válido mayor o igual a 0');
        return;
      }

      await cashService.openSession(balance, notes);

      // Reset form
      setOpeningBalance('0');
      setNotes('');

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error opening cash session:', err);
      setError(err.response?.data?.message || 'Error al abrir la sesión de caja');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [0, 50000, 100000, 200000, 500000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Abrir Caja</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Opening Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Saldo Inicial (CLP)
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              min="0"
              step="1000"
            />
            <p className="mt-1 text-sm text-gray-500">
              {parseFloat(openingBalance || '0').toLocaleString('es-CL', {
                style: 'currency',
                currency: 'CLP'
              })}
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montos Rápidos
            </label>
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setOpeningBalance(amount.toString())}
                  className="px-2 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ${(amount / 1000)}k
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Observaciones sobre la apertura..."
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> El saldo inicial debe coincidir con el dinero físico en la caja.
              Este valor será verificado al cierre de caja.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleOpenSession}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenCashSessionModal;

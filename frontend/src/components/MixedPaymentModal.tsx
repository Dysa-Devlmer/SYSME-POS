/**
 * MixedPaymentModal - Modal para pagos mixtos (múltiples métodos de pago)
 * Permite al usuario dividir el pago entre efectivo, tarjeta, transferencia, etc.
 */

import React, { useState, useEffect } from 'react';
import { PaymentDetail, PaymentDetails } from '@/api/salesService';

interface MixedPaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (paymentDetails: PaymentDetails) => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Efectivo', icon: '💵' },
  { value: 'card', label: '💳 Tarjeta', icon: '💳' },
  { value: 'transfer', label: '🏦 Transferencia', icon: '🏦' },
  { value: 'check', label: '📝 Cheque', icon: '📝' },
  { value: 'other', label: '🔄 Otro', icon: '🔄' }
] as const;

const MixedPaymentModal: React.FC<MixedPaymentModalProps> = ({
  isOpen,
  total,
  onClose,
  onConfirm
}) => {
  const [payments, setPayments] = useState<PaymentDetail[]>([
    { method: 'cash', amount: 0 }
  ]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;

  const addPaymentMethod = () => {
    setPayments([...payments, { method: 'card', amount: remaining > 0 ? remaining : 0 }]);
  };

  const removePaymentMethod = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (index: number, field: keyof PaymentDetail, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleConfirm = () => {
    if (totalPaid < total) {
      alert(`⚠️ Pago insuficiente. Falta: $${remaining.toLocaleString()}`);
      return;
    }

    const paymentDetails: PaymentDetails = {
      payments,
      change,
      total_paid: totalPaid
    };

    onConfirm(paymentDetails);
  };

  const fillRemaining = (index: number) => {
    const updated = [...payments];
    updated[index].amount = remaining + updated[index].amount;
    setPayments(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold">💳💵 Pago Mixto</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✖️
          </button>
        </div>

        {/* Total Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-semibold">Total a Pagar:</span>
            <span className="text-2xl font-bold text-blue-700">
              ${total.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Total Pagado:</span>
            <span className={`font-bold ${totalPaid >= total ? 'text-green-600' : 'text-orange-600'}`}>
              ${totalPaid.toLocaleString()}
            </span>
          </div>
          {remaining > 0 ? (
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Falta:</span>
              <span className="font-bold text-red-600">
                ${remaining.toLocaleString()}
              </span>
            </div>
          ) : change > 0 ? (
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Cambio:</span>
              <span className="font-bold text-green-600">
                ${change.toLocaleString()}
              </span>
            </div>
          ) : null}
        </div>

        {/* Payment Methods */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Métodos de Pago</h3>
            <button
              onClick={addPaymentMethod}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex items-center space-x-1"
            >
              <span>➕</span>
              <span>Agregar Método</span>
            </button>
          </div>

          {payments.map((payment, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                {/* Method Selector */}
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Método {index + 1}</label>
                  <select
                    value={payment.method}
                    onChange={(e) => updatePayment(index, 'method', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Input */}
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Monto</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                    {remaining > 0 && (
                      <button
                        onClick={() => fillRemaining(index)}
                        className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                        title="Llenar con el monto restante"
                      >
                        Resto
                      </button>
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                {payments.length > 1 && (
                  <button
                    onClick={() => removePaymentMethod(index)}
                    className="mt-5 p-2 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Eliminar método"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Amount Buttons */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Montos rápidos (para primer método):</p>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 2000, 5000, 10000, 20000, 50000, 100000, total].map(amount => (
              <button
                key={amount}
                onClick={() => updatePayment(0, 'amount', amount)}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                ${amount === total ? 'Exacto' : amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={totalPaid < total}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            {totalPaid < total ? `Falta $${remaining.toLocaleString()}` : 'Confirmar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MixedPaymentModal;

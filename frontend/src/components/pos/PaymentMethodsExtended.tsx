/**
 * Extended Payment Methods Component
 * Includes Red Compra, Cheque and other payment methods
 */

import React, { useState } from 'react';
import { CreditCard, FileText, Ticket, Bitcoin, DollarSign, Building } from 'lucide-react';

interface PaymentMethod {
  code: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  requiresDetails: boolean;
}

interface PaymentDetail {
  type: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  transactionCode?: string;
  cardLast4?: string;
  authorizationCode?: string;
  notes?: string;
}

interface PaymentMethodsExtendedProps {
  onSelectMethod: (method: string, details?: PaymentDetail) => void;
  totalAmount: number;
  selectedMethod?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    code: 'cash',
    name: 'Efectivo',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'bg-green-500',
    requiresDetails: false
  },
  {
    code: 'debit_card',
    name: 'Tarjeta Débito',
    icon: <CreditCard className="w-6 h-6" />,
    color: 'bg-blue-500',
    requiresDetails: true
  },
  {
    code: 'credit_card',
    name: 'Tarjeta Crédito',
    icon: <CreditCard className="w-6 h-6" />,
    color: 'bg-purple-500',
    requiresDetails: true
  },
  {
    code: 'red_compra',
    name: 'Red Compra',
    icon: <Building className="w-6 h-6" />,
    color: 'bg-orange-500',
    requiresDetails: true
  },
  {
    code: 'transfer',
    name: 'Transferencia',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-indigo-500',
    requiresDetails: true
  },
  {
    code: 'cheque',
    name: 'Cheque',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-yellow-500',
    requiresDetails: true
  },
  {
    code: 'vale',
    name: 'Vale Alimentación',
    icon: <Ticket className="w-6 h-6" />,
    color: 'bg-pink-500',
    requiresDetails: true
  }
];

export const PaymentMethodsExtended: React.FC<PaymentMethodsExtendedProps> = ({
  onSelectMethod,
  totalAmount,
  selectedMethod
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail>({ type: '' });

  const handleMethodClick = (method: PaymentMethod) => {
    if (method.requiresDetails) {
      setCurrentMethod(method);
      setPaymentDetails({ type: method.code });
      setShowDetailsModal(true);
    } else {
      onSelectMethod(method.code);
    }
  };

  const handleSubmitDetails = () => {
    if (currentMethod) {
      onSelectMethod(currentMethod.code, paymentDetails);
      setShowDetailsModal(false);
      setPaymentDetails({ type: '' });
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.code}
            onClick={() => handleMethodClick(method)}
            className={`
              ${method.color} text-white p-4 rounded-lg
              flex flex-col items-center justify-center gap-2
              hover:opacity-90 transition-all
              ${selectedMethod === method.code ? 'ring-4 ring-white' : ''}
            `}
          >
            {method.icon}
            <span className="text-sm font-medium text-center">{method.name}</span>
          </button>
        ))}
      </div>

      {/* Details Modal */}
      {showDetailsModal && currentMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Detalles de {currentMethod.name}
            </h3>

            {/* Red Compra Details */}
            {currentMethod.code === 'red_compra' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Código de Transacción *
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.transactionCode || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      transactionCode: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ej: 123456789"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Últimos 4 dígitos tarjeta
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={paymentDetails.cardLast4 || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      cardLast4: e.target.value.replace(/\D/g, '')
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="1234"
                  />
                </div>
              </div>
            )}

            {/* Cheque Details */}
            {currentMethod.code === 'cheque' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número de Cheque *
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.chequeNumber || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      chequeNumber: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ej: 001234567"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Banco *
                  </label>
                  <select
                    value={paymentDetails.bankName || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      bankName: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Seleccionar banco</option>
                    <option value="Banco de Chile">Banco de Chile</option>
                    <option value="Banco Estado">Banco Estado</option>
                    <option value="Santander">Santander</option>
                    <option value="BCI">BCI</option>
                    <option value="Scotiabank">Scotiabank</option>
                    <option value="Itaú">Itaú</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha del Cheque
                  </label>
                  <input
                    type="date"
                    value={paymentDetails.chequeDate || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      chequeDate: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            )}

            {/* Card Details (Debit/Credit) */}
            {(currentMethod.code === 'debit_card' || currentMethod.code === 'credit_card') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Código de Autorización *
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.authorizationCode || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      authorizationCode: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ej: 123456"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Últimos 4 dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={paymentDetails.cardLast4 || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      cardLast4: e.target.value.replace(/\D/g, '')
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="1234"
                  />
                </div>
              </div>
            )}

            {/* Transfer Details */}
            {currentMethod.code === 'transfer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número de Operación *
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.transactionCode || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      transactionCode: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ej: 987654321"
                    required
                  />
                </div>
              </div>
            )}

            {/* Vale Details */}
            {currentMethod.code === 'vale' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número de Vale *
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.transactionCode || ''}
                    onChange={(e) => setPaymentDetails({
                      ...paymentDetails,
                      transactionCode: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ej: VALE123456"
                    required
                  />
                </div>
              </div>
            )}

            {/* Common Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Notas (Opcional)
              </label>
              <textarea
                value={paymentDetails.notes || ''}
                onChange={(e) => setPaymentDetails({
                  ...paymentDetails,
                  notes: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                rows={2}
                placeholder="Notas adicionales..."
              />
            </div>

            {/* Amount Display */}
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <div className="flex justify-between">
                <span className="font-medium">Monto a pagar:</span>
                <span className="text-xl font-bold">
                  ${totalAmount.toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitDetails}
                disabled={!isValidDetails()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  function isValidDetails(): boolean {
    if (!currentMethod) return false;

    switch (currentMethod.code) {
      case 'red_compra':
        return !!paymentDetails.transactionCode;
      case 'cheque':
        return !!paymentDetails.chequeNumber && !!paymentDetails.bankName;
      case 'debit_card':
      case 'credit_card':
        return !!paymentDetails.authorizationCode;
      case 'transfer':
      case 'vale':
        return !!paymentDetails.transactionCode;
      default:
        return true;
    }
  }
};

export default PaymentMethodsExtended;
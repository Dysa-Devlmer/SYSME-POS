/**
 * SplitBillModal - Modal para dividir cuenta entre múltiples pagos
 * Soporta 3 modos: por ítems, equitativo, personalizado
 */

import React, { useState } from 'react';
import { PaymentDetails } from '@/api/salesService';
import MixedPaymentModal from './MixedPaymentModal';

interface SaleItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  modifiers?: Array<{
    modifier_id: number;
    modifier_name: string;
    modifier_price: number;
  }>;
}

interface Split {
  items?: number[];
  amount?: number;
  percentage?: number;
  payment_method: string;
  payment_details?: PaymentDetails;
}

interface SplitBillModalProps {
  isOpen: boolean;
  saleId: number;
  saleTotal: number;
  items: SaleItem[];
  onClose: () => void;
  onConfirm: (splits: Split[], splitMethod: 'items' | 'equal' | 'custom') => void;
}

const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  saleId,
  saleTotal,
  items,
  onClose,
  onConfirm
}) => {
  const [splitMethod, setSplitMethod] = useState<'items' | 'equal' | 'custom'>('equal');
  const [numPeople, setNumPeople] = useState(2);
  const [splits, setSplits] = useState<Split[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [splitIndex: number]: number[] }>({});
  const [customAmounts, setCustomAmounts] = useState<number[]>([]);
  const [showMixedPayment, setShowMixedPayment] = useState(false);
  const [currentSplitIndex, setCurrentSplitIndex] = useState<number | null>(null);

  // Calculate split for equal division
  const calculateEqualSplit = () => {
    const amountPerPerson = Math.round(saleTotal / numPeople);
    const newSplits: Split[] = [];

    for (let i = 0; i < numPeople; i++) {
      newSplits.push({
        amount: amountPerPerson,
        payment_method: 'cash'
      });
    }

    // Adjust last split for rounding
    const totalSplits = newSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const diff = saleTotal - totalSplits;
    if (diff !== 0 && newSplits.length > 0) {
      newSplits[newSplits.length - 1].amount! += diff;
    }

    setSplits(newSplits);
  };

  // Calculate split by items
  const calculateItemsSplit = () => {
    const newSplits: Split[] = [];
    const itemGroups = Object.values(selectedItems);

    itemGroups.forEach((itemIds, index) => {
      const splitItems = items.filter(item => itemIds.includes(item.id));
      const amount = splitItems.reduce((sum, item) => sum + item.total, 0);

      newSplits.push({
        items: itemIds,
        amount,
        payment_method: 'cash'
      });
    });

    setSplits(newSplits);
  };

  // Toggle item selection for a split
  const toggleItemSelection = (splitIndex: number, itemId: number) => {
    setSelectedItems(prev => {
      const current = prev[splitIndex] || [];
      const newSelection = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];

      return {
        ...prev,
        [splitIndex]: newSelection
      };
    });
  };

  // Handle custom amount change
  const handleCustomAmountChange = (index: number, amount: number) => {
    const newAmounts = [...customAmounts];
    newAmounts[index] = amount;
    setCustomAmounts(newAmounts);

    // Update splits
    const newSplits = [...splits];
    newSplits[index] = {
      ...newSplits[index],
      amount,
      percentage: Math.round((amount / saleTotal) * 100)
    };
    setSplits(newSplits);
  };

  // Add custom split
  const addCustomSplit = () => {
    setSplits([...splits, { amount: 0, percentage: 0, payment_method: 'cash' }]);
    setCustomAmounts([...customAmounts, 0]);
  };

  // Remove custom split
  const removeCustomSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
    setCustomAmounts(customAmounts.filter((_, i) => i !== index));
  };

  // Handle payment method selection
  const handlePaymentMethodChange = (index: number, method: string) => {
    const newSplits = [...splits];
    newSplits[index] = {
      ...newSplits[index],
      payment_method: method
    };
    setSplits(newSplits);
  };

  // Open mixed payment modal for a split
  const openMixedPaymentForSplit = (index: number) => {
    setCurrentSplitIndex(index);
    setShowMixedPayment(true);
  };

  // Handle mixed payment confirmation
  const handleMixedPaymentConfirm = (paymentDetails: PaymentDetails) => {
    if (currentSplitIndex !== null) {
      const newSplits = [...splits];
      newSplits[currentSplitIndex] = {
        ...newSplits[currentSplitIndex],
        payment_method: 'mixed',
        payment_details: paymentDetails
      };
      setSplits(newSplits);
      setShowMixedPayment(false);
      setCurrentSplitIndex(null);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    if (splits.length === 0) {
      alert('Debe crear al menos una división');
      return;
    }

    const totalSplit = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    if (Math.abs(totalSplit - saleTotal) > 1) { // Allow 1 peso difference for rounding
      alert(`El total de las divisiones ($${totalSplit.toLocaleString()}) no coincide con el total de la venta ($${saleTotal.toLocaleString()})`);
      return;
    }

    onConfirm(splits, splitMethod);
  };

  const totalSplit = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
  const remaining = saleTotal - totalSplit;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <h2 className="text-2xl font-bold">💰 Dividir Cuenta</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✖️
            </button>
          </div>

          {/* Total Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total de la Cuenta:</span>
              <span className="text-2xl font-bold text-blue-700">
                ${saleTotal.toLocaleString()}
              </span>
            </div>
            {splits.length > 0 && (
              <div className="mt-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Dividido:</span>
                  <span className={totalSplit === saleTotal ? 'text-green-600 font-bold' : 'text-orange-600'}>
                    ${totalSplit.toLocaleString()}
                  </span>
                </div>
                {remaining !== 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Falta:</span>
                    <span className="font-bold">${Math.abs(remaining).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Método de División:</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSplitMethod('equal')}
                className={`p-4 border-2 rounded-lg ${
                  splitMethod === 'equal'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl mb-2">⚖️</div>
                <div className="font-semibold">Equitativo</div>
                <div className="text-xs text-gray-600">Dividir en partes iguales</div>
              </button>

              <button
                onClick={() => setSplitMethod('items')}
                className={`p-4 border-2 rounded-lg ${
                  splitMethod === 'items'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold">Por Ítems</div>
                <div className="text-xs text-gray-600">Asignar productos</div>
              </button>

              <button
                onClick={() => setSplitMethod('custom')}
                className={`p-4 border-2 rounded-lg ${
                  splitMethod === 'custom'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl mb-2">✏️</div>
                <div className="font-semibold">Personalizado</div>
                <div className="text-xs text-gray-600">Montos manuales</div>
              </button>
            </div>
          </div>

          {/* Split Configuration */}
          <div className="mb-6">
            {splitMethod === 'equal' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Número de Personas:</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={numPeople}
                    onChange={(e) => setNumPeople(parseInt(e.target.value) || 2)}
                    className="w-32 p-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={calculateEqualSplit}
                    className="ml-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Calcular División
                  </button>
                </div>
              </div>
            )}

            {splitMethod === 'items' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-3">
                  Seleccione los ítems para cada división. Puede crear múltiples divisiones.
                </p>
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => {
                      const newIndex = Object.keys(selectedItems).length;
                      setSelectedItems({ ...selectedItems, [newIndex]: [] });
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    ➕ Agregar División
                  </button>
                  <button
                    onClick={calculateItemsSplit}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Calcular Montos
                  </button>
                </div>

                {Object.entries(selectedItems).map(([splitIndex, itemIds]) => (
                  <div key={splitIndex} className="bg-gray-50 border border-gray-200 rounded p-4">
                    <h4 className="font-semibold mb-2">División {parseInt(splitIndex) + 1}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(item => (
                        <label key={item.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={itemIds.includes(item.id)}
                            onChange={() => toggleItemSelection(parseInt(splitIndex), item.id)}
                            className="form-checkbox h-4 w-4"
                          />
                          <span className="text-sm">
                            {item.product_name} x{item.quantity} - ${item.total.toLocaleString()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {splitMethod === 'custom' && (
              <div className="space-y-4">
                <button
                  onClick={addCustomSplit}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-3"
                >
                  ➕ Agregar División
                </button>

                {splits.map((split, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Monto División {index + 1}</label>
                        <input
                          type="number"
                          value={customAmounts[index] || 0}
                          onChange={(e) => handleCustomAmountChange(index, parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border border-gray-300 rounded"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        {split.percentage}%
                      </div>
                      {splits.length > 1 && (
                        <button
                          onClick={() => removeCustomSplit(index)}
                          className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Methods for Each Split */}
          {splits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Métodos de Pago:</h3>
              <div className="space-y-3">
                {splits.map((split, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded">
                    <div className="font-semibold min-w-[100px]">
                      División {index + 1}:
                    </div>
                    <div className="font-bold text-blue-700 min-w-[120px]">
                      ${(split.amount || 0).toLocaleString()}
                    </div>
                    <select
                      value={split.payment_method}
                      onChange={(e) => handlePaymentMethodChange(index, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded"
                    >
                      <option value="cash">💵 Efectivo</option>
                      <option value="card">💳 Tarjeta</option>
                      <option value="transfer">🏦 Transferencia</option>
                      <option value="mixed">💳💵 Pago Mixto</option>
                    </select>
                    {split.payment_method === 'mixed' && (
                      <button
                        onClick={() => openMixedPaymentForSplit(index)}
                        className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                      >
                        Configurar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
              disabled={splits.length === 0 || Math.abs(remaining) > 1}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {splits.length === 0
                ? 'Configure la división'
                : Math.abs(remaining) > 1
                ? `Falta $${Math.abs(remaining).toLocaleString()}`
                : 'Confirmar División'}
            </button>
          </div>
        </div>
      </div>

      {/* Mixed Payment Modal for individual split */}
      {showMixedPayment && currentSplitIndex !== null && (
        <MixedPaymentModal
          isOpen={showMixedPayment}
          total={splits[currentSplitIndex]?.amount || 0}
          onClose={() => {
            setShowMixedPayment(false);
            setCurrentSplitIndex(null);
          }}
          onConfirm={handleMixedPaymentConfirm}
        />
      )}
    </>
  );
};

export default SplitBillModal;

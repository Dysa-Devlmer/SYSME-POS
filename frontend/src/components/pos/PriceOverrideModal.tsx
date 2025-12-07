/**
 * PriceOverrideModal Component
 * Modal para cambiar el precio de un producto durante la venta
 * Similar al sistema legacy SYSME TPV v5.04
 */

import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../../config/chile-config';
import { NumericKeypad } from '../ui/VirtualKeyboard';

interface PriceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newPrice: number, reason: string) => void;
  productName: string;
  currentPrice: number;
  originalPrice: number;
  requireReason?: boolean;
  allowIncrease?: boolean;
  maxDiscountPercent?: number;
}

const PRICE_CHANGE_REASONS = [
  { id: 'promo', label: 'Promoción', icon: '🏷️' },
  { id: 'cliente_frecuente', label: 'Cliente Frecuente', icon: '⭐' },
  { id: 'error_precio', label: 'Error de Precio', icon: '❌' },
  { id: 'negociacion', label: 'Negociación', icon: '🤝' },
  { id: 'descuento_volumen', label: 'Descuento por Volumen', icon: '📦' },
  { id: 'precio_especial', label: 'Precio Especial', icon: '💎' },
  { id: 'happy_hour', label: 'Happy Hour', icon: '🍺' },
  { id: 'otro', label: 'Otro', icon: '📝' }
];

export const PriceOverrideModal: React.FC<PriceOverrideModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName,
  currentPrice,
  originalPrice,
  requireReason = true,
  allowIncrease = false,
  maxDiscountPercent = 50
}) => {
  const [newPrice, setNewPrice] = useState<string>(currentPrice.toString());
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showKeypad, setShowKeypad] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewPrice(currentPrice.toString());
      setSelectedReason('');
      setCustomReason('');
      setError('');
    }
  }, [isOpen, currentPrice]);

  if (!isOpen) return null;

  const parsedPrice = parseFloat(newPrice.replace(',', '.')) || 0;
  const discount = originalPrice - parsedPrice;
  const discountPercent = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;
  const isIncrease = parsedPrice > originalPrice;

  const handleConfirm = () => {
    // Validaciones
    if (parsedPrice <= 0) {
      setError('El precio debe ser mayor a 0');
      return;
    }

    if (!allowIncrease && isIncrease) {
      setError('No se permite aumentar el precio');
      return;
    }

    if (discountPercent > maxDiscountPercent) {
      setError(`El descuento máximo permitido es ${maxDiscountPercent}%`);
      return;
    }

    if (requireReason && !selectedReason) {
      setError('Debe seleccionar un motivo');
      return;
    }

    const reason = selectedReason === 'otro' ? customReason :
      PRICE_CHANGE_REASONS.find(r => r.id === selectedReason)?.label || '';

    onConfirm(parsedPrice, reason);
    onClose();
  };

  const handleQuickDiscount = (percent: number) => {
    const discountedPrice = Math.round(originalPrice * (1 - percent / 100));
    setNewPrice(discountedPrice.toString());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Cambiar Precio</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-blue-100 mt-1 truncate">{productName}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Precio Original vs Nuevo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-500">Precio Original</p>
              <p className="text-xl font-bold text-gray-700">{formatCurrency(originalPrice)}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${
              isIncrease ? 'bg-red-100' : parsedPrice < originalPrice ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <p className="text-sm text-gray-500">Nuevo Precio</p>
              <p className={`text-xl font-bold ${
                isIncrease ? 'text-red-600' : parsedPrice < originalPrice ? 'text-green-600' : 'text-gray-700'
              }`}>
                {formatCurrency(parsedPrice)}
              </p>
            </div>
          </div>

          {/* Indicador de descuento */}
          {parsedPrice !== originalPrice && (
            <div className={`p-2 rounded-lg text-center ${
              isIncrease ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              <span className="font-medium">
                {isIncrease ? '↑ Aumento' : '↓ Descuento'}: {Math.abs(discountPercent).toFixed(1)}%
                ({isIncrease ? '+' : '-'}{formatCurrency(Math.abs(discount))})
              </span>
            </div>
          )}

          {/* Descuentos Rápidos */}
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Descuentos Rápidos</p>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 25, 30].map(percent => (
                <button
                  key={percent}
                  onClick={() => handleQuickDiscount(percent)}
                  disabled={percent > maxDiscountPercent}
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                    percent > maxDiscountPercent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  -{percent}%
                </button>
              ))}
            </div>
          </div>

          {/* Input de precio o Keypad */}
          {showKeypad ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-600">Ingrese Nuevo Precio</p>
                <button
                  onClick={() => setShowKeypad(false)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Usar teclado físico
                </button>
              </div>
              <NumericKeypad
                value={newPrice}
                onChange={setNewPrice}
                onAccept={handleConfirm}
                allowDecimal={false}
                maxLength={8}
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-600">Nuevo Precio</p>
                <button
                  onClick={() => setShowKeypad(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Usar teclado virtual
                </button>
              </div>
              <input
                ref={inputRef}
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full p-4 text-2xl font-bold text-center border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="0"
                autoFocus
              />
            </div>
          )}

          {/* Motivo del cambio */}
          {requireReason && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Motivo del Cambio {requireReason && <span className="text-red-500">*</span>}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PRICE_CHANGE_REASONS.map(reason => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedReason === reason.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{reason.icon}</span>
                    <span className="text-sm font-medium">{reason.label}</span>
                  </button>
                ))}
              </div>

              {selectedReason === 'otro' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Especifique el motivo..."
                  className="w-full mt-2 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
            >
              Aplicar Cambio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceOverrideModal;

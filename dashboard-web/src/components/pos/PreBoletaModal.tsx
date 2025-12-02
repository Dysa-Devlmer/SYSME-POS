/**
 * PreBoletaModal Component
 * Modal para imprimir pre-boleta sin cerrar la venta
 * Similar al sistema legacy SYSME TPV v5.04
 */

import React, { useState } from 'react';
import { formatCurrency } from '../../config/chile-config';

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  modifiers?: Array<{
    modifier_name: string;
    modifier_price: number;
  }>;
}

interface PreBoletaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (options: PreBoletaOptions) => void;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  tableNumber?: string;
  customerName?: string;
}

interface PreBoletaOptions {
  copies: number;
  includeDetails: boolean;
  includeTotal: boolean;
  includeDateTime: boolean;
  customMessage?: string;
}

export const PreBoletaModal: React.FC<PreBoletaModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  items,
  subtotal,
  taxAmount,
  total,
  tableNumber,
  customerName
}) => {
  const [options, setOptions] = useState<PreBoletaOptions>({
    copies: 1,
    includeDetails: true,
    includeTotal: true,
    includeDateTime: true,
    customMessage: ''
  });
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await onPrint(options);
      onClose();
    } catch (error) {
      console.error('Error printing pre-boleta:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🧾 Pre-Boleta
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-amber-100 mt-1">
            Imprimir cuenta sin cerrar la venta
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Info de mesa/cliente */}
          {(tableNumber || customerName) && (
            <div className="flex gap-4 p-3 bg-gray-100 rounded-lg">
              {tableNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🪑</span>
                  <div>
                    <p className="text-xs text-gray-500">Mesa</p>
                    <p className="font-bold">{tableNumber}</p>
                  </div>
                </div>
              )}
              {customerName && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-bold">{customerName}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vista previa del ticket */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
            <div className="text-center border-b border-gray-300 pb-3 mb-3">
              <h3 className="font-bold text-lg">PRE-CUENTA</h3>
              <p className="text-sm text-gray-500">*** NO ES DOCUMENTO TRIBUTARIO ***</p>
              {options.includeDateTime && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date().toLocaleString('es-CL')}
                </p>
              )}
            </div>

            {/* Items */}
            {options.includeDetails && (
              <div className="space-y-2 mb-4">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.quantity}x</span>{' '}
                      <span>{item.product_name}</span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-gray-500 ml-4">
                          {item.modifiers.map((mod, i) => (
                            <span key={i}>+ {mod.modifier_name}</span>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-xs text-orange-600 ml-4 italic">
                          Nota: {item.notes}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totales */}
            {options.includeTotal && (
              <div className="border-t border-gray-300 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA (19%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            {/* Mensaje personalizado */}
            {options.customMessage && (
              <div className="mt-4 text-center text-sm italic border-t border-gray-300 pt-3">
                {options.customMessage}
              </div>
            )}

            <div className="text-center mt-4 text-xs text-gray-400">
              *** CUENTA PENDIENTE DE PAGO ***
            </div>
          </div>

          {/* Opciones de impresión */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Opciones de Impresión</h4>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                <input
                  type="checkbox"
                  checked={options.includeDetails}
                  onChange={(e) => setOptions({...options, includeDetails: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm">Incluir detalle de productos</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                <input
                  type="checkbox"
                  checked={options.includeTotal}
                  onChange={(e) => setOptions({...options, includeTotal: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm">Incluir totales</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                <input
                  type="checkbox"
                  checked={options.includeDateTime}
                  onChange={(e) => setOptions({...options, includeDateTime: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm">Incluir fecha y hora</span>
              </label>

              <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                <span className="text-sm">Copias:</span>
                <select
                  value={options.copies}
                  onChange={(e) => setOptions({...options, copies: parseInt(e.target.value)})}
                  className="flex-1 p-2 rounded border border-gray-300"
                >
                  {[1, 2, 3].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Mensaje personalizado (opcional)
              </label>
              <input
                type="text"
                value={options.customMessage}
                onChange={(e) => setOptions({...options, customMessage: e.target.value})}
                placeholder="Ej: Gracias por su preferencia"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                maxLength={50}
              />
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-amber-50 p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-amber-700">Total a mostrar:</p>
                <p className="text-2xl font-bold text-amber-800">{formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-700">Items:</p>
                <p className="text-2xl font-bold text-amber-800">{items.length}</p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                isPrinting
                  ? 'bg-gray-400 cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {isPrinting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Imprimiendo...
                </>
              ) : (
                <>
                  🖨️ Imprimir Pre-Boleta
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreBoletaModal;

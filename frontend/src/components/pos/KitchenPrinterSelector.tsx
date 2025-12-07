/**
 * KitchenPrinterSelector Component
 * Selector de impresora de cocina (1-4)
 * Para restaurantes con múltiples estaciones de cocina
 */

import React, { useState } from 'react';

export interface KitchenPrinter {
  id: number;
  code: string;
  name: string;
  station: string;
  ip_address?: string;
  port?: number;
  is_active: boolean;
  is_online: boolean;
  paper_status?: 'ok' | 'low' | 'empty';
  categories?: string[]; // Categorías de productos que imprime
}

interface KitchenPrinterSelectorProps {
  printers: KitchenPrinter[];
  selectedPrinters: number[];
  onSelect: (printerIds: number[]) => void;
  mode: 'single' | 'multiple';
  className?: string;
}

export const KitchenPrinterSelector: React.FC<KitchenPrinterSelectorProps> = ({
  printers,
  selectedPrinters,
  onSelect,
  mode = 'single',
  className = ''
}) => {
  const handleToggle = (printerId: number) => {
    if (mode === 'single') {
      onSelect([printerId]);
    } else {
      if (selectedPrinters.includes(printerId)) {
        onSelect(selectedPrinters.filter(id => id !== printerId));
      } else {
        onSelect([...selectedPrinters, printerId]);
      }
    }
  };

  const activePrinters = printers.filter(p => p.is_active);

  const getStatusColor = (printer: KitchenPrinter) => {
    if (!printer.is_online) return 'bg-gray-100 border-gray-300';
    if (printer.paper_status === 'empty') return 'bg-red-100 border-red-300';
    if (printer.paper_status === 'low') return 'bg-yellow-100 border-yellow-300';
    return 'bg-green-100 border-green-300';
  };

  const getStatusIcon = (printer: KitchenPrinter) => {
    if (!printer.is_online) return '⚪';
    if (printer.paper_status === 'empty') return '🔴';
    if (printer.paper_status === 'low') return '🟡';
    return '🟢';
  };

  const KITCHEN_ICONS: Record<string, string> = {
    'cocina_caliente': '🔥',
    'cocina_fria': '❄️',
    'bar': '🍸',
    'postres': '🍰',
    'parrilla': '🥩',
    'pizza': '🍕',
    'sushi': '🍣',
    'default': '🍳'
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Impresora de Cocina
        </label>
        {mode === 'multiple' && (
          <span className="text-xs text-gray-500">
            {selectedPrinters.length} seleccionada{selectedPrinters.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {activePrinters.map(printer => {
          const isSelected = selectedPrinters.includes(printer.id);
          const icon = KITCHEN_ICONS[printer.station] || KITCHEN_ICONS.default;

          return (
            <button
              key={printer.id}
              onClick={() => handleToggle(printer.id)}
              disabled={!printer.is_online}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : getStatusColor(printer)
                }
                ${!printer.is_online ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="font-bold text-sm">{printer.code}</p>
                    <p className="text-xs text-gray-600">{printer.name}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm">{getStatusIcon(printer)}</span>
                  {isSelected && (
                    <span className="text-blue-600 text-lg">✓</span>
                  )}
                </div>
              </div>

              {printer.categories && printer.categories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {printer.categories.slice(0, 3).map((cat, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                      {cat}
                    </span>
                  ))}
                  {printer.categories.length > 3 && (
                    <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                      +{printer.categories.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {activePrinters.length === 0 && (
        <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
          No hay impresoras de cocina configuradas
        </div>
      )}

      {/* Leyenda de estados */}
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">🟢 Online</span>
        <span className="flex items-center gap-1">🟡 Poco papel</span>
        <span className="flex items-center gap-1">🔴 Sin papel</span>
        <span className="flex items-center gap-1">⚪ Offline</span>
      </div>
    </div>
  );
};

/**
 * KitchenPrinterQuickSelect - Selector compacto para usar en el POS
 */
interface KitchenPrinterQuickSelectProps {
  printers: KitchenPrinter[];
  selectedPrinter?: number;
  onChange: (printerId: number) => void;
}

export const KitchenPrinterQuickSelect: React.FC<KitchenPrinterQuickSelectProps> = ({
  printers,
  selectedPrinter,
  onChange
}) => {
  const activePrinters = printers.filter(p => p.is_active && p.is_online);

  return (
    <div className="flex gap-1">
      {activePrinters.map(printer => (
        <button
          key={printer.id}
          onClick={() => onChange(printer.id)}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${selectedPrinter === printer.id
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          title={printer.name}
        >
          {printer.code}
        </button>
      ))}
    </div>
  );
};

/**
 * Modal completo para configurar impresoras de cocina
 */
interface KitchenPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  printers: KitchenPrinter[];
  selectedPrinters: number[];
  onConfirm: (printerIds: number[]) => void;
}

export const KitchenPrinterModal: React.FC<KitchenPrinterModalProps> = ({
  isOpen,
  onClose,
  printers,
  selectedPrinters: initialSelected,
  onConfirm
}) => {
  const [selected, setSelected] = useState<number[]>(initialSelected);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  const selectAll = () => {
    setSelected(printers.filter(p => p.is_active && p.is_online).map(p => p.id));
  };

  const selectNone = () => {
    setSelected([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🍳 Impresoras de Cocina
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-orange-100 mt-1">
            Seleccione las impresoras para este pedido
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-end gap-2 mb-3">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Seleccionar todas
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={selectNone}
              className="text-sm text-blue-600 hover:underline"
            >
              Ninguna
            </button>
          </div>

          <KitchenPrinterSelector
            printers={printers}
            selectedPrinters={selected}
            onSelect={setSelected}
            mode="multiple"
          />
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
            >
              Confirmar ({selected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenPrinterSelector;

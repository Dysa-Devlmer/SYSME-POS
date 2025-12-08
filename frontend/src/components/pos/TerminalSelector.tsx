/**
 * TerminalSelector Component
 * Selector de terminal/punto de venta (TPV1, TPV2, etc.)
 * Similar al sistema legacy SYSME TPV v5.04
 */

import React, { useState, useEffect } from 'react';

export interface Terminal {
  id: number;
  code: string;
  name: string;
  description?: string;
  location?: string;
  is_active: boolean;
  is_online: boolean;
  last_activity?: string;
  assigned_user?: string;
  printer_config?: {
    receipt_printer?: string;
    kitchen_printer?: string;
  };
}

interface TerminalSelectorProps {
  terminals: Terminal[];
  currentTerminal?: Terminal;
  onSelect: (terminal: Terminal) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const TerminalSelector: React.FC<TerminalSelectorProps> = ({
  terminals,
  currentTerminal,
  onSelect,
  onClose,
  isOpen
}) => {
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | undefined>(currentTerminal);

  useEffect(() => {
    setSelectedTerminal(currentTerminal);
  }, [currentTerminal]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedTerminal) {
      onSelect(selectedTerminal);
      onClose();
    }
  };

  const activeTerminals = terminals.filter(t => t.is_active);
  const inactiveTerminals = terminals.filter(t => !t.is_active);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🖥️ Seleccionar Terminal
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-indigo-100 mt-1">
            Punto de Venta - {activeTerminals.length} terminales activos
          </p>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Terminales Activos */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Terminales Disponibles
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {activeTerminals.map(terminal => (
                <button
                  key={terminal.id}
                  onClick={() => setSelectedTerminal(terminal)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedTerminal?.id === terminal.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🖥️</span>
                        <div>
                          <h4 className="font-bold text-lg">{terminal.code}</h4>
                          <p className="text-sm text-gray-600">{terminal.name}</p>
                        </div>
                      </div>
                      {terminal.location && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          📍 {terminal.location}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        terminal.is_online
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {terminal.is_online ? '🟢 Online' : '⚪ Offline'}
                      </span>
                      {selectedTerminal?.id === terminal.id && (
                        <span className="text-indigo-600 text-xl">✓</span>
                      )}
                    </div>
                  </div>

                  {/* Info adicional */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                    {terminal.assigned_user ? (
                      <span>👤 {terminal.assigned_user}</span>
                    ) : (
                      <span>Sin asignar</span>
                    )}
                    {terminal.last_activity && (
                      <span>Últ. actividad: {new Date(terminal.last_activity).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>

                  {/* Configuración de impresoras */}
                  {terminal.printer_config && (
                    <div className="mt-2 flex gap-2 text-xs">
                      {terminal.printer_config.receipt_printer && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          🧾 {terminal.printer_config.receipt_printer}
                        </span>
                      )}
                      {terminal.printer_config.kitchen_printer && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          🍳 {terminal.printer_config.kitchen_printer}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Terminales Inactivos */}
          {inactiveTerminals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Terminales Inactivos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {inactiveTerminals.map(terminal => (
                  <div
                    key={terminal.id}
                    className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl grayscale">🖥️</span>
                      <div>
                        <h4 className="font-bold text-gray-500">{terminal.code}</h4>
                        <p className="text-sm text-gray-400">{terminal.name}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Terminal desactivado</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          {selectedTerminal && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-700">
                Terminal seleccionado: <strong>{selectedTerminal.code}</strong> - {selectedTerminal.name}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedTerminal}
              className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors ${
                selectedTerminal
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  : 'bg-gray-300 cursor-not-allowed text-gray-500'
              }`}
            >
              Seleccionar Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TerminalIndicator - Muestra el terminal actual en el header
 */
interface TerminalIndicatorProps {
  terminal?: Terminal;
  onClick: () => void;
}

export const TerminalIndicator: React.FC<TerminalIndicatorProps> = ({
  terminal,
  onClick
}) => {
  if (!terminal) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
      >
        <span>⚠️</span>
        <span className="text-sm font-medium">Sin Terminal</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
    >
      <span>🖥️</span>
      <div className="text-left">
        <p className="text-sm font-bold">{terminal.code}</p>
        <p className="text-xs opacity-75">{terminal.name}</p>
      </div>
      <span className={`w-2 h-2 rounded-full ${terminal.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
    </button>
  );
};

export default TerminalSelector;

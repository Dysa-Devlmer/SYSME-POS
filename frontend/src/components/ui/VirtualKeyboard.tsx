/**
 * VirtualKeyboard Component
 * Teclado virtual táctil para uso en tablets y pantallas touch
 * Soporta modo numérico y alfanumérico completo
 */

import React, { useState, useCallback } from 'react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onEnter?: () => void;
  onClose?: () => void;
  mode?: 'numeric' | 'alphanumeric' | 'full';
  visible?: boolean;
  className?: string;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onEnter,
  onClose,
  mode = 'alphanumeric',
  visible = true,
  className = ''
}) => {
  const [isShift, setIsShift] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'SHIFT') {
      setIsShift(!isShift);
      return;
    }
    if (key === 'CAPS') {
      setIsCapsLock(!isCapsLock);
      setIsShift(false);
      return;
    }
    if (key === 'ENTER') {
      onEnter?.();
      return;
    }
    if (key === 'BACKSPACE') {
      onKeyPress('BACKSPACE');
      return;
    }
    if (key === 'SPACE') {
      onKeyPress(' ');
      return;
    }
    if (key === 'CLEAR') {
      onKeyPress('CLEAR');
      return;
    }

    // Apply shift/caps
    let finalKey = key;
    if (isShift || isCapsLock) {
      finalKey = key.toUpperCase();
      if (isShift) setIsShift(false);
    }

    onKeyPress(finalKey);
  }, [isShift, isCapsLock, onKeyPress, onEnter]);

  if (!visible) return null;

  // Numeric keyboard layout
  const numericKeys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    [',', '0', 'BACKSPACE']
  ];

  // Alphanumeric keyboard layout (QWERTY)
  const alphanumericRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'BACKSPACE'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', 'ENTER'],
    ['CLEAR', 'SPACE']
  ];

  const getKeyDisplay = (key: string): string => {
    switch (key) {
      case 'BACKSPACE': return '⌫';
      case 'ENTER': return '↵ Enter';
      case 'SHIFT': return '⇧ Shift';
      case 'CAPS': return '⇪ Caps';
      case 'SPACE': return 'Espacio';
      case 'CLEAR': return 'Limpiar';
      default:
        if ((isShift || isCapsLock) && key.length === 1) {
          return key.toUpperCase();
        }
        return key;
    }
  };

  const getKeyWidth = (key: string): string => {
    switch (key) {
      case 'BACKSPACE': return 'w-20';
      case 'ENTER': return 'w-24';
      case 'SHIFT': return 'w-20';
      case 'SPACE': return 'flex-1';
      case 'CLEAR': return 'w-24';
      default: return 'w-12';
    }
  };

  const getKeyStyle = (key: string): string => {
    const base = 'h-12 rounded-lg font-medium text-lg transition-all active:scale-95 flex items-center justify-center';

    if (key === 'ENTER') {
      return `${base} bg-green-500 hover:bg-green-600 text-white`;
    }
    if (key === 'BACKSPACE' || key === 'CLEAR') {
      return `${base} bg-red-500 hover:bg-red-600 text-white`;
    }
    if (key === 'SHIFT') {
      return `${base} ${isShift ? 'bg-blue-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`;
    }
    if (key === 'SPACE') {
      return `${base} bg-gray-200 hover:bg-gray-300 text-gray-800`;
    }

    return `${base} bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300`;
  };

  return (
    <div className={`bg-gray-800 p-4 rounded-t-xl shadow-2xl ${className}`}>
      {/* Close button */}
      {onClose && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl px-3 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {mode === 'numeric' ? (
        // Numeric Keyboard
        <div className="flex flex-col gap-2">
          {numericKeys.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 justify-center">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`${getKeyStyle(key)} w-16 h-14 text-2xl`}
                >
                  {getKeyDisplay(key)}
                </button>
              ))}
            </div>
          ))}
          <div className="flex gap-2 justify-center mt-2">
            <button
              onClick={() => handleKeyPress('CLEAR')}
              className="bg-red-500 hover:bg-red-600 text-white w-24 h-12 rounded-lg text-lg font-medium"
            >
              Limpiar
            </button>
            <button
              onClick={() => onEnter?.()}
              className="bg-green-500 hover:bg-green-600 text-white flex-1 h-12 rounded-lg text-lg font-medium"
            >
              ↵ Aceptar
            </button>
          </div>
        </div>
      ) : (
        // Alphanumeric Keyboard
        <div className="flex flex-col gap-2">
          {alphanumericRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5 justify-center">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`${getKeyStyle(key)} ${getKeyWidth(key)}`}
                >
                  {getKeyDisplay(key)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * NumericKeypad Component
 * Teclado numérico simple para cantidades y precios
 */
interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onAccept?: () => void;
  onCancel?: () => void;
  maxLength?: number;
  allowDecimal?: boolean;
  className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  value,
  onChange,
  onAccept,
  onCancel,
  maxLength = 10,
  allowDecimal = true,
  className = ''
}) => {
  const handleKeyPress = (key: string) => {
    if (key === 'BACKSPACE') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === 'CLEAR') {
      onChange('');
      return;
    }
    if (key === ',' || key === '.') {
      if (!allowDecimal || value.includes(',') || value.includes('.')) return;
      onChange(value + ',');
      return;
    }
    if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  const keys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    [allowDecimal ? ',' : '', '0', 'BACKSPACE']
  ];

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>
      {/* Display */}
      <div className="bg-blue-600 text-white text-4xl font-bold p-4 rounded-lg mb-4 text-right min-h-[60px]">
        {value || '0'}
      </div>

      {/* Keys */}
      <div className="flex flex-col gap-2">
        {keys.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 justify-center">
            {row.map((key, keyIndex) => (
              key ? (
                <button
                  key={keyIndex}
                  onClick={() => handleKeyPress(key)}
                  className={`w-16 h-14 rounded-lg text-2xl font-bold transition-all active:scale-95 ${
                    key === 'BACKSPACE'
                      ? 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                  }`}
                >
                  {key === 'BACKSPACE' ? '⌫' : key}
                </button>
              ) : <div key={keyIndex} className="w-16 h-14" />
            ))}
          </div>
        ))}

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 h-14 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xl font-bold flex items-center justify-center gap-2"
            >
              ✕ Cancelar
            </button>
          )}
          {onAccept && (
            <button
              onClick={onAccept}
              className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xl font-bold flex items-center justify-center gap-2"
            >
              ✓ Aceptar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualKeyboard;

/**
 * Virtual Keyboard Component
 * On-screen keyboard for tablets and touch devices
 */

import React, { useState, useCallback } from 'react';
import { Delete, Check, X } from 'lucide-react';

/**
 * Safe calculator function - replaces eval() for security
 */
const safeCalculate = (expression: string): string => {
  try {
    const sanitized = expression.replace(/\s/g, '');
    if (!/^[\d+\-*/().]+$/.test(sanitized)) {
      return 'Error';
    }
    if (/[+\-*/]{2,}/.test(sanitized)) {
      return 'Error';
    }
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      return 'Error';
    }
    return String(Math.round(result * 100) / 100);
  } catch {
    return 'Error';
  }
};

interface VirtualKeyboardProps {
  onInput: (value: string) => void;
  onEnter?: () => void;
  onCancel?: () => void;
  initialValue?: string;
  mode?: 'numeric' | 'full' | 'calculator';
  showDecimal?: boolean;
  maxLength?: number;
  title?: string;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onInput,
  onEnter,
  onCancel,
  initialValue = '',
  mode = 'numeric',
  showDecimal = true,
  maxLength = 10,
  title = 'Ingrese valor'
}) => {
  const [value, setValue] = useState(initialValue);
  const [display, setDisplay] = useState(initialValue);

  const handleButtonClick = (btn: string) => {
    let newValue = value;

    switch (btn) {
      case 'C':
        newValue = '';
        break;
      case 'DEL':
        newValue = value.slice(0, -1);
        break;
      case '.':
        if (showDecimal && !value.includes('.')) {
          newValue = value + '.';
        }
        break;
      case '+':
      case '-':
      case '*':
      case '/':
        if (mode === 'calculator') {
          newValue = value + ' ' + btn + ' ';
        }
        break;
      case '=':
        if (mode === 'calculator') {
          newValue = safeCalculate(value);
        }
        break;
      default:
        if (value.length < maxLength) {
          newValue = value + btn;
        }
    }

    setValue(newValue);
    setDisplay(newValue);
    onInput(newValue);
  };

  const handleEnter = () => {
    if (onEnter) {
      onEnter();
    }
  };

  const handleCancel = () => {
    setValue('');
    setDisplay('');
    if (onCancel) {
      onCancel();
    }
  };

  const numericButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', showDecimal ? '.' : '', 'C']
  ];

  const calculatorButtons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', 'C', '+']
  ];

  const fullKeyboardButtons = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
  ];

  const getButtons = () => {
    switch (mode) {
      case 'calculator':
        return calculatorButtons;
      case 'full':
        return fullKeyboardButtons;
      default:
        return numericButtons;
    }
  };

  const buttons = getButtons();

  return (
    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
      {/* Title */}
      {title && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        </div>
      )}

      {/* Display */}
      <div className="bg-gray-100 rounded-lg p-4 mb-4 border-2 border-gray-300">
        <div className="text-right text-3xl font-bold text-gray-800 min-h-[50px] flex items-center justify-end">
          {display || '0'}
        </div>
      </div>

      {/* Keyboard */}
      <div className="space-y-2">
        {buttons.map((row, rowIndex) => (
          <div key={rowIndex} className="grid gap-2" style={{
            gridTemplateColumns: `repeat(${row.length}, 1fr)`
          }}>
            {row.map((btn, btnIndex) => {
              if (!btn) return <div key={btnIndex} />;

              const isOperator = ['+', '-', '*', '/', '='].includes(btn);
              const isSpecial = ['C', 'DEL'].includes(btn);
              const isEmpty = btn === '';

              if (isEmpty) return <div key={btnIndex} />;

              return (
                <button
                  key={btnIndex}
                  onClick={() => handleButtonClick(btn)}
                  className={`
                    h-16 text-2xl font-bold rounded-lg shadow-md
                    active:scale-95 transition-transform
                    ${isOperator ? 'bg-blue-500 text-white hover:bg-blue-600' :
                      isSpecial ? 'bg-red-500 text-white hover:bg-red-600' :
                      'bg-white hover:bg-gray-100 text-gray-800'
                    }
                    ${btn === 'DEL' ? 'flex items-center justify-center' : ''}
                  `}
                >
                  {btn === 'DEL' ? <Delete className="w-6 h-6" /> : btn}
                </button>
              );
            })}
          </div>
        ))}

        {/* Function Row */}
        {mode === 'calculator' && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => handleButtonClick('=')}
              className="h-16 bg-green-500 text-white text-xl font-bold rounded-lg hover:bg-green-600 shadow-md"
            >
              =
            </button>
            <button
              onClick={handleEnter}
              className="h-16 bg-purple-500 text-white text-xl font-bold rounded-lg hover:bg-purple-600 shadow-md flex items-center justify-center gap-2"
            >
              <Check className="w-6 h-6" />
              OK
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {onCancel && (
          <button
            onClick={handleCancel}
            className="h-14 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancelar
          </button>
        )}
        {onEnter && (
          <button
            onClick={handleEnter}
            disabled={!value}
            className={`
              h-14 font-bold rounded-lg flex items-center justify-center gap-2
              ${!value
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
              }
              ${onCancel ? '' : 'col-span-2'}
            `}
          >
            <Check className="w-5 h-5" />
            Aceptar
          </button>
        )}
      </div>

      {/* Help Text */}
      {mode === 'calculator' && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Presiona = para calcular o OK para confirmar
        </div>
      )}
    </div>
  );
};

export default VirtualKeyboard;
/**
 * BarcodeReader Component
 * Lector de código de barras dedicado con auto-focus
 * Compatible con lectores USB HID y entrada manual
 * Similar al sistema legacy SYSME TPV v5.04
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface BarcodeResult {
  code: string;
  type: 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'CODE39' | 'QR' | 'UNKNOWN';
  timestamp: Date;
}

interface BarcodeReaderProps {
  onScan: (result: BarcodeResult) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
  autoFocus?: boolean;
  showInput?: boolean;
  placeholder?: string;
  className?: string;
  scanDelay?: number; // Delay entre escaneos en ms
  minLength?: number; // Longitud mínima del código
  maxLength?: number; // Longitud máxima del código
  prefixFilter?: string[]; // Prefijos permitidos
  soundEnabled?: boolean;
}

export const BarcodeReader: React.FC<BarcodeReaderProps> = ({
  onScan,
  onError,
  enabled = true,
  autoFocus = true,
  showInput = true,
  placeholder = 'Escanear o escribir código...',
  className = '',
  scanDelay = 100,
  minLength = 3,
  maxLength = 50,
  prefixFilter,
  soundEnabled = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string>('');
  const [scanCount, setScanCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  // Sonido de escaneo exitoso
  const playSuccessSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Sonido de error
  const playErrorSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 300;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Detectar tipo de código de barras
  const detectBarcodeType = (code: string): BarcodeResult['type'] => {
    const cleanCode = code.replace(/\D/g, '');

    if (/^\d{13}$/.test(cleanCode)) return 'EAN13';
    if (/^\d{8}$/.test(cleanCode)) return 'EAN8';
    if (/^\d{12}$/.test(cleanCode)) return 'UPC';
    if (/^[A-Z0-9\-\.\ \$\/\+\%]+$/i.test(code) && code.length <= 43) return 'CODE39';
    if (/^[\x00-\x7F]+$/.test(code)) return 'CODE128';

    return 'UNKNOWN';
  };

  // Validar código
  const validateCode = (code: string): boolean => {
    if (code.length < minLength || code.length > maxLength) {
      return false;
    }

    if (prefixFilter && prefixFilter.length > 0) {
      const hasValidPrefix = prefixFilter.some(prefix => code.startsWith(prefix));
      if (!hasValidPrefix) return false;
    }

    return true;
  };

  // Procesar código escaneado
  const processBarcode = useCallback((code: string) => {
    const trimmedCode = code.trim();

    if (!trimmedCode) return;

    if (!validateCode(trimmedCode)) {
      playErrorSound();
      onError?.(`Código inválido: ${trimmedCode}`);
      return;
    }

    const result: BarcodeResult = {
      code: trimmedCode,
      type: detectBarcodeType(trimmedCode),
      timestamp: new Date()
    };

    playSuccessSound();
    setLastScan(trimmedCode);
    setScanCount(prev => prev + 1);
    setIsScanning(true);

    setTimeout(() => setIsScanning(false), 300);

    onScan(result);
    setInputValue('');
    bufferRef.current = '';
  }, [minLength, maxLength, prefixFilter, onScan, onError, playSuccessSound, playErrorSound]);

  // Auto-focus cuando está habilitado
  useEffect(() => {
    if (enabled && autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [enabled, autoFocus]);

  // Re-focus después de perder el foco (para lectores USB)
  useEffect(() => {
    if (!enabled || !autoFocus) return;

    const handleFocusOut = () => {
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          // Solo re-enfocar si no hay otro input activo
          const activeTag = document.activeElement?.tagName;
          if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
            inputRef.current.focus();
          }
        }
      }, 100);
    };

    const input = inputRef.current;
    input?.addEventListener('blur', handleFocusOut);

    return () => {
      input?.removeEventListener('blur', handleFocusOut);
    };
  }, [enabled, autoFocus]);

  // Listener global de teclado para lectores USB HID
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si hay otro input enfocado
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        if (document.activeElement !== inputRef.current) {
          return;
        }
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Los lectores de código de barras envían caracteres muy rápido
      // Si hay más de 50ms entre teclas, probablemente es entrada manual
      if (timeDiff > 50 && bufferRef.current.length > 0) {
        // Procesar buffer existente si hay pausa larga
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (bufferRef.current.length >= minLength) {
          processBarcode(bufferRef.current);
        } else if (inputValue.length >= minLength) {
          processBarcode(inputValue);
        }
        bufferRef.current = '';
        return;
      }

      // Solo agregar caracteres imprimibles
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;

        // Timer para procesar después de delay (para entrada manual)
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          // No procesar automáticamente - esperar Enter
        }, scanDelay);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, scanDelay, minLength, inputValue, processBarcode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.length >= minLength) {
        processBarcode(inputValue);
      }
    }
  };

  const handleManualSubmit = () => {
    if (inputValue.length >= minLength) {
      processBarcode(inputValue);
    }
  };

  if (!showInput) {
    // Modo invisible - solo escucha global
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={!enabled}
            className={`
              w-full p-3 pl-10 pr-12 border-2 rounded-xl text-lg font-mono
              transition-all duration-200
              ${isScanning
                ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }
              ${!enabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            `}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Icono de escáner */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <span className={`text-xl ${isScanning ? 'animate-pulse' : ''}`}>
              {isScanning ? '✅' : '📷'}
            </span>
          </div>

          {/* Indicador de estado */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {enabled ? (
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Lector activo" />
            ) : (
              <span className="w-3 h-3 bg-gray-400 rounded-full" title="Lector inactivo" />
            )}
          </div>
        </div>

        {/* Botón de búsqueda manual */}
        <button
          onClick={handleManualSubmit}
          disabled={!enabled || inputValue.length < minLength}
          className={`
            p-3 rounded-xl transition-all
            ${enabled && inputValue.length >= minLength
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
          title="Buscar código"
        >
          🔍
        </button>
      </div>

      {/* Info del último escaneo */}
      {lastScan && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Último: <span className="font-mono font-bold">{lastScan}</span></span>
          <span>Total escaneos: {scanCount}</span>
        </div>
      )}
    </div>
  );
};

/**
 * BarcodeReaderModal - Modal con lector de código de barras
 */
interface BarcodeReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: BarcodeResult) => void;
  title?: string;
}

export const BarcodeReaderModal: React.FC<BarcodeReaderModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras'
}) => {
  const [recentScans, setRecentScans] = useState<BarcodeResult[]>([]);

  if (!isOpen) return null;

  const handleScan = (result: BarcodeResult) => {
    setRecentScans(prev => [result, ...prev].slice(0, 5));
    onScan(result);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              📷 {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <BarcodeReader
            onScan={handleScan}
            autoFocus={true}
            soundEnabled={true}
          />

          {/* Instrucciones */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-1">Instrucciones:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Escanee el código de barras con el lector</li>
              <li>O escriba el código manualmente y presione Enter</li>
              <li>El cursor se mantiene automáticamente en el campo</li>
            </ul>
          </div>

          {/* Escaneos recientes */}
          {recentScans.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Escaneos recientes:</h4>
              <div className="space-y-1">
                {recentScans.map((scan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="font-mono">{scan.code}</span>
                    <span className="text-xs text-gray-500">
                      {scan.type} - {scan.timestamp.toLocaleTimeString('es-CL')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * useBarcodeReader - Hook para usar el lector de código de barras
 */
export const useBarcodeReader = (
  onScan: (result: BarcodeResult) => void,
  options: {
    enabled?: boolean;
    minLength?: number;
    maxLength?: number;
  } = {}
) => {
  const { enabled = true, minLength = 3, maxLength = 50 } = options;
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Reset buffer if too much time passed
      if (timeDiff > 100) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength && bufferRef.current.length <= maxLength) {
          const code = bufferRef.current;
          const type = detectType(code);
          onScan({ code, type, timestamp: new Date() });
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    const detectType = (code: string): BarcodeResult['type'] => {
      const cleanCode = code.replace(/\D/g, '');
      if (/^\d{13}$/.test(cleanCode)) return 'EAN13';
      if (/^\d{8}$/.test(cleanCode)) return 'EAN8';
      if (/^\d{12}$/.test(cleanCode)) return 'UPC';
      return 'UNKNOWN';
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, minLength, maxLength, onScan]);
};

/**
 * BarcodeIndicator - Indicador del estado del lector
 */
interface BarcodeIndicatorProps {
  isActive: boolean;
  lastScan?: string;
  onClick?: () => void;
}

export const BarcodeIndicator: React.FC<BarcodeIndicatorProps> = ({
  isActive,
  lastScan,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
        ${isActive
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }
      `}
    >
      <span className="text-lg">📷</span>
      <div className="text-left">
        <p className="text-xs font-medium">
          {isActive ? 'Lector Activo' : 'Lector Inactivo'}
        </p>
        {lastScan && (
          <p className="text-xs opacity-75 font-mono">{lastScan}</p>
        )}
      </div>
      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
    </button>
  );
};

export default BarcodeReader;

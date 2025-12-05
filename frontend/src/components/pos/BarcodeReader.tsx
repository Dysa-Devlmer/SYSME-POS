/**
 * Barcode Reader Component
 * USB HID Scanner support for product search
 */

import React, { useState, useEffect, useRef } from 'react';
import { Scan, Check, X } from 'lucide-react';
import axios from 'axios';

interface BarcodeReaderProps {
  onProductFound: (product: any) => void;
  autoFocus?: boolean;
}

export const BarcodeReader: React.FC<BarcodeReaderProps> = ({
  onProductFound,
  autoFocus = true
}) => {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{ success: boolean; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBuffer = useRef('');
  const scanTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }

    // Listen for keyboard events (USB scanner)
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in other inputs
      if (e.target !== inputRef.current && (e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      // Clear timeout
      if (scanTimeout.current) {
        clearTimeout(scanTimeout.current);
      }

      // Enter key = end of barcode
      if (e.key === 'Enter' && scanBuffer.current.length > 0) {
        handleBarcodeScan(scanBuffer.current);
        scanBuffer.current = '';
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) {
        scanBuffer.current += e.key;

        // Auto-submit after 100ms of no input
        scanTimeout.current = setTimeout(() => {
          if (scanBuffer.current.length > 0) {
            handleBarcodeScan(scanBuffer.current);
            scanBuffer.current = '';
          }
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (scanTimeout.current) {
        clearTimeout(scanTimeout.current);
      }
    };
  }, []);

  const handleBarcodeScan = async (code: string) => {
    setIsScanning(true);
    setBarcode(code);

    try {
      // Log scan
      await axios.post('/api/v1/barcode-scans', {
        barcode: code,
        scan_type: 'sale'
      });

      // Search product
      const response = await axios.get(`/api/v1/products/by-barcode/${code}`);

      if (response.data) {
        setLastScan({ success: true, message: `✓ ${response.data.name}` });
        onProductFound(response.data);

        // Clear after 2 seconds
        setTimeout(() => {
          setLastScan(null);
          setBarcode('');
        }, 2000);
      } else {
        setLastScan({ success: false, message: '✗ Producto no encontrado' });
        setTimeout(() => setLastScan(null), 3000);
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      setLastScan({ success: false, message: '✗ Error al buscar producto' });
      setTimeout(() => setLastScan(null), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      handleBarcodeScan(barcode.trim());
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center gap-3 mb-3">
        <Scan className="w-6 h-6 text-blue-600" />
        <h3 className="font-semibold text-gray-800">Lector de Código de Barras</h3>
      </div>

      <form onSubmit={handleManualInput} className="space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Escanee o ingrese código de barras..."
            className="w-full p-3 pr-12 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            disabled={isScanning}
          />
          {isScanning && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!barcode.trim() || isScanning}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Scan className="w-4 h-4" />
          Buscar Producto
        </button>
      </form>

      {lastScan && (
        <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
          lastScan.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {lastScan.success ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span className="font-medium">{lastScan.message}</span>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>💡 Consejos:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Conecte el scanner USB y escanee directamente</li>
          <li>O ingrese el código manualmente y presione Enter</li>
          <li>El sistema detecta automáticamente códigos EAN-13, UPC-A, Code-128</li>
        </ul>
      </div>
    </div>
  );
};

export default BarcodeReader;

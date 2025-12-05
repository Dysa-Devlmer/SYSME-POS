import React from 'react';
import { FileText, X, Printer } from 'lucide-react';
import axios from 'axios';

interface PreBoletaModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
  saleData: any;
}

export const PreBoletaModal: React.FC<PreBoletaModalProps> = ({ isOpen, onClose, saleId, saleData }) => {
  if (!isOpen) return null;

  const handlePrint = async () => {
    try {
      await axios.post('/api/v1/print/pre-ticket', { saleId });
      alert('Pre-boleta impresa');
      onClose();
    } catch (error) {
      alert('Error al imprimir');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Pre-Boleta (Vista Previa)
          </h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
          <div className="text-center mb-4">
            <h3 className="font-bold text-lg">PRE-CUENTA</h3>
            <p className="text-sm text-gray-600">No válido como comprobante</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Mesa:</span><span className="font-medium">{saleData.table_number}</span></div>
            <div className="flex justify-between"><span>Mesero:</span><span className="font-medium">{saleData.waiter_name}</span></div>
            <hr />
            {saleData.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span>{item.quantity}x {item.product_name}</span>
                <span>${item.total.toLocaleString()}</span>
              </div>
            ))}
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL:</span>
              <span>${saleData.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">⚠️ Esto es solo una vista previa. La venta permanecerá abierta después de imprimir.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancelar</button>
          <button onClick={handlePrint} className="flex-1 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />
            Imprimir Pre-Boleta
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreBoletaModal;

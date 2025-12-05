import React, { useState } from 'react';
import { DollarSign, X, Save, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface PriceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  productName: string;
  originalPrice: number;
  onConfirm: (newPrice: number, reason: string) => void;
}

export const PriceOverrideModal: React.FC<PriceOverrideModalProps> = ({ isOpen, onClose, itemId, productName, originalPrice, onConfirm }) => {
  const [newPrice, setNewPrice] = useState(originalPrice);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Debe especificar un motivo');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/v1/price-overrides', { itemId, originalPrice, newPrice, reason });
      onConfirm(newPrice, reason);
      onClose();
    } catch (error) {
      alert('Error al cambiar precio. Verifique permisos.');
    } finally {
      setLoading(false);
    }
  };

  const discount = ((originalPrice - newPrice) / originalPrice * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Cambio de Precio
          </h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800">Este cambio quedará registrado en auditoría y requiere autorización.</p>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Producto</label><div className="p-2 bg-gray-50 rounded-lg font-medium">{productName}</div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Precio Original</label><div className="p-2 bg-gray-100 rounded-lg font-medium text-gray-600">${originalPrice.toLocaleString()}</div></div>
            <div><label className="block text-sm font-medium mb-1">Nuevo Precio *</label><input type="number" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} min="0" step="100" className="w-full p-2 border rounded-lg" /></div>
          </div>
          {newPrice < originalPrice && (<div className="bg-green-50 p-2 rounded text-center"><span className="text-sm text-green-800">Descuento: {discount}%</span></div>)}
          {newPrice > originalPrice && (<div className="bg-red-50 p-2 rounded text-center"><span className="text-sm text-red-800">Incremento: {Math.abs(Number(discount))}%</span></div>)}
          <div><label className="block text-sm font-medium mb-1">Motivo del Cambio *</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2 border rounded-lg" rows={3} placeholder="Ej: Descuento especial cliente frecuente, Producto dañado, Promoción, etc." /></div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading || !reason.trim()} className="flex-1 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Aplicar Cambio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceOverrideModal;

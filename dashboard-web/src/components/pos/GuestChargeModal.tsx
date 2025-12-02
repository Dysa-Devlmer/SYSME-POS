import React, { useState } from 'react';
import { Hotel, X, Save } from 'lucide-react';

interface GuestChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleTotal: number;
  onConfirm: (roomNumber: string, guestName: string) => void;
}

export const GuestChargeModal: React.FC<GuestChargeModalProps> = ({ isOpen, onClose, saleTotal, onConfirm }) => {
  const [roomNumber, setRoomNumber] = useState('');
  const [guestName, setGuestName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Hotel className="w-6 h-6" />
            Cargo a Habitación
          </h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">N° Habitación *</label>
            <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Ej: 101" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre Huésped *</label>
            <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="font-medium">Total a cargar:</span>
              <span className="text-xl font-bold text-blue-600">${saleTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancelar</button>
            <button onClick={() => onConfirm(roomNumber, guestName)} disabled={!roomNumber || !guestName} className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
              <Save className="w-4 h-4" />Cargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestChargeModal;

/**
 * GuestChargeModal Component
 * Modal para cargar consumo a habitación de huésped (Hotel Integration)
 * Similar al sistema legacy SYSME TPV v5.04
 */

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../config/chile-config';

interface HotelGuest {
  id: number;
  room_number: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  reservation_id: string;
  credit_limit: number;
  current_charges: number;
  status: 'checked_in' | 'checked_out' | 'due_out';
  vip?: boolean;
  company?: string;
}

interface GuestChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (guest: HotelGuest, signature?: string) => void;
  totalAmount: number;
  guests?: HotelGuest[];
  onSearchGuest?: (query: string) => Promise<HotelGuest[]>;
}

export const GuestChargeModal: React.FC<GuestChargeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  guests = [],
  onSearchGuest
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HotelGuest[]>(guests);
  const [selectedGuest, setSelectedGuest] = useState<HotelGuest | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [requireSignature, setRequireSignature] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedGuest(null);
      setSearchResults(guests.filter(g => g.status === 'checked_in'));
      setNotes('');
    }
  }, [isOpen, guests]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(guests.filter(g => g.status === 'checked_in'));
      return;
    }

    setIsSearching(true);
    try {
      if (onSearchGuest) {
        const results = await onSearchGuest(searchQuery);
        setSearchResults(results);
      } else {
        // Búsqueda local
        const query = searchQuery.toLowerCase();
        const filtered = guests.filter(g =>
          g.status === 'checked_in' && (
            g.room_number.toLowerCase().includes(query) ||
            g.guest_name.toLowerCase().includes(query) ||
            g.reservation_id.toLowerCase().includes(query)
          )
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching guests:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (selectedGuest) {
      onConfirm(selectedGuest);
      onClose();
    }
  };

  const canCharge = (guest: HotelGuest): boolean => {
    const remainingCredit = guest.credit_limit - guest.current_charges;
    return remainingCredit >= totalAmount;
  };

  const getRemainingCredit = (guest: HotelGuest): number => {
    return guest.credit_limit - guest.current_charges;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🏨 Cargo a Habitación
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-violet-100 mt-1">
            Cargar consumo a cuenta de huésped
          </p>
        </div>

        {/* Monto a cargar */}
        <div className="bg-violet-50 p-4 border-b">
          <div className="flex justify-between items-center">
            <span className="text-violet-700 font-medium">Monto a Cargar:</span>
            <span className="text-2xl font-bold text-violet-800">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por habitación, nombre o reserva..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-lg transition-colors"
            >
              {isSearching ? '...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Lista de huéspedes */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl block mb-2">🏨</span>
              <p>No se encontraron huéspedes</p>
              <p className="text-sm">Intente con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map(guest => {
                const canChargeGuest = canCharge(guest);
                const remaining = getRemainingCredit(guest);

                return (
                  <button
                    key={guest.id}
                    onClick={() => canChargeGuest && setSelectedGuest(guest)}
                    disabled={!canChargeGuest}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedGuest?.id === guest.id
                        ? 'border-violet-500 bg-violet-50'
                        : canChargeGuest
                          ? 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                          : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold text-violet-600 bg-violet-100 w-16 h-16 rounded-xl flex items-center justify-center">
                          {guest.room_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg">{guest.guest_name}</h4>
                            {guest.vip && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                ⭐ VIP
                              </span>
                            )}
                          </div>
                          {guest.company && (
                            <p className="text-sm text-gray-500">🏢 {guest.company}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Reserva: {guest.reservation_id}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        {selectedGuest?.id === guest.id && (
                          <span className="text-violet-600 text-2xl">✓</span>
                        )}
                        <div className={`mt-2 text-sm ${
                          canChargeGuest ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {canChargeGuest ? (
                            <>
                              <p>Crédito disponible:</p>
                              <p className="font-bold">{formatCurrency(remaining)}</p>
                            </>
                          ) : (
                            <>
                              <p>⚠️ Crédito insuficiente</p>
                              <p className="font-bold">{formatCurrency(remaining)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info adicional */}
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                      <span>Check-in: {new Date(guest.check_in_date).toLocaleDateString('es-CL')}</span>
                      <span>Check-out: {new Date(guest.check_out_date).toLocaleDateString('es-CL')}</span>
                      <span>Cargos actuales: {formatCurrency(guest.current_charges)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Opciones adicionales */}
        {selectedGuest && (
          <div className="border-t p-4 bg-gray-50">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireSignature}
                  onChange={(e) => setRequireSignature(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm">Requiere firma del huésped</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas adicionales
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Concepto del cargo..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-violet-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          {selectedGuest && (
            <div className="mb-4 p-3 bg-violet-100 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-violet-700">Huésped seleccionado:</p>
                  <p className="font-bold text-violet-800">
                    Hab. {selectedGuest.room_number} - {selectedGuest.guest_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-violet-700">Cargo:</p>
                  <p className="font-bold text-violet-800">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
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
              disabled={!selectedGuest}
              className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors ${
                selectedGuest
                  ? 'bg-violet-500 hover:bg-violet-600 text-white'
                  : 'bg-gray-300 cursor-not-allowed text-gray-500'
              }`}
            >
              🏨 Cargar a Habitación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestChargeModal;

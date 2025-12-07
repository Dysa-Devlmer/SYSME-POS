/**
 * KitchenNotesModal Component
 * Modal para selección rápida de notas de cocina predefinidas
 * Similar al sistema legacy SYSME TPV
 */

import React, { useState } from 'react';

interface KitchenNote {
  id: string;
  label: string;
  category: 'coccion' | 'acompanamiento' | 'especial' | 'tiempo' | 'otro';
  color?: string;
}

interface KitchenNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotes: (notes: string[]) => void;
  productName?: string;
  initialNotes?: string[];
}

// Notas rápidas predefinidas (basadas en sistema legacy)
const KITCHEN_NOTES: KitchenNote[] = [
  // Cocción de carnes
  { id: 'entrada', label: 'ENTRADA', category: 'tiempo', color: 'bg-purple-500' },
  { id: 'plato_unico', label: 'PLATO ÚNICO', category: 'tiempo', color: 'bg-purple-500' },
  { id: 'en_aviso', label: 'EN AVISO', category: 'tiempo', color: 'bg-yellow-500' },
  { id: 'fondo', label: 'FONDO', category: 'tiempo', color: 'bg-purple-500' },

  // Términos de cocción
  { id: 'sellado', label: 'SELLADO', category: 'coccion', color: 'bg-red-600' },
  { id: 'inglesa', label: 'INGLESA', category: 'coccion', color: 'bg-red-500' },
  { id: 'termino_medio', label: 'TÉRMINO MEDIO', category: 'coccion', color: 'bg-orange-500' },
  { id: 'tres_cuartos', label: '3/4', category: 'coccion', color: 'bg-orange-600' },
  { id: 'cocido', label: 'COCIDO', category: 'coccion', color: 'bg-amber-600' },
  { id: 'bien_cocido', label: 'BIEN COCIDO', category: 'coccion', color: 'bg-amber-700' },
  { id: 'a_punto', label: 'A PUNTO', category: 'coccion', color: 'bg-orange-400' },

  // Acompañamientos
  { id: 'con_papas', label: 'CON PAPAS FRITAS', category: 'acompanamiento', color: 'bg-green-500' },
  { id: 'con_ensalada', label: 'CON ENSALADA', category: 'acompanamiento', color: 'bg-green-600' },
  { id: 'con_pure', label: 'CON PURÉ', category: 'acompanamiento', color: 'bg-green-500' },
  { id: 'con_arroz', label: 'CON ARROZ', category: 'acompanamiento', color: 'bg-green-500' },
  { id: 'arroz_blanco', label: 'ARROZ BLANCO', category: 'acompanamiento', color: 'bg-green-400' },

  // Especiales
  { id: 'sin_aji', label: 'SIN AJÍ', category: 'especial', color: 'bg-blue-500' },
  { id: 'con_aji', label: 'CON AJÍ', category: 'especial', color: 'bg-red-500' },
  { id: 'sin_cebolla', label: 'SIN CEBOLLA', category: 'especial', color: 'bg-blue-500' },
  { id: 'sin_sal', label: 'SIN SAL', category: 'especial', color: 'bg-blue-500' },
  { id: 'sin_gluten', label: 'SIN GLUTEN', category: 'especial', color: 'bg-blue-600' },
  { id: 'vegano', label: 'VEGANO', category: 'especial', color: 'bg-green-700' },

  // Otros
  { id: 'para_llevar', label: 'PARA LLEVAR', category: 'otro', color: 'bg-cyan-500' },
  { id: 'sin_hielo', label: 'SIN HIELO', category: 'otro', color: 'bg-cyan-400' },
  { id: 'con_hielo', label: 'CON HIELO', category: 'otro', color: 'bg-cyan-400' },
  { id: 'ya_salio', label: 'YA SALIÓ', category: 'otro', color: 'bg-gray-500' },
  { id: 'urgente', label: 'URGENTE', category: 'otro', color: 'bg-red-700' },
  { id: 'vip', label: 'VIP', category: 'otro', color: 'bg-yellow-600' },
];

const CATEGORY_LABELS: Record<string, string> = {
  tiempo: 'Tiempo',
  coccion: 'Cocción',
  acompanamiento: 'Acompañamiento',
  especial: 'Especial',
  otro: 'Otro'
};

export const KitchenNotesModal: React.FC<KitchenNotesModalProps> = ({
  isOpen,
  onClose,
  onSelectNotes,
  productName,
  initialNotes = []
}) => {
  const [selectedNotes, setSelectedNotes] = useState<string[]>(initialNotes);
  const [customNote, setCustomNote] = useState('');

  if (!isOpen) return null;

  const toggleNote = (noteLabel: string) => {
    setSelectedNotes(prev =>
      prev.includes(noteLabel)
        ? prev.filter(n => n !== noteLabel)
        : [...prev, noteLabel]
    );
  };

  const handleAddCustomNote = () => {
    if (customNote.trim()) {
      setSelectedNotes(prev => [...prev, customNote.trim().toUpperCase()]);
      setCustomNote('');
    }
  };

  const handleAccept = () => {
    onSelectNotes(selectedNotes);
    onClose();
  };

  const handleClear = () => {
    setSelectedNotes([]);
    setCustomNote('');
  };

  const groupedNotes = KITCHEN_NOTES.reduce((acc, note) => {
    if (!acc[note.category]) acc[note.category] = [];
    acc[note.category].push(note);
    return acc;
  }, {} as Record<string, KitchenNote[]>);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
          <h2 className="text-xl font-bold">Notas de Cocina</h2>
          {productName && (
            <p className="text-orange-100 mt-1">Producto: {productName}</p>
          )}
        </div>

        {/* Selected notes preview */}
        {selectedNotes.length > 0 && (
          <div className="bg-gray-100 p-3 border-b">
            <p className="text-sm text-gray-600 mb-2">Notas seleccionadas:</p>
            <div className="flex flex-wrap gap-2">
              {selectedNotes.map((note, index) => (
                <span
                  key={index}
                  className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {note}
                  <button
                    onClick={() => setSelectedNotes(prev => prev.filter((_, i) => i !== index))}
                    className="hover:bg-orange-600 rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(groupedNotes).map(([category, notes]) => (
            <div key={category} className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => toggleNote(note.label)}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all
                      ${selectedNotes.includes(note.label)
                        ? `${note.color || 'bg-orange-500'} text-white ring-2 ring-offset-2 ring-orange-400`
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }
                    `}
                  >
                    {note.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom note input */}
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Nota Personalizada
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNote()}
                placeholder="Escribir nota personalizada..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={handleAddCustomNote}
                disabled={!customNote.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t bg-gray-50 p-4 flex justify-between gap-4">
          <button
            onClick={handleClear}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Limpiar Todo
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAccept}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg transition-colors flex items-center gap-2"
            >
              ✓ Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenNotesModal;

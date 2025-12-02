/**
 * Quick Notes Component for Kitchen Orders
 * Predefined buttons for common kitchen notes
 */

import React, { useState } from 'react';
import { Flame, Leaf, Clock, AlertCircle, Utensils } from 'lucide-react';

interface QuickNote {
  id: string;
  text: string;
  icon: React.ReactNode;
  category: 'cooking' | 'ingredient' | 'special' | 'allergy' | 'timing';
  color: string;
}

interface QuickNotesProps {
  onSelectNote: (note: string) => void;
  onClose?: () => void;
  allowCustom?: boolean;
}

const QUICK_NOTES: QuickNote[] = [
  // Cooking preferences
  { id: '1', text: 'TERMINO MEDIO', icon: <Flame />, category: 'cooking', color: 'bg-orange-500' },
  { id: '2', text: 'TERMINO 3/4', icon: <Flame />, category: 'cooking', color: 'bg-orange-600' },
  { id: '3', text: 'BIEN COCIDO', icon: <Flame />, category: 'cooking', color: 'bg-red-500' },
  { id: '4', text: 'POCO COCIDO', icon: <Flame />, category: 'cooking', color: 'bg-pink-500' },

  // Ingredient modifications
  { id: '5', text: 'SIN SAL', icon: <Leaf />, category: 'ingredient', color: 'bg-green-500' },
  { id: '6', text: 'SIN CEBOLLA', icon: <Leaf />, category: 'ingredient', color: 'bg-green-600' },
  { id: '7', text: 'SIN AJO', icon: <Leaf />, category: 'ingredient', color: 'bg-green-700' },
  { id: '8', text: 'EXTRA PICANTE', icon: <Flame />, category: 'ingredient', color: 'bg-red-600' },
  { id: '9', text: 'POCO PICANTE', icon: <Flame />, category: 'ingredient', color: 'bg-yellow-500' },

  // Side dish substitutions
  { id: '10', text: 'PAPAS EN VEZ DE ARROZ', icon: <Utensils />, category: 'ingredient', color: 'bg-blue-500' },
  { id: '11', text: 'ARROZ EN VEZ DE PAPAS', icon: <Utensils />, category: 'ingredient', color: 'bg-blue-600' },
  { id: '12', text: 'ENSALADA EXTRA', icon: <Leaf />, category: 'ingredient', color: 'bg-green-400' },

  // Allergies and restrictions
  { id: '13', text: 'SIN GLUTEN', icon: <AlertCircle />, category: 'allergy', color: 'bg-red-700' },
  { id: '14', text: 'SIN LACTOSA', icon: <AlertCircle />, category: 'allergy', color: 'bg-purple-600' },
  { id: '15', text: 'VEGETARIANO', icon: <Leaf />, category: 'allergy', color: 'bg-green-500' },
  { id: '16', text: 'VEGANO', icon: <Leaf />, category: 'allergy', color: 'bg-green-700' },

  // Special requests
  { id: '17', text: 'PARA LLEVAR', icon: <AlertCircle />, category: 'special', color: 'bg-indigo-500' },
  { id: '18', text: 'PARA COMPARTIR', icon: <Utensils />, category: 'special', color: 'bg-indigo-600' },
  { id: '19', text: 'SEPARADO', icon: <Utensils />, category: 'special', color: 'bg-purple-500' },

  // Timing
  { id: '20', text: 'URGENTE', icon: <Clock />, category: 'timing', color: 'bg-red-600 animate-pulse' },
  { id: '21', text: 'NO APURAR', icon: <Clock />, category: 'timing', color: 'bg-gray-500' }
];

export const QuickNotes: React.FC<QuickNotesProps> = ({
  onSelectNote,
  onClose,
  allowCustom = true
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customNote, setCustomNote] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const categories = [
    { id: 'all', name: 'Todas', icon: <Utensils /> },
    { id: 'cooking', name: 'Cocción', icon: <Flame /> },
    { id: 'ingredient', name: 'Ingredientes', icon: <Leaf /> },
    { id: 'allergy', name: 'Alergias', icon: <AlertCircle /> },
    { id: 'timing', name: 'Prioridad', icon: <Clock /> },
    { id: 'special', name: 'Especial', icon: <Utensils /> }
  ];

  const filteredNotes = selectedCategory === 'all'
    ? QUICK_NOTES
    : QUICK_NOTES.filter(note => note.category === selectedCategory);

  const handleNoteClick = (noteText: string) => {
    onSelectNote(noteText);
  };

  const handleCustomNote = () => {
    if (customNote.trim()) {
      onSelectNote(customNote.toUpperCase());
      setCustomNote('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Notas Rápidas para Cocina</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`
              px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap
              ${selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
              }
            `}
          >
            {cat.icon}
            <span className="text-sm">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Quick Notes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 max-h-96 overflow-y-auto">
        {filteredNotes.map(note => (
          <button
            key={note.id}
            onClick={() => handleNoteClick(note.text)}
            className={`
              ${note.color} text-white p-4 rounded-lg
              flex flex-col items-center justify-center gap-2
              hover:opacity-90 transition-all
              text-sm font-medium text-center
            `}
          >
            {note.icon}
            {note.text}
          </button>
        ))}
      </div>

      {/* Custom Note */}
      {allowCustom && (
        <div className="border-t pt-4">
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium"
            >
              + Nota Personalizada
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomNote()}
                placeholder="Escribe una nota personalizada..."
                className="flex-1 px-4 py-2 border rounded-lg"
                autoFocus
              />
              <button
                onClick={handleCustomNote}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Agregar
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomNote('');
                }}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Notes (Optional) */}
      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-2">💡 Consejo:</p>
        <p>Las notas se mostrarán en la comanda de cocina para mejor comunicación</p>
      </div>
    </div>
  );
};

export default QuickNotes;
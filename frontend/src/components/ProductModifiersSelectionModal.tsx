/**
 * ProductModifiersSelectionModal Component
 * Modal for waiters to select modifiers when adding a product in POS
 * Displays all modifier groups assigned to the selected product
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import modifiersApiService, {
  ModifierGroup,
  Modifier
} from '@/api/modifiersService';

interface ProductModifiersSelectionModalProps {
  productId: number;
  productName: string;
  productPrice: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedModifiers: SelectedModifier[], modifierCost: number) => void;
}

export interface SelectedModifier {
  modifier_id: number;
  modifier_name: string;
  modifier_price: number;
  group_id: number;
  group_name: string;
  quantity: number;
}

interface ModifierGroupWithSelection extends ModifierGroup {
  selectedModifiers: number[]; // IDs of selected modifiers
}

const ProductModifiersSelectionModal: React.FC<ProductModifiersSelectionModalProps> = ({
  productId,
  productName,
  productPrice,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [groups, setGroups] = useState<ModifierGroupWithSelection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadProductModifiers();
    }
  }, [isOpen, productId]);

  const loadProductModifiers = async () => {
    setIsLoading(true);
    setValidationErrors({});
    try {
      // Get modifier groups assigned to this product
      const productGroups = await modifiersApiService.products.getProductModifierGroups(productId);

      // Initialize selection state
      const groupsWithSelection: ModifierGroupWithSelection[] = productGroups.map((group) => ({
        ...group,
        selectedModifiers: group.is_default && group.modifiers
          ? group.modifiers.filter(m => m.is_default).map(m => m.id)
          : []
      }));

      setGroups(groupsWithSelection);
    } catch (error: any) {
      console.error('Error loading product modifiers:', error);
      toast.error('Error al cargar modificadores del producto');
      // If no modifiers, continue without them
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifierToggle = (groupId: number, modifierId: number) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id !== groupId) return group;

        const isCurrentlySelected = group.selectedModifiers.includes(modifierId);

        let newSelection: number[];

        if (group.max_selections === 1) {
          // Radio button behavior: only one selection allowed
          newSelection = isCurrentlySelected ? [] : [modifierId];
        } else {
          // Checkbox behavior: multiple selections
          if (isCurrentlySelected) {
            // Deselect
            newSelection = group.selectedModifiers.filter(id => id !== modifierId);
          } else {
            // Select (if not at max)
            if (group.selectedModifiers.length < group.max_selections) {
              newSelection = [...group.selectedModifiers, modifierId];
            } else {
              toast.error(`Máximo ${group.max_selections} selecciones para ${group.name}`);
              return group;
            }
          }
        }

        return {
          ...group,
          selectedModifiers: newSelection
        };
      })
    );

    // Clear validation error for this group
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[groupId];
      return newErrors;
    });
  };

  const validateSelections = (): boolean => {
    const errors: Record<number, string> = {};

    groups.forEach((group) => {
      const selectedCount = group.selectedModifiers.length;

      if (selectedCount < group.min_selections) {
        errors[group.id] = `Selecciona al menos ${group.min_selections} opción(es)`;
      }

      if (selectedCount > group.max_selections) {
        errors[group.id] = `Máximo ${group.max_selections} opción(es)`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateTotalModifierCost = (): number => {
    let total = 0;

    groups.forEach((group) => {
      group.selectedModifiers.forEach((modifierId) => {
        const modifier = group.modifiers?.find(m => m.id === modifierId);
        if (modifier) {
          total += modifier.price;
        }
      });
    });

    return total;
  };

  const handleConfirm = () => {
    if (!validateSelections()) {
      toast.error('Por favor completa todas las selecciones requeridas');
      return;
    }

    // Build selected modifiers array
    const selectedModifiers: SelectedModifier[] = [];

    groups.forEach((group) => {
      group.selectedModifiers.forEach((modifierId) => {
        const modifier = group.modifiers?.find(m => m.id === modifierId);
        if (modifier) {
          selectedModifiers.push({
            modifier_id: modifier.id,
            modifier_name: modifier.name,
            modifier_price: modifier.price,
            group_id: group.id,
            group_name: group.name,
            quantity: 1
          });
        }
      });
    });

    const modifierCost = calculateTotalModifierCost();
    onConfirm(selectedModifiers, modifierCost);
  };

  const handleSkip = () => {
    // Allow skip only if all groups are optional (min_selections = 0)
    const hasRequiredGroups = groups.some(g => g.min_selections > 0);

    if (hasRequiredGroups) {
      toast.error('Este producto tiene modificadores requeridos');
      return;
    }

    onConfirm([], 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full m-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                🔧 Personalizar Producto
              </h3>
              <p className="text-lg text-gray-700 mt-1 font-medium">
                {productName}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Precio base: ${productPrice.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando modificadores...</p>
              </div>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Este producto no tiene modificadores
              </h3>
              <p className="text-gray-600">
                Puedes agregarlo directamente sin personalización.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => {
                const selectedCount = group.selectedModifiers.length;
                const hasError = !!validationErrors[group.id];

                return (
                  <div
                    key={group.id}
                    className={`border rounded-lg p-5 ${
                      hasError
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Group Header */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-bold text-gray-900">
                          {group.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          {group.min_selections > 0 && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                              REQUERIDO
                            </span>
                          )}
                          <span className="text-sm text-gray-600 font-medium">
                            {selectedCount}/{group.max_selections}
                          </span>
                        </div>
                      </div>

                      {group.description && (
                        <p className="text-sm text-gray-600">{group.description}</p>
                      )}

                      <p className="text-xs text-gray-500 mt-1">
                        {group.min_selections === group.max_selections
                          ? `Selecciona ${group.min_selections}`
                          : `Selecciona entre ${group.min_selections} y ${group.max_selections}`}
                      </p>

                      {hasError && (
                        <p className="text-sm text-red-600 mt-2 font-medium">
                          ⚠️ {validationErrors[group.id]}
                        </p>
                      )}
                    </div>

                    {/* Modifiers List */}
                    <div className="space-y-2">
                      {group.modifiers?.map((modifier) => {
                        const isSelected = group.selectedModifiers.includes(modifier.id);
                        const inputType = group.max_selections === 1 ? 'radio' : 'checkbox';

                        return (
                          <label
                            key={modifier.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-purple-100 border-2 border-purple-500'
                                : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type={inputType}
                                name={`group-${group.id}`}
                                checked={isSelected}
                                onChange={() => handleModifierToggle(group.id, modifier.id)}
                                className="w-5 h-5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                              />
                              <span className="font-medium text-gray-900">
                                {modifier.name}
                              </span>
                            </div>
                            <span className={`font-bold ${
                              modifier.price > 0 ? 'text-green-600' :
                              modifier.price < 0 ? 'text-red-600' :
                              'text-gray-500'
                            }`}>
                              {modifier.price > 0 ? '+' : ''}
                              ${modifier.price.toLocaleString()}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Total con modificadores:</p>
              <p className="text-2xl font-bold text-purple-600">
                ${(productPrice + calculateTotalModifierCost()).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {groups.length > 0 && groups.every(g => g.min_selections === 0) && (
              <button
                onClick={handleSkip}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Sin Modificadores
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              ✅ Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModifiersSelectionModal;

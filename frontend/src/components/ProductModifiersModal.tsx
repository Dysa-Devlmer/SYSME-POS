/**
 * ProductModifiersModal Component
 * Modal to assign modifier groups to a specific product
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import modifiersApiService, {
  ModifierGroup,
  ModifierGroupAssignment,
  ProductModifierGroup
} from '@/api/modifiersService';

interface ProductModifiersModalProps {
  productId: number;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface GroupAssignmentState extends ModifierGroup {
  isAssigned: boolean;
  isRequired: boolean;
  displayOrder: number;
}

const ProductModifiersModal: React.FC<ProductModifiersModalProps> = ({
  productId,
  productName,
  isOpen,
  onClose,
  onSave
}) => {
  const [allGroups, setAllGroups] = useState<ModifierGroup[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<ProductModifierGroup[]>([]);
  const [groupStates, setGroupStates] = useState<GroupAssignmentState[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, productId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all available modifier groups
      const groups = await modifiersApiService.groups.getAll(true); // Only active groups
      setAllGroups(groups);

      // Load currently assigned groups for this product
      const assigned = await modifiersApiService.products.getProductModifierGroups(productId);
      setAssignedGroups(assigned);

      // Merge the data to create the state
      const states: GroupAssignmentState[] = groups.map((group) => {
        const assignedGroup = assigned.find((a) => a.id === group.id);
        return {
          ...group,
          isAssigned: !!assignedGroup,
          isRequired: assignedGroup ? true : false, // From product_modifier_groups.is_required
          displayOrder: assignedGroup ? assigned.indexOf(assignedGroup) + 1 : 999
        };
      });

      // Sort by display order (assigned first)
      states.sort((a, b) => {
        if (a.isAssigned && !b.isAssigned) return -1;
        if (!a.isAssigned && b.isAssigned) return 1;
        return a.displayOrder - b.displayOrder;
      });

      setGroupStates(states);
    } catch (error: any) {
      console.error('Error loading modifier groups:', error);
      toast.error('Error al cargar grupos de modificadores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAssignment = (groupId: number) => {
    setGroupStates((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, isAssigned: !g.isAssigned }
          : g
      )
    );
  };

  const handleToggleRequired = (groupId: number) => {
    setGroupStates((prev) =>
      prev.map((g) =>
        g.id === groupId && g.isAssigned
          ? { ...g, isRequired: !g.isRequired }
          : g
      )
    );
  };

  const handleMoveUp = (groupId: number) => {
    setGroupStates((prev) => {
      const index = prev.findIndex((g) => g.id === groupId);
      if (index <= 0) return prev;

      const newStates = [...prev];
      [newStates[index - 1], newStates[index]] = [newStates[index], newStates[index - 1]];

      // Update display orders
      return newStates.map((g, i) => ({ ...g, displayOrder: i + 1 }));
    });
  };

  const handleMoveDown = (groupId: number) => {
    setGroupStates((prev) => {
      const index = prev.findIndex((g) => g.id === groupId);
      if (index < 0 || index >= prev.length - 1) return prev;

      const newStates = [...prev];
      [newStates[index], newStates[index + 1]] = [newStates[index + 1], newStates[index]];

      // Update display orders
      return newStates.map((g, i) => ({ ...g, displayOrder: i + 1 }));
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build the assignment array with only assigned groups
      const assignments: ModifierGroupAssignment[] = groupStates
        .filter((g) => g.isAssigned)
        .map((g, index) => ({
          modifier_group_id: g.id,
          is_required: g.isRequired,
          display_order: index + 1
        }));

      await modifiersApiService.products.assignGroupsToProduct(productId, assignments);

      toast.success(`Modificadores asignados a "${productName}"`);

      if (onSave) {
        onSave();
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving modifier assignments:', error);
      toast.error(error.response?.data?.message || 'Error al guardar asignaciones');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full m-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                🔧 Modificadores del Producto
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {productName}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Selecciona los grupos de modificadores que se aplicarán a este producto
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : groupStates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay grupos de modificadores disponibles
              </h3>
              <p className="text-gray-600">
                Primero debes crear grupos de modificadores en la sección de Modificadores.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupStates.map((group, index) => (
                <div
                  key={group.id}
                  className={`border rounded-lg p-4 transition-all ${
                    group.isAssigned
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={group.isAssigned}
                        onChange={() => handleToggleAssignment(group.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Group Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{group.name}</h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            group.type === 'required'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {group.type === 'required' ? 'Obligatorio' : 'Opcional'}
                        </span>
                        {group.modifiers_count !== undefined && (
                          <span className="text-xs text-gray-500">
                            ({group.modifiers_count} modificadores)
                          </span>
                        )}
                      </div>

                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      )}

                      <div className="text-xs text-gray-500 mt-2">
                        Selecciones: {group.min_selections} - {group.max_selections}
                      </div>

                      {/* Required Toggle (only if assigned) */}
                      {group.isAssigned && (
                        <div className="mt-3 flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={group.isRequired}
                              onChange={() => handleToggleRequired(group.id)}
                              className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">
                              Requerido para este producto
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Order Controls (only if assigned) */}
                    {group.isAssigned && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveUp(group.id)}
                          disabled={index === 0}
                          className={`p-1 rounded ${
                            index === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Mover arriba"
                        >
                          ▲
                        </button>
                        <span className="text-xs text-center text-gray-500">
                          #{group.displayOrder}
                        </span>
                        <button
                          onClick={() => handleMoveDown(group.id)}
                          disabled={index === groupStates.length - 1}
                          className={`p-1 rounded ${
                            index === groupStates.length - 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Mover abajo"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {groupStates.filter((g) => g.isAssigned).length} grupos asignados
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Guardando...' : 'Guardar Asignaciones'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModifiersModal;

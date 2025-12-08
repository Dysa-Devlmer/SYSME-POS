import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import modifiersApiService, { ModifierGroup, Modifier } from '@/api/modifiersService';

const ModifiersPage: React.FC = () => {
  // State
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);

  // Form data
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    type: 'optional' as 'required' | 'optional',
    min_selections: 0,
    max_selections: 1,
    display_order: 0
  });

  const [modifierForm, setModifierForm] = useState({
    group_id: 0,
    name: '',
    code: '',
    price: 0,
    is_default: false,
    display_order: 0
  });

  // Load data
  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadModifiers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const data = await modifiersApiService.groups.getAll();
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    } catch (error: any) {
      toast.error('Error al cargar grupos de modificadores');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModifiers = async (groupId: number) => {
    try {
      const data = await modifiersApiService.modifiers.getAll(groupId);
      setModifiers(data);
    } catch (error: any) {
      toast.error('Error al cargar modificadores');
      console.error(error);
    }
  };

  // Group handlers
  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      name: '',
      description: '',
      type: 'optional',
      min_selections: 0,
      max_selections: 1,
      display_order: groups.length
    });
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: ModifierGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      type: group.type,
      min_selections: group.min_selections,
      max_selections: group.max_selections,
      display_order: group.display_order
    });
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      if (editingGroup) {
        await modifiersApiService.groups.update(editingGroup.id, groupForm);
        toast.success('Grupo actualizado exitosamente');
      } else {
        await modifiersApiService.groups.create(groupForm);
        toast.success('Grupo creado exitosamente');
      }
      setShowGroupModal(false);
      await loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar grupo');
    }
  };

  const handleDeleteGroup = async (group: ModifierGroup) => {
    if (!confirm(`¿Eliminar el grupo "${group.name}"? Esto también desactivará todos sus modificadores.`)) {
      return;
    }

    try {
      await modifiersApiService.groups.delete(group.id);
      toast.success('Grupo eliminado exitosamente');
      await loadGroups();
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(groups[0] || null);
      }
    } catch (error: any) {
      toast.error('Error al eliminar grupo');
    }
  };

  // Modifier handlers
  const handleCreateModifier = () => {
    if (!selectedGroup) {
      toast.error('Selecciona un grupo primero');
      return;
    }

    setEditingModifier(null);
    setModifierForm({
      group_id: selectedGroup.id,
      name: '',
      code: '',
      price: 0,
      is_default: false,
      display_order: modifiers.length
    });
    setShowModifierModal(true);
  };

  const handleEditModifier = (modifier: Modifier) => {
    setEditingModifier(modifier);
    setModifierForm({
      group_id: modifier.group_id,
      name: modifier.name,
      code: modifier.code || '',
      price: modifier.price,
      is_default: modifier.is_default,
      display_order: modifier.display_order
    });
    setShowModifierModal(true);
  };

  const handleSaveModifier = async () => {
    if (!modifierForm.name) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      if (editingModifier) {
        await modifiersApiService.modifiers.update(editingModifier.id, modifierForm);
        toast.success('Modificador actualizado exitosamente');
      } else {
        await modifiersApiService.modifiers.create(modifierForm);
        toast.success('Modificador creado exitosamente');
      }
      setShowModifierModal(false);
      if (selectedGroup) {
        await loadModifiers(selectedGroup.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar modificador');
    }
  };

  const handleDeleteModifier = async (modifier: Modifier) => {
    if (!confirm(`¿Eliminar el modificador "${modifier.name}"?`)) {
      return;
    }

    try {
      await modifiersApiService.modifiers.delete(modifier.id);
      toast.success('Modificador eliminado exitosamente');
      if (selectedGroup) {
        await loadModifiers(selectedGroup.id);
      }
    } catch (error: any) {
      toast.error('Error al eliminar modificador');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Modificadores</h1>
            <p className="text-gray-600 mt-1">
              Configura las personalizaciones disponibles para tus productos
            </p>
          </div>
          <button
            onClick={handleCreateGroup}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            ➕ Nuevo Grupo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Grupos de Modificadores</h3>
            <p className="text-sm text-gray-500 mt-1">{groups.length} grupos</p>
          </div>

          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {groups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>No hay grupos creados</p>
                <p className="text-sm mt-1">Crea tu primer grupo para comenzar</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedGroup?.id === group.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          group.type === 'required'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {group.type === 'required' ? '⚠️ Obligatorio' : '✅ Opcional'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {group.modifiers_count || 0} modificadores
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Min: {group.min_selections} | Max: {group.max_selections === 0 ? '∞' : group.max_selections}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditGroup(group);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group);
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modifiers List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedGroup ? `Modificadores de "${selectedGroup.name}"` : 'Selecciona un grupo'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{modifiers.length} modificadores</p>
              </div>
              {selectedGroup && (
                <button
                  onClick={handleCreateModifier}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  ➕ Nuevo Modificador
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            {!selectedGroup ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Selecciona un grupo para ver sus modificadores</p>
              </div>
            ) : modifiers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No hay modificadores en este grupo</p>
                <button
                  onClick={handleCreateModifier}
                  className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Crear primer modificador
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modifiers.map((modifier) => (
                  <div
                    key={modifier.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{modifier.name}</h4>
                        {modifier.code && (
                          <p className="text-sm text-gray-500 mt-1">Código: {modifier.code}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-lg font-semibold ${
                            modifier.price > 0 ? 'text-green-600' :
                            modifier.price < 0 ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {modifier.price > 0 && '+'}${modifier.price.toFixed(2)}
                          </span>
                          {modifier.is_default && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Por defecto
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditModifier(modifier)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteModifier(modifier)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Ingredientes a Remover"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Descripción opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={groupForm.type}
                  onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value as 'required' | 'optional' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="optional">Opcional</option>
                  <option value="required">Obligatorio</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mín. Selecciones
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={groupForm.min_selections}
                    onChange={(e) => setGroupForm({ ...groupForm, min_selections: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máx. Selecciones
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={groupForm.max_selections}
                    onChange={(e) => setGroupForm({ ...groupForm, max_selections: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = ilimitado</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGroup}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {editingGroup ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifier Modal */}
      {showModifierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingModifier ? 'Editar Modificador' : 'Nuevo Modificador'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={modifierForm.name}
                  onChange={(e) => setModifierForm({ ...modifierForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Extra queso"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código (Cocina)
                </label>
                <input
                  type="text"
                  value={modifierForm.code}
                  onChange={(e) => setModifierForm({ ...modifierForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: EQ"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={modifierForm.price}
                  onChange={(e) => setModifierForm({ ...modifierForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Positivo para extras, negativo para descuentos, 0 para sin costo
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={modifierForm.is_default}
                  onChange={(e) => setModifierForm({ ...modifierForm, is_default: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                  Seleccionado por defecto
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowModifierModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModifier}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {editingModifier ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModifiersPage;

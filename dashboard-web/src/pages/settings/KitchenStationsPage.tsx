/**
 * Kitchen Stations Configuration Page
 * Multi-kitchen management with product assignments
 */

import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Edit, Save, X } from 'lucide-react';
import axios from 'axios';

interface KitchenStation {
  id: number;
  code: string;
  name: string;
  description: string;
  printer: string;
  color: string;
  display_order: number;
  active: boolean;
}

export const KitchenStationsPage: React.FC = () => {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<KitchenStation>>({});

  const defaultColors = [
    '#EF4444', // Red
    '#10B981', // Green
    '#3B82F6', // Blue
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EC4899'  // Pink
  ];

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/v1/kitchen-stations');
      setStations(response.data);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (station: KitchenStation) => {
    setEditingId(station.id);
    setFormData(station);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const saveStation = async () => {
    try {
      if (editingId && editingId > 0) {
        await axios.put(`/api/v1/kitchen-stations/${editingId}`, formData);
      } else {
        await axios.post('/api/v1/kitchen-stations', formData);
      }
      fetchStations();
      cancelEdit();
      alert('Estación guardada exitosamente');
    } catch (error) {
      console.error('Error saving station:', error);
      alert('Error al guardar la estación');
    }
  };

  const toggleActive = async (stationId: number, active: boolean) => {
    try {
      await axios.patch(`/api/v1/kitchen-stations/${stationId}`, { active: !active });
      fetchStations();
    } catch (error) {
      console.error('Error toggling station:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🍳 Estaciones de Cocina</h1>
          <p className="text-gray-600">Gestiona múltiples estaciones de preparación</p>
        </div>
        <button
          onClick={() => {
            setEditingId(0);
            setFormData({
              active: true,
              color: defaultColors[stations.length % defaultColors.length],
              display_order: stations.length + 1
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Estación
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estaciones...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stations.map(station => (
            <div
              key={station.id}
              className="bg-white rounded-lg shadow-md p-6 border-t-4"
              style={{ borderTopColor: station.color }}
            >
              {editingId === station.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Nombre de la estación"
                  />
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Código (ej: COCINA-1)"
                  />
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Descripción"
                    rows={2}
                  />
                  <input
                    type="text"
                    value={formData.printer || ''}
                    onChange={(e) => setFormData({ ...formData, printer: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Impresora"
                  />
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Color</label>
                    <div className="flex space-x-2">
                      {defaultColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveStation}
                      className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                    >
                      <X className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <ChefHat className="w-8 h-8" style={{ color: station.color }} />
                    <span className={`px-2 py-1 rounded text-xs ${
                      station.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {station.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-2">{station.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{station.code}</p>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {station.description}
                  </p>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Impresora:</span>
                      <span className="font-medium text-xs">{station.printer || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Orden:</span>
                      <span className="font-medium">{station.display_order}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(station)}
                      className="flex-1 bg-blue-100 text-blue-700 py-2 rounded hover:bg-blue-200 flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Editar</span>
                    </button>
                    <button
                      onClick={() => toggleActive(station.id, station.active)}
                      className={`flex-1 py-2 rounded text-sm ${
                        station.active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {station.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {editingId === 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-300">
              <h3 className="text-lg font-bold mb-4">Nueva Estación</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Código"
                />
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Descripción"
                  rows={2}
                />
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Color</label>
                  <div className="flex space-x-2">
                    {defaultColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={saveStation}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  >
                    Crear
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stations.length === 0 && !loading && editingId !== 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No hay estaciones de cocina configuradas</p>
          <p className="text-sm text-gray-500 mt-2">
            Crea una nueva estación para comenzar
          </p>
        </div>
      )}
    </div>
  );
};

export default KitchenStationsPage;

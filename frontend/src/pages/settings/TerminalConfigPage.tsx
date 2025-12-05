/**
 * Terminal Configuration Page
 * Configure multiple POS terminals with independent settings
 */

import React, { useState, useEffect } from 'react';
import { Monitor, Plus, Edit, Save, X, Printer } from 'lucide-react';
import axios from 'axios';

interface Terminal {
  id: number;
  code: string;
  name: string;
  location: string;
  terminal_type: 'pos' | 'kitchen' | 'bar' | 'delivery';
  main_printer: string;
  kitchen_printer: string;
  cash_drawer_enabled: boolean;
  barcode_scanner_enabled: boolean;
  active: boolean;
}

export const TerminalConfigPage: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Terminal>>({});

  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/v1/terminals');
      setTerminals(response.data);
    } catch (error) {
      console.error('Error fetching terminals:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (terminal: Terminal) => {
    setEditingId(terminal.id);
    setFormData(terminal);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const saveTerminal = async () => {
    try {
      if (editingId) {
        await axios.put(`/api/v1/terminals/${editingId}`, formData);
      } else {
        await axios.post('/api/v1/terminals', formData);
      }
      fetchTerminals();
      cancelEdit();
      alert('Terminal guardado exitosamente');
    } catch (error) {
      console.error('Error saving terminal:', error);
      alert('Error al guardar el terminal');
    }
  };

  const toggleActive = async (terminalId: number, active: boolean) => {
    try {
      await axios.patch(`/api/v1/terminals/${terminalId}`, { active: !active });
      fetchTerminals();
    } catch (error) {
      console.error('Error toggling terminal:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      pos: '💳 POS',
      kitchen: '🍳 Cocina',
      bar: '🍺 Bar',
      delivery: '🚚 Delivery'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🖥️ Configuración de Terminales</h1>
          <p className="text-gray-600">Gestiona los terminales TPV del sistema</p>
        </div>
        <button
          onClick={() => {
            setEditingId(0);
            setFormData({ active: true, cash_drawer_enabled: true });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Terminal
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando terminales...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terminals.map(terminal => (
            <div
              key={terminal.id}
              className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                terminal.active ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              {editingId === terminal.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Nombre del terminal"
                  />
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Código (ej: POS-01)"
                  />
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="Ubicación"
                  />
                  <select
                    value={formData.terminal_type || 'pos'}
                    onChange={(e) => setFormData({ ...formData, terminal_type: e.target.value as any })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="pos">POS</option>
                    <option value="kitchen">Cocina</option>
                    <option value="bar">Bar</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveTerminal}
                      className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{terminal.name}</h3>
                      <p className="text-sm text-gray-600">{terminal.code}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      terminal.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {terminal.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">{getTypeLabel(terminal.terminal_type)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Ubicación:</span>
                      <span className="font-medium">{terminal.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Impresora:</span>
                      <span className="font-medium text-xs">{terminal.main_printer || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Cajón:</span>
                      <span>{terminal.cash_drawer_enabled ? '✓' : '✗'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Scanner:</span>
                      <span>{terminal.barcode_scanner_enabled ? '✓' : '✗'}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(terminal)}
                      className="flex-1 bg-blue-100 text-blue-700 py-2 rounded hover:bg-blue-200 flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActive(terminal.id, terminal.active)}
                      className={`flex-1 py-2 rounded ${
                        terminal.active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {terminal.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {editingId === 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-300">
              <h3 className="text-lg font-bold mb-4">Nuevo Terminal</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Nombre del terminal"
                />
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Código (ej: POS-03)"
                />
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Ubicación"
                />
                <select
                  value={formData.terminal_type || 'pos'}
                  onChange={(e) => setFormData({ ...formData, terminal_type: e.target.value as any })}
                  className="w-full p-2 border rounded"
                >
                  <option value="pos">POS</option>
                  <option value="kitchen">Cocina</option>
                  <option value="bar">Bar</option>
                  <option value="delivery">Delivery</option>
                </select>
                <div className="flex space-x-2">
                  <button
                    onClick={saveTerminal}
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

      {terminals.length === 0 && !loading && editingId !== 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No hay terminales configurados</p>
          <p className="text-sm text-gray-500 mt-2">
            Crea un nuevo terminal para comenzar
          </p>
        </div>
      )}
    </div>
  );
};

export default TerminalConfigPage;

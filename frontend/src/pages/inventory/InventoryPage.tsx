import React, { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  category_name: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit_cost: number;
  last_updated: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  supplier?: string;
  location?: string;
}

interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  created_at: string;
  user_name: string;
}

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showMovementHistory, setShowMovementHistory] = useState(false);

  // Form states for stock movement
  const [movementData, setMovementData] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchMovements();
  }, []);

  const fetchInventory = async () => {
    try {
      // Simular datos de inventario
      const inventoryData: InventoryItem[] = [
        {
          id: 1,
          product_id: 1,
          product_name: 'Hamburguesa Clásica',
          category_name: 'Platos Principales',
          current_stock: 25,
          min_stock: 10,
          max_stock: 50,
          unit_cost: 8.50,
          last_updated: new Date().toISOString(),
          status: 'in_stock',
          supplier: 'Carnes Premium S.A.',
          location: 'Refrigerador A'
        },
        {
          id: 2,
          product_id: 2,
          product_name: 'Pizza Margarita',
          category_name: 'Pizzas',
          current_stock: 5,
          min_stock: 8,
          max_stock: 30,
          unit_cost: 12.00,
          last_updated: new Date().toISOString(),
          status: 'low_stock',
          supplier: 'Ingredientes Italia',
          location: 'Congelador B'
        },
        {
          id: 3,
          product_id: 3,
          product_name: 'Ensalada César',
          category_name: 'Ensaladas',
          current_stock: 30,
          min_stock: 15,
          max_stock: 40,
          unit_cost: 6.75,
          last_updated: new Date().toISOString(),
          status: 'in_stock',
          supplier: 'Verduras Frescas',
          location: 'Refrigerador C'
        },
        {
          id: 4,
          product_id: 4,
          product_name: 'Coca Cola',
          category_name: 'Bebidas',
          current_stock: 0,
          min_stock: 20,
          max_stock: 100,
          unit_cost: 1.50,
          last_updated: new Date().toISOString(),
          status: 'out_of_stock',
          supplier: 'Distribuidora Bebidas',
          location: 'Almacén Principal'
        },
        {
          id: 5,
          product_id: 5,
          product_name: 'Pasta Alfredo',
          category_name: 'Pastas',
          current_stock: 18,
          min_stock: 12,
          max_stock: 35,
          unit_cost: 9.25,
          last_updated: new Date().toISOString(),
          status: 'in_stock',
          supplier: 'Pastas Artesanales',
          location: 'Despensa A'
        },
        {
          id: 6,
          product_id: 6,
          product_name: 'Papas Fritas',
          category_name: 'Acompañamientos',
          current_stock: 3,
          min_stock: 10,
          max_stock: 25,
          unit_cost: 4.50,
          last_updated: new Date().toISOString(),
          status: 'low_stock',
          supplier: 'Vegetales del Campo',
          location: 'Despensa B'
        }
      ];
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      // Simular movimientos de stock
      const movementsData: StockMovement[] = [
        {
          id: 1,
          product_id: 1,
          product_name: 'Hamburguesa Clásica',
          type: 'out',
          quantity: 5,
          reason: 'Venta regular',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user_name: 'María García'
        },
        {
          id: 2,
          product_id: 2,
          product_name: 'Pizza Margarita',
          type: 'in',
          quantity: 10,
          reason: 'Compra proveedor',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          user_name: 'Carlos López'
        },
        {
          id: 3,
          product_id: 4,
          product_name: 'Coca Cola',
          type: 'out',
          quantity: 20,
          reason: 'Venta de inventario',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          user_name: 'Ana Rodríguez'
        },
        {
          id: 4,
          product_id: 6,
          product_name: 'Papas Fritas',
          type: 'adjustment',
          quantity: -2,
          reason: 'Merma por vencimiento',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          user_name: 'Pedro Silva'
        },
        {
          id: 5,
          product_id: 3,
          product_name: 'Ensalada César',
          type: 'in',
          quantity: 15,
          reason: 'Reposición semanal',
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          user_name: 'Laura Vega'
        }
      ];
      setMovements(movementsData);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in_stock':
        return '✅';
      case 'low_stock':
        return '⚠️';
      case 'out_of_stock':
        return '❌';
      default:
        return '❓';
    }
  };

  const getMovementColor = (type: StockMovement['type']) => {
    switch (type) {
      case 'in':
        return 'text-green-600';
      case 'out':
        return 'text-red-600';
      case 'adjustment':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMovementIcon = (type: StockMovement['type']) => {
    switch (type) {
      case 'in':
        return '📥';
      case 'out':
        return '📤';
      case 'adjustment':
        return '🔧';
      default:
        return '❓';
    }
  };

  const inventoryFiltrado = inventory.filter(item => {
    const matchSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.category_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filtroEstado === 'todos' || item.status === filtroEstado;

    return matchSearch && matchStatus;
  });

  const handleStockMovement = async () => {
    if (!selectedItem || !movementData.quantity || !movementData.reason) return;

    try {
      const quantity = parseInt(movementData.quantity);
      const movement: StockMovement = {
        id: movements.length + 1,
        product_id: selectedItem.product_id,
        product_name: selectedItem.product_name,
        type: movementData.type,
        quantity: movementData.type === 'adjustment' ? quantity : Math.abs(quantity),
        reason: movementData.reason,
        created_at: new Date().toISOString(),
        user_name: 'Usuario Actual'
      };

      // Actualizar inventario
      let newStock = selectedItem.current_stock;
      switch (movementData.type) {
        case 'in':
          newStock += Math.abs(quantity);
          break;
        case 'out':
          newStock -= Math.abs(quantity);
          break;
        case 'adjustment':
          newStock = quantity;
          break;
      }

      // Determinar nuevo estado
      let newStatus: InventoryItem['status'] = 'in_stock';
      if (newStock <= 0) {
        newStatus = 'out_of_stock';
      } else if (newStock <= selectedItem.min_stock) {
        newStatus = 'low_stock';
      }

      // Actualizar inventario
      setInventory(prev => prev.map(item =>
        item.id === selectedItem.id
          ? {
              ...item,
              current_stock: Math.max(0, newStock),
              status: newStatus,
              last_updated: new Date().toISOString()
            }
          : item
      ));

      // Agregar movimiento
      setMovements(prev => [movement, ...prev]);

      // Cerrar modal y resetear
      setShowMovementModal(false);
      setSelectedItem(null);
      setMovementData({ type: 'in', quantity: '', reason: '' });

    } catch (error) {
      console.error('Error processing stock movement:', error);
    }
  };

  const openMovementModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowMovementModal(true);
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
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
            <p className="text-gray-600 mt-1">
              Control de stock y movimientos de inventario
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowMovementHistory(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              📋 Historial
            </button>
            <button
              onClick={() => fetchInventory()}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">📦</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">En Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventory.filter(i => i.status === 'in_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">⚠️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventory.filter(i => i.status === 'low_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">❌</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sin Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventory.filter(i => i.status === 'out_of_stock').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="in_stock">En Stock</option>
              <option value="low_stock">Stock Bajo</option>
              <option value="out_of_stock">Sin Stock</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={() => setShowMovementHistory(true)}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              📋 Ver Historial
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Inventario ({inventoryFiltrado.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Límites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo Unitario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryFiltrado.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-sm text-gray-500">{item.category_name}</div>
                      {item.supplier && (
                        <div className="text-xs text-gray-400">Proveedor: {item.supplier}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold text-gray-900">{item.current_stock}</div>
                    <div className="text-xs text-gray-500">
                      Actualizado: {new Date(item.last_updated).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Mín: {item.min_stock}</div>
                      <div>Máx: {item.max_stock}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${item.unit_cost}</div>
                    <div className="text-xs text-gray-500">
                      Total: ${(item.current_stock * item.unit_cost).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)} {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openMovementModal(item)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Agregar/Quitar Stock"
                    >
                      📝
                    </button>
                    {item.status === 'low_stock' && (
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setMovementData({ type: 'in', quantity: (item.max_stock - item.current_stock).toString(), reason: 'Reposición automática' });
                          setShowMovementModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Reponer Stock"
                      >
                        🔄
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inventoryFiltrado.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay items de inventario</h3>
            <p className="text-gray-600">
              No se encontraron items que coincidan con los filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      {/* Stock Movement Modal */}
      {showMovementModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Movimiento de Stock - {selectedItem.product_name}
                </h3>
                <button
                  onClick={() => {
                    setShowMovementModal(false);
                    setSelectedItem(null);
                    setMovementData({ type: 'in', quantity: '', reason: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p><strong>Stock actual:</strong> {selectedItem.current_stock} unidades</p>
                <p><strong>Stock mínimo:</strong> {selectedItem.min_stock} unidades</p>
                <p><strong>Stock máximo:</strong> {selectedItem.max_stock} unidades</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento</label>
                <select
                  value={movementData.type}
                  onChange={(e) => setMovementData(prev => ({...prev, type: e.target.value as 'in' | 'out' | 'adjustment'}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in">📥 Entrada (Agregar Stock)</option>
                  <option value="out">📤 Salida (Quitar Stock)</option>
                  <option value="adjustment">🔧 Ajuste (Establecer Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {movementData.type === 'adjustment' ? 'Nuevo Stock Total' : 'Cantidad'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={movementData.quantity}
                  onChange={(e) => setMovementData(prev => ({...prev, quantity: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={movementData.type === 'adjustment' ? 'Stock final' : 'Cantidad a mover'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={movementData.reason}
                  onChange={(e) => setMovementData(prev => ({...prev, reason: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe el motivo del movimiento"
                  required
                />
              </div>

              {movementData.quantity && movementData.type !== 'adjustment' && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm">
                    <strong>Resultado:</strong> {
                      movementData.type === 'in'
                        ? selectedItem.current_stock + parseInt(movementData.quantity)
                        : selectedItem.current_stock - parseInt(movementData.quantity)
                    } unidades
                  </p>
                </div>
              )}

              {movementData.quantity && movementData.type === 'adjustment' && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm">
                    <strong>Stock se establecerá en:</strong> {movementData.quantity} unidades
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  setSelectedItem(null);
                  setMovementData({ type: 'in', quantity: '', reason: '' });
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStockMovement}
                disabled={!movementData.quantity || !movementData.reason}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirmar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement History Modal */}
      {showMovementHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Historial de Movimientos</h3>
                <button
                  onClick={() => setShowMovementHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(movement.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(movement.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{movement.product_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.type)}`}>
                            {getMovementIcon(movement.type)} {movement.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getMovementColor(movement.type)}`}>
                            {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{movement.reason}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{movement.user_name}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {movements.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay movimientos</h3>
                  <p className="text-gray-600">
                    No se han registrado movimientos de inventario.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
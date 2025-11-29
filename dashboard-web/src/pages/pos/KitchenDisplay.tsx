/**
 * Kitchen Display - Panel de Cocina en Tiempo Real
 * Vista para la cocina con actualización automática via WebSockets
 */

import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle, AlertTriangle, Play, Check } from 'lucide-react';

interface KitchenItem {
  id: number;
  product_name: string;
  quantity: number;
  notes?: string;
  kitchen_status: 'pending' | 'preparing' | 'ready' | 'served';
  kitchen_block: number;
}

interface KitchenOrder {
  id: number;
  sale_number: string;
  table_number: string;
  table_id: number;
  salon_name: string;
  waiter_name: string;
  kitchen_status: 'pending' | 'preparing' | 'ready' | 'served';
  notes?: string;
  created_at: string;
  elapsed_minutes: number;
  is_urgent: boolean;
  items: KitchenItem[];
  item_count: number;
}

// Colores por estado
const STATUS_COLORS = {
  pending: 'bg-yellow-100 border-yellow-400',
  preparing: 'bg-blue-100 border-blue-400',
  ready: 'bg-green-100 border-green-400',
  served: 'bg-gray-100 border-gray-300'
};

const STATUS_TEXT = {
  pending: 'Pendiente',
  preparing: 'En Preparación',
  ready: 'Listo',
  served: 'Servido'
};

const STATUS_ICONS = {
  pending: <Clock className="w-5 h-5 text-yellow-600" />,
  preparing: <Play className="w-5 h-5 text-blue-600" />,
  ready: <CheckCircle className="w-5 h-5 text-green-600" />,
  served: <Check className="w-5 h-5 text-gray-600" />
};

const BLOCK_COLORS = {
  1: 'bg-green-500',
  2: 'bg-blue-500',
  3: 'bg-purple-500',
  4: 'bg-orange-500'
};

const BLOCK_NAMES = {
  1: 'Bloque 1',
  2: 'Bloque 2',
  3: 'Bloque 3',
  4: 'Bloque 4'
};

const KitchenDisplay: React.FC = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadOrders();

    // Auto-refresh cada 5 segundos
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadOrders();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedBlock]);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/kitchen/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        let filteredOrders = data.orders;

        // Filtrar por bloque si está seleccionado
        if (selectedBlock) {
          filteredOrders = filteredOrders.filter((order: KitchenOrder) =>
            order.items.some(item => item.kitchen_block === selectedBlock)
          );
        }

        setOrders(filteredOrders);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
      setError('Error cargando pedidos de cocina');
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/v1/kitchen/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ kitchen_status: newStatus })
      });

      if (response.ok) {
        await loadOrders(); // Recargar
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  const groupedByStatus = {
    pending: orders.filter(o => o.kitchen_status === 'pending'),
    preparing: orders.filter(o => o.kitchen_status === 'preparing'),
    ready: orders.filter(o => o.kitchen_status === 'ready')
  };

  const stats = {
    pending: groupedByStatus.pending.length,
    preparing: groupedByStatus.preparing.length,
    ready: groupedByStatus.ready.length,
    urgent: orders.filter(o => o.is_urgent).length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Cargando pedidos de cocina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Oscuro para Cocina */}
      <header className="bg-gray-800 shadow-lg px-6 py-4 border-b-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ChefHat className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold">Panel de Cocina</h1>
              <p className="text-gray-400 text-sm">SYSME POS - En Tiempo Real</p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-xs text-gray-400">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.preparing}</p>
              <p className="text-xs text-gray-400">En Preparación</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{stats.ready}</p>
              <p className="text-xs text-gray-400">Listos</p>
            </div>
            {stats.urgent > 0 && (
              <div className="text-center">
                <p className="text-3xl font-bold text-red-500 animate-pulse">{stats.urgent}</p>
                <p className="text-xs text-gray-400">Urgentes</p>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
            </button>
            <button
              onClick={loadOrders}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              🔃 Actualizar
            </button>
          </div>
        </div>
      </header>

      {/* Filtro por Bloques */}
      <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 font-medium">Filtrar por bloque:</span>
          <button
            onClick={() => setSelectedBlock(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedBlock === null
                ? 'bg-white text-gray-900'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Todos
          </button>
          {[1, 2, 3, 4].map(block => (
            <button
              key={block}
              onClick={() => setSelectedBlock(block)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedBlock === block
                  ? `${BLOCK_COLORS[block as keyof typeof BLOCK_COLORS]} text-white`
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {BLOCK_NAMES[block as keyof typeof BLOCK_NAMES]}
            </button>
          ))}
        </div>
      </div>

      {/* Columnas de Estados */}
      <div className="grid grid-cols-3 gap-4 p-6 h-[calc(100vh-200px)]">
        {/* Pendientes */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
            <Clock className="w-6 h-6" />
            Pendientes ({groupedByStatus.pending.length})
          </h2>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {groupedByStatus.pending.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateOrderStatus}
              />
            ))}
            {groupedByStatus.pending.length === 0 && (
              <p className="text-gray-500 text-center py-8">No hay pedidos pendientes</p>
            )}
          </div>
        </div>

        {/* En Preparación */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
            <Play className="w-6 h-6" />
            En Preparación ({groupedByStatus.preparing.length})
          </h2>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {groupedByStatus.preparing.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateOrderStatus}
              />
            ))}
            {groupedByStatus.preparing.length === 0 && (
              <p className="text-gray-500 text-center py-8">No hay pedidos en preparación</p>
            )}
          </div>
        </div>

        {/* Listos */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
            <CheckCircle className="w-6 h-6" />
            Listos ({groupedByStatus.ready.length})
          </h2>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {groupedByStatus.ready.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateOrderStatus}
              />
            ))}
            {groupedByStatus.ready.length === 0 && (
              <p className="text-gray-500 text-center py-8">No hay pedidos listos</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de Tarjeta de Pedido
interface OrderCardProps {
  order: KitchenOrder;
  onUpdateStatus: (orderId: number, newStatus: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus }) => {
  const getNextStatus = () => {
    switch (order.kitchen_status) {
      case 'pending': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'served';
      default: return order.kitchen_status;
    }
  };

  const getNextButtonText = () => {
    switch (order.kitchen_status) {
      case 'pending': return 'Iniciar Preparación';
      case 'preparing': return 'Marcar Listo';
      case 'ready': return 'Marcar Servido';
      default: return '';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${
      order.is_urgent ? 'border-red-500 bg-red-900/20' : 'border-gray-700 bg-gray-700/50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg">Mesa {order.table_number}</h3>
          <p className="text-sm text-gray-400">{order.sale_number}</p>
          <p className="text-xs text-gray-500">{order.salon_name}</p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${order.is_urgent ? 'text-red-400 flex items-center gap-1' : 'text-gray-400'}`}>
            {order.is_urgent && <AlertTriangle className="w-4 h-4" />}
            {order.elapsed_minutes} min
          </div>
          <p className="text-xs text-gray-500">Garzón: {order.waiter_name}</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-3 border-t border-gray-600 pt-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  BLOCK_COLORS[item.kitchen_block as keyof typeof BLOCK_COLORS]
                }`}>
                  B{item.kitchen_block}
                </span>
                <span className="font-bold">x{item.quantity}</span>
                <span>{item.product_name}</span>
              </div>
              {item.notes && (
                <p className="text-xs text-yellow-400 ml-12 mt-1">📝 {item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notas de la orden */}
      {order.notes && (
        <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-sm">
          <p className="text-yellow-400">📋 {order.notes}</p>
        </div>
      )}

      {/* Botón de acción */}
      {order.kitchen_status !== 'served' && (
        <button
          onClick={() => onUpdateStatus(order.id, getNextStatus())}
          className={`w-full py-3 rounded-lg font-bold transition-all ${
            order.kitchen_status === 'pending'
              ? 'bg-blue-600 hover:bg-blue-700'
              : order.kitchen_status === 'preparing'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {getNextButtonText()}
        </button>
      )}
    </div>
  );
};

export default KitchenDisplay;

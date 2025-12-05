import React, { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
  notas?: string;
  modifiers?: Array<{
    modifier_id: number;
    modifier_name: string;
    unit_price: number;
    quantity: number;
  }>;
  categoria: string;
  tiempo_preparacion?: number;
}

interface KitchenOrder {
  id: number;
  mesa_numero: string;
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado';
  priority: 'normal' | 'alta' | 'urgente';
  total: number;
  created_at: string;
  tiempo_transcurrido: number;
  items: OrderItem[];
  waiter_name?: string;
  notas_especiales?: string;
}

const CocinaPage: React.FC = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    fetchKitchenOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchKitchenOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenOrders = async () => {
    try {
      // Simular órdenes de cocina
      const kitchenData: KitchenOrder[] = [
        {
          id: 1,
          mesa_numero: '5',
          estado: 'pendiente',
          priority: 'alta',
          total: 45.50,
          created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
          tiempo_transcurrido: 5,
          waiter_name: 'María García',
          notas_especiales: 'Sin cebolla en la hamburguesa',
          items: [
            { id: 1, product_name: 'Hamburguesa Clásica', quantity: 2, price: 15.00, categoria: 'Platos Principales', tiempo_preparacion: 15, notas: 'Sin cebolla' },
            { id: 2, product_name: 'Papas Fritas', quantity: 2, price: 8.50, categoria: 'Acompañamientos', tiempo_preparacion: 10 },
            { id: 3, product_name: 'Ensalada César', quantity: 1, price: 12.00, categoria: 'Ensaladas', tiempo_preparacion: 8 }
          ]
        },
        {
          id: 2,
          mesa_numero: '3',
          estado: 'preparando',
          priority: 'normal',
          total: 32.75,
          created_at: new Date(Date.now() - 12 * 60000).toISOString(), // 12 min ago
          tiempo_transcurrido: 12,
          waiter_name: 'Carlos López',
          items: [
            { id: 4, product_name: 'Pizza Margarita', quantity: 1, price: 18.00, categoria: 'Pizzas', tiempo_preparacion: 20 },
            { id: 5, product_name: 'Alitas BBQ', quantity: 1, price: 14.75, categoria: 'Aperitivos', tiempo_preparacion: 15 }
          ]
        },
        {
          id: 3,
          mesa_numero: '7',
          estado: 'listo',
          priority: 'urgente',
          total: 28.50,
          created_at: new Date(Date.now() - 18 * 60000).toISOString(), // 18 min ago
          tiempo_transcurrido: 18,
          waiter_name: 'Ana Rodríguez',
          items: [
            { id: 6, product_name: 'Pasta Alfredo', quantity: 1, price: 16.50, categoria: 'Pastas', tiempo_preparacion: 12 },
            { id: 7, product_name: 'Pan de Ajo', quantity: 2, price: 6.00, categoria: 'Acompañamientos', tiempo_preparacion: 5 }
          ]
        },
        {
          id: 4,
          mesa_numero: '2',
          estado: 'pendiente',
          priority: 'normal',
          total: 19.25,
          created_at: new Date(Date.now() - 3 * 60000).toISOString(), // 3 min ago
          tiempo_transcurrido: 3,
          waiter_name: 'Pedro Silva',
          items: [
            { id: 8, product_name: 'Sopa del Día', quantity: 2, price: 7.50, categoria: 'Sopas', tiempo_preparacion: 8 },
            { id: 9, product_name: 'Bruschetta', quantity: 1, price: 9.75, categoria: 'Aperitivos', tiempo_preparacion: 6 }
          ]
        },
        {
          id: 5,
          mesa_numero: '1',
          estado: 'preparando',
          priority: 'alta',
          total: 42.00,
          created_at: new Date(Date.now() - 25 * 60000).toISOString(), // 25 min ago
          tiempo_transcurrido: 25,
          waiter_name: 'Laura Vega',
          notas_especiales: 'Cliente con alergia a mariscos',
          items: [
            { id: 10, product_name: 'Filete de Res', quantity: 1, price: 28.00, categoria: 'Carnes', tiempo_preparacion: 25, notas: 'Término medio' },
            { id: 11, product_name: 'Verduras Asadas', quantity: 1, price: 14.00, categoria: 'Acompañamientos', tiempo_preparacion: 15 }
          ]
        }
      ];
      setOrders(kitchenData);
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEstadoColor = (estado: KitchenOrder['estado']) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparando':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'listo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'entregado':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: KitchenOrder['priority']) => {
    switch (priority) {
      case 'urgente':
        return 'bg-red-500 text-white';
      case 'alta':
        return 'bg-orange-500 text-white';
      case 'normal':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTimeColor = (minutes: number) => {
    if (minutes > 30) return 'text-red-600 font-bold';
    if (minutes > 20) return 'text-orange-600 font-semibold';
    if (minutes > 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleEstadoChange = (orderId: number, nuevoEstado: KitchenOrder['estado']) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, estado: nuevoEstado } : order
    ));

    // Si se marca como entregado, remover después de 3 segundos
    if (nuevoEstado === 'entregado') {
      setTimeout(() => {
        setOrders(prev => prev.filter(order => order.id !== orderId));
      }, 3000);
    }
  };

  const ordersFiltradas = orders.filter(order => {
    if (filtroEstado === 'todos') return true;
    return order.estado === filtroEstado;
  });

  const ordersOrdenadas = ordersFiltradas.sort((a, b) => {
    // Ordenar por prioridad y tiempo
    const priorityOrder = { urgente: 3, alta: 2, normal: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.tiempo_transcurrido - a.tiempo_transcurrido;
  });

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
            <h1 className="text-2xl font-bold text-gray-900">Panel de Cocina</h1>
            <p className="text-gray-600 mt-1">
              Monitor de órdenes en tiempo real - Actualización automática cada 30s
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchKitchenOrders()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔄 Actualizar
            </button>
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              ⏰ Auto-refresh: 30s
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.estado === 'pendiente').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">🍳</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Preparando</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.estado === 'preparando').length}
              </p>
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
              <p className="text-sm font-medium text-gray-500">Listos</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.estado === 'listo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">🚨</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Urgentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.priority === 'urgente').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-2">
          {['todos', 'pendiente', 'preparando', 'listo'].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtroEstado === estado
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {estado.charAt(0).toUpperCase() + estado.slice(1)}
              {estado !== 'todos' && (
                <span className="ml-1 bg-white bg-opacity-25 px-2 py-1 rounded text-xs">
                  {orders.filter(o => o.estado === estado).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {ordersOrdenadas.map((order) => (
          <div
            key={order.id}
            className={`
              bg-white rounded-lg shadow border-l-4 transition-all hover:shadow-lg cursor-pointer
              ${order.priority === 'urgente' ? 'border-red-500' :
                order.priority === 'alta' ? 'border-orange-500' : 'border-blue-500'}
            `}
            onClick={() => {
              setSelectedOrder(order);
              setShowOrderDetails(true);
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Mesa {order.mesa_numero}</h3>
                  <p className="text-sm text-gray-600">Orden #{order.id}</p>
                  <p className="text-sm text-gray-600">Mesero: {order.waiter_name}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityColor(order.priority)}`}>
                    {order.priority.toUpperCase()}
                  </span>
                  <p className={`text-sm font-medium mt-1 ${getTimeColor(order.tiempo_transcurrido)}`}>
                    {order.tiempo_transcurrido} min
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(order.estado)}`}>
                  {order.estado.charAt(0).toUpperCase() + order.estado.slice(1)}
                </span>
              </div>

              {/* Items */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Items ({order.items.length}):</h4>
                <div className="space-y-1">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>{item.quantity}x {item.product_name}</span>
                      {item.tiempo_preparacion && (
                        <span className="text-gray-500">{item.tiempo_preparacion}min</span>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-sm text-gray-500">+ {order.items.length - 3} más...</p>
                  )}
                </div>
              </div>

              {/* Notas Especiales */}
              {order.notas_especiales && (
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">⚠️ Notas Especiales:</p>
                  <p className="text-sm text-yellow-700">{order.notas_especiales}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                {order.estado === 'pendiente' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEstadoChange(order.id, 'preparando');
                    }}
                    className="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    🍳 Iniciar Preparación
                  </button>
                )}

                {order.estado === 'preparando' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEstadoChange(order.id, 'listo');
                    }}
                    className="flex-1 bg-green-500 text-white py-2 px-3 rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    ✅ Marcar Listo
                  </button>
                )}

                {order.estado === 'listo' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEstadoChange(order.id, 'entregado');
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 px-3 rounded text-sm hover:bg-gray-600 transition-colors"
                  >
                    📤 Marcar Entregado
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrder(order);
                    setShowOrderDetails(true);
                  }}
                  className="bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-300 transition-colors"
                >
                  👁️
                </button>
              </div>

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-gray-900">${order.total}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalles Orden #{selectedOrder.id} - Mesa {selectedOrder.mesa_numero}
                </h3>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Info General */}
                <div>
                  <p><strong>Mesero:</strong> {selectedOrder.waiter_name}</p>
                  <p><strong>Estado:</strong> {selectedOrder.estado}</p>
                  <p><strong>Prioridad:</strong> {selectedOrder.priority}</p>
                  <p><strong>Tiempo transcurrido:</strong> {selectedOrder.tiempo_transcurrido} minutos</p>
                  <p><strong>Hora de orden:</strong> {new Date(selectedOrder.created_at).toLocaleTimeString()}</p>
                </div>

                {/* Notas Especiales */}
                {selectedOrder.notas_especiales && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="font-medium text-yellow-800">⚠️ Notas Especiales:</p>
                    <p className="text-yellow-700">{selectedOrder.notas_especiales}</p>
                  </div>
                )}

                {/* Items Detallados */}
                <div>
                  <h4 className="font-medium mb-3">Items de la Orden:</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-gray-600">Categoría: {item.categoria}</p>
                            <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                            {item.tiempo_preparacion && (
                              <p className="text-sm text-gray-600">Tiempo prep: {item.tiempo_preparacion} min</p>
                            )}
                            {/* Display modifiers if present */}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-purple-300">
                                <p className="text-xs text-purple-700 font-semibold mb-1">🔧 Modificadores:</p>
                                {item.modifiers.map((mod, modIndex) => (
                                  <div key={modIndex} className="text-xs text-purple-600">
                                    • {mod.modifier_name}
                                    {mod.unit_price !== 0 && (
                                      <span className="text-gray-500">
                                        {' '}({mod.unit_price > 0 ? '+' : ''}${mod.unit_price.toFixed(2)})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.notas && (
                              <p className="text-sm text-orange-600 font-medium mt-2">📝 {item.notas}</p>
                            )}
                          </div>
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>${selectedOrder.total}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  {selectedOrder.estado === 'pendiente' && (
                    <button
                      onClick={() => {
                        handleEstadoChange(selectedOrder.id, 'preparando');
                        setShowOrderDetails(false);
                      }}
                      className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      🍳 Iniciar Preparación
                    </button>
                  )}

                  {selectedOrder.estado === 'preparando' && (
                    <button
                      onClick={() => {
                        handleEstadoChange(selectedOrder.id, 'listo');
                        setShowOrderDetails(false);
                      }}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✅ Marcar Listo
                    </button>
                  )}

                  {selectedOrder.estado === 'listo' && (
                    <button
                      onClick={() => {
                        handleEstadoChange(selectedOrder.id, 'entregado');
                        setShowOrderDetails(false);
                      }}
                      className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      📤 Marcar Entregado
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {ordersOrdenadas.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🍳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes</h3>
          <p className="text-gray-600">
            {filtroEstado === 'todos'
              ? 'No hay órdenes activas en la cocina en este momento.'
              : `No hay órdenes en estado "${filtroEstado}".`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default CocinaPage;
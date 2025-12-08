import React, { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface Mesa {
  id: number;
  numero: string;
  capacidad: number;
  estado: 'disponible' | 'ocupada' | 'reservada' | 'limpieza';
  zona: string;
  ubicacion?: string;
}

interface Order {
  id: number;
  mesa_id: number;
  total: number;
  estado: string;
  created_at: string;
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

const MesasPage: React.FC = () => {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    fetchMesas();
    fetchOrders();
  }, []);

  const fetchMesas = async () => {
    try {
      // Simular datos de mesas por ahora
      const mesasData: Mesa[] = [
        { id: 1, numero: '1', capacidad: 4, estado: 'ocupada', zona: 'Principal', ubicacion: 'Ventana' },
        { id: 2, numero: '2', capacidad: 2, estado: 'disponible', zona: 'Principal', ubicacion: 'Centro' },
        { id: 3, numero: '3', capacidad: 6, estado: 'reservada', zona: 'Principal', ubicacion: 'Esquina' },
        { id: 4, numero: '4', capacidad: 4, estado: 'disponible', zona: 'Terraza', ubicacion: 'Exterior' },
        { id: 5, numero: '5', capacidad: 2, estado: 'ocupada', zona: 'Terraza', ubicacion: 'Vista' },
        { id: 6, numero: '6', capacidad: 8, estado: 'limpieza', zona: 'Privado', ubicacion: 'Salón' },
        { id: 7, numero: '7', capacidad: 4, estado: 'disponible', zona: 'Principal', ubicacion: 'Central' },
        { id: 8, numero: '8', capacidad: 2, estado: 'disponible', zona: 'Barra', ubicacion: 'Barra alta' }
      ];
      setMesas(mesasData);
    } catch (error) {
      console.error('Error fetching mesas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      // Simular órdenes activas
      const ordersData: Order[] = [
        {
          id: 1,
          mesa_id: 1,
          total: 45.50,
          estado: 'preparando',
          created_at: new Date().toISOString(),
          items: [
            { id: 1, product_name: 'Hamburguesa Clásica', quantity: 2, price: 15.00 },
            { id: 2, product_name: 'Coca Cola', quantity: 2, price: 3.50 },
            { id: 3, product_name: 'Papas Fritas', quantity: 1, price: 8.50 }
          ]
        },
        {
          id: 2,
          mesa_id: 5,
          total: 28.75,
          estado: 'servido',
          created_at: new Date().toISOString(),
          items: [
            { id: 4, product_name: 'Pizza Margarita', quantity: 1, price: 18.00 },
            { id: 5, product_name: 'Agua', quantity: 2, price: 2.50 },
            { id: 6, product_name: 'Ensalada César', quantity: 1, price: 7.75 }
          ]
        }
      ];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const getEstadoColor = (estado: Mesa['estado']) => {
    switch (estado) {
      case 'disponible':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ocupada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reservada':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'limpieza':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: Mesa['estado']) => {
    switch (estado) {
      case 'disponible':
        return '✅';
      case 'ocupada':
        return '🔴';
      case 'reservada':
        return '📅';
      case 'limpieza':
        return '🧹';
      default:
        return '❓';
    }
  };

  const getMesaOrder = (mesaId: number) => {
    return orders.find(order => order.mesa_id === mesaId);
  };

  const handleMesaClick = (mesa: Mesa) => {
    setSelectedMesa(mesa);
    const order = getMesaOrder(mesa.id);
    if (order) {
      setShowOrderDetails(true);
    }
  };

  const handleEstadoChange = (mesaId: number, nuevoEstado: Mesa['estado']) => {
    setMesas(prev => prev.map(mesa =>
      mesa.id === mesaId ? { ...mesa, estado: nuevoEstado } : mesa
    ));
    if (selectedMesa && selectedMesa.id === mesaId) {
      setSelectedMesa(prev => prev ? { ...prev, estado: nuevoEstado } : null);
    }
  };

  const abrirPOS = (mesa: Mesa) => {
    // Redirigir al POS con la mesa seleccionada
    window.location.href = `/pos?mesa=${mesa.numero}`;
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
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Mesas</h1>
            <p className="text-gray-600 mt-1">
              Monitor en tiempo real del estado de las mesas del restaurante
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchMesas()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={() => window.location.href = '/pos'}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              ➕ Nueva Venta
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Disponibles</p>
              <p className="text-2xl font-bold text-gray-900">
                {mesas.filter(m => m.estado === 'disponible').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">🔴</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ocupadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {mesas.filter(m => m.estado === 'ocupada').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">📅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Reservadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {mesas.filter(m => m.estado === 'reservada').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">🧹</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Limpieza</p>
              <p className="text-2xl font-bold text-gray-900">
                {mesas.filter(m => m.estado === 'limpieza').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mesas Grid */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Estado de Mesas</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mesas.map((mesa) => {
              const order = getMesaOrder(mesa.id);
              return (
                <div
                  key={mesa.id}
                  onClick={() => handleMesaClick(mesa)}
                  className={`
                    relative border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                    ${getEstadoColor(mesa.estado)}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-lg font-bold">Mesa {mesa.numero}</h4>
                      <p className="text-sm opacity-75">{mesa.zona}</p>
                    </div>
                    <span className="text-xl">{getEstadoIcon(mesa.estado)}</span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p><strong>Capacidad:</strong> {mesa.capacidad} personas</p>
                    <p><strong>Ubicación:</strong> {mesa.ubicacion}</p>
                    <p><strong>Estado:</strong> {mesa.estado}</p>
                  </div>

                  {order && (
                    <div className="mt-3 p-2 bg-white bg-opacity-50 rounded">
                      <p className="text-sm font-medium">Orden Activa</p>
                      <p className="text-sm">Total: ${order.total}</p>
                      <p className="text-xs">Estado: {order.estado}</p>
                    </div>
                  )}

                  <div className="mt-3 flex space-x-2">
                    {mesa.estado === 'disponible' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirPOS(mesa);
                        }}
                        className="flex-1 bg-green-500 text-white text-xs py-1 px-2 rounded hover:bg-green-600 transition-colors"
                      >
                        Abrir Mesa
                      </button>
                    )}

                    {mesa.estado === 'ocupada' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEstadoChange(mesa.id, 'limpieza');
                          }}
                          className="flex-1 bg-yellow-500 text-white text-xs py-1 px-2 rounded hover:bg-yellow-600 transition-colors"
                        >
                          Limpiar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirPOS(mesa);
                          }}
                          className="flex-1 bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600 transition-colors"
                        >
                          Ver Orden
                        </button>
                      </>
                    )}

                    {mesa.estado === 'limpieza' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEstadoChange(mesa.id, 'disponible');
                        }}
                        className="flex-1 bg-green-500 text-white text-xs py-1 px-2 rounded hover:bg-green-600 transition-colors"
                      >
                        Disponible
                      </button>
                    )}

                    {mesa.estado === 'reservada' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEstadoChange(mesa.id, 'ocupada');
                        }}
                        className="flex-1 bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600 transition-colors"
                      >
                        Marcar Ocupada
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedMesa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalles Mesa {selectedMesa.numero}
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
              {(() => {
                const order = getMesaOrder(selectedMesa.id);
                if (!order) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No hay órdenes activas en esta mesa</p>
                      <button
                        onClick={() => abrirPOS(selectedMesa)}
                        className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Crear Nueva Orden
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div>
                      <p><strong>Estado:</strong> {order.estado}</p>
                      <p><strong>Total:</strong> ${order.total}</p>
                      <p><strong>Hora:</strong> {new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Items de la Orden:</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                            </div>
                            <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => abrirPOS(selectedMesa)}
                        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Ver en POS
                      </button>
                      <button
                        onClick={() => handleEstadoChange(selectedMesa.id, 'limpieza')}
                        className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        Finalizar Mesa
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesasPage;
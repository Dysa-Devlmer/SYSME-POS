/**
 * =====================================================
 * SYSME POS - Delivery Management Page
 * =====================================================
 * Página principal para gestión de entregas a domicilio
 *
 * @module DeliveryPage
 * @date 2025-12-08
 */

import React, { useState, useEffect } from 'react';
import {
  getDeliveryDashboard,
  getDeliveries,
  getDrivers,
  DeliveryDashboard,
  Delivery,
  DeliveryDriver,
  getDeliveryStatusLabel,
  getDeliveryStatusColor,
  getDriverStatusLabel,
  getDriverStatusColor,
  getVehicleIcon,
  formatDistance,
  calculateETA,
  assignDriver,
  autoAssignDriver,
  updateDeliveryStatus
} from '@/services/deliveryService';

const DeliveryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deliveries' | 'drivers'>('dashboard');
  const [dashboard, setDashboard] = useState<DeliveryDashboard | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await getDeliveryDashboard();
        setDashboard(data);
        setDeliveries(data.active_deliveries);
        setDrivers(data.available_drivers);
      } else if (activeTab === 'deliveries') {
        const result = await getDeliveries({ status: 'pending,assigned,in_transit' });
        setDeliveries(result.data);
      } else if (activeTab === 'drivers') {
        const driverData = await getDrivers({ active_only: true, include_stats: true });
        setDrivers(driverData);
      }
    } catch (error) {
      console.error('Error fetching delivery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async (deliveryId: number, driverId: number) => {
    try {
      await assignDriver(deliveryId, driverId);
      alert('Repartidor asignado exitosamente');
      fetchData();
      setAssignModalOpen(false);
    } catch (error) {
      alert('Error al asignar repartidor');
    }
  };

  const handleAutoAssign = async (deliveryId: number) => {
    try {
      await autoAssignDriver(deliveryId);
      alert('Repartidor auto-asignado exitosamente');
      fetchData();
    } catch (error) {
      alert('Error en auto-asignación');
    }
  };

  const handleStatusUpdate = async (deliveryId: number, newStatus: any) => {
    try {
      await updateDeliveryStatus(deliveryId, newStatus);
      alert('Estado actualizado');
      fetchData();
    } catch (error) {
      alert('Error al actualizar estado');
    }
  };

  // ============================================
  // DASHBOARD TAB
  // ============================================
  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Entregas Hoy</p>
              <p className="text-3xl font-bold">{dashboard?.today_stats.total_deliveries || 0}</p>
            </div>
            <div className="text-4xl">🚚</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completadas</p>
              <p className="text-3xl font-bold text-green-600">{dashboard?.today_stats.completed || 0}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">En Progreso</p>
              <p className="text-3xl font-bold text-blue-600">{dashboard?.today_stats.in_progress || 0}</p>
            </div>
            <div className="text-4xl">🚴</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Ingresos Delivery</p>
              <p className="text-3xl font-bold text-purple-600">${dashboard?.today_stats.total_fees.toLocaleString('es-CL') || 0}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* Active Deliveries */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Entregas Activas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Número</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Repartidor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Cliente</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Dirección</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">ETA</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold">{delivery.delivery_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: getDeliveryStatusColor(delivery.status) + '20',
                        color: getDeliveryStatusColor(delivery.status)
                      }}
                    >
                      {getDeliveryStatusLabel(delivery.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {delivery.driver_name ? (
                      <div>
                        <p className="font-semibold">{delivery.driver_name}</p>
                        <p className="text-xs text-gray-500">{delivery.driver_phone}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setAssignModalOpen(true);
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Asignar Repartidor
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold">{delivery.customer_name}</p>
                      <p className="text-xs text-gray-500">{delivery.customer_phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{delivery.customer_address}</p>
                    <p className="text-xs text-gray-500">{delivery.customer_commune}, {delivery.customer_city}</p>
                  </td>
                  <td className="px-4 py-3">
                    {delivery.estimated_delivery_at && (
                      <span className="text-sm font-semibold">
                        {calculateETA(delivery.estimated_delivery_at)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedDelivery(delivery)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                      title="Ver detalles"
                    >
                      👁️
                    </button>
                    {delivery.status === 'pending' && (
                      <button
                        onClick={() => handleAutoAssign(delivery.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Auto-asignar"
                      >
                        🤖
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Drivers */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Repartidores Disponibles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {drivers.map((driver) => (
            <div key={driver.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getVehicleIcon(driver.vehicle_type)}</span>
                  <div>
                    <p className="font-bold">{driver.first_name} {driver.last_name}</p>
                    <p className="text-xs text-gray-500">{driver.code}</p>
                  </div>
                </div>
                <span
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: getDriverStatusColor(driver.status) + '20',
                    color: getDriverStatusColor(driver.status)
                  }}
                >
                  {getDriverStatusLabel(driver.status)}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <p>⭐ Rating: {driver.rating_average.toFixed(1)} ({driver.total_ratings})</p>
                <p>📦 Entregas hoy: {driver.today_stats?.deliveries_today || 0}</p>
                <p>💰 Ganancias hoy: ${driver.today_stats?.earnings_today.toLocaleString('es-CL') || 0}</p>
                <p>🚚 Pedidos activos: {driver.active_deliveries || 0}/{driver.max_concurrent_orders}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // DELIVERIES TAB
  // ============================================
  const renderDeliveriesTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Todas las Entregas</h2>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔄 Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Número</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Prioridad</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Cliente</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Zona</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Creado</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deliveries.map((delivery) => (
              <tr key={delivery.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono font-bold">{delivery.delivery_number}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: getDeliveryStatusColor(delivery.status) + '20',
                      color: getDeliveryStatusColor(delivery.status)
                    }}
                  >
                    {getDeliveryStatusLabel(delivery.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">{delivery.priority.toUpperCase()}</span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold">{delivery.customer_name}</p>
                    <p className="text-xs text-gray-500">{delivery.customer_phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">{delivery.zone_name || 'Sin zona'}</span>
                  {delivery.distance_km && (
                    <p className="text-xs text-gray-500">{formatDistance(delivery.distance_km)}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-bold">${(delivery.order_total || 0).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-gray-500">+ ${delivery.delivery_fee} envío</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">{new Date(delivery.created_at).toLocaleString('es-CL')}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setSelectedDelivery(delivery)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Ver detalles"
                  >
                    👁️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // DRIVERS TAB
  // ============================================
  const renderDriversTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestión de Repartidores</h2>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nuevo Repartidor
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Código</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Repartidor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Vehículo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Rating</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Entregas</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Comisiones</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono">{driver.code}</span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-bold">{driver.first_name} {driver.last_name}</p>
                    <p className="text-xs text-gray-500">{driver.phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getVehicleIcon(driver.vehicle_type)}</span>
                    <span className="text-sm">{driver.vehicle_plate || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: getDriverStatusColor(driver.status) + '20',
                      color: getDriverStatusColor(driver.status)
                    }}
                  >
                    {getDriverStatusLabel(driver.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <p>⭐ {driver.rating_average.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">({driver.total_ratings} votos)</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-semibold">{driver.total_deliveries}</p>
                  <p className="text-xs text-gray-500">Hoy: {driver.today_stats?.deliveries_today || 0}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-bold">${driver.total_earnings.toLocaleString('es-CL')}</p>
                  <p className="text-xs text-gray-500">{driver.commission_type}: {driver.commission_value}{driver.commission_type === 'percentage' ? '%' : ''}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    className="text-blue-600 hover:text-blue-800 mr-2"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    className="text-gray-600 hover:text-gray-800"
                    title="Ver historial"
                  >
                    📊
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">🚚 Gestión de Delivery</h1>
          <p className="text-gray-600">Sistema de entregas a domicilio y gestión de repartidores</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveTab('deliveries')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'deliveries'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📦 Entregas
              </button>
              <button
                onClick={() => setActiveTab('drivers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'drivers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🚴 Repartidores
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'dashboard' && renderDashboardTab()}
            {activeTab === 'deliveries' && renderDeliveriesTab()}
            {activeTab === 'drivers' && renderDriversTab()}
          </>
        )}

        {/* Assign Driver Modal */}
        {assignModalOpen && selectedDelivery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <h3 className="text-xl font-bold mb-4">Asignar Repartidor a {selectedDelivery.delivery_number}</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {drivers.filter(d => d.status === 'available').map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => handleAssignDriver(selectedDelivery.id, driver.id)}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getVehicleIcon(driver.vehicle_type)}</span>
                      <div>
                        <p className="font-bold">{driver.first_name} {driver.last_name}</p>
                        <p className="text-sm text-gray-500">{driver.code} - ⭐ {driver.rating_average.toFixed(1)}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Asignar
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleAutoAssign(selectedDelivery.id);
                    setAssignModalOpen(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  🤖 Auto-Asignar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryPage;

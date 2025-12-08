/**
 * =====================================================
 * SYSME POS - Kitchen Display System (KDS) Page
 * =====================================================
 * Página para gestión del sistema de pantalla de cocina
 *
 * @module KitchenDisplayPage
 * @date 2025-12-08
 */

import React, { useState, useEffect } from 'react';
import {
  getStations,
  getStationOrders,
  bumpItem,
  bumpOrder,
  recallOrder,
  getKDSAnalytics,
  KDSStation,
  KDSOrder,
  KDSAnalytics,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel,
  formatElapsedTime,
  connectKDS,
  disconnectKDS
} from '@/services/kdsService';

const KitchenDisplayPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'station' | 'expo' | 'analytics'>('station');
  const [stations, setStations] = useState<KDSStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [analytics, setAnalytics] = useState<KDSAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchStations();
    const interval = setInterval(() => {
      if (selectedStation && activeTab === 'station') {
        fetchStationOrders(selectedStation);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedStation, activeTab]);

  // WebSocket connection
  useEffect(() => {
    const socket = connectKDS(selectedStation?.toString(), {
      onNewOrder: () => {
        if (selectedStation) fetchStationOrders(selectedStation);
      },
      onItemBumped: () => {
        if (selectedStation) fetchStationOrders(selectedStation);
      }
    });

    return () => {
      disconnectKDS();
    };
  }, [selectedStation]);

  const fetchStations = async () => {
    try {
      const data = await getStations(true);
      setStations(data);
      if (data.length > 0 && !selectedStation) {
        setSelectedStation(data[0].id);
        fetchStationOrders(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchStationOrders = async (stationId: number) => {
    setLoading(true);
    try {
      const result = await getStationOrders(stationId, false);
      setOrders(result.orders);
    } catch (error) {
      console.error('Error fetching station orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await getKDSAnalytics(selectedStation || undefined);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleBumpItem = async (itemId: number) => {
    try {
      await bumpItem(itemId, 'next');
      if (selectedStation) fetchStationOrders(selectedStation);
    } catch (error) {
      alert('Error al avanzar item');
    }
  };

  const handleBumpOrder = async (saleId: number) => {
    try {
      await bumpOrder(saleId, selectedStation || undefined, 'ready');
      if (selectedStation) fetchStationOrders(selectedStation);
    } catch (error) {
      alert('Error al completar orden');
    }
  };

  const handleRecallOrder = async (saleId: number) => {
    try {
      await recallOrder(saleId, selectedStation || undefined);
      if (selectedStation) fetchStationOrders(selectedStation);
      alert('Orden recuperada exitosamente');
    } catch (error) {
      alert('Error al recuperar orden');
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  // ============================================
  // STATION VIEW TAB
  // ============================================
  const renderStationTab = () => (
    <div className="space-y-4">
      {/* Station Selector */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
        <label className="font-semibold">Estación:</label>
        {stations.map((station) => (
          <button
            key={station.id}
            onClick={() => {
              setSelectedStation(station.id);
              fetchStationOrders(station.id);
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedStation === station.id
                ? 'text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            style={{
              backgroundColor: selectedStation === station.id ? station.color : undefined
            }}
          >
            {station.icon} {station.name}
            {station.item_counts && (
              <span className="ml-2 bg-white text-gray-900 px-2 py-1 rounded-full text-xs">
                {station.item_counts.pending + station.item_counts.preparing}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <div
            key={order.sale_id}
            className={`bg-white rounded-lg shadow-lg overflow-hidden border-4 ${
              order.is_late ? 'border-red-500' : order.is_urgent ? 'border-orange-500' : 'border-gray-300'
            }`}
          >
            {/* Order Header */}
            <div
              className="p-4 text-white font-bold flex items-center justify-between"
              style={{ backgroundColor: getPriorityColor(order.priority) }}
            >
              <div>
                <p className="text-2xl">{order.table_number ? `Mesa ${order.table_number}` : order.sale_number}</p>
                <p className="text-sm opacity-90">{getPriorityLabel(order.priority)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{formatElapsedTime(order.elapsed_minutes)}</p>
                <p className="text-xs opacity-90">{order.order_type === 'dine_in' ? '🍽️ Local' : order.order_type === 'takeout' ? '📦 Para llevar' : '🚚 Delivery'}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="p-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.kds_item_id}
                  className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${
                    item.status === 'ready' ? 'bg-green-50 border-green-500' :
                    item.status === 'preparing' ? 'bg-blue-50 border-blue-500' :
                    'bg-gray-50 border-gray-300'
                  }`}
                  onClick={() => handleBumpItem(item.kds_item_id)}
                  title={
                    item.status === 'pending' ? 'Pendiente: Orden recién recibida, esperando preparación. Haz clic para marcar como "En preparación".' :
                    item.status === 'preparing' ? 'En Preparación: Cocinero trabajando en este item. Haz clic cuando esté listo para servir.' :
                    item.status === 'ready' ? 'Listo: Item completado y listo para servir. Haz clic para confirmar que fue entregado.' :
                    'Haz clic para cambiar estado del item'
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-lg">{item.quantity}x {item.product_name}</p>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: getStatusColor(item.status) + '40',
                        color: getStatusColor(item.status)
                      }}
                    >
                      {getStatusLabel(item.status)} 💡
                    </span>
                  </div>
                  {item.modifiers.length > 0 && (
                    <div className="ml-2 text-sm text-gray-600">
                      {item.modifiers.map((mod, idx) => (
                        <p key={idx}>• {mod}</p>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-sm text-orange-600 font-semibold mt-1">
                      📝 {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Order Footer */}
            <div className="p-4 bg-gray-50 border-t flex justify-between">
              <button
                onClick={() => handleRecallOrder(order.sale_id)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
              >
                ↩️ Recall
              </button>
              <button
                onClick={() => handleBumpOrder(order.sale_id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                ✅ Completar ({order.ready_items}/{order.total_items})
              </button>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-gray-600 text-lg">¡No hay órdenes pendientes!</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // ANALYTICS TAB
  // ============================================
  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Items Completados</p>
          <p className="text-3xl font-bold">{analytics?.recall_stats.total_items || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Tasa de Recall</p>
          <p className="text-3xl font-bold text-yellow-600">{analytics?.recall_stats.recall_rate.toFixed(1) || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Tiempo Promedio</p>
          <p className="text-3xl font-bold text-blue-600">
            {analytics?.avg_prep_time.length ? Math.round(analytics.avg_prep_time[0].avg_prep_minutes) : 0}m
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Cola Actual</p>
          <p className="text-3xl font-bold text-purple-600">
            {analytics?.current_queue.reduce((sum, q) => sum + q.pending_items, 0) || 0}
          </p>
        </div>
      </div>

      {/* Prep Times by Station */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Tiempos de Preparación por Estación</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Estación</th>
                <th className="text-right py-2 px-4">Items</th>
                <th className="text-right py-2 px-4">Tiempo Promedio</th>
                <th className="text-right py-2 px-4">Más Rápido</th>
                <th className="text-right py-2 px-4">Más Lento</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.avg_prep_time.map((stat) => (
                <tr key={stat.station_code} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold">{stat.station_name}</td>
                  <td className="text-right py-3 px-4">{stat.items_completed}</td>
                  <td className="text-right py-3 px-4 font-bold text-blue-600">
                    {Math.round(stat.avg_prep_minutes)} min
                  </td>
                  <td className="text-right py-3 px-4 text-green-600">
                    {Math.round(stat.min_prep_seconds / 60)} min
                  </td>
                  <td className="text-right py-3 px-4 text-red-600">
                    {Math.round(stat.max_prep_seconds / 60)} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Queue */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Cola Actual por Estación</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics?.current_queue.map((queue) => (
            <div key={queue.station_name} className="border rounded-lg p-4">
              <p className="text-gray-600 text-sm">{queue.station_name}</p>
              <p className="text-4xl font-bold text-purple-600">{queue.pending_items}</p>
              <p className="text-xs text-gray-500">items pendientes</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">👨‍🍳 Kitchen Display System (KDS)</h1>
          <p className="text-gray-600">Sistema de pantalla de cocina y gestión de órdenes</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('station')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'station'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🍳 Vista de Estación
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Cargando órdenes...</p>
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'station' && renderStationTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default KitchenDisplayPage;

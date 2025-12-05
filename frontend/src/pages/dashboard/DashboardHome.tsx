import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  activeUsers: number;
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
  }>;
}

const DashboardHome: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    activeUsers: 0,
    topProducts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Simular datos del dashboard por ahora
        setStats({
          totalSales: 1234.50,
          totalOrders: 45,
          activeUsers: 3,
          topProducts: [
            { id: 1, name: 'Café Americano', sales: 15 },
            { id: 2, name: 'Hamburguesa Clásica', sales: 8 },
            { id: 3, name: 'Pizza Margarita', sales: 6 }
          ]
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Bienvenido, {user?.username}!
        </h1>
        <p className="text-gray-600">
          Aquí tienes un resumen de la actividad de hoy en el restaurante.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">$</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ventas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">#</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Órdenes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">⭐</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Mesa Promedio</p>
              <p className="text-2xl font-bold text-gray-900">${(stats.totalSales / stats.totalOrders).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Productos Más Vendidos</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{product.sales} vendidos</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Acciones Rápidas</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => window.location.href = '/pos'}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">🛒</div>
                <div className="text-sm font-medium text-gray-900">Nueva Venta</div>
              </button>

              <button
                onClick={() => window.location.href = '/mesas'}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">🪑</div>
                <div className="text-sm font-medium text-gray-900">Ver Mesas</div>
              </button>

              <button
                onClick={() => window.location.href = '/cocina'}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">👨‍🍳</div>
                <div className="text-sm font-medium text-gray-900">Cocina</div>
              </button>

              <button
                onClick={() => window.location.href = '/reports'}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium text-gray-900">Reportes</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-600">
                <span className="font-medium">Mesa 5</span> - Orden completada - $32.50
              </span>
              <span className="text-xs text-gray-400">Hace 5 min</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm text-gray-600">
                <span className="font-medium">Mesa 3</span> - Nueva orden - $18.75
              </span>
              <span className="text-xs text-gray-400">Hace 12 min</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-sm text-gray-600">
                <span className="font-medium">Cocina</span> - Orden en preparación
              </span>
              <span className="text-xs text-gray-400">Hace 18 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
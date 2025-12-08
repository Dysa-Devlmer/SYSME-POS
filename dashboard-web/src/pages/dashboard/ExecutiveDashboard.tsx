import React, { useEffect, useState } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { dashboardService, chartService, dashboardUtils, chartConfig, type ExecutiveDashboard, type QuickSummary, type RealTimeMetrics, type DashboardPeriod } from '@/services/executiveDashboardService';
import { useAuthStore } from '@/store/authStore';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ExecutiveDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [quickSummary, setQuickSummary] = useState<QuickSummary | null>(null);
  const [realtime, setRealtime] = useState<RealTimeMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar dashboard ejecutivo
  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardService.getExecutive({ period: selectedPeriod });
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar dashboard');
      console.error('Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar resumen rápido
  const fetchQuickSummary = async () => {
    try {
      const data = await dashboardService.getQuickSummary();
      setQuickSummary(data);
    } catch (err) {
      console.error('Error fetching quick summary:', err);
    }
  };

  // Cargar métricas en tiempo real
  const fetchRealtime = async () => {
    try {
      const data = await dashboardService.getRealTime();
      setRealtime(data);
    } catch (err) {
      console.error('Error fetching realtime:', err);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchDashboard();
    fetchQuickSummary();
    fetchRealtime();
  }, [selectedPeriod]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQuickSummary();
      fetchRealtime();
      if (selectedPeriod === 'today') {
        fetchDashboard();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedPeriod]);

  // Handler para exportar CSV
  const handleExportCSV = async () => {
    try {
      await dashboardService.downloadCSV(selectedPeriod);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Error al exportar reporte');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard ejecutivo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <h3 className="text-red-600 font-bold text-xl mb-2">Error</h3>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  // Preparar datos para gráficos
  const hourlyChartData = {
    labels: dashboard.charts.hourly_sales.map(item => dashboardUtils.formatHour(item.hour)),
    datasets: [
      {
        label: 'Ventas',
        data: dashboard.charts.hourly_sales.map(item => item.revenue),
        backgroundColor: chartConfig.colors.primary,
        borderColor: chartConfig.colors.primary,
        borderWidth: 1
      }
    ]
  };

  const weeklyTrendData = {
    labels: dashboard.charts.weekly_trend.map(item => item.date),
    datasets: [
      {
        label: 'Ingresos',
        data: dashboard.charts.weekly_trend.map(item => item.revenue),
        borderColor: chartConfig.colors.primary,
        backgroundColor: chartConfig.colors.primary + '20',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Transacciones',
        data: dashboard.charts.weekly_trend.map(item => item.transactions),
        borderColor: chartConfig.colors.secondary,
        backgroundColor: chartConfig.colors.secondary + '20',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const categoriesChartData = {
    labels: dashboard.charts.categories.map(item => item.category),
    datasets: [
      {
        data: dashboard.charts.categories.map(item => item.revenue),
        backgroundColor: chartConfig.categoryPalette,
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const paymentMethodsData = {
    labels: dashboard.charts.payment_methods.map(item => dashboardUtils.getPaymentLabel(item.payment_method)),
    datasets: [
      {
        data: dashboard.charts.payment_methods.map(item => item.amount),
        backgroundColor: chartConfig.categoryPalette.slice(0, dashboard.charts.payment_methods.length),
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
            <p className="text-gray-600 mt-1">
              Bienvenido, {user?.username} - {dashboard.period.label}
            </p>
            {realtime && (
              <p className="text-xs text-gray-500 mt-1">
                Última actualización: {new Date(realtime.timestamp).toLocaleTimeString('es-CL')}
              </p>
            )}
          </div>

          <div className="mt-4 md:mt-0 flex gap-2">
            {/* Selector de período */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as DashboardPeriod)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="quarter">Último trimestre</option>
            </select>

            {/* Botón exportar */}
            <button
              onClick={handleExportCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <span>📊</span>
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Resumen rápido */}
      {quickSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{quickSummary.today_revenue_formatted}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transacciones</p>
                <p className="text-2xl font-bold text-gray-900">{quickSummary.today_transactions}</p>
              </div>
              <div className="text-3xl">🛒</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mesas Ocupadas</p>
                <p className="text-2xl font-bold text-gray-900">{quickSummary.occupied_tables}</p>
              </div>
              <div className="text-3xl">🪑</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Entregas Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{quickSummary.pending_deliveries}</p>
              </div>
              <div className="text-3xl">🚚</div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Ventas */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-600">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">VENTAS</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboard.kpis.sales.total_revenue_formatted}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-sm font-semibold ${dashboard.kpis.sales.revenue_trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {dashboard.kpis.sales.revenue_trend === 'up' ? '↑' : '↓'} {dashboardUtils.formatPercentChange(dashboard.kpis.sales.revenue_change_percent)}
            </span>
            <span className="text-xs text-gray-500">vs período anterior</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">Transacciones: <span className="font-semibold">{dashboard.kpis.sales.total_transactions}</span></p>
            <p className="text-sm text-gray-600">Ticket promedio: <span className="font-semibold">{dashboard.kpis.sales.average_ticket_formatted}</span></p>
          </div>
        </div>

        {/* Mesas */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">MESAS</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboard.kpis.tables.occupancy_rate.toFixed(1)}%</p>
          <div className="mt-2">
            <span className="text-sm text-gray-600">Ocupación actual</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">Ocupadas: <span className="font-semibold">{dashboard.kpis.tables.occupied}/{dashboard.kpis.tables.total}</span></p>
            <p className="text-sm text-gray-600">Reservas hoy: <span className="font-semibold">{dashboard.kpis.tables.todays_reservations}</span></p>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-600">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">DELIVERY</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboard.kpis.delivery.in_progress}</p>
          <div className="mt-2">
            <span className="text-sm text-gray-600">En tránsito</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">Completados: <span className="font-semibold">{dashboard.kpis.delivery.completed}</span></p>
            <p className="text-sm text-gray-600">Tiempo promedio: <span className="font-semibold">{dashboard.kpis.delivery.avg_delivery_minutes} min</span></p>
          </div>
        </div>

        {/* Inventario */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-orange-600">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">INVENTARIO</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboard.kpis.inventory.inventory_value_formatted}</p>
          <div className="mt-2">
            <span className="text-sm text-gray-600">Valor total</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">Productos: <span className="font-semibold">{dashboard.kpis.inventory.total_products}</span></p>
            <p className="text-sm text-red-600">Stock bajo: <span className="font-semibold">{dashboard.kpis.inventory.low_stock}</span></p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {dashboard.alerts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🚨 Alertas</h3>
          <div className="space-y-2">
            {dashboard.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'critical' ? 'bg-red-50 border-red-600' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-600' :
                  'bg-blue-50 border-blue-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{alert.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{alert.category}</p>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ventas por hora */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Ventas por Hora</h3>
          <div style={{ height: '300px' }}>
            <Bar data={hourlyChartData} options={chartConfig.hourlyChartOptions} />
          </div>
        </div>

        {/* Tendencia semanal */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Tendencia Semanal</h3>
          <div style={{ height: '300px' }}>
            <Line
              data={weeklyTrendData}
              options={{
                ...chartConfig.weeklyTrendOptions,
                scales: {
                  y: { beginAtZero: true, position: 'left' },
                  y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
                }
              }}
            />
          </div>
        </div>

        {/* Ventas por categoría */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Ventas por Categoría</h3>
          <div style={{ height: '300px' }}>
            <Pie data={categoriesChartData} options={chartConfig.pieChartOptions} />
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Métodos de Pago</h3>
          <div style={{ height: '300px' }}>
            <Doughnut data={paymentMethodsData} options={chartConfig.pieChartOptions} />
          </div>
        </div>
      </div>

      {/* Top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Top Productos</h3>
          <div className="space-y-3">
            {dashboard.charts.top_products.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.quantity_sold} unidades vendidas</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">{dashboardUtils.formatCLP(product.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Productos con stock bajo */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">⚠️ Stock Bajo</h3>
          <div className="space-y-3">
            {dashboard.low_stock_items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-600">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Mínimo: {item.min_stock} unidades</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{item.stock}</p>
                  <p className="text-xs text-gray-600">
                    {dashboardUtils.getStockPercentage(item.stock, item.min_stock)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loyalty KPIs */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-lg shadow-lg mb-6">
        <h3 className="text-lg font-bold mb-4">💎 Programa de Lealtad</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm opacity-90">Miembros Totales</p>
            <p className="text-3xl font-bold">{dashboard.kpis.loyalty.total_members}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Transacciones Hoy</p>
            <p className="text-3xl font-bold">{dashboard.kpis.loyalty.todays_transactions}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Puntos Ganados</p>
            <p className="text-3xl font-bold">{dashboard.kpis.loyalty.points_earned_today.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Puntos Canjeados</p>
            <p className="text-3xl font-bold">{dashboard.kpis.loyalty.points_redeemed_today.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Métricas en tiempo real */}
      {realtime && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold mb-4">⚡ Tiempo Real (Última hora)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm opacity-90">Ventas</p>
              <p className="text-2xl font-bold">{realtime.sales_last_hour}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Ingresos</p>
              <p className="text-2xl font-bold">{realtime.revenue_last_hour_formatted}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Sesiones Activas</p>
              <p className="text-2xl font-bold">{realtime.active_sessions}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Llamadas Pendientes</p>
              <p className="text-2xl font-bold">{realtime.pending_waiter_calls}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboard;

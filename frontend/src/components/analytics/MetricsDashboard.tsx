/**
 * Dashboard de Métricas y KPIs en Tiempo Real
 * Visualización completa de indicadores clave del negocio
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Activity,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Target,
  Award,
  Zap,
  RefreshCw,
  Download,
  Filter,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import analyticsService from '../../services/analytics.service';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

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

interface Metric {
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  target?: number;
  unit?: string;
}

interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  achieved: boolean;
  trend: number[];
}

const MetricsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshInterval = useRef<NodeJS.Timeout>();

  // Estados de datos
  const [salesMetrics, setSalesMetrics] = useState<any>(null);
  const [inventoryMetrics, setInventoryMetrics] = useState<any>(null);
  const [customerMetrics, setCustomerMetrics] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);

  // Gráficos de datos
  const [salesChart, setSalesChart] = useState<any>(null);
  const [productsChart, setProductsChart] = useState<any>(null);
  const [hourlyChart, setHourlyChart] = useState<any>(null);
  const [categoryChart, setCategoryChart] = useState<any>(null);

  useEffect(() => {
    loadAllMetrics();

    if (autoRefresh) {
      refreshInterval.current = setInterval(loadAllMetrics, 60000); // Actualizar cada minuto
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [dateRange, autoRefresh]);

  const loadAllMetrics = async () => {
    try {
      setLoading(true);

      const range = getDateRangeValues();

      // Cargar todas las métricas en paralelo
      const [sales, inventory, customers, performance, kpiData] = await Promise.all([
        analyticsService.getSalesMetrics(range),
        analyticsService.getInventoryMetrics(),
        analyticsService.getCustomerMetrics(range),
        analyticsService.getPerformanceMetrics(),
        analyticsService.getKPIs(range)
      ]);

      setSalesMetrics(sales);
      setInventoryMetrics(inventory);
      setCustomerMetrics(customers);
      setPerformanceMetrics(performance);
      setKpis(kpiData);

      // Preparar datos para gráficos
      prepareSalesChart(sales);
      prepareProductsChart(sales);
      prepareHourlyChart(sales);
      prepareCategoryChart(sales);
    } catch (error) {
      console.error('Error cargando métricas:', error);
      toast.error('Error al cargar las métricas');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeValues = () => {
    const today = new Date();

    switch (dateRange) {
      case 'today':
        return { start: today, end: today };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { start: yesterday, end: yesterday };
      case 'week':
        return { start: startOfWeek(today, { locale: es }), end: endOfWeek(today, { locale: es }) };
      case 'month':
        return { start: startOfMonth(today), end: today };
      case 'last30':
        return { start: subDays(today, 30), end: today };
      case 'custom':
        return {
          start: new Date(customDateRange.start),
          end: new Date(customDateRange.end)
        };
      default:
        return { start: today, end: today };
    }
  };

  const prepareSalesChart = (data: any) => {
    setSalesChart({
      labels: data.timeline.map((t: any) => format(new Date(t.date), 'dd MMM', { locale: es })),
      datasets: [{
        label: 'Ventas',
        data: data.timeline.map((t: any) => t.total),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4
      }]
    });
  };

  const prepareProductsChart = (data: any) => {
    const topProducts = data.topProducts?.slice(0, 5) || [];

    setProductsChart({
      labels: topProducts.map((p: any) => p.name),
      datasets: [{
        label: 'Unidades Vendidas',
        data: topProducts.map((p: any) => p.quantity),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    });
  };

  const prepareHourlyChart = (data: any) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourlyData = hours.map(hour => {
      const hourData = data.hourlyBreakdown?.find((h: any) => h.hour === hour);
      return hourData?.sales || 0;
    });

    setHourlyChart({
      labels: hours.map(h => `${h}:00`),
      datasets: [{
        label: 'Ventas por Hora',
        data: hourlyData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }]
    });
  };

  const prepareCategoryChart = (data: any) => {
    const categories = data.categoryBreakdown || [];

    setCategoryChart({
      labels: categories.map((c: any) => c.name),
      datasets: [{
        data: categories.map((c: any) => c.total),
        backgroundColor: [
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 206, 86, 0.8)'
        ]
      }]
    });
  };

  const MetricCard: React.FC<{
    title: string;
    metric: Metric;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
  }> = ({ title, metric, icon, color, onClick }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer border-l-4 ${color}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color.replace('border-l', 'bg').replace('-600', '-100')}`}>
          {icon}
        </div>
        {metric.change !== 0 && (
          <div className={`flex items-center text-sm font-medium ${
            metric.changeType === 'increase' ? 'text-green-600' :
            metric.changeType === 'decrease' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {metric.changeType === 'increase' ? <ArrowUp className="w-4 h-4 mr-1" /> :
             metric.changeType === 'decrease' ? <ArrowDown className="w-4 h-4 mr-1" /> : null}
            {Math.abs(metric.change)}%
          </div>
        )}
      </div>

      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <div className="flex items-baseline">
        <p className="text-2xl font-bold text-gray-900">
          {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
        </p>
        {metric.unit && <span className="ml-1 text-gray-600 text-sm">{metric.unit}</span>}
      </div>

      {metric.target && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Meta</span>
            <span>{metric.target.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                metric.value >= metric.target ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );

  const KPICard: React.FC<{ kpi: KPI }> = ({ kpi }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-lg border-2 ${
        kpi.achieved ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{kpi.name}</h4>
        {kpi.achieved ? (
          <Award className="w-5 h-5 text-green-600" />
        ) : (
          <Target className="w-5 h-5 text-yellow-600" />
        )}
      </div>

      <div className="flex items-baseline mb-2">
        <span className="text-2xl font-bold text-gray-900">
          {kpi.value.toLocaleString()}
        </span>
        <span className="ml-1 text-gray-600 text-sm">{kpi.unit}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">
          Meta: {kpi.target.toLocaleString()} {kpi.unit}
        </span>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          kpi.achieved ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
        }`}>
          {Math.round((kpi.value / kpi.target) * 100)}%
        </span>
      </div>

      {kpi.trend && kpi.trend.length > 0 && (
        <div className="mt-2 h-8">
          <Line
            data={{
              labels: kpi.trend.map((_, i) => ''),
              datasets: [{
                data: kpi.trend,
                borderColor: kpi.achieved ? 'rgb(34, 197, 94)' : 'rgb(250, 204, 21)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }}
          />
        </div>
      )}
    </motion.div>
  );

  if (loading && !salesMetrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="w-16 h-16 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dashboard de Métricas y KPIs
                </h1>
                <p className="text-sm text-gray-600">
                  Análisis en tiempo real del rendimiento del negocio
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Selector de rango de fechas */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="last30">Últimos 30 días</option>
                <option value="custom">Personalizado</option>
              </select>

              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>

              {/* Export button */}
              <button className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fechas personalizadas */}
          {dateRange === 'custom' && (
            <div className="flex items-center space-x-4 mt-4">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <span className="text-gray-500">a</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={loadAllMetrics}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {salesMetrics && (
            <>
              <MetricCard
                title="Ventas Totales"
                metric={{
                  value: salesMetrics.totalSales || 0,
                  change: salesMetrics.salesGrowth || 0,
                  changeType: salesMetrics.salesGrowth >= 0 ? 'increase' : 'decrease',
                  target: salesMetrics.salesTarget,
                  unit: '$'
                }}
                icon={<DollarSign className="w-6 h-6 text-green-600" />}
                color="border-l-green-600"
              />

              <MetricCard
                title="Transacciones"
                metric={{
                  value: salesMetrics.totalTransactions || 0,
                  change: salesMetrics.transactionGrowth || 0,
                  changeType: salesMetrics.transactionGrowth >= 0 ? 'increase' : 'decrease',
                  unit: ''
                }}
                icon={<ShoppingCart className="w-6 h-6 text-blue-600" />}
                color="border-l-blue-600"
              />

              <MetricCard
                title="Ticket Promedio"
                metric={{
                  value: salesMetrics.averageTicket || 0,
                  change: salesMetrics.ticketGrowth || 0,
                  changeType: salesMetrics.ticketGrowth >= 0 ? 'increase' : 'decrease',
                  unit: '$'
                }}
                icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
                color="border-l-indigo-600"
              />

              <MetricCard
                title="Clientes Atendidos"
                metric={{
                  value: customerMetrics?.totalCustomers || 0,
                  change: customerMetrics?.customerGrowth || 0,
                  changeType: customerMetrics?.customerGrowth >= 0 ? 'increase' : 'decrease',
                  unit: ''
                }}
                icon={<Users className="w-6 h-6 text-purple-600" />}
                color="border-l-purple-600"
              />
            </>
          )}
        </div>

        {/* KPIs secundarios */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Indicadores Clave de Rendimiento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de ventas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Evolución de Ventas
            </h3>
            {salesChart && (
              <Line
                data={salesChart}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `$${context.parsed.y.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${value.toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            )}
          </div>

          {/* Gráfico de productos más vendidos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Productos Más Vendidos
            </h3>
            {productsChart && (
              <Bar
                data={productsChart}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            )}
          </div>

          {/* Distribución por hora */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ventas por Hora
            </h3>
            {hourlyChart && (
              <Bar
                data={hourlyChart}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${value.toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            )}
          </div>

          {/* Distribución por categoría */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ventas por Categoría
            </h3>
            {categoryChart && (
              <Doughnut
                data={categoryChart}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'right'
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Métricas de rendimiento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inventario */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Inventario</h3>
              <Package className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Productos en Stock</span>
                <span className="font-medium">{inventoryMetrics?.totalProducts || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valor Total</span>
                <span className="font-medium">${inventoryMetrics?.totalValue?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stock Bajo</span>
                <span className="font-medium text-yellow-600">{inventoryMetrics?.lowStock || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sin Stock</span>
                <span className="font-medium text-red-600">{inventoryMetrics?.outOfStock || 0}</span>
              </div>
            </div>
          </div>

          {/* Clientes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Clientes</h3>
              <Users className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Nuevos Clientes</span>
                <span className="font-medium">{customerMetrics?.newCustomers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Clientes Recurrentes</span>
                <span className="font-medium">{customerMetrics?.returningCustomers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasa de Retención</span>
                <span className="font-medium">{customerMetrics?.retentionRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Satisfacción</span>
                <span className="font-medium text-green-600">{customerMetrics?.satisfaction || 0}/5</span>
              </div>
            </div>
          </div>

          {/* Rendimiento del Sistema */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sistema</h3>
              <Zap className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tiempo de Respuesta</span>
                <span className="font-medium">{performanceMetrics?.responseTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="font-medium text-green-600">{performanceMetrics?.uptime || 99.9}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Errores (24h)</span>
                <span className="font-medium text-red-600">{performanceMetrics?.errors || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uso de CPU</span>
                <span className="font-medium">{performanceMetrics?.cpuUsage || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
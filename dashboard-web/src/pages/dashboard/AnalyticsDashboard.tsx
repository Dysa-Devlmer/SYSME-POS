/**
 * Analytics Dashboard - Real-time KPIs and Charts
 * Main dashboard with comprehensive business intelligence
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';
import dashboardService, { DashboardData } from '@/api/dashboardService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchDashboardData(true);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      const data = await dashboardService.getDashboardData();
      setDashboardData(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      if (!silent) {
        toast.error('Error cargando dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">No hay datos disponibles</p>
      </div>
    );
  }

  const { kpis, charts } = dashboardData;

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Analíticas</h1>
            <p className="text-gray-600 mt-2">
              Vista en tiempo real del desempeño del negocio
            </p>
            {lastUpdate && (
              <p className="text-sm text-gray-500 mt-1">
                Última actualización: {lastUpdate}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Auto-actualizar (30s)
              </span>
            </label>
            <button
              onClick={() => fetchDashboardData()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today Revenue */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90 font-medium">Ingresos Hoy</p>
              <p className="text-4xl font-bold mt-2">
                ${kpis.today_revenue.toLocaleString()}
              </p>
              {kpis.today_vs_yesterday_percentage !== 0 && (
                <p className={`text-sm mt-2 flex items-center ${kpis.today_vs_yesterday_percentage > 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {kpis.today_vs_yesterday_percentage > 0 ? '↑' : '↓'}
                  {Math.abs(kpis.today_vs_yesterday_percentage).toFixed(1)}% vs ayer
                </p>
              )}
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Today Transactions */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90 font-medium">Ventas Hoy</p>
              <p className="text-4xl font-bold mt-2">{kpis.today_transactions}</p>
              <p className="text-sm mt-2 opacity-90">
                Transacciones completadas
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Open Cash Sessions */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90 font-medium">Cajas Abiertas</p>
              <p className="text-4xl font-bold mt-2">{kpis.open_cash_sessions}</p>
              <p className="text-sm mt-2 opacity-90">
                Sesiones activas
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className={`bg-gradient-to-br ${kpis.low_stock_products > 0 ? 'from-red-500 to-red-600' : 'from-gray-500 to-gray-600'} text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90 font-medium">Stock Bajo</p>
              <p className="text-4xl font-bold mt-2">{kpis.low_stock_products}</p>
              <p className="text-sm mt-2 opacity-90">
                {kpis.low_stock_products > 0 ? 'Requiere atención' : 'Todo OK'}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Hora (Hoy)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={charts.hourly_sales}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12 }}
                label={{ value: 'Hora', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'Ingresos ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: any) => `$${value.toLocaleString()}`}
                labelFormatter={(label) => `${label}:00`}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Ingresos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Métodos de Pago (Hoy)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={charts.payment_methods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percentage }) => `${method}: ${percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
              >
                {charts.payment_methods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top 10 Productos (Esta Semana)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={charts.top_products} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={150}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#10B981" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trend Line Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Tendencia Semanal</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={charts.weekly_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                label={{ value: 'Día', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Ventas', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Ingresos ($)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'Ingresos') return `$${value.toLocaleString()}`;
                  return value;
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Ventas"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={2}
                name="Ingresos"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categories Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Desempeño por Categorías (Esta Semana)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={charts.top_categories}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Ingresos ($)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
            <Bar dataKey="revenue" name="Ingresos">
              {charts.top_categories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-6 border-2 border-indigo-200">
          <h4 className="text-sm font-semibold text-indigo-900 mb-2">Ticket Promedio Hoy</h4>
          <p className="text-3xl font-bold text-indigo-700">
            ${kpis.today_transactions > 0
              ? (kpis.today_revenue / kpis.today_transactions).toLocaleString()
              : '0'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow p-6 border-2 border-teal-200">
          <h4 className="text-sm font-semibold text-teal-900 mb-2">Producto Más Vendido</h4>
          <p className="text-xl font-bold text-teal-700">
            {charts.top_products[0]?.name || 'N/A'}
          </p>
          <p className="text-sm text-teal-600 mt-1">
            {charts.top_products[0]?.quantity || 0} unidades
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6 border-2 border-orange-200">
          <h4 className="text-sm font-semibold text-orange-900 mb-2">Categoría Top</h4>
          <p className="text-xl font-bold text-orange-700">
            {charts.top_categories[0]?.name || 'N/A'}
          </p>
          <p className="text-sm text-orange-600 mt-1">
            ${charts.top_categories[0]?.revenue.toLocaleString() || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

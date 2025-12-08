import React, { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface SalesReport {
  period: string;
  total_sales: number;
  total_orders: number;
  average_order: number;
  payment_methods: {
    cash: number;
    card: number;
    transfer: number;
  };
}

interface ProductReport {
  id: number;
  name: string;
  category: string;
  quantity_sold: number;
  total_revenue: number;
  profit_margin: number;
}

interface TimeReport {
  hour: string;
  orders: number;
  revenue: number;
}

const ReportsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedReport, setSelectedReport] = useState('sales');
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [productData, setProductData] = useState<ProductReport[]>([]);
  const [timeData, setTimeData] = useState<TimeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReports();
  }, [selectedPeriod, selectedReport]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = {
        period: selectedPeriod,
        start_date: dateRange.start,
        end_date: dateRange.end
      };

      if (selectedReport === 'sales') {
        try {
          const response = await apiClient.get('/reports/sales', { params });
          if (response.data?.data) {
            setSalesData(response.data.data);
          } else {
            // Fallback to default data if API returns empty
            setSalesData({
              period: selectedPeriod,
              total_sales: 0,
              total_orders: 0,
              average_order: 0,
              payment_methods: { cash: 0, card: 0, transfer: 0 }
            });
          }
        } catch (apiError) {
          console.warn('Using fallback sales data:', apiError);
          setSalesData({
            period: selectedPeriod,
            total_sales: 0,
            total_orders: 0,
            average_order: 0,
            payment_methods: { cash: 0, card: 0, transfer: 0 }
          });
        }
      } else if (selectedReport === 'products') {
        try {
          const response = await apiClient.get('/reports/product-performance', { params });
          if (response.data?.data?.products) {
            setProductData(response.data.data.products);
          } else {
            setProductData([]);
          }
        } catch (apiError) {
          console.warn('Using fallback products data:', apiError);
          setProductData([]);
        }
      } else if (selectedReport === 'time') {
        try {
          const response = await apiClient.get('/reports/hourly-sales', { params });
          if (response.data?.data?.hourly) {
            setTimeData(response.data.data.hourly);
          } else {
            setTimeData([]);
          }
        } catch (apiError) {
          console.warn('Using fallback time data:', apiError);
          setTimeData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    // Simular exportación de reporte
    const reportData = {
      type: selectedReport,
      period: selectedPeriod,
      generated_at: new Date().toISOString(),
      data: selectedReport === 'sales' ? salesData :
            selectedReport === 'products' ? productData : timeData
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `reporte_${selectedReport}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const printReport = () => {
    window.print();
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
            <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
            <p className="text-gray-600 mt-1">
              Análisis detallado de ventas, productos y rendimiento
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={exportReport}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              📥 Exportar
            </button>
            <button
              onClick={printReport}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sales">📊 Ventas</option>
              <option value="products">📦 Productos</option>
              <option value="time">⏰ Por Horario</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {selectedPeriod === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Sales Report */}
      {selectedReport === 'sales' && salesData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Ventas</p>
                  <p className="text-2xl font-bold text-gray-900">${salesData.total_sales.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">📋</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Órdenes</p>
                  <p className="text-2xl font-bold text-gray-900">{salesData.total_orders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Orden Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">${salesData.average_order.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Métodos de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">💵 Efectivo</p>
                    <p className="text-xl font-bold text-green-900">${salesData.payment_methods.cash.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-green-600">
                    {((salesData.payment_methods.cash / salesData.total_sales) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">💳 Tarjetas</p>
                    <p className="text-xl font-bold text-blue-900">${salesData.payment_methods.card.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-blue-600">
                    {((salesData.payment_methods.card / salesData.total_sales) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">🏦 Transferencias</p>
                    <p className="text-xl font-bold text-purple-900">${salesData.payment_methods.transfer.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-purple-600">
                    {((salesData.payment_methods.transfer / salesData.total_sales) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Report */}
      {selectedReport === 'products' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Reporte de Productos</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad Vendida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen de Ganancia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productData.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.quantity_sold}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${product.total_revenue.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        product.profit_margin > 70 ? 'text-green-600' :
                        product.profit_margin > 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {product.profit_margin.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Time Report */}
      {selectedReport === 'time' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Horario</h3>

          <div className="space-y-3">
            {timeData.map((timeSlot) => (
              <div key={timeSlot.hour} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-900 w-16">{timeSlot.hour}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(timeSlot.orders / Math.max(...timeData.map(t => t.orders))) * 100}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{timeSlot.orders} órdenes</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">${timeSlot.revenue.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Hora Pico</p>
              <p className="text-xl font-bold text-blue-900">
                {timeData.reduce((max, curr) => curr.orders > max.orders ? curr : max, timeData[0])?.hour}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Mayor Ingreso</p>
              <p className="text-xl font-bold text-green-900">
                ${timeData.reduce((max, curr) => curr.revenue > max.revenue ? curr : max, timeData[0])?.revenue.toFixed(2)}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-600">Promedio por Hora</p>
              <p className="text-xl font-bold text-purple-900">
                ${(timeData.reduce((sum, curr) => sum + curr.revenue, 0) / timeData.length).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generated Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">
          📊 Reporte generado el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}
        </p>
        <p className="text-sm text-gray-600">
          📈 Período: {selectedPeriod === 'today' ? 'Hoy' :
                      selectedPeriod === 'yesterday' ? 'Ayer' :
                      selectedPeriod === 'week' ? 'Esta Semana' :
                      selectedPeriod === 'month' ? 'Este Mes' :
                      `${dateRange.start} a ${dateRange.end}`}
        </p>
        <p className="text-sm text-gray-600">
          🎯 Tipo: {selectedReport === 'sales' ? 'Reporte de Ventas' :
                   selectedReport === 'products' ? 'Reporte de Productos' :
                   'Reporte por Horario'}
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;
/**
 * Advanced Reports Page - Complete reporting system
 * Sales, Inventory, Performance, Cash Sessions, and more
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import reportsService, {
  SalesReportData,
  InventoryReportData,
  ProductPerformance,
  CategoryPerformance,
  PaymentMethodReport,
  HourlySales,
  CashSessionsReportData,
  WaiterPerformance
} from '@/api/reportsService';

type ReportType = 'sales' | 'inventory' | 'products' | 'categories' | 'payments' | 'hourly' | 'cash' | 'waiters';
type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'last7' | 'last30' | 'custom';

const AdvancedReportsPage: React.FC = () => {
  // State
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);

  // Report Data States
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null);
  const [productsData, setProductsData] = useState<ProductPerformance[]>([]);
  const [categoriesData, setCategoriesData] = useState<CategoryPerformance[]>([]);
  const [paymentsData, setPaymentsData] = useState<PaymentMethodReport[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlySales[]>([]);
  const [cashData, setCashData] = useState<CashSessionsReportData | null>(null);
  const [waitersData, setWaitersData] = useState<WaiterPerformance[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, selectedPeriod, dateRange]);

  const getDateRangeParams = () => {
    switch (selectedPeriod) {
      case 'today':
        return reportsService.dates.getToday();
      case 'yesterday':
        return reportsService.dates.getYesterday();
      case 'week':
        return reportsService.dates.getThisWeek();
      case 'month':
        return reportsService.dates.getThisMonth();
      case 'last7':
        return reportsService.dates.getLast7Days();
      case 'last30':
        return reportsService.dates.getLast30Days();
      case 'custom':
        return { start_date: dateRange.start, end_date: dateRange.end };
      default:
        return reportsService.dates.getToday();
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const params = getDateRangeParams();

      switch (selectedReport) {
        case 'sales':
          const sales = await reportsService.sales.getSalesReport({
            ...params,
            group_by: 'day'
          });
          setSalesData(sales);
          break;

        case 'inventory':
          const inventory = await reportsService.inventory.getInventoryReport();
          setInventoryData(inventory);
          break;

        case 'products':
          const products = await reportsService.performance.getProductPerformance({
            ...params,
            limit: 20
          });
          setProductsData(products);
          break;

        case 'categories':
          const categories = await reportsService.performance.getCategoryPerformance(params);
          setCategoriesData(categories);
          break;

        case 'payments':
          const payments = await reportsService.sales.getPaymentMethods(params);
          setPaymentsData(payments);
          break;

        case 'hourly':
          const hourly = await reportsService.sales.getHourlySales({
            date: params.start_date
          });
          setHourlyData(hourly);
          break;

        case 'cash':
          const cash = await reportsService.cash.getCashSessionsReport(params);
          setCashData(cash);
          break;

        case 'waiters':
          const waiters = await reportsService.staff.getWaiterPerformance(params);
          setWaitersData(waiters);
          break;
      }
    } catch (error: any) {
      console.error('Error fetching report:', error);
      toast.error(error.message || 'Error cargando reporte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      let dataToExport: any[] = [];
      let filename = '';

      switch (selectedReport) {
        case 'sales':
          dataToExport = salesData?.by_period || [];
          filename = `ventas_${selectedPeriod}`;
          break;
        case 'inventory':
          dataToExport = inventoryData?.by_category || [];
          filename = `inventario_${selectedPeriod}`;
          break;
        case 'products':
          dataToExport = productsData;
          filename = `productos_${selectedPeriod}`;
          break;
        case 'categories':
          dataToExport = categoriesData;
          filename = `categorias_${selectedPeriod}`;
          break;
        case 'payments':
          dataToExport = paymentsData;
          filename = `pagos_${selectedPeriod}`;
          break;
        case 'hourly':
          dataToExport = hourlyData;
          filename = `ventas_horarias_${selectedPeriod}`;
          break;
        case 'cash':
          dataToExport = cashData?.sessions || [];
          filename = `cajas_${selectedPeriod}`;
          break;
        case 'waiters':
          dataToExport = waitersData;
          filename = `meseros_${selectedPeriod}`;
          break;
      }

      if (dataToExport.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      reportsService.export.exportToCSV(dataToExport, filename);
      toast.success('Reporte exportado exitosamente');
    } catch (error: any) {
      toast.error('Error exportando reporte');
    }
  };

  const handleExportJSON = () => {
    try {
      const reportData = {
        type: selectedReport,
        period: selectedPeriod,
        date_range: getDateRangeParams(),
        generated_at: new Date().toISOString(),
        data: selectedReport === 'sales' ? salesData :
              selectedReport === 'inventory' ? inventoryData :
              selectedReport === 'products' ? productsData :
              selectedReport === 'categories' ? categoriesData :
              selectedReport === 'payments' ? paymentsData :
              selectedReport === 'hourly' ? hourlyData :
              selectedReport === 'cash' ? cashData :
              selectedReport === 'waiters' ? waitersData : null
      };

      reportsService.export.exportToJSON(reportData, `reporte_${selectedReport}_${selectedPeriod}`);
      toast.success('Reporte exportado exitosamente');
    } catch (error: any) {
      toast.error('Error exportando reporte');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes Avanzados</h1>
            <p className="text-gray-600 mt-2">
              Análisis completo de ventas, inventario, desempeño y más
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportCSV}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              📄 Exportar JSON
            </button>
            <button
              onClick={() => reportsService.export.printReport()}
              className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-md"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Reporte</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="sales">📊 Ventas Generales</option>
              <option value="inventory">📦 Inventario</option>
              <option value="products">🏆 Productos Top</option>
              <option value="categories">📂 Categorías</option>
              <option value="payments">💳 Métodos de Pago</option>
              <option value="hourly">⏰ Ventas por Hora</option>
              <option value="cash">💰 Sesiones de Caja</option>
              <option value="waiters">👤 Desempeño Meseros</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="last7">Últimos 7 Días</option>
              <option value="last30">Últimos 30 Días</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchReportData}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md disabled:opacity-50"
            >
              🔄 Actualizar Datos
            </button>
          </div>
        </div>

        {/* Custom Date Range */}
        {selectedPeriod === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Fin</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Sales Report */}
        {selectedReport === 'sales' && salesData && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Resumen de Ventas</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Ventas</p>
                <p className="text-3xl font-bold mt-2">{salesData.summary.total_sales}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Ingresos</p>
                <p className="text-3xl font-bold mt-2">${salesData.summary.total_revenue.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Promedio por Venta</p>
                <p className="text-3xl font-bold mt-2">${salesData.summary.average_sale.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Descuentos</p>
                <p className="text-3xl font-bold mt-2">${salesData.summary.total_discounts.toLocaleString()}</p>
              </div>
            </div>

            {/* Period Breakdown */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Desglose por Período</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesData.by_period.map((period, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{period.period}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{period.sales_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${period.revenue.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${period.average_sale.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Report */}
        {selectedReport === 'inventory' && inventoryData && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Inventario</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Productos</p>
                <p className="text-3xl font-bold mt-2">{inventoryData.summary.total_products}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Stock Total</p>
                <p className="text-3xl font-bold mt-2">{inventoryData.summary.total_stock}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Valor Total</p>
                <p className="text-3xl font-bold mt-2">${inventoryData.summary.total_value.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Stock Bajo</p>
                <p className="text-3xl font-bold mt-2">{inventoryData.summary.low_stock_count}</p>
              </div>
            </div>

            {/* Low Stock Items */}
            {inventoryData.low_stock_items.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-red-600">⚠️ Productos con Stock Bajo</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Precio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Categoría</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventoryData.low_stock_items.map((item) => (
                        <tr key={item.id} className="hover:bg-red-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.sku}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.stock === 0 ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                              {item.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${item.price.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.category_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Performance */}
        {selectedReport === 'products' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Productos Más Vendidos</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ranking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidades</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Prom.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"># Ventas</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productsData.map((product, idx) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${idx === 0 ? 'bg-yellow-200 text-yellow-800' : idx === 1 ? 'bg-gray-200 text-gray-800' : idx === 2 ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-600'}`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.units_sold}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">${product.total_revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${product.average_price.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.number_of_sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories Performance */}
        {selectedReport === 'categories' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Desempeño por Categorías</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoriesData.map((category) => (
                <div key={category.id} className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg shadow border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{category.name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Productos:</span>
                      <span className="text-sm font-semibold text-gray-900">{category.products_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Unidades Vendidas:</span>
                      <span className="text-sm font-semibold text-gray-900">{category.units_sold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ingresos Totales:</span>
                      <span className="text-sm font-semibold text-green-600">${category.total_revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Precio Promedio:</span>
                      <span className="text-sm font-semibold text-gray-900">${category.average_price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {selectedReport === 'payments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Métodos de Pago</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentsData.map((payment) => (
                <div key={payment.payment_method} className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-lg border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-blue-900 mb-4">{payment.payment_method.toUpperCase()}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Transacciones:</span>
                      <span className="text-sm font-bold text-gray-900">{payment.transaction_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Monto Total:</span>
                      <span className="text-lg font-bold text-blue-700">${payment.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Promedio:</span>
                      <span className="text-sm font-semibold text-gray-900">${payment.average_transaction.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hourly Sales */}
        {selectedReport === 'hourly' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Ventas por Hora</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {hourlyData.map((hour) => {
                const hasActivity = hour.sales_count > 0;
                return (
                  <div
                    key={hour.hour}
                    className={`p-4 rounded-lg shadow text-center ${hasActivity ? 'bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-400' : 'bg-gray-100'}`}
                  >
                    <p className="text-lg font-bold text-gray-900">{hour.hour}:00</p>
                    <p className="text-2xl font-bold text-green-700 mt-2">{hour.sales_count}</p>
                    <p className="text-xs text-gray-600 mt-1">${hour.revenue.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cash Sessions */}
        {selectedReport === 'cash' && cashData && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Sesiones de Caja</h2>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Sesiones</p>
                <p className="text-3xl font-bold mt-2">{cashData.summary.total_sessions}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Ventas</p>
                <p className="text-3xl font-bold mt-2">${cashData.summary.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Cierre</p>
                <p className="text-3xl font-bold mt-2">${cashData.summary.total_closing_amount.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Diferencias</p>
                <p className="text-3xl font-bold mt-2">${cashData.summary.total_difference.toLocaleString()}</p>
              </div>
            </div>

            {/* Sessions List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apertura</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cierre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Inicial</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Final</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cashData.sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(session.opened_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{session.closed_at ? new Date(session.closed_at).toLocaleString() : 'Abierta'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${session.opening_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${(session.closing_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${session.difference > 0 ? 'text-green-600' : session.difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          ${session.difference.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${session.status === 'open' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                          {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Waiters Performance */}
        {selectedReport === 'waiters' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Desempeño de Meseros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitersData.map((waiter, idx) => (
                <div key={waiter.id} className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg shadow-lg border-2 border-indigo-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-indigo-900">{waiter.full_name}</h3>
                      <p className="text-sm text-gray-600">@{waiter.username}</p>
                    </div>
                    {idx < 3 && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-300 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-900' : 'bg-orange-300 text-orange-900'}`}>
                        #{idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Ventas:</span>
                      <span className="text-sm font-bold text-gray-900">{waiter.total_sales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Ingresos:</span>
                      <span className="text-lg font-bold text-green-700">${waiter.total_revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Promedio:</span>
                      <span className="text-sm font-semibold text-gray-900">${waiter.average_sale.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm text-gray-700">Propinas:</span>
                      <span className="text-sm font-bold text-indigo-700">${waiter.total_tips.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Propina Prom:</span>
                      <span className="text-sm font-semibold text-gray-900">${waiter.average_tip.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {((selectedReport === 'sales' && !salesData) ||
          (selectedReport === 'inventory' && !inventoryData) ||
          (selectedReport === 'products' && productsData.length === 0) ||
          (selectedReport === 'categories' && categoriesData.length === 0) ||
          (selectedReport === 'payments' && paymentsData.length === 0) ||
          (selectedReport === 'hourly' && hourlyData.length === 0) ||
          (selectedReport === 'cash' && !cashData) ||
          (selectedReport === 'waiters' && waitersData.length === 0)) && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay datos disponibles para este reporte</p>
            <p className="text-gray-400 text-sm mt-2">Intenta seleccionar un período diferente o verifica que existan datos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedReportsPage;

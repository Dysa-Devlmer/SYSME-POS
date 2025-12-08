import React, { useEffect, useState } from 'react';
import { Line, Scatter, Doughnut } from 'react-chartjs-2';
import {
  biService,
  biUtils,
  biChartConfig,
  type DashboardSummary,
  type SalesForecast,
  type MenuEngineering,
  type RFMAnalysis,
  type RFMCustomer,
  type AnomalyDetection
} from '@/services/businessIntelligenceService';
import { useAuthStore } from '@/store/authStore';

const BusinessIntelligencePage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'forecast' | 'menu' | 'rfm' | 'anomalies'>('dashboard');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [menuEngineering, setMenuEngineering] = useState<MenuEngineering | null>(null);
  const [rfmAnalysis, setRFMAnalysis] = useState<RFMAnalysis | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyDetection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos según tab activo
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'dashboard') {
        const data = await biService.getDashboardSummary();
        setSummary(data);
      } else if (activeTab === 'forecast') {
        const data = await biService.getSalesForecast();
        setForecast(data);
      } else if (activeTab === 'menu') {
        const data = await biService.getMenuEngineering();
        setMenuEngineering(data);
      } else if (activeTab === 'rfm') {
        const data = await biService.getRFMAnalysis();
        // Enriquecer con scores
        const enriched = {
          ...data,
          customers: data.customers.map(c => ({
            ...c,
            rfm_score: biUtils.calculateRFMScore(c),
            segment: biUtils.segmentCustomer(biUtils.calculateRFMScore(c))
          }))
        };
        setRFMAnalysis(enriched);
      } else if (activeTab === 'anomalies') {
        const data = await biService.getAnomalies();
        setAnomalies(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Auto-refresh cada 5 minutos para dashboard y anomalías
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'anomalies') {
      const interval = setInterval(fetchData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analizando datos...</p>
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
            onClick={fetchData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Preparar datos para gráfico de forecast
  const forecastChartData = forecast ? {
    labels: [
      ...forecast.historical.map(d => new Date(d.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })),
      'Mañana'
    ],
    datasets: [
      {
        label: 'Histórico',
        data: [...forecast.historical.map(d => d.revenue), null],
        borderColor: biChartConfig.colors.primary,
        backgroundColor: biChartConfig.colors.primary + '20',
        fill: true
      },
      {
        label: 'Pronóstico',
        data: [...forecast.historical.map(() => null), forecast.forecast.next_day_estimate],
        borderColor: biChartConfig.colors.warning,
        backgroundColor: biChartConfig.colors.warning,
        borderDash: [5, 5],
        pointRadius: 8,
        pointStyle: 'star'
      }
    ]
  } : null;

  // Preparar datos para gráfico BCG de menú
  const bcgChartData = menuEngineering ? {
    labels: ['⭐ Estrellas', '🧩 Enigmas', '🐴 Caballos', '🐕 Perros'],
    datasets: [{
      data: [
        menuEngineering.summary.stars,
        menuEngineering.summary.puzzles,
        menuEngineering.summary.plow_horses,
        menuEngineering.summary.dogs
      ],
      backgroundColor: [
        biChartConfig.colors.star,
        biChartConfig.colors.puzzle,
        biChartConfig.colors.plowHorse,
        biChartConfig.colors.dog
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  } : null;

  // Preparar datos para scatter de RFM
  const rfmScatterData = rfmAnalysis ? {
    datasets: [{
      label: 'Clientes',
      data: rfmAnalysis.customers.map(c => ({
        x: c.frequency,
        y: c.monetary,
        name: c.name,
        phone: c.phone
      })),
      backgroundColor: biChartConfig.colors.primary,
      pointRadius: 6,
      pointHoverRadius: 8
    }]
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🧠 Business Intelligence</h1>
        <p className="text-gray-600 mt-1">
          Análisis avanzado y predicciones - {user?.username}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'forecast', label: 'Pronóstico', icon: '📈' },
            { id: 'menu', label: 'Análisis de Menú', icon: '🍽️' },
            { id: 'rfm', label: 'Clientes RFM', icon: '👥' },
            { id: 'anomalies', label: 'Anomalías', icon: '⚠️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">TRANSACCIONES HOY</h3>
              <p className="text-3xl font-bold text-blue-600">{summary.sales.total_transactions}</p>
              <p className="text-sm text-gray-500 mt-1">ventas completadas</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">INGRESOS HOY</h3>
              <p className="text-3xl font-bold text-green-600">
                {biUtils.formatCLP(summary.sales.total_revenue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Ticket promedio: {biUtils.formatCLP(summary.sales.avg_ticket)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">INVENTARIO</h3>
              <p className="text-3xl font-bold text-orange-600">{summary.inventory.total_products}</p>
              <p className="text-sm text-red-600 mt-1 font-semibold">
                ⚠️ {summary.inventory.low_stock} productos con stock bajo
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-2">💡 Insights Rápidos</h3>
            <ul className="space-y-2">
              <li>• El ticket promedio hoy es {biUtils.formatCLP(summary.sales.avg_ticket)}</li>
              <li>• Se han realizado {summary.sales.total_transactions} transacciones</li>
              <li>• Hay {summary.inventory.low_stock} productos que necesitan reabastecimiento</li>
            </ul>
          </div>
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'forecast' && forecast && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Pronóstico de Ventas</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg" title="Estimación Mañana: Predicción de ingresos para el próximo día basada en análisis de datos históricos de los últimos 30 días usando Machine Learning.">
                <p className="text-sm text-gray-600">Estimación Mañana 💡</p>
                <p className="text-2xl font-bold text-green-600">
                  {biUtils.formatCLP(forecast.forecast.next_day_estimate)}
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg" title="Confianza: Nivel de certeza del modelo ML (0-1). Alta confianza (>0.8) indica patrones estables. Baja confianza (<0.6) sugiere variabilidad alta.">
                <p className="text-sm text-gray-600">Confianza 💡</p>
                <p className="text-2xl font-bold text-blue-600">
                  {biUtils.formatConfidence(forecast.forecast.confidence)}
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg" title="Método ML: Algoritmo de Machine Learning utilizado para el pronóstico. Promedio Móvil Simple (SMA) analiza tendencias recientes para predecir ventas futuras.">
                <p className="text-sm text-gray-600">Método 💡</p>
                <p className="text-sm font-semibold text-purple-600 mt-2">
                  {forecast.forecast.method.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
            </div>

            <div style={{ height: '400px' }}>
              {forecastChartData && (
                <Line data={forecastChartData} options={biChartConfig.forecastChartOptions} />
              )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Este pronóstico se basa en datos históricos de los últimos 30 días
                usando promedio móvil simple. Los resultados reales pueden variar según eventos especiales,
                temporada y otros factores externos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Engineering Tab */}
      {activeTab === 'menu' && menuEngineering && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BCG Matrix Summary */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Matriz BCG</h3>
              <div style={{ height: '300px' }}>
                {bcgChartData && (
                  <Doughnut data={bcgChartData} options={biChartConfig.bcgChartOptions} />
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="space-y-3">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg" title="Estrellas: Productos con alta popularidad y alto margen de ganancia. Son los productos estrella del menú que generan más ingresos. Mantener stock y destacar en el menú.">
                <h4 className="font-bold text-green-800">⭐ Estrellas ({menuEngineering.summary.stars}) 💡</h4>
                <p className="text-sm text-green-700">Alta popularidad, alto margen - Mantener y promover</p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg" title="Enigmas: Productos con bajo volumen de ventas pero alto margen. Representan oportunidad de crecimiento con marketing adecuado o mejora en presentación.">
                <h4 className="font-bold text-yellow-800">🧩 Enigmas ({menuEngineering.summary.puzzles}) 💡</h4>
                <p className="text-sm text-yellow-700">Baja popularidad, alto margen - Promocionar más</p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg" title="Caballos de Arado: Productos muy vendidos pero con bajo margen. Generan tráfico pero poca ganancia. Considerar aumentar precio o reducir costos de producción.">
                <h4 className="font-bold text-blue-800">🐴 Caballos ({menuEngineering.summary.plow_horses}) 💡</h4>
                <p className="text-sm text-blue-700">Alta popularidad, bajo margen - Revisar precios</p>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg" title="Perros: Productos con baja popularidad y bajo margen. No contribuyen significativamente al negocio. Evaluar si eliminar del menú o rediseñar completamente.">
                <h4 className="font-bold text-red-800">🐕 Perros ({menuEngineering.summary.dogs}) 💡</h4>
                <p className="text-sm text-red-700">Baja popularidad, bajo margen - Considerar eliminar</p>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🍽️ Top Productos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margen</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendidos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clasificación</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menuEngineering.products.slice(0, 20).map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{biUtils.formatCLP(product.price)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{biUtils.formatCLP(product.cost)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {biUtils.formatCLP(product.margin)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.total_sold}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                        {biUtils.formatCLP(product.total_revenue)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.classification === 'star' ? 'bg-green-100 text-green-800' :
                          product.classification === 'puzzle' ? 'bg-yellow-100 text-yellow-800' :
                          product.classification === 'plow_horse' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {biUtils.getProductClassificationLabel(product.classification)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RFM Analysis Tab */}
      {activeTab === 'rfm' && rfmAnalysis && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">👥 Análisis RFM de Clientes</h3>
            <p className="text-gray-600 mb-4">
              Segmentación de clientes según Recency (última compra), Frequency (frecuencia) y Monetary (valor monetario)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-purple-600">{rfmAnalysis.total_analyzed}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">VIP</p>
                <p className="text-2xl font-bold text-green-600">
                  {rfmAnalysis.customers.filter(c => c.segment === '🏆 VIP').length}
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Leales</p>
                <p className="text-2xl font-bold text-blue-600">
                  {rfmAnalysis.customers.filter(c => c.segment === '💎 Leal').length}
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">En Riesgo</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {rfmAnalysis.customers.filter(c => c.segment === '😴 En Riesgo').length}
                </p>
              </div>
            </div>

            <div style={{ height: '400px' }} className="mb-6">
              {rfmScatterData && (
                <Scatter data={rfmScatterData} options={biChartConfig.rfmScatterOptions} />
              )}
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Top Clientes</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Compra</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFM Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segmento</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rfmAnalysis.customers.slice(0, 20).map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customer.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(customer.last_purchase).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customer.frequency} compras</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {biUtils.formatCLP(customer.monetary)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">
                          {customer.rfm_score}/15
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          customer.segment === '🏆 VIP' ? 'bg-purple-100 text-purple-800' :
                          customer.segment === '💎 Leal' ? 'bg-green-100 text-green-800' :
                          customer.segment === '👤 Regular' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {customer.segment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Anomalies Tab */}
      {activeTab === 'anomalies' && anomalies && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">⚠️ Detección de Anomalías</h3>
              <button
                onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                🔄 Actualizar
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Última verificación: {new Date(anomalies.checked_at).toLocaleString('es-CL')}
            </p>

            {anomalies.anomalies.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-lg font-semibold text-green-600">No se detectaron anomalías</p>
                <p className="text-gray-600 mt-2">Todo está funcionando normalmente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.anomalies.map((anomaly, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      anomaly.severity === 'high' ? 'bg-red-50 border-red-500' :
                      anomaly.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{biUtils.getAnomalyIcon(anomaly.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-gray-900">{anomaly.message}</h4>
                          <span className={`px-2 py-1 text-xs rounded font-semibold ${
                            anomaly.severity === 'high' ? 'bg-red-200 text-red-800' :
                            anomaly.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {anomaly.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Tipo: {anomaly.type.replace(/_/g, ' ')}</p>
                        {anomaly.data && (
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(anomaly.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-2">💡 ¿Qué se detecta?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Transacciones de valor inusualmente alto</li>
              <li>• Cantidad excesiva de reembolsos</li>
              <li>• Caídas significativas en ventas</li>
              <li>• Alertas de inventario crítico</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessIntelligencePage;

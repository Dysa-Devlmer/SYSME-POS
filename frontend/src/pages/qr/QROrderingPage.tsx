/**
 * =====================================================
 * SYSME POS - QR Ordering Management Page
 * =====================================================
 * Página de gestión del sistema de pedidos por QR
 *
 * @module QROrderingPage
 * @date 2025-12-08
 */

import React, { useState, useEffect } from 'react';
import {
  qrCodeService,
  sessionService,
  waiterService,
  billService,
  dashboardService,
  configService,
  QRDashboard,
  QRSession,
  WaiterCall,
  BillRequest,
  MenuConfig,
  qrUtils
} from '@/services/qrOrderingService';

const QROrderingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'qrcodes' | 'config'>('dashboard');
  const [dashboard, setDashboard] = useState<QRDashboard | null>(null);
  const [sessions, setSessions] = useState<QRSession[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [billRequests, setBillRequests] = useState<BillRequest[]>([]);
  const [config, setConfig] = useState<MenuConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await dashboardService.get();
        setDashboard(data);
        setWaiterCalls(data.pending_waiter_calls);
        setBillRequests(data.pending_bill_requests);
      } else if (activeTab === 'sessions') {
        const data = await sessionService.getActive();
        setSessions(data);
      } else if (activeTab === 'config') {
        const data = await configService.get();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching QR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (sessionId: number) => {
    if (!confirm('¿Cerrar esta sesión?')) return;
    try {
      await sessionService.close(sessionId);
      alert('Sesión cerrada');
      fetchData();
    } catch (error) {
      alert('Error al cerrar sesión');
    }
  };

  const handleRespondCall = async (callId: number) => {
    try {
      await waiterService.respond(callId);
      alert('Llamada atendida');
      fetchData();
    } catch (error) {
      alert('Error al responder llamada');
    }
  };

  const handleProcessBill = async (requestId: number) => {
    try {
      await billService.process(requestId);
      alert('Solicitud procesada');
      fetchData();
    } catch (error) {
      alert('Error al procesar solicitud');
    }
  };

  const handleRegenerateQRs = async () => {
    if (!confirm('¿Regenerar TODOS los códigos QR? Los códigos anteriores dejarán de funcionar.')) return;
    try {
      await qrCodeService.regenerateAll();
      alert('Códigos QR regenerados exitosamente');
    } catch (error) {
      alert('Error al regenerar códigos QR');
    }
  };

  const handleUpdateConfig = async (updates: Partial<MenuConfig>) => {
    try {
      const updated = await configService.update(updates);
      setConfig(updated);
      alert('Configuración actualizada');
    } catch (error) {
      alert('Error al actualizar configuración');
    }
  };

  // ============================================
  // DASHBOARD TAB
  // ============================================
  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Sesiones Activas</p>
              <p className="text-3xl font-bold">{dashboard?.active_sessions.length || 0}</p>
            </div>
            <div className="text-4xl">📱</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pedidos Hoy</p>
              <p className="text-3xl font-bold text-green-600">{dashboard?.today_stats.total_orders || 0}</p>
            </div>
            <div className="text-4xl">🍽️</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Ingresos QR</p>
              <p className="text-3xl font-bold text-purple-600">{qrUtils.formatPrice(dashboard?.today_stats.total_revenue || 0)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Escaneos QR</p>
              <p className="text-3xl font-bold text-blue-600">{dashboard?.today_stats.qr_scans || 0}</p>
            </div>
            <div className="text-4xl">📸</div>
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Waiter Calls */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">🔔 Llamadas Pendientes ({waiterCalls.length})</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {waiterCalls.map((call) => (
              <div key={call.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold">Mesa {call.table_number} - {call.table_name}</p>
                    <p className="text-sm text-gray-600">{call.call_type === 'assistance' ? '🆘 Asistencia' : call.call_type === 'order' ? '📝 Pedido' : call.call_type === 'bill' ? '💳 Cuenta' : '❓ Otro'}</p>
                  </div>
                  <span className="text-sm text-gray-500">{qrUtils.getElapsedTime(call.created_at)}</span>
                </div>
                {call.message && (
                  <p className="text-sm text-gray-600 mb-2">💬 "{call.message}"</p>
                )}
                <button
                  onClick={() => handleRespondCall(call.id)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  ✅ Atender
                </button>
              </div>
            ))}
            {waiterCalls.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">🎉</p>
                <p>No hay llamadas pendientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Bill Requests */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">💳 Solicitudes de Cuenta ({billRequests.length})</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {billRequests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold">Mesa {request.table_number}</p>
                    <p className="text-sm text-gray-600">
                      {request.request_type === 'full' ? '📄 Cuenta completa' : '✂️ Cuenta dividida'}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">{qrUtils.getElapsedTime(request.created_at)}</span>
                </div>
                <div className="mb-2">
                  <p className="text-lg font-bold">{qrUtils.formatPrice(request.total_amount || 0)}</p>
                  {request.tip_percentage && (
                    <p className="text-sm text-gray-600">Propina: {request.tip_percentage}%</p>
                  )}
                </div>
                <button
                  onClick={() => handleProcessBill(request.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  💳 Procesar
                </button>
              </div>
            ))}
            {billRequests.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">💤</p>
                <p>No hay solicitudes de cuenta</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Sesiones Activas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Mesa</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Comensales</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pedidos</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Iniciada</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dashboard?.active_sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-bold">Mesa {session.table_number}</p>
                    <p className="text-xs text-gray-500">{session.table_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{session.guest_count}</span> personas
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{session.order_count || 0}</span> pedidos
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold">{qrUtils.formatPrice(session.total_amount)}</p>
                    {session.tip_amount > 0 && (
                      <p className="text-xs text-gray-500">+{qrUtils.formatPrice(session.tip_amount)} propina</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {qrUtils.getElapsedTime(session.started_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleCloseSession(session.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      🚪 Cerrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      {dashboard && dashboard.top_products.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">🏆 Productos Más Pedidos (Vía QR)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            {dashboard.top_products.slice(0, 6).map((product, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                  <span className="text-lg font-bold">{product.total_quantity} pedidos</span>
                </div>
                <p className="font-semibold mb-1">{product.name}</p>
                <p className="text-sm text-gray-600">{qrUtils.formatPrice(product.total_revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // SESSIONS TAB
  // ============================================
  const renderSessionsTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Sesiones Activas</h2>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔄 Actualizar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {sessions.map((session) => (
          <div key={session.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-2xl font-bold">Mesa {session.table_number}</p>
                <p className="text-sm text-gray-600">{session.table_name}</p>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: qrUtils.getStatusColor(session.status) === 'green' ? '#10B98120' : '#6B728020',
                  color: qrUtils.getStatusColor(session.status) === 'green' ? '#10B981' : '#6B7280'
                }}
              >
                {qrUtils.getStatusLabel(session.status)}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p>👥 Comensales: <span className="font-semibold">{session.guest_count}</span></p>
              <p>📝 Pedidos: <span className="font-semibold">{session.order_count || 0}</span></p>
              <p>💰 Total: <span className="font-semibold">{qrUtils.formatPrice(session.total_amount)}</span></p>
              <p>⏱️ Duración: <span className="font-semibold">{qrUtils.getElapsedTime(session.started_at)}</span></p>
            </div>
            <button
              onClick={() => handleCloseSession(session.id)}
              className="w-full mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <p className="text-4xl mb-4">😴</p>
            <p className="text-gray-600">No hay sesiones activas</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // QR CODES TAB
  // ============================================
  const renderQRCodesTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestión de Códigos QR</h2>
        <button
          onClick={handleRegenerateQRs}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          🔄 Regenerar Todos
        </button>
      </div>
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 font-semibold">⚠️ Información Importante</p>
          <p className="text-sm text-yellow-700 mt-1">
            Los códigos QR se generan automáticamente para cada mesa. Puedes imprimirlos y colocarlos en las mesas para que los clientes escaneen y hagan pedidos.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">📱 URL Base del Sistema</h3>
            <p className="text-sm text-gray-600 mb-2">Los clientes serán redirigidos a:</p>
            <code className="bg-gray-100 px-3 py-2 rounded block">{import.meta.env.VITE_QR_BASE_URL || 'https://menu.sysme.cl'}/m/[CODIGO_QR]</code>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">🖨️ Imprimir Códigos QR</h3>
            <p className="text-sm text-gray-600 mb-3">
              Los códigos QR se generan al crear o editar mesas. Puedes acceder a la impresión desde el módulo de Mesas.
            </p>
            <button
              onClick={() => window.location.href = '/mesas'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Ir a Gestión de Mesas →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // CONFIG TAB
  // ============================================
  const renderConfigTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">⚙️ Configuración del Sistema QR</h2>
      </div>
      {config && (
        <div className="p-6 space-y-6">
          {/* Feature Toggles */}
          <div>
            <h3 className="font-bold mb-3">Funcionalidades Habilitadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.allow_ordering}
                  onChange={(e) => handleUpdateConfig({ allow_ordering: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Permitir pedidos</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.allow_waiter_call}
                  onChange={(e) => handleUpdateConfig({ allow_waiter_call: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Permitir llamar mesero</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.allow_bill_request}
                  onChange={(e) => handleUpdateConfig({ allow_bill_request: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Permitir solicitar cuenta</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.allow_tips}
                  onChange={(e) => handleUpdateConfig({ allow_tips: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Permitir propinas</span>
              </label>
            </div>
          </div>

          {/* Display Options */}
          <div>
            <h3 className="font-bold mb-3">Opciones de Visualización</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.show_prices}
                  onChange={(e) => handleUpdateConfig({ show_prices: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Mostrar precios</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.show_images}
                  onChange={(e) => handleUpdateConfig({ show_images: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Mostrar imágenes</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.show_descriptions}
                  onChange={(e) => handleUpdateConfig({ show_descriptions: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Mostrar descripciones</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.show_allergens}
                  onChange={(e) => handleUpdateConfig({ show_allergens: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>Mostrar alérgenos</span>
              </label>
            </div>
          </div>

          {/* Colors */}
          <div>
            <h3 className="font-bold mb-3">Colores del Tema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Color Primario</label>
                <input
                  type="color"
                  value={config.primary_color}
                  onChange={(e) => handleUpdateConfig({ primary_color: e.target.value })}
                  className="w-full h-12 rounded border cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color Secundario</label>
                <input
                  type="color"
                  value={config.secondary_color}
                  onChange={(e) => handleUpdateConfig({ secondary_color: e.target.value })}
                  className="w-full h-12 rounded border cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div>
            <h3 className="font-bold mb-3">Mensajes Personalizados</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mensaje de Bienvenida</label>
                <textarea
                  value={config.welcome_message}
                  onChange={(e) => handleUpdateConfig({ welcome_message: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mensaje del Footer</label>
                <textarea
                  value={config.footer_message || ''}
                  onChange={(e) => handleUpdateConfig({ footer_message: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      )}
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
          <h1 className="text-3xl font-bold text-gray-900">📱 Sistema de Pedidos QR</h1>
          <p className="text-gray-600">Gestión de menú digital, sesiones y pedidos por código QR</p>
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
                onClick={() => setActiveTab('sessions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sessions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📱 Sesiones
              </button>
              <button
                onClick={() => setActiveTab('qrcodes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'qrcodes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔗 Códigos QR
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'config'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚙️ Configuración
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
            {activeTab === 'sessions' && renderSessionsTab()}
            {activeTab === 'qrcodes' && renderQRCodesTab()}
            {activeTab === 'config' && renderConfigTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default QROrderingPage;

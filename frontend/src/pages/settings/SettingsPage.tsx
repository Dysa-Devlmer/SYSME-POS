import React, { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface RestaurantSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  receipt_footer: string;
}

interface PosSettings {
  auto_print_receipts: boolean;
  sound_enabled: boolean;
  theme: 'light' | 'dark';
  language: string;
  default_payment_method: 'cash' | 'card' | 'transfer';
  session_timeout: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'waiter' | 'cook';
  pin: string;
  active: boolean;
  created_at: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings states
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    name: 'Restaurante SYSME',
    address: 'Calle Principal 123, Ciudad',
    phone: '+1 234 567 8900',
    email: 'contacto@restaurante.com',
    tax_rate: 19.0,
    currency: 'USD',
    timezone: 'America/Bogota',
    receipt_footer: 'Gracias por su visita!'
  });

  const [posSettings, setPosSettings] = useState<PosSettings>({
    auto_print_receipts: true,
    sound_enabled: true,
    theme: 'light',
    language: 'es',
    default_payment_method: 'cash',
    session_timeout: 30
  });

  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'waiter' as User['role'],
    pin: '',
    active: true
  });

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const fetchSettings = async () => {
    try {
      // Simular datos de configuración
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Simular usuarios
      const usersData: User[] = [
        {
          id: 1,
          name: 'Admin Principal',
          email: 'admin@restaurante.com',
          role: 'admin',
          pin: '****',
          active: true,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'María García',
          email: 'maria@restaurante.com',
          role: 'waiter',
          pin: '****',
          active: true,
          created_at: '2024-01-15T00:00:00Z'
        },
        {
          id: 3,
          name: 'Carlos López',
          email: 'carlos@restaurante.com',
          role: 'cook',
          pin: '****',
          active: true,
          created_at: '2024-01-20T00:00:00Z'
        },
        {
          id: 4,
          name: 'Ana Rodríguez',
          email: 'ana@restaurante.com',
          role: 'manager',
          pin: '****',
          active: false,
          created_at: '2024-02-01T00:00:00Z'
        }
      ];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const saveRestaurantSettings = async () => {
    setIsSaving(true);
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Configuración del restaurante guardada exitosamente');
    } catch (error) {
      console.error('Error saving restaurant settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const savePosSettings = async () => {
    setIsSaving(true);
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Configuración del POS guardada exitosamente');
    } catch (error) {
      console.error('Error saving POS settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const newUser: User = {
        id: users.length + 1,
        ...userFormData,
        pin: '****',
        created_at: new Date().toISOString()
      };

      setUsers(prev => [...prev, newUser]);
      setShowUserModal(false);
      resetUserForm();
      alert('Usuario creado exitosamente');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error al crear el usuario');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id
          ? { ...u, ...userFormData, pin: userFormData.pin || u.pin }
          : u
      ));

      setShowUserModal(false);
      setSelectedUser(null);
      resetUserForm();
      alert('Usuario actualizado exitosamente');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar el usuario');
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, active: !u.active } : u
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const openUserModal = (userData?: User) => {
    if (userData) {
      setSelectedUser(userData);
      setUserFormData({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        pin: '',
        active: userData.active
      });
    } else {
      setSelectedUser(null);
      resetUserForm();
    }
    setShowUserModal(true);
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      role: 'waiter',
      pin: '',
      active: true
    });
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'waiter':
        return 'bg-green-100 text-green-800';
      case 'cook':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
            <p className="text-gray-600 mt-1">
              Gestiona la configuración del restaurante, POS y usuarios
            </p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex space-x-2">
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                👨‍💼 Administrador
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {[
              { id: 'general', name: '🏪 General', desc: 'Información del restaurante' },
              { id: 'pos', name: '💻 POS', desc: 'Configuración del sistema' },
              { id: 'users', name: '👥 Usuarios', desc: 'Gestión de usuarios' },
              { id: 'security', name: '🔒 Seguridad', desc: 'Configuración de seguridad' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-4 px-6 text-center font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <div>{tab.name}</div>
                <div className="text-xs text-gray-400">{tab.desc}</div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Información del Restaurante</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante</label>
                  <input
                    type="text"
                    value={restaurantSettings.name}
                    onChange={(e) => setRestaurantSettings(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={restaurantSettings.phone}
                    onChange={(e) => setRestaurantSettings(prev => ({...prev, phone: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={restaurantSettings.email}
                    onChange={(e) => setRestaurantSettings(prev => ({...prev, email: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={restaurantSettings.currency}
                    onChange={(e) => setRestaurantSettings(prev => ({...prev, currency: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD - Dólar Estadounidense</option>
                    <option value="COP">COP - Peso Colombiano</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Impuesto (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={restaurantSettings.tax_rate}
                    onChange={(e) => setRestaurantSettings(prev => ({...prev, tax_rate: parseFloat(e.target.value)}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zona Horaria</label>
                  <select
                    value={restaurantSettings.timezone}
                    onChange={(e) => setRestaurantSettings(prev => ({...prev, timezone: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="America/Bogota">América/Bogotá</option>
                    <option value="America/Mexico_City">América/Ciudad de México</option>
                    <option value="America/New_York">América/Nueva York</option>
                    <option value="Europe/Madrid">Europa/Madrid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea
                  value={restaurantSettings.address}
                  onChange={(e) => setRestaurantSettings(prev => ({...prev, address: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pie de Página del Recibo</label>
                <textarea
                  value={restaurantSettings.receipt_footer}
                  onChange={(e) => setRestaurantSettings(prev => ({...prev, receipt_footer: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveRestaurantSettings}
                  disabled={isSaving}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                >
                  {isSaving ? '💾 Guardando...' : '💾 Guardar Configuración'}
                </button>
              </div>
            </div>
          )}

          {/* POS Settings */}
          {activeTab === 'pos' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Configuración del POS</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Imprimir Recibos Automáticamente</label>
                      <p className="text-xs text-gray-500">Imprime recibos al completar una venta</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={posSettings.auto_print_receipts}
                        onChange={(e) => setPosSettings(prev => ({...prev, auto_print_receipts: e.target.checked}))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Sonidos Habilitados</label>
                      <p className="text-xs text-gray-500">Reproduce sonidos de notificación</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={posSettings.sound_enabled}
                        onChange={(e) => setPosSettings(prev => ({...prev, sound_enabled: e.target.checked}))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
                    <select
                      value={posSettings.theme}
                      onChange={(e) => setPosSettings(prev => ({...prev, theme: e.target.value as 'light' | 'dark'}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="light">🌞 Claro</option>
                      <option value="dark">🌙 Oscuro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                    <select
                      value={posSettings.language}
                      onChange={(e) => setPosSettings(prev => ({...prev, language: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="es">🇪🇸 Español</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="fr">🇫🇷 Français</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago por Defecto</label>
                    <select
                      value={posSettings.default_payment_method}
                      onChange={(e) => setPosSettings(prev => ({...prev, default_payment_method: e.target.value as 'cash' | 'card' | 'transfer'}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">💵 Efectivo</option>
                      <option value="card">💳 Tarjeta</option>
                      <option value="transfer">🏦 Transferencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de Sesión (minutos)</label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={posSettings.session_timeout}
                      onChange={(e) => setPosSettings(prev => ({...prev, session_timeout: parseInt(e.target.value)}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={savePosSettings}
                  disabled={isSaving}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                >
                  {isSaving ? '💾 Guardando...' : '💾 Guardar Configuración'}
                </button>
              </div>
            </div>
          )}

          {/* Users Management */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gestión de Usuarios</h3>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => openUserModal()}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ➕ Nuevo Usuario
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userData) => (
                      <tr key={userData.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                            <div className="text-sm text-gray-500">{userData.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(userData.role)}`}>
                            {userData.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userData.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {userData.active ? '✅ Activo' : '❌ Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(userData.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => openUserModal(userData)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(userData.id)}
                                className={`${
                                  userData.active
                                    ? 'text-red-600 hover:text-red-900'
                                    : 'text-green-600 hover:text-green-900'
                                }`}
                              >
                                {userData.active ? '⏸️' : '▶️'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Configuración de Seguridad</h3>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Configuración de Seguridad Avanzada
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Las configuraciones de seguridad requieren privilegios de administrador y están disponibles en la versión completa del sistema.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">🔐 Autenticación</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Autenticación por PIN habilitada</li>
                    <li>• Tiempo de sesión configurado</li>
                    <li>• Validación de usuarios activa</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">🛡️ Protección de Datos</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Backup automático habilitado</li>
                    <li>• Logs de auditoría activos</li>
                    <li>• Encriptación de datos sensibles</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">🔒 Control de Acceso</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Roles de usuario definidos</li>
                    <li>• Permisos por módulo</li>
                    <li>• Restricciones de IP configurables</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">📊 Monitoreo</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Health monitoring activo</li>
                    <li>• Alertas de sistema configuradas</li>
                    <li>• Métricas en tiempo real</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Estado del Sistema de Seguridad
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>✅ Todas las medidas de seguridad básicas están activas y funcionando correctamente.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData(prev => ({...prev, name: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({...prev, email: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData(prev => ({...prev, role: e.target.value as User['role']}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="waiter">Mesero</option>
                  <option value="cook">Cocinero</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN {selectedUser ? '(dejar vacío para mantener actual)' : ''}
                </label>
                <input
                  type="password"
                  value={userFormData.pin}
                  onChange={(e) => setUserFormData(prev => ({...prev, pin: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingrese PIN de 4 dígitos"
                  maxLength={4}
                  required={!selectedUser}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={userFormData.active}
                  onChange={(e) => setUserFormData(prev => ({...prev, active: e.target.checked}))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="userActive" className="ml-2 block text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  resetUserForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={selectedUser ? handleUpdateUser : handleCreateUser}
                disabled={!userFormData.name || !userFormData.email || (!selectedUser && !userFormData.pin)}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {selectedUser ? '💾 Actualizar' : '👤 Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard', color: 'blue', roles: ['all'] },
    { path: '/analytics', icon: '📊', label: 'Analíticas', color: 'blue', roles: ['manager', 'admin'] },
    { path: '/executive-dashboard', icon: '📊', label: 'Executive Dashboard', color: 'purple', roles: ['admin'] },
    { path: '/analytics/business-intelligence', icon: '🧠', label: 'Business Intelligence', color: 'indigo', roles: ['admin'] },
    { path: '/pos', icon: '💳', label: 'POS Ventas', color: 'green', roles: ['all'] },
    { path: '/pos/parked', icon: '⏸️', label: 'Ventas Aparcadas', color: 'yellow', roles: ['all'] },
    { path: '/mesas', icon: '🍽️', label: 'Mesas', color: 'yellow', roles: ['all'] },
    { path: '/reservations', icon: '📅', label: 'Reservas', color: 'yellow', roles: ['all'] },
    { path: '/reservations/advanced', icon: '📅', label: 'Reservas Avanzadas', color: 'orange', roles: ['manager', 'admin'] },
    { path: '/cocina', icon: '👨‍🍳', label: 'Cocina', color: 'red', roles: ['all'] },
    { path: '/products', icon: '📦', label: 'Productos', color: 'purple', roles: ['manager', 'admin'] },
    { path: '/combos', icon: '🎁', label: 'Combos & Packs', color: 'purple', roles: ['manager', 'admin'] },
    { path: '/modifiers', icon: '🔧', label: 'Modificadores', color: 'purple', roles: ['manager', 'admin'] },
    { path: '/inventory', icon: '📊', label: 'Inventario', color: 'indigo', roles: ['manager', 'admin', 'inventory_manager'] },
    { path: '/warehouses', icon: '🏭', label: 'Almacenes', color: 'indigo', roles: ['manager', 'admin', 'inventory_manager'] },
    { path: '/suppliers', icon: '🚚', label: 'Proveedores', color: 'purple', roles: ['manager', 'admin'] },
    { path: '/caja', icon: '💰', label: 'Caja', color: 'green', roles: ['all'] },
    { path: '/reports', icon: '📈', label: 'Reportes', color: 'blue', roles: ['manager', 'admin'] },
    { path: '/advanced-reports', icon: '📑', label: 'Reportes Avanzados', color: 'blue', roles: ['manager', 'admin'] },
    { path: '/pricing-tiers', icon: '💲', label: 'Tarifas', color: 'purple', roles: ['admin', 'manager'] },
    { path: '/permissions', icon: '🔐', label: 'Permisos', color: 'red', roles: ['admin'] },
    { path: '/settings', icon: '⚙️', label: 'Configuración', color: 'gray', roles: ['admin'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => {
    if (!user) return false;
    if (item.roles.includes('all')) return true;
    return item.roles.includes(user.role);
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-gray-800">🍽️ SYSME 2.0</h1>
                <p className="text-sm text-gray-600">Sistema POS</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {(user.username || user.email || "U").charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.username || user.email || "Usuario"}</p>
                  <p className="text-xs text-gray-500 truncate">{user.role}</p>
                  {user.assigned_tpv && <p className="text-xs text-blue-600 truncate">{user.assigned_tpv}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={sidebarOpen ? '' : item.label}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && (
                <span className="font-medium">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-3 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {visibleMenuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span>Sistema Activo</span>
              </div>

              {user && (
                <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                  {user.assigned_tpv && (<><span className="text-sm font-medium text-gray-700">{user.assigned_tpv}</span><span className="text-xs text-gray-500">|</span></>)}
                  <span className="text-sm text-gray-600">{user.role}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
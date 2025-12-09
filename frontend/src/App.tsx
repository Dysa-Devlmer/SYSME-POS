import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ErrorBoundary from '@/components/ErrorBoundary';

// Layout components (immediate load)
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// PWA Components
import PWAStatus from '@/components/PWAStatus';

// Lazy loading de todas las páginas para optimizar performance
const AdminLoginPage = React.lazy(() => import('@/pages/auth/AdminLoginPage'));
const POSLoginPage = React.lazy(() => import('@/pages/auth/POSLoginPage'));
const DashboardHome = React.lazy(() => import('@/pages/dashboard/DashboardHome'));
const POSVentas = React.lazy(() => import('@/pages/pos/POSVentas'));
const MesasPage = React.lazy(() => import('@/pages/mesas/MesasPage'));
const CocinaPage = React.lazy(() => import('@/pages/cocina/CocinaPage'));
const ProductsPage = React.lazy(() => import('@/pages/products/ProductsPage'));
const InventoryPage = React.lazy(() => import('@/pages/inventory/InventoryPage'));
const CajaPage = React.lazy(() => import('@/pages/caja/CajaPage'));
const ReportsPage = React.lazy(() => import('@/pages/reports/ReportsPage'));
const SettingsPage = React.lazy(() => import('@/pages/settings/SettingsPage'));
const ModifiersPage = React.lazy(() => import('@/pages/modifiers/ModifiersPage'));

// TIER 1 New Pages
const ParkedSalesPage = React.lazy(() => import('@/pages/pos/ParkedSalesPage'));
const WarehousesPage = React.lazy(() => import('@/pages/inventory/WarehousesPage'));
const CombosPage = React.lazy(() => import('@/pages/products/CombosPage'));
const PermissionsPage = React.lazy(() => import('@/pages/settings/PermissionsPage'));
const PricingTiersPage = React.lazy(() => import('@/pages/settings/PricingTiersPage'));

// TIER 2 New Pages
const ReservationsPage = React.lazy(() => import('@/pages/ReservationsPage'));
const AdvancedReportsPage = React.lazy(() => import('@/pages/reports/AdvancedReportsPage'));
const AnalyticsDashboard = React.lazy(() => import('@/pages/dashboard/AnalyticsDashboard'));
const TipsSettingsPage = React.lazy(() => import('@/pages/TipsSettingsPage'));
const SuppliersPage = React.lazy(() => import('@/pages/SuppliersPage'));

// TIER 3 Executive Pages
const ExecutiveDashboard = React.lazy(() => import('@/pages/dashboard/ExecutiveDashboard'));
const AdvancedReservationsPage = React.lazy(() => import('@/pages/reservations/AdvancedReservationsPage'));
const BusinessIntelligencePage = React.lazy(() => import('@/pages/analytics/BusinessIntelligencePage'));

// TIER 4 New Module Pages
const DeliveryPage = React.lazy(() => import('@/pages/delivery/DeliveryPage'));
const KitchenDisplayPage = React.lazy(() => import('@/pages/kds/KitchenDisplayPage'));
const QROrderingPage = React.lazy(() => import('@/pages/qr/QROrderingPage'));
const LoyaltyPage = React.lazy(() => import('@/pages/loyalty/LoyaltyPage'));
const HelpPage = React.lazy(() => import('@/pages/help/HelpPage'));

// Loading spinner component optimizado
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Cargando...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">{message}</p>
      <p className="text-gray-400 text-sm mt-2">Sistema SYSME 2.0</p>
    </div>
  </div>
);

// Error Fallback Component
const ErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ error, resetError }) => (
  <div className="min-h-screen flex items-center justify-center bg-red-50">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-red-800 mb-4">Error del Sistema</h1>
      <p className="text-red-600 mb-4">Ha ocurrido un error inesperado:</p>
      <pre className="bg-red-100 p-3 rounded text-sm text-red-700 mb-4 overflow-auto">
        {error.message}
      </pre>
      <button
        onClick={resetError}
        className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
      >
        🔄 Reintentar
      </button>
    </div>
  </div>
);

// Protected Route Component optimizado
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: string;
  loginPath?: string;
}> = ({
  children,
  requiredRole,
  loginPath = '/admin/login' // Default to admin login
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner message="Verificando autenticación..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="text-center">
          <div className="text-yellow-500 text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-yellow-800 mb-4">Acceso Restringido</h1>
          <p className="text-yellow-600 mb-4">
            No tienes permisos para acceder a esta sección.
          </p>
          <button
            onClick={() => window.location.href = user?.role === 'waiter' ? '/pos' : '/dashboard'}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            🏠 Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Public Route Component optimizado
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner message="Iniciando sesión..." />;
  }

  // Redirect based on user role
  if (isAuthenticated && user) {
    const redirectPath = user.role === 'waiter' ? '/pos' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// Route Wrapper with Suspense
const RouteWrapper: React.FC<{
  component: React.ComponentType;
  layout?: 'auth' | 'dashboard' | 'none';
  protected?: boolean;
  requiredRole?: string;
  loadingMessage?: string;
  loginPath?: string;
}> = ({
  component: Component,
  layout = 'dashboard',
  protected: isProtected = false,
  requiredRole,
  loadingMessage = 'Cargando página...',
  loginPath = '/admin/login'
}) => {
  const content = (
    <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
      <Component />
    </Suspense>
  );

  // No layout for auth pages (they have their own styling)
  const layoutContent = layout === 'none' ? (
    content
  ) : layout === 'auth' ? (
    <AuthLayout>{content}</AuthLayout>
  ) : (
    <DashboardLayout>{content}</DashboardLayout>
  );

  if (isProtected) {
    return (
      <ProtectedRoute requiredRole={requiredRole} loginPath={loginPath}>
        {layoutContent}
      </ProtectedRoute>
    );
  }

  if (layout === 'auth' || layout === 'none') {
    return <PublicRoute>{layoutContent}</PublicRoute>;
  }

  return layoutContent;
};

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitorear performance de carga inicial
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Use performance.now() and navigation API for accurate timing
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigationEntry) {
        const loadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;

        if (loadTime > 0) {
          console.log(`🚀 SYSME Load Time: ${loadTime.toFixed(2)}ms`);

          // Warning si carga lenta
          if (loadTime > 3000) {
            console.warn('⚠️ Slow load detected. Consider optimization.');
          }
        }
      }

      // Reportar métricas si están disponibles
      if ('getEntriesByType' in window.performance) {
        const paintEntries = window.performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          console.log(`🎨 ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
        });
      }
    }
  }, []);
};

function App() {
  // Monitor de performance
  usePerformanceMonitoring();

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <div className="App">
        <Routes>
          {/* Admin Auth Routes */}
          <Route
            path="/admin/login"
            element={
              <RouteWrapper
                component={AdminLoginPage}
                layout="none"
                loadingMessage="Cargando panel administrativo..."
              />
            }
          />

          {/* POS Auth Routes */}
          <Route
            path="/pos/login"
            element={
              <RouteWrapper
                component={POSLoginPage}
                layout="none"
                loadingMessage="Cargando terminal garzones..."
              />
            }
          />

          {/* Legacy login redirect */}
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <RouteWrapper
                component={DashboardHome}
                protected={true}
                loadingMessage="Cargando dashboard principal..."
              />
            }
          />

          <Route
            path="/pos"
            element={
              <RouteWrapper
                component={POSVentas}
                layout="none"
                protected={true}
                loginPath="/pos/login"
                loadingMessage="Cargando terminal garzones..."
              />
            }
          />

          <Route
            path="/mesas"
            element={
              <RouteWrapper
                component={MesasPage}
                protected={true}
                loadingMessage="Cargando gestión de mesas..."
              />
            }
          />

          <Route
            path="/cocina"
            element={
              <RouteWrapper
                component={CocinaPage}
                protected={true}
                loadingMessage="Cargando panel de cocina..."
              />
            }
          />

          <Route
            path="/products"
            element={
              <RouteWrapper
                component={ProductsPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando gestión de productos..."
              />
            }
          />

          <Route
            path="/modifiers"
            element={
              <RouteWrapper
                component={ModifiersPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando gestión de modificadores..."
              />
            }
          />

          <Route
            path="/inventory"
            element={
              <RouteWrapper
                component={InventoryPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando control de inventario..."
              />
            }
          />

          <Route
            path="/caja"
            element={
              <RouteWrapper
                component={CajaPage}
                protected={true}
                loadingMessage="Cargando gestión de caja..."
              />
            }
          />

          <Route
            path="/reports"
            element={
              <RouteWrapper
                component={ReportsPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando reportes y análisis..."
              />
            }
          />

          <Route
            path="/settings"
            element={
              <RouteWrapper
                component={SettingsPage}
                protected={true}
                requiredRole="admin"
                loadingMessage="Cargando configuración del sistema..."
              />
            }
          />

          {/* TIER 1 New Routes */}
          <Route
            path="/pos/parked"
            element={
              <RouteWrapper
                component={ParkedSalesPage}
                protected={true}
                loadingMessage="Cargando ventas aparcadas..."
              />
            }
          />

          <Route
            path="/warehouses"
            element={
              <RouteWrapper
                component={WarehousesPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando gestión de almacenes..."
              />
            }
          />

          <Route
            path="/combos"
            element={
              <RouteWrapper
                component={CombosPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando gestión de combos..."
              />
            }
          />

          <Route
            path="/permissions"
            element={
              <RouteWrapper
                component={PermissionsPage}
                protected={true}
                requiredRole="admin"
                loadingMessage="Cargando gestión de permisos..."
              />
            }
          />

          <Route
            path="/pricing-tiers"
            element={
              <RouteWrapper
                component={PricingTiersPage}
                protected={true}
                requiredRole="admin"
                loadingMessage="Cargando gestión de tarifas..."
              />
            }
          />

          {/* TIER 2 New Routes */}
          <Route
            path="/reservations"
            element={
              <RouteWrapper
                component={ReservationsPage}
                protected={true}
                loadingMessage="Cargando gestión de reservas..."
              />
            }
          />

          <Route
            path="/advanced-reports"
            element={
              <RouteWrapper
                component={AdvancedReportsPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando reportes avanzados..."
              />
            }
          />

          <Route
            path="/analytics"
            element={
              <RouteWrapper
                component={AnalyticsDashboard}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando dashboard de analíticas..."
              />
            }
          />

          <Route
            path="/tips-settings"
            element={
              <RouteWrapper
                component={TipsSettingsPage}
                protected={true}
                requiredRole="admin"
                loadingMessage="Cargando configuración de propinas..."
              />
            }
          />

          <Route
            path="/suppliers"
            element={
              <RouteWrapper
                component={SuppliersPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando gestión de proveedores..."
              />
            }
          />

          {/* TIER 3 Executive Routes */}
          <Route
            path="/executive-dashboard"
            element={
              <RouteWrapper
                component={ExecutiveDashboard}
                protected={true}
                requiredRole="admin"
                loadingMessage="Cargando dashboard ejecutivo..."
              />
            }
          />

          <Route
            path="/reservations/advanced"
            element={
              <RouteWrapper
                component={AdvancedReservationsPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando sistema avanzado de reservas..."
              />
            }
          />

          <Route
            path="/analytics/business-intelligence"
            element={
              <RouteWrapper
                component={BusinessIntelligencePage}
                protected={true}
                requiredRole="admin"
                loadingMessage="Cargando Business Intelligence..."
              />
            }
          />

          {/* TIER 4 New Module Routes */}
          <Route
            path="/delivery"
            element={
              <RouteWrapper
                component={DeliveryPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando gestión de delivery..."
              />
            }
          />

          <Route
            path="/kds"
            element={
              <RouteWrapper
                component={KitchenDisplayPage}
                layout="none"
                protected={true}
                loadingMessage="Cargando Kitchen Display System..."
              />
            }
          />

          <Route
            path="/qr-ordering"
            element={
              <RouteWrapper
                component={QROrderingPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando sistema de pedidos QR..."
              />
            }
          />

          <Route
            path="/loyalty"
            element={
              <RouteWrapper
                component={LoyaltyPage}
                protected={true}
                requiredRole="manager"
                loadingMessage="Cargando programa de fidelización..."
              />
            }
          />

          <Route
            path="/help"
            element={
              <RouteWrapper
                component={HelpPage}
                protected={true}
                loadingMessage="Cargando centro de ayuda..."
              />
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* 404 fallback optimizado */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto p-6">
                  <div className="text-gray-400 text-8xl mb-6">🔍</div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">
                    La página que buscas no existe o ha sido movida.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      🏠 Volver al Dashboard
                    </button>
                    <button
                      onClick={() => window.history.back()}
                      className="w-full bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      ← Página Anterior
                    </button>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>

        {/* PWA Status Component */}
        <PWAStatus />
      </div>
    </ErrorBoundary>
  );
}

export default App;
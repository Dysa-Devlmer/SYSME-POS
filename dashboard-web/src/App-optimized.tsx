import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ErrorBoundary from '@/components/ErrorBoundary';

// Layout components (immediate load)
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Lazy loading de todas las páginas para optimizar performance
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
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner message="Verificando autenticación..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
            onClick={() => window.location.href = '/dashboard'}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            🏠 Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Public Route Component optimizado
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner message="Iniciando sesión..." />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

// Route Wrapper with Suspense
const RouteWrapper: React.FC<{
  component: React.ComponentType;
  layout?: 'auth' | 'dashboard';
  protected?: boolean;
  requiredRole?: string;
  loadingMessage?: string;
}> = ({
  component: Component,
  layout = 'dashboard',
  protected: isProtected = false,
  requiredRole,
  loadingMessage = 'Cargando página...'
}) => {
  const content = (
    <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
      <Component />
    </Suspense>
  );

  const layoutContent = layout === 'auth' ? (
    <AuthLayout>{content}</AuthLayout>
  ) : (
    <DashboardLayout>{content}</DashboardLayout>
  );

  if (isProtected) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        {layoutContent}
      </ProtectedRoute>
    );
  }

  if (layout === 'auth') {
    return <PublicRoute>{layoutContent}</PublicRoute>;
  }

  return layoutContent;
};

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitorear performance de carga inicial
    if (typeof window !== 'undefined' && 'performance' in window) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      console.log(`🚀 SYSME Load Time: ${loadTime}ms`);

      // Reportar métricas si están disponibles
      if ('getEntriesByType' in window.performance) {
        const paintEntries = window.performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          console.log(`🎨 ${entry.name}: ${entry.startTime}ms`);
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
          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              <RouteWrapper
                component={POSLoginPage}
                layout="auth"
                loadingMessage="Cargando sistema de autenticación..."
              />
            }
          />

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
                protected={true}
                loadingMessage="Cargando sistema POS..."
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

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
      </div>
    </ErrorBoundary>
  );
}

export default App;
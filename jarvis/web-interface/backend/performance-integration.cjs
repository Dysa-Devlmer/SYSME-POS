// web-interface/backend/performance-integration.cjs
// Integración del Performance Monitor con Socket.io

const PerformanceMonitor = require('../../core/performance/performance-monitor.cjs');
const path = require('path');

/**
 * Integración de Performance con Socket.io
 */
class PerformanceIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.performanceMonitor = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el performance monitor
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('⚡ [Performance Integration] Inicializando...');

    this.performanceMonitor = new PerformanceMonitor({
      projectRoot: process.cwd(),
      metricsFile: path.join(process.cwd(), 'logs', 'performance-metrics.json'),
      slowOperationThreshold: 1000,
      criticalOperationThreshold: 5000,
      cacheEnabled: true,
      cacheMaxSize: 100,
      cacheTTL: 5 * 60 * 1000
    });

    await this.performanceMonitor.initialize();

    // Escuchar eventos
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ [Performance Integration] Listo');
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    this.performanceMonitor.on('slow_operation', (operation) => {
      this.io.emit('performance:slow-operation', operation);
    });

    this.performanceMonitor.on('critical_operation', (operation) => {
      this.io.emit('performance:critical-operation', operation);
    });

    this.performanceMonitor.on('high_memory', (metric) => {
      this.io.emit('performance:high-memory', metric);
    });

    this.performanceMonitor.on('auto_optimize', (data) => {
      this.io.emit('performance:auto-optimized', data);
    });
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Obtener métricas
    socket.on('performance:get-metrics', () => {
      try {
        if (!this.performanceMonitor) {
          socket.emit('performance:metrics', null);
          return;
        }

        const metrics = this.performanceMonitor.getMetrics();
        socket.emit('performance:metrics', metrics);

      } catch (error) {
        console.error('Error obteniendo métricas:', error);
        socket.emit('performance:error', { message: error.message });
      }
    });

    // Obtener recomendaciones
    socket.on('performance:get-recommendations', () => {
      try {
        if (!this.performanceMonitor) {
          socket.emit('performance:recommendations', []);
          return;
        }

        const recommendations = this.performanceMonitor.getRecommendations();
        socket.emit('performance:recommendations', recommendations);

      } catch (error) {
        console.error('Error obteniendo recomendaciones:', error);
        socket.emit('performance:error', { message: error.message });
      }
    });

    // Auto-optimizar
    socket.on('performance:auto-optimize', async () => {
      try {
        if (!this.performanceMonitor) {
          throw new Error('Performance monitor no disponible');
        }

        console.log('🔧 [Performance Integration] Auto-optimización solicitada');

        const actions = await this.performanceMonitor.autoOptimize();

        socket.emit('performance:auto-optimized', { actions });

      } catch (error) {
        console.error('Error en auto-optimización:', error);
        socket.emit('performance:error', { message: error.message });
      }
    });

    // Limpiar cache
    socket.on('performance:clear-cache', () => {
      try {
        if (!this.performanceMonitor) {
          throw new Error('Performance monitor no disponible');
        }

        console.log('🧹 [Performance Integration] Limpiando cache');

        const count = this.performanceMonitor.cacheClear();

        socket.emit('performance:cache-cleared', { count });

      } catch (error) {
        console.error('Error limpiando cache:', error);
        socket.emit('performance:error', { message: error.message });
      }
    });

    // Obtener operaciones por categoría
    socket.on('performance:get-by-category', () => {
      try {
        if (!this.performanceMonitor) {
          socket.emit('performance:by-category', {});
          return;
        }

        const categories = this.performanceMonitor.getOperationsByCategory();
        socket.emit('performance:by-category', categories);

      } catch (error) {
        console.error('Error obteniendo operaciones por categoría:', error);
        socket.emit('performance:error', { message: error.message });
      }
    });
  }

  /**
   * Obtiene el performance monitor
   */
  getPerformanceMonitor() {
    return this.performanceMonitor;
  }

  /**
   * Wrapper para tracking de operaciones (para uso interno)
   */
  async trackOperation(name, category, fn, metadata = {}) {
    if (!this.performanceMonitor) {
      return await fn();
    }

    return await this.performanceMonitor.trackOperation(name, category, fn, metadata);
  }

  /**
   * Middleware para Express - tracking automático
   */
  getExpressMiddleware() {
    return (req, res, next) => {
      if (!this.performanceMonitor) {
        return next();
      }

      const operationId = `http:${req.method}:${req.path}:${Date.now()}`;

      this.performanceMonitor.startOperation(operationId, {
        name: `${req.method} ${req.path}`,
        category: 'http',
        method: req.method,
        path: req.path
      });

      // Interceptar el end del response
      const originalEnd = res.end;

      res.end = (...args) => {
        this.performanceMonitor.endOperation(operationId, {
          success: res.statusCode < 400,
          statusCode: res.statusCode
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }
}

module.exports = PerformanceIntegration;

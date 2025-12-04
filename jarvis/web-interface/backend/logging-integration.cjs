// web-interface/backend/logging-integration.cjs
// Integración del Logger Manager y System Monitor con Socket.io

const LoggerManager = require('../../core/logging/logger-manager.cjs');
const SystemMonitor = require('../../core/logging/system-monitor.cjs');

/**
 * Integración de Logging con Socket.io
 */
class LoggingIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.loggerManager = null;
    this.systemMonitor = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el logging
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('📝 [Logging Integration] Inicializando...');

    // Inicializar Logger Manager
    this.loggerManager = new LoggerManager({
      projectRoot: process.cwd(),
      level: 'info',
      enableConsole: false // Desactivar consola para evitar duplicados
    });

    await this.loggerManager.initialize();

    // Inicializar System Monitor
    this.systemMonitor = new SystemMonitor({
      interval: 5000,
      loggerManager: this.loggerManager
    });

    await this.systemMonitor.start();

    // Escuchar eventos
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ [Logging Integration] Listo');
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    // Logger events
    this.loggerManager.on('log', (log) => {
      this.io.emit('logs:new', log);
    });

    // Monitor events
    this.systemMonitor.on('metrics', (metrics) => {
      this.io.emit('monitor:metrics', metrics);
    });

    this.systemMonitor.on('alert', (alert) => {
      this.io.emit('monitor:alert', alert);

      // Log alert
      this.loggerManager.warn('system', `Alerta: ${alert.message}`, alert);
    });
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // === LOGGER HANDLERS ===

    // Obtener logs recientes
    socket.on('logs:get-recent', (filters = {}) => {
      try {
        if (!this.loggerManager) {
          socket.emit('logs:recent', []);
          return;
        }

        const logs = this.loggerManager.getRecentLogs(filters);
        socket.emit('logs:recent', logs);

      } catch (error) {
        console.error('Error obteniendo logs:', error);
        socket.emit('logs:error', { message: error.message });
      }
    });

    // Obtener estadísticas
    socket.on('logs:get-stats', () => {
      try {
        if (!this.loggerManager) {
          socket.emit('logs:stats', {});
          return;
        }

        const stats = this.loggerManager.getStats();
        socket.emit('logs:stats', stats);

      } catch (error) {
        console.error('Error obteniendo stats:', error);
        socket.emit('logs:error', { message: error.message });
      }
    });

    // Exportar logs
    socket.on('logs:export', async (options) => {
      try {
        if (!this.loggerManager) {
          throw new Error('Logger manager no disponible');
        }

        const result = await this.loggerManager.exportLogs(options);
        socket.emit('logs:exported', result);

      } catch (error) {
        console.error('Error exportando logs:', error);
        socket.emit('logs:error', { message: error.message });
      }
    });

    // === MONITOR HANDLERS ===

    // Obtener métricas actuales
    socket.on('monitor:get-current', () => {
      try {
        if (!this.systemMonitor) {
          socket.emit('monitor:metrics', null);
          return;
        }

        const metrics = this.systemMonitor.getCurrentMetrics();
        socket.emit('monitor:metrics', metrics);

      } catch (error) {
        console.error('Error obteniendo métricas:', error);
        socket.emit('monitor:error', { message: error.message });
      }
    });

    // Obtener reporte de salud
    socket.on('monitor:get-health', () => {
      try {
        if (!this.systemMonitor) {
          socket.emit('monitor:health', null);
          return;
        }

        const report = this.systemMonitor.generateHealthReport();
        socket.emit('monitor:health', report);

      } catch (error) {
        console.error('Error generando reporte:', error);
        socket.emit('monitor:error', { message: error.message });
      }
    });
  }

  /**
   * Obtiene el logger manager
   */
  getLoggerManager() {
    return this.loggerManager;
  }

  /**
   * Obtiene el system monitor
   */
  getSystemMonitor() {
    return this.systemMonitor;
  }

  /**
   * Cierra el sistema de logging
   */
  async close() {
    if (this.systemMonitor) {
      this.systemMonitor.stop();
    }

    if (this.loggerManager) {
      await this.loggerManager.close();
    }
  }
}

module.exports = LoggingIntegration;

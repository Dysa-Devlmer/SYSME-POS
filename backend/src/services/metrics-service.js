/**
 * Servicio de Métricas en Tiempo Real
 * Recolecta, procesa y expone métricas del sistema para monitoreo
 */

import { EventEmitter } from 'events';
import { enhancedLogger } from '../config/logger-enhanced.js';

class MetricsService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.intervals = new Map();
    this.collectors = new Map();
    this.isRunning = false;

    // Configuración de métricas
    this.config = {
      collection_interval: 5000, // 5 segundos
      retention_period: 3600000, // 1 hora en ms
      max_data_points: 720, // 1 hora a 5s intervalo
    };

    // Métricas base
    this.initializeBaseMetrics();
  }

  /**
   * Inicializa métricas base del sistema
   */
  initializeBaseMetrics() {
    // Métricas de sistema
    this.registerMetric('system.memory.used', {
      type: 'gauge',
      description: 'Memory usage in bytes',
      collector: () => process.memoryUsage().heapUsed
    });

    this.registerMetric('system.memory.total', {
      type: 'gauge',
      description: 'Total memory in bytes',
      collector: () => process.memoryUsage().heapTotal
    });

    this.registerMetric('system.uptime', {
      type: 'gauge',
      description: 'Process uptime in seconds',
      collector: () => process.uptime()
    });

    this.registerMetric('system.cpu.usage', {
      type: 'gauge',
      description: 'CPU usage percentage',
      collector: this.getCpuUsage.bind(this)
    });

    // Métricas de aplicación
    this.registerMetric('app.requests.total', {
      type: 'counter',
      description: 'Total HTTP requests'
    });

    this.registerMetric('app.requests.active', {
      type: 'gauge',
      description: 'Active HTTP requests'
    });

    this.registerMetric('app.requests.duration', {
      type: 'histogram',
      description: 'HTTP request duration in ms'
    });

    this.registerMetric('app.errors.total', {
      type: 'counter',
      description: 'Total application errors'
    });

    // Métricas de base de datos
    this.registerMetric('db.queries.total', {
      type: 'counter',
      description: 'Total database queries'
    });

    this.registerMetric('db.queries.duration', {
      type: 'histogram',
      description: 'Database query duration in ms'
    });

    this.registerMetric('db.connections.active', {
      type: 'gauge',
      description: 'Active database connections'
    });

    // Métricas de cache
    this.registerMetric('cache.hits.total', {
      type: 'counter',
      description: 'Total cache hits'
    });

    this.registerMetric('cache.misses.total', {
      type: 'counter',
      description: 'Total cache misses'
    });

    this.registerMetric('cache.hit.rate', {
      type: 'gauge',
      description: 'Cache hit rate percentage'
    });

    // Métricas de negocio
    this.registerMetric('business.sales.total', {
      type: 'counter',
      description: 'Total sales amount'
    });

    this.registerMetric('business.orders.total', {
      type: 'counter',
      description: 'Total orders count'
    });

    this.registerMetric('business.users.active', {
      type: 'gauge',
      description: 'Active users count'
    });

    enhancedLogger.info(`📊 ${this.metrics.size} métricas base inicializadas`);
  }

  /**
   * Registra una nueva métrica
   */
  registerMetric(name, config) {
    this.metrics.set(name, {
      name,
      type: config.type,
      description: config.description,
      collector: config.collector || null,
      data: [],
      value: config.type === 'counter' ? 0 : null,
      timestamp: Date.now()
    });
  }

  /**
   * Incrementa un contador
   */
  increment(metricName, value = 1, labels = {}) {
    const metric = this.metrics.get(metricName);
    if (!metric || metric.type !== 'counter') {
      return;
    }

    metric.value += value;
    metric.timestamp = Date.now();

    this.addDataPoint(metricName, metric.value, labels);
    this.emit('metric.updated', { name: metricName, value: metric.value, labels });
  }

  /**
   * Establece valor de un gauge
   */
  gauge(metricName, value, labels = {}) {
    const metric = this.metrics.get(metricName);
    if (!metric || metric.type !== 'gauge') {
      return;
    }

    metric.value = value;
    metric.timestamp = Date.now();

    this.addDataPoint(metricName, value, labels);
    this.emit('metric.updated', { name: metricName, value, labels });
  }

  /**
   * Registra un histograma (duración)
   */
  histogram(metricName, value, labels = {}) {
    const metric = this.metrics.get(metricName);
    if (!metric || metric.type !== 'histogram') {
      return;
    }

    metric.timestamp = Date.now();
    this.addDataPoint(metricName, value, labels);
    this.emit('metric.updated', { name: metricName, value, labels });
  }

  /**
   * Agrega punto de datos a la métrica
   */
  addDataPoint(metricName, value, labels = {}) {
    const metric = this.metrics.get(metricName);
    if (!metric) return;

    const dataPoint = {
      value,
      timestamp: Date.now(),
      labels
    };

    metric.data.push(dataPoint);

    // Mantener solo los últimos N puntos
    if (metric.data.length > this.config.max_data_points) {
      metric.data = metric.data.slice(-this.config.max_data_points);
    }
  }

  /**
   * Recolecta métricas automáticamente
   */
  async collectMetrics() {
    try {
      for (const [name, metric] of this.metrics) {
        if (metric.collector && typeof metric.collector === 'function') {
          try {
            const value = await metric.collector();
            if (value !== null && value !== undefined) {
              if (metric.type === 'gauge') {
                this.gauge(name, value);
              }
            }
          } catch (error) {
            enhancedLogger.error(`Error collecting metric ${name}:`, error);
          }
        }
      }
    } catch (error) {
      enhancedLogger.error('Error in metrics collection:', error);
    }
  }

  /**
   * Obtiene uso de CPU
   */
  getCpuUsage() {
    const startUsage = process.cpuUsage();

    return new Promise((resolve) => {
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const userPercent = (currentUsage.user / 1000000) * 100;
        const systemPercent = (currentUsage.system / 1000000) * 100;
        resolve(userPercent + systemPercent);
      }, 100);
    });
  }

  /**
   * Inicia la recolección automática de métricas
   */
  start() {
    if (this.isRunning) {
      enhancedLogger.warn('Metrics collection already running');
      return;
    }

    this.isRunning = true;

    // Intervalo principal de recolección
    const collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collection_interval);

    this.intervals.set('collection', collectionInterval);

    // Limpieza periódica de datos antiguos
    const cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60000); // Cada minuto

    this.intervals.set('cleanup', cleanupInterval);

    enhancedLogger.info('📊 Recolección de métricas iniciada');
    this.emit('metrics.started');
  }

  /**
   * Detiene la recolección de métricas
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Limpiar intervalos
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();

    enhancedLogger.info('📊 Recolección de métricas detenida');
    this.emit('metrics.stopped');
  }

  /**
   * Limpia datos antiguos
   */
  cleanupOldData() {
    const cutoff = Date.now() - this.config.retention_period;
    let cleaned = 0;

    for (const metric of this.metrics.values()) {
      const initialLength = metric.data.length;
      metric.data = metric.data.filter(point => point.timestamp > cutoff);
      cleaned += initialLength - metric.data.length;
    }

    if (cleaned > 0) {
      enhancedLogger.debug(`Cleaned ${cleaned} old metric data points`);
    }
  }

  /**
   * Obtiene todas las métricas actuales
   */
  getAllMetrics() {
    const result = {};

    for (const [name, metric] of this.metrics) {
      result[name] = {
        type: metric.type,
        description: metric.description,
        value: metric.value,
        timestamp: metric.timestamp,
        dataPoints: metric.data.length
      };
    }

    return result;
  }

  /**
   * Obtiene datos históricos de una métrica
   */
  getMetricHistory(metricName, timeRange = 3600000) { // 1 hora por defecto
    const metric = this.metrics.get(metricName);
    if (!metric) {
      return null;
    }

    const cutoff = Date.now() - timeRange;
    return metric.data.filter(point => point.timestamp > cutoff);
  }

  /**
   * Obtiene estadísticas de una métrica
   */
  getMetricStats(metricName, timeRange = 3600000) {
    const data = this.getMetricHistory(metricName, timeRange);
    if (!data || data.length === 0) {
      return null;
    }

    const values = data.map(point => point.value);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
      timeRange: timeRange / 1000 // en segundos
    };
  }

  /**
   * Crea snapshot de todas las métricas
   */
  createSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      stats: {}
    };

    // Agregar estadísticas para métricas principales
    const mainMetrics = [
      'system.memory.used',
      'system.cpu.usage',
      'app.requests.duration',
      'db.queries.duration',
      'cache.hit.rate'
    ];

    for (const metricName of mainMetrics) {
      snapshot.stats[metricName] = this.getMetricStats(metricName);
    }

    return snapshot;
  }

  /**
   * Middleware para métricas HTTP
   */
  httpMetricsMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Incrementar requests totales
      this.increment('app.requests.total');

      // Incrementar requests activos
      this.increment('app.requests.active');

      // Al terminar la respuesta
      res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Registrar duración
        this.histogram('app.requests.duration', duration, {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode
        });

        // Decrementar requests activos
        this.increment('app.requests.active', -1);

        // Incrementar errores si corresponde
        if (res.statusCode >= 400) {
          this.increment('app.errors.total', 1, {
            status_code: res.statusCode,
            method: req.method
          });
        }
      });

      next();
    };
  }

  /**
   * Obtiene estado del servicio
   */
  getStatus() {
    return {
      running: this.isRunning,
      metricsCount: this.metrics.size,
      dataPoints: Array.from(this.metrics.values())
        .reduce((total, metric) => total + metric.data.length, 0),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Instancia global del servicio de métricas
const metricsService = new MetricsService();

export { metricsService, MetricsService };
export default metricsService;
// core/performance/performance-monitor.cjs
// Sistema de Monitoreo de Performance y Optimización

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');

/**
 * Performance Monitor
 *
 * Sistema completo de monitoreo de performance y optimización
 *
 * Características:
 * - Tracking de response times
 * - Detección de operaciones lentas
 * - Métricas de memoria y CPU
 * - Cache management
 * - Performance recommendations
 * - Auto-optimization
 */
class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.metricsFile = options.metricsFile || path.join(this.projectRoot, 'logs', 'performance-metrics.json');

    // Thresholds
    this.slowOperationThreshold = options.slowOperationThreshold || 1000; // 1 segundo
    this.criticalOperationThreshold = options.criticalOperationThreshold || 5000; // 5 segundos
    this.maxMemoryUsage = options.maxMemoryUsage || 500 * 1024 * 1024; // 500 MB

    // Estado
    this.operations = new Map(); // operaciones en progreso
    this.metrics = {
      operations: [],
      slowOperations: [],
      criticalOperations: [],
      memoryUsage: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0
    };

    // Cache simple en memoria
    this.cache = new Map();
    this.cacheConfig = {
      enabled: options.cacheEnabled !== false,
      maxSize: options.cacheMaxSize || 100,
      ttl: options.cacheTTL || 5 * 60 * 1000 // 5 minutos
    };

    // Historial de métricas (últimas 1000)
    this.maxMetricsHistory = 1000;

    this.isInitialized = false;
  }

  /**
   * Inicializa el performance monitor
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('📊 [Performance Monitor] Inicializando...');

    // Asegurar directorio de logs
    await fs.ensureDir(path.dirname(this.metricsFile));

    // Cargar métricas anteriores
    await this.loadMetrics();

    // Iniciar monitoreo de memoria
    this.startMemoryMonitoring();

    // Iniciar limpieza de cache
    this.startCacheCleanup();

    this.isInitialized = true;
    console.log('✅ [Performance Monitor] Sistema de performance listo');
    console.log(`   📈 Cache: ${this.cacheConfig.enabled ? 'Enabled' : 'Disabled'}`);

    this.emit('initialized');
  }

  /**
   * Inicia el tracking de una operación
   */
  startOperation(operationId, metadata = {}) {
    const operation = {
      id: operationId,
      name: metadata.name || operationId,
      category: metadata.category || 'general',
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      metadata
    };

    this.operations.set(operationId, operation);

    return operationId;
  }

  /**
   * Finaliza el tracking de una operación
   */
  endOperation(operationId, metadata = {}) {
    const operation = this.operations.get(operationId);

    if (!operation) {
      console.warn(`⚠️ [Performance Monitor] Operación no encontrada: ${operationId}`);
      return null;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - operation.startTime;
    const memoryDelta = endMemory.heapUsed - operation.startMemory.heapUsed;

    const result = {
      ...operation,
      endTime,
      duration,
      memoryDelta,
      memoryUsed: endMemory.heapUsed,
      success: metadata.success !== false,
      error: metadata.error || null,
      result: metadata.result || null
    };

    // Remover de operaciones en progreso
    this.operations.delete(operationId);

    // Agregar a métricas
    this.recordMetric(result);

    // Detectar operaciones lentas
    if (duration > this.slowOperationThreshold) {
      this.recordSlowOperation(result);
    }

    if (duration > this.criticalOperationThreshold) {
      this.recordCriticalOperation(result);
    }

    return result;
  }

  /**
   * Wrapper para operaciones async
   */
  async trackOperation(name, category, fn, metadata = {}) {
    const operationId = `${category}:${name}:${Date.now()}`;

    this.startOperation(operationId, {
      name,
      category,
      ...metadata
    });

    try {
      const result = await fn();

      this.endOperation(operationId, {
        success: true,
        result
      });

      return result;

    } catch (error) {
      this.endOperation(operationId, {
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Registra una métrica
   */
  recordMetric(metric) {
    this.metrics.operations.push(metric);

    // Mantener solo las últimas N métricas
    if (this.metrics.operations.length > this.maxMetricsHistory) {
      this.metrics.operations = this.metrics.operations.slice(-this.maxMetricsHistory);
    }

    // Actualizar average response time
    this.metrics.totalRequests++;
    const totalTime = this.metrics.operations.reduce((sum, m) => sum + m.duration, 0);
    this.metrics.averageResponseTime = Math.round(totalTime / this.metrics.operations.length);

    this.emit('metric', metric);
  }

  /**
   * Registra operación lenta
   */
  recordSlowOperation(operation) {
    this.metrics.slowOperations.unshift(operation);

    // Mantener solo las últimas 100
    if (this.metrics.slowOperations.length > 100) {
      this.metrics.slowOperations = this.metrics.slowOperations.slice(0, 100);
    }

    console.log(`⚠️ [Performance] Operación lenta: ${operation.name} (${operation.duration}ms)`);

    this.emit('slow_operation', operation);
  }

  /**
   * Registra operación crítica
   */
  recordCriticalOperation(operation) {
    this.metrics.criticalOperations.unshift(operation);

    // Mantener solo las últimas 50
    if (this.metrics.criticalOperations.length > 50) {
      this.metrics.criticalOperations = this.metrics.criticalOperations.slice(0, 50);
    }

    console.log(`🚨 [Performance] Operación CRÍTICA: ${operation.name} (${operation.duration}ms)`);

    this.emit('critical_operation', operation);
  }

  /**
   * Cache - Set
   */
  cacheSet(key, value, ttl = null) {
    if (!this.cacheConfig.enabled) return false;

    // Verificar tamaño
    if (this.cache.size >= this.cacheConfig.maxSize) {
      // Eliminar entrada más antigua
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.cacheConfig.ttl,
      hits: 0
    };

    this.cache.set(key, entry);

    return true;
  }

  /**
   * Cache - Get
   */
  cacheGet(key) {
    if (!this.cacheConfig.enabled) return null;

    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }

    // Verificar TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    // Hit!
    entry.hits++;
    this.metrics.cacheHits++;

    return entry.value;
  }

  /**
   * Cache - Clear
   */
  cacheClear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 [Performance] Cache limpiado: ${size} entradas`);
    return size;
  }

  /**
   * Cache - Stats
   */
  getCacheStats() {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalRequests > 0
      ? Math.round((this.metrics.cacheHits / totalRequests) * 100)
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
      hitRate,
      enabled: this.cacheConfig.enabled
    };
  }

  /**
   * Monitoreo de memoria
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();

      const metric = {
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external
      };

      this.metrics.memoryUsage.push(metric);

      // Mantener solo las últimas 1000
      if (this.metrics.memoryUsage.length > 1000) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-1000);
      }

      // Verificar si excede threshold
      if (usage.heapUsed > this.maxMemoryUsage) {
        console.log(`⚠️ [Performance] Alto uso de memoria: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        this.emit('high_memory', metric);
      }

    }, 30000); // Cada 30 segundos
  }

  /**
   * Limpieza automática de cache
   */
  startCacheCleanup() {
    setInterval(() => {
      if (!this.cacheConfig.enabled) return;

      let cleaned = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 [Performance] Cache cleanup: ${cleaned} entradas expiradas`);
      }

    }, 60000); // Cada minuto
  }

  /**
   * Obtiene métricas de rendimiento
   */
  getMetrics(limit = 100) {
    const recentOperations = this.metrics.operations.slice(-limit);

    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        averageResponseTime: this.metrics.averageResponseTime,
        slowOperations: this.metrics.slowOperations.length,
        criticalOperations: this.metrics.criticalOperations.length,
        activeOperations: this.operations.size
      },
      recentOperations,
      slowOperations: this.metrics.slowOperations.slice(0, 20),
      criticalOperations: this.metrics.criticalOperations.slice(0, 10),
      cache: this.getCacheStats(),
      memory: this.getMemoryStats()
    };
  }

  /**
   * Obtiene estadísticas de memoria
   */
  getMemoryStats() {
    if (this.metrics.memoryUsage.length === 0) {
      return null;
    }

    const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const history = this.metrics.memoryUsage.slice(-100); // Últimas 100

    const avgHeapUsed = history.reduce((sum, m) => sum + m.heapUsed, 0) / history.length;

    return {
      current: {
        heapUsed: latest.heapUsed,
        heapUsedMB: (latest.heapUsed / 1024 / 1024).toFixed(2),
        heapTotal: latest.heapTotal,
        heapTotalMB: (latest.heapTotal / 1024 / 1024).toFixed(2),
        rss: latest.rss,
        rssMB: (latest.rss / 1024 / 1024).toFixed(2)
      },
      average: {
        heapUsed: avgHeapUsed,
        heapUsedMB: (avgHeapUsed / 1024 / 1024).toFixed(2)
      },
      history
    };
  }

  /**
   * Obtiene operaciones por categoría
   */
  getOperationsByCategory() {
    const categories = {};

    for (const op of this.metrics.operations) {
      if (!categories[op.category]) {
        categories[op.category] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          operations: []
        };
      }

      categories[op.category].count++;
      categories[op.category].totalDuration += op.duration;
      categories[op.category].operations.push(op);
    }

    // Calcular promedios
    for (const cat of Object.values(categories)) {
      cat.avgDuration = Math.round(cat.totalDuration / cat.count);
    }

    return categories;
  }

  /**
   * Obtiene recomendaciones de optimización
   */
  getRecommendations() {
    const recommendations = [];

    // Operaciones lentas recurrentes
    if (this.metrics.slowOperations.length > 10) {
      const slowCategories = {};
      for (const op of this.metrics.slowOperations) {
        slowCategories[op.category] = (slowCategories[op.category] || 0) + 1;
      }

      for (const [category, count] of Object.entries(slowCategories)) {
        if (count > 5) {
          recommendations.push({
            type: 'performance',
            severity: 'warning',
            category,
            message: `Múltiples operaciones lentas en categoría "${category}" (${count} operaciones)`,
            suggestion: 'Considerar optimización de queries, caching o indexación'
          });
        }
      }
    }

    // Cache hit rate bajo
    const cacheStats = this.getCacheStats();
    if (cacheStats.hitRate < 50 && cacheStats.hits + cacheStats.misses > 100) {
      recommendations.push({
        type: 'cache',
        severity: 'info',
        message: `Cache hit rate bajo: ${cacheStats.hitRate}%`,
        suggestion: 'Revisar estrategia de caching o aumentar TTL'
      });
    }

    // Memoria alta
    const memStats = this.getMemoryStats();
    if (memStats && memStats.current.heapUsed > this.maxMemoryUsage * 0.8) {
      recommendations.push({
        type: 'memory',
        severity: 'warning',
        message: `Alto uso de memoria: ${memStats.current.heapUsedMB} MB`,
        suggestion: 'Considerar limpiar cache o optimizar estructuras de datos'
      });
    }

    // Operaciones críticas
    if (this.metrics.criticalOperations.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: 'critical',
        message: `${this.metrics.criticalOperations.length} operaciones críticas detectadas`,
        suggestion: 'Revisar y optimizar operaciones que toman más de 5 segundos'
      });
    }

    return recommendations;
  }

  /**
   * Optimización automática
   */
  async autoOptimize() {
    console.log('🔧 [Performance] Ejecutando auto-optimización...');

    let actions = [];

    // Limpiar cache si está muy lleno
    const cacheStats = this.getCacheStats();
    if (cacheStats.size > cacheStats.maxSize * 0.9) {
      const cleaned = this.cacheClear();
      actions.push({
        action: 'cache_clear',
        result: `${cleaned} entradas eliminadas`
      });
    }

    // Forzar garbage collection si está disponible
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;

      if (freed > 0) {
        actions.push({
          action: 'garbage_collection',
          result: `${(freed / 1024 / 1024).toFixed(2)} MB liberados`
        });
      }
    }

    // Guardar métricas
    await this.saveMetrics();
    actions.push({
      action: 'metrics_saved',
      result: 'Métricas guardadas'
    });

    console.log(`✅ [Performance] Auto-optimización completada: ${actions.length} acciones`);

    this.emit('auto_optimize', { actions });

    return actions;
  }

  /**
   * Guarda métricas
   */
  async saveMetrics() {
    try {
      const data = {
        timestamp: Date.now(),
        summary: this.getMetrics().summary,
        cache: this.getCacheStats(),
        memory: this.getMemoryStats()
      };

      await fs.writeJson(this.metricsFile, data, { spaces: 2 });
    } catch (error) {
      console.error('Error guardando métricas:', error);
    }
  }

  /**
   * Carga métricas
   */
  async loadMetrics() {
    try {
      if (await fs.pathExists(this.metricsFile)) {
        const data = await fs.readJson(this.metricsFile);
        console.log(`   📊 Métricas anteriores cargadas`);
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }
}

module.exports = PerformanceMonitor;

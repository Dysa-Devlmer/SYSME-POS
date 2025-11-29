/**
 * Servicio de Análisis de Rendimiento y Optimización
 * Monitorea, analiza y optimiza el rendimiento del sistema
 *
 * @module PerformanceOptimizer
 * @version 2.1.0
 */

const os = require('os');
const v8 = require('v8');
const { performance } = require('perf_hooks');
const EventEmitter = require('events');

/**
 * Servicio de optimización de rendimiento
 */
class PerformanceOptimizer extends EventEmitter {
  constructor() {
    super();

    this.config = {
      monitoring: {
        interval: 5000, // Monitoreo cada 5 segundos
        metricsRetention: 3600, // Retener 1 hora de métricas
        alertThresholds: {
          cpu: 80, // % CPU
          memory: 85, // % Memoria
          responseTime: 1000, // ms
          errorRate: 5, // % errores
          dbQueryTime: 500 // ms
        }
      },
      optimization: {
        autoOptimize: true,
        cacheStrategy: 'adaptive', // adaptive, aggressive, conservative
        connectionPooling: true,
        queryOptimization: true
      },
      profiling: {
        enabled: true,
        sampleRate: 0.1, // 10% de requests
        slowQueryThreshold: 100 // ms
      }
    };

    this.metrics = {
      system: [],
      requests: [],
      queries: [],
      errors: [],
      cache: { hits: 0, misses: 0, evictions: 0 }
    };

    this.monitoring = {
      isRunning: false,
      intervalId: null
    };

    this.optimizations = new Map();
    this.bottlenecks = [];
    this.recommendations = [];
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      console.log('🚀 Iniciando servicio de optimización de rendimiento...');

      // Iniciar monitoreo
      this.startMonitoring();

      // Analizar estado inicial
      await this.analyzeInitialState();

      // Aplicar optimizaciones automáticas
      if (this.config.optimization.autoOptimize) {
        await this.applyAutoOptimizations();
      }

      console.log('✅ Servicio de optimización inicializado');
      this.emit('initialized');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando servicio:', error);
      throw error;
    }
  }

  /**
   * Inicia el monitoreo continuo
   */
  startMonitoring() {
    if (this.monitoring.isRunning) return;

    this.monitoring.isRunning = true;
    this.monitoring.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.interval);

    console.log('📊 Monitoreo de rendimiento iniciado');
  }

  /**
   * Detiene el monitoreo
   */
  stopMonitoring() {
    if (this.monitoring.intervalId) {
      clearInterval(this.monitoring.intervalId);
      this.monitoring.intervalId = null;
      this.monitoring.isRunning = false;
      console.log('⏸️  Monitoreo detenido');
    }
  }

  /**
   * Recolecta métricas del sistema
   */
  collectMetrics() {
    const timestamp = Date.now();

    // Métricas de sistema
    const systemMetrics = {
      timestamp,
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg()
    };

    this.metrics.system.push(systemMetrics);

    // Mantener solo métricas recientes
    const cutoff = timestamp - (this.config.monitoring.metricsRetention * 1000);
    this.metrics.system = this.metrics.system.filter(m => m.timestamp > cutoff);

    // Verificar alertas
    this.checkAlerts(systemMetrics);

    // Analizar tendencias cada minuto
    if (this.metrics.system.length % 12 === 0) { // 12 * 5s = 60s
      this.analyzeTrends();
    }
  }

  /**
   * Obtiene uso de CPU
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return {
      usage,
      cores: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed
    };
  }

  /**
   * Obtiene uso de memoria
   */
  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const heapStats = v8.getHeapStatistics();
    const processMemory = process.memoryUsage();

    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      percentage: (usedMem / totalMem) * 100,
      heap: {
        total: heapStats.total_heap_size,
        used: heapStats.used_heap_size,
        limit: heapStats.heap_size_limit,
        percentage: (heapStats.used_heap_size / heapStats.heap_size_limit) * 100
      },
      process: {
        rss: processMemory.rss,
        heapTotal: processMemory.heapTotal,
        heapUsed: processMemory.heapUsed,
        external: processMemory.external
      }
    };
  }

  /**
   * Verifica alertas basadas en umbrales
   */
  checkAlerts(metrics) {
    const thresholds = this.config.monitoring.alertThresholds;

    // Alerta de CPU
    if (metrics.cpu.usage > thresholds.cpu) {
      this.emitAlert({
        type: 'cpu',
        severity: 'warning',
        message: `Uso de CPU alto: ${metrics.cpu.usage.toFixed(2)}%`,
        value: metrics.cpu.usage,
        threshold: thresholds.cpu,
        timestamp: metrics.timestamp
      });
    }

    // Alerta de memoria
    if (metrics.memory.percentage > thresholds.memory) {
      this.emitAlert({
        type: 'memory',
        severity: 'warning',
        message: `Uso de memoria alto: ${metrics.memory.percentage.toFixed(2)}%`,
        value: metrics.memory.percentage,
        threshold: thresholds.memory,
        timestamp: metrics.timestamp
      });
    }

    // Alerta de heap
    if (metrics.memory.heap.percentage > 90) {
      this.emitAlert({
        type: 'heap',
        severity: 'critical',
        message: `Heap casi lleno: ${metrics.memory.heap.percentage.toFixed(2)}%`,
        value: metrics.memory.heap.percentage,
        threshold: 90,
        timestamp: metrics.timestamp,
        recommendation: 'Considerar aumentar límite de heap o ejecutar garbage collection'
      });
    }
  }

  /**
   * Emite una alerta
   */
  emitAlert(alert) {
    console.warn(`⚠️  [${alert.severity.toUpperCase()}] ${alert.message}`);
    this.emit('alert', alert);

    // Sugerir optimización automática
    if (alert.severity === 'critical' && this.config.optimization.autoOptimize) {
      this.triggerOptimization(alert.type);
    }
  }

  /**
   * Analiza tendencias en las métricas
   */
  analyzeTrends() {
    const recentMetrics = this.metrics.system.slice(-60); // Último minuto

    if (recentMetrics.length < 10) return;

    // Tendencia de CPU
    const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.cpu.usage));
    if (cpuTrend.increasing && cpuTrend.average > 70) {
      this.addRecommendation({
        type: 'cpu',
        priority: 'high',
        message: 'Tendencia creciente en uso de CPU',
        suggestion: 'Revisar procesos intensivos, considerar caching o escalado horizontal',
        trend: cpuTrend
      });
    }

    // Tendencia de memoria
    const memTrend = this.calculateTrend(recentMetrics.map(m => m.memory.percentage));
    if (memTrend.increasing && memTrend.average > 75) {
      this.addRecommendation({
        type: 'memory',
        priority: 'high',
        message: 'Tendencia creciente en uso de memoria',
        suggestion: 'Verificar memory leaks, optimizar estructuras de datos',
        trend: memTrend
      });
    }
  }

  /**
   * Calcula tendencia de una serie de valores
   */
  calculateTrend(values) {
    if (values.length < 2) return null;

    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const increasing = secondAvg > firstAvg;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      average,
      increasing,
      change,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Agrega una recomendación
   */
  addRecommendation(recommendation) {
    recommendation.timestamp = Date.now();
    this.recommendations.push(recommendation);

    // Mantener solo últimas 50 recomendaciones
    if (this.recommendations.length > 50) {
      this.recommendations = this.recommendations.slice(-50);
    }

    this.emit('recommendation', recommendation);
  }

  /**
   * Analiza estado inicial del sistema
   */
  async analyzeInitialState() {
    console.log('🔍 Analizando estado inicial del sistema...');

    const analysis = {
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpuCores: os.cpus().length,
        totalMemory: os.totalmem(),
        hostname: os.hostname()
      },
      performance: {
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage()
      },
      v8: {
        heapStats: v8.getHeapStatistics(),
        heapSpaceStats: v8.getHeapSpaceStatistics()
      }
    };

    // Detectar bottlenecks potenciales
    this.detectBottlenecks(analysis);

    return analysis;
  }

  /**
   * Detecta cuellos de botella potenciales
   */
  detectBottlenecks(analysis) {
    const bottlenecks = [];

    // CPU limitado
    if (analysis.system.cpuCores < 2) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'medium',
        message: 'Sistema con pocos núcleos de CPU',
        impact: 'Limitación en procesamiento paralelo',
        recommendation: 'Considerar upgrade de hardware o optimizar código asíncrono'
      });
    }

    // Memoria limitada
    const totalMemGB = analysis.system.totalMemory / (1024 ** 3);
    if (totalMemGB < 2) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        message: `Memoria RAM limitada: ${totalMemGB.toFixed(2)} GB`,
        impact: 'Posibles swaps y degradación de rendimiento',
        recommendation: 'Aumentar RAM o optimizar uso de memoria'
      });
    }

    // Heap limitado
    const heapLimitGB = analysis.v8.heapStats.heap_size_limit / (1024 ** 3);
    if (heapLimitGB < 1) {
      bottlenecks.push({
        type: 'heap',
        severity: 'medium',
        message: `Límite de heap bajo: ${heapLimitGB.toFixed(2)} GB`,
        impact: 'Posibles errores de memoria en carga alta',
        recommendation: 'Aumentar límite con flag --max-old-space-size'
      });
    }

    this.bottlenecks = bottlenecks;

    bottlenecks.forEach(b => {
      console.warn(`⚠️  Bottleneck detectado: ${b.message}`);
    });
  }

  /**
   * Aplica optimizaciones automáticas
   */
  async applyAutoOptimizations() {
    console.log('⚡ Aplicando optimizaciones automáticas...');

    const optimizations = [];

    // Optimización 1: Ajustar garbage collection
    if (this.config.optimization.autoOptimize) {
      this.optimizeGarbageCollection();
      optimizations.push('Garbage Collection optimizado');
    }

    // Optimización 2: Pool de conexiones
    if (this.config.optimization.connectionPooling) {
      this.optimizeConnectionPool();
      optimizations.push('Connection pooling configurado');
    }

    // Optimización 3: Estrategia de cache
    this.optimizeCacheStrategy();
    optimizations.push(`Cache strategy: ${this.config.optimization.cacheStrategy}`);

    this.optimizations.set('auto', {
      appliedAt: Date.now(),
      optimizations
    });

    console.log(`✅ ${optimizations.length} optimizaciones aplicadas`);

    return optimizations;
  }

  /**
   * Optimiza garbage collection
   */
  optimizeGarbageCollection() {
    // Forzar GC si el heap está muy lleno (solo en desarrollo)
    if (global.gc && process.env.NODE_ENV !== 'production') {
      const heapStats = v8.getHeapStatistics();
      const heapUsage = (heapStats.used_heap_size / heapStats.heap_size_limit) * 100;

      if (heapUsage > 85) {
        console.log('🗑️  Ejecutando garbage collection...');
        global.gc();
      }
    }
  }

  /**
   * Optimiza pool de conexiones
   */
  optimizeConnectionPool() {
    // Configuración recomendada para pool de conexiones
    const cpuCores = os.cpus().length;

    const poolConfig = {
      min: 2,
      max: cpuCores * 2 + 1, // Fórmula: (core_count * 2) + effective_spindle_count
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      acquireTimeoutMillis: 60000
    };

    console.log('🔌 Pool de conexiones optimizado:', poolConfig);

    return poolConfig;
  }

  /**
   * Optimiza estrategia de cache
   */
  optimizeCacheStrategy() {
    const memoryUsage = this.getMemoryUsage();
    const memPercent = memoryUsage.percentage;

    // Ajustar estrategia según memoria disponible
    if (memPercent < 50) {
      this.config.optimization.cacheStrategy = 'aggressive';
    } else if (memPercent < 75) {
      this.config.optimization.cacheStrategy = 'adaptive';
    } else {
      this.config.optimization.cacheStrategy = 'conservative';
    }

    console.log(`💾 Estrategia de cache: ${this.config.optimization.cacheStrategy}`);
  }

  /**
   * Dispara optimización específica
   */
  async triggerOptimization(type) {
    console.log(`🔧 Disparando optimización para: ${type}`);

    switch (type) {
      case 'memory':
      case 'heap':
        this.optimizeGarbageCollection();
        break;

      case 'cpu':
        // Sugerir aumentar cache para reducir cómputo
        this.config.optimization.cacheStrategy = 'aggressive';
        break;

      default:
        console.log(`⚠️  No hay optimización automática para: ${type}`);
    }
  }

  /**
   * Middleware para profiling de requests
   */
  profilingMiddleware() {
    return (req, res, next) => {
      // Decidir si hacer profiling (según sample rate)
      if (Math.random() > this.config.profiling.sampleRate) {
        return next();
      }

      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Capturar fin de request
      res.on('finish', () => {
        const duration = performance.now() - startTime;
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;

        const requestMetrics = {
          timestamp: Date.now(),
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          memory: {
            start: startMemory,
            end: endMemory,
            delta: memoryDelta
          }
        };

        this.metrics.requests.push(requestMetrics);

        // Mantener solo últimas 1000 requests
        if (this.metrics.requests.length > 1000) {
          this.metrics.requests = this.metrics.requests.slice(-1000);
        }

        // Alerta si es request lenta
        if (duration > this.config.monitoring.alertThresholds.responseTime) {
          this.emitAlert({
            type: 'slow_request',
            severity: 'warning',
            message: `Request lenta: ${req.method} ${req.url} (${duration.toFixed(2)}ms)`,
            value: duration,
            threshold: this.config.monitoring.alertThresholds.responseTime,
            url: req.url,
            method: req.method
          });
        }
      });

      next();
    };
  }

  /**
   * Registra query de base de datos
   */
  recordQuery(queryInfo) {
    const queryMetrics = {
      timestamp: Date.now(),
      query: queryInfo.query,
      duration: queryInfo.duration,
      rows: queryInfo.rows
    };

    this.metrics.queries.push(queryMetrics);

    // Mantener solo últimas 500 queries
    if (this.metrics.queries.length > 500) {
      this.metrics.queries = this.metrics.queries.slice(-500);
    }

    // Alerta si es query lenta
    if (queryInfo.duration > this.config.profiling.slowQueryThreshold) {
      this.emitAlert({
        type: 'slow_query',
        severity: 'info',
        message: `Query lenta (${queryInfo.duration}ms)`,
        value: queryInfo.duration,
        threshold: this.config.profiling.slowQueryThreshold,
        query: queryInfo.query.substring(0, 100)
      });
    }
  }

  /**
   * Registra evento de cache
   */
  recordCacheEvent(type) {
    if (type === 'hit') {
      this.metrics.cache.hits++;
    } else if (type === 'miss') {
      this.metrics.cache.misses++;
    } else if (type === 'eviction') {
      this.metrics.cache.evictions++;
    }
  }

  /**
   * Obtiene reporte de rendimiento
   */
  getPerformanceReport() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Métricas de sistema recientes
    const recentSystemMetrics = this.metrics.system.filter(m => m.timestamp > oneMinuteAgo);

    // Métricas de requests recientes
    const recentRequests = this.metrics.requests.filter(m => m.timestamp > oneMinuteAgo);

    // Métricas de queries recientes
    const recentQueries = this.metrics.queries.filter(m => m.timestamp > oneMinuteAgo);

    // Calcular promedios
    const avgCPU = recentSystemMetrics.length > 0
      ? recentSystemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentSystemMetrics.length
      : 0;

    const avgMemory = recentSystemMetrics.length > 0
      ? recentSystemMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / recentSystemMetrics.length
      : 0;

    const avgResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
      : 0;

    const avgQueryTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
      : 0;

    // Tasa de cache
    const cacheTotal = this.metrics.cache.hits + this.metrics.cache.misses;
    const cacheHitRate = cacheTotal > 0
      ? (this.metrics.cache.hits / cacheTotal) * 100
      : 0;

    return {
      timestamp: now,
      period: '1 minute',
      system: {
        avgCPU: avgCPU.toFixed(2),
        avgMemory: avgMemory.toFixed(2),
        currentUptime: process.uptime()
      },
      requests: {
        total: recentRequests.length,
        avgResponseTime: avgResponseTime.toFixed(2),
        slowRequests: recentRequests.filter(r => r.duration > this.config.monitoring.alertThresholds.responseTime).length
      },
      database: {
        queries: recentQueries.length,
        avgQueryTime: avgQueryTime.toFixed(2),
        slowQueries: recentQueries.filter(q => q.duration > this.config.profiling.slowQueryThreshold).length
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: cacheHitRate.toFixed(2),
        evictions: this.metrics.cache.evictions
      },
      bottlenecks: this.bottlenecks,
      recommendations: this.recommendations.slice(-10),
      optimizations: Array.from(this.optimizations.entries())
    };
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    this.stopMonitoring();
    this.metrics = {
      system: [],
      requests: [],
      queries: [],
      errors: [],
      cache: { hits: 0, misses: 0, evictions: 0 }
    };
    console.log('✅ Servicio de optimización limpiado');
  }
}

// Singleton
const performanceOptimizer = new PerformanceOptimizer();

module.exports = performanceOptimizer;

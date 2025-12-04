// core/metrics-engine.js
// J.A.R.V.I.S. MARK VII - FASE 6
// Metrics & Monitoring Engine

const os = require('os');

class MetricsEngine {
  constructor(logger) {
    this.logger = logger;
    this.startTime = Date.now();
    this.metrics = {
      uptime: 0,
      commands: 0,
      errors: 0,
      memories: 0,
      tasks: 0,
      searches: 0,
      workflows: 0,
      pipelines: 0,
      apiCalls: 0
    };
    this.history = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Registrar métrica (set value)
   */
  recordMetric(key, value) {
    if (this.metrics.hasOwnProperty(key)) {
      this.metrics[key] = value;
      this.addToHistory(key, value);
    }
  }

  /**
   * Incrementar métrica
   */
  incrementMetric(key, amount = 1) {
    if (this.metrics.hasOwnProperty(key)) {
      this.metrics[key] += amount;
      this.addToHistory(key, this.metrics[key]);
    }
  }

  /**
   * Decrementar métrica
   */
  decrementMetric(key, amount = 1) {
    if (this.metrics.hasOwnProperty(key) && this.metrics[key] >= amount) {
      this.metrics[key] -= amount;
      this.addToHistory(key, this.metrics[key]);
    }
  }

  /**
   * Agregar al historial
   */
  addToHistory(key, value) {
    this.history.push({
      timestamp: new Date().toISOString(),
      key,
      value
    });

    // Limitar tamaño del historial
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Obtener dashboard completo
   */
  getDashboard() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    return {
      timestamp: new Date().toISOString(),
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      metrics: {
        ...this.metrics,
        uptime
      },
      health: this.calculateHealth(),
      system: this.getSystemMetrics(),
      recentActivity: this.history.slice(-10)
    };
  }

  /**
   * Formatear uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Obtener métricas del sistema
   */
  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      hostname: os.hostname(),
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usagePercent: ((usedMem / totalMem) * 100).toFixed(2) + '%'
      },
      loadAverage: os.loadavg(),
      nodeVersion: process.version,
      pid: process.pid
    };
  }

  /**
   * Formatear bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Calcular salud del sistema
   */
  calculateHealth() {
    const errorRate = this.metrics.commands > 0
      ? (this.metrics.errors / this.metrics.commands) * 100
      : 0;

    // Verificar uso de memoria
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    // Determinar salud
    if (errorRate > 10 || memoryUsage > 90) {
      return {
        status: 'critical',
        color: 'red',
        icon: '🔴',
        message: 'Sistema en estado crítico'
      };
    }

    if (errorRate > 5 || memoryUsage > 75) {
      return {
        status: 'warning',
        color: 'yellow',
        icon: '🟡',
        message: 'Sistema requiere atención'
      };
    }

    return {
      status: 'healthy',
      color: 'green',
      icon: '🟢',
      message: 'Sistema operando normalmente'
    };
  }

  /**
   * Generar reporte completo
   */
  generateReport() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const dashboard = this.getDashboard();

    return {
      summary: `JARVIS operando por ${this.formatUptime(uptime)}`,
      metrics: this.metrics,
      health: dashboard.health,
      system: dashboard.system,
      recommendations: this.getRecommendations(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obtener recomendaciones
   */
  getRecommendations() {
    const recommendations = [];
    const health = this.calculateHealth();

    // Recomendaciones basadas en errores
    if (this.metrics.errors > 10) {
      recommendations.push({
        type: 'error',
        icon: '⚠️',
        message: 'Verificar logs de error - Tasa de errores elevada',
        priority: 'high'
      });
    }

    // Recomendaciones basadas en búsquedas
    if (this.metrics.searches > 100) {
      recommendations.push({
        type: 'performance',
        icon: '💡',
        message: 'Considerar optimizar búsquedas o implementar caché',
        priority: 'medium'
      });
    }

    // Recomendaciones basadas en memoria
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    if (memoryUsage > 75) {
      recommendations.push({
        type: 'memory',
        icon: '💾',
        message: `Uso de memoria alto (${memoryUsage.toFixed(1)}%) - Considerar reiniciar`,
        priority: 'high'
      });
    }

    // Recomendaciones basadas en workflows
    if (this.metrics.workflows > 50) {
      recommendations.push({
        type: 'maintenance',
        icon: '🔧',
        message: 'Revisar workflows antiguos y eliminar los no utilizados',
        priority: 'low'
      });
    }

    // Si todo está bien
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'info',
        icon: '✅',
        message: 'Sistema operando óptimamente',
        priority: 'info'
      });
    }

    return recommendations;
  }

  /**
   * Obtener historial filtrado
   */
  getHistory(filters = {}) {
    let history = [...this.history];

    // Filtrar por key
    if (filters.key) {
      history = history.filter(h => h.key === filters.key);
    }

    // Filtrar por fecha
    if (filters.since) {
      const sinceDate = new Date(filters.since);
      history = history.filter(h => new Date(h.timestamp) >= sinceDate);
    }

    // Limitar resultados
    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Limpiar historial
   */
  clearHistory() {
    const previousSize = this.history.length;
    this.history = [];
    this.logger.info(`🧹 Historial limpiado (${previousSize} entradas eliminadas)`);
  }

  /**
   * Reset de métricas
   */
  resetMetrics() {
    const previousMetrics = { ...this.metrics };

    this.metrics = {
      uptime: 0,
      commands: 0,
      errors: 0,
      memories: 0,
      tasks: 0,
      searches: 0,
      workflows: 0,
      pipelines: 0,
      apiCalls: 0
    };

    this.startTime = Date.now();
    this.logger.info('🔄 Métricas reseteadas');

    return previousMetrics;
  }

  /**
   * Exportar métricas
   */
  exportMetrics() {
    return {
      metrics: this.metrics,
      history: this.history,
      startTime: this.startTime,
      exportTime: new Date().toISOString()
    };
  }

  /**
   * Obtener estadísticas agregadas
   */
  getStats() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    return {
      totalCommands: this.metrics.commands,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.commands > 0
        ? ((this.metrics.errors / this.metrics.commands) * 100).toFixed(2) + '%'
        : '0%',
      averageCommandsPerMinute: uptime > 0
        ? (this.metrics.commands / (uptime / 60)).toFixed(2)
        : '0',
      uptime: this.formatUptime(uptime),
      health: this.calculateHealth().status
    };
  }
}

module.exports = MetricsEngine;

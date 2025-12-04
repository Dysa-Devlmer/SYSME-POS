// core/logging/system-monitor.cjs
// Monitoreo de Métricas del Sistema

const si = require('systeminformation');
const EventEmitter = require('events');

/**
 * System Monitor
 *
 * Monitorea métricas del sistema en tiempo real
 *
 * Características:
 * - CPU, memoria, disco
 * - Procesos de Node.js
 * - Latencia y throughput
 * - Alertas por umbrales
 * - Historial de métricas
 */
class SystemMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.interval = options.interval || 5000; // 5 segundos
    this.historySize = options.historySize || 720; // 1 hora a 5seg/muestra
    this.loggerManager = options.loggerManager;

    // Historial de métricas
    this.metricsHistory = {
      cpu: [],
      memory: [],
      disk: [],
      network: []
    };

    // Métricas actuales
    this.currentMetrics = null;

    // Alertas configuradas
    this.alerts = {
      cpu: { threshold: 80, enabled: true },
      memory: { threshold: 85, enabled: true },
      disk: { threshold: 90, enabled: true }
    };

    // Estado del monitoreo
    this.isRunning = false;
    this.intervalId = null;

    // Contadores de rendimiento
    this.performanceCounters = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
  }

  /**
   * Inicia el monitoreo
   */
  async start() {
    if (this.isRunning) return;

    console.log('📊 [System Monitor] Iniciando monitoreo...');

    this.isRunning = true;

    // Primera recolección inmediata
    await this.collect();

    // Recolección periódica
    this.intervalId = setInterval(async () => {
      await this.collect();
    }, this.interval);

    console.log(`✅ [System Monitor] Monitoreo activo (${this.interval}ms)`);
    this.emit('started');
  }

  /**
   * Detiene el monitoreo
   */
  stop() {
    if (!this.isRunning) return;

    console.log('🛑 [System Monitor] Deteniendo monitoreo...');

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ [System Monitor] Monitoreo detenido');
    this.emit('stopped');
  }

  /**
   * Recolecta métricas del sistema
   */
  async collect() {
    try {
      const timestamp = Date.now();

      // Recolectar métricas en paralelo
      const [
        cpu,
        memory,
        diskLayout,
        fsSize,
        networkStats,
        processes,
        currentLoad
      ] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.diskLayout(),
        si.fsSize(),
        si.networkStats(),
        si.processes(),
        si.currentLoad()
      ]);

      // Calcular uso de disco total
      let totalDiskSize = 0;
      let totalDiskUsed = 0;

      for (const fs of fsSize) {
        if (fs.type !== 'unknown') {
          totalDiskSize += fs.size;
          totalDiskUsed += fs.used;
        }
      }

      const diskUsage = totalDiskSize > 0
        ? (totalDiskUsed / totalDiskSize) * 100
        : 0;

      // Proceso actual de Node.js
      const nodeProcess = {
        pid: process.pid,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      };

      // Compilar métricas
      const metrics = {
        timestamp,
        cpu: {
          usage: currentLoad.currentLoad,
          cores: currentLoad.cpus.length,
          speed: cpu.speed,
          model: cpu.brand,
          temperature: currentLoad.cpus[0]?.temperature || null
        },
        memory: {
          total: memory.total,
          used: memory.used,
          free: memory.free,
          usage: (memory.used / memory.total) * 100,
          swapTotal: memory.swaptotal,
          swapUsed: memory.swapused
        },
        disk: {
          total: totalDiskSize,
          used: totalDiskUsed,
          free: totalDiskSize - totalDiskUsed,
          usage: diskUsage,
          disks: diskLayout.length
        },
        network: networkStats[0] ? {
          interface: networkStats[0].iface,
          rx: networkStats[0].rx_sec,
          tx: networkStats[0].tx_sec,
          rxTotal: networkStats[0].rx_bytes,
          txTotal: networkStats[0].tx_bytes
        } : null,
        process: {
          ...nodeProcess,
          memoryMB: (nodeProcess.memory.heapUsed / 1024 / 1024).toFixed(2),
          memoryUsage: ((nodeProcess.memory.heapUsed / nodeProcess.memory.heapTotal) * 100).toFixed(2)
        },
        system: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        }
      };

      // Actualizar métricas actuales
      this.currentMetrics = metrics;

      // Agregar al historial
      this.addToHistory('cpu', {
        timestamp,
        value: metrics.cpu.usage
      });

      this.addToHistory('memory', {
        timestamp,
        value: metrics.memory.usage
      });

      this.addToHistory('disk', {
        timestamp,
        value: metrics.disk.usage
      });

      if (metrics.network) {
        this.addToHistory('network', {
          timestamp,
          rx: metrics.network.rx,
          tx: metrics.network.tx
        });
      }

      // Verificar alertas
      this.checkAlerts(metrics);

      // Emitir evento
      this.emit('metrics', metrics);

      // Log si está disponible
      if (this.loggerManager) {
        this.loggerManager.debug('system', 'Métricas recolectadas', {
          cpu: metrics.cpu.usage.toFixed(2),
          memory: metrics.memory.usage.toFixed(2),
          disk: metrics.disk.usage.toFixed(2)
        });
      }

    } catch (error) {
      console.error('❌ [System Monitor] Error recolectando métricas:', error);

      if (this.loggerManager) {
        this.loggerManager.error('system', 'Error recolectando métricas', {
          error: error.message
        });
      }
    }
  }

  /**
   * Agrega métrica al historial
   */
  addToHistory(type, data) {
    if (!this.metricsHistory[type]) {
      this.metricsHistory[type] = [];
    }

    this.metricsHistory[type].push(data);

    // Mantener límite de historial
    if (this.metricsHistory[type].length > this.historySize) {
      this.metricsHistory[type].shift();
    }
  }

  /**
   * Verifica alertas
   */
  checkAlerts(metrics) {
    // Alerta de CPU
    if (this.alerts.cpu.enabled && metrics.cpu.usage > this.alerts.cpu.threshold) {
      this.emit('alert', {
        type: 'cpu',
        severity: 'warning',
        message: `Uso de CPU alto: ${metrics.cpu.usage.toFixed(2)}%`,
        value: metrics.cpu.usage,
        threshold: this.alerts.cpu.threshold
      });

      if (this.loggerManager) {
        this.loggerManager.warn('system', 'Alerta de CPU alta', {
          usage: metrics.cpu.usage,
          threshold: this.alerts.cpu.threshold
        });
      }
    }

    // Alerta de Memoria
    if (this.alerts.memory.enabled && metrics.memory.usage > this.alerts.memory.threshold) {
      this.emit('alert', {
        type: 'memory',
        severity: 'warning',
        message: `Uso de memoria alto: ${metrics.memory.usage.toFixed(2)}%`,
        value: metrics.memory.usage,
        threshold: this.alerts.memory.threshold
      });

      if (this.loggerManager) {
        this.loggerManager.warn('system', 'Alerta de memoria alta', {
          usage: metrics.memory.usage,
          threshold: this.alerts.memory.threshold
        });
      }
    }

    // Alerta de Disco
    if (this.alerts.disk.enabled && metrics.disk.usage > this.alerts.disk.threshold) {
      this.emit('alert', {
        type: 'disk',
        severity: 'critical',
        message: `Uso de disco alto: ${metrics.disk.usage.toFixed(2)}%`,
        value: metrics.disk.usage,
        threshold: this.alerts.disk.threshold
      });

      if (this.loggerManager) {
        this.loggerManager.error('system', 'Alerta de disco lleno', {
          usage: metrics.disk.usage,
          threshold: this.alerts.disk.threshold
        });
      }
    }
  }

  /**
   * Trackea tiempo de respuesta de una operación
   */
  trackResponseTime(timeMs) {
    this.performanceCounters.requests++;
    this.performanceCounters.responseTimes.push(timeMs);

    // Mantener solo últimas 1000 mediciones
    if (this.performanceCounters.responseTimes.length > 1000) {
      this.performanceCounters.responseTimes.shift();
    }

    // Recalcular promedio
    const sum = this.performanceCounters.responseTimes.reduce((a, b) => a + b, 0);
    this.performanceCounters.avgResponseTime =
      sum / this.performanceCounters.responseTimes.length;
  }

  /**
   * Trackea un error
   */
  trackError() {
    this.performanceCounters.errors++;
  }

  /**
   * Obtiene métricas actuales
   */
  getCurrentMetrics() {
    return this.currentMetrics;
  }

  /**
   * Obtiene historial de métricas
   */
  getHistory(type = null, limit = null) {
    if (type) {
      const history = this.metricsHistory[type] || [];
      return limit ? history.slice(-limit) : history;
    }

    // Todas las métricas
    const result = {};
    for (const [key, history] of Object.entries(this.metricsHistory)) {
      result[key] = limit ? history.slice(-limit) : history;
    }
    return result;
  }

  /**
   * Obtiene contadores de rendimiento
   */
  getPerformanceCounters() {
    return {
      ...this.performanceCounters,
      errorRate: this.performanceCounters.requests > 0
        ? (this.performanceCounters.errors / this.performanceCounters.requests) * 100
        : 0
    };
  }

  /**
   * Configura alertas
   */
  setAlert(type, threshold, enabled = true) {
    if (!this.alerts[type]) {
      throw new Error(`Tipo de alerta no soportado: ${type}`);
    }

    this.alerts[type] = { threshold, enabled };

    console.log(`✅ [System Monitor] Alerta configurada: ${type} = ${threshold}%`);
  }

  /**
   * Obtiene configuración de alertas
   */
  getAlerts() {
    return this.alerts;
  }

  /**
   * Obtiene estadísticas resumidas
   */
  getStats() {
    if (!this.currentMetrics) {
      return null;
    }

    const cpuHistory = this.metricsHistory.cpu;
    const memoryHistory = this.metricsHistory.memory;

    // Calcular promedios
    const avgCpu = cpuHistory.length > 0
      ? cpuHistory.reduce((sum, m) => sum + m.value, 0) / cpuHistory.length
      : 0;

    const avgMemory = memoryHistory.length > 0
      ? memoryHistory.reduce((sum, m) => sum + m.value, 0) / memoryHistory.length
      : 0;

    // Encontrar picos
    const maxCpu = cpuHistory.length > 0
      ? Math.max(...cpuHistory.map(m => m.value))
      : 0;

    const maxMemory = memoryHistory.length > 0
      ? Math.max(...memoryHistory.map(m => m.value))
      : 0;

    return {
      current: {
        cpu: this.currentMetrics.cpu.usage,
        memory: this.currentMetrics.memory.usage,
        disk: this.currentMetrics.disk.usage
      },
      averages: {
        cpu: avgCpu,
        memory: avgMemory
      },
      peaks: {
        cpu: maxCpu,
        memory: maxMemory
      },
      performance: this.getPerformanceCounters(),
      uptime: process.uptime(),
      isHealthy: this.isSystemHealthy()
    };
  }

  /**
   * Verifica si el sistema está saludable
   */
  isSystemHealthy() {
    if (!this.currentMetrics) return true;

    const { cpu, memory, disk } = this.currentMetrics;

    // Sistema no saludable si alguna métrica supera 90%
    if (cpu.usage > 90 || memory.usage > 90 || disk.usage > 90) {
      return false;
    }

    // Error rate alto
    const perfCounters = this.getPerformanceCounters();
    if (perfCounters.errorRate > 5) { // Más de 5% de errores
      return false;
    }

    return true;
  }

  /**
   * Genera reporte de salud
   */
  generateHealthReport() {
    if (!this.currentMetrics) {
      return {
        status: 'unknown',
        message: 'No hay métricas disponibles'
      };
    }

    const stats = this.getStats();
    const issues = [];
    const warnings = [];

    // Verificar CPU
    if (stats.current.cpu > 90) {
      issues.push(`CPU crítica: ${stats.current.cpu.toFixed(2)}%`);
    } else if (stats.current.cpu > 75) {
      warnings.push(`CPU alta: ${stats.current.cpu.toFixed(2)}%`);
    }

    // Verificar Memoria
    if (stats.current.memory > 90) {
      issues.push(`Memoria crítica: ${stats.current.memory.toFixed(2)}%`);
    } else if (stats.current.memory > 80) {
      warnings.push(`Memoria alta: ${stats.current.memory.toFixed(2)}%`);
    }

    // Verificar Disco
    if (stats.current.disk > 95) {
      issues.push(`Disco crítico: ${stats.current.disk.toFixed(2)}%`);
    } else if (stats.current.disk > 85) {
      warnings.push(`Disco alto: ${stats.current.disk.toFixed(2)}%`);
    }

    // Verificar error rate
    if (stats.performance.errorRate > 10) {
      issues.push(`Tasa de errores alta: ${stats.performance.errorRate.toFixed(2)}%`);
    } else if (stats.performance.errorRate > 5) {
      warnings.push(`Tasa de errores elevada: ${stats.performance.errorRate.toFixed(2)}%`);
    }

    // Determinar estado
    let status = 'healthy';
    let message = 'Sistema funcionando correctamente';

    if (issues.length > 0) {
      status = 'critical';
      message = `Problemas críticos detectados: ${issues.join(', ')}`;
    } else if (warnings.length > 0) {
      status = 'warning';
      message = `Advertencias: ${warnings.join(', ')}`;
    }

    return {
      status,
      message,
      issues,
      warnings,
      metrics: stats,
      timestamp: Date.now()
    };
  }
}

module.exports = SystemMonitor;

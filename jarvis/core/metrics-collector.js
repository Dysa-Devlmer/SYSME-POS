/**
 * 📊 JARVIS METRICS COLLECTOR
 * Sistema de métricas compatible con Prometheus/Grafana
 *
 * Features:
 * - Métricas de sistema (CPU, RAM, Disk)
 * - Métricas de aplicación (requests, latency, errors)
 * - Métricas de negocio (AI calls, projects, users)
 * - Exportación formato Prometheus
 * - Histogramas y contadores
 * - Alertas basadas en umbrales
 */

const os = require('os');
const { EventEmitter } = require('events');
const { getLogger } = require('./logger');

class MetricsCollector extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      interval: config.interval || 5000,
      enableSystemMetrics: config.enableSystemMetrics !== false,
      enableAppMetrics: config.enableAppMetrics !== false,
      ...config
    };

    this.metrics = {
      counters: new Map(),
      gauges: new Map(),
      histograms: new Map(),
      summaries: new Map()
    };

    this.logger = getLogger();
    this.interval = null;
    this.startTime = Date.now();
  }

  /**
   * Inicia la recolección de métricas
   */
  start() {
    if (this.interval) {
      this.logger.warn('Metrics collector already running');
      return;
    }

    this.logger.info('Starting metrics collector...');

    // Recolectar métricas periódicamente
    this.interval = setInterval(() => {
      this.collect();
    }, this.config.interval);

    // Recolectar inmediatamente
    this.collect();

    this.logger.success('Metrics collector started');
  }

  /**
   * Detiene la recolección
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.logger.info('Metrics collector stopped');
    }
  }

  /**
   * Recolecta todas las métricas
   */
  collect() {
    if (this.config.enableSystemMetrics) {
      this.collectSystemMetrics();
    }

    if (this.config.enableAppMetrics) {
      this.collectAppMetrics();
    }

    this.emit('metrics:collected', this.getAll());
  }

  /**
   * Recolecta métricas del sistema
   */
  collectSystemMetrics() {
    // CPU
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + (1 - idle / total);
    }, 0) / cpus.length;

    this.setGauge('system_cpu_usage', cpuUsage);
    this.setGauge('system_cpu_cores', cpus.length);

    // Memoria
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    this.setGauge('system_memory_total_bytes', totalMem);
    this.setGauge('system_memory_free_bytes', freeMem);
    this.setGauge('system_memory_used_bytes', usedMem);
    this.setGauge('system_memory_usage_percent', (usedMem / totalMem) * 100);

    // Proceso Node.js
    const memUsage = process.memoryUsage();
    this.setGauge('process_memory_rss_bytes', memUsage.rss);
    this.setGauge('process_memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('process_memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('process_memory_external_bytes', memUsage.external);

    // Uptime
    this.setGauge('system_uptime_seconds', os.uptime());
    this.setGauge('process_uptime_seconds', process.uptime());

    // Load average (solo en Unix)
    if (os.platform() !== 'win32') {
      const loadavg = os.loadavg();
      this.setGauge('system_load_1', loadavg[0]);
      this.setGauge('system_load_5', loadavg[1]);
      this.setGauge('system_load_15', loadavg[2]);
    }
  }

  /**
   * Recolecta métricas de la aplicación
   */
  collectAppMetrics() {
    // Event loop lag
    this.measureEventLoopLag();

    // Uptime de la aplicación
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    this.setGauge('app_uptime_seconds', uptimeSeconds);
  }

  /**
   * Mide el lag del event loop
   */
  measureEventLoopLag() {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      this.setGauge('nodejs_eventloop_lag_ms', lag);

      if (lag > 100) {
        this.logger.warn('Event loop lag detected', { lag });
        this.emit('alert:eventloop_lag', lag);
      }
    });
  }

  /**
   * Incrementa un contador
   */
  incrementCounter(name, value = 1, labels = {}) {
    const key = this.getMetricKey(name, labels);

    if (!this.metrics.counters.has(key)) {
      this.metrics.counters.set(key, {
        name,
        value: 0,
        labels,
        type: 'counter'
      });
    }

    const counter = this.metrics.counters.get(key);
    counter.value += value;
    counter.timestamp = Date.now();
  }

  /**
   * Establece un gauge
   */
  setGauge(name, value, labels = {}) {
    const key = this.getMetricKey(name, labels);

    this.metrics.gauges.set(key, {
      name,
      value,
      labels,
      type: 'gauge',
      timestamp: Date.now()
    });
  }

  /**
   * Registra un valor en un histograma
   */
  observe Histogram(name, value, labels = {}) {
    const key = this.getMetricKey(name, labels);

    if (!this.metrics.histograms.has(key)) {
      this.metrics.histograms.set(key, {
        name,
        values: [],
        labels,
        type: 'histogram',
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
      });
    }

    const histogram = this.metrics.histograms.get(key);
    histogram.values.push(value);
    histogram.timestamp = Date.now();

    // Mantener solo últimos 1000 valores
    if (histogram.values.length > 1000) {
      histogram.values = histogram.values.slice(-1000);
    }
  }

  /**
   * Mide duración de una operación
   */
  startTimer(name, labels = {}) {
    const start = Date.now();

    return () => {
      const duration = (Date.now() - start) / 1000; // segundos
      this.observeHistogram(name, duration, labels);
      return duration;
    };
  }

  /**
   * Genera clave única para métrica con labels
   */
  getMetricKey(name, labels = {}) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Obtiene todas las métricas
   */
  getAll() {
    return {
      counters: Array.from(this.metrics.counters.values()),
      gauges: Array.from(this.metrics.gauges.values()),
      histograms: Array.from(this.metrics.histograms.values()).map(h => ({
        ...h,
        count: h.values.length,
        sum: h.values.reduce((a, b) => a + b, 0),
        avg: h.values.reduce((a, b) => a + b, 0) / h.values.length || 0,
        min: Math.min(...h.values) || 0,
        max: Math.max(...h.values) || 0,
        p50: this.percentile(h.values, 0.5),
        p95: this.percentile(h.values, 0.95),
        p99: this.percentile(h.values, 0.99)
      }))
    };
  }

  /**
   * Calcula percentil
   */
  percentile(values, p) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * Exporta métricas en formato Prometheus
   */
  exportPrometheus() {
    let output = '';

    // Counters
    this.metrics.counters.forEach((metric) => {
      const labels = this.formatLabels(metric.labels);
      output += `# TYPE ${metric.name} counter\n`;
      output += `${metric.name}${labels} ${metric.value}\n`;
    });

    // Gauges
    this.metrics.gauges.forEach((metric) => {
      const labels = this.formatLabels(metric.labels);
      output += `# TYPE ${metric.name} gauge\n`;
      output += `${metric.name}${labels} ${metric.value}\n`;
    });

    // Histograms
    this.metrics.histograms.forEach((metric) => {
      const labels = this.formatLabels(metric.labels);
      output += `# TYPE ${metric.name} histogram\n`;

      const sum = metric.values.reduce((a, b) => a + b, 0);
      const count = metric.values.length;

      // Buckets
      metric.buckets.forEach((bucket) => {
        const bucketCount = metric.values.filter(v => v <= bucket).length;
        const bucketLabels = { ...metric.labels, le: bucket };
        output += `${metric.name}_bucket${this.formatLabels(bucketLabels)} ${bucketCount}\n`;
      });

      // +Inf bucket
      const infLabels = { ...metric.labels, le: '+Inf' };
      output += `${metric.name}_bucket${this.formatLabels(infLabels)} ${count}\n`;

      // Sum and count
      output += `${metric.name}_sum${labels} ${sum}\n`;
      output += `${metric.name}_count${labels} ${count}\n`;
    });

    return output;
  }

  /**
   * Formatea labels para Prometheus
   */
  formatLabels(labels) {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const formatted = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `{${formatted}}`;
  }

  /**
   * Exporta métricas como JSON
   */
  exportJSON() {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Resetea todas las métricas
   */
  reset() {
    this.metrics.counters.clear();
    this.metrics.gauges.clear();
    this.metrics.histograms.clear();
    this.metrics.summaries.clear();

    this.logger.info('All metrics reset');
  }

  /**
   * Obtiene snapshot de métricas
   */
  snapshot() {
    return {
      timestamp: Date.now(),
      system: {
        cpu: this.metrics.gauges.get('system_cpu_usage')?.value || 0,
        memory: this.metrics.gauges.get('system_memory_usage_percent')?.value || 0,
        uptime: this.metrics.gauges.get('system_uptime_seconds')?.value || 0
      },
      process: {
        memoryUsed: this.metrics.gauges.get('process_memory_heap_used_bytes')?.value || 0,
        uptime: this.metrics.gauges.get('process_uptime_seconds')?.value || 0,
        eventLoopLag: this.metrics.gauges.get('nodejs_eventloop_lag_ms')?.value || 0
      },
      app: this.getAll()
    };
  }
}

// Singleton instance
let metricsCollector;

function getMetricsCollector(config) {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector(config);
  }
  return metricsCollector;
}

module.exports = {
  MetricsCollector,
  getMetricsCollector
};

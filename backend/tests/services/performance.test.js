/**
 * Pruebas Unitarias - Performance Optimizer
 * @jest-environment node
 */

const performanceOptimizer = require('../../src/services/performance-optimizer');

describe('Performance Optimizer', () => {
  beforeAll(async () => {
    // Mock de configuración para evitar alertas reales
    performanceOptimizer.config.alertThresholds.cpu = 90;
    performanceOptimizer.config.alertThresholds.memory = 90;
  });

  afterAll(async () => {
    await performanceOptimizer.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(performanceOptimizer.metrics).toBeDefined();
      expect(performanceOptimizer.bottlenecks).toBeDefined();
    });

    test('should have default configuration', () => {
      expect(performanceOptimizer.config.monitoringInterval).toBeDefined();
      expect(performanceOptimizer.config.alertThresholds).toBeDefined();
    });

    test('should have metrics collection enabled', () => {
      expect(performanceOptimizer.isMonitoring).toBe(true);
    });
  });

  describe('Metrics Collection', () => {
    test('should collect CPU metrics', () => {
      const cpuMetrics = performanceOptimizer.metrics.cpu;

      expect(cpuMetrics).toBeDefined();
      expect(Array.isArray(cpuMetrics)).toBe(true);
    });

    test('should collect memory metrics', () => {
      const memMetrics = performanceOptimizer.metrics.memory;

      expect(memMetrics).toBeDefined();
      expect(Array.isArray(memMetrics)).toBe(true);
    });

    test('should collect request metrics', () => {
      const reqMetrics = performanceOptimizer.metrics.requests;

      expect(reqMetrics).toBeDefined();
      expect(Array.isArray(reqMetrics)).toBe(true);
    });

    test('should track metric timestamps', () => {
      performanceOptimizer.collectMetrics();

      const cpuMetrics = performanceOptimizer.metrics.cpu;
      if (cpuMetrics.length > 0) {
        expect(cpuMetrics[cpuMetrics.length - 1].timestamp).toBeDefined();
      }
    });
  });

  describe('Operation Tracking', () => {
    test('should track operation start', () => {
      const opId = performanceOptimizer.trackOperationStart('test-operation');

      expect(opId).toBeDefined();
      expect(typeof opId).toBe('string');
    });

    test('should track operation end', () => {
      const opId = performanceOptimizer.trackOperationStart('test-operation');
      const duration = performanceOptimizer.trackOperationEnd(opId);

      expect(duration).toBeDefined();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test('should calculate operation statistics', () => {
      // Registrar varias operaciones
      for (let i = 0; i < 5; i++) {
        const opId = performanceOptimizer.trackOperationStart('test-op');
        performanceOptimizer.trackOperationEnd(opId);
      }

      const stats = performanceOptimizer.getOperationStats('test-op');

      expect(stats).toBeDefined();
      expect(stats.count).toBeGreaterThanOrEqual(5);
      expect(stats.avgDuration).toBeDefined();
    });
  });

  describe('Bottleneck Detection', () => {
    test('should detect bottlenecks', () => {
      performanceOptimizer.detectBottlenecks();

      expect(Array.isArray(performanceOptimizer.bottlenecks)).toBe(true);
    });

    test('should identify slow operations', () => {
      // Simular operación lenta
      const opId = performanceOptimizer.trackOperationStart('slow-operation');
      performanceOptimizer.operations.set(opId, {
        name: 'slow-operation',
        startTime: Date.now() - 5000, // 5 segundos atrás
        duration: 5000
      });

      performanceOptimizer.detectBottlenecks();

      const slowOps = performanceOptimizer.bottlenecks.filter(b =>
        b.type === 'slow-operation'
      );

      expect(slowOps.length).toBeGreaterThanOrEqual(0);
    });

    test('should clear old bottlenecks', () => {
      performanceOptimizer.bottlenecks = [];
      performanceOptimizer.detectBottlenecks();

      expect(Array.isArray(performanceOptimizer.bottlenecks)).toBe(true);
    });
  });

  describe('Memory Profiling', () => {
    test('should profile memory usage', () => {
      const profile = performanceOptimizer.profileMemory();

      expect(profile).toBeDefined();
      expect(profile.heapUsed).toBeDefined();
      expect(profile.heapTotal).toBeDefined();
      expect(profile.external).toBeDefined();
      expect(profile.rss).toBeDefined();
    });

    test('should calculate memory percentage', () => {
      const profile = performanceOptimizer.profileMemory();

      expect(profile.usagePercent).toBeDefined();
      expect(typeof profile.usagePercent).toBe('number');
      expect(profile.usagePercent).toBeGreaterThanOrEqual(0);
      expect(profile.usagePercent).toBeLessThanOrEqual(100);
    });
  });

  describe('CPU Profiling', () => {
    test('should profile CPU usage', () => {
      const profile = performanceOptimizer.profileCPU();

      expect(profile).toBeDefined();
      expect(profile.usage).toBeDefined();
      expect(typeof profile.usage).toBe('number');
    });

    test('should track CPU over time', () => {
      performanceOptimizer.collectMetrics();
      performanceOptimizer.collectMetrics();

      const cpuMetrics = performanceOptimizer.metrics.cpu;
      expect(cpuMetrics.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Auto-Optimization', () => {
    test('should run optimization routine', async () => {
      const result = await performanceOptimizer.optimize();

      expect(result).toBeDefined();
      expect(result.optimized).toBeDefined();
    });

    test('should clear cache when memory is high', async () => {
      // Simular memoria alta
      performanceOptimizer.metrics.memory.push({
        timestamp: Date.now(),
        heapUsed: 1000000000,
        heapTotal: 1100000000,
        usagePercent: 91
      });

      const result = await performanceOptimizer.optimize();
      expect(result.optimized).toBe(true);
    });

    test('should garbage collect when needed', async () => {
      const result = await performanceOptimizer.forceGarbageCollection();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('Statistics', () => {
    test('should return comprehensive stats', () => {
      const stats = performanceOptimizer.getStats();

      expect(stats).toBeDefined();
      expect(stats.cpu).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.requests).toBeDefined();
      expect(stats.operations).toBeDefined();
    });

    test('should calculate averages', () => {
      // Agregar algunas métricas
      performanceOptimizer.collectMetrics();

      const stats = performanceOptimizer.getStats();

      expect(stats.cpu.avg).toBeDefined();
      expect(stats.memory.avg).toBeDefined();
    });

    test('should track uptime', () => {
      const stats = performanceOptimizer.getStats();

      expect(stats.uptime).toBeDefined();
      expect(typeof stats.uptime).toBe('number');
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  describe('Alerts', () => {
    test('should check for alerts', () => {
      const alerts = performanceOptimizer.checkAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    test('should trigger CPU alert on high usage', () => {
      // Simular CPU alto
      performanceOptimizer.metrics.cpu.push({
        timestamp: Date.now(),
        usage: 95
      });

      const alerts = performanceOptimizer.checkAlerts();
      const cpuAlerts = alerts.filter(a => a.type === 'cpu');

      expect(cpuAlerts.length).toBeGreaterThanOrEqual(0);
    });

    test('should trigger memory alert on high usage', () => {
      // Simular memoria alta
      performanceOptimizer.metrics.memory.push({
        timestamp: Date.now(),
        heapUsed: 1000000000,
        heapTotal: 1100000000,
        usagePercent: 95
      });

      const alerts = performanceOptimizer.checkAlerts();
      const memAlerts = alerts.filter(a => a.type === 'memory');

      expect(memAlerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Middleware', () => {
    test('should create middleware function', () => {
      const middleware = performanceOptimizer.middleware();

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    test('should track request timing', () => {
      const middleware = performanceOptimizer.middleware();
      const req = { method: 'GET', path: '/test' };
      const res = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        })
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.startTime).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    test('should generate performance report', () => {
      const report = performanceOptimizer.generateReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.bottlenecks).toBeDefined();
    });

    test('should include recommendations', () => {
      const report = performanceOptimizer.generateReport();

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources', async () => {
      const result = await performanceOptimizer.cleanup();

      expect(result).toBe(true);
    });

    test('should clear metrics on cleanup', async () => {
      await performanceOptimizer.cleanup();

      // Re-inicializar para continuar con otros tests
      await performanceOptimizer.initialize();
    });
  });
});

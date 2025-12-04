// web-interface/backend/test-integration.cjs
// Integración del Test Runner con Socket.io

const TestRunner = require('../../core/testing/test-runner.cjs');
const path = require('path');

/**
 * Integración de Testing con Socket.io
 */
class TestIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.testRunner = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el test runner
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🧪 [Test Integration] Inicializando...');

    this.testRunner = new TestRunner({
      projectRoot: process.cwd(),
      testDir: process.cwd(),
      coverageDir: path.join(process.cwd(), 'coverage'),
      reportsDir: path.join(process.cwd(), 'test-reports'),
      minCoverage: 70,
      maxFailures: 0
    });

    await this.testRunner.initialize();

    // Escuchar eventos
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ [Test Integration] Listo');
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    this.testRunner.on('run:started', (data) => {
      this.io.emit('test:run-started', data);
      console.log(`🧪 [Test] Run iniciado: ${data.runId}`);
    });

    this.testRunner.on('run:completed', (data) => {
      this.io.emit('test:run-completed', data);
      console.log(`✅ [Test] Run completado: ${data.runId}`);
    });

    this.testRunner.on('run:error', (data) => {
      this.io.emit('test:run-error', data);
      console.log(`❌ [Test] Error en run: ${data.error}`);
    });

    this.testRunner.on('output', (data) => {
      this.io.emit('test:output', data);
    });
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Descubrir tests
    socket.on('test:discover', async () => {
      try {
        if (!this.testRunner) {
          socket.emit('test:list', []);
          return;
        }

        await this.testRunner.discoverTests();
        const tests = this.testRunner.getTests();
        socket.emit('test:list', tests);

      } catch (error) {
        console.error('Error descubriendo tests:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Obtener suites
    socket.on('test:get-suites', () => {
      try {
        if (!this.testRunner) {
          socket.emit('test:suites', []);
          return;
        }

        const suites = this.testRunner.getSuites();
        socket.emit('test:suites', suites);

      } catch (error) {
        console.error('Error obteniendo suites:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Obtener historial
    socket.on('test:get-history', (limit = 20) => {
      try {
        if (!this.testRunner) {
          socket.emit('test:history', []);
          return;
        }

        const history = this.testRunner.getHistory(limit);
        socket.emit('test:history', history);

      } catch (error) {
        console.error('Error obteniendo historial:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Obtener estadísticas
    socket.on('test:get-stats', () => {
      try {
        if (!this.testRunner) {
          socket.emit('test:stats', null);
          return;
        }

        const stats = this.testRunner.getStats();
        socket.emit('test:stats', stats);

      } catch (error) {
        console.error('Error obteniendo stats:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Obtener estado
    socket.on('test:get-status', () => {
      try {
        if (!this.testRunner) {
          socket.emit('test:status', null);
          return;
        }

        const status = this.testRunner.getStatus();
        socket.emit('test:status', status);

      } catch (error) {
        console.error('Error obteniendo status:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Ejecutar todos los tests
    socket.on('test:run-all', async (options = {}) => {
      try {
        if (!this.testRunner) {
          throw new Error('Test runner no disponible');
        }

        console.log('🧪 [Test Integration] Ejecutando todos los tests...', options);

        // Ejecutar en background
        this.testRunner.runAllTests(options).catch(error => {
          console.error('Error en ejecución de tests:', error);
        });

      } catch (error) {
        console.error('Error ejecutando tests:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Ejecutar suite
    socket.on('test:run-suite', async (data) => {
      try {
        if (!this.testRunner) {
          throw new Error('Test runner no disponible');
        }

        const { suiteName, ...options } = data;

        console.log('🧪 [Test Integration] Ejecutando suite:', suiteName);

        // Ejecutar en background
        this.testRunner.runSuite(suiteName, options).catch(error => {
          console.error('Error en ejecución de suite:', error);
        });

      } catch (error) {
        console.error('Error ejecutando suite:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Ejecutar tests específicos
    socket.on('test:run-tests', async (data) => {
      try {
        if (!this.testRunner) {
          throw new Error('Test runner no disponible');
        }

        const { testFiles, ...options } = data;

        console.log('🧪 [Test Integration] Ejecutando tests específicos:', testFiles);

        // Ejecutar en background
        this.testRunner.runTests(testFiles, options).catch(error => {
          console.error('Error en ejecución de tests:', error);
        });

      } catch (error) {
        console.error('Error ejecutando tests:', error);
        socket.emit('test:error', { message: error.message });
      }
    });

    // Verificar quality gates
    socket.on('test:check-gates', (runId) => {
      try {
        if (!this.testRunner) {
          throw new Error('Test runner no disponible');
        }

        const history = this.testRunner.getHistory();
        const run = history.find(r => r.id === runId);

        if (!run) {
          throw new Error('Run no encontrado');
        }

        const gates = this.testRunner.checkQualityGates(run);
        socket.emit('test:gates-result', { runId, gates });

      } catch (error) {
        console.error('Error verificando gates:', error);
        socket.emit('test:error', { message: error.message });
      }
    });
  }

  /**
   * Obtiene el test runner
   */
  getTestRunner() {
    return this.testRunner;
  }

  /**
   * Ejecuta tests programáticamente (para uso interno)
   */
  async runTests(options = {}) {
    if (!this.testRunner) {
      throw new Error('Test runner no disponible');
    }

    return await this.testRunner.runAllTests(options);
  }
}

module.exports = TestIntegration;

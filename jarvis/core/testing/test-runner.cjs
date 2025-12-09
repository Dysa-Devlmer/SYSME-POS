// core/testing/test-runner.cjs
// Sistema de Testing Automatizado y Quality Assurance

const EventEmitter = require('events');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');

/**
 * Test Runner
 *
 * Sistema completo de testing automatizado
 *
 * Características:
 * - Ejecución de test suites
 * - Coverage reports
 * - Test discovery automático
 * - Resultados en tiempo real
 * - Historial de ejecuciones
 * - Quality gates
 */
class TestRunner extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.testDir = options.testDir || this.projectRoot;
    this.coverageDir = options.coverageDir || path.join(this.projectRoot, 'coverage');
    this.reportsDir = options.reportsDir || path.join(this.projectRoot, 'test-reports');

    // Configuración de quality gates
    this.minCoverage = options.minCoverage || 70; // 70% mínimo
    this.maxFailures = options.maxFailures || 0; // 0 fallos permitidos

    // Estado del runner
    this.isRunning = false;
    this.currentRun = null;
    this.testHistory = [];
    this.discoveredTests = [];

    // Estadísticas
    this.stats = {
      totalRuns: 0,
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      averageCoverage: 0,
      lastRun: null
    };

    this.isInitialized = false;
  }

  /**
   * Inicializa el test runner
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🧪 [Test Runner] Inicializando...');

    // Crear directorios
    await fs.ensureDir(this.coverageDir);
    await fs.ensureDir(this.reportsDir);

    // Descubrir tests
    await this.discoverTests();

    // Cargar historial
    await this.loadHistory();

    this.isInitialized = true;
    console.log('✅ [Test Runner] Sistema de testing listo');
    console.log(`   📁 Test dir: ${this.testDir}`);
    console.log(`   🧪 Tests encontrados: ${this.discoveredTests.length}`);

    this.emit('initialized');
  }

  /**
   * Descubre tests automáticamente
   */
  async discoverTests() {
    console.log('🔍 [Test Runner] Descubriendo tests...');

    const patterns = [
      'test-*.cjs',
      'test-*.js',
      '*.test.cjs',
      '*.test.js',
      '__tests__/**/*.js',
      '__tests__/**/*.cjs'
    ];

    const tests = [];

    for (const pattern of patterns) {
      const files = glob.sync(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: ['node_modules/**', 'web-interface/**']
      });

      for (const file of files) {
        tests.push({
          id: path.relative(this.projectRoot, file),
          path: file,
          name: path.basename(file),
          suite: this.getSuiteFromPath(file),
          enabled: true
        });
      }
    }

    this.discoveredTests = tests;
    console.log(`   ✅ ${tests.length} tests descubiertos`);

    return tests;
  }

  /**
   * Obtiene el nombre de la suite desde el path
   */
  getSuiteFromPath(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const parts = relativePath.split(path.sep);

    if (parts[0] === 'core') {
      return parts[1] || 'core';
    }

    if (parts[0].startsWith('test-')) {
      return parts[0].replace('test-', '').replace('.cjs', '').replace('.js', '');
    }

    return 'general';
  }

  /**
   * Ejecuta todos los tests
   */
  async runAllTests(options = {}) {
    const {
      pattern = '**/*.test.{js,cjs}',
      coverage = true,
      parallel = false,
      bail = false
    } = options;

    console.log('🧪 [Test Runner] Ejecutando todos los tests...');

    if (this.isRunning) {
      throw new Error('Ya hay una ejecución en progreso');
    }

    this.isRunning = true;
    const runId = `run-${Date.now()}`;

    const run = {
      id: runId,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      status: 'running',
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      coverage: null,
      errors: []
    };

    this.currentRun = run;
    this.emit('run:started', { runId, run });

    try {
      // Ejecutar con Jest
      const result = await this.executeJest({
        pattern,
        coverage,
        parallel,
        bail
      });

      // Procesar resultados
      run.tests = result.tests;
      run.summary = result.summary;
      run.coverage = result.coverage;
      run.status = result.success ? 'passed' : 'failed';

      // Actualizar estadísticas
      this.updateStats(run);

      // Guardar en historial
      this.testHistory.unshift(run);
      if (this.testHistory.length > 50) {
        this.testHistory = this.testHistory.slice(0, 50);
      }

      await this.saveHistory();

      run.endTime = Date.now();
      run.duration = run.endTime - run.startTime;

      console.log('✅ [Test Runner] Ejecución completada');
      console.log(`   📊 Total: ${run.summary.total} | ✅ ${run.summary.passed} | ❌ ${run.summary.failed}`);

      if (run.coverage) {
        console.log(`   📈 Coverage: ${run.coverage.overall}%`);
      }

      this.emit('run:completed', { runId, run });

      return run;

    } catch (error) {
      run.status = 'error';
      run.errors.push({
        message: error.message,
        stack: error.stack
      });

      console.error('❌ [Test Runner] Error en ejecución:', error);

      this.emit('run:error', { runId, error: error.message });

      throw error;

    } finally {
      this.isRunning = false;
      this.currentRun = null;
    }
  }

  /**
   * Ejecuta tests específicos
   */
  async runTests(testFiles, options = {}) {
    console.log(`🧪 [Test Runner] Ejecutando ${testFiles.length} test(s)...`);

    const pattern = testFiles.join('|');

    return await this.runAllTests({
      ...options,
      pattern
    });
  }

  /**
   * Ejecuta una suite específica
   */
  async runSuite(suiteName, options = {}) {
    console.log(`🧪 [Test Runner] Ejecutando suite: ${suiteName}...`);

    const suiteTests = this.discoveredTests
      .filter(t => t.suite === suiteName)
      .map(t => t.path);

    if (suiteTests.length === 0) {
      throw new Error(`Suite no encontrada: ${suiteName}`);
    }

    return await this.runTests(suiteTests, options);
  }

  /**
   * Ejecuta Jest
   */
  async executeJest(options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--json',
        '--no-cache',
        '--detectOpenHandles',
        '--forceExit'
      ];

      if (options.coverage) {
        args.push('--coverage');
        args.push('--coverageDirectory', this.coverageDir);
      }

      if (options.parallel) {
        args.push('--maxWorkers=4');
      }

      if (options.bail) {
        args.push('--bail');
      }

      if (options.pattern) {
        args.push('--testPathPattern', options.pattern);
      }

      console.log('   🚀 Ejecutando: npx jest', args.join(' '));

      const jest = spawn('npx', ['jest', ...args], {
        cwd: this.projectRoot,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
        this.emit('output', { type: 'stdout', data: data.toString() });
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
        this.emit('output', { type: 'stderr', data: data.toString() });
      });

      jest.on('close', async (code) => {
        try {
          // Parsear resultados JSON
          const results = this.parseJestOutput(stdout);

          // Leer coverage si está disponible
          let coverage = null;
          if (options.coverage) {
            coverage = await this.readCoverageReport();
          }

          resolve({
            success: code === 0,
            code,
            tests: results.tests,
            summary: results.summary,
            coverage
          });

        } catch (error) {
          reject(new Error(`Error parseando resultados: ${error.message}`));
        }
      });

      jest.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parsea la salida JSON de Jest
   */
  parseJestOutput(output) {
    try {
      // Buscar el JSON en la salida
      const jsonMatch = output.match(/\{[\s\S]*"testResults"[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          tests: [],
          summary: { total: 0, passed: 0, failed: 0, skipped: 0 }
        };
      }

      const data = JSON.parse(jsonMatch[0]);

      const tests = [];
      let passed = 0;
      let failed = 0;
      let skipped = 0;

      for (const testResult of data.testResults || []) {
        for (const assertionResult of testResult.assertionResults || []) {
          const test = {
            name: assertionResult.title,
            file: testResult.name,
            status: assertionResult.status,
            duration: assertionResult.duration || 0,
            error: assertionResult.failureMessages?.[0] || null
          };

          tests.push(test);

          if (test.status === 'passed') passed++;
          else if (test.status === 'failed') failed++;
          else if (test.status === 'skipped' || test.status === 'pending') skipped++;
        }
      }

      return {
        tests,
        summary: {
          total: tests.length,
          passed,
          failed,
          skipped
        }
      };

    } catch (error) {
      console.error('Error parseando output de Jest:', error);
      return {
        tests: [],
        summary: { total: 0, passed: 0, failed: 0, skipped: 0 }
      };
    }
  }

  /**
   * Lee el reporte de coverage
   */
  async readCoverageReport() {
    try {
      const summaryPath = path.join(this.coverageDir, 'coverage-summary.json');

      if (!await fs.pathExists(summaryPath)) {
        return null;
      }

      const data = await fs.readJson(summaryPath);

      // Calcular coverage general
      const total = data.total;
      const overall = Math.round(
        (total.lines.pct + total.statements.pct + total.functions.pct + total.branches.pct) / 4
      );

      return {
        overall,
        lines: total.lines.pct,
        statements: total.statements.pct,
        functions: total.functions.pct,
        branches: total.branches.pct
      };

    } catch (error) {
      console.error('Error leyendo coverage:', error);
      return null;
    }
  }

  /**
   * Actualiza estadísticas
   */
  updateStats(run) {
    this.stats.totalRuns++;
    this.stats.totalTests += run.summary.total;
    this.stats.totalPassed += run.summary.passed;
    this.stats.totalFailed += run.summary.failed;
    this.stats.lastRun = run.endTime;

    if (run.coverage) {
      const totalCoverage = this.testHistory
        .filter(r => r.coverage)
        .reduce((sum, r) => sum + r.coverage.overall, 0);

      const countWithCoverage = this.testHistory.filter(r => r.coverage).length;

      this.stats.averageCoverage = countWithCoverage > 0
        ? Math.round(totalCoverage / countWithCoverage)
        : 0;
    }
  }

  /**
   * Verifica quality gates
   */
  checkQualityGates(run) {
    const gates = {
      passed: true,
      failures: []
    };

    // Check coverage
    if (run.coverage && run.coverage.overall < this.minCoverage) {
      gates.passed = false;
      gates.failures.push({
        gate: 'coverage',
        message: `Coverage ${run.coverage.overall}% < ${this.minCoverage}% requerido`
      });
    }

    // Check failures
    if (run.summary.failed > this.maxFailures) {
      gates.passed = false;
      gates.failures.push({
        gate: 'failures',
        message: `${run.summary.failed} tests fallidos > ${this.maxFailures} permitidos`
      });
    }

    return gates;
  }

  /**
   * Guarda historial
   */
  async saveHistory() {
    const historyFile = path.join(this.reportsDir, 'test-history.json');
    await fs.writeJson(historyFile, {
      history: this.testHistory,
      stats: this.stats
    }, { spaces: 2 });
  }

  /**
   * Carga historial
   */
  async loadHistory() {
    try {
      const historyFile = path.join(this.reportsDir, 'test-history.json');

      if (await fs.pathExists(historyFile)) {
        const data = await fs.readJson(historyFile);
        this.testHistory = data.history || [];
        this.stats = data.stats || this.stats;

        console.log(`   📋 ${this.testHistory.length} ejecuciones en historial`);
      }

    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  }

  /**
   * Obtiene lista de tests
   */
  getTests() {
    return this.discoveredTests;
  }

  /**
   * Obtiene suites únicas
   */
  getSuites() {
    const suites = new Set(this.discoveredTests.map(t => t.suite));
    return Array.from(suites).map(name => ({
      name,
      tests: this.discoveredTests.filter(t => t.suite === name)
    }));
  }

  /**
   * Obtiene historial
   */
  getHistory(limit = 20) {
    return this.testHistory.slice(0, limit);
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      passRate: this.stats.totalTests > 0
        ? Math.round((this.stats.totalPassed / this.stats.totalTests) * 100)
        : 0
    };
  }

  /**
   * Obtiene estado actual
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentRun: this.currentRun,
      stats: this.getStats(),
      latestRun: this.testHistory[0] || null
    };
  }
}

module.exports = TestRunner;

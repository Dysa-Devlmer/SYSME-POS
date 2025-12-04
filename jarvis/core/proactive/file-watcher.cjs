// core/proactive/file-watcher.cjs
// Sistema de monitoreo inteligente de archivos para JARVIS Proactive Mode

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { EventEmitter } = require('events');

class IntelligentFileWatcher extends EventEmitter {
  constructor(options = {}) {
    super();

    this.rootPath = options.rootPath || process.cwd();
    this.ignorePaths = options.ignorePaths || [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.log',
      '**/.DS_Store',
      '**/memory/**'
    ];

    this.watchPatterns = options.watchPatterns || [
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.json',
      '**/*.md',
      '**/*.css',
      '**/*.scss'
    ];

    this.debounceTime = options.debounceTime || 500;
    this.watcher = null;
    this.isReady = false;
    this.debounceTimers = new Map();
    this.fileStats = new Map();

    // Métricas
    this.stats = {
      filesWatched: 0,
      changesDetected: 0,
      analysisTriggered: 0,
      startTime: Date.now()
    };
  }

  /**
   * Inicia el monitoreo de archivos
   */
  start() {
    if (this.watcher) {
      console.log('⚠️ [Proactive] Watcher ya está activo');
      return;
    }

    console.log('🔍 [Proactive] Iniciando file watcher inteligente...');
    console.log(`📁 [Proactive] Root: ${this.rootPath}`);

    // Usar path absoluto en lugar de patterns
    this.watcher = chokidar.watch('.', {
      cwd: this.rootPath,
      ignored: this.ignorePaths,
      persistent: true,
      ignoreInitial: true, // Ignorar archivos existentes al inicio
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.watcher
      .on('ready', () => this.handleReady())
      .on('add', (filePath) => this.handleFileAdd(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileDelete(filePath))
      .on('error', (error) => this.handleError(error));
  }

  /**
   * Detiene el monitoreo
   */
  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      console.log('🛑 [Proactive] File watcher detenido');
    }
  }

  /**
   * Handler: Watcher listo
   */
  handleReady() {
    // Evitar múltiples emisiones del evento ready
    if (this.isReady) return;
    this.isReady = true;

    const watched = this.watcher.getWatched();
    this.stats.filesWatched = Object.values(watched).reduce((acc, files) => acc + files.length, 0);

    console.log(`✅ [Proactive] Watcher listo - Monitoreo activo`);
    this.emit('ready', { filesWatched: this.stats.filesWatched });
  }

  /**
   * Handler: Archivo agregado
   */
  handleFileAdd(filePath) {
    const fullPath = path.join(this.rootPath, filePath);
    const fileInfo = this.analyzeFile(fullPath, filePath);

    this.fileStats.set(filePath, {
      ...fileInfo,
      addedAt: Date.now()
    });

    console.log(`➕ [Proactive] Archivo agregado: ${filePath}`);

    this.emit('file:added', {
      path: filePath,
      fullPath,
      info: fileInfo,
      timestamp: Date.now()
    });
  }

  /**
   * Handler: Archivo modificado
   */
  handleFileChange(filePath) {
    // Debounce para evitar múltiples análisis del mismo archivo
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    const timer = setTimeout(() => {
      this.processFileChange(filePath);
      this.debounceTimers.delete(filePath);
    }, this.debounceTime);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Procesa cambio de archivo (después del debounce)
   */
  processFileChange(filePath) {
    const fullPath = path.join(this.rootPath, filePath);
    const fileInfo = this.analyzeFile(fullPath, filePath);

    const previousStats = this.fileStats.get(filePath);
    const changeType = this.detectChangeType(previousStats, fileInfo);

    this.fileStats.set(filePath, {
      ...fileInfo,
      modifiedAt: Date.now(),
      changeType
    });

    this.stats.changesDetected++;

    console.log(`📝 [Proactive] Archivo modificado: ${filePath} (${changeType})`);

    // Emitir evento con análisis inteligente
    this.emit('file:changed', {
      path: filePath,
      fullPath,
      info: fileInfo,
      changeType,
      previousStats,
      timestamp: Date.now()
    });

    // Si el cambio es significativo, trigger análisis de IA
    if (this.isSignificantChange(changeType, fileInfo)) {
      this.stats.analysisTriggered++;
      this.emit('analysis:required', {
        path: filePath,
        fullPath,
        info: fileInfo,
        changeType,
        priority: this.calculatePriority(fileInfo, changeType)
      });
    }
  }

  /**
   * Handler: Archivo eliminado
   */
  handleFileDelete(filePath) {
    this.fileStats.delete(filePath);

    console.log(`🗑️ [Proactive] Archivo eliminado: ${filePath}`);

    this.emit('file:deleted', {
      path: filePath,
      timestamp: Date.now()
    });
  }

  /**
   * Handler: Error
   */
  handleError(error) {
    console.error('❌ [Proactive] Error en file watcher:', error);
    this.emit('error', error);
  }

  /**
   * Analiza un archivo y extrae metadata
   */
  analyzeFile(fullPath, relativePath) {
    const ext = path.extname(relativePath);
    const stats = fs.existsSync(fullPath) ? fs.statSync(fullPath) : null;

    if (!stats) {
      return { type: 'unknown', size: 0, lines: 0 };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    return {
      type: this.detectFileType(ext, relativePath),
      extension: ext,
      size: stats.size,
      lines: lines.length,
      isEmpty: content.trim().length === 0,
      hasErrors: this.quickErrorScan(content, ext),
      complexity: this.estimateComplexity(content, ext)
    };
  }

  /**
   * Detecta tipo de archivo
   */
  detectFileType(ext, path) {
    const typeMap = {
      '.js': 'javascript',
      '.cjs': 'javascript',
      '.mjs': 'javascript',
      '.jsx': 'react',
      '.ts': 'typescript',
      '.tsx': 'react-typescript',
      '.json': 'json',
      '.md': 'markdown',
      '.css': 'stylesheet',
      '.scss': 'stylesheet'
    };

    if (path.includes('test') || path.includes('spec')) {
      return 'test';
    }

    return typeMap[ext] || 'unknown';
  }

  /**
   * Detecta tipo de cambio
   */
  detectChangeType(previous, current) {
    if (!previous) return 'initial';

    const lineDiff = current.lines - previous.lines;
    const sizeDiff = current.size - previous.size;

    if (Math.abs(lineDiff) > 50) return 'major';
    if (Math.abs(lineDiff) > 10) return 'moderate';
    if (sizeDiff === 0) return 'formatting';

    return 'minor';
  }

  /**
   * Escaneo rápido de errores obvios
   */
  quickErrorScan(content, ext) {
    if (!['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return false;
    }

    // Patrones comunes de error
    const errorPatterns = [
      /console\.error/i,
      /throw new Error/i,
      /catch\s*\(/,
      /\/\/\s*TODO/i,
      /\/\/\s*FIXME/i,
      /\/\/\s*BUG/i,
      /debugger/
    ];

    return errorPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Estima complejidad del archivo
   */
  estimateComplexity(content, ext) {
    if (!['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return 'low';
    }

    const functionCount = (content.match(/function\s+\w+|=>\s*{|\w+\s*=\s*function/g) || []).length;
    const classCount = (content.match(/class\s+\w+/g) || []).length;
    const conditionalCount = (content.match(/if\s*\(|switch\s*\(|for\s*\(|while\s*\(/g) || []).length;

    const complexityScore = functionCount + (classCount * 2) + conditionalCount;

    if (complexityScore > 50) return 'very-high';
    if (complexityScore > 30) return 'high';
    if (complexityScore > 15) return 'medium';
    return 'low';
  }

  /**
   * Determina si un cambio es significativo
   */
  isSignificantChange(changeType, fileInfo) {
    // Siempre analizar cambios mayores
    if (changeType === 'major') return true;

    // Analizar archivos con alta complejidad
    if (['high', 'very-high'].includes(fileInfo.complexity)) return true;

    // Analizar archivos con posibles errores
    if (fileInfo.hasErrors) return true;

    // Analizar archivos de test
    if (fileInfo.type === 'test') return true;

    return false;
  }

  /**
   * Calcula prioridad de análisis
   */
  calculatePriority(fileInfo, changeType) {
    let priority = 0;

    if (changeType === 'major') priority += 10;
    if (changeType === 'moderate') priority += 5;

    if (fileInfo.hasErrors) priority += 15;
    if (fileInfo.complexity === 'very-high') priority += 10;
    if (fileInfo.complexity === 'high') priority += 5;
    if (fileInfo.type === 'test') priority += 8;

    if (priority >= 20) return 'critical';
    if (priority >= 10) return 'high';
    if (priority >= 5) return 'medium';
    return 'low';
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      filesTracked: this.fileStats.size
    };
  }
}

module.exports = IntelligentFileWatcher;

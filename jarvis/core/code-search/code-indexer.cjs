// core/code-search/code-indexer.cjs
// Sistema de Indexación de Código para JARVIS

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Code Indexer - Indexa y analiza el código del proyecto
 *
 * Características:
 * - Escaneo recursivo de archivos
 * - Análisis de imports/exports
 * - Extracción de funciones y clases
 * - Detección de dependencias
 * - Caché para búsquedas rápidas
 */
class CodeIndexer {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.excludePatterns = options.excludePatterns || [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.cache',
      'memory',
      'reports'
    ];

    this.includeExtensions = options.includeExtensions || [
      '.js',
      '.cjs',
      '.mjs',
      '.jsx',
      '.ts',
      '.tsx',
      '.json',
      '.md'
    ];

    // Índice en memoria
    this.index = {
      files: new Map(),      // path -> file metadata
      functions: new Map(),  // name -> locations
      classes: new Map(),    // name -> locations
      imports: new Map(),    // file -> imported files
      exports: new Map(),    // file -> exported items
      keywords: new Map()    // keyword -> files
    };

    this.stats = {
      totalFiles: 0,
      totalLines: 0,
      totalFunctions: 0,
      totalClasses: 0,
      lastIndexed: null
    };
  }

  /**
   * Indexa todo el proyecto
   */
  async indexProject() {
    console.log('🔍 [Code Indexer] Iniciando indexación del proyecto...');
    const startTime = Date.now();

    // Limpiar índice anterior
    this.clearIndex();

    // Escanear archivos
    const files = this.scanDirectory(this.projectRoot);
    console.log(`📁 [Code Indexer] Encontrados ${files.length} archivos`);

    // Indexar cada archivo
    for (const filePath of files) {
      await this.indexFile(filePath);
    }

    // Actualizar estadísticas
    this.stats.lastIndexed = Date.now();
    const duration = this.stats.lastIndexed - startTime;

    console.log(`✅ [Code Indexer] Indexación completada en ${duration}ms`);
    console.log(`   📊 Archivos: ${this.stats.totalFiles}`);
    console.log(`   📊 Líneas: ${this.stats.totalLines}`);
    console.log(`   📊 Funciones: ${this.stats.totalFunctions}`);
    console.log(`   📊 Clases: ${this.stats.totalClasses}`);

    return this.stats;
  }

  /**
   * Escanea un directorio recursivamente
   */
  scanDirectory(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.projectRoot, fullPath);

      // Verificar si debe excluirse
      if (this.shouldExclude(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        this.scanDirectory(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.includeExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Verifica si un path debe excluirse
   */
  shouldExclude(relativePath) {
    return this.excludePatterns.some(pattern => {
      return relativePath.includes(pattern);
    });
  }

  /**
   * Indexa un archivo individual
   */
  async indexFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);
      const ext = path.extname(filePath);

      const metadata = {
        path: relativePath,
        absolutePath: filePath,
        extension: ext,
        size: content.length,
        lines: content.split('\n').length,
        lastModified: fs.statSync(filePath).mtime.getTime()
      };

      // Analizar contenido según tipo
      if (['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'].includes(ext)) {
        await this.analyzeJavaScriptFile(content, metadata);
      } else if (ext === '.json') {
        await this.analyzeJSONFile(content, metadata);
      } else if (ext === '.md') {
        await this.analyzeMarkdownFile(content, metadata);
      }

      // Guardar en índice
      this.index.files.set(relativePath, metadata);
      this.stats.totalFiles++;
      this.stats.totalLines += metadata.lines;

    } catch (error) {
      console.error(`❌ [Code Indexer] Error indexando ${filePath}:`, error.message);
    }
  }

  /**
   * Analiza un archivo JavaScript/TypeScript
   */
  async analyzeJavaScriptFile(content, metadata) {
    // Extraer funciones
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g;
    let match;
    const functions = [];

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      if (functionName) {
        functions.push(functionName);

        // Agregar al índice global de funciones
        if (!this.index.functions.has(functionName)) {
          this.index.functions.set(functionName, []);
        }
        this.index.functions.get(functionName).push(metadata.path);
      }
    }

    metadata.functions = functions;
    this.stats.totalFunctions += functions.length;

    // Extraer clases
    const classRegex = /class\s+(\w+)/g;
    const classes = [];

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      classes.push(className);

      // Agregar al índice global de clases
      if (!this.index.classes.has(className)) {
        this.index.classes.set(className, []);
      }
      this.index.classes.get(className).push(metadata.path);
    }

    metadata.classes = classes;
    this.stats.totalClasses += classes.length;

    // Extraer imports
    const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
    const imports = [];

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    metadata.imports = imports;
    this.index.imports.set(metadata.path, imports);

    // Extraer exports
    const exportRegex = /(?:export|module\.exports)\s*(?:default\s+)?(?:class|function|const)?\s*(\w+)?/g;
    const exports = [];

    while ((match = exportRegex.exec(content)) !== null) {
      if (match[1]) {
        exports.push(match[1]);
      }
    }

    metadata.exports = exports;
    this.index.exports.set(metadata.path, exports);

    // Indexar palabras clave (para búsqueda)
    this.indexKeywords(content, metadata.path);
  }

  /**
   * Analiza un archivo JSON
   */
  async analyzeJSONFile(content, metadata) {
    try {
      const json = JSON.parse(content);
      metadata.jsonKeys = Object.keys(json);

      // Si es package.json, extraer info especial
      if (metadata.path.endsWith('package.json')) {
        metadata.packageName = json.name;
        metadata.dependencies = Object.keys(json.dependencies || {});
        metadata.devDependencies = Object.keys(json.devDependencies || {});
      }

      // Indexar claves como keywords
      metadata.jsonKeys.forEach(key => {
        if (!this.index.keywords.has(key)) {
          this.index.keywords.set(key, []);
        }
        this.index.keywords.get(key).push(metadata.path);
      });

    } catch (error) {
      // JSON inválido, ignorar
    }
  }

  /**
   * Analiza un archivo Markdown
   */
  async analyzeMarkdownFile(content, metadata) {
    // Extraer headers
    const headerRegex = /^#{1,6}\s+(.+)$/gm;
    const headers = [];
    let match;

    while ((match = headerRegex.exec(content)) !== null) {
      headers.push(match[1].trim());
    }

    metadata.headers = headers;

    // Indexar headers como keywords
    headers.forEach(header => {
      const words = header.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          if (!this.index.keywords.has(word)) {
            this.index.keywords.set(word, []);
          }
          if (!this.index.keywords.get(word).includes(metadata.path)) {
            this.index.keywords.get(word).push(metadata.path);
          }
        }
      });
    });
  }

  /**
   * Indexa palabras clave de un archivo
   */
  indexKeywords(content, filePath) {
    // Extraer palabras significativas (identificadores, strings, comentarios)
    const words = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios multilinea
      .replace(/\/\/.*/g, '') // Remover comentarios de línea
      .replace(/['"`].*?['"`]/g, '') // Remover strings
      .match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || [];

    // Contar frecuencia
    const wordFreq = new Map();
    words.forEach(word => {
      const lower = word.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    });

    // Indexar palabras más frecuentes (top 50)
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);

    topWords.forEach(word => {
      if (!this.index.keywords.has(word)) {
        this.index.keywords.set(word, []);
      }
      if (!this.index.keywords.get(word).includes(filePath)) {
        this.index.keywords.get(word).push(filePath);
      }
    });
  }

  /**
   * Limpia el índice
   */
  clearIndex() {
    this.index.files.clear();
    this.index.functions.clear();
    this.index.classes.clear();
    this.index.imports.clear();
    this.index.exports.clear();
    this.index.keywords.clear();

    this.stats = {
      totalFiles: 0,
      totalLines: 0,
      totalFunctions: 0,
      totalClasses: 0,
      lastIndexed: null
    };
  }

  /**
   * Busca archivos que contengan una palabra clave
   */
  searchByKeyword(keyword) {
    const lower = keyword.toLowerCase();
    return this.index.keywords.get(lower) || [];
  }

  /**
   * Busca archivos que definan una función
   */
  searchFunction(functionName) {
    return this.index.functions.get(functionName) || [];
  }

  /**
   * Busca archivos que definan una clase
   */
  searchClass(className) {
    return this.index.classes.get(className) || [];
  }

  /**
   * Obtiene metadata de un archivo
   */
  getFileMetadata(filePath) {
    return this.index.files.get(filePath);
  }

  /**
   * Obtiene todos los archivos indexados
   */
  getAllFiles() {
    return Array.from(this.index.files.values());
  }

  /**
   * Obtiene estadísticas del índice
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Exporta el índice a JSON
   */
  exportIndex() {
    return {
      files: Array.from(this.index.files.entries()),
      functions: Array.from(this.index.functions.entries()),
      classes: Array.from(this.index.classes.entries()),
      imports: Array.from(this.index.imports.entries()),
      exports: Array.from(this.index.exports.entries()),
      keywords: Array.from(this.index.keywords.entries()).slice(0, 1000), // Top 1000 keywords
      stats: this.stats
    };
  }

  /**
   * Importa un índice desde JSON
   */
  importIndex(data) {
    this.index.files = new Map(data.files);
    this.index.functions = new Map(data.functions);
    this.index.classes = new Map(data.classes);
    this.index.imports = new Map(data.imports);
    this.index.exports = new Map(data.exports);
    this.index.keywords = new Map(data.keywords);
    this.stats = data.stats;
  }
}

module.exports = CodeIndexer;

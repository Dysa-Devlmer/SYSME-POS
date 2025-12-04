// core/code-search/semantic-search.cjs
// Motor de Búsqueda Semántica para JARVIS

const CodeIndexer = require('./code-indexer.cjs');

/**
 * Semantic Search Engine
 *
 * Características:
 * - Búsqueda por intención, no solo keywords
 * - Ranking inteligente de resultados
 * - Sugerencias basadas en contexto
 * - Análisis de relevancia
 */
class SemanticSearch {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.indexer = new CodeIndexer({ projectRoot: this.projectRoot });
    this.isIndexed = false;
  }

  /**
   * Inicializa el motor de búsqueda
   */
  async initialize() {
    console.log('🔍 [Semantic Search] Inicializando...');
    await this.indexer.indexProject();
    this.isIndexed = true;
    console.log('✅ [Semantic Search] Listo para búsquedas');
  }

  /**
   * Búsqueda semántica inteligente
   *
   * @param {string} query - Consulta de búsqueda
   * @param {Object} options - Opciones de búsqueda
   * @returns {Array} - Resultados ordenados por relevancia
   */
  async search(query, options = {}) {
    if (!this.isIndexed) {
      await this.initialize();
    }

    const {
      limit = 10,
      type = 'all', // all, function, class, file
      extension = null
    } = options;

    console.log(`🔍 [Search] Buscando: "${query}"`);

    // Normalizar query
    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);

    // Buscar resultados
    const results = [];

    // 1. Búsqueda exacta de funciones/clases
    if (type === 'all' || type === 'function') {
      const functionResults = this.searchFunctions(normalizedQuery);
      results.push(...functionResults.map(r => ({ ...r, matchType: 'function-exact', score: 100 })));
    }

    if (type === 'all' || type === 'class') {
      const classResults = this.searchClasses(normalizedQuery);
      results.push(...classResults.map(r => ({ ...r, matchType: 'class-exact', score: 100 })));
    }

    // 2. Búsqueda por keywords
    if (type === 'all' || type === 'file') {
      const keywordResults = this.searchByKeywords(queryWords);
      results.push(...keywordResults);
    }

    // 3. Búsqueda fuzzy en nombres de archivos
    const filenameResults = this.searchFilenames(normalizedQuery);
    results.push(...filenameResults);

    // 4. Búsqueda en paths
    const pathResults = this.searchPaths(normalizedQuery);
    results.push(...pathResults);

    // Eliminar duplicados y ordenar por score
    const uniqueResults = this.deduplicateAndRank(results);

    // Filtrar por extensión si se especifica
    let filtered = uniqueResults;
    if (extension) {
      filtered = filtered.filter(r => r.file.extension === extension);
    }

    // Limitar resultados
    const limited = filtered.slice(0, limit);

    console.log(`✅ [Search] Encontrados ${limited.length} resultados`);

    return limited;
  }

  /**
   * Busca funciones por nombre
   */
  searchFunctions(query) {
    const results = [];

    for (const [functionName, locations] of this.indexer.index.functions.entries()) {
      const lowerName = functionName.toLowerCase();

      if (lowerName === query) {
        // Coincidencia exacta
        locations.forEach(path => {
          results.push({
            file: this.indexer.getFileMetadata(path),
            functionName,
            matchType: 'function-exact',
            score: 100
          });
        });
      } else if (lowerName.includes(query) || query.includes(lowerName)) {
        // Coincidencia parcial
        locations.forEach(path => {
          results.push({
            file: this.indexer.getFileMetadata(path),
            functionName,
            matchType: 'function-partial',
            score: 80
          });
        });
      }
    }

    return results;
  }

  /**
   * Busca clases por nombre
   */
  searchClasses(query) {
    const results = [];

    for (const [className, locations] of this.indexer.index.classes.entries()) {
      const lowerName = className.toLowerCase();

      if (lowerName === query) {
        // Coincidencia exacta
        locations.forEach(path => {
          results.push({
            file: this.indexer.getFileMetadata(path),
            className,
            matchType: 'class-exact',
            score: 100
          });
        });
      } else if (lowerName.includes(query) || query.includes(lowerName)) {
        // Coincidencia parcial
        locations.forEach(path => {
          results.push({
            file: this.indexer.getFileMetadata(path),
            className,
            matchType: 'class-partial',
            score: 80
          });
        });
      }
    }

    return results;
  }

  /**
   * Busca por palabras clave
   */
  searchByKeywords(queryWords) {
    const results = [];
    const fileScores = new Map();

    // Calcular score por archivo basado en keywords
    queryWords.forEach(word => {
      const files = this.indexer.searchByKeyword(word);
      files.forEach(filePath => {
        const currentScore = fileScores.get(filePath) || 0;
        fileScores.set(filePath, currentScore + 10);
      });
    });

    // Convertir a resultados
    for (const [filePath, score] of fileScores.entries()) {
      const file = this.indexer.getFileMetadata(filePath);
      if (file) {
        results.push({
          file,
          matchType: 'keyword',
          score
        });
      }
    }

    return results;
  }

  /**
   * Busca en nombres de archivos
   */
  searchFilenames(query) {
    const results = [];
    const allFiles = this.indexer.getAllFiles();

    allFiles.forEach(file => {
      const filename = file.path.toLowerCase();

      if (filename.includes(query)) {
        const score = this.calculateFilenameScore(filename, query);
        results.push({
          file,
          matchType: 'filename',
          score
        });
      }
    });

    return results;
  }

  /**
   * Busca en paths completos
   */
  searchPaths(query) {
    const results = [];
    const allFiles = this.indexer.getAllFiles();

    allFiles.forEach(file => {
      const pathLower = file.path.toLowerCase();

      if (pathLower.includes(query)) {
        const score = this.calculatePathScore(pathLower, query);
        results.push({
          file,
          matchType: 'path',
          score
        });
      }
    });

    return results;
  }

  /**
   * Calcula score para coincidencia de filename
   */
  calculateFilenameScore(filename, query) {
    const basename = filename.split(/[\/\\]/).pop();

    if (basename === query) return 90;
    if (basename.startsWith(query)) return 70;
    if (basename.includes(query)) return 50;
    return 30;
  }

  /**
   * Calcula score para coincidencia de path
   */
  calculatePathScore(path, query) {
    const parts = path.split(/[\/\\]/);

    // Más score si coincide con parte final del path
    const lastPart = parts[parts.length - 1] || '';
    if (lastPart.includes(query)) return 60;

    // Score medio para otras partes
    return 40;
  }

  /**
   * Elimina duplicados y ordena por score
   */
  deduplicateAndRank(results) {
    const seen = new Map();

    results.forEach(result => {
      const key = result.file.path;

      if (!seen.has(key) || seen.get(key).score < result.score) {
        seen.set(key, result);
      }
    });

    return Array.from(seen.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Sugiere archivos relacionados a un archivo
   */
  getSuggestedRelated(filePath) {
    const file = this.indexer.getFileMetadata(filePath);
    if (!file) return [];

    const suggestions = [];

    // 1. Archivos importados
    const imports = this.indexer.index.imports.get(filePath) || [];
    imports.forEach(importPath => {
      const resolvedPath = this.resolveImport(importPath, filePath);
      if (resolvedPath) {
        const importedFile = this.indexer.getFileMetadata(resolvedPath);
        if (importedFile) {
          suggestions.push({
            file: importedFile,
            reason: 'imported',
            score: 90
          });
        }
      }
    });

    // 2. Archivos en el mismo directorio
    const directory = filePath.split(/[\/\\]/).slice(0, -1).join('/');
    const allFiles = this.indexer.getAllFiles();

    allFiles.forEach(f => {
      const fDir = f.path.split(/[\/\\]/).slice(0, -1).join('/');
      if (fDir === directory && f.path !== filePath) {
        suggestions.push({
          file: f,
          reason: 'same-directory',
          score: 50
        });
      }
    });

    // 3. Archivos con nombres similares
    const basename = filePath.split(/[\/\\]/).pop().replace(/\.[^.]+$/, '');
    allFiles.forEach(f => {
      const fBasename = f.path.split(/[\/\\]/).pop().replace(/\.[^.]+$/, '');
      if (fBasename.includes(basename) && f.path !== filePath) {
        suggestions.push({
          file: f,
          reason: 'similar-name',
          score: 40
        });
      }
    });

    return this.deduplicateAndRank(suggestions).slice(0, 10);
  }

  /**
   * Resuelve un import path a path real
   */
  resolveImport(importPath, fromFile) {
    // Imports relativos
    if (importPath.startsWith('.')) {
      const dir = fromFile.split(/[\/\\]/).slice(0, -1).join('/');
      const resolved = require('path').join(dir, importPath);

      // Probar con extensiones comunes
      const extensions = ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (this.indexer.index.files.has(withExt)) {
          return withExt;
        }
      }

      return resolved;
    }

    // Imports absolutos (buscar en node_modules o src)
    return null;
  }

  /**
   * Obtiene estadísticas del índice
   */
  getStats() {
    return this.indexer.getStats();
  }

  /**
   * Re-indexa el proyecto
   */
  async reindex() {
    console.log('🔄 [Semantic Search] Re-indexando proyecto...');
    await this.indexer.indexProject();
    console.log('✅ [Semantic Search] Re-indexación completada');
  }
}

module.exports = SemanticSearch;

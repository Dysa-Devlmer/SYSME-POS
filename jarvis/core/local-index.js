// ============================================
// LOCAL INDEX - INDEXACIÓN LOCAL INTELIGENTE
// ============================================
// Indexa memorias, proyectos y documentación para búsqueda rápida

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LocalIndex {
  constructor(logger) {
    this.logger = logger || console;
    this.indexPath = path.join(__dirname, '../data/local-index.json');
    this.index = {
      memories: [],
      projects: [],
      files: [],
      lastUpdate: null,
      stats: { totalEntries: 0, totalSize: 0 }
    };
  }

  async initialize() {
    await this.loadIndex();
    this.logger.info('✅ LocalIndex inicializado');
  }

  // ===== CARGAR/GUARDAR INDEX =====
  async loadIndex() {
    try {
      if (await fs.pathExists(this.indexPath)) {
        this.index = await fs.readJSON(this.indexPath);
        this.logger.info(`📦 Índice cargado: ${this.index.stats.totalEntries} entradas`);
      } else {
        this.logger.info('📝 Creando nuevo índice local');
      }
    } catch (error) {
      this.logger.warn('⚠️  Error cargando índice, usando nuevo:', error.message);
    }
  }

  async saveIndex() {
    try {
      this.index.lastUpdate = new Date().toISOString();
      this.index.stats.totalEntries =
        this.index.memories.length +
        this.index.projects.length +
        this.index.files.length;

      await fs.writeJSON(this.indexPath, this.index, { spaces: 2 });
      this.logger.info(`💾 Índice guardado: ${this.index.stats.totalEntries} entradas`);
      return { success: true };
    } catch (error) {
      this.logger.error('Error guardando índice:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ===== INDEXAR MEMORIAS =====
  async indexMemory() {
    try {
      const memoryDbPath = path.join(__dirname, '../data/memory-db.json');

      if (!await fs.pathExists(memoryDbPath)) {
        this.logger.warn('⚠️  No se encontró memory-db.json');
        return { success: false, count: 0 };
      }

      const memoryDb = await fs.readJSON(memoryDbPath);
      const memories = memoryDb.memories || [];

      this.index.memories = memories.map((mem, i) => ({
        id: mem.id || `mem_${i}`,
        content: mem.content || '',
        tags: mem.tags || [],
        timestamp: mem.timestamp || new Date().toISOString(),
        type: 'memory',
        searchable: (mem.content || '').toLowerCase()
      }));

      this.logger.info(`✅ Indexadas ${this.index.memories.length} memorias`);
      return { success: true, count: this.index.memories.length };
    } catch (error) {
      this.logger.error('Error indexando memorias:', error.message);
      return { success: false, count: 0, message: error.message };
    }
  }

  // ===== INDEXAR PROYECTO =====
  async indexProject(projectName) {
    try {
      const projectPath = path.join(__dirname, '../projects', projectName);

      if (!await fs.pathExists(projectPath)) {
        return { success: false, message: `Proyecto ${projectName} no encontrado` };
      }

      const files = await this.scanProjectFiles(projectPath);
      const readmePath = path.join(projectPath, 'README.md');
      let description = 'Proyecto sin descripción';
      let type = 'unknown';

      // Leer README
      if (await fs.pathExists(readmePath)) {
        const readme = await fs.readFile(readmePath, 'utf-8');
        description = readme.substring(0, 200).trim();
      }

      // Detectar tipo
      const packageJsonPath = path.join(projectPath, 'package.json');
      const requirementsPath = path.join(projectPath, 'requirements.txt');

      if (await fs.pathExists(packageJsonPath)) {
        const pkg = await fs.readJSON(packageJsonPath);
        if (pkg.dependencies?.react) type = 'react-frontend';
        else if (pkg.dependencies?.express) type = 'nodejs-backend';
        else if (pkg.dependencies?.commander) type = 'nodejs-cli';
        else type = 'nodejs';
      } else if (await fs.pathExists(requirementsPath)) {
        type = 'python';
      }

      // Agregar/actualizar en índice
      const existingIndex = this.index.projects.findIndex(p => p.name === projectName);
      const projectEntry = {
        name: projectName,
        path: projectPath,
        type: type,
        description: description,
        files: files,
        fileCount: files.length,
        timestamp: new Date().toISOString(),
        searchable: `${projectName} ${description} ${type}`.toLowerCase()
      };

      if (existingIndex >= 0) {
        this.index.projects[existingIndex] = projectEntry;
      } else {
        this.index.projects.push(projectEntry);
      }

      this.logger.info(`✅ Proyecto "${projectName}" indexado (${files.length} archivos)`);
      return { success: true, files: files.length };
    } catch (error) {
      this.logger.error(`Error indexando proyecto ${projectName}:`, error.message);
      return { success: false, message: error.message };
    }
  }

  // ===== ESCANEAR ARCHIVOS DE PROYECTO =====
  async scanProjectFiles(projectPath) {
    const files = [];
    const extensionsToIndex = ['.js', '.jsx', '.ts', '.tsx', '.py', '.md', '.json', '.html', '.css'];

    async function scanDir(dir, baseDir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          // Ignorar node_modules, .git, etc.
          if (entry.name === 'node_modules' ||
              entry.name === '.git' ||
              entry.name === 'dist' ||
              entry.name === 'build' ||
              entry.name === '__pycache__') {
            continue;
          }

          if (entry.isDirectory()) {
            await scanDir(fullPath, baseDir);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensionsToIndex.includes(ext)) {
              const stats = await fs.stat(fullPath);
              files.push({
                name: entry.name,
                path: relativePath,
                fullPath: fullPath,
                extension: ext,
                size: stats.size,
                modified: stats.mtime.toISOString()
              });
            }
          }
        }
      } catch (error) {
        // Silenciar errores de permisos
      }
    }

    await scanDir(projectPath, projectPath);
    return files;
  }

  // ===== INDEXAR TODOS LOS PROYECTOS =====
  async indexAllProjects() {
    try {
      const projectsDir = path.join(__dirname, '../projects');

      if (!await fs.pathExists(projectsDir)) {
        this.logger.warn('⚠️  Directorio projects no existe');
        return { success: false, count: 0 };
      }

      const projects = (await fs.readdir(projectsDir, { withFileTypes: true }))
        .filter(e => e.isDirectory())
        .map(e => e.name);

      let indexed = 0;
      for (const proj of projects) {
        const result = await this.indexProject(proj);
        if (result.success) indexed++;
      }

      this.logger.info(`✅ Indexados ${indexed}/${projects.length} proyectos`);
      return { success: true, count: indexed };
    } catch (error) {
      this.logger.error('Error indexando proyectos:', error.message);
      return { success: false, count: 0, message: error.message };
    }
  }

  // ===== BÚSQUEDA EN ÍNDICE LOCAL =====
  async search(query, options = {}) {
    try {
      const limit = options.limit || 10;
      const type = options.type; // 'memory', 'project', 'file', undefined = all
      const queryLower = query.toLowerCase();
      const queryTerms = queryLower.split(' ').filter(t => t.length > 2);

      let results = [];

      // Buscar en memorias
      if (!type || type === 'memory') {
        this.index.memories.forEach((mem, i) => {
          const relevance = this.calculateRelevance(mem.searchable, queryTerms);
          if (relevance > 0) {
            results.push({
              title: `Memoria: ${mem.content.substring(0, 60)}...`,
              content: mem.content,
              type: 'memory',
              id: mem.id,
              relevance: relevance,
              timestamp: mem.timestamp,
              tags: mem.tags
            });
          }
        });
      }

      // Buscar en proyectos
      if (!type || type === 'project') {
        this.index.projects.forEach((proj, i) => {
          const relevance = this.calculateRelevance(proj.searchable, queryTerms);
          if (relevance > 0) {
            results.push({
              title: `Proyecto: ${proj.name}`,
              content: proj.description,
              type: 'project',
              projectType: proj.type,
              path: proj.path,
              fileCount: proj.fileCount,
              relevance: relevance,
              timestamp: proj.timestamp
            });
          }
        });
      }

      // Buscar en archivos de proyectos
      if (!type || type === 'file') {
        this.index.projects.forEach(proj => {
          proj.files.forEach(file => {
            const fileSearchable = `${file.name} ${file.path}`.toLowerCase();
            const relevance = this.calculateRelevance(fileSearchable, queryTerms);
            if (relevance > 0) {
              results.push({
                title: `Archivo: ${file.name}`,
                content: file.path,
                type: 'file',
                project: proj.name,
                path: file.fullPath,
                extension: file.extension,
                size: file.size,
                relevance: relevance * 0.8, // Penalizar archivos vs proyectos
                timestamp: file.modified
              });
            }
          });
        });
      }

      // Ordenar por relevancia y limitar
      results = results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);

      this.logger.info(`🔍 Búsqueda local: "${query}" → ${results.length} resultados`);
      return {
        success: true,
        data: results,
        count: results.length,
        query: query
      };

    } catch (error) {
      this.logger.error('Error en búsqueda local:', error.message);
      return {
        success: false,
        data: [],
        count: 0,
        message: error.message
      };
    }
  }

  // ===== CALCULAR RELEVANCIA =====
  calculateRelevance(text, queryTerms) {
    let score = 0;
    const textLower = text.toLowerCase();

    queryTerms.forEach(term => {
      // Coincidencia exacta
      if (textLower.includes(term)) {
        score += 1.0;

        // Bonus por palabra completa
        const wordBoundary = new RegExp(`\\b${term}\\b`);
        if (wordBoundary.test(textLower)) {
          score += 0.5;
        }

        // Bonus por posición temprana
        const position = textLower.indexOf(term);
        if (position < 50) {
          score += 0.3;
        }
      }
    });

    return score / queryTerms.length;
  }

  // ===== REBUILD COMPLETO =====
  async rebuildIndex() {
    try {
      this.logger.info('🔄 Reconstruyendo índice completo...');

      this.index = {
        memories: [],
        projects: [],
        files: [],
        lastUpdate: null,
        stats: { totalEntries: 0, totalSize: 0 }
      };

      await this.indexMemory();
      await this.indexAllProjects();
      await this.saveIndex();

      this.logger.info('✅ Índice reconstruido completamente');
      return {
        success: true,
        stats: this.index.stats
      };
    } catch (error) {
      this.logger.error('Error reconstruyendo índice:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ===== ESTADÍSTICAS =====
  async getStats() {
    return {
      memories: this.index.memories.length,
      projects: this.index.projects.length,
      files: this.index.files.length,
      totalEntries: this.index.stats.totalEntries,
      lastUpdate: this.index.lastUpdate,
      indexPath: this.indexPath
    };
  }
}

export default LocalIndex;

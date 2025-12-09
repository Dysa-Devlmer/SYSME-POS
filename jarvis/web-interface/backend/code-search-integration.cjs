// web-interface/backend/code-search-integration.cjs
// Integración del Sistema de Búsqueda de Código con Socket.io

const SemanticSearch = require('../../core/code-search/semantic-search.cjs');

/**
 * Integración de Code Search con Socket.io
 */
class CodeSearchIntegration {
  constructor(io) {
    this.io = io;
    this.searchEngine = null;
    this.isInitialized = false;
    this.isIndexing = false;
  }

  /**
   * Inicializa el motor de búsqueda
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔍 [Code Search Integration] Inicializando...');

    this.searchEngine = new SemanticSearch({
      projectRoot: process.cwd()
    });

    // Indexar en background
    this.indexInBackground();

    this.isInitialized = true;
    console.log('✅ [Code Search Integration] Listo');
  }

  /**
   * Indexa el proyecto en background
   */
  async indexInBackground() {
    try {
      this.isIndexing = true;
      this.io.emit('code-search:indexing', { isIndexing: true });

      await this.searchEngine.initialize();

      this.isIndexing = false;
      this.io.emit('code-search:indexing', { isIndexing: false });

      // Enviar estadísticas a todos los clientes
      const stats = this.searchEngine.getStats();
      this.io.emit('code-search:stats', stats);

    } catch (error) {
      console.error('❌ [Code Search] Error en indexación:', error);
      this.isIndexing = false;
      this.io.emit('code-search:indexing', { isIndexing: false });
    }
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Búsqueda
    socket.on('code-search:search', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { query, options } = data;
        console.log(`🔍 [Code Search] Búsqueda: "${query}"`);

        const results = await this.searchEngine.search(query, options || {});

        socket.emit('code-search:results', {
          query,
          results,
          count: results.length
        });

      } catch (error) {
        console.error('❌ [Code Search] Error en búsqueda:', error);
        socket.emit('code-search:error', {
          message: error.message
        });
      }
    });

    // Obtener estadísticas
    socket.on('code-search:get-stats', () => {
      try {
        if (!this.searchEngine) {
          socket.emit('code-search:stats', {
            totalFiles: 0,
            totalLines: 0,
            totalFunctions: 0,
            totalClasses: 0
          });
          return;
        }

        const stats = this.searchEngine.getStats();
        socket.emit('code-search:stats', stats);

      } catch (error) {
        socket.emit('code-search:error', {
          message: error.message
        });
      }
    });

    // Re-indexar
    socket.on('code-search:reindex', async () => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
          return;
        }

        console.log('🔄 [Code Search] Solicitada re-indexación');
        this.indexInBackground();

      } catch (error) {
        socket.emit('code-search:error', {
          message: error.message
        });
      }
    });

    // Obtener detalles de archivo
    socket.on('code-search:get-file-details', (filePath) => {
      try {
        if (!this.searchEngine) {
          socket.emit('code-search:file-details', null);
          return;
        }

        const file = this.searchEngine.indexer.getFileMetadata(filePath);
        socket.emit('code-search:file-details', {
          file
        });

      } catch (error) {
        socket.emit('code-search:error', {
          message: error.message
        });
      }
    });

    // Obtener archivos relacionados
    socket.on('code-search:get-related', (filePath) => {
      try {
        if (!this.searchEngine) {
          socket.emit('code-search:related', []);
          return;
        }

        const related = this.searchEngine.getSuggestedRelated(filePath);
        socket.emit('code-search:related', related);

      } catch (error) {
        socket.emit('code-search:error', {
          message: error.message
        });
      }
    });
  }

  /**
   * Obtiene el motor de búsqueda
   */
  getSearchEngine() {
    return this.searchEngine;
  }
}

module.exports = CodeSearchIntegration;

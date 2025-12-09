// web-interface/backend/doc-generator-integration.cjs
// Integración del Generador de Documentación con Socket.io

const DocumentationGenerator = require('../../core/documentation/doc-generator.cjs');

/**
 * Integración de Documentation Generator con Socket.io
 */
class DocGeneratorIntegration {
  constructor(io, codeSearchIntegration) {
    this.io = io;
    this.codeSearchIntegration = codeSearchIntegration;
    this.docGenerator = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el generador de documentación
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('📚 [Doc Generator Integration] Inicializando...');

    // Esperar a que code search esté listo
    if (!this.codeSearchIntegration.searchEngine) {
      console.log('⏳ [Doc Generator] Esperando indexación de código...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const searchEngine = this.codeSearchIntegration.getSearchEngine();
    if (!searchEngine) {
      throw new Error('Code Search no está inicializado');
    }

    this.docGenerator = new DocumentationGenerator({
      projectRoot: process.cwd(),
      codeIndexer: searchEngine.indexer,
      aiAnalyzer: null // TODO: integrar con AI analyzer si está disponible
    });

    this.isInitialized = true;
    console.log('✅ [Doc Generator Integration] Listo');
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Generar documentación de archivo
    socket.on('docs:generate-file', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { filePath } = data;
        console.log(`📝 [Doc Generator] Generando documentación para: ${filePath}`);

        const doc = await this.docGenerator.generateFileDocumentation(filePath);
        const markdown = this.docGenerator.exportToMarkdown(doc, 'file');

        socket.emit('docs:file-generated', {
          ...doc,
          markdown
        });

      } catch (error) {
        console.error('❌ [Doc Generator] Error generando documentación:', error);
        socket.emit('docs:error', {
          message: error.message
        });
      }
    });

    // Generar documentación de directorio
    socket.on('docs:generate-directory', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { directoryPath } = data;
        console.log(`📁 [Doc Generator] Generando README para: ${directoryPath}`);

        const doc = await this.docGenerator.generateDirectoryReadme(directoryPath);
        const markdown = this.docGenerator.exportToMarkdown(doc, 'directory');

        socket.emit('docs:directory-generated', {
          ...doc,
          markdown
        });

      } catch (error) {
        console.error('❌ [Doc Generator] Error generando README:', error);
        socket.emit('docs:error', {
          message: error.message
        });
      }
    });

    // Generar documentación completa del proyecto
    socket.on('docs:generate-project', async () => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        console.log('📚 [Doc Generator] Generando documentación del proyecto...');

        const doc = await this.docGenerator.generateProjectDocumentation();
        const markdown = this.docGenerator.generateProjectMarkdown(doc);

        socket.emit('docs:project-generated', {
          ...doc,
          markdown
        });

      } catch (error) {
        console.error('❌ [Doc Generator] Error generando documentación del proyecto:', error);
        socket.emit('docs:error', {
          message: error.message
        });
      }
    });

    // Buscar archivos para generar documentación
    socket.on('docs:search-files', (data) => {
      try {
        if (!this.codeSearchIntegration.searchEngine) {
          socket.emit('docs:file-list', { files: [] });
          return;
        }

        const { query } = data;
        const searchEngine = this.codeSearchIntegration.getSearchEngine();
        const allFiles = searchEngine.indexer.getAllFiles();

        // Filtrar archivos por query
        const filtered = allFiles
          .filter(file => file.path.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 20)
          .map(file => ({
            path: file.path,
            lines: file.lines,
            size: file.size
          }));

        socket.emit('docs:file-list', { files: filtered });

      } catch (error) {
        socket.emit('docs:error', {
          message: error.message
        });
      }
    });
  }
}

module.exports = DocGeneratorIntegration;

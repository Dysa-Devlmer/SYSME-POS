// core/web-intelligence/web-intelligence-manager.cjs
// Orquestador del sistema de Web Intelligence - El poder de JARVIS

const WebSearchEngine = require('./web-search-engine.cjs');
const ContentExtractor = require('./content-extractor.cjs');
const KnowledgeProcessor = require('./knowledge-processor.cjs');
const MemoryManager = require('../neural-memory/memory-manager.cjs');
const { EventEmitter } = require('events');

/**
 * Web Intelligence Manager
 *
 * Orquesta todo el flujo:
 * 1. Buscar en internet
 * 2. Extraer contenido útil
 * 3. Procesar con IA
 * 4. Guardar en memoria permanente
 * 5. Responder queries usando conocimiento adquirido
 */
class WebIntelligenceManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();

    // Componentes
    this.searchEngine = new WebSearchEngine(options.search);
    this.contentExtractor = new ContentExtractor(options.extractor);
    this.knowledgeProcessor = new KnowledgeProcessor(options.processor);
    this.memoryManager = new MemoryManager({
      dbPath: `${this.projectRoot}/memory/jarvis-memory.db`
    });

    // Configuración
    this.maxSearchResults = options.maxSearchResults || 5;
    this.autoLearn = options.autoLearn !== false; // Activado por defecto

    // Estadísticas
    this.stats = {
      totalSearches: 0,
      totalKnowledge: 0,
      totalConcepts: 0
    };

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * Inicializa el sistema
   */
  async initialize() {
    console.log('🚀 [Web Intelligence] Inicializando...');

    await this.memoryManager.initialize();

    console.log('✅ [Web Intelligence] Sistema listo');
    this.emit('ready');
  }

  /**
   * Busca y aprende sobre un tema
   */
  async learnAbout(query) {
    console.log(`🎓 [Web Intelligence] Aprendiendo sobre: "${query}"`);
    this.emit('learn:start', { query });

    this.stats.totalSearches++;

    try {
      // 1. Buscar en internet
      const searchResults = await this.searchEngine.search(query);

      if (searchResults.length === 0) {
        console.log('⚠️ [Web Intelligence] No se encontraron resultados');
        return {
          success: false,
          message: 'No se encontraron resultados',
          query
        };
      }

      console.log(`📊 [Web Intelligence] ${searchResults.length} resultados encontrados`);

      // 2. Seleccionar mejores resultados para extraer
      const topResults = searchResults.slice(0, this.maxSearchResults);
      const urls = topResults.map(r => r.url);

      // 3. Extraer contenido
      const contents = await this.contentExtractor.extractMultiple(urls);
      const successfulExtractions = contents.filter(c => !c.error);

      console.log(`📚 [Web Intelligence] ${successfulExtractions.length} contenidos extraídos`);

      if (successfulExtractions.length === 0) {
        return {
          success: false,
          message: 'No se pudo extraer contenido útil',
          query
        };
      }

      // 4. Procesar con IA
      const knowledgeItems = await this.knowledgeProcessor.processMultiple(successfulExtractions);

      // 5. Guardar en memoria permanente
      const savedKnowledge = [];
      for (const knowledge of knowledgeItems) {
        const memoryId = await this.saveToMemory(knowledge, query);
        savedKnowledge.push({ ...knowledge, memoryId });
        this.stats.totalKnowledge++;
        this.stats.totalConcepts += knowledge.concepts.length;
      }

      console.log(`💾 [Web Intelligence] ${savedKnowledge.length} conocimientos guardados en memoria permanente`);

      this.emit('learn:complete', {
        query,
        knowledgeCount: savedKnowledge.length,
        conceptsCount: this.stats.totalConcepts
      });

      // 6. Generar resumen
      const summary = this.generateSummary(savedKnowledge);

      return {
        success: true,
        query,
        knowledgeCount: savedKnowledge.length,
        knowledge: savedKnowledge,
        summary,
        stats: this.stats
      };

    } catch (error) {
      console.error(`❌ [Web Intelligence] Error: ${error.message}`);
      this.emit('learn:error', { query, error: error.message });

      return {
        success: false,
        message: error.message,
        query
      };
    }
  }

  /**
   * Responde una query usando conocimiento adquirido
   */
  async query(question) {
    console.log(`❓ [Web Intelligence] Query: "${question}"`);
    this.emit('query:start', { question });

    try {
      // 1. Buscar en memoria relacionada
      const memories = await this.memoryManager.recall(question, 10);

      if (memories.length === 0) {
        console.log('💭 [Web Intelligence] No hay conocimiento relevante. Aprendiendo...');
        // Auto-aprende si no sabe
        const learningResult = await this.learnAbout(question);
        if (learningResult.success) {
          return this.query(question); // Retry después de aprender
        }
        return {
          success: false,
          message: 'No pude encontrar información sobre eso',
          question
        };
      }

      // 2. Consolidar conocimiento
      const consolidatedKnowledge = this.consolidateKnowledge(memories);

      // 3. Generar respuesta
      const answer = await this.generateAnswer(question, consolidatedKnowledge);

      console.log(`✅ [Web Intelligence] Respuesta generada`);
      this.emit('query:complete', { question, sources: memories.length });

      return {
        success: true,
        question,
        answer,
        sources: memories.length,
        knowledge: consolidatedKnowledge
      };

    } catch (error) {
      console.error(`❌ [Web Intelligence] Error: ${error.message}`);
      this.emit('query:error', { question, error: error.message });

      return {
        success: false,
        message: error.message,
        question
      };
    }
  }

  /**
   * Guarda conocimiento en memoria permanente
   */
  async saveToMemory(knowledge, originalQuery) {
    const memoryEntry = {
      type: 'web-knowledge',
      content: {
        url: knowledge.url,
        title: knowledge.title,
        summary: knowledge.summary,
        concepts: knowledge.concepts,
        keyPoints: knowledge.keyPoints,
        useCases: knowledge.useCases,
        codeExamples: knowledge.codeExamples,
        entities: knowledge.entities
      },
      metadata: {
        query: originalQuery,
        source: knowledge.type,
        confidence: knowledge.confidence,
        learnedAt: knowledge.timestamp
      },
      importance: knowledge.confidence
    };

    return await this.memoryManager.store(memoryEntry);
  }

  /**
   * Consolida conocimiento de múltiples fuentes
   */
  consolidateKnowledge(memories) {
    const consolidated = {
      concepts: new Set(),
      keyPoints: [],
      useCases: [],
      codeExamples: [],
      sources: []
    };

    for (const memory of memories) {
      const content = memory.content;

      // Agregar conceptos únicos
      if (content.concepts) {
        content.concepts.forEach(c => consolidated.concepts.add(c));
      }

      // Agregar key points
      if (content.keyPoints) {
        consolidated.keyPoints.push(...content.keyPoints);
      }

      // Agregar use cases
      if (content.useCases) {
        consolidated.useCases.push(...content.useCases);
      }

      // Agregar ejemplos de código
      if (content.codeExamples) {
        consolidated.codeExamples.push(...content.codeExamples);
      }

      // Agregar fuente
      consolidated.sources.push({
        url: content.url,
        title: content.title,
        confidence: memory.metadata?.confidence || 0.5
      });
    }

    return {
      concepts: Array.from(consolidated.concepts),
      keyPoints: consolidated.keyPoints.slice(0, 10),
      useCases: consolidated.useCases.slice(0, 5),
      codeExamples: consolidated.codeExamples.slice(0, 5),
      sources: consolidated.sources
    };
  }

  /**
   * Genera respuesta usando Ollama
   */
  async generateAnswer(question, knowledge) {
    const prompt = `Basándote en el siguiente conocimiento, responde la pregunta de forma clara y concisa:

Pregunta: ${question}

Conocimiento disponible:
- Conceptos: ${knowledge.concepts.join(', ')}
- Puntos clave: ${knowledge.keyPoints.slice(0, 5).join('; ')}
- Casos de uso: ${knowledge.useCases.slice(0, 3).join('; ')}

Por favor proporciona una respuesta práctica y útil.`;

    try {
      const analysis = await this.knowledgeProcessor.analyzeWithOllama(prompt);
      return analysis.summary || analysis.response || knowledge.keyPoints.join('\n');
    } catch (error) {
      // Fallback: respuesta basada en key points
      return `Según lo que aprendí:\n\n${knowledge.keyPoints.slice(0, 5).join('\n\n')}`;
    }
  }

  /**
   * Genera resumen del conocimiento adquirido
   */
  generateSummary(knowledgeItems) {
    const totalConcepts = knowledgeItems.reduce((sum, k) => sum + k.concepts.length, 0);
    const totalKeyPoints = knowledgeItems.reduce((sum, k) => sum + k.keyPoints.length, 0);
    const sources = knowledgeItems.map(k => k.type);

    return {
      totalItems: knowledgeItems.length,
      totalConcepts,
      totalKeyPoints,
      sources: [...new Set(sources)],
      avgConfidence: (knowledgeItems.reduce((sum, k) => sum + k.confidence, 0) / knowledgeItems.length).toFixed(2)
    };
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      memoryStats: this.memoryManager.getStats()
    };
  }

  /**
   * Setup event forwarding
   */
  setupEventForwarding() {
    // Forward search events
    this.searchEngine.on('search:start', (data) => this.emit('search:start', data));
    this.searchEngine.on('search:complete', (data) => this.emit('search:complete', data));

    // Forward extraction events
    this.contentExtractor.on('extract:start', (data) => this.emit('extract:start', data));
    this.contentExtractor.on('extract:complete', (data) => this.emit('extract:complete', data));

    // Forward processing events
    this.knowledgeProcessor.on('process:start', (data) => this.emit('process:start', data));
    this.knowledgeProcessor.on('process:complete', (data) => this.emit('process:complete', data));
  }
}

module.exports = WebIntelligenceManager;

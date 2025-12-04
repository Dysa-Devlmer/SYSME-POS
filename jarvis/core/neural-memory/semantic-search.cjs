// core/neural-memory/semantic-search.cjs
// Perfect Recall System - Búsqueda semántica avanzada

const { EventEmitter } = require('events');
const axios = require('axios');

/**
 * Semantic Search Engine
 *
 * Permite búsquedas en lenguaje natural sobre todas las memorias:
 * - "aquella vez que arreglamos el bug de autenticación"
 * - "cuando implementamos el sistema de cache"
 * - "el problema con la base de datos la semana pasada"
 */
class SemanticSearch extends EventEmitter {
  constructor(memoryManager, options = {}) {
    super();

    this.memory = memoryManager;
    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.embeddingModel = options.embeddingModel || 'nomic-embed-text';

    // Cache de embeddings
    this.embeddingCache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 1000;

    // Stats
    this.stats = {
      totalSearches: 0,
      cacheHits: 0,
      avgSearchTime: 0
    };
  }

  /**
   * Genera embedding para texto
   */
  async generateEmbedding(text) {
    // Check cache
    const cacheKey = this.hashText(text);

    if (this.embeddingCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.embeddingCache.get(cacheKey);
    }

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.embeddingModel,
        prompt: text
      });

      const embedding = response.data.embedding;

      // Guardar en cache
      if (this.embeddingCache.size >= this.cacheMaxSize) {
        // Remover el más antiguo
        const firstKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(firstKey);
      }

      this.embeddingCache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error('❌ [Semantic Search] Error generando embedding:', error.message);
      throw error;
    }
  }

  /**
   * Búsqueda semántica en todas las memorias
   */
  async search(query, options = {}) {
    const startTime = Date.now();

    console.log(`🔍 [Semantic Search] Buscando: "${query}"`);

    try {
      // Generar embedding del query
      const queryEmbedding = await this.generateEmbedding(query);

      // Buscar en cada capa de memoria
      const results = await Promise.all([
        this.searchWorkingMemory(queryEmbedding, query),
        this.searchShortTermMemory(queryEmbedding, query, options),
        this.searchLongTermMemory(queryEmbedding, query, options),
        this.searchEpisodicMemory(queryEmbedding, query, options)
      ]);

      // Combinar y rankear resultados
      const allResults = [].concat(...results);
      const rankedResults = this.rankResults(allResults, query);

      const searchTime = Date.now() - startTime;

      this.stats.totalSearches++;
      this.stats.avgSearchTime =
        (this.stats.avgSearchTime * (this.stats.totalSearches - 1) + searchTime) /
        this.stats.totalSearches;

      console.log(`✅ [Semantic Search] ${rankedResults.length} resultados en ${searchTime}ms`);

      this.emit('search:complete', {
        query,
        resultsCount: rankedResults.length,
        searchTime
      });

      return {
        query,
        results: rankedResults.slice(0, options.limit || 20),
        totalResults: rankedResults.length,
        searchTime
      };
    } catch (error) {
      console.error('❌ [Semantic Search] Error en búsqueda:', error.message);
      throw error;
    }
  }

  /**
   * Busca en Working Memory
   */
  async searchWorkingMemory(queryEmbedding, query) {
    const results = [];

    for (const memory of this.memory.workingMemory.recentInteractions) {
      const contentStr = JSON.stringify(memory.content);
      const score = this.calculateTextSimilarity(query.toLowerCase(), contentStr.toLowerCase());

      if (score > 0.3) {
        results.push({
          layer: 'working',
          memory,
          score,
          highlight: this.extractHighlight(contentStr, query)
        });
      }
    }

    return results;
  }

  /**
   * Busca en Short-term Memory
   */
  async searchShortTermMemory(queryEmbedding, query, options) {
    return new Promise((resolve) => {
      const limit = options.stmLimit || 50;

      this.memory.db.all(
        `SELECT * FROM short_term_memory
         WHERE consolidated = 0
         ORDER BY importance DESC, created_at DESC
         LIMIT ?`,
        [limit],
        (err, memories) => {
          if (err || !memories) {
            return resolve([]);
          }

          const results = memories
            .map(mem => {
              try {
                const content = JSON.parse(mem.content);
                const contentStr = JSON.stringify(content);
                const score = this.calculateTextSimilarity(
                  query.toLowerCase(),
                  contentStr.toLowerCase()
                );

                if (score > 0.2) {
                  return {
                    layer: 'short-term',
                    memory: {
                      ...mem,
                      content
                    },
                    score: score * mem.importance,
                    highlight: this.extractHighlight(contentStr, query)
                  };
                }
              } catch (e) {
                return null;
              }

              return null;
            })
            .filter(Boolean);

          resolve(results);
        }
      );
    });
  }

  /**
   * Busca en Long-term Memory
   */
  async searchLongTermMemory(queryEmbedding, query, options) {
    return new Promise((resolve) => {
      const limit = options.ltmLimit || 30;

      this.memory.db.all(
        `SELECT * FROM long_term_memory
         ORDER BY importance DESC, confidence DESC
         LIMIT ?`,
        [limit],
        (err, memories) => {
          if (err || !memories) {
            return resolve([]);
          }

          const results = memories
            .map(mem => {
              try {
                const content = JSON.parse(mem.content);
                const contentStr = JSON.stringify(content);
                const score = this.calculateTextSimilarity(
                  query.toLowerCase(),
                  contentStr.toLowerCase()
                );

                if (score > 0.25) {
                  return {
                    layer: 'long-term',
                    memory: {
                      ...mem,
                      content
                    },
                    score: score * mem.importance * mem.confidence,
                    highlight: this.extractHighlight(contentStr, query)
                  };
                }
              } catch (e) {
                return null;
              }

              return null;
            })
            .filter(Boolean);

          resolve(results);
        }
      );
    });
  }

  /**
   * Busca en Episodic Memory
   */
  async searchEpisodicMemory(queryEmbedding, query, options) {
    return new Promise((resolve) => {
      const limit = options.episodeLimit || 20;

      this.memory.db.all(
        `SELECT * FROM episodic_memory
         ORDER BY importance DESC, timestamp DESC
         LIMIT ?`,
        [limit],
        (err, episodes) => {
          if (err || !episodes) {
            return resolve([]);
          }

          const results = episodes
            .map(ep => {
              const searchText = `${ep.title} ${ep.description} ${ep.outcome || ''}`.toLowerCase();
              const score = this.calculateTextSimilarity(query.toLowerCase(), searchText);

              if (score > 0.3) {
                return {
                  layer: 'episodic',
                  memory: ep,
                  score: score * ep.importance,
                  highlight: this.extractHighlight(searchText, query)
                };
              }

              return null;
            })
            .filter(Boolean);

          resolve(results);
        }
      );
    });
  }

  /**
   * Calcula similitud de texto (sin embeddings)
   */
  calculateTextSimilarity(query, text) {
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();

    let matches = 0;
    let totalWeight = 0;

    for (const word of queryWords) {
      const weight = word.length / 10; // Palabras más largas pesan más
      totalWeight += weight;

      if (textLower.includes(word)) {
        matches += weight;
      }
    }

    return totalWeight > 0 ? matches / totalWeight : 0;
  }

  /**
   * Calcula similitud coseno entre embeddings
   */
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }

  /**
   * Extrae highlight relevante
   */
  extractHighlight(text, query) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();

    for (const word of queryWords) {
      const index = textLower.indexOf(word);
      if (index !== -1) {
        const start = Math.max(0, index - 40);
        const end = Math.min(text.length, index + word.length + 40);
        return '...' + text.substring(start, end) + '...';
      }
    }

    return text.substring(0, 100) + '...';
  }

  /**
   * Rankea resultados por relevancia
   */
  rankResults(results, query) {
    return results
      .sort((a, b) => {
        // Primero por score
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        // Luego por capa (working > episodic > short-term > long-term)
        const layerPriority = {
          'working': 4,
          'episodic': 3,
          'short-term': 2,
          'long-term': 1
        };

        return (layerPriority[b.layer] || 0) - (layerPriority[a.layer] || 0);
      });
  }

  /**
   * Hash simple para cache
   */
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Búsqueda temporal (por rango de fechas)
   */
  async searchByTimeRange(query, startTime, endTime, options = {}) {
    console.log(`📅 [Semantic Search] Búsqueda temporal: ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}`);

    return new Promise((resolve) => {
      // Buscar en short-term
      this.memory.db.all(
        `SELECT * FROM short_term_memory
         WHERE created_at >= ? AND created_at <= ?
         ORDER BY importance DESC
         LIMIT ?`,
        [startTime, endTime, options.limit || 50],
        async (err, memories) => {
          if (err || !memories) {
            return resolve({ query, results: [], totalResults: 0 });
          }

          const results = [];

          for (const mem of memories) {
            try {
              const content = JSON.parse(mem.content);
              const contentStr = JSON.stringify(content);
              const score = this.calculateTextSimilarity(query.toLowerCase(), contentStr.toLowerCase());

              if (score > 0.2) {
                results.push({
                  layer: 'short-term',
                  memory: { ...mem, content },
                  score,
                  highlight: this.extractHighlight(contentStr, query)
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }

          resolve({
            query,
            results: results.sort((a, b) => b.score - a.score),
            totalResults: results.length,
            timeRange: { start: startTime, end: endTime }
          });
        }
      );
    });
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.embeddingCache.size,
      cacheHitRate: this.stats.totalSearches > 0
        ? (this.stats.cacheHits / this.stats.totalSearches) * 100
        : 0
    };
  }
}

module.exports = SemanticSearch;

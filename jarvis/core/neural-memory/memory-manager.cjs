// core/neural-memory/memory-manager.cjs
// Sistema de memoria neural multi-capa - El cerebro de JARVIS

const { EventEmitter } = require('events');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

/**
 * Neural Memory Manager
 *
 * Arquitectura de 4 capas inspirada en el cerebro humano:
 *
 * 1. Working Memory (RAM): Contexto inmediato de la conversación actual
 * 2. Short-term Memory: Sesión actual, eventos recientes (< 24h)
 * 3. Long-term Memory: Conocimiento consolidado, patrones aprendidos
 * 4. Episodic Memory: Experiencias completas con contexto emocional
 */
class NeuralMemoryManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.dbPath = options.dbPath || path.join(this.projectRoot, 'memory', 'neural-memory.db');
    this.db = null;

    // Working Memory (RAM) - Contexto inmediato
    this.workingMemory = {
      currentSession: null,
      activeContext: [],
      recentInteractions: [],
      temporaryFacts: new Map()
    };

    // Configuration
    this.config = {
      workingMemorySize: options.workingMemorySize || 10, // Últimas N interacciones
      shortTermRetention: options.shortTermRetention || 24 * 60 * 60 * 1000, // 24 horas
      consolidationThreshold: options.consolidationThreshold || 3, // Veces vista para consolidar
      semanticSimilarityThreshold: options.semanticSimilarityThreshold || 0.75
    };

    // Stats
    this.stats = {
      totalMemories: 0,
      workingMemorySize: 0,
      shortTermMemories: 0,
      longTermMemories: 0,
      episodicMemories: 0,
      consolidations: 0,
      recalls: 0,
      lastConsolidation: null
    };
  }

  /**
   * Inicializa el sistema de memoria neural
   */
  async initialize() {
    console.log('🧠 [Neural Memory] Inicializando sistema de memoria multi-capa...');

    await fs.ensureDir(path.dirname(this.dbPath));

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          console.error('❌ [Neural Memory] Error abriendo base de datos:', err.message);
          return reject(err);
        }

        console.log(`✅ [Neural Memory] Base de datos: ${this.dbPath}`);

        try {
          await this.createSchema();
          await this.loadStats();
          await this.startNewSession();

          // Iniciar consolidación automática
          this.startConsolidationLoop();

          console.log('✅ [Neural Memory] Sistema neural activo');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Crea el esquema de la base de datos
   */
  async createSchema() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Sesiones
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            duration INTEGER,
            interactions_count INTEGER DEFAULT 0,
            context TEXT,
            metadata TEXT
          )
        `);

        // Short-term Memory
        this.db.run(`
          CREATE TABLE IF NOT EXISTS short_term_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            memory_type TEXT NOT NULL,
            content TEXT NOT NULL,
            context TEXT,
            importance REAL DEFAULT 0.5,
            access_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            last_accessed INTEGER,
            consolidated BOOLEAN DEFAULT 0,
            metadata TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
          )
        `);

        // Long-term Memory (Conocimiento consolidado)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS long_term_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memory_type TEXT NOT NULL,
            content TEXT NOT NULL,
            summary TEXT,
            importance REAL NOT NULL,
            confidence REAL DEFAULT 0.5,
            access_count INTEGER DEFAULT 0,
            consolidation_count INTEGER DEFAULT 1,
            created_at INTEGER NOT NULL,
            last_accessed INTEGER,
            last_reinforced INTEGER,
            source_memories TEXT,
            tags TEXT,
            metadata TEXT
          )
        `);

        // Episodic Memory (Experiencias completas)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS episodic_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            outcome TEXT,
            emotional_valence REAL,
            success BOOLEAN,
            participants TEXT,
            context TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            duration INTEGER,
            importance REAL NOT NULL,
            lessons_learned TEXT,
            related_episodes TEXT,
            metadata TEXT
          )
        `);

        // User Profile (Preferencias, estilo, objetivos)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS user_profile (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            category TEXT NOT NULL,
            confidence REAL DEFAULT 0.5,
            updated_at INTEGER NOT NULL,
            metadata TEXT
          )
        `);

        // Memory Relations (Relaciones entre memorias)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS memory_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memory_type_a TEXT NOT NULL,
            memory_id_a INTEGER NOT NULL,
            memory_type_b TEXT NOT NULL,
            memory_id_b INTEGER NOT NULL,
            relation_type TEXT NOT NULL,
            strength REAL DEFAULT 0.5,
            created_at INTEGER NOT NULL,
            metadata TEXT
          )
        `);

        // Índices para búsqueda rápida
        this.db.run('CREATE INDEX IF NOT EXISTS idx_stm_session ON short_term_memory(session_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_stm_type ON short_term_memory(memory_type)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_stm_importance ON short_term_memory(importance DESC)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_ltm_type ON long_term_memory(memory_type)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_ltm_importance ON long_term_memory(importance DESC)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_episode_type ON episodic_memory(episode_type)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_episode_importance ON episodic_memory(importance DESC)');

        console.log('✅ [Neural Memory] Schema creado/verificado');
        resolve();
      });
    });
  }

  /**
   * Inicia nueva sesión
   */
  async startNewSession() {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sessions (id, started_at, context) VALUES (?, ?, ?)`,
        [sessionId, timestamp, JSON.stringify({ version: '1.0', mode: 'neural' })],
        (err) => {
          if (err) {
            console.error('❌ [Neural Memory] Error creando sesión:', err.message);
            return reject(err);
          }

          this.workingMemory.currentSession = sessionId;
          console.log(`🆕 [Neural Memory] Nueva sesión: ${sessionId}`);

          this.emit('session:started', { sessionId, timestamp });
          resolve(sessionId);
        }
      );
    });
  }

  /**
   * Almacena en Working Memory (RAM)
   */
  storeInWorkingMemory(interaction) {
    const memory = {
      id: `wm-${Date.now()}`,
      type: interaction.type || 'interaction',
      content: interaction.content,
      context: interaction.context || {},
      timestamp: Date.now(),
      importance: this.calculateImportance(interaction)
    };

    this.workingMemory.recentInteractions.push(memory);

    // Mantener solo las últimas N interacciones
    if (this.workingMemory.recentInteractions.length > this.config.workingMemorySize) {
      const removed = this.workingMemory.recentInteractions.shift();

      // Transferir a Short-term Memory
      this.transferToShortTerm(removed);
    }

    this.stats.workingMemorySize = this.workingMemory.recentInteractions.length;

    this.emit('memory:stored', {
      layer: 'working',
      memory
    });

    return memory;
  }

  /**
   * Transfiere de Working a Short-term Memory
   */
  async transferToShortTerm(workingMemory) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO short_term_memory (
          session_id, memory_type, content, context,
          importance, created_at, last_accessed, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          this.workingMemory.currentSession,
          workingMemory.type,
          JSON.stringify(workingMemory.content),
          JSON.stringify(workingMemory.context),
          workingMemory.importance,
          workingMemory.timestamp,
          workingMemory.timestamp,
          JSON.stringify({ source: 'working_memory' })
        ],
        function(err) {
          if (err) {
            console.error('❌ [Neural Memory] Error transfiriendo a STM:', err.message);
            return reject(err);
          }

          console.log(`📤 [Neural Memory] Transferido a STM (ID: ${this.lastID})`);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Almacena directamente en Short-term Memory
   */
  async storeInShortTerm(memory) {
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO short_term_memory (
          session_id, memory_type, content, context,
          importance, created_at, last_accessed, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          this.workingMemory.currentSession,
          memory.type,
          JSON.stringify(memory.content),
          JSON.stringify(memory.context || {}),
          memory.importance || 0.5,
          timestamp,
          timestamp,
          JSON.stringify(memory.metadata || {})
        ],
        function(err) {
          if (err) {
            console.error('❌ [Neural Memory] Error almacenando en STM:', err.message);
            return reject(err);
          }

          console.log(`💾 [Neural Memory] Almacenado en STM (ID: ${this.lastID})`);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Consolida memorias de Short-term a Long-term
   */
  async consolidateMemories() {
    console.log('🔄 [Neural Memory] Iniciando consolidación...');

    const threshold = Date.now() - this.config.shortTermRetention;

    return new Promise((resolve, reject) => {
      // Obtener memorias candidatas para consolidación
      this.db.all(
        `SELECT * FROM short_term_memory
         WHERE consolidated = 0
         AND (
           importance >= 0.7
           OR access_count >= ?
           OR created_at < ?
         )
         ORDER BY importance DESC, access_count DESC
         LIMIT 50`,
        [this.config.consolidationThreshold, threshold],
        async (err, memories) => {
          if (err) {
            console.error('❌ [Neural Memory] Error en consolidación:', err.message);
            return reject(err);
          }

          if (memories.length === 0) {
            console.log('ℹ️ [Neural Memory] Sin memorias para consolidar');
            return resolve(0);
          }

          console.log(`📚 [Neural Memory] Consolidando ${memories.length} memorias...`);

          let consolidated = 0;

          for (const memory of memories) {
            try {
              await this.consolidateToLongTerm(memory);
              consolidated++;
            } catch (error) {
              console.error(`❌ Error consolidando memoria ${memory.id}:`, error.message);
            }
          }

          this.stats.consolidations += consolidated;
          this.stats.lastConsolidation = Date.now();

          console.log(`✅ [Neural Memory] ${consolidated} memorias consolidadas`);

          this.emit('consolidation:complete', {
            count: consolidated,
            timestamp: Date.now()
          });

          resolve(consolidated);
        }
      );
    });
  }

  /**
   * Consolida una memoria específica a Long-term
   */
  async consolidateToLongTerm(shortTermMemory) {
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      // Verificar si ya existe memoria similar en LTM
      this.db.get(
        `SELECT * FROM long_term_memory
         WHERE memory_type = ?
         ORDER BY confidence DESC
         LIMIT 1`,
        [shortTermMemory.memory_type],
        (err, existing) => {
          if (err) {
            return reject(err);
          }

          if (existing) {
            // Reforzar memoria existente
            this.db.run(
              `UPDATE long_term_memory
               SET confidence = MIN(confidence + 0.1, 1.0),
                   access_count = access_count + ?,
                   consolidation_count = consolidation_count + 1,
                   last_reinforced = ?
               WHERE id = ?`,
              [shortTermMemory.access_count, timestamp, existing.id],
              (err) => {
                if (err) return reject(err);

                // Marcar STM como consolidada
                this.markAsConsolidated(shortTermMemory.id);

                console.log(`🔗 [Neural Memory] Memoria reforzada en LTM (ID: ${existing.id})`);
                resolve(existing.id);
              }
            );
          } else {
            // Crear nueva memoria en LTM
            this.db.run(
              `INSERT INTO long_term_memory (
                memory_type, content, importance, confidence,
                access_count, created_at, last_accessed, last_reinforced,
                source_memories, metadata
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                shortTermMemory.memory_type,
                shortTermMemory.content,
                shortTermMemory.importance,
                0.6, // Confianza inicial
                shortTermMemory.access_count,
                timestamp,
                timestamp,
                timestamp,
                JSON.stringify([shortTermMemory.id]),
                shortTermMemory.metadata
              ],
              function(err) {
                if (err) return reject(err);

                // Marcar STM como consolidada
                this.markAsConsolidated(shortTermMemory.id);

                console.log(`✨ [Neural Memory] Nueva memoria en LTM (ID: ${this.lastID})`);
                resolve(this.lastID);
              }
            );
          }
        }
      );
    });
  }

  /**
   * Marca memoria de STM como consolidada
   */
  markAsConsolidated(memoryId) {
    this.db.run(
      'UPDATE short_term_memory SET consolidated = 1 WHERE id = ?',
      [memoryId],
      (err) => {
        if (err) {
          console.error('❌ Error marcando como consolidada:', err.message);
        }
      }
    );
  }

  /**
   * Almacena episodio completo
   */
  async storeEpisode(episode) {
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO episodic_memory (
          episode_type, title, description, outcome,
          emotional_valence, success, participants, context,
          timestamp, duration, importance, lessons_learned,
          related_episodes, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          episode.type,
          episode.title,
          episode.description,
          episode.outcome || null,
          episode.emotionalValence || 0,
          episode.success ? 1 : 0,
          JSON.stringify(episode.participants || []),
          JSON.stringify(episode.context),
          timestamp,
          episode.duration || null,
          episode.importance || 0.7,
          JSON.stringify(episode.lessonsLearned || []),
          JSON.stringify(episode.relatedEpisodes || []),
          JSON.stringify(episode.metadata || {})
        ],
        function(err) {
          if (err) {
            console.error('❌ [Neural Memory] Error almacenando episodio:', err.message);
            return reject(err);
          }

          console.log(`🎬 [Neural Memory] Episodio almacenado (ID: ${this.lastID})`);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Calcula importancia de una interacción
   */
  calculateImportance(interaction) {
    let importance = 0.5; // Base

    // Factores que aumentan importancia
    if (interaction.type === 'error' || interaction.type === 'bug') importance += 0.3;
    if (interaction.type === 'success') importance += 0.2;
    if (interaction.context?.userExplicit) importance += 0.2;
    if (interaction.content?.length > 500) importance += 0.1;

    return Math.min(importance, 1.0);
  }

  /**
   * Inicia loop de consolidación automática
   */
  startConsolidationLoop() {
    // Consolidar cada 5 minutos
    setInterval(() => {
      this.consolidateMemories().catch(err => {
        console.error('❌ [Neural Memory] Error en consolidación automática:', err.message);
      });
    }, 5 * 60 * 1000);

    console.log('🔄 [Neural Memory] Loop de consolidación iniciado (cada 5 min)');
  }

  /**
   * Carga estadísticas
   */
  async loadStats() {
    return new Promise((resolve) => {
      this.db.serialize(() => {
        this.db.get('SELECT COUNT(*) as count FROM short_term_memory WHERE consolidated = 0', (err, row) => {
          if (!err && row) this.stats.shortTermMemories = row.count;
        });

        this.db.get('SELECT COUNT(*) as count FROM long_term_memory', (err, row) => {
          if (!err && row) this.stats.longTermMemories = row.count;
        });

        this.db.get('SELECT COUNT(*) as count FROM episodic_memory', (err, row) => {
          if (!err && row) {
            this.stats.episodicMemories = row.count;
            this.stats.totalMemories =
              this.stats.shortTermMemories +
              this.stats.longTermMemories +
              this.stats.episodicMemories;
          }

          console.log(`📊 [Neural Memory] Stats cargadas: ${this.stats.totalMemories} memorias totales`);
          resolve();
        });
      });
    });
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      workingMemorySize: this.workingMemory.recentInteractions.length
    };
  }

  /**
   * Cierra la base de datos
   */
  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ [Neural Memory] Error cerrando base de datos:', err.message);
          } else {
            console.log('✅ [Neural Memory] Base de datos cerrada');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = NeuralMemoryManager;

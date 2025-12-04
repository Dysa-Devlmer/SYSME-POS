/**
 * JARVIS Mark VII v2.1.0 - Memory Manager
 * Sistema de memoria neural de 3 niveles
 *
 * Niveles:
 * 1. Working Memory (RAM) - Contexto inmediato
 * 2. Long-term Memory (SQLite) - Conocimiento consolidado
 * 3. Episodic Memory (SQLite) - Experiencias completas
 *
 * @module MemoryManager
 * @version 2.1.0
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class MemoryManager {
  constructor(config = {}) {
    this.config = {
      memoryPath: config.memoryPath || path.join(process.cwd(), 'memory'),
      dbName: config.dbName || 'jarvis-memory.db',
      workingMemoryLimit: config.workingMemoryLimit || 100, // Últimas N interacciones
      consolidationInterval: config.consolidationInterval || 3600000, // 1 hora
      ...config
    };

    this.db = null;
    this.workingMemory = []; // RAM
    this.consolidationTimer = null;
    this.initialized = false;
  }

  /**
   * Inicializa el sistema de memoria
   */
  async initialize() {
    try {
      console.log('🧠 Inicializando Memory Manager...');

      // Crear directorio de memoria si no existe
      if (!fs.existsSync(this.config.memoryPath)) {
        fs.mkdirSync(this.config.memoryPath, { recursive: true });
      }

      // Conectar a base de datos
      await this.connectDatabase();

      // Crear tablas
      await this.createTables();

      // Iniciar consolidación automática
      this.startConsolidation();

      this.initialized = true;
      console.log('✅ Memory Manager inicializado');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando Memory Manager:', error);
      throw error;
    }
  }

  /**
   * Conecta a la base de datos SQLite
   */
  connectDatabase() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(this.config.memoryPath, this.config.dbName);

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`📊 Base de datos conectada: ${dbPath}`);
          resolve();
        }
      });
    });
  }

  /**
   * Crea las tablas de memoria
   */
  async createTables() {
    const tables = [
      // Tabla de sesiones
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration INTEGER,
        interactions INTEGER DEFAULT 0,
        context TEXT,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Tabla de memoria a corto plazo
      `CREATE TABLE IF NOT EXISTS short_term_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        memory_type TEXT NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        importance REAL DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        last_accessed INTEGER DEFAULT (strftime('%s', 'now')),
        consolidated INTEGER DEFAULT 0,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`,

      // Tabla de memoria a largo plazo
      `CREATE TABLE IF NOT EXISTS long_term_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_type TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        importance REAL DEFAULT 0.5,
        confidence REAL DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        consolidation_date INTEGER DEFAULT (strftime('%s', 'now')),
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        last_accessed INTEGER DEFAULT (strftime('%s', 'now')),
        source_memories TEXT,
        tags TEXT,
        metadata TEXT
      )`,

      // Tabla de memoria episódica
      `CREATE TABLE IF NOT EXISTS episodic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        episode_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        outcome TEXT,
        emotional_value REAL DEFAULT 0.5,
        success INTEGER DEFAULT 1,
        participants TEXT,
        context TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        duration INTEGER,
        importance REAL DEFAULT 0.5,
        lessons TEXT,
        related_episodes TEXT,
        metadata TEXT
      )`,

      // Tabla de relaciones entre memorias
      `CREATE TABLE IF NOT EXISTS memory_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_type_a TEXT NOT NULL,
        memory_id_a INTEGER NOT NULL,
        memory_type_b TEXT NOT NULL,
        memory_id_b INTEGER NOT NULL,
        relation_type TEXT NOT NULL,
        strength REAL DEFAULT 0.5,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        metadata TEXT
      )`,

      // Tabla de perfil de usuario
      `CREATE TABLE IF NOT EXISTS user_profile (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT,
        confidence REAL DEFAULT 0.5,
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        metadata TEXT
      )`
    ];

    for (const sql of tables) {
      await this.runQuery(sql);
    }

    // Crear índices
    await this.createIndexes();

    console.log('✅ Tablas de memoria creadas');
  }

  /**
   * Crea índices para optimizar consultas
   */
  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_stm_session ON short_term_memory(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_stm_type ON short_term_memory(memory_type)',
      'CREATE INDEX IF NOT EXISTS idx_stm_importance ON short_term_memory(importance)',
      'CREATE INDEX IF NOT EXISTS idx_ltm_type ON long_term_memory(memory_type)',
      'CREATE INDEX IF NOT EXISTS idx_ltm_importance ON long_term_memory(importance)',
      'CREATE INDEX IF NOT EXISTS idx_em_type ON episodic_memory(episode_type)',
      'CREATE INDEX IF NOT EXISTS idx_em_timestamp ON episodic_memory(timestamp)'
    ];

    for (const sql of indexes) {
      await this.runQuery(sql);
    }
  }

  /**
   * Ejecuta una query SQL
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Ejecuta una query SELECT
   */
  queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Almacena en Working Memory (RAM)
   */
  async storeInWorkingMemory(data) {
    const memory = {
      id: Date.now(),
      timestamp: Date.now(),
      type: data.type || 'interaction',
      content: data.content,
      context: data.context || {},
      importance: data.importance || 0.5,
      metadata: data.metadata || {}
    };

    this.workingMemory.push(memory);

    // Limitar tamaño de working memory
    if (this.workingMemory.length > this.config.workingMemoryLimit) {
      const overflow = this.workingMemory.shift();
      // Mover overflow a short-term memory
      await this.storeInShortTermMemory(overflow);
    }

    return memory;
  }

  /**
   * Almacena en Short-term Memory (SQLite)
   */
  async storeInShortTermMemory(data) {
    const sql = `
      INSERT INTO short_term_memory
      (session_id, memory_type, content, context, importance, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.sessionId || 'default',
      data.type || 'general',
      typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
      JSON.stringify(data.context || {}),
      data.importance || 0.5,
      JSON.stringify(data.metadata || {})
    ];

    const result = await this.runQuery(sql, params);
    return { id: result.lastID, ...data };
  }

  /**
   * Almacena en Long-term Memory (SQLite)
   */
  async storeInLongTermMemory(data) {
    const sql = `
      INSERT INTO long_term_memory
      (memory_type, content, summary, importance, confidence, tags, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.type || 'knowledge',
      typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
      data.summary || null,
      data.importance || 0.5,
      data.confidence || 0.5,
      JSON.stringify(data.tags || []),
      JSON.stringify(data.metadata || {})
    ];

    const result = await this.runQuery(sql, params);
    return { id: result.lastID, ...data };
  }

  /**
   * Almacena episodio en Episodic Memory
   */
  async storeEpisode(episode) {
    const sql = `
      INSERT INTO episodic_memory
      (episode_type, title, description, outcome, emotional_value, success,
       participants, context, duration, importance, lessons, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      episode.type || 'interaction',
      episode.title,
      episode.description || null,
      episode.outcome || null,
      episode.emotionalValue || 0.5,
      episode.success ? 1 : 0,
      JSON.stringify(episode.participants || []),
      JSON.stringify(episode.context || {}),
      episode.duration || null,
      episode.importance || 0.5,
      JSON.stringify(episode.lessons || []),
      JSON.stringify(episode.metadata || {})
    ];

    const result = await this.runQuery(sql, params);
    return { id: result.lastID, ...episode };
  }

  /**
   * Recupera de Working Memory
   */
  getWorkingMemory(limit = null) {
    const memories = limit
      ? this.workingMemory.slice(-limit)
      : [...this.workingMemory];

    return memories;
  }

  /**
   * Busca en Long-term Memory
   */
  async searchLongTermMemory(query) {
    const sql = `
      SELECT * FROM long_term_memory
      WHERE content LIKE ? OR summary LIKE ?
      ORDER BY importance DESC, confidence DESC
      LIMIT 10
    `;

    const searchTerm = `%${query}%`;
    const results = await this.queryAll(sql, [searchTerm, searchTerm]);

    return results.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      tags: row.tags ? JSON.parse(row.tags) : []
    }));
  }

  /**
   * Consolida memorias (de corto a largo plazo)
   */
  async consolidateMemories() {
    try {
      console.log('🔄 Consolidando memorias...');

      // Obtener memorias de corto plazo importantes no consolidadas
      const sql = `
        SELECT * FROM short_term_memory
        WHERE consolidated = 0 AND importance >= 0.7
        ORDER BY importance DESC, access_count DESC
        LIMIT 50
      `;

      const memories = await this.queryAll(sql);

      for (const memory of memories) {
        // Consolidar a largo plazo
        await this.storeInLongTermMemory({
          type: memory.memory_type,
          content: memory.content,
          summary: this.generateSummary(memory.content),
          importance: memory.importance,
          confidence: 0.8,
          metadata: {
            source: 'short_term',
            original_id: memory.id
          }
        });

        // Marcar como consolidada
        await this.runQuery(
          'UPDATE short_term_memory SET consolidated = 1 WHERE id = ?',
          [memory.id]
        );
      }

      console.log(`✅ ${memories.length} memorias consolidadas`);
      return memories.length;
    } catch (error) {
      console.error('❌ Error consolidando memorias:', error);
      return 0;
    }
  }

  /**
   * Genera resumen de contenido
   */
  generateSummary(content) {
    if (typeof content !== 'string') {
      content = JSON.stringify(content);
    }

    // Resumen simple: primeras 200 caracteres
    return content.length > 200
      ? content.substring(0, 200) + '...'
      : content;
  }

  /**
   * Inicia consolidación automática
   */
  startConsolidation() {
    this.consolidationTimer = setInterval(() => {
      this.consolidateMemories();
    }, this.config.consolidationInterval);

    console.log(`⏱️  Consolidación automática cada ${this.config.consolidationInterval / 1000}s`);
  }

  /**
   * Obtiene estadísticas de memoria
   */
  async getStats() {
    const stats = {
      workingMemory: {
        count: this.workingMemory.length,
        limit: this.config.workingMemoryLimit
      },
      shortTermMemory: await this.queryAll('SELECT COUNT(*) as count FROM short_term_memory'),
      longTermMemory: await this.queryAll('SELECT COUNT(*) as count FROM long_term_memory'),
      episodicMemory: await this.queryAll('SELECT COUNT(*) as count FROM episodic_memory')
    };

    return {
      working: stats.workingMemory.count,
      shortTerm: stats.shortTermMemory[0].count,
      longTerm: stats.longTermMemory[0].count,
      episodic: stats.episodicMemory[0].count,
      total: stats.workingMemory.count +
             stats.shortTermMemory[0].count +
             stats.longTermMemory[0].count +
             stats.episodicMemory[0].count
    };
  }

  /**
   * Limpieza y cierre
   */
  async cleanup() {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
    }

    if (this.db) {
      return new Promise((resolve) => {
        this.db.close(() => {
          console.log('✅ Memory Manager cerrado');
          resolve();
        });
      });
    }
  }
}

module.exports = MemoryManager;

// core/metrics-persistence.cjs
// Sistema de persistencia de métricas y sesiones del Autonomous Agent

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class MetricsPersistence {
  constructor(dbPath = null) {
    // Usar ruta por defecto si no se proporciona
    this.dbPath = dbPath || path.join(__dirname, '..', 'memory', 'metrics.db');

    // Asegurar que el directorio existe
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = null;
    this.initialized = false;
  }

  /**
   * Inicializa la base de datos y crea las tablas necesarias
   */
  initialize() {
    if (this.initialized) return;

    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');

      // Crear tablas
      this.createTables();

      this.initialized = true;
      console.log('✅ Metrics Persistence inicializado:', this.dbPath);
    } catch (error) {
      console.error('❌ Error al inicializar Metrics Persistence:', error);
      throw error;
    }
  }

  /**
   * Crea las tablas necesarias en la base de datos
   */
  createTables() {
    // Tabla de sesiones autónomas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        task TEXT NOT NULL,
        state TEXT NOT NULL,
        duration INTEGER,
        total_subtasks INTEGER DEFAULT 0,
        successful_subtasks INTEGER DEFAULT 0,
        failed_subtasks INTEGER DEFAULT 0,
        corrected_subtasks INTEGER DEFAULT 0,
        skipped_subtasks INTEGER DEFAULT 0,
        average_score REAL DEFAULT 0,
        overall_complexity TEXT,
        estimated_time INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Índice para búsqueda por timestamp
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_timestamp
      ON sessions(timestamp DESC)
    `);

    // Tabla de sub-tareas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        complexity TEXT,
        estimated_time INTEGER,
        dependencies TEXT,
        success INTEGER DEFAULT 0,
        score REAL DEFAULT 0,
        error_message TEXT,
        execution_order INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Índice para búsqueda por sesión
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subtasks_session
      ON subtasks(session_id)
    `);

    // Tabla de métricas globales (snapshot diario)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        total_sessions INTEGER DEFAULT 0,
        successful_sessions INTEGER DEFAULT 0,
        average_score REAL DEFAULT 0,
        total_subtasks INTEGER DEFAULT 0,
        web_searches INTEGER DEFAULT 0,
        knowledge_acquired INTEGER DEFAULT 0,
        concepts_extracted INTEGER DEFAULT 0,
        total_memories INTEGER DEFAULT 0,
        short_term_memories INTEGER DEFAULT 0,
        long_term_memories INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Índice para búsqueda por fecha
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_daily_metrics_date
      ON daily_metrics(date DESC)
    `);

    // Tabla de logs importantes (para auditoría)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS important_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Índice para búsqueda de logs
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp
      ON important_logs(timestamp DESC)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_logs_level
      ON important_logs(level)
    `);
  }

  /**
   * Guarda una nueva sesión autónoma
   * @param {Object} sessionData - Datos de la sesión
   * @returns {boolean} - Éxito de la operación
   */
  saveSession(sessionData) {
    if (!this.initialized) this.initialize();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (
          id, timestamp, task, state, duration,
          total_subtasks, successful_subtasks, failed_subtasks,
          corrected_subtasks, skipped_subtasks, average_score,
          overall_complexity, estimated_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const plan = sessionData.plan || {};
      const summary = sessionData.summary || {};

      stmt.run(
        sessionData.id || Date.now().toString(),
        sessionData.timestamp || Date.now(),
        sessionData.task || 'Unknown Task',
        sessionData.state || 'completed',
        sessionData.duration || 0,
        summary.total || 0,
        summary.successful || 0,
        summary.failed || 0,
        summary.corrected || 0,
        summary.skipped || 0,
        summary.averageScore || 0,
        plan.estimation?.overallComplexity || 'unknown',
        plan.estimation?.estimatedTimeMinutes || 0
      );

      // Guardar sub-tareas si existen
      if (plan.subtasks && Array.isArray(plan.subtasks)) {
        this.saveSubtasks(sessionData.id, plan.subtasks, sessionData.results || []);
      }

      return true;
    } catch (error) {
      console.error('❌ Error al guardar sesión:', error);
      return false;
    }
  }

  /**
   * Guarda las sub-tareas de una sesión
   * @param {string} sessionId - ID de la sesión
   * @param {Array} subtasks - Array de sub-tareas
   * @param {Array} results - Array de resultados
   */
  saveSubtasks(sessionId, subtasks, results) {
    const stmt = this.db.prepare(`
      INSERT INTO subtasks (
        id, session_id, title, description, type,
        complexity, estimated_time, dependencies,
        success, score, error_message, execution_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saveMany = this.db.transaction((tasks) => {
      for (let i = 0; i < tasks.length; i++) {
        const subtask = tasks[i];
        const result = results.find(r => r.subtask === subtask.id) || {};

        // Usar ID compuesto: sessionId + subtaskId para evitar colisiones
        const compositeId = `${sessionId}_${subtask.id}`;

        stmt.run(
          compositeId,
          sessionId,
          subtask.title || 'Unknown',
          subtask.description || '',
          subtask.type || 'unknown',
          subtask.complexity || 'medium',
          subtask.estimatedTime || 0,
          JSON.stringify(subtask.dependencies || []),
          result.success ? 1 : 0,
          result.score || 0,
          result.error || '',
          i
        );
      }
    });

    saveMany(subtasks);
  }

  /**
   * Obtiene el historial completo de sesiones
   * @param {Object} options - Opciones de filtrado
   * @returns {Array} - Array de sesiones
   */
  getSessionHistory(options = {}) {
    if (!this.initialized) this.initialize();

    try {
      const {
        limit = 100,
        offset = 0,
        state = null,
        minScore = null,
        fromDate = null,
        toDate = null
      } = options;

      let query = 'SELECT * FROM sessions WHERE 1=1';
      const params = [];

      if (state) {
        query += ' AND state = ?';
        params.push(state);
      }

      if (minScore !== null) {
        query += ' AND average_score >= ?';
        params.push(minScore);
      }

      if (fromDate) {
        query += ' AND timestamp >= ?';
        params.push(fromDate);
      }

      if (toDate) {
        query += ' AND timestamp <= ?';
        params.push(toDate);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const sessions = stmt.all(...params);

      // Cargar sub-tareas para cada sesión
      return sessions.map(session => this.enrichSession(session));
    } catch (error) {
      console.error('❌ Error al obtener historial:', error);
      return [];
    }
  }

  /**
   * Enriquece una sesión con sus sub-tareas
   * @param {Object} session - Sesión base
   * @returns {Object} - Sesión enriquecida
   */
  enrichSession(session) {
    const subtasks = this.getSubtasksBySession(session.id);

    return {
      id: session.id,
      timestamp: session.timestamp,
      content: {
        task: session.task,
        plan: {
          subtasks: subtasks.map(st => ({
            id: st.id,
            title: st.title,
            description: st.description,
            type: st.type,
            complexity: st.complexity,
            estimatedTime: st.estimated_time,
            dependencies: JSON.parse(st.dependencies || '[]')
          })),
          estimation: {
            overallComplexity: session.overall_complexity,
            estimatedTimeMinutes: session.estimated_time
          }
        },
        summary: {
          total: session.total_subtasks,
          successful: session.successful_subtasks,
          failed: session.failed_subtasks,
          corrected: session.corrected_subtasks,
          skipped: session.skipped_subtasks,
          averageScore: session.average_score
        },
        results: subtasks.map(st => ({
          subtask: st.id,
          success: st.success === 1,
          score: st.score,
          error: st.error_message
        })),
        duration: session.duration
      }
    };
  }

  /**
   * Obtiene las sub-tareas de una sesión específica
   * @param {string} sessionId - ID de la sesión
   * @returns {Array} - Array de sub-tareas
   */
  getSubtasksBySession(sessionId) {
    const stmt = this.db.prepare(`
      SELECT * FROM subtasks
      WHERE session_id = ?
      ORDER BY execution_order ASC
    `);

    return stmt.all(sessionId);
  }

  /**
   * Obtiene una sesión específica por ID
   * @param {string} sessionId - ID de la sesión
   * @returns {Object|null} - Sesión o null si no existe
   */
  getSession(sessionId) {
    if (!this.initialized) this.initialize();

    try {
      const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
      const session = stmt.get(sessionId);

      return session ? this.enrichSession(session) : null;
    } catch (error) {
      console.error('❌ Error al obtener sesión:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas globales
   * @returns {Object} - Estadísticas
   */
  getGlobalStats() {
    if (!this.initialized) this.initialize();

    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_sessions,
          SUM(CASE WHEN state = 'completed' AND failed_subtasks = 0 THEN 1 ELSE 0 END) as successful_sessions,
          AVG(average_score) as average_score,
          SUM(total_subtasks) as total_subtasks,
          SUM(successful_subtasks) as successful_subtasks
        FROM sessions
      `;

      const stats = this.db.prepare(statsQuery).get();

      return {
        totalSessions: stats.total_sessions || 0,
        successfulSessions: stats.successful_sessions || 0,
        averageScore: Math.round(stats.average_score || 0),
        totalSubtasksCompleted: stats.successful_subtasks || 0
      };
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      return {
        totalSessions: 0,
        successfulSessions: 0,
        averageScore: 0,
        totalSubtasksCompleted: 0
      };
    }
  }

  /**
   * Guarda métricas diarias
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @param {Object} metrics - Métricas del día
   */
  saveDailyMetrics(date, metrics) {
    if (!this.initialized) this.initialize();

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO daily_metrics (
          date, total_sessions, successful_sessions, average_score,
          total_subtasks, web_searches, knowledge_acquired,
          concepts_extracted, total_memories, short_term_memories,
          long_term_memories
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        date,
        metrics.totalSessions || 0,
        metrics.successfulSessions || 0,
        metrics.averageScore || 0,
        metrics.totalSubtasks || 0,
        metrics.webSearches || 0,
        metrics.knowledgeAcquired || 0,
        metrics.conceptsExtracted || 0,
        metrics.totalMemories || 0,
        metrics.shortTermMemories || 0,
        metrics.longTermMemories || 0
      );

      return true;
    } catch (error) {
      console.error('❌ Error al guardar métricas diarias:', error);
      return false;
    }
  }

  /**
   * Obtiene métricas diarias en un rango de fechas
   * @param {string} fromDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} toDate - Fecha fin (YYYY-MM-DD)
   * @returns {Array} - Array de métricas diarias
   */
  getDailyMetrics(fromDate, toDate) {
    if (!this.initialized) this.initialize();

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM daily_metrics
        WHERE date BETWEEN ? AND ?
        ORDER BY date ASC
      `);

      return stmt.all(fromDate, toDate);
    } catch (error) {
      console.error('❌ Error al obtener métricas diarias:', error);
      return [];
    }
  }

  /**
   * Guarda un log importante
   * @param {string} level - Nivel del log (info, warning, error, success)
   * @param {string} category - Categoría (task, plan, execution, etc.)
   * @param {string} message - Mensaje
   * @param {Object} metadata - Datos adicionales
   */
  saveLog(level, category, message, metadata = {}) {
    if (!this.initialized) this.initialize();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO important_logs (timestamp, level, category, message, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        Date.now(),
        level,
        category,
        message,
        JSON.stringify(metadata)
      );

      return true;
    } catch (error) {
      console.error('❌ Error al guardar log:', error);
      return false;
    }
  }

  /**
   * Obtiene logs con filtros
   * @param {Object} options - Opciones de filtrado
   * @returns {Array} - Array de logs
   */
  getLogs(options = {}) {
    if (!this.initialized) this.initialize();

    try {
      const {
        limit = 100,
        offset = 0,
        level = null,
        category = null,
        fromTimestamp = null,
        toTimestamp = null
      } = options;

      let query = 'SELECT * FROM important_logs WHERE 1=1';
      const params = [];

      if (level) {
        query += ' AND level = ?';
        params.push(level);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (fromTimestamp) {
        query += ' AND timestamp >= ?';
        params.push(fromTimestamp);
      }

      if (toTimestamp) {
        query += ' AND timestamp <= ?';
        params.push(toTimestamp);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const logs = stmt.all(...params);

      return logs.map(log => ({
        ...log,
        metadata: JSON.parse(log.metadata || '{}')
      }));
    } catch (error) {
      console.error('❌ Error al obtener logs:', error);
      return [];
    }
  }

  /**
   * Limpia datos antiguos según políticas de retención
   * @param {Object} retention - Políticas de retención en días
   */
  cleanOldData(retention = {}) {
    if (!this.initialized) this.initialize();

    const {
      sessions = 90,      // 90 días por defecto
      logs = 30,          // 30 días por defecto
      dailyMetrics = 365  // 1 año por defecto
    } = retention;

    try {
      const now = Date.now();

      // Limpiar sesiones antiguas
      const sessionsCutoff = now - (sessions * 24 * 60 * 60 * 1000);
      this.db.prepare('DELETE FROM sessions WHERE timestamp < ?').run(sessionsCutoff);

      // Limpiar logs antiguos
      const logsCutoff = now - (logs * 24 * 60 * 60 * 1000);
      this.db.prepare('DELETE FROM important_logs WHERE timestamp < ?').run(logsCutoff);

      // Limpiar métricas diarias antiguas
      const metricsDate = new Date(now - (dailyMetrics * 24 * 60 * 60 * 1000))
        .toISOString().split('T')[0];
      this.db.prepare('DELETE FROM daily_metrics WHERE date < ?').run(metricsDate);

      // Vacuum para recuperar espacio
      this.db.exec('VACUUM');

      console.log('✅ Limpieza de datos antiguos completada');
      return true;
    } catch (error) {
      console.error('❌ Error al limpiar datos antiguos:', error);
      return false;
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  close() {
    if (this.db) {
      this.db.close();
      this.initialized = false;
      console.log('✅ Metrics Persistence cerrado');
    }
  }
}

module.exports = MetricsPersistence;

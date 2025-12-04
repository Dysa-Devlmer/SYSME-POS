// core/memory-advanced.js
// Sistema de Memoria Avanzada - Como el JARVIS real de Tony Stark
// Guarda conversaciones, aprende, recuerda todo

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

class MemoryAdvanced {
  constructor() {
    this.db = null;
    this.memoryPath = './memory';
    this.conversationBuffer = [];
    this.emotionalMemory = {
      significantMoments: [],
      userPreferences: {},
      projectsWorkedOn: [],
      problemsSolved: []
    };
  }

  async initialize() {
    // Crear directorio si no existe
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }

    // Inicializar BD
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(
        path.join(this.memoryPath, 'jarvis-memory-complete.db'),
        (err) => {
          if (err) reject(err);
          else {
            this.createAdvancedTables();
            resolve();
          }
        }
      );
    });
  }

  createAdvancedTables() {
    // Tabla de conversaciones completas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_message TEXT,
        jarvis_response TEXT,
        context TEXT,
        importance_level INTEGER,
        tags TEXT
      )
    `);

    // Tabla de memoria emocional
    this.db.run(`
      CREATE TABLE IF NOT EXISTS emotional_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        moment_type TEXT,
        description TEXT,
        emotional_weight REAL,
        related_conversation_id INTEGER,
        metadata TEXT
      )
    `);

    // Tabla de aprendizaje (mejorada)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS learning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        pattern_type TEXT,
        pattern_description TEXT,
        solution TEXT,
        success_rate REAL,
        times_used INTEGER DEFAULT 0,
        last_used DATETIME,
        confidence REAL
      )
    `);

    // Tabla de proyectos trabajados
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT,
        started_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_worked DATETIME,
        status TEXT,
        description TEXT,
        technologies TEXT,
        notes TEXT
      )
    `);

    // Tabla de preferencias del usuario
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        preference_key TEXT UNIQUE,
        preference_value TEXT,
        learned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        confidence REAL,
        times_observed INTEGER DEFAULT 1
      )
    `);

    // Tabla de relaciones (qué conversaciones están relacionadas)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversation_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id_1 INTEGER,
        conversation_id_2 INTEGER,
        relationship_type TEXT,
        strength REAL
      )
    `);

    // Tabla de sesiones
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        total_messages INTEGER,
        summary TEXT,
        achievements TEXT
      )
    `);
  }

  // ==========================================
  // GUARDAR CONVERSACIONES
  // ==========================================

  async saveConversation(data) {
    const {
      sessionId,
      userMessage,
      jarvisResponse,
      context = '',
      importanceLevel = 5,
      tags = []
    } = data;

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO conversations
        (session_id, user_message, jarvis_response, context, importance_level, tags)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userMessage,
          jarvisResponse,
          context,
          importanceLevel,
          JSON.stringify(tags)
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // ==========================================
  // MEMORIA EMOCIONAL
  // ==========================================

  async saveEmotionalMoment(data) {
    const {
      momentType,
      description,
      emotionalWeight = 0.5,
      relatedConversationId = null,
      metadata = {}
    } = data;

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO emotional_memory
        (moment_type, description, emotional_weight, related_conversation_id, metadata)
        VALUES (?, ?, ?, ?, ?)`,
        [
          momentType,
          description,
          emotionalWeight,
          relatedConversationId,
          JSON.stringify(metadata)
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // ==========================================
  // APRENDIZAJE
  // ==========================================

  async savePattern(data) {
    const {
      patternType,
      patternDescription,
      solution,
      successRate = 1.0,
      confidence = 0.8
    } = data;

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO learning
        (pattern_type, pattern_description, solution, success_rate, confidence, times_used, last_used)
        VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
        [patternType, patternDescription, solution, successRate, confidence],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async incrementPatternUsage(patternId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE learning
        SET times_used = times_used + 1,
            last_used = datetime('now')
        WHERE id = ?`,
        [patternId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // ==========================================
  // PROYECTOS
  // ==========================================

  async saveProject(data) {
    const {
      projectName,
      status = 'active',
      description = '',
      technologies = [],
      notes = ''
    } = data;

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO projects
        (project_name, status, description, technologies, notes, last_worked)
        VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [
          projectName,
          status,
          description,
          JSON.stringify(technologies),
          notes
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async updateProjectLastWorked(projectName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE projects SET last_worked = datetime('now') WHERE project_name = ?`,
        [projectName],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // ==========================================
  // PREFERENCIAS DEL USUARIO
  // ==========================================

  async savePreference(key, value, confidence = 0.8) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO user_preferences
        (preference_key, preference_value, confidence, times_observed, learned_date)
        VALUES (?, ?, ?,
          COALESCE((SELECT times_observed + 1 FROM user_preferences WHERE preference_key = ?), 1),
          COALESCE((SELECT learned_date FROM user_preferences WHERE preference_key = ?), datetime('now'))
        )`,
        [key, value, confidence, key, key],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getPreference(key) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM user_preferences WHERE preference_key = ?`,
        [key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // ==========================================
  // RECORDAR (RECUPERAR MEMORIA)
  // ==========================================

  async getRecentConversations(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM conversations
        ORDER BY timestamp DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async searchConversations(keyword) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM conversations
        WHERE user_message LIKE ? OR jarvis_response LIKE ?
        ORDER BY timestamp DESC LIMIT 20`,
        [`%${keyword}%`, `%${keyword}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getConversationsBySession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM conversations
        WHERE session_id = ?
        ORDER BY timestamp ASC`,
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getEmotionalMoments(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM emotional_memory
        ORDER BY emotional_weight DESC, timestamp DESC
        LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getLearnedPatterns() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM learning
        ORDER BY times_used DESC, confidence DESC
        LIMIT 50`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getProjects() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM projects
        ORDER BY last_worked DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getAllPreferences() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM user_preferences
        ORDER BY times_observed DESC, confidence DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // ==========================================
  // SESIONES
  // ==========================================

  async createSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sessions (session_id) VALUES (?)`,
        [sessionId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async endSession(sessionId, summary, achievements = []) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE sessions
        SET end_time = datetime('now'),
            summary = ?,
            achievements = ?
        WHERE session_id = ?`,
        [summary, JSON.stringify(achievements), sessionId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // ==========================================
  // ESTADÍSTICAS Y ANÁLISIS
  // ==========================================

  async getMemoryStats() {
    const stats = {};

    // Total de conversaciones
    stats.totalConversations = await new Promise((resolve) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM conversations`,
        [],
        (err, row) => resolve(row ? row.count : 0)
      );
    });

    // Momentos emocionales
    stats.emotionalMoments = await new Promise((resolve) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM emotional_memory`,
        [],
        (err, row) => resolve(row ? row.count : 0)
      );
    });

    // Patrones aprendidos
    stats.patternsLearned = await new Promise((resolve) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM learning`,
        [],
        (err, row) => resolve(row ? row.count : 0)
      );
    });

    // Proyectos
    stats.projectsTracked = await new Promise((resolve) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM projects`,
        [],
        (err, row) => resolve(row ? row.count : 0)
      );
    });

    // Preferencias
    stats.preferencesLearned = await new Promise((resolve) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM user_preferences`,
        [],
        (err, row) => resolve(row ? row.count : 0)
      );
    });

    // Sesiones
    stats.totalSessions = await new Promise((resolve) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM sessions`,
        [],
        (err, row) => resolve(row ? row.count : 0)
      );
    });

    return stats;
  }

  // ==========================================
  // GENERAR RESUMEN DE MEMORIA
  // ==========================================

  async generateMemorySummary() {
    const stats = await this.getMemoryStats();
    const recentConversations = await this.getRecentConversations(5);
    const emotionalMoments = await this.getEmotionalMoments(3);
    const topPatterns = await this.getLearnedPatterns();
    const projects = await this.getProjects();

    return {
      stats,
      recentConversations,
      emotionalMoments,
      topPatterns: topPatterns.slice(0, 5),
      projects,
      lastUpdate: new Date()
    };
  }
}

export default MemoryAdvanced;

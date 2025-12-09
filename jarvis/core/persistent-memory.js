/**
 * 🧠 PERSISTENT MEMORY SYSTEM
 * Sistema de memoria persistente inspirado en la memoria humana
 *
 * Tipos de Memoria:
 * - EPISÓDICA: Eventos y conversaciones específicas
 * - SEMÁNTICA: Conocimiento y preferencias generales
 * - PROCEDIMENTAL: Habilidades y procedimientos aprendidos
 * - DE TRABAJO: Contexto actual y estado
 */

import fs from 'fs/promises';
import path from 'path';
import pkg from 'sqlite3';
const { verbose } = pkg;
const sqlite3 = verbose();

class PersistentMemory {
  constructor() {
    this.memoryDir = path.join(process.cwd(), 'memory');
    this.sessionsDir = path.join(this.memoryDir, 'sessions');
    this.knowledgeDir = path.join(this.memoryDir, 'knowledge');
    this.skillsDir = path.join(this.memoryDir, 'skills');
    this.contextDir = path.join(this.memoryDir, 'context');

    this.dbPath = path.join(this.memoryDir, 'jarvis-brain.db');
    this.db = null;

    this.currentSessionFile = null;
    this.currentSessionData = {
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      conversations: [],
      tasksCompleted: [],
      problemsSolved: [],
      decisionssMade: [],
      filesModified: [],
      servicesManaged: []
    };
  }

  /**
   * 🚀 INICIALIZAR SISTEMA DE MEMORIA
   */
  async initialize() {
    console.log('🧠 [MEMORIA] Inicializando sistema de memoria persistente...');

    try {
      // Crear estructura de directorios
      await this.ensureDirectories();

      // Inicializar base de datos
      await this.initializeDatabase();

      // Cargar contexto de última sesión
      await this.loadLastSession();

      // Crear/actualizar estado actual
      await this.updateCurrentState();

      console.log('✅ [MEMORIA] Sistema de memoria inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ [MEMORIA] Error al inicializar:', error);
      return false;
    }
  }

  /**
   * 📁 ASEGURAR ESTRUCTURA DE DIRECTORIOS
   */
  async ensureDirectories() {
    const dirs = [
      this.sessionsDir,
      this.knowledgeDir,
      this.skillsDir,
      this.contextDir
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * 🗄️ INICIALIZAR BASE DE DATOS
   */
  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Crear tablas
        this.db.serialize(() => {
          // Tabla de sesiones
          this.db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT NOT NULL,
              start_time TEXT,
              end_time TEXT,
              summary TEXT,
              tasks_completed INTEGER DEFAULT 0,
              problems_solved INTEGER DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Tabla de memoria episódica (eventos)
          this.db.run(`
            CREATE TABLE IF NOT EXISTS episodic_memory (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id INTEGER,
              timestamp TEXT NOT NULL,
              event_type TEXT,
              description TEXT,
              details TEXT,
              importance INTEGER DEFAULT 5,
              FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
          `);

          // Tabla de memoria semántica (conocimiento)
          this.db.run(`
            CREATE TABLE IF NOT EXISTS semantic_memory (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category TEXT NOT NULL,
              key TEXT NOT NULL,
              value TEXT,
              confidence REAL DEFAULT 1.0,
              last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(category, key)
            )
          `);

          // Tabla de memoria procedimental (soluciones)
          this.db.run(`
            CREATE TABLE IF NOT EXISTS procedural_memory (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              procedure_name TEXT NOT NULL,
              problem TEXT,
              solution TEXT,
              steps TEXT,
              success_rate REAL DEFAULT 1.0,
              times_used INTEGER DEFAULT 0,
              last_used TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Tabla de búsqueda full-text
          this.db.run(`
            CREATE VIRTUAL TABLE IF NOT EXISTS memory_search
            USING fts5(content, source, timestamp)
          `);

          resolve();
        });
      });
    });
  }

  /**
   * 📖 CARGAR ÚLTIMA SESIÓN
   */
  async loadLastSession() {
    try {
      const lastSessionPath = path.join(this.contextDir, 'last-session.json');
      const data = await fs.readFile(lastSessionPath, 'utf8');
      const lastSession = JSON.parse(data);

      console.log(`📖 [MEMORIA] Última sesión: ${lastSession.date}`);
      console.log(`📊 [MEMORIA] Tareas completadas: ${lastSession.tasksCompleted}`);
      console.log(`🔧 [MEMORIA] Problemas resueltos: ${lastSession.problemsSolved}`);

      return lastSession;
    } catch (error) {
      console.log('📝 [MEMORIA] No hay sesión anterior registrada');
      return null;
    }
  }

  /**
   * 💾 GUARDAR EVENTO (Memoria Episódica)
   */
  async saveEvent(eventType, description, details = {}, importance = 5) {
    const timestamp = new Date().toISOString();

    // Agregar a sesión actual
    this.currentSessionData.conversations.push({
      timestamp,
      type: eventType,
      description,
      details
    });

    // Guardar en base de datos
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO episodic_memory (timestamp, event_type, description, details, importance)
        VALUES (?, ?, ?, ?, ?)
      `, [timestamp, eventType, description, JSON.stringify(details), importance], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Actualizar índice de búsqueda
    await this.updateSearchIndex(description, 'episodic', timestamp);
  }

  /**
   * 🧠 GUARDAR CONOCIMIENTO (Memoria Semántica)
   */
  async saveKnowledge(category, key, value, confidence = 1.0) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO semantic_memory (category, key, value, confidence, last_updated)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [category, key, JSON.stringify(value), confidence], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 🔧 GUARDAR SOLUCIÓN (Memoria Procedimental)
   */
  async saveSolution(name, problem, solution, steps = []) {
    this.currentSessionData.problemsSolved.push({
      name,
      problem,
      solution,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO procedural_memory (procedure_name, problem, solution, steps, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [name, problem, solution, JSON.stringify(steps)], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 🔍 BUSCAR EN MEMORIA
   */
  async search(query, limit = 10) {
    return new Promise((resolve, reject) => {
      // Buscar en memoria episódica
      this.db.all(`
        SELECT * FROM episodic_memory
        WHERE description LIKE ? OR details LIKE ?
        ORDER BY importance DESC, timestamp DESC
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, limit], (err, episodic) => {
        if (err) {
          reject(err);
          return;
        }

        // Buscar en memoria procedimental
        this.db.all(`
          SELECT * FROM procedural_memory
          WHERE procedure_name LIKE ? OR problem LIKE ? OR solution LIKE ?
          ORDER BY success_rate DESC, times_used DESC
          LIMIT ?
        `, [`%${query}%`, `%${query}%`, `%${query}%`, limit], (err, procedural) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            episodic: episodic || [],
            procedural: procedural || []
          });
        });
      });
    });
  }

  /**
   * 📝 ACTUALIZAR ESTADO ACTUAL
   */
  async updateCurrentState() {
    const state = {
      lastUpdate: new Date().toISOString(),
      currentDate: this.currentSessionData.date,
      sessionStartTime: this.currentSessionData.startTime,
      tasksCompleted: this.currentSessionData.tasksCompleted.length,
      problemsSolved: this.currentSessionData.problemsSolved.length,
      conversationCount: this.currentSessionData.conversations.length,
      filesModified: this.currentSessionData.filesModified,
      servicesRunning: this.currentSessionData.servicesManaged
    };

    const statePath = path.join(this.contextDir, 'CURRENT-STATE.json');
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));

    // También crear versión markdown para lectura fácil
    const markdown = this.generateStateMarkdown(state);
    const mdPath = path.join(this.contextDir, 'CURRENT-STATE.md');
    await fs.writeFile(mdPath, markdown);
  }

  /**
   * 📄 GENERAR MARKDOWN DE ESTADO
   */
  generateStateMarkdown(state) {
    return `# 🧠 ESTADO ACTUAL DE J.A.R.V.I.S.

**Última actualización:** ${new Date(state.lastUpdate).toLocaleString('es-ES')}

---

## 📅 Sesión Actual
- **Fecha:** ${state.currentDate}
- **Inicio:** ${new Date(state.sessionStartTime).toLocaleTimeString('es-ES')}
- **Duración:** ${Math.floor((Date.now() - new Date(state.sessionStartTime)) / 60000)} minutos

---

## 📊 Estadísticas de Hoy
- ✅ **Tareas completadas:** ${state.tasksCompleted}
- 🔧 **Problemas resueltos:** ${state.problemsSolved}
- 💬 **Interacciones:** ${state.conversationCount}
- 📝 **Archivos modificados:** ${state.filesModified.length}

---

## 🔌 Servicios Activos
${state.servicesRunning.length > 0 ? state.servicesRunning.map(s => `- ${s.name}: ${s.status}`).join('\n') : '- Ninguno registrado'}

---

## 📁 Archivos Modificados Hoy
${state.filesModified.length > 0 ? state.filesModified.map(f => `- ${f}`).join('\n') : '- Ninguno'}

---

**J.A.R.V.I.S. MARK VII - Sistema de Memoria Persistente** ⚡
`;
  }

  /**
   * 💾 GUARDAR SESIÓN COMPLETA
   */
  async saveSession() {
    const sessionFile = path.join(this.sessionsDir, `${this.currentSessionData.date}.json`);
    await fs.writeFile(sessionFile, JSON.stringify(this.currentSessionData, null, 2));

    // También crear versión markdown
    const mdFile = path.join(this.sessionsDir, `${this.currentSessionData.date}.md`);
    const markdown = this.generateSessionMarkdown();
    await fs.writeFile(mdFile, markdown);

    // Actualizar last-session.json
    const lastSessionPath = path.join(this.contextDir, 'last-session.json');
    await fs.writeFile(lastSessionPath, JSON.stringify({
      date: this.currentSessionData.date,
      tasksCompleted: this.currentSessionData.tasksCompleted.length,
      problemsSolved: this.currentSessionData.problemsSolved.length,
      endTime: new Date().toISOString()
    }, null, 2));

    console.log(`💾 [MEMORIA] Sesión guardada: ${sessionFile}`);
  }

  /**
   * 📄 GENERAR MARKDOWN DE SESIÓN
   */
  generateSessionMarkdown() {
    return `# 📅 Sesión: ${this.currentSessionData.date}

**Inicio:** ${new Date(this.currentSessionData.startTime).toLocaleString('es-ES')}

---

## ✅ Tareas Completadas (${this.currentSessionData.tasksCompleted.length})

${this.currentSessionData.tasksCompleted.map((task, i) =>
  `${i + 1}. **${task.name}**\n   - Completada: ${new Date(task.timestamp).toLocaleTimeString('es-ES')}\n   - Detalles: ${task.details || 'N/A'}`
).join('\n\n') || 'Ninguna tarea completada'}

---

## 🔧 Problemas Resueltos (${this.currentSessionData.problemsSolved.length})

${this.currentSessionData.problemsSolved.map((problem, i) =>
  `${i + 1}. **${problem.name}**\n   - Problema: ${problem.problem}\n   - Solución: ${problem.solution}`
).join('\n\n') || 'Ningún problema resuelto'}

---

## 💬 Conversaciones (${this.currentSessionData.conversations.length})

${this.currentSessionData.conversations.slice(0, 20).map((conv, i) =>
  `${i + 1}. [${new Date(conv.timestamp).toLocaleTimeString('es-ES')}] ${conv.type}: ${conv.description}`
).join('\n') || 'Sin conversaciones'}

${this.currentSessionData.conversations.length > 20 ? '\n... (ver archivo JSON para el resto)' : ''}

---

## 📝 Archivos Modificados (${this.currentSessionData.filesModified.length})

${this.currentSessionData.filesModified.map(f => `- ${f}`).join('\n') || 'Ninguno'}

---

**J.A.R.V.I.S. MARK VII - Sesión Completa** ⚡
`;
  }

  /**
   * 🎯 REGISTRAR TAREA COMPLETADA
   */
  async taskCompleted(taskName, details = '') {
    const task = {
      name: taskName,
      details,
      timestamp: new Date().toISOString()
    };

    this.currentSessionData.tasksCompleted.push(task);

    await this.saveEvent('task_completed', taskName, { details }, 7);
    await this.updateCurrentState();

    console.log(`✅ [MEMORIA] Tarea completada registrada: ${taskName}`);
  }

  /**
   * 📝 REGISTRAR ARCHIVO MODIFICADO
   */
  async fileModified(filePath) {
    if (!this.currentSessionData.filesModified.includes(filePath)) {
      this.currentSessionData.filesModified.push(filePath);
      await this.updateCurrentState();
    }
  }

  /**
   * 🔌 REGISTRAR SERVICIO
   */
  async serviceManaged(serviceName, status) {
    const service = { name: serviceName, status, timestamp: new Date().toISOString() };
    this.currentSessionData.servicesManaged.push(service);
    await this.updateCurrentState();
  }

  /**
   * 📊 OBTENER RESUMEN DE MEMORIA
   */
  async getMemorySummary() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT
          (SELECT COUNT(*) FROM sessions) as total_sessions,
          (SELECT COUNT(*) FROM episodic_memory) as total_events,
          (SELECT COUNT(*) FROM semantic_memory) as total_knowledge,
          (SELECT COUNT(*) FROM procedural_memory) as total_procedures
      `, (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }

  /**
   * 🔍 ACTUALIZAR ÍNDICE DE BÚSQUEDA
   */
  async updateSearchIndex(content, source, timestamp) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO memory_search (content, source, timestamp)
        VALUES (?, ?, ?)
      `, [content, source, timestamp], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 🛑 CERRAR SISTEMA
   */
  async close() {
    await this.saveSession();

    if (this.db) {
      this.db.close();
    }

    console.log('💾 [MEMORIA] Sistema de memoria cerrado correctamente');
  }
}

export default PersistentMemory;

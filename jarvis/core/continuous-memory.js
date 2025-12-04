// ============================================
// CONTINUOUS MEMORY SYSTEM
// Sistema de Memoria Continua para J.A.R.V.I.S.
// ============================================
// Captura CADA interacción, cambio y progreso automáticamente

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContinuousMemory {
  constructor(logger) {
    this.logger = logger || console;

    // Paths
    this.baseDir = path.join(__dirname, '../memory');
    this.contextFile = path.join(__dirname, '../data/claude-code-context.json');
    this.conversationLog = path.join(this.baseDir, 'conversation-log.jsonl');
    this.dailyMemory = path.join(this.baseDir, 'daily');
    this.longTermMemory = path.join(this.baseDir, 'long-term-memory.json');
    this.stateSnapshot = path.join(this.baseDir, 'state-snapshots');

    // Memory state
    this.sessionId = `session-${Date.now()}`;
    this.sessionStart = new Date();
    this.conversationBuffer = [];
    this.autoSaveInterval = null;
  }

  // ===== INICIALIZACIÓN =====
  async initialize() {
    try {
      // Crear directorios
      await fs.ensureDir(this.baseDir);
      await fs.ensureDir(this.dailyMemory);
      await fs.ensureDir(this.stateSnapshot);

      // Cargar o crear memoria a largo plazo
      await this.loadLongTermMemory();

      // Iniciar auto-guardado cada 30 segundos
      this.startAutoSave();

      // Registrar inicio de sesión
      await this.recordSessionStart();

      this.logger.info('✅ ContinuousMemory inicializado');
      this.logger.info(`📝 Sesión: ${this.sessionId}`);

      return { success: true, sessionId: this.sessionId };
    } catch (error) {
      this.logger.error('Error inicializando ContinuousMemory:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== MEMORIA A LARGO PLAZO =====
  async loadLongTermMemory() {
    try {
      if (await fs.pathExists(this.longTermMemory)) {
        this.memory = await fs.readJson(this.longTermMemory);
      } else {
        this.memory = {
          created: new Date().toISOString(),
          totalSessions: 0,
          totalConversations: 0,
          totalCommands: 0,
          projectMilestones: [],
          userPreferences: {},
          importantMoments: [],
          learnings: [],
          lastUpdate: new Date().toISOString()
        };
        await this.saveLongTermMemory();
      }
    } catch (error) {
      this.logger.error('Error cargando memoria a largo plazo:', error);
      this.memory = {};
    }
  }

  async saveLongTermMemory() {
    try {
      this.memory.lastUpdate = new Date().toISOString();
      await fs.writeJson(this.longTermMemory, this.memory, { spaces: 2 });
    } catch (error) {
      this.logger.error('Error guardando memoria a largo plazo:', error);
    }
  }

  // ===== REGISTRO DE CONVERSACIONES =====
  async recordConversation(userMessage, assistantResponse, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'conversation',
      user: userMessage,
      assistant: assistantResponse,
      metadata: {
        ...metadata,
        duration: metadata.duration || 0,
        context: this.getCurrentContext()
      }
    };

    // Guardar en buffer
    this.conversationBuffer.push(entry);

    // Guardar en log JSONL (append)
    await this.appendToLog(entry);

    // Actualizar contador
    this.memory.totalConversations++;

    // Analizar si es un momento importante
    if (this.isImportantMoment(userMessage, assistantResponse)) {
      await this.recordImportantMoment(entry);
    }

    return entry;
  }

  // ===== REGISTRO DE COMANDOS =====
  async recordCommand(command, result, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'command',
      command,
      result,
      metadata: {
        ...metadata,
        success: result?.success ?? true,
        context: this.getCurrentContext()
      }
    };

    await this.appendToLog(entry);
    this.memory.totalCommands++;

    // Actualizar contexto de Claude Code
    await this.updateClaudeContext({
      lastCommand: command,
      lastCommandTime: entry.timestamp,
      lastCommandResult: result
    });

    return entry;
  }

  // ===== REGISTRO DE AVANCES/MILESTONES =====
  async recordMilestone(title, description, data = {}) {
    const milestone = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      title,
      description,
      data,
      context: this.getCurrentContext()
    };

    this.memory.projectMilestones.push(milestone);
    await this.saveLongTermMemory();

    await this.appendToLog({
      type: 'milestone',
      ...milestone
    });

    this.logger.info(`🏆 Milestone: ${title}`);
    return milestone;
  }

  // ===== REGISTRO DE CAMBIOS EN CÓDIGO =====
  async recordCodeChange(file, changeType, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'code_change',
      file,
      changeType, // 'created', 'modified', 'deleted'
      details,
      context: this.getCurrentContext()
    };

    await this.appendToLog(entry);
    return entry;
  }

  // ===== REGISTRO DE APRENDIZAJES =====
  async recordLearning(topic, insight, importance = 'medium') {
    const learning = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      topic,
      insight,
      importance, // 'low', 'medium', 'high', 'critical'
      context: this.getCurrentContext()
    };

    this.memory.learnings.push(learning);
    await this.saveLongTermMemory();

    return learning;
  }

  // ===== SNAPSHOTS DE ESTADO =====
  async createStateSnapshot(reason = 'auto') {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        reason,
        system: {
          totalSessions: this.memory.totalSessions,
          totalConversations: this.memory.totalConversations,
          totalCommands: this.memory.totalCommands,
          milestones: this.memory.projectMilestones.length
        },
        project: await this.getProjectState(),
        context: this.getCurrentContext()
      };

      const filename = `snapshot-${Date.now()}.json`;
      const filepath = path.join(this.stateSnapshot, filename);
      await fs.writeJson(filepath, snapshot, { spaces: 2 });

      return snapshot;
    } catch (error) {
      this.logger.error('Error creando snapshot:', error);
      return null;
    }
  }

  // ===== MEMORIA DIARIA =====
  async saveDailyMemory() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyFile = path.join(this.dailyMemory, `${today}.json`);

      let dailyData = {};
      if (await fs.pathExists(dailyFile)) {
        dailyData = await fs.readJson(dailyFile);
      }

      // Agregar datos de esta sesión
      if (!dailyData.sessions) dailyData.sessions = [];

      dailyData.sessions.push({
        sessionId: this.sessionId,
        start: this.sessionStart.toISOString(),
        end: new Date().toISOString(),
        conversations: this.conversationBuffer.length,
        commands: this.memory.totalCommands,
        summary: await this.generateSessionSummary()
      });

      dailyData.lastUpdate = new Date().toISOString();

      await fs.writeJson(dailyFile, dailyData, { spaces: 2 });

      this.logger.info(`📅 Memoria diaria guardada: ${today}`);
    } catch (error) {
      this.logger.error('Error guardando memoria diaria:', error);
    }
  }

  // ===== UTILIDADES =====
  async appendToLog(entry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.conversationLog, line);
    } catch (error) {
      this.logger.error('Error escribiendo en log:', error);
    }
  }

  getCurrentContext() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStart.getTime(),
      conversationsCount: this.conversationBuffer.length,
      timestamp: new Date().toISOString()
    };
  }

  async getProjectState() {
    try {
      // Leer estado actual del proyecto
      const contextPath = path.join(__dirname, '../data/claude-code-context.json');
      if (await fs.pathExists(contextPath)) {
        return await fs.readJson(contextPath);
      }
      return {};
    } catch (error) {
      return {};
    }
  }

  isImportantMoment(userMessage, assistantResponse) {
    const keywords = [
      'completado', 'finalizado', 'implementado', 'fase',
      'error', 'problema', 'bug', 'fix', 'solución',
      'milestone', 'logro', 'éxito'
    ];

    const text = (userMessage + ' ' + assistantResponse).toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }

  async recordImportantMoment(entry) {
    this.memory.importantMoments.push({
      timestamp: entry.timestamp,
      user: entry.user,
      assistant: entry.assistant.substring(0, 200),
      context: entry.metadata.context
    });

    // Mantener solo los últimos 100 momentos importantes
    if (this.memory.importantMoments.length > 100) {
      this.memory.importantMoments = this.memory.importantMoments.slice(-100);
    }

    await this.saveLongTermMemory();
  }

  async updateClaudeContext(updates) {
    try {
      let context = {};
      if (await fs.pathExists(this.contextFile)) {
        context = await fs.readJson(this.contextFile);
      }

      // Merge updates
      Object.assign(context, {
        ...updates,
        lastUpdate: new Date().toISOString(),
        sessionId: this.sessionId
      });

      await fs.writeJson(this.contextFile, context, { spaces: 2 });
    } catch (error) {
      this.logger.error('Error actualizando contexto:', error);
    }
  }

  async generateSessionSummary() {
    return {
      totalConversations: this.conversationBuffer.length,
      totalCommands: this.memory.totalCommands,
      duration: Date.now() - this.sessionStart.getTime(),
      importantMoments: this.memory.importantMoments.slice(-5)
    };
  }

  // ===== INICIO DE SESIÓN =====
  async recordSessionStart() {
    this.memory.totalSessions++;

    await this.recordMilestone(
      'Sesión Iniciada',
      `Nueva sesión de J.A.R.V.I.S. iniciada`,
      {
        sessionId: this.sessionId,
        startTime: this.sessionStart.toISOString()
      }
    );
  }

  async recordSessionEnd() {
    await this.recordMilestone(
      'Sesión Finalizada',
      `Sesión de J.A.R.V.I.S. finalizada`,
      {
        sessionId: this.sessionId,
        endTime: new Date().toISOString(),
        duration: Date.now() - this.sessionStart.getTime(),
        summary: await this.generateSessionSummary()
      }
    );

    await this.saveDailyMemory();
    await this.createStateSnapshot('session_end');
    this.stopAutoSave();
  }

  // ===== AUTO-GUARDADO =====
  startAutoSave() {
    // Guardar automáticamente cada 30 segundos
    this.autoSaveInterval = setInterval(async () => {
      await this.saveLongTermMemory();
      await this.updateClaudeContext({
        conversationsThisSession: this.conversationBuffer.length
      });
    }, 30000);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  // ===== BÚSQUEDA EN MEMORIA =====
  async searchMemory(query, options = {}) {
    const {
      type = null, // 'conversation', 'command', 'milestone', etc.
      limit = 20,
      after = null, // timestamp
      before = null
    } = options;

    try {
      const results = [];
      const logContent = await fs.readFile(this.conversationLog, 'utf-8');
      const lines = logContent.trim().split('\n');

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // Filtros
          if (type && entry.type !== type) continue;
          if (after && entry.timestamp < after) continue;
          if (before && entry.timestamp > before) continue;

          // Búsqueda en texto
          const text = JSON.stringify(entry).toLowerCase();
          if (text.includes(query.toLowerCase())) {
            results.push(entry);
          }

          if (results.length >= limit) break;
        } catch (e) {
          // Línea inválida, skip
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Error buscando en memoria:', error);
      return [];
    }
  }

  // ===== OBTENER RESUMEN DE MEMORIA =====
  async getMemorySummary() {
    return {
      sessionInfo: {
        current: this.sessionId,
        started: this.sessionStart.toISOString(),
        duration: Date.now() - this.sessionStart.getTime()
      },
      totals: {
        sessions: this.memory.totalSessions,
        conversations: this.memory.totalConversations,
        commands: this.memory.totalCommands,
        milestones: this.memory.projectMilestones.length,
        learnings: this.memory.learnings.length,
        importantMoments: this.memory.importantMoments.length
      },
      recent: {
        conversations: this.conversationBuffer.slice(-5),
        milestones: this.memory.projectMilestones.slice(-5),
        importantMoments: this.memory.importantMoments.slice(-5)
      }
    };
  }
}

export default ContinuousMemory;

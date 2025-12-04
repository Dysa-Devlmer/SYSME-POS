// core/conversation-memory.js
// J.A.R.V.I.S. Conversation Memory System
// Sistema de memoria conversacional de nivel enterprise

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ConversationMemory {
  constructor(memoryAdvanced) {
    this.memory = memoryAdvanced;
    this.currentSession = null;
    this.conversationHistory = [];
    this.contextStack = [];
    this.topics = new Map();
    this.projects = new Map();
    this.patterns = new Map();
    this.timeline = [];
    this.initialized = false;
  }

  /**
   * Inicializa el sistema de memoria conversacional
   */
  async initialize() {
    console.log('🔧 [ConversationMemory] Inicializando sistema de memoria conversacional...');

    try {
      // Crear nueva sesión
      this.currentSession = {
        id: `session_${Date.now()}`,
        startTime: new Date(),
        lastActivity: new Date(),
        turnCount: 0,
        topics: [],
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        userState: 'normal' // normal, frustrated, focused, stressed, celebrating
      };

      // Cargar historial reciente
      await this.loadRecentHistory();

      // Cargar patrones aprendidos
      await this.loadPatterns();

      this.initialized = true;
      console.log('✅ [ConversationMemory] Sistema de memoria conversacional inicializado');

      return true;
    } catch (error) {
      console.error('❌ [ConversationMemory] Error inicializando:', error.message);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // GESTIÓN DE CONVERSACIÓN
  // ═════════════════════════════════════════════════════════════

  /**
   * Registra un turno de conversación
   */
  async addTurn(userMessage, jarvisResponse, context = {}) {
    const turn = {
      id: `turn_${Date.now()}`,
      sessionId: this.currentSession.id,
      timestamp: new Date(),
      user: {
        message: userMessage,
        intent: context.intent || 'unknown',
        entities: context.entities || [],
        sentiment: this.analyzeSentiment(userMessage)
      },
      jarvis: {
        response: jarvisResponse,
        actions: context.actions || [],
        confidence: context.confidence || 0.8
      },
      context: {
        currentTopic: this.getCurrentTopic(),
        currentProject: this.getCurrentProject(),
        references: this.extractReferences(userMessage),
        timeOfDay: this.getTimeOfDay()
      }
    };

    // Agregar a historial en memoria
    this.conversationHistory.push(turn);

    // Mantener solo últimos 100 turnos en memoria
    if (this.conversationHistory.length > 100) {
      this.conversationHistory = this.conversationHistory.slice(-100);
    }

    // Guardar en BD
    await this.saveTurnToDB(turn);

    // Actualizar sesión
    this.currentSession.turnCount++;
    this.currentSession.lastActivity = new Date();

    // Actualizar contexto
    await this.updateContext(turn);

    // Detectar cambios de tema
    await this.detectTopicChange(turn);

    // Actualizar timeline
    this.updateTimeline(turn);

    // Aprender patrones
    await this.learnPatterns(turn);

    return turn;
  }

  /**
   * Obtiene historial de conversación
   */
  getHistory(limit = 10) {
    return this.conversationHistory.slice(-limit).map(turn => ({
      timestamp: turn.timestamp,
      user: turn.user.message,
      jarvis: turn.jarvis.response,
      topic: turn.context.currentTopic
    }));
  }

  /**
   * Busca en historial por keyword o tema
   */
  async searchHistory(query, options = {}) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const turn of this.conversationHistory) {
      // Buscar en mensaje de usuario
      if (turn.user.message.toLowerCase().includes(queryLower)) {
        results.push(turn);
        continue;
      }

      // Buscar en respuesta de JARVIS
      if (turn.jarvis.response.toLowerCase().includes(queryLower)) {
        results.push(turn);
        continue;
      }

      // Buscar en topic
      if (turn.context.currentTopic?.toLowerCase().includes(queryLower)) {
        results.push(turn);
      }
    }

    return options.limit ? results.slice(-options.limit) : results;
  }

  // ═════════════════════════════════════════════════════════════
  // ANÁLISIS DE CONTEXTO
  // ═════════════════════════════════════════════════════════════

  /**
   * Analiza el contexto completo de la conversación
   */
  analyzeContext() {
    const recentTurns = this.conversationHistory.slice(-10);

    return {
      conversationHistory: this.conversationHistory,
      currentTopic: this.getCurrentTopic(),
      currentProject: this.getCurrentProject(),
      recentTopics: this.getRecentTopics(5),
      conversationFlow: this.analyzeConversationFlow(recentTurns),
      userState: this.inferUserState(recentTurns),
      nextLikelyAction: this.predictNextAction(recentTurns),
      implicitReferences: this.resolveImplicitReferences(recentTurns)
    };
  }

  /**
   * Detecta cambio de tema en la conversación
   */
  async detectTopicChange(turn) {
    const currentTopic = this.getCurrentTopic();
    const keywords = this.extractKeywords(turn.user.message);

    // Si no hay tema actual, establecer uno nuevo
    if (!currentTopic) {
      this.setCurrentTopic(keywords[0] || 'general');
      return true;
    }

    // Calcular similitud con tema actual
    const similarity = this.calculateTopicSimilarity(keywords, currentTopic);

    // Si similitud es baja, cambio de tema
    if (similarity < 0.3) {
      const newTopic = keywords[0] || 'general';
      this.setCurrentTopic(newTopic);

      console.log(`📌 [ConversationMemory] Cambio de tema: ${currentTopic} → ${newTopic}`);

      return true;
    }

    return false;
  }

  /**
   * Resuelve referencias implícitas ("eso", "el proyecto", etc.)
   */
  resolveImplicitReferences(recentTurns) {
    const references = {
      'eso': null,
      'esto': null,
      'el proyecto': null,
      'el archivo': null,
      'el error': null,
      'la función': null
    };

    // Buscar en turnos recientes (del más reciente al más antiguo)
    for (let i = recentTurns.length - 1; i >= 0; i--) {
      const turn = recentTurns[i];

      // Proyecto mencionado
      if (!references['el proyecto'] && turn.context.currentProject) {
        references['el proyecto'] = turn.context.currentProject;
      }

      // Archivo mencionado
      const fileMatch = turn.userMessage?.match(/(\w+\.\w+)/);
      if (!references['el archivo'] && fileMatch) {
        references['el archivo'] = fileMatch[1];
      }

      // Error mencionado
      const errorMatch = turn.userMessage?.match(/error[:\s]+([^\n]+)/i);
      if (!references['el error'] && errorMatch) {
        references['el error'] = errorMatch[1];
      }

      // Función mencionada
      const funcMatch = turn.userMessage?.match(/función\s+(\w+)|function\s+(\w+)/i);
      if (!references['la función'] && funcMatch) {
        references['la función'] = funcMatch[1] || funcMatch[2];
      }
    }

    // "eso" y "esto" se refieren al último objeto mencionado
    const lastMention = references['el proyecto'] || references['el archivo'] || references['la función'];
    references['eso'] = lastMention;
    references['esto'] = lastMention;

    return references;
  }

  /**
   * Analiza flujo de conversación (ramificada, lineal, circular)
   */
  analyzeConversationFlow(turns) {
    if (turns.length < 3) return 'starting';

    const topics = turns.map(t => t.context.currentTopic);
    const uniqueTopics = new Set(topics);

    // Si hay muchos cambios de tema rápidos = ramificada
    if (uniqueTopics.size > topics.length * 0.7) {
      return 'branched';
    }

    // Si volvemos a temas anteriores = circular
    const topicCounts = {};
    topics.forEach(t => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });

    if (Object.values(topicCounts).some(count => count > 2)) {
      return 'circular';
    }

    // Si mantenemos un tema = lineal y enfocada
    if (uniqueTopics.size <= 2) {
      return 'focused';
    }

    return 'exploratory';
  }

  /**
   * Infiere estado emocional/mental del usuario
   */
  inferUserState(recentTurns) {
    if (recentTurns.length === 0) return 'normal';

    const recentSentiments = recentTurns.map(t => t.user.sentiment);
    const avgSentiment = recentSentiments.reduce((a, b) => a + b.score, 0) / recentSentiments.length;

    // Detectar frustración (múltiples mensajes negativos)
    const negativeCount = recentSentiments.filter(s => s.score < -0.3).length;
    if (negativeCount >= 3) {
      return 'frustrated';
    }

    // Detectar celebración (sentimiento muy positivo)
    if (avgSentiment > 0.6) {
      return 'celebrating';
    }

    // Detectar estrés (muchos comandos urgentes seguidos)
    const urgentPatterns = ['urgente', 'rápido', 'ahora', 'ya', 'inmediato'];
    const urgentCount = recentTurns.filter(t =>
      urgentPatterns.some(p => t.userMessage?.toLowerCase().includes(p))
    ).length;

    if (urgentCount >= 2) {
      return 'stressed';
    }

    // Detectar concentración profunda (mismo tema por mucho tiempo)
    const sameTopic = recentTurns.every(t => t.context?.currentTopic === recentTurns[0]?.context?.currentTopic);
    if (sameTopic && recentTurns.length >= 5) {
      return 'focused';
    }

    return 'normal';
  }

  /**
   * Predice la próxima acción probable del usuario
   */
  predictNextAction(recentTurns) {
    if (recentTurns.length === 0) return null;

    const recentIntents = recentTurns.map(t => t.user.intent);
    const lastIntent = recentIntents[recentIntents.length - 1];

    // Patrones comunes aprendidos
    const commonSequences = {
      'git_status': ['git_commit', 'git_diff', 'git_log'],
      'search_filesystem': ['display_file', 'edit_file'],
      'display_file': ['edit_file', 'analyze_code'],
      'git_commit': ['git_push', 'git_status'],
      'run_command': ['check_output', 'run_command']
    };

    const predictions = commonSequences[lastIntent] || [];

    // Agregar predicciones basadas en patrones aprendidos
    const learnedPattern = this.patterns.get(`after_${lastIntent}`);
    if (learnedPattern) {
      predictions.push(...learnedPattern.nextActions.slice(0, 2));
    }

    return predictions.length > 0 ? predictions[0] : null;
  }

  // ═════════════════════════════════════════════════════════════
  // GESTIÓN DE TEMAS Y PROYECTOS
  // ═════════════════════════════════════════════════════════════

  /**
   * Establece tema actual
   */
  setCurrentTopic(topic) {
    this.contextStack.push({ type: 'topic', value: topic, timestamp: new Date() });

    if (!this.topics.has(topic)) {
      this.topics.set(topic, {
        name: topic,
        firstMention: new Date(),
        lastMention: new Date(),
        mentions: 1,
        relatedKeywords: []
      });
    } else {
      const topicData = this.topics.get(topic);
      topicData.lastMention = new Date();
      topicData.mentions++;
    }
  }

  /**
   * Obtiene tema actual
   */
  getCurrentTopic() {
    const topicContexts = this.contextStack.filter(c => c.type === 'topic');
    return topicContexts.length > 0 ? topicContexts[topicContexts.length - 1].value : null;
  }

  /**
   * Obtiene temas recientes
   */
  getRecentTopics(limit = 5) {
    return Array.from(this.topics.entries())
      .sort((a, b) => b[1].lastMention - a[1].lastMention)
      .slice(0, limit)
      .map(([name, data]) => ({
        name,
        mentions: data.mentions,
        lastMention: data.lastMention
      }));
  }

  /**
   * Establece proyecto actual
   */
  setCurrentProject(projectName) {
    this.contextStack.push({ type: 'project', value: projectName, timestamp: new Date() });

    if (!this.projects.has(projectName)) {
      this.projects.set(projectName, {
        name: projectName,
        startedAt: new Date(),
        lastWorkTime: new Date(),
        totalTurns: 0,
        topics: [],
        files: []
      });
    }

    const project = this.projects.get(projectName);
    project.lastWorkTime = new Date();
    project.totalTurns++;
  }

  /**
   * Obtiene proyecto actual
   */
  getCurrentProject() {
    const projectContexts = this.contextStack.filter(c => c.type === 'project');
    return projectContexts.length > 0 ? projectContexts[projectContexts.length - 1].value : null;
  }

  // ═════════════════════════════════════════════════════════════
  // TIMELINE Y PATRONES
  // ═════════════════════════════════════════════════════════════

  /**
   * Actualiza timeline de trabajo
   */
  updateTimeline(turn) {
    const event = {
      timestamp: turn.timestamp,
      type: this.classifyEvent(turn),
      topic: turn.context.currentTopic,
      project: turn.context.currentProject,
      action: turn.user.intent
    };

    this.timeline.push(event);

    // Mantener solo últimos 500 eventos
    if (this.timeline.length > 500) {
      this.timeline = this.timeline.slice(-500);
    }
  }

  /**
   * Clasifica tipo de evento
   */
  classifyEvent(turn) {
    const intent = turn.user.intent;

    if (['git_commit', 'git_push'].includes(intent)) return 'milestone';
    if (['run_command', 'execute'].includes(intent)) return 'execution';
    if (['search', 'display_file'].includes(intent)) return 'exploration';
    if (['analyze', 'diagnostic'].includes(intent)) return 'analysis';

    return 'general';
  }

  /**
   * Obtiene resumen de timeline
   */
  getTimelineSummary(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentEvents = this.timeline.filter(e => e.timestamp > cutoff);

    const summary = {
      totalEvents: recentEvents.length,
      byType: {},
      byTopic: {},
      byProject: {},
      milestones: recentEvents.filter(e => e.type === 'milestone')
    };

    recentEvents.forEach(event => {
      summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
      if (event.topic) {
        summary.byTopic[event.topic] = (summary.byTopic[event.topic] || 0) + 1;
      }
      if (event.project) {
        summary.byProject[event.project] = (summary.byProject[event.project] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Aprende patrones de trabajo del usuario
   */
  async learnPatterns(turn) {
    const pattern = `after_${turn.user.intent}`;

    if (!this.patterns.has(pattern)) {
      this.patterns.set(pattern, {
        trigger: turn.user.intent,
        nextActions: [],
        count: 0,
        confidence: 0
      });
    }

    const patternData = this.patterns.get(pattern);

    // Si hay un turno siguiente en historial, aprender
    const nextTurnIndex = this.conversationHistory.indexOf(turn) + 1;
    if (nextTurnIndex < this.conversationHistory.length) {
      const nextTurn = this.conversationHistory[nextTurnIndex];
      const nextAction = nextTurn.user.intent;

      if (!patternData.nextActions.find(a => a.action === nextAction)) {
        patternData.nextActions.push({ action: nextAction, count: 1 });
      } else {
        const action = patternData.nextActions.find(a => a.action === nextAction);
        action.count++;
      }

      patternData.count++;
      patternData.confidence = Math.min(patternData.count / 10, 0.9);

      // Ordenar por frecuencia
      patternData.nextActions.sort((a, b) => b.count - a.count);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═════════════════════════════════════════════════════════════

  /**
   * Analiza sentimiento de mensaje
   */
  analyzeSentiment(message) {
    const positive = ['excelente', 'bien', 'perfecto', 'gracias', 'genial', 'fantástico', 'increíble'];
    const negative = ['error', 'mal', 'fallo', 'problema', 'bug', 'no funciona', 'frustrado'];

    let score = 0;
    const messageLower = message.toLowerCase();

    positive.forEach(word => {
      if (messageLower.includes(word)) score += 0.3;
    });

    negative.forEach(word => {
      if (messageLower.includes(word)) score -= 0.3;
    });

    return {
      score: Math.max(-1, Math.min(1, score)),
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
    };
  }

  /**
   * Extrae keywords del mensaje
   */
  extractKeywords(message) {
    // Palabras vacías a ignorar
    const stopWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo', 'pero', 'más'];

    const words = message.toLowerCase()
      .replace(/[^\w\sáéíóúñ]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));

    // Contar frecuencias
    const freq = {};
    words.forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });

    // Ordenar por frecuencia
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 5);
  }

  /**
   * Calcula similitud entre keywords y tema
   */
  calculateTopicSimilarity(keywords, topic) {
    if (!topic || keywords.length === 0) return 0;

    const topicWords = topic.toLowerCase().split(/\s+/);
    let matches = 0;

    keywords.forEach(keyword => {
      if (topicWords.some(tw => tw.includes(keyword) || keyword.includes(tw))) {
        matches++;
      }
    });

    return matches / keywords.length;
  }

  /**
   * Extrae referencias del mensaje
   */
  extractReferences(message) {
    const references = [];

    // Pronombres demostrativos
    if (/\b(eso|esto|aquello)\b/i.test(message)) {
      references.push({ type: 'demonstrative', value: RegExp.$1 });
    }

    // Referencias a "el proyecto", "el archivo", etc.
    const patterns = [
      /\b(el|la)\s+(proyecto|archivo|función|error|bug|issue)\b/gi
    ];

    patterns.forEach(pattern => {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        references.push({ type: 'definite', value: match[2] });
      }
    });

    return references;
  }

  /**
   * Obtiene hora del día
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Carga historial reciente
   */
  async loadRecentHistory() {
    try {
      if (!this.memory) return;

      // Cargar últimas 50 conversaciones de BD
      const recent = await this.memory.getRecentConversations(50);

      // Convertir a formato de turnos
      this.conversationHistory = recent.map(conv => ({
        id: conv.id,
        timestamp: new Date(conv.timestamp),
        user: { message: conv.user_message, intent: 'loaded', sentiment: { score: 0 } },
        jarvis: { response: conv.jarvis_response },
        context: { currentTopic: null, currentProject: null }
      }));

      console.log(`   Cargadas ${recent.length} conversaciones del historial`);
    } catch (error) {
      console.log('   No se pudo cargar historial previo');
    }
  }

  /**
   * Carga patrones aprendidos
   */
  async loadPatterns() {
    // TODO: Cargar desde BD si existen
    console.log('   Patrones: Modo aprendizaje iniciado');
  }

  /**
   * Guarda turno en BD
   */
  async saveTurnToDB(turn) {
    try {
      if (!this.memory) return;

      await this.memory.saveConversation(
        turn.user.message,
        turn.jarvis.response,
        {
          sessionId: turn.sessionId,
          intent: turn.user.intent,
          sentiment: turn.user.sentiment,
          topic: turn.context.currentTopic,
          project: turn.context.currentProject
        }
      );
    } catch (error) {
      // Silencioso si falla - no es crítico
    }
  }

  /**
   * Actualiza contexto basado en turno
   */
  async updateContext(turn) {
    // Detectar mención de proyecto
    const projectMatch = turn.user.message.match(/proyecto\s+(\w+)|en\s+(\w+)\s+proyecto/i);
    if (projectMatch) {
      const projectName = projectMatch[1] || projectMatch[2];
      this.setCurrentProject(projectName);
    }
  }

  /**
   * Obtiene estadísticas de sesión
   */
  getSessionStats() {
    const duration = Date.now() - this.currentSession.startTime.getTime();

    return {
      sessionId: this.currentSession.id,
      duration: Math.floor(duration / 1000 / 60), // minutos
      turnCount: this.currentSession.turnCount,
      topics: this.currentSession.topics.length,
      currentTopic: this.getCurrentTopic(),
      currentProject: this.getCurrentProject(),
      userState: this.currentSession.userState,
      sentiment: this.currentSession.sentiment
    };
  }

  getStats() {
    return {
      totalTurns: this.conversationHistory.length,
      currentTopic: this.getCurrentTopic(),
      currentProject: this.getCurrentProject(),
      timelineEvents: this.timeline.length,
      contextStackSize: this.contextStack.length,
      patternsLearned: this.patterns.size,
    };
  }
}

export default ConversationMemory;

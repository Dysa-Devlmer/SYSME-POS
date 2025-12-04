// ============================================
// CONVERSATION ENGINE - J.A.R.V.I.S. PURO
// ============================================
// Motor de conversación multi-turn - Cerebro conversacional
//
// Características:
// ✅ Multi-turn dialogue management
// ✅ Intent tracking across turns
// ✅ Context switching logic
// ✅ Conversation flow control
// ✅ Clarification requests
// ✅ Expectation management
//
// Autor: Antropic Claude Sonnet 4.5
// Fecha: 2025-01-XX

class ConversationEngine {
  constructor(conversationMemory, nlpEngine, proactiveEngine) {
    this.conversationMemory = conversationMemory;
    this.nlpEngine = nlpEngine;
    this.proactiveEngine = proactiveEngine;

    // Estado de la conversación actual
    this.currentDialogue = null;
    this.intentTracker = new IntentTracker();

    // Configuración
    this.config = {
      maxTurnsBeforeReset: 50,
      contextWindowSize: 10,
      intentChangeThreshold: 0.7,
      clarificationThreshold: 0.5,
      autoArchiveAfter: 300000, // 5 min de inactividad
    };

    // Estados de conversación
    this.states = {
      IDLE: 'idle',
      GATHERING_INFO: 'gathering',
      EXECUTING: 'executing',
      CONFIRMING: 'confirming',
      CLARIFYING: 'clarifying',
      COMPLETED: 'completed',
    };

    this.currentState = this.states.IDLE;
    this.stateData = {};
  }

  async initialize() {
    console.log('[ConversationEngine] Inicializando motor conversacional...');

    // Cargar última conversación si existe
    await this.loadLastDialogue();

    console.log('[ConversationEngine] Motor conversacional listo ✓');
    return true;
  }

  // ============================================
  // PROCESAMIENTO DE MENSAJES
  // ============================================

  /**
   * Procesa mensaje del usuario (método principal)
   */
  async processMessage(userMessage) {
    // 1. Crear turn
    const turn = {
      userMessage,
      timestamp: Date.now(),
      turnNumber: this.currentDialogue?.turns.length + 1 || 1,
    };

    // 2. Análisis NLP básico
    const nlpAnalysis = await this.nlpEngine.analyze(userMessage);
    turn.nlp = nlpAnalysis;

    // 3. Detectar intent
    const intent = this.detectIntent(userMessage, nlpAnalysis);
    turn.intent = intent;

    // 4. Resolver referencias implícitas
    const resolved = this.resolveReferences(userMessage);
    turn.resolvedMessage = resolved;

    // 5. Detectar cambio de tema
    const topicChanged = this.detectTopicChange(intent);

    if (topicChanged) {
      await this.handleTopicChange(intent);
    }

    // 6. Agregar turn a diálogo actual
    if (!this.currentDialogue) {
      this.startNewDialogue(intent);
    }
    this.currentDialogue.turns.push(turn);

    // 7. Track intent
    this.intentTracker.addIntent(intent, turn);

    // 8. Verificar expectativas
    const matchedExpectations = this.checkExpectations(userMessage, intent);
    turn.matchedExpectations = matchedExpectations;

    // 9. Verificar si necesita clarificación
    const needsClarification = this.needsClarification(intent);

    if (needsClarification) {
      this.currentState = this.states.CLARIFYING;
      return await this.askClarification(intent);
    }

    // 10. Generar respuesta coherente
    this.currentState = this.states.EXECUTING;
    const response = await this.generateCoherentResponse(resolved, intent, turn);

    return response;
  }

  /**
   * Detecta intent del mensaje
   */
  detectIntent(message, nlpAnalysis) {
    // Usar análisis NLP existente
    const action = nlpAnalysis.questionType || 'unknown';
    const confidence = 0.7; // Default

    return {
      action,
      confidence,
      entities: nlpAnalysis.entities || [],
      keywords: this.extractKeywords(message),
    };
  }

  /**
   * Extrae keywords del mensaje
   */
  extractKeywords(message) {
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'o', 'a', 'que', 'por', 'para'];
    const words = message.toLowerCase().split(/\s+/);

    return words.filter(w => w.length > 3 && !stopWords.includes(w));
  }

  /**
   * Detecta cambio de tema
   */
  detectTopicChange(newIntent) {
    if (!this.currentDialogue || !this.currentDialogue.mainIntent) {
      return true; // Primera conversación
    }

    const similarity = this.calculateIntentSimilarity(
      this.currentDialogue.mainIntent,
      newIntent
    );

    return similarity < this.config.intentChangeThreshold;
  }

  /**
   * Calcula similitud entre intents
   */
  calculateIntentSimilarity(intent1, intent2) {
    if (!intent1 || !intent2) return 0;

    // Comparar actions
    if (intent1.action === intent2.action) {
      return 1.0;
    }

    // Comparar keywords
    const keywords1 = new Set(intent1.keywords || []);
    const keywords2 = new Set(intent2.keywords || []);

    const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
    const union = new Set([...keywords1, ...keywords2]);

    if (union.size === 0) return 0;

    const keywordSimilarity = intersection.size / union.size;

    // Comparar entities
    const entities1 = new Set((intent1.entities || []).map(e => e.type));
    const entities2 = new Set((intent2.entities || []).map(e => e.type));

    const entityIntersection = new Set([...entities1].filter(e => entities2.has(e)));
    const entityUnion = new Set([...entities1, ...entities2]);

    const entitySimilarity = entityUnion.size > 0
      ? entityIntersection.size / entityUnion.size
      : 0;

    return (keywordSimilarity * 0.7) + (entitySimilarity * 0.3);
  }

  /**
   * Resuelve referencias implícitas
   */
  resolveReferences(message) {
    const context = this.conversationMemory.analyzeContext();
    let resolved = message;

    // "eso" → último objeto mencionado
    if (/\beso\b/i.test(message)) {
      const lastObject = context.implicitReferences?.eso;
      if (lastObject) {
        resolved = resolved.replace(/\beso\b/gi, lastObject);
      }
    }

    // "el archivo" → último archivo mencionado
    if (/el archivo/i.test(message)) {
      const lastFile = context.implicitReferences?.['el archivo'];
      if (lastFile) {
        resolved = resolved.replace(/el archivo/gi, lastFile);
      }
    }

    // "el proyecto" → proyecto actual
    if (/el proyecto/i.test(message)) {
      const currentProject = context.currentProject;
      if (currentProject) {
        resolved = resolved.replace(/el proyecto/gi, currentProject);
      }
    }

    return resolved;
  }

  /**
   * Detecta si necesita clarificación
   */
  needsClarification(intent) {
    // Si confianza es baja
    if (intent.confidence < this.config.clarificationThreshold) {
      return true;
    }

    // Si intent es ambiguo
    if (intent.action === 'unknown' || intent.action === 'unclear') {
      return true;
    }

    return false;
  }

  /**
   * Pide clarificación al usuario
   */
  async askClarification(intent) {
    const clarificationMessages = [
      'No estoy completamente seguro de lo que necesita. ¿Podría ser más específico?',
      'Detecté varias posibilidades. ¿Qué prefiere exactamente?',
      '¿Podría aclarar qué desea que haga?',
      'Entiendo parcialmente. ¿Puede reformular?',
    ];

    const message = clarificationMessages[Math.floor(Math.random() * clarificationMessages.length)];

    return {
      type: 'clarification',
      message,
      waitingFor: 'reformulation',
      needsClarification: true,
    };
  }

  /**
   * Genera respuesta coherente
   */
  async generateCoherentResponse(message, intent, turn) {
    const context = this.conversationMemory.analyzeContext();

    // Detectar si usuario está respondiendo a pregunta de JARVIS
    const answeringJarvis = this.isAnsweringPreviousQuestion();

    if (answeringJarvis) {
      return await this.processPreviousQuestionAnswer(message, intent);
    }

    // Generar respuesta normal
    return {
      message,
      intent,
      context,
      suggestions: await this.getProactiveSuggestions(),
      needsClarification: false,
    };
  }

  /**
   * Detecta si usuario está respondiendo a pregunta anterior
   */
  isAnsweringPreviousQuestion() {
    if (!this.currentDialogue || this.currentDialogue.turns.length < 2) {
      return false;
    }

    const lastTurn = this.currentDialogue.turns[this.currentDialogue.turns.length - 2];

    return lastTurn && lastTurn.isQuestion && lastTurn.waitingForAnswer;
  }

  /**
   * Procesa respuesta a pregunta anterior
   */
  async processPreviousQuestionAnswer(message, intent) {
    // Implementación básica
    return {
      message,
      intent,
      answeringPrevious: true,
      needsClarification: false,
    };
  }

  /**
   * Obtiene sugerencias proactivas
   */
  async getProactiveSuggestions() {
    if (!this.proactiveEngine) return [];

    return this.proactiveEngine.getPendingSuggestions(7); // High priority only
  }

  // ============================================
  // MANEJO DE DIÁLOGOS
  // ============================================

  /**
   * Inicia nuevo diálogo
   */
  startNewDialogue(intent) {
    this.currentDialogue = {
      id: `dialogue_${Date.now()}`,
      mainIntent: intent,
      subIntents: [],
      turns: [],
      topic: intent.keywords?.[0] || 'general',
      startedAt: Date.now(),
      expectations: [],
    };
  }

  /**
   * Maneja cambio de tema
   */
  async handleTopicChange(newIntent) {
    if (this.currentDialogue) {
      // Archivar conversación anterior
      await this.archiveCurrentDialogue();
    }

    // Iniciar nueva conversación
    this.startNewDialogue(newIntent);
  }

  /**
   * Archiva diálogo actual
   */
  async archiveCurrentDialogue() {
    if (!this.currentDialogue) return;

    // Guardar en memoria conversacional
    // (ya se guarda automáticamente en cada turn)

    // Limpiar diálogo actual
    this.currentDialogue = null;
  }

  /**
   * Carga último diálogo
   */
  async loadLastDialogue() {
    // Por ahora, iniciar vacío
    this.currentDialogue = null;
  }

  // ============================================
  // GESTIÓN DE EXPECTATIVAS
  // ============================================

  /**
   * Agrega expectativa
   */
  addExpectation(expectation) {
    if (!this.currentDialogue) return;

    this.currentDialogue.expectations.push({
      ...expectation,
      createdAt: Date.now(),
    });
  }

  /**
   * Verifica expectativas
   */
  checkExpectations(userMessage, intent) {
    if (!this.currentDialogue) return [];

    const matched = [];

    for (const expectation of this.currentDialogue.expectations) {
      if (this.matchesExpectation(userMessage, intent, expectation)) {
        matched.push(expectation);
      }
    }

    // Eliminar expectativas cumplidas
    this.currentDialogue.expectations = this.currentDialogue.expectations.filter(
      exp => !matched.includes(exp)
    );

    return matched;
  }

  /**
   * Verifica si mensaje coincide con expectativa
   */
  matchesExpectation(message, intent, expectation) {
    // Implementación básica
    if (expectation.type === 'confirmation') {
      return /^(s[ií]|ok|dale|hazlo|procede|adelante)$/i.test(message.trim());
    }

    if (expectation.type === 'negation') {
      return /^(no|cancel|abort|detener|para)$/i.test(message.trim());
    }

    return false;
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  getStats() {
    return {
      currentState: this.currentState,
      hasActiveDialogue: this.currentDialogue !== null,
      currentTopic: this.currentDialogue?.topic || null,
      turnCount: this.currentDialogue?.turns.length || 0,
      intentStack: this.intentTracker.getIntentStack(),
    };
  }
}

// ============================================
// INTENT TRACKER
// ============================================

class IntentTracker {
  constructor() {
    this.intentHistory = [];
    this.currentIntent = null;
    this.subIntents = [];
  }

  addIntent(intent, turn) {
    this.intentHistory.push({
      intent,
      turn,
      timestamp: Date.now(),
    });

    // Determinar si es intent principal o sub-intent
    if (this.isSubIntent(intent)) {
      this.subIntents.push(intent);
    } else {
      this.currentIntent = intent;
      this.subIntents = [];
    }
  }

  isSubIntent(intent) {
    if (!this.currentIntent) return false;

    // Un sub-intent es complementario al intent principal
    const complementaryIntents = {
      'deploy': ['confirm', 'abort', 'status'],
      'commit': ['add_files', 'write_message', 'push'],
      'search': ['filter', 'sort', 'limit'],
      'display_file': ['edit', 'copy', 'delete'],
    };

    const complements = complementaryIntents[this.currentIntent.action];

    return complements?.includes(intent.action) || false;
  }

  getIntentStack() {
    return {
      main: this.currentIntent,
      subs: this.subIntents,
      history: this.intentHistory.slice(-10), // últimos 10
    };
  }
}

export default ConversationEngine;

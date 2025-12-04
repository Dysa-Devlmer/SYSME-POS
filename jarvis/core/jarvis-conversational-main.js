// ============================================
// JARVIS CONVERSATIONAL MAIN - J.A.R.V.I.S. PURO
// ============================================
// Orquestador principal del sistema conversacional
//
// Integra todos los módulos conversacionales:
// - ConversationMemory
// - ProactiveEngine
// - NaturalLanguageResponse
// - ConversationEngine
// - BackgroundAutonomous
// - EmotionalIntelligence
// - AdvancedNLPConversational
//
// Autor: Antropic Claude Sonnet 4.5
// Fecha: 2025-01-XX

import ConversationMemory from './conversation-memory.js';
import ProactiveEngine from './proactive-engine.js';
import NaturalLanguageResponse from './natural-language-response.js';
import ConversationEngine from './conversation-engine.js';
import BackgroundAutonomous from './background-autonomous.js';
import EmotionalIntelligence from './emotional-intelligence.js';
import AdvancedNLPConversational from './advanced-nlp-conversational.js';

class JarvisConversationalMain {
  constructor(jarvis) {
    this.jarvis = jarvis;

    // Módulos conversacionales
    this.conversationMemory = null;
    this.proactiveEngine = null;
    this.naturalLanguageResponse = null;
    this.conversationEngine = null;
    this.backgroundAutonomous = null;
    this.emotionalIntelligence = null;
    this.advancedNLP = null;

    // Estado
    this.initialized = false;
  }

  async initialize() {
    // Verificar ANTES de imprimir cualquier cosa
    if (this.initialized) {
      return true;
    }

    // Marcar como en proceso INMEDIATAMENTE
    this.initialized = true;

    console.log('\n' + '═'.repeat(60));
    console.log('🧠 INICIALIZANDO SISTEMA CONVERSACIONAL OMNIPOTENTE');
    console.log('═'.repeat(60) + '\n');

    try {
      // Módulo 1: Conversation Memory
      this.conversationMemory = new ConversationMemory(this.jarvis.memoryAdvanced);
      await this.conversationMemory.initialize();
      console.log('✅ [1/7] Conversation Memory: OPERACIONAL');

      // Módulo 2: Proactive Engine
      this.proactiveEngine = new ProactiveEngine(
        this.conversationMemory,
        this.jarvis.git,
        this.jarvis.memoryAdvanced
      );
      await this.proactiveEngine.initialize();
      this.proactiveEngine.startMonitoring();
      console.log('✅ [2/7] Proactive Engine: MONITOREANDO 24/7');

      // Módulo 3: Natural Language Response
      this.naturalLanguageResponse = new NaturalLanguageResponse(
        this.conversationMemory,
        this.proactiveEngine
      );
      await this.naturalLanguageResponse.initialize();
      console.log('✅ [3/7] Natural Language Response: CALIBRADO');

      // Módulo 4: Emotional Intelligence
      this.emotionalIntelligence = new EmotionalIntelligence(
        this.conversationMemory
      );
      await this.emotionalIntelligence.initialize();
      console.log('✅ [4/7] Emotional Intelligence: CALIBRADO');

      // Módulo 5: Advanced NLP Conversational
      this.advancedNLP = new AdvancedNLPConversational(
        this.jarvis.decisionEngine.nlpEngine,
        this.conversationMemory
      );
      await this.advancedNLP.initialize();
      console.log('✅ [5/7] Advanced NLP Conversational: OPERACIONAL');

      // Módulo 6: Conversation Engine
      this.conversationEngine = new ConversationEngine(
        this.conversationMemory,
        this.jarvis.decisionEngine.nlpEngine,
        this.proactiveEngine
      );
      await this.conversationEngine.initialize();
      console.log('✅ [6/7] Conversation Engine: OPERACIONAL');

      // Módulo 7: Background Autonomous
      this.backgroundAutonomous = new BackgroundAutonomous(
        this.jarvis,
        this.proactiveEngine
      );
      await this.backgroundAutonomous.initialize();
      console.log('✅ [7/7] Background Autonomous: ACTIVO');

      console.log('\n' + '═'.repeat(60));
      console.log('✅ SISTEMA CONVERSACIONAL OMNIPOTENTE OPERACIONAL');
      console.log('═'.repeat(60) + '\n');

      return true;

    } catch (error) {
      console.error('\n❌ Error inicializando sistema conversacional:', error.message);
      console.error('Stack:', error.stack);
      return false;
    }
  }

  // ============================================
  // PROCESAMIENTO DE MENSAJES
  // ============================================

  /**
   * Procesa mensaje del usuario (entrada principal)
   */
  async processMessage(userMessage) {
    if (!this.initialized) {
      console.warn('[JarvisConversational] Sistema no inicializado, usando modo básico');
      return this.fallbackProcessing(userMessage);
    }

    try {
      // 1. Detectar emoción del usuario
      const emotion = this.emotionalIntelligence.detectEmotion(userMessage);

      // 2. Análisis NLP conversacional avanzado
      const nlpAnalysis = await this.advancedNLP.analyzeInContext(userMessage);

      // 3. Procesar a través del conversation engine
      const conversationResult = await this.conversationEngine.processMessage(
        userMessage
      );

      // Si necesita clarificación, retornar inmediatamente
      if (conversationResult.needsClarification) {
        const response = this.naturalLanguageResponse.generateResponse(
          conversationResult.message,
          { emotion: emotion.emotion }
        );

        return {
          message: response,
          needsClarification: true,
          ...conversationResult,
        };
      }

      // 4. Retornar resultado para que jarvis-pure ejecute la acción
      return {
        message: conversationResult.message,
        intent: conversationResult.intent,
        nlpAnalysis,
        emotion,
        needsClarification: false,
        conversationContext: this.conversationMemory.analyzeContext(),
      };

    } catch (error) {
      console.error('[JarvisConversational] Error procesando mensaje:', error.message);
      return this.fallbackProcessing(userMessage);
    }
  }

  /**
   * Genera respuesta con todos los módulos
   */
  async generateResponse(baseResponse, context = {}) {
    if (!this.initialized) {
      return baseResponse;
    }

    try {
      // 1. Aplicar inteligencia emocional
      let emotion = context.emotion;

      // Si emotion es un string, necesitamos el objeto completo
      if (typeof emotion === 'string') {
        emotion = { emotion, intensity: 0.5 };
      }

      // Si no hay emotion, detectar desde historia
      if (!emotion || !emotion.emotion) {
        emotion = this.emotionalIntelligence.detectEmotionFromHistory();
      }

      const empatheticPrefix = this.emotionalIntelligence.generateEmpatheticResponse(
        emotion.emotion,
        emotion.intensity
      );

      let response = baseResponse;

      if (empatheticPrefix && emotion.intensity > 0.6) {
        response = empatheticPrefix + ' ' + response;
      }

      // 2. Generar respuesta natural con personalidad
      response = this.naturalLanguageResponse.generateResponse(
        response,
        {
          ...context,
          emotion: emotion.emotion,
        }
      );

      // 3. Guardar en memoria conversacional
      if (context.userMessage) {
        await this.conversationMemory.addTurn(
          context.userMessage,
          response,
          {
            intent: context.intent || 'unknown',
            entities: context.entities || {},
            confidence: context.confidence || 0.5,
            topic: context.topic || 'general',
            project: context.project || null,
            action: context.action || 'unknown',
          }
        );
      }

      return response;

    } catch (error) {
      console.error('[JarvisConversational] Error generando respuesta:', error.message);
      return baseResponse;
    }
  }

  /**
   * Procesamiento de fallback (si sistema conversacional falla)
   */
  fallbackProcessing(userMessage) {
    return {
      message: userMessage,
      intent: { action: 'unknown', confidence: 0.5 },
      needsClarification: false,
      fallback: true,
    };
  }

  // ============================================
  // BACKGROUND TASKS
  // ============================================

  /**
   * Encola tarea en background
   */
  async enqueueBackgroundTask(task) {
    if (!this.backgroundAutonomous) {
      console.warn('[JarvisConversational] Background Autonomous no disponible');
      return null;
    }

    return this.backgroundAutonomous.enqueue(task);
  }

  /**
   * Obtiene estado de tarea
   */
  getTaskStatus(taskId) {
    if (!this.backgroundAutonomous) return null;

    return this.backgroundAutonomous.getTaskStatus(taskId);
  }

  // ============================================
  // SUGERENCIAS PROACTIVAS
  // ============================================

  /**
   * Obtiene sugerencias proactivas
   */
  getPendingSuggestions(minPriority = 7) {
    if (!this.proactiveEngine) return [];

    return this.proactiveEngine.getPendingSuggestions(minPriority);
  }

  /**
   * Limpia una sugerencia
   */
  clearSuggestion(type, context) {
    if (!this.proactiveEngine) return;

    this.proactiveEngine.clearSuggestion(type, context);
  }

  // ============================================
  // SHUTDOWN
  // ============================================

  async shutdown() {
    console.log('[JarvisConversational] Deteniendo sistema conversacional...');

    if (this.proactiveEngine && this.proactiveEngine.monitoring) {
      this.proactiveEngine.stopMonitoring();
      console.log('  ✓ Proactive Engine detenido');
    }

    if (this.backgroundAutonomous && this.backgroundAutonomous.isRunning) {
      this.backgroundAutonomous.stop();
      console.log('  ✓ Background Autonomous detenido');
    }

    console.log('[JarvisConversational] Sistema conversacional detenido ✓');
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  getStats() {
    if (!this.initialized) {
      return {
        initialized: false,
        message: 'Sistema conversacional no inicializado',
      };
    }

    return {
      initialized: true,
      conversationMemory: this.conversationMemory?.getStats(),
      proactiveEngine: this.proactiveEngine?.getStats(),
      naturalLanguageResponse: this.naturalLanguageResponse?.getStats(),
      conversationEngine: this.conversationEngine?.getStats(),
      backgroundAutonomous: this.backgroundAutonomous?.getStats(),
      emotionalIntelligence: this.emotionalIntelligence?.getStats(),
      advancedNLP: this.advancedNLP?.getStats(),
    };
  }

  /**
   * Verifica salud del sistema
   */
  async healthCheck() {
    const health = {
      overall: 'healthy',
      modules: {},
      issues: [],
    };

    // Verificar cada módulo
    const modules = [
      { name: 'conversationMemory', instance: this.conversationMemory },
      { name: 'proactiveEngine', instance: this.proactiveEngine },
      { name: 'naturalLanguageResponse', instance: this.naturalLanguageResponse },
      { name: 'conversationEngine', instance: this.conversationEngine },
      { name: 'backgroundAutonomous', instance: this.backgroundAutonomous },
      { name: 'emotionalIntelligence', instance: this.emotionalIntelligence },
      { name: 'advancedNLP', instance: this.advancedNLP },
    ];

    for (const module of modules) {
      if (!module.instance) {
        health.modules[module.name] = 'not_initialized';
        health.issues.push(`${module.name} no inicializado`);
        health.overall = 'degraded';
      } else {
        health.modules[module.name] = 'healthy';
      }
    }

    if (health.issues.length > 0) {
      health.overall = health.issues.length > 3 ? 'critical' : 'degraded';
    }

    return health;
  }
}

export default JarvisConversationalMain;
